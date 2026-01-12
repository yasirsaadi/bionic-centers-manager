export * from "./models/auth";
import { pgTable, text, serial, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  weight: text("weight"), // Text to allow "70kg" etc or just number
  height: text("height"),
  medicalCondition: text("medical_condition").notNull(),
  // For amputees
  isAmputee: boolean("is_amputee").default(false),
  amputationSite: text("amputation_site"),
  // For physiotherapy
  isPhysiotherapy: boolean("is_physiotherapy").default(false),
  diseaseType: text("disease_type"),
  
  totalCost: integer("total_cost").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  amount: integer("amount").notNull(),
  notes: text("notes"),
  date: timestamp("date").defaultNow(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  documentType: text("document_type").notNull(), // report, xray, id, undertaking
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const insertPatientSchema = createInsertSchema(patients).omit({ id: true, createdAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, date: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, uploadedAt: true });

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
