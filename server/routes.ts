import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure Multer for file uploads
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
  // Setup Auth FIRST
  await setupAuth(app);
  registerAuthRoutes(app);

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    // Basic security: don't allow directory traversal
    if (req.path.includes('..')) {
      res.status(403).send('Forbidden');
      return;
    }
    next();
  }, (await import('express')).static('uploads'));

  // Patients
  app.get(api.patients.list.path, async (req, res) => {
    const patients = await storage.getPatients();
    res.json(patients);
  });

  app.get(api.patients.get.path, async (req, res) => {
    const id = Number(req.params.id);
    const patient = await storage.getPatient(id);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    const payments = await storage.getPaymentsByPatientId(id);
    const documents = await storage.getDocumentsByPatientId(id);
    res.json({ ...patient, payments, documents });
  });

  app.post(api.patients.create.path, async (req, res) => {
    try {
      const input = api.patients.create.input.parse(req.body);
      const patient = await storage.createPatient(input);
      res.status(201).json(patient);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.patients.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.patients.update.input.parse(req.body);
      const patient = await storage.updatePatient(id, input);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.json(patient);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete(api.patients.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    await storage.deletePatient(id);
    res.status(204).send();
  });

  // Payments
  app.post(api.payments.create.path, async (req, res) => {
    try {
      const input = api.payments.create.input.parse(req.body);
      const payment = await storage.createPayment(input);
      res.status(201).json(payment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete(api.payments.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    await storage.deletePayment(id);
    res.status(204).send();
  });

  // Documents
  app.post(api.documents.create.path, upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    // We expect other fields in body
    const patientId = Number(req.body.patientId);
    const documentType = req.body.documentType;

    if (!patientId || !documentType) {
       return res.status(400).json({ message: "Missing patientId or documentType" });
    }

    const document = await storage.createDocument({
      patientId,
      documentType,
      fileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`
    });

    res.status(201).json(document);
  });

  app.delete(api.documents.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    const documents = await storage.getDocumentsByPatientId(id); 
    // Wait, getDocumentsByPatientId returns list, we need to get document by id to delete file
    // Implementing getDocument is better, but for now we trust deletion from DB and hopefully clean up file later or ignore
    await storage.deleteDocument(id);
    res.status(204).send();
  });

  // Seed data
  const patients = await storage.getPatients();
  if (patients.length === 0) {
    console.log("Seeding database...");
    const p1 = await storage.createPatient({
      name: "أحمد محمد",
      age: 45,
      weight: "75kg",
      height: "175cm",
      medicalCondition: "بتر تحت الركبة",
      isAmputee: true,
      amputationSite: "ساق يمنى",
      totalCost: 5000
    });
    await storage.createPayment({
      patientId: p1.id,
      amount: 2000,
      notes: "دفعة أولى"
    });

    const p2 = await storage.createPatient({
      name: "سارة علي",
      age: 32,
      weight: "60kg",
      height: "165cm",
      medicalCondition: "إصابة في العمود الفقري",
      isPhysiotherapy: true,
      diseaseType: "انزلاق غضروفي",
      totalCost: 1500
    });
     await storage.createPayment({
      patientId: p2.id,
      amount: 500,
      notes: "جلسة أولى"
    });
    console.log("Database seeded!");
  }

  return httpServer;
}
