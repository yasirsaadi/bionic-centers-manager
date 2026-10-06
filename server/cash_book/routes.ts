// **دفترُ القاصة اليوميّ** (ترحيل ٠٩٨، §4.ca) — النقاط. الحارسُ الأخير لقرارات المالك:
//  • المحاسبُ ومديرُ الفرع والمسؤولُ وحدهم يقرؤون ويكتبون — ولا غيرُهم.
//  • الموظّفُ في فرعه النشط وحده (§4.ay)، والمسؤولُ في أيّ فرعٍ يختاره.
//  • الكتابةُ في اليوم نفسِه وحدَه، والأيامُ الماضيةُ للمسؤول — ولا يومَ قبل الرصيد الافتتاحيّ.
//  • ونسبتا الدكتور والمستشفى تُحسبان ولا تُكتبان بيد، و«استلام النسبة» للمسؤول وحده.
//  • وكلُّ كتابةٍ تكتب سطرَ تدقيق.
import type { Express } from "express";
import { logAudit } from "../accounting/ledger";
import { storage } from "../storage";
import { getSession, type BranchSession } from "../sessions_module/permissions";
import { baghdadTodayYmd } from "@shared/visit_date";
import {
  type CashBook, ATABAH_RATIO_CATEGORY, HOSPITAL_RATIO_CATEGORY, canWriteCashBook, canWriteDay, isCashBook, isYmd, parseAmount,
} from "@shared/cash_book";
import * as store from "./store";
import { drBoxLinesForDay } from "./dr_box";
import { sheetFingerprint, lastPrint, recordPrint } from "./prints";
import { registerDrBoxRoutes } from "./dr_box_routes";

type Req = any;

function sessionOf(req: Req): BranchSession {
  return getSession(req) ?? {};
}

/** الفرعُ المطلوب — المسؤولُ يختار، والموظّفُ في فرعه النشط وحده. */
function resolveBranch(s: BranchSession, raw: unknown): number | null {
  const requested = Number(raw);
  if (s.isAdmin) return Number.isInteger(requested) && requested > 0 ? requested : null;
  const active = Number(s.branchId);
  if (!Number.isInteger(active) || active <= 0) return null;
  if (raw !== undefined && raw !== null && raw !== "" && requested !== active) return -1;
  return active;
}

function audit(req: Req, s: BranchSession, p: { entityType: string; entityId: number; action: string; branchId: number; oldValues?: any; newValues?: any; notes?: string }) {
  return logAudit({
    ...p, userId: s.userId ?? null, userName: s.displayName ?? null,
    ipAddress: req.ip ?? null, userAgent: req.get?.("user-agent") ?? null,
  }).catch((e) => console.error("[cash-book] audit failed:", e));
}

function fail(res: any, e: unknown) {
  if (e instanceof store.CashBookError) return res.status(e.status).json({ error: e.message });
  console.error("[cash-book] failed:", e);
  return res.status(500).json({ error: "تعذّر الحفظ — لم يتغيّر شيء. أعد المحاولة." });
}

