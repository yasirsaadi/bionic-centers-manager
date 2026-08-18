// بحثُ المرضى في SQL — الشرط والترتيب، مبنيّان على فهارس ترحيل ٠٥٤.
//
// ══ العقد مع `shared/patient_search.ts` ═════════════════════════════════
// السلّم هنا **هو السلّم هناك** بأرقامه: `RANK.CODE_EXACT` = 1 وهكذا. فما
// يتصدّر في قائمةٍ محمَّلة في المتصفّح يتصدّر في صفحةٍ تأتي من الخادم —
// والموظّف لا يرى ترتيبين مختلفين لنفس ما كتب.
//
// ══ ولماذا لا يُبنى الترتيب في التطبيق ═════════════════════════════════
// السجلّ مرقَّم في الخادم: الصفحة ٢٥ صفّاً من عشرات الآلاف. فترتيبُ الصلة
// يجب أن يقع **قبل** `LIMIT` لا بعده، وإلّا رتّبنا خمسةً وعشرين صفّاً
// اختِيرت عشوائياً. ولذلك يُحسب في SQL ويُفهرس.

import { sql, type SQL } from "drizzle-orm";
import { patients } from "@shared/schema";
import { RANK, FUZZY_MIN_QUERY, digitsOnly, normalizeSearchText } from "@shared/patient_search";
import {
  parsePatientCodeQuery, patientCodePrefixRange,
} from "@shared/patient_code";

/**
 * ══ التسامح مع الخطأ المطبعي — بعامِلَين لا بدالّة ══════════════════════
 *
 * `similarity(a,b) >= 0.3` **لا يستعمل الفهرس**: صيغةُ الدالّة تُحسب لكلّ
 * صفّ، فهي مسحٌ كامل على جدولٍ بعشرات الآلاف. الفهرسُ يخدم **العوامل**
 * وحدها: `%` و`%>`. ولذلك يُكتب الشرط بهما.
 *
 * وعتبتاهما تُضبطان لكلّ اتّصال في `server/db.ts` — مكتوبتين في الريبو لا
 * متروكتين لافتراض الخادم: `0.3` لـ`%` و`0.5` لـ`%>`.
 *
 * ══ ولماذا `%>` لا `%` وحده ═════════════════════════════════════════════
 * `similarity` يقارن **النصّين كاملَين**، فبحثُ «احمذ» في «أحمد علي حسن»
 * يعطي 0.20 — دون العتبة — لأن الاسم أطول من الاستعلام بثلاث مرّات. وهذا
 * ما رصده الفحصُ الحيّ: الخطأ المطبعي كان يجد «محمد أحمد» القصير ويُخطئ
 * الاسمَ الطويل الصحيح.
 *
 * و`word_similarity` يقيس الاستعلام مقابل **أفضل امتدادٍ متّصل** داخل
 * الاسم، فيعطي 0.60 للثلاثة — وهو المعنى المقصود: «الكلمة التي كتبتُها
 * موجودةٌ داخل هذا الاسم بخطأٍ حرف». والاثنان معاً: القريبُ كاملاً
 * والقريبُ في كلمة.
 */

/** هل `pg_trgm` مثبَّت — يُسأل مرّةً ويُحفظ، فلا استعلامٌ إضافي لكلّ بحث. */
let trigramAvailable: boolean | null = null;

export async function hasTrigram(db: {
  execute: (q: any) => Promise<any>;
}): Promise<boolean> {
  if (trigramAvailable !== null) return trigramAvailable;
  try {
    const r = await db.execute(sql`SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'`);
    trigramAvailable = (r.rows ?? []).length > 0;
  } catch {
    //  السؤال نفسه فشل — نمضي بلا تسامحٍ بدل أن يسقط البحث كلّه.
    trigramAvailable = false;
  }
  return trigramAvailable;
}

