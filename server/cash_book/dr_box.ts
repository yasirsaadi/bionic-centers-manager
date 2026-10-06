// **قاصةُ الدكتور لكلّ فرع** (ترحيل ٠٩٩، §4.cb) — طبقةُ البيانات.
//
// قراراتُ المالك (٢٠٢٦-١٠-٠٦):
//   • الواردُ إليها = «تحويل إلى قاصة الدكتور» من دفتر القاصة لذلك الفرع (بدفتريه) — لا يُكتب مرّةً ثانية هنا.
//   • والمصروفُ منها يكتبه المالكُ وحده، وتقريرُها ورصيدُها له وحده.
//   • والفرعُ يرى في دفتره يومَ الصرف وبابَه فقط — بلا مبلغٍ ولا ملاحظة (`drBoxLinesForDay`).
//   • ولا تدخل `expenses` ولا تقاريرَ الفرع: المالُ خرج من قاصة الفرع يومَ التحويل.

import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { branches, cashBookEntries, drBoxExpenses, drBoxOpenings } from "@shared/schema";
import { branchCashConfig, drBoxAccountLabel, CASH_BOOK_LABELS, type CashBook } from "@shared/cash_book";
import { categoryArabicLabel } from "../anomalies/detector";
import { CashBookError, getSheet, autoDrRatioSum } from "./store";

const addDaysYmd = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
};

const alive = sql`${drBoxExpenses.deletedAt} IS NULL`;

export async function getDrBoxOpening(branchId: number) {
  const [row] = await db.select().from(drBoxOpenings).where(eq(drBoxOpenings.branchId, branchId));
  return row ?? null;
}

