//  **استدراكُ قيود الدفعات القديمة** — تعمل مرّةً واحدة في الخلفية بعد الإقلاع.
//
//  ══ الواقعة (٢٠٢٦-٠٩-٢٧، §4.ar البند ٥) ════════════════════════════════
//  دفعاتُ «خدمة جديدة» كانت تُكتب ولا يُكتب قيدُها، وأُصلح البابُ في #423.
//  واستعلامُ المالك على الإنتاج وجد الباقيَ القديم: ٤٬٢٦٤ دفعةً من «خدمة
//  جديدة» (٢٣٧٬٦٠٧٬٥٠٠) و٧٠٢ من أبوابٍ أخرى (٣٨٠٬٦٢٧٬٠٠٠، آخرُها ٢٠٢٦-٠٧-٢١)
//  — كلُّها في لوحة التحكم وغائبةٌ عن قائمة الدخل وميزان المراجعة. وقرارُ
//  المالك: «استعمل الاثنان» — فتُصحَّح القديمةُ أيضاً.
//
//  ══ لماذا شيفرةٌ لا سكربتٌ يُلصَق ═════════════════════════════════════
//  القيدُ يُبنى بـ`createJournalForPaymentTx` نفسِها — خريطةُ أنواع العلاج
//  إلى حسابات الإيراد، واستنتاجُ القسم من أعلام المريض، وحسابُ صندوق الفرع.
//  نسخةٌ ثانيةٌ منها بلغة القاعدة كانت ستنحرف عن الأصل بصمت.
//
//  ══ ما يجعلها آمنة ═════════════════════════════════════════════════════
//  • **لا تُعدَّل دفعةٌ ولا يُمَسّ قيدٌ قائم** — إدراجُ قيودٍ جديدة فقط.
//  • **كلُّ دفعةٍ في معاملتها، ومقفلةٌ** (`FOR UPDATE`) — القفلُ نفسُه الذي
//    يأخذه تصحيحُ الدفعة أوّلاً، فلا يلتقيان على دفعةٍ واحدة. وتُعاد الشروطُ
//    كلُّها على الصفّ المقفل: قيدٌ كُتب في الأثناء ⟵ تُترك.
//  • **ترقيمٌ خاصّ** `JB-YYYYMM-NNNN`: الترقيمُ الحيّ يعدّ `JE-…` وحدها، فلا
//    يتزاحمان على رقمٍ واحد — ويُعرف كلُّ قيدٍ مستدرَكٍ من رقمه.
//  • **لقطةٌ ثمّ مهلة**: تُحصر في دفعاتٍ سبقت الإقلاع، ولا تبدأ قبل دقيقة —
//    فدفعةٌ حُفظت للتوّ يكتب بابُها قيدَها قبل أن تصلها.
//  • **مرّةً واحدة** (`_migrations`)، وقفلٌ استشاريّ يمنع تشغيلين معاً،
//    ومستأنِفة بطبعها: ما كُتب قيدُه لا يُختار ثانيةً.
//  • **سطرُ `audit_log` واحد** بالعدد والمجموع وكلِّ دفعةٍ تعذّرت وسببِها.

import { db, pool } from "../db";
import { payments } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { createJournalForPaymentTx } from "./auto_journal";
import { logAudit } from "./ledger";

export const PAYMENT_JOURNAL_BACKFILL_GUARD = "backfill_payment_journals_v1";
const LOCK_KEY = 8801; // pg_advisory_lock — لا يُستعمل رقمُه في مكانٍ آخر.
const MAX_LISTED_FAILURES = 200;

/** الشرطُ الواحد لـ«دفعةٍ بلا قيد» — هو شرطُ استعلام المالك، ومعه مريضُ السلّة. */
const MISSING_WHERE = `
      p.amount > 0
  AND COALESCE(p.is_free_sessions, false) = false
  AND p.invoice_id IS NULL
  AND NOT EXISTS (
        SELECT 1 FROM journal_entries e
         WHERE e.source_type = 'payment'
           AND e.source_id = p.id
           AND e.status = 'posted')
`;

export interface PaymentJournalBackfillResult {
  status: "done" | "already_applied" | "locked";
  candidates: number;
  written: number;
  writtenAmount: number;
  skipped: number;
  failed: Array<{ paymentId: number; reason: string }>;
}

