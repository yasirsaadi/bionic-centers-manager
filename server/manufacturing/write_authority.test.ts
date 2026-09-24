//  **إذنُ الخبير هو الإسنادُ نفسُه — ويُحكَم عليه تحت القفل** (مراجعة Codex على ٤٠٥).
//
//  `loadWritable` تأذن للخبير بالكتابة لأن الأمرَ مسنَدٌ إليه — وتقرأ ذلك **قبل**
//  القفل. فإسنادٌ إلى خبيرٍ آخر يلتزم بين الفحص والقفل كان يترك طلبَ الأوّل يكتب
//  بعد أن فقد الأمر. مُعادٌ حيّاً قبل الإصلاح في الأبواب الستّة المتاحة للخبير —
//  كتابةُ سبب التوقّف · التوقّف · إعادةُ العمل · الاستئناف · الانتقال · الموعد —
//  وكلُّها ردّت ٢٠٠ وكتبت بيد مَن لم يعد صاحبَ الأمر.
//
//  والسباقُ هنا **حتميٌّ لا احتمال**: بوّابةٌ على العميل المُستعار من المجمَّع تحجز
//  **أوّلَ قفلٍ لصفّ أمر العمل** — قفلَ الطلب المُختبَر — فيلتزم الفعلُ المنافس
//  كاملاً، ثمّ تُحرَّر. والبوّابةُ **في ملفّ الاختبار وحده** وتُستعاد في `finally`
//  مهما وقع — ولا حرفَ في شيفرة الخادم لأجلها.
//
//  حيٌّ على Postgres وعلى النقاط الحقيقية عبر Express حقيقيّ.
//  التشغيل: `DATABASE_URL=… npm run test:manufacturing-write-authority`
import { db, pool } from "../db";
import { sql } from "drizzle-orm";
import express from "express";
import { createServer } from "http";
import { readFileSync } from "fs";
import * as store from "./store";
import { registerRoutes } from "../routes";
import { HOLD_REASONS } from "@shared/manufacturing";

const PORT = 6151 + (Date.now() % 7);
const BASE = `http://127.0.0.1:${PORT}`;

//  جدولُ النقاط الحقيقيّ — نفسُ حَقنِ الجلسة المستعمَل في بقيّة الحزم.
async function bootRealRoutes() {
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
  (app as any).use = (...args: any[]) =>
    (args.length === 1 && typeof args[0] === "function" && args[0].name === "session")
      ? app : realUse(...(args as [any]));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));
  return httpServer;
}

