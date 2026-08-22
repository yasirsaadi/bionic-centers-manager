// أدواتُ المساعد الذكي — **قراءةٌ فقط، وبابٌ واحد مغلق**.
//
// ══ المبدأ ══════════════════════════════════════════════════════════════
// النموذج **يطلب** أداةً باسمها ووسائطها. ولا شيء ممّا يقوله يُنفَّذ كما هو:
//
//   ١. الاسم يُطابَق على سجلٍّ **ثابت** — ما ليس فيه لا يُنفَّذ إطلاقاً.
//   ٢. الوسائط تُفحَص ويُقصّ ما زاد عنها — لا تمرير كائنٍ كما وصل.
//   ٣. الصلاحية تُقرأ من **الجلسة** لا من الطلب ولا من نصّ المستخدم.
//   ٤. نطاقُ الفرع يُفرض قبل أن يُقرأ صفٌّ واحد.
//
// ولا أداةَ تكتب. لا INSERT ولا UPDATE ولا DELETE في هذا الملفّ ولا فيما
// يناديه — وهذا مُختبَرٌ لا مُدَّعى (`test:ai-tools`).
//
// ══ وما لا يوجد هنا عمداً ═══════════════════════════════════════════════
// لا أداةَ «نفّذ SQL»، ولا «اقرأ جدولاً»، ولا «شغّل أمراً». فالنموذج لا يملك
// إلا أربع نوافذ محدّدة الشكل، وكلُّ واحدةٍ تعرف مَن يحقّ له فتحها.
//
// ══ ونتيجة الأداة **بيانات لا تعليمات** ═════════════════════════════════
// اسمُ مريضٍ أو ملاحظةٌ في ملفّه قد تحوي نصّاً يشبه الأمر. فالمخرَج يُعاد
// كحقولٍ مسمّاة، والتعليمة في نظام المساعد صريحة بألّا يُطيع محتوى القاعدة.

import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { storage } from "../../storage";
import {
  patients, patientCases, patientDeviceEpisodes, prostheticWorkOrders,
  medicalExams, visits, systemUsers, branches,
} from "@shared/schema";
import { resolvePatientByPublicCode } from "../../patient_code/store";
import { normalizePatientCode } from "@shared/patient_code";
import * as medical from "../../medical/store";
import { branchInOperationalScope, type AiAccessContext } from "../access";
import type { AiToolSpec } from "../provider";
import { activeExamDrizzle } from "../../medical/active_exam";

/** الخدمتان اللتان يُسنَد لهما خبيرُ تصنيع. العلاج الطبيعي ليس منهما. */
const DEVICE_SERVICES = ["prosthetic", "medical_support"];

/** أقصى عدد عناصر في أي قائمة تصل النموذج. */
export const MAX_LIST_ITEMS = 20;

export interface ToolOutcome {
  ok: boolean;
  /** ما يُعاد إلى النموذج — حقولٌ مسمّاة، لا صفوف قاعدة. */
  data: Record<string, unknown>;
}

const denied = (reason: string): ToolOutcome => ({ ok: false, data: { error: reason } });

/**
 * «غير موجود» و«خارج نطاقك» جوابٌ **واحد**.
 *
 * التفريق بينهما يجعل المساعد عرّافاً: مَن يجرّب الرموز يعرف أيّها يخصّ
 * مريضاً في فرعٍ آخر. والموظّف لا يحتاج التفريق — علاجُ الحالتين واحد.
 */
const NOT_FOUND = "لا يوجد مريض بهذا الرمز ضمن نطاقك.";

// ══ أدواتٌ مساعِدة ═══════════════════════════════════════════════════════

