// **دفترُ القاصة اليوميّ** (ترحيل ٠٩٨، §4.ca) — طبقةُ البيانات.
//
// صفحةُ اليوم تُبنى من ثلاثة مصادر لا مصدرٍ جديدٍ ينحرف عنها:
//   ١) **الوارد**: دفعاتُ المرضى المسجّلة في الفرع واليوم (بقسم حالتها) + «وارد آخر» من جدول الدفتر.
//   ٢) **المصاريف** (ومعها نسبتا المستشفى والعتبة): صفوفُ `expenses` نفسُها بقسمها — فما كُتب في صفحة المحاسبة يظهر هنا،
//      وما كُتب هنا يدخل تقاريرَ المحاسبة وقيودَها كما يدخلها أيُّ مصروف.
//   ٣) **ما ليس مصروفاً**: التحويلُ إلى قاصة الدكتور ونسبتُه واستلامُها — في `cash_book_entries`.
// و«الباقي من أمس» يُحسب من الرصيد الافتتاحيّ للدفتر وما بعده وحدَه.

import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "../db";
import {
  payments, patients, patientCases, expenses, branches, cashBookEntries, cashBookOpenings, type Expense,
} from "@shared/schema";
import { activePatientDrizzle } from "../patients/active_patient";
import { baghdadDayBounds } from "../storage";
import { createJournalForExpense, reverseJournalForSource } from "../accounting/auto_journal";
import {
  type CashBook, type CashEntryKind, type OutflowKind, BOOK_EXPENSE_SECTION, HOSPITAL_RATIO_CATEGORY, ATABAH_RATIO_CATEGORY,
  branchCashConfig, ratioAmount, dayTotals, ratioBox, distinctNoteParts, type BranchCashConfig,
} from "@shared/cash_book";

export class CashBookError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = "CashBookError"; }
}

export async function branchConfigOf(branchId: number): Promise<{ name: string; config: BranchCashConfig } | null> {
  const [b] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, branchId));
  return b ? { name: b.name, config: branchCashConfig(b.name) } : null;
}

function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

//  ══ تصفيةُ الدفتر — قاعدةٌ واحدة للدفعات وللمصاريف ═══════════════════════════════
//  فرعٌ بدفترٍ واحد: كلُّ ماله فيه. وفرعٌ بدفترين: العلاجُ الطبيعيُّ ما كانت حالتُه/قسمُه علاجاً طبيعياً، والباقي كلُّه
//  لدفتر الأطراف والمساند — ومنه ما بلا قسم (دفعةٌ بلا حالة، مصروفٌ مشترك) **موسوماً بذلك** لا مخفيّاً.
function paymentBookFilter(cfg: BranchCashConfig, book: CashBook) {
  if (cfg.books.length === 1) return sql`TRUE`;
  return book === "physio"
    ? sql`${patientCases.caseType} = 'physiotherapy'`
    : sql`(${patientCases.caseType} IS NULL OR ${patientCases.caseType} <> 'physiotherapy')`;
}
function expenseBookFilter(cfg: BranchCashConfig, book: CashBook) {
  if (cfg.books.length === 1) return sql`TRUE`;
  return book === "physio" ? sql`${expenses.section} = 'physio'` : sql`(${expenses.section} IS NULL OR ${expenses.section} <> 'physio')`;
}

