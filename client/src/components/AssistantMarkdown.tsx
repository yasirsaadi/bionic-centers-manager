// رسمُ ردود المساعد الذكي — Markdown آمنٌ صغيرٌ فوق شجرة `assistant_markdown.ts`.
//
// كانت `AiChatDrawer.tsx` تعرض `{m.content}` كنصٍّ عاديّ، فتظهر علاماتُ
// الصياغة الخام (**نصّ**، ##، |) للموظّف حرفياً بدل أن تُنسَّق. هذا المكوّن
// يبني عناصر React **مباشرةً من الشجرة المطبوعة** — لا `dangerouslySetInnerHTML`
// إطلاقاً، فلا HTML خام ولا نصَّ برمجيّ يمكن أن يُنفَّذ من محتوى ردٍّ، ولا
// رابطَ ولا صورةَ لأن الشجرة نفسها لا تعرف صياغتهما (راجع تعليق الملفّ الآخر).
//
// **رسالةُ المستخدم تبقى نصّاً عادياً** — هذا المكوّن لردود المساعد وحدها.

import type { Block, InlineNode } from "./assistant_markdown";
import { parseAssistantMarkdown } from "./assistant_markdown";

function renderInline(nodes: InlineNode[], keyPrefix: string) {
  return nodes.map((n, idx) => {
    const key = `${keyPrefix}-i${idx}`;
    if (n.type === "bold") return <strong key={key} className="font-semibold">{n.value}</strong>;
    //  نصٌّ فارغٌ (سطرٌ فارغ داخل فقرة) لا يُنتج عقدةً مرئية، لكن المفتاح يبقى.
    return n.value ? <span key={key}>{n.value}</span> : null;
  });
}

/** أسطرُ فقرةٍ — كلُّ سطرٍ فاصلُه `<br />` عن الذي يليه، لا فقرةً منفصلة. */
function renderParagraphLines(lines: InlineNode[][], keyPrefix: string) {
  return lines.map((line, i) => (
    <span key={`${keyPrefix}-l${i}`}>
      {renderInline(line, `${keyPrefix}-l${i}`)}
      {i < lines.length - 1 ? <br /> : null}
    </span>
  ));
}

const HEADING_SIZE: Record<1 | 2 | 3, string> = {
  1: "text-base",
  2: "text-sm",
  3: "text-sm",
};

export function AssistantMarkdown({ text }: { text: string }) {
  const blocks = parseAssistantMarkdown(text);
  return (
    <div className="space-y-2">
      {blocks.map((b: Block, i: number) => {
        const key = `b${i}`;
        if (b.type === "heading") {
          const common = `font-bold ${HEADING_SIZE[b.level]}`;
          const content = renderInline(b.inline, key);
          if (b.level === 1) return <h1 key={key} className={common}>{content}</h1>;
          if (b.level === 2) return <h2 key={key} className={common}>{content}</h2>;
          return <h3 key={key} className={common}>{content}</h3>;
        }

        if (b.type === "paragraph") {
          return <p key={key} className="leading-relaxed">{renderParagraphLines(b.lines, key)}</p>;
        }

        if (b.type === "list") {
          const items = b.items.map((item, ii) => (
            <li key={`${key}-${ii}`}>{renderInline(item, `${key}-${ii}`)}</li>
          ));
          return b.ordered
            ? <ol key={key} className="list-decimal pr-5 space-y-0.5">{items}</ol>
            : <ul key={key} className="list-disc pr-5 space-y-0.5">{items}</ul>;
        }

        //  ══ جدول — تمريرٌ أفقيّ داخل حاويته الخاصّة فلا ينكسر عرضُ الدرج
        //  الضيّق، وخطٌّ مضغوطٌ يناسب مساحته ══
        return (
          <div key={key} className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr>
                  {b.header.map((cell, ci) => (
                    <th
                      key={`${key}-h${ci}`}
                      className="border bg-muted/50 px-1.5 py-1 text-right font-semibold whitespace-nowrap"
                    >
                      {renderInline(cell, `${key}-h${ci}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((row, ri) => (
                  <tr key={`${key}-r${ri}`}>
                    {row.map((cell, ci) => (
                      <td key={`${key}-r${ri}-${ci}`} className="border px-1.5 py-1 align-top">
                        {renderInline(cell, `${key}-r${ri}-${ci}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