/**
 * الجوابُ المحفوظ بلا انتظار — لمن يبني الشرط في سياقٍ متزامن.
 *
 * وقبل أن يُسأل يُقرأ «لا»: بحثٌ بلا تسامحٍ مع الخطأ المطبعي أسلمُ من بناء
 * شرطٍ بعاملٍ قد لا يوجد. و`warmTrigramCache()` تُنادى عند الإقلاع فلا يقع
 * هذا عملياً إلّا في أوّل لحظة.
 */
export function trigramReady(): boolean { return trigramAvailable === true; }

/** تُنادى مرّةً بعد الترحيلات، فيعرف الجوابَ كلُّ مسارٍ متزامن بعدها. */
export async function warmTrigramCache(db: { execute: (q: any) => Promise<any> }): Promise<void> {
  await hasTrigram(db);
}

/** للاختبار وحده: يُنسي الجواب المحفوظ. */
export function resetTrigramCache(): void { trigramAvailable = null; }

/**
 * رتبةٌ **عدداً حرفياً** في نصّ SQL لا متغيّرَ ربط.
 *
 * ══ ولماذا هذا ليس تفصيلاً ══════════════════════════════════════════════
 * `sql`${5}`` يصير متغيّرَ ربطٍ **نصّياً**، فالـ`CASE` يُرجع `text` ويصير
 * `ORDER BY` ترتيباً معجميّاً. وذلك يعمل صدفةً ما دامت الرتب خانةً واحدة
 * (١…٩) ويسقط صامتاً في أوّل رتبةٍ من خانتين: `'10' < '2'`.
 *
 * وقد وقع فعلاً: إضافةُ رتبتين للرمز رفعت السلّم إلى ١١، فقفز «الاحتواء»
 * و«التقريبيّ» فوق «الهاتف التامّ». والقيم ثوابتُ الشيفرة لا مدخلُ مستخدم،
 * فإدراجُها حرفياً آمنٌ ويجعل الترتيب عدديّاً كما يُقرأ.
 */
const R = (rank: number) => sql.raw(String(rank));

export interface SearchSql {
  /** شرطُ الترشيح — يُضاف إلى شروط النطاق لا يحلّ محلّها. */
  where: SQL;
  /** تعبيرُ الرتبة — يُستعمل في `ORDER BY` وحده. */
  rank: SQL;
}

/**
 * يبني شرطَ البحث وتعبيرَ رتبته.
 *
 * **ولا يعرف شيئاً عن الصلاحيات**: المنادي يضيف شرط الفرع إلى نفس القائمة،
 * فمعرفةُ الاسم أو الرمز لا تُخرج موظّفاً من فرعه. وهذا مقصود — بابُ
 * الحراسة واحدٌ وليس هنا.
 */
