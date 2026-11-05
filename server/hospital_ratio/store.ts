// **نسبةُ مستشفى العين — العزلُ التلقائيّ والمربّع والتسليم** (ترحيل ١٩٢، §4.fz).
//
// • **العزلُ صفوفُ مصروفٍ قائمة** (`expenses.category = 'hospital_percentage'`): صفٌّ واحدٌ لكلّ يومٍ ودفترٍ من يوم البدء، يكتبه
//   `reconcileBranch` ويحدّثه ويحذفه وحده ليطابق سلسلةَ العزل (`hospitalSeries`) — فيدخل القاصةَ والمحاسبةَ والتقاريرَ كأيّ مصروف.
//   ويُنادى بعد كلّ كتابةٍ ناجحة (مجمَّعةً)، وعند فتح الدفتر، وكلَّ ليلة — فدفعةٌ تُضاف لماضٍ أو تُحذف أو تُصحَّح، أو مريضٌ يدخل السلّة،
//   أو قسمُ حالةٍ يتغيّر، كلُّها تُرى بلا زرّ.
// • **الاسترجاعُ المخصوم** عُشرُه ينقص نسبةَ يومه؛ والاسترجاعُ الذي قرّر المسؤولُ ألّا يُخصم (`patient_refund_requests.deduct_hospital = false`)
//   لا يُمسّ به العزل. وما زاد على نسبة يومه يُحمل على الغد (`carriedIn`).
// • **التسليمُ للمستشفى** (`hospital_ratio_deliveries`) لا يمسّ القاصةَ ولا المصاريف — المالُ خرج منها يومَ العزل — وينقص المربّعَ وحده.
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "../db";
import { payments, patients, patientCases, expenses, cashBookEntries, patientRefundRequests } from "@shared/schema";
import { activePatientDrizzle } from "../patients/active_patient";
import { baghdadDayBounds } from "../storage";
import { createJournalForExpense, reverseJournalForSource } from "../accounting/auto_journal";
import { BOOK_EXPENSE_SECTION, HOSPITAL_RATIO_CATEGORY, branchCashConfig, type BranchCashConfig, type CashBook } from "@shared/cash_book";
import {
  HOSPITAL_AUTO_START, hospitalAutoApplies, hospitalBox, hospitalSeries, type HospitalDayInput, type HospitalDayRow,
} from "@shared/hospital_ratio";
import { baghdadTodayYmd } from "@shared/visit_date";
import { addDays, branchConfigOf, lockDay, paymentBookFilter } from "../cash_book/store";

export class HospitalError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type Tx = { execute: (q: any) => Promise<any> };
async function rows<T = Record<string, any>>(ex: Tx, q: any): Promise<T[]> {
  const r = await ex.execute(q);
  return (r.rows ?? []) as T[];
}

