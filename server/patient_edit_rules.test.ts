// **مَن يعدّل ماذا في ملفّ المريض، ومتى** (§4.db — قرارُ المالك ٢٠٢٦-١٠-٠٩).
// `npm run test:patient-edit-rules` — القاعدةُ المشتركة (`shared/patient_edit_rules.ts`)، ثمّ الأبوابُ الحقيقية:
// `PUT /api/patients/:id` (القفلُ بعد المعاينة)، و`GET /api/patients/:id/edit-scope`، و«المطلوب» على طلب الجهاز، و`intake-sheets`.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "patient-edit-rules-test-secret";

import express from "express";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { softDeletePatient } from "./patients/trash_store";
import { BLOCKED } from "./ai/capabilities/catalog";
import { emptyInitialAssessment } from "@shared/physio_initial_assessment";
import {
  applyEditLocks, editValueChanged, isPrivilegedPatientEditor, lockedPatientFields, requestedItemEditable, EXAMINER_FIELDS,
} from "@shared/patient_edit_rules";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 7002;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-قفل-التعديل";
const B1 = 8971, B2 = 8972;
const RECV = 8981, RECV_NOEDIT = 8982, MGR = 8983, MGR_NOKEY = 8984, ADMIN = 8985, DOC = 8986, SPEC = 8987, OTHER = 8988;
const IDS = [RECV, RECV_NOEDIT, MGR, MGR_NOKEY, ADMIN, DOC, SPEC, OTHER];

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

const GOOD = () => ({
  ...emptyInitialAssessment(),
  investigations: ["mri"], trend: "worse", allergy: ["nka"], previousTherapy: "no",
  symptoms: "constant", painBest: 3, painWorst: 7, location: ["back"], aggravating: ["sitting"], relieving: ["rest"],
  sensation: "intact", plan: ["therapeutic_exercises"],
});

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_notes = $1`, [MARK])).rows.map((r) => Number(r.id));
  for (const id of pts) await storage.deletePatient(id);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = ANY($1::int[])`, [[B1, B2]]);
}

