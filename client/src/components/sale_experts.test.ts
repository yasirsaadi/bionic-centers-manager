//  قائمةُ خبراء البيع — منطقٌ خالص وعقدُ الشاشات، بلا قاعدة بيانات.
//  `npm run test:sale-experts`.
//
//  ══ ما يحرسه (شكوى «زهراء»، ٢٠٢٦-٠٩-٢٤) ═════════════════════════════════
//  (١) القائمةُ تُطلب **بالمريض** لا بفرع المتابعة — ففرعٌ أُتيح له الملفُّ
//      يرى خبراءه، والمسؤولُ يرى خبراءَ فروع الملفّ كلِّها (ومنهم أيوب).
//  (٢) **والفشلُ يُقال لا يُبتلَع**: `if (!res.ok) return []` هو ما جعل
//      القائمةَ فارغةً بلا سبب — فالمجلبُ يرمي برسالة الخادم.
//  (٣) الفرعُ يُكتب بجانب الاسم **حين تمتدّ القائمةُ على أكثر من فرع** —
//      وإلّا فالاسمُ وحده كما كان.
//  (٤) والشاشاتُ الثلاث (بطاقةُ المريض · «إتمام البيع» · «اشترى») تستورد
//      الدوالَّ نفسَها بالمفتاح نفسِه — فلا تنحرف واحدةٌ عن أختيها.

import {
  saleExpertsQueryKey, saleExpertsUrl, spansSeveralBranches, saleExpertLabel,
  fetchSaleExperts, NO_SALE_EXPERTS, type SaleExpert,
} from "./sale_experts";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const ayoub: SaleExpert = { id: 7, displayName: "أيوب", branchIds: [2], branchNames: ["بغداد"] };
const anad: SaleExpert = { id: 3, displayName: "عناد", branchIds: [1], branchNames: ["ذي قار"] };
const both: SaleExpert = {
  id: 9, displayName: "خبير الفرعين", branchIds: [1, 2], branchNames: ["ذي قار", "بغداد"],
};