/** يومُ بغداد لطابعٍ زمنيّ — كما يقسّم دفترُ القاصة دفعاتِه (`dailyIncome`). */
function baghdadDay(d: Date | string): string {
  return new Date(new Date(d).getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** فروعُ نسبة المستشفى — من الاسم كإعداد الدفتر نفسِه (ذي قار وحدها اليوم). */
export async function hospitalBranches(): Promise<{ id: number; name: string; config: BranchCashConfig }[]> {
  const all = await rows<{ id: number; name: string }>(db as any, sql`SELECT id, name FROM branches ORDER BY id`);
  return all.map((b) => ({ ...b, config: branchCashConfig(b.name) })).filter((b) => Boolean(b.config.hospitalRatioPct));
}

/**
 * **واردُ كلّ يومٍ من دفترٍ كما يحتاجه العزل** في [from, toInclusive]: الموجبُ (دفعاتٌ موجبة + «وارد آخر»)، والمسترجَعُ المخصوم موجباً
 * (كلُّ دفعةٍ سالبة، إلّا استرجاعاً قرّر المسؤولُ ألّا يُخصم). بالقواعد نفسِها التي يقرأ بها الدفترُ وارده: فرعُ الدفعة، وقسمُ حالتها،
 * ومريضٌ قائمٌ لا في السلّة.
 */
export async function dayInputs(branchId: number, cfg: BranchCashConfig, book: CashBook, from: string, toInclusive: string): Promise<HospitalDayInput[]> {
  const { start } = baghdadDayBounds(from);
  const { start: end } = baghdadDayBounds(addDays(toInclusive, 1));
  const map = new Map<string, HospitalDayInput>();
  const at = (d: string) => {
    let x = map.get(d);
    if (!x) { x = { day: d, positive: 0, deducted: 0 }; map.set(d, x); }
    return x;
  };
  const pays = await db.select({ amount: payments.amount, date: payments.date, deduct: patientRefundRequests.deductHospital })
    .from(payments)
    .innerJoin(patients, eq(patients.id, payments.patientId))
    .leftJoin(patientCases, eq(patientCases.id, payments.caseId))
    .leftJoin(patientRefundRequests, eq(patientRefundRequests.paymentId, payments.id))
    .where(and(eq(payments.branchId, branchId), gte(payments.date, start!), lt(payments.date, end!),
      activePatientDrizzle(), paymentBookFilter(cfg, book)));
  for (const p of pays) {
    if (!p.date) continue;
    const amount = Number(p.amount);
    const d = at(baghdadDay(p.date));
    if (amount > 0) d.positive += amount;
    else if (amount < 0 && p.deduct !== false) d.deducted += -amount;
  }
  const others = await db.select({ day: cashBookEntries.entryDate, amount: cashBookEntries.amount }).from(cashBookEntries)
    .where(and(eq(cashBookEntries.branchId, branchId), eq(cashBookEntries.book, book), eq(cashBookEntries.kind, "income_other"),
      sql`${cashBookEntries.deletedAt} IS NULL`,
      sql`${cashBookEntries.entryDate} >= ${from}`, sql`${cashBookEntries.entryDate} <= ${toInclusive}`));
  for (const o of others) if (o.amount > 0) at(String(o.day)).positive += o.amount;
  return Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day));
}

/** سلسلةُ العزل لدفترٍ من يوم البدء حتى يومٍ (شاملاً) — اليومُ المحسوب لا المكتوب. */
export async function seriesFor(branchId: number, cfg: BranchCashConfig, book: CashBook, toInclusive: string): Promise<HospitalDayRow[]> {
  if (!cfg.hospitalRatioPct || toInclusive < HOSPITAL_AUTO_START) return [];
  return hospitalSeries(await dayInputs(branchId, cfg, book, HOSPITAL_AUTO_START, toInclusive), cfg.hospitalRatioPct);
}

/**
 * **يطابق صفوفَ العزل المكتوبة سلسلتَها** لفرعٍ — يكتب الناقص، ويحدّث المختلف، ويحذف ما صار صفراً، لكلّ دفتر من يوم البدء حتى اليوم.
 * تحت قفلٍ للفرع (فلا يتسابق اثنان)، وقفلِ اليوم نفسِه الذي يأخذه الدفتر. وقيدُ كلّ صفٍّ تغيّر يُعكَس ويُعاد بعد المعاملة —
 * كما يفعل تحديثُ النسبة بالزرّ (`syncRatio`). ويُرجع عددَ ما تغيّر.
 */
