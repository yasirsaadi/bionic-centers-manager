// Physiotherapy per-session prices — the single source of truth, shared by the
// client (live preview while typing) and the SERVER (authoritative compute; a
// tampered request can never invent its own prices).
//
//  **أسعارُ المالك من ٢٠٢٦-١١-٠١** (§4.fu): الروبوتُ ٧٥٬٠٠٠، والتمارينُ والأجهزةُ ٣٥٬٠٠٠، وتمارينُ أطفال الشلل الدماغيّ
//  ٢٥٬٠٠٠، والاستشارةُ مجّانية — **والإبرُ ٣٥٬٠٠٠ بقرار المالك في اليوم نفسِه** (§4.fx، وكانت ٢٥٬٠٠٠).
//  **والسعرُ للبيع الجديد وحده**: ما بيع قبله محفوظٌ بكلفته في الحالة والقيد، ولا بابَ يعيد تسعيرَه (تعديلُ الخطة لا يمسّ المال).
//
//  **وهذا الجدولُ ما يُباع اليوم** — منه قوائمُ البيع والوصفة، وحارسُ كلّ بابٍ يبيع. والنوعُ المتقاعد في الجدول الذي يليه.
export const PHYSIO_TREATMENT_PRICES: Record<string, number> = {
  "استشارة طبية": 0,
  "روبوت": 75000,
  "تمارين تأهيلية": 35000,
  "أجهزة علاج طبيعي": 35000,
  //  §4.fu — **تمارينُ أطفال الشلل الدماغيّ** نوعٌ مستقلّ بسعره.
  "تمارين CP للأطفال": 25000,
  "أبر صينية": 35000,
};

/**
 * **أنواعٌ لا تُباع بعد اليوم — وتبقى مقروءة** (§4.fx).
 *
 * «تمارين مع أجهزة» (§4.ft) أُزيلت بقرار المالك ٢٠٢٦-١١-٠١ برأي سليم: **لا نجمع التمرينَ والأجهزة، نتركهما منفصلين لنعرف كم أخذ
 * المريضُ في كلّ قسم**. فلا يُختار في بيعٍ ولا وصفةٍ ولا زيارةٍ ولا دفعةٍ جديدة — لكنّ ما بيع منه (إن بيع) يبقى: خطّتُه المحفوظة وعدّادُه
 * وزياراتُه ودفعاتُه، ويُعرف علاجاً طبيعياً، ويُحفَظ سطرُه حين تُعدَّل الخطّة، وتُعدّ جلستُه عليه لمن اشتراه (`sessionTreatmentType`).
 */
export const PHYSIO_RETIRED_TREATMENT_PRICES: Readonly<Record<string, number>> = Object.freeze({
  "تمارين مع أجهزة": 35000,
});

/** **كلُّ نوعٍ يُعرف** — ما يُباع وما تقاعد. للقراءة والتعرّف وحدهما، **لا لقائمة بيع**. */
export const PHYSIO_KNOWN_TREATMENT_PRICES: Readonly<Record<string, number>> = Object.freeze({
  ...PHYSIO_TREATMENT_PRICES, ...PHYSIO_RETIRED_TREATMENT_PRICES,
});

/**
 * **الأسعارُ قبل ٢٠٢٦-١١-٠١ — مجمَّدةٌ لا تُعدَّل** (§4.fu).
 *
 * لا يقرؤها إلّا ترحيلُ ١٨٨: مريضُ ما قبل الخطّة المحفوظة كان عددُ ما اشتراه يُشتقّ من كلفته ÷ سعرِ نوعه **بالجدول الحاليّ**،
 * فتغييرُ السعر كان سيغيّر عدّادَه بصمت (٢٧٥٬٠٠٠ ÷ ٢٥٬٠٠٠ = ١١ ⟵ لا يقبل القسمةَ على ٣٥٬٠٠٠ فيهبط إلى دفعاته).
 * فالترحيلُ يحسب عدّادَه بهذه الأسعار ويكتبه خطّةً محفوظة قبل أن يُقرأ بالجديدة.
 */