type Res = { status: number; body: any };
async function http(method: string, path: string, session: any, body?: any): Promise<Res> {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "content-type": "application/json",
      "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

let pass = 0, fail = 0;
const ok = (c: boolean, m: string, detail = "") => {
  if (c) { pass++; console.log("  ✓ " + m); }
  else { fail++; console.log("  ✗ " + m + (detail ? `\n      ${detail}` : "")); }
};
const eq = (got: unknown, want: unknown, m: string) =>
  ok(JSON.stringify(got) === JSON.stringify(want), m,
    `want ${JSON.stringify(want)} got ${JSON.stringify(got)}`);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
//  أرقامُ البنود بالهنديّة كبقيّة الحزم — `ar(3)` ⟶ «٣».
const ar = (n: number) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

//  الرسالةُ التي يقرؤها الخبيرُ حين يُسنَد الأمرُ إلى غيره أثناء طلبه.
const REASSIGNED = "أُسنِد هذا الأمرُ إلى خبيرٍ آخر أثناء طلبك — لم يُكتب شيء.";

//  أسبابٌ صالحةٌ من القائمة القانونية نفسِها — لا رموزٌ مكتوبةٌ هنا تنحرف.
const MAT = HOLD_REASONS.waiting_materials[0].code;
const PAT = HOLD_REASONS.waiting_patient[0].code;
const RWK = HOLD_REASONS.technical_rework[0].code;

/**
 * السباقُ الحتميّ: يبدأ `write`، فتحجز البوّابةُ أوّلَ قفلٍ لصفّ أمر العمل — قفلَه
 * هو، وطلبُه لم يمسك قفلاً بعد (لم يتجاوز `BEGIN`) — ثمّ يُنفَّذ `during` كاملاً
 * ويلتزم، وتُؤخذ بصمةُ الأمر، ثمّ تُحرَّر البوّابة.
 *
 * المعاملةُ تستعير عميلاً من المجمَّع (`pool.connect` بلا دالّةِ نداء) ولا تمرّ
 * بـ`pool.query` — فالبوّابةُ على العميل المُستعار لا على المجمَّع. وإن لم يبلغ الطلبُ
 * البوّابةَ أصلاً (رُدّ قبل القفل) تُفتَح قبل `during` كي لا يعلق الاختبار، ويُقال
 * ذلك في `raced` فلا يمرّ بندٌ لسببٍ خاطئ.
 */
async function race(
  write: () => Promise<Res>, during: () => Promise<void>, fingerprint: () => Promise<string>,
): Promise<{ raced: boolean; res: Res; before: string }> {
  const origConnect = (pool as any).connect.bind(pool);
  let held = false;
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  (pool as any).connect = async (...cArgs: any[]) => {
    //  شكلُ الاستدعاء بدالّةِ نداءٍ (`pool.query`) يُترَك للأصل كما هو.
    if (cArgs.some((x) => typeof x === "function")) return origConnect(...cArgs);
    const client: any = await origConnect();
    if (!client || typeof client.query !== "function") return client;
    const cq = client.query.bind(client);
    client.query = async (...args: any[]) => {
      const text = typeof args[0] === "string" ? args[0] : String(args[0]?.text ?? "");
      if (!held && /"prosthetic_work_orders"/i.test(text) && /for update/i.test(text)) {
        held = true;
        await gate;
      }
      return cq(...args);
    };
    return client;
  };
  try {
    const pending = write();
    for (let i = 0; i < 300 && !held; i++) await sleep(10);
    const raced = held;
    if (!raced) release();
    await during();
    const before = await fingerprint();
    release();
    const res = await pending;
    return { raced, res, before };
  } finally {
    (pool as any).connect = origConnect;
  }
}

async function main() {
  let srv: any = null;
  const t = Date.now() % 1000000;
  const one = async (q: any) => (await db.execute(q)).rows[0] as any;
  const ids: number[] = [];
  const userIds: number[] = [];
  const patientIds: number[] = [];

  const bW = Number((await one(sql`INSERT INTO branches (name) VALUES (${"فرع الإسناد " + t}) RETURNING id`)).id);
  const mkUser = async (role: string, name: string) => {
    const id = Number((await one(sql`
      INSERT INTO system_users (username, password_hash, display_name, role, branch_id, branch_ids,
                                is_active, can_view_patients)
      VALUES (${role + "_w_" + t + "_" + userIds.length}, 'x', ${name + " " + t}, ${role},
              ${bW}, ${JSON.stringify([bW])}::jsonb, true, true)
      RETURNING id`)).id);
    userIds.push(id);
    return id;
  };
  const X = await mkUser("prosthetics_expert", "الخبير الأوّل");
  const Y = await mkUser("prosthetics_expert", "الخبير الجديد");
  const M = await mkUser("branch_manager", "مدير الفرع");
  const M2 = await mkUser("branch_manager", "مدير الفرع الثاني");

  const expertSession = (userId: number, name: string) => ({
    userId, role: "prosthetics_expert", isAdmin: false, branchId: bW,
    accessibleBranches: [bW], displayName: name, permissions: {},
  });
  const managerSession = (userId: number) => ({
    userId, role: "branch_manager", isAdmin: false, branchId: bW,
    accessibleBranches: [bW], displayName: "مدير", permissions: { canViewPatients: true },
  });
  const S = {
    X: expertSession(X, "الخبير الأوّل"),
    Y: expertSession(Y, "الخبير الجديد"),
    M: managerSession(M),
    M2: managerSession(M2),
  };

  //  مريضٌ لكلّ أمر — القاعدةُ تمنع بناءين مفتوحين لمريضٍ واحد.
  const mkOrder = async (o: {
    stage: string; status?: string; reason?: string | null; due?: string | null; expert?: number;
  }) => {
    const patient = Number((await one(sql`
      INSERT INTO patients (name, phone, branch_id, is_amputee, referral_source, age, medical_condition)
      VALUES (${"مريض الإسناد " + t + " " + patientIds.length}, ${"0774" + t + patientIds.length}, ${bW},
              true, 'اختبار', 30, 'بتر')
      RETURNING id`)).id);
    patientIds.push(patient);
    const id = Number((await one(sql`
      INSERT INTO prosthetic_work_orders
        (patient_id, branch_id, service_type, purpose, expert_user_id, status, current_stage,
         hold_reason_code, expected_delivery_date)
      VALUES (${patient}, ${bW}, 'prosthetic', 'initial_build', ${o.expert ?? X}, ${o.status ?? "active"},
              ${o.stage}, ${o.reason ?? null}, ${o.due ?? null})
      RETURNING id`)).id);
    ids.push(id);
    return id;
  };

  //  **بصمةُ الأمر وكلِّ ما يكتبه كاتبُه**: الصفُّ بأعمدته، وخطُّه الزمني، وصفوفُ
  //  إعادة العمل، وأحداثُ المريض، وسطورُ التدقيق. تساويها قبلاً وبعداً = صفرُ كتابة.
  const fingerprint = async (id: number): Promise<string> => {
    const o = await one(sql`
      SELECT expert_user_id, status, current_stage, hold_reason_code, hold_note,
             expected_delivery_date::text AS due, started_at::text AS started,
             updated_at::text AS upd, patient_id
        FROM prosthetic_work_orders WHERE id = ${id}`);
    const n = async (q: any) => Number((await one(q)).n);
    return JSON.stringify({
      o,
      history: await n(sql`SELECT count(*)::int AS n FROM prosthetic_work_history WHERE work_order_id = ${id}`),
      rework: await n(sql`SELECT count(*)::int AS n FROM prosthetic_rework_events WHERE work_order_id = ${id}`),
      events: await n(sql`SELECT count(*)::int AS n FROM patient_events WHERE patient_id = ${o.patient_id}`),
      audit: await n(sql`SELECT count(*)::int AS n FROM audit_log
                          WHERE entity_type = 'prosthetic_work_order' AND entity_id = ${id}`),
    });
  };
  const rowOf = async (id: number) => await one(sql`
    SELECT expert_user_id, status, current_stage, hold_reason_code, expected_delivery_date::text AS due
      FROM prosthetic_work_orders WHERE id = ${id}`);
  const reassign = async (id: number, to: number, by: any = S.M) => {
    const r = await http("PATCH", `/api/manufacturing/orders/${id}/reassign`, by,
      { newExpertUserId: to, reason: "تحويل أثناء الطلب" });
    if (r.status !== 200) throw new Error(`reassign → ${r.status} ${JSON.stringify(r.body)}`);
  };

  try {
    srv = await bootRealRoutes();

    //  ══ أ. الأبواب الستّة — الخبيرُ يُسنَد أمرُه إلى غيره بين الإذن والقفل ═══════
    console.log("\nأ — الأبواب الستّة: أُسنِد الأمرُ إلى غيره بين إذن الطلب وقفله");
    const doors: { label: string; setup: Parameters<typeof mkOrder>[0];
      write: (id: number) => Promise<Res> }[] = [
      { label: "كتابةُ سبب التوقّف القائم",
        setup: { stage: "manufacturing", status: "technical_rework", reason: null, due: "2020-01-15" },
        write: (id) => http("POST", `/api/manufacturing/orders/${id}/hold-reason`, S.X,
          { status: "technical_rework", reasonCode: RWK }) },
      { label: "توقّفٌ جديد",
        setup: { stage: "manufacturing", due: "2020-01-15" },
        write: (id) => http("POST", `/api/manufacturing/orders/${id}/hold`, S.X,
          { status: "waiting_materials", reasonCode: MAT, note: "بعد أن فقدتُ الأمر" }) },
      { label: "إعادةُ عملٍ فنّي",
        setup: { stage: "manufacturing", due: "2020-01-15" },
        write: (id) => http("POST", `/api/manufacturing/orders/${id}/hold`, S.X,
          { status: "technical_rework", reasonCode: RWK, returnToStage: "mold" }) },
      { label: "الاستئناف",
        setup: { stage: "manufacturing", status: "waiting_patient", reason: PAT, due: "2020-01-15" },
        write: (id) => http("POST", `/api/manufacturing/orders/${id}/resume`, S.X, {}) },
      { label: "الانتقال للمرحلة التالية",
        setup: { stage: "measurements" },
        write: (id) => http("PATCH", `/api/manufacturing/orders/${id}/advance`, S.X,
          { expectedDeliveryDate: "2099-12-31" }) },
      { label: "تغيير الموعد",
        setup: { stage: "manufacturing", due: "2099-11-30" },
        write: (id) => http("PATCH", `/api/manufacturing/orders/${id}/delivery-date`, S.X,
          { expectedDeliveryDate: "2099-12-31", reason: "بعد أن فقدتُ الأمر" }) },
    ];
    const heldOrderForY = { id: 0 };
    let k = 0;
    for (const d of doors) {
      k++;
      const id = await mkOrder(d.setup);
      if (k === 1) heldOrderForY.id = id;
      const { raced, res, before } = await race(
        () => d.write(id), () => reassign(id, Y), () => fingerprint(id));
      const after = await fingerprint(id);
      ok(raced && (await rowOf(id)).expert_user_id === Y,
        `أ${ar(k)}. ${d.label}: السباقُ وقع — أُسنِد الأمرُ إلى غيره والطلبُ ينتظر القفل`);
      eq([res.status, res.body?.error], [403, REASSIGNED],
        `أ${ar(k)}أ. ${d.label}: **٤٠٣ برسالةٍ تقول ما جرى** — لا ٢٠٠ ولا «أعد المحاولة»`);
      ok(after === before,
        `أ${ar(k)}ب. ${d.label}: **صفرُ كتابة** — الصفُّ وخطُّه الزمني وإعادةُ العمل وأحداثُ المريض والتدقيقُ كما هي`,
        `before ${before}\n      after  ${after}`);
    }

    //  ══ ب. الخبيرُ الجديد يكتب، والقديمُ يُردّ عند الباب ════════════════════
    console.log("\nب — الخبيرُ الجديد يكتب، والقديمُ يُردّ عند الباب بلا سباق");
    let r = await http("POST", `/api/manufacturing/orders/${heldOrderForY.id}/hold-reason`, S.Y,
      { status: "technical_rework", reasonCode: RWK, note: "كتبه الخبيرُ الجديد" });
    eq([r.status, (await rowOf(heldOrderForY.id)).hold_reason_code], [200, RWK],
      "ب١. الخبيرُ الجديد يكتب سبب التوقّف على الأمر نفسِه — فالردُّ لم يكن عطباً في الأمر");
    r = await http("POST", `/api/manufacturing/orders/${heldOrderForY.id}/resume`, S.X, {});
    eq(r.status, 403, "ب٢. والخبيرُ القديم يُعيد المحاولة ⟶ ٤٠٣ من الباب نفسِه (`loadWritable`)");

    //  ══ ج. سلطةُ المدير لا تتبع الإسناد ═══════════════════════════════════
    console.log("\nج — سلطةُ المدير دورُه ونطاقُه، لا الخبيرُ المسنَد: لا يُردّ لأن الخبيرَ تغيّر");
    const mh = await mkOrder({ stage: "manufacturing", due: "2020-01-15" });
    let out = await race(
      () => http("POST", `/api/manufacturing/orders/${mh}/hold`, S.M,
        { status: "waiting_materials", reasonCode: MAT, note: "أوقفه المدير" }),
      () => reassign(mh, Y, S.M2), () => fingerprint(mh));
    let row = await rowOf(mh);
    eq([out.raced, out.res.status, row.status, row.hold_reason_code, row.expert_user_id],
      [true, 200, "waiting_materials", MAT, Y],
      "ج١. المديرُ يوقف أمراً أُسنِد إلى غيره أثناء طلبه ⟶ ٢٠٠ ويُكتب — والإسنادُ الجديد باقٍ");
    const mc = await mkOrder({ stage: "manufacturing" });
    out = await race(
      () => http("POST", `/api/manufacturing/orders/${mc}/cancel`, S.M, { note: "ألغاه المدير" }),
      () => reassign(mc, Y, S.M2), () => fingerprint(mc));
    eq([out.raced, out.res.status, (await rowOf(mc)).status], [true, 200, "cancelled"],
      "ج٢. والإلغاءُ (بابُ الإدارة وحدها) كذلك ⟶ ٢٠٠ ويُلغى");

    //  ══ د. الفحصُ على الإسناد الحاليّ لا على «أتغيّر؟» ═══════════════════════
    console.log("\nد — الفحصُ على الإسناد الحاليّ: أُسنِد إلى غيره ثمّ أُعيد إليه قبل القفل");
    const back = await mkOrder({ stage: "manufacturing", due: "2020-01-15" });
    out = await race(
      () => http("POST", `/api/manufacturing/orders/${back}/hold`, S.X,
        { status: "waiting_materials", reasonCode: MAT, note: "عاد إليّ" }),
      async () => { await reassign(back, Y); await reassign(back, X); },
      () => fingerprint(back));
    row = await rowOf(back);
    eq([out.raced, out.res.status, row.status, row.expert_user_id],
      [true, 200, "waiting_materials", X],
      "د١. الأمرُ أمرُه لحظةَ الكتابة ⟶ ٢٠٠ ويُكتب — لا يُردّ لأن الإسنادَ تحرّك ثمّ عاد");

    //  ══ هـ. عقدُ المخزن: الكتّابُ السبعة كلُّهم ════════════════════════════
    //  كلُّ كاتبٍ على أمرٍ مسنَدٍ إلى Y: بإذن X ⟶ يُردّ بلا كتابة، **وبإذن Y ⟶ يمضي**.
    //  والثاني شاهدُ عدم الفراغ: الحالُ صالحةٌ لهذا الكاتب، فلا يُردّ إلّا للإذن.
    console.log("\nهـ — عقدُ المخزن: الكتّابُ السبعة يُعيدون فحصَ الإذن تحت القفل");
    const asX: store.WriteAuthority = { via: "assignment", expertUserId: X };
    const asY: store.WriteAuthority = { via: "assignment", expertUserId: Y };
    const writers: { label: string; setup: Parameters<typeof mkOrder>[0];
      run: (order: any, authority: store.WriteAuthority) => Promise<unknown> }[] = [
      { label: "updateStage", setup: { stage: "measurements", expert: Y },
        run: (order, authority) => store.updateStage({ order, toStage: "mold",
          deliveryDate: "2099-12-31", performedBy: null, authority }) },
      { label: "updateDeliveryDate", setup: { stage: "manufacturing", due: "2099-11-30", expert: Y },
        run: (order, authority) => store.updateDeliveryDate({ order,
          expectedDeliveryDate: "2099-12-31", reason: "عقد المخزن", performedBy: null, authority }) },
      { label: "holdOrder", setup: { stage: "manufacturing", expert: Y },
        run: (order, authority) => store.holdOrder({ order, status: "waiting_materials",
          reasonCode: MAT, performedBy: null, authority }) },
      { label: "documentHoldReason",
        setup: { stage: "manufacturing", status: "technical_rework", reason: null, expert: Y },
        run: (order, authority) => store.documentHoldReason({ order, status: "technical_rework",
          reasonCode: RWK, performedBy: null, authority }) },
      { label: "resumeOrder", setup: { stage: "manufacturing", status: "waiting_patient", reason: PAT, expert: Y },
        run: (order, authority) => store.resumeOrder({ order, performedBy: null, authority }) },
      { label: "reworkToStage", setup: { stage: "manufacturing", expert: Y },
        run: (order, authority) => store.reworkToStage({ order, returnToStage: "mold",
          reasonCode: RWK, performedBy: null, authority }) },
      { label: "cancelOrder", setup: { stage: "manufacturing", expert: Y },
        run: (order, authority) => store.cancelOrder({ order, performedBy: null, authority }) },
    ];
    k = 0;
    for (const w of writers) {
      k++;
      const id = await mkOrder(w.setup);
      const order = await store.getRawOrder(id);
      const before = await fingerprint(id);
      let err: unknown = null;
      try { await w.run(order, asX); } catch (e) { err = e; }
      ok(err instanceof store.WorkOrderReassignedError && (await fingerprint(id)) === before,
        `هـ${ar(k)}. ${w.label} بإذن خبيرٍ لم يعد صاحبَ الأمر ⟶ يُردّ تحت القفل بلا كتابة`, String(err));
      let err2: unknown = null;
      try { await w.run(order, asY); } catch (e) { err2 = e; }
      ok(err2 === null && (await fingerprint(id)) !== before,
        `هـ${ar(k)}أ. ${w.label} بإذن صاحبه ⟶ يمضي ويكتب (فالحالُ صالحةٌ، والردُّ للإذن وحده)`, String(err2));
    }
    const probe = new store.WorkOrderReassignedError({ currentStage: "mold", status: "active" });
    ok(probe instanceof store.WorkOrderConflictError,
      "هـ٨. والخطأُ صنفٌ فرعيٌّ من التعارض: كلُّ نقطةٍ تلتقط التعارضَ تلتقطه، فلا يبقى طلبٌ بلا ردّ");

    //  ══ و. حارسان معماريّان ════════════════════════════════════════════════
    console.log("\nو — لا قفلَ لكاتبٍ بلا إعادة فحص الإذن، ولا إذنَ يُبنى خارج بابه");
    const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    const storeSrc = strip(readFileSync(new URL("./store.ts", import.meta.url), "utf8"));
    const lockLines = [...storeSrc.matchAll(/const live = await lockOrder\(tx, order\.id\);\s*\n\s*([^\n]*)/g)];
    const unguarded = lockLines.filter((m) => m[1].trim() !== "assertWriteAuthority(live, params.authority);");
    ok(lockLines.length === writers.length && unguarded.length === 0,
      `و١. كلُّ كاتبٍ يقفل صفَّ أمرٍ يفحص الإذنَ أوّلَ ما بعد القفل (${ar(lockLines.length)} من ${ar(writers.length)})`,
      unguarded.map((m) => m[1].trim()).join(" | "));
    const routesSrc = strip(readFileSync(new URL("./routes.ts", import.meta.url), "utf8"));
    const sig = routesSrc.indexOf("async function loadWritable(");
    const bodyStart = routesSrc.indexOf("{\n", sig);
    let depth = 0, bodyEnd = bodyStart;
    for (let i = bodyStart; i < routesSrc.length; i++) {
      if (routesSrc[i] === "{") depth++;
      else if (routesSrc[i] === "}") { depth--; if (depth === 0) { bodyEnd = i; break; } }
    }
    const built = [...routesSrc.matchAll(/via: "/g)].map((m) => m.index ?? -1);
    ok(sig > 0 && built.length >= 3 && built.every((i) => i > bodyStart && i < bodyEnd),
      "و٢. أساسُ الإذن يُبنى في `loadWritable` وحدها — لا نقطةَ تمرّر `role` بيدها فتتخطّى الفحص",
      `في الملفّ ${built.length}، خارجَ loadWritable ${built.filter((i) => !(i > bodyStart && i < bodyEnd)).length}`);
  } finally {
    if (srv) await new Promise((res) => srv.close(() => res(null)));
    const idList = sql.join(ids.map((i) => sql`${i}`), sql`, `);
    const pList = sql.join(patientIds.map((i) => sql`${i}`), sql`, `);
    const uList = sql.join(userIds.map((i) => sql`${i}`), sql`, `);
    //  أحداثُ المريض وخبرُها تشير إلى المريض، فتُحذف قبله (كما في events.test).
    await db.execute(sql`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${pList})`);
    await db.execute(sql`DELETE FROM patient_events WHERE patient_id IN (${pList})`);
    await db.execute(sql`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (${idList})`);
    await db.execute(sql`DELETE FROM prosthetic_work_history WHERE work_order_id IN (${idList})`);
    await db.execute(sql`DELETE FROM prosthetic_work_orders WHERE id IN (${idList})`);
    await db.execute(sql`DELETE FROM patients WHERE id IN (${pList})`);
    await db.execute(sql`DELETE FROM audit_log WHERE user_id IN (${uList})
                           OR (entity_type = 'prosthetic_work_order' AND entity_id IN (${idList}))`);
    await db.execute(sql`DELETE FROM system_users WHERE id IN (${uList})`);
    await db.execute(sql`DELETE FROM branches WHERE id = ${bW}`);
  }

  console.log(`\nنجح ${pass} · فشل ${fail}`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
