//  ══ تشكيلُ الجواب — الحسابُ في الخادم لا في النموذج ═════════════════════
//
//  نقطةٌ تُرجع ثلاثة آلاف صفٍّ لا تُرسَل إلى نموذج. ولو أُرسلت لَجمعها هو
//  وعدّها ورتّبها — وذاك ما تمنعه قاعدةُ `TOOL_TRUST_RULES` صراحةً: «لا
//  تحسب رقماً بنفسك». فالعدُّ والجمعُ والترتيبُ يقعون **هنا**، والنموذجُ
//  يقرأ نتيجةً جاهزة.
//
//  وهذا ملفٌّ خالص: لا قاعدةَ بيانات ولا شبكةَ ولا جلسة — فيُختبَر دخلاً
//  وخرجاً لا بقراءة نصِّه.

/** شرطُ ترشيحٍ واحد — يُقيَّم على صفٍّ واحد. */
export interface RowFilter {
  field: string;
  /** مساواةٌ بعد تحويل الطرفين إلى نصّ — فـ`3` و`"3"` سواء. */
  equals?: unknown;
  /** الحقلُ غائبٌ أو فارغ — وهذا ما يفرّق «متأخّرٌ بلا عذر» عن «بعذرٍ مسجَّل». */
  isNull?: boolean;
  /** الحقلُ موجودٌ وغيرُ فارغ. */
  notNull?: boolean;
}

/** طلبُ تجميعٍ يقع في الخادم. */
export interface Aggregate {
  /** أين المصفوفةُ في الجواب («items» · «experts») — تُكتشَف حين تُترَك. */
  path?: string;
  where?: RowFilter[];
  /** الحقلُ الذي يُجمَّع به. غيابُه يعني عَدَّ المطابقين بلا تجميع. */
  groupBy?: string;
  /** حقلٌ رقميٌّ يُجمَع لكلّ مجموعة. */
  sum?: string;
  sort?: "count" | "sum";
  limit?: number;
}

export interface ShapeOptions {
  aggregate?: Aggregate | null;
  /** حقولٌ تُبقى من كلّ صفّ حين لا تجميع. */
  fields?: string[] | null;
  maxRows?: number;
}

/** أكثرُ ما يُسلَّم للنموذج من صفوفٍ خام. */
export const MAX_ROWS = 40;
/** أكثرُ ما يُسلَّم من مجموعات. */
export const MAX_GROUPS = 25;

const isRow = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function readPath(body: unknown, path: string | undefined): unknown {
  if (!path) return body;
  let cur: any = body;
  for (const key of path.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = cur[key];
  }
  return cur;
}

/**
 * أينَ المصفوفة؟ — الجوابُ نفسُه إن كان مصفوفة، وإلّا **أطولُ** مصفوفةٍ في
 * المستوى الأوّل. والاكتشافُ راحةٌ لا قاعدة: `path` الصريح يعلو عليه دائماً.
 */
function findRows(body: unknown, path?: string): unknown[] | null {
  const at = readPath(body, path);
  if (Array.isArray(at)) return at;
  if (path) return null;
  if (!isRow(body)) return null;
  let best: unknown[] | null = null;
  for (const v of Object.values(body)) {
    if (Array.isArray(v) && (!best || v.length > best.length)) best = v;
  }
  return best;
}

const asText = (v: unknown): string =>
  v === null || v === undefined ? "" : String(v);

const blank = (v: unknown): boolean =>
  v === null || v === undefined || v === "";

