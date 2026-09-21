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

    console.log(`\n${failures === 0 ? "✅ كل البنود ناجحة" : `❌ ${failures} بنداً فاشلاً`}`);
  } finally {
    httpServer.close();
    await pool.end();
  }
  process.exit(failures === 0 ? 0 : 1);
})();
