// **بوتُ الموظّفين: الربطُ ولوحةُ المسؤول** (§4.by).
//
// الـwebhook نسخةُ بوت المرضى في حراسته: سرٌّ في الترويسة وحدها، بمقارنةٍ ثابتة الزمن، وما لا نفهمه يُتجاهَل بـ٢٠٠.
// والربطُ بتذكرةٍ يصدرها **المسؤولُ وحده** لموظّفٍ بعينه: لمرّةٍ واحدة، صالحةٌ ٢٤ ساعة، وبصمتُها وحدها تُحفَظ.
// ولوحةُ المسؤول (`/api/admin/staff-notifications/*`) **له وحده** — مَن يستلم وعن ماذا (قرارُ المالك).
import type { Express, RequestHandler } from "express";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { logAudit } from "../accounting/ledger";
import { accessibleBranchesOf } from "../auth/session_refresh";
import { STAFF_EVENTS, isStaffEventKey, eligibleStaffEvents, staffRoleRank } from "@shared/staff_notifications";
import { staffBotConfig, staffBotStatusLine, staffBotDeepLink, STAFF_WEBHOOK_PATH, publicBaseUrl } from "./config";
import { sendStaffMessage } from "./client";
import { startStaffDispatcher } from "./dispatcher";
import { initStaffDigests } from "./digests";
import { rolesOf } from "@shared/user_roles";

const SECRET_HEADER = "x-telegram-bot-api-secret-token";
const LINK_TTL_MS = 24 * 60 * 60 * 1000;

