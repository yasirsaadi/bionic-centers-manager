// **بياناتُ المريض التي لا يُحفَظ ملفٌّ بدونها** — قاعدةٌ واحدة للطرفين.
//
// ══ لماذا هذه الثلاثة بالذات ═══════════════════════════════════════════
// العمرُ والطولُ والوزن ليست حقولاً إدارية: **الطرفُ الصناعي يُصنَع عليها**.
// وزنُ المريض يحدّد تحمّل القالب والأنبوب، وطولُه يحدّد القياس، وعمرُه يحدّد
// ما إن كان الجهاز سينمو معه. فملفٌّ بلا وزن يصل الخبيرَ ناقصاً، فيسأل — أو
// يخمّن. وأسوأُ ما يقع أن يخمّن.
//
// ومريضُ البتر يزيد عليها **تعريفَ البتر منظَّماً**: النوعُ والجهةُ
// والمستوى. ونصٌّ حرٌّ لا يكفي: «تحت الركبة» في ملاحظةٍ لا تُصفّى ولا
// تُحصى ولا تُقرأ في أمر التصنيع — وهي المعلومةُ التي يُبنى عليها الجهاز.
//
// ══ ولا تُخترَع قيمةٌ لملفٍّ قديم ══════════════════════════════════════
// آلافُ الملفّات كُتبت قبل هذه القاعدة. **تبقى مقروءةً كما هي**: لا تعبئةَ
// ولا تخمين — «غير مسجَّل» حقيقةٌ عنها، ورقمٌ مخترَع كذبٌ يُبنى عليه جهاز.
//
// **لكنّ تحريرَها يُكمِلها**: مَن فتح ملفّاً قديماً ليعدّله يقف على النقص
// ويكمله قبل الحفظ — فتُنظَّف القاعدةُ بمرور العمل لا بترحيلٍ يخمّن.
//
// ══ والقيمُ الافتراضية ليست إجابات ═════════════════════════════════════
// قائمةٌ تفتح على أول خيارٍ تُنتج «احادي/يمين/تحت الركبة» لكلّ مريضٍ لم
// يُسأل. فالضوابطُ تبدأ **فارغة**، والفراغُ يُردّ — فيُسأل الموظّف مرّةً
// واحدة بدل أن يُكذَب عليه في كلّ ملفّ.

import { parseAmputationSite } from "./case_fields";

/** الحقولُ الثلاثة المشتركة بين كلّ المرضى. */
export const CORE_MEASUREMENT_FIELDS = ["age", "height", "weight"] as const;
export type CoreMeasurementField = (typeof CORE_MEASUREMENT_FIELDS)[number];

export const FIELD_LABELS: Record<string, string> = {
  age: "العمر",
  height: "الطول",
  weight: "الوزن",
  amputationType: "نوع البتر",
  amputationSide: "الجهة",
  amputationLevel: "مستوى البتر",
};

/**
 * **رقمٌ ذو معنى** — لا فارغ، ولا صفر، ولا سالب، ولا نصّ.
 *
 * الأعمدةُ نصّيةٌ في القاعدة (تاريخياً)، فالقيمةُ تصل «45» أو «45 سنة» أو
 * فارغة. والقاعدةُ هنا: يُستخرَج أولُ رقمٍ ويجب أن يكون موجباً.
 */
