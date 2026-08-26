// **أيُّ قاعدةِ بيانات؟** — قرارٌ واحد يقرؤه المسبحُ وحارسُ الاختبارات معاً.
//
// ══ العطبُ الذي يغلقه هذا الملفّ ═══════════════════════════════════════════
// `server/db.ts` يبني المسبحَ من `EXTERNAL_DATABASE_URL || DATABASE_URL`،
// بينما ٤٥ ملفَّ اختبارٍ يحرسون `DATABASE_URL` **وحده**:
//
//     const DBURL = process.env.DATABASE_URL || "";
//     if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) process.exit(1);
//
// فالتركيبةُ التالية تمرّ من الحارس وتضرب الإنتاج:
//
//     EXTERNAL_DATABASE_URL = <Neon الإنتاج>      ← المسبحُ يستعمل هذه
//     DATABASE_URL          = localhost/test      ← والحارسُ يفحص هذه
//
// والاسمُ `EXTERNAL_DATABASE_URL` موجودٌ بالضبط ليشير إلى القاعدة الخارجية،
// وهو ما يُصدّره المطوّرُ وهو يحقّق في سؤالِ إنتاج — وهي اللحظةُ نفسُها التي
// قد يشغّل فيها حزمةَ اختبارات. فالحارسُ لا يغلق البابَ الذي كُتب لإغلاقه.
//
// ══ فالقرارُ صار هنا، مرّةً واحدة ═════════════════════════════════════════
// **ولا تُكرَّر `EXTERNAL_DATABASE_URL || DATABASE_URL` في منطقِ أمانٍ ثانٍ**
// ينحرف عن الأوّل يوماً. `server/db.ts` يقرأ من هنا، والحارسُ يقرأ من هنا،
// فالاثنان لا يختلفان على أيِّ قاعدةٍ يتكلّمان عنها.
//
// **ولا مِلفَّ قاعدةٍ يُستورَد هنا**: لا `pg` ولا `drizzle` ولا `./db`. هذا
// منطقٌ خالص، فيُختبَر بلا فتحِ اتّصالٍ واحد.
//
// ══ والعطبُ الثاني: «الشرطُ نفسُه كان أوسعَ ممّا يقول» ══════════════════════
// الشرطُ الموروث يُطابَق على **نصّ الرابط كلِّه**، فيمرّ منه مضيفٌ اسمُه
// `latest-prod` أو `notlocalhost`، وقاعدةٌ اسمُها `contest` أو `latest`،
// ورابطُ إنتاجٍ سلسلةُ استعلامه `?application_name=test`. وحارسٌ يمنع الهدمَ
// لا يجوز أن يُخدَع بحرفٍ في اسمِ مضيف. فالرابطُ صار **يُفكَّك ويُحكَم عليه**
// (`inspectDatabaseUrl` أدناه) لا يُطابَق نصّاً.

/** أسماءُ متغيّرات البيئة التي يقرؤها القرار — بترتيب الأسبقية. */
export const DATABASE_URL_VARS = ["EXTERNAL_DATABASE_URL", "DATABASE_URL"] as const;
export type DatabaseUrlVar = (typeof DATABASE_URL_VARS)[number];

/**
 * ما يكفي من البيئة — فتُحقَن في الاختبار بلا لمسِ `process.env`.
 *
 * **والفهرسُ العامّ ليس تراخياً**: `process.env` نوعُها `ProcessEnv` وهي
 * فهرسٌ عامٌّ بلا حقولٍ مسمّاة، فواجهةٌ بحقلين اختياريين وحدهما يرفضها
 * فحصُ الأنواع الضعيفة. والحقلان يبقيان مسمَّيين للتوثيق.
 */
export interface EnvLike {
  EXTERNAL_DATABASE_URL?: string | undefined;
  DATABASE_URL?: string | undefined;
  [key: string]: string | undefined;
}

const clean = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > 0 ? s : null;
};

/**
 * **الرابطُ الذي سيستعمله المسبحُ فعلاً** — أسبقيةُ الإنتاج كما هي بحرفها.
 *
 * `EXTERNAL_DATABASE_URL` تسبق `DATABASE_URL`. **ولا تُغيَّر هذه الأسبقية**:
 * الإنتاجُ يعمل بها، وهذا الملفّ يصفها لا يعيد تصميمها.
 */
export function resolveDatabaseUrl(env: EnvLike): string | null {
  return clean(env.EXTERNAL_DATABASE_URL) ?? clean(env.DATABASE_URL);
}

