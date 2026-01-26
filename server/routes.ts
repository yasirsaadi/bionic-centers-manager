import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import type { Patient, Payment } from "@shared/schema";
import { insertCustomStatSchema, insertExpenseSchema, insertInstallmentPlanSchema } from "@shared/schema";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import multer from "multer";
import path from "path";
import fs from "fs";

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

  // Admin code verification
  app.post("/api/verify-admin", isAuthenticated, async (req, res) => {
    const { code } = req.body;
    const adminCode = process.env.ADMIN_CODE;
    
    if (!adminCode) {
      return res.status(500).json({ message: "لم يتم تعيين كود المسؤول" });
    }
    
    if (code === adminCode) {
      res.json({ success: true });
    } else {
      res.status(401).json({ message: "الكود غير صحيح" });
    }
  });

  // Branch password verification
  app.post("/api/verify-branch", isAuthenticated, async (req, res) => {
    const { branchId, password } = req.body;
    
    console.log("Branch verification attempt:", { branchId, passwordLength: password?.length });
    
    // Check if admin login
    if (branchId === "admin" || branchId === 0) {
      const adminCode = process.env.ADMIN_CODE?.trim();
      const trimmedInput = password?.trim();
      console.log("Admin code check:", { exists: !!adminCode, storedLen: adminCode?.length, inputLen: trimmedInput?.length, match: trimmedInput === adminCode });
      if (trimmedInput === adminCode) {
        // Store admin session info
        (req.session as any).branchSession = {
          branchId: 0,
          isAdmin: true
        };
        return res.json({ 
          branchId: 0, 
          branchName: "مسؤول النظام",
          isAdmin: true 
        });
      }
      return res.status(401).json({ message: "كلمة سر المسؤول غير صحيحة" });
    }
    
    // Branch passwords stored as BRANCH_PASSWORD_1, BRANCH_PASSWORD_2, etc.
    const envKey = `BRANCH_PASSWORD_${branchId}`;
    const branchPassword = process.env[envKey]?.trim();
    const trimmedInput = password?.trim();
    console.log("Checking branch password:", { 
      envKey, 
      exists: !!branchPassword, 
      branchId, 
      storedLen: branchPassword?.length,
      inputLen: trimmedInput?.length,
      match: trimmedInput === branchPassword 
    });
    
    if (!branchPassword) {
      return res.status(500).json({ message: "لم يتم تعيين كلمة سر لهذا الفرع" });
    }
    
    if (trimmedInput === branchPassword) {
      const branches = await storage.getBranches();
      const branch = branches.find(b => b.id === Number(branchId));
      // Store branch session info
      (req.session as any).branchSession = {
        branchId: Number(branchId),
        isAdmin: false
      };
      return res.json({ 
        branchId: Number(branchId), 
        branchName: branch?.name || "فرع غير معروف",
        isAdmin: false 
      });
    }
    
    res.status(401).json({ message: "كلمة السر غير صحيحة" });
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
      const ctx = getUserContext(req);
      // Always use the form's branchId - allow staff to select branch when creating patients
      const branchId = req.body.branchId || ctx.branchId || 1;
      const input = api.patients.create.input.parse({
        ...req.body,
        branchId
      });
      const patient = await storage.createPatient(input);
      res.status(201).json(patient);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.post(api.patients.transfer.path, isAuthenticated, async (req, res) => {
    const ctx = getUserContext(req);
    if (ctx.role !== 'admin') return res.status(403).json({ message: "Admin only" });
    
    const id = Number(req.params.id);
    const { branchId } = api.patients.transfer.input.parse(req.body);
    const patient = await storage.updatePatient(id, { branchId });
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
    const patient = await storage.getPatient(id);
    
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
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
      const { serviceType, serviceCost, initialPayment, notes, branchId } = req.body;
      
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
        notes: `خدمة جديدة: ${serviceLabel}${notes ? ` - ${notes}` : ""} (تكلفة: ${serviceCost.toLocaleString()} د.ع)`,
      });
      
      // Create initial payment if provided
      if (initialPayment > 0) {
        await storage.createPayment({
          patientId,
          branchId: branchId || patient.branchId,
          amount: initialPayment,
          notes: `دفعة أولية - ${serviceLabel}`,
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

  // Delete payment (admin only)
  app.delete("/api/payments/:id", isAuthenticated, async (req, res) => {
    const branchSession = (req.session as any).branchSession;
    if (!branchSession?.isAdmin) {
      return res.status(403).json({ message: "فقط المسؤول يمكنه حذف المدفوعات" });
    }
    
    const id = Number(req.params.id);
    await storage.deletePayment(id);
    res.status(204).send();
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

  // Overall stats for all branches (for dashboard)
  app.get("/api/reports/overall", isAuthenticated, async (req, res) => {
    const allPatients = await storage.getPatients();
    const branches = await storage.getBranches();
    
    let totalSold = 0;
    let totalPaid = 0;
    
    for (const branch of branches) {
      const branchPayments = await storage.getPaymentsByBranch(branch.id);
      totalPaid += branchPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    }
    
    totalSold = allPatients.reduce((acc, p) => acc + (p.totalCost || 0), 0);
    
    res.json({
      revenue: totalPaid,
      sold: totalSold,
      paid: totalPaid,
      remaining: totalSold - totalPaid,
      totalPatients: allPatients.length,
      amputees: allPatients.filter(p => p.isAmputee).length,
      physiotherapy: allPatients.filter(p => p.isPhysiotherapy).length,
      medicalSupport: allPatients.filter(p => p.isMedicalSupport).length
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
    
    // Create patient lookup map
    const patientMap = new Map(patients.map((p: Patient) => [p.id, p]));
    
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
      
      patientsByDate[dateKey].push({
        id: patient.id,
        name: patient.name,
        totalCost: patient.totalCost || 0,
        isAmputee: patient.isAmputee || false,
        isPhysiotherapy: patient.isPhysiotherapy || false,
        isMedicalSupport: patient.isMedicalSupport || false,
        createdAt: patient.createdAt?.toString() || ''
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

  // Daily statistics endpoint
  app.get("/api/reports/daily", isAuthenticated, async (req, res) => {
    const allPatients = await storage.getPatients();
    const branches = await storage.getBranches();
    
    // Get today's date range (start of day to end of day)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    // Filter patients registered today
    const todayPatients = allPatients.filter(p => {
      if (!p.createdAt) return false;
      const createdAt = new Date(p.createdAt);
      return createdAt >= startOfDay && createdAt < endOfDay;
    });
    
    // Get today's payments
    let todayPaid = 0;
    for (const branch of branches) {
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
    const user = req.user;
    const branchId = user?.branchId;
    const isAdmin = user?.role === "admin";
    
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
      const user = req.user;
      const isAdmin = user?.role === "admin";
      const userBranchId = user?.branchId;
      
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
      const user = req.user;
      const isAdmin = user?.role === "admin";
      const userBranchId = user?.branchId;
      
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
    const user = req.user;
    const isAdmin = user?.role === "admin";
    const userBranchId = user?.branchId;
    
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
    
    const user = req.user;
    const isAdmin = user?.role === "admin";
    const userBranchId = user?.branchId;
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
          const total = patients.reduce((sum, p) => sum + (p.age || 0), 0);
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
    const user = req.user;
    const isAdmin = user?.role === "admin";
    
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
    const user = req.user;
    const isAdmin = user?.role === "admin";
    
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
      const user = req.user;
      const isAdmin = user?.role === "admin";
      
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
      const user = req.user;
      const isAdmin = user?.role === "admin";
      
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
    const user = req.user;
    const isAdmin = user?.role === "admin";
    
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
    const user = req.user;
    const isAdmin = user?.role === "admin";
    
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
    const user = req.user;
    const isAdmin = user?.role === "admin";
    
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
      const user = req.user;
      const isAdmin = user?.role === "admin";
      
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
      const user = req.user;
      const isAdmin = user?.role === "admin";
      
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
    const user = req.user;
    const isAdmin = user?.role === "admin";
    
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

  // Accounting Summary - Admin only
  app.get("/api/accounting/summary", isAuthenticated, async (req: any, res) => {
    const user = req.user;
    const isAdmin = user?.role === "admin";
    
    if (!isAdmin) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول للتقارير المحاسبية" });
    }
    
    const { branchId, startDate, endDate } = req.query;
    const summary = await storage.getAccountingSummary(
      branchId ? parseInt(branchId) : undefined,
      startDate as string,
      endDate as string
    );
    res.json(summary);
  });

  // Get all payments for accounting
  app.get("/api/accounting/payments", isAuthenticated, async (req: any, res) => {
    const user = req.user;
    const isAdmin = user?.role === "admin";
    
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
    const user = req.user;
    const isAdmin = user?.role === "admin";
    
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
    const user = req.user;
    const isAdmin = user?.role === "admin";
    
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
    const user = req.user;
    const isAdmin = user?.role === "admin";
    
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
    const user = req.user;
    const isAdmin = user?.role === "admin";
    
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
    const user = req.user;
    const isAdmin = user?.role === "admin";
    
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
