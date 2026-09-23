// **التحديثُ الحيّ**: كلُّ كتابةٍ تنجح ⟶ تُحدَّث كلُّ شاشةٍ مفتوحة.
// `npm run test:live-refresh` — بلا قاعدة بيانات وبلا شبكة.
//
// ══ العطبُ الذي يغلقه (شكوى المالك ٢٠٢٦-٠٩-٢٣) ══════════════════════════
// «حين تضيف شيئاً أو تحذف أو تغيّر، بعضُ نوافذ التطبيق لا تُظهر التعديل
// إلّا بعد إعادة تحميل الصفحة.» والسببُ أن كلَّ كتابةٍ كانت تحمل قائمةَ
// مفاتيحَ مكتوبةً بيد مَن كتبها — ٢٣٤ قائمةً في ٤١ ملفاً — ومَن نسي مفتاحاً
// بقيت شاشتُه قديمة.
//
// ولا يكفي أن تُقرأ الشيفرة: يُبنى `QueryClient` حقيقيّ، ويُلَفّ `fetch`
// حقيقيّ، ثمّ تُنفَّذ كتابةٌ ويُسأل المفتاحُ الذي لم تكن تعرفه قائمةٌ قطّ.

export {};

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}
function same(msg: string, got: unknown, expected: unknown) {
  check(msg, JSON.stringify(got) === JSON.stringify(expected),
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`);
}

// ══ `fetch` مزيَّف يُركَّب **قبل** استيراد الوحدة ═══════════════════════════
//  الغلافُ يلتقط `fetch` لحظةَ تركيبه، فلو استُورد أوّلاً لالتقط الأصليَّ
//  وذهبت نداءاتُ الاختبار إلى الشبكة. فالاستيرادُ ديناميٌّ بعد التزييف.
type Call = { url: string; method: string };
const calls: Call[] = [];
let nextOk = true;
(globalThis as any).fetch = async (input: any, init?: any) => {
  const url = typeof input === "string" ? input : String(input?.url ?? input);
  calls.push({ url, method: String(init?.method ?? "GET") });
  return {
    ok: nextOk, status: nextOk ? 200 : 400, statusText: "",
    json: async () => ({}), text: async () => "",
  } as any;
};

const mod = await import("./queryClient");
const {
  apiRequest, queryClient, isLiveRefreshWrite, scheduleLiveRefresh,
  resetLiveRefreshForTest, installLiveRefresh, LIVE_REFRESH_DELAY_MS,
} = mod as any;

const settle = () => new Promise((r) => setTimeout(r, LIVE_REFRESH_DELAY_MS + 40));

/** مفتاحٌ من عائلةٍ **لم تعرفها قائمةٌ يدويّةٌ قطّ** — سبعةُ عناصر. */
const REGISTRY: any[] = ["/api/patients/registry", 3, 25, "بحث", 1, "all", "2026-09-01"];
/** ومفتاحٌ يحمل رقمَه في **جسمه** — لا بادئةَ تصيبه (درسُ الطلب ٣٨٤). */
const ORDERS: any[] = ["/api/manufacturing/patient/1982/orders"];
/** وثالثٌ لا علاقةَ له بما كُتب — شاهدٌ على أن القاعدة شاملةٌ عن قصد. */
const SETTINGS: any[] = ["/api/system-settings"];
const ALL = [REGISTRY, ORDERS, SETTINGS];

function seed() {
  resetLiveRefreshForTest();
  queryClient.clear();
  for (const k of ALL) queryClient.setQueryData(k, { seeded: true });
}
const invalidated = (k: any[]) => queryClient.getQueryState(k)?.isInvalidated === true;
const allInvalidated = () => ALL.map(invalidated);

async function main() {
  // ══ (أ) القرارُ خالصاً ════════════════════════════════════════════════
  check("أ١. كتابةٌ على نقطةٍ من التطبيق ⟵ نعم",
    isLiveRefreshWrite("POST", "/api/patients"));
  check("أ٢. وبأيّ فعلِ كتابة",
    ["PUT", "PATCH", "DELETE"].every((m) => isLiveRefreshWrite(m, "/api/x")));
  check("أ٣. وبحروفٍ صغيرة", isLiveRefreshWrite("post", "/api/x"));
  check("أ٤. **والقراءةُ لا تُحدِّث شيئاً**",
    !isLiveRefreshWrite("GET", "/api/patients") && !isLiveRefreshWrite("HEAD", "/api/x"));
  check("أ٥. وما ليس من نقاط التطبيق يُردّ",
    !isLiveRefreshWrite("POST", "/assets/x") && !isLiveRefreshWrite("POST", "/apiary/x"));
  check("أ٦. وعنوانٌ مطلقٌ خارج المتصفّح يُردّ",
    !isLiveRefreshWrite("POST", "https://other.example/api/x"));
  check("أ٧. **ومحادثةُ المساعد مستثناةٌ صراحةً** — ليست تغييرَ بيانات",
    !isLiveRefreshWrite("POST", "/api/ai/chat"));
  check("أ٨. ومعرفتُه ليست منها — تلك بياناتٌ تُعرَض",
    isLiveRefreshWrite("POST", "/api/ai/knowledge/suggestions"));
  check("أ٩. والاستعلامُ في العنوان لا يخدع الاستثناء",
    !isLiveRefreshWrite("POST", "/api/ai/chat?x=1"));
  check("أ١٠. والمشوَّهُ يُردّ بلا انفجار",
    !isLiveRefreshWrite("", "") && !isLiveRefreshWrite("POST", ""));

  // ══ (ب) **العطبُ بعينه**: كتابةٌ تُحدِّث مفتاحاً لم تعرفه قائمة ═════════
  {
    seed();
    same("ب١. الشاشاتُ الثلاث طازجةٌ قبل الكتابة", allInvalidated(), [false, false, false]);
    const res = await apiRequest("POST", "/api/patients", { name: "س" });
    check("ب٢. (الكتابةُ نجحت)", res.ok === true);
    same("ب٣. **وقبل انقضاء النافذة لم يقع شيء**", allInvalidated(), [false, false, false]);
    await settle();
    same("ب٤. **ثمّ تُحدَّث الثلاثُ معاً — بلا قائمةٍ كتبها أحد**",
      allInvalidated(), [true, true, true]);
  }

  // ══ (ج) والقراءةُ لا تُحدِّث، والفاشلةُ لا تُحدِّث ═══════════════════════
  {
    seed();
    await apiRequest("GET", "/api/patients");
    await settle();
    same("ج١. قراءةٌ ⟵ لا شيء", allInvalidated(), [false, false, false]);

    seed(); nextOk = false;
    try { await apiRequest("POST", "/api/patients", {}); } catch { /* تُرمى بحكم العقد */ }
    nextOk = true;
    await settle();
    same("ج٢. **وكتابةٌ رُدّت بخطأ ⟵ لا شيء** — لم يتغيّر شيءٌ لتُعرَض",
      allInvalidated(), [false, false, false]);

    seed();
    await apiRequest("POST", "/api/ai/chat", { messages: [] });
    await settle();
    same("ج٣. ورسالةٌ للمساعد ⟵ لا شيء", allInvalidated(), [false, false, false]);
  }

  // ══ (د) **التجميع**: دفعةُ كتاباتٍ ⟵ تحديثٌ واحد ══════════════════════
  {
    seed();
    let passes = 0;
    const real = queryClient.invalidateQueries.bind(queryClient);
    queryClient.invalidateQueries = (...a: any[]) => { passes++; return real(...a); };
    for (let i = 0; i < 6; i++) await apiRequest("POST", `/api/visits/${i}`, {});
    await settle();
    queryClient.invalidateQueries = real;
    same("د١. **ستُّ كتاباتٍ متتابعة ⟵ تمريرةُ تحديثٍ واحدة**", passes, 1);
    same("د٢. والشاشاتُ حُدِّثت", allInvalidated(), [true, true, true]);
  }

  // ══ (هـ) **والتأخيرُ شرطُ صحّة**: ما نُزع لا يُعاد جلبُه ═══════════════
  //  حذفُ مريضٍ ينزع مفاتيحَ صفحته (ترحيل ٠٦٨) لأن إعادة جلبها تردّ ٤٠٤.
  //  ولو وقع التحديثُ فوراً لسبق النزعَ، فأُعيد جلبُ ملفٍّ لم يعد موجوداً.
  {
    seed();
    await apiRequest("DELETE", "/api/patients/1982");
    queryClient.removeQueries({ queryKey: ORDERS });   // كما يفعل مسارُ الحذف
    await settle();
    check("هـ١. **المنزوعُ لم يعد له أثرٌ في الذاكرة**",
      queryClient.getQueryState(ORDERS) === undefined,
      JSON.stringify(queryClient.getQueryState(ORDERS)));
    same("هـ٢. والباقيتان حُدِّثتا",
      [invalidated(REGISTRY), invalidated(SETTINGS)], [true, true]);
  }

  // ══ (و) الافتراضاتُ والتركيب ══════════════════════════════════════════
  {
    const q = queryClient.getDefaultOptions().queries as any;
    check("و١. **والعودةُ إلى النافذة تُحدِّث** — فيُرى عملُ الزملاء",
      q?.refetchOnWindowFocus === true, String(q?.refetchOnWindowFocus));
    check("و٢. وبلا استطلاعٍ دوريّ", q?.refetchInterval === false);
    const before = (globalThis as any).fetch;
    installLiveRefresh(queryClient);
    check("و٣. **ولا يُركَّب الغلافُ مرّتين**", (globalThis as any).fetch === before);
    resetLiveRefreshForTest();
    scheduleLiveRefresh(queryClient);
    resetLiveRefreshForTest();
    seed();
    await settle();
    same("و٤. وإلغاءُ الجدولة يمنع التحديث", allInvalidated(), [false, false, false]);
  }

  // ══ (ز) عقدُ الوصل في المصدر ═══════════════════════════════════════════
  {
    const { readFileSync } = await import("fs");
    const src = readFileSync("client/src/lib/queryClient.ts", "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    check("ز١. **والحارسُ مركَّبٌ فعلاً مع الوحدة**",
      /installLiveRefresh\(queryClient\)/.test(code));
    check("ز٢. والغلافُ على `fetch` وحدَه — نقطةُ الخنق الحقيقية",
      /g\.fetch\s*=/.test(code));
  }

  console.log(`\n${failures === 0 ? "✅ كل فحوص التحديث الحيّ نجحت" : `❌ ${failures} فحصاً فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
