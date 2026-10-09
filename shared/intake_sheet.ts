// **استمارةُ المراجع** (ترحيل ١١٤، §4.cq) — الورقةُ التي تُملأ باليد في الاستعلامات صارت شاشةً بهيئتها، للأطراف والمساند وحدهما.
//
// قراراتُ المالك (٢٠٢٦-١٠-٠٨):
//   • «إضافة مريض» تبدأ بخيارين: «أطراف صناعية ومساند» ⟵ الاستمارة، و«علاج طبيعي» ⟵ صفحةُ التسجيل القائمة كما هي.
//   • **حقولُ الاستعلامات كلُّها إلزامية** إلّا الملاحظات؛ وتاريخُ الإصابة تاريخٌ **أو** «منذ الولادة» **أو** «غير معروف»؛
//     والجهةُ المحوِّلة إلزامية؛ ولا هاتفَ ثانياً («ليس مهمّاً، أزِله»).
//   • والمحافظةُ خانةٌ مستقلّة بقائمة — كانت تُكتب داخل العنوان.
//   • وحفظُ الاستمارة **يرسل المريضَ إلى الطبيب طلبَ معاينة** — وللأطراف سطرُ «المطلوب»: طرفٌ كامل أو أحدُ الأجزاء الثمانية.
//   • والترويسةُ باسم فرعها: **كلُّ الفروع «بايونك» إلّا كربلاء «الوارث»**، ولكلٍّ شعارُه.
// والقاعدةُ هنا **مشتركة**: الشاشةُ تفحص بها قبل الإرسال، والخادمُ يردّ بها ما ينقص — فلا تنحرف إحداهما عن الأخرى.
import { checkAmputationSite } from "./patient_required";
import { isRequestedItem, parseRequestedItems, type RequestedItem } from "./prosthetic_parts";

/** محافظاتُ العراق التسع عشرة، و«خارج العراق» لمراجعٍ من بلدٍ آخر. */
export const IRAQ_GOVERNORATES = [
  "بغداد", "البصرة", "نينوى", "أربيل", "السليمانية", "دهوك", "حلبجة", "كركوك", "ديالى", "الأنبار",
  "صلاح الدين", "بابل", "كربلاء", "النجف", "واسط", "القادسية", "المثنى", "ذي قار", "ميسان",
] as const;
export const OUTSIDE_IRAQ = "خارج العراق";
export const GOVERNORATE_OPTIONS: readonly string[] = [...IRAQ_GOVERNORATES, OUTSIDE_IRAQ];
export const isGovernorate = (v: unknown): v is string => typeof v === "string" && GOVERNORATE_OPTIONS.includes(v);

/** **تاريخُ الإصابة حين لا تاريخ**: طفلٌ وُلد بلا كفٍّ ليس له يومُ إصابة، ومريضٌ لا يتذكّر لا يُكتب له يومٌ مخترَع. */
export const INJURY_DATE_STATUSES = ["congenital", "unknown"] as const;
export type InjuryDateStatus = (typeof INJURY_DATE_STATUSES)[number];
export const INJURY_DATE_STATUS_LABELS: Record<InjuryDateStatus, string> = { congenital: "منذ الولادة", unknown: "غير معروف" };
export const isInjuryDateStatus = (v: unknown): v is InjuryDateStatus =>
  typeof v === "string" && (INJURY_DATE_STATUSES as readonly string[]).includes(v);

/** **تاريخٌ أو حالة — لا الاثنان**: تاريخٌ مكتوب يُسقط الحالة، وحالةٌ بلا تاريخ تبقى. يطبّقه الخادمُ على الإنشاء والتعديل. */
export function normalizeInjuryDate(injuryDate: unknown, status: unknown): { injuryDate: string | null; injuryDateStatus: InjuryDateStatus | null } {
  const d = typeof injuryDate === "string" && injuryDate.trim() ? injuryDate.trim() : null;
  if (d) return { injuryDate: d, injuryDateStatus: null };
  return { injuryDate: null, injuryDateStatus: isInjuryDateStatus(status) ? status : null };
}

/**
 * **على التعديل: ما اختاره الموظّفُ الآن يغلب** — تاريخٌ مكتوب يُسقط الحالة، وحالةٌ مختارة تُسقط التاريخ القائم، وتاريخٌ يُفرَّغ
 * (نموذجُ «تعديل مريض» يرسله فارغاً في كلّ حفظ) لا يمحو حالةً قائمة. `undefined` = لم يُرسَل.
 */