export function registerCashBookRoutes(app: Express, isAuthenticated: any) {
  /** الحارسُ المشترك: الدور، والفرع، والدفتر. */
  async function gate(req: Req, res: any, branchRaw: unknown, bookRaw: unknown) {
    const s = sessionOf(req);
    if (!canWriteCashBook(s)) { res.status(403).json({ error: "دفتر القاصة للمحاسب ومدير الفرع والمسؤول" }); return null; }
    const branchId = resolveBranch(s, branchRaw);
    if (branchId === -1) { res.status(403).json({ error: "دفتر القاصة لفرعك النشط وحده" }); return null; }
    if (!branchId) { res.status(400).json({ error: "اختر الفرع" }); return null; }
    if (!isCashBook(bookRaw)) { res.status(400).json({ error: "اختر الدفتر" }); return null; }
    const b = await store.branchConfigOf(branchId);
    if (!b) { res.status(404).json({ error: "الفرع غير موجود" }); return null; }
    if (!b.config.books.includes(bookRaw)) { res.status(400).json({ error: "هذا الفرع بلا دفتر علاج طبيعي" }); return null; }
    return { s, branchId, book: bookRaw as CashBook, config: b.config };
  }

  /** اليومُ مفتوحٌ للكتابة؟ — والسببُ بالعربية إن لم يكن. */
  async function dayOpen(res: any, s: BranchSession, branchId: number, book: CashBook, day: string) {
    const opening = await store.getOpening(branchId, book);
    const today = baghdadTodayYmd();
    if (!opening) { res.status(409).json({ error: "سجّل الرصيد الافتتاحيّ للدفتر أوّلاً" }); return false; }
    if (!canWriteDay(s, day, today, opening.openingDate)) {
      res.status(403).json({
        error: day > today ? "لا كتابة في يومٍ لم يأتِ" : day < opening.openingDate ? "هذا اليوم قبل بداية الدفتر" : "الأيام الماضية مقفلة — تعديلها للمسؤول وحده",
      });
      return false;
    }
    return true;
  }

  // ---- صفحةُ اليوم -----------------------------------------------------------------
  app.get("/api/cash-book", isAuthenticated, async (req: Req, res) => {
    const g = await gate(req, res, req.query.branchId, req.query.book);
    if (!g) return;
    const day = isYmd(req.query.date) ? String(req.query.date) : baghdadTodayYmd();
    try {
      const sheet = await store.getSheet(g.branchId, g.book, day);
      const today = baghdadTodayYmd();
      //  ما صُرف من قاصة الدكتور لهذا الفرع في هذا اليوم: البابُ وحده، بلا مبلغٍ ولا ملاحظة (§4.cb).
      const drBoxLines = await drBoxLinesForDay(g.branchId, day);
      //  آخرُ طباعةٍ لهذه الورقة، وهل تغيّر ما تطبعه بعدها (بصمةُ ما طُبع ≠ بصمةُ الآن).
      const printed = await lastPrint(g.branchId, g.book, day);
      res.json({
        ...sheet, today,
        canWrite: canWriteDay(g.s, day, today, sheet.opening?.date ?? null),
        isAdmin: Boolean(g.s.isAdmin), userId: g.s.userId ?? null,
        canManageExpenses: Boolean(g.s.isAdmin || g.s.permissions?.canManageAccounting),
        drBoxLines,
        lastPrint: printed ? { at: printed.printedAt.toISOString(), by: printed.printedByName ?? null } : null,
        changedAfterPrint: printed ? printed.fingerprint !== sheetFingerprint(sheet, drBoxLines) : false,
      });
    } catch (e) { fail(res, e); }
  });

  // ---- طباعةُ ورقة اليوم: تُسجَّل مع بصمة ما طُبع (§4.ca تكملة) -------------------------------------
  app.post("/api/cash-book/printed", isAuthenticated, async (req: Req, res) => {
    const g = await gate(req, res, req.body?.branchId, req.body?.book);
    if (!g) return;
    const day = req.body?.date;
    if (!isYmd(day) || day > baghdadTodayYmd()) return res.status(400).json({ error: "التاريخ غير صالح" });
    try {
      const sheet = await store.getSheet(g.branchId, g.book, day);
      if (!sheet.opening || day < sheet.opening.date) return res.status(409).json({ error: "هذا اليوم قبل بداية الدفتر" });
      const row = await recordPrint({
        branchId: g.branchId, book: g.book, day,
        fingerprint: sheetFingerprint(sheet, await drBoxLinesForDay(g.branchId, day)),
        userId: g.s.userId ?? null, userName: g.s.displayName ?? null,
      });
      res.json({ at: row.printedAt.toISOString(), by: row.printedByName });
    } catch (e) { fail(res, e); }
  });

  // ---- الرصيدُ الافتتاحيّ ----------------------------------------------------------------
  app.post("/api/cash-book/opening", isAuthenticated, async (req: Req, res) => {
    const g = await gate(req, res, req.body?.branchId, req.body?.book);
    if (!g) return;
    //  قرارُ المالك (٢٠٢٦-١٠-٠٦): بدايةُ الدفتر يسجّلها المسؤولُ وحده، ويعدّلها متى شاء — والحسابُ يبدأ منها.
    if (!g.s.isAdmin) return res.status(403).json({ error: "بداية الدفتر يسجّلها المسؤول وحده" });
    const today = baghdadTodayYmd();
    const openingDate = req.body?.openingDate;
    if (!isYmd(openingDate) || openingDate > today) return res.status(400).json({ error: "تاريخ البداية غير صالح" });
    const cash = Number(req.body?.cash);
    const ratio = req.body?.ratio === undefined || req.body?.ratio === "" ? 0 : Number(req.body?.ratio);
    if (!Number.isInteger(cash) || !Number.isInteger(ratio) || ratio < 0) {
      return res.status(400).json({ error: "اكتب النقد الموجود في القاصة والمتبقي في النسبة أرقاماً صحيحة" });
    }
    try {
      const r = await store.setOpening({
        branchId: g.branchId, book: g.book, openingDate, cash, ratio, userId: g.s.userId ?? null, isAdmin: Boolean(g.s.isAdmin),
      });
      await audit(req, g.s, { entityType: "cash_book_opening", entityId: r.after.id, action: r.before ? "update" : "create",
        branchId: g.branchId, oldValues: r.before, newValues: r.after });
      res.json(r.after);
    } catch (e) { fail(res, e); }
  });

  // ---- سطرٌ جديد: وارد آخر · مصروف · تحويل · نسبة العتبة · استلام النسبة -----------------------------
  app.post("/api/cash-book/rows", isAuthenticated, async (req: Req, res) => {
    const g = await gate(req, res, req.body?.branchId, req.body?.book);
    if (!g) return;
    const day = req.body?.date;
    if (!isYmd(day)) return res.status(400).json({ error: "التاريخ غير صالح" });
    const kind = String(req.body?.kind ?? "");
    const amount = parseAmount(req.body?.amount);
    if (amount === null) return res.status(400).json({ error: "اكتب المبلغ رقماً صحيحاً أكبر من صفر" });
    const note = typeof req.body?.note === "string" && req.body.note.trim() ? req.body.note.trim().slice(0, 500) : null;
    if (!(await dayOpen(res, g.s, g.branchId, g.book, day))) return;
    const userId = g.s.userId ?? null;
    try {
      if (kind === "income_other" || kind === "dr_transfer" || kind === "ratio_received") {
        if (kind === "ratio_received" && !g.s.isAdmin) return res.status(403).json({ error: "استلام النسبة للمسؤول وحده" });
        if (kind === "income_other" && !note) return res.status(400).json({ error: "اكتب مصدر الوارد في الملاحظات" });
        const row = await store.addEntry({ branchId: g.branchId, book: g.book, day, kind, amount, note, userId });
        await audit(req, g.s, { entityType: "cash_book_entry", entityId: row.id, action: "create", branchId: g.branchId, newValues: row });
        return res.json(row);
      }
      if (kind === "expense" || kind === "atabah_ratio") {
        let category: string;
        if (kind === "atabah_ratio") {
          if (!g.config.hasAtabahRatio) return res.status(400).json({ error: "نسبة العتبة لفرع كربلاء وحده" });
          category = ATABAH_RATIO_CATEGORY;
        } else {
          category = typeof req.body?.category === "string" ? req.body.category.trim() : "";
          if (!category) return res.status(400).json({ error: "اختر باب الصرف" });
          if (category === HOSPITAL_RATIO_CATEGORY || category === ATABAH_RATIO_CATEGORY) {
            return res.status(400).json({ error: "النسب لها خياراتها في الصادر" });
          }
          if (category === "other" && !note) return res.status(400).json({ error: "عند اختيار «أخرى» اكتب ما هو المصروف في الملاحظات" });
        }
        const row = await store.addExpense({ branchId: g.branchId, book: g.book, day, category, amount, note, userId });
        await audit(req, g.s, { entityType: "expense", entityId: row.id, action: "create", branchId: g.branchId, newValues: row,
          notes: "من دفتر القاصة" });
        return res.json(row);
      }
      return res.status(400).json({ error: "نوع السطر غير صالح" });
    } catch (e) { fail(res, e); }
  });

  // ---- نسبةُ الدكتور / نسبةُ المستشفى: تُحسب من وارد اليوم ------------------------------------
  app.post("/api/cash-book/ratio", isAuthenticated, async (req: Req, res) => {
    const g = await gate(req, res, req.body?.branchId, req.body?.book);
    if (!g) return;
    const day = req.body?.date;
    const kind = req.body?.kind;
    if (!isYmd(day)) return res.status(400).json({ error: "التاريخ غير صالح" });
    if (kind !== "dr_ratio" && kind !== "hospital_ratio") return res.status(400).json({ error: "نوع النسبة غير صالح" });
    if (!(await dayOpen(res, g.s, g.branchId, g.book, day))) return;
    try {
      const r = await store.syncRatio({ branchId: g.branchId, book: g.book, day, kind, userId: g.s.userId ?? null });
      await audit(req, g.s, {
        entityType: r.source === "expense" ? "expense" : "cash_book_entry", entityId: r.id, action: r.before === null ? "create" : "update",
        branchId: g.branchId, oldValues: r.before === null ? undefined : { amount: r.before }, newValues: { kind, amount: r.amount },
        notes: "نسبة محسوبة من وارد اليوم — دفتر القاصة",
      });
      res.json(r);
    } catch (e) { fail(res, e); }
  });

  /** سطرٌ قائم — فرعُه ودفترُه ويومُه منه هو، لا من الطلب. */
  async function loadRow(req: Req, res: any) {
    const source = req.params.source;
    const id = parseInt(req.params.id);
    if (Number.isNaN(id) || (source !== "entry" && source !== "expense")) { res.status(400).json({ error: "سطر غير صالح" }); return null; }
    if (source === "entry") {
      const e = await store.getEntry(id);
      if (!e) { res.status(404).json({ error: "السطر غير موجود" }); return null; }
      const g = await gate(req, res, e.branchId, e.book);
      if (!g) return null;
      if (!(await dayOpen(res, g.s, g.branchId, g.book, e.entryDate))) return null;
      if (e.kind === "ratio_received" && !g.s.isAdmin) { res.status(403).json({ error: "استلام النسبة للمسؤول وحده" }); return null; }
      return { g, source, entry: e, expense: null as any };
    }
    const x = await storage.getExpense(id);
    if (!x) { res.status(404).json({ error: "السطر غير موجود" }); return null; }
    const book: CashBook = x.section === "physio" ? "physio" : "devices";
    const g = await gate(req, res, x.branchId, book);
    if (!g) return null;
    if (!(await dayOpen(res, g.s, g.branchId, g.book, x.expenseDate))) return null;
    //  المصروفُ يعدّله مَن كتبه، أو صاحبُ «إدارة المحاسبة»، أو المسؤول — كصفحة المحاسبة.
    const mine = g.s.userId != null && x.createdBy === String(g.s.userId);
    if (!(g.s.isAdmin || g.s.permissions?.canManageAccounting || mine)) {
      res.status(403).json({ error: "هذا المصروف كتبه غيرك — تعديله لصاحب «إدارة المحاسبة»" });
      return null;
    }
    return { g, source, entry: null as any, expense: x };
  }

  app.patch("/api/cash-book/rows/:source/:id", isAuthenticated, async (req: Req, res) => {
    const l = await loadRow(req, res);
    if (!l) return;
    const amount = req.body?.amount === undefined ? undefined : parseAmount(req.body.amount);
    if (amount === null) return res.status(400).json({ error: "اكتب المبلغ رقماً صحيحاً أكبر من صفر" });
    const note = typeof req.body?.note === "string" ? (req.body.note.trim().slice(0, 500) || null) : undefined;
    try {
      if (l.source === "entry") {
        if (l.entry.kind === "dr_ratio" && amount !== undefined) {
          return res.status(400).json({ error: "نسبة الدكتور تُحسب من وارد اليوم — استعمل «تحديث النسبة»" });
        }
        if (l.entry.kind === "income_other" && note === null) return res.status(400).json({ error: "اكتب مصدر الوارد في الملاحظات" });
        const row = await store.updateEntry(l.entry.id, { ...(amount !== undefined ? { amount } : {}), ...(note !== undefined ? { note } : {}) });
        await audit(req, l.g.s, { entityType: "cash_book_entry", entityId: l.entry.id, action: "update", branchId: l.g.branchId,
          oldValues: l.entry, newValues: row });
        return res.json(row);
      }
      const x = l.expense;
      if (x.category === HOSPITAL_RATIO_CATEGORY && amount !== undefined) {
        return res.status(400).json({ error: "نسبة المستشفى تُحسب من وارد اليوم — استعمل «تحديث النسبة»" });
      }
      const category = typeof req.body?.category === "string" && req.body.category.trim() ? req.body.category.trim() : undefined;
      if (category && (x.category === HOSPITAL_RATIO_CATEGORY || x.category === ATABAH_RATIO_CATEGORY
        || category === HOSPITAL_RATIO_CATEGORY || category === ATABAH_RATIO_CATEGORY)) {
        return res.status(400).json({ error: "لا يُغيَّر باب النسب" });
      }
      const nextCategory = category ?? x.category;
      const nextNote = note !== undefined ? note : x.description;
      if (nextCategory === "other" && !nextNote) return res.status(400).json({ error: "عند اختيار «أخرى» اكتب ما هو المصروف في الملاحظات" });
      const row = await store.updateExpenseRow(x.id, {
        ...(amount !== undefined ? { amount } : {}),
        ...(note !== undefined ? { description: note, ...(nextCategory === "other" ? { subcategory: note } : {}) } : {}),
        ...(category ? { category } : {}),
      }, l.g.s.userId ?? null);
      await audit(req, l.g.s, { entityType: "expense", entityId: x.id, action: "update", branchId: l.g.branchId,
        oldValues: x, newValues: row, notes: "من دفتر القاصة" });
      res.json(row);
    } catch (e) { fail(res, e); }
  });

  app.delete("/api/cash-book/rows/:source/:id", isAuthenticated, async (req: Req, res) => {
    const l = await loadRow(req, res);
    if (!l) return;
    try {
      if (l.source === "entry") {
        const row = await store.deleteEntry(l.entry.id, l.g.s.userId ?? null);
        await audit(req, l.g.s, { entityType: "cash_book_entry", entityId: l.entry.id, action: "delete", branchId: l.g.branchId,
          oldValues: l.entry, newValues: row });
        return res.json({ success: true });
      }
      await audit(req, l.g.s, { entityType: "expense", entityId: l.expense.id, action: "delete", branchId: l.g.branchId,
        oldValues: l.expense, notes: "من دفتر القاصة" });
      await store.deleteExpenseRow(l.expense.id, l.g.s.userId ?? null);
      res.json({ success: true });
    } catch (e) { fail(res, e); }
  });

  //  قاصةُ الدكتور (§4.cb) — نقاطُها للمسؤول وحده.
  registerDrBoxRoutes(app, isAuthenticated);
}
