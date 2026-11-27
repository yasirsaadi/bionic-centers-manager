// «ملخص مرضى اليوم» (§4.gy — طلبُ المالك ٢٠٢٦-١١-٢٦، وموافقتُه على النموذج ٢٠٢٦-١١-٢٧).
//
// بطاقةٌ لكلّ مريضٍ جرى له شيءٌ في الفرع في يومٍ من أيام بغداد: منو · ليش جاء · شنو عنده · شسوّة · شنو حالته · قديم لو جديد · شدفع.
// هذا الملفُّ **خالص** (لا قاعدة): الخادمُ يقرأ الصفوفَ الخام (`server/reports/today_summary.ts`) ثمّ يبنيها هنا بطاقاتٍ،
// والصفحةُ وExcel والطباعة تقرأ البطاقاتِ نفسَها — فلا يُحسب شيءٌ مرّتين.
//
// القواعدُ (قرارُ المالك على النموذج):
//   • الحدثُ يتبع **فرعَ صفّه** (الزيارةُ والدفعةُ والجلسةُ والمعاينةُ والأمرُ كلٌّ بفرعه) — لا فرعَ تسجيل المريض. فبطاقةٌ لكلّ (مريض، فرع).
//   • «جديد» = سُجّل في هذا اليوم ولم يكن مراجعاً قبل النظام؛ وكلُّ مَن سواه «قديم» بتاريخ تسجيله.
//   • «خدمة جديدة» و«إضافة نوع حالة» ليستا حضوراً (`NON_ATTENDANCE_VISIT_DETAILS`)، والمحذوفُ والملغى لا يظهران.
//   • المالُ لمن يملك «عرض المدفوعات» وحده — ومَن لا يملكها لا يصله مبلغٌ ولا حدثُ دفعة ولا بطاقةُ «دفعة فقط».
import { SPECIALTY_LABELS, isMedicalConditionCode, patientDepartmentsLabel } from "./medical";
import { visitReasonLabel } from "./attendance";
import { STAGE_LABELS, MAINTENANCE_DONE_STAGES } from "./manufacturing";
import { workHistoryMovementLabel } from "./daily_review";
import { PLAN_STATUS_LABELS } from "./physio_plans";
import { requestedItemLabel, COMPONENT_LABELS } from "./prosthetic_parts";

export const TODAY_SUMMARY_PATH = "/reports/today-summary";
export const TODAY_SUMMARY_API = "/api/reports/today-summary";
export const TODAY_SUMMARY_TITLE = "ملخص مرضى اليوم";

export type TodayEventKind =
  | "registered" | "visit" | "session" | "exam" | "decision" | "work" | "device" | "payment" | "refund" | "free";

export interface TodayEvent {
  /** لحظةُ الحدث ISO بتوقيت UTC (`…Z`) — والواجهةُ تعرضها بساعة بغداد. */
  at: string;
  kind: TodayEventKind;
  text: string;
  /** المبلغ (موجبٌ للدفعة، والاسترجاعُ موجبٌ أيضاً بنوعه `refund`) — لمن يرى المال وحده. */
  amount?: number;
}

export type StatusTone = "ok" | "warn" | "red" | "mid";
export interface TodayStatus { text: string; tone: StatusTone }

export interface TodayCard {
  key: string;
  patientId: number;
  name: string;
  code: string | null;
  age: string | null;
  branchId: number | null;
  branchName: string | null;
  isNew: boolean;
  /** «جديد — سُجّل اليوم» · «قديم — منذ ٣/٩/٢٠٢٦» · «قديم — مراجعٌ قبل النظام» … */
  newLabel: string;
  registeredBy: string | null;
  problem: string | null;
  departments: string[];
  /** أسبابُ الحضور كما كتبها الاستعلامات — أو ما حلّ محلَّها («تسجيل» · «معاينة» · «دفعة فقط»). */
  reasons: string[];
  firstAt: string;
  /** حضر أو جرى له شيءٌ غيرُ الدفع — فالبطاقةُ بلا هذا «دفع دون أن يحضر». */
  attended: boolean;
  events: TodayEvent[];
  statuses: TodayStatus[];
  money?: { paid: number; refunded: number; remaining: number; credit: number };
}

