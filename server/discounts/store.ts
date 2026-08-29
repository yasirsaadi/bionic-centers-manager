// طبقةُ بيانات الخصم والتبرّع — **إذنٌ وتدقيق، لا مال**.
//
// ══ قاعدةُ هذا الملفّ ═══════════════════════════════════════════════════
// **لا سطرَ مالٍ واحد يُكتب هنا.** حين يُعتمد الطلب يُنادى المسارُ القائم
// نفسه — `confirmPurchase` للأجهزة و`pricePhysiotherapy` للعلاج الطبيعي —
// فيكتب الكلفةَ وقيدَ الدفتر وأمرَ التصنيع حيث كان يكتبها دائماً. وما
// يفعله هذا الملفّ أن **يمرّر إليه السعرَ المعتمد** ويحفظ مَن أذن به.
//
// ولو نُسخ منطقُ المال هنا لصار للنظام حقيقتان ماليّتان تنحرف إحداهما يوماً.

import { db } from "../db";
import { sql } from "drizzle-orm";
import { logAudit } from "../accounting/ledger";
import { storage } from "../storage";
import * as followupStore from "../followup/store";
import {
  computeServiceDiscount, isDiscountReason, FREE_DONATION_REASON,
  type Department, type ServiceDiscount,
} from "@shared/discount";
import { isDepartment } from "@shared/service_taxonomy";
import { PHYSIO_TREATMENT_TYPES, physioEntryCost } from "@shared/pricing";
import { parseComponent } from "@shared/prosthetic_parts";
import { NEW_SERVICE_LABELS } from "../new_service/store";

export class DiscountError extends Error {
  status: number;
  constructor(message: string, status = 409) {
    super(message);
    this.name = "DiscountError";
    this.status = status;
  }
}

const CONFLICT = "تغيّرت حالة الطلب بواسطة مستخدم آخر. حدّث الصفحة وحاول مجدداً.";

export interface Actor { userId: number | null; userName: string | null }

export interface DiscountRow {
  id: number;
  patientId: number;
  caseId: number | null;
  branchId: number | null;
  department: string;
  contextRef: string | null;
  originalPrice: number;
  proposedFinalPrice: number;
  discountAmount: number;
  discountPercentage: number;
  isFree: boolean;
  reason: string;
  note: string | null;
  status: string;
  payload: Record<string, any>;
  requestedBy: number | null;
  requestedByName: string | null;
  requestedAt: string;
  decidedBy: number | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  approvedFinalPrice: number | null;
  appliedAt: string | null;
}

const COLS = sql`id, patient_id, case_id, branch_id, department, context_ref,
  original_price, proposed_final_price, discount_amount, discount_percentage,
  is_free, reason, note, status, payload, requested_by, requested_by_name,
  requested_at, decided_by, decided_by_name, decided_at, decision_note,
  approved_final_price, applied_at`;

const toRow = (r: any): DiscountRow => ({
  id: Number(r.id),
  patientId: Number(r.patient_id),
  caseId: r.case_id === null || r.case_id === undefined ? null : Number(r.case_id),
  branchId: r.branch_id === null || r.branch_id === undefined ? null : Number(r.branch_id),
  department: r.department,
  contextRef: r.context_ref ?? null,
  originalPrice: Number(r.original_price),
  proposedFinalPrice: Number(r.proposed_final_price),
  discountAmount: Number(r.discount_amount),
  discountPercentage: Number(r.discount_percentage),
  isFree: Boolean(r.is_free),
  reason: r.reason,
  note: r.note ?? null,
  status: r.status,
  payload: (r.payload ?? {}) as Record<string, any>,
  requestedBy: r.requested_by === null || r.requested_by === undefined ? null : Number(r.requested_by),
  requestedByName: r.requested_by_name ?? null,
  requestedAt: r.requested_at,
  decidedBy: r.decided_by === null || r.decided_by === undefined ? null : Number(r.decided_by),
  decidedByName: r.decided_by_name ?? null,
  decidedAt: r.decided_at ?? null,
  decisionNote: r.decision_note ?? null,
  approvedFinalPrice: r.approved_final_price === null || r.approved_final_price === undefined
    ? null : Number(r.approved_final_price),
  appliedAt: r.applied_at ?? null,
});

// ── حمولةُ الاستئناف ─────────────────────────────────────────────────────

/**
 * **أقلُّ ما يلزم لاستئناف العملية القائمة** — لا نسخةٌ من الخدمة.
 *
 * الموظّف ملأ النموذج مرّةً: الخبير، أعداد الجلسات، نوع العلاج. ولو لم
 * يُحفَظ لطُلب منه أن يعيده كلَّه بعد الاعتماد — وهو ما يجعل الموظّف يتجنّب
 * الخصمَ أصلاً ويلتفّ عليه.
 *
 * **ولا سعرَ فيها**: السعرُ يُقرأ من الصفّ المعتمد وحده، فلا يُهرَّب رقمٌ
 * عبر الحمولة.
 */
