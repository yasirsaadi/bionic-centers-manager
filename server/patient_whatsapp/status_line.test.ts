//  سطرُ حالة واتساب عند الإقلاع — `npm run test:whatsapp-status`.
//  **بلا قاعدة بيانات ولا شبكة.**
//
//  ══ العطبُ الذي يحرسه هذا الملفّ ═════════════════════════════════════════
//  `patientWhatsappStatusLine` و`missingPatientWhatsappEnv` كُتبتا لتقولا
//  **أسماءَ** المتغيّرات الناقصة عند الإقلاع — **وبقيتا بلا مُنادٍ واحد في
//  المستودع كلِّه**. وكان مسارُ الإقلاع يطبع نصّين مكتوبين باليد بدلهما:
//  أحدُهما «غيرُ مضبوط» بلا أن يسمّي الناقص، والآخر «بدأ العامل» ولو لم
//  يُضبَط اسمُ قالبٍ واحد — فحالةٌ **لا تُرسِل حرفاً** تُقرأ في سجلّ Render
//  سليمةً. فبقي التكاملُ معطَّلاً على الإنتاج بلا سطرٍ واحد يقول لماذا.
//
//  ══ ولماذا هنا لا في حزمة واتساب الحيّة ═════════════════════════════════
//  `patient_whatsapp/config.ts` **بلا استيرادٍ واحد** (يحرسه القسم «و»)،
//  فالقرارُ يُقاس دخلاً وخرجاً بلا Postgres ولا Meta. وحزمةُ
//  `test:whatsapp` تحتاج قاعدةً حيّة، وسطرُ إقلاعٍ لا يستحقّ ذلك.
//
//  ══ وقراءةُ النصّ ليست عقداً وحدها ══════════════════════════════════════
//  درسُ ٤.u: قراءةُ مصدرٍ لا تُمسك انقلاباً في المعنى يعود بصياغةٍ أخرى.
//  فالأقسامُ (أ–د) تقيس الدالّةَ نفسَها دخلاً وخرجاً، والقسمُ (هـ) يقفل
//  **الوصلَ** وحده — وهو ما لا سبيل إلى قياسه إلّا بالمصدر: الدالّةُ كانت
//  صحيحةً تماماً وهي ميّتة.

import { readFileSync } from "fs";
import { join } from "path";
import {
  missingPatientWhatsappEnv, patientWhatsappStatusLine, PATIENT_WHATSAPP_ENV,
} from "./config";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

// ── بيئةٌ محكومة: تُمسَح الستّةُ كلُّها ثم يُضبَط المطلوبُ وحده ───────────
const ENV_NAMES = Object.values(PATIENT_WHATSAPP_ENV);
const SNAPSHOT = new Map(ENV_NAMES.map((n) => [n, process.env[n]]));
function setEnv(partial: Partial<Record<string, string>>) {
  for (const n of ENV_NAMES) delete process.env[n];
  for (const [k, v] of Object.entries(partial)) process.env[k] = v;
}
function restoreEnv() {
  for (const [n, v] of SNAPSHOT) {
    if (v === undefined) delete process.env[n];
    else process.env[n] = v;
  }
}

const TOKEN = "EAAG-super-secret-token-value-do-not-log";
const PHONE_ID = "123456789012345";
const WELCOME = "bionic_patient_welcome";
const UPDATE = "bionic_patient_update";
const FULL = {
  [PATIENT_WHATSAPP_ENV.accessToken]: TOKEN,
  [PATIENT_WHATSAPP_ENV.phoneNumberId]: PHONE_ID,
  [PATIENT_WHATSAPP_ENV.welcomeTemplate]: WELCOME,
  [PATIENT_WHATSAPP_ENV.updateTemplate]: UPDATE,
};

console.log("── أ. الأشكالُ الثلاثة — ولكلٍّ حالةُ عاملٍ مختلفة ──");

setEnv({});
same("أ١. **لا شيءَ مضبوط ⟶ معطَّلٌ بأسماء الناقصَين** (وهذا حالُ الإنتاج اليوم)",
  patientWhatsappStatusLine(),
  "[patient-whatsapp] disabled — missing env: PATIENT_WHATSAPP_ACCESS_TOKEN, PATIENT_WHATSAPP_PHONE_NUMBER_ID");

setEnv({ [PATIENT_WHATSAPP_ENV.accessToken]: TOKEN });
same("أ٢. والتوكنُ وحده ⟶ يُسمّى الناقصُ الواحد لا الاثنان",
  patientWhatsappStatusLine(),
  "[patient-whatsapp] disabled — missing env: PATIENT_WHATSAPP_PHONE_NUMBER_ID");