export interface TodaySummaryTotals {
  patients: number;
  newCount: number;
  oldCount: number;
  paymentOnly: number;
  paidToday?: number;
  unpaid?: number;
}

// ═══ «شنو عنده» — قاعدةُ التقرير اليومي نفسُها (البند ٣١) ═══════════════════
export interface ProblemFields {
  medicalCondition?: string | null; amputationSite?: string | null; diseaseType?: string | null; supportType?: string | null;
  injuryType?: string | null; injuryArea?: string | null;
  isAmputee?: boolean | null; isMedicalSupport?: boolean | null; isPhysiotherapy?: boolean | null;
}
/** النصُّ الحرّ القديم أوّلاً (لا رمزُ القسم)، ثمّ التفصيل، ثمّ أقسامُ المريض بالعربية — مصدرٌ واحد للتقرير اليومي وهذه الصفحة. */
export function patientProblemText(r: ProblemFields): string | null {
  const t = (v: unknown) => (v == null ? "" : String(v).trim());
  const raw = t(r.medicalCondition);
  return (raw && !isMedicalConditionCode(raw) ? raw : "")
    || t(r.amputationSite) || t(r.diseaseType) || t(r.supportType) || t(r.injuryType) || t(r.injuryArea)
    || patientDepartmentsLabel(r) || null;
}

