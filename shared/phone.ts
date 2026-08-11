// رقم الاتصال — التطبيع والتحقق. مصدر حقيقة واحد للخادم والواجهة.
//
// الحقل يعني: **رقم الاتصال الأساسي بالمريض أو بالمسؤول عنه** — لا رقم
// المريض الشخصي بالضرورة. الطفل يُسجَّل برقم أبيه، وكبير السنّ برقم ابنه،
// وكلاهما تسجيل صحيح. (العلاقة نفسها تُلتقط لاحقاً عند ربط قناة التواصل،
// لا هنا، لأن كتابتها في التسجيل تبقى تخميناً.)
//
// المبدأ الحاكم: **لا يُخترع رقم أبداً**. ما لا يُفسَّر يُترك كما كتبه
// الموظف في `patients.phone`، ويبقى `phone_e164` فارغاً و`phone_status`
// يساوي `needs_review`. رقم مُخترَع أسوأ من رقم غائب، لأن الغائب يُرى
// والمُخترَع يُصدَّق.
//
// عمودان لا واحد (قرار المعمارية):
//   - `phone`      كما كتبه الإنسان حرفياً — إفادة ودليل، ولا يُمسّ.
//   - `phone_e164` المفتاح الآلي للمطابقة وكشف التكرار.
// التطبيع عملية خاسرة للمعلومة وقواعده تتغيّر، فالأصل يبقى — نفس مبدأ
// لقطة `doctor_name` في المعاينات.
//
// بلا مكتبات: نحتاج دولتين وقاعدة عامة، ومكتبة بمئة كيلوبايت لبلدان لا
// نراها ثمن مبالغ فيه. الاختبار الدائم: `npm run test:phone` (بلا قاعدة
// بيانات).

/** حالة الرقم على صفّ المريض. قيمتان لا ثالث لهما. */
export type PhoneStatus = "ok" | "needs_review";

export interface PhoneNormalizationResult {
  /** هل نتج رقم E.164 صالح؟ */
  ok: boolean;
  /** الرقم المطبَّع، مثل "+9647701234567". فارغ حين لا يُفسَّر. */
  e164: string | null;
  /** ISO للدولة حين تُعرَف، أو "INTL" لرقم دولي صالح من دولة خارج القائمة. */
  country: string | null;
  /** ما يُكتب في `patients.phone_status`. */
  status: PhoneStatus;
  /** رسالة عربية تُعرض للموظف. فارغة عند النجاح. */
  reason: string | null;
  /** الأصل بعد قصّ الفراغات الطرفية فقط — هذا ما يُخزَّن في `phone`. */
  raw: string;
}

// ── الدول ────────────────────────────────────────────────────────────────
// `nsn` = الرقم الوطني الدلالي: بلا صفر البداية وبلا رمز الدولة.

interface CountryRule {
  iso: string;
  dial: string;
  label: string;
  /** هل هذا رقم وطني معقول لهذه الدولة؟ */
  valid: (nsn: string) => boolean;
  /** مثال يظهر في رسالة الخطأ. */
  example: string;
}

// العراق: الموبايل 7 + تسعة أرقام (٠٧٧٠١٢٣٤٥٦٧). والأرضي مقبول عمداً —
// الصرامة الزائدة تولّد أرقاماً وهمية، والمطلوب رقم اتصال صالح لا رقم
// موبايل. (رموز المناطق تبدأ ١–٦ ويتبعها ٧–٨ أرقام.)
const IQ: CountryRule = {
  iso: "IQ",
  dial: "964",
  label: "العراق",
  example: "07701234567",
  valid: (n) => /^7\d{9}$/.test(n) || /^[1-6]\d{6,8}$/.test(n),
};

// تركيا: الرقم الوطني عشرة أرقام دائماً — الموبايل يبدأ ٥، والأرضي ٢–٤.
const TR: CountryRule = {
  iso: "TR",
  dial: "90",
  label: "تركيا",
  example: "05321234567",
  valid: (n) => /^[2-5]\d{9}$/.test(n),
};

export const COUNTRY_RULES: CountryRule[] = [IQ, TR];

