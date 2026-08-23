// نقاطُ التصحيح الإداريّ لعمليةِ جهازٍ خاطئة.
//
// ══ الصلاحية — سلطةٌ إدارية لا سريرية ولا تنفيذية ═══════════════════════
// **المسؤولُ العامّ**: كلُّ الفروع، وسلطتُه مطلقة — لا يُقال له «لا يمكنك
// تصحيح هذا». وهذا هو الغرضُ كلُّه: أن لا تحبسه ضغطةٌ خاطئة.
//
// **مديرُ الفرع**: ضمن فرعه وحده.
//
// **وما عداهما يُردّ**: الاستقبالُ لا يُبطل بيعاً سجّله، والمحاسبُ لا يُبطل
// عمليةً بحكم دوره، والخبيرُ منفّذٌ لا مصحِّح. **والطبيبُ الموقِّع كذلك**:
// له تصحيحُه السريريّ بقواعده القائمة، ولا تُمنَح له سلطةٌ تجارية لأنه
// وقّع معاينة — التوقيعُ شهادةٌ سريرية لا صلاحيةُ إبطالِ بيع.
//
// **والحجبُ في الشاشة ليس إذناً**: كلُّ نقطةٍ هنا تفحص بنفسها.

import type { Express } from "express";
import * as reversal from "./store";
import { ReversalError } from "./store";
import { isReversalMode, isReversalReasonCode } from "@shared/administrative_reversal";

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
  };
}

/**
 * **مَن يملك التصحيح الإداريّ** — المسؤول، أو مديرُ فرعٍ ضمن نطاقه.
 *
 * ولا قدرةَ دقيقة (`can*`) تفتحه: هذه سلطةُ إبطالٍ تمسّ المالَ والسجلَّ
 * السريريَّ معاً، ومنحُها بعلمٍ في صفّ مستخدمٍ يجعلها تُوزَّع بالخطأ.
 */
function mayReverse(req: Req, branchId: number | null): { ok: boolean; error?: string } {
  const s = getSession(req);
  if (s.isAdmin) return { ok: true };
  if (s.role !== "branch_manager") {
    return {
      ok: false,
      error: "تصحيح العمليات صلاحية إدارية — للمسؤول العام أو مدير الفرع فقط",
    };
  }
  const scope = s.accessible.length > 0 ? s.accessible : (s.branchId ? [s.branchId] : []);
  if (branchId !== null && !scope.includes(branchId)) {
    return { ok: false, error: "لا يمكنك تصحيح عملية في فرع آخر" };
  }
  return { ok: true };
}

/** هويّةُ العملية كما تصل من الشاشات الثلاث — واحدةٌ منها تكفي. */
function targetOf(src: any) {
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  return {
    followupId: num(src?.followupId),
    workOrderId: num(src?.workOrderId),
    episodeId: num(src?.episodeId ?? src?.deviceEpisodeId),
  };
}

export function registerAdminReversalRoutes(app: Express, isAuthenticated: any) {
  // ── ما سيقع، قبل أن يقع ────────────────────────────────────────────────
  //  **ولا تُترك الشاشةُ تستنتجه**: قاعدتان للأثر تنحرفان يوماً، فتَعِد
  //  الشاشةُ بما لا ينفّذه الخادم.
  app.post("/api/admin/operation-reversal/preview", isAuthenticated, async (req: Req, res) => {
    try {
      const target = targetOf(req.body);
      if (target.followupId === null && target.workOrderId === null && target.episodeId === null) {
        return res.status(400).json({ error: "حدّد العملية المطلوب تصحيحها" });
      }
      const preview = await reversal.previewReversal(target);
      if (!preview) return res.status(404).json({ error: "العملية غير موجودة" });

      const perm = mayReverse(req, await branchOf(preview.patientId));
      if (!perm.ok) return res.status(403).json({ error: perm.error });

      res.json(preview);
    } catch (err: any) {
      if (err instanceof ReversalError) {
        return res.status(err.status).json({ error: err.message });
      }
      //  **ولا رسالةَ داخلية تصل الشاشة**: نصُّ خطأ Postgres يكشف بنيةً
      //  ولا يفيد موظّفاً.
      console.error("[admin-reversal] preview failed:", err);
      res.status(500).json({ error: "تعذّر قراءة أثر التصحيح" });
    }
  });

  // ── التنفيذ ────────────────────────────────────────────────────────────
  app.post("/api/admin/operation-reversal/execute", isAuthenticated, async (req: Req, res) => {
    try {
      const target = targetOf(req.body);
      if (target.followupId === null && target.workOrderId === null && target.episodeId === null) {
        return res.status(400).json({ error: "حدّد العملية المطلوب تصحيحها" });
      }
      const mode = req.body?.mode;
      if (!isReversalMode(mode)) {
        return res.status(400).json({ error: "اختر نوع التصحيح" });
      }
      const reasonCode = req.body?.reasonCode;
      if (!isReversalReasonCode(reasonCode)) {
        return res.status(400).json({ error: "اختر سبب التصحيح" });
      }
      const reasonNote = typeof req.body?.reasonNote === "string" ? req.body.reasonNote.trim() : "";
      if (!reasonNote) return res.status(400).json({ error: "اكتب سبب التصحيح" });

      //  الإذنُ يُفحَص على **فرع المريض المقروء من صفّه** لا من جسم الطلب.
      const found = await reversal.previewReversal(target);
      if (!found) return res.status(404).json({ error: "العملية غير موجودة" });
      const perm = mayReverse(req, await branchOf(found.patientId));
      if (!perm.ok) return res.status(403).json({ error: perm.error });

      const outcome = await reversal.executeReversal({
        target, mode, reasonCode, reasonNote,
        expectedStamp: typeof req.body?.stateStamp === "string" ? req.body.stateStamp : null,
        actor: { userId: getSession(req).userId, userName: getSession(req).userName },
        audit: { ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null },
      });
      res.json(outcome);
    } catch (err: any) {
      if (err instanceof ReversalError || err?.name === "ReversalError") {
        return res.status(err.status ?? 409).json({ error: err.message });
      }
      if (err?.name === "ExamCancelError" || err?.name === "DeviceEpisodeError") {
        return res.status(err.status ?? 409).json({ error: err.message });
      }
      console.error("[admin-reversal] execute failed:", err);
      res.status(500).json({ error: "تعذّر تنفيذ التصحيح" });
    }
  });
}

/** فرعُ المريض من صفّه — مصدرُ الحقيقة للنطاق. */
async function branchOf(patientId: number): Promise<number | null> {
  const { db } = await import("../db");
  const { sql } = await import("drizzle-orm");
  const r = await db.execute<{ branch_id: number | null }>(sql`
    SELECT branch_id FROM patients WHERE id = ${patientId}
  `);
  const v = (r.rows ?? [])[0]?.branch_id;
  return v === null || v === undefined ? null : Number(v);
}
