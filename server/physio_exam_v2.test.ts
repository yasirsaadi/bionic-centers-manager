// «معاينةُ العلاج الطبيعي الإلزامية `BC-PT-02` واعتمادُ العلامة الحمراء» (§4.gz — قرارُ المالك ٢٠٢٦-١١-٢٧، ترحيل ١٩٨).
// `npm run test:physio-exam-v2` — القواعدُ الصرفة، ثمّ النقاطُ الحقيقية على Postgres محلّي: التوقيعُ الإلزاميّ والتنقيحُ القديم،
// والعلامةُ الحمراء (مَن يطلب ومَن يقرّر والملاحظتان والمرفوض والاعتمادُ في الخطوة نفسِها)، وبوّابةُ الوكيل، والحذفُ والدمج، وسطورُ التدقيق.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "physio-exam-v2-test-secret";

import express from "express";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { emptyInitialAssessment, readStoredAssessment, PT_FORM_CODE } from "@shared/physio_initial_assessment";
import {
  agentGateFor, emptyExamV2, examV2AgeConflict, examV2EnglishText, examV2Missing, forbiddenDevices, moduleFieldsOf, newestOtherExamReview, parseExamV2, PT_FORM_CODE_V2,
  redFlagQuestionsFor, redFlagsOf, V2_CORE_FIELDS, V2_MODULES, V2_RED_FLAGS, examV2Ctx, fieldApplies, type PhysioExamV2, type RedFlagReviewSummary,
} from "@shared/physio_exam_v2";
import { eligibleStaffEvents, REQUESTER_REPLY_EVENTS } from "@shared/staff_notifications";
import { examAgentGate } from "./physio_exam_reviews/store";
import { completeExamV2 } from "./test_fixtures/physio_exam_v2";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 7037;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-معاينة-إلزامية";
const B1 = 9901, B2 = 9902;
const SPEC = 9911, SUP = 9912, ADMIN = 9913, THER = 9914, SPEC2 = 9915;
const IDS = [SPEC, SUP, ADMIN, THER, SPEC2];
const TODAY = "2026-11-27";

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");
const fd = (a: unknown, today = TODAY) => forbiddenDevices(a, { today }).map((d) => d.deviceCode);

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_sub_source = $1`, [MARK])).rows.map((r) => Number(r.id));
  //  (الحذفُ نفسُه يُختبر في و.٢ — هنا تنظيفٌ لا يسقط إن عُطّل الكاسكيد في المراجعة العكسية.)
  await q(`DELETE FROM physio_exam_red_flag_reviews WHERE patient_id = ANY($1::int[])`, [pts]);
  for (const id of pts) await storage.deletePatient(id);
  await q(`DELETE FROM staff_notification_outbox WHERE event_type LIKE 'physio_exam_red_flag_%' AND (exclude_user_id = ANY($1::int[]) OR target_user_ids && $1::int[])`, [IDS]);
  await q(`DELETE FROM staff_notification_prefs WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = ANY($1::int[])`, [[B1, B2]]);
}

async function main() {
  // ══ ق. القواعدُ الصرفة ══
  console.log("\n── ق. القواعد ──");
  const empty = parseExamV2(emptyExamV2(), { today: TODAY, diagnosis: "" });
  check(empty.ok && empty.missing.includes("diagnosis") && empty.missing.includes("core.group") && empty.missing.includes("sensation")
    && empty.missing.filter((k) => k.startsWith("redFlags.")).length === 8,
    "ق.١ **الفارغةُ تُقبل شكلاً وكلُّ إلزاميّها ناقص**: التشخيصُ والمجموعةُ والإحساسُ والعلاماتُ العامّةُ الثماني", JSON.stringify(empty));
  const full = parseExamV2(completeExamV2(), { today: TODAY, diagnosis: "ألم أسفل الظهر" });
  same("ق.٢ والكاملةُ بلا ناقص — ورمزُها وإصدارُها", [full.ok, full.ok ? full.missing : null, full.ok ? full.value.form : null, full.ok ? full.value.version : null],
    [true, [], PT_FORM_CODE_V2, 2]);
  const missOf = (a: PhysioExamV2) => { const r = parseExamV2(a, { today: TODAY, diagnosis: "د" }); return r.ok ? r.missing : [`ERR:${r.error}`]; };
  same("ق.٣ **الحملُ للأنثى في سنّ الإنجاب وحدها**: رجل ⟵ لا يُسأل، وامرأةٌ في الثلاثين ⟵ الحملُ والإرضاع، وفي الستّين ⟵ لا",
    [missOf(completeExamV2()).filter((k) => /pregnan|breast/.test(k)),
      missOf(completeExamV2({ core: { sex: "female", ageYears: 30 } })).filter((k) => /pregnan|breast/.test(k)),
      missOf(completeExamV2({ core: { sex: "female", ageYears: 60 } })).filter((k) => /pregnan|breast/.test(k))],
    [[], ["core.pregnant", "core.breastfeeding"], []]);
  same("ق.٣ب وحاملٌ ⟵ شهرُ الحمل إلزاميّ",
    missOf(completeExamV2({ core: { sex: "female", ageYears: 30, pregnant: "yes", breastfeeding: "no" } })), ["core.pregnancyMonth"]);
  same("ق.٤ **سكّرُ الأساس لمريض الإنسولين وحده** — والحبوبُ تسأل عن اعتلال الأعصاب وحده",
    [missOf(completeExamV2({ core: { diabetes: "insulin" } })), missOf(completeExamV2({ core: { diabetes: "oral" } }))],
    [["core.neuropathy", "core.glucoseMgdl"], ["core.neuropathy"]]);
  same("ق.٥ **العمليةُ تفتح نوعَها وتاريخَها وتعليماتِ الجرّاح والمعدن** — وبلا عمليةٍ لا يُسأل المعدنُ في الظهر",
    [missOf(completeExamV2({ core: { surgery: "yes" } })), missOf(completeExamV2()).filter((k) => k.includes("metal"))],
    [["core.surgeryType", "core.surgeryDate", "core.surgeonInstructions", "core.metalInField"], []]);
  same("ق.٥ب والبترُ يسأل المعدنَ بلا عملية", missOf(completeExamV2({ core: { group: "amputation" }, module: {} })).includes("core.metalInField"), true);
  same("ق.٦ الرضيعُ دون السنتين ⟵ العمرُ المصحَّح إلزاميّ", missOf(completeExamV2({ core: { ageYears: 1 } })), ["core.correctedAgeMonths"]);
  same("ق.٧ **وحدةُ المجموعة**: الحالةُ إلزامية، والتضيّقُ يفتح نبضَ القدم ومسافةَ المشي",
    [missOf(completeExamV2({ module: { condition: null } })).filter((k) => k.startsWith("module.")),
      missOf(completeExamV2({ module: { condition: "stenosis" } })).filter((k) => k.startsWith("module."))],
    [["module.condition"], ["module.footPulses", "module.walkToSymptomsM"]]);
  const stripped = parseExamV2(completeExamV2({ core: { pregnant: "yes", surgeryType: "tka" }, module: { footPulses: "normal" } }), { today: TODAY, diagnosis: "د" });
  same("ق.٨ **ما لا ينطبق يُمحى ولا يُخزَّن**: حملٌ لرجل ونوعُ عمليةٍ بلا عملية ونبضُ قدمٍ لغير التضيّق",
    stripped.ok ? [stripped.value.core.pregnant, stripped.value.core.surgeryType, stripped.value.module.footPulses] : stripped.error, [null, null, null]);
  const badFac = parseExamV2(completeExamV2({ core: { fac: "9" } }), { today: TODAY });
  same("ق.٩ قيمةٌ غيرُ صالحة تُردّ وتُسمّى", badFac.ok ? null : badFac.missing, ["core.fac"]);
  const badPain = parseExamV2(completeExamV2({ core: { painNow: 9, painWorstWeek: 4 } }), { today: TODAY });
  same("ق.٩ب والألمُ الآن لا يزيد على الأسوأ في الأسبوع", badPain.ok ? null : badPain.missing, ["core.painNow"]);
  same("ق.٩ج والتاريخُ لا يكون في المستقبل", (parseExamV2(completeExamV2({ core: { onsetDate: "2099-01-01" } }), { today: TODAY }) as any).missing, ["core.onsetDate"]);
  same("ق.٩هـ **ويومٌ لا يوجد في التقويم يُردّ** (٣١ شباط و٣١ نيسان — مراجعةُ Codex على #770)، والسنةُ الكبيسة تمرّ",
    ["2025-02-31", "2025-04-31", "2024-02-29"].map((d) => (parseExamV2(completeExamV2({ core: { onsetDate: d } }), { today: TODAY }) as any).missing ?? "ERR"),
    [["core.onsetDate"], ["core.onsetDate"], []]);
  same("ق.٩د والأرقامُ العربية تُقرأ (٤٧ ⟵ 47)", (parseExamV2(completeExamV2({ core: { ageYears: "٤٧" as any } }), { today: TODAY }) as any).value?.core?.ageYears, 47);
  same("ق.١٠ **العلاماتُ العامّة ثمانٍ لكلّ مريض**، وما يخصّ المجموعة فوقها، والمقيَّدةُ بحالةٍ مع حالتها",
    [redFlagQuestionsFor("lumbar", null).filter((f) => f.groups === null).length, redFlagQuestionsFor("lumbar", null).length,
      redFlagQuestionsFor("neuro_adult", "sci").some((f) => f.key === "autonomic_dysreflexia"),
      redFlagQuestionsFor("neuro_adult", "ms").some((f) => f.key === "autonomic_dysreflexia")],
    [8, 11, true, false]);
  same("ق.١٠ب «لا جواب» علامةٌ ناقصة", missOf(completeExamV2({ redFlags: { cauda_equina: undefined as any } })), ["redFlags.cauda_equina"]);
  same("ق.١١ «نعم» بالأشدّ أوّلاً ومع كلٍّ إجراؤه",
    redFlagsOf(completeExamV2({ redFlags: { visceral: "yes", cauda_equina: "yes", infection: "yes" } })).map((h) => [h.key, h.urgency]),
    [["cauda_equina", "emergency"], ["infection", "same_day"], ["visceral", "urgent"]]);
  same("ق.١١ب ولكلّ علامةٍ مجموعاتٌ معروفة ومستوى", V2_RED_FLAGS.every((f) => (f.groups ?? []).every((g) => V2_MODULES.some((m) => m.group === g))
    && ["emergency", "same_day", "urgent", "routine"].includes(f.urgency) && f.actionAr.length > 5), true);
  same("ق.١٣ **العمرُ يطابق الملفّ حين يعبر الفرقُ حدَّ سلامة** (٢ · ١٢ · ١٨ · ٥٦) — وفرقُ سنةٍ أو فرقٌ لا يعبر حدّاً مقبول، والملفُّ غيرُ الرقميّ لا يُقارَن",
    [examV2AgeConflict(15, "46") !== null, examV2AgeConflict(60, "٣٠") !== null, examV2AgeConflict(19, "17") !== null, examV2AgeConflict(47, "46"),
      examV2AgeConflict(50, "46"), examV2AgeConflict(18, "17"), examV2AgeConflict(30, "غير معروف")],
    [true, true, true, null, null, null, null]);
  same("ق.١٢ **المجموعاتُ أربعَ عشرة وبروتوكولاتُها الأربعة والأربعون كلُّها**",
    [V2_MODULES.length, new Set(V2_MODULES.flatMap((m) => m.protocols)).size], [14, 44]);

  console.log("\n── م. مصفوفةُ الموانع الحتمية ──");
  same("م.١ منظّمُ الضربات ⟵ الكهربائيّ والمغناطيسُ والتيكارُ والموجات", fd(completeExamV2({ core: { implants: ["pacemaker"] } })), ["electro", "megnatik", "tecar", "shockwaves"]);
  same("م.٢ **الوارفارين يمنع الموجاتِ والإبر وحدهما — ولا قاعدةَ INR**، والأسبرينُ وحده لا يمنع",
    [fd(completeExamV2({ core: { anticoagulant: ["warfarin"] } })), fd(completeExamV2({ core: { anticoagulant: ["aspirin"] } }))], [["shockwaves", "needle"], []]);
  same("م.٣ الحملُ في أسفل الظهر ⟵ ومعه التحفيزُ فوق البطن والحوض",
    fd(completeExamV2({ core: { sex: "female", ageYears: 30, pregnant: "yes", pregnancyMonth: 5, breastfeeding: "no" } })),
    ["electro", "megnatik", "tecar", "traction", "shockwaves"]);
  same("م.٤ الإحساسُ الضعيف ⟵ الحرارةُ والموجات، والمعدومُ ⟵ والتحفيز",
    [fd(completeExamV2({ top: { sensation: "impaired", sensationRegions: "Left leg" } })), fd(completeExamV2({ top: { sensation: "absent", sensationRegions: "Left leg" } }))],
    [["tecar", "ultrasound", "shockwaves", "hot_pack", "wax", "infrared"], ["electro", "tecar", "ultrasound", "shockwaves", "hot_pack", "wax", "infrared"]]);
  const stroke = (fac: string, condition = "stroke") => completeExamV2({ core: { group: "neuro_adult", fac }, module: condition === "stroke"
    ? { condition, strokeType: "ischemic", doctorClearance: "yes" } : { condition, sciLevel: "T10", ais: "C", pressureUlcer: "none" } });
  same("م.٥ **الروبوتُ ممنوعٌ لمن يمشي في الجلطة وحدها** — والحبلُ الشوكيّ بقاعدة بروتوكوله (نقدُ التصميم §أ.٥)",
    [fd(stroke("4")).includes("robotik"), fd(stroke("1")).includes("robotik"), fd(stroke("4", "sci")).includes("robotik")], [true, false, false]);
  same("م.٦ المعدنُ ⟵ التيكار، والمفصلُ الصناعيّ ⟵ والأمواج",
    fd(completeExamV2({ core: { surgery: "yes", surgeryType: "tka", surgeryDate: "2026-01-01", surgeonInstructions: "yes", metalInField: "yes", metalTypes: ["joint_replacement"] } })),
    ["tecar", "ultrasound"]);
  const achilles = (tendonType: string, steroid?: string) => completeExamV2({
    core: { group: "foot_ankle", ...(steroid ? { steroidInjection: "yes", steroidInjectionDate: steroid } : { steroidInjection: "no" }) },
    module: { condition: "achilles", tendonType, priorRupture: "no" } });
  same("م.٧ الوترُ الارتكازيّ ⟵ لا موجات، وحقنةٌ قبل أسبوعين ⟵ لا موجات، وقبل شهرين تُسمح",
    [fd(achilles("insertional")), fd(achilles("midportion", "2026-11-13")), fd(achilles("midportion", "2026-09-27"))], [["shockwaves"], ["shockwaves"], []]);
  same("م.٨ **دون ١٨ سنة** ⟵ الموجاتُ والأمواجُ والليزر (صفائحُ النموّ)", fd(completeExamV2({ core: { ageYears: 15 } })), ["laser", "ultrasound", "shockwaves"]);
  same("م.٩ الصرعُ غيرُ المضبوط ⟵ التحفيز، والمضبوطُ لا", [fd(completeExamV2({ core: { epilepsy: "uncontrolled" } })), fd(completeExamV2({ core: { epilepsy: "controlled" } }))], [["electro"], []]);
  const ms = completeExamV2({ core: { group: "neuro_adult" }, module: { condition: "ms", edss: 4.5, heatSensitive: "yes" } });
  same("م.١٠ التصلّبُ اللويحيّ مع الحرارة ⟵ أجهزةُ الحرارة", fd(ms), ["tecar", "ultrasound", "hot_pack", "wax", "infrared"]);
  const cuff = (surgeryDate: string) => completeExamV2({ core: { group: "shoulder", surgery: "yes", surgeryType: "rotator_cuff", surgeryDate, surgeonInstructions: "yes", metalInField: "no", steroidInjection: "no" },
    module: { condition: "cuff_repair", passiveErAffected: 30, passiveErOther: 80, activeElevation: 90, nightPain: 3, tearSize: "medium", subscapRepair: "no" } });
  same("م.١١ إصلاحُ الكفّة قبل الأسبوع ١٢ ⟵ لا موجات، وبعده تُسمح", [fd(cuff("2026-10-01")), fd(cuff("2026-06-01"))], [["shockwaves"], []]);
  same("م.١٣ **وأيُّ جهازٍ مزروع يمنع الموجاتِ الصادمة** (CONTRA ترحيل ١٣١: «a pacemaker or implanted device») — لا المنظّمُ والمزيلُ وحدهما",
    [fd(completeExamV2({ core: { implants: ["dbs"] } })), fd(completeExamV2({ core: { implants: ["spinal_stim"] } })), fd(completeExamV2({ core: { implants: ["other"], implantsOther: "مضخّة" } }))],
    [["electro", "megnatik", "tecar", "ultrasound", "shockwaves"], ["megnatik", "shockwaves"], ["shockwaves"]]);
  const heel = (steroidDate: string) => completeExamV2({ core: { group: "foot_ankle", steroidInjection: "yes", steroidInjectionDate: steroidDate }, module: { condition: "plantar_heel" } });
  same("م.١٤ **وموضعُ حقنة الكورتيزون بلا مهلةٍ مكتوبة لحالته يمنع الموجات** (CONTRA ١٣١: «a site of corticosteroid injection») — ولو قبل سنة",
    [fd(heel("2026-11-20")), fd(heel("2025-11-01"))], [["shockwaves"], ["shockwaves"]]);
  same("م.١٢ والنظيفُ بلا مانع، ولكلّ ممنوعٍ سببُه بالعربية",
    [fd(completeExamV2()), forbiddenDevices(completeExamV2({ core: { implants: ["dbs"] } }), { today: TODAY }).every((d) => /[؀-ۿ]/.test(d.reasonAr))], [[], true]);

  console.log("\n── ك. البوّابةُ والنصّ والقراءة ──");
  const okA = completeExamV2();
  const flagged = completeExamV2({ redFlags: { cauda_equina: "yes" } });
  const appr: RedFlagReviewSummary = { id: 1, status: "approved", flags: [{ key: "cauda_equina", questionAr: "", actionAr: "", urgency: "emergency" }], examinerNote: "x", decisionNote: "بلا شدّ", requestedById: null, requestedByName: null, requestedAt: null, decidedByName: null, decidedAt: null };
  same("ك.١ **بوّابةُ الوكيل**: كاملةٌ بلا علامة ⟵ مسموح · بعلامةٍ بلا طلب ⟵ لا · معتمَدةٌ تغطّيها ⟵ مسموح · مرفوضة ⟵ لا · تغيّرت ⟵ لا · الأولى ⟵ لا · ملغاة ⟵ لا",
    [agentGateFor({ assessment: okA, diagnosis: "د", cancelled: false, review: null }).code,
      agentGateFor({ assessment: flagged, diagnosis: "د", cancelled: false, review: null }).code,
      agentGateFor({ assessment: flagged, diagnosis: "د", cancelled: false, review: appr }).allowed,
      agentGateFor({ assessment: flagged, diagnosis: "د", cancelled: false, review: { ...appr, status: "rejected" } }).code,
      agentGateFor({ assessment: completeExamV2({ redFlags: { cauda_equina: "yes", infection: "yes" } }), diagnosis: "د", cancelled: false, review: appr }).code,
      agentGateFor({ assessment: emptyInitialAssessment(), diagnosis: "د", cancelled: false, review: null }).code,
      agentGateFor({ assessment: okA, diagnosis: "د", cancelled: true, review: null }).code,
      agentGateFor({ assessment: okA, diagnosis: "", cancelled: false, review: null }).code],
    ["clear", "red_flag_unreviewed", true, "red_flag_rejected", "red_flag_changed", "not_v2", "exam_cancelled", "incomplete"]);
  same("ك.١ب **المعلَّقُ والمرفوضُ يوقفانها ولو مُحيت العلامات بتنقيح** (مراجعةُ المرحلة الأولى) — والمعتمَدُ ثمّ المحوُ يفتحها",
    [agentGateFor({ assessment: okA, diagnosis: "د", cancelled: false, review: { ...appr, status: "pending", decisionNote: null } }).code,
      agentGateFor({ assessment: okA, diagnosis: "د", cancelled: false, review: { ...appr, status: "rejected" } }).code,
      agentGateFor({ assessment: okA, diagnosis: "د", cancelled: false, review: appr }).code],
    ["red_flag_pending", "red_flag_rejected", "clear"]);
  const rv = (id: number, status: RedFlagReviewSummary["status"]): RedFlagReviewSummary => ({ ...appr, id, status });
  same("ك.١ج **وعلى مستوى المريض**: الأحدثُ معلَّقاً أو مرفوضاً على معاينةٍ أخرى يوقف معاينةً نظيفة، والأحدثُ معتمَداً أو على المعاينة نفسِها لا",
    [newestOtherExamReview(new Map([[10, rv(5, "rejected")]]), 11), newestOtherExamReview(new Map([[10, rv(5, "rejected")], [11, rv(7, "approved")]]), 11),
      newestOtherExamReview(new Map([[10, rv(8, "approved")]]), 11), newestOtherExamReview(new Map([[11, rv(9, "pending")]]), 11),
      agentGateFor({ assessment: okA, diagnosis: "د", cancelled: false, review: null, otherExamReview: { examId: 10, status: "rejected" } }).code],
    [{ examId: 10, status: "rejected" }, null, null, null, "red_flag_other_exam"]);
  const rich = completeExamV2({ core: { surgery: "yes", surgeryType: "spine", surgeryDate: "2025-01-01", surgeonInstructions: "yes", metalInField: "yes", metalTypes: ["spinal_fixation"] } });
  const text = examV2EnglishText(rich, { today: TODAY });
  const ctx = examV2Ctx(rich);
  const absent = [...V2_CORE_FIELDS.filter((f) => fieldApplies(f, ctx)).map((f) => f.en), ...moduleFieldsOf("lumbar").filter((f) => fieldApplies(f, ctx)).map((f) => f.en),
    ...redFlagQuestionsFor("lumbar", "nonspecific").map((f) => f.key)].filter((label) => !text.includes(label));
  same("ك.٢ **النصُّ الإنجليزيّ للوكيل فيه كلُّ خانةٍ ظاهرة** (النواةُ ووحدةُ المجموعة والعلاماتُ بأجوبتها) والموانعُ والأقسامُ المُعادة",
    [absent, text.includes("Deterministic contraindications"), text.includes("Sensation: Intact"), /Derived acuity: Chronic/.test(text)], [[], true, true, true]);
  same("ك.٣ **`readStoredAssessment` يقرأ الاستمارتين**", [readStoredAssessment(okA)?.form, readStoredAssessment(emptyInitialAssessment())?.form, readStoredAssessment({ form: "X" })],
    [PT_FORM_CODE_V2, PT_FORM_CODE, null]);
  same("ك.٤ **تنبيهُ العلامة الحمراء للمعتمِد، وقرارُها لكاتب المعاينة** — والقرارُ ردٌّ يصل طالبه",
    [eligibleStaffEvents({ role: "branch_manager", canSupervisePhysio: true }).filter((k) => k.startsWith("physio_exam_red_flag")),
      eligibleStaffEvents({ role: "physio_specialist" }).filter((k) => k.startsWith("physio_exam_red_flag")),
      eligibleStaffEvents({ role: "therapist" }).filter((k) => k.startsWith("physio_exam_red_flag")),
      REQUESTER_REPLY_EVENTS.includes("physio_exam_red_flag_decided")],
    [["physio_exam_red_flag_pending", "physio_exam_red_flag_decided"], ["physio_exam_red_flag_decided"], [], true]);

  // ══ النقاطُ الحقيقية ══
  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع المعاينة الإلزامية'), ($2, 'فرعٌ آخر للمعاينة')`, [B1, B2]);
  const users: [number, string, Record<string, unknown>][] = [
    [SPEC, "physio_specialist", {}], [SPEC2, "physio_specialist", {}],
    [SUP, "branch_manager", { can_supervise_physio: true }], [ADMIN, "admin", {}], [THER, "therapist", {}],
  ];
  for (const [id, role, extra] of users) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_view_patients)
             VALUES ($1, $2, 'x', $3, $4, $5, $6::jsonb, true, true)`, [id, `pev2-${id}`, `مستخدم ${id}`, role, B1, JSON.stringify([B1])]);
    for (const [k, v] of Object.entries(extra)) await q(`UPDATE system_users SET ${k} = $2 WHERE id = $1`, [id, v]);
  }
  const sess = (id: number, role: string, perms: Record<string, unknown> = {}) => hdr({
    userId: id, displayName: `م ${id}`, role, roles: [role], branchId: B1, accessibleBranches: [B1], isAdmin: role === "admin",
    permissions: { canViewPatients: true, ...perms },
  });
  const S = {
    spec: sess(SPEC, "physio_specialist"), spec2: sess(SPEC2, "physio_specialist"),
    sup: sess(SUP, "branch_manager", { canSupervisePhysio: true }), admin: sess(ADMIN, "admin"), ther: sess(THER, "therapist"),
  };

  const app = express();
  app.use(express.json({ limit: "2mb" }));
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
  async function physioPatient(label: string) {
    seq += 1;
    const pid = (await q(`INSERT INTO patients (name, phone, referral_source, referral_sub_source, age, height, weight, medical_condition,
        branch_id, is_physiotherapy, total_cost, patient_classification, governorate, address, injury_cause, injury_date, presenting_complaint)
      VALUES ($1, $2, 'من شخص آخر', $3, '46', '172', '88', 'physiotherapy', $4, true, 0, 'new', 'بغداد', 'الكرادة', 'الجلوس', '2026-05-01', 'ألم الظهر') RETURNING id`,
      [`${label} ${MARK}`, `0773${String(5000000 + seq * 7919).slice(0, 7)}`, MARK, B1])).rows[0].id;
    await storage.syncPatientCases(pid);
    return Number(pid);
  }
  const examBody = (over: Record<string, unknown> = {}) => ({
    idempotencyKey: randomUUID(), caseType: "physiotherapy", chiefComplaint: "", clinicalFindings: "", plan: "", notes: "ملاحظة الفاحص",
    diagnosis: "ألم أسفل الظهر المزمن غير النوعي",
    prescription: { treatments: [{ treatmentType: "تمارين تأهيلية", sessionCount: 12 }] },
    assessment: completeExamV2(),
    ...over,
  });
  const examCount = async (pid: number) => Number((await q(`SELECT count(*) FROM medical_exams WHERE patient_id = $1`, [pid])).rows[0].count);
  const examsOf = async (pid: number, s = S.spec) => (await call("GET", `/api/medical/patients/${pid}/exams`, s)).json;
  const audits = async (entityId: number) => (await q(`SELECT action, user_id FROM audit_log WHERE entity_type = 'physio_exam_red_flag_review' AND entity_id = $1 ORDER BY id`, [entityId])).rows
    .map((r) => [r.action, Number(r.user_id)]);
  const outbox = async (event: string, since: number) => (await q(`SELECT target_user_ids, exclude_user_id, link_path, text FROM staff_notification_outbox
      WHERE event_type = $1 AND id > $2 ORDER BY id`, [event, since])).rows;
  const maxOutbox = async () => Number((await q(`SELECT COALESCE(max(id), 0) AS m FROM staff_notification_outbox`)).rows[0].m);

  try {
    console.log("\n── ب. التوقيع: الجديدةُ إلزامية ──");
    const p1 = await physioPatient("علي");
    const v1Sign = await call("POST", `/api/medical/patients/${p1}/exams`, S.spec, examBody({ assessment: { ...emptyInitialAssessment(), painBest: 2, painWorst: 6, sensation: "intact", plan: ["rom"] } }));
    same("ب.١ **الاستمارةُ الأولى في توقيعٍ جديد ⟵ ٤٠٠ `assessment_incomplete` بقائمة الناقص** ولا صفّ",
      [v1Sign.status, v1Sign.json?.code, Array.isArray(v1Sign.json?.missing) && v1Sign.json.missing.includes("core.group"), await examCount(p1)], [400, "assessment_incomplete", true, 0]);
    const noAssess = await call("POST", `/api/medical/patients/${p1}/exams`, S.spec, examBody({ assessment: undefined }));
    same("ب.٢ وبلا استمارة (عميلٌ قديم) ⟵ ٤٠٠ كذلك", [noAssess.status, noAssess.json?.code, await examCount(p1)], [400, "assessment_incomplete", 0]);
    const partial = await call("POST", `/api/medical/patients/${p1}/exams`, S.spec, examBody({ assessment: completeExamV2({ core: { weightKg: null, sex: "female", ageYears: 30 } }) }));
    same("ب.٣ **والناقصُ يُسمّى بمفتاحه واسمه العربيّ**", [partial.status, partial.json?.code, partial.json?.missing, partial.json?.missingLabels],
      [400, "assessment_incomplete", ["core.pregnant", "core.breastfeeding", "core.weightKg"], ["حامل", "ترضع", "الوزن"]]);
    const noDx = await call("POST", `/api/medical/patients/${p1}/exams`, S.spec, examBody({ diagnosis: " " }));
    same("ب.٣ب **والتشخيصُ نصّاً إلزاميّ** (كان لا يمنع في الأولى)", [noDx.status, noDx.json?.missing], [400, ["diagnosis"]]);
    const invalid = await call("POST", `/api/medical/patients/${p1}/exams`, S.spec, examBody({ assessment: completeExamV2({ core: { fac: "7" } }) }));
    same("ب.٤ وقيمةٌ غيرُ صالحة ⟵ `assessment_invalid`", [invalid.status, invalid.json?.code, invalid.json?.missing, await examCount(p1)], [400, "assessment_invalid", ["core.fac"], 0]);
    const youngTyped = await call("POST", `/api/medical/patients/${p1}/exams`, S.spec, examBody({ assessment: completeExamV2({ core: { ageYears: 15 } }) }));
    same("ب.٤ب **والعمرُ يخالف عمرَ الملفّ عبر حدّ سلامة** (١٥ والملفُّ ٤٦ — صفائحُ النموّ) ⟵ ٤٠٠ يسمّي العمر، ولا صفّ",
      [youngTyped.status, youngTyped.json?.code, youngTyped.json?.missing, /عمرَ الملفّ/.test(youngTyped.json?.error ?? ""), await examCount(p1)],
      [400, "assessment_invalid", ["core.ageYears"], true, 0]);

    const key = randomUUID();
    const body = examBody({ idempotencyKey: key, assessment: completeExamV2({ core: { pregnant: "yes" } }) });
    const ok = await call("POST", `/api/medical/patients/${p1}/exams`, S.spec, body);
    const row = (await q(`SELECT assessment, diagnosis FROM medical_exams WHERE id = $1`, [ok.json?.id])).rows[0];
    same("ب.٥ **الكاملةُ تُوقَّع**: الرمزُ والنواةُ والوحدةُ والعلاماتُ مختومةٌ مع المعاينة، وما لا ينطبق ممحوّ",
      [ok.status, row?.assessment?.form, row?.assessment?.core?.group, row?.assessment?.module?.startBack, row?.assessment?.redFlags?.cauda_equina,
        row?.assessment?.core?.pregnant, row?.assessment?.painBest, Boolean(row?.assessment?.onsetAtSigning)],
      [200, PT_FORM_CODE_V2, "lumbar", "medium", "no", null, null, true]);
    const replay = await call("POST", `/api/medical/patients/${p1}/exams`, S.spec, body);
    same("ب.٦ إعادةُ الإرسال بالمفتاح نفسِه ⟵ الصفُّ نفسُه", [replay.status, replay.json?.id, replay.json?.created, await examCount(p1)], [200, ok.json?.id, false, 1]);
    const conflict = await call("POST", `/api/medical/patients/${p1}/exams`, S.spec, { ...body, assessment: completeExamV2({ core: { painNow: 2 } }) });
    same("ب.٧ **والمفتاحُ نفسُه بمحتوى ثانيةٍ آخر تعارضٌ** — المحتوى الإلزاميّ جزءٌ من بصمة التطابق", [conflict.status, conflict.json?.code], [409, "idempotency_conflict"]);
    const g1 = await examsOf(p1);
    same("ب.٨ ملفُّ المريض يقرأ الثانيةَ وبوّابتَها: «بلا علاماتٍ حمراء» ولا طلب",
      [g1?.exams?.[0]?.assessment?.form, g1?.exams?.[0]?.agentGate?.code, g1?.exams?.[0]?.redFlagReview, g1?.canApproveRedFlags], [PT_FORM_CODE_V2, "clear", null, false]);
    const sheet = (await call("GET", `/api/patients/${p1}/physio-sheet`, S.admin)).json;
    same("ب.٩ **وورقةُ العلاج الطبيعي تقرأ الثانية** بسطرها", [sheet?.exams?.[0]?.assessment?.form, /أسفل الظهر/.test(sheet?.exams?.[0]?.assessmentSummary ?? "")], [PT_FORM_CODE_V2, true]);

    console.log("\n── ج. التنقيح: القديمُ كما كان، والثانيةُ كاملة ──");
    const p2 = await physioPatient("قديم");
    const caseId = Number((await q(`SELECT id FROM patient_cases WHERE patient_id = $1 AND case_type = 'physiotherapy'`, [p2])).rows[0].id);
    const oldV1 = { ...emptyInitialAssessment(), painBest: 2, painWorst: 6, sensation: "intact", plan: ["rom"] };
    const v1Id = Number((await q(`INSERT INTO medical_exams (patient_id, case_id, case_type, branch_id, doctor_id, doctor_name, diagnosis, prescription, assessment)
      VALUES ($1, $2, 'physiotherapy', $3, $4, 'أخصائيّ', 'قديم', '{}'::jsonb, $5::jsonb) RETURNING id`, [p2, caseId, B1, SPEC, JSON.stringify(oldV1)])).rows[0].id);
    const reV1 = await call("PATCH", `/api/medical/exams/${v1Id}`, S.spec, { caseType: "physiotherapy", notes: "x", diagnosis: "قديم", prescription: {},
      assessment: { ...oldV1, sensation: null, plan: [] } });
    same("ج.١ **معاينةٌ قديمة (`BC-PT-01`) تُنقَّح كما كانت بلا إلزام**", [reV1.status, (await q(`SELECT version, assessment FROM medical_exams WHERE id = $1`, [v1Id])).rows.map((r) => [r.version, r.assessment.form, r.assessment.sensation])[0]],
      [200, [2, PT_FORM_CODE, null]]);
    const upgradeBad = await call("PATCH", `/api/medical/exams/${v1Id}`, S.spec, { caseType: "physiotherapy", notes: "x", diagnosis: "قديم", prescription: {}, assessment: completeExamV2({ core: { group: null } }) });
    same("ج.٢ ومَن رقّاها إلى الثانية يُفحَص بإلزامها", [upgradeBad.status, upgradeBad.json?.code], [400, "assessment_incomplete"]);
    const upgrade = await call("PATCH", `/api/medical/exams/${v1Id}`, S.spec, { caseType: "physiotherapy", notes: "x", diagnosis: "قديم", prescription: {}, assessment: completeExamV2() });
    same("ج.٣ والكاملةُ ترقّيها", [upgrade.status, (await q(`SELECT assessment FROM medical_exams WHERE id = $1`, [v1Id])).rows[0].assessment.form], [200, PT_FORM_CODE_V2]);
    const v2Id = Number(ok.json?.id);
    const down = await call("PATCH", `/api/medical/exams/${v2Id}`, S.spec, { caseType: "physiotherapy", notes: "x", diagnosis: "د", prescription: {}, assessment: oldV1 });
    same("ج.٤ **والثانيةُ لا تعود إلى الأولى** — ٤٠٠ بلا نسخة", [down.status, down.json?.code, (await q(`SELECT version FROM medical_exams WHERE id = $1`, [v2Id])).rows[0].version],
      [400, "assessment_invalid", 1]);
    const v2Partial = await call("PATCH", `/api/medical/exams/${v2Id}`, S.spec, { caseType: "physiotherapy", notes: "x", diagnosis: "د", prescription: {}, assessment: completeExamV2({ core: { botox: null } }) });
    same("ج.٥ والثانيةُ ناقصةً في التنقيح ⟵ ٤٠٠", [v2Partial.status, v2Partial.json?.missing], [400, ["core.botox"]]);
    const v2Rev = await call("PATCH", `/api/medical/exams/${v2Id}`, S.spec, { caseType: "physiotherapy", notes: "x", diagnosis: "د", prescription: {}, assessment: completeExamV2({ core: { painNow: 3 } }) });
    same("ج.٦ وكاملةً تُنقَّح والنسخةُ السابقة محفوظة", [v2Rev.status, (await q(`SELECT version, assessment FROM medical_exams WHERE id = $1`, [v2Id])).rows[0].assessment.core.painNow,
      (await q(`SELECT assessment FROM medical_exam_revisions WHERE exam_id = $1 ORDER BY version DESC LIMIT 1`, [v2Id])).rows[0].assessment.core.painNow], [200, 3, 5]);
    const noDxRev = await call("PATCH", `/api/medical/exams/${v2Id}`, S.spec, { caseType: "physiotherapy", notes: "x", prescription: {} });
    same("ج.٧ **وتنقيحٌ بلا تقييمٍ يُبقي المخزَّن لا يمحو التشخيصَ الإلزاميّ** — ٤٠٠ يسمّيه، بلا نسخةٍ جديدة",
      [noDxRev.status, noDxRev.json?.code, noDxRev.json?.missing, (await q(`SELECT version, diagnosis FROM medical_exams WHERE id = $1`, [v2Id])).rows.map((r) => [r.version, r.diagnosis])[0]],
      [400, "assessment_incomplete", ["diagnosis"], [2, "د"]]);

    console.log("\n── د. العلامةُ الحمراء: الطلبُ والقرار ──");
    const p3 = await physioPatient("ذيل الفرس");
    const red = await call("POST", `/api/medical/patients/${p3}/exams`, S.spec, examBody({ assessment: completeExamV2({ redFlags: { cauda_equina: "yes" } }) }));
    const redId = Number(red.json?.id);
    same("د.١ **معاينةٌ بعلامةٍ حمراء تُحفظ** — والوكيلُ موقوف بلا طلب", [red.status, (await examsOf(p3))?.exams?.[0]?.agentGate?.code], [200, "red_flag_unreviewed"]);
    const byTher = await call("POST", `/api/physio/exams/${redId}/red-flag-review`, S.ther, { examinerNote: "قديم" });
    const bySpec2 = await call("POST", `/api/physio/exams/${redId}/red-flag-review`, S.spec2, { examinerNote: "قديم" });
    same("د.٢ **لا يرسلها للاعتماد إلّا كاتبُها أو معتمِد**: المعالجُ وأخصائيٌّ آخر ⟵ ٤٠٣", [byTher.status, byTher.json?.code, bySpec2.status, bySpec2.json?.code],
      [403, "not_examiner", 403, "not_examiner"]);
    const noNote = await call("POST", `/api/physio/exams/${redId}/red-flag-review`, S.spec, { examinerNote: "  " });
    same("د.٣ **ملاحظةُ الفاحص إلزامية**", [noNote.status, noNote.json?.code], [400, "examiner_note_required"]);
    const specSelf = await call("POST", `/api/physio/exams/${redId}/red-flag-review`, S.spec, { examinerNote: "قديم", decision: "approve", decisionNote: "x" });
    same("د.٤ وكاتبٌ ليس معتمِداً لا يقرّر في الخطوة نفسِها", [specSelf.status, specSelf.json?.code], [403, "not_approver"]);
    const before = await maxOutbox();
    const req1 = await call("POST", `/api/physio/exams/${redId}/red-flag-review`, S.spec, { examinerNote: "الخدر قديم منذ العملية ولم يتغيّر، ولا احتباس." });
    const pendingRows = await outbox("physio_exam_red_flag_pending", before);
    same("د.٥ **«أرسل للاعتماد»** ⟵ طلبٌ معلَّق بلقطة العلامات، وسطرُ تدقيق، وتلغرامُ المعتمِدين عامّاً بلا الفاحص وإلى صفحة الاعتمادات",
      [req1.status, req1.json?.status, req1.json?.flags?.map((f: any) => f.key), await audits(req1.json?.id),
        pendingRows.length, pendingRows[0]?.exclude_user_id, pendingRows[0]?.link_path, /الخدر قديم/.test(pendingRows[0]?.text ?? ""), (await examsOf(p3))?.exams?.[0]?.agentGate?.code],
      [201, "pending", ["cauda_equina"], [["request", SPEC]], 1, SPEC, "/physio/approvals", true, "red_flag_pending"]);
    const again = await call("POST", `/api/physio/exams/${redId}/red-flag-review`, S.spec, { examinerNote: "ثانية" });
    same("د.٦ **طلبٌ مفتوحٌ واحد لكلّ معاينة**", [again.status, again.json?.code], [409, "review_pending"]);
    const listTher = await call("GET", "/api/physio/red-flag-reviews", S.ther);
    const listSup = await call("GET", "/api/physio/red-flag-reviews", S.sup);
    const count = await call("GET", "/api/physio/red-flag-reviews/pending-count", S.sup);
    same("د.٧ القائمةُ والشارةُ للمعتمِد وحده", [listTher.status, (listSup.json?.rows ?? []).some((r: any) => r.examId === redId), count.json?.count >= 1,
      (await call("GET", "/api/physio/red-flag-reviews/pending-count", S.ther)).status], [403, true, true, 403]);
    const decTher = await call("POST", `/api/physio/red-flag-reviews/${req1.json?.id}/decide`, S.ther, { decision: "approve", note: "x" });
    const decSpec = await call("POST", `/api/physio/red-flag-reviews/${req1.json?.id}/decide`, S.spec, { decision: "approve", note: "x" });
    same("د.٨ **القرارُ للمعتمِد وحده** — المعالجُ والفاحصُ نفسُه ⟵ ٤٠٣", [decTher.status, decSpec.status, decSpec.json?.code], [403, 403, "not_approver"]);
    const decNoNote = await call("POST", `/api/physio/red-flag-reviews/${req1.json?.id}/decide`, S.sup, { decision: "approve", note: " " });
    same("د.٩ **ملاحظةُ الاعتماد إلزامية**", [decNoNote.status, decNoNote.json?.code], [400, "decision_note_required"]);
    const b2 = await maxOutbox();
    const approve = await call("POST", `/api/physio/red-flag-reviews/${req1.json?.id}/decide`, S.sup, { decision: "approve", note: "رنين قبل شهر بلا انضغاط. بلا شدّ ولا تقويم." });
    const decided = await outbox("physio_exam_red_flag_decided", b2);
    const gate = await examAgentGate(redId);
    same("د.١٠ **الاعتماد** ⟵ سطرُ تدقيق، وتلغرامٌ موجَّهٌ إلى الفاحص وحده، والبوّابةُ تفتح وملاحظةُ الاعتماد قيدٌ للوكيل",
      [approve.status, approve.json?.status, await audits(req1.json?.id), decided.map((r) => r.target_user_ids), gate.allowed, gate.code, gate.decisionNote],
      [200, "approved", [["request", SPEC], ["approve", SUP]], [[SPEC]], true, "red_flag_approved", "رنين قبل شهر بلا انضغاط. بلا شدّ ولا تقويم."]);
    const twice = await call("POST", `/api/physio/red-flag-reviews/${req1.json?.id}/decide`, S.sup, { decision: "reject", note: "x" });
    same("د.١١ والمحسومُ لا يُحسم ثانيةً", [twice.status, twice.json?.code], [409, "review_decided"]);
    const already = await call("POST", `/api/physio/exams/${redId}/red-flag-review`, S.spec, { examinerNote: "ثانية" });
    same("د.١٢ والمعتمَدةُ لا تُطلب ثانيةً ما لم تتغيّر العلامات", [already.status, already.json?.code], [409, "already_approved"]);
    const clean = await call("POST", `/api/physio/exams/${v2Id}/red-flag-review`, S.spec, { examinerNote: "لا شيء" });
    same("د.١٣ وبلا علامةٍ حمراء لا طلب", [clean.status, clean.json?.code], [409, "no_red_flags"]);

    //  التنقيحُ يضيف علامةً ⟵ الاعتمادُ القديم لا يغطّيها.
    await call("PATCH", `/api/medical/exams/${redId}`, S.spec, { caseType: "physiotherapy", notes: "x", diagnosis: "د", prescription: {},
      assessment: completeExamV2({ redFlags: { cauda_equina: "yes", infection: "yes" } }) });
    same("د.١٤ **علامةٌ أُضيفت بتنقيحٍ بعد الاعتماد** ⟵ «تغيّرت» والوكيلُ موقوفٌ حتى اعتمادٍ جديد", (await examAgentGate(redId)).code, "red_flag_changed");
    const reReq = await call("POST", `/api/physio/exams/${redId}/red-flag-review`, S.spec, { examinerNote: "حمّى جديدة" });
    same("د.١٤ب ويُطلب اعتمادُها", [reReq.status, reReq.json?.flags?.map((f: any) => f.key)], [201, ["cauda_equina", "infection"]]);
    const cleared = await call("PATCH", `/api/medical/exams/${redId}`, S.spec, { caseType: "physiotherapy", notes: "x", diagnosis: "د", prescription: {}, assessment: completeExamV2() });
    same("د.١٥ **«لا» بتنقيحٍ والطلبُ معلَّق لا تفتح البوّابة** (مراجعةُ المرحلة الأولى) — يقرّر المعتمِدُ وحده",
      [cleared.status, (await examAgentGate(redId)).code], [200, "red_flag_pending"]);
    const countBefore = (await call("GET", "/api/physio/red-flag-reviews/pending-count", S.sup)).json?.count;
    const cancelled = await call("POST", `/api/medical/exams/${redId}/cancel`, S.spec, { reason: "معاينةٌ على المريض الخطأ" });
    same("د.١٦ **ومعاينةٌ أُلغيت وطلبُها معلَّق تخرج من «اعتمادات العلاج الطبيعي» وشارتها** — لا يبقى ما لا يُحسم",
      [cancelled.status < 300, ((await call("GET", "/api/physio/red-flag-reviews", S.sup)).json?.rows ?? []).some((r: any) => r.examId === redId),
        (await call("GET", "/api/physio/red-flag-reviews/pending-count", S.sup)).json?.count, (await examAgentGate(redId)).code],
      [true, false, countBefore - 1, "exam_cancelled"]);

    console.log("\n── هـ. الرفض والاعتمادُ في الخطوة نفسِها ──");
    const p4 = await physioPatient("رفض");
    const red2 = await call("POST", `/api/medical/patients/${p4}/exams`, S.spec, examBody({ assessment: completeExamV2({ redFlags: { cancer_suspicion: "yes" } }) }));
    const r2 = await call("POST", `/api/physio/exams/${red2.json?.id}/red-flag-review`, S.spec, { examinerNote: "نقص وزن" });
    const rej = await call("POST", `/api/physio/red-flag-reviews/${r2.json?.id}/decide`, S.admin, { decision: "reject", note: "إلى الطبيب أوّلاً" });
    same("هـ.١ **الرفض** ⟵ تتوقّف والبوّابةُ مغلقة", [rej.status, rej.json?.status, (await examAgentGate(Number(red2.json?.id))).code], [200, "rejected", "red_flag_rejected"]);
    const reAfterRej = await call("POST", `/api/physio/exams/${red2.json?.id}/red-flag-review`, S.spec, { examinerNote: "ثانية" });
    same("هـ.٢ **والمرفوضُ لا يعود بيد الفاحص**", [reAfterRej.status, reAfterRej.json?.code], [403, "rejected_needs_approver"]);
    const red2Id = Number(red2.json?.id);
    const unflag = await call("PATCH", `/api/medical/exams/${red2Id}`, S.spec, { caseType: "physiotherapy", notes: "x", diagnosis: "د", prescription: {}, assessment: completeExamV2() });
    same("هـ.٢ب **وقلبُ «نعم» إلى «لا» بعد الرفض لا يفتحها** (مراجعةُ المرحلة الأولى)", [unflag.status, (await examAgentGate(red2Id)).code], [200, "red_flag_rejected"]);
    const fresh = await call("POST", `/api/medical/patients/${p4}/exams`, S.spec, examBody());
    same("هـ.٢ج **ولا معاينةٌ جديدة كلُّ أجوبتها «لا»** — الرفضُ على مستوى المريض، في البوّابة وفي ملفّه",
      [fresh.status, (await examAgentGate(Number(fresh.json?.id))).code, (await examsOf(p4))?.exams?.find((e: any) => e.id === Number(fresh.json?.id))?.agentGate?.code],
      [200, "red_flag_other_exam", "red_flag_other_exam"]);
    const b4 = await maxOutbox();
    const supRe = await call("POST", `/api/physio/exams/${red2Id}/red-flag-review`, S.sup, { examinerNote: "لا تُنسب إليه", decision: "approve", decisionNote: "سليمٌ بعد الفحوص" });
    same("هـ.٣ **ويعود بيد معتمِد** — قرارٌ مباشر بملاحظة قراره وحدها (لا «ملاحظةَ فاحص» عن غيره) ولو مُحيت العلامات، والفاحصُ يعلم، والمعاينتان تُفتحان",
      [supRe.status, supRe.json?.status, supRe.json?.examinerNote, (await outbox("physio_exam_red_flag_decided", b4)).map((r) => r.target_user_ids),
        (await examAgentGate(red2Id)).allowed, (await examAgentGate(Number(fresh.json?.id))).code],
      [201, "approved", null, [[SPEC]], true, "clear"]);

    const p5 = await physioPatient("سليم يفحص");
    const bySup = await call("POST", `/api/medical/patients/${p5}/exams`, S.sup, examBody({ assessment: completeExamV2({ redFlags: { suicide: "yes" } }) }));
    const supNoDec = await call("POST", `/api/physio/exams/${bySup.json?.id}/red-flag-review`, S.sup, { examinerNote: "أفكار عابرة", decision: "approve", decisionNote: "" });
    same("هـ.٤ **المعتمِدُ الفاحصُ يقرّر في الخطوة نفسِها بملاحظةٍ إلزامية**", [bySup.status, supNoDec.status, supNoDec.json?.code], [200, 400, "decision_note_required"]);
    const b3 = await maxOutbox();
    const supSelf = await call("POST", `/api/physio/exams/${bySup.json?.id}/red-flag-review`, S.sup, { examinerNote: "أفكار عابرة", decision: "approve", decisionNote: "أُبلغ الطبيب، لا خطّة لإيذاء" });
    same("هـ.٥ وبها يكفي اعتمادُه — بلا انتظارٍ ولا تنبيهِ انتظار، وسطرُ تدقيقٍ واحد",
      [supSelf.status, supSelf.json?.status, (await outbox("physio_exam_red_flag_pending", b3)).length, await audits(supSelf.json?.id), (await examAgentGate(Number(bySup.json?.id))).allowed],
      [201, "approved", 0, [["request_and_approve", SUP]], true]);
    let dbGuard = "";
    try { await q(`INSERT INTO physio_exam_red_flag_reviews (exam_id, patient_id, flags, status, examiner_note) VALUES ($1, $2, '[]'::jsonb, 'approved', 'x')`, [bySup.json?.id, p5]); }
    catch (e: any) { dbGuard = String(e?.constraint ?? e?.message); }
    let oneOpen = "";
    try {
      await q(`INSERT INTO physio_exam_red_flag_reviews (exam_id, patient_id, flags, examiner_note) VALUES ($1, $2, '[]'::jsonb, 'x'), ($1, $2, '[]'::jsonb, 'y')`, [bySup.json?.id, p5]);
    } catch (e: any) { oneOpen = String(e?.constraint ?? e?.message); }
    same("هـ.٦ **والقاعدةُ تحرس**: قرارٌ بلا ملاحظة يُردّ، ومعلَّقان لمعاينةٍ واحدة يُردّان", [dbGuard, oneOpen], ["ck_pefr_decided", "uq_pefr_one_open"]);
    let noNotePending = "";
    try { await q(`INSERT INTO physio_exam_red_flag_reviews (exam_id, patient_id, flags) VALUES ($1, $2, '[]'::jsonb)`, [bySup.json?.id, p5]); }
    catch (e: any) { noNotePending = String(e?.constraint ?? e?.message); }
    same("هـ.٦ب ولا معلَّقَ بلا ملاحظة مرسِله", noNotePending, "ck_pefr_pending_note");

    const p6 = await physioPatient("نيابة");
    const red6 = await call("POST", `/api/medical/patients/${p6}/exams`, S.spec, examBody({ assessment: completeExamV2({ redFlags: { infection: "yes" } }) }));
    const onBehalf = await call("POST", `/api/physio/exams/${red6.json?.id}/red-flag-review`, S.sup, { examinerNote: "أرسلها عنه — حمّى خفيفة" });
    const b6 = await maxOutbox();
    const dec6 = await call("POST", `/api/physio/red-flag-reviews/${onBehalf.json?.id}/decide`, S.admin, { decision: "reject", note: "إلى الطبيب اليوم" });
    same("هـ.٧ **معتمِدٌ أرسلها عن الفاحص ⟵ القرارُ يصل الاثنين** (مراجعةُ المرحلة الأولى: كان يصل المرسِلَ وحده)",
      [onBehalf.status, dec6.status, (await outbox("physio_exam_red_flag_decided", b6)).map((r) => [...r.target_user_ids].sort((a: number, b: number) => a - b))],
      [201, 200, [[SUP, SPEC].sort((a, b) => a - b)]]);

    //  **النطاقُ بفرع تسجيل المريض** — معاينةٌ في فرعٍ آخر لمريضٍ من فرع الفاحص يرسلها فاحصُها.
    const p7 = await physioPatient("فرع المعاينة");
    const case7 = Number((await q(`SELECT id FROM patient_cases WHERE patient_id = $1 AND case_type = 'physiotherapy'`, [p7])).rows[0].id);
    const ex7 = Number((await q(`INSERT INTO medical_exams (patient_id, case_id, case_type, branch_id, doctor_id, doctor_name, diagnosis, prescription, assessment)
      VALUES ($1, $2, 'physiotherapy', $3, $4, 'أخصائيّ', 'د', '{}'::jsonb, $5::jsonb) RETURNING id`,
      [p7, case7, B2, SPEC, JSON.stringify(completeExamV2({ redFlags: { cardiac: "yes" } }))])).rows[0].id);
    const scoped = await call("POST", `/api/physio/exams/${ex7}/red-flag-review`, S.spec, { examinerNote: "خفقانٌ عند الجهد" });
    same("هـ.٨ **النطاقُ بفرع تسجيل المريض لا بفرع المعاينة** — فاحصُ فرع المريض يرسلها", [scoped.status, scoped.json?.status], [201, "pending"]);

    console.log("\n── و. الدمجُ والحذف ──");
    const src = await physioPatient("مصدر");
    const dst = await physioPatient("هدف");
    const srcExam = await call("POST", `/api/medical/patients/${src}/exams`, S.spec, examBody({ assessment: completeExamV2({ redFlags: { dvt_pe: "yes" } }) }));
    const srcReq = await call("POST", `/api/physio/exams/${srcExam.json?.id}/red-flag-review`, S.spec, { examinerNote: "ساقٌ متورّمة" });
    let mergeErr = "";
    try { await storage.mergePatients(src, dst); } catch (e: any) { mergeErr = String(e?.message ?? e); }
    same("و.١ **الدمجُ ينقل الطلبَ مع معاينته إلى الملفّ الهدف** — والمعلَّقُ يبقى معلَّقاً",
      [mergeErr, (await q(`SELECT patient_id, status FROM physio_exam_red_flag_reviews WHERE id = $1`, [srcReq.json?.id])).rows.map((r) => [Number(r.patient_id), r.status])],
      ["", [[dst, "pending"]]]);
    let delErr = "";
    try { await storage.deletePatient(dst); } catch (e: any) { delErr = String(e?.message ?? e); }
    same("و.٢ **حذفُ المريض كاملاً يحذف طلباته قبل معايناته** — بلا عطب مفتاح",
      [delErr, Number((await q(`SELECT count(*) FROM physio_exam_red_flag_reviews WHERE id = $1`, [srcReq.json?.id])).rows[0].count),
        Number((await q(`SELECT count(*) FROM patients WHERE id = $1`, [dst])).rows[0].count)], ["", 0, 0]);
  } finally {
    httpServer.close();
    await cleanup();
  }
  console.log(`\n${failures === 0 ? "✅ كلُّ التأكيدات نجحت" : `❌ ${failures} تأكيداً سقط`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch { /* */ }
  process.exit(1);
});
