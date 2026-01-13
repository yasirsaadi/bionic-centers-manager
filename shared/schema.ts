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
  age: integer("age").notNull(),
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

export const insertBranchSchema = createInsertSchema(branches).omit({ id: true, createdAt: true });
export const insertPatientSchema = createInsertSchema(patients).omit({ id: true, createdAt: true });
export const insertVisitSchema = createInsertSchema(visits).omit({ id: true, visitDate: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, date: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, uploadedAt: true });

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