function strArg(input: any, key: string): string | null {
  const v = input?.[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

const isPureExpert = (a: AiAccessContext) => a.role === "prosthetics_expert";
const worksAsExpert = (a: AiAccessContext) =>
  a.role === "prosthetics_expert" || a.permissions?.canWorkAsExpert === true;
const isManager = (a: AiAccessContext) => a.role === "branch_manager";

/** الفروع التي يُقرأ فيها فعلاً — مصفوفةٌ فارغة تعني «لا شيء». */
function scopedBranchIds(a: AiAccessContext): number[] | null {
  return a.operationalBranches;
}

/**
 * يحلّ الرمز **ثمّ يفرض النطاق**.
 *
 * الترتيب مقصود: الحلّ يقرأ صفّاً واحداً بالرمز، والنطاق يُفحص قبل أن
 * يُقرأ أي شيء آخر عن المريض. فمريضُ فرعٍ آخر لا يخرج منه اسمٌ ولا فرعٌ
 * ولا حتى إقرارٌ بوجوده.
 */
async function resolveInScope(
  access: AiAccessContext, code: unknown,
): Promise<{ patientId: number; patientCode: string; enteredWasAlias: boolean } | null> {
  const resolved = await resolvePatientByPublicCode(code);
  if (!resolved) return null;
  if (!branchInOperationalScope(access, resolved.branchId)) return null;
  return {
    patientId: resolved.patientId,
    patientCode: resolved.patientCode,
    enteredWasAlias: resolved.viaAlias,
  };
}

// ══ ١. patient_lookup ════════════════════════════════════════════════════

async function patientLookup(access: AiAccessContext, input: any): Promise<ToolOutcome> {
  const raw = strArg(input, "patientCode");
  if (!raw) return denied("رمز المريض مطلوب بصيغة WB-xxxxx.");
  if (!normalizePatientCode(raw)) return denied("صيغة الرمز غير صحيحة — المتوقّع WB-xxxxx.");

  const hit = await resolveInScope(access, raw);
  if (!hit) return denied(NOT_FOUND);
  const { patientId, patientCode, enteredWasAlias } = hit;

  const [p] = await db.select({
    name: patients.name, age: patients.age, phone: patients.phone,
    branchId: patients.branchId, classification: patients.patientClassification,
    isAmputee: patients.isAmputee, isMedicalSupport: patients.isMedicalSupport,
    isPhysiotherapy: patients.isPhysiotherapy, treatmentType: patients.treatmentType,
  }).from(patients).where(eq(patients.id, patientId));
  if (!p) return denied(NOT_FOUND);

  const [branch] = await db.select({ name: branches.name })
    .from(branches).where(eq(branches.id, p.branchId));

  // ── الحالة السريرية: ما ينتظر وما تقرّر — بلا نصّ ولا مال ──────────────
  const scope = scopedBranchIds(access);
  const [pending, decided] = await Promise.all([
    medical.getPendingExams(scope),
    medical.getDecidedExams(scope),
  ]);
  const [lastExam] = await db.select({
    caseType: medicalExams.caseType, signedAt: medicalExams.signedAt,
    doctorName: medicalExams.doctorName,
  //  **الفعّالة وحدها** (ترحيل ٠٦١): المساعدُ يجيب عن «ما حالته الآن»،
  //  ومعاينةٌ أُلغيت ليست حالتَه.
  }).from(medicalExams)
    .where(and(eq(medicalExams.patientId, patientId), activeExamDrizzle()))
    .orderBy(desc(medicalExams.signedAt)).limit(1);

  // ── حلقات الأجهزة: هويّة الجهاز لا سعره ───────────────────────────────
  const episodes = await db.select({
    id: patientDeviceEpisodes.id, caseId: patientDeviceEpisodes.caseId,
    sequenceNumber: patientDeviceEpisodes.sequenceNumber,
    status: patientDeviceEpisodes.status,
  }).from(patientDeviceEpisodes)
    .where(eq(patientDeviceEpisodes.patientId, patientId))
    .orderBy(patientDeviceEpisodes.sequenceNumber);
  const caseTypes = new Map<number, string>();
  if (episodes.length > 0) {
    const cases = await db.select({ id: patientCases.id, caseType: patientCases.caseType })
      .from(patientCases).where(inArray(patientCases.id, episodes.map((e) => e.caseId)));
    for (const c of cases) caseTypes.set(c.id, c.caseType);
  }

  // ── التصنيع: **بنفس ما يراه هذا المستخدم في التطبيق** ─────────────────
  // خبيرٌ صِرف لا يفتح أمر زميله في لوحة التصنيع، فلا يفتحه من هنا. أمّا
  // الاستقبال والطبيب فيريان حالة الأمر وخبيره في صفحة المريض والسجلّ
  // أصلاً (شارة «تم إسناد …»)، فلا جديد يُكشَف لهما.
  const orders = await db.select({
    id: prostheticWorkOrders.id, serviceType: prostheticWorkOrders.serviceType,
    purpose: prostheticWorkOrders.purpose, currentStage: prostheticWorkOrders.currentStage,
    status: prostheticWorkOrders.status,
    expectedDeliveryDate: prostheticWorkOrders.expectedDeliveryDate,
    expertUserId: prostheticWorkOrders.expertUserId,
    branchId: prostheticWorkOrders.branchId,
    expertName: systemUsers.displayName,
  }).from(prostheticWorkOrders)
    .leftJoin(systemUsers, eq(systemUsers.id, prostheticWorkOrders.expertUserId))
    .where(and(
      eq(prostheticWorkOrders.patientId, patientId),
      sql`${prostheticWorkOrders.status} NOT IN ('completed','cancelled')`,
    ))
    .orderBy(desc(prostheticWorkOrders.id));

  const maySeeOrder = (o: { expertUserId: number | null; branchId: number }) => {
    if (access.isAdmin) return true;
    if (isManager(access) && branchInOperationalScope(access, o.branchId)) return true;
    if (worksAsExpert(access) && o.expertUserId === access.userId) return true;
    //  خبيرٌ صِرف غير مسنَد ⟶ لا. وغيرُه (استقبال/طبيب) يرى ما تعرضه صفحة
    //  المريض له أصلاً.
    return !isPureExpert(access);
  };

  const visibleOrders = orders.filter(maySeeOrder).slice(0, MAX_LIST_ITEMS).map((o) => ({
    serviceType: o.serviceType,
    purpose: o.purpose ?? "initial_build",
    currentStage: o.currentStage,
    status: o.status,
    expectedDeliveryDate: o.expectedDeliveryDate ? String(o.expectedDeliveryDate) : null,
    expertName: o.expertName ?? null,
  }));

  // ── الزيارات: آخر ثلاث، بتاريخها ونوعها ───────────────────────────────
  const recentVisits = await db.select({
    visitDate: visits.visitDate, treatmentType: visits.treatmentType,
  }).from(visits)
    .where(and(eq(visits.patientId, patientId), isNull(visits.deletedAt)))
    .orderBy(desc(visits.visitDate)).limit(3);

  // ── العلاج الطبيعي ────────────────────────────────────────────────────
  //
  //  **الجلسات تُعدّ من زيارات خيط العلاج الطبيعي وحده.** كان العدّ يشمل
  //  كلَّ زيارات المريض، فمريضُ طرفٍ وعلاجٍ معاً تُحسب له زياراتُ قياس
  //  الطرف وصيانته جلساتِ علاجٍ طبيعي — رقمٌ خاطئ يبني عليه الموظّف قراراً.
  //  والفصل بالحالة (`case_id`) هو ما يفعله التطبيق نفسه في صفحة المريض.
  //
  //  والاستثناءان من قاعدة الصفحة نفسها: «خدمة جديدة» قيدٌ مالي لا جلسة،
  //  و«استشارة طبية» ليست جلسةَ علاج.
  //
  //  **وبلا «المشتراة» و«المتبقّية» عمداً**: احتسابُهما في التطبيق يمرّ عبر
  //  كلفة الحالة ودفعات المريض (`resolvePurchasedSessions`) — أي عبر المال.
  //  فإخراجُهما هنا كان يعني قراءةً مالية لموظّفٍ لا يملكها، وإعادةَ حسابٍ
  //  ثانٍ قد يخالف الصفحة. فيُعرَض **المنفَّذ** وحده، وهو تشغيليٌّ خالص.
  let physio: Record<string, unknown> | null = null;
  if (p.isPhysiotherapy) {
    const [physioCase] = await db.select({ id: patientCases.id })
      .from(patientCases)
      .where(and(eq(patientCases.patientId, patientId), eq(patientCases.caseType, "physiotherapy")))
      .limit(1);

    const rows = physioCase
      ? await db.select({
        treatmentType: visits.treatmentType, visitDate: visits.visitDate,
        details: visits.details, notes: visits.notes,
      }).from(visits).where(and(
        eq(visits.patientId, patientId),
        eq(visits.caseId, physioCase.id),
        isNull(visits.deletedAt),
      )).orderBy(desc(visits.visitDate))
      : [];

    const sessions = rows.filter((v) => {
      const isServiceVisit = v.details === "خدمة جديدة"
        || (typeof v.notes === "string" && v.notes.startsWith("خدمة جديدة:"));
      const isConsultation = v.treatmentType === "استشارة طبية";
      return !isServiceVisit && !isConsultation;
    });

    const byType: Record<string, number> = {};
    for (const v of sessions) {
      const t = (v.treatmentType || "").trim() || "غير محدّد";
      byType[t] = (byType[t] ?? 0) + 1;
    }

    physio = {
      prescribedPlan: p.treatmentType ?? null,
      sessionsCompleted: sessions.length,
      sessionsCompletedByType: byType,
      lastSessionDate: sessions[0]?.visitDate
        ? new Date(sessions[0].visitDate).toISOString().slice(0, 10) : null,
      note: "المشتراة والمتبقّية بيانات مالية — تُعرض في صفحة المريض لمن يملك صلاحيتها.",
    };
  }

  return {
    ok: true,
    data: {
      patientCode,
      ...(enteredWasAlias ? { enteredCodeWasOlderAlias: true } : {}),
      name: p.name,
      age: p.age ?? null,
      phone: p.phone ?? null,
      branch: branch?.name ?? null,
      classification: p.classification ?? null,
      services: [
        p.isAmputee ? "prosthetic" : null,
        p.isMedicalSupport ? "medical_support" : null,
        p.isPhysiotherapy ? "physiotherapy" : null,
      ].filter(Boolean),
      awaitingExam: pending.filter((r) => r.patientId === patientId).map((r) => r.caseType),
      decidedExam: decided.filter((r) => r.patientId === patientId).map((r) => r.caseType),
      latestExam: lastExam
        ? {
          specialty: lastExam.caseType,
          date: lastExam.signedAt ? new Date(lastExam.signedAt).toISOString().slice(0, 10) : null,
          doctor: lastExam.doctorName ?? null,
        }
        : null,
      deviceEpisodes: episodes.slice(0, MAX_LIST_ITEMS).map((e) => ({
        serviceType: caseTypes.get(e.caseId) ?? null,
        sequenceNumber: e.sequenceNumber,
        status: e.status,
        isOpen: !["delivered", "cancelled"].includes(String(e.status)),
      })),
      activeOrders: visibleOrders,
      ...(orders.length > visibleOrders.length
        ? { activeOrdersHidden: "بعض أوامر التصنيع خارج صلاحيتك فلم تُعرض." }
        : {}),
      recentVisits: recentVisits.map((v) => ({
        date: v.visitDate ? new Date(v.visitDate).toISOString().slice(0, 10) : null,
        treatmentType: v.treatmentType ?? null,
      })),
      ...(physio ? { physiotherapy: physio } : {}),
    },
  };
}

// ══ ٢. patient_clinical_summary ══════════════════════════════════════════

async function patientClinicalSummary(access: AiAccessContext, input: any): Promise<ToolOutcome> {
  const raw = strArg(input, "patientCode");
  if (!raw) return denied("رمز المريض مطلوب بصيغة WB-xxxxx.");
  const hit = await resolveInScope(access, raw);
  if (!hit) return denied(NOT_FOUND);

  //  المعاينات الموقّعة وحدها، والأحدث لكل اختصاص. ولا نسخَ سابقة ولا
  //  ملاحق ولا محذوف — التصحيح تاريخٌ إداري لا جوابٌ عن «ما حالته الآن».
  const rows = await db.select({
    caseType: medicalExams.caseType, signedAt: medicalExams.signedAt,
    doctorName: medicalExams.doctorName, diagnosis: medicalExams.diagnosis,
    prescription: medicalExams.prescription,
  }).from(medicalExams)
    .where(and(eq(medicalExams.patientId, hit.patientId), activeExamDrizzle()))
    .orderBy(desc(medicalExams.signedAt));

  const latestBySpecialty: typeof rows = [];
  const seenSpecialty = new Set<string>();
  for (const r of rows) {
    if (seenSpecialty.has(r.caseType)) continue;
    seenSpecialty.add(r.caseType);
    latestBySpecialty.push(r);
  }

  return {
    ok: true,
    data: {
      patientCode: hit.patientCode,
      //  **لا `deviceCost` ولا أي مبلغ — لأحدٍ كائناً من كان.** المال بابُه
      //  `patient_finance` وحده، فلا تصير المعاينة قناةً جانبية للأسعار.
      exams: latestBySpecialty.slice(0, MAX_LIST_ITEMS).map((r) => ({
        specialty: r.caseType,
        date: r.signedAt ? new Date(r.signedAt).toISOString().slice(0, 10) : null,
        doctor: r.doctorName ?? null,
        diagnosis: r.diagnosis ?? null,
        prescription: summarizePrescription(r.prescription),
      })),
    },
  };
}

/** خلاصةُ الوصفة: أسماءُ الحقول المملوءة وقيمُها القصيرة، بلا مبالغ. */
function summarizePrescription(p: unknown): Record<string, string> | null {
  if (!p || typeof p !== "object" || Array.isArray(p)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
    if (/cost|price|amount|مبلغ|كلفة|سعر/i.test(k)) continue;
    if (v === null || v === undefined || v === "") continue;
    if (typeof v === "string" || typeof v === "number") out[k] = String(v).slice(0, 120);
  }
  return Object.keys(out).length ? out : null;
}

// ══ ٣. patient_finance — أضيقُ الأربع ════════════════════════════════════

async function patientFinance(access: AiAccessContext, input: any): Promise<ToolOutcome> {
  //  **الحارس أوّلاً وقبل أي قراءة.** الأداة لا تُعرَض أصلاً لغير المخوَّل،
  //  لكنّ النموذج قد يخترع اسمها — فيُردّ هنا قبل أن تُلمس القاعدة.
  if (access.mode !== "financial") {
    return denied("البيانات المالية متاحة لمن يملك صلاحية المحاسبة فقط.");
  }
  const raw = strArg(input, "patientCode");
  if (!raw) return denied("رمز المريض مطلوب بصيغة WB-xxxxx.");

  const hit = await resolveInScope(access, raw);
  if (!hit) return denied(NOT_FOUND);

  //  ونطاقُ المال أضيق من نطاق العمل: غير المسؤول محصورٌ بفرعه المالي.
  const [row] = await db.select({ branchId: patients.branchId, totalCost: patients.totalCost })
    .from(patients).where(eq(patients.id, hit.patientId));
  if (!row) return denied(NOT_FOUND);
  //  **النطاق المالي يُطبَّق على المسؤول أيضاً.** فالمسؤول الذي ضيّق نطاقه
  //  إلى فرعٍ بعينه (كما تفعل نقطة المحادثة المالية) لا يقرأ مال فرعٍ آخر
  //  من هنا — وإلّا صارت الأداة بابَ التفافٍ على تضييقٍ اختاره بنفسه.
  //  و`branchId === null` تعني «كل الفروع» وهي حال المسؤول بلا اختيار.
  if (access.branchId !== null && row.branchId !== access.branchId) {
    return denied(NOT_FOUND);
  }

  //  المنطق المحاسبي القائم نفسه — لا حسابٌ ثانٍ يخالف الصفحة.
  const [payments, invoices] = await Promise.all([
    storage.getPaymentsByPatientId(hit.patientId),
    storage.getInvoices(undefined, undefined, hit.patientId),
  ]);
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalCost = row.totalCost || 0;
  const outstanding = invoices
    .map((i) => (i.total || 0) - (i.paidAmount || 0))
    .filter((d) => d > 0);

  return {
    ok: true,
    data: {
      patientCode: hit.patientCode,
      totalCost,
      totalPaid,
      remaining: Math.max(0, totalCost - totalPaid),
      outstandingInvoices: outstanding.length,
      outstandingTotal: outstanding.reduce((s, d) => s + d, 0),
    },
  };
}

// ══ ٤. my_worklist — بلا وسائط إطلاقاً ═══════════════════════════════════

async function myWorklist(access: AiAccessContext): Promise<ToolOutcome> {
  const scope = scopedBranchIds(access);
  const out: Record<string, unknown> = { role: access.role };

  //  **الطبيب**: اختصاصاتُه تُقرأ من القاعدة حيّةً لا من الجلسة، فسحبُ
  //  الاختصاص يسري فوراً. ولا `doctorId` من النموذج — الفاعل هو الجلسة.
  const specialties = await medical.doctorSpecialties(access.userId);
  if (specialties.length > 0) {
    const rows = await medical.getWorklist(specialties, scope);
    const shown = rows.slice(0, MAX_LIST_ITEMS);
    //  صفوفُ القائمة تحمل رقم الصفّ الداخلي؛ والنموذج لا يراه أبداً —
    //  يُترجَم إلى الرمز العلني قبل أن يخرج.
    const codeById = new Map<number, string>();
    if (shown.length > 0) {
      const rowsWithCode = await db.select({ id: patients.id, code: patients.patientCode })
        .from(patients).where(inArray(patients.id, shown.map((r) => r.patientId)));
      for (const r of rowsWithCode) codeById.set(r.id, r.code);
    }
    out.doctorSpecialties = specialties;
    out.awaitingMyExam = {
      total: rows.length,
      items: shown.map((r) => ({
        patientCode: codeById.get(r.patientId) ?? null,
        name: r.patientName,
        specialty: r.caseType,
      })),
      ...(rows.length > MAX_LIST_ITEMS ? { truncated: true } : {}),
    };
  }

  //  **الخبير**: أوامرُه هو حصراً. `expertUserId` من الجلسة، ولا يُقبل من
  //  النموذج بحالٍ — وهذا هو العزل الذي لا يجوز أن ينكسر.
  if (worksAsExpert(access) && access.userId !== null) {
    const mine = await db.select({
      patientId: prostheticWorkOrders.patientId,
      patientCode: patients.patientCode, patientName: patients.name,
      serviceType: prostheticWorkOrders.serviceType,
      purpose: prostheticWorkOrders.purpose,
      currentStage: prostheticWorkOrders.currentStage,
      status: prostheticWorkOrders.status,
      expectedDeliveryDate: prostheticWorkOrders.expectedDeliveryDate,
    }).from(prostheticWorkOrders)
      .innerJoin(patients, eq(patients.id, prostheticWorkOrders.patientId))
      .where(and(
        eq(prostheticWorkOrders.expertUserId, access.userId),
        sql`${prostheticWorkOrders.status} NOT IN ('completed','cancelled')`,
      ))
      .orderBy(desc(prostheticWorkOrders.id));
    out.myManufacturingOrders = {
      total: mine.length,
      items: mine.slice(0, MAX_LIST_ITEMS).map((o) => ({
        patientCode: o.patientCode,
        name: o.patientName,
        serviceType: o.serviceType,
        purpose: o.purpose ?? "initial_build",
        stage: o.currentStage,
        status: o.status,
        expectedDeliveryDate: o.expectedDeliveryDate ? String(o.expectedDeliveryDate) : null,
      })),
      ...(mine.length > MAX_LIST_ITEMS ? { truncated: true } : {}),
    };
  }

  //  **الاستقبال والمدير والمسؤول**: طوابيرُ الفرع كما يعرّفها النظام —
  //  «بانتظار معاينة» و«تم تحديد» إشارتان قائمتان لا مخترَعتان هنا.
  const seesBranchQueues = access.isAdmin || isManager(access)
    || access.permissions?.canViewPatients === true || access.permissions?.canAddPatients === true;
  if (seesBranchQueues && !isPureExpert(access)) {
    const [pending, decided] = await Promise.all([
      medical.getPendingExams(scope), medical.getDecidedExams(scope),
    ]);
    const uniq = (ids: number[]) => ids.filter((v, i) => ids.indexOf(v) === i);
    const codesFor = async (ids: number[]) => {
      if (ids.length === 0) return [];
      const rows = await db.select({ code: patients.patientCode, name: patients.name })
        .from(patients).where(inArray(patients.id, ids.slice(0, MAX_LIST_ITEMS)));
      return rows.map((r) => ({ patientCode: r.code, name: r.name }));
    };
    out.awaitingExam = {
      total: pending.length,
      items: await codesFor(uniq(pending.map((r) => r.patientId))),
    };

    //  ══ «بانتظار تخصيص خبير» — **لكل خدمة، ومطروحاً منها المُسنَد** ══
    //  إشارةُ الطبيب «تم تحديد» تعني أن دور الاستعلامات جاء. لكنها تبقى
    //  على الملفّ بعد التخصيص أيضاً، فعرضُها كما هي يُبقي مريضاً في الطابور
    //  إلى الأبد وقد بدأ جهازُه يُصنَّع (نفس علّة PR #220 في السجلّ).
    //
    //  والطرح **لكل خدمة على حدة**: مَن أُسنِد طرفُه وبقي مسندُه ينتظر يبقى
    //  في الطابور بمسنده وحده. وإخفاؤه كلّه لأن أحد خيطيه بدأ خطأٌ فادح.
    //
    //  والعلاج الطبيعي خارج هذا الطابور أصلاً: لا خبيرَ يُسنَد له.
    const decidedDevice = decided.filter((r) => DEVICE_SERVICES.includes(r.caseType));
    const assignedPairs = new Set<string>();
    if (decidedDevice.length > 0) {
      const assigned = await db.select({
        patientId: prostheticWorkOrders.patientId,
        serviceType: prostheticWorkOrders.serviceType,
      }).from(prostheticWorkOrders).where(and(
        inArray(prostheticWorkOrders.patientId, uniq(decidedDevice.map((r) => r.patientId))),
        sql`${prostheticWorkOrders.status} NOT IN ('completed','cancelled')`,
        //  البناءُ الأولي وحده. والصيانةُ عملٌ على جهازٍ قائم، فلا تُخرج
        //  خدمةً من طابور التخصيص — ولا COALESCE يُفلت صفّاً قديماً.
        sql`COALESCE(${prostheticWorkOrders.purpose}, 'initial_build') = 'initial_build'`,
      ));
      for (const a of assigned) assignedPairs.add(`${a.patientId}:${a.serviceType}`);
    }
    const stillAwaiting = decidedDevice.filter(
      (r) => !assignedPairs.has(`${r.patientId}:${r.caseType}`));

    const codeByPatient = new Map<number, { patientCode: string; name: string }>();
    {
      const ids = uniq(stillAwaiting.map((r) => r.patientId)).slice(0, MAX_LIST_ITEMS);
      const rows = ids.length
        ? await db.select({ id: patients.id, code: patients.patientCode, name: patients.name })
          .from(patients).where(inArray(patients.id, ids))
        : [];
      for (const r of rows) codeByPatient.set(r.id, { patientCode: r.code, name: r.name });
    }
    out.awaitingExpertAssignment = {
      total: stillAwaiting.length,
      //  صفٌّ لكل (مريض، خدمة) — فالمريض ذو الخيطين يظهر بخدمته المنتظرة.
      items: stillAwaiting.slice(0, MAX_LIST_ITEMS)
        .map((r) => ({
          patientCode: codeByPatient.get(r.patientId)?.patientCode ?? null,
          name: codeByPatient.get(r.patientId)?.name ?? null,
          serviceType: r.caseType,
        }))
        .filter((i) => i.patientCode !== null),
      ...(stillAwaiting.length > MAX_LIST_ITEMS ? { truncated: true } : {}),
    };

    const activeOrders = await db.select({
      purpose: prostheticWorkOrders.purpose,
      currentStage: prostheticWorkOrders.currentStage,
    }).from(prostheticWorkOrders).where(and(
      sql`${prostheticWorkOrders.status} NOT IN ('completed','cancelled')`,
      scope === null ? sql`TRUE`
        : scope.length === 0 ? sql`FALSE`
          : inArray(prostheticWorkOrders.branchId, scope),
    ));
    out.manufacturing = {
      activeBuilds: activeOrders.filter((o) => (o.purpose ?? "initial_build") === "initial_build").length,
      activeMaintenance: activeOrders.filter((o) => o.purpose === "maintenance").length,
      readyForFitting: activeOrders.filter((o) => o.currentStage === "ready_for_fitting").length,
    };

    //  ══ طابور العلاج الطبيعي — **بالفرع لا بالموظّف** ══════════════════
    //  لا يوجد في النظام إسنادُ معالجٍ بعينه لمريض: `canEnterSessions` تُدخل
    //  الجلسات، و`treatment_plans` خطّةُ مريضٍ لا ملكيّةُ موظّف. فاختراعُ
    //  «مرضاي» كان سيقسّم عملاً لا يقسّمه النظام أصلاً — والطابور بالفرع هو
    //  ما تعرضه الشاشات فعلاً.
    if (access.permissions?.canEnterSessions === true || access.isAdmin || isManager(access)) {
      const activePhysio = await db.select({
        code: patients.patientCode, name: patients.name,
      }).from(patients)
        .innerJoin(patientCases, and(
          eq(patientCases.patientId, patients.id),
          eq(patientCases.caseType, "physiotherapy"),
          eq(patientCases.status, "active"),
        ))
        .where(and(
          eq(patients.isPhysiotherapy, true),
          scope === null ? sql`TRUE`
            : scope.length === 0 ? sql`FALSE`
              : inArray(patients.branchId, scope),
        ))
        .orderBy(desc(patients.id));
      out.physiotherapy = {
        activePatients: activePhysio.length,
        items: activePhysio.slice(0, MAX_LIST_ITEMS)
          .map((r) => ({ patientCode: r.code, name: r.name })),
        ...(activePhysio.length > MAX_LIST_ITEMS ? { truncated: true } : {}),
      };
    }
  }

  return { ok: true, data: out };
}

// ══ السجلّ الثابت ════════════════════════════════════════════════════════

const CODE_ARG = {
  type: "object",
  properties: {
    patientCode: { type: "string", description: "رمز المريض العلني، مثل WB-02119" },
  },
  required: ["patientCode"],
} as const;

interface ToolEntry {
  spec: AiToolSpec;
  /** هل تُعرَض لهذه الجلسة أصلاً. */
  offeredTo: (a: AiAccessContext) => boolean;
  run: (a: AiAccessContext, input: any) => Promise<ToolOutcome>;
}

//  **بلا نموذجٍ أصلي**: بحثٌ عادي في كائنٍ عادي يجد `__proto__` و
//  `constructor` و `toString` — فيمرّ الاسم المخترَع بفحص «موجود؟» ثمّ
//  ينهار على `offeredTo is not a function`. والانهيار على مدخلٍ يتحكّم به
//  النموذج عيبٌ بذاته. `Object.create(null)` يجعل السجلّ لا يحوي إلّا ما
//  وُضع فيه. (أمسكه اختبار `__proto__` في `test:ai-tools`.)
const REGISTRY: Record<string, ToolEntry> = Object.assign(
  Object.create(null) as Record<string, ToolEntry>,
  {
  patient_lookup: {
    spec: {
      name: "patient_lookup",
      description:
        "حالةُ مريضٍ الحيّة برمزه العلني (WB-xxxxx): بياناته الأساسية، وما ينتظر من معاينات، "
        + "وحلقات أجهزته، وأوامر تصنيعه الفعّالة، وآخر زياراته. بلا أي مبلغ. "
        + "استعملها كلّما ذكر المستخدم رمزاً مثل WB-02119 ولو لم يطلب الأداة صراحةً.",
      input_schema: CODE_ARG as any,
    },
    offeredTo: () => true,
    run: patientLookup,
  },
  patient_clinical_summary: {
    spec: {
      name: "patient_clinical_summary",
      description:
        "الخلاصةُ السريرية الموقّعة لمريض: التشخيص والوصفة وتاريخ المعاينة وطبيبها لكل اختصاص. "
        + "بلا أي مبلغ. استعملها حين يُسأل عن التشخيص أو الخطة العلاجية تحديداً.",
      input_schema: CODE_ARG as any,
    },
    offeredTo: () => true,
    run: patientClinicalSummary,
  },
  patient_finance: {
    spec: {
      name: "patient_finance",
      description:
        "الملخّص المالي لمريض: كلفته الكلّية والمدفوع والمتبقّي والفواتير غير المسدّدة.",
      input_schema: CODE_ARG as any,
    },
    //  **لا تُعرَض أصلاً لغير المخوَّل** — والمنفِّذ يفحص ثانيةً على أي حال.
    offeredTo: (a) => a.mode === "financial",
    run: patientFinance,
  },
  my_worklist: {
    spec: {
      name: "my_worklist",
      description:
        "عملُ المستخدم الحالي الآن: مَن ينتظر معاينته إن كان طبيباً، وأوامرُ التصنيع المسنَدة "
        + "إليه إن كان خبيراً، وطوابيرُ فرعه إن كان استقبالاً أو مديراً. بلا وسائط، وبلا أي مبلغ.",
      input_schema: { type: "object", properties: {} } as any,
    },
    offeredTo: () => true,
    run: (a) => myWorklist(a),
  },
  } satisfies Record<string, ToolEntry>,
);

/** ما يُعرَض على النموذج في هذه الجلسة بالذات. */
export function toolsFor(access: AiAccessContext): AiToolSpec[] {
  return Object.values(REGISTRY)
    .filter((t) => t.offeredTo(access))
    .map((t) => t.spec);
}

export const TOOL_NAMES = Object.keys(REGISTRY);

/**
 * تنفيذُ ما طلبه النموذج — **بعد** التحقّق.
 *
 * اسمٌ خارج السجلّ يُردّ. وأداةٌ لا تُعرَض لهذه الجلسة تُردّ ولو اخترع
 * النموذج اسمها. وأي عطلٍ يُبتلع ويُعاد نصّاً آمناً — لا SQL ولا أثر مكدّس.
 */
export async function executeTool(
  access: AiAccessContext, name: string, input: unknown,
): Promise<ToolOutcome> {
  const entry = typeof name === "string" ? REGISTRY[name] : undefined;
  if (!entry || typeof entry.run !== "function") return denied("أداة غير معروفة.");
  if (!entry.offeredTo(access)) return denied("هذه الأداة غير متاحة لصلاحيتك.");
  try {
    return await entry.run(access, input ?? {});
  } catch (err) {
    console.error(`[ai-tools] ${name} failed:`, err);
    return denied("تعذّرت قراءة البيانات.");
  }
}