export interface DiscountPayload {
  /** أجهزة: متابعةُ ما بعد المعاينة إن وُجدت — البابُ القانوني للبيع. */
  followupId?: number | null;
  /** أجهزة: الخبيرُ المسؤول. */
  expertUserId?: number | null;
  /**
   * أجهزة: مواصفاتُ الجهاز **كما رشّحتها النقطةُ بعد فلترتها بالدور وفرضِ
   * وصفة الطبيب فوقها**. تُحفظ لا لتُصدَّق بل لئلّا يُعاد إدخالُها.
   */
  fields?: Record<string, string>;
  /** علاجٌ طبيعي: بنودُ الجلسات كما أدخلها الموظّف. */
  entries?: { treatmentType: string; sessionCount: number }[];
  /**
   * ══ **صيانة** (ترحيل ٠٦٠) — نوعٌ ثالثٌ داخل قسم الأجهزة ═══════════════
   *
   * القسمُ يقول «أطراف» ولا يقول «صيانةٌ أم بيعُ جهاز»، والمسارَان يُنفَّذان
   * بدالّتين مختلفتين تماماً. فالعَلَمُ هنا هو ما يميّزهما عند الاعتماد.
   *
   * **ولا سعرَ في الحمولة إطلاقاً**: السعرُ المعتمد على الصفّ هو المصدر،
   * ونسخةٌ ثانية هنا كانت ستنحرف عنه عند «تعديل واعتماد».
   */
  /**
   * ══ **«خدمة جديدة»** — نوعٌ ثالثٌ داخل قسم العلاج الطبيعي ═══════════════
   *
   * القسمُ يقول «علاجٌ طبيعي» ولا يقول «تسعيرُ خطّةٍ أم خدمةٌ إضافية»،
   * والمسارَان يُنفَّذان بدالّتين مختلفتين: `pricePhysiotherapy` تكتب خطّةً
   * جديدة، و`executeNewService` تزيد على القائم بزيارةٍ ودفعة. فالعَلَمُ هنا
   * هو ما يميّزهما عند الاعتماد.
   */
  kind?: "maintenance" | "new_service";
  /** الجهازُ المُصان — أو `null` مع `legacyUnrecordedDevice` للقديم. */
  deviceEpisodeId?: number | null;
  legacyUnrecordedDevice?: boolean;
  /** الجزءُ المُصان — إلزاميٌّ للأطراف. */
  maintenanceComponent?: string | null;
  /** ملاحظةُ الزيارة كما كتبها الموظّف، وموعدُ التسليم إن حُدِّد. */
  visitNotes?: string | null;
  expectedDeliveryDate?: string | null;
  /** «خدمة جديدة»: أيُّ الأنواع الثلاثة — ولا سعرَ معه. */
  serviceType?: string | null;
  /** «خدمة جديدة»: ما كتبه الموظّف من ملاحظةٍ ووسمٍ وعددِ جلسات. */
  serviceNotes?: string | null;
  paymentTreatmentType?: string | null;
  sessionCount?: number | null;
  /**
   * «خدمة جديدة» **بلا بنود** (استشارة/خدمة أخرى) — ما دفعه المريضُ فعلاً
   * الآن، لا افتراضَ أن الخصمَ يعني تحصيلَ كامل السعر المتَّفق عليه. غائبٌ
   * أو صفرٌ يعني «لم يُحصَّل شيءٌ الآن» — الفرقُ يبقى ديناً على المريض،
   * لا مالاً ملفَّقاً في الوارد. **والبنودُ (الجلساتُ الإضافية) تتجاهل هذا
   * الحقلَ تماماً** — دفعتُها بمقدار الحصّة المخصَّصة لكلّ بندٍ، كما كانت
   * حرفياً قبل هذه المرحلة.
   */
  initialPayment?: number | null;
}

//  مفاتيحُ المواصفات المسموحة — نفسُ قائمتَي «تخصيص»، فلا تدخل الحمولةُ
//  عموداً لم تكن النقطةُ لتقبله.
const DEVICE_SPEC_KEYS = new Set<string>([
  "prostheticType", "siliconType", "siliconSize", "suspensionSystem",
  "footType", "footSize", "kneeJointType", "supportType",
]);

function sanitizePayload(dept: Department, raw: any): DiscountPayload {
  const out: DiscountPayload = {};
  if (raw?.kind === "new_service") {
    //  ══ «خدمة جديدة» بخصم — **ما يلزم للاستئناف فقط، ولا سعر** ═════════
    //  البنودُ والوسمُ والملاحظة كما أدخلها الموظّف مرّةً واحدة. والسعرُ
    //  المعتمَد على الصفّ هو المصدر الوحيد — نسخةٌ هنا كانت ستنحرف عند
    //  «تعديل واعتماد».
    out.kind = "new_service";
    const st = String(raw?.serviceType ?? "");
    if (!NEW_SERVICE_LABELS[st]) {
      throw new DiscountError("نوع الخدمة غير صالح", 400);
    }
    out.serviceType = st;
    const entries = Array.isArray(raw?.entries) ? raw.entries : [];
    const clean = entries
      .map((e: any) => ({
        treatmentType: String(e?.treatmentType ?? ""),
        sessionCount: Math.max(0, Math.floor(Number(e?.sessionCount) || 0)),
      }))
      .filter((e: any) => PHYSIO_TREATMENT_TYPES.includes(e.treatmentType) && e.sessionCount > 0);
    out.entries = clean.length > 0 ? clean : undefined;
    out.serviceNotes = typeof raw?.serviceNotes === "string" && raw.serviceNotes.trim()
      ? raw.serviceNotes.trim().slice(0, 500) : null;
    out.paymentTreatmentType = typeof raw?.paymentTreatmentType === "string" && raw.paymentTreatmentType.trim()
      ? raw.paymentTreatmentType.trim().slice(0, 200) : null;
    const n = Number(raw?.sessionCount);
    out.sessionCount = Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
    //  **حقيقةُ الدفع الحاليّة — لا افتراضَ تحصيلٍ كامل**: غيابُها أو صفرٌ
    //  يعني «لم يُدفَع الآن»، لا «دُفع كاملَ السعر المتَّفق عليه».
    const ip = Number(raw?.initialPayment);
    out.initialPayment = Number.isFinite(ip) && ip > 0 ? Math.round(ip) : null;
    return out;
  }
  if (dept === "physiotherapy") {
    const entries = Array.isArray(raw?.entries) ? raw.entries : [];
    const clean = entries
      .map((e: any) => ({
        treatmentType: String(e?.treatmentType ?? ""),
        sessionCount: Math.max(0, Math.floor(Number(e?.sessionCount) || 0)),
      }))
      .filter((e: any) => PHYSIO_TREATMENT_TYPES.includes(e.treatmentType) && e.sessionCount > 0);
    if (clean.length === 0) {
      throw new DiscountError("أدخل نوع علاج وعدد جلسات صحيحاً", 400);
    }
    out.entries = clean;
  } else if (raw?.kind === "maintenance") {
    //  ══ صيانةٌ بخصم — حمولةٌ تحفظ **ما يلزم للاستئناف فقط** ═══════════
    //  الجهازُ المختار، والخبير، والجزء، والملاحظة، والموعد. ولا سعر:
    //  المعتمَدُ على الصفّ هو المصدر، ونسخةٌ هنا كانت ستنحرف عند «تعديل
    //  واعتماد».
    out.kind = "maintenance";
    const x = Number(raw?.expertUserId);
    out.expertUserId = Number.isFinite(x) && x > 0 ? x : null;
    if (!out.expertUserId) {
      throw new DiscountError("اختر الخبير المسؤول قبل إرسال الطلب", 400);
    }
    const ep = Number(raw?.deviceEpisodeId);
    out.deviceEpisodeId = Number.isFinite(ep) && ep > 0 ? ep : null;
    out.legacyUnrecordedDevice = raw?.legacyUnrecordedDevice === true;
    const comp = parseComponent(raw?.maintenanceComponent);
    if (!comp.ok) throw new DiscountError(comp.error!, 400);
    if (dept === "prosthetic" && !comp.value) {
      throw new DiscountError("حدّد الجزء المراد صيانته", 400);
    }
    out.maintenanceComponent = comp.value;
    out.visitNotes = typeof raw?.visitNotes === "string" && raw.visitNotes.trim()
      ? raw.visitNotes.trim().slice(0, 500) : null;
    const d = raw?.expectedDeliveryDate;
    out.expectedDeliveryDate = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)
      ? d : null;
  } else {
    const f = Number(raw?.followupId);
    out.followupId = Number.isFinite(f) && f > 0 ? f : null;
    const x = Number(raw?.expertUserId);
    out.expertUserId = Number.isFinite(x) && x > 0 ? x : null;
    if (!out.expertUserId) {
      throw new DiscountError("اختر الخبير المسؤول قبل إرسال الطلب", 400);
    }
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw?.fields ?? {})) {
      if (DEVICE_SPEC_KEYS.has(k) && typeof v === "string" && v) fields[k] = v;
    }
    out.fields = fields;
  }
  return out;
}

