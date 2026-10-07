// **طلبُ تصحيح المال** (ترحيل ١٠٢، §4.ce) — النقاط.
//
//   POST /api/money-corrections               — الموظّفُ يطلب تعديلَ مصروفٍ أو سطرِ دفتر، أو حذفَه، بسبب.
//   GET  /api/money-corrections               — المسؤولُ: كلُّ الطلبات (أو المعلَّقة)؛ وغيرُه: طلباتُه هو.
//   POST /api/money-corrections/:id/approve   — المسؤولُ وحده: يُطبَّق.
//   POST /api/money-corrections/:id/reject    — المسؤولُ وحده.
import type { Express } from "express";
import { logAudit } from "../accounting/ledger";
import { getSession } from "../sessions_module/permissions";
import { canWriteCashBook, parseAmount, HOSPITAL_RATIO_CATEGORY, ATABAH_RATIO_CATEGORY } from "@shared/cash_book";
import * as store from "./store";

const RATIO_CATEGORIES = [HOSPITAL_RATIO_CATEGORY, ATABAH_RATIO_CATEGORY];

function fail(res: any, e: unknown) {
  if (e instanceof store.CorrectionError) return res.status(e.status).json({ error: e.message });
  console.error("[money-corrections]", e);
  res.status(500).json({ error: "تعذّر تنفيذ الطلب" });
}

