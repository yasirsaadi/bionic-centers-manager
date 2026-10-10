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
//
// **وتكملةٌ (ملاحظةُ المالك ٢٠٢٦-١٠-١٠ مساءً)**: من آيفون ١٧ صارت سليمة، ومن آيفون ١٣ للموظّفة بقيت «المعاينة الطبية» وحدها مفكّكة. وفي المصوِّر
// بابٌ واحدٌ فقط يرسم الكلمةَ حرفاً حرفاً: **أن يعيد المتصفّحُ لمدى الكلمة أكثرَ من مستطيل** (`getClientRects().length > 1`). وأُعيد إنتاجُ صورة
// الورقة نفسِها في كروم بمتصفّحٍ يعيد للكلمة مستطيلين. فالعلاجُ لا يتوقّف على إصدار سفاري: في نسخة المصوِّر وحدها **مستطيلاتُ الكلمة في سطرٍ واحد
// تُجمع مستطيلاً واحداً** (`keepWordsWhole`) فتُرسَم الكلمةُ كاملةً موصولة؛ ولكلّ سطرٍ اتّجاهُه صريحاً من أوّل حرفٍ قويّ فيه بدل `unicode-bidi:
// plaintext` (وهو الفرقُ الوحيد بين الخانة المكسورة والخانات السليمة على ذلك الهاتف).

/** محارفُ الاتجاه والتنسيق الخفيّة: علاماتُ الاتجاه (ALM · LRM · RLM)، والتضمينُ والتجاوز (U+202A–U+202E)، والعزل (U+2066–U+2069)، ورابطُ الكلمة، والمسافاتُ الصفرية. */
export const INVISIBLE_FORMAT_CHARS = /[؜​-‏‪-‮⁠-⁩﻿]/g;

/** النصُّ كما يُصوَّر: بلا محارف خفيّة، وسطرُ ويندوز (`\r\n`) والسطرُ القديم (`\r`) سطرٌ واحد. */
export function capturableText(text: string): string {
  return text.replace(/\r\n?/g, "\n").replace(INVISIBLE_FORMAT_CHARS, "");
}

const PRESERVES_LINES = /^(pre|pre-wrap|pre-line|break-spaces)$/;

/** **اتّجاهُ السطر من أوّل حرفٍ قويّ فيه** — كما يفعل `dir="auto"` — و`null` لسطرٍ بلا حرفٍ قويّ (أرقامٌ ورموز) فيرث اتّجاهَ الورقة. */
export function firstStrongDir(text: string): "rtl" | "ltr" | null {
  for (const ch of text) {
    if (/[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/.test(ch)) return "rtl";
    if (/[A-Za-z\u00C0-\u024F]/.test(ch)) return "ltr";
  }
  return null;
}

interface LineRect { left: number; top: number; width: number; height: number }

/**
 * **مستطيلاتُ مدىً واحد ⟵ مستطيلٌ واحد إن كانت في سطرٍ واحد** — والفارغةُ (عرضٌ صفر) تُهمَل. و`null` حين تقع في أسطرٍ مختلفة (كلمةٌ التفّت حقّاً
 * على سطرين) فتبقى كما هي. السطرُ الواحد: تتراكب المستطيلاتُ عمودياً بنصف ارتفاع أقصرها على الأقلّ.
 */
export function mergeLineRects(rects: readonly LineRect[]): LineRect[] | null {
  const real = rects.filter((r) => r.width > 0 && r.height > 0);
  if (real.length <= 1) return real.length === 1 ? [real[0]] : null;
  const top = Math.min(...real.map((r) => r.top));
  const bottom = Math.max(...real.map((r) => r.top + r.height));
  const sameLine = real.every((a) => real.every((b) => {
    const overlap = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
    return overlap >= Math.min(a.height, b.height) / 2;
  }));
  if (!sameLine) return null;
  const left = Math.min(...real.map((r) => r.left));
  const right = Math.max(...real.map((r) => r.left + r.width));
  return [{ left, top, width: right - left, height: bottom - top }];
}

/**
 * **الكلمةُ تُرسَم كاملة** — في نافذة نسخة المصوِّر وحدها (تُزال مع إطارها بعد التصوير): مدىً داخل عقدة نصٍّ واحدة يعيد مستطيلاتِه مجموعةً
 * إن كانت في سطرٍ واحد (`mergeLineRects`)، فلا يجد المصوِّرُ «أكثرَ من مستطيل» فيرسم الكلمةَ حرفاً حرفاً بلا وصل.
 */
export function keepWordsWhole(win: Window): void {
  const RangeProto = (win as any).Range?.prototype;
  const Rect = (win as any).DOMRect;
  if (!RangeProto || typeof Rect !== "function" || RangeProto.__keepWordsWhole) return;
  const original = RangeProto.getClientRects;
  RangeProto.getClientRects = function (this: Range) {
    const list = original.call(this);
    if (list.length < 2 || this.startContainer !== this.endContainer || this.startContainer.nodeType !== 3 /* Node.TEXT_NODE */) return list;
    const merged = mergeLineRects(Array.from(list as ArrayLike<DOMRect>));
    return merged ? merged.map((r) => new Rect(r.left, r.top, r.width, r.height)) : list;
  };
  RangeProto.__keepWordsWhole = true;
}

/**
 * **يهيّئ نسخةَ المصوِّر** (تُنادى في `onclone`): (١) كلُّ نصٍّ بلا محارف خفيّة؛ (٢) والعنصرُ الذي نصُّه خالصٌ متعدّدُ الأسطر بأسطرٍ محفوظة
 * (`pre-wrap` ونحوه) يصير كتلةً فيها سطرٌ لكلّ كتلة — باتّجاه كلّ سطرٍ من أوّل حرفٍ قويّ فيه (`firstStrongDir`)، والسطرُ الفارغ يبقى فراغاً
 * بارتفاعه؛ (٣) والكلمةُ تُرسَم كاملة (`keepWordsWhole`).
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
  keepWordsWhole(win);
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
      //  اتّجاهٌ صريح كبقيّة خانات الورقة — لا `dir="auto"` ولا `unicode-bidi: plaintext` (مستطيلاتٌ متعدّدةٌ للكلمة في سفاري أقدم).
      const dir = firstStrongDir(line);
      if (dir) row.dir = dir;
      row.style.textAlign = "start";
      row.style.whiteSpace = "normal";
      row.textContent = line.trim() ? line : " ";
      box.appendChild(row);
    }
    el.style.whiteSpace = "normal";
    el.replaceChildren(box);
  }
}
