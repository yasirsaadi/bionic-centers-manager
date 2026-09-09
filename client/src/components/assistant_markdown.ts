// وسمُ Markdown آمنٌ وصغيرٌ لردود المساعد الذكي — **منطقٌ خالص، بلا React
// وبلا DOM**، يُختبَر وحده (`npm run test:assistant-markdown`).
//
// ══ لماذا هذا لا مكتبةٌ خارجية ═══════════════════════════════════════════
// المهمّة تطلب صراحةً «لا تُضِف تبعيةً ثقيلة إن لم توجد مكتبةُ Markdown آمنة
// أصلاً في الريبو» — ولا توجد. والمجموعةُ المطلوبة صغيرةٌ جداً (عناوين،
// عريض، قوائم، جداولُ بسيطة، أسطرٌ جديدة) فتحليلٌ خاصّ صغير أخفّ من سلسلة
// unified/remark/rehype الكاملة، **وأضمن أمناً بالبناء لا بالتصفية**:
// المُحلِّل هنا لا يعرف صياغةَ الروابط ولا الصور ولا HTML الخام إطلاقاً، فلا
// حاجة لمعقِّم يلاحق ما يخرج — هذه الأشياء لا تدخل شجرة العناصر أصلاً.
//
// ══ العقد ═════════════════════════════════════════════════════════════
// `parseAssistantMarkdown` تُعيد شجرة كتلٍ مطبوعة (`Block[]`) — لا نصَّ
// HTML، ولا شيء يمرّ يوماً على `dangerouslySetInnerHTML`. الرسمُ في
// `AssistantMarkdown.tsx` يبني عناصر React مباشرةً من هذه الشجرة.

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "bold"; value: string };

export type Block =
  | { type: "heading"; level: 1 | 2 | 3; inline: InlineNode[] }
  | { type: "paragraph"; lines: InlineNode[][] }
  | { type: "list"; ordered: boolean; items: InlineNode[][] }
  | { type: "table"; header: InlineNode[][]; rows: InlineNode[][][] };

const HEADING_RE = /^(#{1,3})\s+(.*)$/;
const UNORDERED_ITEM_RE = /^[-*]\s+(.*)$/;
const ORDERED_ITEM_RE = /^\d+\.\s+(.*)$/;
const TABLE_ROW_RE = /^\|(.*)\|\s*$/;

/** `**نصّ**` ⟶ عقدةُ عريض. غيرُ ذلك نصٌّ عادي — لا صياغةَ أخرى تُفهَم. */
export function parseInline(line: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > lastIndex) nodes.push({ type: "text", value: line.slice(lastIndex, m.index) });
    nodes.push({ type: "bold", value: m[1] });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < line.length) nodes.push({ type: "text", value: line.slice(lastIndex) });
  if (nodes.length === 0) nodes.push({ type: "text", value: "" });
  return nodes;
}

/** يقصّ الأنبوبتين الطرفيّتين إن وُجدتا ثم يقسّم على «|» — بلا هروبٍ من الأنبوب (غير مطلوب هنا). */
function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

/** صفُّ فاصل GFM: كلُّ خليةٍ منه `---` أو `:---` أو `---:` أو `:---:` فقط. */
function isTableSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c));
}

/** أوّلُ سطرين من `i` يُشكّلان بدايةَ جدولٍ حقيقيّ (رأسٌ ثم فاصل)؟ */
function startsTableAt(lines: readonly string[], i: number): boolean {
  if (!TABLE_ROW_RE.test(lines[i] ?? "")) return false;
  const next = lines[i + 1];
  if (next === undefined || !TABLE_ROW_RE.test(next)) return false;
  return isTableSeparatorRow(splitTableRow(next));
}

/**
 * نصٌّ حرٌّ ⟶ شجرةُ كتلٍ. **مجموعةٌ صغيرة متعمَّدة**: عناوين (# ## ###)،
 * عريضٌ (**نصّ**)، قوائمُ نقاطٍ (-/*) وأرقام (1.)، جداولُ GFM بسيطة، وأسطرٌ
 * جديدة داخل الفقرة (سطرٌ فارغ يفصل بين الفقرات).
 *
 * وكلُّ ما لا تعرفه هذه القائمة — روابط، صور، HTML خام، كتلُ كود — **يبقى
 * نصّاً عادياً حرفياً**، لا يُفسَّر ولا يُفشِل التحليل.
 */
export function parseAssistantMarkdown(text: string): Block[] {
  const rawLines = (text ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];

    if (line.trim() === "") { i++; continue; }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length as 1 | 2 | 3, inline: parseInline(heading[2]) });
      i++;
      continue;
    }

    if (startsTableAt(rawLines, i)) {
      const header = splitTableRow(line).map(parseInline);
      let j = i + 2; // تخطّي الرأس وصفّ الفاصل معاً
      const rows: InlineNode[][][] = [];
      while (j < rawLines.length && TABLE_ROW_RE.test(rawLines[j])) {
        rows.push(splitTableRow(rawLines[j]).map(parseInline));
        j++;
      }
      blocks.push({ type: "table", header, rows });
      i = j;
      continue;
    }

    const isOrderedStart = ORDERED_ITEM_RE.test(line);
    const isUnorderedStart = UNORDERED_ITEM_RE.test(line);
    if (isOrderedStart || isUnorderedStart) {
      const ordered = isOrderedStart;
      const items: InlineNode[][] = [];
      while (i < rawLines.length) {
        const m = ordered ? ORDERED_ITEM_RE.exec(rawLines[i]) : UNORDERED_ITEM_RE.exec(rawLines[i]);
        if (!m) break;
        items.push(parseInline(m[1]));
        i++;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    //  ══ فقرة: أسطرٌ متتالية حتى سطرٍ فارغ أو بداية كتلةٍ أخرى ══════════
    const lines: InlineNode[][] = [];
    while (
      i < rawLines.length && rawLines[i].trim() !== ""
      && !HEADING_RE.test(rawLines[i])
      && !UNORDERED_ITEM_RE.test(rawLines[i])
      && !ORDERED_ITEM_RE.test(rawLines[i])
      && !startsTableAt(rawLines, i)
    ) {
      lines.push(parseInline(rawLines[i]));
      i++;
    }
    blocks.push({ type: "paragraph", lines });
  }

  return blocks;
}
