import { db } from "./db";
import {
  patients, payments, documents, visits, branches, users, customStats, expenses, installmentPlans, invoices, invoiceItems, vendors, purchases,
  anomalyDecisions, aiMemoryNotes,
  systemSettings, branchPasswords, branchSettings, systemUsers, treatmentPlans,
  surveyTemplates, surveyQuestions, surveyResponses, surveyAnswers,
  type Patient, type InsertPatient,
  type Payment, type InsertPayment,
  type Document, type InsertDocument,
  type Visit, type InsertVisit,
  type Branch, type InsertBranch,
  type CustomStat, type InsertCustomStat,
  type Expense, type InsertExpense,
  type InstallmentPlan, type InsertInstallmentPlan,
  type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem,
  type Vendor, type InsertVendor,
  type Purchase, type InsertPurchase,
  type AnomalyDecision, type InsertAnomalyDecision,
  type AiMemoryNote, type InsertAiMemoryNote,
  type SystemSetting, type BranchPassword, type BranchSetting, type InsertBranchSetting,
  type SystemUser, type InsertSystemUser,
  type TreatmentPlan, type InsertTreatmentPlan,
  type SurveyTemplate, type InsertSurveyTemplate,
  type SurveyQuestion, type InsertSurveyQuestion,
  type SurveyResponse, type InsertSurveyResponse,
  type SurveyAnswer, type InsertSurveyAnswer
} from "@shared/schema";
import { eq, desc, and, sum, or, isNull, gte, lte, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Branches
  getBranches(): Promise<Branch[]>;
  createBranch(branch: InsertBranch): Promise<Branch>;
  getBranch(id: number): Promise<Branch | undefined>;

  // Patients
  getPatients(branchId?: number): Promise<Patient[]>;
  getPatientsByIds(ids: number[]): Promise<Patient[]>;
  getPatient(id: number): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient | undefined>;
  deletePatient(id: number): Promise<void>;
  transferPatientToBranch(patientId: number, newBranchId: number): Promise<Patient | undefined>;

  // Visits
  getVisitsByPatientId(patientId: number): Promise<Visit[]>;
  getVisitsByPatientIds(patientIds: number[]): Promise<Visit[]>;
  getVisitsByBranch(branchId: number): Promise<Visit[]>;
  createVisit(visit: InsertVisit): Promise<Visit>;
  deleteVisit(id: number): Promise<void>;

  // Payments
  getPaymentsByPatientId(patientId: number): Promise<Payment[]>;
  getPaymentsByPatientIds(patientIds: number[]): Promise<Payment[]>;
  getPaymentsByBranch(branchId: number, date?: Date): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  deletePayment(id: number): Promise<void>;
  updatePaymentSessionInfo(id: number, sessionCount: number | null, paymentTreatmentType: string | null): Promise<any>;
  updatePayment(id: number, data: { amount?: number, notes?: string | null, sessionCount?: number | null, paymentTreatmentType?: string | null, date?: Date | null }): Promise<any>;

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
  getExpenseSubcategories(category: string, branchId?: number): Promise<string[]>;

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
    effectiveStartDate: string | null;
    effectiveEndDate: string;
    daysInRange: number;
  }>;
  getDailyCashSummary(date: string, branchId?: number): Promise<{
    date: string;
    branchId: number | null;
    todayRevenue: number;
    todayExpenses: number;
    todayNet: number;
    yesterdayClosing: number;
    todayClosing: number;
    revenueByService: { type: string; amount: number }[];
    expensesByCategory: { category: string; amount: number }[];
    otherSubcategoryBreakdown: { subcategory: string; amount: number }[];
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

  // Vendors / Suppliers
  getVendors(activeOnly?: boolean): Promise<Vendor[]>;
  getVendorById(id: number): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, vendor: Partial<InsertVendor>): Promise<Vendor | undefined>;
  deactivateVendor(id: number): Promise<void>;

  // Purchases
  getPurchases(branchId?: number, vendorId?: number, status?: string, startDate?: string, endDate?: string): Promise<Purchase[]>;
  getPurchaseById(id: number): Promise<Purchase | undefined>;
  createPurchase(purchase: InsertPurchase & { purchaseNumber?: string; createdBy?: string | null }): Promise<Purchase>;
  updatePurchase(id: number, purchase: Partial<InsertPurchase>): Promise<Purchase | undefined>;
  deletePurchase(id: number): Promise<void>;
  getNextPurchaseNumber(): Promise<string>;
  getPurchasesSummary(branchId?: number, startDate?: string, endDate?: string): Promise<{
    totalPurchases: number;
    totalPaid: number;
    totalOutstanding: number;
    purchaseCount: number;
  }>;
  
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

  // System Settings
  getSystemSetting(key: string): Promise<string | undefined>;
  setSystemSetting(key: string, value: string): Promise<SystemSetting>;
  getAllSystemSettings(): Promise<SystemSetting[]>;

  // Branch Passwords
  getBranchPassword(branchId: number): Promise<string | undefined>;
  setBranchPassword(branchId: number, password: string): Promise<BranchPassword>;
  getAllBranchPasswords(): Promise<BranchPassword[]>;

  // Branch Management
  deleteBranch(id: number): Promise<{ success: boolean; error?: string }>;
  getBranchPatientCount(branchId: number): Promise<number>;

  // Branch Settings
  getBranchSettings(branchId: number): Promise<BranchSetting | undefined>;
  getAllBranchSettings(): Promise<BranchSetting[]>;
  setBranchSettings(branchId: number, settings: Partial<InsertBranchSetting>): Promise<BranchSetting>;

  // Employee accuracy
  getEmployeeAccuracy(params: {
    branchId?: number;
    startDate: string;
    endDate: string;
  }): Promise<{
    createdBy: string;
    displayName: string;
    role: string | null;
    branchId: number | null;
    expenseCount: number;
    expenseTotal: number;
    invoiceCount: number;
    invoiceTotal: number;
    purchaseCount: number;
    purchaseTotal: number;
    anomalyDecisionsCount: number;
  }[]>;

  // System Users
  getSystemUsers(): Promise<SystemUser[]>;
  getSystemUser(id: number): Promise<SystemUser | undefined>;
  getSystemUserByUsername(username: string): Promise<SystemUser | undefined>;
  createSystemUser(user: InsertSystemUser): Promise<SystemUser>;
  updateSystemUser(id: number, user: Partial<InsertSystemUser>): Promise<SystemUser | undefined>;
  deleteSystemUser(id: number): Promise<void>;

  // Treatment Plans
  getTreatmentPlans(patientId: number): Promise<TreatmentPlan[]>;
  createTreatmentPlan(plan: InsertTreatmentPlan): Promise<TreatmentPlan>;
  updateTreatmentPlan(id: number, plan: Partial<InsertTreatmentPlan>): Promise<TreatmentPlan>;
  deleteTreatmentPlan(id: number): Promise<void>;

  // Surveys
  getSurveyTemplates(): Promise<SurveyTemplate[]>;
  getSurveyTemplate(id: number): Promise<SurveyTemplate | undefined>;
  createSurveyTemplate(template: InsertSurveyTemplate): Promise<SurveyTemplate>;
  getSurveyQuestions(templateId: number): Promise<SurveyQuestion[]>;
  createSurveyQuestion(question: InsertSurveyQuestion): Promise<SurveyQuestion>;
  getSurveyResponses(branchId?: number): Promise<SurveyResponse[]>;
  getSurveyResponsesByPatient(patientId: number): Promise<SurveyResponse[]>;
  createSurveyResponse(response: InsertSurveyResponse): Promise<SurveyResponse>;
  getSurveyAnswers(responseId: number): Promise<SurveyAnswer[]>;
  createSurveyAnswer(answer: InsertSurveyAnswer): Promise<SurveyAnswer>;
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

  // Batch-fetch by ID set — used by display-time inference paths that
  // need patient flags (isAmputee / isPhysiotherapy / isMedicalSupport)
  // for a known list of payments to avoid an N+1 lookup.
  async getPatientsByIds(ids: number[]): Promise<Patient[]> {
    if (ids.length === 0) return [];
    return await db.select().from(patients).where(inArray(patients.id, ids));
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const { registrationDate, ...patientData } = insertPatient as InsertPatient & { registrationDate?: string | null };
    
    const valuesToInsert: any = { ...patientData };
    
    if (registrationDate) {
      const baghdadOffset = 3 * 60 * 60 * 1000;
      const nowBaghdad = new Date(Date.now() + baghdadOffset);
      const todayBaghdad = nowBaghdad.toISOString().split('T')[0];
      
      if (registrationDate === todayBaghdad) {
        // Today's date: let defaultNow() set the actual current timestamp
      } else {
        // Backdated: use the selected date with current Baghdad time
        const currentHours = nowBaghdad.getUTCHours();
        const currentMinutes = nowBaghdad.getUTCMinutes();
        const currentSeconds = nowBaghdad.getUTCSeconds();
        
        const [year, month, day] = registrationDate.split('-').map(Number);
        const backdatedBaghdad = new Date(Date.UTC(year, month - 1, day, currentHours, currentMinutes, currentSeconds));
        // Convert Baghdad time back to UTC for storage
        valuesToInsert.createdAt = new Date(backdatedBaghdad.getTime() - baghdadOffset);
      }
    }
    
    const [patient] = await db.insert(patients).values(valuesToInsert).returning();
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
    const patientInvoices = await db.select({ id: invoices.id }).from(invoices).where(eq(invoices.patientId, id));
    for (const inv of patientInvoices) {
      await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, inv.id));
    }
    await db.delete(invoices).where(eq(invoices.patientId, id));
    await db.delete(installmentPlans).where(eq(installmentPlans.patientId, id));
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
  async getVisitsByPatientIds(patientIds: number[]): Promise<Visit[]> {
    if (patientIds.length === 0) return [];
    return await db.select().from(visits).where(inArray(visits.patientId, patientIds)).orderBy(desc(visits.visitDate));
  }
  async getVisitsByBranch(branchId: number): Promise<Visit[]> {
    return await db.select().from(visits).where(eq(visits.branchId, branchId)).orderBy(desc(visits.visitDate));
  }
  async createVisit(insertVisit: InsertVisit): Promise<Visit> {
    const { customDate, ...visitData } = insertVisit as InsertVisit & { customDate?: string | null };
    
    const valuesToInsert: any = { ...visitData };
    
    if (customDate) {
      const baghdadOffset = 3 * 60 * 60 * 1000;
      const nowBaghdad = new Date(Date.now() + baghdadOffset);
      const todayBaghdad = nowBaghdad.toISOString().split('T')[0];
      
      if (customDate !== todayBaghdad) {
        const currentHours = nowBaghdad.getUTCHours();
        const currentMinutes = nowBaghdad.getUTCMinutes();
        const currentSeconds = nowBaghdad.getUTCSeconds();
        
        const [year, month, day] = customDate.split('-').map(Number);
        const backdatedBaghdad = new Date(Date.UTC(year, month - 1, day, currentHours, currentMinutes, currentSeconds));
        valuesToInsert.visitDate = new Date(backdatedBaghdad.getTime() - baghdadOffset);
      }
    }
    
    const [visit] = await db.insert(visits).values(valuesToInsert).returning();
    return visit;
  }
  async deleteVisit(id: number): Promise<void> {
    await db.delete(visits).where(eq(visits.id, id));
  }
  async updateVisit(id: number, updates: { details?: string | null; notes?: string | null; treatmentType?: string | null; sessionCount?: number | null; cost?: number | null; visitDate?: Date | null }): Promise<Visit> {
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
  async getPaymentsByPatientIds(patientIds: number[]): Promise<Payment[]> {
    if (patientIds.length === 0) return [];
    return await db.select().from(payments).where(inArray(payments.patientId, patientIds)).orderBy(desc(payments.date));
  }
  async getPaymentsByBranch(branchId: number, date?: Date): Promise<Payment[]> {
    // Simplified date filtering for report
    return await db.select().from(payments).where(eq(payments.branchId, branchId));
  }
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    let dateValue: Date;
    if (insertPayment.date) {
      const dateStr = String(insertPayment.date);
      if (dateStr.includes('T')) {
        const baghdadOffset = 3 * 60 * 60 * 1000;
        const parsed = new Date(dateStr + 'Z');
        dateValue = new Date(parsed.getTime() - baghdadOffset);
      } else {
        dateValue = new Date(dateStr);
      }
    } else {
      dateValue = new Date();
    }
    const paymentData = {
      ...insertPayment,
      date: dateValue,
    };
    const [payment] = await db.insert(payments).values(paymentData).returning();
    return payment;
  }
  async deletePayment(id: number): Promise<void> {
    await db.delete(payments).where(eq(payments.id, id));
  }

  async updatePaymentSessionInfo(id: number, sessionCount: number | null, paymentTreatmentType: string | null): Promise<any> {
    const [updated] = await db.update(payments)
      .set({ sessionCount, paymentTreatmentType })
      .where(eq(payments.id, id))
      .returning();
    return updated;
  }

  async updatePayment(id: number, data: { amount?: number, notes?: string | null, sessionCount?: number | null, paymentTreatmentType?: string | null, date?: Date | null, isFreeSessions?: boolean }): Promise<any> {
    const [updated] = await db.update(payments)
      .set(data)
      .where(eq(payments.id, id))
      .returning();
    return updated;
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

  // Returns the distinct, non-empty subcategories that have been used for the
  // given category, sorted by recent-first usage so the most-likely match
  // surfaces first in the autocomplete dropdown. Optionally branch-scoped.
  async getExpenseSubcategories(category: string, branchId?: number): Promise<string[]> {
    const conditions = [eq(expenses.category, category), sql`${expenses.subcategory} IS NOT NULL AND ${expenses.subcategory} <> ''`];
    if (branchId) conditions.push(eq(expenses.branchId, branchId));
    const rows = await db
      .select({ sub: expenses.subcategory, last: sql<string>`MAX(${expenses.createdAt})` })
      .from(expenses)
      .where(and(...conditions))
      .groupBy(expenses.subcategory)
      .orderBy(sql`MAX(${expenses.createdAt}) DESC`);
    return rows.map((r) => r.sub).filter((s): s is string => !!s);
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
    effectiveStartDate: string | null;
    effectiveEndDate: string;
    daysInRange: number;
  }> {
    // Get total revenue (all patient costs)
    const patientsQuery = branchId
      ? await db.select({ total: sql<string>`COALESCE(SUM(${patients.totalCost}), 0)` })
          .from(patients).where(eq(patients.branchId, branchId))
      : await db.select({ total: sql<string>`COALESCE(SUM(${patients.totalCost}), 0)` })
          .from(patients);
    const totalRevenue = Number(patientsQuery[0]?.total) || 0;

    // Get total paid (all payments within date range if specified)
    const paymentConditions = [];
    if (branchId) paymentConditions.push(eq(payments.branchId, branchId));
    if (startDate) paymentConditions.push(gte(payments.date, new Date(startDate)));
    if (endDate) paymentConditions.push(lte(payments.date, new Date(endDate)));

    const paymentsQuery = paymentConditions.length > 0
      ? await db.select({ total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
          .from(payments).where(and(...paymentConditions))
      : await db.select({ total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
          .from(payments);
    const totalPaid = Number(paymentsQuery[0]?.total) || 0;

    // Get total expenses
    const expenseConditions = [];
    if (branchId) expenseConditions.push(eq(expenses.branchId, branchId));
    if (startDate) expenseConditions.push(gte(expenses.expenseDate, startDate));
    if (endDate) expenseConditions.push(lte(expenses.expenseDate, endDate));

    const expensesQuery = expenseConditions.length > 0
      ? await db.select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
          .from(expenses).where(and(...expenseConditions))
      : await db.select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
          .from(expenses);
    const totalExpenses = Number(expensesQuery[0]?.total) || 0;

    // Compute effective date range. If user did not specify startDate, use
    // the earliest financial record date across payments and expenses
    // (filtered by branch) so the UI can show "from X to today, Y days".
    let effectiveStartDate: string | null = startDate ?? null;
    if (!effectiveStartDate) {
      const earliestPaymentCond = branchId ? [eq(payments.branchId, branchId)] : [];
      const earliestExpenseCond = branchId ? [eq(expenses.branchId, branchId)] : [];
      const earliestPaymentQ = earliestPaymentCond.length > 0
        ? await db.select({ min: sql<string>`MIN(${payments.date})` })
            .from(payments).where(and(...earliestPaymentCond))
        : await db.select({ min: sql<string>`MIN(${payments.date})` }).from(payments);
      const earliestExpenseQ = earliestExpenseCond.length > 0
        ? await db.select({ min: sql<string>`MIN(${expenses.expenseDate})` })
            .from(expenses).where(and(...earliestExpenseCond))
        : await db.select({ min: sql<string>`MIN(${expenses.expenseDate})` }).from(expenses);

      const candidates: string[] = [];
      const pMin = earliestPaymentQ[0]?.min;
      const eMin = earliestExpenseQ[0]?.min;
      if (pMin) candidates.push(new Date(pMin).toISOString().split("T")[0]);
      if (eMin) candidates.push(new Date(eMin).toISOString().split("T")[0]);
      if (candidates.length > 0) {
        candidates.sort();
        effectiveStartDate = candidates[0];
      }
    }

    const effectiveEndDate = endDate ?? new Date().toISOString().split("T")[0];

    let daysInRange = 0;
    if (effectiveStartDate) {
      const start = new Date(effectiveStartDate);
      const end = new Date(effectiveEndDate);
      const msPerDay = 24 * 60 * 60 * 1000;
      daysInRange = Math.max(1, Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1);
    }

    const totalRemaining = totalRevenue - totalPaid;
    const netProfit = totalPaid - totalExpenses;
    const collectionRate = totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0;

    return {
      totalRevenue,
      totalPaid,
      totalRemaining,
      totalExpenses,
      netProfit,
      collectionRate,
      effectiveStartDate,
      effectiveEndDate,
      daysInRange,
    };
  }

  // Daily cash summary for the accountant's PDF export.
  // Computes today's revenue, expenses, net, plus a recursive carry-forward
  // of the cash position from prior days (yesterday's closing = sum of all
  // prior payments minus sum of all prior expenses for the branch).
  async getDailyCashSummary(date: string, branchId?: number): Promise<{
    date: string;
    branchId: number | null;
    todayRevenue: number;
    todayExpenses: number;
    todayNet: number;
    yesterdayClosing: number;
    todayClosing: number;
    revenueByService: { type: string; amount: number }[];
    expensesByCategory: { category: string; amount: number }[];
    otherSubcategoryBreakdown: { subcategory: string; amount: number }[];
  }> {
    // Day boundaries in BAGHDAD time (+03:00). The payments table stores a
    // timestamp; using UTC midnight here would skip the first 3 hours of
    // each Baghdad-local day (00:00–03:00 Baghdad = 21:00–00:00 UTC the day
    // before) and double-count the last 3 hours of yesterday. By anchoring
    // to Baghdad we get exactly the calendar day the user typed.
    const dayStart = new Date(`${date}T00:00:00+03:00`);
    const dayEnd = new Date(`${date}T23:59:59.999+03:00`);
    const branchFilter = branchId ? eq(payments.branchId, branchId) : sql`TRUE`;
    const expBranchFilter = branchId ? eq(expenses.branchId, branchId) : sql`TRUE`;

    // Today's total payments
    const todayPaymentsQ = await db
      .select({ total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
      .from(payments)
      .where(and(branchFilter, gte(payments.date, dayStart), lte(payments.date, dayEnd)));
    const todayRevenue = Number(todayPaymentsQ[0]?.total) || 0;

    // Today's total expenses (compare on text date column)
    const todayExpensesQ = await db
      .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
      .from(expenses)
      .where(and(expBranchFilter, eq(expenses.expenseDate, date)));
    const todayExpenses = Number(todayExpensesQ[0]?.total) || 0;

    // Sum of all payments BEFORE today (carry-forward base)
    const priorPaymentsQ = await db
      .select({ total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
      .from(payments)
      .where(and(branchFilter, sql`${payments.date} < ${dayStart}`));
    const priorRevenue = Number(priorPaymentsQ[0]?.total) || 0;

    // Sum of all expenses BEFORE today
    const priorExpensesQ = await db
      .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
      .from(expenses)
      .where(and(expBranchFilter, sql`${expenses.expenseDate} < ${date}`));
    const priorExpenses = Number(priorExpensesQ[0]?.total) || 0;

    const yesterdayClosing = priorRevenue - priorExpenses;
    const todayNet = todayRevenue - todayExpenses;
    const todayClosing = yesterdayClosing + todayNet;

    // Today's revenue grouped by treatment type
    const revenueByServiceQ = await db
      .select({
        type: sql<string>`COALESCE(${payments.paymentTreatmentType}, 'غير محدد')`,
        amount: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
      })
      .from(payments)
      .where(and(branchFilter, gte(payments.date, dayStart), lte(payments.date, dayEnd)))
      .groupBy(payments.paymentTreatmentType);
    const revenueByService = revenueByServiceQ
      .map((r) => ({ type: r.type, amount: Number(r.amount) || 0 }))
      .filter((r) => r.amount > 0);

    // Today's expenses grouped by category + subcategory.
    // The PDF / dashboard collapses to category total but expands the
    // "other" bucket into a per-subcategory breakdown so accountants don't
    // lose visibility on what "أخرى" actually covered.
    const expensesByCategoryQ = await db
      .select({
        category: sql<string>`COALESCE(${expenses.category}, 'other')`,
        subcategory: expenses.subcategory,
        amount: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .where(and(expBranchFilter, eq(expenses.expenseDate, date)))
      .groupBy(expenses.category, expenses.subcategory);

    // Aggregate to one row per category for the totals display.
    const categoryTotals = new Map<string, number>();
    // And a separate sub-breakdown ONLY for "other" so the PDF can expand it.
    const otherBreakdown: { subcategory: string; amount: number }[] = [];
    for (const r of expensesByCategoryQ) {
      const amt = Number(r.amount) || 0;
      if (amt <= 0) continue;
      categoryTotals.set(r.category, (categoryTotals.get(r.category) ?? 0) + amt);
      if (r.category === "other") {
        otherBreakdown.push({
          subcategory: (r.subcategory ?? "غير مُصنَّف").trim() || "غير مُصنَّف",
          amount: amt,
        });
      }
    }
    const expensesByCategory = Array.from(categoryTotals.entries()).map(
      ([category, amount]) => ({ category, amount })
    );
    // Sort subcategories within "other" by amount descending so the largest
    // mystery expenses bubble to the top.
    otherBreakdown.sort((a, b) => b.amount - a.amount);

    return {
      date,
      branchId: branchId ?? null,
      todayRevenue,
      todayExpenses,
      todayNet,
      yesterdayClosing,
      todayClosing,
      revenueByService,
      expensesByCategory,
      otherSubcategoryBreakdown: otherBreakdown,
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

  // System Settings
  async getSystemSetting(key: string): Promise<string | undefined> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.settingKey, key));
    return setting?.settingValue;
  }

  async setSystemSetting(key: string, value: string): Promise<SystemSetting> {
    // Upsert - update if exists, insert if not
    const existing = await this.getSystemSetting(key);
    if (existing !== undefined) {
      const [updated] = await db.update(systemSettings)
        .set({ settingValue: value, updatedAt: new Date() })
        .where(eq(systemSettings.settingKey, key))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(systemSettings)
        .values({ settingKey: key, settingValue: value })
        .returning();
      return created;
    }
  }

  async getAllSystemSettings(): Promise<SystemSetting[]> {
    return await db.select().from(systemSettings);
  }

  // Branch Passwords
  async getBranchPassword(branchId: number): Promise<string | undefined> {
    const [record] = await db.select().from(branchPasswords).where(eq(branchPasswords.branchId, branchId));
    return record?.password;
  }

  async setBranchPassword(branchId: number, password: string): Promise<BranchPassword> {
    // Upsert - update if exists, insert if not
    const existing = await this.getBranchPassword(branchId);
    if (existing !== undefined) {
      const [updated] = await db.update(branchPasswords)
        .set({ password, updatedAt: new Date() })
        .where(eq(branchPasswords.branchId, branchId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(branchPasswords)
        .values({ branchId, password })
        .returning();
      return created;
    }
  }

  async getAllBranchPasswords(): Promise<BranchPassword[]> {
    return await db.select().from(branchPasswords);
  }

  // Branch Management
  async deleteBranch(id: number): Promise<{ success: boolean; error?: string }> {
    // Check if branch has patients
    const patientCount = await this.getBranchPatientCount(id);
    if (patientCount > 0) {
      return { success: false, error: `الفرع يحتوي على ${patientCount} مريض. يرجى نقل أو حذف المرضى أولاً` };
    }

    // Delete related records first
    await db.delete(branchPasswords).where(eq(branchPasswords.branchId, id));
    await db.delete(branchSettings).where(eq(branchSettings.branchId, id));
    await db.delete(expenses).where(eq(expenses.branchId, id));
    await db.delete(invoices).where(eq(invoices.branchId, id));
    await db.delete(installmentPlans).where(eq(installmentPlans.branchId, id));
    await db.delete(customStats).where(eq(customStats.branchId, id));
    
    // Delete the branch
    await db.delete(branches).where(eq(branches.id, id));
    return { success: true };
  }

  async getBranchPatientCount(branchId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(patients)
      .where(eq(patients.branchId, branchId));
    return Number(result[0]?.count || 0);
  }

  // Branch Settings
  async getBranchSettings(branchId: number): Promise<BranchSetting | undefined> {
    const [settings] = await db.select().from(branchSettings).where(eq(branchSettings.branchId, branchId));
    return settings;
  }

  async getAllBranchSettings(): Promise<BranchSetting[]> {
    return await db.select().from(branchSettings);
  }

  async setBranchSettings(branchId: number, settings: Partial<InsertBranchSetting>): Promise<BranchSetting> {
    const existing = await this.getBranchSettings(branchId);
    if (existing) {
      const [updated] = await db.update(branchSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(branchSettings.branchId, branchId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(branchSettings)
        .values({ branchId, ...settings })
        .returning();
      return created;
    }
  }

  // System Users
  async getSystemUsers(): Promise<SystemUser[]> {
    return await db.select().from(systemUsers).orderBy(desc(systemUsers.createdAt));
  }

  async getSystemUser(id: number): Promise<SystemUser | undefined> {
    const [user] = await db.select().from(systemUsers).where(eq(systemUsers.id, id));
    return user;
  }

  async getSystemUserByUsername(username: string): Promise<SystemUser | undefined> {
    const [user] = await db.select().from(systemUsers).where(eq(systemUsers.username, username.toLowerCase()));
    return user;
  }

  async createSystemUser(user: InsertSystemUser): Promise<SystemUser> {
    const [created] = await db.insert(systemUsers).values({
      ...user,
      username: user.username.toLowerCase()
    }).returning();
    return created;
  }

  async updateSystemUser(id: number, user: Partial<InsertSystemUser>): Promise<SystemUser | undefined> {
    const updateData: any = { ...user, updatedAt: new Date() };
    if (user.username) {
      updateData.username = user.username.toLowerCase();
    }
    const [updated] = await db.update(systemUsers)
      .set(updateData)
      .where(eq(systemUsers.id, id))
      .returning();
    return updated;
  }

  async deleteSystemUser(id: number): Promise<void> {
    await db.delete(systemUsers).where(eq(systemUsers.id, id));
  }

  async getTreatmentPlans(patientId: number): Promise<TreatmentPlan[]> {
    return await db.select().from(treatmentPlans)
      .where(eq(treatmentPlans.patientId, patientId))
      .orderBy(desc(treatmentPlans.createdAt));
  }

  async createTreatmentPlan(plan: InsertTreatmentPlan): Promise<TreatmentPlan> {
    const [created] = await db.insert(treatmentPlans).values(plan).returning();
    return created;
  }

  async updateTreatmentPlan(id: number, plan: Partial<InsertTreatmentPlan>): Promise<TreatmentPlan> {
    const [updated] = await db.update(treatmentPlans)
      .set({ ...plan, updatedAt: new Date() })
      .where(eq(treatmentPlans.id, id))
      .returning();
    return updated;
  }

  async deleteTreatmentPlan(id: number): Promise<void> {
    await db.delete(treatmentPlans).where(eq(treatmentPlans.id, id));
  }

  // Surveys
  async getSurveyTemplates(): Promise<SurveyTemplate[]> {
    return await db.select().from(surveyTemplates).where(eq(surveyTemplates.isActive, true));
  }

  async getSurveyTemplate(id: number): Promise<SurveyTemplate | undefined> {
    const [template] = await db.select().from(surveyTemplates).where(eq(surveyTemplates.id, id));
    return template;
  }

  async createSurveyTemplate(template: InsertSurveyTemplate): Promise<SurveyTemplate> {
    const [created] = await db.insert(surveyTemplates).values(template).returning();
    return created;
  }

  async getSurveyQuestions(templateId: number): Promise<SurveyQuestion[]> {
    return await db.select().from(surveyQuestions)
      .where(eq(surveyQuestions.templateId, templateId))
      .orderBy(surveyQuestions.questionOrder);
  }

  async createSurveyQuestion(question: InsertSurveyQuestion): Promise<SurveyQuestion> {
    const [created] = await db.insert(surveyQuestions).values(question).returning();
    return created;
  }

  async getSurveyResponses(branchId?: number): Promise<SurveyResponse[]> {
    if (branchId) {
      return await db.select().from(surveyResponses)
        .where(eq(surveyResponses.branchId, branchId))
        .orderBy(desc(surveyResponses.completedAt));
    }
    return await db.select().from(surveyResponses).orderBy(desc(surveyResponses.completedAt));
  }

  async getSurveyResponsesByPatient(patientId: number): Promise<SurveyResponse[]> {
    return await db.select().from(surveyResponses)
      .where(eq(surveyResponses.patientId, patientId))
      .orderBy(desc(surveyResponses.completedAt));
  }

  async createSurveyResponse(response: InsertSurveyResponse): Promise<SurveyResponse> {
    const [created] = await db.insert(surveyResponses).values(response).returning();
    return created;
  }

  async getSurveyAnswers(responseId: number): Promise<SurveyAnswer[]> {
    return await db.select().from(surveyAnswers).where(eq(surveyAnswers.responseId, responseId));
  }

  async createSurveyAnswer(answer: InsertSurveyAnswer): Promise<SurveyAnswer> {
    const [created] = await db.insert(surveyAnswers).values(answer).returning();
    return created;
  }

  // ==================== Vendors / Suppliers ====================

  async getVendors(activeOnly: boolean = true): Promise<Vendor[]> {
    if (activeOnly) {
      return await db.select().from(vendors).where(eq(vendors.isActive, true)).orderBy(vendors.name);
    }
    return await db.select().from(vendors).orderBy(vendors.name);
  }

  async getVendorById(id: number): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor;
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [created] = await db.insert(vendors).values(vendor).returning();
    return created;
  }

  async updateVendor(id: number, vendor: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const [updated] = await db
      .update(vendors)
      .set({ ...vendor, updatedAt: new Date() })
      .where(eq(vendors.id, id))
      .returning();
    return updated;
  }

  async deactivateVendor(id: number): Promise<void> {
    // Soft-delete: never hard-delete vendors that have purchases tied to them.
    await db.update(vendors).set({ isActive: false, updatedAt: new Date() }).where(eq(vendors.id, id));
  }

  // ==================== Purchases ====================

  async getPurchases(
    branchId?: number,
    vendorId?: number,
    status?: string,
    startDate?: string,
    endDate?: string
  ): Promise<Purchase[]> {
    const conditions = [];
    if (branchId) conditions.push(eq(purchases.branchId, branchId));
    if (vendorId) conditions.push(eq(purchases.vendorId, vendorId));
    if (status) conditions.push(eq(purchases.status, status));
    if (startDate) conditions.push(gte(purchases.purchaseDate, startDate));
    if (endDate) conditions.push(lte(purchases.purchaseDate, endDate));

    if (conditions.length > 0) {
      return await db.select().from(purchases).where(and(...conditions)).orderBy(desc(purchases.purchaseDate));
    }
    return await db.select().from(purchases).orderBy(desc(purchases.purchaseDate));
  }

  async getPurchaseById(id: number): Promise<Purchase | undefined> {
    const [p] = await db.select().from(purchases).where(eq(purchases.id, id));
    return p;
  }

  async createPurchase(
    purchase: InsertPurchase & { purchaseNumber?: string; createdBy?: string | null }
  ): Promise<Purchase> {
    const purchaseNumber = purchase.purchaseNumber || (await this.getNextPurchaseNumber());
    // For cash purchases the paid amount equals total; for credit it starts at 0.
    const isCredit = (purchase.paymentMethod ?? "credit") === "credit";
    const initialPaid = isCredit ? 0 : purchase.totalAmount;
    const initialStatus = isCredit ? "pending" : "paid";

    const [created] = await db
      .insert(purchases)
      .values({
        ...purchase,
        purchaseNumber,
        paidAmount: initialPaid,
        status: initialStatus,
      })
      .returning();
    return created;
  }

  async updatePurchase(id: number, purchase: Partial<InsertPurchase>): Promise<Purchase | undefined> {
    const [updated] = await db.update(purchases).set(purchase).where(eq(purchases.id, id)).returning();
    return updated;
  }

  async deletePurchase(id: number): Promise<void> {
    await db.delete(purchases).where(eq(purchases.id, id));
  }

  async getNextPurchaseNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const result = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt FROM purchases
      WHERE purchase_number LIKE ${`PUR-${year}${month}-%`}
    `);
    const cnt = (result.rows?.[0] as any)?.cnt ?? 0;
    return `PUR-${year}${month}-${String(cnt + 1).padStart(4, "0")}`;
  }

  // ==================== Anomaly decisions ====================

  // Records a decision (reviewed | not_error) on a specific anomaly source.
  // 'reviewed' soft-acknowledges and auto-expires after 30 days.
  // 'not_error' is a permanent suppression for that source record.
  async recordAnomalyDecision(decision: InsertAnomalyDecision): Promise<AnomalyDecision> {
    const expiresAt = decision.decision === "reviewed"
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : null;
    const [created] = await db
      .insert(anomalyDecisions)
      .values({ ...decision, expiresAt })
      .returning();
    return created;
  }

  // Returns active decisions enriched with the user display name (for
  // the "قرارات سابقة" list under anomalies) so the UI doesn't have to
  // do an N+1 lookup just to render the row author.
  async getActiveAnomalyDecisionsWithDetails(branchId?: number): Promise<
    (AnomalyDecision & { userName: string | null })[]
  > {
    const now = new Date();
    const branchClause = branchId ? eq(anomalyDecisions.branchId, branchId) : sql`TRUE`;
    const rows = await db
      .select()
      .from(anomalyDecisions)
      .where(
        and(
          branchClause,
          or(
            sql`${anomalyDecisions.expiresAt} IS NULL`,
            sql`${anomalyDecisions.expiresAt} > ${now}`
          )
        )
      )
      .orderBy(desc(anomalyDecisions.createdAt));
    if (rows.length === 0) return [];
    const userIds = Array.from(new Set(rows.map((r) => r.userId).filter((x): x is number => !!x)));
    const userRows = userIds.length
      ? await db.select().from(systemUsers).where(inArray(systemUsers.id, userIds))
      : [];
    const userById = new Map(userRows.map((u) => [u.id, u.displayName]));
    return rows.map((r) => ({ ...r, userName: r.userId ? userById.get(r.userId) ?? null : null }));
  }

  // Removes a decision so the underlying anomaly resurfaces on next
  // detection. Branch-scoped: a non-admin can't delete a decision from
  // another branch (enforcedBranchId === null means admin, no scope).
  async deleteAnomalyDecision(id: number, enforcedBranchId: number | null): Promise<boolean> {
    const conditions = [eq(anomalyDecisions.id, id)];
    if (enforcedBranchId !== null) {
      conditions.push(eq(anomalyDecisions.branchId, enforcedBranchId));
    }
    const result = await db.delete(anomalyDecisions).where(and(...conditions)).returning();
    return result.length > 0;
  }

  // Returns the set of anomaly source IDs that should be suppressed for the
  // current user's branch. Excludes 'reviewed' decisions whose 30-day expiry
  // has lapsed.
  async getActiveAnomalyDecisions(branchId?: number): Promise<AnomalyDecision[]> {
    const now = new Date();
    const branchClause = branchId ? eq(anomalyDecisions.branchId, branchId) : sql`TRUE`;
    return await db
      .select()
      .from(anomalyDecisions)
      .where(
        and(
          branchClause,
          // Either the decision never expires (not_error → expiresAt IS NULL)
          // OR it's still within its expiry window.
          or(
            sql`${anomalyDecisions.expiresAt} IS NULL`,
            sql`${anomalyDecisions.expiresAt} > ${now}`
          )
        )
      );
  }

  // ==================== Employee accuracy ====================

  // Aggregates per-user activity over a window. The createdBy column is
  // text (carries either system_users.id as string or "unknown" for old
  // rows); we group on it and join to systemUsers to surface display
  // names. Anonymous/unknown rows aggregate together.
  async getEmployeeAccuracy(params: {
    branchId?: number;
    startDate: string;
    endDate: string;
  }): Promise<{
    createdBy: string;
    displayName: string;
    role: string | null;
    branchId: number | null;
    expenseCount: number;
    expenseTotal: number;
    invoiceCount: number;
    invoiceTotal: number;
    purchaseCount: number;
    purchaseTotal: number;
    anomalyDecisionsCount: number;
  }[]> {
    const { branchId, startDate, endDate } = params;

    const expenseRows = await this.getExpenses(branchId, startDate, endDate);
    const invoiceRows = await this.getInvoices(branchId, undefined, undefined, startDate, endDate);
    const purchaseRows = await this.getPurchases(branchId, undefined, undefined, startDate, endDate);
    const anomalyDecisionRows = await db
      .select()
      .from(anomalyDecisions)
      .where(
        and(
          branchId ? eq(anomalyDecisions.branchId, branchId) : sql`TRUE`,
          gte(anomalyDecisions.createdAt, new Date(startDate)),
          lte(anomalyDecisions.createdAt, new Date(`${endDate}T23:59:59.999Z`))
        )
      );

    // Bucket by createdBy text key.
    const buckets = new Map<
      string,
      {
        expenseCount: number;
        expenseTotal: number;
        invoiceCount: number;
        invoiceTotal: number;
        purchaseCount: number;
        purchaseTotal: number;
        anomalyDecisionsCount: number;
      }
    >();
    const get = (key: string) => {
      let b = buckets.get(key);
      if (!b) {
        b = {
          expenseCount: 0,
          expenseTotal: 0,
          invoiceCount: 0,
          invoiceTotal: 0,
          purchaseCount: 0,
          purchaseTotal: 0,
          anomalyDecisionsCount: 0,
        };
        buckets.set(key, b);
      }
      return b;
    };

    for (const e of expenseRows) {
      const b = get(e.createdBy ?? "unknown");
      b.expenseCount += 1;
      b.expenseTotal += e.amount;
    }
    for (const i of invoiceRows) {
      const b = get(i.createdBy ?? "unknown");
      b.invoiceCount += 1;
      b.invoiceTotal += i.total;
    }
    for (const p of purchaseRows) {
      const b = get(p.createdBy ?? "unknown");
      b.purchaseCount += 1;
      b.purchaseTotal += p.totalAmount;
    }
    for (const d of anomalyDecisionRows) {
      // anomaly_decisions doesn't carry the offender's createdBy
      // directly — we attribute to whoever made the decision (the
      // accountant clearing the anomaly). It's still useful as a
      // workload signal even if not "errors caused by user X".
      const b = get(String(d.userId ?? "unknown"));
      b.anomalyDecisionsCount += 1;
    }

    // Resolve display names. createdBy stores systemUsers.id as text
    // for new rows; older rows are "unknown" and get a generic label.
    const numericIds = Array.from(buckets.keys())
      .map((k) => Number(k))
      .filter((n) => Number.isFinite(n));
    const sysUsers = numericIds.length
      ? await db.select().from(systemUsers).where(inArray(systemUsers.id, numericIds))
      : [];
    const userById = new Map(sysUsers.map((u) => [u.id, u]));

    return Array.from(buckets.entries()).map(([createdBy, agg]) => {
      const numId = Number(createdBy);
      const sysUser = Number.isFinite(numId) ? userById.get(numId) : undefined;
      return {
        createdBy,
        displayName: sysUser?.displayName ?? (createdBy === "unknown" ? "غير معروف" : `#${createdBy}`),
        role: sysUser?.role ?? null,
        branchId: sysUser?.branchId ?? null,
        ...agg,
      };
    });
  }

  // ==================== AI memory notes ====================

  async getAiMemoryNotes(branchId?: number, activeOnly = true): Promise<AiMemoryNote[]> {
    const conditions = [];
    if (activeOnly) conditions.push(eq(aiMemoryNotes.isActive, true));
    if (branchId !== undefined) {
      // Notes scoped to this branch OR global notes.
      conditions.push(or(
        eq(aiMemoryNotes.branchId, branchId),
        sql`${aiMemoryNotes.branchId} IS NULL`
      ));
    }
    if (conditions.length === 0) {
      return await db.select().from(aiMemoryNotes).orderBy(desc(aiMemoryNotes.updatedAt));
    }
    return await db.select().from(aiMemoryNotes).where(and(...conditions)).orderBy(desc(aiMemoryNotes.updatedAt));
  }

  async createAiMemoryNote(note: InsertAiMemoryNote): Promise<AiMemoryNote> {
    const [created] = await db.insert(aiMemoryNotes).values(note).returning();
    return created;
  }

  async updateAiMemoryNote(id: number, updates: Partial<InsertAiMemoryNote>): Promise<AiMemoryNote | undefined> {
    const [updated] = await db
      .update(aiMemoryNotes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(aiMemoryNotes.id, id))
      .returning();
    return updated;
  }

  async deleteAiMemoryNote(id: number): Promise<void> {
    // Soft-delete via isActive so any historical decisions referencing the
    // note remain queryable.
    await db.update(aiMemoryNotes).set({ isActive: false, updatedAt: new Date() }).where(eq(aiMemoryNotes.id, id));
  }

  // Returns notes relevant to a given anomaly. Filters by scope so a
  // patient-related anomaly doesn't load expense-only notes, and by
  // branch so global notes always show but other-branch notes never do.
  async getRelevantAiNotesForAnomaly(params: {
    sourceType: "expense" | "invoice" | "patient";
    branchId: number;
    category?: string;
  }): Promise<AiMemoryNote[]> {
    const conditions = [
      eq(aiMemoryNotes.isActive, true),
      or(
        eq(aiMemoryNotes.scope, "general"),
        eq(aiMemoryNotes.scope, params.sourceType)
      ),
      or(
        sql`${aiMemoryNotes.branchId} IS NULL`,
        eq(aiMemoryNotes.branchId, params.branchId)
      ),
    ];
    if (params.category) {
      conditions.push(or(
        sql`${aiMemoryNotes.category} IS NULL`,
        eq(aiMemoryNotes.category, params.category)
      ));
    } else {
      conditions.push(sql`${aiMemoryNotes.category} IS NULL`);
    }
    return await db
      .select()
      .from(aiMemoryNotes)
      .where(and(...conditions))
      .orderBy(desc(aiMemoryNotes.updatedAt))
      .limit(8);
  }

  async getPurchasesSummary(
    branchId?: number,
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalPurchases: number;
    totalPaid: number;
    totalOutstanding: number;
    purchaseCount: number;
  }> {
    const conditions = [];
    if (branchId) conditions.push(eq(purchases.branchId, branchId));
    if (startDate) conditions.push(gte(purchases.purchaseDate, startDate));
    if (endDate) conditions.push(lte(purchases.purchaseDate, endDate));

    const baseQuery = db
      .select({
        totalPurchases: sql<string>`COALESCE(SUM(${purchases.totalAmount}), 0)`,
        totalPaid: sql<string>`COALESCE(SUM(${purchases.paidAmount}), 0)`,
        purchaseCount: sql<string>`COUNT(*)`,
      })
      .from(purchases);

    const result = conditions.length > 0
      ? await baseQuery.where(and(...conditions))
      : await baseQuery;
    const row = result[0];
    const totalPurchases = Number(row?.totalPurchases) || 0;
    const totalPaid = Number(row?.totalPaid) || 0;
    return {
      totalPurchases,
      totalPaid,
      totalOutstanding: totalPurchases - totalPaid,
      purchaseCount: Number(row?.purchaseCount) || 0,
    };
  }
}

export const storage = new DatabaseStorage();
