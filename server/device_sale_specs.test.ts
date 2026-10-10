// «لا يُقبَل اشترى قبل أن تمتلئ خاناتُ الجهاز» (ترحيل ١١٥، §4.cq — المرحلةُ الثانية أ، ٢٠٢٦-١٠-٠٨).
// `npm run test:device-sale-specs` — على النقاط الحقيقية: معاينةٌ ⟵ ملفُّ المتابعة ⟵ «إتمام البيع».
//
// يحرس قرارَي المالك: (١) خاناتُ الجهاز (للأطراف: الطرف والسوكيت والركبة والقدم والسيليكون، وللمساند: نوعُ المسند) يملؤها الطبيبُ
// أو الاستعلاماتُ بعده، **ولا «اشترى» قبل أن تمتلئ** — والرفضُ لا يترك أثراً؛ (٢) «لا ينطبق» تملأ ما لا يخصّ الجهاز. ومعهما:
// كلمةُ الطبيب تغلب ما يُكتب في نافذة البيع، ونوعُ السوكيت يصل أمرَ التصنيع وبطاقةَ القسم، ومعاينةٌ مكتملةٌ لا تطلب شيئاً.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "device-sale-specs-test-secret";

import express from "express";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { deviceSpecsFromPrescription, orderDeviceSpecs, caseDeviceSpecs } from "./medical/episode_prescription";
import {
  cleanSaleSpecsInput, mergeDeviceSpecs, missingSaleSpecs, saleSpecFields, saleSpecsMessage, NOT_APPLICABLE,
} from "@shared/device_specs";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6992;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-مواصفات-البيع";
const B1 = 9821;
const ADMIN = 9831, RECV = 9832, DOC = 9833, EXPERT = 9834;
const IDS = [ADMIN, RECV, DOC, EXPERT];

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_source = $1`, [MARK])).rows.map((r) => Number(r.id));
  for (const id of pts) await storage.deletePatient(id);
  await q(`DELETE FROM journal_lines WHERE entry_id IN (SELECT id FROM journal_entries WHERE created_by = ANY($1::int[]))`, [IDS]);
  await q(`DELETE FROM journal_entries WHERE created_by = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

