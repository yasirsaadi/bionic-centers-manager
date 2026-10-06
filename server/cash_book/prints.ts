// **طباعةُ ورقة الدفتر** (ترحيل ١٠١، §4.ca تكملة) — البصمةُ وسجلُّ الطباعة.
//
// البصمةُ تُحسب ممّا تطبعه الورقةُ وحدَه: السطور (مصدرُها ومبلغُها وعمودُها وملاحظتُها)، والمجاميع، ومربّعُ النسبة، والرصيدُ الافتتاحيّ،
// وسطورُ «صُرف من قاصة الدكتور». فأيُّ تغييرٍ يغيّر الورقةَ المطبوعة — ومنه تغييرُ يومٍ سابق يغيّر «الباقي من أمس» — يغيّر البصمة.

import { createHash } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { cashBookPrints } from "@shared/schema";
import type { CashBook } from "@shared/cash_book";

export function sheetFingerprint(sheet: any, drBoxLines: { id: number; category: string }[]): string {
  const printed = {
    branch: sheet.branch?.id, book: sheet.book, day: sheet.day,
    opening: sheet.opening ?? null,
    rows: (sheet.rows ?? []).map((r: any) => [r.source, r.id, r.column, r.amount, r.note, r.category ?? null]),
    totals: sheet.totals,
    ratio: sheet.ratio ? [sheet.ratio.today, sheet.ratio.prev, sheet.ratio.received, sheet.ratio.remaining] : null,
    drBox: drBoxLines.map((l) => [l.id, l.category]),
  };
  return createHash("sha1").update(JSON.stringify(printed)).digest("hex");
}

export async function lastPrint(branchId: number, book: CashBook, day: string) {
  const [row] = await db.select().from(cashBookPrints)
    .where(and(eq(cashBookPrints.branchId, branchId), eq(cashBookPrints.book, book), eq(cashBookPrints.day, day)))
    .orderBy(desc(cashBookPrints.printedAt), desc(cashBookPrints.id)).limit(1);
  return row ?? null;
}

export async function recordPrint(p: { branchId: number; book: CashBook; day: string; fingerprint: string; userId: number | null; userName: string | null }) {
  const [row] = await db.insert(cashBookPrints).values({
    branchId: p.branchId, book: p.book, day: p.day, fingerprint: p.fingerprint, printedBy: p.userId, printedByName: p.userName,
  }).returning();
  return row;
}