/**
 * **أيُّ متغيّرٍ فاز** — ليقول الحارسُ للمطوّر أينَ ينظر.
 *
 * رسالةٌ تقول «القاعدة غير آمنة» بلا اسم المتغيّر تترك المطوّرَ يصحّح
 * `DATABASE_URL` بينما العطبُ في `EXTERNAL_DATABASE_URL` — وهو العطبُ عينه
 * الذي جاء هذا الملفّ يغلقه.
 */
export function resolvedDatabaseUrlSource(env: EnvLike): DatabaseUrlVar | null {
  if (clean(env.EXTERNAL_DATABASE_URL)) return "EXTERNAL_DATABASE_URL";
  if (clean(env.DATABASE_URL)) return "DATABASE_URL";
  return null;
}

//  ══ **لماذا لا تُطابَق سلسلةٌ فرعية على الرابط كلِّه** ═════════════════════
//  الشرطُ الموروث `/test|localhost|127\.0\.0\.1/` يُطبَّق على **نصّ الرابط
//  كلِّه**، فيمرّ منه ما ليس محلّياً ولا اختبارياً بحال:
//
//      latest-prod.example.com      ← «test» داخل «latest»
//      notlocalhost.example.com     ← «localhost» داخل «notlocalhost»
//      …/contest · …/latest         ← اسمُ قاعدةٍ إنتاجيّ ابتلع الكلمة
//      …/neondb?application_name=test   ← سلسلةُ استعلامٍ لا علاقةَ لها بالوجهة
//      testhost.example.com/production  ← مضيفٌ اسمُه كذا وقاعدتُه إنتاج
//
//  وحارسٌ يمنع الهدمَ لا يجوز أن يُخدَع بحرفٍ في اسمِ مضيف. فالقاعدةُ صارت
//  **تُقرأ من الرابط مفكَّكاً**، لا من نصّه.

/** ما مُنع الرابطُ لأجله — رمزٌ يُقرأ في الاختبار قبل أن يُترجَم في الرسالة. */
export type PermittedDbRejection =
  | "unparseable"
  | "non_postgres_scheme"
  | "no_host"
  | "no_database_name"
  | "remote_not_test_named";

export interface PermittedDbVerdict {
  permitted: boolean;
  /** المضيفُ كما فُكِّك — بحروفٍ صغيرة، أو `null` إن تعذّر التفكيك. */
  host: string | null;
  /** اسمُ القاعدة من مقطع المسار وحده — لا الاستعلامُ ولا المستخدم. */
  database: string | null;
  /** أهو مضيفٌ محلّيٌّ **بالمطابقة الكاملة**؟ */
  local: boolean;
  rejection?: PermittedDbRejection;
}

//  **مطابقةٌ كاملة لا احتواء** — `notlocalhost` ليس `localhost`.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

//  ومخطَّطٌ لا نعرف كيف نقرأ اسمَ قاعدته لا يُقرأ منه اسمُ قاعدة.
const POSTGRES_SCHEMES = new Set(["postgres:", "postgresql:"]);

/**
 * **«test» رمزاً قائماً بذاته** — بادئةً أو لاحقةً أو بين فاصلين.
 *
 * تمرّ: `test` · `bionic_test` · `test_bionic` · `bionic-test` · `test-bionic`
 * وتُردّ: `latest` · `contest` · `attestation` — الكلمةُ فيها مبتلَعةٌ لا رمز.
 *
 * والفاصلان `_` و`-` وحدهما — ما لم يُذكَر لا يُفترَض.
 */
const TEST_TOKEN = /(?:^|[-_])test(?:$|[-_])/i;

/** اسمُ القاعدة = **مقطعُ المسار الأوّل وحده**. لا استعلامَ ولا جزءَ بعده. */
function databaseNameOf(parsed: URL): string | null {
  const first = parsed.pathname.replace(/^\/+/, "").split("/")[0] ?? "";
  let name = first;
  try {
    name = decodeURIComponent(first);
  } catch {
    //  ترميزٌ معطوب يبقى كما هو — واتّجاهُ الخطأ هنا نحو المنع لا السماح.
  }
  return name.length > 0 ? name : null;
}

/**
 * **تفكيكُ الرابط والحكمُ عليه** — الأساسُ الذي تقوم عليه قاعدةُ السماح.
 *
 * ① يُفكَّك الرابطُ فعلاً. **وما لا يُفكَّك يُردّ** — لا يُخمَّن ولا يُوسَّع
 *    الحارسُ لصِيَغٍ غير معروفة (`host=… dbname=…` مثلاً) استباقاً.
 * ② **المضيفُ محلّيٌّ بالمطابقة الكاملة** `localhost` أو `127.0.0.1` —
 *    وحينها يُسمَح مهما كان اسمُ القاعدة (قاعدةٌ على جهازِ المطوّر).
 * ③ **ولمضيفٍ بعيد: اسمُ القاعدة وحده** يُفحَص — لا المضيف، ولا المستخدم،
 *    ولا كلمةُ المرور، ولا سلسلةُ الاستعلام، ولا المنفذ.
 */
