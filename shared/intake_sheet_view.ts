// **«استمارة المراجع» مكتملةً لكلّ جهاز — للعرض والطباعة** (§4.cq، ملاحظاتُ المالك ٢٠٢٦-١٠-٠٨).
//
// «حين أضغط طباعة بعد الحسم يجب أن تظهر الورقةُ تماماً بعد أن اكتملت معلوماتُها، وحين أطبعها تكون نفسَ ورقة المريض التي ملأناها
// أنا والاستعلامات، ليحفظها موظّفُ الاستعلامات في سجلّ المريض — لأننا سنترك الورق ونعتمد على الاستمارة فقط، فكن دقيقاً».
// فهذه **صورةٌ واحدة** يقرؤها ثلاثةٌ: مستطيلُ مواصفات الأجهزة في صفحة المريض، و«عرض الاستمارة»، وصفحةُ الطباعة —
// يجمعها الخادم (`GET /api/patients/:patientId/intake-sheets`) فلا تُجمع في الشاشة من خمسة أبواب.

import { SHEET_DEVICE_ROWS } from "./exam_sheet";
import { PROSTHETIC_DEVICE_SPECS } from "./case_fields";

export type SheetServiceType = "prosthetic" | "medical_support";

export interface IntakeSheetPatient {
  patientCode: string | null;
  name: string | null; phone: string | null; governorate: string | null; address: string | null;
  referralSource: string | null; referralSubSource: string | null; hadPriorCenterHistory: boolean | null;
  age: string | null; weight: string | null; height: string | null;
  injuryCause: string | null; injuryDate: string | null; injuryDateStatus: string | null; generalNotes: string | null;
}

export interface IntakeSheetMoney {
  /** النهائيُّ المعتمد للجهاز (`agreed_cost`) — `null` ما دام القرارُ لم يُحسم بالشراء. */
  total: number | null;
  /** السعرُ الأصليّ قبل الخصم أو الإهداء — `null` حين لا يُعرف. */
  originalPrice: number | null;
  /** `normal` · `discount` · `free` — من قرار الحسم. */
  priceKind: string | null;
  /** صافي ما قُبض على هذا الجهاز (والمردودُ سالبٌ فيه). */
  paid: number;
  remaining: number | null;
}

/**
 * **سطرُ «المراجعات»** — زيارةٌ من سجلّ الزيارات، و`paid` ما دُفع لهذا الجهاز **في يومها** (ملاحظةُ المالك ٢٠٢٦-١٠-٠٨: «زيارةُ
 * شراء طرف صناعي دفع ٢,٠٠٠,٠٠٠ — يبيّن بالملاحظات أنه حين اشترى دفع هذا المبلغ»). ودفعةٌ في يومٍ بلا زيارةٍ للجهاز سطرٌ مستقلّ
 * (`kind: "payment"`)، فمجموعُ `paid` في السطور = «المدفوع» في خانة المبلغ. و`paid` فارغٌ لمن لا يرى الدفعات، ولا سطرَ دفعةٍ له.
 */
export interface IntakeSheetVisit {
  /** رقمُ الزيارة؛ وسطرُ الدفعة سالبُ رقمِ أوّل دفعةٍ في يومه — مفتاحٌ لا يتصادم. */
  id: number;
  kind: "visit" | "payment";
  date: string | null;
  details: string | null;
  notes: string | null;
  /** صافي ما دُفع لهذا الجهاز في يوم السطر (والمردودُ سالب) — `null` بلا دفعٍ أو لمن لا يرى المال. */
  paid: number | null;
}

/** يومُ بغداد لتاريخٍ قياسيّ (`YYYY-MM-DD`) — التعريفُ نفسُه في التقارير (§4.bd). */
export function baghdadDayOf(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
}