/** مجموعُ وارد الدفتر في مدى أيّام بغداد [from, toExclusive) — الدفعاتُ ثمّ «وارد آخر». */
async function incomeSum(branchId: number, cfg: BranchCashConfig, book: CashBook, from: string, toExclusive: string): Promise<number> {
  const { start } = baghdadDayBounds(from);
  const { start: end } = baghdadDayBounds(toExclusive);
  const [p] = await db.select({ t: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
    .from(payments)
    .innerJoin(patients, eq(patients.id, payments.patientId))
    .leftJoin(patientCases, eq(patientCases.id, payments.caseId))
    .where(and(eq(payments.branchId, branchId), gte(payments.date, start!), lt(payments.date, end!),
      activePatientDrizzle(), paymentBookFilter(cfg, book)));
  const other = await entrySum(branchId, book, "income_other", from, toExclusive);
  return Number(p?.t ?? 0) + other;
}

async function expenseSum(branchId: number, cfg: BranchCashConfig, book: CashBook, from: string, toExclusive: string): Promise<number> {
  const [e] = await db.select({ t: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
    .from(expenses)
    .where(and(eq(expenses.branchId, branchId), sql`${expenses.expenseDate} >= ${from}`, sql`${expenses.expenseDate} < ${toExclusive}`,
      expenseBookFilter(cfg, book)));
  return Number(e?.t ?? 0);
}

async function entrySum(branchId: number, book: CashBook, kind: CashEntryKind, from: string, toExclusive: string): Promise<number> {
  const [r] = await db.select({ t: sql<string>`COALESCE(SUM(${cashBookEntries.amount}), 0)` })
    .from(cashBookEntries)
    .where(and(eq(cashBookEntries.branchId, branchId), eq(cashBookEntries.book, book), eq(cashBookEntries.kind, kind),
      sql`${cashBookEntries.deletedAt} IS NULL`,
      sql`${cashBookEntries.entryDate} >= ${from}`, sql`${cashBookEntries.entryDate} < ${toExclusive}`));
  return Number(r?.t ?? 0);
}

/** واردُ الدفتر يوماً يوماً في [from, toExclusive) — يومُ بغداد كما يقطعه `baghdadDayBounds`. */
async function dailyIncome(branchId: number, cfg: BranchCashConfig, book: CashBook, from: string, toExclusive: string): Promise<Map<string, number>> {
  const { start } = baghdadDayBounds(from);
  const { start: end } = baghdadDayBounds(toExclusive);
  const out = new Map<string, number>();
  const add = (d: string, n: number) => out.set(d, (out.get(d) ?? 0) + n);
  const pays = await db.select({ amount: payments.amount, date: payments.date })
    .from(payments)
    .innerJoin(patients, eq(patients.id, payments.patientId))
    .leftJoin(patientCases, eq(patientCases.id, payments.caseId))
    .where(and(eq(payments.branchId, branchId), gte(payments.date, start!), lt(payments.date, end!),
      activePatientDrizzle(), paymentBookFilter(cfg, book)));
  for (const p of pays) {
    if (!p.date) continue;
    add(new Date(new Date(p.date).getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10), Number(p.amount));
  }
  const others = await db.select({ day: cashBookEntries.entryDate, amount: cashBookEntries.amount }).from(cashBookEntries)
    .where(and(eq(cashBookEntries.branchId, branchId), eq(cashBookEntries.book, book), eq(cashBookEntries.kind, "income_other"),
      sql`${cashBookEntries.deletedAt} IS NULL`,
      sql`${cashBookEntries.entryDate} >= ${from}`, sql`${cashBookEntries.entryDate} < ${toExclusive}`));
  for (const o of others) add(String(o.day), o.amount);
  return out;
}

/**
 * **نسبةُ الدكتور تُحسب ولا تُكتب** (قرارُ المالك ٢٠٢٦-١٠-٠٦): نسبةُ كلّ يومٍ من واردِه، كالمجموع — فدفعةٌ تُضاف أو تُحذف
 * تغيّرها وحدها، بلا زرّ. وما سُجّل يدوياً قبل القرار (`dr_ratio` في جدول الدفتر) لا يُقرأ بعده.
 * المجموعُ = مجموعُ نسبة كلّ يومٍ مقرَّبةً وحدها (كما تُكتب في ورقة كلّ يوم).
 */
export async function autoDrRatioSum(branchId: number, book: CashBook, from: string, toExclusive: string): Promise<number> {
  const b = await branchConfigOf(branchId);
  if (!b?.config.drRatioPct || from >= toExclusive) return 0;
  const days = await dailyIncome(branchId, b.config, book, from, toExclusive);
  let sum = 0;
  for (const v of Array.from(days.values())) sum += ratioAmount(v, b.config.drRatioPct);
  return sum;
}

export async function getOpening(branchId: number, book: CashBook) {
  const [o] = await db.select().from(cashBookOpenings)
    .where(and(eq(cashBookOpenings.branchId, branchId), eq(cashBookOpenings.book, book)));
  return o ?? null;
}

/** صفُّ الجدول كما يُعرَض — والمصدرُ والمعرّفُ للتعديل. */
export interface SheetRow {
  source: "payment" | "entry" | "expense" | "auto";
  id: number;
  column: "income" | "expense" | "transfer";
  kind: "payment" | "income_other" | OutflowKind;
  amount: number;
  note: string;
  category: string | null;
  /** دفعةٌ بلا قسم، أو مصروفٌ مشترك/بلا قسم، في دفتر الأطراف — موسومةٌ لا مخفيّة. */
  unsectioned: boolean;
  createdBy: number | null;
  at: string | null;
}

function expenseKind(category: string): OutflowKind {
  if (category === HOSPITAL_RATIO_CATEGORY) return "hospital_ratio";
  if (category === ATABAH_RATIO_CATEGORY) return "atabah_ratio";
  return "expense";
}

/** صفحةُ يومٍ واحد لدفترٍ واحد. */
export async function getSheet(branchId: number, book: CashBook, day: string) {
  const b = await branchConfigOf(branchId);
  if (!b) throw new CashBookError(404, "الفرع غير موجود");
  const cfg = b.config;
  if (!cfg.books.includes(book)) throw new CashBookError(400, "هذا الفرع بلا دفتر علاج طبيعي");
  const opening = await getOpening(branchId, book);
  const next = addDays(day, 1);
  const { start, endExclusive } = baghdadDayBounds(day, day);

  const payRows = await db.select({
    id: payments.id, amount: payments.amount, notes: payments.notes, date: payments.date,
    patientName: patients.name, patientCode: patients.patientCode, caseType: patientCases.caseType,
  })
    .from(payments)
    .innerJoin(patients, eq(patients.id, payments.patientId))
    .leftJoin(patientCases, eq(patientCases.id, payments.caseId))
    .where(and(eq(payments.branchId, branchId), gte(payments.date, start!), lt(payments.date, endExclusive!),
      activePatientDrizzle(), paymentBookFilter(cfg, book)))
    .orderBy(payments.date, payments.id);

  const expRows = await db.select().from(expenses)
    .where(and(eq(expenses.branchId, branchId), eq(expenses.expenseDate, day), expenseBookFilter(cfg, book)))
    .orderBy(expenses.createdAt, expenses.id);

  const entRows = await db.select().from(cashBookEntries)
    .where(and(eq(cashBookEntries.branchId, branchId), eq(cashBookEntries.book, book), eq(cashBookEntries.entryDate, day),
      sql`${cashBookEntries.deletedAt} IS NULL`))
    .orderBy(cashBookEntries.createdAt, cashBookEntries.id);

  const twoBooks = cfg.books.length > 1;
  const rows: SheetRow[] = [];
  for (const p of payRows) {
    const who = `${p.patientName ?? ""}${p.patientCode ? ` (${p.patientCode})` : ""}`.trim();
    rows.push({
      source: "payment", id: p.id, column: "income", kind: "payment", amount: Number(p.amount),
      note: [`دفعة: ${who}`, p.notes?.trim()].filter(Boolean).join(" — "), category: null,
      unsectioned: twoBooks && book === "devices" && !p.caseType, createdBy: null,
      at: p.date ? new Date(p.date).toISOString() : null,
    });
  }
  for (const e of entRows.filter((x) => x.kind === "income_other")) {
    rows.push({ source: "entry", id: e.id, column: "income", kind: "income_other", amount: e.amount, note: e.note ?? "",
      category: null, unsectioned: false, createdBy: e.createdBy, at: e.createdAt.toISOString() });
  }
  const outflow: SheetRow[] = [];
  for (const x of expRows) {
    const kind = expenseKind(x.category);
    outflow.push({
      source: "expense", id: x.id, column: "expense", kind, amount: x.amount,
      //  **بلا تكرار** — «أخرى» يُحفظ وصفُه في خانتين (`distinctNoteParts`).
      note: distinctNoteParts([x.subcategory, x.description, x.notes]).join(" — "),
      category: x.category, unsectioned: twoBooks && book === "devices" && x.section !== "prosthetic",
      createdBy: x.createdBy && /^\d+$/.test(x.createdBy) ? Number(x.createdBy) : null,
      at: x.createdAt ? new Date(x.createdAt).toISOString() : null,
    });
  }
  for (const e of entRows.filter((x) => x.kind === "dr_transfer")) {
    outflow.push({ source: "entry", id: e.id, column: "transfer", kind: e.kind as OutflowKind, amount: e.amount, note: e.note ?? "",
      category: null, unsectioned: false, createdBy: e.createdBy, at: e.createdAt.toISOString() });
  }
  outflow.sort((a, c) => (a.at ?? "").localeCompare(c.at ?? "") || a.id - c.id);
  const income = rows.filter((r) => r.column === "income").reduce((s, r) => s + r.amount, 0);
  //  نسبةُ الدكتور سطرٌ محسوبٌ من وارد اليوم — آخرَ الصادر في عمود «مصاريف»، بلا زرٍّ ولا كتابةٍ ولا تعديلٍ بيد.
  //  **لا في عمود «تحويل إلى قاصة الدكتور»** (قرارُ المالك ٢٠٢٦-١٠-٠٦): النسبةُ تُعزَل في مربّعها ويستلمها المالكُ متى شاء،
  //  ولا تذهب إلى قاصته يومَها — والصادرُ رقمٌ واحد، فلا يتغيّر مجموعٌ ولا متبقٍّ بموضعها. ولا تدخل جدولَ `expenses`.
  const todayDrRatio = ratioAmount(income, cfg.drRatioPct);
  if (todayDrRatio > 0) {
    outflow.push({ source: "auto", id: 0, column: "expense", kind: "dr_ratio", amount: todayDrRatio, note: `عزل — ${cfg.drRatioPct}٪ من وارد اليوم`,
      category: null, unsectioned: false, createdBy: null, at: null });
  }
  rows.push(...outflow);

  const out = outflow.reduce((s, r) => s + r.amount, 0);

  //  الباقي من أمس — من الرصيد الافتتاحيّ وأيّامه وحدَها.
  let prevRemaining = 0;
  let prevRatio = 0;
  if (opening && day > opening.openingDate) {
    const from = opening.openingDate;
    const days = await dailyIncome(branchId, cfg, book, from, day);
    const prevIncome = Array.from(days.values()).reduce((s, v) => s + v, 0);
    const prevExp = await expenseSum(branchId, cfg, book, from, day);
    const prevTransfer = await entrySum(branchId, book, "dr_transfer", from, day);
    const prevDrRatio = Array.from(days.values()).reduce((s, v) => s + ratioAmount(v, cfg.drRatioPct), 0);
    const prevReceived = await entrySum(branchId, book, "ratio_received", from, day);
    prevRemaining = opening.cashBalance + prevIncome - prevExp - prevTransfer - prevDrRatio;
    prevRatio = opening.ratioBalance + prevDrRatio - prevReceived;
  } else if (opening && day === opening.openingDate) {
    prevRemaining = opening.cashBalance;
    prevRatio = opening.ratioBalance;
  }
  const receivedRows = entRows.filter((x) => x.kind === "ratio_received");
  const received = receivedRows.reduce((s, x) => s + x.amount, 0);

  //  النسبتان الثابتتان كما تُحسبان الآن من وارد اليوم — والمسجَّلُ قد يكون أقدمَ من دفعةٍ لحقته.
  const hospitalExpected = ratioAmount(income, cfg.hospitalRatioPct);
  const hospitalRow = outflow.find((r) => r.kind === "hospital_ratio") ?? null;

  return {
    branch: { id: branchId, name: b.name, config: cfg },
    book, day,
    opening: opening ? { date: opening.openingDate, cash: opening.cashBalance, ratio: opening.ratioBalance } : null,
    rows,
    totals: dayTotals(income, out, prevRemaining),
    ratio: {
      ...ratioBox(todayDrRatio, prevRatio, received),
      receipts: receivedRows.map((x) => ({ id: x.id, amount: x.amount, note: x.note ?? "" })),
    },
    expected: {
      drRatio: cfg.drRatioPct ? { pct: cfg.drRatioPct, amount: todayDrRatio, recorded: todayDrRatio } : null,
      hospitalRatio: cfg.hospitalRatioPct ? { pct: cfg.hospitalRatioPct, amount: hospitalExpected, recorded: hospitalRow?.amount ?? null } : null,
    },
    nextDay: next,
  };
}

//  ══ الكتابة ════════════════════════════════════════════════════════════════════════
//  كلُّ كتابةٍ على يومٍ من دفترٍ تتسلسل بقفلٍ استشاريّ على (الفرع، الدفتر، اليوم) — فلا تُكتب نسبةٌ مرّتين بضغطتين.
async function lockDay(tx: any, branchId: number, book: CashBook, day: string) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`cash_book:${branchId}:${book}:${day}`}))`);
}

export async function setOpening(p: {
  branchId: number; book: CashBook; openingDate: string; cash: number; ratio: number; userId: number | null; isAdmin: boolean;
}) {
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`cash_book_opening:${p.branchId}:${p.book}`}))`);
    const [cur] = await tx.select().from(cashBookOpenings)
      .where(and(eq(cashBookOpenings.branchId, p.branchId), eq(cashBookOpenings.book, p.book)));
    if (cur && !p.isAdmin) throw new CashBookError(409, "الرصيد الافتتاحيّ مسجَّل — تعديلُه للمسؤول وحده");
    if (cur) {
      const [row] = await tx.update(cashBookOpenings).set({
        openingDate: p.openingDate, cashBalance: p.cash, ratioBalance: p.ratio, updatedAt: new Date(),
      }).where(eq(cashBookOpenings.id, cur.id)).returning();
      return { before: cur, after: row };
    }
    const [row] = await tx.insert(cashBookOpenings).values({
      branchId: p.branchId, book: p.book, openingDate: p.openingDate, cashBalance: p.cash, ratioBalance: p.ratio, createdBy: p.userId,
    }).returning();
    return { before: null, after: row };
  });
}