export async function reconcileBranch(branchId: number, today: string = baghdadTodayYmd()): Promise<number> {
  const b = await branchConfigOf(branchId);
  if (!b?.config.hospitalRatioPct || today < HOSPITAL_AUTO_START) return 0;
  const cfg = b.config;
  const changed: { id: number; kind: "insert" | "update" | "delete" }[] = [];
  await db.transaction(async (tx: any) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`hospital_ratio:${branchId}`}))`);
    for (const book of cfg.books) {
      const section = BOOK_EXPENSE_SECTION[book];
      const series = hospitalSeries(await dayInputs(branchId, cfg, book, HOSPITAL_AUTO_START, today), cfg.hospitalRatioPct);
      const want = new Map(series.filter((r) => r.amount > 0).map((r) => [r.day, r.amount]));
      const have = await rows<{ id: number; day: string; amount: number }>(tx, sql`
        SELECT id, expense_date::text AS day, amount FROM expenses
         WHERE branch_id = ${branchId} AND category = ${HOSPITAL_RATIO_CATEGORY} AND section = ${section}
           AND expense_date >= ${HOSPITAL_AUTO_START} AND expense_date <= ${today}
         ORDER BY expense_date, id`);
      const byDay = new Map<string, { id: number; amount: number }[]>();
      for (const h of have) byDay.set(h.day, [...(byDay.get(h.day) ?? []), h]);
      const days = new Set<string>([...Array.from(want.keys()), ...Array.from(byDay.keys())]);
      for (const day of Array.from(days).sort()) {
        const amount = want.get(day) ?? 0;
        const cur = byDay.get(day) ?? [];
        const [first, ...extra] = cur;
        if (first && first.amount === amount && !extra.length) continue;
        await lockDay(tx, branchId, book, day);
        //  صفٌّ واحدٌ لليوم: ما زاد يُحذف (لم يكن يُكتب إلّا بزرٍّ قديم مرّتين).
        for (const x of extra) {
          await tx.execute(sql`DELETE FROM expenses WHERE id = ${x.id}`);
          changed.push({ id: x.id, kind: "delete" });
        }
        const description = `نسبة مستشفى العين ${cfg.hospitalRatioPct}٪ من وارد اليوم — تُعزل تلقائياً`;
        if (amount <= 0) {
          if (first) {
            await tx.execute(sql`DELETE FROM expenses WHERE id = ${first.id}`);
            changed.push({ id: first.id, kind: "delete" });
          }
          continue;
        }
        if (first && first.amount === amount) continue;
        if (first) {
          await tx.execute(sql`UPDATE expenses SET amount = ${amount}, description = ${description} WHERE id = ${first.id}`);
          changed.push({ id: first.id, kind: "update" });
        } else {
          const [ins] = await rows<{ id: number }>(tx, sql`
            INSERT INTO expenses (branch_id, category, section, description, amount, expense_date, payment_method, created_by)
            VALUES (${branchId}, ${HOSPITAL_RATIO_CATEGORY}, ${section}, ${description}, ${amount}, ${day}, 'نقدي', 'system')
            RETURNING id`);
          changed.push({ id: ins.id, kind: "insert" });
        }
      }
    }
  });
  //  القيدُ بعد المعاملة — كتحديث النسبة بالزرّ: يُعكَس القديم ويُكتب الجديد.
  for (const c of changed) {
    if (c.kind !== "insert") await reverseJournalForSource("expense", c.id, null, "تحديث نسبة مستشفى العين تلقائياً");
    if (c.kind === "delete") continue;
    const [row] = await db.select().from(expenses).where(eq(expenses.id, c.id));
    if (row) await createJournalForExpense(row as any, null);
  }
  return changed.length;
}

let running: Promise<number> | null = null;
let again = false;
/** **كلُّ فروع النسبة** — واحدٌ يجري في الوقت نفسِه، وطلبٌ أثناءه يُعيد الجولةَ بعدها مرّةً واحدة. لا يرمي أبداً، ويُرجع عددَ ما تغيّر. */
export function reconcileAll(): Promise<number> {
  if (running) { again = true; return running; }
  running = (async () => {
    let n = 0;
    try {
      do {
        again = false;
        for (const b of await hospitalBranches()) {
          try { n += await reconcileBranch(b.id); } catch (e) { console.error("[hospital-ratio] reconcile failed:", b.id, e); }
        }
      } while (again);
    } finally { running = null; }
    return n;
  })();
  return running;
}

/** ما عُزل في دفترٍ في مدى [from, toExclusive) من الصفوف المكتوبة. */
async function isolatedSum(branchId: number, from: string, toExclusive: string, section?: string): Promise<number> {
  if (from >= toExclusive) return 0;
  const [r] = await rows<{ t: number }>(db as any, sql`
    SELECT COALESCE(SUM(amount), 0)::int AS t FROM expenses
     WHERE branch_id = ${branchId} AND category = ${HOSPITAL_RATIO_CATEGORY}
       AND (${section ?? null}::text IS NULL OR section = ${section ?? null})
       AND expense_date >= ${from} AND expense_date < ${toExclusive}`);
  return Number(r?.t ?? 0);
}

async function deliveredSum(branchId: number, from: string, toExclusive: string): Promise<number> {
  if (from >= toExclusive) return 0;
  const [r] = await rows<{ t: number }>(db as any, sql`
    SELECT COALESCE(SUM(amount), 0)::int AS t FROM hospital_ratio_deliveries
     WHERE branch_id = ${branchId} AND status = 'approved' AND delivered_on >= ${from} AND delivered_on < ${toExclusive}`);
  return Number(r?.t ?? 0);
}

/** المتبقّي للمستشفى في نهاية يوم — كلُّ ما عُزل من البداية − كلُّ ما سُلّم. */
export async function remainingAt(branchId: number, dayInclusive: string): Promise<number> {
  const next = addDays(dayInclusive, 1);
  return (await isolatedSum(branchId, HOSPITAL_AUTO_START, next)) - (await deliveredSum(branchId, HOSPITAL_AUTO_START, next));
}

/**
 * **مربّعُ «نسبة مستشفى العين» ليوم** — للدفترين معاً (عزلُ العلاج وعزلُ الأطراف والمجموع)، والمتبقّي من أمس، وما سُلّم اليوم،
 * والمتبقّي. وتفصيلُ اليوم من السلسلة: خصمُ استرجاعٍ مخصوم، ومحمولٌ من أيّامٍ قبله. ويومٌ قبل البداية أو فرعٌ بلا نسبة: لا مربّع.
 */
export async function boxFor(branchId: number, day: string) {
  const b = await branchConfigOf(branchId);
  if (!b?.config.hospitalRatioPct || !hospitalAutoApplies(day)) return null;
  const cfg = b.config;
  const next = addDays(day, 1);
  const books = [];
  for (const book of cfg.books) {
    const section = BOOK_EXPENSE_SECTION[book];
    const s = (await seriesFor(branchId, cfg, book, day)).find((r) => r.day === day);
    books.push({
      book, amount: await isolatedSum(branchId, day, next, section),
      gross: s?.gross ?? 0, deduction: s?.deduction ?? 0, carriedIn: s?.carriedIn ?? 0, carriedOut: s?.carriedOut ?? 0,
    });
  }
  const todayIn = books.reduce((t, x) => t + x.amount, 0);
  const prev = (await isolatedSum(branchId, HOSPITAL_AUTO_START, day)) - (await deliveredSum(branchId, HOSPITAL_AUTO_START, day));
  const deliveries = await rows<{ id: number; amount: number; note: string | null; requestedByName: string | null; decidedByName: string | null; decidedAt: string | null }>(db as any, sql`
    SELECT id, amount, note, requested_by_name AS "requestedByName", decided_by_name AS "decidedByName", decided_at AS "decidedAt"
      FROM hospital_ratio_deliveries
     WHERE branch_id = ${branchId} AND status = 'approved' AND delivered_on = ${day} ORDER BY decided_at, id`);
  const box = hospitalBox(prev, todayIn, deliveries.reduce((t, x) => t + x.amount, 0));
  return {
    start: HOSPITAL_AUTO_START, pct: cfg.hospitalRatioPct, books, ...box, deliveries,
    deductionToday: books.reduce((t, x) => t + x.deduction, 0), carriedToday: books.reduce((t, x) => t + x.carriedIn, 0),
    deferred: books.reduce((t, x) => t + x.carriedOut, 0),
  };
}

/** سجلُّ التسليمات كلِّه (الأحدثُ أوّلاً) — ما يراه المحاسبُ والمديرُ حين يضغط المربّع. */
export async function deliveryHistory(branchId: number, limit = 200) {
  return await rows(db as any, sql`
    SELECT id, amount, note, status, delivered_on::text AS "deliveredOn", requested_by AS "requestedBy",
           requested_by_name AS "requestedByName", requested_at AS "requestedAt", decided_by_name AS "decidedByName",
           decided_at AS "decidedAt", decision_note AS "decisionNote", remaining_at_request AS "remainingAtRequest"
      FROM hospital_ratio_deliveries WHERE branch_id = ${branchId}
     ORDER BY requested_at DESC, id DESC LIMIT ${Math.min(Math.max(limit, 1), 500)}`);
}

// ══ طلباتُ التسليم ═══════════════════════════════════════════════════════════════════════════════
export interface DeliveryRow {
  id: number; branchId: number; amount: number; note: string | null; remainingAtRequest: number | null; status: string;
  requestedBy: number | null; requestedByName: string | null; requestedAt: string;
  decidedBy: number | null; decidedByName: string | null; decidedAt: string | null; decisionNote: string | null;
  deliveredOn: string | null; branchName?: string | null;
}
const SELECT_DELIVERY = sql`
  SELECT d.id, d.branch_id AS "branchId", d.amount, d.note, d.remaining_at_request AS "remainingAtRequest", d.status,
         d.requested_by AS "requestedBy", d.requested_by_name AS "requestedByName", d.requested_at AS "requestedAt",
         d.decided_by AS "decidedBy", d.decided_by_name AS "decidedByName", d.decided_at AS "decidedAt",
         d.decision_note AS "decisionNote", d.delivered_on::text AS "deliveredOn", b.name AS "branchName"
    FROM hospital_ratio_deliveries d LEFT JOIN branches b ON b.id = d.branch_id`;

export async function getDelivery(id: number): Promise<DeliveryRow | null> {
  return (await rows<DeliveryRow>(db as any, sql`${SELECT_DELIVERY} WHERE d.id = ${id}`))[0] ?? null;
}

export async function listDeliveries(p: { status?: string | null; branchId?: number | null; requestedBy?: number | null; limit?: number }) {
  return await rows<DeliveryRow>(db as any, sql`${SELECT_DELIVERY}
    WHERE (${p.status ?? null}::text IS NULL OR d.status = ${p.status ?? null})
      AND (${p.branchId ?? null}::int IS NULL OR d.branch_id = ${p.branchId ?? null})
      AND (${p.requestedBy ?? null}::int IS NULL OR d.requested_by = ${p.requestedBy ?? null})
    ORDER BY d.requested_at DESC, d.id DESC LIMIT ${Math.min(Math.max(p.limit ?? 200, 1), 500)}`);
}

export async function pendingDeliveries(branchId: number): Promise<{ count: number; total: number }> {
  const [r] = await rows<{ n: number; t: number }>(db as any, sql`
    SELECT COUNT(*)::int AS n, COALESCE(SUM(amount), 0)::int AS t FROM hospital_ratio_deliveries
     WHERE branch_id = ${branchId} AND status = 'pending'`);
  return { count: Number(r?.n ?? 0), total: Number(r?.t ?? 0) };
}

export async function pendingDeliveryCount(): Promise<number> {
  const [r] = await rows<{ n: number }>(db as any, sql`SELECT COUNT(*)::int AS n FROM hospital_ratio_deliveries WHERE status = 'pending'`);
  return Number(r?.n ?? 0);
}

/** قفلُ المربّع لفرعه — الطلبُ والاعتمادُ يتسلسلان عليه فلا يُسلَّم مرّتين ما عُزل مرّة. */
async function lockBox(tx: Tx, branchId: number) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`hospital_box:${branchId}`}))`);
}

