// **رقمُ هاتفٍ مشترك بين أفراد عائلة** (ترحيل ١٤٧، §4.ef — ٢٠٢٦-١٠-١٤).
//
// كان الرقمُ الواحد لمريضٍ فعّالٍ واحد بلا استثناء، فزوجةٌ بلا هاتف لا تُسجَّل برقم زوجها المسجَّل قبلها. وقرارُ المالك (٢٠٢٦-١٠-١٤):
// سؤالٌ واحد بدل الرفض — «هذا الرقم مسجَّل باسم أحمد: الشخص نفسه أم قريبٌ له؟». «الشخص نفسه» يفتح ملفَّه ولا يُنشئ ملفّاً، و«قريب يستعمل
// الرقم نفسه» يسجّل الملفَّ بصلة القرابة **والاستقبالُ نفسُه يختار** (الرسالةُ تُريه اسمَ صاحب الرقم، والاختيارُ في سطر التدقيق).
// دوالُّ خالصة يستوردها الخادمُ (التحقّق) والواجهةُ (النافذة والعرض).

/** مَن يكون صاحبُ الرقم لهذا المريض — بحرف المالك («زوج، زوجة، أب، أم، ابن، ابنة، أخ، أخت، أخرى»). */
export const PHONE_RELATIONS = ["زوج", "زوجة", "أب", "أم", "ابن", "ابنة", "أخ", "أخت", "قريب آخر"] as const;
export type PhoneRelation = (typeof PHONE_RELATIONS)[number];

export interface SharedPhoneConfirm {
  /** الملفُّ الذي يحمل الرقمَ فعلاً — يجب أن يكون بين حاملي الرقم الفعّالين، والخادمُ يتحقّق تحت القفل. */
  withPatientId: number;
  relation: PhoneRelation;
}

/**
 * **تأكيدُ الرقم المشترك من جسم الطلب** — `null` حين لم يُرسَل (الطلبُ العاديّ)، و`undefined` حين أُرسل بشكلٍ لا يُقبل
 * (فيردّه الخادمُ ٤٠٠ ولا يمضي كأنه لم يُرسَل).
 */
export function parseSharedPhone(raw: unknown): SharedPhoneConfirm | null | undefined {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  const id = Number(r.withPatientId);
  if (!Number.isInteger(id) || id <= 0) return undefined;
  const rel = typeof r.relation === "string" ? r.relation.trim() : "";
  if (!(PHONE_RELATIONS as readonly string[]).includes(rel)) return undefined;
  return { withPatientId: id, relation: rel as PhoneRelation };
}

/** مَن يحمل الرقمَ الآن — ما تعرضه النافذة. */
export interface PhoneHolder {
  id: number;
  name: string;
  patientCode: string | null;
  branchName: string | null;
  /** يفتح السائلُ ملفَّه؟ — «الشخص نفسه» ينقله إليه، وإلّا يُقال له أين الملفّ. */
  reachable: boolean;
}

/** سطرُ العرض بجانب الرقم في ملفّ المريض: «مشترك مع: أحمد حسين (زوج)». */
export function sharedPhoneLabel(withName: string, relation: string | null | undefined): string {
  const rel = String(relation ?? "").trim();
  return `مشترك مع: ${withName}${rel ? ` (${rel})` : ""}`;
}
