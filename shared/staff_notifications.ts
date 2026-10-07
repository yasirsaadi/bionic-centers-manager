// **أنواعُ تنبيهات الموظّفين** (§4.by) — أربعةَ عشرَ نوعاً (الرابعَ عشرَ «كلُّ مبلغٍ يدخل» للمسؤول وحده). وثلاثةٌ عرضها المساعدُ ثمّ أُسقطت لأنها لا تقع اليوم:
// «خصمٌ ينتظر الاعتماد» و«خصمٌ قُرِّر» (الطلبُ يُعتمَد في حفظه نفسِه — `applyDiscountImmediatelyTx`)، و«مبلغٌ أُعيد للتصحيح»
// (`pending_service_charges` تاريخٌ لا مسار).
// — مصدرٌ واحد يقرؤه الخادمُ ولوحةُ المسؤول.
// المسؤولُ وحده يختار لكلّ موظّفٍ ما يستلمه (قرارُ المالك ٢٠٢٦-٠٤-١٠). والمستلِمون يُصفَّون فوق اختياره:
// **فرعيٌّ** ⟵ مَن يعمل في فرع الحدث (المسؤولُ في كلّها) · **موجَّه** ⟵ صاحبُ المهمّة وحده · **عامّ** ⟵ كلُّ مَن اختير له.

export type StaffEventScope = "branch" | "targeted" | "global";

export interface StaffEventDef {
  key: string;
  label: string;
  group: string;
  scope: StaffEventScope;
  /** يومي مجدول لا لحظيّ. */
  digest?: boolean;
}

export const STAFF_EVENTS: readonly StaffEventDef[] = [
  { key: "exam_request", label: "طلب معاينة جديد في «معايناتي»", group: "الطبيب", scope: "branch" },
  { key: "order_assigned", label: "أمر تصنيع أو صيانة أُسند إليه", group: "خبير الأطراف", scope: "targeted" },
  { key: "order_reassigned", label: "أمر حُوِّل إليه أو سُحب منه", group: "خبير الأطراف", scope: "targeted" },
  { key: "expert_due_digest", label: "تذكير صباحي بمواعيد التسليم (اليوم · غداً · متأخر)", group: "خبير الأطراف", scope: "targeted", digest: true },
  { key: "returned_from_doctor", label: "مريض أعاده الطبيب", group: "الاستقبال ومدير الفرع", scope: "branch" },
  { key: "awaiting_decision", label: "مريض عوين وينتظر الحسم", group: "الاستقبال ومدير الفرع", scope: "branch" },
  { key: "ready_for_fitting", label: "طرف جاهز للتركيب — يُستدعى المريض", group: "الاستقبال ومدير الفرع", scope: "branch" },
  { key: "delivered", label: "طرف سُلِّم", group: "الاستقبال ومدير الفرع", scope: "branch" },
  { key: "followups_digest", label: "تذكير صباحي بالمتابعات المستحقّة اليوم", group: "الاستقبال ومدير الفرع", scope: "branch", digest: true },
  { key: "payment_received", label: "كلّ مبلغ يدخل أيّ فرع — المبلغ والمريض والقسم والفرع", group: "المسؤول", scope: "global" },
  { key: "payment_correction_pending", label: "طلب تصحيح دفعة ينتظر القرار", group: "المسؤول", scope: "global" },
  { key: "order_hold_rework", label: "أمر تصنيع توقّف أو سُجّلت عليه إعادة عمل", group: "المسؤول", scope: "branch" },
  { key: "ai_suggestion", label: "اقتراح معرفة جديد للمساعد الذكي", group: "المسؤول", scope: "global" },
  { key: "evening_summary", label: "ملخّص يومي مسائي لكلّ فرع", group: "المسؤول", scope: "branch", digest: true },
] as const;

export const STAFF_EVENT_KEYS: readonly string[] = STAFF_EVENTS.map((e) => e.key);

export function isStaffEventKey(k: unknown): k is string {
  return typeof k === "string" && STAFF_EVENT_KEYS.includes(k);
}

export function staffEventDef(key: string): StaffEventDef | undefined {
  return STAFF_EVENTS.find((e) => e.key === key);
}

// ══ **مَن يحقّ له النوع — بالدور** (قرارُ المالك ٢٠٢٦-١٠-٠٤) ══════════════════════════════════════════════
// «هند موظّفةُ استقبال يظهر لها مربّعُ المعاينات — وهذا غير صحيح». فكلُّ موظّفٍ يُعرض له ما يخصّ دورَه وحده، والمسؤولُ
// يختار منه. **والخادمُ يرفض غيرَه، والمُرسِلُ يتخطّاه** — فتغيّرُ دور موظّفٍ يوقف ما لم يعد له بلا تنظيف.
import { hasRole } from "./user_roles";

export interface StaffEligibilityUser {
  role: string;
  /** الأدوارُ الإضافية (ترحيل ١٠٥، §4.ch) — من `extra_roles`. */
  extraRoles?: unknown;
  roles?: readonly string[] | null;
  canWriteMedicalExam?: boolean | null;
  canWorkAsExpert?: boolean | null;
}

const DOCTOR_EVENTS = ["exam_request"];
const EXPERT_EVENTS = ["order_assigned", "order_reassigned", "expert_due_digest"];
const FRONT_DESK_EVENTS = ["returned_from_doctor", "awaiting_decision", "ready_for_fitting", "delivered", "followups_digest"];
const MANAGER_EVENTS = ["order_hold_rework", "evening_summary"];
const ADMIN_ONLY_EVENTS = ["payment_received", "payment_correction_pending", "ai_suggestion"];

export function eligibleStaffEvents(u: StaffEligibilityUser): string[] {
  const out = new Set<string>();
  //  الأدوارُ كلُّها (ترحيل ١٠٥، §4.ch) — والأنواعُ اتّحادُ ما يصل كلَّ دور.
  const role = (r: string) => hasRole(u, r);
  if (role("admin")) return STAFF_EVENT_KEYS.slice();
  if (role("doctor") || u.canWriteMedicalExam) DOCTOR_EVENTS.forEach((k) => out.add(k));
  if (role("prosthetics_expert") || u.canWorkAsExpert) EXPERT_EVENTS.forEach((k) => out.add(k));
  //  والمديرُ بلا «طلب معاينة» — «مدير الفرع لا يعاين» (المالك ٢٠٢٦-١٠-٠٤)؛ ومَن مُنح كتابةَ المعاينة يصله بالسطر أعلاه.
  if (role("branch_manager")) [...FRONT_DESK_EVENTS, ...MANAGER_EVENTS].forEach((k) => out.add(k));
  if (role("reception") || role("accountant")) FRONT_DESK_EVENTS.forEach((k) => out.add(k));
  void ADMIN_ONLY_EVENTS;
  return STAFF_EVENT_KEYS.filter((k) => out.has(k));
}

/** ترتيبُ اللوحة: المسؤول ⟵ المدراء ⟵ الخبراء ⟵ الأطبّاء ⟵ بقيّة الموظّفين. */
export function staffRoleRank(u: StaffEligibilityUser): number {
  if (hasRole(u, "admin")) return 0;
  if (hasRole(u, "branch_manager")) return 1;
  if (hasRole(u, "prosthetics_expert") || u.canWorkAsExpert) return 2;
  if (hasRole(u, "doctor") || u.canWriteMedicalExam) return 3;
  return 4;
}
