// **طلبُ تصحيح المال** (ترحيل ١٠٢، §4.ce) — طبقةُ البيانات.
//
// قرارُ المالك ٢٠٢٦-١٠-٠٧: تعديلُ المصروف وحذفُه، وتعديلُ سطر دفتر القاصة وحذفُه، **للمسؤول وحده، أو بطلبِ تعديلٍ يوافق عليه**.
// فالموظّفُ يقدّم الطلب بالقيمة الجديدة وسببها، والمسؤولُ يعتمده — فيُطبَّق بالدوالّ نفسِها التي يعدّل بها يدوياً (القيدُ المحاسبيّ يُعكَس
// ويُعاد) — أو يرفضه. وما تغيّر بعد الطلب لا يُطبَّق عليه طلبٌ قديم: يُرفَض الاعتمادُ ويُطلب طلبٌ جديد.

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { branches, moneyCorrectionRequests, type Expense } from "@shared/schema";
import { storage } from "../storage";
import * as cashStore from "../cash_book/store";

export type TargetType = "expense" | "cash_book_entry";
export type CorrectionAction = "update" | "delete";

export class CorrectionError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** الحقولُ التي يمسّها الطلب — ولقطتُها تكشف التقادم عند الاعتماد. */
export interface Snapshot { amount: number; note: string | null; category: string | null; date: string; kind?: string }

export function expenseSnapshot(x: Expense): Snapshot {
  return { amount: x.amount, note: x.description ?? null, category: x.category, date: String(x.expenseDate) };
}
export function entrySnapshot(e: { amount: number; note: string | null; entryDate: string; kind: string }): Snapshot {
  return { amount: e.amount, note: e.note ?? null, category: null, date: String(e.entryDate), kind: e.kind };
}
const sameSnapshot = (a: Snapshot, b: Snapshot) =>
  a.amount === b.amount && (a.note ?? null) === (b.note ?? null) && (a.category ?? null) === (b.category ?? null) && a.date === b.date;

/** الهدفُ كما هو الآن — أو `null` إن حُذف. */
export async function loadTarget(type: TargetType, id: number) {
  if (type === "expense") {
    const x = await storage.getExpense(id);
    return x ? { branchId: x.branchId, snapshot: expenseSnapshot(x), expense: x, entry: null as any } : null;
  }
  const e = await cashStore.getEntry(id);
  return e ? { branchId: e.branchId, snapshot: entrySnapshot(e), expense: null as any, entry: e } : null;
}

export async function createRequest(p: {
  targetType: TargetType; targetId: number; branchId: number; action: CorrectionAction; snapshot: Snapshot;
  patch: Record<string, unknown> | null; reason: string; userId: number | null; userName: string | null;
}) {
  try {
    const [row] = await db.insert(moneyCorrectionRequests).values({
      targetType: p.targetType, targetId: p.targetId, branchId: p.branchId, action: p.action,
      beforeSnapshot: p.snapshot, requestedPatch: p.patch, reason: p.reason,
      requestedBy: p.userId, requestedByName: p.userName,
    }).returning();
    return row;
  } catch (e: any) {
    if (e?.code === "23505") throw new CorrectionError(409, "على هذا السطر طلبُ تصحيحٍ معلَّق — انتظر قرارَ المسؤول");
    throw e;
  }
}

export async function getRequest(id: number) {
  const [r] = await db.select().from(moneyCorrectionRequests).where(eq(moneyCorrectionRequests.id, id));
  return r ?? null;
}

export async function listRequests(p: { status: string | null; branchId: number | null; requestedBy: number | null; limit: number }) {
  const conds: any[] = [];
  if (p.status) conds.push(eq(moneyCorrectionRequests.status, p.status));
  if (p.branchId) conds.push(eq(moneyCorrectionRequests.branchId, p.branchId));
  if (p.requestedBy != null) conds.push(eq(moneyCorrectionRequests.requestedBy, p.requestedBy));
  return db.select({ r: moneyCorrectionRequests, branchName: branches.name }).from(moneyCorrectionRequests)
    .innerJoin(branches, eq(branches.id, moneyCorrectionRequests.branchId))
    .where(conds.length ? and(...conds) : sql`TRUE`)
    .orderBy(desc(moneyCorrectionRequests.requestedAt)).limit(p.limit);
}

