// **الرسائلُ المجدولة** (§4.by): تذكيرُ الخبير الصباحيّ بمواعيده، وتذكيرُ المتابعات الصباحيّ، والملخّصُ المسائيّ.
// **رسالةٌ واحدة لكلّ مستلِم** تجمع فروعَه هو (المسؤولُ: كلُّ الفروع المفتوحة) — لا رسالةً لكلّ فرع. وتُكتب في الصندوق
// موجَّهةً إليه بعينه، فيمرّ عليها المُرسِلُ كأيّ تنبيه. **والحجزُ اليوميّ** بنقطة `system_settings` كالنسخة الليلية:
// مثيلٌ واحد يكتب مهما تعدّدت الخوادم.
import cron from "node-cron";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { accessibleBranchesOf } from "../auth/session_refresh";
import { eligibleStaffEvents } from "@shared/staff_notifications";
import { activeExamSql } from "../medical/active_exam";
import { computeActiveReminders } from "../followups/service";
import { enqueueStaffEvent } from "./outbox";
import { staffBotConfig } from "./config";

interface Holder { userId: number; isAdmin: boolean; branches: number[] }

/** مَن اختاره المسؤولُ لهذا النوع، نشطٌ ومربوط. */
async function holdersOf(event: string): Promise<Holder[]> {
  const r = await db.execute(sql`
    SELECT u.id, u.role, u.extra_roles, u.branch_id, u.branch_ids, u.can_write_medical_exam, u.can_work_as_expert
      FROM staff_notification_prefs p
      JOIN system_users u ON u.id = p.user_id
      JOIN staff_telegram_links l ON l.user_id = u.id
     WHERE p.event_type = ${event} AND COALESCE(u.is_active, true) = true`);
  return (r.rows as any[]).filter((u) => eligibleStaffEvents({
    role: String(u.role), extraRoles: u.extra_roles, canWriteMedicalExam: u.can_write_medical_exam, canWorkAsExpert: u.can_work_as_expert,
  }).includes(event)).map((u) => ({
    userId: Number(u.id), isAdmin: u.role === "admin",
    branches: accessibleBranchesOf({ branchId: u.branch_id, branchIds: u.branch_ids }),
  }));
}

async function openBranches(): Promise<{ id: number; name: string }[]> {
  const r = await db.execute(sql`SELECT id, name FROM branches WHERE COALESCE(temporarily_closed, false) = false ORDER BY id`);
  return (r.rows as any[]).map((b) => ({ id: Number(b.id), name: String(b.name) }));
}

function branchesFor(h: Holder, open: { id: number; name: string }[]) {
  return h.isAdmin ? open : open.filter((b) => h.branches.includes(b.id));
}

const who = (name: unknown, code: unknown) => `${String(name ?? "").trim()}${code ? ` (${code})` : ""}`;

