// **ترتيبُ الشريط الجانبيّ لكلّ حساب** (ترحيل ١٤٦، §4.ed). القاعدةُ في `shared/sidebar_order.ts`.
//
//   GET /api/sidebar-order — ترتيبُ صاحب الجلسة (`null` = الأصليّ)
//   PUT /api/sidebar-order — يحفظه (`{ order: [...] }`)، أو يعيده إلى الأصليّ (`{ order: null }`)
//
// **لصاحب الحساب وحده**: الخادمُ يكتب صفَّ `userId` الجلسة ولا يقبل غيرَه — لا أحدَ يرتّب قائمةَ أحد، ولا المسؤول.
// ودخولُ الطوارئ القديم بلا حساب (أُغلق — §4.bk) يرى الأصليّ ولا يحفظ.
// **وبلا سطر تدقيق**: عرضٌ شخصيّ لا يمسّ بياناً ولا صلاحية — كيومِ «حسناً» على التحيّة (§4.dp).
// **ولا إشارةَ للجميع** (`BROADCAST_EXEMPT`): يخصّ صاحبَه، فتصل أجهزتَه الأخرى وحدها (`notifyUser`) فيتبدّل شريطُها في الحال.
import type { Express } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { systemUsers } from "@shared/schema";
import { getSession } from "../sessions_module/permissions";
import { notifyUser } from "../live/updates";
import { normalizeSidebarOrder, readSidebarOrder } from "@shared/sidebar_order";

export const SIDEBAR_ORDER_EVENT = "sidebar-order";

export function registerSidebarOrderRoutes(app: Express, isAuthenticated: any) {
  app.get("/api/sidebar-order", isAuthenticated, async (req: any, res) => {
    try {
      const s = getSession(req);
      if (!s?.userId) return res.json({ order: null });
      const [u] = await db.select({ order: systemUsers.sidebarOrder }).from(systemUsers).where(eq(systemUsers.id, Number(s.userId)));
      res.json({ order: readSidebarOrder(u?.order ?? null) });
    } catch (e) {
      console.error("[sidebar-order]", e);
      res.status(500).json({ error: "تعذّر تحميل ترتيب القائمة" });
    }
  });

  app.put("/api/sidebar-order", isAuthenticated, async (req: any, res) => {
    try {
      const s = getSession(req);
      if (!s?.userId) return res.status(400).json({ error: "ترتيبُ القائمة يُحفظ على حسابٍ — ادخل بحسابك" });
      const order = normalizeSidebarOrder(req.body?.order);
      if (order === undefined) return res.status(400).json({ error: "ترتيبٌ غيرُ صالح" });
      const done = await db.update(systemUsers).set({ sidebarOrder: order }).where(eq(systemUsers.id, Number(s.userId)))
        .returning({ id: systemUsers.id });
      if (!done.length) return res.status(404).json({ error: "الحساب غير موجود" });
      notifyUser(Number(s.userId), SIDEBAR_ORDER_EVENT);
      res.json({ order });
    } catch (e) {
      console.error("[sidebar-order]", e);
      res.status(500).json({ error: "تعذّر حفظ ترتيب القائمة" });
    }
  });
}