// ── القرار ───────────────────────────────────────────────────────────────

/**
 * حسمُ الطلب — اعتماداً أو رفضاً أو **تعديلاً واعتماداً**.
 *
 * ══ الاعتمادُ ينادي المسارَ القائم ولا ينسخه ══════════════════════════
 * كلُّ ما يفعله هنا أن يقفل الصفَّ، يثبّت السعرَ المعتمد، ثم يسلّمه إلى
 * `confirmPurchase` أو `pricePhysiotherapy`. فالكلفةُ وقيدُ الدفتر وأمرُ
 * التصنيع وخطّةُ الجلسات كلُّها تُكتب بالشيفرة المُجرَّبة نفسها.
 *
 * ══ **«معتمَد» يعني «نُفِّذ» — معاملةٌ واحدة لا اثنتان** ══════════════════
 * كان الحسمُ يُثبَّت في معاملةٍ ثم يُنفَّذ المسارُ بعدها ثم يُختَم
 * `applied_at`. وبين كلّ خطوتين كانت هناك لحظةُ سقوطٍ تترك النظام كاذباً:
 *   • سقوطٌ بعد الحسم وقبل التنفيذ ⟶ صفٌّ يقول «معتمَد» بلا خدمةٍ وقعت،
 *     **وقد خرج من الطابور** فلا يراه أحد ولا يُستأنف.
 *   • سقوطٌ بعد التنفيذ وقبل الختم ⟶ خدمةٌ وقعت بلا ختم، وإعادةٌ لاحقة
 *     تُنشئ أمرَ تصنيعٍ ثانياً لبيعٍ واحد.
 *   • وفي مسار الجهاز أسوأ: `setApprovedPriceForDiscount` كانت تكتب السعرَ
 *     المخفَّض على المتابعة **قبل** `confirmPurchase`؛ فلو فشل البيعُ بقي
 *     السعرُ المخفَّض مكتوباً، فيؤكّد الاستعلامات الشراء بالمسار العادي
 *     ويأخذ الخصمَ بلا اعتماد — التفافٌ كامل على الطبقة.
 *
 * فصارت الخطواتُ الثلاث **معاملةً واحدة**: القفل، والتنفيذ، والختم. لا
 * تنجح إلّا معاً، ولا تسقط إلّا معاً. والسقوطُ أينما وقع يعيد الصفَّ
 * `pending` كما كان — في الطابور، بلا أثرٍ ماليّ، قابلاً للإعادة.
 *
 * **والقاعدةُ تحرس هذا بنيوياً**: قيدُ `decision_check` يرفض صفّاً
 * `approved` بلا `applied_at`. فالحالةُ المشلولة لا يمكن أن توجد ولو
 * كتبها نداءٌ مباشر من محرّر SQL.
 *
 * ══ والاعتمادُ المزدوج يُنفَّذ مرّةً واحدة ═══════════════════════════════
 * القفلُ على الصفّ ثم شرطا `status = 'pending' AND applied_at IS NULL` في
 * التحديث: مَن وصل ثانياً يقرأ `approved` فيُردّ بـ409 — فلا أمرا تصنيعٍ
 * لبيعٍ واحد. والمفتاحُ هنا هو **رقمُ الطلب نفسه**: صفٌّ واحد لا يُنفَّذ
 * إلّا مرّة، فالإعادةُ بعد فشلٍ عابر تكمل تماماً مرّةً واحدة.
 *
 * ══ والرفضُ لا يُنشئ ديناراً ═══════════════════════════════════════════
 * المريضُ قد لا يكون وافق على السعر الأصلي أصلاً. فالرفضُ يعيد الخدمةَ إلى
 * الاستعلامات: يبيع بالسعر الأصلي إن رضي المريض، أو يطلب خصماً آخر، أو
 * يغلق بلا شراء.
 */
export interface DecisionAudit {
  ipAddress?: string | null;
  userAgent?: string | null;
  /** يُبنى من الصفّ المحسوم — تمرّره النقطةُ دالّةً لتقرأ القيم النهائية. */
  note: (row: DiscountRow, decision: "approve" | "reject") => string;
}

export interface DecideDiscountParams {
  requestId: number; decision: "approve" | "reject";
  /** «تعديل واعتماد»: سعرٌ يخالف المقترح. */
  finalPrice?: number | null;
  /** ولا يصير صفراً تبرّعاً إلّا بعلمٍ صريح من المعتمِد نفسه. */
  isFree?: boolean;
  note?: string | null; actor: Actor;
  /**
   * **سطرُ التدقيق يُكتب داخل المعاملة** — لا بعدها.
   *
   * «مَن أذن بهذا الخصم ومتى» ليس زينةً بل هو الإذنُ نفسه. فلو كُتب بعد
   * الالتزام لأمكن أن يتحرّك المال بإذنٍ لا أثرَ له؛ ولو فشلت كتابتُه
   * فأُبلغ المستخدم «لم يتغيّر شيء» لكانت الرسالةُ كذباً يدفعه إلى إعادةِ
   * عمليةٍ نجحت. فصار السطرُ جزءاً من الحزمة: ينجح معها أو تسقط معه.
   */
  audit: DecisionAudit;
}

