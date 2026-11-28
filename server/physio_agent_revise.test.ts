// «أعِده إلى Opus» والتعديلُ بعد الاعتماد ونسخُ خطّة Opus المرقّمة (§4.hb — ترحيل ٢٠٠). `npm run test:physio-agent-revise`
// القواعدُ الصرفة (اللقطةُ والفرقُ والجسمُ الصارم وبوّاباتُ النسخة والخصوصية)، ثمّ النقاطُ الحقيقية والعاملُ على Postgres محلّي **بنموذجٍ مزيّف** — لا مفتاح.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "physio-agent-revise-test-secret";
delete process.env.ANTHROPIC_API_KEY;

import express from "express";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { completeExamV2 } from "./test_fixtures/physio_exam_v2";
import { applyProductionChecks } from "./test_fixtures/production_checks";
import { JOB_ERROR_TEXTS, normalizeSourceUrl, parseSubmittedPlan } from "@shared/physio_agent";
import { findAuthoredLeaks, patientIdentifierSet, redactDeep, stripNoteEcho } from "@shared/physio_agent_privacy";
import {
  applyPlanEdit, canonicalJson, composePlanColumns, diffSnapshots, diffSummaryAr, editFromSnapshot, parsePlanEdit, snapshotFromAmendDelta, FORBIDDEN_LINE_PREFIX,
  type PlanSnapshot,
} from "@shared/physio_plan_versions";
import { applyEditGates, type EditGateContext } from "@shared/physio_plan_edit_gates";
import type { GateProtocol } from "@shared/physio_agent_gates";
import { setAgentModelForTests, type AgentModelCall, authoredTextOf } from "./physio_agent/model";
import { REVISION_BLOCK_OPEN, setRetryDelaysForTests, withTruncationNote } from "./physio_agent/conversation";
import { recoverStale, runAgentOnce, setAgentTimingForTests } from "./physio_agent/worker";
import { softDeletePatient } from "./patients/trash_store";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg, `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}
const q = async (t: string, p: any[] = []) => (await pool.query(t, p)).rows;
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const PORT = Number(process.env.PHYSIO_AGENT_REVISE_TEST_PORT) || 7043;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "زوزو-قيقي";
const B1 = 9951;
const ADMIN = 9961, SUP = 9962, SPEC = 9963, TECH = 9965;
const IDS = [ADMIN, SUP, SPEC, TECH];

// ══ النموذجُ المزيّف ══════════════════════════════════════════════════════════════════════════════════
type Step = Anthropic.Message | ((call: AgentModelCall) => Anthropic.Message | Promise<Anthropic.Message>);
const queues: Record<string, Step[]> = { writer: [], reviewer: [], auditor: [] };
const calls: AgentModelCall[] = [];
let toolSeq = 0;
const resetModel = () => { queues.writer = []; queues.reviewer = []; queues.auditor = []; calls.length = 0; };
setAgentModelForTests(async (call) => {
  calls.push(JSON.parse(JSON.stringify({ role: call.role, body: call.body })));
  const step = queues[call.role].shift();
  if (!step) throw new Error(`no scripted response for ${call.role} (call ${calls.length})`);
  return typeof step === "function" ? await step(call) : step;
});
const msg = (content: any[], stop: string = "tool_use"): Anthropic.Message => ({
  id: `msg_${++toolSeq}`, type: "message", role: "assistant", model: "claude-opus-5-5", content, stop_reason: stop, stop_sequence: null,
  usage: { input_tokens: 10, output_tokens: 10, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, server_tool_use: null },
} as any);
const tu = (name: string, input: unknown) => ({ type: "tool_use", id: `toolu_${++toolSeq}`, name, input });
const pass = () => msg([tu("submit_review", { verdict: "pass", summary_ar: "سليمة", issues: [], checked: ["note"] })]);
const NICE = "https://www.nice.org.uk/guidance/ng59";

const dev = (code: string, over: Record<string, unknown> = {}) => ({ device_code: code, use: "core", minutes: 15, every_days: null, times: null, btl_model_id: null,
  program: null, fallback: [], evidence: null, reason_ar: `سبب ${code}`, reason_en: "why", ...over });

async function main() {
  // ══ ق. الصرفة ══════════════════════════════════════════════════════════════════════════════════════
  console.log("\n── ق. القواعدُ الصرفة ──");
  const proto = (over: Partial<GateProtocol> = {}): GateProtocol => ({
    id: 77, code: "t", status: "approved", origin: "library", isArchived: false, totalSessions: 12, maxTotalSessions: 18, sessionsPerWeek: 6, sessionMinutes: 50,
    devices: [
      { deviceCode: "electro", centreUse: "core", evidence: "recommended", minutes: 20, everyDays: null, times: null, params: {}, parameters: "P-electro", parametersEn: null, note: null, noteEn: null },
      { deviceCode: "tecar", centreUse: "adjunct", evidence: "optional", minutes: 10, everyDays: null, times: null, params: {}, parameters: null, parametersEn: null, note: null, noteEn: null },
      { deviceCode: "ultrasound", centreUse: "not_used", evidence: "not_recommended", minutes: null, everyDays: null, times: null, params: {}, parameters: null, parametersEn: null, note: null, noteEn: null },
    ],
    phases: [
      { position: 1, nameAr: "أولى", nameEn: "One", sessionFrom: 1, sessionTo: 6, timeframe: null, timeframeEn: null, goals: null, goalsEn: null, education: null, educationEn: null,
        progressCriteria: null, progressCriteriaEn: null, notes: null, notesEn: null,
        exercises: [{ exerciseId: 1, sets: 2, reps: 10, holdSeconds: null, restSeconds: null, doseNote: null, doseNoteEn: null, note: null, noteEn: null }] },
      { position: 2, nameAr: "ثانية", nameEn: "Two", sessionFrom: 7, sessionTo: 12, timeframe: null, timeframeEn: null, goals: null, goalsEn: null, education: null, educationEn: null,
        progressCriteria: null, progressCriteriaEn: null, notes: null, notesEn: null,
        exercises: [{ exerciseId: 2, sets: 3, reps: 12, holdSeconds: null, restSeconds: null, doseNote: null, doseNoteEn: null, note: null, noteEn: null }] },
    ],
    ...over,
  });
  const ex = (id: number, nameAr = `تمرين ${id}`) => ({ exerciseId: id, nameAr, nameEn: `Ex ${id}`, sets: 2, reps: 10, holdSeconds: null, restSeconds: null, doseNote: null,
    doseNoteEn: null, note: null, noteEn: null, card: { steps: `خطوات ${id}`, stepsEn: null, stopIf: null, stopIfEn: null, images: [], updatedAt: null } });
  const baseSnap = (): PlanSnapshot => ({
    schema: 1, mode: "library", protocolId: 77, draftProtocolId: null, protocolCode: "t", titleAr: "خطّة", titleEn: "Plan", track: null, startingPhase: 1,
    totalSessions: 12, sessionsPerWeek: 6, sessionMinutes: 50,
    texts: { goalsAr: null, goalsEn: null, precautionsAr: "احتياط", precautionsEn: null, stopRulesAr: "توقّف إذا", stopRulesEn: null, homeProgramAr: null, homeProgramEn: null,
      rationaleAr: "لأنّ", rationaleEn: null },
    protocolTexts: { goals: null, goalsEn: null, exercises: null, exercisesEn: null, contraindications: "موانعُ البروتوكول", contraindicationsEn: null, precautions: null, precautionsEn: null },
    forbidden: [{ deviceCode: "shockwaves", nameAr: "الموجات الصادمة", reasonAr: "الوارفارين", source: "exam" }],
    devices: [{ deviceCode: "electro", nameAr: "التحفيز", nameEn: "Electro", use: "core", minutes: 15, everyDays: null, times: null, parameters: "P-electro", parametersEn: null,
      note: "سبب", noteEn: null, evidence: "recommended", reasonAr: "سبب", reasonEn: "", btl: { modelId: "btl-4825s-electro", modelNameEn: "BTL-4825S", program: null,
        fallback: [{ key: "frequency_hz", labelEn: "Frequency", value: 100, unit: "Hz", source: "https://x.org/a" }], flags: [] }, protocolParams: {} }],
    phases: [
      { position: 1, nameAr: "أولى", nameEn: "One", sessionFrom: 1, sessionTo: 6, timeframe: null, timeframeEn: null, goals: null, goalsEn: null, education: null, educationEn: null,
        progressCriteria: null, progressCriteriaEn: null, notes: null, notesEn: null, exercises: [ex(1)] },
      { position: 2, nameAr: "ثانية", nameEn: "Two", sessionFrom: 7, sessionTo: 12, timeframe: null, timeframeEn: null, goals: null, goalsEn: null, education: null, educationEn: null,
        progressCriteria: null, progressCriteriaEn: null, notes: null, notesEn: null, exercises: [ex(2)] },
    ],
    exerciseChanges: [], phaseNotes: [], measuresOwn: false, measures: [], sources: [], removed: [],
    basis: { examId: 1, examFingerprint: "f", gateCode: "clear", redFlagReviewIds: [], approverConstraintReviewIds: [], branchId: 1, protocolUpdatedAt: null },
  });
  const exMap = new Map([[1, { archived: false, status: "approved", kind: "strength", region: "lumbar" }], [2, { archived: false, status: "approved", kind: "strength", region: "lumbar" }],
    [3, { archived: false, status: "approved", kind: "strength", region: "lumbar" }], [4, { archived: false, status: "draft", kind: "strength", region: "lumbar" }]]);
  const ectx = (over: Partial<EditGateContext> = {}): EditGateContext => ({
    agentGate: { allowed: true, code: "clear", reason: "" }, forbidden: baseSnap().forbidden, knownDeviceCodes: new Set(["electro", "tecar", "ultrasound", "shockwaves", "laser"]),
    branchAvailable: new Set(["electro", "tecar", "ultrasound", "shockwaves"]), protocol: proto(), exercises: exMap, fetchedUrls: new Set(), sessionsDone: 0, baseVersion: 1, ...over,
  });
  const lookups = { cards: new Map([[3, { nameAr: "تمرين ٣", nameEn: "Ex 3", card: { steps: "خ٣", stepsEn: null, stopIf: null, stopIfEn: null, images: [], updatedAt: null } }]]),
    deviceLabels: new Map([["tecar", { nameAr: "التيكار", nameEn: "Tecar" }], ["electro", { nameAr: "التحفيز", nameEn: "Electro" }]]), protocolLines: new Map(proto().devices.map((d) => [d.deviceCode, d])) };
  const edited = (fn: (e: ReturnType<typeof editFromSnapshot>) => void) => { const e = editFromSnapshot(baseSnap()); fn(e); return applyPlanEdit(baseSnap(), e, lookups); };
  const dgate = (c: PlanSnapshot, over: Partial<EditGateContext> = {}) => applyEditGates(c, ectx(over), "direct_edit", baseSnap());

  same("P.1 البصمةُ لا يغيّرها ترتيبُ المفاتيح", canonicalJson({ b: 1, a: [2, { d: 1, c: 2 }] }), canonicalJson({ a: [2, { c: 2, d: 1 }], b: 1 }));
  same("P.2 **سطرُ الممنوع يُعاد تركيبُه دائماً** — مسحُ الاحتياطات لا يُسقطه، وجهازٌ ممنوعٌ بسببين مرّةً بسببيه", (() => {
    const s = baseSnap(); s.texts.precautionsAr = null; s.forbidden.push({ deviceCode: "shockwaves", nameAr: "الموجات الصادمة", reasonAr: "بقرار المعتمِد: لا", source: "approver" });
    const p = composePlanColumns(s).precautions ?? ""; return [p.includes(FORBIDDEN_LINE_PREFIX), (p.match(/الموجات الصادمة/g) ?? []).length, p.startsWith("موانعُ البروتوكول")]; })(), [true, 1, true]);
  same("P.3 الفرقُ بالأقسام ومَن أحدثه (`gate` حين لمسه سطرُ بوّابة)", (() => {
    const a = baseSnap(); const b = baseSnap(); b.totalSessions = 10; b.devices[0].minutes = 20; b.texts.precautionsAr = "جديد";
    const d = diffSnapshots(a, b, [{ target: "device:electro", kind: "clamped" }], "approver");
    return d.sections.map((s) => [s.key, s.changes.map((c) => c.by)]); })(), [["dose", ["approver"]], ["devices", ["gate"]], ["precautions", ["approver"]]]);
  same("P.4 ملخّصُ الفرق: أربعٌ ثمّ «و… أخرى» بالأرقام الهنديّة", (() => {
    const a = baseSnap(); const b = baseSnap(); b.totalSessions = 10; b.sessionsPerWeek = 5; b.sessionMinutes = 40; b.startingPhase = 2; b.texts.precautionsAr = "x"; b.texts.stopRulesAr = "y"; b.texts.rationaleAr = "z";
    return diffSummaryAr(diffSnapshots(a, b)).endsWith("و٣ تغييرات أخرى"); })(), true);
  same("P.5 **جسمُ التعديل صارم** — مفتاحٌ مجهول في كلّ مستوى خطأ، وناقصٌ خطأ، والصحيحُ يُقبل", (() => {
    const good = editFromSnapshot(baseSnap());
    const r = (x: any) => parsePlanEdit(x).ok;
    return [r(good), r({ ...good, extra: 1 }), r({ ...good, devices: [{ ...good.devices[0], hack: 1 }] }), r({ ...good, devices: [{ ...good.devices[0], fallback: [{ ...good.devices[0].fallback[0], unit: "Hz" }] }] }),
      r({ ...good, phases: [{ ...good.phases[0], exercises: [{ ...good.phases[0].exercises[0], name: "x" }] }] }), r({ ...good, texts: { ...good.texts, forbidden: "x" } }),
      r((() => { const { measures: _m, ...rest } = good; return rest; })())]; })(), [true, false, false, false, false, false, false]);
  same("P.6 **قفلُ تعديل Bionic AI**: الوضعُ والبروتوكولُ مقفلان، والمكتبةُ بلا مراحل، وخارجَها بلا `exercise_changes`", (() => {
    const lock = { mode: "library" as const, protocolId: 77 };
    const lib = { mode: "library", protocol_id: 77, starting_phase: 1, dose: {}, devices: [], phases: [], exercise_changes: [] };
    return [parseSubmittedPlan(lib, lock).ok, parseSubmittedPlan({ ...lib, protocol_id: 78 }, lock).ok, parseSubmittedPlan({ ...lib, mode: "out_of_library" }, lock).ok,
      parseSubmittedPlan({ ...lib, phases: [{ name_ar: "x", exercises: [] }] }, lock).ok,
      parseSubmittedPlan({ mode: "out_of_library", protocol_id: null, phases: [{ name_ar: "x", exercises: [] }], exercise_changes: [{ phase: 1, from_exercise_id: 1, to_exercise_id: 2, reason_ar: "x" }] },
        { mode: "out_of_library", protocolId: null }).ok]; })(), [true, false, false, false, false]);
  same("P.7a **التعديلُ المباشر لا يغيّر شيئاً بصمت** — بلا مانعٍ اللقطةُ هي المرشَّح بعينه", (() => {
    const c = edited((e) => { e.texts.precautionsAr = "احتياطٌ آخر"; }); c.forbidden = ectx().forbidden.slice(); c.basis = baseSnap().basis;
    const r = dgate(c); return [r.blocking.length, canonicalJson(r.snapshot) === canonicalJson(c), r.suggestedEdit]; })(), [0, true, null]);
  same("P.7b **الممنوعُ وغيرُ البروتوكول والدقائقُ فوق الحدّ ⟵ مانعٌ بتصحيحٍ مقترح**، والتصحيحُ يمرّ", (() => {
    const c = edited((e) => { e.devices.push({ deviceCode: "shockwaves", use: "core", minutes: 10, everyDays: null, times: null, noteAr: null, btlModelId: "rswt-elite", program: null, fallback: [] },
      { deviceCode: "laser", use: "core", minutes: 10, everyDays: null, times: null, noteAr: null, btlModelId: null, program: null, fallback: [] }); e.devices[0].minutes = 45; });
    const r = dgate(c);
    const fixed = applyPlanEdit(baseSnap(), r.suggestedEdit!, lookups);
    return [r.blocking.map((b) => b.code).sort(), r.suggestedEdit?.devices.map((d) => [d.deviceCode, d.minutes]), dgate(fixed).blocking.length]; })(),
    [["forbidden", "minutes_clamped", "unavailable_in_branch"], [["electro", 20]], 0]);
  same("P.7c **EG0 مانعٌ لكلّ رمز بوّابةٍ مغلقة، وبلا معاينةٍ حيّة**", ["red_flag_pending", "red_flag_rejected", "incomplete"].map((code) =>
    dgate(edited(() => {}), { agentGate: { allowed: false, code, reason: "x" } }).blocking.some((b) => b.code === "gate_closed")).concat([dgate(edited(() => {}), { agentGate: null }).blocking.some((b) => b.code === "no_live_exam")]),
    [true, true, true, true]);
  same("P.7d **EG3**: سطرٌ لم يتغيّر صار غيرَ متوفّرٍ ⟵ تنبيهٌ ويبقى؛ والمعدَّلُ غيرُ المتوفّر ⟵ مانع", (() => {
    const avail = new Set(["tecar"]);
    const a = dgate(edited((e) => { e.texts.precautionsAr = "x"; }), { branchAvailable: avail });
    const b = dgate(edited((e) => { e.devices[0].minutes = 10; }), { branchAvailable: avail });
    return [a.blocking.length, a.warnings.map((w) => w.code), b.blocking.map((x) => x.code)]; })(), [0, ["unavailable_kept"], ["unavailable_in_branch"]]);
  same("P.7e **EG9b**: قيمةٌ موروثة بمصدرها تبقى، والمعدَّلةُ برابطٍ موروث تُمنع، و«approver» تُقبل", (() => {
    const kept = dgate(edited((e) => { e.texts.precautionsAr = "x"; }));
    const changed = dgate(edited((e) => { e.devices[0].fallback[0].value = 80; }));
    const approver = dgate(edited((e) => { e.devices[0].fallback[0].value = 80; e.devices[0].fallback[0].source = "approver"; }));
    return [kept.blocking.length, changed.blocking.map((b) => b.code), approver.blocking.length]; })(), [0, ["param_unsourced"], 0]);
  same("P.7e2 **وقيمةٌ «protocol» موروثة كما هي تبقى** ولو لم يكتبها البروتوكولُ الآن (كانت تنبيهاً في كتابة Bionic AI)", (() => {
    const b = baseSnap(); b.devices[0].btl!.fallback[0].source = "protocol";
    const e = editFromSnapshot(b); e.texts.precautionsAr = "x";
    const c = applyPlanEdit(b, e, lookups);
    return applyEditGates(c, ectx(), "direct_edit", b).blocking.length; })(), 0);
  same("P.7f **EG9b لتعديل Bionic AI**: القيمةُ كما في الأساس تبقى بمصدرها، والمعدَّلةُ بلا رابطٍ فُتح تُحذف", (() => {
    const s1 = edited((e) => { e.texts.precautionsAr = "x"; }); const s2 = edited((e) => { e.devices[0].fallback[0].value = 80; });
    const a = applyEditGates(s1, ectx(), "opus_amend", baseSnap()); const b = applyEditGates(s2, ectx(), "opus_amend", baseSnap());
    return [a.snapshot.devices[0].btl?.fallback.length, b.snapshot.devices[0].btl?.fallback.length, b.log.some((x) => x.code === "param_unsourced" && x.kind === "removed")]; })(), [1, 0, true]);
  same("P.7g **EG16**: بطاقةٌ خارجَ مرحلة البروتوكول بلا سبب ⟵ مانع، وبسببٍ ⟵ تنبيه", (() => {
    const no = dgate(edited((e) => { e.phases[0].exercises.push({ exerciseId: 3, sets: 1, reps: 5, holdSeconds: null, restSeconds: null, doseNote: null }); }));
    const yes = dgate(edited((e) => { e.phases[0].exercises.push({ exerciseId: 3, sets: 1, reps: 5, holdSeconds: null, restSeconds: null, doseNote: null });
      e.exerciseReasons.push({ phase: 1, exerciseId: 3, reasonAr: "لأنّ المريض لا يستطيع" }); }));
    return [no.blocking.map((b) => b.code), yes.blocking.length, yes.warnings.map((w) => w.code)]; })(), [["exercise_off_protocol"], 0, ["exercise_off_protocol_reasoned"]]);
  same("P.7h **EG17**: حدٌّ ضاق منذ النسخة (السقفُ نزل) ⟵ مانعٌ بنصّ «تغيّر حدٌّ منذ النسخة ١» وإن لم يُمسّ العدد", (() => {
    const r = dgate(edited((e) => { e.texts.precautionsAr = "x"; }), { protocol: proto({ totalSessions: 8, maxTotalSessions: 8 }) });
    return [r.blocking.map((b) => b.code), r.blocking.every((b) => /تغيّر حدٌّ منذ النسخة ١/.test(b.reasonAr))]; })(), [["sessions_clamped", "phase_ranges_fixed"], true]);
  same("P.7i والعددُ دون ما نُفّذ مانعٌ في كلّ سياسة", [dgate(edited((e) => { e.totalSessions = 3; e.phases[0].sessionTo = 2; e.phases[1].sessionFrom = 3; e.phases[1].sessionTo = 3; }), { sessionsDone: 5 }).blocking.some((b) => b.code === "total_below_done"),
    applyEditGates(edited((e) => { e.totalSessions = 3; }), ectx({ sessionsDone: 5 }), "opus_amend", baseSnap()).blocking.some((b) => b.code === "total_below_done")], [true, true]);
  same("P.8 **تعديلُ Bionic AI في المكتبة فرقٌ على النسخة النافذة**: التبديلُ على مراحلها والنطاقاتُ بنسبة العدد", (() => {
    const sub = parseSubmittedPlan({ mode: "library", protocol_id: 77, starting_phase: 1, dose: { total_sessions: 6 }, devices: [dev("electro", { btl_model_id: "btl-4825s-electro" })], phases: [],
      exercise_changes: [{ phase: 1, from_exercise_id: 1, to_exercise_id: 3, reason_ar: "أسهل" }] }, { mode: "library", protocolId: 77 });
    if (!sub.ok) throw new Error(sub.errors.join());
    const s = snapshotFromAmendDelta(baseSnap(), sub.value, lookups);
    return [s.phases.map((p) => [p.sessionFrom, p.sessionTo, p.exercises.map((x) => x.exerciseId)]), s.exerciseChanges.map((c) => [c.kind, c.by]), s.phases[0].exercises[0].card?.steps]; })(),
    [[[1, 3, [3]], [4, 6, [2]]], [["substitute", "opus"]], "خ٣"]);
  same("P.9 **التنقيةُ في العمق** تبلغ النصوصَ المتداخلة", (() => {
    const ids = patientIdentifierSet({ name: "علي حسين كاظم" });
    return JSON.stringify(redactDeep({ a: [{ b: "المريض علي حسين يشكو" }], n: 3 }, ids)).includes("علي حسين"); })(), false);
  same("P.10 **لا صدى لملاحظة المعتمِد** عند الفاحص (ستُّ كلماتٍ متتالية)",
    [stripNoteEcho("وجدت علامة. قلّل الجلسات إلى عشر لأن المريض يسافر قريبا جدا. افحص الضغط.", "قلّل الجلسات إلى عشر لأن المريض يسافر قريبا"),
      stripNoteEcho("نصٌّ آخر تماماً", "قلّل الجلسات إلى عشر لأن المريض يسافر")], ["وجدت علامة. افحص الضغط.", "نصٌّ آخر تماماً"]);
  same("P.10b **والملاحظةُ القصيرة** (أقلُّ من ستّ كلمات) تُطابَق بطولها — لا تمرّ بلا فحص",
    stripNoteEcho("طلب المعتمِد أن أزل الليزر لوجود ورم. افحص الضغط.", "أزل الليزر لوجود ورم"), "افحص الضغط.");
  same("P.12 **الإضافةُ في الفرق بإعدادها** — التمرينُ المضاف بجرعته، والجهازُ المضاف بموديله وقيمه",
    (() => { const a = baseSnap(); const b = baseSnap(); b.phases[0].exercises.push({ ...ex(3), sets: 3, reps: 12 }); const d0 = b.devices[0];
      b.devices.push({ ...d0, deviceCode: "tecar", nameAr: "تيكار", use: "adjunct", minutes: 10 });
      const d = diffSnapshots(a, b, [], "writer"); const ch = d.sections.flatMap((x) => x.changes).filter((c) => c.kind === "added");
      return ch.map((c) => c.after); })(),
    [{ use: "adjunct", minutes: 10, everyDays: null, times: null, modelId: "btl-4825s-electro", program: null, fallback: [["frequency_hz", 100, "https://x.org/a"]] },
      { dose: [3, 12, null, null, null] }]);
  same("P.11 **«اختصر» بعد انقطاع الرسالة الأولى يُدرج قبل «كتلة التعديل»** فتبقى آخرَ كتلة، وفي غيرها آخراً",
    [(withTruncationNote([{ role: "user", content: [{ type: "text", text: "{}" }, { type: "text", text: `${REVISION_BLOCK_OPEN}\nnote: x` }] }] as any)[0].content as any[])
      .map((b: any) => b.text.startsWith(REVISION_BLOCK_OPEN) ? "R" : b.text === "{}" ? "C" : "T"),
     (withTruncationNote([{ role: "user", content: [{ type: "text", text: "{}" }] }, { role: "assistant", content: [{ type: "text", text: "a" }] },
       { role: "user", content: [{ type: "text", text: "x" }] }] as any).at(-1)!.content as any[]).map((b: any) => b.text === "x" ? "X" : "T")],
    [["C", "T", "R"], ["X", "T"]]);

  // ══ النقاطُ الحقيقية ═════════════════════════════════════════════════════════════════════════════════
  await applyProductionChecks(pool);
  await cleanup();
  setRetryDelaysForTests([1, 1, 1, 1]);
  setAgentTimingForTests({ heartbeatMs: 40, staleMs: 5 * 60_000, runCapMs: 60_000 });
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع تعديل Bionic AI')`, [B1]);
  for (const [id, role, extra] of [[ADMIN, "admin", {}], [SUP, "branch_manager", { can_supervise_physio: true }], [SPEC, "physio_specialist", {}], [TECH, "therapist", {}]] as const) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_view_patients)
             VALUES ($1, $2, 'x', $3, $4, $5, $6::jsonb, true, true)`, [id, `opusrev-${id}`, `مستخدم ${id}`, role, B1, JSON.stringify([B1])]);
    for (const [k, v] of Object.entries(extra)) await q(`UPDATE system_users SET ${k} = $2 WHERE id = $1`, [id, v]);
  }
  for (const u of IDS) for (const ev of ["physio_opus_plan_ready", "physio_opus_questions", "physio_opus_plan_versioned"]) {
    await q(`INSERT INTO staff_notification_prefs (user_id, event_type) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [u, ev]);
  }
  const devId = Object.fromEntries((await q(`SELECT id, code FROM devices`)).map((d) => [d.code, Number(d.id)]));
  for (const c of ["electro", "shockwaves", "ultrasound", "tecar", "exercise", "megnatik"]) {
    await q(`INSERT INTO physio_device_branches (device_id, branch_id, available) VALUES ($1, $2, true) ON CONFLICT (device_id, branch_id) DO UPDATE SET available = true`, [devId[c], B1]);
  }
  const mkEx = async (code: string) => Number((await q(`INSERT INTO physio_exercises (code, name_ar, name_en, kind, region, status, steps) VALUES ($1, $1, $1, 'strength', 'lumbar', 'approved', $2) RETURNING id`,
    [`TEST-OPREV-${code}`, `خطوات ${code}`]))[0].id);
  const EX1 = await mkEx("A"), EX2 = await mkEx("B"), EX3 = await mkEx("C");
  const P = Number((await q(`INSERT INTO physio_protocols (code, title_ar, title_en, category, age_group, status, total_sessions, max_total_sessions, sessions_per_week, session_minutes, contraindications)
    VALUES ('test-oprev-lib', 'بروتوكول تعديل Bionic AI', 'Bionic AI revise protocol', 'spine', 'adult', 'approved', 12, 18, 6, 50, 'موانعُ البروتوكول') RETURNING id`))[0].id);
  for (const [code, use, ev] of [["electro", "core", "recommended"], ["tecar", "adjunct", "optional"], ["ultrasound", "not_used", "not_recommended"]] as const) {
    await q(`INSERT INTO physio_protocol_devices (protocol_id, device_id, evidence, minutes, params, centre_use) VALUES ($1, $2, $3, 20, '{}'::jsonb, $4)`, [P, devId[code], ev, use]);
  }
  for (const [pos, from, to, exs] of [[1, 1, 6, [EX1]], [2, 7, 12, [EX2]]] as const) {
    const ph = Number((await q(`INSERT INTO physio_protocol_phases (protocol_id, position, name_ar, name_en, session_from, session_to) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [P, pos, `مرحلة ${pos}`, `Phase ${pos}`, from, to]))[0].id);
    for (const [i, e] of exs.entries()) await q(`INSERT INTO physio_protocol_phase_exercises (phase_id, exercise_id, position, sets, reps) VALUES ($1, $2, $3, 2, 10)`, [ph, e, i]);
  }
  const sess = (id: number, role: string, perms: Record<string, unknown> = {}) => hdr({ userId: id, displayName: `م ${id}`, role, roles: [role], branchId: B1,
    accessibleBranches: [B1], isAdmin: role === "admin", permissions: { canViewPatients: true, ...perms } });
  const S = { admin: sess(ADMIN, "admin"), sup: sess(SUP, "branch_manager", { canSupervisePhysio: true }), spec: sess(SPEC, "physio_specialist"), tech: sess(TECH, "therapist") };
  const app = express();
  app.use(express.json({ limit: "4mb" }));
  app.use((req: any, _res, next) => {
    const h = req.get("x-test-session");
    if (h) { try { req.session = { branchSession: JSON.parse(Buffer.from(h, "base64").toString("utf8")), destroy: (cb: () => void) => cb() }; } catch { /* */ } }
    next();
  });
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise<void>((r) => httpServer.once("listening", () => r()));
  const call = async (method: string, p: string, session: string, body?: unknown) => {
    const r = await fetch(`${BASE}${p}`, { method, headers: { "content-type": "application/json", "x-test-session": session }, body: body === undefined ? undefined : JSON.stringify(body) });
    let json: any = null; try { json = await r.json(); } catch { /* */ }
    return { status: r.status, json };
  };
  let seq = 0;
  async function patient(name: string) {
    seq += 1;
    const pid = Number((await q(`INSERT INTO patients (name, phone, referral_source, referral_sub_source, age, height, weight, medical_condition, branch_id, is_physiotherapy, total_cost,
        patient_classification, governorate, address, injury_cause, injury_date, presenting_complaint)
      VALUES ($1, $2, 'من شخص آخر', $3, '46', '172', '88', 'physiotherapy', $4, true, 0, 'new', 'بغداد', 'الكرادة', 'الجلوس', '2026-05-01', 'ألم الظهر') RETURNING id`,
      [`${name} ${MARK}`, `0772${String(4000000 + seq * 7919).slice(0, 7)}`, MARK, B1]))[0].id);
    await storage.syncPatientCases(pid);
    return pid;
  }
  async function sign(pid: number, over: Record<string, unknown> = {}) {
    const r = await call("POST", `/api/medical/patients/${pid}/exams`, S.spec, { idempotencyKey: randomUUID(), caseType: "physiotherapy", chiefComplaint: "", clinicalFindings: "", plan: "",
      notes: "ملاحظة الفاحص", diagnosis: "ألم أسفل الظهر المزمن", prescription: { treatments: [{ treatmentType: "تمارين تأهيلية", sessionCount: 12 }] }, assessment: completeExamV2(), ...over });
    if (r.status !== 200) throw new Error(`sign failed ${r.status} ${JSON.stringify(r.json)}`);
    return Number(r.json.id);
  }
  const lib = (over: Record<string, unknown> = {}) => ({
    mode: "library", protocol_id: P, track: { name_ar: "المسار", name_en: "Main", why_en: "fits" }, starting_phase: 1,
    dose: { total_sessions: 12, sessions_per_week: 6, session_minutes: 50, why_en: null }, phase_notes: [], phases: [],
    devices: [dev("electro", { btl_model_id: "btl-4825s-electro" })], removed_devices: [], exercise_changes: [], proposed_cards: [], library_protocol: null,
    precautions_ar: "احتياط", precautions_en: null, stop_rules_ar: "توقّف إذا", stop_rules_en: null, home_program_ar: "برنامج", home_program_en: null, measures: [],
    goals_ar: null, goals_en: null, rationale_ar: "لأنّ", rationale_en: null, alternatives: [], assumptions: [], sources: [], ...over,
  });
  const jobsOf = async (pid: number) => q(`SELECT * FROM physio_agent_jobs WHERE patient_id = $1 ORDER BY id`, [pid]);
  const lastJob = async (pid: number) => (await jobsOf(pid)).at(-1);
  const planRow = async (id: number) => (await q(`SELECT * FROM physio_plans WHERE id = $1`, [id]))[0];
  const maxOutbox = async () => Number((await q(`SELECT COALESCE(max(id),0) AS m FROM staff_notification_outbox`))[0].m);
  const outbox = async (event: string, since: number) => q(`SELECT target_user_ids, exclude_user_id, text FROM staff_notification_outbox WHERE event_type = $1 AND id > $2 ORDER BY id`, [event, since]);
  const approveBody = async (planId: number, s = S.sup) => {
    const pr = (await call("GET", `/api/physio/plans/${planId}/opus-proposal`, s)).json;
    return { fromProposal: true, acknowledgedIssueIds: pr?.majorsToAcknowledge ?? [], agentJobId: pr?.agentJobId, proposalHash: pr?.proposalHash };
  };
  const versionsOf = async (planId: number) => q(`SELECT * FROM physio_plan_versions WHERE plan_id = $1 ORDER BY version`, [planId]);
  async function writePlan(pid: number, over: Record<string, unknown> = {}) {
    for (let i = 0; i < 60 && !(await jobsOf(pid)).some((j) => j.status === "queued"); i++) await wait(50);
    resetModel();
    queues.writer.push(msg([tu("submit_plan", lib(over))]));
    queues.reviewer.push(pass());
    await runAgentOnce({ skipReconcile: true });
    const j = await lastJob(pid);
    return { job: j, plan: (await q(`SELECT * FROM physio_plans WHERE agent_job_id = $1`, [j.id]))[0] };
  }

  try {
    console.log("\n── م. الترحيل ٢٠٠ ──");
    same("M.0 **القيودُ والقادحان والفهرسان**",
      [(await q(`SELECT conname FROM pg_constraint WHERE conname LIKE 'ck_ppv_%' OR conname IN ('ck_paj_trigger_v2','ck_paj_revise','ck_paj_scope','ck_paj_trig_kind','ck_paj_amend_base','ck_paj_proposal','ck_paj_saved','ck_pp_opus_version','ck_pps_plan_version','ck_paj_trigger') ORDER BY 1`)).length,
        (await q(`SELECT tgname FROM pg_trigger WHERE tgname IN ('trg_ppv_immutable','trg_ppv_nodelete')`)).length,
        (await q(`SELECT indexname FROM pg_indexes WHERE indexname IN ('uq_ppv_plan_version','uq_paj_pending_proposal')`)).length], [15, 2, 2]);
    const { sql: m200 } = await import("./migrations/200_physio_plan_versions");
    let rerun = ""; try { await pool.query(m200); } catch (e: any) { rerun = String(e?.message ?? e); }
    same("M.0b إعادةُ الترحيل لا تفعل شيئاً", rerun, "");

    console.log("\n── أ. «أعِده إلى Bionic AI» قبل الاعتماد ──");
    const pA = await patient("علي حسين");
    const eA = await sign(pA, { assessment: completeExamV2({ core: { anticoagulant: ["warfarin"] } }) });
    const { job: jA0, plan: planA0 } = await writePlan(pA);
    same("RT.0 خطّةُ Bionic AI تنتظر الاعتماد", [jA0.status, planA0?.status, planA0?.total_sessions], ["succeeded", "pending", 12]);
    const planA = Number(planA0.id);
    const oldBody = await approveBody(planA);
    same("RT.2 **غيرُ المعتمِد لا يعيدها** (٤٠٤ — لا يرى الخطّة)، والملاحظةُ إلزامية",
      [(await call("POST", `/api/physio/plans/${planA}/opus-return`, S.spec, { note: "x y z" })).status, (await call("POST", `/api/physio/plans/${planA}/opus-return`, S.sup, { note: " " })).json?.code],
      [404, "note_required"]);
    const before1 = await maxOutbox();
    const NOTE = "قلّل الجلسات إلى عشر لأن المريض يسافر قريبا جدا";
    const rt = await call("POST", `/api/physio/plans/${planA}/opus-return`, S.sup, { note: NOTE });
    const jR = await lastJob(pA);
    same("RT.1 **الإعادة ⟵ ٢٠٢ ووظيفةُ «تعديل» على الخطّة نفسِها** بنطاقها وملاحظتها ووظيفة أساسها، وسطرُ تدقيق",
      [rt.status, jR.kind, jR.trigger, jR.revise_scope, Number(jR.plan_id), jR.revise_note, Number(jR.base_job_id),
        (await q(`SELECT count(*)::int n FROM audit_log WHERE entity_type = 'physio_agent_job' AND entity_id = $1 AND action = 'enqueue_revise'`, [jR.id]))[0].n],
      [202, "revise", "approver_return", "return", planA, NOTE, Number(jA0.id), 1]);
    same("RT.3 **طلبٌ ثانٍ ⟵ ٤٠٩ `job_active`، والاعتمادُ أثناءه ⟵ ٤٠٩ `opus_revision_running`**",
      [(await call("POST", `/api/physio/plans/${planA}/opus-return`, S.sup, { note: "ملاحظة أخرى" })).json?.code,
        (await call("POST", `/api/physio/plans/${planA}/approve`, S.sup, await approveBody(planA))).json?.code], ["job_active", "opus_revision_running"]);
    const exJob = (await call("GET", `/api/physio/exams/${eA}/opus-job`, S.spec)).json;
    same("RT.10 **الفاحصُ يرى الحالَ وحدها**: نوعُ الوظيفة وخطّتُها بلا ملاحظة، ولا يلغيها (٤٠٣) — والمعتمِدُ يرى الملاحظة",
      [exJob?.job?.kind, exJob?.job?.planId, "reviseNote" in (exJob?.job ?? {}), exJob?.canCancel, (await call("POST", `/api/physio/opus-jobs/${jR.id}/cancel`, S.spec)).status,
        (await call("GET", `/api/physio/exams/${eA}/opus-job`, S.sup)).json?.job?.reviseNote], ["revise", planA, false, false, 403, NOTE]);
    resetModel();
    queues.writer.push(msg([tu("ask_questions", { questions: [{ id: "q1", text_ar: "هل يسافر المريض قريباً جداً؟", why_en: "x", affects: "preference" }] })]),
      msg([tu("submit_plan", lib({ dose: { total_sessions: 10, sessions_per_week: 5, session_minutes: 50, why_en: null }, assumptions: ["CHANGE: 10 sessions — note"] }))]));
    queues.reviewer.push(pass());
    await runAgentOnce({ skipReconcile: true });
    const jR2 = (await q(`SELECT * FROM physio_agent_jobs WHERE id = $1`, [jR.id]))[0];
    const w0 = calls.filter((c) => c.role === "writer")[0]?.body as any;
    const first = w0?.messages?.[0]?.content ?? [];
    const payload = JSON.parse(first[0]?.text ?? "{}");
    same("RT.5 **كتلةُ التعديل آخرُ كتلةٍ في الرسالة الأولى وحدها، والمهمّةُ مهمّةُ التعديل، ولا أسئلة**",
      [first.length, /^<<REVISION BLOCK — issued by the server>>/.test(first.at(-1)?.text ?? ""), (first.at(-1)?.text ?? "").includes(NOTE), payload.task, payload.rules?.questionsAvailable,
        JSON.stringify(payload).includes(NOTE), Boolean(payload.revision?.previousPlan?.gated)],
      [2, true, true, "Revise the existing plan as instructed by the REVISION block.", false, false, true]);
    same("RT.5c **السؤالُ الأوّل خطأٌ للنموذج** (وتُكمل الوظيفة)", JSON.parse(JSON.stringify(calls.filter((c) => c.role === "writer")[1]?.body.messages.at(-1)))?.content?.[0]?.is_error, true);
    const rv0 = calls.find((c) => c.role === "reviewer")?.body as any;
    const rvFirst = rv0?.messages?.[0]?.content ?? [];
    same("RT.5e **المراجعُ يقرأ «التعديل» والفرقَ — والملاحظةُ في «كتلة التعديل» آخرَ رسالته الأولى لا في JSON**، و`revision` في CONTEXT مرّةً واحدة",
      [/DIFF:/.test(rvFirst[0]?.text ?? ""), /^<<REVISION BLOCK — issued by the server>>/.test(rvFirst.at(-1)?.text ?? ""), (rvFirst.at(-1)?.text ?? "").includes(NOTE),
        (rvFirst[0]?.text ?? "").includes(NOTE), ((rvFirst[0]?.text ?? "").match(/"previousPlan"/g) ?? []).length],
      [true, true, true, false, 1]);
    const pA1 = await planRow(planA);
    same("RT.6 **نجحت ⟵ الخطّةُ نفسُها أُعيدت كتابتُها** (العدد ١٠) وبقيت تنتظر، ووظيفتُها الجديدة، وتنبيهُ المعتمِدين وحدهم",
      [jR2.status, pA1.status, pA1.total_sessions, Number(pA1.agent_job_id), pA1.opus_stale_reason,
        (await outbox("physio_opus_plan_ready", before1)).some((o) => /أعاد Bionic AI كتابةَ الخطّة/.test(o.text)), (await outbox("physio_opus_questions", before1)).length],
      ["succeeded", "pending", 10, Number(jR.id), null, true, 0]);
    same("RT.14 **الاعتمادُ ببصمة الاقتراح القديم ⟵ ٤٠٩ `proposal_changed`**", (await call("POST", `/api/physio/plans/${planA}/approve`, S.sup, oldBody)).json?.code, "proposal_changed");
    const prop = (await call("GET", `/api/physio/plans/${planA}/opus-proposal`, S.sup)).json;
    same("RT.9 «جولاتُ الإعادة» بفرقها", [prop.returnRounds?.length, prop.returnRounds?.[0]?.status, /الجرعة/.test(prop.returnRounds?.[0]?.diffSummaryAr ?? "")], [1, "succeeded", true]);

    console.log("\n── ن. النسخةُ ١ عند الاعتماد ──");
    const ap = await call("POST", `/api/physio/plans/${planA}/approve`, S.sup, await approveBody(planA));
    const v1 = (await versionsOf(planA))[0];
    const pA2 = await planRow(planA);
    same("V.1 **الاعتمادُ يكتب النسخةَ ١** (`approval`) ورقمَها على الخطّة، والصفوفُ من اللقطة",
      [ap.status, ap.json?.opusVersion, pA2.opus_version, v1?.version, v1?.how, v1?.snapshot?.totalSessions, Number(v1?.job_id), v1?.snapshot?.basis?.examId,
        composePlanColumns(v1.snapshot).precautions === pA2.precautions], [200, 1, 1, 1, "approval", 10, Number(jR.id), eA, true]);
    same("V.6 **اللقطةُ تجمّد نصَّ البطاقة**", v1.snapshot.phases[0].exercises[0].card?.steps, "خطوات A");
    await q(`UPDATE physio_exercises SET steps = 'تغيّرت' WHERE id = $1`, [EX1]);
    same("V.6b وتعديلُ البطاقة بعدها لا يمسّ النسخة", [(await versionsOf(planA))[0].snapshot.phases[0].exercises[0].card?.steps, (await versionsOf(planA))[0].snapshot_hash], ["خطوات A", v1.snapshot_hash]);
    let imm = ""; try { await q(`UPDATE physio_plan_versions SET reason = 'x' WHERE id = $1`, [v1.id]); } catch (e: any) { imm = e.message; }
    let immSnap = ""; try { await q(`UPDATE physio_plan_versions SET snapshot = '{}'::jsonb WHERE id = $1`, [v1.id]); } catch (e: any) { immSnap = e.message; }
    let delV = ""; try { await q(`DELETE FROM physio_plan_versions WHERE id = $1`, [v1.id]); } catch (e: any) { delV = e.message; }
    let okPid = ""; try { await q(`UPDATE physio_plan_versions SET patient_id = patient_id, job_id = NULL WHERE id = $1`, [v1.id]); } catch (e: any) { okPid = e.message; }
    same("V.3 **النسخةُ لا تتغيّر ولا تُحذف** — إلّا `patient_id` للدمج و`job_id` ⟵ فارغ", [/immutable/.test(imm), /immutable/.test(immSnap), /cannot be deleted/.test(delV), okPid], [true, true, true, ""]);
    same("V.4 **سجلُّ النسخ لقارئ الخطّة** (المعالج)، والنسخةُ ورقمٌ غيرُ موجود ٤٠٤",
      [(await call("GET", `/api/physio/plans/${planA}/versions`, S.tech)).json?.versions?.map((v: any) => [v.version, v.how]), (await call("GET", `/api/physio/plans/${planA}/versions/1`, S.tech)).status,
        (await call("GET", `/api/physio/plans/${planA}/versions/9`, S.tech)).status], [[[1, "approval"]], 200, 404]);

    console.log("\n── ت. التعديلُ المباشر ──");
    const snap1 = (await call("GET", `/api/physio/plans/${planA}/versions/1`, S.sup)).json.snapshot as PlanSnapshot;
    const editPrec = () => { const e = editFromSnapshot(snap1); e.texts.precautionsAr = "علي حسين يحتاج مراقبة الضغط"; return e; };
    const countV = async () => (await versionsOf(planA)).length;
    const auditN = async () => Number((await q(`SELECT count(*)::int n FROM audit_log WHERE entity_type = 'physio_plan' AND entity_id = $1`, [planA]))[0].n);
    const a0 = await auditN();
    const pv = await call("POST", `/api/physio/plans/${planA}/opus-edit/preview`, S.sup, { baseVersion: 1, edit: editPrec() });
    same("DE.1 **المعاينةُ قراءةٌ وحدها**: الفرقُ والبوّابات بلا كتابةٍ ولا تدقيق", [pv.status, pv.json?.blocking?.length, /الاحتياطات/.test(pv.json?.diffSummaryAr ?? ""), await countV(), await auditN()],
      [200, 0, true, 1, a0]);
    same("DE.5 **غيرُ المعتمِد لا يعدّل** (٤٠٣)، و**أبوابُ التعديل القديمة ٤٠٩ لأيّ أحد** على خطّة Bionic AI المعتمَدة",
      [(await call("POST", `/api/physio/plans/${planA}/opus-edit/preview`, S.spec, { baseVersion: 1, edit: editPrec() })).status,
        (await call("PUT", `/api/physio/plans/${planA}`, S.sup, { titleAr: "x", devices: [] })).json?.code,
        (await call("PUT", `/api/physio/plans/${planA}/phases`, S.sup, { phases: [] })).json?.code, (await call("DELETE", `/api/physio/plans/${planA}`, S.spec)).json?.code],
      [403, "opus_plan_versioned", "opus_plan_versioned", "opus_delete_approver_only"]);
    same("DE.3 **بلا سبب ٤٠٠ · أساسٌ قديم ٤٠٩ · بصمةُ المعاينة تغيّرت ٤٠٩**",
      [(await call("POST", `/api/physio/plans/${planA}/opus-edit`, S.sup, { baseVersion: 1, edit: editPrec(), gateHash: pv.json.gateHash })).json?.code,
        (await call("POST", `/api/physio/plans/${planA}/opus-edit`, S.sup, { baseVersion: 2, edit: editPrec(), reason: "سبب واضح", gateHash: pv.json.gateHash })).json?.code,
        (await call("POST", `/api/physio/plans/${planA}/opus-edit`, S.sup, { baseVersion: 1, edit: editPrec(), reason: "سبب واضح", gateHash: "x" })).json?.code],
      ["reason_required", "version_conflict", "gates_changed"]);
    {
      const e = editFromSnapshot(snap1);
      e.devices.push({ deviceCode: "shockwaves", use: "adjunct", minutes: 10, everyDays: null, times: null, noteAr: null, btlModelId: "rswt-elite", program: null, fallback: [] });
      e.devices[0].minutes = 45;
      const bad = await call("POST", `/api/physio/plans/${planA}/opus-edit/preview`, S.sup, { baseVersion: 1, edit: e });
      const saveBad = await call("POST", `/api/physio/plans/${planA}/opus-edit`, S.sup, { baseVersion: 1, edit: e, reason: "إضافة الموجات", gateHash: bad.json.gateHash });
      const fix = await call("POST", `/api/physio/plans/${planA}/opus-edit/preview`, S.sup, { baseVersion: 1, edit: { ...bad.json.suggestedEdit, texts: editPrec().texts } });
      same("DE.4 **الممنوعُ (الوارفارين) والدقائقُ فوق الحدّ ⟵ مانعٌ وتصحيحٌ مقترح**، والحفظُ يُردّ، والتصحيحُ يمرّ",
        [bad.json?.blocking?.map((b: any) => b.code).sort(), saveBad.json?.code, fix.json?.blocking?.length, fix.json?.suggestedEdit], [["forbidden", "minutes_clamped"], "edit_gates_blocking", 0, null]);
    }
    const b2 = await maxOutbox();
    const pv2 = await call("POST", `/api/physio/plans/${planA}/opus-edit/preview`, S.sup, { baseVersion: 1, edit: editPrec() });
    const sv = await call("POST", `/api/physio/plans/${planA}/opus-edit`, S.sup, { baseVersion: 1, edit: editPrec(), reason: "إضافة احتياط الضغط", gateHash: pv2.json.gateHash });
    const v2 = (await versionsOf(planA))[1];
    const pA3 = await planRow(planA);
    const ob = await outbox("physio_opus_plan_versioned", b2);
    same("DE.2 **الحفظُ ⟵ النسخة ٢** بسببها ومَن، والصفوفُ الحيّة، وسطرُ تدقيق، وتنبيهُ الفاحص والمعتمِدين بلا كاتب التعديل",
      [sv.status, sv.json?.version, v2?.how, v2?.reason, pA3.opus_version, /مراقبة الضغط/.test(pA3.precautions ?? ""), (pA3.precautions ?? "").includes(FORBIDDEN_LINE_PREFIX),
        (await q(`SELECT count(*)::int n FROM audit_log WHERE entity_type = 'physio_plan' AND entity_id = $1 AND action = 'opus_version'`, [planA]))[0].n,
        ob.length, (ob[0]?.target_user_ids ?? []).map(Number).includes(SPEC), Number(ob[0]?.exclude_user_id), /النسخة ٢/.test(ob[0]?.text ?? "")],
      [200, 2, "direct_edit", "إضافة احتياط الضغط", 2, true, true, 1, 1, true, SUP, true]);
    same("DE.3b **بلا تغيير ⟵ ٤٠٠ `no_change`**", (await call("POST", `/api/physio/plans/${planA}/opus-edit`, S.sup, { baseVersion: 2, edit: editPrec(), reason: "لا شيء",
      gateHash: (await call("POST", `/api/physio/plans/${planA}/opus-edit/preview`, S.sup, { baseVersion: 2, edit: editPrec() })).json.gateHash })).json?.code, "no_change");
    {
      const e = editPrec(); e.texts.precautionsAr = null;
      const p = (await call("POST", `/api/physio/plans/${planA}/opus-edit/preview`, S.sup, { baseVersion: 2, edit: e })).json;
      same("DE.4g **مسحُ الاحتياطات لا يُسقط سطرَ الممنوع** من الأعمدة", composePlanColumns(p.snapshot).precautions?.includes(FORBIDDEN_LINE_PREFIX), true);
    }
    await q(`UPDATE physio_device_branches SET available = false WHERE device_id = $1 AND branch_id = $2`, [devId.electro, B1]);
    {
      const e = editPrec(); e.texts.stopRulesAr = "توقّف إذا ارتفع الضغط";
      const p = (await call("POST", `/api/physio/plans/${planA}/opus-edit/preview`, S.sup, { baseVersion: 2, edit: e })).json;
      same("DE.4e **سطرٌ لم يتغيّر صار غيرَ متوفّر ⟵ تنبيهٌ ويبقى**", [p.blocking?.length, p.warnings?.map((w: any) => w.code)], [0, ["unavailable_kept"]]);
    }
    await q(`UPDATE physio_device_branches SET available = true WHERE device_id = $1 AND branch_id = $2`, [devId.electro, B1]);
    await q(`UPDATE physio_protocols SET total_sessions = 8, max_total_sessions = 8 WHERE id = $1`, [P]);
    {
      const e = editPrec(); e.texts.stopRulesAr = "توقّف إذا ارتفع الضغط";
      const p = (await call("POST", `/api/physio/plans/${planA}/opus-edit/preview`, S.sup, { baseVersion: 2, edit: e })).json;
      same("DE.4f **السقفُ نزل منذ النسخة ⟵ مانعٌ «تغيّر حدٌّ منذ النسخة ٢»** وإن لم يُمسّ العدد", [p.blocking?.map((b: any) => b.code)[0], /تغيّر حدٌّ منذ النسخة ٢/.test(p.blocking?.[0]?.reasonAr ?? "")],
        ["sessions_clamped", true]);
    }
    await q(`UPDATE physio_protocols SET total_sessions = 12, max_total_sessions = 18 WHERE id = $1`, [P]);

    console.log("\n── س. الجلسةُ بالنسخة ──");
    const exec = (planVersion?: number) => call("POST", `/api/physio/plans/${planA}/sessions`, S.tech, { items: [{ deviceId: devId.electro, done: true }], ...(planVersion === undefined ? {} : { planVersion }) });
    const s0 = await exec();
    const s1 = await exec(1);
    const s2 = await exec(2);
    same("S.4 **بلا نسخة أو بنسخةٍ قديمة ⟵ ٤٠٩ `plan_version_changed`، وبالنافذة ⟵ تُسجَّل الجلسةُ عليها**",
      [s0.json?.code, s1.json?.code, s2.status, s2.json?.planVersion, (await q(`SELECT plan_version FROM physio_plan_sessions WHERE plan_id = $1`, [planA])).map((r) => r.plan_version)],
      ["plan_version_changed", "plan_version_changed", 200, 2, [2]]);
    same("S.3 والجلساتُ تقول نسختَها، والسجلُّ عددَ جلسات كلّ نسخة",
      [(await call("GET", `/api/physio/plans/${planA}/sessions`, S.tech)).json?.sessions?.[0]?.planVersion,
        (await call("GET", `/api/physio/plans/${planA}/versions`, S.tech)).json?.versions?.map((v: any) => v.sessionsOnVersion)], [2, [0, 1]]);

    console.log("\n── ط. «اطلب من Bionic AI تعديلاً» بعد الاعتماد ──");
    same("AM.2 **أساسٌ قديم ٤٠٩ · غيرُ المعتمِد ٤٠٣ · بلا طلب ٤٠٠**",
      [(await call("POST", `/api/physio/plans/${planA}/opus-amend`, S.sup, { request: "أضف تمريناً", baseVersion: 1 })).json?.code,
        (await call("POST", `/api/physio/plans/${planA}/opus-amend`, S.spec, { request: "أضف تمريناً", baseVersion: 2 })).status,
        (await call("POST", `/api/physio/plans/${planA}/opus-amend`, S.sup, { request: "", baseVersion: 2 })).json?.code], ["version_conflict", 403, "note_required"]);
    const REQ = "أضف التمرين C في المرحلة الأولى بدل A";
    const am = await call("POST", `/api/physio/plans/${planA}/opus-amend`, S.sup, { request: REQ, baseVersion: 2 });
    const jM = await lastJob(pA);
    same("AM.1 **الطلبُ ⟵ ٢٠٢ ووظيفةُ «تعديل» على أحدث معاينة بنسختها الأساس**", [am.status, jM.revise_scope, jM.trigger, jM.base_version, Number(jM.exam_id)], [202, "amend", "approver_request", 2, eA]);
    resetModel();
    queues.writer.push(msg([tu("submit_plan", lib({ dose: { total_sessions: 10, sessions_per_week: 5, session_minutes: 50, why_en: null },
      exercise_changes: [{ phase: 1, from_exercise_id: EX1, to_exercise_id: EX3, reason_ar: "طلب المعتمِد" }] }))]));
    queues.reviewer.push(pass());
    const b3 = await maxOutbox();
    await runAgentOnce({ skipReconcile: true });
    const jM2 = (await q(`SELECT * FROM physio_agent_jobs WHERE id = $1`, [jM.id]))[0];
    const wM = JSON.parse((calls.find((c) => c.role === "writer")?.body as any)?.messages?.[0]?.content?.[0]?.text ?? "{}");
    const idsA = patientIdentifierSet({ name: `علي حسين ${MARK}` });
    same("AM.3 **الكاتبُ يقرأ النسخةَ النافذة** (٢) بأسبابها", [wM.revision?.currentVersion?.version, wM.revision?.versionsSoFar?.map((v: any) => v.how)], [2, ["approval", "direct_edit"]]);
    same("AM.13 **اسمُ المريض الذي كتبه المعتمِد في احتياطٍ لا يصل النموذج** — والوظيفةُ نجحت",
      [jM2.status, calls.every((c) => findAuthoredLeaks(authoredTextOf(c.body as any), idsA).length === 0), JSON.stringify(calls).includes("علي حسين")], ["succeeded", true, false]);
    const live = async () => (await q(`SELECT pe.exercise_id FROM physio_plan_phase_exercises pe JOIN physio_plan_phases ph ON ph.id = pe.phase_id WHERE ph.plan_id = $1 AND ph.position = 1`, [planA]))
      .map((r) => Number(r.exercise_id));
    same("AM.4 **اقتراحٌ منتظر — والنسخةُ النافذة تبقى تُنفَّذ** (الصفوفُ والرقمُ كما هما)، وتنبيهُ المعتمِدين",
      [jM2.proposal_status, (await planRow(planA)).opus_version, await live(), (await outbox("physio_opus_plan_ready", b3)).some((o) => /اقترح Bionic AI تعديلاً/.test(o.text))],
      ["pending", 2, [EX1], true]);
    const rev = (await call("GET", `/api/physio/plans/${planA}/opus-revision`, S.sup)).json;
    same("AM.4b «حالُ التعديل» للمعتمِد: الاقتراحُ بفرقه وبصمته، ولغيره ٤٠٣",
      [rev?.proposal?.jobId, rev?.proposal?.baseVersion, rev?.proposal?.diff?.sections?.map((s: any) => s.key).includes("exercises"), typeof rev?.proposal?.proposalHash,
        (await call("GET", `/api/physio/plans/${planA}/opus-revision`, S.spec)).status], [Number(jM.id), 2, true, "string", 403]);
    same("N.3 **الشارةُ تجمع الاقتراحات**", (await call("GET", `/api/physio/red-flag-reviews/pending-count`, S.sup)).json?.opusProposals, 1);
    same("AM.7 **بصمةٌ قديمة ⟵ ٤٠٩**، وغيرُ المعتمِد ٤٠٣",
      [(await call("POST", `/api/physio/opus-jobs/${jM.id}/proposal/save`, S.sup, { proposalHash: "x", acknowledgedIssueIds: [] })).json?.code,
        (await call("POST", `/api/physio/opus-jobs/${jM.id}/proposal/save`, S.spec, { proposalHash: rev.proposal.proposalHash, acknowledgedIssueIds: [] })).status], ["proposal_changed", 403]);
    const saveP = await call("POST", `/api/physio/opus-jobs/${jM.id}/proposal/save`, S.sup, { proposalHash: rev.proposal.proposalHash, acknowledgedIssueIds: [], note: "موافق" });
    const v3 = (await versionsOf(planA))[2];
    const jM3 = (await q(`SELECT * FROM physio_agent_jobs WHERE id = $1`, [jM.id]))[0];
    same("AM.6 **الحفظُ ⟵ النسخة ٣ «تعديلٌ من Bionic AI»** سببُها الطلب، والوظيفةُ «حُفظ»، والصفوفُ من الاقتراح",
      [saveP.status, saveP.json?.version, v3?.how, v3?.reason, v3?.approval_note, Number(v3?.job_id), jM3.proposal_status, jM3.saved_version, (await planRow(planA)).opus_version, await live()],
      [200, 3, "opus_revision", REQ, "موافق", Number(jM.id), "accepted", 3, 3, [EX3]]);
    {
      const forTech = (await call("GET", `/api/physio/plans/${planA}/versions`, S.tech)).json?.versions?.[2];
      const forSup = (await call("GET", `/api/physio/plans/${planA}/versions`, S.sup)).json?.versions?.[2];
      const oneTech = (await call("GET", `/api/physio/plans/${planA}/versions/3`, S.tech)).json;
      same("VIS.1 **نصُّ طلب المعتمِد إلى Bionic AI للمعتمِدين وحدهم** — المعالجُ يرى سبباً ثابتاً بلا ملاحظة الحفظ، والمعتمِدُ يرى الطلب",
        [forTech?.reason, forTech?.approvalNote, oneTech?.reason, oneTech?.approvalNote, forSup?.reason, forSup?.approvalNote],
        ["تعديلٌ من Bionic AI بطلب المعتمِد", null, "تعديلٌ من Bionic AI بطلب المعتمِد", null, REQ, "موافق"]);
    }
    same("AM.8 **الحفظُ مرّةً ثانية ⟵ ٤٠٩ `not_pending`**", (await call("POST", `/api/physio/opus-jobs/${jM.id}/proposal/save`, S.sup, { proposalHash: rev.proposal.proposalHash })).json?.code, "not_pending");

    //  AM.1b — طلبٌ أحدث يفشل لا يمسّ الاقتراحَ المنتظر قبله.
    await call("POST", `/api/physio/plans/${planA}/opus-amend`, S.sup, { request: "خفّف الجلسات إلى تسع", baseVersion: 3 });
    const jA2 = await lastJob(pA);
    resetModel(); queues.writer.push(msg([tu("submit_plan", lib({ dose: { total_sessions: 9, sessions_per_week: 5, session_minutes: 50, why_en: null },
      exercise_changes: [] }))])); queues.reviewer.push(pass());
    await runAgentOnce({ skipReconcile: true });
    await call("POST", `/api/physio/plans/${planA}/opus-amend`, S.sup, { request: "أوقف كلّ الأجهزة نهائياً", baseVersion: 3 });
    const jB = await lastJob(pA);
    resetModel(); queues.writer.push(msg([tu("decline_plan", { reason_ar: "لا يجوز إيقاف كلّ شيء", reason_en: "no", recommended_action_ar: "راجِع الطبيب" })]));
    await runAgentOnce({ skipReconcile: true });
    same("AM.1b/AM.9 **رفضُ Bionic AI ⟵ `revision_declined`، والاقتراحُ المنتظر قبله باقٍ**",
      [(await q(`SELECT status, error_code FROM physio_agent_jobs WHERE id = $1`, [jB.id]))[0], (await q(`SELECT proposal_status FROM physio_agent_jobs WHERE id = $1`, [jA2.id]))[0].proposal_status],
      [{ status: "failed", error_code: "revision_declined" }, "pending"]);
    {
      const forSpec = (await call("GET", `/api/physio/exams/${eA}/opus-job`, S.spec)).json?.job;
      const forSup = (await call("GET", `/api/physio/exams/${eA}/opus-job`, S.sup)).json?.job;
      same("VIS.2 **رفضُ Bionic AI لطلب التعديل لا يصل الفاحصَ بنصّه** (قد يعيد ملاحظةَ المعتمِد) — نصٌّ ثابت، والمعتمِدُ يرى السبب",
        [Number(forSpec?.id), forSpec?.error, /لا يجوز/.test(forSpec?.error ?? ""), forSpec?.newFinding, /لا يجوز/.test(forSup?.error ?? "")],
        [Number(jB.id), JOB_ERROR_TEXTS.revision_declined, false, null, true]);
    }
    {
      const e = editFromSnapshot((await call("GET", `/api/physio/plans/${planA}/versions/3`, S.sup)).json.snapshot); e.texts.homeProgramAr = "المشي يومياً";
      const p = (await call("POST", `/api/physio/plans/${planA}/opus-edit/preview`, S.sup, { baseVersion: 3, edit: e })).json;
      await call("POST", `/api/physio/plans/${planA}/opus-edit`, S.sup, { baseVersion: 3, edit: e, reason: "برنامج منزلي", gateHash: p.gateHash });
    }
    const pend = (await q(`SELECT proposal_status, proposal_reason, result FROM physio_agent_jobs WHERE id = $1`, [jA2.id]))[0];
    same("DE.8 **تعديلٌ مباشر ⟵ الاقتراحُ المنتظر يقدُم**، وحفظُه ٤٠٩",
      [pend.proposal_status, pend.proposal_reason, (await call("POST", `/api/physio/opus-jobs/${jA2.id}/proposal/save`, S.sup, { proposalHash: pend.result.final.revision.proposalHash })).json?.code],
      ["stale", "edited_directly", "not_pending"]);

    console.log("\n── م٣. مراجعةُ المرحلة الثالثة ──");
    //  FX.1 — حفظُ اقتراحٍ منتظر يلغي طلبَ «تعديل» جارياً على الخطّة (أساسُه قدُم)، ويُقال لطالبه.
    await call("POST", `/api/physio/plans/${planA}/opus-amend`, S.sup, { request: "زد دقائق التحفيز إلى عشرين", baseVersion: 4 });
    const jF1 = await lastJob(pA);
    resetModel(); queues.writer.push(msg([tu("submit_plan", lib({ dose: { total_sessions: 11, sessions_per_week: 5, session_minutes: 50, why_en: null } }))])); queues.reviewer.push(pass());
    await runAgentOnce({ skipReconcile: true });
    const wF1 = JSON.parse((calls.find((c) => c.role === "writer")?.body as any)?.messages?.[0]?.content?.[0]?.text ?? "{}");
    const earlierF1 = (wF1.revision?.earlierNotes ?? []).map((n: any) => n.note);
    same("FX.2 **الملاحظاتُ السابقة الملزمة ما أُخذ بنتيجته وحده** — الإعادةُ الناجحة والاقتراحُ المحفوظ، لا المتجاهَلُ ولا القديمُ ولا المرفوض",
      [earlierF1.includes(NOTE), earlierF1.includes(REQ), earlierF1.includes("خفّف الجلسات إلى تسع"), earlierF1.includes("أوقف كلّ الأجهزة نهائياً")], [true, true, false, false]);
    await call("POST", `/api/physio/plans/${planA}/opus-amend`, S.sup, { request: "أضف المشي في البيت", baseVersion: 4 });
    const jF2 = await lastJob(pA);
    const pF1 = (await call("GET", `/api/physio/plans/${planA}/opus-revision`, S.sup)).json?.proposal;
    const bF = await maxOutbox();
    const svF1 = await call("POST", `/api/physio/opus-jobs/${jF1.id}/proposal/save`, S.sup, { proposalHash: pF1?.proposalHash, acknowledgedIssueIds: [] });
    same("FX.1 **حفظُ الاقتراح ⟵ النسخة ٥ ويُلغى طلبُ «تعديل» قائمٌ على النسخة ٤** (`base_version_changed`) ويُقال للمعتمِدين",
      [svF1.status, svF1.json?.version, (await q(`SELECT status, error_code FROM physio_agent_jobs WHERE id = $1`, [jF2.id]))[0],
        (await outbox("physio_opus_plan_ready", bF)).some((o) => /حُفظت نسخةٌ أحدث من الخطّة فأُلغي طلبُك/.test(o.text))],
      [200, 5, { status: "cancelled", error_code: "base_version_changed" }, true]);
    //  FX.3 — حارسُ الأساس في الحفظ: نسخةٌ أحدث كُتبت بطريقٍ لا يُقدِم الاقتراح ⟵ الحفظُ يقدُمه هو ولا يكتب فوق النسخة الأحدث.
    await call("POST", `/api/physio/plans/${planA}/opus-amend`, S.sup, { request: "خفّف جلسات الأسبوع إلى أربع", baseVersion: 5 });
    const jF3 = await lastJob(pA);
    resetModel(); queues.writer.push(msg([tu("submit_plan", lib({ dose: { total_sessions: 11, sessions_per_week: 4, session_minutes: 50, why_en: null } }))])); queues.reviewer.push(pass());
    await runAgentOnce({ skipReconcile: true });
    const hF3 = (await call("GET", `/api/physio/plans/${planA}/opus-revision`, S.sup)).json?.proposal?.proposalHash;
    await q(`INSERT INTO physio_plan_versions (plan_id, patient_id, version, how, reason, snapshot, snapshot_hash, gate_log, created_by_name)
      SELECT plan_id, patient_id, 6, 'direct_edit', 'نسخةٌ للاختبار', snapshot, snapshot_hash, gate_log, 'اختبار' FROM physio_plan_versions WHERE plan_id = $1 AND version = 5`, [planA]);
    await q(`UPDATE physio_plans SET opus_version = 6 WHERE id = $1`, [planA]);
    const svF3 = await call("POST", `/api/physio/opus-jobs/${jF3.id}/proposal/save`, S.sup, { proposalHash: hF3, acknowledgedIssueIds: [] });
    same("FX.3 **أساسُ الاقتراح قدُم ⟵ ٤٠٩ `proposal_stale` ويقدُم الاقتراح** (`base_version_changed`)، ولا نسخةَ سابعة",
      [svF3.json?.code, (await q(`SELECT proposal_status, proposal_reason FROM physio_agent_jobs WHERE id = $1`, [jF3.id]))[0], (await versionsOf(planA)).length],
      ["proposal_stale", { proposal_status: "stale", proposal_reason: "base_version_changed" }, 6]);
    //  FX.8 — اقتراحٌ منتظر على معاينةٍ لم تعد الأحدث يقدُم عند التوقيع، لا عند محاولة حفظه.
    await call("POST", `/api/physio/plans/${planA}/opus-amend`, S.sup, { request: "أضف تمرين توازن", baseVersion: 6 });
    const jF4 = await lastJob(pA);
    resetModel(); queues.writer.push(msg([tu("submit_plan", lib({ dose: { total_sessions: 12, sessions_per_week: 4, session_minutes: 50, why_en: null } }))])); queues.reviewer.push(pass());
    await runAgentOnce({ skipReconcile: true });
    same("FX.8a الاقتراحُ ينتظر ويُعدّ في الشارة", [(await q(`SELECT proposal_status FROM physio_agent_jobs WHERE id = $1`, [jF4.id]))[0].proposal_status,
      (await call("GET", `/api/physio/red-flag-reviews/pending-count`, S.sup)).json?.opusProposals], ["pending", 1]);
    await sign(pA);
    for (let i = 0; i < 40 && (await q(`SELECT proposal_status FROM physio_agent_jobs WHERE id = $1`, [jF4.id]))[0].proposal_status === "pending"; i++) await wait(50);
    same("FX.8 **معاينةٌ أحدث ⟵ الاقتراحُ المنتظر يقدُم الآن** (`superseded_by_newer_exam`) ويخرج من الشارة",
      [(await q(`SELECT proposal_status, proposal_reason FROM physio_agent_jobs WHERE id = $1`, [jF4.id]))[0], (await call("GET", `/api/physio/red-flag-reviews/pending-count`, S.sup)).json?.opusProposals],
      [{ proposal_status: "stale", proposal_reason: "superseded_by_newer_exam" }, 0]);
    await q(`UPDATE physio_agent_jobs SET status = 'cancelled', finished_at = now(), error_code = 'cancelled_by_user', error = 'x' WHERE patient_id = $1 AND status = 'queued'`, [pA]);
    //  FX.6 — طلبُ «تعديل» ينتهي بنفاد المحاولات (العاملُ الضائع) لا يموت صامتاً.
    await call("POST", `/api/physio/plans/${planA}/opus-amend`, S.sup, { request: "راجع الأجهزة", baseVersion: 6 });
    const jF6 = await lastJob(pA);
    await q(`UPDATE physio_agent_jobs SET status = 'running', locked_by = 'ghost', locked_at = now(), heartbeat_at = now() - interval '1 hour', failures = max_failures - 1 WHERE id = $1`, [jF6.id]);
    const bF6 = await maxOutbox();
    await recoverStale();
    same("FX.6 **نفادُ المحاولات في «تعديل» ⟵ `worker_lost` ويُنبَّه المعتمِدون**",
      [(await q(`SELECT status, error_code FROM physio_agent_jobs WHERE id = $1`, [jF6.id]))[0], (await outbox("physio_opus_plan_ready", bF6)).some((o) => /لم يُكمل Bionic AI طلبَ التعديل/.test(o.text))],
      [{ status: "failed", error_code: "worker_lost" }, true]);
    //  FX.10 — قرارُ «تعديل» في تقييمٍ على خطّة Opus يُبلغ المعتمِدين (المعالجُ لا يفتح المحرّر).
    const bF10 = await maxOutbox();
    const asF = await call("POST", `/api/physio/plans/${planA}/assessments`, S.spec, { assessedOn: (await q(`SELECT (now() AT TIME ZONE 'Asia/Baghdad')::date::text AS d`))[0].d,
      pain: 4, notes: "ألمٌ جديد في الركبة", decision: "modify", scores: [], goals: [] });
    same("FX.10 **«تعديل» في تقييم خطّة Bionic AI ⟵ المعتمِدون يُنبَّهون بالقرار**",
      [asF.status, (await outbox("physio_opus_plan_ready", bF10)).some((o) => /تحتاج تعديلاً/.test(o.text) && /ألمٌ جديد في الركبة/.test(o.text))], [200, true]);

    //  AM.11 — الإيقافُ يلغي طلبَ التعديل.
    await call("POST", `/api/physio/plans/${planA}/opus-amend`, S.sup, { request: "عدّل الجرعة", baseVersion: 6 });
    const jC = await lastJob(pA);
    const st = await call("POST", `/api/physio/plans/${planA}/stop`, S.spec, { reason: "سافر المريض" });
    same("AM.11 **الإيقافُ (بيد الأخصائيّ) يلغي طلبَ التعديل** `plan_closed`، والتعديلُ بعده ٤٠٩",
      [st.status, (await q(`SELECT status, error_code FROM physio_agent_jobs WHERE id = $1`, [jC.id]))[0], (await call("POST", `/api/physio/plans/${planA}/opus-amend`, S.sup, { request: "x y z", baseVersion: 6 })).json?.code],
      [200, { status: "cancelled", error_code: "plan_closed" }, "plan_closed"]);

    console.log("\n── ق٢. أسئلةٌ مرّتين ⟵ إخفاق، والإلغاءُ بالمعاينة ──");
    const pB = await patient("باقر جاسم");
    await sign(pB);
    const { plan: planB0 } = await writePlan(pB);
    await call("POST", `/api/physio/plans/${planB0.id}/opus-return`, S.sup, { note: "أعد النظر في الأجهزة" });
    const jRB = await lastJob(pB);
    resetModel();
    const askQ = () => msg([tu("ask_questions", { questions: [{ id: "q1", text_ar: "هل لدى المريض حساسية من الجل؟", why_en: "x", affects: "preference" }] })]);
    queues.writer.push(askQ(), askQ());
    const b4 = await maxOutbox();
    await runAgentOnce({ skipReconcile: true });
    same("RT.5c **السؤالُ الثاني ⟵ `questions_in_revision`، والخطّةُ كما هي، والمعتمِدون يُنبَّهون**",
      [(await q(`SELECT status, error_code FROM physio_agent_jobs WHERE id = $1`, [jRB.id]))[0], Number((await planRow(planB0.id)).agent_job_id) === Number(planB0.agent_job_id),
        (await outbox("physio_opus_plan_ready", b4)).length >= 1, (await outbox("physio_opus_questions", b4)).length], [{ status: "failed", error_code: "questions_in_revision" }, true, true, 0]);
    await call("POST", `/api/physio/plans/${planB0.id}/opus-return`, S.sup, { note: "أعد النظر في الأجهزة مرّة أخرى" });
    const jRB2 = await lastJob(pB);
    const b5 = await maxOutbox();
    await sign(pB);   // معاينةٌ أحدث ⟵ المصالحة تلغي وظيفةَ «أعِده»
    await wait(300);
    same("RT.15 **معاينةٌ أحدث ⟵ طلبُ الإعادة يُلغى ويُقال للمعتمِدين ليعيدوا طلبَهم**",
      [(await q(`SELECT status, error_code FROM physio_agent_jobs WHERE id = $1`, [jRB2.id]))[0].error_code, (await outbox("physio_opus_plan_ready", b5)).some((o) => /أُلغي طلبُك إلى Bionic AI/.test(o.text))],
      ["superseded_by_newer_exam", true]);

    //  وظيفةُ الكتابة التلقائية للمعاينة الأحدث لا تُشغَّل هنا (تأخذ دورَ المريض التالي في العامل).
    await q(`UPDATE physio_agent_jobs SET status = 'cancelled', finished_at = now(), error_code = 'cancelled_by_user', error = 'x' WHERE patient_id = $1 AND status = 'queued'`, [pB]);
    console.log("\n── ح. السلّة والقيود والبنية والحذف ──");
    const pC = await patient("كاظم مهدي");
    await sign(pC);
    const { plan: planC0 } = await writePlan(pC);
    await call("POST", `/api/physio/plans/${planC0.id}/opus-return`, S.sup, { note: "ملاحظة للسلّة" });
    const jRC = await lastJob(pC);
    await softDeletePatient({ patientId: pC, reason: "اختبار السلّة مع طلب تعديل", actor: { userId: ADMIN, displayName: "م", role: "admin", isAdmin: true, scope: null } as any });
    same("M.3 **السلّةُ تلغي طلبَ «التعديل»**", (await q(`SELECT status FROM physio_agent_jobs WHERE id = $1`, [jRC.id]))[0].status, "cancelled");
    const ck = async (sqlText: string) => { try { await q(sqlText); return "ok"; } catch (e: any) { return String(e.constraint ?? e.message).replace(/^.*(ck_\w+).*$/, "$1"); } };
    same("CK. **قيودُ الترحيل ٢٠٠ مكتوبة** (المُطلِقُ والنوعُ والنطاقُ والاقتراحُ والنسخة ١ والسبب)", [
      await ck(`INSERT INTO physio_agent_jobs (patient_id, exam_id, branch_id, kind, trigger, exam_fingerprint) VALUES (${pB}, ${eA}, ${B1}, 'write', 'approver_return', 'x')`),
      await ck(`INSERT INTO physio_agent_jobs (patient_id, exam_id, branch_id, kind, trigger, exam_fingerprint, status, finished_at, error_code, error) VALUES (${pB}, ${eA}, ${B1}, 'revise', 'approver_return', 'x', 'failed', now(), 'x', 'x')`),
      await ck(`INSERT INTO physio_agent_jobs (patient_id, exam_id, branch_id, kind, trigger, exam_fingerprint, revise_scope, revise_note, status, finished_at, error_code, error) VALUES (${pB}, ${eA}, ${B1}, 'revise', 'approver_request', 'x', 'amend', ' ', 'failed', now(), 'x', 'x')`),
      await ck(`UPDATE physio_agent_jobs SET saved_version = 2 WHERE id = ${jB.id}`),
      await ck(`INSERT INTO physio_plan_versions (plan_id, patient_id, version, how, reason, snapshot, snapshot_hash) VALUES (${planA}, ${pA}, 1, 'direct_edit', 'سبب', '{}'::jsonb, 'h')`),
      await ck(`INSERT INTO physio_plan_versions (plan_id, patient_id, version, how, snapshot, snapshot_hash) VALUES (${planA}, ${pA}, 9, 'direct_edit', '{}'::jsonb, 'h')`)],
      ["ck_paj_trig_kind", "ck_paj_revise", "ck_paj_scope", "ck_paj_saved", "ck_ppv_v1", "ck_ppv_reason"]);
    {
      const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = path.join(d, f); return statSync(p).isDirectory() ? walk(p) : /\.ts$/.test(f) && !/\.test\.ts$/.test(f) ? [p] : []; });
      const hits = walk(path.resolve(process.cwd(), "server")).filter((f) => !/migrations/.test(f)).flatMap((f) => (readFileSync(f, "utf8").match(/INSERT INTO physio_plan_versions|insert\(physioPlanVersions\)/g) ?? []).map(() => path.basename(f)));
      same("ST.1 **بابٌ واحد لكتابة نسخة** (`writeVersionTx` في `versions.ts`)", hits, ["versions.ts"]);
    }
    same("C.0 الطلبُ المنتظر يُعرض في «تعديلاتٌ مقترحة» على خطّته", (await call("GET", `/api/physio/opus-plans?view=proposals`, S.sup)).json?.rows?.length, 0);

    console.log("\n── ج١. «أقصى عدد جلسات» في البروتوكول ──");
    const C1 = Number((await q(`INSERT INTO physio_protocols (code, title_ar, title_en, category, age_group, status, total_sessions, sessions_per_week) VALUES ('test-oprev-c1', 'بروتوكول ج١', 'C1', 'spine', 'adult', 'draft', 12, 3) RETURNING id`))[0].id);
    const body = (over: Record<string, unknown> = {}) => ({ code: "test-oprev-c1", titleAr: "بروتوكول ج١", titleEn: "C1", category: "spine", ageGroup: "adult", totalSessions: 12, sessionsPerWeek: 3, devices: [], references: [], ...over });
    const r1 = await call("PUT", `/api/physio/protocols/${C1}`, S.sup, body({ maxTotalSessions: 10 }));
    const r2 = await call("PUT", `/api/physio/protocols/${C1}`, S.sup, body({ maxTotalSessions: 301 }));
    const r3 = await call("PUT", `/api/physio/protocols/${C1}`, S.sup, body({ maxTotalSessions: 18 }));
    const r4 = await call("PUT", `/api/physio/protocols/${C1}`, S.sup, body({ totalSessions: 20 }));
    const r5 = await call("PUT", `/api/physio/protocols/${C1}`, S.sup, body({ totalSessions: 14 }));
    same("C.1 **أقصى العدد: دون العدد ٤٠٠ · فوق ٣٠٠ ٤٠٠ · الصحيحُ يُحفظ بسطر تدقيق · رفعُ العدد فوقه ٤٠٠ · والغائبُ يبقى**",
      [r1.status, r1.json?.error, r2.status, r3.status, r3.json?.maxTotalSessions, (await q(`SELECT count(*)::int n FROM audit_log WHERE entity_type = 'physio_protocol' AND entity_id = $1 AND action = 'max_total_sessions'`, [String(C1)]))[0].n,
        r4.status, r4.json?.error, r5.status, (await q(`SELECT max_total_sessions FROM physio_protocols WHERE id = $1`, [C1]))[0].max_total_sessions],
      [400, "أقصى عدد الجلسات بين عدد الجلسات و٣٠٠", 400, 200, 18, 1, 400, "عددُ الجلسات فوق الأقصى المكتوب — يرفعه المسؤولُ أو المشرفُ العام", 200, 18]);

    console.log("\n── هـ. إعادةُ البوّابات عند الاعتماد، والتزامن، وحذفُ الخطّة ──");
    const pD = await patient("سجاد عباس");
    await sign(pD);
    const { plan: planD0 } = await writePlan(pD, { devices: [dev("electro", { btl_model_id: "btl-4825s-electro" }), dev("tecar", { use: "adjunct" })] });
    const planD = Number(planD0.id);
    await q(`UPDATE physio_protocol_devices SET centre_use = 'not_used' WHERE protocol_id = $1 AND device_id = $2`, [P, devId.tecar]);
    const bodyD = await approveBody(planD);
    const apD1 = await call("POST", `/api/physio/plans/${planD}/approve`, S.sup, bodyD);
    const jobD = (await q(`SELECT result FROM physio_agent_jobs WHERE id = $1`, [planD0.agent_job_id]))[0];
    const bodyD2 = await approveBody(planD);
    same("V.1b **البروتوكولُ تغيّر بعد الكتابة ⟵ ٤٠٩ `proposal_changed` والاقتراحُ المصحَّح محفوظٌ بعد الردّ**، وبصمتُه جديدة",
      [apD1.status, apD1.json?.code, (jobD.result?.final?.regated?.snapshot?.devices ?? []).map((d: any) => d.deviceCode), (await planRow(planD)).status, bodyD2.proposalHash !== bodyD.proposalHash],
      [409, "proposal_changed", ["electro"], "pending", true]);
    const apD2 = await call("POST", `/api/physio/plans/${planD}/approve`, S.sup, bodyD2);
    same("V.1c والاعتمادُ ببصمته الجديدة ينجح — النسخةُ ١ بلا الجهاز الذي صار «لا يُستخدم»",
      [apD2.status, (await versionsOf(planD))[0]?.snapshot?.devices?.map((d: any) => d.deviceCode),
        (await q(`SELECT d.code FROM physio_plan_devices l JOIN devices d ON d.id = l.device_id WHERE l.plan_id = $1`, [planD])).map((r) => r.code)], [200, ["electro"], ["electro"]]);
    await q(`UPDATE physio_protocol_devices SET centre_use = 'adjunct' WHERE protocol_id = $1 AND device_id = $2`, [P, devId.tecar]);
    {
      const sn = (await call("GET", `/api/physio/plans/${planD}/versions/1`, S.sup)).json.snapshot;
      const mk = (t: string) => { const e = editFromSnapshot(sn); e.texts.homeProgramAr = t; return e; };
      const [pa, pb] = await Promise.all([mk("أ"), mk("ب")].map((e) => call("POST", `/api/physio/plans/${planD}/opus-edit/preview`, S.sup, { baseVersion: 1, edit: e })));
      const rs = await Promise.all([[mk("أ"), pa], [mk("ب"), pb]].map(([e, p]: any) => call("POST", `/api/physio/plans/${planD}/opus-edit`, S.sup, { baseVersion: 1, edit: e, reason: "تزامن", gateHash: p.json.gateHash })));
      same("CC.1 **حفظان متزامنان على النسخة نفسِها ⟵ واحدٌ يكتب النسخة ٢ والآخر ٤٠٩ `version_conflict`**",
        [rs.map((r) => r.status).sort(), rs.map((r) => r.json?.code).filter(Boolean), (await versionsOf(planD)).length], [[200, 409], ["version_conflict"], 2]);
    }
    const dl = await call("DELETE", `/api/physio/plans/${planD}`, S.sup);
    const delAudit = (await q(`SELECT old_values FROM audit_log WHERE entity_type = 'physio_plan' AND entity_id = $1 AND action = 'delete' ORDER BY id DESC LIMIT 1`, [planD]))[0]?.old_values;
    same("M.5 **حذفُ خطّة Bionic AI (المعتمِد، بلا جلسات) ⟵ نسخُها في صورة التدقيق، وتُحذف معها** (القادحُ يسمح حين ذهب الأب)",
      [dl.status, (JSON.parse(typeof delAudit === "string" ? delAudit : JSON.stringify(delAudit ?? {})).opusVersions ?? []).length, (await versionsOf(planD)).length], [200, 2, 0]);

    console.log("\n── و. خطّةٌ اعتُمدت قبل نظام النسخ ──");
    const pE = await patient("مريم يوسف");
    await sign(pE);
    const { plan: planE0 } = await writePlan(pE);
    const planE = Number(planE0.id);
    await call("POST", `/api/physio/plans/${planE}/approve`, S.sup, await approveBody(planE));
    {
      const c = await pool.connect();
      try { await c.query("BEGIN"); await c.query("SET LOCAL bcm.allow_plan_version_delete = 'on'"); await c.query(`DELETE FROM physio_plan_versions WHERE plan_id = $1`, [planE]);
        await c.query(`UPDATE physio_plans SET opus_version = NULL WHERE id = $1`, [planE]); await c.query("COMMIT"); } finally { c.release(); }
    }
    const gv = (await call("GET", `/api/physio/plans/${planE}/versions`, S.tech)).json;
    same("V.5c **السجلُّ يُحسب ولا يُكتب** لخطّةٍ بلا نسخ (افتراضيّ)", [gv.virtual, gv.versions?.map((v: any) => [v.version, v.how, v.backfilled]), (await versionsOf(planE)).length],
      [true, [[1, "approval", true]], 0]);
    {
      const sn = (await call("GET", `/api/physio/plans/${planE}/versions/1`, S.sup)).json.snapshot;
      const e = editFromSnapshot(sn); e.texts.goalsAr = "هدفٌ جديد";
      const p = (await call("POST", `/api/physio/plans/${planE}/opus-edit/preview`, S.sup, { baseVersion: 1, edit: e })).json;
      const sv = await call("POST", `/api/physio/plans/${planE}/opus-edit`, S.sup, { baseVersion: 1, edit: e, reason: "هدف", gateHash: p.gateHash });
      const vs = await versionsOf(planE);
      same("V.5 **أوّلُ كتابةٍ تكتب النسخةَ ١ (مؤرَّخة «قبل نظام النسخ») ثمّ ٢**، وسطرُ التدقيق",
        [sv.status, vs.map((v) => [v.version, v.how, v.backfilled]),
          (await q(`SELECT count(*)::int n FROM audit_log WHERE entity_type = 'physio_plan' AND entity_id = $1 AND action IN ('version_backfill','version_backfill_divergent')`, [planE]))[0].n],
        [200, [[1, "approval", true], [2, "direct_edit", false]], 1]);
    }

    //  FX.9 — خطّةٌ اعتُمدت قبل نظام النسخ ثمّ عُدّلت صفوفُها: النسخةُ المعروضة ٢ (محسوبة)، والتنفيذُ يكتب النسختين ثمّ يختم الجلسةَ بالثانية.
    {
      const pF = await patient("زينب علي");
      await sign(pF);
      const { plan: planF0 } = await writePlan(pF);
      const planF = Number(planF0.id);
      await call("POST", `/api/physio/plans/${planF}/approve`, S.sup, await approveBody(planF));
      const c = await pool.connect();
      try { await c.query("BEGIN"); await c.query("SET LOCAL bcm.allow_plan_version_delete = 'on'"); await c.query(`DELETE FROM physio_plan_versions WHERE plan_id = $1`, [planF]);
        await c.query(`UPDATE physio_plans SET opus_version = NULL, total_sessions = 11 WHERE id = $1`, [planF]); await c.query("COMMIT"); } finally { c.release(); }
      const pv = (await call("GET", `/api/physio/plans/${planF}`, S.tech)).json;
      const ex1 = await call("POST", `/api/physio/plans/${planF}/sessions`, S.tech, { items: [{ deviceId: devId.electro, done: true }], planVersion: 1 });
      const ex2 = await call("POST", `/api/physio/plans/${planF}/sessions`, S.tech, { items: [{ deviceId: devId.electro, done: true }], planVersion: pv?.executionVersion });
      same("FX.9 **قبل نظام النسخ ومعدَّلة: المعروضُ = المُرسَل (٢)، والقديمُ ٤٠٩، والجلسةُ تُختم بالنسخة ٢ بعد كتابة النسختين**",
        [pv?.opusVersion, pv?.executionVersion, ex1.json?.code, ex2.status, ex2.json?.planVersion, (await versionsOf(planF)).map((v) => [v.version, v.backfilled]), Number((await planRow(planF)).opus_version)],
        [2, 2, "plan_version_changed", 200, 2, [[1, true], [2, true]], 2]);
    }
    //  FX.7 — «أعِده إلى Opus» بعد أن صحّحت البوّاباتُ الاقتراحَ عند الاعتماد: الأساسُ ما رآه المعتمِد (المصحَّح)، لا الأصل.
    {
      const pG = await patient("حسن كريم");
      await sign(pG);
      const { plan: planG0 } = await writePlan(pG, { devices: [dev("electro", { btl_model_id: "btl-4825s-electro" }), dev("tecar", { use: "adjunct" })] });
      const planG = Number(planG0.id);
      await q(`UPDATE physio_protocol_devices SET centre_use = 'not_used' WHERE protocol_id = $1 AND device_id = $2`, [P, devId.tecar]);
      const apG = await call("POST", `/api/physio/plans/${planG}/approve`, S.sup, await approveBody(planG));
      await call("POST", `/api/physio/plans/${planG}/opus-return`, S.sup, { note: "اجعل الجلسات عشراً" });
      resetModel(); queues.writer.push(msg([tu("submit_plan", lib({ dose: { total_sessions: 10, sessions_per_week: 6, session_minutes: 50, why_en: null } }))])); queues.reviewer.push(pass());
      await runAgentOnce({ skipReconcile: true });
      const wG = JSON.parse((calls.find((c) => c.role === "writer")?.body as any)?.messages?.[0]?.content?.[0]?.text ?? "{}");
      const rvG = (calls.find((c) => c.role === "reviewer")?.body as any)?.messages?.[0]?.content?.[0]?.text ?? "";
      const dG = JSON.parse(rvG.slice(rvG.indexOf("DIFF:\n") + 6) || "null");
      same("FX.7 **الإعادةُ بعد تصحيح البوّابات تقرأ المصحَّح** (`correctedByGates` بلا الجهاز المحذوف)، والفرقُ لا يذكر حذفَه ثانيةً",
        [apG.json?.code, wG.revision?.previousPlan?.correctedByGates, (wG.revision?.previousPlan?.plan?.devices ?? []).map((d: any) => d.deviceCode),
          JSON.stringify(dG ?? {}).includes("device:tecar")], ["proposal_changed", true, ["electro"], false]);
      await q(`UPDATE physio_protocol_devices SET centre_use = 'adjunct' WHERE protocol_id = $1 AND device_id = $2`, [P, devId.tecar]);
    }

    console.log("\n── د. حذفُ المريض كاملاً ──");
    let delErr = "";
    try { await storage.deletePatient(pA); } catch (e: any) { delErr = e.message; }
    same("M.1 **حذفُ مريضٍ له نسخٌ ووظائفُ «تعديل» وجلسات** ينجح، ولا يبقى له شيء", [delErr, (await q(`SELECT count(*)::int n FROM physio_plan_versions WHERE patient_id = $1`, [pA]))[0].n,
      (await q(`SELECT count(*)::int n FROM physio_agent_jobs WHERE patient_id = $1`, [pA]))[0].n], ["", 0, 0]);
  } catch (e) {
    check(false, `استثناءٌ في الاختبار: ${(e as Error)?.stack ?? e}`);
  } finally {
    await cleanup().catch((e) => console.error("cleanup", e));
    httpServer.close();
    await pool.end();
  }
  console.log(failures ? `\n❌ ${failures} تأكيداً سقط` : "\n✅ كلُّ التأكيدات نجحت");
  process.exit(failures ? 1 : 0);
}

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_sub_source = $1`, [MARK])).map((r) => Number(r.id));
  await q(`DELETE FROM physio_agent_jobs WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM physio_exam_red_flag_reviews WHERE patient_id = ANY($1::int[])`, [pts]);
  for (const id of pts) { try { await storage.deletePatient(id); } catch (e) { console.error("cleanup delete", id, (e as Error).message); } }
  const protos = (await q(`SELECT id FROM physio_protocols WHERE code LIKE 'test-oprev-%'`)).map((r) => Number(r.id));
  await q(`DELETE FROM physio_protocols WHERE id = ANY($1::int[])`, [protos]);
  await q(`DELETE FROM physio_exercises WHERE code LIKE 'TEST-OPREV-%'`);
  await q(`DELETE FROM physio_device_branches WHERE branch_id = $1`, [B1]);
  await q(`DELETE FROM staff_notification_outbox WHERE event_type LIKE 'physio_%' AND (exclude_user_id = ANY($1::int[]) OR target_user_ids && $1::int[] OR target_user_ids IS NULL)`, [IDS]);
  await q(`DELETE FROM staff_notification_prefs WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[]) OR branch_id = $2`, [IDS, B1]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch { /* */ }
  process.exit(1);
});
