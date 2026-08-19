export * from "./models/auth";
import { pgTable, text, serial, integer, bigint, bigserial, boolean, timestamp, varchar, date, numeric, jsonb, check, foreignKey, index, unique, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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
  // الهوية العلنية الدائمة (migration 052): WB-01629. تُطبع وتُقال وتُرسَل
  // عبر تلغرام ويُبحَث بها. تولّدها القاعدة من تسلسل مخصَّص ولا يختارها
  // عميل، ولا تتغيّر أبداً بعد الإنشاء — ولا تُشتقّ من أي بيانٍ للمريض.
  // و`id` يبقى المفتاح الداخلي لكلّ الصلات؛ هذا للبشر لا للجداول.
  patientCode: text("patient_code").notNull(),
  name: text("name").notNull(),
  // رقم الاتصال الأساسي — بالمريض أو بالمسؤول عنه (طفل برقم أبيه مثلاً).
  // `phone` هو ما كتبه الموظف حرفياً ولا يُمسّ؛ الأعمدة الثلاثة تحته
  // مشتقّة منه عبر `shared/phone.ts` (migration 043). عمداً nullable على
  // مستوى القاعدة: آلاف الصفوف القديمة بلا رقم، والإلزام يُفرض في طبقة
  // الـAPI للمرضى الجدد وحدهم.
  phone: text("phone"),
  phoneE164: text("phone_e164"),       // +9647701234567 — مفتاح المطابقة وكشف التكرار
  phoneCountry: text("phone_country"), // IQ | TR | ISO أخرى | INTL
  phoneStatus: text("phone_status"),   // ok | needs_review

  // ══ أعمدةُ البحث المشتقّة (migration 054) ════════════════════════════
  // `GENERATED ALWAYS … STORED`: تحسبها القاعدة عند كل كتابة، فلا تُدرَج ولا
  // تُحدَّث من التطبيق أبداً — ولذلك تُسقطها `createInsertSchema` تلقائياً.
  //
  // **ولماذا عمودٌ لا فهرسُ تعبير**: فهرسُ التعبير كان يُسرّع الترشيح ثمّ
  // يعيد استدعاء المطبِّع لكل صفٍّ عند إعادة الفحص والترتيب — قياسٌ على
  // ٦٠٬٠٠٠ صفّ: ١٢٤٤ مللي ثانية. والعمود المخزَّن ٣٠. والفرقُ ليس تحسيناً
  // تجميلياً: هو الفرق بين `Bitmap Index Scan` و`Parallel Seq Scan`.
  //
  // مصدرُهما `patient_search_norm` و`patient_digits_only`، وهما مطابقتان
  // خطوةً بخطوة لـ`shared/patient_search.ts` — واختبارٌ يحرس التطابق.
  nameNorm: text("name_norm").generatedAlwaysAs(sql`patient_search_norm(name)`),
  phoneDigits: text("phone_digits").generatedAlwaysAs(sql`patient_digits_only(phone)`),
  codeDigits: text("code_digits").generatedAlwaysAs(sql`patient_digits_only(patient_code)`),
  address: text("address"),
  referralSource: text("referral_source").notNull(), // الجهة المحول منها
  // كيف عرف «الشخص الآخر» بالمركز — يُملأ فقط حين تكون الجهة «من شخص آخر».
  // عمود مستقل لا جزء من referral_source، لأن الإحصاءات تجمّع بذلك العمود.
  referralSubSource: text("referral_sub_source"),
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
  // The physiotherapy course the patient BOUGHT: [{treatmentType, sessionCount}]
  // (migration 036). Written by «الكلفة والجلسات» and topped up by «جلسات علاج
  // إضافية», it is what the session counter measures consumption against.
  // NULL on patients from the old flow, whose sessions live on their payments —
  // the counter falls back to those, so nothing about them changes.
  physioPlan: jsonb("physio_plan").$type<{ treatmentType: string; sessionCount: number }[]>(),

  // For medical support (مساند طبية)
  isMedicalSupport: boolean("is_medical_support").default(false),
  supportType: text("support_type"), // نوع المسند
  injurySide: text("injury_side"), // جهة الاصابة
  
  totalCost: integer("total_cost").default(0), // in IQD
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Independent cases per patient (Phase 1 foundation) ──────────────────────
// One patient identity, but each specialty (physiotherapy / prosthetic /
// medical_support) is its OWN case with its own details, cost, visits and
// payments. This replaces the flat, physio-centric patient row where all
// case types shared one set of columns (the source of the merge/payment bugs).
// The legacy patient columns/flags remain populated in parallel until later
// phases cut over, so this table is purely additive and non-breaking.
export const patientCases = pgTable("patient_cases", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  caseType: text("case_type").notNull(), // physiotherapy | prosthetic | medical_support
  status: text("status").notNull().default("active"), // active | closed
  cost: integer("cost").notNull().default(0), // total cost for THIS case, IQD
  // Who owns this cost figure. 'auto' = derived (migration/sync/cost-floor) and
  // MAY be adjusted by the automatic cost floor; 'manual' = a human priced it
  // (per-case ✏️ editor, تخصيص, add-case-type) and automation must NEVER touch it.
  costSource: text("cost_source").notNull().default("auto"), // auto | manual
  // Type-specific fields live here (amputationSite, prostheticType, siliconSize,
  // diseaseType, supportType, …) so each case owns its own details.
  details: jsonb("details").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // ONE case row per (patient, type) — the database-level backstop against
  // concurrent syncPatientCases runs duplicating a case. Also created by
  // migration 020 (after de-duplicating) for existing databases.
  uniqueIndex("uq_patient_cases_patient_type").on(t.patientId, t.caseType),
  /**
   * يقبله المفتاح المركّب في `patientDeviceEpisodes`.
   *
   * **قيدُ تفرّدٍ لا فهرسَ تفرّد**: `drizzle-kit push` يضيف المفاتيح الأجنبية
   * **قبل** أن ينشئ الفهارس، فمفتاحٌ يشير إلى فهرسٍ لم يُنشأ بعد يسقط بـ
   * «no unique constraint matching given keys». والقيد يُكتب داخل
   * `CREATE TABLE` فيسبقها جميعاً. (وPostgres يبني له فهرساً ضمناً، فلا
   * فرق في الأثر.)
   *
   * ولا يضيف شرطاً جديداً على البيانات — `id` مفتاحٌ أساسي أصلاً فالزوج
   * فريدٌ حتماً.
   */
  unique("uq_patient_cases_id_patient").on(t.patientId, t.id),
]);

