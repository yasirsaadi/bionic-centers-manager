import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sql, eq, and, isNull, desc, gte, lte } from "drizzle-orm";
import { api } from "@shared/routes";
import { PHYSIO_TREATMENT_TYPES, physioEntryCost, mergePhysioPlan, describePhysioPlan } from "@shared/pricing";
import { isMedicalSpecialty } from "@shared/medical";
import { normalizePhone } from "@shared/phone";
import { nudgeDispatcher } from "./patient_notifications/dispatcher";
import { notifyNewPatient, testAndLink, TELEGRAM_SETTINGS } from "./notifications/telegram";
import { z } from "zod";
import { patients, branches, visits, payments, documents, patientCases, expenseCategories, EXPENSE_SECTIONS, insertCustomStatSchema, insertExpenseSchema, insertInstallmentPlanSchema, insertInvoiceSchema, insertInvoiceItemSchema, insertTreatmentPlanSchema, insertVendorSchema, insertPurchaseSchema, insertAiMemoryNoteSchema } from "@shared/schema";
import type { Patient, Payment } from "@shared/schema";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { registerAccountingV2Routes } from "./accounting/routes";
import { registerSessionTrackingRoutes } from "./sessions_module/routes";
import { registerManufacturingRoutes } from "./manufacturing/routes";
import { registerMedicalRoutes } from "./medical/routes";
import { registerMedicalReviewRoutes } from "./medical_review/routes";
import { routeServiceToDoctorReview, classifyFromBody } from "./medical_review/routing";
import { registerDeviceEpisodeRoutes } from "./device_episodes/routes";
import { registerFollowupRoutes } from "./followup/routes";
import { registerPendingChargeRoutes } from "./pending_charges/routes";
import { registerAdminReversalRoutes } from "./admin_reversal/routes";
import * as followupStore from "./followup/store";
import { registerDiscountRoutes, discountAuditNote } from "./discounts/routes";
import * as discountStore from "./discounts/store";
import {
  buildPatientSearch, hasTrigram, searchTieBreaker,
} from "./patient_search/sql";
import { patientActiveOnDate } from "./patient_activity";
//  **المريضُ الفعّال — تعريفٌ واحد** (ترحيل ٠٦٨).
import { activePatientDrizzle, belongsToActivePatientSql } from "./patients/active_patient";
import { canTrashPatients, IN_TRASH_HINT, IN_TRASH_ESCALATION, PATIENT_IN_TRASH_ERROR } from "@shared/patient_trash";
import { registerPatientTrashRoutes, trashActor } from "./patients/trash_routes";
import { softDeletePatient, TrashError } from "./patients/trash_store";
import {
  executeNewService, normalizeEntries, NewServiceError,
  NEW_SERVICE_LABELS, NEW_SERVICE_REDIRECTS,
} from "./new_service/store";
import { newServiceDiscountRef } from "@shared/discount";
import {
  checkRequiredPatientData, checkAmputationSite, isAdministrativeOnlyPatch,
} from "@shared/patient_required";
import { aliasCodesByPatient } from "./patient_code/store";
import {
  listPayableEpisodes, verifyEpisodeBelongs, listDeliveredEpisodes,
} from "./device_episodes/store";
import { deviceServiceOfPaymentType, hasMixedDeviceEntries } from "@shared/device_attribution";
import { NEW_SERVICE_DEPARTMENT, isPatientClassification } from "@shared/service_taxonomy";
import { DeviceEpisodeError } from "./device_episodes/store";
import * as manufacturingStore from "./manufacturing/store";
import {
  createJournalForPayment,
  createJournalForExpense,
  createJournalForInvoice,
  createJournalForInvoicePayment,
  createJournalForPurchase,
  createJournalForVendorPayment,
  reverseJournalForSource,
} from "./accounting/auto_journal";
import { collectInvoicePayment, createInvoiceWithCash, deleteInvoiceIfUntouched, InvoiceCashError } from "./accounting/invoice_cash";
import { isAiEnabled } from "./ai/provider";
import { suggestExpenseCategory } from "./ai/categorize";
import { explainAnomaly } from "./ai/explain_anomaly";
import { aiChat, type ChatMessage } from "./ai/chat";
import { resolveAiAccess } from "./ai/access";
import { normalizePatientCode } from "@shared/patient_code";
import { getRuleBasedHints, getAiHints } from "./ai/expense_hints";
import { getOrGenerateMonthlyReport } from "./ai/monthly_report";
import { getOrGenerateSmartAudit } from "./ai/smart_audit";
import { generateSurveyReply } from "./ai/survey_reply";
import { detectAnomalies, type Anomaly } from "./anomalies/detector";
import { computeActiveReminders, getReminderSnapshot } from "./followups/service";
import { logAudit } from "./accounting/ledger";

/** نصٌّ غيرُ فارغ أو `null` — والفراغُ لا يُحفَظ كسلسلةٍ فارغة. */
const strOrNull = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

// Validation schemas for admin settings
const adminPasswordSchema = z.object({
  currentPassword: z.string().min(1, "كلمة المرور الحالية مطلوبة"),
  newPassword: z.string().min(4, "كلمة المرور يجب أن تكون 4 أحرف على الأقل"),
});

const branchPasswordSchema = z.object({
  branchId: z.number().positive("معرف الفرع مطلوب"),
  newPassword: z.string().min(4, "كلمة المرور يجب أن تكون 4 أحرف على الأقل"),
});

const backupEmailSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
});

const verifyBranchSchema = z.object({
  branchKey: z.string().min(1, "الفرع مطلوب"),
  username: z.string().min(1, "اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
  shift: z.string().optional(),
});

// Username to branch mapping
const usernameToBranch: Record<string, { branchId: number | "admin"; branchName: string }> = {
  "admin": { branchId: "admin", branchName: "مسؤول النظام" },
  "baghdad": { branchId: 1, branchName: "بايونك بغداد" },
  "karbala": { branchId: 2, branchName: "الوارث كربلاء" },
  "dhiqar": { branchId: 3, branchName: "بايونك ذي قار" },
  "mosul": { branchId: 4, branchName: "بايونك الموصل" },
  "kirkuk": { branchId: 5, branchName: "بايونك كركوك" },
};

const verifyAdminSchema = z.object({
  code: z.string().min(1, "كود المسؤول مطلوب"),
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = "uploads";
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  })
});


/** نوعُ خدمةِ الجهاز من وسم الزيارة، إن كان وسمَ جهازٍ أصلاً. */
function deviceServiceOfCaseType(treatmentType: unknown): "prosthetic" | "medical_support" | null {
  const v = deviceServiceOfPaymentType(typeof treatmentType === "string" ? treatmentType : null);
  return v === "prosthetic" || v === "medical_support" ? v : null;
}