/**
 * **جوهرُ الحسم** — تأخذ معاملةَ المُستدعي فتنضمّ إليها بدل أن تفتح
 * معاملتَها الخاصّة.
 *
 * ══ ولها مستدعيان لا واحد (تصحيحٌ تشغيليّ — تقاعدُ الاعتماد المؤجَّل) ══
 * البابُ التاريخيّ `/api/discounts/:id/decide` يعمل على صفٍّ **موجودٍ
 * مسبقاً** بحالة `pending` — يفتح معاملتَه هو (`decideDiscount` أدناه).
 * والتطبيقُ الفوريّ `applyDiscountImmediately` يُدرج صفّاً `pending` **ثم
 * يحسمه فوراً بهذه الدالّة نفسها، في نفس معاملته هو** — فلا نسخةَ ثانية من
 * منطق «نفّذ ثم اختم»، ولا لحظةَ يكون الصفُّ فيها مرئياً معلَّقاً لأيّ
 * جلسةٍ أخرى (لم يُلتَزم بعد).
 */
async function decideDiscountTx(
  tx: any, params: DecideDiscountParams,
): Promise<{ request: DiscountRow; applied: any }> {
    const cur = await tx.execute(sql`
      SELECT ${COLS} FROM service_discount_requests
       WHERE id = ${params.requestId} FOR UPDATE
    `);
    const row = (cur.rows ?? [])[0];
    if (!row) throw new DiscountError("الطلب غير موجود", 404);
    const req = toRow(row);
    if (req.status !== "pending") {
      throw new DiscountError("هذا الطلب حُسم بالفعل بواسطة مستخدم آخر. حدّث الصفحة.", 409);
    }

    if (params.decision === "reject") {
      const upd = await tx.execute(sql`
        UPDATE service_discount_requests
           SET status = 'rejected', decided_at = NOW(), decided_by = ${params.actor.userId},
               decided_by_name = ${params.actor.userName},
               decision_note = ${params.note ?? null}
         WHERE id = ${params.requestId} AND status = 'pending'
        RETURNING ${COLS}
      `);
      const out = (upd.rows ?? [])[0];
      if (!out) throw new DiscountError(CONFLICT, 409);
      const rejected = toRow(out);
      await writeDecisionAudit(tx, req, rejected, "reject", params);
      return { request: rejected, applied: null };
    }

    // ══ «تعديل واعتماد»: السعرُ يُعاد حسابُه بالقاعدة نفسها ══════════════
    const changing = params.finalPrice !== undefined && params.finalPrice !== null;
    const calc = computeServiceDiscount({
      originalPrice: req.originalPrice,
      finalPrice: changing ? params.finalPrice : req.proposedFinalPrice,
      //  **ولا يصير الصفرُ تبرّعاً بالصمت**: المعتمِد الذي يخفّض إلى صفر
      //  يعلن ذلك صراحةً، وإلّا رُدّت المحاولة برسالةٍ تقول ما ينقص.
      isFree: changing ? params.isFree === true : req.isFree,
    });
    if (!calc.ok) throw new DiscountError(calc.error ?? "قيمة الخصم غير صالحة", 400);
    if (!calc.needsApproval) {
      throw new DiscountError(
        "السعر المعدَّل يساوي الأصلي — لا خصم فيه. ارفض الطلب ليكمل الاستعلامات بالسعر الطبيعي",
        400);
    }

    // ══ التنفيذُ **قبل** الختم وفي معاملته ═════════════════════════════
    //  لو سقط هنا رجعت المعاملةُ كلُّها: الصفُّ `pending` كما كان، ولا
    //  سعرٌ كُتب على المتابعة، ولا أمرُ تصنيعٍ وُلد، ولا دينارٌ قُيِّد.
    const applied = await applyApproved(req, calc.finalPrice, params.actor, tx);

    //  والختمُ في النداء نفسه الذي يقول «معتمَد» — لا بعده.
    const upd = await tx.execute(sql`
      UPDATE service_discount_requests
         SET status = 'approved', decided_at = NOW(), decided_by = ${params.actor.userId},
             decided_by_name = ${params.actor.userName},
             decision_note = ${params.note ?? null},
             approved_final_price = ${calc.finalPrice},
             is_free = ${calc.isFree},
             proposed_final_price = ${calc.finalPrice},
             discount_amount = ${calc.discountAmount},
             discount_percentage = ${calc.discountPercentage},
             reason = ${calc.isFree ? FREE_DONATION_REASON : req.reason},
             applied_at = NOW()
       WHERE id = ${params.requestId} AND status = 'pending' AND applied_at IS NULL
      RETURNING ${COLS}
    `);
    const out = (upd.rows ?? [])[0];
    if (!out) throw new DiscountError(CONFLICT, 409);
    const approved = toRow(out);
    //  **وسطرُ التدقيق في الحزمة نفسها**: بعد الختم وقبل الالتزام. فلو
    //  سقط سقط كلُّ شيء معه — ولا يُقال للمستخدم «لم يتغيّر شيء» وقد تغيّر.
    await writeDecisionAudit(tx, req, approved, "approve", params);
    return { request: approved, applied };
}

/**
 * حسمُ طلبٍ **موروثٍ قائم** — اعتماداً أو رفضاً أو تعديلاً واعتماداً.
 *
 * البابُ الوحيد الذي يُنشئ معاملتَه الخاصّة (`decideDiscountTx` تنضمّ إلى
 * معاملة مُستدعيها). يبقى للتاريخ: صفوفٌ `pending` قائمةٌ من قبل تقاعد
 * الاعتماد المؤجَّل، تُحسَم من `/api/discounts/:id/decide` كما كانت
 * دائماً — لا شيء هنا تغيّر لهذا الطريق.
 */
export async function decideDiscount(
  params: DecideDiscountParams,
): Promise<{ request: DiscountRow; applied: any }> {
  //  **معاملةٌ واحدة**: القفلُ والتنفيذُ والختم. والمساراتُ القائمة كلُّها
  //  تقبل معاملةَ مُستدعيها (`tx`) فتنضمّ إليها بدل أن تفتح معاملاتها —
  //  وهو النمطُ الذي بُني له `assignManufacturing.tx` أصلاً منذ ٠٥٣.
  return await db.transaction((tx) => decideDiscountTx(tx, params));
}

