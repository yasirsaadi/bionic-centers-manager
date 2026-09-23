import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

/**
 * Refresh everything that shows a patient's money, in one call.
 *
 * The bug this exists to end (reception العين, 2026-08-06): a cost was saved
 * and did NOT appear on the patient's file until the employee pressed refresh —
 * so she assumed the save had failed and entered it again, and the service was
 * booked twice. «تخصيص وإسناد خبير» — the very dialog where the device price is
 * entered — invalidated only ["/api/patients"], while the patient page reads
 * ["/api/patients/:id", id]. Different key families: the screen never updated.
 *
 * Every dialog that writes money calls THIS, so no screen can be left behind
 * again. Prefix matching means one entry covers its children (cases,
 * treatment-plans, every registry page).
 */
export function invalidatePatientData(
  client: QueryClient,
  patientId?: number | null,
): void {
  // The patient record itself + its cases (["/api/patients/:id", id, "cases"]).
  if (patientId != null) {
    client.invalidateQueries({ queryKey: ["/api/patients/:id", patientId] });
    client.invalidateQueries({ queryKey: ["/api/patients", patientId] });
    client.invalidateQueries({ queryKey: [`/api/manufacturing/patient/${patientId}/summary`] });
    client.invalidateQueries({ queryKey: [`/api/manufacturing/patient/${patientId}/orders`] });
  }
  // Lists: the old aggregate list AND the paginated registry the patients page
  // actually renders — a different key family that used to be missed entirely.
  client.invalidateQueries({ queryKey: ["/api/patients"] });
  client.invalidateQueries({ queryKey: ["/api/patients/registry"] });
  // Badges and money reports that move with a cost.
  client.invalidateQueries({ queryKey: ["/api/medical/pending"] });
  client.invalidateQueries({ queryKey: ["/api/accounting/summary"] });
  client.invalidateQueries({ queryKey: ["/api/reports/daily-summary"] });
}

/**
 * **تغيّرت حالةُ ملفٍّ في السلّة** — حذفاً أو استعادةً أو حذفاً نهائياً
 * (ترحيل ٠٦٨). والثلاثةُ تنقل الملفَّ بين «فعّال» و«محذوف»، فتحتاج تنظيفَ
 * الذاكرة نفسَه بالضبط: صفحةُ المريض تُنزَع (فتعيد الجلبَ بحالتها الجديدة)
 * والقوائمُ والطوابيرُ والعدّاداتُ تُبطَل.
 *
 * ملفٌّ حُذف — **اختفاءٌ في الحال، بلا تحديثِ صفحة**.
 *
 * ══ العطبُ الذي يغلقه (لاحظه المالك على الإنتاج) ═══════════════════════
 * الحذفُ كان ينجح في الخادم **ويبقى المريضُ ظاهراً في السجلّ** حتى يُحدَّث
 * المتصفّح يدوياً. والسببُ عائلتا مفاتيح لا واحدة: طلبُ الحذف كان يُبطل
 * `["/api/patients"]` وحدها، بينما الشاشةُ المرئية تقرأ
 * `["/api/patients/registry", صفحة, حجم, بحث, فرع, عرض, تاريخ]` — سبعةُ
 * عناصر أوّلُها **نصٌّ مختلف**، فلا تطابقَ بالبادئة ولا إبطال.
 *
 * والموظّفُ يرى ملفّاً حذفه للتوّ، فيضغط «حذف» ثانيةً على صفٍّ لم يعد
 * موجوداً — وهذا مصدرُ رسائل خطأٍ يقرأها «فشل الحذف» وقد نجح.
 *
 * ══ لماذا `remove` للملفّ و`invalidate` للقوائم ═════════════════════════
 * `invalidate` تعني «أعد الجلب». وصفحةُ مريضٍ محذوف تُعيد الجلب فتصطدم
 * بـ404 وتعرض خطأً — فالصحيحُ أن **تُنزَع من الذاكرة** لا أن تُحدَّث. أمّا
 * القوائمُ فما زالت قائمةً وتُعاد بصفٍّ أقلّ، فتُبطَل لا تُنزَع.
 *
 * **والمطابقةُ بالبادئة تغطّي كلّ التوليفات**: `["/api/patients/registry"]`
 * تصيب كلّ صفحةٍ وكلّ بحثٍ وكلّ فرعٍ وكلّ تاريخ — فلا تبقى توليفةٌ محفوظةٌ
 * تحمل المحذوف.
 */
