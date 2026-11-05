// **طباعةُ ورقة الدفتر** (ترحيل ١٠١، §4.ca تكملة) — البصمةُ وسجلُّ الطباعة.
//
// البصمةُ تُحسب ممّا تطبعه الورقةُ وحدَه: السطور (مصدرُها ومبلغُها وعمودُها وملاحظتُها)، والمجاميع، ومربّعُ النسبة، والرصيدُ الافتتاحيّ،
// وسطورُ «صُرف من قاصة الدكتور»، ومربّعا قاصة المواد وقاصة الرواتب والإيجار (§4.dj). فأيُّ تغييرٍ يغيّر الورقةَ المطبوعة — ومنه تغييرُ يومٍ سابق يغيّر «الباقي من أمس» — يغيّر البصمة.

import { createHash } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { cashBookPrints } from "@shared/schema";
import type { CashBook } from "@shared/cash_book";
import type { DrBoxLine } from "./dr_box";

export function sheetFingerprint(sheet: any, drBoxLines: DrBoxLine[]): string {
  const printed = {
    branch: sheet.branch?.id, book: sheet.book, day: sheet.day,
    opening: sheet.opening ?? null,
    rows: legacyRows(sheet.rows ?? []).map((r: any) => r.kind === "refund"
      ? [r.source, r.id, "income", -r.amount, r.legacyNote ?? r.note, r.category ?? null]
      : [r.source, r.id, r.column, r.amount, r.note, r.category ?? null]),
    //  **والاسترجاعُ في الصادر لا يغيّر البصمة** (§4.fz): السطورُ والمجاميعُ تُقرأ كما كانت والاسترجاعُ رقمٌ سالبٌ في الوارد —
    //  فورقةٌ طُبعت قبل الانتقال لا تُعلَّم «عُدّلت بعد الطباعة» وما تغيّر فيها شيء.
    totals: sheet.refundTotal ? { ...sheet.totals, income: sheet.totals.income - sheet.refundTotal, outflow: sheet.totals.outflow - sheet.refundTotal } : sheet.totals,
    ratio: sheet.ratio ? [sheet.ratio.today, sheet.ratio.prev, sheet.ratio.received, sheet.ratio.remaining] : null,
    //  ما صرفه المالكُ: رقمُه وبابُه كما كانت البصمة. **و«سحب من قاصة الدكتور» بمبلغه وملاحظته** (§4.cb تكملةٌ ثالثة) — الورقةُ تطبعهما.
    //  ولا يُضاف شيءٌ لسطر المالك، فورقةٌ طُبعت قبل اليوم لا تُعلَّم «عُدّلت بعد الطباعة».
    drBox: drBoxLines.map((l) => (l.amount !== undefined ? [l.id, l.category, l.amount, l.note ?? ""] : [l.id, l.category])),
    //  **مفتاحُ القاصتين لا يُضاف ليومٍ بلا قاصتين** — فبصمةُ ما طُبع قبل يوم القطع تبقى كما هي ولا تُعلَّم «عُدّلت بعد الطباعة».
    //  **ومربّعُ نسبة مستشفى العين** لا يُضاف ليومٍ بلا مربّع (§4.fz) — فبصمةُ ما طُبع قبله تبقى.
    ...(sheet.hospitalBox ? {
      hospital: [sheet.hospitalBox.books.map((b: any) => [b.book, b.amount]), sheet.hospitalBox.prev, sheet.hospitalBox.delivered, sheet.hospitalBox.remaining],
    } : {}),
    ...(sheet.reserves ? {
      reserves: ["materials", "payroll"].map((k) => {
        const r = sheet.reserves[k];
        return [r.today, r.prev, r.withdrawn, r.remaining, r.month ? [r.month.target, r.month.setAside] : null];
      }),
    } : {}),
  };
  return createHash("sha1").update(JSON.stringify(printed)).digest("hex");
}

/** السطورُ بترتيبها قبل انتقال الاسترجاع إلى الصادر: الدفعاتُ كلُّها أوّلاً بوقتها، ثمّ البقيّةُ كما هي. */
function legacyRows(rows: any[]): any[] {
  const pays = rows.filter((r) => r.source === "payment")
    .sort((a, b) => String(a.at ?? "").localeCompare(String(b.at ?? "")) || a.id - b.id);
  return [...pays, ...rows.filter((r) => r.source !== "payment")];
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
