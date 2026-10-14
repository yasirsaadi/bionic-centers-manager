// Migration 146: ترتيبُ الشريط الجانبيّ لكلّ حساب (§4.ed — ٢٠٢٦-١٠-١٤).
//
// طلبُ المالك: «ممكن تخليني ارتب فقرات القائمة الجانبية مثل ما اريد اني واي موظف يدخل بحسابه» — فكلُّ حسابٍ يرتّب فقراتِه بنفسه.
//   • `system_users.sidebar_order` — قائمةُ مسارات الفقرات بترتيب صاحبها (`shared/sidebar_order.ts`)، و`NULL` = الترتيبُ الأصليّ.
//     على الحساب لا على الجهاز: يتبعه من الهاتف إلى الحاسوب. عرضٌ لا صلاحية — الشريطُ يصفّي بعده بقواعده.
export const name = "146_sidebar_order";

export const sql = `
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS sidebar_order jsonb;
`;
