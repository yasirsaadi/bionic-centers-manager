// **التذكيرُ بإعدادات الجهاز الناقصة في البروتوكول** (§4.dq — قرارُ المالك ٢٠٢٦-١٠-١٢).
//
// سُئل المالك: «أتُمنع الخطّةُ من البدء وفي بروتوكولها جهازُ موجاتٍ صادمة بلا إعدادات؟» — فقال: «كلّا، لكن اطلب ممّن يعتمدها أن يذكّر سليم
// بإدخال معلومات جهاز الصدمات». فالخطّةُ تبدأ كما كانت (§4.do)، ومَن يبدؤها أو يعتمدها يرى ما ينقص وزرَّ «ذكّر المشرف» — يصل المشرفَ العامّ
// في تلغرامه (قناةُ «خطة تنتظر الاعتماد أو المراجعة»)، **ويُكتب سطرَ تدقيقٍ على البروتوكول** فيراه المشرفُ في صفحته ولو لم يربط تلغرام.
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { auditLog, systemUsers } from "@shared/schema";

export const SETTINGS_REMINDER_ACTION = "remind_settings";
/** تذكيرٌ ثانٍ للبروتوكول نفسِه خلال هذه المدّة لا يُرسَل ثانيةً (ضغطتان متتاليتان، أو أخصائيّان في الساعة نفسِها). */
export const SETTINGS_REMINDER_QUIET_MS = 10 * 60_000;

export interface SettingsReminderInfo { count: number; lastByName: string | null; lastAt: string | null }

/** **المشرفون العامّون** (حاملو «مشرف عام العلاج الطبيعي») — مَن يُذكَّر. */
export async function physioSupervisors(ex: any = db): Promise<{ id: number; name: string }[]> {
  const rows = await ex.select({ id: systemUsers.id, name: systemUsers.displayName }).from(systemUsers)
    .where(and(eq(systemUsers.canSupervisePhysio, true), sql`COALESCE(${systemUsers.isActive}, true) = true`))
    .orderBy(systemUsers.displayName);
  return rows.map((r: any) => ({ id: Number(r.id), name: String(r.name ?? "") }));
}

/** كم مرّةً ذُكِّر المشرفُ بإعدادات هذا البروتوكول، ومَن آخرُهم ومتى. */
export async function settingsReminderInfo(protocolId: number, ex: any = db): Promise<SettingsReminderInfo> {
  const where = and(eq(auditLog.entityType, "physio_protocol"), eq(auditLog.entityId, protocolId), eq(auditLog.action, SETTINGS_REMINDER_ACTION));
  const [{ n }] = await ex.select({ n: sql<number>`count(*)::int` }).from(auditLog).where(where);
  const [last] = await ex.select({ name: auditLog.userName, at: auditLog.createdAt }).from(auditLog).where(where)
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id)).limit(1);
  return { count: Number(n), lastByName: last?.name ?? null, lastAt: last?.at ? new Date(last.at).toISOString() : null };
}
