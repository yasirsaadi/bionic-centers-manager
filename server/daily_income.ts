// Daily income briefing — computed per branch for a given Baghdad-time date,
// and optionally emailed via the same Gmail transport used by backup.ts.
import nodemailer from "nodemailer";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { storage } from "./storage";
import { belongsToActivePatientSql } from "./patients/active_patient";

const BRIEFING_EMAIL = "yasir.s81@gmail.com";

export interface DailyIncomeBranchRow {
  branchId: number;
  branchName: string;
  paymentCount: number;
  totalIncome: number;
  newPatients: number;
  totalExpenses: number;
}

export interface DailyIncomeData {
  date: string;
  branches: DailyIncomeBranchRow[];
  totals: {
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    newPatients: number;
  };
}

export async function getDailyIncomeData(targetDate?: string): Promise<DailyIncomeData> {
  const allBranches = await storage.getBranches();
  const rows: DailyIncomeBranchRow[] = [];
  let grandIncome = 0;
  let grandExpenses = 0;
  let grandPatients = 0;

  for (const branch of allBranches) {
    const paymentsResult = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt, COALESCE(SUM(amount), 0)::int AS total
      FROM payments pay
      WHERE pay.branch_id = ${branch.id}
        AND (pay.date AT TIME ZONE 'Asia/Baghdad')::date = COALESCE(${targetDate ?? null}::date, (NOW() AT TIME ZONE 'Asia/Baghdad')::date)
        AND ${belongsToActivePatientSql("pay")}
    `);
    const pRow = paymentsResult.rows[0] as any;

    const patientsResult = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt
      FROM patients
      WHERE branch_id = ${branch.id}
        AND (created_at AT TIME ZONE 'Asia/Baghdad')::date = COALESCE(${targetDate ?? null}::date, (NOW() AT TIME ZONE 'Asia/Baghdad')::date)
        AND deleted_at IS NULL
    `);
    const ptRow = patientsResult.rows[0] as any;

    const expensesResult = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt, COALESCE(SUM(amount), 0)::int AS total
      FROM expenses
      WHERE branch_id = ${branch.id}
        AND expense_date = COALESCE(${targetDate ?? null}::date, (NOW() AT TIME ZONE 'Asia/Baghdad')::date)
    `);
    const eRow = expensesResult.rows[0] as any;

    const income = Number(pRow?.total ?? 0);
    const expenses = Number(eRow?.total ?? 0);
    const newPat = Number(ptRow?.cnt ?? 0);

    grandIncome += income;
    grandExpenses += expenses;
    grandPatients += newPat;

    rows.push({
      branchId: branch.id,
      branchName: branch.name,
      paymentCount: Number(pRow?.cnt ?? 0),
      totalIncome: income,
      newPatients: newPat,
      totalExpenses: expenses,
    });
  }

  return {
    date: targetDate || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" }),
    branches: rows,
    totals: {
      totalIncome: grandIncome,
      totalExpenses: grandExpenses,
      netIncome: grandIncome - grandExpenses,
      newPatients: grandPatients,
    },
  };
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function buildHtml(data: DailyIncomeData): string {
  const branchRows = data.branches
    .map((b) => {
      const active = b.totalIncome > 0 || b.paymentCount > 0 || b.newPatients > 0;
      const nameCell = active
        ? b.branchName
        : `${b.branchName} <span style="background:#fff3e0;color:#e65100;font-size:11px;padding:2px 8px;border-radius:10px">لا نشاط</span>`;
      return `<tr>
        <td style="padding:10px 12px;border:1px solid #ddd;font-weight:600">${nameCell}</td>
        <td style="padding:10px 12px;border:1px solid #ddd;text-align:center;color:#0f766e;font-weight:700">${fmt(b.totalIncome)}</td>
        <td style="padding:10px 12px;border:1px solid #ddd;text-align:center">${b.paymentCount}</td>
        <td style="padding:10px 12px;border:1px solid #ddd;text-align:center">${b.newPatients}</td>
        <td style="padding:10px 12px;border:1px solid #ddd;text-align:center;color:#c0392b">${fmt(b.totalExpenses)}</td>
      </tr>`;
    })
    .join("");

  return `<div dir="rtl" style="font-family:Segoe UI,Tahoma,sans-serif;max-width:680px;margin:0 auto">
    <div style="background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;padding:24px;border-radius:12px 12px 0 0;text-align:center">
      <h2 style="margin:0 0 6px 0">التقرير اليومي — مراكز د. ياسر</h2>
      <div style="opacity:.9">${data.date}</div>
    </div>
    <div style="background:#0d6b64;color:#fff;display:flex;justify-content:space-around;padding:14px;text-align:center">
      <div><div style="font-size:20px;font-weight:700">${fmt(data.totals.totalIncome)}</div><div style="font-size:12px;opacity:.85">إجمالي الدخل (د.ع)</div></div>
      <div><div style="font-size:20px;font-weight:700">${fmt(data.totals.totalExpenses)}</div><div style="font-size:12px;opacity:.85">المصروفات (د.ع)</div></div>
      <div><div style="font-size:20px;font-weight:700">${fmt(data.totals.netIncome)}</div><div style="font-size:12px;opacity:.85">صافي الدخل (د.ع)</div></div>
      <div><div style="font-size:20px;font-weight:700">${data.totals.newPatients}</div><div style="font-size:12px;opacity:.85">مرضى جدد</div></div>
    </div>
    <table style="width:100%;border-collapse:collapse;background:#fff">
      <thead>
        <tr style="background:#ecf0f1">
          <th style="padding:10px 12px;border:1px solid #ddd">الفرع</th>
          <th style="padding:10px 12px;border:1px solid #ddd">الدخل (د.ع)</th>
          <th style="padding:10px 12px;border:1px solid #ddd">الدفعات</th>
          <th style="padding:10px 12px;border:1px solid #ddd">مرضى جدد</th>
          <th style="padding:10px 12px;border:1px solid #ddd">المصروفات (د.ع)</th>
        </tr>
      </thead>
      <tbody>${branchRows}</tbody>
    </table>
    <p style="color:#999;font-size:12px;text-align:center;margin-top:12px">رسالة تلقائية — كل ليلة الساعة ١١ مساءً بتوقيت بغداد</p>
  </div>`;
}

export async function sendDailyIncomeEmail(targetDate?: string): Promise<{ success: boolean; error?: string }> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    console.error("[DailyIncome] Missing GMAIL_USER or GMAIL_APP_PASSWORD");
    return { success: false, error: "missing_gmail_credentials" };
  }

  try {
    const data = await getDailyIncomeData(targetDate);
    const html = buildHtml(data);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailAppPassword },
    });

    await transporter.sendMail({
      from: gmailUser,
      to: BRIEFING_EMAIL,
      subject: `التقرير اليومي للدخل - ${data.date}`,
      html,
    });

    console.log(`[DailyIncome] Briefing email sent for ${data.date}`);
    return { success: true };
  } catch (error: any) {
    console.error("[DailyIncome] Failed to send briefing email:", error);
    return { success: false, error: String(error?.message ?? error) };
  }
}
