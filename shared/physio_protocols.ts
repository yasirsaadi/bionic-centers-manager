// **مكتبةُ بروتوكولات العلاج الطبيعي** (ترحيل ١٠٦، §4.cj — المرحلةُ الثانية من خطّة العلاج الطبيعي، ٢٠٢٦-١٠-٠٧).
//
// قراراتُ المالك:
//   • البروتوكولاتُ من مصادر عالمية موثوقة، **ولكلّ جهازٍ في البروتوكول درجةُ دليل** — ومنذ ترحيل ١٢٢ «استعمالُ المركز» بجانبها (أدناه).
//   • **يعدّلها ويضيفها ويؤرشفها تعديلاً دائماً** المشرفُ العام (سليم) والطبيبُ المسؤول (المالك) وحدهما — **وأخصائيُّ العلاج الطبيعي يعدّل
//     نسخةَ مريضه في خطّته** ولا يمسّ البروتوكول (قرارُ المالك ٢٠٢٦-١٠-١٠، §4.dd؛ وكان الأخصائيُّ يعدّل البروتوكولَ فيعود مسوّدةً للجميع).
//   • **والمسوّداتُ تُراجَع**: لا تصير «معتمَدة» إلّا بالمشرف العام أو المسؤول.
//   • **توفّرُ الأجهزة بالفرع**: بغداد وذي قار فيهما علاجٌ طبيعي اليوم، وكربلاء والموصل يُفعَّلان لاحقاً — ويُرى ذلك في البروتوكول.
//   • **والإبرُ الجافة** لا يطبّقها إلّا حاملُ علَمها (§4.cg) — يُعلَّم ذلك عند الجهاز `needle`.
import { hasPhysioRole, hasRole, type RoleHolder } from "./user_roles";

export const EVIDENCE_LEVELS = ["recommended", "optional", "not_recommended"] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];
//  **«درجةُ الدليل»** (قرارُ المالك ٢٠٢٦-١٠-٠٩، §4.cx): صادقةٌ بمصدرها **ولا تمنع شيئاً** — والذي يحكم الخطّة «استعمالُ المركز» أدناه.
//  (الرموزُ المخزَّنة كما كانت؛ الألفاظُ وحدها صارت تقول الدليلَ لا القرار.)
export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  recommended: "دليلٌ قويّ",
  optional: "دليلٌ محدود أو متضارب",
  not_recommended: "الإرشاداتُ ضدّه روتينياً",
};
export const isEvidenceLevel = (v: unknown): v is EvidenceLevel =>
  typeof v === "string" && (EVIDENCE_LEVELS as readonly string[]).includes(v);

/**
 * **«استعمالُ المركز»** (ترحيل ١٢٢، §4.cx — قرارُ المالك ٢٠٢٦-١٠-٠٩): يقرّره سليم، وهو وحده ما يحكم الخطّة.
 * أساسيٌّ ⟵ في كلّ جلسة · مساعدٌ ⟵ يتناوب: جهازٌ مساعدٌ واحدٌ في كلّ جلسة («جلساتُنا ٥٠ دقيقة فقط») · لا يُستخدم ⟵ لا يدخل الخطّة.
 */
export const CENTRE_USES = ["core", "adjunct", "not_used"] as const;
export type CentreUse = (typeof CENTRE_USES)[number];
export const CENTRE_USE_LABELS: Record<CentreUse, string> = { core: "أساسيّ", adjunct: "مساعد", not_used: "لا يُستخدم" };
export const CENTRE_USE_LABELS_EN: Record<CentreUse, string> = { core: "Core", adjunct: "Adjunct", not_used: "Not used" };
export const CENTRE_USE_HINTS: Record<CentreUse, string> = {
  core: "في كلّ جلسة", adjunct: "يتناوب — جهازٌ مساعدٌ واحد في كلّ جلسة", not_used: "لا يدخل خطّةَ المريض",
};
export const CENTRE_USE_HINTS_EN: Record<CentreUse, string> = {
  core: "Every session", adjunct: "Rotates — one adjunct device per session", not_used: "Not added to patient plans",
};
export const isCentreUse = (v: unknown): v is CentreUse => typeof v === "string" && (CENTRE_USES as readonly string[]).includes(v);

/**
 * استعمالُ المركز لجهاز بروتوكول — المكتوبُ، **وإلّا يُشتقّ من درجة الدليل كما كانت تحكم الخطّة قبل ترحيل ١٢٢**: موصى به ⟵ أساسيّ ·
 * اختياري ⟵ مساعد · غير موصى به ⟵ لا يُستخدم. فالبروتوكولاتُ التي لم يقرّر فيها سليم بعد لا يتغيّر ما يدخل خطّتَها.
 */
