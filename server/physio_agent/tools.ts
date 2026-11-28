// **أدواتُ Opus** (§4.ha، الفقرة ٦) — كلُّها قراءةٌ على الخادم بلا أثر، وبترتيبٍ ثابتٍ لكلّ دور طوالَ المحادثة (تغييرُ `tools` يُبطل التخزين).
// وأدواتُ الإنهاء (submit_plan · ask_questions · decline_plan · report_new_finding · submit_review · submit_audit) تُعالَج في `pipeline.ts`.
// ونتيجةُ كلّ أداةٍ ≤ ٦٠ ألف حرف، **ولا تُرجع مسوّداتِ Opus غيرَ المعتمَدة**.
import type Anthropic from "@anthropic-ai/sdk";
import { sql } from "drizzle-orm";
import { db } from "../db";
import {
  ASK_QUESTIONS_SCHEMA, DECLINE_SCHEMA, GET_EXERCISES_SCHEMA, GET_PROTOCOL_SCHEMA, NEW_FINDING_SCHEMA, SEARCH_EXERCISES_SCHEMA, STRICT_TOOLS,
  SUBMIT_AUDIT_SCHEMA, SUBMIT_PLAN_SCHEMA, SUBMIT_REVIEW_SCHEMA, protocolSessionCeiling,
} from "@shared/physio_agent";
import type { AgentRole } from "./model";

const RESULT_MAX = 60_000;
const rows = (r: any): Record<string, any>[] => (r?.rows ?? []) as Record<string, any>[];

const tool = (name: string, description: string, input_schema: Record<string, unknown>): Anthropic.Tool =>
  ({ name, description, input_schema: input_schema as Anthropic.Tool.InputSchema, ...(STRICT_TOOLS ? { strict: true } : {}) });

const GET_PROTOCOL = tool("get_protocol", "Read one library protocol in full: phases with their exercises and doses, every device line (evidence grade, centreUse core/adjunct/not_used, minutes, schedule, written settings), measures, contraindications, precautions, total sessions and the ceiling that already includes the written extension. Only protocols in the library index can be read.", GET_PROTOCOL_SCHEMA);
const SEARCH_EXERCISES = tool("search_exercises", "Search the centre's exercise card library by words (English or Arabic), optionally by region and kind. Returns card ids, names, kind, region, status (approved/draft) and default dose. Use approved cards for substitutions.", SEARCH_EXERCISES_SCHEMA);
const GET_EXERCISES = tool("get_exercises", "Read exercise cards in full by id (steps, cues, stop-if, equipment, default dose, home suitability).", GET_EXERCISES_SCHEMA);
const ASK_QUESTIONS = tool("ask_questions", "Ask the examiner 1–5 clarifying questions (Arabic text_ar) before writing. affects=exam_field when the answer is a fact the examination form records. Finishing tool: call it alone.", ASK_QUESTIONS_SCHEMA);
const DECLINE = tool("decline_plan", "State that no plan should be written now (e.g. urgent referral, imaging first), with the reason and the recommended action. Finishing tool: call it alone.", DECLINE_SCHEMA);
const NEW_FINDING = tool("report_new_finding", "Report a red flag or contraindication that the examination did not record (found in an answer, the exam text or a source). Finishing tool: call it alone.", NEW_FINDING_SCHEMA);
const SUBMIT_PLAN = tool("submit_plan", "Submit the complete plan. Deterministic gates run on it, then an independent reviewer. The result is either {\"status\":\"accepted\"} or {\"status\":\"revise\", …issues} — fix every issue and submit again. Finishing tool: call it alone.", SUBMIT_PLAN_SCHEMA);
const SUBMIT_REVIEW = tool("submit_review", "Submit your review: verdict pass|revise, an Arabic summary and every issue with severity. Finishing tool: call it alone.", SUBMIT_REVIEW_SCHEMA);
const SUBMIT_AUDIT = tool("submit_audit", "Submit your audit: verdict pass|concerns, an Arabic summary, issues and every source you checked. Finishing tool: call it alone.", SUBMIT_AUDIT_SCHEMA);

