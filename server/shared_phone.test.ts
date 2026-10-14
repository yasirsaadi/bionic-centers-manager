// **رقمُ هاتفٍ مشترك بين أفراد عائلة** (ترحيل ١٤٧، §4.ef) — `npm run test:shared-phone`.
//
// حيٌّ على Postgres وعلى النقاط الحقيقية (منفذ ٧٠١٦). يحرس:
//   ق — القواعدُ الصافية (`shared/shared_phone.ts`): قراءةُ التأكيد كلِّه أو ردُّه كلِّه، وسطرُ العرض.
//   أ — التسجيل: الرقمُ المسجَّل لغيره يُردّ **بأسماء حامليه**، والتأكيدُ على حاملٍ فعليّ يسجّل بصلته، والتأكيدُ على غير حاملٍ يُردّ،
//       والشكلُ الفاسد ٤٠٠ بلا ملفّ، والاسمُ يبقى يُفحص، والجسمُ لا يكتب الاشتراكَ مباشرة، وسطرُ التدقيق يقول مَن وافق.
//   ب — العرض: «مشترك مع» على ملفّ القريب و«يستعمله أيضاً» على ملفّ صاحب الرقم، ويختفيان حين لا يعود الرقمُ واحداً، وبفهرسٍ (١٤٨).
//   ج — التعديل: رقمٌ جديد يمحو الاشتراك، والعودةُ إلى رقم القريب تُسأل ثمّ تُثبَّت بالتأكيد، وفي سطر التدقيق.
//   د — الدمجُ ينقل الاشتراكَ إلى الهدف، والحذفُ النهائيّ لصاحب الرقم لا يتعطّل ويُسقط الربطَ وحده.
//   و — الواجهة: قراءةُ الردّ من الخطأين، والشاشاتُ الأربع تفتح النافذةَ وتعيد الحفظَ بالتأكيد.
import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import fs from "fs";
import path from "path";
import { PHONE_RELATIONS, parseSharedPhone, sharedPhoneLabel } from "@shared/shared_phone";
import { phoneConflictOf } from "../client/src/lib/phone_conflict";

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) { console.error("Refusing to run: LOCAL TEST database only."); process.exit(1); }

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 7016, BASE = `http://127.0.0.1:${PORT}`, MARK = "اختبار-الرقم-المشترك";
const ADMIN = 8851, RECV = 8852, RECV2 = 8853;
const IDS = [ADMIN, RECV, RECV2];
const PHONE = "07711223344", PHONE_Y = "07711223355", PHONE_NEW = "07711223366", PHONE_U = "07711223377";

const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2], displayName: "المسؤول",
    permissions: { canViewPatients: true, canAddPatients: true, canEditPatients: true, canDeletePatients: true } },
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "ريام",
    permissions: { canViewPatients: true, canAddPatients: true, canEditPatients: true } },
  recv2: { userId: RECV2, role: "reception", isAdmin: false, branchId: 2, accessibleBranches: [2], displayName: "استقبال الفرع الثاني",
    permissions: { canViewPatients: true, canAddPatients: true, canEditPatients: true } },
};

const q = async <T = any>(t: string, p: any[] = []) => (await pool.query(t, p)).rows as T[];
const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;