export async function addEntry(p: {
  branchId: number; book: CashBook; day: string; kind: "income_other" | "dr_transfer" | "ratio_received";
  amount: number; note: string | null; userId: number | null;
}) {
  return await db.transaction(async (tx) => {
    await lockDay(tx, p.branchId, p.book, p.day);
    const [row] = await tx.insert(cashBookEntries).values({
      branchId: p.branchId, book: p.book, entryDate: p.day, kind: p.kind, amount: p.amount, note: p.note, createdBy: p.userId,
    }).returning();
    return row;
  });
}

/** مصروفٌ من صفحة الدفتر — صفٌّ في `expenses` بقسم الدفتر وقيدُه، كما تكتبه صفحةُ المحاسبة. */
export async function addExpense(p: {
  branchId: number; book: CashBook; day: string; category: string; amount: number; note: string | null; userId: number | null;
}): Promise<Expense> {
  const [row] = await db.insert(expenses).values({
    branchId: p.branchId, category: p.category, section: BOOK_EXPENSE_SECTION[p.book],
    subcategory: p.category === "other" ? p.note : null, description: p.note,
    amount: p.amount, expenseDate: p.day, paymentMethod: "نقدي",
    createdBy: p.userId === null ? "unknown" : String(p.userId),
  }).returning();
  await createJournalForExpense(row, p.userId);
  return row;
}

