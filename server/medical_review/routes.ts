// نقاطُ مراجعة الطبيب للأطراف والمساند.
//
// ══ نموذج الصلاحيات ═══════════════════════════════════════════════════
//   إنشاءٌ وتصنيف — الاستقبال ومَن فوقه (`canCreateReview`). والخبير ليس
//     منهم: هو المنفّذ، ورأيُه يُسأل خارج المسار.
//   قرار        — طبيبٌ مخوَّل حصراً (`canDecideReview`)، **والمسؤول العام
//     ليس منهم بحكم منصبه** — تماماً كتوقيع المعاينة.
//   قراءة       — فريقُ العلاج ضمن نطاق الفرع، كسجلّ المعاينات.
//
// **والمنحُ يُقرأ من القاعدة عند كل قرار** لا من الجلسة، فسحبُ الصلاحية
// يسري فوراً لا عند الدخول التالي — نفس قاعدة المعاينة الموقّعة.

import type { Express } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { logAudit } from "../accounting/ledger";
import * as store from "./store";
import * as medical from "../medical/store";
import {
  canCreateReview, canDecideReview, REVIEW_DECISION_LABELS,
  REVIEW_PATH_LABELS, REVIEW_KIND_LABELS,
  isReviewDecision, type ReviewDecision,
} from "@shared/medical_review";
import { specialtyLabel } from "@shared/medical";

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

/** الفروع التي يقرؤها المنادي. `null` = مسؤول، أي كلُّ الفروع. */
function branchScope(req: Req): number[] | null {
  const s = getSession(req);
  if (s.isAdmin) return null;
  if (s.accessible.length > 0) return s.accessible;
  return s.branchId ? [s.branchId] : [];
}

/**
 * القدرةُ الحيّة على القرار — من صفّ المستخدم لا من جلسته.
 *
 * جلسةٌ فُتحت قبل سحب الصلاحية تحمل القديم؛ وقرارٌ طبّيّ لا يُبنى على لقطة.
 */
async function liveCanDecide(userId: number | null): Promise<boolean> {
  if (!userId) return false;
  const r = await db.execute<{ role: string; can: boolean | null; active: boolean | null }>(sql`
    SELECT role, can_write_medical_exam AS can, is_active AS active
      FROM system_users WHERE id = ${userId}
  `);
  const u = (r.rows ?? [])[0];
  if (!u || u.active === false) return false;
  return canDecideReview({ role: u.role, permissions: { canWriteMedicalExam: Boolean(u.can) } });
}

export function registerMedicalReviewRoutes(app: Express, isAuthenticated: any) {
  // ── إنشاءُ طلبٍ وتصنيفه — الاستقبال ────────────────────────────────────
  app.post("/api/medical-review/requests", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!canCreateReview(s)) return res.status(403).json({ error: "غير مصرح لك بإرسال طلب مراجعة" });
    try {
      const row = await store.createReviewRequest({
        patientId: parseInt(String(req.body?.patientId)),
        serviceType: String(req.body?.serviceType ?? ""),
        requestedPath: String(req.body?.requestedPath ?? ""),
        reviewKind: String(req.body?.reviewKind ?? ""),
        receptionNote: req.body?.receptionNote,
        deviceEpisodeId: req.body?.deviceEpisodeId ?? null,
        workOrderId: req.body?.workOrderId ?? null,
        visitId: req.body?.visitId ?? null,
        createdBy: s.userId,
        branchIds: branchScope(req),
      });
      await logAudit({
        entityType: "medical_review_request", entityId: row.id, action: "create",
        userId: s.userId, userName: s.userName, branchId: row.branchId,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        newValues: row as any,
        notes: `طلب مراجعة طبيب (${REVIEW_PATH_LABELS[row.requestedPath]}) لمريض #${row.patientId}`
          + ` — ${specialtyLabel(row.serviceType)} · ${REVIEW_KIND_LABELS[row.reviewKind]}`,
      });
      res.status(201).json(row);
    } catch (err: any) {
      if (err instanceof store.ReviewError) return res.status(err.status).json({ error: err.message });
      console.error("[medical-review] create failed:", err);
      res.status(500).json({ error: "تعذّر إنشاء طلب المراجعة" });
    }
  });

  // ── طابورُ الطبيب ──────────────────────────────────────────────────────
  // يُرجع `canDecide` مع الصفوف فتعرف الواجهةُ أن تعرض الأزرار أو تُخفيها
  // بلا أن تخمّن — والخادم يعيد الفحص على كل قرار مهما عرضت.
  app.get("/api/medical-review/queue", isAuthenticated, async (req: Req, res) => {
    try {
      const s = getSession(req);
      const specialties = await medical.doctorSpecialties(s.userId);
      const rows = specialties.length === 0
        ? []
        : await store.listPendingReviews({ branchIds: branchScope(req), specialties });
      res.json({
        rows,
        specialties: specialties.filter((x) => x !== "physiotherapy"),
        canDecide: await liveCanDecide(s.userId),
      });
    } catch (err: any) {
      console.error("[medical-review] queue failed:", err);
      res.status(500).json({ error: "تعذّر تحميل طابور المراجعة" });
    }
  });

  // ── تاريخُ طلبات مريض ──────────────────────────────────────────────────
  app.get("/api/medical-review/patients/:id/requests", isAuthenticated, async (req: Req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      if (!Number.isFinite(patientId)) return res.status(400).json({ error: "معرّف غير صالح" });
      const rows = await store.listReviewsForPatient(patientId, branchScope(req));
      res.json(rows);
    } catch (err: any) {
      console.error("[medical-review] patient list failed:", err);
      res.status(500).json({ error: "تعذّر تحميل طلبات المراجعة" });
    }
  });

  // ── قرارُ الطبيب ───────────────────────────────────────────────────────
  app.post("/api/medical-review/requests/:id/decide", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!(await liveCanDecide(s.userId))) {
      return res.status(403).json({ error: "القرار الطبي لطبيب مخوَّل فقط" });
    }
    const decision = String(req.body?.decision ?? "");
    if (!isReviewDecision(decision)) return res.status(400).json({ error: "قرار غير صالح" });
    try {
      const row = await store.decideReviewRequest({
        requestId: parseInt(req.params.id),
        decision,
        doctorNote: req.body?.doctorNote,
        doctorUserId: s.userId as number,
        branchIds: branchScope(req),
      });
      await logAudit({
        entityType: "medical_review_request", entityId: row.id, action: "update",
        userId: s.userId, userName: s.userName, branchId: row.branchId,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        newValues: row as any,
        notes: `قرار الطبيب: ${REVIEW_DECISION_LABELS[decision as ReviewDecision]}`
          + ` — مريض #${row.patientId} (${specialtyLabel(row.serviceType)})`,
      });
      res.json(row);
    } catch (err: any) {
      if (err instanceof store.ReviewError) return res.status(err.status).json({ error: err.message });
      console.error("[medical-review] decide failed:", err);
      res.status(500).json({ error: "تعذّر حفظ القرار" });
    }
  });
}
