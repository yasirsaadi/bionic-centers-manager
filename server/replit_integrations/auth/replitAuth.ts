import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import pg from "pg";
import { resolveDatabaseUrl } from "../../db_url";
//  الاستيرادُ من `../../db` مقصودٌ لأمرين: الثابتُ المشترك أدناه، **وترتيبُ
//  التحميل** — جسمُ `db.ts` (ومنه حارسُ أمان القاعدة للاختبارات) يُنفَّذ
//  قبل أن يُبنى مِجمَعُ الجلسات هنا، فلا يُفتَح مِجمَعٌ ثانٍ على قاعدةٍ رفضها
//  الحارسُ للأوّل.
import { DB_CONNECTION_TIMEOUT_MS } from "../../db";

// ══ مِجمَعُ مخزن الجلسات — منفصلٌ كما كان، لكن مقيَّدٌ وقانونيّ (تصحيحٌ
// إنتاجيّ، ٢٠٢٦-٠٩-١٢) ═══════════════════════════════════════════════════
// كان `connect-pg-simple` يبني مِجمَعَه **الخاصّ** من `process.env.DATABASE_URL`
// الخام — بمعزلٍ عن أسبقية `EXTERNAL_DATABASE_URL || DATABASE_URL` التي
// يقرؤها `server/db.ts` (فقد يخدم المخزنُ قاعدةً غير التي يخدمها التطبيق)،
// **وبلا مهلةِ اقتناءِ اتّصال**. وكلُّ طلبٍ مصادَق يمرّ بهذا المخزن قبل أن
// يبلغ أيَّ مسار أو أيَّ حمايةٍ في المِجمَع الرئيسيّ — فتشبّعُه أو تعثّرُ
// الاتّصال به كان يُعلِّق الطلبَ إلى الأبد **قبل** أن يبدأ أصلاً.
//
// يبقى المِجمَعُ منفصلاً (لا يزاحم استعلاماتِ التطبيق على اتّصالاتها —
// نفسُ نموذج الموارد السابق)، لكنّه صار:
//   · يقرأ الرابطَ من `resolveDatabaseUrl` نفسِها التي يقرأ منها `db.ts` —
//     قرارٌ واحد لا اثنان؛
//   · مقيَّداً بـ`DB_CONNECTION_TIMEOUT_MS` نفسِها — فتعذّرُ الاقتناء ضمن
//     المهلة يُرفَض خطأً حقيقياً يصل `express-session`، وهي تمرّره إلى
//     `next(err)` فيُنهيه وسيطُ الأخطاء العامّ بردٍّ فعليّ بدل انتظارٍ أبديّ.
// **ولا يُطبَع الرابطُ ولا يُصدَّر** — الكائنُ وحده يُصدَّر ليُختبَر سلوكُه.
const sessionConnectionString = resolveDatabaseUrl(process.env);
if (!sessionConnectionString) {
  //  لا يُبلَغ عملياً — `db.ts` يرمي قبل هذا السطر بالرسالة نفسِها — لكنّه
  //  يمنع أن يسقط `connectionString` صامتاً إلى افتراضات `pg` من البيئة.
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}
export const sessionPool = new pg.Pool({
  connectionString: sessionConnectionString,
  connectionTimeoutMillis: DB_CONNECTION_TIMEOUT_MS,
});
//  `connect-pg-simple` يركّب هذا المستمعَ على المِجمَع الذي يبنيه هو فقط؛ ومع
//  مِجمَعٍ مُمرَّر تصير المسؤوليةُ هنا — نفسُ سبب المستمع في `server/db.ts`:
//  عميلٌ خامل يسقط اتّصالُه يجب ألّا يُسقط العملية.
sessionPool.on("error", (err) => {
  console.error("[session-store] Unexpected error on idle PostgreSQL client:", err);
});

export function getSession() {
  // Sliding (rolling) session: expires 1 day after the LAST activity, and the
  // expiry is refreshed on every request while the user is active. So an
  // active user is never logged out mid-work, and an idle session dies after
  // a day instead of lingering as a stale, half-working session.
  const sessionTtl = 24 * 60 * 60 * 1000; // 1 day
  const pgStore = connectPg(session);

  // ══ لا يُسمَّم فحصُ الجدول بأوّل فشل ═══════════════════════════════════
  // `connect-pg-simple` يحفظ وعدَ «تأكّد من وجود الجدول» مرّةً واحدة ولا
  // يعيد المحاولة: لو رُفض أوّلُ استعلامٍ بعد الإقلاع (اقتناءٌ تجاوز المهلة
  // الجديدة، أو إقلاعٌ بارد للقاعدة) لبقي الوعدُ المرفوض محفوظاً وفشلت **كلُّ**
  // الجلسات حتى إعادة التشغيل. قبل المهلة كان هذا الفشلُ الأوّل يتعلّق بلا
  // نهاية بدل أن يُرفَض — فالمهلةُ الجديدة هي ما يجعل هذا المسارَ ممكناً،
  // وهذا الغلافُ هو ما يمنعه: وعدٌ مرفوض يُنسى فتُعاد المحاولة مع الطلب
  // التالي. النجاحُ يُحفَظ كما كان تماماً.
  //  الدالّتان `_ensureSessionStoreTable`/`_rawEnsureSessionStoreTable` جزءٌ من
  //  شيفرة المكتبة (`node_modules/connect-pg-simple/index.js`) لكنّهما غيرُ
  //  مُعلَنتين في تعريفات `@types/connect-pg-simple` — فالنداءُ عبر `any` هنا
  //  مقصود، ويحرسه اختبارٌ حيّ يُسمِّم المِجمَع قبل أوّل استعلامٍ ثم يثبت
  //  التعافي (`npm run test:session-store-pool`).
  class ResilientPgStore extends pgStore {
    private tableEnsured?: Promise<void>;
    async _ensureSessionStoreTable(noTableCreation?: boolean): Promise<void> {
      if (noTableCreation) return;
      if (!this.tableEnsured) {
        this.tableEnsured = (this as any)._rawEnsureSessionStoreTable().catch((err: unknown) => {
          this.tableEnsured = undefined;
          throw err;
        });
      }
      return this.tableEnsured;
    }
  }

  const sessionStore = new ResilientPgStore({
    pool: sessionPool,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true, // refresh cookie + store expiry on every response
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const branchSession = (req.session as any)?.branchSession;
  if (!branchSession) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};
