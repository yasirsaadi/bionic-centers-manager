// أدلّةُ الشاشات: «بانتظار الحسم» (٤أ) · «معايناتي» (٤ب) · «مراجعة حركة
// مرضى الأطراف والمساند» (٤ج) — أدلّةٌ قائمةٌ بذاتها لا إطارٌ عامّ.
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
// (٩) **و«مراجعة الحركة» قسمان لا قسمٌ واحد**: صفوفُها الرئيسية طابورُ
//     المراجعة السريعة (`pending` + `quick`)، وقسمُ `awaitingFull` طلباتٌ لم
//     تقع معاينتُها بعد. وما يستوجب المسارَ الكامل (`requiresFullPath`) لا
//     يُعرَض سبباً لبطاقةٍ سريعة.
// (٩أ) **والمراجعةُ السريعة إشرافيةٌ لا بوّابةُ إذن** — ولا يُجزَم أن خدمةَ
//     صفٍّ سريعٍ بعينه وقعت: نقطةُ الإنشاء تقبله **بلا مرساة** (`workOrderId`
//     و`visitId` و`deviceEpisodeId` كلُّها `?? null`)، و`SendToDoctorReviewDialog`
//     ترسل أربعةَ حقولٍ لا غير. مُثبَتٌ في `return_to_purchase.test.ts` (٦٧).
// (١٠) **والعلاقةُ بين القدرتين اتّجاهٌ واحد**: `canDecide` تستلزم
//     `canSupervise` ولا عكس — وكلتاهما حالةٌ حيّةٌ يرسلها الخادمُ مع
//     الطابور، ودالّتُه لا تأخذ `AiAccessContext`. والتسمياتُ من
//     `REVIEW_DECISION_LABELS`/`REVIEW_KIND_LABELS` القانونية.
// (١١) **وحارسُ التلوّث بقواعد الشاشات لا بأسمائها**: الإحالةُ إلى
//     «معايناتي» و«كتابة معاينة» مشروعةٌ هنا (التوقيعُ هناك لا هنا)، فلا
//     يمنعها الحارس — يمنع أن يحمل دليلٌ **قاعدةَ** شاشةٍ أخرى.

