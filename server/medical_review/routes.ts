// نقاطُ مراجعة حركة مرضى الأطراف والمساند.
//
// ══ نموذج الصلاحيات ═══════════════════════════════════════════════════
//
//   **إنشاءٌ وتصنيف** — الاستقبال ومَن فوقه (`canCreateReview`). والخبير
//     ليس منهم: هو المنفّذ، ورأيُه يُسأل خارج المسار.
//
//   **مراجعةٌ إشرافية** (`canSuperviseReview`) — المسؤولُ العام، أو مديرُ
//     فرعٍ **في نطاق فرعه**، أو طبيبٌ مخوَّل **في اختصاصه**. وأفعالُها:
//       · «تمت المراجعة»        — اعترافٌ بأثرٍ رجعي بأن الحركة رُوجعت،
//         لا موافقةٌ سابقة لتنفيذ الخدمة: الطلبُ السريع يُنشَأ **بعد**
//         وقوع الخدمة أصلاً. (القيمةُ المخزَّنة `approved` كما هي.)
//       · «إرجاع للاستعلامات»   — بسببٍ إلزاميّ، للسريع وللمعاينة الكاملة.
//
//   **قرارٌ سريريّ** (`canDecideReview`) — طبيبٌ مخوَّل **في اختصاصه
//     المسجَّل** حصراً، **والمسؤول العام ليس منهم بحكم منصبه**. وفعلُه
//     الوحيد: «يتطلّب معاينة كاملة» — قولٌ بأن هذه الحالة تحتاج فحصَ
//     طبيب، ولا يفتحه الإشرافُ لأحد.
//
//   **توقيعُ المعاينة** — سريريٌّ خالص، في `medical/routes.ts`، ولا تمنحه
//     المراجعةُ الإشرافية لأحد. **فمديرُ الفرع يراجع ولا يوقّع أبداً**:
//     `canWriteMedicalExam` لم تُمَسّ بحرف، والقدرتان منفصلتان بالاسم
//     والمعنى — ولو وُسِّعت الأولى لصار المديرُ يوقّع سجلّاً سريرياً باسمه.
//
//   **قراءة** — فريقُ العلاج ضمن نطاق الفرع، كسجلّ المعاينات.
//
// **والمنحُ يُقرأ من القاعدة عند كل فعل** لا من الجلسة، فسحبُ الصلاحية —
// دوراً كان أو اختصاصاً — يسري فوراً لا عند الدخول التالي.
//
// **والاختصاصُ يُفرَض هنا لا في الشاشة** (`specialtyAllowed`): ترشيحُ
// الواجهة عرضٌ لا حراسة، وطبيبُ أطرافٍ يعرف رقمَ طلبِ مساندٍ لا يبتّ فيه
// ولا يُرجعه. والمشرفُ الإداريُّ لا يُرشَّح باختصاص: مسؤوليّتُه حركةُ
// مرضاه كلُّها، وحدُّه فرعُه.

import type { Express } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { logAudit } from "../accounting/ledger";
import * as store from "./store";
import * as medical from "../medical/store";
import {
  canCreateReview, canDecideReview, canSuperviseReview, REVIEW_DECISION_LABELS,
  REVIEW_PATH_LABELS, REVIEW_KIND_LABELS, REVIEW_SERVICE_TYPES,
  isReviewDecision, requestBranchInScope, type ReviewDecision, PHYSIO_EXAM_REQUEST_SERVICE,
} from "@shared/medical_review";
import { specialtyLabel } from "@shared/medical";
import { transferTargets } from "@shared/returned_transfer";
import { patientBranchIdsOf, resolveActingBranchId } from "../patients/branch_access";
import { physioOfferingBranchIds } from "../physio_plans/store";
import { hasRole, rolesOf } from "@shared/user_roles";

type Req = any;

