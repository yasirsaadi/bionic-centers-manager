// **قاصةُ الدكتور لكلّ فرع** (ترحيل ٠٩٩، §4.cb) — طبقةُ البيانات.
//
// قراراتُ المالك (٢٠٢٦-١٠-٠٦):
//   • الواردُ إليها = «تحويل إلى قاصة الدكتور» من دفتر القاصة لذلك الفرع (بدفتريه) — لا يُكتب مرّةً ثانية هنا.
//   • والمصروفُ منها يكتبه المالكُ وحده، وتقريرُها ورصيدُها له وحده.
//   • والفرعُ يرى في دفتره يومَ الصرف وبابَه فقط — بلا مبلغٍ ولا ملاحظة (`drBoxLinesForDay`).
//   • ولا تدخل `expenses` ولا تقاريرَ الفرع: المالُ خرج من قاصة الفرع يومَ التحويل.

import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { cashBookEntries, drBoxExpenses } from "@shared/schema";
import { CashBookError } from "./store";

const alive = sql`${drBoxExpenses.deletedAt} IS NULL`;

export async function drBoxReport(branchId: number, from: string, to: string) {
  const [recAll] = await db.select({ n: sql<number>`COALESCE(SUM(${cashBookEntries.amount}), 0)::bigint` }).from(cashBookEntries)
    .where(and(eq(cashBookEntries.branchId, branchId), eq(cashBookEntries.kind, "dr_transfer"), sql`${cashBookEntries.deletedAt} IS NULL`));
  const [spentAll] = await db.select({ n: sql<number>`COALESCE(SUM(${drBoxExpenses.amount}), 0)::bigint` }).from(drBoxExpenses)
    .where(and(eq(drBoxExpenses.branchId, branchId), alive));

  const transfers = await db.select({
    id: cashBookEntries.id, date: cashBookEntries.entryDate, book: cashBookEntries.book, amount: cashBookEntries.amount, note: cashBookEntries.note,
  }).from(cashBookEntries)
    .where(and(eq(cashBookEntries.branchId, branchId), eq(cashBookEntries.kind, "dr_transfer"), sql`${cashBookEntries.deletedAt} IS NULL`,
      gte(cashBookEntries.entryDate, from), lte(cashBookEntries.entryDate, to)))
    .orderBy(asc(cashBookEntries.entryDate), asc(cashBookEntries.id));
  const spent = await db.select({
    id: drBoxExpenses.id, date: drBoxExpenses.expenseDate, category: drBoxExpenses.category, amount: drBoxExpenses.amount, note: drBoxExpenses.note,
  }).from(drBoxExpenses)
    .where(and(eq(drBoxExpenses.branchId, branchId), alive, gte(drBoxExpenses.expenseDate, from), lte(drBoxExpenses.expenseDate, to)))
    .orderBy(asc(drBoxExpenses.expenseDate), asc(drBoxExpenses.id));

  const received = Number(recAll?.n ?? 0);
  const spentTotal = Number(spentAll?.n ?? 0);
  return {
    from, to,
    totals: { received, spent: spentTotal, balance: received - spentTotal },
    period: {
      received: transfers.reduce((s, r) => s + r.amount, 0),
      spent: spent.reduce((s, r) => s + r.amount, 0),
    },
    transfers: transfers.map((r) => ({ ...r, note: r.note ?? "" })),
    expenses: spent.map((r) => ({ ...r, note: r.note ?? "" })),
  };
}

/** ما يراه الفرعُ في دفتره: يومُ الصرف وبابُه — بلا مبلغٍ ولا ملاحظة. */
export async function drBoxLinesForDay(branchId: number, day: string): Promise<{ id: number; category: string }[]> {
  return await db.select({ id: drBoxExpenses.id, category: drBoxExpenses.category }).from(drBoxExpenses)
    .where(and(eq(drBoxExpenses.branchId, branchId), eq(drBoxExpenses.expenseDate, day), alive))
    .orderBy(asc(drBoxExpenses.id));
}

export async function getDrBoxExpense(id: number) {
  const [row] = await db.select().from(drBoxExpenses).where(and(eq(drBoxExpenses.id, id), alive));
  return row ?? null;
}

export async function addDrBoxExpense(p: {
  branchId: number; day: string; category: string; amount: number; note: string | null; userId: number | null;
}) {
  const [row] = await db.insert(drBoxExpenses).values({
    branchId: p.branchId, expenseDate: p.day, category: p.category, amount: p.amount, note: p.note, createdBy: p.userId,
  }).returning();
  return row;
}

export async function updateDrBoxExpense(id: number, patch: { day?: string; category?: string; amount?: number; note?: string | null }) {
  const before = await getDrBoxExpense(id);
  if (!before) throw new CashBookError(404, "السطر غير موجود");
  const [after] = await db.update(drBoxExpenses).set({
    ...(patch.day !== undefined ? { expenseDate: patch.day } : {}),
    ...(patch.category !== undefined ? { category: patch.category } : {}),
    ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
    ...(patch.note !== undefined ? { note: patch.note } : {}),
    updatedAt: new Date(),
  }).where(and(eq(drBoxExpenses.id, id), alive)).returning();
  if (!after) throw new CashBookError(404, "السطر غير موجود");
  return { before, after };
}

export async function deleteDrBoxExpense(id: number, userId: number | null) {
  const [row] = await db.update(drBoxExpenses).set({ deletedAt: new Date(), deletedBy: userId, updatedAt: new Date() })
    .where(and(eq(drBoxExpenses.id, id), alive)).returning();
  if (!row) throw new CashBookError(404, "السطر غير موجود");
  return row;
}
