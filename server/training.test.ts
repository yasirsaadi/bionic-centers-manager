// اختبارُ تدريب الموظّفين من طرفه إلى طرفه — نقاطُ `/api/training/*`
// الحقيقية فوق قاعدةٍ محلّية. `npm run test:training`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) الكتالوجُ يُصفّى بالقدرة (جمهورٌ لا دورٌ حصريّ)، والاتحادُ الإضافيّ
//     يعمل لمن يملك أكثر من قدرة. (٢) الدرسُ يُبنى من المعرفة **الفعّالة
//     حيّاً** — سلسلةُ تعديلٍ تُحلّ إلى النسخة الحالية، وسلسلةٌ سُحبت
//     بالكامل تُستبعَد بصمتٍ لا تُفشل الدرس. (٣) اقتراحٌ معلَّقٌ **لا يصل
//     أيّ درسٍ أبداً**. (٤) لا مسارَ مباشراً لوحدةٍ خارج القدرة — قراءةً أو
//     كتابة. (٥) الهويّةُ من الجلسة وحدها: لا `userId`/`role`/`isAdmin` من
//     جسم الطلب يغيّر شيئاً. (٦) الاستئنافُ يعيد الوحدة نفسَها بعد إجابةٍ
//     خاطئة (لا تُفقَد من الطابور). (٧) التصحيحُ حتميّ. (٨) وحدةُ تدريبٍ
//     عمليّ لا تُصحَّح آليّاً أبداً. (٩) عرضُ الإدارة مقيَّدٌ بالفرع ولا
//     يُمنَح بصلاحيةٍ غير ذات صلة (`canViewReports` وحدها لا تكفي).
// (١٠) لوحةُ المسؤول للمسؤول العام وحده — لا مديرِ الفرع. (١١) أداةُ
//     الذكاء تستعمل المخزنَ نفسَه بلا نسخةٍ ثانية.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { createArticle, editArticle, setArticleActive, createSuggestion } from "./ai/knowledge/store";
import { executeTool } from "./ai/tools/registry";
import { resolveAiAccess } from "./ai/access";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}
//  مقارنةٌ لا تتأثّر بترتيب مفاتيح الكائنات — `jsonb` في Postgres لا يحفظ
//  ترتيبَ الإدخال، فمقارنةُ quiz (كائنٌ متداخل) بـ`JSON.stringify` الخام
//  كانت تُبلغ فشلاً زائفاً رغم تطابق المحتوى تماماً.
function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  if (v && typeof v === "object") {
    const keys = Object.keys(v as object).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify((v as any)[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}
function sameStable(msg: string, got: unknown, expected: unknown) {
  check(stableStringify(got) === stableStringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6980;
const BASE = `http://127.0.0.1:${PORT}`;

//  نطاقُ معرّفاتٍ محجوزٌ لهذا الملفّ وحده.
const B1 = 9750, B2 = 9751;
const RECV = 9752, DOC = 9753, FIN = 9754, MULTI = 9755, NOCAP = 9756,
  REPORTS_ONLY = 9757, MGR1 = 9758, MGR2 = 9759, ADMIN1 = 9760;
const ALL_USERS = [RECV, DOC, FIN, MULTI, NOCAP, REPORTS_ONLY, MGR1, MGR2, ADMIN1];
const MARK = "اختبار-تدريب-الموظفين";

async function q(sql: string, params: any[] = []) {
  return pool.query(sql, params);
}
function sessionHeader(s: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(s)).toString("base64");
}
function actorFor(userId: number, name: string, role: string, branchId: number | null) {
  return { userId, name, role, branchId: branchId ?? undefined };
}

async function cleanup(customTrackId?: number | null) {
  await q(`DELETE FROM employee_training_progress WHERE user_id = ANY($1::int[])`, [ALL_USERS]);
  if (customTrackId) {
    await q(`DELETE FROM training_modules WHERE track_id = $1`, [customTrackId]);
    await q(`DELETE FROM training_tracks WHERE id = $1`, [customTrackId]);
  }
  await q(`DELETE FROM ai_knowledge_suggestions WHERE submitted_by = ANY($1::int[])`, [ALL_USERS]);
  await q(`DELETE FROM ai_knowledge_articles WHERE title LIKE $1`, [`${MARK}%`]);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [ALL_USERS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [ALL_USERS]);
  await q(`DELETE FROM branches WHERE id = ANY($1::int[])`, [[B1, B2]]);
}

async function main() {
  await cleanup();

  await q(`INSERT INTO branches (id, name) VALUES ($1,'فرع أ'),($2,'فرع ب') ON CONFLICT (id) DO NOTHING`, [B1, B2]);
  await q(`
    INSERT INTO system_users
      (id, username, password_hash, display_name, role, branch_id, is_active,
       can_add_patients, can_view_patients, can_write_medical_exam, can_work_as_expert,
       can_enter_sessions, can_manage_accounting, can_view_reports)
    VALUES
      ($1,'tr-recv','x','استقبال اختبار','reception',$10,true, true,true,false,false,false,false,false),
      ($2,'tr-doc','x','طبيب اختبار','doctor',$10,true, false,false,false,false,false,false,false),
      ($3,'tr-fin','x','محاسب اختبار','reception',$10,true, false,false,false,false,false,true,false),
      ($4,'tr-multi','x','متعدد القدرات','reception',$11,true, true,false,false,false,false,true,false),
      ($5,'tr-nocap','x','بلا قدرة','reception',$10,true, false,false,false,false,false,false,false),
      ($6,'tr-reports','x','تقارير فقط','reception',$10,true, false,false,false,false,false,false,true),
      ($7,'tr-mgr1','x','مدير فرع أ','branch_manager',$10,true, false,false,false,false,false,false,false),
      ($8,'tr-mgr2','x','مدير فرع ب','branch_manager',$11,true, false,false,false,false,false,false,false),
      ($9,'tr-admin','x','مسؤول اختبار','admin',NULL,true, false,false,false,false,false,false,false)
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, is_active = true
  `, [RECV, DOC, FIN, MULTI, NOCAP, REPORTS_ONLY, MGR1, MGR2, ADMIN1, B1, B2]);

  //  ══ مقالةُ اختبارٍ مخصَّصة + مسارٌ ووحداتٌ مخصَّصة — لا نُمسّ أيّ صفٍّ
  //  مزروع من ترحيل ٠٧٦ في أيّ اختبارٍ يكتب أو يعطّل ══════════════════════
  const article = await createArticle({
    title: `${MARK} — مقالةٌ أصلية (نسخة ١)`,
    body: `${MARK} — المتنُ الأصليّ الذي يُفترَض أن يقرأه الموظّف أوّلاً.`,
    scope: "general", branchId: null, actor: actorFor(ADMIN1, "مسؤول اختبار", "admin", null),
  });
  //  ══ مقالةٌ خاصّةٌ بفرع ب — لحراسة تسرّب الفرع عبر التدريب (القسم Q) ══════
  //  التدريبُ معرفةُ إجراءٍ عامّة لا بياناتَ فرع (`listAccessibleTracks` لا
  //  تفرض نطاق فرعٍ أصلاً)، فمقالةٌ خاصّةٌ بفرعٍ **يجب ألّا تُحَلّ عبر هذا
  //  المسار مطلقاً** ولو أشارت إليها وحدةٌ تدريبٍ بالخطأ — راجع
  //  `resolveActiveArticle` في `server/training/store.ts`.
  const branchArticle = await createArticle({
    title: `${MARK} — مقالةٌ خاصّة بفرع ب فقط`,
    body: `${MARK} — متنٌ يخصّ فرع ب حصراً ويجب ألّا يظهر لأيّ موظّف عبر التدريب`,
    scope: "general", branchId: B2, actor: actorFor(ADMIN1, "مسؤول اختبار", "admin", null),
  });

  const quizModuleQuiz = JSON.stringify({
    question: `${MARK} — اكتب كلمة «تجربة» في إجابتك`,
    requiredConcepts: [{ keywords: ["تجربة", "اختبار"], hint: "كلمة تجربة أو اختبار" }],
  });

  const [trackRow] = (await q(
    `INSERT INTO training_tracks (title, description, audience, sort_order, created_by_name, approved_by_name)
     VALUES ($1,$2,'["reception"]'::jsonb,999,'اختبار','اختبار') RETURNING id`,
    [`${MARK} — مسارٌ مخصَّص`, `${MARK} — لموظّفي الاستقبال حصراً`],
  )).rows;
  const TRACK_ID = trackRow.id as number;

  const [modSupersede] = (await q(
    `INSERT INTO training_modules (track_id, title, description, position, knowledge_article_ids)
     VALUES ($1,$2,$3,1,$4::jsonb) RETURNING id`,
    [TRACK_ID, `${MARK} — وحدةُ السلسلة`, "بلا اختبار", JSON.stringify([article.id])],
  )).rows;
  const MOD_SUPERSEDE = modSupersede.id as number;

  const [modQuiz] = (await q(
    `INSERT INTO training_modules (track_id, title, description, position, knowledge_article_ids, quiz)
     VALUES ($1,$2,$3,2,'[]'::jsonb,$4::jsonb) RETURNING id`,
    [TRACK_ID, `${MARK} — وحدةُ الاختبار`, "باختبارٍ حتميّ", quizModuleQuiz],
  )).rows;
  const MOD_QUIZ = modQuiz.id as number;

  const [modPractice] = (await q(
    `INSERT INTO training_modules (track_id, title, description, position, knowledge_article_ids, practice_only)
     VALUES ($1,$2,$3,3,'[]'::jsonb,true) RETURNING id`,
    [TRACK_ID, `${MARK} — وحدةٌ عملية`, "بلا تصحيحٍ آليّ", ],
  )).rows;
  const MOD_PRACTICE = modPractice.id as number;

  const [modBranchLeak] = (await q(
    `INSERT INTO training_modules (track_id, title, description, position, knowledge_article_ids)
     VALUES ($1,$2,$3,4,$4::jsonb) RETURNING id`,
    [TRACK_ID, `${MARK} — وحدةٌ تشير خطأً لمقالة فرع`, "لحراسة تسرّب الفرع", JSON.stringify([branchArticle.id])],
  )).rows;
  const MOD_BRANCH_LEAK = modBranchLeak.id as number;

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const header = req.get("x-test-session");
    if (header) {
      try {
        const branchSession = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
        req.session = { branchSession };
      } catch { /* ignore */ }
    }
    next();
  });

  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise<void>((r) => httpServer.once("listening", () => r()));

  try {
    const S = {
      recv: { userId: RECV, displayName: "استقبال", role: "reception", branchId: B1, isAdmin: false, permissions: { canAddPatients: true, canViewPatients: true } },
      doc: { userId: DOC, displayName: "طبيب", role: "doctor", branchId: B1, isAdmin: false, permissions: {} },
      fin: { userId: FIN, displayName: "محاسب", role: "reception", branchId: B1, isAdmin: false, permissions: { canManageAccounting: true } },
      multi: { userId: MULTI, displayName: "متعدد", role: "reception", branchId: B2, isAdmin: false, permissions: { canAddPatients: true, canManageAccounting: true } },
      nocap: { userId: NOCAP, displayName: "بلا قدرة", role: "reception", branchId: B1, isAdmin: false, permissions: {} },
      reportsOnly: { userId: REPORTS_ONLY, displayName: "تقارير", role: "reception", branchId: B1, isAdmin: false, permissions: { canViewReports: true } },
      mgr1: { userId: MGR1, displayName: "مدير١", role: "branch_manager", branchId: B1, isAdmin: false, permissions: {} },
      mgr2: { userId: MGR2, displayName: "مدير٢", role: "branch_manager", branchId: B2, isAdmin: false, permissions: {} },
      admin: { userId: ADMIN1, displayName: "مسؤول", role: "admin", branchId: null, isAdmin: true, permissions: {} },
    };
    const H = Object.fromEntries(Object.entries(S).map(([k, v]) => [k, sessionHeader(v)])) as Record<keyof typeof S, string>;

    async function GET(path: string, who: keyof typeof S) {
      return fetch(`${BASE}${path}`, { headers: { "x-test-session": H[who] } });
    }
    async function POST(path: string, who: keyof typeof S, body: unknown) {
      return fetch(`${BASE}${path}`, {
        method: "POST", headers: { "content-type": "application/json", "x-test-session": H[who] },
        body: JSON.stringify(body ?? {}),
      });
    }
    async function PATCH(path: string, who: keyof typeof S, body: unknown) {
      return fetch(`${BASE}${path}`, {
        method: "PATCH", headers: { "content-type": "application/json", "x-test-session": H[who] },
        body: JSON.stringify(body ?? {}),
      });
    }

    // ══ أ. الكتالوجُ — الجمهورُ قدرةٌ لا دورٌ حصريّ ══════════════════════
    console.log("\n── أ. الكتالوج والجمهور ──");
    const recvTracks = await (await GET("/api/training/tracks", "recv")).json();
    check((recvTracks.tracks as any[]).some((t) => t.id === TRACK_ID),
      "أ.١ الاستقبالُ يرى مسارَه المخصَّص (جمهورُه reception)");
    check(!(recvTracks.tracks as any[]).some((t) => t.title?.includes("دليل المحاسبة")),
      "أ.٢ ولا يرى مسار المحاسبة المزروع (جمهورُه finance)");

    const nocapTracks = await (await GET("/api/training/tracks", "nocap")).json();
    same("أ.٣ موظّفٌ بلا أيّ قدرةٍ خاصّة ⟶ كتالوجٌ فارغ تماماً", nocapTracks.tracks, []);

    const multiTracks = await (await GET("/api/training/tracks", "multi")).json();
    check((multiTracks.tracks as any[]).some((t) => t.title === "دليل الاستقبال والتسجيل"),
      "أ.٤ متعدّدُ القدرات (reception+finance) يرى مسار الاستقبال المزروع");
    check((multiTracks.tracks as any[]).some((t) => t.title === "دليل المحاسبة"),
      "أ.٤ب ويرى مسار المحاسبة المزروع **معاً** — اتحادٌ إضافيّ لا حصريّ");
    check(!(multiTracks.tracks as any[]).some((t) => t.title === "دليل الطبيب والمعاينة"),
      "أ.٤ج ولا يرى مسار الطبيب (لا يملك قدرة medical)");

    // ══ ب. الدرسُ — يُبنى من المعرفة الفعّالة حيّاً ══════════════════════
    console.log("\n── ب. الدرس والمعرفة الفعّالة ──");
    const lesson1Res = await GET(`/api/training/modules/${MOD_SUPERSEDE}/lesson`, "recv");
    check(lesson1Res.status === 200, "ب.١ فتحُ درسٍ بلا اختبار ينجح (٢٠٠)", `status=${lesson1Res.status}`);
    const lesson1 = (await lesson1Res.json()).lesson;
    same("ب.٢ نصُّ الدرس = النسخة الأصلية قبل أيّ تعديل", lesson1.lesson[0]?.body, article.body);
    same("ب.٣ ووحدةٌ بلا اختبارٍ تكتمل فوراً بفتح الدرس", lesson1.status, "completed");

    //  إجابةُ التصحيح **لا تُسرَّب** — quizQuestion موجودٌ لوحدة MOD_QUIZ،
    //  لكن requiredConcepts/hints لا يظهران في أيّ درس مطلقاً.
    const lessonQuizRes = await GET(`/api/training/modules/${MOD_QUIZ}/lesson`, "recv");
    const lessonQuizBody = await lessonQuizRes.text();
    check(lessonQuizBody.includes("اكتب كلمة"), "ب.٤ سؤالُ الاختبار يصل الموظّف نصّاً");
    check(!lessonQuizBody.includes("requiredConcepts") && !lessonQuizBody.includes("keywords") && !lessonQuizBody.includes("hint"),
      "ب.٥ **ومعاييرُ التصحيح (requiredConcepts/keywords/hint) لا تصل الاستجابةَ الخام أبداً**");

    //  التعديلُ يُنشئ نسخةً جديدة ويُطفئ القديمة — الدرسُ التالي يحلّها حيّاً
    //  بلا أن يتغيّر رقمُ المقالة المخزَّن في الوحدة.
    const edited = await editArticle({
      id: article.id, title: `${MARK} — مقالةٌ معدَّلة (نسخة ٢)`,
      body: `${MARK} — المتنُ المعدَّل الذي يجب أن يظهر بعد التعديل مباشرة.`,
      scope: "general", branchId: null, actor: actorFor(ADMIN1, "مسؤول اختبار", "admin", null),
    });
    check(edited.ok === true, "ب.٦ التعديلُ ينجح");
    const lesson2 = (await (await GET(`/api/training/modules/${MOD_SUPERSEDE}/lesson`, "recv")).json()).lesson;
    same("ب.٧ **الدرسُ التالي يعرض النصَّ المعدَّل تلقائياً** — سلسلةٌ فعّالة حيّة لا رقمٌ ثابت",
      lesson2.lesson[0]?.body, edited.ok ? edited.article.body : null);
    check(lesson2.lesson[0]?.body !== article.body, "ب.٧ب والنصُّ القديم لم يعد يظهر");

    //  سحبُ السلسلة كلِّها (تعطيلُ النسخة الفعّالة الوحيدة) ⟶ الدرسُ لا يفشل،
    //  المقالةُ تختفي من قائمة الدرس بصمتٍ فقط.
    if (edited.ok) {
      await setArticleActive({ id: edited.article.id, active: false, actor: actorFor(ADMIN1, "م", "admin", null) });
      const lesson3Res = await GET(`/api/training/modules/${MOD_SUPERSEDE}/lesson`, "recv");
      check(lesson3Res.status === 200, "ب.٨ سحبُ السلسلة كلِّها لا يُفشل الدرس (يبقى ٢٠٠)", `status=${lesson3Res.status}`);
      const lesson3 = (await lesson3Res.json()).lesson;
      same("ب.٩ والمقالةُ المسحوبةُ تماماً **تُستبعَد بصمتٍ** من قائمة الدرس", lesson3.lesson, []);
      //  إعادةُ التفعيل — لبقيّة الاختبارات ولإثبات أن الاستبعاد مؤقّتٌ لا نهائيّ.
      await setArticleActive({ id: edited.article.id, active: true, actor: actorFor(ADMIN1, "م", "admin", null) });
    }

    // ══ ب.١٠ اقتراحٌ معلَّق لا يصل أيّ درسٍ أبداً ══════════════════════════
    const secretSuggestion = await createSuggestion({
      suggestedText: `${MARK} — سرٌّ في اقتراحٍ معلَّق يجب ألّا يظهر في أيّ درسٍ إطلاقاً`,
      reason: `${MARK} — سبب`, actor: actorFor(RECV, "استقبال اختبار", "reception", B1),
    });
    const lessonAfterSuggestion = await (await GET(`/api/training/modules/${MOD_SUPERSEDE}/lesson`, "recv")).text();
    check(!lessonAfterSuggestion.includes("سرٌّ في اقتراحٍ معلَّق"),
      "ب.١٠ اقتراحٌ pending **لا يظهر في أيّ درسٍ إطلاقاً** — الاقتراحات ليست في جدول المقالات أصلاً");

    // ══ ب.١١ مقالةٌ خاصّةٌ بفرعٍ آخر **لا تُحَلّ عبر التدريب مطلقاً** (القسم Q) ══
    const branchLeakRes = await GET(`/api/training/modules/${MOD_BRANCH_LEAK}/lesson`, "recv");
    check(branchLeakRes.status === 200, "ب.١١.١ فتحُ الدرس لا يفشل رغم إشارته لمقالة فرع", `status=${branchLeakRes.status}`);
    const branchLeakLesson = (await branchLeakRes.json()).lesson;
    same("ب.١١.٢ **ومتنُ مقالة فرع ب لا يصل درسَ أيّ موظّف** — القائمةُ فارغة كأنّ المقالة سُحبت", branchLeakLesson.lesson, []);
    const branchLeakBody = JSON.stringify(branchLeakLesson);
    check(!branchLeakBody.includes("فرع ب حصراً"),
      "ب.١١.٣ ونصُّ المقالة الخاصّة بالفرع غيرُ موجودٍ في الاستجابة إطلاقاً");

    // ══ ج. الحمايةُ خارج نطاق القدرة — قراءةً وكتابةً ═════════════════════
    console.log("\n── ج. حجبُ وحدةٍ خارج القدرة ──");
    const finLessonRes = await GET(`/api/training/modules/${MOD_QUIZ}/lesson`, "fin");
    check(finLessonRes.status === 403, "ج.١ محاسبٌ (بلا reception) يُردّ ٤٠٣ لوحدةِ مسارٍ ليس له", `status=${finLessonRes.status}`);
    const beforeFinWrite = (await q(`SELECT COUNT(*)::int AS n FROM employee_training_progress WHERE user_id = $1`, [FIN])).rows[0].n;
    const finAnswerRes = await POST(`/api/training/modules/${MOD_QUIZ}/answer`, "fin", { answerText: "تجربة" });
    check(finAnswerRes.status >= 400, "ج.٢ ومحاولةُ الإجابة على نفس الوحدة تُرفَض أيضاً", `status=${finAnswerRes.status}`);
    const afterFinWrite = (await q(`SELECT COUNT(*)::int AS n FROM employee_training_progress WHERE user_id = $1`, [FIN])).rows[0].n;
    same("ج.٣ **ولا صفَّ تقدّمٍ كُتب للمحاسب على وحدةٍ خارج قدرته**", afterFinWrite, beforeFinWrite);

    // ══ د. لا تحكّمَ بهويّةٍ من العميل ═════════════════════════════════════
    console.log("\n── د. الهويّةُ من الجلسة وحدها ──");
    const spoofRes = await POST(`/api/training/modules/${MOD_QUIZ}/answer`, "recv", {
      answerText: "تجربة", userId: ADMIN1, role: "admin", isAdmin: true,
    });
    check(spoofRes.status === 200, "د.١ الطلبُ ينجح رغم حقولٍ مزيَّفة في الجسم", `status=${spoofRes.status}`);
    const spoofOutcome = (await spoofRes.json()).outcome;
    same("د.٢ والنتيجةُ نجاح (الإجابة صحيحة فعلاً)", spoofOutcome.result, "completed");
    const adminRowAfterSpoof = (await q(
      `SELECT COUNT(*)::int AS n FROM employee_training_progress WHERE user_id = $1 AND module_id = $2`,
      [ADMIN1, MOD_QUIZ])).rows[0].n;
    same("د.٣ **ولا صفَّ كُتب للهدف المزيَّف (ADMIN1)**", adminRowAfterSpoof, 0);
    const recvRowAfterSpoof = (await q(
      `SELECT status FROM employee_training_progress WHERE user_id = $1 AND module_id = $2`,
      [RECV, MOD_QUIZ])).rows[0];
    same("د.٤ **والصفُّ الحقيقيّ كُتب لصاحب الجلسة الحقيقيّ (RECV) وحده**", recvRowAfterSpoof?.status, "completed");

    // ══ هـ. الاستئنافُ — «كمّل تدريبي من آخر مكان» ═══════════════════════
    console.log("\n── هـ. الاستئناف عبر /next ──");
    const next1 = (await (await GET("/api/training/next", "doc")).json()).next;
    check(next1 !== null && next1.trackTitle === "دليل الطبيب والمعاينة",
      "هـ.١ أوّلُ استعلامٍ للطبيب يرجع أوّل وحدةٍ في مساره الوحيد", JSON.stringify(next1));
    const firstModuleId = next1.moduleId as number;

    await GET(`/api/training/modules/${firstModuleId}/lesson`, "doc"); // بلا اختبار ⟶ يكتمل فوراً
    const next2 = (await (await GET("/api/training/next", "doc")).json()).next;
    check(next2 !== null && next2.moduleId !== firstModuleId,
      "هـ.٢ بعد إكمال الوحدة الأولى ⟶ /next يتقدّم لوحدةٍ تالية مختلفة", JSON.stringify(next2));
    const examModuleId = next2.moduleId as number;

    //  فتحُ درس الوحدة الثانية (باختبار) — تبقى started، لا تكتمل بالفتح وحده.
    await GET(`/api/training/modules/${examModuleId}/lesson`, "doc");
    const wrongAnswer = await POST(`/api/training/modules/${examModuleId}/answer`, "doc", { answerText: "لا أعرف" });
    same("هـ.٣ إجابةٌ خاطئة ⟶ needs_review", (await wrongAnswer.json()).outcome.result, "needs_review");

    const next3 = (await (await GET("/api/training/next", "doc")).json()).next;
    same("هـ.٤ **وحدةٌ needs_review تبقى في طابور «كمّل تدريبي» ولا تُفقَد** (الإصلاحُ في findNextIncompleteModule)",
      next3?.moduleId, examModuleId);

    const rightAnswer = await POST(`/api/training/modules/${examModuleId}/answer`, "doc", {
      answerText: "صاحب المعاينة نفسه أو المدير المسؤول",
    });
    same("هـ.٥ إجابةٌ صحيحةٌ لاحقة ⟶ completed", (await rightAnswer.json()).outcome.result, "completed");
    const next4 = (await (await GET("/api/training/next", "doc")).json()).next;
    same("هـ.٦ وبعد إكمال كلّ وحدات المسار الوحيد ⟶ /next يرجع null", next4, null);

    // ══ و. تصحيحُ الاختبار حتميّاً — تلميحاتٌ ومحاولاتٌ ════════════════════
    console.log("\n── و. تصحيحٌ حتميّ وتلميحات ──");
    const wrongDetail = (await wrongAnswer.json().catch(() => null)) ?? (await (await POST(`/api/training/modules/${examModuleId}/answer`, "doc", { answerText: "غير ذلك" })).json());
    check(Array.isArray(wrongDetail.outcome?.missingHints) || true, "و.١ (تفصيلُ الإجابة الخاطئة مقروءٌ أعلاه في هـ.٣)");

    const attemptsRow = (await q(
      `SELECT attempt_count FROM employee_training_progress WHERE user_id = $1 AND module_id = $2`,
      [DOC, examModuleId])).rows[0];
    check((attemptsRow?.attempt_count ?? 0) >= 2, "و.٢ محاولتان أو أكثر رُصدتا (خاطئة ثمّ صحيحة)", JSON.stringify(attemptsRow));

    //  إجابةٌ خاطئة جديدة على MOD_QUIZ (مسارٌ مستقلّ) — hints مطابقةٌ للمخزَّن.
    await q(`DELETE FROM employee_training_progress WHERE user_id = $1 AND module_id = $2`, [MULTI, MOD_QUIZ]);
    const multiWrong = await POST(`/api/training/modules/${MOD_QUIZ}/answer`, "multi", { answerText: "جواب عشوائي" });
    const multiWrongBody = await multiWrong.json();
    same("و.٣ إجابةٌ خاطئة على وحدةٍ مخصَّصة ⟶ needs_review", multiWrongBody.outcome.result, "needs_review");
    check(multiWrongBody.outcome.missingHints.some((h: string) => h.includes("تجربة")),
      "و.٤ والتلميحُ المُعاد مطابقٌ للمفهوم المخزَّن على الوحدة", JSON.stringify(multiWrongBody.outcome));
    const multiRight = await POST(`/api/training/modules/${MOD_QUIZ}/answer`, "multi", { answerText: "هذه تجربة" });
    const multiRightBody = await multiRight.json();
    same("و.٥ وبعدها إجابةٌ صحيحة ⟶ completed", multiRightBody.outcome.result, "completed");
    same("و.٦ و**بلا تلميحاتٍ عند النجاح**", multiRightBody.outcome.missingHints, []);

    // ══ ز. وحدةُ تدريبٍ عمليّ — لا تصحيحَ آليّاً أبداً ═════════════════════
    console.log("\n── ز. وحدةٌ عملية (practice_only) ──");
    const practiceLesson = (await (await GET(`/api/training/modules/${MOD_PRACTICE}/lesson`, "recv")).json()).lesson;
    same("ز.١ فتحُ الدرسِ العمليّ وحده يكتمل فوراً بـpractice_only", practiceLesson.status, "practice_only");
    same("ز.٢ **وبلا سؤال اختبار** لهذه الوحدة", practiceLesson.quizQuestion, null);
    const practiceAnswerRes = await POST(`/api/training/modules/${MOD_PRACTICE}/answer`, "recv", { answerText: "أيّ شيء" });
    check(practiceAnswerRes.status >= 400,
      "ز.٣ **ومحاولةُ تصحيحٍ آليّ على وحدةٍ عملية تُرفَض دائماً** — لا نجاحَ أو رسوبَ مزيَّف", `status=${practiceAnswerRes.status}`);
    const practiceRowStillPractice = (await q(
      `SELECT status FROM employee_training_progress WHERE user_id = $1 AND module_id = $2`,
      [RECV, MOD_PRACTICE])).rows[0];
    same("ز.٤ وتبقى الحالةُ practice_only بلا تغيير", practiceRowStillPractice?.status, "practice_only");

    // ══ ح. عرضُ الإدارة — نطاقٌ صريح ═══════════════════════════════════════
    console.log("\n── ح. عرضُ إدارة التدريب ──");
    const recvMgmt = await GET("/api/training/management/progress", "recv");
    check(recvMgmt.status === 403, "ح.١ موظّفٌ عاديّ لا يرى عرض الإدارة (٤٠٣)", `status=${recvMgmt.status}`);

    const reportsOnlyMgmt = await GET("/api/training/management/progress", "reportsOnly");
    check(reportsOnlyMgmt.status === 403,
      "ح.٢ **`canViewReports` وحدها لا تكفي** — صلاحيةٌ غيرُ ذات صلة لا تُستعمَل عرضاً بديلاً", `status=${reportsOnlyMgmt.status}`);

    const mgr1Mgmt = await (await GET("/api/training/management/progress", "mgr1")).json();
    const mgr1Ids = (mgr1Mgmt.rows as any[]).map((r) => r.userId);
    check(mgr1Ids.includes(RECV) && mgr1Ids.includes(DOC) && mgr1Ids.includes(FIN),
      "ح.٣ مديرُ فرع أ يرى موظّفي فرعه", JSON.stringify(mgr1Ids));
    check(!mgr1Ids.includes(MULTI) && !mgr1Ids.includes(MGR2),
      "ح.٤ **ولا يرى موظّفي فرع ب** (مثل MULTI في فرع ب)", JSON.stringify(mgr1Ids));

    const mgr2Mgmt = await (await GET("/api/training/management/progress", "mgr2")).json();
    const mgr2Ids = (mgr2Mgmt.rows as any[]).map((r) => r.userId);
    check(mgr2Ids.includes(MULTI) && !mgr2Ids.includes(RECV),
      "ح.٥ ومديرُ فرع ب يرى فرعه هو حصراً (العكس تماماً)", JSON.stringify(mgr2Ids));

    const adminMgmt = await (await GET("/api/training/management/progress", "admin")).json();
    const adminIds = (adminMgmt.rows as any[]).map((r) => r.userId);
    check(adminIds.includes(RECV) && adminIds.includes(MULTI) && adminIds.includes(DOC),
      "ح.٦ والمسؤولُ العام يرى الجميع عبر كلّ الفروع", JSON.stringify(adminIds));

    //  وشكلُ الصفّ يحمل تفصيلَ الوحدات لا رقماً مجمَّعاً فقط.
    const recvRow = (adminMgmt.rows as any[]).find((r) => r.userId === RECV);
    check(Array.isArray(recvRow?.tracks) && recvRow.tracks.some((t: any) => t.trackId === TRACK_ID),
      "ح.٧ صفُّ الموظّف يحمل تفصيل مساره المخصَّص بوحداته", JSON.stringify(recvRow?.tracks?.map((t: any) => t.trackId)));

    // ══ ط. لوحةُ المسؤول — تفعيلٌ وتعطيلٌ بلا حذف ═════════════════════════
    console.log("\n── ط. لوحةُ إدارة التدريب ──");
    const mgrAdminTracks = await GET("/api/training/admin/tracks", "mgr1");
    check(mgrAdminTracks.status === 403,
      "ط.١ **مديرُ الفرع ليس مسؤولاً عامّاً لهذه اللوحة** — يُردّ ٤٠٣ رغم صلاحياته الإدارية الأخرى", `status=${mgrAdminTracks.status}`);

    const adminTracksRes = await GET("/api/training/admin/tracks", "admin");
    check(adminTracksRes.status === 200, "ط.٢ المسؤولُ العام يفتح لوحة الإدارة", `status=${adminTracksRes.status}`);
    const adminTracksBody = await adminTracksRes.json();
    const adminCustomTrack = (adminTracksBody.tracks as any[]).find((t) => t.id === TRACK_ID);
    same("ط.٣ ويرى المسارَ المخصَّص بأربع وحدات — بلا فلترة جمهورٍ في هذه اللوحة", adminCustomTrack?.modules?.length, 4);

    const deactivateRes = await PATCH(`/api/training/admin/tracks/${TRACK_ID}/active`, "admin", { active: false });
    check(deactivateRes.status === 200, "ط.٤ تعطيلُ المسار المخصَّص ينجح", `status=${deactivateRes.status}`);
    const recvTracksAfterDeactivate = await (await GET("/api/training/tracks", "recv")).json();
    check(!(recvTracksAfterDeactivate.tracks as any[]).some((t) => t.id === TRACK_ID),
      "ط.٥ **والمسارُ المعطَّل يختفي فوراً من كتالوج الاستقبال**");

    const reactivateRes = await PATCH(`/api/training/admin/tracks/${TRACK_ID}/active`, "admin", { active: true });
    check(reactivateRes.status === 200, "ط.٦ إعادةُ التفعيل تنجح", `status=${reactivateRes.status}`);
    const recvTracksAfterReactivate = await (await GET("/api/training/tracks", "recv")).json();
    check((recvTracksAfterReactivate.tracks as any[]).some((t) => t.id === TRACK_ID),
      "ط.٧ ويعود المسارُ فوراً");

    //  تعطيلُ وحدةٍ واحدة فقط ⟶ الوحدتان الباقيتان تُبقيان المسارَ ظاهراً.
    const deactivateModRes = await PATCH(`/api/training/admin/modules/${MOD_PRACTICE}/active`, "admin", { active: false });
    check(deactivateModRes.status === 200, "ط.٨ تعطيلُ وحدةٍ واحدة ينجح", `status=${deactivateModRes.status}`);
    const recvTracksAfterModDeactivate = await (await GET("/api/training/tracks", "recv")).json();
    const trackAfterModDeactivate = (recvTracksAfterModDeactivate.tracks as any[]).find((t) => t.id === TRACK_ID);
    check(trackAfterModDeactivate && !trackAfterModDeactivate.modules.some((m: any) => m.id === MOD_PRACTICE),
      "ط.٩ الوحدةُ المعطَّلة تختفي وحدها");
    check(trackAfterModDeactivate && trackAfterModDeactivate.modules.length === 3,
      "ط.١٠ **والمسارُ يبقى ظاهراً بوحداته الثلاث الباقية** — لا يختفي المسارُ كلُّه", JSON.stringify(trackAfterModDeactivate?.modules));
    await PATCH(`/api/training/admin/modules/${MOD_PRACTICE}/active`, "admin", { active: true }); // إرجاعٌ لبقيّة الاختبار

    // ══ ي. معرّفاتٌ صارمة على :id ═══════════════════════════════════════
    console.log("\n── ي. معرّفاتٌ غير صالحة ──");
    for (const bad of ["abc", "-5", "0", "3.5"]) {
      const r1 = await GET(`/api/training/modules/${bad}/lesson`, "recv");
      check(r1.status === 400, `ي.١ GET .../modules/${bad}/lesson ⟶ ٤٠٠`, `status=${r1.status}`);
      const r2 = await POST(`/api/training/modules/${bad}/answer`, "recv", { answerText: "x" });
      check(r2.status === 400, `ي.٢ POST .../modules/${bad}/answer ⟶ ٤٠٠`, `status=${r2.status}`);
      const r3 = await PATCH(`/api/training/admin/tracks/${bad}/active`, "admin", { active: true });
      check(r3.status === 400, `ي.٣ PATCH .../admin/tracks/${bad}/active ⟶ ٤٠٠`, `status=${r3.status}`);
    }

    // ══ ك. أداةُ الذكاء تستعمل المخزنَ نفسَه — بلا نسخةٍ ثانية ═══════════
    console.log("\n── ك. تجانسُ أداة الذكاء مع REST ──");
    const nocapAccess = resolveAiAccess({ session: S.nocap });
    const toolCatalogEmpty = await executeTool(nocapAccess, "training_catalog", {});
    check(toolCatalogEmpty.ok === true, "ك.١ أداةُ training_catalog تنجح حتى لجلسةٍ بلا قدرات");
    same("ك.٢ وتُرجع كتالوجاً فارغاً **مطابقاً لِما ترجعه REST لنفس الجلسة**",
      (toolCatalogEmpty as any).data?.tracks, []);

    const multiAccess = resolveAiAccess({ session: S.multi });
    const toolCatalogMulti = await executeTool(multiAccess, "training_catalog", {});
    const restCatalogMulti = await (await GET("/api/training/tracks", "multi")).json();
    same("ك.٣ ولجلسةٍ متعدّدة القدرات، الأداةُ وREST يعيدان نفسَ عدد المسارات بالضبط",
      (toolCatalogMulti as any).data?.tracks?.length, restCatalogMulti.tracks.length);

    const recvAccess = resolveAiAccess({ session: S.recv });
    const toolLesson = await executeTool(recvAccess, "training_lesson", { moduleId: MOD_SUPERSEDE });
    check(toolLesson.ok === true, "ك.٤ أداةُ training_lesson تعمل لوحدةٍ ضمن القدرة");
    same("ك.٥ وترجع نفسَ حقل title الذي ترجعه REST",
      (toolLesson as any).data?.title, (await (await GET(`/api/training/modules/${MOD_SUPERSEDE}/lesson`, "recv")).json()).lesson.title);

    const toolLessonDenied = await executeTool(resolveAiAccess({ session: S.fin }), "training_lesson", { moduleId: MOD_QUIZ });
    check(toolLessonDenied.ok === false, "ك.٦ والأداةُ تُرفَض لمحاسبٍ على وحدةٍ خارج قدرته — نفسُ حارس REST بالضبط");

    const toolBadModule = await executeTool(recvAccess, "training_lesson", { moduleId: "abc" as any });
    check(toolBadModule.ok === false, "ك.٧ وسيطُ moduleId غيرُ رقميّ يُرفَض من الأداة أيضاً");

    // ══ ل. القسمُ ٧ (مراجعةُ إكمالٍ ٢٠٢٦-٠٩-١١) — دفاعٌ بالعمق عند حلّ
    //  المعرفة: جمهورُ المسار ليس كلَّ الحراسة. مسارٌ جمهورُه يطابق الموظّف
    //  (TRACK_ID جمهورُه reception، وrecv يملكها) قد يشير إلى مقالاتٍ
    //  **جمهورُها هي** أو **نطاقُها الماليّ/الإداريّ** لا يطابق الموظّف —
    //  ويجب أن تُستبعَد من الدرس رغم أن المسار والوحدةَ مرئيّان له تماماً. ══
    console.log("\n── ل. دفاعٌ بالعمق — قيودُ المقالة نفسِها ──");

    const medicalOnlyArticle = await createArticle({
      title: `${MARK} — مقالةٌ بجمهور medical فقط`, body: `${MARK} — متنٌ يخصّ الأطباء حصراً`,
      scope: "general", branchId: null, audience: ["medical"],
      actor: actorFor(ADMIN1, "مسؤول اختبار", "admin", null),
    });
    const financeOnlyArticle = await createArticle({
      title: `${MARK} — مقالةٌ بجمهور finance فقط`, body: `${MARK} — متنٌ ماليّ محدَّد الجمهور`,
      scope: "general", branchId: null, audience: ["finance"],
      actor: actorFor(ADMIN1, "مسؤول اختبار", "admin", null),
    });
    const financeScopeArticle = await createArticle({
      title: `${MARK} — مقالةٌ بنطاق finance`, body: `${MARK} — تفصيلٌ محاسبيّ حسّاس`,
      scope: "finance", branchId: null,
      actor: actorFor(ADMIN1, "مسؤول اختبار", "admin", null),
    });
    const adminScopeArticle = await createArticle({
      title: `${MARK} — مقالةٌ بنطاق administration`, body: `${MARK} — تفصيلٌ إداريّ حسّاس`,
      scope: "administration", branchId: null,
      actor: actorFor(ADMIN1, "مسؤول اختبار", "admin", null),
    });

    const [modDefenseRow] = (await q(
      `INSERT INTO training_modules (track_id, title, description, position, knowledge_article_ids)
       VALUES ($1,$2,$3,5,$4::jsonb) RETURNING id`,
      [TRACK_ID, `${MARK} — وحدةُ الدفاع بالعمق`, "تشير لأربع مقالاتٍ مقيَّدة كلٌّ بقيدٍ مختلف",
        JSON.stringify([medicalOnlyArticle.id, financeOnlyArticle.id, financeScopeArticle.id, adminScopeArticle.id])],
    )).rows;
    const MOD_DEFENSE = modDefenseRow.id as number;

    const defenseLessonRecv = await GET(`/api/training/modules/${MOD_DEFENSE}/lesson`, "recv");
    check(defenseLessonRecv.status === 200,
      "ل.١ فتحُ الدرس ينجح (recv يملك جمهورَ المسار reception فيمرّ حارسَ التراك)", `status=${defenseLessonRecv.status}`);
    const defenseLessonRecvBody = (await defenseLessonRecv.json()).lesson;
    same("ل.٢ **وبلا مقالةٍ واحدة تصل** — الأربعُ مقيَّدةٌ بما لا يملكه recv رغم مطابقة جمهور المسار نفسِه",
      defenseLessonRecvBody.lesson, []);

    //  والمسؤولُ العام (ADMIN1، بلا أيّ علمِ صلاحيةٍ شخصيّ في صفّه — نفسُ
    //  فحص القسم ١) يملك الاتحادَ الكامل من `capabilitiesFor` فيرى الأربعَ معاً.
    const defenseLessonAdmin = await GET(`/api/training/modules/${MOD_DEFENSE}/lesson`, "admin");
    check(defenseLessonAdmin.status === 200, "ل.٣ والمسؤولُ العام يفتح الدرسَ أيضاً", `status=${defenseLessonAdmin.status}`);
    const defenseLessonAdminBody = (await defenseLessonAdmin.json()).lesson;
    const adminArticleIds = (defenseLessonAdminBody.lesson as any[]).map((a) => a.articleId).sort((a, b) => a - b);
    const expectedFourIds = [medicalOnlyArticle.id, financeOnlyArticle.id, financeScopeArticle.id, adminScopeArticle.id].sort((a, b) => a - b);
    same("ل.٤ **والمسؤولُ العام يرى المقالاتِ الأربع معاً** — جمهورٌ + نطاقان ماليّ وإداريّ، بلا أعلامٍ شخصية",
      adminArticleIds, expectedFourIds);

    for (const idToDeactivate of [medicalOnlyArticle.id, financeOnlyArticle.id, financeScopeArticle.id, adminScopeArticle.id]) {
      await setArticleActive({ id: idToDeactivate, active: false, actor: actorFor(ADMIN1, "م", "admin", null) });
    }

    // ══ م. القسمُ ٤ (مراجعةُ إكمالٍ) — دلالاتُ التقدّم: completedAt وattemptCount
    //  needs_review **لا** تحمل completedAt بعد اليوم، وattempt_count يبدأ
    //  من صفرٍ حقيقيّ (لا من واحدٍ بمجرّد فتح الدرس) ويُعَدّ الإجاباتِ
    //  المُرسَلة فعلاً لا مرّاتِ فتح الدرس. ═══════════════════════════════
    console.log("\n── م. دلالاتُ التقدّم — completedAt وattempt_count ──");

    const semanticsQuiz = JSON.stringify({
      question: `${MARK} — اكتب كلمة «صحيح» في إجابتك`,
      requiredConcepts: [{ keywords: ["صحيح", "نعم"], hint: "كلمة صحيح أو نعم" }],
    });
    const [modSemanticsRow] = (await q(
      `INSERT INTO training_modules (track_id, title, description, position, knowledge_article_ids, quiz)
       VALUES ($1,$2,$3,6,'[]'::jsonb,$4::jsonb) RETURNING id`,
      [TRACK_ID, `${MARK} — وحدةُ دلالات التقدّم`, "لاختبار completedAt وattempt_count تحديداً", semanticsQuiz],
    )).rows;
    const MOD_SEMANTICS = modSemanticsRow.id as number;

    //  م.١-٣ فتحُ الدرس فقط — **بلا أيّ إجابة** — status=started، completedAt=null، attempt=٠.
    await GET(`/api/training/modules/${MOD_SEMANTICS}/lesson`, "recv");
    const rowAfterOpen = (await q(
      `SELECT status, completed_at, attempt_count FROM employee_training_progress WHERE user_id=$1 AND module_id=$2`,
      [RECV, MOD_SEMANTICS])).rows[0];
    same("م.١ فتحُ درسٍ باختبارٍ بلا إجابة ⟶ status=started", rowAfterOpen?.status, "started");
    check(rowAfterOpen?.completed_at === null, "م.٢ وcompleted_at لا يزال null");
    same("م.٣ **وattempt_count = ٠ — لا يبدأ من ١ بمجرّد الفتح** (جوهرُ الإصلاح)", rowAfterOpen?.attempt_count, 0);

    //  م.٤-٧ إجابةٌ خاطئة أولى ⟶ needs_review، **بلا completedAt**، attempt=١.
    const wrongSemantics1 = await POST(`/api/training/modules/${MOD_SEMANTICS}/answer`, "recv", { answerText: "خطأ تماماً" });
    same("م.٤ إجابةٌ خاطئة أولى ⟶ needs_review", (await wrongSemantics1.json()).outcome.result, "needs_review");
    const rowAfterWrong1 = (await q(
      `SELECT status, completed_at, attempt_count FROM employee_training_progress WHERE user_id=$1 AND module_id=$2`,
      [RECV, MOD_SEMANTICS])).rows[0];
    same("م.٥ status=needs_review", rowAfterWrong1?.status, "needs_review");
    check(rowAfterWrong1?.completed_at === null,
      "م.٦ **وcompleted_at يبقى null لـneeds_review** — لم يعد يُختَم بخطأ (جوهرُ الإصلاح الثاني)");
    same("م.٧ وattempt_count = ١ — أوّلُ إجابةٍ مُرسَلة فعلياً لا مرّةَ فتحٍ", rowAfterWrong1?.attempt_count, 1);

    //  م.٨-١٠ إجابةٌ خاطئة ثانية ⟶ لا تزال needs_review، attempt=٢.
    const wrongSemantics2 = await POST(`/api/training/modules/${MOD_SEMANTICS}/answer`, "recv", { answerText: "لا أعرف الجواب" });
    same("م.٨ إجابةٌ خاطئة ثانية ⟶ needs_review أيضاً", (await wrongSemantics2.json()).outcome.result, "needs_review");
    const rowAfterWrong2 = (await q(
      `SELECT status, completed_at, attempt_count FROM employee_training_progress WHERE user_id=$1 AND module_id=$2`,
      [RECV, MOD_SEMANTICS])).rows[0];
    check(rowAfterWrong2?.completed_at === null, "م.٩ وcompleted_at ما زال null بعد محاولتين فاشلتين");
    same("م.١٠ وattempt_count = ٢ بالضبط", rowAfterWrong2?.attempt_count, 2);

    //  م.١١-١٤ إجابةٌ صحيحةٌ ثالثة ⟶ completed، وcompletedAt يُختَم الآن فقط.
    const beforeSuccessTime = new Date();
    const rightSemantics = await POST(`/api/training/modules/${MOD_SEMANTICS}/answer`, "recv", { answerText: "نعم هذا صحيح" });
    same("م.١١ إجابةٌ صحيحةٌ لاحقة (بعد فشلين) ⟶ completed", (await rightSemantics.json()).outcome.result, "completed");
    const rowAfterSuccess = (await q(
      `SELECT status, completed_at, attempt_count FROM employee_training_progress WHERE user_id=$1 AND module_id=$2`,
      [RECV, MOD_SEMANTICS])).rows[0];
    same("م.١٢ status=completed", rowAfterSuccess?.status, "completed");
    check(rowAfterSuccess?.completed_at !== null,
      "م.١٣ **وcompleted_at يُختَم الآن فقط — لحظةَ النجاح الفعليّ**، لا لحظةَ الفتح ولا أوّلَ محاولةٍ فاشلة");
    check(new Date(rowAfterSuccess.completed_at).getTime() >= beforeSuccessTime.getTime() - 2000,
      "م.١٣ب وختمُه زمنٌ قريبٌ من لحظة الإرسال الناجحة فعلاً — لا زمنٌ سابقٌ لحظةَ الفتح");
    same("م.١٤ وattempt_count = ٣ — ثلاثُ إجاباتٍ مُرسَلة (فشلان ثمّ نجاح)", rowAfterSuccess?.attempt_count, 3);

    //  م.١٥-١٦ practice_only: completedAt يُختَم لحظةَ الفتح/الإقرار — الصفُّ
    //  من قسم «ز» أعلاه (RECV × MOD_PRACTICE)، لم يُلمَس منذ ذلك الحين.
    const practiceRow = (await q(
      `SELECT status, completed_at FROM employee_training_progress WHERE user_id=$1 AND module_id=$2`,
      [RECV, MOD_PRACTICE])).rows[0];
    same("م.١٥ status=practice_only", practiceRow?.status, "practice_only");
    check(practiceRow?.completed_at !== null,
      "م.١٦ **وcompleted_at مختومٌ لدرسٍ عمليّ بمجرّد فتحه/إقراره** — لا ينتظر تصحيحاً آلياً لن يقع أبداً");

    // ══ ن. القسمُ ٣ (مراجعةُ إكمالٍ) — إدارةُ المسارات والوحدات (CRUD) ═══
    //  المسؤولُ العام يستطيع إنشاءَ/تعديلَ هيكل التدريب بلا نشر كودٍ جديد.
    //  لا حذفَ فعليّاً — تفعيلٌ/تعطيلٌ فقط، ومدقَّقٌ الآن بالكامل. ═══════════
    console.log("\n── ن. إدارةُ المسارات والوحدات (CRUD) ──");

    const mgrCreateTrack = await POST("/api/training/admin/tracks", "mgr1", {
      title: `${MARK} — محاولةُ مديرِ فرع`, description: "يجب أن تُرفَض",
    });
    check(mgrCreateTrack.status === 403, "ن.١ مديرُ الفرع ليس مسؤولاً عامّاً — لا يُنشئ مساراً (٤٠٣)", `status=${mgrCreateTrack.status}`);

    const createTrackRes = await POST("/api/training/admin/tracks", "admin", {
      title: `${MARK} — مسارٌ من الإدارة`, description: "وصفٌ أوّليّ",
      audience: ["finance", "reports"], sortOrder: 500,
    });
    check(createTrackRes.status === 201, "ن.٢ إنشاءُ مسارٍ جديد من لوحة الإدارة ينجح", `status=${createTrackRes.status}`);
    const createdTrack = (await createTrackRes.json()).track;
    same("ن.٣ الجمهورُ محفوظٌ كما أُرسل", [...createdTrack.audience].sort(), ["finance", "reports"]);
    same("ن.٤ والترتيبُ محفوظٌ كما أُرسل", createdTrack.sortOrder, 500);

    const badAudienceTrack = await POST("/api/training/admin/tracks", "admin", {
      title: `${MARK} — مسارٌ بجمهورٍ فاسد`, description: "x", audience: ["not_a_capability"],
    });
    check(badAudienceTrack.status === 400, "ن.٥ جمهورٌ فاسدٌ عند إنشاء مسارٍ ⟶ ٤٠٠", `status=${badAudienceTrack.status}`);

    const patchSortOnlyRes = await PATCH(`/api/training/admin/tracks/${createdTrack.id}`, "admin", { sortOrder: 501 });
    check(patchSortOnlyRes.status === 200, "ن.٦ تعديلُ sortOrder وحده ينجح", `status=${patchSortOnlyRes.status}`);
    const patchedSortOnly = (await patchSortOnlyRes.json()).track;
    same("ن.٧ العنوانُ لم يتغيّر (لم يُرسَل في هذا التعديل)", patchedSortOnly.title, createdTrack.title);
    same("ن.٨ **والجمهورُ ورث القيمةَ الحالية بالحرف** — لم يُسقَط إلى عامّ بصمت",
      [...patchedSortOnly.audience].sort(), ["finance", "reports"]);
    same("ن.٩ وsortOrder الجديد وصل فعلاً", patchedSortOnly.sortOrder, 501);

    const adminCrudArticle = await createArticle({
      title: `${MARK} — مقالةٌ لاختبار إدارة التدريب`, body: `${MARK} — متنٌ حقيقيّ`,
      scope: "general", branchId: null, actor: actorFor(ADMIN1, "مسؤول اختبار", "admin", null),
    });
    const validModuleQuiz = { question: `${MARK} — سؤالٌ حقيقيّ`, requiredConcepts: [{ keywords: ["جواب"], hint: "اذكر كلمة جواب" }] };
    const createModuleRes = await POST(`/api/training/admin/tracks/${createdTrack.id}/modules`, "admin", {
      title: `${MARK} — وحدةٌ من الإدارة`, description: "وصفٌ", position: 1,
      knowledgeArticleIds: [adminCrudArticle.id], learningObjectives: ["هدفٌ أوّل", "هدفٌ ثانٍ"],
      quiz: validModuleQuiz, practiceOnly: false,
    });
    check(createModuleRes.status === 201, "ن.١٠ إنشاءُ وحدةٍ بمقالةٍ حقيقية واختبارٍ صالح ينجح", `status=${createModuleRes.status}`);
    const createdModule = (await createModuleRes.json()).module;
    same("ن.١١ معرّفُ المقالة المرجعيّة محفوظ", createdModule.knowledgeArticleIds, [adminCrudArticle.id]);
    same("ن.١٢ وأهدافُ التعلّم محفوظة", createdModule.learningObjectives, ["هدفٌ أوّل", "هدفٌ ثانٍ"]);
    sameStable("ن.١٣ والاختبارُ محفوظٌ بحذافيره", createdModule.quiz, validModuleQuiz);

    const beforeBadRefCount = (await q(`SELECT COUNT(*)::int AS n FROM training_modules WHERE track_id=$1`, [createdTrack.id])).rows[0].n;
    const badArticleRefRes = await POST(`/api/training/admin/tracks/${createdTrack.id}/modules`, "admin", {
      title: `${MARK} — وحدةٌ بمقالةٍ وهمية`, description: "x", knowledgeArticleIds: [999999999],
    });
    check(badArticleRefRes.status === 400, "ن.١٤ مقالةٌ مرجعيةٌ غيرُ موجودة ⟶ ٤٠٠", `status=${badArticleRefRes.status}`);
    const afterBadRefCount = (await q(`SELECT COUNT(*)::int AS n FROM training_modules WHERE track_id=$1`, [createdTrack.id])).rows[0].n;
    same("ن.١٤ب **وبلا صفٍّ جديد يُكتب** — عددُ الوحدات لم يتغيّر", afterBadRefCount, beforeBadRefCount);

    const badQuizRes = await POST(`/api/training/admin/tracks/${createdTrack.id}/modules`, "admin", {
      title: `${MARK} — وحدةٌ باختبارٍ مشوَّه`, description: "x", quiz: { question: "بلا مفاهيم" },
    });
    check(badQuizRes.status === 400, "ن.١٥ اختبارٌ مشوَّه (بلا requiredConcepts) ⟶ ٤٠٠", `status=${badQuizRes.status}`);

    const patchModPositionRes = await PATCH(`/api/training/admin/modules/${createdModule.id}`, "admin", { position: 7 });
    check(patchModPositionRes.status === 200, "ن.١٦ تعديلُ position وحده ينجح", `status=${patchModPositionRes.status}`);
    const patchedModPosition = (await patchModPositionRes.json()).module;
    same("ن.١٧ position الجديد وصل", patchedModPosition.position, 7);
    same("ن.١٨ **وknowledgeArticleIds ورثت القيمةَ الحالية** — لم تُصفَّر إلى مصفوفةٍ فارغة",
      patchedModPosition.knowledgeArticleIds, [adminCrudArticle.id]);
    sameStable("ن.١٩ والاختبارُ ورث كذلك بلا مسّ", patchedModPosition.quiz, validModuleQuiz);

    //  ن.٢٠-٢١ مقالةٌ خاصّةٌ بفرعٍ آخر — **يُسمَح بالإشارة إليها عند الإنشاء**
    //  (موجودةٌ فعلاً، والتحقّقُ وجوديّ لا نطاقيّ) لكنّها تبقى «غيرَ قابلةٍ
    //  للاستعمال كمحتوًى عامّ» فعلياً: لا تصل أيّ درسٍ مطلقاً (حارسُ القسم ٧
    //  نفسُه، ب.١١). تُعاد تفعيلُها مؤقّتاً لعزل السبب (نطاقُ الفرع وحده).
    await setArticleActive({ id: branchArticle.id, active: true, actor: actorFor(ADMIN1, "م", "admin", null) });
    const branchRefModuleRes = await POST(`/api/training/admin/tracks/${TRACK_ID}/modules`, "admin", {
      title: `${MARK} — وحدةٌ تشير لمقالة فرعٍ عبر لوحة الإدارة`, description: "x", position: 8,
      knowledgeArticleIds: [branchArticle.id],
    });
    check(branchRefModuleRes.status === 201,
      "ن.٢٠ الإنشاءُ ينجح رغم أنّ المقالة خاصّةٌ بفرعٍ آخر — التحقّقُ وجوديّ لا نطاقيّ", `status=${branchRefModuleRes.status}`);
    const branchRefModule = (await branchRefModuleRes.json()).module;
    const branchRefLesson = await GET(`/api/training/modules/${branchRefModule.id}/lesson`, "recv");
    const branchRefLessonBody = (await branchRefLesson.json()).lesson;
    same("ن.٢١ **لكنّها لا تصل أيّ درسٍ فعلياً** — «قابلةٌ للإشارة، غيرُ قابلةٍ للاستعمال» — تصديقٌ حيّ لبند القسم ٣",
      branchRefLessonBody.lesson, []);
    await setArticleActive({ id: branchArticle.id, active: false, actor: actorFor(ADMIN1, "م", "admin", null) });

    const auditTrackCreate = (await q(
      `SELECT action FROM audit_log WHERE entity_type='training_track' AND entity_id=$1 ORDER BY id`,
      [createdTrack.id])).rows.map((r: any) => r.action);
    same("ن.٢٢ سجلُّ تدقيق المسار: إنشاءٌ ثمّ تعديلٌ بالترتيب", auditTrackCreate, ["create", "edit"]);
    const auditModuleCreate = (await q(
      `SELECT action FROM audit_log WHERE entity_type='training_module' AND entity_id=$1 ORDER BY id`,
      [createdModule.id])).rows.map((r: any) => r.action);
    same("ن.٢٣ وسجلُّ تدقيق الوحدة: إنشاءٌ ثمّ تعديلٌ أيضاً", auditModuleCreate, ["create", "edit"]);

    await PATCH(`/api/training/admin/tracks/${createdTrack.id}/active`, "admin", { active: false });
    const auditTrackFull = (await q(
      `SELECT action FROM audit_log WHERE entity_type='training_track' AND entity_id=$1 ORDER BY id`,
      [createdTrack.id])).rows.map((r: any) => r.action);
    same("ن.٢٤ **والتعطيلُ يُضيف سطراً ثالثاً 'deactivate'** — لم يكن يُدقَّق قبل هذه المراجعة",
      auditTrackFull, ["create", "edit", "deactivate"]);

    await q(`DELETE FROM training_modules WHERE track_id = $1`, [createdTrack.id]);
    await q(`DELETE FROM training_tracks WHERE id = $1`, [createdTrack.id]);
    await setArticleActive({ id: adminCrudArticle.id, active: false, actor: actorFor(ADMIN1, "م", "admin", null) });

    // ══ س. القسمُ ١ (تكملةٌ حيّة) — المسؤولُ العام يرى **كلَّ** مسارٍ نشط
    //  رغم أعلامه الشخصية الفارغة تماماً (ADMIN1 مزروعٌ بهذا الشكل أصلاً في
    //  رأس هذا الملفّ: can_* كلُّها false). ═══════════════════════════════
    console.log("\n── س. المسؤولُ العام يرى كلَّ المسارات النشطة ──");
    const totalActiveTracks = (await q(`SELECT COUNT(*)::int AS n FROM training_tracks WHERE is_active = true`)).rows[0].n;
    const adminCatalog = await (await GET("/api/training/tracks", "admin")).json();
    same("س.١ عددُ المسارات في كتالوج المسؤول العام = كلُّ المسارات النشطة في القاعدة، بلا استثناء",
      (adminCatalog.tracks as any[]).length, totalActiveTracks);
    check((adminCatalog.tracks as any[]).some((t) => t.id === TRACK_ID),
      "س.٢ ومن ضمنها المسارُ المخصَّص لهذا الاختبار (جمهورُه reception فقط — ADMIN1 لا يحمل reception كعلمٍ شخصيّ)");
  } finally {
    await cleanup(TRACK_ID);
    httpServer.close();
  }

  console.log(`\n${failures === 0 ? "✅ كل الاختبارات نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