export const PHYSIO_PRICES_BEFORE_2026_11: Readonly<Record<string, number>> = Object.freeze({
  "استشارة طبية": 0,
  "روبوت": 50000,
  "تمارين تأهيلية": 25000,
  "أجهزة علاج طبيعي": 25000,
  "تمارين مع أجهزة": 25000,
  "أبر صينية": 25000,
});

/** ما يُباع اليوم — قوائمُ البيع وحارسُ أبوابه. */
export const PHYSIO_TREATMENT_TYPES = Object.keys(PHYSIO_TREATMENT_PRICES);

/**
 * **الأنواعُ المتقاعدة في وسم دفعة** (§4.fx) — الوسمُ قد يكون مركّباً («روبوت، تمارين مع أجهزة»).
 * بابُ الدفعة يردّها لمريضٍ لم يشترِها قبل اليوم، فلا يُباع النوعُ المتقاعد من بابٍ لم يُحرس.
 */
export function retiredPhysioTypesIn(tag: string | null | undefined): string[] {
  const parts = String(tag ?? "").split("،").map((x) => x.trim()).filter(Boolean);
  return Array.from(new Set(parts.filter((x) => PHYSIO_RETIRED_TREATMENT_TYPES.includes(x))));
}

export const RETIRED_TYPE_ERROR = (t: string) =>
  `«${t}» لم تعد تُباع (التمرينُ والأجهزةُ منفصلان) — اختر «تمارين تأهيلية» أو «أجهزة علاج طبيعي»`;

/** ما يُعرف — يُباع أو تقاعد (§4.fx). */
export const PHYSIO_KNOWN_TREATMENT_TYPES = Object.keys(PHYSIO_KNOWN_TREATMENT_PRICES);
export const PHYSIO_RETIRED_TREATMENT_TYPES = Object.keys(PHYSIO_RETIRED_TREATMENT_PRICES);

/** «تمارين مع أجهزة» — نوعٌ واحد للجلسة التي فيها التمرينُ والأجهزةُ معاً (§4.ft) — **متقاعدٌ منذ ٢٠٢٦-١١-٠١** (§4.fx). */
export const EXERCISES_WITH_DEVICES = "تمارين مع أجهزة";

/** «تمارين CP للأطفال» — تمارينُ أطفال الشلل الدماغيّ (§4.fu). */
export const CP_CHILD_EXERCISES = "تمارين CP للأطفال";

/** «روبوت 75,000 / جلسة · …» — سطرُ الأسعار كما يقرؤه الموظّف، من الجدول نفسِه فلا يشيخ نصٌّ مكتوبٌ باليد. */
export function physioPriceListText(): string {
  return PHYSIO_TREATMENT_TYPES
    .map((t) => (PHYSIO_TREATMENT_PRICES[t] > 0 ? `${t} ${PHYSIO_TREATMENT_PRICES[t].toLocaleString("en-US")} / جلسة` : `${t} مجانية`))
    .join("، ");
}

export interface PhysioEntry {
  treatmentType: string;
  sessionCount: number;
  isFree?: boolean;
}

/** One line of the purchased course, as stored in `patients.physio_plan`. */
export interface PhysioPlanEntry {
  treatmentType: string;
  sessionCount: number;
}

/**
 * Merge newly-sold sessions into the stored plan, summing per treatment type.
 *
 * Pricing and «جلسات علاج إضافية» both go through here, so a patient who buys
 * 10 robot sessions and later 5 more reads as one line of 15 rather than two
 * lines the counter would have to reconcile.
 */
/**
 * **أتدخل هذه الجلساتُ الخطةَ المحفوظة؟** — قاعدةُ `mergePhysioPlan` نفسُها،
 * مُصدَّرةً كي يقرأها مَن يحتاج أن يعرف **ماذا أضاف** لا أن يضيف فقط.
 *
 * و«استشارة طبية» زيارةٌ واحدة لا دورةُ علاج، فلا تدخل الخطةَ أبداً.
 * **ولا نسخةَ ثانية من هذا الشرط**: مَن نسخه انحرف عنه يوماً.
 */
export function entersPhysioPlan(treatmentType: string, sessionCount: number): boolean {
  const type = String(treatmentType ?? "").trim();
  const n = Math.max(0, Math.floor(Number(sessionCount) || 0));
  return Boolean(type) && n > 0 && type !== "استشارة طبية";
}

