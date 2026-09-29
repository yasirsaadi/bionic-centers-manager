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

const CASE_LABEL: Record<string, string> = {
  prosthetic: "أطراف صناعية", medical_support: "مساند طبية", physiotherapy: "علاج طبيعي",
};

/**
 * **الفتحُ من إغلاقٍ لا يقع صامتاً** (§4.ar البند ٣ — قرارُ المالك «أ»، ٢٠٢٦-٠٩-٢٧).
 *
 * الحالةُ المغلقةُ تُفتَح **حين يعود المريضُ لخدمة** وحده: خدمةٌ جديدة، طلبُ جهازٍ أو بيعُ جزء، صيانةٌ، معاينةُ
 * طبيب، إضافةُ نوع حالة، تسعيرُ جلسات. وكلُّ فتحٍ منها يُكتب في `audit_log` (مَن ولماذا) داخل المعاملة نفسِها.
 * وما عداها — مزامنةٌ في الخلفية، دمجُ ملفّين، إعادةُ وسم دفعة، تنقيحُ معاينة — **لا يفتح أبداً**.
 *
 * يُرجع `{ caseType }` إن وقع الفتحُ فعلاً، و`null` إن كانت نشطةً أصلاً — فيستطيع المنادي أن يُخبر الموظّف.
 */
export async function reopenClosedCaseAuditedTx(
  tx: Executor,
  params: { caseId: number; reason: string; actor?: { userId?: number | null; userName?: string | null } },
): Promise<{ caseType: string; label: string } | null> {
  if (!(await reopenClosedCaseTx(tx, params.caseId))) return null;
  const r = await tx.execute(sql`SELECT patient_id, case_type, branch_id FROM patient_cases WHERE id = ${params.caseId}`);
  const row = (r.rows ?? [])[0] as any;
  const caseType = String(row?.case_type ?? "");
  const label = CASE_LABEL[caseType] ?? caseType;
  const { logAudit } = await import("../accounting/ledger");
  const { noteCaseReopened } = await import("./reopen_notice");
  noteCaseReopened(label);
  await logAudit({
    entityType: "patient_case", entityId: params.caseId, action: "update",
    userId: params.actor?.userId ?? null, userName: params.actor?.userName ?? null,
    branchId: row?.branch_id ?? null,
    oldValues: { status: "closed" },
    newValues: { status: "active", caseType, patientId: row?.patient_id ?? null, reopenedBy: params.reason },
    notes: `إعادة فتح حالة ${label} المغلقة — ${params.reason}`,
    tx,
  });
  return { caseType, label };
}

// ══ **قانونٌ واحد: «تأكّد أن القسم موجود»** (§4.ar البند ٣٣ — ٢٠٢٦-٠٩-٢٩) ══════════
//
// كان المنطقُ نفسُه — ابحث عن القسم، أنشئه إن غاب، وافتحه إن كان مغلقاً — مكتوباً
// مستقلّاً في ستّة أبواب، وكلٌّ يعامل المغلقَ بطريقته: بابٌ يفتحه مُدقَّقاً، وآخرُ
// يفتحه صامتاً، وثالثٌ («إتمام بيع الجهاز») يكتب المالَ عليه **وهو مغلق** فلا يراه
// قارئٌ يشترط `status = 'active'`. فصار البابُ هنا واحداً، وكلُّ بابٍ يقول فقط:
//   · `create` — ما يُكتب إن غاب القسم (`false` = شرطُ وجود: بابٌ لا يُنشئ قسماً)؛
//   · `reopen` — لماذا يُفتَح إن كان مغلقاً (`false` = لا يُفتَح: المزامنةُ وحدها،
//     قرارُ المالك «أ» في البند ٣ — الفتحُ لعودة المريض لخدمةٍ وحدها).
//
// **القفل**: `SELECT … FOR UPDATE` على الصفّ القائم، و`ON CONFLICT DO NOTHING` على
// `uq_patient_cases_patient_type` لإدراجٍ سبقَنا إليه أحد فيُقرأ ولا يُكسَر. والإنشاءُ
// **بلا `status`** صريح — افتراضُ العمود `active`.
export type EnsuredCase = {
  id: number; created: boolean; reopened: boolean;
  status: string; cost: number; costSource: string; branchId: number | null;
};

