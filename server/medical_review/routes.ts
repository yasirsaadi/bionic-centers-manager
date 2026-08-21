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
  canCreateReview, canDecideReview, canSuperviseReview, REVIEW_DECISION_LABELS,
  REVIEW_PATH_LABELS, REVIEW_KIND_LABELS, REVIEW_SERVICE_TYPES,
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
  const u = await liveUser(userId);
  if (!u) return false;
  return canDecideReview({ role: u.role, permissions: { canWriteMedicalExam: u.can } });
}

/** صفُّ المستخدم الحيّ — أو `null` لمعطَّلٍ أو غير موجود. */
async function liveUser(userId: number | null): Promise<
  { role: string; isAdmin: boolean; can: boolean } | null
> {
  if (!userId) return null;
  const r = await db.execute<{
    role: string; can: boolean | null; active: boolean | null; admin: boolean | null;
  }>(sql`
    SELECT role, can_write_medical_exam AS can, is_active AS active,
           (role = 'admin') AS admin
      FROM system_users WHERE id = ${userId}
  `);
  const u = (r.rows ?? [])[0];
  if (!u || u.active === false) return null;
  return { role: String(u.role), isAdmin: Boolean(u.admin), can: Boolean(u.can) };
}

/**
 * القدرةُ الحيّة على **المراجعة الإشرافية** — من صفّ المستخدم لا من جلسته.
 *
 * أوسعُ من `liveCanDecide` بمديري الفروع والمسؤول، **وأضيقُ من التوقيع**:
 * لا شيء هنا يمنح `canWriteMedicalExam` لأحد.
 */
async function liveCanSupervise(userId: number | null): Promise<boolean> {
  const u = await liveUser(userId);
  if (!u) return false;
  return canSuperviseReview({
    role: u.role, isAdmin: u.isAdmin, permissions: { canWriteMedicalExam: u.can },
  });
}

/**
 * **الاختصاصُ يُفرَض في الخادم لا في الشاشة.**
 *
 * ══ الثغرةُ التي يغلقها ═════════════════════════════════════════════════
 * الواجهةُ ترشّح طابورَ الطبيب باختصاصاته، لكنّ **الترشيحَ عرضٌ لا حراسة**:
 * طبيبُ أطرافٍ يعرف رقمَ طلبِ مساندٍ يستطيع أن يبتّ فيه بنداءٍ مباشر — وهو
 * قرارٌ مهنيٌّ خارج اختصاصه، يُكتب باسمه في السجلّ.
 *
 * ══ القاعدة ════════════════════════════════════════════════════════════
 * • **مسؤولٌ عام** ⟶ كلُّ الاختصاصات (وحدودُ الفرع تُفرَض في الطبقة).
 * • **مديرُ فرع** ⟶ كلُّ الاختصاصات **داخل نطاقه** — إشرافُه إداريٌّ على
 *   حركة مرضاه لا مهنيٌّ في تخصّص، فلا معنى لترشيحه باختصاص.
 * • **طبيبٌ مخوَّل** ⟶ **اختصاصاتُه المسجَّلة وحدها**.
 *
 * والمنحُ يُقرأ من القاعدة عند كلّ فعل، فسحبُ اختصاصٍ يسري فوراً.
 */
async function specialtyAllowed(
  userId: number | null, serviceType: string,
): Promise<boolean> {
  const u = await liveUser(userId);
  if (!u) return false;
  if (u.isAdmin || u.role === "branch_manager") return true;
  const mine = await medical.doctorSpecialties(userId);
  return mine.includes(serviceType as any);
}

/** صفُّ الطلب — للتحقّق من اختصاصه قبل أي فعل. `null` إن لم يوجد. */
async function requestServiceType(id: number): Promise<string | null> {
  if (!Number.isFinite(id)) return null;
  const r = await db.execute<{ service_type: string }>(sql`
    SELECT service_type FROM medical_review_requests WHERE id = ${id}
  `);
  const row = (r.rows ?? [])[0];
  return row ? String(row.service_type) : null;
}

/**
 * الاختصاصاتُ التي يراها المنادي في شاشة الإشراف.
 *
 * **الطبيبُ يرى اختصاصَه وحده** — طبيبُ أطرافٍ لا يُعرَض عليه مسند.
 * **والمشرفُ الإداريّ يرى الاثنين**: مديرُ الفرع مسؤولٌ عن حركة مرضاه
 * كلِّها، وهو ليس طبيباً فلا اختصاصَ له يُرشَّح به — وترشيحُه بقائمةٍ
 * فارغة كان يعني صفحةً فارغة لمن الصفحةُ له.
 */
