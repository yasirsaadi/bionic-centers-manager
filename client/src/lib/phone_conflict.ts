// **قراءةُ ردّ «الرقم مسجَّل لغيره» بأسماء حامليه** (§4.ef). الخادمُ يردّ ٤٠٩ بـ`code: "patient_phone_conflict"` و`holders`، فتسأل الشاشةُ
// «الشخص نفسه أم قريبٌ له؟» بدل رسالةٍ تُغلق الباب. يقرأ الخطأَين اللذين تُخرجهما الواجهة: خطأٌ يحمل جسمَه (`useCreatePatient`
// و`useUpdatePatient`) وخطأُ `apiRequest` بنصّ «409: {…}».
import type { PhoneHolder } from "@shared/shared_phone";

export function phoneConflictOf(e: unknown): PhoneHolder[] | null {
  const err = e as any;
  let body = err?.body ?? null;
  if (!body) {
    const raw = String(err?.message ?? "").replace(/^\d+:\s*/, "");
    try { body = JSON.parse(raw); } catch { body = null; }
  }
  if (body?.code !== "patient_phone_conflict" || !Array.isArray(body.holders) || body.holders.length === 0) return null;
  return body.holders.map((h: any) => ({
    id: Number(h.id), name: String(h.name ?? ""), patientCode: h.patientCode ?? null,
    branchName: h.branchName ?? null, reachable: Boolean(h.reachable),
  }));
}
