// **صندوقُ تنبيهات الموظّفين الصادر** (§4.by).
//
// الحدثُ يُكتب صفّاً **داخل معاملة العملية نفسِها** (`enqueueStaffEvent(tx, …)`): ارتدّت ⟵ لا صفّ ولا رسالة؛
// التزمت ⟵ المُرسِلُ يلتقطه. **ولا يُسقط عمليةً أبداً**: فشلُ الإدراج يُبتلَع بنقطة حفظٍ داخل المعاملة، فلا تفشل
// معاينةٌ أو بيعٌ لأن تنبيهاً لم يُكتب. والمستلِمون **لا** يُحسَبون هنا — بل عند الإرسال من الإعدادات الحيّة.
import { sql, type SQL } from "drizzle-orm";
import { db } from "../db";
import { isStaffEventKey } from "@shared/staff_notifications";

export interface Executor { execute(q: SQL): Promise<any> }

export interface StaffEventInput {
  event: string;
  text: string;
  /** فرعُ الحدث — للأنواع الفرعيّة. */
  branchId?: number | null;
  /** صاحبُ المهمّة — للأنواع الموجَّهة. */
  targetUserIds?: number[] | null;
  /** الفاعلُ نفسُه لا يُنبَّه بما فعله. */
  excludeUserId?: number | null;
  /** اختصاصُ المعاينة: يُصفّى عليه الطبيبُ وحده. */
  specialty?: string | null;
  /** صفحةُ التطبيق لزرّ «فتح». */
  linkPath?: string | null;
}

/** يُدرج صفّاً واحداً. داخل معاملةٍ: بنقطة حفظ فلا يُفسدها فشلُه. */
export async function enqueueStaffEvent(ex: Executor | null | undefined, e: StaffEventInput): Promise<void> {
  if (!isStaffEventKey(e.event) || !e.text) return;
  const targets = e.targetUserIds?.filter((n) => Number.isInteger(n) && n > 0) ?? null;
  if (targets && targets.length === 0) return;
  const insert = sql`
    INSERT INTO staff_notification_outbox (event_type, branch_id, target_user_ids, exclude_user_id, specialty, text, link_path)
    VALUES (${e.event}, ${e.branchId ?? null},
            ${targets ? sql`ARRAY[${sql.join(targets.map((t) => sql`${t}`), sql`, `)}]::int[]` : sql`NULL`},
            ${e.excludeUserId ?? null}, ${e.specialty ?? null}, ${e.text}, ${e.linkPath ?? null})`;
  const exec = ex ?? db;
  const inTx = Boolean(ex) && ex !== (db as unknown);
  try {
    if (inTx) {
      await exec.execute(sql`SAVEPOINT staff_notify`);
      try {
        await exec.execute(insert);
        await exec.execute(sql`RELEASE SAVEPOINT staff_notify`);
      } catch (err) {
        await exec.execute(sql`ROLLBACK TO SAVEPOINT staff_notify`);
        throw err;
      }
    } else {
      await exec.execute(insert);
    }
  } catch {
    console.error(`[staff-telegram] enqueue failed (${e.event})`);
    return;
  }
  scheduleStaffDispatch();
}

let nudgeTimer: NodeJS.Timeout | null = null;
let nudgeHandler: (() => void) | null = null;
export function setStaffDispatchNudge(fn: () => void): void { nudgeHandler = fn; }
/** كبسةٌ بعد ثانيتين — بعد التزام المعاملة غالباً؛ والدورةُ الدوريّة تلتقط ما فاتها. */
function scheduleStaffDispatch(): void {
  if (!nudgeHandler || nudgeTimer) return;
  nudgeTimer = setTimeout(() => { nudgeTimer = null; nudgeHandler?.(); }, 2_000);
  nudgeTimer.unref?.();
}
