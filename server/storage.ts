import { db } from "./db";
import {
  patients, payments, documents, visits, branches, users, customStats, expenses, installmentPlans, invoices, invoiceItems,
  type Patient, type InsertPatient,
  type Payment, type InsertPayment,
  type Document, type InsertDocument,
  type Visit, type InsertVisit,
  type Branch, type InsertBranch,
  type CustomStat, type InsertCustomStat,
  type Expense, type InsertExpense,
  type InstallmentPlan, type InsertInstallmentPlan,
  type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem
} from "@shared/schema";
import { eq, desc, and, sum, or, isNull, gte, lte, sql } from "drizzle-orm";

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
  transferPatientToBranch(patientId: number, newBranchId: number): Promise<Patient | undefined>;

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

  // Custom Stats
  getCustomStats(branchId?: number, includeGlobal?: boolean): Promise<CustomStat[]>;
  getCustomStat(id: number): Promise<CustomStat | undefined>;
  createCustomStat(stat: InsertCustomStat): Promise<CustomStat>;
  updateCustomStat(id: number, stat: Partial<InsertCustomStat>): Promise<CustomStat | undefined>;
  deleteCustomStat(id: number): Promise<void>;

  // Expenses
  getExpenses(branchId?: number, startDate?: string, endDate?: string): Promise<Expense[]>;
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<void>;
  getExpensesByCategory(branchId?: number, startDate?: string, endDate?: string): Promise<{category: string, total: number}[]>;

  // Installment Plans
  getInstallmentPlans(branchId?: number): Promise<InstallmentPlan[]>;
  getInstallmentPlansByPatient(patientId: number): Promise<InstallmentPlan[]>;
  getInstallmentPlan(id: number): Promise<InstallmentPlan | undefined>;
  createInstallmentPlan(plan: InsertInstallmentPlan): Promise<InstallmentPlan>;
  updateInstallmentPlan(id: number, plan: Partial<InsertInstallmentPlan>): Promise<InstallmentPlan | undefined>;
  deleteInstallmentPlan(id: number): Promise<void>;

  // Accounting
  getAccountingSummary(branchId?: number, startDate?: string, endDate?: string): Promise<{
    totalRevenue: number;
    totalPaid: number;
    totalRemaining: number;
    totalExpenses: number;
    netProfit: number;
    collectionRate: number;
  }>;
  getAllPayments(branchId?: number, startDate?: string, endDate?: string): Promise<Payment[]>;
  getAllVisits(branchId?: number, startDate?: string, endDate?: string): Promise<Visit[]>;

  // Invoices
  getInvoices(branchId?: number, status?: string, patientId?: number, startDate?: string, endDate?: string): Promise<Invoice[]>;
  getInvoiceById(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<void>;
  getNextInvoiceNumber(): Promise<string>;
  
  // Invoice Items
  getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  deleteInvoiceItems(invoiceId: number): Promise<void>;
  
  // Invoice Stats
  getInvoiceStats(branchId?: number, startDate?: string, endDate?: string): Promise<{
    totalInvoices: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
  }>;
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

  async transferPatientToBranch(patientId: number, newBranchId: number): Promise<Patient | undefined> {
    // Update patient's branch
    const [updatedPatient] = await db.update(patients)
      .set({ branchId: newBranchId })
      .where(eq(patients.id, patientId))
      .returning();
    
    if (!updatedPatient) return undefined;

    // Update all visits for this patient to the new branch
    await db.update(visits)
      .set({ branchId: newBranchId })
      .where(eq(visits.patientId, patientId));

    // Update all payments for this patient to the new branch
    await db.update(payments)
      .set({ branchId: newBranchId })
      .where(eq(payments.patientId, patientId));

    // Documents don't have branchId, they're linked to patient only

    return updatedPatient;
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
  async updateVisit(id: number, updates: { details?: string | null; notes?: string | null }): Promise<Visit> {
    const [updated] = await db.update(visits)
      .set(updates)
      .where(eq(visits.id, id))
      .returning();
    return updated;
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

  // Custom Stats
  async getCustomStats(branchId?: number, includeGlobal: boolean = true): Promise<CustomStat[]> {
    if (branchId) {
      // Get branch-specific stats and optionally global stats
      if (includeGlobal) {
        return await db.select().from(customStats)
          .where(or(
            eq(customStats.branchId, branchId),
            eq(customStats.isGlobal, true)
          ))
          .orderBy(desc(customStats.createdAt));
      }
      return await db.select().from(customStats)
        .where(eq(customStats.branchId, branchId))
        .orderBy(desc(customStats.createdAt));
    }
    // Get all stats (admin view)
    return await db.select().from(customStats).orderBy(desc(customStats.createdAt));
  }

  async getCustomStat(id: number): Promise<CustomStat | undefined> {
    const [stat] = await db.select().from(customStats).where(eq(customStats.id, id));
    return stat;
  }

  async createCustomStat(insertStat: InsertCustomStat): Promise<CustomStat> {
    const [stat] = await db.insert(customStats).values(insertStat).returning();
    return stat;
  }

  async updateCustomStat(id: number, updates: Partial<InsertCustomStat>): Promise<CustomStat | undefined> {
    const [updated] = await db.update(customStats)
      .set(updates)
      .where(eq(customStats.id, id))
      .returning();
    return updated;
  }

  async deleteCustomStat(id: number): Promise<void> {
    await db.delete(customStats).where(eq(customStats.id, id));
  }

  // Expenses
  async getExpenses(branchId?: number, startDate?: string, endDate?: string): Promise<Expense[]> {
    let query = db.select().from(expenses);
    const conditions = [];
    
    if (branchId) {
      conditions.push(eq(expenses.branchId, branchId));
    }
    if (startDate) {
      conditions.push(gte(expenses.expenseDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(expenses.expenseDate, endDate));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(expenses).where(and(...conditions)).orderBy(desc(expenses.expenseDate));
    }
    return await db.select().from(expenses).orderBy(desc(expenses.expenseDate));
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense;
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const [expense] = await db.insert(expenses).values(insertExpense).returning();
    return expense;
  }

  async updateExpense(id: number, updates: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [updated] = await db.update(expenses)
      .set(updates)
      .where(eq(expenses.id, id))
      .returning();
    return updated;
  }

  async deleteExpense(id: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  async getExpensesByCategory(branchId?: number, startDate?: string, endDate?: string): Promise<{category: string, total: number}[]> {
    const conditions = [];
    if (branchId) {
      conditions.push(eq(expenses.branchId, branchId));
    }
    if (startDate) {
      conditions.push(gte(expenses.expenseDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(expenses.expenseDate, endDate));
    }

    const query = conditions.length > 0
      ? db.select({
          category: expenses.category,
          total: sql<number>`SUM(${expenses.amount})::integer`
        }).from(expenses).where(and(...conditions)).groupBy(expenses.category)
      : db.select({
          category: expenses.category,
          total: sql<number>`SUM(${expenses.amount})::integer`
        }).from(expenses).groupBy(expenses.category);
    
    return await query;
  }

  // Installment Plans
  async getInstallmentPlans(branchId?: number): Promise<InstallmentPlan[]> {
    if (branchId) {
      return await db.select().from(installmentPlans)
        .where(eq(installmentPlans.branchId, branchId))
        .orderBy(desc(installmentPlans.createdAt));
    }
    return await db.select().from(installmentPlans).orderBy(desc(installmentPlans.createdAt));
  }

  async getInstallmentPlansByPatient(patientId: number): Promise<InstallmentPlan[]> {
    return await db.select().from(installmentPlans)
      .where(eq(installmentPlans.patientId, patientId))
      .orderBy(desc(installmentPlans.createdAt));
  }

  async getInstallmentPlan(id: number): Promise<InstallmentPlan | undefined> {
    const [plan] = await db.select().from(installmentPlans).where(eq(installmentPlans.id, id));
    return plan;
  }

  async createInstallmentPlan(insertPlan: InsertInstallmentPlan): Promise<InstallmentPlan> {
    const [plan] = await db.insert(installmentPlans).values(insertPlan).returning();
    return plan;
  }

  async updateInstallmentPlan(id: number, updates: Partial<InsertInstallmentPlan>): Promise<InstallmentPlan | undefined> {
    const [updated] = await db.update(installmentPlans)
      .set(updates)
      .where(eq(installmentPlans.id, id))
      .returning();
    return updated;
  }

  async deleteInstallmentPlan(id: number): Promise<void> {
    await db.delete(installmentPlans).where(eq(installmentPlans.id, id));
  }

  // Accounting
  async getAccountingSummary(branchId?: number, startDate?: string, endDate?: string): Promise<{
    totalRevenue: number;
    totalPaid: number;
    totalRemaining: number;
    totalExpenses: number;
    netProfit: number;
    collectionRate: number;
  }> {
    // Get total revenue (all patient costs)
    const patientsQuery = branchId
      ? await db.select({ total: sql<number>`COALESCE(SUM(${patients.totalCost}), 0)::integer` })
          .from(patients).where(eq(patients.branchId, branchId))
      : await db.select({ total: sql<number>`COALESCE(SUM(${patients.totalCost}), 0)::integer` })
          .from(patients);
    const totalRevenue = patientsQuery[0]?.total || 0;

    // Get total paid (all payments within date range if specified)
    const paymentConditions = [];
    if (branchId) paymentConditions.push(eq(payments.branchId, branchId));
    if (startDate) paymentConditions.push(gte(payments.date, new Date(startDate)));
    if (endDate) paymentConditions.push(lte(payments.date, new Date(endDate)));

    const paymentsQuery = paymentConditions.length > 0
      ? await db.select({ total: sql<number>`COALESCE(SUM(${payments.amount}), 0)::integer` })
          .from(payments).where(and(...paymentConditions))
      : await db.select({ total: sql<number>`COALESCE(SUM(${payments.amount}), 0)::integer` })
          .from(payments);
    const totalPaid = paymentsQuery[0]?.total || 0;

    // Get total expenses
    const expenseConditions = [];
    if (branchId) expenseConditions.push(eq(expenses.branchId, branchId));
    if (startDate) expenseConditions.push(gte(expenses.expenseDate, startDate));
    if (endDate) expenseConditions.push(lte(expenses.expenseDate, endDate));

    const expensesQuery = expenseConditions.length > 0
      ? await db.select({ total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)::integer` })
          .from(expenses).where(and(...expenseConditions))
      : await db.select({ total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)::integer` })
          .from(expenses);
    const totalExpenses = expensesQuery[0]?.total || 0;

    const totalRemaining = totalRevenue - totalPaid;
    const netProfit = totalPaid - totalExpenses;
    const collectionRate = totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0;

    return {
      totalRevenue,
      totalPaid,
      totalRemaining,
      totalExpenses,
      netProfit,
      collectionRate
    };
  }

  async getAllPayments(branchId?: number, startDate?: string, endDate?: string): Promise<Payment[]> {
    const conditions = [];
    if (branchId) conditions.push(eq(payments.branchId, branchId));
    if (startDate) conditions.push(gte(payments.date, new Date(startDate)));
    if (endDate) conditions.push(lte(payments.date, new Date(endDate)));

    if (conditions.length > 0) {
      return await db.select().from(payments).where(and(...conditions)).orderBy(desc(payments.date));
    }
    return await db.select().from(payments).orderBy(desc(payments.date));
  }

  async getAllVisits(branchId?: number, startDate?: string, endDate?: string): Promise<Visit[]> {
    const conditions = [];
    if (branchId) conditions.push(eq(visits.branchId, branchId));
    if (startDate) conditions.push(gte(visits.visitDate, new Date(startDate)));
    if (endDate) conditions.push(lte(visits.visitDate, new Date(endDate)));

    if (conditions.length > 0) {
      return await db.select().from(visits).where(and(...conditions)).orderBy(desc(visits.visitDate));
    }
    return await db.select().from(visits).orderBy(desc(visits.visitDate));
  }

  // ======================= INVOICE METHODS =======================

  async getInvoices(branchId?: number, status?: string, patientId?: number, startDate?: string, endDate?: string): Promise<Invoice[]> {
    const conditions = [];
    if (branchId) conditions.push(eq(invoices.branchId, branchId));
    if (status) conditions.push(eq(invoices.status, status));
    if (patientId) conditions.push(eq(invoices.patientId, patientId));
    if (startDate) conditions.push(gte(invoices.invoiceDate, startDate));
    if (endDate) conditions.push(lte(invoices.invoiceDate, endDate));

    if (conditions.length > 0) {
      return await db.select().from(invoices).where(and(...conditions)).orderBy(desc(invoices.createdAt));
    }
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async getInvoiceById(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values(insertInvoice).returning();
    return invoice;
  }

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [updated] = await db.update(invoices).set(invoice).where(eq(invoices.id, id)).returning();
    return updated;
  }

  async deleteInvoice(id: number): Promise<void> {
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  async getNextInvoiceNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    // Get count of invoices this month
    const startOfMonth = `${year}-${month}-01`;
    const result = await db.select({ count: sql<number>`COUNT(*)::integer` })
      .from(invoices)
      .where(gte(invoices.invoiceDate, startOfMonth));
    
    const count = (result[0]?.count || 0) + 1;
    return `INV-${year}${month}-${String(count).padStart(4, '0')}`;
  }

  // Invoice Items
  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    return await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }

  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const [created] = await db.insert(invoiceItems).values(item).returning();
    return created;
  }

  async deleteInvoiceItems(invoiceId: number): Promise<void> {
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }

  // Invoice Stats
  async getInvoiceStats(branchId?: number, startDate?: string, endDate?: string): Promise<{
    totalInvoices: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
  }> {
    const conditions = [];
    if (branchId) conditions.push(eq(invoices.branchId, branchId));
    if (startDate) conditions.push(gte(invoices.invoiceDate, startDate));
    if (endDate) conditions.push(lte(invoices.invoiceDate, endDate));

    const query = conditions.length > 0
      ? await db.select({
          totalInvoices: sql<number>`COUNT(*)::integer`,
          totalAmount: sql<number>`COALESCE(SUM(${invoices.total}), 0)::integer`,
          paidAmount: sql<number>`COALESCE(SUM(${invoices.paidAmount}), 0)::integer`
        }).from(invoices).where(and(...conditions))
      : await db.select({
          totalInvoices: sql<number>`COUNT(*)::integer`,
          totalAmount: sql<number>`COALESCE(SUM(${invoices.total}), 0)::integer`,
          paidAmount: sql<number>`COALESCE(SUM(${invoices.paidAmount}), 0)::integer`
        }).from(invoices);

    const result = query[0] || { totalInvoices: 0, totalAmount: 0, paidAmount: 0 };
    
    return {
      totalInvoices: result.totalInvoices,
      totalAmount: result.totalAmount,
      paidAmount: result.paidAmount,
      pendingAmount: result.totalAmount - result.paidAmount
    };
  }
}

export const storage = new DatabaseStorage();
