//  ══ أداتا القدرات — البحثُ في الفهرس ثمّ النداء ═════════════════════════
//
//  خطوتان لا واحدة **عمداً**: مئةُ قدرةٍ محشوّةٌ في نصّ النظام تُرسَل مع
//  **كلّ** سؤال، فتكلّف رموزاً في كلّ طلبٍ وتُشوّش اختيارَ النموذج. فيبحث
//  أوّلاً بموضوعٍ ثمّ ينادي واحدةً باسمها.
//
//  ══ والحارسُ ليس هنا ════════════════════════════════════════════════════
//
//  مَن يرى ماذا تقرّره **النقطةُ المنفَّذة** بجلسة السائل. وما في هذا الملفّ
//  ثلاثةُ حدودٍ فوقها لا بدلاً منها:
//    ① قائمةُ سماحٍ صريحة — ما ليس في الفهرس لا يُنادى، ولو اخترع النموذج
//      مساراً. (و`GET /api/logout` يُنهي الجلسة — فـ«القراءةُ آمنة» دعوى
//      كاذبة في هذا المستودع، راجع `catalog.ts`.)
//    ② وضعُ المساعد الماليّ — الأضيقُ من الاثنين يفوز: المالُ لا يُعرَض ولا
//      يُنادى خارجه ولو كانت النقطةُ نفسُها تسمح لصاحب الجلسة.
//    ③ حجمُ الجواب وحسابُه — في `shape.ts`.

import type { AiAccessContext } from "../access";
import type { ToolOutcome } from "../tools/registry";
import { buildCatalog, type Capability } from "./catalog";
import { matchCapabilities, MAX_MATCHES } from "./match";
import { invokeCapability, type SourceRequest } from "./invoke";
import { shapeResult, type Aggregate } from "./shape";

/** ما يلزم لتنفيذ نقطةٍ نيابةً عن السائل. */
export interface CapabilityContext {
  /** تطبيقُ Express نفسُه — مصدرُ الفهرس والمنفِّذ. */
  app: any;
  /** الطلبُ الحقيقيُّ الذي وصل به السؤال — منه الجلسة. */
  source: SourceRequest;
}

const fail = (reason: string): ToolOutcome => ({ ok: false, data: { error: reason } });

const NO_CONTEXT = "قراءةُ شاشات التطبيق غير متاحة في هذا السياق.";

//  الفهرسُ يُبنى مرّةً لكلّ تطبيق: جدولُ المسارات لا يتغيّر بعد الإقلاع.
const CACHE = new WeakMap<object, Capability[]>();

function catalogFor(app: any): Capability[] {
  //  **تطبيقُ Express دالّةٌ لا كائن** — `typeof app === "function"`.
  //  وفحصُ «كائن» وحده كان يُفرغ الفهرسَ بصمتٍ فيعتذر المساعدُ دائماً.
  const kind = typeof app;
  if (!app || (kind !== "object" && kind !== "function")) return [];
  const hit = CACHE.get(app);
  if (hit) return hit;
  const built = buildCatalog(app).capabilities;
  CACHE.set(app, built);
  return built;
}

/** ما يراه صاحبُ هذه الجلسة من الفهرس — قبل أيّ نداء. */
function visibleTo(access: AiAccessContext, app: any): Capability[] {
  const all = catalogFor(app);
  return access.mode === "financial" ? all : all.filter((c) => !c.financial);
}

const asObject = (v: unknown): Record<string, unknown> | null =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/** ① البحثُ في الفهرس. */
export async function listCapabilities(
  access: AiAccessContext, input: any, ctx?: CapabilityContext,
): Promise<ToolOutcome> {
  if (!ctx?.app) return fail(NO_CONTEXT);
  const pool = visibleTo(access, ctx.app);
  if (pool.length === 0) return fail("لا توجد شاشاتٌ متاحة للقراءة.");

  const topic = typeof input?.topic === "string" ? input.topic : "";
  const found = matchCapabilities(pool, topic, MAX_MATCHES);

  if (found.length === 0) {
    return {
      ok: true,
      data: {
        capabilities: [],
        note: "لا شاشةَ تطابق هذا الموضوع. جرّب كلماتٍ أخرى، أو قل للمستخدم إن هذه المعلومة غير مسجّلة في النظام.",
      },
    };
  }

  return {
    ok: true,
    data: {
      capabilities: found.map((c) => ({
        name: c.path,
        description: c.description,
        ...(c.pathParams.length ? { pathParams: c.pathParams } : {}),
        ...(c.query.length ? { query: c.query } : {}),
      })),
      note: "نادِ واحدةً منها بـ read_capability باسمها كما هو.",
    },
  };
}

