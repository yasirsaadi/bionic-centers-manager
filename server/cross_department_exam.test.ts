// **فتحُ القسم الآخر من «سبب الحضور» — وفرعُ القسم الجديد** (§4.gv — قرارُ المالك ٢٠٢٦-١١-٢٢).
// `npm run test:cross-department-exam` — حيٌّ على النقاط الحقيقية، والفروعُ الستّة بأسمائها على الإنتاج (§4.gq):
//   «بغداد أطراف» (١) بلا علاجٍ طبيعيّ · كربلاء (٢) والموصل (٤) بلا علاجٍ طبيعيّ · ذي قار (٣) بالقسمين · كركوك (٥) مغلقٌ مؤقتاً ·
//   «مركز بغداد للعلاج الطبيعي» (٦) علاجٌ طبيعيّ وحده.
// أ. `POST /api/patients/:id/new-exam-request` بـ`openDepartment` — القسمُ والطلبُ والجهازُ في فرع القسم، والملفُّ يُتاح له، ويظهر في «معايناتي» هناك.
// ب. الحرّاس: القسمُ القائم · الاثنان · الأطرافُ ⟷ المساند · لا فرعَ في المدينة · مع `replacesRequestId`.
// ج. التسرّب (§4.gv د): «إضافة خدمة جديدة» (استشارة) و«إضافة نوع حالة» من فرعٍ لا يقدّم القسم — القسمُ في فرعه، والمالُ في فرع الحركة.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "cross-department-exam-test-secret";

