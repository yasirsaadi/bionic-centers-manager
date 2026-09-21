// اختبارُ أداة `device_sales_summary`: `npm run test:ai-device-sales`.
//
// يُنادي `executeTool`/`toolsFor` مباشرةً (نفسُ نمط `ai_tools_reports.test.ts`)
// فوق قاعدةٍ حقيقية، **ومعه قسمُ تنسيقٍ واحد بمزوّدٍ مزيّف** (نفسُ نمط
// `ai_training_orchestration.test.ts`) يثبت أن نتيجةَ الأداة الحقيقية تصل
// الجولةَ التي يصوغ فيها النموذجُ ردَّه النهائيّ.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (أ) بيعُ طرفٍ كاملٍ في بغداد داخل المدى **يُعَدّ**.
// (ب) وفرعٌ آخر **لا يلوّث** سؤالَ بغداد.
// (ج) وبيعُ جزء (قالب) **لا يُعَدّ**.
// (د) وصيانة **لا تُعَدّ**.
// (هـ) وعمليةٌ مُبطَلةٌ إدارياً **لا تُعَدّ** — بوسم الأمر أو بوسم الحلقة.
// (و) وبيعٌ خارج المدى **لا يُعَدّ**.
// (ز) وغيرُ المسؤول **لا يهرب من نطاقه** باسم فرعٍ ليس له — ولا يُكشَف له
//     وجودُ ذلك الفرع أصلاً.
// (ح) ومَن لا يملك `canViewReports` **لا تُعرَض له الأداة**، ونداؤه المباشر
//     يُردّ.
// (ط) **ولا مبلغَ في المخرَج إطلاقاً** — عددٌ فقط.
// (ي) وحلُّ الاسم: تطابقٌ تامّ يسبق الاحتواء، والالتباسُ يُقال ولا يُخمَّن.
// (ك) والتنسيق: نتيجةُ الأداة الحقيقية تصل الجولةَ النهائية.
// (م) والاسمُ القصير الفريد («بغداد») يُحَلّ داخل نطاقٍ من فرعٍ واحد —
//     **بالحلّال القائم بلا تعديل**، والمسؤولُ يراه ملتبساً فيُردّ.
// (ن) وعقدُ الإرشاد: قاعدةُ التوجيه في TOOL_TRUST_RULES (تصل الوضعين)،
//     وإرشادُ استخراج اسم الفرع في وصف الأداة.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}

import { pool } from "./db";
import type * as provider from "./ai/provider";
import { aiChat } from "./ai/chat";
import { safeAiComplete } from "./ai/provider";
import { executeTool, toolsFor } from "./ai/tools/registry";
import type { AiAccessContext } from "./ai/access";
import { readFileSync } from "fs";
import { toolProvenanceLabels } from "./ai/semantics";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const B_BAGHDAD = 9960, B_OTHER = 9961, B_THIRD = 9962, B_CAT = 9968;
const U_ADMIN = 9963, U_REPORTS = 9964, U_NO_REPORTS = 9965, U_EXPERT = 9966;
const P1 = 89601, P2 = 89602, P3 = 89603, P4 = 89604, P5 = 89605, P6 = 89606, P7 = 89607;
//  ══ تفصيلُ الأصناف (القسم ص) — إصبعان سليكونيّان وكفٌّ وثنائيٌّ ومسند ══
const P8 = 89608, P9 = 89609, P10 = 89610, P11 = 89611, P12 = 89612, P13 = 89613;
//  ثلاثةٌ يجب أن **تُستبعَد** من التفصيل كما تُستبعَد من العدّ — فالقسمُ ص٤
//  يُثبت أن التفصيلَ لم يُرخِ حارساً من حرّاس «بِيع».
const P14 = 89614, P15 = 89615, P16 = 89616;
const DOCTOR = 9967;
const ALL_P = [P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, P11, P12, P13, P14, P15, P16];
const ALL_U = [U_ADMIN, U_REPORTS, U_NO_REPORTS, U_EXPERT, DOCTOR];
const ALL_B = [B_BAGHDAD, B_OTHER, B_THIRD, B_CAT];
//  أسماءٌ مميَّزةٌ لهذه الحزمة: `branches.name` فريدٌ في القاعدة، وحزمٌ
//  مجاورة تُنشئ فرعاً اسمُه «بغداد». والعلاقةُ المُختبَرة (تطابقٌ تامّ
//  يسبق احتواءً، والتباسٌ حين يطابق الجزءُ اثنين) محفوظةٌ بحرفها.
const BAGHDAD_NAME = "بغداد فرع الاختبار";
const OTHER_NAME = "كربلاء فرع الاختبار";
//  **فرعُ القسم «ص» وحده** — فِكستشراتُ التفصيل لا تُزيح رقماً في
//  الأقسام القائمة، وتلك تبقى بحرفها: «بيعةٌ واحدة وكلُّ ما عداها مُستبعَد».
const CAT_NAME = "النجف فرع الاختبار";

async function q(sql: string, params: any[] = []) { return pool.query(sql, params); }

