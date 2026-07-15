import nodemailer from "nodemailer";
import cron from "node-cron";
import { db } from "./db";
import { patients, branches, payments, expenses, systemSettings } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

const BACKUP_EMAIL = "yasir.s81@gmail.com";

function getBaghdadDateString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
}

async function getLastDailyBackupDate(): Promise<string | null> {
  try {
    const [row] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, "last_daily_backup_date"));
    return row?.settingValue || null;
  } catch {
    return null;
  }
}

async function saveLastDailyBackupDate(): Promise<void> {
  const today = getBaghdadDateString();
  try {
    const [existing] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, "last_daily_backup_date"));

    if (existing) {
      await db
        .update(systemSettings)
        .set({ settingValue: today, updatedAt: new Date() })
        .where(eq(systemSettings.settingKey, "last_daily_backup_date"));
    } else {
      await db.insert(systemSettings).values({
        settingKey: "last_daily_backup_date",
        settingValue: today,
      });
    }
  } catch (error) {
    console.error("[Backup] Error saving backup date:", error);
  }
}

export async function getBackupStatus(): Promise<{ lastBackup: string | null; hoursAgo: number | null }> {
  const lastDate = await getLastDailyBackupDate();
  if (!lastDate) return { lastBackup: null, hoursAgo: null };

  const lastMs = new Date(lastDate + "T20:55:00Z").getTime();
  const hoursAgo = Math.round((Date.now() - lastMs) / (1000 * 60 * 60));
  return { lastBackup: lastDate, hoursAgo };
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Baghdad",
  }).format(date);
}

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export type BackupFilter = {
  type: "all" | "today" | "branch" | "branch_today";
  branchId?: number;
};

