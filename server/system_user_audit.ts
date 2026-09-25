//  **أثرُ تعديل حسابات الموظّفين** — منطقٌ خالص، بلا قاعدة ولا شبكة.
//
//  ══ الواقعة (٢٠٢٦-٠٩-٢٥) ════════════════════════════════════════════════
//  حسابُ أيوب فقد ذي قار، وحسابُ عناد فقد الموصل، والمالكُ متأكّدٌ أنه لم
//  يُزلهما — ولم يُعرَف مَن ولا متى: نافذةُ إدارة المستخدمين (إنشاءٌ · تعديلٌ
//  · تعطيل) **لا تكتب سطرَ تدقيقٍ واحداً**. والكاتبان الوحيدان في
//  `audit_log` لحساب موظّف كانا تغييرَ كلمة المرور الذاتيّ والحذفَ النهائيّ.
//  فصار كلُّ حفظٍ في النافذة يكتب **ما تغيّر فعلاً** بقيمته قبل وبعد.
//
//  ══ وكلمةُ المرور لا تُكتب أبداً ═══════════════════════════════════════
//  لا تجزئتُها ولا نصُّها (`passwordPlain` محفوظٌ للمسؤول في الصفّ نفسِه) —
//  يُكتب **أنها تغيّرت** وحدَه (`passwordChanged: true`). وسجلُّ التدقيق يقرؤه
//  غيرُ المسؤول (مدقّقٌ، نسخةٌ احتياطيةٌ بالبريد)، فلا يصير بابَ تسريب.

/** حقولٌ لا تُكتب في الأثر: السرّ، وطوابعُ الوقت التي تتغيّر مع كلّ حفظ. */
const NEVER_LOGGED = new Set(["passwordHash", "passwordPlain", "updatedAt", "createdAt"]);

/** الحسابُ صالحاً للكتابة في الأثر — بلا السرّ ولا الطوابع. */
export function auditableUser(u: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!u) return out;
  for (const [k, v] of Object.entries(u)) {
    if (!NEVER_LOGGED.has(k) && v !== undefined) out[k] = v;
  }
  return out;
}

/** تساوٍ بالقيمة — المصفوفاتُ (`branchIds` · `medicalSpecialties`) تُقارَن بمحتواها لا بمرجعها. */
function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export interface UserAuditDiff {
  /** الحقولُ التي تغيّرت بقيمها **قبل** التعديل. */
  oldValues: Record<string, unknown>;
  /** والحقولُ نفسُها بقيمها **بعده** — ومعها `passwordChanged` إن تغيّرت كلمةُ المرور. */
  newValues: Record<string, unknown>;
  /** لا شيءَ تغيّر — فلا سطر. */
  empty: boolean;
}

/**
 *  ما تغيّر بين الصفّ قبل الحفظ وبعده. **يُقارَن الصفّان المخزَّنان** لا
 *  الطلبُ القادم: حقلٌ أُرسل بقيمته نفسِها ليس تغييراً، وحقلٌ طبّعه الخادمُ
 *  (`branchId` من أوّل الفروع) تغييرٌ ولو لم يُرسَل.
 */
export function userAuditDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): UserAuditDiff {
  const b = auditableUser(before);
  const a = auditableUser(after);
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};
  for (const k of Array.from(new Set([...Object.keys(b), ...Object.keys(a)]))) {
    if (!same(b[k], a[k])) {
      oldValues[k] = b[k] ?? null;
      newValues[k] = a[k] ?? null;
    }
  }
  if (before && after && !same(before.passwordHash, after.passwordHash)) {
    newValues.passwordChanged = true;
  }
  return { oldValues, newValues, empty: Object.keys(newValues).length === 0 };
}
