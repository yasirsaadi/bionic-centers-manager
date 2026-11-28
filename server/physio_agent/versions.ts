// **نسخُ خطّة Opus** (ترحيل ٢٠٠، §4.hb — قرارا المالك ٥ و٦): الاعتمادُ يكتب النسخةَ ١، وكلُّ تعديلٍ مباشر أو تعديلٍ من Opus يُحفظ نسخةً جديدة.
//
//  • **الطريقُ الوحيد لكتابة نسخة** `writeVersionTx` (خاصّة) — بإثبات البوّابات (`GateProof`: السياسةُ وبصمةُ اللقطة نفسِها)، ثمّ **الصفوفُ الحيّة تُكتب
//    من اللقطة** (`materializeTx`) بقائمة أعمدةٍ مغلقة لا تمسّ الحالةَ ولا المراجعةَ ولا الكاتبَ ولا الفرعَ ولا المنفّذين.
//  • **ترتيبُ الأقفال** (D13): قفلُ المريض الاستشاريّ ⟵ صفُّ الخطّة ⟵ صفُّ الوظيفة — في كلّ معاملةٍ تمسّ خطّةَ Opus ووظيفتَها معاً.
//  • **يُلتزم ثمّ ٤٠٩** (D14): ما يجب حفظُه مع الردّ ٤٠٩ (اقتراحٌ صُحّح · قدُم) يُكتب ويُعاد نتيجةً `{ ok: false, code }` — لا كتابةَ ثمّ رميٌ في معاملةٍ واحدة.
//  • الممنوعُ لكلّ ما بعد الاعتماد (D10): مصفوفةُ أحدث معاينةٍ حيّة ∪ ما منعه المعتمِدون في **كلّ** اعتمادٍ حيّ للمريض ∪ ما منعه المعتمِدُ في النسخة النافذة.
import { createHash } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { logAudit } from "../accounting/ledger";
import { enqueueStaffEvent } from "../staff_telegram/outbox";
import { examAgentGate } from "../physio_exam_reviews/store";
import { readStoredAssessment } from "@shared/physio_initial_assessment";
import { forbiddenDevices, V2_DEVICE_NAMES } from "@shared/physio_exam_v2";
import { baghdadTodayYmd } from "@shared/visit_date";
import { isOpusAwaiting, JOB_ERROR_TEXTS, type Issue } from "@shared/physio_agent";
import type { GatedPlan, GateProtocol } from "@shared/physio_agent_gates";
import {
  BACKFILL_DIVERGENT_REASON, VERSION_HOW_LABELS, applyPlanEdit, canonicalJson, clone, composePlanColumns, diffSnapshots, diffSummaryAr, EMPTY_PROTOCOL_TEXTS,
  parsePlanEdit, sameContent, snapshotHash, versionLabel, type PlanSnapshot, type SnapCard, type SnapForbidden, type SnapLookups, type SnapSource, type VersionHow,
} from "@shared/physio_plan_versions";
import { applyEditGates, reasonOf, type EditGateContext, type EditGatePolicy, type EditGateResult } from "@shared/physio_plan_edit_gates";
import {
  approverConstraints, branchDeviceCodes, exerciseMap, fingerprintOf, knownDeviceCodes, loadExam, loadGateProtocol, newestV2ExamId, patientIds, type ExamRow,
} from "./context";
import { AgentJobError, cancelActiveJobsTx, enqueueReviseTx, jobOf, lockPatientAgent, notifyApproversTx, type Actor, type JobRecord } from "./store";
import { AgentStop } from "./model";

const rows = (r: any): Record<string, any>[] => (r?.rows ?? []) as Record<string, any>[];
import { normalizeParts, PART_LABELS, requiredParts } from "@shared/physio_plan_assignment";
export const sha256 = (t: string): string => createHash("sha256").update(t).digest("hex");
export const hashOf = (s: PlanSnapshot): string => snapshotHash(s, sha256);

export class VersionError extends Error {
  constructor(public status: number, message: string, public code: string, public extra: Record<string, unknown> = {}) { super(message); }
}
export type Refused = { ok: false; status: number; code: string; error: string; extra?: Record<string, unknown> };
const refused = (status: number, code: string, error: string, extra?: Record<string, unknown>): Refused => ({ ok: false, status, code, error, extra });

// ══ ما تحتاجه اللقطة من القاعدة ═══════════════════════════════════════════════════════════════════════
export async function deviceLabels(ex: any): Promise<Map<string, { nameAr: string; nameEn: string; id: number }>> {
  return new Map(rows(await ex.execute(sql`SELECT id, code, name_ar, name_en FROM devices`)).map((d) => [String(d.code),
    { id: Number(d.id), nameAr: String(d.name_ar || V2_DEVICE_NAMES[String(d.code)] || d.code), nameEn: String(d.name_en || d.code) }]));
}
/** **بطاقاتُ التمارين بنصّها الآن** — تُجمَّد في اللقطة (خطواتٌ و«توقّف إذا» وصورٌ ووقتُ آخر تعديل). */
export async function cardsFor(ex: any, ids: number[]): Promise<Map<number, { nameAr: string; nameEn: string; card: SnapCard }>> {
  const out = new Map<number, { nameAr: string; nameEn: string; card: SnapCard }>();
  const uniq = Array.from(new Set(ids.filter((n) => Number.isInteger(n) && n > 0)));
  if (!uniq.length) return out;
  for (const r of rows(await ex.execute(sql`SELECT id, name_ar, name_en, steps, steps_en, stop_if, stop_if_en, images, updated_at FROM physio_exercises
      WHERE id IN (${sql.join(uniq.map((i) => sql`${i}`), sql`, `)})`))) {
    out.set(Number(r.id), { nameAr: String(r.name_ar), nameEn: String(r.name_en), card: { steps: r.steps ?? null, stepsEn: r.steps_en ?? null,
      stopIf: r.stop_if ?? null, stopIfEn: r.stop_if_en ?? null, images: Array.isArray(r.images) ? r.images : [], updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null } });
  }
  return out;
}
const protocolTextsOf = (pr: Record<string, any> | null) => (pr ? {
  goals: pr.goals ?? null, goalsEn: pr.goals_en ?? null, exercises: pr.exercises ?? null, exercisesEn: pr.exercises_en ?? null,
  contraindications: pr.contraindications ?? null, contraindicationsEn: pr.contraindications_en ?? null, precautions: pr.precautions ?? null, precautionsEn: pr.precautions_en ?? null,
} : { ...EMPTY_PROTOCOL_TEXTS });

/** **الممنوعُ لهذا المريض بعد الاعتماد** (D10) — بلا معاينةٍ حيّة يبقى ما منعه المعتمِدون وحده (والبوّابةُ تمنع الحفظ على كلّ حال). */
export async function forbiddenForPatientTx(ex: any, patientId: number, exam: ExamRow | null, base: PlanSnapshot | null): Promise<SnapForbidden[]> {
  const labels = await deviceLabels(ex);
  const name = (c: string) => labels.get(c)?.nameAr ?? V2_DEVICE_NAMES[c] ?? c;
  const ids = await patientIds(ex, patientId);
  const out: SnapForbidden[] = [];
  if (exam) for (const f of forbiddenDevices(readStoredAssessment(exam.assessment), { today: baghdadTodayYmd() })) out.push({ deviceCode: f.deviceCode, nameAr: name(f.deviceCode), reasonAr: f.reasonAr, source: "exam" });
  for (const c of await approverConstraints(ex, patientId, exam?.id ?? -1, ids)) {
    for (const d of c.forbiddenDevices) out.push({ deviceCode: d, nameAr: name(d), reasonAr: `بقرار المعتمِد: ${c.note.slice(0, 200)}`, source: "approver" });
  }
  for (const f of base?.forbidden ?? []) {
    if (f.source === "approver" && !out.some((x) => x.deviceCode === f.deviceCode && x.source === "approver")) out.push(f);
  }
  return out;
}

async function basisOf(ex: any, patientId: number, exam: ExamRow | null, gateCode: string | null, branchId: number, protocolId: number | null) {
  const reviews = exam ? rows(await ex.execute(sql`SELECT id FROM physio_exam_red_flag_reviews WHERE exam_id = ${exam.id} AND status = 'approved' ORDER BY id`)).map((r) => Number(r.id)) : [];
  const constraints = rows(await ex.execute(sql`SELECT rv.id FROM physio_exam_red_flag_reviews rv WHERE rv.patient_id = ${patientId} AND rv.status = 'approved'
      AND jsonb_array_length(rv.forbidden_devices) > 0 AND NOT EXISTS (SELECT 1 FROM medical_exam_cancellations c WHERE c.exam_id = rv.exam_id) ORDER BY rv.id`)).map((r) => Number(r.id));
  const pr = protocolId ? rows(await ex.execute(sql`SELECT updated_at FROM physio_protocols WHERE id = ${protocolId}`))[0] : null;
  return { examId: exam?.id ?? null, examFingerprint: exam ? fingerprintOf(exam) : null, gateCode, redFlagReviewIds: reviews, approverConstraintReviewIds: constraints,
    branchId, protocolUpdatedAt: pr?.updated_at ? new Date(pr.updated_at).toISOString() : null };
}

/**
 * **اللقطةُ من خطّة Opus بعد البوّابات** (`GatedPlan`) — بطاقاتُ «خارج المكتبة» المقترحة بأرقامها إن أُنشئت (`cardIds`)، وإلّا بأرقامٍ مؤقّتة سالبة
 * (تُكتب الصفوفُ بلاها كما كانت حتى الاعتماد).
 */
export async function snapshotFromGatedTx(ex: any, gated: GatedPlan, p: { patientId: number; branchId: number; exam: ExamRow | null; forbidden: SnapForbidden[];
  cardIds?: Map<string, number> | null; draftProtocolId?: number | null; gateCode?: string | null; sources?: { fetchedInJob: number | null } }): Promise<PlanSnapshot> {
  const pr = gated.protocolId ? rows(await ex.execute(sql`SELECT * FROM physio_protocols WHERE id = ${gated.protocolId}`))[0] ?? null : null;
  const labels = await deviceLabels(ex);
  const keyId = (k: string | null) => {
    if (!k) return null;
    const real = p.cardIds?.get(k);
    if (real) return real;
    const i = gated.proposedCards.findIndex((c) => c.key === k);
    return i >= 0 ? -(i + 1) : null;
  };
  const exIds = gated.phases.flatMap((ph) => ph.exercises.map((x) => x.exerciseId ?? keyId(x.proposedKey) ?? 0));
  const cards = await cardsFor(ex, exIds);
  const proposed = (id: number) => { const c = gated.proposedCards[-id - 1]; return c ? { nameAr: c.nameAr, nameEn: c.nameEn,
    card: { steps: c.stepsAr, stepsEn: c.stepsEn, stopIf: c.stopIfAr, stopIfEn: c.stopIfEn, images: [], updatedAt: null } } : null; };
  return {
    schema: 1, mode: gated.mode, protocolId: gated.mode === "library" ? gated.protocolId : null, draftProtocolId: p.draftProtocolId ?? null,
    protocolCode: pr?.code ?? null,
    titleAr: (gated.libraryProtocol?.titleAr || pr?.title_ar || "خطّة Bionic AI").slice(0, 300), titleEn: (gated.libraryProtocol?.titleEn || pr?.title_en || "Bionic AI plan").slice(0, 300),
    track: gated.track, startingPhase: gated.startingPhase, totalSessions: gated.totalSessions, sessionsPerWeek: gated.sessionsPerWeek, sessionMinutes: gated.sessionMinutes,
    texts: { goalsAr: gated.goalsAr, goalsEn: gated.goalsEn, precautionsAr: gated.precautionsAr, precautionsEn: gated.precautionsEn, stopRulesAr: gated.stopRulesAr,
      stopRulesEn: gated.stopRulesEn, homeProgramAr: gated.homeProgramAr, homeProgramEn: gated.homeProgramEn, rationaleAr: gated.rationaleAr, rationaleEn: gated.rationaleEn },
    protocolTexts: protocolTextsOf(pr),
    forbidden: p.forbidden,
    devices: gated.devices.map((d) => ({ deviceCode: d.deviceCode, nameAr: labels.get(d.deviceCode)?.nameAr ?? d.deviceCode, nameEn: labels.get(d.deviceCode)?.nameEn ?? d.deviceCode,
      use: d.use, minutes: d.minutes, everyDays: d.everyDays, times: d.times, parameters: d.parameters, parametersEn: d.parametersEn, note: d.note, noteEn: d.noteEn,
      evidence: d.evidence, reasonAr: d.reasonAr, reasonEn: d.reasonEn, btl: d.btl, protocolParams: d.protocolParams })),
    phases: gated.phases.map((ph) => ({ position: ph.position, nameAr: ph.nameAr, nameEn: ph.nameEn, sessionFrom: ph.sessionFrom, sessionTo: ph.sessionTo,
      timeframe: ph.timeframe, timeframeEn: ph.timeframeEn, goals: ph.goals, goalsEn: ph.goalsEn, education: ph.education, educationEn: ph.educationEn,
      progressCriteria: ph.progressCriteria, progressCriteriaEn: ph.progressCriteriaEn, notes: ph.notes, notesEn: ph.notesEn,
      exercises: ph.exercises.flatMap((x) => {
        const id = x.exerciseId ?? keyId(x.proposedKey);
        if (id === null) return [];
        const c = id > 0 ? cards.get(id) ?? null : proposed(id);
        return [{ exerciseId: id, nameAr: c?.nameAr ?? `#${id}`, nameEn: c?.nameEn ?? `#${id}`, sets: x.sets, reps: x.reps, holdSeconds: x.holdSeconds,
          restSeconds: x.restSeconds, doseNote: x.doseNote, doseNoteEn: x.doseNoteEn, note: x.note, noteEn: x.noteEn, card: c?.card ?? null }];
      }) })),
    exerciseChanges: gated.exerciseChanges.map((c) => ({ kind: c.fromExerciseId !== null && c.toExerciseId !== null ? "substitute" : c.fromExerciseId !== null ? "remove" : "add",
      phase: c.phase, fromId: c.fromExerciseId, toId: c.toExerciseId, reasonAr: c.reasonAr, by: "opus" as const })),
    phaseNotes: gated.phaseNotes,
    measuresOwn: gated.mode === "out_of_library" && gated.measures.length > 0, measures: gated.measures,
    sources: gated.sources.map((s): SnapSource => ({ ...s, addedBy: "opus", fetchedInJob: p.sources?.fetchedInJob ?? null })),
    removed: gated.removed,
    basis: await basisOf(ex, p.patientId, p.exam, p.gateCode ?? null, p.branchId, gated.mode === "library" ? gated.protocolId : null),
  };
}