/** الرصيدُ الافتتاحيّ — يضعه المسؤولُ ويعدّله، صفٌّ واحد لكلّ فرع. */
export async function setDrBoxOpening(p: { branchId: number; openingDate: string; amount: number; userId: number | null }) {
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`dr_box_opening:${p.branchId}`}))`);
    const [cur] = await tx.select().from(drBoxOpenings).where(eq(drBoxOpenings.branchId, p.branchId));
    if (cur) {
      const [row] = await tx.update(drBoxOpenings).set({ openingDate: p.openingDate, amount: p.amount, updatedAt: new Date() })
        .where(eq(drBoxOpenings.id, cur.id)).returning();
      return { before: cur, after: row };
    }
    const [row] = await tx.insert(drBoxOpenings).values({
      branchId: p.branchId, openingDate: p.openingDate, amount: p.amount, createdBy: p.userId,
    }).returning();
    return { before: null, after: row };
  });
}

export async function drBoxReport(branchId: number, from: string, to: string) {
  //  من الرصيد الافتتاحيّ يبدأ الحساب (قرارُ المالك): ما قبل يومه لا يدخل الرصيد. وبلا افتتاحيّ: من البداية.
  const opening = await getDrBoxOpening(branchId);
  const since = opening?.openingDate ?? null;
  const [recAll] = await db.select({ n: sql<number>`COALESCE(SUM(${cashBookEntries.amount}), 0)::bigint` }).from(cashBookEntries)
    .where(and(eq(cashBookEntries.branchId, branchId), eq(cashBookEntries.kind, "dr_transfer"), sql`${cashBookEntries.deletedAt} IS NULL`,
      since ? gte(cashBookEntries.entryDate, since) : undefined));
  const [spentAll] = await db.select({ n: sql<number>`COALESCE(SUM(${drBoxExpenses.amount}), 0)::bigint` }).from(drBoxExpenses)
    .where(and(eq(drBoxExpenses.branchId, branchId), alive, since ? gte(drBoxExpenses.expenseDate, since) : undefined));

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
  const openingAmount = opening?.amount ?? 0;
  return {
    from, to,
    opening: opening ? { date: opening.openingDate, amount: opening.amount } : null,
    totals: { received, spent: spentTotal, balance: openingAmount + received - spentTotal },
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

/**
 * **خلاصةُ المالك** (للمسؤول وحده — `GET /api/dr-box/summary`): ما يسأل عنه المساعدُ الذكيّ بجلسة المالك (§4.cb تكملة).
 * لكلّ فرع: قاصةُ الدكتور (الافتتاحيّ · ما وصل · ما صُرف · الرصيد، وحركةُ الفترة ومصروفُها بالباب)، ولكلّ دفترٍ من دفاتره:
 * المتبقي في القاصة والمتبقي في النسبة كما يقولهما دفترُ اليوم، ومجاميعُ الفترة (التحويلات · نسبةُ الدكتور · المستلَمُ منها).
 * **كلُّ رقمٍ يُحسب هنا بالمصادر نفسِها** (`drBoxReport` و`getSheet`) — لا حسابٌ ثانٍ ينحرف.
 */
export async function ownerSummary(from: string, to: string, today: string) {
  const list = await db.select({ id: branches.id, name: branches.name, closed: branches.temporarilyClosed }).from(branches).orderBy(asc(branches.id));

  const periodRows = await db.select({
    branchId: cashBookEntries.branchId, book: cashBookEntries.book, kind: cashBookEntries.kind,
    n: sql<number>`COALESCE(SUM(${cashBookEntries.amount}), 0)::bigint`,
  }).from(cashBookEntries)
    .where(and(sql`${cashBookEntries.deletedAt} IS NULL`, gte(cashBookEntries.entryDate, from), lte(cashBookEntries.entryDate, to)))
    .groupBy(cashBookEntries.branchId, cashBookEntries.book, cashBookEntries.kind);
  const periodOf = (b: number, book: string, kind: string) =>
    Number(periodRows.find((r) => r.branchId === b && r.book === book && r.kind === kind)?.n ?? 0);

  interface BookState {
    book: CashBook; label: string; started: boolean; cashRemaining: number | null; ratioRemaining: number | null;
    period: { drTransfers: number; drRatio: number; ratioReceived: number };
  }
  interface BranchState {
    id: number; name: string; temporarilyClosed: boolean; account: string | null;
    drBox: {
      opening: { date: string; amount: number } | null; received: number; spent: number; balance: number;
      period: { received: number; spent: number }; periodSpentByCategory: { category: string; amount: number }[];
    };
    books: BookState[];
  }
  const out: BranchState[] = [];
  for (const b of list) {
    const box = await drBoxReport(b.id, from, to);
    const byCat = new Map<string, number>();
    for (const e of box.expenses) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
    const books: BookState[] = [];
    for (const book of branchCashConfig(b.name).books) {
      const s = await getSheet(b.id, book, today);
      books.push({
        book, label: CASH_BOOK_LABELS[book], started: Boolean(s.opening),
        cashRemaining: s.opening ? s.totals.remaining : null,
        ratioRemaining: s.opening ? s.ratio.remaining : null,
        period: {
          drTransfers: periodOf(b.id, book, "dr_transfer"),
          drRatio: await autoDrRatioSum(b.id, book, from, addDaysYmd(to, 1)),
          ratioReceived: periodOf(b.id, book, "ratio_received"),
        },
      });
    }
    out.push({
      id: b.id, name: b.name, temporarilyClosed: b.closed, account: drBoxAccountLabel(b.name),
      drBox: {
        opening: box.opening, received: box.totals.received, spent: box.totals.spent, balance: box.totals.balance,
        period: box.period,
        periodSpentByCategory: Array.from(byCat.entries()).map(([category, amount]) => ({ category: categoryArabicLabel(category), amount }))
          .sort((x, y) => y.amount - x.amount),
      },
      books,
    });
  }
  const sum = (f: (x: BranchState) => number) => out.reduce((s, x) => s + f(x), 0);
  return {
    today, from, to,
    totals: {
      drBoxBalance: sum((x) => x.drBox.balance),
      cashRemaining: sum((x) => x.books.reduce((s, k) => s + (k.cashRemaining ?? 0), 0)),
      ratioRemaining: sum((x) => x.books.reduce((s, k) => s + (k.ratioRemaining ?? 0), 0)),
      periodDrTransfers: sum((x) => x.books.reduce((s, k) => s + k.period.drTransfers, 0)),
      periodDrBoxSpent: sum((x) => x.drBox.period.spent),
    },
    //  **الفروعُ كائنٌ باسمها لا مصفوفة** عمداً: طبقةُ تشكيل المساعد (`capabilities/shape.ts`) تأخذ من جوابٍ فيه مصفوفةٌ
    //  في مستواه الأوّل تلك المصفوفةَ وحدها وتُسقط ما حولها — فتضيع `totals`. وبلا مصفوفةٍ يمضي الجوابُ كاملاً.
    branches: Object.fromEntries(out.map((b) => [b.name, b])),
  };
}
