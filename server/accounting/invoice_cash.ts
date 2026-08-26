/**
 * **الكاتبُ القانونيُّ الواحد لكلّ مالٍ يلمس فاتورة.**
 *
 * ══ العطبُ الذي يغلقه هذا الملفّ ═══════════════════════════════════════════
 * كان في التطبيق طريقان للقبض على فاتورة، ولكلٍّ نصفُ الحقيقة:
 *
 *   `POST /api/invoices/:id/collect` — يكتب صفَّ دفعةٍ حقيقياً (`invoice_id`
 *   مربوط، فيراه «الوارد») ويحدّث الفاتورة، **لكنه كان يقيّد القيدَ الخطأ**:
 *   `createJournalForPayment` (مدين الصندوق / دائن الإيراد) — وهذا صحيحٌ
 *   لدفعةٍ عادية، لكنه **يكرّر الإيراد** على فاتورةٍ أصدرت إيرادَها بالفعل
 *   لحظةَ صدورها (مدين الذمم / دائن الإيراد، `createJournalForInvoice`).
 *
 *   `POST /api/invoices/:id/payment` — يقيّد القيدَ الصحيح
 *   (`createJournalForInvoicePayment`: مدين الصندوق / دائن الذمم) **لكنه لا
 *   يكتب صفَّ دفعةٍ إطلاقاً** — فالمالُ يظهر على الفاتورة وحدها ويغيب عن
 *   «الوارد» ومدفوعات المريض وقارئ الفرع، ولا يفحص الفرعَ ولا يمنع تجاوزَ
 *   المتبقّي بنفس صرامة الأول.
 *
 * فطريقٌ يملك الحقيقةَ التشغيلية (صفُّ الدفعة) بقيدٍ خطأ، وطريقٌ يملك القيدَ
 * الصحيح بلا حقيقةٍ تشغيلية. **الحلّ: كاتبٌ واحد يملك الاثنين معاً.**
 *
 * ══ الحقيقةُ الماليةُ المعتمَدة ═════════════════════════════════════════════
 * إصدارُ الفاتورة:  مدين الذمم المدينة (1130) / دائن الإيراد.
 * القبضُ عليها:      مدين الصندوق          / دائن الذمم المدينة (1130).
 * **ولا يُقيَّد الإيرادُ مرّتين لأجل فاتورةٍ واحدة.**
 *
 * ══ الذرّيةُ والقفل ═════════════════════════════════════════════════════════
 * `applyInvoiceCashTx` هي الكتابةُ الأساسية الوحيدة: صفُّ الدفعة + تحديثُ
 * الفاتورة + سطرُ التدقيق، **في معاملة المستدعي نفسِها** — تنجح الثلاثةُ معاً
 * أو تتراجع الثلاثةُ معاً. والقيدُ المحاسبيُّ المزدوج يبقى **خارج** هذه
 * المعاملة عمداً: عرفُ «الآمن للفشل» القائم في `auto_journal.ts`
 * (`createJournalEntry` يفتح مسبحَ اتّصالٍ خاصّاً به)، فالمستدعي يناديه بعد
 * الـCOMMIT.
 *
 * `collectInvoicePayment` — البابُ الوحيد للقبض على فاتورةٍ **قائمة**: يقفل
 * صفَّها (`FOR UPDATE`) قبل أيّ قراءةٍ للمتبقّي، فضغطتان متزامنتان تتسلسلان
 * ولا تتجاوزان معاً إجماليَّ الفاتورة أبداً.
 *
 * `createInvoiceWithCash` — إنشاءُ فاتورةٍ جديدة مع رصيدٍ سابق (اختياريّ)
 * ودفعةٍ فورية (اختياريّة) **كعمليةٍ واحدة متماسكة**: تُنشأ الفاتورةُ
 * وبنودُها، ويُطبَّق الرصيدُ السابق، ثمّ تُطبَّق الدفعةُ الفورية بنداءِ
 * `applyInvoiceCashTx` نفسِها — **لا كاتبَ مالٍ ثانٍ**. وإن تجاوزت الدفعةُ
 * الفوريةُ المتبقّي بعد الرصيد، **تتراجع العمليةُ كاملةً**: لا فاتورةَ ولا
 * بنودَ ولا رصيدَ مطبَّقاً — لا نصفَ فاتورةٍ معلَّقة.
 */

