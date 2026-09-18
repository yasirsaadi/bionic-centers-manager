// إعداداتُ إظهار الأقسام — تُخفي ولا تمنح (٢٠٢٦-٠٩-١٩).
// `npm run test:sidebar-section-visibility` — بلا قاعدة بيانات.
//
// ══ ما يثبته ═════════════════════════════════════════════════════════════
//   (١) `showPatients=false` يُخفي عناصرَ المرضى.
//   (٢) `showAccounting=false` يُخفي المحاسبة.
//   (٣) `showStatistics=false` يُخفي الإحصاءات.
//   (٤) وإعادتُها `true` تُعيد العنصر **إن كان الموظّفُ يملك صلاحيةَ رؤيته**.
//   (٥) **ولا تمنح هذه الخياراتُ صلاحيةً لموظّفٍ لا يملكها أصلاً** — لا
//       مرفوعةً ولا مخفوضةً ولا غائبة.
//
// ══ والعناصرُ تُقرأ من `Sidebar.tsx` نفسِه لا تُكتَب هنا ══════════════════
// لو أعدتُ كتابةَ (المسار · مفتاحُ الإظهار · مفتاحُ الصلاحية) في هذا الملفّ
// لاختبرتُ نسخةً من الوصف لا الوصلَ الحقيقيّ — فتتغيّر الشاشةُ يوماً ويبقى
// الاختبارُ أخضرَ على خيال. فتُستخرَج الثلاثيّاتُ من المصدر بتعبيرٍ نمطيّ،
// ثمّ تُمرَّر على الدالّة القانونية نفسِها التي يناديها الشريطُ الجانبيّ.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  isSidebarItemVisible,
  SECTION_KEYS,
  type SectionKey,
  type BranchVisibilitySettings,
} from "./sidebar_section_visibility";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const sidebarSrc = fs.readFileSync(path.join(here, "Sidebar.tsx"), "utf8");

/** عنصرُ قائمةٍ كما هو مكتوبٌ في `Sidebar.tsx` فعلاً. */
type Item = { href: string; settingKey: SectionKey | null; permission: string | null };

/**
 * كلُّ عنصرٍ يحمل `settingKey` في المصدر — بمساره ومفتاحِ صلاحيته.
 * (الترتيبُ داخل السطر ثابتٌ في هذا الملفّ: href ثمّ settingKey ثمّ permission.)
 */
function itemsFromSource(): Item[] {
  const out: Item[] = [];
  const re = /href:\s*"([^"]+)"[^\n]*?settingKey:\s*(?:"([^"]+)"|null)[^\n]*?permission:\s*(?:"([^"]+)"|null)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sidebarSrc)) !== null) {
    out.push({
      href: m[1],
      settingKey: (m[2] as SectionKey) ?? null,
      permission: m[3] ?? null,
    });
  }
  return out;
}

const ALL_ITEMS = itemsFromSource();
const KEYED = ALL_ITEMS.filter((i) => i.settingKey !== null);

/** موظّفٌ يملك كلَّ الصلاحيات التي تحرس الأقسام الخمسة. */
const FULL_PERMS: Record<string, boolean> = {
  canViewPatients: true,
  canAddPatients: true,
  canViewReports: true,
  canManageAccounting: true,
  canAddExpenses: false,
};
/** موظّفٌ لا يملك شيئاً منها. */
const NO_PERMS: Record<string, boolean> = {
  canViewPatients: false,
  canAddPatients: false,
  canViewReports: false,
  canManageAccounting: false,
  canAddExpenses: false,
};

const ALL_ON: BranchVisibilitySettings = {
  showDashboard: true, showPatients: true, showPayments: true,
  showAccounting: true, showStatistics: true,
};

function visible(
  item: Item,
  branchSettings: BranchVisibilitySettings | null | undefined,
  permissions: Record<string, boolean>,
  isAdmin = false,
): boolean {
  return isSidebarItemVisible({
    isAdmin,
    settingKey: item.settingKey,
    branchSettings,
    permission: item.permission,
    permissions,
    href: item.href,
  });
}

