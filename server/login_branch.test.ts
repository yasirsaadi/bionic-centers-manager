// **الفرعُ المختار عند الدخول هو فرعُ الجلسة** — واقعةُ زين العابدين وليد (٢٠٢٦-١٠-٠١).
// `npm run test:login-branch` — حيٌّ على النقاط الحقيقية: `/api/verify-branch` ثمّ `/api/payments` بالجلسة نفسِها.
//
// موظّفُ ذي قار يحمل حسابُه كربلاءَ أوّلاً. كان يدخل «ذي قار» فتأخذ الجلسةُ **أوّلَ** فروعه (كربلاء) — ودفعةٌ قبضها في
// الناصرية لمريضٍ يصل الفرعين سُجّلت لكربلاء.

import express from "express";
import { createServer } from "http";
import bcrypt from "bcryptjs";
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

const PORT = 6973;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-فرع-الدخول";
const EMP = 99730, EXP = 99731;
const PASSWORD = "pw-login-branch";
const BAGHDAD = 1, KARBALA = 2, DHIQAR = 3;

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}

/** مخزنُ جلساتٍ بسيط بمعرّفٍ في الترويسة — فتحمل الدفعةُ ما كتبه الدخولُ بحرفه. */
const sessions = new Map<string, any>();
async function call(sid: string, method: string, path: string, body?: any) {
  const res = await fetch(BASE + path, {
    method, headers: { "content-type": "application/json", "x-sid": sid },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}
const login = (sid: string, branchKey: string) =>
  call(sid, "POST", "/api/verify-branch", { branchKey, username: "lb-emp", password: PASSWORD });

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE entry_id IN (SELECT id FROM journal_entries WHERE created_by = $1)`, [EMP]);
  await q(`DELETE FROM journal_entries WHERE created_by = $1`, [EMP]);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_branch_access WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM audit_log WHERE user_id = $1`, [EMP]);
  await q(`DELETE FROM submission_tokens WHERE token LIKE 'lb-tok-%'`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'كربلاء'),(3,'ذي قار') ON CONFLICT DO NOTHING`);
  const hash = await bcrypt.hash(PASSWORD, 10);
  //  حسابٌ لفرعين وكربلاءُ أوّلُهما — شكلُ حساب الواقعة.
  await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,
             can_view_patients,can_add_patients,can_add_payments,can_view_payments)
           VALUES ($1,'lb-emp',$2,'موظّف ذي قار','reception',$3,$4::jsonb,true,true,true,true,true)
           ON CONFLICT (id) DO UPDATE SET password_hash=EXCLUDED.password_hash, branch_id=EXCLUDED.branch_id,
             branch_ids=EXCLUDED.branch_ids, is_active=true, can_add_payments=true, can_view_patients=true`,
    [EMP, hash, KARBALA, JSON.stringify([KARBALA, DHIQAR])]);
  await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
           VALUES ($1,'lb-exp','x','خبير','prosthetics_expert',$2,$3::jsonb,true)
           ON CONFLICT (id) DO UPDATE SET branch_ids=EXCLUDED.branch_ids, is_active=true`,
    [EXP, BAGHDAD, JSON.stringify([BAGHDAD, DHIQAR])]);
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const sid = String(req.headers["x-sid"] ?? "");
    if (!sessions.has(sid)) sessions.set(sid, {});
    req.session = sessions.get(sid);
    req.session.save = (cb?: any) => cb?.();
    req.session.regenerate = (cb?: any) => cb?.();
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") return app;
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise<void>((r) => httpServer.once("listening", () => r()));

  try {
    //  مريضٌ مسجَّلٌ في بغداد، ومُتاحٌ لكربلاء وذي قار — يصل الفرعين.
    const [p] = await q<{ id: number }>(
      `INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_physiotherapy, total_cost)
       VALUES ('زين اختبار','07701234567',$1,'30','علاج',$2,true,500000) RETURNING id`, [MARK, BAGHDAD]);
    await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
             VALUES ($1,$2,'physiotherapy',500000,'manual','active')`, [p.id, BAGHDAD]);
    await q(`INSERT INTO patient_branch_access (patient_id, branch_id) VALUES ($1,$2),($1,$3)`, [p.id, KARBALA, DHIQAR]);

    console.log("\n── أ. الدخولُ بفرعٍ مختار ──");
    const inDq = await login("dq", "dhiqar");
    same("أ١. **مَن دخل «ذي قار» جلستُه ذي قار** — لا أوّلُ فروع حسابه",
      [inDq.status, inDq.body?.branchId, sessions.get("dq")?.branchSession?.branchId], [200, DHIQAR, DHIQAR]);
    const inKb = await login("kb", "karbala");
    same("أ٢. ومَن دخل «كربلاء» جلستُه كربلاء", [inKb.status, inKb.body?.branchId], [200, KARBALA]);
    const inBg = await login("bg", "baghdad");
    same("أ٣. وفرعٌ ليس من فروعه يُرفَض كما كان", inBg.status, 401);

    console.log("\n── ب. الدفعةُ تُنسَب لفرع الجلسة ──");
    const pay = await call("dq", "POST", "/api/payments", {
      patientId: p.id, branchId: KARBALA, amount: 250000, paymentMethod: "cash",
      paymentTreatmentType: "علاج طبيعي", notes: "جلسات",
    });
    check(pay.status < 300, "ب١. (الإعداد) الدفعةُ سُجّلت", JSON.stringify(pay.body));
    same("ب٢. **دفعةُ موظّف ذي قار في ذي قار** — ولو أرسل العميلُ فرعاً آخر",
      (await q(`SELECT branch_id FROM payments WHERE patient_id=$1`, [p.id])).map((r: any) => r.branch_id), [DHIQAR]);

    //  ══ وأبوابٌ كانت تكتب في فرع تسجيل المريض لا في فرع الموظّف (تدقيقُ ما يشبهها، §4.ax) ══
    console.log("\n── ج. التسعيرُ والخصمُ والخدمةُ المخصومة في فرع الموظّف ──");
    const branchesOf = async (sql: string) => (await q(sql, [p.id])).map((r: any) => Number(r.branch_id));
    const pr = await call("dq", "POST", `/api/patients/${p.id}/price-physio`,
      { entries: [{ treatmentType: "روبوت", sessionCount: 10 }] });
    same("ج١. **تسعيرُ الجلسات: قيدُ الكلفة في ذي قار**",
      [pr.status, await branchesOf(`SELECT branch_id FROM cost_entries WHERE patient_id=$1 AND source='physio_pricing' ORDER BY id`)],
      [200, [DHIQAR]]);
    const prd = await call("dq", "POST", `/api/patients/${p.id}/price-physio`,
      { entries: [{ treatmentType: "روبوت", sessionCount: 10 }], discount: { finalPrice: 400000, reason: "negotiation" } });
    same("ج٢. **والتسعيرُ المخصوم: الخصمُ وقيدُه في ذي قار**",
      [prd.status,
        await branchesOf(`SELECT branch_id FROM service_discount_requests WHERE patient_id=$1 ORDER BY id`),
        await branchesOf(`SELECT branch_id FROM cost_entries WHERE patient_id=$1 AND source='physio_pricing' ORDER BY id`)],
      [200, [DHIQAR], [DHIQAR, DHIQAR]]);
    const ns = await call("dq", "POST", `/api/patients/${p.id}/new-service`, {
      serviceType: "additional_therapy", serviceCost: 25000, initialPayment: 20000, submissionToken: `lb-tok-${Date.now()}`,
      treatmentEntries: [{ treatmentType: "أجهزة علاج طبيعي", sessionCount: 1, cost: 25000 }],
      paymentTreatmentType: "أجهزة علاج طبيعي", sessionCount: 1,
      discount: { finalPrice: 20000, reason: "negotiation" },
    });
    same("ج٣. **و«خدمة جديدة» مخصومة: دفعتُها في ذي قار** — كانت تُكتب في فرع التسجيل",
      [ns.status < 300,
        await branchesOf(`SELECT branch_id FROM payments WHERE patient_id=$1 AND amount=20000 ORDER BY id`)],
      [true, [DHIQAR]]);

    const [p2] = await q<{ id: number }>(
      `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, amputation_site,
         branch_id, is_amputee, total_cost, patient_classification)
       VALUES ('مريض قديم','07701234567',$1,'40','170','70','بتر','احادي - طرف سفلي - يمين - تحت الركبة',$2,true,0,'past')
       RETURNING id`, [MARK, BAGHDAD]);
    await q(`INSERT INTO patient_branch_access (patient_id, branch_id) VALUES ($1,$2)`, [p2.id, DHIQAR]);
    const wo = await call("dq", "POST", "/api/manufacturing/orders", { patientId: p2.id, expertUserId: EXP, serviceType: "prosthetic" });
    same("ج٤. **وأمرُ التصنيع لمريضٍ قديم يُفتَح في ذي قار** — لا في فرع تسجيله",
      [wo.status, (await q(`SELECT branch_id FROM prosthetic_work_orders WHERE patient_id=$1`, [p2.id])).map((r: any) => r.branch_id)],
      [201, [DHIQAR]]);
  } finally {
    await cleanup();
    await q(`UPDATE system_users SET is_active=false WHERE id = ANY($1::int[])`, [[EMP, EXP]]);
    httpServer.close();
    await pool.end();
  }
  console.log(failures === 0 ? "\n✅ كل الاختبارات نجحت" : `\n❌ ${failures} فشل`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
