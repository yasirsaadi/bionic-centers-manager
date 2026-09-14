// «بانتظار الحسم» لا يعرض — ولا يعدّ — عمليةً بِيعت فعلاً.
// قاعدة محلّية: `npm run test:decision-queue-sold`.
//
// ══ الواقعةُ المُعادُ إنتاجُها حيّاً على النقاط الحقيقية ═══════════════════
// الشرطُ كان الحالةَ وحدها (`status NOT IN (terminal)`). و«converted» يكتبها
// `confirmPurchase` ذرّياً مع البيع — فالقاعدتان تتطابقان **ما دام كلُّ بيعٍ
// يمرّ به**. ولا يمرّ به دائماً:
//
//   ① يوقّع الطبيبُ معاينةً **قبل** أن يفتح الاستقبالُ طلبَ جهاز ⟶ متابعةٌ
//      يتيمة (`device_episode_id IS NULL`) — بابٌ حيٌّ مدعوم (٤.p)، وهو شكلُ
//      الإنتاج الموصوف في `decision_queue_store.ts` نفسِه.
//   ② ثمّ يبيع الاستقبالُ **جزءاً حقيقياً** من `POST /api/no-exam/device-sale`
//      ⟶ أمرُ بناءٍ مفتوح، وحلقةٌ `in_manufacturing`، ودفعةٌ وقيدُ كلفة.
//   ③ والمتابعةُ اليتيمةُ **باقيةٌ في الطابور ومحسوبةٌ في الشارة**، وتعرض
//      «اشترى» على مريضٍ اشترى بالفعل.
//
// ══ ونطاقُ هذا الملفّ هذه الحالةُ وحدها ══════════════════════════════════
// الصلاحياتُ والنطاقُ والتصنيفُ وهويّةُ الحاسم وملاحظةُ الطبيب وتبويبُ «تم
// الحسم» — كلُّها مُختبَرةٌ في `server/decision_queue.test.ts` ولم تُمَسّ.
// هنا: **مَن يُحجَب، ومَن لا يُحجَب، والقراءةُ والعدّادُ بالشرط نفسِه.**

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

const PORT = 6912;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-حجب-المبيع";
const ADMIN = 9951, DOC = 9952, RECV = 9953, EXPERT = 9954;

const S: Record<string, any> = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1],
    displayName: "المسؤول", permissions: { canViewPatients: true, canAddPatients: true },
  },
  doc: {
    userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "سعد",
    permissions: { canViewPatients: true, canAddPatients: true, canWriteMedicalExam: true },
  },
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "ريام", permissions: { canViewPatients: true, canAddPatients: true },
  },
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
      "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

