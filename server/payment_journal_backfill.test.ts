// استدراكُ قيود الدفعات القديمة (§4.ar البند ٥) — قاعدةٌ محلّية فارغة:
// `npm run test:payment-journal-backfill`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (أ) الدفعةُ الناقصة يُكتب قيدُها بتاريخها وبحساب إيرادها الصحيح، وبرقم `JB-…`.
// (ب) ما له قيدٌ قائم، والمجّانيّة، ودفعةُ الفاتورة — لا تُمَسّ.
// (ج) مريضُ السلّة يُستدرَك بقسمه لا بـ«إيرادات أخرى».
// (د) فرعٌ بلا صندوق ⟵ تُسجَّل الدفعةُ متعذّرةً بسببها ولا يُكتب شيء.
// (هـ) دفعةٌ بعد اللقطة لا تُمَسّ — يكتب بابُها قيدَها.
// (و) مرّةٌ واحدة، وتشغيلان معاً لا يعملان معاً، والترقيمُ الحيّ لا يتأثّر.

import { pool } from "./db";
import { backfillPaymentJournals, PAYMENT_JOURNAL_BACKFILL_GUARD } from "./accounting/payment_journal_backfill";
import { createJournalForPayment } from "./accounting/auto_journal";

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

async function mkPatient(name: string, flags: { amputee?: boolean; physio?: boolean }, branch = 1,
  trashed = false): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id,
       is_amputee, is_physiotherapy, total_cost)
     VALUES ($1,'07700000000','test','40','x',$2,$3,$4,0) RETURNING id`,
    [name, branch, !!flags.amputee, !!flags.physio]);
  if (trashed) {
    await pool.query(
      `UPDATE patients SET deleted_at = NOW(), deleted_total_cost = 0, deleted_total_paid = 0,
         deleted_remaining = 0, deleted_needed_admin = false, deleted_reason = 'اختبار',
         restore_until = NOW() + interval '30 days',
         deleted_pending_json = '{"pendingCharges":[],"pendingDiscounts":[],"pendingPriceRequests":[],"openFollowups":[],"openSettlements":[]}'
       WHERE id = $1`, [rows[0].id]);
  }
  return rows[0].id;
}

async function mkPayment(patientId: number, amount: number, date: string, extra: {
  type?: string | null; notes?: string; free?: boolean; invoiceId?: number | null; branch?: number;
} = {}): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO payments (patient_id, branch_id, amount, date, notes, payment_treatment_type,
       is_free_sessions, invoice_id)
     VALUES ($1,$2,$3,$4::timestamp,$5,$6,$7,$8) RETURNING id`,
    [patientId, extra.branch ?? 1, amount, date, extra.notes ?? null, extra.type ?? null,
     !!extra.free, extra.invoiceId ?? null]);
  return rows[0].id;
}

async function journalsOf(paymentId: number) {
  const { rows } = await pool.query(
    `SELECT e.entry_number, e.entry_date::text AS d, e.status,
            (SELECT a.account_code FROM journal_lines l JOIN chart_of_accounts a ON a.id = l.account_id
              WHERE l.entry_id = e.id AND l.credit > 0) AS rev,
            (SELECT SUM(l.debit)::int FROM journal_lines l WHERE l.entry_id = e.id) AS debit,
            (SELECT SUM(l.credit)::int FROM journal_lines l WHERE l.entry_id = e.id) AS credit
       FROM journal_entries e
      WHERE e.source_type = 'payment' AND e.source_id = $1 ORDER BY e.id`, [paymentId]);
  return rows;
}

