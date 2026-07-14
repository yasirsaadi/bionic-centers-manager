export * from "./models/auth";
import { pgTable, text, serial, integer, boolean, timestamp, varchar, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // بغداد، كربلاء، ذي قار، الموصل، كركوك
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Update users to associate with a branch
export const users = pgTable("users", {
  id: varchar("id").primaryKey(), // Replit Auth sub
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  branchId: integer("branch_id").references(() => branches.id),
  role: text("role").default("staff"), // admin, staff
  createdAt: timestamp("created_at").defaultNow(),
});

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  referralSource: text("referral_source").notNull(), // الجهة المحول منها
  referralNotes: text("referral_notes"), // ملاحظات إضافية عن الجهة المحول منها
  age: text("age").notNull(),
  weight: text("weight"),
  height: text("height"),
  medicalCondition: text("medical_condition").notNull(),
  injuryCause: text("injury_cause"),
  injuryDate: date("injury_date"),
  patientClassification: text("patient_classification"),
  generalNotes: text("general_notes"),
  
  // Branch tracking
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  
  // For amputees
  isAmputee: boolean("is_amputee").default(false),
  amputationSite: text("amputation_site"),
  prostheticType: text("prosthetic_type"), // نوع الطرف
  siliconType: text("silicon_type"), // نوع السليكون
  siliconSize: text("silicon_size"), // حجم السليكون
  suspensionSystem: text("suspension_system"), // نظام التعليق
  footType: text("foot_type"), // نوع القدم
  footSize: text("foot_size"), // حجم القدم
  kneeJointType: text("knee_joint_type"), // نوع مفصل الركبة
  
  // For physiotherapy
  isPhysiotherapy: boolean("is_physiotherapy").default(false),
  diseaseType: text("disease_type"),
  injuryType: text("injury_type"), // نوع الإصابة (legacy)
  injuryArea: text("injury_area"), // منطقة الإصابة (legacy)
  injuries: text("injuries"), // JSON array of {type, area, side} objects
  treatmentType: text("treatment_type"), // نوع العلاج
  
  // For medical support (مساند طبية)
  isMedicalSupport: boolean("is_medical_support").default(false),
  supportType: text("support_type"), // نوع المسند
  injurySide: text("injury_side"), // جهة الاصابة
  
  totalCost: integer("total_cost").default(0), // in IQD
  createdAt: timestamp("created_at").defaultNow(),
});

