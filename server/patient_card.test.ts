// بطاقةُ المريض في تلغرام — الدفعة ٢ (§4.bv). حيّاً على Postgres وعلى النقطة الحقيقية.
// قاعدة محلّية: `npm run test:patient-card`.
import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { verifyInitData, signInitData } from "./patient_card/init_data";
import { cardVisitLabel } from "@shared/patient_card";
import { isCardCommand, cardButtonMarkup } from "./patient_telegram/webhook";
import { sql as m093 } from "./migrations/093_patient_card";

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) { console.error("Refusing to run: LOCAL TEST database only."); process.exit(1); }
let failures = 0;
function same(msg: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌ FAIL"}  ${msg}${ok ? "" : `\n      expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`}`);
}
const PORT = 6960, BASE = `http://127.0.0.1:${PORT}`, MARK = "اختبار-بطاقة-المريض";
const TOKEN = "123456:TEST-token-for-card", TG = "777000111";
const q = async <T = any>(t: string, p: any[] = []) => (await pool.query(t, p)).rows as T[];
const ADMIN = 9942, RECV1 = 9943, RECV2 = 9944, DOC = 9945, USERS = [ADMIN, RECV1, RECV2, DOC];
const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2, 3], displayName: "المسؤول", permissions: {} },
  recv1: { userId: RECV1, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "استقبال بغداد", permissions: { canViewPatients: true } },
  recv2: { userId: RECV2, role: "reception", isAdmin: false, branchId: 3, accessibleBranches: [3], displayName: "استقبال فرع آخر", permissions: { canViewPatients: true } },
  doc: { userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "طبيب", permissions: { canViewPatients: true } },
};
async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method, headers: { "content-type": "application/json",
      "x-test-session-b64": Buffer.from(JSON.stringify(session), "utf8").toString("base64") },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null; try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}
const now = () => Math.floor(Date.now() / 1000);
const initFor = (userId: string, authDate = now()) =>
  signInitData({ auth_date: String(authDate), query_id: "AAH", user: JSON.stringify({ id: Number(userId), first_name: "م" }) }, TOKEN);