// ── حلقات أجهزة المريض (migration 049) ──────────────────────────────────────
// **عملية شراء جهاز واحد.** المريض يشتري طرفاً، يُصنَّع ويُسلَّم، ثم يعود بعد
// سنتين ليشتري طرفاً آخر من النوع نفسه — و`patient_cases` خيطُ اختصاصٍ دائم
// (صفٌّ واحد لكل نوع) لا يتّسع لشراءين، و`prosthetic_work_orders` مهمّةُ
// تصنيع تبدأ بعد المعاينة والتخصيص. فالحلقة هي الكيان الذي **يبدأ قبلهما
// وينتهي بعدهما**: من قرار الشراء إلى صيانةٍ بعد سنوات.
//
// والقسمة صارمة: الحلقة تملك **الشراء** (الهوية، التسلسل، الحالة، السعر
// المتفق عليه)، وأمرُ التصنيع يملك **التنفيذ** (الخبير، المراحل، الموعد،
// التسليم). ولا حقيقة مكرَّرة في الاثنين — فلا مصدر ثانٍ ينحرف.
export const patientDeviceEpisodes = pgTable("patient_device_episodes", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  // خيط الاختصاص. إلزامي: شراءٌ بلا خيط لا معنى له.
  // و`serviceType` غير موجود عمداً — يُشتقّ من `patientCases.caseType`،
  // والحالة واحدة لكل نوع فيكفي `caseId` لكل فهرس ولكل استعلام.
  caseId: integer("case_id").references(() => patientCases.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  /** ترتيب الجهاز داخل خيطه: ١، ٢، ٣… فيُقال «طرف صناعي #٢» بلا حساب. */
  sequenceNumber: integer("sequence_number").notNull(),
  status: text("status").notNull().default("awaiting_exam"),
  /**
   * السعر المتفق عليه لهذا الجهاز وحده — لا مجموع الخيط.
   * يبقى صفراً حتى تُبنى نقطة اعتماده («تخصيص») في مرحلة لاحقة.
   */
  agreedCost: integer("agreed_cost").notNull().default(0),
  createdBy: integer("created_by").references(() => systemUsers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancelReason: text("cancel_reason"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // الحالات الخمس محروسةً في القاعدة لا في التطبيق: قيمةٌ مخترَعة من سكربت
  // أو من Console تُردّ عند الكتابة لا تُكتشَف بعد شهر.
  check("patient_device_episodes_status_check",
    sql`${t.status} IN ('awaiting_exam', 'examined', 'in_manufacturing', 'delivered', 'cancelled')`),
  uniqueIndex("uq_pde_case_seq").on(t.caseId, t.sequenceNumber),
  // **شراءٌ مفتوحٌ واحد لكل خيط** — حقيقةٌ في القاعدة لا قاعدةٌ في الشيفرة.
  uniqueIndex("uq_pde_case_open")
    .on(t.caseId)
    .where(sql`status NOT IN ('delivered', 'cancelled')`),
  index("ix_pde_patient").on(t.patientId),
  // يقبله المفتاح المركّب في الجداول الأربعة التابعة — قيداً لا فهرساً،
  // للسبب نفسه المشروح على `patientCases`.
  unique("uq_pde_id_patient").on(t.patientId, t.id),
  /**
   * **لا حلقةٌ لمريضٍ على خيط مريضٍ آخر.**
   *
   * المفتاحان المفردان يحرسان الوجود لا الانتماء: صفٌّ يحمل `patientId`
   * للمريض «أ» و`caseId` لخيط المريض «ب» يمرّ من كليهما — كلٌّ منهما صادق
   * وحده، والكذبة في الجمع بينهما. والمركّب يطابق **الزوج** بأكمله.
   */
  foreignKey({
    name: "patient_device_episodes_patient_case_fk",
    columns: [t.patientId, t.caseId],
    foreignColumns: [patientCases.patientId, patientCases.id],
  }),
]);

export const PATIENT_DEVICE_EPISODE_STATUSES = [
  "awaiting_exam", "examined", "in_manufacturing", "delivered", "cancelled",
] as const;
export type PatientDeviceEpisodeStatus = (typeof PATIENT_DEVICE_EPISODE_STATUSES)[number];

// ── سجل أحداث المريض (migration 044) ────────────────────────────────────────
// سرد مشتقّ لما حدث للمريض عبر كل الأقسام — **وليس مصدر حقيقة لأي عملية
// تجارية**. لا يملك مالاً ولا رصيداً ولا حالة تصنيع ولا موعداً ولا حالة
// مريض، ولا يقرأ منه أحد ليقرّر شيئاً. الجداول التجارية تبقى صاحبة الحقيقة.
//
// مفتاح أجنبي واحد فقط — إلى `patients` — وكل ما عداه لقطات بلا مفاتيح
// (`case_id`, `source_id`, `branch_id`, `actor_user_id`)، بنفس درس
// `payments.visit_id` و `medical_exams.proposed_expert_user_id`: مفتاح
// أجنبي هنا كان سيقيّد ترتيب الكاسكيد ويكسر الدمج عند تحريك الحالات.
//
// غير قابل للتعديل: ترِكر `BEFORE UPDATE` يرفض كل تعديل إلا عبر الباب
// المراقَب `app.allow_event_edit`، ومستعمِله الوحيد المشروع هو إعادة توجيه
// الأحداث في `mergePatients`. و`DELETE` يبقى مسموحاً لأن كاسكيد حذف المريض
// يحتاجه.
// رموزُ ملفّاتٍ دُمجت (migration 052) — تبقى حيّةً تشير إلى الملفّ الباقي.
//
// الرمز قد يكون طُبع أو أُرسل عبر تلغرام أو قيل للمريض قبل الدمج. فلو مات
// بموت صفّه لصار بيد المريض ورقةٌ لا تدلّ على شيء. والرمز مفتاحٌ أوّلي هنا،
// فتفرّده عبر الجدولين مضمونٌ بنيوياً لا بفحصٍ في التطبيق.
export const patientCodeAliases = pgTable("patient_code_aliases", {
  code: text("code").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reason: text("reason").notNull().default("merge"),
});

export const patientEvents = pgTable("patient_events", {
  // BIGSERIAL: ينمو مع كل زيارة ودفعة ومرحلة تصنيع، فحدّ الـ32-بت قريب
  // على مدى سنوات. `mode: "number"` آمن حتى 2^53، وهو أبعد من أي أفق.
  id: bigserial("id", { mode: "number" }).primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  branchId: integer("branch_id"),
  caseId: integer("case_id"),
  caseType: text("case_type"), // prosthetic | medical_support | physiotherapy
  // من سجل `shared/patient_events.ts` حصراً — لا نصّ حرّ من أي مكان.
  eventType: text("event_type").notNull(),
  // الإشارة إلى الجدول المصدر بلا ارتباط به: 'work_order' | 'payment' | …
  sourceType: text("source_type"),
  // BIGINT لا INTEGER: مصادر اليوم كلها serial، لكن أي مصدر مستقبلي بمفتاح
  // كبير كان سيفيض صامتاً.
  sourceId: bigint("source_id", { mode: "number" }),
  // كل ما يلزم لعرض الحدث **بلا join** — نفس مبدأ لقطة `doctor_name`.
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  visibility: text("visibility").notNull().default("internal"), // internal | patient
  actorUserId: integer("actor_user_id"),
  actorName: text("actor_name"), // لقطة الاسم — يبقى مقروءاً بعد حذف الحساب
  // الزمن التجاري لا زمن الصفّ: تسجيل بأثر رجعي يحمل تاريخه هو، وإلا ناقض
  // السرد دفتر الكلف (نفس علّة ترحيل 034).
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // منع التكرار — نطاقه **لكل مريض** لا عالمي. انظر `eventDedupeKey`.
  dedupeKey: text("dedupe_key"),
}, (t) => [
  index("idx_patient_events_patient").on(t.patientId, t.occurredAt.desc()),
  index("idx_patient_events_branch").on(t.branchId, t.occurredAt.desc()),
  index("idx_patient_events_type").on(t.eventType, t.occurredAt.desc()),
  uniqueIndex("uq_patient_events_dedupe")
    .on(t.patientId, t.dedupeKey)
    .where(sql`dedupe_key IS NOT NULL`),
  // آخر خطّ دفاع عن الوجهة، مطابق حرفياً لما في migration 044. السياسة
  // تُفرَض في `resolveVisibility` قبل كل كتابة؛ هذا يمنع قيمةً ثالثة من
  // التسلّل عبر كتابة مباشرة أو ترحيل لاحق.
  check("patient_events_visibility_check", sql`${t.visibility} IN ('internal', 'patient')`),
]);

export type PatientEvent = typeof patientEvents.$inferSelect;
export type InsertPatientEvent = typeof patientEvents.$inferInsert;

// ── هوية تواصل المريض (migration 047) ───────────────────────────────────
// حساب تواصل خارجي مرتبط بملفّ مريض. **لا عمود في `patients`**: أبٌ واحد
// يتابع ثلاثة أبناء بحسابٍ واحد، والابن يكبر فيربط حسابه، والوصاية تُسحَب —
// وعمودٌ واحد يعجز عن الثلاثة.
//
// ووجود الصفّ يعني **الربط وحده**: لا أن الرقم يساوي `patients.phone`، ولا
// أن صاحب الحساب هو المريض، ولا أن ملكيةً تحقّقت. حقائق أخرى لأعمدة أخرى
// لم تُكتب بعد.
export const patientContacts = pgTable("patient_contacts", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  channel: text("channel").notNull(),          // telegram (الوحيد اليوم)
  // نصّ لا رقم: معرّف تلغرام يتجاوز 32-بت، وغيره ليس رقماً أصلاً.
  externalId: text("external_id").notNull(),
  // self | guardian | family | caregiver | other — تُحسم عند إنشاء الرابط.
  relation: text("relation").notNull(),
  linkedAt: timestamp("linked_at", { withTimezone: true }).notNull().defaultNow(),
  // النشِط هو ما هذا فارغ فيه. لا عمود `status` موازٍ ينحرف عنه.
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // نشِطٌ واحد لكل (مريض، قناة، حساب). جزئي: السحب يُبقي التاريخ، وإعادة
  // الربط بعده تُنشئ صفّاً جديداً بلا تصادم.
  uniqueIndex("uq_patient_contacts_active")
    .on(t.patientId, t.channel, t.externalId)
    .where(sql`revoked_at IS NULL`),
  // ولا تفرّد عالمي على `external_id`: حسابٌ واحد لعدّة مرضى حالةٌ طبيعية.
  index("idx_patient_contacts_external").on(t.channel, t.externalId),
  index("idx_patient_contacts_patient").on(t.patientId),
]);

export type PatientContact = typeof patientContacts.$inferSelect;
export type InsertPatientContact = typeof patientContacts.$inferInsert;

// تذكرة ربط لمرّة واحدة. **نصّها لا يُخزَّن** — بصمته وحدها، فتسريب نسخة
// القاعدة لا يعطي رابطاً صالحاً.
export const patientLinkTokens = pgTable("patient_link_tokens", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  channel: text("channel").notNull(),
  // الصلة تُحسم هنا وتُنسَخ إلى جهة الاتصال عند الاستهلاك — فلا يعلن
  // المستهلِك عن نفسه ما ليس له.
  relation: text("relation").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  consumedByExternalId: text("consumed_by_external_id"),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdByUserId: integer("created_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_patient_link_tokens_patient").on(t.patientId),
  // المعلَّقة: غير مستهلَكة وغير مسحوبة.
  index("idx_patient_link_tokens_pending")
    .on(t.expiresAt)
    .where(sql`consumed_at IS NULL AND revoked_at IS NULL`),
]);

