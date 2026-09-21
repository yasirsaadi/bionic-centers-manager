// **الجلسةُ المُهداة تُحتسب، والمالُ لا يتحرّك** — حيّاً على Postgres وعلى
// النقاط الحقيقية. قاعدة محلّية: `npm run test:physio-free`.
//
// ══ قاعدةُ المالك (٢٠٢٦-٠٩-٢١) ═══════════════════════════════════════════
//   مَن يُدخل الجلسات — استقبالٌ أو مديرٌ أو مديرُ فرع:
//     • **بلا تأشير «مجاني»** ⟶ يُحتسب المال **وتُسجَّل الجلسات**.
//     • **بتأشير «مجاني»**   ⟶ تُسجَّل الجلسات **ولا يُحتسب المال**.
//
// ══ العطبُ الذي يغلقه ════════════════════════════════════════════════════
//   عدّادُ الجلسات يقرأ الخطةَ المحفوظة **وحدها** متى وُجدت — لا يجمعها مع
//   الدفعات أبداً (وإلّا عُدّت هديّةُ «خدمة جديدة» مرّتين: هي تكتب في
//   الاثنين معاً). و«نافذة الدفعات» كانت تكتب صفَّ الدفعة وحدَه، **فتختفي
//   الهديّةُ عن صاحب الخطة تماماً**: العدّادُ ١٠ ⟶ ١٠ بعد منح ستّ جلسات.
//
//   ومريضُ المفرد (بلا خطة) لم يكن يتأثّر — عدّادُه يقرأ الدفعات أصلاً.
//   فالإصلاحُ يرفع الخطةَ **إن وُجدت** ولا يُنشئ واحدةً أبداً (ذي قار).

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { resolvePurchasedSessions } from "../shared/pricing";
import { readFileSync } from "fs";
import { pickPhysioSessions, perVisitSessionMode } from "../client/src/pages/physio_sessions_source";

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