/**
 * **أتدخل جلساتُ صفّ دفعةٍ الخطةَ المحفوظة؟** — الشرطُ كاملاً في موضعٍ واحد.
 *
 * ثلاثةُ أركان: النوعُ من **أنواع العلاج الطبيعي المعروفة** (فدفعةُ طرفٍ أو
 * مسندٍ ليست جلسةً بحال) · **ويصلح سطراً في الخطة** (`entersPhysioPlan` —
 * و«استشارة طبية» زيارةٌ واحدة لا دورةُ علاج) · **والعددُ موجب**.
 *
 * وكان التركيبُ مكتوباً في أكثر من موضع فانحرف أحدُها: حارسٌ يقيس العضويةَ
 * في `PHYSIO_TREATMENT_TYPES` وحدها **يقبل الاستشارة** فيُوسِم صفَّها
 * «قُيِّد في الخطة» — وهي لا تدخلها أبداً. فلا نسخةَ ثانية بعد اليوم.
 */
export function physioSessionsEnterPlan(treatmentType: string, sessionCount: number): boolean {
  const type = String(treatmentType ?? "").trim();
  //  **كلُّ نوعٍ يُعرف** (§4.fx) — دفعةُ «تمارين مع أجهزة» القديمة تبقى في خطّة صاحبها، ويُطرح منها تعديلُها أو حذفُها.
  return PHYSIO_KNOWN_TREATMENT_TYPES.includes(type) && entersPhysioPlan(type, sessionCount);
}

/** الدلوُ الذي تضع فيه بذرةُ التسعير دفعةً بلا نوعٍ مسجَّل. */
export const PHYSIO_UNSPECIFIED_PLAN_KEY = "غير محدد";

/**
 * **على أيّ سطرٍ من الخطة تعيش جلساتُ هذه الدفعة؟** — أو `null` إن لم تدخلها.
 *
 * وهذه قاعدةُ **بذرة التسعير** بحرفها (`pricePhysiotherapy`): النوعُ كما
 * كُتب، وإن كان فارغاً فدلوُ «غير محدد»، ثمّ `entersPhysioPlan` تحسم.
 * فالبذرةُ تستورد صفّاً بلا نوعٍ مسجَّل وتضعه في ذلك الدلو — **وقارئٌ
 * يقيس بقائمة الأنواع المعروفة وحدها لا يجد له مفتاحاً**، فلا يُوسَم صفُّه
 * ولا يُطرَح منه شيء، وتبقى جلساتُه في العدّاد إلى الأبد.
 *
 * ولذلك يقرؤها الطرفان معاً: مَن يَسِم ما استورده، ومَن يطرح منه لاحقاً.
 */
export function physioPlanKeyForPayment(
  treatmentType: string | null | undefined,
  sessionCount: number,
): string | null {
  const key = String(treatmentType ?? "").trim() || PHYSIO_UNSPECIFIED_PLAN_KEY;
  return entersPhysioPlan(key, sessionCount) ? key : null;
}

export function mergePhysioPlan(
  existing: PhysioPlanEntry[] | null | undefined,
  additions: { treatmentType: string; sessionCount: number }[],
): PhysioPlanEntry[] {
  const byType: Record<string, number> = {};
  for (const e of existing ?? []) {
    const type = String(e?.treatmentType ?? "").trim();
    const n = Math.max(0, Math.floor(Number(e?.sessionCount) || 0));
    if (type) byType[type] = (byType[type] ?? 0) + n;
  }
  for (const a of additions ?? []) {
    const type = String(a?.treatmentType ?? "").trim();
    const n = Math.max(0, Math.floor(Number(a?.sessionCount) || 0));
    if (!entersPhysioPlan(type, n)) continue;
    byType[type] = (byType[type] ?? 0) + n;
  }
  return Object.keys(byType)
    .filter((t) => byType[t] > 0)
    .map((t) => ({ treatmentType: t, sessionCount: byType[t] }));
}

