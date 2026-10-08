// ══ توفّرُ الاسم عند التسجيل — بادئةٌ لا تشابهٌ ولا مطابقةٌ جزئية ═════════
// فحصٌ حيّ أثناء الكتابة، مُهدَّأ نصفَ ثانية، يقود حدّاً أحمر/أخضر تحت الحقل. **والقرارُ الملزِم في الخادم**
// (`POST /api/patients` ⟵ `duplicate_guard.ts`) — هذا إرشادٌ حيّ لا مصدرَ حقيقة. **تقرؤه «استمارةُ المراجع» (§4.cq)**؛
// وصفحةُ التسجيل للعلاج الطبيعي تحمل الأثرَ نفسَه مكتوباً فيها (يحرسه بنصّه `test:create-patient-duplicate-guard`)،
// و`test:intake-sheet` يحرس أن النسختين تقولان الشيءَ نفسَه: النقطةُ نفسُها والرسالةُ نفسُها بالحرف.
import { useEffect, useState } from "react";

/** الرسالةُ المعتمَدة حين لا يصل نصُّ الخادم — بالحرف. */
export const DUPLICATE_NAME_PREFIX_MESSAGE = "يوجد اسم مسجل يبدأ بهذا الاسم، أكمل كتابة الاسم.";

export type NameCheck = { status: "empty" | "checking" | "available" | "conflict" | "error"; message?: string };

export function useNameAvailability(typedName: string | null | undefined): NameCheck {
  const [nameCheck, setNameCheck] = useState<NameCheck>({ status: "empty" });
  useEffect(() => {
    const q = (typedName ?? "").trim();
    if (!q) {
      setNameCheck({ status: "empty" });
      return;
    }
    //  «قيدَ التحقّق» فوراً — لا يبقى لونُ النصّ القديم ريثما تنقضي المهلةُ للنصّ الجديد.
    setNameCheck({ status: "checking" });
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/patients/name-availability?name=${encodeURIComponent(q)}`, { credentials: "include" });
        if (!res.ok) {
          if (!cancelled) setNameCheck({ status: "error" });
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (data?.available) setNameCheck({ status: "available" });
        else setNameCheck({ status: "conflict", message: typeof data?.message === "string" ? data.message : DUPLICATE_NAME_PREFIX_MESSAGE });
      } catch {
        if (!cancelled) setNameCheck({ status: "error" });
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [typedName]);
  return nameCheck;
}