async function main() {
  // ══ القواعد ══
  console.log("\n── القواعد ──");
  same("ق.١ الخاناتُ الإلزامية بترتيب الورقة — وللمساند نوعُ المسند",
    [saleSpecFields("prosthetic").map((f) => f.label), saleSpecFields("medical_support").map((f) => f.label)],
    [["نوع الطرف الصناعي", "نوع السوكيت", "نوع مفصل الركبة", "نوع القدم", "نوع السليكون"], ["نوع المسند"]]);
  same("ق.٢ **كلمةُ الطبيب تغلب**، وما حُفظ يسدّ فراغَها وحده",
    mergeDeviceSpecs({ footType: "كربون" }, { footType: "مرنة", socketType: "سليكون", x: " " }), { footType: "كربون", socketType: "سليكون" });
  same("ق.٣ ما ينقص — و«لا ينطبق» تملأ", missingSaleSpecs("prosthetic", { prostheticType: "سفلي", kneeJointType: NOT_APPLICABLE }),
    ["socketType", "footType", "siliconType"]);
  same("ق.٤ نافذةُ البيع لا تكتب إلّا الخاناتِ الإلزامية — مقصوصةً",
    cleanSaleSpecsInput({ socketType: "  سليكون ", footSize: "42", supportType: "مشد", kneeJointType: "" }, "prosthetic"), { socketType: "سليكون" });
  same("ق.٥ ونوعُ السوكيت يُقرأ من الوصفة", deviceSpecsFromPrescription("prosthetic", { socketType: "سليكون", prostheticType: "سفلي" }),
    { prostheticType: "سفلي", socketType: "سليكون" });
  check(saleSpecsMessage("prosthetic", ["socketType", "siliconType"]).includes("نوع السوكيت، نوع السليكون")
    && saleSpecsMessage("prosthetic", ["socketType"]).includes(NOT_APPLICABLE), "ق.٦ والرسالةُ تسمّي ما ينقص وتذكّر بـ«لا ينطبق»");

  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع مواصفات البيع')`, [B1]);
  for (const [id, role] of [[ADMIN, "admin"], [RECV, "reception"], [DOC, "doctor"], [EXPERT, "prosthetics_expert"]] as const) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active)
             VALUES ($1, $2, 'x', $3, $4, $5, $6::jsonb, true)`, [id, `dss-${id}`, `مستخدم ${id}`, role, role === "admin" ? null : B1, JSON.stringify(role === "admin" ? [] : [B1])]);
  }
  await q(`UPDATE system_users SET medical_specialties = '["prosthetic","medical_support"]'::jsonb WHERE id = $1`, [DOC]);
  await q(`UPDATE system_users SET can_add_patients = true, can_add_payments = true, can_view_payments = true WHERE id = ANY($1::int[])`, [[ADMIN, RECV]]);
  const PAY = { canViewPatients: true, canAddPatients: true, canAddPayments: true, canViewPayments: true };
  const S = {
    recv: hdr({ userId: RECV, displayName: "استقبال", role: "reception", branchId: B1, accessibleBranches: [B1], isAdmin: false, permissions: PAY }),
    doc: hdr({ userId: DOC, displayName: "الطبيب", role: "doctor", branchId: B1, accessibleBranches: [B1], isAdmin: false,
      permissions: { canViewPatients: true, canAddPatients: true, canWriteMedicalExam: true } }),
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

  /** مريضٌ بطلب معاينة ومعاينةٍ موقّعة بوصفةٍ معطاة — ويعيد معرّفَ المتابعة والحلقة. */
  async function examined(label: string, kind: "prosthetic" | "medical_support", prescription: Record<string, unknown>) {
    const pid = (await q(`INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, amputation_site, support_type,
        branch_id, is_amputee, is_medical_support, total_cost, patient_classification)
      VALUES ($1, $2, $3, '40', '172', '78', $4, $5, $6, $7, $8, $9, 0, 'new') RETURNING id`,
      [`${label} ${MARK}`, `0770${Math.floor(1000000 + Math.random() * 8999999)}`, MARK, kind === "prosthetic" ? "amputee" : "medical_support",
        kind === "prosthetic" ? "احادي - طرف سفلي - يمين - تحت الركبة" : null, kind === "medical_support" ? "مشد" : null, B1,
        kind === "prosthetic", kind === "medical_support"])).rows[0].id;
    await storage.syncPatientCases(pid);
    const ep = await call("POST", `/api/patients/${pid}/device-episodes`, S.recv, { serviceType: kind, requestedItem: "full_device", servicePath: "exam" });
    const ex = await call("POST", `/api/medical/patients/${pid}/exams`, S.doc, {
      idempotencyKey: randomUUID(), caseType: kind, diagnosis: "تشخيص", plan: "خطّة", prescription,
    });
    const fid = (await q(`SELECT id FROM post_exam_followups WHERE patient_id = $1 ORDER BY id DESC LIMIT 1`, [pid])).rows[0]?.id;
    return { pid, epId: Number(ep.json?.id), fid: Number(fid), epStatus: ep.status, exStatus: ex.status };
  }
  const sale = (fid: number, deviceSpecs?: Record<string, string>) =>
    call("POST", `/api/followups/${fid}/complete-sale`, S.recv, { originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT, deviceSpecs });
  const sorted = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o ?? {}).sort(([a], [b]) => a.localeCompare(b)));
  const stateOf = async (fid: number, epId: number) => (await q(`SELECT f.status, e.device_specs,
      (SELECT count(*)::int FROM prosthetic_work_orders w WHERE w.device_episode_id = e.id) AS orders
      FROM post_exam_followups f JOIN patient_device_episodes e ON e.id = f.device_episode_id WHERE f.id = $1 AND e.id = $2`, [fid, epId])).rows[0];

  try {
    console.log("\n── أ. طرفٌ وصفته ناقصة ──");
    const a = await examined("ناقصة", "prosthetic", { prostheticType: "طرف سفلي ذكي", footType: "قدم كربون" });
    same("أ.٠ (الإعداد) طلبٌ ومعاينةٌ ومتابعة", [a.epStatus, a.exStatus < 300, a.fid > 0], [201, true, true]);
    const list = (await call("GET", `/api/followups/patient/${a.pid}`, S.recv)).json;
    const specs = list.find((f: any) => f.id === a.fid)?.deviceSpecs;
    same("أ.١ ملفُّ المتابعة يقول ما كتبه الطبيب وما ينقص",
      [specs?.fields.map((f: any) => [f.key, f.value, f.fromDoctor]), specs?.missing],
      [[["prostheticType", "طرف سفلي ذكي", true], ["socketType", null, false], ["kneeJointType", null, false], ["footType", "قدم كربون", true],
        ["siliconType", null, false]], ["socketType", "kneeJointType", "siliconType"]]);
    const r1 = await sale(a.fid);
    same("أ.٢ **«اشترى» بلا الخانات ⟵ ٤٠٠ تسمّيها، ولا أمرَ ولا تحويل**",
      [r1.status, /نوع السوكيت، نوع مفصل الركبة، نوع السليكون/.test(r1.json?.error ?? ""), await stateOf(a.fid, a.epId)],
      [400, true, { status: "awaiting_patient_decision", device_specs: {}, orders: 0 }]);
    const r2 = await sale(a.fid, { socketType: "سوكيت سليكون", kneeJointType: NOT_APPLICABLE, siliconType: "" });
    same("أ.٣ وخانةٌ واحدة باقية ⟵ ٤٠٠ — **وما كُتب لا يُحفظ** (المعاملةُ تسقط كلُّها)",
      [r2.status, /نوع السليكون/.test(r2.json?.error ?? ""), (await stateOf(a.fid, a.epId)).device_specs], [400, true, {}]);
    const r3 = await sale(a.fid, { socketType: "سوكيت سليكون", kneeJointType: NOT_APPLICABLE, siliconType: "سليكون طبي", footType: "قدم خشبية" });
    const st4 = await stateOf(a.fid, a.epId);
    same("أ.٤ **ومكتملةً بـ«لا ينطبق» ⟵ ٢٠٠** وتحويلٌ وأمرُ تصنيع، وما كُتب محفوظٌ على الحلقة — **إلّا قدماً كتبها الطبيب** فلا نسخةَ ثانية لها",
      [r3.status, st4.status, sorted(st4.device_specs), st4.orders],
      [200, "converted", sorted({ socketType: "سوكيت سليكون", kneeJointType: NOT_APPLICABLE, siliconType: "سليكون طبي" }), 1]);
    const ord = await orderDeviceSpecs(a.epId, "prosthetic");
    same("أ.٥ **أمرُ التصنيع: كلمةُ الطبيب تغلب** (قدم كربون لا خشبية) والسوكيتُ و«لا ينطبق» ظاهران",
      ord.source === "exam" ? [ord.specs.footType, ord.specs.socketType, ord.specs.kneeJointType, ord.specs.siliconType] : ord,
      ["قدم كربون", "سوكيت سليكون", NOT_APPLICABLE, "سليكون طبي"]);
    const caseId = Number((await q(`SELECT case_id FROM patient_device_episodes WHERE id = $1`, [a.epId])).rows[0].case_id);
    const cs = (await caseDeviceSpecs([caseId])).get(caseId)?.[0]?.specs;
    same("أ.٦ وبطاقةُ القسم تقرأ الشيءَ نفسَه", [cs?.footType, cs?.socketType], ["قدم كربون", "سوكيت سليكون"]);

    console.log("\n── ب. وصفةٌ مكتملة ──");
    const b = await examined("مكتملة", "prosthetic", {
      prostheticType: "طرف سفلي", socketType: "سوكيت كربون", kneeJointType: NOT_APPLICABLE, footType: "قدم مرنة", siliconType: "سليكون",
    });
    const bl = (await call("GET", `/api/followups/patient/${b.pid}`, S.recv)).json.find((f: any) => f.id === b.fid)?.deviceSpecs;
    const rb = await sale(b.fid);
    same("ب.١ **الطبيبُ ملأها كلَّها ⟵ لا شيءَ يُطلب** و«اشترى» يمرّ بلا خانات", [bl?.missing, rb.status, (await stateOf(b.fid, b.epId)).device_specs], [[], 200, {}]);

    console.log("\n── ج. مسند ──");
    const c = await examined("مسند", "medical_support", { injurySide: "يمين" });
    const rc1 = await sale(c.fid);
    same("ج.١ مسندٌ بلا نوعه ⟵ ٤٠٠ يسمّيه", [rc1.status, /نوع المسند/.test(rc1.json?.error ?? "")], [400, true]);
    const rc2 = await sale(c.fid, { supportType: "مشدّ ظهر", socketType: "لا شيء" });
    same("ج.٢ وبنوعه ⟵ يتجاوز الحارس (وخانةُ الأطراف لا تُكتب على مسند)",
      [rc2.status === 400 ? (rc2.json?.error ?? "") : "تجاوز", (await q(`SELECT device_specs FROM patient_device_episodes WHERE id = $1`, [c.epId])).rows[0].device_specs],
      ["تجاوز", rc2.status === 200 ? { supportType: "مشدّ ظهر" } : {}]);

    //  ══ **بحسب البتر** (ملاحظاتُ المالك ٢٠٢٦-١٠-١٠، §4.de) — على النقاط الحقيقية ══
    console.log("\n── د. تحت الركبة: لا ركبةَ تُطلب ──");
    const BK = { amputationType: "single", singleLimb: "lower", singleSide: "right", singleDetail: "تحت الركبة" };
    const d = await examined("تحت الركبة", "prosthetic", { ...BK, prostheticType: "طرف تحت الركبة", footType: "قدم كربون" });
    const dl = (await call("GET", `/api/followups/patient/${d.pid}`, S.recv)).json.find((f: any) => f.id === d.fid)?.deviceSpecs;
    same("د.١ **ملفُّ المتابعة بلا ركبة** — وما ينقص السوكيتُ والسيليكونُ وحدهما",
      [dl?.fields.map((f: any) => f.key), dl?.missing], [["prostheticType", "socketType", "footType", "siliconType"], ["socketType", "siliconType"]]);
    const rd = await sale(d.fid, { socketType: "سوكيت سليكون", siliconType: "سليكون طبي" });
    same("د.٢ **و«اشترى» يمرّ بلا ركبة** — ولا تُحفظ ركبةٌ على الحلقة", [rd.status, sorted((await stateOf(d.fid, d.epId)).device_specs)],
      [200, sorted({ socketType: "سوكيت سليكون", siliconType: "سليكون طبي" })]);
    const dSheet = (await call("GET", `/api/patients/${d.pid}/intake-sheets`, S.recv)).json?.sheets?.find((x: any) => x.episodeId === d.epId);
    same("د.٣ والاستمارةُ تقول البترَ نفسَه (فأسطرُها بلا ركبة)", dSheet?.specs?.amputationSite, "احادي - طرف سفلي - يمين - تحت الركبة");

    console.log("\n── هـ. مبتورُ الطرفين بمواصفاتٍ مختلفة ──");
    const DBL = { amputationType: "double", doubleLimbType: "lower", doubleRightDetail: "تحت الركبة", doubleLeftDetail: "فوق الركبة", limbsIdentical: false };
    const e = await examined("طرفان مختلفان", "prosthetic", {
      ...DBL, "prostheticType:right": "طرف تحت الركبة", "prostheticType:left": "طرف فوق الركبة", "kneeJointType:left": "ركبة هيدروليك",
      "footType:right": "قدم كربون", "footType:left": "قدم مرنة",
    });
    const el = (await call("GET", `/api/followups/patient/${e.pid}`, S.recv)).json.find((f: any) => f.id === e.fid)?.deviceSpecs;
    same("هـ.١ **ملفُّ المتابعة: خاناتُ كلّ جهة، والركبةُ لليسار وحده** — وما كتبه الطبيبُ لجهته",
      [el?.fields.map((f: any) => [f.key, f.fromDoctor]), el?.missing],
      [[["prostheticType:right", true], ["socketType:right", false], ["footType:right", true], ["siliconType:right", false],
        ["prostheticType:left", true], ["socketType:left", false], ["kneeJointType:left", true], ["footType:left", true], ["siliconType:left", false]],
        ["socketType:right", "siliconType:right", "socketType:left", "siliconType:left"]]);
    const re1 = await sale(e.fid, { "socketType:right": "سوكيت كربون", "siliconType:right": "سليكون", "socketType:left": "سوكيت سليكون" });
    same("هـ.٢ **جهةٌ ناقصة ⟵ ٤٠٠ تسمّيها بجهتها**، ولا أمرَ ولا حفظ",
      [re1.status, /نوع السليكون — يسار/.test(re1.json?.error ?? ""), await stateOf(e.fid, e.epId)],
      [400, true, { status: "awaiting_patient_decision", device_specs: {}, orders: 0 }]);
    const re2 = await sale(e.fid, { "socketType:right": "سوكيت كربون", "siliconType:right": "سليكون", "socketType:left": "سوكيت سليكون",
      "siliconType:left": NOT_APPLICABLE, "footType:left": "قدم خشبية" });
    const st5 = await stateOf(e.fid, e.epId);
    same("هـ.٣ **ومكتملةً ⟵ ٢٠٠** وأمرٌ، وما كُتب محفوظٌ بجهاته — **إلّا قدمَ اليسار التي كتبها الطبيب**",
      [re2.status, st5.status, sorted(st5.device_specs), st5.orders],
      [200, "converted", sorted({ "socketType:right": "سوكيت كربون", "siliconType:right": "سليكون", "socketType:left": "سوكيت سليكون", "siliconType:left": NOT_APPLICABLE }), 1]);
    const eo = await orderDeviceSpecs(e.epId, "prosthetic");
    same("هـ.٤ **أمرُ التصنيع يحمل الجهتين** — والطبيبُ يغلب",
      eo.source === "exam" ? [eo.specs["footType:left"], eo.specs["kneeJointType:left"], eo.specs["socketType:right"], eo.specs.amputationSite] : eo,
      ["قدم مرنة", "ركبة هيدروليك", "سوكيت كربون", "ثنائي - سفلي | يمين: تحت الركبة | يسار: فوق الركبة"]);
    const pr = (await q(`SELECT prosthetic_type, knee_joint_type, foot_type FROM patients WHERE id = $1`, [e.pid])).rows[0];
    same("هـ.٥ **وعمودُ ملفّ المريض يقرأ الطرفين كاملين** لا نصفاً",
      [pr.prosthetic_type, pr.knee_joint_type, pr.foot_type],
      ["يمين: طرف تحت الركبة | يسار: طرف فوق الركبة", "يسار: ركبة هيدروليك", "يمين: قدم كربون | يسار: قدم مرنة"]);

    console.log("\n── و. مبتورُ الطرفين المتماثلين ──");
    const f2 = await examined("طرفان متماثلان", "prosthetic", {
      amputationType: "double", doubleLimbType: "lower", doubleRightDetail: "تحت الركبة", doubleLeftDetail: "تحت الركبة", limbsIdentical: true,
      prostheticType: "طرف تحت الركبة", footType: "قدم كربون", socketType: "سوكيت كربون",
    });
    const fl = (await call("GET", `/api/followups/patient/${f2.pid}`, S.recv)).json.find((f: any) => f.id === f2.fid)?.deviceSpecs;
    same("و.١ **خاناتُهما مرّةً «للطرفين»** — بلا ركبة، والناقصُ السيليكونُ وحده",
      [fl?.fields.map((f: any) => f.label), fl?.missing],
      [["نوع الطرف الصناعي — للطرفين", "نوع السوكيت — للطرفين", "نوع القدم — للطرفين", "نوع السليكون — للطرفين"], ["siliconType"]]);
    const rf = await sale(f2.fid, { siliconType: "سليكون طبي", "footType:left": "قدم خشبية" });
    same("و.٢ و«اشترى» يمرّ — **وجهةٌ تحاول الكتابةَ فوق كلمة الطبيب «للطرفين» لا تُحفظ**",
      [rf.status, sorted((await stateOf(f2.fid, f2.epId)).device_specs)], [200, sorted({ siliconType: "سليكون طبي" })]);

    console.log("\n── ز. سليكونيٌّ تعويضيّ ──");
    const g = await examined("إصبع سليكون", "prosthetic", { amputationType: "silicone", siliconePart: "اصبع", siliconeSide: "right", prostheticType: "إصبع سليكوني" });
    const gl = (await call("GET", `/api/followups/patient/${g.pid}`, S.recv)).json.find((f: any) => f.id === g.fid)?.deviceSpecs;
    same("ز.١ **النوعُ والسيليكونُ وحدهما** — لا قدمَ ولا ركبةَ ولا سوكيت", [gl?.fields.map((f: any) => f.key), gl?.missing],
      [["prostheticType", "siliconType"], ["siliconType"]]);
    const rg = await sale(g.fid, { siliconType: "سليكون طبي" });
    same("ز.٢ و«اشترى» يمرّ بهما", rg.status, 200);
  } finally {
    httpServer.close();
    await cleanup();
    await pool.end();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
