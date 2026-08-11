import { db } from "./db";
import {
  patients, payments, documents, visits, branches, users, customStats, expenses, installmentPlans, invoices, invoiceItems, vendors, purchases,
  anomalyDecisions, aiMemoryNotes, followUpCalls, auditLog, journalLines,
  prostheticWorkOrders, prostheticWorkHistory, prostheticReworkEvents,
  patientCases, type PatientCase,
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
  type FollowUpCall, type InsertFollowUpCall,
  type SystemSetting, type BranchPassword, type BranchSetting, type InsertBranchSetting,
  type SystemUser, type InsertSystemUser,
  type TreatmentPlan, type InsertTreatmentPlan,
  type SurveyTemplate, type InsertSurveyTemplate,
  type SurveyQuestion, type InsertSurveyQuestion,
  type SurveyResponse, type InsertSurveyResponse,
  type SurveyAnswer, type InsertSurveyAnswer,
  medicalExams, medicalExamAddenda, medicalExamRevisions,
  costEntries, patientEvents, patientContacts, patientLinkTokens,
} from "@shared/schema";
import { eq, desc, and, sum, or, isNull, gte, lte, sql, inArray } from "drizzle-orm";
import { wantedServices } from "@shared/case_signals";
import { mergePhysioPlan, describePhysioPlan } from "@shared/pricing";
import { normalizePhone, DEFAULT_PHONE_COUNTRY } from "@shared/phone";
import { FIRST_STAGE } from "@shared/manufacturing";
import { recordOrderCreatedEvent } from "./manufacturing/events";
import { mergeContactsInto } from "./patient_contacts/store";
import {
  computeScore, mergeTargets, PERFORMANCE_TARGETS_KEY,
  type PerformanceTargets, type RoleTarget, type ScoreBreakdown,
} from "./performance/config";

// Did a payment's service tag really change? null / undefined / "" are the
// same "untagged" identity — the edit dialogs always send the field, so an
// unchanged select must not count as a change.
function tagChanged(before: string | null | undefined, after: string | null | undefined): boolean {
  const norm = (v: string | null | undefined) => (v && v.trim() !== "" ? v.trim() : null);
  return norm(before) !== norm(after);
}

// Thrown when تخصيص is attempted while the patient already has an open order
// for the same service. Routes map it to 409.
export class ActiveAssignmentError extends Error {
  constructor() { super("active order exists for this service"); this.name = "ActiveAssignmentError"; }
}

// One row of the employee-accuracy panel. Numbers come from a mix of
// row-level createdBy attribution and the audit_log table.
export interface EmployeeAccuracyRow {
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
  // Reception-side activity counted from audit_log (the patients,
  // visits, and payments tables don't carry a createdBy column).
  patientCreateCount: number;
  visitCreateCount: number;
  paymentCreateCount: number;
  // Sum of all create events (expenses + invoices + purchases +
  // patients + visits + payments). Computed for scoring; must be
  // returned so the accuracy panel's "إجمالي الإدخالات" box isn't blank.
  totalEntries: number;
  anomalyDecisionsCount: number;
  editCount: number;
  deleteCount: number;
  loginCount: number;
  // Monthly performance signals (calendar-month, target-based scoring).
  activeDays: number;         // distinct Baghdad days with any audit action
  followUpsCount: number;     // follow-up calls logged by the user
  patientsCreated: number;    // patients this user created in the month
  patientsComplete: number;   // of those, how many have a phone filled
  lastActivityAt: string | null;
  score: number;
  // Per-dimension breakdown (points out of 100, achievement ratio, and the
  // role target used) so the panel can show progress vs target.
  breakdown: ScoreBreakdown;
  target: RoleTarget;
}