//  `allowed_callers: ["direct"]`: كلُّ بحثٍ وفتحٍ كتلةٌ ظاهرة (`server_tool_use`) يفحصها الخادمُ للهويّة ويعدّ مصادرَها — لا استدعاءَ من شيفرةٍ
//  يمرّ خفيّاً (التصفيةُ الديناميكية في `_20260209` تجعله ممكناً افتراضاً). و١٢ ألفَ رمزٍ للصفحة: كلُّ ما يُفتح يبقى في المحادثة (نافذةُ المليون).
export const WEB_FETCH_MAX_CONTENT_TOKENS = 12_000;
const webSearch = (maxUses: number) => ({ type: "web_search_20260209", name: "web_search", max_uses: maxUses, allowed_callers: ["direct"] } as Anthropic.WebSearchTool20260209);
const webFetch = (maxUses: number) => ({ type: "web_fetch_20260209", name: "web_fetch", max_uses: maxUses, max_content_tokens: WEB_FETCH_MAX_CONTENT_TOKENS,
  allowed_callers: ["direct"] } as Anthropic.WebFetchTool20260209);

/** القائمةُ الثابتة لكلّ دور — نفسُ المصفوفة في كلّ طلبٍ من المحادثة. */
export const TOOLS: Record<AgentRole, Anthropic.ToolUnion[]> = {
  writer: [GET_PROTOCOL, SEARCH_EXERCISES, GET_EXERCISES, ASK_QUESTIONS, DECLINE, NEW_FINDING, SUBMIT_PLAN, webSearch(20), webFetch(25)],
  reviewer: [GET_PROTOCOL, SEARCH_EXERCISES, GET_EXERCISES, DECLINE, NEW_FINDING, SUBMIT_REVIEW, webSearch(15), webFetch(20)],
  auditor: [GET_PROTOCOL, SEARCH_EXERCISES, GET_EXERCISES, NEW_FINDING, SUBMIT_AUDIT, webSearch(20), webFetch(30)],
};
export const TERMINALS: Record<AgentRole, readonly string[]> = {
  writer: ["submit_plan", "ask_questions", "decline_plan", "report_new_finding"],
  reviewer: ["submit_review", "decline_plan", "report_new_finding"],
  auditor: ["submit_audit", "report_new_finding"],
};
export const READ_TOOLS = ["get_protocol", "search_exercises", "get_exercises"] as const;

const cap = (s: string) => (s.length > RESULT_MAX ? `${s.slice(0, RESULT_MAX)}\n…[truncated]` : s);
const exCols = sql`id, code, name_en, name_ar, kind, region, status, sets, reps, hold_seconds, rest_seconds, per_side, home_suitable`;

