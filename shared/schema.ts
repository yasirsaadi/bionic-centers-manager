export * from "./models/auth";
import { pgTable, text, serial, integer, boolean, timestamp, varchar, date } from "drizzle-orm/pg-core";
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
  age: text("age").notNull(),
  weight: text("weight"),
  height: text("height"),
  medicalCondition: text("medical_condition").notNull(),
  injuryCause: text("injury_cause"),
  injuryDate: date("injury_date"),
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
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  amount: integer("amount").notNull(),
  notes: text("notes"),
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
export const insertVisitSchema = createInsertSchema(visits).omit({ id: true, visitDate: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true }).extend({
  date: z.string().optional().nullable(),
});
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, uploadedAt: true });
export const insertCustomStatSchema = createInsertSchema(customStats).omit({ id: true, createdAt: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true });
export const insertInstallmentPlanSchema = createInsertSchema(installmentPlans).omit({ id: true, createdAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({ id: true });

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

// System users for internal authentication
export const systemUsers = pgTable("system_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  role: text("role").notNull().default("reception"), // admin, branch_manager, reception
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
