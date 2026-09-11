// نموذجُ القدرات — أساسُ «تدريبُ الموظّفين» والاسترجاعِ الواعي بالصلاحية.
//
// ══ لماذا هذا لا تبديلَ دورٍ ═══════════════════════════════════════════════
// المهمّة صريحة: **لا** زرَّ «اعتبرني المدير» ولا «تصرّف كمحاسب». فالقدراتُ
// **إضافية** (additive) — تُشتقّ من أعلام الصلاحية الحقيقية على الجلسة، لا
// من دور واحد حصريّ ولا من نصّ المستخدم. محاسبٌ يملك canViewReports أيضاً
// يحصل على قدرتَي `finance` و`reports` معاً؛ مديرُ فرعٍ بلا canManageAccounting
// لا يحصل على `finance` مهما أوحى دورُه — **لا افتراضَ سلطةٍ من الدور وحده**
// (القسم أ من المهمّة، بالحرف).
//
// ══ ولماذا ملفٌّ خالص في `shared/` ═══════════════════════════════════════
// دالّةٌ نقيّة بلا شبكة ولا قاعدة بيانات — تأخذ ما اشتقّه `resolveAiAccess`
// من الجلسة فعلاً (`isAdmin`/`role`/`permissions`) وتُخرج مجموعة قدراتٍ.
// فتُختبَر وحدها (`shared/ai_capabilities.test.ts`) بلا حاجةٍ لجلسةٍ حقيقية
// ولا قاعدة بيانات، ويستوردها كلٌّ من طبقة الأدوات وطبقة الاسترجاع وطبقة
// التدريب — مصدرُ حقيقةٍ واحد لا ثلاثة.

/**
 * القدراتُ العشر — مفرداتٌ ثابتة تُستعمَل لتوسيم الجمهور (معرفةً ومساراتِ
 * تدريب) والتحكّم بعرض الأدوات معاً. `general` وحدها ضمنيّةٌ دائماً — أيّ
 * جلسةٍ مصادَقة تملكها بلا شرط.
 */
export const CAPABILITIES = [
  "general", "reception", "patients", "medical", "expert",
  "physio", "finance", "reports", "manager", "admin",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export function isCapability(v: unknown): v is Capability {
  return typeof v === "string" && (CAPABILITIES as readonly string[]).includes(v);
}

/** الشكلُ الأدنى المطلوب — بنيويّاً متوافقٌ مع `AiAccessContext` وجلسة الفرع معاً. */
export interface CapabilitySource {
  isAdmin: boolean;
  role: string | null | undefined;
  permissions: Record<string, unknown> | null | undefined;
}

/**
 * قدراتُ هذه الجلسة — **إضافيّةٌ لا حصريّة**، وكلُّها من ثلاثة حقولٍ فقط:
 * `isAdmin`/`role`/`permissions`. لا شيء آخر يدخل القرار — لا جسمَ طلبٍ ولا
 * نصَّ رسالة. مطابقةٌ حرفياً لِما تفحصه بقيّةُ النظام فعلاً عند كلّ نقطة
 * (`canManageAccounting` للمحاسبة، `canViewReports` للتقارير، `canWriteMedicalExam`
 * أو دور `doctor` للطبيب، `canWorkAsExpert` أو دور `prosthetics_expert`
 * للخبير، `canEnterSessions` للعلاج الطبيعي، `canAddPatients` للاستقبال،
 * `canViewPatients` لسجلّ المرضى) — **لا قاعدةَ صلاحيةٍ جديدة تُخترَع هنا**،
 * فقط تجميعٌ لِما هو قائمٌ فعلاً في التطبيق الحيّ.
 *
 * ══ المسؤولُ العام يملك الاتحادَ الكامل — بسلطته لا بأعلام صفّه (مراجعةٌ
 * حيّة) ═══════════════════════════════════════════════════════════════════
 * `isAdmin === true` ⟶ **كلَّ قدرةٍ في `CAPABILITIES`**، فوراً وبلا قراءة
 * `permissions` إطلاقاً. هذا يطابق التجاوزَ العامّ القائم فعلياً في التطبيق
 * الحيّ (`enforceBranchAccess`، `allowAdministration`، حجبُ التصنيع/الطبّ/
 * المحاسبة — المسؤولُ يمضي في كلّها بسلطته لا بعَلَمٍ مخزَّن)؛ ربطُ قدرات
 * المسؤول بأعلام صلاحيةٍ شخصية على صفّه كان يعني أن مسؤولاً حُذفت من صفّه
 * `can_manage_accounting` (أو لم تُضبَط قطّ) يفقد قدرة `finance` — تناقضٌ
 * مباشر مع أنه يرى كلَّ لقطةٍ مالية فعلياً. **ومديرُ الفرع خارج هذا التجاوز
 * تماماً** — قدرتُه `manager` وحدها من دوره، وبقيّةُ قدراته من أعلامه
 * الحقيقية فقط كما كانت؛ لا اتحادَ كاملاً إلا لـ`isAdmin` حرفياً.
 */
export function capabilitiesFor(access: CapabilitySource): Set<Capability> {
  if (access.isAdmin) return new Set<Capability>(CAPABILITIES);

  const caps = new Set<Capability>(["general"]);
  const p = access.permissions ?? {};
  const role = access.role ?? "";

  if (role === "branch_manager") caps.add("manager");
  if (p.canAddPatients === true) caps.add("reception");
  if (p.canViewPatients === true) caps.add("patients");
  if (p.canWriteMedicalExam === true || role === "doctor") caps.add("medical");
  if (p.canWorkAsExpert === true || role === "prosthetics_expert") caps.add("expert");
  if (p.canEnterSessions === true) caps.add("physio");
  if (p.canManageAccounting === true) caps.add("finance");
  if (p.canViewReports === true) caps.add("reports");

  return caps;
}

/** أسماءٌ عربية للعرض — لوحة التحكّم والدرج معاً، مصدرٌ واحد لا يتكرّر. */
export const CAPABILITY_LABELS: Record<Capability, string> = {
  general: "عامّ",
  reception: "الاستقبال والتسجيل",
  patients: "سجلّ المرضى",
  medical: "الطبيب والمعاينة",
  expert: "خبير التصنيع",
  physio: "العلاج الطبيعي",
  finance: "المحاسبة",
  reports: "التقارير والإدارة التشغيلية",
  manager: "إدارة الفرع",
  admin: "المسؤول العام",
};

/**
 * هل يتوافق جمهورٌ (مصفوفةُ قدراتٍ مخزَّنة على مقالةٍ أو مسار تدريب) مع
 * قدرات هذه الجلسة — **تقاطعٌ لا مساواة**. جمهورٌ فارغ أو غائب أو يحوي
 * `general` يعني «للجميع». وإلّا يكفي أن تملك الجلسةُ **قدرةً واحدة على
 * الأقلّ** من الجمهور المطلوب — مقالةُ تصنيعٍ قد تصل الخبير والمديرَ
 * والمسؤولَ العام معاً، لا دوراً واحداً حصرياً (القسم I من المهمّة).
 */
export function audienceMatches(
  audience: readonly string[] | null | undefined, caps: ReadonlySet<Capability>,
): boolean {
  if (!audience || audience.length === 0) return true;
  if (audience.includes("general")) return true;
  return audience.some((a) => caps.has(a as Capability));
}
