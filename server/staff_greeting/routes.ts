// **تحيّةُ الموظّف اليومية** (ترحيل ١٣٣، §4.dp) — النقاطُ والتذكيرُ الشهريّ. القاعدةُ في `shared/staff_greeting.ts`.
//
//   GET  /api/greeting            — تحيّةُ اليوم للسائل (أو للمالك تذكيرُ التغيير حين يحين)، أو «لا شيء» إن رآها اليوم
//   POST /api/greeting/seen       — ضغط «حسناً»: لا تظهر ثانيةً اليومَ ولو من جهازٍ آخر
//   GET  /api/admin/greeting      — العباراتُ وعمرُها (للمسؤول)
//   PUT  /api/admin/greeting      — تغييرُ العبارات (للمسؤول، بسطر تدقيق)
//   POST /api/admin/greeting/keep — «أبقِها شهراً آخر» (للمسؤول، بسطر تدقيق)
import type { Express } from "express";
import cron from "node-cron";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { systemUsers } from "@shared/schema";
import { logAudit } from "../accounting/ledger";
import { storage } from "../storage";
import { getSession } from "../sessions_module/permissions";
import { sendTelegram } from "../notifications/telegram";
import { baghdadTodayYmd } from "@shared/visit_date";
import {
  GREETING_REMINDER_KEY, GREETING_SETTING_KEY, greetingAge, greetingCycleStart, greetingReminderText, greetingText, parseGreetings,
  phraseFor, readGreetingConfig, salutationAt, type GreetingConfig,
} from "@shared/staff_greeting";

/** العباراتُ المحفوظة — وما لم تُحفَظ فالأولى بيوم اليوم. */
export async function loadGreetingConfig(): Promise<GreetingConfig> {
  return readGreetingConfig(await storage.getSystemSetting(GREETING_SETTING_KEY), new Date().toISOString());
}

async function saveGreetingConfig(c: GreetingConfig): Promise<void> {
  await storage.setSystemSetting(GREETING_SETTING_KEY, JSON.stringify(c));
}

/**
 * **تذكيرُ المالك في تلغرام — مرّةً لكلّ دورة** (٣٠ يوماً من آخر تغييرٍ أو «أبقِها»). الحجزُ ذرّيّ بقيمة بداية الدورة، فنسختا خادمٍ لا ترسلان
 * رسالتين؛ وإن فشل الإرسالُ (تلغرام غيرُ مضبوط أو عطل) أُطلق الحجزُ فيُعاد غداً. يُرجع ما حدث (للاختبار).
 */
export async function runGreetingReminder(now: Date = new Date()): Promise<"not_due" | "already" | "sent" | "failed"> {
  try {
    const c = await loadGreetingConfig();
    const age = greetingAge(c, now);
    if (!age.due) return "not_due";
    const cycle = greetingCycleStart(c);
    const claimed = await db.execute(sql`
      INSERT INTO system_settings (setting_key, setting_value, updated_at) VALUES (${GREETING_REMINDER_KEY}, ${cycle}, NOW())
      ON CONFLICT (setting_key) DO UPDATE SET setting_value = ${cycle}, updated_at = NOW()
        WHERE system_settings.setting_value IS DISTINCT FROM ${cycle}
      RETURNING id`);
    if (!(claimed.rowCount ?? 0)) return "already";
    if (await sendTelegram(greetingReminderText(age.days))) return "sent";
    await storage.setSystemSetting(GREETING_REMINDER_KEY, "");
    return "failed";
  } catch (e: any) {
    console.error("[greeting] reminder failed:", e?.message ?? e);
    return "failed";
  }
}

/** كلَّ يومٍ ١٠:٠٥ بغداد (٠٧:٠٥ UTC) — بعيداً عن النسخة الليلية والمحو الصباحيّ. */
export function initGreetingReminder(): void {
  cron.schedule("5 7 * * *", () => { void runGreetingReminder(); }, { timezone: "UTC" });
  console.log("[greeting] monthly reminder check scheduled daily at 10:05 Baghdad");
}

