// **مُرسِلُ تنبيهات الموظّفين** (§4.by) — دورةٌ كلَّ دقيقة في الخادم وكبسةٌ بعد كلّ حدث. لا شيءَ في المتصفّح.
//
// المستلِمون يُحسَبون **عند الإرسال** من الإعدادات الحيّة: مَن اختاره المسؤولُ لهذا النوع · وحسابُه نشط · ومربوطٌ
// بالبوت · ثمّ نطاقُ النوع: الموجَّهُ لصاحبه، والفرعيُّ لمن يعمل في الفرع (المسؤولُ في كلّها)، والاختصاصُ يُصفّي الطبيبَ.
// والفاعلُ لا يُنبَّه بما فعله. **والحجزُ ذرّيّ** (`FOR UPDATE SKIP LOCKED`) فلا يُرسل مثيلان الصفَّ نفسَه.
import { sql } from "drizzle-orm";
import { db } from "../db";
import { accessibleBranchesOf } from "../auth/session_refresh";
import { staffEventDef, eligibleStaffEvents } from "@shared/staff_notifications";
import { staffBotConfig } from "./config";
import { appUrl } from "./config";
import { sendStaffMessage } from "./client";
import { setStaffDispatchNudge } from "./outbox";

export const STAFF_DISPATCH_INTERVAL_MS = 60_000;
const BATCH = 50;
const MAX_ATTEMPTS = 5;

export interface Recipient { userId: number; chatId: string }

interface OutboxRow {
  id: number; event_type: string; branch_id: number | null; target_user_ids: number[] | null;
  exclude_user_id: number | null; specialty: string | null; text: string; link_path: string | null; attempts: number;
}

/** المستلِمون لصفٍّ واحد — دالّةٌ منفصلة يقيسها الاختبار. */
export async function resolveStaffRecipients(row: Pick<OutboxRow,
  "event_type" | "branch_id" | "target_user_ids" | "exclude_user_id" | "specialty">): Promise<Recipient[]> {
  const def = staffEventDef(row.event_type);
  if (!def) return [];
  const r = await db.execute(sql`
    SELECT u.id, u.role, u.branch_id, u.branch_ids, u.can_write_medical_exam, u.can_work_as_expert, u.medical_specialties, l.chat_id
      FROM staff_notification_prefs p
      JOIN system_users u ON u.id = p.user_id
      JOIN staff_telegram_links l ON l.user_id = u.id
     WHERE p.event_type = ${row.event_type}
       AND COALESCE(u.is_active, true) = true`);
  const out: Recipient[] = [];
  for (const u of r.rows as any[]) {
    const id = Number(u.id);
    //  **ودورُه يحقّ له النوعَ اليوم** — اختيارٌ قديمٌ قبل تغيّر الدور لا يُرسَل.
    if (!eligibleStaffEvents({ role: String(u.role), canWriteMedicalExam: u.can_write_medical_exam, canWorkAsExpert: u.can_work_as_expert })
      .includes(row.event_type)) continue;
    if (row.exclude_user_id && id === Number(row.exclude_user_id)) continue;
    if (row.target_user_ids && row.target_user_ids.length > 0) {
      if (!row.target_user_ids.map(Number).includes(id)) continue;
    } else if (def.scope === "targeted") {
      continue; //  موجَّهٌ بلا صاحب ⟵ لا أحد.
    }
    if (def.scope === "branch" && row.branch_id != null && u.role !== "admin") {
      if (!accessibleBranchesOf({ branchId: u.branch_id, branchIds: u.branch_ids }).includes(Number(row.branch_id))) continue;
    }
    if (row.specialty && u.can_write_medical_exam) {
      const specs = Array.isArray(u.medical_specialties) ? u.medical_specialties.map(String) : [];
      if (!specs.includes(row.specialty)) continue;
    }
    out.push({ userId: id, chatId: String(u.chat_id) });
  }
  return out;
}

function openButton(linkPath: string | null): unknown | undefined {
  const url = appUrl(linkPath);
  return url ? { inline_keyboard: [[{ text: "فتح في التطبيق", url }]] } : undefined;
}

/** دورةٌ واحدة. لا ترمي. تُرجع عدد الصفوف المعالَجة. */
export async function dispatchStaffOnce(): Promise<number> {
  if (!staffBotConfig()) return 0;
  let handled = 0;
  try {
    await db.transaction(async (tx) => {
      const claimed = await tx.execute(sql`
        SELECT id, event_type, branch_id, target_user_ids, exclude_user_id, specialty, text, link_path, attempts
          FROM staff_notification_outbox
         WHERE status = 'pending'
         ORDER BY id
         LIMIT ${BATCH}
         FOR UPDATE SKIP LOCKED`);
      for (const row of claimed.rows as unknown as OutboxRow[]) {
        const recipients = await resolveStaffRecipients(row);
        let failed = 0;
        for (const rc of recipients) {
          const res = await sendStaffMessage(rc.chatId, row.text, openButton(row.link_path));
          if (!res.ok && res.reason !== "blocked") failed++;
        }
        //  فشلٌ شبكيّ ⟵ يُعاد حتى خمس مرّات. وما نجح لبعضهم لا يُعاد لهم: الإعادةُ للشبكة وحدها، والنادرُ يُقبل.
        const done = failed === 0 || row.attempts + 1 >= MAX_ATTEMPTS;
        await tx.execute(sql`
          UPDATE staff_notification_outbox
             SET status = ${done ? (failed === 0 ? "sent" : "failed") : "pending"},
                 attempts = attempts + 1,
                 sent_at = ${done ? sql`NOW()` : sql`NULL`}
           WHERE id = ${row.id}`);
        handled++;
      }
    });
  } catch {
    console.error("[staff-telegram] dispatch cycle failed");
  }
  return handled;
}

let timer: NodeJS.Timeout | null = null;
let running = false;
function runGuarded(): void {
  if (running) return;
  running = true;
  void dispatchStaffOnce().finally(() => { running = false; });
}

export function startStaffDispatcher(): void {
  setStaffDispatchNudge(runGuarded);
  if (timer || !staffBotConfig()) return;
  timer = setInterval(runGuarded, STAFF_DISPATCH_INTERVAL_MS);
  timer.unref?.();
}