/**
 * **نسبةُ الدكتور أو نسبةُ المستشفى** — تُحسب من وارد الدفتر اليوم وتُكتب أو تُحدَّث في صفٍّ واحدٍ لليوم.
 * نسبةُ الدكتور في جدول الدفتر (ليست مصروفاً)، ونسبةُ المستشفى صفُّ مصروفٍ حقيقيّ بقيده.
 */
export async function syncRatio(p: {
  branchId: number; book: CashBook; day: string; kind: "dr_ratio" | "hospital_ratio"; userId: number | null;
}): Promise<{ amount: number; before: number | null; source: "entry" | "expense"; id: number }> {
  const b = await branchConfigOf(p.branchId);
  if (!b) throw new CashBookError(404, "الفرع غير موجود");
  const pct = p.kind === "dr_ratio" ? b.config.drRatioPct : b.config.hospitalRatioPct;
  if (!pct) throw new CashBookError(400, p.kind === "dr_ratio" ? "لا نسبةَ للدكتور مقرَّرة لهذا الفرع" : "نسبةُ المستشفى لفرع ذي قار وحده");
  const next = addDays(p.day, 1);
  const income = await incomeSum(p.branchId, b.config, p.book, p.day, next);
  const amount = ratioAmount(income, pct);
  if (amount <= 0) throw new CashBookError(400, "لا وارد في هذا اليوم تُحسب منه النسبة");

  if (p.kind === "dr_ratio") {
    return await db.transaction(async (tx) => {
      await lockDay(tx, p.branchId, p.book, p.day);
      const [cur] = await tx.select().from(cashBookEntries).where(and(
        eq(cashBookEntries.branchId, p.branchId), eq(cashBookEntries.book, p.book), eq(cashBookEntries.entryDate, p.day),
        eq(cashBookEntries.kind, "dr_ratio"), sql`${cashBookEntries.deletedAt} IS NULL`));
      const note = `نسبة الدكتور ${pct}٪ من وارد اليوم`;
      if (cur) {
        await tx.update(cashBookEntries).set({ amount, note, updatedAt: new Date() }).where(eq(cashBookEntries.id, cur.id));
        return { amount, before: cur.amount, source: "entry" as const, id: cur.id };
      }
      const [row] = await tx.insert(cashBookEntries).values({
        branchId: p.branchId, book: p.book, entryDate: p.day, kind: "dr_ratio", amount, note, createdBy: p.userId,
      }).returning();
      return { amount, before: null, source: "entry" as const, id: row.id };
    });
  }

  //  نسبةُ المستشفى: صفُّ مصروفٍ واحدٍ لليوم والدفتر — يُحدَّث ولا يتكرّر، وقيدُه يُعكَس ويُعاد كتعديل المصروف.
  const result = await db.transaction(async (tx) => {
    await lockDay(tx, p.branchId, p.book, p.day);
    const [cur] = await tx.select().from(expenses).where(and(
      eq(expenses.branchId, p.branchId), eq(expenses.expenseDate, p.day), eq(expenses.category, HOSPITAL_RATIO_CATEGORY),
      eq(expenses.section, BOOK_EXPENSE_SECTION[p.book])));
    const description = `نسبة المستشفى ${pct}٪ من وارد اليوم`;
    if (cur) {
      const [row] = await tx.update(expenses).set({ amount, description }).where(eq(expenses.id, cur.id)).returning();
      return { row, before: cur.amount as number | null, updated: true };
    }
    const [row] = await tx.insert(expenses).values({
      branchId: p.branchId, category: HOSPITAL_RATIO_CATEGORY, section: BOOK_EXPENSE_SECTION[p.book],
      description, amount, expenseDate: p.day, paymentMethod: "نقدي",
      createdBy: p.userId === null ? "unknown" : String(p.userId),
    }).returning();
    return { row, before: null, updated: false };
  });
  if (result.updated) await reverseJournalForSource("expense", result.row.id, p.userId, "تحديث نسبة المستشفى");
  await createJournalForExpense(result.row, p.userId);
  return { amount, before: result.before, source: "expense", id: result.row.id };
}

