// نافذةُ «اشترى» — حيّاً على Postgres وعلى النقطة نفسها.
// قاعدة محلّية: `npm run test:purchase-dialog`.
//
// ══ ما تغيّر ═══════════════════════════════════════════════════════════
// كان الموظّفُ أمام زرّين يعنيان له الشيء نفسه، وأحدُهما **معطَّل** حتى
// يخرج إلى شاشةٍ أخرى ليختار خبيراً ثم يعود. فصار زرٌّ واحدٌ لا يُعطَّل
// أبداً، ونافذةٌ تسأل عمّا ينقص **في مكانه**: سعرٌ أوّل، أو خبير، أو هما.
//
// ══ ما يحرسه هذا الملفّ ════════════════════════════════════════════════
// (١) **الحالاتُ الأربع تُتمّ البيع بنداءٍ واحد**: سعر+خبير · سعرٌ بلا خبير
//     · خبيرٌ بلا سعر · لا هذا ولا ذاك.
// (٢) **الخمسةُ يشترون**: طبيبٌ واستقبالٌ ومحاسبٌ ومديرُ فرعٍ ومسؤول.
// (٣) **والمحاسبُ لا ينال شيئاً آخر**: لا تأجيلَ ولا إغلاقَ ولا إعادةَ فتح.
// (٤) **ومَن ليس منهم يُردّ** — خبيرُ الأطراف ومُدخِلُ الجلسات.
// (٥) **والخبيرُ يُتحقَّق منه في الخادم** كما تفعل نقطتُه: فرعُ المريض،
//     حسابٌ فعّال، صفةُ خبير — ولا رقمَ من العميل يُصدَّق.
// (٦) **وأولُ سعرٍ عددٌ صحيحٌ موجب**، ولا يُستبدَل سعرٌ قائمٌ برقمٍ مزوَّر.
// (٧) **وأقلُّ من الأصلي يمرّ ببابِ الخصم**، والمجّانيُّ ببابِ التبرّع —
//     ويُطبَّقان **فوراً** ويُتمّان البيعَ في النداء نفسه (تصحيحٌ تشغيليّ
//     ٢٠٢٦-٠٨-٢٨ — تقاعدُ الاعتماد المؤجَّل)، ورايةُ الرغبة تُرفع تلقائياً
//     بلا زرّ.
// (٨) **وأمرُ تصنيعٍ واحد**، والضغطةُ المزدوجة لا تُنتج ثانياً.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";

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

const PORT = 6857;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-نافذة-الشراء";
const ADMIN = 9901, RECV = 9902, MGR = 9903, DOC = 9904, ACCT = 9905;
const EXPERT = 9906, EXPERT2 = 9907, PHYSIO = 9908;
const EXPERT_B2 = 9909, RECV_B2 = 9910, DOC_B2 = 9911, EXPERT_OFF = 9912;
const ACCT_BARE = 9913;
const ALL = [ADMIN, RECV, MGR, DOC, ACCT, EXPERT, EXPERT2, PHYSIO,
  EXPERT_B2, RECV_B2, DOC_B2, EXPERT_OFF, ACCT_BARE];

const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول",
    permissions: { canViewPatients: true, canAddPatients: true, canDeletePatients: true } },
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استعلامات", permissions: { canViewPatients: true, canAddPatients: true } },
  mgr: { userId: MGR, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "مدير الفرع", permissions: { canViewPatients: true, canAddPatients: true } },
  doc: { userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. المعاين", permissions: { canViewPatients: true, canWriteMedicalExam: true } },
  //  **المحاسبُ بلا قدرةٍ سريرية ولا `canAddPatients`**: دورُه وحده هو ما
  //  يُدخله — فلو مرّ بقدرةٍ عامّة لكان الاختبارُ يمدح البابَ الخطأ.
  acct: { userId: ACCT, role: "accountant", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "المحاسب",
    permissions: { canViewPatients: true, canManageAccounting: true } },
  //  **ومحاسبٌ عارٍ تماماً** — بلا قدرةٍ واحدة. دورُه وحده كلُّ ما يحمله،
  //  فيُثبَت أن البابَ فُتح **بالدور** لا بقدرةٍ عامّة تصادف وجودُها.
  acctBare: { userId: ACCT_BARE, role: "accountant", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "المحاسب العاري", permissions: {} },
  expert: { userId: EXPERT, role: "prosthetics_expert", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "الخبير", permissions: {} },
  physio: { userId: PHYSIO, role: "therapist", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "مُدخِل الجلسات",
    permissions: { canViewPatients: true, canEditPatients: true, canEnterSessions: true } },
  recvB2: { userId: RECV_B2, role: "reception", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "استعلامات ٢", permissions: { canViewPatients: true, canAddPatients: true } },
  docB2: { userId: DOC_B2, role: "doctor", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "د. الفرع ٢", permissions: { canViewPatients: true, canWriteMedicalExam: true } },
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}
async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "content-type": "application/json",
      "x-test-session-b64": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