/** مسارات العناصر المرئية لمفتاحِ إظهارٍ بعينه، تحت إعداداتٍ وصلاحيات. */
function shownFor(
  key: SectionKey,
  branchSettings: BranchVisibilitySettings,
  permissions: Record<string, boolean>,
): string[] {
  return KEYED.filter((i) => i.settingKey === key)
    .filter((i) => visible(i, branchSettings, permissions))
    .map((i) => i.href)
    .sort();
}

/** كلُّ مسارات العناصر المفتاحية، بلا تصفية. */
function hrefsOf(key: SectionKey): string[] {
  return KEYED.filter((i) => i.settingKey === key).map((i) => i.href).sort();
}

// ══ أ. العناصرُ قُرئت فعلاً، والمفاتيحُ خمسةٌ لا سادسَ لها ═══════════════
console.log("\n── أ. القراءةُ من Sidebar.tsx نفسِه ──");
check(KEYED.length > 0, "أ.١ **عُثر على عناصرَ تحمل مفتاحَ إظهارٍ في المصدر**", String(KEYED.length));
same("أ.٢ **ولا مفتاحَ سادس — الخياراتُ الخمسةُ هي هي**",
  Array.from(new Set(KEYED.map((i) => i.settingKey))).sort(),
  [...SECTION_KEYS].sort());
check(hrefsOf("showPatients").length >= 2,
  "أ.٣ ومفتاحُ المرضى يحكم أكثرَ من عنصر (السجلّ والإضافة)", JSON.stringify(hrefsOf("showPatients")));

// ══ ب. الإطفاءُ يُخفي — الأقسامُ الثلاثة المطلوبة ═══════════════════════
console.log("\n── ب. الإطفاءُ يُخفي (والموظّفُ يملك الصلاحية) ──");
for (const [key, title] of [
  ["showPatients", "ب.١ **`showPatients=false` ⟶ عناصرُ المرضى تختفي كلُّها**"],
  ["showAccounting", "ب.٢ **`showAccounting=false` ⟶ المحاسبة تختفي**"],
  ["showStatistics", "ب.٣ **`showStatistics=false` ⟶ الإحصاءات تختفي**"],
] as const) {
  same(title, shownFor(key, { ...ALL_ON, [key]: false }, FULL_PERMS), []);
}

// ══ ج. والإعادةُ true تُعيد العنصر — لمن يملك صلاحيتَه ══════════════════
console.log("\n── ج. الإعادةُ true تُعيد العنصر لمن يملك الصلاحية ──");
for (const key of ["showPatients", "showAccounting", "showStatistics"] as const) {
  same(`ج.${key} **⟶ يعود كاملاً**`, shownFor(key, ALL_ON, FULL_PERMS), hrefsOf(key));
}

// ══ د. ولا تمنح شيئاً لمن لا يملك — وهو الانقلابُ المخيف ═══════════════
console.log("\n── د. إعداداتُ الفرع لا تمنح صلاحيةً أبداً ──");
for (const key of SECTION_KEYS) {
  const guarded = KEYED.filter((i) => i.settingKey === key && i.permission !== null);
  if (guarded.length === 0) continue;
  const onShown = guarded.filter((i) => visible(i, { ...ALL_ON, [key]: true }, NO_PERMS)).map((i) => i.href);
  const offShown = guarded.filter((i) => visible(i, { ...ALL_ON, [key]: false }, NO_PERMS)).map((i) => i.href);
  const absentShown = guarded.filter((i) => visible(i, undefined, NO_PERMS)).map((i) => i.href);
  same(`د.${key} **مرفوعاً ⟶ لا شيء** لموظّفٍ بلا صلاحية`, onShown, []);
  same(`د.${key}-off **ومخفوضاً ⟶ لا شيء**`, offShown, []);
  same(`د.${key}-absent **وغائباً تماماً ⟶ لا شيء** — لا الغيابُ يمنح`, absentShown, []);
}

// ══ هـ. الغيابُ ليس إخفاءً — فرعٌ بلا صفّ إعدادات ═══════════════════════
console.log("\n── هـ. غيابُ الإعدادات لا يُخفي شيئاً عمّن يملك الصلاحية ──");
const guardedAll = KEYED.filter((i) => i.permission !== null);
same("هـ.١ **`branchSettings = undefined` ⟶ كلُّ ما يملكه الموظّف يظهر**",
  guardedAll.filter((i) => visible(i, undefined, FULL_PERMS)).map((i) => i.href).sort(),
  guardedAll.map((i) => i.href).sort());
