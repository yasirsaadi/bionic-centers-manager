// **قاصةُ الدكتور** (ترحيل ٠٩٩، §4.cb) — النقاط. **كلُّها للمسؤول وحده** (قرارُ المالك: «المصاريف التي تدفع من قاصتي حصريا انا،
// تقرير قاصتي ورصيدها حصريا وفقط انا»). وما يراه الفرعُ — اليومُ والباب بلا مبلغ — يصله في صفحة دفتر القاصة لا هنا.
import type { Express } from "express";
import { logAudit } from "../accounting/ledger";
import { getSession } from "../sessions_module/permissions";
import { baghdadTodayYmd } from "@shared/visit_date";
import { drBoxAccountLabel, isYmd, parseAmount } from "@shared/cash_book";
import { CashBookError, branchConfigOf } from "./store";
import * as box from "./dr_box";

type Req = any;
const ADMIN_ONLY = "قاصة الدكتور للمسؤول وحده";

function fail(res: any, e: unknown) {
  if (e instanceof CashBookError) return res.status(e.status).json({ error: e.message });
  console.error("[dr-box] failed:", e);
  return res.status(500).json({ error: "تعذّر الحفظ — لم يتغيّر شيء. أعد المحاولة." });
}

function cleanCategory(v: unknown): string | null {
  return typeof v === "string" && v.trim() && v.trim().length <= 80 ? v.trim() : null;
}
function cleanNote(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, 500) : null;
}

export function registerDrBoxRoutes(app: Express, isAuthenticated: any) {
  function admin(req: Req, res: any) {
    const s = getSession(req) ?? {};
    if (!s.isAdmin) { res.status(403).json({ error: ADMIN_ONLY }); return null; }
    return s;
  }
  function audit(req: Req, s: any, p: { entityType?: string; entityId: number; action: string; branchId: number; oldValues?: any; newValues?: any }) {
    return logAudit({
      entityType: "dr_box_expense", ...p, userId: s.userId ?? null, userName: s.displayName ?? null,
      ipAddress: req.ip ?? null, userAgent: req.get?.("user-agent") ?? null,
    }).catch((e) => console.error("[dr-box] audit failed:", e));
  }

  // ---- التقرير: الرصيدُ كلُّه، وحركةُ الفترة ----------------------------------------------
  app.get("/api/dr-box", isAuthenticated, async (req: Req, res) => {
    if (!admin(req, res)) return;
    const branchId = Number(req.query.branchId);
    if (!Number.isInteger(branchId) || branchId <= 0) return res.status(400).json({ error: "اختر الفرع" });
    const today = baghdadTodayYmd();
    const from = isYmd(req.query.from) ? String(req.query.from) : `${today.slice(0, 7)}-01`;
    const to = isYmd(req.query.to) ? String(req.query.to) : today;
    if (from > to) return res.status(400).json({ error: "بداية الفترة بعد نهايتها" });
    try {
      const b = await branchConfigOf(branchId);
      if (!b) return res.status(404).json({ error: "الفرع غير موجود" });
      res.json({ branch: { id: branchId, name: b.name, account: drBoxAccountLabel(b.name) }, today, ...(await box.drBoxReport(branchId, from, to)) });
    } catch (e) { fail(res, e); }
  });

  // ---- الرصيدُ الافتتاحيّ: يضعه المسؤولُ ويعدّله، ومنه يبدأ الحساب ---------------------------------
  app.post("/api/dr-box/opening", isAuthenticated, async (req: Req, res) => {
    const s = admin(req, res);
    if (!s) return;
    const branchId = Number(req.body?.branchId);
    if (!Number.isInteger(branchId) || branchId <= 0) return res.status(400).json({ error: "اختر الفرع" });
    const openingDate = req.body?.openingDate;
    if (!isYmd(openingDate) || openingDate > baghdadTodayYmd()) return res.status(400).json({ error: "تاريخ البداية غير صالح" });
    const amount = req.body?.amount === undefined || req.body?.amount === "" ? 0 : Number(req.body.amount);
    if (!Number.isInteger(amount) || amount < 0) return res.status(400).json({ error: "اكتب الرصيد رقماً صحيحاً" });
    try {
      if (!(await branchConfigOf(branchId))) return res.status(404).json({ error: "الفرع غير موجود" });
      const r = await box.setDrBoxOpening({ branchId, openingDate, amount, userId: s.userId ?? null });
      await audit(req, s, { entityType: "dr_box_opening", entityId: r.after.id, action: r.before ? "update" : "create", branchId,
        oldValues: r.before, newValues: r.after });
      res.json(r.after);
    } catch (e) { fail(res, e); }
  });

  // ---- مصروفٌ من قاصة الدكتور ---------------------------------------------------------------
  app.post("/api/dr-box/expenses", isAuthenticated, async (req: Req, res) => {
    const s = admin(req, res);
    if (!s) return;
    const branchId = Number(req.body?.branchId);
    if (!Number.isInteger(branchId) || branchId <= 0) return res.status(400).json({ error: "اختر الفرع" });
    const day = req.body?.date;
    if (!isYmd(day) || day > baghdadTodayYmd()) return res.status(400).json({ error: "التاريخ غير صالح" });
    const category = cleanCategory(req.body?.category);
    if (!category) return res.status(400).json({ error: "اختر باب الصرف" });
    const amount = parseAmount(req.body?.amount);
    if (amount === null) return res.status(400).json({ error: "اكتب المبلغ رقماً صحيحاً أكبر من صفر" });
    try {
      if (!(await branchConfigOf(branchId))) return res.status(404).json({ error: "الفرع غير موجود" });
      const row = await box.addDrBoxExpense({ branchId, day, category, amount, note: cleanNote(req.body?.note), userId: s.userId ?? null });
      await audit(req, s, { entityId: row.id, action: "create", branchId, newValues: row });
      res.json(row);
    } catch (e) { fail(res, e); }
  });

  app.patch("/api/dr-box/expenses/:id", isAuthenticated, async (req: Req, res) => {
    const s = admin(req, res);
    if (!s) return;
    const id = Number(req.params.id);
    const patch: { day?: string; category?: string; amount?: number; note?: string | null } = {};
    if (req.body?.date !== undefined) {
      if (!isYmd(req.body.date) || req.body.date > baghdadTodayYmd()) return res.status(400).json({ error: "التاريخ غير صالح" });
      patch.day = req.body.date;
    }
    if (req.body?.category !== undefined) {
      const c = cleanCategory(req.body.category);
      if (!c) return res.status(400).json({ error: "اختر باب الصرف" });
      patch.category = c;
    }
    if (req.body?.amount !== undefined) {
      const a = parseAmount(req.body.amount);
      if (a === null) return res.status(400).json({ error: "اكتب المبلغ رقماً صحيحاً أكبر من صفر" });
      patch.amount = a;
    }
    if (req.body?.note !== undefined) patch.note = cleanNote(req.body.note);
    try {
      const r = await box.updateDrBoxExpense(id, patch);
      await audit(req, s, { entityId: id, action: "update", branchId: r.after.branchId, oldValues: r.before, newValues: r.after });
      res.json(r.after);
    } catch (e) { fail(res, e); }
  });

  app.delete("/api/dr-box/expenses/:id", isAuthenticated, async (req: Req, res) => {
    const s = admin(req, res);
    if (!s) return;
    try {
      const row = await box.deleteDrBoxExpense(Number(req.params.id), s.userId ?? null);
      await audit(req, s, { entityId: row.id, action: "delete", branchId: row.branchId, oldValues: row });
      res.json({ ok: true });
    } catch (e) { fail(res, e); }
  });
}