async function reviewSpecialtiesFor(userId: number | null): Promise<readonly string[]> {
  const mine = await medical.doctorSpecialties(userId);
  const device = mine.filter((s) => (REVIEW_SERVICE_TYPES as readonly string[]).includes(s));
  if (device.length > 0) return device;
  const u = await liveUser(userId);
  if (u && (u.isAdmin || u.role === "branch_manager")) return REVIEW_SERVICE_TYPES;
  return [];
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
      const specialties = await reviewSpecialtiesFor(s.userId);
      const raw = String(req.query?.window ?? "today");
      const window = raw === "older" || raw === "all" ? raw : "today";
      const scope = branchScope(req);
      const canSupervise = await liveCanSupervise(s.userId);
      const rows = specialties.length === 0
        ? []
        : await store.listPendingReviews({ branchIds: scope, specialties, window });
      //  **وقسمُ المعاينات المنتظرة** — لمن يملك الإرجاع وحده. ومَن أنشأ
      //  الطلبَ بنفسه لا يُعرض له (والخادمُ يردّه أيضاً عند الضغط).
      const awaitingFull = canSupervise && specialties.length > 0
        ? (await store.listPendingFullRequests({ branchIds: scope, specialties }))
          .filter((r) => r.createdBy !== s.userId)
        : [];
      res.json({
        rows,
        awaitingFull,
        specialties,
        window,
        //  **قدرتان لا واحدة**: الإشرافُ يفتح «تمت المراجعة» و«إرجاع»،
        //  والقرارُ الطبّيّ يفتح «يتطلّب معاينة كاملة». والواجهةُ تعرض ما
        //  يملكه كلٌّ — والخادمُ يعيد الفحص على كل فعلٍ مهما عرضت.
        canSupervise,
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
    const decision = String(req.body?.decision ?? "");
    if (!isReviewDecision(decision)) return res.status(400).json({ error: "قرار غير صالح" });

    // ══ **قدرتان لا واحدة** ═══════════════════════════════════════════
    //  «تمت المراجعة» و«إرجاع للاستعلامات» فعلان **إشرافيّان**: مديرُ
    //  الفرع مسؤولٌ عن حركة مرضاه، يؤشّر أنه اطّلع ويعيد ما بياناتُه خطأ.
    //
    //  أمّا «يتطلّب معاينة كاملة» فهو **قرارٌ سريريّ**: يقول إن هذه الحالة
    //  تحتاج فحصَ طبيب. فيبقى للطبيب المخوَّل وحده كما كان — ولا يفتحه
    //  الإشرافُ لأحد. والاستقبالُ العاديُّ ليس من الاثنين.
    const needsClinical = decision === "require_full_exam";
    const allowed = needsClinical
      ? await liveCanDecide(s.userId)
      : await liveCanSupervise(s.userId);
    if (!allowed) {
      return res.status(403).json({
        error: needsClinical
          ? "طلبُ المعاينة الكاملة قرارٌ سريريّ — لطبيب مخوَّل فقط"
          : "المراجعة الإشرافية للمسؤول أو مدير الفرع أو طبيب الاختصاص",
      });
    }
    //  **والاختصاصُ يُفرَض هنا لا في الشاشة**: طبيبُ أطرافٍ لا يبتّ في طلبِ
    //  مساندٍ بنداءٍ مباشر ولو عرف رقمَه.
    const sType = await requestServiceType(parseInt(req.params.id));
    if (sType && !(await specialtyAllowed(s.userId, sType))) {
      return res.status(403).json({
        error: `هذا الطلب في اختصاص ${specialtyLabel(sType)} — وليس من اختصاصاتك`,
      });
    }
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
        //  **ونصُّ التدقيق يقول ما وقع فعلاً**: «تمت المراجعة» و«الإرجاع»
        //  فعلان **إشرافيّان** بأثرٍ رجعي، لا موافقةٌ طبية سبقت التنفيذ.
        //  أمّا «يتطلّب معاينة كاملة» فقرارٌ **سريريّ** — ووسمُه إشرافياً
        //  يجعل مَن يقرأ السجلّ يظنّ أن إدارياً قرّر حاجةً طبية.
        notes: `${needsClinical ? "قرار سريري" : "مراجعة إشرافية"}: `
          + `${REVIEW_DECISION_LABELS[decision as ReviewDecision]}`
          + ` — مريض #${row.patientId} (${specialtyLabel(row.serviceType)})`
          + (row.doctorNote ? ` · ${row.doctorNote}` : ""),
      });
      res.json(row);
    } catch (err: any) {
      if (err instanceof store.ReviewError) return res.status(err.status).json({ error: err.message });
      console.error("[medical-review] decide failed:", err);
      res.status(500).json({ error: "تعذّر حفظ القرار" });
    }
  });

  // ── إرجاعُ طلبِ معاينةٍ كاملة إلى الاستعلامات ──────────────────────────
  //  بابُ الخروج النظيف لطلبٍ أُرسل ببيانٍ خاطئ: يخرج من «معايناتي»، ولا
  //  معاينةَ تُكتب ولا تُحذف، ويستطيع الاستعلاماتُ إرسالَ طلبٍ مصحَّح.
  app.post("/api/medical-review/requests/:id/return", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!(await liveCanSupervise(s.userId))) {
      return res.status(403).json({
        error: "الإرجاع فعلٌ إشرافيّ — للمسؤول أو مدير الفرع أو طبيب الاختصاص",
      });
    }
    //  والاختصاصُ هنا كما في البتّ — طبيبٌ لا يُرجع طلبَ اختصاصٍ ليس له.
    const rType = await requestServiceType(parseInt(req.params.id));
    if (rType && !(await specialtyAllowed(s.userId, rType))) {
      return res.status(403).json({
        error: `هذا الطلب في اختصاص ${specialtyLabel(rType)} — وليس من اختصاصاتك`,
      });
    }
    try {
      const row = await store.returnFullRequestToReception({
        requestId: parseInt(req.params.id),
        reason: req.body?.reason,
        actorUserId: s.userId as number,
        branchIds: branchScope(req),
      });
      await logAudit({
        entityType: "medical_review_request", entityId: row.id, action: "update",
        userId: s.userId, userName: s.userName, branchId: row.branchId,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        newValues: row as any,
        notes: `إرجاع طلب معاينة كاملة إلى الاستعلامات — مريض #${row.patientId}`
          + ` (${specialtyLabel(row.serviceType)}) · ${row.doctorNote ?? ""}`,
      });
      res.json(row);
    } catch (err: any) {
      if (err instanceof store.ReviewError) return res.status(err.status).json({ error: err.message });
      console.error("[medical-review] return failed:", err);
      res.status(500).json({ error: "تعذّر إرجاع الطلب" });
    }
  });
}