/** **اللقطةُ من الصفوف الحيّة** — لخطّةٍ اعتُمدت قبل نظام النسخ (§4.hb ١.٢). النصوصُ كما في الأعمدة، وسطرُ الممنوع يُعاد تركيبُه. */
export async function snapshotFromLiveRowsTx(ex: any, plan: Record<string, any>, forbidden: SnapForbidden[], gated: GatedPlan | null): Promise<PlanSnapshot> {
  const devs = rows(await ex.execute(sql`SELECT l.*, d.code, d.name_ar, d.name_en FROM physio_plan_devices l JOIN devices d ON d.id = l.device_id WHERE l.plan_id = ${plan.id} ORDER BY l.display_order, l.id`));
  const phases = rows(await ex.execute(sql`SELECT * FROM physio_plan_phases WHERE plan_id = ${plan.id} ORDER BY position`));
  const links = phases.length ? rows(await ex.execute(sql`SELECT * FROM physio_plan_phase_exercises WHERE phase_id IN (${sql.join(phases.map((x) => sql`${x.id}`), sql`, `)}) ORDER BY position, id`)) : [];
  const cards = await cardsFor(ex, links.map((l) => Number(l.exercise_id)));
  const measures = rows(await ex.execute(sql`SELECT * FROM physio_plan_measures WHERE plan_id = ${plan.id} ORDER BY display_order, id`));
  const pr = plan.protocol_id && !plan.out_of_library ? rows(await ex.execute(sql`SELECT code FROM physio_protocols WHERE id = ${plan.protocol_id}`))[0] : null;
  const strip = (t: string | null) => (t ? t.split("\n\n").filter((x) => !x.startsWith("الأجهزةُ الممنوعة لهذا المريض: ")).join("\n\n") || null : null);
  return {
    schema: 1, mode: plan.out_of_library ? "out_of_library" : "library", protocolId: plan.out_of_library ? null : plan.protocol_id ?? null,
    draftProtocolId: plan.out_of_library ? plan.protocol_id ?? null : null, protocolCode: pr?.code ?? null,
    titleAr: String(plan.title_ar), titleEn: String(plan.title_en ?? ""), track: gated?.track ?? null, startingPhase: gated?.startingPhase ?? 1,
    totalSessions: plan.total_sessions ?? null, sessionsPerWeek: plan.sessions_per_week ?? null, sessionMinutes: plan.session_minutes ?? null,
    texts: { goalsAr: plan.goals ?? null, goalsEn: plan.goals_en ?? null, precautionsAr: strip(plan.precautions), precautionsEn: plan.precautions_en ?? null,
      stopRulesAr: null, stopRulesEn: null, homeProgramAr: null, homeProgramEn: null, rationaleAr: plan.notes ?? null, rationaleEn: plan.notes_en ?? null },
    protocolTexts: { ...EMPTY_PROTOCOL_TEXTS, exercises: plan.exercises ?? null, exercisesEn: plan.exercises_en ?? null },
    forbidden,
    devices: devs.map((l) => ({ deviceCode: String(l.code), nameAr: String(l.name_ar || l.code), nameEn: String(l.name_en || l.code), use: l.centre_use === "adjunct" ? "adjunct" : "core",
      minutes: l.minutes ?? null, everyDays: l.every_days ?? null, times: l.times ?? null, parameters: l.parameters ?? null, parametersEn: l.parameters_en ?? null,
      note: l.note ?? null, noteEn: l.note_en ?? null, evidence: gated?.devices.find((d) => d.deviceCode === String(l.code))?.evidence ?? null,
      reasonAr: gated?.devices.find((d) => d.deviceCode === String(l.code))?.reasonAr ?? "", reasonEn: gated?.devices.find((d) => d.deviceCode === String(l.code))?.reasonEn ?? "",
      btl: l.btl ?? null, protocolParams: gated?.devices.find((d) => d.deviceCode === String(l.code))?.protocolParams ?? {} })),
    phases: phases.map((ph) => ({ position: Number(ph.position), nameAr: ph.name_ar, nameEn: ph.name_en ?? "", sessionFrom: ph.session_from ?? null, sessionTo: ph.session_to ?? null,
      timeframe: ph.timeframe ?? null, timeframeEn: ph.timeframe_en ?? null, goals: ph.goals ?? null, goalsEn: ph.goals_en ?? null, education: ph.education ?? null,
      educationEn: ph.education_en ?? null, progressCriteria: ph.progress_criteria ?? null, progressCriteriaEn: ph.progress_criteria_en ?? null, notes: ph.notes ?? null, notesEn: ph.notes_en ?? null,
      exercises: links.filter((l) => Number(l.phase_id) === Number(ph.id)).map((l) => { const c = cards.get(Number(l.exercise_id));
        return { exerciseId: Number(l.exercise_id), nameAr: c?.nameAr ?? `#${l.exercise_id}`, nameEn: c?.nameEn ?? `#${l.exercise_id}`, sets: l.sets ?? null, reps: l.reps ?? null,
          holdSeconds: l.hold_seconds ?? null, restSeconds: l.rest_seconds ?? null, doseNote: l.dose_note ?? null, doseNoteEn: l.dose_note_en ?? null, note: l.note ?? null,
          noteEn: l.note_en ?? null, card: c?.card ?? null }; }) })),
    exerciseChanges: (gated?.exerciseChanges ?? []).map((c) => ({ kind: c.fromExerciseId !== null && c.toExerciseId !== null ? "substitute" : c.fromExerciseId !== null ? "remove" : "add",
      phase: c.phase, fromId: c.fromExerciseId, toId: c.toExerciseId, reasonAr: c.reasonAr, by: "opus" as const })),
    phaseNotes: gated?.phaseNotes ?? [],
    measuresOwn: Boolean(plan.measures_own),
    measures: measures.map((m) => ({ code: String(m.code), nameAr: m.name_ar, nameEn: m.name_en, unitAr: m.unit_ar ?? null, unitEn: m.unit_en ?? null, min: Number(m.min_value),
      max: Number(m.max_value), higherIsBetter: Boolean(m.higher_is_better) })),
    sources: (Array.isArray(plan.sources) ? plan.sources : []).map((s: any): SnapSource => ({ title: String(s.title ?? ""), url: String(s.url ?? ""), org: s.org ?? null,
      year: s.year ?? null, usedFor: s.usedFor ?? null, addedBy: "opus", fetchedInJob: null })),
    removed: [],
    basis: { examId: plan.source_exam_id ?? null, examFingerprint: null, gateCode: null, redFlagReviewIds: [], approverConstraintReviewIds: [], branchId: Number(plan.branch_id), protocolUpdatedAt: null },
  };
}

/** **ما تكتبه اللقطةُ في الصفوف** بالشكل نفسِه — للمقارنة بالصفوف الحيّة (أتطابقت؟). */
function materialView(s: PlanSnapshot) {
  const c = composePlanColumns(s);
  return { c: { goals: c.goals, exercises: c.exercises, precautions: c.precautions, notes: c.notes, total: c.totalSessions, spw: c.sessionsPerWeek, min: c.sessionMinutes },
    d: s.devices.map((d) => [d.deviceCode, d.use, d.minutes, d.everyDays, d.times, d.btl ? { m: d.btl.modelId, p: d.btl.program, f: d.btl.fallback.map((f) => [f.key, f.value]) } : null]),
    p: s.phases.map((p) => [p.position, p.sessionFrom, p.sessionTo, p.exercises.filter((x) => x.exerciseId > 0).map((x) => [x.exerciseId, x.sets, x.reps, x.holdSeconds, x.restSeconds])]),
    m: s.measuresOwn ? s.measures.map((m) => [m.code, m.min, m.max]) : [] };
}

// ══ الصفوفُ من اللقطة ═══════════════════════════════════════════════════════════════════════════════
/** أجهزةُ الخطّة ومراحلُها وتمارينُها ومقاييسُها من اللقطة — والبطاقةُ المؤقّتة (سالبة) لا تُكتب. */
export async function writeChildRowsTx(tx: any, planId: number, s: PlanSnapshot): Promise<void> {
  const labels = await deviceLabels(tx);
  await tx.execute(sql`DELETE FROM physio_plan_devices WHERE plan_id = ${planId}`);
  for (const [i, d] of Array.from(s.devices.entries())) {
    const id = labels.get(d.deviceCode)?.id;
    if (!id) continue;
    await tx.execute(sql`INSERT INTO physio_plan_devices (plan_id, device_id, minutes, parameters, parameters_en, note, note_en, centre_use, every_days, times, btl, display_order)
      VALUES (${planId}, ${id}, ${d.minutes}, ${d.parameters}, ${d.parametersEn}, ${d.note}, ${d.noteEn}, ${d.use}, ${d.everyDays}, ${d.times},
        ${d.btl ? JSON.stringify(d.btl) : null}::jsonb, ${i})`);
  }
  await tx.execute(sql`DELETE FROM physio_plan_phases WHERE plan_id = ${planId}`);
  for (const ph of s.phases) {
    const r = rows(await tx.execute(sql`INSERT INTO physio_plan_phases (plan_id, position, name_ar, name_en, session_from, session_to, timeframe, timeframe_en,
        goals, goals_en, education, education_en, progress_criteria, progress_criteria_en, notes, notes_en)
      VALUES (${planId}, ${ph.position}, ${ph.nameAr}, ${ph.nameEn}, ${ph.sessionFrom}, ${ph.sessionTo}, ${ph.timeframe}, ${ph.timeframeEn}, ${ph.goals}, ${ph.goalsEn},
        ${ph.education}, ${ph.educationEn}, ${ph.progressCriteria}, ${ph.progressCriteriaEn}, ${ph.notes}, ${ph.notesEn}) RETURNING id`))[0];
    const seen = new Set<number>();
    for (const [j, x] of Array.from(ph.exercises.entries())) {
      if (x.exerciseId <= 0 || seen.has(x.exerciseId)) continue;
      seen.add(x.exerciseId);
      await tx.execute(sql`INSERT INTO physio_plan_phase_exercises (phase_id, exercise_id, position, sets, reps, hold_seconds, rest_seconds, dose_note, dose_note_en, note, note_en)
        VALUES (${r.id}, ${x.exerciseId}, ${j}, ${x.sets}, ${x.reps}, ${x.holdSeconds}, ${x.restSeconds}, ${x.doseNote}, ${x.doseNoteEn}, ${x.note}, ${x.noteEn})`);
    }
  }
  await tx.execute(sql`DELETE FROM physio_plan_measures WHERE plan_id = ${planId}`);
  if (s.measuresOwn) {
    for (const [i, m] of Array.from(s.measures.entries())) {
      await tx.execute(sql`INSERT INTO physio_plan_measures (plan_id, code, name_ar, name_en, unit_ar, unit_en, min_value, max_value, higher_is_better, display_order)
        VALUES (${planId}, ${m.code}, ${m.nameAr}, ${m.nameEn}, ${m.unitAr}, ${m.unitEn}, ${m.min}, ${m.max}, ${m.higherIsBetter}, ${i})`);
    }
  }
}

