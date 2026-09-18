//  ══ إظهارُ الأقسام في قائمة الفرع — قرارٌ خالص (٢٠٢٦-٠٩-١٩) ══════════════
//
//  **إعداداتُ الفرع تُخفي ولا تمنح.** بوّابتان متعاقبتان، وهذا ترتيبُهما
//  ومعناهما كما كانتا في `Sidebar.tsx` حرفاً بحرف — استُخرجتا كما هما، بلا
//  تغييرِ دلالةٍ واحدة:
//
//    ① **بوّابةُ العرض** (`settingKey`): إعدادُ الفرع `false` ⟶ يُخفى العنصر.
//       وغيابُ الإعداد أو `true` ⟶ **لا يقول شيئاً** — يمضي القرارُ إلى
//       البوّابة الثانية. فلا سبيلَ لهذه البوّابة أن تُظهر عنصراً، سبيلُها
//       الإخفاءُ وحده.
//    ② **بوّابةُ الصلاحية** (`permission`): وهي **وحدها** ما يمنح. فموظّفٌ
//       لا يملك الصلاحيةَ لا يراه ولو كان إعدادُ الفرع مرفوعاً.
//
//  ولماذا دالّةٌ خالصة خارج المكوّن: المشروعُ بلا مشغّل DOM، فقرارٌ يعيش
//  داخل `.filter()` في React لا يُختبَر إلّا بقراءة نصِّه — وقراءةُ النصّ لا
//  تُمسك انقلاباً في المعنى يعود بصياغةٍ أخرى (درسُ ٤.u و٤.t). وهنا بالذات
//  الانقلابُ المخيف أن تصير بوّابةُ العرض مانحةً، فتفتح إعداداتُ الفرع باباً
//  لموظّفٍ لا يملك صلاحيتَه.

/** مفاتيحُ الإظهار الخمسة — هي هي في `branch_settings`، بلا سادسٍ. */
export type SectionKey =
  | "showDashboard"
  | "showPatients"
  | "showPayments"
  | "showAccounting"
  | "showStatistics";

export const SECTION_KEYS: readonly SectionKey[] = [
  "showDashboard",
  "showPatients",
  "showPayments",
  "showAccounting",
  "showStatistics",
] as const;

export type BranchVisibilitySettings = Partial<Record<SectionKey, boolean>>;

export interface SidebarVisibilityInput {
  /** المسؤولُ العام خارجَ بوّابة العرض — كما كان. */
  isAdmin: boolean;
  /** مفتاحُ الإظهار لهذا العنصر، أو `null` لعنصرٍ لا تحكمه إعداداتُ الفرع. */
  settingKey: SectionKey | null;
  /** إعداداتُ الفرع المجلوبة، أو `null`/`undefined` قبل وصولها. */
  branchSettings: BranchVisibilitySettings | null | undefined;
  /** مفتاحُ الصلاحية لهذا العنصر، أو `null` لعنصرٍ بلا شرطِ صلاحية. */
  permission: string | null;
  /** صلاحياتُ الموظّف الحيّة. */
  permissions: Record<string, boolean | undefined>;
  /** مسارُ العنصر — يلزم لمخرج «إضافة المصاريف» على `/accounting` وحده. */
  href: string;
}

/**
 * أيُعرَض هذا العنصرُ بعد البوّابتين؟
 *
 * **ولا تُقاس بوّابةُ العرض إلّا بـ`=== false` صراحةً**: إعدادٌ غائب أو
 * `null` (صفُّ فرعٍ لم تُكتب له إعداداتٌ بعد) ليس إخفاءً — وإلّا اختفت
 * القائمةُ كلُّها عن فرعٍ جديد لمجرّد أن صفَّ إعداداته لم يُنشأ.
 */
export function isSidebarItemVisible(input: SidebarVisibilityInput): boolean {
  // ① بوّابةُ العرض — تُخفي ولا تمنح.
  if (!input.isAdmin && input.settingKey && input.branchSettings) {
    if (input.branchSettings[input.settingKey] === false) {
      return false;
    }
  }

  // ② بوّابةُ الصلاحية — هي وحدها ما يمنح.
  if (input.permission && !input.permissions[input.permission]) {
    //  المحاسبةُ تُفتَح أيضاً بمنحة «إضافة المصاريف» الضيّقة (تبويبُ
    //  المصروفات وحده) لا بالإدارة الكاملة فقط — كما كان بحرفه.
    if (!(input.href === "/accounting" && input.permissions.canAddExpenses)) {
      return false;
    }
  }

  return true;
}
