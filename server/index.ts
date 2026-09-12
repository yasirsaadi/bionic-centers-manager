import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { initBackupScheduler } from "./backup";
import { runMigrations } from "./migrations/runner";
import { warmTrigramCache } from "./patient_search/sql";
import { db } from "./db";
// سجلّ الطلبات يطبع جسم كل استجابة /api؛ هذا يحجب الأسرار عنه بالاسم.
import { redactForLog } from "./log_redaction";
import { startNotificationDispatcher } from "./patient_notifications/dispatcher";

// Resilience: a single failing request must NEVER take down the whole service.
// In Express, an async handler that rejects (or any stray promise rejection)
// isn't caught by the express error middleware — and Node exits with status 1
// on an unhandled rejection by default. That is exactly the
// "Instance failed: Exited with status 1" crash seen on Render.
//
// ══ تصحيحُ تعليقٍ مضلِّل (تشخيصٌ حيّ، ٢٠٢٦-٠٩-١٢) ═══════════════════════════
// كان هذا التعليق يدّعي أن «الطلبَ المتأثّر يحصل على ردّ خطئه» — **غير
// صحيح**: هذا المُعالِج لا يملك `res` أصلاً، فلا يستطيع الردّ على أيّ طلب.
// ما يفعله فعلياً هو **منع سقوط العملية كلِّها** فقط — يسجّل الخطأ ويُبقي
// الخادمَ يخدم بقيّة الطلبات. أمّا الطلبُ الذي رفض وعده أصلاً فيبقى **بلا
// أيّ استجابة إلى الأبد** ما لم يستدعِ معالجُه `next(err)` صراحةً (فيصل
// الخطأ إلى وسيط الأخطاء أسفل هذا الملفّ ويُرسَل ردٌّ حقيقي) — وهذا بالضبط
// ما كان يسبّب تعليقاتِ حذف/تعديل المستخدم ومقالة المعرفة إلى الأبد قبل
// هذا الإصلاح: خطأٌ حقيقيّ يقع (قيدٌ أجنبيّ، مهلةُ قفل) ويُعاد رميه
// (`throw err`) من داخل معالجٍ غير متزامن بدل `next(err)`، فيسجَّله هذا
// المعالِج ويُترَك طلبُ العميل معلَّقاً بلا ردّ. **فالإصلاحُ الحقيقيّ في كلّ
// معالجٍ** (استدعاء `next(err)` بدل `throw`)، **لا هنا** — هذا المعالِج
// يبقى شبكةَ أمانٍ للعملية نفسها فقط، ولن يصير يوماً شبكةَ أمانٍ لطلبٍ فردي.
process.on("unhandledRejection", (reason) => {
  console.error("[process] Unhandled promise rejection (service kept alive):", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[process] Uncaught exception (service kept alive):", err);
});

const app = express();
const httpServer = createServer(app);

// gzip every compressible response. The heaviest endpoints ship large JSON
// (patients list with visits+payments) that compresses ~10x — this is the
// single biggest transfer-speed win on slow connections.
app.use(compression());

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(redactForLog(capturedJsonResponse))}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Run database migrations before registering routes.
  // Safe: idempotent, additive-only, tracks applied migrations.
  await runMigrations();

  //  هل امتداد pg_trgm موجود — يُسأل مرّةً هنا فيعرفه كلُّ مسار بحثٍ بعدها
  //  بلا استعلامٍ إضافي (ترحيل ٠٥٤ قد يفشل في إنشائه ويمضي عمداً).
  await warmTrigramCache(db);

  await registerRoutes(httpServer, app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error(`[express] ${req.method} ${req.path} -> ${status}:`, err);

    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      initBackupScheduler();
      // عامل صادر إشعارات المريض. يبدأ بعد الترحيلات والمسارات، ويصمت
      // معلَناً إن لم يكن بوت المريض مُعدّاً.
      startNotificationDispatcher();
      // One-time patient-cases backfill runs in the BACKGROUND, AFTER the
      // server is listening — so a large dataset never blocks/times-out the
      // deploy. It's guarded (runs once) and fails safe.
      import("./migrations/backfill_all_cases")
        .then((m) => m.backfillAllPatientCases())
        .catch((e) => console.error("[backfill] launch failed:", e));
      // Phone normalization backfill (migration 043). Same reasoning: runs in
      // the BACKGROUND after listen so a large table never blocks the deploy.
      // Resumable via `phone_status IS NULL`, never touches `phone` itself.
      import("./migrations/backfill_phone_normalization")
        .then((m) => m.backfillPhoneNormalization())
        .catch((e) => console.error("[backfill-phone] launch failed:", e));
    },
  );
})();