/** سطرُ تدقيق القرار — **بمعاملة الحسم**، فلا يُبتلع خطؤه. */
async function writeDecisionAudit(
  tx: any, before: DiscountRow, after: DiscountRow,
  decision: "approve" | "reject",
  params: { actor: Actor; audit: DecisionAudit },
): Promise<void> {
  await logAudit({
    entityType: "service_discount", entityId: after.id, action: "update",
    userId: params.actor.userId, userName: params.actor.userName,
    branchId: after.branchId,
    oldValues: {
      status: before.status, proposedFinalPrice: before.proposedFinalPrice,
      isFree: before.isFree,
    },
    newValues: {
      status: after.status, approvedFinalPrice: after.approvedFinalPrice,
      isFree: after.isFree, patientId: after.patientId,
      department: after.department, appliedAt: after.appliedAt,
    },
    ipAddress: params.audit.ipAddress ?? null,
    userAgent: params.audit.userAgent ?? null,
    notes: params.audit.note(after, decision),
    tx,
  });
}

/**
 * تنفيذُ الخدمة بالسعر المعتمد — **بنداءِ المسار القائم لا بنسخه**.
 *
 * • **جهازٌ بمتابعة**: يُثبَّت السعرُ على صفّ المتابعة ثم يُنادى
 *   `confirmPurchase` — وهي التي تكتب الكلفةَ والقيدَ وأمرَ التصنيع معاً
 *   منذ ترحيل ٠٥٣. فلا منطقَ بيعٍ ثانٍ يُكتب هنا.
 * • **جهازٌ بلا متابعة** (مريضٌ قديمٌ مُعفى): `assignManufacturing` مباشرةً —
 *   البابُ القائم نفسه الذي تناديه «تخصيص».
 * • **علاجٌ طبيعي**: `pricePhysiotherapy` بالسعر المعتمد، وبنودُ الجلسات
 *   كما أدخلها الموظّف — فخطّةُ الجلسات وعدّادُها لا يتغيّران بحرف.
 *
 * **والمجّانيُّ يمرّ بالمسار نفسه بكلفةٍ صفر**: خدمةٌ حقيقية وُجدت، جهازٌ
 * يُصنَّع وجلساتٌ تُشترى — وقيمتُها المالية صفر. لا دفعةَ ملفَّقة تُنشأ.
 */
