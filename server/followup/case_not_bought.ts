// «لم يشترِ» على بطاقة القسم في ملفّ المريض (§4.bm) — قراءةٌ محضة.
//
// ══ الواقعة (سيناء علي رشم، ٢٠٢٦-١٠-٠٢) ══════════════════════════════════
// قسمُ مساندٍ مفتوحٌ بكلفة صفر، فظنّ المالكُ أن مسنداً دُفع ثمنُه ونُسب إلى العلاج الطبيعي. والحقيقة: عوينت
// فلم تشترِ. «لم يشترِ» يُغلق المتابعةَ وحدها ويُبقي القسمَ مفتوحاً **عمداً** («عاد للشراء» — ترحيل ٠٧٢)، لكنّ البطاقةَ
// لم تكن تقول ذلك. فصارت تقوله، ومعه السبب.
//
// ══ متى يظهر — وآخرُ قرارٍ وحده ══════════════════════════════════════════
// آخرُ متابعةٍ للقسم (بمعرّفه، أو بنوعه لصفٍّ موروثٍ بلا معرّف) `closed_without_purchase`، **ولا جهازَ حيٌّ بعدها**:
// لا حلقةَ عادت `awaiting_exam` («عاد للشراء»)، ولا حلقةَ صُنعت أو سُلّمت أُنشئت بعد القرار (بيعٌ «بلا معاينة»).
// فما يُعرَض صادقٌ لحظةَ القراءة، ولا يبقى قرارٌ قديمٌ معلَّقاً على مريضٍ اشترى بعده.

import { db } from "../db";
import { sql } from "drizzle-orm";
import { FOLLOWUP_REASON_LABELS, isFollowupReason } from "@shared/followup";

export interface CaseNotBought {
  at: string | null;
  /** النصُّ كما قاله المريض، أو اسمُ الرمز الموروث، أو `null`. */
  reason: string | null;
  note: string | null;
}

export function notBoughtReasonOf(text: unknown, legacyCode: unknown): string | null {
  const t = typeof text === "string" ? text.trim() : "";
  if (t) return t;
  return isFollowupReason(legacyCode) ? FOLLOWUP_REASON_LABELS[legacyCode] : null;
}

export async function caseNotBoughtByCase(patientId: number): Promise<Map<number, CaseNotBought>> {
  const r = await db.execute(sql`
    WITH latest AS (
      SELECT DISTINCT ON (c.id)
             c.id AS case_id, f.status, f.not_bought_reason_text, f.closed_reason, f.last_note,
             COALESCE(f.purchase_decision_at, f.closed_at, f.updated_at) AS decided_at
        FROM patient_cases c
        JOIN post_exam_followups f
          ON f.patient_id = c.patient_id
         AND (f.case_id = c.id OR (f.case_id IS NULL AND f.service_type = c.case_type))
       WHERE c.patient_id = ${patientId}
         AND c.case_type IN ('prosthetic', 'medical_support')
       ORDER BY c.id, f.created_at DESC, f.id DESC
    )
    SELECT l.* FROM latest l
     WHERE l.status = 'closed_without_purchase'
       AND NOT EXISTS (
         SELECT 1 FROM patient_device_episodes e
          WHERE e.case_id = l.case_id
            AND (e.status = 'awaiting_exam'
                 OR (e.status IN ('in_manufacturing', 'delivered') AND e.created_at > l.decided_at)))
  `);
  const out = new Map<number, CaseNotBought>();
  for (const x of (r.rows ?? []) as any[]) {
    out.set(Number(x.case_id), {
      at: x.decided_at ? new Date(x.decided_at).toISOString() : null,
      reason: notBoughtReasonOf(x.not_bought_reason_text, x.closed_reason),
      note: typeof x.last_note === "string" && x.last_note.trim() ? x.last_note.trim() : null,
    });
  }
  return out;
}