export function buildPatientSearch(rawQuery: string, opts: { trigram: boolean }): SearchSql {
  const g = searchGates(rawQuery, opts);
  const {
    q, qDigits, NAME, PHONE, CODE_DIGITS, CONDITION, phoneUsable, digitsUsable,
  } = g;

  //  ══ رمزٌ مكتوبٌ صراحةً — كاملاً أو نصفَ مكتوب ⟶ الرمز وحده ══════════
  //  مَن يكتب WB لا يريد اسماً يحوي هذين الحرفين، ولا يريد تقريباً. وهذا
  //  ليس تفضيلاً في الترتيب بل **قصرٌ للبحث**: بدونه كانت فروعُ الاسم
  //  والتقريب تعمل على «wb-01629» فتُجبر المخطِّط على مسحٍ كامل يحمل معه
  //  الاستعلامَ المرتبط للأسماء البديلة — ٣٦٣٧ مللي ثانية على ٦٠٬٠٠٠ صفّ.
  //
  //  والبادئةُ تعمل من أوّل حرف: W · WB · WB- · WB-0 · WB-02 … فالنتائج
  //  تتضيّق مع كلّ ضغطة زرّ بدل أن تنتظر اكتمال الخانة الخامسة.
  if (g.cq.explicit) {
    const { cq, ALIAS_HIT } = g;
    const like = cq.prefix + "%";
    //  المدى يخدمه الفهرسُ الفريد الموجود؛ و`LIKE` يبقى فوقه لأنه هو
    //  الدلالة الصحيحة مهما كانت لغةُ ترتيب القاعدة (انظر
    //  `patientCodePrefixRange`). وحين لا مدىً آمن يبقى `LIKE` وحده.
    const range = patientCodePrefixRange(cq.prefix, cq.digits);
    const codePrefix = range
      ? sql`(${patients.patientCode} >= ${range.lo} AND ${patients.patientCode} < ${range.hi}
             AND ${patients.patientCode} LIKE ${like})`
      : sql`${patients.patientCode} LIKE ${like}`;
    //  والأسماء البديلة بنفس الشكل — جدولٌ صغير ومفتاحُه الأوّلي هو الرمز.
    const aliasPrefix = sql`${patients.id} IN (
      SELECT a.patient_id FROM patient_code_aliases a
       WHERE ${range
        ? sql`a.code >= ${range.lo} AND a.code < ${range.hi} AND a.code LIKE ${like}`
        : sql`a.code LIKE ${like}`})`;
    const exact = cq.full
      ? sql`${patients.patientCode} = ${cq.full}` : sql`FALSE`;

    return {
      where: sql`(${codePrefix} OR ${aliasPrefix})`,
      rank: sql`CASE
        WHEN ${exact} THEN ${R(RANK.CODE_EXACT)}
        WHEN ${ALIAS_HIT} THEN ${R(RANK.ALIAS_EXACT)}
        WHEN ${codePrefix} THEN ${R(RANK.CODE_PREFIX)}
        ELSE ${R(RANK.ALIAS_PREFIX)}
      END`,
    };
  }

  const branches: SQL[] = [];
  if (digitsUsable) branches.push(sql`${CODE_DIGITS} = ${qDigits}`);
  if (phoneUsable) branches.push(sql`${PHONE} LIKE ${qDigits + "%"}`);
  if (q) branches.push(sql`${NAME} LIKE ${q + "%"}`);
  if (g.tokenPrefixOn) branches.push(sql`${NAME} LIKE ${"% " + q + "%"}`);
  if (g.substringOn) branches.push(sql`${NAME} LIKE ${"%" + q + "%"}`);
  //  الحالة المرضية — كانت في السجلّ قبل هذه المرحلة (بمقارنةٍ خام)، فتبقى.
  //  حذفُها كان سيسرق بحثاً يستعمله موظّفٌ اليوم بلا أن يطلب أحدٌ حذفه.
  if (g.substringOn) branches.push(sql`${CONDITION} LIKE ${"%" + q + "%"}`);
  //  العاملان معاً — والفهرسُ نفسه يخدمهما، فالـ`BitmapOr` يجمعهما بلا مسح.
  if (g.fuzzyOn) branches.push(sql`(${NAME} % ${q} OR ${NAME} %> ${q})`);

  //  لا فرعَ صالح ⟶ لا نتيجة. يقع حين يكون المكتوب رموزاً ومسافاتٍ بلا
  //  حرفٍ ولا رقم: أَولى أن يرى الموظّف «لا نتائج» من أن يرى السجلّ كلّه.
  const where = branches.length
    ? sql`(${sql.join(branches, sql` OR `)})`
    : sql`FALSE`;

  //  السلّم نفسه بأرقامه — والأصغر أدقّ، فـ`ORDER BY rank ASC`.
  //  ودرجاتٌ لا فرعَ لها في `where` تُحذف من السلّم أيضاً: تقييمُ شرطٍ لا
  //  يمكن أن يصدق هو قراءةُ عمودٍ ومقارنةٌ لكلّ صفٍّ بلا مقابل.
  //  (ودرجتا الرمز والاسم البديل ليستا هنا: مسارُهما رجع قبل قليل.)
  const steps: SQL[] = [];
  if (phoneUsable) steps.push(sql`WHEN ${PHONE} = ${qDigits} THEN ${R(RANK.PHONE_EXACT)}`);
  if (q) {
    steps.push(sql`WHEN ${NAME} = ${q} THEN ${R(RANK.NAME_EXACT)}`);
    steps.push(sql`WHEN ${NAME} LIKE ${q + "%"} THEN ${R(RANK.NAME_PREFIX)}`);
  }
  if (g.tokenPrefixOn) steps.push(sql`WHEN ${NAME} LIKE ${"% " + q + "%"} THEN ${R(RANK.TOKEN_PREFIX)}`);
  if (digitsUsable) steps.push(sql`WHEN ${CODE_DIGITS} = ${qDigits} THEN ${R(RANK.ID_PREFIX)}`);
  if (phoneUsable) steps.push(sql`WHEN ${PHONE} LIKE ${qDigits + "%"} THEN ${R(RANK.ID_PREFIX)}`);
  if (g.substringOn) {
    steps.push(sql`WHEN ${NAME} LIKE ${"%" + q + "%"} THEN ${R(RANK.SUBSTRING)}`);
    steps.push(sql`WHEN ${CONDITION} LIKE ${"%" + q + "%"} THEN ${R(RANK.SUBSTRING)}`);
  }

  //  `CASE ELSE` وحده ليس SQL صالحاً، ولا شرطَ يبقى حين لا فرعَ يبقى.
  const rank = steps.length
    ? sql`CASE ${sql.join(steps, sql` `)} ELSE ${R(RANK.FUZZY)} END`
    : sql`${R(RANK.FUZZY)}`;

  return { where, rank };
}