async function applyApproved(
  req: DiscountRow, finalPrice: number, actor: Actor, tx: any,
): Promise<any> {
  const payload = (req.payload ?? {}) as DiscountPayload;

  //  ══ ── «خدمة جديدة» معتمَدة ── ═══════════════════════════════════════
  //  **تُنادى الدالّةُ القانونية نفسها** التي تنادِيها الخدمةُ كاملةُ السعر
  //  من نقطتها — بكلفتها وقيدها وزيارتها ودفعتها وخطّة جلساتها. ولا نسخةَ
  //  من محاسبة «خدمة جديدة» هنا: نسخةٌ ثانية كانت ستنحرف عن الأولى عند
  //  أوّل تعديل، كما انحرفت الصيانةُ قبل ٠٦٠.
  //
  //  **والبنودُ تُسعَّر بالمعتمَد لا بالجدول** — بتوزيعٍ تناسبيٍّ صحيح
  //  مجموعُه يساوي المعتمَد بالضبط، فلا فرقَ يتسرّب إلى «باقٍ على المريض»
  //  وهمّي. **والأعدادُ كما هي**: كلُّ بندٍ يبقى ممثَّلاً في عدّاد الجلسات
  //  ولو كان نصيبُه من المال صفراً.
  //
  //  (وضعُ السعر كلِّه على البند الأول — التنفيذُ الأول — كان يصفّر ما بعده،
  //  فتضيع جلساتُ كلّ بندٍ بعد الأول من عدّاد مريض المفرد.)
  if (payload.kind === "new_service") {
    const { executeNewService } = await import("../new_service/store");
    const { allocateApprovedCost } = await import("@shared/pricing");
    const src = payload.entries ?? [];
    const shares = allocateApprovedCost(
      src.map((e) => physioEntryCost({ treatmentType: e.treatmentType, sessionCount: e.sessionCount })),
      finalPrice,
    );
    const entries = src.length > 0
      ? src.map((e, i) => ({
        treatmentType: e.treatmentType,
        sessionCount: e.sessionCount,
        cost: shares[i] ?? 0,
      }))
      : null;
    const out = await executeNewService({
      patientId: req.patientId,
      serviceType: String(payload.serviceType ?? ""),
      //  **السعرُ المعتمد وحده** — من الصفّ لا من الحمولة.
      serviceCost: finalPrice,
      entries,
      notes: payload.serviceNotes ?? null,
      paymentTreatmentType: payload.paymentTreatmentType ?? null,
      sessionCount: payload.sessionCount ?? null,
      //  ══ **حقيقةُ الدفع لا السعرُ المتَّفق عليه** (تصحيحٌ تشغيليّ) ═══════
      //  كان هذا `finalPrice` — أي «خصمٌ يعني بالضرورة قبضاً كاملاً» —
      //  فيَظهر واردٌ لم يُقبَض فعلاً. الحقيقةُ حقلان مختلفان: كم اتُّفق
      //  عليه (`finalPrice`، يبقى كلفةَ الخدمة أعلاه) وكم قُبض فعلاً
      //  (`payload.initialPayment` كما دخله الموظّفُ، أو لا شيء إن غاب).
      //  **والبنودُ (`entries` أعلاه، حين توجد) تتجاهل هذا الحقل أصلاً**
      //  — دفعتُها من حصّة كلّ بندٍ المخصَّصة، كما كانت قبل هذه المرحلة
      //  بحرفها (جلساتُ العلاج الطبيعي تُحصَّل لحظتها بالتعريف).
      initialPayment: payload.initialPayment ?? null,
      isFree: req.isFree,
      actor,
      tx,
    });
    return { kind: "new_service", totalCost: finalPrice, ...out };
  }

  if (req.department === "physiotherapy") {
    const entries = (payload.entries ?? []).map((e) => ({
      treatmentType: e.treatmentType,
      sessionCount: e.sessionCount,
      //  **علمُ المجّانيّ يُمرَّر كما هو** إلى `physioEntryCost` القائمة —
      //  فلا مفهومَ ثانٍ لـ«جلسةٍ مجّانية» يُخترَع بجانب الأول.
      isFree: req.isFree,
    }));
    const totalSessions = entries.reduce((s, e) => s + e.sessionCount, 0);
    const typesJoined = Array.from(new Set(entries.map((e) => e.treatmentType))).join("، ");
    //  والكلفةُ هي **المعتمَدة** لا المحسوبةُ من الجدول: هذا هو الخصمُ نفسُه.
    //  ويبقى `physioEntryCost` مرجعَ السعر الأصلي في نقطة الطلب.
    const patient = await storage.pricePhysiotherapy(req.patientId, {
      entries, totalCost: finalPrice, totalSessions, treatmentType: typesJoined, tx,
    });
    return { kind: "physiotherapy", totalCost: finalPrice, totalSessions, patient };
  }

  //  ══ ── صيانةٌ معتمَدة ── ═════════════════════════════════════════════
  //  **تُنادى الدالّةُ القانونية نفسها** التي تنادِيها الصيانةُ العادية —
  //  بأمرها وزيارتها وقيدها وكلفتها. ولا نسخةَ من محاسبة الصيانة هنا:
  //  نسخةٌ ثانية كانت ستنحرف عن الأولى عند أوّل تعديل.
  if (payload.kind === "maintenance") {
    const { createMaintenanceOrderWithVisit } = await import("../manufacturing/store");
    const serviceType = req.department as "prosthetic" | "medical_support";
    const order = await createMaintenanceOrderWithVisit({
      patientId: req.patientId,
      branchId: req.branchId as number,
      serviceType,
      expertUserId: payload.expertUserId as number,
      expectedDeliveryDate: payload.expectedDeliveryDate ?? null,
      assignedBy: actor.userId,
      visitNotes: payload.visitNotes ?? "صيانة طرف/مسند",
      //  **وقتُ التنفيذ هو وقتُ الاعتماد** — لا يوم الطلب. فالمالُ يُقيَّد
      //  يوم وقع فعلاً، والتقريرُ اليومي يقرأه في يومه.
      visitDate: new Date(),
      //  **السعرُ المعتمد وحده** — من الصفّ لا من الحمولة.
      cost: finalPrice,
      deviceEpisodeId: payload.deviceEpisodeId ?? null,
      legacyUnrecordedDevice: payload.legacyUnrecordedDevice === true,
      maintenanceComponent: payload.maintenanceComponent ?? null,
      tx,
    });
    return { kind: "maintenance", workOrderId: order.id };
  }

  //  ── جهاز ──
  if (payload.followupId) {
    //  السعرُ يُثبَّت على الصفّ ثم يُقرأ منه تحت القفل داخل `confirmPurchase`
    //  — فلا رقمَ يمرّ عبر جسم الطلب في أي خطوة.
    await followupStore.setApprovedPriceForDiscount({
      followupId: payload.followupId, finalPrice,
      expertUserId: payload.expertUserId ?? null, actor, tx,
    });
    const out = await followupStore.confirmPurchase({
      followupId: payload.followupId, actor, tx,
      //  **الصفرُ يُقبل هنا وحده**: تبرّعٌ معتمَد صراحةً — والحارسُ العامّ
      //  «لا سعر معتمد» يبقى قائماً لكلّ نداءٍ آخر.
      allowFreeDonation: req.isFree,
      note: req.isFree ? "خدمة مجّانية معتمدة — تبرع من دكتور ياسر" : "بيع بخصم معتمد",
    });
    return { kind: "device", workOrderId: out.workOrderId, followup: out.followup };
  }

  //  **والحلقةُ تُحلّ الآن لا يوم الطلب**: بين الطلب والاعتماد قد تُفتح
  //  حلقةُ جهازٍ جديد أو تُغلق. ولو مرّرنا معرّفاً محفوظاً لأمكن أن يُخصَّص
  //  جهازٌ لحلقةٍ لم تعد قائمة — و`assignManufacturing` يردّ ٤٠٩ متى
  //  اختلف ما مُرّر عمّا هو مفتوحٌ فعلاً.
  const serviceType = req.department as "prosthetic" | "medical_support";
  const { getOpenDeviceEpisode } = await import("../device_episodes/store");
  const live = await getOpenDeviceEpisode(req.patientId, serviceType);
  const out = await storage.assignManufacturing({
    patientId: req.patientId,
    serviceType,
    fields: payload.fields ?? {},
    cost: finalPrice,
    expertUserId: payload.expertUserId as number,
    assignedBy: actor.userId,
    deviceEpisodeId: live?.id ?? null,
    tx,
  });
  return { kind: "device", workOrderId: out.workOrderId };
}

// ── التطبيقُ الفوريّ (قرارُ المالك ٢٠٢٦-٠٨-٢٨ — تقاعدُ الاعتماد المؤجَّل) ──

/**
 * **إرسالةٌ واحدة من الموظّف = خصمٌ مطبَّقٌ فوراً.**
 *
 * ══ القاعدةُ الحاكمة ═══════════════════════════════════════════════════
 * مَن يملك سلطةَ تنفيذ العملية بسعرها الكامل اليوم يملك سلطةَ تنفيذها
 * بخصمٍ أو مجّاناً — **بلا طابورٍ يخصّ الخصمَ وحده**. البوّابةُ تُفحَص في
 * نقطة الاتصال (نفسُ فحصِ العملية الكاملة تماماً) **قبل** الوصول إلى هذا
 * الملفّ؛ فحين تصل الكتابةُ إلى هنا تكون الإجازةُ قد صدرت بالفعل. **ولا
 * فحصَ ثانياً هنا**: هذه الدالّةُ لا تقرأ دوراً ولا صلاحيةً إطلاقاً — طبقةُ
 * إذنٍ ثانية كانت ستُبقي معنى الاعتماد القديم حيّاً باسمٍ آخر.
 *
 * ══ ولماذا يبقى صفٌّ في `service_discount_requests` رغم ذلك ══════════════
 * **تدقيقٌ مُهيكَل لا طابورُ عمل**: السببُ والسعران والفرقُ ومَن نفّذ ومتى —
 * يُقرأ في التقرير تماماً كما كان يُقرأ الاعتمادُ الذاتيّ قبل هذه المرحلة.
 * والصفُّ **يُدرَج ويُختَم `approved` في نفس المعاملة**، فلا يصير مرئياً
 * `pending` لأيّ جلسةٍ أخرى قط — لا فرقَ عملياً بين هذا وبين خدمةٍ بلا خصمٍ
 * إطلاقاً إلّا سطرَ التاريخ هذا.
 *
 * ══ وذرّيةٌ كاملة — **لا نصفَ كتابة، ولا صفَّ معلَّقاً بعد فشل** ═══════════
 * الإدراجُ ثم التنفيذُ ثم الختمُ ثم التدقيق **معاملةٌ واحدة** (`decideDiscountTx`
 * تنضمّ إلى معاملة هذه الدالّة). سقوطٌ في أيّ خطوة يرجع كلَّ شيء: لا خدمةَ،
 * لا كلفةَ، لا أمرَ تصنيع، لا دفعةَ، **ولا صفَّ خصمٍ ولو ناقصاً** — فلا
 * يبقى أحدٌ ينتظر شيئاً لم يقع.
 */