async function mkPatient(label: string, branchId = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id,
       is_amputee, is_medical_support, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','بتر',$3,true,false,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, branchId]);
  await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
           VALUES ($1,$2,'prosthetic',0,'manual','active')`, [r[0].id, branchId]);
  return r[0].id;
}

/**
 * `deviceCost` — كلفةُ المعاينة (صفرٌ يعني «سكت الطبيب»).
 *
 * ══ **والسعرُ صار خطوةً منفصلة عن التوقيع** ═══════════════════════════════
 * الشاشةُ الطبّية لا ترسل `deviceCost` عند التوقيع بعد اليوم (القسمُ
 * 4.b/4.f في CLAUDE.md)، فيُثبَّت هنا بعده مباشرةً على الصفَّين معاً —
 * تماماً كما كانت `ensureFollowupForSignedExam` تكتبهما وقت التوقيع، بما
 * فيه الصفرُ («سكت الطبيب» ⟶ `approved_price=0`، وهو الافتراضُ أصلاً).
 */
async function signExam(patientId: number, session: any, deviceCost: number) {
  const res = await http("POST", `/api/medical/patients/${patientId}/exams`, session, {
    caseType: "prosthetic", diagnosis: "بتر تحت الركبة", prescription: {},
  });
  if (res.status < 300 && res.body?.id) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`SET LOCAL app.allow_exam_edit = 'on'`);
      await client.query(`UPDATE medical_exams SET device_cost=$2 WHERE id=$1`,
        [res.body.id, deviceCost]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
    await q(`UPDATE post_exam_followups SET approved_price=$2 WHERE medical_exam_id=$1`,
      [res.body.id, deviceCost]);
  }
  return res;
}

async function followupOf(patientId: number, session: any = S.admin) {
  const r = await http("GET", `/api/followups/patient/${patientId}`, session);
  const list = Array.isArray(r.body) ? r.body : [];
  return list[0] ?? null;
}

/**
 * مريضٌ جاهزٌ للشراء بالحالة المطلوبة من الحالات الأربع.
 *
 * `price` — كلفةُ المعاينة (صفرٌ يعني «سكت الطبيب»).
 * `expert` — هل اختير الخبيرُ مسبقاً من نقطته المستقلّة؟
 */
async function scenario(label: string, opts: {
  price: number; expert: boolean; branchId?: number; doctor?: any;
}) {
  const branchId = opts.branchId ?? 1;
  const pid = await mkPatient(label, branchId);
  await signExam(pid, opts.doctor ?? (branchId === 1 ? S.doc : S.docB2), opts.price);
  const f = await followupOf(pid);
  if (opts.expert) {
    await http("POST", `/api/followups/${f.id}/expert`,
      branchId === 1 ? S.recv : S.recvB2,
      { expertUserId: branchId === 1 ? EXPERT : EXPERT_B2 });
  }
  return { pid, f: await followupOf(pid) };
}

const ordersOf = (pid: number) =>
  q(`SELECT id, expert_user_id, status FROM prosthetic_work_orders WHERE patient_id = $1`, [pid]);
const eventTypes = (f: any) => (f?.events ?? []).map((e: any) => e.eventType);

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM patient_code_aliases a
            WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, branch, spec, active] of [
    [ADMIN, "admin", "المسؤول", 1, "[]", true],
    [RECV, "reception", "استعلامات", 1, "[]", true],
    [MGR, "branch_manager", "مدير الفرع", 1, "[]", true],
    [DOC, "doctor", "د. المعاين", 1, '["prosthetic","medical_support"]', true],
    [ACCT, "accountant", "المحاسب", 1, "[]", true],
    [ACCT_BARE, "accountant", "المحاسب العاري", 1, "[]", true],
    [EXPERT, "prosthetics_expert", "الخبير", 1, "[]", true],
    [EXPERT2, "prosthetics_expert", "الخبير الثاني", 1, "[]", true],
    [PHYSIO, "therapist", "مُدخِل الجلسات", 1, "[]", true],
    //  **خبيرٌ في فرعٍ آخر** — رقمٌ صالحٌ بصفةٍ صحيحة، والفرعُ وحده يردّه.
    [EXPERT_B2, "prosthetics_expert", "خبير ذي قار", 2, "[]", true],
    //  **وخبيرٌ معطَّلُ الحساب** — الصفةُ والفرعُ صحيحان، والتعطيلُ يردّه.
    [EXPERT_OFF, "prosthetics_expert", "الخبير المعطَّل", 1, "[]", false],
    [RECV_B2, "reception", "استعلامات ٢", 2, "[]", true],
    [DOC_B2, "doctor", "د. الفرع ٢", 2, '["prosthetic"]', true],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,$7,$8::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               medical_specialties=EXCLUDED.medical_specialties, is_active=EXCLUDED.is_active`,
      [id, `pd_u${id}`, name, role, branch, JSON.stringify([branch]), active, spec]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session-b64"];
    r.session = h
      ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")) }
      : {};
    next();
  });
  const realUse = app.use.bind(app);
  let skipped = 0;
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") { skipped++; return app; }
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));

  try {
    check(skipped === 1, "جدول النقاط الحقيقي مُركَّب", String(skipped));

    // ══ أ. **الحالاتُ الأربع — نداءٌ واحدٌ لكلٍّ منها** ══════════════════
    //  وهذا هو جوهرُ التبسيط: لا يُطرَد الموظّف من النافذة ليكمل ناقصاً
    //  في شاشةٍ أخرى ثم يعود. ما ينقص يُسأل عنه هنا، ويُتمّ البيعُ بضغطة.
    console.log("\n── الحالات الأربع ──");

    //  ── أ. سعرٌ وخبير: تأكيدٌ مجرَّد، بلا حقلٍ إضافي ──
    {
      const { pid, f } = await scenario("أ-سعر-وخبير", { price: 1_500_000, expert: true });
      const r = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {});
      same("أ. **سعرٌ وخبير ⟶ تأكيدٌ مجرَّد ينجح**", r.status, 200);
      const orders = await ordersOf(pid);
      same("   وأمرُ تصنيعٍ واحدٍ بخبيره", [orders.length, Number(orders[0]?.expert_user_id)],
        [1, EXPERT]);
      same("   والكلفةُ حُجزت بالسعر المعتمد",
        Number((await q(`SELECT total_cost FROM patients WHERE id=$1`, [pid]))[0].total_cost),
        1_500_000);
    }

    //  ── ب. سعرٌ بلا خبير: يُختار الخبيرُ **داخل النداء نفسه** ──
    {
      const { pid, f } = await scenario("ب-سعر-بلا-خبير", { price: 900_000, expert: false });
      same("   (ولا خبيرَ محفوظاً بعد)", f.selectedExpertUserId, null);
      const r = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv,
        { expertUserId: EXPERT2 });
      same("ب. **سعرٌ بلا خبير ⟶ يُختار في النداء نفسه**", r.status, 200);
      const orders = await ordersOf(pid);
      same("   وأمرٌ واحدٌ بالخبير المُرسَل", [orders.length, Number(orders[0]?.expert_user_id)],
        [1, EXPERT2]);
      //  **ويُكتب بنقطة الاختيار نفسها**: حدثُها في التاريخ لا كتابةٌ جانبية.
      check(eventTypes(await followupOf(pid)).includes("expert_selected"),
        "   **وحدثُ اختيار الخبير مسجَّلٌ كأنه من نقطته**",
        JSON.stringify(eventTypes(await followupOf(pid))));
      //  وسطرُ تدقيقٍ صريحٌ يقول إن الاختيار وقع داخل النافذة.
      const aud = await q<{ notes: string }>(
        `SELECT notes FROM audit_log WHERE entity_type='post_exam_followup' AND entity_id=$1
           AND notes LIKE '%اشترى%'`, [f.id]);
      check(aud.length === 1, "   وسطرُ تدقيقٍ يسمّي البابَ الذي اختير منه",
        JSON.stringify(aud.map((a) => a.notes)));
    }

    //  ── ج. خبيرٌ بلا سعر: يُدخَل أولُ سعرٍ **بلا اعتماد** ──
    {
      const { pid, f } = await scenario("ج-خبير-بلا-سعر", { price: 0, expert: true });
      same("   (ولا سعرَ من المعاينة)", f.approvedPrice, 0);
      const r = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv,
        { originalPrice: 750_000 });
      same("ج. **خبيرٌ بلا سعر ⟶ أولُ سعرٍ في النداء نفسه**", r.status, 200);
      const after = await followupOf(pid);
      same("   والسعرُ محفوظٌ منسوباً لمن أدخله",
        [after?.approvedPrice, after?.priceSource], [750_000, "reception_set"]);
      same("   وأمرٌ واحدٌ وُلد", (await ordersOf(pid)).length, 1);
      same("   والكلفةُ حُجزت بالسعر الجديد",
        Number((await q(`SELECT total_cost FROM patients WHERE id=$1`, [pid]))[0].total_cost),
        750_000);
    }

    //  ── د. لا سعرَ ولا خبير: **الاثنان معاً في نداءٍ واحد** ──
    {
      const { pid, f } = await scenario("د-بلا-شيء", { price: 0, expert: false });
      same("   (بلا سعرٍ ولا خبير)", [f.approvedPrice, f.selectedExpertUserId], [0, null]);
      const r = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv,
        { originalPrice: 1_100_000, expertUserId: EXPERT });
      same("د. **لا سعرَ ولا خبير ⟶ الاثنان في نداءٍ واحد**", r.status, 200);
      const after = await followupOf(pid);
      const orders = await ordersOf(pid);
      same("   والاثنان محفوظان، وأمرٌ واحدٌ وُلد",
        [after?.approvedPrice, after?.priceSource, orders.length,
          Number(orders[0]?.expert_user_id)],
        [1_100_000, "reception_set", 1, EXPERT]);
    }

    // ══ ب. **الخمسةُ يشترون** ═══════════════════════════════════════════
    //  طبيبٌ واستقبالٌ ومحاسبٌ ومديرُ فرعٍ ومسؤول — كلٌّ في نداءٍ واحدٍ
    //  يحمل ما ينقص. **والطبيبُ منهم يستطيع ولا يُطلَب.**
    console.log("\n── الخمسةُ يشترون ──");
    for (const [label, sess] of [
      ["الاستقبال", S.recv], ["مديرُ الفرع", S.mgr], ["الطبيب", S.doc],
      ["المحاسب", S.acct], ["المسؤول", S.admin],
    ] as Array<[string, any]>) {
      const { pid, f } = await scenario(`شراء-${label}`, { price: 0, expert: false });
      const r = await http("POST", `/api/followups/${f.id}/confirm-purchase`, sess,
        { originalPrice: 600_000, expertUserId: EXPERT });
      const orders = await ordersOf(pid);
      same(`ب. **${label} يُتمّ البيع كاملاً** — سعرٌ وخبيرٌ وأمرُ تصنيع`,
        [r.status, orders.length, (await followupOf(pid))?.status],
        [200, 1, "converted"]);
    }

    // ══ ج. **ومَن ليس منهم يُردّ** ═══════════════════════════════════════
    console.log("\n── مَن يُردّ ──");
    {
      const { pid, f } = await scenario("مرفوض", { price: 800_000, expert: true });
      for (const [label, sess] of [
        ["خبيرُ الأطراف", S.expert], ["مُدخِلُ الجلسات", S.physio],
      ] as Array<[string, any]>) {
        same(`ج. **${label} لا يشتري**`,
          (await http("POST", `/api/followups/${f.id}/confirm-purchase`, sess, {})).status, 403);
      }
      //  **ومن فرعٍ آخر يُردّ ولو كان دورُه من الخمسة** — النطاقُ شرطٌ ثانٍ.
      same("   **ومن فرعٍ آخر يُردّ ولو كان استقبالاً**",
        (await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recvB2, {})).status, 403);
      same("   ولا أمرَ وُلد من كلّ ذلك", (await ordersOf(pid)).length, 0);
    }

    // ══ د. **المحاسبُ: يشتري ولا يدير** ═════════════════════════════════
    //  هذه هي الحدودُ التي طُلبت صراحةً، وتُثبَت فعلاً لا وصفاً.
    console.log("\n── حدودُ المحاسب ──");
    {
      const { pid, f } = await scenario("حدود-المحاسب", { price: 500_000, expert: true });
      //  يقرأ.
      const readRow = await http("GET", `/api/followups/patient/${pid}`, S.acct);
      same("د. **المحاسبُ يقرأ البطاقة**",
        [readRow.status, Array.isArray(readRow.body) && readRow.body.length > 0], [200, true]);
      //  ولا يدير: ثلاثةُ أبوابٍ مغلقة.
      same("   **ولا يؤجّل**",
        (await http("POST", `/api/followups/${f.id}/defer`, S.acct,
          { reason: "needs_time", nextFollowUpAt: "2026-09-01T09:00:00Z" })).status, 403);
      same("   **ولا يغلق بلا شراء**",
        (await http("POST", `/api/followups/${f.id}/close`, S.acct,
          { reason: "price" })).status, 403);
      //  ولا يسعّر قراراً تجارياً، ولا يحسم خصماً.
      same("   **ولا يحدّد السعر التجاري**",
        (await http("POST", `/api/followups/${f.id}/commercial-price`, S.acct,
          { finalPrice: 400_000, reason: "خصم" })).status, 403);
      same("   **ولا يرى طابورَ اعتماد الخصم أصلاً**",
        (await http("GET", "/api/discounts", S.acct)).status, 403);
      //  والحالةُ لم تتغيّر بحرفٍ من كلّ تلك المحاولات.
      same("   **ولم يتغيّر الملفُّ بحرف**",
        [(await followupOf(pid))?.status, (await followupOf(pid))?.approvedPrice],
        ["awaiting_patient_decision", 500_000]);
      //  ثم **يشتري** — وهو الفعلُ الوحيد الذي مُنحه.
      same("   **ثم يشتري** — وهو بابُه الوحيد",
        (await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.acct, {})).status, 200);

      // ══ **والمحاسبُ العاري كذلك — دورُه وحده كافٍ** ═══════════════════
      //  بلا `canViewPatients` ولا `canAddPatients` ولا شيء. ولولا ذلك لكان
      //  ما نُثبته أعلاه ثمرةَ قدرةٍ عامّة تصادف وجودُها في حسابٍ واحد.
      same("د٢. **والمحاسبُ العاري يقرأ بدوره وحده**",
        [(await http("GET", "/api/followups", S.acctBare)).status,
          (await http("GET", `/api/followups/patient/${pid}`, S.acctBare)).status],
        [200, 200]);
      //  **وقائمةُ الخبراء تصله** — وإلّا فتح النافذةَ على قائمةٍ فارغة
      //  فصار الزرُّ لا يعمل بلا رسالةٍ تقول لماذا.
      const bareExperts = await http("GET", "/api/manufacturing/experts", S.acctBare);
      check(bareExperts.status === 200 && Array.isArray(bareExperts.body)
        && bareExperts.body.some((e: any) => Number(e.id) === EXPERT),
        "   **وقائمةُ خبراء فرعه تصله** — فالنافذةُ تُختار منها",
        JSON.stringify(bareExperts));
      //  ويُتمّ بيعاً كاملاً: سعرٌ أوّلُ وخبيرٌ في نداءٍ واحد.
      const { pid: pBare, f: fBare } = await scenario("المحاسب-العاري",
        { price: 0, expert: false });
      same("   **ويُتمّ بيعاً كاملاً بنداءٍ واحد**",
        [(await http("POST", `/api/followups/${fBare.id}/confirm-purchase`, S.acctBare,
          { originalPrice: 850_000, expertUserId: EXPERT })).status,
          (await ordersOf(pBare)).length, (await followupOf(pBare))?.status],
        [200, 1, "converted"]);
      //  **ولا يزال بلا إدارةِ ملفّ** — القدرةُ لم تتسرّب مع الدور.
      const { f: fBare2 } = await scenario("المحاسب-العاري-٢", { price: 300_000, expert: true });
      same("   **ولا يزال بلا تأجيلٍ ولا إغلاق**",
        [(await http("POST", `/api/followups/${fBare2.id}/defer`, S.acctBare,
          { reason: "needs_time", nextFollowUpAt: "2026-09-01T09:00:00Z" })).status,
          (await http("POST", `/api/followups/${fBare2.id}/close`, S.acctBare,
            { reason: "price" })).status],
        [403, 403]);
      //  **ولا يعيد الفتح بعد الإغلاق** — يُثبَت على ملفٍّ مغلقٍ فعلاً.
      const { pid: pShut, f: fShut } = await scenario("محاسب-إعادة-فتح",
        { price: 300_000, expert: true });
      await http("POST", `/api/followups/${fShut.id}/close`, S.recv, { reason: "price" });
      same("   **ولا يعيد فتحَ ملفٍّ أُغلق**",
        (await http("POST", `/api/followups/${fShut.id}/reopen`, S.acct, {})).status, 403);
      same("   والملفُّ باقٍ مغلقاً", (await followupOf(pShut))?.status,
        "closed_without_purchase");
    }

    // ══ هـ. **الخبيرُ يُتحقَّق منه في الخادم** ══════════════════════════
    //  رقمٌ من العميل لا يُصدَّق: نفسُ تحقّق نقطة الاختيار حرفاً.
    console.log("\n── تحقّقُ الخبير ──");
    {
      for (const [label, value] of [
        ["خبيرٌ من فرعٍ آخر", EXPERT_B2],
        ["خبيرٌ معطَّلُ الحساب", EXPERT_OFF],
        ["حسابٌ ليس خبيراً (استقبال)", RECV],
        ["رقمٌ لا وجود له", 987_654],
        ["صفر", 0], ["سالب", -3], ["كسر", 1.5],
      ] as Array<[string, any]>) {
        const { pid, f } = await scenario(`خبير-${label}`, { price: 700_000, expert: false });
        const r = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv,
          { expertUserId: value });
        same(`هـ. **${label} يُردّ**`, r.status, 400);
        same(`   ولا أمرَ ولا خبيرَ حُفظ`,
          [(await ordersOf(pid)).length, (await followupOf(pid))?.selectedExpertUserId,
            (await followupOf(pid))?.status],
          [0, null, "awaiting_patient_decision"]);
      }
      //  ونصٌّ غيرُ رقميّ يُقرأ «لم يُرسَل» — ورسالةُ الردّ تدلّ على الخبير.
      const { f: fTxt } = await scenario("خبير-نص", { price: 700_000, expert: false });
      const txt = await http("POST", `/api/followups/${fTxt.id}/confirm-purchase`, S.recv,
        { expertUserId: "abc" });
      check(txt.status === 400 && String(txt.body?.error ?? "").includes("خبير"),
        "   **ونصٌّ غيرُ رقميّ يُردّ برسالةٍ تقول ما يُفعَل**",
        JSON.stringify(txt.body));
    }

    // ══ و. **والخبيرُ المحفوظ لا يُستبدَل من باب البيع** ═════════════════
    //  اختاره أحدٌ صراحةً في نقطته؛ فرقمٌ في جسم «اشترى» يُتجاهَل تماماً.
    {
      const { pid, f } = await scenario("خبير-محفوظ", { price: 650_000, expert: true });
      const r = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv,
        { expertUserId: EXPERT2 });
      const orders = await ordersOf(pid);
      same("و. **الخبيرُ المحفوظ لا يُبدَّل من باب البيع**",
        [r.status, Number(orders[0]?.expert_user_id)], [200, EXPERT]);
    }

    // ══ ز. **أولُ سعرٍ: عددٌ صحيحٌ موجب، ولا يُستبدَل قائم** ═════════════
    console.log("\n── أولُ سعرٍ ──");
    {
      for (const [label, value] of [
        ["صفر", 0], ["سالب", -1], ["كسرُ دينار", 750_000.5],
        ["نصّ", "abc"], ["فارغ", ""], ["غائب", undefined],
      ] as Array<[string, any]>) {
        const { pid, f } = await scenario(`سعر-${label}`, { price: 0, expert: true });
        const body: any = {};
        if (value !== undefined) body.originalPrice = value;
        const r = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, body);
        same(`ز. **أولُ سعرٍ ${label} يُردّ**`, r.status, 400);
        same("   ولا أمرَ ولا كلفةَ تحرّكت",
          [(await ordersOf(pid)).length,
            Number((await q(`SELECT total_cost FROM patients WHERE id=$1`, [pid]))[0].total_cost)],
          [0, 0]);
      }
      //  **والسعرُ القائم لا يُستبدَل برقمٍ مزوَّر** — الحارسُ شرطٌ لا دور.
      const { pid, f } = await scenario("سعر-قائم", { price: 2_000_000, expert: true });
      const forged = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv,
        { originalPrice: 1, approvedPrice: 1, price: 1, cost: 1 });
      const after = await followupOf(pid);
      same("ح. **سعرٌ قائمٌ لا يُستبدَل برقمٍ في الجسم**",
        [forged.status, after?.approvedPrice, after?.priceSource],
        [200, 2_000_000, "exam"]);
      same("   والكلفةُ حُجزت بالسعر الحقيقي لا المزوَّر",
        Number((await q(`SELECT total_cost FROM patients WHERE id=$1`, [pid]))[0].total_cost),
        2_000_000);
    }

    // ══ ط. **أقلُّ من الأصلي ⟶ يُطبَّق فوراً، والمجّانيُّ كذلك** ══════════
    //  ولا بابَ ثالثاً: النافذةُ تعيد استعمال المسار القائم لا تكرّره.
    //
    //  ══ تصحيحٌ تشغيليّ ٢٠٢٦-٠٨-٢٨ — تقاعدُ الاعتماد المؤجَّل ═══════════════
    //  كان الخصمُ من هذه النافذة يفتح طلباً معلَّقاً بلا تصنيعٍ ولا كلفة،
    //  ينتظر مديرَ الفرع. اليوم **لا طابورَ يخصّ الخصمَ وحده**: مَن وصل
    //  هذه النافذةَ اجتاز `canConfirmPurchase` بالفعل — نفسُ بوّابة السعر
    //  الكامل — فخصمُه يُطبَّق فوراً بحفظٍ واحد يُتمّ البيعَ معه
    //  (`applyDiscountImmediately`، `npm run test:discount`).
    console.log("\n── الخصم والتبرّع من النافذة نفسها — يُطبَّقان فوراً ──");
    {
      const { pid, f } = await scenario("خصم", { price: 1_000_000, expert: true });
      const r = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv,
        { discount: { finalPrice: 700_000, reason: "negotiation", note: "مساومة" } });
      same("ط. **أقلُّ من الأصلي ⟶ يُطبَّق فوراً ويكتمل البيع**",
        [r.status, r.body?.ok, Boolean(r.body?.workOrderId)], [200, true, true]);
      same("   **وأمرُ تصنيعٍ وُلد فوراً، والكلفةُ حُجزت بالسعر المخفَّض**",
        [(await ordersOf(pid)).length, (await followupOf(pid))?.status,
          Number((await q(`SELECT total_cost FROM patients WHERE id=$1`, [pid]))[0].total_cost)],
        [1, "converted", 700_000]);
      //  **وصفُّ الخصم مختومٌ `approved` — لا `pending` أبداً خارج معاملته.**
      const row = await q<{ status: string; approved_final_price: number }>(
        `SELECT status, approved_final_price FROM service_discount_requests WHERE patient_id=$1`,
        [pid]);
      same("   وسطرُ التدقيق مكتملٌ معتمَداً بالسعر نفسه",
        [row[0]?.status, Number(row[0]?.approved_final_price)], ["approved", 700_000]);
      //  ══ ورايةُ «يرغب بالشراء» تُرفع كذلك — واقعةٌ وقعت لا نيّةٌ معلَّقة ══
      const evs = eventTypes(await followupOf(pid));
      same("ي. **ورايةُ الرغبة تُرفع أيضاً — بلا زرّ**",
        evs.filter((t: string) => t === "purchase_interest_signaled").length, 1);
      check(Boolean((await followupOf(pid))?.purchaseInterestAt),
        "   والصفُّ يحملها مقروءةً", JSON.stringify(await followupOf(pid)));
      //  **وضغطةٌ ثانيةٌ بعد التحويل تُردّ بتعارضٍ صريح** — لا طلبَ خصمٍ
      //  ثانٍ يُنشأ ولا شيءَ يتضاعف.
      const again = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv,
        { discount: { finalPrice: 650_000, reason: "negotiation" } });
      same("   **وضغطةٌ ثانيةٌ بعد التحويل تُردّ لا تُضاعف شيئاً**",
        [again.status, (await ordersOf(pid)).length,
          eventTypes(await followupOf(pid))
            .filter((t: string) => t === "purchase_interest_signaled").length],
        [409, 1, 1]);
    }
    {
      const { pid, f } = await scenario("تبرّع", { price: 1_000_000, expert: true });
      const r = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv,
        { discount: { isFree: true, reason: "humanitarian" } });
      same("ك. **والمجّانيُّ يمرّ ببابِ التبرّع الصريح ويكتمل فوراً**",
        [r.status, r.body?.ok, Boolean(r.body?.workOrderId)], [200, true, true]);
      const row = await q<{ status: string; is_free: boolean; approved_final_price: number }>(
        `SELECT status, is_free, approved_final_price FROM service_discount_requests
           WHERE patient_id=$1`, [pid]);
      same("   وصفُّه معتمَدٌ ومعلَّمٌ مجّانياً بصفرٍ صريح",
        [row[0]?.status, row[0]?.is_free, Number(row[0]?.approved_final_price)],
        ["approved", true, 0]);
      same("   **وأمرُ تصنيعٍ وُلد فوراً بكلفةٍ صفر**",
        [(await ordersOf(pid)).length,
          Number((await q(`SELECT total_cost FROM patients WHERE id=$1`, [pid]))[0].total_cost)],
        [1, 0]);
    }
    //  **والخصمُ في النداء نفسه الذي يحمل أولَ سعرٍ وخبيراً** — الحالةُ (د)
    //  مع خصم: أشدُّ ما تحمله النافذةُ دفعةً واحدة، ويكتمل معاً بحفظٍ واحد.
    {
      const { pid, f } = await scenario("د-مع-خصم", { price: 0, expert: false });
      const r = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {
        originalPrice: 1_000_000, expertUserId: EXPERT,
        discount: { finalPrice: 800_000, reason: "humanitarian" },
      });
      const after = await followupOf(pid);
      //  **والسعرُ النهائيُّ على المتابعة هو المخفَّض** — `setApprovedPriceForDiscount`
      //  يكتب فوق أوّل سعرٍ بمصدرٍ `approved_change`؛ الأصليُّ (١ مليون)
      //  يبقى على صفّ الخصم وحده (الفحصُ أدناه)، لا على المتابعة.
      same("ل. **سعرٌ أوّلُ وخبيرٌ وخصمٌ في نداءٍ واحد — يكتمل فوراً**",
        [r.status, r.body?.ok, after?.approvedPrice, after?.selectedExpertUserId, after?.status],
        [200, true, 800_000, EXPERT, "converted"]);
      //  **والخصمُ محسوبٌ على السعر المحفوظ لا على رقمٍ من الطلب.**
      const row = await q<{ original_price: number; status: string }>(
        `SELECT original_price, status FROM service_discount_requests WHERE patient_id=$1`, [pid]);
      same("   **والأصليُّ في الطلب هو المحفوظ لا المُرسَل، ومعتمَدٌ فوراً**",
        [Number(row[0]?.original_price), row[0]?.status], [1_000_000, "approved"]);
      same("   وأمرُ تصنيعٍ وُلد بالسعر المخفَّض",
        [(await ordersOf(pid)).length,
          Number((await q(`SELECT total_cost FROM patients WHERE id=$1`, [pid]))[0].total_cost)],
        [1, 800_000]);
    }
    //  ══ والمحاسبُ يطبّق خصمَه بنفسه — القاعدةُ انقلبت ═══════════════════
    //  كان «يطلب الخصم ولا يعتمده» — طبقةُ إذنٍ ثانية لم تعد موجودة. مَن
    //  يملك تنفيذ العملية بسعرها الكامل (والمحاسبُ منهم، القسم ب أعلاه)
    //  يملك تنفيذَها بخصمٍ صحيح أيضاً — بلا وسيط.
    {
      const { pid, f } = await scenario("خصم-المحاسب", { price: 900_000, expert: true });
      const r = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.acct,
        { discount: { finalPrice: 700_000, reason: "negotiation" } });
      same("م. **والمحاسبُ يطبّق خصمَه فوراً كأيّ فاعلٍ آخر — لا يرفعه لأحد**",
        [r.status, r.body?.ok], [200, true]);
      same("   وأمرُ تصنيعٍ وُلد بالسعر المخفَّض",
        [(await ordersOf(pid)).length,
          Number((await q(`SELECT total_cost FROM patients WHERE id=$1`, [pid]))[0].total_cost)],
        [1, 700_000]);
      const row = await q<{ status: string }>(
        `SELECT status FROM service_discount_requests WHERE patient_id=$1`, [pid]);
      same("   وسطرُ التدقيق معتمَدٌ لا معلَّق", row[0]?.status, "approved");
    }

    // ══ ن. **أمرٌ واحد، والضغطةُ المزدوجة لا تُنتج ثانياً** ══════════════
    console.log("\n── الضغطة المزدوجة ──");
    {
      const { pid, f } = await scenario("مزدوج", { price: 0, expert: false });
      const [r1, r2] = await Promise.all([
        http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv,
          { originalPrice: 500_000, expertUserId: EXPERT }),
        http("POST", `/api/followups/${f.id}/confirm-purchase`, S.acct,
          { originalPrice: 500_000, expertUserId: EXPERT2 }),
      ]);
      same("ن. **واحدٌ فقط نجح**",
        [r1, r2].filter((r) => r.status === 200).length, 1);
      same("   **وأمرُ تصنيعٍ واحدٌ لا غير**", (await ordersOf(pid)).length, 1);
      same("   والكلفةُ حُجزت مرّةً واحدة",
        Number((await q(`SELECT COALESCE(SUM(amount),0)::int s FROM cost_entries WHERE patient_id=$1`, [pid]))[0].s),
        500_000);
      //  والضغطةُ الثالثة **بعد** التحويل تُردّ بتعارضٍ صريح لا بصمت.
      const third = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {});
      check(third.status === 409, "   **والثالثةُ تُردّ بتعارضٍ صريح**",
        JSON.stringify({ status: third.status, body: third.body }));
      same("   ولا أمرَ ثانٍ وُلد", (await ordersOf(pid)).length, 1);
    }

    // ══ س. **ونقطةُ الإشارة باقيةٌ تعمل** — توافقٌ رجعي لا حذف ═══════════
    //  حُذف الزرُّ من الشاشة، **والتاريخُ والنقطةُ باقيان**: نافذةٌ قديمة
    //  مفتوحةٌ تصيبها، وصفوفٌ قديمة تحملها — ولا يجوز أن تُردّ بـ404.
    console.log("\n── توافقُ إشارة الرغبة ──");
    {
      const { pid, f } = await scenario("إشارة-يدوية", { price: 400_000, expert: true });
      const sig = await http("POST", `/api/followups/${f.id}/purchase-interest`, S.doc, {});
      same("س. **نقطةُ الإشارة باقيةٌ تعمل** — لا 404",
        [sig.status, Boolean(sig.body?.followup?.purchaseInterestAt),
          sig.body?.alreadySignaled],
        [200, true, false]);
      //  **ولا تُشترَط قبل الشراء**: ملفٌّ بلا إشارةٍ يُشترى كما هو.
      const { pid: pNo, f: fNo } = await scenario("بلا-إشارة", { price: 400_000, expert: true });
      same("   **ولا تُشترَط قبل الشراء إطلاقاً**",
        [(await http("POST", `/api/followups/${fNo.id}/confirm-purchase`, S.recv, {})).status,
          (await ordersOf(pNo)).length],
        [200, 1]);
      same("   (والمُشار إليه يُشترى كذلك)",
        (await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {})).status, 200);
      check((await ordersOf(pid)).length === 1, "   بأمرٍ واحد", "");
    }
  } finally {
    httpServer.close();
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [ALL]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [ALL]);
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
