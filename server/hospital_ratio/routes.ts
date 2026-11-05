// **«نسبة مستشفى العين» — طلبُ التسليم وسجلُّه** (ترحيل ١٩٢، §4.fz) — النقاط.
//
//   GET  /api/hospital-ratio/deliveries                — مَن يكتب دفترَ فرع النسبة: سجلُّ التسليمات (المعلَّق والمعتمد والمرفوض)؛ والمسؤولُ لأيّ فرع.
//   GET  /api/hospital-ratio/deliveries/pending-count  — المسؤولُ وحده: عددُ المعلَّق، يُجمع في رقم «طلبات التصحيح».
//   POST /api/hospital-ratio/deliveries                — المحاسبُ أو مديرُ الفرع: يطلب تسليمَ مبلغٍ للمستشفى؛ والمسؤولُ يسلّم مباشرةً.
//   POST /api/hospital-ratio/deliveries/:id/approve    — المسؤولُ وحده: ينقص المربّعُ بيوم الاعتماد.
//   POST /api/hospital-ratio/deliveries/:id/reject     — المسؤولُ وحده، بسبب.
// **والعزلُ نفسُه لا نقطةَ له** — يكتبه الخادمُ وحده (`store.reconcileBranch`).
import type { Express } from "express";
import { logAudit } from "../accounting/ledger";
import { getSession, type BranchSession } from "../sessions_module/permissions";
import { notifyHospitalDeliveryDecided, notifyHospitalDeliveryPending } from "../staff_telegram/notify";
import { baghdadTodayYmd } from "@shared/visit_date";
import { branchCashConfig, canWriteCashBook, parseAmount } from "@shared/cash_book";
import { amountInArabicWords } from "@shared/reserve_withdrawals";
import { DELIVERY_NOTE_MAX, HOSPITAL_DELIVERY_STATUS_LABELS, type HospitalDeliveryStatus } from "@shared/hospital_ratio";
import { branchConfigOf } from "../cash_book/store";
import * as store from "./store";

const money = (n: number) => n.toLocaleString("en-US");

function fail(res: any, e: unknown) {
  if (e instanceof store.HospitalError) return res.status(e.status).json({ error: e.message });
  console.error("[hospital-ratio]", e);
  res.status(500).json({ error: "تعذّر تنفيذ الطلب — لم يتغيّر شيء" });
}

function auditRow(req: any, s: BranchSession, tx: any, p: { entityType: string; entityId: number; action: string; branchId: number; oldValues?: any; newValues?: any; notes: string }) {
  return logAudit({
    ...p, tx, userId: s.userId ?? null, userName: s.displayName ?? null,
    ipAddress: req.ip ?? null, userAgent: req.get?.("user-agent") ?? null,
  });
}

export function present(row: store.DeliveryRow, remainingNow?: number | null) {
  return {
    ...row, amountWords: amountInArabicWords(row.amount),
    statusLabel: HOSPITAL_DELIVERY_STATUS_LABELS[row.status as HospitalDeliveryStatus] ?? row.status,
    remainingNow: remainingNow ?? null,
    remainingAfter: remainingNow == null ? null : remainingNow - row.amount,
    exceeds: remainingNow != null && row.amount > remainingNow,
  };
}

/** فرعُ الطلب: المسؤولُ يختار، وغيرُه فرعُه النشط — وفرعٌ بلا نسبة مستشفى ⟵ ٤٠٠. */
async function branchOf(req: any, res: any, s: BranchSession): Promise<number | null> {
  const raw = s.isAdmin ? Number(req.body?.branchId ?? req.query?.branchId ?? s.branchId) : Number(s.branchId);
  if (!s.isAdmin && req.body?.branchId != null && Number(req.body.branchId) !== Number(s.branchId)) {
    res.status(403).json({ error: "التسليمُ لفرعك النشط وحده" });
    return null;
  }
  if (!Number.isInteger(raw) || raw <= 0) { res.status(400).json({ error: "اختر الفرع" }); return null; }
  const b = await branchConfigOf(raw);
  if (!b?.config.hospitalRatioPct) { res.status(400).json({ error: "نسبةُ المستشفى لفرع ذي قار وحده" }); return null; }
  return raw;
}

