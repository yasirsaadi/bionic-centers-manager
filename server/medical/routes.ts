// REST endpoints for doctor medical examinations (معاينة الطبيب).
//
// Authorization model:
//   READ  — any authenticated user who can reach the patient's branch. A
//           clinical record is meant to be seen by the whole care team; the
//           protection here is against writing, not reading.
//   WRITE — ONLY a user carrying `canWriteMedicalExam`, and only for a
//           specialty listed in their own `medicalSpecialties`. Admins are NOT
//           exempt: signing a clinical record is a professional act, not an
//           administrative one, so an admin who was never granted the
//           capability cannot sign either.
//   EDIT  — the doctor who SIGNED it, or the responsible manager (admin /
//           branch_manager). Nobody else, not even another doctor holding the
//           same specialty: they file an addendum rather than rewrite a
//           colleague's signature. Editing never destroys — the outgoing
//           version is archived first (see store.reviseExam).
//   EDIT (commercial sub-fields) — narrower than the above, and this is
//           deliberate (CLAUDE.md §4.h). A plain doctor editing their OWN
//           exam keeps FULL clinical authority (diagnosis, findings, chief
//           complaint, plan, notes, prescription/specifications — every
//           medical field) but ZERO commercial authority: legacy
//           `deviceCost`/`proposedExpertUserId`/`priceCorrectionReason`
//           submitted by that author are silently ignored — the stored
//           commercial value is preserved untouched, no price-sync logic
//           runs, nothing about the follow-up or `patients.total_cost` or
//           manufacturing moves — and the clinical part of the SAME request
//           still succeeds normally (never a 400 just because a stale client
//           also sent these). This restriction targets a PLAIN doctor-author
//           only — anyone who is also `isResponsibleManager` (admin or
//           branch_manager) is unaffected by it, exactly as before: the
//           global admin (`session.isAdmin`) keeps the existing, unrestricted
//           historical-correction authority over these fields, and
//           branch_manager keeps exactly the authority it already had here —
//           this task neither widens nor narrows either one.
//   DELETE — does not exist. There is deliberately no such endpoint.
//
// The grant is re-read from the database on every write rather than trusted
// from the session, so revoking a doctor's capability takes effect at once
// instead of at their next login.

import type { Express } from "express";
import { aliasCodesByPatient } from "../patient_code/store";
import { logAudit } from "../accounting/ledger";
import * as store from "./store";
import { DeviceEpisodeError, isDeviceServiceType } from "../device_episodes/store";
import type * as FollowupStore from "../followup/store";
import * as reviewStore from "../medical_review/store";
import { canSuperviseReview } from "@shared/medical_review";
import { cancelledExamIds, isExamCancelled } from "./active_exam";
import { cancelExam, ExamCancelError } from "./cancel_exam";
import { cancelExamRequest, CancelExamRequestError } from "./cancel_exam_request";
import { isMedicalSpecialty, specialtyLabel, type MedicalSpecialty } from "@shared/medical";
import {
  LOCK_CONFLICT_CODE, LOCK_CONFLICT_ERROR, isLockConflictError,
} from "@shared/lock_conflict";

type Req = any;

/**
 * القدرةُ الحيّة على الإرجاع الإشرافيّ — تُقرأ من صفّ المستخدم لا من جلسته،
 * فسحبُ الصلاحية يسري فوراً. ونفسُ قاعدة `medical_review/routes.ts` حرفياً:
 * مسؤولٌ، أو مديرُ فرع، أو طبيبٌ مخوَّل. **ولا تمنح توقيعاً لأحد.**
 */
async function liveCanSuperviseWorklist(userId: number | null): Promise<boolean> {
  if (!userId) return false;
  const { db } = await import("../db");
  const { sql } = await import("drizzle-orm");
  const r = await db.execute<{
    role: string; can: boolean | null; active: boolean | null; admin: boolean | null;
  }>(sql`
    SELECT role, can_write_medical_exam AS can, is_active AS active,
           (role = 'admin') AS admin
      FROM system_users WHERE id = ${userId}
  `);
  const u = (r.rows ?? [])[0];
  if (!u || u.active === false) return false;
  return canSuperviseReview({
    role: String(u.role), isAdmin: Boolean(u.admin),
    permissions: { canWriteMedicalExam: Boolean(u.can) },
  });
}

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

/** Branch IDs the caller may read. `null` = admin, i.e. every branch. */
import { scopeReachesPatient, patientBranchIdsOf } from "../patients/branch_access";
import { pickBareExamBranch } from "./exam_branch";

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

/**
 * **صاحبُ المعاينة يصل معاينتَه ما دام يصل ملفَّ مريضها** (٢٠٢٦-٠٩-٢٤).
 *
 * الحارسُ على الصفّ فرعُ المعاينة (`canReachBranch`)، ويبقى كما هو لكلّ أحد.
 * لكنّ معاينةً نُسبت قبل هذا الإصلاح لفرعٍ لا يصله موقِّعُها (إرسالٌ من فرعٍ
 * آخر في ٤٠٩، أو طبيبُ الفرع المُتاح منذ ٠٨٠) كانت تحبس صاحبَها عن تعديلها
 * وملحقها وإلغائها — **توقيعُه باسمه ولا يصله**. فيمرّ صاحبُها وحدَه متى وصل
 * ملفَّ المريض (فرعُ التسجيل أو إتاحةٌ صريحة).
 *
 * **ولا يتّسع لغيره**: طبيبٌ آخر يبقى على فرع المعاينة، **والمديرُ المسؤولُ
 * كذلك ولو كان صاحبَها** — إذنُه الإداريّ (ومنه تصحيحُ السعر بعد البيع) لا
 * يُنال من بابٍ سريريّ.
 */
async function reachesExam(
  req: Req, exam: { branchId: number | null; doctorId: number | null; patientId: number },
): Promise<boolean> {
  if (canReachBranch(req, exam.branchId)) return true;
  const s = getSession(req);
  if (s.isAdmin || s.role === "branch_manager") return false;
  if (exam.doctorId === null || s.userId === null || exam.doctorId !== s.userId) return false;
  const patient = await store.getPatientScope(exam.patientId);
  return patient !== null && await scopeReachesPatient(branchScope(req), patient);
}

/** Trim to null so a whitespace-only field never counts as clinical content. */
function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * شكلُ مفتاح تطابقِ الإنشاء المقبول (migration 074) — رمزٌ يولّده العميلُ
 * (`crypto.randomUUID()` عادةً)، لا نصٌّ حرّ. طولٌ معقول وحروفٌ آمنة فقط.
 * **لا تحقّقَ من صيغة UUID حرفياً عمداً** — الشرطُ الحقيقيّ تفرّدُه في
 * القاعدة لا شكلُه هنا، فمولّدٌ بديل مستقبلاً لا ينكسر على هذا الفحص.
 */
/**
 * ردُّ خطأ هويّة الجهاز — الرمزُ والمرشَّحون للشاشة (تدقيق ٢٠٢٦-٠٩-١٢).
 *
 * `device_episode_ambiguous` يحمل المرشَّحين فتعرضهم النافذةُ ويختار الطبيبُ
 * صراحةً؛ و`device_episode_stale` يعني «حدّث الصفحة». وكلاهما ٤٠٩ لا ٥٠٠
 * — حالةُ عملٍ لا عطبُ نظام.
 */
function replyEpisodeError(res: any, err: DeviceEpisodeError) {
  return res.status(err.status).json({
    error: err.message,
    code: (err as any).code ?? "device_episode_error",
    candidates: (err as any).candidates ?? undefined,
  });
}

/**
 * **خاسرُ السباق عند فحص حالة الجهاز — إعادةُ إرسالٍ لا رفض** (٢٠٢٦-٠٩-١٧).
 *
 * ══ العلّة ════════════════════════════════════════════════════════════
 * طلبان متطابقان بنفس مفتاح التطابق. الأوّلُ يلتزم **بين** فحصِ التطابق
 * السريع في النقطة و`resolveExamEpisode` بعده مباشرةً. فيقرأ الثاني
 * `medical_exams` ولا يجد صفّاً (الفائزةُ لم تلتزم بعد)، ثمّ يقرأ الجهازَ
 * فيجده `examined` — فيُردّ **٤٠٩ `device_episode_stale`** («تغيّرت حالة
 * طلب الجهاز») **قبل أن يبلغ `createExam` أصلاً**، فلا يمرّ بحزامِ إعادة
 * الإرسال الذي هناك. وهو بعينه ما كان يُفشل البندين أ١/أ٢ في
 * `server/medical_exam_idempotency.test.ts` بمعدّل ٦ من ١٤ تشغيلة.
 *
 * ══ والعلاجُ إعادةُ تحقّقٍ بالقاعدة الصارمة القائمة، لا تخفيفُها ═══════
 * `findReplayableExam` **لم يتغيّر فيها حرف**: نفسُ المفتاح، ونفسُ مطابقة
 * الهويّة والمحتوى معاً. فإن وُجدت المعاينةُ المطابقة تُعاد كما هي **بصفر
 * كتابة** — لا تدقيقَ ثانٍ ولا متابعةَ ثانية ولا لمسَ جهازٍ آخر. وإلّا
 * **يبقى الرفضُ الأصليُّ كما هو**: لا صفَّ بهذا المفتاح (`null`)، أو صفٌّ
 * بهويّةٍ أو محتوًى مختلف (تعارض) — كلاهما ⟶ يُردّ البياتُ بحرفه.
 *
 * ══ **وهويّةُ الخيط قد تكون بائتةً هنا أيضاً** (٢٠٢٦-٠٩-١٨) ════════════
 * تصحيحُ نوع طلبٍ إلى اختصاصٍ **لا خيطَ له على الملفّ بعد** يفتح الخيطَ
 * الهدفَ **داخل معاملة التوقيع** (٤.y، تكملةٌ ثانية). فمحاولتان بنفس
 * المفتاح تبدآن كلتاهما و`caseId = null` — لا لأن الطلبَ بلا خيط، بل لأن
 * خيطَه لم يكن قد وُلد بعد حين قرأتاه. فالفائزةُ تفتحه وتكتب المعاينةَ
 * عليه، والخاسرةُ تبلغ هذا المخرجَ بهويّةٍ بائتة فتُقرأ «هويّةٌ مختلفة»
 * ويُردّ ٤٠٩ على إعادةِ إرسالٍ مشروعةٍ تماماً.
 *
 * **وهو الشكلُ الذي يعالجه `store.replayAfterLostRace` أصلاً** في مسار
 * الخسارة الآخر (داخل `createExam`)، فيُنادى هنا **هو بعينه** — لا نسخةٌ
 * ثانية من قاعدة تحديث الهويّة في النقطة. وشروطُه هي هي، بلا تخفيف:
 * `caseId === null` · **نيّةُ تصحيحٍ صريحة** (`retypeEpisode === true`،
 * تُمرَّر من راية الطلب لا تُستنتَج) · **وعمليةُ جهازٍ بعينها بالمعرّف**.
 * ثمّ يُعاد **`findReplayableExam` الصارمةُ نفسُها** على الهويّة المقروءة
 * من صفّ تلك العملية — فمريضٌ آخر أو طبيبٌ آخر أو فرعٌ آخر أو اختصاصٌ آخر
 * أو عمليةٌ أخرى أو محتوًى مختلف **يبقى تعارضاً كما هو اليوم**.
 *
 * وهذا المسارُ لا يُنادى إلّا على `ExamEpisodeStaleError` وحدها: الالتباسُ
 * (`device_episode_ambiguous`) وفرعُ الجهاز (`device_episode_branch`)
 * يُردّان كما كانا — ليسا شكلَ سباقٍ على مفتاحٍ واحد.
 */
