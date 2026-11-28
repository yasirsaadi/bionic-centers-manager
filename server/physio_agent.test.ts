// «وكيلُ Opus يكتب خطّةَ العلاج الطبيعي من المعاينة» (§4.ha — ترحيل ١٩٩). `npm run test:physio-agent`
// القواعدُ الصرفة (البوّابات · البناءُ من البروتوكول · المحلّلات · المخطّطات · الخصوصية · الكتالوج)، ثمّ النقاطُ الحقيقية والعاملُ على Postgres محلّي
// **بنموذجٍ مزيّف** (`setAgentModelForTests`) — لا مفتاحَ ولا طلبَ خارجيّ: محادثاتٌ مكتوبة فيها أدواتٌ وبحثٌ و`pause_turn` ورفضٌ وأخطاءُ خدمة.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "physio-agent-test-secret";
delete process.env.ANTHROPIC_API_KEY;

import express from "express";
import { createServer } from "http";
import { randomUUID } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { db, pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { completeExamV2 } from "./test_fixtures/physio_exam_v2";
import { applyProductionChecks, productionChecksDrift } from "./test_fixtures/production_checks";
import { applyPlanGates, buildLibraryPlan, rescalePhaseRanges, type GateContext, type GateProtocol } from "@shared/physio_agent_gates";
import {
  ASK_QUESTIONS_SCHEMA, OPUS_AWAITING_LABEL, opusPlanStub, parseDecline, parseNewFinding, parseQuestions, parseReview, parseSubmittedPlan, planAccessFor,
  protocolSessionCeiling, STRICT_TOOLS, SUBMIT_PLAN_SCHEMA, SUBMIT_REVIEW_SCHEMA, normalizeSourceUrl, validateAnswers,
} from "@shared/physio_agent";
import { findAuthoredLeaks, findQueryLeaks, patientIdentifierSet, redactAuthoredText } from "@shared/physio_agent_privacy";
import { BTL_MODELS, NO_MODEL_DEVICE_CODES } from "@shared/btl_devices";
import { setAgentModelForTests, type AgentModelCall, authoredTextOf } from "./physio_agent/model";
import { isPromptTooLong, isTransient, setRetryDelaysForTests } from "./physio_agent/conversation";
import { TOOLS } from "./physio_agent/tools";
import { claimOne, recoverStale, releaseAllForTests, runAgentOnce, runClaimed, setAgentTimingForTests, workerStartedForTest } from "./physio_agent/worker";
import { setPipelineHookForTests } from "./physio_agent/pipeline";
import { reconcilerScan } from "./physio_agent/reconcile";
import { libraryIndex } from "./physio_agent/context";
import { AgentStop } from "./physio_agent/model";
import { MAX_TOTAL_SESSIONS } from "./migrations/199_physio_agent_jobs";
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

const PORT = Number(process.env.PHYSIO_AGENT_TEST_PORT) || 7041;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-وكيل-Opus";
const B1 = 9931, B3 = 9933;
const ADMIN = 9941, SUP = 9942, SPEC = 9943, SPEC2 = 9944, TECH = 9945;
const IDS = [ADMIN, SUP, SPEC, SPEC2, TECH];

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
const usage = (extra: Record<string, unknown> = {}) => ({ input_tokens: 10, output_tokens: 10, cache_read_input_tokens: 0, cache_creation_input_tokens: 0,
  server_tool_use: null, ...extra });
const msg = (content: any[], stop: string = "tool_use", u: Record<string, unknown> = {}): Anthropic.Message => ({
  id: `msg_${++toolSeq}`, type: "message", role: "assistant", model: "claude-opus-5-5", content, stop_reason: stop, stop_sequence: null, usage: usage(u),
} as any);
const tu = (name: string, input: unknown) => ({ type: "tool_use", id: `toolu_${++toolSeq}`, name, input });
const think = () => ({ type: "thinking", thinking: "", signature: `sig_${toolSeq}` });
const searchBlocks = (query: string, url: string, title: string) => {
  const id = `srvtoolu_${++toolSeq}`;
  return [{ type: "server_tool_use", id, name: "web_search", input: { query } },
    { type: "web_search_tool_result", tool_use_id: id, content: [{ type: "web_search_result", url, title, encrypted_content: "x", page_age: null }] }];
};
const fetchBlocks = (url: string) => {
  const id = `srvtoolu_${++toolSeq}`;
  return [{ type: "server_tool_use", id, name: "web_fetch", input: { url } },
    { type: "web_fetch_tool_result", tool_use_id: id, content: { type: "web_fetch_result", url, retrieved_at: null,
      content: { type: "document", source: { type: "text", media_type: "text/plain", data: "guideline text" } } } }];
};
const pass = () => msg([tu("submit_review", { verdict: "pass", summary_ar: "سليمة", issues: [], checked: ["constraints"] })]);
const revise = (sev = "major", id = "r1") => msg([tu("submit_review", { verdict: "revise", summary_ar: "تحتاج تعديلاً",
  issues: [{ id, severity: sev, area: "dose", problem_en: "too many", problem_ar: "كثيرة", fix_en: "reduce" }], checked: [] })]);
const auditMsg = (verdict: "pass" | "concerns", id = "a1", sev = "major") => msg([tu("submit_audit", { verdict, summary_ar: "تدقيق",
  issues: verdict === "pass" ? [] : [{ id, severity: sev, area: "source", problem_en: "weak", problem_ar: "ضعيف", fix_en: "x" }], sources_checked: [] })]);

const NICE = "https://www.nice.org.uk/guidance/ng59";
const GUIDE = "https://example.org/guide";

async function main() {
  // ══ ق. القواعدُ الصرفة ══════════════════════════════════════════════════════════════════════════════
  console.log("\n── ق. البوّاباتُ الصرفة ──");
  const proto = (over: Partial<GateProtocol> = {}): GateProtocol => ({
    id: 77, code: "t", status: "approved", origin: "library", isArchived: false, totalSessions: 12, maxTotalSessions: 18, sessionsPerWeek: 6, sessionMinutes: 50,
    devices: [
      { deviceCode: "electro", centreUse: "core", evidence: "recommended", minutes: 20, everyDays: null, times: null, params: {}, parameters: "P-electro", parametersEn: "E-electro", note: null, noteEn: null },
      { deviceCode: "shockwaves", centreUse: "adjunct", evidence: "optional", minutes: 10, everyDays: 7, times: 3, params: { mode: "radial", pressureBar: "2.5", frequencyHz: "8", impulses: "2000" },
        parameters: "P-sw", parametersEn: "E-sw", note: null, noteEn: null },
      { deviceCode: "ultrasound", centreUse: "not_used", evidence: "not_recommended", minutes: null, everyDays: null, times: null, params: {}, parameters: null, parametersEn: null, note: null, noteEn: null },
      { deviceCode: "laser", centreUse: "core", evidence: "optional", minutes: 10, everyDays: null, times: null, params: {}, parameters: null, parametersEn: null, note: null, noteEn: null },
    ],
    phases: [
      { position: 1, nameAr: "أولى", nameEn: "One", sessionFrom: 1, sessionTo: 6, timeframe: null, timeframeEn: null, goals: "g1", goalsEn: null, education: null, educationEn: null,
        progressCriteria: null, progressCriteriaEn: null, notes: null, notesEn: null,
        exercises: [{ exerciseId: 1, sets: 2, reps: 10, holdSeconds: 5, restSeconds: 30, doseNote: null, doseNoteEn: null, note: null, noteEn: null },
          { exerciseId: 2, sets: 2, reps: 10, holdSeconds: null, restSeconds: null, doseNote: null, doseNoteEn: null, note: null, noteEn: null }] },
      { position: 2, nameAr: "ثانية", nameEn: "Two", sessionFrom: 7, sessionTo: 12, timeframe: null, timeframeEn: null, goals: "g2", goalsEn: null, education: null, educationEn: null,
        progressCriteria: null, progressCriteriaEn: null, notes: null, notesEn: null,
        exercises: [{ exerciseId: 2, sets: 3, reps: 12, holdSeconds: null, restSeconds: null, doseNote: null, doseNoteEn: null, note: null, noteEn: null }] },
    ],
    ...over,
  });
  const exMap = new Map([[1, { archived: false, status: "approved", kind: "strength", region: "lumbar" }], [2, { archived: false, status: "draft", kind: "mobility", region: "lumbar" }],
    [3, { archived: false, status: "approved", kind: "strength", region: "lumbar" }], [4, { archived: false, status: "draft", kind: "strength", region: "lumbar" }],
    [5, { archived: true, status: "approved", kind: "strength", region: "lumbar" }]]);
  const ids0 = patientIdentifierSet({ name: "علي حسين كاظم", phones: ["07731234567"], patientCode: "BC-1234" });
  const gctx = (over: Partial<GateContext> = {}): GateContext => ({
    agentGate: { allowed: true, code: "clear", reason: "" }, forbidden: [], knownDeviceCodes: new Set(["electro", "shockwaves", "ultrasound", "laser", "tecar", "exercise", "megnatik"]),
    branchAvailable: new Set(["electro", "shockwaves", "ultrasound", "tecar", "exercise", "megnatik"]), protocol: proto(), exercises: exMap,
    fetchedUrls: new Set([normalizeSourceUrl(GUIDE)]), searchedUrls: new Set([normalizeSourceUrl(NICE)]), libraryIds: new Set([77]), ids: ids0, final: false, ...over,
  });
  const dev = (code: string, over: Record<string, unknown> = {}) => ({ device_code: code, use: "core", minutes: 15, every_days: null, times: null, btl_model_id: null,
    program: null, fallback: [], evidence: null, reason_ar: `سبب ${code}`, reason_en: "why", ...over });
  const lib = (over: Record<string, unknown> = {}) => ({
    mode: "library", protocol_id: 77, track: { name_ar: "المسار", name_en: "Main", why_en: "fits" }, starting_phase: 1,
    dose: { total_sessions: 12, sessions_per_week: 6, session_minutes: 50, why_en: null }, phase_notes: [], phases: [], devices: [dev("electro")],
    removed_devices: [], exercise_changes: [], proposed_cards: [], library_protocol: null, precautions_ar: "احتياط", precautions_en: null, stop_rules_ar: "توقّف إذا", stop_rules_en: null,
    home_program_ar: "برنامج", home_program_en: null, measures: [], goals_ar: null, goals_en: null, rationale_ar: "لأنّ", rationale_en: null, alternatives: [], assumptions: [],
    sources: [], ...over,
  });
  const gate = (input: unknown, over: Partial<GateContext> = {}) => {
    const p = parseSubmittedPlan(input);
    if (!p.ok) throw new Error(`parse: ${p.errors.join("; ")}`);
    return applyPlanGates(p.value, gctx(over));
  };
  const codes = (r: ReturnType<typeof gate>) => r.log.map((e) => e.code);
  const dcodes = (r: ReturnType<typeof gate>) => r.plan.devices.map((d) => d.deviceCode);

  same("G.0 البوّابةُ مغلقة ⟵ مانعٌ ولا شيء بعده", (() => { const r = gate(lib(), { agentGate: { allowed: false, code: "red_flag_pending", reason: "x" } }); return [r.blocking.map((b) => b.code), r.plan.devices.length]; })(),
    [["gate_closed"], 0]);
  same("G.1 جهازٌ غيرُ معروف يُحذف", codes(gate(lib({ devices: [dev("electro"), dev("nope")] }))).includes("unknown_device"), true);
  same("G.2 **الممنوعُ بالمعاينة يُحذف بسببه**", (() => { const r = gate(lib({ devices: [dev("electro")] }), { forbidden: [{ deviceCode: "electro", reasonAr: "منظّم", source: "exam" }] });
    return [dcodes(r), r.plan.removed[0]?.code, /بالمعاينة/.test(r.plan.removed[0]?.reasonAr ?? "")]; })(), [[], "forbidden", true]);
  same("G.2ب **والممنوعُ بقرار المعتمِد يُحذف كذلك**", (() => { const r = gate(lib({ devices: [dev("electro")] }), { forbidden: [{ deviceCode: "electro", reasonAr: "بقرار المعتمِد: لا تحفيز", source: "approver" }] });
    return [dcodes(r), /بقرار المعتمِد/.test(r.plan.removed[0]?.reasonAr ?? "")]; })(), [[], true]);
  same("G.3 **غيرُ المتوفّر في الفرع يُحذف**", (() => { const r = gate(lib({ devices: [dev("electro"), dev("laser")] })); return [dcodes(r), codes(r).includes("unavailable_in_branch")]; })(), [["electro"], true]);
  same("G.4 ليس في البروتوكول ⟵ يُحذف · و«لا يُستخدم» ⟵ يُحذف", (() => { const r = gate(lib({ devices: [dev("electro"), dev("tecar"), dev("ultrasound")] }));
    return [dcodes(r), codes(r).filter((c) => c === "not_in_protocol" || c === "not_used")]; })(), [["electro"], ["not_in_protocol", "not_used"]]);
  same("G.4c **المساعدُ لا يصير أساسيّاً**، والموعدُ الدوريّ من البروتوكول", (() => { const r = gate(lib({ devices: [dev("electro"), dev("shockwaves", { btl_model_id: "rswt-elite" })] }));
    const sw = r.plan.devices.find((d) => d.deviceCode === "shockwaves"); return [sw?.use, sw?.everyDays, sw?.times, codes(r).includes("use_clamped")]; })(), ["adjunct", 7, 3, true]);
  same("G.4d خارج المكتبة: «غيرُ موصى به» يُحذف", (() => {
    const r = gate(oolPlan({ devices: [dev("electro", { evidence: "not_recommended" })] }), { protocol: null }); return codes(r).includes("not_recommended"); })(), true);
  same("G.4e بلا أساسيّ ⟵ تنبيهٌ لا منع", (() => { const r = gate(lib({ devices: [dev("shockwaves", { use: "adjunct", btl_model_id: "rswt-elite" })] })); return [codes(r).includes("no_core_device"), r.blocking.length]; })(), [true, 0]);
  same("G.5 الدقائقُ فوق سطر البروتوكول تُقصّ", (() => { const r = gate(lib({ devices: [dev("electro", { minutes: 45 })] })); return [r.plan.devices[0].minutes, codes(r).includes("minutes_clamped")]; })(), [20, true]);
  same("G.7 **الموجاتُ بلا موديل ⟵ «راجِع» في الجولات، ثمّ تُحذف في النهائيّ**", [gate(lib({ devices: [dev("electro"), dev("shockwaves")] })).blocking.map((b) => b.code),
    (() => { const r = gate(lib({ devices: [dev("electro"), dev("shockwaves")] }), { final: true }); return [r.blocking.length, dcodes(r), codes(r).includes("btl_model_missing")]; })()],
    [["btl_model_required"], [0, ["electro"], true]]);
  same("G.7ب موديلٌ واحد يُملأ، والجهازُ بلا موديل يُصفَّر", (() => { const r = gate(lib({ devices: [dev("electro", { btl_model_id: "wrong" })] }));
    return r.plan.devices[0].btl?.modelId; })(), "btl-4825s-electro");
  same("G.8 **البرنامجُ غيرُ المسجَّل يُحذف** (القائمةُ فارغة حتى المرحلة ٦)", (() => { const r = gate(lib({ devices: [dev("electro", { program: "Back pain" })] }));
    return [r.plan.devices[0].btl?.program, codes(r).includes("program_stripped")]; })(), [null, true]);
  same("G.9 **القيمةُ خارجَ نطاق الشركة تُحذف ولا تُقصّ**، والمفتاحُ المجهول والوحدةُ الخاطئة تُحذفان", (() => {
    const r = gate(lib({ devices: [dev("electro", { fallback: [{ key: "intensity_ma", value: 500, unit: "mA", source: GUIDE }, { key: "frequency_hz", value: 100, unit: "Hz", source: GUIDE },
      { key: "nope", value: 1, unit: "x", source: GUIDE }, { key: "pulse_us", value: 200, unit: "ms", source: GUIDE }] })] }));
    return [r.plan.devices[0].btl?.fallback.map((f) => [f.key, f.value]), ["param_out_of_range", "param_unknown", "param_unit_mismatch"].map((c) => codes(r).includes(c))]; })(),
    [[["frequency_hz", 100]], [true, true, true]]);
  same("G.9 **القيدُ المتبادل للشعاعيّ**: فوق ٥ بار ⟵ التردّدُ فوق ١٠ يُحذف", (() => {
    const r = gate(lib({ devices: [dev("electro"), dev("shockwaves", { btl_model_id: "rswt-elite", fallback: [{ key: "pressure_bar", value: 5.5, unit: "bar", source: GUIDE }, { key: "frequency_hz", value: 15, unit: "Hz", source: GUIDE }] })] }));
    const sw = r.plan.devices.find((d) => d.deviceCode === "shockwaves"); return [sw?.btl?.fallback.map((f) => f.key), codes(r).includes("param_cross_rule")]; })(), [["pressure_bar"], true]);
  same("G.9b **المصدر**: «protocol» بقيمة البروتوكول تبقى، وبخلافها تبقى بالأحمر، وبلا قيمةٍ مكتوبة تُحذف، والرابطُ الذي لم يُفتح يُحذف", (() => {
    const r = gate(lib({ devices: [dev("electro"), dev("shockwaves", { btl_model_id: "rswt-elite", fallback: [{ key: "pressure_bar", value: 2.5, unit: "bar", source: "protocol" },
      { key: "frequency_hz", value: 9, unit: "Hz", source: "protocol" }, { key: "shocks", value: 2000, unit: "shocks", source: NICE }] })] }));
    const sw = r.plan.devices.find((d) => d.deviceCode === "shockwaves");
    const r2 = gate(lib({ devices: [dev("electro", { fallback: [{ key: "frequency_hz", value: 100, unit: "Hz", source: "protocol" }] })] }));
    return [sw?.btl?.fallback.map((f) => f.key), sw?.btl?.flags, codes(r).includes("param_unsourced"), codes(r2).includes("param_unsourced"), r2.plan.devices[0].btl?.fallback.length]; })(),
    [["pressure_bar", "frequency_hz"], ["param_differs_from_protocol:frequency_hz"], true, true, 0]);
  same("G.ev درجةُ الدليل من البروتوكول ومعاملاتُه محفوظة", (() => { const r = gate(lib({ devices: [dev("electro", { evidence: "not_recommended" })] }));
    return [r.plan.devices[0].evidence, codes(r).includes("evidence_from_protocol"), /^P-electro/.test(r.plan.devices[0].parameters ?? "")]; })(), ["recommended", true, true]);
  same("G.10 **العددُ فوق السقف (التمديدُ المكتوب) يُقصّ**، والأسبوعُ والدقائقُ فوق البروتوكول تُقصّ", (() => {
    const r = gate(lib({ dose: { total_sessions: 40, sessions_per_week: 9, session_minutes: 120, why_en: null } }));
    return [r.plan.totalSessions, r.plan.sessionsPerWeek, r.plan.sessionMinutes, ["sessions_clamped", "spw_clamped", "session_minutes_clamped"].map((c) => codes(r).includes(c))]; })(),
    [18, 6, 50, [true, true, true]]);
  same("S.1 السقفُ = الأكبرُ من العدد والمكتوب، ولا تمديدَ يُخترع", [protocolSessionCeiling({ totalSessions: 12, maxTotalSessions: 18 }), protocolSessionCeiling({ totalSessions: 12, maxTotalSessions: null }),
    protocolSessionCeiling({ totalSessions: 24, maxTotalSessions: 12 })], [18, 12, 24]);
  same("S.2 **بنودُ السقف لكلّ بروتوكولٍ من الأربعة والأربعين**", [MAX_TOTAL_SESSIONS.length, new Set(MAX_TOTAL_SESSIONS.map(([c]) => c)).size], [44, 44]);

  // ── بوّاباتٌ لم يكن لها تأكيد (مراجعةُ المرحلة الثانية) — كلٌّ بتأكيده، ومراجعةٌ عكسية لكلٍّ منها ──
  same("G.1ب **الجهازُ المكرّر يُحذف ثانيه في البوّابة** (المحلّلُ يردّه أوّلاً؛ وهذه طبقةٌ ثانية — وإلّا صدم `UNIQUE (plan_id, device_id)` عند الحفظ)", (() => {
    const p = parseSubmittedPlan(lib({ devices: [dev("electro")] }));
    if (!p.ok) throw new Error("parse");
    const r = applyPlanGates({ ...p.value, devices: [p.value.devices[0], { ...p.value.devices[0], minutes: 5 }] }, gctx());
    return [dcodes(r), r.plan.removed.map((x) => x.code), parseSubmittedPlan(lib({ devices: [dev("electro"), dev("electro")] })).ok]; })(), [["electro"], ["duplicate_device"], false]);
  same("G.11b **مرحلةُ البدء خارجَ المراحل تُقصّ**", (() => { const r = gate(lib({ starting_phase: 9 })); return [r.plan.startingPhase, codes(r).includes("starting_phase_clamped")]; })(), [2, true]);
  same("G.12c **جرعةُ التمرين فوق قيود القاعدة تُقصّ**", (() => {
    const r = gate(oolPlan({ phases: [phase([{ ...exRow(1), sets: 40, reps: 500, hold_seconds: 9000, rest_seconds: -3 }])] }), { protocol: null });
    const x = r.plan.phases[0].exercises[0]; return [[x.sets, x.reps, x.holdSeconds, x.restSeconds], codes(r).includes("exercise_dose_clamped")]; })(), [[10, 100, 600, 0], true]);
  same("G.11 **نطاقاتُ المراحل المنقطعة يُعاد حسابُها من ١ إلى العدد**", (() => {
    const r = gate(oolPlan({ phases: [{ ...phase([exRow(1)]), session_from: 1, session_to: 4 }, { ...phase([exRow(3)]), session_from: 7, session_to: 12 }] }), { protocol: null });
    return [r.plan.phases.map((p) => [p.sessionFrom, p.sessionTo]), codes(r).includes("phase_ranges_fixed")]; })(), [[[1, 6], [7, 12]], true]);
  same("G.13c **المقياسُ غيرُ الصالح يُحذف** (حدٌّ أدنى ≥ الأعلى، أو مكرّر)", (() => {
    const m = (code: string, min: number, max: number) => ({ code, name_ar: "مقياس", name_en: "Measure", unit_ar: null, unit_en: null, min, max, higher_is_better: true });
    const r = gate(oolPlan({ measures: [m("pain", 0, 10), m("bad", 5, 5), m("pain", 0, 10)] }), { protocol: null });
    return [r.plan.measures.map((x) => x.code), codes(r).filter((c) => c === "measure_dropped").length]; })(), [["pain"], 2]);
  same("G.6 **الموعدُ الدوريّ غيرُ الصالح يُمحى** خارج المكتبة", (() => {
    const r = gate(oolPlan({ devices: [{ ...dev("electro"), every_days: 400, times: 3, evidence: "optional" }] }), { protocol: null });
    return [r.plan.devices[0].everyDays, r.plan.devices[0].times, codes(r).includes("schedule_invalid")]; })(), [null, null, true]);
  same("G.10d **بلا عددِ جلساتٍ ولا مراحلَ تُعطيه ⟵ مانع**", (() => {
    const r = gate(oolPlan({ dose: { total_sessions: null, sessions_per_week: 3, session_minutes: 45, why_en: null },
      phases: [{ ...phase([exRow(1)]), session_from: null, session_to: null }] }), { protocol: null });
    return r.blocking.map((b) => b.code).includes("dose_missing"); })(), true);
  same("G.9c **جهازٌ بلا برنامجٍ ولا قيمٍ ولا إعداداتٍ في البروتوكول ⟵ تنبيه**، وبقيمةٍ أو بإعدادات البروتوكول لا", (() => {
    const bare = gate(oolPlan({ devices: [{ ...dev("megnatik"), evidence: "optional" }] }), { protocol: null });
    const valued = gate(oolPlan({ devices: [{ ...dev("megnatik"), evidence: "optional", fallback: [{ key: "frequency_hz", value: 20, unit: "Hz", source: GUIDE }] }] }), { protocol: null });
    const written = gate(lib({ devices: [dev("electro"), dev("shockwaves", { btl_model_id: "rswt-elite" })] }));
    const bareLine = { deviceCode: "electro", centreUse: "core" as const, evidence: "recommended", minutes: 20, everyDays: null, times: null, params: {}, parameters: null, parametersEn: null, note: null, noteEn: null };
    const unwritten = gate(lib({ devices: [dev("electro")] }), { protocol: proto({ devices: [bareLine] }) });
    return [codes(bare).includes("no_settings"), bare.blocking.length, codes(valued).includes("no_settings"),
      written.log.filter((e) => e.code === "no_settings").length, unwritten.log.filter((e) => e.code === "no_settings").map((e) => e.target)]; })(),
    [true, 0, false, 0, ["device:electro"]]);
  same("G.ar **نصوصُ البوّابة بالعربية**: النطاقُ بوحدته العربية وأرقامٍ هنديّة، والقيدُ المتبادل بالعربية، وسطرُ المعالج بأسماء القيم العربية", (() => {
    const r = gate(lib({ devices: [dev("electro", { fallback: [{ key: "intensity_ma", value: 500, unit: "mA", source: GUIDE }, { key: "pulse_us", value: 200, unit: "us", source: GUIDE }] }),
      dev("shockwaves", { btl_model_id: "rswt-elite", fallback: [{ key: "pressure_bar", value: 5.5, unit: "bar", source: GUIDE }, { key: "frequency_hz", value: 15, unit: "Hz", source: GUIDE }] })],
      dose: { total_sessions: 40, sessions_per_week: 6, session_minutes: 50, why_en: null } }));
    const reason = (c: string) => r.log.find((e) => e.code === c)?.reasonAr ?? "";
    const el = r.plan.devices.find((d) => d.deviceCode === "electro");
    return [reason("param_out_of_range"), /[A-Za-z0-9]/.test(reason("param_cross_rule").split(":").slice(1).join(":")), reason("sessions_clamped"),
      /عرض النبضة ٢٠٠ ميكروثانية/.test(el?.parameters ?? ""), /\bus\b|pulse/i.test(el?.parameters?.split("\n").pop() ?? "")]; })(),
    ["خارجَ نطاق الشركة المصنّعة — حُذفت ولم تُقصّ (٠–١٤٠ ملّي أمبير)", false, "عددُ الجلسات خارجَ حدود البروتوكول (١–١٨)", true, false]);
  {
    const H = (h: Record<string, string> = {}) => new Headers(h);
    const sock = Object.assign(new Error("other side closed"), { code: "UND_ERR_SOCKET" });
    same("T.1 **العابرُ وغيرُه**: انقطاعُ البثّ (ثلاثةُ أشكال الـSDK) · ٤٠٨ · ٤٠٩ · ٥٢٩ عابرة؛ ٤٠٠ و٤٠١ لا؛ و`x-should-retry` يغلب في الاتّجاهين",
      [isTransient(new Anthropic.AnthropicError("terminated", { cause: new TypeError("terminated", { cause: sock }) } as any)),
        isTransient(new Anthropic.AnthropicError("request ended without sending any chunks")),
        isTransient(new Anthropic.AnthropicError("stream ended without producing a Message with role=assistant")),
        isTransient(Anthropic.APIError.generate(408, { type: "error", error: { type: "timeout_error", message: "t" } }, "t", H())),
        isTransient(Anthropic.APIError.generate(409, { type: "error", error: { type: "api_error", message: "c" } }, "c", H())),
        isTransient(Anthropic.APIError.generate(529, { type: "error", error: { type: "overloaded_error", message: "o" } }, "o", H())),
        isTransient(Anthropic.APIError.generate(400, { type: "error", error: { type: "invalid_request_error", message: "bad" } }, "bad", H())),
        isTransient(Anthropic.APIError.generate(401, { type: "error", error: { type: "authentication_error", message: "k" } }, "k", H())),
        isTransient(Anthropic.APIError.generate(500, { type: "error", error: { type: "api_error", message: "x" } }, "x", H({ "x-should-retry": "false" }))),
        isTransient(Anthropic.APIError.generate(400, { type: "error", error: { type: "invalid_request_error", message: "x" } }, "x", H({ "x-should-retry": "true" }))),
        isTransient(new Anthropic.APIUserAbortError()), isTransient(new AgentStop("cancel")),
        isTransient(new Error("random")), isTransient(Object.assign(new Error("x"), { cause: Object.assign(new Error("y"), { code: "ECONNRESET" }) }))],
      [true, true, true, true, true, true, false, false, false, true, false, false, false, true]);
    same("T.2 «الطلبُ أطولُ من النافذة» يُعرف بنصّه", [isPromptTooLong(Anthropic.APIError.generate(400, { type: "error", error: { type: "invalid_request_error", message: "prompt is too long: 1000201 tokens > 1000000 maximum" } },
      "prompt is too long: 1000201 tokens > 1000000 maximum", H())), isPromptTooLong(Anthropic.APIError.generate(400, { type: "error", error: { type: "invalid_request_error", message: "bad" } }, "bad", H()))], [true, false]);
  }
  same("P.dup **مفتاحُ بطاقةٍ مقترحة مكرّر يُردّ للكاتب** (وإلّا تعذّر الاعتمادُ على رمز البطاقة الفريد)", (() => {
    const r = parseSubmittedPlan(oolPlan({ proposed_cards: [card(), card({ name_en: "Other" })] })); return [r.ok, r.ok ? [] : r.errors.some((e) => /duplicated/.test(e))]; })(), [false, true]);

  console.log("\n── ل. الخطّةُ من البروتوكول ──");
  same("L.1 **مراحلُ البروتوكول وتمارينُه تُنسخ ولو أرسل النموذجُ غيرَها**، وملاحظاتُه ملاحظات", (() => {
    const r = gate(lib({ phase_notes: [{ phase: 1, note_ar: "ابدأ بلطف", note_en: null }] }));
    return [r.plan.phases.map((p) => [p.nameAr, p.exercises.map((x) => x.exerciseId)]), /Opus: ابدأ بلطف/.test(r.plan.phases[0]?.notes ?? "")]; })(),
    [[["أولى", [1, 2]], ["ثانية", [2]]], true]);
  same("L.1ب ونصٌّ في `phases` بوضع المكتبة يُردّ في المحلّل", parseSubmittedPlan(lib({ phases: [{ name_ar: "x", name_en: "x", session_from: 1, session_to: 2, goals_ar: null, goals_en: null,
    progress_criteria_ar: null, progress_criteria_en: null, education_ar: null, education_en: null, exercises: [] }] })).ok, false);
  same("L.2 النطاقاتُ بنسبة العدد الجديد ومتّصلة", rescalePhaseRanges([{ sessionFrom: 1, sessionTo: 6 }, { sessionFrom: 7, sessionTo: 12 }], 12, 18).map((p) => [p.sessionFrom, p.sessionTo]), [[1, 9], [10, 18]]);
  same("L.3 **التبديلُ بما يطابق وحده**: بديلٌ معتمَد يُطبَّق، وبديلٌ مسوّدة يُتجاهل، وتمرينٌ ليس في المرحلة يُتجاهل", (() => {
    const r = gate(lib({ exercise_changes: [{ phase: 1, from_exercise_id: 1, to_exercise_id: 3, reason_ar: "أسهل" }, { phase: 1, from_exercise_id: 2, to_exercise_id: 4, reason_ar: "x" },
      { phase: 2, from_exercise_id: 1, to_exercise_id: 3, reason_ar: "x" }] }));
    return [r.plan.phases.map((p) => p.exercises.map((x) => x.exerciseId)), codes(r).filter((c) => c.startsWith("exercise_"))]; })(),
    [[[3, 2], [2]], ["exercise_draft", "exercise_draft", "exercise_changed", "exercise_draft_substitute", "exercise_not_in_protocol"]]);
  same("G.12c **الثباتُ صفر ⟵ فارغ**، والجرعةُ بقيود القاعدة", (() => {
    const r = gate(oolPlan({ phases: [phase([{ exercise_id: 1, proposed_key: null, sets: 20, reps: 0, hold_seconds: 0, rest_seconds: 900, dose_note_ar: null, dose_note_en: null, why_en: null }])] }), { protocol: null });
    const x = r.plan.phases[0].exercises[0]; return [x.sets, x.reps, x.holdSeconds, x.restSeconds]; })(), [10, 1, null, 600]);
  same("G.12 خارج المكتبة: التمرينُ المؤرشف أو الغائب يُحذف", (() => {
    const r = gate(oolPlan({ phases: [phase([exRow(5), exRow(99)])] }), { protocol: null }); return codes(r).filter((c) => c === "exercise_archived" || c === "exercise_missing"); })(),
    ["exercise_archived", "exercise_missing"]);
  same("G.13 **مصدرٌ لم يُفتح ⟵ مانع** (بحثٌ وحده أو مخترَع)، وبعد التطبيع يمرّ، وبلا مصادر مانع", [
    gate(oolPlan({ sources: [{ title: "n", url: NICE, org: null, year: null, used_for: null }] }), { protocol: null }).blocking.map((b) => b.code),
    gate(oolPlan({ sources: [{ title: "n", url: "https://invented.example/x", org: null, year: null, used_for: null }] }), { protocol: null }).blocking.map((b) => b.code),
    gate(oolPlan({ sources: [{ title: "g", url: "HTTPS://Example.org/guide/?utm_source=x#top", org: null, year: null, used_for: null }] }), { protocol: null }).blocking.map((b) => b.code),
    gate(oolPlan({ sources: [] }), { protocol: null }).blocking.map((b) => b.code)],
    [["source_not_fetched"], ["source_not_fetched"], [], ["sources_missing"]]);
  same("G.13a بوضع المكتبة: المصدرُ الذي لم يظهر يسقط ولا يمنع", (() => { const r = gate(lib({ sources: [{ title: "n", url: NICE, org: null, year: null, used_for: null },
    { title: "x", url: "https://x.example", org: null, year: null, used_for: null }] })); return [r.plan.sources.map((s) => s.url), r.blocking.length]; })(), [[NICE], 0]);
  same("G.13b بروتوكولٌ مؤرشف أو مسوّدةُ Opus ⟵ مانع", [gate(lib(), { protocol: proto({ isArchived: true }) }).blocking.map((b) => b.code),
    gate(lib(), { protocol: proto({ origin: "opus", status: "draft" }) }).blocking.map((b) => b.code)], [["protocol_missing"], ["protocol_missing"]]);
  same("G.13d **نوعُ البطاقة ومنطقتُها وفئةُ البروتوكول من القوائم**", gate(oolPlan({ proposed_cards: [card({ kind: "yoga" })], library_protocol: lp({ category: "spa" }) }), { protocol: null })
    .blocking.map((b) => b.code).sort(), ["card_enum_invalid", "protocol_enum_invalid"]);
  same("G.13e البديلُ الذي ليس في المكتبة يسقط", codes(gate(lib({ alternatives: [{ protocol_id: 999, why_not_ar: "x" }] }))).includes("alternative_unknown"), true);
  same("G.13f **نصُّ البروتوكول العامّ لا يحمل اسمَ المريض**", gate(oolPlan({ library_protocol: lp({ summary_ar: "خطّة علي حسين للظهر" }) }), { protocol: null }).blocking.map((b) => b.code),
    ["generic_text_identifier"]);
  same("G.14 **بلا جهازٍ ولا تمرين ⟵ مانع**", gate(oolPlan({ devices: [], phases: [phase([])] }), { protocol: null }).blocking.map((b) => b.code).includes("empty_plan"), true);

  console.log("\n── ب. المحلّلاتُ والمخطّطات ──");
  same("P.1 أسئلةٌ ١–٥ بنصٍّ عربيّ وبـ`affects`", [parseQuestions({ questions: [] }).ok, parseQuestions({ questions: [{ id: "a", text_ar: "هل يعمل واقفاً طوال اليوم؟", why_en: "x", affects: "history" }] }).ok,
    parseQuestions({ questions: [{ id: "a", text_ar: "هل يعمل واقفاً طوال اليوم؟", why_en: "x", affects: "other" }] }).ok], [false, true, false]);
  same("P.2 الرفضُ والاكتشافُ والمراجعة", [parseDecline({ reason_ar: "إحالة عاجلة أولاً" }, "writer").ok, parseNewFinding({ kind: "red_flag", text_ar: "ألمٌ ليليّ" }).ok,
    parseReview({ verdict: "revise", issues: [] }).ok], [true, true, false]);
  same("P.3 **سؤالُ خانة المعاينة لا يُجاب نصّاً**، والناقصُ يُردّ", [validateAnswers([{ id: "a", textAr: "x", whyEn: "", affects: "exam_field" }], [{ id: "a", answer: "نعم" }]),
    validateAnswers([{ id: "a", textAr: "x", whyEn: "", affects: "history" }], [])].map((r) => (r as any).code ?? "ok"), ["answer_needs_exam_revision", "answers_incomplete"]);
  const schemaKeys = (s: any): string[] => {
    const bad: string[] = [];
    const walk = (n: any, p: string) => {
      if (!n || typeof n !== "object") return;
      for (const k of ["minimum", "maximum", "minLength", "maxLength", "minItems", "maxItems", "pattern"]) if (k in n) bad.push(`${p}.${k}`);
      if (n.type === "object") {
        if (n.additionalProperties !== false) bad.push(`${p}:additionalProperties`);
        if (JSON.stringify([...(n.required ?? [])].sort()) !== JSON.stringify(Object.keys(n.properties ?? {}).sort())) bad.push(`${p}:required`);
      }
      for (const [k, v] of Object.entries(n)) if (v && typeof v === "object") walk(v, `${p}.${k}`);
    };
    walk(s, "$"); return bad;
  };
  same("T.1 **المخطّطاتُ بلا حدودٍ على السلك**، وكلُّ كائنٍ مغلق ومفاتيحُه كلُّها مطلوبة، و`strict` ثابتٌ واحد، و`web_fetch` بلا استشهادات",
    [schemaKeys(SUBMIT_PLAN_SCHEMA), schemaKeys(SUBMIT_REVIEW_SCHEMA), schemaKeys(ASK_QUESTIONS_SCHEMA), STRICT_TOOLS,
      TOOLS.writer.every((t: any) => t.type ? true : (t.strict === true) === STRICT_TOOLS), (TOOLS.writer.find((t: any) => t.name === "web_fetch") as any)?.citations ?? null,
      TOOLS.writer.map((t: any) => t.name)],
    [[], [], [], false, true, null, ["get_protocol", "search_exercises", "get_exercises", "ask_questions", "decline_plan", "report_new_finding", "submit_plan", "web_search", "web_fetch"]]);

  console.log("\n── ر. الخصوصية ──");
  same("R.1 **اسمٌ واحد لا يطابق** («على الركبة» مع مريضٍ اسمه علي حسين)، والاسمان معاً يطابقان", [findAuthoredLeaks("ضع الكمّادة على الركبة وحسن الوضعية", ids0),
    findAuthoredLeaks("المريض علي حسين", ids0), findAuthoredLeaks("علي حسين كاظم", ids0).includes("full_name")], [[], ["name_pair"], true]);
  same("R.2 **رقمُ PMID وDOI يبقيان**، وهاتفُ المريض بأيّ شكلٍ يُكشف", [findAuthoredLeaks("PMID 12345678 doi:10.1016/j.pain.2020.07.001", ids0),
    findAuthoredLeaks("+964 773 123 4567", ids0), findAuthoredLeaks("٠٧٧٣١٢٣٤٥٦٧", ids0), findAuthoredLeaks("bc-1234", ids0)], [[], ["digits"], ["digits"], ["patient_code", "digits"]]);
  same("R.3 **التنقيةُ**: الاسمُ الكامل والاثنان والهاتفُ والرمزُ والأرقامُ العربية", redactAuthoredText("عليّ حسين يشكو، هاتفه ٠٧٧٣١٢٣٤٥٦٧ والرمز BC-1234، ويستعمل على عصا", ids0),
    "[REDACTED] يشكو، هاتفه [REDACTED] والرمز [REDACTED]، ويستعمل على عصا");
  same("R.5 **استعلامُ بحثٍ باسم المريض لاتينيّاً يُكشف**", [findQueryLeaks("hussein ali low back", patientIdentifierSet({ name: "حسين علي" })), findQueryLeaks("ali low back pain", ids0)],
    [["latin_name"], []]);
  {
    //  **الحارسُ الأخير قبل الإرسال** (`callModel`): نصٌّ كتبه الخادمُ (نتيجةُ أداة) فيه اسمُ المريض ⟵ `identifier_leak` ولا نداءَ للنموذج.
    const { callModel } = await import("./physio_agent/model");
    resetModel();
    let code: string | null = null;
    try {
      await callModel({ role: "writer", signal: new AbortController().signal, body: { model: "claude-opus-5-5", max_tokens: 16,
        messages: [{ role: "user", content: [{ type: "tool_result", tool_use_id: "toolu_x", content: "المريض علي حسين كاظم" }] }] } as any }, ids0);
    } catch (e: any) { code = e?.code ?? String(e); }
    same("R.8 **الحارسُ الأخير**: اسمُ المريض في نتيجة أداةٍ يوقف الطلبَ قبل النموذج", [code, calls.length], ["identifier_leak", 0]);
    resetModel();
  }

  console.log("\n── ك. الكتالوج والرؤية ──");
  same("C.1 **الكتالوج**: رموزُ أجهزةٍ حقيقية، والحدُّ الأدنى دون الأعلى، والبرامجُ فارغة، ولكلّ نطاقٍ مصدر، والموجاتُ موديلان",
    [BTL_MODELS.every((m) => ["shockwaves", "laser", "megnatik", "tecar", "electro", "ultrasound", "traction", "robotik", "wax", "hot_pack"].includes(m.deviceCode)),
      BTL_MODELS.every((m) => m.params.every((p) => p.min < p.max && p.source.length > 5)), BTL_MODELS.every((m) => m.programs.length === 0),
      BTL_MODELS.filter((m) => m.deviceCode === "shockwaves").map((m) => m.variant), NO_MODEL_DEVICE_CODES.includes("needle")],
    [true, true, true, ["radial", "focused"], true]);
  const specS = { role: "physio_specialist", roles: ["physio_specialist"], isAdmin: false, permissions: {} } as any;
  const supS = { role: "branch_manager", roles: ["branch_manager"], isAdmin: false, permissions: { canSupervisePhysio: true } } as any;
  same("V.1 **خطّةُ Opus المنتظرة**: كاملةٌ للمعتمِد، وسطرٌ لغيره بلا تنفيذ، والمعتمَدةُ عاديّة", [planAccessFor(supS, { origin: "opus", status: "pending" }),
    planAccessFor(specS, { origin: "opus", status: "pending" }), planAccessFor(specS, { origin: "opus", status: "approved" }),
    Object.keys(opusPlanStub({ id: 1, patientId: 2, status: "pending", createdAt: null })).sort(), opusPlanStub({ id: 1, patientId: 2, status: "pending", createdAt: null }).titleAr],
    ["full", "stub", "full", ["createdAt", "id", "origin", "patientId", "status", "stub", "titleAr"], OPUS_AWAITING_LABEL]);
  same("D.1 حارسُ انحراف قيود الإنتاج", productionChecksDrift(), []);

  // ══ النقاطُ الحقيقية والعامل ═════════════════════════════════════════════════════════════════════════
  await applyProductionChecks(pool);
  await cleanup();
  setRetryDelaysForTests([1, 1, 1, 1]);
  setAgentTimingForTests({ heartbeatMs: 40, staleMs: 5 * 60_000, runCapMs: 60_000 });
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع وكيل Opus'), ($2, 'فرع Opus المغلق')`, [B1, B3]);
  await q(`UPDATE branches SET temporarily_closed = true WHERE id = $1`, [B3]);
  const users: [number, string, Record<string, unknown>][] = [[ADMIN, "admin", {}], [SUP, "branch_manager", { can_supervise_physio: true }],
    [SPEC, "physio_specialist", {}], [SPEC2, "physio_specialist", {}], [TECH, "therapist", {}]];
  for (const [id, role, extra] of users) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_view_patients)
             VALUES ($1, $2, 'x', $3, $4, $5, $6::jsonb, true, true)`, [id, `opus-${id}`, `مستخدم ${id}`, role, B1, JSON.stringify([B1])]);
    for (const [k, v] of Object.entries(extra)) await q(`UPDATE system_users SET ${k} = $2 WHERE id = $1`, [id, v]);
  }
  for (const u of [ADMIN, SUP]) await q(`INSERT INTO staff_notification_prefs (user_id, event_type) VALUES ($1, 'physio_opus_plan_ready') ON CONFLICT DO NOTHING`, [u]);
  for (const u of [SPEC, SPEC2, ADMIN, SUP]) await q(`INSERT INTO staff_notification_prefs (user_id, event_type) VALUES ($1, 'physio_opus_questions') ON CONFLICT DO NOTHING`, [u]);
  const devId = Object.fromEntries((await q(`SELECT id, code FROM devices`)).map((d) => [d.code, Number(d.id)]));
  for (const c of ["electro", "shockwaves", "ultrasound", "tecar", "exercise", "megnatik"]) {
    for (const b of [B1, B3]) await q(`INSERT INTO physio_device_branches (device_id, branch_id, available) VALUES ($1, $2, true) ON CONFLICT (device_id, branch_id) DO UPDATE SET available = true`, [devId[c], b]);
  }
  //  بروتوكولٌ للاختبار بمرحلتين وبطاقات.
  const ex = async (code: string, status: string) => Number((await q(`INSERT INTO physio_exercises (code, name_ar, name_en, kind, region, status) VALUES ($1, $1, $1, 'strength', 'lumbar', $2) RETURNING id`,
    [`TEST-OPUS-${code}`, status]))[0].id);
  const EX1 = await ex("A", "approved"), EX2 = await ex("B", "approved"), EX3 = await ex("C", "approved");
  const P = Number((await q(`INSERT INTO physio_protocols (code, title_ar, title_en, category, age_group, status, total_sessions, max_total_sessions, sessions_per_week, session_minutes)
    VALUES ('TEST-OPUS-LIB', 'بروتوكول اختبار Opus', 'Opus test protocol', 'spine', 'adult', 'approved', 12, 18, 6, 50) RETURNING id`))[0].id);
  for (const [code, use, ev, params, ed, t] of [["electro", "core", "recommended", {}, null, null], ["shockwaves", "adjunct", "optional", { mode: "radial", pressureBar: "2.5", frequencyHz: "8", impulses: "2000" }, 7, 3],
    ["ultrasound", "not_used", "not_recommended", {}, null, null], ["laser", "core", "optional", {}, null, null]] as const) {
    await q(`INSERT INTO physio_protocol_devices (protocol_id, device_id, evidence, minutes, params, centre_use, every_days, times) VALUES ($1, $2, $3, 20, $4::jsonb, $5, $6, $7)`,
      [P, devId[code], ev, JSON.stringify(params), use, ed, t]);
  }
  for (const [pos, from, to, exs] of [[1, 1, 6, [EX1, EX2]], [2, 7, 12, [EX2]]] as const) {
    const ph = Number((await q(`INSERT INTO physio_protocol_phases (protocol_id, position, name_ar, name_en, session_from, session_to) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [P, pos, `مرحلة ${pos}`, `Phase ${pos}`, from, to]))[0].id);
    for (const [i, e] of exs.entries()) await q(`INSERT INTO physio_protocol_phase_exercises (phase_id, exercise_id, position, sets, reps, hold_seconds) VALUES ($1, $2, $3, 2, 10, 5)`, [ph, e, i]);
  }
  const sess = (id: number, role: string, perms: Record<string, unknown> = {}) => hdr({ userId: id, displayName: `م ${id}`, role, roles: [role], branchId: B1,
    accessibleBranches: [B1], isAdmin: role === "admin", permissions: { canViewPatients: true, ...perms } });
  const S = { admin: sess(ADMIN, "admin"), sup: sess(SUP, "branch_manager", { canSupervisePhysio: true }), spec: sess(SPEC, "physio_specialist"),
    spec2: sess(SPEC2, "physio_specialist"), tech: sess(TECH, "therapist") };

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
  const call = async (method: string, path: string, session: string, body?: unknown) => {
    const r = await fetch(`${BASE}${path}`, { method, headers: { "content-type": "application/json", "x-test-session": session }, body: body === undefined ? undefined : JSON.stringify(body) });
    let json: any = null; try { json = await r.json(); } catch { /* */ }
    return { status: r.status, json };
  };
  let seq = 0;
  async function patient(name: string, branch = B1) {
    seq += 1;
    const pid = Number((await q(`INSERT INTO patients (name, phone, referral_source, referral_sub_source, age, height, weight, medical_condition, branch_id, is_physiotherapy, total_cost,
        patient_classification, governorate, address, injury_cause, injury_date, presenting_complaint)
      VALUES ($1, $2, 'من شخص آخر', $3, '46', '172', '88', 'physiotherapy', $4, true, 0, 'new', 'بغداد', 'الكرادة', 'الجلوس', '2026-05-01', 'ألم الظهر') RETURNING id`,
      [`${name} ${MARK}`, `0771${String(3000000 + seq * 7919).slice(0, 7)}`, MARK, branch]))[0].id);
    await storage.syncPatientCases(pid);
    return pid;
  }
  const examBody = (over: Record<string, unknown> = {}) => ({ idempotencyKey: randomUUID(), caseType: "physiotherapy", chiefComplaint: "", clinicalFindings: "", plan: "",
    notes: "ملاحظة الفاحص", diagnosis: "ألم أسفل الظهر المزمن", prescription: { treatments: [{ treatmentType: "تمارين تأهيلية", sessionCount: 12 }] }, assessment: completeExamV2(), ...over });
  const jobsOf = async (pid: number) => q(`SELECT * FROM physio_agent_jobs WHERE patient_id = $1 ORDER BY id`, [pid]);
  const waitJobs = async (pid: number, n: number) => { for (let i = 0; i < 60; i++) { if ((await jobsOf(pid)).length >= n) break; await wait(50); } return jobsOf(pid); };
  async function sign(pid: number, over: Record<string, unknown> = {}, s = S.spec) {
    const r = await call("POST", `/api/medical/patients/${pid}/exams`, s, examBody(over));
    if (r.status !== 200) throw new Error(`sign failed ${r.status} ${JSON.stringify(r.json)}`);
    return Number(r.json.id);
  }
  const libFor = (over: Record<string, unknown> = {}) => lib({ protocol_id: P, devices: [dev("electro", { btl_model_id: "btl-4825s-electro" })],
    sources: [{ title: "NICE", url: NICE, org: "NICE", year: 2016, used_for: "x" }], ...over });
  const planOfJob = async (jobId: number) => (await q(`SELECT * FROM physio_plans WHERE agent_job_id = $1`, [jobId]))[0] ?? null;
  const maxOutbox = async () => Number((await q(`SELECT COALESCE(max(id),0) AS m FROM staff_notification_outbox`))[0].m);
  const outbox = async (event: string, since: number) => q(`SELECT target_user_ids, text FROM staff_notification_outbox WHERE event_type = $1 AND id > $2 ORDER BY id`, [event, since]);
  const writerCalls = () => calls.filter((c) => c.role === "writer");

  try {
    console.log("\n── م. الترحيل ──");
    const cks = (await q(`SELECT conname FROM pg_constraint WHERE conname LIKE 'ck_paj_%' OR conname IN ('ck_pp_origin','ck_pp_opus_only','ck_pp_sources_array','ck_pprot_max_total','ck_pprot_origin','ck_pefr_forbidden_array') ORDER BY 1`)).map((r) => r.conname);
    same("M.1 القيودُ مكتوبة", cks.length, 16);
    same("M.3 السقفُ مزروعٌ لكلّ بروتوكولٍ في المكتبة", Number((await q(`SELECT count(*) FROM physio_protocols WHERE max_total_sessions IS NULL AND code <> 'TEST-OPUS-LIB' AND code NOT LIKE 'opus-%'`))[0].count), 0);
    same("E.22 **العاملُ لا يبدأ في الاختبار**", workerStartedForTest(), false);
    const { sql: m199 } = await import("./migrations/199_physio_agent_jobs");
    let rerun = "";
    try { await pool.query(m199); } catch (e: any) { rerun = String(e?.message ?? e); }
    same("M.4 **إعادةُ الترحيل لا تفعل شيئاً**", [rerun, Number((await q(`SELECT count(*) FROM pg_constraint WHERE conname LIKE 'ck_paj_%'`))[0].count)], ["", 10]);

    console.log("\n── هـ. المسارُ السعيد (مكتبة) ──");
    const p1 = await patient("علي حسين");
    const phone1 = String((await q(`SELECT phone FROM patients WHERE id = $1`, [p1]))[0].phone);
    const before1 = await maxOutbox();
    const e1 = await sign(p1, { notes: `علي حسين يشكو منذ شهور، هاتفه ${phone1}`, assessment: completeExamV2({ core: { anticoagulant: ["warfarin"] } }) });
    const j1rows = await waitJobs(p1, 1);
    same("E.1 **التوقيعُ يضع وظيفةً واحدة**", [j1rows.length, j1rows[0]?.status, j1rows[0]?.trigger, j1rows[0]?.exam_id], [1, "queued", "exam_signed", e1]);
    resetModel();
    queues.writer.push(
      msg([think(), tu("get_protocol", { protocol_id: P })]),
      msg([...searchBlocks("chronic low back pain exercise guideline", NICE, "علي حسين guideline"), ...fetchBlocks(GUIDE)], "pause_turn",
        { server_tool_use: { web_search_requests: 1, web_fetch_requests: 1 } }),
      msg([tu("submit_plan", libFor({ dose: { total_sessions: 30, sessions_per_week: 6, session_minutes: 50, why_en: null }, phase_notes: [{ phase: 1, note_ar: "ابدأ بلطف", note_en: null }],
        devices: [dev("electro", { btl_model_id: "btl-4825s-electro", program: "Back", fallback: [{ key: "frequency_hz", value: 100, unit: "Hz", source: GUIDE }, { key: "intensity_ma", value: 500, unit: "mA", source: GUIDE }] }),
          dev("shockwaves", { btl_model_id: "rswt-elite" }), dev("laser"), dev("ultrasound")],
        exercise_changes: [{ phase: 1, from_exercise_id: EX1, to_exercise_id: EX3, reason_ar: "أسهل لهذا المريض" }] }))]),
      msg([tu("submit_plan", libFor({ dose: { total_sessions: 30, sessions_per_week: 6, session_minutes: 50, why_en: null },
        devices: [dev("electro", { btl_model_id: "btl-4825s-electro", fallback: [{ key: "frequency_hz", value: 100, unit: "Hz", source: GUIDE }] }), dev("shockwaves", { btl_model_id: "rswt-elite" })],
        exercise_changes: [{ phase: 1, from_exercise_id: EX1, to_exercise_id: EX3, reason_ar: "أسهل لهذا المريض" }] }))]),
    );
    queues.reviewer.push(revise("major", "r1"), pass());
    await runAgentOnce({ skipReconcile: true });
    const j1 = (await jobsOf(p1))[0];
    const plan1 = await planOfJob(Number(j1.id));
    same("E.5 **الوظيفةُ نجحت والخطّةُ تنتظر الاعتماد**: منشؤها Opus ومعاينتُها، وكاتبُها الفاحص، والطالبُ على الوظيفة",
      [j1.status, plan1?.status, plan1?.origin, Number(plan1?.source_exam_id), Number(plan1?.created_by), Number(j1.requested_by), plan1?.out_of_library],
      ["succeeded", "pending", "opus", e1, SPEC, SPEC, false]);
    const ph1 = await q(`SELECT ph.position, array_agg(pe.exercise_id ORDER BY pe.position) AS ex, ph.session_to FROM physio_plan_phases ph LEFT JOIN physio_plan_phase_exercises pe ON pe.phase_id = ph.id
      WHERE ph.plan_id = $1 GROUP BY ph.id ORDER BY ph.position`, [plan1?.id]);
    same("E.5ب **المراحلُ مراحلُ البروتوكول** (بالتبديل المقبول) وبنطاق العدد المقصوص إلى السقف ١٨", [ph1.map((r) => [r.position, r.ex.map(Number), r.session_to]), plan1?.total_sessions],
      [[[1, [EX3, EX2], 9], [2, [EX2], 18]], 18]);
    const d1 = await q(`SELECT d.code, l.centre_use, l.btl, l.parameters FROM physio_plan_devices l JOIN devices d ON d.id = l.device_id WHERE l.plan_id = $1 ORDER BY l.display_order`, [plan1?.id]);
    same("E.5ج **الموجاتُ ممنوعةٌ بالوارفارين فحُذفت**، والتحفيزُ بموديله وقيمته المصدَّرة", [d1.map((r) => r.code), d1[0]?.btl?.modelId, d1[0]?.btl?.fallback?.map((f: any) => f.key),
      ((j1.result?.final?.gated?.removed ?? []) as any[]).some((r) => r.deviceCode === "shockwaves" && r.code === "forbidden")], [["electro"], "btl-4825s-electro", ["frequency_hz"], true]);
    const wc = writerCalls();
    same("E.5د **`pause_turn` يُكمَل بلا رسالة مستخدمٍ زائدة**: الطلبُ بعده يزيد رسالةَ المساعد وحدها",
      [wc[2]?.body.messages.length - wc[1]?.body.messages.length, wc[2]?.body.messages.at(-1)?.role], [1, "assistant"]);
    same("E.5هـ ونتيجةُ «راجِع» تصل الكاتبَ ثمّ يعيد", JSON.parse((wc[3]?.body.messages.at(-1) as any)?.content?.[0]?.content ?? "{}").status, "revise");
    const b0 = calls[0]?.body as any;
    same("E.7 **شكلُ الطلب**: النموذج · تفكيرٌ متكيّف بلا عرض · العمق · السقف · ساعةُ التخزين · `auto` · وأدواتٌ ثابتة",
      [b0.model, JSON.stringify(b0.thinking), b0.output_config?.effort, b0.max_tokens, [b0.system?.[0]?.cache_control?.ttl, b0.cache_control?.type, b0.cache_control?.ttl ?? null], b0.tool_choice?.type,
        calls.filter((c) => c.role === "reviewer")[0]?.body.output_config?.effort, calls.filter((c) => c.role === "reviewer")[0]?.body.max_tokens,
        wc.every((c) => JSON.stringify(c.body.tools) === JSON.stringify(wc[0].body.tools)), b0.tools.some((t: any) => t.type === "web_search_20260209"), "temperature" in b0],
      ["claude-opus-5-5", JSON.stringify({ type: "adaptive", display: "omitted" }), "high", 128000, ["1h", "ephemeral", null], "auto", "xhigh", 64000, true, true, false]);
    same("E.7ب **أدواتُ البحث بلا استدعاءٍ من شيفرة** (`allowed_callers: [\"direct\"]`) **والصفحةُ ١٢ ألفَ رمز**",
      b0.tools.filter((t: any) => /^web_/.test(t.type)).map((t: any) => [t.name, JSON.stringify(t.allowed_callers), t.max_content_tokens ?? null]),
      [["web_search", JSON.stringify(["direct"]), null], ["web_fetch", JSON.stringify(["direct"]), 12000]]);
    const ids1 = patientIdentifierSet({ name: `علي حسين ${MARK}`, phones: [phone1] });
    same("E.6 **لا هويّةَ في ما كتبه الخادم** في أيّ طلب — والاسمُ والهاتفُ في الملاحظة نُقّيا",
      [calls.every((c) => findAuthoredLeaks(authoredTextOf(c.body as any), ids1).length === 0), /\[REDACTED\] يشكو/.test(JSON.stringify(calls[0].body.messages[0]))], [true, true]);
    same("E.5و التدقيقُ والتنبيه", [(await q(`SELECT action FROM audit_log WHERE entity_type = 'physio_plan' AND entity_id = $1`, [plan1?.id])).map((r) => r.action),
      (await outbox("physio_opus_plan_ready", before1)).length], [["create_by_agent"], 1]);

    console.log("\n── ر. الرؤية والاعتماد ──");
    const specGet = await call("GET", `/api/physio/plans/${plan1.id}`, S.spec);
    const specList = await call("GET", `/api/patients/${p1}/physio-plans`, S.spec);
    const stub = specList.json?.plans?.find((x: any) => x.id === plan1.id);
    same("E.15 **غيرُ المعتمِد لا يفتحها، ويرى سطرَها بلا عنوانٍ ولا تنفيذ**، والاقتراحُ للمعتمِد وحده",
      [specGet.status, stub?.stub, stub?.titleAr, "canExecute" in (stub ?? {}), (await call("GET", `/api/physio/plans/${plan1.id}/opus-proposal`, S.spec)).status],
      [404, true, OPUS_AWAITING_LABEL, false, 403]);
    same("E.15ب و«بانتظار الاعتماد» العامّ بلاها، وورقةُ العلاج الطبيعي بلاها، والشارةُ بها",
      [((await call("GET", `/api/physio/plans?view=pending`, S.sup)).json?.plans ?? []).some((x: any) => x.id === plan1.id),
        (await call("GET", `/api/patients/${p1}/physio-sheet`, S.admin)).json?.plan ?? null, (await call("GET", `/api/physio/red-flag-reviews/pending-count`, S.sup)).json?.opusPlans >= 1],
      [false, null, true]);
    same("E.18 **قبل الاعتماد لا تُعدَّل** (`opus_plan_locked`)، و«الإعادة» للمرحلة القادمة",
      [(await call("PUT", `/api/physio/plans/${plan1.id}`, S.sup, { titleAr: "x", devices: [] })).json?.code, (await call("POST", `/api/physio/plans/${plan1.id}/return`, S.sup, { note: "x" })).json?.code],
      ["opus_plan_locked", "opus_return_next_phase"]);
    same("E.15ج الاعتمادُ بلا «الخطّة المقترحة» ⟵ ٤٠٠", (await call("POST", `/api/physio/plans/${plan1.id}/approve`, S.sup, {})).json?.code, "opus_use_proposal_view");
    const prop = await call("GET", `/api/physio/plans/${plan1.id}/opus-proposal`, S.sup);
    const pc = (await call("GET", `/api/physio/red-flag-reviews/pending-count`, S.sup)).json;
    same("E.20 **الشارةُ = العلاماتُ + خططُ Opus الطازجة**", pc?.count, (pc?.redFlags ?? -1) + (pc?.opusPlans ?? -1));
    same("E.15د «الخطّة المقترحة» للمعتمِد: الخطّةُ والسجلُّ والمراجعات", [prop.status, prop.json?.reviews?.length, Array.isArray(prop.json?.gateLog), prop.json?.examStale], [200, 2, true, false]);
    same("E.15هـ **أسماءُ ما تشير إليه الخطّةُ للعرض** — التمرينُ البديل والجهاز، وحالُ الخطّة في «حال الوظيفة» بلا ما فيها",
      [prop.json?.exerciseNames?.[EX3]?.nameAr, typeof prop.json?.deviceNames?.electro?.nameAr, (await call("GET", `/api/physio/exams/${e1}/opus-job`, S.spec)).json?.planStatus],
      ["TEST-OPUS-C", "string", "pending"]);
    const ap = await call("POST", `/api/physio/plans/${plan1.id}/approve`, S.sup, { fromProposal: true, acknowledgedIssueIds: [] });
    same("E.13c′ الاعتمادُ يفتحها للأخصائيّ", [ap.status, ap.json?.status, (await call("GET", `/api/physio/plans/${plan1.id}`, S.spec)).status], [200, "approved", 200]);
    {
      const pr1 = String((await q(`SELECT precautions FROM physio_plans WHERE id = $1`, [plan1.id]))[0].precautions ?? "");
      same("E.13d **الأجهزةُ الممنوعة في «الاحتياطات» بأسمائها العربية** لا برموزها", [/الأجهزةُ الممنوعة لهذا المريض/.test(pr1), /\bshockwaves\b/.test(pr1)], [true, false]);
      const { staffEventDeliverable } = await import("@shared/staff_notifications");
      same("E.13e **«اعتُمدت خطّتُك» يصل كاتبَها الطبيبَ باختصاص العلاج الطبيعي** (الفاحصُ كاتبُ خطّة Opus)",
        [staffEventDeliverable({ role: "doctor", medicalSpecialties: ["physiotherapy"] } as any, "physio_plan_decided", true),
          staffEventDeliverable({ role: "doctor", medicalSpecialties: ["physiotherapy"] } as any, "physio_plan_decided", false)], [true, false]);
    }
    same("E.15و وبعد الاعتماد يقول «حالُ الوظيفة» اعتُمدت", (await call("GET", `/api/physio/exams/${e1}/opus-job`, S.spec)).json?.planStatus, "approved");
    same("E.17b **مريضٌ له خطّةٌ قائمة ⟵ «اكتب بـ Opus» يدوياً ٤٠٩**", (await call("POST", `/api/physio/exams/${e1}/opus-plan`, S.spec)).json?.code, "has_active_plan");

    console.log("\n── ب. البوّابةُ والعلامةُ الحمراء ──");
    const p2 = await patient("بوّابة");
    const e2 = await sign(p2, { assessment: completeExamV2({ redFlags: { infection: "yes" } }) });
    await wait(200);
    same("E.2 **علامةٌ حمراء لم تُعتمد ⟵ لا وظيفة**، واليدويُّ ٤٠٩", [(await jobsOf(p2)).length, (await call("POST", `/api/physio/exams/${e2}/opus-plan`, S.spec)).json?.code], [0, "gate_closed"]);
    const rq = await call("POST", `/api/physio/exams/${e2}/red-flag-review`, S.spec, { examinerNote: "حمّى خفيفة" });
    const dec = await call("POST", `/api/physio/red-flag-reviews/${rq.json?.id}/decide`, S.sup, { decision: "approve", note: "لا تحفيزَ كهربائيّ حتى تزول الحمّى", forbiddenDevices: ["electro"] });
    const j2 = await jobsOf(p2);
    same("E.3ل **ولوحُ Opus يقول ملاحظةَ الاعتماد** (أوّلُ ما يقرؤه)", (await call("GET", `/api/physio/exams/${e2}/opus-job`, S.spec)).json?.approvalNote, "لا تحفيزَ كهربائيّ حتى تزول الحمّى");
    same("E.3 **الاعتمادُ يضع الوظيفة** والجهازُ المؤشَّر محفوظ", [dec.status, j2.length, j2[0]?.trigger, (await q(`SELECT forbidden_devices FROM physio_exam_red_flag_reviews WHERE id = $1`, [rq.json?.id]))[0]?.forbidden_devices],
      [200, 1, "red_flag_approved", ["electro"]]);
    resetModel();
    queues.writer.push(msg([tu("decline_plan", { reason_ar: "حمّى — إلى الطبيب أوّلاً", reason_en: "fever", recommended_action_ar: "مراجعة الطبيب اليوم" })]));
    const b2 = await maxOutbox();
    await runAgentOnce({ skipReconcile: true });
    const first2 = JSON.parse((calls[0].body.messages[0] as any).content[0].text);
    same("E.3ب **ملاحظةُ الاعتماد قيدٌ في أوّل طلب، والجهازُ الممنوعُ بقرار المعتمِد فيه**",
      [first2.constraints.approverConstraints.map((c: any) => c.note), first2.constraints.forbiddenDevices.filter((f: any) => f.source === "approver").map((f: any) => f.deviceCode)],
      [["لا تحفيزَ كهربائيّ حتى تزول الحمّى"], ["electro"]]);
    const j2b = (await jobsOf(p2))[0];
    same("E.8c **الرفضُ ⟵ فشلٌ بسببه ولا خطّة، وتنبيهُ المعتمِد والفاحص**",
      [j2b.status, j2b.error_code, await planOfJob(Number(j2b.id)), (await outbox("physio_opus_plan_ready", b2)).length, (await outbox("physio_opus_questions", b2)).length,
        (await call("GET", `/api/physio/exams/${e2}/opus-job`, S.spec)).json?.job?.decline?.recommendedActionAr],
      ["failed", "agent_declined", null, 1, 1, "مراجعة الطبيب اليوم"]);

    const p3 = await patient("مستوى المريض");
    const eA = await sign(p3, { assessment: completeExamV2({ redFlags: { infection: "yes" } }) });
    const eB = await sign(p3);
    const jB = await waitJobs(p3, 1);
    const claimed = await claimOne("test-holder");
    same("E.3c وظيفةُ أحدث معاينة وُضعت وأُخذت", [jB.length, Number(jB[0].exam_id), claimed?.id === Number(jB[0].id)], [1, eB, true]);
    const rqA = await call("POST", `/api/physio/exams/${eA}/red-flag-review`, S.spec, { examinerNote: "حرارة" });
    same("E.3d **طلبٌ معلَّقٌ على معاينةٍ أخرى يُوقف الوظيفةَ العاملة** (`cancel_requested`)",
      [rqA.status, (await q(`SELECT cancel_requested, cancel_reason FROM physio_agent_jobs WHERE id = $1`, [claimed!.id]))[0]], [201, { cancel_requested: true, cancel_reason: "gate_closed" }]);
    resetModel();
    await runClaimed(claimed!, "test-holder");
    same("E.3e والعاملُ يلغيها بلا نداءٍ للنموذج", [(await q(`SELECT status, error_code FROM physio_agent_jobs WHERE id = $1`, [claimed!.id]))[0], calls.length],
      [{ status: "cancelled", error_code: "gate_closed" }, 0]);
    await call("POST", `/api/physio/red-flag-reviews/${rqA.json?.id}/decide`, S.sup, { decision: "approve", note: "حرارةٌ عابرة" });
    const jB2 = await jobsOf(p3);
    same("E.3f **واعتمادُ الأولى يعيد وظيفةَ الأحدث**", [jB2.length, jB2.at(-1)?.status, Number(jB2.at(-1)?.exam_id)], [2, "queued", eB]);

    console.log("\n── ج. الإلغاءُ والاستبدال ──");
    await q(`INSERT INTO physio_exam_red_flag_reviews (exam_id, patient_id, flags, status, examiner_note) VALUES ($1, $2, '[]'::jsonb, 'pending', 'مباشرة')`, [eA, p3]);
    resetModel();
    await runAgentOnce({ skipReconcile: true });
    same("E.4 **البوّابةُ أُغلقت بين الوضع والأخذ ⟵ تُلغى بلا نداء**", [(await jobsOf(p3)).at(-1)?.error_code, calls.length], ["gate_closed", 0]);

    const p4 = await patient("أثناء التشغيل");
    const e4 = await sign(p4);
    await waitJobs(p4, 1);
    resetModel();
    queues.writer.push(msg([tu("submit_plan", libFor())]));
    queues.reviewer.push(async () => {
      //  المعاينةُ تتغيّر أثناء المراجعة — مباشرةً بلا باب التنقيح (فلا خطّافَ يلغي): الحفظُ وحده يجب أن يكتشف.
      const c = await pool.connect();
      try { await c.query("BEGIN"); await c.query("SET LOCAL session_replication_role = replica"); await c.query(`UPDATE medical_exams SET notes = 'تغيّرت' WHERE id = $1`, [e4]); await c.query("COMMIT"); }
      finally { c.release(); }
      return pass();
    });
    await runAgentOnce({ skipReconcile: true });
    const j4 = (await jobsOf(p4))[0];
    same("E.4b **تغيّرت المعاينة أثناء التشغيل ⟵ معاملةُ الحفظ تلغيها ولا صفَّ خطّة**", [j4.status, j4.error_code, await planOfJob(Number(j4.id))], ["cancelled", "exam_changed", null]);

    const p5 = await patient("أحدث");
    const e5a = await sign(p5);
    await waitJobs(p5, 1);
    const e5b = await sign(p5);
    const j5 = await waitJobs(p5, 2);
    same("E.4c **معاينةٌ أحدث ⟵ القديمةُ تُلغى والجديدةُ بالدور**", j5.map((j) => [Number(j.exam_id), j.status, j.error_code]),
      [[e5a, "cancelled", "superseded_by_newer_exam"], [e5b, "queued", null]]);

    let dupErr = "";
    try { await q(`INSERT INTO physio_agent_jobs (patient_id, exam_id, branch_id, trigger, exam_fingerprint) VALUES ($1, $2, $3, 'manual', 'x')`, [p5, e5a, B1]); }
    catch (e: any) { dupErr = String(e?.constraint ?? e?.message); }
    same("M.2 **وظيفةٌ نشطةٌ واحدة لكلّ مريض** ولو على معاينةٍ أخرى", dupErr, "uq_paj_one_active_patient");
    const cq = await call("POST", `/api/physio/opus-jobs/${j5[1].id}/cancel`, S.spec);
    same("E.19 إلغاءُ المنتظرة في الحال", [cq.status, cq.json?.job?.status, cq.json?.job?.errorCode], [200, "cancelled", "cancelled_by_user"]);

    console.log("\n── س. الأسئلة ──");
    const p6 = await patient("أسئلة");
    const e6 = await sign(p6);
    await waitJobs(p6, 1);
    resetModel();
    queues.writer.push(msg([tu("ask_questions", { questions: [{ id: "q1", text_ar: "هل يعمل واقفاً طوال اليوم؟", why_en: "load", affects: "history" }] })]));
    const b6 = await maxOutbox();
    await runAgentOnce({ skipReconcile: true });
    const j6 = (await jobsOf(p6))[0];
    same("E.8 **سؤالٌ ⟵ «يسأل»، والفاحصُ يُنبَّه**", [j6.status, j6.questions.length, (await outbox("physio_opus_questions", b6)).some((r) => r.target_user_ids.includes(SPEC))], ["needs_answers", 1, true]);
    same("E.8ب التقنيُّ ٤٠٣، والناقصُ ٤٠٠", [(await call("POST", `/api/physio/opus-jobs/${j6.id}/answers`, S.tech, { answers: [{ id: "q1", answer: "نعم" }] })).status,
      (await call("POST", `/api/physio/opus-jobs/${j6.id}/answers`, S.spec2, { answers: [] })).json?.code], [403, "answers_incomplete"]);
    const ph6 = (await q(`SELECT phone FROM patients WHERE id = $1`, [p6]))[0].phone;
    const ans = await call("POST", `/api/physio/opus-jobs/${j6.id}/answers`, S.spec2, { answers: [{ id: "q1", answer: `نعم، ثماني ساعات — قالت أسئلة ${MARK} على ${ph6}` }] });
    same("E.8ج **زميلُه في الفرع يجيب** ⟵ للطابور", [ans.status, ans.json?.job?.status, ans.json?.job?.questionRounds], [202, "queued", 1]);
    resetModel();
    queues.writer.push(msg([tu("ask_questions", { questions: [{ id: "q2", text_ar: "هل هي حامل الآن؟ نحتاج الجواب", why_en: "x", affects: "exam_field" }] })]));
    await runAgentOnce({ skipReconcile: true });
    const qa6 = calls[0] ? JSON.parse((calls[0].body.messages[0] as any).content[0].text).qa : [{ answers: [{ answer: "" }] }];
    same("E.8د **والأجوبةُ في أوّل طلب بعدها — منقّاةً من اسم المريض وهاتفه، وبلا اسمِ مَن أجاب**", [qa6[0].answers[0].answer.startsWith("نعم، ثماني ساعات"),
      qa6[0].answers[0].answer.includes(MARK), qa6[0].answers[0].answer.includes(ph6), "byName" in qa6[0]],
      [true, false, false, false]);
    const j6b = (await jobsOf(p6))[0];
    same("E.8هـ **سؤالُ خانة المعاينة لا يُجاب نصّاً** ⟵ ٤٠٠", (await call("POST", `/api/physio/opus-jobs/${j6b.id}/answers`, S.spec, { answers: [{ id: "q2", answer: "لا" }] })).json?.code,
      "answer_needs_exam_revision");

    const p7 = await patient("اكتشاف");
    const e7 = await sign(p7);
    await waitJobs(p7, 1);
    resetModel();
    queues.writer.push(msg([tu("report_new_finding", { kind: "red_flag", text_ar: "ألمٌ ليليّ لا يهدأ ونقصُ وزن", text_en: "night pain", source_question_id: null })]));
    await runAgentOnce({ skipReconcile: true });
    same("E.8f **اكتشافُ علامةٍ ⟵ «عدّل المعاينة» ولا خطّة**", [(await jobsOf(p7))[0].status], ["needs_exam_revision"]);
    const rev7 = await call("PATCH", `/api/medical/exams/${e7}`, S.spec, { caseType: "physiotherapy", notes: "عُدّلت", diagnosis: "ألم أسفل الظهر المزمن", prescription: {},
      assessment: completeExamV2({ core: { painNow: 4 } }) });
    const j7 = await waitJobs(p7, 2);
    same("E.8g **وتنقيحُ المعاينة يضع وظيفةً جديدة**", [rev7.status, j7.length, j7.at(-1)?.trigger], [200, 2, "exam_revised"]);

    //  ما بقي بالدور من سيناريوهاتٍ سابقة لا يُؤخذ بدل وظيفة السيناريو التالي.
    await q(`UPDATE physio_agent_jobs SET status = 'cancelled', error_code = 'cancelled_by_user', error = 'تنظيف', finished_at = now()
      WHERE status IN ('queued','needs_answers') AND patient_id IN (SELECT id FROM patients WHERE referral_sub_source = $1)`, [MARK]);
    console.log("\n── ع. أخطاءُ الخدمة والإيقاف ──");
    const p8 = await patient("رفض");
    await sign(p8); await waitJobs(p8, 1);
    resetModel();
    queues.writer.push(msg([tu("submit_plan", libFor())], "refusal"), { ...msg([tu("submit_plan", libFor())], "refusal"), stop_details: { type: "refusal", category: "bio" } } as any);
    await runAgentOnce({ skipReconcile: true });
    const j8 = (await jobsOf(p8))[0];
    same("E.9 **الرفضُ يُعاد مرّةً بالطلب نفسِه ثمّ نهائيّ بفئته، ولا تُنفَّذ أداتُه**، والسجلُّ لا يُمحى",
      [j8.status, j8.error_code, calls.length, calls.filter((c) => c.role === "reviewer").length, JSON.stringify(calls[0]?.body.messages) === JSON.stringify(calls[1]?.body.messages),
        JSON.parse(j8.error_detail ?? "{}").category, j8.result?.usage?.writer?.turns, j8.result?.refusals?.length],
      ["failed", "refusal", 2, 0, true, "bio", 2, 1]);
    const p8b = await patient("رفض ثم قبول");
    await sign(p8b); await waitJobs(p8b, 1);
    resetModel();
    queues.writer.push(msg([tu("submit_plan", libFor())], "refusal"), msg([tu("submit_plan", libFor())]));
    queues.reviewer.push(pass());
    await runAgentOnce({ skipReconcile: true });
    same("E.9ب **ورفضٌ واحدٌ ثمّ قبولٌ ⟵ تُكتب الخطّة**", [(await jobsOf(p8b))[0].status, writerCalls().length], ["succeeded", 2]);

    const p9 = await patient("حمل زائد");
    await sign(p9); await waitJobs(p9, 1);
    resetModel();
    const overloaded = () => { throw new Anthropic.InternalServerError(529, { type: "error", error: { type: "overloaded_error", message: "x" } }, "Overloaded", new Headers()); };
    for (let i = 0; i < 5; i++) queues.writer.push(overloaded as any);
    await runAgentOnce({ skipReconcile: true });
    const j9 = (await jobsOf(p9))[0];
    same("E.10 **٥٢٩ ⟵ أربعُ إعاداتٍ ثمّ للطابور بإخفاقٍ واحد**", [j9.status, j9.failures, calls.length], ["queued", 1, 5]);
    for (let r = 0; r < 4; r++) {
      await q(`UPDATE physio_agent_jobs SET run_after = now() WHERE id = $1`, [j9.id]);
      for (let i = 0; i < 5; i++) queues.writer.push(overloaded as any);
      await runAgentOnce({ skipReconcile: true });
    }
    same("E.10ب وعند الحدّ ⟵ `api_unavailable`", [(await jobsOf(p9))[0].status, (await jobsOf(p9))[0].error_code, (await jobsOf(p9))[0].failures], ["failed", "api_unavailable", 5]);
    const p10 = await patient("خطأ في البثّ");
    await sign(p10); await waitJobs(p10, 1);
    resetModel();
    queues.writer.push((() => { throw new Anthropic.APIError(undefined, { type: "error", error: { type: "overloaded_error", message: "x" } }, "overloaded", new Headers()); }) as any,
      msg([tu("submit_plan", libFor())]));
    queues.reviewer.push(pass());
    await runAgentOnce({ skipReconcile: true });
    same("E.10c **خطأُ SSE في منتصف البثّ (بلا status) عابرٌ يُعاد**", [(await jobsOf(p10))[0].status, writerCalls().length], ["succeeded", 2]);
    const p10c = await patient("انقطاع المقبس");
    await sign(p10c); await waitJobs(p10c, 1);
    resetModel();
    const socketDrop = () => { const sock = Object.assign(new Error("other side closed"), { code: "UND_ERR_SOCKET" }); const te = new TypeError("terminated", { cause: sock });
      throw new Anthropic.AnthropicError("terminated", { cause: te } as any); };
    queues.writer.push(socketDrop as any, (() => { throw new Anthropic.AnthropicError("request ended without sending any chunks"); }) as any, msg([tu("submit_plan", libFor())]));
    queues.reviewer.push(pass());
    await runAgentOnce({ skipReconcile: true });
    same("E.10d **انقطاعُ الاتّصال في منتصف البثّ عابرٌ يُعاد** (`AnthropicError` ليس `APIError`)", [(await jobsOf(p10c))[0].status, writerCalls().length], ["succeeded", 3]);
    const p10b = await patient("طلب فاسد");
    await sign(p10b); await waitJobs(p10b, 1);
    resetModel();
    queues.writer.push((() => { throw new Anthropic.BadRequestError(400, { type: "error", error: { type: "invalid_request_error", message: "bad" } }, "bad", new Headers()); }) as any);
    await runAgentOnce({ skipReconcile: true });
    same("E.10d الطلبُ الفاسد نهائيّ", [(await jobsOf(p10b))[0].status, (await jobsOf(p10b))[0].error_code, calls.length], ["failed", "api_error", 1]);

    const p11 = await patient("ميّتة");
    await sign(p11); const j11 = (await waitJobs(p11, 1))[0];
    await q(`UPDATE physio_agent_jobs SET status = 'running', locked_by = 'ghost', locked_at = now(), heartbeat_at = now() - interval '6 minutes' WHERE id = $1`, [j11.id]);
    await recoverStale();
    same("E.11 **بلا نبضٍ ستّ دقائق ⟵ للطابور بإخفاقٍ محسوب**", [(await jobsOf(p11))[0].status, (await jobsOf(p11))[0].failures], ["queued", 1]);
    await q(`UPDATE physio_agent_jobs SET status = 'running', locked_by = 'ghost', locked_at = now(), heartbeat_at = now() - interval '6 minutes', cancel_requested = true, cancel_reason = 'cancelled_by_user' WHERE id = $1`, [j11.id]);
    await recoverStale();
    same("E.11ب والمطلوبُ إلغاؤها تُلغى", [(await jobsOf(p11))[0].status, (await jobsOf(p11))[0].error_code], ["cancelled", "cancelled_by_user"]);

    const p12 = await patient("نبض");
    await sign(p12); await waitJobs(p12, 1);
    resetModel();
    let hb1: any = null, hb2: any = null;
    setAgentTimingForTests({ heartbeatMs: 40, staleMs: 150, runCapMs: 60_000 });
    queues.writer.push(async () => {
      const id = (await jobsOf(p12))[0].id;
      hb1 = (await q(`SELECT heartbeat_at FROM physio_agent_jobs WHERE id = $1`, [id]))[0].heartbeat_at;
      await wait(400);
      await recoverStale();
      hb2 = (await q(`SELECT heartbeat_at, status FROM physio_agent_jobs WHERE id = $1`, [id]))[0];
      return msg([tu("submit_plan", libFor())]);
    });
    queues.reviewer.push(pass());
    await runAgentOnce({ skipReconcile: true });
    setAgentTimingForTests({ heartbeatMs: 40, staleMs: 5 * 60_000, runCapMs: 60_000 });
    same("E.11c **النبضُ بالمؤقّت يمضي أثناء صمت النموذج**، والاستعادةُ لا تسرقها", [new Date(hb2?.heartbeat_at) > new Date(hb1), hb2?.status, (await jobsOf(p12))[0].status],
      [true, "running", "succeeded"]);

    const p13 = await patient("سباق");
    await sign(p13); await waitJobs(p13, 1);
    const [c1, c2] = await Promise.all([claimOne("A"), claimOne("B")]);
    same("E.11d **اثنان يأخذان ⟵ واحدٌ وحده**", [c1 === null, c2 === null].filter(Boolean).length, 1);
    const mine = (c1 ?? c2)!;
    await q(`UPDATE physio_agent_jobs SET locked_by = 'thief' WHERE id = $1`, [mine.id]);
    resetModel();
    await runClaimed(mine, c1 ? "A" : "B");
    same("E.11e **تشغيلٌ سُرق لا يكتب شيئاً**", [(await jobsOf(p13))[0].locked_by, (await jobsOf(p13))[0].status, await planOfJob(mine.id)], ["thief", "running", null]);
    await q(`UPDATE physio_agent_jobs SET status = 'cancelled', error_code = 'cancelled_by_user', error = 'x', finished_at = now() WHERE id = $1`, [mine.id]);

    const p14 = await patient("إطفاء");
    await sign(p14); await waitJobs(p14, 1);
    resetModel();
    queues.writer.push(async (c) => {
      releaseAllForTests();
      await wait(5);
      throw new Anthropic.APIUserAbortError();
    });
    await runAgentOnce({ skipReconcile: true });
    same("E.11f **إطفاءُ الخادم ⟵ للطابور بلا إخفاق**", [(await jobsOf(p14))[0].status, (await jobsOf(p14))[0].failures], ["queued", 0]);
    resetModel();
    let stopOnce = true;
    setPipelineHookForTests((point) => { if (point === "after_checkpoint_saving" && stopOnce) { stopOnce = false; throw new AgentStop("shutdown"); } });
    queues.writer.push(msg([tu("submit_plan", libFor())]));
    queues.reviewer.push(pass());
    await runAgentOnce({ skipReconcile: true });
    const afterStop = (await jobsOf(p14))[0];
    resetModel();
    await runAgentOnce({ skipReconcile: true });
    setPipelineHookForTests(null);
    same("E.11g **الاستئنافُ بعد نقطة الحفظ بلا كاتبٍ ولا مراجع**", [afterStop.status, afterStop.checkpoint?.stage, calls.length, (await jobsOf(p14))[0].status], ["queued", "saving", 0, "succeeded"]);

    const p15 = await patient("إلغاء أثناء");
    await sign(p15); await waitJobs(p15, 1);
    resetModel();
    queues.writer.push(async () => {
      const id = (await jobsOf(p15))[0].id;
      await call("POST", `/api/physio/opus-jobs/${id}/cancel`, S.spec);
      await wait(300);
      return msg([tu("submit_plan", libFor())]);
    });
    queues.reviewer.push(pass());
    await runAgentOnce({ skipReconcile: true });
    same("E.19b **إلغاءُ العاملة يصل خلال نبضة** ولا خطّة", [(await jobsOf(p15))[0].status, (await jobsOf(p15))[0].error_code, await planOfJob(Number((await jobsOf(p15))[0].id))],
      ["cancelled", "cancelled_by_user", null]);

    console.log("\n── ط. الجولاتُ والإنهاء ──");
    const p16 = await patient("سقف");
    await sign(p16); await waitJobs(p16, 1);
    resetModel();
    queues.writer.push(msg([tu("submit_plan", libFor())]));
    queues.reviewer.push(msg([{ type: "text", text: "..." }], "max_tokens"), pass());
    await runAgentOnce({ skipReconcile: true });
    const rc = calls.filter((c) => c.role === "reviewer");
    same("E.12 **`max_tokens` ⟵ مرّةً بسقفٍ أعلى**", [rc.map((c) => c.body.max_tokens), (await jobsOf(p16))[0].status], [[64000, 128000], "succeeded"]);
    const p16b = await patient("سقفان");
    await sign(p16b); await waitJobs(p16b, 1);
    resetModel();
    queues.writer.push(msg([tu("submit_plan", libFor())]));
    queues.reviewer.push(msg([{ type: "text", text: "..." }], "max_tokens"), msg([{ type: "text", text: "..." }], "max_tokens"));
    await runAgentOnce({ skipReconcile: true });
    same("E.12a وانقطاعان ⟵ `output_truncated`، **والسجلُّ لا يُمحى** (الاستهلاكُ والمسوّدةُ على الوظيفة)", [(await jobsOf(p16b))[0].error_code,
      (await jobsOf(p16b))[0].result?.usage?.reviewer?.turns, (await jobsOf(p16b))[0].result?.drafts?.length], ["output_truncated", 2, 1]);
    same("E.12b **والإعادةُ بعد الانقطاع تقول «اختصر»** في آخر رسالةٍ لم يُجَب عنها — لا طلبٌ مطابق",
      [/ran out of output tokens/.test(JSON.stringify(calls.filter((c) => c.role === "reviewer")[1]?.body.messages.at(-1))),
        /ran out of output tokens/.test(JSON.stringify(calls.filter((c) => c.role === "reviewer")[0]?.body.messages))], [true, false]);
    const p16r = await patient("انقطاع ثم عودة");
    await sign(p16r); await waitJobs(p16r, 1);
    resetModel();
    queues.writer.push(msg([{ type: "text", text: "..." }], "max_tokens"), msg([tu("get_protocol", { protocol_id: P })]), msg([{ type: "text", text: "..." }], "max_tokens"),
      msg([tu("submit_plan", libFor())]));
    queues.reviewer.push(pass());
    await runAgentOnce({ skipReconcile: true });
    same("E.12c2 **انقطاعٌ ثمّ جولةٌ سليمة ثمّ انقطاع ⟵ ليس نهائيّاً** (العدّادُ يُصفَّر بعد السليمة)", [(await jobsOf(p16r))[0].status, writerCalls().length], ["succeeded", 4]);
    const p16d = await patient("طويل جدا");
    await sign(p16d); await waitJobs(p16d, 1);
    resetModel();
    queues.writer.push((() => { throw new Anthropic.BadRequestError(400, { type: "error", error: { type: "invalid_request_error", message: "prompt is too long: 1000201 tokens > 1000000 maximum" } },
      "prompt is too long: 1000201 tokens > 1000000 maximum", new Headers()); }) as any);
    await runAgentOnce({ skipReconcile: true });
    same("E.12d **الطلبُ أطولُ من النافذة ⟵ `context_too_long`** (لا «رفضت الخدمة» عامّة، ولا إعادة)", [(await jobsOf(p16d))[0].status, (await jobsOf(p16d))[0].error_code, writerCalls().length],
      ["failed", "context_too_long", 1]);
    const p16e = await patient("سياق كبير");
    await sign(p16e); await waitJobs(p16e, 1);
    resetModel();
    queues.writer.push(msg([tu("get_protocol", { protocol_id: P })], "tool_use", { input_tokens: 200_000, cache_read_input_tokens: 480_000 }), msg([tu("submit_plan", libFor())]));
    queues.reviewer.push(pass());
    await runAgentOnce({ skipReconcile: true });
    same("E.12e **السياقُ فوق الحدّ الليّن ⟵ «اكتفِ بالبحث» في النتيجة التالية**", [/Research budget/.test(JSON.stringify(writerCalls()[1]?.body.messages.at(-1))), (await jobsOf(p16e))[0].status],
      [true, "succeeded"]);
    const p16c = await patient("مهلة");
    await sign(p16c); await waitJobs(p16c, 1);
    setAgentTimingForTests({ heartbeatMs: 40, staleMs: 5 * 60_000, runCapMs: 60 });
    resetModel();
    queues.writer.push(async (c) => { await new Promise((_r, rej) => c.signal.addEventListener("abort", () => rej(new Anthropic.APIUserAbortError()))); return msg([]); });
    await runAgentOnce({ skipReconcile: true });
    setAgentTimingForTests({ heartbeatMs: 40, staleMs: 5 * 60_000, runCapMs: 60_000 });
    same("E.19f **المهلةُ ⟵ للطابور بإخفاقٍ محسوب** (لا إلغاء)", [(await jobsOf(p16c))[0].status, (await jobsOf(p16c))[0].failures], ["queued", 1]);
    await q(`UPDATE physio_agent_jobs SET status = 'cancelled', error_code = 'cancelled_by_user', error = 'x', finished_at = now() WHERE patient_id = $1 AND status = 'queued'`, [p16c]);
    const p17 = await patient("بلا إنهاء");
    await sign(p17); await waitJobs(p17, 1);
    resetModel();
    for (let i = 0; i < 3; i++) queues.writer.push(msg([{ type: "text", text: "thinking out loud" }], "end_turn"));
    await runAgentOnce({ skipReconcile: true });
    same("E.12ب **بلا أداة إنهاء بعد تذكيرين ⟵ `no_submission`**", [(await jobsOf(p17))[0].error_code, writerCalls().length, (writerCalls()[1]?.body.messages.at(-1) as any)?.content?.[0]?.text?.startsWith("Finish now")],
      ["no_submission", 3, true]);
    const p18 = await patient("إنهاءان");
    await sign(p18); await waitJobs(p18, 1);
    resetModel();
    queues.writer.push(msg([tu("ask_questions", { questions: [{ id: "a", text_ar: "هل يعمل واقفاً طوال اليوم؟", why_en: "x", affects: "history" }] }), tu("submit_plan", libFor())]),
      msg([tu("submit_plan", libFor())]));
    queues.reviewer.push(pass());
    await runAgentOnce({ skipReconcile: true });
    same("E.12c **أداتا إنهاء في دورٍ واحد ⟵ لا تُنفَّذ أيٌّ منهما**", [((writerCalls()[1]?.body.messages.at(-1) as any)?.content ?? []).map((b: any) => b.is_error), (await jobsOf(p18))[0].status],
      [[true, true], "succeeded"]);
    const p19 = await patient("حرجة");
    await sign(p19); await waitJobs(p19, 1);
    resetModel();
    for (let i = 0; i < 3; i++) queues.writer.push(msg([tu("submit_plan", libFor())]));
    queues.reviewer.push(revise("critical", "c1"), revise("critical", "c1"), revise("critical", "c1"));
    await runAgentOnce({ skipReconcile: true });
    same("E.13b **ملاحظةٌ حرجة لم تُحلّ بعد جولتين ⟵ فشلٌ ولا خطّة**", [(await jobsOf(p19))[0].error_code, await planOfJob(Number((await jobsOf(p19))[0].id)), writerCalls().length],
      ["unresolved_critical", null, 3]);
    const p20 = await patient("فارغة");
    await sign(p20); await waitJobs(p20, 1);
    resetModel();
    const emptyOol = () => msg([tu("submit_plan", oolPlan({ devices: [], phases: [phase([])], sources: [] }))]);
    queues.writer.push(emptyOol(), emptyOol(), emptyOol());
    await runAgentOnce({ skipReconcile: true });
    same("E.14 **بلا جهازٍ ولا تمرين ⟵ فشلٌ بسببه**", [(await jobsOf(p20))[0].error_code, calls.filter((c) => c.role === "reviewer").length], ["empty_plan", 0]);
    const p21 = await patient("ميزانية");
    await sign(p21); await waitJobs(p21, 1);
    resetModel();
    queues.writer.push(msg([...searchBlocks("lbp", NICE, "t"), tu("get_protocol", { protocol_id: P })], "tool_use", { server_tool_use: { web_search_requests: 61, web_fetch_requests: 0 } }),
      msg([...searchBlocks("lbp", NICE, "t"), tu("get_protocol", { protocol_id: P })], "tool_use", { server_tool_use: { web_search_requests: 30, web_fetch_requests: 0 } }));
    await runAgentOnce({ skipReconcile: true });
    same("E.21 **حدُّ البحث**: ملاحظةٌ في النتيجة التالية، وفوق مرّةٍ ونصف ⟵ فشل",
      [/Research budget/.test(JSON.stringify(writerCalls()[1]?.body.messages.at(-1))), (await jobsOf(p21))[0].error_code], [true, "research_budget"]);
    const p21b = await patient("ميزانية لكل دور");
    await sign(p21b); await waitJobs(p21b, 1);
    resetModel();
    queues.writer.push(msg([...searchBlocks("lbp", NICE, "t"), tu("submit_plan", libFor())], "tool_use", { server_tool_use: { web_search_requests: 80, web_fetch_requests: 0 } }));
    queues.reviewer.push(msg([...searchBlocks("lbp review", NICE, "t"), tu("submit_review", { verdict: "pass", summary_ar: "سليمة", issues: [], checked: [] })], "tool_use",
      { server_tool_use: { web_search_requests: 50, web_fetch_requests: 0 } }));
    await runAgentOnce({ skipReconcile: true });
    same("E.21ب **ميزانيةٌ لكلّ دور**: الكاتبُ ٨٠ والمراجعُ ٥٠ (معاً فوق المرّة والنصف) ⟵ تُكتب الخطّة، والعدّاداتُ بالدور في النتيجة",
      [(await jobsOf(p21b))[0].status, (await jobsOf(p21b))[0].result?.usage?.web?.writer?.searches, (await jobsOf(p21b))[0].result?.usage?.web?.reviewer?.searches],
      ["succeeded", 80, 50]);
    const p22 = await patient("hussein ali");
    await sign(p22); await waitJobs(p22, 1);
    resetModel();
    queues.writer.push(msg(searchBlocks(`hussein ali ${MARK} back pain`, NICE, "x"), "pause_turn"));
    await runAgentOnce({ skipReconcile: true });
    same("R.5ب **بحثٌ باسم المريض ⟵ يُوقف ويُسجَّل**", [(await jobsOf(p22))[0].error_code,
      (await q(`SELECT count(*) FROM audit_log WHERE entity_type = 'physio_agent_job' AND entity_id = $1 AND action = 'privacy_stop'`, [(await jobsOf(p22))[0].id]))[0].count], ["identifier_in_query", "1"]);

    console.log("\n── خ. خارج المكتبة ──");
    const p23 = await patient("خارج");
    await sign(p23); await waitJobs(p23, 1);
    resetModel();
    const oolSub = (over: Record<string, unknown> = {}) => oolPlan({ devices: [dev("shockwaves", { btl_model_id: "fswt", fallback: [{ key: "energy_flux_mj_mm2", value: 0.12, unit: "mJ/mm2", source: GUIDE },
      { key: "frequency_hz", value: 4, unit: "Hz", source: GUIDE }, { key: "shocks", value: 2000, unit: "shocks", source: GUIDE }] })],
      phases: [phase([exRow(EX1), { exercise_id: null, proposed_key: "new1", sets: 2, reps: 10, hold_seconds: 0, rest_seconds: null, dose_note_ar: null, dose_note_en: null, why_en: null }])],
      proposed_cards: [card({ key: "new1", source_url: GUIDE })], sources: [{ title: "Guide", url: GUIDE, org: "Org", year: 2024, used_for: "dose" }], ...over });
    queues.writer.push(msg([tu("submit_plan", oolSub())]),
      msg([...fetchBlocks(GUIDE), tu("submit_plan", oolSub())], "tool_use", { server_tool_use: { web_search_requests: 0, web_fetch_requests: 1 } }),
      msg([tu("submit_plan", oolSub())]));
    queues.reviewer.push(pass(), pass());
    queues.auditor.push(auditMsg("concerns", "a1", "major"), auditMsg("concerns", "a2", "major"));
    await runAgentOnce({ skipReconcile: true });
    const j23 = (await jobsOf(p23))[0];
    const plan23 = await planOfJob(Number(j23.id));
    same("E.13 **مصدرٌ لم يُفتح ⟵ «راجِع»؛ ثمّ المراجعُ ثمّ المدقّق ⟵ إصلاحٌ ⟵ المراجعُ مرّةً أخرى ⟵ المدقّقُ مرّةً أخيرة، والكبيرةُ تبقى»**",
      [JSON.parse((writerCalls()[1]?.body.messages.at(-1) as any)?.content?.[0]?.content ?? "{}").blockingGateIssues?.map((b: any) => b.code), calls.filter((c) => c.role === "reviewer").length,
        calls.filter((c) => c.role === "auditor").length, j23.status, plan23?.out_of_library, j23.result?.unresolved?.auditor?.map((i: any) => i.id)],
      [["source_not_fetched", "source_not_fetched"], 2, 2, "succeeded", true, ["a2"]]);
    same("E.13c **الاعتمادُ بلا إقرارٍ بالكبيرة ⟵ ٤٠٠**", (await call("POST", `/api/physio/plans/${plan23.id}/approve`, S.admin, { fromProposal: true, acknowledgedIssueIds: [] })).json?.code,
      "opus_ack_required");
    const ap23 = await call("POST", `/api/physio/plans/${plan23.id}/approve`, S.admin, { fromProposal: true, acknowledgedIssueIds: ["a2"] });
    const dp = ap23.json?.draftProtocolId ? (await q(`SELECT * FROM physio_protocols WHERE id = $1`, [ap23.json.draftProtocolId]))[0] : null;
    const dpDev = dp ? (await q(`SELECT params FROM physio_protocol_devices WHERE protocol_id = $1`, [dp.id]))[0]?.params : null;
    same("E.16 **«خارج المكتبة» يصير بروتوكولاً مسوّدة** بنصّه العامّ وبطاقاته مسوّدة وإعداداتِ الموجات بخاناتها، والإقرارُ في التدقيق",
      [ap23.status, dp?.status, dp?.origin, dp?.code, /لأنّ/.test(JSON.stringify(dp)), dpDev && Object.fromEntries(Object.entries(dpDev).sort()),
        (await q(`SELECT status FROM physio_exercises WHERE code = $1`, [`opus-${plan23.id}-new1`]))[0]?.status,
        (await q(`SELECT new_values FROM audit_log WHERE entity_type = 'physio_plan' AND entity_id = $1 AND action = 'approve'`, [plan23.id]))[0]?.new_values?.includes?.("a2") ??
          JSON.stringify((await q(`SELECT new_values FROM audit_log WHERE entity_type = 'physio_plan' AND entity_id = $1 AND action = 'approve'`, [plan23.id]))[0]?.new_values).includes("a2")],
      [200, "draft", "opus", `opus-${plan23.id}`, false, { energyMj: "0.12", frequencyHz: "4", impulses: "2000", mode: "focused" }, "draft", true]);
    same("E.16ب **ومسوّدةُ Opus لا تدخل فهرسَ المكتبة للوظيفة التالية**", (await libraryIndex(db)).some((l) => l.id === ap23.json?.draftProtocolId), false);
    same("E.16ج والخطّةُ أخذت بطاقتَها المقترحة", (await q(`SELECT count(*) FROM physio_plan_phase_exercises pe JOIN physio_plan_phases ph ON ph.id = pe.phase_id
      JOIN physio_exercises e ON e.id = pe.exercise_id WHERE ph.plan_id = $1 AND e.code = $2`, [plan23.id, `opus-${plan23.id}-new1`]))[0].count, "1");

    console.log("\n── خ٢. سؤالٌ في جولة إصلاح المدقّق ──");
    const p23q = await patient("سؤال بعد المدقق");
    await sign(p23q); await waitJobs(p23q, 1);
    resetModel();
    queues.writer.push(msg([...fetchBlocks(GUIDE), tu("submit_plan", oolSub())], "tool_use", { server_tool_use: { web_search_requests: 0, web_fetch_requests: 1 } }),
      msg([tu("ask_questions", { questions: [{ id: "qa1", text_ar: "هل يمارس الرياضة؟", why_en: "load", affects: "history" }] })]));
    queues.reviewer.push(pass());
    queues.auditor.push(auditMsg("concerns", "a9", "major"));
    await runAgentOnce({ skipReconcile: true });
    const j23q = (await jobsOf(p23q))[0];
    same("E.13q **سؤالٌ في جولة إصلاح المدقّق ⟵ «يسأل» ونقطةُ الاستئناف بلا الخطّة المقبولة** (والمصادرُ المفتوحة باقية)",
      [j23q.status, j23q.checkpoint?.accepted ?? null, j23q.checkpoint?.stage ?? null, (j23q.checkpoint?.fetchedUrls ?? []).length > 0], ["needs_answers", null, null, true]);
    await call("POST", `/api/physio/opus-jobs/${j23q.id}/answers`, S.spec, { answers: [{ id: "qa1", answer: "يمشي يومياً" }] });
    resetModel();
    queues.writer.push(msg([tu("submit_plan", oolSub())]));
    queues.reviewer.push(pass());
    queues.auditor.push(auditMsg("pass"));
    await runAgentOnce({ skipReconcile: true });
    same("E.13r **وبعد الجواب يُعاد الكاتبُ بالأجوبة** (لا تُحفظ الخطّةُ القديمة)، ثمّ المراجعُ والمدقّق",
      [(await jobsOf(p23q))[0].status, writerCalls().length, JSON.parse((writerCalls()[0]?.body.messages[0] as any)?.content?.[0]?.text ?? "{}").qa?.[0]?.answers?.[0]?.answer,
        calls.filter((c) => c.role === "auditor").length], ["succeeded", 1, "يمشي يومياً", 1]);

    console.log("\n── ر. مراجعةُ المرحلة: العاملُ والحفظُ واللوح ──");
    //  بوّابةٌ تغلق عند الحفظ (البروتوكولُ أُرشف بعد المراجعة) ⟵ الوظيفةُ تفشل في معاملة الحفظ، **والتنبيهُ يصل**، والسببُ على اللوح بالعربية.
    const pg1 = await patient("بوابة عند الحفظ");
    const eg1 = await sign(pg1); await waitJobs(pg1, 1);
    resetModel();
    queues.writer.push(msg([tu("submit_plan", libFor())]));
    queues.reviewer.push(async () => { await q(`UPDATE physio_protocols SET is_archived = true WHERE id = $1`, [P]); return pass(); });
    const bg1 = await maxOutbox();
    await runAgentOnce({ skipReconcile: true });
    await q(`UPDATE physio_protocols SET is_archived = false WHERE id = $1`, [P]);
    const jg1 = (await jobsOf(pg1))[0];
    const og1 = await call("GET", `/api/physio/exams/${eg1}/opus-job`, S.spec);
    same("N.1 **بوّابةٌ تغلق عند الحفظ ⟵ تفشل الوظيفة ويُنبَّه المعتمِدون والفاحص**، والرموزُ في `error_detail` وأسبابُها العربية على اللوح",
      [jg1.status, jg1.error_code, jg1.error_detail, (await outbox("physio_opus_plan_ready", bg1)).length > 0,
        (await outbox("physio_opus_questions", bg1)).some((r) => r.target_user_ids.includes(SPEC)), og1.json?.job?.blockingGates],
      ["failed", "gates_blocking", "protocol_missing", true, true, [{ code: "protocol_missing", reasonAr: "البروتوكولُ غيرُ موجود أو مؤرشف أو مسوّدةٌ غيرُ معتمَدة" }]]);
    same("N.1ب **وأخذُ الوظيفة يُكتب في التدقيق** (`claim`)",
      Number((await q(`SELECT count(*) FROM audit_log WHERE entity_type = 'physio_agent_job' AND entity_id = $1 AND action = 'claim'`, [jg1.id]))[0].count) >= 1, true);

    //  «اكتب» لا يُعرض حيث يردّه الخادم: معاينةٌ أقدم ⟵ `not_newest` وسببُه؛ والأحدثُ بلا عائق ⟵ يُعرض.
    const pg2 = await patient("معاينتان");
    const eg2a = await sign(pg2); await waitJobs(pg2, 1);
    await q(`UPDATE physio_agent_jobs SET status = 'cancelled', error_code = 'cancelled_by_user', error = 'تنظيف', finished_at = now() WHERE patient_id = $1`, [pg2]);
    const eg2b = await sign(pg2); await waitJobs(pg2, 2);
    await q(`UPDATE physio_agent_jobs SET status = 'cancelled', error_code = 'cancelled_by_user', error = 'تنظيف', finished_at = now() WHERE patient_id = $1 AND status IN ('queued','running','needs_answers')`, [pg2]);
    const old2 = await call("GET", `/api/physio/exams/${eg2a}/opus-job`, S.spec);
    const new2 = await call("GET", `/api/physio/exams/${eg2b}/opus-job`, S.spec);
    const try2 = await call("POST", `/api/physio/exams/${eg2a}/opus-plan`, S.spec, {});
    same("N.2 **«اكتب» على معاينةٍ أقدم لا يُعرض وسببُه يُقال** — بالفحص نفسِه الذي يردّ به الخادم",
      [old2.json?.canRun, old2.json?.runBlocked?.code, try2.status, try2.json?.code, new2.json?.canRun, new2.json?.runBlocked], [false, "not_newest", 409, "not_newest", true, null]);

    //  الملخّصُ على صفّ المعاينة يحمل حالَ الخطّة — فلا يبقى «بانتظار الاعتماد» بعد الاعتماد عند مَن لا يقرأ الوظيفة.
    const pg3 = await patient("حال الخطة");
    const eg3 = await sign(pg3); await waitJobs(pg3, 1);
    resetModel();
    queues.writer.push(msg([tu("submit_plan", libFor())]));
    queues.reviewer.push(pass());
    await runAgentOnce({ skipReconcile: true });
    const sum3 = async () => ((await call("GET", `/api/medical/patients/${pg3}/exams`, S.spec)).json?.exams ?? []).find((e: any) => e.id === eg3)?.opusJob?.planStatus ?? null;
    const before3 = await sum3();
    const pl3 = await planOfJob(Number((await jobsOf(pg3))[0].id));
    await call("POST", `/api/physio/plans/${pl3.id}/approve`, S.admin, { fromProposal: true, acknowledgedIssueIds: [] });
    const blocked3 = await call("GET", `/api/physio/exams/${eg3}/opus-job`, S.spec);
    const st3 = ((await jobsOf(pg3))[0].stages ?? []) as { stage: string; noteAr?: string }[];
    same("N.3م **ملاحظاتُ المراحل على اللوح** — عددٌ بلا محتوى الخطّة", [st3.find((x) => x.stage === "gates")?.noteAr, st3.find((x) => x.stage === "review")?.noteAr],
      ["البوّاباتُ في الشيفرة: عدّلت أو حذفت قيمةً واحدة", "المراجع: لا ملاحظات"]);
    same("N.3 **ملخّصُ صفّ المعاينة يحمل حالَ خطّة Opus** (منتظرة ⟵ معتمَدة)، والمعتمَدةُ تمنع «اكتب» بسببها",
      [before3, await sum3(), blocked3.json?.runBlocked?.code], ["pending", "approved", "has_active_plan"]);

    //  طلبُ إلغاءٍ وصل ثمّ إطفاءٌ قبل النبضة ⟵ لا تبقى «بالدور» بطلب إلغاءٍ لا يأخذها أحد.
    const pg4 = await patient("الغاء ثم اطفاء");
    await sign(pg4); await waitJobs(pg4, 1);
    const jg4 = (await jobsOf(pg4))[0];
    await q(`UPDATE physio_agent_jobs SET cancel_requested = true, cancel_reason = 'gate_closed' WHERE id = $1`, [jg4.id]);
    await recoverStale();
    same("N.4 **المنتظرةُ بطلب إلغاء تُلغى عند النبضة** (لا تحبس المريض)", [(await jobsOf(pg4))[0].status, (await jobsOf(pg4))[0].error_code], ["cancelled", "gate_closed"]);
    //  ومسارُ الإطفاء نفسُه: إلغاءٌ مطلوب أثناء التشغيل ثمّ إطفاء ⟵ تُلغى، لا تعود للطابور.
    const pg4b = await patient("الغاء اثناء التشغيل");
    await sign(pg4b); await waitJobs(pg4b, 1);
    resetModel();
    queues.writer.push(async (c) => {
      const jid = Number((await jobsOf(pg4b))[0].id);
      await q(`UPDATE physio_agent_jobs SET cancel_requested = true, cancel_reason = 'cancelled_by_user' WHERE id = $1`, [jid]);
      setImmediate(() => releaseAllForTests());
      await new Promise((_r, rej) => c.signal.addEventListener("abort", () => rej(new Anthropic.APIUserAbortError())));
      return msg([]);
    });
    await runAgentOnce({ skipReconcile: true });
    same("N.4ب **إلغاءٌ مطلوب ثمّ إطفاءُ الخادم ⟵ «أُلغيت»** لا «بالدور»", [(await jobsOf(pg4b))[0].status, (await jobsOf(pg4b))[0].error_code], ["cancelled", "cancelled_by_user"]);

    //  رمزٌ لكلّ أخذ: تشغيلٌ قديم استُعيدت وظيفتُه وأخذها العاملُ نفسُه ثانيةً لا يكتب شيئاً.
    const pg5 = await patient("رمز لكل اخذ");
    await sign(pg5); await waitJobs(pg5, 1);
    const firstClaim = await claimOne("same-worker");
    await q(`UPDATE physio_agent_jobs SET heartbeat_at = now() - interval '6 minutes' WHERE id = $1`, [firstClaim!.id]);
    await recoverStale();
    const secondClaim = await claimOne("same-worker");
    resetModel();
    queues.writer.push(msg([tu("submit_plan", libFor())]));
    queues.reviewer.push(pass());
    await runClaimed(firstClaim!, "same-worker");
    const mid5 = (await jobsOf(pg5))[0];
    same("N.5 **الرمزُ لكلّ أخذ**: الأخذُ الثاني للعامل نفسِه برمزٍ آخر، والتشغيلُ القديم لا يكتب (صفرُ نداءٍ للنموذج)",
      [firstClaim?.lockedBy?.startsWith("same-worker:"), secondClaim?.id === firstClaim?.id, secondClaim?.lockedBy !== firstClaim?.lockedBy, mid5.status, mid5.locked_by === secondClaim?.lockedBy, calls.length],
      [true, true, true, "running", true, 0]);
    await runClaimed(secondClaim!, "same-worker");
    same("N.5ب والأخذُ الجديد يُكمل", (await jobsOf(pg5))[0].status, "succeeded");

    //  ما يعمل في هذه النسخة لا يُستعاد ولو تأخّر نبضُه (انقطاعُ القاعدة) — فلا يعمل عليه تشغيلان في العامل نفسِه.
    {
      const pi = await patient("لا يستعاد ما يعمل");
      await sign(pi); await waitJobs(pi, 1);
      setAgentTimingForTests({ heartbeatMs: 10_000_000, staleMs: 50, runCapMs: 60_000 });
      resetModel();
      let midStatus: string | null = null;
      queues.writer.push(async () => {
        await wait(150);
        await recoverStale();
        midStatus = (await jobsOf(pi))[0].status;
        return msg([tu("submit_plan", libFor())]);
      });
      queues.reviewer.push(pass());
      await runAgentOnce({ skipReconcile: true });
      setAgentTimingForTests(null);
      same("N.5ج **الاستعادةُ لا تأخذ ما يعمل في هذه النسخة** ولو قدُم نبضُه", [midStatus, (await jobsOf(pi))[0].status, (await jobsOf(pi))[0].failures], ["running", "succeeded", 0]);
    }

    //  المصالِحُ الدوريّ لا يجوع: مرشّحون تخطّاهم (خطّةٌ قائمة، فرعٌ مغلق) وهم أحدثُ توقيعاً لا يحجبون المعاينةَ القابلة ولو كان الحدُّ واحداً.
    {
      const insExam = async (pid: number, branch: number, minutesAgo: number) => Number((await q(`INSERT INTO medical_exams (patient_id, case_id, case_type, branch_id, doctor_id,
          doctor_name, diagnosis, prescription, assessment, signed_at)
        SELECT $1, pc.id, 'physiotherapy', $2, $3, 'أخصائيّ', 'د', '{}'::jsonb, $4::jsonb, now() - make_interval(mins => $5) FROM patient_cases pc
         WHERE pc.patient_id = $1 AND pc.case_type = 'physiotherapy' RETURNING id`, [pid, branch, SPEC, JSON.stringify(completeExamV2()), minutesAgo]))[0].id);
      const blockedExams: number[] = [];
      for (let i = 0; i < 4; i++) {
        const bp = await patient(`مصالح محجوب ${i}`);
        await q(`INSERT INTO physio_plans (patient_id, branch_id, title_ar, title_en, status, origin) VALUES ($1, $2, 'قائمة', 'active', 'approved', 'manual')`, [bp, B1]);
        blockedExams.push(await insExam(bp, B1, 10));
      }
      const cp = await patient("مصالح فرع مغلق", B3);
      const closedExam = await insExam(cp, B3, 20);
      const okp = await patient("مصالح قابل");
      await insExam(okp, B1, 30);
      await q(`DELETE FROM physio_agent_reconcile_skips`);
      const maxJobBefore = Number((await q(`SELECT COALESCE(max(id), 0) AS m FROM physio_agent_jobs`))[0].m);
      let scans = 0;
      for (; scans < 40 && (await jobsOf(okp)).length === 0; scans++) await reconcilerScan(1);
      same("N.6 **المصالِحُ الدوريّ لا يجوع**: ذو الخطّة القائمة خارجَ المرشّحين أصلاً، والمتخطّى يُذكَر (فرعٌ مغلق) فلا يعود، والقابلةُ تُوضع لها وظيفة",
        [(await jobsOf(okp)).length, (await jobsOf(okp))[0]?.trigger,
          (await q(`SELECT count(*) FROM physio_agent_reconcile_skips WHERE exam_id = ANY($1::int[])`, [blockedExams]))[0].count,
          (await q(`SELECT reason FROM physio_agent_reconcile_skips WHERE exam_id = $1`, [closedExam]))[0]?.reason, scans < 40],
        [1, "reconcile", "0", "branch_unavailable", true]);
      //  والمصالِحُ يعيد أيضاً ما ألغاه النظامُ لمرضى سبقوا (مراجعةُ Codex) — كلُّ ما وضعه هنا يُنظَّف فلا يأخذه العاملُ قبل ما بعده.
      await q(`UPDATE physio_agent_jobs SET status = 'cancelled', error_code = 'cancelled_by_user', cancel_reason = 'cancelled_by_user', error = 'تنظيف', finished_at = now()
        WHERE (patient_id = $1 OR id > $2) AND status IN ('queued','running','needs_answers')`, [okp, maxJobBefore]);
    }

    //  ما يحفظه النظامُ عن المريض ومَن معه خارجَ صفّه (رقمُ الجنسية واسمُ المرافق والكفيل) في مجموعة الهويّة.
    {
      const rp = await patient("هوية المرافق");
      await q(`INSERT INTO patient_refund_requests (patient_id, case_id, case_type, branch_id, amount, reason, detail, companion_name, national_id)
        VALUES ($1, 1, 'physiotherapy', $2, 1000, 'r', 'd', 'زينب كاظم جواد', '199812345678')`, [rp, B1]);
      const { patientIds } = await import("./physio_agent/context");
      const idsR = await patientIds(db, rp);
      const red = redactAuthoredText("رافقته زينب كاظم جواد ورقمُ هويّته 199812345678", idsR);
      await q(`DELETE FROM patient_refund_requests WHERE patient_id = $1`, [rp]);
      same("R.7 **رقمُ الجنسية واسمُ المرافق في مجموعة الهويّة** ويُنقّيان", [red.includes("زينب كاظم"), red.includes("199812345678"), findAuthoredLeaks("رقم 199812345678", idsR).length > 0],
        [false, false, true]);
    }

    //  القفلُ الاستشاريّ قبل صفّ المريض في السلّة — فلا جمودَ مع حفظ خطّة Opus (قفلٌ ثمّ `FOR KEY SHARE`).
    {
      const dp = await patient("ترتيب الاقفال");
      const holder = await pool.connect();
      await holder.query("BEGIN");
      await holder.query(`SELECT pg_advisory_xact_lock(hashtext('physio_agent_patient'), $1)`, [dp]);
      const trash = softDeletePatient({ patientId: dp, reason: "اختبار ترتيب الأقفال", actor: { userId: ADMIN, displayName: "admin", isAdmin: true, role: "admin", scope: null } as any }).catch((e) => e);
      await wait(300);
      const probe = await pool.connect();
      let rowFree = false;
      try { await probe.query("BEGIN"); await probe.query(`SELECT id FROM patients WHERE id = $1 FOR UPDATE NOWAIT`, [dp]); rowFree = true; } catch { rowFree = false; }
      finally { await probe.query("ROLLBACK"); probe.release(); }
      await holder.query("ROLLBACK"); holder.release();
      const tr = await trash;
      same("N.7 **السلّةُ تنتظر قفلَ الوكيل قبل أن تقفل صفَّ المريض** (الترتيبُ المعاكس جمودٌ مع حفظ الخطّة)",
        [rowFree, tr instanceof Error ? tr.message : "ok", Boolean((await q(`SELECT deleted_at FROM patients WHERE id = $1`, [dp]))[0].deleted_at)], [true, "ok", true]);
    }

    console.log("\n── د. القِدَم والحذف ──");
    const p24 = await patient("قديمة");
    const e24 = await sign(p24); await waitJobs(p24, 1);
    resetModel();
    queues.writer.push(msg([tu("submit_plan", libFor())]));
    queues.reviewer.push(pass());
    await runAgentOnce({ skipReconcile: true });
    const plan24 = await planOfJob(Number((await jobsOf(p24))[0].id));
    const revOk = await call("PATCH", `/api/medical/exams/${e24}`, S.spec, { caseType: "physiotherapy", notes: "تنقيح", diagnosis: "ألم أسفل الظهر المزمن", prescription: {},
      assessment: completeExamV2({ core: { painNow: 3 } }) });
    await wait(300);
    same("E.17 **تنقيحُ المعاينة ⟵ الخطّةُ قدُمت فلا تُعتمد، وتخرج من الشارة**", [revOk.status, (await q(`SELECT opus_stale_reason FROM physio_plans WHERE id = $1`, [plan24.id]))[0].opus_stale_reason,
      (await call("POST", `/api/physio/plans/${plan24.id}/approve`, S.sup, { fromProposal: true, acknowledgedIssueIds: [] })).json?.code,
      (await call("GET", `/api/physio/opus-plans?view=pending`, S.sup)).json?.rows?.some((r: any) => r.id === plan24.id)], [200, "exam_changed", "opus_plan_stale", false]);
    same("E.17ج **والقِدَمُ يُكتب في التدقيق** بسببه", (await q(`SELECT new_values FROM audit_log WHERE entity_type = 'physio_plan' AND entity_id = $1 AND action = 'opus_stale'`, [plan24.id]))
      .map((r) => (typeof r.new_values === "string" ? JSON.parse(r.new_values) : r.new_values)?.reason), ["exam_changed"]);
    same("E.17ب الحذفُ للمعتمِد وحده", [(await call("POST", `/api/physio/plans/${plan24.id}/opus-discard`, S.spec)).status, (await call("POST", `/api/physio/plans/${plan24.id}/opus-discard`, S.sup)).status],
      [403, 200]);

    const p25 = await patient("إلغاء المعاينة");
    const e25 = await sign(p25); await waitJobs(p25, 1);
    const cx = await call("POST", `/api/medical/exams/${e25}/cancel`, S.spec, { reason: "خطأ" });
    same("E.19c **إلغاءُ المعاينة يلغي وظيفتَها**", [cx.status, (await jobsOf(p25))[0].status, (await jobsOf(p25))[0].error_code], [200, "cancelled", "exam_cancelled"]);
    const p26 = await patient("سلّة");
    await sign(p26); await waitJobs(p26, 1);
    await softDeletePatient({ patientId: p26, reason: "ملفٌّ مكرّر للاختبار", actor: { userId: ADMIN, displayName: "م", role: "admin", isAdmin: true, scope: null } as any });
    same("E.19d والسلّةُ تلغيها", (await jobsOf(p26))[0].error_code, "patient_deleted");
    const src = await patient("مصدر"); const dst = await patient("هدف");
    await sign(src); await waitJobs(src, 1);
    const srcJob = (await jobsOf(src))[0];
    let mergeErr = "";
    try { await storage.mergePatients(src, dst); } catch (e: any) { mergeErr = String(e?.message ?? e); }
    same("E.19e/W.2 **الدمجُ يلغي الوظيفةَ ثمّ ينقلها إلى الهدف**", [mergeErr, (await q(`SELECT patient_id, status, error_code FROM physio_agent_jobs WHERE id = $1`, [srcJob.id]))[0]],
      ["", { patient_id: dst, status: "cancelled", error_code: "patient_merged" }]);

    const p27 = await patient("مغلق", B3);
    const e27 = Number((await q(`INSERT INTO medical_exams (patient_id, case_id, case_type, branch_id, doctor_id, doctor_name, diagnosis, prescription, assessment)
      SELECT $1, pc.id, 'physiotherapy', $2, $3, 'أخصائيّ', 'د', '{}'::jsonb, $4::jsonb FROM patient_cases pc WHERE pc.patient_id = $1 AND pc.case_type = 'physiotherapy' RETURNING id`,
      [p27, B3, SPEC, JSON.stringify(completeExamV2())]))[0].id);
    same("E.22b فرعٌ مغلقٌ مؤقتاً ⟵ ٤٠٩", (await call("POST", `/api/physio/exams/${e27}/opus-plan`, S.admin)).json?.code, "branch_unavailable");
    const lost = await patient("ضاع");
    const eLost = Number((await q(`INSERT INTO medical_exams (patient_id, case_id, case_type, branch_id, doctor_id, doctor_name, diagnosis, prescription, assessment)
      SELECT $1, pc.id, 'physiotherapy', $2, $3, 'أخصائيّ', 'د', '{}'::jsonb, $4::jsonb FROM patient_cases pc WHERE pc.patient_id = $1 AND pc.case_type = 'physiotherapy' RETURNING id`,
      [lost, B1, SPEC, JSON.stringify(completeExamV2())]))[0].id);
    await reconcilerScan();
    same("E.1b **المصالِحُ يضع ما ضاع** (معاينةٌ بلا نداء)", (await jobsOf(lost)).map((j) => [Number(j.exam_id), j.trigger]), [[eLost, "reconcile"]]);
    await reconcilerScan();
    same("E.1c ولا يكرّر", (await jobsOf(lost)).length, 1);

    console.log("\n── و. الحذفُ الكامل ──");
    let delErr = "";
    try { await storage.deletePatient(p23); } catch (e: any) { delErr = String(e?.message ?? e); }
    same("W.1 **حذفُ مريضٍ له وظيفةٌ وخطّةُ Opus وبروتوكولٌ مسوّدةٌ منها** — بلا عطب، والمسوّدةُ تبقى بلا رابط",
      [delErr, Number((await q(`SELECT count(*) FROM physio_agent_jobs WHERE patient_id = $1`, [p23]))[0].count),
        (await q(`SELECT source_plan_id FROM physio_protocols WHERE id = $1`, [ap23.json?.draftProtocolId])).map((r) => r.source_plan_id)], ["", 0, [null]]);
    let ppDup = "";
    try {
      const j = (await jobsOf(p1))[0];
      await q(`INSERT INTO physio_plans (patient_id, branch_id, title_ar, origin, agent_job_id) VALUES ($1, $2, 'x', 'opus', $3)`, [p1, B1, j.id]);
    } catch (e: any) { ppDup = String(e?.constraint ?? e?.message); }
    same("M.5 خطّةٌ واحدة لكلّ وظيفة", ppDup, "uq_pp_agent_job");

    //  مراجعةُ Codex: المصالِحُ لا يستبعد معاينةً لأنّ لها وظيفةً سابقة — الحكمُ للبصمة الحالية، وإلغاءُ النظام ليس «تشغيلاً»،
    //  والتنقيحُ أو قرارُ الاعتماد بعد التخطّي يُسقط التخطّي.
    {
      const r8 = await patient("مصالحة بعد تغيّر");
      const e8 = Number((await q(`INSERT INTO medical_exams (patient_id, case_id, case_type, branch_id, doctor_id, doctor_name, diagnosis, prescription, assessment, signed_at)
        SELECT $1, pc.id, 'physiotherapy', $2, $3, 'أخصائيّ', 'د', '{}'::jsonb, $4::jsonb, now() + interval '1 hour' FROM patient_cases pc
         WHERE pc.patient_id = $1 AND pc.case_type = 'physiotherapy' RETURNING id`, [r8, B1, SPEC, JSON.stringify(completeExamV2())]))[0].id);
      await reconcilerScan(1);
      same("N.8a وظيفةٌ أولى", (await jobsOf(r8)).length, 1);
      await q(`UPDATE physio_agent_jobs SET status = 'cancelled', cancel_reason = 'gate_closed', error_code = 'gate_closed', error = 'أُغلقت', finished_at = now() WHERE patient_id = $1`, [r8]);
      await reconcilerScan(1);
      same("N.8b **أُغلقت البوّابةُ ثمّ فُتحت ونداؤها ضاع ⟵ المصالِحُ يعيدها** (إلغاءُ النظام ليس تشغيلاً)",
        (await jobsOf(r8)).map((j) => j.status), ["cancelled", "queued"]);
      await q(`UPDATE physio_agent_jobs SET status = 'cancelled', cancel_reason = 'cancelled_by_user', error_code = 'cancelled_by_user', error = 'ألغاه', finished_at = now()
        WHERE patient_id = $1 AND status = 'queued'`, [r8]);
      await reconcilerScan(1);
      same("N.8c وإلغاءُ المستخدم يُحترم: لا وظيفةَ ثالثة، والتخطّي محفوظ",
        [(await jobsOf(r8)).length, (await q(`SELECT reason FROM physio_agent_reconcile_skips WHERE exam_id = $1`, [e8]))[0]?.reason], [2, "already_tried"]);
      await q(`UPDATE physio_agent_reconcile_skips SET skipped_at = now() - interval '10 minutes' WHERE exam_id = $1`, [e8]);
      {  //  تنقيحٌ ضاع نداؤه: النصُّ يتغيّر بلا مرورٍ بالنقطة (المحفّزُ الختميّ معطَّلٌ لهذه المعاملة وحدها).
        const c = await pool.connect();
        try { await c.query("BEGIN"); await c.query("SET LOCAL session_replication_role = replica");
          await c.query(`UPDATE medical_exams SET diagnosis = 'د بعد التنقيح' WHERE id = $1`, [e8]); await c.query("COMMIT"); }
        catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
      }
      await q(`INSERT INTO medical_exam_revisions (exam_id, version, diagnosis, edited_at) VALUES ($1, 1, 'د', now() - interval '5 minutes')`, [e8]);
      await reconcilerScan(1);
      same("N.8d **نُقّحت المعاينةُ ونداؤها ضاع ⟵ التخطّي يسقط والبصمةُ الجديدة تُكتب**",
        (await jobsOf(r8)).map((j) => j.status), ["cancelled", "cancelled", "queued"]);
      await q(`UPDATE physio_agent_jobs SET status = 'cancelled', cancel_reason = 'cancelled_by_user', error_code = 'cancelled_by_user', error = 'ألغاه', finished_at = now()
        WHERE patient_id = $1 AND status = 'queued'`, [r8]);
      await reconcilerScan(1);
      const skipBefore = (await q(`SELECT reason FROM physio_agent_reconcile_skips WHERE exam_id = $1`, [e8]))[0]?.reason;
      //  التنقيحُ (N.8d، قبل خمس دقائق) أقدمُ من التخطّي هنا — فالطلبُ وحده ما يُسقطه.
      await q(`UPDATE physio_agent_reconcile_skips SET skipped_at = now() - interval '1 minute' WHERE exam_id = $1`, [e8]);
      await q(`INSERT INTO physio_exam_red_flag_reviews (exam_id, patient_id, branch_id, flags, status, examiner_note, requested_at) VALUES ($1, $2, $3, '[]'::jsonb, 'pending', 'ملاحظة', now())`, [e8, r8, B1]);
      await reconcilerScan(1);
      same("N.8e **طلبُ اعتمادٍ أو قرارٌ بعد التخطّي يُسقطه** فيُعاد الحكم (هنا: البوّابةُ أُغلقت بالطلب المعلَّق)",
        [skipBefore, (await q(`SELECT reason FROM physio_agent_reconcile_skips WHERE exam_id = $1`, [e8]))[0]?.reason], ["already_tried", "gate_closed"]);
    }
  } catch (e) {
    failures++;
    console.error("❌ FAIL  استثناءٌ في الاختبار:", e);
  } finally {
    setPipelineHookForTests(null);
    httpServer.close();
    await cleanup();
  }
  console.log(`\n${failures === 0 ? "✅ كلُّ التأكيدات نجحت" : `❌ ${failures} تأكيداً سقط`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

// ══ مساعداتُ الخطط خارج المكتبة ══
function exRow(id: number) { return { exercise_id: id, proposed_key: null, sets: 2, reps: 10, hold_seconds: null, rest_seconds: null, dose_note_ar: null, dose_note_en: null, why_en: null }; }
function phase(exercises: any[]) {
  return { name_ar: "المرحلة", name_en: "Phase", session_from: 1, session_to: 12, goals_ar: "أهداف", goals_en: null, progress_criteria_ar: null, progress_criteria_en: null,
    education_ar: null, education_en: null, exercises };
}
function card(over: Record<string, unknown> = {}) {
  return { key: "new1", name_ar: "تمرين جديد", name_en: "New exercise", kind: "strength", region: "lumbar", purpose_en: "x", steps_ar: "خطوات", steps_en: "steps",
    stop_if_ar: null, stop_if_en: null, sets: 2, reps: 10, hold_seconds: null, source_url: GUIDE, ...over };
}
function lp(over: Record<string, unknown> = {}) {
  return { title_ar: "بروتوكول جديد", title_en: "New protocol", category: "spine", age_group: "adult", summary_ar: "ملخّص عامّ", summary_en: null, indications_en: null,
    contraindications_ar: null, contraindications_en: null, goals_ar: null, goals_en: null, ...over };
}
function oolPlan(over: Record<string, unknown> = {}) {
  return {
    mode: "out_of_library", protocol_id: null, track: null, starting_phase: 1, dose: { total_sessions: 12, sessions_per_week: 3, session_minutes: 45, why_en: null },
    phase_notes: [], phases: [phase([exRow(1)])], devices: [{ device_code: "electro", use: "core", minutes: 15, every_days: null, times: null, btl_model_id: null, program: null,
      fallback: [], evidence: "optional", reason_ar: "س", reason_en: "w" }], removed_devices: [], exercise_changes: [], proposed_cards: [], library_protocol: lp(),
    precautions_ar: null, precautions_en: null, stop_rules_ar: null, stop_rules_en: null, home_program_ar: null, home_program_en: null, measures: [],
    goals_ar: null, goals_en: null, rationale_ar: "لأنّ", rationale_en: null, alternatives: [], assumptions: [],
    sources: [{ title: "g", url: GUIDE, org: null, year: null, used_for: null }], ...over,
  };
}

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_sub_source = $1`, [MARK])).map((r) => Number(r.id));
  await q(`DELETE FROM physio_agent_jobs WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM physio_exam_red_flag_reviews WHERE patient_id = ANY($1::int[])`, [pts]);
  for (const id of pts) { try { await storage.deletePatient(id); } catch (e) { console.error("cleanup delete", id, (e as Error).message); } }
  const protos = (await q(`SELECT id FROM physio_protocols WHERE code = 'TEST-OPUS-LIB' OR origin = 'opus'`)).map((r) => Number(r.id));
  await q(`DELETE FROM physio_protocols WHERE id = ANY($1::int[])`, [protos]);
  await q(`DELETE FROM physio_exercises WHERE code LIKE 'TEST-OPUS-%' OR code LIKE 'opus-%'`);
  await q(`DELETE FROM physio_device_branches WHERE branch_id = ANY($1::int[])`, [[B1, B3]]);
  await q(`DELETE FROM staff_notification_outbox WHERE event_type LIKE 'physio_%' AND (exclude_user_id = ANY($1::int[]) OR target_user_ids && $1::int[] OR target_user_ids IS NULL)`, [IDS]);
  await q(`DELETE FROM staff_notification_prefs WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[]) OR branch_id = ANY($2::int[])`, [IDS, [B1, B3]]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = ANY($1::int[])`, [[B1, B3]]);
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch { /* */ }
  process.exit(1);
});