export function inspectDatabaseUrl(url: string | null | undefined): PermittedDbVerdict {
  const denied = (rejection: PermittedDbRejection, host: string | null = null,
    database: string | null = null): PermittedDbVerdict =>
    ({ permitted: false, host, database, local: false, rejection });

  if (typeof url !== "string" || url.trim().length === 0) return denied("unparseable");

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return denied("unparseable");
  }

  if (!POSTGRES_SCHEMES.has(parsed.protocol)) return denied("non_postgres_scheme");

  //  المضيفُ المبهم لا يُصغَّر تلقائياً في مخطَّطٍ غير قياسيّ، فيُصغَّر هنا.
  const host = parsed.hostname.toLowerCase();
  if (!host) return denied("no_host");

  const database = databaseNameOf(parsed);

  if (LOCAL_HOSTS.has(host)) return { permitted: true, host, database, local: true };

  if (!database) return denied("no_database_name", host);
  if (!TEST_TOKEN.test(database)) return denied("remote_not_test_named", host, database);

  return { permitted: true, host, database, local: false };
}

/**
 * **قاعدةٌ مسموحٌ للاختبارات أن تكتب فيها** — ثلاثُ حالاتٍ لا رابعة:
 *
 *   · المضيفُ **بالضبط** `localhost` (بأيّ منفذ)
 *   · المضيفُ **بالضبط** `127.0.0.1` (بأيّ منفذ)
 *   · مضيفٌ بعيدٌ **واسمُ قاعدته يحمل الرمزَ `test`** — بادئةً أو لاحقةً أو
 *     بين فاصلين.
 *
 * **وما عدا ذلك يُردّ** — ومنه الرابطُ الذي لا يُفكَّك. **ولا تُخترَع قائمةُ
 * سماحٍ لروابط الإنتاج**، ولا يُوسَّع الحارسُ لصِيَغٍ غير معروفة استباقاً.
 */
export function isPermittedTestDatabaseUrl(url: string | null | undefined): boolean {
  return inspectDatabaseUrl(url).permitted;
}

/**
 * **أهذه العمليةُ نقطةَ دخولِ اختبار؟**
 *
 * ══ لماذا `argv[1]` وليس `NODE_ENV` ═══════════════════════════════════════
 * كلُّ اختبارٍ في هذا المستودع يُشغَّل بصيغةٍ واحدة: `tsx <path>.test.ts`
 * (٨١ سكربتاً في `package.json`، بلا استثناء). و`tsx` يضع مسارَ ملفّ الدخول
 * في `process.argv[1]` — أُثبت عملياً لا افتراضاً.
 *
 * ونقاطُ الدخول غيرُ الاختبارية لا تنتهي بـ`.test.ts` إطلاقاً:
 *   `dev`   ⟶ `server/index.ts`
 *   `build` ⟶ `script/build.ts`
 *   `start` ⟶ `dist/index.cjs`
 *   `telegram:patient-webhook` ⟶ `scripts/patient_telegram_webhook.ts`
 *
 * فالتمييزُ دقيقٌ في الاتجاهين: **لا اختبارَ يفلت، ولا خادمَ يُمنَع**.
 * و`NODE_ENV` كان سيفشل — الاختباراتُ لا تضبطه أصلاً.
 */
export function isTestEntryPoint(argv: readonly string[] | undefined): boolean {
  const entry = Array.isArray(argv) ? argv[1] : undefined;
  return typeof entry === "string" && /\.test\.tsx?$/.test(entry);
}

/** ترجمةُ سببِ المنع — تُقرأ في الرسالة، ويُقارَن الرمزُ في الاختبار. */
const REJECTION_REASONS: Record<PermittedDbRejection, string> = {
  unparseable: "تعذّر تفكيكُ الرابط — وما لا يُقرأ يقيناً لا يُسمَح به.",
  non_postgres_scheme: "مخطَّطُ الرابط ليس postgres:// ولا postgresql://.",
  no_host: "لا مضيفَ في الرابط.",
  no_database_name: "مضيفٌ بعيدٌ بلا اسمِ قاعدةٍ في المسار.",
  remote_not_test_named:
    "مضيفٌ بعيد، واسمُ قاعدته لا يحمل الرمزَ test"
    + " (وكلمةٌ ابتلعته مثل latest أو contest ليست رمزاً).",
};

