/**
 * نقاط REST لعملياتِ **«بلا معاينة»** ومراجعةِ مبالغها.
 *
 * **العمليةُ تمضي. والمالُ لا يدخل المحاسبة حتى يعتمده طبيبٌ مخوَّل.**
 *
 * ══ الصلاحيات — مفروضةٌ هنا لا في الواجهة ═══════════════════════════════
 *   إنشاءُ العملية وتصحيحُها  — استقبال · مدير فرع · مسؤول (ضمن الفرع)
 *   مراجعةُ المبلغ            — طبيبٌ يملك **اختصاصَ الجهاز** ويصل **فرعَ
 *                               العملية** · مسؤول
 *
 * **ولا صلاحيةَ طبيةٍ تُمنَح لأحد**: اختيارُ المسار توجيهٌ تشغيليّ (٠٦٥)،
 * والمراجعةُ هنا **ماليّة لا سريرية** — فلا `medical_exams` تُنشأ ولا
 * `service_path` يتغيّر ولا يصير الطلبُ طلبَ معاينة.
 *
 * **والاختصاصُ يُقرأ من القاعدة عند كلّ طلب** (`doctorSpecialties`) لا من
 * الجلسة: سحبُ المنح يسري فوراً لا عند الدخول التالي — القاعدةُ نفسُها
 * التي يعمل بها إلغاءُ المعاينة (٠٦١).
 *
 * **ونطاقُ الفرع يُقرأ من صفّ العملية** لا مما يعلنه الطلب.
 */

import type { Express } from "express";
import { logAudit } from "../accounting/ledger";
import * as store from "./store";
import { ChargeError } from "./store";
import * as mfg from "../manufacturing/store";
import { doctorSpecialties } from "../medical/store";
import {
  canOperateNoExam, canCorrectReturned, mayReviewShape, parsePendingAmount,
  SAVED_PENDING_MESSAGE, SAVED_NO_CHARGE_MESSAGE,
} from "@shared/pending_charge";
import { parseComponent, isDeviceServiceKind } from "@shared/prosthetic_parts";
import { parseDeviceOrigin, originHasEpisode } from "@shared/device_origin";

type Req = any;

function getSession(req: Req) {
  const s = (req.session as any)?.branchSession;
  return {
    userId: (s?.userId ?? null) as number | null,
    userName: (s?.displayName ?? null) as string | null,
    role: (s?.role ?? "") as string,
    isAdmin: Boolean(s?.isAdmin),
    branchId: (s?.branchId ?? null) as number | null,
    accessible: Array.isArray(s?.accessibleBranches) ? (s.accessibleBranches as number[]) : [],
    permissions: (s?.permissions ?? {}) as Record<string, any>,
  };
}

/** الفروع التي يصلها المستخدم. `null` = مسؤول، أي كلّ الفروع. */
function branchScope(req: Req): number[] | null {
  const s = getSession(req);
  if (s.isAdmin) return null;
  if (s.accessible.length > 0) return s.accessible;
  return s.branchId ? [s.branchId] : [];
}

function canReachBranch(req: Req, branchId: number | null): boolean {
  const scope = branchScope(req);
  if (scope === null) return true;
  if (branchId === null) return false;
  return scope.includes(branchId);
}

const actorOf = (req: Req) => {
  const s = getSession(req);
  return { userId: s.userId, userName: s.userName };
};

/**
 * الجلسةُ كما يقرؤها حارسُ الصلاحية — **من الجلسة الموقَّعة لا من الطلب**.
 *
 * وبوّابةُ الإنشاء هي بوّابةُ «خدمة جديدة» و«بدء جهاز» نفسُها حرفاً بحرف:
 * `canAddPatients` هو ما يعنيه «استقبال» في هذا النظام.
 */
const chargeSession = (req: Req) => {
  const s = getSession(req);
  return { userId: s.userId, isAdmin: s.isAdmin, permissions: s.permissions, role: s.role };
};

const fail = (res: any, err: unknown, fallback: string) => {
  if (err instanceof ChargeError) return res.status(err.status).json({ error: err.message });
  const e = err as any;
  //  أخطاءُ الطبقات القائمة تمرّ برموزها — فلا تصير كلُّها ٥٠٠ عمياء.
  if (e?.status && typeof e?.message === "string" && e.status < 500) {
    return res.status(e.status).json({ error: e.message });
  }
  if (e?.name === "ActiveOrderError" || e?.name === "ActiveAssignmentError") {
    return res.status(409).json({ error: e.message ?? "لدى المريض أمر نشط" });
  }
  console.error(`[no-exam] ${fallback}:`, err);
  return res.status(500).json({ error: fallback });
};

