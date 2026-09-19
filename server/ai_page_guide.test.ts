// أدلّةُ الشاشات: «بانتظار الحسم» (٤أ) و«معايناتي» (٤ب) — دليلان قائمان
// بذاتهما لا إطارٌ عامّ.
// قاعدة محلّية: `npm run test:ai-page-guide`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) الدليلُ يصل النموذج على `/post-exam-followups` **وفي الوضعين معاً**.
// (٢) **ولا يصل صفحةً أخرى** ولا بلا سياقِ صفحة.
// (٣) الصلاحيةُ من `canCompleteReceptionSale` القانونية وتسمياتُ أفعال مسار
//     المعاينة من `EXAM_PATH_ACTION_LABELS` — **لا قائمةَ أدوارٍ ولا تسمياتٍ
//     منسوخةً في ملفّ الدليل** (فحصٌ على المصدر).
// (٤) الأدوارُ الأربعة تُقرأ عبرها، **والطبيبُ بلا مسؤوليةٍ لا يُعَدّ بائعاً**.
// (٥) **ولا يُستنتَج وجودُ فعلٍ لصفٍّ بعينه** — أفعالُ مسار المعاينة مُحتمَلةٌ
//     يضعها الخادمُ في `actions` لكلّ صفّ، **ولا تلازمَ بينها**.
// (٦) والأدواتُ والصلاحياتُ لا تتغيّر.
// (٧) **و«معايناتي» دليلٌ ساكن**: مرشِّحُ الفرع فيه من **صفوف النقطة الكاملة**
//     (`branches` من `rows` قبل البحث والترشيح والتقطيع) لا من
//     `operationalBranches`، والاختصاصاتُ **لا تُشتقّ من الجلسة** — ودالّتُه
//     لا تأخذ `AiAccessContext` أصلاً (فحصٌ على المصدر وعلى التوقيع معاً).
// (٨) **ولا يدّعي ما لا يعرفه**: لا شمولَ («كلُّ حالةٍ نشطةٍ بلا معاينة» —
//     و`getWorklist()` أضيقُ من ذلك)، ولا هويّةً (الدليلُ يُحقَن لأدوارٍ
//     أخرى، فلا يقول عن قارئه إنه «هذا الطبيب»).

import { readFileSync } from "fs";
import { pool } from "./db";
import type * as provider from "./ai/provider";
import { aiChat } from "./ai/chat";
import { safeAiComplete } from "./ai/provider";
import { resolveAiAccess } from "./ai/access";
import { toolsFor } from "./ai/tools/registry";
import { resolvePageContext } from "./ai/page_context";
import { pageGuideFor, DECISION_QUEUE_PAGE_PATH, MY_EXAMS_PAGE_PATH } from "./ai/page_guides";
import { DEVICE_SERVICE_TYPES } from "@shared/prosthetic_parts";
import { specialtyLabel } from "@shared/medical";
import {
  canCompleteReceptionSale,
  EXAM_PATH_ACTIONS, EXAM_PATH_ACTION_LABELS,
} from "@shared/commercial";
import {
  DECISION_QUEUE_TAB_WAITING, DECISION_QUEUE_TAB_RESOLVED,
  DECISION_QUEUE_PAGE_SUBTITLE,
} from "@shared/decision_queue";

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const B = 9990, B2 = 9991;
const U = { rep: 9992, acc: 9993, mgr: 9994, adm: 9995, doc: 9996 };
const MARK = "اختبار-دليل-الشاشة";
const q = (t: string, v: any[] = []) => pool.query(t, v);
const ids = Object.values(U);

