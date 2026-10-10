// **بناءُ ترحيلات محتوى البروتوكولات المفصَّلة** (§4.cx) — ليس ترحيلاً بنفسه؛ يستورده ترحيلُ كلّ بروتوكول (١١٩ فما بعده).
//
// قرارُ المالك (٢٠٢٦-١٠-٠٩): البروتوكولاتُ تُفصَّل **واحداً بعد واحد**، وكلٌّ في ترحيله. وكلُّ ترحيلٍ منها:
//   ١. **يزرع بطاقاتِ تمارينه** `ON CONFLICT (code) DO NOTHING` — بطاقةٌ زرعها بروتوكولٌ سابق (أو عدّلها سليم) لا تُمَسّ، والبروتوكولُ
//      التالي يستعملها برمزها.
//   ٢. **يعيد البروتوكولَ مسوّدةً إن كان معتمَداً ولا مراحلَ له** — فمحتوىً جديدٌ لم يُراجَع لا يحمل شارةَ «معتمَد».
//   ٣. **يكتب نصوصَه وجرعتَه ومراجعه وأجهزتَه ما دام لم يعدّله إنسان** (`updated_by IS NULL`) — وما عدّله سليمٌ يبقى كما كتبه.
//   ٤. **يزرع مراحلَه وتمارينَها بجرعتها إن لم تكن له مراحل.**
// وكلُّ ذلك يتكرّر بلا أثرٍ ثانٍ (الترحيلاتُ idempotent). والنصُّ عربيٌّ بالمصطلح الإنكليزيّ بين قوسين، وبنسخةٍ إنكليزية كاملة.
//
// **ومن البروتوكول الثاني (ترحيل ١٢٤ — §4.dg)** القالبُ كاملاً كما استقرّ بعد ترحيلَي ١٢٢ و١٢٣: عددُ الجلسات (`totalSessions`)، ونطاقُ جلسات كلّ
// مرحلة (`sessionFrom/sessionTo`)، و«استعمالُ المركز» لكلّ جهاز (`centreUse`). **وكلُّها اختيارية**: ما لا يُعطى لا يظهر في الـSQL، فيبقى ما يُنتجه
// ترحيلُ ١١٩ حرفاً بحرف — وهو يُشغَّل على قاعدةٍ جديدة قبل ١٢٢ و١٢٣ اللذين أضافا تلك الأعمدة.

export type Bi = [ar: string, en: string];
type Ev = "recommended" | "optional" | "not_recommended";

export interface ExerciseSeed {
  code: string; nameAr: string; nameEn: string;
  kind: "mobility" | "stretch" | "strength" | "motor_control" | "endurance" | "aerobic" | "balance" | "functional" | "breathing" | "neural";
  region: "lumbar" | "thoracic" | "cervical" | "shoulder" | "elbow" | "wrist_hand" | "hip" | "knee" | "ankle_foot" | "whole_body";
  perSide?: boolean; homeSuitable?: boolean;
  sets?: number; reps?: number; hold?: number; rest?: number;
  purpose: Bi; start: Bi; steps: [string[], string[]]; cues: [string[], string[]];
  easier: Bi; harder: Bi; stopIf: Bi; equipment: Bi; doseNote?: Bi;
  images: { key: string; ar: string; en: string; search: string }[];
}
export interface PhaseExerciseSeed { code: string; sets?: number; reps?: number; hold?: number; rest?: number; doseNote?: Bi; note?: Bi }
export interface PhaseSeed {
  name: Bi; timeframe: Bi; goals: Bi; education: Bi; criteria: Bi; notes: Bi; exercises: PhaseExerciseSeed[];
  /** نطاقُ جلسات المرحلة (ترحيل ١٢٣) — اختياريّ. */
  sessionFrom?: number; sessionTo?: number;
}
export type CentreUse = "core" | "adjunct" | "not_used";
export interface DeviceSeed {
  code: string; evidence: Ev; minutes?: number; params?: Record<string, string>; parameters?: Bi; note?: Bi;
  /** «استعمالُ المركز» (ترحيل ١٢٢) — اختياريّ؛ وبلا قيمةٍ يُشتقّ من درجة الدليل. */
  centreUse?: CentreUse;
}
export interface RefSeed { title: string; org: string; year: number; url?: string }
export interface ProtocolContentSeed {
  code: string;
  summary: Bi; goals: Bi; assessment: Bi; exercises: Bi; contraindications: Bi; precautions: Bi;
  spw: number; weeks: number; minutes: number; refs: RefSeed[]; devices: DeviceSeed[]; phases: PhaseSeed[];
  /** عددُ الجلسات (ترحيل ١٢٣) — اختياريّ؛ والأسابيعُ تُكتب كما تُشتقّ منه (`weeks`). */
  totalSessions?: number;
}

export const lit = (v: string | null | undefined) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
export const num = (v: number | null | undefined) => (v === null || v === undefined ? "NULL" : String(Math.trunc(v)));
const lines = (xs: string[]) => xs.join("\n");
const SEEDED_BY = "زرعٌ أوّلي";