/** **الأعمدةُ الحيّة من اللقطة** — قائمةٌ مغلقة (§4.hb ٤.٤): لا الحالةُ ولا المراجعةُ ولا الكاتبُ ولا الفرعُ ولا المنفّذون، و`protocol_copied_at` وحده حين تنقل «أعِده إلى Opus» الخطّةَ إلى بروتوكولٍ آخر. */
async function materializeTx(tx: any, planId: number, s: PlanSnapshot, extra: { opusVersion?: number | null; actor: Actor; awaiting?: { agentJobId: number; protocolId: number | null } }) {
  const c = composePlanColumns(s);
  await tx.execute(sql`UPDATE physio_plans SET title_ar = ${c.titleAr}, title_en = ${c.titleEn}, goals = ${c.goals}, goals_en = ${c.goalsEn},
      exercises = ${c.exercises}, exercises_en = ${c.exercisesEn}, precautions = ${c.precautions}, precautions_en = ${c.precautionsEn},
      notes = ${c.notes}, notes_en = ${c.notesEn}, sessions_per_week = ${c.sessionsPerWeek}, duration_weeks = ${c.durationWeeks},
      session_minutes = ${c.sessionMinutes}, total_sessions = ${c.totalSessions}, out_of_library = ${c.outOfLibrary}, sources = ${JSON.stringify(c.sources)}::jsonb,
      measures_own = ${c.measuresOwn},
      ${extra.opusVersion !== undefined ? sql`opus_version = ${extra.opusVersion},` : sql``}
      ${extra.awaiting ? sql`protocol_copied_at = CASE WHEN protocol_id IS DISTINCT FROM ${extra.awaiting.protocolId} THEN now() ELSE protocol_copied_at END,
        protocol_id = ${extra.awaiting.protocolId}, submitted_at = now(), agent_job_id = ${extra.awaiting.agentJobId}, opus_stale_reason = NULL,` : sql``}
      updated_by = ${extra.actor.userId}, updated_by_name = ${extra.actor.name}, updated_at = now()
    WHERE id = ${planId}`);
  await writeChildRowsTx(tx, planId, s);
}
/** خطّةٌ منتظرة تُعاد كتابتُها من اقتراحٍ جديد (§4.hb ٣.٦ — «أعِده إلى Opus») — الحالةُ تبقى «بانتظار الاعتماد». */
export async function materializeAwaitingTx(tx: any, planId: number, s: PlanSnapshot, jobId: number): Promise<void> {
  await materializeTx(tx, planId, s, { actor: { userId: null, name: "Bionic AI" }, awaiting: { agentJobId: jobId, protocolId: s.protocolId } });
}

// ══ إثباتُ البوّابات وكتابةُ النسخة ════════════════════════════════════════════════════════════════════
declare const proofBrand: unique symbol;
/** يُصنع هنا وحده من نتيجة `applyEditGates` — ولا تُكتب نسخةٌ بلاه. */
export type GateProof = { readonly [proofBrand]: true; policy: EditGatePolicy | "backfill"; hash: string };
function proofOf(result: EditGateResult | { snapshot: PlanSnapshot }, policy: EditGatePolicy | "backfill"): GateProof {
  return { policy, hash: hashOf(result.snapshot) } as GateProof;
}
const HOW_POLICY: Record<VersionHow, (EditGatePolicy | "backfill")[]> = { approval: ["approval", "backfill"], direct_edit: ["direct_edit", "backfill"], opus_revision: ["accept"] };

async function writeVersionTx(tx: any, plan: Record<string, any>, s: PlanSnapshot, proof: GateProof, meta: {
  version: number; how: VersionHow; reason: string | null; approvalNote?: string | null; gateLog: unknown[]; jobId?: number | null; acks?: string[];
  backfilled?: boolean; actor: Actor; createdAt?: Date | string | null; diffSummaryAr?: string | null; materialize?: boolean;
}): Promise<number> {
  const hash = hashOf(s);
  if (proof.hash !== hash) throw new Error("gate proof does not match the snapshot");
  if (!HOW_POLICY[meta.how].includes(proof.policy) || (proof.policy === "backfill" && !meta.backfilled)) throw new Error("gate proof policy does not match the version");
  const r = rows(await tx.execute(sql`INSERT INTO physio_plan_versions (plan_id, patient_id, version, how, reason, approval_note, snapshot, snapshot_hash, gate_log,
      diff_summary_ar, job_id, acknowledged_issue_ids, backfilled, created_by, created_by_name, created_at)
    VALUES (${plan.id}, ${plan.patient_id}, ${meta.version}, ${meta.how}, ${meta.reason}, ${meta.approvalNote ?? null}, ${JSON.stringify(s)}::jsonb, ${hash},
      ${JSON.stringify(meta.gateLog)}::jsonb, ${meta.diffSummaryAr ?? null}, ${meta.jobId ?? null}, ${JSON.stringify(meta.acks ?? [])}::jsonb, ${meta.backfilled === true},
      ${meta.actor.userId}, ${meta.actor.name}, ${meta.createdAt ? new Date(meta.createdAt as any) : sql`now()`}) RETURNING id`))[0];
  if (meta.materialize !== false) await materializeTx(tx, Number(plan.id), s, { opusVersion: meta.version, actor: meta.actor });
  else await tx.execute(sql`UPDATE physio_plans SET opus_version = ${meta.version} WHERE id = ${plan.id}`);
  //  §4.hc — **أجزاءُ النسخة المطلوبة** تُكتب معها (`opus_parts`)؛ وجزءٌ أزالته يُسحب إسنادُه وبدائلُه، وجزءٌ أضافته «بانتظار الإسناد».
  const newParts = requiredParts(s);
  const oldParts = Array.isArray(plan.opus_parts) ? normalizeParts(plan.opus_parts) : null;
  await tx.execute(sql`UPDATE physio_plans SET opus_parts = ${sql`ARRAY[${sql.join(newParts.map((x) => sql`${x}`), sql`, `)}]::text[]`} WHERE id = ${plan.id}`);
  const added = await (await import("../physio_plans/assignment")).onVersionWrittenTx(tx, plan, newParts, meta.how === "approval" ? null : oldParts, meta.version, meta.actor);
  plan.opus_parts = newParts;
  plan.__addedParts = added;
  return Number(r.id);
}

// ══ السياقُ للبوّابات ═════════════════════════════════════════════════════════════════════════════════
export async function buildEditGateContext(ex: any, plan: Record<string, any>, base: PlanSnapshot | null, candidate: PlanSnapshot,
  opts: { fetched?: Set<string>; allowDraftIds?: Set<number>; examId?: number | null } = {}): Promise<{ ctx: EditGateContext; exam: ExamRow | null; protocol: GateProtocol | null;
    basis: PlanSnapshot["basis"] }> {
  const patientId = Number(plan.patient_id);
  const examId = opts.examId !== undefined ? opts.examId : await newestV2ExamId(ex, patientId);
  const exam = examId ? await loadExam(ex, examId) : null;
  const live = exam && !exam.cancelled ? exam : null;
  const gate = live ? await examAgentGate(live.id, ex) : null;
  const protocol = candidate.mode === "library" ? await loadGateProtocol(ex, candidate.protocolId) : null;
  const exIds = [...candidate.phases.flatMap((p) => p.exercises.map((x) => x.exerciseId)), ...(base?.phases.flatMap((p) => p.exercises.map((x) => x.exerciseId)) ?? []),
    ...(protocol?.phases.flatMap((p) => p.exercises.map((x) => x.exerciseId)) ?? [])];
  const exercises = await exerciseMap(ex, exIds);
  //  البطاقاتُ المؤقّتة («خارج المكتبة» قبل أن تُنشأ) مسموحٌ بها مسوّدات.
  for (const id of exIds) if (id < 0) exercises.set(id, { archived: false, status: "draft", kind: "strength", region: "whole_body" });
  const done = Number(rows(await ex.execute(sql`SELECT count(*)::int AS n FROM physio_plan_sessions WHERE plan_id = ${plan.id} AND cancelled_at IS NULL`))[0]?.n ?? 0);
  const forbidden = await forbiddenForPatientTx(ex, patientId, live, base);
  const allowDraftIds = new Set<number>([...Array.from(opts.allowDraftIds ?? []), ...exIds.filter((i) => i < 0)]);
  return {
    ctx: { agentGate: gate ? { allowed: gate.allowed, code: gate.code, reason: gate.reason } : null, forbidden, knownDeviceCodes: await knownDeviceCodes(ex),
      branchAvailable: await branchDeviceCodes(ex, Number(plan.branch_id)), protocol, exercises, fetchedUrls: opts.fetched ?? new Set(), sessionsDone: done, allowDraftIds,
      baseVersion: plan.opus_version ?? null },
    exam: live, protocol,
    basis: await basisOf(ex, patientId, live, gate?.code ?? null, Number(plan.branch_id), candidate.mode === "library" ? candidate.protocolId : null),
  };
}
/** المرشَّحُ بما يحسبه الخادم: الممنوعُ و`basis`، ونصوصُ البروتوكول الحاليّ في المكتبة. */
function serverDerived(c: PlanSnapshot, g: { ctx: EditGateContext; protocol: GateProtocol | null; basis: PlanSnapshot["basis"] }, protocolRow: Record<string, any> | null): PlanSnapshot {
  return { ...c, forbidden: g.ctx.forbidden.slice(), basis: g.basis, ...(c.mode === "library" && protocolRow ? { protocolTexts: protocolTextsOf(protocolRow), protocolCode: protocolRow.code ?? c.protocolCode } : {}) };
}
async function protocolRowOf(ex: any, s: PlanSnapshot) {
  return s.mode === "library" && s.protocolId ? rows(await ex.execute(sql`SELECT * FROM physio_protocols WHERE id = ${s.protocolId}`))[0] ?? null : null;
}
async function lookupsFor(ex: any, protocol: GateProtocol | null, ids: number[]): Promise<SnapLookups> {
  return { cards: await cardsFor(ex, ids), deviceLabels: await deviceLabels(ex), protocolLines: protocol ? new Map(protocol.devices.map((d) => [d.deviceCode, d])) : null };
}

// ══ النسخُ: القراءة ════════════════════════════════════════════════════════════════════════════════════
export interface VersionRow {
  id: number | null; version: number; how: VersionHow; reason: string | null; approvalNote: string | null; snapshot: PlanSnapshot; snapshotHash: string;
  gateLog: unknown[]; diffSummaryAr: string | null; jobId: number | null; createdByName: string | null; createdAt: string | null; backfilled: boolean; virtual?: boolean;
}
const versionOf = (r: Record<string, any>): VersionRow => ({ id: Number(r.id), version: Number(r.version), how: r.how, reason: r.reason ?? null, approvalNote: r.approval_note ?? null,
  snapshot: r.snapshot, snapshotHash: r.snapshot_hash, gateLog: r.gate_log ?? [], diffSummaryAr: r.diff_summary_ar ?? null, jobId: r.job_id == null ? null : Number(r.job_id),
  createdByName: r.created_by_name ?? null, createdAt: r.created_at ? new Date(r.created_at).toISOString() : null, backfilled: Boolean(r.backfilled) });