export interface ApplyDiscountImmediatelyParams {
  patientId: number; department: Department; caseId?: number | null;
  branchId: number | null; contextRef?: string | null;
  originalPrice: number; finalPrice?: number | null; isFree?: boolean;
  reason: string; note?: string | null;
  payload: any; actor: Actor;
  /** يُكتب داخل معاملة التطبيق نفسِها — لا بعدها. */
  audit: DecisionAudit;
}

/**
 * **جوهرُ التطبيق الفوريّ** — تأخذ معاملةَ المُستدعي فتنضمّ إليها بدل أن
 * تفتح معاملتَها الخاصّة. **نفسُ تناظر `decideDiscountTx`/`decideDiscount`
 * أعلاه بالضبط**، ولنفس السبب: مستدعٍ يحتاج التطبيقَ ذرّياً مع كتابةٍ أخرى
 * لا تخصّ الخصمَ (مثالٌ حيّ أدناه) يأخذ هذه، ومَن يكتفي بمعاملةٍ خاصّة
 * ينادي الغلافَ الرقيق تحتها.
 *
 * ══ ولماذا صارت مُصدَّرة (تصحيحٌ تشغيليّ — تذكرةُ الإرسال) ═══════════════
 * `POST /api/patients/:id/new-service` تسكّ تذكرةَ منع التكرار **قبل** أن
 * تعرف أهذه خدمةٌ مخفَّضة أم كاملةُ السعر. فإن تركت تذكرتَها تُلتَزم في
 * نداءٍ منفصل ثم فتحت معاملةَ الخصم في هذه الدالّة بنداءٍ ثانٍ، صار فشلُ
 * التطبيق (سببٌ ناقص، سعرٌ بائت، أيّ تحقّق) يُبقي التذكرةَ محجوزةً بلا
 * خدمةٍ وقعت — وإعادةُ الإرسال بعد تصحيح الخطأ تُقرأ «مسجَّلة سابقاً»
 * **كذباً**. فصارت النقطةُ تفتح معاملتَها هي، تسكّ التذكرةَ فيها، ثم تنادي
 * هذه الدالّةَ (لا الغلاف) لتشارك المعاملةَ نفسَها: فشلٌ في أيّ خطوةٍ —
 * سكِّ التذكرة، أو التحقّق، أو الكتابة — يرجع الكلَّ معاً، ولا صفَّ توكنٍ
 * يتيماً بعد فشل.
 */
export async function applyDiscountImmediatelyTx(
  tx: any, params: ApplyDiscountImmediatelyParams,
): Promise<{ request: DiscountRow; calc: ServiceDiscount; applied: any }> {
  if (!isDepartment(params.department)) {
    throw new DiscountError("القسم غير صالح", 400);
  }
  const calc = computeServiceDiscount({
    originalPrice: params.originalPrice,
    finalPrice: params.finalPrice,
    isFree: params.isFree,
  });
  if (!calc.ok) throw new DiscountError(calc.error ?? "قيمة الخصم غير صالحة", 400);
  if (!calc.needsApproval) {
    throw new DiscountError("لا يوجد خصم — أكمل الخدمة بسعرها الطبيعي مباشرة", 400);
  }
  //  **سببُ التبرّع يكتبه النظام** لا الموظّف: عبارةٌ واحدة في التقرير.
  const reason = calc.isFree ? FREE_DONATION_REASON : String(params.reason ?? "");
  if (!calc.isFree && !isDiscountReason(reason)) {
    throw new DiscountError("سبب الخصم مطلوب — اختر سبباً من القائمة", 400);
  }
  const payload = sanitizePayload(params.department, params.payload);

  // ══ **التسلسلُ مع تصحيح الطبيب لسعره** — كما كان قبل هذه المرحلة ══════
  //  البابان يحرّكان الرقمَ نفسه من طرفين: الطبيبُ يصحّح الأصلَ، والموظّفُ
  //  يطبّق خصماً **محسوباً على ذلك الأصل**. فالقفلُ على **صفّ المتابعة** —
  //  النقطةُ التي يأخذها التصحيحُ أيضاً — يمنع الخصمَ من أن يُحسَب على رقمٍ
  //  لم يعد قائماً. والصيانةُ بلا متابعة، فتمضي بلا قفلٍ زائد.
  const followupId = Number(payload?.followupId);
  if (Number.isFinite(followupId) && followupId > 0) {
    const f = await tx.execute(sql`
      SELECT approved_price, converted_work_order_id
        FROM post_exam_followups WHERE id = ${followupId} FOR UPDATE
    `);
    const row = (f.rows ?? [])[0] as any;
    if (!row) throw new DiscountError("المتابعة غير موجودة", 404);
    if (row.converted_work_order_id !== null) {
      throw new DiscountError("تم اعتماد البيع بالفعل — حدّث الصفحة", 409);
    }
    //  **ولا تطبيقَ على أساسٍ بائت**: السعرُ الأصلي المحسوب عليه الخصم
    //  يجب أن يكون هو المكتوب على الصفّ الآن، بعد القفل لا قبله.
    const live = Number(row.approved_price ?? 0);
    if (live !== calc.originalPrice) {
      throw new DiscountError(
        `تغيّر السعر الأصلي إلى ${live.toLocaleString("en-US")} د.ع أثناء الحفظ`
        + " — حدّث الصفحة وأعد حساب الخصم", 409,
      );
    }
  }

  try {
    //  **الإدراجُ `pending`، لكن بلا أن يُرى كذلك أبداً**: لا يُلتَزم إلّا
    //  بعد أن يُحسَم إلى `approved` أسطراً لاحقاً في المعاملة نفسِها — أيّ
    //  جلسةٍ أخرى لا ترى هذه المعاملةَ قبل التزامها بحكم عزل Postgres.
    const ins = await tx.execute(sql`
      INSERT INTO service_discount_requests
        (patient_id, case_id, branch_id, department, context_ref,
         original_price, proposed_final_price, discount_amount, discount_percentage,
         is_free, reason, note, status, payload, requested_by, requested_by_name)
      VALUES (${params.patientId}, ${params.caseId ?? null}, ${params.branchId},
              ${params.department}, ${params.contextRef ?? null},
              ${calc.originalPrice}, ${calc.finalPrice}, ${calc.discountAmount},
              ${calc.discountPercentage}, ${calc.isFree}, ${reason},
              ${params.note ?? null}, 'pending', ${JSON.stringify(payload)}::jsonb,
              ${params.actor.userId}, ${params.actor.userName})
      RETURNING id
    `);
    const requestId = Number((ins.rows ?? [])[0]?.id);

    //  **نفسُ جوهر الحسم** — تنفيذٌ عبر الكاتب القانونيّ ثمّ ختمٌ `approved`
    //  ثم تدقيقٌ، كلُّها في هذه المعاملة بعينها.
    const out = await decideDiscountTx(tx, {
      requestId, decision: "approve",
      note: "تطبيقٌ فوريّ — الموظّفُ مخوَّلٌ بهذه العملية أصلاً",
      actor: params.actor, audit: params.audit,
    });
    return { request: out.request, calc, applied: out.applied };
  } catch (e: any) {
    if (e?.code === "23505") {
      throw new DiscountError(
        "يوجد طلبُ خصمٍ سابقٌ معلَّقٌ لهذه العملية — أكمِله من «خصومات سابقة» أولاً", 409);
    }
    throw e;
  }
}

