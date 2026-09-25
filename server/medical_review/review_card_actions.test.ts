//  **بطاقةُ فرعٍ آخر تُقرأ ولا يُؤشَّر عليها** (قرارُ المالك ٢٠٢٦-٠٩-٢٥).
//
//  «فيجب ان ترى الفروع المشتركة لمريض واحد ترى كل شيء يحدث لهذا المريض سواء
//  بفرعهم ام بغيره ليعلموا مافعل اما القرارات فبالتاكيد تحصر لصاحب الفرع هو
//  من يقرر»
//
//  صفحةُ «مراجعة حركة مرضى الأطراف والمساند» تعرض لكلّ فرعٍ يصل ملفَّ المريض
//  حركاتِه كلَّها (§4.t، ٢٠٢٦-٠٩-٢٢). والتأشيرُ على الحركة لفرعها وحده —
//  يفرضه الخادمُ منذ نشأته. **والعطبُ في الشاشة**: كانت تُظهر أزرارَ التأشير
//  بقدرة المستخدم العامّة (`canSupervise`) لا بفرع البطاقة، فيضغط مديرُ بغداد
//  «تمت المراجعة» على بطاقة ذي قار فيُردّ «غير مصرح لك بهذا الفرع».
//
//  أ. ما يفعله الخادمُ ولا يتغيّر: البطاقةُ تُقرأ، والتأشيرُ من غير فرعها يُردّ
//     بلا كتابة.
//  ب. **والخادمُ يقول لكلّ صفٍّ أفرعُه في نطاق المشاهد** (`branchInScope`).
//  ج. **والعلَمُ هو حكمُ الخادم نفسُه**: حيث يقول «لا» يُردّ الضغط، وحيث يقول
//     «نعم» يمضي.
//  د. والعزلُ لم يتغيّر: فرعٌ بلا إتاحةٍ لا يرى شيئاً.
//
//  حيٌّ على Postgres وعلى النقاط الحقيقية عبر Express حقيقيّ.
//  التشغيل: `DATABASE_URL=… npm run test:review-card-actions`
import { pool } from "../db";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../routes";
import { storage } from "../storage";

const PORT = 6301 + (Date.now() % 7);
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-بطاقة-فرع-آخر";

//  ذي قار = فرعُ التسجيل · بغداد = فرعٌ مُتاح · كربلاء = فرعٌ بلا إتاحة.
const DHIQAR = 94, BAGHDAD = 95, KARBALA = 96;
const DQ_MGR = 9941, BG_MGR = 9942, ADMIN = 9943, MGR_BOTH = 9944, BG_DOC = 9945,
  KR_MGR = 9947;
const USERS = [DQ_MGR, BG_MGR, ADMIN, MGR_BOTH, BG_DOC, KR_MGR];

const S = {
  dqMgr: { userId: DQ_MGR, role: "branch_manager", isAdmin: false, branchId: DHIQAR,
    accessibleBranches: [DHIQAR], displayName: "مدير ذي قار", permissions: {} },
  bgMgr: { userId: BG_MGR, role: "branch_manager", isAdmin: false, branchId: BAGHDAD,
    accessibleBranches: [BAGHDAD], displayName: "مدير بغداد", permissions: {} },
  krMgr: { userId: KR_MGR, role: "branch_manager", isAdmin: false, branchId: KARBALA,
    accessibleBranches: [KARBALA], displayName: "مدير كربلاء", permissions: {} },
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 0,
    accessibleBranches: [], displayName: "المسؤول", permissions: {} },
  //  مديرٌ يعمل في الفرعين — جلستُه على بغداد ونطاقُه يشمل ذي قار.
  mgrBoth: { userId: MGR_BOTH, role: "branch_manager", isAdmin: false, branchId: BAGHDAD,
    accessibleBranches: [BAGHDAD, DHIQAR], displayName: "مدير الفرعين", permissions: {} },
  //  طبيبُ بغداد — يملك الإشرافَ والقرارَ السريريّ معاً.
  bgDoc: { userId: BG_DOC, role: "doctor", isAdmin: false, branchId: BAGHDAD,
    accessibleBranches: [BAGHDAD], displayName: "طبيب بغداد",
    permissions: { canWriteMedicalExam: true } },
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
const BRANCH_REFUSAL = "غير مصرح لك بهذا الفرع";

let seq = 0;
const phone = () => `0781${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

/** مريضٌ في فرعٍ بعينه — صفٌّ مباشر كاختبار §4.t؛ المسارُ المقيس هو الطابور. */
async function patientIn(branchId: number): Promise<number> {
  const [r] = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, branch_id, is_amputee, is_medical_support,
                           referral_source, age, medical_condition)
     VALUES ($1, $2, $3, true, true, $4, 40, 'بتر') RETURNING id`,
    [`${MARK} ${++seq}`, phone(), branchId, MARK]);
  return Number(r.id);
}