export async function getEntry(id: number) {
  const [e] = await db.select().from(cashBookEntries).where(and(eq(cashBookEntries.id, id), sql`${cashBookEntries.deletedAt} IS NULL`));
  return e ?? null;
}

export async function updateEntry(id: number, patch: { amount?: number; note?: string | null }) {
  const [row] = await db.update(cashBookEntries).set({ ...patch, updatedAt: new Date() })
    .where(and(eq(cashBookEntries.id, id), sql`${cashBookEntries.deletedAt} IS NULL`)).returning();
  return row ?? null;
}

/** حذفٌ ناعم — الصفُّ يبقى للتدقيق بختمه ومَن حذفه. */
export async function deleteEntry(id: number, userId: number | null) {
  const [row] = await db.update(cashBookEntries).set({ deletedAt: new Date(), deletedBy: userId, updatedAt: new Date() })
    .where(and(eq(cashBookEntries.id, id), sql`${cashBookEntries.deletedAt} IS NULL`)).returning();
  return row ?? null;
}

export async function updateExpenseRow(id: number, patch: { amount?: number; description?: string | null; category?: string }, userId: number | null) {
  const [row] = await db.update(expenses).set(patch).where(eq(expenses.id, id)).returning();
  if (!row) return null;
  await reverseJournalForSource("expense", id, userId, "تعديل المصروف من دفتر القاصة");
  await createJournalForExpense(row, userId);
  return row;
}

