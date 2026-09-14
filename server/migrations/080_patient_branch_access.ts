// **إتاحةُ ملفّ المريض لفروعٍ إضافية** — بديلُ «نقل المريض».
//
// ══ الواقعة ══════════════════════════════════════════════════════════════
// كان `transferPatientToBranch` **ينقل** الملفَّ: يعيد كتابة `patients.branch_id`
// و`visits.branch_id` و`payments.branch_id` و`patient_cases.branch_id` **كلَّها**
// إلى الفرع الجديد. فمريضٌ دفع في كربلاء ثم جاء ذي قار كان ماله يُنزَع من
// حسابات كربلاء بأثرٍ رجعيّ ويُنسَب إلى فرعٍ لم يقبضه — **تزويرٌ محاسبيٌّ
// بضغطة**، وتقاريرُ كربلاء تتغيّر عن أمسٍ مضى.
//
// ══ القرار ═══════════════════════════════════════════════════════════════
// **لا نقلَ بعد اليوم — إتاحةٌ فقط.** فرعُ التسجيل يبقى كما هو إلى الأبد،
// وكلُّ صفٍّ تاريخيّ يبقى بفرعه الذي وقع فيه، ويُمنَح فرعٌ إضافيّ **حقَّ
// الوصول** إلى الملفّ كاملاً. وكلُّ حركةٍ جديدة تُنسَب **للفرع الذي حدثت
// فيه** لا لفرع التسجيل.
//
// ══ إضافيّ، idempotent، بلا مسٍّ لصفٍّ قائم ══════════════════════════════
// • جدولٌ واحد جديد، **بلا `UPDATE` ولا `DELETE` ولا `DROP`** — ولا تعبئةٌ
//   رجعيّة: مريضٌ نُقل قبل هذا الترحيل لا نعرف فرعَه الأصليّ (كُتب فوقه)،
//   واختراعُ صفّ إتاحةٍ له ادّعاءُ علمٍ بالماضي.
// • `ON DELETE CASCADE` على المريض — **ومع ذلك يُضاف إلى كاسكيد
//   `storage.deletePatient` صراحةً** كما توجب القاعدة الملزمة (القسم ٨)،
//   ويُختبَر حذفُ مريضٍ كامل حيّاً. الكاسكيدُ في القاعدة حزامُ أمانٍ لا بديلٌ
//   عن المسار المُختبَر.
// • والفرعُ مفتاحٌ حقيقيّ بلا `CASCADE`: حذفُ فرعٍ له صفوفُ إتاحةٍ يجب أن
//   يُردّ لا أن يمحوها بصمت.
// • ولا قيدَ يمنع منحَ فرع التسجيل نفسِه في القاعدة (لا يُقرأ عمودُ جدولٍ
//   آخر في `CHECK`) — يفرضه الخادم، ويُثبته الاختبار.
// • بلا مسٍّ لترحيلٍ من ٠٠١ إلى ٠٧٩.

export const name = "080_patient_branch_access";

export const sql = `
CREATE TABLE IF NOT EXISTS patient_branch_access (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  granted_by_user_id INTEGER,
  granted_by_name TEXT,
  note TEXT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pba_patient_branch
  ON patient_branch_access (patient_id, branch_id);

CREATE INDEX IF NOT EXISTS idx_pba_branch
  ON patient_branch_access (branch_id);

CREATE INDEX IF NOT EXISTS idx_pba_patient
  ON patient_branch_access (patient_id);
`;
