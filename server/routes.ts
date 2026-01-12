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
    
    if (!patient || (ctx.role !== 'admin' && patient.branchId !== ctx.branchId)) {
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
      // Use form's branchId if user has no assigned branch, otherwise use user's branch (admins can choose)
      const branchId = ctx.role === 'admin' 
        ? (req.body.branchId || 1) 
        : (ctx.branchId || req.body.branchId || 1);
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