/** سطرُ المبلغ تحت المراجعة: «دُفع …» أو «رُدّ …» — ولا شيءَ بلا مبلغ. */
export function sheetVisitPaidLine(v: Pick<IntakeSheetVisit, "paid">): string | null {
  if (v.paid === null || v.paid === 0) return null;
  return v.paid > 0 ? `دُفع ${v.paid.toLocaleString("en-US")} د.ع` : `رُدّ ${Math.abs(v.paid).toLocaleString("en-US")} د.ع`;
}

export interface IntakeSheet {
  episodeId: number;
  sequenceNumber: number;
  serviceType: SheetServiceType;
  requestedItem: string;
  /** أجزاءُ الطلب الإضافيّة (§4.ct) — «المطلوب: القالب + السليكون + القدم». */
  extraComponents: string[];
  status: string;
  /** تاريخُ فتح طلب هذا الجهاز — «تاريخ المراجعة» في ورقته. */
  openedAt: string | null;
  /** فرعُ العملية — منه الترويسة (كربلاء «الوارث»). */
  branchName: string | null;
  /** «نوع الإصابة»: سلسلةُ البتر للأطراف، أو نوعُ المسند وجهتُه. */
  amputationSite: string | null;
  supportType: string | null;
  injurySide: string | null;
  exam: { text: string; doctorName: string; signedAt: string | null } | null;
  /** خاناتُ الجهاز مدموجةً: كلمةُ الطبيب أوّلاً، وما ملأه الاستعلاماتُ عند البيع يسدّ فراغَها. */
  specs: Record<string, string>;
  /** الخاناتُ التي ملأها الاستعلاماتُ عند البيع (لا الطبيب). */
  filledAtSale: string[];
  /** حالُ القرار: `pending` قبله · `bought` · `not_bought` بسببه. */
  decision: { kind: "pending" | "bought" | "not_bought"; at: string | null; reason: string | null };
  /** `null` لمن لا يرى المال — فتُقفَل خانةُ المبلغ في ورقته. */
  money: IntakeSheetMoney | null;
  visits: IntakeSheetVisit[];
}

export interface IntakeSheetsResponse {
  patient: IntakeSheetPatient;
  sheets: IntakeSheet[];
  canViewMoney: boolean;
}

export const SHEET_STATUS_LABELS: Record<string, string> = {
  awaiting_exam: "بانتظار المعاينة",
  examined: "تمت المعاينة — بانتظار القرار",
  in_manufacturing: "قيد التصنيع",
  delivered: "مُسلَّم",
};

const n = (v: number) => v.toLocaleString("en-US");

/**
 * **سطرُ المبلغ في الورقة** — من قرار الحسم وحده: الكلّيّ والمدفوعُ والمتبقّي، و«مجاني» بسعره الأصليّ، و«لم يشترِ» بسببه.
 * و`null` للمال = لا يراه السائل.
 */
export function sheetMoneyLine(s: Pick<IntakeSheet, "decision" | "money">): string {
  if (s.decision.kind === "not_bought") return `لم يشترِ${s.decision.reason ? ` — ${s.decision.reason}` : ""}`;
  if (s.decision.kind === "pending") return "بانتظار قرار الحسم";
  const m = s.money;
  if (!m) return "تم الشراء";
  if (m.priceKind === "free") {
    return `مجاني${m.originalPrice ? ` — السعر الأصلي ${n(m.originalPrice)} د.ع` : ""}`;
  }
  const total = m.total ?? 0;
  const parts = [`الكلي ${n(total)} د.ع`, `المدفوع ${n(m.paid)} د.ع`, `المتبقي ${n(m.remaining ?? total - m.paid)} د.ع`];
  if (m.priceKind === "discount" && m.originalPrice && m.originalPrice > total) parts.push(`(بعد خصمٍ من ${n(m.originalPrice)})`);
  return parts.join(" · ");
}