export type PatientLinkToken = typeof patientLinkTokens.$inferSelect;
export type InsertPatientLinkToken = typeof patientLinkTokens.$inferInsert;

// صندوق الصادر: رسالة مستحقّة **لجهة اتصال بعينها**. الوحدة (حدث، جهة)
// لأنها وحدة النجاح والفشل — أبٌ وأمٌّ يتابعان الابن نفسه، فتنجح إحداهما
// وتفشل الأخرى. ولا يُخزَّن هنا معرّف حساب ولا سرّ ولا نصّ خطأ خام.
export const patientNotificationDeliveries = pgTable("patient_notification_deliveries", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  // فارغ لرسائل الربط: ليست حدثاً في تاريخ المريض، ولا يُخترع لها حدث.
  patientEventId: bigint("patient_event_id", { mode: "number" }).references(() => patientEvents.id),
  patientContactId: bigint("patient_contact_id", { mode: "number" })
    .references(() => patientContacts.id).notNull(),
  channel: text("channel").notNull(),
  notificationType: text("notification_type").notNull(),
  // ما يحتاجه النصّ فقط: المرحلة أو الموعد. لا سبب ولا فاعل ولا حالة.
  payload: jsonb("payload").notNull().default({}),
  // pending | processing | sent | failed | skipped
  status: text("status").notNull().default("pending"),
  attemptCount: integer("attempt_count").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  // ختم الحجز — عاملٌ مات وهو يرسل يُستردّ صفّه بعد انقضاء المهلة.
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  // **رمز** من قائمة مغلقة: نصّ خطأ الشبكة قد يحمل عنوان Bot API وفيه التوكن.
  lastErrorCode: text("last_error_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // رسالة واحدة لكل (حدث، جهة). جزئي: رسائل الربط بلا حدث.
  uniqueIndex("uq_pnd_event_contact")
    .on(t.patientEventId, t.patientContactId)
    .where(sql`patient_event_id IS NOT NULL`),
  // ورسالةٌ واحدة من كل نوع ربط لكل جهة — رسائل الربط بلا حدث فلا يمسّها
  // الفهرس الأول.
  uniqueIndex("uq_pnd_contact_link_type")
    .on(t.patientContactId, t.notificationType)
    .where(sql`patient_event_id IS NULL`),
  index("idx_pnd_due").on(t.nextAttemptAt).where(sql`status IN ('pending', 'failed')`),
  index("idx_pnd_locked").on(t.lockedAt).where(sql`status = 'processing'`),
  index("idx_pnd_patient").on(t.patientId),
  index("idx_pnd_contact").on(t.patientContactId),
]);

export type PatientNotificationDelivery = typeof patientNotificationDeliveries.$inferSelect;
export type InsertPatientNotificationDelivery = typeof patientNotificationDeliveries.$inferInsert;

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
  // Which case (physiotherapy / prosthetic / medical_support) this visit belongs
  // to. Nullable during the additive phase; backfilled best-effort.
  caseId: integer("case_id").references(() => patientCases.id),
  /**
   * حلقة الجهاز التي يخصّها هذا الصفّ (migration 049). فارغة لكل صفٍّ قائم،
   * ولا يكتبها أحد بعد — هذه المرحلة أساسٌ بلا سلوك.
   */
  deviceEpisodeId: integer("device_episode_id").references(() => patientDeviceEpisodes.id),
  // Soft delete. Reads always filter `deleted_at IS NULL` so the row
  // stays recoverable indefinitely. Hard deletes only happen during the
  // deletePatient cascade — the BEFORE DELETE trigger captures those
  // rows into `visits_forensic_log`.
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  /**
   * **لا صفَّ لمريضٍ على حلقة مريضٍ آخر** — سلامةٌ مرجعية مركّبة.
   *
   * المفتاح المفرد يحرس وجودَ الحلقة لا انتماءها: صفٌّ للمريض «أ» يشير إلى
   * حلقة المريض «ب» يمرّ منه، فيذهب ماله وتاريخه إلى ملفٍّ ليس ملفَّه.
   * والمركّب يطابق `(patient_id, id)` معاً فيُغلق الباب.
   *
   * و`MATCH SIMPLE` (السلوك الافتراضي) يجعله آمناً للصفوف القائمة: حين
   * تكون الحلقة فارغة لا يُفحَص القيد إطلاقاً.
   */
  foreignKey({
    name: "visits_patient_episode_fk",
    columns: [t.patientId, t.deviceEpisodeId],
    foreignColumns: [patientDeviceEpisodes.patientId, patientDeviceEpisodes.id],
    // يتبع التابعُ حلقتَه حين تنتقل إلى ملفٍّ آخر في الدمج — ولولاه لسقط
    // الدمج في منتصفه على زوجٍ لم يعد موجوداً. والحذف يبقى NO ACTION.
  }).onUpdate("cascade"),
]);