/** ② نداءُ قدرةٍ بعينها. */
export async function readCapability(
  access: AiAccessContext, input: any, ctx?: CapabilityContext,
): Promise<ToolOutcome> {
  if (!ctx?.app) return fail(NO_CONTEXT);

  const name = typeof input?.name === "string" ? input.name.trim() : "";
  if (!name) return fail("اذكر اسمَ الشاشة كما أعطاه list_capabilities.");

  const pool = visibleTo(access, ctx.app);
  const cap = pool.find((c) => c.path === name);
  if (!cap) {
    //  التفريقُ بين «غير موجودة» و«ليست لك» يجعل المساعدَ عرّافاً: مَن
    //  يجرّب الأسماء يعرف أيّها ماليّة. فجوابٌ واحد — نفسُ مبدأ `NOT_FOUND`.
    return fail("لا توجد شاشةٌ بهذا الاسم ضمن المتاح لك. ابحث أوّلاً بـ list_capabilities.");
  }

  const result = await invokeCapability({
    app: ctx.app,
    source: ctx.source,
    path: cap.path,
    pathParams: asObject(input?.pathParams),
    query: asObject(input?.query),
  });

  if (result.status < 200 || result.status >= 300) {
    //  **رسالةُ النقطة نفسِها تُنقَل كما هي** — فحدُّ الصلاحية يُقال للموظّف
    //  بعبارة التطبيق التي يعرفها، لا بعبارةٍ يخترعها النموذج.
    const body = asObject(result.body);
    const said = typeof body?.message === "string" ? body.message
      : typeof body?.error === "string" ? body.error : null;
    if (result.status === 401 || result.status === 403) {
      return fail(said ?? "هذه البيانات خارج صلاحيتك.");
    }
    if (result.status === 404) return fail(said ?? "لا توجد بياناتٌ مطابقة.");
    return fail(said ?? "تعذّرت قراءة هذه الشاشة.");
  }

  const shaped = shapeResult(result.body, {
    aggregate: (asObject(input?.aggregate) as Aggregate | null) ?? null,
    fields: Array.isArray(input?.fields) ? input.fields.filter((f: unknown) => typeof f === "string") : null,
  });

  return { ok: true, data: { source: cap.path, ...shaped } };
}

export const LIST_SPEC = {
  name: "list_capabilities",
  description:
    "ابحث في فهرس شاشات النظام عن الشاشة التي فيها الجواب. استعملها **أوّلاً** كلّما سُئلتَ عن "
    + "بياناتٍ حيّة لا تملك أداةً مخصَّصة لها (أوامرُ التصنيع والمتأخّرون والخبراء والطوابير "
    + "والمصاريفُ والفواتيرُ والاستطلاعاتُ والشذوذُ وغيرها). أعطِ `topic` بكلماتٍ من سؤال "
    + "المستخدم. **ولا تعتذر عن نقص أداةٍ قبل أن تبحث هنا.**",
  input_schema: {
    type: "object",
    properties: { topic: { type: "string", description: "كلماتٌ من سؤال المستخدم، مثل: أوامر تصنيع متأخرة خبير" } },
    required: ["topic"],
  },
} as const;

export const READ_SPEC = {
  name: "read_capability",
  description:
    "اقرأ شاشةً من فهرس النظام باسمها كما أعطاه list_capabilities. تُنفَّذ بصلاحية المستخدم "
    + "السائل نفسِه، فلا تُرجع إلا ما يراه هو. **والعدُّ والجمعُ والترتيبُ تفعلها بـ`aggregate` "
    + "لا بنفسك**: `where` يرشّح الصفوف، و`groupBy` يجمّع، و`sum` يجمع حقلاً رقمياً، و`sort` "
    + "يرتّب. مثال «أيُّ خبيرٍ أكثرُ تأخّراً بلا عذر»: اقرأ /api/manufacturing/notifications مع "
    + "aggregate = {where:[{field:\"kind\",equals:\"overdue\"},{field:\"holdReasonCode\",isNull:true}],"
    + "groupBy:\"expertName\",sort:\"count\"}.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "اسمُ الشاشة كما ورد في list_capabilities" },
      pathParams: { type: "object", description: "معاملاتُ المسار الإلزامية، مثل { id: 12 }" },
      query: { type: "object", description: "معاملاتُ الترشيح، مثل { branchId: 3, startDate: \"2026-09-01\" }" },
      fields: { type: "array", items: { type: "string" }, description: "حقولٌ تُبقى من كلّ صفّ" },
      aggregate: {
        type: "object",
        description: "تجميعٌ يقع في الخادم",
        properties: {
          path: { type: "string", description: "اسمُ المصفوفة في الجواب إن لم تُكتشَف" },
          where: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string" },
                equals: {},
                isNull: { type: "boolean" },
                notNull: { type: "boolean" },
              },
              required: ["field"],
            },
          },
          groupBy: { type: "string" },
          sum: { type: "string" },
          sort: { type: "string", enum: ["count", "sum"] },
          limit: { type: "number" },
        },
      },
    },
    required: ["name"],
  },
} as const;