export function invalidateAfterPatientTrashChange(
  client: QueryClient,
  patientId: number,
): void {
  //  ما عاد له وجود: يُنزَع بدل أن يُعاد جلبُه فيُردّ بـ404.
  client.removeQueries({ queryKey: ["/api/patients/:id", patientId] });
  client.removeQueries({ queryKey: ["/api/patients", patientId] });
  client.removeQueries({ queryKey: [`/api/manufacturing/patient/${patientId}/summary`] });
  client.removeQueries({ queryKey: [`/api/manufacturing/patient/${patientId}/orders`] });
  client.removeQueries({ queryKey: [`/api/followups/patient/${patientId}`] });
  client.removeQueries({ queryKey: [`/api/medical/patients/${patientId}/exams`] });
  //  والقوائمُ باقيةٌ بصفٍّ أقلّ — تُبطَل بالبادئة فتشمل كلّ توليفة.
  client.invalidateQueries({ queryKey: ["/api/patients"] });
  client.invalidateQueries({ queryKey: ["/api/patients/registry"] });
  //  والعدّادات والطوابير التي كان يظهر فيها.
  client.invalidateQueries({ queryKey: ["/api/medical/pending"] });
  client.invalidateQueries({ queryKey: ["/api/medical/worklist"] });
  client.invalidateQueries({ queryKey: ["/api/followups"] });
  client.invalidateQueries({ queryKey: ["/api/followups/governed"] });
  client.invalidateQueries({ queryKey: ["/api/discounts"] });
  //  والمال: كلفتُه وقيودُه خرجت من المجاميع معه (أو عادت إليها).
  client.invalidateQueries({ queryKey: ["/api/accounting/summary"] });
  client.invalidateQueries({ queryKey: ["/api/reports/daily-summary"] });
  //  والسلّةُ نفسُها وشارتُها — الصفُّ دخلها أو خرج منها للتوّ.
  client.invalidateQueries({ queryKey: ["/api/patient-trash"] });
  client.invalidateQueries({ queryKey: ["/api/patient-trash/count"] });
}

/**
 * **مفاتيحُ يتغيّر شكلُ ردّها بتغيّر الصلاحية، ورقمُ المريض داخلَ المفتاح.**
 *
 * ══ العطبُ الذي تغلقه (مراجعةٌ آلية على الطلب ٣٨٤) ══════════════════════
 * `App.tsx` يُبطل عائلاتِ المفاتيح عند تغيّر لقطة الصلاحيات (إصلاحُ
 * ٢٠٢٦-٠٩-٠٣)، **بقائمةٍ مكتوبةٍ حرفاً**. وذاك يكفي لمفتاحٍ ثابت
 * (`"/api/patients/registry"`) لأن المطابقةَ بالبادئة تصيب كلّ توليفاته.
 *
 * أمّا `GET /api/manufacturing/patient/:id/orders` فمفتاحُه **نصٌّ واحدٌ
 * يحمل رقمَ المريض في جسمه** (`` [`/api/manufacturing/patient/${id}/orders`] ``)،
 * فلا بادئةَ تصيبه ولا يعرف `App.tsx` أرقامَ المرضى المخبَّأة أصلاً.
 * وردُّ تلك النقطة **صار يتبع الصلاحية** (الطلب ٣٨٤): مالُ الجهاز يُحذَف
 * من الردّ لمن لا يملك `canViewPayments`. فسحبُ الصلاحية وصفحةُ المريض
 * مفتوحةٌ كان يترك المبلغَ معروضاً من ردٍّ مخبَّأٍ سابق، ومنحُها كان يُبقيه
 * محجوباً — والخادمُ يبقى الحارسَ الحقيقيّ، لكنّ الشاشةَ تكذب حتى تُعيد
 * الجلب.
 *
 * فالمطابقةُ هنا **بمُسنِدٍ لا ببادئة** — وهو الشيءُ الوحيد الذي يبلغ مفتاحاً
 * يحمل رقماً في جسمه.
 */
export function isPermissionShapedOrdersKey(key: readonly unknown[]): boolean {
  const first = key[0];
  return typeof first === "string"
    && /^\/api\/manufacturing\/patient\/\d+\/orders$/.test(first);
}

/**
 * تغيّرت لقطةُ الصلاحيات ⟶ أبطِل كلَّ ما خُبِّئ من `…/orders` **لأيّ مريض**.
 *
 * **إبطالٌ لا نزع**: الصفحةُ ما زالت مشروعة، والمطلوبُ إعادةُ جلبٍ بالشكل
 * الجديد — لا إفراغُ الشاشة.
 */
export function invalidatePermissionShapedQueries(client: QueryClient): void {
  client.invalidateQueries({
    predicate: (query) => isPermissionShapedOrdersKey(query.queryKey as readonly unknown[]),
  });
}