async function mkPatient(label: string, kind: "prosthetic" | "medical_support" = "prosthetic") {
  const [r] = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id, is_amputee, is_medical_support,
       total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر','احادي - طرف سفلي - يمين - تحت الركبة',
             1,$3,$4,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, kind === "prosthetic", kind === "medical_support"]);
  return r.id;
}
async function mkCase(patientId: number, caseType = "prosthetic") {
  const [r] = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,1,$2,0,'manual','active') RETURNING id`, [patientId, caseType]);
  return r.id;
}
const signExam = (patientId: number, opts: { caseType?: string; episodeId?: number } = {}) =>
  http("POST", `/api/medical/patients/${patientId}/exams`, S.doc, {
    idempotencyKey: crypto.randomUUID(),
    caseType: opts.caseType ?? "prosthetic", diagnosis: "تشخيصٌ سريريّ", plan: "خطّة",
    ...(opts.episodeId ? { deviceEpisodeId: opts.episodeId } : {}),
  });

/** **متابعةٌ يتيمة** — معاينةٌ موقّعة بلا طلبِ جهازٍ منتظر. بابٌ حيٌّ (٤.p). */
async function orphanFollowup(
  label: string, kind: "prosthetic" | "medical_support" = "prosthetic",
) {
  const pid = await mkPatient(label, kind);
  await mkCase(pid, kind);
  const ex = await signExam(pid, { caseType: kind });
  if (ex.status >= 300) throw new Error(`signExam: ${JSON.stringify(ex.body)}`);
  const [f] = await q(`SELECT id FROM post_exam_followups WHERE patient_id=$1
                        ORDER BY id DESC LIMIT 1`, [pid]);
  return { pid, fid: Number(f.id) };
}

/** **صفٌّ عاديّ على مسار المعاينة** — طلبُ جهازٍ ثمّ معاينةٌ عليه. */
async function readySale(label: string, requestedItem = "full_device") {
  const pid = await mkPatient(label);
  await mkCase(pid);
  const ep = await http("POST", `/api/patients/${pid}/device-episodes`, S.recv,
    { serviceType: "prosthetic", requestedItem, servicePath: "exam" });
  if (ep.status !== 201) throw new Error(`episode: ${JSON.stringify(ep.body)}`);
  const episodeId = Number(ep.body.id);
  const ex = await signExam(pid, { episodeId });
  if (ex.status >= 300) throw new Error(`signExam: ${JSON.stringify(ex.body)}`);
  const [f] = await q(`SELECT id FROM post_exam_followups
                        WHERE patient_id=$1 AND device_episode_id=$2`, [pid, episodeId]);
  return { pid, fid: Number(f.id), episodeId };
}

/** بيعُ جزءٍ حقيقيّ من بابِ «بلا معاينة» — البابُ الحيّ الذي أعاد إنتاج العطب. */
const sellComponent = (pid: number, price = 400_000) =>
  http("POST", "/api/no-exam/device-sale", S.recv, {
    patientId: pid, expertUserId: EXPERT, component: "socket",
    originalPrice: price, discountAmount: 0, paidNow: price, note: "بيع جزء",
  });

async function waitingIds(session = S.admin) {
  const r = await http("GET", "/api/followups/decision-queue?state=waiting", session);
  if (r.status !== 200) throw new Error(`waiting: ${r.status} ${JSON.stringify(r.body)}`);
  return {
    ids: (r.body?.rows ?? []).map((x: any) => Number(x.followupId)) as number[],
    total: Number(r.body?.total ?? -1),
  };
}
async function badgeCount(session = S.admin) {
  const r = await http("GET", "/api/followups/decision-queue/count", session);
  return Number(r.body?.count ?? -1);
}
/** **القراءةُ والعدّادُ معاً دائماً** — الشرطُ واحدٌ فلا يُقاس أحدُهما وحده. */
async function seen(fid: number) {
  const { ids, total } = await waitingIds();
  return { listed: ids.includes(fid), total, count: await badgeCount() };
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  for (const t of [
    `DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_events WHERE patient_id IN (${ids})`,
    `DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`,
    `DELETE FROM pending_service_charges WHERE patient_id IN (${ids})`,
    `DELETE FROM administrative_operation_reversals WHERE patient_id IN (${ids})`,
    `DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`,
    `DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`,
    `DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`,
    `DELETE FROM medical_exam_cancellations WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`,
    `DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`,
    `DELETE FROM medical_exams WHERE patient_id IN (${ids})`,
    `DELETE FROM journal_lines WHERE patient_id IN (${ids})`,
    `DELETE FROM journal_lines WHERE entry_id IN (SELECT id FROM journal_entries WHERE created_by = ANY(ARRAY[${ADMIN},${DOC},${RECV},${EXPERT}]))`,
    `DELETE FROM journal_entries WHERE created_by = ANY(ARRAY[${ADMIN},${DOC},${RECV},${EXPERT}])`,
    `DELETE FROM payments WHERE patient_id IN (${ids})`,
    `DELETE FROM cost_entries WHERE patient_id IN (${ids})`,
    `DELETE FROM visits WHERE patient_id IN (${ids})`,
    `DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`,
    `DELETE FROM price_change_requests WHERE patient_id IN (${ids})`,
    `DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_cases WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_contacts WHERE patient_id IN (${ids})`,
    `DELETE FROM patients WHERE referral_source = '${MARK}'`,
    `DELETE FROM patient_code_aliases a WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`,
  ]) await q(t);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, role, name] of [
    [ADMIN, "admin", "المسؤول"], [DOC, "doctor", "سعد"],
    [RECV, "reception", "ريام"], [EXPERT, "prosthetics_expert", "الخبير"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,
               branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$4,$3,1,'[1]'::jsonb,true,
               ${role === "doctor" ? `'["prosthetic","medical_support"]'::jsonb` : "'null'::jsonb"})
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, is_active=true,
               display_name=EXCLUDED.display_name, branch_ids=EXCLUDED.branch_ids`,
      [id, `dqs_u${id}`, role, name]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h
      ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")) }
      : {};
    next();
  });
  const realUse = app.use.bind(app);
  let skipped = 0;
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") {
      skipped++; return app;
    }
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));

  try {
    check(skipped === 1, "جدول النقاط الحقيقي مُركَّب", String(skipped));

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── أ. الشكلُ المُعادُ إنتاجُه — يتيمةٌ ثمّ بيعُ جزءٍ حقيقيّ ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      const { pid, fid } = await orphanFollowup("يتيمةٌ-ثمّ-بيع");
      const before = await seen(fid);
      same("١. **قبل البيع**: الصفُّ في «بانتظار الحسم» ومحسوبٌ في الشارة",
        [before.listed, before.count >= 1], [true, true]);

      const sale = await sellComponent(pid);
      same("٢. **وبيعُ الجزء يقع فعلاً** من بابه الحيّ", sale.status, 201);

      //  والبيعُ حقيقيٌّ لا لقطةَ حالة: أمرُ بناءٍ مفتوح، وحلقةٌ في التصنيع،
      //  ودفعةٌ، وقيدُ كلفة.
      const [wo] = await q(`SELECT purpose, status, admin_void_reversal_id
                              FROM prosthetic_work_orders WHERE patient_id=$1`, [pid]);
      const [ep] = await q(`SELECT status FROM patient_device_episodes WHERE patient_id=$1`, [pid]);
      const [{ n: paid }] = await q(`SELECT COUNT(*)::int n FROM payments WHERE patient_id=$1`, [pid]);
      const [{ n: costs }] = await q(`SELECT COUNT(*)::int n FROM cost_entries WHERE patient_id=$1`, [pid]);
      same("٣. **والبيعُ واقعةٌ لا لقطة**: أمرُ بناءٍ + حلقةٌ في التصنيع + دفعةٌ + قيدُ كلفة",
        [wo?.purpose, wo?.status, wo?.admin_void_reversal_id, ep?.status, paid, costs],
        ["initial_build", "active", null, "in_manufacturing", 1, 1]);

      //  والمتابعةُ **لم تتحرّك** — فالحجبُ ليس أثراً جانبياً لكتابةٍ ما.
      const [f] = await q(`SELECT status FROM post_exam_followups WHERE id=$1`, [fid]);
      same("٤. **والمتابعةُ نفسُها لم تتغيّر** — ما زالت غيرَ طرفيّة",
        f?.status, "awaiting_patient_decision");

      const after = await seen(fid);
      same("٥. **ومع ذلك لا تُعرَض ولا تُحسَب** — القراءةُ والعدّادُ معاً",
        [after.listed, after.count, before.count - after.count], [false, 0, 1]);
      same("٦. **و`total` ينقص معها** — لا عددٌ يُخالف الصفوف",
        before.total - after.total, 1);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ب. الضابط — مَن لم يُبَع له شيء يبقى ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      const { fid: orphanFid } = await orphanFollowup("يتيمةٌ-بلا-بيع");
      const { fid: examFid } = await readySale("طلبٌ-بلا-بيع");
      const { ids } = await waitingIds();
      same("٧. **يتيمةٌ بلا أيّ أمرِ بناء، وطلبٌ مُعايَنٌ لم يُبَع — كلاهما يظهر**",
        [ids.includes(orphanFid), ids.includes(examFid)], [true, true]);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ج. الحجبُ بهويّة العملية — لا يتعدّاها ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      //  ① مريضٌ آخر: بيعُ أحدِهما لا يمسّ الآخر إطلاقاً.
      const a = await orphanFollowup("يتيمةُ-مريضٍ-أ");
      const b = await orphanFollowup("يتيمةُ-مريضٍ-ب");
      same("٨. الاثنان في الطابور قبل أيّ بيع",
        [(await seen(a.fid)).listed, (await seen(b.fid)).listed], [true, true]);
      same("   وبيعُ جزءٍ للمريض أ يقع", (await sellComponent(a.pid)).status, 201);
      same("٩. **يُحجَب أ وحدَه، ويبقى ب** — لا حجبَ جماعيّ",
        [(await seen(a.fid)).listed, (await seen(b.fid)).listed], [false, true]);
    }
    {
      //  ② نفسُ المريض، قسمٌ آخر: بيعُ طرفٍ لا يحجب طلبَ مسند.
      const pid = await mkPatient("قسمان-لمريضٍ-واحد");
      await q(`UPDATE patients SET is_medical_support = true WHERE id = $1`, [pid]);
      await mkCase(pid, "prosthetic");
      await mkCase(pid, "medical_support");
      const exS = await signExam(pid, { caseType: "medical_support" });
      same("١٠. معاينةُ المساند تُوقَّع", exS.status < 300, true);
      const [fs] = await q(`SELECT id FROM post_exam_followups
                             WHERE patient_id=$1 AND service_type='medical_support'`, [pid]);
      const supportFid = Number(fs.id);
      same("    وصفُّ المساند في الطابور", (await seen(supportFid)).listed, true);
      same("    وبيعُ جزءِ **طرفٍ** لنفس المريض يقع", (await sellComponent(pid)).status, 201);
      same("١١. **وصفُّ المساند يبقى** — الحجبُ بالقسم لا بالمريض",
        (await seen(supportFid)).listed, true);
    }
    {
      //  ③ حلقتان على الخيط نفسِه: بيعُ إحداهما لا يحجب طلبَ الأخرى.
      const first = await readySale("حلقتان-الأولى", "full_device");
      const ep2 = await http("POST", `/api/patients/${first.pid}/device-episodes`, S.recv,
        { serviceType: "prosthetic", requestedItem: "socket", servicePath: "exam" });
      same("١٢. حلقةٌ ثانيةٌ تُفتَح على الخيط نفسِه", ep2.status, 201);
      const secondEpisodeId = Number(ep2.body.id);
      const ex2 = await signExam(first.pid, { episodeId: secondEpisodeId });
      same("    ومعاينتُها تُوقَّع على حلقتها بعينها", ex2.status < 300, true);
      const [f2] = await q(`SELECT id FROM post_exam_followups
                             WHERE patient_id=$1 AND device_episode_id=$2`,
        [first.pid, secondEpisodeId]);
      const secondFid = Number(f2.id);

      const sale = await http("POST", `/api/followups/${secondFid}/complete-sale`, S.recv,
        { originalPrice: 900_000, discountAmount: 0, expertUserId: EXPERT });
      same("١٣. وتُباع **الثانيةُ** من بابها القانونيّ", sale.status, 200);

      const [epA] = await q(`SELECT status FROM patient_device_episodes WHERE id=$1`,
        [first.episodeId]);
      same("١٤. **وحلقةُ الأولى ما زالت `examined` وصفُّها في الطابور**"
        + " — بيعُ جهازٍ لا يُنسَب إلى طلبِ جهازٍ آخر",
        [epA?.status, (await seen(first.fid)).listed], ["examined", true]);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── د. التراجعُ الإداريّ عن الشراء يعيد الصفَّ — بيعٌ عاد مالُه ليس بيعاً قائماً ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      const { pid, fid, episodeId } = await readySale("تراجعٌ-عن-الشراء");
      const sale = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 750_000, discountAmount: 0, expertUserId: EXPERT });
      same("١٥. البيعُ يقع", sale.status, 200);
      same("    ويخرج الصفُّ من الطابور (`converted` طرفيّة)",
        (await seen(fid)).listed, false);

      const pv = await http("POST", "/api/admin/operation-reversal/preview", S.admin,
        { followupId: fid });
      same("١٦. معاينةُ أثرِ التصحيح تنجح", pv.status, 200);
      const ex = await http("POST", "/api/admin/operation-reversal/execute", S.admin, {
        followupId: fid, intent: "purchase_mistake",
        reasonNote: "ضُغط «تم الشراء» بالخطأ", stateStamp: pv.body?.stateStamp,
        refundAnswer: "yes",
      });
      same("١٧. **«تراجعٌ عن الشراء فقط» ينفَّذ**", ex.status, 200);

      const [wo] = await q(`SELECT status, admin_void_reversal_id FROM prosthetic_work_orders
                             WHERE patient_id=$1`, [pid]);
      const [ep] = await q(`SELECT status FROM patient_device_episodes WHERE id=$1`, [episodeId]);
      same("١٨. والأثرُ كما يصفه ٤.n: أمرٌ مُبطَلٌ إدارياً وحلقةٌ عادت `examined`",
        [wo?.status, wo?.admin_void_reversal_id !== null, ep?.status],
        ["cancelled", true, "examined"]);

      const back = await seen(fid);
      same("١٩. **والصفُّ يعود إلى «بانتظار الحسم» ويُحسَب** — أمرٌ مُبطَلٌ ليس بيعاً قائماً",
        [back.listed, back.count >= 1], [true, true]);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. الحلقةُ المباعة بمتابعةٍ حيّة — لقطةُ قاعدةٍ ضابطة ──");
    // ═══════════════════════════════════════════════════════════════════
    //  لا بابَ حيّاً يُنتج هذه اليوم: كلُّ بابِ بيعٍ لحلقةٍ على مسار المعاينة
    //  إمّا يمرّ بـ`confirmPurchase` (فتصير `converted` طرفيّة) وإمّا يردّه
    //  `purchaseGovernedByFollowup` ٤٠٩. فتُبنى الحالةُ **لقطةَ قاعدةٍ
    //  ضابطة** — نفسُ نمط `legacyFollowup`/`noExamLinkedFollowup` في
    //  `decision_queue.test.ts` — لتثبت أن الشرطَ يحرس الشكلَ نفسَه لو
    //  تسرّب يوماً من بابٍ جديد.
    {
      const { pid, fid, episodeId } = await readySale("حلقةٌ-مباعةٌ-بمتابعةٍ-حيّة");
      same("٢٠. الصفُّ في الطابور قبل أيّ بيع", (await seen(fid)).listed, true);

      await q(`UPDATE patient_device_episodes SET status='in_manufacturing' WHERE id=$1`,
        [episodeId]);
      const [wo] = await q<{ id: number }>(
        `INSERT INTO prosthetic_work_orders
           (patient_id, branch_id, expert_user_id, service_type, purpose, status,
            current_stage, device_episode_id)
         VALUES ($1,1,$2,'prosthetic','initial_build','active','order_received',$3)
         RETURNING id`, [pid, EXPERT, episodeId]);
      same("٢١. **حلقةٌ `in_manufacturing` بأمرِ بناءٍ قائم ⟶ تُحجَب**",
        (await seen(fid)).listed, false);

      //  والحالةُ وحدها تكفي — «الحالةُ لقطةٌ قد تتأخّر، والأمرُ واقعةٌ لا تُنكَر»:
      //  كلُّ إشارةٍ من الزوج تحجب بمفردها.
      await q(`DELETE FROM prosthetic_work_orders WHERE id=$1`, [wo.id]);
      same("٢٢. **وحالةُ الحلقة وحدها تكفي** — بلا أمرٍ إطلاقاً",
        (await seen(fid)).listed, false);

      await q(`UPDATE patient_device_episodes SET status='examined' WHERE id=$1`, [episodeId]);
      const [wo2] = await q<{ id: number }>(
        `INSERT INTO prosthetic_work_orders
           (patient_id, branch_id, expert_user_id, service_type, purpose, status,
            current_stage, device_episode_id)
         VALUES ($1,1,$2,'prosthetic','initial_build','completed','delivered',$3)
         RETURNING id`, [pid, EXPERT, episodeId]);
      same("٢٣. **وأمرُ بناءٍ مكتملٌ وحدَه يكفي** — ولو تأخّرت حالةُ الحلقة",
        (await seen(fid)).listed, false);

      await q(`UPDATE prosthetic_work_orders SET admin_void_reversal_id = 0 WHERE id=$1`, [wo2.id]);
      same("٢٤. **وإبطالُه إدارياً يعيد الصفَّ** — الحدُّ هو هل عاد المال",
        (await seen(fid)).listed, true);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── و. الصيانةُ ليست بيعَ جهاز ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      const { pid, fid } = await orphanFollowup("يتيمةٌ-وصيانة");
      await q(`INSERT INTO prosthetic_work_orders
                 (patient_id, branch_id, expert_user_id, service_type, purpose, status,
                  current_stage)
               VALUES ($1,1,$2,'prosthetic','maintenance','active','order_received')`,
        [pid, EXPERT]);
      same("٢٥. **أمرُ صيانةٍ لا يحجب** — `purpose='maintenance'` ليس بيعَ جهاز",
        (await seen(fid)).listed, true);
    }

    console.log(
      "\nملاحظة: الصلاحياتُ والنطاقُ والتصنيفُ وهويّةُ الحاسم وتبويبُ «تم"
      + " الحسم» مُختبَرةٌ في server/decision_queue.test.ts — هذا الملفُّ"
      + " يثبت شرطَ «بِيع فلا يُعرَض ولا يُحسَب» وحده.");
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`,
      [[ADMIN, DOC, RECV, EXPERT]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`,
      [[ADMIN, DOC, RECV, EXPERT]]);
    httpServer.close();
  }

  console.log(`\n${failures === 0 ? "✅ كل فحوص حجب المبيع نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
