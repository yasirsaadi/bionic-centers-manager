// **«طلب سحب من القاصات»** (ترحيل ١٨٩، §4.fy) — النقاط.
//
//   POST /api/reserve-withdrawals               — حاملُ المفتاح: يطلب السحبَ من قاصة المواد أو قاصة الرواتب والإيجار لدفتر فرعه النشط، بغرضه.
//   GET  /api/reserve-withdrawals               — المسؤولُ: كلُّ الطلبات (أو بحالة)؛ وغيرُه: طلباتُه هو.
//   GET  /api/reserve-withdrawals/pending-count — المسؤولُ وحده: عددُ المعلَّق، يُجمع في رقم «طلبات التصحيح» في الشريط.
//   POST /api/reserve-withdrawals/:id/approve   — المسؤولُ وحده: يُكتب سطرُ السحب بيوم الاعتماد.
//   POST /api/reserve-withdrawals/:id/reject    — المسؤولُ وحده، بسبب.
import type { Express } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { logAudit } from "../accounting/ledger";
import { getSession, type BranchSession } from "../sessions_module/permissions";
import { notifyReserveWithdrawalDecided, notifyReserveWithdrawalPending } from "../staff_telegram/notify";
import { baghdadTodayYmd } from "@shared/visit_date";
import { CASH_BOOK_LABELS, RESERVE_LABELS, canWriteCashBook, isCashBook, parseAmount, type CashBook, type ReserveKey } from "@shared/cash_book";
import {
  PURPOSE_ERROR, PURPOSE_MAX, PURPOSE_MIN, RESERVE_WITHDRAWAL_STATUS_LABELS, amountInArabicWords, balanceAfter,
  canRequestReserveWithdrawal, reserveOf, type ReserveWithdrawalStatus,
} from "@shared/reserve_withdrawals";
import * as cash from "../cash_book/store";
import * as store from "./store";

const money = (n: number) => n.toLocaleString("en-US");

function fail(res: any, e: unknown) {
  if (e instanceof store.WithdrawalError) return res.status(e.status).json({ error: e.message });
  if (e instanceof cash.CashBookError) return res.status(e.status).json({ error: e.message });
  console.error("[reserve-withdrawals]", e);
  res.status(500).json({ error: "تعذّر تنفيذ الطلب — لم يتغيّر شيء" });
}

function auditRow(req: any, s: BranchSession, tx: any, p: { entityType: string; entityId: number; action: string; branchId: number; oldValues?: any; newValues?: any; notes: string }) {
  return logAudit({
    ...p, tx, userId: s.userId ?? null, userName: s.displayName ?? null,
    ipAddress: req.ip ?? null, userAgent: req.get?.("user-agent") ?? null,
  });
}

/**
 * يُفعّل لحامل المفتاح تنبيهَ «قرار طلبه» (قرارُ المالك: «أبلغ الطالب») — مرّةً حين يُشعَل المفتاح، فما يطفئه المسؤولُ بعدها
 * من «تنبيهات الموظفين» يبقى مطفأً. ولا يصل إلّا مَن ربط حسابَه بالبوت.
 */
export async function enableDecidedNotice(userId: number) {
  await db.execute(sql`INSERT INTO staff_notification_prefs (user_id, event_type) VALUES (${userId}, 'reserve_withdrawal_decided') ON CONFLICT DO NOTHING`);
}

/** البطاقةُ كما يقرؤها المسؤول — كلُّ ما يحتاجه القرار مقروءاً. */
async function present(row: store.RequestRow, branchName: string, today: string, sums?: Map<string, { total: number; count: number }>) {
  const reserve = row.reserve as ReserveKey;
  const book = row.book as CashBook;
  const pending = row.status === "pending";
  //  الرصيدُ الحاليّ للمعلَّق (القرارُ عليه)، وللمحسوم ما كان لحظةَ الطلب.
  const balance = pending ? await store.reserveBalance(row.branchId, book, reserve, today) : row.balanceAtRequest;
  const b = balance == null ? null : balanceAfter(balance, row.amount);
  //  **وطلباتٌ أخرى معلَّقة على القاصة نفسِها** (ترحيل ١٩٠): مجموعُها وما يبقى إن اعتُمدت كلُّها — فالمسؤولُ يقرّر واحداً واحداً وهو يرى الكلّ.
  const sum = pending ? (sums ?? await store.pendingSums()).get(`${row.branchId}:${row.book}:${row.reserve}`) : undefined;
  const others = sum && sum.count > 1 ? { count: sum.count - 1, amount: sum.total - row.amount } : null;
  const all = others && balance != null ? balanceAfter(balance, sum!.total) : null;
  return {
    id: row.id, branchId: row.branchId, branchName, book, bookLabel: CASH_BOOK_LABELS[book] ?? book,
    reserve, boxLabel: RESERVE_LABELS[reserve]?.box ?? reserve,
    amount: row.amount, amountWords: amountInArabicWords(row.amount), purpose: row.purpose,
    status: row.status as ReserveWithdrawalStatus, statusLabel: RESERVE_WITHDRAWAL_STATUS_LABELS[row.status as ReserveWithdrawalStatus] ?? row.status,
    balance, balanceAfter: b?.after ?? null, exceeds: b?.exceeds ?? false, balanceAtRequest: row.balanceAtRequest,
    otherPendingCount: others?.count ?? 0, otherPendingAmount: others?.amount ?? 0,
    balanceAfterAllPending: all?.after ?? null, allPendingExceed: all?.exceeds ?? false,
    requestedBy: row.requestedBy, requestedByName: row.requestedByName, requestedAt: row.requestedAt,
    decidedByName: row.decidedByName, decidedAt: row.decidedAt, decisionNote: row.decisionNote, entryId: row.entryId,
  };
}

