import nodemailer from "nodemailer";
import cron from "node-cron";
import { db } from "./db";
import { patients, branches, systemSettings } from "@shared/schema";
import { eq } from "drizzle-orm";

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

  console.log("[Backup] Scheduler initialized - daily backup at 23:55 Baghdad time only");
}

export async function sendManualBackup(filter: BackupFilter = { type: "all" }): Promise<{ success: boolean; count?: number; filterDescription?: string }> {
  console.log(`[Backup] Sending manual backup (filter: ${filter.type})...`);
  return await sendBackupEmail(filter);
}