async function patientRow(patientId: number) {
  const { db } = await import("../db");
  const { sql } = await import("drizzle-orm");
  const r = await db.execute<{
    id: number; name: string | null; branch_id: number | null;
    is_amputee: boolean | null; is_medical_support: boolean | null;
  }>(sql`
    SELECT id, name, branch_id, is_amputee, is_medical_support
      FROM patients WHERE id = ${patientId}
  `);
  return (r.rows ?? [])[0] ?? null;
}

/** حالةُ المريض من نوع الخدمة — نقرأ منها `case_id` للقيد ولا نخترعها. */
async function caseIdFor(patientId: number, serviceType: string): Promise<number | null> {
  const { db } = await import("../db");
  const { sql } = await import("drizzle-orm");
  const r = await db.execute<{ id: number }>(sql`
    SELECT id FROM patient_cases
     WHERE patient_id = ${patientId} AND case_type = ${serviceType}
     LIMIT 1
  `);
  const row = (r.rows ?? [])[0];
  return row ? Number(row.id) : null;
}

/**
 * **أهليّةُ المراجعة** — تُحسَب في الخادم، وتُفحَص **تحت قفل الصفّ**.
 *
 * اختصاصٌ × فرع: الاختصاصُ من القاعدة الآن، والفرعُ من صفّ العملية نفسِه.
 * ولا «طبيبٌ مسؤولٌ عن المريض» يُخترَع — علاقةٌ كهذه تُعطّل المريضَ كلّما
 * غاب صاحبُها.
 */
function reviewGate(req: Req) {
  return async (charge: store.ChargeRow): Promise<{ ok: boolean; reason?: string }> => {
    const s = getSession(req);
    if (!mayReviewShape(chargeSession(req))) {
      return { ok: false, reason: "مراجعة المبالغ لطبيبٍ مخوَّل أو للمسؤول" };
    }
    if (!canReachBranch(req, charge.branchId)) {
      return { ok: false, reason: "غير مصرح لك بمراجعة عمليات فرع آخر" };
    }
    if (s.isAdmin) return { ok: true };
    const specialties = await doctorSpecialties(s.userId);
    if (!specialties.includes(charge.serviceType as any)) {
      return {
        ok: false,
        reason: charge.serviceType === "prosthetic"
          ? "هذه العملية على اختصاص الأطراف الصناعية — وهو ليس من اختصاصاتك"
          : "هذه العملية على اختصاص المساند الطبية — وهو ليس من اختصاصاتك",
      };
    }
    return { ok: true };
  };
}

