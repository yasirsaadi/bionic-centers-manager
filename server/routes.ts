import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
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
      const adminCode = process.env.ADMIN_CODE;
      console.log("Admin code exists:", !!adminCode);
      if (password === adminCode) {
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
    const branchPassword = process.env[envKey];
    console.log("Checking branch password:", { envKey, exists: !!branchPassword, branchId, branchIdType: typeof branchId });
    
    if (!branchPassword) {
      return res.status(500).json({ message: "لم يتم تعيين كلمة سر لهذا الفرع" });
    }
    
    if (password === branchPassword) {
      const branches = await storage.getBranches();
      const branch = branches.find(b => b.id === Number(branchId));
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
    res.json(patients);
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

  // Visits
  app.post(api.visits.create.path, isAuthenticated, async (req, res) => {
    const input = api.visits.create.input.parse(req.body);
    const visit = await storage.createVisit(input);
    res.status(201).json(visit);
  });

  // Payments
  app.post(api.payments.create.path, isAuthenticated, async (req, res) => {
    const input = api.payments.create.input.parse(req.body);
    const payment = await storage.createPayment(input);
    res.status(201).json(payment);
  });

  // Daily Report
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