export function exercisesSql(list: ExerciseSeed[]): string {
  const rows = list.map((e) => {
    const images = e.images.map((i) => ({ key: i.key, captionAr: i.ar, captionEn: i.en, search: i.search }));
    return `(${[
      lit(e.code), lit(e.nameAr), lit(e.nameEn), lit(e.kind), lit(e.region),
      lit(e.purpose[0]), lit(e.purpose[1]), lit(e.start[0]), lit(e.start[1]), lit(lines(e.steps[0])), lit(lines(e.steps[1])),
      lit(lines(e.cues[0])), lit(lines(e.cues[1])), lit(e.easier[0]), lit(e.easier[1]), lit(e.harder[0]), lit(e.harder[1]),
      lit(e.stopIf[0]), lit(e.stopIf[1]), lit(e.equipment[0]), lit(e.equipment[1]), lit(e.doseNote?.[0]), lit(e.doseNote?.[1]),
      num(e.sets), num(e.reps), num(e.hold), num(e.rest), e.perSide ? "true" : "false", e.homeSuitable === false ? "false" : "true",
      `${lit(JSON.stringify(images))}::jsonb`, "'draft'", lit(SEEDED_BY), lit(SEEDED_BY),
    ].join(", ")})`;
  });
  return `INSERT INTO physio_exercises
  (code, name_ar, name_en, kind, region, purpose, purpose_en, start_position, start_position_en, steps, steps_en, cues, cues_en,
   easier, easier_en, harder, harder_en, stop_if, stop_if_en, equipment, equipment_en, dose_note, dose_note_en,
   sets, reps, hold_seconds, rest_seconds, per_side, home_suitable, images, status, created_by_name, updated_by_name)
VALUES
  ${rows.join(",\n  ")}
ON CONFLICT (code) DO NOTHING;`;
}

export function protocolContentSql(p: ProtocolContentSeed): string {
  const code = lit(p.code);
  const noPhases = `NOT EXISTS (SELECT 1 FROM physio_protocol_phases ph WHERE ph.protocol_id = physio_protocols.id)`;
  const refs = p.refs.map((r) => ({ title: r.title, org: r.org, year: r.year, url: r.url ?? null }));
  const text = (col: string, v: Bi) => `${col} = ${lit(v[0])}, ${col}_en = ${lit(v[1])}`;

  const demote = `UPDATE physio_protocols SET status = 'draft', approved_by = NULL, approved_by_name = NULL, approved_at = NULL
 WHERE code = ${code} AND status = 'approved' AND ${noPhases};`;

  const texts = `UPDATE physio_protocols SET
  ${text("summary", p.summary)},
  ${text("goals", p.goals)},
  ${text("assessment", p.assessment)},
  ${text("exercises", p.exercises)},
  ${text("contraindications", p.contraindications)},
  ${text("precautions", p.precautions)},
  sessions_per_week = ${num(p.spw)}, duration_weeks = ${num(p.weeks)}, session_minutes = ${num(p.minutes)},${p.totalSessions === undefined ? "" : ` total_sessions = ${num(p.totalSessions)},`}
  "references" = ${lit(JSON.stringify(refs))}::jsonb,
  updated_by_name = ${lit(SEEDED_BY)}, updated_at = now()
 WHERE code = ${code} AND updated_by IS NULL;`;

  //  «استعمالُ المركز» عمودٌ يظهر حين يُعطى لجهازٍ واحدٍ على الأقلّ — وبلا قيمةٍ لجهازٍ يُكتب `NULL` (يُشتقّ من الدليل).
  const withUse = p.devices.some((d) => d.centreUse !== undefined);
  const deviceRows = p.devices.map((d, i) => `(${[
    lit(d.code), lit(d.evidence), `${lit(d.parameters?.[0])}::text`, `${lit(d.parameters?.[1])}::text`, `${num(d.minutes)}::int`,
    `${lit(d.note?.[0])}::text`, `${lit(d.note?.[1])}::text`, `${lit(JSON.stringify(d.params ?? {}))}::jsonb`, String(i),
    ...(withUse ? [`${lit(d.centreUse)}::text`] : []),
  ].join(", ")})`).join(",\n    ");
  const devices = `DELETE FROM physio_protocol_devices WHERE protocol_id IN (SELECT id FROM physio_protocols WHERE code = ${code} AND updated_by IS NULL);
INSERT INTO physio_protocol_devices (protocol_id, device_id, evidence, parameters, parameters_en, minutes, note, note_en, params, display_order${withUse ? ", centre_use" : ""})
SELECT p.id, d.id, v.evidence, v.parameters, v.parameters_en, v.minutes, v.note, v.note_en, v.params, v.ord${withUse ? ", v.centre_use" : ""}
FROM physio_protocols p
CROSS JOIN (VALUES
    ${deviceRows}
  ) AS v(code, evidence, parameters, parameters_en, minutes, note, note_en, params, ord${withUse ? ", centre_use" : ""})
JOIN devices d ON d.code = v.code
WHERE p.code = ${code} AND p.updated_by IS NULL;`;

  //  ونطاقُ الجلسات كذلك: عمودان يظهران حين تحملهما مرحلةٌ واحدة على الأقلّ.
  const withRange = p.phases.some((ph) => ph.sessionFrom !== undefined || ph.sessionTo !== undefined);
  const phaseRows = p.phases.map((ph, i) => `(${[
    String(i + 1), lit(ph.name[0]), lit(ph.name[1]), lit(ph.timeframe[0]), lit(ph.timeframe[1]), lit(ph.goals[0]), lit(ph.goals[1]),
    lit(ph.education[0]), lit(ph.education[1]), lit(ph.criteria[0]), lit(ph.criteria[1]), lit(ph.notes[0]), lit(ph.notes[1]),
    ...(withRange ? [`${num(ph.sessionFrom)}::int`, `${num(ph.sessionTo)}::int`] : []),
  ].join(", ")})`).join(",\n    ");
  const linkRows = p.phases.flatMap((ph, i) => ph.exercises.map((x, j) => `(${[
    String(i + 1), lit(x.code), String(j), `${num(x.sets)}::int`, `${num(x.reps)}::int`, `${num(x.hold)}::int`, `${num(x.rest)}::int`,
    `${lit(x.doseNote?.[0])}::text`, `${lit(x.doseNote?.[1])}::text`, `${lit(x.note?.[0])}::text`, `${lit(x.note?.[1])}::text`,
  ].join(", ")})`)).join(",\n    ");
  const phases = `WITH p AS (
  SELECT id FROM physio_protocols WHERE code = ${code} AND ${noPhases}
), ph AS (
  INSERT INTO physio_protocol_phases (protocol_id, position, name_ar, name_en, timeframe, timeframe_en, goals, goals_en,
    education, education_en, progress_criteria, progress_criteria_en, notes, notes_en${withRange ? ", session_from, session_to" : ""})
  SELECT p.id, v.* FROM p CROSS JOIN (VALUES
    ${phaseRows}
  ) AS v(position, name_ar, name_en, timeframe, timeframe_en, goals, goals_en, education, education_en,
         progress_criteria, progress_criteria_en, notes, notes_en${withRange ? ", session_from, session_to" : ""})
  RETURNING id, position
)
INSERT INTO physio_protocol_phase_exercises (phase_id, exercise_id, position, sets, reps, hold_seconds, rest_seconds,
  dose_note, dose_note_en, note, note_en)
SELECT ph.id, e.id, v.ord, v.sets, v.reps, v.hold, v.rest, v.dose_note, v.dose_note_en, v.note, v.note_en
FROM ph
JOIN (VALUES
    ${linkRows}
  ) AS v(phase_pos, code, ord, sets, reps, hold, rest, dose_note, dose_note_en, note, note_en) ON v.phase_pos = ph.position
JOIN physio_exercises e ON e.code = v.code;`;

  return [demote, texts, devices, phases].join("\n\n");
}