const PORT = 5623, BASE = `http://127.0.0.1:${PORT}`;
const q = (t: string, p: any[] = []) => pool.query(t, p);
const http = async (m: string, path: string, sess: any, body?: any) => {
  const res = await fetch(BASE + path, {
    method: m,
    headers: {
      "content-type": "application/json",
      "x-test-session": Buffer.from(JSON.stringify(sess), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
};

let code = 70000;

/** الحالةُ كما يقرؤها الملفُّ: الكلفة، والمقبوض، والعدّاد بمصدره. */
async function state(pid: number) {
  const p = (await q(`SELECT total_cost, treatment_type, physio_plan FROM patients WHERE id=$1`, [pid])).rows[0];
  const c = (await q(`SELECT cost FROM patient_cases WHERE patient_id=$1 AND case_type='physiotherapy'`, [pid])).rows[0];
  const pays = (await q(
    `SELECT payment_treatment_type t, session_count n, is_free_sessions f
       FROM payments WHERE patient_id=$1 AND session_count>0 ORDER BY id`, [pid])).rows;
  const paid = (await q(`SELECT COALESCE(SUM(amount),0)::int s FROM payments WHERE patient_id=$1`, [pid])).rows[0].s;
  const r = resolvePurchasedSessions({
    plan: p.physio_plan,
    treatmentTypeText: p.treatment_type,
    caseCost: c?.cost ?? p.total_cost,
    paymentSessions: pays.map((x: any) => ({ treatmentType: x.t, sessionCount: x.n, isFree: x.f })),
  });
  return { cost: Number(p.total_cost), paid: Number(paid), sessions: r.total, src: r.source, plan: p.physio_plan };
}

(async () => {
  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")) } : {};
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

    const BR = (await q(`SELECT id FROM branches ORDER BY id LIMIT 1`)).rows[0].id;
    await q(`INSERT INTO system_users (id,username,password_hash,role,display_name,branch_id,is_active)
             VALUES (9931,'physfree','x','admin','مالك',$1,true)
             ON CONFLICT (id) DO UPDATE SET is_active=true`, [BR]);
    const S = { userId: 9931, branchId: BR, displayName: "مالك", isAdmin: true, role: "admin",
      permissions: { canViewPatients: true, canAddPayments: true, canEditPayments: true, canDeletePayments: true } };

    const mk = async (name: string, withPlan: boolean) => {
      const id = (await q(
        `INSERT INTO patients (patient_code,name,branch_id,referral_source,age,medical_condition,is_physiotherapy)
         VALUES ($1,$2,$3,'مراجعة',40,'ألم',true) RETURNING id`, [`WB-${++code}`, name, BR])).rows[0].id;
      await q(`INSERT INTO patient_cases (patient_id,branch_id,case_type,cost,status)
               VALUES ($1,$2,'physiotherapy',0,'active')`, [id, BR]);
      if (withPlan) {
        await http("POST", `/api/patients/${id}/price-physio`, S,
          { entries: [{ treatmentType: "روبوت", sessionCount: 10 }] });
      }
      return id;
    };

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── أ. صاحبُ الخطة: المجّانيُّ من نافذة الدفعات (العطب) ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      const pid = await mk("خطة-مجاني-دفعات", true);
      const b = await state(pid);
      check(b.sessions === 10 && b.src === "plan", "أ١. الأساس: ١٠ جلسات من الخطة", JSON.stringify(b));

      //  **حمولةُ النافذة الحقيقية بالضبط**: `isFree` على البند، وبلا علمٍ
      //  علويّ — `PaymentModal` لا يرسل `isFreeSessions` إطلاقاً.
      const r = await http("POST", "/api/payments", S, {
        patientId: pid, branchId: BR, amount: 0, paymentMethod: "cash",
        paymentTreatmentType: "أجهزة علاج طبيعي", sessionCount: 6,
        treatmentEntries: [{ treatmentType: "أجهزة علاج طبيعي", sessionCount: 6, cost: 0, isFree: true }],
      });
      const a = await state(pid);
      check(r.status === 201, "أ٢. المنح نجح", String(r.status));
      const rows = (await q(`SELECT amount, session_count n, is_free_sessions f FROM payments WHERE patient_id=$1`, [pid])).rows;
      check(rows.length === 1 && rows[0].f === true && Number(rows[0].n) === 6 && Number(rows[0].amount) === 0,
        "أ٢أ. **صفُّ الهديّة كُتب فعلاً** من حمولة النافذة", JSON.stringify(rows));
      check(a.sessions === 16, "أ٣. **الجلسات تُحتسب**: ١٠ ⟶ ١٦", `${b.sessions} ⟶ ${a.sessions}`);
      check(a.cost === b.cost, "أ٤. **والمالُ لا يتحرّك**: الكلفة كما هي", `${b.cost} ⟶ ${a.cost}`);
      check(a.paid === b.paid, "أ٥. ولا المقبوض", `${b.paid} ⟶ ${a.paid}`);
      check(Array.isArray(a.plan) && a.plan.length === 2, "أ٦. الخطةُ ارتفعت بالنوع الجديد", JSON.stringify(a.plan));
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ب. صاحبُ الخطة: المجّانيُّ من «خدمة جديدة» (كان يعمل) ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      const pid = await mk("خطة-مجاني-خدمة", true);
      const b = await state(pid);
      const r = await http("POST", `/api/patients/${pid}/new-service`, S, {
        serviceType: "additional_therapy", discount: { isFree: true, reason: "تبرع" },
        treatmentEntries: [{ treatmentType: "أجهزة علاج طبيعي", sessionCount: 6 }],
      });
      const a = await state(pid);
      check(r.status === 201, "ب١. المنح نجح", String(r.status));
      check(a.sessions === 16, "ب٢. الجلسات تُحتسب: ١٠ ⟶ ١٦", `${b.sessions} ⟶ ${a.sessions}`);
      check(a.cost === b.cost, "ب٣. والمالُ لا يتحرّك", `${b.cost} ⟶ ${a.cost}`);
      check(a.paid === b.paid, "ب٤. ولا المقبوض", `${b.paid} ⟶ ${a.paid}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ج. صاحبُ الخطة: المدفوعُ من «خدمة جديدة» ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      const pid = await mk("خطة-مدفوع-خدمة", true);
      const b = await state(pid);
      const r = await http("POST", `/api/patients/${pid}/new-service`, S, {
        serviceType: "additional_therapy", serviceCost: 150000, initialPayment: 150000,
        treatmentEntries: [{ treatmentType: "أجهزة علاج طبيعي", sessionCount: 6 }],
      });
      const a = await state(pid);
      check(r.status < 300, "ج١. البيع نجح", String(r.status));
      check(a.sessions === 16, "ج٢. الجلسات تُحتسب: ١٠ ⟶ ١٦", `${b.sessions} ⟶ ${a.sessions}`);
      check(a.cost === b.cost + 150000, "ج٣. **والمالُ يُحتسب**: الكلفة +١٥٠,٠٠٠", `${b.cost} ⟶ ${a.cost}`);
      check(a.paid === b.paid + 150000, "ج٤. والمقبوض +١٥٠,٠٠٠", `${b.paid} ⟶ ${a.paid}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── د. مريضُ المفرد (بلا خطة) — ولا خطةَ تُخترَع له ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      const pid = await mk("مفرد-ذي-قار", false);
      await q(`UPDATE patients SET total_cost=750000, treatment_type='روبوت' WHERE id=$1`, [pid]);
      await q(`UPDATE patient_cases SET cost=750000 WHERE patient_id=$1 AND case_type='physiotherapy'`, [pid]);
      for (let k = 0; k < 15; k++) {
        await q(`INSERT INTO payments (patient_id,branch_id,amount,payment_treatment_type,session_count,is_free_sessions)
                 VALUES ($1,$2,50000,'روبوت',1,false)`, [pid, BR]);
      }
      const b = await state(pid);
      check(b.sessions === 15 && b.src === "payments", "د١. الأساس: ١٥ جلسة من الدفعات", JSON.stringify(b));

      const r = await http("POST", "/api/payments", S, {
        patientId: pid, branchId: BR, amount: 0, paymentMethod: "cash", isFreeSessions: true,
        treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 3 }],
      });
      const a = await state(pid);
      check(r.status === 201, "د٢. المنح نجح", String(r.status));
      check(a.sessions === 18, "د٣. الجلسات تُحتسب: ١٥ ⟶ ١٨", `${b.sessions} ⟶ ${a.sessions}`);
      check(a.plan === null, "د٤. **ولا خطةَ تُنشأ** — حمايةُ ذي قار سليمة", JSON.stringify(a.plan));
      check(a.cost === b.cost && a.paid === b.paid, "د٥. والمالُ لا يتحرّك", `${b.cost}/${b.paid} ⟶ ${a.cost}/${a.paid}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. شكلُ «انتصار»: الهديّةُ فوق الاشتقاق من الكلفة ──");
    // ═══════════════════════════════════════════════════════════════════
    //  ملفٌّ سابقٌ لترحيل ٠٣٦: بلا خطة، ونصُّه «روبوت» عارياً، وكلفتُه
    //  قابلةٌ للقسمة على سعر الجلسة — فالعدّادُ يعيد بناء العدد بالقسمة.
    //  والهديّةُ كانت تسقط لأن الاشتقاقَ يَغلب سجلَّ الدفعات كلَّه.
    {
      const pid = (await q(
        `INSERT INTO patients (patient_code,name,branch_id,referral_source,age,medical_condition,
                               is_physiotherapy,treatment_type,total_cost)
         VALUES ($1,'شكل-انتصار',$2,'مراجعة',45,'ألم',true,'روبوت',1300000) RETURNING id`,
        [`WB-${++code}`, BR])).rows[0].id;
      await q(`INSERT INTO patient_cases (patient_id,branch_id,case_type,cost,cost_source,status)
               VALUES ($1,$2,'physiotherapy',1300000,'auto','active')`, [pid, BR]);
      await q(`INSERT INTO payments (patient_id,branch_id,amount,payment_treatment_type,session_count,is_free_sessions)
               VALUES ($1,$2,50000,'روبوت',1,false),($1,$2,50000,'روبوت',1,false),
                      ($1,$2,0,'أجهزة علاج طبيعي',6,true)`, [pid, BR]);
      const s = await state(pid);
      check(s.src === "cost", "هـ١. المصدرُ اشتقاقٌ من الكلفة (١,٣٠٠,٠٠٠ ÷ ٥٠,٠٠٠)", s.src);
      check(s.sessions === 32, "هـ٢. **٢٦ مشتراة + ٦ مهداة = ٣٢** — الهديّةُ لم تعد تسقط", String(s.sessions));

      //  وبعد أن تُصحَّح الكلفةُ إلى المدفوع فعلاً، يسقط الاشتقاق ويعود
      //  العدّادُ إلى سجلّ الدفعات — جلستان مدفوعتان + ستٌّ مهداة.
      await q(`UPDATE patients SET total_cost=100000 WHERE id=$1`, [pid]);
      await q(`UPDATE patient_cases SET cost=100000, cost_source='manual' WHERE patient_id=$1 AND case_type='physiotherapy'`, [pid]);
      const s2 = await state(pid);
      check(s2.src === "payments" && s2.sessions === 8,
        "هـ٣. وبعد تصحيح الكلفة: ٨ من الدفعات (٢ مدفوعة + ٦ مهداة)", `${s2.sessions} (${s2.src})`);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── و. ولا يُحتسب المهدى مرّتين، ولا دفعةُ جهازٍ تدخل الخطة ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      const pid = await mk("خطة-لا-تكرار", true);
      await http("POST", "/api/payments", S, {
        patientId: pid, branchId: BR, amount: 0, paymentMethod: "cash", isFreeSessions: true,
        treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 4 }],
      });
      const a = await state(pid);
      check(a.sessions === 14, "و١. ١٠ + ٤ = ١٤ (بلا ازدواج بين الخطة والدفعة)", String(a.sessions));
      check(Array.isArray(a.plan) && a.plan.length === 1
        && (a.plan as any[])[0].sessionCount === 14,
        "و٢. الخطةُ دُمجت في سطرٍ واحد للنوع نفسِه", JSON.stringify(a.plan));

      //  نوعٌ ليس من العلاج الطبيعي لا يدخل الخطة إطلاقاً.
      const planBefore = JSON.stringify(a.plan);
      await http("POST", "/api/payments", S, {
        patientId: pid, branchId: BR, amount: 0, paymentMethod: "cash", isFreeSessions: true,
        treatmentEntries: [{ treatmentType: "أطراف صناعية", sessionCount: 3 }],
      });
      const c = await state(pid);
      check(JSON.stringify(c.plan) === planBefore, "و٣. **ودفعةُ جهازٍ لا تدخل الخطة**", JSON.stringify(c.plan));
    }


    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ز. بنودٌ مختلطة: مدفوعٌ ومُهدى في إرسالٍ واحد ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      const pid = await mk("مختلط", true);
      await q(`UPDATE patients SET total_cost=1000000 WHERE id=$1`, [pid]);
      await q(`UPDATE patient_cases SET cost=1000000 WHERE patient_id=$1 AND case_type='physiotherapy'`, [pid]);
      const r = await http("POST", "/api/payments", S, {
        patientId: pid, branchId: BR, amount: 50000, paymentMethod: "cash",
        treatmentEntries: [
          { treatmentType: "روبوت", sessionCount: 1, cost: 50000 },
          { treatmentType: "أجهزة علاج طبيعي", sessionCount: 4, cost: 0, isFree: true },
        ],
      });
      const rows = (await q(`SELECT amount, payment_treatment_type t, session_count n, is_free_sessions f
                               FROM payments WHERE patient_id=$1 ORDER BY id`, [pid])).rows;
      const a = await state(pid);
      check(r.status === 201, "ز١. الإرسال نجح", String(r.status));
      check(rows.length === 2, "ز٢. صفّان: مدفوعٌ ومُهدى", JSON.stringify(rows));
      check(rows.some((x: any) => !x.f && Number(x.amount) === 50000),
        "ز٣. المدفوعُ بمبلغه وعلمُه مُطفأ", JSON.stringify(rows));
      check(rows.some((x: any) => x.f === true && Number(x.amount) === 0 && Number(x.n) === 4),
        "ز٤. والمُهدى بصفر وعلمُه مرفوع", JSON.stringify(rows));
      check(a.paid === 50000, "ز٥. المقبوض = المدفوع وحده", String(a.paid));
      check(a.sessions === 14, "ز٦. الخطة ١٠ + ٤ مُهداة = ١٤ (والمدفوعةُ تحصيل)", String(a.sessions));
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ح. منحان متزامنان — ولا هديّةٌ تضيع ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      const pid = await mk("تزامن", true);
      const body = (n: number) => ({
        patientId: pid, branchId: BR, amount: 0, paymentMethod: "cash",
        paymentTreatmentType: "أبر صينية", sessionCount: n,
        treatmentEntries: [{ treatmentType: "أبر صينية", sessionCount: n, cost: 0, isFree: true }],
      });
      //  ══ **والسباقُ حتميٌّ لا احتمال** ═════════════════════════════════
      //  `Promise.all` وحدها قد تتسلسل طبيعياً فتمرّ حتى بلا قفل — فحصٌ
      //  يمرّ لسببٍ خاطئ ليس فحصاً. فتُحجَز **أوّلُ كتابةٍ للخطة** داخل
      //  معاملتها، ويُترَك الطلبُ الثاني يمضي بكامله، ثمّ تُحرَّر:
      //    • بلا قفل ⟹ الثاني قرأ الخطةَ القديمة وكتب ١٢، ثمّ يكتب الأوّل
      //      ١٣ فوقه — **فتضيع هديّةُ الاثنتين**.
      //    • بالقفل ⟹ `FOR UPDATE` للثاني ينتظر التزامَ الأوّل، فيقرأ ١٣
      //      ويكتب ١٥.
      //  والبوّابةُ على عميل القاعدة **في ملفّ الاختبار وحده**، وتُستعاد في
      //  `finally` مهما وقع — ولا حرفَ في شيفرة الخادم.
      //  المعاملةُ تستعير عميلاً من المجمَّع (`pool.connect`) ولا تمرّ
      //  بـ`pool.query` — فالبوّابةُ على العميل المُستعار لا على المجمَّع.
      const origConnect = (pool as any).connect.bind(pool);
      let held = false;
      let release!: () => void;
      const gate = new Promise<void>((res) => { release = res; });
      (pool as any).connect = async (...cArgs: any[]) => {
        //  شكلُ الاستدعاء بدالّةِ نداءٍ يُترَك للأصل كما هو.
        if (cArgs.some((x) => typeof x === "function")) return origConnect(...cArgs);
        const client: any = await origConnect();
        if (!client || typeof client.query !== "function") return client;
        const cq = client.query.bind(client);
        client.query = async (...args: any[]) => {
          const text = typeof args[0] === "string" ? args[0] : String(args[0]?.text ?? "");
          if (!held && /update\s+"?patients"?\s+set/i.test(text) && /physio_plan/i.test(text)) {
            held = true;
            await gate;
          }
          return cq(...args);
        };
        return client;
      };
      let r1: any, r2: any;
      try {
        const p1 = http("POST", "/api/payments", S, body(3));
        //  مهلةٌ قصيرة ليبلغ الأوّلُ البوّابةَ وهو ممسكٌ بقفل صفّ المريض.
        await new Promise((r) => setTimeout(r, 400));
        const p2 = http("POST", "/api/payments", S, body(2));
        await new Promise((r) => setTimeout(r, 400));
        release();
        [r1, r2] = await Promise.all([p1, p2]);
      } finally {
        (pool as any).connect = origConnect;
      }
      const a = await state(pid);
      check(held, "ح١. البوّابةُ أمسكت كتابةَ الخطة فعلاً — السباقُ وقع", String(held));
      check(r1.status === 201 && r2.status === 201, "ح٢. الإرسالان نجحا", `${r1.status}/${r2.status}`);
      check(a.sessions === 15, "ح٣. **١٠ + ٣ + ٢ = ١٥** — لا كتابةَ فوق الأخرى", String(a.sessions));
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ط. تصحيحُ الهديّة وحذفُها يُصحِّحان الخطة ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      const pid = await mk("تصحيح", true);
      const base = await state(pid);
      const r = await http("POST", "/api/payments", S, {
        patientId: pid, branchId: BR, amount: 0, paymentMethod: "cash",
        paymentTreatmentType: "أجهزة علاج طبيعي", sessionCount: 6,
        treatmentEntries: [{ treatmentType: "أجهزة علاج طبيعي", sessionCount: 6, cost: 0, isFree: true }],
      });
      const payId = (await q(`SELECT id FROM payments WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`, [pid])).rows[0].id;
      check((await state(pid)).sessions === 16, "ط١. بعد المنح: ١٦", String((await state(pid)).sessions));

      //  تصحيحُ العدد ستٌّ ⟶ ثلاث (مسارٌ مباشر: عددُ الجلسات غيرُ محميّ)
      const c = await http("PATCH", `/api/payments/${payId}`, S, { sessionCount: 3 });
      const afterFix = await state(pid);
      check(c.status === 200, "ط٢. التصحيح نجح", String(c.status));
      check(afterFix.sessions === 13, "ط٣. **١٦ ⟶ ١٣** — الخطةُ نقصت بالمقدار", String(afterFix.sessions));

      //  ثمّ الحذف — يُنقص الباقي
      const d = await http("DELETE", `/api/payments/${payId}`, S, { reason: "أُدخلت بالخطأ" });
      const afterDel = await state(pid);
      check(d.status === 200, "ط٤. الحذف نجح", `${d.status} ${JSON.stringify(d.body).slice(0,120)}`);
      check(afterDel.sessions === 10, "ط٥. **١٣ ⟶ ١٠** — عادت الخطةُ كما كانت", String(afterDel.sessions));
      check(afterDel.cost === base.cost && afterDel.paid === base.paid,
        "ط٦. ولا دينارَ تحرّك في الثلاثة", `${base.cost}/${base.paid} ⟶ ${afterDel.cost}/${afterDel.paid}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ي. والاستقبالُ لا يمنح مجّاناً ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      await q(`INSERT INTO system_users (id,username,password_hash,role,display_name,branch_id,is_active)
               VALUES (9932,'physfree_r','x','reception','استقبال',$1,true)
               ON CONFLICT (id) DO UPDATE SET is_active=true`, [BR]);
      const R = { userId: 9932, branchId: BR, displayName: "استقبال", isAdmin: false, role: "reception",
        permissions: { canViewPatients: true, canAddPayments: true, canEditPayments: true } };
      const pid = await mk("استقبال-لا-يمنح", true);
      const before = await state(pid);
      const r = await http("POST", "/api/payments", R, {
        patientId: pid, branchId: BR, amount: 0, paymentMethod: "cash",
        paymentTreatmentType: "أبر صينية", sessionCount: 5,
        treatmentEntries: [{ treatmentType: "أبر صينية", sessionCount: 5, cost: 0, isFree: true }],
      });
      const a = await state(pid);
      const freeRows = (await q(`SELECT 1 FROM payments WHERE patient_id=$1 AND is_free_sessions`, [pid])).rows;
      check(freeRows.length === 0, "ي١. **لا صفَّ هديّةٍ يُكتب** لغير المخوَّل", `${freeRows.length} | HTTP ${r.status}`);
      check(a.sessions === before.sessions, "ي٢. ولا الخطةُ ترتفع", `${before.sessions} ⟶ ${a.sessions}`);
    }


    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ك. ولا علمَ مجّانيّةٍ من العميل على المسار المفرد ──");
    // ═══════════════════════════════════════════════════════════════════
    //  حمولةٌ **بلا `treatmentEntries` إطلاقاً** — المسارُ المفرد. كان
    //  `{ ...input }` يخزّن علمَ العميل كما وصل، فيلتفّ الاستقبالُ على
    //  البوّابة ويرفع الخطة. مُثبَتٌ حيّاً قبل الإصلاح: ١٠ ⟶ ١٥.
    {
      await q(`INSERT INTO system_users (id,username,password_hash,role,display_name,branch_id,is_active)
               VALUES (9933,'physfree_r2','x','reception','استقبال٢',$1,true)
               ON CONFLICT (id) DO UPDATE SET is_active=true`, [BR]);
      const R = { userId: 9933, branchId: BR, displayName: "استقبال٢", isAdmin: false, role: "reception",
        permissions: { canViewPatients: true, canAddPayments: true } };
      const pid = await mk("مفرد-التفاف", true);
      const before = await state(pid);
      const r = await http("POST", "/api/payments", R, {
        patientId: pid, branchId: BR, amount: 0, paymentMethod: "cash",
        isFreeSessions: true, paymentTreatmentType: "روبوت", sessionCount: 5,
      });
      const a = await state(pid);
      const gifts = (await q(`SELECT 1 FROM payments WHERE patient_id=$1 AND is_free_sessions`, [pid])).rows;
      check(gifts.length === 0, "ك١. **لا صفَّ مجّانيّ يُخزَّن** من حساب الاستقبال", `${gifts.length} | HTTP ${r.status}`);
      check(a.sessions === before.sessions, "ك٢. ولا الخطةُ ترتفع", `${before.sessions} ⟶ ${a.sessions}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ل. والهديّةُ القديمة لا يُطرَح منها شيء ──");
    // ═══════════════════════════════════════════════════════════════════
    //  صفٌّ سابقٌ لترحيل ٠٨٧ (`plan_credited IS NULL`) لم يدخل الخطةَ قطّ.
    //  فطرحٌ أعمى عند حذفه كان يُنزل خطةَ عشرٍ إلى أربع.
    {
      const pid = await mk("هديّةٌ-قديمة", true);
      const payId = (await q(
        `INSERT INTO payments (patient_id,branch_id,amount,payment_treatment_type,session_count,is_free_sessions,plan_credited)
         VALUES ($1,$2,0,'روبوت',6,true,NULL) RETURNING id`, [pid, BR])).rows[0].id;
      const before = await state(pid);
      check(before.sessions === 10, "ل١. الخطةُ عشرٌ والهديّةُ القديمة خارجها", String(before.sessions));

      const c = await http("PATCH", `/api/payments/${payId}`, S, { sessionCount: 3 });
      check((await state(pid)).sessions === 10, "ل٢. تصحيحُها لا يمسّ الخطة", `HTTP ${c.status}`);

      const d = await http("DELETE", `/api/payments/${payId}`, S, { reason: "قديمة" });
      const after = await state(pid);
      check(d.status === 200, "ل٣. الحذف نجح", String(d.status));
      check(after.sessions === 10, "ل٤. **والخطةُ عشرٌ كما كانت** — لا ٤", String(after.sessions));
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── م. وإثباتُ المنشأ يُكتب على الصفّ ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      const withPlan = await mk("منشأ-بخطة", true);
      await http("POST", "/api/payments", S, {
        patientId: withPlan, branchId: BR, amount: 0, paymentMethod: "cash",
        paymentTreatmentType: "روبوت", sessionCount: 2,
        treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 2, cost: 0, isFree: true }],
      });
      const a1 = (await q(`SELECT plan_credited c FROM payments WHERE patient_id=$1`, [withPlan])).rows;
      check(a1.length === 1 && a1[0].c === true, "م١. صاحبُ الخطة: الصفُّ موسومٌ **مقيَّداً**", JSON.stringify(a1));

      const noPlan = await mk("منشأ-بلا-خطة", false);
      await http("POST", "/api/payments", S, {
        patientId: noPlan, branchId: BR, amount: 0, paymentMethod: "cash",
        paymentTreatmentType: "روبوت", sessionCount: 2,
        treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 2, cost: 0, isFree: true }],
      });
      const a2 = (await q(`SELECT plan_credited c FROM payments WHERE patient_id=$1`, [noPlan])).rows;
      check(a2.length === 1 && a2[0].c === false, "م٢. ومريضُ المفرد: موسومٌ **غيرَ مقيَّد** (لا خطةَ له)", JSON.stringify(a2));
      check((await state(noPlan)).sessions === 2, "م٣. وعدّادُه يقرأ الهديّةَ من دفعاته", String((await state(noPlan)).sessions));
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ن. وتعديلان متزامنان لهديّةٍ واحدة ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      const pid = await mk("تزامنُ-التعديل", true);
      await http("POST", "/api/payments", S, {
        patientId: pid, branchId: BR, amount: 0, paymentMethod: "cash",
        paymentTreatmentType: "روبوت", sessionCount: 6,
        treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 6, cost: 0, isFree: true }],
      });
      const payId = (await q(`SELECT id FROM payments WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`, [pid])).rows[0].id;
      check((await state(pid)).sessions === 16, "ن١. الأساس: ١٠ + ٦ = ١٦", String((await state(pid)).sessions));

      await Promise.all([
        http("PATCH", `/api/payments/${payId}`, S, { sessionCount: 3 }),
        http("PATCH", `/api/payments/${payId}`, S, { sessionCount: 4 }),
      ]);
      const row = (await q(`SELECT session_count n FROM payments WHERE id=$1`, [payId])).rows[0];
      const a = await state(pid);
      //  **الثابتُ**: الخطةُ = ١٠ + ما يقوله الصفُّ الآن — أيّاً كان الفائز.
      check(a.sessions === 10 + Number(row.n),
        "ن٢. **الخطةُ تطابق الصفَّ بالضبط** — لا طرحَ مرّتين", `صفّ=${row.n} خطة=${a.sessions}`);
    }


    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── س. والصفُّ ورصيدُه في الخطة: معاً أو لا شيء ──");
    // ═══════════════════════════════════════════════════════════════════
    //  كان الإدراجُ يُلتزَم ثمّ تُفتَح معاملةٌ ثانية للخطة — ففشلٌ بينهما
    //  يترك هديّةً مخزَّنةً وعدّادَ صاحب الخطة ساكناً، وإعادةُ المحاولة
    //  تُنتج هديّةً ثانية. فيُحقَن فشلٌ حقيقيٌّ في كتابة الخطة ويُقاس الأثر.
    {
      const pid = await mk("ذرّية", true);
      const before = await state(pid);
      const origConnect = (pool as any).connect.bind(pool);
      let fired = false;
      (pool as any).connect = async (...cArgs: any[]) => {
        if (cArgs.some((x) => typeof x === "function")) return origConnect(...cArgs);
        const client: any = await origConnect();
        if (!client || typeof client.query !== "function") return client;
        const cq = client.query.bind(client);
        client.query = async (...args: any[]) => {
          const text = typeof args[0] === "string" ? args[0] : String(args[0]?.text ?? "");
          if (!fired && /update\s+"?patients"?\s+set/i.test(text) && /physio_plan/i.test(text)) {
            fired = true;
            throw new Error("عطلٌ محقونٌ في كتابة الخطة");
          }
          return cq(...args);
        };
        return client;
      };
      let r: any;
      try {
        r = await http("POST", "/api/payments", S, {
          patientId: pid, branchId: BR, amount: 0, paymentMethod: "cash",
          paymentTreatmentType: "روبوت", sessionCount: 4,
          treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 4, cost: 0, isFree: true }],
        });
      } finally {
        (pool as any).connect = origConnect;
      }
      const rows = (await q(`SELECT id FROM payments WHERE patient_id=$1`, [pid])).rows;
      const a = await state(pid);
      check(fired, "س١. العطلُ حُقن في كتابة الخطة فعلاً", String(fired));
      check(r.status >= 400, "س٢. والطلبُ يُردّ بخطأ — لا نجاحٌ كاذب", String(r.status));
      check(rows.length === 0, "س٣. **ولا صفَّ دفعةٍ بقي** — تراجعت المعاملةُ كاملةً", JSON.stringify(rows));
      check(a.sessions === before.sessions, "س٤. والخطةُ كما كانت", `${before.sessions} ⟶ ${a.sessions}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ع. وحارسُ «لا متبقّي» لا يسقط ببنودٍ صفرية ──");
    // ═══════════════════════════════════════════════════════════════════
    //  ثغرةٌ أدخلتُها أنا في إصلاح «المجّانيُّ بالبنود يتخطّى الحارس»: كان
    //  `payableTotal` يُحسَب من **كلف البنود وحدها**. وحمولةُ الطرف/المسند
    //  تصل ببنودٍ كلفتُها صفرٌ ومبلغٍ يدويٍّ في الأعلى — فيخرج المجموعُ
    //  صفراً، **ويُتخطّى الحارس**، ثمّ تُدرج «شبكةُ الأمان» أدناه دفعةً
    //  موجبة على ملفٍّ سُدِّد بالكامل. والقاعدةُ الآن: يُتخطّى الحارسُ حين
    //  تكون البنودُ **كلُّها مُهداةً** لا حين يكون مجموعُها صفراً.
    {
      const pid = await mk("حارس-المتبقّي", true);
      //  يُسدَّد الملفُّ بالكامل، فلا متبقّي عليه إطلاقاً.
      const st0 = await state(pid);
      if (st0.cost - st0.paid > 0) {
        await http("POST", "/api/payments", S, {
          patientId: pid, branchId: BR, amount: st0.cost - st0.paid, paymentMethod: "cash",
          paymentTreatmentType: "روبوت", sessionCount: 0,
        });
      }
      const b = await state(pid);
      check(b.cost - b.paid === 0, "ع١. الأساس: الملفُّ مُسدَّدٌ بالكامل", `${b.cost} − ${b.paid}`);

      const rowsBefore = (await q(`SELECT count(*)::int n FROM payments WHERE patient_id=$1`, [pid])).rows[0].n;
      const r = await http("POST", "/api/payments", S, {
        patientId: pid, branchId: BR, amount: 50000, paymentMethod: "cash",
        paymentTreatmentType: "روبوت", sessionCount: 0,
        //  **بنودٌ صفريةٌ غيرُ مُهداة** + مبلغٌ موجبٌ في الأعلى — شكلُ الثغرة.
        treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 0, cost: 0 }],
      });
      const rowsAfter = (await q(`SELECT count(*)::int n FROM payments WHERE patient_id=$1`, [pid])).rows[0].n;
      const a = await state(pid);
      check(r.status === 400, "ع٢. **تُردّ ٤٠٠** — لا دفعةَ على ملفٍّ بلا متبقّي", String(r.status));
      check(String(r.body?.message ?? "").includes("متبقي"),
        "ع٣. والرسالةُ رسالةُ الحارس نفسُها", String(r.body?.message));
      check(rowsAfter === rowsBefore, "ع٤. **وصفرُ صفوفٍ أُدرجت**", `${rowsBefore} ⟶ ${rowsAfter}`);
      check(a.paid === b.paid, "ع٥. والمقبوضُ كما كان", `${b.paid} ⟶ ${a.paid}`);

      //  **والهديّةُ لا تُردّ**: حمولةٌ كلُّ بنودها مُهداة تمضي على الملفّ
      //  المُسدَّد نفسِه — وهو ما جاء تخطّي الحارس لأجله، ولم يُكسَر.
      const g = await http("POST", "/api/payments", S, {
        patientId: pid, branchId: BR, amount: 0, paymentMethod: "cash",
        paymentTreatmentType: "روبوت", sessionCount: 4,
        treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 4, cost: 0, isFree: true }],
      });
      const g2 = await state(pid);
      check(g.status === 201, "ع٦. والمجّانيُّ الصريحُ يمضي على الملفّ نفسِه", String(g.status));
      check(g2.sessions === b.sessions + 4, "ع٧. والجلساتُ تُحتسب", `${b.sessions} ⟶ ${g2.sessions}`);
      check(g2.paid === b.paid, "ع٨. ولا دينارَ تحرّك", `${b.paid} ⟶ ${g2.paid}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ف. وكلُّ كاتبٍ للخطة يتسلسل مع الهديّة ──");
    // ═══════════════════════════════════════════════════════════════════
    //  `adjustPhysioPlanForGift` تقفل صفَّ المريض، لكنّ كاتبَي الخطة
    //  الآخرَين — «الكلفة والجلسات» و«خدمة جديدة» — كانا يقرآن الخطةَ بلا
    //  قفلٍ ثمّ يكتبان فوقها بعد أسطر. فهديّةٌ تُقيَّد في تلك الفجوة تضيع:
    //  يُكتب «القديمُ + الجديد» وصفُّ الهديّة باقٍ يقول إنها قُيِّدت.
    //
    //  والسباقُ حتميٌّ بالبوّابة نفسِها من القسم ح: تُحجَز كتابةُ الهديّة
    //  **وهي ممسكةٌ بقفل الصفّ**، ويُطلَق الكاتبُ الآخر فيبلغ قراءتَه:
    //    • بلا قفل ⟹ يقرأ ١٠ ويكتب ١٠+٥ = ١٥ — **الهديّةُ ضاعت**.
    //    • بالقفل ⟹ ينتظر التزامَ الهديّة، فيقرأ ١٦ ويكتب ٢١.
    const planWriterRace = async (
      label: string, tag: string, fire: (pid: number) => Promise<any>,
    ) => {
      const pid = await mk(label, true);
      const origConnect = (pool as any).connect.bind(pool);
      let held = false;
      let release!: () => void;
      const gate = new Promise<void>((res) => { release = res; });
      (pool as any).connect = async (...cArgs: any[]) => {
        if (cArgs.some((x) => typeof x === "function")) return origConnect(...cArgs);
        const client: any = await origConnect();
        if (!client || typeof client.query !== "function") return client;
        const cq = client.query.bind(client);
        client.query = async (...args: any[]) => {
          const text = typeof args[0] === "string" ? args[0] : String(args[0]?.text ?? "");
          if (!held && /update\s+"?patients"?\s+set/i.test(text) && /physio_plan/i.test(text)) {
            held = true;
            await gate;
          }
          return cq(...args);
        };
        return client;
      };
      let gift: any, other: any;
      try {
        const g = http("POST", "/api/payments", S, {
          patientId: pid, branchId: BR, amount: 0, paymentMethod: "cash",
          paymentTreatmentType: "روبوت", sessionCount: 6,
          treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 6, cost: 0, isFree: true }],
        });
        await new Promise((r) => setTimeout(r, 400));
        const o = fire(pid);
        await new Promise((r) => setTimeout(r, 600));
        release();
        [gift, other] = await Promise.all([g, o]);
      } finally {
        (pool as any).connect = origConnect;
      }
      const a = await state(pid);
      check(held, `${tag}١. البوّابةُ أمسكت كتابةَ الهديّة — السباقُ وقع`, String(held));
      check(gift.status === 201 && other.status < 300,
        `${tag}٢. الطلبان نجحا`, `${gift.status}/${other.status}`);
      check(a.sessions === 21, `${tag}٣. **١٠ + ٦ + ٥ = ٢١** — لا هديّةَ تضيع`, String(a.sessions));
    };

    await planWriterRace("سباق-تسعير", "ف", (pid) =>
      http("POST", `/api/patients/${pid}/price-physio`, S,
        { entries: [{ treatmentType: "روبوت", sessionCount: 5 }] }));

    console.log("\n── ص. و«خدمة جديدة» كذلك ──");
    await planWriterRace("سباق-خدمة", "ص", (pid) =>
      http("POST", `/api/patients/${pid}/new-service`, S, {
        serviceType: "additional_therapy", serviceCost: 250000, initialPayment: 250000,
        treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 5 }],
      }));

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ق. والسؤالُ «أله خطة؟» تحت القفل لا قبله ──");
    // ═══════════════════════════════════════════════════════════════════
    //  الساقُ الثالثة: `creditGiftToPlanTx` تقرأ «أللمريض خطة؟» فتقرّر —
    //  تُقيِّد الهديّةَ في الخطة أم تَسِم الصفَّ `planCredited = false`
    //  وتمضي. وكانت تقرأ **بلا قفل**، فتسعيرٌ يُنشئ الخطةَ في اللحظة عينها
    //  يجعلها تقرأ «بلا خطة» فتمضي، ثمّ تُكتب الخطةُ من التسعير وحده —
    //  **فتختفي الهديّةُ عن عدّادٍ صار يقرأ الخطةَ وحدها**.
    //
    //  هنا تُحجَز كتابةُ **التسعير** (فمريضٌ بلا خطةٍ لا يكتب مسارُ الهديّة
    //  شيئاً)، وتُطلَق الهديّةُ فتبلغ سؤالَها:
    //    • بلا قفل ⟹ تقرأ «بلا خطة» وتمضي ⟹ الخطةُ ٥ والهديّةُ ضاعت.
    //    • بالقفل ⟹ تنتظر التزامَ التسعير، فتقرأ الخطةَ وتُقيِّد ⟹ ٩.
    {
      const pid = await mk("سباق-بلا-خطة", false);
      const origConnect = (pool as any).connect.bind(pool);
      let held = false;
      let release!: () => void;
      const gate = new Promise<void>((res) => { release = res; });
      (pool as any).connect = async (...cArgs: any[]) => {
        if (cArgs.some((x) => typeof x === "function")) return origConnect(...cArgs);
        const client: any = await origConnect();
        if (!client || typeof client.query !== "function") return client;
        const cq = client.query.bind(client);
        client.query = async (...args: any[]) => {
          const text = typeof args[0] === "string" ? args[0] : String(args[0]?.text ?? "");
          if (!held && /update\s+"?patients"?\s+set/i.test(text) && /physio_plan/i.test(text)) {
            held = true;
            await gate;
          }
          return cq(...args);
        };
        return client;
      };
      let price: any, gift: any;
      try {
        const pr = http("POST", `/api/patients/${pid}/price-physio`, S,
          { entries: [{ treatmentType: "روبوت", sessionCount: 5 }] });
        await new Promise((r) => setTimeout(r, 400));
        const g = http("POST", "/api/payments", S, {
          patientId: pid, branchId: BR, amount: 0, paymentMethod: "cash",
          paymentTreatmentType: "روبوت", sessionCount: 4,
          treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 4, cost: 0, isFree: true }],
        });
        await new Promise((r) => setTimeout(r, 600));
        release();
        [price, gift] = await Promise.all([pr, g]);
      } finally {
        (pool as any).connect = origConnect;
      }
      const a = await state(pid);
      const credited = (await q(
        `SELECT plan_credited FROM payments WHERE patient_id=$1 AND is_free_sessions=true ORDER BY id DESC LIMIT 1`,
        [pid])).rows[0]?.plan_credited;
      check(held, "ق١. البوّابةُ أمسكت كتابةَ التسعير — السباقُ وقع", String(held));
      check(price.status < 300 && gift.status === 201, "ق٢. الطلبان نجحا", `${price.status}/${gift.status}`);
      check(a.sessions === 9, "ق٣. **٥ + ٤ = ٩** — الهديّةُ دخلت الخطةَ التي وُلدت للتوّ", String(a.sessions));
      check(credited === true, "ق٤. والصفُّ موسومٌ **مقيَّداً** — لا وسمٌ كاذب", String(credited));
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ر. و«خدمة جديدة» توسم هديّتَها بأنها قُيِّدت ──");
    // ═══════════════════════════════════════════════════════════════════
    //  هذا البابُ يرفع الخطةَ **بنفسه** (`mergePhysioPlan` في منسّقه) ولا
    //  يمرّ بـ`creditGiftToPlanTx`، فكان صفُّ الهديّة يبقى `NULL` — ومعناه
    //  «لم يُقيَّد». فحذفُها لاحقاً لا يُنقص الخطة، **وتبقى جلساتُها فيها
    //  إلى الأبد**. والوسمُ يُكتب الآن في معاملة الخدمة نفسِها.
    {
      const pid = await mk("وسم-خدمة", true);
      const b = await state(pid);
      const r = await http("POST", `/api/patients/${pid}/new-service`, S, {
        serviceType: "additional_therapy", discount: { isFree: true, reason: "تبرع" },
        treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 6 }],
      });
      const row = (await q(
        `SELECT id, plan_credited FROM payments WHERE patient_id=$1 AND is_free_sessions=true ORDER BY id DESC LIMIT 1`,
        [pid])).rows[0];
      const a = await state(pid);
      check(r.status === 201, "ر١. المنح نجح", String(r.status));
      check(a.sessions === b.sessions + 6, "ر٢. الخطةُ ارتفعت ١٠ ⟶ ١٦", `${b.sessions} ⟶ ${a.sessions}`);
      check(row?.plan_credited === true, "ر٣. **والصفُّ موسومٌ مقيَّداً** — لا `NULL`", String(row?.plan_credited));

      //  والحذفُ يُنقص الخطةَ بالمقدار عينه — وهو ما كان يستحيل بلا الوسم.
      const del = await http("DELETE", `/api/payments/${row.id}`, S, { reason: "إلغاء التبرع" });
      const c = await state(pid);
      check(del.status < 300, "ر٤. الحذفُ نجح", String(del.status));
      check(c.sessions === b.sessions, "ر٥. **والخطةُ عادت ١٠** — لا جلساتٌ خالدة", `${a.sessions} ⟶ ${c.sessions}`);
      check(c.cost === b.cost && c.paid === b.paid, "ر٦. ولا دينارَ تحرّك في الرحلة كلِّها",
        `${b.cost}/${b.paid} ⟶ ${c.cost}/${c.paid}`);
    }
    {
      //  ومريضُ المفرد: الخطةُ لا تُنشأ له (ذي قار)، فالوسمُ `false` بصدق.
      const pid = await mk("وسم-مفرد", false);
      const r = await http("POST", `/api/patients/${pid}/new-service`, S, {
        serviceType: "additional_therapy", discount: { isFree: true, reason: "تبرع" },
        treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 3 }],
      });
      const row = (await q(
        `SELECT plan_credited FROM payments WHERE patient_id=$1 AND is_free_sessions=true ORDER BY id DESC LIMIT 1`,
        [pid])).rows[0];
      const plan = (await q(`SELECT physio_plan FROM patients WHERE id=$1`, [pid])).rows[0].physio_plan;
      const a = await state(pid);
      check(r.status === 201, "ر٧. المنح نجح لمريض المفرد", String(r.status));
      check(row?.plan_credited === false, "ر٨. **والوسمُ `false`** — مُنح ولم يُقيَّد", String(row?.plan_credited));
      check(!plan || (plan as any[]).length === 0, "ر٩. ولا خطةَ أُنشئت له (ذي قار)", JSON.stringify(plan));
      check(a.sessions === 3, "ر١٠. وعدّادُه يقرأ الهديّةَ من دفعاته", String(a.sessions));
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ش. وبنودُ الطلب الواحد تُلتزَم معاً أو لا شيء ──");
    // ═══════════════════════════════════════════════════════════════════
    //  كلُّ بندٍ كان معاملةً مستقلّة: يلتزم الأوّلُ ويفشل الثاني، فيبقى صفٌّ
    //  محفوظ (ورصيدُه في الخطة) بينما يقول الردُّ «لم يُحفَظ شيء» — فتُعاد
    //  المحاولةُ فتتضاعف الدفعةُ والهديّةُ معاً. فيُحقَن فشلٌ حقيقيٌّ على
    //  **الإدراج الثاني** ويُقاس الأثر.
    {
      const pid = await mk("ذرّيةُ البنود", true);
      const before = await state(pid);
      const origConnect = (pool as any).connect.bind(pool);
      let inserts = 0;
      let fired = false;
      (pool as any).connect = async (...cArgs: any[]) => {
        if (cArgs.some((x) => typeof x === "function")) return origConnect(...cArgs);
        const client: any = await origConnect();
        if (!client || typeof client.query !== "function") return client;
        const cq = client.query.bind(client);
        client.query = async (...args: any[]) => {
          const text = typeof args[0] === "string" ? args[0] : String(args[0]?.text ?? "");
          if (/insert\s+into\s+"?payments"?/i.test(text)) {
            inserts += 1;
            if (inserts === 2) { fired = true; throw new Error("عطلٌ محقونٌ على البند الثاني"); }
          }
          return cq(...args);
        };
        return client;
      };
      let r: any;
      try {
        r = await http("POST", "/api/payments", S, {
          patientId: pid, branchId: BR, amount: 0, paymentMethod: "cash",
          paymentTreatmentType: "روبوت", sessionCount: 4,
          treatmentEntries: [
            { treatmentType: "روبوت", sessionCount: 4, cost: 0, isFree: true },
            { treatmentType: "أبر صينية", sessionCount: 2, cost: 0, isFree: true },
          ],
        });
      } finally {
        (pool as any).connect = origConnect;
      }
      const rows = (await q(`SELECT id FROM payments WHERE patient_id=$1`, [pid])).rows;
      const a = await state(pid);
      check(fired, "ش١. العطلُ حُقن على الإدراج الثاني فعلاً", `${inserts}`);
      check(r.status >= 400, "ش٢. والطلبُ يُردّ بخطأ", String(r.status));
      check(rows.length === 0, "ش٣. **وصفرُ صفوفٍ بقيت** — لا البندُ الأوّل", JSON.stringify(rows));
      check(String(r.body?.message ?? "").includes("لم يُحفَظ شيء"),
        "ش٤. والرسالةُ تقول الحقيقةَ: لم يُحفَظ شيء", String(r.body?.message));
      check(a.sessions === before.sessions, "ش٥. والخطةُ كما كانت", `${before.sessions} ⟶ ${a.sessions}`);

      //  وبلا حقنٍ: البندان يمضيان معاً كما كانا.
      const ok = await http("POST", "/api/payments", S, {
        patientId: pid, branchId: BR, amount: 0, paymentMethod: "cash",
        paymentTreatmentType: "روبوت", sessionCount: 4,
        treatmentEntries: [
          { treatmentType: "روبوت", sessionCount: 4, cost: 0, isFree: true },
          { treatmentType: "أبر صينية", sessionCount: 2, cost: 0, isFree: true },
        ],
      });
      const n = (await q(`SELECT count(*)::int n FROM payments WHERE patient_id=$1`, [pid])).rows[0].n;
      const g = await state(pid);
      check(ok.status === 201, "ش٦. وبلا حقنٍ الطلبُ ينجح", String(ok.status));
      check(n === 2, "ش٧. وصفّان أُدرجا معاً", String(n));
      check(g.sessions === before.sessions + 6, "ش٨. والخطةُ ١٠ + ٤ + ٢ = ١٦", String(g.sessions));
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ت. وصفٌّ مدفوعٌ يُصحَّح إلى «مجاني» يدخل الخطة ──");
    // ═══════════════════════════════════════════════════════════════════
    //  وسمُ الصفّ المدفوع `null` («لم يُسأل») — وهو يصف ماضيه لا حاضره.
    //  فكان `reconcileGiftPlanTx` يقرؤه «غيرَ مقيَّد» فينصرف: الصفُّ يصير
    //  هديّةً بجلسات **والعدّادُ لا يتحرّك**. والمدفوعُ لا تاريخَ له في
    //  الخطة بحكم التعريف، فيُعامَل معاملةَ الهديّة الجديدة.
    {
      const pid = await mk("مدفوعٌ-صار-هديّة", true);
      const b = await state(pid);
      const pay = await http("POST", "/api/payments", S, {
        patientId: pid, branchId: BR, amount: 100000, paymentMethod: "cash",
        paymentTreatmentType: "روبوت", sessionCount: 2,
        treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 2, cost: 100000 }],
      });
      const row0 = (await q(
        `SELECT id, plan_credited FROM payments WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`, [pid])).rows[0];
      const mid = await state(pid);
      check(pay.status === 201, "ت١. الدفعةُ المدفوعة سُجّلت", String(pay.status));
      check(row0?.plan_credited === null, "ت٢. ووسمُها `null` — المدفوعُ لا يُقيَّد في الخطة",
        String(row0?.plan_credited));
      check(mid.sessions === b.sessions, "ت٣. والعدّادُ ما زال ١٠ — الخطةُ تَغلب", `${b.sessions} ⟶ ${mid.sessions}`);

      const fix = await http("PATCH", `/api/payments/${row0.id}`, S, {
        amount: 0, isFreeSessions: true, reason: "تبرّعٌ قرّره المدير بعد القبض",
      });
      const row1 = (await q(`SELECT plan_credited FROM payments WHERE id=$1`, [row0.id])).rows[0];
      const a = await state(pid);
      check(fix.status < 300, "ت٤. التصحيحُ إلى «مجاني» نجح", `${fix.status} ${JSON.stringify(fix.body).slice(0, 140)}`);
      check(a.sessions === b.sessions + 2, "ت٥. **والخطةُ ارتفعت ١٠ ⟶ ١٢** — الجلستان دخلتا",
        `${b.sessions} ⟶ ${a.sessions}`);
      check(row1?.plan_credited === true, "ت٦. والصفُّ موسومٌ مقيَّداً", String(row1?.plan_credited));
      check(a.paid === b.paid, "ت٧. والمقبوضُ عاد كما كان — لا دينارَ بقي", `${b.paid} ⟶ ${a.paid}`);

      //  والوسمُ ليس زينةً: الحذفُ يُنقص بالمقدار عينه.
      const del = await http("DELETE", `/api/payments/${row0.id}`, S, { reason: "إلغاء التبرع" });
      const c = await state(pid);
      check(del.status < 300, "ت٨. الحذفُ نجح", String(del.status));
      check(c.sessions === b.sessions, "ت٩. **١٢ ⟶ ١٠** — لا جلساتٌ خالدة", `${a.sessions} ⟶ ${c.sessions}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ث. وهديّتان متزامنتان لا تتجمّدان ──");
    // ═══════════════════════════════════════════════════════════════════
    //  إدراجُ صفّ الدفعة يأخذ `FOR KEY SHARE` على صفّ المريض بمفتاحه
    //  الأجنبيّ — **وهو متوافقٌ مع نفسِه**. فهديّتان تُدرِجان معاً ثمّ تطلب
    //  كلٌّ ترقيةَ قفلِها إلى `FOR UPDATE` فتنتظر الأخرى ⟶ **جمودٌ حقيقيّ**
    //  تقتل فيه Postgres إحداهما. والقسمُ «ح» لا يمسكه: بوّابتُه تُمهل
    //  الأوّلَ حتى يملك `FOR UPDATE` قبل أن يبدأ الثاني أصلاً.
    //
    //  ══ والبوّابةُ هنا **ذاتُ وجهين** فتكون حتميّةً في الحالتين ══════════
    //    • تُمسك **بعد** `insert into payments` (شكلُ ما قبل الإصلاح:
    //      الإدراجُ أوّلاً) — فيُدرِج الاثنان ثمّ يتصاعدان ⟶ جمود.
    //    • وتُمسك **قبل** `... patients ... for update` (شكلُ الإصلاح:
    //      التصعيدُ أوّلاً) — فيُطلَقان معاً ويتسلسلان نظيفاً.
    //  ولولا الوجهان لَمرّ الفحصُ في أحد الشكلين لسببٍ خاطئ.
    {
      const pid = await mk("جمودُ الهديّتين", true);
      const before = await state(pid);
      const gift = (n: number, t: string) => ({
        patientId: pid, branchId: BR, amount: 0, paymentMethod: "cash",
        paymentTreatmentType: t, sessionCount: n,
        treatmentEntries: [{ treatmentType: t, sessionCount: n, cost: 0, isFree: true }],
      });
      const origConnect = (pool as any).connect.bind(pool);
      let armed = 0;
      let release!: () => void;
      const gate = new Promise<void>((res) => { release = res; });
      (pool as any).connect = async (...cArgs: any[]) => {
        if (cArgs.some((x) => typeof x === "function")) return origConnect(...cArgs);
        const client: any = await origConnect();
        if (!client || typeof client.query !== "function") return client;
        const cq = client.query.bind(client);
        let done = false;
        client.query = async (...args: any[]) => {
          const text = typeof args[0] === "string" ? args[0] : String(args[0]?.text ?? "");
          const isInsert = /insert\s+into\s+"?payments"?/i.test(text);
          const isLock = /"?patients"?/i.test(text) && /for\s+update/i.test(text);
          if (!done && armed < 2 && isLock) { done = true; armed++; await gate; return cq(...args); }
          if (!done && armed < 2 && isInsert) { done = true; armed++; const out = await cq(...args); await gate; return out; }
          return cq(...args);
        };
        return client;
      };
      let r1: any, r2: any;
      try {
        const p1 = http("POST", "/api/payments", S, gift(3, "روبوت"));
        const p2 = http("POST", "/api/payments", S, gift(2, "أبر صينية"));
        const t0 = Date.now();
        while (armed < 2 && Date.now() - t0 < 8000) await new Promise((r) => setTimeout(r, 20));
        release();
        [r1, r2] = await Promise.all([p1, p2]);
      } finally {
        (pool as any).connect = origConnect;
      }
      const a = await state(pid);
      const flags = (await q(
        `SELECT plan_credited FROM payments WHERE patient_id=$1 AND is_free_sessions=true ORDER BY id`, [pid])).rows;
      check(armed === 2, "ث١. البوّابةُ حجزت المعاملتين — السباقُ وقع فعلاً", String(armed));
      check(r1.status === 201 && r2.status === 201, "ث٢. **الطلبان نجحا — ولا جمود**",
        `${r1.status}/${r2.status} | ${String(r1.body?.message ?? "")}${String(r2.body?.message ?? "")}`);
      check(a.sessions === before.sessions + 5, "ث٣. **١٠ + ٣ + ٢ = ١٥**", `${before.sessions} ⟶ ${a.sessions}`);
      check(flags.length === 2 && flags.every((f: any) => f.plan_credited === true),
        "ث٤. والصفّان موسومان مقيَّدَين", JSON.stringify(flags));
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── خ. والتسعيرُ يَسِم ما استورده من هدايا ──");
    // ═══════════════════════════════════════════════════════════════════
    //  مريضُ المفرد تُوسَم هديّتُه `false` («مُنحت ولم تُقيَّد») — وهو صدقٌ
    //  ما دام بلا خطة. ثمّ يُسعَّر، فتبذر الخطةُ من **كلّ** دفعةٍ حاملةٍ
    //  لجلسات ومنها هذه الهديّة — فتصير في الخطة والوسمُ ما زال `false`.
    //  فحذفُها لا يطرح شيئاً **وجلساتُها تبقى في العدّاد إلى الأبد**.
    {
      const pid = await mk("تسعيرٌ-يستورد-هديّة", false);
      const g = await http("POST", "/api/payments", S, {
        patientId: pid, branchId: BR, amount: 0, paymentMethod: "cash",
        paymentTreatmentType: "روبوت", sessionCount: 4,
        treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 4, cost: 0, isFree: true }],
      });
      const gid = (await q(
        `SELECT id FROM payments WHERE patient_id=$1 AND is_free_sessions=true ORDER BY id DESC LIMIT 1`,
        [pid])).rows[0].id;
      const f0 = (await q(`SELECT plan_credited FROM payments WHERE id=$1`, [gid])).rows[0].plan_credited;
      const b = await state(pid);
      check(g.status === 201 && f0 === false, "خ١. هديّةُ مريضِ المفرد موسومةٌ `false` بصدق", String(f0));
      check(b.sessions === 4 && b.src === "payments", "خ٢. وعدّادُه يقرؤها من دفعاته", `${b.sessions}/${b.src}`);

      const price = await http("POST", `/api/patients/${pid}/price-physio`, S,
        { entries: [{ treatmentType: "روبوت", sessionCount: 10 }] });
      const f1 = (await q(`SELECT plan_credited FROM payments WHERE id=$1`, [gid])).rows[0].plan_credited;
      const m = await state(pid);
      check(price.status < 300, "خ٣. التسعيرُ نجح", String(price.status));
      check(m.sessions === 14 && m.src === "plan", "خ٤. والخطةُ بذرت من دفعاته: ٤ + ١٠ = ١٤",
        `${m.sessions}/${m.src}`);
      check(f1 === true, "خ٥. **والهديّةُ المستورَدة صارت موسومةً مقيَّدة**", String(f1));

      const del = await http("DELETE", `/api/payments/${gid}`, S, { reason: "إلغاء التبرع" });
      const a = await state(pid);
      check(del.status < 300, "خ٦. حذفُ الهديّة نجح", String(del.status));
      check(a.sessions === 10, "خ٧. **١٤ ⟶ ١٠** — طُرحت الأربعُ فعلاً", `${m.sessions} ⟶ ${a.sessions}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ذ. ولا تُعَدّ جلساتُ صفٍّ استوردته البذرةُ مرّتين ──");
    // ═══════════════════════════════════════════════════════════════════
    //  الوجهُ المقابل للقسم «ت»: صفٌّ **مدفوع** استوردته بذرةُ التسعير من
    //  سجلّ الدفعات جلساتُه في الخطة **بالفعل**. فتصحيحُه إلى «مجاني»
    //  تغيُّرٌ في وصف المال لا في عدد الجلسات — وتقييدُه «هديّةً جديدة»
    //  كان سيعدّها مرّتين. فالوسمُ `true` هو الحارس.
    {
      const pid = await mk("مستورَدٌ-ثمّ-هديّة", false);
      const ns = await http("POST", `/api/patients/${pid}/new-service`, S, {
        serviceType: "additional_therapy", serviceCost: 100000, initialPayment: 100000,
        treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 2 }],
      });
      const payId = (await q(
        `SELECT id FROM payments WHERE patient_id=$1 AND session_count>0 ORDER BY id DESC LIMIT 1`, [pid])).rows[0].id;
      const b = await state(pid);
      check(ns.status < 300 && b.sessions === 2 && b.src === "payments",
        "ذ١. مريضُ المفرد: جلستان مدفوعتان من دفعاته", `${ns.status} | ${b.sessions}/${b.src}`);

      const price = await http("POST", `/api/patients/${pid}/price-physio`, S,
        { entries: [{ treatmentType: "روبوت", sessionCount: 10 }] });
      const f = (await q(`SELECT plan_credited FROM payments WHERE id=$1`, [payId])).rows[0].plan_credited;
      const m = await state(pid);
      check(price.status < 300 && m.sessions === 12 && m.src === "plan",
        "ذ٢. والتسعيرُ بذر منها: ٢ + ١٠ = ١٢", `${price.status} | ${m.sessions}/${m.src}`);
      check(f === true, "ذ٣. **والمدفوعُ المستورَد موسومٌ مقيَّداً** — لا المُهدى وحده", String(f));

      const fix = await http("PATCH", `/api/payments/${payId}`, S, {
        amount: 0, isFreeSessions: true, reason: "تبرّعٌ بأثرٍ رجعيّ",
      });
      const a = await state(pid);
      check(fix.status < 300, "ذ٤. تصحيحُه إلى «مجاني» نجح", String(fix.status));
      check(a.sessions === 12, "ذ٥. **والخطةُ ما زالت ١٢** — لا جلستان تُعدّان مرّتين",
        `${m.sessions} ⟶ ${a.sessions}`);
      check(a.paid === 0, "ذ٦. والمقبوضُ صفر — المالُ وحده تحرّك", String(a.paid));
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ض. و«استشارة طبية» لا تدخل الخطة ولو أُهديت بجلسات ──");
    // ═══════════════════════════════════════════════════════════════════
    //  `PHYSIO_TREATMENT_TYPES` تضمّ «استشارة طبية» (بسعر صفر)، بينما
    //  `mergePhysioPlan` تُسقطها دائماً — زيارةٌ واحدة لا دورةُ علاج. فحارسٌ
    //  يقيس العضويةَ في القائمة وحدها كان يقبل هديّةَ استشارةٍ بجلسات:
    //  `adjustPhysioPlanForGift` لا تُدخلها الخطةَ، **والصفُّ يُوسَم
    //  «قُيِّد»** — وسمٌ يكذب، وطرحٌ لاحقٌ يُنقص من نوعٍ لا وجود له فيها.
    {
      const pid = await mk("استشارةٌ-مُهداة", true);
      const b = await state(pid);
      const planBefore = JSON.stringify(b.plan);
      check(b.sessions === 10 && b.src === "plan", "ض١. الأساس: ١٠ جلسات من الخطة", JSON.stringify(b));

      const consult = await http("POST", "/api/payments", S, {
        patientId: pid, branchId: BR, amount: 0, paymentMethod: "cash",
        paymentTreatmentType: "استشارة طبية", sessionCount: 3,
        treatmentEntries: [{ treatmentType: "استشارة طبية", sessionCount: 3, cost: 0, isFree: true }],
      });
      const cRow = (await q(
        `SELECT id, plan_credited FROM payments
          WHERE patient_id=$1 AND payment_treatment_type='استشارة طبية' ORDER BY id DESC LIMIT 1`,
        [pid])).rows[0];
      const a = await state(pid);
      check(consult.status === 201, "ض٢. الهديّةُ سُجّلت (٢٠١) — الصفُّ واقعةٌ محفوظة", String(consult.status));
      check(JSON.stringify(a.plan) === planBefore,
        "ض٣. **والخطةُ مطابقةٌ بايتاً — لا سطرَ استشارةٍ فيها**", `${planBefore} ⟶ ${JSON.stringify(a.plan)}`);
      check(a.sessions === 10, "ض٤. والعدّادُ ما زال ١٠", String(a.sessions));
      check(cRow?.plan_credited !== true,
        "ض٥. **ولا يُوسَم صفُّها «قُيِّد في الخطة»** — وسمٌ لا يستطيع الطرحُ الوفاءَ به وسمٌ كاذب",
        String(cRow?.plan_credited));
      check(a.paid === 0, "ض٦. ولا دينارَ تحرّك", String(a.paid));

      //  والحارسُ ضيّقٌ لا شامل: هديّةُ نوعٍ يدخل الخطةَ تمضي كما كانت.
      const robot = await http("POST", "/api/payments", S, {
        patientId: pid, branchId: BR, amount: 0, paymentMethod: "cash",
        paymentTreatmentType: "روبوت", sessionCount: 2,
        treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 2, cost: 0, isFree: true }],
      });
      const a2 = await state(pid);
      check(robot.status === 201 && a2.sessions === 12,
        "ض٧. **وهديّةُ «روبوت» تمضي: ١٠ ⟶ ١٢** — الحارسُ على الاستشارة وحدها",
        `${robot.status} | ${a.sessions} ⟶ ${a2.sessions}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ظ. ولا بذرةَ تسعيرٍ تَسِم استشارةً ──");
    // ═══════════════════════════════════════════════════════════════════
    //  بذرةُ `pricePhysiotherapy` تسحب كلَّ دفعةٍ حاملةٍ لجلسات وتمرّرها
    //  `mergePhysioPlan` — وهي تُسقط الاستشارة. فوسمُها «قُيِّد» بالقائمة
    //  العريضة كان يكذب بالقدر نفسِه.
    {
      const pid = await mk("بذرةٌ-واستشارة", false);
      await q(`INSERT INTO payments (patient_id,branch_id,amount,payment_treatment_type,session_count,is_free_sessions)
               VALUES ($1,$2,0,'استشارة طبية',3,false),($1,$2,100000,'روبوت',2,false)`, [pid, BR]);
      const price = await http("POST", `/api/patients/${pid}/price-physio`, S,
        { entries: [{ treatmentType: "روبوت", sessionCount: 10 }] });
      const rows = (await q(
        `SELECT payment_treatment_type t, plan_credited f FROM payments
          WHERE patient_id=$1 AND session_count>0 ORDER BY id`, [pid])).rows;
      const a = await state(pid);
      const consultRow = rows.find((r: any) => r.t === "استشارة طبية");
      const robotRow = rows.find((r: any) => r.t === "روبوت");
      check(price.status < 300, "ظ١. التسعيرُ نجح", String(price.status));
      check(Array.isArray(a.plan) && !a.plan.some((e: any) => e.treatmentType === "استشارة طبية"),
        "ظ٢. **ولا سطرَ استشارةٍ في الخطة المبذورة**", JSON.stringify(a.plan));
      check(consultRow?.f !== true, "ظ٣. **وصفُّها لم يُوسَم «قُيِّد»**", String(consultRow?.f));
      check(robotRow?.f === true, "ظ٤. وصفُّ «روبوت» وُسم كما يجب — الحارسُ ضيّقٌ لا شامل",
        String(robotRow?.f));
      check(a.sessions === 12, "ظ٥. والعدّادُ ٢ + ١٠ = ١٢", `${a.sessions}/${a.src}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── غ. ومَن حُجب عنه المالُ لا يقرأ «كم أُهدي مقابل كم دُفع» ──");
    // ═══════════════════════════════════════════════════════════════════
    //  حاولت تمريرةٌ سابقة أن تفصل المُهدى عن المدفوع في
    //  `paymentSessionsSummary` كي تصل رايةُ `is_free_sessions` إلى
    //  `resolvePurchasedSessions` في العميل. **وذاك تسريب**: «كم جلسةً
    //  أُهديت مقابل كم دُفعت» قرارٌ ماليّ (تبرّعٌ أو خصم)، وهذا المسارُ
    //  بعينه يحجب المالَ عمّن لا يملك `canViewPayments`.
    //
    //  فالعدّادُ صار يُحسَب **في الخادم** ويصل مجموعاً بلا تصنيف.
    {
      const BLIND = 9939;
      await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,is_active,
                                         can_view_patients,can_view_payments)
               VALUES ($1,'physblind','x','استقبالٌ بلا مال','reception',$2,true,true,false)
               ON CONFLICT (id) DO UPDATE SET is_active=true, can_view_patients=true, can_view_payments=false,
                 branch_id=EXCLUDED.branch_id`, [BLIND, BR]);
      const SB = { userId: BLIND, branchId: BR, accessibleBranches: [BR], displayName: "بلا مال",
        isAdmin: false, role: "reception" };

      //  شكلٌ يفرّق الحسابين فعلاً: الاشتقاقُ من الكلفة ١٠، والمدفوعُ ٢،
      //  والمُهدى ٦. فالصوابُ ١٦؛ ومجموعُ الملخّص المدموج (٨) كان يُنتج ١٠.
      const pid = (await q(
        `INSERT INTO patients (patient_code,name,branch_id,referral_source,age,medical_condition,
                               is_physiotherapy,treatment_type,total_cost)
         VALUES ($1,'محجوبٌ-عنه-المال',$2,'مراجعة',44,'ألم',true,'روبوت',500000) RETURNING id`,
        [`WB-${++code}`, BR])).rows[0].id;
      await q(`INSERT INTO patient_cases (patient_id,branch_id,case_type,cost,cost_source,status)
               VALUES ($1,$2,'physiotherapy',500000,'manual','active')`, [pid, BR]);
      await q(`INSERT INTO payments (patient_id,branch_id,amount,payment_treatment_type,session_count,is_free_sessions,notes)
               VALUES ($1,$2,50000,'روبوت',1,false,'ملاحظةٌ لا يجوز أن تصل'),
                      ($1,$2,50000,'روبوت',1,false,'ثانية'),
                      ($1,$2,0,'روبوت',6,true,'تبرّع')`, [pid, BR]);

      const blind = await http("GET", `/api/patients/${pid}`, SB);
      const raw = JSON.stringify(blind.body ?? {});
      const summary = blind.body?.paymentSessionsSummary;
      const resolved = blind.body?.physioSessionsResolved;
      check(blind.status === 200, "غ١. الملفُّ يُقرأ (٢٠٠)", String(blind.status));
      check(blind.body?.payments === undefined, "غ٢. وبلا صفوفِ دفعاتٍ خام",
        JSON.stringify(blind.body?.payments));
      check(Array.isArray(summary) && summary.length === 1
        && JSON.stringify(Object.keys(summary[0]).sort()) === JSON.stringify(["sessionCount", "treatmentType"]),
        "غ٣. **وملخّصُ الجلسات حقلان لا غير — ولا رايةَ مجّانيّة**", JSON.stringify(summary));
      check(raw.indexOf("isFree") === -1,
        "غ٤. **ولا كلمةَ `isFree` واحدة في نصّ الردّ كلِّه**",
        raw.slice(Math.max(0, raw.indexOf("isFree") - 60), raw.indexOf("isFree") + 60));
      check(raw.indexOf("ملاحظةٌ لا يجوز") === -1, "غ٥. ولا نصَّ ملاحظةٍ", "تسرّبت");
      check(resolved?.total === 16,
        "غ٦. **والعدّادُ ١٦ محسوباً في الخادم** (١٠ من الكلفة + ٦ مُهداة)", JSON.stringify(resolved));
      check(resolved?.source === "cost", "غ٧. ومصدرُه الاشتقاقُ من الكلفة", JSON.stringify(resolved?.source));

      //  **والفرقُ حقيقيٌّ لا صوريّ**: الملخّصُ المدموج وحده يُنتج ١٠.
      const fromSummaryOnly = resolvePurchasedSessions({
        plan: null, treatmentTypeText: "روبوت", caseCost: 500000,
        paymentSessions: (summary ?? []) as any,
      });
      check(fromSummaryOnly.total === 10,
        "غ٨. **ولولا حسابُ الخادم لقرأ العميلُ ١٠** — فالحسابُ لازمٌ لا زينة",
        JSON.stringify(fromSummaryOnly));

      //  ومَن يرى الدفعاتِ يأخذها خاماً كما كان، بلا حقلٍ إضافيّ.
      const seeing = await http("GET", `/api/patients/${pid}`, S);
      check(seeing.body?.payments?.length === 3, "غ٩. ومَن يملك `canViewPayments` يأخذ الصفوفَ الثلاثة",
        String(seeing.body?.payments?.length));
      check(seeing.body?.physioSessionsResolved === undefined
        && seeing.body?.paymentSessionsSummary === undefined,
        "غ١٠. **وبلا حقلٍ محسوبٍ له** — يحسبه من دفعاته كما كان دوماً",
        JSON.stringify(seeing.body?.physioSessionsResolved));
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── أأ. والبذرةُ تَسِم كلَّ ما استوردته — ومنه ما لا نوعَ له ──");
    // ═══════════════════════════════════════════════════════════════════
    //  بذرةُ التسعير تضع دفعةً **بلا نوعٍ مسجَّل** في دلو «غير محدد» وتُدخلها
    //  الخطةَ فعلاً. وكان الوسمُ يقيس بقائمة الأنواع المعروفة، فيبقى صفُّها
    //  `NULL` — «لم يُسأل» — فحذفُه لاحقاً لا يطرح منه شيئاً وجلساتُه تبقى
    //  في العدّاد إلى الأبد.
    {
      const pid = await mk("بذرةٌ-بلا-نوع", false);
      await q(`INSERT INTO payments (patient_id,branch_id,amount,payment_treatment_type,session_count,is_free_sessions)
               VALUES ($1,$2,0,NULL,5,true),($1,$2,100000,'روبوت',2,false)`, [pid, BR]);
      const untagged = (await q(
        `SELECT id FROM payments WHERE patient_id=$1 AND payment_treatment_type IS NULL`, [pid])).rows[0].id;

      const price = await http("POST", `/api/patients/${pid}/price-physio`, S,
        { entries: [{ treatmentType: "روبوت", sessionCount: 10 }] });
      const f = (await q(`SELECT plan_credited FROM payments WHERE id=$1`, [untagged])).rows[0].plan_credited;
      const m = await state(pid);
      check(price.status < 300, "أأ١. التسعيرُ نجح", String(price.status));
      check(Array.isArray(m.plan) && m.plan.some((e: any) => e.treatmentType === "غير محدد"
        && e.sessionCount === 5),
        "أأ٢. والبذرةُ وضعت الصفَّ بلا نوعٍ في دلو «غير محدد»", JSON.stringify(m.plan));
      check(m.sessions === 17 && m.src === "plan", "أأ٣. والعدّادُ ٥ + ٢ + ١٠ = ١٧", `${m.sessions}/${m.src}`);
      check(f === true, "أأ٤. **وصفُّه موسومٌ مقيَّداً** — لا `NULL` تمنع الطرحَ لاحقاً", String(f));

      const del = await http("DELETE", `/api/payments/${untagged}`, S, { reason: "إلغاء" });
      const a = await state(pid);
      check(del.status < 300, "أأ٥. حذفُه نجح", String(del.status));
      check(a.sessions === 12, "أأ٦. **١٧ ⟶ ١٢** — طُرحت الخمسُ من دلوها فعلاً",
        `${m.sessions} ⟶ ${a.sessions} | ${JSON.stringify(a.plan)}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── بب. وخطةٌ كتبها الموظّفُ بيده لا تهدمها تصحيحاتُ الدفعات ──");
    // ═══════════════════════════════════════════════════════════════════
    //  «تعديل خطة الجلسات» **يستبدل** الخطةَ بما يكتبه الموظّف. وكان وسمُ
    //  `plan_credited` يبقى على صفوفه، فحذفُ هديّةٍ بعده يطرح من رقمٍ لم
    //  يُبنَ منه: ١٦ تُستبدَل بعشر، ثمّ تُحذف هديّةُ ستٍّ ⟶ **أربع**.
    {
      const pid = await mk("خطةٌ-مؤلَّفة", true);
      const g = await http("POST", "/api/payments", S, {
        patientId: pid, branchId: BR, amount: 0, paymentMethod: "cash",
        paymentTreatmentType: "روبوت", sessionCount: 6,
        treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 6, cost: 0, isFree: true }],
      });
      const gid = (await q(
        `SELECT id FROM payments WHERE patient_id=$1 AND is_free_sessions=true ORDER BY id DESC LIMIT 1`,
        [pid])).rows[0].id;
      const b = await state(pid);
      const f0 = (await q(`SELECT plan_credited FROM payments WHERE id=$1`, [gid])).rows[0].plan_credited;
      check(g.status === 201 && b.sessions === 16 && f0 === true,
        "بب١. الأساس: ١٠ + ٦ = ١٦ والهديّةُ موسومةٌ مقيَّدة", `${b.sessions} | ${f0}`);

      const put = await http("PUT", `/api/patients/${pid}/physio-plan`, S,
        { entries: [{ treatmentType: "روبوت", sessionCount: 10 }] });
      const f1 = (await q(`SELECT plan_credited FROM payments WHERE id=$1`, [gid])).rows[0].plan_credited;
      const m = await state(pid);
      check(put.status < 300 && m.sessions === 10,
        "بب٢. الموظّفُ استبدلها بعشر", `${put.status} | ${m.sessions}`);
      check(f1 === false, "بب٣. **والوسمُ رُفع** — الرقمُ مؤلَّفٌ لا مُشتقٌّ من دفعة", String(f1));

      const del = await http("DELETE", `/api/payments/${gid}`, S, { reason: "إلغاء التبرع" });
      const a = await state(pid);
      check(del.status < 300, "بب٤. حذفُ الهديّة نجح", String(del.status));
      check(a.sessions === 10, "بب٥. **والخطةُ ما زالت ١٠ لا أربعاً** — تصحيحُ الموظّف لم يُهدَم",
        `${m.sessions} ⟶ ${a.sessions}`);
      check(a.paid === 0, "بب٦. ولا دينارَ تحرّك", String(a.paid));

      //  وهديّةٌ **جديدة** بعد التأليف تُقيَّد وتُوسَم كالمعتاد.
      const g2 = await http("POST", "/api/payments", S, {
        patientId: pid, branchId: BR, amount: 0, paymentMethod: "cash",
        paymentTreatmentType: "روبوت", sessionCount: 3,
        treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 3, cost: 0, isFree: true }],
      });
      const a2 = await state(pid);
      check(g2.status === 201 && a2.sessions === 13,
        "بب٧. **وهديّةٌ جديدة بعده تُقيَّد: ١٠ ⟶ ١٣**", `${g2.status} | ${a2.sessions}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── جج. وتسعيرٌ يزامن تصحيحَ دفعةٍ: ترتيبُ قفلٍ واحد ──");
    // ═══════════════════════════════════════════════════════════════════
    //  بذرةُ التسعير تقفل صفَّ المريض ثمّ تكتب على صفوف دفعاته (الوسم)،
    //  ومسارُ التصحيح كان يقفل **صفَّ الدفعة أوّلاً** ثمّ يطلب صفَّ المريض
    //  من `adjustPhysioPlanForGift` ⟶ ترتيبان متعاكسان ⟶ **جمودٌ حقيقيّ**.
    //
    //  والبوّابةُ تُمسك تسعيراً **قبل** كتابة الوسم مباشرةً، فيبدأ التصحيحُ
    //  وقد صار صفُّ المريض مقفولاً سلفاً.
    //
    //  **وأثرُ الترتيب المعكوس في هذا التشابك تصحيحٌ ضائع لا جمود**: الصفُّ
    //  لم يُوسَم بعد حين يقرؤه التصحيح، فتنصرف `reconcileGiftPlanTx` بلا
    //  طرح، ثمّ تبذر البذرةُ من العدد **القديم** — فيمضي الطلبان بنجاحٍ
    //  ظاهر و**تضيع الأربعُ ⟶ اثنتان** بلا أن يعلم أحد. والجمودُ نفسُه في
    //  القسم التالي. وبالإصلاح ينتظر التصحيحُ صفَّ المريض نظيفاً، فيقرأ
    //  الوسمَ بعد الالتزام ويطرح بحقّ.
    {
      const pid = await mk("جمودُ التسعير", false);
      await q(`INSERT INTO payments (patient_id,branch_id,amount,payment_treatment_type,session_count,is_free_sessions)
               VALUES ($1,$2,0,'روبوت',4,true)`, [pid, BR]);
      const gid = (await q(
        `SELECT id FROM payments WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`, [pid])).rows[0].id;

      const origConnect = (pool as any).connect.bind(pool);
      let armed = 0;
      let release!: () => void;
      const gate = new Promise<void>((res) => { release = res; });
      (pool as any).connect = async (...cArgs: any[]) => {
        if (cArgs.some((x) => typeof x === "function")) return origConnect(...cArgs);
        const client: any = await origConnect();
        if (!client || typeof client.query !== "function") return client;
        const cq = client.query.bind(client);
        let done = false;
        client.query = async (...args: any[]) => {
          const text = typeof args[0] === "string" ? args[0] : String(args[0]?.text ?? "");
          //  وسمُ البذرة بعينه — بعد قفل صفّ المريض وقبل لمس صفوف الدفعات.
          if (!done && armed < 1
              && /update\s+"?payments"?\s+set/i.test(text) && /plan_credited/i.test(text)) {
            done = true; armed++; await gate; return cq(...args);
          }
          return cq(...args);
        };
        return client;
      };
      let pr: any, cr: any;
      try {
        const pricing = http("POST", `/api/patients/${pid}/price-physio`, S,
          { entries: [{ treatmentType: "روبوت", sessionCount: 10 }] });
        const t0 = Date.now();
        while (armed < 1 && Date.now() - t0 < 8000) await new Promise((r) => setTimeout(r, 20));
        const correcting = http("PATCH", `/api/payments/${gid}`, S,
          { sessionCount: 2, reason: "تصحيحُ العدد" });
        await new Promise((r) => setTimeout(r, 700));
        release();
        [pr, cr] = await Promise.all([pricing, correcting]);
      } finally {
        (pool as any).connect = origConnect;
      }
      const a = await state(pid);
      check(armed === 1, "جج١. البوّابةُ حجزت التسعيرَ عند وسمه — السباقُ وقع فعلاً", String(armed));
      check(pr.status < 300 && cr.status < 300, "جج٢. الطلبان نجحا",
        `${pr.status}/${cr.status} | ${String(pr.body?.message ?? "")}${String(cr.body?.message ?? "")}`);
      check(a.sessions === 12, "جج٣. **ولا تصحيحٌ يضيع: ٤ + ١٠ = ١٤ ثمّ ٤ ⟶ ٢ ⟶ ١٢**",
        `${a.sessions} | ${JSON.stringify(a.plan)}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── دد. والترتيبُ المعكوس جمودٌ حقيقيّ — لا تباطؤ ──");
    // ═══════════════════════════════════════════════════════════════════
    //  الشكلُ الذي وصفته المراجعة: التصحيحُ يمسك صفَّ الدفعة **ويطلب صفَّ
    //  المريض** (لأن الصفَّ موسومٌ مقيَّداً فتعمل `adjustPhysioPlanForGift`)،
    //  بينما البذرةُ تمسك صفَّ المريض وتطلب صفوفَ الدفعات ⟶ `deadlock
    //  detected` تقتل فيه Postgres إحداهما.
    //
    //  **والفِكستشرُ يبني الشرطَ صراحةً**: صفٌّ موسومٌ `true` على ملفٍّ خطتُه
    //  فارغة — حالةٌ يبلغها سجلٌّ موروث أو خطةٌ أُفرغت، والمقصودُ هنا
    //  **ترتيبُ القفل** لا تواترُ الحالة.
    {
      const pid = await mk("جمودٌ-صريح", false);
      await q(`INSERT INTO payments (patient_id,branch_id,amount,payment_treatment_type,session_count,
                                     is_free_sessions,plan_credited)
               VALUES ($1,$2,0,'روبوت',4,true,true)`, [pid, BR]);
      const gid = (await q(
        `SELECT id FROM payments WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`, [pid])).rows[0].id;

      const origConnect = (pool as any).connect.bind(pool);
      let armed = 0;
      let release!: () => void;
      const gate = new Promise<void>((res) => { release = res; });
      (pool as any).connect = async (...cArgs: any[]) => {
        if (cArgs.some((x) => typeof x === "function")) return origConnect(...cArgs);
        const client: any = await origConnect();
        if (!client || typeof client.query !== "function") return client;
        const cq = client.query.bind(client);
        let done = false;
        client.query = async (...args: any[]) => {
          const text = typeof args[0] === "string" ? args[0] : String(args[0]?.text ?? "");
          if (!done && armed < 1
              && /update\s+"?payments"?\s+set/i.test(text) && /plan_credited/i.test(text)) {
            done = true; armed++; await gate; return cq(...args);
          }
          return cq(...args);
        };
        return client;
      };
      let pr: any, cr: any;
      try {
        const pricing = http("POST", `/api/patients/${pid}/price-physio`, S,
          { entries: [{ treatmentType: "روبوت", sessionCount: 10 }] });
        const t0 = Date.now();
        while (armed < 1 && Date.now() - t0 < 8000) await new Promise((r) => setTimeout(r, 20));
        const correcting = http("PATCH", `/api/payments/${gid}`, S,
          { sessionCount: 1, reason: "تصحيحٌ متزامن" });
        await new Promise((r) => setTimeout(r, 700));
        release();
        [pr, cr] = await Promise.all([pricing, correcting]);
      } finally {
        (pool as any).connect = origConnect;
      }
      const row = (await q(`SELECT session_count n, plan_credited f FROM payments WHERE id=$1`, [gid])).rows[0];
      check(armed === 1, "دد١. البوّابةُ حجزت البذرةَ عند وسمها", String(armed));
      check(pr.status < 300 && cr.status < 300,
        "دد٢. **الطلبان نجحا — ولا `deadlock detected`**",
        `${pr.status}/${cr.status} | ${String(pr.body?.message ?? "")}${String(cr.body?.message ?? "")}`);
      check(Number(row.n) === 1 && row.f === true,
        "دد٣. والصفُّ صار جلسةً واحدة وما زال موسوماً", JSON.stringify(row));
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── هه. وعطلٌ في تعديل الدفعة يُقال ولا يُسقط الخادم ──");
    // ═══════════════════════════════════════════════════════════════════
    //  كانت مصيدةُ `PATCH /api/payments/:id` تُعيد رميَ كلّ ما ليس
    //  `CorrectionError` — **فلا يصل الطلبَ ردٌّ إطلاقاً** وتخرج العملية.
    //  أمسكه شكلُ الجمود أعلاه حيّاً قبل إصلاح ترتيب القفل.
    const injectOnce = async (match: RegExp, run: () => Promise<any>) => {
      const origConnect = (pool as any).connect.bind(pool);
      let fired = false;
      (pool as any).connect = async (...cArgs: any[]) => {
        if (cArgs.some((x) => typeof x === "function")) return origConnect(...cArgs);
        const client: any = await origConnect();
        if (!client || typeof client.query !== "function") return client;
        const cq = client.query.bind(client);
        //  **ويُحترَم شكلُ النداء**: `pg-pool` ينادي `client.query(text, vals, cb)`
        //  بدالّة ردّ، فرميٌ مباشر يُنتج وعداً مرفوضاً لا يلتقطه أحد —
        //  فيسقط المُشغِّل نفسُه بدل أن يصل العطلُ من حقنّاه.
        client.query = (...args: any[]) => {
          const text = typeof args[0] === "string" ? args[0] : String(args[0]?.text ?? "");
          if (!fired && match.test(text)) {
            fired = true;
            const e = new Error("عطلٌ محقون");
            const cb = args.length > 0 && typeof args[args.length - 1] === "function"
              ? args[args.length - 1] : null;
            if (cb) { cb(e); return undefined as any; }
            return Promise.reject(e);
          }
          return cq(...args);
        };
        return client;
      };
      try { return { res: await run(), fired }; } finally { (pool as any).connect = origConnect; }
    };
    {
      const pid = await mk("عطلُ التعديل", false);
      await q(`INSERT INTO payments (patient_id,branch_id,amount,payment_treatment_type,session_count,is_free_sessions)
               VALUES ($1,$2,0,'روبوت',4,true)`, [pid, BR]);
      const gid = (await q(
        `SELECT id FROM payments WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`, [pid])).rows[0].id;

      //  ① عطلٌ **قبل** الالتزام ⟶ صفرُ كتابة، ورسالةٌ تقول ذلك.
      const a = await injectOnce(
        /update\s+"?payments"?\s+set/i,
        () => http("PATCH", `/api/payments/${gid}`, S, { sessionCount: 3 }));
      const n1 = (await q(`SELECT session_count n FROM payments WHERE id=$1`, [gid])).rows[0].n;
      check(a.fired && a.res.status === 500,
        "هه١. **عطلٌ قبل الالتزام ⟶ ردٌّ ٥٠٠ حقيقيّ لا تعليق**",
        `${a.fired} | ${a.res.status}`);
      check(String(a.res.body?.message ?? "").includes("لم يُحفَظ شيء"),
        "هه٢. ورسالتُه تقول إن شيئاً لم يُحفَظ", String(a.res.body?.message));
      check(Number(n1) === 4, "هه٣. والصفُّ كما كان — صفرُ كتابة", String(n1));

      //  ② ولماذا «لم يُحفَظ شيء» صادقةٌ بلا شرط: لا خطوةَ **بعد** الالتزام
      //     تصل تلك المصيدة. `logAudit` تبتلع خطأها بحكم تصميمها، فعطلُ
      //     التدقيق لا يُفشل الطلبَ ولا يُنتج رسالةً تكذب على الموظّف.
      const b = await injectOnce(
        /insert\s+into\s+"?audit_log"?/i,
        () => http("PATCH", `/api/payments/${gid}`, S, { sessionCount: 3 }));
      const n2 = (await q(`SELECT session_count n FROM payments WHERE id=$1`, [gid])).rows[0].n;
      check(b.fired && b.res.status < 300,
        "هه٤. **وعطلُ التدقيق لا يُفشل الطلب** — `logAudit` تبتلعه بحكم تصميمها",
        `${b.fired} | ${b.res.status}`);
      check(Number(n2) === 3,
        "هه٥. والتعديلُ وقع فعلاً — فلا خطوةَ بعد الالتزام تصل المصيدة", String(n2));

      //  ③ والقاعدةُ تعمل بعدها — لا اتّصالٌ مسموم بقي.
      const ok = await http("PATCH", `/api/payments/${gid}`, S, { sessionCount: 5 });
      const n3 = (await q(`SELECT session_count n FROM payments WHERE id=$1`, [gid])).rows[0].n;
      check(ok.status < 300 && Number(n3) === 5, "هه٦. والتعديلُ التالي يمضي نظيفاً",
        `${ok.status} | ${n3}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── وو. وبندٌ مدفوعٌ رفعته «خدمة جديدة» يُوسَم مقيَّداً ──");
    // ═══════════════════════════════════════════════════════════════════
    //  `planPatch` في منسّق «خدمة جديدة» **لا يسأل عن المجّانيّة إطلاقاً**:
    //  كلُّ بندٍ يدخل `mergePhysioPlan`. فوسمُ الهديّة وحدها كان يُبقي صفَّ
    //  البند المدفوع `NULL` («لم يُقيَّد») وجلساتُه في الخطة فعلاً — فتصحيحُه
    //  لاحقاً من «مدفوع» إلى «مجاني» يقرؤه `reconcileGiftPlanTx` صفّاً جديداً
    //  فيضيف جلساتِه **ثانيةً**: ١٠ + ٥ = ١٥، ثمّ ٢٠ بعد التصحيح.
    {
      const pid = await mk("وسم-خدمةٍ-مدفوعة", true);
      const b = await state(pid);
      const r = await http("POST", `/api/patients/${pid}/new-service`, S, {
        serviceType: "additional_therapy", serviceCost: 250000, initialPayment: 250000,
        treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 5 }],
      });
      const row = (await q(
        `SELECT id, plan_credited, is_free_sessions f, session_count n
           FROM payments WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`, [pid])).rows[0];
      const mid = await state(pid);
      check(r.status < 300, "وو١. الخدمةُ المدفوعة سُجّلت", `${r.status} ${JSON.stringify(r.body).slice(0, 140)}`);
      check(row?.f === false && Number(row?.n) === 5, "وو٢. وصفُّها مدفوعٌ بخمس جلسات", JSON.stringify(row));
      check(mid.sessions === b.sessions + 5, "وو٣. والخطةُ ارتفعت ١٠ ⟶ ١٥ — `planPatch` رفعتها",
        `${b.sessions} ⟶ ${mid.sessions}`);
      check(row?.plan_credited === true,
        "وو٤. **والصفُّ المدفوع موسومٌ مقيَّداً** — لا `NULL`", String(row?.plan_credited));

      //  ثمّ يصحّحه المديرُ إلى «مجاني»: وصفُ المال يتغيّر، **وعددُ الجلسات
      //  لا يتغيّر** — فلا تُضاف إلى الخطة مرّةً ثانية.
      const fix = await http("PATCH", `/api/payments/${row.id}`, S, {
        amount: 0, isFreeSessions: true, reason: "تبرّعٌ قرّره المدير بعد القبض",
      });
      const a = await state(pid);
      check(fix.status < 300, "وو٥. التصحيحُ إلى «مجاني» نجح",
        `${fix.status} ${JSON.stringify(fix.body).slice(0, 140)}`);
      check(a.sessions === mid.sessions,
        "وو٦. **والخطةُ ما زالت ١٥ — لا ٢٠**: لا تُعَدّ جلساتُ الصفّ مرّتين",
        `${mid.sessions} ⟶ ${a.sessions}`);
      check(a.paid === b.paid, "وو٧. والمقبوضُ عاد كما كان", `${b.paid} ⟶ ${a.paid}`);

      //  والوسمُ ليس زينةً: الحذفُ يُنقص بالمقدار عينه فتعود الخطةُ ١٠.
      const del = await http("DELETE", `/api/payments/${row.id}`, S, { reason: "إلغاء" });
      const c = await state(pid);
      check(del.status < 300, "وو٨. الحذفُ نجح", String(del.status));
      check(c.sessions === b.sessions, "وو٩. **١٥ ⟶ ١٠** — لا جلساتٌ خالدة", `${a.sessions} ⟶ ${c.sessions}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── زز. وعدّادُ الجلسات مصدرٌ واحد في الشاشة كلِّها ──");
    // ═══════════════════════════════════════════════════════════════════
    //  `patient.payments` تغيب عمّن لا يملك `canViewPayments`، فكلُّ حسابٍ
    //  محلّيٍّ من صفوفها يقرأ صفراً له. فكانت بطاقةُ الملخّص تعرض رقمَ
    //  الخادم (١٦) بينما يعرض تبويبُ الزيارات — في الشاشة نفسِها — ١٠.
    {
      //  ① القراران **خالصان** (درسُ ٤.u): لا يُختبَران بقراءة نصٍّ.
      check(pickPhysioSessions({ total: 16 } as any, true, () => ({ total: 10 } as any)).total === 16,
        "زز١. **الصفوفُ محجوبة ⟶ رقمُ الخادم**", "");
      check(pickPhysioSessions({ total: 16 } as any, false, () => ({ total: 10 } as any)).total === 10,
        "زز٢. ومَن يملك الصفوفَ يحسب محلّياً كما كان — بمدخلاته هو", "");
      check(pickPhysioSessions(undefined, true, () => ({ total: 10 } as any)).total === 10,
        "زز٣. وبلا رقمٍ من الخادم يبقى الحسابُ المحلّيّ — لا فراغ", "");

      check(perVisitSessionMode("cost", 16, false) === "seed",
        "زز٤. ومصدرٌ غيرُ الدفعات ⟶ يُزرَع المجموع كما كان", "");
      check(perVisitSessionMode("payments", 8, false) === "walk",
        "زز٥. والمشيُ الزمنيُّ لمن يملك الصفوف — كما كان بحرفه", "");
      //  ⚠ **انقلب عقدُ زز٦ في مراجعة Codex العاشرة** — بقرارِ التصحيح لا
      //  لتخضير اختبار: الزرعُ لمن حُجبت عنه الصفوفُ كان يُقدِّم شراءً
      //  لاحقاً على زياراتٍ سبقته. والقسمُ «كك» يُثبت الفرقَ حيّاً.
      check(perVisitSessionMode("payments", 8, true) === "hidden",
        "زز٦. **ومَن حُجبت عنه الصفوفُ لا يُعرَض له رقمٌ لكلّ زيارة**", "");
      check(perVisitSessionMode("cost", 0, true) === "walk",
        "زز٧. وصفرٌ لا يُزرَع", "");
      check(perVisitSessionMode("cost", 16, true) === "seed",
        "زز٧أ. **وخطةٌ مشتراةٌ سلفاً تُزرَع ولو حُجبت الصفوف** — لم تُمَسّ", "");

      //  ② والشاشةُ لا تحمل حساباً ثانياً يلتفّ على القرار.
      const src = readFileSync("client/src/pages/PatientDetails.tsx", "utf8");
      const calls = (src.match(/resolvePurchasedSessions\(/g) ?? []).length;
      check(calls === 1,
        "زز٨. **`resolvePurchasedSessions` تُنادى مرّةً واحدة في الصفحة كلِّها**", String(calls));
      const resolver = src.slice(src.indexOf("const resolveSessionsFor"),
        src.indexOf("const casePaymentSessions"));
      check(resolver.includes("pickPhysioSessions(") && resolver.includes("resolvePurchasedSessions("),
        "زز٩. والنداءُ داخل المُحلّل الواحد الذي يقرّر المصدر", resolver.slice(0, 200));
      check(src.includes("perVisitSessionMode(") && !/source !== "payments"/.test(src),
        "زز١٠. وقرارُ الزرع من الدالّة الخالصة لا من شرطٍ في الشاشة", "");
      check(/visitMode === "hidden" \|\| isConsultation/.test(src),
        "زز١٠أ. **و«لا يُعرَض» تُرسَم بالعلامة القائمة نفسِها** (`-999` ⟶ «-»)", "");

      //  ③ **والفرقُ حقيقيٌّ لا صوريّ**: شكلُ غ نفسُه — الاشتقاقُ ١٠ والمُهدى
      //     ٦ — يقرؤه تبويبُ الزيارات ١٠ لو حسب من صفوفٍ لا يملكها.
      const BLIND2 = 9939;
      const SB = { userId: BLIND2, branchId: BR, accessibleBranches: [BR], displayName: "بلا مال",
        isAdmin: false, role: "reception" };
      const pid = (await q(
        `INSERT INTO patients (patient_code,name,branch_id,referral_source,age,medical_condition,
                               is_physiotherapy,treatment_type,total_cost)
         VALUES ($1,'تبويبُ-الزيارات',$2,'مراجعة',44,'ألم',true,'روبوت',500000) RETURNING id`,
        [`WB-${++code}`, BR])).rows[0].id;
      await q(`INSERT INTO patient_cases (patient_id,branch_id,case_type,cost,cost_source,status)
               VALUES ($1,$2,'physiotherapy',500000,'manual','active')`, [pid, BR]);
      await q(`INSERT INTO payments (patient_id,branch_id,amount,payment_treatment_type,session_count,is_free_sessions)
               VALUES ($1,$2,50000,'روبوت',1,false),($1,$2,50000,'روبوت',1,false),($1,$2,0,'روبوت',6,true)`,
        [pid, BR]);

      const blind = await http("GET", `/api/patients/${pid}`, SB);
      const server = blind.body?.physioSessionsResolved;
      const casePayments: any[] = blind.body?.payments ?? [];
      const localOnly = resolvePurchasedSessions({
        plan: null, treatmentTypeText: "روبوت", caseCost: 500000,
        paymentSessions: casePayments.map((p: any) => ({
          treatmentType: p.paymentTreatmentType ?? null, sessionCount: p.sessionCount ?? null,
          isFree: Boolean(p.isFreeSessions),
        })),
      });
      check(server?.total === 16, "زز١١. الخادمُ يرسل ١٦", JSON.stringify(server));
      check(localOnly.total === 10,
        "زز١٢. **ولولا القرار لقرأ تبويبُ الزيارات ١٠** — من صفوفٍ لا يملكها",
        JSON.stringify(localOnly));
      const shown = pickPhysioSessions(server, !blind.body?.payments, () => localOnly);
      check(shown.total === 16,
        "زز١٣. **والقرارُ يُعطي ١٦ للموضعين معاً** — رقمٌ واحد في الشاشة", JSON.stringify(shown));

      //  ④ ومريضُ المفرد المحجوبُ عنه المال: مصدرُه «الدفعات»، فبلا الزرع
      //     يقرأ كلُّ صفٍّ «المتبقي = −عدد الزيارات».
      const mono = (await q(
        `INSERT INTO patients (patient_code,name,branch_id,referral_source,age,medical_condition,
                               is_physiotherapy,treatment_type,total_cost)
         VALUES ($1,'مفردٌ-محجوب',$2,'مراجعة',44,'ألم',true,'روبوت',0) RETURNING id`,
        [`WB-${++code}`, BR])).rows[0].id;
      await q(`INSERT INTO patient_cases (patient_id,branch_id,case_type,cost,cost_source,status)
               VALUES ($1,$2,'physiotherapy',0,'manual','active')`, [mono, BR]);
      await q(`INSERT INTO payments (patient_id,branch_id,amount,payment_treatment_type,session_count,is_free_sessions)
               VALUES ($1,$2,50000,'روبوت',1,false),($1,$2,0,'روبوت',2,true)`, [mono, BR]);
      const bm = await http("GET", `/api/patients/${mono}`, SB);
      const sm = bm.body?.physioSessionsResolved;
      check(sm?.total === 3 && sm?.source === "payments",
        "زز١٤. مفردٌ محجوب: ٣ جلسات بمصدر «الدفعات»", JSON.stringify(sm));
      //  ⚠ **وانقلب عقدُ زز١٥ معه** — للسبب نفسِه.
      check(perVisitSessionMode(sm?.source, sm?.total, !bm.body?.payments) === "hidden",
        "زز١٥. **ولا رقمَ لكلّ زيارة** — لا صفَّ يمشي عليه ولا مجموعَ اشتُري سلفاً", "");
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── حح. ولا يدخل الخطةَ مفتاحٌ ليس من العلاج الطبيعي ──");
    // ═══════════════════════════════════════════════════════════════════
    //  نافذةُ تعديل الدفعة تعرض «أطراف صناعية» و«مساند طبية» صراحةً، وإعادةُ
    //  الوسم إليهما تنقل الدفعةَ إلى حالة الجهاز. وكانت الإضافةُ تمضي بلا
    //  فحص، فتبقى الجلساتُ في `physio_plan` **تحت اسم الجهاز**.
    {
      const pid = await mk("وسمٌ-إلى-جهاز", true);
      const b = await state(pid);
      await http("POST", "/api/payments", S, {
        patientId: pid, branchId: BR, amount: 0, paymentMethod: "cash",
        paymentTreatmentType: "روبوت", sessionCount: 6,
        treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 6, cost: 0, isFree: true }],
      });
      const gid = (await q(
        `SELECT id FROM payments WHERE patient_id=$1 AND is_free_sessions=true ORDER BY id DESC LIMIT 1`,
        [pid])).rows[0].id;
      const mid = await state(pid);
      check(mid.sessions === b.sessions + 6, "حح١. الأساس: ١٠ ⟶ ١٦ بهديّة الروبوت",
        `${b.sessions} ⟶ ${mid.sessions}`);

      const fix = await http("PATCH", `/api/payments/${gid}`, S, {
        paymentTreatmentType: "أطراف صناعية", reason: "وُسِمت خطأً",
      });
      const a = await state(pid);
      const row = (await q(`SELECT plan_credited, payment_treatment_type t FROM payments WHERE id=$1`, [gid])).rows[0];
      const keys = ((a.plan ?? []) as any[]).map((e: any) => e.treatmentType);
      check(fix.status < 300, "حح٢. إعادةُ الوسم نجحت",
        `${fix.status} ${JSON.stringify(fix.body).slice(0, 140)}`);
      check(row?.t === "أطراف صناعية", "حح٣. والصفُّ صار موسوماً بالجهاز", String(row?.t));
      check(!keys.includes("أطراف صناعية"),
        "حح٤. **ولا مفتاحَ «أطراف صناعية» في خطة العلاج الطبيعي**", JSON.stringify(a.plan));
      check(a.sessions === b.sessions, "حح٥. **والعدّادُ عاد ١٠** — الجلساتُ خرجت مع وسمها",
        `${mid.sessions} ⟶ ${a.sessions}`);
      check(row?.plan_credited === false, "حح٦. والصفُّ لم يعد مقيَّداً", String(row?.plan_credited));
    }
    {
      //  ووسمٌ إلى **نوع علاجٍ طبيعيّ آخر** ينتقل كما كان بحرفه.
      const pid = await mk("وسمٌ-إلى-فيزيو", true);
      const b = await state(pid);
      await http("POST", "/api/payments", S, {
        patientId: pid, branchId: BR, amount: 0, paymentMethod: "cash",
        paymentTreatmentType: "روبوت", sessionCount: 6,
        treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 6, cost: 0, isFree: true }],
      });
      const gid = (await q(
        `SELECT id FROM payments WHERE patient_id=$1 AND is_free_sessions=true ORDER BY id DESC LIMIT 1`,
        [pid])).rows[0].id;
      const fix = await http("PATCH", `/api/payments/${gid}`, S, {
        paymentTreatmentType: "أبر صينية", reason: "تصحيحُ نوع",
      });
      const a = await state(pid);
      const row = (await q(`SELECT plan_credited FROM payments WHERE id=$1`, [gid])).rows[0];
      const byType: Record<string, number> = {};
      for (const e of ((a.plan ?? []) as any[])) byType[e.treatmentType] = e.sessionCount;
      check(fix.status < 300, "حح٧. إعادةُ الوسم إلى نوعٍ فيزيويّ نجحت", String(fix.status));
      check(byType["أبر صينية"] === 6 && !byType["روبوت"] === false,
        "حح٨. **والستُّ انتقلت إلى «أبر صينية»**", JSON.stringify(a.plan));
      check(a.sessions === b.sessions + 6, "حح٩. والعدّادُ ما زال ١٦", String(a.sessions));
      check(row?.plan_credited === true, "حح١٠. والصفُّ ما زال مقيَّداً", String(row?.plan_credited));
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── طط. وإعادةُ الوسم لا تتجمّد مع مزامنةِ حالاتٍ متزامنة ──");
    // ═══════════════════════════════════════════════════════════════════
    //  `syncPatientCases` تأخذ `pg_advisory_xact_lock(919, patientId)` **أوّلاً**
    //  ثمّ تكتب على صفوف دفعات المريض. وكانت معاملةُ التعديل تمسك صفَّ الدفعة
    //  ثمّ تطلب الإرشاديَّ عبر `reattachPaymentCase` ⟶ **جمودٌ حقيقيّ**.
    {
      const pid = await mk("جمودُ-إعادة-الوسم", true);
      //  صفٌّ بمبلغٍ صفر وبلا جلسات: موضوعُ هذا القسم ترتيبُ القفل وحده،
      //  فلا قيدَ يومية يُعاد بناؤه ولا خطةَ تُصالَح.
      const payId = (await q(
        `INSERT INTO payments (patient_id,branch_id,amount,payment_treatment_type)
         VALUES ($1,$2,0,'روبوت') RETURNING id`, [pid, BR])).rows[0].id;

      //  المزامنةُ المزاحِمة: تمسك الإرشاديَّ ثمّ — بعد أن ينتظر التعديلُ —
      //  تكتب على صفوف الدفعات، تماماً كما تفعل `syncPatientCases`.
      const other = await pool.connect();
      let otherErr: any = null, patchRes: any = null;
      try {
        await other.query("BEGIN");
        await other.query("SELECT pg_advisory_xact_lock(919, $1)", [pid]);

        const patch = http("PATCH", `/api/payments/${payId}`, S, {
          paymentTreatmentType: "أبر صينية", reason: "تصحيحُ نوع",
        });

        //  ننتظر حتى يقف التعديلُ فعلاً على قفلٍ — لا مهلةً عمياء.
        let waiting = false;
        for (let i = 0; i < 100 && !waiting; i++) {
          const r = await q(
            `SELECT count(*)::int n FROM pg_stat_activity
              WHERE datname = current_database() AND wait_event_type = 'Lock' AND state = 'active'`);
          waiting = Number(r.rows[0].n) > 0;
          if (!waiting) await new Promise((rs) => setTimeout(rs, 50));
        }
        check(waiting, "طط١. التعديلُ يقف على قفلٍ فعلاً — السيناريو ليس فارغاً", "");

        try {
          await other.query("UPDATE payments SET case_id = case_id WHERE patient_id = $1", [pid]);
          await other.query("COMMIT");
        } catch (e) { otherErr = e; try { await other.query("ROLLBACK"); } catch { /* */ } }
        patchRes = await patch;
      } finally {
        other.release();
      }
      check(otherErr === null,
        "طط٢. **والمزامنةُ مضت بلا جمود**", String(otherErr?.message ?? ""));
      check(!/deadlock/i.test(String(otherErr?.message ?? "")),
        "طط٣. ولا `deadlock detected`", String(otherErr?.message ?? ""));
      check(patchRes?.status < 300,
        "طط٤. **والتعديلُ نجح** — لا ٥٠٠", `${patchRes?.status} ${JSON.stringify(patchRes?.body).slice(0, 120)}`);
      const t = (await q(`SELECT payment_treatment_type t FROM payments WHERE id=$1`, [payId])).rows[0].t;
      check(t === "أبر صينية", "طط٥. والوسمُ الجديدُ محفوظ", String(t));
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── يي. دفعتان مختلطتان (مدفوعٌ ثمّ هديّة) لا تتجمّدان ──");
    // ═══════════════════════════════════════════════════════════════════
    //  إدراجُ البند المدفوع يأخذ `FOR KEY SHARE` على صفّ المريض (متوافقٌ مع
    //  نفسِه)، ثمّ يطلب قفلُ بند الهديّة ترقيتَه إلى `FOR UPDATE` — فطلبان
    //  متزامنان بالشكل نفسِه يتجمّدان. فالقفلُ يُؤخَذ **قبل أوّل إدراج** متى
    //  حملت الدفعةُ هديّةً تدخل الخطة.
    {
      const pid = await mk("جمودُ-الدفعة-المختلطة", true);
      const b = await state(pid);

      const origConnect = (pool as any).connect.bind(pool);
      let arrivals = 0;
      let releaseFirst: (() => void) | null = null;
      (pool as any).connect = async function (...ca: any[]) {
        if (ca.some((x) => typeof x === "function")) return origConnect(...ca);
        const client: any = await origConnect(...ca);
        const origQuery = client.query.bind(client);
        client.query = function (...qa: any[]) {
          const text = String(typeof qa[0] === "string" ? qa[0] : (qa[0]?.text ?? ""));
          if (!/pg_advisory_xact_lock\(\s*919/.test(text)) return origQuery(...qa);
          const n = ++arrivals;
          const gate = n === 1
            ? new Promise<void>((res) => { releaseFirst = res; })
            : Promise.resolve();
          const cb = typeof qa[qa.length - 1] === "function" ? qa[qa.length - 1] : null;
          if (cb) { gate.then(() => origQuery(...qa)); return undefined as any; }
          return gate.then(() => origQuery(...qa));
        };
        return client;
      };

      const mixed = () => http("POST", `/api/payments`, S, {
        patientId: pid, branchId: BR, amount: 50000, paymentMethod: "cash",
        treatmentEntries: [
          { treatmentType: "روبوت", sessionCount: 1, cost: 50000 },
          { treatmentType: "روبوت", sessionCount: 1, cost: 0, isFree: true },
        ],
      });
      let settled = 0;
      let r1: any = null, r2: any = null;
      //  **والجمودُ يُقاس من سجلّ الخادم لا من نصّ الردّ**: المعالِجُ يُخفي
      //  `40P01` خلف رسالةٍ عربية عامّة، فاختبارٌ يقرأ الجسمَ وحده يمرّ
      //  لسببٍ خاطئ.
      const origErr = console.error.bind(console);
      let serverLog = "";
      console.error = (...a: any[]) => { serverLog += a.map(String).join(" ") + "\n"; origErr(...a); };
      try {
        const p1 = mixed().then((r) => { settled++; r1 = r; return r; });
        const p2 = mixed().then((r) => { settled++; r2 = r; return r; });
        //  ننتظر إمّا معامَلةً واقفةً على قفل (شكلُ ما قبل الإصلاح) وإمّا
        //  طلباً اكتمل (شكلُ الإصلاح) — لا مهلةً عمياء.
        let waiting = false;
        for (let i = 0; i < 60 && !waiting && settled === 0; i++) {
          const r = await q(
            `SELECT count(*)::int n FROM pg_stat_activity
              WHERE datname = current_database() AND wait_event_type = 'Lock' AND state = 'active'`);
          waiting = Number(r.rows[0].n) > 0;
          if (!waiting) await new Promise((rs) => setTimeout(rs, 50));
        }
        check(arrivals >= 2, "يي١. الطلبان بلغا قفلَ الخطة — السيناريو ليس فارغاً", String(arrivals));
        if (releaseFirst) (releaseFirst as () => void)();
        await Promise.all([p1, p2]);
      } finally {
        (pool as any).connect = origConnect;
        console.error = origErr;
      }

      const bodies = `${JSON.stringify(r1?.body).slice(0, 140)} | ${JSON.stringify(r2?.body).slice(0, 140)}`;
      check(r1?.status === 201 && r2?.status === 201,
        "يي٢. **الطلبان نجحا معاً** — لا جمود", `${r1?.status}/${r2?.status} ${bodies}`);
      check(!/deadlock detected|40P01/i.test(serverLog),
        "يي٣. **ولا `deadlock detected` في سجلّ الخادم**", serverLog.slice(0, 300));

      const rows = (await q(
        `SELECT amount, is_free_sessions f, plan_credited c FROM payments
          WHERE patient_id=$1 ORDER BY id`, [pid])).rows;
      check(rows.length === 4, "يي٤. أربعةُ صفوف: مدفوعان وهديّتان", JSON.stringify(rows));
      check(rows.filter((x: any) => x.f === true).length === 2,
        "يي٥. الهديّتان محفوظتان", JSON.stringify(rows));
      check(rows.filter((x: any) => x.f === true).every((x: any) => x.c === true),
        "يي٦. وكلتاهما موسومةٌ مقيَّدة", JSON.stringify(rows));
      const a = await state(pid);
      check(a.sessions === b.sessions + 2,
        `يي٧. **والعدّادُ ${b.sessions} ⟶ ${b.sessions + 2}**`, `${a.sessions} ${JSON.stringify(a.plan)}`);
      check(a.paid === b.paid + 100000, "يي٨. والمقبوضُ ارتفع بالمدفوعَين", String(a.paid));
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── كك. والزرعُ كان يُقدِّم شراءً لاحقاً على زياراتٍ سبقته ──");
    // ═══════════════════════════════════════════════════════════════════
    //  مريضُ مفردٍ (مصدرُه الدفعات): يشتري عشراً ويحضر، ثمّ يشتري عشراً
    //  أخرى. فالمخوَّلُ يمشي زمنياً فيقرأ على الزيارة الأولى ١٠−١ = ٩،
    //  والمحجوبُ عنه — بالزرع — كان يقرأ ٢٠−١ = ١٩ على **الزيارة نفسِها**.
    {
      const BLIND3 = 9941;
      await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,is_active,
                                         can_view_patients,can_view_payments)
               VALUES ($1,'physblind3','x','استقبالٌ بلا مال','reception',$2,true,true,false)
               ON CONFLICT (id) DO UPDATE SET is_active=true, can_view_patients=true, can_view_payments=false,
                 branch_id=EXCLUDED.branch_id`, [BLIND3, BR]);
      const SB = { userId: BLIND3, branchId: BR, accessibleBranches: [BR], displayName: "بلا مال",
        isAdmin: false, role: "reception" };
      const pid = (await q(
        `INSERT INTO patients (patient_code,name,branch_id,referral_source,age,medical_condition,
                               is_physiotherapy,treatment_type,total_cost)
         VALUES ($1,'مفردٌ-بشراءين',$2,'مراجعة',45,'ألم',true,'روبوت',0) RETURNING id`,
        [`WB-${++code}`, BR])).rows[0].id;
      await q(`INSERT INTO patient_cases (patient_id,branch_id,case_type,cost,cost_source,status)
               VALUES ($1,$2,'physiotherapy',0,'manual','active')`, [pid, BR]);
      //  شراءٌ أوّل (١٠) ثمّ زيارةٌ ثمّ شراءٌ ثانٍ (١٠) ثمّ زيارة — بتواريخ صريحة.
      await q(`INSERT INTO payments (patient_id,branch_id,amount,payment_treatment_type,session_count,date)
               VALUES ($1,$2,500000,'روبوت',10,'2026-03-01T09:00:00'),
                      ($1,$2,500000,'روبوت',10,'2026-03-20T09:00:00')`, [pid, BR]);
      await q(`INSERT INTO visits (patient_id,branch_id,visit_date,treatment_type,details)
               VALUES ($1,$2,'2026-03-05T09:00:00','روبوت','جلسة'),
                      ($1,$2,'2026-03-25T09:00:00','روبوت','جلسة')`, [pid, BR]);

      const asAdmin = await http("GET", `/api/patients/${pid}`, S);
      const asBlind = await http("GET", `/api/patients/${pid}`, SB);
      const srv = asBlind.body?.physioSessionsResolved;
      check(srv?.total === 20 && srv?.source === "payments",
        "كك١. الخادمُ يرسل ٢٠ بمصدر «الدفعات»", JSON.stringify(srv));
      check(Array.isArray(asAdmin.body?.payments) && asAdmin.body.payments.length === 2,
        "كك٢. والمخوَّلُ يرى صفَّي الدفع بتاريخيهما", String(asAdmin.body?.payments?.length));
      check(!asBlind.body?.payments,
        "كك٣. والمحجوبُ عنه لا يصله صفٌّ واحد", String(!!asBlind.body?.payments));

      //  **والفرقُ حقيقيٌّ لا صوريّ**: ما اشتُري حتى الزيارة الأولى ≠ المجموع.
      const firstVisit = new Date("2026-03-05T09:00:00").getTime();
      const boughtByThen = (asAdmin.body.payments as any[])
        .filter((p) => new Date(p.date).getTime() <= firstVisit)
        .reduce((n, p) => n + (p.sessionCount || 0), 0);
      check(boughtByThen === 10 && srv.total === 20,
        "كك٤. **حتى الزيارة الأولى اشتُري ١٠ فقط والمجموعُ ٢٠**", `${boughtByThen}/${srv?.total}`);
      check(boughtByThen - 1 === 9 && srv.total - 1 === 19,
        "كك٥. **فالمخوَّلُ يقرأ ٩ والزرعُ كان يقرأ ١٩ على الزيارة عينها**", "");

      check(perVisitSessionMode(srv.source, srv.total, !asBlind.body?.payments) === "hidden",
        "كك٦. **فلا رقمَ يُعرَض للمحجوب عنه**", "");
      check(perVisitSessionMode(srv.source, srv.total, !asAdmin.body?.payments) === "walk",
        "كك٧. والمخوَّلُ يمشي زمنياً كما كان بحرفه", "");
      //  والمجموعُ الصحيحُ يبقى في بطاقة «ملخّص الجلسات» فوقه — لا يضيع.
      check(pickPhysioSessions(srv, !asBlind.body?.payments, () => ({ total: 0 } as any)).total === 20,
        "كك٨. **وبطاقةُ الملخّص تبقى تعرض ٢٠** — الرقمُ لم يضع", "");
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── لل. والمجّانيُّ صفرٌ حتماً — ولو أرسل العميلُ مبلغاً ──");
    // ═══════════════════════════════════════════════════════════════════
    //  العلمُ العلويُّ (بلا `treatmentEntries`) كان يمرّ بمبلغه كما وصل:
    //  يتخطّى حارسَ «لا متبقّي» (لأنه «مجّانيّ»)، ثمّ يُخزَّن المالُ مقبوضاً،
    //  **ولا قيدَ يومية يُنشأ له** — فيرتفع مدفوعُ المريض بلا سطرٍ في الدفتر.
    //  وقاعدةُ المالك صريحة: «وان اشر مجاني فتحسب جلسات لكن اموال لاتحسب».
    {
      const pid = await mk("مجّانيٌّ-بمبلغ", true);
      //  يُسدَّد الملفُّ بالكامل فيصير المتبقّي صفراً — فالحارسُ مسلَّحٌ فعلاً.
      await http("POST", `/api/payments`, S, {
        patientId: pid, branchId: BR, amount: 500000, paymentMethod: "cash",
        paymentTreatmentType: "روبوت",
      });
      const b = await state(pid);
      const blocked = await http("POST", `/api/payments`, S, {
        patientId: pid, branchId: BR, amount: 50000, paymentMethod: "cash",
        paymentTreatmentType: "روبوت",
      });
      check(blocked.status === 400,
        "لل١. الحارسُ مسلَّحٌ فعلاً — دفعةٌ عادية تُردّ ٤٠٠", `${blocked.status}`);

      const gift = await http("POST", `/api/payments`, S, {
        patientId: pid, branchId: BR, amount: 300000, paymentMethod: "cash",
        paymentTreatmentType: "روبوت", sessionCount: 2, isFreeSessions: true,
      });
      check(gift.status === 201,
        "لل٢. **والهديّةُ تمضي على ملفٍّ سُدِّد بالكامل** — كما هي القاعدة",
        `${gift.status} ${JSON.stringify(gift.body).slice(0, 140)}`);
      const row = (await q(
        `SELECT amount, is_free_sessions f, session_count n, plan_credited c
           FROM payments WHERE id=$1`, [gift.body?.id])).rows[0];
      check(Number(row?.amount) === 0,
        "لل٣. **والمبلغُ المخزَّن صفرٌ ولو أُرسل ٣٠٠,٠٠٠**", JSON.stringify(row));
      const a = await state(pid);
      check(a.paid === b.paid,
        "لل٤. فالمقبوضُ لم يتحرّك بديناً", `${b.paid} ⟶ ${a.paid}`);
      check(a.sessions === b.sessions + 2 && row?.c === true,
        "لل٥. **والجلستان حُسبتا** — تُسجَّل الجلسات ولا يُحتسب المال",
        `${b.sessions} ⟶ ${a.sessions} ${JSON.stringify(a.plan)}`);
      const je = (await q(
        `SELECT count(*)::int n FROM journal_entries WHERE source_type='payment' AND source_id=$1`,
        [gift.body?.id])).rows[0].n;
      check(Number(je) === 0 && Number(row?.amount) === 0,
        "لل٦. **والصفُّ والدفترُ متّفقان**: صفرٌ هنا وصفرٌ هناك", `${je} / ${row?.amount}`);
      //  والمدفوعُ العاديُّ لم يُمَسّ: العلمُ مُطفأٌ فيبقى المبلغُ كما وصل.
      check(b.paid === 500000,
        "لل٧. والدفعةُ العادية قبله خُزّنت بمبلغها كاملاً", String(b.paid));
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── مم. وتوأمُه في مسار التصحيح: المالُ يتبع العلم ──");
    // ═══════════════════════════════════════════════════════════════════
    //  تحويلُ دفعةٍ مقبوضة إلى «مجّانيّة» كان يُبقي مالَها في `payments`
    //  (فيبقى في «الوارد») بينما **يُعكَس قيدُها ولا يُعاد** — فيقول الدفترُ
    //  إن المالَ رُدّ ويقول جدولُ الدفعات إنه ما زال مقبوضاً.
    {
      const pid = await mk("تصحيحٌ-إلى-مجّانيّ", true);
      const paid = await http("POST", `/api/payments`, S, {
        patientId: pid, branchId: BR, amount: 200000, paymentMethod: "cash",
        paymentTreatmentType: "روبوت", sessionCount: 4,
      });
      check(paid.status === 201, "مم١. دفعةٌ مقبوضة ٢٠٠,٠٠٠", String(paid.status));
      const b = await state(pid);
      const jeBefore = (await q(
        `SELECT count(*)::int n FROM journal_entries WHERE source_type='payment' AND source_id=$1`,
        [paid.body?.id])).rows[0].n;

      //  **بلا إرسال مبلغ** — العلمُ وحده يتغيّر.
      const flip = await http("PATCH", `/api/payments/${paid.body?.id}`, S, {
        isFreeSessions: true, reason: "الجلساتُ صارت هديّة",
      });
      check(flip.status < 300, "مم٢. والتحويلُ إلى «مجّانيّ» مضى",
        `${flip.status} ${JSON.stringify(flip.body).slice(0, 120)}`);
      const row = (await q(
        `SELECT amount, is_free_sessions f FROM payments WHERE id=$1`, [paid.body?.id])).rows[0];
      check(row?.f === true && Number(row?.amount) === 0,
        "مم٣. **فالمالُ تبع العلمَ إلى الصفر**", JSON.stringify(row));
      const a = await state(pid);
      check(a.paid === b.paid - 200000,
        "مم٤. والمقبوضُ نزل بمقداره", `${b.paid} ⟶ ${a.paid}`);
      const jeAfter = (await q(
        `SELECT count(*)::int n FROM journal_entries
           WHERE source_type='payment' AND source_id=$1 AND status <> 'reversed'
             AND reversal_of IS NULL`, [paid.body?.id])).rows[0].n;
      check(Number(jeAfter) === 0 && Number(row?.amount) === 0,
        "مم٥. **والدفترُ والصفُّ متّفقان بعده**", `${jeBefore} ⟶ ${jeAfter} / ${row?.amount}`);
      //  **ولا يُلمَس صفٌّ متّسقٌ أصلاً**: تعديلُ ملاحظةٍ على المجّانيّ الصفريّ.
      const note = await http("PATCH", `/api/payments/${paid.body?.id}`, S, {
        notes: "ملاحظةٌ فقط",
      });
      check(note.status < 300, "مم٦. وتعديلُ ملاحظةٍ بعده يمضي بلا سبب",
        `${note.status} ${JSON.stringify(note.body).slice(0, 120)}`);
      const row2 = (await q(
        `SELECT amount, is_free_sessions f, notes FROM payments WHERE id=$1`, [paid.body?.id])).rows[0];
      check(Number(row2?.amount) === 0 && row2?.f === true && row2?.notes === "ملاحظةٌ فقط",
        "مم٧. والصفُّ كما هو — صفرٌ ومجّانيٌّ وملاحظتُه الجديدة", JSON.stringify(row2));
    }

    console.log(`\n${failures === 0 ? "✅ كل البنود ناجحة" : `❌ ${failures} بنداً فاشلاً`}`);
  } finally {
    httpServer.close();
    await pool.end();
  }
  process.exit(failures === 0 ? 0 : 1);
})();
