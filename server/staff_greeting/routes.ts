// **تحيّةُ الموظّف اليومية** (ترحيل ١٣٣، §4.dp) — وإنجازُ الأمس (§4.gw). القاعدةُ في `shared/staff_greeting.ts`، والعدُّ في `./yesterday.ts`.
//
//   GET  /api/greeting            — تحيّةُ اليوم للسائل (إنجازُه أمس، أو عبارةٌ متناوبة إن لم يكن له)، أو «لا شيء» إن رآها اليوم أو كان المسؤول
//   POST /api/greeting/seen       — ضغط «حسناً»: لا تظهر ثانيةً اليومَ ولو من جهازٍ آخر
//   GET  /api/admin/greeting      — العباراتُ وسطرُ المالك (للمسؤول)
//   PUT  /api/admin/greeting      — تغييرُ العبارات (للمسؤول، بسطر تدقيق)
//   PUT  /api/admin/greeting/note — سطرُ المالك تحت إنجاز الأمس (§4.gw — للمسؤول، بسطر تدقيق)
//   PUT  /api/admin/greeting/weather-fx — مفتاحُ مؤثّر الطقس مع التحيّة (§4.fw — للمسؤول، بسطر تدقيق)
//
// والتذكيرُ الشهريّ بتغيير العبارات (نافذةُ المالك وتلغرامُه) **تقاعد** بقرار المالك ٢٠٢٦-١١-٢٣: العباراتُ صارت احتياطاً لمن لا إنجازَ له.
import type { Express } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { systemUsers } from "@shared/schema";
import { logAudit } from "../accounting/ledger";
import { storage } from "../storage";
import { getSession } from "../sessions_module/permissions";
import { notifyUser } from "../live/updates";
import { baghdadTodayYmd } from "@shared/visit_date";
import {
  ACHIEVEMENTS_CLOSING, ACHIEVEMENTS_INTRO, DEFAULT_GREETINGS, GREETING_SETTING_KEY, achievementGreetingText, achievementKeysFor, achievementLines,
  greetingText, parseGreetingNote, parseGreetings, phraseFor, previousYmd, readGreetingConfig, salutationAt, type GreetingConfig,
} from "@shared/staff_greeting";
import { rolesOf } from "@shared/user_roles";
import { loadDayStats } from "./yesterday";
import { WEATHER_FX_SETTING_KEY, weatherFxEnabled } from "@shared/weather_greeting_fx";

/** العباراتُ المحفوظة — وما لم تُحفَظ فالأولى بيوم اليوم. */
export async function loadGreetingConfig(): Promise<GreetingConfig> {
  return readGreetingConfig(await storage.getSystemSetting(GREETING_SETTING_KEY), new Date().toISOString());
}

/** مفتاحُ مؤثّر الطقس مع التحيّة (§4.fw) — مفعّلٌ ما لم يُطفئه المسؤول. */
export async function loadWeatherFxEnabled(): Promise<boolean> {
  return weatherFxEnabled(await storage.getSystemSetting(WEATHER_FX_SETTING_KEY));
}

/** الإعدادُ المحفوظ كائناً يُدمج فيه — وما ليس كائنَ JSON صالحاً (تالفٌ أو فارغٌ أو مصفوفة) ⟵ كائنٌ فارغ، فالحفظُ يُصلحه (مراجعةُ Codex). */
export function storedGreetingObject(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "string" || !raw.trim()) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}

/**
 * **يدمج حقولاً في الإعداد تحت قفل الصفّ** (مراجعةُ Codex على «أبقِها» — §4.dp): قراءةُ الإعداد ثمّ كتابتُه كاملاً بلا قفل تمحو ما كتبه مسؤولٌ آخر
 * بينهما (العباراتُ فوق السطر أو السطرُ فوق العبارات). وبلا صفٍّ بعد ⟵ العباراتُ الأولى بالحقول. **والقيمةُ التالفة لا تُسقط الحفظ** (مراجعةُ Codex
 * على §4.gw): كانت تُحوَّل إلى `jsonb` في الاستعلام فيردّ ٥٠٠ ولا يُصلحها شيءٌ من الواجهة — فصارت تُقرأ هنا، والتالفُ يُبدأ من العبارات الأولى.
 * ⟵ الإعدادُ بعد الدمج.
 */