export function registerPendingChargeRoutes(app: Express, isAuthenticated: any) {
  // ══ ① إنشاءُ عملية «بلا معاينة» ════════════════════════════════════════

  /**
   * **بيعُ جزءٍ (أو مسندٍ كامل) على مسار «بلا معاينة»**.
   *
   * لا أمرَ تصنيعٍ ولا كلفةَ ولا قيدَ ولا دينار: هويّةُ العملية هي الحلقةُ
   * المفتوحة بما طُلب بالضبط، ومعها صفُّ المبلغ المعلَّق. والأمرُ يُولَد
   * **مع المال** عند الاعتماد في نداءٍ واحد.
   */
  app.post("/api/no-exam/device-sale", isAuthenticated, async (req: Req, res) => {
    try {
      if (!canOperateNoExam(chargeSession(req))) {
        return res.status(403).json({ error: "غير مصرح" });
      }
      const patientId = Number(req.body?.patientId);
      const deviceEpisodeId = Number(req.body?.deviceEpisodeId);
      const expertUserId = Number(req.body?.expertUserId);
      if (!Number.isFinite(patientId) || !Number.isFinite(deviceEpisodeId)) {
        return res.status(400).json({ error: "بيانات ناقصة" });
      }
      const patient = await patientRow(patientId);
      if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
      if (!canReachBranch(req, patient.branch_id)) {
        return res.status(403).json({ error: "غير مصرح لك بهذا الفرع" });
      }
      const serviceType = req.body?.serviceType;
      if (!isDeviceServiceKind(serviceType)) {
        return res.status(400).json({ error: "نوع الجهاز غير صالح" });
      }
      //  **والخبيرُ يختاره مَن ينفّذ العمل** لا مَن يراجع المبلغ — ويُتحقَّق
      //  أنه فعّالٌ في فرع المريض، بنفس قائمة «تخصيص وإسناد خبير».
      if (!Number.isInteger(expertUserId) || expertUserId <= 0) {
        return res.status(400).json({ error: "اختر الخبير المسؤول عن التنفيذ" });
      }
      const v = await mfg.validateExpertForBranch(expertUserId, patient.branch_id as number);
      if (!v.ok) return res.status(400).json({ error: v.reason });

      const amount = parsePendingAmount({
        charged: req.body?.charged, amount: req.body?.amount,
      });
      if (!amount.ok) return res.status(400).json({ error: amount.error });

      const out = await store.createDeviceSaleCharge({
        patientId, branchId: patient.branch_id ?? null,
        caseId: await caseIdFor(patientId, serviceType),
        serviceType, amount: amount.amount,
        note: typeof req.body?.note === "string" ? req.body.note.trim() || null : null,
        actor: actorOf(req),
        deviceEpisodeId, saleExpertUserId: expertUserId,
      });

      await logAudit({
        entityType: "pending_service_charge",
        entityId: out.charge?.id ?? out.workOrderId, action: "create",
        userId: getSession(req).userId, userName: getSession(req).userName ?? null,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        newValues: {
          patientId, serviceType, workOrderId: out.workOrderId,
          operationKind: "device_sale", amount: out.charge?.amount ?? 0,
          requestedItem: out.charge?.requestedItem ?? null,
        },
        notes: out.charge
          ? `بيع بلا معاينة — بدأ العمل، ومبلغٌ معلّق ${out.charge.amount} د.ع`
          : "بيع بلا معاينة — بدأ العمل، بلا أجور",
      });
      return res.status(201).json({
        ok: true, charge: out.charge, workOrderId: out.workOrderId,
        message: out.charge ? SAVED_PENDING_MESSAGE : SAVED_NO_CHARGE_MESSAGE,
      });
    } catch (err) {
      fail(res, err, "تعذّر تسجيل العملية");
    }
  });

  /**
   * **صيانةٌ على مسار «بلا معاينة»** — العملُ يُفتَح الآن، والأجرُ ينتظر.
   *
   * والفرقُ عن `/api/manufacturing/maintenance-visit` فرقُ **مال** لا عمل:
   * تلك تحجز الأجرَ في المحاسبة فوراً (أو تمرّ بنظام الخصم)، وهذه تُبقيه
   * خارجَها حتى يراجعه الطبيب. والكاتبُ التشغيليُّ واحدٌ في البابين.
   */
  app.post("/api/no-exam/maintenance", isAuthenticated, async (req: Req, res) => {
    try {
      if (!canOperateNoExam(chargeSession(req))) {
        return res.status(403).json({ error: "غير مصرح" });
      }
      const patientId = Number(req.body?.patientId);
      const expertUserId = Number(req.body?.expertUserId);
      if (!Number.isFinite(patientId) || !Number.isInteger(expertUserId) || expertUserId <= 0) {
        return res.status(400).json({ error: "بيانات ناقصة" });
      }
      const patient = await patientRow(patientId);
      if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
      if (!canReachBranch(req, patient.branch_id)) {
        return res.status(403).json({ error: "غير مصرح لك بهذا الفرع" });
      }

      //  **أيُّ جهازٍ يُصان؟** — قاعدةُ الصيانة القائمة بحرفها: صاحبُ نوعٍ
      //  واحد يبقى تلقائياً، وصاحبُ الاثنين يُصرِّح، والصمتُ يُردّ لا يُخمَّن.
      const owned = [
        patient.is_amputee ? "prosthetic" : null,
        patient.is_medical_support ? "medical_support" : null,
      ].filter(Boolean) as ("prosthetic" | "medical_support")[];
      if (owned.length === 0) {
        return res.status(400).json({ error: "الصيانة لمرضى الأطراف والمساند فقط" });
      }
      const requested = req.body?.serviceType;
      let serviceType: "prosthetic" | "medical_support";
      if (typeof requested === "string" && requested) {
        if (!owned.includes(requested as any)) {
          return res.status(400).json({ error: "هذا النوع غير مفعّل على ملف المريض" });
        }
        serviceType = requested as "prosthetic" | "medical_support";
      } else if (owned.length === 1) {
        serviceType = owned[0];
      } else {
        return res.status(400).json({
          error: "المريض يحمل طرفاً ومسنداً — حدّد نوع الجهاز المراد صيانته",
        });
      }

      const v = await mfg.validateExpertForBranch(expertUserId, patient.branch_id as number);
      if (!v.ok) return res.status(400).json({ error: v.reason });

      //  **والجزءُ من القائمة القائمة وحدها** (ترحيل ٠٦٠) — ولا قائمةَ
      //  ثانية تُخترَع ولا حقلٌ حرٌّ يُفرغها من معناها.
      const comp = parseComponent(req.body?.maintenanceComponent);
      if (!comp.ok) return res.status(400).json({ error: comp.error });
      if (serviceType === "prosthetic" && !comp.value) {
        return res.status(400).json({ error: "حدّد الجزء المراد صيانته" });
      }

      const amount = parsePendingAmount({
        charged: req.body?.charged, amount: req.body?.amount,
      });
      if (!amount.ok) return res.status(400).json({ error: amount.error });

      //  ══ **منشأُ الجهاز — ثلاثُ حقائق لا اثنتان** (ترحيل ٠٦٧) ═════════
      //  «صنعناه ولم نسجّله» **ليس** «صُنع خارج المركز»: وسمُ الأوّل بالثاني
      //  يصف عملَنا بأنه عملُ غيرنا في كلّ تقريرِ ضمانٍ لاحق. **ولا يُستنتَج
      //  من `had_prior_center_history`** — تلك عن المريض وهذه عن الجهاز.
      const originParsed = parseDeviceOrigin(req.body?.deviceOrigin);
      if (!originParsed.ok) return res.status(400).json({ error: originParsed.error });
      const deviceOrigin = originParsed.value;
      const rawEpisode = req.body?.deviceEpisodeId;
      //  **والمسجَّلُ وحده يحمل حلقة** — والآخران بلا هويّة، ولا تُلتقط لهما
      //  حلقةُ جهازٍ آخر ولا يُخترَع لهما تاريخُ تصنيعٍ لم يقع.
      const deviceEpisodeId = originHasEpisode(deviceOrigin)
        ? (Number.isFinite(Number(rawEpisode)) ? Number(rawEpisode) : null)
        : null;
      if (originHasEpisode(deviceOrigin) && deviceEpisodeId === null) {
        return res.status(400).json({ error: "اختر الجهاز المسجَّل المراد صيانته" });
      }

      const out = await store.createMaintenanceCharge({
        patientId, branchId: patient.branch_id ?? null,
        caseId: await caseIdFor(patientId, serviceType),
        serviceType, amount: amount.amount,
        note: typeof req.body?.note === "string" ? req.body.note.trim() || null : null,
        actor: actorOf(req),
        expertUserId,
        visitNotes: typeof req.body?.notes === "string" && req.body.notes.trim()
          ? req.body.notes.trim() : "صيانة طرف/مسند",
        maintenanceComponent: comp.value,
        deviceEpisodeId, deviceOrigin,
      });

      await logAudit({
        entityType: "pending_service_charge",
        entityId: out.charge?.id ?? out.workOrderId, action: "create",
        userId: getSession(req).userId, userName: getSession(req).userName ?? null,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        newValues: {
          patientId, workOrderId: out.workOrderId, serviceType,
          maintenanceComponent: comp.value, deviceOrigin,
          amount: out.charge?.amount ?? 0,
        },
        notes: out.charge
          ? `صيانة بلا معاينة — أجور معلّقة ${out.charge.amount} د.ع`
          : "صيانة بلا معاينة — بلا أجور",
      });

      return res.status(201).json({
        ok: true, charge: out.charge, workOrderId: out.workOrderId,
        message: out.charge ? SAVED_PENDING_MESSAGE : SAVED_NO_CHARGE_MESSAGE,
      });
    } catch (err) {
      fail(res, err, "تعذّر تسجيل الصيانة");
    }
  });

  // ══ ② طابورُ الطبيب — المراجعةُ المالية وحدها ═══════════════════════════

  /**
   * **شاشةٌ لسؤالٍ واحد**: «أهذا المبلغُ مشروع؟».
   *
   * ولا تخلط بمعايناته (`/my-exams`) ولا بمراجعته الإشرافية
   * (`/medical-review`) ولا باعتماد الخصومات — كلُّ خلطٍ منها يجعل الطابورَ
   * لا يُقرأ.
   */
  app.get("/api/no-exam/review", isAuthenticated, async (req: Req, res) => {
    try {
      if (!mayReviewShape(chargeSession(req))) return res.json({ rows: [], specialties: [] });
      const s = getSession(req);
      //  المسؤولُ يراجع الاختصاصين معاً بسلطته؛ وغيرُه باختصاصه المقروء
      //  من القاعدة **الآن** لا من جلسته.
      const specialties = s.isAdmin
        ? ["prosthetic", "medical_support"]
        : (await doctorSpecialties(s.userId)).filter(
          (x) => x === "prosthetic" || x === "medical_support");
      const rows = await store.listForReview({
        specialties: specialties as string[], scope: branchScope(req),
      });
      res.json({ rows, specialties });
    } catch (err) {
      fail(res, err, "تعذّر تحميل طابور المراجعة");
    }
  });

  /** **الاعتماد** — ويُقيَّد المبلغُ مرّةً واحدة بالضبط بالكاتب القانونيّ. */
  app.post("/api/no-exam/charges/:id/approve", isAuthenticated, async (req: Req, res) => {
    try {
      const chargeId = Number(req.params.id);
      if (!Number.isFinite(chargeId)) return res.status(400).json({ error: "معرّف غير صالح" });
      //  ردٌّ مبكّر لمن ليس مراجعاً أصلاً — والحارسُ الأخير تحت القفل.
      if (!mayReviewShape(chargeSession(req))) {
        return res.status(403).json({ error: "مراجعة المبالغ لطبيبٍ مخوَّل أو للمسؤول" });
      }
      //  **ولا لقطةَ قبل القفل**: الخبيرُ والهويّةُ يُقرآن من الصفّ المقفول
      //  داخل المعاملة ويُعاد التحقّق منهما هناك — فما قُرئ قبل القفل قد
      //  يشيخ قبل أن يُكتب دينار.
      const out = await store.approveCharge({
        chargeId, actor: actorOf(req), eligible: reviewGate(req),
      });
      await logAudit({
        entityType: "pending_service_charge", entityId: chargeId, action: "update",
        userId: getSession(req).userId, userName: getSession(req).userName ?? null,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        oldValues: { status: "pending_review", amount: out.charge.amount },
        newValues: {
          status: "approved", amount: out.charge.amount, workOrderId: out.workOrderId,
        },
        notes: `اعتماد مبلغ عملية بلا معاينة — ${out.charge.amount} د.ع`,
      });
      res.json({ ok: true, charge: out.charge, workOrderId: out.workOrderId });
    } catch (err) {
      fail(res, err, "تعذّر اعتماد المبلغ");
    }
  });

  /** **الإعادةُ للتصحيح** — بسببٍ إلزاميّ، ولا شيءَ يُهدَم ولا دينارَ يتحرّك. */
  app.post("/api/no-exam/charges/:id/return", isAuthenticated, async (req: Req, res) => {
    try {
      const chargeId = Number(req.params.id);
      if (!Number.isFinite(chargeId)) return res.status(400).json({ error: "معرّف غير صالح" });
      if (!mayReviewShape(chargeSession(req))) {
        return res.status(403).json({ error: "مراجعة المبالغ لطبيبٍ مخوَّل أو للمسؤول" });
      }
      const charge = await store.returnCharge({
        chargeId, reason: String(req.body?.reason ?? ""),
        actor: actorOf(req), eligible: reviewGate(req),
      });
      await logAudit({
        entityType: "pending_service_charge", entityId: chargeId, action: "update",
        userId: getSession(req).userId, userName: getSession(req).userName ?? null,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        oldValues: { status: "pending_review" },
        newValues: { status: "returned", returnReason: charge.returnReason },
        notes: `إعادة مبلغ للتصحيح — ${charge.returnReason}`,
      });
      res.json({ ok: true, charge });
    } catch (err) {
      fail(res, err, "تعذّر إعادة العملية");
    }
  });

  // ══ ③ طابورُ الاستقبال — المُعادات ═════════════════════════════════════

  app.get("/api/no-exam/returned", isAuthenticated, async (req: Req, res) => {
    try {
      if (!canCorrectReturned(chargeSession(req))) return res.json({ rows: [] });
      res.json({ rows: await store.listReturned(branchScope(req)) });
    } catch (err) {
      fail(res, err, "تعذّر تحميل المُعادات");
    }
  });

  /**
   * **الشارةُ** — فيُعرَف أن هناك ما ينتظر بلا فتحِ الصفحة.
   *
   * `branch` هو الرقمُ الحاكم (المهمّةُ للفرع)، و`mine` تبليغٌ شخصيٌّ لمن
   * أنشأها — **ولا يقفل التصحيحَ عليه** فقد يكون غائباً.
   */
  app.get("/api/no-exam/returned/count", isAuthenticated, async (req: Req, res) => {
    try {
      if (!canCorrectReturned(chargeSession(req))) return res.json({ branch: 0, mine: 0 });
      res.json(await store.returnedCounts({
        scope: branchScope(req), userId: getSession(req).userId,
      }));
    } catch (err) {
      fail(res, err, "تعذّر قراءة عدّاد المُعادات");
    }
  });

  /** **التصحيحُ وإعادةُ الإرسال — على الصفّ نفسِه** ولا صفَّ ثانٍ يُستنسَخ. */
  app.post("/api/no-exam/charges/:id/resubmit", isAuthenticated, async (req: Req, res) => {
    try {
      const chargeId = Number(req.params.id);
      if (!Number.isFinite(chargeId)) return res.status(400).json({ error: "معرّف غير صالح" });
      if (!canCorrectReturned(chargeSession(req))) {
        return res.status(403).json({ error: "غير مصرح" });
      }
      const charge = await store.resubmitCharge({
        chargeId, amount: Number(req.body?.amount),
        note: typeof req.body?.note === "string" ? req.body.note.trim() || null : null,
        actor: actorOf(req),
        //  الفرعُ يُقرأ من صفّ العملية **تحت القفل** لا من الطلب.
        reachable: (c) => canReachBranch(req, c.branchId),
      });
      await logAudit({
        entityType: "pending_service_charge", entityId: chargeId, action: "update",
        userId: getSession(req).userId, userName: getSession(req).userName ?? null,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        oldValues: { status: "returned" },
        newValues: { status: "pending_review", amount: charge.amount },
        notes: `تصحيح وإعادة إرسال — ${charge.amount} د.ع`,
      });
      res.json({ ok: true, charge });
    } catch (err) {
      fail(res, err, "تعذّر إعادة الإرسال");
    }
  });

  // ══ ④ القراءةُ على الملفّ ══════════════════════════════════════════════

  app.get("/api/patients/:patientId/pending-charges", isAuthenticated, async (req: Req, res) => {
    try {
      const patientId = Number(req.params.patientId);
      if (!Number.isFinite(patientId)) return res.status(400).json({ error: "معرّف غير صالح" });
      const patient = await patientRow(patientId);
      if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
      if (!canReachBranch(req, patient.branch_id)) {
        return res.status(403).json({ error: "لا يمكنك الاطّلاع على مرضى فرع آخر" });
      }
      res.json({ rows: await store.listForPatient(patientId) });
    } catch (err) {
      fail(res, err, "تعذّر تحميل مبالغ المريض المعلّقة");
    }
  });

  /** **الرحلةُ كاملةً** — فلا يمحو سببُ إعادةٍ سبباً قبله. */
  app.get("/api/no-exam/charges/:id/events", isAuthenticated, async (req: Req, res) => {
    try {
      const chargeId = Number(req.params.id);
      if (!Number.isFinite(chargeId)) return res.status(400).json({ error: "معرّف غير صالح" });
      const charge = await store.getCharge(chargeId);
      if (!charge) return res.status(404).json({ error: "العملية غير موجودة" });
      if (!canReachBranch(req, charge.branchId)) {
        return res.status(403).json({ error: "غير مصرح لك بهذا الفرع" });
      }
      res.json({ charge, events: await store.getChargeEvents(chargeId) });
    } catch (err) {
      fail(res, err, "تعذّر تحميل سجل العملية");
    }
  });
}
