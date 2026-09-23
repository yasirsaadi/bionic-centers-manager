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

    /**
     * قيمةُ خاصّيةٍ **بلا أقواس** من `at` — بموازنة الأقواس، فتقف عند الفاصلة
     * التي تفصلها عن أختها أو عند قوس الكائن الحاوي، ولا تبتلع ما بعدها.
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
        } else if (c === "," && depth === 0) return code.slice(at, j);
      }
      return code.slice(at, end);
    }

    //  **رأسُ دالّةِ سهمٍ في أوّلِ القيمة** — لا «`=>` في الجوار»: الثانيةُ
    //  كانت تُصيب سهماً لخاصّيةٍ تالية، فيُقرأ أوّلُ `{` بعده وهو كتلةٌ لا
    //  علاقةَ لها بالاستعلام.
    const ARROW_HEAD = /^\s*(?:async\s+)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/;

    /** كتلُ `queryFn` كلُّها — بجسمٍ بأقواس، أو بتعبير، أو بإحالةٍ باسم. */
    function queryFnBodies(code: string): string[] {
      const out: string[] = [];
      const re = /queryFn\s*:/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(code))) {
        const at = m.index + m[0].length;
        const head = ARROW_HEAD.exec(code.slice(at, at + 200));
        const body = at + (head ? head[0].length : 0);
        //  **جسمٌ بأقواس** ⟵ يُقرأ كما هو، ولا إحالةَ فيه.
        if (head && /^\s*\{/.test(code.slice(body, body + 40))) {
          const block = blockAt(code, body);
          if (block) { out.push(block); continue; }
        }
        //  **وإلّا فتعبير**: سهمٌ بلا أقواس (`() => fetchX(id)`) أو إحالةٌ
        //  باسمٍ مجرَّد (`fetchUser`) أو نداءٌ (`getQueryFn({…})`). يُقرأ
        //  التعبيرُ نفسُه — فنداءُ كتابةٍ مكتوبٌ فيه لا يفلت — **وتُحَلّ
        //  أسماؤه** في الملفّ نفسِه، وإلّا بقي ما خلف الاسم بقعةً عمياء.
        const expr = expressionAt(code, body);
        out.push(expr);
        for (const id of expr.match(/[A-Za-z_$][\w$]*/g) ?? []) {
          if (["async", "await", "return"].includes(id)) continue;
          const def = code.search(
            new RegExp(`(?:async\\s+)?function\\s+${id}\\b|const\\s+${id}\\s*=`));
          if (def < 0) continue;
          const block = blockAt(code, def);
          if (block) out.push(block);
        }
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
    const fixture = (fn: string) => `
      async function helper(id: number) {
        const res = await apiRequest("POST", "/api/__probe__", { id });
        return res.json();
      }
      useQuery({ queryKey: ["k"], queryFn: ${fn}, enabled: true });
      const SERVICE_LABEL = { prosthetic: "طرف صناعي" };
    `;
    const caught = (fn: string) =>
      scan([{ name: "fixture.tsx", code: fixture(fn) }]).offenders.length > 0;

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
  }

  console.log(`\n${failures === 0 ? "✅ كل فحوص التحديث الحيّ نجحت" : `❌ ${failures} فحصاً فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
