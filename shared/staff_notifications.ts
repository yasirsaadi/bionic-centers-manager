// **أنواعُ تنبيهات الموظّفين** (§4.by) — ثلاثةَ عشرَ نوعاً. وثلاثةٌ عرضها المساعدُ ثمّ أُسقطت لأنها لا تقع اليوم:
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