import { readFileSync } from "fs";
import { pool } from "./db";
import type * as provider from "./ai/provider";
import { aiChat } from "./ai/chat";
import { safeAiComplete } from "./ai/provider";
import { resolveAiAccess } from "./ai/access";
import { toolsFor } from "./ai/tools/registry";
import { resolvePageContext } from "./ai/page_context";
import {
  pageGuideFor,
  DECISION_QUEUE_PAGE_PATH, MY_EXAMS_PAGE_PATH, MEDICAL_REVIEW_PAGE_PATH,
  PATIENTS_PAGE_PATH, CREATE_PATIENT_PAGE_PATH, PATIENT_DETAILS_PAGE_PATH,
  EDIT_PATIENT_PAGE_PATH, FOLLOW_UPS_PAGE_PATH,
  MANUFACTURING_PAGE_PATH, MANUFACTURING_ORDER_PAGE_PATH,
  NO_EXAM_REVIEW_PAGE_PATH, RETURNED_CHARGES_PAGE_PATH,
  DISCOUNT_APPROVALS_PAGE_PATH, PAYMENT_CORRECTIONS_PAGE_PATH, DAILY_REVIEW_PAGE_PATH,
} from "./ai/page_guides";
import { DEVICE_SERVICE_TYPES } from "@shared/prosthetic_parts";
import {
  LEGACY_QUEUE_TITLE, RETURNED_QUEUE_TITLE, PENDING_CHARGE_ACTION_LABELS,
} from "@shared/pending_charge";
import { DISCOUNT_HISTORY_TITLE } from "@shared/discount";
import { DAILY_REVIEW_FAMILY_LABELS } from "@shared/daily_review";
import {
  BUILD_STAGES, PROSTHETIC_MAINTENANCE_STAGES, SUPPORT_MAINTENANCE_STAGES,
  STAGE_LABELS, STATUS_LABELS, HOLD_STATUSES,
} from "@shared/manufacturing";
import { specialtyLabel } from "@shared/medical";
import {
  REVIEW_SERVICE_TYPES, REVIEW_KINDS, REVIEW_KIND_LABELS,
  REVIEW_DECISIONS, REVIEW_DECISION_LABELS, requiresFullPath,
} from "@shared/medical_review";
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
  for (const other of ["/statistics", "/accounting", "/"]) {
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
  const decisionGuideSrc = src.slice(src.indexOf("function decisionQueueGuide"), src.indexOf("function myExamsGuide"));
  check(!/"reception"|'reception'|"accountant"|'accountant'|"branch_manager"|'branch_manager'/.test(decisionGuideSrc),
    "ج.٢ **ولا قائمةَ أدوارٍ منسوخةً في دليل بانتظار الحسم**",
    (decisionGuideSrc.match(/["'](reception|accountant|branch_manager)["']/g) ?? []).join(","));
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
  //  ⚠ **أربعةُ مداخل لا اثنان**: `rankWorklist` ⟶ `filterAndRank`
  //  (`shared/patient_search.ts`) تطابق الاسمَ والهاتفَ **ورمزَ المريض
  //  ورموزَه البديلة بعد الدمج** — و`MyExams.tsx` يمرّرها كلَّها في
  //  `toPatient`. فذِكرُ اثنين يَحرم الطبيبَ من بحثٍ يعمل فعلاً.
  check(/بحثٌ\*\* باسم المريض · أو رقم الهاتف · أو \*\*رمز المريض الحالي أو رمزه\s+القديم بعد الدمج\*\*/.test(my),
    "ز.٤ **والبحثُ بالاسم والهاتف والرمز الحالي والقديم**", my.slice(0, 1000));
  check(/البادئةُ `WB-` اختيارية/.test(my), "ز.٤أ **والبادئةُ اختيارية**");
  //  **ونصُّ الحقل يذكر اثنين فقط** — فالدليلُ يقول ذلك ولا ينفي القدرة.
  check(/\*\*⚠ ونصُّ الحقل على الشاشة يذكر الاسمَ والهاتفَ وحدهما\*\*/.test(my)
    && /فلا تقل للموظّف إنه غيرُ مدعوم/.test(my),
    "ز.٤ب **ويقول إن نصَّ الحقل أضيقُ من القدرة**");
  //  **وحارسُ الانحدار**: الصيغةُ القديمة الضيّقة لا تعود.
  check(!/بحثٌ\*\* باسم المريض أو رقم الهاتف\./.test(my),
    "ز.٤ج **ولا يعود إلى «الاسم أو الهاتف» وحدهما**");
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

  // ═══ ح: دليلُ «مراجعة الحركة» (٤ج) — بأثرٍ رجعيّ، وقدرتان حيّتان ═══════
  console.log("\n── ح: دليلُ «مراجعة حركة مرضى الأطراف والمساند» ──");
  const MR = resolvePageContext(MEDICAL_REVIEW_PAGE_PATH);
  same("ح.٠ المسارُ القانونيُّ للصفحة", MR?.path, MEDICAL_REVIEW_PAGE_PATH);
  same("ح.٠أ وتسميتُه العربية", MR?.label, "مراجعة حركة مرضى الأطراف والمساند");

  seen.length = 0;
  await chat(doc, ask("شنو أسوي هنا؟"), MR);
  const mrSys = seen[0].system;
  check(mrSys.includes(GUIDE_MARK), "ح.١ **الدليلُ يصل النموذجَ على هذه الصفحة**", mrSys.slice(-900));
  check(mrSys.includes("«مراجعة حركة مرضى الأطراف والمساند»"), "ح.١أ وباسم الشاشة");
  seen.length = 0;
  await chat(adm, ask("شنو أسوي هنا؟"), MR);
  check(seen[0].system.includes(GUIDE_MARK), "ح.١ب ويصل الوضعَ الماليَّ أيضاً");

  const mr = pageGuideFor(MR, doc);

  //  ① **بأثرٍ رجعيّ لا موافقةٌ سابقة** — أهمُّ ما في هذه الشاشة.
  //  ⚠ **الصفوفُ الرئيسية طابورُ المراجعة السريعة وحدَه** — وهو وحدَه
  //  «بأثرٍ رجعيّ». وقسمُ `awaitingFull` طلباتٌ **لم تقع معاينتُها بعد**،
  //  فوصفُ الصفحة كلِّها رجعيةً يخلط طبيعتين.
  check(/\*\*وهي قسمان لكلٍّ طبيعتُه\*\*/.test(mr),
    "ح.٢ **الصفحةُ قسمان لكلٍّ طبيعتُه**", mr.slice(0, 900));
  check(/`status = 'pending'` \*\*و\*\* `requested_path = 'quick'`/.test(mr),
    "ح.٢أ **والصفوفُ الرئيسية: المعلَّقُ على المسار السريع وحدَه**");
  //  **الصحيحُ الثابت: ليست بوّابةَ إذن** — لا «الخدمةُ وقعت حتماً».
  check(/\*\*⚠ وهي مراجعةٌ إشرافيةٌ لا بوّابةُ إذن\*\*/.test(mr)
    && /\*\*لا تأذن بخدمةٍ ولا\s+تمنعها\*\*/.test(mr),
    "ح.٢ب **وهي إشرافيةٌ لا بوّابةَ إذن**", mr.slice(0, 1400));
  check(/لا تحجب عملاً ولا ديناراً ولا أمرَ تصنيع/.test(mr)
    && /\*\*والنظامُ لا يشترط\s+حسمَها قبل تنفيذ الخدمة أصلاً\*\*/.test(mr),
    "ح.٢ج **ولا يشترط النظامُ حسمَها قبل التنفيذ**");
  //  ⚠ **ولا جزمَ بوقوع الخدمة لكلّ صفٍّ سريع**: نقطةُ الإنشاء تقبل الطلبَ
  //  بلا `workOrderId` ولا `visitId` ولا `deviceEpisodeId` (كلُّها `?? null`)،
  //  و`SendToDoctorReviewDialog` ترسل أربعةَ حقولٍ لا غير — ومُثبَتٌ حيّاً
  //  في `return_to_purchase.test.ts` (٦٧: `quick` + `other` بلا مرساة ⟶ ٢٠١).
  check(!/الخدمةُ وقعت فعلاً قبل أن يصل الطلب/.test(mr),
    "ح.٢د **ولا يجزم أن الخدمة وقعت لكلّ صفٍّ سريع**");
  check(/\*\*⚠ ولا تستنتج من صفٍّ سريعٍ بعينه أن خدمتَه وقعت فعلاً\.\*\*/.test(mr),
    "ح.٢د١ **بل ينهى عن الاستنتاج صراحةً**");
  check(/\*\*لكنّ ذلك ليس مضموناً لكلّ صفّ\*\*/.test(mr)
    && /\*\*بلا أيّ\s+مرساةٍ إطلاقاً\*\*/.test(mr)
    && /`workOrderId`/.test(mr) && /`visitId`/.test(mr) && /`deviceEpisodeId`/.test(mr),
    "ح.٢د٢ **ويسمّي المراسيَ الثلاثَ الغائبةَ سبباً**");
  check(/نافذةُ «إرسال لمراجعة الطبيب» اليدوية ترسل[\s\S]{0,260}`receptionNote`/.test(mr)
    && /\*\*لكنها لا ترسل أيّاً من المراسي الثلاثة المذكورة\*\*/.test(mr),
    "ح.٢د٢أ **والحمولة اليدوية تذكر `receptionNote` مع بقاء المراسي غائبة**");
  check(!/`reviewKind` لا غير/.test(mr),
    "ح.٢د٢ب **ولا تعود دعوى الحقول الأربعة الحصرية**");
  check(/\*\*فلا تجزم بوقوع خدمةٍ لصفٍّ ما لم تُثبت بياناتٌ حيّةٌ أنه مرسىً إلى\s+واقعةٍ فعلية\.\*\*/.test(mr),
    "ح.٢د٣ **ويشترط إثباتاً حيّاً بالمرساة**");
  check(/ما\s+زالت تنتظر معاينةً طبيةً كاملة\*\* لم تقع بعد/.test(mr),
    "ح.٢د٤ **وقسمُ «بانتظار الطبيب» مختلفٌ عنها**");
  //  **ولا «ليس من هذا الباب»** — الجهازُ الجديد قد يظهر في القسم ② فعلاً.
  check(!/ليس من هذا الباب/.test(mr),
    "ح.٢هـ **ولا يقول «الجهازُ الجديد ليس من هذا الباب»**");
  check(/\*\*لا يدخل صفوفَ المراجعة\s+السريعة إطلاقاً\*\*/.test(mr)
    && /وقد يظهر في القسم الإشرافيّ ②/.test(mr),
    "ح.٢و **بل: لا يدخل السريعةَ، وقد يظهر في القسم الإشرافيّ**");
  check(/\*\*أمّا المعاينةُ نفسُها\s+وتوقيعُها فتبقى في «معايناتي»\*\* لا هنا/.test(mr),
    "ح.٢ز **والتوقيعُ يبقى في «معايناتي»**");
  //  **والاختصاصان من `REVIEW_SERVICE_TYPES`** لا من نصٍّ منسوخ.
  for (const sv of REVIEW_SERVICE_TYPES) {
    check(mr.includes(specialtyLabel(sv)), `ح.٢د ومقصورةٌ على «${specialtyLabel(sv)}»`);
  }
  //  **وأسبابُ بطاقةِ المراجعة السريعة من القاعدة القانونية**
  //  (`requiresFullPath`) — لا سردٌ كاملٌ لـ`REVIEW_KIND_LABELS`.
  const quickKinds = REVIEW_KINDS.filter((k) => !requiresFullPath(k));
  const fullOnlyKinds = REVIEW_KINDS.filter((k) => requiresFullPath(k));
  check(fullOnlyKinds.length > 0, "ح.٢ح **وثمّة أسبابٌ تستوجب المسارَ الكامل فعلاً**");
  for (const k of quickKinds) {
    check(mr.includes(`«${REVIEW_KIND_LABELS[k]}»`),
      `ح.٢ط وسببُ البطاقة السريعة «${REVIEW_KIND_LABELS[k]}» مذكور`);
  }
  //  ⚠ **والمستوجِبُ للكامل يُذكَر مستثنىً لا معروضاً على البطاقات**:
  //  فيُشترَط أن يرد في جملة الاستثناء بعينها لا في سردِ أسباب البطاقة.
  const kindsLine = /وأسبابُ الزيارة التي تصلح لهذه البطاقات: ([^\n]+)/.exec(mr)?.[1] ?? "";
  for (const k of fullOnlyKinds) {
    check(!kindsLine.includes(REVIEW_KIND_LABELS[k]),
      `ح.٢ي **ولا يُعرَض «${REVIEW_KIND_LABELS[k]}» سبباً لبطاقةٍ سريعة**`, kindsLine);
    check(/ومنه «[^»]+»\s*و«[^»]+»/.test(mr) && mr.includes(REVIEW_KIND_LABELS[k]),
      `ح.٢ك بل يُسمّى مستوجِباً للمسار الكامل: «${REVIEW_KIND_LABELS[k]}»`);
  }
  //  **ولا `reviewKind` على بطاقات `awaitingFull` أصلاً** — لا تعرضه الشاشة.
  check(!/سببُ الزيارة على بطاقات «بانتظار الطبيب»/.test(mr),
    "ح.٢ل **ولا يدّعي سببَ زيارةٍ على بطاقات «بانتظار الطبيب»**");

  //  ② النافذتان — ولا ذكرَ للثالثة الخادمية.
  check(/«اليوم» \(\*\*الافتراض\*\*\)/.test(mr), "ح.٣ **«اليوم» هي الافتراض**");
  check(/«غير مراجعة سابقة»/.test(mr), "ح.٣أ و«غير مراجعة سابقة» للمتروك");
  //  ⚠ `window=all` تقبلها النقطةُ ولا تعرضها الشاشةُ زرّاً — فذكرُها يَعِد
  //  الموظّفَ بنافذةٍ لا يجدها.
  check(!/`all`/.test(mr) && !/نافذةٌ ثالثة/.test(mr),
    "ح.٣ب **ولا يذكر النافذةَ الخادمية `all`**");

  //  ③ مرشِّحُ الاختصاص — بما ترجعه النقطةُ لا بالجلسة.
  //  ⚠ **القائمةُ ليست «اختصاصات الحساب» دائماً**: `reviewSpecialtiesFor`
  //  تُرجع `REVIEW_SERVICE_TYPES` **كلَّها** لمسؤولٍ أو مديرِ فرع، ولا
  //  ترجع `doctorSpecialties` إلّا لغيرهما. فتسميتُها باسمٍ واحد تكذب.
  check(/مرشِّحُ الاختصاص/.test(mr)
    && /قائمةُ `specialties` التي\s+أعادها الخادمُ مع الطابور أكثرَ من واحد/.test(mr),
    "ح.٤ **مرشِّحُ الاختصاص: بقائمة `specialties` المُعادة**", mr.slice(0, 1200));
  check(/\*\*⚠ ويحسب الخادم هذه القائمة من\s+بيانات المستخدم الحيّة\*\*/.test(mr),
    "ح.٤أ **والخادم يحسبها من بيانات المستخدم الحيّة**");
  check(/`isAdmin === true`/.test(mr) && /`role === "branch_manager"`/.test(mr)
    && /`REVIEW_SERVICE_TYPES`/.test(mr),
    "ح.٤أ١ **والمسؤول أو مدير الفرع يأخذان كل أنواع المراجعة**");
  check(/`doctorSpecialties\(userId\)`/.test(mr),
    "ح.٤أ٢ **وغيرهما من اختصاصات الطبيب المسجّلة**");
  check(/فلا تشتقّها من\s+`AiAccessContext`/.test(mr)
    && /اقرأ\s+`specialties` التي أعادها الخادم/.test(mr),
    "ح.٤أ٣ **ولا تُستنتج من `AiAccessContext` بل من الاستجابة الحيّة**");
  check(!/لا من دور المستخدم/.test(mr),
    "ح.٤أ٤ **ولا ينفي أثر الدور الحي**");
  check(!/اختصاصاتِ الحساب/.test(mr) && !/اختصاصاتُه من الجلسة/.test(mr),
    "ح.٤ج **ولا يسمّيها «اختصاصات الحساب»**");
  check(/يُصفِّر مرشِّحَ الاختصاص/.test(mr), "ح.٤ب وتبديلُ النافذة يُصفِّره");

  //  ④ الصفوفُ من الطابور وحدَه — ولا ادّعاءَ شمول.
  check(/هي ما ترجعه `GET \/api\/medical-review\/queue` وحدَه/.test(mr),
    "ح.٥ **الصفوفُ من الطابور وحدَه**");
  check(/\*\*فلا تقل إن كلَّ طلبِ مراجعةٍ لا بدّ أن يظهر هنا\*\*/.test(mr),
    "ح.٥أ **ولا يدّعي أن كلَّ طلبٍ يظهر**");
  check(/ونطاقِ الفرع و`specialties` التي أعادها الخادم/.test(mr),
    "ح.٥ب **ونطاقُ الصفوف بـ`specialties` المُعادة لا بـ«اختصاصات الحساب»**");

  //  ⑤ **`canSupervise` حالةٌ حيّة** — والأفعالُ الأربعة بتسمياتها القانونية.
  const [APPROVE, REQ_FULL, RETURN_RCP] =
    REVIEW_DECISIONS.map((d) => REVIEW_DECISION_LABELS[d]);
  check(/\*\*وأفعالُ الصفّ تتبع `canSupervise` — وهي حالةٌ حيّةٌ يرسلها الخادمُ/.test(mr),
    "ح.٦ **الأفعالُ تتبع `canSupervise` الحيّة**");
  for (const lbl of [APPROVE, "إضافة ملاحظة", RETURN_RCP, "فتح ملف المريض"]) {
    check(mr.includes(`«${lbl}»`), `ح.٦أ وفعلُ «${lbl}» مذكور`);
  }
  check(/\*\*`canSupervise === false`\*\* ⟵ \*\*لا أفعال\*\*/.test(mr),
    "ح.٦ب **و`false` تعني لا أفعال**");
  //  **ورسالةُ القراءة فقط بنصّ الشاشة حرفاً**.
  //  **نصُّ الشاشة حرفاً** — ملفوفٌ بسطرين في القالب، فيُقرأ بعد طيّ الفراغ.
  same("ح.٦ج **ورسالةُ القراءة فقط كما تقولها الشاشة**",
    /«(المراجعة الإشرافية[^»]+)»/.exec(mr.replace(/\s+/g, " "))?.[1],
    "المراجعة الإشرافية للمسؤول أو مدير الفرع أو طبيب الاختصاص — يمكنك القراءة فقط.");

  //  ⑥ السببُ للإرجاع وحده.
  //  **ومربوطٌ بالفعل بعينه** لا بجملةٍ عائمة — الإرجاعُ هو الذي يطلب السبب.
  const flatMr = mr.replace(/\s+/g, " ");
  check(flatMr.includes(`«${RETURN_RCP}» **لا يمضي بلا سببٍ مكتوب**`),
    "ح.٧ **والإرجاعُ وحدَه لا يمضي بلا سبب**", flatMr.slice(0, 40));
  check(flatMr.includes(`أمّا الملاحظةُ مع «${APPROVE}» فاختيارية`),
    "ح.٧أ **والملاحظةُ مع «تمت المراجعة» اختيارية**");

  //  ⑦ **«يتطلّب معاينة كاملة» بـ`canDecide` وحدها** — قرارٌ سريريّ.
  check(mr.includes(`«${REQ_FULL}»`), "ح.٨ **و«يتطلّب معاينة كاملة» مذكور**");
  check(/فعلٌ مختلف\*\*: يظهر \*\*فقط حين تكون `canDecide === true`\*\*/.test(mr),
    "ح.٨أ **ومشروطٌ بـ`canDecide` وحدها**");
  check(/\*\*قرارٌ سريريٌّ لا إشرافيّ\*\*/.test(mr), "ح.٨ب **وهو سريريٌّ لا إشرافيّ**");
  //  ⚠ **ولا جزمَ عن مشرفٍ بعينه**: `canSuperviseReview` تسقط إلى
  //  `canDecideReview`، فمديرُ فرعٍ (أو مسؤول) يحمل `can_write_medical_exam`
  //  يملك **الاثنين**. فالجملةُ المطلقة «مشرفٌ إداريّ لا يملك هذا» كاذبةٌ
  //  في حالةٍ حقيقية.
  check(!/فمشرفٌ\s+إداريٌّ يملك .+ \*\*ولا يملك هذا\*\*/.test(mr)
    && !/ولا يملك هذا/.test(mr),
    "ح.٨ب١ **ولا يجزم أن المشرفَ الإداريَّ لا يملك القرارَ السريريّ**");
  //  ⚠ **العلاقةُ اتّجاهٌ واحد لا استقلال**: `canSuperviseReview` تسقط إلى
  //  `canDecideReview` في آخرها (`shared/medical_review.ts`) — فمَن يقرّر
  //  يُشرِف حتماً، والعكسُ لا يلزم. و«لا تلازمَ بينهما» كانت كاذبةً نصفاً.
  check(/\*\*`canDecide === true` تستلزم `canSupervise === true` دائماً\*\*/.test(mr),
    "ح.٨ج **والقرارُ يستلزم الإشرافَ دائماً**");
  check(/\*\*والعكسُ لا يلزم\*\*/.test(mr)
    && /`canSupervise === true` \*\*لا\*\* تعني `canDecide === true`/.test(mr),
    "ح.٨د **والعكسُ لا يلزم**");
  check(!/قدرتان مستقلّتان/.test(mr) && !/ولا تلازمَ\s+بينهما/.test(mr),
    "ح.٨هـ **ولا يقول إنهما مستقلّتان أو بلا تلازم**");
  check(/\*\*واقرأ القيمتين كما أرسلهما الخادمُ لا غير\*\*/.test(mr)
    && /\*\*ولا تفترض عن مشرفٍ بعينه أنه يملك أو لا يملك القرارَ\s+السريريّ\*\*/.test(mr),
    "ح.٨و **ويُلزم بقراءة البوليانين الحيّين بلا افتراضٍ عن مشرفٍ بعينه**");

  //  ⑧ قسمُ «بانتظار الطبيب» — شرطان، وقراءةٌ وإرجاعٌ فقط.
  check(/«طلبات معاينة كاملة بانتظار الطبيب»/.test(mr), "ح.٩ **والقسمُ مذكورٌ باسمه**");
  check(/\*\*فقط حين يجتمع الشرطان\*\*/.test(mr)
    && /`canSupervise === true` \*\*و\*\* `awaitingFull` غيرُ فارغة/.test(mr),
    "ح.٩أ **وبشرطين معاً**");
  check(/\*\*قراءةٌ\s+وإرجاعٌ فقط\*\*/.test(mr), "ح.٩ب **وقراءةٌ وإرجاعٌ فقط**");
  check(/\*\*ولا «كتابة معاينة» فيه ولا توقيعَ إطلاقاً\*\*/.test(mr),
    "ح.٩ج **ولا توقيعَ فيه إطلاقاً**");
  check(/\*\*و`awaitingFull` تستثني ما أنشأه المستخدمُ نفسُه\*\*/.test(mr),
    "ح.٩د **ويستثني ما أنشأه المستخدمُ نفسُه**");

  //  ⑨ **ولا جزمَ بحالةٍ حيّة** — نفسُ ثابت ٤أ و٤ب.
  check(/\*\*ولا تعرف\*\* قيمةَ `canSupervise` ولا `canDecide`/.test(mr),
    "ح.١٠ **ولا يعرف القدرتين لهذا المستخدم**");
  check(/ولا تجزم بوجود زرٍّ ولا قسمٍ ولا بغيابه/.test(mr),
    "ح.١٠أ **وينهى عن الجزم في الاتجاهين**");

  //  ⑩ **والدليلُ لا يتغيّر بتغيّر الجلسة** — لأنه لا يقرؤها أصلاً.
  same("ح.١١ **نصُّه هو هو للمسؤول العامّ**", pageGuideFor(MR, adm), mr);
  same("ح.١١أ وللاستقبال كذلك", pageGuideFor(MR, rep), mr);
  same("ح.١١ب ولطبيبٍ بفرعين كذلك", pageGuideFor(MR, multiMy), mr);
  check(/function medicalReviewGuide\(label: string\): string/.test(src),
    "ح.١١ج **و`medicalReviewGuide` لا تأخذ `access` أصلاً**");
  //  **وتعليقُه لا يخترع نظريةَ صلاحية**: `liveCanDecide` تقرأ `role` و
  //  `can_write_medical_exam` و`is_active` وحدها — **ولا اختصاصَ فيها**،
  //  فمثالُ «طبيبٌ سُحب اختصاصُه» يصف قاعدةً لا وجودَ لها. والتعليقُ لا
  //  يظهر في المخرَج، فيُحرَس على المصدر.
  const mrDoc = src.slice(src.indexOf("دليلُ «مراجعة حركة"), src.indexOf("function medicalReviewGuide"));
  check(mrDoc.length > 200, "ح.١١هـ **وتعليقُ الدالّة مقروءٌ من المصدر**", String(mrDoc.length));
  check(!/سُحب اختصاصُه/.test(mrDoc),
    "ح.١١و **ولا يعلّل قراءةَ `canDecide` حيّاً بسحب اختصاص**");
  check(/`can_write_medical_exam`/.test(mrDoc) && /`is_active`/.test(mrDoc),
    "ح.١١ز **بل بالأعمدة التي تقرؤها `liveUser` فعلاً**");
  check(!/operationalBranches/.test(mr), "ح.١١د **ولا يذكر `operationalBranches`**");

  //  ⑪ **والصفحتان السابقتان لم تتلوّثا** — ولا هذه بهما.
  //  ⚠ **الإحالةُ إلى «معايناتي» مشروعةٌ هنا** (التوقيعُ هناك لا هنا)، فلا
  //  يجوز أن يمنعها الحارس. والتلوّثُ الحقيقيُّ أن يحمل هذا الدليلُ **قواعدَ**
  //  شاشةٍ أخرى — فيُفحَص بعلاماتها المميِّزة لا بذِكر اسمها.
  check(/«معايناتي»/.test(mr), "ح.١٢ **والإحالةُ إلى «معايناتي» مشروعةٌ وحاضرة**");
  for (const [mark, why] of [
    ["بانتظار الحسم", "تبويبُ ٤أ"],
    ["إتمام البيع", "فعلُ ٤أ التجاريّ"],
    ["لأنّ نطاقه أكثرُ من فرع", "سببُ مرشِّح فرع ٤أ"],
    ["لا يوجد اختصاص مسجَّل لحسابك", "رسالةُ صفرِ اختصاصات ٤ب"],
    ["returnableRequestId", "شرطُ صفّ ٤ب"],
    ["إلغاء المعاينة", "فعلُ ٤ب"],
    ["«كتابة معاينة» — **على كلّ صفٍّ", "قاعدةُ صفّ ٤ب"],
  ] as const) {
    check(!mr.includes(mark), `ح.١٢أ **ولا يحمل ${why}** («${mark}»)`);
  }
  //  **والنفيُ المشروع يمرّ**: ذِكرُ «كتابة معاينة» لقولِ إنها **ليست** هنا
  //  إحالةٌ صحيحة — فالحارسُ يمنع قاعدةَ ٤ب لا اسمَ زرِّها.
  check(/\*\*ولا «كتابة معاينة» فيه ولا توقيعَ إطلاقاً\*\*/.test(mr),
    "ح.١٢ب **والنفيُ المشروع لـ«كتابة معاينة» حاضرٌ ولم يمنعه الحارس**");
  check(repGuide === pageGuideFor(PAGE, rep), "ح.١٢ج **و٤أ هو هو كما قُرئ أوّلاً**");
  same("ح.١٢د **و٤ب هو هو كذلك**", pageGuideFor(MY, doc), my);
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

  // ═══ ط: عائلة المريض الأساسية — أدلة ساكنة للتدريب بلا بيانات حيّة ═══
  console.log("\n── ط: سجل المريض والتسجيل والملف والتعديل والمتابعات ──");
  const PATS = resolvePageContext(PATIENTS_PAGE_PATH);
  const NEWP = resolvePageContext(CREATE_PATIENT_PAGE_PATH);
  const DET = resolvePageContext("/patients/123");
  const EDT = resolvePageContext("/patients/123/edit");
  const FUP = resolvePageContext(FOLLOW_UPS_PAGE_PATH);
  same("ط.١ سجل المرضى قانوني", PATS?.path, PATIENTS_PAGE_PATH);
  same("ط.٢ التسجيل قانوني", NEWP?.path, CREATE_PATIENT_PAGE_PATH);
  same("ط.٣ التفاصيل تُقنَّن إلى :id", DET?.path, PATIENT_DETAILS_PAGE_PATH);
  same("ط.٤ التعديل تُقنَّن إلى :id/edit", EDT?.path, EDIT_PATIENT_PAGE_PATH);
  same("ط.٥ المتابعات قانونية", FUP?.path, FOLLOW_UPS_PAGE_PATH);

  const pg = pageGuideFor(PATS, rep);
  check(/جميع المرضى/.test(pg) && /الصفحة\s+الأولى/.test(pg), "ط.٦ السجل يشرح الافتراض");
  check(/رمز المريض الحالي/.test(pg) && /الرمز القديم\s+بعد دمج الملفات/.test(pg), "ط.٧ السجل يشرح البحث بالرمزين");
  check(/الحالة المرضية/.test(pg) && /لا يوجد بحثٌ مكتوب/.test(pg) && /لا يُرسل\s+مرشّح التاريخ/.test(pg),
    "ط.٨ السجل يشرح الحالة وأولوية البحث على التاريخ");
  check(/مع \*\*أي نص بحث\*\*/.test(pg)
    && /لا يطبّق\s+`branchId`/.test(pg)
    && /من فروع أخرى/.test(pg),
    "ط.٨أ بحث المسؤول يتجاهل مرشّح الفرع");
  check(/ملفات أُتيحت لذلك الفرع صراحةً/.test(pg)
    && /patientVisibleToScopeSql/.test(pg)
    && /مسجّل أصلاً في فرع آخر/.test(pg),
    "ط.٨ب نطاق غير المسؤول يشمل الملفات المشتركة مع فرعه");
  check(/Excel/.test(pg) && /PDF/.test(pg)
    && /10000/.test(pg) && /10,000 صف كحد أقصى/.test(pg)
    && /التصدير ليس كاملاً/.test(pg)
    && /canViewPayments/.test(pg),
    "ط.٩ السجل يشرح سقف التصدير وحجب المال");
  check(/لا تستنتج من هذا الدليل أن زرّاً بعينه ظاهر الآن/.test(pg), "ط.١٠ السجل لا يخترع حالة صف");

  const ng = pageGuideFor(NEWP, rep);
  check(/موظف الاستقبال لا يملك إدخال تاريخ قديم/.test(ng), "ط.١١ التسجيل يشرح التاريخ");
  check(/name-availability/.test(ng) && /POST \/api\/patients/.test(ng), "ط.١٢ التسجيل يفرّق الإرشاد عن الحارس النهائي");
  check(/إصابات وتشخيص\s+العلاج الطبيعي/.test(ng)
    && /نوع المسند\/جهة الإصابة/.test(ng)
    && /موضع البتر/.test(ng),
    "ط.١٣ التسجيل يشرح ما يستطيع الاستقبال إدخاله فعلاً");
  check(/التسجيل بلا كلفة دائماً/.test(ng)
    && /totalCost: 0/.test(ng)
    && /يرفض أي كلفة غير صفرية/.test(ng)
    && /تخصيص\/إسناد خبير/.test(ng)
    && /الكلفة والجلسات/.test(ng),
    "ط.١٣أ التسجيل لا يعلّم مسار الكلفة القديم");

  const dg = pageGuideFor(DET, rep);
  for (const mark of ["الزيارات", "المدفوعات", "المستندات"])
    check(dg.includes(`«${mark}»`), `ط.١٤ تبويب ${mark} مذكور`);
  check(/«خطط العلاج» يظهر \*\*فقط إذا كان المريض علاجاً طبيعياً\*\*/.test(dg)
    && /patient\.isPhysiotherapy === true/.test(dg),
    "ط.١٤أ خطط العلاج مشروطة بالعلاج الطبيعي");
  check(/canViewPayments/.test(dg) && /canManageTreatmentPlans/.test(dg) && /canEditPatients/.test(dg) && /canAddPatients/.test(dg),
    "ط.١٥ ملف المريض يربط الأفعال ببواباتها");
  check(/caseId == null/.test(dg)
    && /صفوف قديمة\/غير منسوبة لحالة/.test(dg)
    && /قد تبقى بعض السجلات ظاهرة في أكثر من حالة/.test(dg),
    "ط.١٥أ الحالة المختارة تبقي الصفوف غير المنسوبة");
  check(/لا تخترع حالةً للمريض ولا قيمةً مالية ولا زرّاً حالياً/.test(dg), "ط.١٦ ملف المريض لا يخترع الحي");

  const eg = pageGuideFor(EDT, rep);
  check(/المسؤول العام أو مدير الفرع فقط/.test(eg) && /checkRequiredPatientData/.test(eg),
    "ط.١٧ التعديل يشرح الكلفة وفحص الاكتمال المشروط");
  check(/\?adding=1/.test(eg)
    && /canEditCost && !addingMode/.test(eg)
    && /سياق صفحة المساعد يحذف query string/.test(eg),
    "ط.١٧أ التعديل يشرح استثناء وضع إضافة الحالة للكلفة");
  for (const field of ["age", "height", "weight", "isAmputee", "amputationSite"]) {
    check(eg.includes(`\`${field}\``), `ط.١٨ الحقل المحروس ${field} مذكور`);
  }
  check(/إذا لم تتغيّر هذه القيم/.test(eg)
    && /التشخيص أو الإصابة أو المسند أو حقول سريرية أخرى/.test(eg),
    "ط.١٨أ غير الخمسة لا يفعّل فحص الاكتمال");

  const fg = pageGuideFor(FUP, rep);
  check(/العلاج الطبيعي/.test(fg) && /٧ أيام أو أكثر/.test(fg), "ط.١٩ غرض المتابعات مضبوط");
  check(/التذكيرات النشطة/.test(fg) && /السجل/.test(fg), "ط.٢٠ التبويبان");
  check(/الهاتف غير مُمرَّر\s+إلى بحث السجل/.test(fg), "ط.٢١ يشرح فرق بحث الهاتف بين النشط والسجل");
  check(/حذف سجل متابعة قد يعيد المريض إلى\s+التذكيرات النشطة/.test(fg), "ط.٢٢ يشرح أثر الحذف");
  check(/canViewPatients/.test(fg) && /عزل الفرع/.test(fg), "ط.٢٣ يشرح الحارس الخادمي");

  // الأدلة الخمسة ساكنة: لا تتغير بتغيير AiAccessContext.
  for (const p of [PATS, NEWP, DET, EDT, FUP]) {
    same(`ط.٢٤ الدليل الساكن ${p?.path}`, pageGuideFor(p, rep), pageGuideFor(p, adm));
  }
  // ═══ ي: التصنيع — اللوحة وأمر التصنيع ══════════════════════════════════
  console.log("\n── ي: تصنيع الأطراف والمساند وأمر التصنيع ──");
  const MFG = resolvePageContext(MANUFACTURING_PAGE_PATH);
  const MORD = resolvePageContext("/manufacturing/orders/123");
  same("ي.١ مسار التصنيع قانوني", MFG?.path, MANUFACTURING_PAGE_PATH);
  same("ي.٢ مسار أمر التصنيع يُقنَّن", MORD?.path, MANUFACTURING_ORDER_PAGE_PATH);

  const mg = pageGuideFor(MFG, rep);
  check(/نظرتان مختلفتان/.test(mg) && /الحالات المسندة إليك/.test(mg),
    "ي.٣ اللوحة تفرق بين النظر الإداري وأوامر الخبير");
  check(/يحمل قدرة العمل كخبير/.test(mg) && /يبقى على النظر الإداري/.test(mg),
    "ي.٤ مدير-خبير يبقى مديراً");
  check(/رقم المستخدم نفسه/.test(mg) && /لا يقبل\s+رقم خبير يرسله العميل/.test(mg),
    "ي.٥ أوامر الخبير معزولة خادمياً");
  check(/مرشح فرع/.test(mg) && /مرشح خبير/.test(mg) && /نوع الخدمة/.test(mg)
    && /المرحلة/.test(mg) && /الحالة/.test(mg), "ي.٦ مرشحات اللوحة مذكورة");
  check(/مرشح المرحلة في\s+الواجهة يسرد مراحل البناء الأولي الحالية فقط/.test(mg)
    && /مراحل الصيانة لا تظهر فيه/.test(mg),
    "ي.٦أ مرشح المرحلة لا يوهم بوجود مراحل الصيانة");
  check(/عدادات الشرائح الصغيرة/.test(mg) && /القائمة التي رجعت فعلاً بعد المرشحات الحالية/.test(mg),
    "ي.٧ الشرائح ليست إجماليات مستقلة");
  check(/الملخص يتبع مرشح الفرع فقط/.test(mg)
    && /البحث ومرشحات\s+النوع والمرحلة والحالة والخبير/.test(mg),
    "ي.٧أ الملخص الإشرافي لا يتبع بقية مرشحات القائمة");
  check(/أمر تصنيع لمريض موجود/.test(mg) && /زر إداري فقط/.test(mg)
    && /ليس\s+باب الصيانة/.test(mg) && /إضافة خدمة جديدة/.test(mg),
    "ي.٨ اختصار إنشاء الأمر مضبوط بحدوده");
  check(/يحتاج البناء الأولي معاينة طبيب موقعة/.test(mg)
    && /المرضى الموروثون قبل نظام المعاينات لهم استثناء/.test(mg),
    "ي.٨أ معاينة البناء الأولي واستثناء الموروث موضحان");
  for (const st of BUILD_STAGES) {
    check(mg.includes(`«${STAGE_LABELS[st]}»`), `ي.٩ مرحلة البناء ${st} مذكورة من المصدر القانوني`);
  }
  check(/لا ترسل حقولاً مالية/.test(mg), "ي.١٠ التصنيع لا يعلّم مالاً غير موجود");

  const og = pageGuideFor(MORD, rep);
  check(/خبير آخر في الفرع نفسه لا يفتح أمر زميله/.test(og), "ي.١١ عزل صفحة الأمر");
  check(/مواصفات هذا الجهاز — من معاينته/.test(og) && /لا تخلط المصدرين/.test(og),
    "ي.١٢ مصدر مواصفات الجهاز موضح");
  for (const st of BUILD_STAGES) {
    check(og.includes(`«${STAGE_LABELS[st]}»`), `ي.١٣ مرحلة الأمر ${st} مذكورة`);
  }
  check(/المسند الذي لا يحتاج قالباً/.test(og) && /من القياسات إلى التصنيع/.test(og),
    "ي.١٤ استثناء تخطي قالب المسند");
  check(/تاريخ التسليم المتوقع\s+إلزامياً/.test(og) && /نتيجة التصنيع والملاءمة/.test(og),
    "ي.١٥ التزام الموعد والنتيجة عند نقاطهما");
  for (const st of PROSTHETIC_MAINTENANCE_STAGES) {
    check(og.includes(`«${STAGE_LABELS[st]}»`), `ي.١٦ صيانة الطرف ${st} مذكورة`);
  }
  for (const st of SUPPORT_MAINTENANCE_STAGES) {
    check(og.includes(`«${STAGE_LABELS[st]}»`), `ي.١٧ صيانة المسند ${st} مذكورة`);
  }
  check(/الصيانة ليست خط البناء الكامل ولا سلسلةً من خطوتين/.test(og)
    && /يختار الخبير \*\*أحد\*\* الإنجازين/.test(og),
    "ي.١٧أ صيانة الطرف اختيار إنجاز واحد لا تسلسل");
  for (const s of HOLD_STATUSES) {
    check(og.includes(`«${STATUS_LABELS[s]}»`), `ي.١٨ حالة التوقف ${s} مذكورة`);
  }
  check(/إعادة عمل فني» وحدها ترجع/.test(og) && /إلغاء التوقف\s+ومتابعة العمل/.test(og),
    "ي.١٩ إعادة العمل والاستئناف موضحان");
  check(/أول تحديد لا يحتاج سبباً/.test(og) && /تغيير موعد قائم يحتاج سبباً مكتوباً/.test(og)
    && /اختيار التاريخ نفسه مرفوض/.test(og), "ي.٢٠ قواعد الموعد دقيقة");
  check(/الإدارة ومدير الفرع فقط/.test(og) && /تحويل لخبير/.test(og)
    && /تعديل إداري\s+للمرحلة/.test(og), "ي.٢١ أفعال الإدارة في صفحة الأمر");
  check(/صفحة\s+الأمر نفسها لا تعرض زر «إلغاء أمر التصنيع»/.test(og),
    "ي.٢٢ لا يخترع زر إلغاء في صفحة الأمر");
  check(/لا تجزم بالمرحلة أو الحالة أو الأزرار الحالية/.test(og),
    "ي.٢٣ لا يخترع حالة أمر حي");

  // الدليلان ساكنان ولا يغيران الأدوات أو الصلاحيات.
  same("ي.٢٤ دليل اللوحة ساكن", pageGuideFor(MFG, rep), pageGuideFor(MFG, adm));
  same("ي.٢٥ دليل الأمر ساكن", pageGuideFor(MORD, rep), pageGuideFor(MORD, adm));
  // ═══ ك: المبالغ الموروثة — الإكمال والإعادة للتصحيح ═══════════════════
  console.log("\n── ك: المبالغ السابقة والمُعادة للتصحيح ──");
  const LEG = resolvePageContext(NO_EXAM_REVIEW_PAGE_PATH);
  const RET = resolvePageContext(RETURNED_CHARGES_PAGE_PATH);
  same("ك.١ مسار الطابور الموروث قانوني", LEG?.path, NO_EXAM_REVIEW_PAGE_PATH);
  same("ك.٢ مسار المُعادات قانوني", RET?.path, RETURNED_CHARGES_PAGE_PATH);

  const lg = pageGuideFor(LEG, rep);
  check(lg.includes(`«${LEGACY_QUEUE_TITLE}»`) && /ليست مراجعةً طبية/.test(lg),
    "ك.٣ الطابور الموروث ليس مراجعة طبية");
  check(/لا صف جديد يدخل هذا الطابور الآن/.test(lg), "ك.٤ الطابور لا يمتلئ من العمليات الجديدة");
  check(/المسؤول العام، مدير الفرع، أو مستخدم مُنح صراحةً قدرة\s+إضافة المرضى/.test(lg),
    "ك.٥ حارس الإكمال التشغيلي موضح");
  check(lg.includes(`«${PENDING_CHARGE_ACTION_LABELS.approve}»`)
    && lg.includes(`«${PENDING_CHARGE_ACTION_LABELS.return}»`)
    && /لا يوجد فعل «رفض» ثالث/.test(lg), "ك.٦ الفعلان القانونيان فقط");
  check(/حتى 200 صف/.test(lg) && /عداد الطابور الخادمي هو COUNT كامل/.test(lg),
    "ك.٧ فرق حد القائمة عن العداد الكامل");
  check(/الخادم يعيد من\s+GET \/api\/no-exam\/review حقلاً اسمه rows فقط/.test(lg)
    && /الواجهة الحالية ما زالت\s+تنتظر أيضاً specialties/.test(lg)
    && /ليست قاعدة الصلاحية الحالية/.test(lg),
    "ك.٨ تعارض specialties الحالي موضح بلا اختراع صلاحية");

  const rg = pageGuideFor(RET, rep);
  check(rg.includes(`«${RETURNED_QUEUE_TITLE}»`) && /الطابور للفرع لا لموظف بعينه/.test(rg),
    "ك.٩ المُعادات مهمة فرع لا ملكية شخصية");
  check(/مبلغ موجب صحيح بالدينار/.test(rg) && /الملاحظة\s+اختيارية/.test(rg),
    "ك.١٠ عقد التصحيح مضبوط");
  check(/الصف نفسه/.test(rg) && /المبلغ القديم لا\s+يُقيّد/.test(rg) && /لا يُحسب البيع مرتين/.test(rg),
    "ك.١١ التصحيح لا ينسخ الصف ولا يقيد القديم");
  check(/حتى 200 صف/.test(rg) && /branch لكل ما ينتظر/.test(rg) && /mine لما أنشأه/.test(rg),
    "ك.١٢ القائمة والعدادان موضحان");
  check(/نصوص قديمة في الواجهة/.test(rg) && /الخادم الحالي لا يربط هذا المسار بطبيب أو اختصاص/.test(rg)
    && /لا تعلّم الموظف أن عليه انتظار طبيب/.test(rg),
    "ك.١٣ يمنع تعليم المسار الطبي القديم");
  same("ك.١٤ دليل الطابور ساكن", pageGuideFor(LEG, rep), pageGuideFor(LEG, adm));
  same("ك.١٥ دليل المُعادات ساكن", pageGuideFor(RET, rep), pageGuideFor(RET, adm));
  // ═══ ل: الرقابة المالية والمراجعة اليومية ═══════════════════════════════
  console.log("\n── ل: الخصومات وتصحيح الدفعات والمراجعة اليومية ──");
  const DISC = resolvePageContext(DISCOUNT_APPROVALS_PAGE_PATH);
  const PCOR = resolvePageContext(PAYMENT_CORRECTIONS_PAGE_PATH);
  const DREV = resolvePageContext(DAILY_REVIEW_PAGE_PATH);
  same("ل.١ مسار الخصومات قانوني", DISC?.path, DISCOUNT_APPROVALS_PAGE_PATH);
  same("ل.٢ مسار تصحيح الدفعات قانوني", PCOR?.path, PAYMENT_CORRECTIONS_PAGE_PATH);
  same("ل.٣ مسار المراجعة اليومية قانوني", DREV?.path, DAILY_REVIEW_PAGE_PATH);

  const dc = pageGuideFor(DISC, rep);
  check(dc.includes(`«${DISCOUNT_HISTORY_TITLE}»`) && /لا يُنشئ\s+طلباً معلّقاً جديداً/.test(dc),
    "ل.٤ الخصومات الجديدة فورية والصفحة تاريخية");
  check(/canApproveDiscount/.test(dc) && /مقيداً بفروعه/.test(dc), "ل.٥ صلاحية الخصم ونطاق الفرع");
  check(/حتى 300 طلب فقط/.test(dc) && /بالأقدم طلباً أولاً/.test(dc) && /COUNT كامل/.test(dc),
    "ل.٦ حد قائمة الخصومات وترتيبها مقابل العداد");
  check(/إكمال وتطبيق السعر/.test(dc) && /إلغاء الطلب/.test(dc) && /تعديل وإكمال/.test(dc),
    "ل.٧ أفعال الطلب المعلق الثلاثة");
  check(/الصفر\s+وحده لا يعني تبرعاً/.test(dc), "ل.٨ المجاني صريح لا صفر ضمني");
  check(/initialPayment/.test(dc) && /مبلغ القبض وليس السعر\s+النهائي/.test(dc),
    "ل.٩ طلبات الخدمة الجديدة القديمة لا تخترع القبض");

  const pcg = pageGuideFor(PCOR, rep);
  check(/للمسؤول العام فقط/.test(pcg) && /لا مدير فرع ولا\s+صلاحية can\*/.test(pcg),
    "ل.١٠ قرار تصحيح الدفعة Admin حصراً");
  for (const word of ["المبلغ", "التاريخ المالي", "نوع العلاج", "الجلسات المجانية"])
    check(pcg.includes(word), `ل.١١ الحقل المحمي ${word} مذكور`);
  check(/الملاحظات\s+وعدد الجلسات وحدهما مباشران/.test(pcg), "ل.١٢ الحقول المباشرة لا تفتح طلباً");
  check(/هو pending فقط/.test(pcg) && /بأحدث طلب أولاً/.test(pcg), "ل.١٣ الصفحة تعرض المعلق فقط");
  check(/الرفض يغلق الطلب فقط ولا يغيّر الدفعة/.test(pcg), "ل.١٤ الرفض بلا أثر مالي");
  check(/تغيّرت أي\s+قيمة من لقطة الدفعة/.test(pcg) && /يرفض الخادم الاعتماد بتعارض/.test(pcg),
    "ل.١٥ يمنع اعتماد طلب متقادم");

  const drg = pageGuideFor(DREV, rep);
  check(/للقراءة فقط/.test(drg) && /للمسؤول العام فقط/.test(drg) && /العلاج الطبيعي خارج/.test(drg),
    "ل.١٦ حدود المراجعة اليومية");
  for (const label of Object.values(DAILY_REVIEW_FAMILY_LABELS))
    check(drg.includes(`«${label}»`), `ل.١٧ أسرة ${label} مذكورة`);
  check(/created عمداً/.test(drg) && /فلا يُعرض الحدث نفسه مرتين/.test(drg),
    "ل.١٨ فتح الأمر لا يكرر كحركة تصنيع");
  check(/السعر النهائي المتفق عليه ليس هو المبلغ المدفوع فعلاً/.test(drg),
    "ل.١٩ يفرق السعر النهائي عن المقبوض");
  check(/لا يُنسب لشخص إلا إذا\s+وجد سطر تدقيق مباشر/.test(drg),
    "ل.٢٠ لا يخترع من قبض الدفعة");
  check(/الخبير الحالي المسند/.test(drg) && /المحفوظ لحظة الحسم/.test(drg),
    "ل.٢١ يفرق الخبير الحالي عن لقطة الحسم");

  same("ل.٢٢ دليل الخصومات ساكن", pageGuideFor(DISC, rep), pageGuideFor(DISC, adm));
  same("ل.٢٣ دليل التصحيح ساكن", pageGuideFor(PCOR, rep), pageGuideFor(PCOR, adm));
  same("ل.٢٤ دليل المراجعة ساكن", pageGuideFor(DREV, rep), pageGuideFor(DREV, adm));
  await cleanup();
  console.log(failures === 0 ? "\n✅ كل الفحوص نجحت" : `\n❌ ${failures} حالة فاشلة`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error(e); await cleanup(); await pool.end(); process.exit(1); });
