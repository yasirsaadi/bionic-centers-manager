import nodemailer from "nodemailer";
import cron from "node-cron";
import fs from "fs";
import path from "path";
import { db } from "./db";
import { patients, branches, payments, visits } from "@shared/schema";
import { eq } from "drizzle-orm";

const BACKUP_EMAIL = "yasir.s81@gmail.com";
const LAST_BACKUP_FILE = path.join(process.cwd(), ".last_backup_time");

function getLastBackupTime(): Date | null {
  try {
    if (fs.existsSync(LAST_BACKUP_FILE)) {
      const content = fs.readFileSync(LAST_BACKUP_FILE, "utf-8").trim();
      const timestamp = parseInt(content, 10);
      if (!isNaN(timestamp)) {
        return new Date(timestamp);
      }
    }
  } catch (error) {
    console.error("[Backup] Error reading last backup time:", error);
  }
  return null;
}

function saveLastBackupTime(): void {
  try {
    fs.writeFileSync(LAST_BACKUP_FILE, Date.now().toString(), "utf-8");
  } catch (error) {
    console.error("[Backup] Error saving last backup time:", error);
  }
}

export function getBackupStatus(): { lastBackup: Date | null; hoursAgo: number | null } {
  const lastBackup = getLastBackupTime();
  if (!lastBackup) {
    return { lastBackup: null, hoursAgo: null };
  }
  const hoursAgo = Math.round((Date.now() - lastBackup.getTime()) / (1000 * 60 * 60));
  return { lastBackup, hoursAgo };
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Baghdad",
  };
  return new Intl.DateTimeFormat("en-GB", options).format(date);
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

  // Apply filters
  if (filter.type === "today") {
    const now = new Date();
    const baghdadOffset = 3 * 60 * 60 * 1000; // UTC+3
    const baghdadNow = new Date(now.getTime() + baghdadOffset);
    const todayStart = new Date(baghdadNow.getFullYear(), baghdadNow.getMonth(), baghdadNow.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    allPatients = allPatients.filter(p => {
      if (!p.createdAt) return false;
      const patientDate = new Date(p.createdAt);
      return patientDate >= todayStart && patientDate < todayEnd;
    });
    filterDescription = `مرضى اليوم (${new Intl.DateTimeFormat("ar-IQ", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Baghdad" }).format(baghdadNow)})`;
  } else if (filter.type === "branch" && filter.branchId) {
    const branchName = allPatients.find(p => p.branchId === filter.branchId)?.branchName || "فرع غير معروف";
    allPatients = allPatients.filter(p => p.branchId === filter.branchId);
    filterDescription = `جميع مرضى فرع: ${branchName}`;
  } else if (filter.type === "branch_today" && filter.branchId) {
    const now = new Date();
    const baghdadOffset = 3 * 60 * 60 * 1000; // UTC+3
    const baghdadNow = new Date(now.getTime() + baghdadOffset);
    const todayStart = new Date(baghdadNow.getFullYear(), baghdadNow.getMonth(), baghdadNow.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const branchName = allPatients.find(p => p.branchId === filter.branchId)?.branchName || "فرع غير معروف";
    
    allPatients = allPatients.filter(p => {
      if (!p.createdAt) return false;
      if (p.branchId !== filter.branchId) return false;
      const patientDate = new Date(p.createdAt);
      return patientDate >= todayStart && patientDate < todayEnd;
    });
    filterDescription = `مرضى اليوم لفرع: ${branchName} (${new Intl.DateTimeFormat("ar-IQ", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Baghdad" }).format(baghdadNow)})`;
  }

  const headers = [
    "رقم المريض",
    "الاسم",
    "الهاتف",
    "العنوان",
    "العمر",
    "الوزن",
    "الطول",
    "الجهة المحول منها",
    "ملاحظات الإحالة",
    "الحالة الطبية",
    "سبب الإصابة",
    "تاريخ الإصابة",
    "نوع الإصابة",
    "منطقة الإصابة",
    "ملاحظات عامة",
    "الفرع",
    "حالة بتر",
    "موقع البتر",
    "نوع الطرف",
    "نوع السليكون",
    "حجم السليكون",
    "نظام التعليق",
    "نوع القدم",
    "حجم القدم",
    "نوع مفصل الركبة",
    "علاج طبيعي",
    "نوع المرض",
    "نوع العلاج",
    "مساند طبية",
    "نوع المسند",
    "جهة الإصابة",
    "التكلفة الكلية",
    "تاريخ التسجيل",
  ];

  const rows = allPatients.map((p) => [
    p.id,
    escapeCSV(p.name),
    escapeCSV(p.phone),
    escapeCSV(p.address),
    escapeCSV(p.age),
    escapeCSV(p.weight),
    escapeCSV(p.height),
    escapeCSV(p.referralSource),
    escapeCSV(p.referralNotes),
    escapeCSV(p.medicalCondition),
    escapeCSV(p.injuryCause),
    escapeCSV(p.injuryDate),
    escapeCSV(p.injuryType),
    escapeCSV(p.injuryArea),
    escapeCSV(p.generalNotes),
    escapeCSV(p.branchName),
    p.isAmputee ? "نعم" : "لا",
    escapeCSV(p.amputationSite),
    escapeCSV(p.prostheticType),
    escapeCSV(p.siliconType),
    escapeCSV(p.siliconSize),
    escapeCSV(p.suspensionSystem),
    escapeCSV(p.footType),
    escapeCSV(p.footSize),
    escapeCSV(p.kneeJointType),
    p.isPhysiotherapy ? "نعم" : "لا",
    escapeCSV(p.diseaseType),
    escapeCSV(p.treatmentType),
    p.isMedicalSupport ? "نعم" : "لا",
    escapeCSV(p.supportType),
    escapeCSV(p.injurySide),
    p.totalCost || 0,
    formatDate(p.createdAt),
  ]);

  const BOM = "\uFEFF";
  const csvContent = BOM + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  return { csv: csvContent, count: allPatients.length, filterDescription };
}

async function sendBackupEmail(filter: BackupFilter = { type: "all" }): Promise<{ success: boolean; count?: number; filterDescription?: string }> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    console.error("[Backup] Missing GMAIL_USER or GMAIL_APP_PASSWORD secrets");
    return { success: false };
  }

  try {
    const { csv: csvContent, count, filterDescription } = await generatePatientCSV(filter);
    const now = new Date();
    const baghdadDate = new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Asia/Baghdad",
    }).format(now).replace(/\//g, "-");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    const mailOptions = {
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
          <p><strong>الوقت:</strong> ${new Intl.DateTimeFormat("ar-IQ", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Baghdad",
          }).format(now)}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            هذه رسالة تلقائية من نظام إدارة مراكز الدكتور ياسر الساعدي
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `patients_backup_${baghdadDate}.csv`,
          content: csvContent,
          contentType: "text/csv; charset=utf-8",
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    saveLastBackupTime();
    console.log(`[Backup] Email sent successfully to ${BACKUP_EMAIL} at ${formatDate(now)} - ${filterDescription} (${count} patients)`);
    return { success: true, count, filterDescription };
  } catch (error) {
    console.error("[Backup] Failed to send email:", error);
    return { success: false };
  }
}