/**
 * **إرسالةٌ واحدة من الموظّف = خصمٌ مطبَّقٌ فوراً** — الغلافُ الرقيق.
 *
 * يفتح معاملتَه الخاصّة لمَن لا يحتاج مشاركتَها مع كتابةٍ أخرى (`/price-physio`،
 * `confirmPurchaseHandler`، `/assign-manufacturing` — الثلاثةُ الباقية بلا
 * تعديل). ومَن يحتاج الذرّيةَ مع تذكرة إرسالٍ أو كتابةٍ أخرى ينادي
 * `applyDiscountImmediatelyTx` مباشرةً بمعاملته هو (`/new-service`).
 */
export async function applyDiscountImmediately(
  params: ApplyDiscountImmediatelyParams,
): Promise<{ request: DiscountRow; calc: ServiceDiscount; applied: any }> {
  return db.transaction((tx) => applyDiscountImmediatelyTx(tx, params));
}

// ── القراءة ──────────────────────────────────────────────────────────────

const scopeClause = (scope: number[] | null) =>
  scope === null ? sql`TRUE`
    : scope.length === 0 ? sql`FALSE`
      : sql`r.branch_id IN (${sql.join(scope.map((b) => sql`${b}`), sql`, `)})`;

export async function getById(id: number): Promise<DiscountRow | null> {
  const r = await db.execute(sql`
    SELECT ${COLS} FROM service_discount_requests WHERE id = ${id}
  `);
  const row = (r.rows ?? [])[0];
  return row ? toRow(row) : null;
}

/** طابورُ الاعتماد — **المعلَّقُ افتراضاً**، فالشاشةُ عمليّةٌ لا أرشيف. */
export async function listRequests(params: {
  scope: number[] | null; status?: string;
}): Promise<any[]> {
  const status = params.status && params.status !== "all" ? params.status : "pending";
  const r = await db.execute(sql`
    SELECT r.*, p.name AS patient_name, p.patient_code, b.name AS branch_name
      FROM service_discount_requests r
      JOIN patients p ON p.id = r.patient_id
      LEFT JOIN branches b ON b.id = r.branch_id
     WHERE r.status = ${status} AND ${scopeClause(params.scope)}
       -- **والمحذوفُ يخرج من طابور الاعتماد** (ترحيل ٠٦٨): الصفُّ باقٍ
       -- بحاله ويعود بعينه عند الاستعادة، ولا يُعرَض على مُعتمِدٍ الآن.
       AND p.deleted_at IS NULL
     ORDER BY r.requested_at ASC
     LIMIT 300
  `);
  return (r.rows ?? []).map((x: any) => ({
    ...toRow(x),
    patientName: x.patient_name,
    patientCode: x.patient_code,
    branchName: x.branch_name,
  }));
}

/** طلباتُ مريضٍ واحد — للشارة «خصم بانتظار الاعتماد» في ملفّه. */
export async function listForPatient(patientId: number): Promise<DiscountRow[]> {
  const r = await db.execute(sql`
    SELECT ${COLS} FROM service_discount_requests
     WHERE patient_id = ${patientId}
     ORDER BY id DESC LIMIT 50
  `);
  return (r.rows ?? []).map(toRow);
}

/**
 * **عددُ الطابور الموروث بدقّة** — للشريط الجانبيّ ولمرجعية التحقّق قبل
 * إطلاق واتساب (لا شيء يُنشئه بعد هذه المرحلة؛ هي `COUNT(*)` حيّة على ما
 * تبقّى من قبلها فقط).
 *
 * نفسُ نطاق الفرع ونفسُ فلترة المريض المحذوف اللذين تستعملهما `listRequests`
 * — مصدرُ حقيقةٍ واحد للعدّ، لا حسابٌ ثانٍ ينحرف عنه.
 */
export async function countPendingLegacy(scope: number[] | null): Promise<number> {
  const r = await db.execute(sql`
    SELECT COUNT(*)::int AS n
      FROM service_discount_requests r
      JOIN patients p ON p.id = r.patient_id
     WHERE r.status = 'pending' AND ${scopeClause(scope)} AND p.deleted_at IS NULL
  `);
  return Number((r.rows ?? [])[0]?.n ?? 0);
}

/**
 * **السعرُ الأصلي المرجعيّ للعلاج الطبيعي** — من جدول الأسعار المشترك.
 *
 * يُحسب في الخادم لا يُقبل من العميل: وإلّا لأمكن إعلانُ سعرٍ أصليٍّ ملفَّق
 * يجعل الخصمَ يبدو صغيراً.
 */
export function physioOriginalPrice(
  entries: { treatmentType: string; sessionCount: number }[],
): number {
  return entries.reduce((s, e) => s + physioEntryCost({ ...e, isFree: false }), 0);
}
