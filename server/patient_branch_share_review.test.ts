//  **الفرعُ المُتاحُ له الملفّ يعمل عليه كما يعمل فرعُ التسجيل** (ترحيل ٠٨٠).
//
//  شكوى المالك (٢٠٢٦-٠٩-٢٤): مريضةٌ مسجَّلةٌ في ذي قار أُتيحت لبغداد، فدخل
//  عليها استقبالُ بغداد فظهر له «غير مصرح لك بهذا الفرع». والسببُ نواةٌ واحدة:
//  `createReviewRequestTx` كانت تقيس بفرع **التسجيل** وحده، وهي البابُ الواحد
//  لكلّ طلبِ مراجعة — الإرسالُ اليدويّ، وطلبُ الجهاز، وإضافةُ نوع الحالة،
//  وزيارةُ الجهاز، و«عاد للشراء». مُعادٌ حيّاً قبل الإصلاح:
//
//    • «إرسال لمراجعة الطبيب» ⟵ ٤٠٣ «غير مصرح لك بهذا الفرع».
//    • «إضافة نوع حالة» ⟵ ٥٠٠ بالرسالة نفسِها **بعد** أن أُضيفت الحالةُ وزيارتُها.
//    • «طلب جهاز» ⟵ ٥٠٠ «تعذّر بدء الجهاز» **بعد** أن فُتحت الحلقة.
//    • «تسجيل زيارة» لجهاز ⟵ لا ردَّ إطلاقاً (رفضٌ غيرُ ملتقَط).
//    • ومعها قراءتان بفرع التسجيل: أجهزةُ المريض (قائمةٌ فارغة للفرع المُتاح)
//      والملخّصُ الماليّ.
//
//  والحدُّ محفوظ: فرعٌ **لا** يصل الملفّ يُردّ كما كان وبلا كتابة، وقرارُ فرعٍ
//  على عمليةِ فرعٍ آخر (حلقةٌ في ذي قار) يبقى لصاحبها.
//
//  حيٌّ على Postgres وعلى النقاط الحقيقية عبر Express حقيقيّ.
//  التشغيل: `DATABASE_URL=… npm run test:branch-share-review`
import { pool } from "./db";
import express from "express";
import { createServer } from "http";
import { readFileSync } from "fs";
import { registerRoutes } from "./routes";
import { storage } from "./storage";

const PORT = 6171 + (Date.now() % 7);
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-إتاحة-المراجعة";

//  ذي قار = فرعُ التسجيل · بغداد = الفرعُ المُتاح · كربلاء = فرعٌ لا يصل الملفّ.
const DHIQAR = 61, BAGHDAD = 62, KARBALA = 63;
const R_DHIQAR = 9611, R_BAGHDAD = 9612, R_KARBALA = 9613, M_BOTH = 9614;
const USERS = [R_DHIQAR, R_BAGHDAD, R_KARBALA, M_BOTH];

