// **«اقترح خطّة» بالمساعد** (ترحيل ١١٢، §4.co — المرحلةُ الخامسة). القواعدُ في `shared/physio_plans.ts`.
//
// خطوتان، وكلٌّ منهما نداءٌ واحد للمساعد بردٍّ كائنٍ واحد يتحقّق منه الخادم:
//   ١. **الاختيار**: حالةُ المريض + فهرسُ المكتبة (العنوانُ والفئةُ العمرية والملخّص) ⟵ ثلاثةُ بروتوكولاتٍ على الأكثر بأسبابها.
//   ٢. **التعديل**: حالةُ المريض + البروتوكولُ المختار بأجهزته الجائزة في فرع الخطّة وموانعه ⟵ حذفٌ ودقائقُ وجرعةٌ وملاحظات.
// **وحالةُ المريض بلا اسمٍ ولا هاتفٍ ولا رمز**: العمرُ وحالتُه المسجّلة ونصُّ آخر معاينة علاجٍ طبيعيّ غيرِ ملغاة وسطرُ الأخصائيّ.
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { medicalExams, patients, physioPlanSuggestions, physioProtocols, type PhysioPlanSuggestion } from "@shared/schema";
import {
  parseModelJson, validateAdjustments, validateChoices, type AllowedLine, type SuggestionChoice, type SuggestionResult,
} from "@shared/physio_plans";
import { aiComplete, aiErrorDetail, classifyAiError, isAiEnabled, type AiCompleteParams } from "../ai/provider";
import { getProtocol } from "../physio_protocols/store";
import { PlanError, type Actor } from "./store";

export type Completer = (p: AiCompleteParams) => Promise<string>;
let testCompleter: Completer | null = null;
/** للاختبار وحده — مزوّدٌ مزيّف يعيد ردوداً جاهزة (لا مفتاحَ في بيئة التطوير). */
export function setSuggestCompleterForTests(fn: Completer | null): void { testCompleter = fn; }
export function suggestEnabled(): boolean { return Boolean(testCompleter) || isAiEnabled(); }

async function complete(p: AiCompleteParams): Promise<Record<string, any>> {
  let text: string;
  try {
    text = testCompleter ? await testCompleter(p) : await aiComplete(p);
  } catch (e) {
    const r = classifyAiError(e);
    //  **والسببُ يظهر للأخصائيّ** (واقعةُ ٢٠٢٦-١٠-٠٨، §4.co): «خطأ في خدمة الذكاء الاصطناعي» وحدها لا تقول شيئاً —
    //  الحالةُ ونوعُ الخطأ ورسالةُ الواجهة تُلحق بها، فتكفي صورةُ الشاشة للتشخيص بلا سجلّات Render.
    if (!r.ok) {
      const detail = r.reason === "api_error" ? aiErrorDetail(e) : null;
      throw new PlanError(r.reason === "disabled" ? 503 : r.reason === "rate_limit" ? 429 : 502, detail ? `${r.message} — ${detail}` : r.message);
    }
    throw e;
  }
  const v = parseModelJson(text);
  if (!v) throw new PlanError(502, "ردُّ المساعد غير مفهوم — أعد المحاولة");
  return v;
}

const clip = (v: unknown, n: number): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);

/** **ما يراه المساعدُ عن المريض** — بلا اسمٍ ولا هاتفٍ ولا رمز. */
export async function patientContext(patientId: number) {
  const [pt] = await db.select({ age: patients.age, medicalCondition: patients.medicalCondition }).from(patients).where(eq(patients.id, patientId));
  const [ex] = await db.select({
    signedAt: medicalExams.signedAt, chiefComplaint: medicalExams.chiefComplaint, clinicalFindings: medicalExams.clinicalFindings,
    diagnosis: medicalExams.diagnosis, plan: medicalExams.plan, notes: medicalExams.notes,
  }).from(medicalExams)
    .where(and(eq(medicalExams.patientId, patientId), eq(medicalExams.caseType, "physiotherapy"),
      sql`NOT EXISTS (SELECT 1 FROM medical_exam_cancellations c WHERE c.exam_id = ${medicalExams.id})`))
    .orderBy(desc(medicalExams.signedAt), desc(medicalExams.id)).limit(1);
  const exam = ex ? {
    date: new Date(new Date(ex.signedAt).getTime() + 3 * 3600 * 1000).toISOString().slice(0, 10),
    chiefComplaint: clip(ex.chiefComplaint, 1500), clinicalFindings: clip(ex.clinicalFindings, 1500),
    diagnosis: clip(ex.diagnosis, 1500), plan: clip(ex.plan, 1500), notes: clip(ex.notes, 1500),
  } : null;
  const examHasText = Boolean(exam && (exam.chiefComplaint || exam.clinicalFindings || exam.diagnosis || exam.plan || exam.notes));
  return { age: clip(pt?.age, 40), medicalCondition: clip(pt?.medicalCondition, 300), exam: examHasText ? exam : null };
}