/** تذكيرُ الخبير: أوامرُه المفتوحة التي موعدُها اليوم أو غداً أو فات. */
export async function buildExpertDueDigests(): Promise<number> {
  let n = 0;
  for (const h of await holdersOf("expert_due_digest")) {
    const r = await db.execute(sql`
      WITH d AS (SELECT (NOW() AT TIME ZONE 'Asia/Baghdad')::date AS today)
      SELECT wo.id, wo.expected_delivery_date::text AS due, p.name, p.patient_code,
             CASE WHEN wo.expected_delivery_date < d.today
                       AND NULLIF(btrim(COALESCE(wo.hold_reason_code, '')), '') IS NULL THEN 'late'
                  WHEN wo.expected_delivery_date < d.today THEN 'late_excused'
                  WHEN wo.expected_delivery_date = d.today THEN 'today' ELSE 'tomorrow' END AS bucket
        FROM prosthetic_work_orders wo
        JOIN patients p ON p.id = wo.patient_id AND p.deleted_at IS NULL, d
       WHERE wo.expert_user_id = ${h.userId}
         AND wo.status NOT IN ('completed', 'cancelled')
         AND wo.expected_delivery_date IS NOT NULL
         AND wo.expected_delivery_date <= d.today + 1
       ORDER BY wo.expected_delivery_date, wo.id`);
    const rows = r.rows as any[];
    if (!rows.length) continue;
    const part = (b: string, title: string) => {
      const xs = rows.filter((x) => x.bucket === b);
      return xs.length ? `\n${title}:\n` + xs.map((x) => `• ${who(x.name, x.patient_code)} — أمر ${x.id}${b.startsWith("late") ? ` (موعده ${x.due})` : ""}`).join("\n") : "";
    };
    const text = `🗓️ صباح الخير — مواعيد التسليم:${part("late", "🔴 متأخّرة بلا عذر")}${part("late_excused", "🟡 فات موعدها بعذر مكتوب — ليست تأخيراً")}${part("today", "اليوم")}${part("tomorrow", "غداً")}`;
    await enqueueStaffEvent(null, { event: "expert_due_digest", targetUserIds: [h.userId], text, linkPath: "/manufacturing" });
    n++;
  }
  return n;
}

/** تذكيرُ المتابعات: مرضى العلاج الطبيعي المستحقّون اليوم في فروع المستلِم. */
export async function buildFollowupDigests(): Promise<number> {
  const open = await openBranches();
  const cache = new Map<number, Awaited<ReturnType<typeof computeActiveReminders>>>();
  let n = 0;
  for (const h of await holdersOf("followups_digest")) {
    const lines: string[] = [];
    let total = 0;
    for (const b of branchesFor(h, open)) {
      if (!cache.has(b.id)) cache.set(b.id, await computeActiveReminders(b.id));
      const items = cache.get(b.id)!;
      if (!items.length) continue;
      total += items.length;
      lines.push(`\nفرع ${b.name} (${items.length}):\n` + items.slice(0, 15)
        .map((x) => `• ${who(x.name, x.patientCode)} — آخر زيارة قبل ${x.daysSince} يوماً`).join("\n")
        + (items.length > 15 ? `\n… و${items.length - 15} آخرين` : ""));
    }
    if (!total) continue;
    await enqueueStaffEvent(null, {
      event: "followups_digest", targetUserIds: [h.userId],
      text: `📞 متابعات مستحقّة اليوم (${total}):${lines.join("")}`, linkPath: "/follow-ups",
    });
    n++;
  }
  return n;
}

/**
 * الملخّصُ المسائيّ لكلّ فرعٍ من فروع المستلِم، في رسالةٍ واحدة. و«متأخّرة» = **الأحمرُ وحده** — فات موعدُها ولا عذرَ
 * مكتوب (`latenessOf` في `shared/manufacturing.ts`، والشرطُ نفسُه بـSQL)؛ والأصفرُ بعذرٍ يُذكر منفصلاً ولا يُعدّ تأخيراً
 * (المالك ٢٠٢٦-١٠-٠٤).
 */
