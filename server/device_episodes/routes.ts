// نقاط REST لحلقات أجهزة المريض.
//
// ══ الصلاحيات ═══════════════════════════════════════════════════════════
// القراءة — أي مستخدم يصل فرع المريض. الكتابة (بدء جهاز / إلغاؤه) — نفس
// بوّابة «خدمة جديدة» و«إضافة نوع حالة»: مسؤول، أو مدير فرع ضمن فروعه، أو
// موظّف يحمل `canAddPatients` ضمن فرع المريض. فبدء جهاز قرارُ استقبالٍ
// إداري لا قرارٌ سريري ولا تنفيذي.
//
// وخبير الأطراف **لا يبدأ جهازاً بنفسه** ما لم يحمل صلاحية أخرى تجيز ذلك:
// هو المنفّذ، وفتحُ الطلب على نفسه يجمع الطلب والتنفيذ في يدٍ واحدة.
//
// ونطاق الفرع مفروضٌ في الخادم لا في الواجهة: كل نقطة تقرأ فرع المريض من
// صفّه ثم تقارنه بنطاق الجلسة.

import type { Express } from "express";
import { logAudit } from "../accounting/ledger";
import { routeServiceToDoctorReview } from "../medical_review/routing";
import * as episodes from "./store";
import { DeviceEpisodeError, isDeviceServiceType } from "./store";
import {
  parseRequestedItem, requestedItemLabel, requestedItemLine, noExamSaleRefusal,
} from "@shared/prosthetic_parts";
import { checkRequiredPatientData } from "@shared/patient_required";
import { isServicePath, type ServicePath } from "@shared/service_path";
import { PATIENT_IN_TRASH_ERROR } from "@shared/patient_trash";

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
    canAddPatients: Boolean(s?.permissions?.canAddPatients),
  };
}

/** الفروع التي يصلها المستخدم. `null` = مسؤول، أي كل الفروع. */
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

/** بوّابة الكتابة — مطابقة لـ«خدمة جديدة» في routes.ts. */
function canStartService(req: Req): boolean {
  const s = getSession(req);
  return s.isAdmin || s.role === "branch_manager" || s.canAddPatients;
}

async function patientScope(patientId: number) {
  const { db } = await import("../db");
  const { sql } = await import("drizzle-orm");
  //  والمقاساتُ تُقرأ هنا لأن **بدءَ طرفٍ جديد يشترطها** — الطرفُ يُصنَع
  //  عليها، وملفٌّ قديمٌ ناقصٌ لا يدخل دورةَ تصنيعٍ جديدة بها.
  const r = await db.execute<{
    id: number; name: string | null; branch_id: number | null;
    age: string | null; height: string | null; weight: string | null;
    is_amputee: boolean | null; amputation_site: string | null;
  }>(sql`
    SELECT id, name, branch_id, age, height, weight, is_amputee, amputation_site,
           deleted_at
      FROM patients WHERE id = ${patientId}
  `);
  return (r.rows ?? [])[0] ?? null;
}

/**
 * **ملفٌّ في السلّة يُقال عنه ذلك** (ترحيل ٠٦٨) — لا «غير موجود».
 *
 * إخفاؤه بـ٤٠٤ يرسل الموظّفَ يبحث عن خطأٍ ليس هناك، وبابُه الاستعادةُ لا
 * الالتفاف. ويُردّ **قبل** أيّ حراسةٍ أخرى فلا يُسأل عن مقاساتٍ لملفٍّ خرج.
 */
function trashGuard(res: any, patient: any): boolean {
  if (!patient?.deleted_at) return false;
  res.status(409).json({ error: PATIENT_IN_TRASH_ERROR });
  return true;
}