function getSession(req: Req) {
  const s = (req.session as any)?.branchSession;
  return {
    userId: (s?.userId ?? null) as number | null,
    userName: (s?.displayName ?? null) as string | null,
    role: (s?.role ?? "") as string,
    roles: rolesOf(s),
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
  return canDecideReview({ role: u.role, roles: u.roles, permissions: { canWriteMedicalExam: u.can } });
}

/** صفُّ المستخدم الحيّ — أو `null` لمعطَّلٍ أو غير موجود. */
async function liveUser(userId: number | null): Promise<
  { role: string; roles: string[]; isAdmin: boolean; can: boolean } | null
> {
  if (!userId) return null;
  const r = await db.execute<{
    role: string; extra_roles: unknown; can: boolean | null; active: boolean | null; admin: boolean | null;
  }>(sql`
    SELECT role, extra_roles, can_write_medical_exam AS can, is_active AS active,
           (role = 'admin') AS admin
      FROM system_users WHERE id = ${userId}
  `);
  const u = (r.rows ?? [])[0];
  if (!u || u.active === false) return null;
  return { role: String(u.role), roles: rolesOf({ role: u.role, extraRoles: u.extra_roles }), isAdmin: Boolean(u.admin), can: Boolean(u.can) };
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
    role: u.role, roles: u.roles, isAdmin: u.isAdmin, permissions: { canWriteMedicalExam: u.can },
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
  if (u.isAdmin || hasRole(u, "branch_manager")) return true;
  const mine = await medical.doctorSpecialties(userId);
  return mine.includes(serviceType as any);
}

/**
 * **أخصائيُّ العلاج الطبيعيّ يُرجِع صفَّ العلاج الطبيعيّ** (§4.gu — قرارُ المالك ٢٠٢٦-١١-٢٢).
 *
 * مَن يكتب معاينةَ العلاج الطبيعيّ بدوره (`doctorSpecialties` — الأخصائيُّ والمشرفُ العامّ بلا علَم طبيب، §4.da) يقول «هذا ليس
 * قسمي» كما يقوله الطبيب. **وللعلاج الطبيعيّ وحده**: لا يفتح هذا إرجاعَ طلبِ جهازٍ ولا قرارَ مراجعةٍ ولا أيَّ بابٍ آخر.
 */
async function liveCanReturnPhysio(userId: number | null): Promise<boolean> {
  if (await liveCanSupervise(userId)) return true;
  return (await medical.doctorSpecialties(userId)).includes(PHYSIO_EXAM_REQUEST_SERVICE);
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
  const u = await liveUser(userId);
  if (!u) return [];
  //  ══ **الدورُ يسبق الاختصاص — لا العكس** ═════════════════════════════
  //  أوّلُ تنفيذٍ سأل عن الاختصاصات أوّلاً، فمَن حمل منها شيئاً رجع بها
  //  ولم يُسأل عن دوره. والنتيجةُ عكسُ المقصود بالضبط: **مسؤولٌ عام يحمل
  //  منحاً سريرياً في الأطراف كان يُحجَب عنه المساند** — فيُضيَّق عليه
  //  بسبب صلاحيةٍ زائدة لا ناقصة.
  //
  //  والإشرافُ الإداريُّ ليس مهنةً في تخصّص: المسؤولُ ومديرُ الفرع
  //  مسؤولان عن **حركة مرضاهما كلِّها**، فلا يُرشَّحان باختصاص. أمّا
  //  الطبيبُ فاختصاصاتُه المسجَّلة وحدها.
  //
  //  (والفرعُ يبقى حاجزاً في `branchScope`، و`specialtyAllowed` تحرس
  //  الفعلَ نفسه — هذه للعرض لا للإذن.)
  if (u.isAdmin || hasRole(u, "branch_manager")) return REVIEW_SERVICE_TYPES;
  const mine = await medical.doctorSpecialties(userId);
  return mine.filter((s) => (REVIEW_SERVICE_TYPES as readonly string[]).includes(s));
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
        //  والطلبُ يُنسَب لفرع مُرسِله حين يصل الملفّ (ترحيل ٠٨٠).
        sessionBranchId: s.branchId,
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
      //  **ولكلّ صفٍّ: أفرعُه في نطاقك؟** — الطابورُ يعرض حركاتِ كلّ فرعٍ يصل
      //  الملفّ (§4.t)، والتأشيرُ لفرع الطلب وحده. فالعلَمُ من الدالّة التي
      //  يردّ بها `decideReviewRequest` نفسُه، فلا تُظهر الشاشةُ زرّاً يُردّ.
      const rows = (specialties.length === 0
        ? []
        : await store.listPendingReviews({ branchIds: scope, specialties, window }))
        .map((r) => ({ ...r, branchInScope: requestBranchInScope(scope, r.branchId) }));
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

  // ── «المُرجَعون من الطبيب» — للاستعلامات وللطبيب (§4.ar، تكملةُ البند ١٨) ──
  //  الاستعلاماتُ ومَن فوقه يرى اختصاصَي الجهاز معاً، والطبيبُ اختصاصَه وحده.
  //  والفرعُ كطابور المراجعة بحرفه. **قراءةٌ محضة** — والأفعالُ أبوابُها القائمة.
  //  **والعلاجُ الطبيعيّ منها** (§4.gu): الاستعلاماتُ يرى الأقسامَ الثلاثة، والطبيبُ اختصاصاتِه وأخصائيُّ العلاج الطبيعيّ قسمَه.
  const returnedFor = async (req: Req) => {
    const s = getSession(req);
    const physioExaminer = (await medical.doctorSpecialties(s.userId)).includes(PHYSIO_EXAM_REQUEST_SERVICE);
    if (!canCreateReview(s) && !canDecideReview(s) && !physioExaminer) return null;
    const specialties: readonly string[] = canCreateReview(s)
      ? [...REVIEW_SERVICE_TYPES, PHYSIO_EXAM_REQUEST_SERVICE]
      : [...(canDecideReview(s) ? await reviewSpecialtiesFor(s.userId) : []),
         ...(physioExaminer ? [PHYSIO_EXAM_REQUEST_SERVICE] : [])];
    return await store.listReturnedRequests({ branchIds: branchScope(req), specialties });
  };
  app.get("/api/medical-review/returned", isAuthenticated, async (req: Req, res) => {
    try {
      const rows = await returnedFor(req);
      if (rows === null) return res.status(403).json({ error: "غير مصرح" });
      //  **اختصاصاتُ المعاينة لصاحب الجلسة** (§4.bt) — فلا تظهر «كتابة معاينة» على صفّ اختصاصٍ تردّه
      //  نقطةُ المعاينة ٤٠٣. القائمةُ نفسُها تُظهر الاختصاصين لمن يُرسل الطلبات.
      const s = getSession(req);
      const examSpecialties = await medical.doctorSpecialties(s.userId);
      //  **أقسامُ «تحويل إلى …» لكلّ صفّ من الخادم** (§4.gu، مراجعةُ ما بعد البناء): بقاعدة `transferTargets` **وفرعِ الحركة نفسِه**
      //  الذي يحسمه «طلب معاينة جديدة» (`resolveActingBranchId` بنطاق الكتابة) — فلا يظهر زرُّ «علاج طبيعي» لمسؤولٍ في «كل الفروع»
      //  على مريضٍ فرعُه بلا علاجٍ طبيعيّ ثمّ يُردّ عند الإرسال. ولمن يُرسل الطلبات وحده.
      const mayTransfer = canCreateReview(s);
      const offering = mayTransfer ? await physioOfferingBranchIds() : new Set<number>();
      const scope = s?.isAdmin ? null : s?.branchId ? [Number(s.branchId)] : [];
      const withTargets = [];
      for (const r of rows) {
        let targets: string[] = [];
        if (mayTransfer) {
          const patientBranchIds = await patientBranchIdsOf({ id: r.patientId, branchId: r.patientBranchId });
          const acting = resolveActingBranchId({
            scope, sessionBranchId: s?.branchId ?? null, homeBranchId: r.patientBranchId, patientBranchIds,
          });
          targets = transferTargets(r.serviceType, acting !== null && offering.has(acting));
        }
        withTargets.push({ ...r, transferTargets: targets });
      }
      res.json({ rows: withTargets, examSpecialties });
    } catch (err: any) {
      console.error("[medical-review] returned list failed:", err);
      res.status(500).json({ error: "تعذّر تحميل المُرجَعين" });
    }
  });
  app.get("/api/medical-review/returned/count", isAuthenticated, async (req: Req, res) => {
    try {
      const rows = await returnedFor(req);
      res.json({ count: rows === null ? 0 : rows.length });
    } catch (err: any) {
      console.error("[medical-review] returned count failed:", err);
      res.status(500).json({ error: "تعذّر تحميل العدد" });
    }
  });

  // ── «إلغاء المعاينة» من قائمة المُرجَعين — للطبيب ──────────────────────
  //  **لماذا بابٌ خاصّ** (واقعةُ المالك ٢٠٢٦-٠٩-٣٠، طيبه حسن ضمد): نقطةُ
  //  «معايناتي» (`/api/medical/worklist/cancel-request`) تسحب حلقةً تنتظر أو طلباً
  //  معلَّقاً — والمُرجَعُ ليس أيّاً منهما حين لا حلقةَ تنتظر له، فكانت تردّ
  //  «لا يوجد طلبُ معاينةٍ قابلٌ للإلغاء». فهنا:
  //  • حلقةٌ تنتظر ⟵ **الدالّةُ نفسُها** `cancelExamRequest` بحرفها.
  //  • وإلّا ⟵ الطلبُ المُرجَع يُسحَب (`cancelled`) بالكتابة القانونية نفسِها
  //    (`cancelScaffoldRequestsById`): **قرارُ الطبيب وسببُه يبقيان**، ويُلحَق
  //    سطرٌ بمَن سحب ولماذا. لا حلقةَ ولا مالَ يُمَسّ.
  //  والصفُّ يُقرأ من القائمة نفسِها بنطاق الجلسة — فلا يُسحَب ما لا يراه.
  //  ══ **والاستعلاماتُ يُلغيه أيضاً** (§4.gu — قرارُ المالك ٢٠٢٦-١١-٢٢) ═══════════════════════════════════════════════
  //  «حين أعيد معاينة للاستعلامات يجب أن يتمكّن من إمّا إلغائها أو تحويل المريض» — فالبابُ لمن يُرسل الطلبات (`canCreateReview`)
  //  ولمن يكتب المعاينة، **بسببٍ إلزاميّ**، والكتابةُ نفسُها (`cancelReturnedAndCloseTx`) في معاملةٍ واحدة:
  //  الطلبُ يُسحَب ⟵ **والقسمُ يُغلَق تلقائياً إن صار فارغاً** (`closeCaseIfEmptyTx`)، وإلّا يبقى كما هو.
  app.post("/api/medical-review/requests/:id/close-returned", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    const physioExaminer = (await medical.doctorSpecialties(s.userId)).includes(PHYSIO_EXAM_REQUEST_SERVICE);
    if (!canCreateReview(s) && !canDecideReview(s) && !physioExaminer) return res.status(403).json({ error: "غير مصرح" });
    const requestId = parseInt(String(req.params.id));
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (!Number.isFinite(requestId)) return res.status(400).json({ error: "معرّف غير صالح" });
    if (!reason) return res.status(400).json({ error: "سبب الإلغاء إلزامي" });
    try {
      const rows = await returnedFor(req);
      const row = (rows ?? []).find((r) => r.requestId === requestId);
      if (!row) return res.status(409).json({ error: "تغيّر هذا الطلب — حدّث الصفحة" });
      const actor = { userId: s.userId, userName: s.userName };
      const { cancelReturnedAndCloseTx } = await import("./returned_actions");
      const done = await db.transaction((tx) => cancelReturnedAndCloseTx(tx, {
        requestId, reason, actor, branchIds: branchScope(req),
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
      }));
      res.json({
        ok: true,
        caseClosed: done.caseClosure.closed,
        caseKeptBecause: done.caseClosure.closed ? null : done.caseClosure.keptBecause,
      });
    } catch (err: any) {
      if (err?.name === "CancelExamRequestError") {
        return res.status(err.status ?? 409).json({ error: err.message, code: err.code });
      }
      console.error("[medical-review] close-returned failed:", err);
      res.status(500).json({ error: "تعذّر إلغاء الطلب" });
    }
  });

  // ── «إرجاع للاستعلامات» لصفّ علاجٍ طبيعيٍّ بلا طلبٍ قطّ (§4.gu) ───────────────────────────────────────────────
  //  مريضٌ جديد ينتظر معاينته الأولى بالقاعدة ③ لا طلبَ له يُرجَع — فيُكتب طلبُه مُرجَعاً عند الإرجاع (`returnImplicitPhysioExam`).
  //  والإذنُ كإرجاع الطلب (`/return`) بحرفه: مَن يراجع إشرافياً أو يكتب معاينةَ العلاج الطبيعيّ، **وفي اختصاصه**.
  app.post("/api/medical-review/patients/:id/return-implicit", isAuthenticated, async (req: Req, res) => {
    const s = getSession(req);
    if (!(await liveCanReturnPhysio(s.userId)) || !(await specialtyAllowed(s.userId, PHYSIO_EXAM_REQUEST_SERVICE))) {
      return res.status(403).json({ error: "الإرجاع للمسؤول أو مدير الفرع أو مَن يكتب معاينة العلاج الطبيعي" });
    }
    const patientId = parseInt(String(req.params.id));
    if (!Number.isFinite(patientId)) return res.status(400).json({ error: "معرّف غير صالح" });
    if (String(req.body?.serviceType ?? PHYSIO_EXAM_REQUEST_SERVICE) !== PHYSIO_EXAM_REQUEST_SERVICE) {
      return res.status(400).json({ error: "هذا البابُ لصفّ العلاج الطبيعي بلا طلب — طلبُ الجهاز يُرجَع من زرّه" });
    }
    try {
      const { returnImplicitPhysioExam } = await import("./returned_actions");
      const out = await returnImplicitPhysioExam({
        patientId, reason: req.body?.reason, actor: { userId: s.userId, userName: s.userName },
        branchIds: branchScope(req), ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
      });
      res.json(out);
    } catch (err: any) {
      if (err?.name === "CancelExamRequestError") {
        return res.status(err.status ?? 409).json({ error: err.message, code: err.code });
      }
      console.error("[medical-review] return-implicit failed:", err);
      res.status(500).json({ error: "تعذّر إرجاع الطلب" });
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
    //  **وطلبُ العلاج الطبيعيّ يُرجعه مَن يكتب معاينتَه** (§4.gu) — للعلاج الطبيعيّ وحده.
    const rType = await requestServiceType(parseInt(req.params.id));
    const mayReturn = rType === PHYSIO_EXAM_REQUEST_SERVICE
      ? await liveCanReturnPhysio(s.userId)
      : await liveCanSupervise(s.userId);
    if (!mayReturn) {
      return res.status(403).json({
        error: "الإرجاع فعلٌ إشرافيّ — للمسؤول أو مدير الفرع أو طبيب الاختصاص",
      });
    }
    //  والاختصاصُ هنا كما في البتّ — طبيبٌ لا يُرجع طلبَ اختصاصٍ ليس له.
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
