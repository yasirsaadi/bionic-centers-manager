import nodemailer from "nodemailer";
import cron from "node-cron";
import { db } from "./db";
import { patients, branches, payments, visits } from "@shared/schema";
import { eq } from "drizzle-orm";

const BACKUP_EMAIL = "yasir.s81@gmail.com";

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

async function generatePatientCSV(): Promise<string> {
  const allPatients = await db
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

  return csvContent;
}

async function sendBackupEmail(): Promise<boolean> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    console.error("[Backup] Missing GMAIL_USER or GMAIL_APP_PASSWORD secrets");
    return false;
  }

  try {
    const csvContent = await generatePatientCSV();
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
      subject: `نسخة احتياطية - بيانات المرضى - ${baghdadDate}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif;">
          <h2>نسخة احتياطية يومية</h2>
          <p>مرفق ملف CSV يحتوي على بيانات جميع المرضى.</p>
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
    console.log(`[Backup] Email sent successfully to ${BACKUP_EMAIL} at ${formatDate(now)}`);
    return true;
  } catch (error) {
    console.error("[Backup] Failed to send email:", error);
    return false;
  }
}

export function initBackupScheduler(): void {
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
}

export async function sendManualBackup(): Promise<boolean> {
  console.log("[Backup] Sending manual backup...");
  return await sendBackupEmail();
}