async function replayAfterStaleEpisode(
  idempotencyKey: string,
  expected: Parameters<typeof store.replayAfterLostRace>[1],
) {
  try {
    return await store.replayAfterLostRace(idempotencyKey, expected);
  } catch (err) {
    //  تعارضٌ حقيقيّ (مفتاحٌ لطلبٍ آخر) ⟶ يبقى الرفضُ الأصليّ. وأيُّ خطأٍ
    //  غيرِ متوقَّع يصعد كما هو — لا يُبتلَع في رفضٍ يخفيه.
    if (err instanceof store.ExamIdempotencyConflictError) return null;
    throw err;
  }
}

function isValidIdempotencyKey(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(v);
}

/**
 * ══ **مقصورتان على تعديل معاينةٍ موقّعة سلفاً — لا على توقيع معاينةٍ جديدة** ═
 *
 * الطبيبُ لم يعد يكتب سعراً ولا خبيراً عند التوقيع: `POST .../exams` أدناه
 * لا يقرأ `deviceCost` ولا `proposedExpertUserId` من الجسم إطلاقاً، مهما
 * وصل فيه. وما بقي لهاتين الدالّتين مسارٌ إداريٌّ ضيّقٌ واحد على
 * `PATCH /api/medical/exams/:examId`: تصحيحُ رقمٍ كتبه طبيبٌ **يوماً**، على
 * معاينةٍ **قديمة** ما زالت تحمله من قبل هذا التبسيط. والمنطقُ الماليُّ
 * المرتبط بذلك التصحيح (`classifyExamPriceChange` وما بعدها) يبقى كما هو
 * بالضبط — بلا إعادة بناء — تحسّباً لإعادة استعماله في مرحلة الاستعلامات
 * القادمة (انظر ملاحظة `deviceCost`/`proposedExpertUserId` في نقطة PATCH).
 */
async function parseProposedExpert(
  raw: unknown,
  caseType: string,
  branchId: number | null,
): Promise<number | null> {
  if (caseType !== "prosthetic" && caseType !== "medical_support") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return (await store.isExpertInBranch(n, branchId)) ? Math.round(n) : null;
}