export async function createDelivery(p: {
  branchId: number; amount: number; note: string | null; userId: number | null; userName: string | null; today: string;
}, after: (tx: Tx, row: DeliveryRow, remaining: number) => Promise<void>): Promise<DeliveryRow> {
  await reconcileBranch(p.branchId, p.today);
  return await db.transaction(async (tx: any) => {
    await lockBox(tx, p.branchId);
    const remaining = await remainingAt(p.branchId, p.today);
    const [pend] = await rows<{ t: number }>(tx, sql`
      SELECT COALESCE(SUM(amount), 0)::int AS t FROM hospital_ratio_deliveries WHERE branch_id = ${p.branchId} AND status = 'pending'`);
    const pendingTotal = Number(pend?.t ?? 0);
    if (p.amount > remaining - pendingTotal) {
      throw new HospitalError(409, pendingTotal > 0
        ? `المبلغ أكبر من المتبقّي للمستشفى بعد الطلبات المعلَّقة — المتاح الآن ${(remaining - pendingTotal).toLocaleString("en-US")}`
        : `المبلغ أكبر من المتبقّي للمستشفى (${remaining.toLocaleString("en-US")})`);
    }
    const [dup] = await rows<{ id: number }>(tx, sql`
      SELECT id FROM hospital_ratio_deliveries
       WHERE branch_id = ${p.branchId} AND status = 'pending' AND amount = ${p.amount}
         AND note IS NOT DISTINCT FROM ${p.note} AND requested_by IS NOT DISTINCT FROM ${p.userId}`);
    if (dup) throw new HospitalError(409, `طلبٌ بالمبلغ نفسِه معلَّقٌ قبلُ (رقم ${dup.id}) — بانتظار المسؤول`);
    const [ins] = await rows<{ id: number }>(tx, sql`
      INSERT INTO hospital_ratio_deliveries (branch_id, amount, note, remaining_at_request, requested_by, requested_by_name)
      VALUES (${p.branchId}, ${p.amount}, ${p.note}, ${remaining}, ${p.userId}, ${p.userName}) RETURNING id`);
    const row = (await rows<DeliveryRow>(tx, sql`${SELECT_DELIVERY} WHERE d.id = ${ins.id}`))[0];
    await after(tx, row, remaining);
    return row;
  });
}