export function registerMoneyCorrectionRoutes(app: Express, isAuthenticated: any) {
  app.post("/api/money-corrections", isAuthenticated, async (req: any, res) => {
    const s = getSession(req) ?? {};
    if (s.isAdmin) return res.status(400).json({ error: "المسؤولُ يعدّل مباشرةً — لا يحتاج طلباً" });
    const type = req.body?.targetType;
    const id = Number(req.body?.targetId);
    const action = req.body?.action;
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : "";
    if ((type !== "expense" && type !== "cash_book_entry") || !Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "سطر غير صالح" });
    if (action !== "update" && action !== "delete") return res.status(400).json({ error: "اختر: تعديل أو حذف" });
    if (reason.length < 3) return res.status(400).json({ error: "اكتب سبب التصحيح" });
    try {
      const target = await store.loadTarget(type, id);
      if (!target) return res.status(404).json({ error: "السطر غير موجود" });
      //  فرعُ الجلسة النشط وحده (§4.ay) — ومَن يكتب المصاريفَ أو الدفتر.
      if (!s.branchId || target.branchId !== s.branchId) return res.status(403).json({ error: "تصحيحُ سطور فرعك النشط وحده" });
      const canExpenses = Boolean(s.permissions?.canManageAccounting || s.permissions?.canAddExpenses) || canWriteCashBook(s);
      if (type === "expense" ? !canExpenses : !canWriteCashBook(s)) return res.status(403).json({ error: "لا صلاحيةَ لك على هذا السطر" });
      if (type === "cash_book_entry" && !["income_other", "dr_transfer"].includes(target.entry.kind)) {
        return res.status(403).json({ error: "هذا السطرُ للمسؤول وحده" });
      }
      if (type === "expense" && RATIO_CATEGORIES.includes(target.expense.category)) {
        return res.status(400).json({ error: "النسبُ تُحسب من وارد اليوم — لا طلبَ عليها" });
      }

      let patch: Record<string, unknown> | null = null;
      if (action === "update") {
        patch = {};
        if (req.body?.amount !== undefined && req.body.amount !== null && req.body.amount !== "") {
          const amount = parseAmount(req.body.amount);
          if (amount === null) return res.status(400).json({ error: "اكتب المبلغ رقماً صحيحاً أكبر من صفر" });
          if (amount !== target.snapshot.amount) patch.amount = amount;
        }
        if (typeof req.body?.note === "string") {
          const note = req.body.note.trim().slice(0, 500) || null;
          if (note !== target.snapshot.note) patch.note = note;
        }
        if (type === "expense" && typeof req.body?.category === "string" && req.body.category.trim()) {
          const category = req.body.category.trim();
          if (RATIO_CATEGORIES.includes(category)) return res.status(400).json({ error: "لا يُختار بابُ النسب" });
          if (category !== target.snapshot.category) patch.category = category;
        }
        if (Object.keys(patch).length === 0) return res.status(400).json({ error: "لم يتغيّر شيء — اكتب القيمة الصحيحة" });
        const nextCategory = (patch.category as string | undefined) ?? target.snapshot.category;
        const nextNote = patch.note !== undefined ? patch.note : target.snapshot.note;
        if (type === "expense" && nextCategory === "other" && !nextNote) return res.status(400).json({ error: "عند «أخرى» اكتب ما هو المصروف" });
        if (type === "cash_book_entry" && target.entry.kind === "income_other" && !nextNote) return res.status(400).json({ error: "اكتب مصدر الوارد" });
      }
      const row = await store.createRequest({
        targetType: type, targetId: id, branchId: target.branchId, action, snapshot: target.snapshot, patch, reason,
        userId: s.userId ?? null, userName: s.displayName ?? null,
      });
      await logAudit({ entityType: "money_correction_request", entityId: row.id, action: "create", userId: s.userId ?? null,
        userName: s.displayName ?? null, branchId: target.branchId, newValues: row, ipAddress: req.ip ?? null, userAgent: req.get?.("user-agent") ?? null });
      res.json(row);
    } catch (e) { fail(res, e); }
  });

  app.get("/api/money-corrections", isAuthenticated, async (req: any, res) => {
    const s = getSession(req) ?? {};
    const status = ["pending", "approved", "rejected"].includes(String(req.query.status)) ? String(req.query.status) : null;
    try {
      const rows = await store.listRequests({
        status,
        branchId: s.isAdmin ? (Number(req.query.branchId) > 0 ? Number(req.query.branchId) : null) : (s.branchId ?? -1),
        requestedBy: s.isAdmin ? null : (s.userId ?? -1),
        limit: 200,
      });
      res.json(rows.map(({ r, branchName }) => ({ ...r, branchName })));
    } catch (e) { fail(res, e); }
  });

  for (const decision of ["approve", "reject"] as const) {
    app.post(`/api/money-corrections/:id/${decision}`, isAuthenticated, async (req: any, res) => {
      const s = getSession(req) ?? {};
      if (!s.isAdmin) return res.status(403).json({ error: "اعتمادُ التصحيح للمسؤول وحده" });
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "طلب غير صالح" });
      const note = typeof req.body?.note === "string" ? (req.body.note.trim().slice(0, 500) || null) : null;
      const by = s.userId ?? null, byName = s.displayName ?? null;
      const meta = { userId: by, userName: byName, ipAddress: req.ip ?? null, userAgent: req.get?.("user-agent") ?? null };
      try {
        if (decision === "reject") {
          const r = await store.reject(id, by, byName, note);
          await logAudit({ entityType: "money_correction_request", entityId: id, action: "reject", branchId: r.branchId, newValues: r, ...meta });
          return res.json(r);
        }
        const out = await store.approve(id, by, byName, note);
        const r = out.request;
        await logAudit({ entityType: "money_correction_request", entityId: id, action: "approve", branchId: r.branchId, newValues: r, ...meta });
        //  والتغييرُ نفسُه بسطرٍ على الهدف — كما لو عدّله المسؤولُ يدوياً.
        await logAudit({ entityType: r.targetType, entityId: r.targetId, action: r.action, branchId: r.branchId,
          oldValues: out.before, newValues: out.after ?? undefined, notes: `باعتماد طلب تصحيح #${id} من ${r.requestedByName ?? "موظّف"}`, ...meta });
        res.json(r);
      } catch (e) { fail(res, e); }
    });
  }
}