export function centreUseOf(row: { centreUse?: unknown; evidence?: unknown }): CentreUse {
  if (isCentreUse(row.centreUse)) return row.centreUse;
  return row.evidence === "recommended" ? "core" : row.evidence === "optional" ? "adjunct" : "not_used";
}

/** سقفُ عدد الجلسات في البروتوكول والخطّة (ترحيل ١٢٣). */
export const TOTAL_SESSIONS_MAX = 300;
export interface DoseLike { sessionsPerWeek: number | null; durationWeeks: number | null; totalSessions: number | null }

/**
 * **عددُ الجلسات أساسُ الجرعة** (ترحيل ١٢٣، §4.dd — قرارُ المالك: «٢٤ جلسة يومياً عدا الجمعة… وفي بعض الحالات ٥ في الأسبوع»):
 * مع جلسات الأسبوع تُشتقّ الأسابيع (٢٤ ÷ ٦ = ٤، و٢٤ ÷ ٥ ⟵ ٥) فلا يتناقض الرقمان؛ وبلا عددٍ يُحسب من الأسبوع × الأسابيع — فالقديمُ بمعناه.
 */
export function normalizeDose<T extends DoseLike>(d: T): T {
  if (d.totalSessions && d.sessionsPerWeek) return { ...d, durationWeeks: Math.ceil(d.totalSessions / d.sessionsPerWeek) };
  if (!d.totalSessions && d.sessionsPerWeek && d.durationWeeks) {
    return { ...d, totalSessions: Math.min(d.sessionsPerWeek * d.durationWeeks, TOTAL_SESSIONS_MAX) };
  }
  return d;
}

/** المدّةُ المشتقّة لا تتجاوز ١٠٤ أسابيع (قيدُ العمود) — فعددٌ كبيرٌ بتواترٍ قليل يُردّ برسالةٍ لا بخطأ قاعدة. */
export const DURATION_WEEKS_MAX = 104;
export function doseError(d: DoseLike): string | null {
  return d.durationWeeks != null && d.durationWeeks > DURATION_WEEKS_MAX
    ? `عددُ الجلسات مع جلسات الأسبوع يعطي أكثرَ من ${DURATION_WEEKS_MAX} أسبوعاً — زِد جلساتِ الأسبوع أو قلّل العدد` : null;
}

/** بندُ خطّة: مساعدٌ أو أساسيّ — و`NULL` (خططٌ قبل ترحيل ١٢٢) أساسيٌّ كما كان يُنفَّذ في كلّ جلسة. */
export const planLineUse = (v: unknown): "core" | "adjunct" => (v === "adjunct" ? "adjunct" : "core");

/**
 * **دورُ الجهاز المساعد في الجلسة القادمة**: المساعدون بترتيبهم في الخطّة، والجلسةُ رقم (ما سُجّل قبلها + ١) — الأوّلُ في الجلسة الأولى،
 * والثاني في الثانية، ثمّ يعود الدور. `null` بلا مساعد.
 */
export function adjunctTurn(adjunctDeviceIds: readonly number[], sessionsSoFar: number): number | null {
  if (!adjunctDeviceIds.length) return null;
  const n = adjunctDeviceIds.length;
  const k = Math.max(0, Math.trunc(sessionsSoFar));
  return adjunctDeviceIds[k % n];
}

/** ملاحظةُ البند المساعد الذي ليس دورَه — تُكتب مع الجلسة بدل «سبب عدم التنفيذ». */
export const ADJUNCT_OFF_TURN_NOTE = "مساعدٌ بالتناوب — ليس دورَه هذه الجلسة";

export const AGE_GROUPS = ["pediatric", "adult", "geriatric", "all"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];
export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  pediatric: "أطفال",
  adult: "بالغون",
  geriatric: "كبار السن",
  all: "كل الأعمار",
};
export const isAgeGroup = (v: unknown): v is AgeGroup => typeof v === "string" && (AGE_GROUPS as readonly string[]).includes(v);

export const PROTOCOL_CATEGORIES = [
  "spine", "upper_limb", "lower_limb", "neurological", "post_surgical", "amputation", "rheumatologic", "other",
] as const;
export type ProtocolCategory = (typeof PROTOCOL_CATEGORIES)[number];
export const PROTOCOL_CATEGORY_LABELS: Record<ProtocolCategory, string> = {
  spine: "العمود الفقري",
  upper_limb: "الطرف العلوي",
  lower_limb: "الطرف السفلي",
  neurological: "عصبية",
  post_surgical: "ما بعد العمليات",
  amputation: "البتر والأطراف",
  rheumatologic: "روماتيزمية ومزمنة",
  other: "أخرى",
};
export const isProtocolCategory = (v: unknown): v is ProtocolCategory =>
  typeof v === "string" && (PROTOCOL_CATEGORIES as readonly string[]).includes(v);