/* ══════════════════════════════════════════════════════════════════════════
 *  **التحديثُ الحيّ — قانونٌ واحد بدل مئتين وأربعٍ وثلاثين قائمة**
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ══ العطبُ الذي يغلقه (شكوى المالك ٢٠٢٦-٠٩-٢٣) ═══════════════════════════
 * «حين تضيف شيئاً أو تحذف أو تغيّر، **بعضُ نوافذ التطبيق لا تُظهر التعديل
 * إلّا بعد إعادة تحميل الصفحة**.»
 *
 * والسببُ بنيويّ لا عرَضيّ: كلُّ عمليةِ كتابةٍ كانت تحمل **قائمةً مكتوبةً
 * بيد مَن كتبها** بما يجب تحديثه. وفي الواجهة ١٦٧ استعلامَ قراءة و١٠٧
 * عمليةَ كتابة و**٢٣٤ نداءَ تنظيفٍ يدويّ** في ٤١ ملفاً — ومعها ثمانيةُ
 * ملفّاتٍ تكتب ولا تنظّف شيئاً إطلاقاً (منها حذفُ المريض، وخطّةُ الجلسات،
 * وإضافةُ نوع الحالة، و«خدمة جديدة»).
 *
 * فمَن نسي مفتاحاً — أو كتب مفتاحاً من عائلةٍ أخرى — بقيت شاشتُه قديمة.
 * وهذا الملفُّ نفسُه يسجّل العطبَ **ثلاث مرّات** بأسماء حوادثه أعلاه:
 * كلفةٌ لم تظهر **فأُدخلت الخدمةُ مرّتين** (٢٠٢٦-٠٨-٠٦) · ومريضٌ محذوفٌ
 * بقي ظاهراً فيُضغط «حذف» ثانيةً · ومفتاحٌ يحمل رقمَه في جسمه (الطلب ٣٨٤).
 * **ثلاثةُ إصلاحاتٍ كلُّها بقائمةٍ رابعة** — والقائمةُ التالية ستُنسى.
 *
 * ══ القاعدةُ الآن ════════════════════════════════════════════════════════
 * **كلُّ كتابةٍ تنجح على الخادم ⟶ تُحدَّث كلُّ شاشةٍ مفتوحة.** بلا قائمةٍ
 * يكتبها أحد، وبلا مفتاحٍ يُنسى، ومهما كانت عائلةُ المفتاح أو شكلُه.
 *
 * ══ ولماذا عند `fetch` لا عند `useMutation` ══════════════════════════════
 * لأنها **نقطةُ الخنق الحقيقية الوحيدة**: الواجهةُ تكتب بثلاثة أشكال —
 * `useMutation` (١٠٧) · و`apiRequest` مباشرةً (٤١) · و`fetch` خاماً (٧١) —
 * وكلُّها تنتهي إلى `fetch`. فحارسٌ عند `MutationCache` وحده يترك الشكلين
 * الآخرين، وحارسٌ عند `apiRequest` وحده يترك الثالث. **وما لا يُغطّى كلُّه
 * يعود العطبُ منه.**
 *
 * ══ وما لا يُحدِّث ═══════════════════════════════════════════════════════
 * القراءةُ (`GET`/`HEAD`) · وما لم ينجح (`res.ok === false`) — فردٌّ بخطأ
 * لم يغيّر شيئاً · وما ليس من نقاط هذا التطبيق (`/api/…` على أصله) — فلا
 * نداءَ لطرفٍ ثالث يُحرّك الشاشة · و`POST /api/ai/chat` صراحةً: رسالةٌ
 * للمساعد ليست تغييراً في بيانات العمل، وتحديثُ الشاشة عندها ضجيجٌ خالص.
 *
 * ══ والتأخيرُ الصغير شرطُ صحّةٍ لا تحسين ══════════════════════════════════
 * `MutationCache` تنادي حرّاسَها **قبل** `onSuccess` الخاصّ بالعملية. وبعضُ
 * العمليات تنزع مفاتيحَ صفٍّ لم يعد له وجود (`removeQueries` عند حذف مريض،
 * فصفحتُه لو أُعيد جلبُها ارتدّت ٤٠٤ وعرضت خطأً). فلو وقع التحديثُ فوراً
 * لسبق النزعَ. والنافذةُ تُجمِّع كذلك دفعةَ كتاباتٍ متتابعة في تحديثٍ واحد،
 * فلا عاصفةَ طلباتٍ من حلقةٍ تكتب مراراً.
 */
export const LIVE_REFRESH_DELAY_MS = 50;

/** نقاطٌ تُكتب ولا تُغيّر بياناتِ عملٍ تُعرَض في شاشة. */
const LIVE_REFRESH_EXEMPT = [/^\/api\/ai\/chat$/];