/** الدول المعروضة في مُنتقي الدولة. "INTL" يشترط كتابة الرقم بصيغة +. */
export const PHONE_COUNTRIES: { code: string; label: string; dial: string }[] = [
  { code: "IQ", label: "العراق", dial: "+964" },
  { code: "TR", label: "تركيا", dial: "+90" },
  { code: "INTL", label: "دولة أخرى", dial: "+" },
];

export const DEFAULT_PHONE_COUNTRY = "IQ";

// خريطة رموز الاتصال ← ISO، لاستنتاج الدولة من رقم كُتب بصيغة دولية.
// مقصورة على ما يخصّ مرضى المركز فعلاً (الجوار + وجهات المغتربين).
// الرمزان "1" و"7" مُستثنيان عمداً لأنهما لأكثر من دولة، فادّعاء دولة
// بعينها لهما دقّة كاذبة — يُصنَّفان "INTL" وهو الصدق.
const DIAL_TO_ISO: Record<string, string> = {
  "964": "IQ", "90": "TR", "98": "IR", "963": "SY", "962": "JO",
  "961": "LB", "20": "EG", "966": "SA", "971": "AE", "965": "KW",
  "974": "QA", "973": "BH", "968": "OM", "44": "GB", "49": "DE",
  "46": "SE", "31": "NL", "45": "DK", "47": "NO", "61": "AU",
  "91": "IN", "86": "CN", "60": "MY", "33": "FR", "39": "IT",
};
// الأطول أولاً: "964" يجب أن يسبق "96" لو أُضيف لاحقاً.
const DIAL_PREFIXES = Object.keys(DIAL_TO_ISO).sort((a, b) => b.length - a.length);

// ── تحويل الأرقام غير اللاتينية ──────────────────────────────────────────
// حالة يومية على لوحة مفاتيح عربية، وتُنسى دائماً: الموظف يكتب ٠٧٧٠…
// فيصل نصّ لا يطابق أي نمط رقمي. نحوّلها قبل أي شيء آخر.
const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";        // U+0660..U+0669
const EXTENDED_ARABIC_INDIC = "۰۱۲۳۴۵۶۷۸۹"; // U+06F0..U+06F9 (فارسية/أردية)

function toAsciiDigits(s: string): string {
  let out = "";
  for (const ch of s) {
    const ai = ARABIC_INDIC.indexOf(ch);
    if (ai >= 0) { out += String(ai); continue; }
    const ei = EXTENDED_ARABIC_INDIC.indexOf(ch);
    if (ei >= 0) { out += String(ei); continue; }
    out += ch;
  }
  return out;
}