async function cleanup() {
  await q(`DELETE FROM medical_exams WHERE patient_id = ANY($1::int[])`, [ALL_P]);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN
             (SELECT id FROM prosthetic_work_orders WHERE patient_id = ANY($1::int[]))`, [ALL_P]);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id = ANY($1::int[])`, [ALL_P]);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id = ANY($1::int[])`, [ALL_P]);
  await q(`DELETE FROM patient_cases WHERE patient_id = ANY($1::int[])`, [ALL_P]);
  await q(`DELETE FROM patients WHERE id = ANY($1::int[])`, [ALL_P]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [ALL_U]);
  await q(`DELETE FROM branches WHERE id = ANY($1::int[])`, [ALL_B]);
}

function access(over: Partial<AiAccessContext> & { operationalBranches: number[] | null }): AiAccessContext {
  return {
    userId: U_REPORTS, role: "reception", isAdmin: false, branchId: null, branchName: null,
    permissions: {}, canUseFinance: false, mode: "general", financeScopeMissing: false,
    ...over,
  } as AiAccessContext;
}

/** يومٌ مضى، بلحظةٍ ظهريّة بتوقيت بغداد فلا تقع على حدٍّ ملتبس. */
function daysAgoBaghdadNoon(n: number): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(new Date());
  const ms = new Date(`${today}T00:00:00Z`).getTime() - n * 86400000;
  const d = new Date(ms).toISOString().slice(0, 10);
  //  ١٢:٠٠ بغداد = ٠٩:٠٠ UTC.
  return `${d}T09:00:00Z`;
}

/** أمرُ عملٍ بهويّةٍ كاملة — نكتب `created_at` صراحةً للتحكّم بالمدى. */
async function makeOrder(o: {
  patientId: number; branchId: number; serviceType?: string; purpose?: string;
  requestedItem?: string | null; createdAt: string;
  voidOrder?: boolean; voidEpisode?: boolean;
  /**
   * وصفةُ معاينةٍ **موقَّعةٍ على هذه الحلقة بعينها** — مصدرُ نوع البتر في
   * التفصيل (القسم ٤.q). وغيابُها يعني حلقةً بلا معاينةٍ فعّالة.
   */
  prescription?: Record<string, unknown>;
  /** معاينةٌ **ملغاة** (٠٦١) — لا تصنّف شيئاً. */
  cancelExam?: boolean;
}): Promise<{ orderId: number; episodeId: number | null }> {
  const caseType = (o.serviceType ?? "prosthetic") === "prosthetic" ? "prosthetic" : "medical_support";
  const cs = await q(
    `INSERT INTO patient_cases (patient_id, case_type, status, branch_id)
     VALUES ($1,$2,'active',$3) RETURNING id`, [o.patientId, caseType, o.branchId]);
  const caseId = cs.rows[0].id;

  let episodeId: number | null = null;
  if (o.requestedItem !== null) {
    const item = o.requestedItem ?? "full_device";
    const ep = await q(
      `INSERT INTO patient_device_episodes
         (patient_id, case_id, branch_id, sequence_number, status, requested_item, component,
          service_path, admin_void_reversal_id)
       VALUES ($1,$2,$3,1,'in_manufacturing',$4,$5,'exam',$6) RETURNING id`,
      [o.patientId, caseId, o.branchId, item, item === "full_device" ? null : item,
       o.voidEpisode ? 777001 : null]);
    episodeId = ep.rows[0].id;
  }

  if (o.prescription && episodeId !== null) {
    const ex = await q(
      `INSERT INTO medical_exams
         (patient_id, case_id, branch_id, case_type, doctor_id, doctor_name,
          chief_complaint, clinical_findings, diagnosis, plan, notes,
          prescription, device_episode_id, signed_at)
       VALUES ($1,$2,$3,$4,$5,'د. المعاين','شكوى','فحص','تشخيص','خطة','ملاحظة',
               $6::jsonb,$7,NOW()) RETURNING id`,
      [o.patientId, caseId, o.branchId, caseType, DOCTOR,
       JSON.stringify(o.prescription), episodeId]);
    if (o.cancelExam) {
      await q(`INSERT INTO medical_exam_cancellations
                 (exam_id, patient_id, branch_id, cancelled_by, cancelled_by_name, reason)
               VALUES ($1,$2,$3,$4,'د. المعاين','خطأ إدخال')`,
        [ex.rows[0].id, o.patientId, o.branchId, DOCTOR]);
    }
  }

  const wo = await q(
    `INSERT INTO prosthetic_work_orders
       (patient_id, branch_id, expert_user_id, service_type, purpose, status, current_stage,
        device_episode_id, admin_void_reversal_id, created_at)
     VALUES ($1,$2,$3,$4,$5,'active','order_received',$6,$7,$8) RETURNING id`,
    [o.patientId, o.branchId, U_EXPERT, o.serviceType ?? "prosthetic", o.purpose ?? "initial_build",
     episodeId, o.voidOrder ? 777002 : null, o.createdAt]);
  return { orderId: wo.rows[0].id, episodeId };
}

// ── مزوّدٌ مزيّف للقسم «ك» (نفسُ نمط ai_training_orchestration.test.ts) ──
interface Scripted { toolCalls?: { name: string; input: any }[]; text?: string }
let script: Scripted[] = [];
let scriptIndex = 0;
const seen: { tools: string[]; results: any[] }[] = [];
const fakeStep = (async (p: any) => {
  const lastTurn = p.messages[p.messages.length - 1];
  const results = Array.isArray(lastTurn?.content)
    ? lastTurn.content.filter((b: any) => b.type === "tool_result").map((b: any) => JSON.parse(b.content))
    : [];
  seen.push({ tools: (p.tools ?? []).map((t: any) => t.name), results });
  const step = script[scriptIndex] ?? { text: "انتهيت." };
  scriptIndex++;
  const calls = (step.toolCalls ?? []).map((c, i) => ({ id: `t${scriptIndex}_${i}`, name: c.name, input: c.input }));
  return {
    text: step.text ?? "", toolCalls: calls,
    blocks: calls.map((c) => ({ type: "tool_use", id: c.id, name: c.name, input: c.input })),
  };
}) as unknown as typeof provider.aiToolStep;
const chat = (a: any, h: any) => aiChat(a, h, safeAiComplete, fakeStep);

async function main() {
  await cleanup();

  await q(`INSERT INTO branches (id, name)
           VALUES ($1,'بغداد فرع الاختبار'),($2,'كربلاء فرع الاختبار'),
                  ($3,'بغداد فرع الاختبار الثاني'),($4,'النجف فرع الاختبار')
           ON CONFLICT (id) DO NOTHING`, [B_BAGHDAD, B_OTHER, B_THIRD, B_CAT]);
  await q(`
    INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, is_active,
                              can_view_reports, can_work_as_expert)
    VALUES
      ($1,'ds_admin','x','مسؤول المبيعات','admin',NULL,TRUE,TRUE,FALSE),
      ($2,'ds_rep','x','استقبال بتقارير','reception',$5,TRUE,TRUE,FALSE),
      ($3,'ds_norep','x','استقبال بلا تقارير','reception',$5,TRUE,FALSE,FALSE),
      ($4,'ds_expert','x','خبير','prosthetics_expert',$5,TRUE,FALSE,TRUE),
      ($6,'ds_doc','x','د. المعاين','doctor',$5,TRUE,FALSE,FALSE)
    ON CONFLICT (id) DO NOTHING`,
    [U_ADMIN, U_REPORTS, U_NO_REPORTS, U_EXPERT, B_BAGHDAD, DOCTOR]);

  for (const [pid, br] of [[P1, B_BAGHDAD], [P2, B_OTHER], [P3, B_BAGHDAD], [P4, B_BAGHDAD],
                           [P5, B_BAGHDAD], [P6, B_BAGHDAD], [P7, B_BAGHDAD],
                           [P8, B_CAT], [P9, B_CAT], [P10, B_CAT],
                           [P11, B_CAT], [P12, B_CAT], [P13, B_CAT],
                           [P14, B_CAT], [P15, B_CAT], [P16, B_CAT]] as [number, number][]) {
    await q(`INSERT INTO patients
               (id, name, phone, branch_id, is_amputee, referral_source, age, medical_condition)
             VALUES ($1,$2,'07700000000',$3,TRUE,'اختبار',30,'بتر') ON CONFLICT (id) DO NOTHING`,
      [pid, `مريض مبيعات ${pid}`, br]);
  }

  //  ① بغداد — طرفٌ كاملٌ داخل المدى (يُعَدّ)
  await makeOrder({ patientId: P1, branchId: B_BAGHDAD, createdAt: daysAgoBaghdadNoon(3) });
  //  ② فرعٌ آخر — طرفٌ كاملٌ داخل المدى (لا يلوّث بغداد)
  await makeOrder({ patientId: P2, branchId: B_OTHER, createdAt: daysAgoBaghdadNoon(3) });
  //  ③ بغداد — بيعُ جزء (قالب) داخل المدى (لا يُعَدّ)
  await makeOrder({ patientId: P3, branchId: B_BAGHDAD, requestedItem: "socket", createdAt: daysAgoBaghdadNoon(2) });
  //  ④ بغداد — صيانة داخل المدى (لا تُعَدّ)
  await makeOrder({ patientId: P4, branchId: B_BAGHDAD, purpose: "maintenance", createdAt: daysAgoBaghdadNoon(2) });
  //  ⑤ بغداد — طرفٌ كاملٌ مُبطَلٌ إدارياً بوسم الأمر (لا يُعَدّ)
  await makeOrder({ patientId: P5, branchId: B_BAGHDAD, createdAt: daysAgoBaghdadNoon(1), voidOrder: true });
  //  ⑥ بغداد — طرفٌ كاملٌ مُبطَلٌ إدارياً بوسم الحلقة (لا يُعَدّ)
  await makeOrder({ patientId: P6, branchId: B_BAGHDAD, createdAt: daysAgoBaghdadNoon(1), voidEpisode: true });
  //  ⑦ بغداد — طرفٌ كاملٌ **خارج** المدى (لا يُعَدّ في آخر ١٠ أيام)
  await makeOrder({ patientId: P7, branchId: B_BAGHDAD, createdAt: daysAgoBaghdadNoon(40) });
  //  ══ ⑧–⑫ تفصيلُ الأصناف (القسم ص) — كلُّها بغداد وداخل المدى ══
  //  ⑧+⑨ **إصبعان سليكونيّان** — سؤالُ المالك بعينه.
  await makeOrder({ patientId: P8, branchId: B_CAT, createdAt: daysAgoBaghdadNoon(4),
    prescription: { amputationType: "silicone", siliconePart: "اصبع" } });
  await makeOrder({ patientId: P9, branchId: B_CAT, createdAt: daysAgoBaghdadNoon(4),
    prescription: { amputationType: "silicone", siliconePart: "اصبع" } });
  //  ⑩ كفٌّ سليكونيّ — جزءٌ سليكونيٌّ آخر، فلا يُخلَط بالإصبع.
  await makeOrder({ patientId: P10, branchId: B_CAT, createdAt: daysAgoBaghdadNoon(4),
    prescription: { amputationType: "silicone", siliconePart: "كف" } });
  //  ⑩أ قالبٌ في فرع القسم — فيُقرأ جزءاً مبيعاً في تفصيله هو.
  await makeOrder({ patientId: P13, branchId: B_CAT, requestedItem: "socket",
    createdAt: daysAgoBaghdadNoon(6) });
  //  ⑪ **مسندٌ طبيٌّ كامل** — كان يُستبعَد كلّياً بشرط `service_type`.
  await makeOrder({ patientId: P11, branchId: B_CAT, serviceType: "medical_support",
    createdAt: daysAgoBaghdadNoon(5) });
  //  ⑫ **إصبعٌ سليكونيٌّ بمعاينةٍ ملغاة** (٠٦١) — الوصفةُ لا تحكم، فيُصنَّف
  //  «نوعٌ غير مسجَّل» ولا يُضاف إلى عدّ الأصابع.
  await makeOrder({ patientId: P12, branchId: B_CAT, createdAt: daysAgoBaghdadNoon(5),
    prescription: { amputationType: "silicone", siliconePart: "اصبع" }, cancelExam: true });
  //  ══ ⑬–⑮ ثلاثةٌ في الفرع نفسِه **يجب أن تُستبعَد** (القسم ص٤) ══
  //  ⑬ إصبعٌ سليكونيٌّ **مُبطَلٌ إدارياً** (٠٦٤) — وصفتُه سليمة، ومع ذلك لا يُعَدّ.
  await makeOrder({ patientId: P14, branchId: B_CAT, createdAt: daysAgoBaghdadNoon(5),
    prescription: { amputationType: "silicone", siliconePart: "اصبع" }, voidOrder: true });
  //  ⑭ إصبعٌ سليكونيٌّ **خارج المدى** — داخل الفرع لكن قبل أربعين يوماً.
  await makeOrder({ patientId: P15, branchId: B_CAT, createdAt: daysAgoBaghdadNoon(40),
    prescription: { amputationType: "silicone", siliconePart: "اصبع" } });
  //  ⑮ **صيانةُ** طرفٍ داخل المدى — خدمةٌ لا بيع.
  await makeOrder({ patientId: P16, branchId: B_CAT, purpose: "maintenance",
    createdAt: daysAgoBaghdadNoon(5) });

  const adminA = access({ isAdmin: true, role: "admin", userId: U_ADMIN, operationalBranches: null });
  const repA = access({ userId: U_REPORTS, permissions: { canViewReports: true }, operationalBranches: [B_BAGHDAD] });
  const noRepA = access({ userId: U_NO_REPORTS, permissions: {}, operationalBranches: [B_BAGHDAD] });

  const call = (a: AiAccessContext, input: any) => executeTool(a, "device_sales_summary", input);

  console.log("\n── أ+ب+ج+د+هـ+و: العدُّ ومَن يُستبعَد ──");
  const bag = await call(adminA, { days: 10, branchName: BAGHDAD_NAME });
  check(bag.ok === true, "أ.١ نداءٌ ناجح للمسؤول بفرعٍ بالاسم", JSON.stringify(bag.data));
  same("أ.٢ **بيعُ طرفٍ كاملٍ واحدٍ في بغداد داخل المدى**", (bag.data as any).totalSold, 1);
  same("أ.٣ والتسميةُ تقول الفرع", (bag.data as any).scopeLabel, `فرع ${BAGHDAD_NAME}`);
  same("أ.٤ والمدى عشرةُ أيام كما طُلب", (bag.data as any).days, 10);
  check(typeof (bag.data as any).startDate === "string" && typeof (bag.data as any).endDate === "string",
    "أ.٥ والخادمُ يُعيد التاريخين محسوبَين", JSON.stringify(bag.data));
  same("أ.٦ ولا تفصيلَ فروعٍ حين يُحدَّد فرع", (bag.data as any).byBranch, null);
  same("أ.٧ ولا أمرَ قديماً بلا هويّة في هذه الشجرة", (bag.data as any).unclassifiedLegacyOrders, 0);

  //  والبرهانُ أن الاستبعادات ليست صدفةً: الصفوفُ السبعة كلُّها موجودة.
  const raw = await q(
    `SELECT COUNT(*)::int AS n FROM prosthetic_work_orders WHERE patient_id = ANY($1::int[])`,
    [[P1, P2, P3, P4, P5, P6, P7]]);
  same("ب.١ **الصفوفُ السبعةُ كلُّها مُدرَجةٌ فعلاً** — فالعدُّ ١ استبعادٌ لا فراغ",
    raw.rows[0].n, 7);

  const other = await call(adminA, { days: 10, branchName: OTHER_NAME });
  same("ب.٢ وفرعٌ آخر يُعطي عدَّه هو", (other.data as any).totalSold, 1);
  same("ب.٣ **ولم يلوّث سؤالَ بغداد**", (bag.data as any).totalSold, 1);

  console.log("\n── ز: نطاقُ غير المسؤول ──");
  const repBag = await call(repA, { days: 10, branchName: BAGHDAD_NAME });
  same("ز.١ الاستقبالُ يرى فرعَه", (repBag.data as any).totalSold, 1);
  const escape = await call(repA, { days: 10, branchName: OTHER_NAME });
  check(escape.ok === false, "ز.٢ **ولا يهرب إلى فرعٍ خارج نطاقه**", JSON.stringify(escape.data));
  const msg = String((escape.data as any)?.error ?? "");
  check(/ضمن نطاقك/.test(msg), "ز.٣ والرسالةُ محايدة: «ضمن نطاقك»", msg);
  check(!/موجود|ممنوع|غير مصرح لك برؤية/.test(msg),
    "ز.٤ **ولا تُقرّ بوجود الفرع ولا تكشف بياناته**", msg);
  const repNoName = await call(repA, { days: 10 });
  same("ز.٥ وبلا اسمٍ يبقى على نطاقه وحده", (repNoName.data as any).totalSold, 1);
  same("ز.٦ ولا تفصيلَ فروعٍ لغير المسؤول", (repNoName.data as any).byBranch, null);
  same("ز.٧ وتسميتُه تقول نطاقه", (repNoName.data as any).scopeLabel, "الفروع المصرّح لك بها");

  console.log("\n── ح: الصلاحية ──");
  check(!toolsFor(noRepA).some((t) => t.name === "device_sales_summary"),
    "ح.١ **لا تُعرَض لمن لا يملك canViewReports**");
  check(toolsFor(repA).some((t) => t.name === "device_sales_summary"),
    "ح.٢ وتُعرَض لمن يملكها");
  check(toolsFor(adminA).some((t) => t.name === "device_sales_summary"),
    "ح.٣ وللمسؤول العام");
  const direct = await call(noRepA, { days: 10 });
  check(direct.ok === false, "ح.٤ **ونداءٌ مباشرٌ متجاوزاً toolsFor يُردّ أيضاً**", JSON.stringify(direct.data));
  //  ولا تُقاس بصلاحيةٍ مالية: محاسبٌ بلا canViewReports يبقى محجوباً.
  const financeOnly = access({
    userId: U_NO_REPORTS, role: "accountant", permissions: { canManageAccounting: true },
    canUseFinance: true, mode: "financial", branchId: B_BAGHDAD, operationalBranches: [B_BAGHDAD],
  });
  check(!toolsFor(financeOnly).some((t) => t.name === "device_sales_summary"),
    "ح.٥ **وليست صلاحيةً مالية** — الوضعُ الماليُّ وحده لا يفتحها");

  console.log("\n── ط: لا مبلغَ في المخرَج ──");
  const blob = JSON.stringify(bag.data);
  const keys = Object.keys(bag.data as any).sort();
  same("ط.١ الحقولُ المُعادة محدّدةٌ بالضبط", keys,
    ["byBranch", "byCategory", "days", "endDate", "scopeLabel", "startDate",
     "totalSold", "totals", "unclassifiedLegacyOrders"]);
  check(!/cost|price|amount|agreed|paid|سعر|مبلغ|كلفة|دينار/i.test(blob),
    "ط.٢ **ولا أثرَ لأيّ حقلٍ ماليّ**", blob);
  check(!/name|phone|patient|مريض|هاتف/i.test(blob.replace(/branchName|scopeLabel/g, "")),
    "ط.٣ ولا اسمَ مريضٍ ولا هاتف", blob);

  console.log("\n── ي: حلُّ الاسم ──");
  //  «بغداد» تطابق «بغداد» تماماً و«بغداد الجديدة» احتواءً — التامُّ يفوز.
  const exact = await call(adminA, { days: 10, branchName: BAGHDAD_NAME });
  check(exact.ok === true && (exact.data as any).scopeLabel === `فرع ${BAGHDAD_NAME}`,
    "ي.١ **التطابقُ التامّ يسبق الاحتواء**", JSON.stringify(exact.data));
  const ambiguous = await call(adminA, { days: 10, branchName: "بغداد فرع" });
  check(ambiguous.ok === false, "ي.٢ **والالتباسُ يُردّ ولا يُخمَّن**", JSON.stringify(ambiguous.data));
  check(/أكثر من فرع/.test(String((ambiguous.data as any)?.error ?? "")),
    "ي.٣ والرسالةُ تقول إنه التباس", JSON.stringify(ambiguous.data));
  const missing = await call(adminA, { days: 10, branchName: "فرعٌ لا وجود له" });
  check(missing.ok === false, "ي.٤ واسمٌ لا يطابق شيئاً يُردّ", JSON.stringify(missing.data));
  //  والتطبيعُ العربيّ يعمل (ألفٌ بهمزة، تاءٌ مربوطة…).
  const norm = await call(adminA, { days: 10, branchName: `  ${BAGHDAD_NAME}  ` });
  check(norm.ok === true, "ي.٥ والمسافاتُ الزائدة لا تُفشل الحلّ", JSON.stringify(norm.data));
  //  ومدخلٌ مشوَّه يفشل مغلقاً لا يُقرأ غياباً.
  for (const bad of [0, -1, 1.5, "", "عشرة", true, {}]) {
    const r = await call(adminA, { days: bad as any });
    check(r.ok === false, `ي.٦ days=${JSON.stringify(bad)} يُردّ صراحةً`, JSON.stringify(r.data));
  }
  const tooLong = await call(adminA, { days: 500 });
  check(tooLong.ok === false, "ي.٧ ومدىً أطول من الحدّ يُردّ", JSON.stringify(tooLong.data));
  const emptyName = await call(adminA, { days: 10, branchName: "   " });
  check(emptyName.ok === false, "ي.٨ واسمُ فرعٍ فارغٌ صراحةً يُردّ", JSON.stringify(emptyName.data));

  console.log("\n── تفصيلُ الفروع للمسؤول بلا اسم ──");
  const allB = await call(adminA, { days: 10 });
  const bb = ((allB.data as any).byBranch ?? []) as any[];
  check(Array.isArray(bb) && bb.length > 0, "ك.٠ المسؤولُ بلا اسمٍ يحصل على تفصيلٍ لكلّ فرع");
  same("ك.٠أ وبغدادُ فيه بواحد", bb.find((x) => x.branchId === B_BAGHDAD)?.sold, 1);
  same("ك.٠ب وكربلاءُ بواحد", bb.find((x) => x.branchId === B_OTHER)?.sold, 1);
  same("ك.٠ج و«بغداد الجديدة» بصفر", bb.find((x) => x.branchId === B_THIRD)?.sold, 0);

  console.log("\n── ص: **تفصيلُ الأصناف** — العطبُ الذي وُلد لأجله هذا القسم ──");
  //  الواقعة: سأل المالكُ «كم إصبعاً سليكونياً بِيع؟» فاعتذر المساعدُ عن
  //  رقمٍ موجودٍ في القاعدة، لأن الأداةَ كانت تُرجع عدداً إجمالياً واحداً
  //  للأطراف الكاملة وحدها.
  const cat = await call(adminA, { days: 10, branchName: CAT_NAME });
  const rows = ((cat.data as any).byCategory ?? []) as any[];
  const sold = (k: string) => rows.find((r) => r.key === k)?.sold ?? 0;
  const labelOf = (k: string) => rows.find((r) => r.key === k)?.label ?? null;

  same("ص.١ **الإصبعُ السليكونيُّ اثنان — والسؤالُ صار له جواب**",
    sold("prosthetic_full:silicone:اصبع"), 2);
  same("ص.٢ وعنوانُه عربيٌّ جاهزٌ للقراءة",
    labelOf("prosthetic_full:silicone:اصبع"), "اطراف سليكونية تعويضية — اصبع");
  same("ص.٣ **والكفُّ صنفٌ آخر لا يُخلَط به**", sold("prosthetic_full:silicone:كف"), 1);
  same("ص.٤ **والمسندُ الطبيُّ الكامل يظهر** — كان مُستبعَداً كلّياً", sold("support_full"), 1);
  same("ص.٥ وعنوانُه", labelOf("support_full"), "مسند طبي كامل");
  same("ص.٦ **والقالبُ يظهر باسمه** — كان مُستبعَداً بشرط full_device",
    sold("prosthetic_part:socket"), 1);
  same("ص.٧ وعنوانُه من المعجم القانونيّ", labelOf("prosthetic_part:socket"), "القالب");

  console.log("\n── ص٢: **ولا يُخمَّن تصنيفٌ ولا يُسقَط صفّ** ──");
  //  P1 طرفٌ كاملٌ بلا معاينة، وP12 طرفٌ كاملٌ بمعاينةٍ **ملغاة** — اثنان.
  same("ص٢.١ **معاينةٌ ملغاة لا تحكم** — فالإصبعُ الملغى لا يُضاف إلى الأصابع",
    sold("prosthetic_full:silicone:اصبع"), 2);
  same("ص٢.٢ ويُقال «نوعٌ غير مسجَّل» صراحةً لا يُسقَط",
    sold("prosthetic_full:unrecorded"), 1);
  same("ص٢.٣ وعنوانُه يقول ذلك للقارئ",
    labelOf("prosthetic_full:unrecorded"), "طرف صناعي كامل — نوعٌ غير مسجَّل");
  check(!rows.some((r) => r.key === "unclassified"),
    "ص٢.٤ ولا صفَّ «غير مصنّف» في شجرةٍ سليمة", JSON.stringify(rows));

  console.log("\n── ص٣: **والمجاميعُ تتصالح — رقمان من استعلامين** ──");
  const totals = (cat.data as any).totals;
  same("ص٣.١ **مجموعُ الأطراف الكاملة = totalSold بالضبط**",
    [totals.prostheticFullDevices, (cat.data as any).totalSold], [4, 4]);
  same("ص٣.٢ والأجزاءُ واحد", totals.prostheticComponents, 1);
  same("ص٣.٣ والمساندُ واحد", totals.medicalSupportDevices, 1);
  same("ص٣.٤ **ومجموعُ كلّ الصفوف = مجموعُ الثلاثة** — لا صنفَ خارج الحساب",
    rows.reduce((n, r) => n + r.sold, 0),
    totals.prostheticFullDevices + totals.prostheticComponents + totals.medicalSupportDevices);
  const fullFromRows = rows.filter((r) => r.serviceType === "prosthetic" && r.scope === "full")
    .reduce((n, r) => n + r.sold, 0);
  same("ص٣.٥ **وتفصيلُ نوع البتر يجمع إلى الأطراف الكاملة نفسِها**",
    fullFromRows, (cat.data as any).totalSold);

  console.log("\n── ص٤: **وما يُستبعَد يبقى مُستبعَداً بحرفه** ──");
  //  الصيانةُ والمُبطَلُ إدارياً وما خرج عن المدى: التفصيلُ لا يُرخي حارساً.
  //  في هذا الفرع **تسعةُ أوامر**: ستّةٌ تُفصَّل، وثلاثةٌ تُستبعَد بحُرّاسها —
  //  مُبطَلٌ إدارياً · خارجُ المدى · صيانة. ووصفةُ الثلاثةِ الأولى سليمةٌ تقول
  //  «إصبع سليكوني»، فلو أرخى التفصيلُ حارساً لقفز عدُّ الأصابع من ٢ إلى ٤.
  const allInBranch = await q(
    `SELECT COUNT(*)::int AS n FROM prosthetic_work_orders WHERE branch_id = $1`, [B_CAT]);
  const detailed = rows.reduce((n, r) => n + r.sold, 0);
  same("ص٤.١ **والتفصيلُ لم يُرخِ حارساً** — تسعةُ أوامرَ، ستّةٌ تُفصَّل وثلاثةٌ تُستبعَد",
    [allInBranch.rows[0].n, detailed], [9, 6]);
  same("ص٤.٢ **والأصابعُ اثنان لا أربعة** — فالمُبطَلُ وخارجُ المدى لم يُعَدّا رغم وصفتهما السليمة",
    sold("prosthetic_full:silicone:اصبع"), 2);
  //  وفرعٌ آخر لا يلوّث تفصيلَ هذا الفرع: بغدادُ فيها طرفٌ كاملٌ واحد وقالبٌ
  //  واحد — صفّان لا أكثر، وبلا إصبعٍ سليكونيٍّ ولا مسند.
  const bagCat = ((await call(adminA, { days: 10, branchName: BAGHDAD_NAME })).data as any).byCategory as any[];
  same("ص٤.٣ **وفرعٌ آخر لا يلوّث تفصيلَ هذا الفرع**",
    bagCat.map((r) => [r.key, r.sold]).sort(),
    [["prosthetic_full:unrecorded", 1], ["prosthetic_part:socket", 1]].sort());

  console.log("\n── ص٥: **ولا مبلغَ تسرّب مع التفصيل** ──");
  const catBlob = JSON.stringify(cat.data);
  check(!/cost|price|amount|agreed|paid|سعر|مبلغ|كلفة|دينار/i.test(catBlob),
    "ص٥.١ لا حقلَ ماليّ", catBlob);
  check(!/مريض|هاتف|WB-/.test(catBlob), "ص٥.٢ ولا اسمَ مريضٍ ولا رمزَه", catBlob);
  const repCat = await call(repA, { days: 10 });
  same("ص٥.٣ **وغيرُ المسؤول يحصل على تفصيلِ نطاقه لا أكثر** — بغدادُ وحدها",
    ((repCat.data as any).byCategory as any[]).map((r) => [r.key, r.sold]).sort(),
    [["prosthetic_full:unrecorded", 1], ["prosthetic_part:socket", 1]].sort());

  console.log("\n── ص٦: عقدُ الإرشاد للتفصيل ──");
  const regSrcCat = readFileSync("server/ai/tools/registry.ts", "utf8");
  const descAt = regSrcCat.indexOf('name: "device_sales_summary"');
  const desc = regSrcCat.slice(descAt, descAt + 4000);
  check(/byCategory/.test(desc), "ص٦.١ الوصفُ يذكر byCategory");
  check(/اصبع/.test(desc), "ص٦.٢ **ويضرب مثلَ الإصبع السليكونيّ بعينه**");
  check(/totals/.test(desc) && /لا تجمع بنفسك/.test(desc),
    "ص٦.٣ ويأمر بنقل المجاميع الجاهزة لا جمعها");
  check(/غير مسجَّل/.test(desc) && /توزّعها على الأنواع/.test(desc),
    "ص٦.٤ **وينهى عن توزيع «غير مسجَّل» على الأنواع**");
  const chatSrcCat = readFileSync("server/ai/chat.ts", "utf8");
  check(/لا تعتذر عن رقمٍ تحمله الأداة/.test(chatSrcCat),
    "ص٦.٥ **وقاعدةُ التوجيه تنهى عن الاعتذار عن رقمٍ موجود** — وهو ما وقع فعلاً");

  console.log("\n── التزويد ──");
  same("ل.١ للأداة تسميةٌ عربية في آليّة التزويد القائمة",
    toolProvenanceLabels(["device_sales_summary"]), ["عدد الأطراف المباعة"]);

  console.log("\n── ك: التنسيق — نتيجةُ الأداة تصل الردَّ النهائيّ ──");
  script = [
    { toolCalls: [{ name: "device_sales_summary", input: { days: 10, branchName: BAGHDAD_NAME } }] },
    { text: "خلال آخر ١٠ أيام بِيع طرفٌ صناعيٌّ كاملٌ واحد في فرع بغداد." },
  ];
  scriptIndex = 0; seen.length = 0;
  const out = await chat(adminA, [{ role: "user", content: "كم طرف تم بيعه في مركز بغداد خلال آخر عشرة أيام؟" }]);
  check(out.ok === true, "ك.١ المحادثةُ نجحت", JSON.stringify(out).slice(0, 300));
  check((seen[0]?.tools ?? []).includes("device_sales_summary"),
    "ك.٢ **والأداةُ عُرضت على النموذج** لهذه الرسالة", JSON.stringify(seen[0]?.tools));
  const fed = seen[1]?.results ?? [];
  check(fed.length === 1, "ك.٣ ونتيجةٌ واحدة غُذّيت للجولة التالية", JSON.stringify(fed));
  same("ك.٤ **وهي نتيجةُ الأداة الحقيقية لا نصٌّ ملفَّق** — العدد", fed[0]?.totalSold, 1);
  same("ك.٥ وبنطاقها الصحيح", fed[0]?.scopeLabel, `فرع ${BAGHDAD_NAME}`);
  same("ك.٦ وبمداها الصحيح", fed[0]?.days, 10);
  check(!/cost|price|amount|سعر|مبلغ/i.test(JSON.stringify(fed)),
    "ك.٧ **ولا مبلغَ فيما وصل النموذج**", JSON.stringify(fed));
  const usedNames = ((out as any).value?.toolsUsed ?? []) as string[];
  check(usedNames.includes("عدد الأطراف المباعة"),
    "ك.٨ والتزويدُ يقول للمستخدم مصدرَه بالعربية", JSON.stringify(usedNames));

  console.log("\n── م: الاسمُ القصير الفريد داخل نطاقٍ من فرعٍ واحد ──");
  //  سؤالُ المالك يقول «مركز بغداد»، والنموذجُ يمرّر «بغداد» وحدها (إرشادُ
  //  وصف الأداة). فالمطلوبُ إثباتُ أن **الحلّالَ القائم يكفي**: موظّفٌ غيرُ
  //  مسؤولٍ نطاقُه فرعُ بغداد وحده يمرّر الاسمَ القصير فيُحَلّ ويُعطي عدَّ
  //  فرعه — بلا مِحلِّلٍ جديد ولا تعديلٍ في الحلّال.
  const shortName = await call(repA, { days: 10, branchName: "بغداد" });
  check(shortName.ok === true, "م.١ **الاسمُ القصير «بغداد» يُحَلّ لغير المسؤول داخل نطاقه**",
    JSON.stringify(shortName.data));
  same("م.٢ ويُعطي عدَّ فرعه هو", (shortName.data as any).totalSold, 1);
  same("م.٣ والتسميةُ تُظهر الاسمَ المخزَّن كاملاً", (shortName.data as any).scopeLabel, `فرع ${BAGHDAD_NAME}`);
  same("م.٤ ولا تفصيلَ فروعٍ لغير المسؤول", (shortName.data as any).byBranch, null);
  //  **والنجاحُ سببُه ضيقُ النطاق لا تساهلُ الحلّال**: نفسُ الاسم القصير،
  //  ونفسُ الحلّال، لموظّفٍ نطاقُه يحوي فرعَي بغداد معاً ⟵ **ملتبسٌ فيُردّ**.
  //  والمقارنةُ داخل صفوف هذه الحزمة وحدها — لا تعتمد على فرعٍ خلّفته حزمةٌ
  //  مجاورة (وهو ما كان يجعل مقارنةَ المسؤول تُحَلّ بتطابقٍ تامّ لا التباس).
  const wideA = access({
    userId: U_REPORTS,
    permissions: { canViewReports: true },
    operationalBranches: [B_BAGHDAD, B_THIRD],
  });
  const shortWide = await call(wideA, { days: 10, branchName: "بغداد" });
  check(shortWide.ok === false,
    "م.٥ **والنجاحُ سببُه النطاق لا التساهل** — نفسُ الاسم بنطاقٍ أوسعَ ملتبسٌ فيُردّ",
    JSON.stringify(shortWide.data));
  check(/أكثر من فرع/.test(String((shortWide.data as any)?.error ?? "")),
    "م.٦ والرسالةُ تقول إنه التباسٌ لا غياب",
    JSON.stringify(shortWide.data));

  console.log("\n── ن: عقدُ الإرشاد (توجيهُ النموذج) ──");
  const chatSrc = readFileSync(new URL("./ai/chat.ts", import.meta.url), "utf8");
  const trustBlock = chatSrc.slice(
    chatSrc.indexOf("const TOOL_TRUST_RULES"),
    chatSrc.indexOf("const SYSTEM_PROMPT"));
  check(/device_sales_summary/.test(trustBlock),
    "ن.١ **قاعدةُ التوجيه داخل TOOL_TRUST_RULES** — فتصل الوضعين معاً");
  check((chatSrc.match(/\$\{TOOL_TRUST_RULES\}/g) ?? []).length === 2,
    "ن.٢ وهذا البلوكُ مُلحَقٌ بنصَّي النظام كليهما");
  check(/لا financial_summary|ولا تستعمل financial_summary/.test(trustBlock),
    "ن.٣ وتنهى صراحةً عن financial_summary لعددِ أجهزة");
  check(/days=10/.test(trustBlock) && /branchName="بغداد"/.test(trustBlock),
    "ن.٤ ومعها المثالُ الملموس بـdays=10 وbranchName=«بغداد»");
  const regSrc = readFileSync(new URL("./ai/tools/registry.ts", import.meta.url), "utf8");
  const specBlock = regSrc.slice(
    regSrc.indexOf('name: "device_sales_summary"'),
    regSrc.indexOf("run: deviceSalesSummaryTool"));
  check(/مركز بغداد/.test(specBlock) && /فرع بغداد/.test(specBlock),
    "ن.٥ **ووصفُ الأداة يقول: مرّر «بغداد» لا العبارةَ كاملة**");

  await cleanup();
  console.log(`\n${failures === 0 ? "✅ كل الفحوص نجحت" : `❌ ${failures} حالة فاشلة`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch {}
  process.exit(1);
});
