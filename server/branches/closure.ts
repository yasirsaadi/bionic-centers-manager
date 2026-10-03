// **الفرعُ المغلقُ مؤقتاً** (ترحيل ٠٩٤، قرارُ المالك ٢٠٢٦-١٠-٠٣ — كركوك، §4.bw).
//
// يُقرأ في كلّ طلبٍ مصادَق (المِعترِضةُ الحيّة) وفي الدخول — فمخبَّأٌ دقيقةً، ويُمحى المخبَّأُ لحظةَ يغيّره المسؤول.
// **والقاعدةُ لغير المسؤول**: الفرعُ المغلق كأنه سُحب من حسابه — بقواعد السحب نفسِها (`applyFreshUser`): فرعٌ نشطٌ أُغلق ⟵
// أوّلُ فرعٍ مفتوحٍ له، ولا فرعَ مفتوحاً ⟵ تنتهي الجلسة. والمسؤولُ العامّ يرى الفرعَ ويبدّل إليه (يراجع تاريخه).
import { sql } from "drizzle-orm";
import { db } from "../db";

const TTL_MS = 60_000;
let cache: { at: number; ids: Set<number> } | null = null;

export async function closedBranchIds(): Promise<Set<number>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.ids;
  const r = await db.execute(sql`SELECT id FROM branches WHERE temporarily_closed = true`);
  const ids = new Set<number>(((r.rows ?? []) as any[]).map((x) => Number(x.id)));
  cache = { at: Date.now(), ids };
  return ids;
}

export function invalidateClosedBranches(): void {
  cache = null;
}

/** فروعُ الحساب المفتوحة — ما يبقى بعد إسقاط المغلق. */
export function openBranches(ids: number[], closed: ReadonlySet<number>): number[] {
  return ids.filter((id) => !closed.has(id));
}

export const BRANCH_CLOSED_MESSAGE = "هذا الفرع مغلق مؤقتاً";
