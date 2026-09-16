//  **فروعُ رأس ملفّ المريض** — فرعُ التسجيل، ومَن أُتيح له الملفُّ أيضاً.
//  منطقٌ خالص، بلا React ولا شبكة.
//
//  ══ لماذا ملفٌّ مستقلّ ══════════════════════════════════════════════════
//  المشروع بلا مشغّل DOM، فقرارٌ يعيش داخل مكوّن React لا يُختبَر إلّا
//  بقراءة نصِّه — وقراءةُ النصّ لا تُمسك انقلاباً في المعنى يعود يوماً
//  بصياغةٍ أخرى. وهذا القرار يستحقّ الاختبار: **خلطُ فرع التسجيل بفرعٍ
//  أُتيح له** هو الخطأ الوحيد الذي لا يُغتفَر هنا — رأسٌ يقول «فرع
//  التسجيل: كربلاء» لملفٍّ سُجّل في ذي قار يكذب على الموظّف في أوّل سطر.
//
//  ══ القاعدة ═════════════════════════════════════════════════════════════
//  المصدرُ `GET /api/patients/:id/branch-access` القائم (ترحيل ٠٨٠) —
//  `homeBranchId` فرعُ التسجيل، و`access[]` الفروعُ المُتاحُ لها. **ولا
//  مصدرَ ثانٍ ولا اشتقاقٌ من عَلَم**؛ والرأسُ **يعرض** ولا يقرّر شيئاً.
//
//    • فرعُ التسجيل لا يُشتقّ من الإتاحة ولا يُخترَع: رقمٌ غيرُ صالح
//      (صفٌّ قديمٌ نادر بلا فرع) ⟶ `null` فلا يُعرَض سطرُه أصلاً.
//    • فرعُ التسجيل **لا يظهر في «متاح أيضاً» أبداً** — ولو وصل في
//      `access[]` من صفٍّ موروث. الخادمُ يمنع منحَه (`HOME_BRANCH_GRANT_ERROR`)،
//      وهذا حزامٌ ثانٍ لأن الكذبةَ هنا تُقرأ ولا تُكتشَف.
//    • التكرارُ يُطوى، وترتيبُ المنح يبقى كما أرسله الخادم
//      (`ORDER BY granted_at ASC`) — الأقدمُ إتاحةً أوّلاً.
//    • والاسمُ من قائمة الفروع أوّلاً (فتُطبَّق ترجمةُ الواجهة نفسُها)، ثمّ
//      اسمُ الخادم، ثمّ `فرع #٣` — **ولا شرطةٌ عارية ولا شارةٌ فارغة**.

/** صفٌّ من قائمة الفروع كما تقرؤها الصفحة من `/api/branches`. */
export interface BranchLike {
  id: number;
  name: string;
}

/** صفُّ إتاحةٍ كما يرسله `GET /api/patients/:id/branch-access`. */
export interface SharedAccessLike {
  branchId: number;
  branchName?: string | null;
}

export interface HeaderBranch {
  id: number;
  label: string;
}

export interface HeaderBranches {
  /** فرعُ التسجيل — `null` لصفٍّ قديمٍ بلا فرع. لا يُخترَع. */
  home: HeaderBranch | null;
  /** الفروعُ الإضافية المُتاحُ لها الملفّ — **كلُّها**، بترتيب المنح. */
  shared: HeaderBranch[];
}

const isBranchId = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v > 0;

export function patientHeaderBranches(params: {
  homeBranchId: number | null | undefined;
  access: SharedAccessLike[] | null | undefined;
  branches: BranchLike[] | null | undefined;
  /** ترجمةُ اسم الفرع كما تفعل الصفحة — تُترَك فيبقى الاسمُ كما هو. */
  translate?: (name: string) => string;
}): HeaderBranches {
  const { homeBranchId, access, branches } = params;
  const translate = params.translate ?? ((n: string) => n);

  const label = (id: number, serverName?: string | null): string => {
    const listed = (branches ?? []).find((b) => Number(b.id) === id)?.name;
    const raw = (listed ?? serverName ?? "").trim();
    return raw ? translate(raw) : `فرع #${id}`;
  };

  const homeId = isBranchId(homeBranchId) ? homeBranchId : null;
  const home = homeId === null ? null : { id: homeId, label: label(homeId) };

  const seen = new Set<number>();
  const shared: HeaderBranch[] = [];
  for (const row of access ?? []) {
    const id = Number(row?.branchId);
    if (!isBranchId(id)) continue;
    if (homeId !== null && id === homeId) continue;   // فرعُ التسجيل ليس «أيضاً»
    if (seen.has(id)) continue;
    seen.add(id);
    shared.push({ id, label: label(id, row?.branchName) });
  }

  return { home, shared };
}

/** «كربلاء، بغداد» — الفاصلةُ العربية، وفراغٌ صريح حين لا إتاحة. */
export function formatSharedBranches(shared: HeaderBranch[]): string {
  return shared.map((b) => b.label).join("، ");
}