async function generatePatientCSV(filter: BackupFilter = { type: "all" }): Promise<{ csv: string; count: number; filterDescription: string }> {
  let allPatients = await db
    .select({
      id: patients.id,
      name: patients.name,
      phone: patients.phone,
      address: patients.address,
      age: patients.age,
      weight: patients.weight,
      height: patients.height,
      referralSource: patients.referralSource,
      referralNotes: patients.referralNotes,
      medicalCondition: patients.medicalCondition,
      injuryCause: patients.injuryCause,
      injuryDate: patients.injuryDate,
      injuryType: patients.injuryType,
      injuryArea: patients.injuryArea,
      generalNotes: patients.generalNotes,
      branchId: patients.branchId,
      isAmputee: patients.isAmputee,
      amputationSite: patients.amputationSite,
      prostheticType: patients.prostheticType,
      siliconType: patients.siliconType,
      siliconSize: patients.siliconSize,
      suspensionSystem: patients.suspensionSystem,
      footType: patients.footType,
      footSize: patients.footSize,
      kneeJointType: patients.kneeJointType,
      isPhysiotherapy: patients.isPhysiotherapy,
      diseaseType: patients.diseaseType,
      treatmentType: patients.treatmentType,
      isMedicalSupport: patients.isMedicalSupport,
      supportType: patients.supportType,
      injurySide: patients.injurySide,
      totalCost: patients.totalCost,
      createdAt: patients.createdAt,
      branchName: branches.name,
    })
    .from(patients)
    .leftJoin(branches, eq(patients.branchId, branches.id));

  let filterDescription = "جميع المرضى";

  if (filter.type === "today" || filter.type === "branch_today") {
    const baghdadOffset = 3 * 60 * 60 * 1000;
    const baghdadNow = new Date(Date.now() + baghdadOffset);
    const todayStr = baghdadNow.toISOString().split("T")[0];
    const todayStart = new Date(todayStr + "T00:00:00Z");
    const todayStartUTC = new Date(todayStart.getTime() - baghdadOffset);
    const todayEndUTC = new Date(todayStartUTC.getTime() + 24 * 60 * 60 * 1000);
    const dateFormatted = new Intl.DateTimeFormat("ar-IQ", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Baghdad" }).format(baghdadNow);

    if (filter.type === "today") {
      allPatients = allPatients.filter(p => {
        if (!p.createdAt) return false;
        const t = new Date(p.createdAt).getTime();
        return t >= todayStartUTC.getTime() && t < todayEndUTC.getTime();
      });
      filterDescription = `مرضى اليوم (${dateFormatted})`;
    } else if (filter.branchId) {
      const branchName = allPatients.find(p => p.branchId === filter.branchId)?.branchName || "فرع غير معروف";
      allPatients = allPatients.filter(p => {
        if (!p.createdAt) return false;
        if (p.branchId !== filter.branchId) return false;
        const t = new Date(p.createdAt).getTime();
        return t >= todayStartUTC.getTime() && t < todayEndUTC.getTime();
      });
      filterDescription = `مرضى اليوم لفرع: ${branchName} (${dateFormatted})`;
    }
  } else if (filter.type === "branch" && filter.branchId) {
    const branchName = allPatients.find(p => p.branchId === filter.branchId)?.branchName || "فرع غير معروف";
    allPatients = allPatients.filter(p => p.branchId === filter.branchId);
    filterDescription = `جميع مرضى فرع: ${branchName}`;
  }

  const headers = [
    "رقم المريض", "الاسم", "الهاتف", "العنوان", "العمر", "الوزن", "الطول",
    "الجهة المحول منها", "ملاحظات الإحالة", "الحالة الطبية", "سبب الإصابة",
    "تاريخ الإصابة", "نوع الإصابة", "منطقة الإصابة", "ملاحظات عامة", "الفرع",
    "حالة بتر", "موقع البتر", "نوع الطرف", "نوع السليكون", "حجم السليكون",
    "نظام التعليق", "نوع القدم", "حجم القدم", "نوع مفصل الركبة", "علاج طبيعي",
    "نوع المرض", "نوع العلاج", "مساند طبية", "نوع المسند", "جهة الإصابة",
    "التكلفة الكلية", "تاريخ التسجيل",
  ];

  const rows = allPatients.map((p) => [
    p.id, escapeCSV(p.name), escapeCSV(p.phone), escapeCSV(p.address),
    escapeCSV(p.age), escapeCSV(p.weight), escapeCSV(p.height),
    escapeCSV(p.referralSource), escapeCSV(p.referralNotes),
    escapeCSV(p.medicalCondition), escapeCSV(p.injuryCause),
    escapeCSV(p.injuryDate), escapeCSV(p.injuryType), escapeCSV(p.injuryArea),
    escapeCSV(p.generalNotes), escapeCSV(p.branchName),
    p.isAmputee ? "نعم" : "لا", escapeCSV(p.amputationSite),
    escapeCSV(p.prostheticType), escapeCSV(p.siliconType), escapeCSV(p.siliconSize),
    escapeCSV(p.suspensionSystem), escapeCSV(p.footType), escapeCSV(p.footSize),
    escapeCSV(p.kneeJointType), p.isPhysiotherapy ? "نعم" : "لا",
    escapeCSV(p.diseaseType), escapeCSV(p.treatmentType),
    p.isMedicalSupport ? "نعم" : "لا", escapeCSV(p.supportType),
    escapeCSV(p.injurySide), p.totalCost || 0, formatDate(p.createdAt),
  ]);

  const BOM = "\uFEFF";
  const csvContent = BOM + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  return { csv: csvContent, count: allPatients.length, filterDescription };
}

async function sendBackupEmail(filter: BackupFilter = { type: "all" }): Promise<{ success: boolean; count?: number; filterDescription?: string }> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    console.error("[Backup] Missing GMAIL_USER or GMAIL_APP_PASSWORD");
    return { success: false };
  }

  try {
    const { csv: csvContent, count, filterDescription } = await generatePatientCSV(filter);
    const now = new Date();
    const baghdadDate = getBaghdadDateString();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailAppPassword },
    });

    await transporter.sendMail({
      from: gmailUser,
      to: BACKUP_EMAIL,
      subject: `نسخة احتياطية - ${filterDescription} - ${baghdadDate}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif;">
          <h2>نسخة احتياطية</h2>
          <p>مرفق ملف CSV يحتوي على بيانات المرضى.</p>
          <p><strong>الفلتر:</strong> ${filterDescription}</p>
          <p><strong>عدد المرضى:</strong> ${count}</p>
          <p><strong>تاريخ النسخة:</strong> ${baghdadDate}</p>
          <p><strong>الوقت:</strong> ${new Intl.DateTimeFormat("ar-IQ", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Baghdad" }).format(now)}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">هذه رسالة تلقائية من نظام إدارة مراكز الدكتور ياسر الساعدي</p>
        </div>
      `,
      attachments: [{
        filename: `patients_backup_${baghdadDate}.csv`,
        content: csvContent,
        contentType: "text/csv; charset=utf-8",
      }],
    });

    console.log(`[Backup] Email sent to ${BACKUP_EMAIL} at ${formatDate(now)} - ${filterDescription} (${count} patients)`);
    return { success: true, count, filterDescription };
  } catch (error) {
    console.error("[Backup] Failed to send email:", error);
    return { success: false };
  }
}

