// **«استمارة مراجع — علاج طبيعي» مكتملةً — للعرض والطباعة** (§4.da — المرحلةُ الثالثة، قرارُ المالك ٢٠٢٦-١٠-٠٩).
//
// «ورقةٌ واحدة في ثلاثة أماكن»: الاستعلاماتُ تملؤها (`PhysioSheetCreate`)، والفاحصُ يكملها في المعاينة (`PhysioExamSheetForm`)، وهنا
// **تُقرأ مكتملةً** في ملفّ المريض وتُطبع. **وكلُّ خانةٍ تُقرأ من مكانها** — لا نسخةَ ثانية: حقولُ الاستعلامات من الملفّ، والمعايناتُ
// بتقييمها من `medical_exams`، والخطّةُ والتقدّمُ من `physio_plans` وتقييماتها، والمالُ من قسم العلاج الطبيعي ودفعاته، والجلساتُ بحساب
// صفحة المريض نفسِه (`physioSessionRows`)، والمراجعاتُ من سجلّ الزيارات وتحت كلٍّ منها ما دُفع يومها (`attachPaymentsToVisits`).
// يجمعها الخادم (`GET /api/patients/:patientId/physio-sheet`) — والشاشتان (العرضُ والطباعة) لا تحسبان شيئاً.

import type { IntakeSheetPatient } from "./intake_sheet_view";
import type { InjuryEntry } from "./case_fields";
import type { PhysioInitialAssessment } from "./physio_initial_assessment";

export interface PhysioSheetPatient extends IntakeSheetPatient {
  referralNotes: string | null;
  /** «سبب المراجعة» — الشكوى بكلمات المراجع (ترحيل ١٢١). */
  presentingComplaint: string | null;
  injuries: InjuryEntry[];
  /** تاريخُ التسجيل — «تاريخ المراجعة» في الورقة. */
  registeredAt: string | null;
}

/** معاينةُ علاجٍ طبيعيّ فعّالة — الأحدثُ أوّلاً. */
export interface PhysioSheetExam {
  id: number;
  version: number;
  doctorName: string;
  signedAt: string | null;
  diagnosis: string | null;
  /** «العلاج الموصوف وعدد الجلسات» من الوصفة. */
  treatments: { treatmentType: string; sessionCount: number | null }[];
  /** «ملاحظات الفاحص» — وللمعاينة القديمة (قبل الاستمارة) خاناتُها الأربع بعناوينها في هذا النصّ نفسِه. */
  notes: string | null;
  /** التقييمُ الأوّليّ (`BC-PT-01`) — `null` لمعاينةٍ قبل الاستمارة. */
  assessment: PhysioInitialAssessment | null;
  /** سطرُه المختصر بالعربية (`assessmentSummaryAr`). */
  assessmentSummary: string | null;
}

export interface PhysioSheetPlan {
  id: number;
  title: string;
  protocolName: string | null;
  sessionsPerWeek: number | null;
  durationWeeks: number | null;
  sessionMinutes: number | null;
  /** ترحيل ١٢٣ (§4.dd) — عددُ الجلسات أساسُ الجرعة. */
  totalSessions?: number | null;
  status: string;
  statusLabel: string;
  /** مراجعةُ المشرف بعد أن بدأها الأخصائيّ (§4.cz) — `awaiting` · `reviewed` · `null`. */
  reviewLabel: string | null;
  reviewedByName: string | null;
  decidedByName: string | null;
  createdByName: string | null;
  createdAt: string | null;
}

export interface PhysioSheetProgress {
  /** الألمُ في أوّل تقييمٍ للخطّة وآخرِه (٠–١٠). */
  firstPain: number | null;
  firstOn: string | null;
  lastPain: number | null;
  lastOn: string | null;
  /** عددُ التقييمات. */
  count: number;
  /** تحقّقُ الأهداف في آخر تقييم (٪) — `goalsPct`. */
  goalsPct: number | null;
  /** قرارُ آخر تقييم بالعربية. */
  lastDecision: string | null;
}