interface EmployeeAccuracyAccum {
  expenseCount: number;
  expenseTotal: number;
  invoiceCount: number;
  invoiceTotal: number;
  purchaseCount: number;
  purchaseTotal: number;
  patientCreateCount: number;
  visitCreateCount: number;
  paymentCreateCount: number;
  anomalyDecisionsCount: number;
  editCount: number;
  deleteCount: number;
  loginCount: number;
  lastActivityAt: Date | null;
}

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
  addPatientCaseType(params: {
    patientId: number;
    caseType: "amputee" | "medical_support" | "physiotherapy";
    fields: Partial<InsertPatient>;
    serviceCost: number;
    paidNow: number;
    expertUserId?: number | null;
    expectedDeliveryDate?: string | null;
    performedBy: number | null;
    skipWorkOrder?: boolean;
  }): Promise<{ patient: Patient; workOrderId: number | null }>;
  mergePatients(sourceId: number, targetId: number): Promise<{ patient: Patient; moved: Record<string, number> }>;
  getPatientsSince(branchId: number, cutoff: Date | null): Promise<Patient[]>;
  getPaymentsByBranchSince(branchId: number, cutoff: Date | null): Promise<Payment[]>;
  getVisitsByBranchSince(branchId: number, cutoff: Date | null): Promise<Visit[]>;
  getBranchFinanceTotals(branchId: number): Promise<{ totalCost: number; totalPatients: number; totalPaid: number; totalPayments: number }>;
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
  getInvoiceItemsForInvoices(invoiceIds: number[]): Promise<InvoiceItem[]>;
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
  }): Promise<EmployeeAccuracyRow[]>;
  getPerformanceTargets(): Promise<PerformanceTargets>;
  setPerformanceTargets(targets: PerformanceTargets): Promise<PerformanceTargets>;

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
  // Windowed reads for the detailed financial report: only rows since
  // `cutoff` (null = full history). Keeps that report fast as data grows.
  async getPatientsSince(branchId: number, cutoff: Date | null): Promise<Patient[]> {
    const conds = [eq(patients.branchId, branchId)];
    if (cutoff) conds.push(gte(patients.createdAt, cutoff));
    return await db.select().from(patients).where(and(...conds)).orderBy(desc(patients.createdAt));
  }
  async getPaymentsByBranchSince(branchId: number, cutoff: Date | null): Promise<Payment[]> {
    const conds = [eq(payments.branchId, branchId)];
    if (cutoff) conds.push(gte(payments.date, cutoff));
    return await db.select().from(payments).where(and(...conds)).orderBy(desc(payments.date));
  }
  async getVisitsByBranchSince(branchId: number, cutoff: Date | null): Promise<Visit[]> {
    const conds = [eq(visits.branchId, branchId), isNull(visits.deletedAt)];
    if (cutoff) conds.push(gte(visits.visitDate, cutoff));
    return await db.select().from(visits).where(and(...conds)).orderBy(desc(visits.visitDate));
  }
  // Dated cost-ledger rows for the daily report window (migration 033).
  async getCostEntriesByBranchSince(branchId: number, cutoff: Date | null) {
    const conds = [eq(costEntries.branchId, branchId)];
    if (cutoff) conds.push(gte(costEntries.createdAt, cutoff));
    return await db.select().from(costEntries).where(and(...conds)).orderBy(desc(costEntries.createdAt));
  }
  // Lifetime paid per patient — one grouped query, for the "still owed"
  // column next to old-debt payments in the daily report.
  async getPaidTotalsByPatientIds(ids: number[]): Promise<Map<number, number>> {
    if (ids.length === 0) return new Map();
    const rows = await db.select({
      patientId: payments.patientId,
      total: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
    }).from(payments).where(inArray(payments.patientId, ids)).groupBy(payments.patientId);
    return new Map(rows.map((r) => [r.patientId, Number(r.total)]));
  }
  // Whole-history totals for a branch via SQL aggregates (no row loading).
  async getBranchFinanceTotals(branchId: number): Promise<{
    totalCost: number; totalPatients: number; totalPaid: number; totalPayments: number;
  }> {
    const [pat, pay] = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int AS n, COALESCE(SUM(total_cost),0)::bigint AS s FROM patients WHERE branch_id = ${branchId}`),
      db.execute(sql`SELECT COUNT(*)::int AS n, COALESCE(SUM(amount),0)::bigint AS s FROM payments WHERE branch_id = ${branchId}`),
    ]);
    const p = pat.rows[0] as any, y = pay.rows[0] as any;
    return {
      totalCost: Number(p?.s ?? 0), totalPatients: Number(p?.n ?? 0),
      totalPaid: Number(y?.s ?? 0), totalPayments: Number(y?.n ?? 0),
    };
  }

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

  // Independent cases for a patient (Phase 1). Each row is one specialty with
  // its own details, cost, and (via case_id) its own visits and payments.
  async getCasesByPatientId(patientId: number): Promise<PatientCase[]> {
    return await db.select().from(patientCases)
      .where(eq(patientCases.patientId, patientId))
      .orderBy(patientCases.id);
  }

  // Set a case's cost. Scoped by patientId so a case can never be edited under
  // the wrong patient. Never touches patient.total_cost (reports unaffected).
  // Marks the cost 'manual' so the automatic cost floor never overrides it.
  async updateCaseCost(patientId: number, caseId: number, cost: number): Promise<PatientCase | undefined> {
    const [updated] = await db.update(patientCases)
      .set({ cost, costSource: "manual", updatedAt: new Date() })
      .where(and(eq(patientCases.id, caseId), eq(patientCases.patientId, patientId)))
      .returning();
    return updated;
  }

  // Ensure a patient_cases row exists for each active case flag, copying the
  // type-specific detail fields. Preserves existing case costs; only the very
  // first case-set gets the patient's total_cost (on the highest-priority
  // case: prosthetic > medical_support > physiotherapy). Idempotent.
  //
  // A patient "has" a case type if ANY of these signals is present, so a طرف
  // recorded only as a work order (or أطراف-tagged payments) surfaces even when
  // the is_amputee flag was never set:
  //   flag  OR  a work order of that service type  OR  a payment tagged for it.
  // Per-case cost is recovered from the "تكلفة: X" markers left by add-case-type
  // / new-service, so e.g. a 5M prosthetic added to a physio patient moves out
  // of the physio case into the prosthetic case — sum(case.cost) stays exactly
  // total_cost. The patient FLAGS and total_cost are NEVER changed here, so the
  // aggregate/financial reports (which count by flag + total_cost) are untouched.
  // Idempotent: only missing cases are created; existing case costs are moved
  // only for the cases created in THIS call.
  async syncPatientCases(patientId: number): Promise<void> {
    // ONE transaction + a per-patient advisory lock. Concurrent syncs for the
    // same patient (backfill loop + a payment retag + a merge) previously
    // interleaved ~10 autocommitted statements — the check-then-insert on case
    // rows could duplicate, and cost moves could half-apply. The xact-scoped
    // advisory lock serializes syncs per patient; the unique index from
    // migration 020 (+ onConflictDoNothing) is the database-level backstop.
    await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(919, ${patientId})`);
    const [p] = await tx.select().from(patients).where(eq(patients.id, patientId));
    if (!p) return;
    const clean = (o: Record<string, any>) =>
      Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== ""));

    // ---- signals -----------------------------------------------------------
    const wos = await tx.select({ st: prostheticWorkOrders.serviceType }).from(prostheticWorkOrders).where(eq(prostheticWorkOrders.patientId, patientId));
    const pays = await tx.select({ tag: payments.paymentTreatmentType }).from(payments).where(eq(payments.patientId, patientId));
    const hasWO = (st: string) => wos.some((w) => w.st === st);
    const PHYSIO_TAGS = new Set(["استشارة طبية", "روبوت", "تمارين تأهيلية", "أجهزة علاج طبيعي", "أبر صينية"]);
    // Tags can be COMPOUND ("روبوت، أطراف صناعية") when one receipt mixes
    // services — match by containment/split, never by exact equality.
    const hasTag = (pred: (t: string) => boolean) => pays.some((x) => x.tag && pred(x.tag));
    const tagParts = (t: string) => t.split(/[،,]/).map((x) => x.trim()).filter(Boolean);
    // The rule lives in shared/case_signals.ts so it can be tested without a
    // database — see `npm run test:case-signals`. In short: flags, work orders
    // and tagged payments always count; a service's own detail column counts
    // only for a patient with no classification at all (the legacy rescue),
    // because for a classified patient it is just what the registration form
    // left behind when the service type was switched.
    const want = wantedServices({
      isAmputee: !!p.isAmputee,
      isMedicalSupport: !!p.isMedicalSupport,
      isPhysiotherapy: !!p.isPhysiotherapy,
      hasProstheticWorkOrder: hasWO("prosthetic"),
      hasSupportWorkOrder: hasWO("medical_support"),
      hasProstheticTag: hasTag((t) => t.includes("أطراف صناعية")),
      hasSupportTag: hasTag((t) => t.includes("مساند طبية")),
      hasPhysioTag: hasTag((t) => tagParts(t).some((x) => PHYSIO_TAGS.has(x))),
      hasProstheticDetails: !!p.prostheticType || !!p.amputationSite,
      hasSupportDetails: !!p.supportType,
    });
    const wantProsthetic = want.prosthetic;
    const wantSupport = want.medical_support;
    const wantPhysio = want.physiotherapy;

    // ---- per-service cost from "تكلفة: X" markers --------------------------
    // Soft-deleted visits are excluded: a deleted add-case-type marker must not
    // keep moving money between cases.
    const markers = await tx.select({ notes: visits.notes }).from(visits)
      .where(and(eq(visits.patientId, patientId), isNull(visits.deletedAt)));
    const parseCost = (s: string | null) => { const m = (s || "").match(/تكلفة:\s*([\d,]+)/); return m ? Number(m[1].replace(/,/g, "")) : 0; };
    let prostheticMarkerCost = 0, supportMarkerCost = 0;
    for (const mk of markers) {
      const c = parseCost(mk.notes); if (!c) continue;
      if ((mk.notes || "").includes("أطراف")) prostheticMarkerCost += c;
      else if ((mk.notes || "").includes("مساند")) supportMarkerCost += c;
    }

    const preExisting = await tx.select().from(patientCases).where(eq(patientCases.patientId, patientId));
    const has = (t: string) => preExisting.some((c) => c.caseType === t);
    const firstEver = preExisting.length === 0;
    const otherCosts = (wantProsthetic ? prostheticMarkerCost : 0) + (wantSupport ? supportMarkerCost : 0);
    // On a first-ever sync the remainder (base cost) lands on the primary case.
    const primaryType = wantProsthetic ? "prosthetic" : wantSupport ? "medical_support" : "physiotherapy";

    const detailsFor = (t: string) => t === "prosthetic" ? clean({
      amputationSite: p.amputationSite, prostheticType: p.prostheticType, siliconType: p.siliconType,
      siliconSize: p.siliconSize, suspensionSystem: p.suspensionSystem, footType: p.footType,
      footSize: p.footSize, kneeJointType: p.kneeJointType, injurySide: p.injurySide,
      injuryCause: p.injuryCause, injuryDate: p.injuryDate, injuryType: p.injuryType,
    }) : t === "medical_support" ? clean({
      supportType: p.supportType, injurySide: p.injurySide, injuryCause: p.injuryCause, injuryDate: p.injuryDate,
    }) : clean({
      diseaseType: p.diseaseType, injuryType: p.injuryType, injuryArea: p.injuryArea, injuries: p.injuries, treatmentType: p.treatmentType,
    });

    const markerCostOf = (t: string) => t === "prosthetic" ? prostheticMarkerCost : t === "medical_support" ? supportMarkerCost : 0;
    let movedFromHolder = 0;
    const create = async (t: string) => {
      if (has(t)) return;
      let cost = markerCostOf(t);
      if (firstEver && t === primaryType) cost = Math.max(0, (p.totalCost || 0) - otherCosts);
      else if (!firstEver && cost > 0) movedFromHolder += cost; // moving this out of the pre-existing holder
      // onConflictDoNothing: if a concurrent path already created this case
      // (unique index uq_patient_cases_patient_type), keep the existing row.
      const inserted = await tx.insert(patientCases)
        .values({ patientId, branchId: p.branchId, caseType: t, cost, details: detailsFor(t) })
        .onConflictDoNothing()
        .returning({ id: patientCases.id });
      // If the insert was skipped, the marker cost was NOT placed on a new
      // case — undo its contribution so the holder isn't debited for it.
      if (inserted.length === 0 && !firstEver && cost > 0) movedFromHolder -= cost;
    };
    if (wantProsthetic) await create("prosthetic");
    if (wantSupport) await create("medical_support");
    if (wantPhysio) await create("physiotherapy");

    // Move the recovered marker cost OUT of the pre-existing case that holds the
    // total (usually the physio case created by the migration), preserving the
    // sum. A manually-priced holder is NEVER debited by automation.
    if (!firstEver && movedFromHolder > 0) {
      const holder = [...preExisting].filter((c) => c.costSource !== "manual").sort((a, b) => (b.cost || 0) - (a.cost || 0))[0];
      if (holder) await tx.update(patientCases).set({ cost: Math.max(0, (holder.cost || 0) - movedFromHolder), updatedAt: new Date() }).where(eq(patientCases.id, holder.id));
    }

    // ---- re-attribute tagged payments/markers to their real case -----------
    const cases = await tx.select().from(patientCases).where(eq(patientCases.patientId, patientId));
    const idOf = (t: string) => cases.find((c) => c.caseType === t)?.id ?? null;
    const prosId = idOf("prosthetic"), supId = idOf("medical_support");
    // Payments: containment match so compound tags ("روبوت، أطراف صناعية")
    // still reach the device case (prosthetic wins over support on a payment
    // carrying both — a broken receipt anyway).
    // Visits: ONLY unattributed rows (case_id IS NULL) may be re-homed by the
    // notes keyword — an attributed physiotherapy visit whose notes merely
    // mention "الأطراف" must never be stolen onto the device case (confirmed
    // bug: it was re-stolen on every sync even after manual correction).
    if (prosId) {
      await tx.update(payments).set({ caseId: prosId }).where(and(eq(payments.patientId, patientId), sql`${payments.paymentTreatmentType} LIKE '%أطراف صناعية%'`));
      await tx.update(visits).set({ caseId: prosId }).where(and(eq(visits.patientId, patientId), isNull(visits.caseId), sql`${visits.notes} LIKE '%أطراف%'`));
    }
    if (supId) {
      await tx.update(payments).set({ caseId: supId }).where(and(eq(payments.patientId, patientId), sql`${payments.paymentTreatmentType} LIKE '%مساند طبية%'`, sql`${payments.paymentTreatmentType} NOT LIKE '%أطراف صناعية%'`));
      await tx.update(visits).set({ caseId: supId }).where(and(eq(visits.patientId, patientId), isNull(visits.caseId), sql`${visits.notes} LIKE '%مساند%'`));
    }

    // Any still-unattributed rows (caseId IS NULL) — e.g. physio/untagged rows,
    // or rows whose case link was cleared during a merge — attach to the physio
    // case, or the primary case if there is none. Guarantees every visit/payment
    // shows under a case instead of vanishing from all per-case views.
    const fallbackId = idOf("physiotherapy") ?? idOf("prosthetic") ?? idOf("medical_support") ?? cases[0]?.id ?? null;
    if (fallbackId) {
      await tx.update(payments).set({ caseId: fallbackId }).where(and(eq(payments.patientId, patientId), isNull(payments.caseId)));
      await tx.update(visits).set({ caseId: fallbackId }).where(and(eq(visits.patientId, patientId), isNull(visits.caseId)));
    }

    // ---- cost floor: a case can never cost LESS than what was paid into it --
    // The app never stored a per-service price (work orders carry no cost), so
    // the truest recorded figure for what a طرف/مسند cost is the money recorded
    // against it. "paid ≤ cost" is a domain truth: you can't pay more than the
    // price. So any طرف/مسند case whose cost sits below its attributed paid total
    // (e.g. a fully-paid 7M طرف left at cost 0 because the total landed on the
    // physio holder) is raised to that paid total, and the difference is moved
    // OUT of the physio/auto holder. total_cost and the patient flags are NEVER
    // touched here → the aggregate/financial reports stay byte-identical.
    // HUMAN PRICING WINS: a case whose cost_source is 'manual' (per-case ✏️ /
    // تخصيص / add-case-type) is never raised NOR drained by the floor.
    const finalCases = await tx.select().from(patientCases).where(eq(patientCases.patientId, patientId));
    if (finalCases.length > 0) {
      const paidRows = await tx.select({ caseId: payments.caseId, amount: payments.amount })
        .from(payments).where(eq(payments.patientId, patientId));
      const paidByCase = new Map<number, number>();
      for (const r of paidRows) if (r.caseId) paidByCase.set(r.caseId, (paidByCase.get(r.caseId) || 0) + (r.amount || 0));
      // ONLY the physiotherapy (auto) case may fund a move — an explicitly
      // priced device must never be silently drained to cover another
      // device's shortfall. Device cases are RAISE-ONLY targets.
      const holder = finalCases.find((c) => c.caseType === "physiotherapy" && c.costSource !== "manual") ?? null;
      // Every auto device case is ALWAYS raised to its full paid amount —
      // even with no holder to fund the move (e.g. a device-only patient
      // whose aggregate was never priced: cost 0 with real payments used to
      // display "التكلفة: 0" forever). The holder is only debited for what it
      // actually has; an un-fundable remainder is honest new information
      // (money was taken without pricing), not an error.
      let holderCost = holder ? (holder.cost || 0) : 0;
      for (const c of finalCases) {
        if (holder && c.id === holder.id) continue;
        if (c.costSource === "manual") continue; // human pricing is untouchable
        if (c.caseType === "physiotherapy") continue; // the floor prices devices only
        const paid = paidByCase.get(c.id) || 0;
        const shortfall = paid - (c.cost || 0);
        if (shortfall > 0) {
          await tx.update(patientCases).set({ cost: (c.cost || 0) + shortfall, updatedAt: new Date() }).where(eq(patientCases.id, c.id));
          if (holder) holderCost = Math.max(0, holderCost - shortfall);
        }
      }
      if (holder && holderCost !== (holder.cost || 0)) {
        await tx.update(patientCases).set({ cost: holderCost, updatedAt: new Date() }).where(eq(patientCases.id, holder.id));
      }
    }
    });
  }

  // Post-exam physiotherapy pricing («الكلفة والجلسات» from the registry —
  // the physio mirror of assignManufacturing): bumps the patient's totalCost
  // by the server-computed amount, records the plan (treatmentType, total
  // sessions), and tops up the physiotherapy case cost by the SAME amount so
  // sum(case costs) stays in step. One transaction.
  async pricePhysiotherapy(patientId: number, params: {
    entries: { treatmentType: string; sessionCount: number; isFree?: boolean }[];
    totalCost: number;
    totalSessions: number;
    treatmentType: string;
  }): Promise<Patient> {
    return await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(patients).where(eq(patients.id, patientId));
      if (!existing) throw new Error("المريض غير موجود");
      // Remember HOW MANY sessions were sold, not just their price (036). The
      // page's counter measures visits against this; before it existed the
      // counts were computed, charged for, and then discarded — so a priced
      // patient read "0 sessions purchased" and went negative on first visit.
      //
      // If this patient has NO plan yet but DOES have session-bearing payments
      // (a per-session veteran buying his first package), the plan starts from
      // that payment history — the counter reads the plan alone once one
      // exists, so a plan of only the new package would erase his old sessions
      // and flip the counter negative: the exact ذي قار failure, through the
      // pricing door instead of the new-service door.
      let base = existing.physioPlan;
      if (!Array.isArray(base) || base.length === 0) {
        const priorPayments = await tx
          .select({ type: payments.paymentTreatmentType, n: payments.sessionCount })
          .from(payments)
          .where(eq(payments.patientId, patientId));
        const legacy = priorPayments
          .filter((r) => (r.n ?? 0) > 0)
          .map((r) => ({ treatmentType: (r.type ?? "").trim() || "غير محدد", sessionCount: r.n ?? 0 }));
        base = legacy.length > 0 ? mergePhysioPlan(null, legacy) : null;
      }
      const plan = mergePhysioPlan(base, params.entries);
      const [updated] = await tx.update(patients).set({
        totalCost: (existing.totalCost || 0) + params.totalCost,
        // The plan text carries the counts too, so the file reads
        // «روبوت (10 جلسات)» instead of a bare type name.
        treatmentType: describePhysioPlan(plan) || params.treatmentType,
        physioPlan: plan,
      }).where(eq(patients.id, patientId)).returning();
      if (params.totalCost > 0) {
        await tx.insert(costEntries).values({
          patientId, branchId: existing.branchId, amount: params.totalCost,
          source: "physio_pricing", notes: `الكلفة والجلسات: ${params.treatmentType}`,
        });
      }

      const [physioCase] = await tx.select().from(patientCases)
        .where(and(eq(patientCases.patientId, patientId), eq(patientCases.caseType, "physiotherapy")));
      if (physioCase) {
        await tx.update(patientCases)
          .set({ cost: (physioCase.cost || 0) + params.totalCost, updatedAt: new Date() })
          .where(eq(patientCases.id, physioCase.id));
      } else {
        await tx.insert(patientCases).values({
          patientId, branchId: existing.branchId, caseType: "physiotherapy", cost: params.totalCost,
        }).onConflictDoNothing();
      }
      return updated;
    });
  }

  // Add a service's price onto the case it belongs to (resolved from its
  // treatment tag), keeping sum(case costs) in step with the total_cost bump
  // the caller makes. Device cases become 'manual' (an explicitly priced
  // sale); the physio case keeps its costSource so the floor's holder logic
  // still works. Never touches patients.total_cost itself.
  async addToCaseCost(patientId: number, opts: { tag?: string | null; treatmentType?: string | null }, amount: number): Promise<void> {
    if (!(amount > 0)) return;
    let caseId = await this.resolveCaseId(patientId, opts);
    if (!caseId) {
      await this.syncPatientCases(patientId);
      caseId = await this.resolveCaseId(patientId, opts);
    }
    if (!caseId) return;
    const [c] = await db.select().from(patientCases).where(eq(patientCases.id, caseId));
    if (!c) return;
    const isDevice = c.caseType === "prosthetic" || c.caseType === "medical_support";
    await db.update(patientCases)
      .set({ cost: (c.cost || 0) + amount, ...(isDevice ? { costSource: "manual" } : {}), updatedAt: new Date() })
      .where(eq(patientCases.id, caseId));
  }

  // Which case a new payment/visit settles, from its treatment tag / type.
  // Mirrors the migration's linking so new rows attribute consistently.
  async resolveCaseId(patientId: number, opts: { tag?: string | null; treatmentType?: string | null }): Promise<number | null> {
    const cases = await db.select().from(patientCases).where(eq(patientCases.patientId, patientId));
    if (cases.length === 0) return null;
    const byType = (t: string) => cases.find((c) => c.caseType === t)?.id ?? null;
    const order: Record<string, number> = { prosthetic: 1, medical_support: 2, physiotherapy: 3 };
    const primary = [...cases].sort((a, b) => (order[a.caseType] ?? 9) - (order[b.caseType] ?? 9))[0]?.id ?? null;
    const tag = opts.tag ?? "";
    // Containment (not equality): compound tags like "روبوت، أطراف صناعية"
    // must still resolve to the device case.
    if (tag.includes("أطراف صناعية")) return byType("prosthetic") ?? primary;
    if (tag.includes("مساند طبية")) return byType("medical_support") ?? primary;
    if (opts.treatmentType || tag) { const ph = byType("physiotherapy"); if (ph) return ph; }
    return primary;
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const { registrationDate, ...patientData } = insertPatient as InsertPatient & { registrationDate?: string | null };

    const valuesToInsert: any = { ...patientData };

    // نقطة الخنق الوحيدة لتطبيع رقم الاتصال عند الإنشاء. الأعمدة الثلاثة
    // المشتقّة تُكتب من الدالّة دائماً — فقيمة يرسلها العميل لأيٍّ منها
    // تُستبدَل هنا ولا تصل القاعدة. `phone` يُحفظ كما كُتب بعد قصّ الأطراف.
    {
      const n = normalizePhone(valuesToInsert.phone, valuesToInsert.phoneCountry || DEFAULT_PHONE_COUNTRY);
      valuesToInsert.phone = n.raw || null;
      valuesToInsert.phoneE164 = n.e164;
      valuesToInsert.phoneCountry = n.country;
      valuesToInsert.phoneStatus = n.status;
    }

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
    if ((patient.totalCost || 0) > 0) {
      // Dated at the patient's own createdAt so a backdated registration lands
      // its cost on the day the owner chose, not the day the form was typed.
      await db.insert(costEntries).values({
        patientId: patient.id, branchId: patient.branchId,
        amount: patient.totalCost || 0, source: "registration",
        notes: "كلفة التسجيل", createdAt: patient.createdAt ?? undefined,
      });
    }
    // Create the case row(s) for this new patient from its flags (Phase 3).
    await this.syncPatientCases(patient.id);
    return patient;
  }

  async updatePatient(id: number, updates: Partial<InsertPatient>, costSource: string = "manual_edit"): Promise<Patient | undefined> {
    // The generic patch is one of the ways total_cost moves (management edit,
    // خدمة جديدة, paid visit) — the ledger entry is written here, at the choke
    // point, so no caller can move the number without dating the move.
    const wantsCost = (updates as any).totalCost !== undefined;
    const [before] = wantsCost
      ? await db.select({ totalCost: patients.totalCost, branchId: patients.branchId }).from(patients).where(eq(patients.id, id))
      : [undefined as any];

    // Phone: same choke point as the cost ledger. The three derived columns
    // are NEVER writable by a caller — they are stripped unconditionally and
    // re-derived only when `phone` itself is part of the patch. Without the
    // strip, a body carrying `phoneStatus: "ok"` with no `phone` would mark a
    // garbage number as clean.
    const patch: any = { ...updates };
    delete patch.phoneE164;
    delete patch.phoneCountry;
    delete patch.phoneStatus;
    if ((updates as any).phone !== undefined) {
      // The stored country is the normalization hint, so re-typing a Turkish
      // number on a Turkish file still resolves as Turkish.
      const [existing] = await db
        .select({ phoneCountry: patients.phoneCountry })
        .from(patients)
        .where(eq(patients.id, id));
      const hint = (updates as any).phoneCountry || existing?.phoneCountry || DEFAULT_PHONE_COUNTRY;
      const n = normalizePhone((updates as any).phone, hint);
      patch.phone = n.raw || null;
      patch.phoneE164 = n.e164;
      patch.phoneCountry = n.country;
      patch.phoneStatus = n.status;
    }

    // Stripping the derived columns can empty an otherwise-valid patch (a body
    // carrying ONLY `phoneStatus`, for instance). Drizzle throws "No values to
    // set" on an empty .set(), which would surface as a 500 on a request that
    // asks for nothing — so answer it with the current row instead. Found by
    // the live Postgres run, not by types.
    if (Object.keys(patch).length === 0) {
      const [current] = await db.select().from(patients).where(eq(patients.id, id));
      return current;
    }

    const [updated] = await db.update(patients)
      // Cast: drizzle-zod widens the jsonb columns (physioPlan) into a shape
      // Drizzle's own .set() type doesn't accept back. The values are validated
      // by the callers that build them, not by this assignment.
      .set(patch as any)
      .where(eq(patients.id, id))
      .returning();
    if (updated && wantsCost && before) {
      const delta = (updated.totalCost || 0) - (before.totalCost || 0);
      if (delta !== 0) {
        await db.insert(costEntries).values({
          patientId: id, branchId: updated.branchId, amount: delta, source: costSource,
        });
      }
    }
    return updated;
  }

  async deletePatient(id: number): Promise<void> {
    // ONE transaction: a patient delete either fully completes or leaves
    // NOTHING destroyed. Previously each child delete auto-committed, so a
    // late FK failure (e.g. the patient_cases reference added in migration
    // 017) would leave the patient stripped of payments/visits/documents but
    // still present — irreversible partial destruction.
    await db.transaction(async (tx) => {
      const patientInvoices = await tx.select({ id: invoices.id }).from(invoices).where(eq(invoices.patientId, id));
      for (const inv of patientInvoices) {
        await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, inv.id));
      }
      await tx.delete(invoices).where(eq(invoices.patientId, id));
      await tx.delete(installmentPlans).where(eq(installmentPlans.patientId, id));
      await tx.delete(payments).where(eq(payments.patientId, id));
      await tx.delete(documents).where(eq(documents.patientId, id));
      await tx.delete(visits).where(eq(visits.patientId, id));
      // Medical exams must go BEFORE patient_cases: medical_exams.case_id
      // points at the case row, and its children (addenda, revisions) point at
      // the exam. Deleting the exam rows here is the ONE legitimate hard-delete
      // path for a sealed record — and the BEFORE DELETE trigger from
      // migration 028 snapshots every row into medical_exams_forensic_log
      // (which has no FKs and survives), so even a full patient delete leaves
      // the clinical evidence behind.
      const examRows = await tx.select({ id: medicalExams.id })
        .from(medicalExams)
        .where(eq(medicalExams.patientId, id));
      if (examRows.length > 0) {
        const examIds = examRows.map((e) => e.id);
        await tx.delete(medicalExamAddenda).where(inArray(medicalExamAddenda.examId, examIds));
        await tx.delete(medicalExamRevisions).where(inArray(medicalExamRevisions.examId, examIds));
        await tx.delete(medicalExams).where(eq(medicalExams.patientId, id));
      }
      // patient_cases must go AFTER payments/visits/exams (their case_id FKs
      // point here) and BEFORE the patient row (its patient_id FK points there).
      await tx.delete(patientCases).where(eq(patientCases.patientId, id));
      // Manufacturing work orders (and their append-only history / rework) hold a
      // FK to the patient, so they must be removed for a full patient delete —
      // otherwise the delete fails. (The append-only rule protects a LIVE order's
      // trail, not a patient being permanently deleted.)
      const woRows = await tx.select({ id: prostheticWorkOrders.id })
        .from(prostheticWorkOrders)
        .where(eq(prostheticWorkOrders.patientId, id));
      if (woRows.length > 0) {
        const woIds = woRows.map((w) => w.id);
        await tx.delete(prostheticWorkHistory).where(inArray(prostheticWorkHistory.workOrderId, woIds));
        await tx.delete(prostheticReworkEvents).where(inArray(prostheticReworkEvents.workOrderId, woIds));
        await tx.delete(prostheticWorkOrders).where(eq(prostheticWorkOrders.patientId, id));
      }
      // Remaining FK holders that used to make the delete fail silently:
      // follow-up calls, treatment plans, and survey responses (+answers) go
      // with the patient; journal lines are ACCOUNTING history and must
      // survive — detach them from the patient instead of deleting.
      await tx.delete(followUpCalls).where(eq(followUpCalls.patientId, id));
      await tx.delete(treatmentPlans).where(eq(treatmentPlans.patientId, id));
      const respRows = await tx.select({ id: surveyResponses.id })
        .from(surveyResponses)
        .where(eq(surveyResponses.patientId, id));
      if (respRows.length > 0) {
        const respIds = respRows.map((r) => r.id);
        await tx.delete(surveyAnswers).where(inArray(surveyAnswers.responseId, respIds));
        await tx.delete(surveyResponses).where(eq(surveyResponses.patientId, id));
      }
      await tx.update(journalLines).set({ patientId: null }).where(eq(journalLines.patientId, id));
      // Cost-ledger rows FK the patient (migration 033) and their money
      // vanishes from every total with the row, so they go with it too.
      await tx.delete(costEntries).where(eq(costEntries.patientId, id));
      // The event log FKs the patient (migration 044). It is the patient's own
      // narrative, so it goes with them. Nothing references patient_events, so
      // its position here is free — it only has to precede the patient row.
      // NOTE: the append-only trigger guards UPDATE only, never DELETE —
      // guarding DELETE would have broken patient deletion for every user,
      // which this project has already lived through once.
      await tx.delete(patientEvents).where(eq(patientEvents.patientId, id));
      // هوية التواصل (migration 047) — حذفٌ صريح لا كاسكيد صامت: القاعدة
      // الملزِمة في هذا المشروع أن كل جدول جديد يشير إلى `patients` يُضاف
      // هنا بيده، فنسيانُه يُكشَف باختبار حذفٍ حقيقي لا بعطلٍ عند مستخدم.
      await tx.delete(patientLinkTokens).where(eq(patientLinkTokens.patientId, id));
      await tx.delete(patientContacts).where(eq(patientContacts.patientId, id));
      await tx.delete(patients).where(eq(patients.id, id));
    });
  }

  // Adds a case type (amputee / medical_support / physiotherapy) to an
  // EXISTING patient — the one-person-one-record principle: the same human
  // never gets a second patient row just because a new service type started.
  // Atomic: flags + optional cost + optional payment + (for manufacturing
  // types) the work order and its first history row all commit together.
  async addPatientCaseType(params: {
    patientId: number;
    caseType: "amputee" | "medical_support" | "physiotherapy";
    fields: Partial<InsertPatient>;
    serviceCost: number;
    paidNow: number;
    expertUserId?: number | null;
    expectedDeliveryDate?: string | null;
    performedBy: number | null;
    skipWorkOrder?: boolean;
  }): Promise<{ patient: Patient; workOrderId: number | null }> {
    const { patientId, caseType, fields, serviceCost, paidNow } = params;
    return await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(patients).where(eq(patients.id, patientId));
      if (!existing) throw new Error("المريض غير موجود");

      const flagPatch: any = { ...fields };
      if (caseType === "amputee") flagPatch.isAmputee = true;
      else if (caseType === "medical_support") flagPatch.isMedicalSupport = true;
      else flagPatch.isPhysiotherapy = true;
      if (serviceCost > 0) flagPatch.totalCost = (existing.totalCost || 0) + serviceCost;

      const [patient] = await tx.update(patients)
        .set(flagPatch)
        .where(eq(patients.id, patientId))
        .returning();
      if (serviceCost > 0) {
        await tx.insert(costEntries).values({
          patientId, branchId: existing.branchId, amount: serviceCost, source: "add_case_type",
        });
      }

      const caseLabel = caseType === "amputee" ? "أطراف صناعية"
        : caseType === "medical_support" ? "مساند طبية" : "علاج طبيعي";

      // Create (or top up) the independent case row for this type, with THIS
      // service's cost and details — so the new case is fully isolated with its
      // own balance from the moment it's added (Phase 3).
      const caseTypeKey = caseType === "amputee" ? "prosthetic"
        : caseType === "medical_support" ? "medical_support" : "physiotherapy";
      const detailsForType: Record<string, any> = caseTypeKey === "prosthetic" ? {
        amputationSite: patient.amputationSite, prostheticType: patient.prostheticType,
        siliconType: patient.siliconType, siliconSize: patient.siliconSize,
        suspensionSystem: patient.suspensionSystem, footType: patient.footType,
        footSize: patient.footSize, kneeJointType: patient.kneeJointType, injurySide: patient.injurySide,
        injuryCause: patient.injuryCause, injuryDate: patient.injuryDate, injuryType: patient.injuryType,
      } : caseTypeKey === "medical_support" ? {
        supportType: patient.supportType, injurySide: patient.injurySide,
        injuryCause: patient.injuryCause, injuryDate: patient.injuryDate,
      } : {
        diseaseType: patient.diseaseType, injuryType: patient.injuryType, injuryArea: patient.injuryArea,
        injuries: patient.injuries, treatmentType: patient.treatmentType,
      };
      const cleanDetails = Object.fromEntries(Object.entries(detailsForType).filter(([, v]) => v !== null && v !== undefined && v !== ""));
      const [existingCase] = await tx.select().from(patientCases)
        .where(and(eq(patientCases.patientId, patientId), eq(patientCases.caseType, caseTypeKey)));
      let caseId: number;
      if (existingCase) {
        caseId = existingCase.id;
        if (serviceCost > 0) {
          // A human priced this addition — mark manual so the floor keeps out.
          await tx.update(patientCases).set({ cost: (existingCase.cost || 0) + serviceCost, costSource: "manual", updatedAt: new Date() }).where(eq(patientCases.id, caseId));
        }
      } else {
        const [newCase] = await tx.insert(patientCases).values({
          patientId, branchId: existing.branchId, caseType: caseTypeKey, cost: serviceCost, details: cleanDetails,
          costSource: serviceCost > 0 ? "manual" : "auto",
        }).onConflictDoNothing().returning();
        // Unique-index race: another path created the case between our select
        // and insert — fall back to the existing row.
        if (newCase) {
          caseId = newCase.id;
        } else {
          const [raced] = await tx.select().from(patientCases)
            .where(and(eq(patientCases.patientId, patientId), eq(patientCases.caseType, caseTypeKey)));
          caseId = raced.id;
          if (serviceCost > 0) {
            await tx.update(patientCases).set({ cost: (raced.cost || 0) + serviceCost, costSource: "manual", updatedAt: new Date() }).where(eq(patientCases.id, caseId));
          }
        }
      }

      // Timeline marker so the patient's history shows when the new case
      // type started — attributed to the new case.
      await tx.insert(visits).values({
        patientId,
        branchId: existing.branchId,
        caseId,
        details: "إضافة نوع حالة",
        notes: `إضافة نوع حالة: ${caseLabel}${serviceCost > 0 ? ` (تكلفة: ${serviceCost.toLocaleString()} د.ع)` : ""}`,
      });

      if (paidNow > 0) {
        await tx.insert(payments).values({
          patientId,
          branchId: existing.branchId,
          caseId,
          amount: paidNow,
          notes: `دفعة عند إضافة نوع حالة: ${caseLabel}`,
        });
      }

      // Manufacturing types get a work order assigned to ONE expert, with
      // the first history row — same shape as new-patient registration.
      // Consultation-only additions skip the work order entirely (created
      // later via "بدء التصنيع" once the patient commits).
      let workOrderId: number | null = null;
      if (caseType !== "physiotherapy" && !params.skipWorkOrder) {
        if (!params.expertUserId) throw new Error("يجب اختيار الخبير المسؤول عن التصنيع");
        const [wo] = await tx.insert(prostheticWorkOrders).values({
          patientId,
          branchId: existing.branchId,
          expertUserId: params.expertUserId,
          serviceType: caseType === "amputee" ? "prosthetic" : "medical_support",
          status: "active",
          currentStage: FIRST_STAGE,
          expectedDeliveryDate: params.expectedDeliveryDate ?? null,
          assignedBy: params.performedBy,
        }).returning();
        const [created] = await tx.insert(prostheticWorkHistory).values({
          workOrderId: wo.id,
          actionType: "created",
          fromStage: null,
          toStage: FIRST_STAGE,
          notes: `إنشاء أمر تصنيع عند إضافة نوع حالة (${caseLabel}) لمريض موجود`,
          performedBy: params.performedBy,
        }).returning({ id: prostheticWorkHistory.id });
        // مسار إنشاء ثالث للأمر — والمريض يستحقّ خبر فتحه مهما كان الباب.
        await recordOrderCreatedEvent(tx, {
          order: wo, stage: FIRST_STAGE, historyId: created.id,
        });
        workOrderId = wo.id;
      }

      return { patient, workOrderId };
    });
  }

  // Post-exam "تخصيص الطرف/المسند": the doctor decided the device specs and the
  // patient agreed to buy, so reception now (in ONE step) records the device
  // details + the price + assigns the expert. Updates the patient's device
  // fields, sets the (existing) case's cost to the agreed price and adjusts
  // total_cost by the delta, refreshes the case details, and creates the work
  // order for the chosen expert (NO delivery date — the expert commits to that
  // at the mold stage). All atomic.
  async assignManufacturing(params: {
    patientId: number;
    serviceType: "prosthetic" | "medical_support";
    fields: Partial<InsertPatient>;
    cost: number;
    expertUserId: number;
    assignedBy: number | null;
  }): Promise<{ patient: Patient; workOrderId: number }> {
    const { patientId, serviceType, fields, cost, expertUserId, assignedBy } = params;
    const result = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(patients).where(eq(patients.id, patientId));
      if (!existing) throw new Error("المريض غير موجود");

      // One active order per (patient, service) — enforced INSIDE the
      // transaction (plus the partial unique index from migration 021), so two
      // simultaneous clicks can't create duplicate orders.
      const openWo = await tx.select({ id: prostheticWorkOrders.id }).from(prostheticWorkOrders)
        .where(and(
          eq(prostheticWorkOrders.patientId, patientId),
          eq(prostheticWorkOrders.serviceType, serviceType),
          sql`${prostheticWorkOrders.status} NOT IN ('completed','cancelled')`,
        )).limit(1);
      if (openWo.length > 0) throw new ActiveAssignmentError();

      const [existingCase] = await tx.select().from(patientCases)
        .where(and(eq(patientCases.patientId, patientId), eq(patientCases.caseType, serviceType)));
      const oldCaseCost = existingCase?.cost || 0;

      // How the entered price moves patients.total_cost:
      // - New case, human-priced case, or price >= current case cost:
      //   delta semantics (total follows the price difference) — correct for
      //   the new flow (case 0 → total += price) and for explicit re-pricing.
      // - LEGACY trap: an 'auto' case that inherited the WHOLE old aggregate
      //   (migration 017 put total_cost on the device case of a device+physio
      //   patient, physio got 0). Entering the real device price there must
      //   NOT shrink total_cost by the physio share — instead the excess is
      //   parked back on the physio case and the total stays untouched.
      let totalDelta = cost - oldCaseCost;
      if (existingCase && existingCase.costSource !== "manual" && oldCaseCost > cost) {
        const [physioCase] = await tx.select().from(patientCases)
          .where(and(eq(patientCases.patientId, patientId), eq(patientCases.caseType, "physiotherapy")));
        if (physioCase) {
          await tx.update(patientCases)
            .set({ cost: (physioCase.cost || 0) + (oldCaseCost - cost), updatedAt: new Date() })
            .where(eq(patientCases.id, physioCase.id));
          totalDelta = 0;
        }
      }

      // Update device fields + flag + total_cost.
      const patch: any = { ...fields };
      if (serviceType === "prosthetic") patch.isAmputee = true; else patch.isMedicalSupport = true;
      patch.totalCost = Math.max(0, (existing.totalCost || 0) + totalDelta);
      const [patient] = await tx.update(patients).set(patch).where(eq(patients.id, patientId)).returning();
      // Ledger the APPLIED delta (after the zero clamp), signed — a downward
      // re-pricing is a real negative cost event and must date-stamp too.
      const appliedDelta = (patient.totalCost || 0) - (existing.totalCost || 0);
      if (appliedDelta !== 0) {
        await tx.insert(costEntries).values({
          patientId, branchId: existing.branchId, amount: appliedDelta,
          source: "assign_manufacturing",
          notes: serviceType === "prosthetic" ? "تخصيص طرف صناعي" : "تخصيص مسند طبي",
        });
      }

      // Build the case details from the freshly-updated patient fields.
      const detailsForType: Record<string, any> = serviceType === "prosthetic" ? {
        amputationSite: patient.amputationSite, prostheticType: patient.prostheticType,
        siliconType: patient.siliconType, siliconSize: patient.siliconSize,
        suspensionSystem: patient.suspensionSystem, footType: patient.footType,
        footSize: patient.footSize, kneeJointType: patient.kneeJointType, injurySide: patient.injurySide,
        injuryCause: patient.injuryCause, injuryDate: patient.injuryDate, injuryType: patient.injuryType,
      } : {
        supportType: patient.supportType, injurySide: patient.injurySide,
        injuryCause: patient.injuryCause, injuryDate: patient.injuryDate,
      };
      const cleanDetails = Object.fromEntries(Object.entries(detailsForType).filter(([, v]) => v !== null && v !== undefined && v !== ""));

      let caseId: number;
      if (existingCase) {
        caseId = existingCase.id;
        // A human priced the device — 'manual' keeps the cost floor away.
        await tx.update(patientCases).set({ cost, costSource: "manual", details: cleanDetails, updatedAt: new Date() }).where(eq(patientCases.id, caseId));
      } else {
        const [nc] = await tx.insert(patientCases).values({
          patientId, branchId: existing.branchId, caseType: serviceType, cost, details: cleanDetails, costSource: "manual",
        }).onConflictDoNothing().returning();
        if (nc) {
          caseId = nc.id;
        } else {
          // Unique-index race: fall back to the row the concurrent path made.
          const [raced] = await tx.select().from(patientCases)
            .where(and(eq(patientCases.patientId, patientId), eq(patientCases.caseType, serviceType)));
          caseId = raced.id;
          await tx.update(patientCases).set({ cost, costSource: "manual", details: cleanDetails, updatedAt: new Date() }).where(eq(patientCases.id, caseId));
        }
      }

      const [wo] = await tx.insert(prostheticWorkOrders).values({
        patientId, branchId: existing.branchId, expertUserId, serviceType,
        status: "active", currentStage: FIRST_STAGE, expectedDeliveryDate: null, assignedBy,
      }).returning();
      const [created] = await tx.insert(prostheticWorkHistory).values({
        workOrderId: wo.id, actionType: "created", fromStage: null, toStage: FIRST_STAGE,
        notes: `تخصيص الطرف/المسند وإسناده للخبير ${(await tx.select({ displayName: systemUsers.displayName }).from(systemUsers).where(eq(systemUsers.id, expertUserId)))[0]?.displayName ?? "#" + expertUserId}`, performedBy: assignedBy,
      }).returning({ id: prostheticWorkHistory.id });
      // مسار إنشاء رابع — «تخصيص وإسناد خبير» من سجلّ المرضى.
      await recordOrderCreatedEvent(tx, {
        order: wo, stage: FIRST_STAGE, historyId: created.id,
      });
      return { patient, workOrderId: wo.id };
    });
    return result;
  }

  // ADMIN-ONLY case-type deletion («حذف نوع حالة») — also the cleaner for
  // GHOST cases left by the old destructive edit (flag wiped, case row kept).
  // Safety model:
  //   - BLOCKED while manufacturing history (any work order) or payments
  //     TAGGED for this type exist — real history is never deleted, and those
  //     are resurrection signals syncPatientCases would rebuild the case from.
  //   - The case's visits/payments are re-pointed to the remaining case
  //     (physio first) or detached (case_id NULL) — never deleted.
  //   - Cost: 'manual' (a priced business event) is SUBTRACTED from
  //     total_cost (undoing the event); 'auto' (an aggregate-split remnant)
  //     is MOVED onto the remaining case so total_cost — and the reports —
  //     stay untouched. No remaining case → subtract.
  //   - The type's flag AND its detail columns are cleared so no signal
  //     resurrects the case on the next sync.
  async deleteCaseType(patientId: number, caseType: "prosthetic" | "medical_support" | "physiotherapy"): Promise<{ movedRows: number }> {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(919, ${patientId})`);
      const [p] = await tx.select().from(patients).where(eq(patients.id, patientId));
      if (!p) throw new Error("المريض غير موجود");
      const [row] = await tx.select().from(patientCases)
        .where(and(eq(patientCases.patientId, patientId), eq(patientCases.caseType, caseType)));
      if (!row) throw new Error("لا توجد حالة من هذا النوع لهذا المريض");

      if (caseType !== "physiotherapy") {
        const wos = await tx.select({ id: prostheticWorkOrders.id }).from(prostheticWorkOrders)
          .where(and(eq(prostheticWorkOrders.patientId, patientId), eq(prostheticWorkOrders.serviceType, caseType))).limit(1);
        if (wos.length > 0) throw new Error("يوجد سجل تصنيع لهذا النوع — لا يمكن حذفه");
        const tag = caseType === "prosthetic" ? "أطراف صناعية" : "مساند طبية";
        const tagged = await tx.select({ id: payments.id }).from(payments)
          .where(and(eq(payments.patientId, patientId), sql`${payments.paymentTreatmentType} LIKE ${"%" + tag + "%"}`)).limit(1);
        if (tagged.length > 0) throw new Error("توجد دفعات موسومة لهذا النوع — عدّل تصنيفها أولاً ثم احذف");
      }

      const others = await tx.select().from(patientCases)
        .where(and(eq(patientCases.patientId, patientId), sql`${patientCases.id} <> ${row.id}`));
      const target = others.find((c) => c.caseType === "physiotherapy") ?? others[0] ?? null;

      const rp = await tx.update(payments).set({ caseId: target?.id ?? null }).where(eq(payments.caseId, row.id)).returning({ id: payments.id });
      const rv = await tx.update(visits).set({ caseId: target?.id ?? null }).where(eq(visits.caseId, row.id)).returning({ id: visits.id });

      const cost = row.cost || 0;
      if (cost > 0) {
        if (row.costSource !== "manual" && target) {
          await tx.update(patientCases).set({ cost: (target.cost || 0) + cost, updatedAt: new Date() }).where(eq(patientCases.id, target.id));
        } else {
          const reduction = Math.min(cost, p.totalCost || 0);
          await tx.update(patients).set({ totalCost: Math.max(0, (p.totalCost || 0) - cost) }).where(eq(patients.id, patientId));
          if (reduction > 0) {
            await tx.insert(costEntries).values({
              patientId, branchId: p.branchId, amount: -reduction, source: "case_retired",
              notes: `سحب حالة ${caseType === "prosthetic" ? "أطراف" : caseType === "medical_support" ? "مساند" : "علاج طبيعي"}`,
            });
          }
        }
      }

      await tx.delete(patientCases).where(eq(patientCases.id, row.id));

      const clear: any = caseType === "prosthetic"
        ? { isAmputee: false, amputationSite: null, prostheticType: null, siliconType: null, siliconSize: null, suspensionSystem: null, footType: null, footSize: null, kneeJointType: null }
        : caseType === "medical_support"
          ? { isMedicalSupport: false, supportType: null }
          : { isPhysiotherapy: false, diseaseType: null, injuries: null, injuryType: null, injuryArea: null, treatmentType: null };
      await tx.update(patients).set(clear).where(eq(patients.id, patientId));

      return { movedRows: rp.length + rv.length };
    });
  }

  // Merges a duplicate patient row into the original one (admin tool).
  // Every child record is re-pointed to the target, the type flags are
  // OR-merged, empty descriptive fields on the target are filled from the
  // source, costs are summed, and the duplicate row is deleted — all in one
  // transaction.
  async mergePatients(sourceId: number, targetId: number): Promise<{
    patient: Patient;
    moved: Record<string, number>;
  }> {
    if (sourceId === targetId) throw new Error("لا يمكن دمج الملف مع نفسه");
    const result = await db.transaction(async (tx) => {
      const [source] = await tx.select().from(patients).where(eq(patients.id, sourceId));
      const [target] = await tx.select().from(patients).where(eq(patients.id, targetId));
      if (!source || !target) throw new Error("أحد الملفين غير موجود");

      // Combine the two patients' per-case allocations. The per-case table
      // (patient_cases) references the source patient, and the source's
      // visits/payments point at ITS case rows — so before deleting the source
      // we fold each source case into the target: add its cost into the target's
      // same-type case (or create that case on the target carrying the
      // cost+details), then re-point the source's visits/payments from its case
      // to the target's. Finally drop the source's case rows so deleting the
      // source patient won't violate the FK. This PRESERVES the per-case cost
      // split (sum of case costs stays == the summed total_cost) instead of
      // losing the source's case costs. Without this the delete failed with
      // "violates foreign key constraint patient_cases_patient_id_fkey".
      const sourceCases = await tx.select().from(patientCases).where(eq(patientCases.patientId, sourceId));
      const targetCases = await tx.select().from(patientCases).where(eq(patientCases.patientId, targetId));
      // Which source case became which target case. Collected in the loop and
      // applied to the sealed exam table in ONE guarded pass afterwards, so the
      // door is opened once instead of on every iteration.
      const caseRemap: { from: number; to: number }[] = [];
      for (const sc of sourceCases) {
        let tc = targetCases.find((c) => c.caseType === sc.caseType);
        if (!tc) {
          const [created] = await tx.insert(patientCases).values({
            patientId: targetId, branchId: target.branchId, caseType: sc.caseType,
            cost: sc.cost || 0, details: sc.details ?? {}, costSource: sc.costSource ?? "auto",
          }).returning();
          tc = created;
          targetCases.push(created);
        } else {
          // Summed cost stays human-owned if EITHER side was priced by a human.
          const mergedSource = tc.costSource === "manual" || sc.costSource === "manual" ? "manual" : "auto";
          await tx.update(patientCases).set({ cost: (tc.cost || 0) + (sc.cost || 0), costSource: mergedSource, updatedAt: new Date() }).where(eq(patientCases.id, tc.id));
        }
        await tx.update(visits).set({ caseId: tc.id }).where(eq(visits.caseId, sc.id));
        await tx.update(payments).set({ caseId: tc.id }).where(eq(payments.caseId, sc.id));
        caseRemap.push({ from: sc.id, to: tc.id });
      }

      // Medical exams are the THIRD table pointing at patient_cases.id — the
      // other two (visits, payments) are re-pointed just above, and this one
      // was missed, so merging a patient who had ever been examined failed on
      // the FK when the source's case rows were deleted below.
      //
      // This is an ADMINISTRATIVE re-point, not a clinical edit: one human had
      // two files, and the exam must follow them. Not a single clinical value
      // is touched — diagnosis, prescription, doctor, signature, version and
      // notes all stay byte-identical, and NO revision is written because the
      // doctor's words did not change. `reviseExam` is deliberately not used.
      //
      // The table is sealed, so the audited door is opened around these two
      // statements ONLY and shut immediately after — the rest of the merge
      // stays under the seal.
      if (caseRemap.length > 0) {
        await tx.execute(sql`SET LOCAL app.allow_exam_edit = 'on'`);
        for (const { from, to } of caseRemap) {
          // BOTH conditions, not just the case id. A source case id *should*
          // only ever appear on the source patient's exams — but "should" is
          // not a constraint, and a historically inconsistent row (an exam
          // carrying another patient's id next to this case) would otherwise
          // be silently re-pointed onto the target, moving a third person's
          // clinical record.
          //
          // Refusing to touch it is the safe half; the loud half follows on
          // its own: the source case rows are deleted a few lines below, and
          // that inconsistent exam still references one — so the FK aborts the
          // merge and the whole transaction rolls back. A visible failure that
          // surfaces the bad data beats a quiet edit that hides it.
          await tx.update(medicalExams)
            .set({ caseId: to })
            .where(and(eq(medicalExams.caseId, from), eq(medicalExams.patientId, sourceId)));
        }
        await tx.execute(sql`SET LOCAL app.allow_exam_edit = 'off'`);
      }

      if (sourceCases.length > 0) {
        await tx.delete(patientCases).where(eq(patientCases.patientId, sourceId));
      }

      const moved: Record<string, number> = {};
      const repoint = async (label: string, table: any, column: any) => {
        const rows = await tx.update(table)
          .set({ patientId: targetId })
          .where(eq(column, sourceId))
          .returning();
        moved[label] = rows.length;
      };
      await repoint("visits", visits, visits.patientId);
      await repoint("payments", payments, payments.patientId);
      await repoint("documents", documents, documents.patientId);
      await repoint("invoices", invoices, invoices.patientId);
      await repoint("installmentPlans", installmentPlans, installmentPlans.patientId);
      await repoint("followUpCalls", followUpCalls, followUpCalls.patientId);
      await repoint("workOrders", prostheticWorkOrders, prostheticWorkOrders.patientId);
      await repoint("treatmentPlans", treatmentPlans, treatmentPlans.patientId);
      await repoint("surveyResponses", surveyResponses, surveyResponses.patientId);
      await repoint("journalLines", journalLines, journalLines.patientId);
      // Ledger entries follow their patient: dated history is preserved, and
      // the summed total_cost below stays equal to the summed entries.
      await repoint("costEntries", costEntries, costEntries.patientId);

      // The clinical record follows the human. Sealed table, so the same
      // narrow door — opened around this one statement and shut again.
      // Covers exams whose `case_id` is NULL too: they simply change owner,
      // and no case link is invented for them.
      // `medical_exam_addenda` and `medical_exam_revisions` are keyed on
      // `exam_id`, which does not change, so they stay attached with nothing
      // copied or recreated.
      await tx.execute(sql`SET LOCAL app.allow_exam_edit = 'on'`);
      await repoint("medicalExams", medicalExams, medicalExams.patientId);
      await tx.execute(sql`SET LOCAL app.allow_exam_edit = 'off'`);

      // ── Event log (migration 044) ────────────────────────────────────────
      // Repointing patient_id alone is NOT enough, for two independent reasons.
      //
      // 1. The rows are sealed. `patient_events` refuses UPDATE unless the
      //    audited door is open, so the repoint must open it explicitly — and
      //    close it again straight after, so the rest of this transaction
      //    stays under the seal.
      // 2. `dedupe_key` is unique PER PATIENT, not globally. Both files can
      //    therefore legitimately hold the same key, and moving the source's
      //    rows onto the target would violate `uq_patient_events_dedupe` and
      //    abort the whole merge. The source copy is by definition the
      //    duplicate of an event the target already recorded, so its KEY is
      //    cleared — never the row: the narrative survives in full, only its
      //    idempotency marker (whose job is done) is dropped.
      await tx.execute(sql`SET LOCAL app.allow_event_edit = 'on'`);
      await tx.execute(sql`
        UPDATE patient_events s
           SET dedupe_key = NULL
         WHERE s.patient_id = ${sourceId}
           AND s.dedupe_key IS NOT NULL
           AND EXISTS (
             SELECT 1 FROM patient_events t
              WHERE t.patient_id = ${targetId}
                AND t.dedupe_key = s.dedupe_key
           )
      `);
      await repoint("patientEvents", patientEvents, patientEvents.patientId);
      await tx.execute(sql`SET LOCAL app.allow_event_edit = 'off'`);

      // ── هوية التواصل (migration 047) ─────────────────────────────────────
      // التذاكر تتبع المريض بلا تعقيد: بصمتها فريدة عالمياً فلا تتصادم.
      await repoint("patientLinkTokens", patientLinkTokens, patientLinkTokens.patientId);
      // أمّا جهات الاتصال فلها تصادم مشروع: الحساب نفسه مرتبطٌ ونشِط على
      // الملفّين. إعادة التوجيه وحدها كانت ستنتهك `uq_patient_contacts_active`
      // وتُسقط الدمج. المعالجة في وحدة التواصل حيث تُعرَف قيود الجدول:
      // جهة المصدر تُختَم قبل نقلها — تُنقل محفوظة كتاريخ، والنشِط يبقى واحداً.
      await mergeContactsInto(tx, sourceId, targetId);

      // Merge the patient row itself: flags OR, costs summed, and any
      // descriptive field that is empty on the target gets the source's value.
      const fillable = [
        "phone", "address", "referralNotes", "weight", "height", "injuryCause",
        "injuryDate", "patientClassification", "generalNotes", "amputationSite",
        "prostheticType", "siliconType", "siliconSize", "suspensionSystem",
        "footType", "footSize", "kneeJointType", "diseaseType", "injuryType",
        "injuryArea", "injuries", "treatmentType", "supportType", "injurySide",
      ] as const;
      const patch: any = {
        isAmputee: Boolean(target.isAmputee || source.isAmputee),
        isPhysiotherapy: Boolean(target.isPhysiotherapy || source.isPhysiotherapy),
        isMedicalSupport: Boolean(target.isMedicalSupport || source.isMedicalSupport),
        totalCost: (target.totalCost || 0) + (source.totalCost || 0),
      };
      // Arabic labels for the detail fields, used when preserving a conflicting
      // source value below.
      const fieldLabels: Record<string, string> = {
        phone: "الهاتف", address: "العنوان", weight: "الوزن", height: "الطول",
        injuryCause: "سبب الإصابة", injuryDate: "تاريخ الإصابة",
        amputationSite: "موقع البتر", prostheticType: "نوع الطرف",
        siliconType: "نوع السيليكون", siliconSize: "قياس السيليكون",
        suspensionSystem: "نظام التعليق", footType: "نوع القدم",
        footSize: "قياس الحذاء", kneeJointType: "نوع مفصل الركبة",
        diseaseType: "التشخيص", injuryType: "نوع الإصابة", injuryArea: "منطقة الإصابة",
        injuries: "الإصابات", treatmentType: "نوع العلاج", supportType: "نوع المسند",
        injurySide: "الجهة",
      };
      // Any source value that would otherwise be dropped (target already has a
      // DIFFERENT value) is preserved into notes so a merge NEVER silently
      // loses details a staff member entered.
      const preserved: string[] = [];
      for (const f of fillable) {
        const tv = (target as any)[f];
        const sv = (source as any)[f];
        const tEmpty = tv === null || tv === undefined || tv === "";
        if (tEmpty && sv) {
          patch[f] = sv; // union: fill the gap from the source
        } else if (!tEmpty && sv && String(tv) !== String(sv) && f !== "generalNotes") {
          preserved.push(`${fieldLabels[f] ?? f}: ${sv}`);
        }
      }
      if (preserved.length > 0) {
        const stamp = `— من الملف المدموج #${sourceId}: ${preserved.join("، ")}`;
        patch.generalNotes = target.generalNotes ? `${target.generalNotes}\n${stamp}` : stamp;
      }
      // The derived phone columns are NOT in `fillable` on purpose: copying
      // them field-by-field could leave the target carrying its OWN raw phone
      // next to the SOURCE's normalized one — a silently wrong pairing. They
      // are re-derived from whatever `phone` the merge settled on instead, so
      // the four columns always describe the same number.
      // (Merge precedence itself is unchanged: a target that already has a
      // phone keeps it, and the source's different number is still preserved
      // into `generalNotes` by the loop above.)
      if (patch.phone !== undefined) {
        const n = normalizePhone(patch.phone, source.phoneCountry || target.phoneCountry || DEFAULT_PHONE_COUNTRY);
        patch.phone = n.raw || null;
        patch.phoneE164 = n.e164;
        patch.phoneCountry = n.country;
        patch.phoneStatus = n.status;
      }
      const [patient] = await tx.update(patients)
        .set(patch)
        .where(eq(patients.id, targetId))
        .returning();

      await tx.delete(patients).where(eq(patients.id, sourceId));
      return { patient, moved };
    });
    // Rebuild the target's cases from the merged data — add any case type the
    // source brought in, re-attribute the moved visits/payments to the target's
    // cases, and apply the cost floor. Runs AFTER commit so syncPatientCases
    // (pooled connection) sees the merged rows. Never fails the merge itself.
    try { await this.syncPatientCases(targetId); } catch (e) { console.error("[mergePatients] case sync failed:", e); }
    return result;
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
  //
  // All reads filter `deleted_at IS NULL` so soft-deleted rows stay in
  // the table for forensic / restoration but never reach the UI.
  async getVisitsByPatientId(patientId: number): Promise<Visit[]> {
    return await db.select().from(visits)
      .where(and(eq(visits.patientId, patientId), isNull(visits.deletedAt)))
      .orderBy(desc(visits.visitDate));
  }
  async getVisitsByPatientIds(patientIds: number[]): Promise<Visit[]> {
    if (patientIds.length === 0) return [];
    return await db.select().from(visits)
      .where(and(inArray(visits.patientId, patientIds), isNull(visits.deletedAt)))
      .orderBy(desc(visits.visitDate));
  }
  async getVisitsByBranch(branchId: number): Promise<Visit[]> {
    return await db.select().from(visits)
      .where(and(eq(visits.branchId, branchId), isNull(visits.deletedAt)))
      .orderBy(desc(visits.visitDate));
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

    // Attribute the visit to a case (Phase 3) unless one was already provided.
    if (valuesToInsert.caseId == null && valuesToInsert.patientId) {
      valuesToInsert.caseId = await this.resolveCaseId(valuesToInsert.patientId, { treatmentType: valuesToInsert.treatmentType ?? null });
    }

    const [visit] = await db.insert(visits).values(valuesToInsert).returning();
    return visit;
  }
  // Soft delete: mark the row instead of removing it. Reads filter on
  // `deleted_at IS NULL` so it disappears from the UI, but the data
  // stays for restoration if a delete was a mistake. If we ever need
  // hard delete, do it deliberately via SQL — the BEFORE DELETE trigger
  // will mirror the row into visits_forensic_log.
  async deleteVisit(id: number): Promise<void> {
    await db.update(visits)
      .set({ deletedAt: new Date() })
      .where(eq(visits.id, id));
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
    const paymentData: any = {
      ...insertPayment,
      date: dateValue,
    };
    // Attribute the payment to a case (Phase 3) unless one was already provided,
    // resolved from its treatment tag (أطراف/مساند/نوع العلاج).
    if (paymentData.caseId == null && paymentData.patientId) {
      paymentData.caseId = await this.resolveCaseId(paymentData.patientId, { tag: paymentData.paymentTreatmentType ?? null });
    }
    const [payment] = await db.insert(payments).values(paymentData).returning();
    return payment;
  }
  async deletePayment(id: number): Promise<void> {
    await db.delete(payments).where(eq(payments.id, id));
  }

  async updatePaymentSessionInfo(id: number, sessionCount: number | null, paymentTreatmentType: string | null): Promise<any> {
    const [before] = await db.select().from(payments).where(eq(payments.id, id));
    const [updated] = await db.update(payments)
      .set({ sessionCount, paymentTreatmentType })
      .where(eq(payments.id, id))
      .returning();
    if (updated && tagChanged(before?.paymentTreatmentType, paymentTreatmentType)) {
      await this.reattachPaymentCase(updated.id, updated.patientId, paymentTreatmentType);
    }
    return updated;
  }

  async updatePayment(id: number, data: { amount?: number, notes?: string | null, sessionCount?: number | null, paymentTreatmentType?: string | null, date?: Date | null, isFreeSessions?: boolean }): Promise<any> {
    const [before] = await db.select().from(payments).where(eq(payments.id, id));
    const [updated] = await db.update(payments)
      .set(data)
      .where(eq(payments.id, id))
      .returning();
    // When the payment's service tag ACTUALLY changes (e.g. a طرف that was
    // mistakenly recorded under علاج), make its case follow. The edit dialogs
    // always send paymentTreatmentType, so an amount/notes-only edit must NOT
    // trigger a re-sync — that used to silently re-attribute the payment and
    // re-run the cost floor over admin-set numbers. total_cost/flags are never
    // touched, so reports are unaffected.
    if (updated && data.paymentTreatmentType !== undefined && tagChanged(before?.paymentTreatmentType, data.paymentTreatmentType)) {
      await this.reattachPaymentCase(updated.id, updated.patientId, data.paymentTreatmentType ?? null);
    }
    return updated;
  }

  // Re-resolve (and if needed create) the case a payment belongs to after its
  // service tag was edited. Additive only. The stale attribution is cleared
  // FIRST so the sync computes attribution/floor on the payment's NEW identity
  // (a retag away from أطراف no longer leaves the money counted on the طرف),
  // then sync's exact-tag/fallback rules re-home it; resolveCaseId is the
  // final safety net.
  private async reattachPaymentCase(paymentId: number, patientId: number, tag: string | null): Promise<void> {
    try {
      await db.update(payments).set({ caseId: null }).where(eq(payments.id, paymentId));
      await this.syncPatientCases(patientId);
      const [row] = await db.select({ caseId: payments.caseId }).from(payments).where(eq(payments.id, paymentId));
      if (!row?.caseId) {
        const caseId = await this.resolveCaseId(patientId, { tag });
        if (caseId) await db.update(payments).set({ caseId }).where(eq(payments.id, paymentId));
      }
    } catch (e) {
      console.error(`[reattachPaymentCase] payment ${paymentId} failed:`, e);
    }
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
    // Revenue-stream breakdown. Every field reconciles back to the grand
    // totals above (so the combined figures are never affected):
    //   devices.revenue + physio.revenue + unclassified.revenue = totalRevenue
    //   devices.paid    + physio.paid    + unclassified.paid    = totalPaid
    //   devices.expenses + physio.expenses + shared.expenses     = totalExpenses
    // "devices" = الأطراف والمساند (prosthetic + medical_support),
    // "physio" = العلاج الطبيعي, "shared" = مشترك/غير محدّد (expenses only),
    // "unclassified" = وارد/مدفوع لا يحمل حالة مبوّبة (reconciliation remainder).
    bySection: {
      devices: { revenue: number; paid: number; expenses: number };
      physio: { revenue: number; paid: number; expenses: number };
      shared: { expenses: number };
      unclassified: { revenue: number; paid: number };
    };
  }> {
    // ---- FLOW semantics (owner's definitions, 2026-07-28) -------------------
    // A period describes the MONEY MOVEMENT inside it, not a registration
    // cohort:
    //   totalPaid      الوارد    = payments dated inside the range
    //   totalRevenue   المبيعات  = cost-ledger entries dated inside the range
    //   totalExpenses  المصاريف  = expenses dated inside the range (inclusive)
    //   netProfit      الصافي    = paid − expenses (cash view, same as the
    //                              daily financial report)
    //   totalRemaining الديون    = lifetime cost − lifetime paid (a stock)
    //   collectionRate            = lifetime paid ÷ lifetime cost
    // The old version attributed revenue to patients REGISTERED in the range
    // and paid to that cohort's lifetime payments; worse, endDate parsed as
    // MIDNIGHT so selecting a single day matched nothing — the dashboard
    // showed zeros for a day that had half a million in payments, while the
    // expenses column (string compare, inclusive) still showed. Every figure
    // here now matches the daily report's definitions.
    const endExclusive = endDate
      ? new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000)
      : null;

    const paidConds = [];
    if (branchId) paidConds.push(eq(payments.branchId, branchId));
    if (startDate) paidConds.push(gte(payments.date, new Date(startDate)));
    if (endExclusive) paidConds.push(sql`${payments.date} < ${endExclusive}`);
    const paidWhere = paidConds.length > 0 ? and(...paidConds) : sql`TRUE`;
    const paidQuery = await db.select({ total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
      .from(payments).where(paidWhere);
    const totalPaid = Number(paidQuery[0]?.total) || 0;

    const revConds = [];
    if (branchId) revConds.push(eq(costEntries.branchId, branchId));
    if (startDate) revConds.push(gte(costEntries.createdAt, new Date(startDate)));
    if (endExclusive) revConds.push(sql`${costEntries.createdAt} < ${endExclusive}`);
    const revWhereFlow = revConds.length > 0 ? and(...revConds) : sql`TRUE`;
    const revQuery = await db.select({ total: sql<string>`COALESCE(SUM(${costEntries.amount}), 0)` })
      .from(costEntries).where(revWhereFlow);
    const totalRevenue = Number(revQuery[0]?.total) || 0;

    // Lifetime stock figures (branch-scoped, deliberately undated): what the
    // patients still owe overall, and how much of everything sold has been
    // collected. These don't change when the user narrows the period — debt
    // is debt whichever week you look at it through.
    const lifeCostQ = branchId
      ? await db.select({ total: sql<string>`COALESCE(SUM(${patients.totalCost}), 0)` })
          .from(patients).where(eq(patients.branchId, branchId))
      : await db.select({ total: sql<string>`COALESCE(SUM(${patients.totalCost}), 0)` }).from(patients);
    const lifePaidQ = branchId
      ? await db.select({ total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
          .from(payments).where(eq(payments.branchId, branchId))
      : await db.select({ total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` }).from(payments);
    const lifetimeCost = Number(lifeCostQ[0]?.total) || 0;
    const lifetimePaid = Number(lifePaidQ[0]?.total) || 0;

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

    // ---- revenue-stream breakdown (reconciles to the grand totals) ---------
    // Paid per bucket = payments IN THE RANGE tagged to a case of that bucket
    // (case_id NULL rows land in the "unclassified" remainder). Revenue per
    // bucket = the range's cost-ledger entries mapped by SOURCE — تخصيص and
    // maintenance are device money, physio pricing and the session backfill
    // are physio money; ambiguous sources (registration, opening, …) stay in
    // the remainder rather than being guessed.
    const bucketExpr = sql<string>`CASE WHEN ${patientCases.caseType} = 'physiotherapy' THEN 'physio' ELSE 'devices' END`;

    const casePaidRows = await db
      .select({ bucket: bucketExpr, total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
      .from(payments)
      .innerJoin(patientCases, eq(payments.caseId, patientCases.id))
      .where(paidWhere)
      .groupBy(bucketExpr);

    const sourceBucketExpr = sql<string>`CASE
      WHEN ${costEntries.source} IN ('assign_manufacturing', 'maintenance') THEN 'devices'
      WHEN ${costEntries.source} IN ('physio_pricing', 'session_backfill') THEN 'physio'
      ELSE 'other' END`;
    const caseRevenueRows = await db
      .select({ bucket: sourceBucketExpr, total: sql<string>`COALESCE(SUM(${costEntries.amount}), 0)` })
      .from(costEntries)
      .where(revWhereFlow)
      .groupBy(sourceBucketExpr);

    // Expenses per section (NULL/legacy → shared).
    const expWhere = expenseConditions.length > 0 ? and(...expenseConditions) : sql`TRUE`;
    const expenseSectionRows = await db
      .select({ section: sql<string>`COALESCE(${expenses.section}, 'shared')`, total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
      .from(expenses)
      .where(expWhere)
      .groupBy(sql`COALESCE(${expenses.section}, 'shared')`);

    const pick = (rows: { bucket?: string; section?: string; total: string }[], key: string) =>
      Number(rows.find((r) => (r.bucket ?? r.section) === key)?.total) || 0;

    const deviceRevenue = pick(caseRevenueRows, "devices");
    const physioRevenue = pick(caseRevenueRows, "physio");
    const devicePaid = pick(casePaidRows, "devices");
    const physioPaid = pick(casePaidRows, "physio");
    // Any expense row whose section is neither 'prosthetic' nor 'physio'
    // (i.e. 'shared', NULL, or anything unexpected) reconciles into shared, so
    // device + physio + shared always equals totalExpenses exactly.
    const deviceExpenses = pick(expenseSectionRows, "prosthetic");
    const physioExpenses = pick(expenseSectionRows, "physio");
    const sharedExpenses = totalExpenses - deviceExpenses - physioExpenses;

    const bySection = {
      devices: { revenue: deviceRevenue, paid: devicePaid, expenses: deviceExpenses },
      physio: { revenue: physioRevenue, paid: physioPaid, expenses: physioExpenses },
      shared: { expenses: sharedExpenses },
      // Remainders keep the split reconciled to the authoritative grand totals.
      unclassified: {
        revenue: totalRevenue - deviceRevenue - physioRevenue,
        paid: totalPaid - devicePaid - physioPaid,
      },
    };

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

    // الديون المستحقة — a stock, not a flow: what all patients still owe now.
    const totalRemaining = Math.max(0, lifetimeCost - lifetimePaid);
    // الصافي — the cash view the owner asked for (وارد − مصاريف), matching the
    // daily financial report exactly.
    const netProfit = totalPaid - totalExpenses;
    // نسبة التحصيل — lifetime collected ÷ lifetime sold, so it reads as the
    // clinic's overall collection health and never exceeds sense when a
    // narrow period collects old debts.
    const collectionRate = lifetimeCost > 0 ? Math.round((lifetimePaid / lifetimeCost) * 100) : 0;

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
      bySection,
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
    const conditions = [isNull(visits.deletedAt)];
    if (branchId) conditions.push(eq(visits.branchId, branchId));
    if (startDate) conditions.push(gte(visits.visitDate, new Date(startDate)));
    if (endDate) conditions.push(lte(visits.visitDate, new Date(endDate)));

    return await db.select().from(visits).where(and(...conditions)).orderBy(desc(visits.visitDate));
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

  // Bulk variant — fetches every item for the given set of invoices in
  // one query, used by the invoice list to display a service summary
  // per row without an N+1 storm.
  async getInvoiceItemsForInvoices(invoiceIds: number[]): Promise<InvoiceItem[]> {
    if (invoiceIds.length === 0) return [];
    return await db
      .select()
      .from(invoiceItems)
      .where(inArray(invoiceItems.invoiceId, invoiceIds));
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

  // Carries the patient's name on the row. Without it the surveys page had to
  // download EVERY patient (with all their visits and payments) just to turn
  // an id into a name — the single reason that page was slow to open.
  async getSurveyResponses(branchId?: number): Promise<(SurveyResponse & { patientName: string | null })[]> {
    const branchClause = branchId ? eq(surveyResponses.branchId, branchId) : sql`TRUE`;
    return await db
      .select({
        id: surveyResponses.id,
        templateId: surveyResponses.templateId,
        patientId: surveyResponses.patientId,
        branchId: surveyResponses.branchId,
        surveyorId: surveyResponses.surveyorId,
        surveyorName: surveyResponses.surveyorName,
        totalScore: surveyResponses.totalScore,
        maxScore: surveyResponses.maxScore,
        percentage: surveyResponses.percentage,
        notes: surveyResponses.notes,
        completedAt: surveyResponses.completedAt,
        patientName: patients.name,
      })
      .from(surveyResponses)
      .leftJoin(patients, eq(patients.id, surveyResponses.patientId))
      .where(branchClause)
      .orderBy(desc(surveyResponses.completedAt));
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

  // ==================== Follow-up call reminders ====================

  // Records a follow-up call outcome, marking the patient's current
  // stop-episode as handled (it disappears from the active reminder list).
  async createFollowUpCall(input: InsertFollowUpCall): Promise<FollowUpCall> {
    const [created] = await db.insert(followUpCalls).values(input).returning();
    return created;
  }

  // Handled-episode history, enriched with patient name + author name via
  // joins (no N+1). Branch-scoped: pass undefined for admin (all branches).
  async getFollowUpHistory(branchId?: number): Promise<
    (FollowUpCall & { patientName: string | null; createdByName: string | null })[]
  > {
    const branchClause = branchId ? eq(followUpCalls.branchId, branchId) : sql`TRUE`;
    return await db
      .select({
        id: followUpCalls.id,
        patientId: followUpCalls.patientId,
        branchId: followUpCalls.branchId,
        lastVisitAnchor: followUpCalls.lastVisitAnchor,
        outcomeNote: followUpCalls.outcomeNote,
        createdBy: followUpCalls.createdBy,
        createdAt: followUpCalls.createdAt,
        updatedAt: followUpCalls.updatedAt,
        patientName: patients.name,
        createdByName: systemUsers.displayName,
      })
      .from(followUpCalls)
      .leftJoin(patients, eq(patients.id, followUpCalls.patientId))
      .leftJoin(systemUsers, eq(systemUsers.id, followUpCalls.createdBy))
      .where(branchClause)
      .orderBy(desc(followUpCalls.createdAt));
  }

  // Edits a saved outcome note. Branch-scoped: enforcedBranchId === null
  // means admin (no scope). Returns the updated row or null if out of scope.
  async updateFollowUpNote(
    id: number,
    outcomeNote: string,
    enforcedBranchId: number | null
  ): Promise<FollowUpCall | null> {
    const conditions = [eq(followUpCalls.id, id)];
    if (enforcedBranchId !== null) {
      conditions.push(eq(followUpCalls.branchId, enforcedBranchId));
    }
    const [updated] = await db
      .update(followUpCalls)
      .set({ outcomeNote, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();
    return updated ?? null;
  }

  // Deletes a handled record so the reminder re-arms (the patient reappears
  // in the active list if still stopped). Branch-scoped like the update.
  async deleteFollowUpCall(id: number, enforcedBranchId: number | null): Promise<boolean> {
    const conditions = [eq(followUpCalls.id, id)];
    if (enforcedBranchId !== null) {
      conditions.push(eq(followUpCalls.branchId, enforcedBranchId));
    }
    const result = await db.delete(followUpCalls).where(and(...conditions)).returning();
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

  // Aggregates per-user activity over a window. Combines two data
  // sources: the createdBy text on entity rows (gives raw counts +
  // money totals) and audit_log (gives edits, deletes, login activity,
  // and anomaly involvement). Returns one row per known system user
  // plus an aggregate "غير معروف" bucket for legacy data.
  async getEmployeeAccuracy(params: {
    branchId?: number;
    startDate: string;
    endDate: string;
  }): Promise<EmployeeAccuracyRow[]> {
    const { branchId, startDate, endDate } = params;
    const startTs = new Date(`${startDate}T00:00:00+03:00`);
    const endTs = new Date(`${endDate}T23:59:59.999+03:00`);

    const targets = await this.getPerformanceTargets();

    const [
      expenseRows,
      invoiceRows,
      purchaseRows,
      anomalyDecisionRows,
      auditRows,
      followUpRows,
    ] = await Promise.all([
      this.getExpenses(branchId, startDate, endDate),
      this.getInvoices(branchId, undefined, undefined, startDate, endDate),
      this.getPurchases(branchId, undefined, undefined, startDate, endDate),
      db
        .select()
        .from(anomalyDecisions)
        .where(
          and(
            branchId ? eq(anomalyDecisions.branchId, branchId) : sql`TRUE`,
            gte(anomalyDecisions.createdAt, startTs),
            lte(anomalyDecisions.createdAt, endTs)
          )
        ),
      // Audit rows over the same window. The existing audit_log
      // schema uses entityType (not resourceType) and tracks every
      // accounting mutation already; we just consume it. entityId lets
      // us follow patient-create events to check data completeness.
      db
        .select({
          userId: auditLog.userId,
          action: auditLog.action,
          entityType: auditLog.entityType,
          entityId: auditLog.entityId,
          createdAt: auditLog.createdAt,
        })
        .from(auditLog)
        .where(
          and(
            branchId ? eq(auditLog.branchId, branchId) : sql`TRUE`,
            gte(auditLog.createdAt, startTs),
            lte(auditLog.createdAt, endTs)
          )
        ),
      // Follow-up calls logged in the window, per employee.
      db
        .select({
          createdBy: followUpCalls.createdBy,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(followUpCalls)
        .where(
          and(
            branchId ? eq(followUpCalls.branchId, branchId) : sql`TRUE`,
            gte(followUpCalls.createdAt, startTs),
            lte(followUpCalls.createdAt, endTs)
          )
        )
        .groupBy(followUpCalls.createdBy),
    ]);

    // Per-user follow-up counts keyed by stringified user id.
    const followUpsByUser = new Map<string, number>(
      followUpRows.map((r) => [String(r.createdBy ?? "unknown"), Number(r.count)])
    );

    // Distinct active Baghdad days + patient IDs created, per user.
    const activeDaysByUser = new Map<string, Set<string>>();
    const patientIdsByUser = new Map<string, number[]>();
    const baghdadDay = (ts: Date | string | null): string | null =>
      ts ? new Date(ts).toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" }) : null;

    // Bucket by createdBy text key. The new createdBy convention is
    // stringified system_users.id; legacy "unknown" rows aggregate
    // together so they don't pollute the per-employee view.
    const buckets = new Map<string, EmployeeAccuracyAccum>();
    const get = (key: string) => {
      let b = buckets.get(key);
      if (!b) {
        b = {
          expenseCount: 0, expenseTotal: 0,
          invoiceCount: 0, invoiceTotal: 0,
          purchaseCount: 0, purchaseTotal: 0,
          patientCreateCount: 0,
          visitCreateCount: 0,
          paymentCreateCount: 0,
          anomalyDecisionsCount: 0,
          editCount: 0, deleteCount: 0,
          loginCount: 0, lastActivityAt: null,
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
      const b = get(String(d.userId ?? "unknown"));
      b.anomalyDecisionsCount += 1;
    }
    for (const a of auditRows) {
      const key = String(a.userId ?? "unknown");
      const b = get(key);
      if (a.action === "update") b.editCount += 1;
      else if (a.action === "delete") b.deleteCount += 1;
      else if (a.action === "login") b.loginCount += 1;
      else if (a.action === "create") {
        // Per-table counts (expense / invoice / purchase) come from
        // the createdBy text columns above. Patients, visits, and
        // payments have no createdBy column on their table, so we
        // count their create events from audit_log instead. This is
        // what makes reception staff (who create patients + visits
        // but don't touch finances) actually appear with non-zero
        // entries on the accuracy panel.
        if (a.entityType === "patient") {
          b.patientCreateCount += 1;
          const list = patientIdsByUser.get(key) ?? [];
          list.push(a.entityId);
          patientIdsByUser.set(key, list);
        }
        else if (a.entityType === "visit") b.visitCreateCount += 1;
        else if (a.entityType === "payment") b.paymentCreateCount += 1;
      }
      // Consistency: count distinct Baghdad calendar days the user was
      // active (any audited action, including logins).
      const day = baghdadDay(a.createdAt);
      if (day) {
        const set = activeDaysByUser.get(key) ?? new Set<string>();
        set.add(day);
        activeDaysByUser.set(key, set);
      }
      const ts = a.createdAt ? new Date(a.createdAt) : null;
      if (ts && (!b.lastActivityAt || ts > b.lastActivityAt)) {
        b.lastActivityAt = ts;
      }
    }

    // Data completeness: for every patient any employee created in the
    // window, check whether the core contact field (phone) is filled.
    // One query for all candidate patient IDs — no N+1.
    const allCreatedPatientIds = Array.from(patientIdsByUser.values()).flat();
    const phoneById = new Map<number, boolean>();
    if (allCreatedPatientIds.length > 0) {
      const patientRows = await db
        .select({ id: patients.id, phone: patients.phone })
        .from(patients)
        .where(inArray(patients.id, allCreatedPatientIds));
      for (const p of patientRows) {
        phoneById.set(p.id, !!(p.phone && p.phone.trim().length > 0));
      }
    }

    // Resolve display names. createdBy stores systemUsers.id as text
    // for new rows; older rows are "unknown" and get a generic label.
    const numericIds = Array.from(buckets.keys())
      .map((k) => Number(k))
      .filter((n) => Number.isFinite(n));
    // Fetch ALL active system users so we can list employees who have
    // zero activity in the window too — without this an inactive
    // accountant just disappears, which is the opposite of what an
    // admin needs (they specifically want to see who's not pulling
    // their weight). When admin scope is requested (no branchId)
    // we list everyone; otherwise pin to the requested branch.
    const allActiveUsers = await db
      .select()
      .from(systemUsers)
      .where(
        branchId
          ? and(eq(systemUsers.isActive, true), eq(systemUsers.branchId, branchId))
          : eq(systemUsers.isActive, true)
      );

    // Combine: union of (active users) ∪ (numeric IDs that appeared
    // in the activity data but might no longer be active). Each user
    // gets one bucket; missing ones default to all-zero.
    const allKeys = new Set<string>([
      ...allActiveUsers.map((u) => String(u.id)),
      ...buckets.keys(),
    ]);

    const numericIdsAll = Array.from(allKeys)
      .map((k) => Number(k))
      .filter((n) => Number.isFinite(n));
    const sysUsers = numericIdsAll.length
      ? await db.select().from(systemUsers).where(inArray(systemUsers.id, numericIdsAll))
      : [];
    const userById = new Map(sysUsers.map((u) => [u.id, u]));

    const aggBlank = {
      expenseCount: 0, expenseTotal: 0,
      invoiceCount: 0, invoiceTotal: 0,
      purchaseCount: 0, purchaseTotal: 0,
      patientCreateCount: 0,
      visitCreateCount: 0,
      paymentCreateCount: 0,
      anomalyDecisionsCount: 0,
      editCount: 0, deleteCount: 0,
      loginCount: 0, lastActivityAt: null as Date | null,
    };

    const noTarget: RoleTarget = { entriesTarget: 0, activeDaysTarget: 0, followUpsTarget: 0 };

    return Array.from(allKeys).map((createdBy) => {
      const agg = buckets.get(createdBy) ?? aggBlank;
      const numId = Number(createdBy);
      const sysUser = Number.isFinite(numId) ? userById.get(numId) : undefined;
      const role = sysUser?.role ?? null;

      const totalEntries = agg.expenseCount + agg.invoiceCount + agg.purchaseCount
        + agg.patientCreateCount + agg.visitCreateCount + agg.paymentCreateCount;

      const activeDays = activeDaysByUser.get(createdBy)?.size ?? 0;
      const followUpsCount = followUpsByUser.get(createdBy) ?? 0;
      const createdIds = patientIdsByUser.get(createdBy) ?? [];
      const patientsCreated = createdIds.length;
      const patientsComplete = createdIds.reduce((n, id) => n + (phoneById.get(id) ? 1 : 0), 0);

      // Target-based scoring against the employee's role. Unknown/legacy
      // rows and roles without a configured target fall back to no-target
      // (score 0 on target dimensions), which is correct — they carry no
      // reward signal.
      const target = (role && targets[role]) ? targets[role] : noTarget;
      const { score, breakdown } = computeScore(
        {
          entries: totalEntries,
          activeDays,
          followUpsCount,
          deleteCount: agg.deleteCount,
          patientsCreated,
          patientsComplete,
        },
        target
      );

      return {
        createdBy,
        displayName: sysUser?.displayName ?? (createdBy === "unknown" ? "غير معروف" : `#${createdBy}`),
        role,
        branchId: sysUser?.branchId ?? null,
        expenseCount: agg.expenseCount,
        expenseTotal: agg.expenseTotal,
        invoiceCount: agg.invoiceCount,
        invoiceTotal: agg.invoiceTotal,
        purchaseCount: agg.purchaseCount,
        purchaseTotal: agg.purchaseTotal,
        patientCreateCount: agg.patientCreateCount,
        visitCreateCount: agg.visitCreateCount,
        paymentCreateCount: agg.paymentCreateCount,
        totalEntries,
        anomalyDecisionsCount: agg.anomalyDecisionsCount,
        editCount: agg.editCount,
        deleteCount: agg.deleteCount,
        loginCount: agg.loginCount,
        activeDays,
        followUpsCount,
        patientsCreated,
        patientsComplete,
        lastActivityAt: agg.lastActivityAt ? agg.lastActivityAt.toISOString() : null,
        score,
        breakdown,
        target,
      };
    });
  }

  // ==================== Performance targets ====================

  // Per-role monthly targets used by the employee accuracy scoring. Stored
  // as a single JSON blob in system_settings, merged over sane defaults so a
  // newly added role always has a target.
  async getPerformanceTargets(): Promise<PerformanceTargets> {
    const raw = await this.getSystemSetting(PERFORMANCE_TARGETS_KEY);
    if (!raw) return mergeTargets(null);
    try {
      return mergeTargets(JSON.parse(raw));
    } catch {
      return mergeTargets(null);
    }
  }

  async setPerformanceTargets(targets: PerformanceTargets): Promise<PerformanceTargets> {
    const merged = mergeTargets(targets);
    await this.setSystemSetting(PERFORMANCE_TARGETS_KEY, JSON.stringify(merged));
    return merged;
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