const BRANCH_ORDER = ["كربلاء", "بغداد", "ذي قار", "الموصل", "موصل", "كركوك"];

export interface NightlyBranchRow {
  name: string;
  worked: number;
  spent: number;
  remaining: number;
  prosthetics: number;
  physiotherapy: number;
}

export interface NightlyReportData {
  date: string;
  branches: NightlyBranchRow[];
  totals: Omit<NightlyBranchRow, "name">;
}

export async function getNightlyReportData(): Promise<NightlyReportData> {
  const allBranches = await db.select().from(branches);
  const sortedBranches = [...allBranches].sort((a, b) => {
    const ai = BRANCH_ORDER.indexOf(a.name);
    const bi = BRANCH_ORDER.indexOf(b.name);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const patientStats = await db
    .select({
      branchId: patients.branchId,
      totalCost: sql<string>`COALESCE(SUM(${patients.totalCost}), 0)`,
      amputeeCount: sql<string>`COUNT(CASE WHEN ${patients.isAmputee} = true THEN 1 END)`,
      physioCount: sql<string>`COUNT(CASE WHEN ${patients.isPhysiotherapy} = true THEN 1 END)`,
    })
    .from(patients)
    .groupBy(patients.branchId);

  const paymentStats = await db
    .select({
      branchId: payments.branchId,
      totalPaid: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
    })
    .from(payments)
    .groupBy(payments.branchId);

  const expenseStats = await db
    .select({
      branchId: expenses.branchId,
      totalExpenses: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
    })
    .from(expenses)
    .groupBy(expenses.branchId);

  const patientMap = new Map(patientStats.map(r => [r.branchId, r]));
  const paymentMap = new Map(paymentStats.map(r => [r.branchId, r]));
  const expenseMap = new Map(expenseStats.map(r => [r.branchId, r]));

  let totalWorked = 0, totalSpent = 0, totalRemaining = 0;
  let totalProsthetics = 0, totalPhysiotherapy = 0;

  const branchRows: NightlyBranchRow[] = sortedBranches.map(branch => {
    const ps = patientMap.get(branch.id);
    const py = paymentMap.get(branch.id);
    const ex = expenseMap.get(branch.id);

    const worked = Number(py?.totalPaid ?? 0);
    const spent = Number(ex?.totalExpenses ?? 0);
    const cost = Number(ps?.totalCost ?? 0);
    const remaining = cost - worked;
    const prosthetics = Number(ps?.amputeeCount ?? 0);
    const physiotherapy = Number(ps?.physioCount ?? 0);

    totalWorked += worked;
    totalSpent += spent;
    totalRemaining += remaining;
    totalProsthetics += prosthetics;
    totalPhysiotherapy += physiotherapy;

    return { name: branch.name, worked, spent, remaining, prosthetics, physiotherapy };
  });

  return {
    date: getBaghdadDateString(),
    branches: branchRows,
    totals: {
      worked: totalWorked,
      spent: totalSpent,
      remaining: totalRemaining,
      prosthetics: totalProsthetics,
      physiotherapy: totalPhysiotherapy,
    },
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ar-IQ").format(amount) + " د.ع";
}

async function generateNightlyReportHTML(): Promise<string> {
  const now = new Date();
  const data = await getNightlyReportData();

  const rows = data.branches.map(b => `
      <tr>
        <td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold">${b.name}</td>
        <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;color:#1a7a3a">${formatCurrency(b.worked)}</td>
        <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;color:#c0392b">${formatCurrency(b.spent)}</td>
        <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;color:#2980b9">${formatCurrency(b.remaining)}</td>
        <td style="padding:8px 12px;border:1px solid #ddd;text-align:center">${b.prosthetics}</td>
        <td style="padding:8px 12px;border:1px solid #ddd;text-align:center">${b.physiotherapy}</td>
      </tr>`).join("");

  const timeStr = new Intl.DateTimeFormat("ar-IQ", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Baghdad",
  }).format(now);

  return `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto">
      <h2 style="color:#2c3e50">التقرير الليلي - مراكز الأطراف الاصطناعية</h2>
      <p><strong>التاريخ:</strong> ${data.date} &nbsp;&nbsp; <strong>الوقت:</strong> ${timeStr}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <thead>
          <tr style="background:#2c3e50;color:#fff">
            <th style="padding:10px 12px;border:1px solid #ddd;text-align:right">الفرع</th>
            <th style="padding:10px 12px;border:1px solid #ddd">المحصّل</th>
            <th style="padding:10px 12px;border:1px solid #ddd">المصروف</th>
            <th style="padding:10px 12px;border:1px solid #ddd">المتبقي</th>
            <th style="padding:10px 12px;border:1px solid #ddd">أطراف اصطناعية</th>
            <th style="padding:10px 12px;border:1px solid #ddd">علاج طبيعي</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr style="background:#ecf0f1;font-weight:bold">
            <td style="padding:8px 12px;border:1px solid #ddd">الإجمالي</td>
            <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;color:#1a7a3a">${formatCurrency(data.totals.worked)}</td>
            <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;color:#c0392b">${formatCurrency(data.totals.spent)}</td>
            <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;color:#2980b9">${formatCurrency(data.totals.remaining)}</td>
            <td style="padding:8px 12px;border:1px solid #ddd;text-align:center">${data.totals.prosthetics}</td>
            <td style="padding:8px 12px;border:1px solid #ddd;text-align:center">${data.totals.physiotherapy}</td>
          </tr>
        </tbody>
      </table>
      <p style="margin-top:16px;color:#666;font-size:12px">هذه رسالة تلقائية من نظام إدارة مراكز الدكتور ياسر الساعدي</p>
    </div>`;
}

async function sendNightlyReport(): Promise<void> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    console.error("[Report] Missing GMAIL_USER or GMAIL_APP_PASSWORD");
    return;
  }

  try {
    const html = await generateNightlyReportHTML();
    const baghdadDate = getBaghdadDateString();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailAppPassword },
    });

    await transporter.sendMail({
      from: gmailUser,
      to: BACKUP_EMAIL,
      subject: `التقرير الليلي - ${baghdadDate}`,
      html,
    });

    console.log(`[Report] Nightly report sent for ${baghdadDate}`);
  } catch (error) {
    console.error("[Report] Failed to send nightly report:", error);
  }
}

