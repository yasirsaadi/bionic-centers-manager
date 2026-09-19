// سياقُ الصفحة الحالية (المرحلة ٢) — تنظيفٌ خالص، ووصولٌ إلى النموذج
// والاسترجاع، وصفرُ أثرٍ على الإذن.
// قاعدة محلّية: `npm run test:ai-page-context`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) العميلُ يرسل `window.location.pathname` **لحظةَ الطلب**.
// (٢) الأرقامُ تصير `:id` قبل أن تبلغ النموذج — لا معرّفَ مريضٍ يتسرّب.
// (٣) الاستعلامُ والمرساةُ لا يعبران.
// (٤) السياقُ يصل **الوضعين معاً** بمساره وتسميته.
// (٥) تسميةُ الصفحة تدخل **نصَّ استرجاع المعرفة** فتجد المقالةَ المناسبة.
// (٦) ومسارٌ ملفَّق **لا يغيّر أداةً ولا إذناً ولا نطاقاً** — صفرُ سلطة.

import { readFileSync } from "fs";
import { pool } from "./db";
import type * as provider from "./ai/provider";
import { aiChat } from "./ai/chat";
import { safeAiComplete } from "./ai/provider";
import { resolveAiAccess } from "./ai/access";
import { toolsFor } from "./ai/tools/registry";
import { createArticle } from "./ai/knowledge/store";
import {
  canonicalizePagePath, resolvePageContext, KNOWN_PAGE_PATHS,
  UNKNOWN_PAGE_LABEL, MAX_PAGE_PATH_LENGTH,
} from "./ai/page_context";
import {
  isCurrentPageOrWorkflowQuestion, isLiveDataOnlyQuestion,
} from "@shared/ai_knowledge_retrieval";

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

const B = 9970, U_ADMIN = 9971, U_REPORTS = 9972;
const MARK = "اختبار-سياق-الصفحة";
const q = (t: string, v: any[] = []) => pool.query(t, v);

async function cleanup() {
  await q(`DELETE FROM ai_knowledge_articles WHERE title LIKE $1`, [`%${MARK}%`]);
  //  سطورُ التدقيق تشير إلى المستخدم بمفتاحٍ أجنبيّ — تُحذَف قبله.
  await q(`DELETE FROM audit_log WHERE user_id IN ($1,$2)`, [U_ADMIN, U_REPORTS]);
  await q(`DELETE FROM system_users WHERE id IN ($1,$2)`, [U_ADMIN, U_REPORTS]);
  await q(`DELETE FROM branches WHERE id = $1`, [B]);
}

// ── مزوّدٌ مزيّف يلتقط نصَّ النظام الذي وصل النموذج فعلاً ─────────────────
const seen: { system: string; tools: string[] }[] = [];
const fakeStep = (async (p: any) => {
  seen.push({ system: p.system, tools: (p.tools ?? []).map((t: any) => t.name) });
  return { text: "انتهيت.", toolCalls: [], blocks: [] };
}) as unknown as typeof provider.aiToolStep;

const chat = (a: any, h: any, page: any) => aiChat(a, h, safeAiComplete, fakeStep, page);
const ask = (text: string) => [{ role: "user" as const, content: text }];

