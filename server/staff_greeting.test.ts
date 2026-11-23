// **تحيّةُ الموظّف اليومية** (ترحيل ١٣٣، §4.dp — ٢٠٢٦-١٠-١١).
// `npm run test:staff-greeting` — حيٌّ على النقاط الحقيقية (منفذ ٧٠٠٩، فرع ٨٩٥٠، مستخدمون ٨٩٥١–٨٩٥٩). يحرس:
//   ق — القاعدة: «صباح الخير» من الخامسة حتى قبل الثانية عشرة بتوقيت بغداد و«مساء الخير» ما سواها، والتناوبُ يوماً بعد يوم وكلُّ موظّفٍ من
//       موضعه، والنصُّ بصيغة المالك، وتطبيعُ العبارات؛ **وإنجازُ الأمس** (§4.gw): الجمعُ العربيّ بفئاته، والأبوابُ بالأدوار واتّحادُها، ولا صفر،
//       وأربعةُ بنودٍ على الأكثر، وسطرُ المالك، وحدّا يوم بغداد.
//   أ — الترحيل: العمودُ والعباراتُ العشر الأولى، والإعادةُ لا تكتب فوق ما غيّره المالك.
//   ب — الأبواب: التحيّةُ للموظّف مرّةً في اليوم (و«حسناً» تُسكتها حتى الغد ولو من جهازٍ آخر)، والمالكُ لا يُحيّى **ولا تذكيرَ له بعد اليوم**،
//       والعباراتُ للمسؤول وحده بتدقيق، و«حسناً» لا تحرّك شاشاتِ الآخرين.
//   ج — التذكيرُ الشهريّ تقاعد (§4.gw): لا كرونَ ولا تلغرامَ ولا «أبقِها».
//   د — إنجازُ الأمس على النقطة الحقيقية (§4.gw): أرقامُ صاحبها بالضبط، واليومُ لا يُعدّ، والمحذوفُ والملغى والمسترجَع لا يُعدّ، والزميلُ لا يظهر،
//       وبلا إنجازٍ العبارة، والأدوارُ (الخبير، الطبيب، المنفّذ، المديرُ المشرف)، والتسجيلُ والدفعةُ الحقيقيّان، وحدُّ منتصف الليل +٠٣، وسطرُ المالك.
//   ط — مؤثّرُ الطقس مع التحيّة (§4.fw): أيُّ طقسٍ يُطلقه ونصُّ سطره بلا جنس، ومفتاحُ المسؤول في جواب التحيّة وبابُه بتدقيق.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "staff-greeting-test-secret";

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { sql as MIGRATION_SQL } from "./migrations/133_staff_greeting";
import { isBroadcastWrite } from "./live/updates";
import { storage } from "./storage";
import { loadDayStats } from "./staff_greeting/yesterday";
import { readFileSync } from "fs";
import {
  ACHIEVEMENTS_CLOSING, DEFAULT_GREETINGS, EMPTY_YESTERDAY_STATS, GREETING_SETTING_KEY, achievementGreetingText, achievementKeysFor, achievementLines,
  arabicPluralCategory, baghdadDayBounds, countPhrase, greetingText, parseGreetingNote, parseGreetings, phraseFor, previousYmd, salutationAt,
  achievementLine, GREETING_QUERY_ROOT, refreshesOnBroadcast, greetingBody, ACHIEVEMENTS_INTRO, type AchievementKey,
} from "@shared/staff_greeting";
import { baghdadTodayYmd } from "@shared/visit_date";
import { WEATHER_FX_SETTING_KEY, weatherFxEnabled, weatherFxFor, weatherGreetingLine, WEATHER_FX_KINDS } from "@shared/weather_greeting_fx";
import { WEATHER_LABELS, type WeatherKind } from "@shared/weather";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 7009;
const BASE = `http://127.0.0.1:${PORT}`;
const B1 = 8950;
const ADMIN = 8951, SALEEM = 8952, ZAHRAA = 8953, TECH = 8954, EXPERT = 8955, DOC = 8956, COLLEAGUE = 8957, BOUND = 8958, NOBODY = 8959;
const IDS = [ADMIN, SALEEM, ZAHRAA, TECH, EXPERT, DOC, COLLEAGUE, BOUND, NOBODY];
const MARK = "اختبار-إنجاز-الأمس";

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");
const KEYS = [GREETING_SETTING_KEY, "telegram_bot_token", "telegram_chat_id", WEATHER_FX_SETTING_KEY];