export const PROTOCOL_STATUS_LABELS = { draft: "مسوّدة — بانتظار المراجعة", approved: "معتمَد" } as const;
export type ProtocolStatus = keyof typeof PROTOCOL_STATUS_LABELS;

/** رمزُ جهاز الإبر الجافة — لا يطبّقه إلّا حاملُ `canDryNeedle`. */
export const DRY_NEEDLING_DEVICE_CODE = "needle";

/** الجلسةُ كما تصل القواعد: الأدوارُ والصلاحياتُ والمسؤولية. */
export interface ProtocolSessionLike extends RoleHolder {
  isAdmin?: boolean | null;
  permissions?: { canSupervisePhysio?: boolean | null; canWriteMedicalExam?: boolean | null } | null;
}

/**
 * **يكتب خططَ المرضى** — ويعدّل فيها لمريضه كلَّ ما أخذه من البروتوكول (الأجهزة والتمارين وعددَ الجلسات ووقتَها والتكراراتِ وإعداداتِ الأجهزة):
 * المسؤول، والمشرفُ العام، وأخصائيُّ العلاج الطبيعي.
 */
export function canWritePatientPlans(s: ProtocolSessionLike | null | undefined): boolean {
  if (!s) return false;
  return s.isAdmin === true || s.permissions?.canSupervisePhysio === true || hasRole(s, "physio_specialist");
}

/**
 * **يعدّل البروتوكولَ الأساسيّ تعديلاً دائماً** (ويضيف ويؤرشف، ومعه بطاقاتُ التمارين والمقاييسُ والصور): المشرفُ العام والمسؤول وحدهما —
 * قرارُ المالك (٢٠٢٦-١٠-١٠، §4.dd): «التعديلُ إمّا دائميٌّ من قبل سليم فقط، أو لبرنامجٍ اختير لمريضٍ ويخصّه فقط دون تأثّر البروتوكول».
 * فالأخصائيُّ يعدّل نسخةَ مريضه في خطّته (`canWritePatientPlans`)، والبروتوكولُ لا يعود مسوّدةً للجميع بتعديلٍ لمريضٍ واحد.
 */
export function canEditProtocols(s: ProtocolSessionLike | null | undefined): boolean {
  return canApproveProtocols(s);
}

/** **يعتمد** المسوّدة: المسؤولُ والمشرفُ العام وحدهما. */
export function canApproveProtocols(s: ProtocolSessionLike | null | undefined): boolean {
  if (!s) return false;
  return s.isAdmin === true || s.permissions?.canSupervisePhysio === true;
}

/**
 * **يستشير** المكتبة — ويسأل المساعدَ عنها: المسؤول، والمشرفُ العام، والأخصائيّ، والطبيب (أو كاتبُ المعاينة)، ومديرُ الفرع.
 * قرارُ المالك (٢٠٢٦-١٠-٠٧): «هذا الجوابُ يصير فقط للمختصّين والمدراء والمسؤولين والأطباء» — فالمنفّذون (معالجٌ وتقنيّ ومدرّب)
 * يقرؤون الصفحةَ ولا يسألون المساعدَ «أنطني خطّته وأجهزته».
 */
export function canConsultProtocols(s: ProtocolSessionLike | null | undefined): boolean {
  if (!s) return false;
  return canWritePatientPlans(s) || hasRole(s, "doctor") || s.permissions?.canWriteMedicalExam === true || hasRole(s, "branch_manager");
}

/** **يقرأ** صفحةَ المكتبة: مَن يستشيرها، ومعهم أدوارُ القسم كلُّها. */
export function canReadProtocols(s: ProtocolSessionLike | null | undefined): boolean {
  if (!s) return false;
  return canConsultProtocols(s) || hasPhysioRole(s);
}

/** **يضبط توفّرَ الأجهزة بالفروع**: المسؤولُ والمشرفُ العام. */
export function canManageDeviceAvailability(s: ProtocolSessionLike | null | undefined): boolean {
  return canApproveProtocols(s);
}

/**
 * **تعديلُ المعتمَد يعيده مسوّدة** ما لم يكن المعدِّلُ ممّن يعتمد — فلا يتغيّر بروتوكولٌ معتمَد بيد أخصائيٍّ ويبقى «معتمَداً»
 * بلا مراجعة. والمسوّدةُ تبقى مسوّدة.
 */
