// اختبارُ طابور «بانتظار الحسم / تم الحسم» — حيّاً على Postgres وعلى النقاط
// الحقيقية. قاعدة محلّية: `npm run test:decision-queue`.
//
// ══ الثابتُ الذي يحرسه ═══════════════════════════════════════════════════
// هذا الملفُّ **قراءةٌ فقط فوق حقائق قائمة**: لا حقيقةَ ماليةً جديدة، ولا
// كتابةَ من `GET /api/followups/decision-queue`/`/count`. الكتابةُ الفعلية
// (`/complete-sale`, `/not-bought`) مُختبَرةٌ بتفصيلٍ في
// `server/reception_sale.test.ts` — هذا الملفُّ يثبت **الطابورَ نفسَه**:
// عضويّةَ التبويبين من الحالة الحيّة، النطاقَ، التصنيفَ، ملاحظةَ الطبيب،
// هويّةَ الحاسم ولقطةَ دوره، وإعادةَ الفتح والحسم من فاعلٍ آخر.

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

const PORT = 6910;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-طابور-الحسم";
const ADMIN = 9941, MANAGER = 9942, DOC = 9943, RECV = 9944, ACCT = 9945;
const EXPERT = 9946, EXPERT_B2 = 9947;

const S: Record<string, any> = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  manager: {
    userId: MANAGER, role: "branch_manager", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "مدير الفرع",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  doc: {
    //  فروعٌ مزدوجة عمداً (خلافاً لـ`reception_sale.test.ts`): قسمُ نطاق
    //  الفرع هنا يحتاج مريضاً على الفرع الآخر، والمعاينةُ تشترط وصول الطبيب
    //  إلى فرع المريض (`canReachBranch`) بصرف النظر عن مسار البيع.
    userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1, 2],
    displayName: "سعد",
    permissions: { canViewPatients: true, canAddPatients: true, canWriteMedicalExam: true },
  },
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "ريام",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  acct: {
    userId: ACCT, role: "accountant", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "المحاسب",
    permissions: { canViewPatients: true },
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

async function mkPatient(label: string, branchId = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id, is_amputee, is_medical_support,
       total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر','احادي - طرف سفلي - يمين - تحت الركبة',
             $3,true,false,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, branchId]);
  return r[0].id;
}
async function mkCase(patientId: number, branchId = 1, caseType = "prosthetic") {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$2,$3,0,'manual','active') RETURNING id`, [patientId, branchId, caseType]);
  return r[0].id;
}
const signExam = (
  patientId: number,
  opts: { session?: any; caseType?: string; notes?: string } = {},
) =>
  http("POST", `/api/medical/patients/${patientId}/exams`, opts.session ?? S.doc, {
    caseType: opts.caseType ?? "prosthetic", diagnosis: "تشخيصٌ سريريّ", plan: "خطّة",
    notes: opts.notes,
  });

async function followupOf(patientId: number): Promise<number> {
  const [r] = await q(`SELECT id FROM post_exam_followups WHERE patient_id=$1
                        ORDER BY id DESC LIMIT 1`, [patientId]);
  return Number(r?.id ?? 0);
}

/** مريضٌ + حالة + طلبُ جهازٍ على مسار المعاينة + معاينةٌ موقّعة = متابعةٌ جاهزة. */
async function readySale(label: string, opts: { notes?: string; branchId?: number } = {}) {
  const branchId = opts.branchId ?? 1;
  const pid = await mkPatient(label, branchId);
  await mkCase(pid, branchId);
  const ep = await http("POST", `/api/patients/${pid}/device-episodes`,
    branchId === 1 ? S.recv : S.admin,
    { serviceType: "prosthetic", requestedItem: "full_device", servicePath: "exam" });
  if (ep.status !== 201) throw new Error(`startEpisode failed: ${JSON.stringify(ep.body)}`);
  const ex = await signExam(pid, { notes: opts.notes });
  if (ex.status >= 300) throw new Error(`signExam failed: ${JSON.stringify(ex.body)}`);
  return { pid, fid: await followupOf(pid) };
}

/** صفٌّ **موروث** — حلقةٌ بلا `service_path` (`NULL`). لا يظهر في هذا الطابور أبداً. */
async function legacyFollowup(label: string): Promise<{ pid: number; fid: number }> {
  const pid = await mkPatient(label);
  const cid = await mkCase(pid);
  await q(`INSERT INTO patient_device_episodes (patient_id, case_id, branch_id,
             sequence_number, status, agreed_cost, requested_item, created_by)
           VALUES ($1,$2,1,1,'awaiting_exam',0,'full_device',$3)`, [pid, cid, MANAGER]);
  await signExam(pid);
  const fid = await followupOf(pid);
  return { pid, fid };
}

async function waiting(session: any, extra = "") {
  return http("GET", `/api/followups/decision-queue?state=waiting${extra}`, session);
}
async function resolved(session: any, extra = "") {
  return http("GET", `/api/followups/decision-queue?state=resolved${extra}`, session);
}
async function countOf(session: any) {
  return http("GET", "/api/followups/decision-queue/count", session);
}
function idsOf(body: any): number[] {
  return (body?.rows ?? []).map((r: any) => Number(r.followupId));
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_cancellations WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE entry_id IN (
             SELECT id FROM journal_entries WHERE created_by = ANY(ARRAY[${ADMIN},${MANAGER},${DOC},${RECV},${ACCT},${EXPERT},${EXPERT_B2}]))`);
  await q(`DELETE FROM journal_entries WHERE created_by = ANY(ARRAY[${ADMIN},${MANAGER},${DOC},${RECV},${ACCT},${EXPERT},${EXPERT_B2}])`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM patient_code_aliases a
            WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO branches (id,name) VALUES (2,'فرعٌ آخر') ON CONFLICT DO NOTHING`);
  for (const [id, role, branchId, branchIds, name] of [
    [ADMIN, "admin", 1, "[1,2]", "المسؤول"],
    [MANAGER, "branch_manager", 1, "[1]", "مدير الفرع"],
    [DOC, "doctor", 1, "[1]", "سعد"],
    [RECV, "reception", 1, "[1]", "ريام"],
    [ACCT, "accountant", 1, "[1]", "المحاسب"],
    [EXPERT, "prosthetics_expert", 1, "[1]", "الخبير الأول"],
    [EXPERT_B2, "prosthetics_expert", 2, "[2]", "خبيرُ الفرع الآخر"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,
               branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$4,$3,$5,$6::jsonb,true,
               ${role === "doctor" ? `'["prosthetic","medical_support"]'::jsonb` : "'null'::jsonb"})
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id,
               branch_ids=EXCLUDED.branch_ids, display_name=EXCLUDED.display_name, is_active=true`,
      [id, `dq_u${id}`, role, name, branchId, branchIds]);
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
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") { skipped++; return app; }
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));

  try {
    check(skipped === 1, "جدول النقاط الحقيقي مُركَّب", String(skipped));

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ. الصلاحيات ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const { fid } = await readySale("صلاحيات-١");
      for (const [who, sess] of [["الاستقبال", S.recv], ["المحاسب", S.acct],
        ["مديرُ الفرع", S.manager], ["المسؤول", S.admin]] as any[]) {
        const r = await waiting(sess);
        check(r.status === 200 && idsOf(r.body).includes(fid),
          `١. ${who}: يقرأ طابورَ «بانتظار الحسم»`, JSON.stringify(r.body));
        const c = await countOf(sess);
        check(c.status === 200 && typeof c.body?.count === "number",
          `   ${who}: يقرأ الشارة`, JSON.stringify(c.body));
      }
      const rDoc = await waiting(S.doc);
      same("٢. **والطبيبُ يُردّ ٤٠٣ عن الطابور** — لا سلطةَ تجاريةً له",
        rDoc.status, 403);
      const cDoc = await countOf(S.doc);
      same("   والشارةُ صفرٌ صامت للطبيب — لا خطأ", [cDoc.status, cDoc.body?.count], [200, 0]);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. عضويّةُ «بانتظار الحسم» ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const { fid: examFid } = await readySale("مسارُ-معاينة");
      const { fid: legacyFid } = await legacyFollowup("موروثٌ-بلا-مسار");
      const r = await waiting(S.admin);
      check(idsOf(r.body).includes(examFid),
        "٣. **صفُّ مسارِ المعاينة يظهر في «بانتظار الحسم»**");
      check(!idsOf(r.body).includes(legacyFid),
        "٤. **والصفُّ الموروث (بلا `service_path`) لا يظهر أبداً** — رغم أنه حيٌّ فعلاً",
        JSON.stringify(idsOf(r.body)));
    }
    {
      //  حالةٌ وسيطة قديمة كانت تُحبَس قبل إصلاح `CONFIRMABLE`.
      const { fid } = await readySale("حالةٌ-وسيطة-قديمة");
      await q(`UPDATE post_exam_followups SET status='price_approval_pending' WHERE id=$1`, [fid]);
      const r = await waiting(S.admin);
      check(idsOf(r.body).includes(fid),
        "٥. **وحالة `price_approval_pending` الوسيطة تظهر أيضاً** (إصلاحُ `CONFIRMABLE`)");
      const cs = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 500_000, discountAmount: 0, expertUserId: EXPERT });
      same("   **ويمكن حسمُها فعلاً عبر `/complete-sale`** — لا تبقى محبوسة",
        [cs.status, cs.body?.converted], [200, true]);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. ملاحظةُ الطبيب — الهويّةُ الدقيقة ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const { fid: withNote } = await readySale("بملاحظة", { notes: "المريض يفضّل الدفع نقداً" });
      const { fid: withoutNote } = await readySale("بلا-ملاحظة");
      const r = await waiting(S.admin);
      const rows = r.body?.rows ?? [];
      const a = rows.find((x: any) => x.followupId === withNote);
      const b = rows.find((x: any) => x.followupId === withoutNote);
      same("٦. **ملاحظةُ الطبيب تصل حرفياً لمتابعتها بعينها**",
        a?.examNotes, "المريض يفضّل الدفع نقداً");
      check(!b?.examNotes, "٧. **وتغيب (فارغة/`null`) حين لم يكتبها الطبيب**",
        JSON.stringify(b?.examNotes));
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. نطاقُ الفرع ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const { fid: b1 } = await readySale("فرع-١", { branchId: 1 });
      const { fid: b2 } = await readySale("فرع-٢", { branchId: 2 });

      const rManager = await waiting(S.manager);
      check(idsOf(rManager.body).includes(b1) && !idsOf(rManager.body).includes(b2),
        "٨. **مديرُ فرعٍ يرى فرعه وحده**", JSON.stringify(idsOf(rManager.body)));

      const rOutOfScope = await waiting(S.manager, "&branchId=2");
      same("٩. **وفلترةٌ صريحة بفرعٍ خارج نطاقه ⟶ ٤٠٣ لا توسيعاً صامتاً**",
        rOutOfScope.status, 403);

      const rAdmin = await waiting(S.admin);
      check(idsOf(rAdmin.body).includes(b1) && idsOf(rAdmin.body).includes(b2),
        "١٠. **والمسؤولُ يرى الفرعين معاً**");

      const rAdminFiltered = await waiting(S.admin, "&branchId=1");
      check(idsOf(rAdminFiltered.body).includes(b1) && !idsOf(rAdminFiltered.body).includes(b2),
        "١١. **ومسؤولٌ يفلتر بفرعٍ واحد يرى ذلك الفرع وحده في الصفحة**");

      const cAdmin = await countOf(S.admin);
      const cManager = await countOf(S.manager);
      check((cAdmin.body?.count ?? 0) >= (cManager.body?.count ?? 0) + 1,
        "١٢. **وشارةُ المسؤول تبقى كلَّ الفروع** — لا تتأثّر بفلترة الصفحة المحلّية",
        JSON.stringify([cAdmin.body, cManager.body]));
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. عضويّةُ «تم الحسم» والفرزُ ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const { fid: boughtFid } = await readySale("تم-الشراء");
      const csR = await http("POST", `/api/followups/${boughtFid}/complete-sale`, S.recv,
        { originalPrice: 900_000, discountAmount: 100_000, expertUserId: EXPERT });
      same("١٣. الإعدادُ: تمّ البيع", csR.status, 200);

      const { fid: notBoughtFid } = await readySale("لم-يشترِ");
      const nbR = await http("POST", `/api/followups/${notBoughtFid}/not-bought`, S.acct,
        { reason: "غالٍ جداً بالنسبة له" });
      same("١٤. الإعدادُ: سُجِّل عدم الشراء", nbR.status, 200);

      const rW = await waiting(S.admin);
      check(!idsOf(rW.body).includes(boughtFid) && !idsOf(rW.body).includes(notBoughtFid),
        "١٥. **الصفّان يختفيان من «بانتظار الحسم» تلقائياً** — لا زرَّ «تحديد كمحسوم»");

      const rR = await resolved(S.admin);
      const rows = rR.body?.rows ?? [];
      const bought = rows.find((x: any) => x.followupId === boughtFid);
      const notBought = rows.find((x: any) => x.followupId === notBoughtFid);
      same("١٦. **والمُشترى يظهر في «تم الحسم» بنتيجة bought**", bought?.result, "bought");
      same("١٧. **وغيرُ المُشترى بنتيجة not_bought**", notBought?.result, "not_bought");
      same("١٨. وتفاصيلُ البيع صحيحة (أصلي/خصم/نهائي/خبير)",
        [bought?.originalPrice, bought?.approvedPrice, bought?.priceKind, bought?.selectedExpertUserId],
        [900_000, 800_000, "discount", EXPERT]);
      same("١٩. وسببُ عدم الشراء كما قاله المريض حرفياً",
        notBought?.notBoughtReasonText, "غالٍ جداً بالنسبة له");

      const idxBought = rows.findIndex((x: any) => x.followupId === boughtFid);
      const idxNotBought = rows.findIndex((x: any) => x.followupId === notBoughtFid);
      check(idxNotBought < idxBought,
        "٢٠. **الأحدثُ حسماً أوّلاً** («لم يشترِ» حُسمت بعد «تم الشراء»)",
        `notBought@${idxNotBought} bought@${idxBought}`);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── و. هويّةُ الحاسم ولقطةُ الدور ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const { fid: recvFid } = await readySale("حاسمٌ-استقبال");
      await http("POST", `/api/followups/${recvFid}/complete-sale`, S.recv,
        { originalPrice: 500_000, discountAmount: 0, expertUserId: EXPERT });

      const { fid: acctFid } = await readySale("حاسمٌ-محاسب");
      await http("POST", `/api/followups/${acctFid}/not-bought`, S.acct, { reason: "سبب" });

      const { fid: adminFid } = await readySale("حاسمٌ-مسؤول");
      await http("POST", `/api/followups/${adminFid}/complete-sale`, S.admin,
        { originalPrice: 500_000, discountAmount: 0, expertUserId: EXPERT });

      const rows = (await resolved(S.admin)).body?.rows ?? [];
      const recvRow = rows.find((x: any) => x.followupId === recvFid);
      const acctRow = rows.find((x: any) => x.followupId === acctFid);
      const adminRow = rows.find((x: any) => x.followupId === adminFid);

      same("٢١. **الاستقبالُ يظهر اسماً ودوراً صحيحين**",
        [recvRow?.resolvedByName, recvRow?.resolvedByRole], ["ريام", "reception"]);
      same("٢٢. **والمحاسبُ كذلك**",
        [acctRow?.resolvedByName, acctRow?.resolvedByRole], ["المحاسب", "accountant"]);
      same("٢٣. **والمسؤولُ العام يُختَم `global_admin` — لا دورَه الخام `admin`**",
        adminRow?.resolvedByRole, "global_admin");
      check(!!recvRow?.resolvedAt, "٢٤. ووقتُ الحسم مسجَّل");
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز. إعادةُ الفتح وإعادةُ الحسم من فاعلٍ آخر ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const { fid } = await readySale("إعادةُ-حسم");
      await http("POST", `/api/followups/${fid}/not-bought`, S.recv, { reason: "تراجع مؤقّتاً" });
      const before = (await resolved(S.admin)).body?.rows ?? [];
      const beforeRow = before.find((x: any) => x.followupId === fid);
      same("٢٥. الإعدادُ: حسمتها ريام أوّلاً", beforeRow?.resolvedByName, "ريام");

      const reopenR = await http("POST", `/api/followups/${fid}/reopen`, S.manager, {});
      same("٢٦. الإعدادُ: أُعيد فتحها", reopenR.status, 200);

      const midW = await waiting(S.admin);
      check(idsOf(midW.body).includes(fid),
        "٢٧. **وتعود «بانتظار الحسم» فعلاً** — لا تبقى في «تم الحسم»");

      await http("POST", `/api/followups/${fid}/complete-sale`, S.acct,
        { originalPrice: 700_000, discountAmount: 0, expertUserId: EXPERT });
      const after = (await resolved(S.admin)).body?.rows ?? [];
      const afterRow = after.find((x: any) => x.followupId === fid);
      same("٢٨. **والحاسمُ الآن هو المحاسب — الأحدث لا الأقدم**",
        [afterRow?.resolvedByName, afterRow?.result], ["المحاسب", "bought"]);

      const events = await q(
        `SELECT event_type, actor_name FROM post_exam_followup_events
          WHERE followup_id=$1 ORDER BY id ASC`, [fid]);
      const types = events.map((e: any) => e.event_type);
      check(types.includes("closed_without_purchase") && types.includes("reopened")
        && types.includes("converted"),
        "٢٩. **والتاريخُ كاملٌ محفوظ** — الحدثُ الأوّل («لم يشترِ» بريام) لم يُمحَ",
        JSON.stringify(events));
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح. حالاتٌ لا تُعَدّ حسماً ──");
    // ══════════════════════════════════════════════════════════════════
    {
      //  تُطبَّق حالةٌ طرفية إدارية مباشرةً على الصفّ — فحصٌ للفرز في القراءة
      //  وحده، بلا استحضار مسار الإلغاء/الإبطال الكامل (مُختبَرٌ بتفصيله في
      //  `exam_cancellation.test.ts`/`administrative_reversal.test.ts`).
      const { fid: cancelledFid } = await readySale("معاينةٌ-ملغاة");
      await q(`UPDATE post_exam_followups SET status='closed_exam_cancelled' WHERE id=$1`,
        [cancelledFid]);
      const { fid: voidFid } = await readySale("عمليةٌ-مُبطَلة");
      await q(`UPDATE post_exam_followups SET status='closed_admin_void' WHERE id=$1`, [voidFid]);

      const w = await waiting(S.admin);
      const r = await resolved(S.admin);
      check(!idsOf(w.body).includes(cancelledFid) && !idsOf(r.body).includes(cancelledFid),
        "٣٠. **المعاينةُ الملغاة لا تظهر في أيّ تبويب**");
      check(!idsOf(w.body).includes(voidFid) && !idsOf(r.body).includes(voidFid),
        "٣١. **والعمليةُ المُبطَلة إدارياً كذلك** — واقعةٌ تاريخية لا قرارَ شراء");
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ط. التزامن ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const { fid } = await readySale("ضغطتان-متزامنتان");
      const [r1, r2] = await Promise.all([
        http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
          { originalPrice: 500_000, discountAmount: 0, expertUserId: EXPERT }),
        http("POST", `/api/followups/${fid}/complete-sale`, S.acct,
          { originalPrice: 500_000, discountAmount: 0, expertUserId: EXPERT }),
      ]);
      const statuses = [r1.status, r2.status].sort();
      same("٣٢. **إحداهما ٢٠٠ والأخرى ٤٠٩ — لا نجاحان معاً**", statuses, [200, 409]);
      const rows = (await resolved(S.admin)).body?.rows ?? [];
      check(rows.filter((x: any) => x.followupId === fid).length === 1,
        "٣٣. **وصفٌّ واحدٌ فقط في «تم الحسم»**");
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ي. التصنيفُ ودقّةُ العدّ ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const { fid: prosFid } = await readySale("تصنيف-طرف", {});
      const pid2 = await mkPatient("تصنيف-مسند", 1);
      await mkCase(pid2, 1, "medical_support");
      const ep2 = await http("POST", `/api/patients/${pid2}/device-episodes`, S.recv,
        { serviceType: "medical_support", requestedItem: "full_device", servicePath: "exam" });
      same("الإعدادُ: فُتح طلبُ مسند", ep2.status, 201);
      const ex2 = await signExam(pid2, { caseType: "medical_support" });
      same("الإعدادُ: وُقِّعت معاينةُ المسند", ex2.status, 200);
      const supFid = await followupOf(pid2);

      const rPros = await waiting(S.admin, "&serviceType=prosthetic");
      const rSup = await waiting(S.admin, "&serviceType=medical_support");
      check(idsOf(rPros.body).includes(prosFid) && !idsOf(rPros.body).includes(supFid),
        "٣٤. **فلترةُ «طرف صناعي» تُبقي الأطرافَ وتستبعد المساند**");
      check(idsOf(rSup.body).includes(supFid) && !idsOf(rSup.body).includes(prosFid),
        "٣٥. **وفلترةُ «مسند طبي» عكسُها بالضبط**");

      const rAll = await waiting(S.admin);
      same("٣٦. **والعددُ الإجماليّ يطابق طولَ الصفوف الفعليّ** — بلا `LIMIT` صامت",
        rAll.body?.total, (rAll.body?.rows ?? []).length);
    }

    console.log(
      "\nملاحظة: تفاصيلُ آليّة `/complete-sale`/`/not-bought` (المالكية، اشتقاقُ"
      + " السعر، عزلُ العلاج الطبيعي…) مُختبَرةٌ في server/reception_sale.test.ts"
      + " — هذا الملفُّ يثبت طابورَ القراءة الجديد فوقها.");
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`,
      [[ADMIN, MANAGER, DOC, RECV, ACCT, EXPERT, EXPERT_B2]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`,
      [[ADMIN, MANAGER, DOC, RECV, ACCT, EXPERT, EXPERT_B2]]);
    httpServer.close();
  }

  console.log(`\n${failures === 0 ? "✅ كل فحوص طابور الحسم نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
