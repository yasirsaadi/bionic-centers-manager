// دليلُ شاشة «بانتظار الحسم» (المرحلة ٤أ) — صفحةٌ واحدة لا إطارٌ عامّ.
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

import { readFileSync } from "fs";
import { pool } from "./db";
import type * as provider from "./ai/provider";
import { aiChat } from "./ai/chat";
import { safeAiComplete } from "./ai/provider";
import { resolveAiAccess } from "./ai/access";
import { toolsFor } from "./ai/tools/registry";
import { resolvePageContext } from "./ai/page_context";
import { pageGuideFor, DECISION_QUEUE_PAGE_PATH } from "./ai/page_guides";
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

  // ═══ د: مرشِّحُ الفرع يتبع النطاق الفعليّ ══════════════════════════════
  console.log("\n── د: مرشِّحُ الفرع ──");
  check(/\*\*لا يظهر له\*\*/.test(pageGuideFor(PAGE, rep)),
    "د.١ فرعٌ واحد ⟶ لا يظهر، **وليس نقصَ صلاحية**");
  check(/\*\*يظهر له\*\*/.test(pageGuideFor(PAGE, adm)), "د.٢ والمسؤولُ يظهر له");
  const multi = mk("reception", false, U.rep, {}, [B, B2]);
  check(/\*\*يظهر له\*\*/.test(pageGuideFor(PAGE, multi)), "د.٣ ومتعدّدُ الفروع كذلك");

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