/** **النسخُ قبل نظام النسخ تُحسب ولا تُكتب** (§4.hb ١.٢): النسخةُ ١ ما اعتُمد (من اقتراح الوظيفة)، والثانيةُ ما في الصفوف إن اختلف. */
async function computeBackfill(ex: any, plan: Record<string, any>): Promise<VersionRow[]> {
  const job = plan.agent_job_id ? rows(await ex.execute(sql`SELECT * FROM physio_agent_jobs WHERE id = ${plan.agent_job_id}`))[0] : null;
  const gated = (job?.result?.final?.regated?.gated ?? job?.result?.final?.gated ?? null) as GatedPlan | null;
  const exam = plan.source_exam_id ? await loadExam(ex, Number(plan.source_exam_id)) : null;
  const forbidden = await forbiddenForPatientTx(ex, Number(plan.patient_id), exam && !exam.cancelled ? exam : null, null);
  const L = await snapshotFromLiveRowsTx(ex, plan, forbidden, gated);
  let G: PlanSnapshot | null = null;
  if (gated) {
    try {
      G = await snapshotFromGatedTx(ex, gated, { patientId: Number(plan.patient_id), branchId: Number(plan.branch_id), exam, forbidden,
        draftProtocolId: plan.out_of_library ? plan.protocol_id ?? null : null, cardIds: plan.out_of_library ? await draftCardIds(ex, Number(plan.id)) : null });
    } catch { G = null; }
  }
  const at = plan.decided_at ? new Date(plan.decided_at).toISOString() : null;
  const v1: VersionRow = { id: null, version: 1, how: "approval", reason: null, approvalNote: null, snapshot: G ?? L, snapshotHash: hashOf(G ?? L), gateLog: [], diffSummaryAr: null,
    jobId: job ? Number(job.id) : null, createdByName: plan.decided_by_name ?? null, createdAt: at, backfilled: true, virtual: true };
  if (!G || canonicalJson(materialView(G)) === canonicalJson(materialView(L))) return [v1];
  const d = diffSnapshots(G, L, [], "approver");
  return [v1, { id: null, version: 2, how: "direct_edit", reason: BACKFILL_DIVERGENT_REASON, approvalNote: null, snapshot: L, snapshotHash: hashOf(L), gateLog: [],
    diffSummaryAr: diffSummaryAr(d), jobId: null, createdByName: null, createdAt: plan.updated_at ? new Date(plan.updated_at).toISOString() : null, backfilled: true, virtual: true }];
}
async function draftCardIds(ex: any, planId: number): Promise<Map<string, number>> {
  const prefix = `opus-${planId}-`;
  return new Map(rows(await ex.execute(sql`SELECT id, code FROM physio_exercises WHERE code LIKE ${`${prefix}%`}`)).map((r) => [String(r.code).slice(prefix.length), Number(r.id)]));
}

export async function listVersions(ex: any, plan: Record<string, any>): Promise<{ versions: VersionRow[]; virtual: boolean }> {
  const r = rows(await ex.execute(sql`SELECT * FROM physio_plan_versions WHERE plan_id = ${plan.id} ORDER BY version`)).map(versionOf);
  if (r.length || plan.origin !== "opus" || isOpusAwaiting({ origin: plan.origin, status: plan.status })) return { versions: r, virtual: false };
  return { versions: await computeBackfill(ex, plan), virtual: true };
}
export async function currentVersionTx(ex: any, plan: Record<string, any>): Promise<VersionRow | null> {
  const { versions } = await listVersions(ex, plan);
  return versions.length ? versions[versions.length - 1] : null;
}

/** **النسخةُ ١ (وما بعدها) لخطّةٍ اعتُمدت قبل نظام النسخ** — تُكتب أوّلَ مرّةٍ يُكتب فيها شيءٌ بعد الاعتماد (المُستدعي يحمل قفلَ المريض وصفَّ الخطّة). */
export async function ensureVersionOneTx(tx: any, plan: Record<string, any>, actor: Actor): Promise<number | null> {
  if (plan.origin !== "opus" || isOpusAwaiting({ origin: plan.origin, status: plan.status })) return plan.opus_version ?? null;
  const have = rows(await tx.execute(sql`SELECT max(version) AS v FROM physio_plan_versions WHERE plan_id = ${plan.id}`))[0];
  if (have?.v != null) return Number(have.v);
  const computed = await computeBackfill(tx, plan);
  for (const v of computed) {
    //  سجلُّ البوّابات للعلم (لا يُفرض: النسخةُ تاريخٌ ما جرى).
    const g = await buildEditGateContext(tx, plan, null, v.snapshot);
    const report = applyEditGates(v.snapshot, g.ctx, "approval", null);
    await writeVersionTx(tx, plan, v.snapshot, proofOf({ snapshot: v.snapshot }, "backfill"), { version: v.version, how: v.how, reason: v.reason, gateLog: report.log,
      jobId: v.jobId, backfilled: true, actor: { userId: v.version === 1 ? plan.decided_by ?? null : null, name: v.version === 1 ? plan.decided_by_name ?? null : null },
      createdAt: v.createdAt, diffSummaryAr: v.diffSummaryAr, materialize: false });
  }
  const last = computed[computed.length - 1].version;
  //  §4.hc — أجزاءُ النسخة النافذة (إن لم يملأها ترحيلُ ٢٠١).
  if (!Array.isArray(plan.opus_parts)) {
    const parts = requiredParts(computed[computed.length - 1].snapshot);
    await tx.execute(sql`UPDATE physio_plans SET opus_parts = ${sql`ARRAY[${sql.join(parts.map((x) => sql`${x}`), sql`, `)}]::text[]`} WHERE id = ${plan.id}`);
    plan.opus_parts = parts;
  }
  await logAudit({ entityType: "physio_plan", entityId: Number(plan.id), action: computed.length > 1 ? "version_backfill_divergent" : "version_backfill",
    userId: actor.userId, userName: actor.name, branchId: plan.branch_id, newValues: { versions: computed.map((v) => ({ version: v.version, how: v.how, hash: v.snapshotHash })) },
    notes: computed.length > 1 ? `نسختان لخطّةٍ اعتُمدت قبل نظام النسخ: ${BACKFILL_DIVERGENT_REASON}` : "النسخةُ ١ لخطّةٍ اعتُمدت قبل نظام النسخ", tx });
  plan.opus_version = last;
  return last;
}

// ══ مَن يُنبَّه بنسخةٍ جديدة ════════════════════════════════════════════════════════════════════════════
async function approverIds(ex: any): Promise<number[]> {
  return rows(await ex.execute(sql`SELECT id FROM system_users WHERE COALESCE(is_active, true) AND (role = 'admin' OR COALESCE(can_supervise_physio, false))`)).map((r) => Number(r.id));
}
async function notifyVersionedTx(tx: any, plan: Record<string, any>, version: number, how: VersionHow, summary: string, actor: Actor): Promise<void> {
  const examiner = plan.source_exam_id ? rows(await tx.execute(sql`SELECT doctor_id FROM medical_exams WHERE id = ${plan.source_exam_id}`))[0]?.doctor_id ?? null : null;
  const assignees = rows(await tx.execute(sql`SELECT user_id FROM physio_plan_assignees WHERE plan_id = ${plan.id}`)).map((r) => Number(r.user_id));
  //  §4.hc — ومَن يحمل جزءاً اليوم: المُسنَدون والبدلاءُ المعتمَدون النافذون (هم مَن تصلهم لافتةُ النسخة وأوراقُها في المرحلة الخامسة).
  const holders = Object.values(await (await import("../physio_plans/assignment")).partHoldersOf(tx, Number(plan.id))).flat();
  const approvers = await approverIds(tx);
  const targets = Array.from(new Set([examiner, plan.created_by, ...assignees, ...holders, ...approvers].filter((x): x is number => x != null).map(Number)));
  const who = await patientLine(tx, plan);
  await enqueueStaffEvent(tx, { event: "physio_opus_plan_versioned", targetUserIds: targets, excludeUserId: actor.userId,
    text: `📝 عُدّلت خطّة العلاج الطبيعي: ${versionLabel(version)} (${VERSION_HOW_LABELS[how]}) — ${summary} — ${actor.name ?? ""}: ${who}`, linkPath: `/physio/plans/${plan.id}` });
  const added: string[] = Array.isArray(plan.__addedParts) ? plan.__addedParts : [];
  if (added.length) {
    await enqueueStaffEvent(tx, { event: "physio_opus_plan_versioned", targetUserIds: approvers, excludeUserId: actor.userId,
      text: `🧩 جزءٌ جديد بلا إسناد في ${versionLabel(version)}: ${added.map((p) => `«${PART_LABELS[p as keyof typeof PART_LABELS]}»`).join(" و")} — أسنِده: ${who}`,
      linkPath: `/physio/plans/${plan.id}?assign=1` });
  }
}
async function patientLine(ex: any, plan: Record<string, any>): Promise<string> {
  const r = rows(await ex.execute(sql`SELECT p.name, p.patient_code, b.name AS branch FROM patients p LEFT JOIN branches b ON b.id = ${plan.branch_id} WHERE p.id = ${plan.patient_id}`))[0];
  return `${r?.name ?? `#${plan.patient_id}`}${r?.patient_code ? ` (${r.patient_code})` : ""}${r?.branch ? ` — ${r.branch}` : ""}`;
}

// ══ قفلُ الخطّة بترتيب D13 ══════════════════════════════════════════════════════════════════════════════
async function lockPlanForOpus(tx: any, planId: number): Promise<Record<string, any>> {
  const p0 = rows(await tx.execute(sql`SELECT patient_id FROM physio_plans WHERE id = ${planId}`))[0];
  if (!p0) throw new VersionError(404, "الخطّة غير موجودة", "plan_not_found");
  await lockPatientAgent(tx, Number(p0.patient_id));
  const plan = rows(await tx.execute(sql`SELECT * FROM physio_plans WHERE id = ${planId} FOR UPDATE`))[0];
  if (!plan) throw new VersionError(404, "الخطّة غير موجودة", "plan_not_found");
  return plan;
}
/** **قبل إيقاف خطّة Opus أو تخرّجها أو حذفها** (D13): قفلُ المريض أوّلاً — لا يلتقي إغلاقٌ وحفظُ نسخةٍ على قفلين بترتيبين. */
export async function lockOpusPatientFirstTx(tx: any, planId: number): Promise<void> {
  const p0 = rows(await tx.execute(sql`SELECT patient_id, origin FROM physio_plans WHERE id = ${planId}`))[0];
  if (p0 && p0.origin === "opus") await lockPatientAgent(tx, Number(p0.patient_id));
}