export async function initBackupScheduler(): Promise<void> {
  cron.schedule(
    "55 20 * * *",
    async () => {
      const today = getBaghdadDateString();
      const lastDate = await getLastDailyBackupDate();

      if (lastDate === today) {
        console.log(`[Backup] Already sent today (${today}) - skipping`);
        return;
      }

      console.log(`[Backup] Sending scheduled daily backup for ${today}...`);
      const result = await sendBackupEmail();
      if (result.success) {
        await saveLastDailyBackupDate();
        console.log(`[Backup] Daily backup completed (${result.count} patients)`);
      }
    },
    { timezone: "UTC" }
  );

  // Nightly report: 23:57 Baghdad time = 20:57 UTC
  cron.schedule(
    "57 20 * * *",
    async () => {
      const today = getBaghdadDateString();
      console.log(`[Report] Sending nightly report for ${today}...`);
      await sendNightlyReport();
    },
    { timezone: "UTC" }
  );

  // Daily income briefing: 23:00 Baghdad time = 20:00 UTC
  cron.schedule(
    "0 20 * * *",
    async () => {
      const { sendDailyIncomeEmail } = await import("./daily_income");
      console.log("[DailyIncome] Sending nightly income briefing...");
      await sendDailyIncomeEmail();
    },
    { timezone: "UTC" }
  );

  console.log("[Backup] Scheduler initialized - daily backup at 23:55 and nightly report at 23:57 Baghdad time");
}

export async function sendManualBackup(filter: BackupFilter = { type: "all" }): Promise<{ success: boolean; count?: number; filterDescription?: string }> {
  console.log(`[Backup] Sending manual backup (filter: ${filter.type})...`);
  return await sendBackupEmail(filter);
}
