// «استمارة المراجع» مكتملةً لكلّ جهاز — بابُ القراءة الواحد (§4.cq، ملاحظاتُ المالك ٢٠٢٦-١٠-٠٨).
// `npm run test:intake-sheets` — القواعدُ المشتركة، ثمّ `GET /api/patients/:id/intake-sheets` الحقيقيّ.
//
// يحرس ما طلبه المالك: (١) «حين أطبعها تكون نفسَ ورقة المريض بعد أن اكتملت» — حقولُ الاستعلامات، و«المعاينة الطبية» من معاينة
// **ذلك الجهاز**، وخاناتُ الجهاز مدموجةً (الطبيبُ يغلب)، والمبلغُ من قرار الحسم، والمراجعاتُ من سجلّ الزيارات؛ (٢) «مجاني» يُقال
// بسعره الأصليّ ولا دفعةَ تُخترَع؛ (٣) المالُ لمن يرى الدفعات وحده — والطبيبُ يرى الورقةَ بخانة مبلغٍ مقفولة.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "intake-sheets-test-secret";

import express from "express";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { softDeletePatient } from "./patients/trash_store";
import { freeDeviceRows, sheetMoneyLine, sheetSpecRows, specKeysCoveredBySheets, type IntakeSheet } from "@shared/intake_sheet_view";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6994;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-عرض-الاستمارة";
const B1 = 9941, B2 = 9942;
const RECV = 9951, DOC = 9952, EXPERT = 9953, RECV_B2 = 9954, RECV_NOPAY = 9955;
const IDS = [RECV, DOC, EXPERT, RECV_B2, RECV_NOPAY];

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_sub_source = $1 OR referral_source = $1`, [MARK])).rows.map((r) => Number(r.id));
  for (const id of pts) await storage.deletePatient(id);
  await q(`DELETE FROM journal_lines WHERE entry_id IN (SELECT id FROM journal_entries WHERE created_by = ANY($1::int[]))`, [IDS]);
  await q(`DELETE FROM journal_entries WHERE created_by = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = ANY($1::int[])`, [[B1, B2]]);
}

const sheetOf = (kind: IntakeSheet["decision"]["kind"], money: IntakeSheet["money"]) =>
  ({ decision: { kind, at: null, reason: kind === "not_bought" ? "السعر" : null }, money });

async function main() {
  // ══ القاعدةُ المشتركة (بلا قاعدة بيانات) ══
  console.log("\n── القواعد ──");
  same("ق.١ **«مجاني» بسعره الأصليّ** — لا «الكلي ٠»",
    sheetMoneyLine(sheetOf("bought", { total: 0, originalPrice: 1_500_000, priceKind: "free", paid: 0, remaining: 0 })), "مجاني — السعر الأصلي 1,500,000 د.ع");
  same("ق.٢ والمدفوعُ جزئياً: الكلّيُّ والمدفوعُ والمتبقّي",
    sheetMoneyLine(sheetOf("bought", { total: 2_000_000, originalPrice: 2_000_000, priceKind: "full", paid: 500_000, remaining: 1_500_000 })),
    "الكلي 2,000,000 د.ع · المدفوع 500,000 د.ع · المتبقي 1,500,000 د.ع");
  same("ق.٣ والخصمُ يُقال بأصله",
    sheetMoneyLine(sheetOf("bought", { total: 800_000, originalPrice: 1_000_000, priceKind: "discount", paid: 800_000, remaining: 0 })),
    "الكلي 800,000 د.ع · المدفوع 800,000 د.ع · المتبقي 0 د.ع · (بعد خصمٍ من 1,000,000)");
  same("ق.٤ وقبل الحسم ⟵ لا رقمَ يُخترَع، و«لم يشترِ» بسببه",
    [sheetMoneyLine(sheetOf("pending", null)), sheetMoneyLine(sheetOf("not_bought", null))], ["بانتظار قرار الحسم", "لم يشترِ — السعر"]);
  const fr = (kind: IntakeSheet["decision"]["kind"], priceKind: string | null, money = true) => ({
    episodeId: 1, sequenceNumber: 1, serviceType: "prosthetic", decision: { kind, at: "2026-10-08", reason: null },
    money: money ? { total: 0, originalPrice: 900, priceKind, paid: 0, remaining: 0 } : null,
  }) as unknown as IntakeSheet;
  same("ق.٥ **صفُّ «مجاني» في المدفوعات للمُهدى المشترى وحده** — لا للمخصوم ولا قبل الحسم ولا لمن لا يرى المال",
    [freeDeviceRows([fr("bought", "free")]).length, freeDeviceRows([fr("bought", "discount")]).length,
      freeDeviceRows([fr("pending", "free")]).length, freeDeviceRows([fr("bought", "free", false)]).length], [1, 0, 0, 0]);

  const legacy = { serviceType: "prosthetic", specs: { prostheticType: "طرف", siliconSize: "٢٦", suspensionSystem: "" }, amputationSite: "تحت الركبة", injurySide: null } as unknown as IntakeSheet;
  same("ق.٦ **خاناتُ الوصفة القديمة تُعرض حين تُكتب** — الخمسُ دائماً، و«حجم السليكون» المكتوب، لا «نظام التعليق» الفارغ",
    sheetSpecRows(legacy).map((r) => [r.key, r.value]),
    [["prostheticType", "طرف"], ["kneeJointType", null], ["footType", null], ["socketType", null], ["siliconType", null], ["siliconSize", "٢٦"]]);
  const KEYS = ["prostheticType", "kneeJointType", "footType", "socketType", "siliconType", "siliconSize", "suspensionSystem", "footSize", "amputationSite", "injurySide"];
  same("ق.٧ **«التفاصيل» لا تُخفي إلّا ما يقوله المستطيل**: جهازٌ واحد ⟵ ما في سطره بقيمته؛ وما خلا منه سطرُه يبقى فيها",
    [...specKeysCoveredBySheets([legacy], "prosthetic", KEYS)].sort(), ["amputationSite", "prostheticType", "siliconSize"]);
  same("ق.٨ وجهازان ⟵ كلُّها (لقطةُ آخر بيعٍ لا تُنسَب)، وقسمٌ آخر أو بلا أجهزة ⟵ لا شيء",
    [specKeysCoveredBySheets([legacy, legacy], "prosthetic", KEYS).size, specKeysCoveredBySheets([legacy], "medical_support", KEYS).size,
      specKeysCoveredBySheets([], "prosthetic", KEYS).size], [KEYS.length, 0, 0]);

  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع عرض الاستمارة'), ($2, 'فرع آخر للاستمارة')`, [B1, B2]);
  for (const [id, role, br] of [[RECV, "reception", B1], [DOC, "doctor", B1], [EXPERT, "prosthetics_expert", B1], [RECV_B2, "reception", B2], [RECV_NOPAY, "reception", B1]] as const) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active)
             VALUES ($1, $2, 'x', $3, $4, $5, $6::jsonb, true)`, [id, `isv-${id}`, `مستخدم ${id}`, role, br, JSON.stringify([br])]);
  }
  //  اسمُ الطبيب في المعاينة من حسابه لا من الجلسة.
  await q(`UPDATE system_users SET medical_specialties = '["prosthetic","medical_support","physiotherapy"]'::jsonb, display_name = 'د. سامر' WHERE id = $1`, [DOC]);
  await q(`UPDATE system_users SET can_add_patients = true, can_add_payments = true, can_view_payments = true WHERE id = ANY($1::int[])`, [[RECV, RECV_B2]]);
  //  «عرض الدفعات» افتراضُه «نعم» في الحساب — فيُطفأ صراحةً.
  await q(`UPDATE system_users SET can_view_payments = false WHERE id = $1`, [RECV_NOPAY]);
  const PAY = { canViewPatients: true, canAddPatients: true, canAddPayments: true, canViewPayments: true };
  const S = {
    recv: hdr({ userId: RECV, displayName: "استقبال", role: "reception", branchId: B1, accessibleBranches: [B1], isAdmin: false, permissions: PAY }),
    //  الصلاحياتُ تُقرأ من الحساب نفسِه — فحسابٌ بلا «عرض الدفعات» لا جلسةٌ تدّعيه.
    recvNoPay: hdr({ userId: RECV_NOPAY, displayName: "استقبال بلا دفعات", role: "reception", branchId: B1, accessibleBranches: [B1], isAdmin: false,
      permissions: { canViewPatients: true } }),
    doc: hdr({ userId: DOC, displayName: "د. سامر", role: "doctor", roles: ["doctor"], branchId: B1, accessibleBranches: [B1], isAdmin: false,
      permissions: { canViewPatients: true, canWriteMedicalExam: true } }),
    //  خبيرٌ لا دورَ له غيره — **ولو حمل علَمَ الدفعات** لا يرى المال (قاعدةُ التصنيع).
    expert: hdr({ userId: EXPERT, displayName: "الخبير", role: "prosthetics_expert", roles: ["prosthetics_expert"], branchId: B1, accessibleBranches: [B1],
      isAdmin: false, permissions: { canViewPatients: true, canViewPayments: true } }),
    admin: hdr({ userId: RECV, displayName: "المسؤول", role: "admin", isAdmin: true, branchId: B1, permissions: PAY }),
    other: hdr({ userId: RECV_B2, displayName: "استقبال فرع آخر", role: "reception", branchId: B2, accessibleBranches: [B2], isAdmin: false, permissions: PAY }),
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
  async function sheetPatient(kind: "prosthetic" | "medical_support" | "physiotherapy", label: string) {
    seq += 1;
    const pid = Number((await q(`INSERT INTO patients (name, phone, referral_source, referral_sub_source, age, height, weight, medical_condition, amputation_site,
        support_type, branch_id, is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification, governorate, address,
        injury_cause, injury_date, general_notes, had_prior_center_history)
      VALUES ($1, $2, 'من شخص آخر', $3, '40', '172', '78', $4, $5, $6, $7, $8, $9, $10, 0, 'new', 'بغداد', 'الكرادة', 'حادث سير', '2021-03-04', 'يأتي مع ابنه', false)
      RETURNING id`,
      [`${label} ${MARK}`, `0772${String(5000000 + seq * 7919).slice(0, 7)}`, MARK,
        kind === "prosthetic" ? "amputee" : kind, kind === "prosthetic" ? "احادي - طرف سفلي - يمين - تحت الركبة" : null,
        kind === "medical_support" ? "مشد" : null, B1, kind === "prosthetic", kind === "medical_support", kind === "physiotherapy"])).rows[0].id);
    await q(`UPDATE patients SET phone_e164 = '+964' || substr(phone, 2) WHERE id = $1`, [pid]);
    await storage.syncPatientCases(pid);
    return pid;
  }
  const openDevice = async (pid: number, kind: string, requestedItem = "full_device") =>
    Number((await call("POST", `/api/patients/${pid}/device-episodes`, S.recv, { serviceType: kind, requestedItem, servicePath: "exam" })).json?.id);
  const sign = (pid: number, kind: string, ep: number, diagnosis: string, rx: Record<string, unknown>) =>
    call("POST", `/api/medical/patients/${pid}/exams`, S.doc, {
      idempotencyKey: randomUUID(), caseType: kind, deviceEpisodeId: ep,
      chiefComplaint: "", clinicalFindings: "", plan: "", notes: "", diagnosis, prescription: rx,
    });
  const followupOf = async (ep: number) => Number((await q(`SELECT id FROM post_exam_followups WHERE device_episode_id = $1 ORDER BY id DESC LIMIT 1`, [ep])).rows[0]?.id);
  const sheets = async (pid: number, s: string) => call("GET", `/api/patients/${pid}/intake-sheets`, s);
  const RX = { amputationType: "single", singleLimb: "lower", singleSide: "right", singleDetail: "تحت الركبة" };

  try {
    console.log("\n── أ. جهازٌ مُهدى — الورقةُ مكتملة ──");
    const a = await sheetPatient("prosthetic", "سعد");
    const aEp = await openDevice(a, "prosthetic");
    const sa = await sign(a, "prosthetic", aEp, "جذعة تحت الركبة الأيمن بطول جيد.\nيحتاج طرفاً بسوكيت سليكون.",
      { ...RX, prostheticType: "طرف سفلي تحت الركبة", kneeJointType: "لا ينطبق" });
    const sale = await call("POST", `/api/followups/${await followupOf(aEp)}/complete-sale`, S.recv, {
      originalPrice: 1_500_000, discountAmount: 1_500_000, expertUserId: EXPERT,
      deviceSpecs: { socketType: "سوكيت سليكون", footType: "قدم كربون", siliconType: "لا ينطبق" },
    });
    same("أ.٠ المعاينةُ والبيعُ المجانيّ يمرّان", [sa.status, sale.status], [200, 200]);
    const ra = await sheets(a, S.recv);
    const s1 = ra.json?.sheets?.[0] as IntakeSheet | undefined;
    same("أ.١ ورقةٌ واحدة لجهازه، والاستعلاماتُ يرى المال",
      [ra.status, ra.json?.sheets?.length, s1?.episodeId, ra.json?.canViewMoney], [200, 1, aEp, true]);
    const pt = ra.json?.patient;
    same("أ.٢ **حقولُ الاستعلامات كلُّها من الملفّ**",
      [pt?.name, pt?.governorate, pt?.address, pt?.referralSource, pt?.referralSubSource, pt?.age, pt?.weight, pt?.height, pt?.injuryCause,
        pt?.injuryDate, pt?.generalNotes, pt?.hadPriorCenterHistory, /^WB-|^[A-Z]{2}-/.test(pt?.patientCode ?? "") || pt?.patientCode === null],
      [`سعد ${MARK}`, "بغداد", "الكرادة", "من شخص آخر", MARK, "40", "78", "172", "حادث سير", "2021-03-04", "يأتي مع ابنه", false, true]);
    same("أ.٣ **«المعاينة الطبية» من معاينة هذا الجهاز** باسم الطبيب",
      [s1?.exam?.text, s1?.exam?.doctorName, typeof s1?.exam?.signedAt], ["جذعة تحت الركبة الأيمن بطول جيد.\nيحتاج طرفاً بسوكيت سليكون.", "د. سامر", "string"]);
    same("أ.٤ **خاناتُ الجهاز الخمس مدموجة** — ما كتبه الطبيبُ وما أكمله الاستعلاماتُ عند البيع",
      [s1?.specs?.prostheticType, s1?.specs?.kneeJointType, s1?.specs?.socketType, s1?.specs?.footType, s1?.specs?.siliconType, [...(s1?.filledAtSale ?? [])].sort()],
      ["طرف سفلي تحت الركبة", "لا ينطبق", "سوكيت سليكون", "قدم كربون", "لا ينطبق", ["footType", "siliconType", "socketType"]]);
    same("أ.٥ **«مجاني» بسعره الأصليّ** — ولا دفعةَ مُخترَعة",
      [s1?.decision?.kind, s1?.money, sheetMoneyLine(s1!),
        Number((await q(`SELECT count(*) FROM payments WHERE device_episode_id = $1`, [aEp])).rows[0].count)],
      ["bought", { total: 0, originalPrice: 1_500_000, priceKind: "free", paid: 0, remaining: 0 }, "مجاني — السعر الأصلي 1,500,000 د.ع", 0]);
    same("أ.٦ وصفُّ «مجاني» في المدفوعات من الورقة نفسِها", freeDeviceRows(ra.json.sheets).map((r) => [r.episodeId, r.originalPrice]), [[aEp, 1_500_000]]);
    const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    same("أ.٦ب **والتواريخُ بصيغةٍ قياسية** (`…T…Z`) — النصُّ الخامُ من القاعدة لا يقرؤه متصفّحُ آيفون",
      [s1?.openedAt, s1?.exam?.signedAt, s1?.decision?.at, s1?.visits?.[0]?.date].map((d) => ISO.test(d ?? "")), [true, true, true, true]);
    same("أ.٧ ونوعُ الإصابة من سلسلة البتر، والترويسةُ من فرع الجهاز",
      [/تحت الركبة/.test(s1?.amputationSite ?? ""), s1?.branchName], [true, "فرع عرض الاستمارة"]);

    console.log("\n── ب. المراجعاتُ من سجلّ الزيارات ──");
    const vIns = (ep: number | null, details: string, date: string, deleted = false) => q(
      `INSERT INTO visits (patient_id, branch_id, visit_date, details, notes, device_episode_id, deleted_at)
       VALUES ($1, $2, $3::timestamp, $4, NULL, $5, ${deleted ? "now()" : "NULL"}) RETURNING id`, [a, B1, date, details, ep]);
    const before = (s1?.visits ?? []).length;
    await vIns(aEp, "قياس القالب", "2026-10-09 10:00");
    await vIns(aEp, "زيارةٌ محذوفة", "2026-10-10 10:00", true);
    await vIns(null, "علاجٌ بلا جهاز", "2026-10-11 10:00");
    const vs = ((await sheets(a, S.recv)).json?.sheets?.[0]?.visits ?? []) as IntakeSheet["visits"];
    same("ب.١ **زياراتُ هذا الجهاز وحده** — لا المحذوفة ولا ما لا جهازَ له، وبترتيب التاريخ",
      [vs.length - before, vs[vs.length - 1]?.details, vs.some((v) => v.details === "زيارةٌ محذوفة"), vs.some((v) => v.details === "علاجٌ بلا جهاز")],
      [1, "قياس القالب", false, false]);

    console.log("\n── ج. جهازان: المدفوعُ والمعلَّق، كلٌّ بورقته ──");
    const c = await sheetPatient("prosthetic", "منى");
    const c1 = await openDevice(c, "prosthetic");
    await sign(c, "prosthetic", c1, "بتر تحت الركبة — طرف عادي.",
      { ...RX, prostheticType: "طرف سفلي", socketType: "سوكيت عادي", kneeJointType: "لا ينطبق", footType: "قدم مرنة", siliconType: "سليكون طبي" });
    const saleC = await call("POST", `/api/followups/${await followupOf(c1)}/complete-sale`, S.recv, {
      originalPrice: 2_500_000, discountAmount: 500_000, expertUserId: EXPERT, paidNow: 500_000,
    });
    const c2 = await openDevice(c, "prosthetic", "socket");
    const rc = await sheets(c, S.recv);
    const [x1, x2] = (rc.json?.sheets ?? []) as IntakeSheet[];
    same("ج.١ ورقتان بترتيب فتحهما", [saleC.status, rc.json?.sheets?.length, x1?.episodeId, x2?.episodeId], [200, 2, c1, c2]);
    same("ج.٢ **المبلغُ من قرار الحسم والمدفوعُ من دفعات الجهاز** — والخصمُ بأصله",
      [x1?.money, sheetMoneyLine(x1!)],
      [{ total: 2_000_000, originalPrice: 2_500_000, priceKind: "discount", paid: 500_000, remaining: 1_500_000 },
        "الكلي 2,000,000 د.ع · المدفوع 500,000 د.ع · المتبقي 1,500,000 د.ع · (بعد خصمٍ من 2,500,000)"]);
    same("ج.٣ **والجهازُ الثاني بلا معاينةٍ لا يستعير معاينةَ الأوّل ولا خاناته** — وقبل الحسم لا رقم",
      [x2?.exam, x2?.decision?.kind, x2?.money?.total, x2?.specs?.socketType ?? null, x2?.requestedItem, sheetMoneyLine(x2!)],
      [null, "pending", null, null, "socket", "بانتظار قرار الحسم"]);
    await q(`INSERT INTO payments (patient_id, branch_id, amount, device_episode_id) VALUES ($1, $2, -100000, $3)`, [c, B1, c1]);
    //  ودفعةٌ للمريض بلا جهاز (علاجٌ طبيعيّ مثلاً) لا تُحسب على أيّ ورقة.
    await q(`INSERT INTO payments (patient_id, branch_id, amount) VALUES ($1, $2, 50000)`, [c, B1]);
    const [r1, r2] = ((await sheets(c, S.recv)).json?.sheets ?? []) as IntakeSheet[];
    same("ج.٤ **المدفوعُ من دفعات هذا الجهاز وحده** — والمردودُ صفٌّ سالب، ولا تُحسب دفعةُ جهازٍ آخر ولا دفعةٌ بلا جهاز",
      [r1?.money?.paid, r1?.money?.remaining, r2?.money?.paid], [400_000, 1_600_000, 0]);

    console.log("\n── د. «لم يشترِ» والإلغاء ──");
    const d = await sheetPatient("prosthetic", "حسين");
    const d1 = await openDevice(d, "prosthetic");
    await sign(d, "prosthetic", d1, "يحتاج طرفاً.", { ...RX, prostheticType: "طرف علوي" });
    const nb = await call("POST", `/api/followups/${await followupOf(d1)}/not-bought`, S.recv, { reason: "السعر مرتفع" });
    const sd = (await sheets(d, S.recv)).json?.sheets?.[0] as IntakeSheet;
    same("د.١ **«لم يشترِ» بسببه** — بلا رقم", [nb.status, sd?.decision?.kind, sd?.decision?.reason, sd?.money?.total, sheetMoneyLine(sd)],
      [200, "not_bought", "السعر مرتفع", null, "لم يشترِ — السعر مرتفع"]);
    const d2 = await openDevice(d, "prosthetic", "socket");
    await q(`UPDATE patient_device_episodes SET status = 'cancelled' WHERE id = $1`, [d2]);
    same("د.٢ والجهازُ الملغى لا ورقةَ له", ((await sheets(d, S.recv)).json?.sheets ?? []).map((s: IntakeSheet) => s.episodeId), [d1]);

    console.log("\n── هـ. المسند والعلاجُ الطبيعي ──");
    const m = await sheetPatient("medical_support", "زينب");
    const m1 = await openDevice(m, "medical_support");
    await sign(m, "medical_support", m1, "يحتاج مشدّ ظهر.", { supportType: "مشد ظهر طبي", injurySide: "يسار" });
    const sm = (await sheets(m, S.recv)).json?.sheets?.[0] as IntakeSheet;
    same("هـ.١ **المسندُ: نوعُه من المعاينة وجهتُه** — ولا خاناتِ طرف", [sm?.serviceType, sm?.specs?.supportType, sm?.supportType, sm?.injurySide, sm?.amputationSite],
      ["medical_support", "مشد ظهر طبي", "مشد ظهر طبي", "يسار", null]);
    const ph = await sheetPatient("physiotherapy", "علاج");
    same("هـ.٢ **والعلاجُ الطبيعيُّ لا استمارةَ أجهزةٍ له**", [(await sheets(ph, S.recv)).status, (await sheets(ph, S.recv)).json?.sheets], [200, []]);

    console.log("\n── و. مَن يرى المال، ومَن يرى الورقة ──");
    const doc = await sheets(a, S.doc);
    same("و.١ **الطبيبُ يرى الورقةَ كاملةً وخانةُ المبلغ مقفولة**",
      [doc.status, doc.json?.canViewMoney, doc.json?.sheets?.[0]?.money, doc.json?.sheets?.[0]?.exam?.doctorName, freeDeviceRows(doc.json?.sheets ?? []).length],
      [200, false, null, "د. سامر", 0]);
    const ex = await sheets(c, S.expert);
    same("و.٢ **والخبيرُ وحده لا يرى المال ولو حمل علَمَ الدفعات**", [ex.status, ex.json?.canViewMoney, ex.json?.sheets?.[0]?.money], [200, false, null]);
    const np = await sheets(c, S.recvNoPay);
    same("و.٣ ومَن لا يملك «عرض الدفعات» كذلك", [np.status, np.json?.sheets?.[0]?.money], [200, null]);
    const ad = await sheets(c, S.admin);
    same("و.٤ والمسؤولُ يرى", [ad.status, ad.json?.sheets?.[0]?.money?.paid], [200, 400_000]);
    const ot = await sheets(c, S.other);
    same("و.٥ **فرعٌ آخر لا يرى الورقة**", [ot.status, ot.json?.sheets ?? null], [403, null]);
    await q(`INSERT INTO patient_branch_access (patient_id, branch_id) VALUES ($1, $2)`, [c, B2]);
    same("و.٦ **إلّا إذا أُتيح له الملفّ**", (await sheets(c, S.other)).status, 200);
    await softDeletePatient({ patientId: d, reason: "ملفٌّ مكرَّر", actor: { userId: RECV, role: "admin", isAdmin: true, permissions: PAY, scope: null } });
    same("و.٧ **ولا تُفتح ورقةُ ملفٍّ في السلّة**، والمجهولُ ٤٠٤",
      [(await sheets(d, S.recv)).status, (await sheets(99_999_999, S.recv)).status], [409, 404]);
  } finally {
    httpServer.close();
    await cleanup();
    await pool.end();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