same("هـ.٢ **و`null` كذلك** — صفُّ فرعٍ لم يُنشأ بعد ليس أمرَ إخفاء",
  guardedAll.filter((i) => visible(i, null, FULL_PERMS)).map((i) => i.href).sort(),
  guardedAll.map((i) => i.href).sort());
same("هـ.٣ **ومفتاحٌ غيرُ مذكورٍ في الصفّ (`{}`) ليس `false`**",
  shownFor("showAccounting", {} as BranchVisibilitySettings, FULL_PERMS),
  hrefsOf("showAccounting"));

// ══ و. المسؤولُ العام خارجَ بوّابة العرض — كما كان ══════════════════════
console.log("\n── و. المسؤولُ العام لا تحكمه بوّابةُ العرض ──");
const accounting = KEYED.find((i) => i.settingKey === "showAccounting")!;
check(visible(accounting, { ...ALL_ON, showAccounting: false }, FULL_PERMS, true),
  "و.١ **المحاسبةُ تبقى ظاهرةً للمسؤول رغم إطفاء الخيار**");
check(!visible(accounting, { ...ALL_ON, showAccounting: false }, FULL_PERMS, false),
  "و.٢ **وتختفي عن غيره بالإعداد نفسِه** — الفرقُ هو `isAdmin` وحده");

// ══ ز. مخرجُ «إضافة المصاريف» لم يُمَسّ ═══════════════════════════════════
console.log("\n── ز. مخرجُ «إضافة المصاريف» على /accounting كما كان ──");
const expensesOnly = { ...NO_PERMS, canAddExpenses: true };
check(visible(accounting, ALL_ON, expensesOnly),
  "ز.١ **مَن يملك `canAddExpenses` وحدها يرى المحاسبة** (سلوكٌ قائم، بلا تغيير)");
check(!visible(accounting, { ...ALL_ON, showAccounting: false }, expensesOnly),
  "ز.٢ **وإطفاءُ الخيار يُخفيها عنه أيضاً** — العرضُ فوق المنحة لا تحتها");

// ══ ح. حارسٌ معماريّ — لا نسخةَ ثانية من القاعدة في Sidebar ═════════════
console.log("\n── ح. الشريطُ الجانبيّ ينادي الدالّة القانونية ولا ينسخها ──");
check(sidebarSrc.includes('from "./sidebar_section_visibility"'),
  "ح.١ **Sidebar.tsx يستورد الدالّة القانونية**");
check(sidebarSrc.includes("isSidebarItemVisible({"),
  "ح.٢ **ويناديها فعلاً في مُرشِّح العناصر**");
check(!/const\s+settingValue\s*=\s*branchSettings\[/.test(sidebarSrc),
  "ح.٣ **ولا نسخةَ ثانية من بوّابة العرض بقيت في المكوّن**");
check(sidebarSrc.includes("refetchInterval: 30_000"),
  "ح.٤ **وإعداداتُ الفرع تُجلَب دورياً كلَّ ٣٠ ثانية**");
check(sidebarSrc.includes('refetchOnWindowFocus: "always"'),
  "ح.٥ **وعند العودة إلى النافذة — «always» لا `true` التي يبتلعها `staleTime`**");
//  والفحصُ على **استعمالٍ حقيقيّ** لا على ذكرِ الاسم: تعليقٌ يقول «بلا
//  WebSocket» كان سيُسقط حارساً يبحث عن الكلمة المجرّدة — فيصير الحارسُ
//  يقيس نثراً لا كوداً (درسُ حارسِ `deleteSystemUser` في ٣٢٩).
check(!/new\s+WebSocket\s*\(|new\s+EventSource\s*\(|from\s+["']socket\.io/.test(sidebarSrc),
  "ح.٦ **وبلا WebSocket ولا مقبسٍ ولا بثّ** — استعلامٌ واحدٌ لا غير");

console.log(`\n${failures === 0 ? "✅ كل الاختبارات نجحت" : `❌ ${failures} فشل`}`);
process.exit(failures === 0 ? 0 : 1);
