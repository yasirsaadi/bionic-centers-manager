import { db } from "./db";
import {
  patients, payments, documents, visits, branches, users,
  type Patient, type InsertPatient,
  type Payment, type InsertPayment,
  type Document, type InsertDocument,
  type Visit, type InsertVisit,
  type Branch, type InsertBranch
} from "@shared/schema";
import { eq, desc, and, sum } from "drizzle-orm";

export interface IStorage {
  // Branches
  getBranches(): Promise<Branch[]>;
  createBranch(branch: InsertBranch): Promise<Branch>;
  getBranch(id: number): Promise<Branch | undefined>;

  // Patients
  getPatients(branchId?: number): Promise<Patient[]>;
  getPatient(id: number): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient | undefined>;
  deletePatient(id: number): Promise<void>;

  // Visits
  getVisitsByPatientId(patientId: number): Promise<Visit[]>;
  createVisit(visit: InsertVisit): Promise<Visit>;
  deleteVisit(id: number): Promise<void>;

  // Payments
  getPaymentsByPatientId(patientId: number): Promise<Payment[]>;
  getPaymentsByBranch(branchId: number, date?: Date): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  deletePayment(id: number): Promise<void>;

  // Documents
  getDocumentsByPatientId(patientId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Branches
  async getBranches(): Promise<Branch[]> {
    return await db.select().from(branches);
  }
  async createBranch(insertBranch: InsertBranch): Promise<Branch> {
    const [branch] = await db.insert(branches).values(insertBranch).returning();
    return branch;
  }
  async getBranch(id: number): Promise<Branch | undefined> {
    const [branch] = await db.select().from(branches).where(eq(branches.id, id));
    return branch;
  }

  // Patients
  async getPatients(branchId?: number): Promise<Patient[]> {
    if (branchId) {
      return await db.select().from(patients).where(eq(patients.branchId, branchId)).orderBy(desc(patients.createdAt));
    }
    return await db.select().from(patients).orderBy(desc(patients.createdAt));
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const [patient] = await db.insert(patients).values(insertPatient).returning();
    return patient;
  }

  async updatePatient(id: number, updates: Partial<InsertPatient>): Promise<Patient | undefined> {
    const [updated] = await db.update(patients)
      .set(updates)
      .where(eq(patients.id, id))
      .returning();
    return updated;
  }

  async deletePatient(id: number): Promise<void> {
    await db.delete(payments).where(eq(payments.patientId, id));
    await db.delete(documents).where(eq(documents.patientId, id));
    await db.delete(visits).where(eq(visits.patientId, id));
    await db.delete(patients).where(eq(patients.id, id));
  }

  // Visits
  async getVisitsByPatientId(patientId: number): Promise<Visit[]> {
    return await db.select().from(visits).where(eq(visits.patientId, patientId)).orderBy(desc(visits.visitDate));
  }
  async createVisit(insertVisit: InsertVisit): Promise<Visit> {
    const [visit] = await db.insert(visits).values(insertVisit).returning();
    return visit;
  }
  async deleteVisit(id: number): Promise<void> {
    await db.delete(visits).where(eq(visits.id, id));
  }

  // Payments
  async getPaymentsByPatientId(patientId: number): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.patientId, patientId)).orderBy(desc(payments.date));
  }
  async getPaymentsByBranch(branchId: number, date?: Date): Promise<Payment[]> {
    // Simplified date filtering for report
    return await db.select().from(payments).where(eq(payments.branchId, branchId));
  }
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const paymentData = {
      ...insertPayment,
      date: insertPayment.date ? new Date(insertPayment.date) : new Date(),
    };
    const [payment] = await db.insert(payments).values(paymentData).returning();
    return payment;
  }
  async deletePayment(id: number): Promise<void> {
    await db.delete(payments).where(eq(payments.id, id));
  }

  // Documents
  async getDocumentsByPatientId(patientId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.patientId, patientId)).orderBy(desc(documents.uploadedAt));
  }
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db.insert(documents).values(insertDocument).returning();
    return document;
  }
  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }
}

export const storage = new DatabaseStorage();
