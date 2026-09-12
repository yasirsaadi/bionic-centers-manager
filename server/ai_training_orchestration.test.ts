// تصحيحٌ إنتاجيّ — تنسيقُ محادثة التدريب: `npm run test:ai-training-orchestration`.
// مزوّدٌ مزيّف (نفسُ نمط server/ai_live_assistant.test.ts) فوق قاعدةٍ حقيقية
// (نفسُ نمط server/training.test.ts للمسارات والوحدات).
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) سؤالُ تقدّمٍ صِرف («وين وصلت بالتدريب؟») لا يفتح درساً ولا يسأل
//     اختباراً — training_lesson لا تُعرَض على النموذج لهذه الرسالة، ولو
//     حاول ناديها فالخادم يرفضها بلا تنفيذ.
// (٢) «دربني من البداية» — **عدائيّاً**: طلبُ الوحدة الثالثة يُرفَض بلا
//     تنفيذٍ (ليست tracks[0].modules[0])، ثمّ الوحدةُ الأولى الصحيحة
//     تُفتَح فعلاً — حتى لو كانت بلا اختبار، لا تُتخطَّى صامتة.
// (٣) وحدةٌ واحدة فقط تُفتَح في الرسالة الواحدة — محاولةُ فتح ثانية تُرفَض
//     حتى لو كانت هي الوحدةَ الصحيحة أصلاً.
// (٤) «كمّل تدريبي» — **عدائيّاً كذلك**: طلبُ وحدةٍ غير next يُرفَض بلا
//     تنفيذ، ثمّ رقمُ next نفسُه يُفتَح فعلاً — لا الأولى ولا ما بعد next.
// (٥) مسارُ الاختبار (training_lesson ⟶ training_submit_answer) سليمٌ
//     تماماً كما كان — بلا أثرٍ من هذا التصحيح، وبفتحٍ **مشروع** لوحدة
//     الاختبار (رسالةٌ عامّة بلا «من البداية» ولا «كمّل» — فلا يقيّدها
//     حارسُ الهويّة الجديد إطلاقاً؛ لا فتحاً مزيَّفاً عبر «من البداية»
//     يطلب وحدةً ثالثة كان يُقبل خطأً قبل هذا التصحيح).
// (٦) وتخطّي training_catalog قبل ملاحةٍ صريحة (نداءٌ لِـtraining_lesson
//     مباشرةً) يُرفَض بلا تنفيذ — لا مرجعَ لهويّةٍ صحيحة بعد.
//
// ══ ولا مسّ لدلالات الإكمال ولا لجداول التقدّم — الحرّاسُ الجدد على عدد
// نداءات training_lesson **وهويّتها** لهذه الرسالة وحدها، لا على ما تكتبه
// getModuleLesson. ومحاولةٌ مرفوضة (سواءٌ بسبب العدد أو الهويّة) لا تستهلك
// شيئاً ولا تكتب صفّاً — فمحاولةٌ خاطئة قابلةٌ للتصحيح في نفس الرسالة.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}

import { pool } from "./db";
import type * as provider from "./ai/provider";
import { aiChat } from "./ai/chat";
import { safeAiComplete } from "./ai/provider";
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

const MARK = "اختبار-تنسيق-التدريب";
const B1 = 9781;
const U_PROGRESS = 9782, U_START = 9783, U_TWOMODULES = 9784, U_CONTINUE = 9785, U_QUIZ = 9786,
  U_SKIP_CATALOG = 9787;
const ALL_USERS = [U_PROGRESS, U_START, U_TWOMODULES, U_CONTINUE, U_QUIZ, U_SKIP_CATALOG];

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}

