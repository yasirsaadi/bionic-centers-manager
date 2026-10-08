// **ما دُفع في كلّ زيارة** (ملاحظاتُ المالك ٢٠٢٦-١٠-٠٨، §4.cv) — قاعدةٌ واحدة تقرؤها ثلاثة: «المراجعات» في ورقة الجهاز،
// وسجلُّ الزيارات في صفحة المريض («عاد واشترى القالب — وتحتها خفيفاً أنه دفع مليوناً»)، وطباعةُ السجلّ الكامل.
// منطقٌ خالص، بلا قاعدةٍ ولا شبكة. والزيارةُ والدفعةُ صفّان مستقلّان كما كانا — هذا عرضٌ يجمعهما، لا كتابة.
//
// ══ أيُّ زيارةٍ تحمل الدفعة ═══════════════════════════════════════════════════════════════════════════════════
// ١) دفعةٌ تحمل رقمَ زيارتها (`visit_id` — دفعةُ الصيانة والجلسة) ⟵ تلك الزيارة.
// ٢) وإلّا فزيارةٌ في **يوم بغداد نفسِه** (§4.bd)، من **جهازها** إن كان لها جهازٌ وله زيارةٌ يومها، وإلّا من **قسمها** بلا
//    زيارةِ جهازٍ آخر — فلا تُكتب دفعةُ القالب تحت جلسة علاجٍ طبيعيّ، ولا دفعةُ جهازٍ تحت زيارة جهازٍ غيره. ودفعةٌ قديمة بلا جهازٍ ولا
//    قسم تقع على أيّ زيارةٍ في يومها.
// ٣) ومن المرشّحات **الأقربُ وقتاً**: دفعةُ «إتمام البيع» تُكتب في لحظة زيارة الشراء نفسِها، فلا تقع على «طلب معاينة طبية» صباحَ اليوم نفسِه.
// ٤) ولا زيارةَ تصلح ⟵ الدفعةُ **بلا زيارة** — تقولها الورقةُ والطباعةُ سطرَ «دفعة» بتاريخه، فلا دينارَ يغيب.
// وسطرُ المبلغ تحت الزيارة نصٌّ واحد: `sheetVisitPaidLine` («دُفع …» أو «رُدّ …»).
import { baghdadDayOf } from "./intake_sheet_view";

export interface VisitForPayments {
  id: number;
  date: string | null;
  deviceEpisodeId?: number | null;
  caseId?: number | null;
}

export interface PaymentForVisits {
  id: number;
  amount: number;
  date: string | null;
  visitId?: number | null;
  deviceEpisodeId?: number | null;
  caseId?: number | null;
}

export interface VisitPayments<P> {
  /** رقمُ الزيارة ⟵ صافي ما دُفع عليها (والمردودُ سالب) ودفعاتُها بترتيبها. */
  byVisit: Map<number, { sum: number; payments: P[] }>;
  /** دفعاتٌ لا زيارةَ تحملها — بترتيب التاريخ. */
  unattached: P[];
}

const timeOf = (d: string | null | undefined): number => {
  if (!d) return NaN;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? NaN : t;
};

export function attachPaymentsToVisits<P extends PaymentForVisits>(
  visits: readonly VisitForPayments[], payments: readonly P[],
): VisitPayments<P> {
  const byVisit = new Map<number, { sum: number; payments: P[] }>();
  const unattached: P[] = [];
  const dayOfVisit = new Map<number, string | null>(visits.map((v) => [v.id, baghdadDayOf(v.date)]));
  const ordered = [...payments].sort((a, b) => (timeOf(a.date) || 0) - (timeOf(b.date) || 0) || a.id - b.id);

  for (const p of ordered) {
    let target: VisitForPayments | undefined =
      p.visitId !== null && p.visitId !== undefined ? visits.find((v) => v.id === p.visitId) : undefined;
    if (!target) {
      const day = baghdadDayOf(p.date);
      const sameDay = day ? visits.filter((v) => dayOfVisit.get(v.id) === day) : [];
      const dev = p.deviceEpisodeId ?? null;
      const cs = p.caseId ?? null;
      let pool: VisitForPayments[];
      if (dev !== null && sameDay.some((v) => v.deviceEpisodeId === dev)) {
        pool = sameDay.filter((v) => v.deviceEpisodeId === dev);
      } else if (cs !== null) {
        pool = sameDay.filter((v) => v.caseId === cs
          && (dev === null || v.deviceEpisodeId === null || v.deviceEpisodeId === undefined || v.deviceEpisodeId === dev));
      } else if (dev === null) {
        pool = sameDay;
      } else {
        pool = [];
      }
      const pt = timeOf(p.date);
      target = pool.reduce<VisitForPayments | undefined>((best, v) => {
        if (!best) return v;
        const dv = Math.abs(timeOf(v.date) - pt);
        const db = Math.abs(timeOf(best.date) - pt);
        return dv < db || (dv === db && v.id < best.id) ? v : best;
      }, undefined);
    }
    if (!target) { unattached.push(p); continue; }
    const cur = byVisit.get(target.id) ?? { sum: 0, payments: [] };
    cur.sum += Number(p.amount ?? 0);
    cur.payments.push(p);
    byVisit.set(target.id, cur);
  }
  return { byVisit, unattached };
}