/** طلبُ مراجعةٍ سريع معلَّق — بطاقةٌ في الطابور، في فرعٍ بعينه. */
async function quickRequest(patientId: number, branchId: number, serviceType: string): Promise<number> {
  const [r] = await q<{ id: number }>(
    `INSERT INTO medical_review_requests
       (patient_id, service_type, branch_id, requested_path, review_kind, status, reception_note)
     VALUES ($1, $2, $3, 'quick', 'maintenance', 'pending', $4) RETURNING id`,
    [patientId, serviceType, branchId, MARK]);
  return Number(r.id);
}

type Queue = { rows: any[]; canSupervise: boolean; canDecide: boolean };
async function queue(session: any): Promise<Queue> {
  const r = await http("GET", "/api/medical-review/queue?window=all", session);
  if (r.status !== 200) throw new Error(`تعذّر الطابور: ${r.status} ${msg(r)}`);
  return r.body as Queue;
}
const rowOf = (qu: Queue, id: number) => qu.rows.find((x: any) => Number(x.id) === id);

const decide = (id: number, session: any, decision: string, doctorNote?: string) =>
  http("POST", `/api/medical-review/requests/${id}/decide`, session, { decision, doctorNote });

async function state(id: number) {
  const [r] = await q(`SELECT status, decision, decided_by FROM medical_review_requests WHERE id = $1`, [id]);
  const [a] = await q<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM audit_log
      WHERE entity_type = 'medical_review_request' AND entity_id = $1`, [id]);
  return { ...r, audits: Number(a.n) };
}

async function cleanup() {
  const pts = await q<{ id: number }>(`SELECT id FROM patients WHERE referral_source = $1`, [MARK]);
  for (const p of pts) await storage.deletePatient(Number(p.id));
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
}

process.on("unhandledRejection", (e: any) => {
  console.error("  [رفضٌ غيرُ ملتقَط]", e?.message ?? e);
});

async function main() {
  await q(`INSERT INTO branches (id, name) VALUES ($1,'ذي قار-م'),($2,'بغداد-م'),($3,'كربلاء-م')
           ON CONFLICT (id) DO NOTHING`, [DHIQAR, BAGHDAD, KARBALA]);
  await cleanup();
  const SPEC = JSON.stringify(["prosthetic", "medical_support"]);
  for (const [id, role, br, ids, name, exam] of [
    [DQ_MGR, "branch_manager", DHIQAR, [DHIQAR], "مدير ذي قار", false],
    [BG_MGR, "branch_manager", BAGHDAD, [BAGHDAD], "مدير بغداد", false],
    [KR_MGR, "branch_manager", KARBALA, [KARBALA], "مدير كربلاء", false],
    [ADMIN, "admin", null, [], "المسؤول", false],
    [MGR_BOTH, "branch_manager", BAGHDAD, [BAGHDAD, DHIQAR], "مدير الفرعين", false],
    [BG_DOC, "doctor", BAGHDAD, [BAGHDAD], "طبيب بغداد", true],
  ] as any[]) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id,
               branch_ids, is_active, can_view_patients, can_write_medical_exam, medical_specialties)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,true,$7,$8::jsonb)`,
      [id, `rca_${id}`, name, role, br, JSON.stringify(ids), exam, exam ? SPEC : "[]"]);
  }

  const srv = await bootRealRoutes();
  try {
    //  مريضٌ سُجّل في ذي قار وأُتيح لبغداد بالباب الحقيقيّ، وحركتان عليه:
    //  واحدةٌ وقعت في ذي قار وأخرى في بغداد. ومريضٌ في كربلاء بلا إتاحة.
    const p = await patientIn(DHIQAR);
    const g = await http("POST", `/api/patients/${p}/branch-access`, S.admin, { branchId: BAGHDAD });
    if (g.status !== 201) throw new Error(`تعذّرت الإتاحة: ${g.status} ${msg(g)}`);
    const rDQ = await quickRequest(p, DHIQAR, "prosthetic");
    const rBG = await quickRequest(p, BAGHDAD, "medical_support");
    const z = await patientIn(KARBALA);
    const rKR = await quickRequest(z, KARBALA, "prosthetic");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ. ما يفعله الخادمُ ولا يتغيّر ──");
    // ══════════════════════════════════════════════════════════════════
    const qBG = await queue(S.bgMgr);
    const cardDQ = rowOf(qBG, rDQ);
    ok(!!cardDQ, "أ١. مديرُ بغداد يرى بطاقةَ ذي قار — للعلم، بقرار المالك (٢٢/٩)");
    eq(cardDQ?.branchName, "ذي قار-م", "أ٢. والبطاقةُ تسمّي فرعَها");
    eq(qBG.canSupervise, true,
      "أ٣. و`canSupervise` قدرةُ المستخدم العامّة — لا تقول شيئاً عن فرع البطاقة");
    const before = await state(rDQ);
    const a4 = await decide(rDQ, S.bgMgr, "approve");
    eq([a4.status, msg(a4)], [403, BRANCH_REFUSAL], "أ٤. «تمت المراجعة» من بغداد على بطاقة ذي قار تُردّ");
    const a5 = await decide(rDQ, S.bgMgr, "return_to_reception", "سبب");
    eq([a5.status, msg(a5)], [403, BRANCH_REFUSAL], "أ٥. و«إرجاع للاستعلامات» كذلك");
    const a6 = await decide(rDQ, S.bgDoc, "require_full_exam");
    eq([a6.status, msg(a6)], [403, BRANCH_REFUSAL], "أ٦. و«يتطلّب معاينة كاملة» من طبيب بغداد كذلك");
    eq(await state(rDQ), before, "أ٧. وصفرُ كتابة: الطلبُ معلَّقٌ بلا قرارٍ ولا سطرِ تدقيق");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. الخادمُ يقول لكلّ صفٍّ: أفرعُه في نطاقك؟ ──");
    // ══════════════════════════════════════════════════════════════════
    const flags = async (session: any) => {
      const qu = await queue(session);
      return {
        dq: rowOf(qu, rDQ)?.branchInScope, bg: rowOf(qu, rBG)?.branchInScope,
        kr: rowOf(qu, rKR)?.branchInScope,
      };
    };
    eq(await flags(S.bgMgr), { dq: false, bg: true, kr: undefined },
      "ب١. مديرُ بغداد: بطاقةُ ذي قار للعلم، وبطاقةُ بغداد له");
    eq(await flags(S.dqMgr), { dq: true, bg: false, kr: undefined },
      "ب٢. ومديرُ ذي قار بالعكس — العلَمُ يتبع فرعَ الطلب لا فرعَ تسجيل المريض");
    eq(await flags(S.admin), { dq: true, bg: true, kr: true },
      "ب٣. والمسؤولُ له الكلّ");
    eq(await flags(S.mgrBoth), { dq: true, bg: true, kr: undefined },
      "ب٤. ومديرٌ يشمل نطاقُه الفرعين له الاثنان");
    eq(await flags(S.bgDoc), { dq: false, bg: true, kr: undefined },
      "ب٥. وطبيبُ بغداد كمديرها");
    eq(await flags(S.krMgr), { dq: undefined, bg: undefined, kr: true },
      "ب٦. ومديرُ كربلاء يرى حركةَ فرعه وحدها");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. والعلَمُ هو حكمُ الخادم نفسُه ──");
    // ══════════════════════════════════════════════════════════════════
    //  حيث يقول «لا» يُردّ الضغطُ بالفرع؛ وحيث يقول «نعم» يمضي.
    const c1 = await decide(rBG, S.dqMgr, "approve");
    eq([c1.status, msg(c1)], [403, BRANCH_REFUSAL],
      "ج١. مديرُ ذي قار على بطاقة بغداد — العلَمُ «لا» والخادمُ يردّ");
    const c2 = await decide(rBG, S.bgMgr, "approve");
    eq(c2.status, 200, "ج٢. ومديرُ بغداد على بطاقة بغداد — العلَمُ «نعم» والخادمُ يقبل");
    const c3 = await decide(rDQ, S.dqMgr, "approve");
    eq(c3.status, 200, "ج٣. ومديرُ ذي قار على بطاقة ذي قار كذلك");
    const c4 = await decide(rKR, S.admin, "approve");
    eq(c4.status, 200, "ج٤. والمسؤولُ على أيّ بطاقة");
    const after = await queue(S.bgMgr);
    ok(!rowOf(after, rDQ) && !rowOf(after, rBG),
      "ج٥. وما أُشِّر عليه يخرج من الطابور عند الجميع — ولذلك لا يؤشّر إلّا صاحبُه");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. والعزلُ لم يتغيّر ──");
    // ══════════════════════════════════════════════════════════════════
    const rKR2 = await quickRequest(z, KARBALA, "medical_support");
    ok(!rowOf(await queue(S.bgMgr), rKR2), "د١. مريضُ كربلاء بلا إتاحة لا يراه مديرُ بغداد");
    const d2 = await decide(rKR2, S.bgMgr, "approve");
    eq([d2.status, msg(d2)], [403, BRANCH_REFUSAL], "د٢. ولا يؤشّر عليه بنداءٍ مباشر");
  } finally {
    await cleanup();
    await new Promise((r) => srv.close(() => r(null)));
  }

  console.log(`\nنجح ${pass} · أخفق ${fail}`);
  await pool.end();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); } catch { /* ignore */ }
  process.exit(1);
});
