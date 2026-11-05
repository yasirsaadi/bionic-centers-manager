// **أنواعُ تنبيهات الموظّفين** (§4.by) — أربعةَ عشرَ نوعاً (الرابعَ عشرَ «كلُّ مبلغٍ يدخل» للمسؤول وحده)، وأنواعُ العلاج الطبيعي (§4.cm)، و«طلبُ تصحيح صرف» (§4.ce). وثلاثةٌ عرضها المساعدُ ثمّ أُسقطت لأنها لا تقع اليوم:
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
  //  قسطٌ مستحقّ (§4.ea): قبل موعده بيوم وفي يومه بالساعة التي اختارها الموظّف — للاستقبال ومدير الفرع (قرارُ المالك).
  { key: "installment_due", label: "قسطٌ مستحقّ غداً أو اليوم — المريض والمبلغ والموعد", group: "الاستقبال ومدير الفرع", scope: "branch" },
  { key: "payment_received", label: "كلّ مبلغ يدخل أيّ فرع — المبلغ والمريض والقسم والفرع", group: "المسؤول", scope: "global" },
  { key: "payment_correction_pending", label: "طلب تصحيح دفعة ينتظر القرار", group: "المسؤول", scope: "global" },
  //  طلبُ تصحيح مصروفٍ أو سطرِ دفتر (§4.ce التكملة) — كان يظهر في الدفتر وحده فلا يعرف به المالكُ إلّا إن فتحه.
  { key: "money_correction_pending", label: "طلب تصحيح صرف أو سطر في دفتر القاصة ينتظر القرار", group: "المسؤول", scope: "global" },
  //  طلبُ سحبٍ من قاصة المواد أو قاصة الرواتب والإيجار (§4.fy) — للمسؤول؛ وقرارُه لطالبه وحده.
  { key: "reserve_withdrawal_pending", label: "طلب سحب من قاصة المواد أو الرواتب والإيجار ينتظر القرار", group: "المسؤول", scope: "global" },
  { key: "reserve_withdrawal_decided", label: "طلبُه للسحب من القاصات اعتُمد أو رُفض", group: "الاستقبال ومدير الفرع", scope: "targeted" },
  //  طلبُ استرجاع مبلغٍ لمريض (§4.fz) — للمسؤول؛ وقرارُه لطالبه وحده.
  { key: "refund_request_pending", label: "طلب استرجاع مبلغ لمريض ينتظر القرار", group: "المسؤول", scope: "global" },
  { key: "refund_request_decided", label: "طلبُه لاسترجاع مبلغ لمريض اعتُمد أو رُفض", group: "الاستقبال ومدير الفرع", scope: "targeted" },
  //  طلبُ تسليمٍ لمستشفى العين من مربّع نسبته (§4.fz) — للمسؤول؛ وقرارُه لطالبه وحده.
  { key: "hospital_delivery_pending", label: "طلب تسليم مبلغ لمستشفى العين ينتظر القرار", group: "المسؤول", scope: "global" },
  { key: "hospital_delivery_decided", label: "طلبُه لتسليم مبلغ لمستشفى العين اعتُمد أو رُفض", group: "الاستقبال ومدير الفرع", scope: "targeted" },
  { key: "order_hold_rework", label: "أمر تصنيع توقّف أو سُجّلت عليه إعادة عمل", group: "المسؤول", scope: "branch" },
  { key: "ai_suggestion", label: "اقتراح معرفة جديد للمساعد الذكي", group: "المسؤول", scope: "global" },
  { key: "evening_summary", label: "ملخّص يومي مسائي لكلّ فرع", group: "المسؤول", scope: "branch", digest: true },
  //  خطّةُ العلاج الطبيعي (§4.cm) — للمسؤول والمشرف العام، ولكاتبها، ولمنفّذيها.
  { key: "physio_plan_pending", label: "خطة علاج طبيعي تنتظر الاعتماد أو المراجعة", group: "العلاج الطبيعي", scope: "global" },
  { key: "physio_plan_decided", label: "خطته اعتُمدت أو أُعيدت أو راجعها المشرف", group: "العلاج الطبيعي", scope: "targeted" },
  { key: "physio_plan_assigned", label: "خطة علاج طبيعي معتمدة أُسندت إليه", group: "العلاج الطبيعي", scope: "targeted" },
  { key: "physio_session_note", label: "ملاحظةٌ من المعالج على جلسةٍ من خطّته", group: "العلاج الطبيعي", scope: "targeted" },
  { key: "physio_assessment_due", label: "تذكير صباحي بخططه المستحقّة التقييم", group: "العلاج الطبيعي", scope: "targeted", digest: true },
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
import { hasAnyRole, hasRole, PHYSIO_ROLES } from "./user_roles";

