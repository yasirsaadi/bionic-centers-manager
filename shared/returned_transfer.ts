// **«المُرجَعون من الطبيب» — الإلغاءُ والتحويل** (§4.gu — قرارُ المالك ٢٠٢٦-١١-٢٢). منطقٌ خالص يقرؤه الخادمُ والشاشة.
//
// المالك: «حين أعيد معاينة للاستعلامات يجب أن يتمكّن من إمّا إلغائها أو تحويل المريض من علاج طبيعي إلى أطراف أو بالعكس، لأن غالباً
// أسباب الإعادة هذه». فالتحويلُ **بين العلاج الطبيعيّ وقسمَي الجهاز** وحده: من الأطراف أو المساند ⟵ العلاج الطبيعيّ، ومن العلاج الطبيعيّ ⟵
// الأطراف أو المساند. (وبين الأطراف والمساند لا تحويل — ليس ممّا طلبه المالك.)

export type TransferDepartment = "prosthetic" | "medical_support" | "physiotherapy";

export const TRANSFER_DEPARTMENT_LABELS: Record<TransferDepartment, string> = {
  prosthetic: "أطراف",
  medical_support: "مساند",
  physiotherapy: "علاج طبيعي",
};

/** الأقسامُ التي يُحوَّل إليها صفٌّ مُرجَع — غيرُ قسمه، **والعلاجُ الطبيعيّ في فروعه وحدها** (`offersPhysio`). */
export function transferTargets(serviceType: string, branchOffersPhysio: boolean): TransferDepartment[] {
  if (serviceType === "physiotherapy") return ["prosthetic", "medical_support"];
  if (serviceType === "prosthetic" || serviceType === "medical_support") return branchOffersPhysio ? ["physiotherapy"] : [];
  return [];
}

/** رابطُ ورقة «طلب معاينة جديدة» بالقسم الهدف والطلبِ الذي تُلغيه. */
export function transferHref(patientId: number, target: TransferDepartment, requestId: number, from: string): string {
  return `/patients/${patientId}/new-exam?dept=${target}&replaces=${requestId}&from=${from}`;
}

/** رابطُ «إعادة إرسال للمعاينة» لصفّ علاجٍ طبيعيّ مُرجَع — ورقةُ القسم نفسِه بلا طلبٍ يُلغى، و«رجوع» منها إلى «المُرجَعون». */
export function resendPhysioHref(patientId: number): string {
  return `/patients/${patientId}/new-exam?dept=physiotherapy&back=returned`;
}

/**
 * **ما تقرؤه ورقةُ «طلب معاينة جديدة» من رابطها** — عكسُ `transferHref` و`resendPhysioHref` بحرفهما (حارسُ ط في
 * `test:new-exam-request`): `replaces` الطلبُ المُرجَع الذي يُلغيه الإرسال، و`from` قسمُه للّافتة، و«رجوع» إلى «المُرجَعون» لهما.
 */
export function parseNewExamQuery(search: string): {
  dept: string | null; replacesRequestId: number | null; from: string | null; backToReturned: boolean;
} {
  const qs = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const n = Number(qs.get("replaces"));
  const replacesRequestId = Number.isInteger(n) && n > 0 ? n : null;
  return {
    dept: qs.get("dept"), replacesRequestId, from: qs.get("from"),
    backToReturned: replacesRequestId !== null || qs.get("back") === "returned",
  };
}

/** جسمُ `POST …/new-exam-request` بالطلب الذي يُستبدَل إن وُجد — الورقتان تبنيانه بهذه الدالّة وحدها. */
export function withReplaces<T extends Record<string, unknown>>(body: T, replacesRequestId: number | null | undefined): T & { replacesRequestId?: number } {
  return replacesRequestId ? { ...body, replacesRequestId } : body;
}

/** لافتةُ ورقة التحويل. */
export function transferBannerText(from: string | null | undefined): string {
  const label = from && from in TRANSFER_DEPARTMENT_LABELS ? TRANSFER_DEPARTMENT_LABELS[from as TransferDepartment] : "القسم السابق";
  return `تحويل من قسم ${label} — يُلغى الطلب المُرجَع ويُغلق القسم القديم إن كان فارغاً`;
}

/** ما وقع للقسم القديم — سطرُ الإشعار بعد الإلغاء أو التحويل. */
export function closureOutcomeText(r: { closed?: boolean | null; keptBecause?: string | null } | null | undefined): string {
  if (!r) return "";
  return r.closed
    ? "وأُغلق القسم القديم لأنه كان فارغاً."
    : `وبقي القسم القديم مفتوحاً${r.keptBecause ? ` — ${r.keptBecause}` : ""}.`;
}

export function transferOutcomeText(r: { oldCaseClosed?: boolean | null; oldCaseKeptBecause?: string | null } | null | undefined): string {
  if (!r) return "أُلغي الطلب المُرجَع.";
  return `أُلغي الطلب المُرجَع ${closureOutcomeText({ closed: r.oldCaseClosed, keptBecause: r.oldCaseKeptBecause })}`;
}

/**
 * **نوعُ الطلب على بطاقة المُرجَع** (§4.gu التكملة ٣). طلبُ العلاج الطبيعيّ — الصريحُ من «طلب معاينة جديدة» والضمنيُّ من
 * `return-implicit` — يُكتب بنوع `other` لأنّه لا جهازَ له، فكانت البطاقةُ تقول «أخرى» ولا تعني شيئاً للاستعلامات. فهو «طلب معاينة»
 * (والقسمُ في شارته بجانبه)، والأجهزةُ بتسمية نوعها كما كانت.
 */
export function returnedKindLabel(serviceType: string, reviewKind: string, labels: Record<string, string>): string {
  if (serviceType === "physiotherapy" && reviewKind === "other") return "طلب معاينة";
  return labels[reviewKind] ?? reviewKind;
}