export async function deleteExpenseRow(id: number, userId: number | null) {
  await reverseJournalForSource("expense", id, userId, "حذف المصروف من دفتر القاصة");
  await db.delete(expenses).where(eq(expenses.id, id));
}

/**
 * **نسبةُ الدكتور — مسحوباتُ المالك** في التقرير المحاسبيّ (قرارُ المالك ٢٠٢٦-١٠-٠٦): تُعرض سطراً مستقلّاً بنسبتها
 * (بغداد ٢٠٪، والباقي ١٠٪) **لا ضمن المصاريف** — فلا يُنقص ربحُ الفرع بمال المالك، ولا يلتبس على المدقّق.
 * الحسابُ نفسُه الذي في الدفتر: نسبةُ كلّ يومٍ من وارده (`autoDrRatioSum`)، لكلّ دفترٍ من دفاتر الفرع.
 */
export async function ownerDrawingsForPeriod(branchId: number | undefined, from: string, toInclusive: string) {
  const list = await db.select({ id: branches.id, name: branches.name }).from(branches)
    .where(branchId ? eq(branches.id, branchId) : sql`TRUE`).orderBy(branches.id);
  const next = addDays(toInclusive, 1);
  const byBranch: { branchId: number; name: string; pct: number; amount: number }[] = [];
  for (const b of list) {
    const cfg = branchCashConfig(b.name);
    if (!cfg.drRatioPct) continue;
    let amount = 0;
    for (const book of cfg.books) amount += await autoDrRatioSum(b.id, book, from, next);
    byBranch.push({ branchId: b.id, name: b.name, pct: cfg.drRatioPct, amount });
  }
  return { total: byBranch.reduce((s, b) => s + b.amount, 0), byBranch };
}

