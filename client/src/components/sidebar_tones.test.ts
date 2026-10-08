// `npm run test:sidebar-tones` — **كلُّ فقرةٍ في الشريط لها لونُ مجالها** (طلبُ المالك ٢٠٢٦-١٠-٠٨، §4.cs).
// فقرةٌ تُضاف بلا قرارٍ في `sidebar_tones.ts` تأخذ الرماديّ صامتةً — فهذا يُفشلها حتى يُختار لها لون.
import fs from "fs";
import path from "path";
import { SIDEBAR_TONED_HREFS, sidebarToneOf } from "./sidebar_tones";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}

const here = path.dirname(new URL(import.meta.url).pathname);
const src = fs.readFileSync(path.join(here, "Sidebar.tsx"), "utf8");
const hrefs = [...new Set([...src.matchAll(/\bhref: "([^"]+)"/g)].map((m) => m[1]))];
check(hrefs.length >= 30, `أ. قُرئت فقراتُ الشريط من مصدرها (${hrefs.length})`);
const missing = hrefs.filter((h) => !SIDEBAR_TONED_HREFS.includes(h));
check(missing.length === 0, "ب. **كلُّ فقرةٍ لها لونٌ مختار** — لا رماديَّ صامتاً", `بلا لون: ${missing.join("، ")}`);
const stale = SIDEBAR_TONED_HREFS.filter((h) => !hrefs.includes(h));
check(stale.length === 0, "ج. ولا لونَ لفقرةٍ لم تعد في الشريط", `زائد: ${stale.join("، ")}`);
const t = sidebarToneOf("/patients");
check(/^bg-\w+-100 ring-\w+-200$/.test(t.tile) && /^text-\w+-\d00$/.test(t.icon) && /^bg-\w+-600 ring-\w+-600$/.test(t.active)
  && /^bg-\w+-50 text-\w+-700$/.test(t.row),
  "د. الأصنافُ مكتوبةٌ بحرفها (يراها Tailwind)", JSON.stringify(t));
check(sidebarToneOf("/لا-مسار").icon === "text-slate-600", "هـ. ومسارٌ مجهول ⟵ الرماديّ لا خطأ");

console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
process.exit(failures ? 1 : 0);
