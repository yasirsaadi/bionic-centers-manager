// **تحيّةُ الموظّف اليومية** (ترحيل ١٣٣، §4.dp — ٢٠٢٦-١٠-١١).
// `npm run test:staff-greeting` — حيٌّ على النقاط الحقيقية (منفذ ٧٠٠٩، فرع ٨٩٥٠، مستخدمون ٨٩٥١–٨٩٥٤). يحرس:
//   ق — القاعدة: «صباح الخير» من الخامسة حتى قبل الثانية عشرة بتوقيت بغداد و«مساء الخير» ما سواها، والتناوبُ يوماً بعد يوم وكلُّ موظّفٍ من
//       موضعه، والنصُّ بصيغة المالك، وتطبيعُ العبارات، وعمرُها والتذكيرُ بعد ثلاثين يوماً (و«أبقِها» يبدأ دورةً جديدة).
//   أ — الترحيل: العمودُ والعباراتُ العشر الأولى، والإعادةُ لا تكتب فوق ما غيّره المالك.
//   ب — الأبواب: التحيّةُ للموظّف مرّةً في اليوم (و«حسناً» تُسكتها حتى الغد ولو من جهازٍ آخر)، والمالكُ لا يُحيّى ويرى التذكيرَ حين يحين،
//       والعباراتُ للمسؤول وحده بتدقيق، و«أبقِها شهراً آخر»، و«حسناً» لا تحرّك شاشاتِ الآخرين.
//   ج — تذكيرُ تلغرام: لا شيء قبل الشهر، ورسالةٌ واحدة لكلّ دورة ولو تسابقت نسختان، وفشلُ الإرسال يُطلق الحجزَ ليُعاد.

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
import { runGreetingReminder } from "./staff_greeting/routes";
import { isBroadcastWrite } from "./live/updates";
import {
  DEFAULT_GREETINGS, GREETING_REMINDER_KEY, GREETING_SETTING_KEY, greetingAge, greetingText, parseGreetings, phraseFor, salutationAt,
} from "@shared/staff_greeting";
import { baghdadTodayYmd } from "@shared/visit_date";

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
const ADMIN = 8951, SALEEM = 8952, ZAHRAA = 8953, TECH = 8954;
const IDS = [ADMIN, SALEEM, ZAHRAA, TECH];

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");
const KEYS = [GREETING_SETTING_KEY, GREETING_REMINDER_KEY, "telegram_bot_token", "telegram_chat_id"];