/** **الاقتراحُ المنتظر يقدُم** (`stale`) — بسببه وسطرِ تدقيق. */
export async function markProposalsStaleTx(tx: any, p: { planId?: number; patientIds?: number[]; examId?: number | null; exceptExamId?: number | null;
  reason: string; actor: Actor }): Promise<number> {
  const base = p.planId ? sql`plan_id = ${p.planId}` : sql`patient_id IN (${sql.join((p.patientIds ?? [-1]).map((i) => sql`${i}`), sql`, `)})`;
  const cond = sql`${base} ${p.examId ? sql`AND exam_id = ${p.examId}` : sql``} ${p.exceptExamId ? sql`AND exam_id <> ${p.exceptExamId}` : sql``}`;
  const r = rows(await tx.execute(sql`UPDATE physio_agent_jobs SET proposal_status = 'stale', proposal_reason = ${p.reason}, updated_at = now()
     WHERE proposal_status = 'pending' AND ${cond} RETURNING id, branch_id`));
  for (const x of r) await logAudit({ entityType: "physio_agent_job", entityId: Number(x.id), action: "proposal_stale", userId: p.actor.userId, userName: p.actor.name,
    branchId: x.branch_id, newValues: { reason: p.reason }, notes: `قدُم اقتراحُ Bionic AI: ${JOB_ERROR_TEXTS[p.reason] ?? p.reason}`, tx });
  return r.length;
}
/** **خطّةٌ تُغلق** (إيقاف · تخرّج · حذف) — وظيفةُ «تعديل» عليها تُلغى، واقتراحُها المنتظر يقدُم. */
export async function onOpusPlanClosingTx(tx: any, planId: number, reason: "plan_closed" | "plan_deleted" | "plan_discarded", actor: Actor): Promise<void> {
  const j = rows(await tx.execute(sql`SELECT patient_id, exam_id FROM physio_agent_jobs WHERE plan_id = ${planId} AND kind = 'revise'
      AND status IN ('queued','running','needs_answers') LIMIT 1`))[0];
  if (j) await cancelActiveJobsTx(tx, { patientId: Number(j.patient_id), examId: Number(j.exam_id), reason, actor });
  await markProposalsStaleTx(tx, { planId, reason, actor });
  //  §4.hc — بدائلُ هذه الخطّة المنتظرة والمعتمَدةُ القائمة تُلغى «أُغلقت الخطّة».
  await (await import("../physio_plans/assignment")).lapseOnCloseTx(tx, planId, actor);
}

// ══ الاعتماد — النسخةُ ١ (§4.hb ٤.٥) ═════════════════════════════════════════════════════════════════
export const unresolvedMajorsOf = (result: Record<string, any>): Issue[] =>
  [...(result?.unresolved?.reviewer ?? []), ...(result?.unresolved?.auditor ?? [])].filter((i: Issue) => i.severity === "major");
/** **بصمةُ الاقتراح المعروض** — من المحفوظ وحده: الوظيفةُ والخطّةُ بعد البوّابات والاقتراحُ المصحَّح إن كان. */
export function proposalHashOf(jobId: number, result: Record<string, any>): string {
  return sha256(canonicalJson({ jobId, gated: result?.final?.gated ?? null, regated: result?.final?.regated?.snapshot ?? null }));
}