export function registerStaffGreetingRoutes(app: Express, isAuthenticated: any) {
  const audit = (req: any, s: any, action: string, oldValues: unknown, newValues: unknown) =>
    logAudit({ entityType: "staff_greeting", entityId: 0, action, userId: s.userId ?? null, userName: s.displayName ?? null,
      oldValues, newValues, ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null });

  app.get("/api/greeting", isAuthenticated, async (req: any, res) => {
    try {
      const s = getSession(req);
      if (!s?.userId) return res.json({ show: false });
      const [u] = await db.select({ name: systemUsers.displayName, last: systemUsers.lastGreetedOn })
        .from(systemUsers).where(eq(systemUsers.id, Number(s.userId)));
      const today = baghdadTodayYmd();
      if (!u || String(u.last ?? "").slice(0, 10) === today) return res.json({ show: false });
      const c = await loadGreetingConfig();
      //  المالكُ لا يُحيّي نفسَه — ويرى بدلَها تذكيرَ التغيير مرّةً في اليوم حين يحين.
      if (s.isAdmin) {
        const age = greetingAge(c);
        return res.json(age.due ? { show: true, kind: "reminder", days: age.days } : { show: false });
      }
      const salutation = salutationAt();
      return res.json({ show: true, kind: "greeting", period: salutation === "صباح الخير" ? "morning" : "evening",
        text: greetingText(salutation, u.name, phraseFor(c.phrases, Number(s.userId), today)) });
    } catch (e) {
      console.error("[greeting]", e);
      res.json({ show: false });
    }
  });

  app.post("/api/greeting/seen", isAuthenticated, async (req: any, res) => {
    try {
      const s = getSession(req);
      if (!s?.userId) return res.json({ ok: true });
      await db.update(systemUsers).set({ lastGreetedOn: baghdadTodayYmd() }).where(eq(systemUsers.id, Number(s.userId)));
      res.json({ ok: true });
    } catch (e) {
      console.error("[greeting]", e);
      res.status(500).json({ error: "تعذّر الحفظ" });
    }
  });

  const adminOnly = (req: any, res: any) => {
    const s = getSession(req);
    if (!s?.isAdmin) { res.status(403).json({ error: "للمسؤول وحده" }); return null; }
    return s;
  };

  app.get("/api/admin/greeting", isAuthenticated, async (req: any, res) => {
    if (!adminOnly(req, res)) return;
    try {
      const c = await loadGreetingConfig();
      res.json({ ...c, ...greetingAge(c) });
    } catch (e) { console.error("[greeting]", e); res.status(500).json({ error: "تعذّر التحميل" }); }
  });

  app.put("/api/admin/greeting", isAuthenticated, async (req: any, res) => {
    const s = adminOnly(req, res);
    if (!s) return;
    const phrases = parseGreetings(req.body?.phrases);
    if (typeof phrases === "string") return res.status(400).json({ error: phrases });
    try {
      const before = await loadGreetingConfig();
      const after: GreetingConfig = { phrases, updatedAt: new Date().toISOString(), updatedByName: s.displayName ?? null, keptAt: null };
      await saveGreetingConfig(after);
      await audit(req, s, "update", { phrases: before.phrases }, { phrases });
      res.json({ ...after, ...greetingAge(after) });
    } catch (e) { console.error("[greeting]", e); res.status(500).json({ error: "تعذّر الحفظ" }); }
  });

  app.post("/api/admin/greeting/keep", isAuthenticated, async (req: any, res) => {
    const s = adminOnly(req, res);
    if (!s) return;
    try {
      const c = await loadGreetingConfig();
      const after: GreetingConfig = { ...c, keptAt: new Date().toISOString() };
      await saveGreetingConfig(after);
      await audit(req, s, "keep", { keptAt: c.keptAt ?? null }, { keptAt: after.keptAt });
      res.json({ ...after, ...greetingAge(after) });
    } catch (e) { console.error("[greeting]", e); res.status(500).json({ error: "تعذّر الحفظ" }); }
  });
}