/**
 * **صفوفُ «مجاني» في سجلّ المدفوعات** (سؤالُ المالك ٢٠٢٦-١٠-٠٨ «أنظهره مجانياً مع السعر المفترض؟» — والتوصيةُ): جهازٌ أُهدي لا تُكتب له دفعة — والمالُ لم يتحرّك فلا دفعةَ تُخترَع —
 * لكنّ السجلّ يقوله صفّاً مقروءاً: «مجاني» بسعره الأصليّ وتاريخ القرار، لا دينارَ في أيّ مجموع.
 */
export function freeDeviceRows(sheets: IntakeSheet[]): { episodeId: number; sequenceNumber: number; serviceType: SheetServiceType; date: string | null; originalPrice: number | null }[] {
  return sheets
    .filter((s) => s.decision.kind === "bought" && s.money?.priceKind === "free")
    .map((s) => ({ episodeId: s.episodeId, sequenceNumber: s.sequenceNumber, serviceType: s.serviceType, date: s.decision.at, originalPrice: s.money!.originalPrice }));
}

/**
 * **خاناتُ وصفةٍ قديمة ليست في الورقة** — حجمُ السليكون ونظامُ التعليق وقياسُ الحذاء: أُزيلت من نافذة المعاينة (§4.cq ب) لكنّ ملفّاتٍ
 * قديمة تحملها. **تُعرض حين تُكتب** في المستطيل والورقة — فما كتبه طبيبٌ لا يضيع من العرض ولا من الأرشيف المطبوع.
 */
export const SHEET_EXTRA_SPEC_ROWS: readonly { key: string; label: string }[] = PROSTHETIC_DEVICE_SPECS
  .filter((f) => !SHEET_DEVICE_ROWS.some((r) => r.key === f.key))
  .map((f) => ({ key: f.key, label: f.label }));

/** أسطرُ مواصفات الجهاز كما تُعرض: خاناتُ الورقة دائماً (أو «نوع المسند»)، والقديمةُ الإضافيةُ حين تُكتب وحدها. */
export function sheetSpecRows(s: Pick<IntakeSheet, "serviceType" | "specs">): { key: string; label: string; value: string | null }[] {
  const v = (k: string) => (typeof s.specs[k] === "string" && s.specs[k].trim() ? s.specs[k].trim() : null);
  if (s.serviceType !== "prosthetic") return [{ key: "supportType", label: "نوع المسند", value: v("supportType") }];
  return [
    ...SHEET_DEVICE_ROWS.map((r) => ({ key: r.key as string, label: r.label as string, value: v(r.key) })),
    ...SHEET_EXTRA_SPEC_ROWS.filter((r) => v(r.key)).map((r) => ({ ...r, value: v(r.key) })),
  ];
}

/**
 * **أيُّ مواصفاتٍ في «تفاصيل الحالة» يغني عنها مستطيلُ الأجهزة** — فلا تُكرَّر ولا تضيع.
 * جهازان فأكثر ⟵ كلُّها: «التفاصيل» لقطةُ آخر بيعٍ لا تُنسَب لجهازٍ بعينه (§4.q)، والمستطيلُ يقول كلَّ جهازٍ بسطره.
 * جهازٌ واحد ⟵ ما يظهر في سطره بقيمته وحده؛ وما خلا منه سطرُه (ملفٌّ قديمٌ بلا معاينةٍ للجهاز) يبقى في «التفاصيل» كما كان.
 */
export function specKeysCoveredBySheets(sheets: IntakeSheet[], caseType: string, deviceSpecKeys: Iterable<string>): Set<string> {
  const mine = sheets.filter((s) => s.serviceType === caseType);
  if (mine.length === 0) return new Set();
  if (mine.length >= 2) return new Set(deviceSpecKeys);
  const one = mine[0];
  const out = new Set(sheetSpecRows(one).filter((r) => r.value).map((r) => r.key));
  if (one.amputationSite) out.add("amputationSite");
  if (one.injurySide) out.add("injurySide");
  return out;
}