// كل ما يفصل بين الأرقام بصرياً — مسافات وشرطات وأقواس ونقاط، ومعها
// المسافة غير القاطعة وعلامات اتجاه النصّ التي تلتصق بالنسخ من واتساب.
const SEPARATORS = /[\s\-().\/\\\u00A0\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;

const RULE_BY_ISO = new Map(COUNTRY_RULES.map((r) => [r.iso, r]));

function fail(raw: string, reason: string): PhoneNormalizationResult {
  return { ok: false, e164: null, country: null, status: "needs_review", reason, raw };
}

function pass(raw: string, e164: string, country: string): PhoneNormalizationResult {
  return { ok: true, e164, country, status: "ok", reason: null, raw };
}

/**
 * يطبّع رقم اتصال إلى E.164.
 *
 * @param input          ما كتبه الموظف، بأي صيغة.
 * @param defaultCountry ISO الدولة المفترَضة حين لا يبدأ الرقم بـ + أو 00.
 *                       "INTL" تعني: لا افتراض — يجب أن يكتب الصيغة الدولية.
 */
export function normalizePhone(
  input: string | null | undefined,
  defaultCountry: string = DEFAULT_PHONE_COUNTRY,
): PhoneNormalizationResult {
  const raw = String(input ?? "").trim();
  if (!raw) return fail("", "رقم الاتصال مطلوب");

  let s = toAsciiDigits(raw).replace(SEPARATORS, "");
  if (!s) return fail(raw, "رقم الاتصال مطلوب");

  // 00 بادئة دولية شائعة في العراق أكثر من +.
  if (s.startsWith("00")) s = "+" + s.slice(2);

  // ── مسار الرقم الدولي الصريح ─────────────────────────────────────────
  if (s.startsWith("+")) {
    const digits = s.slice(1);
    if (!/^\d+$/.test(digits)) {
      return fail(raw, "رقم الاتصال يحوي رموزاً غير مفهومة");
    }
    // حدّ E.164: خمسة عشر رقماً كحدّ أقصى، ولا رقم حقيقي أقصر من ثمانية.
    if (digits.length < 8 || digits.length > 15) {
      return fail(raw, "طول الرقم الدولي غير صحيح — تحقّق منه");
    }
    if (digits.startsWith("0")) {
      return fail(raw, "الرقم الدولي لا يبدأ بصفر بعد علامة +");
    }

    const prefix = DIAL_PREFIXES.find((p) => digits.startsWith(p));
    if (prefix) {
      const iso = DIAL_TO_ISO[prefix];
      const rule = RULE_BY_ISO.get(iso);
      // دولة نعرف قواعدها ⇒ نتحقّق منها. رقم يدّعي +964 ولا يشبه أرقام
      // العراق خطأٌ ظاهر، ولا يُقبل لمجرّد أنه بصيغة دولية.
      if (rule) {
        const nsn = digits.slice(prefix.length);
        if (!rule.valid(nsn)) {
          return fail(raw, `الرقم لا يطابق أرقام ${rule.label} — مثال: ${rule.example}`);
        }
        return pass(raw, "+" + digits, rule.iso);
      }
      return pass(raw, "+" + digits, iso);
    }
    // دولة خارج القائمة: الرقم صالح بنيوياً، والدولة غير مُدّعاة.
    // رمز الاتصال محفوظ داخل E.164 نفسه فلا شيء يضيع.
    return pass(raw, "+" + digits, "INTL");
  }

  // ── مسار الرقم المحلّي ────────────────────────────────────────────────
  if (!/^\d+$/.test(s)) {
    return fail(raw, "رقم الاتصال يحوي رموزاً غير مفهومة");
  }

  const rule = RULE_BY_ISO.get(defaultCountry);
  if (!rule) {
    // "INTL" أو دولة لا نعرف قواعدها: لا نخمّن رمز اتصال أبداً.
    return fail(raw, "اكتب الرقم بالصيغة الدولية مع رمز الدولة، مثل +90…");
  }

  let nsn: string;
  if (s.startsWith(rule.dial) && rule.valid(s.slice(rule.dial.length))) {
    // لصقٌ شائع: 9647701234567 بلا + ولا 00.
    // آمن لأن الأرقام الوطنية في هذه الدول لا تبدأ برمز اتصالها.
    nsn = s.slice(rule.dial.length);
  } else if (s.startsWith("0")) {
    nsn = s.slice(1);
  } else {
    nsn = s;
  }

  if (!rule.valid(nsn)) {
    return fail(raw, `رقم اتصال ${rule.label} غير صالح — مثال: ${rule.example}`);
  }
  return pass(raw, "+" + rule.dial + nsn, rule.iso);
}

// تجميع بصري بثلاثات، مع دمج البقية في مجموعة رباعية أخيرة بدل ترك
// رقم يتيم: ٧٧٠١٢٣٤٥٦٧ تُقرأ «770 123 4567» لا «770 123 456 7».
function groupDigits(nsn: string): string {
  const parts: string[] = [];
  for (let i = 0; i < nsn.length; ) {
    const remaining = nsn.length - i;
    const take = remaining === 4 ? 4 : remaining <= 3 ? remaining : 3;
    parts.push(nsn.slice(i, i + take));
    i += take;
  }
  return parts.join(" ");
}

/**
 * صيغة العرض المقروءة. للواجهة فقط — المخزَّن دائماً E.164 مضغوط.
 * تُكتب من اليسار لليمين لأن الأرقام كذلك حتى داخل واجهة عربية.
 */
export function formatPhoneDisplay(e164: string | null | undefined): string {
  const v = String(e164 ?? "").trim();
  if (!v.startsWith("+")) return v;
  const digits = v.slice(1);
  const prefix = DIAL_PREFIXES.find((p) => digits.startsWith(p));
  if (!prefix) return `+${groupDigits(digits)}`;
  return `+${prefix} ${groupDigits(digits.slice(prefix.length))}`;
}

/** هل يحمل هذا المريض رقماً يحتاج مراجعة بشرية؟ */
export function needsPhoneReview(status: string | null | undefined): boolean {
  return status !== "ok";
}