export function registerReserveWithdrawalRoutes(app: Express, isAuthenticated: any) {
  app.post("/api/reserve-withdrawals", isAuthenticated, async (req: any, res) => {
    const s = getSession(req) ?? {};
    if (s.isAdmin) return res.status(400).json({ error: "المسؤولُ يسحب مباشرةً من مربّع القاصة — لا يحتاج طلباً" });
    if (!canRequestReserveWithdrawal(s)) return res.status(403).json({ error: "طلبُ السحب من القاصات لمن أعطاه المسؤولُ هذه الصلاحية" });
    if (!canWriteCashBook(s)) return res.status(403).json({ error: "دفتر القاصة للمحاسب ومدير الفرع والمسؤول" });
    //  فرعُ الجلسة النشط وحده (§4.ay).
    const branchId = Number(s.branchId);
    if (!Number.isInteger(branchId) || branchId <= 0) return res.status(400).json({ error: "اختر الفرع" });
    if (req.body?.branchId != null && req.body.branchId !== "" && Number(req.body.branchId) !== branchId) {
      return res.status(403).json({ error: "طلبُ السحب لدفتر فرعك النشط وحده" });
    }
    const book = req.body?.book;
    if (!isCashBook(book)) return res.status(400).json({ error: "اختر الدفتر" });
    const reserve = reserveOf(req.body?.reserve);
    if (!reserve) return res.status(400).json({ error: "اختر القاصة: قاصة المواد أو قاصة الرواتب والإيجار" });
    const amount = parseAmount(req.body?.amount);
    if (amount === null) return res.status(400).json({ error: "اكتب المبلغ رقماً صحيحاً أكبر من صفر" });
    const purpose = typeof req.body?.purpose === "string" ? req.body.purpose.trim().replace(/\s+/g, " ") : "";
    if (purpose.length < PURPOSE_MIN) return res.status(400).json({ error: PURPOSE_ERROR });
    if (purpose.length > PURPOSE_MAX) return res.status(400).json({ error: `الغرضُ أطول من ${PURPOSE_MAX} حرف — اختصره` });
    try {
      const b = await cash.branchConfigOf(branchId);
      if (!b) return res.status(404).json({ error: "الفرع غير موجود" });
      if (!b.config.books.includes(book)) return res.status(400).json({ error: "هذا الفرع بلا دفتر علاج طبيعي" });
      const today = baghdadTodayYmd();
      const balance = await store.reserveBalance(branchId, book, reserve, today);
      if (balance == null) return res.status(409).json({ error: `${RESERVE_LABELS[reserve].box} لم تبدأ في هذا الدفتر بعد` });
      const after = balanceAfter(balance, amount);
      const row = await store.create({
        branchId, book, reserve, amount, purpose, balance, userId: s.userId ?? null, userName: s.displayName ?? null,
      }, async (tx, row) => {
        await auditRow(req, s, tx, { entityType: "reserve_withdrawal_request", entityId: row.id, action: "create", branchId, newValues: row,
          notes: `طلب سحب من ${RESERVE_LABELS[reserve].box}: ${money(amount)} — ${purpose}` });
        await notifyReserveWithdrawalPending(tx, {
          branchId, bookLabel: CASH_BOOK_LABELS[book], boxLabel: RESERVE_LABELS[reserve].box,
          amountText: money(amount), amountWords: amountInArabicWords(amount),
          balanceText: money(balance), afterText: money(after.after), exceeds: after.exceeds,
          purpose, actorName: s.displayName ?? null, actorUserId: s.userId ?? null,
        });
      });
      res.json(await present(row, b.name, today));
    } catch (e) { fail(res, e); }
  });

  app.get("/api/reserve-withdrawals/pending-count", isAuthenticated, async (req: any, res) => {
    const s = getSession(req) ?? {};
    if (!s.isAdmin) return res.status(403).json({ error: "للمسؤول وحده" });
    try { res.json({ count: await store.pendingCount(null) }); } catch (e) { fail(res, e); }
  });

  app.get("/api/reserve-withdrawals", isAuthenticated, async (req: any, res) => {
    const s = getSession(req) ?? {};
    const status = ["pending", "approved", "rejected"].includes(String(req.query.status)) ? String(req.query.status) : null;
    const branchQ = Number(req.query.branchId);
    //  غيرُ المسؤول: مَن يكتب الدفترَ وحده، وطلباتُه هو **في فرعه النشط وحده** (§4.ay، كطلبات التصحيح) — فلا يقرأ رصيدَ قاصة فرعٍ أُخرج منه.
    if (!s.isAdmin && !canWriteCashBook(s)) return res.status(403).json({ error: "دفتر القاصة للمحاسب ومدير الفرع والمسؤول" });
    try {
      const rows = await store.listRequests({
        status,
        branchId: s.isAdmin ? (Number.isInteger(branchQ) && branchQ > 0 ? branchQ : null) : (Number(s.branchId) || -1),
        requestedBy: s.isAdmin ? null : (s.userId ?? -1),
        limit: 200,
      });
      const today = baghdadTodayYmd();
      const sums = await store.pendingSums();
      res.json(await Promise.all(rows.map((r) => present(r.r, r.branchName, today, sums))));
    } catch (e) { fail(res, e); }
  });

  app.post("/api/reserve-withdrawals/:id/approve", isAuthenticated, async (req: any, res) => {
    const s = getSession(req) ?? {};
    if (!s.isAdmin) return res.status(403).json({ error: "اعتمادُ السحب للمسؤول وحده" });
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "طلب غير صالح" });
    const note = typeof req.body?.note === "string" && req.body.note.trim() ? req.body.note.trim().slice(0, 500) : null;
    const day = baghdadTodayYmd();
    try {
      const r = await store.approve(id, { day, userId: s.userId ?? null, userName: s.displayName ?? null, note }, async (tx, row, entry) => {
        const box = RESERVE_LABELS[row.reserve as ReserveKey].box;
        await auditRow(req, s, tx, { entityType: "cash_book_entry", entityId: entry.id, action: "create", branchId: row.branchId, newValues: entry,
          notes: `${RESERVE_LABELS[row.reserve as ReserveKey].withdraw} — بطلب ${row.requestedByName ?? "موظّف"} (طلب سحب #${row.id})` });
        await auditRow(req, s, tx, { entityType: "reserve_withdrawal_request", entityId: row.id, action: "approve", branchId: row.branchId,
          oldValues: { status: "pending" }, newValues: { status: "approved", entryId: entry.id, day, note },
          notes: `اعتمادُ طلب سحب من ${box}: ${money(row.amount)} — طلبه ${row.requestedByName ?? "موظّف"}` });
        if (row.requestedBy) await notifyReserveWithdrawalDecided(tx, { requesterUserId: row.requestedBy, approved: true, boxLabel: box, amountText: money(row.amount), note });
      });
      res.json(await present(r.request, (await cash.branchConfigOf(r.request.branchId))?.name ?? "", day));
    } catch (e) { fail(res, e); }
  });

  app.post("/api/reserve-withdrawals/:id/reject", isAuthenticated, async (req: any, res) => {
    const s = getSession(req) ?? {};
    if (!s.isAdmin) return res.status(403).json({ error: "رفضُ السحب للمسؤول وحده" });
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "طلب غير صالح" });
    const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 500) : "";
    if (note.length < 3) return res.status(400).json({ error: "اكتب سببَ الرفض — يصل الطالبَ" });
    try {
      const row = await store.reject(id, { userId: s.userId ?? null, userName: s.displayName ?? null, note }, async (tx, row) => {
        const box = RESERVE_LABELS[row.reserve as ReserveKey].box;
        await auditRow(req, s, tx, { entityType: "reserve_withdrawal_request", entityId: row.id, action: "reject", branchId: row.branchId,
          oldValues: { status: "pending" }, newValues: { status: "rejected", note },
          notes: `رفضُ طلب سحب من ${box}: ${money(row.amount)} — ${note}` });
        if (row.requestedBy) await notifyReserveWithdrawalDecided(tx, { requesterUserId: row.requestedBy, approved: false, boxLabel: box, amountText: money(row.amount), note });
      });
      res.json(await present(row, (await cash.branchConfigOf(row.branchId))?.name ?? "", baghdadTodayYmd()));
    } catch (e) { fail(res, e); }
  });
}