export function registerHospitalRatioRoutes(app: Express, isAuthenticated: any) {
  app.get("/api/hospital-ratio/deliveries/pending-count", isAuthenticated, async (req: any, res) => {
    const s = getSession(req) ?? ({} as BranchSession);
    if (!s.isAdmin) return res.status(403).json({ error: "للمسؤول وحده" });
    res.json({ count: await store.pendingDeliveryCount() });
  });

  app.get("/api/hospital-ratio/deliveries", isAuthenticated, async (req: any, res) => {
    const s = getSession(req) ?? ({} as BranchSession);
    const status = ["pending", "approved", "rejected"].includes(String(req.query.status)) ? String(req.query.status) : null;
    try {
      if (s.isAdmin) {
        const branchId = req.query.branchId ? Number(req.query.branchId) || null : null;
        const list = await store.listDeliveries({ status, branchId });
        const today = baghdadTodayYmd();
        const remaining = new Map<number, number>();
        for (const r of list) if (r.status === "pending" && !remaining.has(r.branchId)) remaining.set(r.branchId, await store.remainingAt(r.branchId, today));
        return res.json(list.map((r) => present(r, r.status === "pending" ? remaining.get(r.branchId) : null)));
      }
      if (!canWriteCashBook(s)) return res.status(403).json({ error: "سجلُّ التسليم لمن يكتب دفتر القاصة" });
      const branchId = Number(s.branchId);
      if (!branchCashConfig((await branchConfigOf(branchId))?.name ?? "").hospitalRatioPct) return res.json([]);
      res.json((await store.listDeliveries({ status, branchId })).map((r) => present(r)));
    } catch (e) { fail(res, e); }
  });

  app.post("/api/hospital-ratio/deliveries", isAuthenticated, async (req: any, res) => {
    const s = getSession(req) ?? ({} as BranchSession);
    if (!canWriteCashBook(s)) return res.status(403).json({ error: "طلبُ التسليم لمن يكتب دفتر القاصة (المحاسب ومدير الفرع)" });
    const branchId = await branchOf(req, res, s);
    if (!branchId) return;
    const amount = parseAmount(req.body?.amount);
    if (amount === null) return res.status(400).json({ error: "المبلغ غير صالح" });
    const note = typeof req.body?.note === "string" && req.body.note.trim() ? req.body.note.trim().slice(0, DELIVERY_NOTE_MAX) : null;
    const today = baghdadTodayYmd();
    try {
      let row = await store.createDelivery({ branchId, amount, note, userId: s.userId ?? null, userName: s.displayName ?? null, today },
        async (tx, r, remaining) => {
          await auditRow(req, s, tx, { entityType: "hospital_ratio_delivery", entityId: r.id, action: "create", branchId,
            newValues: { amount, note, remaining }, notes: `طلب تسليم ${money(amount)} لمستشفى العين` });
          if (!s.isAdmin) {
            await notifyHospitalDeliveryPending(tx, {
              branchId, amountText: money(amount), amountWords: amountInArabicWords(amount), remainingText: money(remaining),
              afterText: money(remaining - amount), exceeds: amount > remaining, note, actorName: s.displayName ?? null, actorUserId: s.userId ?? null,
            });
          }
        });
      //  **والمسؤولُ يسلّم مباشرةً** — بكتابة الاعتماد نفسِها.
      if (s.isAdmin) row = await approveAs(req, s, row.id, null);
      res.status(201).json(present(row));
    } catch (e) { fail(res, e); }
  });

  async function approveAs(req: any, s: BranchSession, id: number, note: string | null) {
    const today = baghdadTodayYmd();
    return await store.approveDelivery(id, { userId: s.userId ?? null, userName: s.displayName ?? null, note, today }, async (tx, row, before) => {
      await auditRow(req, s, tx, { entityType: "hospital_ratio_delivery", entityId: row.id, action: "approve", branchId: row.branchId,
        oldValues: { status: "pending", remaining: before }, newValues: { status: "approved", deliveredOn: today, remaining: before - row.amount, note },
        notes: `تسليم ${money(row.amount)} لمستشفى العين${row.requestedByName ? ` — طلبه ${row.requestedByName}` : ""}` });
      if (row.requestedBy && row.requestedBy !== s.userId) {
        await notifyHospitalDeliveryDecided(tx, { requesterUserId: row.requestedBy, approved: true, amountText: money(row.amount), note });
      }
    });
  }

  app.post("/api/hospital-ratio/deliveries/:id/approve", isAuthenticated, async (req: any, res) => {
    const s = getSession(req) ?? ({} as BranchSession);
    if (!s.isAdmin) return res.status(403).json({ error: "اعتمادُ التسليم للمسؤول وحده" });
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "طلب غير صالح" });
    const note = typeof req.body?.note === "string" && req.body.note.trim() ? req.body.note.trim().slice(0, 500) : null;
    try { res.json(present(await approveAs(req, s, id, note))); } catch (e) { fail(res, e); }
  });

  app.post("/api/hospital-ratio/deliveries/:id/reject", isAuthenticated, async (req: any, res) => {
    const s = getSession(req) ?? ({} as BranchSession);
    if (!s.isAdmin) return res.status(403).json({ error: "رفضُ التسليم للمسؤول وحده" });
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "طلب غير صالح" });
    const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 500) : "";
    if (note.length < 3) return res.status(400).json({ error: "اكتب سببَ الرفض — يصل الطالبَ" });
    try {
      const row = await store.rejectDelivery(id, { userId: s.userId ?? null, userName: s.displayName ?? null, note }, async (tx, row) => {
        await auditRow(req, s, tx, { entityType: "hospital_ratio_delivery", entityId: row.id, action: "reject", branchId: row.branchId,
          oldValues: { status: "pending" }, newValues: { status: "rejected", note }, notes: `رفضُ طلب تسليم ${money(row.amount)} لمستشفى العين — ${note}` });
        if (row.requestedBy) await notifyHospitalDeliveryDecided(tx, { requesterUserId: row.requestedBy, approved: false, amountText: money(row.amount), note });
      });
      res.json(present(row));
    } catch (e) { fail(res, e); }
  });
}