/** أداةُ قراءة — نتيجةٌ نصّية أو خطأ (`is_error`). */
export async function runReadTool(name: string, input: unknown, ex: any = db): Promise<{ content: string; isError: boolean }> {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, any>;
  if (name === "get_protocol") {
    const id = Number(o.protocol_id);
    const p = Number.isInteger(id) ? rows(await ex.execute(sql`SELECT * FROM physio_protocols WHERE id = ${id}`))[0] : null;
    if (!p || p.is_archived || (p.origin === "opus" && p.status !== "approved")) return { content: `No library protocol with id ${o.protocol_id}.`, isError: true };
    const devs = rows(await ex.execute(sql`SELECT l.*, d.code, d.name_en FROM physio_protocol_devices l JOIN devices d ON d.id = l.device_id
      WHERE l.protocol_id = ${id} ORDER BY l.display_order, l.id`));
    const phases = rows(await ex.execute(sql`SELECT * FROM physio_protocol_phases WHERE protocol_id = ${id} ORDER BY position`));
    const links = phases.length ? rows(await ex.execute(sql`SELECT l.*, e.name_en, e.code AS ex_code, e.status AS ex_status FROM physio_protocol_phase_exercises l
      JOIN physio_exercises e ON e.id = l.exercise_id WHERE l.phase_id IN (${sql.join(phases.map((x) => sql`${x.id}`), sql`, `)}) ORDER BY l.position, l.id`)) : [];
    const measures = rows(await ex.execute(sql`SELECT code, name_en, unit_en, min_value, max_value, higher_is_better FROM physio_protocol_measures WHERE protocol_id = ${id} ORDER BY display_order`));
    return { isError: false, content: cap(JSON.stringify({
      id: p.id, code: p.code, titleEn: p.title_en, titleAr: p.title_ar, status: p.status, category: p.category, ageGroup: p.age_group,
      totalSessions: p.total_sessions, ceiling: protocolSessionCeiling({ totalSessions: p.total_sessions, maxTotalSessions: p.max_total_sessions }),
      sessionsPerWeek: p.sessions_per_week, sessionMinutes: p.session_minutes,
      summaryEn: p.summary_en, goalsEn: p.goals_en, assessmentEn: p.assessment_en, exercisesEn: p.exercises_en,
      contraindicationsEn: p.contraindications_en, precautionsEn: p.precautions_en,
      devices: devs.map((l) => ({ deviceCode: l.code, nameEn: l.name_en, evidence: l.evidence, centreUse: l.centre_use, minutes: l.minutes,
        everyDays: l.every_days, times: l.times, settings: l.params ?? {}, parametersEn: l.parameters_en, noteEn: l.note_en })),
      phases: phases.map((ph) => ({ phase: ph.position, nameEn: ph.name_en, sessionFrom: ph.session_from, sessionTo: ph.session_to,
        goalsEn: ph.goals_en, progressCriteriaEn: ph.progress_criteria_en, educationEn: ph.education_en,
        exercises: links.filter((l) => Number(l.phase_id) === Number(ph.id)).map((l) => ({ exerciseId: l.exercise_id, code: l.ex_code, nameEn: l.name_en,
          status: l.ex_status, sets: l.sets, reps: l.reps, holdSeconds: l.hold_seconds, restSeconds: l.rest_seconds, doseNoteEn: l.dose_note_en })) })),
      measures: measures.map((m) => ({ code: m.code, nameEn: m.name_en, unit: m.unit_en, min: Number(m.min_value), max: Number(m.max_value), higherIsBetter: m.higher_is_better })),
    })) };
  }
  if (name === "search_exercises") {
    const q = String(o.query ?? "").trim().slice(0, 200);
    const limit = Math.min(30, Math.max(1, Number(o.limit) || 15));
    const words = q.split(/\s+/).filter((w) => w.length >= 2).slice(0, 6);
    const conds = [sql`NOT is_archived`];
    if (typeof o.region === "string" && o.region) conds.push(sql`region = ${o.region}`);
    if (typeof o.kind === "string" && o.kind) conds.push(sql`kind = ${o.kind}`);
    if (words.length) conds.push(sql`(${sql.join(words.map((w) => sql`(name_en ILIKE ${`%${w}%`} OR name_ar ILIKE ${`%${w}%`} OR code ILIKE ${`%${w}%`} OR purpose_en ILIKE ${`%${w}%`})`), sql` OR `)})`);
    const r = rows(await ex.execute(sql`SELECT ${exCols} FROM physio_exercises WHERE ${sql.join(conds, sql` AND `)} ORDER BY (status = 'approved') DESC, id LIMIT ${limit}`));
    return { isError: false, content: cap(JSON.stringify({ results: r })) };
  }
  if (name === "get_exercises") {
    const ids = (Array.isArray(o.ids) ? o.ids : []).map(Number).filter((n: number) => Number.isInteger(n) && n > 0).slice(0, 30);
    if (!ids.length) return { content: "ids is empty.", isError: true };
    const r = rows(await ex.execute(sql`SELECT ${exCols}, purpose_en, start_position_en, steps_en, cues_en, easier_en, harder_en, stop_if_en, equipment_en, dose_note_en
      FROM physio_exercises WHERE NOT is_archived AND id IN (${sql.join(ids.map((i: number) => sql`${i}`), sql`, `)})`));
    return { isError: false, content: cap(JSON.stringify({ cards: r })) };
  }
  return { content: `Unknown tool ${name}.`, isError: true };
}