/** **الاعتماد**: يُحجز الطلب، ويُعاد فحصُ المتبقّي تحت قفل المربّع، ويُكتب يومُ التسليم يومَ الاعتماد. */
export async function approveDelivery(id: number, p: { userId: number | null; userName: string | null; note: string | null; today: string },
  after: (tx: Tx, row: DeliveryRow, remainingBefore: number) => Promise<void>): Promise<DeliveryRow> {
  const cur = await getDelivery(id);
  if (!cur) throw new HospitalError(404, "الطلب غير موجود");
  if (cur.status !== "pending") throw new HospitalError(409, "حُسم هذا الطلبُ قبلُ");
  await reconcileBranch(cur.branchId, p.today);
  return await db.transaction(async (tx: any) => {
    await lockBox(tx, cur.branchId);
    //  المتبقّي قبل هذا التسليم — من المحفوظ تحت قفل المربّع، فلا يُعتمد طلبان معاً على ما يكفي أحدَهما.
    const remainingBefore = await remainingAt(cur.branchId, p.today);
    if (cur.amount > remainingBefore) {
      throw new HospitalError(409, `المبلغ أكبر من المتبقّي للمستشفى الآن (${remainingBefore.toLocaleString("en-US")}) — لم يتغيّر شيء`);
    }
    const claimed = await rows<{ id: number }>(tx, sql`
      UPDATE hospital_ratio_deliveries SET status = 'approved', decided_by = ${p.userId}, decided_by_name = ${p.userName},
             decided_at = now(), decision_note = ${p.note}, delivered_on = ${p.today}
       WHERE id = ${id} AND status = 'pending' RETURNING id`);
    if (!claimed.length) throw new HospitalError(409, "حُسم هذا الطلبُ قبلُ");
    const row = (await rows<DeliveryRow>(tx, sql`${SELECT_DELIVERY} WHERE d.id = ${id}`))[0];
    await after(tx, row, remainingBefore);
    return row;
  });
}

export async function rejectDelivery(id: number, p: { userId: number | null; userName: string | null; note: string },
  after: (tx: Tx, row: DeliveryRow) => Promise<void>): Promise<DeliveryRow> {
  return await db.transaction(async (tx: any) => {
    const claimed = await rows<{ id: number }>(tx, sql`
      UPDATE hospital_ratio_deliveries SET status = 'rejected', decided_by = ${p.userId}, decided_by_name = ${p.userName},
             decided_at = now(), decision_note = ${p.note}
       WHERE id = ${id} AND status = 'pending' RETURNING id`);
    if (!claimed.length) {
      const cur = await getDelivery(id);
      throw new HospitalError(cur ? 409 : 404, cur ? "حُسم هذا الطلبُ قبلُ" : "الطلب غير موجود");
    }
    const row = (await rows<DeliveryRow>(tx, sql`${SELECT_DELIVERY} WHERE d.id = ${id}`))[0];
    await after(tx, row);
    return row;
  });
}
