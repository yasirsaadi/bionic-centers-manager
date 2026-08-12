// إعداد webhook بوت المريض — **أمر يدوي يُشغَّل مرّة بعد النشر**.
//
//   npm run telegram:patient-webhook -- set https://<host>
//   npm run telegram:patient-webhook -- info
//   npm run telegram:patient-webhook -- delete
//
// ══ لماذا يدوي لا تلقائي عند كل إقلاع ═══════════════════════════════════
// `setWebhook` تغيّر حالةً عند تلغرام لا عندنا. وتشغيلها في كل إقلاع يعني
// أن نشراً عابراً — أو مثيلاً ثانياً يقلع على Render — يعيد توجيه بوت
// الإنتاج إلى عنوانٍ آخر أو يُعيد ضبط سرٍّ يعمل. فالتغيير الخارجي يُطلَب
// صراحةً، ومرّةً واحدة.
//
// ══ ولا يُطبع التوكن ولا السرّ ══════════════════════════════════════════
// يُقرآن من البيئة ولا يظهران في أمرٍ ولا في مخرَج. وحتى العنوان الذي
// يعيده تلغرام في `getWebhookInfo` يُطبع كما هو **بلا** التوكن لأنه ليس
// فيه — العنوان الذي نضبطه هو عنواننا نحن، والسرّ يُرسل في ترويسة.

// من `config` وحدها — فلا يجرّ الأمرُ قاعدةَ البيانات ولا يطلب DATABASE_URL.
import {
  patientBotConfig, missingPatientBotEnv, PATIENT_BOT_ENV, PATIENT_WEBHOOK_PATH,
} from "../server/patient_telegram/config";

const USAGE = `
الاستعمال:
  npm run telegram:patient-webhook -- set https://<host>
  npm run telegram:patient-webhook -- info
  npm run telegram:patient-webhook -- delete

المتغيّرات المطلوبة في البيئة (لا تُمرَّر في الأمر):
  ${Object.values(PATIENT_BOT_ENV).join("\n  ")}
`.trim();

async function callApi(token: string, method: string, body?: unknown): Promise<any> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  // الجسم يُقرأ ويُعاد للطابع أدناه — وهو لا يحمل التوكن (تلغرام لا يعيده).
  return res.json();
}

async function main() {
  const [action, baseUrl] = process.argv.slice(2);

  const config = patientBotConfig();
  if (!config) {
    console.error(`تكامل بوت المريض معطَّل — متغيّرات ناقصة: ${missingPatientBotEnv().join(", ")}`);
    console.error(`\n${USAGE}`);
    process.exit(1);
  }

  if (action === "info") {
    const info = await callApi(config.token, "getWebhookInfo");
    console.log(JSON.stringify(info, null, 2));
    return;
  }

  if (action === "delete") {
    const out = await callApi(config.token, "deleteWebhook", { drop_pending_updates: false });
    console.log(out.ok ? "✅ حُذف الـwebhook" : `❌ فشل: ${out.description ?? "غير معروف"}`);
    process.exit(out.ok ? 0 : 1);
  }

  if (action !== "set" || !baseUrl) {
    console.error(USAGE);
    process.exit(1);
  }

  if (!/^https:\/\/[^/\s]+$/.test(baseUrl.replace(/\/+$/, ""))) {
    // تلغرام يرفض غير HTTPS أصلاً؛ نقولها هنا بوضوح بدل انتظار خطئه.
    console.error("العنوان يجب أن يكون https ونطاقاً فقط، مثل: https://example.onrender.com");
    process.exit(1);
  }

  const url = `${baseUrl.replace(/\/+$/, "")}${PATIENT_WEBHOOK_PATH}`;
  const out = await callApi(config.token, "setWebhook", {
    url,
    // **السرّ يُرسله تلغرام في ترويسة كل نداء** — وهو ما تقارنه نقطتنا.
    secret_token: config.webhookSecret,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  });

  if (out.ok) {
    console.log(`✅ ضُبط الـwebhook على: ${url}`);
    console.log("   (السرّ أُرسل من البيئة ولم يُطبع)");
  } else {
    console.error(`❌ فشل الضبط: ${out.description ?? "غير معروف"}`);
    process.exit(1);
  }
}

main().catch((err) => {
  // اسم النوع وحده: نصّ الخطأ قد يحمل العنوان وفيه التوكن.
  console.error(`فشل غير متوقَّع (${err instanceof Error ? err.name : "Unknown"})`);
  process.exit(1);
});
