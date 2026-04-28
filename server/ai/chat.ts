// Conversational AI assistant — answers ad-hoc questions about the
// branch's financial state in Arabic.
//
// Architecture choice: snapshot-in-prompt rather than tool-use.
// We pre-compute a compact JSON summary of the branch's data
// (last-30-days revenue/expenses, outstanding invoices, top expense
// categories, recent anomalies) and embed it in the system prompt.
// This avoids tool-use round-trips, keeps latency low, and lets us
// cache the system+snapshot block aggressively.
//
// The trade-off: the assistant can't pull arbitrary data on demand —
// only what we put in the snapshot. For the kinds of questions the
// manager actually asks ("how much did we spend this month?", "who
// hasn't paid yet?", "what's the busiest service?") that's plenty.

import { storage } from "../storage";
import { safeAiComplete, type AiResult } from "./provider";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatScope {
  // null = admin scope (all branches); a number = single-branch scope
  branchId: number | null;
  branchName?: string | null;
}

interface FinancialSnapshot {
  scope: { branchId: number | null; branchName: string | null };
  generatedAt: string;
  ranges: {
    last30Days: { start: string; end: string };
    last7Days: { start: string; end: string };
    today: string;
  };
  invoices30d: {
    totalInvoices: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
  };
  expenses30d: {
    total: number;
    byCategory: { category: string; total: number }[];
  };
  payments7d: {
    total: number;
    count: number;
  };
  outstandingInvoices: {
    count: number;
    totalDue: number;
    sample: { invoiceNumber: string; patientName: string | null; branchName: string | null; total: number; paid: number; due: number; ageDays: number }[];
  };
  todayCash: {
    revenue: number;
    expenses: number;
    net: number;
    closing: number;
  };
}

const isoDate = (d: Date) => d.toISOString().split("T")[0];

async function buildSnapshot(scope: ChatScope): Promise<FinancialSnapshot> {
  const today = new Date();
  const todayStr = isoDate(today);
  const last7 = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const branchId = scope.branchId ?? undefined;

  const [
    invoiceStats,
    expensesByCat,
    payments7d,
    outstandingInvoices,
    cashToday,
    patients,
    allBranches,
  ] = await Promise.all([
    storage.getInvoiceStats(branchId, isoDate(last30), todayStr),
    storage.getExpensesByCategory(branchId, isoDate(last30), todayStr),
    storage.getAllPayments(branchId, isoDate(last7), todayStr),
    storage.getInvoices(branchId, "pending"),
    storage.getDailyCashSummary(todayStr, branchId),
    storage.getPatients(branchId),
    storage.getBranches(),
  ]);

  const partialInvoices = await storage.getInvoices(branchId, "partial");
  const allOutstanding = [...outstandingInvoices, ...partialInvoices];
  const patientById = new Map(patients.map((p) => [p.id, p]));
  const branchById = new Map(allBranches.map((b) => [b.id, b]));

  // Limit outstanding sample to the 8 oldest ones — that's what
  // managers ask about anyway, and it keeps the prompt compact.
  // Each entry carries its branchName so the model can answer
  // "which branch is this patient at?" without us having to
  // re-query.
  const sortedOutstanding = allOutstanding
    .map((inv) => {
      const ageDays = Math.floor(
        (today.getTime() - new Date(inv.invoiceDate).getTime()) / (24 * 60 * 60 * 1000)
      );
      return {
        invoiceNumber: inv.invoiceNumber,
        patientName: patientById.get(inv.patientId)?.name ?? null,
        branchName: branchById.get(inv.branchId)?.name ?? null,
        total: inv.total,
        paid: inv.paidAmount || 0,
        due: inv.total - (inv.paidAmount || 0),
        ageDays,
        invoiceDate: inv.invoiceDate,
      };
    })
    .filter((x) => x.due > 0)
    .sort((a, b) => b.ageDays - a.ageDays);

  const totalDue = sortedOutstanding.reduce((s, x) => s + x.due, 0);

  const expensesTotal30 = expensesByCat.reduce((s, x) => s + x.total, 0);

  const payments7dTotal = payments7d.reduce((s, p) => s + p.amount, 0);

  return {
    scope: {
      branchId: scope.branchId,
      branchName: scope.branchName ?? null,
    },
    generatedAt: today.toISOString(),
    ranges: {
      last30Days: { start: isoDate(last30), end: todayStr },
      last7Days: { start: isoDate(last7), end: todayStr },
      today: todayStr,
    },
    invoices30d: invoiceStats,
    expenses30d: {
      total: expensesTotal30,
      byCategory: expensesByCat,
    },
    payments7d: {
      total: payments7dTotal,
      count: payments7d.length,
    },
    outstandingInvoices: {
      count: sortedOutstanding.length,
      totalDue,
      sample: sortedOutstanding.slice(0, 8).map(({ invoiceDate: _i, ...rest }) => rest),
    },
    todayCash: {
      revenue: cashToday.todayRevenue,
      expenses: cashToday.todayExpenses,
      net: cashToday.todayNet,
      closing: cashToday.todayClosing,
    },
  };
}