const SYSTEM_COMMON = `You assist a physiotherapy specialist in an Iraqi rehabilitation centre. You never see the patient's name, phone or file code.
You work ONLY from the centre's own protocol library given to you — never invent a protocol, a device, a dose or a contraindication.
Answer with ONE JSON object and nothing else. Every reason is short, concrete, and tied to the patient's age, the physiotherapy exam text,
the specialist's note, or the protocol's own contraindications/precautions. Give each reason in Arabic (reasonAr) and English (reasonEn).`;

const SYSTEM_CHOOSE = `${SYSTEM_COMMON}
TASK: choose the protocols from the library that best fit this patient — at most 3, best first. Respect the age group (pediatric / adult / geriatric / all).
Output: {"choices":[{"protocolId":<id from the library>,"reasonAr":"…","reasonEn":"…"}],"noMatchReasonAr":"…"}
If nothing in the library fits, return {"choices":[],"noMatchReasonAr":"<why, in Arabic>"}.`;

const SYSTEM_ADJUST = `${SYSTEM_COMMON}
TASK: adapt the chosen protocol to THIS patient. The plan starts with exactly the protocol devices listed (minutes as listed) and the protocol dose.
You may ONLY:
  • remove a listed device that does not suit this patient (e.g. the exam mentions one of its contraindications) — with a reason;
  • LOWER a device's minutes (never above the listed minutes; 1–60 when none is listed) — with a reason;
  • LOWER the dose (sessionsPerWeek / durationWeeks / sessionMinutes; never above the protocol value) — with a reason;
  • write short patient-specific notes for the therapists (notesAr / notesEn) and a one-paragraph rationale (rationaleAr / rationaleEn).
You may NOT add a device. Change nothing without a patient-specific reason — an empty list is a valid answer.
Output: {"remove":[{"deviceId":n,"reasonAr":"…","reasonEn":"…"}],"minutes":[{"deviceId":n,"minutes":n,"reasonAr":"…","reasonEn":"…"}],
"dose":[{"field":"sessionsPerWeek|durationWeeks|sessionMinutes","value":n,"reasonAr":"…","reasonEn":"…"}],
"notesAr":"…","notesEn":"…","rationaleAr":"…","rationaleEn":"…"}`;

type LibraryRow = { id: number; titleAr: string; titleEn: string; ageGroup: string; category: string; status: string; summary: string | null; summaryEn: string | null };

async function library(): Promise<LibraryRow[]> {
  return db.select({
    id: physioProtocols.id, titleAr: physioProtocols.titleAr, titleEn: physioProtocols.titleEn, ageGroup: physioProtocols.ageGroup,
    category: physioProtocols.category, status: physioProtocols.status, summary: physioProtocols.summary, summaryEn: physioProtocols.summaryEn,
  }).from(physioProtocols).where(eq(physioProtocols.isArchived, false)).orderBy(physioProtocols.id);
}

export interface SuggestInput {
  patientId: number; branchId: number; note: string | null; protocolId: number | null; fromSuggestionId: number | null; actor: Actor;
}