import { db } from "../db";
import { storage } from "../storage";
import { logAudit } from "./ledger";
import { sql } from "drizzle-orm";
import type { Invoice, InvoiceItem, Payment } from "@shared/schema";

export class InvoiceCashError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "InvoiceCashError";
    this.status = status;
  }
}

export type InvoiceCashActor = {
  userId: number | null;
  userName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/** ما يكفي من صفّ الفاتورة لحساب المتبقّي وكتابة الدفعة — لا الصفّ كاملاً. */
type LockedInvoice = {
  id: number;
  patientId: number;
  branchId: number;
  total: number;
  paidAmount: number;
  status: string | null;
  invoiceNumber: string | null;
};

/**
 * يقفل صفَّ الفاتورة (`FOR UPDATE`) — **نقطةُ التسلسل الوحيدة** لكلّ قبضٍ
 * عليها. ضغطتان متزامنتان على الفاتورة نفسِها: الثانيةُ تنتظر حتى تُنهي
 * الأولى معاملتَها (نجاحاً أو تراجعاً)، ثمّ تقرأ `paid_amount` **الفعليّ**
 * لا القيمةَ التي رأتها قبل الانتظار.
 */
async function lockInvoiceTx(tx: any, id: number): Promise<LockedInvoice | undefined> {
  const r = await tx.execute(sql`
    SELECT id, patient_id, branch_id, total, paid_amount, status, invoice_number
      FROM invoices WHERE id = ${id} FOR UPDATE
  `);
  const row = (r.rows ?? [])[0];
  if (!row) return undefined;
  return {
    id: Number(row.id),
    patientId: Number(row.patient_id),
    branchId: Number(row.branch_id),
    total: Number(row.total),
    paidAmount: Number(row.paid_amount ?? 0),
    status: row.status ?? null,
    invoiceNumber: row.invoice_number ?? null,
  };
}

/**
 * **الكتابةُ الأساسيةُ الوحيدة لكلّ قبضٍ نقديٍّ على فاتورة.**
 *
 * تفترض أن `invoice` قراءةٌ صادقةٌ للحظة الكتابة — إمّا مقفولةً بـ`FOR
 * UPDATE` (قبضٌ على فاتورةٍ قائمة، عبر `collectInvoicePayment`) أو صفّاً
 * أُنشئ للتوّ **داخل معاملة المستدعي نفسِها** فلا مزاحمَ يراه بعد
 * (`createInvoiceWithCash`).
 *
 * تكتب: صفَّ دفعةٍ حقيقياً (`invoice_id` مربوط، فيدخل «الوارد» ومدفوعات
 * المريض وقارئ الفرع فوراً) · تحديثَ `paid_amount`/`status` على الفاتورة ·
 * سطرَ تدقيقٍ يسمّي القديم والجديد ومعرّفَ الدفعة. **والقيدُ المحاسبيُّ
 * (مدين الصندوق / دائن الذمم) مسؤوليةُ المستدعي بعد الـCOMMIT** — عرفُ
 * «الآمن للفشل» في `auto_journal.ts`.
 */
export async function applyInvoiceCashTx(
  tx: any,
  invoice: LockedInvoice,
  amount: number,
  actor: InvoiceCashActor,
): Promise<{ invoice: Invoice; payment: Payment; previousPaid: number; newPaid: number }> {
  const roundedAmount = Math.round(Number(amount) || 0);
  if (!Number.isFinite(roundedAmount) || roundedAmount <= 0) {
    throw new InvoiceCashError("أدخل مبلغاً صحيحاً");
  }

  const previousPaid = invoice.paidAmount || 0;
  const remaining = invoice.total - previousPaid;
  if (roundedAmount > remaining) {
    throw new InvoiceCashError(
      `المبلغ أكبر من المتبقي على الفاتورة (${remaining.toLocaleString("en-US")} د.ع)`,
    );
  }

  const payment = await storage.createPayment(
    {
      patientId: invoice.patientId,
      branchId: invoice.branchId,
      amount: roundedAmount,
      notes: `قبض فاتورة رقم ${invoice.invoiceNumber ?? invoice.id}`,
      invoiceId: invoice.id,
    } as any,
    tx,
  );

  const newPaid = previousPaid + roundedAmount;
  const newStatus = newPaid >= invoice.total ? "paid" : "partial";
  const updated = await storage.updateInvoice(invoice.id, { paidAmount: newPaid, status: newStatus }, tx);
  if (!updated) {
    // لا يقع إلا إن حُذفت الفاتورةُ بين القفل وهذا السطر — مستحيلٌ عملياً
    // تحت `FOR UPDATE`، لكنّ الفشلَ الصريح أسلم من صفّ دفعةٍ بلا فاتورة.
    throw new InvoiceCashError("تعذّر تحديث الفاتورة", 500);
  }

  await logAudit({
    entityType: "invoice",
    entityId: invoice.id,
    action: "update",
    userId: actor.userId ?? null,
    userName: actor.userName ?? null,
    branchId: invoice.branchId,
    oldValues: { paidAmount: previousPaid, status: invoice.status },
    newValues: { paidAmount: newPaid, status: newStatus, paymentId: payment.id },
    ipAddress: actor.ipAddress ?? null,
    userAgent: actor.userAgent ?? null,
    notes: `قبض ${roundedAmount.toLocaleString("en-US")} د.ع على الفاتورة`,
    tx,
  });

  return { invoice: updated, payment, previousPaid, newPaid };
}

/**
 * **البابُ الوحيد للقبض على فاتورةٍ قائمة** — يقفل الصفَّ ثمّ ينادي الكتابةَ
 * الأساسية. `/collect` والبديلُ المتقاعد `/payment` كلاهما ينادي هذه
 * الدالّةَ بعينها، فلا نسخةَ ثانية من منطق المال تنحرف يوماً.
 */
export async function collectInvoicePayment(params: {
  invoiceId: number;
  amount: number;
  /** نطاقُ الفروع المسموح — `null` = المسؤولُ العام، كلُّ الفروع. */
  allowedBranches: number[] | null;
  actor: InvoiceCashActor;
}): Promise<{ invoice: Invoice; payment: Payment; previousPaid: number; newPaid: number }> {
  return await db.transaction(async (tx) => {
    const invoice = await lockInvoiceTx(tx, params.invoiceId);
    if (!invoice) throw new InvoiceCashError("الفاتورة غير موجودة", 404);

    if (params.allowedBranches !== null && !params.allowedBranches.includes(invoice.branchId)) {
      throw new InvoiceCashError("لا يمكنك القبض على فاتورة من فرع آخر", 403);
    }

    return await applyInvoiceCashTx(tx, invoice, params.amount, params.actor);
  });
}

/**
 * **إنشاءُ فاتورةٍ جديدة، مع رصيدٍ سابق ودفعةٍ فورية كعمليةٍ واحدة.**
 *
 * الترتيبُ داخل المعاملة الواحدة: الفاتورة ⟶ بنودُها ⟶ الرصيدُ السابق
 * (اختياريّ) ⟶ الدفعةُ الفورية (اختياريّة، عبر `applyInvoiceCashTx` نفسِها
 * — لا كاتبَ ثانٍ) ⟶ سطرُ تدقيق «إنشاء». **وأيُّ خطوةٍ تفشل تُسقط ما قبلها
 * معها**: لا فاتورةَ نصفَ مكتملة، ولا رصيدَ مُطبَّقاً بلا دفعةٍ استطاعت أن
 * تُطبَّق بعده.
 *
 * والقفلُ `FOR UPDATE` غيرُ لازمٍ هنا: صفُّ الفاتورة وُلد للتوّ **داخل هذه
 * المعاملة نفسِها**، فلا مزاحمَ خارجيّاً يراه أو يكتب عليه قبل الـCOMMIT.
 */
export async function createInvoiceWithCash(params: {
  invoiceData: any;
  items: any[];
  applyPriorCredit: boolean;
  /** > 0 فقط — الصفرُ والسالبُ يُعاملان كغيابِ دفعةٍ فورية. */
  paidNow: number;
  actor: InvoiceCashActor;
}): Promise<{ invoice: Invoice; items: InvoiceItem[]; creditApplied: number; payment: Payment | null }> {
  return await db.transaction(async (tx) => {
    const invoice = await storage.createInvoice(params.invoiceData, tx);

    const createdItems: InvoiceItem[] = [];
    for (const item of params.items) {
      createdItems.push(await storage.createInvoiceItem({ ...item, invoiceId: invoice.id }, tx));
    }

    let current: Invoice = invoice;
    let creditApplied = 0;

    // ══ الرصيدُ السابق — دفعاتُ جلساتٍ لم تُخصَّص لفاتورةٍ بعد ═════════════
    // نفسُ المنطق القائم قبل هذه الدفعة بحرفه، لم يتغيّر — فقط صار يقرأ
    // ويكتب داخل هذه المعاملة بدل استعلاماتٍ منفصلة.
    if (params.applyPriorCredit && invoice.patientId) {
      const [allPayments, allInvoicesForPatient] = await Promise.all([
        storage.getPaymentsByPatientId(invoice.patientId, tx),
        storage.getInvoices(undefined, undefined, invoice.patientId, undefined, undefined, tx),
      ]);
      const sessionPaid = allPayments.reduce((s, p) => s + p.amount, 0);
      const otherInvoicesPaid = allInvoicesForPatient
        .filter((i) => i.id !== invoice.id)
        .reduce((s, i) => s + (i.paidAmount || 0), 0);
      const availableCredit = Math.max(0, sessionPaid - otherInvoicesPaid);
      creditApplied = Math.min(availableCredit, invoice.total);
      if (creditApplied > 0) {
        const newStatus = creditApplied >= invoice.total ? "paid" : "partial";
        const updated = await storage.updateInvoice(invoice.id, { paidAmount: creditApplied, status: newStatus }, tx);
        if (updated) current = updated;
      }
    }

    // ══ الدفعةُ الفورية — **نفسُ الكاتب** الذي يستعمله `/collect` ═══════════
    let payment: Payment | null = null;
    const paidNow = Math.round(Number(params.paidNow) || 0);
    if (paidNow > 0) {
      const remainingAfterCredit = current.total - (current.paidAmount || 0);
      if (paidNow > remainingAfterCredit) {
        throw new InvoiceCashError(
          `المبلغ المدفوع أكبر من المتبقي على الفاتورة بعد تطبيق الرصيد السابق`
          + ` (${remainingAfterCredit.toLocaleString("en-US")} د.ع)`,
        );
      }
      const applied = await applyInvoiceCashTx(
        tx,
        {
          id: current.id, patientId: current.patientId, branchId: current.branchId,
          total: current.total, paidAmount: current.paidAmount || 0,
          status: current.status, invoiceNumber: current.invoiceNumber,
        },
        paidNow,
        params.actor,
      );
      current = applied.invoice;
      payment = applied.payment;
    }

    await logAudit({
      entityType: "invoice",
      entityId: current.id,
      action: "create",
      userId: params.actor.userId ?? null,
      userName: params.actor.userName ?? null,
      branchId: current.branchId,
      newValues: {
        total: current.total, patientId: current.patientId,
        itemCount: createdItems.length, creditApplied,
      },
      ipAddress: params.actor.ipAddress ?? null,
      userAgent: params.actor.userAgent ?? null,
      tx,
    });

    return { invoice: current, items: createdItems, creditApplied, payment };
  });
}