/** وإلّا فمن خيط الزيارة نفسه — فأكثر الزيارات بلا وسم. */
async function deviceServiceOfCaseId(
  caseId: unknown, patientId: number,
): Promise<"prosthetic" | "medical_support" | null> {
  const id = Number(caseId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const [row] = await db.select({ caseType: patientCases.caseType }).from(patientCases)
    .where(and(eq(patientCases.id, id), eq(patientCases.patientId, patientId)));
  const t = row?.caseType;
  return t === "prosthetic" || t === "medical_support" ? t : null;
}

/**
 * **هل يملك المريضُ هذه الحالةَ فعلاً؟**
 *
 * نافذةُ الدفع صارت تحسم الحالةَ تلقائياً ولا تسأل إلّا عند غموضٍ حقيقيّ،
 * وقائمتُها **حالاتُ المريض وحدها**. لكنّ الواجهةَ ليست حارساً: نافذةٌ
 * قديمة مفتوحةٌ منذ ما قبل التغيير — أو طلبٌ مصنوعٌ بيدٍ — قد يحمل وسمَ
 * «أطراف صناعية» لمريضِ علاجٍ طبيعي، فيدخل مالُه في تقسيم قسمٍ لا يخصّه
 * ويظهر مديناً لجهازٍ لم يطلبه قطّ.
 *
 * والملكيّةُ **ثلاثةُ أدلّة يكفي أحدُها**: علمُ الملفّ، أو خيطُ حالةٍ
 * مفتوح، أو حلقةُ جهاز. ثلاثةٌ لأن الملفّات القديمة تحمل بعضَها دون بعض،
 * والحارسُ يجب أن يردّ الخطأ لا التاريخ.
 */
async function patientOwnsCase(
  patientId: number, caseType: "prosthetic" | "medical_support",
): Promise<boolean> {
  const r = await db.execute<{ owns: boolean }>(sql`
    SELECT (
      EXISTS (
        SELECT 1 FROM patients p
         WHERE p.id = ${patientId}
           AND ${caseType === "prosthetic"
             ? sql`p.is_amputee IS TRUE`
             : sql`p.is_medical_support IS TRUE`}
      )
      OR EXISTS (
        SELECT 1 FROM patient_cases pc
         WHERE pc.patient_id = ${patientId} AND pc.case_type = ${caseType}
      )
      OR EXISTS (
        SELECT 1 FROM patient_device_episodes de
          JOIN patient_cases pc ON pc.id = de.case_id
         WHERE de.patient_id = ${patientId} AND pc.case_type = ${caseType}
      )
    ) AS owns
  `);
  return Boolean((r.rows ?? [])[0]?.owns);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.use('/uploads', (req, res, next) => {
    if (req.path.includes('..')) {
      res.status(403).send('Forbidden');
      return;
    }
    next();
  }, (await import('express')).static('uploads'));

  // The payment a paid VISIT created. Preferred: the explicit visit_id link
  // (migration 038). Fallback for rows older than the link: a match is
  // accepted only when EXACTLY ONE payment fits (same patient, same amount,
  // the visit-payment note) — anything ambiguous returns null so the caller
  // reports instead of guessing at someone's money.
  const findVisitPayment = async (visitId: number, patientId: number, amount: number) => {
    const [byLink] = await db.select().from(payments).where(eq(payments.visitId, visitId));
    if (byLink) return byLink;
    if (!(amount > 0)) return null;
    const candidates = await db.select().from(payments).where(and(
      eq(payments.patientId, patientId),
      eq(payments.amount, amount),
      eq(payments.notes, "دفعة زيارة"),
    ));
    return candidates.length === 1 ? candidates[0] : null;
  };

  // Helper to get user branch
  const getUserContext = (req: any) => {
    const branchSession = (req.session as any)?.branchSession;
    return {
      userId: branchSession?.userId,
      role: branchSession?.role || (branchSession?.isAdmin ? 'admin' : 'staff'),
      branchId: branchSession?.branchId
    };
  };

  // Returns the branch ID that should be used to filter list/aggregate
  // results for the current user. Non-admins are ALWAYS pinned to their
  // own branch — the client cannot escape this by sending a different
  // branchId in the query string. Admins may pass any branchId or omit
  // it (= all branches).
  //
  // Use this everywhere that exposes data by branch: accounting summaries,
  // expenses, invoices, purchases, statistics, debtors, daily summaries.
  const enforceBranchAccess = (req: any): number | undefined => {
    const branchSession = (req.session as any)?.branchSession;
    const isAdmin = branchSession?.isAdmin;
    if (!isAdmin) {
      return branchSession?.branchId ?? undefined;
    }
    const requested = req.query?.branchId;
    if (requested === undefined || requested === null || requested === '' || requested === 'all') {
      return undefined;
    }
    const id = parseInt(String(requested));
    return Number.isNaN(id) ? undefined : id;
  };

  // Returns true when the requester is the system admin OR a
  // branch_manager. Used to gate "admin-style" branch-scoped operations
  // (delete a visit, edit a payment's session info, etc.) that the
  // user explicitly wants branch managers to perform within their own
  // branches. Branch isolation is checked separately at each call site.
  const isAdminOrManager = (req: any): boolean => {
    const branchSession = (req.session as any).branchSession;
    return Boolean(branchSession?.isAdmin) || branchSession?.role === "branch_manager";
  };

  // Branches the requester can act on. Admin returns null (=
  // "everywhere"); non-admin returns the union of accessibleBranches
  // (multi-branch) and branchId (legacy single). Used by the
  // branch-isolation checks on the admin-style endpoints below.
  const accessibleBranchesFor = (req: any): number[] | null => {
    const branchSession = (req.session as any).branchSession;
    if (branchSession?.isAdmin) return null;
    const list = Array.isArray(branchSession?.accessibleBranches) ? branchSession.accessibleBranches : [];
    if (list.length > 0) return list;
    return branchSession?.branchId ? [branchSession.branchId] : [];
  };

  // Who may collect cash against an invoice — the ONE predicate for both
  // /api/invoices/:id/collect and its deprecated alias /api/invoices/:id/payment
  // (invoice cash truth, 2026-08-26). Kept in one place so the two doors
  // can never drift on who is allowed through them.
  const canCollectInvoice = (branchSession: any): boolean =>
    Boolean(
      branchSession?.isAdmin
      || branchSession?.permissions?.canManageAccounting
      || branchSession?.permissions?.canAddPayments,
    );

  // Helper to check permissions from session
  const getPermissions = (req: any) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    
    // Default admin permissions
    const adminPermissions = {
      canViewPatients: true,
      canAddPatients: true,
      canEditPatients: true,
      canDeletePatients: true,
      canViewPayments: true,
      canAddPayments: true,
      canEditPayments: true,
      canDeletePayments: true,
      canViewReports: true,
      canManageAccounting: true,
      canManageSettings: true,
      canManageUsers: true,
      canManageTreatmentPlans: true,
      canManageSurveys: true,
      canEnterSessions: true,
      canManageSessionTargets: true,
      canViewSessionsReport: true,
    };

    // Default branch staff permissions — matches schema defaults in system_users:
    // add-only access, edit/delete reserved for admin per policy. Stored
    // per-user permissions from the database override this fallback.
    const branchPermissions = {
      canViewPatients: true,
      canAddPatients: true,
      canEditPatients: false,
      canDeletePatients: false,
      canViewPayments: true,
      canAddPayments: true,
      canEditPayments: false,
      canDeletePayments: false,
      canViewReports: true,
      canManageAccounting: false,
      canManageSettings: false,
      canManageUsers: false,
      canManageTreatmentPlans: false,
      canManageSurveys: true,
      canEnterSessions: false,
      canManageSessionTargets: false,
      canViewSessionsReport: false,
    };
    
    // Return stored permissions if available, else default based on admin status
    if (branchSession?.permissions) {
      return branchSession.permissions;
    }
    
    return isAdmin ? adminPermissions : branchPermissions;
  };

  // Admin code verification (legacy - uses same logic as branch login with admin branchId)
  app.post("/api/verify-admin", isAuthenticated, async (req, res) => {
    try {
      const parsed = verifyAdminSchema.parse(req.body);
      const { code } = parsed;
      const trimmedCode = code.trim();
      
      // Check for hashed password first, then plaintext, then env variable
      const dbAdminPasswordHash = await storage.getSystemSetting("admin_password_hash");
      const dbAdminPassword = await storage.getSystemSetting("admin_password");
      const envAdminCode = process.env.ADMIN_CODE?.trim();
      
      let isValidPassword = false;
      let needsMigration = false;
      
      if (dbAdminPasswordHash) {
        isValidPassword = await bcrypt.compare(trimmedCode, dbAdminPasswordHash);
      } else if (dbAdminPassword) {
        isValidPassword = trimmedCode === dbAdminPassword;
        needsMigration = isValidPassword;
      } else if (envAdminCode) {
        isValidPassword = trimmedCode === envAdminCode;
        needsMigration = isValidPassword;
      }
      
      if (isValidPassword) {
        // Auto-migrate: hash plaintext password on successful login
        if (needsMigration) {
          const hashedPassword = await bcrypt.hash(trimmedCode, 10);
          await storage.setSystemSetting("admin_password_hash", hashedPassword);
          await storage.setSystemSetting("admin_password", "");
        }
        res.json({ success: true });
      } else {
        res.status(401).json({ message: "الكود غير صحيح" });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Branch password verification - supports both system_users and legacy auth
  app.post("/api/verify-branch", async (req, res) => {
    try {
      const parsed = verifyBranchSchema.parse(req.body);
      const { branchKey, username, password, shift } = parsed;
      const trimmedInput = password.trim();
      const normalizedBranchKey = branchKey.toLowerCase().trim();
      const normalizedUsername = username.toLowerCase().trim();
    
      console.log("Branch verification attempt:", { branchKey: normalizedBranchKey, username: normalizedUsername, passwordLength: password?.length });
    
      // ===== NEW: Try system_users table first =====
      const systemUser = await storage.getSystemUserByUsername(normalizedUsername);
      
      if (systemUser && systemUser.isActive && systemUser.passwordHash) {
        // User found in system_users table - verify password
        const isValidPassword = await bcrypt.compare(trimmedInput, systemUser.passwordHash);
        
        if (isValidPassword) {
          const isAdmin = systemUser.role === "admin";
          const isBranchManager = systemUser.role === "branch_manager";

          // Multi-branch resolution. accessibleBranches is the full
          // list this user can act on. For legacy single-branch users
          // it's just [branchId]. The active branchId starts as the
          // first entry; the user can switch via /api/auth/switch-branch.
          const branchIdsRaw: number[] = Array.isArray(systemUser.branchIds) ? systemUser.branchIds as number[] : [];
          const accessibleBranches: number[] = branchIdsRaw.length > 0
            ? branchIdsRaw
            : (systemUser.branchId ? [systemUser.branchId] : []);
          const userBranchId = isAdmin ? 0 : (accessibleBranches[0] ?? 0);

          // For non-admin users, verify the selected branch matches one
          // of their assigned branches. Multi-branch users can pick any
          // of their branches at login time and we'll respect it.
          if (!isAdmin && accessibleBranches.length > 0) {
            const branchMapping = usernameToBranch[normalizedBranchKey];
            if (branchMapping && branchMapping.branchId !== "admin" && typeof branchMapping.branchId === "number") {
              if (!accessibleBranches.includes(branchMapping.branchId)) {
                return res.status(401).json({ message: "لا يمكنك الدخول إلى هذا الفرع" });
              }
            }
          }

          // Get branch name for the active branch.
          let branchName = "مسؤول النظام";
          if (!isAdmin && userBranchId) {
            const branch = await storage.getBranch(userBranchId);
            branchName = branch?.name || "فرع غير معروف";
          }

          const userShift = (systemUser.role === "reception" || systemUser.role === "therapist") ? (shift || "auto") : "auto";

          // Branch-manager role acts as a full admin within their assigned
          // branch — every functional permission is auto-granted regardless
          // of what's stored on the row, so the admin doesn't have to flip
          // a dozen toggles every time a branch manager is created. We do
          // NOT set isAdmin=true: cross-branch routes (every-branch
          // reports, system settings, branch creation, etc.) stay locked
          // to the system admin only.
          // Reception staff are the ones running the post-visit patient
          // satisfaction surveys, so they always get canManageSurveys
          // regardless of the row value.
          const grantAll = isBranchManager;
          const isReception = systemUser.role === "reception";
          const permissions = {
            canViewPatients: grantAll || systemUser.canViewPatients,
            canAddPatients: grantAll || systemUser.canAddPatients,
            canEditPatients: grantAll || systemUser.canEditPatients,
            canDeletePatients: grantAll || systemUser.canDeletePatients,
            canViewPayments: grantAll || systemUser.canViewPayments,
            canAddPayments: grantAll || systemUser.canAddPayments,
            canEditPayments: grantAll || systemUser.canEditPayments,
            canDeletePayments: grantAll || systemUser.canDeletePayments,
            canViewReports: grantAll || systemUser.canViewReports,
            canManageAccounting: grantAll || systemUser.canManageAccounting,
            // Narrow "add expenses" grant. Full accounting managers implicitly
            // have it; otherwise it's the explicit per-user flag.
            canAddExpenses: grantAll || Boolean(systemUser.canManageAccounting) || Boolean(systemUser.canAddExpenses),
            canManageSettings: grantAll || systemUser.canManageSettings,
            canManageUsers: grantAll || systemUser.canManageUsers,
            canManageTreatmentPlans: grantAll || systemUser.canManageTreatmentPlans,
            canManageSurveys: grantAll || isReception || systemUser.canManageSurveys,
            // Visit permissions. Edit follows the manager grant-all
            // pattern, but delete is destructive and silent, so it
            // never auto-grants — even a branch_manager must have the
            // explicit canDeleteVisits flag set on their user row.
            canEditVisits: grantAll || systemUser.canEditVisits,
            canDeleteVisits: Boolean(systemUser.canDeleteVisits),
            // Sessions module (migration 009): admin and branch_manager
            // get all three; reception gets entry; anyone else uses the
            // toggles set on their row.
            canEnterSessions: isAdmin || grantAll || isReception || systemUser.canEnterSessions,
            canManageSessionTargets: isAdmin || grantAll || systemUser.canManageSessionTargets,
            canViewSessionsReport: isAdmin || grantAll || systemUser.canViewSessionsReport,
            // Prosthetics-expert capability (independent of primary role). A
            // pure expert (role === prosthetics_expert) implicitly works as an
            // expert too; anyone else needs the explicit flag on their row.
            canWorkAsExpert: systemUser.role === "prosthetics_expert" || Boolean(systemUser.canWorkAsExpert),
            // Doctor capability. A user whose PRIMARY role is doctor carries it
            // implicitly; anyone else needs the explicit flag on their row —
            // the same shape as canWorkAsExpert above. Still never auto-granted
            // to managers or admins: signing a clinical record is a
            // professional act, not an administrative one. This copy only
            // drives the UI; every write re-reads the grant from the database
            // so a revocation applies immediately, not at next login.
            canWriteMedicalExam:
              systemUser.role === "doctor" || Boolean(systemUser.canWriteMedicalExam),
            // اعتمادُ الخصم والتبرّع — **علمٌ صريحٌ لا استنتاجٌ من دور**.
            // الخصمُ قرارٌ ماليّ لا سريريّ، فلا يُمنَح لكلّ من دورُه «طبيب»
            // كما تُمنَح كتابةُ المعاينة أعلاه. والمسؤولُ ومديرُ الفرع
            // يمرّان بسلطتهما في `canApproveServiceDiscount` نفسِها، لا
            // بهذا العَلَم — فهو لتخويل مَن دورُه شيءٌ آخر.
            canApproveDiscount: Boolean(systemUser.canApproveDiscount),
          };

          // Store session with user permissions
          (req.session as any).branchSession = {
            branchId: userBranchId,
            // Full set of branches this user can switch between. Used
            // by the branch-switcher in the header.
            accessibleBranches,
            isAdmin: isAdmin,
            userId: systemUser.id,
            role: systemUser.role,
            displayName: systemUser.displayName,
            shift: userShift,
            language: systemUser.language || "ar",
            permissions,
          };

          console.log("System user authenticated:", { username: normalizedUsername, role: systemUser.role, branchId: userBranchId });

          // Login event into the existing audit_log so it shows up
          // alongside create/update/delete on the employee accuracy
          // panel. Fire-and-forget — never block the auth response.
          logAudit({
            entityType: "session",
            entityId: systemUser.id,
            action: "login",
            userId: systemUser.id,
            userName: systemUser.displayName,
            branchId: systemUser.branchId ?? null,
            ipAddress: req.ip ?? null,
            userAgent: req.get("user-agent") ?? null,
          }).catch(() => { /* logged inside */ });

          return res.json({
            branchId: userBranchId,
            branchName: branchName,
            accessibleBranches,
            isAdmin: isAdmin,
            userId: systemUser.id,
            displayName: systemUser.displayName,
            role: systemUser.role,
            shift: userShift,
            language: systemUser.language || "ar",
            permissions,
          });
        }
        // Password doesn't match for system user - don't fall through to legacy
        return res.status(401).json({ message: "كلمة السر غير صحيحة" });
      }
      
      // ===== LEGACY: Fall back to branch-based authentication =====
      // Check if branch key exists in mapping
      const branchMapping = usernameToBranch[normalizedBranchKey];
      if (!branchMapping) {
        return res.status(401).json({ message: "الفرع المحدد غير موجود" });
      }
      
      const { branchId, branchName } = branchMapping;
      
      // Verify username matches the branch key (legacy behavior)
      if (normalizedUsername !== normalizedBranchKey) {
        return res.status(401).json({ message: "اسم المستخدم غير صحيح لهذا الفرع" });
      }
      
      // Check if admin login
      if (branchId === "admin") {
        // Check for hashed password first, then plaintext, then env variable
        const dbAdminPasswordHash = await storage.getSystemSetting("admin_password_hash");
        const dbAdminPassword = await storage.getSystemSetting("admin_password");
        const envAdminCode = process.env.ADMIN_CODE?.trim();
        
        let isValidPassword = false;
        let needsMigration = false;
        
        if (dbAdminPasswordHash) {
          // Compare with hashed password
          isValidPassword = await bcrypt.compare(trimmedInput, dbAdminPasswordHash);
        } else if (dbAdminPassword) {
          // Legacy plaintext comparison
          isValidPassword = trimmedInput === dbAdminPassword;
          needsMigration = isValidPassword;
        } else if (envAdminCode) {
          // Fall back to environment variable
          isValidPassword = trimmedInput === envAdminCode;
          needsMigration = isValidPassword;
        }
        
        console.log("Admin code check:", { dbHashExists: !!dbAdminPasswordHash, dbExists: !!dbAdminPassword, envExists: !!envAdminCode, isValid: isValidPassword });
        
        if (isValidPassword) {
          // Auto-migrate: hash plaintext password on successful login
          if (needsMigration) {
            const hashedPassword = await bcrypt.hash(trimmedInput, 10);
            await storage.setSystemSetting("admin_password_hash", hashedPassword);
            await storage.setSystemSetting("admin_password", "");
          }
          // Store admin session info (legacy - full permissions)
          const legacyAdminPermissions = {
            canViewPatients: true,
            canAddPatients: true,
            canEditPatients: true,
            canDeletePatients: true,
            canViewPayments: true,
            canAddPayments: true,
            canEditPayments: true,
            canDeletePayments: true,
            canViewReports: true,
            canManageAccounting: true,
            canManageSettings: true,
            canManageUsers: true,
            canManageTreatmentPlans: true,
            canManageSurveys: true,
            canEditVisits: true,
            canDeleteVisits: true,
            canEnterSessions: true,
            canManageSessionTargets: true,
            canViewSessionsReport: true,
          };
          (req.session as any).branchSession = {
            branchId: 0,
            isAdmin: true,
            shift: "auto",
            permissions: legacyAdminPermissions,
          };
          return res.json({
            branchId: 0,
            branchName: "مسؤول النظام",
            isAdmin: true,
            role: "admin",
            shift: "auto",
            permissions: legacyAdminPermissions,
          });
        }
        return res.status(401).json({ message: "كلمة سر المسؤول غير صحيحة" });
      }

      // ===== LEGACY BRANCH-SHARED LOGIN — DISABLED =====
      // Previously every branch had a single shared password that any
      // staff member could use. That meant a person who knew the
      // shared key could log in without ever appearing in the
      // system_users table — invisible to the admin and impossible
      // to revoke individually. We've migrated every employee to a
      // proper system_users account, so this fallback is gone.
      //
      // The "admin" branch key above stays as the last-resort
      // recovery path for the system owner. Everything else now
      // requires a real account.
      console.warn(
        "[auth] Rejected legacy branch-shared login attempt:",
        { branchKey: normalizedBranchKey, username: normalizedUsername }
      );
      return res.status(401).json({
        message: "اسم المستخدم غير موجود أو كلمة السر غير صحيحة. تواصل مع مسؤول النظام لإنشاء حساب باسمك.",
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Switches the active branch for a multi-branch user. The new
  // branchId must be in the user's accessibleBranches list — admins
  // are not constrained because their branchId is 0 (cross-branch).
  // Updates session.branchId; subsequent requests will use the new
  // branch for all isolation checks.
  app.post("/api/auth/switch-branch", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const { branchId } = req.body ?? {};
    const targetBranchId = Number(branchId);
    if (!Number.isFinite(targetBranchId) || targetBranchId <= 0) {
      return res.status(400).json({ message: "معرّف الفرع غير صالح" });
    }
    const accessible: number[] = Array.isArray(branchSession?.accessibleBranches)
      ? branchSession.accessibleBranches
      : [];
    if (!branchSession?.isAdmin && !accessible.includes(targetBranchId)) {
      return res.status(403).json({ message: "هذا الفرع ليس ضمن صلاحيّاتك" });
    }
    const branch = await storage.getBranch(targetBranchId);
    if (!branch) return res.status(404).json({ message: "الفرع غير موجود" });

    (req.session as any).branchSession.branchId = targetBranchId;
    res.json({ branchId: targetBranchId, branchName: branch.name });
  });


  // Admin Settings API - Only for admins
  app.get("/api/admin/settings", isAuthenticated, async (req, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    
    const settings = await storage.getAllSystemSettings();
    const branches = await storage.getBranches();
    const branchPasswords = await storage.getAllBranchPasswords();
    
    const branchPasswordsWithNames = branches.map(branch => {
      const pw = branchPasswords.find(bp => bp.branchId === branch.id);
      const envKey = `BRANCH_PASSWORD_${branch.id}`;
      const envPassword = process.env[envKey]?.trim() || null;
      return {
        branchId: branch.id,
        branchName: branch.name,
        hasPassword: !!pw || !!envPassword,
        currentPassword: envPassword,
      };
    });
    
    res.json({
      settings: settings.map(s => ({ key: s.settingKey, hasValue: !!s.settingValue })),
      branches: branchPasswordsWithNames
    });
  });
  
  // Update admin password
  // Self-service password change for any staff account (owner, 2026-07-30).
  // The employee proves the CURRENT password first, so a device left unlocked
  // can't be used to lock its owner out. The new password is stored hashed AND
  // in the admin-only plaintext column, so the owner keeps seeing it on the
  // users screen exactly as before — that was the owner's condition.
  //
  // The legacy "admin" key has no system_users row (no userId on the session),
  // so it can't use this route; it keeps its own endpoint below.
  app.post("/api/auth/change-password", isAuthenticated, async (req, res) => {
    const branchSession = (req.session as any).branchSession;
    const userId = branchSession?.userId;
    if (!userId) {
      return res.status(400).json({ message: "هذا الحساب لا يملك كلمة سر شخصية — غيّرها من إعدادات المسؤول" });
    }

    const currentPassword = String(req.body?.currentPassword ?? "").trim();
    const newPassword = String(req.body?.newPassword ?? "").trim();
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "أدخل كلمة السر الحالية والجديدة" });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ message: "كلمة السر الجديدة قصيرة جداً (٤ أحرف على الأقل)" });
    }

    const user = await storage.getSystemUser(userId);
    if (!user || user.isActive === false) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "كلمة السر الحالية غير صحيحة" });
    }

    await storage.updateSystemUser(userId, {
      passwordHash: await bcrypt.hash(newPassword, 10),
      passwordPlain: newPassword, // admin-only visibility, unchanged behaviour
    } as any);

    // Audited like every other account change — the value itself is never logged.
    await logAudit({
      entityType: "system_user",
      entityId: userId,
      action: "update",
      userId,
      userName: branchSession?.displayName ?? null,
      branchId: branchSession?.branchId ?? null,
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
      newValues: { passwordChangedBySelf: true },
    });

    res.json({ ok: true });
  });

  app.post("/api/admin/settings/admin-password", isAuthenticated, async (req, res) => {
    try {
      const branchSession = (req.session as any).branchSession;
      if (!branchSession?.isAdmin) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      
      const parsed = adminPasswordSchema.parse(req.body);
      const { currentPassword, newPassword } = parsed;
      
      // Check if password is hashed (starts with $2) or plaintext
      const dbAdminPasswordHash = await storage.getSystemSetting("admin_password_hash");
      const dbAdminPassword = await storage.getSystemSetting("admin_password");
      const envAdminCode = process.env.ADMIN_CODE?.trim();
      
      let isValidPassword = false;
      
      if (dbAdminPasswordHash) {
        // Compare with hashed password
        isValidPassword = await bcrypt.compare(currentPassword.trim(), dbAdminPasswordHash);
      } else if (dbAdminPassword) {
        // Legacy plaintext comparison
        isValidPassword = currentPassword.trim() === dbAdminPassword;
      } else if (envAdminCode) {
        // Fall back to environment variable
        isValidPassword = currentPassword.trim() === envAdminCode;
      }
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "كلمة المرور الحالية غير صحيحة" });
      }
      
      // Hash and store new password
      const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
      await storage.setSystemSetting("admin_password_hash", hashedPassword);
      // Remove plaintext password if it exists
      await storage.setSystemSetting("admin_password", "");
      
      res.json({ success: true, message: "تم تغيير كلمة مرور المسؤول بنجاح" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });
  
  // Update branch password
  app.post("/api/admin/settings/branch-password", isAuthenticated, async (req, res) => {
    try {
      const branchSession = (req.session as any).branchSession;
      if (!branchSession?.isAdmin) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      
      const parsed = branchPasswordSchema.parse(req.body);
      const { branchId, newPassword } = parsed;
      
      // Hash and store new branch password
      const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
      await storage.setBranchPassword(branchId, hashedPassword);
      
      res.json({ success: true, message: "تم تغيير كلمة مرور الفرع بنجاح" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });
  
  // Update backup email
  app.post("/api/admin/settings/backup-email", isAuthenticated, async (req, res) => {
    try {
      const branchSession = (req.session as any).branchSession;
      if (!branchSession?.isAdmin) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      
      const parsed = backupEmailSchema.parse(req.body);
      const { email } = parsed;
      
      await storage.setSystemSetting("backup_email", email.trim());
      res.json({ success: true, message: "تم حفظ البريد الإلكتروني الاحتياطي" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });
  
  // Get backup email (for display)
  app.get("/api/admin/settings/backup-email", isAuthenticated, async (req, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    
    const email = await storage.getSystemSetting("backup_email");
    res.json({ email: email || "" });
  });

  // ── Telegram notification settings (admin) ────────────────────────────
  // Token + chat id live in system_settings so the owner configures them from
  // the panel with no redeploy. The token is never echoed back in full.
  app.get("/api/admin/settings/telegram", isAuthenticated, async (req, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) return res.status(403).json({ message: "غير مصرح" });
    const token = await storage.getSystemSetting(TELEGRAM_SETTINGS.SETTING_TOKEN);
    const chatId = await storage.getSystemSetting(TELEGRAM_SETTINGS.SETTING_CHAT_ID);
    res.json({
      hasToken: Boolean(token),
      tokenPreview: token ? `…${token.slice(-6)}` : "",
      chatId: chatId || "",
    });
  });

  app.post("/api/admin/settings/telegram", isAuthenticated, async (req, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) return res.status(403).json({ message: "غير مصرح" });
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    if (token) {
      await storage.setSystemSetting(TELEGRAM_SETTINGS.SETTING_TOKEN, token);
      // A new bot means the old chat id may belong to the old bot — re-resolve
      // on the next test instead of silently pinging the wrong chat.
      await storage.setSystemSetting(TELEGRAM_SETTINGS.SETTING_CHAT_ID, "");
    }
    const chatId = typeof req.body?.chatId === "string" ? req.body.chatId.trim() : undefined;
    if (chatId !== undefined && chatId !== "") {
      await storage.setSystemSetting(TELEGRAM_SETTINGS.SETTING_CHAT_ID, chatId);
    }
    res.json({ success: true, message: "حُفظت إعدادات تلغرام" });
  });

  app.post("/api/admin/settings/telegram/test", isAuthenticated, async (req, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) return res.status(403).json({ message: "غير مصرح" });
    res.json(await testAndLink());
  });

  // Get backup status
  app.get("/api/admin/backup-status", isAuthenticated, async (req, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    
    try {
      const { getBackupStatus } = await import("./backup");
      const status = await getBackupStatus();
      res.json(status);
    } catch (error) {
      console.error("Backup status error:", error);
      res.status(500).json({ lastBackup: null, hoursAgo: null });
    }
  });

  // Send manual backup email with filter options
  app.post("/api/admin/send-backup", isAuthenticated, async (req, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    
    try {
      const { sendManualBackup } = await import("./backup");
      const { filterType = "all", branchId } = req.body;
      const filter = { 
        type: filterType as "all" | "today" | "branch" | "branch_today", 
        branchId: branchId ? Number(branchId) : undefined 
      };
      const result = await sendManualBackup(filter);
      if (result.success) {
        res.json({ 
          success: true, 
          message: `تم إرسال النسخة الاحتياطية بنجاح (${result.count} مريض - ${result.filterDescription})` 
        });
      } else {
        res.status(500).json({ success: false, message: "فشل إرسال النسخة الاحتياطية. تأكد من إعداد GMAIL_USER و GMAIL_APP_PASSWORD" });
      }
    } catch (error) {
      console.error("Backup error:", error);
      res.status(500).json({ success: false, message: "حدث خطأ أثناء إرسال النسخة الاحتياطية" });
    }
  });

  // Branch Management API - Admin only
  const createBranchSchema = z.object({
    name: z.string().min(2, "اسم الفرع مطلوب"),
    location: z.string().optional().nullable(),
    password: z.string().min(4, "كلمة المرور يجب أن تكون 4 أحرف على الأقل").optional()
  });

  const updateBranchSettingsSchema = z.object({
    branchId: z.number(),
    showPatients: z.boolean().optional(),
    showVisits: z.boolean().optional(),
    showPayments: z.boolean().optional(),
    showDocuments: z.boolean().optional(),
    showStatistics: z.boolean().optional(),
    showAccounting: z.boolean().optional(),
    showExpenses: z.boolean().optional()
  });

  // Create new branch
  app.post("/api/admin/branches", isAuthenticated, async (req, res) => {
    try {
      const branchSession = (req.session as any).branchSession;
      if (!branchSession?.isAdmin) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      
      const parsed = createBranchSchema.parse(req.body);
      const { name, location, password } = parsed;
      
      // Create the branch
      const branch = await storage.createBranch({ name, location });
      
      // If password provided, set it (hashed)
      if (password) {
        const hashedPassword = await bcrypt.hash(password.trim(), 10);
        await storage.setBranchPassword(branch.id, hashedPassword);
      }
      
      // Create default settings (all visible)
      await storage.setBranchSettings(branch.id, {
        showPatients: true,
        showVisits: true,
        showPayments: true,
        showDocuments: true,
        showStatistics: true,
        showAccounting: true,
        showExpenses: true
      });
      
      res.json({ success: true, branch });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      // Check for unique constraint violation
      if ((err as any)?.code === '23505') {
        return res.status(400).json({ message: "اسم الفرع موجود مسبقاً" });
      }
      throw err;
    }
  });

  // Delete branch
  app.delete("/api/admin/branches/:id", isAuthenticated, async (req, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    
    const branchId = Number(req.params.id);
    if (isNaN(branchId)) {
      return res.status(400).json({ message: "معرف الفرع غير صالح" });
    }
    
    const result = await storage.deleteBranch(branchId);
    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }
    
    res.json({ success: true, message: "تم حذف الفرع بنجاح" });
  });

  // Get branch settings (admin only)
  app.get("/api/admin/branches/:id/settings", isAuthenticated, async (req, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    
    const branchId = Number(req.params.id);
    if (isNaN(branchId)) {
      return res.status(400).json({ message: "معرف الفرع غير صالح" });
    }
    
    const settings = await storage.getBranchSettings(branchId);
    res.json(settings || {
      branchId,
      showPatients: true,
      showVisits: true,
      showPayments: true,
      showDocuments: true,
      showStatistics: true,
      showAccounting: true,
      showExpenses: true
    });
  });

  // Get current branch settings (for any authenticated user)
  app.get("/api/branch-settings", isAuthenticated, async (req, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession) {
      return res.status(401).json({ message: "يرجى تسجيل الدخول أولاً" });
    }
    
    // Admin users get all features enabled by default
    if (branchSession.isAdmin) {
      return res.json({
        branchId: 0,
        showDashboard: true,
        showPatients: true,
        showPayments: true,
        showAccounting: true,
        showStatistics: true
      });
    }
    
    const branchId = branchSession.branchId;
    const settings = await storage.getBranchSettings(branchId);
    res.json({
      branchId,
      showDashboard: settings?.showDashboard ?? true,
      showPatients: settings?.showPatients ?? true,
      showPayments: settings?.showPayments ?? true,
      showAccounting: settings?.showAccounting ?? true,
      showStatistics: settings?.showStatistics ?? true
    });
  });

  // Get all branches with settings and patient counts
  app.get("/api/admin/branches/full", isAuthenticated, async (req, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    
    const allBranches = await storage.getBranches();
    const allSettings = await storage.getAllBranchSettings();
    const allPasswords = await storage.getAllBranchPasswords();
    
    const branchesWithDetails = await Promise.all(
      allBranches.map(async (branch) => {
        const settings = allSettings.find(s => s.branchId === branch.id);
        const envKey = `BRANCH_PASSWORD_${branch.id}`;
        const envPassword = process.env[envKey]?.trim() || null;
        const hasPassword = allPasswords.some(p => p.branchId === branch.id) || !!envPassword;
        const patientCount = await storage.getBranchPatientCount(branch.id);
        
        return {
          ...branch,
          patientCount,
          hasPassword,
          currentPassword: envPassword,
          settings: {
            showDashboard: settings?.showDashboard ?? true,
            showPatients: settings?.showPatients ?? true,
            showPayments: settings?.showPayments ?? true,
            showAccounting: settings?.showAccounting ?? true,
            showStatistics: settings?.showStatistics ?? true
          }
        };
      })
    );
    
    res.json(branchesWithDetails);
  });

  // Update branch settings
  app.post("/api/admin/branches/settings", isAuthenticated, async (req, res) => {
    try {
      const branchSession = (req.session as any).branchSession;
      if (!branchSession?.isAdmin) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      
      const parsed = updateBranchSettingsSchema.parse(req.body);
      const { branchId, ...settingsUpdate } = parsed;
      
      const settings = await storage.setBranchSettings(branchId, settingsUpdate);
      res.json({ success: true, settings });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // ========== System Users Management ==========
  
  // Get all system users (admin only)
  app.get("/api/admin/users", isAuthenticated, async (req, res) => {
    try {
      const branchSession = (req.session as any).branchSession;
      if (!branchSession?.isAdmin) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      
      const users = await storage.getSystemUsers();
      // Remove password hashes from response
      const safeUsers = users.map(u => ({ ...u, passwordHash: undefined }));
      res.json(safeUsers);
    } catch (err) {
      throw err;
    }
  });

  // Create system user (admin only)
  app.post("/api/admin/users", isAuthenticated, async (req, res) => {
    try {
      const branchSession = (req.session as any).branchSession;
      if (!branchSession?.isAdmin) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      
      const { password, ...userData } = req.body;

      // Expert capability flag: normalise to a real boolean (a "false" string
      // would be truthy). Independent of the primary role.
      if (userData.canWorkAsExpert !== undefined) {
        userData.canWorkAsExpert = userData.canWorkAsExpert === true || userData.canWorkAsExpert === "true";
      }
      if (userData.canAddExpenses !== undefined) {
        userData.canAddExpenses = userData.canAddExpenses === true || userData.canAddExpenses === "true";
      }
      // Doctor capability + the specialties it covers. An empty specialty list
      // makes the flag a no-op by design, so the two always travel together.
      if (userData.canWriteMedicalExam !== undefined) {
        userData.canWriteMedicalExam =
          userData.canWriteMedicalExam === true || userData.canWriteMedicalExam === "true";
      }
      // اعتمادُ الخصم — نفسُ التطبيع: نصُّ "false" صادقٌ لو تُرك كما ورد.
      if (userData.canApproveDiscount !== undefined) {
        userData.canApproveDiscount =
          userData.canApproveDiscount === true || userData.canApproveDiscount === "true";
      }
      if (userData.medicalSpecialties !== undefined) {
        const raw = Array.isArray(userData.medicalSpecialties) ? userData.medicalSpecialties : [];
        userData.medicalSpecialties = raw.filter(isMedicalSpecialty);
      }

      if (!userData.username || userData.username.length < 1) {
        return res.status(400).json({ message: "اسم المستخدم مطلوب" });
      }
      
      if (!password || password.length < 4) {
        return res.status(400).json({ message: "كلمة المرور يجب أن تكون 4 أحرف على الأقل" });
      }
      
      if (!userData.role || !["admin", "branch_manager", "accountant", "reception", "therapist", "surveyor", "prosthetics_expert", "doctor"].includes(userData.role)) {
        return res.status(400).json({ message: "الدور غير صالح" });
      }
      
      // Normalise branchIds: accept either a JSON array or an
      // empty/undefined value. Branch managers may belong to several
      // branches; everyone else has at most one.
      const incomingBranchIds = Array.isArray(userData.branchIds)
        ? (userData.branchIds as unknown[])
            .map((x) => Number(x))
            .filter((x) => Number.isFinite(x) && x > 0)
        : [];
      // If multi-branch is provided, the primary branchId defaults to
      // the first one for back-compat with older queries that read
      // branchId directly.
      if (incomingBranchIds.length > 0 && !userData.branchId) {
        userData.branchId = incomingBranchIds[0];
      }
      userData.branchIds = incomingBranchIds;

      // Non-admin users require a branch
      if (userData.role !== "admin" && !userData.branchId && incomingBranchIds.length === 0) {
        return res.status(400).json({ message: "الفرع مطلوب لغير المسؤولين" });
      }

      // Check if username already exists
      const existing = await storage.getSystemUserByUsername(userData.username);
      if (existing) {
        return res.status(400).json({ message: "اسم المستخدم موجود مسبقاً" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      const user = await storage.createSystemUser({
        ...userData,
        passwordHash,
        passwordPlain: password, // admin-only visibility
      });

      res.json({ ...user, passwordHash: undefined, passwordPlain: undefined });
    } catch (err) {
      throw err;
    }
  });

  // Update system user (admin only)
  app.patch("/api/admin/users/:id", isAuthenticated, async (req, res) => {
    try {
      const branchSession = (req.session as any).branchSession;
      if (!branchSession?.isAdmin) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      
      const id = Number(req.params.id);
      const { password, ...userData } = req.body;

      // Expert capability flag: normalise to a real boolean when present.
      if (userData.canWorkAsExpert !== undefined) {
        userData.canWorkAsExpert = userData.canWorkAsExpert === true || userData.canWorkAsExpert === "true";
      }
      if (userData.canAddExpenses !== undefined) {
        userData.canAddExpenses = userData.canAddExpenses === true || userData.canAddExpenses === "true";
      }
      // Doctor capability + the specialties it covers. An empty specialty list
      // makes the flag a no-op by design, so the two always travel together.
      if (userData.canWriteMedicalExam !== undefined) {
        userData.canWriteMedicalExam =
          userData.canWriteMedicalExam === true || userData.canWriteMedicalExam === "true";
      }
      // اعتمادُ الخصم — نفسُ التطبيع: نصُّ "false" صادقٌ لو تُرك كما ورد.
      if (userData.canApproveDiscount !== undefined) {
        userData.canApproveDiscount =
          userData.canApproveDiscount === true || userData.canApproveDiscount === "true";
      }
      if (userData.medicalSpecialties !== undefined) {
        const raw = Array.isArray(userData.medicalSpecialties) ? userData.medicalSpecialties : [];
        userData.medicalSpecialties = raw.filter(isMedicalSpecialty);
      }

      // Validate role if provided
      if (userData.role && !["admin", "branch_manager", "accountant", "reception", "therapist", "surveyor", "prosthetics_expert", "doctor"].includes(userData.role)) {
        return res.status(400).json({ message: "الدور غير صالح" });
      }

      // Multi-branch normalisation, same shape as the create handler.
      if (userData.branchIds !== undefined) {
        const incoming = Array.isArray(userData.branchIds)
          ? (userData.branchIds as unknown[])
              .map((x) => Number(x))
              .filter((x) => Number.isFinite(x) && x > 0)
          : [];
        userData.branchIds = incoming;
        if (incoming.length > 0 && !userData.branchId) {
          userData.branchId = incoming[0];
        }
      }

      // Non-admin users require a branch (single or multi)
      if (userData.role && userData.role !== "admin" && !userData.branchId &&
          (!Array.isArray(userData.branchIds) || userData.branchIds.length === 0)) {
        return res.status(400).json({ message: "الفرع مطلوب لغير المسؤولين" });
      }

      // If password is being updated, hash it
      let updateData = { ...userData };
      if (password && password.length >= 4) {
        updateData.passwordHash = await bcrypt.hash(password, 10);
        updateData.passwordPlain = password; // admin-only visibility
      }
      
      // If username is being changed, check if it already exists
      if (userData.username) {
        const existing = await storage.getSystemUserByUsername(userData.username);
        if (existing && existing.id !== id) {
          return res.status(400).json({ message: "اسم المستخدم موجود مسبقاً" });
        }
      }
      
      const user = await storage.updateSystemUser(id, updateData);
      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }

      res.json({ ...user, passwordHash: undefined, passwordPlain: undefined });
    } catch (err) {
      throw err;
    }
  });

  // Delete system user (admin only)
  app.delete("/api/admin/users/:id", isAuthenticated, async (req, res) => {
    try {
      const branchSession = (req.session as any).branchSession;
      if (!branchSession?.isAdmin) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      
      const id = Number(req.params.id);
      await storage.deleteSystemUser(id);
      res.json({ success: true });
    } catch (err) {
      throw err;
    }
  });

  // Export all patients to CSV (admin only)
  app.get("/api/admin/export/patients", isAuthenticated, async (req, res) => {
    try {
      const branchSession = (req.session as any).branchSession;
      if (!branchSession?.isAdmin) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      
      const patients = await storage.getPatients();
      const branches = await storage.getBranches();
      const branchMap = new Map(branches.map(b => [b.id, b.name]));
      
      // CSV header with Arabic column names
      const headers = [
        "رقم المريض",
        "الاسم",
        "العمر",
        "رقم الهاتف",
        "العنوان",
        "الجهة المحول منها",
        "الحالة الطبية",
        "الفرع",
        "الوزن",
        "الطول",
        "سبب الإصابة",
        "تاريخ الإصابة",
        "ملاحظات عامة",
        "حالة بتر",
        "موقع البتر",
        "نوع الطرف",
        "نوع السليكون",
        "حجم السليكون",
        "نظام التعليق",
        "نوع القدم",
        "حجم القدم",
        "نوع مفصل الركبة",
        "حالة علاج طبيعي",
        "نوع المرض",
        "نوع العلاج",
        "مساند طبية",
        "نوع المسند",
        "جهة الإصابة",
        "التكلفة الإجمالية",
        "تاريخ التسجيل"
      ];
      
      // Build CSV rows
      const rows = patients.map(p => [
        p.id,
        p.name,
        p.age || "",
        p.phone || "",
        p.address || "",
        p.referralSource || "",
        p.medicalCondition === "amputee" ? "بتر" : p.medicalCondition === "physiotherapy" ? "علاج طبيعي" : "مساند طبية",
        branchMap.get(p.branchId) || "",
        p.weight || "",
        p.height || "",
        p.injuryCause || "",
        p.injuryDate || "",
        p.generalNotes || "",
        p.isAmputee ? "نعم" : "لا",
        p.amputationSite || "",
        p.prostheticType || "",
        p.siliconType || "",
        p.siliconSize || "",
        p.suspensionSystem || "",
        p.footType || "",
        p.footSize || "",
        p.kneeJointType || "",
        p.isPhysiotherapy ? "نعم" : "لا",
        p.diseaseType || "",
        p.treatmentType || "",
        p.isMedicalSupport ? "نعم" : "لا",
        p.supportType || "",
        p.injurySide || "",
        p.totalCost || 0,
        p.createdAt ? new Date(p.createdAt).toLocaleDateString("ar-IQ") : ""
      ]);
      
      // Escape CSV values
      const escapeCSV = (val: any) => {
        const str = String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      
      // Generate CSV content with BOM for Arabic support
      const BOM = "\uFEFF";
      const csvContent = BOM + [
        headers.join(","),
        ...rows.map(row => row.map(escapeCSV).join(","))
      ].join("\n");
      
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=patients_export.csv");
      res.send(csvContent);
    } catch (err) {
      throw err;
    }
  });

  // Branches
  app.get(api.branches.list.path, isAuthenticated, async (req, res) => {
    const branches = await storage.getBranches();
    res.json(branches);
  });

  // Patients
  app.get(api.patients.list.path, isAuthenticated, async (req, res) => {
    const ctx = getUserContext(req);
    const branchId = ctx.role === 'admin' ? undefined : ctx.branchId;
    const patients = await storage.getPatients(branchId);
    const patientIds = patients.map(p => p.id);

    // Batch-fetch visits, payments and merge aliases to avoid N+1 queries.
    // الأسماءُ البديلة تُجلب لمفاتيح هذه القائمة وحدها — وهي ما مرّ بتثبيت
    // الفرع أعلاه، فلا يتّسع نطاقٌ ولا يُقرأ مريضٌ لم يُقرأ.
    const [allVisits, allPayments, aliasByPatient, caseTypesByPatient] = await Promise.all([
      storage.getVisitsByPatientIds(patientIds),
      storage.getPaymentsByPatientIds(patientIds),
      aliasCodesByPatient(patientIds),
      //  دليلُ الانتماء للقسم. الأعلامُ وحدها تُخطئ: حالةٌ تُخلَق أيضاً من
      //  أمر تصنيع أو دفعةٍ موسومة، فمريضٌ بلا أعلامٍ قد يحمل حالةً حقيقية.
      storage.getCaseTypesByPatientIds(patientIds),
    ]);

    const visitsByPatient = new Map<number, typeof allVisits>();
    for (const v of allVisits) {
      const arr = visitsByPatient.get(v.patientId);
      if (arr) arr.push(v);
      else visitsByPatient.set(v.patientId, [v]);
    }

    const paymentsByPatient = new Map<number, typeof allPayments>();
    for (const p of allPayments) {
      const arr = paymentsByPatient.get(p.patientId);
      if (arr) arr.push(p);
      else paymentsByPatient.set(p.patientId, [p]);
    }

    const patientsWithRelations = patients.map(patient => ({
      ...patient,
      visits: visitsByPatient.get(patient.id) || [],
      payments: paymentsByPatient.get(patient.id) || [],
      caseTypes: caseTypesByPatient.get(patient.id) || [],
      //  يُحذف الحقل حين لا أسماء بديلة — والغالبية كذلك، فلا يثقل الردّ.
      ...(aliasByPatient.has(patient.id)
        ? { aliasCodes: aliasByPatient.get(patient.id) } : {}),
    }));

    res.json(patientsWithRelations);
  });

  // Lean, PAGINATED patients registry — powers the سجل المرضى page.
  // Unlike /api/patients (which ships every patient with ALL visits and
  // payments), this returns one small page of table-ready rows with a
  // payments SUM, so the registry opens fast no matter how many patients
  // exist. Filtering (search / branch / visit-date) runs in SQL.
  app.get("/api/patients/registry", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = Boolean(branchSession?.isAdmin);

    const page = Math.max(1, parseInt(String(req.query.page)) || 1);
    const pageSize = Math.min(10000, Math.max(1, parseInt(String(req.query.pageSize)) || 25));
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const visitDate = typeof req.query.visitDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.visitDate)
      ? req.query.visitDate : null;

    //  **والمحذوفُ لا يظهر في السجلّ** (ترحيل ٠٦٨) — لا في الصفحة ولا في
    //  العدّاد ولا في نتيجة بحثٍ باسمٍ أو رمز. وبابُه «المحذوفات» وحدها.
    const conditions: any[] = [activePatientDrizzle()];
    if (!isAdmin) {
      // Non-admins are always pinned to their own branch.
      conditions.push(eq(patients.branchId, branchSession?.branchId ?? -1));
    } else if (!search && req.query.branchId && req.query.branchId !== "all") {
      const b = parseInt(String(req.query.branchId));
      if (Number.isFinite(b)) conditions.push(eq(patients.branchId, b));
    }
    // ══ البحث برمز المريض (ترحيل ٠٥٢) ═════════════════════════════════
    // الرمز مقصودٌ بذاته: مَن يكتب WB-01629 لا يريد اسماً يحوي هذا النصّ.
    // فيُطبَّع أوّلاً (wb00042 · WB 00042 · ٠٠٠٤٢ ⟶ WB-00042)، ثمّ يُطابَق
    // على الرمز الحالي **وعلى الأسماء البديلة** — فرمزُ ملفٍّ دُمج ما زال
    // بيد صاحبه ويجب أن يصل إلى الملفّ الباقي.
    //
    // **ولا يتخطّى شيئاً من الحراسة**: الشرط يُضاف إلى نفس `conditions`
    // التي تحمل تثبيت الفرع لغير المسؤول. فمعرفة الرمز لا تُخرج موظّفاً من
    // فرعه — تماماً كالبحث بالاسم.
    // ══ البحث الموحَّد (ترحيل ٠٥٤) ═════════════════════════════════════
    // كان ثلاثة مسارات لا واحد: الرمز وحده، ثم `ILIKE` بتطبيعٍ جزئي، ثم لا
    // شيء. فالموظّف يكتب «احمذ» فلا يجد «أحمد»، ويكتب «٠٧٧٠» فلا يجد شيئاً.
    //
    // والآن شرطٌ واحد ورتبةٌ واحدة — **بنفس سلّم `shared/patient_search.ts`**
    // فما يتصدّر هنا يتصدّر في القوائم المحمَّلة في المتصفّح.
    //
    // **ولا يتخطّى شيئاً من الحراسة**: يُضاف إلى نفس `conditions` التي تحمل
    // تثبيت الفرع لغير المسؤول. فمعرفةُ الرمز أو الاسم لا تُخرج موظّفاً من
    // فرعه — تماماً كما كان.
    let searchRank: any = null;
    let searchTie: any = null;
    if (search) {
      const trigram = await hasTrigram(db);
      const built = buildPatientSearch(search, { trigram });
      conditions.push(built.where);
      searchRank = built.rank;
      searchTie = searchTieBreaker(search, { trigram });
    } else if (visitDate) {
      // ══ **«مرضى اليوم» تعني نشاطاً حقيقياً لا صفَّ زيارة** ═══════════
      //  كان الشرط يسأل جدول الزيارات وحده، والزيارةُ صفٌّ يُنشئه الموظّف
      //  بيده — فمريضٌ جاء اليوم واشترى ودفع ووقّع الطبيبُ معاينته يختفي
      //  من القائمة إن لم يفتح له أحدٌ زيارة. والموظّفُ الذي يرى ذلك يخترع
      //  زيارةً ليُظهره، فيتلوّث الجدولُ الذي تُبنى عليه كلُّ إحصاءة.
      //
      //  والتعريفُ الآن في `patient_activity` وحده — **يستعمله العدّادُ
      //  والصفوفُ معاً** لأنه شرطٌ واحد على `patients` نفسها، فلا يفترقان.
      conditions.push(patientActiveOnDate(visitDate));
    }
    const where = conditions.length ? and(...conditions) : sql`TRUE`;

    const [[{ count }], rows] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)::int` }).from(patients).where(where),
      db.select({
        id: patients.id, patientCode: patients.patientCode,
        name: patients.name, phone: patients.phone, age: patients.age,
        branchId: patients.branchId, medicalCondition: patients.medicalCondition,
        isAmputee: patients.isAmputee, isPhysiotherapy: patients.isPhysiotherapy,
        isMedicalSupport: patients.isMedicalSupport, amputationSite: patients.amputationSite,
        supportType: patients.supportType, diseaseType: patients.diseaseType,
        patientClassification: patients.patientClassification, totalCost: patients.totalCost,
        createdAt: patients.createdAt,
      }).from(patients).where(where)
        //  عند البحث: الأدقّ أوّلاً ثم الأقرب تشابهاً ثم الأحدث.
        //  وبلا بحث: **ترتيب السجلّ كما كان حرفاً بحرف** — الأحدث أوّلاً.
        .orderBy(...(searchRank
          ? [sql`${searchRank} ASC`, searchTie, sql`${patients.createdAt} DESC NULLS LAST`]
          : [sql`${patients.createdAt} DESC NULLS LAST`]))
        .limit(pageSize).offset((page - 1) * pageSize),
    ]);

    // Payment totals for just this page — one grouped query.
    const ids = rows.map((r) => r.id);
    const paidByPatient = new Map<number, number>();
    if (ids.length > 0) {
      const sums = await db.execute(sql`
        SELECT patient_id, COALESCE(SUM(amount), 0)::int AS total
        FROM payments WHERE patient_id IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})
        GROUP BY patient_id
      `);
      for (const r of sums.rows as any[]) paidByPatient.set(Number(r.patient_id), Number(r.total));
    }

    // ══ إسنادُ الخبير الفعّال لأجهزة هذه الصفحة ═══════════════════════
    // استعلامٌ واحد إضافي لمرضى الصفحة الظاهرة — لا واحدٌ لكل صفّ.
    //
    // و**البناء الأولي وحده**: أمرُ الصيانة له خبيرٌ أيضاً، لكنه عملٌ على
    // جهازٍ قائم لا إسنادُ تصنيعٍ لجهازٍ يُبنى. فاحتسابُه هنا كان سيخفي زرَّ
    // التخصيص عن مريضٍ ينتظره، ويقول «تم إسناد الطرف» لطرفٍ لم يُسنَد.
    //
    // والمنتهي لا يُحتسب: أمرٌ سُلّم أو أُلغي ليس إسناداً قائماً.
    const assignmentsByPatient = new Map<number, any[]>();
    if (ids.length > 0) {
      const assigns = await db.execute(sql`
        SELECT wo.id, wo.patient_id, wo.service_type, wo.device_episode_id,
               wo.expert_user_id, wo.status, wo.current_stage,
               u.display_name AS expert_name
          FROM prosthetic_work_orders wo
          LEFT JOIN system_users u ON u.id = wo.expert_user_id
         WHERE wo.patient_id IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})
           AND wo.status NOT IN ('completed', 'cancelled')
           AND COALESCE(wo.purpose, 'initial_build') = 'initial_build'
         ORDER BY wo.id
      `);
      for (const r of assigns.rows as any[]) {
        const pid = Number(r.patient_id);
        const list = assignmentsByPatient.get(pid) ?? [];
        list.push({
          serviceType: String(r.service_type),
          workOrderId: Number(r.id),
          deviceEpisodeId: r.device_episode_id === null ? null : Number(r.device_episode_id),
          expertUserId: r.expert_user_id === null ? null : Number(r.expert_user_id),
          expertName: r.expert_name ?? null,
          status: String(r.status),
          currentStage: String(r.current_stage),
        });
        assignmentsByPatient.set(pid, list);
      }
    }

    // Tab-badge counts: patients in the selected branch scope, and of those,
    // patients with a visit on the selected day — independent of the search.
    const badgeConds: any[] = [activePatientDrizzle()];
    if (!isAdmin) badgeConds.push(eq(patients.branchId, branchSession?.branchId ?? -1));
    else if (req.query.branchId && req.query.branchId !== "all") {
      const b = parseInt(String(req.query.branchId));
      if (Number.isFinite(b)) badgeConds.push(eq(patients.branchId, b));
    }
    const badgeWhere = badgeConds.length ? and(...badgeConds) : sql`TRUE`;
    const [[{ count: branchCount }], dateCountRow] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)::int` }).from(patients).where(badgeWhere),
      visitDate
        ? db.select({ count: sql<number>`COUNT(*)::int` }).from(patients).where(and(
            badgeWhere,
            sql`EXISTS (
              SELECT 1 FROM visits v
              WHERE v.patient_id = ${patients.id}
                AND v.deleted_at IS NULL
                AND ((v.visit_date AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Baghdad')::date = ${visitDate}::date
            )`,
          ))
        : Promise.resolve([{ count: 0 }]),
    ]);

    res.json({
      total: Number(count),
      page, pageSize,
      counts: { branch: Number(branchCount), date: Number((dateCountRow as any)[0]?.count ?? 0) },
      rows: rows.map((r) => ({
        ...r,
        totalPaid: paidByPatient.get(r.id) ?? 0,
        activeDeviceAssignments: assignmentsByPatient.get(r.id) ?? [],
      })),
    });
  });

  // "Is this person already on file at another centre?" — asked while the
  // receptionist types the name into the registration form.
  //
  // Why it exists (owner, 2026-08-06): reception only ever sees its OWN branch,
  // so a patient who moves between centres is invisible and a second file gets
  // opened for the same person — كاظم حيال مايع ended up with two, in two
  // branches, with the same amputation. The cure is to say so BEFORE the file
  // is created: reception then asks the manager to TRANSFER him (that endpoint
  // already exists and moves his whole history) instead of starting from zero.
  //
  // This deliberately reaches ACROSS the branch boundary reception normally
  // lives inside, so it returns the bare minimum needed to recognise a person
  // and act — name, phone, branch — and never the clinical or financial record.
  app.get("/api/patients/lookup-by-name", isAuthenticated, async (req, res) => {
    const branchSession = (req.session as any).branchSession;
    const canAsk = branchSession?.isAdmin
      || branchSession?.role === "branch_manager"
      || Boolean(branchSession?.permissions?.canAddPatients);
    if (!canAsk) return res.status(403).json({ message: "غير مصرح" });

    const name = String(req.query.name ?? "").trim();
    // Two characters find everybody; a real name is the point of the check.
    if (name.length < 3) return res.json({ matches: [] });

    const mine = accessibleBranchesFor(req); // null ⇒ admin sees everything
    const rows = await db
      .select({
        id: patients.id,
        name: patients.name,
        phone: patients.phone,
        patientCode: patients.patientCode,
        branchId: patients.branchId,
        branchName: branches.name,
        createdAt: patients.createdAt,
        deletedAt: patients.deletedAt,
        restoreUntil: patients.restoreUntil,
      })
      .from(patients)
      .leftJoin(branches, eq(branches.id, patients.branchId))
      .where(sql`${patients.name} ILIKE ${"%" + name + "%"}`)
      .limit(20);

    // Only the ones the asker CANNOT already see: a namesake inside their own
    // branch is their own list's business, not a cross-branch warning.
    const matches = mine === null
      ? []
      : rows.filter((r) => !r.deletedAt && !mine.includes(r.branchId));

    // ══ **والمحذوفُ يُنبَّه عليه ولا يُكشف** (ترحيل ٠٦٨) ═══════════════
    //  الملفُّ في السلّة لا يظهر في السجلّ ولا في البحث، فموظّفُ الاستقبال
    //  لا يراه ويفتح **ملفّاً ثانياً لنفس الشخص** بحسن نيّة — ثم يُستعاد
    //  الأوّل بعد أسبوع فيصير للمريض ملفّان ومالُه في اثنين.
    //
    //  والتنبيهُ هنا **لا يمرّ بنفس منطق «عبر الفروع»**: المحذوفُ غائبٌ عن
    //  السجلّ حتى داخل فرع السائل، فناظرُه في فرعه يستحقّ التنبيه أيضاً.
    const trashHits = rows.filter((r) =>
      r.deletedAt && (mine === null || mine.includes(r.branchId)));
    //  ومَن يملك السلّة يرى الصفَّ ليقرّر: استعادةً أو ملفّاً جديداً.
    //  ومَن لا يملكها يُقال له ما يكفي ليتوقّف — **بلا اسمٍ ولا رقمٍ ولا
    //  فرعٍ ولا ذكرِ سلّةٍ أصلاً**.
    const maySeeTrash = canTrashPatients((req.session as any).branchSession);
    res.json({
      matches,
      inTrash: maySeeTrash ? trashHits : [],
      inTrashCount: trashHits.length,
      trashNotice: trashHits.length === 0 ? null
        : maySeeTrash ? IN_TRASH_HINT : IN_TRASH_ESCALATION,
    });
  });

  app.get(api.patients.get.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    const patient = await storage.getPatient(id);
    const ctx = getUserContext(req);
    
    // Allow access if: admin, user has no branch assigned yet, or user's branch matches patient's branch
    const canAccess = ctx.role === 'admin' || !ctx.branchId || patient?.branchId === ctx.branchId;
    
    if (!patient || !canAccess) {
      return res.status(404).json({ message: "Patient not found or unauthorized" });
    }
    
    const [payments, documents, visits] = await Promise.all([
      storage.getPaymentsByPatientId(id),
      storage.getDocumentsByPatientId(id),
      storage.getVisitsByPatientId(id)
    ]);
    res.json({ ...patient, payments, documents, visits });
  });

  // Independent cases for a patient (Phase 1 of the per-case architecture).
  // Read-only; each case carries its own details/cost, and case-attributed
  // visits/payments totals so the UI can show a page per specialty.
  app.get("/api/patients/:id/cases", isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    const patient = await storage.getPatient(id);
    const branchSession = (req.session as any).branchSession;
    // Per-case financials (cost/paid/remaining): a PURE prosthetics expert is
    // financially locked out (same rule as the manufacturing module), and
    // everyone else needs view rights + the patient inside their branches.
    if (branchSession?.role === "prosthetics_expert") {
      return res.status(403).json({ message: "غير مصرح" });
    }
    const canView = branchSession?.isAdmin || branchSession?.role === "branch_manager" || branchSession?.permissions?.canViewPatients;
    if (!canView) return res.status(403).json({ message: "غير مصرح" });
    const allowedCases = accessibleBranchesFor(req);
    const canAccess = patient && (allowedCases === null || allowedCases.includes(patient.branchId));
    if (!patient || !canAccess) return res.status(404).json({ message: "Patient not found or unauthorized" });

    const [cases, payments, visits] = await Promise.all([
      storage.getCasesByPatientId(id),
      storage.getPaymentsByPatientId(id),
      storage.getVisitsByPatientId(id),
    ]);
    // A PURE doctor is financially locked out like the expert is — but unlike
    // the expert they DO work in the patient page, and the case rows are what
    // tell them which specialties this patient is being treated for. So the
    // cases are returned with the money stripped out at the source, rather than
    // 403'ing the endpoint (which would blank their clinical view) or trusting
    // the UI to hide fields the payload still carries.
    const financiallyBlind = branchSession?.role === "doctor";

    // Attach per-case paid total + visit count (case-attributed rows).
    const enriched = cases.map((c) => {
      const casePayments = payments.filter((p: any) => p.caseId === c.id);
      const caseVisits = visits.filter((v: any) => v.caseId === c.id);
      const paid = casePayments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
      if (financiallyBlind) {
        const { cost, costSource, ...clinical } = c as any;
        return { ...clinical, visitCount: caseVisits.length };
      }
      return {
        ...c,
        paid,
        remaining: (c.cost || 0) - paid,
        visitCount: caseVisits.length,
      };
    });
    res.json(enriched);
  });

  // Update a case's cost (admin / branch manager). Historical per-service costs
  // were never stored separately (only the aggregate total_cost), so this lets
  // staff set each case's real cost. It does NOT change patient.total_cost — so
  // the aggregate/financial reports are completely unaffected.
  app.patch("/api/patients/:id/cases/:caseId", isAuthenticated, async (req, res) => {
    const patientId = Number(req.params.id);
    const caseId = Number(req.params.caseId);
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const isManager = branchSession?.role === "branch_manager";
    if (!isAdmin && !isManager) return res.status(403).json({ message: "غير مصرح" });

    const patient = await storage.getPatient(patientId);
    if (!patient) return res.status(404).json({ message: "المريض غير موجود" });
    if (!isAdmin && branchSession?.branchId !== patient.branchId) return res.status(403).json({ message: "غير مصرح لك بهذا الفرع" });

    const cost = Number(req.body?.cost);
    if (!Number.isFinite(cost) || cost < 0) return res.status(400).json({ message: "قيمة غير صالحة" });

    // ══ لا التفاف على اعتماد السعر (ترحيل ٠٥٣) ═══════════════════════════
    // حالةُ جهازٍ تحت متابعةٍ حيّة سعرُها ما اعتمده الطبيب. ومديرُ الفرع
    // **ليس مستثنى**: هذه النقطة كانت بابَه المباشر إلى الرقم، فلو بقيت
    // مفتوحة لصار طلبُ التعديل واعتمادُه زينةً تُتجاوَز بضغطة.
    //
    // **ولا المسؤولُ العام مستثنى.** أن يملك صلاحية الاعتماد لا يعني أن
    // يتخطّى التاريخ: التعديل من هنا يترك الرقم يقفز بلا «كان كذا فصار
    // كذا» ولا مَن اعتمده. فليعتمد من بابه — الباب مفتوح له، وأثرُه يبقى.
    const caseRow = (await storage.getCasesByPatientId(patientId))
      .find((c: any) => c.id === caseId);
    if (caseRow
      && (caseRow.caseType === "prosthetic" || caseRow.caseType === "medical_support")
      && await followupStore.hasActiveFollowup({
        patientId, serviceType: caseRow.caseType as "prosthetic" | "medical_support",
      })) {
      return res.status(409).json({
        message: "سعر هذا الجهاز معتمد من الطبيب — التعديل يمرّ بطلب تعديل سعر يعتمده طبيب أو المسؤول العام",
      });
    }

    const updated = await storage.updateCaseCost(patientId, caseId, Math.round(cost));
    if (!updated) return res.status(404).json({ message: "الحالة غير موجودة" });
    await logAudit({
      entityType: "patient_case", entityId: caseId, action: "update",
      userId: branchSession?.userId ?? null, userName: branchSession?.displayName ?? null,
      branchId: patient.branchId, ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
      notes: `تعديل كلفة الحالة #${caseId} إلى ${Math.round(cost).toLocaleString()} د.ع`,
    });
    res.json(updated);
  });

  // Delete a case type from a patient — STRICTLY the general admin (owner's
  // rule: not even branch managers). Cleans ghost cases too. See
  // storage.deleteCaseType for the full safety model.
  app.delete("/api/patients/:id/case-type/:caseType", isAuthenticated, async (req, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) return res.status(403).json({ message: "حذف نوع الحالة للمدير العام حصراً" });
    const patientId = Number(req.params.id);
    const caseType = String(req.params.caseType);
    if (!["prosthetic", "medical_support", "physiotherapy"].includes(caseType)) {
      return res.status(400).json({ message: "نوع غير صالح" });
    }
    const patient = await storage.getPatient(patientId);
    if (!patient) return res.status(404).json({ message: "المريض غير موجود" });
    try {
      const r = await storage.deleteCaseType(patientId, caseType as any);
      await logAudit({
        entityType: "patient", entityId: patientId, action: "update",
        userId: branchSession?.userId ?? null, userName: branchSession?.displayName ?? null,
        branchId: patient.branchId, ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: `حذف نوع حالة ${caseType} (نُقل ${r.movedRows} صفاً للحالة المتبقية)`,
      });
      res.json({ ok: true, ...r });
    } catch (err: any) {
      res.status(409).json({ message: err?.message || "تعذّر الحذف" });
    }
  });

  app.post(api.patients.create.path, isAuthenticated, async (req, res) => {
    try {
      const branchSession = (req.session as any).branchSession;

      // Determine branchId. Non-admins are ALWAYS pinned to their own branch —
      // they cannot create a patient (or a manufacturing work order) for
      // another branch, even by forging branchId in the request body.
      let branchId = req.body.branchId;
      if (branchSession && !branchSession.isAdmin) {
        branchId = branchSession.branchId;
      }
      if (!branchId || branchId === 0) {
        return res.status(400).json({ message: "يجب اختيار الفرع" });
      }

      // ══ **لم يعد الاستقبالُ يُسأل «جديد أم قديم؟»** (ترحيل ٠٦٥) ════════
      //  كان السؤالُ إدارياً في ظاهره وسريرياً في باطنه: الجوابُ «قديم»
      //  يعني في التقارير «ملفُّه الورقيّ قديم»، ويعني في `isLegacyPatient`
      //  **إعفاءً من معاينة الطبيب**. فموظّفةُ الاستقبال تُجيب بصدقٍ إداريّ
      //  فيمضي مريضٌ إلى التصنيع بلا أن يراه طبيب — أثرٌ لم تقصده ولم تُخبَر
      //  به. وسؤالان مختلفان لا يُجابان بحقلٍ واحد.
      //
      //  فانفصلا: **الواقعةُ الإدارية** صارت `hadPriorCenterHistory` (مربّعٌ
      //  صريحٌ لا يعفي من شيء)، **والقرارُ السريريّ** صار `servicePath` على
      //  الحلقة يُسأل مرّةً لكلّ عملية.
      //
      //  ══ والعمودُ يبقى، وقيمتُه للجديد `'new'` ══════════════════════════
      //  لا يُحذَف (تقاريرُ الصفوف القائمة تقرؤه)، ولا يُترك فارغاً (تعود
      //  الفئةُ الثالثة بحكم الأمر الواقع). و`'new'` **هي الصدق**: هذا الصفُّ
      //  أُنشئ اليوم. وهي **الآمنة** كذلك — `'past'` كانت ستمنح كلَّ مسجَّلٍ
      //  جديد إعفاءَ المعاينة التاريخيّ.
      //
      //  **ولا يُقبل من العميل** في أيّ اتجاه: قيمةٌ في جسم الطلب تدّعي أن
      //  هذا الملفَّ «قديم» تدّعي معها إعفاءً لم يقرّره أحد. والتصحيحُ
      //  الإداريُّ بابُه «تعديل مريض» كما كان — مخرجُ الإدارة لم يُمَسّ.
      req.body.patientClassification = "new";

      //  ══ **وما يُسأل عنه الاستقبالُ فعلاً** ═════════════════════════════
      //  «سبق أن تعامل أو اشترى من المركز قبل تسجيله في النظام» — واقعةٌ
      //  يعرفها الموظّفُ من المريض نفسِه. **ولا يُشتقّ منها شيء**: لا إعفاءَ
      //  من معاينة، ولا جهازٌ، ولا حلقةٌ، ولا شراءٌ، ولا أمرُ تصنيع.
      //  وتُقرأ صرامةً — أيُّ قيمةٍ غير `true` تعني «لا».
      req.body.hadPriorCenterHistory = req.body?.hadPriorCenterHistory === true;

      // The amputation/device details are the doctor's decision. Only
      // management and doctors may pre-record them at registration; any other
      // session's values are dropped at the source — the UI hides the builder
      // for reception, and this makes the hiding real rather than cosmetic.
      const mayWriteClinical =
        branchSession?.isAdmin ||
        branchSession?.role === "branch_manager" ||
        branchSession?.role === "doctor" ||
        Boolean(branchSession?.permissions?.canWriteMedicalExam);
      const creationBody: any = { ...req.body };
      if (!mayWriteClinical) {
        for (const k of [
          // أطراف — `amputationSite` is deliberately ABSENT (owner, 2026-07-31):
          // reception records the amputation itself now, and the doctor's exam
          // opens carrying it. The DEVICE specs below stay the doctor's.
          "prostheticType", "siliconType", "siliconSize",
          "suspensionSystem", "footType", "footSize", "kneeJointType",
          // مساند: `supportType` و `injurySide` عادا للاستقبال أيضاً
          // (قرار المالك 2026-08-06) — المساند تُعامَل كالأطراف تماماً:
          // الاستقبال يسجّل القرار الأولي والطبيب يفتح عليه ويغيّره.
          // علاج طبيعي: `diseaseType` عاد للاستقبال (قرار المالك 2026-08-01) —
          // العلاج الطبيعي لا يشترط معاينة في أي فرع، فالاستقبال يُدخل كل شيء
          // والطبيب زيادة خير. (نقض صريح لقرار 2026-07-28.)
        ]) {
          delete creationBody[k];
        }
      }

      const input = api.patients.create.input.parse({
        ...creationBody,
        branchId
      });

      // ══ **بياناتٌ لا يُصنَع جهازٌ بدونها** ═════════════════════════════
      //  العمرُ والطولُ والوزن ليست حقولاً إدارية: الطرفُ يُصنَع عليها.
      //  ومريضُ البتر يزيد تعريفَ بترِه **منظَّماً** — نصٌّ حرٌّ لا يُصفّى
      //  ولا يُقرأ في أمر التصنيع.
      //
      //  **والخادمُ هو الحارس**: النموذجُ يُبرزها والخادمُ يردّها، فقيمةٌ
      //  افتراضية في واجهةٍ قديمة لا تُقرأ اختياراً من موظّف.
      const req0 = checkRequiredPatientData({
        age: input.age, height: (input as any).height, weight: (input as any).weight,
        isAmputee: (input as any).isAmputee === true,
        amputationSite: (input as any).amputationSite,
      });
      if (!req0.ok) {
        return res.status(400).json({ message: req0.message, missing: req0.missing });
      }

      // Patients are ALWAYS registered WITHOUT an expert — expert assignment is
      // a separate, later step ("تحديد خبير" from the patients registry), so the
      // add form no longer asks for an expert or a delivery date. Prosthetic /
      // support patients simply carry their flags; the "تحديد خبير" action
      // creates the work order (and the expert commits to the delivery date only
      // when they reach the mold stage).
      // ══ موافقةُ واتساب — **قرارُ الموظّف، مؤرَّخاً ومنسوباً** ═══════════
      //  الرايةُ تأتي من النموذج (افتراضُها مرفوعة)، والختمُ والمُقرِّر
      //  يكتبهما الخادمُ لا العميل: قيمةٌ في جسم الطلب تدّعي أن فلاناً وافق
      //  يومَ كذا ليست موافقة. وحين تُترك مطفأة لا يُكتب ختمٌ ولا اسم —
      //  فالفراغُ يقول «لا موافقةَ مسجَّلة» بصدق.
      const waEnabled = (input as any).whatsappNotificationsEnabled !== false;
      (input as any).whatsappNotificationsEnabled = waEnabled;
      (input as any).whatsappConsentAt = waEnabled ? new Date() : null;
      (input as any).whatsappConsentByUserId = waEnabled ? (branchSession?.userId ?? null) : null;

      const patient = await storage.createPatient(input);

      // كبسةٌ كي يصل الترحيبُ في ثوانٍ لا في دقيقة. **«أطلق وانسَ» وبعد
      // الحفظ** — فشلُها لا يعني شيئاً، والدورةُ الدورية تلتقط ما بقي،
      // ولا يمكن لها أن تُفشل تسجيلاً وقع وثُبِّت.
      if (patient.whatsappNotificationsEnabled) nudgeDispatcher();

      // Owner's instant ping. Fire-and-forget: a Telegram hiccup must never
      // fail or slow the registration itself.
      void (async () => {
        const branch = await storage.getBranch(patient.branchId);
        const services = [
          patient.isAmputee ? "أطراف صناعية" : null,
          patient.isMedicalSupport ? "مساند طبية" : null,
          patient.isPhysiotherapy ? "علاج طبيعي" : null,
        ].filter(Boolean).join("، ") || "غير محدد";
        await notifyNewPatient({
          name: patient.name,
          branchName: branch?.name ?? `فرع #${patient.branchId}`,
          serviceLabel: services,
          registeredBy: branchSession?.displayName ?? "غير معروف",
        });
      })().catch((err) => console.error("[telegram] new-patient notify failed:", err));

      await logAudit({
        entityType: "patient",
        entityId: patient.id,
        action: "create",
        userId: branchSession?.userId ?? null,
        userName: branchSession?.displayName ?? null,
        branchId: patient.branchId,
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
      });

      res.status(201).json(patient);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error("Error creating patient:", err);
      // ══ **فشلُ الكتابة يُقال، لا يُترك معلَّقاً** ═══════════════════════
      //  كان `throw err` داخل معالجٍ غير متزامن يصير رفضاً غير ملتقَط:
      //  الخدمةُ تبقى حيّة (حارسُ `index.ts`) **والطلبُ بلا ردٍّ إطلاقاً** —
      //  فتنتظر موظّفةُ الاستقبال دوّارةً حتى تنتهي مهلةُ المتصفّح، ولا تعرف
      //  أحُفظ المريضُ أم لا. وهذا أسوأُ من خطأٍ صريح.
      //
      //  والمعاملةُ تراجعت كاملةً (صفُّ المريض وجهتُه وترحيبُه معاً)، فلا
      //  حالةَ نصفَ مكتوبة تُخفيها هذه الرسالة — وإعادةُ المحاولة نظيفة.
      return res.status(500).json({ message: "تعذّر تسجيل المريض — لم يُحفظ شيء، أعد المحاولة" });
    }
  });

  app.post(api.patients.transfer.path, isAuthenticated, async (req, res) => {
    if (!isAdminOrManager(req)) {
      return res.status(403).json({ message: "فقط المدير يمكنه نقل المرضى" });
    }

    const id = Number(req.params.id);
    const { branchId } = api.patients.transfer.input.parse(req.body);

    // Branch isolation: branch_manager can transfer ONLY between
    // branches they manage. Admin has no constraint.
    const allowed = accessibleBranchesFor(req);
    if (allowed !== null) {
      const patient = await storage.getPatient(id);
      if (!patient) return res.status(404).json({ message: "المريض غير موجود" });
      if (!allowed.includes(patient.branchId)) {
        return res.status(403).json({ message: "لا يمكنك نقل مريض من فرع لا تديره" });
      }
      if (!allowed.includes(branchId)) {
        return res.status(403).json({ message: "لا يمكنك النقل إلى فرع لا تديره" });
      }
    }
    
    // Transfer patient with all related records (visits, payments)
    const patient = await storage.transferPatientToBranch(id, branchId);
    if (!patient) {
      return res.status(404).json({ message: "المريض غير موجود" });
    }
    res.json(patient);
  });

  app.put("/api/patients/:id/created-at", isAuthenticated, async (req, res) => {
    if (!isAdminOrManager(req)) {
      return res.status(403).json({ message: "فقط المدير يمكنه تعديل تاريخ الإضافة" });
    }

    const id = Number(req.params.id);
    const allowed = accessibleBranchesFor(req);
    if (allowed !== null) {
      const patient = await storage.getPatient(id);
      if (!patient) return res.status(404).json({ message: "المريض غير موجود" });
      if (!allowed.includes(patient.branchId)) {
        return res.status(403).json({ message: "لا يمكنك تعديل مريض من فرع آخر" });
      }
    }
    const { createdAt } = req.body;
    if (!createdAt) {
      return res.status(400).json({ message: "التاريخ مطلوب" });
    }

    const [updated] = await db.update(patients)
      .set({ createdAt: new Date(createdAt) })
      .where(eq(patients.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "المريض غير موجود" });
    }
    res.json(updated);
  });

  app.put(api.patients.update.path, isAuthenticated, async (req, res) => {
    //  يُبلَّغ في الرد: حقلٌ يُسقَط صامتاً يجعل المستخدم يظنّ أنه عدّل.
    let costLockedByFollowup = false;
    try {
      const id = Number(req.params.id);
      const ctx = getUserContext(req);
      const existingPatient = await storage.getPatient(id);
      
      if (!existingPatient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      const canAccess = ctx.role === 'admin' || !ctx.branchId || existingPatient.branchId === ctx.branchId;
      if (!canAccess) {
        return res.status(403).json({ message: "غير مصرح لك بتعديل هذا المريض" });
      }

      // COST is management-only (owner's rule): even an accountant with
      // edit-patient rights must not change totalCost — only branch managers
      // and the admin may. Everyone else gets the field silently stripped.
      const branchSession = (req.session as any).branchSession;
      const mayEditCost = branchSession?.isAdmin || branchSession?.role === "branch_manager";
      const patch: any = { ...req.body };
      if (!mayEditCost) delete patch.totalCost;

      // ══ ولا التفاف من هنا أيضاً (ترحيل ٠٥٣) ═══════════════════════════
      // `total_cost` هو ما يبتلع سعر الجهاز في النهاية، فبابُ «تعديل مريض»
      // كان طريقاً ثانياً إليه. ومريضٌ تحت متابعةٍ حيّة سعرُه معتمَد —
      // فيُسقَط الحقل بدل أن يُردّ الطلب كلّه: التعديل الإداري (الاسم،
      // الهاتف، العنوان) يبقى مفتوحاً كما كان، والمال وحده يُحمى.
      //
      // **ولا استثناءَ للمسؤول** — للسبب نفسه أعلاه: التاريخ لا يُتجاوَز.
      if (patch.totalCost !== undefined) {
        const guarded = await Promise.all(
          (["prosthetic", "medical_support"] as const).map((t) =>
            followupStore.hasActiveFollowup({ patientId: id, serviceType: t })),
        );
        if (guarded.some(Boolean)) {
          delete patch.totalCost;
          costLockedByFollowup = true;
        }
      }

      // ══ الهوية العلنية ثابتة — ورفضٌ صريح ═══════════════════════════
      // نقلُ رمزٍ بين ملفّين يقلب هويّتين معاً: ورقةٌ بيد مريضٍ تدلّ على
      // غيره، ورسالةُ تلغرام تصل غير صاحبها. فالمحاولة تُردّ برسالتها بدل
      // أن تُبتلع صامتة. ومَن يعيد إرسال الصفّ كما قرأه لا يُعطَّل عليه
      // التعديل — الرفض للتغيير لا لوجود الحقل.
      // (وطبقةُ `storage.updatePatient` ترمي أيضاً، فالمنادي الذي لا يمرّ
      //  بهذه النقطة لا يفلت.)
      if (patch.patientCode !== undefined
        && String(patch.patientCode) !== existingPatient.patientCode) {
        return res.status(400).json({
          message: "رمز المريض ثابت ولا يقبل التعديل", field: "patientCode",
        });
      }
      delete patch.patientCode;

      // Contact number rules on EDIT (deliberately gentler than on create — a
      // legacy patient may have no phone at all and must stay editable):
      //   • a number that is present must be valid;
      //   • an existing number may be REPLACED but never emptied, so a bad
      //     legacy value ("هاتف الجار") gets corrected rather than erased —
      //     the evidence of what was recorded stays until a real number
      //     replaces it.
      if (patch.phone !== undefined) {
        const typed = String(patch.phone ?? "").trim();
        const existingPhone = String(existingPatient.phone ?? "").trim();
        if (!typed) {
          if (existingPhone) {
            return res.status(400).json({
              message: "لا يمكن حذف رقم الاتصال المسجَّل — استبدله برقم صحيح",
              field: "phone",
            });
          }
        } else {
          const n = normalizePhone(typed, patch.phoneCountry || existingPatient.phoneCountry || undefined);
          if (!n.ok) {
            return res.status(400).json({ message: n.reason ?? "رقم اتصال غير صالح", field: "phone" });
          }
        }
      }

      // ══ تبديلُ رايةِ واتساب — والختمُ يكتبه الخادم ════════════════════
      //  رفعُها يسجّل مَن رفعها ومتى. وإطفاؤها **لا يمحو الختمَ القديم**:
      //  «وافق يومَ كذا ثم أوقفنا الإرسال» تاريخٌ صحيح، ومحوُه يجعل الملفَّ
      //  يقول إن أحداً لم يوافق قطّ. وسحبُ الجهة يتكفّل به `updatePatient`.
      if (patch.whatsappNotificationsEnabled !== undefined) {
        const on = patch.whatsappNotificationsEnabled === true;
        patch.whatsappNotificationsEnabled = on;
        if (on && !existingPatient.whatsappNotificationsEnabled) {
          patch.whatsappConsentAt = new Date();
          patch.whatsappConsentByUserId = branchSession?.userId ?? null;
        } else {
          delete patch.whatsappConsentAt;
          delete patch.whatsappConsentByUserId;
        }
      } else {
        //  ولا يكتبهما عميلٌ مباشرةً بحال.
        delete patch.whatsappConsentAt;
        delete patch.whatsappConsentByUserId;
      }

      // ══ **تاريخُ المريض السابق — لا يُكتب إلّا بجوابٍ صريح** (ترحيل ٠٦٥) ══
      //  العمودُ ثلاثيّ: `NULL` = لم يُسأل · `TRUE`/`FALSE` = جوابٌ أعطاه
      //  الموظّف. و«تعديل مريض» يعيد إرسال **كلّ** حقوله في كلّ حفظ، فمربّعٌ
      //  منعكسٌ من صفٍّ فارغ كان سيكتب `FALSE` على ملفٍّ قديم عند تصحيح
      //  هاتفه — أي «نعلم أنه لم يتعامل معنا»، وهو كذبٌ لم يقله أحد.
      //
      //  فالقاعدةُ: **البولياناتُ الصريحة وحدها تُكتب**. وما ليس بولياناً
      //  (بما فيه `null` الذي ترسله الشاشةُ للصفّ غير المسؤول عنه) يُسقَط
      //  فيبقى الفراغُ فراغاً. والشاشةُ تُرسل بولياناً **فقط إن لمس الموظّفُ
      //  المربّع** — فالحارسان يقولان الشيءَ نفسه من طرفين.
      if (patch.hadPriorCenterHistory !== undefined
        && typeof patch.hadPriorCenterHistory !== "boolean") {
        delete patch.hadPriorCenterHistory;
      }

      // ══ تصنيفُ المريض على التعديل — نفسُ منطق رقم الاتصال أعلاه ═══════
      //  الإنشاءُ يُلزم بأحد الاثنين. والتعديلُ يحرس ما بُني:
      //
      //  • **قيمةٌ صحيحة تُقبل دائماً** — «جديد ⇄ قديم» تصحيحٌ مشروع،
      //    ولملفٍّ قديمٍ فارغ هي الطريقُ الوحيد ليُصنَّف أخيراً.
      //  • **وقيمةٌ مخترَعة تُردّ** — ولو كانت غير فارغة: «غير محدَّد» وصفُ
      //    فراغٍ لا خيارٌ ثالث، وقبولُها يجعلها فئةً بحكم الأمر الواقع.
      //  • **ولا يُمحى تصنيفٌ قائم** — كما لا يُمحى رقمُ اتصالٍ مسجَّل.
      //  • **والملفُّ القديم الفارغ لا يُجبَر**: النموذج الكامل يعيد إرسال
      //    الحقل فارغاً، فلو رددنا الطلب لتعذّر تعديلُ هاتفٍ أو عنوان على
      //    آلاف الملفات القديمة. يُسقَط الحقل ويبقى الفراغ فراغاً — لا
      //    يُخمَّن ولا يمنع عملاً لا علاقة له به.
      if (patch.patientClassification !== undefined) {
        const typedClass = String(patch.patientClassification ?? "").trim();
        const hadValidClass = isPatientClassification(existingPatient.patientClassification);
        if (!typedClass) {
          if (hadValidClass) {
            return res.status(400).json({
              message: "لا يمكن إزالة تصنيف المريض — اختر «جديد» أو «قديم»",
              field: "patientClassification",
            });
          }
          delete patch.patientClassification;
        } else if (!isPatientClassification(typedClass)) {
          return res.status(400).json({
            message: "تصنيف المريض يجب أن يكون «جديد» أو «قديم»",
            field: "patientClassification",
          });
        } else {
          patch.patientClassification = typedClass;
        }
      }

      // ══ **والتحريرُ يُكمِل ما يلمسه — لا ما لا يلمسه** ═════════════════
      //  الملفّاتُ القديمة تُقرأ كما هي: لا تعبئةَ ولا تخمين. ومَن يلمس
      //  المقاساتِ أو تعريفَ البتر **يكملها قبل الحفظ** — فلا يُحفَظ نصفُ
      //  الحالة ويُترك الباقي لتعديلٍ لاحق لا يقع.
      //
      //  **لكنّ التصحيحَ الإداريَّ المحض لا يُمنَع**: هاتفٌ خاطئ، أو تصنيف،
      //  أو عنوان. إجبارُ الموظّف على وزنٍ لا يملكه لحظتَها كي يصحّح رقم
      //  هاتفٍ يوقف عملاً مشروعاً بلا مقابل — ونتيجتُه المعتادة أن يُخترَع
      //  رقم، وهو أسوأ من الفراغ لأنه يُقرأ قياساً.
      //
      //  واللحظةُ التي **يجب** أن يكتمل فيها الملفّ هي دخولُه دورةَ تصنيعٍ
      //  جديدة — يحرسها `POST /api/patients/:id/device-episodes`.
      //
      //  **و«لمسَها» تعني أن قيمتَها تغيّرت** لا أن مفتاحَها حضر: نموذجُ
      //  «تعديل مريض» يرسل الكائنَ كاملاً في كل حفظ، فقراءةُ وجود المفاتيح
      //  كانت تردّ كلَّ تصحيحٍ إداريّ على كل ملفٍّ قديم — أي القاعدةَ التي
      //  وُضعت لإلغائها بعينها. فتُقارَن القيمُ بالمخزَّن.
      //
      //  والفحصُ على **الصورة بعد الدمج**: التعديلُ الجزئي يرسل ما تغيّر
      //  وحده، فقياسُ الوارد وحده كان سيردّ تعديلَ هاتفٍ على ملفٍّ مكتمل.
      {
        const before = await storage.getPatient(id);
        if (!isAdministrativeOnlyPatch(req.body, before as any)) {
          const merged = {
            age: patch.age ?? before?.age,
            height: (patch as any).height ?? (before as any)?.height,
            weight: (patch as any).weight ?? (before as any)?.weight,
            isAmputee: (patch as any).isAmputee ?? before?.isAmputee,
            amputationSite: (patch as any).amputationSite ?? before?.amputationSite,
          };
          const req1 = checkRequiredPatientData(merged);
          if (!req1.ok) {
            return res.status(400).json({ message: req1.message, missing: req1.missing });
          }
        }
      }

      const patient = await storage.updatePatient(id, patch);
      res.json(costLockedByFollowup
        ? {
          ...patient,
          costNote: "لم تُعدَّل الكلفة: سعر الجهاز معتمد من الطبيب — التعديل يمرّ بطلب تعديل سعر يعتمده طبيب أو المسؤول العام",
        }
        : patient);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      // ══ **وفشلُ التعديل يُقال أيضاً** — نفسُ علّة الإنشاء ═══════════════
      //  `throw` في معالجٍ غير متزامن = رفضٌ غير ملتقَط: الخدمةُ حيّة
      //  **والطلبُ بلا ردّ**، فينتظر الموظّفُ ولا يعرف أحُفظ التعديلُ أم لا.
      //  والمعاملةُ تراجعت كاملةً — الصفُّ وجهةُ الاتصال معاً — فالملفُّ
      //  على حالته القديمة المتّسقة، وإعادةُ المحاولة نظيفة.
      console.error("Error updating patient:", err);
      return res.status(500).json({ message: "تعذّر حفظ التعديل — لم يُحفظ شيء، أعد المحاولة" });
    }
  });

  /**
   * **الحذفُ العاديُّ صار سلّةً** (ترحيل ٠٦٨) — البابُ نفسُه والزرُّ نفسُه،
   * والأثرُ صار قابلاً للرجوع ثلاثين يوماً.
   *
   * ولا شيءَ هنا ينادي الكاسكيدَ الهادم: `storage.deletePatient` بابُها
   * الوحيد صار «حذف نهائي» في `/api/patient-trash/:id/purge`.
   *
   * **والصلاحيةُ روليّةٌ صريحة** (`canTrashPatients`): مسؤولٌ عام · مديرُ
   * فرعٍ في نطاقه · طبيبٌ في نطاقه. وحلّت محلَّ علم `canDeletePatients`
   * القديم — ذاك عَلَمُ **هدمٍ لا رجعةَ فيه**، وهذا فعلٌ يُرَدّ بضغطة.
   * وكلُّ الحراسة في `deleteDecision` **تحت القفل** لا هنا.
   */
  app.delete(api.patients.delete.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "معرّف غير صالح" });
    try {
      const out = await softDeletePatient({
        patientId: id,
        reason: (req.body as any)?.reason,
        actor: trashActor(req),
      });
      res.json({ ok: true, ...out });
    } catch (err: any) {
      if (err instanceof TrashError) return res.status(err.status).json({ message: err.message });
      console.error("Error deleting patient:", err);
      res.status(500).json({ message: "فشل في حذف المريض. حاول مرة أخرى." });
    }
  });

  // Financial summary for a single patient — fast read used by inline
  // guidance hints (e.g. "this patient has 2 overdue invoices, are you
  // sure you want to create a new one?"). Returns only aggregate
  // counts; the caller can drill into specific invoices via existing
  // endpoints if needed.
  app.get("/api/patients/:id/financial-summary", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const id = parseInt(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "معرّف غير صالح" });
    }

    const patient = await storage.getPatient(id);
    if (!patient) return res.status(404).json({ error: "المريض غير موجود" });

    // Branch isolation: a non-admin must not learn about patients
    // outside their branch — even just their financial summary.
    if (!isAdmin && branchSession?.branchId && patient.branchId !== branchSession.branchId) {
      return res.status(403).json({ error: "لا يمكنك الوصول لهذا المريض" });
    }

    const [allInvoices, allPayments] = await Promise.all([
      storage.getInvoices(undefined, undefined, id),
      storage.getPaymentsByPatientId(id),
    ]);

    const now = new Date();
    let unpaidCount = 0;
    let totalDue = 0;
    let overdueCount = 0; // > 30 days old and still owed
    let oldestUnpaidDate: string | null = null;
    let totalInvoicePaid = 0; // sum of all invoice.paidAmount
    let totalInvoiced = 0; // sum of all invoice.total

    for (const inv of allInvoices) {
      totalInvoicePaid += inv.paidAmount || 0;
      totalInvoiced += inv.total;
      const due = inv.total - (inv.paidAmount || 0);
      if (due <= 0) continue;
      unpaidCount += 1;
      totalDue += due;
      const ageDays = Math.floor(
        (now.getTime() - new Date(inv.invoiceDate).getTime()) / (24 * 60 * 60 * 1000)
      );
      if (ageDays > 30) overdueCount += 1;
      if (!oldestUnpaidDate || inv.invoiceDate < oldestUnpaidDate) {
        oldestUnpaidDate = inv.invoiceDate;
      }
    }

    // Lifetime totals from BOTH payment streams. Many clinics record
    // session/visit payments in the `payments` table directly (no
    // invoice issued yet), so summing only invoice.paidAmount would
    // miss most of what a returning patient has actually paid.
    const sessionPaid = allPayments.reduce((s, p) => s + p.amount, 0);
    const totalPaidLifetime = sessionPaid + totalInvoicePaid;
    const totalPaymentEvents = allPayments.length + allInvoices.filter((i) => (i.paidAmount || 0) > 0).length;

    // Last activity date — newest of the two streams.
    const lastSessionDate = allPayments.length > 0
      ? allPayments
          .map((p) => new Date(p.date).toISOString())
          .sort()
          .reverse()[0]
      : null;
    const lastInvoicePaymentDate = allInvoices
      .filter((i) => (i.paidAmount || 0) > 0)
      .map((i) => i.invoiceDate)
      .sort()
      .reverse()[0] ?? null;
    const lastPaymentDate =
      lastSessionDate && lastInvoicePaymentDate
        ? lastSessionDate > lastInvoicePaymentDate ? lastSessionDate : lastInvoicePaymentDate
        : lastSessionDate ?? lastInvoicePaymentDate ?? null;

    // Available credit = session payments that haven't been
    // allocated to any invoice yet. This is what we'd auto-apply
    // to the next invoice the accountant creates.
    const availableCredit = Math.max(0, sessionPaid - totalInvoicePaid);

    res.json({
      patientId: id,
      unpaidCount,
      totalDue,
      overdueCount,
      oldestUnpaidDate,
      // Lifetime totals across the two payment streams.
      totalPaidLifetime,
      sessionPaid,
      invoicePaid: totalInvoicePaid,
      totalInvoiced,
      paymentCountLifetime: totalPaymentEvents,
      lastPaymentDate,
      totalCost: patient.totalCost ?? 0,
      // How much of the patient's session payments hasn't been
      // applied to any invoice yet — will auto-apply on next
      // invoice issuance.
      availableCredit,
    });
  });

  // New Service (add service to existing patient).
  // Only service types WITHOUT a dedicated flow live here: physio session
  // top-ups, consultations, and the misc catch-all. Device work is refused —
  // maintenance goes through the visit modal (order + expert + fee), and a
  // new prosthetic goes through doctor exam → تخصيص (the only booking point).
  app.post("/api/patients/:id/new-service", isAuthenticated, async (req, res) => {
    try {
      // Same gate as add-case-type/price-physio: this books money onto the
      // patient's record, so it takes the patient-writing permission.
      const branchSession = (req.session as any).branchSession;
      const isAdmin = branchSession?.isAdmin;
      const canAccess = isAdmin || branchSession?.role === "branch_manager" || branchSession?.permissions?.canAddPatients;
      if (!canAccess) return res.status(403).json({ message: "غير مصرح" });

      const patientId = Number(req.params.id);
      const { serviceType, notes, paymentTreatmentType, sessionCount, treatmentEntries } = req.body;
      const serviceCost = Math.max(0, Math.round(Number(req.body?.serviceCost) || 0));

      // ONE CLICK = ONE SERVICE. The form mints a token when it opens and sends
      // it with the request; the first arrival claims it, any repeat of that
      // same submission is answered without writing a second time. Proven need:
      // patient امل عويز carries two identical 12,500 entries 17 seconds apart,
      // and reception reports one click producing two services after an error.
      // Claiming BEFORE any write is what makes it safe — the duplicate never
      // reaches the money.
      const submissionToken = typeof req.body?.submissionToken === "string"
        ? req.body.submissionToken.trim().slice(0, 100)
        : "";

      // ══ **التذكرةُ وكلُّ ما يليها معاملةٌ واحدة** (تصحيحٌ تشغيليّ) ══════
      //  كانت التذكرةُ تُسكّ بنداءٍ مستقلّ يلتزم فوراً — **قبل** أن يُعرَف
      //  أنجحت الكتابةُ التي تليه أم فشلت. فخصمٌ رُفض (سببٌ ناقص، سعرٌ بائت
      //  لمتابعةٍ تحوّلت أثناء الحفظ) كان يُبقي التذكرةَ محجوزةً إلى الأبد
      //  بلا أن تحمل خدمةً وقعت فعلاً — وإعادةُ الإرسال بعد تصحيح الخطأ
      //  بنفس التذكرة تُقرأ «مسجَّلة سابقاً» **كذباً**، والخدمةُ لم تُكتب
      //  قطّ. فصار السكُّ والتحقّقُ كلُّه والكتابةُ (فوراً كخصمٍ أو كسعرٍ
      //  كامل) **معاملةً واحدة**: فشلٌ في أيّ خطوةٍ يرجع الجميع معاً — لا
      //  صفَّ توكنٍ يتيماً، ولا نصفَ كتابة، ولا نجاحاً كاذباً على إعادة
      //  إرسالٍ صحيحة.
      const result = await db.transaction(async (tx) => {
        if (submissionToken) {
          const claimed = await tx.execute(sql`
            INSERT INTO submission_tokens (token, scope)
            VALUES (${submissionToken}, ${"new_service"})
            ON CONFLICT (token) DO NOTHING
            RETURNING token
          `);
          if ((claimed.rowCount ?? 0) === 0) {
            // Already applied. Report success — the service the user asked for
            // does exist — but write nothing and say so plainly.
            return { kind: "duplicate" as const };
          }
        }

        const patient = await storage.getPatient(patientId, tx);
        if (!patient) {
          throw new NewServiceError("Patient not found", 404);
        }

        // Branch isolation — and every row this writes is pinned to the
        // patient's own branch, never a branch id from the request body.
        const allowedNs = accessibleBranchesFor(req);
        if (allowedNs !== null && !allowedNs.includes(patient.branchId)) {
          throw new NewServiceError("غير مصرح لك بهذا الفرع", 403);
        }

        if (NEW_SERVICE_REDIRECTS[serviceType]) {
          throw new NewServiceError(NEW_SERVICE_REDIRECTS[serviceType], 400);
        }
        const serviceLabel = NEW_SERVICE_LABELS[serviceType];
        if (!serviceLabel) throw new NewServiceError("نوع الخدمة غير صالح", 400);

        // «جلسات علاج إضافية» تفترض خطّة قائمة تُزاد عليها. ومريضٌ بلا حالة
        // علاج طبيعي ليس له ما يُزاد: الجلسات تُقيَّد على حالةٍ لا وجود لها،
        // وعدّاد الجلسات يقرأ شراءً لخيطٍ لم يُفتح. الموزِّع يعطّل الخيار في
        // الواجهة — وهذا الحارس هو الذي يجعله ثابتاً في العمل لا في الشاشة:
        // نداءٌ مباشر أو نافذةٌ قديمة لا يستطيعان تجاوزه.
        // (والاستشارة و«خدمة أخرى» لا تشترطان شيئاً — لم تُمَسّا.)
        if (serviceType === "additional_therapy" && !patient.isPhysiotherapy) {
          throw new NewServiceError("يجب تفعيل حالة العلاج الطبيعي للمريض أولاً", 400);
        }

        const entries = normalizeEntries(treatmentEntries);

        // ══ ── **الاتفاقُ الذي أبرمه الاستقبال** ── ═══════════════════════
        //  الموظّفُ هو مَن يكلّم المريض ويعرف على كم اتّفقا: ٢٥,٠٠٠ أو
        //  ١٢,٥٠٠ أو مجّاناً. وقبل هذا لم يكن له حقلٌ يقوله فيه — تُنفَّذ
        //  الخدمةُ بسعرها الكامل ثم **يخمّن المديرُ الاتفاقَ لاحقاً**.
        //
        //  **والسعرُ الكامل يمضي فوراً** كما كان: خمسون مريضاً في اليوم لا
        //  يمرّون بطابور، والطابورُ للاستثناء وحده.
        //
        //  **والسعرُ الأصليّ يُحسب في الخادم** من جدول الأسعار المشترك لا
        //  يُقبل من العميل: وإلّا لأمكن إعلانُ أصلٍ ملفَّق يجعل الخصمَ يبدو
        //  صغيراً. والصفرُ وحده لا يعني «مجّاناً» — المجّانيّ يُختار صراحةً.
        const dsc = req.body?.discount;
        const wantsFree = dsc?.isFree === true;
        const isPhysioService = serviceType === "additional_therapy";

        // ══ **البنودُ تُعاد بناؤها في الخادم** — ولا كلفةَ سطرٍ تُصدَّق ═══
        //  العميلُ يرسل `cost` لكلّ بند. وهو **عرضٌ لا حقيقة**: نافذةٌ قديمة
        //  أو طلبٌ مُلفَّق يرسل ١٠٠,٠٠٠ لجلسةٍ سعرُها ٢٥,٠٠٠، فتنحرف كلفةُ
        //  الحالة عن كلفة المريض ويظهر «باقٍ عليه» وهميّ. فالقيمةُ الوحيدة
        //  المصدَّقة هي **نوعُ العلاج وعددُ الجلسات**، والسعرُ من الجدول.
        const canonEntries = isPhysioService
          ? (entries ?? [])
            .filter((e) => e.treatmentType && PHYSIO_TREATMENT_TYPES.includes(e.treatmentType))
            .map((e) => ({
              treatmentType: e.treatmentType,
              sessionCount: e.sessionCount,
              cost: physioEntryCost({
                treatmentType: e.treatmentType as string, sessionCount: e.sessionCount,
              }),
            }))
          : (entries ?? []).filter((e) => e.treatmentType);
        const validEntries = canonEntries;
        const stdPrice = isPhysioService
          ? canonEntries.reduce((s, e) => s + e.cost, 0)
          : serviceCost;
        const wantsCut = dsc && dsc.finalPrice !== undefined && dsc.finalPrice !== null
          && dsc.finalPrice !== "" && Number(dsc.finalPrice) !== stdPrice;

        // ══ **ولا سعرَ أقلَّ من القياسيّ يمرّ بلا اعتماد** ═══════════════
        //  حقلُ «تكلفة الخدمة» كان يقبل التحرير للجلسات الإضافية، فيكتب
        //  الموظّفُ ١٢,٥٠٠ بدل ٢٥,٠٠٠ ويترك حقولَ الخصم فارغة — **فتُنفَّذ
        //  الخدمةُ مخفَّضةً بلا طلبٍ ولا معتمِد**، ويسقط الطابورُ كلُّه.
        //
        //  فالقياسيُّ هو الحاكم هنا: كلُّ تخفيضٍ يمرّ من باب الخصم أو لا يمرّ.
        //  **والرفضُ الصريح لا التصحيحُ الصامت**: نافذةٌ قديمة عرضت ١٢,٥٠٠
        //  ثم نُفِّذت ٢٥,٠٠٠ تجعل الموظّفَ يقول للمريض غيرَ ما وقع.
        if (isPhysioService && !wantsFree && !wantsCut && serviceCost !== stdPrice) {
          throw new NewServiceError(
            `سعر الجلسات ${stdPrice.toLocaleString("en-US")} د.ع.`
            + ` وأيّ مبلغ أقلّ يمرّ من «خصم أو خدمة مجّانية» فيُعتمَد —`
            + ` لا يُكتب في حقل الكلفة. حدّث الصفحة وأعد المحاولة.`,
            400);
        }
        if (isPhysioService && (wantsFree || wantsCut)) {
          if (!(stdPrice > 0)) {
            throw new NewServiceError(
              "السعر الأصلي يجب أن يكون موجباً — اختر نوع العلاج وعدد الجلسات أولاً", 400);
          }
          //  **التطبيقُ فوريّ دائماً** (قرارُ المالك ٢٠٢٦-٠٨-٢٨) — لا طابورَ
          //  اعتمادٍ للخصم بعد اليوم: مَن وصل هنا اجتاز `canAccess` أعلاه
          //  بالفعل، وهي نفسُ بوّابة السعر الكامل تماماً — فلا فحصَ ثانياً.
          //  **وبمعاملة `tx` نفسِها التي سكّت التذكرة** (`...Tx` لا الغلاف
          //  الذي يفتح معاملته الخاصّة) — فرفضُ الخصم يرجع التذكرةَ معه.
          const out = await discountStore.applyDiscountImmediatelyTx(tx, {
            patientId, department: "physiotherapy", branchId: patient.branchId,
            //  **مرجعٌ من رمز الإرسالة**: ضغطةٌ واحدة = طلبٌ واحد.
            contextRef: newServiceDiscountRef(submissionToken, serviceType),
            originalPrice: stdPrice,
            finalPrice: wantsFree ? 0 : Number(dsc.finalPrice),
            isFree: wantsFree,
            reason: String(dsc?.reason ?? ""),
            note: typeof dsc?.note === "string" && dsc.note.trim() ? dsc.note.trim() : null,
            //  **ولا سعرَ في الحمولة**: المطبَّقُ على الصفّ هو المصدر.
            payload: {
              kind: "new_service", serviceType,
              entries: validEntries.map((e) => ({
                treatmentType: e.treatmentType, sessionCount: e.sessionCount,
              })),
              serviceNotes: notes ?? null,
              paymentTreatmentType: paymentTreatmentType ?? null,
              sessionCount: sessionCount ?? null,
              //  **حقيقةُ الدفع لا السعرُ المتَّفق عليه**: نفسُ الحقل الذي
              //  يرسله المسارُ كاملُ السعر أدناه — لا افتراضَ أن الخصمَ يعني
              //  قبضاً كاملاً. (لا أثرَ له فعلياً هنا: هذه إرسالةٌ فيزيويّة
              //  ببنودٍ دائماً، والبنودُ تُحصَّل بحصّتها المخصَّصة كما كانت.)
              initialPayment: req.body?.initialPayment ?? null,
            },
            actor: {
              userId: branchSession?.userId ?? null,
              userName: branchSession?.displayName ?? null,
            },
            audit: {
              ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
              note: (row) => discountAuditNote(row, "تطبيقٌ فوريّ"),
            },
          });
          return {
            kind: "discount" as const,
            discountRequestId: out.request.id,
            newTotalCost: out.applied?.newTotalCost ?? patient.totalCost ?? 0,
            openedPhysiotherapyCase: out.applied?.openedPhysiotherapyCase ?? false,
          };
        }

        //  ══ **الكتابةُ الواحدة** — لا نسخةَ ثانية من محاسبة الخدمة ═════════
        //  نفسُ الدالّة التي يناديها اعتمادُ الخصم. فمَن يصلح إحداهما يصلحهما،
        //  ولا تنحرف واحدةٌ عن الأخرى بعد أوّل تعديل. **وبمعاملة `tx` نفسِها**
        //  — لنفس سبب فرع الخصم أعلاه: رفضٌ يرجع التذكرةَ معه.
        const done = await executeNewService({
          patientId,
          serviceType,
          //  **القياسيُّ للجلسات، والمُدخَلُ لما عداها**: الاستشارةُ و«خدمة
          //  أخرى» بلا جدولِ أسعارٍ يحكمها، فيبقى مبلغُها قرارَ الموظّف كما كان.
          serviceCost: isPhysioService ? stdPrice : serviceCost,
          entries: isPhysioService ? canonEntries : entries,
          notes: notes ?? null,
          paymentTreatmentType: paymentTreatmentType ?? null,
          sessionCount: sessionCount ?? null,
          initialPayment: req.body?.initialPayment ?? null,
          actor: {
            userId: branchSession?.userId ?? null,
            userName: branchSession?.displayName ?? null,
          },
          audit: { ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null },
          tx,
        });
        return {
          kind: "full" as const,
          newTotalCost: done.newTotalCost,
          openedPhysiotherapyCase: done.openedPhysiotherapyCase,
        };
      });

      if (result.kind === "duplicate") {
        return res.json({
          success: true,
          duplicate: true,
          message: "هذه الخدمة مسجَّلة سابقاً — لم تُضف مرّتين",
        });
      }
      if (result.kind === "discount") {
        return res.status(201).json({
          success: true,
          discountRequestId: result.discountRequestId,
          newTotalCost: result.newTotalCost,
          openedPhysiotherapyCase: result.openedPhysiotherapyCase,
        });
      }
      res.json({
        success: true,
        newTotalCost: result.newTotalCost,
        openedPhysiotherapyCase: result.openedPhysiotherapyCase,
      });
    } catch (err: any) {
      if (err instanceof NewServiceError) {
        return res.status(err.status).json({ message: err.message });
      }
      //  **الخصمُ قد يفشل من داخل المعاملة نفسِها** — سببٌ ناقص، سعرٌ بائت،
      //  متابعةٌ تحوّلت. يُلتقَط هنا بنفس الاسم الذي كانت النقطةُ تلتقطه به
      //  محلّياً قبل هذا التصحيح (نمطُ `/price-physio` أدناه) — فلا يسقط
      //  خطأُ خصمٍ صحيح في ٥٠٠ عامّ.
      if (err?.name === "DiscountError") {
        return res.status(err.status).json({ message: err.message });
      }
      console.error("Error adding new service:", err);
      res.status(500).json({ message: "حدث خطأ أثناء إضافة الخدمة" });
    }
  });

  // Adds a case type to an EXISTING patient (one person = one record).
  // E.g. a physiotherapy patient who now needs a medical support: instead of
  // opening a duplicate patient file, the same record gains the new type,
  // and for manufacturing types a work order is created for ONE expert —
  // all atomically.
  // ---- "الكلفة والجلسات": post-exam physiotherapy pricing ---------------------
  // Mirrors the أطراف/مساند تخصيص model: the patient is REGISTERED without a
  // cost; after the doctor's exam reception opens this from the registry,
  // enters the treatment types + session counts, and the server computes the
  // cost from the shared price table (روبوت 50k، أجهزة/تمارين/أبر 25k،
  // استشارة 0) — prices are NEVER trusted from the client. Atomic: bumps
  // totalCost, records treatmentType/sessionCount on the patient, and tops up
  // the physiotherapy case cost by the same amount so sum(cases) stays in step.
  app.post("/api/patients/:id/price-physio", isAuthenticated, async (req, res) => {
    try {
      const branchSession = (req.session as any).branchSession;
      const isAdmin = branchSession?.isAdmin;
      const canAccess = isAdmin || branchSession?.role === "branch_manager" || branchSession?.permissions?.canAddPatients;
      if (!canAccess) return res.status(403).json({ message: "غير مصرح" });

      const patientId = Number(req.params.id);
      const patient = await storage.getPatient(patientId);
      if (!patient) return res.status(404).json({ message: "المريض غير موجود" });
      if (!patient.isPhysiotherapy) return res.status(400).json({ message: "هذه الميزة لمرضى العلاج الطبيعي" });
      const allowedPp = accessibleBranchesFor(req);
      if (allowedPp !== null && !allowedPp.includes(patient.branchId)) {
        return res.status(403).json({ message: "غير مصرح لك بهذا الفرع" });
      }

      const rawEntries = Array.isArray(req.body?.entries) ? req.body.entries : [];
      const entries = rawEntries
        .map((e: any) => ({
          treatmentType: String(e?.treatmentType || ""),
          sessionCount: Math.max(0, Math.floor(Number(e?.sessionCount) || 0)),
          isFree: Boolean(e?.isFree),
        }))
        .filter((e: any) => PHYSIO_TREATMENT_TYPES.includes(e.treatmentType) && e.sessionCount > 0);
      if (entries.length === 0) return res.status(400).json({ message: "أدخل نوع علاج وعدد جلسات صحيحاً" });

      // SERVER-side pricing from the shared table.
      const totalCost = entries.reduce((s: number, e: any) => s + physioEntryCost(e), 0);
      const totalSessions = entries.reduce((s: number, e: any) => s + e.sessionCount, 0);
      const typesJoined = Array.from(new Set<string>(entries.map((e: any) => e.treatmentType))).join("، ");

      // ══ خصمٌ أو تبرّع؟ ⟶ بابُ الاعتماد. وإلّا فالمسارُ كما هو حرفاً ══════
      // **والفرقُ يُقاس على السعر المحسوب من الجدول** — لا على رقمٍ يعلنه
      // العميل: لو قُبل «السعر الأصلي» من الطلب لأمكن تضخيمُه ليبدو الخصمُ
      // صغيراً وهو كبير.
      //
      // وجلساتُ «إضافة جلسات مجانية» تبقى كما كانت تماماً: هي بنودٌ بلا
      // كلفة داخل الدورة، وقد دخلت `totalCost` بصفرها. والخصمُ هنا شيءٌ
      // آخر: تخفيضُ **ثمن الخدمة** كلِّها، وله سببُه ومعتمِدُه.
      const dsc = req.body?.discount;
      const wantsFree = dsc?.isFree === true;
      const wantsCut = dsc && dsc.finalPrice !== undefined && dsc.finalPrice !== null
        && dsc.finalPrice !== "" && Number(dsc.finalPrice) !== totalCost;
      if (wantsFree || wantsCut) {
        try {
          //  **التطبيقُ فوريّ دائماً** — `canAccess` أعلاه (نفسُ بوّابة
          //  الحفظ بلا خصم) فحصت الإذنَ بالفعل، فلا فحصَ ثانياً هنا.
          const out = await discountStore.applyDiscountImmediately({
            patientId, department: "physiotherapy", branchId: patient.branchId,
            contextRef: null,
            originalPrice: totalCost,
            finalPrice: wantsFree ? 0 : Number(dsc.finalPrice),
            isFree: wantsFree,
            reason: String(dsc?.reason ?? ""), note: strOrNull(dsc?.note),
            payload: { entries },
            actor: { userId: branchSession?.userId ?? null, userName: branchSession?.displayName ?? null },
            //  **سطرُ التدقيق يُكتب داخل المعاملة** — فلا كلفةٌ تُقيَّد
            //  بإذنٍ لا أثرَ له، ولا رسالةُ فشلٍ بعد نجاح.
            audit: {
              ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
              note: (row: any) => discountAuditNote(row, "تطبيقٌ فوريّ"),
            },
          });
          return res.json({
            ok: true,
            discountRequestId: out.request.id,
            totalCost: out.request.approvedFinalPrice ?? 0,
            patient: out.applied?.patient ?? null,
          });
        } catch (e: any) {
          if (e?.name === "DiscountError") return res.status(e.status).json({ message: e.message });
          throw e;
        }
      }

      const updated = await storage.pricePhysiotherapy(patientId, {
        entries, totalCost, totalSessions, treatmentType: typesJoined,
      });

      await logAudit({
        entityType: "patient", entityId: patientId, action: "update",
        userId: branchSession?.userId ?? null, userName: branchSession?.displayName ?? null,
        branchId: patient.branchId, ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: `تسعير علاج طبيعي بعد الفحص: ${typesJoined} — ${totalSessions} جلسة بكلفة ${totalCost.toLocaleString()} د.ع`,
      });
      res.json({ ok: true, totalCost, patient: updated });
    } catch (err) {
      console.error("Error pricing physiotherapy:", err);
      res.status(500).json({ message: "تعذّر حفظ التسعير" });
    }
  });

  // ---- «تعديل خطة الجلسات»: fix the COUNTS, never the money ------------------
  // The escape hatch for patients priced before migration 036, whose session
  // counts were charged for and then discarded, and for any later correction
  // ("we agreed on 12, not 10"). It writes the plan and the plan text — and
  // deliberately touches neither total_cost nor the cost ledger, so a counter
  // correction can never move a dinar.
  app.put("/api/patients/:id/physio-plan", isAuthenticated, async (req, res) => {
    try {
      const branchSession = (req.session as any).branchSession;
      const isAdmin = branchSession?.isAdmin;
      const canAccess = isAdmin || branchSession?.role === "branch_manager" || branchSession?.permissions?.canAddPatients;
      if (!canAccess) return res.status(403).json({ message: "غير مصرح" });

      const patientId = Number(req.params.id);
      const patient = await storage.getPatient(patientId);
      if (!patient) return res.status(404).json({ message: "المريض غير موجود" });
      if (!patient.isPhysiotherapy) return res.status(400).json({ message: "هذه الميزة لمرضى العلاج الطبيعي" });
      const allowedPp = accessibleBranchesFor(req);
      if (allowedPp !== null && !allowedPp.includes(patient.branchId)) {
        return res.status(403).json({ message: "غير مصرح لك بهذا الفرع" });
      }

      const raw = Array.isArray(req.body?.entries) ? req.body.entries : [];
      const cleaned = raw
        .map((e: any) => ({
          treatmentType: String(e?.treatmentType || "").trim(),
          sessionCount: Math.max(0, Math.floor(Number(e?.sessionCount) || 0)),
        }))
        .filter((e: any) => PHYSIO_TREATMENT_TYPES.includes(e.treatmentType) && e.sessionCount > 0);
      // Replace, don't merge: this dialog shows the current plan and saves what
      // the user sees, so merging would silently double what they just edited.
      const plan = mergePhysioPlan(null, cleaned);

      const updated = await storage.updatePatient(patientId, {
        physioPlan: plan,
        treatmentType: describePhysioPlan(plan) || patient.treatmentType,
      } as any);

      await logAudit({
        entityType: "patient", entityId: patientId, action: "update",
        userId: branchSession?.userId ?? null, userName: branchSession?.displayName ?? null,
        branchId: patient.branchId, ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: `تعديل خطة الجلسات (بلا أثر مالي): ${describePhysioPlan(plan) || "—"}`,
      });
      res.json({ ok: true, patient: updated });
    } catch (err) {
      console.error("Error updating physio plan:", err);
      res.status(500).json({ message: "تعذّر حفظ خطة الجلسات" });
    }
  });

  app.post("/api/patients/:id/add-case-type", isAuthenticated, async (req, res) => {
    try {
      const branchSession = (req.session as any).branchSession;
      const isAdmin = branchSession?.isAdmin;
      const canAccess = isAdmin || branchSession?.role === "branch_manager" || branchSession?.permissions?.canAddPatients;
      if (!canAccess) return res.status(403).json({ message: "غير مصرح" });

      const patientId = Number(req.params.id);
      const patient = await storage.getPatient(patientId);
      if (!patient) return res.status(404).json({ message: "المريض غير موجود" });

      // Branch isolation for non-admins.
      if (!isAdmin) {
        const accessible: number[] = Array.isArray(branchSession?.accessibleBranches) && branchSession.accessibleBranches.length > 0
          ? branchSession.accessibleBranches
          : (branchSession?.branchId ? [branchSession.branchId] : []);
        if (!accessible.includes(patient.branchId)) {
          return res.status(403).json({ message: "غير مصرح لك بهذا الفرع" });
        }
      }

      const caseType = req.body?.caseType;
      if (!["amputee", "medical_support", "physiotherapy"].includes(caseType)) {
        return res.status(400).json({ message: "نوع الحالة غير صالح" });
      }
      const alreadyHas = caseType === "amputee" ? patient.isAmputee
        : caseType === "medical_support" ? patient.isMedicalSupport
        : patient.isPhysiotherapy;
      if (alreadyHas) return res.status(409).json({ message: "هذا النوع مفعّل أصلاً على ملف المريض" });

      // Only allow the type-specific descriptive fields through.
      const allowed = ["amputationSite", "prostheticType", "supportType", "injurySide", "diseaseType", "treatmentType"] as const;
      const fields: any = {};
      for (const f of allowed) {
        if (typeof req.body?.[f] === "string" && req.body[f]) fields[f] = req.body[f];
      }

      // ══ **فتحُ خيطِ أطرافٍ لا يُنتج ملفّاً نصفَ مكتمل** ═════════════════
      //  هذه النقطة كانت ترفع `is_amputee` **بلا موقع بتر** — فيُولَد ملفٌّ
      //  مبتورٌ بلا تعريفِ بتره، ويُترك إكمالُه لتعديلٍ لاحقٍ لا يقع. ثم
      //  يصطدم به الطبيبُ في المعاينة والخبيرُ في القياس.
      //
      //  فالبياناتُ تُجمَع **في المسار نفسه**: تعريفُ البتر منظَّماً،
      //  والمقاساتُ الثلاث إن كانت ناقصةً على الملفّ — تُقبَل هنا وتُكتب مع
      //  فتح الخيط، أو يُردّ الطلبُ بما ينقص.
      //
      //  والمساندُ والعلاجُ الطبيعي لا يُسألان عن بتر إطلاقاً.
      if (caseType === "amputee") {
        const site = typeof fields.amputationSite === "string" ? fields.amputationSite : "";
        const amp = checkAmputationSite(site);
        if (!amp.ok) {
          return res.status(400).json({
            message: `${amp.message} — تعريف البتر يُحدَّد عند فتح حالة الأطراف`,
            missing: amp.missing,
          });
        }
        //  والمقاساتُ تُقبَل هنا لمَن نقصته: الطرفُ يُصنَع عليها.
        const measures: any = {};
        for (const f of ["age", "height", "weight"] as const) {
          if (typeof req.body?.[f] === "string" && req.body[f].trim()) {
            measures[f] = req.body[f].trim();
          }
        }
        const merged = {
          age: measures.age ?? patient.age,
          height: measures.height ?? (patient as any).height,
          weight: measures.weight ?? (patient as any).weight,
          isAmputee: true, amputationSite: site,
        };
        const reqCase = checkRequiredPatientData(merged);
        if (!reqCase.ok) {
          return res.status(400).json({
            message: `${reqCase.message} — تُستكمل عند فتح حالة الأطراف`,
            missing: reqCase.missing,
          });
        }
        Object.assign(fields, measures);
      }

      const serviceCost = Math.max(0, Number(req.body?.serviceCost) || 0);
      const paidNow = Math.max(0, Math.min(Number(req.body?.paidNow) || 0, serviceCost));

      // Expert assignment is now a SEPARATE step ("تحديد خبير" in the patients
      // registry), so adding a case type never asks for an expert or a delivery
      // date and never creates the work order here. The case (and its cost) is
      // recorded; the expert is assigned afterward, and commits to the delivery
      // date only when reaching the mold stage.
      const { patient: updated, workOrderId } = await storage.addPatientCaseType({
        patientId, caseType, fields, serviceCost, paidNow,
        expertUserId: null, expectedDeliveryDate: null,
        skipWorkOrder: true,
        performedBy: branchSession?.userId ?? null,
      });

      // ── توجيهٌ إلزامي إلى الطبيب (ترحيل ٠٥٥) ────────────────────────
      //  فتحُ خيطِ أطرافٍ أو مساندَ يعني أن المريض صار يحتاج جهازاً من هذا
      //  النوع — ولا جهازَ بلا معاينةٍ كاملة. فالتوجيه جزءٌ من الخدمة لا
      //  زرٌّ يُتذكَّر لاحقاً، **ويشمل المريض القديم**: تصنيفُه يرفع الإلزام
      //  عن الانتظار التلقائي، ولا يمنع طلباً صرّح به الاستقبال.
      //  والعلاج الطبيعي يخرج صامتاً — `reviewServiceOfCaseType` تُرجع null.
      const caseRouting = await routeServiceToDoctorReview(req, {
        patientId, caseType,
        reviewKind: "new_device", requestedPath: "full",
        receptionNote: req.body?.reviewNote ?? null,
      });

      await logAudit({
        entityType: "patient", entityId: patientId, action: "update",
        userId: branchSession?.userId ?? null, userName: branchSession?.displayName ?? null,
        branchId: patient.branchId, ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: `إضافة نوع حالة: ${caseType}${workOrderId ? ` مع أمر تصنيع #${workOrderId}` : ""}`
          + (caseRouting.request ? ` — طلب مراجعة #${caseRouting.request.id} (معاينة كاملة)` : ""),
      });
      if (workOrderId) {
        await logAudit({
          entityType: "prosthetic_work_order", entityId: workOrderId, action: "create",
          userId: branchSession?.userId ?? null, userName: branchSession?.displayName ?? null,
          branchId: patient.branchId, ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
          notes: `أمر تصنيع عند إضافة نوع حالة لمريض موجود #${patientId}`,
        });
      }

      res.json({
        success: true, patient: updated, workOrderId,
        reviewRequestId: caseRouting.request?.id ?? null,
      });
    } catch (err: any) {
      console.error("Error adding case type:", err);
      res.status(500).json({ message: err?.message || "حدث خطأ أثناء إضافة نوع الحالة" });
    }
  });

  // Merges a duplicate patient record into the original (admin only). Used
  // to clean up cases where staff opened a second file for the same person.
  app.post("/api/admin/patients/merge", isAuthenticated, async (req, res) => {
    try {
      const branchSession = (req.session as any).branchSession;
      if (!branchSession?.isAdmin) {
        return res.status(403).json({ message: "غير مصرح — مسؤول النظام فقط" });
      }
      const sourceId = Number(req.body?.sourceId);
      const targetId = Number(req.body?.targetId);
      if (!Number.isFinite(sourceId) || !Number.isFinite(targetId)) {
        return res.status(400).json({ message: "معرّفات غير صالحة" });
      }
      const result = await storage.mergePatients(sourceId, targetId);
      await logAudit({
        entityType: "patient", entityId: targetId, action: "update",
        userId: branchSession?.userId ?? null, userName: branchSession?.displayName ?? null,
        branchId: result.patient.branchId, ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: `دمج الملف المكرّر #${sourceId} في الملف #${targetId} — ${JSON.stringify(result.moved)}`,
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error("Error merging patients:", err);
      res.status(500).json({ message: err?.message || "حدث خطأ أثناء الدمج" });
    }
  });

  // Visits
  app.post(api.visits.create.path, isAuthenticated, async (req, res) => {
    // `deviceEpisodeId` حقلُ طلبٍ لا يُدرَج كما وصل: يُنزَع، ثم يُعاد بعد
    // التحقّق من أن الجهاز يخصّ هذا المريض وهذه الخدمة.
    const { deviceEpisodeId: requestedVisitEpisode, ...visitBody } = req.body ?? {};
    const input = api.visits.create.input.parse(visitBody);
    
    const branchSession = (req.session as any).branchSession;
    let visitShift = branchSession?.shift;
    if (visitShift !== "morning" && visitShift !== "evening") {
      const now = new Date();
      const baghdadOffset = 3 * 60 * 60 * 1000;
      const baghdadNow = new Date(now.getTime() + baghdadOffset);
      const hour = baghdadNow.getUTCHours();
      if (hour >= 8 && hour <= 15) {
        visitShift = "morning";
      } else if (hour >= 16 && hour <= 21) {
        visitShift = "evening";
      } else {
        visitShift = "morning";
      }
    }
    input.shift = visitShift;

    //  **ولا زيارةَ على ملفٍّ في السلّة** (ترحيل ٠٦٨) — نفسُ حارس الدفعة.
    {
      const live = await storage.getPatient(input.patientId);
      if (!live) {
        const any = await storage.getPatientAnyState(input.patientId);
        return res.status(any ? 409 : 404).json({
          message: any ? PATIENT_IN_TRASH_ERROR : "المريض غير موجود",
        });
      }
    }

    // Track which system user created this visit (if logged in via system user)
    const sessionUserId = branchSession?.userId;
    if (sessionUserId && typeof sessionUserId === 'number') {
      (input as any).createdBy = sessionUserId;
    }

    // A client-supplied caseId must belong to THIS patient — otherwise drop it
    // and let storage auto-resolve (never trust a foreign case id).
    if ((input as any).caseId != null) {
      const [ownCase] = await db.select({ id: patientCases.id }).from(patientCases)
        .where(and(eq(patientCases.id, Number((input as any).caseId)), eq(patientCases.patientId, input.patientId)));
      if (!ownCase) (input as any).caseId = null;
    }

    // ══ أيّ جهازٍ تخصّ هذه الزيارة؟ ═════════════════════════════════════
    // اختياريّ عمداً: أكثر الزيارات عامّة، والموظّف يحدّد الجهاز حين يعنيه.
    // لكن ما يُحدَّد يُتحقَّق منه — زيارةٌ معلّقة على جهاز مريضٍ آخر تفسد
    // تاريخ الجهازين معاً.
    if (requestedVisitEpisode != null && requestedVisitEpisode !== "") {
      const wantId = Number(requestedVisitEpisode);
      if (!Number.isFinite(wantId) || wantId <= 0) {
        return res.status(400).json({ message: "معرّف جهاز غير صالح" });
      }
      const svc = deviceServiceOfCaseType((input as any).treatmentType)
        ?? await deviceServiceOfCaseId((input as any).caseId, input.patientId);
      if (!svc) {
        return res.status(400).json({ message: "لا يمكن تحديد جهاز لزيارة ليست على حالة أطراف أو مساند" });
      }
      const check = await verifyEpisodeBelongs(
        input.patientId, wantId, svc,
        ["awaiting_exam", "examined", "in_manufacturing", "delivered"],
      );
      if (!check.ok) return res.status(400).json({ message: check.reason });
      (input as any).deviceEpisodeId = wantId;
    }
    // لا اختيار ⟶ NULL: زيارةٌ عامّة أو جهازٌ قديم غير مسجَّل.

    const visit = await storage.createVisit(input);

    // ── توجيهُ زيارةِ الجهاز إلى الطبيب (ترحيل ٠٥٥) ────────────────────
    //  زيارةُ أطرافٍ أو مساندَ — تعديلاً كانت أو متابعةً — قرارٌ سريريٌّ
    //  محتمل، فتذهب إلى الطبيب بتصنيف الاستقبال. **والعلاج الطبيعي لا
    //  يمرّ من هنا إطلاقاً**: الخيط يُقرأ من `case_id` الذي حسمته
    //  `createVisit`، فزيارةُ علاجٍ طبيعي تُرجع `null` وتخرج صامتة.
    //
    //  والقراءة **بعد** الإنشاء لا قبله: `createVisit` هي التي تحسم الخيط
    //  حين لا يرسله العميل، فقراءةُ الدخل وحده كانت ستُخطئ نصف الزيارات.
    const visitService = deviceServiceOfCaseType((input as any).treatmentType)
      ?? await deviceServiceOfCaseId(visit.caseId, visit.patientId);
    let visitRouting: { created: boolean; request: { id: number } | null } = { created: false, request: null };
    if (visitService) {
      const cls = classifyFromBody(req.body, "follow_up");
      visitRouting = await routeServiceToDoctorReview(req, {
        patientId: visit.patientId, caseType: visitService,
        reviewKind: cls.reviewKind, requestedPath: cls.requestedPath,
        receptionNote: cls.receptionNote ?? (input as any).notes ?? null,
        visitId: visit.id,
        deviceEpisodeId: (visit as any).deviceEpisodeId ?? null,
      });
    }

    // Audit log so visit creation counts on the employee accuracy
    // panel — receptionists do most of these.
    await logAudit({
      entityType: "visit",
      entityId: visit.id,
      action: "create",
      userId: sessionUserId ?? null,
      userName: branchSession?.displayName ?? null,
      branchId: visit.branchId,
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
      notes: visitRouting.request ? `طلب مراجعة #${visitRouting.request.id}` : undefined,
    });

    if (input.cost && input.cost > 0) {
      const patient = await storage.getPatient(input.patientId);
      if (patient) {
        const newTotalCost = (patient.totalCost || 0) + input.cost;
        //  قسمُ كلفةِ الزيارة هو حالةُ الزيارة بعينها (ترحيل ٠٥٦) — وقد
        //  حسمتها `createVisit` أعلاه، فلا تُستنتج من أعلام المريض.
        await storage.updatePatient(
          patient.id, { totalCost: newTotalCost }, "visit", visit.caseId ?? null,
        );

        const visitPayment = await storage.createPayment({
          patientId: input.patientId,
          branchId: input.branchId,
          amount: input.cost,
          notes: "دفعة زيارة",
          paymentTreatmentType: input.treatmentType || null,
          sessionCount: input.sessionCount || null,
          // Link back to the visit (038): editing the visit's cost or deleting
          // the visit can then correct THIS payment instead of guessing.
          visitId: visit.id,
        } as any);
        await createJournalForPayment(visitPayment, sessionUserId ?? null);
      }
    }
    
    res.status(201).json(visit);
  });

  // Move a visit to another of the SAME patient's cases — the human corrector
  // for historically mis-attributed rows (old physio visits stamped onto the
  // prosthetic case by migration 019's primary-first catch-all, and device
  // visits typed as physio because the visit form used to force a physio
  // treatment type). Admin / branch manager / canEditVisits, branch-scoped.
  app.patch("/api/visits/:id/case", isAuthenticated, async (req, res) => {
    const branchSession = (req.session as any).branchSession;
    const canEdit = branchSession?.isAdmin || branchSession?.role === "branch_manager"
      || Boolean(branchSession?.permissions?.canEditVisits);
    if (!canEdit) return res.status(403).json({ message: "ليس لديك صلاحية تعديل الزيارات" });

    const id = Number(req.params.id);
    const [existing] = await db.select().from(visits)
      .where(and(eq(visits.id, id), isNull(visits.deletedAt)));
    if (!existing) return res.status(404).json({ message: "الزيارة غير موجودة" });
    const allowedMv = accessibleBranchesFor(req);
    if (allowedMv !== null && !allowedMv.includes(existing.branchId)) {
      return res.status(403).json({ message: "لا يمكنك تعديل زيارة من فرع آخر" });
    }
    const caseId = Number(req.body?.caseId);
    const [target] = await db.select().from(patientCases)
      .where(and(eq(patientCases.id, caseId), eq(patientCases.patientId, existing.patientId)));
    if (!target) return res.status(400).json({ message: "الحالة غير موجودة لهذا المريض" });

    const [updated] = await db.update(visits).set({ caseId }).where(eq(visits.id, id)).returning();
    await logAudit({
      entityType: "visit", entityId: id, action: "update",
      userId: branchSession?.userId ?? null, userName: branchSession?.displayName ?? null,
      branchId: existing.branchId, ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
      notes: `نقل الزيارة إلى حالة ${target.caseType} (#${caseId})`,
    });
    res.json(updated);
  });

  // Update visit (admin only — visits are financial records that trigger
  // revenue journal entries, so editing must be restricted)
  app.patch("/api/visits/:id", isAuthenticated, async (req, res) => {
    const branchSession = (req.session as any).branchSession;
    const canEdit =
      branchSession?.isAdmin ||
      Boolean(branchSession?.permissions?.canEditVisits);
    if (!canEdit) {
      return res.status(403).json({ message: "ليس لديك صلاحية تعديل الزيارات" });
    }

    const id = Number(req.params.id);
    const [existing] = await db.select().from(visits)
      .where(and(eq(visits.id, id), isNull(visits.deletedAt)));
    if (!existing) return res.status(404).json({ message: "الزيارة غير موجودة" });

    const allowed = accessibleBranchesFor(req);
    if (allowed !== null && !allowed.includes(existing.branchId)) {
      return res.status(403).json({ message: "لا يمكنك تعديل زيارة من فرع آخر" });
    }
    const { details, notes, treatmentType, sessionCount, cost, customDate } = req.body;

    // ══ زيارةٌ مرتبطةٌ بجهاز لا يُنقَل وسمُها إلى خدمةٍ أخرى ═══════════════
    // الرابط يسمّي جهازاً على خيطٍ من نوعٍ بعينه. فإعادة وسم الزيارة إلى
    // خدمةٍ أخرى تترك الرابط معلّقاً على جهازٍ من نوعٍ مختلف. يُردّ قبل أي
    // كتابة، ولا يُمسَح الرابط ولا يُنقَل تلقائياً.
    if (existing.deviceEpisodeId != null && treatmentType !== undefined) {
      const nextSvc = deviceServiceOfCaseType(treatmentType);
      const currentSvc = deviceServiceOfCaseType(existing.treatmentType);
      if (nextSvc !== currentSvc) {
        return res.status(409).json({
          message: "هذه الزيارة مرتبطة بجهاز محدَّد — لا يمكن تغيير نوعها إلى خدمة أخرى",
        });
      }
    }

    const updateData: any = { details, notes, treatmentType, sessionCount, cost };

    if (customDate !== undefined) {
      const baghdadOffset = 3 * 60 * 60 * 1000;
      const nowBaghdad = new Date(Date.now() + baghdadOffset);
      const currentHours = nowBaghdad.getUTCHours();
      const currentMinutes = nowBaghdad.getUTCMinutes();
      const currentSeconds = nowBaghdad.getUTCSeconds();
      const [year, month, day] = customDate.split('-').map(Number);
      const backdatedBaghdad = new Date(Date.UTC(year, month - 1, day, currentHours, currentMinutes, currentSeconds));
      updateData.visitDate = new Date(backdatedBaghdad.getTime() - baghdadOffset);
    }

    const updated = await storage.updateVisit(id, updateData);

    // Changing a paid visit's COST corrects the money with it (owner's
    // decision, audit 2026-07-29): the patient total, the dated cost ledger,
    // and the payment this visit created — previously only the visit row
    // changed and the three records drifted apart. The linked payment is
    // found by visit_id (038); for visits older than the link, an exact
    // single-candidate match is accepted and anything ambiguous is left
    // untouched and REPORTED, never guessed.
    let moneyNote: string | null = null;
    const oldCost = existing.cost || 0;
    const newCost = typeof cost === "number" ? cost : oldCost;
    if (newCost !== oldCost) {
      const patient = await storage.getPatient(existing.patientId);
      if (patient) {
        await storage.updatePatient(patient.id, {
          totalCost: Math.max(0, (patient.totalCost || 0) + (newCost - oldCost)),
        }, "visit");
      }
      const linked = await findVisitPayment(id, existing.patientId, oldCost);
      if (linked) {
        await reverseJournalForSource("payment", linked.id, branchSession?.userId ?? null, "تعديل كلفة الزيارة");
        const updatedPayment = await storage.updatePayment(linked.id, { amount: newCost });
        if (updatedPayment && newCost > 0) await createJournalForPayment(updatedPayment, branchSession?.userId ?? null);
        await logAudit({
          entityType: "payment", entityId: linked.id, action: "update",
          userId: branchSession?.userId ?? null, userName: branchSession?.displayName ?? null,
          branchId: existing.branchId,
          oldValues: { amount: oldCost }, newValues: { amount: newCost },
          ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
          notes: `تصحيح دفعة الزيارة تبعاً لتعديل كلفتها`,
        });
      } else {
        moneyNote = "عُدّلت كلفة الزيارة وكلفة المريض، لكن لم أجد دفعة الزيارة الأصلية بشكل قاطع — راجع دفعات المريض وصحّح المبلغ يدوياً.";
      }
    }

    await logAudit({
      entityType: "visit",
      entityId: id,
      action: "update",
      userId: branchSession?.userId ?? null,
      userName: branchSession?.displayName ?? null,
      branchId: existing.branchId,
      oldValues: existing,
      newValues: updated,
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
    });

    res.json({ ...updated, moneyNote });
  });

  // Delete visit — admin, branch_manager, or any user the admin
  // explicitly granted canDeleteVisits.
  app.delete("/api/visits/:id", isAuthenticated, async (req, res) => {
    const branchSession = (req.session as any).branchSession;
    const canDelete =
      branchSession?.isAdmin ||
      Boolean(branchSession?.permissions?.canDeleteVisits);
    if (!canDelete) {
      return res.status(403).json({ message: "ليس لديك صلاحية حذف الزيارات" });
    }

    const id = Number(req.params.id);
    const [existing] = await db.select().from(visits)
      .where(and(eq(visits.id, id), isNull(visits.deletedAt)));
    if (!existing) return res.status(404).json({ message: "الزيارة غير موجودة" });

    const allowed = accessibleBranchesFor(req);
    if (allowed !== null && !allowed.includes(existing.branchId)) {
      return res.status(403).json({ message: "لا يمكنك حذف زيارة من فرع آخر" });
    }

    await storage.deleteVisit(id);

    // Deleting a PAID visit takes its money with it (owner's decision, audit
    // 2026-07-29: «حذف كل شيء كي يبقى النظام صحيح»): the cost it added and
    // the payment it created both reverse, so no phantom debt or orphan
    // payment survives the deletion. If the visit's payment cannot be
    // identified with certainty, NOTHING money-side is touched and the staff
    // is told — reversing half of it would fabricate a debt.
    let moneyNote: string | null = null;
    const visitCost = existing.cost || 0;
    if (visitCost > 0) {
      const linked = await findVisitPayment(id, existing.patientId, visitCost);
      if (linked) {
        const patient = await storage.getPatient(existing.patientId);
        if (patient) {
          await storage.updatePatient(patient.id, {
            totalCost: Math.max(0, (patient.totalCost || 0) - visitCost),
          }, "visit");
        }
        await reverseJournalForSource("payment", linked.id, branchSession?.userId ?? null, "حذف الزيارة المدفوعة");
        await logAudit({
          entityType: "payment", entityId: linked.id, action: "delete",
          userId: branchSession?.userId ?? null, userName: branchSession?.displayName ?? null,
          branchId: existing.branchId, oldValues: linked,
          ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
          notes: `حذف دفعة الزيارة تبعاً لحذف الزيارة ${id}`,
        });
        await storage.deletePayment(linked.id);
      } else {
        moneyNote = "حُذفت الزيارة، لكن لم أجد دفعتها الأصلية بشكل قاطع فبقيت كلفتها ودفعتها — راجع دفعات المريض واحذف/صحّح يدوياً.";
      }
    }

    await logAudit({
      entityType: "visit",
      entityId: id,
      action: "delete",
      userId: branchSession?.userId ?? null,
      userName: branchSession?.displayName ?? null,
      branchId: existing.branchId,
      oldValues: existing,
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
    });

    res.json({ ok: true, moneyNote });
  });

  // Payments
  app.post(api.payments.create.path, isAuthenticated, async (req, res) => {
    // ══ حقولٌ للطلب لا للجدول ═══════════════════════════════════════════
    // تُنزَع قبل التحقّق والإدراج: `deviceEpisodeId` **لا يُقبل من العميل
    // إطلاقاً** — يُحلّ في الخادم بعد التحقّق، وإلّا صار بالإمكان تعليق
    // مالٍ على جهاز مريضٍ آخر بطلبٍ مصنوع يدوياً.
    const {
      treatmentEntries,
      deviceEpisodeId: requestedEpisodeId,
      unallocatedDeviceBalance,
      ...bodyWithoutEntries
    } = req.body ?? {};
    const input = api.payments.create.input.parse(bodyWithoutEntries);
    
    // Authorization: Only admin or branch_manager can set isFreeSessions to true
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const isBranchManager = branchSession?.role === "branch_manager";
    const isFreeSessions = (isAdmin || isBranchManager) ? (req.body.isFreeSessions || false) : false;

    // ══ **مَن يملك كتابة دفعة أصلاً؟** ═══════════════════════════════════
    // `isAuthenticated` وحدها تتحقّق من وجود جلسة، لا من الصلاحية — أيّ
    // حسابٍ مسجَّل الدخول كان يستطيع فتح هذه النقطة مباشرةً (تجاوز زرّ
    // الواجهة المخفيّ) ولو لم يحمل `canAddPayments` على صفّه. نفسُ بوّابة
    // `/api/patients/:id/new-service` حرفياً — لا صلاحية محاسبةٍ أوسع
    // (`canManageAccounting`) تُشترَط هنا، وهذه صلاحيةُ الإضافة وحدها.
    const canAddPaymentPermission =
      isAdmin || isBranchManager || branchSession?.permissions?.canAddPayments === true;
    if (!canAddPaymentPermission) {
      return res.status(403).json({ message: "ليس لديك صلاحية لإضافة دفعات" });
    }

    //  **ولا دفعةَ على ملفٍّ في السلّة** (ترحيل ٠٦٨): الحارسُ صريحٌ لا
    //  مشتقٌّ من فحص «المتبقّي» أدناه — ذاك يتخطّى الملفَّ الغائب بصمت،
    //  فكانت الدفعةُ تُسجَّل على محذوفٍ ولا يراها أحد.
    const livePatient = await storage.getPatient(input.patientId);
    if (!livePatient) {
      const any = await storage.getPatientAnyState(input.patientId);
      return res.status(any ? 409 : 404).json({
        message: any ? PATIENT_IN_TRASH_ERROR : "المريض غير موجود",
      });
    }

    // ══ **نطاقُ الفرع من صفّ المريض المقفول لا من جسم الطلب** ═══════════
    // `input.branchId` قيمةٌ يرسلها العميل، ولا سلطة لها وحدها: طلبٌ
    // مصنوعٌ يدوياً كان يستطيع أن يسجّل دفعةً على فرعٍ لا يصل إليه صاحبُه.
    // الفرعُ الحقيقيّ هو فرعُ المريض نفسه — نفسُ نمط `/new-service`
    // (`accessibleBranchesFor`)، فلا تُخترَع سياسةُ فروعٍ ثانية.
    const allowedBranchesForPayment = accessibleBranchesFor(req);
    if (allowedBranchesForPayment !== null && !allowedBranchesForPayment.includes(livePatient.branchId)) {
      return res.status(403).json({ message: "غير مصرح لك بهذا الفرع" });
    }
    // والصفُّ يُكتب بفرع المريض الحقيقيّ دائماً — لا بما أرسله العميل.
    input.branchId = livePatient.branchId;

    // Check if patient has remaining balance before accepting payment (skip for free sessions)
    if (!isFreeSessions) {
      const patient = await storage.getPatient(input.patientId);
      if (patient) {
        const payments = await storage.getPaymentsByPatientId(input.patientId);
        const totalPaid = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        const remaining = (patient.totalCost || 0) - totalPaid;
        if (remaining <= 0) {
          return res.status(400).json({ message: "لا يمكن تسجيل دفعة جديدة لعدم وجود مبلغ متبقي. الرجاء إضافة خدمة جديدة أولاً." });
        }
      }
    }
    
    const sessionInfo = (req.session as any).branchSession;
    const userId = sessionInfo?.userId ?? null;
    const userName = sessionInfo?.displayName ?? null;

    // ══ أيّ جهازٍ تخصّ هذه الدفعة؟ ═══════════════════════════════════════
    // الوسم يقول الخدمة، والموظّف يقول الجهاز. فما دام للمريض جهازٌ واحد
    // فقط من النوع لا فرق — لكنه اليوم قد يملك اثنين، ودفعةٌ بلا هوية
    // تصير ديناً معلّقاً بين جهازين لا يُعرف صاحبه بعد شهر.
    //
    // ولا تخمين: إمّا جهازٌ محدَّد وإمّا إقرارٌ صريح بأنها «رصيد جهاز
    // قديم/غير مخصَّص». والصمت يُردّ ٤٠٠ مع قائمة الأجهزة ليختار الموظّف.
    const entriesArray = Array.isArray(treatmentEntries) ? treatmentEntries : [];
    if (hasMixedDeviceEntries(entriesArray)) {
      return res.status(400).json({
        message: "دفعة الجهاز معاملةٌ لجهازٍ واحد — سجّل الجهاز في دفعة مستقلّة",
      });
    }
    const taggedType = entriesArray.length > 0
      ? entriesArray.map((e: any) => e?.treatmentType).filter(Boolean).join("، ")
      : (input as any).paymentTreatmentType;
    const deviceService = deviceServiceOfPaymentType(taggedType);
    if (deviceService === "mixed") {
      return res.status(400).json({
        message: "دفعة الجهاز معاملةٌ لجهازٍ واحد — سجّل الجهاز في دفعة مستقلّة",
      });
    }
    // ══ **والحالةُ الموسومة يجب أن تكون حالتَه هو** ═══════════════════════
    // النافذةُ لا تعرض إلّا حالاتِ المريض، لكنّ العرضَ ليس حراسة: وسمٌ من
    // نافذةٍ قديمة أو طلبٍ مصنوعٍ بيدٍ كان يُدخل مالَ مريضِ علاجٍ طبيعي في
    // قسم الأجهزة بلا اعتراض. والفحصُ هنا — لا في الواجهة — هو ما يجعل
    // القاعدةَ حقيقية.
    if (deviceService === "prosthetic" || deviceService === "medical_support") {
      if (!(await patientOwnsCase(input.patientId, deviceService))) {
        return res.status(400).json({
          message: deviceService === "prosthetic"
            ? "لا توجد حالة أطراف صناعية على ملفّ هذا المريض — راجع نوع الدفعة"
            : "لا توجد حالة مساند طبية على ملفّ هذا المريض — راجع نوع الدفعة",
        });
      }
    }

    // القرار والكتابة معاً داخل معاملة واحدة (انظر `createPaymentAttributed`).
    // فما يُقرَّر هنا لا يُبنى على لقطةٍ قد تشيخ قبل الإدراج.
    const attribution = deviceService
      ? {
          serviceType: deviceService,
          requestedEpisodeId: requestedEpisodeId,
          explicitLegacy: unallocatedDeviceBalance === true,
        }
      : null;
    const writePayment = (values: any) => attribution
      ? storage.createPaymentAttributed(values, attribution)
      : storage.createPayment(values);

    try {

    if (treatmentEntries && Array.isArray(treatmentEntries) && treatmentEntries.length > 0) {
      const results = [];
      for (const entry of treatmentEntries) {
        if (entry.cost > 0 || isFreeSessions) {
          const payment = await writePayment({
            ...input,
            amount: isFreeSessions ? 0 : entry.cost,
            notes: input.notes ? `${input.notes} - ${entry.treatmentType} (${entry.sessionCount} جلسة)` : `${entry.treatmentType} (${entry.sessionCount} جلسة)`,
            paymentTreatmentType: entry.treatmentType,
            sessionCount: entry.sessionCount,
            isFreeSessions: isFreeSessions,
          });
          results.push(payment);
          // تلقائي: إنشاء قيد محاسبي مزدوج (لا يؤثر على الدفعة في حال فشل)
          if (!isFreeSessions && payment.amount > 0) {
            await createJournalForPayment(payment, userId);
          }
          await logAudit({
            entityType: "payment",
            entityId: payment.id,
            action: "create",
            userId, userName,
            branchId: payment.branchId,
            newValues: payment,
            ipAddress: req.ip ?? null,
            userAgent: req.get("user-agent") ?? null,
          });
        }
      }
      // SAFETY NET: أنواع الطرف/المسند بمبلغ يدوي تصل بكلفة إدخال = 0، فلا
      // ينشئ الحلقة أعلاه أي دفعة رغم وجود مبلغ حقيقي في input.amount. في هذه
      // الحالة ننشئ دفعة واحدة بالمبلغ اليدوي ووسم النوع — فلا يضيع أي مبلغ.
      if (results.length === 0 && !isFreeSessions && Number(input.amount) > 0) {
        const payment = await writePayment({ ...input });
        results.push(payment);
        if (payment.amount > 0) await createJournalForPayment(payment, userId);
        await logAudit({
          entityType: "payment", entityId: payment.id, action: "create",
          userId, userName, branchId: payment.branchId, newValues: payment,
          ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        });
      }
      res.status(201).json(results[0] || { message: "No payments created" });
    } else {
      const payment = await writePayment({ ...input });
      if (!isFreeSessions && payment.amount > 0) {
        await createJournalForPayment(payment, userId);
      }
      await logAudit({
        entityType: "payment",
        entityId: payment.id,
        action: "create",
        userId, userName,
        branchId: payment.branchId,
        newValues: payment,
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
      });
      res.status(201).json(payment);
    }
    } catch (err: any) {
      // هوية جهازٍ غير صالحة — جوابُ عملٍ من داخل المعاملة، لا 500.
      if (err instanceof DeviceEpisodeError) {
        return res.status(err.status).json({ message: err.message });
      }
      throw err;
    }
  });

  // Delete payment
  app.delete("/api/payments/:id", isAuthenticated, async (req, res) => {
    const permissions = getPermissions(req);
    if (!permissions.canDeletePayments) {
      return res.status(403).json({ message: "ليس لديك صلاحية لحذف المدفوعات" });
    }

    const id = Number(req.params.id);
    const sessionInfo = (req.session as any).branchSession;
    const userId = sessionInfo?.userId ?? null;
    const userName = sessionInfo?.displayName ?? null;

    // عكس القيد المحاسبي قبل حذف الدفعة
    await reverseJournalForSource("payment", id, userId, "حذف الدفعة");
    await logAudit({
      entityType: "payment",
      entityId: id,
      action: "delete",
      userId, userName,
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
    });
    await storage.deletePayment(id);
    res.status(204).send();
  });

  // Update payment session info — admin or branch_manager (within branch)
  app.patch("/api/payments/:id/session-info", isAuthenticated, async (req, res) => {
    if (!isAdminOrManager(req)) {
      return res.status(403).json({ message: "فقط المدير يمكنه تعديل بيانات الجلسات" });
    }
    const id = Number(req.params.id);
    const allowed = accessibleBranchesFor(req);
    if (allowed !== null) {
      const [existing] = await db.select().from(payments).where(eq(payments.id, id));
      if (!existing) return res.status(404).json({ message: "الدفعة غير موجودة" });
      if (!allowed.includes(existing.branchId)) {
        return res.status(403).json({ message: "لا يمكنك تعديل دفعة من فرع آخر" });
      }
    }
    const { sessionCount, paymentTreatmentType } = req.body;
    const [beforeInfo] = await db.select().from(payments).where(eq(payments.id, id));
    const beforeLink = beforeInfo;
    // ══ دفعةٌ مرتبطةٌ بجهاز لا يتغيّر وسمُها إلى خدمةٍ أخرى ══════════════
    // الرابط يسمّي جهازاً على خيطٍ من نوعٍ بعينه. فتحويل وسم الدفعة إلى
    // خدمةٍ أخرى — أو إلى ما ليس جهازاً — يترك الرابط يشير إلى جهازٍ من
    // نوعٍ مختلف: ليس حقلاً بائتاً بل مالاً منسوباً لجهازٍ لا يخصّه. ولا
    // يُمسَح الرابط ولا يُنقَل تلقائياً — إعادة الإسناد قرارٌ إداري صريح.
    if (beforeLink?.deviceEpisodeId != null && paymentTreatmentType !== undefined) {
      const nextService = deviceServiceOfPaymentType(paymentTreatmentType);
      const currentService = deviceServiceOfPaymentType(beforeLink.paymentTreatmentType);
      if (nextService !== currentService) {
        return res.status(409).json({
          message: "هذه الدفعة مرتبطة بجهاز محدَّد — لا يمكن تغيير نوعها إلى خدمة أخرى",
        });
      }
    }
    const updated = await storage.updatePaymentSessionInfo(id, sessionCount ?? null, paymentTreatmentType ?? null);
    // Retagging moves the money between SECTIONS in the accounting split, so
    // it is audited like any other money-shape change.
    const s = (req.session as any).branchSession;
    await logAudit({
      entityType: "payment", entityId: id, action: "update",
      userId: s?.userId ?? null, userName: s?.displayName ?? null,
      branchId: updated?.branchId ?? beforeInfo?.branchId ?? null,
      oldValues: beforeInfo ? { sessionCount: beforeInfo.sessionCount, paymentTreatmentType: beforeInfo.paymentTreatmentType } : undefined,
      newValues: { sessionCount: sessionCount ?? null, paymentTreatmentType: paymentTreatmentType ?? null },
      ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
      notes: "تعديل بيانات جلسات/وسم الدفعة",
    });
    res.json(updated);
  });

  app.patch("/api/payments/:id", isAuthenticated, async (req, res) => {
    const permissions = getPermissions(req);
    
    if (!permissions.canEditPayments) {
      return res.status(403).json({ message: "ليس لديك صلاحية لتعديل المدفوعات" });
    }
    
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const isBranchManager = branchSession?.role === "branch_manager";

    const id = Number(req.params.id);
    // Branch isolation — same guard as /session-info: a branch-A user must not
    // edit (or retag, which restructures cases) another branch's payments.
    const allowedBranches = accessibleBranchesFor(req);
    if (allowedBranches !== null) {
      const [existingPayment] = await db.select().from(payments).where(eq(payments.id, id));
      if (!existingPayment) return res.status(404).json({ message: "الدفعة غير موجودة" });
      if (!allowedBranches.includes(existingPayment.branchId)) {
        return res.status(403).json({ message: "لا يمكنك تعديل دفعة من فرع آخر" });
      }
    }
    const { amount, notes, sessionCount, paymentTreatmentType, customDate, isFreeSessions } = req.body;
    const [beforeLink] = await db.select().from(payments).where(eq(payments.id, id));
    if (!beforeLink) return res.status(404).json({ message: "الدفعة غير موجودة" });
    // ══ دفعةٌ مرتبطةٌ بجهاز لا يتغيّر وسمُها إلى خدمةٍ أخرى ══════════════
    // الرابط يسمّي جهازاً على خيطٍ من نوعٍ بعينه. فتحويل وسم الدفعة إلى
    // خدمةٍ أخرى — أو إلى ما ليس جهازاً — يترك الرابط يشير إلى جهازٍ من
    // نوعٍ مختلف: ليس حقلاً بائتاً بل مالاً منسوباً لجهازٍ لا يخصّه. ولا
    // يُمسَح الرابط ولا يُنقَل تلقائياً — إعادة الإسناد قرارٌ إداري صريح.
    if (beforeLink?.deviceEpisodeId != null && paymentTreatmentType !== undefined) {
      const nextService = deviceServiceOfPaymentType(paymentTreatmentType);
      const currentService = deviceServiceOfPaymentType(beforeLink.paymentTreatmentType);
      if (nextService !== currentService) {
        return res.status(409).json({
          message: "هذه الدفعة مرتبطة بجهاز محدَّد — لا يمكن تغيير نوعها إلى خدمة أخرى",
        });
      }
    }
    const updateData: any = {};
    if (amount !== undefined) updateData.amount = amount;
    if (notes !== undefined) updateData.notes = notes || null;
    if (sessionCount !== undefined) updateData.sessionCount = sessionCount || null;
    if (paymentTreatmentType !== undefined) updateData.paymentTreatmentType = paymentTreatmentType || null;
    // Only admin or branch_manager can set isFreeSessions
    if (isFreeSessions !== undefined) {
      updateData.isFreeSessions = (isAdmin || isBranchManager) ? !!isFreeSessions : false;
    }
    if (customDate !== undefined) {
      const baghdadOffset = 3 * 60 * 60 * 1000;
      const nowBaghdad = new Date(Date.now() + baghdadOffset);
      const currentHours = nowBaghdad.getUTCHours();
      const currentMinutes = nowBaghdad.getUTCMinutes();
      const currentSeconds = nowBaghdad.getUTCSeconds();
      const [year, month, day] = customDate.split('-').map(Number);
      const backdatedBaghdad = new Date(Date.UTC(year, month - 1, day, currentHours, currentMinutes, currentSeconds));
      updateData.date = new Date(backdatedBaghdad.getTime() - baghdadOffset);
    }
    // Audit + double-entry resync (accounting audit, 2026-07-29): CREATE and
    // DELETE were both audited and journaled, but EDIT was neither — a money
    // amount could change with no trace, and the journal kept the old figure.
    const [beforeEdit] = await db.select().from(payments).where(eq(payments.id, id));
    const updated = await storage.updatePayment(id, updateData);
    if (beforeEdit && updated && updateData.amount !== undefined && updated.amount !== beforeEdit.amount) {
      await reverseJournalForSource("payment", id, branchSession?.userId ?? null, "تعديل مبلغ الدفعة");
      if (updated.amount > 0 && !updated.isFreeSessions) {
        await createJournalForPayment(updated, branchSession?.userId ?? null);
      }
    }
    await logAudit({
      entityType: "payment", entityId: id, action: "update",
      userId: branchSession?.userId ?? null, userName: branchSession?.displayName ?? null,
      branchId: updated?.branchId ?? beforeEdit?.branchId ?? null,
      oldValues: beforeEdit ?? undefined, newValues: updated ?? undefined,
      ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
    });
    res.json(updated);
  });

  // Documents
  app.post(api.documents.create.path, isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "لم يتم اختيار ملف" });
      }
      
      const patientId = Number(req.body.patientId);
      const documentType = req.body.documentType || "report";
      
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "المريض غير موجود" });
      }
      
      const document = await storage.createDocument({
        patientId,
        fileName: file.originalname,
        fileUrl: `/uploads/${file.filename}`,
        documentType,
      });
      
      res.status(201).json(document);
    } catch (err) {
      console.error("Error uploading document:", err);
      res.status(500).json({ message: "حدث خطأ أثناء رفع المستند" });
    }
  });

  // Delete document — admin or branch_manager (within branch)
  app.delete(api.documents.delete.path, isAuthenticated, async (req, res) => {
    if (!isAdminOrManager(req)) {
      return res.status(403).json({ message: "فقط المدير يمكنه حذف المستندات" });
    }

    const id = Number(req.params.id);
    const allowed = accessibleBranchesFor(req);
    if (allowed !== null) {
      // Documents are tied to a patient; verify the owning patient is
      // within the requester's accessible branches.
      const [doc] = await db.select().from(documents).where(eq(documents.id, id));
      if (!doc) return res.status(404).json({ message: "المستند غير موجود" });
      const patient = await storage.getPatient(doc.patientId);
      if (!patient || !allowed.includes(patient.branchId)) {
        return res.status(403).json({ message: "لا يمكنك حذف مستند خارج نطاقك" });
      }
    }
    await storage.deleteDocument(id);
    res.status(204).send();
  });

  // Daily Report for specific branch.
  // Non-admins can only request their own branch.
  app.get(api.reports.daily.path, isAuthenticated, async (req, res) => {
    const branchId = Number(req.params.branchId);
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin && branchSession?.branchId !== branchId) {
      return res.status(403).json({ message: "غير مصرح لك بالوصول لهذا الفرع" });
    }
    const branchPatients = await storage.getPatients(branchId);
    const branchPayments = await storage.getPaymentsByBranch(branchId);
    
    const sold = branchPatients.reduce((acc, p) => acc + (p.totalCost || 0), 0);
    const paid = branchPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    
    res.json({
      revenue: paid,
      sold,
      paid,
      remaining: sold - paid
    });
  });

  // Overall stats for all branches (for dashboard) - supports branchId filter
  app.get("/api/reports/overall", isAuthenticated, async (req, res) => {
    // Non-admins are pinned to their own branch; admin honours the query param
    // or omits it for cross-branch totals.
    const enforced = enforceBranchAccess(req);

    // Pure SQL aggregates — previously this loaded EVERY patient and EVERY
    // payment into memory just to sum them, which made the dashboard slow.
    const branchWhere = enforced !== undefined ? sql`AND branch_id = ${enforced}` : sql``;
    //  **والمحذوفُ خارج الطرفين** (ترحيل ٠٦٨): لا كلفتُه في «المبيعات» ولا
    //  مدفوعُه في «الوارد» — وإلّا ظهر «المتبقّي» عن ملفٍّ أُخرج من النظام.
    const [patAgg, payAgg] = await Promise.all([
      db.execute(sql`
        SELECT COUNT(*)::int AS total,
               COALESCE(SUM(total_cost), 0)::bigint AS sold,
               COUNT(*) FILTER (WHERE is_amputee)::int AS amputees,
               COUNT(*) FILTER (WHERE is_physiotherapy)::int AS physiotherapy,
               COUNT(*) FILTER (WHERE is_medical_support)::int AS medical_support
        FROM patients WHERE deleted_at IS NULL ${branchWhere}
      `),
      db.execute(sql`
        SELECT COALESCE(SUM(amount), 0)::bigint AS paid FROM payments pay
         WHERE ${belongsToActivePatientSql("pay")} ${branchWhere}
      `),
    ]);
    const p = patAgg.rows[0] as any;
    const totalPaid = Number((payAgg.rows[0] as any)?.paid ?? 0);
    const totalSold = Number(p?.sold ?? 0);

    res.json({
      revenue: totalPaid,
      sold: totalSold,
      paid: totalPaid,
      remaining: totalSold - totalPaid,
      totalPatients: Number(p?.total ?? 0),
      amputees: Number(p?.amputees ?? 0),
      physiotherapy: Number(p?.physiotherapy ?? 0),
      medicalSupport: Number(p?.medical_support ?? 0)
    });
  });

  // All branches revenues endpoint (supports daily filter).
  // Non-admins only see their own branch in the response (a single-row map);
  // admins see every branch.
  app.get("/api/reports/all-branches", isAuthenticated, async (req, res) => {
    const allowedBranchId = enforceBranchAccess(req);
    const allBranches = await storage.getBranches();
    const branches = allowedBranchId !== undefined
      ? allBranches.filter((b) => b.id === allowedBranchId)
      : allBranches;
    const daily = req.query.daily === "true";

    // Today's range (same semantics the in-memory version used).
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Two grouped aggregates instead of loading every patient + N payment
    // queries. Daily mode (owner's definitions, 2026-07-28): "sold" is the
    // day's cost-ledger sum (cost created today, any patient) and "paid" is
    // every payment collected today — not just from today's registrees.
    const [soldRows, paidRows] = await Promise.all([
      daily
        ? db.execute(sql`
            SELECT branch_id, COALESCE(SUM(amount), 0)::bigint AS sold
            FROM cost_entries ce
            WHERE ce.created_at >= ${startOfDay} AND ce.created_at < ${endOfDay}
              AND ${belongsToActivePatientSql("ce")}
            GROUP BY branch_id
          `)
        : db.execute(sql`
            SELECT branch_id, COALESCE(SUM(total_cost), 0)::bigint AS sold
            FROM patients WHERE deleted_at IS NULL GROUP BY branch_id
          `),
      daily
        ? db.execute(sql`
            SELECT branch_id, COALESCE(SUM(amount), 0)::bigint AS paid
            FROM payments pay
            WHERE pay.date >= ${startOfDay} AND pay.date < ${endOfDay}
              AND ${belongsToActivePatientSql("pay")}
            GROUP BY branch_id
          `)
        : db.execute(sql`
            SELECT branch_id, COALESCE(SUM(amount), 0)::bigint AS paid
            FROM payments pay
             WHERE ${belongsToActivePatientSql("pay")}
             GROUP BY branch_id
          `),
    ]);
    const soldBy = new Map((soldRows.rows as any[]).map((r) => [Number(r.branch_id), Number(r.sold)]));
    const paidBy = new Map((paidRows.rows as any[]).map((r) => [Number(r.branch_id), Number(r.paid)]));

    const result: Record<number, { revenue: number; sold: number; paid: number; remaining: number }> = {};
    for (const branch of branches) {
      const sold = soldBy.get(branch.id) ?? 0;
      const paid = paidBy.get(branch.id) ?? 0;
      result[branch.id] = { revenue: paid, sold, paid, remaining: sold - paid };
    }

    res.json(result);
  });

  // Detailed financial report by branch with transactions grouped by date.
  // Non-admins can only request their own branch.
  app.get("/api/reports/detailed/:branchId", isAuthenticated, async (req, res) => {
    const branchId = parseInt(req.params.branchId);
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin && branchSession?.branchId !== branchId) {
      return res.status(403).json({ message: "غير مصرح لك بالوصول لهذا الفرع" });
    }
    // Window the report: only the last N days of rows are loaded and shipped
    // (default 45; days=0 = full history). Whole-history totals still come
    // from SQL aggregates below, so the header numbers stay complete.
    const daysRaw = parseInt(String(req.query.days));
    const days = Number.isFinite(daysRaw) && daysRaw >= 0 ? daysRaw : 45;
    const cutoff = days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;

    const [patients, payments, visits, financeTotals, dayCostEntries, branchExpenses] = await Promise.all([
      storage.getPatientsSince(branchId, cutoff),
      storage.getPaymentsByBranchSince(branchId, cutoff),
      storage.getVisitsByBranchSince(branchId, cutoff),
      storage.getBranchFinanceTotals(branchId),
      storage.getCostEntriesByBranchSince(branchId, cutoff),
      storage.getExpenses(branchId, cutoff ? cutoff.toISOString().split("T")[0] : undefined),
    ]);

    // Create patient lookup map
    const patientMap = new Map(patients.map((p: Patient) => [p.id, p]));

    // The `patients` list is windowed by REGISTRATION date, but a payment or
    // visit inside the window can belong to an OLDER patient (registered before
    // the cutoff) — that patient would be missing from the map and render as
    // "غير معروف". Backfill every referenced-but-missing patient by id so
    // names always resolve, while keeping the windowing performance win.
    const referencedIds = new Set<number>();
    for (const p of payments) referencedIds.add(p.patientId);
    for (const v of visits) referencedIds.add(v.patientId);
    for (const e of dayCostEntries) referencedIds.add(e.patientId);
    const missingIds = Array.from(referencedIds).filter((id) => id != null && !patientMap.has(id));
    if (missingIds.length > 0) {
      const extra = await storage.getPatientsByIds(missingIds);
      for (const p of extra) patientMap.set(p.id, p);
    }

    // Lifetime paid per referenced patient — powers the "still owed" column
    // next to old-debt payments.
    const paidTotals = await storage.getPaidTotalsByPatientIds(
      Array.from(referencedIds).filter((id) => id != null),
    );

    const patientVisitMap = new Map<number, string>();
    for (const visit of visits) {
      if (!patientVisitMap.has(visit.patientId)) {
        const visitDetail = visit.details || visit.notes || null;
        if (visitDetail) {
          patientVisitMap.set(visit.patientId, visitDetail);
        }
      }
    }
    
    // Define types
    type PaymentDetail = {
      id: number;
      patientId: number;
      patientName: string;
      amount: number;
      notes: string | null;
      date: string;
      patientTotalCost: number;
      paymentTreatmentType: string | null;
      // true = pays for a service created the same day (a cost entry or the
      // patient's registration on that date); false = settles an older debt.
      isForToday: boolean;
      // What the patient still owes right now (lifetime cost − lifetime paid).
      patientRemaining: number;
    };
    
    type PatientDetail = {
      id: number;
      name: string;
      totalCost: number;
      isAmputee: boolean;
      isPhysiotherapy: boolean;
      isMedicalSupport: boolean;
      createdAt: string;
      visitReason: string | null;
    };
    
    type CostEntryDetail = {
      id: number;
      patientId: number;
      patientName: string;
      amount: number;
      source: string;
      notes: string | null;
      date: string;
    };

    // Group payments by date (YYYY-MM-DD)
    const paymentsByDate: Record<string, PaymentDetail[]> = {};

    // Group patients by registration date (for showing new patients)
    const patientsByDate: Record<string, PatientDetail[]> = {};

    // Group dated cost-ledger rows (migration 033) — THE day's التكاليف.
    const costEntriesByDate: Record<string, CostEntryDetail[]> = {};

    type ExpenseDetail = {
      id: number;
      category: string;
      subcategory: string | null;
      description: string | null;
      amount: number;
    };
    // Branch expenses by their user-chosen date (already YYYY-MM-DD).
    const expensesByDate: Record<string, ExpenseDetail[]> = {};
    for (const ex of branchExpenses) {
      const key = String(ex.expenseDate);
      if (!expensesByDate[key]) expensesByDate[key] = [];
      expensesByDate[key].push({
        id: ex.id,
        category: ex.category,
        subcategory: ex.subcategory ?? null,
        description: ex.description ?? null,
        amount: ex.amount,
      });
    }
    
    // Helper function to get local date key (YYYY-MM-DD)
    const getLocalDateKey = (date: Date | string | null): string => {
      if (!date) return 'unknown';
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    // (patientId, day) pairs that created cost that day — the test for
    // "this payment pays for TODAY's service" vs "settles an old debt".
    const sameDayCost = new Set<string>();
    for (const e of dayCostEntries) {
      if (e.amount > 0) sameDayCost.add(`${e.patientId}|${getLocalDateKey(e.createdAt)}`);
    }

    // Process payments
    for (const payment of payments) {
      const patient = patientMap.get(payment.patientId);
      const dateKey = getLocalDateKey(payment.date);

      if (!paymentsByDate[dateKey]) {
        paymentsByDate[dateKey] = [];
      }

      const isForToday =
        sameDayCost.has(`${payment.patientId}|${dateKey}`) ||
        (patient ? getLocalDateKey(patient.createdAt) === dateKey : false);
      const paidLifetime = paidTotals.get(payment.patientId) ?? 0;

      paymentsByDate[dateKey].push({
        id: payment.id,
        patientId: payment.patientId,
        patientName: patient?.name || 'غير معروف',
        amount: payment.amount,
        notes: payment.notes,
        date: payment.date?.toString() || '',
        patientTotalCost: patient?.totalCost || 0,
        paymentTreatmentType: payment.paymentTreatmentType || null,
        isForToday,
        patientRemaining: Math.max(0, (patient?.totalCost || 0) - paidLifetime),
      });
    }
    
    // Process patients
    for (const patient of patients) {
      const dateKey = getLocalDateKey(patient.createdAt);
      
      if (!patientsByDate[dateKey]) {
        patientsByDate[dateKey] = [];
      }
      
      // Get visit reason from the visits table (details field)
      // Falls back to patient type info if no visit details available
      let visitReason: string | null = patientVisitMap.get(patient.id) || null;
      
      // Fallback to patient type info if no visit details
      if (!visitReason) {
        if (patient.isAmputee) {
          visitReason = patient.amputationSite || patient.prostheticType || null;
        } else if (patient.isPhysiotherapy) {
          visitReason = patient.diseaseType || patient.treatmentType || null;
        } else if (patient.isMedicalSupport) {
          visitReason = patient.supportType || null;
        }
      }
      
      patientsByDate[dateKey].push({
        id: patient.id,
        name: patient.name,
        totalCost: patient.totalCost || 0,
        isAmputee: patient.isAmputee || false,
        isPhysiotherapy: patient.isPhysiotherapy || false,
        isMedicalSupport: patient.isMedicalSupport || false,
        createdAt: patient.createdAt?.toString() || '',
        visitReason
      });
    }
    
    // Process cost-ledger rows
    for (const entry of dayCostEntries) {
      const patient = patientMap.get(entry.patientId);
      const dateKey = getLocalDateKey(entry.createdAt);
      if (!costEntriesByDate[dateKey]) {
        costEntriesByDate[dateKey] = [];
      }
      costEntriesByDate[dateKey].push({
        id: entry.id,
        patientId: entry.patientId,
        patientName: patient?.name || 'غير معروف',
        amount: entry.amount,
        source: entry.source,
        notes: entry.notes,
        date: entry.createdAt?.toString() || '',
      });
    }

    // Get all unique dates and sort (newest first)
    const paymentDates = Object.keys(paymentsByDate);
    const patientDates = Object.keys(patientsByDate);
    const costDates = Object.keys(costEntriesByDate);
    const expenseDates = Object.keys(expensesByDate);
    const allDatesSet = new Set([...paymentDates, ...patientDates, ...costDates, ...expenseDates]);
    const allDates = Array.from(allDatesSet).filter(d => d !== 'unknown').sort((a, b) => b.localeCompare(a));

    // Calculate daily summaries. التكاليف is the day's LEDGER sum — cost
    // actually created that day, on any patient — no longer the current
    // lifetime cost of whoever happened to register that day (which missed
    // same-day costs on old patients and grew retroactively). المتبقي in the
    // UI is therefore an honest (التكاليف − المدفوع) for the same day.
    const dailySummaries = allDates.map(date => {
      const dayPayments = paymentsByDate[date] || [];
      const dayPatients = patientsByDate[date] || [];
      const dayEntries = costEntriesByDate[date] || [];
      const dayExpenses = expensesByDate[date] || [];

      return {
        date,
        payments: dayPayments.sort((a: PaymentDetail, b: PaymentDetail) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
        patients: dayPatients,
        costEntries: dayEntries,
        expenses: dayExpenses,
        totalPaid: dayPayments.reduce((acc: number, p: PaymentDetail) => acc + p.amount, 0),
        totalCosts: dayEntries.reduce((acc: number, e: CostEntryDetail) => acc + e.amount, 0),
        totalExpenses: dayExpenses.reduce((acc: number, e: ExpenseDetail) => acc + e.amount, 0),
        patientCount: dayPatients.length,
        paymentCount: dayPayments.length
      };
    });
    
    // Overall totals: whole-history SQL aggregates (NOT just the window).
    res.json({
      branchId,
      days,
      dailySummaries,
      overall: {
        totalCost: financeTotals.totalCost,
        totalPaid: financeTotals.totalPaid,
        remaining: financeTotals.totalCost - financeTotals.totalPaid,
        totalPatients: financeTotals.totalPatients,
        totalPayments: financeTotals.totalPayments
      }
    });
  });

  // Daily statistics endpoint - supports branchId and date filter
  // Optimized: uses direct SQL queries instead of loading all data into memory
  app.get("/api/reports/daily", isAuthenticated, async (req, res) => {
    try {
      const dateParam = req.query.date as string | undefined;
      // Non-admins always see only their own branch's daily report.
      const filterBranchId = enforceBranchAccess(req) ?? null;

      if (filterBranchId !== null && isNaN(filterBranchId)) {
        return res.status(400).json({ message: "معرف الفرع غير صالح" });
      }
      
      const branches = await storage.getBranches();
      
      const BAGHDAD_OFFSET_MS = 3 * 60 * 60 * 1000;
      let startOfDayUTC: Date;
      let endOfDayUTC: Date;
      if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        const [year, month, day] = dateParam.split('-').map(Number);
        startOfDayUTC = new Date(Date.UTC(year, month - 1, day) - BAGHDAD_OFFSET_MS);
        endOfDayUTC = new Date(Date.UTC(year, month - 1, day + 1) - BAGHDAD_OFFSET_MS);
      } else {
        const baghdadNow = new Date(Date.now() + BAGHDAD_OFFSET_MS);
        const year = baghdadNow.getUTCFullYear();
        const month = baghdadNow.getUTCMonth();
        const day = baghdadNow.getUTCDate();
        startOfDayUTC = new Date(Date.UTC(year, month, day) - BAGHDAD_OFFSET_MS);
        endOfDayUTC = new Date(Date.UTC(year, month, day + 1) - BAGHDAD_OFFSET_MS);
      }
      
      const startTs = startOfDayUTC.toISOString().replace('T', ' ').replace('Z', '');
      const endTs = endOfDayUTC.toISOString().replace('T', ' ').replace('Z', '');
      
      const newPatientsResult = filterBranchId
        ? await db.execute(sql`
            SELECT 
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE is_amputee = true) as amputees,
              COUNT(*) FILTER (WHERE is_physiotherapy = true) as physiotherapy,
              COUNT(*) FILTER (WHERE is_medical_support = true) as medical_support
            FROM patients 
            WHERE created_at >= ${startTs}::timestamp AND created_at < ${endTs}::timestamp AND branch_id = ${filterBranchId}
              AND deleted_at IS NULL
          `)
        : await db.execute(sql`
            SELECT 
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE is_amputee = true) as amputees,
              COUNT(*) FILTER (WHERE is_physiotherapy = true) as physiotherapy,
              COUNT(*) FILTER (WHERE is_medical_support = true) as medical_support
            FROM patients 
            WHERE created_at >= ${startTs}::timestamp AND created_at < ${endTs}::timestamp
              AND deleted_at IS NULL
          `);
      const newStats = newPatientsResult.rows[0] || { total: 0, amputees: 0, physiotherapy: 0, medical_support: 0 };
      
      const visitsResult = filterBranchId
        ? await db.execute(sql`
            SELECT COUNT(*) as total_visits, COUNT(DISTINCT patient_id) as unique_patients
            FROM visits
            WHERE visit_date >= ${startTs}::timestamp AND visit_date < ${endTs}::timestamp AND branch_id = ${filterBranchId} AND deleted_at IS NULL
          `)
        : await db.execute(sql`
            SELECT COUNT(*) as total_visits, COUNT(DISTINCT patient_id) as unique_patients
            FROM visits
            WHERE visit_date >= ${startTs}::timestamp AND visit_date < ${endTs}::timestamp AND deleted_at IS NULL
          `);
      const visitStats = visitsResult.rows[0] || { total_visits: 0, unique_patients: 0 };
      
      const visitingBreakdownResult = filterBranchId
        ? await db.execute(sql`
            SELECT 
              COUNT(DISTINCT v.patient_id) as visiting_patients,
              COUNT(DISTINCT v.patient_id) FILTER (WHERE p.is_amputee = true) as visiting_amputees,
              COUNT(DISTINCT v.patient_id) FILTER (WHERE p.is_physiotherapy = true) as visiting_physiotherapy,
              COUNT(DISTINCT v.patient_id) FILTER (WHERE p.is_medical_support = true) as visiting_medical_support
            FROM visits v
            JOIN patients p ON v.patient_id = p.id
            WHERE v.visit_date >= ${startTs}::timestamp AND v.visit_date < ${endTs}::timestamp AND v.branch_id = ${filterBranchId} AND v.deleted_at IS NULL
              AND p.deleted_at IS NULL
          `)
        : await db.execute(sql`
            SELECT
              COUNT(DISTINCT v.patient_id) as visiting_patients,
              COUNT(DISTINCT v.patient_id) FILTER (WHERE p.is_amputee = true) as visiting_amputees,
              COUNT(DISTINCT v.patient_id) FILTER (WHERE p.is_physiotherapy = true) as visiting_physiotherapy,
              COUNT(DISTINCT v.patient_id) FILTER (WHERE p.is_medical_support = true) as visiting_medical_support
            FROM visits v
            JOIN patients p ON v.patient_id = p.id
            WHERE v.visit_date >= ${startTs}::timestamp AND v.visit_date < ${endTs}::timestamp AND v.deleted_at IS NULL
              AND p.deleted_at IS NULL
          `);
      const visitingStats = visitingBreakdownResult.rows[0] || { visiting_patients: 0, visiting_amputees: 0, visiting_physiotherapy: 0, visiting_medical_support: 0 };
      
      const branchesToCheck = filterBranchId 
        ? branches.filter(b => b.id === filterBranchId)
        : branches;
      
      const paymentsResult = filterBranchId
        ? await db.execute(sql`
            SELECT branch_id, COALESCE(SUM(amount), 0) as paid
            FROM payments 
            WHERE date >= ${startTs}::timestamp AND date < ${endTs}::timestamp AND branch_id = ${filterBranchId}
            GROUP BY branch_id
          `)
        : await db.execute(sql`
            SELECT branch_id, COALESCE(SUM(amount), 0) as paid
            FROM payments 
            WHERE date >= ${startTs}::timestamp AND date < ${endTs}::timestamp
            GROUP BY branch_id
          `);
      
      const paymentsByBranch = new Map<number, number>();
      for (const row of paymentsResult.rows) {
        paymentsByBranch.set(Number(row.branch_id), Number(row.paid));
      }
      
      let todayPaid = 0;
      const branchRevenues: { branchId: number; branchName: string; paid: number }[] = [];
      for (const branch of branchesToCheck) {
        const branchPaid = paymentsByBranch.get(branch.id) || 0;
        todayPaid += branchPaid;
        branchRevenues.push({ branchId: branch.id, branchName: branch.name, paid: branchPaid });
      }
      
      res.json({
        date: startOfDayUTC.toISOString(),
        totalPatients: Number(newStats.total) || 0,
        amputees: Number(newStats.amputees) || 0,
        physiotherapy: Number(newStats.physiotherapy) || 0,
        medicalSupport: Number(newStats.medical_support) || 0,
        newPatients: Number(newStats.total) || 0,
        newAmputees: Number(newStats.amputees) || 0,
        newPhysiotherapy: Number(newStats.physiotherapy) || 0,
        newMedicalSupport: Number(newStats.medical_support) || 0,
        visitingPatients: Number(visitingStats.visiting_patients) || 0,
        visitingAmputees: Number(visitingStats.visiting_amputees) || 0,
        visitingPhysiotherapy: Number(visitingStats.visiting_physiotherapy) || 0,
        visitingMedicalSupport: Number(visitingStats.visiting_medical_support) || 0,
        totalVisits: Number(visitStats.total_visits) || 0,
        paid: todayPaid,
        branchRevenues
      });
    } catch (error) {
      console.error("Daily stats error:", error);
      res.status(500).json({ message: "خطأ في جلب الإحصائيات اليومية" });
    }
  });

  // Daily patient report (today's visits joined with patients) - Baghdad timezone
  app.get("/api/reports/daily-patient-report", isAuthenticated, async (req, res) => {
    try {
      const BAGHDAD_OFFSET_MS = 3 * 60 * 60 * 1000;
      const dateParam = req.query.date as string | undefined;
      let startOfDayUTC: Date;
      let endOfDayUTC: Date;
      if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        const [year, month, day] = dateParam.split('-').map(Number);
        startOfDayUTC = new Date(Date.UTC(year, month - 1, day) - BAGHDAD_OFFSET_MS);
        endOfDayUTC = new Date(Date.UTC(year, month - 1, day + 1) - BAGHDAD_OFFSET_MS);
      } else {
        const baghdadNow = new Date(Date.now() + BAGHDAD_OFFSET_MS);
        const year = baghdadNow.getUTCFullYear();
        const month = baghdadNow.getUTCMonth();
        const day = baghdadNow.getUTCDate();
        startOfDayUTC = new Date(Date.UTC(year, month, day) - BAGHDAD_OFFSET_MS);
        endOfDayUTC = new Date(Date.UTC(year, month, day + 1) - BAGHDAD_OFFSET_MS);
      }
      const startTs = startOfDayUTC.toISOString().replace('T', ' ').replace('Z', '');
      const endTs = endOfDayUTC.toISOString().replace('T', ' ').replace('Z', '');

      // Resolve branch filter: non-admin is locked to their branch; admin may pass ?branchId
      const ctx = getUserContext(req);
      const branchSession = (req.session as any).branchSession;
      const isAdmin = ctx.role === 'admin' || branchSession?.isAdmin;
      const userBranchId = ctx.branchId ?? branchSession?.branchId;

      let effectiveBranchId: number | null = null;
      if (isAdmin) {
        const qb = req.query.branchId as string | undefined;
        if (qb !== undefined && qb !== '') {
          const parsed = parseInt(qb, 10);
          if (isNaN(parsed)) {
            return res.status(400).json({ message: "معرف الفرع غير صالح" });
          }
          effectiveBranchId = parsed;
        }
      } else {
        if (!userBranchId) {
          return res.status(403).json({ message: "لا يوجد فرع مرتبط بالمستخدم" });
        }
        effectiveBranchId = Number(userBranchId);
      }

      // Optional employee filter (admin only). NOTE: visits table has no employee
      // column in the current schema, so this filter is accepted but matches
      // nothing — employeeId / employeeName remain null in the response.
      let employeeFilterId: number | null = null;
      if (isAdmin && req.query.employeeId && !isNaN(Number(req.query.employeeId))) {
        employeeFilterId = Number(req.query.employeeId);
      } else {
        employeeFilterId = null;
      }

      const result = await db.execute(sql`
        SELECT
          v.id AS "visitId",
          p.id AS "patientId",
          v.visit_date AS "date",
          p.name AS "patientName",
          p.age AS "age",
          p.phone AS "phone",
          p.medical_condition AS "medicalCondition",
          p.amputation_site AS "amputationSite",
          p.disease_type AS "diseaseType",
          p.support_type AS "supportType",
          p.injury_type AS "injuryType",
          p.injury_area AS "injuryArea",
          v.details AS "details",
          v.notes AS "notes",
          v.treatment_type AS "treatment",
          b.id AS "branchId",
          b.name AS "branchName",
          u.id AS "employeeId",
          u.display_name AS "employeeName"
        FROM visits v
        INNER JOIN patients p ON p.id = v.patient_id
        LEFT  JOIN branches b ON b.id = v.branch_id
        LEFT  JOIN system_users u ON u.id = v.created_by
        WHERE v.visit_date >= ${startTs}::timestamp
          AND v.visit_date <  ${endTs}::timestamp
          AND v.deleted_at IS NULL
          AND p.deleted_at IS NULL
          AND (${effectiveBranchId}::int IS NULL OR v.branch_id = ${effectiveBranchId}::int)
          AND (${employeeFilterId}::int IS NULL OR v.created_by = ${employeeFilterId}::int)
        ORDER BY v.visit_date ASC
      `);

      const rows = (result.rows || []).map((r: any) => {
        const problem =
          (r.medicalCondition && String(r.medicalCondition).trim()) ||
          (r.amputationSite && String(r.amputationSite).trim()) ||
          (r.diseaseType && String(r.diseaseType).trim()) ||
          (r.supportType && String(r.supportType).trim()) ||
          (r.injuryType && String(r.injuryType).trim()) ||
          (r.injuryArea && String(r.injuryArea).trim()) ||
          null;
        const actionToday =
          (r.details && String(r.details).trim()) ||
          (r.notes && String(r.notes).trim()) ||
          null;
        return {
          visitId: r.visitId,
          patientId: r.patientId,
          date: r.date,
          patientName: r.patientName,
          age: r.age,
          phone: r.phone,
          problem,
          actionToday,
          treatment: r.treatment,
          notes: r.notes,
          branchId: r.branchId ?? null,
          branchName: r.branchName ?? null,
          employeeId: r.employeeId ?? null,
          employeeName: r.employeeName ?? null,
        };
      });

      // ══ الملخّصُ المالي لليوم ═══════════════════════════════════════
      //  **لا حسابَ يُعاد هنا ولا في صفحة React.** يُنادى مصدرُ الحقيقة
      //  المحاسبي نفسه بنفس اليوم ونفس نطاق الفرع — فرقمُ التقرير اليومي
      //  ورقمُ صفحة المحاسبة يخرجان من دالّةٍ واحدة ولا يفترقان أبداً.
      //
      //  والنطاق مطابقٌ لجدول الزيارات أعلاه حرفاً: `effectiveBranchId`
      //  نفسها، و`dateParam` نفسه (أو يومُ بغداد الحالي حين يُترك فارغاً).
      const reportDay = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
        ? dateParam
        : new Date(Date.now() + BAGHDAD_OFFSET_MS).toISOString().split("T")[0];

      //  **والمال محجوبٌ بنفس بوّابته القائمة.** جدولُ الزيارات نقطةٌ يقرأها
      //  كلُّ موظّف (`isAuthenticated`)، فإلحاقُ المال بها بلا شرطٍ كان
      //  سيفتح أرقامَ الأقسام للاستقبال — ولخبير الأطراف المحجوب مالياً في
      //  كلّ النظام — من بابٍ خلفيّ. فالشرطُ هو شرطُ صفحة المحاسبة عينُه
      //  (`canManageAccounting`)، ولا دورَ جديدٌ يُخترع هنا. ومَن لا يملكه
      //  يأخذ `financial: null` ويبقى جدولُ زياراته كما كان بلا نقصان.
      const canSeeMoney = Boolean(isAdmin || branchSession?.permissions?.canManageAccounting);

      //  **بحدود يوم بغداد** — نفسِ حدود جدول الزيارات أعلاه بالضبط. ولو
      //  حُسب بـUTC لاختلف النطاقان ثلاثَ ساعات، فظهرت زيارةٌ بلا مالها.
      const acct = canSeeMoney
        ? await storage.getAccountingSummary(
            effectiveBranchId ?? undefined, reportDay, reportDay, { baghdadDays: true },
          )
        : null;

      res.json({
        date: reportDay,
        branchId: effectiveBranchId,
        visits: rows,
        //  **المقبوض والمبيعات منفصلان** ولا يُسمَّيان «وارداً» معاً:
        //  `paid` نقدٌ وصل، و`revenue` كلفةٌ قُيِّدت. وخلطُهما هو العطبُ
        //  الذي جاء هذا التقسيم يصلحه.
        financial: acct ? {
          byDepartment: acct.byDepartment,
          rollups: acct.rollups,
          expenses: acct.totalExpenses,
          //  الصافي النقدي — نفس تعريف صفحة المحاسبة.
          netCash: acct.rollups.grandTotal.paid - acct.totalExpenses,
        } : null,
      });
    } catch (error) {
      console.error("Daily patient report error:", error);
      res.status(500).json({ message: "خطأ في جلب تقرير المرضى اليومي" });
    }
  });

  // Custom Stats API endpoints
  app.get("/api/custom-stats", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const branchId = branchSession?.branchId;
    const isAdmin = branchSession?.isAdmin;
    
    // Admin sees all, staff sees their branch + global
    const stats = isAdmin 
      ? await storage.getCustomStats()
      : await storage.getCustomStats(branchId, true);
    
    res.json(stats);
  });

  app.get("/api/custom-stats/:id", isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const stat = await storage.getCustomStat(id);
    if (!stat) {
      return res.status(404).json({ error: "الحقل الإحصائي غير موجود" });
    }
    res.json(stat);
  });

  app.post("/api/custom-stats", isAuthenticated, async (req: any, res) => {
    try {
      const branchSession = (req.session as any).branchSession;
      const isAdmin = branchSession?.isAdmin;
      const userBranchId = branchSession?.branchId;
      const user = req.user;
      
      const data = insertCustomStatSchema.parse({
        ...req.body,
        createdBy: user?.id || "unknown"
      });
      
      // Staff can only create stats for their branch
      if (!isAdmin) {
        data.branchId = userBranchId;
        data.isGlobal = false;
      }
      
      // If admin creates a global stat, set isGlobal to true and branchId to null
      if (isAdmin && data.isGlobal) {
        data.branchId = null;
      }
      
      const stat = await storage.createCustomStat(data);
      res.json(stat);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "خطأ في إنشاء الحقل الإحصائي" });
    }
  });

  app.put("/api/custom-stats/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const branchSession = (req.session as any).branchSession;
      const isAdmin = branchSession?.isAdmin;
      const userBranchId = branchSession?.branchId;
      
      const existingStat = await storage.getCustomStat(id);
      if (!existingStat) {
        return res.status(404).json({ error: "الحقل الإحصائي غير موجود" });
      }
      
      // Staff can only edit their branch stats
      if (!isAdmin && existingStat.branchId !== userBranchId) {
        return res.status(403).json({ error: "ليس لديك صلاحية لتعديل هذا الحقل" });
      }
      
      const updates = { ...req.body };
      
      // Staff cannot make stats global
      if (!isAdmin) {
        updates.isGlobal = false;
        updates.branchId = userBranchId;
      }
      
      const stat = await storage.updateCustomStat(id, updates);
      res.json(stat);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "خطأ في تحديث الحقل الإحصائي" });
    }
  });

  app.delete("/api/custom-stats/:id", isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const userBranchId = branchSession?.branchId;
    
    const existingStat = await storage.getCustomStat(id);
    if (!existingStat) {
      return res.status(404).json({ error: "الحقل الإحصائي غير موجود" });
    }
    
    // Staff can only delete their branch stats
    if (!isAdmin && existingStat.branchId !== userBranchId) {
      return res.status(403).json({ error: "ليس لديك صلاحية لحذف هذا الحقل" });
    }
    
    // Staff cannot delete global stats
    if (!isAdmin && existingStat.isGlobal) {
      return res.status(403).json({ error: "لا يمكنك حذف الحقول العامة" });
    }
    
    await storage.deleteCustomStat(id);
    res.json({ success: true });
  });

  // Endpoint to calculate custom stat value
  app.get("/api/custom-stats/:id/calculate", isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const stat = await storage.getCustomStat(id);
    if (!stat) {
      return res.status(404).json({ error: "الحقل الإحصائي غير موجود" });
    }
    
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const userBranchId = branchSession?.branchId;
    const targetBranchId = stat.isGlobal ? null : (stat.branchId || userBranchId);
    
    // Get patients for calculation
    let patients = await storage.getPatients(targetBranchId || undefined);
    
    // Apply filter if specified
    if (stat.filterField && stat.filterValue) {
      patients = patients.filter((p: any) => {
        const fieldValue = p[stat.filterField!];
        if (typeof fieldValue === "boolean") {
          return fieldValue === (stat.filterValue === "true");
        }
        return fieldValue === stat.filterValue;
      });
    }
    
    let value = 0;
    const allPatients = await storage.getPatients(targetBranchId || undefined);
    
    switch (stat.statType) {
      case "count":
        value = patients.length;
        break;
      case "sum":
        if (stat.category === "payments") {
          // Sum all payments for filtered patients
          let totalAmount = 0;
          for (const patient of patients) {
            const payments = await storage.getPaymentsByPatientId(patient.id);
            totalAmount += payments.reduce((sum, p) => sum + (p.amount || 0), 0);
          }
          value = totalAmount;
        } else {
          value = patients.reduce((sum, p) => sum + (p.totalCost || 0), 0);
        }
        break;
      case "percentage":
        value = allPatients.length > 0 ? Math.round((patients.length / allPatients.length) * 100) : 0;
        break;
      case "average":
        if (patients.length > 0) {
          const total = patients.reduce((sum, p) => sum + (parseInt(p.age) || 0), 0);
          value = Math.round(total / patients.length);
        }
        break;
    }
    
    res.json({ 
      stat,
      value,
      count: patients.length,
      totalCount: allPatients.length
    });
  });

  // ================== ACCOUNTING SYSTEM ROUTES ==================

  // Expenses CRUD - admins manage; users with canManageAccounting can view + add
  app.get("/api/expenses", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting || branchSession?.permissions?.canAddExpenses;

    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للمصروفات" });
    }

    const { startDate, endDate } = req.query;
    const branchId = enforceBranchAccess(req);
    const expenses = await storage.getExpenses(
      branchId,
      startDate as string,
      endDate as string
    );
    res.json(expenses);
  });

  // ---- custom expense categories (admin-managed) ----------------------------
  // Anyone with accounting/expense access reads them (to fill the picker);
  // only the general admin creates/removes. The category is stored on the
  // expense as free text, so removing a category never touches past records.
  app.get("/api/expense-categories", isAuthenticated, async (req: any, res) => {
    const s = (req.session as any).branchSession;
    const canRead = s?.isAdmin || s?.permissions?.canManageAccounting || s?.permissions?.canAddExpenses;
    if (!canRead) return res.status(403).json({ error: "غير مصرح" });
    const rows = await db.select().from(expenseCategories)
      .where(eq(expenseCategories.isActive, true))
      .orderBy(desc(expenseCategories.createdAt));
    // Non-admins only see all-branch categories + their own branches'.
    const allowed = accessibleBranchesFor(req);
    const visible = allowed === null ? rows
      : rows.filter((r) => r.branchId == null || allowed.includes(r.branchId));
    res.json(visible);
  });

  app.post("/api/expense-categories", isAuthenticated, async (req: any, res) => {
    const s = (req.session as any).branchSession;
    if (!s?.isAdmin) return res.status(403).json({ error: "إضافة التصنيفات للمدير العام حصراً" });
    const label = String(req.body?.label || "").trim();
    if (!label) return res.status(400).json({ error: "اسم التصنيف مطلوب" });
    const branchId = req.body?.branchId != null ? Number(req.body.branchId) : null;
    const color = typeof req.body?.color === "string" ? req.body.color : null;
    try {
      const [row] = await db.insert(expenseCategories)
        .values({ label, branchId, color, createdBy: s?.userId ?? null })
        .onConflictDoNothing()
        .returning();
      if (!row) {
        // Re-activate a previously-removed same-name category instead of erroring.
        const [existing] = await db.update(expenseCategories)
          .set({ isActive: true })
          .where(and(eq(expenseCategories.label, label), branchId == null ? isNull(expenseCategories.branchId) : eq(expenseCategories.branchId, branchId)))
          .returning();
        return res.json(existing);
      }
      res.status(201).json(row);
    } catch (err: any) {
      res.status(400).json({ error: "تعذّرت الإضافة" });
    }
  });

  app.delete("/api/expense-categories/:id", isAuthenticated, async (req: any, res) => {
    const s = (req.session as any).branchSession;
    if (!s?.isAdmin) return res.status(403).json({ error: "حذف التصنيفات للمدير العام حصراً" });
    const id = Number(req.params.id);
    // Soft-remove: keep past expenses' category text intact.
    await db.update(expenseCategories).set({ isActive: false }).where(eq(expenseCategories.id, id));
    res.json({ ok: true });
  });

  app.get("/api/expenses/:id", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting || branchSession?.permissions?.canAddExpenses;

    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للمصروفات" });
    }

    const id = parseInt(req.params.id);
    const expense = await storage.getExpense(id);
    if (!expense) {
      return res.status(404).json({ error: "المصروف غير موجود" });
    }
    // Branch isolation (mirrors PUT/DELETE): a non-admin — including the
    // narrow expenses-only tier — must not read another branch's expenses
    // by iterating ids.
    const allowedExp = accessibleBranchesFor(req);
    if (allowedExp !== null && !allowedExp.includes(expense.branchId)) {
      return res.status(403).json({ error: "غير مصرح لك بمصروفات هذا الفرع" });
    }
    res.json(expense);
  });

  app.post("/api/expenses", isAuthenticated, async (req: any, res) => {
    try {
      const branchSession = (req.session as any).branchSession;
      const isAdmin = branchSession?.isAdmin;
      const canAdd = isAdmin || branchSession?.permissions?.canManageAccounting || branchSession?.permissions?.canAddExpenses;
      const user = req.user;
      const userId = branchSession?.userId ?? null;
      const userName = branchSession?.displayName ?? null;

      if (!canAdd) {
        return res.status(403).json({ error: "غير مصرح لك بإضافة مصروفات" });
      }

      // Non-admins cannot file an expense against any branch other than
      // their own — even if the client sends a different branchId in the
      // body. Pin it server-side BEFORE the schema parse so the validator
      // sees the corrected value.
      // createdBy: prefer branchSession.userId (system_users.id, stable
      // and joinable) over user.claims.sub (OIDC subject, often absent
      // in this app). Fall back to "unknown" so older rows still parse.
      const createdByValue = branchSession?.userId
        ? String(branchSession.userId)
        : user?.claims?.sub || "unknown";
      const enforcedBody = { ...req.body, createdBy: createdByValue };
      if (!isAdmin && branchSession?.branchId) {
        enforcedBody.branchId = branchSession.branchId;
      }
      const data = insertExpenseSchema.parse(enforcedBody);

      // Section (revenue stream) is required on every new expense so the
      // per-department reports never carry a blank bucket. Must be one of the
      // three known values.
      if (!data.section || !EXPENSE_SECTIONS.includes(data.section as any)) {
        return res.status(400).json({
          error: "يجب اختيار القسم: الأطراف والمساند، أو العلاج الطبيعي، أو مشترك",
        });
      }

      // Subcategory is required when category is "other" — otherwise an
      // accountant could file an expense as "أخرى" with no further detail
      // and lose visibility on what it actually was.
      if (data.category === "other" && !data.subcategory?.trim()) {
        return res.status(400).json({
          error: "عند اختيار فئة 'أخرى'، يجب كتابة تصنيف فرعي يوضّح طبيعة المصروف",
        });
      }

      const expense = await storage.createExpense(data);

      // تلقائي: إنشاء قيد محاسبي مزدوج للمصروف
      await createJournalForExpense(expense, userId);
      await logAudit({
        entityType: "expense",
        entityId: expense.id,
        action: "create",
        userId, userName,
        branchId: expense.branchId,
        newValues: expense,
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
      });

      res.json(expense);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "خطأ في إنشاء المصروف" });
    }
  });

  app.put("/api/expenses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const branchSession = (req.session as any).branchSession;
      const isAdmin = branchSession?.isAdmin;
      // Anyone with accounting management permission can edit. That
      // covers admin (always), branch_manager (auto-granted at login),
      // and any custom user the admin explicitly toggled on.
      const canManage = isAdmin || branchSession?.permissions?.canManageAccounting;
      const userId = branchSession?.userId ?? null;
      const userName = branchSession?.displayName ?? null;

      if (!canManage) {
        return res.status(403).json({ error: "غير مصرح لك بتعديل المصروفات" });
      }

      const id = parseInt(req.params.id);
      const existingExpense = await storage.getExpense(id);
      if (!existingExpense) {
        return res.status(404).json({ error: "المصروف غير موجود" });
      }

      // Branch isolation: anyone non-admin can only edit records in
      // their own branch. Even with the right permission flag, the
      // server enforces scope.
      if (!isAdmin && branchSession?.branchId && existingExpense.branchId !== branchSession.branchId) {
        return res.status(403).json({ error: "لا يمكنك تعديل مصروف من فرع آخر" });
      }

      // Same "other → subcategory required" rule as on create.
      const effectiveCategory = req.body.category ?? existingExpense.category;
      const effectiveSubcategory = (req.body.subcategory ?? existingExpense.subcategory)?.trim();
      if (effectiveCategory === "other" && !effectiveSubcategory) {
        return res.status(400).json({
          error: "عند اختيار فئة 'أخرى'، يجب كتابة تصنيف فرعي يوضّح طبيعة المصروف",
        });
      }

      // If the edit touches the section, it must stay one of the known values.
      // Editing other fields on a legacy row (section still NULL) is allowed.
      if (req.body.section !== undefined && req.body.section !== null &&
          !EXPENSE_SECTIONS.includes(req.body.section)) {
        return res.status(400).json({ error: "قسم غير صالح" });
      }

      const expense = await storage.updateExpense(id, req.body);

      // عكس القيد القديم وإنشاء قيد جديد (لحماية سلامة الدفاتر)
      if (expense) {
        await reverseJournalForSource("expense", id, userId, "تعديل المصروف");
        await createJournalForExpense(expense, userId);
      }
      await logAudit({
        entityType: "expense",
        entityId: id,
        action: "update",
        userId, userName,
        branchId: existingExpense.branchId,
        oldValues: existingExpense,
        newValues: expense,
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
      });

      res.json(expense);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "خطأ في تحديث المصروف" });
    }
  });

  app.delete("/api/expenses/:id", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canManage = isAdmin || branchSession?.permissions?.canManageAccounting;
    const userId = branchSession?.userId ?? null;
    const userName = branchSession?.displayName ?? null;

    if (!canManage) {
      return res.status(403).json({ error: "غير مصرح لك بحذف المصروفات" });
    }

    const id = parseInt(req.params.id);
    const existingExpense = await storage.getExpense(id);
    if (!existingExpense) {
      return res.status(404).json({ error: "المصروف غير موجود" });
    }

    // Branch isolation for branch_manager.
    if (!isAdmin && branchSession?.branchId && existingExpense.branchId !== branchSession.branchId) {
      return res.status(403).json({ error: "لا يمكنك حذف مصروف من فرع آخر" });
    }

    // عكس القيد قبل الحذف
    await reverseJournalForSource("expense", id, userId, "حذف المصروف");
    await logAudit({
      entityType: "expense",
      entityId: id,
      action: "delete",
      userId, userName,
      branchId: existingExpense.branchId,
      oldValues: existingExpense,
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
    });
    await storage.deleteExpense(id);
    res.json({ success: true });
  });

  // Returns the distinct subcategories that have already been used for a given
  // category in the current user's accessible branch(es). Powers the
  // autocomplete on the expense form so accountants build a self-organising
  // taxonomy under "أخرى" (and any other category) instead of typos that
  // fragment the same intent across many almost-identical labels.
  app.get("/api/expenses/subcategories", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting || branchSession?.permissions?.canAddExpenses;
    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك" });
    }
    const category = (req.query.category as string | undefined)?.trim();
    if (!category) {
      return res.status(400).json({ error: "يجب تحديد الفئة" });
    }
    const branchId = enforceBranchAccess(req);
    const list = await storage.getExpenseSubcategories(category, branchId);
    res.json(list);
  });

  app.get("/api/expenses/by-category/summary", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting || branchSession?.permissions?.canAddExpenses;

    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للمصروفات" });
    }

    const { startDate, endDate } = req.query;
    const branchId = enforceBranchAccess(req);
    const summary = await storage.getExpensesByCategory(
      branchId,
      startDate as string,
      endDate as string
    );
    res.json(summary);
  });

  // Installment Plans CRUD - Admin only
  app.get("/api/installment-plans", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    
    if (!isAdmin) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول لخطط التقسيط" });
    }
    
    const { branchId } = req.query;
    const plans = await storage.getInstallmentPlans(branchId ? parseInt(branchId) : undefined);
    res.json(plans);
  });

  app.get("/api/installment-plans/patient/:patientId", isAuthenticated, async (req: any, res) => {
    const patientId = parseInt(req.params.patientId);
    const plans = await storage.getInstallmentPlansByPatient(patientId);
    res.json(plans);
  });

  app.get("/api/installment-plans/:id", isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const plan = await storage.getInstallmentPlan(id);
    if (!plan) {
      return res.status(404).json({ error: "خطة التقسيط غير موجودة" });
    }
    res.json(plan);
  });

  app.post("/api/installment-plans", isAuthenticated, async (req: any, res) => {
    try {
      const branchSession = (req.session as any).branchSession;
      const isAdmin = branchSession?.isAdmin;
      const user = req.user;
      
      if (!isAdmin) {
        return res.status(403).json({ error: "غير مصرح لك بإنشاء خطط التقسيط" });
      }
      
      const data = insertInstallmentPlanSchema.parse({
        ...req.body,
        createdBy: user?.claims?.sub || "unknown"
      });
      
      const plan = await storage.createInstallmentPlan(data);
      res.json(plan);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "خطأ في إنشاء خطة التقسيط" });
    }
  });

  app.put("/api/installment-plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const branchSession = (req.session as any).branchSession;
      const isAdmin = branchSession?.isAdmin;
      
      if (!isAdmin) {
        return res.status(403).json({ error: "غير مصرح لك بتعديل خطط التقسيط" });
      }
      
      const id = parseInt(req.params.id);
      const existingPlan = await storage.getInstallmentPlan(id);
      if (!existingPlan) {
        return res.status(404).json({ error: "خطة التقسيط غير موجودة" });
      }
      
      const plan = await storage.updateInstallmentPlan(id, req.body);
      res.json(plan);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "خطأ في تحديث خطة التقسيط" });
    }
  });

  app.delete("/api/installment-plans/:id", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    
    if (!isAdmin) {
      return res.status(403).json({ error: "غير مصرح لك بحذف خطط التقسيط" });
    }
    
    const id = parseInt(req.params.id);
    const existingPlan = await storage.getInstallmentPlan(id);
    if (!existingPlan) {
      return res.status(404).json({ error: "خطة التقسيط غير موجودة" });
    }
    
    await storage.deleteInstallmentPlan(id);
    res.json({ success: true });
  });

  // Visits by Treatment Type
  app.get("/api/statistics/visits-by-treatment", isAuthenticated, async (req: any, res) => {
    try {
      const branchId = enforceBranchAccess(req);
      const allVisits = await storage.getAllVisits(branchId);

      const treatmentMap: Record<string, number> = {};

      for (const visit of allVisits) {
        const treatmentType = (visit as any).treatmentType;
        if (!treatmentType) {
          treatmentMap["غير محدد"] = (treatmentMap["غير محدد"] || 0) + 1;
        } else {
          const types = treatmentType.split(",").map((t: string) => t.trim()).filter(Boolean);
          for (const type of types) {
            treatmentMap[type] = (treatmentMap[type] || 0) + 1;
          }
        }
      }

      const result = Object.entries(treatmentMap).map(([treatmentType, count]) => ({
        treatmentType,
        count,
      }));

      res.json(result);
    } catch (error) {
      console.error("Error fetching visits by treatment:", error);
      res.status(500).json({ error: "خطأ في جلب البيانات" });
    }
  });

  // Revenue by Treatment Type
  app.get("/api/statistics/revenue-by-treatment", isAuthenticated, async (req: any, res) => {
    try {
      const branchId = enforceBranchAccess(req);
      const allPayments = await storage.getAllPayments(branchId);

      // Display-time inference + canonicalisation. Each payment carries
      // either an explicit treatment string (sometimes a sub-type like
      // "روبوت" or "أبر صينية") or nothing at all. We:
      //   1. Infer from the patient's clinical flags when missing.
      //   2. Canonicalise sub-types into one of three top-level buckets
      //      (طرف صناعي / علاج طبيعي / مساند طبية) so the pie chart
      //      shows clinical categories, not a flat mix of categories
      //      and sub-types of physiotherapy.
      // Sub-type detail still surfaces via the "subBreakdown" field on
      // the parent — useful if the UI wants to drill down later.
      const patientIds = Array.from(new Set(allPayments.map((p) => p.patientId).filter(Boolean)));
      const patientList = patientIds.length > 0
        ? await storage.getPatientsByIds(patientIds as number[])
        : [];
      const patientById = new Map(patientList.map((p) => [p.id, p]));

      // Maps any treatment string to one of the three clinical categories.
      // Returns null if it can't classify — caller falls back to patient-flag
      // inference. Tolerant of Iraqi-Arabic spelling variants.
      const canonicalise = (raw: string | null | undefined): "طرف صناعي" | "علاج طبيعي" | "مساند طبية" | null => {
        if (!raw) return null;
        const s = raw.trim().toLowerCase()
          .replace(/[آأإ]/g, "ا")
          .replace(/ة/g, "ه")
          .replace(/ى/g, "ي");
        if (/طرف|اطراف|بتر|prosth/.test(s)) return "طرف صناعي";
        if (/مسند|مساند|حزام|دعامه|brace|support/.test(s)) return "مساند طبية";
        // Everything below is a physiotherapy sub-type — they all roll up
        // into "علاج طبيعي" at the top level.
        if (/علاج طبيعي|فيزيائي|physio|تاهيل|تمرين|تمارين|روبوت|robot|اجهز|جهاز|ابره|ابر صيني|injection/.test(s)) {
          return "علاج طبيعي";
        }
        return null;
      };

      const resolveCategory = (payment: typeof allPayments[number]): {
        category: "طرف صناعي" | "علاج طبيعي" | "مساند طبية" | "غير محدد";
        subType: string | null;
      } => {
        // Try the payment's own string first; then fall back to the
        // patient's clinical flags.
        const explicit = payment.paymentTreatmentType;
        const fromExplicit = canonicalise(explicit);
        if (fromExplicit) {
          return { category: fromExplicit, subType: explicit?.trim() ?? null };
        }
        const patient = payment.patientId ? patientById.get(payment.patientId) : undefined;
        if (patient?.isAmputee) return { category: "طرف صناعي", subType: null };
        if (patient?.isPhysiotherapy) return { category: "علاج طبيعي", subType: null };
        if (patient?.isMedicalSupport) return { category: "مساند طبية", subType: null };
        return { category: "غير محدد", subType: null };
      };

      type Bucket = {
        totalAmount: number;
        count: number;
        subBreakdown: Record<string, { totalAmount: number; count: number }>;
      };
      const treatmentMap: Record<string, Bucket> = {};

      for (const payment of allPayments) {
        const { category, subType } = resolveCategory(payment);
        if (!treatmentMap[category]) {
          treatmentMap[category] = { totalAmount: 0, count: 0, subBreakdown: {} };
        }
        treatmentMap[category].totalAmount += payment.amount;
        treatmentMap[category].count += 1;
        if (subType) {
          if (!treatmentMap[category].subBreakdown[subType]) {
            treatmentMap[category].subBreakdown[subType] = { totalAmount: 0, count: 0 };
          }
          treatmentMap[category].subBreakdown[subType].totalAmount += payment.amount;
          treatmentMap[category].subBreakdown[subType].count += 1;
        }
      }

      const result = Object.entries(treatmentMap).map(([treatmentType, data]) => ({
        treatmentType,
        totalAmount: data.totalAmount,
        count: data.count,
        subBreakdown: Object.entries(data.subBreakdown).map(([name, d]) => ({
          name,
          totalAmount: d.totalAmount,
          count: d.count,
        })),
      }));

      res.json(result);
    } catch (error) {
      console.error("Error fetching revenue by treatment:", error);
      res.status(500).json({ error: "خطأ في جلب البيانات" });
    }
  });

  // Monthly new patients report (per branch)
  app.get("/api/statistics/monthly-new-patients", isAuthenticated, async (req: any, res) => {
    try {
      const filterBranchId = enforceBranchAccess(req) ?? null;

      const result = filterBranchId
        ? await db.execute(sql`
            SELECT 
              TO_CHAR(p.created_at, 'YYYY-MM') as month,
              COUNT(p.id) as total_new,
              COUNT(CASE WHEN COALESCE(p.total_cost, 0) > 0 THEN 1 END) as paid_count
            FROM patients p
            WHERE p.branch_id = ${filterBranchId}
              AND p.patient_classification = 'new'
              AND p.deleted_at IS NULL
            GROUP BY TO_CHAR(p.created_at, 'YYYY-MM')
            ORDER BY month ASC
          `)
        : await db.execute(sql`
            SELECT 
              TO_CHAR(p.created_at, 'YYYY-MM') as month,
              COUNT(p.id) as total_new,
              COUNT(CASE WHEN COALESCE(p.total_cost, 0) > 0 THEN 1 END) as paid_count
            FROM patients p
            WHERE p.patient_classification = 'new'
              AND p.deleted_at IS NULL
            GROUP BY TO_CHAR(p.created_at, 'YYYY-MM')
            ORDER BY month ASC
          `);

      const data = result.rows.map((row: any) => ({
        month: row.month,
        totalNew: Number(row.total_new),
        paidCount: Number(row.paid_count),
        unpaidCount: Number(row.total_new) - Number(row.paid_count),
      }));

      res.json(data);
    } catch (error) {
      console.error("Error fetching monthly new patients:", error);
      res.status(500).json({ error: "خطأ في جلب البيانات" });
    }
  });

  // Daily cash summary — accountant's PDF source.
  // Returns today's revenue/expenses, yesterday's running cash, and today's closing.
  // Live revenue board — the owner's own screen (owner, 2026-08-06).
  //
  // Counts ONLY money the patient actually handed over: rows in `payments`.
  // Not costs, not invoices issued, not what is owed — cash in hand today.
  //
  // The day is bounded EXACTLY as getDailyCashSummary bounds it (Baghdad
  // midnight to midnight, +03:00), so this counter and «الوارد» in the daily
  // report can never disagree — a mismatch between two screens showing the
  // same money is the fastest way to lose trust in both.
  //
  // Admin only, enforced here and not merely hidden in the UI.
  app.get("/api/dashboard/live-revenue", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) {
      return res.status(403).json({ message: "غير مصرح" });
    }

    // "Today" in Baghdad, whatever the server's own clock is set to.
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
    const dayStart = new Date(`${today}T00:00:00+03:00`);
    const dayEnd = new Date(`${today}T23:59:59.999+03:00`);

    // Every branch gets a card — including one that has taken nothing yet, so
    // a silent branch is visibly silent rather than absent.
    const [allBranches, sums] = await Promise.all([
      db.select({ id: branches.id, name: branches.name }).from(branches).orderBy(branches.id),
      db
        .select({
          branchId: payments.branchId,
          total: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
        })
        .from(payments)
        //  **ولوحةُ المالك المباشرة تصفّي المحذوف كأيّ رقمٍ ماليّ فعّال**
        //  (مراجعة ٢٠٢٦-٠٨-٢٤ — القسم ب): دفعةُ مريضٍ حُذف اليوم لا تبقى
        //  في «الوارد المباشر» بينما اختفت من كلّ شاشةٍ أخرى.
        .where(and(
          belongsToActivePatientSql("payments"),
          gte(payments.date, dayStart), lte(payments.date, dayEnd),
        ))
        .groupBy(payments.branchId),
    ]);

    const byBranch = new Map<number, number>();
    for (const s of sums) {
      if (s.branchId != null) byBranch.set(s.branchId, Number(s.total) || 0);
    }

    const rows = allBranches.map((b) => ({
      id: b.id,
      name: b.name,
      today: byBranch.get(b.id) ?? 0,
    }));
    // Sum the BRANCH ROWS, not a separate query: the total can then never
    // disagree with the cards printed above it.
    const total = rows.reduce((s, r) => s + r.today, 0);

    res.json({ date: today, asOf: new Date().toISOString(), branches: rows, total });
  });

  app.get("/api/accounting/daily-summary", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;

    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للملخص اليومي" });
    }

    const dateParam = (req.query.date as string) || new Date().toISOString().split("T")[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return res.status(400).json({ error: "صيغة التاريخ غير صحيحة، يجب أن تكون YYYY-MM-DD" });
    }

    // Non-admins are forced to their own branch regardless of what the
    // client sends — defensive in case the UI sends a different branchId.
    let branchId: number | undefined;
    if (isAdmin) {
      branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
    } else {
      branchId = branchSession?.branchId ?? undefined;
    }

    const summary = await storage.getDailyCashSummary(dateParam, branchId);

    // Attach branch name for the PDF header
    let branchName: string | null = null;
    if (branchId) {
      const branch = await storage.getBranch(branchId);
      branchName = branch?.name ?? null;
    }

    res.json({ ...summary, branchName });
  });

  // Accounting Summary - admin OR users with canManageAccounting permission
  app.get("/api/accounting/summary", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;

    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للتقارير المحاسبية" });
    }

    const { startDate, endDate } = req.query;
    const branchId = enforceBranchAccess(req);
    const summary = await storage.getAccountingSummary(
      branchId,
      startDate as string,
      endDate as string
    );
    res.json(summary);
  });

  // Get all payments for accounting
  app.get("/api/accounting/payments", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;

    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للتقارير المحاسبية" });
    }

    const { startDate, endDate } = req.query;
    const branchId = enforceBranchAccess(req);
    const payments = await storage.getAllPayments(
      branchId,
      startDate as string,
      endDate as string
    );
    res.json(payments);
  });

  // Get all visits for accounting
  app.get("/api/accounting/visits", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;

    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للتقارير المحاسبية" });
    }

    const { startDate, endDate } = req.query;
    const branchId = enforceBranchAccess(req);
    const visits = await storage.getAllVisits(
      branchId,
      startDate as string,
      endDate as string
    );
    res.json(visits);
  });

  // Debtors report - patients with outstanding balances
  app.get("/api/accounting/debtors", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;

    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول لتقرير المديونيات" });
    }

    const { minAmount } = req.query;
    const branchId = enforceBranchAccess(req);

    // Get all patients
    let patients = await storage.getPatients(branchId);
    
    // Calculate outstanding balances for each patient
    const debtors = [];
    for (const patient of patients) {
      const payments = await storage.getPaymentsByPatientId(patient.id);
      const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const remaining = (patient.totalCost || 0) - totalPaid;
      
      if (remaining > 0 && (!minAmount || remaining >= parseInt(minAmount as string))) {
        debtors.push({
          patient,
          totalCost: patient.totalCost || 0,
          totalPaid,
          remaining,
          lastPaymentDate: payments.length > 0 ? payments[0].date : null
        });
      }
    }
    
    // Sort by remaining amount (descending)
    debtors.sort((a, b) => b.remaining - a.remaining);
    
    res.json(debtors);
  });

  // Monthly financial trends
  app.get("/api/accounting/monthly-trends", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;

    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للتقارير المحاسبية" });
    }

    const { months = 12 } = req.query;
    const numMonths = parseInt(months as string);
    const branchId = enforceBranchAccess(req);

    const trends = [];
    const now = new Date();

    for (let i = numMonths - 1; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      const summary = await storage.getAccountingSummary(
        branchId,
        startStr,
        endStr
      );
      
      trends.push({
        month: startDate.toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long' }),
        monthDate: startStr,
        ...summary
      });
    }
    
    res.json(trends);
  });

  // Profitability by service type
  app.get("/api/accounting/profitability-by-service", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;

    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للتقارير المحاسبية" });
    }

    const branchId = enforceBranchAccess(req);
    const patients = await storage.getPatients(branchId);

    const serviceTypes = [
      { key: "amputee", name: "مرضى البتر", filter: (p: any) => p.isAmputee },
      { key: "physiotherapy", name: "العلاج الطبيعي", filter: (p: any) => p.isPhysiotherapy },
      { key: "medicalSupport", name: "المساند الطبية", filter: (p: any) => p.isMedicalSupport }
    ];
    
    const profitability = [];
    
    for (const serviceType of serviceTypes) {
      const servicePatients = patients.filter(serviceType.filter);
      let totalRevenue = 0;
      let totalPaid = 0;
      
      for (const patient of servicePatients) {
        totalRevenue += patient.totalCost || 0;
        const payments = await storage.getPaymentsByPatientId(patient.id);
        totalPaid += payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      }
      
      profitability.push({
        serviceType: serviceType.key,
        serviceName: serviceType.name,
        patientCount: servicePatients.length,
        totalRevenue,
        totalPaid,
        remaining: totalRevenue - totalPaid,
        collectionRate: totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0
      });
    }
    
    res.json(profitability);
  });

  // Branch comparison
  app.get("/api/accounting/branch-comparison", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;

    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للتقارير المحاسبية" });
    }

    const { startDate, endDate } = req.query;
    // Non-admins only see their own branch in the comparison; admins see all.
    const allowedBranchId = enforceBranchAccess(req);
    const allBranches = await storage.getBranches();
    const branches = allowedBranchId !== undefined
      ? allBranches.filter((b) => b.id === allowedBranchId)
      : allBranches;

    const comparison = [];

    for (const branch of branches) {
      const summary = await storage.getAccountingSummary(
        branch.id,
        startDate as string,
        endDate as string
      );

      const patients = await storage.getPatients(branch.id);

      comparison.push({
        branchId: branch.id,
        branchName: branch.name,
        patientCount: patients.length,
        ...summary
      });
    }
    
    // Sort by net profit (descending)
    comparison.sort((a, b) => b.netProfit - a.netProfit);
    
    res.json(comparison);
  });

  // ======================= CRON / EXTERNAL BRIEFING =======================
  // Read-only endpoint for scheduled external consumers (e.g. nightly
  // briefing). Protected by a bearer-style query key stored in the
  // CRON_API_KEY environment variable — no session/cookie required.
  app.get("/api/cron/daily-income", async (req, res) => {
    const cronKey = process.env.CRON_API_KEY;
    if (!cronKey || req.query.key !== cronKey) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Which date to report on — defaults to today Baghdad time.
    const targetDate = typeof req.query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date
      : undefined; // undefined = today

    const allBranches = await storage.getBranches();

    const rows: Array<{
      branchId: number;
      branchName: string;
      paymentCount: number;
      totalIncome: number;
      newPatients: number;
      totalExpenses: number;
    }> = [];

    let grandIncome = 0;
    let grandExpenses = 0;
    let grandPatients = 0;

    for (const branch of allBranches) {
      // Payments (income)
      const paymentsResult = await db.execute(sql`
        SELECT COUNT(*)::int AS cnt, COALESCE(SUM(amount), 0)::int AS total
        FROM payments pay
        WHERE pay.branch_id = ${branch.id}
          AND (pay.date AT TIME ZONE 'Asia/Baghdad')::date = COALESCE(${targetDate ?? null}::date, (NOW() AT TIME ZONE 'Asia/Baghdad')::date)
          AND ${belongsToActivePatientSql("pay")}
      `);
      const pRow = paymentsResult.rows[0] as any;

      // New patients
      const patientsResult = await db.execute(sql`
        SELECT COUNT(*)::int AS cnt
        FROM patients
        WHERE branch_id = ${branch.id}
          AND (created_at AT TIME ZONE 'Asia/Baghdad')::date = COALESCE(${targetDate ?? null}::date, (NOW() AT TIME ZONE 'Asia/Baghdad')::date)
          AND deleted_at IS NULL
      `);
      const ptRow = patientsResult.rows[0] as any;

      // Expenses
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

    // Optionally also email the briefing (used by the nightly scheduler
    // and for on-demand tests): ?send=email
    let emailResult: { success: boolean; error?: string } | undefined;
    if (req.query.send === "email") {
      const { sendDailyIncomeEmail } = await import("./daily_income");
      emailResult = await sendDailyIncomeEmail(targetDate);
    }

    res.json({
      date: targetDate || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" }),
      branches: rows,
      totals: {
        totalIncome: grandIncome,
        totalExpenses: grandExpenses,
        netIncome: grandIncome - grandExpenses,
        newPatients: grandPatients,
      },
      ...(emailResult ? { emailSent: emailResult.success, emailError: emailResult.error } : {}),
    });
  });

  app.get("/api/reports/nightly", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;
    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول لهذا التقرير" });
    }
    const { getNightlyReportData } = await import("./backup");
    const data = await getNightlyReportData();
    res.json(data);
  });

  // ======================= INVOICE ENDPOINTS =======================

  // Get all invoices (admin-only or branch-filtered)
  app.get("/api/invoices", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    
    const { status, patientId, startDate, endDate } = req.query;
    const filterBranchId = enforceBranchAccess(req);

    const invoices = await storage.getInvoices(filterBranchId, status as string, patientId ? parseInt(patientId) : undefined, startDate as string, endDate as string);
    res.json(invoices);
  });

  // Bulk-fetch items for multiple invoices in one query — used by the
  // invoice list to render a "service summary" cell without an N+1
  // storm. Branch isolation is enforced via the invoice list call,
  // not here, so we accept arbitrary IDs (the list query already
  // filtered them by branch). Returns a flat array — caller groups by
  // invoiceId.
  app.get("/api/invoice-items/bulk", isAuthenticated, async (req: any, res) => {
    const raw = String(req.query.invoiceIds ?? "");
    if (!raw) return res.json([]);
    const ids = raw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length === 0) return res.json([]);
    if (ids.length > 500) {
      return res.status(400).json({ error: "تم طلب عدد كبير جداً من الفواتير" });
    }
    const items = await storage.getInvoiceItemsForInvoices(ids);
    res.json(items);
  });

  // Get single invoice with items
  app.get("/api/invoices/:id", isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const invoice = await storage.getInvoiceById(id);
    if (!invoice) {
      return res.status(404).json({ error: "الفاتورة غير موجودة" });
    }
    const items = await storage.getInvoiceItems(id);
    res.json({ ...invoice, items });
  });

  // Generate next invoice number
  app.get("/api/invoices/next-number", isAuthenticated, async (req: any, res) => {
    const nextNumber = await storage.getNextInvoiceNumber();
    res.json({ invoiceNumber: nextNumber });
  });

  // Create invoice — admin or accountant (canManageAccounting)
  app.post("/api/invoices", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canCreate = isAdmin || branchSession?.permissions?.canManageAccounting;
    const user = req.user;
    const userId = branchSession?.userId ?? null;

    if (!canCreate) {
      return res.status(403).json({ error: "غير مصرح لك بإنشاء الفواتير" });
    }

    try {
      // applyPriorCredit is a client-only flag controlling whether we
      // auto-apply unallocated patient session payments to this new
      // invoice. Defaults to true to preserve the previous behaviour
      // for any existing client; new code passes false explicitly when
      // the invoice is for a specific service rather than the full
      // patient account.
      //
      // paidNow is an auxiliary cash-at-creation hint (invoice cash truth,
      // 2026-08-26): an up-front amount the patient pays the moment the
      // invoice is issued. It used to be replayed as a SEPARATE call to the
      // old, now-deprecated /payment endpoint AFTER the invoice already
      // existed — a window where the invoice could be created (and prior
      // credit applied) while the up-front cash failed to attach, reported
      // to the user as a generic creation error. It is now processed in the
      // SAME server operation as creation, items, and prior-credit
      // allocation (createInvoiceWithCash): either all of it commits, or
      // none of it does.
      const { items, applyPriorCredit, paidNow, ...invoiceData } = req.body;
      const shouldApplyCredit = applyPriorCredit !== false;

      // Non-admins can only file invoices for their own branch — pin
      // server-side regardless of what the client sends.
      if (!isAdmin && branchSession?.branchId) {
        invoiceData.branchId = branchSession.branchId;
      }

      // Generate invoice number if not provided
      if (!invoiceData.invoiceNumber) {
        invoiceData.invoiceNumber = await storage.getNextInvoiceNumber();
      }

      invoiceData.createdBy = branchSession?.userId
        ? String(branchSession.userId)
        : user?.claims?.sub || "unknown";

      const actor = {
        userId, userName: branchSession?.displayName ?? null,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
      };

      // Note: prior-credit allocation still double-counts revenue when it
      // applies (the original session payments already posted their own
      // Cr Revenue / Dr Cash entries, and issuing this invoice posts a
      // second Dr AR / Cr Revenue for the full total) — a pre-existing
      // accounting-model note this PR does not touch. paidNow is unrelated:
      // it is fresh cash collected right now, and posts its own correct
      // Dr Cash / Cr AR entry below, same as /collect.
      const result = await createInvoiceWithCash({
        invoiceData,
        items: Array.isArray(items) ? items : [],
        applyPriorCredit: shouldApplyCredit,
        paidNow: Number(paidNow) > 0 ? Number(paidNow) : 0,
        actor,
      });

      // Auto-journal (safe to fail, logged) — issuance first, then the
      // up-front collection's own entry, exactly like /collect's ordering.
      await createJournalForInvoice(result.invoice, result.items, userId);
      if (result.payment) {
        await createJournalForInvoicePayment(result.invoice, result.payment.amount, userId);
      }

      res.json({ ...result.invoice, creditApplied: result.creditApplied });
    } catch (err: any) {
      if (err instanceof InvoiceCashError) {
        return res.status(err.status).json({ error: err.message });
      }
      res.status(400).json({ error: err.message });
    }
  });

  // Update invoice — admin or any user with canManageAccounting (e.g.
  // branch_manager). Branch isolation enforced for non-admins.
  app.patch("/api/invoices/:id", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canManage = isAdmin || branchSession?.permissions?.canManageAccounting;
    const userId = branchSession?.userId ?? null;

    if (!canManage) {
      return res.status(403).json({ error: "غير مصرح لك بتعديل الفواتير" });
    }

    const id = parseInt(req.params.id);
    try {
      // Branch isolation for branch_manager: they can only edit
      // invoices that belong to their own branch.
      if (!isAdmin && branchSession?.branchId) {
        const existing = await storage.getInvoiceById(id);
        if (!existing) {
          return res.status(404).json({ error: "الفاتورة غير موجودة" });
        }
        if (existing.branchId !== branchSession.branchId) {
          return res.status(403).json({ error: "لا يمكنك تعديل فاتورة من فرع آخر" });
        }
      }

      const { items, ...invoiceData } = req.body;

      // Money moves through ONE door (accounting audit, 2026-07-29): cash
      // against an invoice is recorded via /collect below, which writes a
      // real payment row (so الوارد sees it) and updates the invoice
      // atomically. A raw paidAmount edit here would move money invisibly.
      delete (invoiceData as any).paidAmount;

      const invoice = await storage.updateInvoice(id, invoiceData);

      // Update items if provided
      const newItems = [];
      if (items && Array.isArray(items)) {
        // Delete existing items and recreate
        await storage.deleteInvoiceItems(id);
        for (const item of items) {
          const created = await storage.createInvoiceItem({
            ...item,
            invoiceId: id,
          });
          newItems.push(created);
        }
      }

      // Auto-journal: reverse old issuance entry, create new (safe to fail)
      await reverseJournalForSource("invoice", id, userId, "تعديل الفاتورة");
      if (invoice) {
        const itemsForJournal = items && Array.isArray(items) ? newItems : await storage.getInvoiceItems(id);
        await createJournalForInvoice(invoice, itemsForJournal, userId);
      }

      if (invoice) {
        await logAudit({
          entityType: "invoice",
          entityId: id,
          action: "update",
          userId,
          userName: branchSession?.displayName ?? null,
          branchId: invoice.branchId,
          newValues: { total: invoice.total },
        });
      }

      res.json(invoice);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Delete invoice — admin or any user with canManageAccounting.
  // ---- «تسجيل قبض» على فاتورة -----------------------------------------------
  // The ONE door for invoice cash (accounting audit, 2026-07-29). The owner
  // confirmed real money is collected against invoices; before this, there was
  // no way to record it — the invoice stayed «قيد الانتظار» after the patient
  // paid, and any ad-hoc paidAmount edit would have been invisible to الوارد.
  // This writes a REAL payment row (entering الوارد like all cash, linked via
  // invoice_id) and updates the invoice's paidAmount/status with it.
  app.post("/api/invoices/:id/collect", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!canCollectInvoice(branchSession)) return res.status(403).json({ error: "غير مصرح لك بتسجيل القبض" });

    try {
      const id = parseInt(req.params.id);
      const result = await collectInvoicePayment({
        invoiceId: id,
        amount: Number(req.body?.amount) || 0,
        allowedBranches: accessibleBranchesFor(req),
        actor: {
          userId: branchSession?.userId ?? null, userName: branchSession?.displayName ?? null,
          ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        },
      });

      // Auto-journal: Dr Cash / Cr AR (safe to fail, logged) — after COMMIT,
      // same safe-to-fail convention as every other auto-journal call.
      await createJournalForInvoicePayment(result.invoice, result.newPaid - result.previousPaid, branchSession?.userId ?? null);

      res.json({ invoice: result.invoice, payment: result.payment });
    } catch (err: any) {
      if (err instanceof InvoiceCashError) return res.status(err.status).json({ error: err.message });
      console.error("Error collecting invoice payment:", err);
      res.status(500).json({ error: "تعذّر تسجيل القبض" });
    }
  });

  app.delete("/api/invoices/:id", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canManage = isAdmin || branchSession?.permissions?.canManageAccounting;
    const userId = branchSession?.userId ?? null;

    if (!canManage) {
      return res.status(403).json({ error: "غير مصرح لك بحذف الفواتير" });
    }

    const id = parseInt(req.params.id);
    try {
      // ══ الحذفُ الصريحُ ليس آليّةَ عكسٍ ماليّ، والفحصُ يقع تحت القفل نفسِه
      // الذي يستعمله القبضُ (٢٠٢٦-٠٨-٢٦) ══════════════════════════════════
      // كان الفحصُ («أعليها تسوية؟») يُقرأ هنا بلا قفل، ثمّ يُفتَح حذفٌ لاحقاً
      // منفصل — نافذةٌ حقيقية: قبضٌ متزامنٌ (`collectInvoicePayment`، الذي
      // يقفل الصفَّ `FOR UPDATE`) قد ينجز دفعتَه بين القراءة وبين الحذف، فتُحذَف
      // فاتورةٌ وصفُّ دفعتها الجديد يبقى يتيماً (`payments.invoice_id` بلا
      // مفتاحٍ أجنبيّ عمداً — درسُ ٠٣٨). `deleteInvoiceIfUntouched` تنادي
      // **نفسَ** قفل `collectInvoicePayment`، فالفحصُ والحذفُ قرارٌ ذرّيٌّ
      // واحد لا يتنازعه قبضٌ متزامن. التفصيلُ في `accounting/invoice_cash.ts`.
      await deleteInvoiceIfUntouched({
        invoiceId: id,
        isAdmin: Boolean(isAdmin),
        sessionBranchId: branchSession?.branchId ?? null,
        actor: {
          userId, userName: branchSession?.displayName ?? null,
          ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        },
      });

      // القيدان خارج معاملة الحذف عمداً — عرفُ «الآمن للفشل» القائم
      // (`createJournalEntry`/`reverseJournalEntry` يفتحان مسبحَ اتّصالٍ
      // خاصّاً بهما، فلا ينضمّان إلى معاملة الحذف). والذرّيةُ التي تهمّ
      // محفوظةٌ فعلاً: القفلُ أعلاه أثبت — قبل أن يُكتب حرفٌ — أن لا مالَ على
      // الفاتورة، فحذفُها ليس عمليةَ عكسٍ ماليّ يحتاج تزامناً مع هذا القيد.
      await reverseJournalForSource("invoice", id, userId, "حذف الفاتورة");
      await reverseJournalForSource("invoice_payment", id, userId, "حذف الفاتورة");

      res.json({ success: true });
    } catch (err: any) {
      if (err instanceof InvoiceCashError) return res.status(err.status).json({ error: err.message });
      res.status(400).json({ error: err.message });
    }
  });

  // ---- «تسجيل دفعة» على فاتورة — DEPRECATED COMPATIBILITY ALIAS -------------
  // Invoice cash truth (2026-08-26): this endpoint used to be a SECOND,
  // independent money implementation — it wrote the correct journal
  // (Dr Cash / Cr AR) but created NO real `payments` row (so the cash was
  // invisible to الوارد/branch cash readers), skipped branch-scope checks
  // entirely, and validated overpayment more weakly than /collect.
  //
  // It is kept ONLY for any stale client still calling it — the CURRENT
  // Accounting.tsx never does (invoice creation sends paidNow to POST
  // /api/invoices directly; see createInvoiceWithCash). It now delegates to
  // the EXACT SAME canonical writer as /collect — same permissions, same
  // server-side branch scope, same row lock, same overpayment rule, same
  // real payment row, same journal, same audit. There is no independent
  // money logic left here to drift. May be removed once nothing calls it.
  app.post("/api/invoices/:id/payment", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!canCollectInvoice(branchSession)) {
      return res.status(403).json({ error: "غير مصرح لك بتسجيل المدفوعات" });
    }

    try {
      const id = parseInt(req.params.id);
      const result = await collectInvoicePayment({
        invoiceId: id,
        amount: Number(req.body?.amount) || 0,
        allowedBranches: accessibleBranchesFor(req),
        actor: {
          userId: branchSession?.userId ?? null, userName: branchSession?.displayName ?? null,
          ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        },
      });

      // Auto-journal: Dr Cash / Cr AR (safe to fail, logged)
      await createJournalForInvoicePayment(result.invoice, result.newPaid - result.previousPaid, branchSession?.userId ?? null);

      // Response shape preserved for whatever stale client still calls this
      // (the bare updated invoice, not the {invoice, payment} wrapper /collect
      // returns) — a compatibility alias changes behaviour, not contract.
      res.json(result.invoice);
    } catch (err: any) {
      if (err instanceof InvoiceCashError) return res.status(err.status).json({ error: err.message });
      console.error("Error recording invoice payment (deprecated /payment alias):", err);
      res.status(500).json({ error: "تعذّر تسجيل الدفعة" });
    }
  });

  // Get invoice statistics (admin-only)
  app.get("/api/invoices/stats/summary", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    
    if (!isAdmin) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للإحصائيات" });
    }
    
    const { branchId, startDate, endDate } = req.query;
    const stats = await storage.getInvoiceStats(
      branchId ? parseInt(branchId) : undefined,
      startDate as string,
      endDate as string
    );
    res.json(stats);
  });

  // ======================= VENDOR & PURCHASE ROUTES =======================

  // List vendors — anyone with accounting access (read-only for accountant role)
  app.get("/api/vendors", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;
    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للموردين" });
    }
    const includeInactive = req.query.includeInactive === "true";
    const list = await storage.getVendors(!includeInactive);
    res.json(list);
  });

  app.get("/api/vendors/:id", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;
    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك" });
    }
    const id = parseInt(req.params.id);
    const vendor = await storage.getVendorById(id);
    if (!vendor) return res.status(404).json({ error: "المورد غير موجود" });
    res.json(vendor);
  });

  // Create vendor — admin or accountant
  app.post("/api/vendors", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAdd = isAdmin || branchSession?.permissions?.canManageAccounting;
    if (!canAdd) {
      return res.status(403).json({ error: "غير مصرح لك بإضافة مورد" });
    }
    try {
      const data = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor(data);
      res.json(vendor);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update vendor — admin only (per the edit policy)
  app.patch("/api/vendors/:id", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) {
      return res.status(403).json({ error: "فقط المسؤول يمكنه تعديل الموردين" });
    }
    const id = parseInt(req.params.id);
    try {
      const data = insertVendorSchema.partial().parse(req.body);
      const vendor = await storage.updateVendor(id, data);
      res.json(vendor);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Soft-delete vendor (deactivate) — admin only
  app.delete("/api/vendors/:id", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) {
      return res.status(403).json({ error: "فقط المسؤول يمكنه حذف الموردين" });
    }
    const id = parseInt(req.params.id);
    await storage.deactivateVendor(id);
    res.json({ success: true });
  });

  // List purchases
  app.get("/api/purchases", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;
    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للمشتريات" });
    }
    let { branchId, vendorId, status, startDate, endDate } = req.query as any;
    // Non-admins are forced to their own branch
    if (!isAdmin) {
      branchId = branchSession?.branchId;
    }
    const list = await storage.getPurchases(
      branchId ? parseInt(branchId) : undefined,
      vendorId ? parseInt(vendorId) : undefined,
      status,
      startDate,
      endDate
    );
    res.json(list);
  });

  app.get("/api/purchases/:id", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;
    if (!canAccess) return res.status(403).json({ error: "غير مصرح لك" });
    const id = parseInt(req.params.id);
    const purchase = await storage.getPurchaseById(id);
    if (!purchase) return res.status(404).json({ error: "الشراء غير موجود" });
    res.json(purchase);
  });

  // Create purchase — admin or accountant. Auto-journals based on payment_method.
  app.post("/api/purchases", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAdd = isAdmin || branchSession?.permissions?.canManageAccounting;
    const userId = branchSession?.userId ?? null;
    const user = req.user;
    if (!canAdd) {
      return res.status(403).json({ error: "غير مصرح لك بإضافة شراء" });
    }
    try {
      // Non-admins cannot file a purchase against any branch other than
      // their own. Pin server-side regardless of what the client sends.
      const body = { ...req.body };
      if (!isAdmin && branchSession?.branchId) {
        body.branchId = branchSession.branchId;
      }
      const data = insertPurchaseSchema.parse(body);
      const purchase = await storage.createPurchase({
        ...data,
        createdBy: branchSession?.userId
          ? String(branchSession.userId)
          : user?.claims?.sub || "unknown",
      });
      // Auto-journal: Dr Expense / Cr AP (credit) or Cr Cash (cash)
      await createJournalForPurchase(purchase, userId);
      res.json(purchase);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update purchase — admin only
  app.patch("/api/purchases/:id", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) {
      return res.status(403).json({ error: "فقط المسؤول يمكنه تعديل المشتريات" });
    }
    const id = parseInt(req.params.id);
    const userId = branchSession?.userId ?? null;
    try {
      const existing = await storage.getPurchaseById(id);
      if (!existing) return res.status(404).json({ error: "الشراء غير موجود" });

      const data = insertPurchaseSchema.partial().parse(req.body);
      const updated = await storage.updatePurchase(id, data);
      // Reverse old journal and post a new one to keep books accurate
      await reverseJournalForSource("purchase", id, userId, "تعديل الشراء");
      if (updated) {
        await createJournalForPurchase(updated, userId);
      }
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Delete purchase — admin only
  app.delete("/api/purchases/:id", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) {
      return res.status(403).json({ error: "فقط المسؤول يمكنه حذف المشتريات" });
    }
    const id = parseInt(req.params.id);
    const userId = branchSession?.userId ?? null;
    // Reverse all related journals first (purchase + any vendor payments)
    await reverseJournalForSource("purchase", id, userId, "حذف الشراء");
    await reverseJournalForSource("vendor_payment", id, userId, "حذف الشراء");
    await storage.deletePurchase(id);
    res.json({ success: true });
  });

  // Record a payment to a vendor for an existing purchase
  app.post("/api/purchases/:id/payment", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canRecord = isAdmin || branchSession?.permissions?.canManageAccounting;
    const userId = branchSession?.userId ?? null;
    if (!canRecord) {
      return res.status(403).json({ error: "غير مصرح لك بتسجيل دفعات الموردين" });
    }
    const id = parseInt(req.params.id);
    const { amount } = req.body;
    try {
      const purchase = await storage.getPurchaseById(id);
      if (!purchase) return res.status(404).json({ error: "الشراء غير موجود" });

      const paymentAmount = Number(amount) || 0;
      if (paymentAmount <= 0) {
        return res.status(400).json({ error: "مبلغ الدفعة يجب أن يكون أكبر من صفر" });
      }

      const newPaidAmount = (purchase.paidAmount || 0) + paymentAmount;
      let newStatus = "partial";
      if (newPaidAmount >= purchase.totalAmount) newStatus = "paid";
      else if (newPaidAmount === 0) newStatus = "pending";

      const updated = await storage.updatePurchase(id, {
        paidAmount: newPaidAmount,
        status: newStatus,
      } as any);
      // Auto-journal: Dr AP / Cr Cash
      await createJournalForVendorPayment(purchase, paymentAmount, userId);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Purchase summary — admin or accountant
  app.get("/api/purchases/stats/summary", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;
    if (!canAccess) return res.status(403).json({ error: "غير مصرح لك" });
    let { branchId, startDate, endDate } = req.query as any;
    if (!isAdmin) branchId = branchSession?.branchId;
    const summary = await storage.getPurchasesSummary(
      branchId ? parseInt(branchId) : undefined,
      startDate,
      endDate
    );
    res.json(summary);
  });

  // ======================= AI ASSIST ROUTES =======================

  // Tells the client whether AI features are available.
  // Lets the UI hide AI buttons gracefully when ANTHROPIC_API_KEY isn't set.
  app.get("/api/ai/status", isAuthenticated, (_req, res) => {
    res.json({ enabled: isAiEnabled() });
  });

  // Suggests an expense category from a free-form Arabic description.
  // Admin or accountant only — same gate as the rest of accounting.
  app.post("/api/ai/categorize-expense", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;
    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك باستخدام الذكاء الاصطناعي" });
    }
    const { description } = req.body ?? {};
    if (typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ error: "الوصف مطلوب" });
    }
    const result = await suggestExpenseCategory(description);
    if (!result.ok) {
      const status = result.reason === "disabled" ? 503 : result.reason === "rate_limit" ? 429 : 502;
      return res.status(status).json({ error: result.message, reason: result.reason });
    }
    res.json({ category: result.value });
  });

  // Conversational assistant — **one assistant, two server modes**.
  //
  // كلّ موظّف مصادَق يستعمله. لكنّ المال بابُه مغلق بنيوياً: مَن لا يملك
  // `canUseFinance` يمرّ على المسار العام، فلا لقطةَ مالية تُبنى ولا تابعَ
  // مالي في `storage` يُستدعى أصلاً — والمنع في الشيفرة لا في تعليمة
  // الـprompt، فالنموذج لا يُفشي رقماً لم يصله.
  //
  // والهوية من الجلسة وحدها: `resolveAiAccess` لا يرى الطلب، فلا حقلٌ في
  // جسمه ولا جملةٌ في رسالة المستخدم يمكن أن ترفع صلاحية.
  app.post("/api/ai/chat", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;

    const { messages } = req.body ?? {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages مطلوبة" });
    }
    // Trim history to the last 10 turns — keeps prompt size bounded and
    // matches what users actually need (recent context only).
    const history: ChatMessage[] = messages.slice(-10).map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content ?? "").slice(0, 2000),
    }));

    // Branch isolation: the SAME accounting scope the rest of the system
    // uses — non-admins are pinned to their own branch, and only an admin
    // may narrow to a chosen one. A crafted branchId from a non-admin has
    // no effect because enforceBranchAccess never reads it for them.
    const scopeBranchId = enforceBranchAccess(req);
    let branchName: string | null = null;
    if (scopeBranchId) {
      const branches = await storage.getBranches();
      branchName = branches.find((b) => b.id === scopeBranchId)?.name ?? null;
    }

    const access = resolveAiAccess({ session: branchSession, branchName, scopeBranchId });

    const result = await aiChat(access, history);

    // أثرٌ صغير لكلّ طلب: مَن سأل، من أي فرع، بأي وضع، وهل مُنح المال،
    // وأسماءُ الأدوات التي نُفِّذت وعددُها. **ولا وسائطَ ولا نتائج ولا رمزَ
    // مريض ولا اسمَ ولا تشخيصَ ولا نصَّ سؤالٍ ولا جواب** — السجلّ للمساءلة
    // لا للأرشفة، وأرشفةُ محتوى العيادة في سجلّ تدقيقٍ تسريبٌ بابٌ آخر.
    // (يُكتب بعد النداء ليحمل الأدوات؛ وهو «أطلق وانسَ» فلا يؤخّر الردّ.)
    const toolNames = result.ok ? (result.value.tools?.names ?? []) : [];
    logAudit({
      entityType: "ai_chat",
      entityId: access.userId ?? 0,
      action: access.mode,
      userId: access.userId,
      userName: branchSession?.displayName ?? null,
      branchId: access.branchId,
      newValues: {
        mode: access.mode,
        financeAllowed: access.canUseFinance,
        ...(access.financeScopeMissing ? { financeScopeMissing: true } : {}),
        ...(toolNames.length
          ? { toolNames: toolNames.filter((n, i) => toolNames.indexOf(n) === i), toolCount: toolNames.length }
          : {}),
      },
      ipAddress: req.ip ?? null,
      userAgent: req.get?.("user-agent") ?? null,
    });

    if (!result.ok) {
      const status = result.reason === "disabled" ? 503 : result.reason === "rate_limit" ? 429 : 502;
      return res.status(status).json({ error: result.message, reason: result.reason });
    }
    res.json(result.value);
  });

  // Generates an Arabic narrative monthly report for a given branch/
  // month using Sonnet. Cached server-side per (branch, month) so
  // repeat opens don't re-bill. Admin can pick any branch; non-admin
  // is pinned to their own.
  app.post("/api/ai/monthly-report", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;
    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح" });
    }
    const { month, branchId: requestedBranchId } = req.body ?? {};
    if (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: "month مطلوب بصيغة YYYY-MM" });
    }
    // Prevent generating reports for the future — saves a wasted LLM
    // call on data that doesn't exist yet.
    const today = new Date();
    const todayMonth = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
    if (month > todayMonth) {
      return res.status(400).json({ error: "لا يمكن توليد تقرير لشهر مستقبلي" });
    }

    let branchId: number | null;
    if (isAdmin) {
      branchId = typeof requestedBranchId === "number" ? requestedBranchId : null;
    } else {
      branchId = branchSession?.branchId ?? null;
    }

    let branchName: string | null = null;
    if (branchId) {
      const branches = await storage.getBranches();
      branchName = branches.find((b) => b.id === branchId)?.name ?? null;
    }

    const result = await getOrGenerateMonthlyReport({ branchId, branchName, month });
    if (!result.ok) {
      const status = result.reason === "disabled" ? 503 : result.reason === "rate_limit" ? 429 : 502;
      return res.status(status).json({ error: result.message, reason: result.reason });
    }
    res.json(result.value);
  });

  // Generates an Arabic draft reply to a patient survey response.
  // Output is for review only — the manager reads, edits, and sends
  // through whichever channel they prefer; we never auto-send.
  app.post("/api/ai/survey-reply", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess =
      isAdmin ||
      branchSession?.permissions?.canManageSurveys ||
      branchSession?.permissions?.canManageAccounting;
    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح" });
    }
    const { responseId } = req.body ?? {};
    const id = Number(responseId);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "responseId غير صالح" });
    }

    // Branch isolation: a non-admin must only generate replies for
    // surveys in their branch — otherwise they could read raw PII
    // from other branches via the AI's prompt input.
    if (!isAdmin && branchSession?.branchId) {
      const all = await storage.getSurveyResponses(branchSession.branchId);
      if (!all.some((r) => r.id === id)) {
        return res.status(403).json({ error: "هذا الاستبيان خارج نطاق فرعك" });
      }
    }

    const result = await generateSurveyReply({ responseId: id });
    if (!result.ok) {
      const status = result.reason === "disabled" ? 503 : result.reason === "rate_limit" ? 429 : 502;
      return res.status(status).json({ error: result.message, reason: result.reason });
    }
    res.json(result.value);
  });

  // Per-employee activity & accuracy aggregates over a window. Admin
  // only — surfaces who creates how many records, totals by type, and
  // anomaly-decision workload. Used by the admin dashboard to spot
  // employees who might need training (high anomaly involvement) or
  // employees doing the heavy lifting.
  app.get("/api/admin/employee-accuracy", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) {
      return res.status(403).json({ error: "غير مصرح — مسؤول النظام فقط" });
    }
    const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;

    // Reward cycle is a calendar month (Baghdad). `month=YYYY-MM` selects a
    // specific month; default is the current Baghdad month. Bounds are the
    // first and last day of that month as YYYY-MM-DD (storage builds the
    // Baghdad-timezone timestamps).
    const monthParam = typeof req.query.month === "string" && /^\d{4}-\d{2}$/.test(req.query.month)
      ? req.query.month
      : new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" }).slice(0, 7);
    const [yy, mm] = monthParam.split("-").map(Number);
    const startDate = `${monthParam}-01`;
    const lastDay = new Date(Date.UTC(yy, mm, 0)).getUTCDate(); // day 0 of next month = last of this
    const endDate = `${monthParam}-${String(lastDay).padStart(2, "0")}`;

    const rows = await storage.getEmployeeAccuracy({ branchId, startDate, endDate });

    // Sort by score descending — highest performers first.
    const sorted = rows.slice().sort((a, b) => b.score - a.score);

    res.json({ month: monthParam, startDate, endDate, rows: sorted });
  });

  // Per-role monthly targets used by the performance scoring. Admin only.
  app.get("/api/admin/performance-targets", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) {
      return res.status(403).json({ error: "غير مصرح — مسؤول النظام فقط" });
    }
    res.json(await storage.getPerformanceTargets());
  });

  app.put("/api/admin/performance-targets", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) {
      return res.status(403).json({ error: "غير مصرح — مسؤول النظام فقط" });
    }
    const body = req.body;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ error: "بيانات غير صالحة" });
    }
    const saved = await storage.setPerformanceTargets(body);
    res.json(saved);
  });

  // Smart accounting audit — periodic deep review across a 30/60/90-day
  // window. Distinct from /api/anomalies (which is per-transaction and
  // rule-based): this surfaces patterns Sonnet sees in distributions,
  // concentration, and timing. Cached 6h server-side so reopening the
  // page doesn't re-bill.
  app.post("/api/ai/smart-audit", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;
    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح" });
    }
    const { windowDays: requestedWindow, branchId: requestedBranchId } = req.body ?? {};
    const windowDays = Math.max(7, Math.min(90, Number(requestedWindow) || 30));
    let branchId: number | null;
    if (isAdmin) {
      branchId = typeof requestedBranchId === "number" ? requestedBranchId : null;
    } else {
      branchId = branchSession?.branchId ?? null;
    }
    let branchName: string | null = null;
    if (branchId) {
      const branches = await storage.getBranches();
      branchName = branches.find((b) => b.id === branchId)?.name ?? null;
    }
    const result = await getOrGenerateSmartAudit({ branchId, branchName, windowDays });
    if (!result.ok) {
      const status = result.reason === "disabled" ? 503 : result.reason === "rate_limit" ? 429 : 502;
      return res.status(status).json({ error: result.message, reason: result.reason });
    }
    res.json(result.value);
  });

  // Inline guidance for an in-progress expense. Cheap and synchronous —
  // mostly rule-based; the AI escalation path is opt-in per request via
  // `useAi: true` so the default cost is zero. Used by the expense form
  // to display contextual hints under the description field.
  app.post("/api/guidance/expense", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;
    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح" });
    }
    const { description, amount, category, useAi } = req.body ?? {};
    const input = {
      description: typeof description === "string" ? description : "",
      amount: Number(amount) || 0,
      category: typeof category === "string" ? category : null,
    };
    const ruleHints = getRuleBasedHints(input);
    if (!useAi) {
      return res.json({ hints: ruleHints, source: "rules" });
    }
    const aiResult = await getAiHints(input);
    if (!aiResult.ok) {
      return res.json({ hints: ruleHints, source: "rules", aiError: aiResult.reason });
    }
    // Merge — rules first (deterministic, more important), then AI.
    res.json({ hints: [...ruleHints, ...aiResult.value], source: "rules+ai" });
  });

  // ======================= ANOMALY DETECTION ROUTES =======================

  // Lists anomalies for the user's accessible branch(es). Pure rule-based,
  // no LLM call — cheap to refresh on every dashboard load.
  app.get("/api/anomalies", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;
    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للتنبيهات" });
    }
    const branchId = enforceBranchAccess(req);
    const anomalies = await detectAnomalies(branchId);
    res.json(anomalies);
  });

  // Generates an Arabic AI explanation for a single anomaly. Hit on demand
  // when the user clicks "اشرح بالذكاء" so the cost is one Haiku call per
  // explicit request, not per page load.
  app.post("/api/ai/explain-anomaly", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;
    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك" });
    }
    const anomaly = req.body?.anomaly as Anomaly | undefined;
    if (!anomaly || !anomaly.id || !anomaly.type) {
      return res.status(400).json({ error: "بيانات التنبيه ناقصة" });
    }
    // Defence in depth: a non-admin can't ask for an explanation of an
    // anomaly belonging to a different branch.
    if (!isAdmin && branchSession?.branchId && anomaly.branchId !== branchSession.branchId) {
      return res.status(403).json({ error: "غير مصرح" });
    }
    const result = await explainAnomaly(anomaly);
    if (!result.ok) {
      const status = result.reason === "disabled" ? 503 : result.reason === "rate_limit" ? 429 : 502;
      return res.status(status).json({ error: result.message, reason: result.reason });
    }
    res.json({ explanation: result.value });
  });

  // Records the accountant's decision on a specific anomaly. The detector
  // consults these decisions on its next run and skips matching anomalies,
  // so the accountant doesn't keep seeing alerts they've already handled.
  app.post("/api/anomalies/decisions", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;
    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك" });
    }
    const { anomalyType, sourceType, sourceId, decision, reason, branchId: bodyBranchId } = req.body ?? {};
    if (!anomalyType || !sourceType || !sourceId || !decision) {
      return res.status(400).json({ error: "بيانات القرار ناقصة" });
    }
    if (!["reviewed", "not_error"].includes(decision)) {
      return res.status(400).json({ error: "نوع القرار غير صالح" });
    }
    // Non-admins can only record decisions for their own branch.
    const enforcedBranch = isAdmin ? (bodyBranchId ?? null) : branchSession?.branchId ?? null;
    const created = await storage.recordAnomalyDecision({
      anomalyType,
      sourceType,
      sourceId: parseInt(sourceId),
      decision,
      reason: reason ?? null,
      branchId: enforcedBranch,
      userId: branchSession?.userId ?? null,
    });
    res.json(created);
  });

  // Lists active (non-expired) anomaly decisions for the requester's
  // scope. Used by the "قرارات سابقة" section under anomalies so the
  // accountant can see what they've already cleared and undo if needed.
  app.get("/api/anomalies/decisions", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;
    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك" });
    }
    const branchId = isAdmin ? undefined : branchSession?.branchId ?? undefined;
    const list = await storage.getActiveAnomalyDecisionsWithDetails(branchId);
    res.json(list);
  });

  // Undoes a previously-recorded decision so the anomaly resurfaces on
  // the next refresh. Branch-isolated.
  app.delete("/api/anomalies/decisions/:id", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;
    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك" });
    }
    const id = parseInt(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "معرّف غير صالح" });
    }
    const ok = await storage.deleteAnomalyDecision(
      id,
      isAdmin ? null : branchSession?.branchId ?? null
    );
    if (!ok) {
      return res.status(404).json({ error: "القرار غير موجود أو خارج نطاقك" });
    }
    res.json({ ok: true });
  });

  // ==================== FOLLOW-UP CALL REMINDERS ====================
  //
  // Reminders to call physiotherapy patients who stopped coming (>= 7 days
  // since last visit). Branch-isolated: non-admins see only their own branch.
  // Anyone who can view patients can read and record outcomes; recording an
  // outcome marks the episode handled so it leaves the active list. All branch
  // members (and admin) can edit/delete notes within their scope.

  // Active reminders (un-handled stop-episodes).
  app.get("/api/follow-ups", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canViewPatients;
    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للتذكيرات" });
    }
    const branchId = enforceBranchAccess(req);
    const reminders = await computeActiveReminders(branchId);
    //  الرمز الحالي يأتي من الصفّ نفسه، والأسماء البديلة دفعةً واحدة —
    //  فيبحث الموظّف هنا برمزٍ كما يبحث في السجلّ.
    const aliasByPatient = await aliasCodesByPatient(reminders.map((r) => r.patientId));
    res.json(reminders.map((r) => ({
      ...r,
      ...(aliasByPatient.has(r.patientId)
        ? { aliasCodes: aliasByPatient.get(r.patientId) } : {}),
    })));
  });

  // Handled history (reviewable record of logged calls).
  app.get("/api/follow-ups/history", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canViewPatients;
    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك" });
    }
    const branchId = isAdmin ? undefined : branchSession?.branchId ?? undefined;
    const list = await storage.getFollowUpHistory(branchId);
    const aliasByPatient = await aliasCodesByPatient(list.map((r) => r.patientId));
    res.json(list.map((r) => ({
      ...r,
      ...(aliasByPatient.has(r.patientId)
        ? { aliasCodes: aliasByPatient.get(r.patientId) } : {}),
    })));
  });

  // Logs a call outcome → marks the current stop-episode handled. The anchor
  // (last visit) and branch are re-derived server-side from the DB so a stale
  // or forged client value can't suppress the wrong episode.
  app.post("/api/follow-ups", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canViewPatients;
    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك" });
    }
    const patientId = parseInt(req.body?.patientId);
    const outcomeNote = typeof req.body?.outcomeNote === "string" ? req.body.outcomeNote.trim() : "";
    if (!Number.isFinite(patientId) || !outcomeNote) {
      return res.status(400).json({ error: "بيانات المتابعة ناقصة" });
    }
    const snapshot = await getReminderSnapshot(patientId);
    if (!snapshot) {
      return res.status(409).json({ error: "المريض ليس تذكيراً نشطاً صالحاً" });
    }
    // Non-admins can only log calls for their own branch.
    if (!isAdmin && snapshot.branchId !== branchSession?.branchId) {
      return res.status(403).json({ error: "غير مصرح لك بهذا الفرع" });
    }
    const created = await storage.createFollowUpCall({
      patientId,
      branchId: snapshot.branchId,
      lastVisitAnchor: snapshot.lastVisit,
      outcomeNote,
      createdBy: branchSession?.userId ?? null,
    });
    res.json(created);
  });

  // Edits a saved outcome note. Branch-isolated for non-admins.
  app.patch("/api/follow-ups/:id", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canViewPatients;
    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك" });
    }
    const id = parseInt(req.params.id);
    const outcomeNote = typeof req.body?.outcomeNote === "string" ? req.body.outcomeNote.trim() : "";
    if (!Number.isFinite(id) || !outcomeNote) {
      return res.status(400).json({ error: "بيانات غير صالحة" });
    }
    const updated = await storage.updateFollowUpNote(
      id,
      outcomeNote,
      isAdmin ? null : branchSession?.branchId ?? null
    );
    if (!updated) {
      return res.status(404).json({ error: "الملاحظة غير موجودة أو خارج نطاقك" });
    }
    res.json(updated);
  });

  // Deletes a handled record → the reminder re-arms if the patient is still
  // stopped. Branch-isolated for non-admins.
  app.delete("/api/follow-ups/:id", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canViewPatients;
    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك" });
    }
    const id = parseInt(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "معرّف غير صالح" });
    }
    const ok = await storage.deleteFollowUpCall(
      id,
      isAdmin ? null : branchSession?.branchId ?? null
    );
    if (!ok) {
      return res.status(404).json({ error: "الملاحظة غير موجودة أو خارج نطاقك" });
    }
    res.json({ ok: true });
  });

  // ======================= AI MEMORY NOTES ROUTES =======================
  // Manager-curated context that the AI explainer uses to ground its
  // explanations. The accountant can READ these (so they understand which
  // notes shaped a given explanation), but only admin can write.

  app.get("/api/ai-notes", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;
    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك" });
    }
    const branchId = enforceBranchAccess(req);
    const includeInactive = req.query.includeInactive === "true";
    const list = await storage.getAiMemoryNotes(branchId, !includeInactive);
    res.json(list);
  });

  app.post("/api/ai-notes", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) {
      return res.status(403).json({ error: "فقط المسؤول يمكنه إضافة ملاحظات للذاكرة" });
    }
    try {
      const data = insertAiMemoryNoteSchema.parse({
        ...req.body,
        createdBy: branchSession?.userId ?? null,
      });
      const created = await storage.createAiMemoryNote(data);
      res.json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch("/api/ai-notes/:id", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) {
      return res.status(403).json({ error: "فقط المسؤول يمكنه تعديل الملاحظات" });
    }
    try {
      const id = parseInt(req.params.id);
      const data = insertAiMemoryNoteSchema.partial().parse(req.body);
      const updated = await storage.updateAiMemoryNote(id, data);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/ai-notes/:id", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) {
      return res.status(403).json({ error: "فقط المسؤول يمكنه حذف الملاحظات" });
    }
    const id = parseInt(req.params.id);
    await storage.deleteAiMemoryNote(id);
    res.json({ success: true });
  });

  // ======================= TREATMENT PLAN ROUTES =======================

  app.get("/api/patients/:patientId/treatment-plans", isAuthenticated, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const plans = await storage.getTreatmentPlans(patientId);
      res.json(plans);
    } catch (err) {
      res.status(500).json({ message: "فشل في جلب الخطط العلاجية" });
    }
  });

  app.post("/api/patients/:patientId/treatment-plans", isAuthenticated, async (req, res) => {
    try {
      const permissions = getPermissions(req);
      if (!permissions.canManageTreatmentPlans) {
        return res.status(403).json({ message: "غير مصرح لك بإدارة الخطط العلاجية" });
      }

      const patientId = parseInt(req.params.patientId);
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "المريض غير موجود" });
      }

      const branchSession = (req.session as any).branchSession;
      const planData = {
        ...req.body,
        patientId,
        branchId: patient.branchId,
        therapistId: branchSession?.userId || null,
        therapistName: branchSession?.displayName || null,
      };

      const parsed = insertTreatmentPlanSchema.parse(planData);
      const plan = await storage.createTreatmentPlan(parsed);

      if (req.body.injuries) {
        const injuriesJson = req.body.injuries;
        try {
          const injuriesParsed = JSON.parse(injuriesJson);
          if (Array.isArray(injuriesParsed)) {
            const injuryTypeStr = injuriesParsed.map((e: any) => e.type).filter(Boolean).join("، ");
            const injuryAreaStr = injuriesParsed.map((e: any) => e.area).filter(Boolean).join("، ");
            await storage.updatePatient(patientId, {
              injuries: injuriesJson,
              injuryType: injuryTypeStr,
              injuryArea: injuryAreaStr,
            });
          }
        } catch (e) {
          console.error("Failed to sync injuries to patient:", e);
        }
      }

      res.json(plan);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "فشل في إنشاء الخطة العلاجية" });
    }
  });

  app.put("/api/treatment-plans/:id", isAuthenticated, async (req, res) => {
    try {
      const permissions = getPermissions(req);
      if (!permissions.canManageTreatmentPlans) {
        return res.status(403).json({ message: "غير مصرح لك بإدارة الخطط العلاجية" });
      }

      const id = parseInt(req.params.id);
      const plan = await storage.updateTreatmentPlan(id, req.body);

      if (req.body.injuries && plan.patientId) {
        const injuriesJson = req.body.injuries;
        try {
          const injuriesParsed = JSON.parse(injuriesJson);
          if (Array.isArray(injuriesParsed)) {
            const injuryTypeStr = injuriesParsed.map((e: any) => e.type).filter(Boolean).join("، ");
            const injuryAreaStr = injuriesParsed.map((e: any) => e.area).filter(Boolean).join("، ");
            await storage.updatePatient(plan.patientId, {
              injuries: injuriesJson,
              injuryType: injuryTypeStr,
              injuryArea: injuryAreaStr,
            });
          }
        } catch (e) {
          console.error("Failed to sync injuries to patient:", e);
        }
      }

      res.json(plan);
    } catch (err) {
      res.status(500).json({ message: "فشل في تحديث الخطة العلاجية" });
    }
  });

  app.delete("/api/treatment-plans/:id", isAuthenticated, async (req, res) => {
    try {
      const permissions = getPermissions(req);
      if (!permissions.canManageTreatmentPlans) {
        return res.status(403).json({ message: "غير مصرح لك بإدارة الخطط العلاجية" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteTreatmentPlan(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "فشل في حذف الخطة العلاجية" });
    }
  });

  // ======================= SURVEY ROUTES =======================

  app.get("/api/survey-templates", isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getSurveyTemplates();
      res.json(templates);
    } catch (err) {
      res.status(500).json({ message: "فشل في جلب قوالب الاستبيانات" });
    }
  });

  app.get("/api/survey-templates/:id/questions", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const questions = await storage.getSurveyQuestions(id);
      res.json(questions);
    } catch (err) {
      res.status(500).json({ message: "فشل في جلب الأسئلة" });
    }
  });

  app.get("/api/survey-responses", isAuthenticated, async (req, res) => {
    try {
      const branchSession = (req.session as any).branchSession;
      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      const filterBranch = branchSession?.isAdmin ? branchId : branchSession?.branchId;
      const responses = await storage.getSurveyResponses(filterBranch);
      res.json(responses);
    } catch (err) {
      res.status(500).json({ message: "فشل في جلب الاستبيانات" });
    }
  });

  app.get("/api/survey-responses/patient/:patientId", isAuthenticated, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const responses = await storage.getSurveyResponsesByPatient(patientId);
      res.json(responses);
    } catch (err) {
      res.status(500).json({ message: "فشل في جلب استبيانات المريض" });
    }
  });

  app.post("/api/survey-responses", isAuthenticated, async (req, res) => {
    try {
      const permissions = getPermissions(req);
      const branchSession = (req.session as any).branchSession;
      if (!permissions.canManageSurveys && !branchSession?.isAdmin) {
        return res.status(403).json({ message: "غير مصرح لك بإدارة الاستبيانات" });
      }

      const { templateId, patientId, branchId, answers, notes } = req.body;

      const questions = await storage.getSurveyQuestions(templateId);
      let totalScore = 0;
      let maxScore = 0;

      for (const q of questions) {
        if (q.questionType === "rating") {
          maxScore += 10;
          const answer = answers?.find((a: any) => a.questionId === q.id);
          if (answer?.ratingValue) {
            totalScore += answer.ratingValue;
          }
        }
      }

      const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

      const response = await storage.createSurveyResponse({
        templateId,
        patientId,
        branchId,
        surveyorId: branchSession?.userId || null,
        surveyorName: branchSession?.displayName || null,
        totalScore,
        maxScore,
        percentage,
        notes: notes || null,
      });

      if (answers && Array.isArray(answers)) {
        for (const answer of answers) {
          await storage.createSurveyAnswer({
            responseId: response.id,
            questionId: answer.questionId,
            ratingValue: answer.ratingValue || null,
            textValue: answer.textValue || null,
            boolValue: answer.boolValue ?? null,
          });
        }
      }

      res.json(response);
    } catch (err) {
      console.error("Survey submission error:", err);
      res.status(500).json({ message: "فشل في حفظ الاستبيان" });
    }
  });

  app.get("/api/survey-responses/:id/answers", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const answers = await storage.getSurveyAnswers(id);
      res.json(answers);
    } catch (err) {
      res.status(500).json({ message: "فشل في جلب الإجابات" });
    }
  });

  app.get("/api/survey-results", isAuthenticated, async (req, res) => {
    try {
      const branchSession = (req.session as any).branchSession;
      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      const filterBranch = branchSession?.isAdmin ? branchId : branchSession?.branchId;
      const responses = await storage.getSurveyResponses(filterBranch);
      const templates = await storage.getSurveyTemplates();

      const results = templates.map(template => {
        const templateResponses = responses.filter(r => r.templateId === template.id);
        const avgPercentage = templateResponses.length > 0
          ? Math.round(templateResponses.reduce((sum, r) => sum + (r.percentage || 0), 0) / templateResponses.length)
          : 0;
        return {
          templateId: template.id,
          templateName: template.name,
          targetType: template.targetType,
          count: templateResponses.length,
          avgPercentage,
        };
      });

      res.json(results);
    } catch (err) {
      res.status(500).json({ message: "فشل في جلب النتائج" });
    }
  });

  // ======================= SEED DATA =======================

  // Seed initial branches
  const branchesList = await storage.getBranches();
  if (branchesList.length === 0) {
    const bNames = ["بغداد", "كربلاء", "ذي قار", "الموصل", "كركوك"];
    for (const name of bNames) {
      await storage.createBranch({ name, location: name });
    }
  }

  // Seed survey templates
  const existingTemplates = await storage.getSurveyTemplates();
  if (existingTemplates.length === 0) {
    const t1 = await storage.createSurveyTemplate({
      name: "تقييم خدمات الأطراف الصناعية",
      description: "Prosthetics Services Assessment",
      targetType: "prosthetics",
      isActive: true,
    });
    const prosthQ = [
      { order: 1, cat: "comfort", ar: "ما مدى راحتك عند استخدام الطرف الصناعي؟", en: "How comfortable is the prosthetic device?" },
      { order: 2, cat: "comfort", ar: "هل يناسب الطرف الصناعي حجم ووزن جسمك؟", en: "Does the prosthetic fit your body size and weight?" },
      { order: 3, cat: "function", ar: "ما مدى سهولة المشي أو الحركة بالطرف الصناعي؟", en: "How easy is walking/movement with the prosthetic?" },
      { order: 4, cat: "function", ar: "هل يساعدك الطرف الصناعي على أداء أنشطتك اليومية؟", en: "Does the prosthetic help with daily activities?" },
      { order: 5, cat: "appearance", ar: "ما مدى رضاك عن مظهر الطرف الصناعي؟", en: "How satisfied are you with the prosthetic appearance?" },
      { order: 6, cat: "durability", ar: "ما مدى متانة وجودة الطرف الصناعي؟", en: "How durable and high-quality is the prosthetic?" },
      { order: 7, cat: "service", ar: "ما مدى رضاك عن خدمة الفريق الطبي أثناء القياس والتركيب؟", en: "How satisfied are you with the medical team during fitting?" },
      { order: 8, cat: "service", ar: "هل تلقيت تعليمات كافية لاستخدام الطرف الصناعي؟", en: "Did you receive sufficient instructions for prosthetic use?" },
      { order: 9, cat: "pain", ar: "هل قل مستوى الألم بعد استخدام الطرف الصناعي؟", en: "Has pain decreased after using the prosthetic?" },
      { order: 10, cat: "overall", ar: "بشكل عام، ما مدى رضاك عن الخدمة المقدمة؟", en: "Overall, how satisfied are you with the service?" },
    ];
    for (const q of prosthQ) {
      await storage.createSurveyQuestion({ templateId: t1.id, questionText: q.ar, questionTextEn: q.en, questionOrder: q.order, questionType: "rating", category: q.cat });
    }

    const t2 = await storage.createSurveyTemplate({
      name: "تقييم خدمات العلاج الطبيعي",
      description: "Physiotherapy Services Assessment",
      targetType: "physiotherapy",
      isActive: true,
    });
    const physioQ = [
      { order: 1, cat: "treatment", ar: "ما مدى فعالية جلسات العلاج الطبيعي في تحسين حالتك؟", en: "How effective were physiotherapy sessions in improving your condition?" },
      { order: 2, cat: "treatment", ar: "هل شعرت بتحسن ملموس بعد الجلسات؟", en: "Did you feel noticeable improvement after sessions?" },
      { order: 3, cat: "therapist", ar: "ما مدى كفاءة المعالج الطبيعي؟", en: "How competent was the physiotherapist?" },
      { order: 4, cat: "therapist", ar: "هل أوضح لك المعالج خطة العلاج وأهدافها؟", en: "Did the therapist explain the treatment plan and goals?" },
      { order: 5, cat: "communication", ar: "ما مدى تواصل الفريق الطبي معك أثناء العلاج؟", en: "How well did the medical team communicate during treatment?" },
      { order: 6, cat: "equipment", ar: "ما مدى رضاك عن الأجهزة والمعدات المستخدمة؟", en: "How satisfied are you with the equipment used?" },
      { order: 7, cat: "environment", ar: "ما مدى نظافة وتنظيم قاعة العلاج؟", en: "How clean and organized was the treatment room?" },
      { order: 8, cat: "scheduling", ar: "ما مدى ملاءمة مواعيد الجلسات لجدولك؟", en: "How suitable were session timings for your schedule?" },
      { order: 9, cat: "results", ar: "هل تحققت أهداف العلاج المتوقعة؟", en: "Were expected treatment goals achieved?" },
      { order: 10, cat: "overall", ar: "بشكل عام، ما مدى رضاك عن خدمة العلاج الطبيعي؟", en: "Overall, how satisfied are you with the physiotherapy service?" },
    ];
    for (const q of physioQ) {
      await storage.createSurveyQuestion({ templateId: t2.id, questionText: q.ar, questionTextEn: q.en, questionOrder: q.order, questionType: "rating", category: q.cat });
    }

    const t3 = await storage.createSurveyTemplate({
      name: "تقييم عام للفرع",
      description: "General Branch Assessment",
      targetType: "general",
      isActive: true,
    });
    const generalQ = [
      { order: 1, cat: "reception", ar: "ما مدى رضاك عن استقبال الموظفين؟", en: "How satisfied are you with staff reception?" },
      { order: 2, cat: "waiting", ar: "هل كان وقت الانتظار مناسباً؟", en: "Was the waiting time reasonable?" },
      { order: 3, cat: "cleanliness", ar: "ما مدى نظافة المركز؟", en: "How clean was the center?" },
      { order: 4, cat: "facilities", ar: "ما مدى جودة المرافق والتجهيزات؟", en: "How good were the facilities and equipment?" },
      { order: 5, cat: "overall", ar: "هل تنصح الآخرين بمراجعة هذا المركز؟", en: "Would you recommend this center to others?" },
    ];
    for (const q of generalQ) {
      await storage.createSurveyQuestion({ templateId: t3.id, questionText: q.ar, questionTextEn: q.en, questionOrder: q.order, questionType: "rating", category: q.cat });
    }

    console.log("Survey templates seeded successfully");
  }

  // Register accounting v2 routes (chart of accounts, journal, reports, audit)
  registerAccountingV2Routes(app, isAuthenticated);

  // Register session tracking routes (daily device counts + monthly targets)
  registerSessionTrackingRoutes(app, isAuthenticated);

  // Register prosthetic/medical-support manufacturing routes
  registerManufacturingRoutes(app, isAuthenticated);

  // Register doctor medical-examination routes (معاينة الطبيب)
  registerMedicalRoutes(app, isAuthenticated);
  registerMedicalReviewRoutes(app, isAuthenticated);

  // Device episodes (حلقات أجهزة المريض): start a new device on an existing
  // specialty thread, list them, cancel one before manufacturing begins.
  registerDeviceEpisodeRoutes(app, isAuthenticated);

  // متابعةُ ما بعد المعاينة (ترحيل ٠٥٣): قرار المريض، وتعديل السعر
  // باعتماد الطبيب، واعتمادُ الشراء الذي ينادي «تخصيص» نفسها.
  registerFollowupRoutes(app, isAuthenticated);
  //  **المراجعةُ المالية لعملياتِ «بلا معاينة»** (ترحيل ٠٦٧): العمليةُ
  //  تمضي والمالُ ينتظر اعتمادَ طبيبٍ مخوَّل.
  registerPendingChargeRoutes(app, isAuthenticated);
  registerAdminReversalRoutes(app, isAuthenticated);
  registerDiscountRoutes(app, isAuthenticated);
  registerPatientTrashRoutes(app, isAuthenticated);

  // ══ تواصلُ المريض — **صادرٌ فقط، بلا نقطةٍ عامّة واحدة** ═══════════════
  //  لا webhook، ولا تذاكرَ ربط، ولا استهلاك، ولا أوامرَ واردة. الرقمُ
  //  المسجَّل في الملفّ هو الوجهة، والترحيبُ يُستحقّ لحظةَ الحفظ، والعاملُ
  //  الدوريّ يرسل. فما لا يُستقبَل لا يُفتَح له باب.
  //
  //  (وتنبيهاتُ المالك الداخلية في `notifications/telegram.ts` شأنٌ آخر
  //   تماماً ولم تُمَسّ: تلك للإدارة لا للمرضى.)

  return httpServer;
}