export interface DatabaseSafetyDecision {
  /** هل يُسمح ببناء المسبح؟ */
  allowed: boolean;
  /** أهذه عمليةُ اختبار؟ — فخارجَها لا يتدخّل هذا الحارسُ بحرف. */
  isTest: boolean;
  /** الرابطُ الذي سيستعمله المسبحُ فعلاً. */
  resolvedUrl: string | null;
  /** ومن أيِّ متغيّرٍ جاء. */
  source: DatabaseUrlVar | null;
  /** حكمُ التفكيك — يُحسَب داخل الاختبار وحده، فخارجَه لا رأيَ للحارس. */
  verdict?: PermittedDbVerdict;
  /** رسالةٌ صريحة عند المنع — تسمّي المتغيّرَ الفائز والسبب. */
  reason?: string;
}

/**
 * **القرارُ كاملاً — دالّةٌ خالصة تُحقَن بيئتُها وسطرُ أوامرها.**
 *
 * خارجَ الاختبار: **مسموحٌ دائماً**، بلا استثناء. الخادمُ في التطوير
 * والإنتاج والبناءُ لا يتغيّر سلوكُها بحرف — الحارسُ اختباريٌّ وحده.
 */
export function checkDatabaseSafety(params: {
  env: EnvLike;
  argv: readonly string[] | undefined;
}): DatabaseSafetyDecision {
  const resolvedUrl = resolveDatabaseUrl(params.env);
  const source = resolvedDatabaseUrlSource(params.env);
  const isTest = isTestEntryPoint(params.argv);

  //  **خارجَ الاختبار لا رأيَ لهذا الحارس** — الإنتاجُ يتّصل بما هو مضبوط له.
  if (!isTest) return { allowed: true, isTest: false, resolvedUrl, source };

  if (!resolvedUrl) {
    return {
      allowed: false, isTest: true, resolvedUrl, source,
      reason: "لا رابطَ قاعدةِ بيانات مضبوط — اضبط DATABASE_URL على قاعدةٍ اختبارية محلّية.",
    };
  }
  const verdict = inspectDatabaseUrl(resolvedUrl);
  if (!verdict.permitted) {
    return {
      allowed: false, isTest: true, resolvedUrl, source, verdict,
      //  **يُسمّى المتغيّرُ الفائز والسببُ معاً** — وإلّا صحّح المطوّرُ
      //  المتغيّرَ الآخر، أو ظنّ العطبَ في المضيف وهو في اسم القاعدة.
      reason:
        `رُفض تشغيل الاختبارات: القاعدةُ التي سيتّصل بها المسبح تأتي من ${source}`
        + ` وليست قاعدةً اختبارية.\n`
        + `  السبب: ${REJECTION_REASONS[verdict.rejection ?? "unparseable"]}\n`
        + (verdict.host ? `  المضيف: ${verdict.host}`
          + (verdict.database ? ` · القاعدة: ${verdict.database}` : "") + "\n" : "")
        + `  والاختباراتُ تكتب وتحذف — فتشغيلُها على قاعدةٍ حيّة يهدم سجلّاً طبياً ومالياً.\n`
        + `  المسموح: مضيفٌ هو بالضبط localhost أو 127.0.0.1 (بأيّ منفذ)،`
        + ` أو قاعدةٌ بعيدةٌ اسمُها يحمل الرمزَ test (test · bionic_test · test-bionic).\n`
        + `  وانتبه: ${DATABASE_URL_VARS[0]} تسبق ${DATABASE_URL_VARS[1]}،`
        + ` فضبطُ الثانية وحدها لا يكفي — أفرِغ الأولى أو وجّهها إلى قاعدةٍ اختبارية.`,
    };
  }
  return { allowed: true, isTest: true, resolvedUrl, source, verdict };
}

/** رسالةُ الرفض جاهزةً — يستعملها `db.ts` ويقرؤها الاختبار. */
export const TEST_DB_REFUSAL_PREFIX = "رُفض تشغيل الاختبارات:";

/**
 * **الحارسُ كما يُنادى في `server/db.ts` — قبل بناء المسبح.**
 *
 * يرمي عند المنع. ولا يتّصل بشيء ولا يستورد `pg`: القرارُ من البيئة وسطرِ
 * الأوامر وحدهما، فيقع **قبل** أن يُفتَح أيُّ اتّصال.
 */
export function assertDatabaseSafeForEntryPoint(params: {
  env: EnvLike;
  argv: readonly string[] | undefined;
}): DatabaseSafetyDecision {
  const decision = checkDatabaseSafety(params);
  if (!decision.allowed) throw new Error(decision.reason);
  return decision;
}