setEnv({ [PATIENT_WHATSAPP_ENV.phoneNumberId]: PHONE_ID });
same("أ٣. والرقمُ وحده ⟶ كذلك",
  patientWhatsappStatusLine(),
  "[patient-whatsapp] disabled — missing env: PATIENT_WHATSAPP_ACCESS_TOKEN");

setEnv({ [PATIENT_WHATSAPP_ENV.accessToken]: TOKEN, [PATIENT_WHATSAPP_ENV.phoneNumberId]: PHONE_ID });
same("أ٤. **والإلزاميّان بلا قوالب ⟶ مفعَّلٌ والقالبان منتظران** — لا «بدأ العامل» عارية",
  patientWhatsappStatusLine(),
  "[patient-whatsapp] enabled — templates pending: PATIENT_WHATSAPP_WELCOME_TEMPLATE_NAME, PATIENT_WHATSAPP_UPDATE_TEMPLATE_NAME");

setEnv({ ...FULL, [PATIENT_WHATSAPP_ENV.updateTemplate]: "" });
same("أ٥. وقالبٌ واحدٌ ناقص ⟶ يُسمّى وحدَه (والآخرُ يُرسَل فعلاً)",
  patientWhatsappStatusLine(),
  "[patient-whatsapp] enabled — templates pending: PATIENT_WHATSAPP_UPDATE_TEMPLATE_NAME");

setEnv({ ...FULL, [PATIENT_WHATSAPP_ENV.welcomeTemplate]: "" });
same("أ٦. والعكسُ كذلك", patientWhatsappStatusLine(),
  "[patient-whatsapp] enabled — templates pending: PATIENT_WHATSAPP_WELCOME_TEMPLATE_NAME");

setEnv(FULL);
same("أ٧. والمضبوطُ بالكامل ⟶ `enabled` بلا ذيل", patientWhatsappStatusLine(),
  "[patient-whatsapp] enabled");

//  **والناقصُ الإلزاميّ يعلو على القوالب**: بلا توكنٍ لا معنى لقول «القالبُ
//  ناقص» — لا نداءَ يمرّ أصلاً، فيُسمّى الأصلُ لا الفرع.
setEnv({ [PATIENT_WHATSAPP_ENV.welcomeTemplate]: WELCOME, [PATIENT_WHATSAPP_ENV.updateTemplate]: UPDATE });
same("أ٨. وقالبان مضبوطان بلا توكن ⟶ **يُقال «معطَّل»** لا «القوالب جاهزة»",
  patientWhatsappStatusLine(),
  "[patient-whatsapp] disabled — missing env: PATIENT_WHATSAPP_ACCESS_TOKEN, PATIENT_WHATSAPP_PHONE_NUMBER_ID");

console.log("\n── ب. أسماءٌ لا قيم — فلا يتسرّب سرٌّ إلى سجلٍّ يُحفَظ ──");
for (const [label, env] of [
  ["لا شيء", {}],
  ["الإلزاميّان", { [PATIENT_WHATSAPP_ENV.accessToken]: TOKEN, [PATIENT_WHATSAPP_ENV.phoneNumberId]: PHONE_ID }],
  ["الكلّ", FULL],
] as [string, Record<string, string>][]) {
  setEnv(env);
  const line = patientWhatsappStatusLine();
  check(!line.includes(TOKEN), `ب. لا توكنَ في السطر (${label})`, line);
  check(!line.includes(PHONE_ID), `ب. ولا رقمَ المُرسِل (${label})`, line);
}
setEnv(FULL);
check(!patientWhatsappStatusLine().includes(WELCOME) && !patientWhatsappStatusLine().includes(UPDATE),
  "ب٧. **ولا اسمَ قالبٍ حين يكون مضبوطاً** — السطرُ تشخيصٌ لا تفريغُ إعداد",
  patientWhatsappStatusLine());
setEnv({ ...FULL, [PATIENT_WHATSAPP_ENV.updateTemplate]: "" });
check(patientWhatsappStatusLine().includes(PATIENT_WHATSAPP_ENV.updateTemplate)
  && !patientWhatsappStatusLine().includes(UPDATE),
  "ب٨. والناقصُ يُسمّى **باسم متغيّره** لا بقيمةٍ يفترضها أحد",
  patientWhatsappStatusLine());

console.log("\n── ج. `missingPatientWhatsappEnv` — الإلزاميّان وحدهما ──");
setEnv({});
same("ج١. لا شيء ⟶ الاثنان",
  missingPatientWhatsappEnv(),
  [PATIENT_WHATSAPP_ENV.accessToken, PATIENT_WHATSAPP_ENV.phoneNumberId]);