async function main() {
  await cleanup();

  // ═══ أ: التنظيف خالصاً (بلا قاعدة) ═══════════════════════════════════
  console.log("\n── أ: التقنين والتنظيف ──");

  same("أ.١ /patients/2455 ⟶ :id", canonicalizePagePath("/patients/2455"), "/patients/:id");
  same("أ.٢ /patients/2455/edit ⟶ :id", canonicalizePagePath("/patients/2455/edit"), "/patients/:id/edit");
  same("أ.٣ /manufacturing/orders/123 ⟶ :id",
    canonicalizePagePath("/manufacturing/orders/123"), "/manufacturing/orders/:id");
  same("أ.٤ والثابتُ يمرّ كما هو", canonicalizePagePath("/statistics"), "/statistics");
  same("أ.٥ والجذرُ يمرّ", canonicalizePagePath("/"), "/");

  //  **الاستعلامُ والمرساةُ يُقصّان** — ولا يعبر منهما حرف.
  same("أ.٦ الاستعلامُ يُقصّ", canonicalizePagePath("/patients?q=%D8%B9%D9%84%D9%8A&page=3"), "/patients");
  same("أ.٧ والمرساةُ تُقصّ", canonicalizePagePath("/statistics#revenue-chart"), "/statistics");
  same("أ.٨ والاثنان معاً مع رقم",
    canonicalizePagePath("/patients/2455?tab=payments#top"), "/patients/:id");

  //  والمرفوضُ يُرجع `null` ولا يُخمَّن له بديل.
  for (const bad of [
    null, undefined, 42, true, {}, [], "", "patients", "//patients",
    "/patients/<script>", "/patients/' OR 1=1--", "/patients/a b",
    "/" + "x".repeat(MAX_PAGE_PATH_LENGTH + 1),
  ]) {
    same(`أ.٩ يُرفَض: ${JSON.stringify(bad)}`, canonicalizePagePath(bad as any), null);
  }

  same("أ.١٠ وشرطةٌ أخيرة لا تعني صفحةً أخرى", canonicalizePagePath("/patients/"), "/patients");
  same("أ.١١ ومسارٌ غيرُ معروفٍ يُقال صراحةً",
    resolvePageContext("/no/such/page")?.label, UNKNOWN_PAGE_LABEL);
  same("أ.١٢ والمرفوضُ لا سياقَ له", resolvePageContext("javascript:alert(1)"), null);

  // ═══ ب: التسمياتُ من App.tsx وحده — لا مسارَ مخترَع ═══════════════════
  console.log("\n── ب: التسمياتُ مشتقّةٌ من المسارات الحقيقية ──");

  const appSrc = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
  const realRoutes = Array.from(appSrc.matchAll(/<Route path="([^"]+)"/g)).map((m) => m[1]);
  check(realRoutes.length > 20, "ب.١ قُرئت مساراتُ App.tsx الحقيقية", `n=${realRoutes.length}`);

  const missing = realRoutes.filter((r) => !KNOWN_PAGE_PATHS.includes(r));
  same("ب.٢ **كلُّ مسارٍ حقيقيّ له تسمية**", missing, []);
  const invented = KNOWN_PAGE_PATHS.filter((p) => !realRoutes.includes(p));
  same("ب.٣ **ولا مسارَ مخترَعٍ لا يوجد في App.tsx**", invented, []);

  same("ب.٤ /statistics ⟶ الإحصاءات", resolvePageContext("/statistics")?.label, "الإحصاءات");
  same("ب.٥ /patients ⟶ سجل المرضى", resolvePageContext("/patients")?.label, "سجل المرضى");
  same("ب.٦ /patients/new ⟶ تسجيل مريض جديد",
    resolvePageContext("/patients/new")?.label, "تسجيل مريض جديد");
  same("ب.٧ /patients/2455 ⟶ تفاصيل المريض",
    resolvePageContext("/patients/2455")?.label, "تفاصيل المريض");
  same("ب.٨ /patients/2455/edit ⟶ تعديل بيانات المريض",
    resolvePageContext("/patients/2455/edit")?.label, "تعديل بيانات المريض");
  same("ب.٩ /manufacturing ⟶ تصنيع الأطراف والمساند",
    resolvePageContext("/manufacturing")?.label, "تصنيع الأطراف والمساند");
  same("ب.١٠ /manufacturing/orders/123 ⟶ أمر تصنيع",
    resolvePageContext("/manufacturing/orders/123")?.label, "أمر تصنيع");
  same("ب.١١ /accounting ⟶ النظام المحاسبي",
    resolvePageContext("/accounting")?.label, "النظام المحاسبي");
  same("ب.١٢ /admin ⟶ لوحة المسؤول", resolvePageContext("/admin")?.label, "لوحة المسؤول");

  // ═══ ج: عقدُ العميل ══════════════════════════════════════════════════
  console.log("\n── ج: العميل يرسل المسار وحده ──");

  const drawer = readFileSync(
    new URL("../client/src/components/AiChatDrawer.tsx", import.meta.url), "utf8");
  const postBlock = drawer.slice(
    drawer.indexOf('apiRequest("POST", "/api/ai/chat"'),
    drawer.indexOf('apiRequest("POST", "/api/ai/chat"') + 700);

  check(/pagePath:\s*window\.location\.pathname/.test(postBlock),
    "ج.١ **يرسل `pagePath: window.location.pathname`**", postBlock.slice(0, 300));
  //  **لحظةَ الطلب**: القراءةُ داخل جسم الطفرة لا في `useState`/`useEffect`
  //  أعلى، فمَن تنقّل والدرجُ مفتوح يسأل عن صفحته الحالية.
  check(!/useState\([^)]*window\.location|useEffect[\s\S]{0,200}location\.pathname/.test(drawer),
    "ج.٢ **ولا يُلتقَط المسار مرّةً عند الفتح** — يُقرأ في كل طلب");
  check(!/location\.search|location\.hash|document\.body|innerText|textContent/.test(drawer),
    "ج.٣ **ولا استعلامَ ولا مرساةَ ولا نصَّ DOM** في الدرج كلِّه");

  // ═══ د: التهيئة الحيّة ═══════════════════════════════════════════════
  await q(`INSERT INTO branches (id,name) VALUES ($1,$2)
           ON CONFLICT (id) DO NOTHING`, [B, `فرع ${MARK}`]);
  await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
           VALUES ($1,$2,'x','مسؤول','admin',$3,$4,'t') ON CONFLICT (id) DO NOTHING`,
    [U_ADMIN, `pc_admin_${U_ADMIN}`, B, JSON.stringify([B])]);
  await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
           VALUES ($1,$2,'x','موظف','reception',$3,$4,'t') ON CONFLICT (id) DO NOTHING`,
    [U_REPORTS, `pc_rep_${U_REPORTS}`, B, JSON.stringify([B])]);

  const sess = {
    userId: U_REPORTS, role: "reception", isAdmin: false, branchId: B, accessibleBranches: [B],
    displayName: "r", permissions: { canViewPatients: true },
  };
  const finSess = {
    userId: U_ADMIN, role: "admin", isAdmin: true, branchId: B, accessibleBranches: [B],
    displayName: "adm", permissions: { canViewPatients: true, canManageAccounting: true },
  };
  const general = resolveAiAccess({ session: sess, scopeBranchId: B });
  const financial = resolveAiAccess({ session: finSess, scopeBranchId: B });
  same("د.١ الوضعُ العامّ مهيّأ", general.mode, "general");
  same("د.٢ والوضعُ الماليّ مهيّأ", financial.mode, "financial");

  // ═══ هـ: يصل النموذج — في الوضعين معاً ════════════════════════════════
  console.log("\n── هـ: السياقُ يصل النموذج في الوضعين ──");

  seen.length = 0;
  await chat(general, ask("اشرح لي هذه الصفحة"), resolvePageContext("/statistics"));
  check(seen.length > 0, "هـ.١ وصل النموذجَ نصُّ نظام (الوضع العامّ)");
  check(seen[0].system.includes("/statistics"), "هـ.٢ **وفيه المسار**", seen[0].system.slice(-600));
  check(seen[0].system.includes("الإحصاءات"), "هـ.٣ **وفيه التسمية «الإحصاءات»**", seen[0].system.slice(-600));
  check(/سياقُ ملاحةٍ لا صلاحية/.test(seen[0].system),
    "هـ.٤ **ومعه التنبيهُ أنه سياقٌ لا إذن**", seen[0].system.slice(-600));
  check(/لا تخترع أزراراً/.test(seen[0].system),
    "هـ.٥ ونهيٌ عن اختراع أزرارٍ أو خطوات", seen[0].system.slice(-600));

  seen.length = 0;
  await chat(financial, ask("اشرح لي هذه الصفحة"), resolvePageContext("/accounting"));
  check(seen.length > 0, "هـ.٦ ووصل في الوضع الماليّ أيضاً");
  check(seen[0].system.includes("/accounting") && seen[0].system.includes("النظام المحاسبي"),
    "هـ.٧ **بمساره وتسميته معاً**", seen[0].system.slice(-600));

  //  وبلا سياقٍ لا تظهر الكتلةُ إطلاقاً — لا صفحةٌ مخترَعة.
  seen.length = 0;
  await chat(general, ask("مرحبا"), null);
  check(!/الصفحةُ التي يقف عليها المستخدم/.test(seen[0].system),
    "هـ.٨ **وبلا سياقٍ لا تُخترَع صفحة**", seen[0].system.slice(-400));

  // ═══ و: لا رقمَ يبلغ النموذج ═══════════════════════════════════════════
  console.log("\n── و: لا معرّفَ رقميّ يتسرّب ──");

  seen.length = 0;
  await chat(general, ask("شنو أسوي هنا؟"), resolvePageContext("/patients/2455?tab=payments#top"));
  const sys = seen[0].system;
  check(sys.includes("/patients/:id"), "و.١ المسارُ القانونيّ وصل", sys.slice(-500));
  check(!/2455/.test(sys), "و.٢ **ورقمُ المريض لم يصل النموذج إطلاقاً**", sys.slice(-500));
  check(!/tab=payments/.test(sys) && !/#top/.test(sys),
    "و.٣ **ولا استعلامٌ ولا مرساةٌ عبرا**", sys.slice(-500));

  seen.length = 0;
  await chat(general, ask("شنو أسوي هنا؟"), resolvePageContext("/manufacturing/orders/456"));
  check(seen[0].system.includes("/manufacturing/orders/:id") && !/456/.test(seen[0].system),
    "و.٤ **وأمرُ التصنيع كذلك — `:id` لا ٤٥٦**", seen[0].system.slice(-500));

  // ═══ ز: تسميةُ الصفحة تدخل استرجاع المعرفة ════════════════════════════
  console.log("\n── ز: الاسترجاعُ يرى تسميةَ الصفحة ──");

  //  مقالةٌ كلماتُها المميّزة في **تسمية الصفحة وحدها** — لا في السؤال.
  //  فإن وصلت فالتسميةُ دخلت نصَّ الاسترجاع فعلاً، وإلّا فلا.
  const article = await createArticle({
    title: `مراحلُ التصنيع ${MARK}`,
    body: "تصنيع الأطراف والمساند: تتبّع مراحل أمر العمل من القياس حتى التسليم.",
    scope: "general", branchId: null,
    actor: { userId: U_ADMIN, name: "مسؤول" },
  });
  check(!!article?.id, "ز.٠ أُنشئت مقالةُ الاختبار");

  seen.length = 0;
  await chat(general, ask("شنو أسوي هنا؟"), resolvePageContext("/manufacturing"));
  check(seen[0].system.includes("تتبّع مراحل أمر العمل"),
    "ز.١ **«شنو أسوي هنا؟» + صفحةُ التصنيع ⟶ المقالةُ وصلت فعلاً**",
    seen[0].system.slice(-700));

  //  ونفسُ السؤال بلا سياقٍ لا يجدها — فالفرقُ تسميةُ الصفحة لا غير.
  seen.length = 0;
  await chat(general, ask("شنو أسوي هنا؟"), null);
  check(!seen[0].system.includes("تتبّع مراحل أمر العمل"),
    "ز.٢ **وبلا سياقٍ لا تصل** — فالفارقُ هو التسمية وحدها",
    seen[0].system.slice(-700));

  //  وصفحةٌ أخرى لا تجرّ مقالةَ التصنيع — ليست مطابقةً عمياء.
  seen.length = 0;
  await chat(general, ask("شنو أسوي هنا؟"), resolvePageContext("/surveys"));
  check(!seen[0].system.includes("تتبّع مراحل أمر العمل"),
    "ز.٣ وصفحةٌ أخرى لا تجرّها", seen[0].system.slice(-700));

  //  **وبوّابةُ البيانات الحيّة لم يتغيّر معناها**: سؤالٌ عن سجلّ مريضٍ
  //  بعينه لا يستدرج معرفةً، ولو كان واقفاً على صفحة التصنيع.
  seen.length = 0;
  await chat(general, ask("ما حالة WB-02119؟"), resolvePageContext("/manufacturing"));
  check(!seen[0].system.includes("تتبّع مراحل أمر العمل"),
    "ز.٤ **وبوّابةُ «بياناتٌ حيّة» كما كانت** — لا معرفةَ لسؤال سجلٍّ بعينه",
    seen[0].system.slice(-700));

  // ═══ ط: تسميةُ الصفحة لسؤال الصفحة وحده — لا لكلّ سؤال ════════════════
  console.log("\n── ط: التسميةُ لا تدخل استرجاعَ سؤالٍ لا صلةَ له بالشاشة ──");

  //  البوّابةُ الخالصة: الأمثلةُ الثلاثة من الطلب، ومعها إحالةٌ بلا فعل.
  check(isCurrentPageOrWorkflowQuestion("شنو أسوي هنا؟"),
    "ط.١ «شنو أسوي هنا؟» سؤالُ صفحة (بالإحالة وحدها — بلا كلمةِ مسارِ عمل)");
  check(isCurrentPageOrWorkflowQuestion("اشرح لي هذه الصفحة"), "ط.٢ «اشرح لي هذه الصفحة» كذلك");
  check(isCurrentPageOrWorkflowQuestion("ليش هذا الزر ما يظهر عندي؟"),
    "ط.٣ «ليش هذا الزر ما يظهر عندي؟» كذلك");
  check(isCurrentPageOrWorkflowQuestion("ما هذه الشاشة؟"), "ط.٤ وإحالةٌ بلا فعلٍ كذلك");
  check(isCurrentPageOrWorkflowQuestion("كيف أفتح صيانة؟"),
    "ط.٥ وسؤالُ مسارِ عملٍ صريح كذلك (WORKFLOW_MARKERS القائمة)");

  const UNRELATED = "هل الدوام غدا رسمي؟";
  check(!isCurrentPageOrWorkflowQuestion(UNRELATED),
    "ط.٦ **وسؤالٌ عامٌّ لا صلةَ له بالشاشة ليس منها**", UNRELATED);
  check(!isCurrentPageOrWorkflowQuestion("هاي الفاتورة شنو؟"),
    "ط.٧ وسؤالٌ عن سجلٍّ بإشارةٍ عامّة ليس سؤالَ صفحة");

  //  **ضابطٌ لازم**: لولاه لمرّ اختبارُ الارتداد أدناه **للسبب الخطأ** —
  //  أي لأن بوّابةَ «بياناتٌ حيّة» أعادت [] أصلاً لا لأن الإصلاح يعمل.
  check(!isLiveDataOnlyQuestion(UNRELATED),
    "ط.٨ **والسؤالُ العامُّ يمرّ ببوّابة «بياناتٌ حيّة»** — فالاسترجاعُ يجري فعلاً", UNRELATED);

  //  ── الارتدادُ نفسُه: نفسُ الصفحة، نفسُ المقالة، سؤالان مختلفان ──────────
  seen.length = 0;
  await chat(general, ask(UNRELATED), resolvePageContext("/manufacturing"));
  check(!seen[0].system.includes("تتبّع مراحل أمر العمل"),
    "ط.٩ **سؤالٌ عامٌّ من صفحة التصنيع ⟶ مقالةُ التصنيع لا تُسترجَع**",
    seen[0].system.slice(-700));
  //  وسياقُ الصفحة **يصل النموذج كما هو** — المحجوبُ هو الاسترجاعُ وحده.
  check(seen[0].system.includes("/manufacturing")
    && seen[0].system.includes("تصنيع الأطراف والمساند"),
    "ط.١٠ **والسياقُ يصل النموذج كما هو** — المحجوبُ نصُّ الاسترجاع وحده",
    seen[0].system.slice(-700));

  //  ونفسُ الصفحة بسؤال صفحةٍ ⟶ تُسترجَع. فالفارقُ **نوعُ السؤال** لا الصفحة.
  seen.length = 0;
  await chat(general, ask("شنو أسوي هنا؟"), resolvePageContext("/manufacturing"));
  check(seen[0].system.includes("تتبّع مراحل أمر العمل"),
    "ط.١١ **ونفسُ الصفحة بسؤال صفحةٍ تُسترجَع** — فالفارقُ نوعُ السؤال",
    seen[0].system.slice(-700));

  // ═══ ح: صفرُ سلطة ═════════════════════════════════════════════════════
  console.log("\n── ح: مسارٌ ملفَّق لا يغيّر إذناً ولا أداة ──");

  const baseTools = toolsFor(general).map((t: any) => t.name).sort();
  const crafted = [
    "/admin", "/accounting", "/patients/1", "/no/such/page", "/branches/999",
  ];
  for (const p of crafted) {
    seen.length = 0;
    await chat(general, ask("شنو أسوي هنا؟"), resolvePageContext(p));
    same(`ح.١ الأدواتُ لا تتغيّر بـ${p}`, seen[0].tools.sort(), baseTools);
  }
  //  **ولا يفتح الوضعَ الماليّ**: صفحةُ المحاسبة لا تمنح موظّفاً عامّاً مالاً.
  seen.length = 0;
  await chat(general, ask("كم الإيراد؟"), resolvePageContext("/accounting"));
  check(!seen[0].tools.includes("financial_summary"),
    "ح.٢ **وصفحةُ المحاسبة لا تفتح أداةً مالية لغير المخوَّل**",
    JSON.stringify(seen[0].tools));

  //  والإذنُ نفسُه لا يُقرأ منه شيء — `resolveAiAccess` لا تعرف الحقل أصلاً.
  const accessSrc = readFileSync(new URL("./ai/access.ts", import.meta.url), "utf8");
  check(!/pagePath|PageContext|page_context/.test(accessSrc),
    "ح.٣ **ولا ذكرَ لسياق الصفحة في بناء الإذن إطلاقاً**");
  const registrySrc = readFileSync(new URL("./ai/tools/registry.ts", import.meta.url), "utf8");
  check(!/pagePath|PageContext|page_context/.test(registrySrc),
    "ح.٤ **ولا في سجلّ الأدوات** — لا أداةَ تُفتَح بمسار");

  await cleanup();
  console.log(failures === 0 ? "\n✅ كل الفحوص نجحت" : `\n❌ ${failures} حالة فاشلة`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error(e); await cleanup(); await pool.end(); process.exit(1); });