const S = {
  dhiqar: { userId: R_DHIQAR, role: "reception", isAdmin: false, branchId: DHIQAR,
    accessibleBranches: [DHIQAR], displayName: "استقبال ذي قار", permissions: {} },
  baghdad: { userId: R_BAGHDAD, role: "reception", isAdmin: false, branchId: BAGHDAD,
    accessibleBranches: [BAGHDAD], displayName: "استقبال بغداد", permissions: {} },
  karbala: { userId: R_KARBALA, role: "reception", isAdmin: false, branchId: KARBALA,
    accessibleBranches: [KARBALA], displayName: "استقبال كربلاء", permissions: {} },
  //  مديرٌ يصل الفرعين وجلستُه على بغداد — لإثبات أن «عاد للشراء» يتبع عمليتَه.
  both: { userId: M_BOTH, role: "branch_manager", isAdmin: false, branchId: BAGHDAD,
    accessibleBranches: [DHIQAR, BAGHDAD], displayName: "مدير الفرعين", permissions: {} },
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  return (await pool.query(text, params)).rows as T[];
}

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
//  **بمهلةٍ صريحة**: أحدُ الأعطاب المُعادة كان طلباً لا يعود أبداً، فانتظارُه
//  بلا حدّ يُعلّق الحزمةَ بدل أن يُسقط بندَه.
async function http(method: string, path: string, session: any, body?: any): Promise<Res> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(BASE + path, {
      method, signal: ctl.signal,
      headers: {
        "content-type": "application/json",
        "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json: any = null;
    try { json = await res.json(); } catch { /* empty */ }
    return { status: res.status, body: json };
  } catch (e: any) {
    return { status: 0, body: { error: e?.name === "AbortError" ? "لا ردّ — الطلب معلَّق" : String(e) } };
  } finally {
    clearTimeout(t);
  }
}

let pass = 0, fail = 0;
const ok = (c: boolean, m: string, detail = "") => {
  if (c) { pass++; console.log("  ✓ " + m); }
  else { fail++; console.log("  ✗ " + m + (detail ? `\n      ${detail}` : "")); }
};
const eq = (got: unknown, want: unknown, m: string) =>
  ok(JSON.stringify(got) === JSON.stringify(want), m,
    `want ${JSON.stringify(want)} got ${JSON.stringify(got)}`);
const msg = (r: Res) => String(r.body?.error ?? r.body?.message ?? "");

const DENIED = "غير مصرح لك بهذا الفرع";

async function mkPatient(label: string, shared: boolean) {
  const [p] = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition,
       amputation_site, branch_id, is_amputee, is_medical_support, is_physiotherapy, total_cost,
       patient_classification)
     VALUES ($1,'07801112233',$2,'30','160','60','بتر','احادي - طرف سفلي - يمين - تحت الركبة',
             $3,true,false,false,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, DHIQAR]);
  const [c] = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$2,'prosthetic',0,'manual','active') RETURNING id`, [p.id, DHIQAR]);
  if (shared) {
    await q(`INSERT INTO patient_branch_access (patient_id, branch_id, granted_by_name, note)
             VALUES ($1,$2,'المسؤول','إتاحة لبغداد')`, [p.id, BAGHDAD]);
  }
  return { id: Number(p.id), caseId: Number(c.id) };
}

/** بصمةُ ما يُكتب على الملفّ — لإثبات «صفر كتابة» على كلّ ردّ. */
async function writes(patientId: number) {
  const n = async (t: string) =>
    Number((await q(`SELECT count(*)::int n FROM ${t} WHERE patient_id=$1`, [patientId]))[0].n);
  return {
    requests: await n("medical_review_requests"),
    episodes: await n("patient_device_episodes"),
    cases: await n("patient_cases"),
    visits: await n("visits"),
  };
}

async function cleanup() {
  const pts = await q<{ id: number }>(`SELECT id FROM patients WHERE referral_source=$1`, [MARK]);
  for (const p of pts) await storage.deletePatient(Number(p.id));
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
}

//  **كالإنتاج** (`server/index.ts`): رفضٌ غيرُ ملتقَط لا يُسقط العملية — فيبقى
//  الطلبُ بلا ردٍّ ويسقط بندُه بالمهلة، لا الحزمةُ كلُّها. (أحدُ الأعطاب المُعادة
//  كان هذا بعينه: زيارةُ جهازٍ لا يعود ردُّها.)
process.on("unhandledRejection", (e: any) => {
  console.error("  [رفضٌ غيرُ ملتقَط]", e?.message ?? e);
});

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES ($1,'ذي قار'),($2,'بغداد'),($3,'كربلاء')
           ON CONFLICT (id) DO NOTHING`, [DHIQAR, BAGHDAD, KARBALA]);
  await cleanup();
  for (const [id, role, br, ids, name] of [
    [R_DHIQAR, "reception", DHIQAR, [DHIQAR], "استقبال ذي قار"],
    [R_BAGHDAD, "reception", BAGHDAD, [BAGHDAD], "استقبال بغداد"],
    [R_KARBALA, "reception", KARBALA, [KARBALA], "استقبال كربلاء"],
    [M_BOTH, "branch_manager", BAGHDAD, [DHIQAR, BAGHDAD], "مدير الفرعين"],
  ] as any[]) {
    //  صلاحياتُ قالب «الاستقبال» في شاشة المستخدمين — تُقرأ حيّاً من هنا على
    //  كلّ طلب، فالجلسةُ لا تحملها.
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id,
               branch_ids, is_active, can_view_patients, can_add_patients, can_view_payments,
               can_add_payments)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,true,true,true,true)`,
      [id, `bsr_${id}`, name, role, br, JSON.stringify(ids)]);
  }

  const srv = await bootRealRoutes();
  try {
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ. القراءة: أجهزةُ المريض وملخّصُه الماليّ للفرع المُتاح ──");
    // ══════════════════════════════════════════════════════════════════
    const p1 = await mkPatient("قراءة", true);
    const [ep1] = await q<{ id: number }>(
      `INSERT INTO patient_device_episodes (patient_id, case_id, sequence_number, status,
         service_path, branch_id)
       VALUES ($1,$2,1,'awaiting_exam','exam',$3) RETURNING id`, [p1.id, p1.caseId, DHIQAR]);
    const devB = await http("GET", `/api/patients/${p1.id}/device-episodes`, S.baghdad);
    eq(devB.status, 200, "أ١. **بغداد تقرأ أجهزةَ المريضة** — كانت ٤٠٣ فتُبنى الشاشةُ على قائمةٍ فارغة");
    ok((devB.body?.episodes ?? []).some((e: any) => Number(e.id) === Number(ep1.id)),
      "أ٢. والقائمةُ تحمل جهازَها الحقيقيّ لا قائمةً فارغة", JSON.stringify(devB.body));
    const finB = await http("GET", `/api/patients/${p1.id}/financial-summary`, S.baghdad);
    eq(finB.status, 200, "أ٣. **والملخّصُ الماليّ** بالقاعدة التي تفتح الملفَّ نفسَه");
    eq((await http("GET", `/api/patients/${p1.id}/device-episodes`, S.karbala)).status, 403,
      "أ٤. **وكربلاء لا تصل الملفّ** — أجهزتُه محجوبةٌ عنها كما كانت");
    eq((await http("GET", `/api/patients/${p1.id}/financial-summary`, S.karbala)).status, 403,
      "أ٥. وملخّصُه الماليّ كذلك");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. «إرسال لمراجعة الطبيب» — شكوى المالك بعينها ──");
    // ══════════════════════════════════════════════════════════════════
    const sendBody = (pid: number) => ({
      patientId: pid, serviceType: "prosthetic", requestedPath: "full", reviewKind: "new_device",
    });
    const k0 = await writes(p1.id);
    const sendC = await http("POST", "/api/medical-review/requests", S.karbala, sendBody(p1.id));
    eq([sendC.status, msg(sendC)], [403, DENIED], "ب١. كربلاء تُردّ بالرسالة نفسِها — الحدُّ باقٍ");
    eq(await writes(p1.id), k0, "ب٢. **وبلا كتابة**");
    const sendB = await http("POST", "/api/medical-review/requests", S.baghdad, sendBody(p1.id));
    eq(sendB.status, 201, "ب٣. **استقبالُ بغداد يُرسل** — كان ٤٠٣ «غير مصرح لك بهذا الفرع»");
    eq(Number(sendB.body?.branchId), BAGHDAD,
      "ب٤. **والطلبُ في بغداد** — حيث وقع، لا في فرع التسجيل");
    const p6 = await mkPatient("فرع التسجيل", false);
    const sendA = await http("POST", "/api/medical-review/requests", S.dhiqar, sendBody(p6.id));
    eq([sendA.status, Number(sendA.body?.branchId)], [201, DHIQAR],
      "ب٥. وفرعُ التسجيل على مريضه كما كان بحرفه");
    const sendB6 = await http("POST", "/api/medical-review/requests", S.baghdad, sendBody(p6.id));
    eq([sendB6.status, msg(sendB6)], [403, DENIED],
      "ب٦. **ومريضٌ لم يُتَح لبغداد يبقى محجوباً عنها** — الإصلاحُ الإتاحةُ لا الانفتاح");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. «طلب جهاز» على مسار المعاينة — بلا نصفِ كتابة ──");
    // ══════════════════════════════════════════════════════════════════
    const p2 = await mkPatient("طلب جهاز", true);
    const devBody = { serviceType: "prosthetic", requestedItem: "full_device", servicePath: "exam" };
    const c0 = await writes(p2.id);
    const devC = await http("POST", `/api/patients/${p2.id}/device-episodes`, S.karbala, devBody);
    eq(devC.status, 403, "ج١. كربلاء لا تفتح طلبَ جهاز");
    eq(await writes(p2.id), c0, "ج٢. وبلا حلقةٍ ولا طلب");
    const devOpen = await http("POST", `/api/patients/${p2.id}/device-episodes`, S.baghdad, devBody);
    eq(devOpen.status, 201,
      "ج٣. **بغداد تفتح طلبَ الجهاز** — كان ٥٠٠ «تعذّر بدء الجهاز» بعد أن فُتحت الحلقة");
    //  صفرٌ لا `NaN` حين يُردّ الفتح — فتسقط البنودُ التالية ببندها لا بانهيار الحزمة.
    const epB = Number(devOpen.body?.id ?? 0);
    eq(await writes(p2.id), { ...c0, requests: c0.requests + 1, episodes: c0.episodes + 1 },
      "ج٤. حلقةٌ واحدة وطلبٌ واحد — **لا نصفَ كتابة**");
    const [epRow] = await q(`SELECT branch_id FROM patient_device_episodes WHERE id=$1`, [epB]);
    const [epReq] = await q(`SELECT branch_id FROM medical_review_requests WHERE device_episode_id=$1`, [epB]);
    eq([Number(epRow?.branch_id), Number(epReq?.branch_id)], [BAGHDAD, BAGHDAD],
      "ج٥. **والحلقةُ وطلبُها في بغداد معاً** — فيقعان في طوابيرٍ واحدة");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. «إضافة نوع حالة» — الحالةُ الجديدة وطلبُها في فرع الحركة ──");
    // ══════════════════════════════════════════════════════════════════
    const p3 = await mkPatient("إضافة نوع", true);
    const d0 = await writes(p3.id);
    const addC = await http("POST", `/api/patients/${p3.id}/add-case-type`, S.karbala,
      { caseType: "medical_support" });
    eq(addC.status, 403, "د١. كربلاء تُردّ");
    eq(await writes(p3.id), d0, "د٢. وبلا حالةٍ ولا زيارةٍ ولا طلب");
    const addB = await http("POST", `/api/patients/${p3.id}/add-case-type`, S.baghdad,
      { caseType: "medical_support" });
    eq(addB.status, 200,
      "د٣. **بغداد تضيف نوعَ الحالة** — كان ٥٠٠ «غير مصرح لك بهذا الفرع» بعد أن أُضيفت الحالة");
    ok(Boolean(addB.body?.reviewRequestId), "د٤. ومعها طلبُ المعاينة", JSON.stringify(addB.body));
    const [newCase] = await q(`SELECT id, branch_id FROM patient_cases
                                WHERE patient_id=$1 AND case_type='medical_support'`, [p3.id]);
    const [marker] = await q(`SELECT branch_id FROM visits WHERE patient_id=$1 AND case_id=$2
                                AND details='إضافة نوع حالة'`, [p3.id, newCase?.id ?? 0]);
    const [addReq] = await q(`SELECT branch_id FROM medical_review_requests
                               WHERE patient_id=$1 AND service_type='medical_support'`, [p3.id]);
    eq([Number(newCase?.branch_id), Number(marker?.branch_id), Number(addReq?.branch_id)],
      [BAGHDAD, BAGHDAD, BAGHDAD],
      "د٥. **الحالةُ الجديدة وعلامتُها وطلبُها في بغداد** — فيراها طبيبُ الفرع الذي فيه المريضة");
    const [oldCase] = await q(`SELECT branch_id FROM patient_cases WHERE id=$1`, [p3.caseId]);
    eq(Number(oldCase?.branch_id), DHIQAR, "د٦. والحالةُ القائمة لا يتحرّك فرعُها");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. «تسجيل زيارة» لجهاز — ردٌّ لا تعليق ──");
    // ══════════════════════════════════════════════════════════════════
    const p4 = await mkPatient("زيارة", true);
    const visitBody = (branchId: number) => ({
      patientId: p4.id, branchId, notes: "متابعة", caseId: p4.caseId,
      reviewPath: "full", reviewKind: "adjustment",
    });
    const e0 = await writes(p4.id);
    const visC = await http("POST", "/api/visits", S.karbala, visitBody(KARBALA));
    ok(visC.status >= 400, "هـ١. كربلاء لا تسجّل زيارةً على ملفٍّ لا تصله", `status ${visC.status}`);
    eq(await writes(p4.id), e0, "هـ٢. وبلا زيارةٍ ولا طلب");
    const visB = await http("POST", "/api/visits", S.baghdad, visitBody(BAGHDAD));
    eq(visB.status, 201, "هـ٣. **بغداد تسجّل الزيارة ويعود الردّ** — كان الطلبُ يبقى بلا ردّ");
    const [visReq] = await q(`SELECT branch_id FROM medical_review_requests WHERE visit_id=$1`,
      [Number(visB.body?.id ?? 0)]);
    eq([Number(visB.body?.branchId), Number(visReq?.branch_id)], [BAGHDAD, BAGHDAD],
      "هـ٤. الزيارةُ وطلبُ مراجعتها في بغداد");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── و. إلغاءُ طلب الجهاز — مَن فتحه يُلغيه ──");
    // ══════════════════════════════════════════════════════════════════
    const cancelC = await http("POST", `/api/patients/${p2.id}/device-episodes/${epB}/cancel`,
      S.karbala, { reason: "بالخطأ" });
    eq(cancelC.status, 403, "و١. كربلاء لا تلغي");
    const cancelB = await http("POST", `/api/patients/${p2.id}/device-episodes/${epB}/cancel`,
      S.baghdad, { reason: "فُتح بالخطأ" });
    eq(cancelB.status, 200, "و٢. **بغداد تلغي طلبَ الجهاز الذي فتحته** — كان ٤٠٣");
    const [epAfter] = await q(`SELECT status FROM patient_device_episodes WHERE id=$1`, [epB]);
    eq(epAfter?.status, "cancelled", "و٣. والحلقةُ ملغاةٌ فعلاً");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز. «عاد للشراء» — الطلبُ يتبع عمليتَه ──");
    // ══════════════════════════════════════════════════════════════════
    const p5 = await mkPatient("عاد للشراء", true);
    const mkClosed = async (seq: number, branch: number) => {
      const [e] = await q<{ id: number }>(
        `INSERT INTO patient_device_episodes (patient_id, case_id, sequence_number, status,
           service_path, branch_id)
         VALUES ($1,$2,$3,'examined','exam',$4) RETURNING id`, [p5.id, p5.caseId, seq, branch]);
      await q(`INSERT INTO post_exam_followups (patient_id, service_type, status, device_episode_id,
                 branch_id, closed_at)
               VALUES ($1,'prosthetic','closed_without_purchase',$2,$3,NOW())`, [p5.id, e.id, branch]);
      return Number(e.id);
    };
    const epInBaghdad = await mkClosed(1, BAGHDAD);
    const epInDhiqar = await mkClosed(2, DHIQAR);
    const rtpB = await http("POST", "/api/followups/return-to-purchase", S.baghdad,
      { patientId: p5.id, deviceEpisodeId: epInBaghdad });
    eq(rtpB.status, 201, "ز١. **بغداد تُعيد جهازَها إلى الشراء** — كان ٤٠٣ من النواة نفسِها");
    const [rtpReqB] = await q(`SELECT branch_id FROM medical_review_requests WHERE id=$1`,
      [Number(rtpB.body?.reviewRequestId ?? 0)]);
    eq(Number(rtpReqB?.branch_id), BAGHDAD, "ز٢. وطلبُه في بغداد مع حلقته");
    const rtpBonA = await http("POST", "/api/followups/return-to-purchase", S.baghdad,
      { patientId: p5.id, deviceEpisodeId: epInDhiqar });
    eq(rtpBonA.status, 403,
      "ز٣. **وعمليةُ ذي قار تبقى لذي قار** — الإتاحةُ لا تنقل قرارَ عمليةِ فرعٍ آخر");
    const rtpM = await http("POST", "/api/followups/return-to-purchase", S.both,
      { patientId: p5.id, deviceEpisodeId: epInDhiqar });
    eq(rtpM.status, 201, "ز٤. ومديرٌ يصل الفرعين يُعيدها");
    const [rtpReqM] = await q(`SELECT branch_id FROM medical_review_requests WHERE id=$1`,
      [Number(rtpM.body?.reviewRequestId ?? 0)]);
    eq(Number(rtpReqM?.branch_id), DHIQAR,
      "ز٥. **وطلبُها في ذي قار مع حلقتها** — لا في فرع جلسته (بغداد)");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح. حارسٌ معماريّ: لا قياسَ بفرع التسجيل وحده في هذه الأبواب ──");
    // ══════════════════════════════════════════════════════════════════
    const strip = (src: string) => src.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const review = strip(readFileSync("server/medical_review/store.ts", "utf8"));
    ok(!/branchIds\.includes\(\s*Number\(\s*patient\.branch_id\s*\)\s*\)/.test(review),
      "ح١. نواةُ طلب المراجعة لا تقيس بفرع التسجيل");
    ok(/scopeReachesPatient\(\s*branchIds\s*,\s*patientRef\s*,\s*tx\s*\)/.test(review),
      "ح٢. وتقيس بالقاعدة التي تفتح الملفّ نفسَه");
    ok(!/VALUES\s*\([^)]*patient\.branch_id/.test(review),
      "ح٣. ولا تكتب فرعَ التسجيل فرعاً للطلب");
    const episodes = strip(readFileSync("server/device_episodes/routes.ts", "utf8"));
    ok(!/canReachBranch/.test(episodes), "ح٤. ولا مساعِدَ بفرع التسجيل في أبواب الحلقات");
    const routes = strip(readFileSync("server/routes.ts", "utf8"));
    ok(!/patient\.branchId\s*!==\s*branchSession\.branchId/.test(routes),
      "ح٥. ولا مقارنةَ بفرع التسجيل في الملخّص الماليّ");
  } finally {
    await new Promise((r) => srv.close(() => r(null)));
    await cleanup();
  }

  console.log(`\nنجح ${pass} · فشل ${fail}`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
