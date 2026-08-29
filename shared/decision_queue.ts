// طابورُ «بانتظار الحسم / تم الحسم» — منطقٌ خالص مشترك بين الخادم والواجهة.
// (المرحلة الخامسة، ٢٠٢٦-٠٨-٢٨)
//
// ══ قراءةٌ جديدة فوق حقائق قائمة — لا حالةً تجاريةً جديدة ═══════════════
// الفرزُ بين التبويبين يُشتقّ من `FollowupStatus` وحدها (`shared/followup.ts`)
// — لا `isResolved` ولا حالةَ طابورٍ منفصلة تُخترَع هنا. وهذا الملفّ يحمل ما
// تبقّى: تسميةَ لقطة الدور عند الحسم، وعنوانَ الصفحة وفرعيّته ونصوصَ التبويبين
// — بلا مصطلحاتٍ تقنية («followup»، «converted»، «purchase_approval_pending»)
// تصل الموظّفَ العاديّ.

import { TERMINAL_STATUSES, type FollowupStatus } from "./followup";

// ── بانتظارٌ / حُسم — من الحالة الحالية وحدها ─────────────────────────────

/**
 * **بانتظارٌ** = مفتوحةٌ عملياتياً وليست طرفيّةً بعد.
 *
 * لا يُقرأ من `purchaseDecision` وحده: صفٌّ «لم يشترِ» قد يُعاد فتحه لاحقاً،
 * والحالةُ الحاليّة — لا لقطةُ قرارٍ قديمة — هي ما يقول إن الملفَّ ينتظر
 * حسماً مجدداً أم لا.
 */
export function isWaitingStatus(status: string): boolean {
  return !TERMINAL_STATUSES.includes(status as FollowupStatus);
}

/**
 * **الحالتان التجاريّتان اللتان تُعدّان «حُسمتا»** — لا كلّ حالةٍ طرفيّة.
 *
 * `closed_exam_cancelled` و`closed_admin_void` طرفيّتان أيضاً، لكنّهما
 * وقائعُ تاريخيّة/إدارية لا قرارَ شراءٍ من المريض — فلا تُعرَضان في تبويبَي
 * «بانتظار الحسم» و«تم الحسم» ولا تُوسَمان بيعاً أو رفضاً لم يقعا.
 */
export const RESOLVED_STATUSES: FollowupStatus[] = ["converted", "closed_without_purchase"];

export function isResolvedStatus(status: string): boolean {
  return (RESOLVED_STATUSES as readonly string[]).includes(status);
}

export type DecisionQueueResult = "bought" | "not_bought";

/** النتيجةُ المقروءة — `null` لأيّ حالةٍ ليست إحدى الحالتين المحسومتين. */
export function decisionQueueResultOf(status: string): DecisionQueueResult | null {
  if (status === "converted") return "bought";
  if (status === "closed_without_purchase") return "not_bought";
  return null;
}

export const DECISION_QUEUE_RESULT_LABELS: Record<DecisionQueueResult, string> = {
  bought: "تم الشراء",
  not_bought: "لم يشترِ",
};

// ── لقطةُ الدور عند الحسم ────────────────────────────────────────────────
//
// ══ لماذا لقطة، لا اشتقاقاً لاحقاً من `system_users.role` ══════════════════
// دورُ المستخدم يتغيّر: محاسبٌ يصير مديرَ فرع، ومديرٌ يُنقَل. فقراءةُ الدور
// الحاليّ لحدثٍ وقع قبل أشهر تكذب على القارئ. **واللقطةُ تُؤخَذ من الجلسة
// الموقَّعة لحظةَ الحسم نفسِها** — لا يُسأل عنها الموظّف، ولا تُخمَّن لاحقاً.
export const ACTOR_ROLE_SNAPSHOT_VALUES = [
  "reception", "accountant", "branch_manager", "global_admin",
] as const;
export type ActorRoleSnapshot = (typeof ACTOR_ROLE_SNAPSHOT_VALUES)[number];