/**
 * البوّابات المشتركة بين الشرط والرتبة وكاسر التعادل — تُحسب مرّةً.
 *
 * ══ لماذا تُقاس الفروع بطول ما كُتب ═════════════════════════════════════
 * «نتائج من أول حرف» و«بلا مسحٍ كامل» يلتقيان هنا لا يتعارضان: لكلّ فرعٍ
 * أقصرُ استعلامٍ يستطيع فهرسٌ خدمتَه، وما دونه يُسقَط.
 *
 *   · **البادئة** من الحرف الأوّل — `text_pattern_ops` يخدم `'ا%'` مدىً
 *     في شجرة، فأرخصُ ما في الباب هو أوّل ما يُكتب.
 *   · **بادئةُ الكلمة والاحتواء والتسامح** من ثلاثة — `pg_trgm` لا يستخرج
 *     ترايغراماً من مقطعٍ دون ثلاثة محارف، فـ`'%اح%'` يصير «فهرساً»
 *     بالاسم ومسحاً كاملاً بالفعل. ثمّ إن التسامح في حرفين يطابق نصف
 *     السجلّ فيؤذي أكثر ممّا يعين.
 *
 * فحرفٌ أو حرفان ⟶ بادئةُ الاسم وحدها (مع الرمز والهاتف)، وثلاثةٌ ⟶ السلّم
 * كاملاً. والنتائج تظهر من أوّل حرفٍ في الحالتين.
 *
 * قياسٌ على ٦٠٬٠٠٠ صفّ — «اح» بلا بوّابة ٦٠٨ مللي ثانية وبها ٤، و«احم»
 * ١١٩٥ ⟶ ٢٩.
 */