export async function buildEveningSummaries(): Promise<number> {
  const open = await openBranches();
  const stats = new Map<number, { newPatients: number; exams: number; delivered: number; late: number; lateExcused: number }>();
  const statOf = async (branchId: number) => {
    if (stats.has(branchId)) return stats.get(branchId)!;
    const r = await db.execute(sql`
      WITH d AS (SELECT (NOW() AT TIME ZONE 'Asia/Baghdad')::date AS today)
      SELECT
        (SELECT count(*) FROM patients p, d WHERE p.branch_id = ${branchId} AND p.deleted_at IS NULL
           AND ((p.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Baghdad')::date = d.today)::int AS new_patients,
        (SELECT count(*) FROM medical_exams me, d WHERE me.branch_id = ${branchId} AND ${activeExamSql("me")}
           AND (me.signed_at AT TIME ZONE 'Asia/Baghdad')::date = d.today)::int AS exams,
        (SELECT count(*) FROM prosthetic_work_orders wo, d WHERE wo.branch_id = ${branchId} AND wo.status = 'completed'
           AND (wo.completed_at AT TIME ZONE 'Asia/Baghdad')::date = d.today)::int AS delivered,
        (SELECT count(*) FROM prosthetic_work_orders wo JOIN patients p ON p.id = wo.patient_id AND p.deleted_at IS NULL, d
          WHERE wo.branch_id = ${branchId} AND wo.status NOT IN ('completed', 'cancelled')
            AND wo.expected_delivery_date < d.today
            AND NULLIF(btrim(COALESCE(wo.hold_reason_code, '')), '') IS NULL)::int AS late,
        (SELECT count(*) FROM prosthetic_work_orders wo JOIN patients p ON p.id = wo.patient_id AND p.deleted_at IS NULL, d
          WHERE wo.branch_id = ${branchId} AND wo.status NOT IN ('completed', 'cancelled')
            AND wo.expected_delivery_date < d.today
            AND NULLIF(btrim(COALESCE(wo.hold_reason_code, '')), '') IS NOT NULL)::int AS late_excused`);
    const x = r.rows[0] as any;
    const v = { newPatients: Number(x.new_patients), exams: Number(x.exams), delivered: Number(x.delivered), late: Number(x.late), lateExcused: Number(x.late_excused) };
    stats.set(branchId, v);
    return v;
  };
  let n = 0;
  for (const h of await holdersOf("evening_summary")) {
    const bs = branchesFor(h, open);
    if (!bs.length) continue;
    const parts: string[] = [];
    for (const b of bs) {
      const s = await statOf(b.id);
      parts.push(`\nفرع ${b.name}: مرضى جدد ${s.newPatients} · معاينات ${s.exams} · تسليمات وصيانات منجزة ${s.delivered} · أوامر متأخّرة بلا عذر ${s.late}${s.lateExcused ? ` (وبعذر مكتوب ${s.lateExcused} — ليست تأخيراً)` : ""}`);
    }
    await enqueueStaffEvent(null, {
      event: "evening_summary", targetUserIds: [h.userId], text: `🌙 ملخّص اليوم:${parts.join("")}`, linkPath: null,
    });
    n++;
  }
  return n;
}

/** حجزٌ يوميٌّ ذرّيّ — نسخةُ `claimDailyJob` في `backup.ts` بحرفها. */
async function claimToday(key: string): Promise<boolean> {
  const r = await db.execute(sql`
    WITH d AS (SELECT to_char(NOW() AT TIME ZONE 'Asia/Baghdad', 'YYYY-MM-DD') AS today)
    INSERT INTO system_settings (setting_key, setting_value, updated_at)
    SELECT ${key}, d.today, NOW() FROM d
    ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
      WHERE system_settings.setting_value IS DISTINCT FROM EXCLUDED.setting_value
    RETURNING id`);
  return (r.rowCount ?? 0) > 0;
}

async function runOnce(key: string, fn: () => Promise<number>): Promise<void> {
  try {
    if (!staffBotConfig() || !(await claimToday(key))) return;
    const n = await fn();
    console.log(`[staff-telegram] ${key}: ${n} message(s) queued`);
  } catch {
    console.error(`[staff-telegram] ${key} failed`);
  }
}

/** ٨:٠٠ صباحاً و٢١:٠٠ مساءً بتوقيت بغداد. */
export function initStaffDigests(): void {
  cron.schedule("0 8 * * *", () => {
    void runOnce("staff_digest_expert_due", buildExpertDueDigests);
    void runOnce("staff_digest_followups", buildFollowupDigests);
  }, { timezone: "Asia/Baghdad" });
  cron.schedule("0 21 * * *", () => { void runOnce("staff_digest_evening", buildEveningSummaries); }, { timezone: "Asia/Baghdad" });
}