// ═══ يومُ بغداد ═══════════════════════════════════════════════════════════
/** يومُ بغداد (YYYY-MM-DD) للحظةٍ ISO — إزاحةٌ ثابتة +٣ (لا توقيتَ صيفيّ في العراق). */
export function baghdadYmdOf(iso: string): string {
  return new Date(new Date(iso).getTime() + 3 * 3_600_000).toISOString().slice(0, 10);
}
/** «3/9/2026» — يومُ بغداد بأرقام التطبيق (كالتواريخ في كلّ صفحاته). */
export function arabicDayLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d}/${m}/${y}`;
}
/** اليومُ صالحٌ (YYYY-MM-DD حقيقيّ) ولا يتجاوز اليوم. */
export function parseSummaryDay(raw: unknown, today: string): string | { error: string } {
  if (raw == null || raw === "") return today;
  const s = String(raw);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(`${s}T00:00:00Z`))
    || new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) !== s) return { error: "التاريخ غير صالح" };
  if (s > today) return { error: "لا ملخّصَ ليومٍ لم يأتِ بعد" };
  return s;
}

// ═══ قديم لو جديد ═════════════════════════════════════════════════════════
export function newOrOld(p: { createdAt: string; priorHistory: boolean }, day: string): { isNew: boolean; label: string } {
  const reg = baghdadYmdOf(p.createdAt);
  if (reg === day) {
    return p.priorHistory
      ? { isNew: false, label: "قديم — سُجّل اليوم (مراجعٌ قبل النظام)" }
      : { isNew: true, label: "جديد — سُجّل اليوم" };
  }
  if (reg > day) return { isNew: false, label: "قديم" };
  return { isNew: false, label: p.priorHistory ? `قديم — منذ ${arabicDayLabel(reg)} (مراجعٌ قبل النظام)` : `قديم — منذ ${arabicDayLabel(reg)}` };
}

// ═══ الصفوفُ الخام كما يقرؤها الخادم ════════════════════════════════════════
export interface RawPatient extends ProblemFields {
  id: number; name: string; code: string | null; age: string | null;
  createdAt: string; priorHistory: boolean; caseTypes: string[];
}
export interface RawRegistration { patientId: number; branchId: number | null; at: string; by: string | null }
export interface RawVisit {
  patientId: number; branchId: number | null; at: string; details: string | null; treatmentType: string | null;
  caseType: string | null; isPlanSession: boolean;
}
export interface RawSession {
  patientId: number; branchId: number | null; at: string; number: number; total: number | null; title: string | null; executedBy: string | null;
}
export interface RawExam {
  patientId: number; branchId: number | null; at: string; caseType: string | null; doctor: string | null;
  diagnosis: string | null; plan: string | null; complaint: string | null;
}
export interface RawDecision {
  patientId: number; branchId: number | null; at: string; eventType: string; serviceType: string | null;
  notBoughtReason: string | null; reason: string | null; price: number | null;
}
export interface RawWork {
  patientId: number; branchId: number | null; at: string; actionType: string; toStage: string | null; fromStage: string | null;
  notes: string | null; purpose: string | null; serviceType: string | null; component: string | null;
  performer: string | null; expert: string | null;
}
export interface RawDevice {
  patientId: number; branchId: number | null; at: string; what: "opened" | "sold_ready" | "cancelled";
  caseType: string | null; requestedItem: string | null; component: string | null; extras: unknown;
}
export interface RawPayment {
  patientId: number; branchId: number | null; at: string; amount: number; free: boolean; sessions: number | null;
  treatmentType: string | null; caseType: string | null;
}
/** حالةُ المريض الآن لكلّ قسم — لقطةٌ لا حدث. */
export interface RawStatus {
  patientId: number;
  episodes: { caseType: string; status: string; followupStatus: string | null; notBoughtReason: string | null;
    orderStage: string | null; orderStatus: string | null; soldReady: boolean }[];
  maintenance: { serviceType: string | null; stage: string | null; expected: string | null }[];
  plan: { status: string; total: number | null; done: number } | null;
}
export interface RawBalance { patientId: number; branchId: number | null; cost: number; paid: number }

export interface BuildInput {
  day: string;
  withMoney: boolean;
  branchNames: Record<number, string>;
  /** ترتيبُ عرض الفروع (`sortBranchesForDisplay`) — لكلّ الفروع. */
  branchOrder: number[];
  patients: RawPatient[];
  registrations: RawRegistration[];
  visits: RawVisit[];
  sessions: RawSession[];
  exams: RawExam[];
  decisions: RawDecision[];
  works: RawWork[];
  devices: RawDevice[];
  payments: RawPayment[];
  statuses: RawStatus[];
  balances: RawBalance[];
}

const specialty = (c: string | null | undefined): string | null =>
  c ? (SPECIALTY_LABELS as Record<string, string>)[c] ?? null : null;
const clip = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const clean = (v: unknown): string => (v == null ? "" : String(v).replace(/\s+/g, " ").trim());

function examText(e: RawExam): string {
  const dept = specialty(e.caseType) ?? "طبية";
  const who = clean(e.doctor) ? ` — ${clean(e.doctor)}` : "";
  const what = clean(e.diagnosis) || clean(e.plan) || clean(e.complaint);
  return `معاينة ${dept}${who}${what ? `: ${clip(what)}` : ""}`;
}

function decisionText(d: RawDecision): string {
  const svc = specialty(d.serviceType);
  switch (d.eventType) {
    case "converted": return `تم الشراء${svc ? ` — ${svc}` : ""}`;
    case "closed_without_purchase": {
      const why = clean(d.notBoughtReason) || clean(d.reason);
      return `لم يشترِ${why ? ` — «${clip(why, 70)}»` : ""}`;
    }
    case "sale_price_corrected": return "صُحّح سعر البيع";
    case "administrative_reversal": return "أُلغيت العملية إدارياً";
    case "closed_request_cancelled": return "سُحب طلب الجهاز";
    case "closed_exam_cancelled": return "أُلغيت المعاينة";
    default: return "إجراءٌ على ملفّ البيع";
  }
}

function componentLabel(c: string | null): string {
  if (!c) return "";
  return (COMPONENT_LABELS as Record<string, string>)[c] ?? c;
}

function workText(w: RawWork): string | null {
  const expert = clean(w.expert) || clean(w.performer);
  switch (w.actionType) {
    case "created": {
      if (w.purpose === "maintenance") {
        const c = componentLabel(w.component);
        return `أمر صيانة${c ? `: ${c}` : ""}${expert ? ` — للخبير ${expert}` : ""}`;
      }
      return `أمر تصنيع جديد${expert ? ` — للخبير ${expert}` : ""}`;
    }
    case "delivered": return `سُلِّم الجهاز${clean(w.performer) ? ` — ${clean(w.performer)}` : ""}`;
    case "stage_change": {
      if (!w.toStage || w.toStage === w.fromStage) return null;
      const label = STAGE_LABELS[w.toStage] ?? w.toStage;
      if (MAINTENANCE_DONE_STAGES.has(w.toStage)) return `${label}${clean(w.performer) ? ` — ${clean(w.performer)}` : ""}`;
      return `مرحلة ${w.purpose === "maintenance" ? "الصيانة" : "التصنيع"}: ${label}`;
    }
    //  ما لا يقول للاستعلامات شيئاً عن المريض.
    case "hold_reason": case "trial_call": case "assignment_date_change": return null;
    default: return workHistoryMovementLabel(w.actionType, w.notes);
  }
}

function deviceText(d: RawDevice): string {
  const item = requestedItemLabel(d.component ?? d.requestedItem, d.caseType, d.extras);
  if (d.what === "sold_ready") return `بيع جاهز: ${item}`;
  if (d.what === "cancelled") return `أُلغي طلب ${item}`;
  return `طلب ${item}`;
}

/** حالةُ المريض الآن بأقسام بطاقته — نصٌّ قصير ونغمة. */
export function statusChips(s: RawStatus | undefined, depts: string[]): TodayStatus[] {
  if (!s) return [];
  const out: TodayStatus[] = [];
  const many = depts.length > 1;
  const pre = (c: string) => (many ? `${specialty(c) ?? ""}: ` : "");
  for (const c of depts) {
    if (c === "physiotherapy") {
      const p = s.plan;
      if (!p) out.push({ text: `${pre(c)}بلا خطّة علاج`, tone: "warn" });
      else if (p.status === "approved") {
        const left = p.total != null ? Math.max(0, p.total - p.done) : null;
        out.push({ text: `${pre(c)}خطّةٌ قائمة — ${p.total != null ? `الجلسة ${p.done} من ${p.total}${left != null ? ` · باقي ${left}` : ""}` : `${p.done} جلسة`}`, tone: "mid" });
      } else if (p.status === "graduated") out.push({ text: `${pre(c)}أنهى علاجه (تخرّج)`, tone: "ok" });
      else if (p.status === "stopped") out.push({ text: `${pre(c)}الخطّة موقوفة`, tone: "red" });
      else out.push({ text: `${pre(c)}الخطّة ${(PLAN_STATUS_LABELS as Record<string, string>)[p.status] ?? p.status}`, tone: "warn" });
      continue;
    }
    const ep = s.episodes.find((e) => e.caseType === c);
    if (ep) {
      if (ep.status === "awaiting_exam") out.push({ text: `${pre(c)}بانتظار المعاينة`, tone: "warn" });
      else if (ep.status === "examined") {
        if (ep.followupStatus === "closed_without_purchase") {
          out.push({ text: `${pre(c)}لم يشترِ`, tone: "red" });
        } else out.push({ text: `${pre(c)}تمت المعاينة — بانتظار القرار`, tone: "warn" });
      } else if (ep.status === "in_manufacturing") {
        if (ep.orderStage === "ready_for_fitting") out.push({ text: `${pre(c)}جاهز للتجربة والتسليم`, tone: "ok" });
        else if (ep.orderStage) out.push({ text: `${pre(c)}قيد التصنيع — ${STAGE_LABELS[ep.orderStage] ?? ep.orderStage}`, tone: "mid" });
        else if (ep.soldReady) out.push({ text: `${pre(c)}بيعَ جاهزاً`, tone: "ok" });
        else out.push({ text: `${pre(c)}تم الشراء — بانتظار إسناد خبير`, tone: "warn" });
      } else if (ep.status === "delivered") out.push({ text: `${pre(c)}مُسلَّم`, tone: "ok" });
    }
    for (const m of s.maintenance.filter((x) => (x.serviceType ?? c) === c)) {
      const when = m.expected ? ` — التسليم ${arabicDayLabel(String(m.expected).slice(0, 10))}` : "";
      out.push({ text: `${pre(c)}صيانة قيد العمل${when}`, tone: "mid" });
    }
  }
  return out;
}

function fmtTreatment(p: RawPayment): string {
  const t = clean(p.treatmentType);
  const n = p.sessions && p.sessions > 0 ? `${String(p.sessions)} جلسة` : "";
  return [t, n].filter(Boolean).join(" · ");
}

/** دفعاتُ الحفظة الواحدة (صفٌّ لكلّ نوع علاجٍ، متتاليةٌ خلال ١٠ ثوانٍ) دفعةٌ واحدة — كقاعدة التحيّة (§4.gw). */
export function mergeSaves(rows: RawPayment[]): RawPayment[] {
  const sorted = [...rows].sort((a, b) => a.at.localeCompare(b.at));
  const out: RawPayment[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && last.patientId === r.patientId && last.branchId === r.branchId && Math.sign(last.amount) === Math.sign(r.amount)
      && last.free === r.free && Math.abs(new Date(r.at).getTime() - new Date(last.at).getTime()) <= 10_000) {
      last.amount += r.amount;
      last.sessions = (last.sessions ?? 0) + (r.sessions ?? 0) || null;
      const types = [clean(last.treatmentType), clean(r.treatmentType)].filter(Boolean);
      last.treatmentType = Array.from(new Set(types)).join(" + ") || null;
    } else out.push({ ...r });
  }
  return out;
}

const caseOfWork = (w: RawWork) => (w.serviceType === "prosthetic" || w.serviceType === "medical_support" ? w.serviceType : null);

/** البطاقاتُ والمجاميع — مصدرٌ واحد للشاشة وExcel والطباعة. */
export function buildTodayCards(inp: BuildInput): { cards: TodayCard[]; totals: TodaySummaryTotals } {
  const P = new Map(inp.patients.map((p) => [p.id, p]));
  type Acc = { patientId: number; branchId: number | null; events: TodayEvent[]; reasons: string[]; depts: Set<string>;
    attended: boolean; registeredBy: string | null; paid: number; refunded: number };
  const acc = new Map<string, Acc>();
  const get = (patientId: number, branchId: number | null): Acc | null => {
    if (!P.has(patientId)) return null;
    const k = `${patientId}:${branchId ?? 0}`;
    let a = acc.get(k);
    if (!a) {
      a = { patientId, branchId, events: [], reasons: [], depts: new Set(), attended: false, registeredBy: null, paid: 0, refunded: 0 };
      acc.set(k, a);
    }
    return a;
  };
  const addReason = (a: Acc, r: string | null) => { if (r && !a.reasons.includes(r)) a.reasons.push(r); };

  for (const r of inp.registrations) {
    const a = get(r.patientId, r.branchId); if (!a) continue;
    const prior = P.get(r.patientId)!.priorHistory;
    a.events.push({ at: r.at, kind: "registered", text: `${prior ? "سُجّل في النظام (مراجعٌ قبل النظام)" : "سُجّل في المركز"}${r.by ? ` — سجّله ${r.by}` : ""}` });
    a.registeredBy = r.by; a.attended = true;
  }
  for (const v of inp.visits) {
    const a = get(v.patientId, v.branchId); if (!a) continue;
    a.attended = true;
    if (v.caseType) a.depts.add(v.caseType);
    const reason = visitReasonLabel(v.details, v.caseType);
    addReason(a, v.isPlanSession ? "جلسة من الخطة" : reason ?? "زيارة");
    //  زيارةُ جلسة الخطة يقولها حدثُ الجلسة نفسُه (رقمُها ومنفّذُها) — فلا تُكتب مرّتين.
    if (v.isPlanSession) continue;
    const t = clean(v.treatmentType);
    a.events.push({ at: v.at, kind: "visit", text: `${reason ?? "زيارة"}${t && v.caseType === "physiotherapy" ? ` — ${t}` : ""}` });
  }
  for (const s of inp.sessions) {
    const a = get(s.patientId, s.branchId); if (!a) continue;
    a.attended = true; a.depts.add("physiotherapy");
    addReason(a, "جلسة من الخطة");
    const n = String(s.number);
    const of = s.total ? ` من ${s.total}` : "";
    a.events.push({ at: s.at, kind: "session", text: `الجلسة ${n}${of}${clean(s.title) ? ` — ${clean(s.title)}` : ""}${clean(s.executedBy) ? ` — نفّذها ${clean(s.executedBy)}` : ""}` });
  }
  for (const e of inp.exams) {
    const a = get(e.patientId, e.branchId); if (!a) continue;
    a.attended = true; if (e.caseType) a.depts.add(e.caseType);
    a.events.push({ at: e.at, kind: "exam", text: examText(e) });
  }
  for (const d of inp.decisions) {
    const a = get(d.patientId, d.branchId); if (!a) continue;
    a.attended = true; if (d.serviceType) a.depts.add(d.serviceType);
    const ev: TodayEvent = { at: d.at, kind: "decision", text: decisionText(d) };
    if (inp.withMoney && d.eventType === "converted" && d.price != null && d.price > 0) ev.amount = d.price;
    a.events.push(ev);
  }
  for (const w of inp.works) {
    const text = workText(w); if (!text) continue;
    const a = get(w.patientId, w.branchId); if (!a) continue;
    a.attended = true; const c = caseOfWork(w); if (c) a.depts.add(c);
    a.events.push({ at: w.at, kind: "work", text });
  }
  for (const d of inp.devices) {
    const a = get(d.patientId, d.branchId); if (!a) continue;
    a.attended = true; if (d.caseType) a.depts.add(d.caseType);
    a.events.push({ at: d.at, kind: "device", text: deviceText(d) });
  }
  if (inp.withMoney) {
    for (const p of mergeSaves(inp.payments)) {
      const a = get(p.patientId, p.branchId); if (!a) continue;
      if (p.caseType) a.depts.add(p.caseType);
      const detail = fmtTreatment(p);
      if (p.amount > 0) {
        a.paid += p.amount;
        a.events.push({ at: p.at, kind: "payment", text: detail ? `دفع — ${detail}` : "دفع", amount: p.amount });
      } else if (p.amount < 0) {
        a.refunded += -p.amount;
        a.events.push({ at: p.at, kind: "refund", text: "استرجاع مبلغ", amount: -p.amount });
      } else if (p.free) {
        a.events.push({ at: p.at, kind: "free", text: detail ? `جلسات مجّانية — ${detail}` : "جلسات مجّانية" });
      }
    }
  }

  const statusOf = new Map(inp.statuses.map((s) => [s.patientId, s]));
  const balOf = new Map(inp.balances.map((b) => [`${b.patientId}:${b.branchId ?? 0}`, b]));
  const order = new Map(inp.branchOrder.map((id, i) => [id, i]));
  const cards: TodayCard[] = [];
  for (const [key, a] of Array.from(acc.entries())) {
    if (!a.events.length) continue;
    a.events.sort((x, y) => x.at.localeCompare(y.at));
    const p = P.get(a.patientId)!;
    const no = newOrOld({ createdAt: p.createdAt, priorHistory: p.priorHistory }, inp.day);
    const depts = a.depts.size ? Array.from(a.depts) : p.caseTypes;
    const deptOrder = ["prosthetic", "medical_support", "physiotherapy"];
    depts.sort((x, y) => deptOrder.indexOf(x) - deptOrder.indexOf(y));
    if (!a.reasons.length) {
      const k = a.events[0].kind;
      a.reasons.push(!a.attended ? "لم يحضر — دفعة فقط" : k === "exam" ? "معاينة" : k === "work" ? "متابعة عند الخبير" : k === "decision" ? "قرار الشراء" : "مراجعة");
    }
    const card: TodayCard = {
      key, patientId: a.patientId, name: p.name, code: p.code, age: p.age,
      branchId: a.branchId, branchName: a.branchId != null ? inp.branchNames[a.branchId] ?? null : null,
      isNew: no.isNew, newLabel: no.label, registeredBy: a.registeredBy,
      problem: patientProblemText(p),
      departments: depts.map((c) => specialty(c)).filter((x): x is string => Boolean(x)),
      reasons: a.reasons, firstAt: a.events[0].at, attended: a.attended, events: a.events,
      statuses: statusChips(statusOf.get(a.patientId), depts),
    };
    if (inp.withMoney) {
      const b = balOf.get(key);
      const net = b ? b.cost - b.paid : 0;
      card.money = { paid: a.paid, refunded: a.refunded, remaining: Math.max(0, net), credit: Math.max(0, -net) };
    }
    cards.push(card);
  }
  cards.sort((x, y) =>
    Number(!x.attended) - Number(!y.attended)
    || (order.get(x.branchId ?? -1) ?? 99) - (order.get(y.branchId ?? -1) ?? 99)
    || x.firstAt.localeCompare(y.firstAt) || x.patientId - y.patientId);

  const attended = cards.filter((c) => c.attended);
  const totals: TodaySummaryTotals = {
    patients: attended.length,
    newCount: attended.filter((c) => c.isNew).length,
    oldCount: attended.filter((c) => !c.isNew).length,
    paymentOnly: cards.length - attended.length,
  };
  if (inp.withMoney) {
    totals.paidToday = cards.reduce((s, c) => s + (c.money?.paid ?? 0), 0);
    totals.unpaid = attended.filter((c) => (c.money?.paid ?? 0) === 0).length;
  }
  return { cards, totals };
}

/** المرشِّحات في الصفحة: الكلّ · جدد · قدامى، والأقسام، والبحث بالاسم أو الرمز (تطبيعٌ عربيّ بسيط). */
export type NewFilter = "all" | "new" | "old";
const norm = (s: string) => s.replace(/[إأآا]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[ً-ْ]/g, "").toLowerCase().trim();
export function filterCards(cards: TodayCard[], f: { who: NewFilter; departments: string[] | null; search: string }): TodayCard[] {
  const s = norm(f.search);
  return cards.filter((c) =>
    (f.who === "all" || (f.who === "new" ? c.isNew : !c.isNew))
    && (!f.departments || c.departments.length === 0 || c.departments.some((d) => f.departments!.includes(d)))
    && (!s || norm(c.name).includes(s) || norm(c.code ?? "").includes(s)));
}

/** صفوفُ Excel والطباعة — من البطاقات نفسِها. */
export function exportRows(cards: TodayCard[], withMoney: boolean, timeOf: (iso: string) => string): string[][] {
  const head = ["المريض", "الرمز", "العمر", "قديم/جديد", "القسم", "سبب الحضور", "شنو عنده", "ما جرى اليوم", "حالته الآن"];
  if (withMoney) head.push("دفع اليوم", "استرجاع", "المتبقي عليه");
  head.push("الفرع");
  const rows = cards.map((c) => {
    const ev = c.events.map((e) => `${timeOf(e.at)} ${e.text}${e.amount != null ? ` ${e.amount.toLocaleString("en-US")}` : ""}`).join("\n");
    const r = [c.name, c.code ?? "", c.age ?? "", c.newLabel, c.departments.join(" + "), c.reasons.join(" · "), c.problem ?? "", ev,
      c.statuses.map((s) => s.text).join(" · ")];
    if (withMoney) r.push(String(c.money?.paid ?? 0), String(c.money?.refunded ?? 0), String(c.money?.remaining ?? 0));
    r.push(c.branchName ?? "");
    return r;
  });
  return [head, ...rows];
}

/** صلاحيةُ الصفحة: المسؤولُ بسلطته، وغيرُه بالمفتاح الذي يشعله المالكُ لموظّفٍ بعينه (قرارُه ٢٠٢٦-١١-٢٧) — لا يمنحه دور. */
export function mayViewTodaySummary(s: { isAdmin?: boolean | null; permissions?: Record<string, unknown> | null } | null | undefined): boolean {
  return Boolean(s?.isAdmin) || s?.permissions?.canViewTodaySummary === true;
}