function parseDeviceCost(raw: unknown, caseType: string): number | null {
  if (caseType !== "prosthetic" && caseType !== "medical_support") return null;
  const n = typeof raw === "string" ? Number(raw.replace(/,/g, "")) : Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

/**
 * Land the doctor's decision on the patient's record, in the order the rest of
 * the app depends on:
 *
 *   1. the prescription (which CREATES the case when the doctor decides a
 *      specialty the patient had none for),
 *   2. the superseded device case is retired — reception's initial pick was a
 *      guess and the doctor's decision replaces it, so nothing is left hanging
 *      in the pending badge.
 *
 * The device price is deliberately NOT applied here. It stays on the exam as a
 * proposal until reception confirms it in «تخصيص وإسناد خبير» — the one save
 * that puts a device sale into the books (case cost + patients.total_cost). A
 * patient who walks out without paying therefore leaves the accounts untouched.
 *
 * Every step is isolated: a signed clinical record must never be undone by a
 * bookkeeping failure downstream, so problems are logged and reported, not
 * thrown.
 */
async function applyDecision(
  patientId: number,
  caseType: MedicalSpecialty,
  prescription: Record<string, any>,
  /**
   * **الخيطُ الذي غادره الطلبُ حين صُحِّح نوعُه** (٤.y) — يأتي من
   * `createExam` بعد التزامها. غيابُه يعني «لا تصحيحَ وقع»، فلا تُنادى
   * دالّةُ التنظيف إطلاقاً ويبقى المسارُ القديم بحرفه.
   */
  retypedFromCaseType?: string | null,
): Promise<{ switchNote?: string }> {
  let switchNote: string | undefined;

  // Read the device cases BEFORE anything is applied — once the prescription
  // has run, the new case exists and a change is indistinguishable from an
  // addition.
  let deviceTypesBefore: string[] = [];
  try {
    deviceTypesBefore = await store.deviceCaseTypes(patientId);
  } catch (err) {
    console.error("[medical] reading device cases failed:", err);
  }

  try {
    await store.applyPrescription(patientId, caseType, prescription);
  } catch (err) {
    console.error("[medical] applying prescription to case failed:", err);
  }

  try {
    const result = await store.retireSupersededCase(patientId, caseType, deviceTypesBefore);
    if (result.reason) {
      switchNote = `بقيت الحالة السابقة مفتوحة: ${result.reason}`;
    }
  } catch (err) {
    console.error("[medical] retiring superseded case failed:", err);
  }

  // ══ **وأثرُ الخطأ التشغيليّ يُرفَع مع الطلب الذي صُحِّح** (٤.y) ═════════
  //  تصحيحُ النوع ينقل الطلبَ بهويّته إلى الخيط الصحيح، فيبقى الخيطُ القديم
  //  على الملفّ فارغاً — تصنيفاً وحالةً وشارةَ انتظار — أثراً لخطأِ إدخالٍ
  //  لا لخدمةٍ يحتاجها المريض. وحُرّاسُ الدالّة (طلبٌ باقٍ · كلفة · الثمانيةُ
  //  القائمة) هي ما يمنع أن يمسّ هذا عمليةً مستقلّةً حقيقية.
  //
  //  **وفشلُه لا يُسقط توقيعاً ثبت**: المعاينةُ التزمت قبل هذا السطر.
  const retypedFrom = retypedFromCaseType ?? null;
  if (retypedFrom && retypedFrom !== caseType) {
    try {
      const cleaned = await store.retireRetypedSourceCase(
        patientId, retypedFrom as MedicalSpecialty,
      );
      if (cleaned.reason) {
        switchNote = `بقيت الحالة السابقة مفتوحة: ${cleaned.reason}`;
      }
    } catch (err) {
      console.error("[medical] retiring retyped source case failed:", err);
    }
  }

  return { switchNote };
}

/**
 * **مَن يُلغي معاينةً موقّعة** — نفسُ طرفَي «تعديل» بلا توسيعٍ ولا دورٍ جديد.
 *
 * صاحبُ المعاينة، أو المديرُ المسؤول (مسؤولٌ عام / مديرُ فرع). وطبيبٌ آخر
 * — ولو حمل الاختصاص نفسه — **لا يسحب توقيع زميله**؛ فذلك سجلٌّ باسم غيره.
 * والاستقبالُ والمحاسبُ والخبير ليسوا منهم إطلاقاً.
 *
 * ونطاقُ الفرع يُفرَض فوق هذا في النقطة (`canReachBranch`) — هذه تقول
 * «أيملك هذه القدرة؟»، والنطاقُ يقول «على أيّ الصفوف؟».
 *
 * ══ والاختصاصُ يُقرأ حيّاً، لا كما كان يوم التوقيع ═══════════════════════
 * `specialties` هي **اختصاصاتُ الطالب الآن** من القاعدة (`doctorSpecialties`)
 * لا من جلسته. فصاحبُ المعاينة يُلغيها بشرطين معاً:
 *   ١) أن يبقى طبيباً — قائمةٌ غيرُ فارغة هي `canWriteMedicalExam` حرفياً؛
 *   ٢) وأن يبقى اختصاصُ **هذه المعاينة بعينها** ضمن اختصاصاته.
 *
 * وبلا الشرط الثاني كان طبيبُ العلاج الطبيعي — بعد أن سُحب منه اختصاصُ
 * الأطراف — يظلّ قادراً على سحب توقيعٍ لم يعد يملك أن يكتب مثلَه. وسحبُ
 * المنح يجب أن يسري فوراً في **كلا** الاتجاهين: لا يكتب، ولا يمحو.
 *
 * والمديرُ المسؤول خارج هذا الشرط: إذنُه إداريٌّ لا سريريّ، فلا يُطلَب منه
 * اختصاصٌ طبّيٌّ ليمارس إشرافَه — كما لا يُطلَب منه ليوقّع (وهو لا يوقّع).
 */
function mayCancelExam(
  session: { userId: number | null; isAdmin: boolean; role: string },
  exam: { doctorId: number | null; caseType: string | null },
  specialties: readonly MedicalSpecialty[],
): boolean {
  if (session.isAdmin || session.role === "branch_manager") return true;
  if (exam.doctorId === null || exam.doctorId !== session.userId) return false;
  //  قائمةٌ فارغة = لم يعد طبيباً أصلاً (أو عُطّل حسابُه) ⇒ لا يلغي شيئاً.
  if (specialties.length === 0) return false;
  return isMedicalSpecialty(exam.caseType) && specialties.includes(exam.caseType);
}

export function registerMedicalRoutes(app: Express, isAuthenticated: any) {
  // ── The current user's doctor grant ──────────────────────────────────────
  // The UI asks this to decide whether to offer the "معاينة جديدة" button and
  // which specialties to put in its dropdown.
  app.get("/api/medical/me", isAuthenticated, async (req: Req, res) => {
    try {
      const { userId } = getSession(req);
      const specialties = await store.doctorSpecialties(userId);
      res.json({ canWriteMedicalExam: specialties.length > 0, specialties });
    } catch (err: any) {
      console.error("[medical] GET /me failed:", err);
      res.status(500).json({ error: "تعذّر قراءة صلاحية المعاينة" });
    }
  });

  // ── One patient's clinical thread ────────────────────────────────────────
  app.get("/api/medical/patients/:patientId/exams", isAuthenticated, async (req: Req, res) => {
    try {
      const patientId = Number(req.params.patientId);
      if (!Number.isFinite(patientId)) {
        return res.status(400).json({ error: "معرّف مريض غير صالح" });
      }

      const patient = await store.getPatientScope(patientId);
      if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
      if (!(await scopeReachesPatient(branchScope(req), patient))) {
        return res.status(403).json({ error: "لا يمكنك الاطّلاع على مرضى فرع آخر" });
      }

      const session = getSession(req);
      const [allExams, pending, specialties, awaitingEpisodes] = await Promise.all([
        store.getExamsByPatient(patientId),
        store.getPendingForPatient(patientId),
        store.doctorSpecialties(session.userId),
        //  **الأجهزةُ المنتظرةُ المعاينةَ بهويّتها** — لمنتقي النافذة حين
        //  تُفتح من صفحة المريض لا من صفّ «معايناتي».
        store.awaitingEpisodesForPatient(patientId),
      ]);
      //  **الملغاةُ لا تُعرَض في السجلّ الفعّال** (ترحيل ٠٦١): الشاشةُ
      //  السريرية تقول «ما حالُ هذا المريض»، ومعاينةٌ أُلغيت ليست حالَه.
      //  وهي محفوظةٌ كاملةً في القاعدة وفي `audit_log` لمن يدقّق.
      const cancelledIds = await cancelledExamIds(allExams.map((e) => e.id));
      const exams = allExams.filter((e) => !cancelledIds.has(e.id));

      // Superseded versions, grouped onto their exam. Read by everyone: the
      // history is the reason editing is safe, so hiding it would defeat it.
      const revisions = await store.getRevisions(exams.map((e) => e.id));
      const byExam: Record<number, typeof revisions> = {};
      for (const r of revisions) (byExam[r.examId] ||= []).push(r);

      // A PURE prosthetics expert is financially locked out everywhere else in
      // the app; the exam carries a device price now, so strip it for them
      // rather than let the clinical record become a side channel to it.
      const hideMoney = session.role === "prosthetics_expert";
      const scrub = <T extends { deviceCost?: number | null }>(row: T): T =>
        hideMoney ? { ...row, deviceCost: null } : row;

      // Resolve the suggested experts' names once, so the card and reception's
      // dialog can show a person rather than an id.
      const expertNames = await store.userNames(
        exams.map((e) => e.proposedExpertUserId).filter((n): n is number => typeof n === "number"),
      );

      //  **أيُّ معاينةٍ لها عمليةُ جهاز** — بالرابط الذي كتبه التوقيع.
      //  بطاقةُ المعاينة أحدُ أبواب التصحيح الإداريّ الثلاثة، ومعاينةٌ
      //  سريريةٌ بلا متابعة (علاجٌ طبيعي مثلاً) ليست عمليةً تُصحَّح.
      const followupOfExam = await store.followupIdsForExams(exams.map((e) => e.id));

      res.json({
        exams: exams.map((e) => ({
          ...scrub(e),
          proposedExpertName: e.proposedExpertUserId != null
            ? expertNames[e.proposedExpertUserId] ?? null
            : null,
          revisions: (byExam[e.id] ?? []).map(scrub),
          //  **مَن يجوز له الإلغاء — يقوله الخادم لا تخمّنه الشاشة.**
          //  نفسُ قاعدة «تعديل» حرفياً: صاحبُ المعاينة أو المدير المسؤول.
          //  وطبيبٌ آخر — ولو بنفس الاختصاص — لا يسحب توقيع زميله.
          //
          //  **وبالدالّة نفسِها التي تحرس النقطة** وباختصاصات الطالب التي
          //  قُرئت مرّةً واحدة أعلاه — لا استعلامَ لكلّ معاينة، ولا قاعدةَ
          //  ثانية تنحرف. فزرُّ «حذف» لا يظهر حيث كان الخادمُ سيردّ ٤٠٣.
          canCancel: mayCancelExam(
            session,
            { doctorId: e.doctorId ?? null, caseType: e.caseType ?? null },
            specialties,
          ),
          //  هويّةُ العملية التي يفتح بها زرُّ «تصحيح / إلغاء العملية»
          //  نافذتَه — و`null` تعني «لا عمليةَ هنا» فلا يظهر الزرّ.
          reversalFollowupId: followupOfExam[e.id] ?? null,
        })),
        pending, // active specialties with no exam yet → "بانتظار معاينة"
        //  **الأجهزةُ المنتظرةُ بهويّتها** (تدقيق ٢٠٢٦-٠٩-١٢): تعرضها نافذةُ
        //  المعاينة منتقياً — واحدةٌ تُنتقى تلقائياً، وأكثرُ تُختار صراحةً.
        awaitingEpisodes,
        canWriteMedicalExam: specialties.length > 0,
        specialties,
        // Who may press "تعديل" — the author, or the responsible manager. Sent
        // from the server so the UI can never offer an action the server would
        // then refuse.
        canManageExams: session.isAdmin || session.role === "branch_manager",
        userId: session.userId,
        // Registered before the exam system went live ⇒ exempt from the exam
        // requirement (تخصيص unlocks, reception enters the cost directly).
        legacyExempt: await store.isLegacyPatient(patientId),
      });
    } catch (err: any) {
      console.error("[medical] GET exams failed:", err);
      res.status(500).json({ error: "تعذّر تحميل المعاينات" });
    }
  });

  // ── Sign a new exam ──────────────────────────────────────────────────────
  app.post("/api/medical/patients/:patientId/exams", isAuthenticated, async (req: Req, res) => {
    try {
      const patientId = Number(req.params.patientId);
      if (!Number.isFinite(patientId)) {
        return res.status(400).json({ error: "معرّف مريض غير صالح" });
      }

      const session = getSession(req);
      const specialties = await store.doctorSpecialties(session.userId);
      if (specialties.length === 0) {
        return res.status(403).json({ error: "المعاينة الطبية يكتبها الطبيب فقط" });
      }

      const caseType = req.body?.caseType;
      if (!isMedicalSpecialty(caseType)) {
        return res.status(400).json({ error: "اختصاص المعاينة غير صالح" });
      }
      if (!specialties.includes(caseType)) {
        return res
          .status(403)
          .json({ error: `لا تملك صلاحية المعاينة في اختصاص ${specialtyLabel(caseType)}` });
      }

      // ══ **هويّةُ الجهاز الذي تُعاينه هذه المعاينة** (تدقيق ٢٠٢٦-٠٩-١٢) ═══
      //  يصل من صفّ «معايناتي» أو من منتقي النافذة. اختياريٌّ لتوافق عميلٍ
      //  قديم، **لكنّ شكلَه إن حضر يُشترَط** — معرّفٌ مشوَّه يُردّ ٤٠٠ لا
      //  يسقط صامتاً إلى «بلا معرّف» فيصير تخميناً.
      const rawEpisode = req.body?.deviceEpisodeId;
      let deviceEpisodeId: number | null = null;
      if (rawEpisode !== undefined && rawEpisode !== null && rawEpisode !== "") {
        const n = typeof rawEpisode === "number" || typeof rawEpisode === "string"
          ? Number(rawEpisode) : NaN;
        if (!Number.isInteger(n) || n <= 0) {
          return res.status(400).json({ error: "معرّف الجهاز غير صالح", code: "device_episode_invalid" });
        }
        deviceEpisodeId = n;
      }

      // ══ **تصحيحُ نوع الطلب — نيّةٌ صريحة لا استنتاج** (٤.y) ══════════════
      //  الاستعلاماتُ تفتح الطلبَ بنوعٍ تخمّنه، والطبيبُ يصحّحه على الصفّ
      //  الذي وصله. فحين يبدّل الاختصاص، تُرسل الشاشةُ **معرّفَ الطلب نفسِه**
      //  ومعه هذه الراية — فيُصحَّح هو ولا يُختطف طلبٌ مستقلٌّ آخر من النوع
      //  الجديد. **وإسقاطُ المعرّف ليس حلّاً**: التوقيعُ بلا هويّة يلتقط
      //  «الوحيدةَ المنتظرة» وقد تكون جهازاً لم ينظر فيه الطبيب.
      //
      //  **وشكلُها يُشترَط**: قيمةٌ ليست بوليانياً تُردّ ٤٠٠ ولا تُقرأ صدقاً
      //  ولا كذباً. **ولا تُقرأ بلا معرّف**: رايةُ تصحيحٍ بلا هويّة الطلب
      //  المقصود تفتح البابَ الذي جاءت لتغلقه.
      const rawRetype = req.body?.retypeDeviceEpisode;
      if (rawRetype !== undefined && rawRetype !== null && typeof rawRetype !== "boolean") {
        return res.status(400).json({
          error: "قيمة تصحيح نوع الطلب غير صالحة", code: "retype_flag_invalid",
        });
      }
      const retypeDeviceEpisode = rawRetype === true;
      if (retypeDeviceEpisode && deviceEpisodeId === null) {
        return res.status(400).json({
          error: "تصحيح نوع الطلب يحتاج معرّف الطلب المقصود — أعد فتح النافذة",
          code: "retype_without_episode",
        });
      }

      const patient = await store.getPatientScope(patientId);
      if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
      if (!(await scopeReachesPatient(branchScope(req), patient))) {
        // Name both sides: a bare "another branch" left the doctor guessing
        // why a save he had every right to make was refused.
        const names = await store.branchNames();
        const mine = branchScope(req)?.map((b) => names[b] ?? `#${b}`).join("، ") || "لا شيء";
        return res.status(403).json({
          error: `المريض في فرع ${names[patient.branchId ?? -1] ?? "غير معروف"} وحسابك على فرع ${mine} — راجع المسؤول لإضافة الفرع لحسابك`,
        });
      }

      const body = {
        chiefComplaint: clean(req.body?.chiefComplaint),
        clinicalFindings: clean(req.body?.clinicalFindings),
        diagnosis: clean(req.body?.diagnosis),
        plan: clean(req.body?.plan),
        notes: clean(req.body?.notes),
      };

      // The structured clinical decision. Sealed into the exam row alongside
      // the narrative, so what the doctor prescribed is as unalterable as what
      // they wrote — and attributable to them rather than to whoever typed it
      // into the patient file afterwards.
      const prescription =
        req.body?.prescription && typeof req.body.prescription === "object"
          ? (req.body.prescription as Record<string, any>)
          : {};

      // A signed record must actually say something — either half counts: a
      // narrative, or a prescription on its own, since specifying the device IS
      // a clinical decision even with no prose around it.
      const hasNarrative = Object.values(body).some((v) => v !== null);
      const hasPrescription = Object.values(prescription).some((v) =>
        Array.isArray(v)
          ? v.some((row: any) => row && Object.values(row).some((x) => x !== "" && x !== 0))
          : typeof v === "string" && v.trim().length > 0,
      );
      if (!hasNarrative && !hasPrescription) {
        return res.status(400).json({ error: "لا يمكن حفظ معاينة فارغة" });
      }

      // ══ مفتاحُ تطابقِ الإنشاء (migration 074) — إلزاميّ ═══════════════════
      //  حادثةُ سبع معاينات لطلبٍ واحد (٢٠٢٦-٠٩) لم يكن لها حارسٌ من أيّ نوع:
      //  لا مفتاحَ طلب، ولا قيدَ قاعدة، وزرُّ الحفظِ المعطَّل أثناء الإرسال
      //  وحده — لا يصمد أمام إعادة إرسالٍ شبكيّة أو ضغطتين متزامنتين.
      //  فصار المفتاحُ إلزامياً هنا: **غيابُه أو فسادُ شكله يُردّ صراحةً**،
      //  لا يسقط صامتاً إلى سلوكٍ غير تطابقيّ — عميلٌ قديم لا يرسله يُطلَب
      //  منه صراحةً إعادة تحميل النافذة، لا أن يُخاطَر بصفٍّ مكرَّر باسمه.
      const idempotencyKey = req.body?.idempotencyKey;
      if (!isValidIdempotencyKey(idempotencyKey)) {
        return res.status(400).json({
          error: "أعد فتح نافذة المعاينة وحاول مجدداً",
          code: "idempotency_key_required",
        });
      }

      // ══ فحصٌ سريع **قبل** أيّ منطقٍ سريريّ ═══════════════════════════════
      //  إعادةُ إرسالٍ عاديّة بعد أن التزمت المحاولةُ الأولى فعلاً (الحالةُ
      //  الشائعة، لا السباقُ النادر) يجب أن تتوقّف هنا — **قبل** استدعاء
      //  `applyDecision` — وإلا أعادت كتابةَ نفس القيم على ملفّ المريض بلا
      //  داعٍ في كلّ إعادة إرسال. `createExam` تحمل حزاماً ثانياً للسباق
      //  الحقيقيّ الذي يفلت من هذا الفحص (انظر تعليقها).
      //
      //  ══ والهويّةُ تُقرأ هنا أيضاً — لا المحتوى وحده (تصحيحٌ لاحق) ══════
      //  قراءةٌ مسبَّقة خفيفة لحالة المريض/الاختصاص (`findCaseFor` بلا أثرٍ
      //  جانبيّ) تُعطي `caseId`/`branchId` **قبل** أن يخلقهما `applyDecision`
      //  — فتُقارَن هويّةُ أيّ صفٍّ سابقٍ بهذا المفتاح بما يملكه الخادم فعلاً
      //  (المريضُ من الرابط، الطبيبُ من الجلسة، الفرعُ والحالةُ من القاعدة)
      //  لا بمحتوًى قد يتطابق صدفةً بين مريضين. وحين يكون الطلبُ الأصليّ
      //  قد أنشأ الحالةَ للتوّ (لم تكن موجودة قبله)، هذه القراءةُ **تجدها**:
      //  الحالةُ صفٌّ قائمٌ الآن في القاعدة، لا لقطةٌ محلّية بائتة.
      const earlyCaseRow = await store.findCaseFor(patientId, caseType as MedicalSpecialty);
      //  ══ **فرعُ العملية — فرعُ الحلقة حين يُطلَب جهازٌ بعينه** ═══════════
      //  الجهازُ عملٌ له فرعُه، ونقلُ مسؤوليته (٠٨٠) ينقله. فيُقرأ هنا **قبل**
      //  فحص التطابق ليتّسق ما يُقارَن مع ما سيُخزَّن — وإلّا قرأت إعادةُ
      //  إرسالٍ مشروعة «تعارضاً» لأن الصفَّ المحفوظ يحمل فرعَ الحلقة والطلبُ
      //  يتوقّع فرعَ التسجيل.
      //
      //  ══ **وبلا حلقة: فرعُ مَن أرسل المريضَ لهذه المعاينة** (٢٠٢٦-٠٩-٢٤) ══
      //  كانت المعاينةُ العاريةُ تُنسَب لفرع الحالة/التسجيل وحده — فمريضةٌ
      //  أرسلها الفرعُ المُتاحُ له ملفُّها (شكوى «زهراء») وُلدت متابعةُ قرار
      //  شرائها في طابور فرع التسجيل، لا حيث تقف. فصار يُقرأ الطلبُ الذي
      //  سيُغلقه هذا التوقيعُ (`referringRequestBranch` — مجموعةُ الإغلاق
      //  نفسُها، وثابتٌ عند إعادة الإرسال)، **بشرطِ أن يصل فرعُه الملفَّ الآن**.
      //
      //  ══ **وأن يصله الطبيبُ الموقِّع** (مراجعةٌ مستقلّة على ٤٠٩) ════════════
      //  كان الشرطُ الأوّل وحدَه: فبغدادُ ترسل مريضةَ ذي قار ويوقّع طبيبُ ذي
      //  قار، فتُكتب المعاينةُ في بغداد — ويُردّ هو ٤٠٣ على تعديلها وملحقها
      //  وإلغائها. **والعطبُ نفسُه أقدم**: طبيبُ الفرع المُتاح يوقّع بلا إرسالٍ
      //  فتُنسَب لفرع الحالة الذي لا يصله. فصار الفرعُ **دائماً فرعاً يصله
      //  الموقِّع** بالمفاضلة القائمة نفسِها (`exam_branch.ts`)، والمسؤولُ العام
      //  على ترتيبها السابق بحرفه.
      const operationBranchId =
        (await store.examOperationBranch(patientId, deviceEpisodeId))
        ?? pickBareExamBranch({
          scope: branchScope(req),
          fileBranchIds: await patientBranchIdsOf(patient),
          referralBranchId: deviceEpisodeId === null
            ? await reviewStore.referringRequestBranch({
              patientId, serviceType: caseType, idempotencyKey,
            })
            : null,
          caseBranchId: earlyCaseRow?.branchId ?? null,
          registrationBranchId: patient.branchId ?? null,
          sessionBranchId: session.branchId,
        });
      const replayContent = {
        patientId,
        doctorId: session.userId,
        branchId: operationBranchId,
        caseId: earlyCaseRow?.id ?? null,
        caseType,
        //  والجهازُ من الهويّة حين يحضر: نفسُ المفتاح بجهازٍ آخر تعارضٌ لا إعادة.
        deviceEpisodeId,
        ...body,
        prescription,
      };
      try {
        const replay = await store.findReplayableExam(idempotencyKey, replayContent);
        if (replay) {
          return res.json({ ...replay, switchNote: null, created: false });
        }
      } catch (err) {
        if (err instanceof store.ExamIdempotencyConflictError) {
          return res.status(409).json({ error: err.message, code: "idempotency_conflict" });
        }
        throw err;
      }

      const doctorName = session.userName?.trim() || "طبيب";

      // ══ **بلا مسؤوليةٍ تجارية على الإطلاق** ═══════════════════════════════
      //  الطبيبُ يشخّص ويصف ويوقّع فقط. لا سعرَ ولا خصمَ ولا نوعَ سعرٍ ولا
      //  خبيرَ ولا قرارَ شراء يُقرأ من هذا الجسم — ولو وصل فيه (`deviceCost`،
      //  `proposedExpertUserId`، `commercial`، أو أيّ اسمٍ آخر): يُتجاهَل
      //  تماماً، لا يُقرأ ولا يُتحقَّق منه ولا يُكتب في أيّ صفّ. فعميلٌ قديم
      //  ما زال يرسل هذه الحقول لا يُعطَّل (المعاينةُ تُحفَظ سريرياً كما هي)
      //  ولا يُصدَّق ضمناً (لا أثرَ لِما أرسله).
      //
      //  تلك المسؤوليةُ كلُّها من عمل الاستعلامات بعد المعاينة — بطاقةُ
      //  المريض ونقطةُ `POST /api/followups/:id/commercial`
      //  (`server/followup/routes.ts`) هي البابُ الوحيد لأيّ تفصيلٍ تجاريّ،
      //  **ولم تتغيّر بحرف**: أوّلُ حلقةٍ ماليةٍ تفتحها هذه المعاينةُ
      //  (`ensureFollowupForSignedExam` في `server/followup/store.ts`) تبقى
      //  تُنشَأ **بلا سعرٍ ولا خبير** — `deviceCost`/`proposedExpertUserId`
      //  أدناه يُمرَّران `null` صراحةً، فلا فرقَ بين مريضٍ كان الطبيبُ
      //  ليقترح له سعراً يوماً ومريضٍ آخر، لأن الاقتراحَ لم يعد يصل الخادمَ
      //  إطلاقاً. راجع القسم 4.f/4.b في CLAUDE.md لتفصيل ذلك النظام القائم.

      // ORDER MATTERS. The prescription is applied FIRST, because when the
      // doctor decides a specialty the patient had no case for, applying it is
      // what creates that case. Resolving the case before this step returned
      // null, and the exam was saved permanently orphaned from its own case.
      // ══ هويّةُ الجهاز تُحسم **قبل** أن يُكتب حرفٌ على ملفّ المريض ═══════
      //  `applyDecision` أدناه يكتب الوصفةَ على صفّ المريض. فالالتباسُ
      //  (أكثرُ من طلبِ جهازٍ ينتظر ولم يُحدَّد أيُّها) والبياتُ (جهازٌ محدَّد
      //  لم يعد ينتظر) يُردّان هنا ٤٠٩ **بصفر كتابة** — لا وصفةَ تُطبَّق لطلبٍ
      //  مرفوض. والحَكَمُ الأخير يبقى القفلَ داخل `createExam`.
      let resolvedEpisodeId: number | null;
      let retypeEpisode = false;
      try {
        const resolved = await store.resolveExamEpisode({
          patientId, caseId: earlyCaseRow?.id ?? null, deviceEpisodeId,
          caseType, retype: retypeDeviceEpisode,
        });
        resolvedEpisodeId = resolved.episodeId;
        retypeEpisode = resolved.retype;
      } catch (err) {
        //  **البياتُ هنا قد يكون خسارةَ سباقٍ لا شاشةً بائتة** — الفائزةُ
        //  التزمت بين فحص التطابق أعلاه وهذا الفحص. فيُعاد التحقّق بالمفتاح
        //  نفسِه وبالقاعدة الصارمة نفسِها (`replayAfterStaleEpisode`): تُعاد
        //  المعاينةُ المطابقة بصفر كتابة، وإلّا يبقى الرفضُ كما هو.
        if (err instanceof store.ExamEpisodeStaleError) {
          //  **ونيّةُ التصحيح تُمرَّر صراحةً** — من راية الطلب نفسِها، لا
          //  من `retypeEpisode` المحلّية (لم تُسنَد: المحاولةُ رمت). وهي
          //  أحدُ شروط إعادة قراءة الهويّة الثلاثة، فبلا تمريرها يبقى
          //  المسارُ على الهويّة البائتة كما كان.
          const winner = await replayAfterStaleEpisode(idempotencyKey,
            { ...replayContent, retypeEpisode: retypeDeviceEpisode });
          if (winner) return res.json({ ...winner, switchNote: null, created: false });
        }
        if (err instanceof DeviceEpisodeError) return replyEpisodeError(res, err);
        throw err;
      }

      // ══ الترتيب — **التوقيعُ تحت القفل قبل كتابة الوصفة على الملفّ** ═════
      //  (مراجعة المرحلة الأولى: P1-C1/REF-1/INV-03) كان `applyDecision`
      //  يسبق `createExam`، فطلبٌ يُردّ ٤٠٩ **تحت القفل** (زميلٌ سبق إلى
      //  الحلقة، أو أُلغيت) كان قد كتب وصفتَه على ملفّ المريض بينما السجلُّ
      //  الموقَّع لغيره. فحين تكون الحالةُ قائمةً — وهي كذلك لكلّ طلبِ جهاز —
      //  يُوقَّع أوّلاً ثمّ تُطبَّق الوصفة: رفضٌ تحت القفل = صفرُ كتابة.
      //  وحين لا حالةَ بعد (اختصاصٌ جديد على المريض) يبقى الترتيبُ القديم:
      //  الوصفةُ هي ما يُنشئ الحالة، ولا حلقةَ يمكن أن تتنازع عليها.
      //  **وتصحيحُ النوع يوجب الترتيبَ الآمن دائماً** (٤.y، تكملة): الطلبُ
      //  المقصودُ حلقةٌ حيّةٌ يمكن أن يتنازع عليها زميلٌ، والخيطُ الهدف —
      //  حين لا يوجد — يُفتَح داخل معاملة التوقيع نفسِها لا قبلها. ولو سبقت
      //  `applyDecision` هنا لسحبت الخيطَ القديم بما فيه الطلبُ نفسُه، فينقل
      //  التصحيحُ صفّاً لم يعد موجوداً.
      const caseFirst =
        (earlyCaseRow !== null && earlyCaseRow !== undefined) || retypeEpisode;
      let applied: Awaited<ReturnType<typeof applyDecision>> = {};
      if (!caseFirst) applied = await applyDecision(patientId, caseType, prescription);

      const caseRow = caseFirst
        ? earlyCaseRow
        : await store.findCaseFor(patientId, caseType as MedicalSpecialty);

      //  **والفرعُ الذي يُمرَّر للتوقيع يطابق ما سيُخزَّن**: جهازٌ حُسم هنا بلا
      //  معرّفٍ صريح (المنتظرُ الوحيد) يُسجَّل بفرعه تحت القفل — فيُمرَّر
      //  فرعُه نفسُه، كي لا تُقرأ إعادةُ إرسالٍ خسرت سباقاً «فرعاً مختلفاً».
      //  والصريحُ والعاري كما حُسما أعلاه بحرفهما.
      const createBranchId = resolvedEpisodeId !== null && deviceEpisodeId === null
        ? ((await store.examOperationBranch(patientId, resolvedEpisodeId)) ?? operationBranchId)
        : operationBranchId;

      let created: boolean;
      let retypedFrom: string | null = null;
      let exam: Awaited<ReturnType<typeof store.createExam>>["exam"];
      try {
        ({ exam, created, retypedFrom } = await store.createExam({
          patientId,
          caseId: caseRow?.id ?? null,
          caseType: caseType as MedicalSpecialty,
          branchId: createBranchId,
          doctorId: session.userId,
          doctorName,
          prescription,
          deviceCost: null,
          proposedExpertUserId: null,
          idempotencyKey,
          //  **المعرّفُ المحسوم أعلاه** — لا «أوّلُ حلقةٍ منتظرة»: القفلُ في
          //  المخزن يتحقّق منه ثانيةً، وسباقٌ غيّر الحالَ بين الفحصين يُردّ.
          deviceEpisodeId: resolvedEpisodeId,
          //  **وتصحيحُ النوع يقع تحت القفل نفسِه** — لا نداءَ ثانٍ خارجه.
          retypeEpisode,
          ...body,
        }, {
          //  **ونطاقُ الجلسة يُفحَص على فرع الحلقة تحت القفل**: إتاحةُ الملفّ
          //  (٠٨٠) تفتح القراءةَ والعملَ الجديد — لا توقيعَ جهازٍ مسؤوليتُه
          //  لفرعٍ آخر. وفحصُ النقطة أعلاه على المريض يبقى ردّاً مبكّراً.
          branchIds: branchScope(req),
        }));
      } catch (err) {
        if (err instanceof store.ExamIdempotencyConflictError) {
          return res.status(409).json({ error: err.message, code: "idempotency_conflict" });
        }
        if (err instanceof DeviceEpisodeError) return replyEpisodeError(res, err);
        throw err;
      }

      //  الوصفةُ على الملفّ **بعد** توقيعٍ التزم فعلاً — ومرّةً واحدة لكلّ
      //  محاولةٍ منطقية: إعادةُ إرسالٍ (`created: false`) لا تعيد كتابتها.
      if (caseFirst && created) {
        applied = await applyDecision(patientId, caseType, prescription, retypedFrom);
      }

      // ══ ما دون هذا كلُّه **آثارٌ يُنشئها الإنشاءُ الحقيقيّ وحده** ═══════
      //  محاولةٌ خسرت سباقاً حقيقياً على نفس المفتاح تعود هنا بـ
      //  `created: false` — نفسُ صفّ الفائزة، بلا تدقيقٍ ثانٍ ولا إغلاقِ
      //  طلبِ مراجعةٍ ثانٍ. فالتدقيقُ يبقى **واحداً بالضبط** لكلّ محاولةٍ
      //  منطقية، مهما تكرّرت الطلباتُ HTTP التي حملتها.
      if (created) {
        await logAudit({
          entityType: "medical_exam",
          entityId: exam.id,
          action: "create",
          userId: session.userId,
          userName: doctorName,
          branchId: exam.branchId,
          newValues: exam,
          ipAddress: req.ip ?? null,
          userAgent: req.get("user-agent") ?? null,
          notes: `معاينة ${specialtyLabel(caseType)} للمريض ${patient.name ?? patientId} — بتوقيع ${doctorName}`,
        });

        //  إغلاقُ طلبات المراجعة صار **داخل** معاملة التوقيع (`store.createExam`)
        //  — معاً أو لا شيء؛ لا نداءَ بعد الالتزام يُبتلَع فشلُه.
      }

      // ══ **ولا بابَ تجارياً ثانياً يُفتَح هنا** ═══════════════════════════
      //  المعاينةُ ثبتت سريرياً تماماً. المتابعةُ التي فتحها التوقيعُ (إن
      //  فُتحت أصلاً — `ensureFollowupForSignedExam` داخل `store.createExam`،
      //  بلا تغيير) تبقى **بلا سعرٍ ولا خبير**، بانتظار الاستعلامات من
      //  بطاقة المريض. لا نداءَ هنا إلى `setCommercialFields` ولا إلى أيّ
      //  دالّةٍ مالية أخرى — فلا مجالَ لفشلٍ ماليٍّ صامتٍ يُبتلَع، لأن لا
      //  شيءَ مالياً يقع أصلاً.

      // `switchNote` is surfaced, not swallowed: when the superseded case could
      // not be retired (it already carries a work order or tagged payments) the
      // doctor must know both cases are still open. Only meaningful when THIS
      // call actually ran the decision — a raced-away loser never did.
      res.json({ ...exam, switchNote: created ? (applied.switchNote ?? null) : null, created });
    } catch (err: any) {
      console.error("[medical] POST exam failed:", err);
      res.status(500).json({ error: err?.message || "تعذّر حفظ المعاينة" });
    }
  });

  // ── Revise an exam ───────────────────────────────────────────────────────
  // The doctor who signed it, or branch management / admin. Nothing is lost:
  // the outgoing version is archived before the live row is replaced.
  app.patch("/api/medical/exams/:examId", isAuthenticated, async (req: Req, res) => {
    try {
      const examId = Number(req.params.examId);
      if (!Number.isFinite(examId)) {
        return res.status(400).json({ error: "معرّف معاينة غير صالح" });
      }

      const session = getSession(req);
      const exam = await store.getExam(examId);
      if (!exam) return res.status(404).json({ error: "المعاينة غير موجودة" });
      if (!(await reachesExam(req, exam))) {
        return res.status(403).json({ error: "لا يمكنك التعديل على معاينة فرع آخر" });
      }

      // Exactly two parties, as agreed: the author, or the responsible manager.
      // A different doctor — even one holding the same specialty — may not
      // rewrite a colleague's signature; they file an addendum instead.
      const isAuthor = exam.doctorId !== null && exam.doctorId === session.userId;
      const isResponsibleManager = session.isAdmin || session.role === "branch_manager";
      //  ══ **الطبيبُ العاديّ — سلطةٌ سريريةٌ كاملة، وتجاريةٌ صفر** ═══════════
      //  نفسُ شرط فحص الاختصاص أدناه، مرفوعٌ هنا لاستعماله في حجب الحقول
      //  التجارية أيضاً: صاحبُ التوقيع الذي لا يحمل صفةً إدارية (لا مسؤولٌ
      //  عام ولا مديرُ فرع) وقتَ هذا الطلب. **ولا يُقاس بالدور المخزَّن على
      //  حساب المعاينة يوم التوقيع، بل بجلسة الطلب الحالية** — فمَن صار
      //  مسؤولاً أو مديرَ فرعٍ بعد أن وقّع كطبيبٍ عاديّ يحمل سلطتَه الحالية
      //  لا القديمة، ومَن سُحبت عنه الصفةُ الإدارية يفقدها فوراً. هذا هو
      //  الفارقُ الوحيد بين «مَن يجوز له التعديل» (فوق) و«مَن يملك الحقولَ
      //  التجارية داخل التعديل» (أدناه، عند `deviceCost`/`proposedExpertUserId`).
      const isNormalDoctorAuthor = isAuthor && !isResponsibleManager;
      if (!isAuthor && !isResponsibleManager) {
        return res
          .status(403)
          .json({ error: "تعديل المعاينة للطبيب صاحبها أو للمدير المسؤول فقط" });
      }
      //  **ولا تعديلَ لملغاة** (ترحيل ٠٦١): تحريرُها يُنتج نسخةً جديدة من
      //  سجلٍّ سُحبت سلطتُه — تصحيحٌ في مكانٍ لا يُقرأ. والمسار: معاينةٌ جديدة.
      if (await isExamCancelled(examId)) {
        return res.status(409).json({ error: "هذه المعاينة ملغاة — اكتب معاينة جديدة بدل التعديل" });
      }

      const caseType = req.body?.caseType ?? exam.caseType;
      if (!isMedicalSpecialty(caseType)) {
        return res.status(400).json({ error: "اختصاص المعاينة غير صالح" });
      }
      // ══ REFUSE BEFORE ANYTHING WRITES ════════════════════════════════════
      // `reviseExam` carries this same guard, but it runs too late to be the
      // only one: `applyDecision` below writes the patient's device fields and
      // its `patient_cases` row BEFORE the revision is attempted. A request
      // destined for 409 would still have moved the patient's record — the
      // refusal would be honest about the exam and silent about everything it
      // had already changed.
      //
      // So the answer is given here, before the first write. The inner guard
      // stays as defence for any other caller of `reviseExam`.
      if (exam.deviceEpisodeId !== null && caseType !== exam.caseType) {
        return res.status(409).json({
          error: "لا يمكن تغيير اختصاص معاينة مرتبطة بجهاز — ألغِ طلب الجهاز وابدأ الطلب الصحيح",
        });
      }

      // The author must still hold the specialty they are moving the exam to;
      // a manager editing on someone's behalf is not bound by that.
      if (isAuthor && !isResponsibleManager) {
        const specialties = await store.doctorSpecialties(session.userId);
        if (!specialties.includes(caseType)) {
          return res
            .status(403)
            .json({ error: `لا تملك صلاحية المعاينة في اختصاص ${specialtyLabel(caseType)}` });
        }
      }

      const body = {
        chiefComplaint: clean(req.body?.chiefComplaint),
        clinicalFindings: clean(req.body?.clinicalFindings),
        diagnosis: clean(req.body?.diagnosis),
        plan: clean(req.body?.plan),
        notes: clean(req.body?.notes),
      };
      const prescription =
        req.body?.prescription && typeof req.body.prescription === "object"
          ? (req.body.prescription as Record<string, any>)
          : {};
      //  ══ **الغيابُ يعني «لم يُلمَس» لا «امحُه»** ═══════════════════════════
      //  الشاشةُ الطبّية الجديدة لم تعد ترسل `deviceCost`/`proposedExpertUserId`
      //  إطلاقاً (القسمُ 4.b/4.f في CLAUDE.md) — فتغيّرت دلالةُ الغياب: لم يعد
      //  يعني «الطبيبُ محا الرقم» بل «هذه الشاشةُ لا تعرف هذا الحقل». وبلا هذا
      //  الحرس كان كلُّ تعديلٍ نصّيّ بسيط (تصحيحُ فقرةٍ في التشخيص مثلاً) يمسح
      //  كلفةَ جهازٍ ومقترَحَ خبيرٍ حقيقيَّين كتبهما طبيبٌ قبل هذا التبسيط —
      //  بياناتٌ تاريخيةٌ حيّة، لا مسوَّدةٌ تُعاد كتابتُها كلَّ مرّة.
      //
      //  ══ **وطبيبٌ عاديّ لا يملك هذين الحقلين — ولو أرسلهما صراحةً** ═══════
      //  «الغائبُ يبقى» يحرس عميلاً نسي الحقل. لكنّ طبيباً عادياً — لا
      //  مسؤولاً ولا مديرَ فرع — قد يرسلهما **عمداً**: نموذجٌ محفوظٌ من قبل
      //  هذا التبسيط، أو نداءٌ مباشر للنقطة. فالحارسُ هنا **بالهويّة لا
      //  بالحضور**: `isNormalDoctorAuthor` ⟶ القيمةُ المخزَّنة تبقى كما هي
      //  حتماً، حتى لو وصل الحقلُ صراحةً وبقيمةٍ صالحة. **ولا يُردّ الطلبُ
      //  لهذا السبب** — الشقُّ السريريُّ من نفس الطلب ينجح كالمعتاد؛ يُتجاهَل
      //  الحقلُ التجاريّ فحسب، فلا `priceChanged` يصير صحيحاً أدناه، ولا شيءَ
      //  من منطق التزامن/الاعتماد/التصنيع الذي يتفرّع منه يُستدعى.
      //
      //  **والاستثناءُ `isResponsibleManager` كما كان — لا جديدَ فيه.** هذا
      //  الحارسُ يضيف قيداً على الطبيب العاديّ وحدَه؛ لا يمسّ مَن هو أصلاً
      //  خارج `isNormalDoctorAuthor`. فالمسؤولُ العام (`session.isAdmin`)
      //  يحتفظ بسلطته القانونية الوحيدة للتصحيح الإداريّ التاريخيّ كاملةً —
      //  الآليّةُ المعتمَدة التي توثّقها CLAUDE.md. ومديرُ الفرع يبقى كما كان
      //  تماماً أيضاً — لم تُوسَّع صلاحيتُه ولم تُقيَّد في هذه المهمّة، لأنه
      //  لم يكن يوماً مقصوداً بهذا القيد: القيدُ للطبيب الذي لا صفةَ إدارية
      //  معه، لا لكلّ مَن ليس مسؤولاً بعينه.
      let deviceCost = (req.body?.deviceCost === undefined || isNormalDoctorAuthor)
        ? exam.deviceCost
        : parseDeviceCost(req.body?.deviceCost, caseType);
      const proposedExpertUserId = (req.body?.proposedExpertUserId === undefined || isNormalDoctorAuthor)
        ? exam.proposedExpertUserId
        : await parseProposedExpert(req.body?.proposedExpertUserId, caseType, exam.branchId);

      // ══ **تصحيحُ الطبيب لسعره الأصلي** ═══════════════════════════════
      //  الواقعة: كتب ٦,٠٠٠,٠٠٠ ثم صحّحها إلى ٦,٥٠٠,٠٠٠ — ولم يتغيّر سعرُ
      //  المتابعة، فاضطرّ المالك إلى «تحديد السعر النهائي» ليصلح رقماً.
      //  وذاك قرارٌ تجاريٌّ لمدير الفرع، وهذا تصحيحُ طبيبٍ لما أراد قولَه.
      //
      //  والتصنيفُ يقرّر: يُزامَن · يبقى القرارُ التجاري · يُجمَّد بعد
      //  البيع · أو يُردّ لأن طلبَ خصمٍ معلَّقٌ محسوبٌ على الرقم القديم.
      let priceSyncNote: string | null = null;
      let priceVerdict: Awaited<ReturnType<typeof FollowupStore.classifyExamPriceChange>> | null = null;
      const correctionReason = typeof req.body?.priceCorrectionReason === "string"
        ? req.body.priceCorrectionReason.trim() : "";
      const priceChanged = isDeviceServiceType(caseType)
        && deviceCost !== null && deviceCost !== (exam.deviceCost ?? null);
      if (priceChanged) {
        //  استيرادٌ ديناميّ كبقيّة نداءات المتابعة في هذا الملفّ — ترتيبُ
        //  تحميل الوحدات يبقى كما كان بالضبط.
        const fs = await import("../followup/store");
        priceVerdict = await fs.classifyExamPriceChange({
          patientId: exam.patientId,
          serviceType: caseType as "prosthetic" | "medical_support",
          deviceEpisodeId: exam.deviceEpisodeId ?? null,
          //  **الرابطُ الأقوى**: معاينةٌ مختومة بلا `device_episode_id`
          //  تجد متابعتَها ولو أُصلحت المتابعةُ بحلقةٍ بعد ختمها — بلا
          //  فتح الختم لملء هويّةٍ إدارية.
          medicalExamId: examId,
        });
        //  **الردُّ الوحيد**: طلبٌ معلَّقٌ يُحسَم بيد إنسان لا يُلغى بصمت.
        if (priceVerdict.kind === "blocked") {
          return res.status(409).json({ error: priceVerdict.reason });
        }
        //  ومسارٌ قديمٌ بلا هويّة جهاز يبقى مجمَّداً بصدق: لا مكانَ نظيفاً
        //  يُنزَل عليه الفرق، والتخمينُ أسوأ من الردّ.
        if (priceVerdict.kind === "frozen") {
          return res.status(409).json({ error: priceVerdict.reason });
        }
        if (priceVerdict.kind === "keep_commercial") priceSyncNote = priceVerdict.reason;
        //  ══ **وبعد البيع لا يمضي تصحيحُ مالٍ بلا سببٍ مكتوب** ══════════
        //  التصحيحُ قبل البيع رقمٌ لم يقبضه أحد بعد. وبعده مالٌ قُيِّد في
        //  الدفتر ودخل التقارير، فمَن يقرأ القيدَ بعد سنة يحتاج أن يعرف
        //  **لماذا** تحرّك — لا أن يجد فرقاً بلا رواية.
        if (priceVerdict.kind === "sync_after_sale" && correctionReason.length === 0) {
          return res.status(400).json({
            error: "تصحيح سعر جهاز بعد البيع يتطلّب سبباً مكتوباً — اكتب سبب التصحيح ثم أعد المحاولة",
          });
        }
      }

      const hasNarrative = Object.values(body).some((v) => v !== null);
      const hasPrescription = Object.values(prescription).some((v) =>
        Array.isArray(v)
          ? v.some((row: any) => row && Object.values(row).some((x) => x !== "" && x !== 0))
          : typeof v === "string" && v.trim().length > 0,
      );
      if (!hasNarrative && !hasPrescription) {
        return res.status(400).json({ error: "لا يمكن حفظ معاينة فارغة" });
      }

      const editorName = session.userName?.trim() || "مستخدم";
      // Same ordering rule as signing: the decision lands on the case first, so
      // a specialty change has a case to point the revised exam at.
      const applied = await applyDecision(exam.patientId, caseType, prescription);

      const revisionValues = {
        caseType, prescription, deviceCost, proposedExpertUserId, ...body,
      };
      const editor = { userId: session.userId, userName: editorName };
      const auditNote = (version: number) =>
        `تعديل المعاينة #${examId} إلى النسخة ${version} — بواسطة ${editorName}${isAuthor ? "" : " (مدير)"}`
        + (priceChanged
          ? ` — تصحيح كلفة الجهاز: ${(exam.deviceCost ?? 0).toLocaleString("en-US")}`
            + ` ⟶ ${(deviceCost ?? 0).toLocaleString("en-US")} د.ع`
            + (priceVerdict?.kind === "sync" ? " (زُوّمن السعر المعتمد)"
              : priceVerdict?.kind === "sync_after_sale"
                ? ` (تصحيح بعد البيع — زُوّمن السعر والحلقة والمال؛ السبب: ${correctionReason})`
                : " (بقي السعر التجاري)")
          : "");
      const auditFor = (version: number, tx?: any) => logAudit({
        entityType: "medical_exam",
        entityId: examId,
        action: "update",
        userId: session.userId,
        userName: editorName,
        branchId: exam.branchId,
        oldValues: exam,
        newValues: { ...revisionValues, version },
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
        notes: auditNote(version),
        tx,
      });

      let updated;
      if (priceVerdict?.kind === "sync" && deviceCost !== null) {
        // ══ **التصحيحُ والتزامنُ معاملةٌ واحدة** ═══════════════════════
        //  كان التنقيحُ يُحفَظ أوّلاً ثم يُحاوَل التزامن. وسقوطُ الثانية كان
        //  يترك حالاً لا يجوز أن توجد: معاينةٌ تقول ٦,٥٠٠,٠٠٠ ومتابعةٌ تقول
        //  ٦,٠٠٠,٠٠٠ — والاستعلاماتُ تقبض على الثانية.
        //
        //  **والسجلُّ معهما**: تدقيقٌ يصف تصحيحاً لم يقع كذبٌ على السجلّ.
        //  فالأربعة — النسخة، والسعر، وحدثُ المتابعة، والتدقيق — تنجح معاً
        //  أو تسقط معاً، ويبقى الرقمُ القديم في الجهتين.
        //
        //  وأيُّ انحرافٍ يكتشفه القفلُ داخلها يُرمى، فيُرجِع التنقيحَ نفسه.
        const fs = await import("../followup/store");
        const { db } = await import("../db");
        updated = await db.transaction(async (tx) => {
          const revised = await store.reviseExam(examId, revisionValues, editor, { tx });
          await fs.applyExamPriceCorrection({
            followupId: priceVerdict!.kind === "sync" ? priceVerdict!.followupId : 0,
            newPrice: deviceCost, actor: editor, tx,
          });
          await auditFor(revised.version, tx);
          return revised;
        });
      } else if (priceVerdict?.kind === "sync_after_sale" && deviceCost !== null) {
        // ══ **بعد البيع: المعاينةُ والمالُ كلُّه ذرّةٌ واحدة** ═════════════
        //  ستّةُ مواضعَ تتحرّك (المتابعة · الحلقة · كلفةُ الخيط · مجموعُ
        //  المريض · قيدُ الدفتر · الحدث) ومعها النسخةُ والتدقيق. وسقوطُ
        //  أيّها يُرجِع الجميعَ — فلا يبقى مريضٌ سعرُ معاينته يقول شيئاً
        //  وسعرُ حلقته يقول غيرَه، وهي الحالُ التي وُلد لها هذا الباب.
        const fs = await import("../followup/store");
        const { db } = await import("../db");
        const vd = priceVerdict;
        updated = await db.transaction(async (tx) => {
          const revised = await store.reviseExam(examId, revisionValues, editor, { tx });
          const done = await fs.applyExamPriceCorrectionAfterSale({
            followupId: vd.followupId,
            medicalExamId: examId,
            examDeviceEpisodeId: exam.deviceEpisodeId ?? null,
            newPrice: deviceCost, reason: correctionReason, actor: editor, tx,
            //  **والفرقُ يُكتب في فرع البيع، فنطاقُ المُصحِّح يُقاس به** تحت
            //  القفل — لا بفرع المعاينة الذي فُحص أعلاه.
            scope: branchScope(req),
          });
          priceSyncNote = "تم تصحيح السعر بعد البيع: "
            + `${vd.previousPrice.toLocaleString("en-US")} ⟶ ${deviceCost.toLocaleString("en-US")} د.ع`
            + ` (الفرق ${done.delta > 0 ? "+" : ""}${done.delta.toLocaleString("en-US")})`
            + " — حُدّث سعر الجهاز وكلفة المريض وقُيّد الفرق في الدفتر.";
          await auditFor(revised.version, tx);
          return revised;
        });
      } else {
        updated = await store.reviseExam(examId, revisionValues, editor);
        await auditFor(updated.version);
      }

      res.json({
        ...updated, switchNote: applied.switchNote ?? null,
        priceNote: priceSyncNote,
      });
    } catch (err: any) {
      // A refused edit is a business answer, not a server fault: the doctor
      // must read WHY and what to do instead, not a bare 500.
      if (err instanceof DeviceEpisodeError) {
        return res.status(err.status).json({ error: err.message });
      }
      //  **وانحرافُ الملفّ التجاري تحت القفل جوابُ عملٍ أيضاً**: المعاملةُ
      //  رجعت كلُّها — لا نسخةَ حُفظت ولا سعرَ تحرّك — والطبيبُ يحتاج أن
      //  يعرف ذلك ليحدّث ويعيد، لا خمسمئةً غامضة.
      if (err?.name === "FollowupError") {
        return res.status(err.status ?? 409).json({ error: err.message });
      }
      console.error("[medical] PATCH exam failed:", err);
      res.status(500).json({ error: err?.message || "تعذّر تعديل المعاينة" });
    }
  });

  // ── Append a correction to an existing exam ──────────────────────────────
  // ── إلغاءُ معاينةٍ موقّعة ──────────────────────────────────────────────
  //  زرُّ «حذف» في الشاشة يصل هنا. **ولا حذفَ**: صفُّ إلغاءٍ يُضاف، والسجلّ
  //  ونسخُه وملاحقُه وتوقيعُ الطبيب تبقى كما هي. والحُرّاسُ التجارية في
  //  `cancel_exam.ts` — تُردّ ٤٠٩ متى وقع بيعٌ أو تصنيع.
  app.post("/api/medical/exams/:examId/cancel", isAuthenticated, async (req: Req, res) => {
    try {
      const examId = Number(req.params.examId);
      if (!Number.isFinite(examId)) {
        return res.status(400).json({ error: "معرّف معاينة غير صالح" });
      }
      const session = getSession(req);
      const exam = await store.getExam(examId);
      if (!exam) return res.status(404).json({ error: "المعاينة غير موجودة" });
      if (!(await reachesExam(req, exam))) {
        return res.status(403).json({ error: "لا يمكنك إلغاء معاينة فرع آخر" });
      }
      //  **والمنحُ السريريّ يُقرأ من القاعدة لا من الجلسة**: سحبُ الاختصاص
      //  يسري فوراً لا عند الدخول التالي — نفسُ قاعدة الكتابة حرفياً.
      //  والمديرُ المسؤول لا يُستعلَم عن اختصاصه: إذنُه إداريٌّ لا سريريّ.
      const isManager = session.isAdmin || session.role === "branch_manager";
      const specialties = isManager ? [] : await store.doctorSpecialties(session.userId);
      if (!mayCancelExam(session, exam, specialties)) {
        //  ورسالةٌ تقول أيُّ بابٍ أُغلق: صاحبُ المعاينة الذي سُحب منه
        //  الاختصاص يحتاج أن يعرف أنه سُحب، لا أن يظنّ النظامَ لا يعرفه.
        const isAuthor = exam.doctorId !== null && exam.doctorId === session.userId;
        return res.status(403).json({
          error: isAuthor
            ? `لم تعد تملك اختصاص ${specialtyLabel(exam.caseType)} — إلغاء المعاينة لطبيب اختصاصها أو للمدير المسؤول`
            : "إلغاء المعاينة للطبيب صاحبها أو للمدير المسؤول فقط",
        });
      }

      const out = await cancelExam({
        examId,
        reason: String(req.body?.reason ?? ""),
        actor: { userId: session.userId, userName: session.userName },
        audit: { ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null },
      });
      res.json({ ok: true, ...out });
    } catch (err: any) {
      if (err instanceof ExamCancelError) {
        //  **والرمزُ يُمرّر حين يوجد** — الرسالةُ للإنسان والرمزُ
        //  للمسار. فرفضُ «وقعت العملية فعلاً» له بابٌ آخر تفتحُه الشاشةُ
        //  لمن يملكه، وبقيّةُ الرفوض تصل بـ`code: null` فتُعرَض كما كانت.
        //
        //  **ولا إذنَ في الرمز**: مَن يفتح ذلك الباب تقرّره نقطتا
        //  `/api/admin/operation-reversal/*` بحارسهما وحده — لم يُمَسّ بحرف.
        return res.status(err.status).json({
          error: err.message,
          ...(err.code ? { code: err.code } : {}),
        });
      }
      //  ══ **تعارضُ الأقفال يُقال تعارضاً** ══════════════════════════
      //   بيعٌ يجري على الملفّ نفسِه في اللحظة نفسِها يُنتج جموداً حقيقياً،
      //   وتُسقط القاعدةُ هذه المعاملةَ **كاملةً** — فلا شاهدةَ إلغاءٍ ولا
      //   نصفَ كتابة. وكان الردُّ ٥٠٠ «تعذّر إلغاء المعاينة»، فيقرؤها
      //   الطبيبُ عطباً في النظام بدل «أعد المحاولة».
      //
      //   **ولا إعادةَ تلقائية هنا**: القرارُ للطبيب، والرسالةُ تقول له إن
      //   شيئاً لم يقع.
      if (isLockConflictError(err)) {
        return res.status(409).json({
          error: LOCK_CONFLICT_ERROR, code: LOCK_CONFLICT_CODE,
        });
      }
      console.error("[medical] cancel exam failed:", err);
      res.status(500).json({ error: "تعذّر إلغاء المعاينة" });
    }
  });

  app.post("/api/medical/exams/:examId/addenda", isAuthenticated, async (req: Req, res) => {
    try {
      const examId = Number(req.params.examId);
      if (!Number.isFinite(examId)) {
        return res.status(400).json({ error: "معرّف معاينة غير صالح" });
      }

      const session = getSession(req);
      const specialties = await store.doctorSpecialties(session.userId);
      if (specialties.length === 0) {
        return res.status(403).json({ error: "الملحق يكتبه الطبيب فقط" });
      }

      const exam = await store.getExam(examId);
      if (!exam) return res.status(404).json({ error: "المعاينة غير موجودة" });
      if (!specialties.includes(exam.caseType as MedicalSpecialty)) {
        return res
          .status(403)
          .json({ error: `لا تملك صلاحية الكتابة في اختصاص ${specialtyLabel(exam.caseType)}` });
      }
      if (!(await reachesExam(req, exam))) {
        return res.status(403).json({ error: "لا يمكنك الكتابة على معاينة فرع آخر" });
      }
      //  **ولا كتابةَ على ملغاة** (ترحيل ٠٦١): ملحقٌ على سجلٍّ سُحبت سلطتُه
      //  يوهم قارئَه بأنه حيّ. والتصحيحُ يُكتب في معاينةٍ جديدة.
      if (await isExamCancelled(examId)) {
        return res.status(409).json({ error: "هذه المعاينة ملغاة — اكتب معاينة جديدة بدل الملحق" });
      }

      const bodyText = clean(req.body?.body);
      if (!bodyText) return res.status(400).json({ error: "نص الملحق مطلوب" });

      const doctorName = session.userName?.trim() || "طبيب";
      const addendum = await store.addAddendum({
        examId,
        doctorId: session.userId,
        doctorName,
        body: bodyText,
      });

      await logAudit({
        entityType: "medical_exam_addendum",
        entityId: addendum.id,
        action: "create",
        userId: session.userId,
        userName: doctorName,
        branchId: exam.branchId,
        newValues: addendum,
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
        notes: `ملحق على المعاينة #${examId} — بتوقيع ${doctorName}`,
      });

      res.json(addendum);
    } catch (err: any) {
      console.error("[medical] POST addendum failed:", err);
      res.status(500).json({ error: err?.message || "تعذّر حفظ الملحق" });
    }
  });

  // ── The doctor's own worklist ────────────────────────────────────────────
  // Who is waiting on ME, in MY specialties, oldest first. Empty for anyone who
  // is not a doctor — the queue only exists for someone who can act on it.
  app.get("/api/medical/worklist", isAuthenticated, async (req: Req, res) => {
    try {
      const { userId } = getSession(req);
      const specialties = await store.doctorSpecialties(userId);
      if (specialties.length === 0) return res.json({ rows: [], specialties: [] });
      const rows = await store.getWorklist(specialties, branchScope(req));
      //  الأسماء البديلة دفعةً واحدة لصفوف هذه القائمة — والقائمة نفسها مرّت
      //  بـ`branchScope` أعلاه، فلا يتّسع نطاقٌ بإرفاق رمزٍ لمريضٍ فيها.
      const aliasByPatient = await aliasCodesByPatient(rows.map((r) => r.patientId));
      //  ══ **هويّةُ الطلب — أقلُّ ما يلزم الزرّ** ═══════════════════════
      //  الصفُّ هنا (مريض، اختصاص) لا طلب، فلا رقمَ يُرجِعه زرُّ «إرجاع
      //  للاستعلامات». ويُرفَق `returnableRequestId` لمن يملك القدرة —
      //  ومَن أنشأ الطلبَ بنفسه لا يُعرَض له الزرّ (والخادم يردّه أيضاً).
      const mayReturn = await liveCanSuperviseWorklist(userId);
      const pend = mayReturn
        ? await reviewStore.pendingFullRequestsFor({
          patientIds: rows.map((r) => r.patientId), branchIds: branchScope(req),
        })
        : [];
      //  ══ **المطابقةُ بالحلقة حين يملكها الصفّ** (تدقيق ٢٠٢٦-٠٩-١٢) ═══
      //  صفٌّ لكلّ حلقةٍ منتظرة الآن، والطلبُ المرساةُ إليها هو طلبُها هي
      //  — لا أقدمُ طلبٍ على الخيط. والصفُّ بلا حلقة يطابق الطلبَ العاري
      //  (بلا `device_episode_id`) وحده؛ ولا يُقرَض طلبُ جهازٍ لصفٍّ غيره.
      //  **والأقدمُ أوّلاً** (كما كان `DISTINCT ON`): الصفوفُ تصل مرتّبةً
      //  تصاعدياً، والأوّلُ لكلّ مفتاحٍ هو الذي يبقى — لا الأحدث.
      const reqByEpisode = new Map<number, typeof pend[number]>();
      const specialtyByKey = new Map<string, typeof pend[number]>();
      for (const p of pend) {
        const k = `${p.patientId}:${p.serviceType}`;
        if (p.deviceEpisodeId !== null && !p.specialtyLevel) {
          //  مرساتُه حلقةٌ منتظرة (أو ملغاة — ولا صفَّ لها فلا تُطابَق أبداً).
          if (!reqByEpisode.has(p.deviceEpisodeId)) reqByEpisode.set(p.deviceEpisodeId, p);
        }
        //  الطلبُ على مستوى الاختصاص (عارٍ، أو مرساتُه جهازٌ حيّ لا ينتظر —
        //  `specialtyLevel` من `specialtyLevelRequestSql` نفسِها التي تحكم
        //  القائمةَ والإغلاق، لا قاعدةٌ ثانية) يُرفَق بصفٍّ بلا حلقة، **أو
        //  بصفّ حلقةٍ لا طلبَ لها هي**: إرسالُ الاستعلامات المصحَّح بعد الإرجاع
        //  عارٍ (مراجعة المرحلة الأولى: REF-3)، وزيارةُ متابعةٍ على مسلَّم
        //  أُحيلت إلى معاينةٍ كاملة مرساتُها الجهازُ المسلَّم (LEG-01).
        //  **والأقدمُ أوّلاً** — الصفوفُ تصل مرتّبةً تصاعدياً.
        if (p.specialtyLevel && !specialtyByKey.has(k)) specialtyByKey.set(k, p);
      }
      res.json({
        rows: rows.map((r) => {
          const hit = (r.episodeId !== null ? reqByEpisode.get(r.episodeId) : undefined)
            ?? specialtyByKey.get(`${r.patientId}:${r.caseType}`);
          const withAlias = aliasByPatient.has(r.patientId)
            ? { ...r, aliasCodes: aliasByPatient.get(r.patientId) } : { ...r };
          //  **سببُ الزيارة** — يُعرَض دائماً حين يوجد طلبٌ حاكم، بصرف النظر
          //  عن مالك الإرجاع (`returnableRequestId` وحده مقصورٌ على مَن لم
          //  يُنشئ الطلبَ بنفسه). فالطبيبُ يعرف «عاد للشراء» ولو كان هو
          //  نفسُه مَن أحال المريض سابقاً.
          const withKind = hit ? { ...withAlias, reviewKind: hit.reviewKind } : withAlias;
          return hit && hit.createdBy !== userId
            ? { ...withKind, returnableRequestId: hit.requestId }
            : withKind;
        }),
        specialties,
        canReturnRequests: mayReturn,
      });
    } catch (err: any) {
      console.error("[medical] GET worklist failed:", err);
      res.status(500).json({ error: "تعذّر تحميل قائمة المعاينات" });
    }
  });

  // ── إلغاءُ طلبِ معاينةٍ لم تبدأ — زرُّ «إلغاء المعاينة» ────────────────
  //
  //  **الصلاحيةُ هي الطابورُ نفسُه.** `doctorSpecialties` تُقرأ من القاعدة في
  //  كلّ طلب (لا من الجلسة، فسحبُ الاختصاص يسري فوراً — قاعدةُ هذا الملفّ
  //  كلِّه)، وتشترط حساباً فعّالاً دورُه `doctor` أو يحمل `canWriteMedicalExam`.
  //  فمَن يستطيع أن **يوقّع** على هذا الصفّ يستطيع أن يقول «لا معاينةَ له» —
  //  والثاني أقلُّ أثراً من الأوّل: لا سجلَّ سريرياً يُكتب، ولا ديناراً.
  //  **والاختصاصُ شرطٌ لا زينة**: طبيبُ العلاج الطبيعي لا يُلغي طلبَ أطراف.
  app.post("/api/medical/worklist/cancel-request", isAuthenticated, async (req: Req, res) => {
    try {
      const session = getSession(req);
      const patientId = Number(req.body?.patientId);
      if (!Number.isInteger(patientId) || patientId <= 0) {
        return res.status(400).json({ error: "معرّف المريض غير صالح" });
      }
      const caseType = String(req.body?.caseType ?? "");
      if (!isMedicalSpecialty(caseType)) {
        return res.status(400).json({ error: "اختصاص غير معروف" });
      }
      //  **وشكلُ معرّفِ الجهاز يُشترَط إن حضر** (المرحلة الأولى): مشوَّهٌ يُردّ
      //  ٤٠٠ ولا يسقط صامتاً إلى «بلا جهاز» فيصير الإلغاءُ تخميناً.
      const rawEpisode = req.body?.deviceEpisodeId;
      let deviceEpisodeId: number | null = null;
      if (rawEpisode !== undefined && rawEpisode !== null && rawEpisode !== "") {
        const n = typeof rawEpisode === "number" || typeof rawEpisode === "string"
          ? Number(rawEpisode) : NaN;
        if (!Number.isInteger(n) || n <= 0) {
          return res.status(400).json({ error: "معرّف الجهاز غير صالح", code: "device_episode_invalid" });
        }
        deviceEpisodeId = n;
      }
      const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
      if (!reason) return res.status(400).json({ error: "سبب الإلغاء إلزامي" });

      const specialties = await store.doctorSpecialties(session.userId);
      if (!specialties.includes(caseType)) {
        return res.status(403).json({ error: "هذا الاختصاص ليس من اختصاصاتك" });
      }

      const done = await cancelExamRequest({
        patientId,
        caseType,
        deviceEpisodeId,
        reason,
        actor: { userId: session.userId, userName: session.userName ?? null },
        branchIds: branchScope(req),
      });

      //  ══ **ونوعُ الكيان يتبع معرّفَه — لا نوعٌ ومعرّفُ غيرِه** ═══════════
      //  سطرٌ يقول `medical_review_request` ويحمل **رقمَ حلقة** يُنسَب إلى
      //  طلبِ مراجعةٍ لا علاقةَ له به (قراءةُ `audit_log` ترشّح بالثنائيّة
      //  نوع/رقم)، ويغيب عن تاريخ الحلقة التي أُلغيت فعلاً.
      //  فالحلقةُ تُقيَّد `patient_device_episode` بمعرّفها — **نفسُ عقد نقطة
      //  إلغاء الجهاز بحرفه** (`device_episodes/routes.ts`)، وأرقامُ الطلبات
      //  المسحوبة تُسمّى في الملاحظة كما تفعل هي. وصفٌّ بلا حلقة يُقيَّد
      //  بطلبه. والفرعُ الثالث لا يقع: `cancelExamRequest` تردّ
      //  `nothing_to_cancel` قبل أن تكتب حرفاً — وهو مكتوبٌ ليبقى النوعُ
      //  متّسقاً مع معرّفه إن تغيّرت تلك الدالّة يوماً.
      const audited = done.cancelledEpisodeId !== null
        ? { entityType: "patient_device_episode", entityId: done.cancelledEpisodeId }
        : done.cancelledRequestIds.length > 0
          ? { entityType: "medical_review_request", entityId: done.cancelledRequestIds[0] }
          : { entityType: "patient", entityId: patientId };

      await logAudit({
        entityType: audited.entityType,
        entityId: audited.entityId,
        action: "update",
        userId: session.userId,
        userName: session.userName ?? null,
        branchId: done.branchId,
        newValues: done,
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
        notes: `إلغاء طلب معاينة ${specialtyLabel(caseType)} للمريض #${patientId} — ${reason}`
          + (done.cancelledEpisodeId !== null ? ` — أُلغي طلبُ الجهاز #${done.cancelledEpisodeId}` : "")
          + (done.cancelledRequestIds.length
            ? ` — وسُحبت طلباتُ المراجعة ${done.cancelledRequestIds.map((i) => `#${i}`).join("، ")}`
            : ""),
      });

      //  ══ **ويُقال للطبيب ما جرى فعلاً، لا ما وُعد به** ═══════════════════
      //  الصفُّ قد يقف على أكثر من قاعدة: خيطُ خدمةٍ سابقٌ لحقبة المسار يبقى
      //  «ينتظر معاينة» بحكم القاعدة القديمة ولو سُحب طلبُه كلُّه — وبابُه
      //  الإدارة لا هذا الزرّ. فبدل أن تَعِد الرسالةُ بخروجٍ لم يقع، تُسأل
      //  **الدالّةُ الحقيقية نفسُها** (`getWorklist`) — لا نسخةٌ ثانية من
      //  قاعدة العضوية — ويُقال الجواب كما هو.
      let stillListed = false;
      try {
        const after = await store.getWorklist(specialties, branchScope(req));
        stillListed = after.some((r) => r.patientId === patientId && r.caseType === caseType);
      } catch (probeErr) {
        //  **وفشلُ الاستطلاع ليس فشلَ الإلغاء**: الكتابةُ التزمت سلفاً،
        //  والقائمةُ تُعاد جلبُها في الواجهة على كل حال.
        console.error("[medical] worklist re-check after cancel failed:", probeErr);
      }

      res.json({ ...done, stillListed });
    } catch (err: any) {
      if (err instanceof CancelExamRequestError || err instanceof DeviceEpisodeError) {
        return res.status(err.status).json({
          error: err.message,
          code: (err as any).code ?? undefined,
        });
      }
      console.error("[medical] cancel exam request failed:", err);
      res.status(500).json({ error: "تعذّر إلغاء طلب المعاينة" });
    }
  });

  // ── شارةُ «معايناتي» — العددُ وحده (تحكّمُ شاراتِ الشريط الجانبي،
  // 2026-08-31) ═══════════════════════════════════════════════════════════
  // نفسُ حارس `/api/medical/worklist` بحرفه — `doctorSpecialties` ثمّ
  // `branchScope` — لا نسخةَ ثانية من قاعدة «مَن طبيب». **وهذا طابورُ عملٍ
  // لا إشعاراً معلوماتياً**: لا يُطفَأ بفتح الصفحة، يبقى حتى يُحسَم كلُّ صفّ
  // فيه (يوقّع الطبيبُ معاينته)، تماماً كـ«بانتظار الحسم». ومَن ليس طبيباً
  // يقرأ صفراً بلا ٤٠٣ — نفسُ نمط كلّ شارات الشريط الجانبيّ.
  app.get("/api/medical/worklist/count", isAuthenticated, async (req: Req, res) => {
    try {
      const { userId } = getSession(req);
      const specialties = await store.doctorSpecialties(userId);
      if (specialties.length === 0) return res.json({ count: 0 });
      const rows = await store.getWorklist(specialties, branchScope(req));
      res.json({ count: rows.length });
    } catch (err: any) {
      console.error("[medical] GET worklist/count failed:", err);
      res.json({ count: 0 });
    }
  });

  // ── مرضى الطبيب الذين اشتروا مؤخّراً — **قراءةٌ محضة** ───────────────────
  //
  // لا بنيةَ تنبيهاتٍ داخلية في هذا النظام (تلغرام للمالك، وصندوقُ رسائلِ
  // المرضى — وكلاهما لغير هذا الغرض)، وبناءُ واحدةٍ لأجل سطرٍ يُقرأ مرّةً في
  // اليوم كلفةٌ لا تُسترَدّ. فالمعلومة تُوضَع **حيث يقف الطبيب أصلاً**:
  // قائمةُ عمله. لا صندوقَ يُقرأ ولا رايةَ تُطفأ ولا فعلَ مطلوب.
  //
  // **والفلترةُ في الخادم**: `doctor_id` من المعاينة الموقَّعة، ثم نطاقُ
  // الفرع فوقه. فلا يرى طبيبٌ بيعَ زميلِه ولا مرضى فرعٍ لا يصله.
  app.get("/api/medical/recent-purchases", isAuthenticated, async (req: Req, res) => {
    try {
      const { userId } = getSession(req);
      //  والصلاحيةُ تُقرأ من القاعدة لا من الجلسة — كبقيّة نقاط المعاينة.
      const specialties = await store.doctorSpecialties(userId);
      if (specialties.length === 0 || userId === null) return res.json({ rows: [] });
      const followupStore = await import("../followup/store");
      const rows = await followupStore.recentPurchasesForDoctor({
        doctorUserId: userId, scope: branchScope(req),
      });
      res.json({ rows });
    } catch (err: any) {
      console.error("[medical] GET recent-purchases failed:", err);
      res.status(500).json({ error: "تعذّر تحميل قائمة المشتريات الأخيرة" });
    }
  });

  // ── Pending-exam signal for the patients list ────────────────────────────
  // Returns one entry per patient who still has an unexamined active case, so
  // each doctor can see who is waiting on THEIR specialty.
  app.get("/api/medical/pending", isAuthenticated, async (req: Req, res) => {
    try {
      const scope = branchScope(req);
      const [rows, decidedRows, optionalRows] = await Promise.all([
        store.getPendingExams(scope),
        store.getDecidedExams(scope),
        store.getPendingExams(scope, true),
      ]);
      const byPatient: Record<number, string[]> = {};
      for (const r of rows) {
        (byPatient[r.patientId] ||= []).push(r.caseType);
      }
      // Legacy patients with an un-examined case: no badge, no obligation —
      // but the doctor still gets the «كتابة معاينة» button for them.
      const optionalByPatient: Record<number, string[]> = {};
      for (const r of optionalRows) {
        (optionalByPatient[r.patientId] ||= []).push(r.caseType);
      }
      const decidedByPatient: Record<number, string[]> = {};
      for (const r of decidedRows) {
        (decidedByPatient[r.patientId] ||= []).push(r.caseType);
      }
      res.json({
        pending: byPatient,
        decided: decidedByPatient,
        optional: optionalByPatient,
        total: rows.length,
        // The exam system's go-live moment: patients registered before it are
        // legacy-exempt, and the registry compares createdAt against this to
        // unlock تخصيص without a signed exam.
        activatedAt: (await store.examSystemActivatedAt())?.toISOString() ?? null,
      });
    } catch (err: any) {
      console.error("[medical] GET pending failed:", err);
      res.status(500).json({ error: "تعذّر تحميل قائمة الانتظار" });
    }
  });
}
