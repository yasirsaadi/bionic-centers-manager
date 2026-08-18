// توجيهُ الخدمات الفعلية إلى الطبيب — **نقطةُ نداءٍ واحدة للمسارات كلّها**.
//
// ══ العطبُ الذي يغلقه هذا الملفّ ═══════════════════════════════════════
// أوّلُ تنفيذٍ للمراجعة جعل الإرسالَ **زرّاً** في صفحة المريض. ومعناه أن
// وصولَ حالةٍ إلى الطبيب يتوقّف على أن **يتذكّر الموظّف** — بعد أن أنهى
// عمله وأغلق نافذته — أن يفتح صفحةً أخرى ويضغط زرّاً ثالثاً. وما يعتمد على
// التذكّر لا يقع: الملفُّ الذي لا يُرسَل لا يُرى، ومَن لا يُرى لا يُعالَج.
//
// فالتوجيه صار **جزءاً من الخدمة نفسها**: كلُّ مسارٍ يفتح جهازاً أو يصونه
// أو يسجّل زيارتَه ينادي هذا الملفّ في نفس الطلب، فيولد طلبُ المراجعة مع
// الخدمة لا بعدها بساعة.
//
// ══ ولا منطق عملٍ جديد هنا ═════════════════════════════════════════════
// هذا **جسرٌ لا طبقة**: يقرأ نطاقَ الجلسة، ويترجم أسماء أنواع الحالات إلى
// مفردات المراجعة، وينادي `ensureReviewRouting`. القواعد كلُّها — منع
// السريع للجهاز الجديد، ومنعُ العلاج الطبيعي، وحارسُ التكرار — في الطبقة
// وفي القاعدة، لا هنا.

import { ensureReviewRouting, type ReviewRow } from "./store";
import { isReviewKind, isReviewPath, requiresFullPath } from "@shared/medical_review";

type Req = any;

/** نطاقُ فروع المنادي — `null` للمسؤول. نفس الصيغة المستعملة في كل الوحدات. */
export function reviewBranchScope(req: Req): number[] | null {
  const s = (req?.session as any)?.branchSession;
  if (s?.isAdmin) return null;
  const accessible = Array.isArray(s?.accessibleBranches) ? (s.accessibleBranches as number[]) : [];
  if (accessible.length > 0) return accessible;
  return s?.branchId ? [s.branchId] : [];
}

/** نوعُ الحالة كما تسمّيه بقيةُ النظام ⟶ اختصاصُ المراجعة. والعلاج الطبيعي `null`. */
export function reviewServiceOfCaseType(caseType: unknown): "prosthetic" | "medical_support" | null {
  //  «amputee» اسمُ العلم في نموذج التسجيل، و«prosthetic» اسمُ نوع الحالة.
  //  الاثنان يشيران إلى الشيء نفسه، والمراجعة تعرف الثاني.
  if (caseType === "amputee" || caseType === "prosthetic") return "prosthetic";
  if (caseType === "medical_support") return "medical_support";
  return null;
}

/**
 * تصنيفُ الاستقبال كما وصل من النموذج — **مع افتراضٍ آمن لا صامت**.
 *
 * الافتراضُ `quick` لأن أكثر زيارات الجهاز متابعةٌ وصيانة، ولأن **الطبيب
 * يبقى صاحب القرار**: يوافق أو يُحيل إلى معاينةٍ كاملة. فخطأ التصنيف يمرّ
 * على عينِ طبيبٍ لا على أحد.
 *
 * **وما يستوجب الكامل يُرفَع إليه هنا أيضاً**: عميلٌ قديم أو نموذجٌ نُسي
 * فأرسل «جهازاً جديداً سريعاً» لا يُردّ طلبُه بخطأ — يُصحَّح مسارُه. والردُّ
 * الصريح يبقى في النقطة العلنية حيث يختار إنسانٌ صراحةً.
 */
export function classifyFromBody(
  body: any,
  fallbackKind: string,
): { reviewKind: string; requestedPath: string; receptionNote: unknown } {
  const rawKind = body?.reviewKind;
  const reviewKind = isReviewKind(rawKind) ? rawKind : fallbackKind;
  const rawPath = body?.reviewPath ?? body?.requestedPath;
  let requestedPath = isReviewPath(rawPath) ? rawPath : "quick";
  if (requiresFullPath(reviewKind)) requestedPath = "full";
  return { reviewKind, requestedPath, receptionNote: body?.reviewNote ?? body?.receptionNote ?? null };
}

export interface RoutingResult {
  created: boolean;
  request: ReviewRow | null;
}

/**
 * التوجيه من داخل مسارِ خدمة.
 *
 * **يُنادى بعد نجاح الخدمة** لأن المرساة (الحلقة، الأمر، الزيارة) لا توجد
 * قبلها. والفشلُ يُرمى إلى المنادي: لا يُبتلَع، فطلبٌ ضائع يعني مريضاً لا
 * يراه أحد — وهو العطب نفسه الذي جاء هذا الملفّ يغلقه.
 */
export async function routeServiceToDoctorReview(req: Req, params: {
  patientId: number;
  /** نوع الحالة بأي من تسميتيه — `amputee`/`prosthetic`/`medical_support`. */
  caseType: unknown;
  reviewKind: string;
  requestedPath: string;
  receptionNote?: unknown;
  deviceEpisodeId?: number | null;
  workOrderId?: number | null;
  visitId?: number | null;
}): Promise<RoutingResult> {
  const serviceType = reviewServiceOfCaseType(params.caseType);
  if (!serviceType) return { created: false, request: null };
  const s = (req?.session as any)?.branchSession;
  return await ensureReviewRouting({
    patientId: params.patientId,
    serviceType,
    reviewKind: params.reviewKind,
    requestedPath: params.requestedPath,
    receptionNote: params.receptionNote,
    deviceEpisodeId: params.deviceEpisodeId ?? null,
    workOrderId: params.workOrderId ?? null,
    visitId: params.visitId ?? null,
    createdBy: (s?.userId ?? null) as number | null,
    branchIds: reviewBranchScope(req),
  });
}