export const visits = pgTable("visits", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  visitDate: timestamp("visit_date").defaultNow(),
  details: text("details"),
  notes: text("notes"),
  treatmentType: text("treatment_type"),
  sessionCount: integer("session_count"),
  cost: integer("cost"),
  shift: text("shift"),
  createdBy: integer("created_by").references(() => systemUsers.id),
  // Soft delete. Reads always filter `deleted_at IS NULL` so the row
  // stays recoverable indefinitely. Hard deletes only happen during the
  // deletePatient cascade — the BEFORE DELETE trigger captures those
  // rows into `visits_forensic_log`.
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Captures every visit row that gets physically deleted, regardless of
// source — app cascade, manual SQL from Neon Console, anything that
// issues DELETE FROM visits. Populated by a BEFORE DELETE trigger in
// migration 011 so we always have a row-level forensic trail even when
// the application audit_log can't see the operation.
export const visitsForensicLog = pgTable("visits_forensic_log", {
  id: serial("id").primaryKey(),
  loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
  pgUser: text("pg_user").notNull(),
  pgAppName: text("pg_app_name"),
  pgClientAddr: text("pg_client_addr"),
  visitId: integer("visit_id").notNull(),
  patientId: integer("patient_id"),
  branchId: integer("branch_id"),
  visitDate: timestamp("visit_date"),
  details: text("details"),
  notes: text("notes"),
  treatmentType: text("treatment_type"),
  sessionCount: integer("session_count"),
  cost: integer("cost"),
  shift: text("shift"),
  createdBy: integer("created_by"),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  amount: integer("amount").notNull(),
  notes: text("notes"),
  paymentTreatmentType: text("payment_treatment_type"),
  sessionCount: integer("session_count"),
  isFreeSessions: boolean("is_free_sessions").default(false),
  date: timestamp("date").defaultNow(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  documentType: text("document_type").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Expenses table for accounting system
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  category: text("category").notNull(), // رواتب، إيجارات، مستلزمات طبية، صيانة، كهرباء ومياه، أخرى
  subcategory: text("subcategory"), // تصنيف فرعي
  description: text("description"), // وصف المصروف
  amount: integer("amount").notNull(), // المبلغ بالدينار العراقي
  expenseDate: date("expense_date").notNull(), // تاريخ المصروف
  paymentMethod: text("payment_method"), // طريقة الدفع: نقدي، تحويل، شيك
  vendor: text("vendor"), // الجهة المستفيدة
  invoiceNumber: text("invoice_number"), // رقم الفاتورة
  notes: text("notes"),
  createdBy: text("created_by"), // معرف المستخدم
  createdAt: timestamp("created_at").defaultNow(),
});

// Installment plans for patient debt management
export const installmentPlans = pgTable("installment_plans", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  totalAmount: integer("total_amount").notNull(), // المبلغ الإجمالي
  installmentAmount: integer("installment_amount").notNull(), // قيمة القسط
  numberOfInstallments: integer("number_of_installments").notNull(), // عدد الأقساط
  startDate: date("start_date").notNull(), // تاريخ البداية
  intervalDays: integer("interval_days").default(30), // الفترة بين الأقساط بالأيام
  status: text("status").default("active"), // active, completed, cancelled
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Patient invoices for accounting system
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(), // رقم الفاتورة التلقائي
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  invoiceDate: date("invoice_date").notNull(), // تاريخ الفاتورة
  dueDate: date("due_date"), // تاريخ الاستحقاق
  subtotal: integer("subtotal").notNull(), // المبلغ قبل الخصم
  discount: integer("discount").default(0), // الخصم
  total: integer("total").notNull(), // المبلغ الإجمالي
  paidAmount: integer("paid_amount").default(0), // المبلغ المدفوع
  status: text("status").default("pending"), // pending, partial, paid, cancelled
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Invoice line items
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  description: text("description").notNull(), // وصف الخدمة
  serviceType: text("service_type"), // نوع الخدمة (طرف صناعي، علاج طبيعي، مسند)
  quantity: integer("quantity").default(1),
  unitPrice: integer("unit_price").notNull(), // سعر الوحدة
  total: integer("total").notNull(), // الإجمالي
});

// Vendors / suppliers — used for credit purchases tracking
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  currency: text("currency").default("IQD"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Purchases from vendors (credit or cash). Each purchase posts a journal
// entry: Dr Expense (5xxx) / Cr Accounts Payable 2110 (credit) or Cr Cash
// 1111XX (cash). Vendor payments later post Dr AP / Cr Cash.
export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  purchaseNumber: text("purchase_number").notNull().unique(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  purchaseDate: date("purchase_date").notNull(),
  dueDate: date("due_date"),
  category: text("category").notNull(),
  description: text("description"),
  vendorInvoiceNumber: text("vendor_invoice_number"),
  totalAmount: integer("total_amount").notNull(),
  paidAmount: integer("paid_amount").default(0),
  status: text("status").default("pending"), // pending, partial, paid, cancelled
  paymentMethod: text("payment_method").default("credit"), // cash, credit
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Records the accountant's decisions on detected anomalies so the rule
// engine doesn't keep flagging the same record after a human reviewed it.
// `decision = 'reviewed'` is a soft acknowledge with an expiry; `decision
// = 'not_error'` is permanent ("yes we know about this — stop nagging").
export const anomalyDecisions = pgTable("anomaly_decisions", {
  id: serial("id").primaryKey(),
  anomalyType: text("anomaly_type").notNull(), // expense_amount_outlier | expense_duplicate | invoice_overdue | patient_no_payment
  sourceType: text("source_type").notNull(), // expense | invoice | patient
  sourceId: integer("source_id").notNull(),
  decision: text("decision").notNull(), // 'reviewed' | 'not_error'
  reason: text("reason"),
  branchId: integer("branch_id").references(() => branches.id),
  userId: integer("user_id").references(() => systemUsers.id),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI memory notes — manager-written context that the AI explainer reads
// when generating anomaly explanations. Lets the system "learn" the
// business without any actual ML: e.g. seasonal patterns, regular vendors,
// VIP patients, normal large expenses.
export const aiMemoryNotes = pgTable("ai_memory_notes", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id), // null = applies to all branches
  scope: text("scope").notNull(), // 'general' | 'expense' | 'invoice' | 'patient'
  category: text("category"), // optional refinement, e.g. 'hospitality' for ramadan note
  title: text("title").notNull(),
  note: text("note").notNull(),
  createdBy: integer("created_by").references(() => systemUsers.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Follow-up call reminders for physiotherapy patients who stopped coming.
// Active reminders are computed on the fly (physio patient whose last
// non-deleted visit is >= 7 days ago). A row here marks a *handled* episode:
// once the call outcome is recorded the reminder is suppressed. last_visit_anchor
// pins the suppression to the patient's last-visit timestamp at handling time,
// so a later visit re-arms the reminder for the new stop-episode.
export const followUpCalls = pgTable("follow_up_calls", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  lastVisitAnchor: timestamp("last_visit_anchor").notNull(),
  outcomeNote: text("outcome_note").notNull(),
  createdBy: integer("created_by").references(() => systemUsers.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ==================== Prosthetic / medical-support manufacturing ====================
// One work order = one patient assigned to exactly ONE expert. The expert is
// never stored on the patients table; a patient may accumulate several work
// orders over time. History and rework rows are append-only (never deleted).
export const prostheticWorkOrders = pgTable("prosthetic_work_orders", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  expertUserId: integer("expert_user_id").references(() => systemUsers.id).notNull(),
  serviceType: text("service_type").notNull(), // prosthetic | medical_support
  status: text("status").notNull().default("active"),
  currentStage: text("current_stage").notNull().default("new_assignment"),
  expectedDeliveryDate: date("expected_delivery_date"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  finalResult: text("final_result"), // fabrication & fit outcome code (on delivery)
  finalNotes: text("final_notes"),
  assignedBy: integer("assigned_by").references(() => systemUsers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const prostheticWorkHistory = pgTable("prosthetic_work_history", {
  id: serial("id").primaryKey(),
  workOrderId: integer("work_order_id").references(() => prostheticWorkOrders.id).notNull(),
  actionType: text("action_type").notNull(), // created | stage_change | status_change | reassigned | rework | delivered
  fromStage: text("from_stage"),
  toStage: text("to_stage"),
  notes: text("notes"),
  performedBy: integer("performed_by").references(() => systemUsers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const prostheticReworkEvents = pgTable("prosthetic_rework_events", {
  id: serial("id").primaryKey(),
  workOrderId: integer("work_order_id").references(() => prostheticWorkOrders.id).notNull(),
  reworkType: text("rework_type").notNull(), // recast | resocket | major_adjustment | full_remake
  reasonCode: text("reason_code"),
  reasonDetails: text("reason_details"),
  stageWhenDetected: text("stage_when_detected"),
  createdBy: integer("created_by").references(() => systemUsers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

// Custom statistics fields - allows creating custom metrics
export const customStats = pgTable("custom_stats", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // اسم الحقل الإحصائي
  description: text("description"), // وصف الحقل
  statType: text("stat_type").notNull(), // count, sum, percentage, average
  category: text("category").notNull(), // patients, visits, payments, custom
  filterField: text("filter_field"), // الحقل المستخدم للتصفية (مثل: medicalCondition, isAmputee)
  filterValue: text("filter_value"), // القيمة المطلوبة للتصفية
  branchId: integer("branch_id").references(() => branches.id), // null = global (admin only)
  isGlobal: boolean("is_global").default(false), // إذا كان عام لجميع الفروع
  createdBy: text("created_by"), // معرف المستخدم الذي أنشأ الحقل
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBranchSchema = createInsertSchema(branches).omit({ id: true, createdAt: true });
export const insertPatientSchema = createInsertSchema(patients).omit({ id: true, createdAt: true }).extend({
  registrationDate: z.string().optional().nullable(), // تاريخ التسجيل (اختياري - للتسجيل بأثر رجعي)
});
export const insertVisitSchema = createInsertSchema(visits).omit({ id: true, visitDate: true }).extend({
  treatmentType: z.string().optional().nullable(),
  sessionCount: z.number().optional().nullable(),
  cost: z.number().optional().nullable(),
  shift: z.string().optional().nullable(),
  customDate: z.string().optional().nullable(),
});
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true }).extend({
  date: z.string().optional().nullable(),
  paymentTreatmentType: z.string().optional().nullable(),
});
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, uploadedAt: true });
export const insertCustomStatSchema = createInsertSchema(customStats).omit({ id: true, createdAt: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true });
export const insertInstallmentPlanSchema = createInsertSchema(installmentPlans).omit({ id: true, createdAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({ id: true });
export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPurchaseSchema = createInsertSchema(purchases).omit({ id: true, createdAt: true, purchaseNumber: true, paidAmount: true, status: true });
export const insertAnomalyDecisionSchema = createInsertSchema(anomalyDecisions).omit({ id: true, createdAt: true });
export const insertAiMemoryNoteSchema = createInsertSchema(aiMemoryNotes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFollowUpCallSchema = createInsertSchema(followUpCalls).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProstheticWorkOrderSchema = createInsertSchema(prostheticWorkOrders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProstheticWorkHistorySchema = createInsertSchema(prostheticWorkHistory).omit({ id: true, createdAt: true });
export const insertProstheticReworkEventSchema = createInsertSchema(prostheticReworkEvents).omit({ id: true, createdAt: true });

// ============================================================
// نظام المحاسبة الاحترافي - Professional Accounting Tables
// ============================================================

// شجرة الحسابات - Chart of Accounts
export const chartOfAccounts = pgTable("chart_of_accounts", {
  id: serial("id").primaryKey(),
  accountCode: text("account_code").notNull().unique(), // رمز الحساب مثل 1101
  accountNameAr: text("account_name_ar").notNull(), // الاسم بالعربية
  accountNameEn: text("account_name_en"), // الاسم بالإنجليزية
  accountType: text("account_type").notNull(), // asset, liability, equity, revenue, expense
  accountSubtype: text("account_subtype"), // current_asset, fixed_asset, current_liability, etc
  parentId: integer("parent_id"), // self-reference for hierarchy
  branchId: integer("branch_id").references(() => branches.id), // null = مشترك بين كل الفروع
  isActive: boolean("is_active").default(true),
  isSystem: boolean("is_system").default(false), // حسابات النظام لا تُحذف
  normalBalance: text("normal_balance").notNull(), // debit أو credit
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// الفترات المحاسبية - Accounting Periods (لإغلاق الفترات)
export const accountingPeriods = pgTable("accounting_periods", {
  id: serial("id").primaryKey(),
  periodName: text("period_name").notNull(), // مثل: 2026-04 أو Q1-2026
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").default("open"), // open, closed, locked
  closedAt: timestamp("closed_at"),
  closedBy: integer("closed_by").references(() => systemUsers.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// القيود اليومية (الرؤوس) - Journal Entries
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  entryNumber: text("entry_number").notNull().unique(), // JE-202604-0001
  entryDate: date("entry_date").notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  periodId: integer("period_id").references(() => accountingPeriods.id),
  description: text("description").notNull(), // وصف القيد
  reference: text("reference"), // مرجع خارجي (رقم فاتورة، إلخ)
  // ربط بالمصدر الأصلي للتتبع
  sourceType: text("source_type"), // payment, expense, invoice, manual, adjustment, opening
  sourceId: integer("source_id"), // ID في الجدول المصدر
  // المبلغ الإجمالي (مدين = دائن دائماً في قيد متوازن)
  totalAmount: integer("total_amount").notNull(),
  status: text("status").default("posted"), // draft, posted, reversed
  reversedBy: integer("reversed_by"), // إذا تم عكسه، ID القيد العاكس
  reversalOf: integer("reversal_of"), // إذا كان قيد عكسي، ID القيد الأصلي
  createdBy: integer("created_by").references(() => systemUsers.id),
  createdAt: timestamp("created_at").defaultNow(),
  postedAt: timestamp("posted_at"),
});

// سطور القيود - Journal Lines (كل قيد له عدة سطور، مدين أو دائن)
export const journalLines = pgTable("journal_lines", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").references(() => journalEntries.id, { onDelete: "cascade" }).notNull(),
  accountId: integer("account_id").references(() => chartOfAccounts.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id), // لتقارير حسب الفرع
  debit: integer("debit").default(0), // مدين
  credit: integer("credit").default(0), // دائن
  description: text("description"), // شرح السطر
  lineOrder: integer("line_order").default(0),
  // إشارات إضافية للتتبع والتقارير
  patientId: integer("patient_id").references(() => patients.id),
  vendorId: integer("vendor_id"), // مستقبلاً عند إضافة جدول الموردين
});

// سجل التدقيق - Audit Log (تتبع كل التغييرات المالية)
export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // payment, expense, invoice, journal_entry, account
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(), // create, update, delete, post, reverse, approve
  userId: integer("user_id").references(() => systemUsers.id),
  userName: text("user_name"), // نسخة من اسم المستخدم وقت التسجيل
  branchId: integer("branch_id").references(() => branches.id),
  oldValues: text("old_values"), // JSON - القيم قبل التعديل
  newValues: text("new_values"), // JSON - القيم بعد التعديل
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schemas & Types
export const insertChartOfAccountSchema = createInsertSchema(chartOfAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAccountingPeriodSchema = createInsertSchema(accountingPeriods).omit({ id: true, createdAt: true });
export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({ id: true, createdAt: true, postedAt: true });
export const insertJournalLineSchema = createInsertSchema(journalLines).omit({ id: true });
export const insertAuditLogSchema = createInsertSchema(auditLog).omit({ id: true, createdAt: true });

export type ChartOfAccount = typeof chartOfAccounts.$inferSelect;
export type InsertChartOfAccount = z.infer<typeof insertChartOfAccountSchema>;
export type AccountingPeriod = typeof accountingPeriods.$inferSelect;
export type InsertAccountingPeriod = z.infer<typeof insertAccountingPeriodSchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalLine = typeof journalLines.$inferSelect;
export type InsertJournalLine = z.infer<typeof insertJournalLineSchema>;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type InsertAuditLogEntry = z.infer<typeof insertAuditLogSchema>;

export type Branch = typeof branches.$inferSelect;
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Visit = typeof visits.$inferSelect;
export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type CustomStat = typeof customStats.$inferSelect;
export type InsertCustomStat = z.infer<typeof insertCustomStatSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type InstallmentPlan = typeof installmentPlans.$inferSelect;
export type InsertInstallmentPlan = z.infer<typeof insertInstallmentPlanSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type AnomalyDecision = typeof anomalyDecisions.$inferSelect;
export type InsertAnomalyDecision = z.infer<typeof insertAnomalyDecisionSchema>;
export type AiMemoryNote = typeof aiMemoryNotes.$inferSelect;
export type InsertAiMemoryNote = z.infer<typeof insertAiMemoryNoteSchema>;
export type FollowUpCall = typeof followUpCalls.$inferSelect;
export type InsertFollowUpCall = z.infer<typeof insertFollowUpCallSchema>;
export type ProstheticWorkOrder = typeof prostheticWorkOrders.$inferSelect;
export type InsertProstheticWorkOrder = z.infer<typeof insertProstheticWorkOrderSchema>;
export type ProstheticWorkHistory = typeof prostheticWorkHistory.$inferSelect;
export type InsertProstheticWorkHistory = z.infer<typeof insertProstheticWorkHistorySchema>;
export type ProstheticReworkEvent = typeof prostheticReworkEvents.$inferSelect;
export type InsertProstheticReworkEvent = z.infer<typeof insertProstheticReworkEventSchema>;

// System users for internal authentication
export const systemUsers = pgTable("system_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  // Multi-branch access. When non-empty, this user can act on every
  // branch in the array (and switch between them in the UI). The
  // legacy `branchId` is the default/primary branch for compatibility.
  // For single-branch users this stays empty and the system falls
  // back to `branchId`.
  branchIds: jsonb("branch_ids").$type<number[]>().default([]),
  role: text("role").notNull().default("reception"), // admin, branch_manager, accountant, reception, therapist, surveyor
  isActive: boolean("is_active").default(true),
  // Patient Permissions
  canViewPatients: boolean("can_view_patients").default(true),
  canAddPatients: boolean("can_add_patients").default(true),
  canEditPatients: boolean("can_edit_patients").default(false),
  canDeletePatients: boolean("can_delete_patients").default(false),
  // Payment Permissions
  canViewPayments: boolean("can_view_payments").default(true),
  canAddPayments: boolean("can_add_payments").default(true),
  canEditPayments: boolean("can_edit_payments").default(false),
  canDeletePayments: boolean("can_delete_payments").default(false),
  // Reports & Accounting Permissions
  canViewReports: boolean("can_view_reports").default(false),
  canManageAccounting: boolean("can_manage_accounting").default(false),
  // System Permissions
  canManageSettings: boolean("can_manage_settings").default(false),
  canManageUsers: boolean("can_manage_users").default(false),
  canManageTreatmentPlans: boolean("can_manage_treatment_plans").default(false),
  canManageSurveys: boolean("can_manage_surveys").default(false),
  // Per-user visit permissions. Admin and branch_manager get these
  // auto-granted at login; everyone else defaults to false until the
  // admin toggles them on individually.
  canEditVisits: boolean("can_edit_visits").default(false),
  canDeleteVisits: boolean("can_delete_visits").default(false),
  // Sessions module (migration 009). Reception auto-grants enter, branch
  // manager auto-grants all three at login.
  canEnterSessions: boolean("can_enter_sessions").default(false),
  canManageSessionTargets: boolean("can_manage_session_targets").default(false),
  canViewSessionsReport: boolean("can_view_sessions_report").default(false),
  language: text("language").default("ar"), // ar = Arabic, en = English
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System settings for admin credentials and configuration
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: text("setting_value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Branch passwords stored in database for easy management
export const branchPasswords = pgTable("branch_passwords", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id).notNull().unique(),
  password: text("password").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Branch settings for visibility control of sections
export const branchSettings = pgTable("branch_settings", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id).notNull().unique(),
  showDashboard: boolean("show_dashboard").default(true), // لوحة التحكم
  showPatients: boolean("show_patients").default(true), // سجل المرضى + إضافة مريض
  showPayments: boolean("show_payments").default(true), // التقارير المالية
  showAccounting: boolean("show_accounting").default(true), // النظام المحاسبي
  showStatistics: boolean("show_statistics").default(true), // الإحصاءات
  // Legacy columns - kept for backwards compatibility
  showVisits: boolean("show_visits").default(true),
  showDocuments: boolean("show_documents").default(true),
  showExpenses: boolean("show_expenses").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({ id: true, updatedAt: true });
export const insertBranchPasswordSchema = createInsertSchema(branchPasswords).omit({ id: true, updatedAt: true });
export const insertBranchSettingsSchema = createInsertSchema(branchSettings).omit({ id: true, updatedAt: true });
export const insertSystemUserSchema = createInsertSchema(systemUsers).omit({ id: true, createdAt: true, updatedAt: true });

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type BranchPassword = typeof branchPasswords.$inferSelect;
export type InsertBranchPassword = z.infer<typeof insertBranchPasswordSchema>;
export type BranchSetting = typeof branchSettings.$inferSelect;
export type InsertBranchSetting = z.infer<typeof insertBranchSettingsSchema>;
export type SystemUser = typeof systemUsers.$inferSelect;
export type InsertSystemUser = z.infer<typeof insertSystemUserSchema>;

export const treatmentPlans = pgTable("treatment_plans", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  therapistId: integer("therapist_id").references(() => systemUsers.id),
  therapistName: text("therapist_name"),
  diagnosis: text("diagnosis"),
  injuryType: text("injury_type"),
  injuryLocation: text("injury_location"),
  diseaseHistory: text("disease_history"),
  mmtAssessment: text("mmt_assessment"),
  spasticity: text("spasticity"),
  sensation: text("sensation"),
  painLevel: text("pain_level"),
  adl: text("adl"),
  sessionCount: integer("session_count"),
  sessionFrequency: text("session_frequency"),
  deviceType: text("device_type"),
  goalType: text("goal_type"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTreatmentPlanSchema = createInsertSchema(treatmentPlans).omit({ id: true, createdAt: true, updatedAt: true });
export type TreatmentPlan = typeof treatmentPlans.$inferSelect;
export type InsertTreatmentPlan = z.infer<typeof insertTreatmentPlanSchema>;

export const surveyTemplates = pgTable("survey_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  targetType: text("target_type").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const surveyQuestions = pgTable("survey_questions", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => surveyTemplates.id).notNull(),
  questionText: text("question_text").notNull(),
  questionTextEn: text("question_text_en"),
  questionOrder: integer("question_order").notNull(),
  questionType: text("question_type").notNull(),
  category: text("category"),
});

export const surveyResponses = pgTable("survey_responses", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => surveyTemplates.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  surveyorId: integer("surveyor_id").references(() => systemUsers.id),
  surveyorName: text("surveyor_name"),
  totalScore: integer("total_score"),
  maxScore: integer("max_score"),
  percentage: integer("percentage"),
  notes: text("notes"),
  completedAt: timestamp("completed_at").defaultNow(),
});

export const surveyAnswers = pgTable("survey_answers", {
  id: serial("id").primaryKey(),
  responseId: integer("response_id").references(() => surveyResponses.id).notNull(),
  questionId: integer("question_id").references(() => surveyQuestions.id).notNull(),
  ratingValue: integer("rating_value"),
  textValue: text("text_value"),
  boolValue: boolean("bool_value"),
});

export const insertSurveyTemplateSchema = createInsertSchema(surveyTemplates).omit({ id: true, createdAt: true });
export const insertSurveyQuestionSchema = createInsertSchema(surveyQuestions).omit({ id: true });
export const insertSurveyResponseSchema = createInsertSchema(surveyResponses).omit({ id: true, completedAt: true });
export const insertSurveyAnswerSchema = createInsertSchema(surveyAnswers).omit({ id: true });

export type SurveyTemplate = typeof surveyTemplates.$inferSelect;
export type InsertSurveyTemplate = z.infer<typeof insertSurveyTemplateSchema>;
export type SurveyQuestion = typeof surveyQuestions.$inferSelect;
export type InsertSurveyQuestion = z.infer<typeof insertSurveyQuestionSchema>;
export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;
export type SurveyAnswer = typeof surveyAnswers.$inferSelect;
export type InsertSurveyAnswer = z.infer<typeof insertSurveyAnswerSchema>;

// ===========================================================================
// Session tracking module (migration 009)
// Per-branch / per-day / per-shift counts for 15 physiotherapy devices,
// plus monthly targets per branch+device.
// ===========================================================================

export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dailySessions = pgTable("daily_sessions", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  sessionDate: date("session_date").notNull(),
  shift: text("shift").notNull(), // 'morning' | 'evening'
  createdBy: integer("created_by").references(() => systemUsers.id).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessionCounts = pgTable("session_counts", {
  id: serial("id").primaryKey(),
  dailySessionId: integer("daily_session_id").references(() => dailySessions.id, { onDelete: "cascade" }).notNull(),
  deviceId: integer("device_id").references(() => devices.id).notNull(),
  count: integer("count").notNull().default(0),
});

export const monthlyTargets = pgTable("monthly_targets", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  deviceId: integer("device_id").references(() => devices.id).notNull(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  targetCount: integer("target_count").notNull().default(0),
  setBy: integer("set_by").references(() => systemUsers.id).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDeviceSchema = createInsertSchema(devices).omit({ id: true, createdAt: true });
export const insertDailySessionSchema = createInsertSchema(dailySessions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSessionCountSchema = createInsertSchema(sessionCounts).omit({ id: true });
export const insertMonthlyTargetSchema = createInsertSchema(monthlyTargets).omit({ id: true, updatedAt: true });

export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type DailySession = typeof dailySessions.$inferSelect;
export type InsertDailySession = z.infer<typeof insertDailySessionSchema>;
export type SessionCount = typeof sessionCounts.$inferSelect;
export type InsertSessionCount = z.infer<typeof insertSessionCountSchema>;
export type MonthlyTarget = typeof monthlyTargets.$inferSelect;
export type InsertMonthlyTarget = z.infer<typeof insertMonthlyTargetSchema>;