/**
 * **أهذا نداءُ كتابةٍ يستحقّ تحديثَ الشاشات؟** — دالّةٌ خالصة.
 *
 * والمسارُ يُقرأ من العنوان: نسبيّاً كان (`/api/…`) أو مطلقاً على أصل
 * الصفحة. وعنوانُ طرفٍ ثالث يُردّ — ولو كان كتابةً.
 */
export function isLiveRefreshWrite(method: string, url: string): boolean {
  const m = String(method ?? "").toUpperCase();
  if (m !== "POST" && m !== "PUT" && m !== "PATCH" && m !== "DELETE") return false;
  const raw = String(url ?? "");
  let path: string;
  if (raw.startsWith("/")) {
    path = raw;
  } else {
    //  **عنوانٌ مطلق يُقبل إن كان على أصل الصفحة نفسِه وحده** — فنداءُ طرفٍ
    //  ثالث لا يحرّك شاشةَ هذا التطبيق. وبلا أصلٍ معلوم (خارج المتصفّح) لا
    //  يُقبَل: الواجهةُ كلُّها تكتب بمساراتٍ نسبية، فالمطلقُ حينئذٍ غريب.
    if (typeof location === "undefined") return false;
    let parsed: URL;
    try { parsed = new URL(raw, location.href); } catch { return false; }
    if (parsed.origin !== location.origin) return false;
    path = parsed.pathname;
  }
  const clean = path.split("?")[0].split("#")[0];
  if (!clean.startsWith("/api/")) return false;
  return !LIVE_REFRESH_EXEMPT.some((re) => re.test(clean));
}

let liveRefreshTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * يجدول تحديثاً واحداً لكلّ الشاشات المفتوحة — **مجمَّعاً** ضمن النافذة.
 *
 * `invalidateQueries()` بلا مفتاح تُبطل الجميع، **وتُعيد جلبَ الفعّال وحده**
 * (ما هو مركَّبٌ على الشاشة الآن). أمّا المخبّأُ غيرُ المعروض فيُوسَم قديماً
 * ويُعاد جلبُه عند أوّل عرضٍ له — فلا طلباتٍ لشاشاتٍ لا يراها أحد.
 */
export function scheduleLiveRefresh(client: QueryClient): void {
  if (liveRefreshTimer !== null) return;
  liveRefreshTimer = setTimeout(() => {
    liveRefreshTimer = null;
    void client.invalidateQueries();
  }, LIVE_REFRESH_DELAY_MS);
}

/** للاختبار وحده: يُفرغ المؤقّتَ المعلَّق بين الحالات. */
export function resetLiveRefreshForTest(): void {
  if (liveRefreshTimer !== null) clearTimeout(liveRefreshTimer);
  liveRefreshTimer = null;
}

const LIVE_REFRESH_INSTALLED = Symbol.for("bcm.liveRefreshInstalled");

/**
 * يلفّ `fetch` مرّةً واحدة — **وهو الحارسُ الوحيد**.
 *
 * ولا يُركَّب مرّتين ولو أُعيد تحميلُ الوحدة في التطوير (`Symbol.for` على
 * الكائن العامّ)، وإلّا تضاعف الغلافُ مع كلّ حفظِ ملفّ.
 */
export function installLiveRefresh(client: QueryClient): void {
  const g = globalThis as any;
  if (g[LIVE_REFRESH_INSTALLED]) return;
  const native = g.fetch;
  if (typeof native !== "function") return;
  g[LIVE_REFRESH_INSTALLED] = true;
  g.fetch = async (input: any, init?: any) => {
    const res = await native(input, init);
    try {
      const url = typeof input === "string" ? input
        : input instanceof URL ? input.href
          : String(input?.url ?? "");
      const method = String(init?.method ?? input?.method ?? "GET");
      if (res?.ok && isLiveRefreshWrite(method, url)) scheduleLiveRefresh(client);
    } catch { /* التحديثُ زينةٌ لا شرطُ نجاحٍ — لا يُفشل نداءً نجح */ }
    return res;
  };
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      //  **وتعودُ إلى النافذة فترى ما فعله زملاؤك** — التحديثُ الحيّ أدناه
      //  يغطّي كتابتَك أنت في الحال، وهذا يغطّي كتابةَ غيرك على جهازٍ آخر
      //  لحظةَ عودتك إلى التبويب. وكان مطفأً، فكانت الشاشةُ تشيخ بصمت.
      refetchOnWindowFocus: true,
      // Was Infinity which made every query a one-shot for the session.
      // 60s gives a good balance: same query within a minute uses cache
      // (no flicker, no re-fetch on tab switch) but stale data doesn't
      // linger across true workflow changes.
      staleTime: 60_000,
      // gcTime defaults to 5 minutes which is fine for our memory budget.
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

//  **ويُركَّب الحارسُ مع الوحدة** — قبل أن تقع أوّلُ كتابة.
installLiveRefresh(queryClient);