export type ApproveOk = { ok: true; after: Record<string, any>; draftProtocolId: number | null; version: number };
export async function approveOpusPlanVersioned(planId: number, body: any, actor: Actor, deps: {
  opusStaleness: (ex: any, plan: Record<string, any>) => Promise<string | null>;
  hasActivePlan: (ex: any, patientId: number) => Promise<boolean>;
  saveDraftProtocolTx: (tx: any, planId: number, result: Record<string, any>, actor: Actor) => Promise<{ protocolId: number; cardIds: Map<string, number> }>;
}): Promise<ApproveOk | Refused> {
  if (body?.fromProposal !== true) return refused(400, "opus_use_proposal_view", "تُعتمد خطّةُ Bionic AI من «الخطّة المقترحة» بعد قراءتها");
  return db.transaction(async (tx) => {
    const plan = await lockPlanForOpus(tx, planId);
    if (!isOpusAwaiting({ origin: plan.origin, status: plan.status })) return refused(409, "not_awaiting", "الخطّةُ ليست خطّةَ Bionic AI منتظرة");
    const running = rows(await tx.execute(sql`SELECT id FROM physio_agent_jobs WHERE plan_id = ${planId} AND kind = 'revise' AND status IN ('queued','running','needs_answers') LIMIT 1`))[0];
    if (running) return refused(409, "opus_revision_running", "يعيد Bionic AI كتابةَ الخطّة بملاحظتك الآن — انتظر حتى يُنهي أو ألغِ الطلب");
    const job = plan.agent_job_id ? rows(await tx.execute(sql`SELECT * FROM physio_agent_jobs WHERE id = ${plan.agent_job_id} FOR UPDATE`))[0] : null;
    const result = (job?.result ?? {}) as Record<string, any>;
    //  الاعتمادُ لما قرأه المعتمِد (D1): الوظيفةُ نفسُها وبصمةُ اقتراحها.
    if (!job || Number(body?.agentJobId) !== Number(job.id) || String(body?.proposalHash ?? "") !== proposalHashOf(Number(job.id), result)) {
      return refused(409, "proposal_changed", "تغيّر الاقتراحُ منذ فتحتَه — أُعيد تحميلُه، راجِعه ثمّ اعتمد");
    }
    const stale = await deps.opusStaleness(tx, plan);
    if (stale) return refused(409, "opus_plan_stale", `قدُمت الخطّة: ${JOB_ERROR_TEXTS[stale] ?? "حُظر في المعاينة الآن جهازٌ فيها"} — احذفها وأعد الكتابة`);
    if (await deps.hasActivePlan(tx, Number(plan.patient_id))) return refused(409, "patient_has_active_plan", "للمريض خطّةٌ معتمَدة قائمة — أوقفها أوّلاً");
    const majors = unresolvedMajorsOf(result);
    const acks = new Set<string>(Array.isArray(body?.acknowledgedIssueIds) ? body.acknowledgedIssueIds.map(String) : []);
    if (majors.some((m) => !acks.has(m.id))) return refused(400, "opus_ack_required", "أقرّ بكلّ ملاحظةٍ كبيرة لم تُحلّ قبل الاعتماد");
    const gated = result?.final?.gated as GatedPlan | undefined;
    if (!gated) return refused(409, "no_proposal", "لا اقتراحَ محفوظ لهذه الخطّة");
    const exam = plan.source_exam_id ? await loadExam(tx, Number(plan.source_exam_id)) : null;
    //  المرشَّح: الاقتراحُ المصحَّح إن كان، وإلّا اقتراحُ Opus — بالحال الآن (الممنوعُ ونصوصُ البروتوكول والبطاقات).
    let candidate: PlanSnapshot = result?.final?.regated?.snapshot
      ?? await snapshotFromGatedTx(tx, gated, { patientId: Number(plan.patient_id), branchId: Number(plan.branch_id), exam, forbidden: [], gateCode: null,
        sources: { fetchedInJob: Number(job.id) } });
    const g = await buildEditGateContext(tx, plan, null, candidate, { fetched: new Set((result.fetchedUrls ?? []) as string[]), examId: exam?.id ?? null });
    candidate = serverDerived(candidate, g, await protocolRowOf(tx, candidate));
    const res = applyEditGates(candidate, g.ctx, "approval", null);
    if (res.blocking.length) {
      await logAudit({ entityType: "physio_plan", entityId: planId, action: "approve_refused_gates", userId: actor.userId, userName: actor.name, branchId: plan.branch_id,
        newValues: { blocking: res.blocking.map((b) => b.code) }, notes: "رُدّ الاعتماد: بوّابةٌ تمنع الآن", ipAddress: actor.ip ?? null, userAgent: actor.userAgent ?? null, tx });
      return refused(409, "proposal_gates_blocking", `لا تُعتمد الآن: ${res.blocking.map((b) => b.reasonAr).join("؛ ")}`, { blocking: res.blocking });
    }
    if (res.changed) {
      //  D14 — الاقتراحُ المصحَّح يُحفظ ثمّ ٤٠٩: يراه المعتمِدُ بتصحيحاته ويعتمد ببصمته الجديدة.
      const regated = { snapshot: res.snapshot, gateLog: res.log, at: new Date().toISOString() };
      const next = { ...result, final: { ...result.final, regated: { ...regated, gated } } };
      await tx.execute(sql`UPDATE physio_agent_jobs SET result = ${JSON.stringify(next)}::jsonb, updated_at = now() WHERE id = ${job.id}`);
      await logAudit({ entityType: "physio_plan", entityId: planId, action: "proposal_regated", userId: actor.userId, userName: actor.name, branchId: plan.branch_id,
        newValues: { jobId: Number(job.id), changes: res.log.filter((e) => e.kind === "removed" || e.kind === "clamped").map((e) => ({ code: e.code, target: e.target })) },
        notes: "صحّحت البوّاباتُ الاقتراحَ عند الاعتماد (تغيّر البروتوكولُ أو الفرعُ أو الممنوع)", ipAddress: actor.ip ?? null, userAgent: actor.userAgent ?? null, tx });
      return refused(409, "proposal_changed", "تغيّر الاقتراحُ منذ فتحتَه: صحّحته البوّاباتُ بالحال الآن — راجِع التصحيحات ثمّ اعتمد",
        { proposalHash: proposalHashOf(Number(job.id), next), changes: res.log.filter((e) => e.kind === "removed" || e.kind === "clamped") });
    }
    let snapshot = res.snapshot;
    let draftProtocolId: number | null = null;
    let protocolId: number | null = plan.protocol_id ?? null;
    if (plan.out_of_library) {
      const r = await deps.saveDraftProtocolTx(tx, Number(plan.id), result, actor);
      draftProtocolId = r.protocolId; protocolId = r.protocolId;
      //  البطاقاتُ المؤقّتة ⟵ أرقامُ البطاقات المسوّدة التي أُنشئت الآن.
      const byTmp = new Map(gated.proposedCards.map((c, i) => [-(i + 1), r.cardIds.get(c.key) ?? null]));
      const remap = (id: number | null) => (id !== null && id < 0 ? byTmp.get(id) ?? id : id);
      snapshot = clone(snapshot);
      snapshot.draftProtocolId = draftProtocolId;
      for (const ph of snapshot.phases) for (const x of ph.exercises) x.exerciseId = remap(x.exerciseId)!;
      for (const c of snapshot.exerciseChanges) { c.fromId = remap(c.fromId); c.toId = remap(c.toId); }
      const cards = await cardsFor(tx, snapshot.phases.flatMap((p) => p.exercises.map((x) => x.exerciseId)));
      for (const ph of snapshot.phases) for (const x of ph.exercises) { const c = cards.get(x.exerciseId); if (c) x.card = c.card; }
    }
    const version = 1;
    await writeVersionTx(tx, plan, snapshot, proofOf({ snapshot }, "approval"), { version, how: "approval", reason: null, approvalNote: null, gateLog: res.log, jobId: Number(job.id),
      acks: Array.from(acks), actor });
    const after = rows(await tx.execute(sql`UPDATE physio_plans SET status = 'approved', protocol_id = ${protocolId}, decided_by = ${actor.userId},
        decided_by_name = ${actor.name}, decided_at = now(), return_note = NULL, review_status = 'reviewed', reviewed_by = ${actor.userId},
        reviewed_by_name = ${actor.name}, reviewed_at = now(), updated_at = now(), updated_by = ${actor.userId}, updated_by_name = ${actor.name}
      WHERE id = ${planId} RETURNING *`))[0];
    await logAudit({ entityType: "physio_plan", entityId: planId, action: "approve", userId: actor.userId, userName: actor.name, branchId: plan.branch_id,
      oldValues: { status: plan.status }, newValues: { status: "approved", origin: "opus", acknowledgedIssueIds: Array.from(acks), draftProtocolId, version, basis: snapshot.basis,
        snapshotHash: hashOf(snapshot) },
      notes: `اعتُمدت خطّةُ Bionic AI — ${versionLabel(1)}${draftProtocolId ? ` وحُفظت بروتوكولاً مسوّدة #${draftProtocolId}` : ""}`, ipAddress: actor.ip ?? null, userAgent: actor.userAgent ?? null, tx });
    if (plan.created_by) {
      await enqueueStaffEvent(tx, { event: "physio_plan_decided", targetUserIds: [Number(plan.created_by)], excludeUserId: actor.userId,
        text: `✅ اعتُمدت خطّة Bionic AI: ${plan.title_ar} — ${actor.name ?? ""}`, linkPath: `/physio/plans/${planId}` });
    }
    return { ok: true as const, after, draftProtocolId, version };
  });
}

// ══ التعديلُ المباشر (§4.hb ٤.٦) ══════════════════════════════════════════════════════════════════════
export interface EditPreview {
  baseVersion: number; snapshot: PlanSnapshot; gateLog: unknown[]; blocking: unknown[]; warnings: unknown[]; suggestedEdit: unknown; diff: unknown; diffSummaryAr: string;
  gateHash: string; noChange: boolean;
}
async function editCandidate(ex: any, plan: Record<string, any>, raw: any): Promise<{ base: VersionRow; preview: EditPreview } | Refused> {
  if (plan.origin !== "opus" || isOpusAwaiting({ origin: plan.origin, status: plan.status })) return refused(409, "plan_not_amendable", "تُعدَّل من هنا خطّةُ Bionic AI المعتمَدة وحدها");
  if (plan.status !== "approved") return refused(409, "plan_closed", "الخطّةُ منتهية — موقوفةٌ أو متخرّجة");
  const base = await currentVersionTx(ex, plan);
  if (!base) return refused(409, "no_version", "لا نسخةَ لهذه الخطّة");
  const baseVersion = Number(raw?.baseVersion);
  if (baseVersion !== base.version) return refused(409, "version_conflict", "عُدّلت الخطّةُ من غيرك — أُعيد تحميلُها", { currentVersion: base.version });
  const parsed = parsePlanEdit(raw?.edit);
  if (!parsed.ok) return refused(400, "edit_invalid", parsed.error);
  const protocol = base.snapshot.mode === "library" ? await loadGateProtocol(ex, base.snapshot.protocolId) : null;
  const ids = parsed.value.phases.flatMap((p) => p.exercises.map((x) => x.exerciseId));
  const candidate0 = applyPlanEdit(base.snapshot, parsed.value, await lookupsFor(ex, protocol, ids));
  const g = await buildEditGateContext(ex, plan, base.snapshot, candidate0);
  const candidate = serverDerived(candidate0, g, await protocolRowOf(ex, candidate0));
  const res = applyEditGates(candidate, g.ctx, "direct_edit", base.snapshot);
  const diff = diffSnapshots(base.snapshot, candidate, res.log, "approver");
  const noChange = sameContent(base.snapshot, candidate);
  return { base, preview: { baseVersion: base.version, snapshot: candidate, gateLog: res.log, blocking: res.blocking, warnings: res.warnings, suggestedEdit: res.suggestedEdit,
    diff, diffSummaryAr: diffSummaryAr(diff), gateHash: sha256(canonicalJson({ log: res.log, hash: hashOf(candidate) })), noChange } };
}

/** **معاينةُ التعديل** — قراءةٌ وحدها: لا كتابة ولا تدقيق ولا إشارةٌ حيّة. */
export async function previewOpusEdit(planId: number, body: any): Promise<{ ok: true; preview: EditPreview } | Refused> {
  const plan = rows(await db.execute(sql`SELECT * FROM physio_plans WHERE id = ${planId}`))[0];
  if (!plan) return refused(404, "plan_not_found", "الخطّة غير موجودة");
  const r = await editCandidate(db, plan, body);
  return "ok" in r ? r : { ok: true, preview: r.preview };
}

/** **حفظُ التعديل المباشر** — نسخةٌ ن+١ بسببٍ إلزاميّ، والبوّاباتُ في المعاملة، وبصمةُ المعاينة (`gateHash`) كما رآها المعتمِد. */
export async function saveOpusEdit(planId: number, body: any, actor: Actor): Promise<{ ok: true; version: number; plan: Record<string, any> } | Refused> {
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 3 || reason.length > 2000) return refused(400, "reason_required", "اكتب سببَ التعديل (ثلاثةُ أحرفٍ على الأقلّ)");
  return db.transaction(async (tx) => {
    const plan = await lockPlanForOpus(tx, planId);
    if (plan.origin === "opus" && plan.status === "approved") await ensureVersionOneTx(tx, plan, actor);
    const r = await editCandidate(tx, plan, body);
    if ("ok" in r) return r;
    const { base, preview } = r;
    if ((preview.blocking as unknown[]).length) return refused(409, "edit_gates_blocking", "لم يمرّ التعديلُ من البوّابات — راجِع الموانع وتصحيحاتها", { preview });
    if (String(body?.gateHash ?? "") !== preview.gateHash) return refused(409, "gates_changed", "تغيّر ما تقوله البوّاباتُ منذ المعاينة — راجِع المعاينةَ الجديدة ثمّ احفظ", { preview });
    if (preview.noChange) return refused(400, "no_change", "لم يتغيّر شيءٌ عن النسخة الحالية");
    const version = base.version + 1;
    await writeVersionTx(tx, plan, preview.snapshot, proofOf({ snapshot: preview.snapshot }, "direct_edit"), { version, how: "direct_edit", reason,
      gateLog: preview.gateLog, diffSummaryAr: preview.diffSummaryAr, actor });
    //  وظيفةُ «تعديل» على هذه الخطّة تقدُم (أساسُها تغيّر)، والاقتراحُ المنتظر كذلك.
    await cancelActiveAmendTx(tx, plan, actor);
    await markProposalsStaleTx(tx, { planId, reason: "edited_directly", actor });
    await logAudit({ entityType: "physio_plan", entityId: planId, action: "opus_version", userId: actor.userId, userName: actor.name, branchId: plan.branch_id,
      oldValues: { version: base.version, hash: base.snapshotHash }, newValues: { version, how: "direct_edit", reason, hash: hashOf(preview.snapshot), diff: preview.diffSummaryAr },
      notes: `${versionLabel(version)} — تعديلٌ مباشر: ${reason}`, ipAddress: actor.ip ?? null, userAgent: actor.userAgent ?? null, tx });
    await notifyVersionedTx(tx, plan, version, "direct_edit", preview.diffSummaryAr, actor);
    const after = rows(await tx.execute(sql`SELECT * FROM physio_plans WHERE id = ${planId}`))[0];
    return { ok: true as const, version, plan: after };
  });
}

/** **نسخةٌ جديدة حُفظت ⟵ طلبُ «تعديل» جارٍ على هذه الخطّة يُلغى** (`base_version_changed`) — أساسُه قدُم، فلا يشغل Opus ساعاتٍ لاقتراحٍ يُرفض عند الحفظ؛
 *  ويُقال لطالبه (`lostRequestNoticeTx`). في التعديل المباشر وحفظ اقتراح Opus معاً. */
async function cancelActiveAmendTx(tx: any, plan: Record<string, any>, actor: Actor): Promise<void> {
  const amend = rows(await tx.execute(sql`SELECT exam_id FROM physio_agent_jobs WHERE plan_id = ${plan.id} AND kind = 'revise' AND revise_scope = 'amend'
      AND status IN ('queued','running','needs_answers') FOR UPDATE`))[0];
  if (amend) await cancelActiveJobsTx(tx, { patientId: Number(plan.patient_id), examId: Number(amend.exam_id), reason: "base_version_changed", actor });
}

// ══ طلبُ التعديل إلى Opus واقتراحُه (§4.hb ٣.١ و٤.٦) ══════════════════════════════════════════════════
export async function enqueueAmend(planId: number, body: any, actor: Actor): Promise<{ ok: true; job: JobRecord } | Refused> {
  try {
    return await db.transaction(async (tx) => {
      const plan = await lockPlanForOpus(tx, planId);
      if (plan.origin !== "opus" || isOpusAwaiting({ origin: plan.origin, status: plan.status })) return refused(409, "plan_not_amendable", "يُطلب التعديلُ على خطّة Bionic AI المعتمَدة");
      if (plan.status !== "approved") return refused(409, "plan_closed", "الخطّةُ منتهية — موقوفةٌ أو متخرّجة");
      const current = await ensureVersionOneTx(tx, plan, actor);
      if (Number(body?.baseVersion) !== current) return refused(409, "version_conflict", "عُدّلت الخطّةُ من غيرك — أُعيد تحميلُها", { currentVersion: current });
      const examId = await newestV2ExamId(tx, Number(plan.patient_id));
      if (!examId) return refused(409, "no_live_exam", "لا معاينةَ علاجٍ طبيعيّ حيّة على الاستمارة الإلزامية للمريض");
      const job = await enqueueReviseTx(tx, { plan, scope: "amend", note: String(body?.request ?? ""), actor, baseVersion: current, examId });
      return { ok: true as const, job };
    });
  } catch (e) {
    if (e instanceof AgentJobError) return refused(e.status, e.code, e.message);
    throw e;
  }
}

/** **الاقتراحُ من تعديل Opus** — في معاملة العامل: الخطّةُ معتمَدةٌ بنسختها الأساس، والبوّاباتُ النهائية، ولا تمسّ الصفوفَ الحيّة؛ وما سبقه منتظراً
 *  «حلّ محلَّه» الآن (لا عند الطلب — D3). */
export async function createAmendProposalTx(job: JobRecord, me: string, build: (tx: any, base: VersionRow) => Promise<{ candidate: PlanSnapshot; fetched: Set<string> }>,
  result: Record<string, any>): Promise<{ kind: "succeeded" | "failed" | "cancelled"; code?: string; detail?: string }> {
  return db.transaction(async (tx) => {
    await lockPatientAgent(tx, job.patientId);
    const plan = job.planId ? rows(await tx.execute(sql`SELECT * FROM physio_plans WHERE id = ${job.planId} FOR UPDATE`))[0] : null;
    const cur = rows(await tx.execute(sql`SELECT * FROM physio_agent_jobs WHERE id = ${job.id} FOR UPDATE`))[0];
    if (!cur || cur.status !== "running" || cur.locked_by !== me) throw new AgentStop("lost");
    if (cur.cancel_requested) throw new AgentStop("cancel");
    const finish = async (status: string, code: string | null, extra: Record<string, any>, detail: string | null = null, proposal = false) => {
      await tx.execute(sql`UPDATE physio_agent_jobs SET status = ${status}, error_code = ${code}, error = ${code ? JOB_ERROR_TEXTS[code] ?? code : null}, error_detail = ${detail},
          result = ${JSON.stringify({ ...result, ...extra })}::jsonb, finished_at = now(), locked_by = NULL, locked_at = NULL,
          proposal_status = ${proposal ? "pending" : null}, updated_at = now() WHERE id = ${job.id}`);
      await logAudit({ entityType: "physio_agent_job", entityId: job.id, action: status, userId: null, userName: "Bionic AI", branchId: job.branchId,
        newValues: { status, code, detail, proposal }, notes: code ? JOB_ERROR_TEXTS[code] ?? code : "اقترح Bionic AI تعديلاً على الخطّة", tx });
    };
    let code: string | null = null;
    if (!plan) code = "plan_deleted";
    else if (plan.status !== "approved") code = "plan_closed";
    else if (Number(plan.opus_version) !== job.baseVersion) code = "base_version_changed";
    const exam = await loadExam(tx, job.examId);
    if (!code) {
      if (!exam || exam.cancelled) code = "exam_cancelled";
      else if (fingerprintOf(exam) !== job.examFingerprint) code = "exam_changed";
      else if ((await newestV2ExamId(tx, job.patientId)) !== job.examId) code = "superseded_by_newer_exam";
      else if (!(await examAgentGate(job.examId, tx)).allowed) code = "gate_closed";
    }
    if (code) {
      await finish("cancelled", code, {});
      await notifyApproversTx(tx, job, `⚠️ لم يقترح Bionic AI تعديلاً: ${JOB_ERROR_TEXTS[code]}`, `/physio/plans/${job.planId ?? ""}`);
      return { kind: "cancelled", code };
    }
    const base = (await currentVersionTx(tx, plan!))!;
    const { candidate: c0, fetched } = await build(tx, base);
    const g = await buildEditGateContext(tx, plan!, base.snapshot, c0, { fetched, examId: job.examId });
    const candidate = serverDerived(c0, g, await protocolRowOf(tx, c0));
    const res = applyEditGates(candidate, g.ctx, "opus_amend", base.snapshot);
    if (res.blocking.length) {
      const detail = res.blocking.map((b) => b.code).join(",");
      const c = res.blocking.some((b) => b.code === "empty_plan") ? "empty_plan" : "gates_blocking";
      await finish("failed", c, { final: { revision: { baseVersion: base.version, snapshot: res.snapshot, gateLog: res.log } } }, detail);
      await notifyApproversTx(tx, job, `⚠️ لم يقترح Bionic AI تعديلاً: ${JOB_ERROR_TEXTS[c]}`, `/physio/plans/${job.planId}`);
      return { kind: "failed", code: c, detail };
    }
    if (sameContent(base.snapshot, res.snapshot)) {
      await finish("failed", "revision_no_change", {});
      await notifyApproversTx(tx, job, `⚠️ لم يقترح Bionic AI تعديلاً: ${JOB_ERROR_TEXTS.revision_no_change}`, `/physio/plans/${job.planId}`);
      return { kind: "failed", code: "revision_no_change" };
    }
    const diff = diffSnapshots(base.snapshot, res.snapshot, res.log, "writer");
    const summary = diffSummaryAr(diff);
    const revision = { baseVersion: base.version, snapshot: res.snapshot, gateLog: res.log, diff, diffSummaryAr: summary, proposalHash: hashOf(res.snapshot),
      fetchedUrls: Array.from(fetched) };
    const sup = rows(await tx.execute(sql`UPDATE physio_agent_jobs SET proposal_status = 'superseded', proposal_reason = 'proposal_new_request', updated_at = now()
        WHERE plan_id = ${job.planId} AND proposal_status = 'pending' AND id <> ${job.id} RETURNING id`));
    for (const x of sup) await logAudit({ entityType: "physio_agent_job", entityId: Number(x.id), action: "proposal_superseded", userName: "Bionic AI", branchId: job.branchId,
      newValues: { by: job.id }, notes: JOB_ERROR_TEXTS.proposal_new_request, tx });
    await finish("succeeded", null, { final: { ...(result.final ?? {}), revision } }, null, true);
    await notifyApproversTx(tx, job, `🤖 اقترح Bionic AI تعديلاً على ${versionLabel(base.version)} — راجِع الفرق واحفظه`, `/physio/plans/${job.planId}?proposal=${job.id}`);
    return { kind: "succeeded" };
  });
}

/** **حفظُ اقتراح Opus** — نسخةٌ ن+١ (`opus_revision`) بسبب الطلب، بإعادة البوّابات على الحال الآن. */
export async function acceptProposal(jobId: number, body: any, actor: Actor): Promise<{ ok: true; version: number; plan: Record<string, any> } | Refused> {
  return db.transaction(async (tx) => {
    const j0 = rows(await tx.execute(sql`SELECT patient_id, plan_id FROM physio_agent_jobs WHERE id = ${jobId}`))[0];
    if (!j0 || !j0.plan_id) return refused(404, "job_not_found", "الاقتراحُ غير موجود");
    await lockPatientAgent(tx, Number(j0.patient_id));
    const plan = rows(await tx.execute(sql`SELECT * FROM physio_plans WHERE id = ${j0.plan_id} FOR UPDATE`))[0];
    const jr = rows(await tx.execute(sql`SELECT * FROM physio_agent_jobs WHERE id = ${jobId} FOR UPDATE`))[0];
    const job = jobOf(jr);
    if (job.reviseScope !== "amend" || job.proposalStatus !== "pending") return refused(409, "not_pending", "الاقتراحُ ليس منتظراً (حُفظ أو تُجوهل أو قدُم)");
    const stale = async (reason: string, code: string, error: string, extra?: Record<string, unknown>) => {
      await markProposalsStaleTx(tx, { planId: job.planId!, reason, actor });
      return refused(409, code, error, extra);
    };
    if (!plan) return stale("plan_deleted", "proposal_stale", JOB_ERROR_TEXTS.plan_deleted);
    if (plan.status !== "approved") return stale("plan_closed", "proposal_stale", JOB_ERROR_TEXTS.plan_closed);
    const pt = rows(await tx.execute(sql`SELECT deleted_at FROM patients WHERE id = ${plan.patient_id}`))[0];
    if (!pt || pt.deleted_at) return stale("patient_trashed", "proposal_stale", JOB_ERROR_TEXTS.patient_trashed);
    const current = await ensureVersionOneTx(tx, plan, actor);
    if (current !== job.baseVersion) return stale("base_version_changed", "proposal_stale", JOB_ERROR_TEXTS.base_version_changed);
    const rev = job.result?.final?.revision;
    if (!rev?.snapshot) return refused(409, "not_pending", "لا اقتراحَ محفوظ");
    if (String(body?.proposalHash ?? "") !== String(rev.proposalHash)) return refused(409, "proposal_changed", "تغيّر الاقتراحُ منذ فتحتَه — أُعيد تحميلُه");
    const exam = await loadExam(tx, job.examId);
    if (!exam || exam.cancelled || fingerprintOf(exam) !== job.examFingerprint || (await newestV2ExamId(tx, job.patientId)) !== job.examId) {
      return stale("exam_changed", "proposal_stale", "عُدّلت المعاينةُ أو وُقّعت أحدث بعد الاقتراح — اطلب من Bionic AI تعديلاً جديداً");
    }
    if (!(await examAgentGate(job.examId, tx)).allowed) return stale("gate_closed", "proposal_stale", JOB_ERROR_TEXTS.gate_closed);
    const majors = unresolvedMajorsOf(job.result);
    const acks = new Set<string>(Array.isArray(body?.acknowledgedIssueIds) ? body.acknowledgedIssueIds.map(String) : []);
    const base = (await currentVersionTx(tx, plan))!;
    const stored = rev.snapshot as PlanSnapshot;
    const g = await buildEditGateContext(tx, plan, base.snapshot, stored, { fetched: new Set((rev.fetchedUrls ?? job.result?.fetchedUrls ?? []) as string[]), examId: job.examId });
    const candidate = serverDerived(stored, g, await protocolRowOf(tx, stored));
    const res = applyEditGates(candidate, g.ctx, "accept", base.snapshot);
    if (res.blocking.length) return stale("gates_blocking", "proposal_gates_blocking", `لا يُحفظ الآن: ${res.blocking.map((b) => b.reasonAr).join("؛ ")}`, { blocking: res.blocking });
    if (res.changed || hashOf(res.snapshot) !== rev.proposalHash) {
      const diff = diffSnapshots(base.snapshot, res.snapshot, [...(rev.gateLog ?? []), ...res.log], "writer");
      const next = { ...rev, snapshot: res.snapshot, gateLog: [...(rev.gateLog ?? []), ...res.log], diff, diffSummaryAr: diffSummaryAr(diff), proposalHash: hashOf(res.snapshot),
        regatedAt: new Date().toISOString() };
      await tx.execute(sql`UPDATE physio_agent_jobs SET result = jsonb_set(result, '{final,revision}', ${JSON.stringify(next)}::jsonb), updated_at = now() WHERE id = ${jobId}`);
      await logAudit({ entityType: "physio_agent_job", entityId: jobId, action: "proposal_regated", userId: actor.userId, userName: actor.name, branchId: plan.branch_id,
        newValues: { changes: res.log.filter((e) => e.kind === "removed" || e.kind === "clamped").map((e) => e.code) }, notes: "صحّحت البوّاباتُ الاقتراحَ عند الحفظ", tx });
      return refused(409, "proposal_changed", "تغيّر الاقتراحُ منذ فتحتَه: صحّحته البوّاباتُ بالحال الآن — راجِع ثمّ احفظ", { proposalHash: next.proposalHash });
    }
    if (majors.some((m) => !acks.has(m.id))) return refused(400, "opus_ack_required", "أقرّ بكلّ ملاحظةٍ كبيرة لم تُحلّ قبل الحفظ");
    const version = base.version + 1;
    const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim().slice(0, 2000) : null;
    await writeVersionTx(tx, plan, res.snapshot, proofOf(res, "accept"), { version, how: "opus_revision", reason: job.reviseNote, approvalNote: note,
      gateLog: [...(rev.gateLog ?? []), ...res.log], jobId, acks: Array.from(acks), diffSummaryAr: rev.diffSummaryAr ?? null, actor });
    await tx.execute(sql`UPDATE physio_agent_jobs SET proposal_status = 'accepted', saved_version = ${version}, proposal_decided_by = ${actor.userId},
        proposal_decided_by_name = ${actor.name}, proposal_decided_at = now(), updated_at = now() WHERE id = ${jobId}`);
    await cancelActiveAmendTx(tx, plan, actor);
    await logAudit({ entityType: "physio_agent_job", entityId: jobId, action: "proposal_accepted", userId: actor.userId, userName: actor.name, branchId: plan.branch_id,
      newValues: { version, acks: Array.from(acks) }, notes: note ?? undefined, ipAddress: actor.ip ?? null, userAgent: actor.userAgent ?? null, tx });
    await logAudit({ entityType: "physio_plan", entityId: Number(plan.id), action: "opus_version", userId: actor.userId, userName: actor.name, branchId: plan.branch_id,
      oldValues: { version: base.version, hash: base.snapshotHash }, newValues: { version, how: "opus_revision", jobId, hash: hashOf(res.snapshot), diff: rev.diffSummaryAr },
      notes: `${versionLabel(version)} — تعديلٌ من Bionic AI`, ipAddress: actor.ip ?? null, userAgent: actor.userAgent ?? null, tx });
    await notifyVersionedTx(tx, plan, version, "opus_revision", rev.diffSummaryAr ?? "", actor);
    const after = rows(await tx.execute(sql`SELECT * FROM physio_plans WHERE id = ${plan.id}`))[0];
    return { ok: true as const, version, plan: after };
  });
}

export async function discardProposal(jobId: number, body: any, actor: Actor): Promise<{ ok: true } | Refused> {
  return db.transaction(async (tx) => {
    const j0 = rows(await tx.execute(sql`SELECT patient_id FROM physio_agent_jobs WHERE id = ${jobId}`))[0];
    if (!j0) return refused(404, "job_not_found", "الاقتراحُ غير موجود");
    await lockPatientAgent(tx, Number(j0.patient_id));
    const j = rows(await tx.execute(sql`SELECT * FROM physio_agent_jobs WHERE id = ${jobId} FOR UPDATE`))[0];
    if (j.kind !== "revise" || j.revise_scope !== "amend" || j.proposal_status !== "pending") return refused(409, "not_pending", "الاقتراحُ ليس منتظراً");
    const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim().slice(0, 2000) : null;
    await tx.execute(sql`UPDATE physio_agent_jobs SET proposal_status = 'discarded', proposal_reason = ${note}, proposal_decided_by = ${actor.userId},
        proposal_decided_by_name = ${actor.name}, proposal_decided_at = now(), updated_at = now() WHERE id = ${jobId}`);
    await logAudit({ entityType: "physio_agent_job", entityId: jobId, action: "proposal_discarded", userId: actor.userId, userName: actor.name, branchId: j.branch_id,
      newValues: { note }, notes: "تُجوهل اقتراحُ Bionic AI", ipAddress: actor.ip ?? null, userAgent: actor.userAgent ?? null, tx });
    return { ok: true as const };
  });
}

/** **طلبُ «أعِده إلى Opus»** قبل الاعتماد (§4.hb ٣.١) — على معاينة الخطّة، والقِدَمُ بممنوعٍ الآن وحده مسموح. */
export async function enqueueReturn(planId: number, body: any, actor: Actor, opusStaleness: (ex: any, plan: Record<string, any>) => Promise<string | null>):
  Promise<{ ok: true; job: JobRecord } | Refused> {
  try {
    return await db.transaction(async (tx) => {
      const plan = await lockPlanForOpus(tx, planId);
      if (!isOpusAwaiting({ origin: plan.origin, status: plan.status })) return refused(409, "not_awaiting", "الخطّةُ ليست خطّةَ Bionic AI تنتظر الاعتماد");
      if (!plan.source_exam_id) return refused(409, "no_live_exam", "لا معاينةَ لهذه الخطّة");
      const staleness = await opusStaleness(tx, plan);
      const job = await enqueueReviseTx(tx, { plan, scope: "return", note: String(body?.note ?? ""), actor, examId: Number(plan.source_exam_id), staleness });
      return { ok: true as const, job };
    });
  } catch (e) {
    if (e instanceof AgentJobError) return refused(e.status, e.code, e.message);
    throw e;
  }
}

/** **حالُ التعديل للمعتمِد** — الوظيفةُ النشطة، وآخرُ الطلبات، والاقتراحُ المنتظر بفرقه. */
export async function opusRevisionView(planId: number) {
  const plan = rows(await db.execute(sql`SELECT * FROM physio_plans WHERE id = ${planId}`))[0];
  if (!plan || plan.origin !== "opus") return null;
  const jobs = rows(await db.execute(sql`SELECT * FROM physio_agent_jobs WHERE plan_id = ${planId} AND kind = 'revise' ORDER BY id DESC LIMIT 20`)).map(jobOf);
  const active = jobs.find((j) => ["queued", "running", "needs_answers"].includes(j.status)) ?? null;
  const pending = jobs.find((j) => j.proposalStatus === "pending") ?? null;
  const current = plan.status === "approved" || plan.status === "stopped" || plan.status === "graduated" ? await currentVersionTx(db, plan) : null;
  let proposal: Record<string, unknown> | null = null;
  if (pending) {
    const rev = pending.result?.final?.revision ?? {};
    const staleBase = current ? current.version !== pending.baseVersion : true;
    proposal = { jobId: pending.id, baseVersion: pending.baseVersion, currentVersion: current?.version ?? null, stale: staleBase,
      staleText: staleBase ? JOB_ERROR_TEXTS.base_version_changed : null, request: pending.reviseNote, snapshot: rev.snapshot ?? null, gateLog: rev.gateLog ?? [],
      diff: rev.diff ?? null, diffSummaryAr: rev.diffSummaryAr ?? null, proposalHash: rev.proposalHash ?? null, reviews: pending.result?.reviews ?? [], audits: pending.result?.audits ?? [],
      unresolved: pending.result?.unresolved ?? { reviewer: [], auditor: [] }, majorsToAcknowledge: unresolvedMajorsOf(pending.result).map((i) => i.id), usage: pending.result?.usage ?? null };
  }
  const view = (j: JobRecord) => ({ id: j.id, scope: j.reviseScope, status: j.status, stage: j.stage, stages: j.stages, note: j.reviseNote, requestedByName: j.requestedByName,
    createdAt: j.createdAt, finishedAt: j.finishedAt, errorCode: j.errorCode, error: j.error, proposalStatus: j.proposalStatus, proposalReason: j.proposalReason,
    baseVersion: j.baseVersion, savedVersion: j.savedVersion, diffSummaryAr: j.result?.final?.revision?.diffSummaryAr ?? j.result?.revision?.diffSummaryAr ?? null,
    lostByExamChange: j.status === "cancelled" && ["exam_changed", "superseded_by_newer_exam", "exam_cancelled", "gate_closed"].includes(String(j.errorCode)) });
  return { activeJob: active ? view(active) : null, latest: jobs.map(view), proposal, currentVersion: current?.version ?? null };
}

/** فرقُ نسختين (أو نسخةٍ وسابقتها). */
export async function versionDiff(plan: Record<string, any>, n: number, against: number | null) {
  const { versions } = await listVersions(db, plan);
  const to = versions.find((v) => v.version === n);
  const fromN = against ?? n - 1;
  const from = versions.find((v) => v.version === fromN);
  if (!to || !from) return null;
  const d = diffSnapshots(from.snapshot, to.snapshot, (to.gateLog ?? []) as any[], to.how === "opus_revision" ? "writer" : "approver");
  return { from: from.version, to: to.version, diff: d, diffSummaryAr: diffSummaryAr(d) };
}

/** عددُ الجلسات على كلّ نسخة. */
export async function sessionsPerVersion(planId: number): Promise<Map<number, number>> {
  return new Map(rows(await db.execute(sql`SELECT plan_version, count(*)::int AS n FROM physio_plan_sessions WHERE plan_id = ${planId} AND cancelled_at IS NULL
      AND plan_version IS NOT NULL GROUP BY plan_version`)).map((r) => [Number(r.plan_version), Number(r.n)]));
}

/** **ما تمنعه المعاينةُ الآن في خطّةٍ نافذة** (§4.hb ٤.٨) — الشريطُ الأحمر لكلّ قارئ. */
export async function forbiddenNowOf(plan: Record<string, any>): Promise<{ deviceCode: string; nameAr: string; reasonAr: string }[]> {
  if (plan.origin !== "opus" || plan.status !== "approved") return [];
  const examId = await newestV2ExamId(db, Number(plan.patient_id));
  const exam = examId ? await loadExam(db, examId) : null;
  const current = await currentVersionTx(db, plan);
  const forbidden = await forbiddenForPatientTx(db, Number(plan.patient_id), exam, current?.snapshot ?? null);
  const codes = rows(await db.execute(sql`SELECT d.code FROM physio_plan_devices l JOIN devices d ON d.id = l.device_id WHERE l.plan_id = ${plan.id}`)).map((r) => String(r.code));
  return forbidden.filter((f) => codes.includes(f.deviceCode)).map((f) => ({ deviceCode: f.deviceCode, nameAr: f.nameAr, reasonAr: f.reasonAr }));
}

export const _private = { reasonOf, writeVersionTx, proofOf, notifyVersionedTx };

// ══ ما يقرؤه Opus في وظيفة «تعديل» (§4.hb ٣.٣) ═══════════════════════════════════════════════════════
export interface RevisionInput {
  scope: "return" | "amend";
  note: string;
  /** يدخل JSON السياق تحت `revision` (يُنقّى في العمق قبل الإرسال) — بلا الملاحظة: هي في «كتلة التعديل» آخرَ الرسالة الأولى وحدها. */
  obj: Record<string, unknown>;
  priorAnswers: { round: number; at: string; examId: number; sameExamAsContext: boolean; answers: { id: string; questionAr: string; affects: string; answer: string }[] }[];
  forbidden: SnapForbidden[];
  base: VersionRow | null;
  previousSnapshot: PlanSnapshot | null;
  plan: Record<string, any>;
}
async function qaChain(ex: any, startJobId: number | null, contextExamId: number): Promise<RevisionInput["priorAnswers"]> {
  const out: RevisionInput["priorAnswers"] = [];
  const seen = new Set<number>();
  for (let id = startJobId; id && !seen.has(id) && seen.size < 20;) {
    seen.add(id);
    const j = rows(await ex.execute(sql`SELECT id, exam_id, qa, base_job_id FROM physio_agent_jobs WHERE id = ${id}`))[0];
    if (!j) break;
    for (const r of (Array.isArray(j.qa) ? j.qa : [])) out.unshift({ round: r.round, at: r.at, examId: Number(j.exam_id), sameExamAsContext: Number(j.exam_id) === contextExamId,
      answers: (r.answers ?? []).map((a: any) => ({ id: a.id, questionAr: a.questionAr, affects: a.affects, answer: a.answer })) });
    id = j.base_job_id == null ? null : Number(j.base_job_id);
  }
  return out;
}
export async function buildRevisionInput(ex: any, job: JobRecord): Promise<RevisionInput> {
  const plan = job.planId ? rows(await ex.execute(sql`SELECT * FROM physio_plans WHERE id = ${job.planId}`))[0] : null;
  if (!plan) throw new Error("revise job without a plan");
  const exam = await loadExam(ex, job.examId);
  //  **الملاحظاتُ السابقة الملزمة = ما أُخذ بنتيجته وحده**: إعادةٌ نجحت فصارت هي الخطّةَ المنتظرة، أو اقتراحُ تعديلٍ حُفظ نسخةً. وما تُجوهل أو قدُم
  //  أو أُلغي أو فشل لا يُرسَل — المعتمِدُ رفضه أو لم يره، فلا يُعامَل أمراً (مراجعةُ المرحلة الثالثة).
  const earlier = rows(await ex.execute(sql`SELECT revise_note, created_at, revise_scope FROM physio_agent_jobs WHERE plan_id = ${plan.id} AND kind = 'revise' AND id < ${job.id}
      AND ((revise_scope = 'return' AND status = 'succeeded') OR (revise_scope = 'amend' AND proposal_status = 'accepted')) ORDER BY id`))
    .map((r) => ({ at: r.created_at ? new Date(r.created_at).toISOString() : null, scope: r.revise_scope, note: String(r.revise_note ?? "") }));
  if (job.reviseScope === "return") {
    const prev = job.baseJobId ? rows(await ex.execute(sql`SELECT result FROM physio_agent_jobs WHERE id = ${job.baseJobId}`))[0] : null;
    const gated = (prev?.result?.final?.regated?.gated ?? prev?.result?.final?.gated ?? null) as GatedPlan | null;
    //  **ما رآه المعتمِد**: إن صحّحت البوّاباتُ الاقتراحَ عند الاعتماد (`regated.snapshot` — حذفت جهازاً مُنع الآن) فذاك هو الأساس، لا الأصلُ قبل التصحيح.
    const corrected = (prev?.result?.final?.regated?.snapshot ?? null) as PlanSnapshot | null;
    const forbidden = await forbiddenForPatientTx(ex, job.patientId, exam, null);
    const previousSnapshot = corrected ?? (gated ? await snapshotFromGatedTx(ex, gated, { patientId: job.patientId, branchId: job.branchId, exam, forbidden }) : null);
    const corrections = corrected ? ((prev?.result?.final?.regated?.gateLog ?? []) as any[]).filter((e) => e?.kind === "removed" || e?.kind === "clamped") : [];
    return { scope: "return", note: job.reviseNote ?? "", plan, base: null, previousSnapshot, forbidden,
      obj: { scope: "return", previousPlan: corrected
        ? { correctedByGates: true, plan: corrected, gateCorrections: corrections, submitted: prev?.result?.final?.submitted ?? null }
        : { submitted: prev?.result?.final?.submitted ?? null, gated }, earlierNotes: earlier },
      priorAnswers: await qaChain(ex, job.baseJobId, job.examId) };
  }
  const base = await currentVersionTx(ex, plan);
  const { versions } = await listVersions(ex, plan);
  const forbidden = await forbiddenForPatientTx(ex, job.patientId, exam, base?.snapshot ?? null);
  return { scope: "amend", note: job.reviseNote ?? "", plan, base, previousSnapshot: base?.snapshot ?? null, forbidden,
    obj: { scope: "amend", currentVersion: base ? { version: base.version, mode: base.snapshot.mode, protocolId: base.snapshot.protocolId, snapshot: base.snapshot } : null,
      versionsSoFar: versions.map((v) => ({ version: v.version, how: v.how, reason: v.reason, at: v.createdAt })), earlierNotes: earlier },
    priorAnswers: await qaChain(ex, plan.agent_job_id ? Number(plan.agent_job_id) : null, job.examId) };
}

/** المرشَّحُ من تعديل Opus: فرقٌ على النسخة النافذة (المكتبة) أو الخطّةُ كاملة (خارجها). */
export async function amendCandidate(ex: any, base: VersionRow, submitted: import("@shared/physio_agent").SubmittedPlan): Promise<PlanSnapshot> {
  const { snapshotFromAmendDelta, snapshotFromAmendFull } = await import("@shared/physio_plan_versions");
  const protocol = base.snapshot.mode === "library" ? await loadGateProtocol(ex, base.snapshot.protocolId) : null;
  const ids = [...submitted.exerciseChanges.map((c) => c.toExerciseId ?? 0), ...submitted.phases.flatMap((p) => p.exercises.map((x) => x.exerciseId ?? 0))];
  const x = await lookupsFor(ex, protocol, ids);
  return base.snapshot.mode === "library" ? snapshotFromAmendDelta(base.snapshot, submitted, x) : snapshotFromAmendFull(base.snapshot, submitted, x);
}
/** **بوّاباتُ تعديل Opus في جولاته** — تُحذف وتُقصّ بسطر (`opus_amend`)، والممنوعُ يوقف. */
export async function amendGate(ex: any, plan: Record<string, any>, base: VersionRow, submitted: import("@shared/physio_agent").SubmittedPlan, fetched: Set<string>, examId: number) {
  const c0 = await amendCandidate(ex, base, submitted);
  const g = await buildEditGateContext(ex, plan, base.snapshot, c0, { fetched, examId });
  const candidate = serverDerived(c0, g, await protocolRowOf(ex, c0));
  const res = applyEditGates(candidate, g.ctx, "opus_amend", base.snapshot);
  return { plan: res.snapshot, log: res.log, blocking: res.blocking, diff: diffSnapshots(base.snapshot, res.snapshot, res.log, "writer") };
}