export const STAFF_BOT_MESSAGES = {
  linked: (name: string) => `تم ربط حسابك يا ${name} بتنبيهات مراكز د. ياسر الساعدي. ستصلك هنا التنبيهات التي يحدّدها لك المسؤول.`,
  invalid: "رابط الربط غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً من المسؤول.",
  noPayload: "هذا البوت لتنبيهات موظّفي المراكز. للربط افتح الرابط الذي يعطيك إيّاه المسؤول.",
  test: "رسالة تجريبية — التنبيهات تصلك على هذا الحساب.",
} as const;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function secretMatches(provided: unknown, expected: string): boolean {
  if (typeof provided !== "string" || provided.length === 0) return false;
  const a = createHash("sha256").update(provided, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export function parseStaffStartPayload(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const m = text.trim().match(/^\/start(?:@[A-Za-z0-9_]+)?(?:\s+(\S+))?$/);
  if (!m) return null;
  return m[1] ?? "";
}

/** يستهلك التذكرة ويربط — ذرّيّاً. يُرجع اسمَ الموظّف أو `null` لتذكرةٍ غير صالحة. */
export async function redeemStaffLinkToken(raw: string, chatId: string): Promise<string | null> {
  return await db.transaction(async (tx) => {
    const r = await tx.execute(sql`
      UPDATE staff_link_tokens SET used_at = NOW()
       WHERE token_hash = ${hashToken(raw)} AND used_at IS NULL AND expires_at > NOW()
       RETURNING user_id`);
    const userId = Number((r.rows[0] as any)?.user_id ?? 0);
    if (!userId) return null;
    const u = await tx.execute(sql`SELECT display_name FROM system_users WHERE id = ${userId} AND COALESCE(is_active, true)`);
    if (!u.rows.length) return null;
    //  حسابُ تلغرام واحدٌ لموظّفٍ واحد: ربطُه بحسابٍ آخر يفكّ القديم.
    await tx.execute(sql`DELETE FROM staff_telegram_links WHERE chat_id = ${chatId} AND user_id <> ${userId}`);
    await tx.execute(sql`
      INSERT INTO staff_telegram_links (user_id, chat_id) VALUES (${userId}, ${chatId})
      ON CONFLICT (user_id) DO UPDATE SET chat_id = EXCLUDED.chat_id, linked_at = NOW()`);
    return String((u.rows[0] as any).display_name ?? "");
  });
}

export async function ensureStaffWebhook(): Promise<"set" | "skipped" | "failed"> {
  const config = staffBotConfig();
  const base = publicBaseUrl();
  if (!config || !base) return "skipped";
  try {
    const res = await fetch(`https://api.telegram.org/bot${config.token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: `${base}${STAFF_WEBHOOK_PATH}`, secret_token: config.webhookSecret, allowed_updates: ["message"] }),
      signal: AbortSignal.timeout(10_000),
    });
    const out = (await res.json().catch(() => ({}))) as { ok?: boolean };
    if (out.ok) { console.log(`[staff-telegram] webhook set on ${base}${STAFF_WEBHOOK_PATH}`); return "set"; }
    console.error(`[staff-telegram] setWebhook failed with status ${res.status}`);
    return "failed";
  } catch (err) {
    console.error(`[staff-telegram] setWebhook error (${err instanceof Error ? err.name : "Unknown"})`);
    return "failed";
  }
}

function isAdmin(req: any): boolean {
  return Boolean(req.session?.branchSession?.isAdmin);
}

export function registerStaffTelegramRoutes(app: Express, isAuthenticated: RequestHandler) {
  console.log(staffBotStatusLine());
  void ensureStaffWebhook();
  startStaffDispatcher();
  initStaffDigests();

  // ══ الـwebhook — عامٌّ بلا جلسة، يحرسه السرّ ══════════════════════════════════════════════════
  app.post(STAFF_WEBHOOK_PATH, async (req: any, res) => {
    const config = staffBotConfig();
    if (!config) return res.status(503).json({ ok: false });
    if (!secretMatches(req.headers?.[SECRET_HEADER], config.webhookSecret)) return res.status(401).json({ ok: false });
    try {
      const msg = req.body?.message;
      if (!msg || typeof msg !== "object" || msg.chat?.type !== "private") return res.json({ ok: true });
      const fromId = msg.from?.id;
      if (typeof fromId !== "number" && typeof fromId !== "string") return res.json({ ok: true });
      const chatId = String(msg.chat?.id ?? fromId);
      const payload = parseStaffStartPayload(msg.text);
      if (payload === null) {
        await sendStaffMessage(chatId, STAFF_BOT_MESSAGES.noPayload);
        return res.json({ ok: true });
      }
      if (payload === "") {
        await sendStaffMessage(chatId, STAFF_BOT_MESSAGES.noPayload);
        return res.json({ ok: true });
      }
      const name = await redeemStaffLinkToken(payload, chatId);
      await sendStaffMessage(chatId, name !== null ? STAFF_BOT_MESSAGES.linked(name) : STAFF_BOT_MESSAGES.invalid);
      return res.json({ ok: true });
    } catch {
      console.error("[staff-telegram] webhook failed");
      return res.status(500).json({ ok: false });
    }
  });

  // ══ لوحةُ المسؤول ══════════════════════════════════════════════════════════════════════════════
  app.get("/api/admin/staff-notifications", isAuthenticated, async (req: any, res) => {
    if (!isAdmin(req)) return res.status(403).json({ message: "غير مصرح" });
    const users = await db.execute(sql`
      SELECT u.id, u.display_name, u.role, u.extra_roles, u.branch_id, u.branch_ids, u.can_write_medical_exam, u.can_work_as_expert,
             l.linked_at,
             COALESCE((SELECT array_agg(p.event_type ORDER BY p.event_type) FROM staff_notification_prefs p WHERE p.user_id = u.id), '{}') AS events
        FROM system_users u
        LEFT JOIN staff_telegram_links l ON l.user_id = u.id
       WHERE COALESCE(u.is_active, true) = true`);
    const branchRows = await db.execute(sql`SELECT id, name FROM branches`);
    const branchName = new Map((branchRows.rows as any[]).map((b) => [Number(b.id), String(b.name)]));
    //  **لكلّ موظّفٍ ما يخصّ دورَه وحده** (قرارُ المالك)، وفروعُه بأسمائها، والترتيبُ من الأهمّ: المسؤول ⟵ المدراء ⟵ الخبراء ⟵
    //  الأطبّاء ⟵ بقيّة الموظّفين، ثمّ بالاسم.
    const list = (users.rows as any[]).map((u) => {
      const who = { role: String(u.role), extraRoles: u.extra_roles, canWriteMedicalExam: u.can_write_medical_exam, canWorkAsExpert: u.can_work_as_expert };
      const branches = u.role === "admin" ? ["كل الفروع"]
        : accessibleBranchesOf({ branchId: u.branch_id, branchIds: u.branch_ids }).map((b) => branchName.get(b) ?? `#${b}`);
      return {
        id: Number(u.id), displayName: String(u.display_name ?? ""), role: u.role, roles: rolesOf({ role: u.role, extraRoles: u.extra_roles }), branches,
        rank: staffRoleRank(who), eligible: eligibleStaffEvents(who),
        linkedAt: u.linked_at ? new Date(u.linked_at).toISOString() : null,
        events: (u.events ?? []).map(String),
      };
    }).sort((a, b) => a.rank - b.rank || a.displayName.localeCompare(b.displayName, "ar"));
    res.json({ botReady: staffBotConfig() !== null, events: STAFF_EVENTS, users: list });
  });

  app.put("/api/admin/staff-notifications/:userId", isAuthenticated, async (req: any, res) => {
    if (!isAdmin(req)) return res.status(403).json({ message: "غير مصرح" });
    const userId = Number(req.params.userId);
    const events = Array.isArray(req.body?.events) ? req.body.events : null;
    if (!Number.isInteger(userId) || !events || !events.every(isStaffEventKey)) {
      return res.status(400).json({ message: "بيانات غير صالحة" });
    }
    const wanted = Array.from(new Set(events as string[])).sort();
    const before = await db.transaction(async (tx) => {
      const u = await tx.execute(sql`SELECT id, role, extra_roles, can_write_medical_exam, can_work_as_expert FROM system_users WHERE id = ${userId} FOR UPDATE`);
      if (!u.rows.length) return null;
      //  **وما لا يخصّ دورَه يُرفض** — لا يُحفَظ مربّعُ معاينةٍ لموظّفة استقبال.
      const row = u.rows[0] as any;
      const allowed = eligibleStaffEvents({ role: String(row.role), extraRoles: row.extra_roles, canWriteMedicalExam: row.can_write_medical_exam, canWorkAsExpert: row.can_work_as_expert });
      if (wanted.some((k) => !allowed.includes(k))) return "ineligible" as const;
      const old = await tx.execute(sql`SELECT event_type FROM staff_notification_prefs WHERE user_id = ${userId} ORDER BY event_type`);
      await tx.execute(sql`DELETE FROM staff_notification_prefs WHERE user_id = ${userId}`);
      for (const ev of wanted) {
        await tx.execute(sql`INSERT INTO staff_notification_prefs (user_id, event_type) VALUES (${userId}, ${ev})`);
      }
      return (old.rows as any[]).map((r) => String(r.event_type));
    });
    if (before === null) return res.status(404).json({ message: "المستخدم غير موجود" });
    if (before === "ineligible") return res.status(400).json({ message: "هذا التنبيه لا يخصّ دور هذا الموظّف" });
    const bs = req.session.branchSession;
    await logAudit({
      entityType: "staff_notification_prefs", entityId: userId, action: "update",
      userId: bs.userId, userName: bs.displayName ?? null, ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
      oldValues: { events: before }, newValues: { events: wanted }, notes: "تنبيهات الموظّف عبر تلغرام",
    });
    res.json({ ok: true, events: wanted });
  });

  app.post("/api/admin/staff-notifications/:userId/link", isAuthenticated, async (req: any, res) => {
    if (!isAdmin(req)) return res.status(403).json({ message: "غير مصرح" });
    if (!staffBotConfig()) return res.status(503).json({ message: "بوت الموظّفين غير مُعدّ بعد على الخادم" });
    const userId = Number(req.params.userId);
    const u = await db.execute(sql`SELECT id FROM system_users WHERE id = ${userId} AND COALESCE(is_active, true)`);
    if (!u.rows.length) return res.status(404).json({ message: "المستخدم غير موجود" });
    const raw = randomBytes(24).toString("base64url");
    await db.execute(sql`
      INSERT INTO staff_link_tokens (token_hash, user_id, created_by, expires_at)
      VALUES (${hashToken(raw)}, ${userId}, ${req.session.branchSession.userId ?? null}, ${new Date(Date.now() + LINK_TTL_MS)})`);
    res.json({ deepLink: staffBotDeepLink(raw), expiresInHours: 24 });
  });

  app.delete("/api/admin/staff-notifications/:userId/link", isAuthenticated, async (req: any, res) => {
    if (!isAdmin(req)) return res.status(403).json({ message: "غير مصرح" });
    const userId = Number(req.params.userId);
    await db.execute(sql`DELETE FROM staff_telegram_links WHERE user_id = ${userId}`);
    res.json({ ok: true });
  });

  app.post("/api/admin/staff-notifications/:userId/test", isAuthenticated, async (req: any, res) => {
    if (!isAdmin(req)) return res.status(403).json({ message: "غير مصرح" });
    const userId = Number(req.params.userId);
    const l = await db.execute(sql`SELECT chat_id FROM staff_telegram_links WHERE user_id = ${userId}`);
    if (!l.rows.length) return res.status(404).json({ message: "الموظّف لم يربط حسابه بعد" });
    const out = await sendStaffMessage(String((l.rows[0] as any).chat_id), STAFF_BOT_MESSAGES.test);
    if (!out.ok) return res.status(502).json({ message: "تعذّر الإرسال — قد يكون الموظّف حظر البوت" });
    res.json({ ok: true });
  });
}