async function nextBackfillNumber(tx: any, entryDate: string): Promise<string> {
  const [year, month] = entryDate.split("-");
  const r = await tx.execute(sql`
    SELECT COUNT(*)::int AS cnt FROM journal_entries
     WHERE entry_number LIKE ${`JB-${year}${month}-%`}
  `);
  const cnt = (r.rows?.[0] as any)?.cnt ?? 0;
  return `JB-${year}${month}-${String(cnt + 1).padStart(4, "0")}`;
}

function isoDate(d: Date | string | null | undefined): string {
  if (!d) return new Date().toISOString().split("T")[0];
  if (typeof d === "string") return d.split("T")[0];
  return d.toISOString().split("T")[0];
}

/** دفعةٌ واحدة في معاملتها: `written` · `skipped` (لم تعد ناقصة) · أو يُلقى الخطأ. */
async function backfillOne(paymentId: number): Promise<{ kind: "written" | "skipped"; amount: number }> {
  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(payments).where(eq(payments.id, paymentId)).for("update");
    if (!p) return { kind: "skipped" as const, amount: 0 };
    const still = await tx.execute(sql.raw(`
      SELECT 1 FROM payments p WHERE p.id = ${Number(paymentId)} AND ${MISSING_WHERE}`));
    if ((still.rows?.length ?? 0) === 0) return { kind: "skipped" as const, amount: 0 };
    const entryNumber = await nextBackfillNumber(tx, isoDate(p.date));
    await createJournalForPaymentTx(tx, p, null, { entryNumber, includeTrashedPatient: true });
    return { kind: "written" as const, amount: Number(p.amount) };
  });
}

export async function backfillPaymentJournals(opts: { delayMs?: number } = {}): Promise<PaymentJournalBackfillResult> {
  const result: PaymentJournalBackfillResult = {
    status: "done", candidates: 0, written: 0, writtenAmount: 0, skipped: 0, failed: [],
  };
  const lockClient = await pool.connect();
  try {
    const got = await lockClient.query("SELECT pg_try_advisory_lock($1) AS ok", [LOCK_KEY]);
    if (!got.rows[0]?.ok) return { ...result, status: "locked" };
    try {
      const done = await pool.query("SELECT 1 FROM _migrations WHERE name = $1 LIMIT 1", [PAYMENT_JOURNAL_BACKFILL_GUARD]);
      if ((done.rowCount ?? 0) > 0) return { ...result, status: "already_applied" };

      const snap = await pool.query<{ max: number | null }>("SELECT MAX(id)::int AS max FROM payments");
      const maxId = snap.rows[0]?.max ?? 0;
      const delay = opts.delayMs ?? 60_000;
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));

      const { rows } = await pool.query<{ id: number }>(
        `SELECT p.id FROM payments p WHERE p.id <= $1 AND ${MISSING_WHERE} ORDER BY p.id`, [maxId]);
      result.candidates = rows.length;
      console.log(`[backfill-journals] ${rows.length} payment(s) without a posted journal (id <= ${maxId})`);

      for (const r of rows) {
        try {
          const out = await backfillOne(r.id);
          if (out.kind === "written") { result.written++; result.writtenAmount += out.amount; }
          else result.skipped++;
        } catch (e: any) {
          result.failed.push({ paymentId: r.id, reason: String(e?.message ?? e).slice(0, 200) });
        }
      }

      await logAudit({
        entityType: "system",
        entityId: 0,
        action: "backfill_payment_journals",
        userName: "system",
        newValues: {
          guard: PAYMENT_JOURNAL_BACKFILL_GUARD,
          snapshotMaxPaymentId: maxId,
          candidates: result.candidates,
          written: result.written,
          writtenAmount: result.writtenAmount,
          skipped: result.skipped,
          failedCount: result.failed.length,
          failed: result.failed.slice(0, MAX_LISTED_FAILURES),
        },
        notes: "استدراكُ قيود الدفعات القديمة — §4.ar البند ٥",
      });
      await pool.query("INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
        [PAYMENT_JOURNAL_BACKFILL_GUARD]);
      console.log(`[backfill-journals] done: written ${result.written} (${result.writtenAmount}), `
        + `skipped ${result.skipped}, failed ${result.failed.length}`);
      return result;
    } finally {
      await lockClient.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]);
    }
  } finally {
    lockClient.release();
  }
}