/**
 * **زياراتُ الجهاز التي لا تحمل رقمَه** — «طلب معاينة طبية» و«عاد للشراء» (§4.cv): تُكتبان بلا ربطٍ بالحلقة عمداً (طلبٌ خاطئ
 * يبقى قابلاً للسحب)، والخادمُ يعرفهما بلحظة كتابتهما ويضعهما في ورقة الجهاز. فمن الأوراق يُعرف جهازُ كلّ زيارةٍ فيها.
 */
export function visitDevicesFromSheets(sheets: readonly { episodeId: number; visits: readonly { id: number; kind: string }[] }[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const s of sheets) for (const v of s.visits) if (v.kind === "visit") out.set(v.id, s.episodeId);
  return out;
}

// ══ **السجلُّ الكامل للمريض — للطباعة** (طلبُ المالك ٢٠٢٦-١٠-٠٨، §4.cv) ════════════════════════════════════════════
// «حين يطلبها المريضُ أو تُعطى له ستكون مرجعَه لكلّ ما حدث معه في مجموعة مراكز الدكتور ياسر الساعدي بالتفصيل».
// فكلُّ زيارةٍ سطرٌ بتاريخها وسببها وجهازها، وتحتها ما دُفع يومها؛ وكلُّ دفعةٍ لا زيارةَ تحملها سطرُ «دفعة» بوصفها — فمجموعُ
// المدفوع في السطور = مجموعُ دفعات المريض، لا دينارَ يغيب. والمالُ كلُّه غائبٌ لمن لا تصله الدفعات (`payments === null`).

export interface RecordVisitIn {
  id: number;
  date: string | null;
  details?: string | null;
  notes?: string | null;
  treatmentType?: string | null;
  deviceEpisodeId?: number | null;
  caseId?: number | null;
}

export interface RecordPaymentIn extends PaymentForVisits {
  notes?: string | null;
  /** وصفُ الدفعة المشتقّ للعرض (`displayDescription`) — يسبق الملاحظة الخام. */
  description?: string | null;
  treatmentType?: string | null;
}

export interface RecordRow {
  key: string;
  kind: "visit" | "payment";
  date: string | null;
  title: string;
  notes: string | null;
  /** «الجهاز #1 — القالب» حين تخصّ جهازاً. */
  device: string | null;
  /** صافي ما دُفع في السطر — `null` بلا مبلغٍ أو لمن لا يرى الدفعات. */
  paid: number | null;
}

/**
 * **مالُ الورقة المطبوعة بقاعدة الاستمارة** — الدفعاتُ لا تُطبع إلّا لمن يصله المالُ في البابين معاً: صفحةُ المريض (`canViewPayments`)
 * و«استمارة المراجع» (`canViewMoney` — والطبيبُ والخبيرُ لا يريان مبالغها ولو حمل حسابُهما «عرض الدفعات»، §4.cq). فالورقةُ التي
 * تُعطى للمريض لا تطبع مالاً لا تقوله ورقةُ جهازه للطابع نفسِه.
 */
export function recordPayments<P>(payments: readonly P[] | null | undefined, canViewMoney: boolean | null | undefined): readonly P[] | null {
  return Array.isArray(payments) && canViewMoney === true ? payments : null;
}

export function patientRecordRows(input: {
  visits: readonly RecordVisitIn[];
  payments: readonly RecordPaymentIn[] | null;
  /** رقمُ الجهاز ⟵ عنوانُه للطباعة. */
  deviceLabels: ReadonlyMap<number, string>;
  /** زياراتُ الجهاز التي لا تحمل رقمَه (`visitDevicesFromSheets`). */
  visitDevices: ReadonlyMap<number, number>;
}): { rows: RecordRow[]; totalPaid: number | null } {
  const deviceOf = (v: RecordVisitIn) => v.deviceEpisodeId ?? input.visitDevices.get(v.id) ?? null;
  const att = input.payments
    ? attachPaymentsToVisits(
        input.visits.map((v) => ({ id: v.id, date: v.date, deviceEpisodeId: deviceOf(v), caseId: v.caseId ?? null })),
        input.payments,
      )
    : null;
  const label = (ep: number | null | undefined) => (ep === null || ep === undefined ? null : input.deviceLabels.get(ep) ?? null);
  const clean = (t: string | null | undefined) => (typeof t === "string" && t.trim() ? t.trim() : null);

  const rows: RecordRow[] = input.visits.map((v) => {
    const details = clean(v.details);
    const treatment = clean(v.treatmentType);
    const notes = clean(v.notes);
    const title = details ?? treatment ?? notes ?? "زيارة";
    const sub = [details && treatment && treatment !== details ? treatment : null, details || treatment ? notes : null].filter(Boolean);
    const hit = att?.byVisit.get(v.id);
    return {
      key: `v${v.id}`, kind: "visit", date: v.date, title, notes: sub.length ? sub.join(" — ") : null,
      device: label(deviceOf(v)), paid: hit ? hit.sum : null,
    };
  });
  for (const p of att?.unattached ?? []) {
    rows.push({
      key: `p${p.id}`, kind: "payment", date: p.date, title: "دفعة",
      notes: clean(p.description) ?? clean(p.notes) ?? clean(p.treatmentType),
      device: label(p.deviceEpisodeId), paid: Number(p.amount ?? 0),
    });
  }
  rows.sort((a, b) => String(a.date ?? "").localeCompare(String(b.date ?? "")) || a.key.localeCompare(b.key));
  const totalPaid = input.payments ? input.payments.reduce((t, p) => t + Number(p.amount ?? 0), 0) : null;
  return { rows, totalPaid };
}
