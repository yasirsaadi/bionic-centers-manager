// حفظُ مقالة معرفةٍ موثوقة — مهلةٌ محدودة، بلا DOM ولا شبكة.
// `npm run test:ai-knowledge-save`.
//
// ══ ما يحرسه (تصحيحٌ إنتاجيّ) ═══════════════════════════════════════════
// (أ) نجاحٌ عاديّ يبقى سليماً — الدالّةُ لا تُغيّر شيئاً في المسار السعيد.
// (ب) fetch لا يستجيب أبداً ⟶ رفضٌ **ضمن المهلة المحدَّدة**، لا انتظارٌ
//     أبديّ، وبرسالةٍ عربية واضحة — لا `AbortError` خامّاً يصل المستخدم.
//     **والرسالةُ لا تجزم بنتيجةٍ لا تُعرَف** (تصحيح): إلغاءُ الطلب عند
//     العميل لا يُثبت أن معاملة الخادم لم تكتمل أو لم تُحفَظ فعلاً بعده —
//     فالنصّ يقول عدمَ التأكّد صراحةً ويوجّه لتحديث القائمة قبل إعادة
//     المحاولة، لا يدّعي «لم يُحفَظ شيء».
// (ج) خطأُ شبكةٍ حقيقيّ آخر (ليس انتهاء مهلة) يمرّ كما هو بلا تحوير.
// (د) استجابةٌ حقيقية غير ناجحة (٤٠٩ مثلاً) تعود كما هي — هذه الدالّةُ
//     حارسةُ الزمن وحدها، وفحصُ res.ok يبقى مسؤوليةَ المنادي (AdminSettings.tsx).
// (هـ) الإشارة (`AbortSignal`) تصل fetchImpl فعلاً — توصيلٌ حقيقيّ لا شكليّ.

import { fetchWithTimeout } from "./ai_knowledge_admin_save";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}

function fakeResponse(init: { ok: boolean; status: number; body?: any }): Response {
  return {
    ok: init.ok, status: init.status,
    json: async () => init.body ?? {},
  } as Response;
}