export function mergeInjuryDate(
  patchDate: unknown, patchStatus: unknown, existingDate: unknown, existingStatus: unknown,
): { injuryDate: string | null; injuryDateStatus: InjuryDateStatus | null } {
  const sentDate = patchDate !== undefined;
  const sentStatus = patchStatus !== undefined;
  const d = typeof patchDate === "string" && patchDate.trim() ? patchDate.trim() : null;
  if (sentDate && d) return { injuryDate: d, injuryDateStatus: null };
  if (sentStatus && isInjuryDateStatus(patchStatus)) return { injuryDate: null, injuryDateStatus: patchStatus };
  const keptDate = sentDate ? null : (typeof existingDate === "string" && existingDate ? existingDate : null);
  if (keptDate) return { injuryDate: keptDate, injuryDateStatus: null };
  return { injuryDate: null, injuryDateStatus: !sentStatus && isInjuryDateStatus(existingStatus) ? existingStatus : null };
}

/** عرضُ تاريخ الإصابة في أيّ شاشة: التاريخُ كما هو، أو عنوانُ الحالة، أو `null`. */
export function injuryDateDisplay(injuryDate: string | null | undefined, status: string | null | undefined): string | null {
  if (injuryDate) return injuryDate;
  return isInjuryDateStatus(status) ? INJURY_DATE_STATUS_LABELS[status] : null;
}

// ══ الجهةُ المحوِّلة — **القيمُ نفسُها** في صفحة التسجيل القائمة (`CreatePatient.tsx`)، يحرس تطابقَها اختبارُ `test:intake-sheet` ══
export const REFERRAL_SOURCES = [
  "طبيبنا", "طبيب خارجي", "مستشفى", "أطباء مستشفى العين", "جهة حكومية", "منظمة انسانية",
  "فيسبوك", "انستاغرام", "تيك توك", "كوكل", "شاشة إعلان خارجية", "من شخص آخر", "دكتور بيرم",
] as const;
export const REFERRAL_OTHER_PERSON = "من شخص آخر";
export const REFERRAL_SUB_SOURCES = ["فيسبوك", "انستاغرام", "تيك توك", "واتس اب", "مريض سابق لدينا", "شاشة اعلان", "أخرى"] as const;
export const REFERRAL_SUB_OTHER = "أخرى";

// ══ الترويسة ══
export type IntakeBrand = "bionic" | "warith";
/** **كربلاء وحدها «الوارث»** — بالاسم لا بالرقم، بنمط `shared/cash_book.ts` («نسبة العتبة لكربلاء»). */
export function intakeBrandOf(branchName: string | null | undefined): IntakeBrand {
  return String(branchName ?? "").includes("كربلاء") ? "warith" : "bionic";
}
export function intakeHeader(branchName: string | null | undefined): { brand: IntakeBrand; centerName: string; city: string } {
  const brand = intakeBrandOf(branchName);
  const raw = String(branchName ?? "").trim();
  //  «كربلاء الوارث» ⟵ «كربلاء»: اسمُ المركز في السطر الأوّل، والمدينةُ وحدها في الثاني.
  const city = brand === "warith" ? "كربلاء" : raw;
  return {
    brand,
    centerName: brand === "warith" ? "مركز الوارث للأطراف الذكية والتأهيل الطبي" : "مركز بايونك للأطراف الصناعية الذكية والتأهيل الطبي",
    city,
  };
}

// ══ قسمُ الاستمارة: طرفٌ أو مسند ══
export type IntakeDepartment = "prosthetic" | "medical_support";
export const INTAKE_DEPARTMENT_LABELS: Record<IntakeDepartment, string> = { prosthetic: "أطراف صناعية (بتر)", medical_support: "مساند طبية" };

/** ما تُرسله الاستمارةُ ويُفحَص — بأسماء أعمدة `patients` نفسِها. */
export interface IntakeInput {
  name?: unknown; phone?: unknown; governorate?: unknown; address?: unknown;
  referralSource?: unknown; referralSubSource?: unknown;
  age?: unknown; weight?: unknown; height?: unknown;
  injuryCause?: unknown; injuryDate?: unknown; injuryDateStatus?: unknown;
  department?: unknown; amputationSite?: unknown; supportType?: unknown; injurySide?: unknown;
  requestedItem?: unknown;
  /** «المطلوب» مربّعاتُ اختيار (§4.ct) — قائمةٌ تغلب `requestedItem` حين تُرسَل. */
  requestedItems?: unknown;
  /** «سبب المراجعة» — في استمارة العلاج الطبيعي (§4.da). */
  presentingComplaint?: unknown;
}