import express from "express";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 7019;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-فتح-القسم-الآخر";
const U = { R1: 8961, R6: 8962, R3: 8963, R2: 8964, SARA: 8965, DOC1: 8966, SPEC1: 8967, ADM: 8968 };
const IDS = Object.values(U);
const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_notes = $1`, [MARK])).rows.map((r) => Number(r.id));
  for (const id of pts) await storage.deletePatient(id);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
}

async function main() {
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

  await cleanup();
  //  **الفروعُ كما على الإنتاج** (registerRoutes زرع الخمسة).
  const names: [number, string][] = [[1, "بغداد أطراف"], [2, "الوارث كربلاء"], [3, "بايونك ذي قار"], [4, "بايونك الموصل"],
    [5, "بايونك كركوك"], [6, "مركز بغداد للعلاج الطبيعي"]];
  for (const [id, name] of names) {
    await q(`INSERT INTO branches (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`, [id, name]);
  }
  await q(`UPDATE branches SET temporarily_closed = (id = 5) WHERE id BETWEEN 1 AND 6`);
  await q(`DELETE FROM physio_device_branches WHERE branch_id BETWEEN 1 AND 6`);
  await q(`INSERT INTO physio_device_branches (device_id, branch_id, available) SELECT d.id, b, true FROM devices d, unnest(ARRAY[3, 6]) b`);

  const users: [number, string, number, Record<string, unknown>][] = [
    [U.R1, "reception", 1, {}], [U.R6, "reception", 6, {}], [U.R3, "reception", 3, {}], [U.R2, "reception", 2, {}],
    [U.SARA, "physio_specialist", 6, {}], [U.SPEC1, "physio_specialist", 1, {}],
    [U.DOC1, "doctor", 1, { medical_specialties: '["prosthetic","medical_support"]' }],
    [U.ADM, "admin", 1, {}],
  ];
  for (const [id, role, b, extra] of users) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_add_patients)
             VALUES ($1, $2, 'x', $3, $4, $5, $6::jsonb, true, $7)`, [id, `cde-${id}`, `موظّف ${id}`, role, b, JSON.stringify([b]), role === "reception"]);
    for (const [k, v] of Object.entries(extra)) await q(`UPDATE system_users SET ${k} = $2::jsonb WHERE id = $1`, [id, v]);
  }
  const sess = (id: number, role: string, branch: number, perms: Record<string, unknown>) => hdr({
    userId: id, displayName: `موظّف ${id}`, role, roles: [role], branchId: branch, accessibleBranches: [branch], isAdmin: false,
    permissions: { canViewPatients: true, ...perms },
  });
  const recvPerms = { canAddPatients: true, canAddPayments: true, canEditPatients: true };
  const S = {
    r1: sess(U.R1, "reception", 1, recvPerms), r6: sess(U.R6, "reception", 6, recvPerms),
    r3: sess(U.R3, "reception", 3, recvPerms), r2: sess(U.R2, "reception", 2, recvPerms),
    sara: sess(U.SARA, "physio_specialist", 6, {}), spec1: sess(U.SPEC1, "physio_specialist", 1, {}),
    doc1: sess(U.DOC1, "doctor", 1, { canWriteMedicalExam: true }),
    //  المسؤولُ العامّ بلا فرعٍ مختار (§4.ay).
    adm0: hdr({ userId: U.ADM, displayName: "المسؤول", role: "admin", roles: ["admin"], branchId: 0, accessibleBranches: [], isAdmin: true,
      permissions: { canViewPatients: true, ...recvPerms } }),
  };
  const call = async (method: string, path: string, session: string, body?: unknown) => {
    const r = await fetch(`${BASE}${path}`, {
      method, headers: { "content-type": "application/json", "x-test-session": session },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json: any = null;
    try { json = await r.json(); } catch { /* */ }
    return { status: r.status, json };
  };

  let seq = 0;
  const AMP = "احادي - طرف سفلي - يمين - تحت الركبة";
  async function mkPatient(label: string, branch: number, kinds: { amp?: boolean; physio?: boolean; support?: boolean }) {
    seq += 1;
    const pid = Number((await q(`INSERT INTO patients (name, phone, referral_source, referral_sub_source, referral_notes, age, height, weight,
        medical_condition, amputation_site, branch_id, is_amputee, is_physiotherapy, is_medical_support, total_cost, patient_classification,
        governorate, address, injury_cause, injury_date, presenting_complaint, support_type, injury_side)
      VALUES ($1, $2, 'من شخص آخر', 'فيسبوك', $3, '40', '172', '78', 'x', $4, $5, $6, $7, $8, 0, 'new',
        'بغداد', 'الكرادة', 'حادث سير', '2021-03-04', $9, $10, 'يمين') RETURNING id`,
      [`${label} ${MARK}`, `0774${String(5000000 + seq * 7919).slice(0, 7)}`, MARK, kinds.amp ? AMP : null, branch,
        !!kinds.amp, !!kinds.physio, !!kinds.support, kinds.physio ? "ألم أسفل الظهر" : null, kinds.support ? "مسند ركبة" : null])).rows[0].id);
    await q(`UPDATE patients SET phone_e164 = '+964' || substr(phone, 2) WHERE id = $1`, [pid]);
    await storage.syncPatientCases(pid);
    return pid;
  }
  const nexr = (pid: number, s: string, body: Record<string, unknown>) => call("POST", `/api/patients/${pid}/new-exam-request`, s, body);
  const caseOf = async (pid: number, t: string) => (await q(`SELECT id, branch_id AS b, status FROM patient_cases WHERE patient_id = $1 AND case_type = $2`, [pid, t])).rows[0] ?? null;
  const accessOf = async (pid: number) => (await q(`SELECT branch_id AS b, granted_by_name AS by, note FROM patient_branch_access WHERE patient_id = $1 ORDER BY branch_id`, [pid])).rows;
  const pat = async (pid: number) => (await q(`SELECT branch_id AS b, is_amputee AS a, is_physiotherapy AS p, is_medical_support AS m FROM patients WHERE id = $1`, [pid])).rows[0];
  const worklistRow = async (s: string, pid: number, caseType: string) =>
    ((await call("GET", "/api/medical/worklist", s)).json?.rows ?? []).find((r: any) => r.patientId === pid && r.caseType === caseType) ?? null;
  const reqsOf = async (pid: number, t: string) => (await q(`SELECT id, branch_id AS b, status, device_episode_id AS ep FROM medical_review_requests
      WHERE patient_id = $1 AND service_type = $2 ORDER BY id`, [pid, t])).rows;
  const n = async (t: string, p: any[]) => Number((await q(t, p)).rows[0].n);

  try {
    // ══ أ. مريضُ أطراف «بغداد أطراف» ⟵ «معاينة علاج طبيعي» من جلسة الفرع ١ ══
    console.log("\n── أ. الأطرافُ ⟵ العلاج الطبيعيّ في المركز ──");
    const A = await mkPatient("علي", 1, { amp: true });
    const vis0 = await n(`SELECT COUNT(*)::int n FROM visits WHERE patient_id = $1`, [A]);
    const a1 = await nexr(A, S.r1, { department: "physiotherapy", openDepartment: true, fields: { presentingComplaint: "ألم في الركبة" } });
    same("أ.١ **يُرسَل إلى المركز**: ٢٠١ وفرعُ القسم ٦ باسمه، والملفُّ أُتيح له",
      [a1.status, a1.json?.targetBranchId, a1.json?.targetBranchName, a1.json?.accessGranted], [201, 6, "مركز بغداد للعلاج الطبيعي", true]);
    const ac = await caseOf(A, "physiotherapy");
    const ar = await reqsOf(A, "physiotherapy");
    same("أ.٢ **القسمُ والطلبُ في الفرع ٦** — والعلمُ رُفع، وفرعُ تسجيل المريض ١ كما هو، ولا زيارةَ للعلاج الطبيعيّ",
      [ac?.b, ac?.status, ar.map((r: any) => [r.b, r.status]), await pat(A), await n(`SELECT COUNT(*)::int n FROM visits WHERE patient_id = $1`, [A]) - vis0],
      [6, "active", [[6, "pending"]], { b: 1, a: true, p: true, m: false }, 0]);
    const acc = await accessOf(A);
    same("أ.٣ **صفُّ الإتاحة للمركز** باسم الفاعل وسببه، وسطرُ تدقيقه",
      [acc.map((r: any) => r.b), acc[0]?.by, /سبب الحضور/.test(acc[0]?.note ?? ""),
        await n(`SELECT COUNT(*)::int n FROM audit_log WHERE entity_type = 'patient_branch_access' AND entity_id = $1 AND user_id = $2 AND branch_id = 6`, [A, U.R1])],
      [[6], `موظّف ${U.R1}`, true, 1]);
    const wlSara = await worklistRow(S.sara, A, "physiotherapy");
    const wlSpec1 = await worklistRow(S.spec1, A, "physiotherapy");
    same("أ.٤ **ويظهر في «معايناتي» لسارة** (أخصائيّةُ الفرع ٦) لا لأخصائيّ الفرع ١",
      [Boolean(wlSara), Boolean(wlSpec1)], [true, false]);
    const file6 = await call("GET", `/api/patients/${A}`, S.r6);
    same("أ.٥ **وموظّفو المركز يفتحون الملفّ** الآن", file6.status, 200);
    const a6 = await nexr(A, S.r1, { department: "physiotherapy", openDepartment: true, fields: { presentingComplaint: "ألم في الركبة" } });
    same("أ.٦ **ومرّةً ثانية ⟵ ٤٠٩** القسمُ له أصلاً، ولا طلبَ ثانٍ", [a6.status, a6.json?.code, (await reqsOf(A, "physiotherapy")).length],
      [409, "department_already_open", 1]);

    // ══ ب. مريضُ العلاج الطبيعيّ في المركز ⟵ «معاينة أطراف صناعية» من جلسة الفرع ٦ ══
    console.log("\n── ب. العلاجُ الطبيعيّ ⟵ الأطراف في بغداد أطراف ──");
    const B = await mkPatient("فاطمة", 6, { physio: true });
    const b1 = await nexr(B, S.r6, { department: "prosthetic", openDepartment: true, requestedItems: ["full_device"], fields: { amputationSite: AMP } });
    same("ب.١ **يُرسَل إلى «بغداد أطراف»** والملفُّ أُتيح لها", [b1.status, b1.json?.targetBranchId, b1.json?.accessGranted], [201, 1, true]);
    const bc = await caseOf(B, "prosthetic");
    const be = (await q(`SELECT branch_id AS b, status FROM patient_device_episodes WHERE id = $1`, [Number(b1.json?.episodeId)])).rows[0];
    const br = await reqsOf(B, "prosthetic");
    const bv = (await q(`SELECT branch_id AS b FROM visits WHERE patient_id = $1 AND details = 'طلب معاينة طبية'`, [B])).rows.map((r: any) => r.b);
    same("ب.٢ **القسمُ والجهازُ والطلبُ في الفرع ١** — وزيارةُ «طلب معاينة طبية» حيث حضر اليوم (٦)، والعلمُ رُفع، والتسجيلُ ٦",
      [bc?.b, be?.b, be?.status, br.map((r: any) => r.b), bv, await pat(B)],
      [1, 1, "awaiting_exam", [1], [6], { b: 6, a: true, p: true, m: false }]);
    const wlDoc = await worklistRow(S.doc1, B, "prosthetic");
    same("ب.٣ **ويظهر لطبيب «بغداد أطراف»** بجهازه", [Boolean(wlDoc), wlDoc?.episodeId === Number(b1.json?.episodeId)], [true, true]);
    same("ب.٤ **وموظّفو الفرع ١ يفتحون الملفّ**", (await call("GET", `/api/patients/${B}`, S.r1)).status, 200);

    // ══ ج. ذي قار — القسمان محلّيّان ══
    console.log("\n── ج. ذي قار وكربلاء ──");
    const C = await mkPatient("حسن", 3, { amp: true });
    const c1 = await nexr(C, S.r3, { department: "physiotherapy", openDepartment: true, fields: { presentingComplaint: "ألم في الظهر" } });
    same("ج.١ **ذي قار تقدّم العلاجَ الطبيعيّ** — القسمُ والطلبُ فيها، ولا إتاحة",
      [c1.status, c1.json?.targetBranchId, c1.json?.accessGranted, (await caseOf(C, "physiotherapy"))?.b, (await reqsOf(C, "physiotherapy")).map((r: any) => r.b), (await accessOf(C)).length],
      [201, 3, false, 3, [3], 0]);
    const K = await mkPatient("كرار", 2, { amp: true });
    const k1 = await nexr(K, S.r2, { department: "physiotherapy", openDepartment: true, fields: { presentingComplaint: "ألم" } });
    same("ج.٢ **كربلاء بلا علاجٍ طبيعيّ ⟵ ٤٠٠** ولا شيءَ يُكتب (لا قسم ولا علم ولا طلب)",
      [k1.status, k1.json?.code, await caseOf(K, "physiotherapy"), (await pat(K)).p, (await reqsOf(K, "physiotherapy")).length],
      [400, "no_department_home", null, false, 0]);

    // ══ د. الحرّاس ══
    console.log("\n── د. الحرّاس ──");
    const D = await mkPatient("مريم", 3, { amp: true, physio: true });
    const d1 = await nexr(D, S.r3, { department: "physiotherapy", openDepartment: true, fields: {} });
    const d2 = await nexr(D, S.r3, { department: "medical_support", openDepartment: true, requestedItems: ["full_device"], fields: {} });
    same("د.١ **للمريض القسمان ⟵ ٤٠٩** لكلّ طلبٍ ولا قسمَ مساند", [d1.status, d1.json?.code, d2.status, d2.json?.code, await caseOf(D, "medical_support")],
      [409, "department_already_open", 409, "cross_department_has_both", null]);
    const E = await mkPatient("سجاد", 1, { amp: true });
    const e1 = await nexr(E, S.r1, { department: "medical_support", openDepartment: true, requestedItems: ["full_device"], fields: {} });
    same("د.٢ **ولا أطرافٌ ⟵ مساند من هنا** (٤٠٠)", [e1.status, e1.json?.code, await caseOf(E, "medical_support")], [400, "cross_department_not_allowed", null]);
    const e2 = await nexr(E, S.r1, { department: "physiotherapy", openDepartment: true, replacesRequestId: 5, fields: { presentingComplaint: "ألم" } });
    same("د.٣ **ولا يجتمع الفتحُ والتحويل** (٤٠٠)", [e2.status, e2.json?.code], [400, "open_with_replaces"]);
    const e3 = await nexr(E, S.r1, { department: "physiotherapy", fields: { presentingComplaint: "ألم" } });
    same("د.٤ **وبلا علم الفتح يبقى الحارسُ القديم**: الفرعُ ١ بلا علاجٍ طبيعيّ ⟵ ٤٠٠", [e3.status, await caseOf(E, "physiotherapy")], [400, null]);

    // ══ هـ. التسرّب (§4.gv د): «إضافة خدمة جديدة» من فرعٍ لا يقدّم القسم ══
    console.log("\n── هـ. «إضافة خدمة جديدة» ──");
    const F = await mkPatient("زهراء", 1, { amp: true });
    const f1 = await call("POST", `/api/patients/${F}/new-service`, S.r1, {
      serviceType: "consultation", serviceCost: 20000, initialPayment: 20000, notes: "", submissionToken: randomUUID(),
    });
    const fc = await caseOf(F, "physiotherapy");
    const fpay = (await q(`SELECT branch_id AS b FROM payments WHERE patient_id = $1`, [F])).rows.map((r: any) => r.b);
    same("هـ.١ **استشارةٌ من «بغداد أطراف» ⟵ قسمُ العلاج الطبيعيّ في المركز**، والملفُّ أُتيح له — **والمالُ في الفرع ١** كما كان",
      [f1.status < 300, fc?.b, (await accessOf(F)).map((r: any) => r.b), fpay], [true, 6, [6], [1]]);
    same("هـ.٢ **ويظهر لسارة** (القاعدةُ ③ — قسمٌ بلا معاينة)", Boolean(await worklistRow(S.sara, F, "physiotherapy")), true);
    const G = await mkPatient("نور", 3, { amp: true });
    await call("POST", `/api/patients/${G}/new-service`, S.r3, {
      serviceType: "consultation", serviceCost: 20000, initialPayment: 20000, notes: "", submissionToken: randomUUID(),
    });
    same("هـ.٣ **وفي ذي قار يبقى محلّيّاً** بلا إتاحة", [(await caseOf(G, "physiotherapy"))?.b, (await accessOf(G)).length], [3, 0]);
    const H = await mkPatient("ياسين", 6, { physio: true });
    const h1 = await call("POST", `/api/patients/${H}/add-case-type`, S.r6, { caseType: "amputee", amputationSite: AMP });
    const hc = await caseOf(H, "prosthetic");
    const hr = await reqsOf(H, "prosthetic");
    const hv = (await q(`SELECT branch_id AS b FROM visits WHERE patient_id = $1 AND details = 'إضافة نوع حالة'`, [H])).rows.map((r: any) => r.b);
    same("هـ.٤ **«أطراف صناعية» من المركز ⟵ القسمُ وطلبُه في «بغداد أطراف»**، والملفُّ أُتيح لها، والعلامةُ حيث فُعلت (٦)",
      [h1.status, hc?.b, hr.map((r: any) => r.b), (await accessOf(H)).map((r: any) => r.b), hv], [200, 1, [1], [1], [6]]);
    const I = await mkPatient("رقية", 1, { amp: true });
    const i1 = await call("POST", `/api/patients/${I}/add-case-type`, S.r1, { caseType: "physiotherapy" });
    same("هـ.٥ **و«علاج طبيعي» من «بغداد أطراف» ⟵ قسمُه في المركز** ويظهر لسارة",
      [i1.status, (await caseOf(I, "physiotherapy"))?.b, (await accessOf(I)).map((r: any) => r.b), Boolean(await worklistRow(S.sara, I, "physiotherapy"))],
      [200, 6, [6], true]);
    const J = await mkPatient("كوثر", 2, { amp: true });
    await call("POST", `/api/patients/${J}/new-service`, S.r2, {
      serviceType: "consultation", serviceCost: 20000, initialPayment: 20000, notes: "", submissionToken: randomUUID(),
    });
    same("هـ.٦ **وفي كربلاء — لا فرعَ في المدينة ⟵ كما كان** (القسمُ في فرع الحركة، لا منع)", [(await caseOf(J, "physiotherapy"))?.b, (await accessOf(J)).length], [2, 0]);
    //  القسمُ القائم لا يتحرّك: «جلسات إضافية» على قسمٍ في الفرع ١ تبقيه حيث هو.
    const L = await mkPatient("عباس", 1, { amp: true, physio: true });
    const lBefore = (await caseOf(L, "physiotherapy"))?.b;
    await call("POST", `/api/patients/${L}/new-service`, S.r1, {
      serviceType: "consultation", serviceCost: 15000, initialPayment: 15000, notes: "", submissionToken: randomUUID(),
    });
    same("هـ.٧ **والقسمُ القائم لا يتحرّك** (فرعُه ١ قبل وبعد، ولا إتاحة)", [lBefore, (await caseOf(L, "physiotherapy"))?.b, (await accessOf(L)).length], [1, 1, 0]);

    // ══ و. مراجعةُ الحرّاس: السباقُ بعد القفل، والقسمُ المغلق، والمسؤولُ بلا فرع ══
    console.log("\n── و. السباقُ والقسمُ المغلق والمسؤول ──");
    const PR = await mkPatient("حسنين", 6, { physio: true });
    const [p1, p2] = await Promise.all([
      nexr(PR, S.r6, { department: "prosthetic", openDepartment: true, requestedItems: ["full_device"], fields: { amputationSite: AMP } }),
      nexr(PR, S.r6, { department: "prosthetic", openDepartment: true, requestedItems: ["full_device"], fields: { amputationSite: AMP } }),
    ]);
    same("و.١ **نقرتان معاً ⟵ فتحٌ واحد**: ٢٠١ و٤٠٩، وجهازٌ واحد وطلبٌ واحد",
      [[p1.status, p2.status].sort(), [p1.json?.code, p2.json?.code].filter(Boolean),
        await n(`SELECT COUNT(*)::int n FROM patient_device_episodes WHERE patient_id = $1`, [PR]), (await reqsOf(PR, "prosthetic")).length],
      [[201, 409], ["department_already_open"], 1, 1]);
    const PS = await mkPatient("منتظر", 6, { physio: true });
    const [s1, s2] = await Promise.all([
      nexr(PS, S.r6, { department: "prosthetic", openDepartment: true, requestedItems: ["full_device"], fields: { amputationSite: AMP } }),
      nexr(PS, S.r6, { department: "medical_support", openDepartment: true, requestedItems: ["full_device"], fields: { supportType: "مسند ركبة" } }),
    ]);
    const psFlags = await pat(PS);
    same("و.٢ **والقسمان الجهازيّان معاً ⟵ واحدٌ وحده** (الثاني «للمريض الاثنان»)",
      [[s1.status, s2.status].sort(), [s1.json?.code, s2.json?.code].filter(Boolean), Number(psFlags.a) + Number(psFlags.m)],
      [[201, 409], ["cross_department_has_both"], 1]);
    const PP = await mkPatient("أحمد", 1, { amp: true });
    const [t1, t2] = await Promise.all([
      nexr(PP, S.r1, { department: "physiotherapy", openDepartment: true, fields: { presentingComplaint: "ألم الركبة" } }),
      nexr(PP, S.r1, { department: "physiotherapy", openDepartment: true, fields: { presentingComplaint: "ألم الركبة" } }),
    ]);
    same("و.٣ **والعلاجُ الطبيعيّ مرّتين معاً ⟵ ٤٠٩ لا ٥٠٠**، وطلبٌ واحد", [[t1.status, t2.status].sort(), (await reqsOf(PP, "physiotherapy")).length],
      [[201, 409], 1]);
    const CL = await mkPatient("فاطمة", 1, { amp: true, physio: true });
    await q(`UPDATE patient_cases SET status = 'closed' WHERE patient_id = $1 AND case_type = 'physiotherapy'`, [CL]);
    await q(`UPDATE patients SET is_physiotherapy = false WHERE id = $1`, [CL]);
    const cl1 = await nexr(CL, S.r1, { department: "physiotherapy", openDepartment: true, fields: { presentingComplaint: "ألم" } });
    same("و.٤ **قسمٌ مغلق في فرعٍ لا يقدّمه ⟵ ٤٠٩** ولا يُفتح ولا طلبَ ولا إتاحة",
      [cl1.status, cl1.json?.code, (await caseOf(CL, "physiotherapy"))?.status, (await reqsOf(CL, "physiotherapy")).length, (await accessOf(CL)).length],
      [409, "department_closed_elsewhere", "closed", 0, 0]);
    //  قسمٌ مغلق قديم في ذي قار لمريضٍ من «بغداد أطراف» — فرعُ المدينة (المركز) غيرُ فرع القسم، فالقسمُ يُعاد في ذي قار **والطلبُ معه**.
    const CO = await mkPatient("زينب", 1, { amp: true, physio: true });
    await q(`UPDATE patient_cases SET status = 'closed', branch_id = 3 WHERE patient_id = $1 AND case_type = 'physiotherapy'`, [CO]);
    await q(`UPDATE patients SET is_physiotherapy = false WHERE id = $1`, [CO]);
    const co1 = await nexr(CO, S.r1, { department: "physiotherapy", openDepartment: true, fields: { presentingComplaint: "ألم" } });
    const coCase = await caseOf(CO, "physiotherapy");
    same("و.٥ **وفي فرعٍ يقدّمه ⟵ يُعاد في فرعه والطلبُ معه** (قسمٌ وطلبٌ وإتاحةٌ في فرعٍ واحد، لا المركز)",
      [co1.status, coCase?.status, coCase?.b, (await reqsOf(CO, "physiotherapy")).map((r: any) => r.b), co1.json?.targetBranchId,
        (await accessOf(CO)).map((r: any) => r.b)],
      [201, "active", 3, [3], 3, [3]]);
    const AD = await mkPatient("كرار", 1, { amp: true });
    await q(`INSERT INTO patient_branch_access (patient_id, branch_id, granted_by_name, note) VALUES ($1, 3, 'اختبار', 'اختبار')`, [AD]);
    const ad1 = await nexr(AD, S.adm0, { department: "physiotherapy", openDepartment: true, fields: { presentingComplaint: "ألم" } });
    same("و.٦ **المسؤولُ بلا فرعٍ لمريضٍ بفرعين ⟵ ٤٠٩** ولا قسمَ ولا طلبَ ولا إتاحةٌ جديدة",
      [ad1.status, await caseOf(AD, "physiotherapy"), (await reqsOf(AD, "physiotherapy")).length, (await accessOf(AD)).map((r: any) => r.b)],
      [409, null, 0, [3]]);
    same("و.٧ **و«إضافة نوع حالة» تقول فرعَ القسم من الخادم**", [h1.json?.caseBranchMoved, h1.json?.caseBranchName], [true, "بغداد أطراف"]);
  } finally {
    await cleanup();
    httpServer.close();
    await pool.end();
  }
  console.log(failures === 0 ? "\n✅ all cross-department-exam cases pass" : `\n❌ ${failures} case(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
