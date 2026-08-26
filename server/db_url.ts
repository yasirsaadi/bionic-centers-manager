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

/**
 * **قاعدةٌ مسموحٌ للاختبارات أن تكتب فيها** — عُرفُ المشروع القائم بحرفه.
 *
 * هو الشرطُ نفسُه المكتوب في ٤٥ ملفَّ اختبار منذ البداية:
 * `localhost` · `127.0.0.1` · أو رابطٌ يحمل كلمة `test`.
 *
 * **ولا تُخترَع هنا قائمةُ سماحٍ لروابط الإنتاج** ولا يُشدَّد الشرطُ في هذه
 * التمريرة: تشديدُه قد يمنع إعداداً محلّياً قائماً، وهذا تغييرٌ يستحقّ قراراً
 * مستقلاً. **والحدُّ المعروف**: `test` تُطابَق كسلسلةٍ فرعية، فمضيفٌ اسمُه
 * `latest-prod` يمرّ. الحارسُ يرفع الأمانَ عمّا كان، ولا يدّعي الكمال.
 */
export function isPermittedTestDatabaseUrl(url: string | null | undefined): boolean {
  return typeof url === "string" && /test|localhost|127\.0\.0\.1/.test(url);
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

export interface DatabaseSafetyDecision {
  /** هل يُسمح ببناء المسبح؟ */
  allowed: boolean;
  /** أهذه عمليةُ اختبار؟ — فخارجَها لا يتدخّل هذا الحارسُ بحرف. */
  isTest: boolean;
  /** الرابطُ الذي سيستعمله المسبحُ فعلاً. */
  resolvedUrl: string | null;
  /** ومن أيِّ متغيّرٍ جاء. */
  source: DatabaseUrlVar | null;
  /** رسالةٌ صريحة عند المنع — تسمّي المتغيّرَ الفائز. */
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
  if (!isPermittedTestDatabaseUrl(resolvedUrl)) {
    return {
      allowed: false, isTest: true, resolvedUrl, source,
      //  **يُسمّى المتغيّرُ الفائز** — وإلّا صحّح المطوّرُ الآخرَ وبقي العطب.
      reason:
        `رُفض تشغيل الاختبارات: القاعدةُ التي سيتّصل بها المسبح تأتي من ${source}`
        + ` وليست قاعدةً اختبارية محلّية.\n`
        + `  والاختباراتُ تكتب وتحذف — فتشغيلُها على قاعدةٍ حيّة يهدم سجلّاً طبياً ومالياً.\n`
        + `  المسموح: localhost · 127.0.0.1 · أو رابطٌ يحمل كلمة test.\n`
        + `  وانتبه: ${DATABASE_URL_VARS[0]} تسبق ${DATABASE_URL_VARS[1]}،`
        + ` فضبطُ الثانية وحدها لا يكفي — أفرِغ الأولى أو وجّهها إلى قاعدةٍ اختبارية.`,
    };
  }
  return { allowed: true, isTest: true, resolvedUrl, source };
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