/**
 * **الخططُ المفتوحة على البروتوكول تأخذ نسختَها من مراحله** — بعد أن تُزرع (قاعدةُ ترحيل ١٢٣ نفسُها، لبروتوكولٍ واحد): خطّةٌ فُتحت عليه وهو بلا مراحل
 * (مسوّدة · منتظرة · مُعادة · معتمَدة) ولا نسخةَ لها؛ والموقوفةُ والمتخرّجة تاريخٌ لا يُمَسّ، والتي لها نسخةٌ لا تتضاعف.
 */
export function openPlansPhasesSql(protocolCode: string): string {
  return `WITH src AS (
  SELECT pl.id AS plan_id, ph.*
    FROM physio_plans pl
    JOIN physio_protocols pr ON pr.id = pl.protocol_id AND pr.code = ${lit(protocolCode)}
    JOIN physio_protocol_phases ph ON ph.protocol_id = pl.protocol_id
   WHERE pl.status IN ('draft', 'pending', 'returned', 'approved')
     AND NOT EXISTS (SELECT 1 FROM physio_plan_phases x WHERE x.plan_id = pl.id)
), ins AS (
  INSERT INTO physio_plan_phases (plan_id, position, name_ar, name_en, session_from, session_to, timeframe, timeframe_en,
    goals, goals_en, education, education_en, progress_criteria, progress_criteria_en, notes, notes_en)
  SELECT plan_id, position, name_ar, name_en, session_from, session_to, timeframe, timeframe_en,
    goals, goals_en, education, education_en, progress_criteria, progress_criteria_en, notes, notes_en
    FROM src
  RETURNING id, plan_id, position
)
INSERT INTO physio_plan_phase_exercises (phase_id, exercise_id, position, sets, reps, hold_seconds, rest_seconds,
  dose_note, dose_note_en, note, note_en)
SELECT ins.id, pe.exercise_id, pe.position, pe.sets, pe.reps, pe.hold_seconds, pe.rest_seconds,
  pe.dose_note, pe.dose_note_en, pe.note, pe.note_en
  FROM ins
  JOIN physio_plans pl ON pl.id = ins.plan_id
  JOIN physio_protocol_phases ph ON ph.protocol_id = pl.protocol_id AND ph.position = ins.position
  JOIN physio_protocol_phase_exercises pe ON pe.phase_id = ph.id;`;
}