async function card(initData: string) {
  const res = await fetch(BASE + "/api/patient-card/me", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ initData }) });
  let body: any = null; try { body = await res.json(); } catch { /* */ }
  return { status: res.status, body, raw: JSON.stringify(body) };
}
const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
async function cleanup() {
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  for (const t of ["prosthetic_work_orders", "payments", "visits", "patient_device_episodes", "patient_contacts", "patient_branch_access", "cost_entries", "patient_cases"])
    await q(`DELETE FROM ${t} WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function main() {
  console.log("\n── أ. توقيعُ تلغرام ──");
  const good = initFor(TG);
  same("أ١. توقيعٌ صحيح يُقبل وبمعرّف المستخدم", (verifyInitData(good, TOKEN) as any).telegramUserId, TG);
  same("أ٢. وبتوكنٍ آخر يُرفض", verifyInitData(good, "999:other"), { ok: false, reason: "bad_hash" });
  same("أ٣. وتعديلُ حقلٍ بعد التوقيع يُرفض", verifyInitData(good.replace("777000111", "777000112"), TOKEN), { ok: false, reason: "bad_hash" });
  same("أ٤. وتوقيعٌ عمره يومان يُرفض", verifyInitData(initFor(TG, now() - 2 * 86400), TOKEN), { ok: false, reason: "expired" });
  same("أ٥. وفارغٌ يُرفض", verifyInitData("", TOKEN), { ok: false, reason: "missing" });

  console.log("\n── ب. عنوانُ الزيارة بلا نصٍّ حرّ ──");
  same("ب١. سببٌ يكتبه النظام يظهر", cardVisitLabel("تدريب على الجهاز", null), "تدريب على الجهاز");
  same("ب٢. «شراء جزء» بلا مبلغ", cardVisitLabel("شراء جزء: الركبة — 1,500,000 د.ع", null), "شراء جزء: الركبة");
  same("ب٣. ونصٌّ حرٌّ لا يظهر — «زيارة»", cardVisitLabel("المريض مزعج ودفع ناقص", null), "زيارة");
  same("ب٤. ونوعُ العلاج يظهر جلسةً", cardVisitLabel(null, "روبوت"), "جلسة روبوت");

  console.log("\n── ج. أمرُ «بطاقتي» ──");
  same("ج١. «/card» و«بطاقتي» أمرٌ، و«/card 5» لا", [isCardCommand("/card"), isCardCommand("بطاقتي"), isCardCommand("/card 5")], [true, true, false]);
  process.env.RENDER_EXTERNAL_URL = "https://bionic.example.com";
  same("ج٢. الزرُّ يفتح /card داخل تلغرام",
    (cardButtonMarkup() as any)?.inline_keyboard?.[0]?.[0]?.web_app?.url, "https://bionic.example.com/card");

  //  ── الخادم الحقيقيّ ──
  await q(m093);
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'كربلاء'),(3,'الموصل') ON CONFLICT DO NOTHING`);
  await cleanup();
  const app = express(); app.use(express.json());
  app.use((req: any, _res, next) => {
    const raw = req.headers["x-test-session-b64"];
    req.session = raw ? { branchSession: JSON.parse(Buffer.from(String(raw), "base64").toString("utf8")) } : {};
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") return app;
    return realUse(...(args as [any]));
  };
  //  رسائلُ تلغرام تُلتقَط ولا تخرج.
  const sent: any[] = [];
  const realFetch = globalThis.fetch;
  (globalThis as any).fetch = async (url: any, init?: any) => {
    if (String(url).startsWith("https://api.telegram.org/")) { sent.push(JSON.parse(String(init?.body ?? "{}"))); return new Response("{\"ok\":true}", { status: 200 }); }
    return realFetch(url, init);
  };
  for (const [id, role, b] of [[ADMIN, "admin", 1], [RECV1, "reception", 1], [RECV2, "reception", 3], [DOC, "doctor", 1]] as any[]) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_view_patients)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,true)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids, is_active=true, can_view_patients=true`,
      [id, `card_u${id}`, `مستخدم ${id}`, role, b, JSON.stringify([b])]);
  }
  const srv = createServer(app); await registerRoutes(srv, app); srv.listen(PORT);
  await new Promise<void>((r) => srv.once("listening", r));
  try {
    same("د٠. والبوتُ غيرُ مُعدّ ⟵ ٥٠٣", (await card(good)).status, 503);
    process.env.PATIENT_TELEGRAM_BOT_TOKEN = TOKEN;
    process.env.PATIENT_TELEGRAM_BOT_USERNAME = "TestBot";
    process.env.PATIENT_TELEGRAM_WEBHOOK_SECRET = "s3cr3t";

    const pid = (await q<{ id: number }>(
      `INSERT INTO patients (name, phone, address, referral_source, age, height, weight, medical_condition, branch_id, total_cost,
                             is_amputee, amputation_site, is_physiotherapy, disease_type, patient_classification, general_notes)
       VALUES ($1,'07701234567','كربلاء — حيّ الحسين',$2,'40','170','70','x',1,3000000,true,'فوق الركبة - يمين',true,'شلل نصفي','new','ملاحظة-عامة-سرية')
       RETURNING id`, [`${MARK} أحمد`, MARK]))[0].id;
    await q(`INSERT INTO patient_branch_access (patient_id, branch_id) VALUES ($1, 2)`, [pid]);
    const caseId = (await q(`INSERT INTO patient_cases (patient_id, case_type, status, cost) VALUES ($1,'prosthetic','active',3000000) RETURNING id`, [pid]))[0].id;
    await q(`INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number, status, agreed_cost, requested_item)
             VALUES ($1,$2,1,1,'in_manufacturing',3000000,'full_device')`, [pid, caseId]);
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, is_active)
             VALUES (9941,'card_exp','x','خبير-سري','prosthetics_expert',1,true) ON CONFLICT (id) DO NOTHING`);
    await q(`INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type, status, current_stage, purpose, expected_delivery_date, hold_reason_code)
             VALUES ($1,1,9941,'prosthetic','active','mold','initial_build','2026-11-01','materials')`, [pid]);
    const v1 = (await q(`INSERT INTO visits (patient_id, branch_id, visit_date, details, notes) VALUES ($1,1,'2026-10-01 09:00','تدريب على الجهاز','ملاحظة-زيارة-سرية') RETURNING id`, [pid]))[0].id;
    await q(`INSERT INTO visits (patient_id, branch_id, visit_date, details) VALUES ($1,2,'2026-10-02 10:00','نص-حر-سري')`, [pid]);
    await q(`INSERT INTO payments (patient_id, branch_id, amount, notes, visit_id, date) VALUES ($1,1,1000000,'ملاحظة-دفعة-سرية',$2,'2026-10-01 09:05')`, [pid, v1]);
    await q(`INSERT INTO payments (patient_id, branch_id, amount, date) VALUES ($1,2,500000,'2026-10-02 10:10')`, [pid]);
    await q(`INSERT INTO patient_contacts (patient_id, channel, external_id, relation) VALUES ($1,'telegram',$2,'self')`, [pid, TG]);

    console.log("\n── د. مَن يفتح ──");
    same("د١. مربوطٌ والبطاقةُ مطفأة ⟵ لا بطاقة", (await card(good)).body?.cards, []);
    await q(`UPDATE patients SET patient_card_enabled = true WHERE id = $1`, [pid]);
    const r = await card(good);
    same("د٢. ومفعّلة ⟵ بطاقةٌ واحدة", [r.status, r.body?.cards?.length], [200, 1]);
    same("د٣. وحسابُ تلغرام آخر ⟵ لا شيء", (await card(initFor("555"))).body?.cards, []);
    same("د٤. وتوقيعٌ مزوَّر ⟵ ٤٠١", (await card(good.replace(/hash=[0-9a-f]+/, "hash=" + "0".repeat(64)))).status, 401);

    console.log("\n── هـ. ما يظهر ──");
    const c = r.body?.cards?.[0] ?? {};
    same("هـ١. الاسمُ والهاتفُ والعنوان", [c.name, c.phone, c.address], [`${MARK} أحمد`, "07701234567", "كربلاء — حيّ الحسين"]);
    same("هـ٢. الفروعُ: التسجيلُ أوّلاً ثمّ المُتاح", c.branches, ["بغداد", "كربلاء"]);
    same("هـ٣. الأقسامُ بالنوع وحده", c.departments?.map((d: any) => [d.key, d.detail]),
      [["prosthetic", "طرف صناعي كامل — فوق الركبة - يمين"], ["physiotherapy", "شلل نصفي"]]);
    same("هـ٤. المراحلُ: القالبُ الحاليّ وما قبله منجز", c.orders?.[0]?.stages?.map((s: any) => s.state),
      ["done", "done", "current", "todo", "todo", "todo"]);
    same("هـ٥. وموعدُ التسليم", c.orders?.[0]?.expectedDeliveryDate, "2026-11-01");
    same("هـ٦. الأيّامُ بالأحدث، ودفعةُ كلّ زيارة بلا مجموع", c.days?.map((d: any) => [d.date, d.entries.map((e: any) => [e.label, e.amount])]),
      [["2026-10-02", [["زيارة", null], ["دفعة", 500000]]], ["2026-10-01", [["تدريب على الجهاز", null], ["دفعة", 1000000]]]]);
    same("هـ٧. والمتبقّي = الكلفة − المدفوع", c.remaining, 1500000);
    const raw = r.raw;
    same("هـ٨. **ولا نصٌّ حرٌّ ولا ملاحظةٌ ولا اسمُ موظّفٍ ولا سببُ توقّف**",
      ["سرية", "سري", "materials", "خبير", "general", "notes"].filter((s) => raw.includes(s)), []);
    same("هـ٩. ولا مفاتيحَ خارجَ شكل البطاقة", Object.keys(c).sort(),
      ["address", "branches", "code", "days", "departments", "name", "orders", "phone", "remaining"]);

    console.log("\n── ز. معاينةُ الموظّف ومفتاحُ التفعيل (الدفعة ٣) ──");
    await q(`UPDATE patients SET patient_card_enabled = false WHERE id = $1`, [pid]);
    const pv = await http("GET", `/api/patients/${pid}/patient-card`, S.recv1);
    same("ز١. استقبالُ فرع المريض يعاين: مطفأة، مربوط، والبطاقةُ نفسُها", [pv.status, pv.body?.enabled, pv.body?.telegramLinked, pv.body?.card?.remaining], [200, false, true, 1500000]);
    same("ز٢. والمعاينةُ = ما يصل المريضَ حرفاً", JSON.stringify(pv.body?.card), JSON.stringify(c));
    same("ز٣. واستقبالُ فرعٍ آخر ⟵ ٤٠٣، والطبيب ⟵ ٤٠٣",
      [(await http("GET", `/api/patients/${pid}/patient-card`, S.recv2)).status, (await http("GET", `/api/patients/${pid}/patient-card`, S.doc)).status], [403, 403]);
    same("ز٤. والاستقبالُ لا يفعّل ⟵ ٤٠٣ ولا يتغيّر شيء",
      [(await http("POST", `/api/patients/${pid}/patient-card`, S.recv1, { enabled: true })).status,
       (await q(`SELECT patient_card_enabled FROM patients WHERE id=$1`, [pid]))[0].patient_card_enabled], [403, false]);
    same("ز٥. وجسمٌ غيرُ صالح ⟵ ٤٠٠", [
      (await http("POST", `/api/patients/${pid}/patient-card`, S.admin, { enabled: "yes" })).status,
      (await http("POST", `/api/patients/${pid}/patient-card`, S.admin, { enabled: true, enabledBy: 1 })).status], [400, 400]);
    sent.length = 0;
    const on = await http("POST", `/api/patients/${pid}/patient-card`, S.admin, { enabled: true });
    same("ز٦. المسؤولُ يفعّل ⟵ مفعّلة، ورسالةٌ واحدة", [on.status, on.body?.enabled, on.body?.changed, on.body?.notified], [200, true, true, 1]);
    same("ز٧. والرسالةُ لحساب المريض بزرّ البطاقة",
      [sent[0]?.chat_id, sent[0]?.reply_markup?.inline_keyboard?.[0]?.[0]?.web_app?.url], [TG, "https://bionic.example.com/card"]);
    const row = (await q(`SELECT patient_card_enabled_at IS NOT NULL AS at, patient_card_enabled_by AS by FROM patients WHERE id=$1`, [pid]))[0];
    same("ز٨. ومتى ومَن على الصفّ", [row.at, row.by], [true, ADMIN]);
    same("ز٩. وسطرُ تدقيقٍ بالقديم والجديد", (await q(`SELECT action, old_values::jsonb->>'patientCardEnabled' AS o, new_values::jsonb->>'patientCardEnabled' AS n
             FROM audit_log WHERE entity_type='patient' AND entity_id=$1 AND action LIKE 'patient_card_%' ORDER BY id`, [pid])).map((a) => [a.action, a.o, a.n]),
      [["patient_card_enabled", "false", "true"]]);
    same("ز١٠. والمريضُ يفتحها الآن", (await card(good)).body?.cards?.length, 1);
    sent.length = 0;
    const again = await http("POST", `/api/patients/${pid}/patient-card`, S.admin, { enabled: true });
    same("ز١١. وتفعيلٌ ثانٍ لا يكتب ولا يرسل", [again.body?.changed, sent.length], [false, 0]);
    const off = await http("POST", `/api/patients/${pid}/patient-card`, S.admin, { enabled: false });
    same("ز١٢. والإطفاءُ يُغلقها بلا رسالة", [off.body?.enabled, sent.length, (await card(good)).body?.cards], [false, 0, []]);
    await q(`UPDATE patients SET patient_card_enabled = true WHERE id = $1`, [pid]);

    console.log("\n── و. الربطُ يُسحَب والمريضُ يُحذف ──");
    await q(`UPDATE patient_contacts SET revoked_at = NOW() WHERE patient_id = $1`, [pid]);
    same("و١. ربطٌ مسحوب ⟵ لا بطاقة", (await card(good)).body?.cards, []);
    await q(`UPDATE patient_contacts SET revoked_at = NULL WHERE patient_id = $1`, [pid]);
    //  لقطةُ السلّة كما يكتبها بابُها (قيدُ ٠٦٨) — الحالةُ وحدها تُختبَر هنا.
    await q(`UPDATE patients SET deleted_at = NOW(), deleted_total_cost = 0, deleted_total_paid = 0, deleted_remaining = 0,
               deleted_needed_admin = false, deleted_reason = 'اختبار', restore_until = NOW() + INTERVAL '30 days',
               deleted_pending_json = '{"pendingCharges":0,"pendingDiscounts":0,"pendingPriceRequests":0,"openFollowups":0,"openSettlements":0}'::jsonb
             WHERE id = $1`, [pid]);
    same("و٢. ومريضٌ في السلّة ⟵ لا بطاقة", (await card(good)).body?.cards, []);
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[]) OR id = 9941`, [USERS]);
    (globalThis as any).fetch = realFetch; srv.close();
  }
  console.log(`\n${failures === 0 ? "✅ كل فحوص بطاقة المريض نجحت" : `❌ ${failures} فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