async function cleanup() {
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[]) OR entity_type = 'staff_greeting'`, [IDS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

//  تلغرام وهميّ: يُحصي الرسائلَ ولا يخرج من الحاوية؛ وكلُّ نداءٍ آخر يمرّ إلى الخادم المحلّيّ.
const sent: string[] = [];
let telegramOk = true;
const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: any, init?: any) => {
  if (String(url).includes("api.telegram.org")) {
    sent.push(JSON.parse(init?.body ?? "{}").text ?? "");
    return new Response(JSON.stringify({ ok: telegramOk }), { status: telegramOk ? 200 : 500 });
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
  const now = new Date("2026-11-20T09:00:00Z");
  same("ق.٦ **التذكيرُ بعد ثلاثين يوماً** من آخر تغيير، و«أبقِها» يبدأ دورةً جديدة",
    [greetingAge({ updatedAt: "2026-10-22T09:00:00Z" }, now), greetingAge({ updatedAt: "2026-10-21T09:00:00Z" }, now),
      greetingAge({ updatedAt: "2026-09-01T09:00:00Z", keptAt: "2026-11-10T09:00:00Z" }, now)],
    [{ days: 29, due: false }, { days: 30, due: true }, { days: 10, due: false }]);

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
  const S = {
    admin: hdr({ userId: ADMIN, displayName: "المسؤول", role: "admin", branchId: B1, isAdmin: true, permissions: {} }),
    saleem: hdr({ userId: SALEEM, displayName: "سليم", role: "branch_manager", branchId: B1, isAdmin: false, permissions: { canSupervisePhysio: true } }),
    zahraa: hdr({ userId: ZAHRAA, displayName: "زهراء", role: "reception", branchId: B1, isAdmin: false, permissions: {} }),
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
    same("ب.١ **تحيّةُ اليوم للموظّف** بالوقت واسمه وعبارةِ يومه", [g1?.show, g1?.kind, g1?.text, g1?.period],
      [true, "greeting", expectText, salutationAt() === "صباح الخير" ? "morning" : "evening"]);
    const seen = await call("POST", "/api/greeting/seen", S.saleem);
    const g2 = (await call("GET", "/api/greeting", S.saleem)).json;
    const last = (await q(`SELECT last_greeted_on::text AS d FROM system_users WHERE id = $1`, [SALEEM])).rows[0].d;
    same("ب.٢ **«حسناً» تُسكتها حتى الغد** — على الحساب (فلا تعود من جهازٍ آخر)، وزميلُه ما زال يراها",
      [seen.status, g2?.show, last, (await call("GET", "/api/greeting", S.zahraa)).json?.show], [200, false, today, true]);
    await q(`UPDATE system_users SET last_greeted_on = ($2::date - 1) WHERE id = $1`, [SALEEM, today]);
    same("ب.٣ **وتعود في اليوم التالي**", (await call("GET", "/api/greeting", S.saleem)).json?.show, true);
    same("ب.٤ **المالكُ لا يُحيّى** — وعباراتُه جديدة فلا تذكير", (await call("GET", "/api/greeting", S.admin)).json, { show: false });
    const setAge = (iso: string) => q(`UPDATE system_settings SET setting_value = jsonb_set(setting_value::jsonb, '{updatedAt}', to_jsonb($2::text))::text
      WHERE setting_key = $1`, [GREETING_SETTING_KEY, iso]);
    await setAge(new Date(Date.now() - 31 * 86_400_000).toISOString());
    const rem = (await call("GET", "/api/greeting", S.admin)).json;
    await call("POST", "/api/greeting/seen", S.admin);
    same("ب.٥ **وحين يمضي شهرٌ يرى المالكُ تذكيرَ التغيير** مرّةً في اليوم",
      [rem?.show, rem?.kind, rem?.days, (await call("GET", "/api/greeting", S.admin)).json?.show], [true, "reminder", 31, false]);
    const notAdmin = [(await call("GET", "/api/admin/greeting", S.saleem)).status, (await call("PUT", "/api/admin/greeting", S.saleem, { phrases: ["x"] })).status,
      (await call("POST", "/api/admin/greeting/keep", S.saleem)).status];
    same("ب.٦ **العباراتُ للمسؤول وحده** — قراءةً وتغييراً وإبقاءً", notAdmin, [403, 403, 403]);
    const view = (await call("GET", "/api/admin/greeting", S.admin)).json;
    same("ب.٧ **ويراها المسؤول بعمرها**", [view?.phrases?.length, view?.days, view?.due], [10, 31, true]);
    const bad = await call("PUT", "/api/admin/greeting", S.admin, { phrases: ["", "  "] });
    const mine = ["أهلاً بك يا بطل اليوم — دكتور ياسر يتمنّى لك يوماً رائعاً.", "دكتور ياسر يقول: أنت نجمُ هذا اليوم."];
    const put = await call("PUT", "/api/admin/greeting", S.admin, { phrases: [...mine, mine[0]] });
    await q(`UPDATE system_users SET last_greeted_on = NULL WHERE id = $1`, [ZAHRAA]);
    const g3 = (await call("GET", "/api/greeting", S.zahraa)).json;
    const auditRows = (await q(`SELECT action FROM audit_log WHERE entity_type = 'staff_greeting' ORDER BY id`)).rows.map((r) => r.action);
    same("ب.٨ **تغييرُ العبارات**: الفارغُ يُردّ، والمكرّرُ يسقط، ويبدأ العدُّ من اليوم، والموظّفون يرونها، وبسطر تدقيق",
      [bad.status, put.status, put.json?.phrases, put.json?.days, put.json?.due, put.json?.updatedByName, mine.some((m) => (g3?.text ?? "").endsWith(m)), auditRows],
      [400, 200, mine, 0, false, "المسؤول", true, ["update"]]);
    await setAge(new Date(Date.now() - 40 * 86_400_000).toISOString());
    const kept = await call("POST", "/api/admin/greeting/keep", S.admin);
    same("ب.٩ **«أبقِها شهراً آخر»** يبدأ دورةً جديدة بلا تغييرٍ في العبارات، وبسطر تدقيق",
      [kept.status, kept.json?.phrases, kept.json?.days, kept.json?.due,
        (await q(`SELECT count(*)::int AS n FROM audit_log WHERE entity_type = 'staff_greeting' AND action = 'keep'`)).rows[0].n],
      [200, mine, 0, false, 1]);
    same("ب.١٠ **و«حسناً» لا تحرّك شاشاتِ الآخرين** — والكتابةُ الحقيقية تحرّكها",
      [isBroadcastWrite("POST", "/api/greeting/seen"), isBroadcastWrite("PUT", "/api/admin/greeting")], [false, true]);
    await q(`UPDATE system_users SET last_greeted_on = NULL WHERE id = $1`, [ZAHRAA]);
    await q(`ALTER TABLE system_settings RENAME TO system_settings_x`);
    const broken = await call("GET", "/api/greeting", S.zahraa);
    await q(`ALTER TABLE system_settings_x RENAME TO system_settings`);
    same("ب.١١ **فشلُ القراءة خطأٌ لا «لا تحيّة»** — فالواجهةُ تُعيد الطلبَ ولا تحفظ «لا شيء» يومَها كلَّه، ثمّ تعود بعد الإصلاح",
      [broken.status, broken.json?.show, (await call("GET", "/api/greeting", S.zahraa)).status], [500, undefined, 200]);
    //  تسابقٌ حتميّ: مسؤولٌ آخر يحفظ عباراتٍ (معاملةٌ مفتوحة تقفل الصفّ) لحظةَ ضغطِ «أبقِها» — ثمّ يُثبِّت.
    const newer = ["عبارةٌ حفظها مسؤولٌ آخر في اللحظة نفسِها."];
    const tx = await pool.connect();
    await tx.query("BEGIN");
    await tx.query(`UPDATE system_settings SET setting_value = jsonb_set(setting_value::jsonb, '{phrases}', $2::jsonb)::text WHERE setting_key = $1`,
      [GREETING_SETTING_KEY, JSON.stringify(newer)]);
    const racing = call("POST", "/api/admin/greeting/keep", S.admin);
    await new Promise((r) => setTimeout(r, 500));
    await tx.query("COMMIT");
    tx.release();
    const raced = await racing;
    const stored = JSON.parse((await q(`SELECT setting_value FROM system_settings WHERE setting_key = $1`, [GREETING_SETTING_KEY])).rows[0].setting_value);
    same("ب.١٢ **«أبقِها» تكتب الإبقاءَ وحده** — فلا تُعيد العباراتِ القديمة فوق ما حفظه مسؤولٌ آخر في اللحظة نفسِها",
      [raced.status, stored.phrases, typeof stored.keptAt === "string", raced.json?.phrases], [200, newer, true, newer]);
    const saved = (await q(`SELECT setting_value FROM system_settings WHERE setting_key = $1`, [GREETING_SETTING_KEY])).rows[0].setting_value;
    await q(`DELETE FROM system_settings WHERE setting_key = $1`, [GREETING_SETTING_KEY]);
    const fresh = await call("POST", "/api/admin/greeting/keep", S.admin);
    const freshRow = JSON.parse((await q(`SELECT setting_value FROM system_settings WHERE setting_key = $1`, [GREETING_SETTING_KEY])).rows[0]?.setting_value ?? "null");
    await q(`INSERT INTO system_settings (setting_key, setting_value) VALUES ($1, $2)
             ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`, [GREETING_SETTING_KEY, saved]);
    same("ب.١٣ **و«أبقِها» بلا صفٍّ بعد** تكتب العباراتِ الأولى بإبقائها",
      [fresh.status, freshRow?.phrases?.length, typeof freshRow?.keptAt === "string", fresh.json?.due], [200, 10, true, false]);

    // ══ ج. تذكيرُ تلغرام ══
    console.log("\n── ج. تذكيرُ تلغرام ──");
    same("ج.١ **لا شيء قبل الشهر**", [await runGreetingReminder(), sent.length], ["not_due", 0]);
    await setAge(new Date(Date.now() - 35 * 86_400_000).toISOString());
    await q(`UPDATE system_settings SET setting_value = jsonb_set(setting_value::jsonb, '{keptAt}', 'null'::jsonb)::text WHERE setting_key = $1`, [GREETING_SETTING_KEY]);
    const unconfigured = await runGreetingReminder();
    const released = (await q(`SELECT setting_value FROM system_settings WHERE setting_key = $1`, [GREETING_REMINDER_KEY])).rows[0]?.setting_value;
    same("ج.٢ **تلغرام غيرُ مضبوط ⟵ لا رسالة، والحجزُ يُطلق** فيُعاد غداً", [unconfigured, released, sent.length], ["failed", "", 0]);
    await q(`INSERT INTO system_settings (setting_key, setting_value) VALUES ('telegram_bot_token', 'test-token'), ('telegram_chat_id', '42')
             ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`);
    const race = await Promise.all([runGreetingReminder(), runGreetingReminder()]);
    same("ج.٣ **رسالةٌ واحدة لكلّ دورة ولو تسابقت نسختان** — بعدد الأيّام وطريقِ التغيير",
      [race.slice().sort(), sent.length, /مضى 35 يوماً/.test(sent[0] ?? ""), /عبارات الترحيب اليومية/.test(sent[0] ?? "")], [["already", "sent"], 1, true, true]);
    same("ج.٤ **ولا تُعاد في الدورة نفسِها**", [await runGreetingReminder(), sent.length], ["already", 1]);
    await call("POST", "/api/admin/greeting/keep", S.admin);
    same("ج.٥ **و«أبقِها» يبدأ دورةً لا تذكيرَ فيها قبل شهرها**", [await runGreetingReminder(), sent.length], ["not_due", 1]);
  } finally {
    await q(`DELETE FROM system_settings WHERE setting_key = ANY($1::text[])`, [KEYS]);
    await q(MIGRATION_SQL);
    await cleanup();
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