async function cleanup() {
  await q(`UPDATE patients SET phone_shared_with_patient_id = NULL WHERE referral_source = '${MARK}'`);
  for (const t of ["patient_notification_deliveries", "patient_contacts", "patient_cases", "cost_entries", "patient_events"]) {
    await q(`DELETE FROM ${t} WHERE patient_id IN (${ids})`).catch(() => {});
  }
  await q(`DELETE FROM audit_log WHERE entity_type = 'patient' AND entity_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
}

async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64") },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}
const payload = (name: string, phone: string, extra: Record<string, any> = {}) => ({
  name: `${MARK} ${name}`, phone, referralSource: MARK, age: "30", height: "170", weight: "70",
  medicalCondition: "physiotherapy", isAmputee: false, isPhysiotherapy: true, isMedicalSupport: false,
  branchId: 1, whatsappNotificationsEnabled: false, hadPriorCenterHistory: false, ...extra,
});
const reg = (session: any, name: string, phone: string, extra: Record<string, any> = {}) =>
  http("POST", "/api/patients", session, payload(name, phone, extra));
const row = async (id: number) => (await q(`SELECT id, name, phone_e164, phone_shared_with_patient_id AS sw, phone_shared_relation AS rel,
  deleted_at FROM patients WHERE id = $1`, [id]))[0] ?? null;
const countByName = async (name: string) => Number((await q(`SELECT count(*)::int AS n FROM patients WHERE name = $1`, [`${MARK} ${name}`]))[0].n);
const short = (n: string) => String(n).replace(`${MARK} `, "");

async function main() {
  // ══ ق — القواعدُ الصافية ══════════════════════════════════════════════════════════════════
  console.log("\n── ق. القواعدُ الصافية ──");
  same("ق.١ الصلاتُ بحرف المالك", [...PHONE_RELATIONS], ["زوج", "زوجة", "أب", "أم", "ابن", "ابنة", "أخ", "أخت", "قريب آخر"]);
  same("ق.٢ بلا تأكيد ⟵ `null` (الطلبُ العاديّ)، والتأكيدُ الصحيح يُقرأ ويُقصّ",
    [parseSharedPhone(undefined), parseSharedPhone(null), parseSharedPhone({ withPatientId: "12", relation: " زوج " })],
    [null, null, { withPatientId: 12, relation: "زوج" }]);
  same("ق.٣ **والفاسدُ كلُّه ⟵ `undefined`** (يُردّ ٤٠٠ لا يُتجاهل): صلةٌ ليست في القائمة، أو معرّفٌ غيرُ صحيح، أو ليس كائناً",
    [parseSharedPhone({ withPatientId: 12, relation: "عمّ" }), parseSharedPhone({ withPatientId: 0, relation: "زوج" }),
      parseSharedPhone({ withPatientId: 1.5, relation: "زوج" }), parseSharedPhone({ relation: "زوج" }), parseSharedPhone("زوج"), parseSharedPhone([1])],
    [undefined, undefined, undefined, undefined, undefined, undefined]);
  same("ق.٤ سطرُ العرض", [sharedPhoneLabel("أحمد حسين", "زوج"), sharedPhoneLabel("أحمد", null)], ["مشترك مع: أحمد حسين (زوج)", "مشترك مع: أحمد"]);

  // ══ و — الواجهة: قراءةُ الردّ ومصادرُ الشاشات الأربع ══════════════════════════════════════════
  console.log("\n── و. الواجهة ──");
  const holder = { id: 5, name: "أحمد", patientCode: "WB-1", branchName: "بغداد", reachable: true };
  const body = { message: "x", code: "patient_phone_conflict", holders: [holder] };
  same("و.١ **ردُّ الرقم المسجَّل يُقرأ من الخطأين**: خطأٌ يحمل جسمَه (`useCreatePatient`) وخطأُ «409: {…}» (`apiRequest`)",
    [phoneConflictOf(Object.assign(new Error("x"), { body })), phoneConflictOf(new Error(`409: ${JSON.stringify(body)}`))], [[holder], [holder]]);
  same("و.٢ وغيرُه لا يفتح النافذة: رمزٌ آخر، أو بلا حاملين، أو نصٌّ عاديّ",
    [phoneConflictOf(new Error(`409: ${JSON.stringify({ code: "patient_name_conflict" })}`)),
      phoneConflictOf(new Error(`409: ${JSON.stringify({ code: "patient_phone_conflict", holders: [] })}`)), phoneConflictOf(new Error("تعذّر"))],
    [null, null, null]);
  const src = (f: string) => fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "..", f), "utf8");
  const sheets = ["client/src/pages/IntakeSheetCreate.tsx", "client/src/pages/PhysioSheetCreate.tsx"].map(src);
  check(sheets.every((c) => /<SharedPhoneDialog holders=\{phoneHolders\} mode="create"/.test(c) && /onConfirm=\{\(c\) => save\.mutate\(c\)\}/.test(c)
    && /\.\.\.\(sharedPhone \? \{ sharedPhone \} : \{\}\)/.test(c) && /if \(holders\) \{ setPhoneHolders\(holders\); return; \}/.test(c)),
    "و.٣ **الاستمارتان** (أطراف ومساند · علاج طبيعي): الردُّ يفتح النافذة لا توستاً، والتأكيدُ يعيد الحفظَ ومعه `sharedPhone`");
  const edit = src("client/src/pages/EditPatient.tsx"), create = src("client/src/pages/CreatePatient.tsx");
  check(/<SharedPhoneDialog holders=\{phoneConflict\?\.holders \?\? null\} mode="edit"/.test(edit) && /savePatient\(\{ \.\.\.phoneConflict\.data, sharedPhone: c \}\)/.test(edit),
    "و.٤ **«تعديل بيانات المريض»** بالنافذة نفسِها، والتأكيدُ يعيد الحفظَ بما كُتب ومعه `sharedPhone`");
  check(/mode="create"/.test(create) && /submitPatient\(\{ \.\.\.phoneConflict\.data, sharedPhone: c \}\)/.test(create),
    "و.٥ و«إضافة مريض» القديمة بالنافذة نفسِها");
  const hooks = src("client/src/hooks/use-patients.ts");
  check((hooks.match(/if \(phoneConflictOf\(error\)\) return;/g) ?? []).length === 2 && (hooks.match(/\{ status: res\.status, body: error \}/g) ?? []).length === 2,
    "و.٦ والخطّافان يحملان الجسمَ مع الخطأ ولا يُظهران توستَ خطأٍ فوق النافذة");
  const dialog = src("client/src/components/SharedPhoneDialog.tsx");
  check(/setOwnerId\(holders && holders\.length === 1 \? holders\[0\]\.id : null\)/.test(dialog) && /disabled=\{!ownerId \|\| !relation \|\| pending\}/.test(dialog),
    "و.٧ **صاحبُ الرقم لا يُختار صامتاً**: الواحدُ تلقائياً، وأكثرُ من واحد يختاره الاستقبال — والحفظُ معطّلٌ بلا صاحبٍ وصلة");

  // ══ الإعداد ═════════════════════════════════════════════════════════════════════════════════
  await q(`INSERT INTO branches (id, name) VALUES (1, 'بغداد'), (2, 'كربلاء') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active,
             can_view_patients, can_add_patients, can_edit_patients, can_delete_patients)
           VALUES ($1,'sp_admin','x','المسؤول','admin',1,'[1,2]'::jsonb,true,true,true,true,true),
                  ($2,'sp_recv','x','ريام','reception',1,'[1]'::jsonb,true,true,true,true,false),
                  ($3,'sp_recv2','x','استقبال الفرع الثاني','reception',2,'[2]'::jsonb,true,true,true,true,false)
           ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, branch_id = EXCLUDED.branch_id, branch_ids = EXCLUDED.branch_ids, is_active = true,
             can_view_patients = true, can_add_patients = true, can_edit_patients = true, can_delete_patients = EXCLUDED.can_delete_patients`,
    [ADMIN, RECV, RECV2]);
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")), destroy: (cb: any) => cb() }
      : { destroy: (cb: any) => cb() };
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) => (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") ? app : realUse(...(args as [any]));
  const srv = createServer(app); await registerRoutes(srv, app); srv.listen(PORT);
  await new Promise<void>((r) => srv.once("listening", r));

  try {
    // ══ أ — التسجيل ══════════════════════════════════════════════════════════════════════════
    console.log("\n── أ. التسجيل ──");
    const ahmed = await reg(S.recv, "أحمد حسين", PHONE);
    check(ahmed.status === 201, "أ.١ أحمد يُسجَّل برقمه", JSON.stringify(ahmed.body));
    const A = ahmed.body.id as number;
    const wifeNo = await reg(S.recv, "فاطمة كاظم", PHONE);
    same("أ.٢ **زوجتُه برقمه بلا تأكيد ⟵ ٤٠٩ بأسماء حامليه** (الاسمُ والرمزُ والفرعُ، ويفتح السائلُ ملفَّه) — ولا ملفَّ أُنشئ",
      [wifeNo.status, wifeNo.body?.code, (wifeNo.body?.holders ?? []).map((h: any) => [h.id, short(h.name), !!h.patientCode, h.branchName, h.reachable]),
        /مسجَّل باسم: .*أحمد حسين/.test(wifeNo.body?.message ?? ""), await countByName("فاطمة كاظم")],
      [409, "patient_phone_conflict", [[A, "أحمد حسين", true, "بغداد", true]], true, 0]);
    const wife = await reg(S.recv, "فاطمة كاظم", PHONE, { sharedPhone: { withPatientId: A, relation: "زوج" } });
    const W = wife.body?.id as number;
    same("أ.٣ **«قريب يستعمل الرقم نفسه» ⟵ تُسجَّل برقمه وصلته** — والرقمُ المطبَّع نفسُه",
      [wife.status, (await row(W))?.sw, (await row(W))?.rel, (await row(W))?.phone_e164 === (await row(A))?.phone_e164],
      [201, A, "زوج", true]);
    const audit = (await q(`SELECT user_id, notes, new_values FROM audit_log WHERE entity_type = 'patient' AND entity_id = $1 AND action = 'create'`, [W]))[0];
    same("أ.٤ **وسطرُ التدقيق يقول مَن وافق على الرقم المشترك**",
      [audit?.user_id, /رقمٍ مشترك مع الملفّ #\d+ \(زوج\)/.test(audit?.notes ?? ""), JSON.parse(audit?.new_values ?? "{}").phoneSharedWithPatientId],
      [RECV, true, A]);
    const other = await reg(S.recv, "غريب", PHONE_U);
    const wrong = await reg(S.recv, "زينب", PHONE, { sharedPhone: { withPatientId: other.body.id, relation: "أخت" } });
    same("أ.٥ **التأكيدُ على ملفٍّ لا يحمل الرقم ⟵ يُردّ ٤٠٩** بحامليه الحقيقيين — لا يمرّ بمعرّفٍ عشوائيّ",
      [wrong.status, (wrong.body?.holders ?? []).map((h: any) => h.id).sort((a: number, b: number) => a - b), await countByName("زينب")],
      [409, [A, W].sort((a, b) => a - b), 0]);
    const bad = await Promise.all([
      reg(S.recv, "زينب", PHONE, { sharedPhone: { withPatientId: A, relation: "عمّ" } }),
      reg(S.recv, "زينب", PHONE, { sharedPhone: { withPatientId: "x", relation: "زوج" } }),
      reg(S.recv, "زينب", PHONE, { sharedPhone: "زوج" }),
    ]);
    same("أ.٦ **والتأكيدُ الفاسد ٤٠٠** (صلةٌ ليست في القائمة، معرّفٌ غيرُ رقم، نصّ) ولا ملفَّ أُنشئ",
      [bad.map((r) => [r.status, r.body?.field]), await countByName("زينب")], [[[400, "sharedPhone"], [400, "sharedPhone"], [400, "sharedPhone"]], 0]);
    const son = await reg(S.recv, "علي أحمد", PHONE, { sharedPhone: { withPatientId: W, relation: "أم" } });
    same("أ.٧ **وثالثٌ يؤكّد على أيٍّ من الحاملين** (الابنُ على أمّه)", [son.status, (await row(son.body?.id))?.sw, (await row(son.body?.id))?.rel],
      [201, W, "أم"]);
    const far = await reg(S.recv2, "قريب بعيد", PHONE, { branchId: 2 });
    same("أ.٨ **ومن فرعٍ آخر: الأسماءُ تظهر و«يفتح ملفَّه» لا** — فتقول الشاشةُ أين الملفّ",
      [far.status, (far.body?.holders ?? []).map((h: any) => h.reachable)], [409, [false, false, false]]);
    const sameName = await reg(S.recv, "أحمد حسين", PHONE, { sharedPhone: { withPatientId: A, relation: "أب" } });
    same("أ.٩ **والاسمُ يبقى يُفحص** — تأكيدُ الرقم لا يفتح تكرارَ الاسم", [sameName.status, sameName.body?.code], [409, "patient_name_conflict"]);
    const forged = await reg(S.recv, "مستقلّ", PHONE_Y, { phoneSharedWithPatientId: A, phoneSharedRelation: "زوج" });
    const lone = await reg(S.recv, "وحيد", PHONE_NEW, { sharedPhone: { withPatientId: A, relation: "أخ" } });
    same("أ.١٠ **والجسمُ لا يكتب الاشتراكَ مباشرة**، وتأكيدٌ على رقمٍ لا يحمله أحد لا يُحفظ اشتراكاً",
      [forged.status, (await row(forged.body?.id))?.sw, lone.status, (await row(lone.body?.id))?.sw], [201, null, 201, null]);

    // ══ ب — العرض ════════════════════════════════════════════════════════════════════════════
    console.log("\n── ب. العرض ──");
    const gW = (await http("GET", `/api/patients/${W}`, S.recv)).body;
    const gA = (await http("GET", `/api/patients/${A}`, S.recv)).body;
    same("ب.١ **«مشترك مع» على ملفّ الزوجة**، و«يستعمله أيضاً» على ملفّ أحمد",
      [gW?.phoneSharedWith ? [gW.phoneSharedWith.id, short(gW.phoneSharedWith.name), gW.phoneSharedWith.relation, gW.phoneSharedWith.reachable] : null,
        (gW?.phoneSharedBy ?? []).map((u: any) => [short(u.name), u.relation]),
        gA?.phoneSharedWith, (gA?.phoneSharedBy ?? []).map((u: any) => [short(u.name), u.relation])],
      [[A, "أحمد حسين", "زوج", true], [["علي أحمد", "أم"]], null, [["فاطمة كاظم", "زوج"]]]);
    //  «يستعمله أيضاً» يُسأل في كلّ فتحٍ للملفّ — فهرسٌ جزئيّ (ترحيل ١٤٨) لا مسحٌ لجدول المرضى كلِّه (ملاحظةُ مراجعة Codex على #649).
    const ixDef = (await q(`SELECT indexdef FROM pg_indexes WHERE tablename = 'patients' AND indexname = 'ix_patients_phone_shared_with'`))[0]?.indexdef ?? "";
    const planClient = await pool.connect();
    let plan = "";
    try {
      await planClient.query("BEGIN");
      await planClient.query("SET LOCAL enable_seqscan = off");
      plan = (await planClient.query(`EXPLAIN SELECT id FROM patients WHERE phone_shared_with_patient_id = $1 AND deleted_at IS NULL`, [A])).rows
        .map((r: any) => r["QUERY PLAN"]).join(" ");
    } finally { await planClient.query("ROLLBACK"); planClient.release(); }
    check(/\(phone_shared_with_patient_id\)/.test(ixDef) && /WHERE \(phone_shared_with_patient_id IS NOT NULL\)/.test(ixDef) && /ix_patients_phone_shared_with/.test(plan),
      "ب.٢ **«يستعمله أيضاً» بفهرسٍ جزئيّ** على `phone_shared_with_patient_id` — وسؤالُ الملفّ يستعمله", `def=${ixDef} | plan=${plan}`);

    // ══ ج — التعديل ══════════════════════════════════════════════════════════════════════════
    console.log("\n── ج. التعديل ──");
    const moved = await http("PUT", `/api/patients/${W}`, S.recv, { phone: PHONE_Y.replace("55", "88") });
    same("ج.١ **رقمٌ جديدٌ لها وحدها يمحو الاشتراك**", [moved.status, (await row(W))?.sw, (await row(W))?.rel,
      (await http("GET", `/api/patients/${W}`, S.recv)).body?.phoneSharedWith], [200, null, null, null]);
    const back = await http("PUT", `/api/patients/${W}`, S.recv, { phone: PHONE });
    same("ج.٢ **والعودةُ إلى رقم زوجها بلا تأكيد ⟵ ٤٠٩ بحامليه** — والملفُّ كما كان",
      [back.status, back.body?.code, (back.body?.holders ?? []).length >= 2, (await row(W))?.sw], [409, "patient_phone_conflict", true, null]);
    const backOk = await http("PUT", `/api/patients/${W}`, S.recv, { phone: PHONE, sharedPhone: { withPatientId: A, relation: "زوج" } });
    const upd = (await q(`SELECT notes, new_values FROM audit_log WHERE entity_type = 'patient' AND entity_id = $1 AND action = 'update'
      ORDER BY id DESC LIMIT 1`, [W]))[0];
    same("ج.٣ **وبالتأكيد تُثبَّت مشتركةً** — وفي سطر التدقيق «الرقم مشترك مع الملفّ» و«صلة صاحب الرقم»",
      [backOk.status, (await row(W))?.sw, (await row(W))?.rel, JSON.parse(upd?.new_values ?? "{}").phoneSharedWithPatientId, /الرقم مشترك مع الملفّ/.test(upd?.notes ?? "")],
      [200, A, "زوج", A, true]);
    const badEdit = await http("PUT", `/api/patients/${W}`, S.recv, { phone: PHONE, sharedPhone: { withPatientId: A, relation: "خال" } });
    same("ج.٤ والتأكيدُ الفاسد على التعديل ٤٠٠ أيضاً", [badEdit.status, badEdit.body?.field], [400, "sharedPhone"]);
    await http("PUT", `/api/patients/${A}`, S.recv, { phone: PHONE_Y.replace("55", "99") });
    const gW2 = (await http("GET", `/api/patients/${W}`, S.recv)).body;
    same("ج.٥ **وأحمد غيّر رقمَه ⟵ لا تقول الزوجةُ «مشترك» عن رقمٍ لم يعد واحداً**", [gW2?.phoneSharedWith, (await row(W))?.sw], [null, A]);
    await http("PUT", `/api/patients/${A}`, S.recv, { phone: PHONE, sharedPhone: { withPatientId: W, relation: "زوجة" } });

    // ══ د — الدمجُ والحذفُ النهائيّ ═════════════════════════════════════════════════════════════
    console.log("\n── د. الدمجُ والحذف ──");
    const dup = await reg(S.admin, "أحمد حسين مكرّر", PHONE, { sharedPhone: { withPatientId: A, relation: "قريب آخر" } });
    const D = dup.body.id as number;
    await q(`UPDATE patients SET phone_shared_with_patient_id = $1 WHERE id = $2`, [D, son.body.id]);
    await storage.mergePatients(D, A);
    same("د.١ **الدمجُ ينقل الاشتراكَ إلى الهدف** — الابنُ صار مشتركاً مع أحمد، والمصدرُ زال",
      [(await row(son.body.id))?.sw, await row(D)], [A, null]);
    await storage.deletePatient(A);
    same("د.٢ **الحذفُ النهائيّ لصاحب الرقم لا يتعطّل** — يسقط الربطُ وحده والرقمُ باقٍ على الزوجة والابن",
      [await row(A), (await row(W))?.sw, (await row(W))?.phone_e164 !== null, (await row(son.body.id))?.sw], [null, null, true, null]);
  } finally {
    await cleanup();
    srv.close();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
  await pool.end().catch(() => {});
  process.exit(failures ? 1 : 0);
}
main().catch(async (e) => { console.error(e); process.exit(1); });