async function mergeGreetingConfig(patch: Partial<GreetingConfig>): Promise<GreetingConfig> {
  const now = new Date().toISOString();
  const seed = { phrases: [...DEFAULT_GREETINGS], updatedAt: now, updatedByName: null };
  return db.transaction(async (tx) => {
    await tx.execute(sql`INSERT INTO system_settings (setting_key, setting_value, updated_at) VALUES (${GREETING_SETTING_KEY}, '', NOW())
      ON CONFLICT (setting_key) DO NOTHING`);
    const r = await tx.execute(sql`SELECT setting_value FROM system_settings WHERE setting_key = ${GREETING_SETTING_KEY} FOR UPDATE`);
    const stored = storedGreetingObject((r.rows[0] as any)?.setting_value);
    const merged = JSON.stringify({ ...(Object.keys(stored).length ? stored : seed), ...patch });
    await tx.execute(sql`UPDATE system_settings SET setting_value = ${merged}, updated_at = NOW() WHERE setting_key = ${GREETING_SETTING_KEY}`);
    return readGreetingConfig(merged, now);
  });
}

/** يومُ «حسناً»: يومُ التحيّة المعروضة إن كان اليومَ أو أمسِ (بغداد)، وما سواه ⟵ اليوم. */
export function acknowledgedDay(raw: unknown, today: string): string {
  const d = typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
  if (!d) return today;
  const t = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
  const yesterday = new Date(t - 86_400_000).toISOString().slice(0, 10);
  return d === today || d === yesterday ? d : today;
}