async function cleanup(trackId?: number | null) {
  await q(`DELETE FROM employee_training_progress WHERE user_id = ANY($1::int[])`, [ALL_USERS]);
  if (trackId) {
    await q(`DELETE FROM training_modules WHERE track_id = $1`, [trackId]);
    await q(`DELETE FROM training_tracks WHERE id = $1`, [trackId]);
  }
  //  تنظيفٌ ذاتيّ الشفاء لتشغيلةٍ سابقة انقطعت في منتصفها — نفسُ حراسة
  //  server/training.test.ts.
  await q(`DELETE FROM training_modules WHERE track_id IN
             (SELECT id FROM training_tracks WHERE title LIKE $1)`, [`${MARK}%`]);
  await q(`DELETE FROM training_tracks WHERE title LIKE $1`, [`${MARK}%`]);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [ALL_USERS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [ALL_USERS]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

// ── مزوّدٌ مزيّف: يطلب ما نُمليه، ويرى ما يصله (نفسُ نمط ai_live_assistant.test.ts) ──
interface Scripted { toolCalls?: { name: string; input: any }[]; text?: string }
let script: Scripted[] = [];
let scriptIndex = 0;
const seen: { tools: string[]; results: any[] }[] = [];
const fakeStep = (async (p: any) => {
  const lastTurn = p.messages[p.messages.length - 1];
  const results = Array.isArray(lastTurn?.content)
    ? lastTurn.content.filter((b: any) => b.type === "tool_result")
      .map((b: any) => JSON.parse(b.content))
    : [];
  seen.push({ tools: (p.tools ?? []).map((t: any) => t.name), results });

  const step = script[scriptIndex] ?? { text: "انتهيت." };
  scriptIndex++;
  const calls = (step.toolCalls ?? []).map((c, i) =>
    ({ id: `t${scriptIndex}_${i}`, name: c.name, input: c.input }));
  return {
    text: step.text ?? "",
    toolCalls: calls,
    blocks: calls.map((c) => ({ type: "tool_use", id: c.id, name: c.name, input: c.input })),
  };
}) as unknown as typeof provider.aiToolStep;

const chat = (a: any, h: any) => aiChat(a, h, safeAiComplete, fakeStep);
function runScript(steps: Scripted[]) { script = steps; scriptIndex = 0; seen.length = 0; }

async function main() {
  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1,'فرع اختبار التدريب')
           ON CONFLICT (id) DO NOTHING`, [B1]);
  await q(`
    INSERT INTO system_users
      (id, username, password_hash, display_name, role, branch_id, is_active, can_add_patients)
    VALUES
      ($1,'orch-progress','x','م. تقدّم','reception',$7,true,true),
      ($2,'orch-start','x','م. بداية','reception',$7,true,true),
      ($3,'orch-two','x','م. وحدتان','reception',$7,true,true),
      ($4,'orch-continue','x','م. متابعة','reception',$7,true,true),
      ($5,'orch-quiz','x','م. اختبار','reception',$7,true,true),
      ($6,'orch-skip','x','م. تخطّي','reception',$7,true,true)
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, is_active = true
  `, [U_PROGRESS, U_START, U_TWOMODULES, U_CONTINUE, U_QUIZ, U_SKIP_CATALOG, B1]);

  const quiz = JSON.stringify({
    question: `${MARK} — اكتب كلمة «تجربة» في إجابتك`,
    requiredConcepts: [{ keywords: ["تجربة", "اختبار"], hint: "كلمة تجربة أو اختبار" }],
  });

  //  ══ sort_order سالبٌ عمداً ══════════════════════════════════════════
  //  الترحيلُ ٠٧٦ يزرع مساراتٍ حقيقية بجمهور «reception» (مثل «دليل
  //  الاستقبال والتسجيل») يراها أيُّ مستخدمِ اختبارٍ بقدرة الاستقبال. فلو
  //  رُتِّب مسارُنا خلفها لالتقط findNextIncompleteModule أوّلَ وحدةٍ غيرِ
  //  مكتملةٍ من مسارٍ لسنا نختبره، لا من مسارنا. سالبٌ يضمن أسبقيّته دائماً.
  const [track] = await q<{ id: number }>(
    `INSERT INTO training_tracks (title, description, audience, sort_order, created_by_name, approved_by_name)
     VALUES ($1,$2,'["reception"]'::jsonb,-1000,'اختبار','اختبار') RETURNING id`,
    [`${MARK} — مسار`, `${MARK} — لموظّفي الاستقبال`]);
  const TRACK_ID = track.id;

  const [modA] = await q<{ id: number }>(
    `INSERT INTO training_modules (track_id, title, description, position, knowledge_article_ids)
     VALUES ($1,$2,'بلا اختبار',1,'[]'::jsonb) RETURNING id`,
    [TRACK_ID, `${MARK} — الوحدة الأولى`]);
  const MOD_A = modA.id;

  const [modB] = await q<{ id: number }>(
    `INSERT INTO training_modules (track_id, title, description, position, knowledge_article_ids)
     VALUES ($1,$2,'بلا اختبار كذلك',2,'[]'::jsonb) RETURNING id`,
    [TRACK_ID, `${MARK} — الوحدة الثانية`]);
  const MOD_B = modB.id;

  const [modC] = await q<{ id: number }>(
    `INSERT INTO training_modules (track_id, title, description, position, knowledge_article_ids, quiz)
     VALUES ($1,$2,'باختبارٍ حتميّ',3,'[]'::jsonb,$3::jsonb) RETURNING id`,
    [TRACK_ID, `${MARK} — الوحدة الثالثة`, quiz]);
  const MOD_C = modC.id;

  const accessOf = (userId: number) => resolveAiAccess({
    session: {
      userId, role: "reception", isAdmin: false, branchId: B1, accessibleBranches: [B1],
      displayName: "م", permissions: { canAddPatients: true },
    },
    scopeBranchId: B1,
  });

  try {
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ١. سؤالُ تقدّمٍ صِرف — بلا فتح درسٍ ولا اختبار ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      runScript([
        { toolCalls: [{ name: "training_catalog", input: {} }] },
        //  محاولةٌ «متمرّدة» — كأنّ النموذج قرّر فتح درسٍ رغم أن الرسالة
        //  تقدّمٌ فقط. يجب أن تُرفَض بلا تنفيذ.
        { toolCalls: [{ name: "training_lesson", input: { moduleId: MOD_A } }] },
        { text: "لم تبدأ التدريب بعد — الوحدة الأولى بانتظارك." },
      ]);
      const res = await chat(accessOf(U_PROGRESS), [{ role: "user", content: "وين وصلت بالتدريب؟" }]);
      check(res.ok === true, "١.١. المحادثةُ تنجح");
      check(!(seen[0]?.tools ?? []).includes("training_lesson")
        && !(seen[1]?.tools ?? []).includes("training_lesson"),
        "١.٢. **training_lesson لا تُعرَض على النموذج طَوال هذه الرسالة**",
        JSON.stringify([seen[0]?.tools, seen[1]?.tools]));
      //  نتيجةُ محاولة training_lesson (المرسَلة في الجولة الثانية) تصل في
      //  طلب الجولة الثالثة — seen[2].
      const attempted = seen[2]?.results?.[0];
      check(typeof attempted?.error === "string", "١.٣. **ولو حاول رغم ذلك يُرفَض بلا تنفيذ**",
        JSON.stringify(attempted));
      const [row] = await q(
        `SELECT 1 FROM employee_training_progress WHERE user_id=$1 AND module_id=$2`,
        [U_PROGRESS, MOD_A]);
      check(!row, "١.٤. **ولا صفَّ تقدّمٍ كُتب** — لا أثر جانبيّ من المحاولة المرفوضة");
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ٢. «دربني من البداية» — رفضُ وحدةٍ خاطئة، ثمّ قبولُ الأولى فعلاً ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      runScript([
        { toolCalls: [{ name: "training_catalog", input: {} }] },
        //  محاولةٌ خاطئة — النموذجُ يطلب الوحدة الثالثة رغم أن «من
        //  البداية» تعني tracks[0].modules[0] تحديداً. يجب أن تُرفَض.
        { toolCalls: [{ name: "training_lesson", input: { moduleId: MOD_C } }] },
        //  ثمّ المحاولةُ الصحيحة — الوحدةُ الأولى فعلاً.
        { toolCalls: [{ name: "training_lesson", input: { moduleId: MOD_A } }] },
        { text: "هذه الوحدة الأولى — تتحدّث عن..." },
      ]);
      const res = await chat(accessOf(U_START), [{ role: "user", content: "دربني من البداية" }]);
      check(res.ok === true, "٢.١. المحادثةُ تنجح");

      const wrongAttempt = seen[2]?.results?.[0];
      check(typeof wrongAttempt?.error === "string",
        "٢.٢. **طلبُ الوحدة الثالثة يُرفَض بلا تنفيذ — «من البداية» تعني الأولى تحديداً**",
        JSON.stringify(wrongAttempt));
      const [rowC] = await q(
        `SELECT 1 FROM employee_training_progress WHERE user_id=$1 AND module_id=$2`,
        [U_START, MOD_C]);
      check(!rowC, "٢.٣. **ولا صفَّ تقدّمٍ للوحدة الثالثة** — لم تُفتَح رغم المحاولة");

      const lesson = seen[3]?.results?.[0];
      same("٢.٤. **والوحدةُ الأولى الصحيحة فُتحت فعلاً — لم يُتخطَّ الشرحُ صامتاً**",
        lesson?.title, `${MARK} — الوحدة الأولى`);
      const [row] = await q<{ status: string }>(
        `SELECT status FROM employee_training_progress WHERE user_id=$1 AND module_id=$2`,
        [U_START, MOD_A]);
      check(!!row, "٢.٥. وصفُّ تقدّمٍ كُتب فعلاً للوحدة الأولى");
      same("٢.٦. **واكتمل فوراً رغم أنه بلا اختبار — لم يُترَك started**", row?.status, "completed");
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ٣. لا يمكن التقدّم عبر وحدتين في رسالةٍ واحدة ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      runScript([
        { toolCalls: [{ name: "training_catalog", input: {} }] },
        { toolCalls: [{ name: "training_lesson", input: { moduleId: MOD_A } }] },
        //  الوحدةُ الأولى اكتملت فوراً (بلا اختبار) — فيحاول النموذج فتح
        //  الثانية في **نفس** الرسالة. يجب أن تُرفَض.
        { toolCalls: [{ name: "training_lesson", input: { moduleId: MOD_B } }] },
        { text: "اكتملت الوحدة الأولى." },
      ]);
      const res = await chat(accessOf(U_TWOMODULES), [{ role: "user", content: "دربني من البداية" }]);
      check(res.ok === true, "٣.١. المحادثةُ تنجح");
      const firstOpen = seen[2]?.results?.[0];
      same("٣.٢. **الوحدةُ الأولى فُتحت ونجحت فعلاً**",
        firstOpen?.title, `${MARK} — الوحدة الأولى`);
      const secondAttempt = seen[3]?.results?.[0];
      check(typeof secondAttempt?.error === "string",
        "٣.٣. **والمحاولةُ الثانية لِـtraining_lesson تُرفَض**", JSON.stringify(secondAttempt));
      const [rowA] = await q<{ status: string }>(
        `SELECT status FROM employee_training_progress WHERE user_id=$1 AND module_id=$2`,
        [U_TWOMODULES, MOD_A]);
      same("٣.٤. والوحدةُ الأولى بقيت مكتملةً كما فُتحت", rowA?.status, "completed");
      const [rowB] = await q(
        `SELECT 1 FROM employee_training_progress WHERE user_id=$1 AND module_id=$2`,
        [U_TWOMODULES, MOD_B]);
      check(!rowB, "٣.٥. **ولا صفَّ تقدّمٍ للوحدة الثانية إطلاقاً** — لم تُفتَح بصمت");
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ٤. «كمّل تدريبي» — رفضُ وحدةٍ ليست next، ثمّ قبولُها تحديداً ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      //  إعدادٌ: الوحدةُ الأولى مكتملةٌ سلفاً لهذا المستخدم.
      await q(
        `INSERT INTO employee_training_progress (user_id, track_id, module_id, status, completed_at)
         VALUES ($1,$2,$3,'completed',now())`,
        [U_CONTINUE, TRACK_ID, MOD_A]);

      //  استطلاعٌ بحتٌ (لا تدريبَ فيه) لمعرفة قيمة next الحقيقية — لبناء
      //  السيناريو العدائيّ التالي، لا جزءاً من الاختبار نفسِه.
      runScript([{ toolCalls: [{ name: "training_catalog", input: {} }] }]);
      await chat(accessOf(U_CONTINUE), [{ role: "user", content: "كمّل تدريبي" }]);
      const peek = seen[1]?.results?.[0];
      same("٤.١. **training_catalog.next يشير للوحدة الثانية تحديداً — لا الأولى ولا الثالثة**",
        peek?.next?.moduleId, MOD_B);

      runScript([
        { toolCalls: [{ name: "training_catalog", input: {} }] },
        //  محاولةٌ خاطئة — النموذجُ يطلب الوحدة الثالثة رغم أن «كمّل»
        //  تعني next تحديداً (الثانية هنا). يجب أن تُرفَض.
        { toolCalls: [{ name: "training_lesson", input: { moduleId: MOD_C } }] },
        //  ثمّ المحاولةُ الصحيحة — رقمُ next نفسُه.
        { toolCalls: [{ name: "training_lesson", input: { moduleId: peek.next.moduleId } }] },
        { text: "هذه الوحدة الثانية." },
      ]);
      const res = await chat(accessOf(U_CONTINUE), [{ role: "user", content: "كمّل تدريبي" }]);
      check(res.ok === true, "٤.٢. المحادثةُ تنجح");

      const wrongAttempt = seen[2]?.results?.[0];
      check(typeof wrongAttempt?.error === "string",
        "٤.٣. **طلبُ الوحدة الثالثة يُرفَض بلا تنفيذ — «كمّل» تعني next تحديداً**",
        JSON.stringify(wrongAttempt));
      const [rowC] = await q(
        `SELECT 1 FROM employee_training_progress WHERE user_id=$1 AND module_id=$2`,
        [U_CONTINUE, MOD_C]);
      check(!rowC, "٤.٤. **ولا صفَّ تقدّمٍ للوحدة الثالثة** — لم تُفتَح رغم المحاولة");

      const [rowB] = await q<{ status: string }>(
        `SELECT status FROM employee_training_progress WHERE user_id=$1 AND module_id=$2`,
        [U_CONTINUE, MOD_B]);
      same("٤.٥. **وفُتحت الوحدةُ الثانية الصحيحة فعلاً واكتملت**", rowB?.status, "completed");
      const [rowA] = await q<{ status: string }>(
        `SELECT status FROM employee_training_progress WHERE user_id=$1 AND module_id=$2`,
        [U_CONTINUE, MOD_A]);
      same("٤.٦. **والوحدةُ الأولى لم تُمَسّ** — بقيت على حالتها من الإعداد", rowA?.status, "completed");
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ٥. مسارُ الاختبار سليمٌ تماماً كما كان — على رسالتين حقيقيّتين ──");
    // ═══════════════════════════════════════════════════════════════════
    //  «اسأله إيّاه وانتظر إجابة الموظّف» يعني رسالتين منفصلتين فعلاً — لا
    //  نداءً ثالثاً في نفس الجولات. فهذا القسمُ يحاكي محادثةً حقيقية بردّين.
    //
    //  ══ «دربني» عامّةً — لا «من البداية» ═══════════════════════════════
    //  هذا القسمُ يفتح الوحدةَ الثالثة (وحدةَ الاختبار) عمداً لاختبار مسار
    //  الاختبار وحده. «من البداية» كانت ستُقيَّد بـtracks[0].modules[0]
    //  (الأولى، بلا اختبار) بعد التصحيح الأخير — فطلبُ الوحدة الثالثة تحتها
    //  كان سيصير تناقضاً يرفضه الخادمُ بنفس الحارس الذي يثبته القسمان ٢/٤.
    //  رسالةٌ عامّة («دربني» وحدها) لا تصنَّف ملاحةً صريحة إطلاقاً
    //  (`explicitTrainingNavigation` ترجع `null`)، فتبقى على سلوكها القائم
    //  بلا قيدٍ على هويّة الوحدة — وهذا هو الإعدادُ المشروع لسيناريو
    //  الاختبار، لا فتحاً وهمياً عبر نيّةٍ لا تنطبق.
    {
      runScript([
        { toolCalls: [{ name: "training_catalog", input: {} }] },
        { toolCalls: [{ name: "training_lesson", input: { moduleId: MOD_C } }] },
        { text: `${MARK} — سؤالُ الاختبار: اكتب كلمة «تجربة» في إجابتك` },
      ]);
      const historyA = [{ role: "user" as const, content: "دربني" }];
      const resA = await chat(accessOf(U_QUIZ), historyA);
      check(resA.ok === true, "٥.١. الرسالةُ الأولى تنجح — فتحُ الدرس");
      const lesson = seen[2]?.results?.[0];
      same("٥.٢. **الدرسُ حمل سؤالَ الاختبار الحقيقيّ**",
        lesson?.quizQuestion, `${MARK} — اكتب كلمة «تجربة» في إجابتك`);
      const [rowAfterOpen] = await q<{ status: string }>(
        `SELECT status FROM employee_training_progress WHERE user_id=$1 AND module_id=$2`,
        [U_QUIZ, MOD_C]);
      same("   وبقيت started بعد فتح الدرس — وحدةٌ باختبارٍ لا تكتمل بفتحها وحده",
        rowAfterOpen?.status, "started");

      //  الرسالةُ الثانية — إجابةُ الموظّف الحقيقية على السؤال الذي وصله.
      runScript([
        {
          toolCalls: [{
            name: "training_submit_answer",
            input: { moduleId: MOD_C, answerText: "هذه إجابةُ تجربة حقيقية" },
          }],
        },
        { text: "أحسنت." },
      ]);
      const historyB = [
        ...historyA,
        { role: "assistant" as const, content: resA.ok ? resA.value.reply : "" },
        { role: "user" as const, content: "هذه إجابةُ تجربة حقيقية" },
      ];
      const resB = await chat(accessOf(U_QUIZ), historyB);
      check(resB.ok === true, "٥.٣. والرسالةُ الثانية تنجح — تصحيحُ الإجابة");
      const grade = seen[1]?.results?.[0];
      same("٥.٤. **وتصحيحُ training_submit_answer حتميّ من الخادم**", grade?.result, "completed");
      const [rowAfterSubmit] = await q<{ status: string }>(
        `SELECT status FROM employee_training_progress WHERE user_id=$1 AND module_id=$2`,
        [U_QUIZ, MOD_C]);
      same("   وصفُّ التقدّم يعكس ذلك فعلاً", rowAfterSubmit?.status, "completed");
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ٦. تخطّي training_catalog قبل ملاحةٍ صريحة — يُرفَض بلا تنفيذ ──");
    // ═══════════════════════════════════════════════════════════════════
    //  نموذجٌ يقفز مباشرةً إلى training_lesson بلا نداء training_catalog
    //  أوّلاً — لا مرجعَ لهويّةٍ صحيحة بعد لِـ«من البداية»، فيُرفَض.
    {
      runScript([
        { toolCalls: [{ name: "training_lesson", input: { moduleId: MOD_A } }] },
        { text: "..." },
      ]);
      const res = await chat(accessOf(U_SKIP_CATALOG), [{ role: "user", content: "دربني من البداية" }]);
      check(res.ok === true, "٦.١. المحادثةُ تنجح");
      const attempt = seen[1]?.results?.[0];
      check(typeof attempt?.error === "string",
        "٦.٢. **والمحاولةُ تُرفَض بلا تنفيذ — training_catalog لم يُنادَ في هذه الرسالة**",
        JSON.stringify(attempt));
      const [row] = await q(
        `SELECT 1 FROM employee_training_progress WHERE user_id=$1 AND module_id=$2`,
        [U_SKIP_CATALOG, MOD_A]);
      check(!row, "٦.٣. **ولا صفَّ تقدّمٍ كُتب** — لا أثر جانبيّ من المحاولة المرفوضة");
    }

    console.log(`\n${failures === 0
      ? "✅ تنسيقُ محادثة التدريب صحيحٌ في كل الحالات"
      : `❌ ${failures} فشل`}`);
  } finally {
    await cleanup(TRACK_ID);
    await pool.end();
  }
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