async function cleanup() {
  for (const r of (await q(`SELECT id FROM patients WHERE referral_source = $1`, [MARK])).rows) {
    await storage.deletePatient(Number(r.id)).catch((e) => console.error("cleanup", r.id, e?.message));
  }
  await q(`DELETE FROM physio_plans WHERE branch_id = $1`, [B1]);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[]) OR entity_type = 'staff_greeting'`, [IDS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

//  تلغرام وهميّ: يُحصي الرسائلَ ولا يخرج من الحاوية (التذكيرُ تقاعد — فلا رسالةَ تُنتظر)؛ وكلُّ نداءٍ آخر يمرّ إلى الخادم المحلّيّ.
const sent: string[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: any, init?: any) => {
  if (String(url).includes("api.telegram.org")) {
    sent.push(JSON.parse(init?.body ?? "{}").text ?? "");
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  return realFetch(url, init);
}) as typeof fetch;

async function main() {
  // ══ ق. القاعدة ══
  console.log("\n── ق. القاعدة ──");
  const at = (hhmm: string) => new Date(`2026-10-12T${hhmm}:00Z`);   // بتوقيت UTC — وبغداد +٣
  same("ق.١ **«صباح الخير» من الخامسة حتى قبل الثانية عشرة بتوقيت بغداد**، و«مساء الخير» ما سواها ومنه ما بعد منتصف الليل",
    [salutationAt(at("01:59")), salutationAt(at("02:00")), salutationAt(at("08:59")), salutationAt(at("09:00")), salutationAt(at("20:30")), salutationAt(at("22:00"))],
    ["مساء الخير", "صباح الخير", "صباح الخير", "مساء الخير", "مساء الخير", "مساء الخير"]);
  const days = Array.from({ length: 10 }, (_, i) => `2026-10-${String(12 + i).padStart(2, "0")}`);
  const seq = days.map((d) => phraseFor(DEFAULT_GREETINGS, SALEEM, d));
  same("ق.٢ **التناوب**: كلَّ يومٍ عبارةٌ تالية، وفي عشرة أيّامٍ يمرّ الموظّفُ على العشر كلّها، وزميلُه في اليوم نفسِه على غيرها",
    [new Set(seq).size, DEFAULT_GREETINGS.indexOf(seq[1]) === (DEFAULT_GREETINGS.indexOf(seq[0]) + 1) % 10,
      phraseFor(DEFAULT_GREETINGS, ZAHRAA, days[0]) !== seq[0]], [10, true, true]);
  same("ق.٣ **النصُّ بصيغة المالك**: التحيّةُ ثمّ الاسمُ ثمّ العبارة", greetingText("صباح الخير", "سليم", DEFAULT_GREETINGS[0]),
    "صباح الخير سليم، دكتور ياسر يتمنّى لك يومَ عملٍ سعيداً مليئاً بالتفاؤل والنجاح.");
  same("ق.٤ **العباراتُ الأولى عشرٌ** مختلفة، وكلٌّ دون ٣٠٠ حرف، وكلٌّ باسم دكتور ياسر",
    [DEFAULT_GREETINGS.length, new Set(DEFAULT_GREETINGS).size, DEFAULT_GREETINGS.every((p) => p.length <= 300 && p.startsWith("دكتور ياسر"))], [10, 10, true]);
  same("ق.٥ **تطبيعُ العبارات**: الفارغُ والمكرّرُ يسقطان والمسافاتُ تُطوى، ولا قائمةَ فارغة ولا أكثرَ من عشرين ولا عبارةَ فوق ٣٠٠",
    [parseGreetings(["  أهلاً   بك ", "", "أهلاً بك", "مرحباً"]), typeof parseGreetings([" "]), typeof parseGreetings(Array.from({ length: 21 }, (_, i) => `عبارة ${i}`)),
      typeof parseGreetings(["ا".repeat(301)]), typeof parseGreetings("نصّ")],
    [["أهلاً بك", "مرحباً"], "string", "string", "string", "string"]);
  //  ── إنجازُ الأمس (§4.gw) ──
  const P = { one: "مريض واحد", two: "مريضين", few: "مرضى", many: "مريضاً", other: "مريض" };
  same("ق.٦ **الجمعُ العربيّ بفئاته**: ١ مفرد، ٢ مثنّى، ٣–١٠ جمع، ١١–٩٩ تمييزٌ منصوب، ١٠٠ و١٠١ و١٠٢ مفرد، و١٠٣ جمعٌ و١١١ منصوب",
    [1, 2, 3, 10, 11, 99, 100, 101, 102, 103, 111, 1000].map((k) => countPhrase(k, P)),
    ["مريض واحد", "مريضين", "3 مرضى", "10 مرضى", "11 مريضاً", "99 مريضاً", "100 مريض", "101 مريض", "102 مريض", "103 مرضى", "111 مريضاً", "1,000 مريض"]);
  same("ق.٦ب والفئاتُ نفسُها", [0, 1, 2, 5, 12, 200, 1205].map(arabicPluralCategory), ["other", "one", "two", "few", "many", "other", "few"]);
  const st = { ...EMPTY_YESTERDAY_STATS, registrations: 9, payments: 14, paymentsSum: 1_250_000, visits: 0, physioExams: 1, physioSessions: 2 };
  same("ق.٧ **البنودُ بأبواب الحساب وترتيبها، ولا صفر** — «زيارات» صفرٌ فتسقط، والمبلغُ بصيغة التطبيق",
    achievementLines(achievementKeysFor(["reception"]), st), ["تسجيل 9 مرضى", "استلام 14 دفعةً بمجموع 1,250,000 د.ع"]);
  same("ق.٨ **اتّحادُ الأدوار، الأعلى أوّلاً، وعلَمُ الإشراف، وأربعةٌ على الأكثر** — والمسؤولُ لا شيء والمساحُ بلا باب",
    [achievementKeysFor(["branch_manager", "reception"], true), achievementKeysFor(["doctor", "physio_specialist"]),
      achievementLines(achievementKeysFor(["branch_manager"], true), { ...st, visits: 3 }).length,
      achievementKeysFor(["admin", "reception"]), achievementKeysFor(["surveyor"])],
    [["registrations", "payments", "visits", "physioExams", "physioSessions"], ["medicalExams", "physioExams", "physioSessions"], 4, [], []]);
  same("ق.٨ب **علَما المعاينة والخبير يُعدّان عملَهما لمن لا يحمل دورَهما** (مراجعةُ Codex) — مديرٌ بالعلَمين، ومحاسبٌ خبير، و`true` وحدها علَمُ الإشراف كما كانت",
    [achievementKeysFor(["branch_manager"], { canWriteMedicalExam: true, canWorkAsExpert: true }),
      achievementKeysFor(["accountant"], { canWorkAsExpert: true }), achievementKeysFor(["doctor"], { canWriteMedicalExam: true }),
      achievementKeysFor(["reception"], true), achievementKeysFor(["admin"], { canWriteMedicalExam: true })],
    [["registrations", "payments", "visits", "medicalExams", "physioExams", "deliveries", "maintenanceDone", "stageMoves"],
      ["registrations", "payments", "visits", "deliveries", "maintenanceDone", "stageMoves"], ["medicalExams", "physioExams"],
      ["registrations", "payments", "visits", "physioExams", "physioSessions"], []]);
  same("ق.٩ **النصُّ بلا جنس** — التحيّةُ والاسمُ و«إنجازك أمس» والبنودُ وشكرُ دكتور ياسر",
    achievementGreetingText("صباح الخير", "زهراء", ["تسجيل مريضين", "تسجيل 3 زيارات"]),
    "صباح الخير زهراء، إنجازك أمس: تسجيل مريضين · تسجيل 3 زيارات — دكتور ياسر يشكرك ويتمنّى لك يوماً موفّقاً.");
  same("ق.١٠ **سطرُ المالك**: سطرٌ واحد مطويُّ المسافات، والفارغُ لا شيء، وما فوق ٢٠٠ يُردّ",
    [parseGreetingNote("  بارك اللهُ \n في جهودكم "), parseGreetingNote("   "), parseGreetingNote(null), typeof parseGreetingNote("ا".repeat(201)), typeof parseGreetingNote(5)],
    [{ note: "بارك اللهُ في جهودكم" }, { note: null }, { note: null }, "string", "string"]);
  const bd = baghdadDayBounds("2026-11-22");
  same("ق.١١ **يومُ بغداد من ٠٠:٠٠ +٠٣** — أي ٢١:٠٠ UTC من اليوم قبله — وأمسُ أوّلِ الشهر آخرُ الشهر قبله",
    [bd.start.toISOString(), bd.end.toISOString(), previousYmd("2026-12-01"), previousYmd("2027-01-01")],
    ["2026-11-21T21:00:00.000Z", "2026-11-22T21:00:00.000Z", "2026-11-30", "2026-12-31"]);

  //  **جدولُ الصيغ كلُّه** (مراجعة): كلُّ باب × ١ · ٢ · ٣ · ١١ · ١٠٠ — النصُّ بحرفه، والمفردُ والمثنّى بلا رقم.
  const TABLE: Record<AchievementKey, string[]> = {
    registrations: ["تسجيل مريض واحد", "تسجيل مريضين", "تسجيل 3 مرضى", "تسجيل 11 مريضاً", "تسجيل 100 مريض"],
    payments: ["استلام دفعة واحدة", "استلام دفعتين", "استلام 3 دفعات", "استلام 11 دفعةً", "استلام 100 دفعة"],
    visits: ["تسجيل زيارة واحدة", "تسجيل زيارتين", "تسجيل 3 زيارات", "تسجيل 11 زيارةً", "تسجيل 100 زيارة"],
    deliveries: ["تسليم جهاز واحد", "تسليم جهازين", "تسليم 3 أجهزة", "تسليم 11 جهازاً", "تسليم 100 جهاز"],
    maintenanceDone: ["إنجاز أمر صيانة واحد", "إنجاز أمرَي صيانة", "إنجاز 3 أوامر صيانة", "إنجاز 11 أمرَ صيانة", "إنجاز 100 أمر صيانة"],
    stageMoves: ["إنجاز خطوة واحدة في التصنيع", "إنجاز خطوتين في التصنيع", "إنجاز 3 خطوات في التصنيع", "إنجاز 11 خطوةً في التصنيع", "إنجاز 100 خطوة في التصنيع"],
    medicalExams: ["توقيع معاينة طبية واحدة", "توقيع معاينتين طبيتين", "توقيع 3 معاينات طبية", "توقيع 11 معاينةً طبية", "توقيع 100 معاينة طبية"],
    physioExams: ["توقيع معاينة علاج طبيعي واحدة", "توقيع معاينتَي علاج طبيعي", "توقيع 3 معاينات علاج طبيعي", "توقيع 11 معاينةَ علاج طبيعي", "توقيع 100 معاينة علاج طبيعي"],
    physioSessions: ["إكمال جلسة علاج طبيعي واحدة", "إكمال جلستَي علاج طبيعي", "إكمال 3 جلسات علاج طبيعي", "إكمال 11 جلسةَ علاج طبيعي", "إكمال 100 جلسة علاج طبيعي"],
  };
  const produced = Object.fromEntries((Object.keys(TABLE) as AchievementKey[]).map((k) =>
    [k, [1, 2, 3, 11, 100].map((n) => achievementLine(k, { ...EMPTY_YESTERDAY_STATS, [k]: n }))]));
  same("ق.١٢ **جدولُ الصيغ لكلّ باب** — المفردُ والمثنّى المضاف والجمعُ والتمييزُ المنصوب والمئة، بحرفها", produced, TABLE);
  same("ق.١٢ب والمفردُ والمثنّى بلا رقمٍ في كلّ باب، وكلُّ الأبواب في الجدول",
    [Object.values(produced).every((xs) => !/\d/.test(xs[0]) && !/\d/.test(xs[1])), Object.keys(TABLE).sort(), Object.keys(EMPTY_YESTERDAY_STATS).filter((k) => k !== "paymentsSum").sort()],
    [true, Object.keys(EMPTY_YESTERDAY_STATS).filter((k) => k !== "paymentsSum").sort(), Object.keys(TABLE).sort()]);
  same("ق.١٣ **إشارةُ التحديث العامّة لا تعيد جلبَ التحيّة** (فلا يُعاد عدُّ الأمس مع كتابة كلّ زميل) — إلّا وهي في خطأ، وكلُّ ما سواها يُعاد",
    [refreshesOnBroadcast([GREETING_QUERY_ROOT, 5, "2026-11-23"], "success"), refreshesOnBroadcast([GREETING_QUERY_ROOT, 5, "2026-11-23"], "pending"),
      refreshesOnBroadcast([GREETING_QUERY_ROOT, 5, "2026-11-23"], "error"), refreshesOnBroadcast(["/api/patients"], "success"), refreshesOnBroadcast(["/api/greeting-x"], "success")],
    [false, false, true, true, true]);
  const withItems = greetingBody({ text: "صباح الخير زهراء، إنجازك أمس: تسجيل مريضين — …", salutation: "صباح الخير زهراء", achievements: ["تسجيل مريضين"],
    intro: ACHIEVEMENTS_INTRO, closing: ACHIEVEMENTS_CLOSING, note: "شكراً" });
  const phraseOnly = greetingBody({ text: "صباح الخير رنا، عبارة", achievements: [], note: "  " });
  same("ق.١٤ **جسمُ النافذة**: بالبنود ⟵ التحيّةُ والمقدّمةُ والبنودُ والشكر (والنصُّ الكاملُ للقارئ الآليّ وحده)، وبلاها ⟵ العبارة؛ وسطرُ المالك في الحالين والفارغُ لا شيء",
    [withItems, phraseOnly, greetingBody({ text: "x", note: "سطر" }).note],
    [{ mode: "achievements", salutation: "صباح الخير زهراء", intro: ACHIEVEMENTS_INTRO, items: ["تسجيل مريضين"], closing: ACHIEVEMENTS_CLOSING,
      label: "صباح الخير زهراء، إنجازك أمس: تسجيل مريضين — …", note: "شكراً" }, { mode: "phrase", text: "صباح الخير رنا، عبارة", note: null }, "سطر"]);
  const liveSrc = readFileSync("client/src/components/LiveUpdates.tsx", "utf8"), dgSrc = readFileSync("client/src/components/DailyGreeting.tsx", "utf8");
  same("ق.١٥ **والواجهةُ تستعمل القاعدتين** — `refresh` بالمرشِّح، والنافذةُ بـ`greetingBody` ولا تعرض `g.text` ولا `g.achievements` بنفسها",
    [/refresh:[^\n]*predicate:[^\n]*refreshesOnBroadcast/.test(liveSrc), /greetingBody\(g\)/.test(dgSrc), /\bg\.(text|achievements|note|salutation)\b/.test(dgSrc)],
    [true, true, false]);

  // ══ أ. الترحيل ══
  console.log("\n── أ. ترحيل ١٣٣ ──");
  await cleanup();
  await q(`DELETE FROM system_settings WHERE setting_key = ANY($1::text[])`, [KEYS]);
  await q(MIGRATION_SQL);
  const stored = async () => JSON.parse((await q(`SELECT setting_value FROM system_settings WHERE setting_key = $1`, [GREETING_SETTING_KEY])).rows[0]?.setting_value ?? "null");
  const s0 = await stored();
  const col = (await q(`SELECT data_type FROM information_schema.columns WHERE table_name = 'system_users' AND column_name = 'last_greeted_on'`)).rows[0]?.data_type;
  same("أ.١ **العمودُ والعباراتُ العشر الأولى** بيوم كتابتها", [col, s0?.phrases, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(s0?.updatedAt ?? "")],
    ["date", DEFAULT_GREETINGS, true]);
  await q(`UPDATE system_settings SET setting_value = $2 WHERE setting_key = $1`,
    [GREETING_SETTING_KEY, JSON.stringify({ phrases: ["عبارةُ المالك"], updatedAt: "2026-10-01T00:00:00Z", updatedByName: "المسؤول" })]);
  await q(MIGRATION_SQL);
  same("أ.٢ **والإعادةُ لا تكتب فوق ما غيّره المالك**", (await stored())?.phrases, ["عبارةُ المالك"]);
  await q(`DELETE FROM system_settings WHERE setting_key = $1`, [GREETING_SETTING_KEY]);
  await q(MIGRATION_SQL);

  // ══ ب. الأبواب ══
  console.log("\n── ب. الأبواب ──");
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع التحيّة')`, [B1]);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_supervise_physio)
           VALUES ($1, 'gr-admin', 'x', 'المسؤول', 'admin', NULL, '[]', true, false),
                  ($2, 'gr-saleem', 'x', 'سليم', 'branch_manager', $5, $6::jsonb, true, true),
                  ($3, 'gr-zahraa', 'x', 'زهراء', 'reception', $5, $6::jsonb, true, false),
                  ($4, 'gr-tech', 'x', 'علي', 'physio_technician', $5, $6::jsonb, true, false)`,
    [ADMIN, SALEEM, ZAHRAA, TECH, B1, JSON.stringify([B1])]);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active)
           VALUES ($1, 'gr-expert', 'x', 'حسن', 'prosthetics_expert', $6, $7::jsonb, true),
                  ($2, 'gr-doc', 'x', 'الطبيب', 'doctor', $6, $7::jsonb, true),
                  ($3, 'gr-colleague', 'x', 'مريم', 'reception', $6, $7::jsonb, true),
                  ($4, 'gr-bound', 'x', 'نور', 'reception', $6, $7::jsonb, true),
                  ($5, 'gr-nobody', 'x', 'رنا', 'reception', $6, $7::jsonb, true)`,
    [EXPERT, DOC, COLLEAGUE, BOUND, NOBODY, B1, JSON.stringify([B1])]);
  await q(`UPDATE system_users SET can_view_patients = true, can_view_payments = true, can_add_payments = true, can_add_patients = true WHERE id = $1`, [ZAHRAA]);
  const sess = (userId: number, displayName: string, role: string, isAdmin = false, permissions: Record<string, unknown> = {}) =>
    hdr({ userId, displayName, role, roles: [role], branchId: B1, accessibleBranches: [B1], isAdmin, permissions });
  const S = {
    admin: sess(ADMIN, "المسؤول", "admin", true),
    saleem: sess(SALEEM, "سليم", "branch_manager", false, { canSupervisePhysio: true }),
    zahraa: sess(ZAHRAA, "زهراء", "reception", false, { canViewPatients: true, canViewPayments: true, canAddPayments: true, canAddPatients: true }),
    tech: sess(TECH, "علي", "physio_technician"),
    expert: sess(EXPERT, "حسن", "prosthetics_expert"),
    doc: sess(DOC, "الطبيب", "doctor"),
    colleague: sess(COLLEAGUE, "مريم", "reception"),
    nobody: sess(NOBODY, "رنا", "reception"),
  };
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const h = req.get("x-test-session");
    if (h) {
      try { req.session = { branchSession: JSON.parse(Buffer.from(h, "base64").toString("utf8")), destroy: (cb: () => void) => cb() }; }
      catch { /* ignore */ }
    }
    next();
  });
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise<void>((r) => httpServer.once("listening", () => r()));
  const call = async (method: string, path: string, session: string, body?: unknown) => {
    const r = await fetch(`${BASE}${path}`, {
      method, headers: { "content-type": "application/json", "x-test-session": session },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json: any = null;
    try { json = await r.json(); } catch { /* */ }
    return { status: r.status, json };
  };
  try {
    const today = baghdadTodayYmd();
    const g1 = (await call("GET", "/api/greeting", S.saleem)).json;
    const expectText = greetingText(salutationAt(), "سليم", phraseFor(DEFAULT_GREETINGS, SALEEM, today));
    same("ب.١ **تحيّةُ اليوم للموظّف** بالوقت واسمه وعبارةِ يومه — **وبلا إنجازٍ أمس العبارةُ المتناوبة** كما كانت",
      [g1?.show, g1?.kind, g1?.text, g1?.period, g1?.achievements],
      [true, "greeting", expectText, salutationAt() === "صباح الخير" ? "morning" : "evening", []]);
    const seen = await call("POST", "/api/greeting/seen", S.saleem);
    const g2 = (await call("GET", "/api/greeting", S.saleem)).json;
    const last = (await q(`SELECT last_greeted_on::text AS d FROM system_users WHERE id = $1`, [SALEEM])).rows[0].d;
    same("ب.٢ **«حسناً» تُسكتها حتى الغد** — على الحساب (فلا تعود من جهازٍ آخر)، وزميلُه ما زال يراها",
      [seen.status, g2?.show, last, (await call("GET", "/api/greeting", S.zahraa)).json?.show], [200, false, today, true]);
    await q(`UPDATE system_users SET last_greeted_on = ($2::date - 1) WHERE id = $1`, [SALEEM, today]);
    same("ب.٣ **وتعود في اليوم التالي**", (await call("GET", "/api/greeting", S.saleem)).json?.show, true);
    const setAge = (iso: string) => q(`UPDATE system_settings SET setting_value = jsonb_set(setting_value::jsonb, '{updatedAt}', to_jsonb($2::text))::text
      WHERE setting_key = $1`, [GREETING_SETTING_KEY, iso]);
    const adminFresh = (await call("GET", "/api/greeting", S.admin)).json;
    await setAge(new Date(Date.now() - 90 * 86_400_000).toISOString());
    const adminOld = (await call("GET", "/api/greeting", S.admin)).json;
    same("ب.٤ **المالكُ لا يُحيّى — ولا تذكيرَ له بعد اليوم** ولو مضت على العبارات تسعون يوماً (§4.gw)", [adminFresh, adminOld], [{ show: false }, { show: false }]);
    const notAdmin = [(await call("GET", "/api/admin/greeting", S.saleem)).status, (await call("PUT", "/api/admin/greeting", S.saleem, { phrases: ["x"] })).status,
      (await call("PUT", "/api/admin/greeting/note", S.saleem, { note: "x" })).status];
    same("ب.٦ **العباراتُ والسطرُ للمسؤول وحده** — قراءةً وتغييراً", notAdmin, [403, 403, 403]);
    const view = (await call("GET", "/api/admin/greeting", S.admin)).json;
    same("ب.٧ **ويراها المسؤول — بلا عمرٍ ولا «حان التغيير»**", [view?.phrases?.length, "days" in (view ?? {}), "due" in (view ?? {}), view?.note], [10, false, false, null]);
    const bad = await call("PUT", "/api/admin/greeting", S.admin, { phrases: ["", "  "] });
    const mine = ["أهلاً بك يا بطل اليوم — دكتور ياسر يتمنّى لك يوماً رائعاً.", "دكتور ياسر يقول: أنت نجمُ هذا اليوم."];
    const put = await call("PUT", "/api/admin/greeting", S.admin, { phrases: [...mine, mine[0]] });
    await q(`UPDATE system_users SET last_greeted_on = NULL WHERE id = $1`, [ZAHRAA]);
    const g3 = (await call("GET", "/api/greeting", S.zahraa)).json;
    const auditRows = (await q(`SELECT action FROM audit_log WHERE entity_type = 'staff_greeting' ORDER BY id`)).rows.map((r) => r.action);
    same("ب.٨ **تغييرُ العبارات**: الفارغُ يُردّ، والمكرّرُ يسقط، والموظّفون يرونها، وبسطر تدقيق",
      [bad.status, put.status, put.json?.phrases, put.json?.updatedByName, mine.some((m) => (g3?.text ?? "").endsWith(m)), auditRows],
      [400, 200, mine, "المسؤول", true, ["update"]]);
    same("ب.١٠ **و«حسناً» لا تحرّك شاشاتِ الآخرين** — والكتابةُ الحقيقية تحرّكها",
      [isBroadcastWrite("POST", "/api/greeting/seen"), isBroadcastWrite("PUT", "/api/admin/greeting"), isBroadcastWrite("PUT", "/api/admin/greeting/note")], [false, true, true]);
    await q(`UPDATE system_users SET last_greeted_on = NULL WHERE id = $1`, [ZAHRAA]);
    await q(`ALTER TABLE system_settings RENAME TO system_settings_x`);
    const broken = await call("GET", "/api/greeting", S.zahraa);
    await q(`ALTER TABLE system_settings_x RENAME TO system_settings`);
    same("ب.١١ **فشلُ القراءة خطأٌ لا «لا تحيّة»** — فالواجهةُ تُعيد الطلبَ ولا تحفظ «لا شيء» يومَها كلَّه، ثمّ تعود بعد الإصلاح",
      [broken.status, broken.json?.show, (await call("GET", "/api/greeting", S.zahraa)).status], [500, undefined, 200]);
    //  تسابقٌ حتميّ: مسؤولٌ آخر يحفظ عباراتٍ (معاملةٌ مفتوحة تقفل الصفّ) لحظةَ حفظِ السطر — ثمّ يُثبِّت.
    const newer = ["عبارةٌ حفظها مسؤولٌ آخر في اللحظة نفسِها."];
    const tx = await pool.connect();
    await tx.query("BEGIN");
    await tx.query(`UPDATE system_settings SET setting_value = jsonb_set(setting_value::jsonb, '{phrases}', $2::jsonb)::text WHERE setting_key = $1`,
      [GREETING_SETTING_KEY, JSON.stringify(newer)]);
    const racing = call("PUT", "/api/admin/greeting/note", S.admin, { note: "سطرٌ في اللحظة نفسِها" });
    await new Promise((r) => setTimeout(r, 500));
    await tx.query("COMMIT");
    tx.release();
    const raced = await racing;
    const stored = JSON.parse((await q(`SELECT setting_value FROM system_settings WHERE setting_key = $1`, [GREETING_SETTING_KEY])).rows[0].setting_value);
    const putAfter = await call("PUT", "/api/admin/greeting", S.admin, { phrases: mine });
    same("ب.١٢ **السطرُ والعباراتُ لا يكتب أحدُهما فوق الآخر** — حفظُ السطر لحظةَ حفظ عباراتٍ يُبقيها، وحفظُ العبارات بعده يُبقي السطر",
      [raced.status, stored.phrases, stored.note, raced.json?.phrases, putAfter.json?.note, putAfter.json?.phrases],
      [200, newer, "سطرٌ في اللحظة نفسِها", newer, "سطرٌ في اللحظة نفسِها", mine]);
    const saved = (await q(`SELECT setting_value FROM system_settings WHERE setting_key = $1`, [GREETING_SETTING_KEY])).rows[0].setting_value;
    await q(`DELETE FROM system_settings WHERE setting_key = $1`, [GREETING_SETTING_KEY]);
    const fresh = await call("PUT", "/api/admin/greeting/note", S.admin, { note: "أوّلُ سطر" });
    const freshRow = JSON.parse((await q(`SELECT setting_value FROM system_settings WHERE setting_key = $1`, [GREETING_SETTING_KEY])).rows[0]?.setting_value ?? "null");
    await q(`INSERT INTO system_settings (setting_key, setting_value) VALUES ($1, $2)
             ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`, [GREETING_SETTING_KEY, saved]);
    same("ب.١٣ **والسطرُ بلا صفٍّ بعد** يكتب العباراتِ الأولى معه", [fresh.status, freshRow?.phrases?.length, freshRow?.note], [200, 10, "أوّلُ سطر"]);
    //  قيمةٌ تالفة في الصفّ (مراجعةُ Codex): القراءةُ تعود إلى الأولى، والحفظُ يُصلحها لا يردّ ٥٠٠ — السطرُ ثمّ العبارات، ثمّ مصفوفةٌ بدل كائن.
    const repair = [];
    for (const bad of ["{broken", "[1,2]"]) {
      await q(`UPDATE system_settings SET setting_value = $2 WHERE setting_key = $1`, [GREETING_SETTING_KEY, bad]);
      const loads = (await call("GET", "/api/admin/greeting", S.admin)).status;
      const noteFix = await call("PUT", "/api/admin/greeting/note", S.admin, { note: "سطرٌ يُصلح" });
      const rawRow = (await q(`SELECT setting_value FROM system_settings WHERE setting_key = $1`, [GREETING_SETTING_KEY])).rows[0].setting_value;
      let row: any = null; try { row = JSON.parse(rawRow); } catch { row = rawRow; }
      await q(`UPDATE system_settings SET setting_value = $2 WHERE setting_key = $1`, [GREETING_SETTING_KEY, bad]);
      const phrasesFix = await call("PUT", "/api/admin/greeting", S.admin, { phrases: mine });
      repair.push([loads, noteFix.status, row?.phrases?.length, row?.note, phrasesFix.status, phrasesFix.json?.phrases]);
    }
    await q(`UPDATE system_settings SET setting_value = $2 WHERE setting_key = $1`, [GREETING_SETTING_KEY, saved]);
    same("ب.١٣ب **الإعدادُ التالف يُصلحه الحفظ** — تالفٌ ومصفوفة: القراءةُ ٢٠٠، والسطرُ يُحفظ مع العبارات الأولى، والعباراتُ تُحفظ",
      repair, [[200, 200, 10, "سطرٌ يُصلح", 200, mine], [200, 200, 10, "سطرٌ يُصلح", 200, mine]]);
    const yesterday = previousYmd(today);
    const tomorrow = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10)) + 86_400_000).toISOString().slice(0, 10);
    const lastOf = async (id: number) => (await q(`SELECT last_greeted_on::text AS d FROM system_users WHERE id = $1`, [id])).rows[0].d;
    await q(`UPDATE system_users SET last_greeted_on = NULL WHERE id = $1`, [SALEEM]);
    const shown = (await call("GET", "/api/greeting", S.saleem)).json;
    await call("POST", "/api/greeting/seen", S.saleem, { day: yesterday });
    const afterLate = [await lastOf(SALEEM), (await call("GET", "/api/greeting", S.saleem)).json?.show];
    await call("POST", "/api/greeting/seen", S.saleem, { day: today });
    await call("POST", "/api/greeting/seen", S.saleem, { day: yesterday });
    const noBack = await lastOf(SALEEM);
    await q(`UPDATE system_users SET last_greeted_on = NULL WHERE id = $1`, [SALEEM]);
    await call("POST", "/api/greeting/seen", S.saleem, { day: tomorrow });
    const future = await lastOf(SALEEM);
    await q(`UPDATE system_users SET last_greeted_on = NULL WHERE id = $1`, [SALEEM]);
    await call("POST", "/api/greeting/seen", S.saleem, { day: "2020-01-01" });
    same("ب.١٤ **«حسناً» تكتب يومَ التحيّة المعروضة** (الجوابُ يحمله): أمسِ قبل منتصف الليل ⟵ أمس، فتظهر تحيّةُ اليوم؛ ولا يرجع المكتوبُ إلى الوراء، وغدٌ أو قديمٌ ⟵ اليوم",
      [shown?.day, afterLate, noBack, future, await lastOf(SALEEM)], [today, [yesterday, true], today, today, today]);

    // ══ ج. التذكيرُ الشهريّ تقاعد (§4.gw) ══
    console.log("\n── ج. التذكيرُ تقاعد ──");
    const indexSrc = readFileSync("server/index.ts", "utf8");
    const routesSrc = readFileSync("server/staff_greeting/routes.ts", "utf8");
    same("ج.١ **لا كرونَ ولا تلغرامَ للتذكير** — لا يُشغَّل عند الإقلاع، ولا يرسل الملفُّ شيئاً",
      [/GreetingReminder/.test(indexSrc), /node-cron|sendTelegram|GreetingReminder/.test(routesSrc)], [false, false]);
    same("ج.٢ **و«أبقِها شهراً آخر» لا باب لها**، ولا رسالةَ خرجت في الحزمة كلِّها",
      [(await call("POST", "/api/admin/greeting/keep", S.admin)).status === 200, sent.length], [false, 0]);

    // ══ د. إنجازُ الأمس على النقطة الحقيقية (§4.gw) ══
    console.log("\n── د. إنجازُ الأمس ──");
    const Y = yesterday;
    const yNaive = `${Y} 09:00:00`;            // ١٢:٠٠ ظهراً ببغداد أمس — للأعمدة بلا منطقة (قراءةُ UTC)
    const yTz = `${Y}T09:00:00Z`;              // اللحظةُ نفسُها للأعمدة بمنطقة
    const greet = async (who: string, id: number) => {
      await q(`UPDATE system_users SET last_greeted_on = NULL WHERE id = $1`, [id]);
      return (await call("GET", "/api/greeting", who)).json;
    };
    let seq = 0;
    const mkPatient = async (label: string) => {
      seq += 1;
      return Number((await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, total_cost, patient_classification)
        VALUES ($1, $2, $3, '40', 'x', $4, 0, 'new') RETURNING id`, [`${label} ${MARK}`, `0771${String(7000000 + seq)}`, MARK, B1])).rows[0].id);
    };
    const auditAt = (entity: string, id: number, userId: number, at: string | null) =>
      q(`INSERT INTO audit_log (entity_type, entity_id, action, user_id, user_name, branch_id, created_at)
         VALUES ($1, $2, 'create', $3, 'x', $4, COALESCE($5::timestamp, now()))`, [entity, id, userId, B1, at]);
    const register = async (userId: number, at: string | null, label = "مريض") => { const pid = await mkPatient(label); await auditAt("patient", pid, userId, at); return pid; };
    const payment = async (userId: number, pid: number, amount: number, at: string | null) => {
      const id = Number((await q(`INSERT INTO payments (patient_id, branch_id, amount, date) VALUES ($1, $2, $3, COALESCE($4::timestamp, now())) RETURNING id`,
        [pid, B1, amount, at])).rows[0].id);
      await auditAt("payment", id, userId, at);
      return id;
    };
    const visit = (userId: number, pid: number, visitDate: string) =>
      q(`INSERT INTO visits (patient_id, branch_id, created_by, visit_date, details) VALUES ($1, $2, $3, $4::timestamp, 'x') RETURNING id`,
        [pid, B1, userId, visitDate]).then((r) => Number(r.rows[0].id));

    // ── زهراء (الاستقبال) ──
    const zp1 = await register(ZAHRAA, yNaive), zp2 = await register(ZAHRAA, yNaive);
    const zTrashed = await register(ZAHRAA, yNaive, "محذوف");
    await q(`UPDATE patients SET deleted_at = now(), deleted_reason = 'اختبار', restore_until = now() + interval '30 days',
      deleted_total_cost = 0, deleted_total_paid = 0, deleted_remaining = 0, deleted_needed_admin = false,
      deleted_pending_json = '{"pendingCharges":[],"pendingDiscounts":[],"pendingPriceRequests":[],"openFollowups":[],"openSettlements":[]}'::jsonb
      WHERE id = $1`, [zTrashed]);
    await register(ZAHRAA, null, "اليوم");                                 // سُجّل اليوم ⟵ لا يُعدّ
    await payment(ZAHRAA, zp1, 100_000, yNaive);
    await payment(ZAHRAA, zp2, 250_000, yNaive);
    const zDeletedPay = await payment(ZAHRAA, zp1, 900_000, yNaive);
    await q(`DELETE FROM payments WHERE id = $1`, [zDeletedPay]);            // حُذفت بتصحيح ⟵ لا تُعدّ
    await payment(ZAHRAA, zp1, -50_000, yNaive);                            // استرجاعٌ سالب ⟵ لا يُعدّ
    await payment(ZAHRAA, zp1, 0, yNaive);                                  // جلساتٌ مجّانية ⟵ لا تُعدّ
    await payment(ZAHRAA, zp2, 400_000, null);                              // اليوم ⟵ لا تُعدّ
    await payment(ZAHRAA, zTrashed, 700_000, yNaive);                       // مريضُ السلّة ⟵ لا تُعدّ
    await visit(ZAHRAA, zp1, yNaive); await visit(ZAHRAA, zp2, yNaive);     // «سبب الحضور» بلحظتها، بلا سطر تدقيق
    const vDel = await visit(ZAHRAA, zp1, yNaive);
    await q(`UPDATE visits SET deleted_at = now() WHERE id = $1`, [vDel]);  // محذوفة ⟵ لا تُعدّ
    const vBackToday = await visit(ZAHRAA, zp1, yNaive);
    await auditAt("visit", vBackToday, ZAHRAA, null);                       // كُتبت اليوم بتاريخ أمس ⟵ لا تُعدّ
    const vBackYest = await visit(ZAHRAA, zp2, `${previousYmd(Y)} 09:00:00`);
    await auditAt("visit", vBackYest, ZAHRAA, yNaive);                      // كُتبت أمس بتاريخ قبله ⟵ تُعدّ
    // ── مريم (زميلتُها): خمسُ تسجيلاتٍ وخمسُ دفعاتٍ أمس — لا تظهر لزهراء ──
    for (let i = 0; i < 5; i++) { const pid = await register(COLLEAGUE, yNaive); await payment(COLLEAGUE, pid, 77_000, yNaive); }

    const gz = await greet(S.zahraa, ZAHRAA);
    const zLines = ["تسجيل مريضين", "استلام دفعتين بمجموع 350,000 د.ع", "تسجيل 3 زيارات"];
    same("د.١ **أرقامُ زهراء أمس بالضبط** — مريضان (بلا مريض السلّة ولا تسجيل اليوم)، ودفعتان (بلا المحذوفة والسالبة والمجّانية ودفعة اليوم ومريض السلّة)، وثلاثُ زيارات (بلا المحذوفة ولا ما كُتب اليوم بتاريخ أمس، ومعها ما كُتب أمس بتاريخ قبله)",
      [gz?.achievements, gz?.text, gz?.achievementsDay], [zLines, achievementGreetingText(salutationAt(), "زهراء", zLines), Y]);
    same("د.٢ **وزميلتُها لا تظهر** — لا رقمَ لها في جواب زهراء، ولها أرقامُها وحدها",
      [/77,000|385,000|5 /.test(JSON.stringify(gz)), (await greet(S.colleague, COLLEAGUE))?.achievements],
      [false, ["تسجيل 5 مرضى", "استلام 5 دفعات بمجموع 385,000 د.ع"]]);
    same("د.٣ **وبلا عملٍ منسوبٍ أمس العبارةُ المتناوبة** — لا صفرَ يُعرض", [await greet(S.nobody, NOBODY)].map((g) => [g?.achievements, g?.text, /0 /.test(g?.text ?? "")])[0],
      [[], greetingText(salutationAt(), "رنا", phraseFor(mine, NOBODY, today)), false]);

    // ── التسجيلُ والدفعةُ من البابين الحقيقيين — اليومَ لا يُعدّان، ثمّ يُعدّان حين يصير سطرُ تدقيقهما أمس ──
    const realReg = await call("POST", "/api/patients", S.zahraa, { name: `حقيقي ${MARK}`, phone: "07719990001", referralSource: MARK, age: "33", height: "170", weight: "70",
      medicalCondition: "x", branchId: B1, isPhysiotherapy: true, totalCost: 0, whatsappNotificationsEnabled: false });
    const realPid = Number(realReg.json?.id);
    //  كلفةُ القسم من مسارها في الحياة — هنا مباشرةً، فالدفعةُ تجد ما تُسدّده.
    await q(`UPDATE patient_cases SET cost = 100000 WHERE patient_id = $1`, [realPid]);
    await q(`UPDATE patients SET total_cost = 100000 WHERE id = $1`, [realPid]);
    const realPay = await call("POST", "/api/payments", S.zahraa, { patientId: realPid, branchId: B1, amount: 60_000, paymentTreatmentType: "تمارين" });
    const realAudit = (await q(`SELECT entity_type, user_id FROM audit_log WHERE action = 'create' AND ((entity_type = 'patient' AND entity_id = $1)
      OR (entity_type = 'payment' AND entity_id = $2)) ORDER BY entity_type`, [realPid, Number(realPay.json?.id)])).rows.map((r) => [r.entity_type, r.user_id]);
    const gzToday = await greet(S.zahraa, ZAHRAA);
    await q(`UPDATE audit_log SET created_at = $3::timestamp WHERE action = 'create' AND ((entity_type = 'patient' AND entity_id = $1)
      OR (entity_type = 'payment' AND entity_id = $2))`, [realPid, Number(realPay.json?.id), yNaive]);
    const gzShift = await greet(S.zahraa, ZAHRAA);
    same("د.٤ **البابان الحقيقيّان ينسبان التسجيلَ والدفعةَ لصاحبهما** — واليومُ لا يُعدّ، وبلحظة أمس يُعدّان",
      [realReg.status, realPay.status, realAudit, gzToday?.achievements, gzShift?.achievements?.slice(0, 2)],
      [201, 201, [["patient", ZAHRAA], ["payment", ZAHRAA]], zLines, ["تسجيل 3 مرضى", "استلام 3 دفعات بمجموع 410,000 د.ع"]]);

    // ── حسن (الخبير) ──
    await q(`UPDATE system_users SET last_greeted_on = NULL WHERE id = $1`, [EXPERT]);
    //  مريضٌ لكلّ أمر — أمرُ بناءٍ مفتوحٌ واحد للمريض (`uq_pwo_one_open_legacy_build`).
    const mkOrder = async (purpose: string, status = "active") => { const ep = await mkPatient("خبير"); return Number((await q(`INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type, purpose, status, current_stage)
      VALUES ($1, $2, $3, 'prosthetic', $4, $5, 'order_received') RETURNING id`, [ep, B1, EXPERT, purpose, status])).rows[0].id); };
    const hist = (order: number, action: string, from: string, to: string, at: string | null, by = EXPERT) =>
      q(`INSERT INTO prosthetic_work_history (work_order_id, action_type, from_stage, to_stage, performed_by, created_at) VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()))`,
        [order, action, from, to, by, at]);
    const o1 = await mkOrder("initial_build"), o2 = await mkOrder("initial_build"), oMaint = await mkOrder("maintenance"), oCancelled = await mkOrder("initial_build", "cancelled");
    await hist(o1, "stage_change", "order_received", "measurements", null);  // اليوم ⟵ لا يُعدّ
    const gEarly = await greet(S.expert, EXPERT);
    await hist(o1, "stage_change", "measurements", "casting", yTz);
    await hist(o2, "stage_change", "order_received", "measurements", yTz);
    await hist(o2, "stage_change", "measurements", "measurements", yTz);     // تصحيحٌ إلى المرحلة نفسِها ⟵ ليس خطوة
    await hist(o2, "delivered", "fitting", "delivered", yTz);
    await hist(oMaint, "stage_change", "new_assignment", "maintenance_device_done", yTz);
    await hist(oCancelled, "stage_change", "order_received", "measurements", yTz); // أمرٌ أُلغي ⟵ لا يُعدّ
    await hist(o1, "stage_change", "casting", "fitting", yTz, DOC);           // غيرُه حرّكه ⟵ ليس له
    same("د.٥ **الخبير: ما عمله اليومَ وحده لا يكفي** (العبارة)، **وأمسِ: جهازٌ سُلّم وصيانةٌ أُنجزت وخطوتان** — بلا الملغى ولا تصحيح المرحلة نفسِها ولا حركةِ غيره",
      [gEarly?.achievements, (await greet(S.expert, EXPERT))?.achievements],
      [[], ["تسليم جهاز واحد", "إنجاز أمر صيانة واحد", "إنجاز خطوتين في التصنيع"]]);

    // ── الطبيب ──
    const exam = async (pid: number, caseType: string, by: number, at: string) => Number((await q(`INSERT INTO medical_exams (patient_id, case_type, branch_id, doctor_id, doctor_name, signed_at)
      VALUES ($1, $2, $3, $4, 'x', $5::timestamptz) RETURNING id`, [pid, caseType, B1, by, at])).rows[0].id);
    const dp = await mkPatient("معاينة");
    await exam(dp, "prosthetic", DOC, yTz); await exam(dp, "medical_support", DOC, yTz);
    const cancelled = await exam(dp, "prosthetic", DOC, yTz);
    await q(`INSERT INTO medical_exam_cancellations (exam_id, patient_id, branch_id, reason, cancelled_by) VALUES ($1, $2, $3, 'خطأ', $4)`, [cancelled, dp, B1, DOC]);
    await exam(dp, "physiotherapy", DOC, yTz);
    await exam(dp, "prosthetic", DOC, new Date().toISOString());              // اليوم ⟵ لا يُعدّ
    same("د.٦ **الطبيب: معاينتان طبيّتان (بلا الملغاة ولا معاينة اليوم) ومعاينةُ علاجٍ طبيعيّ**",
      (await greet(S.doc, DOC))?.achievements, ["توقيع معاينتين طبيتين", "توقيع معاينة علاج طبيعي واحدة"]);

    // ── علي (المنفّذ): اثنتا عشرةَ جلسةً أمس وواحدةٌ ملغاة ──
    const tp = await mkPatient("جلسات");
    const plan = Number((await q(`INSERT INTO physio_plans (patient_id, branch_id, title_ar, status) VALUES ($1, $2, 'خطّة', 'approved') RETURNING id`, [tp, B1])).rows[0].id);
    const sessionRow = (by: number, at: string, cancelledAt: string | null = null, visitId: number | null = null) =>
      q(`INSERT INTO physio_plan_sessions (plan_id, patient_id, branch_id, session_date, shift, executed_by, created_at, cancelled_at, visit_id)
         VALUES ($1, $2, $3, $4::date, 'morning', $5, $6::timestamptz, $7::timestamptz, $8)`, [plan, tp, B1, Y, by, at, cancelledAt, visitId]);
    for (let i = 0; i < 12; i++) await sessionRow(TECH, yTz, i === 0 ? new Date().toISOString() : null);
    same("د.٧ **المنفّذ: إحدى عشرةَ جلسةً** (الملغاةُ لا تُعدّ) — بتمييز «١١–٩٩» المنصوب", (await greet(S.tech, TECH))?.achievements, ["إكمال 11 جلسةَ علاج طبيعي"]);

    // ── سليم (مديرُ فرعٍ ومشرفٌ عامّ): اتّحادُ الأبواب، وزيارةُ جلسته لا تُعدّ زيارةً ──
    await register(SALEEM, yNaive);
    await exam(tp, "physiotherapy", SALEEM, yTz);
    const sVisit = await visit(SALEEM, tp, yNaive);
    await sessionRow(SALEEM, yTz, null, sVisit);
    same("د.٨ **المديرُ المشرف: أبوابُ الاستقبال ثمّ العلاج الطبيعي** — وزيارةُ جلسته تُعدّ جلسةً لا زيارة",
      (await greet(S.saleem, SALEEM))?.achievements, ["تسجيل مريض واحد", "توقيع معاينة علاج طبيعي واحدة", "إكمال جلسة علاج طبيعي واحدة"]);

    // ── الأدوارُ من صفّ الحساب لا من نسخة الجلسة: دورٌ إضافيّ أُعطي للطبيب، وجلستُه ما زالت «طبيب» وحده ──
    await q(`UPDATE system_users SET extra_roles = '["physio_technician"]'::jsonb WHERE id = $1`, [DOC]);
    await sessionRow(DOC, yTz);
    same("د.٨ب **الأدوارُ من صفّ الحساب** — دورٌ إضافيّ أُعطي اليومَ يظهر بابُه ولو كانت الجلسةُ أقدم",
      (await greet(S.doc, DOC))?.achievements, ["توقيع معاينتين طبيتين", "توقيع معاينة علاج طبيعي واحدة", "إكمال جلسة علاج طبيعي واحدة"]);

    // ── علَمُ المعاينة على حساب مدير الفرع (مراجعةُ Codex): معاينةٌ وقّعها بعلَمه تُعدّ له ──
    await q(`UPDATE system_users SET can_write_medical_exam = true WHERE id = $1`, [SALEEM]);
    await exam(tp, "prosthetic", SALEEM, yTz);
    same("د.٨ج **علَمُ المعاينة يُعدّ عملَه** — المديرُ المشرف وقّع معاينةَ أطرافٍ بعلَمه فظهرت رابعةً",
      (await greet(S.saleem, SALEEM))?.achievements,
      ["تسجيل مريض واحد", "توقيع معاينة علاج طبيعي واحدة", "إكمال جلسة علاج طبيعي واحدة", "توقيع معاينة طبية واحدة"]);

    // ── حدُّ منتصف الليل +٠٣ (نور) ──
    const prev = previousYmd(Y);
    await register(BOUND, `${prev} 20:59:59`);   // ٢٣:٥٩:٥٩ ببغداد قبل أمس ⟵ لا
    await register(BOUND, `${prev} 21:00:00`);   // ٠٠:٠٠ ببغداد أمس ⟵ نعم
    await register(BOUND, `${Y} 20:59:59`);      // ٢٣:٥٩:٥٩ ببغداد أمس ⟵ نعم
    await register(BOUND, `${Y} 21:00:00`);      // ٠٠:٠٠ ببغداد اليوم ⟵ لا
    await sessionRow(BOUND, `${prev}T20:59:59Z`); await sessionRow(BOUND, `${prev}T21:00:00Z`);
    await sessionRow(BOUND, `${Y}T20:59:59Z`); await sessionRow(BOUND, `${Y}T21:00:00Z`);
    const b = await loadDayStats(BOUND, ["registrations", "physioSessions"], Y);
    same("د.٩ **يومُ بغداد من ٠٠:٠٠ +٠٣ إلى ٠٠:٠٠ +٠٣** — في العمود بلا منطقة وفي العمود بمنطقة", [b.registrations, b.physioSessions], [2, 2]);

    // ── سطرُ المالك ──
    const tooLong = await call("PUT", "/api/admin/greeting/note", S.admin, { note: "ا".repeat(201) });
    const setNote = await call("PUT", "/api/admin/greeting/note", S.admin, { note: "  شكراً لكم جميعاً  " });
    const zNote = await greet(S.zahraa, ZAHRAA), nNote = await greet(S.nobody, NOBODY);
    const noteAudit = (await q(`SELECT old_values, new_values FROM audit_log WHERE entity_type = 'staff_greeting' AND new_values LIKE '%note%' ORDER BY id DESC LIMIT 1`)).rows[0];
    await call("PUT", "/api/admin/greeting/note", S.admin, { note: "  شكراً لكم جميعاً" });
    const noteAuditN = Number((await q(`SELECT COUNT(*)::int AS n FROM audit_log WHERE entity_type = 'staff_greeting' AND new_values LIKE '%شكراً لكم%'`)).rows[0].n);
    const clear = await call("PUT", "/api/admin/greeting/note", S.admin, { note: "" });
    const zClear = await greet(S.zahraa, ZAHRAA);
    same("د.١٠ **سطرُ المالك يظهر للجميع تحت الإنجاز وتحت العبارة**، بسطر تدقيقٍ بالقديم والجديد (والتكرارُ بلا سطر)، والفارغُ يمحوه، وما فوق ٢٠٠ يُردّ",
      [tooLong.status, setNote.status, zNote?.note, nNote?.note, zNote?.achievements?.length > 0, nNote?.achievements,
        JSON.parse(noteAudit?.new_values ?? "{}").note, noteAuditN, clear.json?.note, zClear?.note],
      [400, 200, "شكراً لكم جميعاً", "شكراً لكم جميعاً", true, [], "شكراً لكم جميعاً", 1, null, null]);
    same("د.١١ **والمسؤولُ لا تحيّةَ له ولو كان له عملٌ أمس**", [await register(ADMIN, yNaive) > 0, (await greet(S.admin, ADMIN))], [true, { show: false }]);
    same("د.١٢ **والختامُ شكرُ دكتور ياسر** بلا فعلٍ ولا صفةٍ بجنس المخاطَب", [ACHIEVEMENTS_CLOSING, (gz?.text ?? "").endsWith(ACHIEVEMENTS_CLOSING)],
      ["دكتور ياسر يشكرك ويتمنّى لك يوماً موفّقاً.", true]);

    // ── الحفظةُ الواحدة دفعةٌ واحدة (مراجعة): «إضافة دفعة» بنوعين تكتب صفّين وسطرَي تدقيق ──
    const pA = await mkPatient("دفعات"), pB = await mkPatient("دفعات");
    await payment(BOUND, pA, 35_000, `${Y} 09:00:00`); await payment(BOUND, pA, 75_000, `${Y} 09:00:01`);   // حفظةٌ واحدة بنوعين
    await payment(BOUND, pA, 20_000, `${Y} 09:05:00`);                                                     // حفظةٌ ثانية للمريض نفسِه
    await payment(BOUND, pB, 10_000, `${Y} 09:05:01`);                                                     // مريضٌ آخر بعدها بثانية
    const split = await loadDayStats(BOUND, ["payments"], Y);
    same("د.١٣ **سطورُ المريض المتتالية خلال ثوانٍ حفظةٌ واحدة** — والحفظةُ الأخرى للمريض نفسِه بعد دقائق ومريضٌ آخر بعد ثانيةٍ دفعتان، والمجموعُ للصفوف كلّها",
      [split.payments, split.paymentsSum], [3, 140_000]);
    const splitPay = await call("POST", "/api/payments", S.zahraa, { patientId: realPid, branchId: B1, amount: 40_000,
      treatmentEntries: [{ treatmentType: "تمارين تأهيلية", sessionCount: 1, cost: 20_000 }, { treatmentType: "أجهزة علاج طبيعي", sessionCount: 1, cost: 20_000 }] });
    const splitIds = (await q(`SELECT id FROM payments WHERE patient_id = $1 AND amount = 20000 ORDER BY id`, [realPid])).rows.map((r) => Number(r.id));
    await q(`UPDATE audit_log SET created_at = $2::timestamp + (created_at - date_trunc('second', created_at)) WHERE entity_type = 'payment' AND action = 'create'
      AND entity_id = ANY($1::int[])`, [splitIds, `${Y} 11:00:00`]);
    same("د.١٤ **وعلى الباب الحقيقيّ**: دفعةٌ بنوعين صفّان وسطرا تدقيق، وتُعدّ لزهراء دفعةً واحدة ومجموعُها كاملاً",
      [splitPay.status, splitIds.length, (await greet(S.zahraa, ZAHRAA))?.achievements?.[1]], [201, 2, "استلام 4 دفعات بمجموع 450,000 د.ع"]);

    // ══ ط. مؤثّرُ الطقس مع التحيّة (§4.fw) ══
    console.log("\n── ط. مؤثّرُ الطقس مع التحيّة ──");
    const kinds = Object.keys(WEATHER_LABELS) as WeatherKind[];
    same("ط.١ **المطرُ والغبارُ وحدهما يُطلقانه** — الصافي والغائم والضباب والثلج والدخان بلا مؤثّر",
      Object.fromEntries(kinds.map((k) => [k, weatherFxFor(k)])),
      { clear: null, fair: null, partly: null, cloudy: null, fog: null, drizzle: "drizzle", rain: "rain", heavy_rain: "heavy", thunder: "thunder",
        sleet: "rain", snow: null, dust: "dust", blowing_dust: "storm", duststorm: "storm", haze: "dust", mist: null, smoke: null });
    same("ط.١ب وبلا طقسٍ معروف ⟵ لا مؤثّر", [weatherFxFor(null), weatherFxFor(undefined)], [null, null]);
    const lines = WEATHER_FX_KINDS.map((fx) => weatherGreetingLine(fx, "بغداد"));
    same("ط.٢ **سطرُ الطقس باسم المدينة وبلا فعلِ أمرٍ بجنس المخاطَب** (قاعدةُ العبارات — «الحذرُ» لا «انتبه»)",
      [lines.every((l) => l.includes("بغداد")), lines.some((l) => /(^|— )(انتبه|تمهّل[^ُ]|ابقَ|احذر|قلّل)/.test(l)), weatherGreetingLine("rain", "بغداد")],
      [true, false, "بغداد ممطرةٌ اليوم ☔ — الحذرُ في الطريق"]);
    same("ط.٣ **مفعّلٌ ما لم يُطفأ صراحةً**",
      [weatherFxEnabled(undefined), weatherFxEnabled(""), weatherFxEnabled("true"), weatherFxEnabled("false"), weatherFxEnabled("0")], [true, true, true, false, false]);
    await q(`DELETE FROM system_settings WHERE setting_key = $1`, [WEATHER_FX_SETTING_KEY]);
    await q(`UPDATE system_users SET last_greeted_on = NULL WHERE id = $1`, [ZAHRAA]);
    const gOn = (await call("GET", "/api/greeting", S.zahraa)).json;
    same("ط.٤ **التحيّةُ تقول إنّ المؤثّرَ مفعّل** افتراضاً", [gOn?.kind, gOn?.weatherFx], ["greeting", true]);
    const denied = await call("PUT", "/api/admin/greeting/weather-fx", S.saleem, { enabled: false });
    const badFx = await call("PUT", "/api/admin/greeting/weather-fx", S.admin, { enabled: "no" });
    same("ط.٥ **المفتاحُ للمسؤول وحده، وبقيمة نعم/لا**", [denied.status, badFx.status], [403, 400]);
    const auditCount = async () => Number((await q(`SELECT COUNT(*)::int AS n FROM audit_log WHERE entity_type = 'staff_greeting' AND new_values LIKE '%weatherFx%'`)).rows[0].n);
    const a0 = await auditCount();
    const off = await call("PUT", "/api/admin/greeting/weather-fx", S.admin, { enabled: false });
    const gOff = (await call("GET", "/api/greeting", S.zahraa)).json;
    const adminView = (await call("GET", "/api/admin/greeting", S.admin)).json;
    const a1 = await auditCount();
    await call("PUT", "/api/admin/greeting/weather-fx", S.admin, { enabled: false });
    const a2 = await auditCount();
    const lastAudit = (await q(`SELECT old_values, new_values FROM audit_log WHERE entity_type = 'staff_greeting' AND new_values LIKE '%weatherFx%' ORDER BY id DESC LIMIT 1`)).rows[0];
    same("ط.٦ **إطفاؤه يصل التحيّةَ وبطاقةَ المسؤول، بسطر تدقيقٍ بالقديم والجديد، والتكرارُ بلا سطرٍ ثانٍ**",
      [off.status, off.json?.weatherFx, gOff?.weatherFx, gOff?.text === gOn?.text, adminView?.weatherFx, a1 - a0, a2 - a1,
        JSON.parse(lastAudit?.old_values ?? "{}").weatherFx, JSON.parse(lastAudit?.new_values ?? "{}").weatherFx],
      [200, false, false, true, false, 1, 0, true, false]);
    const putOff = (await call("PUT", "/api/admin/greeting", S.admin, { phrases: ["عبارةٌ للاختبار"] })).json;
    const keepOff = (await call("PUT", "/api/admin/greeting/note", S.admin, { note: "" })).json;
    same("ط.٦ب **وحفظُ العبارات والسطر يحملان المفتاحَ كما هو** (مراجعةُ Codex — كانت البطاقةُ تقرأ غيابَه «مفعّلاً»)",
      [putOff?.weatherFx, keepOff?.weatherFx], [false, false]);
    await call("PUT", "/api/admin/greeting/weather-fx", S.admin, { enabled: true });
    same("ط.٧ **وإعادتُه تعيده**", (await call("GET", "/api/greeting", S.zahraa)).json?.weatherFx, true);
  } catch (e) {
    failures++;
    console.error("❌ FAIL  استثناء:", e);
  } finally {
    await q(`DELETE FROM system_settings WHERE setting_key = ANY($1::text[])`, [KEYS]);
    await q(MIGRATION_SQL);
    await cleanup().catch((e) => { failures++; console.error("❌ FAIL  التنظيف:", e?.message ?? e); });
    httpServer.close();
    await pool.end();
  }
  console.log(failures === 0 ? "\nكلُّ التأكيدات نجحت." : `\n${failures} تأكيداً سقط.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); } catch { /* */ }
  process.exit(1);
});