// Captures every visit row that gets physically deleted, regardless of
// source — app cascade, manual SQL from Neon Console, anything that
// issues DELETE FROM visits. Populated by a BEFORE DELETE trigger in
// migration 011 so we always have a row-level forensic trail even when
// the application audit_log can't see the operation.
export const visitsForensicLog = pgTable("visits_forensic_log", {
  id: serial("id").primaryKey(),
  loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
  // The trigger (migration 011) does NOT pass this column — Postgres fills it
  // from the default. Declaring notNull() without the default made this file
  // disagree with the real table, so a `db:push` would have dropped the
  // default and broken every visit delete (and with it every patient delete,
  // which cascades through visits). Mirrors migration 011 exactly.
  pgUser: text("pg_user").notNull().default(sql`current_user`),
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
  // Which case this payment settles. Nullable during the additive phase;
  // backfilled best-effort from the treatment-type tag.
  caseId: integer("case_id").references(() => patientCases.id),
  // What created this payment (migration 038): the paid visit or the invoice
  // collection. Plain ids, no FK — deletePatient removes invoices before
  // payments, and an FK here would break that cascade order.
  visitId: integer("visit_id"),
  invoiceId: integer("invoice_id"),
  /**
   * حلقة الجهاز التي يخصّها هذا الصفّ (migration 049). فارغة لكل صفٍّ قائم،
   * ولا يكتبها أحد بعد — هذه المرحلة أساسٌ بلا سلوك.
   */
  deviceEpisodeId: integer("device_episode_id").references(() => patientDeviceEpisodes.id),
  date: timestamp("date").defaultNow(),
}, (t) => [
  /**
   * **لا صفَّ لمريضٍ على حلقة مريضٍ آخر** — سلامةٌ مرجعية مركّبة.
   *
   * المفتاح المفرد يحرس وجودَ الحلقة لا انتماءها: صفٌّ للمريض «أ» يشير إلى
   * حلقة المريض «ب» يمرّ منه، فيذهب ماله وتاريخه إلى ملفٍّ ليس ملفَّه.
   * والمركّب يطابق `(patient_id, id)` معاً فيُغلق الباب.
   *
   * و`MATCH SIMPLE` (السلوك الافتراضي) يجعله آمناً للصفوف القائمة: حين
   * تكون الحلقة فارغة لا يُفحَص القيد إطلاقاً.
   */
  foreignKey({
    name: "payments_patient_episode_fk",
    columns: [t.patientId, t.deviceEpisodeId],
    foreignColumns: [patientDeviceEpisodes.patientId, patientDeviceEpisodes.id],
    // يتبع التابعُ حلقتَه حين تنتقل إلى ملفٍّ آخر في الدمج — ولولاه لسقط
    // الدمج في منتصفه على زوجٍ لم يعد موجوداً. والحذف يبقى NO ACTION.
  }).onUpdate("cascade"),
]);

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  documentType: text("document_type").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Dated cost ledger (migration 033). `patients.total_cost` is a single
// running number with no history, so no report could ever answer "how much
// cost was CREATED on day X" — the daily report used to fake it from the
// day's registrees and produced meaningless per-day remainders. Every path
// that moves total_cost writes a dated entry here with the SAME delta, so
// sum(entries per patient) == patients.total_cost from the backfill onward.
// Negative amounts are legitimate (case retirement, re-pricing downward).
export const costEntries = pgTable("cost_entries", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  branchId: integer("branch_id"),
  amount: integer("amount").notNull(),
  // 'opening' (backfill) | 'registration' | 'assign_manufacturing' |
  // 'physio_pricing' | 'maintenance' | 'new_service' | 'add_case_type' |
  // 'visit' | 'case_retired' | 'manual_edit'
  source: text("source").notNull(),
  notes: text("notes"),
  /**
   * حلقة الجهاز التي يخصّها هذا الصفّ (migration 049). فارغة لكل صفٍّ قائم،
   * ولا يكتبها أحد بعد — هذه المرحلة أساسٌ بلا سلوك.
   */
  deviceEpisodeId: integer("device_episode_id").references(() => patientDeviceEpisodes.id),
  /**
   * حالةُ المريض التي يخصّها هذا القيد (ترحيل ٠٥٦) — **وهي قسمُه**.
   *
   * القسمُ لا يُخزَّن نصّاً: `patient_cases.case_type` هو القسم، فالرابطُ
   * يُبقي مصدرَ الحقيقة واحداً ولا ينحرف عنه صفٌّ يوماً. وفارغةٌ لكلّ صفٍّ
   * كُتب قبل الترحيل، ولمعاملةٍ إدارية لا تخصّ قسماً بعينه — ويظهر ذلك
   * «غير مبوَّب» في التقرير بدل أن يُخمَّن.
   *
   * **و`SET NULL` مقصودة**: «سحبُ نوع حالة» يحذف صفَّ الحالة فعلاً وقيودُ
   * كلفتها تبقى تاريخاً. فبلا هذا البند ينكسر السحبُ على المفتاح؛ ومعه
   * تصير تلك القيود «غير مبوَّبة» — وهو الصدقُ عينُه: العلاقةُ التي كانت
   * تحملُ قسمَها لم تعد موجودة. (ترحيل ٠٥٦ يعرّفها هكذا، وهذا السطرُ
   * يطابقه حرفاً كي لا تنحرف قاعدةُ `db:push` عن قاعدةِ الترحيل.)
   */
  caseId: integer("case_id").references(() => patientCases.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  /**
   * **لا صفَّ لمريضٍ على حلقة مريضٍ آخر** — سلامةٌ مرجعية مركّبة.
   *
   * المفتاح المفرد يحرس وجودَ الحلقة لا انتماءها: صفٌّ للمريض «أ» يشير إلى
   * حلقة المريض «ب» يمرّ منه، فيذهب ماله وتاريخه إلى ملفٍّ ليس ملفَّه.
   * والمركّب يطابق `(patient_id, id)` معاً فيُغلق الباب.
   *
   * و`MATCH SIMPLE` (السلوك الافتراضي) يجعله آمناً للصفوف القائمة: حين
   * تكون الحلقة فارغة لا يُفحَص القيد إطلاقاً.
   */
  foreignKey({
    name: "cost_entries_patient_episode_fk",
    columns: [t.patientId, t.deviceEpisodeId],
    foreignColumns: [patientDeviceEpisodes.patientId, patientDeviceEpisodes.id],
    // يتبع التابعُ حلقتَه حين تنتقل إلى ملفٍّ آخر في الدمج — ولولاه لسقط
    // الدمج في منتصفه على زوجٍ لم يعد موجوداً. والحذف يبقى NO ACTION.
  }).onUpdate("cascade"),
  /**
   * فهرسُ تبويب التقارير (ترحيل ٠٥٦) — التقريرُ يجمع قيودَ فترةٍ ويقسّمها
   * بالحالة، فالفهرسُ على الرابط.
   *
   * **والجزئيةُ مقصودة**: أكثرُ الصفوف القائمة فارغةُ `case_id` ولا تُقرأ
   * من هنا أبداً (الاستعلامُ يربط الحالة، فالفارغُ يسقط من الربط أصلاً).
   * وإدراجُها فهرساً كاملاً كان سيضاعف حجمه بصفوفٍ لا يقرؤها أحد.
   *
   * ومطابقٌ حرفاً لما ينشئه الترحيل — اسماً وعموداً وشرطاً — كي لا تفترق
   * قاعدةُ `db:push` عن قاعدةِ الإنتاج. ويحرسه `npm run test:schema-parity`.
   */
  index("ix_cost_entries_case").on(t.caseId).where(sql`case_id IS NOT NULL`),
]);

