// **«طلب سحب من القاصات»** (ترحيل ١٨٩، §4.fy) — طبقةُ البيانات.
// الاعتمادُ معاملةٌ واحدة: حجزُ الطلب المعلَّق (`status = 'pending'`) ⟵ سطرُ السحب في الدفتر بقفل اليوم ⟵ ربطُه بالطلب ⟵ التدقيقُ والتنبيه.
// فضغطتان متزامنتان لا تسحبان مرّتين، وفشلُ أيِّ خطوةٍ يُرجع كلَّ شيء.
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { branches, reserveWithdrawalRequests } from "@shared/schema";
import { type CashBook, type ReserveKey, RESERVE_WITHDRAW_KIND, reserveStartOf } from "@shared/cash_book";
import * as cash from "../cash_book/store";

export type RequestRow = typeof reserveWithdrawalRequests.$inferSelect;

export class WithdrawalError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** رصيدُ القاصة الآن (الباقي بعد اليوم) — أو `null` إن لم تبدأ القاصةُ في هذا الدفتر. */
export async function reserveBalance(branchId: number, book: CashBook, reserve: ReserveKey, day: string): Promise<number | null> {
  const b = await cash.branchConfigOf(branchId);
  if (!b || !b.config.books.includes(book)) return null;
  const start = reserveStartOf((await cash.getOpening(branchId, book))?.openingDate);
  const boxes = await cash.reserveBoxes(branchId, b.config, book, day, start);
  return boxes ? boxes[reserve].remaining : null;
}

export async function create(p: {
  branchId: number; book: CashBook; reserve: ReserveKey; amount: number; purpose: string; balance: number;
  userId: number | null; userName: string | null;
}, after: (tx: any, row: RequestRow) => Promise<void>) {
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx.insert(reserveWithdrawalRequests).values({
        branchId: p.branchId, book: p.book, reserve: p.reserve, amount: p.amount, purpose: p.purpose, balanceAtRequest: p.balance,
        requestedBy: p.userId, requestedByName: p.userName,
      }).returning();
      await after(tx, row);
      return row;
    });
  } catch (e: any) {
    if (e?.code === "23505") throw new WithdrawalError(409, "على هذه القاصة طلبُ سحبٍ معلَّق — انتظر قرارَ المسؤول عليه أوّلاً");
    throw e;
  }
}

export async function getRequest(id: number) {
  const [r] = await db.select().from(reserveWithdrawalRequests).where(eq(reserveWithdrawalRequests.id, id));
  return r ?? null;
}

export async function listRequests(p: { status: string | null; branchId: number | null; requestedBy: number | null; limit: number }) {
  const conds: any[] = [];
  if (p.status) conds.push(eq(reserveWithdrawalRequests.status, p.status));
  if (p.branchId) conds.push(eq(reserveWithdrawalRequests.branchId, p.branchId));
  if (p.requestedBy != null) conds.push(eq(reserveWithdrawalRequests.requestedBy, p.requestedBy));
  return db.select({ r: reserveWithdrawalRequests, branchName: branches.name }).from(reserveWithdrawalRequests)
    .innerJoin(branches, eq(branches.id, reserveWithdrawalRequests.branchId))
    .where(conds.length ? and(...conds) : sql`TRUE`)
    .orderBy(desc(reserveWithdrawalRequests.requestedAt), desc(reserveWithdrawalRequests.id)).limit(p.limit);
}

export async function pendingCount(branchId: number | null) {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(reserveWithdrawalRequests)
    .where(and(eq(reserveWithdrawalRequests.status, "pending"), branchId ? eq(reserveWithdrawalRequests.branchId, branchId) : sql`TRUE`));
  return Number(r?.n ?? 0);
}

/**
 * **الاعتماد = السحب**: يُحجز الطلبُ المعلَّق ويُكتب سطرُ السحب بيوم الاعتماد (قرارُ المالك) في معاملةٍ واحدة.
 * `after` (التدقيقُ والتنبيه) داخل المعاملة نفسِها.
 */
export async function approve(id: number, p: { day: string; userId: number | null; userName: string | null; note: string | null },
  after: (tx: any, req: RequestRow, entry: { id: number }) => Promise<void>) {
  const cur = await getRequest(id);
  if (!cur || cur.status !== "pending") throw new WithdrawalError(409, "الطلب ليس معلَّقاً");
  const book = cur.book as CashBook;
  const reserve = cur.reserve as ReserveKey;
  const start = reserveStartOf((await cash.getOpening(cur.branchId, book))?.openingDate);
  if (!start || p.day < start) throw new WithdrawalError(409, "القاصةُ لم تبدأ في هذا الدفتر — ارفض الطلب");
  return await db.transaction(async (tx) => {
    const [claimed] = await tx.update(reserveWithdrawalRequests)
      .set({ status: "approved", decidedBy: p.userId, decidedByName: p.userName, decidedAt: new Date(), decisionNote: p.note })
      .where(and(eq(reserveWithdrawalRequests.id, id), eq(reserveWithdrawalRequests.status, "pending"))).returning();
    if (!claimed) throw new WithdrawalError(409, "الطلب ليس معلَّقاً");
    const entry = await cash.addEntryTx(tx, {
      branchId: claimed.branchId, book, day: p.day, kind: RESERVE_WITHDRAW_KIND[reserve], amount: claimed.amount,
      note: `${claimed.purpose} — بطلب ${claimed.requestedByName ?? "موظّف"} (طلب سحب #${claimed.id})`.slice(0, 500),
      userId: p.userId,
    });
    const [done] = await tx.update(reserveWithdrawalRequests).set({ entryId: entry.id })
      .where(eq(reserveWithdrawalRequests.id, id)).returning();
    await after(tx, done, entry);
    return { request: done, entry };
  });
}

export async function reject(id: number, p: { userId: number | null; userName: string | null; note: string },
  after: (tx: any, req: RequestRow) => Promise<void>) {
  return await db.transaction(async (tx) => {
    const [claimed] = await tx.update(reserveWithdrawalRequests)
      .set({ status: "rejected", decidedBy: p.userId, decidedByName: p.userName, decidedAt: new Date(), decisionNote: p.note })
      .where(and(eq(reserveWithdrawalRequests.id, id), eq(reserveWithdrawalRequests.status, "pending"))).returning();
    if (!claimed) throw new WithdrawalError(409, "الطلب ليس معلَّقاً");
    await after(tx, claimed);
    return claimed;
  });
}

/** الطلباتُ المعلَّقة على دفترٍ بعينه — لمربّعَي القاصتين في صفحة الدفتر. */
export async function pendingForBook(branchId: number, book: CashBook) {
  return db.select().from(reserveWithdrawalRequests)
    .where(and(eq(reserveWithdrawalRequests.branchId, branchId), eq(reserveWithdrawalRequests.book, book), eq(reserveWithdrawalRequests.status, "pending")))
    .orderBy(reserveWithdrawalRequests.requestedAt);
}