export function isActorRoleSnapshot(v: unknown): v is ActorRoleSnapshot {
  return typeof v === "string"
    && (ACTOR_ROLE_SNAPSHOT_VALUES as readonly string[]).includes(v);
}

export const ACTOR_ROLE_LABELS: Record<ActorRoleSnapshot, string> = {
  reception: "الاستعلامات",
  accountant: "المحاسب",
  branch_manager: "مدير الفرع",
  global_admin: "المسؤول العام",
};

/**
 * لحدثٍ تاريخيّ سابقٍ للمرحلة الخامسة لم يحمل لقطةَ دور — **لا تخمين**.
 *
 * كانت «—» — وهي صادقة لكنها مبهمة: الموظّف يقرأ فراغاً ولا يعرف أهو
 * عطبٌ أم واقعٌ متوقَّع. فصارت عبارةً تقول **لماذا** الحقلُ فارغ صراحةً.
 * **ولا يُشتقّ الدورُ من `system_users.role` الحاليّ تعويضاً عنها** — ذاك
 * بالضبط ما ترفضه اللقطةُ أصلاً (انظر التعليق أعلاه)، ولا يُملأ الفراغُ
 * بترحيلٍ يخمّن ماضياً لم يُسجَّل.
 */
export const UNKNOWN_ROLE_LABEL = "غير مسجلة تاريخياً";

/** نصٌّ عربيٌّ يُقرأ — رمزٌ داخليّ لا يصل الشاشة أبداً. */
export function actorRoleLabel(v: unknown): string {
  return isActorRoleSnapshot(v) ? ACTOR_ROLE_LABELS[v] : UNKNOWN_ROLE_LABEL;
}

/**
 * **لقطةُ الدور تُشتقّ من الجلسة الموقَّعة نفسِها** — لا مُدخَلاً من العميل
 * ولا مُخمَّناً لاحقاً.
 *
 * `isAdmin` تُفحَص أوّلاً وبلا شرط (نفسُ قاعدة كلّ بوّابةٍ في هذا المسار):
 * مسؤولٌ يحمل دوراً آخر (طبيباً أو غيره) يُختَم `global_admin` — سلطتُه لا
 * دورُه هي السبب. **ولا دورَ اسمُه «الطبيبُ المسؤول» يُخترَع هنا ولا في أيّ
 * مكانٍ آخر** — ولا هويّةٌ مكتوبةٌ في الكود.
 */
export function actorRoleSnapshotOf(
  session: { role?: string | null; isAdmin?: boolean | null } | null | undefined,
): ActorRoleSnapshot | null {
  if (session?.isAdmin === true) return "global_admin";
  return isActorRoleSnapshot(session?.role) ? (session!.role as ActorRoleSnapshot) : null;
}

// ── نصوصُ الصفحة — بلا مصطلحاتٍ تقنية ────────────────────────────────────

export const DECISION_QUEUE_SIDEBAR_LABEL = "بانتظار الحسم";
export const DECISION_QUEUE_PAGE_TITLE = "بانتظار الحسم";
export const DECISION_QUEUE_PAGE_SUBTITLE =
  "المرضى الذين تمت معاينتهم ولم يُحسم بعد هل اشتروا أم لا.";
export const DECISION_QUEUE_TAB_WAITING = "بانتظار الحسم";
export const DECISION_QUEUE_TAB_RESOLVED = "تم الحسم";

// ── التصنيف — طرفٌ صناعي / مسند طبي، من `service_type` القائم وحده ───────

export const DECISION_QUEUE_SERVICE_LABELS: Record<string, string> = {
  prosthetic: "طرف صناعي",
  medical_support: "مسند طبي",
};
export const DECISION_QUEUE_SERVICE_FILTERS: Array<{ key: string; label: string }> = [
  { key: "all", label: "الكل" },
  { key: "prosthetic", label: "طرف صناعي" },
  { key: "medical_support", label: "مسند طبي" },
];

export type DecisionQueueState = "waiting" | "resolved";
export function isDecisionQueueState(v: unknown): v is DecisionQueueState {
  return v === "waiting" || v === "resolved";
}