export interface PhysioSheetMoney {
  /** كلفةُ قسم العلاج الطبيعي (`patient_cases.cost`) — رقمٌ تراكميّ واحد للقسم. */
  total: number;
  /** صافي دفعات القسم (`payments.case_id`) — كبطاقة القسم في الملفّ. */
  paid: number;
  remaining: number;
  /** جلساتٌ مُهداةٌ بلا دينار (`is_free_sessions`). */
  freeSessions: number;
  /** خصوماتٌ معتمَدة على القسم: السعرُ قبلها وبعدها وسببُها. */
  discounts: { originalPrice: number; finalPrice: number; reason: string | null }[];
}

/** الجلساتُ لكلّ نوع: المشتراة (المدفوعة والمُهداة) · المنفّذة · المتبقّية — بحساب صفحة المريض. */
export interface PhysioSessionRow { type: string; bought: number; done: number; remaining: number }

/** سطرُ «المراجعات والجلسات» — زيارةٌ أو دفعةٌ في يومٍ بلا زيارة. */
export interface PhysioSheetVisit {
  /** رقمُ الزيارة؛ وسطرُ الدفعة سالبُ رقمِ أوّل دفعةٍ في يومه. */
  id: number;
  kind: "visit" | "payment";
  date: string | null;
  /** نوعُ الجلسة (`treatment_type`). */
  type: string | null;
  details: string | null;
  notes: string | null;
  /** «سجّلها» — اسمُ مَن كتب الزيارة. */
  recordedBy: string | null;
  /** صافي ما دُفع للقسم في يوم السطر — `null` بلا دفعٍ أو لمن لا يرى المال. */
  paid: number | null;
}

export interface PhysioSheetResponse {
  patient: PhysioSheetPatient;
  caseId: number | null;
  exams: PhysioSheetExam[];
  /** `null` بلا خطّة؛ و`canViewPlan: false` = الخانةُ مقفولةٌ للسائل (لا يقرأ الخطط). */
  plan: PhysioSheetPlan | null;
  progress: PhysioSheetProgress | null;
  canViewPlan: boolean;
  /** `null` لمن لا يرى المال — فتُقفَل خانةُ المبلغ. */
  money: PhysioSheetMoney | null;
  canViewMoney: boolean;
  sessions: PhysioSessionRow[];
  visits: PhysioSheetVisit[];
}

/** زيارةٌ لا تُعدّ جلسة: «خدمة جديدة» (تسجيلُ بيعٍ) و«استشارة طبية» — القاعدةُ نفسُها في تبويب الزيارات. */
export function isNonSessionVisit(v: { treatmentType?: string | null; details?: string | null; notes?: string | null }): boolean {
  const isServiceVisit = v.details === "خدمة جديدة" || (typeof v.notes === "string" && v.notes.startsWith("خدمة جديدة:"));
  return isServiceVisit || v.treatmentType === "استشارة طبية";
}

/**
 * **الجلساتُ لكلّ نوع** — المشتراةُ (`resolvePurchasedSessions().byType`) ناقصاً الزياراتِ بنوعها، والنوعُ الفارغ «غير محدد».
 * القاعدةُ الواحدة التي يقرؤها تبويبُ الزيارات في صفحة المريض والورقة — فلا يختلف رقمان. ونوعٌ بلا مشترى ولا منفّذ لا يُعرَض.
 */
export function physioSessionRows(
  purchasedByType: Record<string, number>,
  visits: readonly { treatmentType?: string | null; details?: string | null; notes?: string | null }[],
  unspecifiedLabel = "غير محدد",
): PhysioSessionRow[] {
  const done: Record<string, number> = {};
  for (const v of visits) {
    if (isNonSessionVisit(v)) continue;
    const type = v.treatmentType || unspecifiedLabel;
    done[type] = (done[type] ?? 0) + 1;
  }
  const types = Array.from(new Set([...Object.keys(purchasedByType), ...Object.keys(done)]));
  return types
    .filter((t) => (purchasedByType[t] ?? 0) > 0 || (done[t] ?? 0) > 0)
    .map((t) => ({ type: t, bought: purchasedByType[t] ?? 0, done: done[t] ?? 0, remaining: (purchasedByType[t] ?? 0) - (done[t] ?? 0) }));
}