/** **الاقتراح** — يُحفَظ صفّاً ويُعاد بأسماء البروتوكولات والأجهزة. لا يُنشئ خطّة: القبولُ وحده يفعل. */
export async function suggestPlan(p: SuggestInput) {
  const ctx = await patientContext(p.patientId);
  if (!ctx.exam && !p.note) throw new PlanError(400, "لا معاينةَ علاجٍ طبيعيّ في ملفّه — اكتب سطراً عن حالته");
  const patient = { age: ctx.age, registeredCondition: ctx.medicalCondition, physiotherapyExam: ctx.exam, specialistNote: p.note };
  const lib = await library();
  const libIds = new Set(lib.map((r) => r.id));

  let choices: SuggestionChoice[];
  if (p.protocolId) {
    //  «جرّب هذا» من البدائل — بلا خطوة اختيارٍ ثانية: البدائلُ تُحمل من الاقتراح السابق للمريض نفسِه.
    if (!libIds.has(p.protocolId)) throw new PlanError(404, "البروتوكول غير موجود");
    let prev: SuggestionChoice[] = [];
    if (p.fromSuggestionId) {
      const [s] = await db.select().from(physioPlanSuggestions).where(eq(physioPlanSuggestions.id, p.fromSuggestionId));
      if (s && s.patientId === p.patientId) prev = (s.choices as any[]).map((c) => ({ protocolId: c.protocolId, reasonAr: c.reasonAr ?? null, reasonEn: c.reasonEn ?? null }));
    }
    const picked = prev.find((c) => c.protocolId === p.protocolId) ?? { protocolId: p.protocolId, reasonAr: "اختاره الأخصائيّ", reasonEn: "Chosen by the specialist" };
    choices = [picked, ...prev.filter((c) => c.protocolId !== p.protocolId && libIds.has(c.protocolId))].slice(0, 3);
  } else {
    const raw = await complete({
      system: SYSTEM_CHOOSE, model: "sonnet", maxTokens: 1500,
      user: JSON.stringify({ step: "choose", patient, library: lib.map((r) => ({
        id: r.id, titleEn: r.titleEn, titleAr: r.titleAr, ageGroup: r.ageGroup, category: r.category, summary: clip(r.summaryEn ?? r.summary, 240) })) }),
    });
    choices = validateChoices(raw, libIds);
    if (!choices.length) {
      throw new PlanError(422, clip(raw.noMatchReasonAr, 400) ?? "لم يجد المساعدُ في المكتبة بروتوكولاً يناسب هذه الحالة — اختر يدوياً");
    }
  }

  const chosen = await getProtocol(choices[0].protocolId);
  if (!chosen || chosen.isArchived) throw new PlanError(404, "البروتوكول غير موجود");
  const allowedRows = chosen.devices.filter((d) => d.evidence !== "not_recommended" && d.availableBranchIds.includes(p.branchId));
  const allowed: AllowedLine[] = allowedRows.map((d) => ({ deviceId: Number(d.deviceId), minutes: d.minutes, nameAr: d.nameAr, nameEn: d.nameEn }));
  const dose = { sessionsPerWeek: chosen.sessionsPerWeek, durationWeeks: chosen.durationWeeks, sessionMinutes: chosen.sessionMinutes };
  const rawAdj = await complete({
    system: SYSTEM_ADJUST, model: "sonnet", maxTokens: 3000,
    user: JSON.stringify({ step: "adjust", patient, protocol: {
      id: chosen.id, titleEn: chosen.titleEn, titleAr: chosen.titleAr, ageGroup: chosen.ageGroup, dose,
      goals: clip(chosen.goalsEn ?? chosen.goals, 1500), contraindications: clip(chosen.contraindicationsEn ?? chosen.contraindications, 2000),
      precautions: clip(chosen.precautionsEn ?? chosen.precautions, 2000),
      devices: allowedRows.map((d) => ({ deviceId: Number(d.deviceId), nameEn: d.nameEn, nameAr: d.nameAr, evidence: d.evidence, minutes: d.minutes,
        parameters: clip(d.parametersEn ?? d.parameters, 300), note: clip(d.noteEn ?? d.note, 300) })),
    } }),
  });
  const result: SuggestionResult = validateAdjustments(rawAdj, allowed, dose);

  const titleOf = new Map(lib.map((r) => [r.id, r]));
  const richChoices = choices.map((c) => ({ ...c, titleAr: titleOf.get(c.protocolId)?.titleAr ?? null, titleEn: titleOf.get(c.protocolId)?.titleEn ?? null,
    status: titleOf.get(c.protocolId)?.status ?? null, ageGroup: titleOf.get(c.protocolId)?.ageGroup ?? null }));
  const [row] = await db.insert(physioPlanSuggestions).values({
    patientId: p.patientId, branchId: p.branchId, protocolId: chosen.id,
    input: patient, choices: richChoices, result: { ...result, protocolDevices: allowed.length },
    createdBy: p.actor.userId, createdByName: p.actor.name,
  }).returning();
  return present(row, allowed);
}

/** الاقتراحُ كما يُعرض: البروتوكولُ المختار، والبدائل، وأجهزةُ الخطّة بأسمائها، والتعديلاتُ وأسبابُها، وما رُفض. */
export function present(row: PhysioPlanSuggestion, allowed?: AllowedLine[]) {
  const result = row.result as SuggestionResult & { protocolDevices?: number };
  const names = new Map((allowed ?? []).map((l) => [l.deviceId, l]));
  const choices = row.choices as any[];
  return {
    id: row.id, patientId: row.patientId, planId: row.planId, createdByName: row.createdByName, createdAt: row.createdAt,
    protocol: choices.find((c) => c.protocolId === row.protocolId) ?? { protocolId: row.protocolId },
    alternatives: choices.filter((c) => c.protocolId !== row.protocolId),
    devices: result.devices.map((d) => ({ ...d, nameAr: names.get(d.deviceId)?.nameAr ?? null, nameEn: names.get(d.deviceId)?.nameEn ?? null })),
    dose: result.dose, changes: result.changes, rejected: result.rejected,
    notesAr: result.notesAr, notesEn: result.notesEn, rationaleAr: result.rationaleAr, rationaleEn: result.rationaleEn,
  };
}

export async function getSuggestion(id: number): Promise<PhysioPlanSuggestion | null> {
  const [s] = await db.select().from(physioPlanSuggestions).where(eq(physioPlanSuggestions.id, id));
  return s ?? null;
}

/** اقتراحُ الخطّة إن فُتحت منه — لشارة «مقترحة بالمساعد» في صفحتها. */
export async function suggestionOfPlan(planId: number) {
  const [s] = await db.select().from(physioPlanSuggestions).where(eq(physioPlanSuggestions.planId, planId))
    .orderBy(desc(physioPlanSuggestions.id)).limit(1);
  return s ? present(s) : null;
}