function fail(res: any, err: unknown, fallback: string) {
  if (err instanceof DeviceEpisodeError) {
    //  **والسياقُ المنظَّم يمرّ معها** (ترحيل ٠٦٤): الشاشةُ تبني عليه زرَّ
    //  «فتح العملية الحالية» و — للمخوَّل — «تصحيح / إلغاء العملية»، بدل
    //  أن تعرض جملةً لا يعرف الموظّفُ ماذا يفعل بعدها.
    const ctx = err as any;
    return res.status(err.status).json({
      error: err.message,
      ...(ctx.code ? { code: ctx.code } : {}),
      ...(ctx.activeEpisodeId ? { activeEpisodeId: ctx.activeEpisodeId } : {}),
      ...(ctx.activeWorkOrderId ? { activeWorkOrderId: ctx.activeWorkOrderId } : {}),
    });
  }
  console.error(`[device-episodes] ${fallback}:`, err);
  return res.status(500).json({ error: fallback });
}

export function registerDeviceEpisodeRoutes(app: Express, isAuthenticated: any) {
  // ── حلقات المريض ─────────────────────────────────────────────────────
  app.get("/api/patients/:patientId/device-episodes", isAuthenticated, async (req: Req, res) => {
    try {
      const patientId = Number(req.params.patientId);
      if (!Number.isFinite(patientId)) {
        return res.status(400).json({ error: "معرّف مريض غير صالح" });
      }
      const patient = await patientScope(patientId);
      if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
      if (trashGuard(res, patient)) return;
      if (!canReachBranch(req, patient.branch_id)) {
        return res.status(403).json({ error: "لا يمكنك الاطّلاع على مرضى فرع آخر" });
      }
      res.json({ episodes: await episodes.getDeviceEpisodesForPatient(patientId) });
    } catch (err) {
      fail(res, err, "تعذّر تحميل أجهزة المريض");
    }
  });

  // ── بدء جهاز جديد ────────────────────────────────────────────────────
  //  المريض العائد لا يُسجَّل من جديد ولا يُفتح له خيط ثانٍ من النوع نفسه —
  //  تُفتح حلقة جديدة على خيطه القائم.
  app.post("/api/patients/:patientId/device-episodes", isAuthenticated, async (req: Req, res) => {
    try {
      const patientId = Number(req.params.patientId);
      if (!Number.isFinite(patientId)) {
        return res.status(400).json({ error: "معرّف مريض غير صالح" });
      }
      if (!canStartService(req)) return res.status(403).json({ error: "غير مصرح" });

      const serviceType = req.body?.serviceType;
      if (!isDeviceServiceType(serviceType)) {
        return res.status(400).json({ error: "نوع الجهاز غير صالح" });
      }

      // ── **ما المطلوب؟** جهازٌ كامل أم جزء (ترحيل ٠٦٠) ────────────────
      //  المجهولُ يُردّ لا يُصحَّح بصمت: تصحيحُه إلى «كامل» كان سيفتح طلبَ
      //  جهازٍ كامل لمريضٍ يريد ركبةً — وثمنُه بين الاثنين هائل.
      //  والغيابُ مقبولٌ ويُقرأ «كامل»: نافذةٌ قديمة مفتوحة لا ترسله.
      //  **والمساندُ الطبية بلا أجزاء** — يفرضه المحلّلُ نفسه بنوع الخدمة،
      //  ويعيده المخزنُ داخل معاملته المقفلة.
      const parsedItem = parseRequestedItem(req.body?.requestedItem, serviceType);
      if (!parsedItem.ok) return res.status(400).json({ error: parsedItem.error });

      // ── **هل تحتاج هذه العملية معاينة طبية؟** (ترحيل ٠٦٥) ────────────
      //  سؤالٌ عن **الطلب** لا عن صاحبه. وكان الجوابُ يُستنتَج من تصنيف
      //  المريض «جديد/قديم» — بُعدٍ إداريّ تُجيب عنه موظّفةُ الاستقبال بصدق،
      //  فيقع أثرٌ سريريٌّ لم تقصده. فصار يُسأل هنا مرّةً لكلّ عملية.
      //
      //  **وإلزاميّ على الكتابة الجديدة**: الغيابُ لا يُقرأ افتراضاً في
      //  اتجاهٍ ولا في الآخر — «معاينة» افتراضاً يسوق للطبيب مَن لا يحتاجه،
      //  و«بلا معاينة» افتراضاً يُسقط شرطاً سريرياً بصمت. فيُردّ ويُسأل.
      const servicePath: ServicePath | null = isServicePath(req.body?.servicePath)
        ? req.body.servicePath : null;
      if (!servicePath) {
        return res.status(400).json({
          error: "حدّد مسار العملية: هل تحتاج معاينة طبية؟ (نعم / لا)",
          field: "servicePath",
        });
      }

      // ── **والجهازُ الكاملُ لا يُفتَح على مسار «بلا معاينة»** (٠٦٧) ─────
      //  الجزءُ بديلٌ لقطعةٍ وُصفت يوماً، والجهازُ الكاملُ قرارٌ سريريٌّ من
      //  أوّله. وفتحُ طلبٍ كهذا هنا كان يُنتج حلقةً لا يقبلها بابُ البيع
      //  بعد لحظات — فيُردّ **الآن** بدل أن يُترك فخّاً.
      //
      //  **وطرفاً كان أو مسنداً** (قرارُ المالك بعد ٢٤٩): كان الاستثناءُ
      //  يُخرج المساندَ لأنها «بلا قائمة أجزاء» — وهو قلبٌ للحجّة: غيابُ
      //  الأجزاء يعني ألّا بيعَ بلا معاينة للمساند أصلاً، لا أن يُباع
      //  أشدُّ ما يحتاج الطبيبَ فيها. والقاعدةُ في `shared` لا هنا.
      const saleRefusal = servicePath === "no_exam"
        ? noExamSaleRefusal(serviceType, parsedItem.value) : null;
      if (saleRefusal) return res.status(400).json({ error: saleRefusal });

      const patient = await patientScope(patientId);
      if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
      if (trashGuard(res, patient)) return;
      if (!canReachBranch(req, patient.branch_id)) {
        return res.status(403).json({ error: "لا يمكنك بدء جهاز لمريض فرع آخر" });
      }

      // ── **لا دورةَ تصنيعٍ جديدة بملفٍّ ناقص** ────────────────────────
      //  العمرُ والطولُ والوزن وتعريفُ البتر ليست حقولاً إدارية: الطرفُ
      //  يُصنَع عليها. والملفُّ القديم يبقى **مقروءاً** ويُصحَّح إدارياً بلا
      //  إجبار — لكنّ **لحظةَ دخوله دورةً جديدة** هي اللحظة التي يجب أن
      //  يكتمل فيها، لا بعد أن يُقاس الجهازُ على فراغ.
      if (serviceType === "prosthetic") {
        const req0 = checkRequiredPatientData({
          age: patient.age, height: patient.height, weight: patient.weight,
          isAmputee: true, amputationSite: patient.amputation_site,
        });
        if (!req0.ok) {
          return res.status(400).json({
            error: `${req0.message} — أكمِل ملفّ المريض قبل بدء طرف أو جزء جديد`,
            missing: req0.missing,
          });
        }
      }

      const session = getSession(req);
      const episode = await episodes.startDeviceEpisode({
        patientId, serviceType, createdBy: session.userId,
        requestedItem: parsedItem.value, servicePath,
      });

      // ── توجيهٌ إلزامي إلى الطبيب (ترحيل ٠٥٥) ────────────────────────
      //  **جهازٌ جديد ⟶ معاينةٌ كاملة، بلا استثناء ولا خيارٍ للموظّف.**
      //  والطلب مربوطٌ بالحلقة نفسها لا بالمريض وحده، فمريضٌ فتح جهازين في
      //  اختصاصين مختلفين له طلبان يقرأ الطبيبُ فرقَهما.
      //  ويشمل **المريض القديم**: استثناؤه يرفع الإلزام عن الانتظار
      //  التلقائي، ولا يُخرجه من طلبٍ صرّح به الاستقبال بفعله.
      //  **والتوجيهُ يتبع مسارَ العملية لا تاريخَ المريض** (ترحيل ٠٦٥):
      //  مساره `exam` ⟶ طلبُ معاينةٍ كاملة كما كان حرفاً بحرف، ولو كان
      //  المريضُ مصنَّفاً «قديماً». ومساره `no_exam` ⟶ **لا طلبَ ولا
      //  طابور**: العمليةُ قيلت صراحةً إنها لا تحتاج الطبيب، فسَوقُها إليه
      //  يُغرق قائمتَه بما لا قرارَ له فيه.
      const routing = servicePath === "exam"
        ? await routeServiceToDoctorReview(req, {
          patientId, caseType: serviceType,
          reviewKind: "new_device", requestedPath: "full",
          //  **الطبيبُ يقرأ ما طُلب في طلبه** — «المطلوب: ركبة» لا «جهاز
          //  جديد» وحدها. فيعرف قبل أن يفتح الملفّ ماذا يفحص ولماذا.
          receptionNote: [requestedItemLine(episode.requestedItem, serviceType),
            typeof req.body?.reviewNote === "string" ? req.body.reviewNote.trim() : ""]
            .filter(Boolean).join(" — "),
          deviceEpisodeId: episode.id,
        })
        : { request: null as { id: number } | null };

      await logAudit({
        entityType: "patient_device_episode",
        entityId: episode.id,
        action: "create",
        userId: session.userId,
        userName: session.userName ?? null,
        branchId: episode.branchId,
        newValues: episode,
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
        notes: `بدء جهاز جديد #${episode.sequenceNumber} (${requestedItemLabel(episode.requestedItem, serviceType)})`
          + ` للمريض ${patient.name ?? patientId}`
          + (servicePath === "exam" ? " — المسار: يحتاج معاينة" : " — المسار: بلا معاينة")
          + (routing.request ? ` — طلب مراجعة #${routing.request.id} (معاينة كاملة)` : ""),
      });

      res.status(201).json({ ...episode, reviewRequestId: routing.request?.id ?? null });
    } catch (err) {
      fail(res, err, "تعذّر بدء الجهاز");
    }
  });

  // ── إلغاء حلقة قبل التصنيع ───────────────────────────────────────────
  app.post(
    "/api/patients/:patientId/device-episodes/:episodeId/cancel",
    isAuthenticated,
    async (req: Req, res) => {
      try {
        const patientId = Number(req.params.patientId);
        const episodeId = Number(req.params.episodeId);
        if (!Number.isFinite(patientId) || !Number.isFinite(episodeId)) {
          return res.status(400).json({ error: "معرّف غير صالح" });
        }
        if (!canStartService(req)) return res.status(403).json({ error: "غير مصرح" });

        const patient = await patientScope(patientId);
        if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
        if (trashGuard(res, patient)) return;
      if (trashGuard(res, patient)) return;
        if (!canReachBranch(req, patient.branch_id)) {
          return res.status(403).json({ error: "لا يمكنك التعديل على مريض فرع آخر" });
        }

        const reason = typeof req.body?.reason === "string" ? req.body.reason : "";
        const session = getSession(req);
        const before = await episodes.getDeviceEpisode(episodeId);
        const episode = await episodes.cancelPreManufacturingDeviceEpisode({
          patientId, episodeId, reason,
        });

        await logAudit({
          entityType: "patient_device_episode",
          entityId: episode.id,
          action: "update",
          userId: session.userId,
          userName: session.userName ?? null,
          branchId: episode.branchId,
          oldValues: before,
          newValues: episode,
          ipAddress: req.ip ?? null,
          userAgent: req.get("user-agent") ?? null,
          notes: `إلغاء جهاز #${episode.sequenceNumber} قبل التصنيع — ${episode.cancelReason}`,
        });

        res.json(episode);
      } catch (err) {
        fail(res, err, "تعذّر إلغاء الجهاز");
      }
    },
  );
}
