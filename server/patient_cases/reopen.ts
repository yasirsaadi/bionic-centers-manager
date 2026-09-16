// **الحالةُ المغلقة تُفتَح من جديد — بالصفّ نفسِه** (تكملةُ المرحلة الثالثة).
//
// ══ الواقعة ═══════════════════════════════════════════════════════════════
// الإغلاق (`patient_cases.status = 'closed'`) يُخرج الحالةَ من كلّ طابورِ عمل
// حيّ — خريطتا انتظار المعاينة · قائمةُ عمل الطبيب · عدّادُ العلاج الطبيعي ·
// أدواتُ المساعد · مزامنةُ الكلفة (سبعةُ قرّاءٍ يشترطون `= 'active'`).
//
// **ولم يكن في المستودع بابٌ يعيدها.** فمريضٌ أُغلق ملفُّ خدمته ثمّ عاد
// يطلبها بعد شهور كان يقع في طريقٍ مسدود:
//   · `syncPatientCases` تفحص **النوعَ لا الحالة** (`has(t)`) فلا تُنشئ
//     شيئاً — والصفُّ يبقى `closed` إلى الأبد؛
//   · وفهرسُ `uq_patient_cases_patient_type` يمنع صفّاً ثانياً من النوع
//     نفسِه، فلا مخرجَ بإنشاءٍ جديد أصلاً — **وهذا هو الصواب**: الصفُّ
//     الواحد هو ما تشير إليه المعايناتُ والحلقاتُ والدفعاتُ وقيودُ الكلف.
//   · وفتحُ طلبِ جهازٍ كان يقفل الصفَّ ولا يقرأ حالتَه، فتُولَد حلقةٌ حيّةٌ
//     على حالةٍ مغلقة — عملٌ قائمٌ لا يراه أحد.
//
// ══ والفتحُ **يغيّر الحالةَ وحدَها** ═══════════════════════════════════════
// لا كلفةٌ تُعاد كتابتُها · ولا `cost_source` · ولا `details` · ولا
// `branch_id` · ولا `created_at` · ولا معرّفٌ جديد. فكلُّ ما يشير إلى الصفّ
// — معايناتُه وحلقاتُه وأوامرُ تصنيعه ودفعاتُه وقيودُ كلفه وزياراتُه —
// يبقى مربوطاً به بايتاً بايت، ويعود معه إلى النظام الفعّال كما كان.
//
// **ولا يُفتَح إلّا المغلق**: الشرطُ `status = 'closed'` في `UPDATE` نفسِه،
// فحالةٌ نشطةٌ لا تُلمَس ولا يُحدَّث ختمُها الزمنيُّ بلا سبب.

import { sql } from "drizzle-orm";

type Executor = { execute: (q: any) => Promise<any> };

/**
 * يُعيد حالةً مغلقةً إلى `active` **بالصفّ نفسِه**، ويُرجع `true` إن وقع
 * الفتحُ فعلاً (فيستطيع المنادي أن يدقّقه أو يسجّله).
 *
 * تُنادى داخل معاملة المنادي وتحت قفله — لا تفتح معاملةً بنفسها.
 */
export async function reopenClosedCaseTx(
  tx: Executor,
  caseId: number,
): Promise<boolean> {
  const r = await tx.execute(sql`
    UPDATE patient_cases
       SET status = 'active', updated_at = NOW()
     WHERE id = ${caseId} AND status = 'closed'
    RETURNING id
  `);
  return (r.rows ?? []).length > 0;
}

// ══ **والخيطُ الهدفُ يُضمَن وجودُه حين يُصحَّح نوعُ طلبٍ** (٤.y، تكملة) ════
//
// الطبيبُ يبدّل نوعَ الطلب إلى اختصاصٍ **لا خيطَ له على الملفّ بعد**. ولا
// يمكن نقلُ الطلب إلى خيطٍ غير موجود، فكان النظامُ يُسقط التصحيحَ ويتولّاه
// مسارُ §4.b: يُنشئ الخيطَ الجديد **ويهدم** الخيطَ القديم بما فيه الطلبُ
// نفسُه (حلقةٌ `awaiting_exam` = سقالةٌ بحكم §4.r). فيخرج المريضُ من التوقيع
// **بلا طلبِ جهازٍ إطلاقاً** ومعاينتُه ومتابعتُه بلا هويّة — لا «كأنّه
// سُجّل أطرافاً من البداية».
//
// فيُفتَح الخيطُ الهدف **داخل معاملة التوقيع نفسِها** قبل نقل الطلب إليه:
//   · بكلفةِ صفر — فتحُ خيطٍ لا يحرّك ديناراً (نفسُ قاعدة §4.e)؛
//   · و`ON CONFLICT DO NOTHING` على `uq_patient_cases_patient_type`، فسباقٌ
//     أنشأه بيننا يُقرأ ولا يُكسَر (نفسُ نمط `syncPatientCases` بحرفه)؛
//   · ومغلقٌ يُفتَح بـ`reopenClosedCaseTx` أعلاه — بالصفّ نفسِه لا بثانٍ.
// **ورفضٌ في أيّ خطوةٍ بعدها يتراجع عنه معها** — فالصفُّ داخل المعاملة.
export async function ensureActiveCaseTx(
  tx: Executor,
  params: { patientId: number; caseType: string; branchId: number | null },
): Promise<number> {
  const ins = await tx.execute(sql`
    INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
    VALUES (${params.patientId}, ${params.branchId}, ${params.caseType}, 0, 'auto', 'active')
    ON CONFLICT (patient_id, case_type) DO NOTHING
    RETURNING id
  `);
  const fresh = (ins.rows ?? [])[0];
  if (fresh) return Number(fresh.id);

  //  سبقَنا إليه أحد — يُقرأ الصفُّ القائم ويُفتَح إن كان مغلقاً.
  const got = await tx.execute(sql`
    SELECT id, status FROM patient_cases
     WHERE patient_id = ${params.patientId} AND case_type = ${params.caseType}
     FOR UPDATE
  `);
  const row = (got.rows ?? [])[0];
  if (!row) throw new Error("ensureActiveCaseTx: تعذّر فتح خيط الاختصاص");
  const id = Number(row.id);
  if (String(row.status) === "closed") await reopenClosedCaseTx(tx, id);
  return id;
}