/** عناوينُ ما ينقص — بألفاظ الورقة. */
export const INTAKE_FIELD_LABELS: Record<string, string> = {
  name: "اسم المراجع", phone: "رقم الهاتف", governorate: "المحافظة", address: "العنوان التفصيلي",
  referralSource: "الجهة المحوِّل منها", referralSubSource: "كيف عرف الشخص الآخر بالمركز",
  age: "العمر", weight: "الوزن", height: "الطول", injuryCause: "سبب الإصابة", injuryDate: "تاريخ الإصابة",
  department: "نوع الحالة (طرف أو مسند)", amputationSite: "تعريف البتر", supportType: "نوع المسند", injurySide: "جهة الإصابة",
  requestedItem: "المطلوب",
  presentingComplaint: "سبب المراجعة",
};

const filled = (v: unknown) => typeof v === "string" ? v.trim().length > 0 : typeof v === "number" ? Number.isFinite(v) : false;
const positive = (v: unknown) => { const n = Number(typeof v === "string" ? v.trim() : v); return filled(v) && Number.isFinite(n) && n > 0; };

/**
 * **كلُّ حقول الاستعلامات إلزامية** — والملاحظاتُ وحدها اختيارية. يُعيد المفاتيحَ الناقصة بترتيب الورقة.
 * والهاتفُ يُفحَص هنا حضوراً فقط؛ صحّتُه لمطبّع الهاتف القائم (`normalizePhone`) في الإنشاء نفسِه.
 */
export function checkIntakeSheet(v: IntakeInput): { ok: boolean; missing: string[]; message: string | null } {
  const missing: string[] = [];
  if (!filled(v.name)) missing.push("name");
  if (!filled(v.phone)) missing.push("phone");
  if (!isGovernorate(v.governorate)) missing.push("governorate");
  if (!filled(v.address)) missing.push("address");
  if (!filled(v.referralSource)) missing.push("referralSource");
  else if (v.referralSource === REFERRAL_OTHER_PERSON && !filled(v.referralSubSource)) missing.push("referralSubSource");
  if (!positive(v.age)) missing.push("age");
  if (!positive(v.weight)) missing.push("weight");
  if (!positive(v.height)) missing.push("height");
  if (!filled(v.injuryCause)) missing.push("injuryCause");
  if (!filled(v.injuryDate) && !isInjuryDateStatus(v.injuryDateStatus)) missing.push("injuryDate");
  if (v.department === "prosthetic") {
    if (!filled(v.amputationSite) || !checkAmputationSite(String(v.amputationSite)).ok) missing.push("amputationSite");
    //  **«المطلوب» قائمةٌ** (§4.ct): طرفٌ كاملٌ وحده أو جزءٌ فأكثر — `requestedItems`، والقديمُ `requestedItem` وحده.
    const items = parseRequestedItems(v.requestedItems ?? v.requestedItem, "prosthetic");
    if (!items.ok || !items.requestedItem) missing.push("requestedItem");
  } else if (v.department === "medical_support") {
    if (!filled(v.supportType)) missing.push("supportType");
    if (!filled(v.injurySide)) missing.push("injurySide");
  } else if (v.department === "physiotherapy") {
    //  **استمارةُ العلاج الطبيعي** (§4.da، قرارُ المالك ٢٠٢٦-١٠-٠٩): الحقولُ نفسُها، ومعها **«سبب المراجعة»** — الشكوى بكلمات المراجع.
    //  والإصاباتُ اختيارية (يكملها الفاحص)، و«التشخيص» للفاحص وحده.
    if (!filled(v.presentingComplaint)) missing.push("presentingComplaint");
  } else {
    missing.push("department");
  }
  return {
    ok: missing.length === 0,
    missing,
    message: missing.length ? `أكمل حقول الاستمارة: ${missing.map((k) => INTAKE_FIELD_LABELS[k] ?? k).join("، ")}` : null,
  };
}

/** «المطلوب» للأطراف: طرفٌ كامل أو جزء. */
export const isIntakeRequestedItem = (v: unknown): v is RequestedItem => isRequestedItem(v);
