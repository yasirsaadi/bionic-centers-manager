//  **حفظُ نافذة تعديل الموظّف يرسل ما تغيّر وحدَه** — منطقٌ خالص، بلا React ولا شبكة.
//
//  ══ الواقعة (٢٠٢٦-٠٩-٢٦) ════════════════════════════════════════════════
//  حسابُ أيوب فقد ذي قار، وحسابُ عناد فقد الموصل، والمالكُ هو المسؤولُ الوحيد
//  ومتأكّدٌ أنه لم يُزلهما. والنافذةُ كانت ترسل **الحسابَ كلَّه** مع كلّ حفظ —
//  ومنه قائمةُ الفروع كما كانت في القائمة المعروضة ساعةَ فُتحت. فصفحةٌ قديمةٌ
//  مفتوحةٌ على جهاز، وفرعٌ أُضيف من جهازٍ آخر، ثمّ تغييرُ كلمة مرورٍ من
//  الصفحة القديمة ⟶ تُكتب الفروعُ القديمة فوق الجديدة **بصمت**.
//
//  فصار الحفظُ يرسل **الحقولَ التي غيّرها المستخدمُ في النافذة** لا غير، ومعه
//  `expectedUpdatedAt` — وقتُ آخر حفظٍ للحساب كما رأته النافذة — فيردّ الخادمُ
//  الحفظَ إن تغيّر الحسابُ بعد فتحها (`PATCH /api/admin/users/:id`).

/** الفروعُ حقلان يُطبَّعان معاً في الخادم — فإن تغيّر أحدُهما أُرسلا كلاهما. */
const BRANCH_FIELDS = ["branchId", "branchIds"] as const;

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export interface UserEditPatch {
  /** ما يُرسَل — فارغٌ حين لا تغيير. */
  patch: Record<string, unknown>;
  empty: boolean;
}

/**
 *  الفرقُ بين النافذة ساعةَ فُتحت (`initial`) وما فيها الآن (`current`).
 *
 *  - **كلمةُ المرور** تُرسَل حين كُتبت فقط — الحقلُ يُفتَح فارغاً دائماً.
 *  - **الفروع** حقلان متلازمان: تغيُّرُ أحدهما يُرسلهما معاً.
 *  - و`expectedUpdatedAt` يُلحَق بأيّ حفظٍ فيه تغيير.
 */
export function userEditPatch(
  initial: Record<string, unknown>,
  current: Record<string, unknown>,
  expectedUpdatedAt: string | Date | null | undefined,
): UserEditPatch {
  const patch: Record<string, unknown> = {};
  for (const k of Object.keys(current)) {
    if (k === "password") continue;
    if (!same(current[k], initial[k])) patch[k] = current[k];
  }
  const pw = typeof current.password === "string" ? current.password : "";
  if (pw !== "") patch.password = pw;
  if (BRANCH_FIELDS.some((f) => f in patch)) {
    for (const f of BRANCH_FIELDS) patch[f] = current[f];
  }
  const empty = Object.keys(patch).length === 0;
  if (!empty) {
    patch.expectedUpdatedAt = expectedUpdatedAt == null
      ? null
      : new Date(expectedUpdatedAt).toISOString();
  }
  return { patch, empty };
}
