// **تذكيرُ الأقساط** (ترحيل ١٤٢، §4.ea) — قرارُ المالك: قبل الموعد بيوم وفي يومه، بالساعة التي اختارها الموظّف (بتوقيت بغداد)،
// **للاستقبال ومدير الفرع** (بوتُ الموظّفين — نوعُ `installment_due` الفرعيّ) **وللمريض** (بوتُ المرضى — إن كان مربوطاً).
//
//   • دورةٌ كلَّ دقيقة (`startInstallmentReminders` من `server/index.ts`، لا من المسارات — فالاختبارُ يشغّل `runInstallmentRemindersOnce` بلحظته).
//   • **مرّةً واحدة لكلّ (خطّة، قسط، قبل/في يومه)**: صفُّ `installment_reminders` يُدرَج أوّلاً `ON CONFLICT DO NOTHING` في معاملة
//     الرسالتين — فدورتان متزامنتان (أو نسختان من الخادم) لا ترسلان مرّتين، ورسالةٌ فشل إدراجُها تُرجع الصفَّ فتُعاد في الدورة التالية.
//   • قسطٌ اكتمل دفعُه، أو خطّةٌ أُلغيت أو اكتملت، أو مريضٌ في السلّة ⟵ لا تذكير. وتذكيرٌ فات وقتُه بأكثر من يوم لا يُرسَل متأخّراً.
import { sql } from "drizzle-orm";
import { db } from "../db";
import { enqueueStaffEvent } from "../staff_telegram/outbox";
import { remindersDue, dmy, money, type ReminderKind } from "@shared/installments";
import { baghdadTodayYmd } from "@shared/visit_date";
import { DEPARTMENT_LABELS, isDepartment } from "@shared/service_taxonomy";
import { completeFinishedPlans } from "./store";

export const INSTALLMENT_NOTIFICATION_TYPE = "installment_due";

export interface ReminderRunResult { sent: { planId: number; index: number; kind: ReminderKind }[]; completed: number }

export async function runInstallmentRemindersOnce(now: Date = new Date()): Promise<ReminderRunResult> {
  const completed = await completeFinishedPlans();
  const today = baghdadTodayYmd(now);
  const plans = (await db.execute(sql`
    SELECT ip.id, ip.patient_id, ip.branch_id, ip.case_id, pc.case_type, ip.total_amount, ip.installment_amount,
           to_char(ip.start_date, 'YYYY-MM-DD') AS first_due, ip.reminder_time, ip.guarantor_name, ip.guarantor_phone,
           -- لحظةُ الفتح مطلقةً: العمودُ بلا منطقة (منطقةُ الجلسة) ⟵ timestamptz ⟵ مللي ثانية — لا يتعلّق بمنطقة Node.
           (extract(epoch FROM ip.created_at AT TIME ZONE current_setting('TimeZone')) * 1000)::bigint AS created_ms,
           p.name AS patient_name, p.patient_code, b.name AS branch_name,
           (SELECT COALESCE(SUM(pp.amount), 0) FROM payments pp WHERE pp.case_id = ip.case_id AND pp.id > COALESCE(ip.opening_payment_id, 0))::bigint AS paid
      FROM installment_plans ip
      JOIN patient_cases pc ON pc.id = ip.case_id
      JOIN patients p ON p.id = ip.patient_id
      LEFT JOIN branches b ON b.id = ip.branch_id
     WHERE ip.status = 'active' AND ip.case_id IS NOT NULL AND p.deleted_at IS NULL`)).rows as any[];
  const sent: ReminderRunResult["sent"] = [];
  for (const pl of plans) {
    const total = Number(pl.total_amount), monthly = Number(pl.installment_amount);
    const due = remindersDue({ totalAmount: total, installmentAmount: monthly, firstDueDate: pl.first_due, paidToward: Number(pl.paid),
      today, reminderTime: pl.reminder_time, now, createdAt: new Date(Number(pl.created_ms)) });
    for (const r of due) {
      try {
        const ok = await db.transaction(async (tx) => {
          const ins = await tx.execute(sql`INSERT INTO installment_reminders (plan_id, due_index, kind) VALUES (${pl.id}, ${r.index}, ${r.kind})
            ON CONFLICT DO NOTHING RETURNING plan_id`);
          if (!ins.rows.length) return false;
          const count = Math.ceil(total / monthly);
          const amount = Math.min(total, (r.index + 1) * monthly) - Math.max(Number(pl.paid), r.index * monthly);
          const when = r.kind === "before" ? "غداً" : "اليوم";
          const who = `${pl.patient_name}${pl.patient_code ? ` (${pl.patient_code})` : ""}`;
          const caseType: unknown = pl.case_type;
          const dept = isDepartment(caseType) ? DEPARTMENT_LABELS[caseType] : "";
          const guarantor = pl.guarantor_name || pl.guarantor_phone ? `\nالكفيل: ${[pl.guarantor_name, pl.guarantor_phone].filter(Boolean).join(" — ")}` : "";
          await enqueueStaffEvent(tx, {
            event: "installment_due", branchId: Number(pl.branch_id),
            text: `💳 قسطٌ مستحقّ ${when}: ${who}${dept ? ` — ${dept}` : ""}${pl.branch_name ? ` — فرع ${pl.branch_name}` : ""}\n`
              + `القسط ${r.index + 1} من ${count}: ${money(amount)} دينار — موعده ${dmy(r.dueDate)}${guarantor}`,
            linkPath: `/patients/${pl.patient_id}`,
          });
          //  والمريضُ عبر تلغرام إن كان مربوطاً (قرارُ المالك) — جهاتُه النشطة على قناة تلغرام وحدها؛ والطابورُ يعيد المحاولة إن تعثّر الإرسال.
          await tx.execute(sql`
            INSERT INTO patient_notification_deliveries (patient_id, patient_contact_id, channel, notification_type, payload)
            SELECT ${pl.patient_id}, pc.id, pc.channel, ${INSTALLMENT_NOTIFICATION_TYPE},
                   ${JSON.stringify({ amount, dueDate: r.dueDate, kind: r.kind, index: r.index + 1, count, branchName: pl.branch_name ?? null })}::jsonb
              FROM patient_contacts pc
             WHERE pc.patient_id = ${pl.patient_id} AND pc.revoked_at IS NULL AND pc.channel = 'telegram'`);
          return true;
        });
        if (ok) sent.push({ planId: Number(pl.id), index: r.index, kind: r.kind });
      } catch {
        console.error("[installments] reminder failed");
      }
    }
  }
  return { sent, completed };
}

let timer: ReturnType<typeof setInterval> | null = null;
export function startInstallmentReminders(): void {
  if (timer) return;
  const tick = () => { runInstallmentRemindersOnce().catch(() => console.error("[installments] reminder cycle failed")); };
  timer = setInterval(tick, 60_000);
  setTimeout(tick, 15_000);
}