export function registerStaffGreetingRoutes(app: Express, isAuthenticated: any) {
  const audit = (req: any, s: any, action: string, oldValues: unknown, newValues: unknown) =>
    logAudit({ entityType: "staff_greeting", entityId: 0, action, userId: s.userId ?? null, userName: s.displayName ?? null,
      oldValues, newValues, ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null });

  app.get("/api/greeting", isAuthenticated, async (req: any, res) => {
    try {
      const s = getSession(req);
      if (!s?.userId) return res.json({ show: false });
      const [u] = await db.select({ name: systemUsers.displayName, last: systemUsers.lastGreetedOn, role: systemUsers.role,
        extraRoles: systemUsers.extraRoles, canSupervisePhysio: systemUsers.canSupervisePhysio,
        canWriteMedicalExam: systemUsers.canWriteMedicalExam, canWorkAsExpert: systemUsers.canWorkAsExpert })
        .from(systemUsers).where(eq(systemUsers.id, Number(s.userId)));
      const today = baghdadTodayYmd();
      if (!u || String(u.last ?? "").slice(0, 10) === today) return res.json({ show: false });
      //  **المالكُ لا يُحيّي نفسَه** — ولا تذكيرَ له بعد اليوم (تقاعد التذكيرُ الشهريّ، §4.gw).
      if (s.isAdmin) return res.json({ show: false });
      const c = await loadGreetingConfig();
      const salutation = salutationAt();
      //  **إنجازُ الأمس** (§4.gw): أرقامُ صاحب الجلسة وحده بأدواره، ولا صفر — وبلا إنجازٍ ⟵ العبارةُ المتناوبة كما كانت.
      //  الأدوارُ والأعلامُ من صفّ الحساب نفسِه (لا من نسخة الجلسة) — وعلَما المعاينة والخبير يُعدّان عملَهما لمن لا يحمل دورَهما (مراجعةُ Codex).
      const keys = achievementKeysFor(rolesOf({ role: u.role, extraRoles: u.extraRoles }), {
        canSupervisePhysio: u.canSupervisePhysio === true, canWriteMedicalExam: u.canWriteMedicalExam === true, canWorkAsExpert: u.canWorkAsExpert === true });
      const yesterday = previousYmd(today);
      const achievements = achievementLines(keys, await loadDayStats(Number(s.userId), keys, yesterday));
      const text = achievements.length
        ? achievementGreetingText(salutation, u.name, achievements)
        : greetingText(salutation, u.name, phraseFor(c.phrases, Number(s.userId), today));
      //  `weatherFx`: هل يُرافقها مؤثّرُ الطقس (§4.fw) — والطقسُ نفسُه تقرؤه الواجهةُ من شريحتها، فلا طلبَ جديد.
      return res.json({
        show: true, kind: "greeting", period: salutation === "صباح الخير" ? "morning" : "evening", day: today, text,
        salutation: `${salutation}${(u.name ?? "").trim() ? ` ${(u.name ?? "").trim()}` : ""}`,
        achievements, ...(achievements.length ? { achievementsDay: yesterday, intro: ACHIEVEMENTS_INTRO, closing: ACHIEVEMENTS_CLOSING } : {}),
        note: c.note ?? null, weatherFx: await loadWeatherFxEnabled(),
      });
    } catch (e) {
      //  **فشلُ القراءة خطأٌ لا «لا تحيّة»** (مراجعةُ Codex): الواجهةُ تحفظ الجوابَ يومَها كلَّه، فـ«لا شيء» هنا تُخفي تحيّةَ اليوم ولو عاد الخادم؛
      //  والخطأُ تُعيد الواجهةُ طلبَه.
      console.error("[greeting]", e);
      res.status(500).json({ error: "تعذّر التحميل" });
    }
  });

  app.post("/api/greeting/seen", isAuthenticated, async (req: any, res) => {
    try {
      const s = getSession(req);
      if (!s?.userId) return res.json({ ok: true });
      //  **يُكتب يومُ التحيّة التي عُرضت** (مراجعةُ Codex): «حسناً» قبل منتصف الليل بلحظةٍ تصل بعده — فيومُ الخادم يُسكت تحيّةَ الغد ولم تُرَ.
      //  ويُقبل اليومُ أو أمسِ وحدهما، ولا يرجع اليومُ المكتوبُ إلى الوراء (جهازٌ آخر سجّل اليوم).
      const today = baghdadTodayYmd();
      const day = acknowledgedDay(req.body?.day, today);
      await db.execute(sql`UPDATE system_users SET last_greeted_on = GREATEST(COALESCE(last_greeted_on, ${day}::date), ${day}::date)
        WHERE id = ${Number(s.userId)}`);
      //  وجهازُه الآخر — إن كانت تحيّتُه مفتوحةً هناك — يُغلقها (إشارةٌ لصفحاته وحدها).
      notifyUser(Number(s.userId), "greeting");
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
      res.json({ ...c, weatherFx: await loadWeatherFxEnabled() });
    } catch (e) { console.error("[greeting]", e); res.status(500).json({ error: "تعذّر التحميل" }); }
  });

  app.put("/api/admin/greeting", isAuthenticated, async (req: any, res) => {
    const s = adminOnly(req, res);
    if (!s) return;
    const phrases = parseGreetings(req.body?.phrases);
    if (typeof phrases === "string") return res.status(400).json({ error: phrases });
    try {
      const before = await loadGreetingConfig();
      //  العباراتُ وحدها — وسطرُ المالك في الصفّ كما هو (`mergeGreetingConfig`).
      const after = await mergeGreetingConfig({ phrases, updatedAt: new Date().toISOString(), updatedByName: s.displayName ?? null });
      await audit(req, s, "update", { phrases: before.phrases }, { phrases });
      //  `weatherFx` في كلّ جوابٍ للبطاقة (مراجعةُ Codex) — وإلّا قرأت الواجهةُ غيابَه «مفعّلاً» فأظهرت المفتاحَ معكوساً.
      res.json({ ...after, weatherFx: await loadWeatherFxEnabled() });
    } catch (e) { console.error("[greeting]", e); res.status(500).json({ error: "تعذّر الحفظ" }); }
  });

  //  **سطرُ المالك** (§4.gw): يظهر للجميع تحت إنجاز الأمس، والفارغُ يمحوه. والعباراتُ في الصفّ كما هي.
  app.put("/api/admin/greeting/note", isAuthenticated, async (req: any, res) => {
    const s = adminOnly(req, res);
    if (!s) return;
    const parsed = parseGreetingNote(req.body?.note);
    if (typeof parsed === "string") return res.status(400).json({ error: parsed });
    try {
      const before = await loadGreetingConfig();
      const after = await mergeGreetingConfig({ note: parsed.note });
      if ((before.note ?? null) !== (after.note ?? null)) await audit(req, s, "update", { note: before.note ?? null }, { note: after.note ?? null });
      res.json({ ...after, weatherFx: await loadWeatherFxEnabled() });
    } catch (e) { console.error("[greeting]", e); res.status(500).json({ error: "تعذّر الحفظ" }); }
  });

  //  **مفتاحُ مؤثّر الطقس** (§4.fw): يطفئه المسؤولُ للجميع أو يعيده — والتحيّةُ نفسُها لا تتغيّر.
  app.put("/api/admin/greeting/weather-fx", isAuthenticated, async (req: any, res) => {
    const s = adminOnly(req, res);
    if (!s) return;
    if (typeof req.body?.enabled !== "boolean") return res.status(400).json({ error: "القيمة يجب أن تكون نعم أو لا" });
    try {
      const before = await loadWeatherFxEnabled();
      const enabled: boolean = req.body.enabled;
      await storage.setSystemSetting(WEATHER_FX_SETTING_KEY, enabled ? "true" : "false");
      if (before !== enabled) await audit(req, s, "update", { weatherFx: before }, { weatherFx: enabled });
      res.json({ weatherFx: enabled });
    } catch (e) { console.error("[greeting]", e); res.status(500).json({ error: "تعذّر الحفظ" }); }
  });
}
