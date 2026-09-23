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
    check("و١. **والعودةُ إلى النافذة تُحدِّث دائماً** — لا القديمَ وحده",
      q?.refetchOnWindowFocus === "always", String(q?.refetchOnWindowFocus));
    check("و١أ. و`staleTime` باقٍ ستّين ثانية — فلا يُعاد الجلبُ مع كلّ تركيب",
      q?.staleTime === 60_000, String(q?.staleTime));
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

  // ══ (ح) **الحلقةُ اللانهائية**: `POST` بوصفه `queryFn` ══════════════════
  //  استعلامٌ **فعّال** نقطتُه `POST`: التحديثُ يُبطله فيُعاد جلبُه، وإعادةُ
  //  الجلب تنادي النقطةَ فتُجدول تحديثاً — فلا تنتهي. أمسكها Codex على ٣٨٧،
  //  وأُعيد إنتاجُها حيّاً قبل الإصلاح: ٢٤ طلباً في ١٢٠٠ مللي ثانية.
  //
  //  **ولا يكفي أن تُقرأ القاعدة**: يُبنى `QueryObserver` حقيقيّ ويُشترَك فيه
  //  (فيصير الاستعلامُ فعّالاً كما على الشاشة)، ثمّ تُعدّ النداءاتُ الفعلية.
  {
    const { QueryObserver } = await import("@tanstack/react-query");
    const WINDOW_MS = 700;

    /** يُشغّل استعلاماً فعّالاً نقطتُه `POST` ويعدّ نداءاته خلال النافذة. */
    async function countWhileActive(url: string, opts: any = {}): Promise<number> {
      resetLiveRefreshForTest();
      queryClient.clear();
      const before = calls.length;
      const obs = new QueryObserver(queryClient, {
        queryKey: [url, "ح"],
        queryFn: async () => { await apiRequest("POST", url, {}); return {}; },
        ...opts,
      });
      const unsub = obs.subscribe(() => {});
      await new Promise((r) => setTimeout(r, WINDOW_MS));
      unsub();
      resetLiveRefreshForTest();
      const n = calls.slice(before).filter((c) => c.url === url).length;
      queryClient.clear();
      return n;
    }

    same("ح١. **تلميحاتُ المصروف: نداءٌ واحد لا حلقة**",
      await countWhileActive("/api/guidance/expense", { staleTime: 30_000 }), 1);
    same("ح٢. **ومعاينةُ التصحيح الإداريّ كذلك** — وهي بـ`staleTime: 0`",
      await countWhileActive("/api/admin/operation-reversal/preview",
        { staleTime: 0, gcTime: 0 }), 1);

    //  **وليس الهدوءُ من الأداة**: نقطةٌ غيرُ مستثناةٍ بالشكل نفسِه تدور فعلاً،
    //  فالاستثناءُ وحدَه هو ما أوقف الحلقةَ لا شيءٌ آخر في هذا الفحص.
    const loops = await countWhileActive("/api/__not_exempt__");
    check("ح٣. (والقياسُ ليس فارغاً: غيرُ المستثناة تدور فعلاً)",
      loops > 3, `عدد النداءات: ${loops}`);
    seed();
  }

  // ══ (ط) **الحارسُ المعماريّ**: لا نقطةَ كتابةٍ جديدة داخل `queryFn` ═════
  //  القائمةُ اليدويّة تشيخ — ونقطةٌ جديدة تُقرأ بـ`POST` وتُستعمَل استعلاماً
  //  تعيد الحلقةَ صامتةً. فتُقرأ مصادرُ الواجهة: كلُّ نداءٍ بفعلِ كتابةٍ داخل
  //  `queryFn` يجب أن يكون عنوانُه **مستثنى** — وإلّا تسقط الحزمة.
  {
    const { readFileSync, readdirSync, statSync } = await import("fs");
    const { join } = await import("path");

    function sources(dir: string, out: string[] = []): string[] {
      for (const e of readdirSync(dir)) {
        const f = join(dir, e);
        if (statSync(f).isDirectory()) { sources(f, out); continue; }
        if (!/\.tsx?$/.test(f) || /\.test\.tsx?$/.test(f)) continue;
        out.push(f);
      }
      return out;
    }
    const strip = (t: string) =>
      t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

    /** جسمُ الدالّة ابتداءً من أوّل `{` عند `from` — بموازنة الأقواس. */
    function blockAt(code: string, from: number): string {
      let i = code.indexOf("{", from);
      if (i < 0) return "";
      let depth = 0;
      for (let j = i; j < code.length; j++) {
        if (code[j] === "{") depth++;
        else if (code[j] === "}") { depth--; if (depth === 0) return code.slice(i, j + 1); }
      }
      return "";
    }

    /** ما بعد قائمةِ معامِلاتٍ تبدأ عند أوّل `(` من `from` — أو `-1`. */
    function parenEnd(code: string, from: number): number {
      const i = code.indexOf("(", from);
      if (i < 0) return -1;
      let depth = 0;
      for (let j = i; j < code.length; j++) {
        if (code[j] === "(") depth++;
        else if (code[j] === ")") { depth--; if (depth === 0) return j + 1; }
      }
      return -1;
    }

    /**
     * قيمةٌ **بلا أقواس** من `at` — بموازنة الأقواس، فتقف عند الفاصلة التي
     * تفصلها عن أختها، **أو عند الفاصلة المنقوطة التي تُنهي تعريفَها**، أو
     * عند قوس الكائن الحاوي، ولا تبتلع ما بعدها.
     *
     * **و`;` شرطُ صحّةٍ لا تجميل**: قيمةُ خاصّيةٍ تنتهي بفاصلة، أمّا قيمةُ
     * تعريفٍ (`const h = …;`) فتنتهي بها وحدها. وبلا الوقوف عندها كان
     * مساعِدٌ يبتلع الأسطرَ التالية إلى حدّ الأربعمئة، **فتُنسَب إليه
     * عناوينُ جيرانه** — ومنها اتّهامُ استعلامٍ مستثنىً حقيقيٍّ بعنوانِ
     * دالّةٍ مجاورة لا علاقةَ له بها (مقيسٌ حيّاً).
     *
     * وبحدٍّ أعلى: قيمةٌ أطولُ من ذلك ليست تعبيراً يُقرأ، والانفلاتُ فيها
     * يجعل الماسحَ يقرأ ملفّاً كاملاً بوصفه «استعلاماً».
     */
    function expressionAt(code: string, at: number): string {
      const end = Math.min(code.length, at + 400);
      let depth = 0;
      for (let j = at; j < end; j++) {
        const c = code[j];
        if (c === "(" || c === "[" || c === "{") depth++;
        else if (c === ")" || c === "]" || c === "}") {
          if (depth === 0) return code.slice(at, j);
          depth--;
        } else if ((c === "," || c === ";") && depth === 0) return code.slice(at, j);
      }
      return code.slice(at, end);
    }

    /**
     * **رأسُ دالّةِ سهمٍ في أوّلِ القيمة** — ما بعد `=>`، أو `-1`.
     *
     * ولا «`=>` في الجوار»: تلك كانت تُصيب سهماً لخاصّيةٍ تالية، فيُقرأ أوّلُ
     * `{` بعده وهو كتلةٌ لا علاقةَ لها بالاستعلام.
     *
     * **وقائمةُ المعامِلات تُقرأ بموازنة الأقواس** لا بـ`\([^)]*\)`: تلك تقف
     * عند أوّل `)` فتبتر قائمةً تحمل نوعاً بأقواس (`(f: () => void) => f()`)،
     * فيُقرأ جسمُ المساعِد ` Promise<…>` بدل `f()` — ولا يُمسَح ما فيه.
     */
    function arrowHeadEnd(code: string, at: number): number {
      const lead = (/^\s*(?:async\s+)?/.exec(code.slice(at, at + 40)) ?? [""])[0].length;
      let p = at + lead;
      if (code[p] === "(") {
        const end = parenEnd(code, p);
        if (end < 0) return -1;
        p = end;
      } else {
        const one = /^[A-Za-z_$][\w$]*/.exec(code.slice(p, p + 80));
        if (!one) return -1;
        p += one[0].length;
      }
      const arrow = /^\s*(?::[^=;]{0,120})?=>/.exec(code.slice(p, p + 160));
      return arrow ? p + arrow[0].length : -1;
    }

    /**
     * ما يُقرأ من قيمةٍ تبدأ عند `at`: **جسمُها بأقواس** أو **التعبيرُ نفسُه**.
     *
     * **وقاعدةٌ واحدة للطرفين** — قيمةِ `queryFn` وتعريفِ الدالّة المساعِدة —
     * فلا تنحرف إحداهما عن الأخرى. وأخذُ «أوّلِ `{` بعد التعريف» كان يقرأ
     * على مساعِدٍ بسهمٍ بلا أقواس (`const h = (id) => apiRequest("POST", …, { id })`)
     * **كائنَ الحمولة** بدل مُهيّئه، فلا يُمسَح فعلُ الكتابة ولا عنوانُه.
     */
    function valueBody(code: string, at: number): { text: string; isBlock: boolean } {
      const body = arrowHeadEnd(code, at);
      if (body >= 0) {
        if (/^\s*\{/.test(code.slice(body, body + 40))) {
          return { text: blockAt(code, body), isBlock: true };
        }
        return { text: expressionAt(code, body), isBlock: false };
      }
      //  **ودالّةٌ بكلمة `function`**: قائمةُ معامِلاتها قد تحمل `{` (تفكيكاً
      //  أو قيمةً افتراضية)، فيُقفَز عنها إلى جسمها لا إلى أوّل قوسٍ يصادَف.
      if (/^\s*(?:async\s+)?function\b/.test(code.slice(at, at + 40))) {
        const end = parenEnd(code, at);
        if (end > 0) return { text: blockAt(code, end), isBlock: true };
      }
      //  **وإلّا فتعبير**: إحالةٌ باسمٍ مجرَّد (`fetchUser`) أو نداءٌ
      //  (`getQueryFn({…})`).
      return { text: expressionAt(code, at), isBlock: false };
    }

    /** موضعُ **قيمةِ** تعريفِ `id` في هذا الملفّ — أو `-1` إن لم يُعرَّف فيه. */
    function definitionAt(code: string, id: string): number {
      const esc = id.replace(/\$/g, "\\$");
      const fn = new RegExp(`(?:async\\s+)?function\\s+${esc}\\b`).exec(code);
      if (fn) return fn.index;
      //  **وبعد علامةِ الإسناد لا عند `const`** — والنوعُ المكتوب قد يحمل
      //  `=>`، فعلامتُه ليست إسناداً.
      const assign = new RegExp(
        `(?:const|let|var)\\s+${esc}\\b[^;]{0,200}?=(?!=|>)`).exec(code);
      return assign ? assign.index + assign[0].length : -1;
    }

    const NOT_A_NAME = new Set(["async", "await", "return", "new", "typeof", "void"]);

    //  **ما يُنادي ما يُمرَّر إليه بحكم عقده** — لا يُقرأ من ملفٍّ لأنه ليس
    //  فيه: طرائقُ الوعد والمصفوفة، والواجهاتُ الساكنة، ومؤقّتاتُ المتصفّح.
    //
    //  **ومجموعةٌ مغلقة على الصنف كلِّه لا على ما صادفنا منه**: نقصانُ طريقةٍ
    //  واحدة يفتح مخرجاً صامتاً (`rows.findLast(saveThing)` كان يفلت).
    //  فتُعدُّ الطرائقُ المعياريةُ كلُّها التي تنادي وسيطَها الدالّيّ.
    //
    //  **والموضعُ جزءٌ من العقد لا تفصيلٌ فيه**: `‎.map(cb, thisArg)` تنادي
    //  الأوّلَ وحدَه، و`‎.reduce(cb, seed)` كذلك — فقراءةُ **كلّ** وسيطٍ
    //  ردَّ نداءٍ تُلصِق بالاستعلام كتابةَ قيمةٍ لا تُنفَّذ أبداً: اتّهامٌ
    //  باطل (مقيسٌ حيّاً) يُعطَّل به الحارسُ فلا يحرس شيئاً. فلكلّ طريقةٍ
    //  مواضعُها، ويُطابَق الوسيطُ بموضعه لا بوجوده.
    const INVOKING_METHODS = new Map<string, Set<number>>([
      //  الوعد — و`then` وحدَها تنادي موضعين
      ["then", new Set([0, 1])], ["catch", new Set([0])], ["finally", new Set([0])],
      //  المصفوفة — الردُّ أوّلُ وسائطها، وما بعده `thisArg` أو قيمةٌ ابتدائية
      ["map", new Set([0])], ["forEach", new Set([0])], ["filter", new Set([0])],
      ["find", new Set([0])], ["findIndex", new Set([0])],
      ["findLast", new Set([0])], ["findLastIndex", new Set([0])],
      ["some", new Set([0])], ["every", new Set([0])], ["flatMap", new Set([0])],
      ["sort", new Set([0])], ["toSorted", new Set([0])],
      ["reduce", new Set([0])], ["reduceRight", new Set([0])],
    ]);

    //  **والساكنةُ بناقلتها — اسمُ الطريقة وحدَه ليس عقداً**: `groupBy` ليست
    //  في `Array.prototype` إطلاقاً، بل `Object.groupBy(items, cb)` و
    //  `Map.groupBy(items, cb)` — **الردُّ في الموضع الثاني، والأوّلُ بيانات**.
    //  فـ`‎.groupBy(` مجرَّدةً قد تكون بانيَ استعلامٍ لا عقدَ له، وقراءتُها
    //  عقداً تُلاحق وسيطاً بريئاً.
    //
    //  **وبالناقلة زال سببُ استثناء `Array.from`** (٣٩٤): استُثنيت لأن
    //  `‎.from(` تقع في سلاسلَ لا تنادي شيئاً — ولم تعد تُقرأ إلّا بناقلتها
    //  وفي موضعها، فدخلت.
    //
    //  **وشرطُ الدخول أن يكون الموضعُ دالّةً في توقيعه**: فـ`JSON.stringify`
    //  موضعُها الثاني `دالّة أو مصفوفةُ مفاتيح`، و`String.replace` الثاني
    //  `نصٌّ أو دالّة` — والمُلتبِسُ يُترَك، فالاتّهامُ الباطل أخطرُ من مخرجٍ
    //  لا يقع (رَدُّ استبدالٍ يكتب على الخادم).
    const INVOKING_STATICS = new Map<string, Set<number>>([
      ["Object.groupBy", new Set([1])], ["Map.groupBy", new Set([1])],
      ["Array.from", new Set([1])], ["JSON.parse", new Set([1])],
    ]);

    const INVOKING_GLOBALS = new Map<string, Set<number>>([
      ["setTimeout", new Set([0])], ["setInterval", new Set([0])],
      ["setImmediate", new Set([0])], ["queueMicrotask", new Set([0])],
      ["requestAnimationFrame", new Set([0])], ["requestIdleCallback", new Set([0])],
    ]);

    /** فصلُ قائمةٍ بفواصلها على مستواها هي — لا داخل أقواسٍ متداخلة. */
    function splitTop(inner: string): string[] {
      const out: string[] = [];
      let depth = 0, start = 0;
      for (let j = 0; j < inner.length; j++) {
        const c = inner[j];
        if (c === "(" || c === "[" || c === "{") depth++;
        else if (c === ")" || c === "]" || c === "}") depth--;
        else if (c === "," && depth === 0) { out.push(inner.slice(start, j)); start = j + 1; }
      }
      out.push(inner.slice(start));
      return out;
    }

    /**
     * أسماءُ معامِلاتِ الدالّة التي قيمتُها عند `at` — بترتيبها.
     *
     * وما ليس اسماً مجرَّداً (تفكيكاً أو بقيّةً) يُقرأ فراغاً، فلا يُطابَق —
     * فالوسيطُ في ذلك الموضع لا يُلاحَق، والصمتُ أصدقُ من مطابقةٍ بالتخمين.
     */
    function paramNames(code: string, at: number): string[] {
      const slice = code.slice(at, at + 400);
      const lead = (/^\s*(?:async\s+)?/.exec(slice) ?? [""])[0].length;
      const rest = slice.slice(lead);
      let inner: string;
      if (rest.startsWith("(")) {
        const end = parenEnd(code, at + lead);
        if (end < 0) return [];
        inner = code.slice(at + lead + 1, end - 1);
      } else if (/^function\b/.test(rest)) {
        const open = code.indexOf("(", at + lead);
        const end = parenEnd(code, at + lead);
        if (open < 0 || end <= open) return [];
        inner = code.slice(open + 1, end - 1);
      } else {
        const one = /^([A-Za-z_$][\w$]*)\s*=>/.exec(rest);
        return one ? [one[1]] : [];
      }
      return splitTop(inner).map((p) => {
        //  **و`?` علامةُ اختيارٍ لا فاصلَ اسم**: `(f?: () => void)` معامِلٌ
        //  اسمُه `f`، وردُّه فراغاً كان يُسقط ملاحقةَ ما يُمرَّر إليه.
        const n = /^\s*([A-Za-z_$][\w$]*)\s*\??\s*(?::|=[^>]|$)/.exec(p);
        return n ? n[1] : "";
      });
    }

    /**
     * **أيُنادي `callee` معامِلَه رقم `index` في جسمه؟** — يُقرأ من تعريفه في
     * الملفّ نفسِه، بقاعدة «ما يُنادى» عينها (فالمعامِلُ قد يُنادى مباشرةً
     * `f()` أو يُمرَّر إلى مَن يناديه `‎.then(f)`).
     *
     * و`seen` تمنع الدوران بين مساعِدَين يُمرِّر كلٌّ منهما إلى الآخر.
     */
    function invokesParam(
      code: string, callee: string, index: number, seen: Set<string>,
    ): boolean {
      if (seen.has(callee)) return false;
      seen.add(callee);
      const at = definitionAt(code, callee);
      if (at < 0) return false;
      const name = paramNames(code, at)[index];
      if (!name) return false;
      const body = valueBody(code, at).text;
      return body ? calledNames(body, code, seen).includes(name) : false;
    }

    /**
     * **وسائطُ النداء التي هي اسمٌ مجرَّدٌ وحدَه ويُنادِيها مُستقبِلُها.**
     *
     * **و«وسيطٌ مجرَّد» ليس «رَدَّ نداءٍ» بذاته**: `cacheValue(saveThing)` قد
     * يخزّنه أو يقارنه أو يُرجعه ولا يناديه، فقراءتُه نداءً تُلصِق بالاستعلام
     * كتابةً لا يفعلها — **وهو صنفُ الاتّهام الباطل نفسُه** الذي يُعطَّل به
     * الحارسُ فلا يحرس شيئاً. فيُشترَط دليلُ نداءٍ لا احتمالُه:
     * **طريقةٌ تنادي بحكم عقدها** (`‎.then` وأخواتُها) · **أو تعريفٌ في الملفّ
     * يُثبت أن معامِلَه في ذلك الموضع يُنادى**. وما لا يُعرَف — طريقةٌ ليست
     * منها، أو دالّةٌ مستورَدة لا تُقرأ — **لا يُلاحَق**: الصمتُ أصدقُ.
     *
     * **والوسيطُ يُقرأ على مستوى قائمته وحدها**: `readThing(9, { onDone:
     * saveThing })` وسيطُه الثاني كائنٌ لا اسم، فيبقى خارجَ الملاحقة — والقوسُ
     * الذي لا يسبقه اسمٌ (قائمةُ معامِلات) لا يُقرأ قائمةَ وسائط.
     */
    function callbackArguments(
      text: string, code: string, seen: Set<string>,
    ): string[] {
      const out: string[] = [];
      for (let i = 0; i < text.length; i++) {
        if (text[i] !== "(") continue;
        //  الناقلةُ (إن كانت اسماً مجرَّداً) · والنقطةُ · واسمُ المُنادى.
        const head = /([A-Za-z_$][\w$]*)?\s*(\?\.|\.)?\s*([A-Za-z_$][\w$]*)\s*$/
          .exec(text.slice(0, i));
        if (!head) continue;
        const isMethod = Boolean(head[2]);
        const callee = head[3];
        //  **مواضعُ الردّ في هذا النداء** — والساكنةُ بناقلتها تسبق الطريقة.
        const slots = isMethod
          ? INVOKING_STATICS.get(`${head[1]}.${callee}`) ?? INVOKING_METHODS.get(callee)
          : INVOKING_GLOBALS.get(callee);
        let depth = 0, close = -1;
        for (let j = i; j < text.length; j++) {
          const c = text[j];
          if (c === "(" || c === "[" || c === "{") depth++;
          else if (c === ")" || c === "]" || c === "}") {
            depth--;
            if (depth === 0) { close = j; break; }
          }
        }
        if (close < 0) continue;
        splitTop(text.slice(i + 1, close)).forEach((raw, idx) => {
          const lone = raw.trim();
          if (!/^[A-Za-z_$][\w$]*$/.test(lone)) return;
          const invokes = slots
            ? slots.has(idx)
            : !isMethod && invokesParam(code, callee, idx, new Set(seen));
          if (invokes) out.push(lone);
        });
      }
      return out;
    }

    /**
     * الأسماءُ التي **تُنادى** في هذا النصّ — لا كلُّ اسمٍ يُذكَر فيه.
     *
     * فاسمٌ يُمرَّر **قيمةً خاملة** (`() => ({ saveThing })` أو
     * `() => readThing(9, { onDone: saveThing })`) لا يُنادى هنا، وحلُّه كان
     * يُلصِق بالاستعلام كتابةً لا يفعلها — **اتّهامٌ باطلٌ يُسقط الحزمةَ بلا
     * مخالفة** فيُعطَّل الحارسُ بعد أوّل مرّة (مقيسٌ حيّاً، وهو المبدأ نفسُه
     * الذي ردّ ملاحقةَ الأجسام بأقواس).
     *
     * **وثلاثةُ مواضعِ نداءٍ لا واحد**: رأسُ النداء (`saveThing(`) ·
     * **والوسيطُ المجرَّد الذي يُثبَت أن مُستقبِلَه يناديه** · **والقيمةُ التي
     * هي اسمٌ وحدَه** (`queryFn: helper` — تنادِيها مكتبةُ الاستعلام بحكم
     * موضعها).
     */
    function calledNames(
      text: string, code: string, seen: Set<string> = new Set(),
    ): string[] {
      const lone = text.trim();
      if (/^[A-Za-z_$][\w$]*$/.test(lone)) return [lone];
      const targets = (text.match(/[A-Za-z_$][\w$]*\s*\(/g) ?? [])
        .map((s) => s.replace(/\s*\($/, ""));
      return [...targets, ...callbackArguments(text, code, seen)];
    }

    /**
     * النصُّ المقروء، ومعه نصوصُ ما يُحيل إليه من تعاريف الملفّ نفسِه —
     * وإلّا بقي ما خلف الاسم بقعةً عمياء.
     *
     * **والملاحقةُ عبر التعابير وحدها، ولِما يُنادى منها وحدَه**
     * (`calledNames`)؛ أمّا **الجسمُ بأقواس فيُقرأ كما هو ولا تُلاحَق
     * أسماؤه**.
     * وهذا **مقيسٌ لا مُقدَّر**: ملاحقتُها تجرّ معظمَ الوحدة إلى الماسح،
     * فأنتجت في هذا المستودع النظيف **٩٢ اتّهاماً باطلاً** في تسعة ملفّات
     * (`Accounting.tsx` وأخواتها) — وحارسٌ يُسقط الحزمةَ بلا مخالفة يُعطَّل
     * بعد أوّل مرّة فلا يحرس شيئاً. **وحدُّه معلوم**: استعلامٌ بجسمٍ بأقواس
     * ينادي مساعِداً يكتب لا يُمسَك — وهو حدُّه قبل هذه التمريرة أيضاً، لا
     * انحدارٌ فيها. و`seen` تمنع الدورانَ بين مساعِدَين يُحيل كلٌّ للآخر.
     */
    function collect(
      code: string, text: string, out: string[], seen: Set<string>, chase: boolean,
    ) {
      out.push(text);
      if (!chase) return;
      for (const id of calledNames(text, code)) {
        if (NOT_A_NAME.has(id) || seen.has(id)) continue;
        seen.add(id);
        const at = definitionAt(code, id);
        if (at < 0) continue;
        const v = valueBody(code, at);
        if (v.text) collect(code, v.text, out, seen, !v.isBlock);
      }
    }

    /** كتلُ `queryFn` كلُّها — بجسمٍ بأقواس، أو بتعبير، أو بإحالةٍ باسم. */
    function queryFnBodies(code: string): string[] {
      const out: string[] = [];
      const re = /queryFn\s*:/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(code))) {
        const v = valueBody(code, m.index + m[0].length);
        if (v.text) collect(code, v.text, out, new Set(), !v.isBlock);
      }
      return out;
    }

    /** الحكمُ على مجموعةِ مصادر — المخالفاتُ بصيغة «ملفّ ⟵ عنوان». */
    function scan(files: Array<{ name: string; code: string }>) {
      const offenders: string[] = [];
      let scanned = 0, withWrite = 0;
      for (const f of files) {
        for (const body of queryFnBodies(strip(f.code))) {
          scanned++;
          if (!/["'](?:POST|PUT|PATCH|DELETE)["']/i.test(body)) continue;
          withWrite++;
          for (const lit of body.match(/["'`](\/api\/[^"'`\s]*)["'`]/g) ?? []) {
            const url = lit.slice(1, -1);
            if (isLiveRefreshWrite("POST", url)) offenders.push(`${f.name} ⟵ ${url}`);
          }
        }
      }
      return { offenders, scanned, withWrite };
    }

    const repo = scan(sources("client/src").map(
      (name) => ({ name, code: readFileSync(name, "utf8") })));
    check("ط١. (الماسحُ يرى كتلَ `queryFn` فعلاً)", repo.scanned > 100,
      `عدد الكتل: ${repo.scanned}`);
    check("ط٢. (ومنها ما ينادي بفعلِ كتابة)", repo.withWrite >= 2,
      `عددها: ${repo.withWrite}`);
    check("ط٣. **ولا واحدةٌ منها خارج الاستثناء** — وإلّا عادت الحلقة",
      repo.offenders.length === 0, repo.offenders.join(" · "));

    //  ══ **والحارسُ يُقاس على شكلٍ يمسكه، لا على مستودعٍ نظيفٍ اليوم** ═══
    //   مستودعٌ بلا مخالفةٍ يُخضِّر ط٣ ولو كان الماسحُ أعمى. فتُعرَض عليه
    //   الأشكالُ صراحةً — ومنها الشكلُ الذي كان يفلت: سهمٌ بتعبيرٍ يُحيل
    //   إلى دالّةٍ تكتب، فيُقرأ أوّلُ `{` بعده (كائنُ التسميات هنا) ويُقفَل
    //   بابُ حلِّ الاسم.
    const DECLARED = `
      async function helper(id: number) {
        const res = await apiRequest("POST", "/api/__probe__", { id });
        return res.json();
      }`;
    const fixture = (fn: string, helper = DECLARED) => `
      ${helper}
      useQuery({ queryKey: ["k"], queryFn: ${fn}, enabled: true });
      const SERVICE_LABEL = { prosthetic: "طرف صناعي" };
    `;
    const caught = (fn: string, helper?: string) =>
      scan([{ name: "fixture.tsx", code: fixture(fn, helper) }]).offenders.length > 0;

    check("ط٤. **سهمٌ بتعبيرٍ يُحيل إلى دالّةٍ تكتب** — الشكلُ الذي كان يفلت",
      caught("() => helper(id)"));
    check("ط٥. **وإحالةٌ باسمٍ مجرَّد**", caught("helper"));
    check("ط٦. **ونداءُ كتابةٍ مكتوبٌ في التعبير نفسِه**",
      caught(`() => apiRequest("POST", "/api/__probe__").then((r) => r.json())`));
    check("ط٧. **وجسمٌ بأقواس** — وهو ما كان يُمسَك أصلاً",
      caught(`async () => { const r = await apiRequest("POST", "/api/__probe__"); return r.json(); }`));
    check("ط٨. (والمستثنى لا يُبلَّغ عنه)",
      !caught(`() => apiRequest("POST", "/api/ai/chat").then((r) => r.json())`));
    check("ط٩. (ولا قراءةٌ عادية)",
      !caught(`() => apiRequest("GET", "/api/__probe__").then((r) => r.json())`));

    //  ══ **والمساعِدُ يُقرأ من مُهيّئه لا من أوّلِ `{` بعده** ═══════════════
    //   سهمٌ بلا أقواس يجعل أوّلَ `{` **كائنَ حمولة النداء**، فلا فعلُ
    //   الكتابة يُمسَح ولا عنوانُه — والحلقةُ تعود من هذا الباب.
    const ARROW_EXPR = `
      const helper = (id: number) => apiRequest("POST", "/api/__probe__", { id });`;
    const ARROW_BARE = `
      const helper = id => apiRequest("POST", "/api/__probe__", { id });`;
    const ARROW_BLOCK = `
      const helper = async (id: number) => {
        const res = await apiRequest("POST", "/api/__probe__", { id });
        return res.json();
      };`;
    const ARROW_TYPED = `
      const helper: (id: number) => Promise<unknown> =
        (id) => apiRequest("POST", "/api/__probe__", { id });`;
    const CHAINED = `
      const write = (id: number) => apiRequest("POST", "/api/__probe__", { id });
      const helper = (id: number) => write(id);`;
    const DEFAULT_BRACE = `
      async function helper(id: number, opts = { retry: false }) {
        const res = await apiRequest("POST", "/api/__probe__", { id, opts });
        return res.json();
      }`;

    check("ط١٠. **مساعِدٌ بسهمٍ بلا أقواس** — الشكلُ الذي كان يفلت",
      caught("() => helper(9)", ARROW_EXPR));
    check("ط١١. **وبمعامِلٍ عارٍ بلا قوسين**",
      caught("() => helper(9)", ARROW_BARE));
    check("ط١٢. **وبنوعٍ مكتوبٍ يحمل `=>`** — فعلامتُه ليست إسناداً",
      caught("() => helper(9)", ARROW_TYPED));
    check("ط١٣. **وسلسلةٌ**: تعبيرٌ يُحيل إلى تعبيرٍ يكتب",
      caught("() => helper(9)", CHAINED));
    check("ط١٤. (وسهمٌ بجسمٍ بأقواس يبقى ممسوكاً)",
      caught("() => helper(9)", ARROW_BLOCK));
    check("ط١٥. (ودالّةٌ مُعلَنة بقيمةٍ افتراضية تحمل `{`)",
      caught("() => helper(9)", DEFAULT_BRACE));
    //  ══ **ولا يُتّهم بريء** ══════════════════════════════════════════════
    //   ملفٌّ فيه استعلامُ قراءةٍ **ودالّةُ كتابةٍ مستقلّة لا ينادِيها** — وهو
    //   شكلُ معظم شاشات المستودع. ولوحقت أسماءُ الأجسام بأقواس في تجربةٍ
    //   حيّة فسقطت ط٣ **باثنين وتسعين اتّهاماً باطلاً**، فبقيت الملاحقةُ عبر
    //   التعابير وحدها.
    const INNOCENT = `
      async function saveThing(id: number) {
        const res = await apiRequest("POST", "/api/__probe__", { id });
        return res.json();
      }
      async function readThing(id: number) {
        const res = await apiRequest("GET", "/api/__read__/" + id);
        return res.json();
      }
      useQuery({ queryKey: ["k"], queryFn: () => readThing(9), enabled: true });
      export function useSave() { return useMutation({ mutationFn: saveThing }); }
    `;
    check("ط١٦. **ولا يُتّهم بريء**: كتابةٌ مستقلّةٌ في الملفّ لا يُبلَّغ عنها",
      scan([{ name: "innocent.tsx", code: INNOCENT }]).offenders.length === 0);

    //  ══ **وما يُمرَّر قيمةً لا يُنادى** ══════════════════════════════════
    //   اسمٌ يُذكَر في تعبير الاستعلام ولا يُنادى فيه ليس كتابةً يفعلها
    //   الاستعلام. وحلُّ كلِّ اسمٍ كان يُنتج **اتّهاماً باطلاً**، والباطلُ
    //   يُسقط الحزمةَ بلا مخالفةٍ فيُعطَّل الحارسُ بعد أوّل مرّة.
    const AS_VALUE = `
      const saveThing = () => apiRequest("POST", "/api/__probe__");
      useQuery({ queryKey: ["k"], queryFn: () => ({ saveThing }), enabled: true });
    `;
    const AS_CALLBACK = `
      const saveThing = () => apiRequest("POST", "/api/__probe__");
      const readThing = (id: number) => apiRequest("GET", "/api/__read__/" + id);
      useQuery({
        queryKey: ["k"],
        queryFn: () => readThing(9, { onDone: saveThing }),
        enabled: true,
      });
    `;
    //   **والابتلاعُ يتّهم استعلاماً مستثنىً حقيقياً**: تعبيرُ المساعِد كان
    //   لا يقف عند فاصلته المنقوطة، فيبتلع سطرَ جاره ويُنسَب إليه عنوانُه.
    const NEIGHBOUR = `
      const askAi = (msg: string) => apiRequest("POST", "/api/ai/chat", { msg });
      const loadReport = (id: number) => apiRequest("GET", "/api/__read__/" + id);
      useQuery({ queryKey: ["k"], queryFn: () => askAi("hi"), enabled: true });
    `;
    const offendersOf = (name: string, code: string) =>
      scan([{ name, code }]).offenders;

    check("ط١٧. **واسمٌ يُمرَّر قيمةً لا يُنادى** — فلا يُتَّهم به الاستعلام",
      offendersOf("as_value.tsx", AS_VALUE).length === 0,
      offendersOf("as_value.tsx", AS_VALUE).join(" · "));
    check("ط١٧أ. (وشاهدُ عدم الفراغ: لو نُوديَ فعلاً لَأُمسِك)",
      offendersOf("called.tsx",
        AS_VALUE.replace("({ saveThing })", "saveThing()")).length > 0);
    check("ط١٨. **ولا مُمرَّراً في كائن إعدادٍ داخل نداءِ قراءة**",
      offendersOf("callback.tsx", AS_CALLBACK).length === 0,
      offendersOf("callback.tsx", AS_CALLBACK).join(" · "));
    check("ط١٩. **ونداءٌ مستثنىً لا يبتلع عنوانَ جاره**",
      offendersOf("neighbour.tsx", NEIGHBOUR).length === 0,
      offendersOf("neighbour.tsx", NEIGHBOUR).join(" · "));

    //  **والوسيطُ المجرَّد يُنادى**: مَن يستقبله يناديه، فكتابتُه كتابةُ
    //  الاستعلام. وقصرُ الملاحقة على رأس النداء وحده كان يُفلته — والحلقةُ
    //  تعود صامتة.
    const THEN_CALLBACK = `
      const saveThing = () => apiRequest("POST", "/api/__probe__");
      useQuery({
        queryKey: ["k"],
        queryFn: () => Promise.resolve().then(saveThing),
        enabled: true,
      });
    `;
    const PASSED_ARGUMENT = `
      const saveThing = () => apiRequest("POST", "/api/__probe__");
      const runIt = (f: () => Promise<unknown>) => f();
      useQuery({ queryKey: ["k"], queryFn: () => runIt(saveThing), enabled: true });
    `;
    check("ط٢٠. **ووسيطٌ يُنادِيه مُستقبِلُه يُمسَك** — `‎.then(saveThing)`",
      offendersOf("then.tsx", THEN_CALLBACK).length > 0);
    check("ط٢٠أ. (والعنوانُ هو عنوانُ ما يكتبه لا غيرُه)",
      offendersOf("then.tsx", THEN_CALLBACK).length > 0 &&
      offendersOf("then.tsx", THEN_CALLBACK)
        .every((o) => o.endsWith("/api/__probe__")),
      offendersOf("then.tsx", THEN_CALLBACK).join(" · "));
    check("ط٢١. **وكذلك وسيطٌ مُمرَّرٌ لدالّةٍ تنادِيه**",
      offendersOf("passed.tsx", PASSED_ARGUMENT).length > 0);
    check("ط٢١أ. (وشاهدُ عدم الفراغ: الوسيطُ نفسُه في كائنٍ يبقى خاملاً)",
      offendersOf("inert.tsx",
        PASSED_ARGUMENT.replace("runIt(saveThing)", "runIt({ saveThing })")).length === 0,
      offendersOf("inert.tsx",
        PASSED_ARGUMENT.replace("runIt(saveThing)", "runIt({ saveThing })")).join(" · "));

    //  **والقوسُ الذي لا يسبقه نداءٌ ليس قائمةَ وسائط**: `(row) =>` قائمةُ
    //  **معامِلات**، والماسحُ بلا نطاقٍ يعرفه — فلولا هذا الشرط لَحُلَّ
    //  اسمُ المعامِل إلى مساعِدٍ يشاركه الاسمَ في الوحدة، **فيُتَّهم بريء**.
    const SHADOWED_PARAM = `
      const row = () => apiRequest("POST", "/api/__probe__");
      const readRows = () => apiRequest("GET", "/api/__read__");
      useQuery({
        queryKey: ["k"],
        queryFn: () => readRows().then((row) => row),
        enabled: true,
      });
    `;
    check("ط٢٢. **ومعامِلُ سهمٍ يشارك اسمَ مساعِدٍ يكتب لا يُتَّهم به**",
      offendersOf("param.tsx", SHADOWED_PARAM).length === 0,
      offendersOf("param.tsx", SHADOWED_PARAM).join(" · "));
    check("ط٢٢أ. (وشاهدُ عدم الفراغ: المساعِدُ نفسُه لو مُرِّر وسيطاً لَأُمسِك)",
      offendersOf("passed2.tsx",
        SHADOWED_PARAM.replace("then((row) => row)", "then(row)")).length > 0);

    //  ── **ووسيطٌ مجرَّدٌ ليس رَدَّ نداءٍ بذاته** ──────────────────────────
    //  مَن يستقبله قد يخزّنه أو يقارنه أو يُرجعه ولا يناديه، فقراءتُه نداءً
    //  **اتّهامٌ باطل** يُسقط الحزمةَ بلا مخالفة (مقيسٌ حيّاً قبل الإصلاح).
    //  فيُشترَط دليلُ نداءٍ: عقدُ الطريقة، أو تعريفٌ يُثبت أن معامِلَه يُنادى.
    const STORED_NOT_CALLED = `
      const saveThing = () => apiRequest("POST", "/api/__probe__");
      const cacheValue = (f: () => Promise<unknown>) => { store.push(f); return 1; };
      useQuery({ queryKey: ["k"], queryFn: () => cacheValue(saveThing), enabled: true });
    `;
    check("ط٢٣. **ووسيطٌ يُخزَّن ولا يُنادى لا يُتَّهم به الاستعلام**",
      offendersOf("cache.tsx", STORED_NOT_CALLED).length === 0,
      offendersOf("cache.tsx", STORED_NOT_CALLED).join(" · "));
    check("ط٢٣أ. (وشاهدُ عدم الفراغ: المُستقبِلُ نفسُه لو ناداه لَأُمسِك)",
      offendersOf("called.tsx",
        STORED_NOT_CALLED.replace("{ store.push(f); return 1; }", "f()")).length > 0);

    const FORWARDED = `
      const saveThing = () => apiRequest("POST", "/api/__probe__");
      const runIt = (f: () => Promise<unknown>) => Promise.resolve().then(f);
      useQuery({ queryKey: ["k"], queryFn: () => runIt(saveThing), enabled: true });
    `;
    check("ط٢٤. **ومُستقبِلٌ يُمرِّره إلى مَن يناديه يُمسَك**",
      offendersOf("fwd.tsx", FORWARDED).length > 0);

    const IMPORTED_CALLEE = `
      import { mystery } from "./elsewhere";
      const saveThing = () => apiRequest("POST", "/api/__probe__");
      useQuery({ queryKey: ["k"], queryFn: () => mystery(saveThing), enabled: true });
    `;
    check("ط٢٥. **ومُستقبِلٌ لا يُقرأ تعريفُه لا يُلاحَق** — الصمتُ أصدقُ",
      offendersOf("imp.tsx", IMPORTED_CALLEE).length === 0,
      offendersOf("imp.tsx", IMPORTED_CALLEE).join(" · "));
    check("ط٢٥أ. (وشاهدُ عدم الفراغ: لو عُرِّف في الملفّ ونادى لَأُمسِك)",
      offendersOf("imp2.tsx", IMPORTED_CALLEE.replace(
        'import { mystery } from "./elsewhere";',
        "const mystery = (f: () => Promise<unknown>) => f();")).length > 0);

    //  **والمطابقةُ بموضع الوسيط لا بوجوده**: مساعِدٌ ينادي معامِلَه الثاني
    //  لا يجعل الأوّلَ منادىً.
    const POSITIONAL = `
      const saveThing = () => apiRequest("POST", "/api/__probe__");
      const pick = (a: unknown, f: () => Promise<unknown>) => f();
      useQuery({ queryKey: ["k"], queryFn: () => pick(1, saveThing), enabled: true });
    `;
    check("ط٢٦. **ووسيطٌ في الموضع الذي يُنادى يُمسَك**",
      offendersOf("idx.tsx", POSITIONAL).length > 0);
    check("ط٢٦أ. **وفي موضعٍ لا يُنادى لا يُمسَك**",
      offendersOf("idx2.tsx",
        POSITIONAL.replace("(a: unknown, f: () => Promise<unknown>) => f()",
          "(f: () => Promise<unknown>, a: unknown) => a")
          .replace("pick(1, saveThing)", "pick(saveThing, 1)")).length === 0,
      offendersOf("idx2.tsx",
        POSITIONAL.replace("(a: unknown, f: () => Promise<unknown>) => f()",
          "(f: () => Promise<unknown>, a: unknown) => a")
          .replace("pick(1, saveThing)", "pick(saveThing, 1)")).join(" · "));

    //  **و`?` علامةُ اختيارٍ لا فاصلَ اسم** (مراجعةُ ٣٩٤): معامِلٌ اختياريّ
    //  كان اسمُه يُقرأ فراغاً، فلا يُطابَق الوسيطُ في موضعه ويفلتُ ما يكتب.
    const OPTIONAL_PARAM = `
      const saveThing = () => apiRequest("POST", "/api/__probe__");
      const runIt = (f?: () => Promise<unknown>) => { if (f) return f(); };
      useQuery({ queryKey: ["k"], queryFn: () => runIt(saveThing), enabled: true });
    `;
    check("ط٢٧. **ومعامِلٌ اختياريّ `f?` يُقرأ باسمه** — الشكلُ الذي كان يفلت",
      offendersOf("opt.tsx", OPTIONAL_PARAM).length > 0);
    check("ط٢٧أ. **وبلا نوعٍ مكتوب** (`(f?) => …`)",
      offendersOf("opt2.tsx", OPTIONAL_PARAM.replace(
        "(f?: () => Promise<unknown>)", "(f?)")).length > 0);
    check("ط٢٧ب. (وشاهدُ عدم الفراغ: المطابقُ له بلا `?` كان يُمسَك وما زال)",
      offendersOf("req.tsx", OPTIONAL_PARAM.replace("(f?:", "(f:")).length > 0);
    const OPTIONAL_WRONG_SLOT = offendersOf("opt3.tsx", OPTIONAL_PARAM
      .replace("(f?: () => Promise<unknown>) => { if (f) return f(); }",
        "(f?: () => Promise<unknown>, g?: () => Promise<unknown>) => { if (g) return g(); }")
      .replace("runIt(saveThing)", "runIt(saveThing, other)"));
    check("ط٢٧ج. **والموضعُ لا يزال يحكم** — اختياريٌّ لا يُنادى لا يُمسَك",
      OPTIONAL_WRONG_SLOT.length === 0, OPTIONAL_WRONG_SLOT.join(" · "));
    check("ط٢٧د. **والمُخزَّنُ يبقى صامتاً** — تصحيحُ ٣٩٣ بحرفه",
      offendersOf("opt4.tsx", OPTIONAL_PARAM.replace(
        "{ if (f) return f(); }", "{ store.push(f); return 1; }")).length === 0);

    //  **ومجموعةُ الطرائق مغلقةٌ على الصنف كلِّه** (مراجعةُ ٣٩٤): نقصانُ
    //  واحدةٍ يفتح مخرجاً صامتاً — `findLast` و`findLastIndex` كانتا ناقصتين.
    const viaMethod = (m: string) => offendersOf(`${m}.tsx`, `
      const saveThing = () => apiRequest("POST", "/api/__probe__");
      useQuery({ queryKey: ["k"], queryFn: () => rows.${m}(saveThing), enabled: true });
    `).length > 0;
    const MISSED = ["findLast", "findLastIndex", "toSorted"];
    check("ط٢٨. **والطرائقُ التي كانت ناقصةً تُمسَك**",
      MISSED.every(viaMethod), MISSED.filter((m) => !viaMethod(m)).join(" · "));
    const KEPT = ["map", "forEach", "filter", "find", "findIndex", "some",
      "every", "flatMap", "sort", "reduce", "reduceRight", "then", "catch", "finally"];
    check("ط٢٨أ. (والباقيةُ كما كانت)",
      KEPT.every(viaMethod), KEPT.filter((m) => !viaMethod(m)).join(" · "));
    const viaGlobal = (g: string) => offendersOf(`${g}.tsx`, `
      const saveThing = () => apiRequest("POST", "/api/__probe__");
      useQuery({ queryKey: ["k"], queryFn: () => ${g}(saveThing), enabled: true });
    `).length > 0;
    check("ط٢٨ب. **والمؤقّتاتُ كذلك**",
      ["setTimeout", "setInterval", "setImmediate", "queueMicrotask",
        "requestAnimationFrame", "requestIdleCallback"].every(viaGlobal));

    //  ══ الموضعُ والناقلة ══
    //
    //  نداءٌ داخل استعلام، بتصريحاته — أيُلاحَق ما فيه أم لا؟
    const WRITER = `const saveThing = () => apiRequest("POST", "/api/__probe__");`;
    //  مصفوفةُ دوالّ **لا تُنفَّذ**، ومعها ردُّ نداءٍ بريء.
    const DATA = `const fns = [() => apiRequest("POST", "/api/__probe__")];
      const keyFn = (f: unknown) => "k";`;
    const chases = (expr: string, decls: string) => offendersOf("slot.tsx", `
      ${decls}
      useQuery({ queryKey: ["k"], queryFn: () => ${expr}, enabled: true });
    `).length > 0;

    //  **⚠ وانقلب عقدُ هذا البند** (٣٩٥، بقرارِ التصحيح لا لتخضير اختبار):
    //  استُثنيت `Array.from` في ٣٩٤ لأن `‎.from(` تقع في سلاسلَ لا تنادي
    //  شيئاً — وبالناقلة والموضع زال ذلك السبب بعينه، فدخلت.
    check("ط٢٨ج. **و`Array.from` دخلت بناقلتها وموضعها** (كانت متروكةً في ٣٩٤)",
      chases("Array.from(items, saveThing)", WRITER)
        && !chases("d.from(a, saveThing)", WRITER));
    check("ط٢٨د. (وطريقةٌ ليست من الصنف لا تُلاحَق)", !viaMethod("pipe"));

    //  **وموضعُ البيانات ليس موضعَ ردٍّ**: `‎.map(cb, thisArg)` تنادي الأوّلَ
    //  وحدَه، و`‎.reduce(cb, seed)` كذلك — وقراءةُ الثاني ردَّ نداءٍ تُلصِق
    //  بالاستعلام كتابةَ قيمةٍ لا تُنفَّذ أبداً.
    const THIS_ARG = `const holder = { go: () => apiRequest("POST", "/api/__probe__") };
      const pick = (r: unknown) => r;`;
    const SEED = `const seedFns = [() => apiRequest("POST", "/api/__probe__")];
      const combine = (a: unknown, b: unknown) => a;`;
    check("ط٢٩. **وموضعُ البيانات لا يُلاحَق** — `thisArg` والقيمةُ الابتدائية",
      !chases("rows.map(pick, holder)", THIS_ARG)
        && !chases("rows.reduce(combine, seedFns)", SEED));
    //  **وشاهدُ عدم الفراغ**: التصريحاتُ عينُها، والمتبدِّلُ ترتيبُ الوسيطين.
    check("ط٢٩أ. (وشاهدُ عدم الفراغ: نفسُهما في الموضع الأوّل يُمسَكان)",
      chases("rows.map(holder, pick)", THIS_ARG)
        && chases("rows.reduce(seedFns, combine)", SEED));
    check("ط٢٩ب. **و`then` تنادي موضعين**",
      chases("p.then(ok, saveThing)", `${WRITER}
        const ok = (r: unknown) => r;`)
        && chases("p.then(saveThing, ok)", `${WRITER}
        const ok = (r: unknown) => r;`));

    //  **والساكنةُ بناقلتها**: `groupBy` ليست في `Array.prototype` إطلاقاً —
    //  بل `Object.groupBy(items, cb)` و`Map.groupBy(items, cb)`، الردُّ في
    //  الموضع الثاني **والأوّلُ بياناتٌ لا تُنفَّذ**.
    const STATIC_DATA = ["Object.groupBy(fns, keyFn)", "Map.groupBy(fns, keyFn)",
      "Array.from(fns, keyFn)"];
    check("ط٣٠. **والساكنةُ لا تُلاحق بياناتِ موضعها الأوّل**",
      STATIC_DATA.every((e) => !chases(e, DATA)),
      STATIC_DATA.filter((e) => chases(e, DATA)).join(" · "));
    const STATIC_CB = ["Object.groupBy(items, saveThing)", "Map.groupBy(items, saveThing)",
      "Array.from(items, saveThing)", "JSON.parse(text, saveThing)"];
    check("ط٣٠أ. **وتُلاحق ردَّها في موضعه الثاني**",
      STATIC_CB.every((e) => chases(e, WRITER)),
      STATIC_CB.filter((e) => !chases(e, WRITER)).join(" · "));
    check("ط٣٠ب. **والناقلةُ شرطٌ** — `‎.groupBy(` مجرَّدةً ليست عقداً",
      !chases("rows.groupBy(saveThing)", WRITER)
        && !chases("qb.groupBy(col, saveThing)", WRITER));
    //  **والموضعُ المُلتبِسُ متروكٌ ولا يُدَّعى خلافُه**: `JSON.stringify`
    //  موضعُها الثاني `دالّةٌ أو مصفوفةُ مفاتيح`، و`String.replace` الثاني
    //  `نصٌّ أو دالّة` — فالاتّهامُ الباطل أخطرُ من مخرجٍ لا يقع.
    check("ط٣٠ج. **والموضعُ الذي يقبل غيرَ الدالّة متروكٌ عمداً**",
      !chases("JSON.stringify(v, saveThing)", WRITER)
        && !chases("s.replace(re, saveThing)", WRITER));
  }

  console.log(`\n${failures === 0 ? "✅ كل فحوص التحديث الحيّ نجحت" : `❌ ${failures} فحصاً فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