function searchGates(rawQuery: string, opts: { trigram: boolean }) {
  const q = normalizeSearchText(rawQuery);
  const qDigits = digitsOnly(rawQuery);
  //  قراءةٌ واحدة للمكتوب بوصفه رمزاً — كاملاً أو نصفَ مكتوب. وهي نفسها
  //  التي يقرأ بها `matchPatient` في المتصفّح، فلا دلالتان تنحرفان.
  const cq = parsePatientCodeQuery(rawQuery);
  const code = cq.full;

  //  الأعمدة المخزَّنة لا الدالّة — هي عينُها محسوبةً مرّةً عند الكتابة،
  //  فالمخطِّط يرى عموداً مفهرساً لا استدعاءً لكلّ صفّ (ترحيل ٠٥٤).
  const NAME = sql`${patients.nameNorm}`;
  const PHONE = sql`${patients.phoneDigits}`;
  const CODE_DIGITS = sql`${patients.codeDigits}`;
  //  الحالة المرضية نصٌّ حرّ يُكتب مرّةً ويُقرأ نادراً، فلا عمودَ مخزَّن لها:
  //  فهرسُ تعبيرٍ ترايغراميّ يكفي — الترشيح مفهرس، وإعادةُ الفحص تقع على
  //  الصفوف المرشَّحة وحدها لا على الجدول.
  const CONDITION = sql`patient_search_norm(${patients.medicalCondition})`;

  return {
    q, qDigits, code, cq, NAME, PHONE, CODE_DIGITS, CONDITION,
    //  استعلامٌ **غير مرتبط** عمداً: `EXISTS` المرتبط بـ`patients.id` يجبر
    //  القاعدة على المرور بكلّ صفٍّ لتقييمه. و`code` مفتاحُ جدول الأسماء
    //  البديلة الأوّلي فالجواب صفٌّ واحد على الأكثر — فيُحسب مرّةً كـ
    //  InitPlan ثمّ يُقارن بالمفتاح الأوّلي. (٤٤ مللي ثانية ⟶ ٠٫١)
    ALIAS_HIT: code
      ? sql`${patients.id} = (SELECT a.patient_id FROM patient_code_aliases a
                               WHERE a.code = ${code})`
      : sql`FALSE`,
    //  الرقم يُقارن رمزاً بأربع خاناتٍ فأكثر: «42» ليس رمزاً، وثلاثُ خاناتٍ
    //  تطابق نصفَ السجلّ بلا فائدة. والهاتف من خانتين لأنه بادئةٌ مفهرسة.
    digitsUsable: qDigits.length >= 4,
    phoneUsable: qDigits.length >= 2,
    tokenPrefixOn: q.length >= FUZZY_MIN_QUERY,
    substringOn: q.length >= FUZZY_MIN_QUERY,
    fuzzyOn: opts.trigram && q.length >= FUZZY_MIN_QUERY,
  };
}

/**
 * كسرُ التعادل داخل الرتبة — الأقرب تشابهاً أوّلاً حين يتوفّر الترايغرام.
 *
 * `GREATEST` للمقياسين معاً وللسبب نفسه: صفٌّ دخل لأن كلمةً بداخله تشبه ما
 * كُتب يجب أن يُرتَّب بتلك الكلمة، لا بتشابه الاسم كلّه الذي أدخله صفراً.
 *
 * وهنا تُستعمل **صيغةُ الدالّة** عن قصد: الترتيب يقع بعد الترشيح على
 * صفوفٍ قليلة، فلا فهرسَ يُطلب ولا مسحَ يقع.
 *
 * **ولا يُحسب إلّا حيث يعني شيئاً**: استعلامٌ دون ثلاثة محارف لا فرعَ
 * تقريبيّ له أصلاً، فكلّ ما يدخل دخل بمطابقةٍ حرفية — وحسابُ ترايغرامٍ
 * لترتيبه كلفةٌ بلا معنى (٤٠٠ مللي ثانية على ٦٠٬٠٠٠ صفّ). فيبقى الترتيب
 * على `created_at` كما كان السجلّ دائماً.
 *
 * وكذلك بلا الامتداد — فلا يتغيّر شيءٌ لمن لا امتداد لديه.
 */
export function searchTieBreaker(rawQuery: string, opts: { trigram: boolean }): SQL {
  const q = normalizeSearchText(rawQuery);
  //  بحثُ الرمز يُرتَّب بالرمز: مَن يتصفّح «WB-02» يقرأ ٠٢١١٠ ثمّ ٠٢١١٩،
  //  لا ترتيباً بتاريخِ تسجيلٍ لا يراه. ولا معنى لتشابهٍ نصّيّ هنا أصلاً.
  if (parsePatientCodeQuery(rawQuery).explicit) return sql`${patients.patientCode} ASC`;
  return opts.trigram && q.length >= FUZZY_MIN_QUERY
    ? sql`GREATEST(
        similarity(${patients.nameNorm}, ${q}),
        word_similarity(${q}, ${patients.nameNorm})
      ) DESC`
    : sql`${patients.createdAt} DESC NULLS LAST`;
}