async function main() {
  console.log("\n── أ. نجاحٌ عاديّ — المسارُ السعيد لا يتغيّر ──");
  {
    const okRes = fakeResponse({ ok: true, status: 200, body: { article: { id: 1 } } });
    let sawSignal: any = null;
    const fake = (async (_url: string, init: RequestInit) => {
      sawSignal = init.signal;
      return okRes;
    }) as typeof fetch;

    const res = await fetchWithTimeout("/api/x", { method: "PATCH" }, 1000, fake);
    check(res === okRes, "أ.١. الاستجابةُ الناجحة تعود كما هي بلا تحوير");
    check((await res.json()).article?.id === 1, "أ.٢. ومحتواها سليم");
  }

  console.log("\n── ب. عدمُ استجابةٍ أبداً ⟹ رفضٌ ضمن المهلة، لا انتظارٌ أبديّ ──");
  {
    const TIMEOUT_MS = 40;
    // fetchImpl لا يُنهي وعده أبداً بنفسه — الرفضُ الوحيدُ الممكن هو مِن
    // أُلغِيَ الطلب (`signal.abort`) نفسِه، تماماً كما يفعل fetch الحقيقيّ.
    const fake = ((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => {
        const err: any = new Error("The operation was aborted");
        err.name = "AbortError";
        reject(err);
      });
    })) as typeof fetch;

    const t0 = Date.now();
    let caught: any = null;
    try {
      await fetchWithTimeout("/api/x", { method: "PATCH" }, TIMEOUT_MS, fake);
    } catch (err) {
      caught = err;
    }
    const elapsed = Date.now() - t0;

    check(caught instanceof Error, "ب.١. رفضٌ فعليّ وقع — لا وعدٌ عالق إلى الأبد");
    check(caught?.name !== "AbortError",
      "ب.٢. **والرسالةُ عربيةٌ واضحة — لا `AbortError` الخام يصل المستخدم**",
      String(caught?.message));
    check(typeof caught?.message === "string" && caught.message.includes("مهلة"),
      "ب.٣. ونصُّها يذكر المهلة صراحةً", String(caught?.message));
    //  ══ ولا يدّعي علماً بما وقع في الخادم (تصحيحٌ) ═══════════════════════
    //  إلغاءُ الطلب من العميل لا يُثبت أن معاملة الخادم لم تكتمل — فقد تكون
    //  نجحت فعلاً بعد أن يئس المتصفّح من الانتظار. رسالةٌ تجزم «لم يُحفَظ
    //  شيء» قد تكون كاذبة، فتُطمئن المستخدمَ خطأً أو تدفعه لحفظٍ مكرَّر.
    check(!String(caught?.message).includes("لم يُحفَظ شيء"),
      "ب.٣ب. **ولا تجزم أن شيئاً لم يُحفَظ** — الإلغاءُ عند العميل لا يعرف نتيجة الخادم",
      String(caught?.message));
    check(String(caught?.message).includes("تحديث") && String(caught?.message).includes("تعاود"),
      "ب.٣ج. **وتوجّه المستخدم لتحديث القائمة قبل إعادة الحفظ** — لا تكراراً أعمى قد يُنتج نسخةً مكرّرة",
      String(caught?.message));
    // ضمن المهلة بهامشٍ معقول — لا رفضٌ فوريّ (لم يُستهلَك من المهلة أصلاً)
    // ولا رفضٌ متأخّرٌ كثيراً عنها (مهلةٌ لم تُطبَّق فعلياً).
    check(elapsed >= TIMEOUT_MS - 5 && elapsed < TIMEOUT_MS + 500,
      "ب.٤. **والرفضُ وقع قريباً من المهلة المحدَّدة تحديداً — لا قبلها ولا بعدها بكثير**",
      `elapsed=${elapsed}ms, timeout=${TIMEOUT_MS}ms`);
  }

  console.log("\n── ج. خطأُ شبكةٍ آخر (ليس انتهاء مهلة) يمرّ كما هو ──");
  {
    const networkErr = new Error("network down");
    const fake = (async () => { throw networkErr; }) as unknown as typeof fetch;
    let caught: any = null;
    try {
      await fetchWithTimeout("/api/x", { method: "PATCH" }, 1000, fake);
    } catch (err) {
      caught = err;
    }
    check(caught === networkErr, "ج.١. **الخطأُ الأصليّ يمرّ كما هو حرفياً — لا تُستبدَل رسالتُه**");
  }

  console.log("\n── د. استجابةٌ حقيقية غير ناجحة تعود كما هي — لا تُرفَض من هنا ──");
  {
    const conflictRes = fakeResponse({ ok: false, status: 409, body: { error: "تعارضٌ ما" } });
    const fake = (async () => conflictRes) as typeof fetch;
    const res = await fetchWithTimeout("/api/x", { method: "PATCH" }, 1000, fake);
    check(res === conflictRes,
      "د.١. **استجابةُ ٤٠٩ تعود كما هي بلا رفضٍ من هذه الدالّة** — فحصُ res.ok مسؤوليةُ المنادي");
    check(res.ok === false && res.status === 409, "د.٢. وحالتُها الحقيقية محفوظة");
  }

  console.log("\n── هـ. الإشارةُ تصل fetchImpl فعلاً — توصيلٌ حقيقيّ ──");
  {
    let sawSignal: AbortSignal | undefined;
    const fake = (async (_url: string, init: RequestInit) => {
      sawSignal = init.signal as AbortSignal | undefined;
      return fakeResponse({ ok: true, status: 200 });
    }) as typeof fetch;
    await fetchWithTimeout("/api/x", { method: "PATCH" }, 1000, fake);
    check(sawSignal instanceof AbortSignal, "هـ.١. init.signal وصل fetchImpl فعلاً بنوعه الصحيح");
    check(sawSignal?.aborted === false, "هـ.٢. وغيرُ مُلغًى قبل انتهاء المهلة");
  }

  console.log(`\n${failures === 0 ? "✅ حفظُ مقالة المعرفة يعمل صحيحاً في كل الحالات" : `❌ ${failures} فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