const n = (v: number) => v.toLocaleString("en-US");

/** «تمارين تأهيلية (١٢ جلسة) · تيكار (٦ جلسات)». */
export function physioTreatmentsLine(treatments: PhysioSheetExam["treatments"]): string | null {
  const parts = treatments.filter((t) => t.treatmentType)
    .map((t) => (t.sessionCount ? `${t.treatmentType} (${t.sessionCount} جلسة)` : t.treatmentType));
  return parts.length ? parts.join(" · ") : null;
}

/** سطرُ المبلغ: الكلّي · المدفوع · المتبقّي، ثمّ المُهدى والخصوم. */
export function physioMoneyLine(m: PhysioSheetMoney): { main: string; extra: string[] } {
  const extra: string[] = [];
  if (m.freeSessions > 0) extra.push(`منها ${n(m.freeSessions)} جلسة مُهداة بلا مقابل`);
  for (const d of m.discounts) {
    extra.push(d.finalPrice === 0
      ? `مجاني — السعر الأصلي ${n(d.originalPrice)} د.ع${d.reason ? ` — ${d.reason}` : ""}`
      : `خصم ${n(d.originalPrice - d.finalPrice)} د.ع من ${n(d.originalPrice)}${d.reason ? ` — ${d.reason}` : ""}`);
  }
  return { main: `الكلي ${n(m.total)} د.ع · المدفوع ${n(m.paid)} د.ع · المتبقي ${n(m.remaining)} د.ع`, extra };
}

/** سطرُ الخطّة: البروتوكول · الجلساتُ في الأسبوع × المدّة · الحال ومَن راجعها. */
export function physioPlanLine(p: PhysioSheetPlan): { main: string; sub: string } {
  const dose = [
    p.totalSessions ? `${p.totalSessions} جلسة` : null,
    p.sessionsPerWeek ? `${p.sessionsPerWeek} جلسات في الأسبوع` : null,
    p.durationWeeks ? `لمدّة ${p.durationWeeks} أسابيع` : null,
    p.sessionMinutes ? `${p.sessionMinutes} دقيقة للجلسة` : null,
  ].filter(Boolean).join(" × ");
  const main = [p.protocolName ? `${p.title} — بروتوكول: ${p.protocolName}` : p.title, dose].filter(Boolean).join(" · ");
  const sub = [
    p.statusLabel,
    p.reviewLabel ? `${p.reviewLabel}${p.reviewedByName ? ` (${p.reviewedByName})` : ""}` : null,
    p.decidedByName ? `اعتمدها ${p.decidedByName}` : null,
    p.createdByName ? `كتبها ${p.createdByName}` : null,
  ].filter(Boolean).join(" · ");
  return { main, sub };
}

/** سطرُ التقدّم: الألمُ أوّلاً وآخراً، والأهداف، وآخرُ قرار. */
export function physioProgressLine(p: PhysioSheetProgress): string {
  const parts: string[] = [];
  if (p.firstPain !== null && p.lastPain !== null && p.count > 1) parts.push(`الألم ${p.firstPain} ⟵ ${p.lastPain} من ١٠`);
  else if (p.firstPain !== null) parts.push(`الألم ${p.firstPain} من ١٠`);
  if (p.goalsPct !== null) parts.push(`الأهداف ${p.goalsPct}٪`);
  if (p.lastDecision) parts.push(`آخر قرار: ${p.lastDecision}`);
  parts.push(`التقييمات: ${p.count}`);
  return parts.join(" · ");
}