/** الأهدافُ التي عليها طلبٌ معلَّق — لوسم السطر في الدفتر وفي جدول المصاريف. */
export async function pendingTargets(branchId: number | null) {
  const rows = await db.select({ t: moneyCorrectionRequests.targetType, id: moneyCorrectionRequests.targetId })
    .from(moneyCorrectionRequests)
    .where(and(eq(moneyCorrectionRequests.status, "pending"), branchId ? eq(moneyCorrectionRequests.branchId, branchId) : sql`TRUE`));
  return rows.map((r) => `${r.t}:${r.id}`);
}

export async function pendingCount(branchId: number | null) {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(moneyCorrectionRequests)
    .where(and(eq(moneyCorrectionRequests.status, "pending"), branchId ? eq(moneyCorrectionRequests.branchId, branchId) : sql`TRUE`));
  return Number(r?.n ?? 0);
}

/** يحجز الطلبَ المعلَّق لقرارٍ واحد — ضغطتان متزامنتان لا تطبّقانه مرّتين. */
export async function claim(id: number, status: "approved" | "rejected", by: number | null, byName: string | null, note: string | null) {
  const [r] = await db.update(moneyCorrectionRequests)
    .set({ status, decidedBy: by, decidedByName: byName, decidedAt: new Date(), decisionNote: note })
    .where(and(eq(moneyCorrectionRequests.id, id), eq(moneyCorrectionRequests.status, "pending"))).returning();
  return r ?? null;
}
async function unclaim(id: number) {
  await db.update(moneyCorrectionRequests)
    .set({ status: "pending", decidedBy: null, decidedByName: null, decidedAt: null, decisionNote: null })
    .where(eq(moneyCorrectionRequests.id, id));
}

export async function reject(id: number, by: number | null, byName: string | null, note: string | null) {
  const r = await claim(id, "rejected", by, byName, note);
  if (!r) throw new CorrectionError(409, "الطلب ليس معلَّقاً");
  return r;
}

/**
 * **الاعتماد = التطبيق** بالدوالّ التي يعدّل بها المسؤولُ يدوياً، بعد التأكّد أن الهدف لم يتغيّر منذ الطلب.
 * يُرجع ما قبل التطبيق وبعده لسطر التدقيق.
 */
export async function approve(id: number, by: number | null, byName: string | null, note: string | null) {
  const req = await getRequest(id);
  if (!req || req.status !== "pending") throw new CorrectionError(409, "الطلب ليس معلَّقاً");
  const target = await loadTarget(req.targetType as TargetType, req.targetId);
  if (!target) throw new CorrectionError(409, "السطرُ لم يعد موجوداً — ارفض الطلب");
  if (!sameSnapshot(target.snapshot, req.beforeSnapshot as Snapshot)) {
    throw new CorrectionError(409, "تغيّر السطرُ بعد الطلب — ارفضه، ويقدّم الموظّفُ طلباً جديداً على قيمته الحالية");
  }
  const claimed = await claim(id, "approved", by, byName, note);
  if (!claimed) throw new CorrectionError(409, "الطلب ليس معلَّقاً");
  try {
    const patch = (req.requestedPatch ?? {}) as { amount?: number; note?: string | null; category?: string };
    let after: unknown = null;
    if (req.targetType === "expense") {
      if (req.action === "delete") await cashStore.deleteExpenseRow(req.targetId, by);
      else {
        const nextCategory = patch.category ?? target.expense.category;
        after = await cashStore.updateExpenseRow(req.targetId, {
          ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
          ...(patch.note !== undefined ? { description: patch.note, ...(nextCategory === "other" ? { subcategory: patch.note } : {}) } : {}),
          ...(patch.category ? { category: patch.category } : {}),
        }, by);
      }
    } else if (req.action === "delete") after = await cashStore.deleteEntry(req.targetId, by);
    else {
      after = await cashStore.updateEntry(req.targetId, {
        ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
        ...(patch.note !== undefined ? { note: patch.note } : {}),
      });
    }
    return { request: claimed, before: target.expense ?? target.entry, after };
  } catch (e) {
    await unclaim(id);
    throw e;
  }
}