async function main() {
  // ══ القاعدةُ المشتركة ══
  console.log("\n── ق. القواعد ──");
  same("ق.١ **المسؤولُ ومديرُ الفرع** بلا قفل — والاستعلاماتُ والطبيبُ عليهم القفل",
    [isPrivilegedPatientEditor({ isAdmin: true }), isPrivilegedPatientEditor({ role: "branch_manager" }),
      isPrivilegedPatientEditor({ role: "reception", roles: ["reception", "branch_manager"] }),
      isPrivilegedPatientEditor({ role: "reception" }), isPrivilegedPatientEditor({ role: "doctor" }), isPrivilegedPatientEditor(null)],
    [true, true, true, false, false, false]);
  const before = lockedPatientFields({ privileged: false, examinedAny: false, examinedTypes: [] });
  same("ق.٢ **قبل المعاينة**: ما يكتبه الفاحصُ وحده مقفول على الاستعلامات",
    Array.from(before).sort(), [...EXAMINER_FIELDS].sort());
  const afterPros = lockedPatientFields({ privileged: false, examinedAny: true, examinedTypes: ["prosthetic"] });
  same("ق.٣ **بعد معاينة الأطراف**: المشتركةُ وتعريفُ البتر مقفولة، والاتّصالُ و«سبب المراجعة» (لم يُعايَن علاجُه الطبيعيّ) مفتوحة",
    ["name", "age", "injuryDate", "generalNotes", "amputationSite", "phone", "address", "governorate", "presentingComplaint", "supportType"].map((k) => afterPros.has(k)),
    [true, true, true, true, true, false, false, false, false, false]);
  same("ق.٤ والمسؤولُ ومديرُ الفرع لا يُقفَل عليهم شيء",
    lockedPatientFields({ privileged: true, examinedAny: true, examinedTypes: ["prosthetic", "physiotherapy"] }).size, 0);
  const stored = { name: "علي", weight: null, injuries: null, injuryType: "سوفان، كسر", injuryArea: "الركبة، الساق", injuryDate: "2021-03-04", injuryDateStatus: null };
  same("ق.٥ **بالقيمة لا بالحضور**: الفراغُ و`null` سواء، والمسافاتُ لا تُعدّ تغييراً، والإصاباتُ بمعناها (والملفُّ القديم بعموديه)",
    [editValueChanged("weight", "", stored), editValueChanged("name", " علي ", stored), editValueChanged("name", "علي حسن", stored),
      editValueChanged("injuries", JSON.stringify([{ type: "سوفان", area: "الركبة", side: "" }, { type: "كسر", area: "الساق", side: "" }]), stored),
      editValueChanged("injuries", JSON.stringify([{ type: "سوفان", area: "الركبة", side: "يمين" }]), stored)],
    [false, false, true, false, true]);
  const lockAll = lockedPatientFields({ privileged: false, examinedAny: true, examinedTypes: ["physiotherapy"] });
  const p1: Record<string, unknown> = { name: "علي", phone: "0770", injuryDate: "2021-03-04", injuryDateStatus: null,
    injuries: JSON.stringify([{ type: "سوفان", area: "الركبة", side: "" }, { type: "كسر", area: "الساق", side: "" }]), injuryType: "سوفان، كسر", injuryArea: "الركبة، الساق" };
  const r1 = applyEditLocks(p1, stored, lockAll);
  same("ق.٦ **المقفولُ الذي لم يتغيّر يُسقَط** — وتاريخُ الإصابة وحالتُه زوج، والإصاباتُ وعموداها زوج — والمفتوحُ يبقى",
    [r1.changed, Object.keys(p1)], [[], ["phone"]]);
  const p2: Record<string, unknown> = { name: "علي حسن", injuryDate: "", injuryDateStatus: "congenital" };
  same("ق.٧ والمتغيّرُ يُعاد ليُردّ الطلب", applyEditLocks(p2, stored, lockAll).changed, ["injuryDate", "name"]);
  same("ق.٨ **«المطلوب»**: للاستعلامات قبل المعاينة · وبعدها للمسؤول ومدير الفرع ما دام بلا سعر · والمساندُ لا «مطلوب» لها",
    [requestedItemEditable({ privileged: false, status: "awaiting_exam", agreedCost: 0, caseType: "prosthetic" }),
      requestedItemEditable({ privileged: false, status: "examined", agreedCost: 0, caseType: "prosthetic" }),
      requestedItemEditable({ privileged: true, status: "examined", agreedCost: 0, caseType: "prosthetic" }),
      requestedItemEditable({ privileged: true, status: "examined", agreedCost: 900000, caseType: "prosthetic" }),
      requestedItemEditable({ privileged: true, status: "in_manufacturing", agreedCost: 0, caseType: "prosthetic" }),
      requestedItemEditable({ privileged: false, status: "awaiting_exam", agreedCost: 0, caseType: "medical_support" })],
    [true, false, true, false, false, false]);
  check(typeof BLOCKED["/api/patients/:id/edit-scope"] === "string",
    "ق.٩ **والمساعدُ لا يقرأ صلاحيات التعديل** — ممنوعةٌ بسببٍ مكتوب في فهرس القدرات");

  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع قفل التعديل'), ($2, 'فرع آخر للقفل')`, [B1, B2]);
  const users: [number, string, Record<string, unknown>][] = [
    [RECV, "reception", { can_edit_patients: true, can_add_patients: true }],
    [RECV_NOEDIT, "reception", { can_edit_patients: false }],
    [MGR, "branch_manager", { can_edit_patients: true }],
    [MGR_NOKEY, "branch_manager", { can_edit_patients: false }],
    [ADMIN, "admin", {}],
    [DOC, "doctor", { medical_specialties: '["prosthetic","medical_support","physiotherapy"]' }],
    [SPEC, "physio_specialist", {}],
    [OTHER, "reception", { can_edit_patients: true, branch_id: B2, branch_ids: JSON.stringify([B2]) }],
  ];
  for (const [id, role, extra] of users) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active)
             VALUES ($1, $2, 'x', $3, $4, $5, $6::jsonb, true)`, [id, `per-${id}`, `موظّف ${id}`, role, B1, JSON.stringify([B1])]);
    for (const [k, v] of Object.entries(extra)) {
      await q(`UPDATE system_users SET ${k} = $2${k === "medical_specialties" || k === "branch_ids" ? "::jsonb" : ""} WHERE id = $1`, [id, v]);
    }
  }
  const sess = (id: number, role: string, perms: Record<string, unknown>, branch = B1) => hdr({
    userId: id, displayName: `موظّف ${id}`, role, roles: [role], branchId: branch, accessibleBranches: [branch], isAdmin: role === "admin",
    permissions: { canViewPatients: true, ...perms },
  });
  const S = {
    recv: sess(RECV, "reception", { canEditPatients: true, canAddPatients: true }),
    noedit: sess(RECV_NOEDIT, "reception", {}),
    mgr: sess(MGR, "branch_manager", { canEditPatients: true }),
    mgrNoKey: sess(MGR_NOKEY, "branch_manager", {}),
    admin: sess(ADMIN, "admin", {}),
    doc: sess(DOC, "doctor", { canWriteMedicalExam: true }),
    spec: sess(SPEC, "physio_specialist", {}),
    other: sess(OTHER, "reception", { canEditPatients: true }, B2),
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

  let seq = 0;
  /** مريضٌ بالاستمارة — أطرافٌ (وطلبُ معاينةٍ لجهازه) أو أطرافٌ وعلاجٌ طبيعيّ معاً. */
  async function mkPatient(label: string, withPhysio = false) {
    seq += 1;
    const pid = Number((await q(`INSERT INTO patients (name, phone, referral_source, referral_sub_source, referral_notes, age, height, weight,
        medical_condition, amputation_site, branch_id, is_amputee, is_physiotherapy, total_cost, patient_classification, governorate, address,
        injury_cause, injury_date, presenting_complaint, injury_type, injury_area)
      VALUES ($1, $2, 'من شخص آخر', 'فيسبوك', $3, '40', '172', '78', 'amputee', 'احادي - طرف سفلي - يمين - تحت الركبة', $4, true, $5, 0, 'new',
        'بغداد', 'الكرادة', 'حادث سير', '2021-03-04', $6, $7, $8) RETURNING id`,
      [`${label} ${MARK}`, `0772${String(5000000 + seq * 7919).slice(0, 7)}`, MARK, B1, withPhysio,
        withPhysio ? "ألم أسفل الظهر" : null, withPhysio ? "انزلاق ديسك" : null, withPhysio ? "القطن" : null])).rows[0].id);
    await q(`UPDATE patients SET phone_e164 = '+964' || substr(phone, 2) WHERE id = $1`, [pid]);
    await storage.syncPatientCases(pid);
    const ep = await call("POST", `/api/patients/${pid}/device-episodes`, S.recv, { serviceType: "prosthetic", requestedItem: "full_device", servicePath: "exam" });
    return { pid, epId: Number(ep.json?.id) };
  }
  /** ما ترسله «تعديل مريض» عند الحفظ — الكائنُ كاملاً كما قرأته الشاشة (`form.reset`). */
  async function formEcho(pid: number): Promise<Record<string, unknown>> {
    const p = (await call("GET", `/api/patients/${pid}`, S.admin)).json;
    const v = (k: string) => p?.[k] ?? "";
    return {
      name: p.name, phone: v("phone"), whatsappNotificationsEnabled: p.whatsappNotificationsEnabled === true, address: v("address"),
      governorate: v("governorate"), injuryDateStatus: p.injuryDateStatus ?? null, age: p.age, weight: v("weight"), height: v("height"),
      medicalCondition: p.medicalCondition, isAmputee: p.isAmputee, isPhysiotherapy: p.isPhysiotherapy, isMedicalSupport: p.isMedicalSupport,
      amputationSite: v("amputationSite"), diseaseType: v("diseaseType"), totalCost: p.totalCost ?? 0, injuryDate: p.injuryDate || null,
      injuryCause: v("injuryCause"), generalNotes: v("generalNotes"), prostheticType: v("prostheticType"), siliconType: v("siliconType"),
      siliconSize: v("siliconSize"), suspensionSystem: v("suspensionSystem"), footType: v("footType"), footSize: v("footSize"),
      kneeJointType: v("kneeJointType"), treatmentType: v("treatmentType"), supportType: v("supportType"), injurySide: v("injurySide"),
      injuries: v("injuries"), branchId: p.branchId, referralSource: v("referralSource"), referralNotes: v("referralNotes"),
      referralSubSource: v("referralSubSource"), presentingComplaint: v("presentingComplaint"),
    };
  }
  const put = async (pid: number, s: string, over: Record<string, unknown>) =>
    call("PUT", `/api/patients/${pid}`, s, { ...(await formEcho(pid)), ...over });
  const row = async (pid: number) => (await q(`SELECT name, age, phone, address, governorate, referral_sub_source AS sub, presenting_complaint AS pc,
      prosthetic_type AS pt, amputation_site AS amp, injury_date::text AS d, general_notes AS notes
      FROM patients WHERE id = $1`, [pid])).rows[0];
  const scope = async (pid: number, s: string) => call("GET", `/api/patients/${pid}/edit-scope`, s);
  const setItem = (pid: number, epId: number, s: string, items: string[]) =>
    call("PATCH", `/api/patients/${pid}/device-episodes/${epId}/requested-item`, s, { requestedItems: items });
  const sheetEditable = async (pid: number, epId: number, s: string) =>
    (await call("GET", `/api/patients/${pid}/intake-sheets`, s)).json?.sheets?.find((x: any) => x.episodeId === epId)?.requestedItemEditable;
  const signProsthetic = async (pid: number, epId: number) => call("POST", `/api/medical/patients/${pid}/exams`, S.doc, {
    idempotencyKey: randomUUID(), caseType: "prosthetic", deviceEpisodeId: epId,
    chiefComplaint: "", clinicalFindings: "", plan: "", notes: "", diagnosis: "بترٌ تحت الركبة الأيمن",
    prescription: { amputationType: "single", singleLimb: "lower", singleSide: "right", singleDetail: "تحت الركبة", prostheticType: "طرف سفلي" },
  });

  try {
    // ══ أ. قبل المعاينة ══
    console.log("\n── أ. قبل المعاينة ──");
    const A = await mkPatient("أحمد");
    check(A.epId > 0, "تهيئة: طلبُ معاينة الجهاز فُتح", String(A.epId));
    const sc0 = (await scope(A.pid, S.recv)).json;
    same("أ.١ **صلاحياتُ التعديل قبل المعاينة**: لا معاينة، وما يكتبه الفاحصُ وحده مقفول",
      [sc0?.examinedAny, sc0?.privileged, [...(sc0?.locked ?? [])].sort()], [false, false, [...EXAMINER_FIELDS].sort()]);
    const a2 = await put(A.pid, S.recv, { name: `أحمد كريم ${MARK}`, age: "41", referralSubSource: "واتس اب", generalNotes: "يأتي صباحاً" });
    const r2 = await row(A.pid);
    same("أ.٢ **الاستعلاماتُ تعدّل كلَّ ما أدخلته** — ومعه «كيف عرف الشخص الآخر»",
      [a2.status, r2.name, r2.age, r2.sub, r2.notes], [200, `أحمد كريم ${MARK}`, "41", "واتس اب", "يأتي صباحاً"]);
    const audit2 = (await q(`SELECT notes FROM audit_log WHERE entity_type = 'patient' AND entity_id = $1 AND user_id = $2 ORDER BY id DESC LIMIT 1`, [A.pid, RECV])).rows[0];
    check(/الاسم/.test(audit2?.notes ?? "") && /كيف عرف الشخص الآخر بالمركز/.test(audit2?.notes ?? ""),
      "أ.٣ وسطرُ التدقيق يسمّي ما تغيّر بالعربية", audit2?.notes);
    const a4 = await put(A.pid, S.recv, { name: `أحمد ${MARK}`, prostheticType: "ركبة ذكية" });
    const r4 = await row(A.pid);
    same("أ.٤ **ما يكتبه الفاحص ليس للاستعلامات** — يُردّ الطلبُ كلُّه بأسماء خاناته، ولا يُكتب الاسمُ معه",
      [a4.status, a4.json?.code, /نوع الطرف الصناعي/.test(a4.json?.message ?? ""), r4.name, r4.pt], [403, "PATIENT_FIELDS_LOCKED", true, `أحمد كريم ${MARK}`, null]);
    const a5 = await put(A.pid, S.recv, { phone: "07725550101" });
    same("أ.٥ **والنموذجُ كاملاً بلا تغييرٍ في المقفول يمرّ** — حقولُ الفاحص الفارغة تُسقَط ولا تُردّ",
      [a5.status, (await row(A.pid)).phone], [200, "07725550101"]);
    const a6 = await setItem(A.pid, A.epId, S.recv, ["foot", "socket"]);
    const ep6 = (await q(`SELECT requested_item, extra_components FROM patient_device_episodes WHERE id = $1`, [A.epId])).rows[0];
    const au6 = (await q(`SELECT notes FROM audit_log WHERE entity_type = 'patient_device_episode' AND entity_id = $1 ORDER BY id DESC LIMIT 1`, [A.epId])).rows[0];
    same("أ.٦ **«المطلوب» يُصحَّح قبل المعاينة** — طرفٌ كامل ⟵ قدمٌ وسوكيت، وسطرُ تدقيقٍ بالقديم والجديد",
      [a6.status, a6.json?.result, ep6?.requested_item, ep6?.extra_components, /«المطلوب»/.test(au6?.notes ?? "")],
      [200, "changed", "socket", ["foot"], true]);
    same("أ.٧ والورقةُ تقول للاستعلامات إنّ «المطلوب» يُعدَّل — ولمن لا يملك «تعديل مرضى» لا",
      [await sheetEditable(A.pid, A.epId, S.recv), await sheetEditable(A.pid, A.epId, S.noedit)], [true, false]);
    const a8 = await setItem(A.pid, A.epId, S.noedit, ["full_device"]);
    const a8b = await setItem(A.pid, A.epId, S.other, ["full_device"]);
    const a8c = await setItem(A.pid, A.epId, S.recv, ["قدم"]);
    same("أ.٨ ولا «مطلوب» بلا مفتاح «تعديل مرضى»، ولا من فرعٍ آخر، ولا بقيمةٍ ليست من القائمة",
      [a8.status, a8b.status, a8c.status], [403, 403, 400]);

    // ══ ب. بعد المعاينة ══
    console.log("\n── ب. بعد المعاينة ──");
    const signed = await signProsthetic(A.pid, A.epId);
    check(signed.status === 200, "تهيئة: الطبيبُ وقّع معاينةَ الجهاز", JSON.stringify(signed.json));
    const sc1 = (await scope(A.pid, S.recv)).json;
    const lk = new Set<string>(sc1?.locked ?? []);
    same("ب.١ **بعد المعاينة**: بياناتُ الاستمارة مقفولة على الاستعلامات — والهاتفُ والعنوانُ والمحافظةُ مفتوحة",
      [sc1?.examinedAny, ["name", "age", "referralSubSource", "amputationSite", "injuryDate"].every((k) => lk.has(k)),
        ["phone", "address", "governorate"].some((k) => lk.has(k)), sc1?.reasons?.name],
      [true, true, false, "بعد المعاينة يعدّلها المسؤول أو مدير الفرع"]);
    const b2 = await put(A.pid, S.recv, { name: `أحمد علي ${MARK}`, age: "45" });
    same("ب.٢ **الاستعلاماتُ لا تعدّل الاسمَ والعمر بعد المعاينة** — ٤٠٣ يسمّيهما ويقول مَن يعدّلهما",
      [b2.status, b2.json?.locked, /المسؤولُ أو مديرُ الفرع/.test(b2.json?.message ?? ""), (await row(A.pid)).name],
      [403, ["name", "age"], true, `أحمد كريم ${MARK}`]);
    const b3 = await put(A.pid, S.recv, { phone: "07725550202", address: "المنصور", governorate: "بابل" });
    const r3 = await row(A.pid);
    same("ب.٣ **والهاتفُ والعنوانُ والمحافظةُ تبقى للاستعلامات** — والنموذجُ كاملاً يمرّ، والمقفولُ غيرُ المتغيّر يُسقَط",
      [b3.status, r3.phone, r3.address, r3.governorate], [200, "07725550202", "المنصور", "بابل"]);
    const b4 = await put(A.pid, S.recv, { injuryDate: "2022-01-01" });
    const b4b = await put(A.pid, S.recv, { injuryDate: null, injuryDateStatus: "unknown" });
    same("ب.٤ وتاريخُ الإصابة وحالتُه مقفولان معاً", [b4.status, b4b.status, (await row(A.pid)).d], [403, 403, "2021-03-04"]);
    const b5 = await put(A.pid, S.mgr, { name: `أحمد علي ${MARK}`, age: "45" });
    const b6 = await put(A.pid, S.mgrNoKey, { name: `أحمد مدير ${MARK}` });
    const b7 = await put(A.pid, S.admin, { age: "46", prostheticType: "طرف سفلي ذكي" });
    const r7 = await row(A.pid);
    same("ب.٥ **مديرُ الفرع بمفتاح «تعديل مرضى» يعدّل بعد المعاينة** · وبلا مفتاح لا · والمسؤولُ يعدّل كلَّ شيء",
      [b5.status, b6.status, b7.status, r7.name, r7.age, r7.pt], [200, 403, 200, `أحمد علي ${MARK}`, "46", "طرف سفلي ذكي"]);
    const b8 = await setItem(A.pid, A.epId, S.recv, ["full_device"]);
    same("ب.٦ **«المطلوب» بعد المعاينة ليس للاستعلامات** — والورقةُ لا تعرض زرَّه لها، وتعرضه للمدير",
      [b8.status, /المسؤولُ أو مديرُ الفرع/.test(b8.json?.message ?? ""), await sheetEditable(A.pid, A.epId, S.recv), await sheetEditable(A.pid, A.epId, S.mgr)],
      [403, true, false, true]);
    const b9 = await setItem(A.pid, A.epId, S.mgr, ["full_device"]);
    same("ب.٧ ومديرُ الفرع يصحّحه ما دام بلا سعرٍ ولا تصنيع",
      [b9.status, (await q(`SELECT requested_item FROM patient_device_episodes WHERE id = $1`, [A.epId])).rows[0]?.requested_item], [200, "full_device"]);
    await q(`UPDATE patient_device_episodes SET agreed_cost = 900000 WHERE id = $1`, [A.epId]);
    const b10 = await setItem(A.pid, A.epId, S.mgr, ["foot"]);
    same("ب.٨ وبعد السعر المعتمَد لا يُصحَّح من هنا", [b10.status, await sheetEditable(A.pid, A.epId, S.mgr)], [409, false]);

    //  إلغاءُ المعاينة يرفع سلطتها السريرية — فتعود الخاناتُ للاستعلامات.
    const examId = Number(signed.json?.id);
    await q(`INSERT INTO medical_exam_cancellations (exam_id, patient_id, branch_id, reason) VALUES ($1, $2, $3, 'وُقّعت على المريض الخطأ')`, [examId, A.pid, B1]);
    const b11 = await put(A.pid, S.recv, { name: `أحمد ${MARK}` });
    same("ب.٩ **ومعاينةٌ أُلغيت لا تقفل** — تعود الخاناتُ للاستعلامات", [b11.status, (await row(A.pid)).name], [200, `أحمد ${MARK}`]);

    // ══ ج. خاناتُ كلّ قسم بعد معاينة قسمها ══
    console.log("\n── ج. كلُّ قسمٍ بمعاينته ──");
    const C = await mkPatient("سعاد", true);
    const cs = await signProsthetic(C.pid, C.epId);
    check(cs.status === 200, "تهيئة: معاينةُ الأطراف وُقّعت (والعلاجُ الطبيعيّ لم يُعايَن)", JSON.stringify(cs.json));
    const c1 = await put(C.pid, S.recv, { presentingComplaint: "ألم أسفل الظهر ينزل إلى الساق" });
    same("ج.١ **«سبب المراجعة» يبقى للاستعلامات حتى يعاينه الأخصائيّ** — ولو عُوين طرفُه",
      [c1.status, (await row(C.pid)).pc], [200, "ألم أسفل الظهر ينزل إلى الساق"]);
    const c2 = await put(C.pid, S.recv, { amputationSite: "احادي - طرف سفلي - يسار - فوق الركبة" });
    same("ج.٢ وتعريفُ البتر مقفولٌ بعد معاينة الأطراف", [c2.status, c2.json?.locked, (await row(C.pid)).amp],
      [403, ["amputationSite"], "احادي - طرف سفلي - يمين - تحت الركبة"]);
    //  شاشةُ «تعديل مريض» تبني الإصاباتِ من عموديها القديمين وترسلها مصفوفة — المعنى نفسُه، فلا يُعدّ تغييراً.
    const legacyInjuries = JSON.stringify([{ type: "انزلاق ديسك", area: "القطن", side: "" }]);
    const ps = await call("POST", `/api/medical/patients/${C.pid}/exams`, S.spec, {
      idempotencyKey: randomUUID(), caseType: "physiotherapy", chiefComplaint: "", clinicalFindings: "", plan: "", notes: "",
      diagnosis: "ألم أسفل الظهر الميكانيكي", assessment: GOOD(), prescription: { treatments: [{ treatmentType: "تمارين تأهيلية", sessionCount: 10 }] },
    });
    check(ps.status === 200, "تهيئة: الأخصائيُّ وقّع معاينةَ العلاج الطبيعي", JSON.stringify(ps.json));
    const c3 = await put(C.pid, S.recv, { presentingComplaint: "ألم الظهر فقط" });
    const c4 = await put(C.pid, S.recv, { injuries: legacyInjuries, injuryType: "انزلاق ديسك", injuryArea: "القطن", phone: "07725550303" });
    const c5 = await put(C.pid, S.recv, { injuries: JSON.stringify([{ type: "انزلاق ديسك", area: "القطن", side: "يمين" }]) });
    same("ج.٣ **وبعد معاينة العلاج الطبيعي يُقفَل «سبب المراجعة» والإصابات** — والإصاباتُ نفسُها بصيغةٍ أخرى ليست تغييراً",
      [c3.status, c4.status, c5.status, (await row(C.pid)).pc, (await row(C.pid)).phone],
      [403, 200, 403, "ألم أسفل الظهر ينزل إلى الساق", "07725550303"]);

    // ══ د. النطاقُ والسلّة ══
    console.log("\n── د. النطاق ──");
    same("د.١ صلاحياتُ التعديل لا تُقرأ من فرعٍ آخر ولا بلا مفتاح «تعديل مرضى» — والمديرُ لا قفلَ عليه",
      [(await scope(C.pid, S.other)).status, (await scope(C.pid, S.noedit)).status, (await scope(C.pid, S.mgr)).json?.locked?.length], [403, 403, 0]);
    await softDeletePatient({ patientId: C.pid, reason: "اختبار", actor: { userId: ADMIN, isAdmin: true, role: "admin", scope: null } as any });
    same("د.٢ ولا لمريضٍ في السلّة", [(await scope(C.pid, S.recv)).status, (await setItem(C.pid, C.epId, S.recv, ["foot"])).status], [409, 409]);
  } finally {
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