async function main() {
  console.log("\n── أ. المفتاحُ والرابط ──");
  same("أ١. المفتاحُ يحمل المريض — فلا تُعرَض قائمةُ مريضٍ على آخر",
    saleExpertsQueryKey(42), ["/api/manufacturing/experts", "patient", 42]);
  check(JSON.stringify(saleExpertsQueryKey(42)) !== JSON.stringify(saleExpertsQueryKey(43)),
    "أ٢. ومريضان ⟵ مفتاحان");
  same("أ٣. الرابطُ بالمريض لا بالفرع", saleExpertsUrl(42), "/api/manufacturing/experts?patientId=42");

  console.log("\n── ب. الفرعُ بجانب الاسم حين تمتدّ القائمة ──");
  check(!spansSeveralBranches([anad]), "ب١. فرعٌ واحد ⟵ لا تُكتب الفروع");
  check(!spansSeveralBranches([]), "ب٢. قائمةٌ فارغة ⟵ لا تُكتب");
  check(spansSeveralBranches([anad, ayoub]), "ب٣. فرعان ⟵ تُكتب");
  check(spansSeveralBranches([both]), "ب٤. خبيرٌ واحد في فرعين ⟵ تُكتب");
  same("ب٥. **«أيوب — بغداد»** حين تمتدّ", saleExpertLabel(ayoub, true), "أيوب — بغداد");
  same("ب٦. والاسمُ وحده حين لا تمتدّ — كما كان", saleExpertLabel(ayoub, false), "أيوب");
  same("ب٧. وخبيرُ الفرعين بفرعيه", saleExpertLabel(both, true), "خبير الفرعين — ذي قار، بغداد");
  same("ب٨. وبلا أسماءِ فروع ⟵ الاسمُ وحده (لا شرطةٌ عارية)",
    saleExpertLabel({ id: 1, displayName: "س", branchNames: ["", "  "] }, true), "س");
  check(NO_SALE_EXPERTS.includes("فروع هذا المريض"),
    "ب٩. ونصُّ القائمة الفارغة يقول أين بحث — لا «لا يوجد خبير في هذا الفرع»");

  console.log("\n── ج. المجلب: الفشلُ يُقال لا يُبتلَع ──");
  const realFetch = globalThis.fetch;
  try {
    (globalThis as any).fetch = async () =>
      new Response(JSON.stringify([ayoub, anad]), { status: 200 });
    same("ج١. ردٌّ ناجح ⟵ القائمةُ كما هي", (await fetchSaleExperts(1)).map((e) => e.id), [7, 3]);
    (globalThis as any).fetch = async () =>
      new Response(JSON.stringify({ error: "غير مصرح لك بهذا الفرع" }), { status: 403 });
    let msg = "";
    try { await fetchSaleExperts(1); } catch (e: any) { msg = e?.message ?? ""; }
    same("ج٢. **ردٌّ مرفوض ⟵ يُرمى برسالة الخادم** — لا قائمةٌ فارغة بصمت",
      msg, "غير مصرح لك بهذا الفرع");
    (globalThis as any).fetch = async () => new Response("", { status: 500 });
    msg = "";
    try { await fetchSaleExperts(1); } catch (e: any) { msg = e?.message ?? ""; }
    same("ج٣. وردٌّ بلا جسم ⟵ رسالةٌ عامّة تُقال", msg, "تعذّر تحميل قائمة الخبراء");
    (globalThis as any).fetch = async () =>
      new Response(JSON.stringify({ unexpected: true }), { status: 200 });
    same("ج٤. وجسمٌ غيرُ مصفوفة ⟵ قائمةٌ فارغة لا انهيار", await fetchSaleExperts(1), []);
  } finally {
    globalThis.fetch = realFetch;
  }

  console.log("\n── د. عقدُ الشاشات الثلاث ──");
  const here = dirname(fileURLToPath(import.meta.url));
  const strip = (src: string) => src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "");
  const read = (f: string) => strip(readFileSync(join(here, f), "utf8"));
  for (const f of ["ExamPathDecisionActions.tsx", "LegacyDecisionActions.tsx", "PostExamDecisionCard.tsx"]) {
    const src = read(f);
    check(src.includes('from "@/components/sale_experts"'),
      `د. ${f}: يستورد \`sale_experts\` — لا نسخةَ ثانية`);
    check(/queryKey:\s*saleExpertsQueryKey\(patientId\)/.test(src)
      && /queryFn:\s*\(\)\s*=>\s*fetchSaleExperts\(patientId\)/.test(src),
      `د. ${f}: **القائمةُ بالمريض** بالمفتاح والمجلب المشتركين`);
    check(!/\/api\/manufacturing\/experts\?branchId=/.test(src),
      `د. ${f}: **ولا طلبَ خبراءٍ بفرع المتابعة بعد اليوم** (سببُ القائمة الفارغة)`);
    //  **الجلبُ نفسُه لا يُكتب في الشاشة** — يعيش في `fetchSaleExperts` وحدها،
    //  فلا يعود `if (!res.ok) return []` يبتلع ردّاً مرفوضاً في أيّ منها.
    check(!/fetch\(\s*[`"']\/api\/manufacturing\/experts/.test(src),
      `د. ${f}: ولا جلبَ خبراءٍ مكتوبٌ في الشاشة (فلا ابتلاعَ صامتٌ للفشل)`);
    check(/saleExpertLabel\(e,\s*showExpertBranches\)/.test(src),
      `د. ${f}: والعنوانُ من الدالّة المشتركة (الفرعُ حين تمتدّ القائمة)`);
    check(/expertsError/.test(src), `د. ${f}: والفشلُ يُعرَض في النافذة`);
  }

  console.log(failures === 0 ? "\n✅ كل فحوص قائمة خبراء البيع نجحت" : `\n❌ ${failures} فشل`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
