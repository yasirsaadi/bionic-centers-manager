import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import type { Patient, Payment } from "@shared/schema";
import { insertCustomStatSchema, insertExpenseSchema, insertInstallmentPlanSchema, insertInvoiceSchema, insertInvoiceItemSchema } from "@shared/schema";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

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
    const user = req.user as any;
    return {
      userId: user?.claims?.sub,
      role: user?.role || 'staff',
      branchId: user?.branchId
    };
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
    };
    
    // Default branch staff permissions
    const branchPermissions = {
      canViewPatients: true,
      canAddPatients: true,
      canEditPatients: true,
      canDeletePatients: false,
      canViewPayments: true,
      canAddPayments: true,
      canEditPayments: true,
      canDeletePayments: false,
      canViewReports: true,
      canManageAccounting: false,
      canManageSettings: false,
      canManageUsers: false,
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
  app.post("/api/verify-branch", isAuthenticated, async (req, res) => {
    try {
      const parsed = verifyBranchSchema.parse(req.body);
      const { branchKey, username, password } = parsed;
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
          const userBranchId = isAdmin ? 0 : (systemUser.branchId || 0);
          
          // For non-admin users, verify the selected branch matches their assigned branch
          if (!isAdmin && systemUser.branchId) {
            const branchMapping = usernameToBranch[normalizedBranchKey];
            if (branchMapping && branchMapping.branchId !== "admin" && branchMapping.branchId !== systemUser.branchId) {
              return res.status(401).json({ message: "لا يمكنك الدخول إلى هذا الفرع" });
            }
          }
          
          // Get branch name
          let branchName = "مسؤول النظام";
          if (!isAdmin && systemUser.branchId) {
            const branch = await storage.getBranch(systemUser.branchId);
            branchName = branch?.name || "فرع غير معروف";
          }
          
          // Store session with user permissions
          (req.session as any).branchSession = {
            branchId: userBranchId,
            isAdmin: isAdmin,
            userId: systemUser.id,
            role: systemUser.role,
            displayName: systemUser.displayName,
            permissions: {
              canViewPatients: systemUser.canViewPatients,
              canAddPatients: systemUser.canAddPatients,
              canEditPatients: systemUser.canEditPatients,
              canDeletePatients: systemUser.canDeletePatients,
              canViewPayments: systemUser.canViewPayments,
              canAddPayments: systemUser.canAddPayments,
              canEditPayments: systemUser.canEditPayments,
              canDeletePayments: systemUser.canDeletePayments,
              canViewReports: systemUser.canViewReports,
              canManageAccounting: systemUser.canManageAccounting,
              canManageSettings: systemUser.canManageSettings,
              canManageUsers: systemUser.canManageUsers,
            }
          };
          
          console.log("System user authenticated:", { username: normalizedUsername, role: systemUser.role, branchId: userBranchId });
          
          return res.json({ 
            branchId: userBranchId, 
            branchName: branchName,
            isAdmin: isAdmin,
            userId: systemUser.id,
            displayName: systemUser.displayName,
            role: systemUser.role,
            permissions: {
              canViewPatients: systemUser.canViewPatients,
              canAddPatients: systemUser.canAddPatients,
              canEditPatients: systemUser.canEditPatients,
              canDeletePatients: systemUser.canDeletePatients,
              canViewPayments: systemUser.canViewPayments,
              canAddPayments: systemUser.canAddPayments,
              canEditPayments: systemUser.canEditPayments,
              canDeletePayments: systemUser.canDeletePayments,
              canViewReports: systemUser.canViewReports,
              canManageAccounting: systemUser.canManageAccounting,
              canManageSettings: systemUser.canManageSettings,
              canManageUsers: systemUser.canManageUsers,
            }
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
            }
          };
          return res.json({ 
            branchId: 0, 
            branchName: "مسؤول النظام",
            isAdmin: true,
            role: "admin",
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
            }
          });
        }
        return res.status(401).json({ message: "كلمة سر المسؤول غير صحيحة" });
      }
      
      // Check database first for branch password (may be hashed), fall back to environment variable
      const numericBranchId = branchId as number;
      const dbBranchPassword = await storage.getBranchPassword(numericBranchId);
      const envKey = `BRANCH_PASSWORD_${numericBranchId}`;
      const envBranchPassword = process.env[envKey]?.trim();
      
      console.log("Checking branch password:", { 
        branchId, 
        dbExists: !!dbBranchPassword,
        envExists: !!envBranchPassword
      });
      
      if (!dbBranchPassword && !envBranchPassword) {
        return res.status(500).json({ message: "لم يتم تعيين كلمة سر لهذا الفرع" });
      }
      
      let isValidBranchPassword = false;
      let needsBranchMigration = false;
      
      if (dbBranchPassword) {
        // Check if it's a bcrypt hash (starts with $2)
        if (dbBranchPassword.startsWith('$2')) {
          isValidBranchPassword = await bcrypt.compare(trimmedInput, dbBranchPassword);
        } else {
          // Legacy plaintext comparison
          isValidBranchPassword = trimmedInput === dbBranchPassword;
          needsBranchMigration = isValidBranchPassword;
        }
      } else if (envBranchPassword) {
        // Fall back to environment variable (plaintext)
        isValidBranchPassword = trimmedInput === envBranchPassword;
        needsBranchMigration = isValidBranchPassword;
      }
      
      if (isValidBranchPassword) {
        // Auto-migrate: hash plaintext password on successful login
        if (needsBranchMigration) {
          const hashedPassword = await bcrypt.hash(trimmedInput, 10);
          await storage.setBranchPassword(numericBranchId, hashedPassword);
        }
        // Store branch session info (legacy - limited permissions for branch staff)
        (req.session as any).branchSession = {
          branchId: numericBranchId,
          isAdmin: false,
          permissions: {
            canViewPatients: true,
            canAddPatients: true,
            canEditPatients: true,
            canDeletePatients: false,
            canViewPayments: true,
            canAddPayments: true,
            canEditPayments: true,
            canDeletePayments: false,
            canViewReports: true,
            canManageAccounting: false,
            canManageSettings: false,
            canManageUsers: false,
          }
        };
        return res.json({ 
          branchId: numericBranchId, 
          branchName: branchName,
          isAdmin: false,
          role: "branch_staff",
          permissions: {
            canViewPatients: true,
            canAddPatients: true,
            canEditPatients: true,
            canDeletePatients: false,
            canViewPayments: true,
            canAddPayments: true,
            canEditPayments: true,
            canDeletePayments: false,
            canViewReports: true,
            canManageAccounting: false,
            canManageSettings: false,
            canManageUsers: false,
          }
        });
      }
      
      res.status(401).json({ message: "كلمة السر غير صحيحة" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
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
    
    // Build a map of branch passwords with branch names
    const branchPasswordsWithNames = branches.map(branch => {
      const pw = branchPasswords.find(bp => bp.branchId === branch.id);
      return {
        branchId: branch.id,
        branchName: branch.name,
        hasPassword: !!pw,
        // Don't send actual password, just indicate if it exists
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
        const hasPassword = allPasswords.some(p => p.branchId === branch.id);
        const patientCount = await storage.getBranchPatientCount(branch.id);
        
        return {
          ...branch,
          patientCount,
          hasPassword,
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
      
      if (!userData.role || !["admin", "branch_manager", "reception"].includes(userData.role)) {
        return res.status(400).json({ message: "الدور غير صالح" });
      }
      
      // Non-admin users require a branch
      if (userData.role !== "admin" && !userData.branchId) {
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
      if (userData.role && !["admin", "branch_manager", "reception"].includes(userData.role)) {
        return res.status(400).json({ message: "الدور غير صالح" });
      }
      
      // Non-admin users require a branch
      if (userData.role && userData.role !== "admin" && !userData.branchId) {
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
    
    // Include visits and payments for each patient to support filtering and statistics
    const patientsWithRelations = await Promise.all(
      patients.map(async (patient) => {
        const [visits, payments] = await Promise.all([
          storage.getVisitsByPatientId(patient.id),
          storage.getPaymentsByPatientId(patient.id)
        ]);
        return { ...patient, visits, payments };
      })
    );
    
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
      res.status(201).json(patient);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error("Error creating patient:", err);
      throw err;
    }
  });

  app.post(api.patients.transfer.path, isAuthenticated, async (req, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) {
      return res.status(403).json({ message: "فقط المدير يمكنه نقل المرضى" });
    }
    
    const id = Number(req.params.id);
    const { branchId } = api.patients.transfer.input.parse(req.body);
    
    // Transfer patient with all related records (visits, payments)
    const patient = await storage.transferPatientToBranch(id, branchId);
    if (!patient) {
      return res.status(404).json({ message: "المريض غير موجود" });
    }
    res.json(patient);
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
    
    await storage.deletePatient(id);
    res.status(204).send();
  });

  // New Service (add service to existing patient)
  app.post("/api/patients/:id/new-service", isAuthenticated, async (req, res) => {
    try {
      const patientId = Number(req.params.id);
      const { serviceType, serviceCost, initialPayment, notes, branchId, paymentTreatmentType, sessionCount } = req.body;
      
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
      
      // Create a visit record
      await storage.createVisit({
        patientId,
        branchId: branchId || patient.branchId,
        notes: `خدمة جديدة: ${serviceLabel}${notes ? ` - ${notes}` : ""}${sessionCount ? ` (${sessionCount} جلسة)` : ""} (تكلفة: ${serviceCost.toLocaleString()} د.ع)`,
      });
      
      // Create initial payment if provided
      if (initialPayment > 0) {
        await storage.createPayment({
          patientId,
          branchId: branchId || patient.branchId,
          amount: initialPayment,
          notes: `دفعة أولية - ${serviceLabel}`,
          paymentTreatmentType: paymentTreatmentType || null,
          sessionCount: sessionCount ? Number(sessionCount) : null,
        });
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
    const visit = await storage.createVisit(input);
    res.status(201).json(visit);
  });

  // Update visit (all users can edit)
  app.patch("/api/visits/:id", isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    const { details, notes } = req.body;
    const updated = await storage.updateVisit(id, { details, notes });
    res.json(updated);
  });

  // Delete visit (admin only)
  app.delete("/api/visits/:id", isAuthenticated, async (req, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) {
      return res.status(403).json({ message: "فقط المسؤول يمكنه حذف الزيارات" });
    }
    
    const id = Number(req.params.id);
    await storage.deleteVisit(id);
    res.status(204).send();
  });

  // Payments
  app.post(api.payments.create.path, isAuthenticated, async (req, res) => {
    const input = api.payments.create.input.parse(req.body);
    const payment = await storage.createPayment(input);
    res.status(201).json(payment);
  });

  // Delete payment
  app.delete("/api/payments/:id", isAuthenticated, async (req, res) => {
    const permissions = getPermissions(req);
    if (!permissions.canDeletePayments) {
      return res.status(403).json({ message: "ليس لديك صلاحية لحذف المدفوعات" });
    }
    
    const id = Number(req.params.id);
    await storage.deletePayment(id);
    res.status(204).send();
  });

  // Update payment session info (admin only)
  app.patch("/api/payments/:id/session-info", isAuthenticated, async (req, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) {
      return res.status(403).json({ message: "مسؤول النظام فقط يمكنه تعديل بيانات الجلسات" });
    }
    const id = Number(req.params.id);
    const { sessionCount, paymentTreatmentType } = req.body;
    const updated = await storage.updatePaymentSessionInfo(id, sessionCount ?? null, paymentTreatmentType ?? null);
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

  // Delete document (admin only)
  app.delete(api.documents.delete.path, isAuthenticated, async (req, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) {
      return res.status(403).json({ message: "فقط المسؤول يمكنه حذف المستندات" });
    }
    
    const id = Number(req.params.id);
    await storage.deleteDocument(id);
    res.status(204).send();
  });

  // Daily Report for specific branch
  app.get(api.reports.daily.path, isAuthenticated, async (req, res) => {
    const branchId = Number(req.params.branchId);
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
    const branchIdParam = req.query.branchId as string | undefined;
    const filterBranchId = branchIdParam ? parseInt(branchIdParam) : null;
    
    const allPatients = await storage.getPatients();
    const branches = await storage.getBranches();
    
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

  // All branches revenues endpoint (supports daily filter)
  app.get("/api/reports/all-branches", isAuthenticated, async (req, res) => {
    const branches = await storage.getBranches();
    const allPatients = await storage.getPatients();
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

  // Detailed financial report by branch with transactions grouped by date
  app.get("/api/reports/detailed/:branchId", isAuthenticated, async (req, res) => {
    const branchId = parseInt(req.params.branchId);
    const patients = await storage.getPatients(branchId);
    const payments = await storage.getPaymentsByBranch(branchId);
    const visits = await storage.getVisitsByBranch(branchId);
    
    // Create patient lookup map
    const patientMap = new Map(patients.map((p: Patient) => [p.id, p]));
    
    // Create a map of patient ID to their first/latest visit details
    const patientVisitMap = new Map<number, string>();
    for (const visit of visits) {
      // Get the first visit (earliest) for each patient to show as visit reason
      if (!patientVisitMap.has(visit.patientId) && visit.details) {
        patientVisitMap.set(visit.patientId, visit.details);
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
        patientTotalCost: patient?.totalCost || 0
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

  // Daily statistics endpoint - supports branchId filter
  app.get("/api/reports/daily", isAuthenticated, async (req, res) => {
    const branchIdParam = req.query.branchId as string | undefined;
    const filterBranchId = branchIdParam ? parseInt(branchIdParam) : null;
    
    const allPatients = await storage.getPatients();
    const branches = await storage.getBranches();
    
    // Filter patients by branch if specified
    const filteredPatients = filterBranchId 
      ? allPatients.filter(p => p.branchId === filterBranchId)
      : allPatients;
    
    // Get today's date range (start of day to end of day)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    // Filter patients registered today
    const todayPatients = filteredPatients.filter(p => {
      if (!p.createdAt) return false;
      const createdAt = new Date(p.createdAt);
      return createdAt >= startOfDay && createdAt < endOfDay;
    });
    
    // Get branches to check payments
    const branchesToCheck = filterBranchId 
      ? branches.filter(b => b.id === filterBranchId)
      : branches;
    
    // Get today's payments
    let todayPaid = 0;
    for (const branch of branchesToCheck) {
      const branchPayments = await storage.getPaymentsByBranch(branch.id);
      const todayBranchPayments = branchPayments.filter(p => {
        if (!p.date) return false;
        const paymentDate = new Date(p.date);
        return paymentDate >= startOfDay && paymentDate < endOfDay;
      });
      todayPaid += todayBranchPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    }
    
    res.json({
      date: startOfDay.toISOString(),
      totalPatients: todayPatients.length,
      amputees: todayPatients.filter(p => p.isAmputee).length,
      physiotherapy: todayPatients.filter(p => p.isPhysiotherapy).length,
      medicalSupport: todayPatients.filter(p => p.isMedicalSupport).length,
      paid: todayPaid
    });
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

  // Expenses CRUD - Admin only
  app.get("/api/expenses", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    
    if (!isAdmin) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للمصروفات" });
    }
    
    const { branchId, startDate, endDate } = req.query;
    const expenses = await storage.getExpenses(
      branchId ? parseInt(branchId) : undefined,
      startDate as string,
      endDate as string
    );
    res.json(expenses);
  });

  app.get("/api/expenses/:id", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    
    if (!isAdmin) {
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
      const user = req.user;
      
      if (!isAdmin) {
        return res.status(403).json({ error: "غير مصرح لك بإضافة مصروفات" });
      }
      
      const data = insertExpenseSchema.parse({
        ...req.body,
        createdBy: user?.claims?.sub || "unknown"
      });
      
      const expense = await storage.createExpense(data);
      res.json(expense);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "خطأ في إنشاء المصروف" });
    }
  });

  app.put("/api/expenses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const branchSession = (req.session as any).branchSession;
      const isAdmin = branchSession?.isAdmin;
      
      if (!isAdmin) {
        return res.status(403).json({ error: "غير مصرح لك بتعديل المصروفات" });
      }
      
      const id = parseInt(req.params.id);
      const existingExpense = await storage.getExpense(id);
      if (!existingExpense) {
        return res.status(404).json({ error: "المصروف غير موجود" });
      }
      
      const expense = await storage.updateExpense(id, req.body);
      res.json(expense);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "خطأ في تحديث المصروف" });
    }
  });

  app.delete("/api/expenses/:id", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    
    if (!isAdmin) {
      return res.status(403).json({ error: "غير مصرح لك بحذف المصروفات" });
    }
    
    const id = parseInt(req.params.id);
    const existingExpense = await storage.getExpense(id);
    if (!existingExpense) {
      return res.status(404).json({ error: "المصروف غير موجود" });
    }
    
    await storage.deleteExpense(id);
    res.json({ success: true });
  });

  app.get("/api/expenses/by-category/summary", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    
    if (!isAdmin) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للمصروفات" });
    }
    
    const { branchId, startDate, endDate } = req.query;
    const summary = await storage.getExpensesByCategory(
      branchId ? parseInt(branchId) : undefined,
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

  // Revenue by Treatment Type
  app.get("/api/statistics/revenue-by-treatment", isAuthenticated, async (req: any, res) => {
    try {
      const { branchId } = req.query;
      const allPayments = await storage.getAllPayments(
        branchId ? parseInt(branchId as string) : undefined
      );

      const treatmentMap: Record<string, { totalAmount: number; count: number }> = {};

      for (const payment of allPayments) {
        const treatmentType = payment.paymentTreatmentType;
        if (!treatmentType) {
          if (!treatmentMap["غير محدد"]) {
            treatmentMap["غير محدد"] = { totalAmount: 0, count: 0 };
          }
          treatmentMap["غير محدد"].totalAmount += payment.amount;
          treatmentMap["غير محدد"].count += 1;
        } else {
          const types = treatmentType.split(",").map((t: string) => t.trim()).filter(Boolean);
          for (const type of types) {
            if (!treatmentMap[type]) {
              treatmentMap[type] = { totalAmount: 0, count: 0 };
            }
            treatmentMap[type].totalAmount += payment.amount;
            treatmentMap[type].count += 1;
          }
        }
      }

      const result = Object.entries(treatmentMap).map(([treatmentType, data]) => ({
        treatmentType,
        totalAmount: data.totalAmount,
        count: data.count,
      }));

      res.json(result);
    } catch (error) {
      console.error("Error fetching revenue by treatment:", error);
      res.status(500).json({ error: "خطأ في جلب البيانات" });
    }
  });

  // Accounting Summary - Admin only
  app.get("/api/accounting/summary", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    
    if (!isAdmin) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للتقارير المحاسبية" });
    }
    
    const { branchId, startDate, endDate } = req.query;
    console.log("[DEBUG] Accounting summary request:", { branchId, startDate, endDate });
    const summary = await storage.getAccountingSummary(
      branchId ? parseInt(branchId) : undefined,
      startDate as string,
      endDate as string
    );
    console.log("[DEBUG] Accounting summary result:", summary);
    res.json(summary);
  });

  // Get all payments for accounting
  app.get("/api/accounting/payments", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    
    if (!isAdmin) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للتقارير المحاسبية" });
    }
    
    const { branchId, startDate, endDate } = req.query;
    const payments = await storage.getAllPayments(
      branchId ? parseInt(branchId) : undefined,
      startDate as string,
      endDate as string
    );
    res.json(payments);
  });

  // Get all visits for accounting
  app.get("/api/accounting/visits", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    
    if (!isAdmin) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للتقارير المحاسبية" });
    }
    
    const { branchId, startDate, endDate } = req.query;
    const visits = await storage.getAllVisits(
      branchId ? parseInt(branchId) : undefined,
      startDate as string,
      endDate as string
    );
    res.json(visits);
  });

  // Debtors report - patients with outstanding balances
  app.get("/api/accounting/debtors", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    
    if (!isAdmin) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول لتقرير المديونيات" });
    }
    
    const { branchId, minAmount } = req.query;
    
    // Get all patients
    let patients = await storage.getPatients(branchId ? parseInt(branchId) : undefined);
    
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
    
    if (!isAdmin) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للتقارير المحاسبية" });
    }
    
    const { branchId, months = 12 } = req.query;
    const numMonths = parseInt(months as string);
    
    const trends = [];
    const now = new Date();
    
    for (let i = numMonths - 1; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];
      
      const summary = await storage.getAccountingSummary(
        branchId ? parseInt(branchId) : undefined,
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
    
    if (!isAdmin) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للتقارير المحاسبية" });
    }
    
    const { branchId } = req.query;
    const patients = await storage.getPatients(branchId ? parseInt(branchId) : undefined);
    
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
    
    if (!isAdmin) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للتقارير المحاسبية" });
    }
    
    const { startDate, endDate } = req.query;
    const branches = await storage.getBranches();
    
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
    
    const { branchId, status, patientId, startDate, endDate } = req.query;
    
    let filterBranchId = branchId ? parseInt(branchId) : undefined;
    if (!isAdmin && branchSession?.branchId) {
      filterBranchId = branchSession.branchId;
    }
    
    const invoices = await storage.getInvoices(filterBranchId, status as string, patientId ? parseInt(patientId) : undefined, startDate as string, endDate as string);
    res.json(invoices);
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

  // Create invoice (admin-only)
  app.post("/api/invoices", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    const user = req.user;
    
    if (!isAdmin) {
      return res.status(403).json({ error: "غير مصرح لك بإنشاء الفواتير" });
    }
    
    try {
      const { items, ...invoiceData } = req.body;
      
      // Generate invoice number if not provided
      if (!invoiceData.invoiceNumber) {
        invoiceData.invoiceNumber = await storage.getNextInvoiceNumber();
      }
      
      invoiceData.createdBy = user?.claims?.sub;
      
      const invoice = await storage.createInvoice(invoiceData);
      
      // Add invoice items
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await storage.createInvoiceItem({
            ...item,
            invoiceId: invoice.id
          });
        }
      }
      
      res.json(invoice);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update invoice (admin-only)
  app.patch("/api/invoices/:id", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    
    if (!isAdmin) {
      return res.status(403).json({ error: "غير مصرح لك بتعديل الفواتير" });
    }
    
    const id = parseInt(req.params.id);
    try {
      const { items, ...invoiceData } = req.body;
      
      const invoice = await storage.updateInvoice(id, invoiceData);
      
      // Update items if provided
      if (items && Array.isArray(items)) {
        // Delete existing items and recreate
        await storage.deleteInvoiceItems(id);
        for (const item of items) {
          await storage.createInvoiceItem({
            ...item,
            invoiceId: id
          });
        }
      }
      
      res.json(invoice);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Delete invoice (admin-only)
  app.delete("/api/invoices/:id", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    
    if (!isAdmin) {
      return res.status(403).json({ error: "غير مصرح لك بحذف الفواتير" });
    }
    
    const id = parseInt(req.params.id);
    try {
      // Delete items first, then invoice
      await storage.deleteInvoiceItems(id);
      await storage.deleteInvoice(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Record payment for invoice (admin-only)
  app.post("/api/invoices/:id/payment", isAuthenticated, async (req: any, res) => {
    const branchSession = (req.session as any).branchSession;
    const isAdmin = branchSession?.isAdmin;
    
    if (!isAdmin) {
      return res.status(403).json({ error: "غير مصرح لك بتسجيل المدفوعات" });
    }
    
    const id = parseInt(req.params.id);
    const { amount } = req.body;
    
    try {
      const invoice = await storage.getInvoiceById(id);
      if (!invoice) {
        return res.status(404).json({ error: "الفاتورة غير موجودة" });
      }
      
      const newPaidAmount = (invoice.paidAmount || 0) + amount;
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

  // Seed initial branches
  const branchesList = await storage.getBranches();
  if (branchesList.length === 0) {
    const bNames = ["بغداد", "كربلاء", "ذي قار", "الموصل", "كركوك"];
    for (const name of bNames) {
      await storage.createBranch({ name, location: name });
    }
  }

  return httpServer;
}