export async function ensureCaseTx(
  tx: Executor,
  params: {
    patientId: number; caseType: string; branchId: number | null;
    create: { cost?: number; costSource?: "auto" | "manual"; details?: Record<string, any> } | false;
    reopen: { reason: string; actor?: { userId?: number | null; userName?: string | null } } | false;
  },
): Promise<EnsuredCase | null> {
  const read = async () => {
    const r = await tx.execute(sql`
      SELECT id, status, cost, cost_source, branch_id FROM patient_cases
       WHERE patient_id = ${params.patientId} AND case_type = ${params.caseType}
       FOR UPDATE
    `);
    return (r.rows ?? [])[0] as any;
  };
  const settle = async (row: any, created: boolean): Promise<EnsuredCase> => {
    const id = Number(row.id);
    let reopened = false;
    if (!created && String(row.status) === "closed" && params.reopen) {
      reopened = Boolean(await reopenClosedCaseAuditedTx(tx, {
        caseId: id, reason: params.reopen.reason, actor: params.reopen.actor,
      }));
    }
    return {
      id, created, reopened,
      status: reopened ? "active" : String(row.status ?? "active"),
      cost: Number(row.cost ?? 0), costSource: String(row.cost_source ?? "auto"),
      branchId: row.branch_id == null ? null : Number(row.branch_id),
    };
  };

  const existing = await read();
  if (existing) return settle(existing, false);
  if (!params.create) return null;

  const c = params.create;
  const ins = await tx.execute(sql`
    INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, details)
    VALUES (${params.patientId}, ${params.branchId}, ${params.caseType},
            ${c.cost ?? 0}, ${c.costSource ?? "auto"}, ${JSON.stringify(c.details ?? {})}::jsonb)
    ON CONFLICT (patient_id, case_type) DO NOTHING
    RETURNING id, status, cost, cost_source, branch_id
  `);
  const fresh = (ins.rows ?? [])[0];
  if (fresh) return settle(fresh, true);
  //  سبقَنا إليه أحد بين القراءة والإدراج — يُقرأ الصفُّ القائم ويُعامَل كقائم.
  const raced = await read();
  if (!raced) throw new Error("ensureCaseTx: تعذّر فتح خيط الاختصاص");
  return settle(raced, false);
}

// ══ **والخيطُ الهدفُ يُضمَن وجودُه حين يُصحَّح نوعُ طلبٍ** (٤.y، تكملة) ════
//
// الطبيبُ يبدّل نوعَ الطلب إلى اختصاصٍ **لا خيطَ له على الملفّ بعد**، فيُفتَح الخيطُ
// الهدف داخل معاملة التوقيع نفسِها قبل نقل الطلب إليه: بكلفةِ صفر، ومغلقٌ يُفتَح
// مُدقَّقاً بالصفّ نفسِه. **ورفضٌ في أيّ خطوةٍ بعدها يتراجع عنه معها.** — غلافٌ رقيق
// فوق `ensureCaseTx` بقانونها.
export async function ensureActiveCaseTx(
  tx: Executor,
  params: {
    patientId: number; caseType: string; branchId: number | null;
    /** مَن يفتح ولماذا — الفتحُ من إغلاقٍ يُكتب في التدقيق (§4.ar البند ٣). */
    reason?: string; actor?: { userId?: number | null; userName?: string | null };
  },
): Promise<number> {
  const got = await ensureCaseTx(tx, {
    patientId: params.patientId, caseType: params.caseType, branchId: params.branchId,
    create: { cost: 0, costSource: "auto" },
    reopen: { reason: params.reason ?? "معاينة طبيب", actor: params.actor },
  });
  return got!.id;
}