/** «روبوت (10 جلسات)، أبر صينية (5 جلسات)» — the plan as the file reads it. */
export function describePhysioPlan(plan: PhysioPlanEntry[] | null | undefined): string {
  return (plan ?? [])
    .filter((e) => e && e.treatmentType && e.sessionCount > 0)
    .map((e) => `${e.treatmentType} (${e.sessionCount} جلسات)`)
    .join("، ");
}

/**
 * Read counts back out of a plan TEXT like «روبوت (10 جلسات)، أبر صينية (5 جلسات)».
 *
 * That format is what the doctor's prescription and the pricing step write onto
 * `patients.treatment_type`, so it often carries the counts even when the
 * structured plan predates this feature.
 */
export function parsePlanFromText(text: string | null | undefined): PhysioPlanEntry[] {
  if (!text || typeof text !== "string") return [];
  const out: PhysioPlanEntry[] = [];
  for (const part of text.split("،")) {
    const m = part.match(/^\s*(.+?)\s*\(\s*(\d+)\s*جلس/);
    if (!m) continue;
    const type = m[1].trim();
    const n = Number(m[2]) || 0;
    if (type && n > 0) out.push({ treatmentType: type, sessionCount: n });
  }
  return out;
}

/**
 * How many sessions this patient actually BOUGHT, per treatment type.
 *
 * Resolved from the most explicit source available, never by summing several
 * (two sources would double the purchase):
 *
 *   1. the stored plan — written by «الكلفة والجلسات» and the correction dialog;
 *   2. counts embedded in the plan text — «روبوت (10 جلسات)»;
 *   3. DERIVED FROM THE PRICE: a single known treatment type whose case cost
 *      divides exactly by its per-session price. This is the one that matters
 *      in practice: a patient priced 275,000 for «أجهزة علاج طبيعي» bought 11
 *      sessions, whatever his payments happen to say so far — and reading the
 *      payments instead is precisely what made the counter disagree with the
 *      cost (منتهى: 11 bought, 4 on payments · مصطفى: 40 bought, 11 on payments);
 *   4. the payment session counts — the old flow, where every sale WAS a payment.
 */
export function resolvePurchasedSessions(input: {
  plan?: PhysioPlanEntry[] | null;
  treatmentTypeText?: string | null;
  caseCost?: number | null;
  paymentSessions?: {
    treatmentType: string | null;
    sessionCount: number | null;
    /**
     * جلسةٌ **مُهداة** (`payments.is_free_sessions`) — بلا دينارٍ واحد.
     *
     * وغيابُه يعني «مدفوعة»، فكلُّ مُنادٍ قديمٍ لا يمرّره يبقى على سلوكه
     * السابق **حرفاً بحرف**.
     */
    isFree?: boolean | null;
  }[];
},
  /** جدولُ الاشتقاق من الكلفة — الحاليّ دائماً، إلّا ترحيلَ ١٨٨ يمرّر أسعارَ ما قبل ٢٠٢٦-١١-٠١ (§4.fu). */
  prices: Readonly<Record<string, number>> = PHYSIO_KNOWN_TREATMENT_PRICES,
): { byType: Record<string, number>; total: number; source: "plan" | "cost" | "payments" | "none" } {
  const sum = (byType: Record<string, number>) =>
    Object.keys(byType).reduce((s, k) => s + byType[k], 0);

  // Payments are computed up front: they are both the legacy fallback AND the
  // sanity floor for the cost derivation below.
  //  **والمدفوعُ يُفصَل عن المُهدى** — وهذا هو مفتاحُ الإصلاح كلِّه:
  //  الجلسةُ المجانية تزيد الرصيدَ ولا تزيد المال، فلا يمكن لأيّ حسابٍ
  //  مبنيٍّ على المال أن يراها. فتُحسَب على حدة وتُضاف فوق أيّ مصدر.
  const paidByType: Record<string, number> = {};
  const freeByType: Record<string, number> = {};
  for (const p of input.paymentSessions ?? []) {
    const n = Number(p?.sessionCount) || 0;
    if (n <= 0) continue;
    const type = (p.treatmentType || "").trim() || "غير محدد";
    const bucket = p?.isFree ? freeByType : paidByType;
    bucket[type] = (bucket[type] ?? 0) + n;
  }
  const paidTotal = sum(paidByType);
  const freeTotal = sum(freeByType);
  const paymentsByType: Record<string, number> = { ...paidByType };
  for (const t of Object.keys(freeByType)) paymentsByType[t] = (paymentsByType[t] ?? 0) + freeByType[t];
  const paymentsTotal = paidTotal + freeTotal;

  //  ══ **ولا يُضاف المُهدى فوق الخطة** — وهذا مقصودٌ لا سهو ═══════════
  //  البابان اللذان يكتبان الخطةَ يضعان الجلسةَ المجانية **داخلها**:
  //  «الكلفة والجلسات» (بلا صفّ دفعةٍ إطلاقاً) و«خدمة جديدة» (**وتكتب صفَّ
  //  دفعةٍ مجانيةٍ أيضاً**). فجمعُ الخطةِ مع الدفعات المجانية كان سيَعُدّ
  //  هديّةَ «خدمة جديدة» **مرّتين**. فصاحبُ الخطة تُصلَح حالتُه عند الكتابة
  //  لا عند القراءة: نافذةُ الدفعات صارت ترفع خطّتَه كما ترفعها «خدمة
  //  جديدة» بالضبط (`server/routes.ts`).
  const fromPlan = (input.plan ?? []).filter((e) => e?.treatmentType && Number(e.sessionCount) > 0);
  if (fromPlan.length > 0) {
    const byType: Record<string, number> = {};
    for (const e of fromPlan) byType[e.treatmentType] = (byType[e.treatmentType] ?? 0) + Number(e.sessionCount);
    return { byType, total: sum(byType), source: "plan" };
  }

  // NOTE deliberately absent: counts parsed from the treatment-type TEXT.
  // That text is written by the doctor's PRESCRIPTION as well as by pricing,
  // and a prescribed course is not a purchased one — reading «روبوت (10
  // جلسات)» as ten bought sessions credited an examined-but-unpriced patient
  // with sessions nobody paid for, and undercounted a per-session veteran the
  // doctor happened to examine. Purchases come from the plan, the price, or
  // the payments — the three places money actually passes through.

  // Derive from the money: only when the text names exactly ONE priced type,
  // the cost divides exactly — AND the result exceeds what the payments prove.
  // The last guard is what protects the per-session (مفرد) patient: gifted
  // sessions add a payment row with amount 0 but no cost, so cost ÷ price
  // UNDERCOUNTS him; his payments are his complete history and must win.
  // (The priced-course patient is the opposite — cost 275,000 = 11 sessions
  // while his installments carry only 4 — and for him the derivation still
  // fires because 11 > 4.)
  //
  //  ══ **والمُهدى يُضاف فوق المُشتقّ، لا يُبتلَع فيه** ═══════════════════
  //  (إصلاحُ «انتصار حبيب محمد»، ٢٠٢٦-٠٩-٢١ — مُعادُ إنتاجُه حيّاً.) كلفتُها
  //  ١,٣٠٠,٠٠٠ و«روبوت» بـ٥٠,٠٠٠ ⟶ الاشتقاقُ ٢٦، ودفعاتُها ٢ مدفوعة و**٦
  //  مجانية مسجَّلةٌ بحقّها في القاعدة**. وكان الاشتقاقُ يفوز ويُهمل الدفعاتِ
  //  كلَّها، فتقرأ ٢٦ بدل ٣٢ — **والستُّ لا تظهر أبداً مهما أُعيد إدخالُها**.
  //
  //  والمقارنةُ صارت بـ**المدفوع** لا بالمجموع: المُشتقُّ يمثّل جلساتٍ دفع
  //  المريضُ ثمنَها، فمقابلتُه بمجموعٍ يحوي هديّةً مقابلةُ شيئين مختلفين.
  //  **ومتى خلا الملفُّ من جلسةٍ مجانية فالسلوكُ مطابقٌ لما كان بايتاً**
  //  (`freeTotal = 0` ⟶ `paidTotal === paymentsTotal` والإضافةُ صفر).
  const label = String(input.treatmentTypeText ?? "").trim();
  const cost = Math.max(0, Math.floor(Number(input.caseCost) || 0));
  const price = prices[label];
  if (label && !label.includes("،") && price && price > 0 && cost > 0 && cost % price === 0) {
    const derived = cost / price;
    if (derived > paidTotal) {
      const byType: Record<string, number> = { [label]: derived };
      for (const t of Object.keys(freeByType)) byType[t] = (byType[t] ?? 0) + freeByType[t];
      return { byType, total: derived + freeTotal, source: "cost" };
    }
  }

  return { byType: paymentsByType, total: paymentsTotal, source: paymentsTotal > 0 ? "payments" : "none" };
}

// Cost of one entry: sessions × the type's price, 0 when marked free.
export function physioEntryCost(e: PhysioEntry): number {
  if (e.isFree) return 0;
  //  **بكلّ نوعٍ يُعرف** (§4.fx): البيعُ لا يصل هنا بنوعٍ متقاعد (حارسُ كلّ بابٍ بـ`PHYSIO_TREATMENT_TYPES`)، لكنّ ما حُفظ قبل التقاعد
  //  — طلبُ خصمٍ معلَّق، أو خطّةٌ يوزَّع عليها خصم — يُقرأ بسعره لا بصفر.
  const price = PHYSIO_KNOWN_TREATMENT_PRICES[e.treatmentType];
  if (price === undefined) return 0;
  const n = Math.max(0, Math.floor(Number(e.sessionCount) || 0));
  return n * price;
}

/**
 * **توزيعُ سعرٍ معتمَدٍ على بنود الخدمة** — بلا دينارٍ يضيع ولا يُخترَع.
 *
 * ══ العطبُ الذي يغلقه ══════════════════════════════════════════════════
 * أوّلُ تنفيذٍ للخصم على «خدمة جديدة» وضع السعرَ المعتمد كلَّه على **البند
 * الأول** وصفَّر ما بعده. والبندُ المصفَّر لا تُنشأ له دفعة، **ودفعتُه هي
 * ذاكرةُ جلساته** لمريض المفرد — فمَن اشترى «روبوت ١ + أجهزة ١» بخصمٍ كان
 * يخسر جلسةَ «أجهزة» من عدّاده نهائياً.
 *
 * ══ القاعدة ════════════════════════════════════════════════════════════
 * توزيعٌ تناسبيٌّ صحيحٌ على الكلف الأصلية، والباقي يُوزَّع بـ**أكبر كسرٍ
 * أولاً** (largest remainder) وعند التعادل الأسبقُ في الترتيب. فالنتيجة
 * حتميّةٌ لا تعتمد على ترتيبِ عائم، **ومجموعُها يساوي المعتمَد بالضبط**.
 *
 * والحالاتُ الحدّية: مجموعٌ أصليٌّ صفر (استشارةٌ بحتة) ⟶ كلُّ المعتمَد على
 * أوّل بند؛ ومعتمَدٌ صفر (تبرّع) ⟶ أصفارٌ كلُّها — والجلساتُ تبقى محفوظة
 * لأن إنشاء صفّها لا يتوقّف على مبلغها.
 */
export function allocateApprovedCost(originalCosts: number[], approvedTotal: number): number[] {
  const n = originalCosts.length;
  if (n === 0) return [];
  const costs = originalCosts.map((c) => Math.max(0, Math.round(Number(c) || 0)));
  const total = Math.max(0, Math.round(Number(approvedTotal) || 0));
  const base = costs.reduce((s, c) => s + c, 0);
  if (total === 0) return costs.map(() => 0);
  if (base === 0) return costs.map((_, i) => (i === 0 ? total : 0));

  const exact = costs.map((c) => (total * c) / base);
  const floors = exact.map((x) => Math.floor(x));
  let remainder = total - floors.reduce((s, x) => s + x, 0);
  //  الأسبقُ في الترتيب يفوز عند تعادل الكسر — فالنتيجةُ نفسُها في كلّ تشغيل.
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => (b.frac - a.frac) || (a.i - b.i));
  for (const { i } of order) {
    if (remainder <= 0) break;
    floors[i] += 1;
    remainder -= 1;
  }
  return floors;
}