export function statusAfterEdit(current: ProtocolStatus, editor: ProtocolSessionLike | null | undefined): ProtocolStatus {
  return current === "approved" && canApproveProtocols(editor) ? "approved" : "draft";
}

/** مرجعٌ عالميّ للبروتوكول. */
export interface ProtocolReference { title: string; org?: string | null; year?: number | null; url?: string | null }

/** يطبّع قائمة المراجع من الطلب: عنوانٌ إلزاميّ، ورابطٌ إن وُجد يبدأ بـ http(s). */
export function normalizeReferences(input: unknown): ProtocolReference[] | null {
  if (!Array.isArray(input)) return null;
  const out: ProtocolReference[] = [];
  for (const r of input.slice(0, 30)) {
    if (!r || typeof r !== "object") return null;
    const title = typeof (r as any).title === "string" ? (r as any).title.trim().slice(0, 400) : "";
    if (!title) return null;
    const url = typeof (r as any).url === "string" && (r as any).url.trim() ? (r as any).url.trim().slice(0, 1000) : null;
    if (url && !/^https?:\/\//i.test(url)) return null;
    const org = typeof (r as any).org === "string" && (r as any).org.trim() ? (r as any).org.trim().slice(0, 200) : null;
    const yearN = Number((r as any).year);
    const year = Number.isInteger(yearN) && yearN >= 1950 && yearN <= 2100 ? yearN : null;
    out.push({ title, org, year, url });
  }
  return out;
}

// ── اللغة (ترحيل ١٠٨، §4.cj) ─────────────────────────────────────────────────
// قرارُ المالك: الطبيبُ يقرأ بالإنكليزية والمعالجُ بالعربية — فلكلّ نصٍّ نسختان، والقارئُ يختار. **والعربيةُ تحفظ المصطلحَ الإنكليزيّ
// بين قوسين.** والنسخةُ الغائبة تقع على الأخرى (لا حقلَ فارغٌ لأن أحداً لم يترجمه بعد) — ويُقال ذلك للقارئ.
export const PROTOCOL_LANGS = ["ar", "en"] as const;
export type ProtocolLang = (typeof PROTOCOL_LANGS)[number];
export const isProtocolLang = (v: unknown): v is ProtocolLang => v === "ar" || v === "en";

/** النصوصُ ذاتُ النسختين — والإنكليزيةُ في `<field>En`. */
export const PROTOCOL_TEXT_FIELDS = ["summary", "goals", "assessment", "exercises", "contraindications", "precautions"] as const;
export type ProtocolTextField = (typeof PROTOCOL_TEXT_FIELDS)[number];

const blank = (v: unknown) => typeof v !== "string" || !v.trim();

/**
 * النصُّ باللغة المختارة، وإلّا الأخرى. `fallback` صادقٌ حين عُرضت الأخرى — فتقول الشاشةُ «لم تُكتب الإنكليزية بعد».
 * يعمل للبروتوكول (`summary`/`summaryEn` …) ولسطر الجهاز (`parameters`/`parametersEn` · `note`/`noteEn`).
 */
export function localizedText(row: Record<string, any> | null | undefined, field: string, lang: ProtocolLang): { text: string | null; fallback: boolean } {
  const ar = row?.[field];
  const en = row?.[`${field}En`];
  const [want, other] = lang === "en" ? [en, ar] : [ar, en];
  if (!blank(want)) return { text: want, fallback: false };
  if (!blank(other)) return { text: other, fallback: true };
  return { text: null, fallback: false };
}

export const EVIDENCE_LABELS_EN: Record<EvidenceLevel, string> = {
  recommended: "Strong evidence",
  optional: "Limited or conflicting evidence",
  not_recommended: "Guidelines advise against routine use",
};
export const AGE_GROUP_LABELS_EN: Record<AgeGroup, string> = {
  pediatric: "Pediatric",
  adult: "Adult",
  geriatric: "Geriatric",
  all: "All ages",
};
export const PROTOCOL_CATEGORY_LABELS_EN: Record<ProtocolCategory, string> = {
  spine: "Spine",
  upper_limb: "Upper limb",
  lower_limb: "Lower limb",
  neurological: "Neurological",
  post_surgical: "Post-surgical",
  amputation: "Amputation & prosthetics",
  rheumatologic: "Rheumatologic & chronic",
  other: "Other",
};
export const PROTOCOL_STATUS_LABELS_EN: Record<ProtocolStatus, string> = { draft: "Draft — pending review", approved: "Approved" };