export function meaningfulMeasure(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  const raw = String(v).trim();
  if (!raw) return false;
  //  **الإشارةُ تُفحَص قبل التجريد**: تجريدُ غير الأرقام يحوّل «-5» إلى «5»
  //  فيمرّ وزنٌ سالب. والسالبُ خطأُ إدخالٍ صريح لا قيمةٌ تُقرأ.
  if (/^\s*-/.test(raw)) return false;
  const n = Number(raw.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0;
}

/** ما يصل من النموذج — أسماءُ الحقول كما هي في `patients`. */
export interface PatientCoreInput {
  age?: unknown;
  height?: unknown;
  weight?: unknown;
  isAmputee?: unknown;
  /** السلسلةُ المركّبة التي يبنيها `buildAmputationSite`. */
  amputationSite?: unknown;
}

export interface RequiredCheck {
  ok: boolean;
  /** أسماءُ الحقول الناقصة — بمفاتيحها لا بعناوينها، فتُبرزها الشاشة. */
  missing: string[];
  /** رسالةٌ عربية جاهزة للعرض حين لا تُبرَز الحقول واحداً واحداً. */
  message: string | null;
}

const ok: RequiredCheck = { ok: true, missing: [], message: null };

function fail(missing: string[]): RequiredCheck {
  const names = missing.map((k) => FIELD_LABELS[k] ?? k).join("، ");
  return { ok: false, missing, message: `أكمل البيانات المطلوبة: ${names}` };
}

/**
 * **هل يجوز حفظُ هذا الملفّ؟**
 *
 * تُستعمل عند الإنشاء دائماً، وعند التحرير كذلك — فملفٌّ قديمٌ يُفتَح
 * للتعديل يُكمَل قبل أن يُحفَظ. والقراءةُ لا تمرّ من هنا إطلاقاً: الملفّاتُ
 * القديمة تُعرَض كما هي.
 */
export function checkRequiredPatientData(p: PatientCoreInput | null | undefined): RequiredCheck {
  const missing: string[] = [];
  for (const f of CORE_MEASUREMENT_FIELDS) {
    if (!meaningfulMeasure((p as any)?.[f])) missing.push(f);
  }
  //  ومريضُ البتر يزيد تعريفَ بترِه منظَّماً.
  if (p?.isAmputee === true) {
    const site = typeof p?.amputationSite === "string" ? p.amputationSite.trim() : "";
    const amp = checkAmputationSite(site);
    missing.push(...amp.missing);
  }
  return missing.length === 0 ? ok : fail(missing);
}

/**
 * **تعريفُ البتر منظَّماً** — يُفحَص بالمحلّل الرسمي لا بتخمينٍ على النصّ.
 *
 * `parseAmputationSite` هي **عكسُ الباني بالضبط** ومختبَرةٌ في
 * `test:amputation-site`. فقراءةُ السلسلة بها ثم فحصُ الأجزاء أوثقُ من أيّ
 * تعبيرٍ نمطيّ على النصّ — والفاصلُ في الصيغة هو « - » نفسُه الذي يستعمله
 * الباني، فأيُّ فحصٍ يبحث عن شرطةٍ عارية يردّ كلَّ سلسلةٍ صحيحة.
 *
 * ولكلّ نمطٍ أجزاؤه الملزمة:
 *   • **احادي**: الطرف (علوي/سفلي) والجهة — والمستوى تفصيلٌ يُستحسَن.
 *   • **ثنائي**: نمطُ الطرفين، ومع «علوي وسفلي» تفصيلُ كلّ جهة.
 *   • **سليكوني**: القطعة — والجهةُ تُشترَط لغير الأنف.
 */
export function checkAmputationSite(site: string): RequiredCheck {
  const raw = (site ?? "").trim();
  const ALL = ["amputationType", "amputationSide", "amputationLevel"];
  if (!raw) return fail(ALL);

  const p = parseAmputationSite(raw);
  if (!p.amputationType) return fail(ALL);

  const missing: string[] = [];
  if (p.amputationType === "single") {
    if (!p.singleLimb) missing.push("amputationType");
    if (!p.singleSide) missing.push("amputationSide");
    if (!p.singleDetail) missing.push("amputationLevel");
  } else if (p.amputationType === "double") {
    if (!p.doubleLimbType) missing.push("amputationType");
    if (p.doubleLimbType === "both") {
      //  «علوي وسفلي» يلزمه تفصيلُ الجهتين معاً — وإلّا فنصفُ التعريف.
      if (!p.bothRightDetail || !p.bothLeftDetail) missing.push("amputationLevel");
    } else if (!p.doubleRightDetail && !p.doubleLeftDetail) {
      missing.push("amputationLevel");
    }
  } else if (p.amputationType === "silicone") {
    if (!p.siliconePart) missing.push("amputationType");
    //  والأنفُ وحده بلا جهة — وهذا في الباني نفسه لا استثناءٌ يُخترَع هنا.
    if (p.siliconePart && p.siliconePart !== "انف" && !p.siliconeSide) {
      missing.push("amputationSide");
    }
  }
  return missing.length === 0 ? ok : fail(Array.from(new Set(missing)));
}

/**
 * **هل كان هذا الملفُّ ناقصاً قبل التعديل؟**
 *
 * يميّز «ملفٌّ قديمٌ يُقرأ» عن «حفظٌ يجب أن يكتمل»: القراءةُ لا تُمنَع أبداً،
 * والحفظُ يُمنَع. وتُستعمل في الشاشة لتقول للموظّف **لماذا** ظهرت له حقولٌ
 * إلزامية لم تكن ظاهرة من قبل.
 */
export function legacyIncomplete(p: PatientCoreInput | null | undefined): boolean {
  return !checkRequiredPatientData(p).ok;
}

/**
 * الحقولُ الخمسة التي يحرسها هذا الملفّ — بأسمائها في جسم الطلب.
 *
 * `isAmputee` منها عمداً: **رفعُ العلم هو فتحُ خيط أطراف**، ومَن يفعله
 * يفعله وهو مسؤولٌ عن تعريف البتر. فتركُه خارج القائمة كان يسمح بفتح خيطٍ
 * ناقصٍ من نافذة «تعديل مريض».
 */
export const REQUIRED_PATIENT_FIELDS = [
  "age", "height", "weight", "isAmputee", "amputationSite",
] as const;

/**
 * **هل هذا التعديل إداريٌّ محض؟**
 *
 * الملفُّ القديم الناقص **يُقرأ ويُصحَّح إدارياً** — هاتفٌ خاطئ، أو تصنيفٌ،
 * أو عنوان. وإجبارُ الموظّف على مقاساتٍ لا يملكها لحظتَها كي يصحّح رقمَ
 * هاتفٍ **يوقف عملاً مشروعاً بلا مقابل**، والنتيجةُ المعتادة أن يُخترَع رقم.
 *
 * أمّا اللحظةُ التي يجب أن يكتمل فيها فهي **لمسُ الحقول نفسها** أو **دخولُ
 * دورة تصنيعٍ جديدة** — وذاك يحرسه `POST /device-episodes`.
 *
 * والقاعدةُ بالسلب لا بقائمةِ سماح: كلُّ ما ليس من الخمسة إداريٌّ بالتعريف،
 * فحقلٌ جديد يُضاف للنموذج غداً لا يفتح ثغرةً بالنسيان.
 */
export function isAdministrativeOnlyPatch(patch: unknown): boolean {
  if (!patch || typeof patch !== "object") return true;
  const keys = Object.keys(patch as Record<string, unknown>);
  return !keys.some((k) => (REQUIRED_PATIENT_FIELDS as readonly string[]).includes(k));
}
