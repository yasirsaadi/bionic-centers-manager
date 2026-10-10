// **النصُّ العربيّ في النسخة المصوَّرة** (ملاحظةُ المالك ٢٠٢٦-١٠-١٠: «في الاستمارة المعاينةُ والملاحظات عربيتُها غير صحيحة» — صورةُ ورقةٍ
// مطبوعة: حروفٌ مفكّكة وناقصة في «المعاينة الطبية» و«ملاحظات» وحدهما، والخاناتُ الأخرى سليمة).
//
// ملفُّ الطباعة في تطبيق الشاشة الرئيسية بآيفون وآيباد (§4.cw) يصوّره `html2canvas`: يقسم النصَّ كلماتٍ ويرسم كلَّ كلمةٍ في موضعها. وحين
// يعطي المتصفّحُ للكلمة أكثرَ من مستطيل يرسمها **حرفاً حرفاً** — والحرفُ العربيّ وحده بلا وصل، وعرضُه غيرُ عرضه موصولاً، فيتراكب ويختفي.
// **ثبت سببٌ** بالتجربة: نصٌّ فيه **محارفُ اتجاهٍ خفيّة** (علامةُ اليسار-يمين U+200E وأخواتها — تُدخلها لوحاتُ المفاتيح عند خلط الأرقام
// والحروف) كسر الكلمةَ في المصوِّر وبقي سليماً على الشاشة. **ويُرجَّح ثانٍ لا يتكرّر في كروم**: الخانتان المكسورتان وحدهما متعدّدتا الأسطر
// (`white-space: pre-wrap`)، وسفاري يحسب مستطيلاتِ الكلمات فيهما بطريقته — ولا سفاري في بيئة الاختبار.
// فالعلاجُ في **نسخة المصوِّر وحدها** (الشاشةُ والطباعةُ العادية لا تُمَسّ): تُحذف المحارفُ الخفيّة، ويُوحَّد سطرُ ويندوز، وكلُّ نصٍّ متعدّد الأسطر
// يصير سطراً في كتلة — فكلُّ كلمةٍ مستطيلٌ واحد تُرسَم موصولة.

/** محارفُ الاتجاه والتنسيق الخفيّة: علاماتُ الاتجاه (ALM · LRM · RLM)، والتضمينُ والتجاوز (U+202A–U+202E)، والعزل (U+2066–U+2069)، ورابطُ الكلمة، والمسافاتُ الصفرية. */
export const INVISIBLE_FORMAT_CHARS = /[؜​-‏‪-‮⁠-⁩﻿]/g;

/** النصُّ كما يُصوَّر: بلا محارف خفيّة، وسطرُ ويندوز (`\r\n`) والسطرُ القديم (`\r`) سطرٌ واحد. */
export function capturableText(text: string): string {
  return text.replace(/\r\n?/g, "\n").replace(INVISIBLE_FORMAT_CHARS, "");
}

const PRESERVES_LINES = /^(pre|pre-wrap|pre-line|break-spaces)$/;

/**
 * **يهيّئ نسخةَ المصوِّر** (تُنادى في `onclone`): (١) كلُّ نصٍّ بلا محارف خفيّة؛ (٢) والعنصرُ الذي نصُّه خالصٌ متعدّدُ الأسطر بأسطرٍ محفوظة
 * (`pre-wrap` ونحوه) يصير كتلةً فيها سطرٌ لكلّ كتلة — باتّجاه كلّ سطرٍ من حروفه (`dir="auto"`)، والسطرُ الفارغ يبقى فراغاً بارتفاعه.
 */
export function prepareTextForCapture(root: HTMLElement): void {
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  const walker = doc.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
  const texts: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) texts.push(n as Text);
  for (const t of texts) {
    const clean = capturableText(t.data);
    if (clean !== t.data) t.data = clean;
  }
  if (!win) return;
  const done = new Set<HTMLElement>();
  for (const t of texts) {
    const el = t.parentElement;
    if (!el || done.has(el) || !t.data.includes("\n")) continue;
    if (Array.from(el.childNodes).some((c) => c.nodeType !== 3 /* Node.TEXT_NODE */)) continue;
    if (!PRESERVES_LINES.test(win.getComputedStyle(el).whiteSpace)) continue;
    done.add(el);
    const lines = (el.textContent ?? "").split("\n");
    const box = doc.createElement("div");
    box.setAttribute("data-capture-lines", "");
    box.style.width = "100%";
    box.style.minWidth = "0";
    for (const line of lines) {
      const row = doc.createElement("div");
      row.dir = "auto";
      row.style.unicodeBidi = "plaintext";
      row.style.textAlign = "start";
      row.style.whiteSpace = "normal";
      row.textContent = line.trim() ? line : " ";
      box.appendChild(row);
    }
    el.style.whiteSpace = "normal";
    el.replaceChildren(box);
  }
}