async function cleanup() {
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1)`, [ids]);
  await q(`DELETE FROM system_users WHERE id = ANY($1)`, [ids]);
  await q(`DELETE FROM branches WHERE id IN ($1,$2)`, [B, B2]);
}

const seen: { system: string; tools: string[] }[] = [];
const fakeStep = (async (p: any) => {
  seen.push({ system: p.system, tools: (p.tools ?? []).map((t: any) => t.name) });
  return { text: "انتهيت.", toolCalls: [], blocks: [] };
}) as unknown as typeof provider.aiToolStep;
const chat = (a: any, h: any, page: any) => aiChat(a, h, safeAiComplete, fakeStep, page);
const ask = (t: string) => [{ role: "user" as const, content: t }];
const GUIDE_MARK = "دليلُ هذه الشاشة";

async function main() {
  await cleanup();
  await q(`INSERT INTO branches (id,name) VALUES ($1,$2),($3,$4) ON CONFLICT (id) DO NOTHING`,
    [B, `كربلاء ${MARK}`, B2, `بغداد ${MARK}`]);
  for (const [k, id] of Object.entries(U)) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
             VALUES ($1,$2,'x',$3,'reception',$4,$5,'t') ON CONFLICT (id) DO NOTHING`,
      [id, `pg_${k}_${id}`, k, B, JSON.stringify([B])]);
  }

  const mk = (role: string, isAdmin: boolean, userId: number, perms: any = {}, branches = [B]) =>
    resolveAiAccess({
      session: {
        userId, role, isAdmin, branchId: B, accessibleBranches: branches,
        displayName: role, permissions: { canViewPatients: true, ...perms },
      },
      branchName: `كربلاء ${MARK}`, scopeBranchId: B,
    });

  const rep = mk("reception", false, U.rep);
  const acc = mk("accountant", false, U.acc);
  const mgr = mk("branch_manager", false, U.mgr);
  const adm = resolveAiAccess({
    session: {
      userId: U.adm, role: "admin", isAdmin: true, branchId: B, accessibleBranches: [B, B2],
      displayName: "adm", permissions: { canViewPatients: true, canManageAccounting: true },
    }, branchName: `كربلاء ${MARK}`, scopeBranchId: B,
  });
  const doc = mk("doctor", false, U.doc, { canWriteMedicalExam: true });

  const PAGE = resolvePageContext(DECISION_QUEUE_PAGE_PATH);
  same("أ.٠ المسارُ القانونيُّ للصفحة", PAGE?.path, DECISION_QUEUE_PAGE_PATH);

  // ═══ أ: يصل النموذج على هذه الصفحة، في الوضعين ════════════════════════
  console.log("\n── أ: الدليلُ يصل الوضعين على هذه الصفحة ──");
  seen.length = 0;
  await chat(rep, ask("شنو أسوي هنا؟"), PAGE);
  const repSys = seen[0].system;
  check(repSys.includes(GUIDE_MARK), "أ.١ **الدليلُ وصل (الوضع العامّ)**", repSys.slice(-900));
  check(repSys.includes(DECISION_QUEUE_PAGE_SUBTITLE), "أ.٢ وفيه غرضُ الشاشة");
  check(repSys.includes(DECISION_QUEUE_TAB_WAITING) && repSys.includes(DECISION_QUEUE_TAB_RESOLVED),
    "أ.٣ والتبويبان");
  check(/طرف صناعي/.test(repSys) && /مسند طبي/.test(repSys), "أ.٤ ومرشِّحُ التصنيف");
  check(/ضابطُ ترتيب/.test(repSys), "أ.٥ وضابطُ الترتيب");
  check(/فتح الملف/.test(repSys), "أ.٦ و«فتح الملف»");
  //  **التسمياتُ تُقارَن بالخريطة القانونية نفسِها** لا بنصٍّ مكتوبٍ هنا:
  //  فتغييرُ تسميةٍ في `shared/commercial.ts` يتبعه الاختبارُ والدليلُ معاً.
  for (const a of EXAM_PATH_ACTIONS) {
    check(repSys.includes(EXAM_PATH_ACTION_LABELS[a]),
      `أ.٧ وفعلُ مسار المعاينة «${EXAM_PATH_ACTION_LABELS[a]}»`);
  }
  //  **ولا تُوصَف ثابتةً ولا متلازمة**: يضعها الخادمُ في `actions` لكلّ صفّ.
  check(/أفعالٌ \*\*مُحتمَلة لا ثابتة\*\*/.test(repSys),
    "أ.٧ب **ويقول إنها مُحتمَلةٌ لا ثابتة**", repSys.slice(-1200));
  check(/لا يظهر منها إلّا ما يضعه الخادمُ/.test(repSys) && /actions/.test(repSys),
    "أ.٧ج ومشروطةٌ بما يضعه الخادمُ في `actions`");
  check(/ولا تلازمَ بينها/.test(repSys) && /فلا\s+تفترض أنها تظهر معاً/.test(repSys),
    "أ.٧د **ولا يُفهَم منها أنها تظهر معاً**");
  check(/اشترى/.test(repSys), "أ.٨ وزرُّ الصفّ الموروث");
  check(/إلغاء الحسم/.test(repSys), "أ.٩ و«إلغاء الحسم»");

  same("أ.١٠ والمسؤولُ في الوضع الماليّ", adm.mode, "financial");
  seen.length = 0;
  await chat(adm, ask("شنو أسوي هنا؟"), PAGE);
  check(seen[0].system.includes(GUIDE_MARK),
    "أ.١١ **والدليلُ يصل الوضعَ الماليَّ أيضاً**", seen[0].system.slice(-900));

  // ═══ ب: ولا يصل صفحةً أخرى ════════════════════════════════════════════
  console.log("\n── ب: صفحةٌ أخرى لا تأخذه ──");
  for (const other of ["/statistics", "/patients", "/manufacturing", "/accounting", "/"]) {
    seen.length = 0;
    await chat(rep, ask("شنو أسوي هنا؟"), resolvePageContext(other));
    check(!seen[0].system.includes(GUIDE_MARK), `ب.١ لا دليلَ على ${other}`, seen[0].system.slice(-400));
  }
  seen.length = 0;
  await chat(rep, ask("شنو أسوي هنا؟"), null);
  check(!seen[0].system.includes(GUIDE_MARK), "ب.٢ ولا بلا سياقِ صفحة");
  same("ب.٣ والدالّةُ نفسُها تُرجع فارغاً لغيرها",
    pageGuideFor(resolvePageContext("/statistics"), rep), "");

  // ═══ ج: الصلاحيةُ من الدالّة القانونية وحدها ══════════════════════════
  console.log("\n── ج: canCompleteReceptionSale هي المرجع ──");
  const src = readFileSync(new URL("./ai/page_guides.ts", import.meta.url), "utf8");
  check(/canCompleteReceptionSale/.test(src) && /from "@shared\/commercial"/.test(src),
    "ج.١ **الدليلُ يستورد الدالّة القانونية**");
  //  **ولا قائمةَ أدوارٍ ثانية**: لا أسماءَ أدوارٍ مكتوبةً في الملفّ.
  check(!/"reception"|'reception'|"accountant"|'accountant'|"branch_manager"|'branch_manager'/.test(src),
    "ج.٢ **ولا قائمةَ أدوارٍ منسوخةً فيه إطلاقاً**",
    (src.match(/["'](reception|accountant|branch_manager)["']/g) ?? []).join(","));
  //  **ولا تسمياتِ أفعالٍ منسوخة**: تُبنى من `EXAM_PATH_ACTION_LABELS`.
  check(/EXAM_PATH_ACTION_LABELS/.test(src) && /EXAM_PATH_ACTIONS/.test(src),
    "ج.٢ب **والدليلُ يستورد خريطةَ التسميات القانونية**");
  //  «إتمام البيع» تسميةُ مسار معاينةٍ حصراً (لا وجودَ لها في الموروث)،
  //  فغيابُها من المصدر يُثبت أنها ليست مكتوبةً بيدٍ هنا.
  //  الفحصُ على **الشيفرة** لا التعليقات: التعليقُ يضرب مثلاً بسؤال الموظّف،
  //  والممنوعُ أن تُكتب التسميةُ في النصّ المُرسَل للنموذج.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
  check(!code.includes(EXAM_PATH_ACTION_LABELS.complete_sale),
    "ج.٢ج **ولا تسميةَ مسارِ معاينةٍ مكتوبةً حرفياً في شيفرة الدليل**",
    code.split("\n").filter((l) => l.includes(EXAM_PATH_ACTION_LABELS.complete_sale)).join(" | "));

  for (const [name, a] of [["استقبال", rep], ["محاسب", acc], ["مدير فرع", mgr], ["مسؤول", adm]] as const) {
    const g = pageGuideFor(PAGE, a);
    same(`ج.٣ ${name}: الدليلُ يوافق الدالّة القانونية`,
      /\*\*يملكها\*\*/.test(g), canCompleteReceptionSale(a as any));
    check(/\*\*يملكها\*\*/.test(g), `ج.٣ب و${name} يملكها فعلاً`);
  }
  //  **والطبيبُ بلا صفةِ مسؤول ليس بائعاً** — لا في الدالّة ولا في الدليل.
  same("ج.٤ **الطبيبُ لا يملكها في الدالّة القانونية**", canCompleteReceptionSale(doc as any), false);
  const docGuide = pageGuideFor(PAGE, doc);
  check(/\*\*لا يملكها\*\*/.test(docGuide), "ج.٥ **والدليلُ يقول ذلك له**", docGuide.slice(-500));
  check(/الطبيبُ بلا صفةِ مسؤولٍ عامّ ليس منهم/.test(docGuide), "ج.٦ ويسمّي الحالةَ صراحةً");

  // ═══ د: مرشِّحُ الفرع يتبع النطاق الفعليّ — **والحالاتُ الأربع متمايزة** ══
  //  `operationalBranches`: `null` = كلّ الفروع · `[]` = **لا فرعَ إطلاقاً** ·
  //  `[x]` = فرعٌ واحد · `[x,y]` = أكثر. وصفرُ فروعٍ **ليس** فرعاً واحداً:
  //  كان الدليلُ يقرؤهما سواءً فيشرح الإخفاءَ بسببٍ كاذب.
  console.log("\n── د: مرشِّحُ الفرع ──");
  const ONE_BRANCH_NOTE = "**لا يظهر له** — لأنّ نطاقه فرعٌ واحد؛ وهذا ليس نقصَ صلاحية.";
  const NO_BRANCH_NOTE = "**لا يظهر له** — لا يوجد فرع في نطاق العمل المسند إليه.";
  const VISIBLE_NOTE = "**يظهر له** — لأنّ نطاقه أكثرُ من فرع.";

  const repGuide = pageGuideFor(PAGE, rep);
  same("د.١أ **ونطاقُ الموظّف فرعٌ واحد فعلاً**", rep.operationalBranches, [B]);
  check(repGuide.includes(ONE_BRANCH_NOTE),
    "د.١ فرعٌ واحد ⟶ لا يظهر، **وليس نقصَ صلاحية**", repGuide.slice(0, 600));
  check(!repGuide.includes(NO_BRANCH_NOTE),
    "د.١ب **ولا يُقال له إنه بلا فرع**");

  check(pageGuideFor(PAGE, adm).includes(VISIBLE_NOTE), "د.٢ والمسؤولُ يظهر له");
  const multi = mk("reception", false, U.rep, {}, [B, B2]);
  same("د.٣أ **ونطاقُه فرعان فعلاً**", multi.operationalBranches, [B, B2]);
  check(pageGuideFor(PAGE, multi).includes(VISIBLE_NOTE), "د.٣ ومتعدّدُ الفروع كذلك");

  //  ── صفرُ فروع: حسابٌ بلا `branch_ids` ولا `branch_id` (العمودان nullable) ──
  //  **و`mk` لا تصلح هنا**: تمرّر `branchId: B` فيلتقطه احتياطُ
  //  `operationalBranchesOf` ويصير النطاقُ `[B]` — فيمرّ الاختبارُ للسبب الخطأ.
  const zero = resolveAiAccess({
    session: {
      userId: U.rep, role: "reception", isAdmin: false, branchId: null,
      accessibleBranches: [], displayName: "بلا فرع", permissions: { canViewPatients: true },
    },
    branchName: null, scopeBranchId: null,
  });
  same("د.٤أ **والنطاقُ مصفوفةٌ فارغة فعلاً**", zero.operationalBranches, []);
  const zeroGuide = pageGuideFor(PAGE, zero);
  check(zeroGuide.includes(NO_BRANCH_NOTE),
    "د.٤ **صفرُ فروعٍ ⟶ سببُه هو، لا «فرعٌ واحد»**", zeroGuide.slice(0, 600));
  check(!zeroGuide.includes(ONE_BRANCH_NOTE),
    "د.٤ب **ولا يُقال له «نطاقه فرعٌ واحد»** — وهو العطبُ بعينه");
  check(!zeroGuide.includes(VISIBLE_NOTE), "د.٤ج ولا يُقال إن المرشِّح يظهر له");

  //  ── `null` = كلّ الفروع — **والمسؤولُ هو مَن يُنتجها فعلاً** ──────────
  //  `operationalBranchesOf` تُرجع `null` للمسؤول وحده؛ وغيرُ المسؤول
  //  بـ`accessibleBranches: null` يسقط إلى احتياط `branchId` فيصير `[B]`.
  //  فكانت حالةُ `null` تُبنى بجلسةٍ لا تُنتجها، ويمرّ التأكيدُ على `||`
  //  يصدُق كلّما **لم** تكن `null` — فلا يفحص شيئاً. فصار المرجعُ `adm`.
  same("د.٥أ **ونطاقُ المسؤول `null` فعلاً** — كلّ الفروع",
    adm.operationalBranches, null);
  check(pageGuideFor(PAGE, adm).includes(VISIBLE_NOTE),
    "د.٥ و`null`/كلّ الفروع ⟶ المرشِّحُ يظهر", pageGuideFor(PAGE, adm).slice(0, 600));

  // ═══ هـ: لا يُستنتَج وجودُ زرٍّ لصفٍّ بعينه ═════════════════════════════
  console.log("\n── هـ: حالةُ الصفّ ليست عنده ──");
  const g = pageGuideFor(PAGE, rep);
  check(/لا تُثبت/.test(g) && /زرّاً بعينه/.test(g),
    "هـ.١ **الصلاحيةُ لا تُثبت وجودَ زرّ**", g.slice(-700));
  check(/examPath/.test(g) && /actions/.test(g) && /mayCancelDecision/.test(g),
    "هـ.٢ **ويسمّي ما يقرّره الخادمُ لكلّ صفّ**", g.slice(-700));
  check(/ليست عندك في هذه المرحلة/.test(g), "هـ.٣ ويقول إن القيمَ الحيّة ليست عنده");
  //  النصُّ ملفوفٌ على أسطر، فيُسوَّى الفراغُ قبل المطابقة.
  const flat = g.replace(/\s+/g, " ");
  check(flat.includes("لا تجزم بوجود زرٍّ ولا بغيابه"),
    "هـ.٤ **وينهى عن الجزم في الاتجاهين**", flat.slice(-300));
  check(flat.includes("لا تستطيع تحديدَ سبب هذا الصفّ بعينه بلا حالته الحيّة"),
    "هـ.٥ **ويُلزمه بقول ذلك صراحةً عند السؤال**", flat.slice(-400));

  // ═══ ز: دليلُ «معايناتي» (٤ب) — ساكنٌ لا يقرأ صفّاً ولا جلسة ═══════════
  console.log("\n── ز: دليلُ «معايناتي» ──");
  const MY = resolvePageContext(MY_EXAMS_PAGE_PATH);
  same("ز.٠ المسارُ القانونيُّ للصفحة", MY?.path, MY_EXAMS_PAGE_PATH);
  same("ز.٠أ وتسميتُه العربية", MY?.label, "معايناتي");

  seen.length = 0;
  await chat(doc, ask("شنو أسوي هنا؟"), MY);
  const mySys = seen[0].system;
  check(mySys.includes(GUIDE_MARK), "ز.١ **الدليلُ يصل الطبيبَ على هذه الصفحة**", mySys.slice(-900));
  check(mySys.includes("«معايناتي»"), "ز.١أ وباسم الشاشة");
  //  **ويصل الوضعَ الماليَّ كذلك** — الدليلُ ملاحةٌ لا سلطة.
  seen.length = 0;
  await chat(adm, ask("شنو أسوي هنا؟"), MY);
  check(seen[0].system.includes(GUIDE_MARK), "ز.١ب ويصل الوضعَ الماليَّ أيضاً");

  const my = pageGuideFor(MY, doc);
  const myFlat = my.replace(/\s+/g, " ");

  //  ① الغرضُ والضوابطُ العامّة.
  check(/\*\*قائمةُ عمل الطبيب — الحسابِ المخوَّل طبّياً\*\*/.test(my),
    "ز.٢ **الغرض: قائمةُ عمل الحساب المخوَّل طبّياً**", my.slice(0, 700));
  check(/الصفوفُ التي تُرجعها `GET \/api\/medical\/worklist` في اختصاصاته، مجمَّعةً\s+بالاختصاص/.test(my),
    "ز.٢أ **وهي صفوفُ النقطة مجمَّعةً بالاختصاص**");
  //  ⚠ **ولا يدّعي شمولاً**: `getWorklist()` تشترط ما هو أكثر من «حالةٌ
  //  نشطةٌ بلا معاينة» (المسارُ `no_exam` يخرج · والمريضُ القديم يخرج ·
  //  والخيطُ بلا حلقةٍ في حقبة المسار يخرج). فوصفُ كلّ حالةٍ نشطةٍ بلا
  //  معاينةٍ بأنها هنا **خطأ**.
  check(!/صفٌّ لكلّ\s*حالةٍ نشطةٍ بلا معاينةٍ موقّعة/.test(my),
    "ز.٢ب **ولا يقول «صفٌّ لكلّ حالةٍ نشطةٍ بلا معاينة»**");
  check(/شروطُ الأهليّة يحسمها الخادمُ وحده/.test(my)
    && /لا تفترض\s+أن كلَّ حالةٍ نشطةٍ بلا معاينةٍ موقّعة موجودةٌ في هذه القائمة/.test(my),
    "ز.٢ج **بل ينفي الشمولَ صراحةً ويُحيل الأهليّةَ إلى الخادم**");
  //  ⚠ **ولا يجزم أن قارئَه طبيب** — الدليلُ يُحقَن لأدوارٍ أخرى أيضاً
  //  (مُثبَتٌ في ز.١٧أ/ز.١٧ب: نصُّه هو هو للمسؤول وللاستقبال).
  check(!/هذا الطبيب/.test(my), "ز.٢د **ولا يسمّي المستخدمَ الحاليَّ «هذا الطبيب»**");
  check(/\*\*ولا تجزم أن\s+قارئَ هذا الدليل هو صاحبُها\*\*/.test(my),
    "ز.٢هـ **بل ينهى عن ذلك صراحةً**");
  check(/الأحدث أولاً/.test(my) && /الأقدم أولاً/.test(my), "ز.٣ وضابطُ الترتيب بالاتجاهين");
  check(/بحثٌ\*\* باسم المريض أو رقم الهاتف/.test(my), "ز.٤ والبحثُ باسمٍ أو هاتف");
  for (const n of ["١٠", "٥٠", "١٠٠"]) {
    check(myFlat.includes(n), `ز.٥ وحجمُ الصفحة ${n}`);
  }

  //  ② مرشِّحُ الاختصاص — **بالعدد المُرجَع لا بالجلسة**.
  check(/مرشِّحُ الاختصاص/.test(my) && /أكثرَ من اختصاصٍ واحد/.test(my),
    "ز.٦ **مرشِّحُ الاختصاص: أكثرُ من واحدٍ فقط**", my.slice(0, 900));
  check(/تُرجع النقطةُ/.test(my), "ز.٦أ **ومصدرُه ما ترجعه النقطة**");
  //  ⚠ **ثلاثُ حالاتٍ في الشاشة لا حالتان** (`MyExams.tsx`):
  //    `> 1` ⟵ المرشِّحُ يظهر (٣٢٠) · `=== 1` ⟵ يغيب والقائمةُ كالمعتاد ·
  //    `=== 0` ⟵ يغيب **وتُستبدَل الشاشةُ كلُّها** برسالة «بلا اختصاص» (٣٨٠).
  //  فالنفيُ المُطلَق «غيابُه ليس نقصَ صلاحية» يبتلع الثالثةَ في الثانية.
  check(/اختصاصاً واحداً\*\* ⟵ \*\*يغيب، وهذا هو الوضعُ الطبيعيّ\*\*/.test(my)
    && /لا يحتاج مُنتقياً، \*\*ولا نقصَ صلاحيةٍ هنا\*\*/.test(my),
    "ز.٦ب **واختصاصٌ واحد: يغيب وهذا طبيعيّ**", my.slice(0, 1100));
  check(/صفرَ اختصاصات\*\* ⟵ يغيب كذلك، \*\*وليست حالةً طبيعية\*\*/.test(my)
    && /\*\*وهي تحتاج تدخّلاً إدارياً\*\*/.test(my),
    "ز.٦ج **وصفرُ اختصاصاتٍ حالةٌ أخرى تحتاج تدخّلاً إدارياً**");
  check(!/غيابُه ليس نقصَ صلاحية/.test(my),
    "ز.٦د **ولا نفيَ مُطلَقاً لنقص الصلاحية عند الغياب**");
  check(/غيابُ المرشِّح وحدَه \*\*لا يفرّق\*\* بين الحالتين الأخيرتين/.test(my),
    "ز.٦هـ **بل يقول إن الغيابَ وحدَه لا يفرّق بينهما**");

  //  ③ **مرشِّحُ الفرع من الصفوف لا من النطاق** — الفرقُ الجوهريّ عن ٤أ.
  check(/تحمل صفوفُ قائمة العمل الكاملة التي ترجعها\s+`GET \/api\/medical\/worklist` أكثرَ من فرعٍ واحد/.test(my),
    "ز.٧ **مرشِّحُ الفرع: من صفوف النقطة الكاملة**", my.slice(0, 1600));
  //  **والدقّةُ هنا في «الكاملة»**: `branches` في `MyExams.tsx` مشتقّةٌ من
  //  `rows` — استجابةُ النقطة كما هي — **قبل** `filtered` و`pageRows`. فقولُ
  //  «الصفوف المعروضة الآن» يعكس الجواب: بحثٌ يضيّق المعروضَ إلى فرعٍ واحد
  //  **لا يُخفي** المرشِّح.
  check(/وتُقرأ فروعُها \*\*قبل\*\*\s+البحثِ ومرشِّحِ الاختصاص ومرشِّحِ الفرع نفسِه والتقطيعِ إلى صفحات/.test(my),
    "ز.٧هـ **وقبل البحثِ والترشيحِ والتقطيع صراحةً**");
  check(/ترشيحٌ يضيّق المعروضَ إلى فرعٍ واحد \*\*لا يُخفي المرشِّح\*\*/.test(my),
    "ز.٧و **ويقول أثرَ ذلك: الترشيحُ لا يُخفيه**");
  check(!/المعروضة الآن/.test(my), "ز.٧ز **ولا يقول «المعروضة الآن» إطلاقاً**");
  check(/مشتقٌّ من صفوف النقطة لا من نطاق عمل المستخدم/.test(my),
    "ز.٧أ **ويقول صراحةً إنه ليس من نطاق العمل**");
  check(/لا ينتظره أحدٌ إلّا في فرعٍ واحد \*\*لا يرى هذا المرشِّح\*\*/.test(my),
    "ز.٧ب **ويضرب الحالةَ التي تفرّقهما**");
  //  **ولا لفظَ `operationalBranches` ولا صياغةَ ٤أ في دليل «معايناتي»**.
  check(!/operationalBranches/.test(my), "ز.٧ج **ولا يذكر `operationalBranches` إطلاقاً**");
  for (const note of [
    "**يظهر له** — لأنّ نطاقه أكثرُ من فرع.",
    "**لا يظهر له** — لأنّ نطاقه فرعٌ واحد؛ وهذا ليس نقصَ صلاحية.",
    "**لا يظهر له** — لا يوجد فرع في نطاق العمل المسند إليه.",
  ]) {
    check(!my.includes(note), "ز.٧د **ولا يستعير حُكمَ «بانتظار الحسم»**", note);
  }

  //  ④ رسالةُ صفرِ الاختصاصات — **نصُّ الشاشة بحرفه**.
  check(my.includes("لا يوجد اختصاص مسجَّل لحسابك — راجع المدير العام لتحديد اختصاصك."),
    "ز.٨ **ورسالةُ «بلا اختصاص» كما تقولها الشاشةُ حرفاً**");

  //  ⑤ أفعالُ الصفّ وشروطُها.
  check(/«الملف» و«كتابة معاينة» — \*\*على كلّ صفٍّ/.test(my),
    "ز.٩ **«الملف» و«كتابة معاينة» على كلّ صفّ**");
  check(/«إرجاع للاستعلامات»/.test(my) && /returnableRequestId/.test(my),
    "ز.١٠ **و«إرجاع للاستعلامات» مشروطٌ بـ`returnableRequestId`**");
  check(/لا يرسله لمن أنشأ الطلبَ\s+بنفسه/.test(my), "ز.١٠أ ويشرح لماذا قد يغيب");
  check(/«إلغاء المعاينة»/.test(my), "ز.١١ **و«إلغاء المعاينة» مذكور**");
  //  **واختصاصاتُ الأجهزة من المصدر القانونيّ** لا من نصٍّ منسوخ.
  for (const kind of DEVICE_SERVICE_TYPES) {
    check(my.includes(specialtyLabel(kind)), `ز.١١أ ومقصورٌ على «${specialtyLabel(kind)}»`);
  }
  check(!my.includes(specialtyLabel("physiotherapy")) || /العلاجُ\s+الطبيعي بلا حلقاتِ أجهزة/.test(my),
    "ز.١١ب **والعلاجُ الطبيعي مستثنىً بسببه**");
  check(/كلاهما يطلب سبباً مكتوباً/.test(my) && /معطَّلٌ/.test(my),
    "ز.١٢ **والإرجاعُ والإلغاءُ يطلبان سبباً**");

  //  ⑥ ما يُعرَض على الصفّ.
  check(/عاد للشراء/.test(my) && /return_to_purchase/.test(my),
    "ز.١٣ **وشارةُ «عاد للشراء» مشروطةٌ بـ`reviewKind`**");
  check(/\*\*لا\*\* أن مالاً قُبض/.test(my), "ز.١٣أ **ولا تعني أن مالاً قُبض**");
  check(/هويّةُ الجهاز/.test(my) && /episodeId/.test(my),
    "ز.١٤ **وهويّةُ الجهاز مشروطةٌ بـ`episodeId`**");
  check(/يظهر \*\*مرّتين\*\*/.test(my), "ز.١٤أ ومريضٌ بجهازين يظهر مرّتين");

  //  ⑦ بطاقةُ المشتريات — لا تظهر بلا صفوف، وللعلم فقط.
  check(/مرضاي الذين اشتروا مؤخراً/.test(my), "ز.١٥ **وبطاقةُ المشتريات مذكورة**");
  check(/لا تظهر إطلاقاً حين\s+لا صفوفَ لها/.test(my), "ز.١٥أ **ولا تظهر بلا صفوف**");
  check(/للعلم فقط/.test(my) && /لا إجراءَ مطلوبٌ من الطبيب/.test(my),
    "ز.١٥ب **وللعلم فقط لا إجراء**");

  //  ⑧ **ولا جزمَ بحالةِ شاشةٍ حيّة** — نفسُ ثابت ٤أ.
  check(/لا تجزم بوجود زرٍّ ولا بغيابه/.test(my), "ز.١٦ **وينهى عن الجزم في الاتجاهين**");
  check(/لا تستطيع الجزمَ\s+بحالة شاشته الآن/.test(my), "ز.١٦أ **ويُلزمه بقولها صراحةً**");

  //  ⑨ **والدليلُ لا يتغيّر بتغيّر الجلسة** — لأنه لا يقرؤها أصلاً.
  const multiMy = mk("doctor", false, U.doc, { canWriteMedicalExam: true }, [B, B2]);
  same("ز.١٧ **نصُّ الدليل هو هو لطبيبٍ بفرعين**", pageGuideFor(MY, multiMy), my);
  same("ز.١٧أ وللمسؤول العامّ كذلك", pageGuideFor(MY, adm), my);
  same("ز.١٧ب وللاستقبال كذلك", pageGuideFor(MY, rep), my);
  //  **وتوقيعُ الدالّة نفسُه** لا يأخذ `AiAccessContext` — منعٌ بنيويّ.
  check(/function myExamsGuide\(label: string\): string/.test(src),
    "ز.١٧ج **و`myExamsGuide` لا تأخذ `access` أصلاً**");

  //  ⑩ **وصفحةُ ٤أ لم تتغيّر بحرف**.
  check(!pageGuideFor(PAGE, rep).includes("معايناتي"),
    "ز.١٨ **ودليلُ «بانتظار الحسم» لا يتلوّث بالآخر**");
  check(repGuide === pageGuideFor(PAGE, rep), "ز.١٨أ وهو هو كما قُرئ أوّلاً");

  // ═══ و: لا سلطةَ ولا أدواتٍ تتغيّر ═════════════════════════════════════
  console.log("\n── و: صفرُ أثرٍ على الأدوات والصلاحيات ──");
  const base = toolsFor(rep).map((t: any) => t.name).sort();
  seen.length = 0;
  await chat(rep, ask("افتح لي إتمام البيع"), PAGE);
  same("و.١ **الأدواتُ لا تتغيّر بدليل الشاشة**", seen[0].tools.sort(), base);
  check(!seen[0].tools.includes("financial_summary"),
    "و.٢ ولا أداةَ مالية لموظّفٍ عامّ", JSON.stringify(seen[0].tools));
  const docBase = toolsFor(doc).map((t: any) => t.name).sort();
  seen.length = 0;
  await chat(doc, ask("شنو أسوي هنا؟"), PAGE);
  same("و.٣ وكذلك للطبيب", seen[0].tools.sort(), docBase);
  //  ولا قاعدةَ بياناتٍ تُقرأ في بناء الدليل.
  check(!/db\.|storage\.|pool\.|SELECT/i.test(src),
    "و.٤ **ولا استعلامَ قاعدةٍ في ملفّ الدليل إطلاقاً**");
  check(!/document|window|innerText|querySelector/.test(src),
    "و.٥ **ولا قراءةَ DOM**");

  await cleanup();
  console.log(failures === 0 ? "\n✅ كل الفحوص نجحت" : `\n❌ ${failures} حالة فاشلة`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error(e); await cleanup(); await pool.end(); process.exit(1); });