setEnv({ [PATIENT_WHATSAPP_ENV.accessToken]: TOKEN, [PATIENT_WHATSAPP_ENV.phoneNumberId]: PHONE_ID });
same("ج٢. والإلزاميّان مضبوطان ⟶ لا شيء **ولو غابت القوالبُ كلُّها**",
  missingPatientWhatsappEnv(), []);
setEnv({ ...FULL, [PATIENT_WHATSAPP_ENV.graphVersion]: "", [PATIENT_WHATSAPP_ENV.templateLanguage]: "" });
same("ج٣. **والإصدارُ واللغةُ ليسا إلزاميّين** — لهما افتراضٌ، فلا يُسمَّيان ناقصَين",
  missingPatientWhatsappEnv(), []);

console.log("\n── د. البياضُ يُقرأ غياباً — لا متغيّرٌ فارغٌ يُقرأ مضبوطاً ──");
setEnv({ [PATIENT_WHATSAPP_ENV.accessToken]: "   ", [PATIENT_WHATSAPP_ENV.phoneNumberId]: PHONE_ID });
same("د١. توكنٌ بياضٌ ⟶ ناقص", missingPatientWhatsappEnv(), [PATIENT_WHATSAPP_ENV.accessToken]);
setEnv({ ...FULL, [PATIENT_WHATSAPP_ENV.updateTemplate]: "  \t " });
same("د٢. وقالبُ بياضٍ ⟶ منتظر", patientWhatsappStatusLine(),
  "[patient-whatsapp] enabled — templates pending: PATIENT_WHATSAPP_UPDATE_TEMPLATE_NAME");

restoreEnv();

// ── مصدرُ الملفّين، بلا تعليقات: شرحٌ يذكر اسماً لا يمرّ عملاً ───────────
const root = join(import.meta.dirname, "..", "..");
const code = (t: string) => t.replace(/\/\/[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
const dispatcher = code(readFileSync(join(root, "server/patient_notifications/dispatcher.ts"), "utf8"));
const bootIndex = code(readFileSync(join(root, "server/index.ts"), "utf8"));
const configSrc = readFileSync(join(root, "server/patient_whatsapp/config.ts"), "utf8");

console.log("\n── هـ. عقدُ الإقلاع — الوصلُ نفسُه، وهو ما كان مفقوداً ──");
const start = dispatcher.indexOf("export function startNotificationDispatcher");
check(start > 0, "هـ١. الدالّةُ موجودة (مرساةُ القسم)");
const body = dispatcher.slice(start);
const callAt = body.indexOf("console.log(patientWhatsappStatusLine())");
check(callAt > 0,
  "هـ٢. **ومسارُ الإقلاع ينادي `patientWhatsappStatusLine` فعلاً** — لا شيفرةً ميّتة",
  body.slice(0, 400));
const gateAt = body.indexOf("patientWhatsappEnabled()");
check(callAt > 0 && gateAt > 0 && callAt < gateAt,
  "هـ٣. **والنداءُ قبل بوّابة التعطيل** — وإلّا لم تُطبع أسماءُ الناقص أبداً، وهي أوّلُ ما يلزم",
  `callAt=${callAt} gateAt=${gateAt}`);
check(!dispatcher.includes("dispatcher idle") && !dispatcher.includes("dispatcher started"),
  "هـ٤. والنصّان المكتوبان باليد زالا — لا سطرَ حالةٍ ثانٍ ينحرف عن الأوّل");
check((body.match(/console\.log\(/g) ?? []).length === 1,
  "هـ٥. **وسطرُ إقلاعٍ واحد لا سطران** — كما وُعد",
  String((body.match(/console\.log\(/g) ?? []).length));
check(/startNotificationDispatcher\s*\(\s*\)/.test(bootIndex),
  "هـ٦. و`server/index.ts` ينادي الدالّةَ فعلاً — فالسطرُ يبلغ سجلَّ Render");

console.log("\n── و. نقاءُ الإعداد — فهذا الملفّ بلا قاعدةٍ حقّاً ──");
check(!/^\s*import\s/m.test(configSrc),
  "و١. **`patient_whatsapp/config.ts` بلا استيرادٍ واحد** — فلا يجرّ سطرُ الإقلاع وحدةَ قاعدةٍ معه، ولا يحتاج هذا الاختبارُ Postgres");

console.log(failures ? `\n❌ ${failures} حالة فاشلة` : "\n✅ كل الفحوص نجحت");
process.exit(failures ? 1 : 0);
