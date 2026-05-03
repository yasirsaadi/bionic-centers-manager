import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sql, eq } from "drizzle-orm";
import { api } from "@shared/routes";
import { z } from "zod";
import { patients, visits, payments, documents, insertCustomStatSchema, insertExpenseSchema, insertInstallmentPlanSchema, insertInvoiceSchema, insertInvoiceItemSchema, insertTreatmentPlanSchema, insertVendorSchema, insertPurchaseSchema, insertAiMemoryNoteSchema } from "@shared/schema";
import type { Patient, Payment } from "@shared/schema";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { registerAccountingV2Routes } from "./accounting/routes";
import { registerSessionTrackingRoutes } from "./sessions_module/routes";
import {
  createJournalForPayment,
  createJournalForExpense,
  createJournalForInvoice,
  createJournalForInvoicePayment,
  createJournalForPurchase,
  createJournalForVendorPayment,
  reverseJournalForSource,
} from "./accounting/auto_journal";
import { isAiEnabled } from "./ai/provider";
import { suggestExpenseCategory } from "./ai/categorize";
import { explainAnomaly } from "./ai/explain_anomaly";
import { aiChat, type ChatMessage } from "./ai/chat";
import { getRuleBasedHints, getAiHints } from "./ai/expense_hints";
import { getOrGenerateMonthlyReport } from "./ai/monthly_report";
import { getOrGenerateSmartAudit } from "./ai/smart_audit";
import { generateSurveyReply } from "./ai/survey_reply";
import { detectAnomalies, type Anomaly } from "./anomalies/detector";
import { logAudit } from "./accounting/ledger";

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
            canManageSettings: grantAll || systemUser.canManageSettings,
            canManageUsers: grantAll || systemUser.canManageUsers,
            canManageTreatmentPlans: grantAll || systemUser.canManageTreatmentPlans,
            canManageSurveys: grantAll || isReception || systemUser.canManageSurveys,
            // Visit permissions: branch_manager always gets both; everyone
            // else uses whatever the admin toggled on their row.
            canEditVisits: grantAll || systemUser.canEditVisits,
            canDeleteVisits: grantAll || systemUser.canDeleteVisits,
            // Sessions module (migration 009): reception auto-grants entry,
            // branch_manager auto-grants all three. Anyone else uses the
            // toggles set on their row.
            canEnterSessions: grantAll || isReception || systemUser.canEnterSessions,
            canManageSessionTargets: grantAll || systemUser.canManageSessionTargets,
            canViewSessionsReport: grantAll || systemUser.canViewSessionsReport,
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
          (req.session as any).branchSession = {
            branchId: 0,
            isAdmin: true,
            shift: "auto",
            permissions: {
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
            }
          };
          return res.json({ 
            branchId: 0, 
            branchName: "مسؤول النظام",
            isAdmin: true,
            role: "admin",
            shift: "auto",
            permissions: {
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
            }
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
      
      if (!userData.username || userData.username.length < 1) {
        return res.status(400).json({ message: "اسم المستخدم مطلوب" });
      }
      
      if (!password || password.length < 4) {
        return res.status(400).json({ message: "كلمة المرور يجب أن تكون 4 أحرف على الأقل" });
      }
      
      if (!userData.role || !["admin", "branch_manager", "accountant", "reception", "therapist", "surveyor"].includes(userData.role)) {
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
        passwordHash
      });
      
      res.json({ ...user, passwordHash: undefined });
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
      
      // Validate role if provided
      if (userData.role && !["admin", "branch_manager", "accountant", "reception", "therapist", "surveyor"].includes(userData.role)) {
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
      
      res.json({ ...user, passwordHash: undefined });
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

    // Batch-fetch visits and payments to avoid N+1 queries
    const [allVisits, allPayments] = await Promise.all([
      storage.getVisitsByPatientIds(patientIds),
      storage.getPaymentsByPatientIds(patientIds),
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
    }));

    res.json(patientsWithRelations);
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

  app.post(api.patients.create.path, isAuthenticated, async (req, res) => {
    try {
      const branchSession = (req.session as any).branchSession;
      
      // Determine branchId: form value > branch session > fallback to 1
      let branchId = req.body.branchId;
      
      // If branchId not provided or is falsy (0), use session branch for non-admins
      if (!branchId && branchSession && !branchSession.isAdmin) {
        branchId = branchSession.branchId;
      }
      
      // Final fallback for admins who didn't select a branch
      if (!branchId || branchId === 0) {
        return res.status(400).json({ message: "يجب اختيار الفرع" });
      }
      
      console.log("Creating patient with branchId:", branchId, "from body:", req.body.branchId, "session:", branchSession?.branchId);
      
      const input = api.patients.create.input.parse({
        ...req.body,
        branchId
      });
      const patient = await storage.createPatient(input);

      // Log to audit_log so this counts toward the receptionist's
      // employee-accuracy stats. Without this, reception staff who
      // create lots of patients show as zero entries on the panel.
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
      throw err;
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
      
      const patient = await storage.updatePatient(id, req.body);
      res.json(patient);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.delete(api.patients.delete.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    const ctx = getUserContext(req);
    const permissions = getPermissions(req);
    const patient = await storage.getPatient(id);
    
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    
    // Check permission to delete patients
    if (!permissions.canDeletePatients) {
      return res.status(403).json({ message: "ليس لديك صلاحية لحذف المرضى" });
    }
    
    const canAccess = ctx.role === 'admin' || !ctx.branchId || patient.branchId === ctx.branchId;
    if (!canAccess) {
      return res.status(403).json({ message: "غير مصرح لك بحذف هذا المريض" });
    }
    
    try {
      await storage.deletePatient(id);
      res.status(204).send();
    } catch (err: any) {
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

  // New Service (add service to existing patient)
  app.post("/api/patients/:id/new-service", isAuthenticated, async (req, res) => {
    try {
      const patientId = Number(req.params.id);
      const { serviceType, serviceCost, initialPayment, notes, branchId, paymentTreatmentType, sessionCount, treatmentEntries } = req.body;
      
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      
      // Update totalCost
      const newTotalCost = (patient.totalCost || 0) + serviceCost;
      await storage.updatePatient(patientId, { totalCost: newTotalCost });
      
      // Service type labels in Arabic
      const serviceLabels: Record<string, string> = {
        maintenance: "صيانة الطرف الصناعي",
        additional_therapy: "جلسات علاج إضافية",
        new_prosthetic: "طرف صناعي جديد",
        adjustment: "تعديل أو ضبط",
        consultation: "استشارة طبية",
        other: "خدمة أخرى",
      };
      
      const serviceLabel = serviceLabels[serviceType] || serviceType;
      const effectiveBranchId = branchId || patient.branchId;
      
      // Create payment records and visit records - either from treatmentEntries or single entry
      if (treatmentEntries && Array.isArray(treatmentEntries)) {
        for (const entry of treatmentEntries) {
          await storage.createVisit({
            patientId,
            branchId: effectiveBranchId,
            treatmentType: entry.treatmentType || null,
            details: "خدمة جديدة",
            notes: `${serviceLabel} - ${entry.treatmentType} (${entry.sessionCount} جلسة) (تكلفة: ${entry.cost.toLocaleString()} د.ع)${notes ? ` - ${notes}` : ""}`,
          });

          if (entry.cost > 0) {
            await storage.createPayment({
              patientId,
              branchId: effectiveBranchId,
              amount: entry.cost,
              notes: `${serviceLabel} - ${entry.treatmentType} (${entry.sessionCount} جلسة)${notes ? ` - ${notes}` : ""}`,
              paymentTreatmentType: entry.treatmentType,
              sessionCount: entry.sessionCount,
            });
          }
        }
      } else {
        await storage.createVisit({
          patientId,
          branchId: effectiveBranchId,
          treatmentType: paymentTreatmentType || null,
          details: "خدمة جديدة",
          notes: `${serviceLabel}${sessionCount ? ` (${sessionCount} جلسة)` : ""} (تكلفة: ${serviceCost.toLocaleString()} د.ع)${notes ? ` - ${notes}` : ""}`,
        });

        if (serviceCost > 0) {
          await storage.createPayment({
            patientId,
            branchId: effectiveBranchId,
            amount: serviceCost,
            notes: `${serviceLabel}${sessionCount ? ` (${sessionCount} جلسة)` : ""}${notes ? ` - ${notes}` : ""}`,
            paymentTreatmentType: paymentTreatmentType || null,
            sessionCount: sessionCount ? Number(sessionCount) : null,
          });
        }
      }
      
      res.json({ success: true, newTotalCost });
    } catch (err) {
      console.error("Error adding new service:", err);
      res.status(500).json({ message: "حدث خطأ أثناء إضافة الخدمة" });
    }
  });

  // Visits
  app.post(api.visits.create.path, isAuthenticated, async (req, res) => {
    const input = api.visits.create.input.parse(req.body);
    
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

    // Track which system user created this visit (if logged in via system user)
    const sessionUserId = branchSession?.userId;
    if (sessionUserId && typeof sessionUserId === 'number') {
      (input as any).createdBy = sessionUserId;
    }

    const visit = await storage.createVisit(input);

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
    });

    if (input.cost && input.cost > 0) {
      const patient = await storage.getPatient(input.patientId);
      if (patient) {
        const newTotalCost = (patient.totalCost || 0) + input.cost;
        await storage.updatePatient(patient.id, { totalCost: newTotalCost });
        
        await storage.createPayment({
          patientId: input.patientId,
          branchId: input.branchId,
          amount: input.cost,
          notes: "دفعة زيارة",
          paymentTreatmentType: input.treatmentType || null,
          sessionCount: input.sessionCount || null,
        });
      }
    }
    
    res.status(201).json(visit);
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
    // Branch isolation for branch_manager: load the visit, ensure it
    // belongs to one of their accessible branches.
    const allowed = accessibleBranchesFor(req);
    if (allowed !== null) {
      const [existing] = await db.select().from(visits).where(eq(visits.id, id));
      if (!existing) return res.status(404).json({ message: "الزيارة غير موجودة" });
      if (!allowed.includes(existing.branchId)) {
        return res.status(403).json({ message: "لا يمكنك تعديل زيارة من فرع آخر" });
      }
    }
    const { details, notes, treatmentType, sessionCount, cost, customDate } = req.body;
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
    res.json(updated);
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
    const allowed = accessibleBranchesFor(req);
    if (allowed !== null) {
      const [existing] = await db.select().from(visits).where(eq(visits.id, id));
      if (!existing) return res.status(404).json({ message: "الزيارة غير موجودة" });
      if (!allowed.includes(existing.branchId)) {
        return res.status(403).json({ message: "لا يمكنك حذف زيارة من فرع آخر" });
      }
    }
    await storage.deleteVisit(id);
    res.status(204).send();
  });

  // Payments
  app.post(api.payments.create.path, isAuthenticated, async (req, res) => {
    const { treatmentEntries, ...bodyWithoutEntries } = req.body;
    const input = api.payments.create.input.parse(bodyWithoutEntries);
    
    // Authorization: Only admin or branch_manager can set isFreeSessions to true
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const isBranchManager = branchSession?.role === "branch_manager";
    const isFreeSessions = (isAdmin || isBranchManager) ? (req.body.isFreeSessions || false) : false;
    
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

    if (treatmentEntries && Array.isArray(treatmentEntries) && treatmentEntries.length > 0) {
      const results = [];
      for (const entry of treatmentEntries) {
        if (entry.cost > 0 || isFreeSessions) {
          const payment = await storage.createPayment({
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
      res.status(201).json(results[0] || { message: "No payments created" });
    } else {
      const payment = await storage.createPayment(input);
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
    const updated = await storage.updatePaymentSessionInfo(id, sessionCount ?? null, paymentTreatmentType ?? null);
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
    const { amount, notes, sessionCount, paymentTreatmentType, customDate, isFreeSessions } = req.body;
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
    const updated = await storage.updatePayment(id, updateData);
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
    const filterBranchId = enforced ?? null;

    const allPatients = await storage.getPatients(enforced);
    const allBranches = await storage.getBranches();
    const branches = enforced !== undefined ? allBranches.filter((b) => b.id === enforced) : allBranches;
    
    // Filter patients by branch if specified
    const filteredPatients = filterBranchId 
      ? allPatients.filter(p => p.branchId === filterBranchId)
      : allPatients;
    
    let totalSold = 0;
    let totalPaid = 0;
    
    // Get branches to check payments
    const branchesToCheck = filterBranchId 
      ? branches.filter(b => b.id === filterBranchId)
      : branches;
    
    for (const branch of branchesToCheck) {
      const branchPayments = await storage.getPaymentsByBranch(branch.id);
      totalPaid += branchPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    }
    
    totalSold = filteredPatients.reduce((acc, p) => acc + (p.totalCost || 0), 0);
    
    res.json({
      revenue: totalPaid,
      sold: totalSold,
      paid: totalPaid,
      remaining: totalSold - totalPaid,
      totalPatients: filteredPatients.length,
      amputees: filteredPatients.filter(p => p.isAmputee).length,
      physiotherapy: filteredPatients.filter(p => p.isPhysiotherapy).length,
      medicalSupport: filteredPatients.filter(p => p.isMedicalSupport).length
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
    const allPatients = await storage.getPatients(allowedBranchId);
    const daily = req.query.daily === "true";
    
    // Get today's date range if daily filter is enabled
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const result: Record<number, { revenue: number; sold: number; paid: number; remaining: number }> = {};
    
    for (const branch of branches) {
      const branchPayments = await storage.getPaymentsByBranch(branch.id);
      
      let filteredPatients = allPatients.filter(p => p.branchId === branch.id);
      let filteredPayments = branchPayments;
      
      if (daily) {
        // Filter patients registered today
        filteredPatients = filteredPatients.filter(p => {
          if (!p.createdAt) return false;
          const createdAt = new Date(p.createdAt);
          return createdAt >= startOfDay && createdAt < endOfDay;
        });
        
        // Get IDs of today's patients
        const todayPatientIds = new Set(filteredPatients.map(p => p.id));
        
        // Filter payments made today FOR today's patients only
        filteredPayments = branchPayments.filter(p => {
          if (!p.date) return false;
          const paymentDate = new Date(p.date);
          const isToday = paymentDate >= startOfDay && paymentDate < endOfDay;
          const isForTodayPatient = todayPatientIds.has(p.patientId);
          return isToday && isForTodayPatient;
        });
      }
      
      const sold = filteredPatients.reduce((acc, p) => acc + (p.totalCost || 0), 0);
      const paid = filteredPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
      
      result[branch.id] = {
        revenue: paid,
        sold,
        paid,
        remaining: sold - paid
      };
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
    const patients = await storage.getPatients(branchId);
    const payments = await storage.getPaymentsByBranch(branchId);
    const visits = await storage.getVisitsByBranch(branchId);
    
    // Create patient lookup map
    const patientMap = new Map(patients.map((p: Patient) => [p.id, p]));
    
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
    
    // Group payments by date (YYYY-MM-DD)
    const paymentsByDate: Record<string, PaymentDetail[]> = {};
    
    // Group patients by registration date (for showing new patients)
    const patientsByDate: Record<string, PatientDetail[]> = {};
    
    // Helper function to get local date key (YYYY-MM-DD)
    const getLocalDateKey = (date: Date | string | null): string => {
      if (!date) return 'unknown';
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    // Process payments
    for (const payment of payments) {
      const patient = patientMap.get(payment.patientId);
      const dateKey = getLocalDateKey(payment.date);
      
      if (!paymentsByDate[dateKey]) {
        paymentsByDate[dateKey] = [];
      }
      
      paymentsByDate[dateKey].push({
        id: payment.id,
        patientId: payment.patientId,
        patientName: patient?.name || 'غير معروف',
        amount: payment.amount,
        notes: payment.notes,
        date: payment.date?.toString() || '',
        patientTotalCost: patient?.totalCost || 0,
        paymentTreatmentType: payment.paymentTreatmentType || null,
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
    
    // Get all unique dates and sort (newest first)
    const paymentDates = Object.keys(paymentsByDate);
    const patientDates = Object.keys(patientsByDate);
    const allDatesSet = new Set([...paymentDates, ...patientDates]);
    const allDates = Array.from(allDatesSet).filter(d => d !== 'unknown').sort((a, b) => b.localeCompare(a));
    
    // Calculate daily summaries
    const dailySummaries = allDates.map(date => {
      const dayPayments = paymentsByDate[date] || [];
      const dayPatients = patientsByDate[date] || [];
      
      return {
        date,
        payments: dayPayments.sort((a: PaymentDetail, b: PaymentDetail) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
        patients: dayPatients,
        totalPaid: dayPayments.reduce((acc: number, p: PaymentDetail) => acc + p.amount, 0),
        totalCosts: dayPatients.reduce((acc: number, p: PatientDetail) => acc + p.totalCost, 0),
        patientCount: dayPatients.length,
        paymentCount: dayPayments.length
      };
    });
    
    // Calculate overall totals
    const overallTotalCost = patients.reduce((acc: number, p: Patient) => acc + (p.totalCost || 0), 0);
    const overallTotalPaid = payments.reduce((acc: number, p: Payment) => acc + p.amount, 0);
    
    res.json({
      branchId,
      dailySummaries,
      overall: {
        totalCost: overallTotalCost,
        totalPaid: overallTotalPaid,
        remaining: overallTotalCost - overallTotalPaid,
        totalPatients: patients.length,
        totalPayments: payments.length
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
          `)
        : await db.execute(sql`
            SELECT 
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE is_amputee = true) as amputees,
              COUNT(*) FILTER (WHERE is_physiotherapy = true) as physiotherapy,
              COUNT(*) FILTER (WHERE is_medical_support = true) as medical_support
            FROM patients 
            WHERE created_at >= ${startTs}::timestamp AND created_at < ${endTs}::timestamp
          `);
      const newStats = newPatientsResult.rows[0] || { total: 0, amputees: 0, physiotherapy: 0, medical_support: 0 };
      
      const visitsResult = filterBranchId
        ? await db.execute(sql`
            SELECT COUNT(*) as total_visits, COUNT(DISTINCT patient_id) as unique_patients
            FROM visits 
            WHERE visit_date >= ${startTs}::timestamp AND visit_date < ${endTs}::timestamp AND branch_id = ${filterBranchId}
          `)
        : await db.execute(sql`
            SELECT COUNT(*) as total_visits, COUNT(DISTINCT patient_id) as unique_patients
            FROM visits 
            WHERE visit_date >= ${startTs}::timestamp AND visit_date < ${endTs}::timestamp
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
            WHERE v.visit_date >= ${startTs}::timestamp AND v.visit_date < ${endTs}::timestamp AND v.branch_id = ${filterBranchId}
          `)
        : await db.execute(sql`
            SELECT 
              COUNT(DISTINCT v.patient_id) as visiting_patients,
              COUNT(DISTINCT v.patient_id) FILTER (WHERE p.is_amputee = true) as visiting_amputees,
              COUNT(DISTINCT v.patient_id) FILTER (WHERE p.is_physiotherapy = true) as visiting_physiotherapy,
              COUNT(DISTINCT v.patient_id) FILTER (WHERE p.is_medical_support = true) as visiting_medical_support
            FROM visits v
            JOIN patients p ON v.patient_id = p.id
            WHERE v.visit_date >= ${startTs}::timestamp AND v.visit_date < ${endTs}::timestamp
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

      res.json(rows);
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
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;

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

  app.get("/api/expenses/:id", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;

    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للمصروفات" });
    }

    const id = parseInt(req.params.id);
    const expense = await storage.getExpense(id);
    if (!expense) {
      return res.status(404).json({ error: "المصروف غير موجود" });
    }
    res.json(expense);
  });

  app.post("/api/expenses", isAuthenticated, async (req: any, res) => {
    try {
      const branchSession = (req.session as any).branchSession;
      const isAdmin = branchSession?.isAdmin;
      const canAdd = isAdmin || branchSession?.permissions?.canManageAccounting;
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
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;
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
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;

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
      const { items, applyPriorCredit, ...invoiceData } = req.body;
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

      const invoice = await storage.createInvoice(invoiceData);

      // Add invoice items
      const createdItems = [];
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const created = await storage.createInvoiceItem({
            ...item,
            invoiceId: invoice.id,
          });
          createdItems.push(created);
        }
      }

      // Auto-apply prior credit. Many patients pay session-by-session
      // (recorded in the payments table) BEFORE we issue them an
      // invoice. Without this step, the new invoice would show
      // paidAmount = 0 even though they've effectively paid most or
      // all of it. We compute the unallocated credit and apply it as
      // paidAmount automatically.
      //
      //   credit = sum(payments) - sum(paidAmount on patient's other invoices)
      //   applied = min(credit, invoice.total)
      //
      // Note: the original session payments already created their own
      // Cr Revenue / Dr Cash journal entries. Issuing this invoice now
      // creates Dr AR / Cr Revenue for the full total. That double-
      // counts revenue when prior credit applies. Accepting this for
      // now — the alternative is a full deposit/customer-credit
      // refactor of the accounting model. We mirror the existing
      // user practice of writing both session payments and invoices.
      let creditApplied = 0;
      if (shouldApplyCredit && invoice.patientId) {
        const [allPayments, allInvoicesForPatient] = await Promise.all([
          storage.getPaymentsByPatientId(invoice.patientId),
          storage.getInvoices(undefined, undefined, invoice.patientId),
        ]);
        const sessionPaid = allPayments.reduce((s, p) => s + p.amount, 0);
        const otherInvoicesPaid = allInvoicesForPatient
          .filter((i) => i.id !== invoice.id)
          .reduce((s, i) => s + (i.paidAmount || 0), 0);
        const availableCredit = Math.max(0, sessionPaid - otherInvoicesPaid);
        creditApplied = Math.min(availableCredit, invoice.total);
        if (creditApplied > 0) {
          const newStatus = creditApplied >= invoice.total ? "paid" : "partial";
          await storage.updateInvoice(invoice.id, {
            paidAmount: creditApplied,
            status: newStatus,
          });
          invoice.paidAmount = creditApplied;
          invoice.status = newStatus;
        }
      }

      // Auto-journal: Dr AR / Cr Revenue (safe to fail, logged)
      await createJournalForInvoice(invoice, createdItems, userId);

      // Audit log on invoice create.
      await logAudit({
        entityType: "invoice",
        entityId: invoice.id,
        action: "create",
        userId,
        userName: branchSession?.displayName ?? null,
        branchId: invoice.branchId,
        newValues: { total: invoice.total, patientId: invoice.patientId, itemCount: createdItems.length, creditApplied },
      });

      res.json({ ...invoice, creditApplied });
    } catch (err: any) {
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
      const existing = await storage.getInvoiceById(id);
      // Branch isolation for branch_manager.
      if (!isAdmin && branchSession?.branchId && existing && existing.branchId !== branchSession.branchId) {
        return res.status(403).json({ error: "لا يمكنك حذف فاتورة من فرع آخر" });
      }
      // Reverse related journal entries first (safe to fail, logged)
      await reverseJournalForSource("invoice", id, userId, "حذف الفاتورة");
      await reverseJournalForSource("invoice_payment", id, userId, "حذف الفاتورة");

      // Delete items first, then invoice
      await storage.deleteInvoiceItems(id);
      await storage.deleteInvoice(id);
      await logAudit({
        entityType: "invoice",
        entityId: id,
        action: "delete",
        userId,
        userName: branchSession?.displayName ?? null,
        branchId: existing?.branchId ?? null,
        oldValues: existing ? { total: existing.total } : null,
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Record payment for invoice — admin or accountant (canManageAccounting)
  app.post("/api/invoices/:id/payment", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canRecord = isAdmin || branchSession?.permissions?.canManageAccounting;
    const userId = branchSession?.userId ?? null;

    if (!canRecord) {
      return res.status(403).json({ error: "غير مصرح لك بتسجيل المدفوعات" });
    }

    const id = parseInt(req.params.id);
    const { amount } = req.body;

    try {
      const invoice = await storage.getInvoiceById(id);
      if (!invoice) {
        return res.status(404).json({ error: "الفاتورة غير موجودة" });
      }

      const paymentAmount = Number(amount) || 0;
      if (paymentAmount <= 0) {
        return res.status(400).json({ error: "مبلغ الدفعة يجب أن يكون أكبر من صفر" });
      }

      const newPaidAmount = (invoice.paidAmount || 0) + paymentAmount;
      let newStatus = 'partial';

      if (newPaidAmount >= invoice.total) {
        newStatus = 'paid';
      } else if (newPaidAmount === 0) {
        newStatus = 'pending';
      }

      const updated = await storage.updateInvoice(id, {
        paidAmount: newPaidAmount,
        status: newStatus
      });

      // Auto-journal: Dr Cash / Cr AR (safe to fail, logged)
      await createJournalForInvoicePayment(invoice, paymentAmount, userId);

      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
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

  // Conversational assistant. Takes the user's message history and returns
  // an Arabic answer grounded in a fresh financial snapshot of the
  // requester's branch (or all branches when admin). Snapshot is built
  // server-side — clients never see raw financial data unless it surfaces
  // through the assistant's reply.
  app.post("/api/ai/chat", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const canAccess = isAdmin || branchSession?.permissions?.canManageAccounting;
    if (!canAccess) {
      return res.status(403).json({ error: "غير مصرح لك باستخدام المساعد الذكي" });
    }

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

    // Branch isolation: non-admins are pinned to their own branch.
    const branchId = enforceBranchAccess(req);
    let branchName: string | null = null;
    if (branchId) {
      const branches = await storage.getBranches();
      branchName = branches.find((b) => b.id === branchId)?.name ?? null;
    }

    const result = await aiChat({ branchId: branchId ?? null, branchName }, history);
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
    const days = Math.max(7, Math.min(180, Number(req.query.days) || 30));
    const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;

    const today = new Date();
    const start = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    const iso = (d: Date) => d.toISOString().split("T")[0];

    const rows = await storage.getEmployeeAccuracy({
      branchId,
      startDate: iso(start),
      endDate: iso(today),
    });

    // Sort by score descending — highest performers first.
    const sorted = rows
      .map((r) => ({
        ...r,
        totalEntries: r.expenseCount + r.invoiceCount + r.purchaseCount,
      }))
      .sort((a, b) => b.score - a.score);

    res.json({ days, rows: sorted });
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

  return httpServer;
}
