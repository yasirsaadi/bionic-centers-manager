// **زيارةُ حضورٍ تُكتب مع الإجراء نفسِه** (§4.aw) — في معاملته، فلا إجراءَ بلا أثرٍ في سجلّ الزيارات ولا أثرَ بلا إجراء.
//
// بلا كلفةٍ ولا نوعِ علاجٍ ولا جلسات: المالُ لمساره، والزيارةُ تقول **أنّ المريض حضر ولماذا**. وعلى قسم الجهاز —
// فلا تمسّ عدّادَ جلسات العلاج الطبيعي.

import { sql } from "drizzle-orm";

type Tx = { execute: (q: any) => Promise<any> };

/** شفتُ اللحظة بتوقيت بغداد — بقاعدة `POST /api/visits` نفسِها. */
function baghdadShift(now = new Date()): "morning" | "evening" {
  const hour = new Date(now.getTime() + 3 * 60 * 60 * 1000).getUTCHours();
  return hour >= 16 && hour <= 21 ? "evening" : "morning";
}

export async function recordAttendanceVisitTx(tx: Tx, p: {
  patientId: number;
  /** قسمُ الجهاز — يُستدَلّ منه على الحالة حين لا تُمرَّر. */
  serviceType?: string | null;
  caseId?: number | null;
  branchId?: number | null;
  deviceEpisodeId?: number | null;
  /** السبب — من `@shared/attendance` وحدها. */
  reason: string;
  notes?: string | null;
  createdBy: number | null;
}): Promise<void> {
  let caseId = p.caseId ?? null;
  if (caseId === null && p.serviceType) {
    const r = await tx.execute(sql`
      SELECT id FROM patient_cases WHERE patient_id = ${p.patientId} AND case_type = ${p.serviceType}
       ORDER BY id LIMIT 1
    `);
    const id = (r.rows ?? [])[0]?.id;
    caseId = id === undefined || id === null ? null : Number(id);
  }
  let branchId = p.branchId ?? null;
  if (branchId === null) {
    const r = await tx.execute(sql`SELECT branch_id FROM patients WHERE id = ${p.patientId}`);
    const b = (r.rows ?? [])[0]?.branch_id;
    branchId = b === undefined || b === null ? null : Number(b);
  }
  if (branchId === null) return;
  await tx.execute(sql`
    INSERT INTO visits (patient_id, branch_id, case_id, device_episode_id, details, notes, shift, created_by)
    VALUES (${p.patientId}, ${branchId}, ${caseId}, ${p.deviceEpisodeId ?? null}, ${p.reason},
            ${p.notes?.trim() || null}, ${baghdadShift()}, ${p.createdBy})
  `);
}