export interface StaffEligibilityUser {
  role: string;
  /** الأدوارُ الإضافية (ترحيل ١٠٥، §4.ch) — من `extra_roles`. */
  extraRoles?: unknown;
  roles?: readonly string[] | null;
  canWriteMedicalExam?: boolean | null;
  canWorkAsExpert?: boolean | null;
  /** «مشرف عام العلاج الطبيعي» (§4.cg) — يعتمد الخطط. */
  canSupervisePhysio?: boolean | null;
}

const DOCTOR_EVENTS = ["exam_request"];
const EXPERT_EVENTS = ["order_assigned", "order_reassigned", "expert_due_digest"];
const FRONT_DESK_EVENTS = ["returned_from_doctor", "awaiting_decision", "ready_for_fitting", "delivered", "followups_digest", "installment_due"];
const MANAGER_EVENTS = ["order_hold_rework", "evening_summary"];
const ADMIN_ONLY_EVENTS = ["payment_received", "payment_correction_pending", "money_correction_pending", "reserve_withdrawal_pending", "refund_request_pending", "hospital_delivery_pending", "ai_suggestion"];
//  قرارُ طلب السحب (§4.fy) — لمَن يكتب دفترَ القاصة (المحاسبُ ومديرُ الفرع)، وهو وحده يطلب.
const CASH_BOOK_EVENTS = ["reserve_withdrawal_decided", "hospital_delivery_decided"];
//  قرارُ طلب الاسترجاع (§4.fz) — لمن يقف أمام المريض (الاستقبالُ ومديرُ الفرع والمحاسب)؛ وحاملُ المفتاح يصله ولو كان دورُه غيرَها.
const REFUND_EVENTS = ["refund_request_decided"];

/**
 * **أنواعٌ موجَّهةٌ لصاحب طلبٍ قدّمه** — تصله ولو تغيّر دورُه بعد الطلب (مراجعةُ Codex على #698): الطلبُ قُدّم بحقّ، والقرارُ جوابُه.
 * فالمُرسِلُ لا يعيد فحصَ الدور لها، ويكفيها أن تكون موجَّهةً إليه (`target_user_ids`) وأن يكون تنبيهُها مفعّلاً له.
 * والأهليّةُ بالدور تبقى لما يُعرض في «تنبيهات الموظفين».
 */
export const REQUESTER_REPLY_EVENTS: readonly string[] = ["reserve_withdrawal_decided", "refund_request_decided", "hospital_delivery_decided"];

/** هل يُرسَل النوعُ لهذا الموظّف؟ — بالدور، أو ردّاً موجَّهاً على طلبه. */
export function staffEventDeliverable(u: StaffEligibilityUser, event: string, targeted: boolean): boolean {
  if (targeted && REQUESTER_REPLY_EVENTS.includes(event)) return true;
  return eligibleStaffEvents(u).includes(event);
}
const PHYSIO_APPROVER_EVENTS = ["physio_plan_pending"];
const PHYSIO_WRITER_EVENTS = ["physio_plan_decided", "physio_session_note", "physio_assessment_due"];
const PHYSIO_EXECUTOR_EVENTS = ["physio_plan_assigned"];

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
  if (role("branch_manager") || role("accountant")) CASH_BOOK_EVENTS.forEach((k) => out.add(k));
  if (role("branch_manager") || role("reception") || role("accountant")) REFUND_EVENTS.forEach((k) => out.add(k));
  //  خطّةُ العلاج الطبيعي (§4.cm): المشرفُ العام يعتمد ويكتب؛ والأخصائيُّ يكتب وقد ينفّذ؛ وأدوارُ القسم تنفّذ.
  if (u.canSupervisePhysio) [...PHYSIO_APPROVER_EVENTS, ...PHYSIO_WRITER_EVENTS].forEach((k) => out.add(k));
  if (role("physio_specialist")) [...PHYSIO_WRITER_EVENTS, ...PHYSIO_EXECUTOR_EVENTS].forEach((k) => out.add(k));
  if (hasAnyRole(u, PHYSIO_ROLES)) PHYSIO_EXECUTOR_EVENTS.forEach((k) => out.add(k));
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