function passes(row: unknown, filters: RowFilter[] | undefined): boolean {
  if (!filters || filters.length === 0) return true;
  if (!isRow(row)) return false;
  for (const f of filters) {
    if (!f || typeof f.field !== "string") continue;
    const v = row[f.field];
    if (f.isNull === true && !blank(v)) return false;
    if (f.notNull === true && blank(v)) return false;
    if (f.equals !== undefined && asText(v) !== asText(f.equals)) return false;
  }
  return true;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export interface ShapedGroup { key: string; count: number; sum?: number }

export interface Shaped {
  /** صفوفٌ خام — حين لا تجميع. */
  rows?: unknown[];
  /** مجموعاتٌ محسوبة — حين تجميع. */
  groups?: ShapedGroup[];
  /** عددُ المطابقين قبل أيّ قصّ — الصدقُ في الحجم. */
  matched?: number;
  /** عددُ الصفوف قبل الترشيح. */
  total?: number;
  /** قُصّ شيءٌ فعلاً. */
  truncated?: boolean;
  /** الجوابُ كما هو حين لا مصفوفةَ فيه أصلاً (ملخّصٌ أو كائنٌ واحد). */
  value?: unknown;
  /** ملاحظةٌ عربيةٌ تُقال للنموذج حين يلزم. */
  note?: string;
}

/**
 * يشكّل جوابَ النقطة قبل تسليمه للنموذج.
 *
 * **ولا يُخفي قصّاً أبداً**: كلُّ قصٍّ يُعلَن بـ`truncated` ومعه العددُ
 * الحقيقيّ — فالنموذجُ يقول «أعلى عشرة من أربعين» لا «أربعون» كذباً.
 */
export function shapeResult(body: unknown, options: ShapeOptions = {}): Shaped {
  const maxRows = Math.max(1, Math.min(options.maxRows ?? MAX_ROWS, MAX_ROWS));
  const agg = options.aggregate ?? null;
  const rows = findRows(body, agg?.path);

  if (!rows) {
    //  لا مصفوفةَ — ملخّصٌ أو كائنٌ واحد يمضي كما هو.
    return agg
      ? { value: body, note: "لا توجد قائمةٌ في هذا الجواب ليُجمَّع عليها — أُعيد كما هو." }
      : { value: body };
  }

  const kept = rows.filter((r) => passes(r, agg?.where));

  if (agg && (agg.groupBy || agg.sum)) {
    if (!agg.groupBy) {
      const one: ShapedGroup = { key: "الكل", count: kept.length };
      if (agg.sum) {
        const field = agg.sum;
        one.sum = kept.reduce<number>((t, r) => t + num(isRow(r) ? r[field] : 0), 0);
      }
      return { groups: [one], matched: kept.length, total: rows.length };
    }
    const map = new Map<string, ShapedGroup>();
    for (const r of kept) {
      const key = isRow(r) ? (blank(r[agg.groupBy]) ? "غير محدد" : asText(r[agg.groupBy])) : "غير محدد";
      const g = map.get(key) ?? { key, count: 0, ...(agg.sum ? { sum: 0 } : {}) };
      g.count += 1;
      if (agg.sum) g.sum = (g.sum ?? 0) + num(isRow(r) ? r[agg.sum] : 0);
      map.set(key, g);
    }
    const by = agg.sort === "sum" && agg.sum ? "sum" : "count";
    const all = Array.from(map.values()).sort((a, b) =>
      ((b[by] as number) ?? 0) - ((a[by] as number) ?? 0) || a.key.localeCompare(b.key));
    const limit = Math.max(1, Math.min(agg.limit ?? MAX_GROUPS, MAX_GROUPS));
    return {
      groups: all.slice(0, limit),
      matched: kept.length,
      total: rows.length,
      ...(all.length > limit ? { truncated: true, note: `أعلى ${limit} من ${all.length} مجموعة.` } : {}),
    };
  }

  const project = (r: unknown) => {
    if (!options.fields || options.fields.length === 0 || !isRow(r)) return r;
    const out: Record<string, unknown> = {};
    for (const f of options.fields) if (f in r) out[f] = r[f];
    return out;
  };

  return {
    rows: kept.slice(0, maxRows).map(project),
    matched: kept.length,
    total: rows.length,
    ...(kept.length > maxRows
      ? { truncated: true, note: `عُرض ${maxRows} صفّاً من ${kept.length}. استعمل التجميع (aggregate) لجوابٍ كامل.` }
      : {}),
  };
}
