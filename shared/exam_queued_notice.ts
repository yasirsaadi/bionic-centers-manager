// **«أصبح المريض في «معايناتي»» — العقدُ بين الخادم والواجهة** (§4.em — طلبُ المالك ٢٠٢٦-١٠-١٧).
//
// كلُّ كتابةٍ تُدخل مريضاً «معايناتي» تمرّ بـ`notifyExamRequest` (`server/staff_telegram/notify.ts`)، وهي تسجّله في سياق
// الطلب؛ وعند الردّ الناجح يُكتب الترويسةُ أدناه، والواجهةُ (`client/src/main.tsx`) تفتح نافذةً لا تُغلق إلّا بـ«حسناً».
// فلا تحتاج كلُّ شاشةٍ كوداً خاصّاً، ولا يفوت بابٌ جديد الإعلانُ.

export const EXAM_QUEUED_HEADER = "X-Exam-Queued";

export interface ExamQueuedNotice {
  patientId: number;
  /** الاسمُ والرمز كما في تنبيه تلغرام — «الاسم (الرمز)». */
  patient: string;
  /** اسمُ القسم بالعربية — «الأطراف الصناعية» · «المساند الطبية» · «العلاج الطبيعي». */
  department: string;
}

const sameNotice = (a: ExamQueuedNotice, b: ExamQueuedNotice) => a.patientId === b.patientId && a.department === b.department;

/** يضمّ الجديدَ إلى القائم بلا تكرار — المريضُ نفسُه في القسم نفسِه سطرٌ واحد، والترتيبُ ترتيبُ الوصول. */
export function mergeExamQueued(current: ExamQueuedNotice[], incoming: ExamQueuedNotice[]): ExamQueuedNotice[] {
  const out = [...current];
  for (const n of incoming) if (!out.some((o) => sameNotice(o, n))) out.push(n);
  return out;
}

/** الترويسةُ نصٌّ لاتينيّ — فالعربيةُ تُرمَّز. */
export function encodeExamQueued(list: ExamQueuedNotice[]): string {
  return encodeURIComponent(JSON.stringify(list));
}

/** قراءةٌ لا ترمي: ترويسةٌ تالفة أو غريبة ⟵ قائمةٌ فارغة، وما لا يطابق الشكلَ يسقط وحده. */
export function decodeExamQueued(raw: string | null | undefined): ExamQueuedNotice[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(decodeURIComponent(raw));
    if (!Array.isArray(v)) return [];
    return mergeExamQueued([], v.filter((n: any): n is ExamQueuedNotice =>
      n && Number.isInteger(n.patientId) && n.patientId > 0
        && typeof n.patient === "string" && n.patient.trim() !== ""
        && typeof n.department === "string"));
  } catch {
    return [];
  }
}
