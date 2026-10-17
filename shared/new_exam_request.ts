// **«طلب معاينة جديدة» من الاستعلامات** (§4.el — ٢٠٢٦-١٠-١٧) — مفرداتٌ مشتركةٌ بين الخادم والشاشة، منطقٌ خالص.
//
// الأقسامُ الثلاثة: استمارةُ الأطراف أو المساند تفتح طلبَ جهازٍ على مسار المعاينة، واستمارةُ العلاج الطبيعي تفتح طلبَ معاينةٍ كاملة (ترحيل ١٥٤).
import { REFERRAL_SUB_OTHER, REFERRAL_SUB_SOURCES } from "./intake_sheet";

export const NEW_EXAM_REQUEST_DEPARTMENTS = ["prosthetic", "medical_support", "physiotherapy"] as const;
export type NewExamRequestDepartment = (typeof NEW_EXAM_REQUEST_DEPARTMENTS)[number];

export const isNewExamRequestDepartment = (v: unknown): v is NewExamRequestDepartment =>
  typeof v === "string" && (NEW_EXAM_REQUEST_DEPARTMENTS as readonly string[]).includes(v);

/** نصُّ الزرّ — «طلب» لا «كتابة»: الاستعلاماتُ ترسل، والفاحصُ يكتب («معاينة جديدة» زرُّه هو). */
export const NEW_EXAM_REQUEST_LABEL = "طلب معاينة جديدة";

/** أقسامُ ملفّ المريض التي يُطلب لها — بأعلامه، بترتيب الاستمارات. */
export function newExamDepartmentsOf(p: { isAmputee?: boolean | null; isMedicalSupport?: boolean | null; isPhysiotherapy?: boolean | null }): NewExamRequestDepartment[] {
  const out: NewExamRequestDepartment[] = [];
  if (p.isAmputee) out.push("prosthetic");
  if (p.isMedicalSupport) out.push("medical_support");
  if (p.isPhysiotherapy) out.push("physiotherapy");
  return out;
}

/**
 * **«كيف عرف الشخص الآخر بالمركز» المحفوظ ⟵ خانتا الاستمارة** — ما في القائمة يُختار، وما سواه «أخرى» بنصّه.
 * فالاستمارةُ تُفتح على ما في الملفّ كما هو، ولا يُعدّ فتحُها تغييراً.
 */
export function referralSubSourceChoice(stored: string | null | undefined): { choice: string; other: string } {
  const v = (stored ?? "").trim();
  if (!v) return { choice: "", other: "" };
  return (REFERRAL_SUB_SOURCES as readonly string[]).includes(v) ? { choice: v, other: "" } : { choice: REFERRAL_SUB_OTHER, other: v };
}

/**
 * **ما تغيّر في الاستمارة عمّا فُتحت عليه** — يُرسَل وحده، فلا يُكتب في الملفّ ولا في التدقيق ما لم يلمسه الموظّف.
 * بالقيمة بعد التشذيب (و`null` والفراغُ سواء)؛ والخادمُ يعيد الحكمَ بقاعدته (`editValueChanged`). وتاريخُ الإصابة وحالتُه زوج.
 */
export function changedSheetValues(opened: Record<string, unknown>, current: Record<string, unknown>): Record<string, unknown> {
  const norm = (v: unknown) => (v === null || v === undefined ? "" : typeof v === "string" ? v.trim() : JSON.stringify(v));
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(current)) if (norm(opened[k]) !== norm(current[k])) out[k] = current[k];
  if ("injuryDate" in out || "injuryDateStatus" in out) {
    out.injuryDate = current.injuryDate ?? null;
    out.injuryDateStatus = current.injuryDateStatus ?? null;
  }
  return out;
}