const SYSTEM_PROMPT = `أنت مساعد محاسبي ذكي لنظام إدارة مراكز "بايونيك" الطبية في العراق.
دورك: الإجابة بدقّة وإيجاز عن أسئلة المدير أو المحاسب حول الوضع المالي للفرع.

قواعد الإجابة:
- أجب بالعربية الفصحى البسيطة، بأسلوب مهني محاسبي.
- اذكر الأرقام بالدينار العراقي (د.ع) وافصل الآلاف بفواصل.
- إن كانت البيانات لا تحتوي الجواب، قل ذلك صراحةً ولا تخمّن.
- لا تخترع أسماء مرضى أو أرقام فواتير.
- اجعل الإجابات قصيرة: 2-4 جمل عادةً، وقائمة نقاط فقط عند طلبها صراحةً.
- إن سُئلت عن "هذا الشهر" أو "آخر شهر"، استخدم نطاق last30Days من الـ snapshot.
- إن سُئلت عن "هذا اليوم"، استخدم todayCash من الـ snapshot.
- إن طُلب اسم مريض، اعرضه فقط إن وُجد في القائمة المعطاة.
- إن سُئلت "في أيّ فرع" عن مريض أو فاتورة، انظر إلى الحقل branchName داخل سجلّ الفاتورة في outstandingInvoices.sample. كلّ سجلّ يحوي اسم الفرع صراحةً.
- لا تذكر أسماء حقول الـ snapshot التقنية في إجاباتك للمستخدم.

الـ snapshot الذي تعمل عليه يُحدَّث كل دقائق، وهو محصور بالفرع الذي يطّلع عليه المستخدم.`;

export async function aiChat(
  scope: ChatScope,
  history: ChatMessage[]
): Promise<AiResult<{ reply: string; snapshotAt: string }>> {
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return { ok: false, reason: "unknown", message: "آخر رسالة يجب أن تكون من المستخدم" };
  }

  const snapshot = await buildSnapshot(scope);
  const snapshotJson = JSON.stringify(snapshot, null, 2);

  // The system block contains: instructions + snapshot. Both are stable
  // for the duration of a single conversation, so caching them buys us
  // a ~10x discount once we cross the cache threshold.
  const systemText = `${SYSTEM_PROMPT}

البيانات المالية الحالية (snapshot):
\`\`\`json
${snapshotJson}
\`\`\``;

  // Flatten the conversation history into a single user turn — provider
  // currently exposes only single-shot user prompts. For multi-turn
  // continuity we replay prior assistant replies as part of the user
  // text so the model has the full context.
  const conversationText = history
    .map((m) => (m.role === "user" ? `سؤال المستخدم: ${m.content}` : `إجابتك السابقة: ${m.content}`))
    .join("\n\n");

  const result = await safeAiComplete({
    system: systemText,
    user: conversationText,
    model: "haiku",
    maxTokens: 600,
  });

  if (!result.ok) return result;
  return {
    ok: true,
    value: { reply: result.value, snapshotAt: snapshot.generatedAt },
  };
}