export async function initBackupScheduler(): Promise<void> {
  // Schedule daily backup at 23:55 Baghdad time
  cron.schedule(
    "55 20 * * *",
    async () => {
      console.log("[Backup] Starting scheduled backup...");
      await sendBackupEmail();
    },
    {
      timezone: "UTC",
    }
  );

  console.log("[Backup] Scheduler initialized - Daily backup at 23:55 Baghdad time (20:55 UTC)");
  
  // Check if backup is needed on startup (if last backup was more than 24 hours ago)
  const status = getBackupStatus();
  if (status.hoursAgo === null || status.hoursAgo >= 24) {
    console.log("[Backup] No backup in last 24 hours - sending startup backup...");
    setTimeout(async () => {
      const success = await sendBackupEmail();
      if (success) {
        console.log("[Backup] Startup backup sent successfully");
      } else {
        console.log("[Backup] Startup backup failed - will retry at scheduled time");
      }
    }, 10000); // Wait 10 seconds for server to fully initialize
  } else {
    console.log(`[Backup] Last backup was ${status.hoursAgo} hours ago - no startup backup needed`);
  }
}

export async function sendManualBackup(filter: BackupFilter = { type: "all" }): Promise<{ success: boolean; count?: number; filterDescription?: string }> {
  console.log(`[Backup] Sending manual backup with filter: ${filter.type}...`);
  return await sendBackupEmail(filter);
}