// Expenses table for accounting system
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  category: text("category").notNull(), // رواتب، إيجارات، مستلزمات طبية، صيانة، كهرباء ومياه، أخرى
  // القسم/الجهة التي يخصّها المصروف: أطراف ومساند | علاج طبيعي | مشترك (عام).
  // Added in migration 027. NULL on legacy rows (before the field existed);
  // reports treat NULL as "shared/غير محدّد" so the grand total is unchanged.
  section: text("section"), // 'prosthetic' | 'physio' | 'shared'
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

// Admin-managed CUSTOM expense categories — added on top of the built-in list
// (رواتب، إيجارات، …) without a code change. The expense row stores the
// category as free text (its label), so a custom category needs no slug and
// existing records are unaffected if it is later deactivated.
export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),               // the Arabic name shown + stored on expenses
  branchId: integer("branch_id").references(() => branches.id), // null = all branches
  color: text("color"),                          // optional chart color
  isActive: boolean("is_active").notNull().default(true), // soft-remove from the picker
  createdBy: integer("created_by").references(() => systemUsers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // The real index is created in migration 026 with NULLS NOT DISTINCT so two
  // global rows (branch_id NULL) with the same label collide. This Drizzle
  // version's IndexBuilder does not expose .nullsNotDistinct(), and this table
  // is created by the raw-SQL migration (not drizzle-kit push), so the plain
  // declaration here is for type inference only — the migration is the source
  // of truth for the constraint.
  uniqueIndex("uq_expense_category_label_branch").on(t.label, t.branchId),
]);
export const insertExpenseCategorySchema = createInsertSchema(expenseCategories).omit({ id: true, createdAt: true });
export type ExpenseCategory = typeof expenseCategories.$inferSelect;

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
  // Distinguishes a first build from a later maintenance episode on an already
  // delivered device. Each is its own independent order/expert/timeline.
  purpose: text("purpose").notNull().default("initial_build"), // initial_build | maintenance
  // الحالة تصف التوقّف، والمرحلة تصف أين وصل العمل — مستقلّان تماماً:
  // توقّفٌ لا يغيّر المرحلة أبداً (migration 045).
  status: text("status").notNull().default("active"),
  currentStage: text("current_stage").notNull().default("order_received"),
  // سبب التوقّف الحالي — داخلي بحت، لا يصل المريض. يُملأ عند التوقّف
  // ويُفرَغ عند الاستئناف، فيُجاب «لماذا هو متوقّف؟» بقراءة صفّ واحد.
  holdReasonCode: text("hold_reason_code"),
  holdNote: text("hold_note"),
  expectedDeliveryDate: date("expected_delivery_date"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  finalResult: text("final_result"), // fabrication & fit outcome code (on delivery)
  finalNotes: text("final_notes"),
  assignedBy: integer("assigned_by").references(() => systemUsers.id),
  /**
   * حلقة الجهاز التي يخصّها هذا الصفّ (migration 049). فارغة لكل صفٍّ قائم،
   * ولا يكتبها أحد بعد — هذه المرحلة أساسٌ بلا سلوك.
   */
  deviceEpisodeId: integer("device_episode_id").references(() => patientDeviceEpisodes.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  /**
   * **لا صفَّ لمريضٍ على حلقة مريضٍ آخر** — سلامةٌ مرجعية مركّبة.
   *
   * المفتاح المفرد يحرس وجودَ الحلقة لا انتماءها: صفٌّ للمريض «أ» يشير إلى
   * حلقة المريض «ب» يمرّ منه، فيذهب ماله وتاريخه إلى ملفٍّ ليس ملفَّه.
   * والمركّب يطابق `(patient_id, id)` معاً فيُغلق الباب.
   *
   * و`MATCH SIMPLE` (السلوك الافتراضي) يجعله آمناً للصفوف القائمة: حين
   * تكون الحلقة فارغة لا يُفحَص القيد إطلاقاً.
   */
  foreignKey({
    name: "prosthetic_work_orders_patient_episode_fk",
    columns: [t.patientId, t.deviceEpisodeId],
    foreignColumns: [patientDeviceEpisodes.patientId, patientDeviceEpisodes.id],
    // يتبع التابعُ حلقتَه حين تنتقل إلى ملفٍّ آخر في الدمج — ولولاه لسقط
    // الدمج في منتصفه على زوجٍ لم يعد موجوداً. والحذف يبقى NO ACTION.
  }).onUpdate("cascade"),
]);

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
//  `patientCode` مُسقَطٌ من العقد عمداً (ترحيل ٠٥٢): الهوية العلنية يولّدها
//  الخادم/القاعدة ولا يختارها عميل. وإسقاطُها هنا يجعل قيمةً ملفَّقة في جسم
//  الطلب لا تصل النوعَ أصلاً — قبل أن تصل أي حراسة في التطبيق.
export const insertPatientSchema = createInsertSchema(patients).omit({ id: true, createdAt: true, patientCode: true }).extend({
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
// The three expense "sections" (revenue-stream buckets). Shared by client +
// server so the picker, validation and reports never drift. Stored as the
// `expenses.section` text value.
export const EXPENSE_SECTIONS = ["prosthetic", "physio", "shared"] as const;
export type ExpenseSection = (typeof EXPENSE_SECTIONS)[number];
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
export const insertPatientCaseSchema = createInsertSchema(patientCases).omit({ id: true, createdAt: true, updatedAt: true });
export type PatientCase = typeof patientCases.$inferSelect;
export type InsertPatientCase = z.infer<typeof insertPatientCaseSchema>;
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
  // Plaintext copy of the password, readable ONLY by the admin users screen
  // (bcrypt hashes can't be reversed). NULL until the password is next set.
  passwordPlain: text("password_plain"),
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
  // Narrow grant: add & view expenses ONLY (the المصروفات tab), without full
  // accounting management. Independent of canManageAccounting.
  canAddExpenses: boolean("can_add_expenses").default(false),
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
  // Prosthetics-expert CAPABILITY, independent of the primary `role`. Lets a
  // user whose main job is accountant / branch_manager ALSO be assigned work
  // orders and operate the manufacturing board — while keeping every
  // permission of their primary role (an accountant-expert still sees money).
  // The financial lock-out stays tied to role === 'prosthetics_expert' (a
  // *pure* expert), so this flag never leaks financial data.
  canWorkAsExpert: boolean("can_work_as_expert").default(false),
  // Doctor CAPABILITY (migration 028), same reasoning as canWorkAsExpert: the
  // branch manager may also be the doctor, and keeps every permission of the
  // primary role. Grants the right to SIGN clinical records — nothing else can
  // write them, not even an admin without this flag.
  canWriteMedicalExam: boolean("can_write_medical_exam").default(false),
  // Which specialties this doctor may sign for: a subset of
  // ["prosthetic","medical_support","physiotherapy"]. Empty = may sign nothing,
  // so granting the flag without a specialty is a no-op by design.
  medicalSpecialties: jsonb("medical_specialties").$type<string[]>().default([]),
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

// ── Doctor medical examinations (migration 028) ─────────────────────────────
// A SIGNED, IMMUTABLE clinical record. Only a user carrying
// `canWriteMedicalExam` may create one, and only for a specialty listed in
// their `medicalSpecialties`. Everyone else reads it. Nothing edits it: a
// Postgres trigger rejects UPDATE outright, and no delete endpoint exists.
//
// Distinct from `treatmentPlans` above, which is a mutable working document
// that non-doctors maintain. This is the doctor's word, fixed in time.
export const medicalExams = pgTable("medical_exams", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  // The case this exam belongs to. Nullable because a case row may not exist
  // yet for a brand-new patient — `caseType` is the authoritative field.
  caseId: integer("case_id").references(() => patientCases.id),
  caseType: text("case_type").notNull(), // prosthetic | medical_support | physiotherapy
  branchId: integer("branch_id").references(() => branches.id),
  // The signature. `doctorName` is a SNAPSHOT, not a join: the record must
  // still read correctly if the account is later renamed or removed.
  doctorId: integer("doctor_id").references(() => systemUsers.id),
  doctorName: text("doctor_name").notNull(),
  chiefComplaint: text("chief_complaint"),     // الشكوى
  clinicalFindings: text("clinical_findings"), // الفحص السريري
  diagnosis: text("diagnosis"),                // التشخيص
  plan: text("plan"),                          // الخطة والتوصيات
  notes: text("notes"),                        // متن حر
  // The structured clinical DECISION (الوصفة), migration 029: which prosthesis,
  // which support, which physiotherapy course. Same field set the patient form
  // already uses, but filed by the doctor and sealed with the exam — the server
  // then copies it onto the patient's case so the rest of the app reads it
  // exactly as before. Shape is per specialty; see shared/case_fields.ts.
  prescription: jsonb("prescription").$type<Record<string, any>>().default({}),
  // What the device costs (migration 030). أطراف/مساند ONLY — the doctor
  // specifies the device, so the doctor knows its price, and it lands on the
  // case as a MANUAL cost. Physiotherapy is deliberately excluded: its price is
  // derived per session by reception in «الكلفة والجلسات».
  deviceCost: integer("device_cost"),
  // The doctor's SUGGESTED manufacturing expert (migration 035). أطراف/مساند
  // only. A proposal exactly like the price: it pre-fills reception's «تخصيص»
  // dialog, and reception may keep it, change it, or fill it in when the
  // doctor left it blank. Nothing is assigned until reception saves.
  // A SNAPSHOT of the id, with no foreign key (migration 035 explains why:
  // an ON DELETE action is an UPDATE, and the seal-trigger refuses those).
  proposedExpertUserId: integer("proposed_expert_user_id"),
  /**
   * حلقة الجهاز التي تخصّها هذه المعاينة (migration 049).
   *
   * **بلا مفتاح أجنبي عمداً** — الجدول مختوم بترِكر `BEFORE UPDATE` يرفض أي
   * تعديل لم يفتح الباب المراقَب، و`ON DELETE SET NULL` تعديلٌ فكان المفتاح
   * سيجعل حذف حلقةٍ يفشل. نفس درس `proposedExpertUserId` حرفياً.
   */
  deviceEpisodeId: integer("device_episode_id"),
  // Version stamp. The live row is always the current version; every superseded
  // version is kept in `medicalExamRevisions`.
  version: integer("version").notNull().default(1),
  editedAt: timestamp("edited_at", { withTimezone: true }),
  editedBy: integer("edited_by").references(() => systemUsers.id),
  editedByName: text("edited_by_name"),
  signedAt: timestamp("signed_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Every SUPERSEDED version of an exam (migration 030). An edit never destroys:
// the previous text is snapshotted here first, with who replaced it and when,
// so "what did the doctor say, and when" stays answerable across versions.
export const medicalExamRevisions = pgTable("medical_exam_revisions", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").references(() => medicalExams.id).notNull(),
  version: integer("version").notNull(),
  caseType: text("case_type"),
  doctorId: integer("doctor_id"),
  doctorName: text("doctor_name"),
  chiefComplaint: text("chief_complaint"),
  clinicalFindings: text("clinical_findings"),
  diagnosis: text("diagnosis"),
  plan: text("plan"),
  notes: text("notes"),
  prescription: jsonb("prescription").$type<Record<string, any>>(),
  deviceCost: integer("device_cost"),
  proposedExpertUserId: integer("proposed_expert_user_id"),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  editedBy: integer("edited_by").references(() => systemUsers.id),
  editedByName: text("edited_by_name"),
  editedAt: timestamp("edited_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MedicalExamRevision = typeof medicalExamRevisions.$inferSelect;

// Corrections append, never overwrite. The original exam text stays untouched
// forever; an addendum carries its own signature and timestamp.
export const medicalExamAddenda = pgTable("medical_exam_addenda", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").references(() => medicalExams.id).notNull(),
  doctorId: integer("doctor_id").references(() => systemUsers.id),
  doctorName: text("doctor_name").notNull(),
  body: text("body").notNull(),
  signedAt: timestamp("signed_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// `signedAt` is omitted as well: the server stamps the signature, never the client.
export const insertMedicalExamSchema = createInsertSchema(medicalExams).omit({
  id: true,
  createdAt: true,
  signedAt: true,
});
export const insertMedicalExamAddendumSchema = createInsertSchema(medicalExamAddenda).omit({
  id: true,
  createdAt: true,
  signedAt: true,
});
export type MedicalExam = typeof medicalExams.$inferSelect;
export type InsertMedicalExam = z.infer<typeof insertMedicalExamSchema>;
export type MedicalExamAddendum = typeof medicalExamAddenda.$inferSelect;
export type InsertMedicalExamAddendum = z.infer<typeof insertMedicalExamAddendumSchema>;

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

// ── متابعةُ ما بعد المعاينة (migration 053) ─────────────────────────────────
// ══ طلبُ مراجعة الطبيب — أطراف ومساند فقط (migration 055) ═══════════════
// **بابٌ ثانٍ إلى الطبيب، أخفُّ من المعاينة ولا يحلّ محلّها.** قبله كان
// البابُ واحداً — سجلٌّ سريريٌّ مختوم — فكلُّ ما لا يستحقّه مرّ بلا طبيب:
// الصيانة الروتينية، والتعديل الصغير، والمريض القديم العائد الذي كان النظام
// يُخرجه من الطابور صراحةً.
//
// والاستقبال يصنّف (سريع | كامل)، والطبيب يقرّر (موافقة | معاينة كاملة |
// إعادة). والموافقة السريعة **ليست معاينة**: لا تدخل تسلسل المعاينات ولا
// تُطفئ وسمَ الانتظار ولا تُقرأ بعد سنواتٍ كأنّ طبيباً فحص المريض يومها.
//
// والصفُّ يحمل **مرساةَ الحدث** حين توجد — حلقةَ الجهاز أو أمرَ الصيانة أو
// الزيارة — فطلبان لجهازين مختلفين ليسا طلباً واحداً.
export const medicalReviewRequests = pgTable("medical_review_requests", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  /** prosthetic | medical_support — والعلاج الطبيعي مرفوضٌ بقيد CHECK. */
  serviceType: text("service_type").notNull(),
  caseId: integer("case_id").references(() => patientCases.id),
  branchId: integer("branch_id").references(() => branches.id),
  //  المرساة: واحدةٌ منها على الأكثر في العادة، وقد تخلو جميعاً لطلبٍ عن
  //  الملفّ عامّةً — وذلك مشروع لكنّه ليس الحالة الافتراضية.
  deviceEpisodeId: integer("device_episode_id").references(() => patientDeviceEpisodes.id),
  workOrderId: integer("work_order_id").references(() => prostheticWorkOrders.id),
  visitId: integer("visit_id").references(() => visits.id),
  /** تصنيفُ الاستقبال: quick | full. */
  requestedPath: text("requested_path").notNull(),
  /** سببُ الزيارة: new_device | maintenance | adjustment | follow_up | other. */
  reviewKind: text("review_kind").notNull(),
  receptionNote: text("reception_note"),
  createdBy: integer("created_by").references(() => systemUsers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  /** pending | approved | escalated | returned. */
  status: text("status").notNull().default("pending"),
  /** approve | require_full_exam | return_to_reception. */
  decision: text("decision"),
  decidedBy: integer("decided_by").references(() => systemUsers.id),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  doctorNote: text("doctor_note"),
  /** المعاينة التي أُنجزت بعد الإحالة، إن أُنجزت — لقطةُ ربطٍ للقراءة. */
  examId: integer("exam_id").references(() => medicalExams.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export type MedicalReviewRequest = typeof medicalReviewRequests.$inferSelect;

// **الطبقة بين قرار الطبيب وبدء التصنيع.** المريض يوقّع طبيبُه المعاينة ثم
// يذهب ليفكّر: يستشير أهله، ينتظر راتباً، يساوم، يقارن مركزاً بآخر. وهذا
// الفراغ كان لا يُرى في النظام إطلاقاً — فمريضٌ عاين ولم يشترِ يختفي من كل
// شاشة، ولا أحد يعرف أنه ينتظر ولا لماذا.
//
// والطبقة **فوق** الدورة القائمة لا داخلها: لا تلمس المعاينة ولا الحالة ولا
// الحلقة ولا أوامر التصنيع. والبيع حين يُعتمد يمرّ من بابه الوحيد القائم
// («تخصيص») — فلا منطقَ تصنيعٍ مكرّر هنا.
export const postExamFollowups = pgTable("post_exam_followups", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  caseId: integer("case_id").references(() => patientCases.id),
  /** الحلقة إن وُجدت — وأغلب المرضى بلا حلقة (تُنشأ عند «طلب جهاز جديد» فقط). */
  deviceEpisodeId: integer("device_episode_id").references(() => patientDeviceEpisodes.id),
  /**
   * لقطةُ رقم **بلا مفتاح أجنبي عمداً**: `medical_exams` مختوم بترِكر
   * `BEFORE UPDATE`، و`ON DELETE SET NULL` تعديلٌ كان سيجعل حذف معاينةٍ
   * يفشل. نفس درس `proposedExpertUserId` و`patientEvents.caseId` حرفياً.
   */
  medicalExamId: integer("medical_exam_id"),
  branchId: integer("branch_id").references(() => branches.id),
  serviceType: text("service_type").notNull(), // prosthetic | medical_support
  status: text("status").notNull().default("awaiting_patient_decision"),
  /**
   * السعرُ المعتمد تجارياً الآن.
   *
   * يُبذَر من كلفة المعاينة ولا يتغيّر إلا باعتماد طبيب/مسؤول لطلبِ تعديل.
   * والمعاينة تبقى مختومةً بسعرها الأصلي — فالتاريخ محفوظ بالبناء لا بالنيّة.
   * وهذا هو الرقم الذي يحجزه «تخصيص» عند اعتماد الشراء.
   */
  approvedPrice: integer("approved_price").notNull().default(0),
  /**
   * **من أين جاء الرقمُ أعلاه** — ثلاثةٌ لا اثنان (ترحيل ٠٥٧).
   *
   * `exam` سعرُ المعاينة · `approved_discount` خصمٌ اعتُمد ·
   * `approved_change` **تعديلُ سعرٍ اعتُمد قبل هذه المرحلة، وقد يكون رفعاً**.
   * وكان الأخيران قيمةً واحدة، فيضيع الفرقُ بعد الحسم ويُقرأ رفعُ السعر
   * «بعد الخصم». والصفُّ هو الشاهدُ الوحيد بعدها، فإن لم يحمل الفرقَ ضاع.
   */
  priceSource: text("price_source").notNull().default("exam"),
  /**
   * الخبير المختار لهذا الجهاز — **يُبذَر من اقتراح الطبيب ويبقى مرناً**.
   *
   * الطبيب يقترحه في معاينته (ترحيل ٠٣٥)، والاستعلامات تُبقيه أو تغيّره قبل
   * بدء العمل. فسؤالُ الطبيبِ عنه مرّةً ثانية لحظة اعتماد الشراء كان يكسر
   * تقسيمَ العمل القائم: الخبيرُ اختيارُ الاستعلامات لا قرارُ الطبيب.
   *
   * لقطةُ رقم بلا مفتاح أجنبي — نفس درس `proposedExpertUserId`.
   */
  selectedExpertUserId: integer("selected_expert_user_id"),
  nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
  /** استثناءٌ صريح: «لا موعد متابعة» قرارٌ مُتَّخذ لا حقلٌ مُهمَل. */
  noScheduledFollowUp: boolean("no_scheduled_follow_up").notNull().default(false),
  lastReason: text("last_reason"),
  lastNote: text("last_note"),
  lastContactAt: timestamp("last_contact_at", { withTimezone: true }),
  closedReason: text("closed_reason"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  convertedAt: timestamp("converted_at", { withTimezone: true }),
  /** أمرُ التصنيع الذي وُلد عن اعتماد الشراء — إثباتُ أن التحويل تمّ فعلاً. */
  convertedWorkOrderId: integer("converted_work_order_id"),
  createdBy: integer("created_by").references(() => systemUsers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check("post_exam_followups_status_check", sql`${t.status} IN (
    'awaiting_patient_decision', 'follow_up', 'price_approval_pending',
    'price_approved_waiting_patient', 'purchase_approval_pending',
    'closed_without_purchase', 'converted')`),
  check("post_exam_followups_service_check",
    sql`${t.serviceType} IN ('prosthetic', 'medical_support')`),
  check("post_exam_followups_price_source_check",
    sql`${t.priceSource} IN ('exam', 'approved_change', 'approved_discount')`),
  // «مؤجَّل» بلا موعدٍ ولا استثناءٍ صريح حالةٌ ميتة: لا تُقال للموظّف ولا
  // تظهر في طابور. فالقاعدة ترفضها بدل أن تُخزَّن ثم تُنسى.
  check("post_exam_followups_followup_date_check", sql`
    ${t.status} <> 'follow_up'
    OR ${t.nextFollowUpAt} IS NOT NULL
    OR ${t.noScheduledFollowUp} = TRUE`),
  // ══ متابعةٌ حيّةٌ واحدة لكل جهاز — حقيقةٌ في القاعدة لا قاعدةٌ في الشيفرة ══
  // نفس نمط `uq_pde_case_open`، وهو ما يجعل الإنشاء idempotent بنيوياً:
  // ضغطتان متزامنتان تُنتجان صفّاً واحداً لأن الثانية تصطدم بالفهرس.
  uniqueIndex("uq_pef_active_episode").on(t.deviceEpisodeId).where(sql`
    device_episode_id IS NOT NULL
    AND status NOT IN ('closed_without_purchase', 'converted')`),
  uniqueIndex("uq_pef_active_legacy").on(t.patientId, t.serviceType).where(sql`
    device_episode_id IS NULL
    AND status NOT IN ('closed_without_purchase', 'converted')`),
  index("ix_pef_patient").on(t.patientId),
  index("ix_pef_branch_status").on(t.branchId, t.status),
  index("ix_pef_due").on(t.nextFollowUpAt).where(sql`next_follow_up_at IS NOT NULL`),
]);

export const POST_EXAM_FOLLOWUP_STATUSES = [
  "awaiting_patient_decision", "follow_up", "price_approval_pending",
  "price_approved_waiting_patient", "purchase_approval_pending",
  "closed_without_purchase", "converted",
] as const;
export type PostExamFollowupStatus = (typeof POST_EXAM_FOLLOWUP_STATUSES)[number];

/** التاريخ — يُلحَق به ولا يُعاد كتابته. إعادةُ الفتح حدثٌ جديد لا تصحيحُ قديم. */
export const postExamFollowupEvents = pgTable("post_exam_followup_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  followupId: integer("followup_id").references(() => postExamFollowups.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  branchId: integer("branch_id"),
  eventType: text("event_type").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  reason: text("reason"),
  note: text("note"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  actorUserId: integer("actor_user_id"),
  /** لقطة الاسم — يبقى السطر مقروءاً بعد حذف الحساب. */
  actorName: text("actor_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ix_pefe_followup").on(t.followupId, t.createdAt.desc()),
  index("ix_pefe_patient").on(t.patientId, t.createdAt.desc()),
]);

/**
 * طلبُ الخصم — يقترحه المتابِع، ويعتمده مخوَّلٌ **غيرُه** (ترحيل ٠٥٧).
 *
 * الاسمُ يبقى `price_change_requests` عمداً: الجدولُ نفسُه يحمل التاريخ
 * كلَّه، وإعادةُ تسميته كانت ستقطع صفوفاً قائمة عن اسمها بلا مكسب.
 *
 * والمعتمِدون: المسؤول العام · مديرُ الفرع · الطبيبُ المخوَّل — لأن الخصمَ
 * قرارٌ **تجاري** لا سريري (`canApproveDiscount` في `shared/followup.ts`).
 * **ولا يعتمد أحدٌ طلبَ نفسه**، ويُفرَض ذلك في الخادم على `requested_by`.
 */
export const priceChangeRequests = pgTable("price_change_requests", {
  id: serial("id").primaryKey(),
  followupId: integer("followup_id").references(() => postExamFollowups.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  branchId: integer("branch_id"),
  /** لقطةُ السعر المعتمد لحظةَ الطلب — فلا يُقرأ التاريخ من حاضرٍ تغيّر. */
  currentPrice: integer("current_price").notNull(),
  /** السعرُ النهائي بعد الخصم. */
  proposedPrice: integer("proposed_price").notNull(),
  /**
   * **ما الذي طُلب فعلاً** (ترحيل ٠٥٧) — `amount` أو `percentage`.
   *
   * الرقمان أعلاه يقولان «كان كذا فصار كذا» ولا يقولان أهو «اخصم ٢٠٠ ألف»
   * أم «اخصم ٢٠٪». وفارغٌ في كلّ صفٍّ سابق للترحيل، فيُقرأ ذلك «تعديل سعر
   * — سجلّ قديم» ولا يُخمَّن.
   */
  discountMode: text("discount_mode"),
  /** القيمةُ كما أدخلها الموظّف: ديناراً أو نسبةً مئوية. */
  discountValue: numeric("discount_value", { precision: 14, scale: 2 }),
  /**
   * الخصمُ بالدينار.
   *
   * مشتقٌّ رياضياً من العمودين أعلاه، ومخزَّنٌ للقراءة — **وقيدُ الترحيل
   * يمنعه من مخالفتهما**: `discount_amount = current_price - proposed_price`.
   * فلا نسخةَ ثانية تنحرف عن أصلها.
   */
  discountAmount: integer("discount_amount"),
  reason: text("reason").notNull(),
  note: text("note"),
  /**
   * `approved`/`rejected` **قرارُ طبيبٍ أو مسؤول حصراً**، و`cancelled` أثرُ
   * إغلاق ملفّ المتابعة. والفصل مقصود: «مرفوض» حكمٌ على السعر لا يملكه من
   * لا يعتمده، فلو وُسم به إغلاقُ الاستعلامات لظهر موظّفٌ رافضاً سعراً
   * ليست له صلاحية ردّه.
   */
  status: text("status").notNull().default("pending"), // pending | approved | rejected | cancelled
  requestedBy: integer("requested_by"),
  requestedByName: text("requested_by_name"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  decidedBy: integer("decided_by"),
  decidedByName: text("decided_by_name"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  decisionNote: text("decision_note"),
}, (t) => [
  check("price_change_requests_status_check",
    sql`${t.status} IN ('pending', 'approved', 'rejected', 'cancelled')`),
  check("price_change_requests_price_check",
    sql`${t.proposedPrice} >= 0 AND ${t.currentPrice} >= 0`),
  //  مرآةُ ترحيل ٠٥٧ حرفاً — كي لا تفترق قاعدةُ `db:push` عن الإنتاج.
  check("price_change_requests_discount_mode_check",
    sql`${t.discountMode} IS NULL OR ${t.discountMode} IN ('amount', 'percentage')`),
  /**
   * **صفٌّ إمّا قديمٌ تماماً وإمّا خصمٌ تامّ — ولا ثالثَ بينهما.**
   *
   * والفرعُ الأول يشترط **الأعمدةَ الثلاثة فارغةً معاً** لا عمودَ النوع
   * وحده: لولا ذلك لكفى `discount_mode = NULL` كي يتنكّر صفٌّ نصفُ ممتلئ
   * في هيئة سجلٍّ قديم، فيحمل مبلغَ خصمٍ لا يطابق فرقَ السعرين ولا يفحصه
   * أحد. والصفوفُ التاريخية تمرّ لأن أعمدتها الثلاثة `NULL` كلُّها.
   *
   * وهو ما يجعل «خصمٌ فقط» قاعدةً في القاعدة لا في الشيفرة وحدها: رفعُ
   * سعرٍ متنكّرٍ في هيئة خصم يُردّ ولو تسلّل من نداءٍ مباشر.
   *
   * **والمبلغُ مربوطٌ بما طُلب لا بفرق السعرين وحده**: صفٌّ يزعم «اخصم
   * عشرة آلاف» ويحمل خصماً بخمسين ألفاً كان يمرّ — الفرقُ يطابق السعرين
   * والقيمةُ المعلنة لا تطابق شيئاً. فمبلغاً: القيمةُ هي المبلغُ عينه
   * (وهو ما يفرض أنها بالدينار الصحيح، إذ `discount_amount` عددٌ صحيح)،
   * ونسبةً: المبلغُ ناتجُها مقرَّباً — بنفس دلالة `computeDiscount`.
   */
  check("price_change_requests_discount_shape_check", sql`
    (
      ${t.discountMode} IS NULL
      AND ${t.discountValue} IS NULL
      AND ${t.discountAmount} IS NULL
    )
    OR (
      ${t.discountMode} IN ('amount', 'percentage')
      AND ${t.discountValue} IS NOT NULL AND ${t.discountValue} > 0
      AND ${t.discountAmount} IS NOT NULL AND ${t.discountAmount} > 0
      AND ${t.proposedPrice} > 0
      AND ${t.proposedPrice} < ${t.currentPrice}
      AND ${t.discountAmount} = ${t.currentPrice} - ${t.proposedPrice}
      AND (${t.discountMode} <> 'percentage' OR ${t.discountValue} < 100)
      AND (${t.discountMode} <> 'amount' OR ${t.discountValue} = ${t.discountAmount})
      AND (${t.discountMode} <> 'percentage'
           OR ${t.discountAmount} = round(${t.currentPrice} * ${t.discountValue} / 100))
    )
  `),
  // **طلبٌ معلَّقٌ واحد لكل متابعة** — فلا يعتمد طبيبان طلبين متناقضين معاً.
  // الحارس البنيوي الذي يسند القفل التصريحي في طبقة التطبيق.
  uniqueIndex("uq_pcr_one_pending").on(t.followupId).where(sql`status = 'pending'`),
  index("ix_pcr_branch_status").on(t.branchId, t.status),
  index("ix_pcr_patient").on(t.patientId),
]);

export type PostExamFollowup = typeof postExamFollowups.$inferSelect;
export type PostExamFollowupEvent = typeof postExamFollowupEvents.$inferSelect;
export type PriceChangeRequest = typeof priceChangeRequests.$inferSelect;