async function main() {
  await pool.query(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'فرع بلا صندوق') ON CONFLICT DO NOTHING`);
  await pool.query(`INSERT INTO chart_of_accounts (account_code, account_name_ar, account_type,
      branch_id, is_active, normal_balance)
    VALUES ('1111','صندوق بغداد','asset',1,true,'debit') ON CONFLICT DO NOTHING`);
  for (const code of ["4100", "4200", "4300", "4900"]) {
    await pool.query(`INSERT INTO chart_of_accounts (account_code, account_name_ar, account_type,
        branch_id, is_active, normal_balance)
      VALUES ($1,'إيراد '||$1,'revenue',NULL,true,'credit') ON CONFLICT DO NOTHING`, [code]);
  }

  const physio = await mkPatient("علاج طبيعي", { physio: true });
  const amp = await mkPatient("أطراف", { amputee: true });
  const trashed = await mkPatient("في السلّة", { physio: true }, 1, true);
  const br2 = await mkPatient("فرع ٢", { physio: true }, 2);

  // (أ) ناقصتان من «خدمة جديدة» في الشهر نفسِه، وثالثةٌ من بابٍ آخر بلا نوع.
  const a1 = await mkPayment(physio, 50000, "2026-03-10 10:00", { type: "علاج طبيعي", notes: "جلسات علاج إضافية (٥)" });
  const a2 = await mkPayment(physio, 20000, "2026-03-20 10:00", { type: "علاج طبيعي", notes: "استشارة طبية" });
  const b1 = await mkPayment(amp, 700000, "2026-05-02 10:00", { type: null, notes: "دفعة" });
  // (ب) لها قيدٌ قائم · مجّانيّة · مرتبطةٌ بفاتورة.
  const hasJ = await mkPayment(physio, 30000, "2026-03-15 10:00", { type: "علاج طبيعي" });
  await createJournalForPayment((await pool.query(`SELECT * FROM payments WHERE id=$1`, [hasJ])).rows
    .map((r: any) => ({ ...r, id: r.id, amount: r.amount, branchId: r.branch_id, patientId: r.patient_id,
      date: r.date, notes: r.notes, paymentTreatmentType: r.payment_treatment_type }))[0] as any, null);
  const free = await mkPayment(physio, 0, "2026-03-16 10:00", { free: true });
  const inv = await mkPayment(physio, 40000, "2026-03-17 10:00", { invoiceId: 999999 });
  // مالٌ عُكس قيدُه ولم يُعَد — الدفترُ يقول رُدّ والدفعةُ تقول قُبض.
  const rev = await mkPayment(physio, 15000, "2026-04-01 10:00", { type: "علاج طبيعي" });
  await pool.query(
    `INSERT INTO journal_entries (entry_number, entry_date, branch_id, description, source_type, source_id,
       total_amount, status) VALUES ('JE-202604-9999','2026-04-01',1,'معكوس','payment',$1,15000,'reversed')`, [rev]);
  // (ج) مريضُ السلّة بلا نوعٍ على الدفعة.
  const tr = await mkPayment(trashed, 60000, "2026-06-01 10:00", { type: null });
  // (د) فرعٌ بلا صندوق.
  const f2 = await mkPayment(br2, 90000, "2026-06-05 10:00", { type: "علاج طبيعي", branch: 2 });

  const jeBefore = (await pool.query(`SELECT COUNT(*)::int AS n FROM journal_entries WHERE entry_number LIKE 'JE-%'`)).rows[0].n;

  // (هـ) و(و): تشغيلان معاً — واحدٌ يعمل والآخر مقفول — ودفعةٌ تُكتب أثناء المهلة.
  const run1 = backfillPaymentJournals({ delayMs: 1500 });
  await new Promise((r) => setTimeout(r, 300));
  const run2 = await backfillPaymentJournals({ delayMs: 0 });
  same("(و) تشغيلٌ ثانٍ متزامن لا يعمل", run2.status, "locked");
  const late = await mkPayment(physio, 11000, "2026-09-27 10:00", { type: "علاج طبيعي" });
  const out = await run1;

  same("النتيجة: مرشّحون · مكتوب · متعذّر", [out.status, out.candidates, out.written, out.failed.length],
    ["done", 6, 5, 1]);
  same("المجموعُ المكتوب", out.writtenAmount, 50000 + 20000 + 700000 + 15000 + 60000);

  const ja1 = await journalsOf(a1);
  same("(أ) قيدُ الدفعة الأولى: رقمٌ خاصّ · تاريخُها · 4100 · متوازن",
    ja1.map((r: any) => [r.entry_number, r.d, r.status, r.rev, r.debit, r.credit]),
    [["JB-202603-0001", "2026-03-10", "posted", "4100", 50000, 50000]]);
  same("(أ) الثانيةُ في الشهر نفسِه ⟵ 0002", (await journalsOf(a2)).map((r: any) => r.entry_number), ["JB-202603-0002"]);
  same("(أ) بابٌ آخر بلا نوع ⟵ من أعلام المريض 4200",
    (await journalsOf(b1)).map((r: any) => [r.entry_number, r.rev, r.debit]), [["JB-202605-0001", "4200", 700000]]);
  same("(ب) ما له قيدٌ قائم — قيدٌ واحد لا اثنان", (await journalsOf(hasJ)).length, 1);
  same("(ب) المجّانيّة — لا قيد", (await journalsOf(free)).length, 0);
  same("(ب) دفعةُ الفاتورة — لا قيد", (await journalsOf(inv)).length, 0);
  same("المعكوسُ بلا إعادة ⟵ قيدٌ جديد بجانبه",
    (await journalsOf(rev)).map((r: any) => [r.status, r.entry_number]),
    [["reversed", "JE-202604-9999"], ["posted", "JB-202604-0001"]]);
  same("(ج) مريضُ السلّة ⟵ 4100 لا 4900", (await journalsOf(tr)).map((r: any) => r.rev), ["4100"]);
  same("(د) فرعٌ بلا صندوق ⟵ لا قيد", (await journalsOf(f2)).length, 0);
  check(out.failed[0]?.paymentId === f2 && /cash account/.test(out.failed[0]?.reason ?? ""),
    "(د) ومسجَّلةٌ متعذّرةً بسببها", JSON.stringify(out.failed));
  same("(هـ) دفعةٌ بعد اللقطة لا تُمَسّ", (await journalsOf(late)).length, 0);

  const audit = (await pool.query(
    `SELECT new_values FROM audit_log WHERE action = 'backfill_payment_journals'`)).rows;
  same("سطرُ تدقيقٍ واحد بالأعداد والمتعذّر",
    audit.map((r: any) => typeof r.new_values === "string" ? JSON.parse(r.new_values) : r.new_values)
      .map((v: any) => [v.written, v.failedCount, v.failed?.[0]?.paymentId]),
    [[5, 1, f2]]);
  same("مسجَّلةٌ في `_migrations`",
    (await pool.query(`SELECT COUNT(*)::int AS n FROM _migrations WHERE name=$1`, [PAYMENT_JOURNAL_BACKFILL_GUARD])).rows[0].n, 1);

  const again = await backfillPaymentJournals({ delayMs: 0 });
  same("(و) مرّةٌ واحدة — التشغيلُ التالي لا يعمل", again.status, "already_applied");
  same("(و) ولا قيدَ زائد", (await pool.query(`SELECT COUNT(*)::int AS n FROM journal_entries WHERE entry_number LIKE 'JB-%'`)).rows[0].n, 5);

  same("(و) الترقيمُ الحيّ لم يتحرّك", (await pool.query(
    `SELECT COUNT(*)::int AS n FROM journal_entries WHERE entry_number LIKE 'JE-%'`)).rows[0].n, jeBefore);
  const liveP = (await pool.query(`SELECT * FROM payments WHERE id=$1`, [late])).rows[0];
  await createJournalForPayment({ id: liveP.id, amount: liveP.amount, branchId: liveP.branch_id,
    patientId: liveP.patient_id, date: liveP.date, notes: liveP.notes,
    paymentTreatmentType: liveP.payment_treatment_type } as any, null);
  same("(و) قيدٌ حيّ بعد الاستدراك يُكتب برقم JE", (await journalsOf(late)).map((r: any) => r.entry_number.slice(0, 3)), ["JE-"]);

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await pool.end().catch(() => {});
  process.exit(1);
});
