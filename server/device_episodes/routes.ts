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
  const r = await db.execute<{ id: number; name: string | null; branch_id: number | null }>(sql`
    SELECT id, name, branch_id FROM patients WHERE id = ${patientId}
  `);
  return (r.rows ?? [])[0] ?? null;
}

function fail(res: any, err: unknown, fallback: string) {
  if (err instanceof DeviceEpisodeError) {
    return res.status(err.status).json({ error: err.message });
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

      const patient = await patientScope(patientId);
      if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
      if (!canReachBranch(req, patient.branch_id)) {
        return res.status(403).json({ error: "لا يمكنك بدء جهاز لمريض فرع آخر" });
      }

      const session = getSession(req);
      const episode = await episodes.startDeviceEpisode({
        patientId, serviceType, createdBy: session.userId,
      });

      // ── توجيهٌ إلزامي إلى الطبيب (ترحيل ٠٥٥) ────────────────────────
      //  **جهازٌ جديد ⟶ معاينةٌ كاملة، بلا استثناء ولا خيارٍ للموظّف.**
      //  والطلب مربوطٌ بالحلقة نفسها لا بالمريض وحده، فمريضٌ فتح جهازين في
      //  اختصاصين مختلفين له طلبان يقرأ الطبيبُ فرقَهما.
      //  ويشمل **المريض القديم**: استثناؤه يرفع الإلزام عن الانتظار
      //  التلقائي، ولا يُخرجه من طلبٍ صرّح به الاستقبال بفعله.
      const routing = await routeServiceToDoctorReview(req, {
        patientId, caseType: serviceType,
        reviewKind: "new_device", requestedPath: "full",
        receptionNote: req.body?.reviewNote ?? null,
        deviceEpisodeId: episode.id,
      });

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
        notes: `بدء جهاز جديد #${episode.sequenceNumber} للمريض ${patient.name ?? patientId}`
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