/**
 * **دفترُ فترةٍ كاملة** — للمدقّق في المساعد (§4.cd): ما بدأت به الفترة وما انتهت إليه، ومجاميعُها، والأيامُ التي نزل فيها
 * المتبقّي تحت الصفر، والأيامُ التي لا تطابق فيها «نسبة المستشفى» المسجَّلةُ ما يُحسب من وارد اليوم.
 * الحسابُ حسابُ `getSheet` نفسُه يوماً يوماً من الرصيد الافتتاحيّ: متبقّي اليوم = متبقّي أمس + الوارد − المصاريف − التحويل − نسبةُ الدكتور.
 */
export async function cashBookPeriod(branchId: number, book: CashBook, from: string, toInclusive: string) {
  const b = await branchConfigOf(branchId);
  if (!b || !b.config.books.includes(book)) return null;
  const cfg = b.config;
  const opening = await getOpening(branchId, book);
  const base = { branchId, branchName: b.name, book, from, to: toInclusive };
  if (!opening) return { ...base, started: false as const };
  if (opening.openingDate > toInclusive) return { ...base, started: false as const, openingDate: opening.openingDate };
  const first = opening.openingDate;
  const next = addDays(toInclusive, 1);

  const income = await dailyIncome(branchId, cfg, book, first, next);
  const otherIncome = new Map<string, number>();
  const exp = new Map<string, number>();
  const hospital = new Map<string, number>();
  const transfer = new Map<string, number>();
  const received = new Map<string, number>();
  const add = (m: Map<string, number>, d: string, n: number) => m.set(d, (m.get(d) ?? 0) + n);
  const expRows = await db.select({ day: expenses.expenseDate, amount: expenses.amount, category: expenses.category }).from(expenses)
    .where(and(eq(expenses.branchId, branchId), sql`${expenses.expenseDate} >= ${first}`, sql`${expenses.expenseDate} < ${next}`,
      expenseBookFilter(cfg, book)));
  for (const e of expRows) {
    add(exp, String(e.day), e.amount);
    if (e.category === HOSPITAL_RATIO_CATEGORY) add(hospital, String(e.day), e.amount);
  }
  const entRows = await db.select({ day: cashBookEntries.entryDate, kind: cashBookEntries.kind, amount: cashBookEntries.amount }).from(cashBookEntries)
    .where(and(eq(cashBookEntries.branchId, branchId), eq(cashBookEntries.book, book), sql`${cashBookEntries.deletedAt} IS NULL`,
      sql`${cashBookEntries.entryDate} >= ${first}`, sql`${cashBookEntries.entryDate} < ${next}`));
  for (const e of entRows) {
    if (e.kind === "dr_transfer") add(transfer, String(e.day), e.amount);
    else if (e.kind === "ratio_received") add(received, String(e.day), e.amount);
    else if (e.kind === "income_other") add(otherIncome, String(e.day), e.amount);
  }

  let cash = opening.cashBalance;
  let ratio = opening.ratioBalance;
  let startCash = cash, startRatio = ratio;
  const period = { income: 0, otherIncome: 0, expenses: 0, drTransfers: 0, drRatio: 0, ratioReceived: 0 };
  const negativeDays: { date: string; remaining: number }[] = [];
  const hospitalMismatches: { date: string; expected: number; recorded: number }[] = [];
  let lowest: { date: string; remaining: number } | null = null;
  for (let d = first; d <= toInclusive; d = addDays(d, 1)) {
    if (d === from) { startCash = cash; startRatio = ratio; }
    const inc = income.get(d) ?? 0;
    const dr = ratioAmount(inc, cfg.drRatioPct);
    cash = cash + inc - (exp.get(d) ?? 0) - (transfer.get(d) ?? 0) - dr;
    ratio = ratio + dr - (received.get(d) ?? 0);
    if (d < from) continue;
    period.income += inc; period.otherIncome += otherIncome.get(d) ?? 0; period.expenses += exp.get(d) ?? 0;
    period.drTransfers += transfer.get(d) ?? 0; period.drRatio += dr; period.ratioReceived += received.get(d) ?? 0;
    if (cash < 0) negativeDays.push({ date: d, remaining: cash });
    if (!lowest || cash < lowest.remaining) lowest = { date: d, remaining: cash };
    if (cfg.hospitalRatioPct) {
      const expected = ratioAmount(inc, cfg.hospitalRatioPct);
      const recorded = hospital.get(d) ?? 0;
      if (expected !== recorded) hospitalMismatches.push({ date: d, expected, recorded });
    }
  }
  //  فترةٌ تبدأ قبل الافتتاح: ما قبله ليس في الدفتر، فرصيدُ البداية هو الافتتاحيّ.
  if (from < first) { startCash = opening.cashBalance; startRatio = opening.ratioBalance; }
  return {
    ...base, started: true as const,
    opening: { date: opening.openingDate, cash: opening.cashBalance, ratio: opening.ratioBalance },
    coveredFrom: from < first ? first : from,
    startRemaining: startCash, endRemaining: cash,
    startRatioBalance: startRatio, endRatioBalance: ratio,
    period, negativeDays, lowest, drRatioPct: cfg.drRatioPct, hospitalRatioPct: cfg.hospitalRatioPct, hospitalMismatches,
  };
}
