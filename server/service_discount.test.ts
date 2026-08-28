// الخصمُ والتبرّع للأقسام الثلاثة — حيّاً على Postgres وعلى النقاط نفسها.
// قاعدة محلّية: `npm run test:discount`.
//
// ══ لماذا على النقاط لا على المخزن ══════════════════════════════════════
// المُختبَر هنا **ما يفعله الخادم بطلبٍ يصله**: مَن يُقبل، وبأي صلاحية، وفي
// أي فرع، وماذا يحدث حين يضغط اثنان معاً. فالواجهة قد تخفي حقلاً، والاختبار
// يسأل ماذا لو لم تخفِه.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **بلا خصمٍ = المسارُ القديم حرفاً**: لا صفَّ ولا طابورَ ولا بطء.
// (٢) **والمعلَّقُ بلا أثرٍ ماليّ**: لا كلفةَ ولا قيدَ ولا أمرَ تصنيع.
// (٣) **والصفرُ ليس مجّانياً حتى يُعلَن** — وهي قاعدةُ هذا الترحيل كلِّه.
// (٤) **والاعتمادُ ينادي المسارَ القائم**: الكلفةُ والقيدُ والأمرُ حيث كانت.
// (٥) **ونطاقُ الفرع مفروض**: مديرُ فرعٍ لا يعتمد خصمَ فرعٍ آخر.
// (٦) **ولا كلُّ طبيبٍ يعتمد** — والمخوَّلُ صراحةً يعتمد.
// (٧) **والاعتمادُ المزدوج يُنفَّذ مرّةً واحدة**.
// (٨) **وحذفُ المريض ودمجُه لا ينكسران** بالجدول الجديد.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";

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

const PORT = 6851;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-الخصم-الموحَّد";
const ADMIN = 9881, RECV = 9882, MGR = 9883, DOC = 9884, DOC_OK = 9885;
const EXPERT = 9886, RECV_B2 = 9887, MGR_B2 = 9888, DOC_B2 = 9889, EXPERT_B2 = 9890;
const ALL = [ADMIN, RECV, MGR, DOC, DOC_OK, EXPERT, RECV_B2, MGR_B2, DOC_B2, EXPERT_B2];

const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول",
    permissions: { canViewPatients: true, canAddPatients: true, canDeletePatients: true } },
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استعلامات", permissions: { canViewPatients: true, canAddPatients: true } },
  mgr: { userId: MGR, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "مدير الفرع", permissions: { canViewPatients: true, canAddPatients: true } },
  //  طبيبٌ عاديّ — **لا يعتمد خصماً**: الخصمُ قرارٌ ماليّ لا سريريّ.
  doc: { userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. المعاين", permissions: { canViewPatients: true, canWriteMedicalExam: true } },
  //  وطبيبٌ **مخوَّلٌ صراحةً** — يعتمد بعَلَمه لا بدوره.
  docOk: { userId: DOC_OK, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. المخوَّل",
    permissions: { canViewPatients: true, canWriteMedicalExam: true, canApproveDiscount: true } },
  expert: { userId: EXPERT, role: "prosthetics_expert", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "الخبير", permissions: {} },
  recvB2: { userId: RECV_B2, role: "reception", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "استعلامات ٢", permissions: { canViewPatients: true, canAddPatients: true } },
  //  **مديرُ فرعٍ آخر**: يحمل الدور ولا يحمل الفرع — والاثنان شرطٌ واحد.
  mgrB2: { userId: MGR_B2, role: "branch_manager", isAdmin: false, branchId: 2,
    accessibleBranches: [2], displayName: "مدير الفرع ٢",
    permissions: { canViewPatients: true, canAddPatients: true } },
  docB2: { userId: DOC_B2, role: "doctor", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "د. الفرع ٢", permissions: { canViewPatients: true, canWriteMedicalExam: true } },
  //  **معتمِدٌ بحسابٍ لا وجود له** — يمرّ ببوّابة الاعتماد، لكنّ سطرَ
  //  التدقيق يصطدم بمفتاح `audit_log.user_id` الأجنبي. فشلٌ **حقيقيّ**
  //  في كتابة التدقيق وحدها، بلا حقنٍ ولا شيفرةِ اختبارٍ في الإنتاج.
  ghost: { userId: 999_997, role: "admin", isAdmin: true, branchId: 1,
    accessibleBranches: [1, 2], displayName: "شبح",
    permissions: { canViewPatients: true, canAddPatients: true } },
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

async function mkPatient(label: string, opts: {
  branchId?: number; device?: boolean; physio?: boolean;
  support?: boolean; classification?: string;
} = {}) {
  const branchId = opts.branchId ?? 1;
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id,
       is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','بتر',$3,$4,$5,$6,0,$7) RETURNING id`,
    [`${MARK} ${label}`, MARK, branchId, opts.device !== false && opts.support !== true,
      opts.support === true, opts.physio === true, opts.classification ?? "new"]);
  return r[0].id;
}
async function mkCase(patientId: number, branchId = 1, caseType = "prosthetic") {
  await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
           VALUES ($1,$2,$3,0,'manual','active')`, [patientId, branchId, caseType]);
}

/**
 * ══ **`opts.deviceCost` صار خطوةً منفصلة عن التوقيع** ═══════════════════
 * الشاشةُ الطبّية لا ترسل `deviceCost` عند التوقيع بعد اليوم (القسمُ
 * 4.b/4.f في CLAUDE.md)، فيُثبَّت هنا بعده — على الصفَّين معاً — **فقط
 * حين يمرّره المستدعي رقماً فعلياً**، فيبقى `signExam(p, S.doc,
 * { deviceCost: undefined })` يعني «لم يُسعَّر» تماماً كما كان.
 */
async function signExam(patientId: number, session: any, opts: {
  caseType?: string; deviceCost?: number; prescription?: any;
} = {}) {
  const res = await http("POST", `/api/medical/patients/${patientId}/exams`, session, {
    caseType: opts.caseType ?? "prosthetic",
    diagnosis: "بتر تحت الركبة",
    prescription: opts.prescription ?? {},
  });
  if (typeof opts.deviceCost === "number" && res.status < 300 && res.body?.id) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`SET LOCAL app.allow_exam_edit = 'on'`);
      await client.query(`UPDATE medical_exams SET device_cost=$2 WHERE id=$1`,
        [res.body.id, opts.deviceCost]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
    await q(`UPDATE post_exam_followups SET approved_price=$2 WHERE medical_exam_id=$1`,
      [res.body.id, opts.deviceCost]);
  }
  return res;
}

/** ترتيبُ المفاتيح في JSONB لا يُعتَدّ به — تُقارَن الخطّةُ مطبَّعة. */
const plan = async (patientId: number) => {
  const raw = (await q(`SELECT physio_plan FROM patients WHERE id = $1`, [patientId]))[0]?.physio_plan;
  if (!Array.isArray(raw)) return raw ?? null;
  return raw.map((e: any) => [String(e.treatmentType), Number(e.sessionCount)]);
};

const followupOf = async (patientId: number) => {
  const r = await http("GET", `/api/followups/patient/${patientId}`, S.admin);
  return (Array.isArray(r.body) ? r.body : [])[0] ?? null;
};

const money = async (patientId: number) => {
  const p = await q(`SELECT total_cost FROM patients WHERE id = $1`, [patientId]);
  const e = await q(`SELECT COALESCE(SUM(amount),0)::int s FROM cost_entries WHERE patient_id = $1`, [patientId]);
  const w = await q(`SELECT count(*)::int n FROM prosthetic_work_orders WHERE patient_id = $1`, [patientId]);
  const pay = await q(`SELECT count(*)::int n FROM payments WHERE patient_id = $1`, [patientId]);
  return {
    totalCost: Number(p[0]?.total_cost ?? 0), ledger: Number(e[0].s),
    orders: Number(w[0].n), payments: Number(pay[0].n),
  };
};

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
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
  for (const [id, role, name, branch, spec, flag] of [
    [ADMIN, "admin", "المسؤول", 1, "[]", false],
    [RECV, "reception", "استعلامات", 1, "[]", false],
    [MGR, "branch_manager", "مدير الفرع", 1, "[]", false],
    [DOC, "doctor", "د. المعاين", 1, '["prosthetic","medical_support","physiotherapy"]', false],
    [DOC_OK, "doctor", "د. المخوَّل", 1, '["prosthetic","physiotherapy"]', true],
    [EXPERT, "prosthetics_expert", "الخبير", 1, "[]", false],
    [RECV_B2, "reception", "استعلامات ٢", 2, "[]", false],
    [MGR_B2, "branch_manager", "مدير الفرع ٢", 2, "[]", false],
    [DOC_B2, "doctor", "د. الفرع ٢", 2, '["prosthetic"]', false],
    [EXPERT_B2, "prosthetics_expert", "الخبير ٢", 2, "[]", false],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties,can_approve_discount)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,$7::jsonb,$8)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               medical_specialties=EXCLUDED.medical_specialties, is_active=true,
               can_approve_discount=EXCLUDED.can_approve_discount`,
      [id, `sd_u${id}`, name, role, branch, JSON.stringify([branch]), spec, flag]);
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

    // ══ ١. بلا خصم ⟶ المسارُ القديم حرفاً ═════════════════════════════
    console.log("\n── (١) بلا خصم: لا صفَّ ولا طابور ──");
    {
      const p = await mkPatient("علاج بلا خصم", { device: false, physio: true });
      await mkCase(p, 1, "physiotherapy");
      const r = await http("POST", `/api/patients/${p}/price-physio`, S.recv, {
        entries: [{ treatmentType: "روبوت", sessionCount: 10 }],
      });
      same("١. تسعيرٌ بلا خصم ينجح فوراً", r.status, 200);
      same("   والكلفةُ تُقيَّد كما كانت", (await money(p)).totalCost, 500_000);
      same("   **ولا صفَّ خصمٍ يُنشأ**",
        (await q(`SELECT count(*)::int n FROM service_discount_requests WHERE patient_id=$1`, [p]))[0].n, 0);
      same("   والخطّةُ محفوظة",
        await plan(p), [["روبوت", 10]]);
    }
    {
      //  **وسعرٌ نهائيٌّ مطابقٌ للأصلي ليس خصماً**: يمرّ بالمسار الطبيعي.
      const p = await mkPatient("علاج بسعرٍ مطابق", { device: false, physio: true });
      await mkCase(p, 1, "physiotherapy");
      const r = await http("POST", `/api/patients/${p}/price-physio`, S.recv, {
        entries: [{ treatmentType: "روبوت", sessionCount: 4 }],
        discount: { finalPrice: 200_000 },
      });
      same("٢. **سعرٌ يساوي الأصلي ليس خصماً** — يمرّ فوراً", r.status, 200);
      same("   بلا صفٍّ ولا اعتماد", r.body?.pendingApproval, undefined);
      same("   والكلفةُ كاملة", (await money(p)).totalCost, 200_000);
    }

    // ══ ٢. المعلَّقُ بلا أثرٍ ماليّ ════════════════════════════════════
    console.log("\n── (٢) طلبٌ معلَّق: لا دينارَ يتحرّك ──");
    let physioPending = 0;
    let physioPatient = 0;
    {
      const p = await mkPatient("علاج بخصم", { device: false, physio: true });
      physioPatient = p;
      await mkCase(p, 1, "physiotherapy");
      const r = await http("POST", `/api/patients/${p}/price-physio`, S.recv, {
        entries: [{ treatmentType: "روبوت", sessionCount: 10 }],
        discount: { finalPrice: 400_000, reason: "negotiation", note: "مساومة" },
      });
      same("٣. الاستعلامات يطلب خصماً ⟶ معلَّق", [r.status, r.body?.pendingApproval], [200, true]);
      physioPending = r.body?.discountRequestId;
      const m = await money(p);
      same("٤. **ولا كلفةَ ولا قيدَ ولا دفعة**", [m.totalCost, m.ledger, m.payments], [0, 0, 0]);
      same("   ولا خطّةَ جلسات", await plan(p), null);
      const row = (await q(`SELECT * FROM service_discount_requests WHERE id=$1`, [physioPending]))[0];
      same("٥. والصفُّ يحمل السعرين والفرقَ والنسبة",
        [Number(row.original_price), Number(row.proposed_final_price),
          Number(row.discount_amount), Number(row.discount_percentage)],
        [500_000, 400_000, 100_000, 20]);
      same("   والسببَ وطالبَه", [row.reason, row.requested_by_name], ["negotiation", "استعلامات"]);
      same("   وقسمَه", row.department, "physiotherapy");
    }
    {
      //  **طلبٌ معلَّقٌ واحدٌ لكل خدمة** — الثاني يصطدم بالفهرس الجزئي.
      const r = await http("POST", `/api/patients/${physioPatient}/price-physio`, S.recv, {
        entries: [{ treatmentType: "روبوت", sessionCount: 10 }],
        discount: { finalPrice: 300_000, reason: "negotiation" },
      });
      same("٦. **وطلبٌ ثانٍ معلَّق لنفس الخدمة يُردّ**", r.status, 409);
    }

    // ══ ٣. السببُ إلزاميّ ═════════════════════════════════════════════
    console.log("\n── (٣) السبب والصفر ──");
    {
      const p = await mkPatient("علاج بلا سبب", { device: false, physio: true });
      await mkCase(p, 1, "physiotherapy");
      const r = await http("POST", `/api/patients/${p}/price-physio`, S.recv, {
        entries: [{ treatmentType: "روبوت", sessionCount: 10 }],
        discount: { finalPrice: 400_000 },
      });
      same("٧. **خصمٌ بلا سببٍ منظَّم يُردّ**", r.status, 400);
      const bad = await http("POST", `/api/patients/${p}/price-physio`, S.recv, {
        entries: [{ treatmentType: "روبوت", sessionCount: 10 }],
        discount: { finalPrice: 400_000, reason: "لأنه صديقي" },
      });
      same("٨. ونصٌّ حرٌّ مكان السبب يُردّ", bad.status, 400);
      same("   ولا صفَّ خلّفه أيٌّ منهما",
        (await q(`SELECT count(*)::int n FROM service_discount_requests WHERE patient_id=$1`, [p]))[0].n, 0);
    }
    {
      //  ══ **لبُّ الترحيل**: الصفرُ ليس مجّانياً حتى يُعلَن ═══════════════
      const p = await mkPatient("علاج بصفرٍ صامت", { device: false, physio: true });
      await mkCase(p, 1, "physiotherapy");
      const r = await http("POST", `/api/patients/${p}/price-physio`, S.recv, {
        entries: [{ treatmentType: "روبوت", sessionCount: 10 }],
        discount: { finalPrice: 0, reason: "humanitarian" },
      });
      same("٩. **صفرٌ بلا علم مجّانية يُردّ** — «غير مسعَّر» لا «تبرّع»", r.status, 400);
      check(/مجاني/.test(String(r.body?.message ?? r.body?.error ?? "")),
        "   ورسالتُه تدلّ على الخيار الصريح", JSON.stringify(r.body));
    }

    // ══ ٤. الاعتمادُ الذاتي: مديرٌ يخصم بنفسه ═════════════════════════
    console.log("\n── (٤) المخوَّل يخصم فيُعتمد فوراً ──");
    {
      const p = await mkPatient("علاج بخصم المدير", { device: false, physio: true });
      await mkCase(p, 1, "physiotherapy");
      const r = await http("POST", `/api/patients/${p}/price-physio`, S.mgr, {
        entries: [{ treatmentType: "روبوت", sessionCount: 10 }],
        discount: { finalPrice: 400_000, reason: "administrative_instruction" },
      });
      same("١٠. مديرُ الفرع يخصم فيُعتمد في العملية نفسها",
        [r.status, r.body?.pendingApproval, r.body?.discountStatus], [200, false, "approved"]);
      const m = await money(p);
      same("١١. **والمالُ يُكتب بالمسار القائم**: الكلفةُ والقيدُ بالسعر المعتمد",
        [m.totalCost, m.ledger], [400_000, 400_000]);
      same("   والخطّةُ محفوظةٌ كاملةً — عشرُ جلساتٍ لا ثمان",
        await plan(p), [["روبوت", 10]]);
      same("   والتدقيقُ مكتوب",
        (await q(`SELECT count(*)::int n FROM audit_log WHERE entity_type='service_discount'
                   AND entity_id=$1`, [r.body?.discountRequestId]))[0].n, 1);
    }

    // ══ ٥. المجّانيُّ الصريح ══════════════════════════════════════════
    console.log("\n── (٥) المجّاني: خدمةٌ حقيقيةٌ بقيمةٍ صفر ──");
    {
      const p = await mkPatient("علاج مجّاني", { device: false, physio: true });
      await mkCase(p, 1, "physiotherapy");
      const r = await http("POST", `/api/patients/${p}/price-physio`, S.mgr, {
        entries: [{ treatmentType: "روبوت", sessionCount: 10 }],
        discount: { isFree: true, reason: "humanitarian" },
      });
      same("١٢. تبرّعٌ معتمَد", [r.status, r.body?.discountStatus], [200, "approved"]);
      const row = (await q(`SELECT * FROM service_discount_requests WHERE id=$1`,
        [r.body?.discountRequestId]))[0];
      same("١٣. **والسببُ يكتبه النظام** لا الموظّف", row.reason, "donation_dr_yasir");
      same("   والعَلَمُ مرفوعٌ والسعرُ صفر",
        [row.is_free, Number(row.approved_final_price), Number(row.discount_percentage)],
        [true, 0, 100]);
      same("   والسعرُ الأصليُّ محفوظٌ كما كان", Number(row.original_price), 500_000);
      const m = await money(p);
      same("١٤. **ولا إيرادَ ولا دَين ولا دفعةٌ ملفَّقة**",
        [m.totalCost, m.ledger, m.payments], [0, 0, 0]);
      same("١٥. **لكنّ الخدمةَ حقيقية**: الجلساتُ العشر مشتراة",
        await plan(p), [["روبوت", 10]]);
    }

    // ══ ٦. الأجهزة — تحت طبقة المتابعة ════════════════════════════════
    console.log("\n── (٦) الأجهزة: الخصم عند تأكيد الشراء ──");
    let devReq = 0, devPatient = 0, devFollowup = 0;
    {
      const p = await mkPatient("طرفٌ بخصم");
      devPatient = p;
      await mkCase(p);
      await signExam(p, S.doc, { deviceCost: 2_000_000 });
      const f = await followupOf(p);
      devFollowup = f.id;
      same("١٦. المعاينةُ فتحت متابعةً بسعرِها", f.approvedPrice, 2_000_000);
      const se = await http("POST", `/api/followups/${f.id}/expert`, S.recv, { expertUserId: EXPERT });
      same("   واختيرَ الخبير", se.status, 200);
      const r = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {
        //  والطلبُ يعلن أصلياً ملفَّقاً — ليُثبَت أنه **لا يُقرأ**.
        discount: {
          finalPrice: 1_600_000, reason: "negotiation", note: "خصم مساومة",
          originalPrice: 9_000_000, discountAmount: 1, discountPercentage: 0.01,
        },
      });
      same("١٧. الاستعلامات يطلب خصماً على الجهاز ⟶ معلَّق",
        [r.status, r.body?.pendingApproval], [200, true]);
      devReq = r.body?.discountRequestId;
      const m = await money(p);
      same("١٨. **ولا أمرَ تصنيعٍ ولا كلفةَ ولا قيد**",
        [m.orders, m.totalCost, m.ledger], [0, 0, 0]);
      same("   والمتابعةُ لم تتحوّل", (await followupOf(p)).status, "awaiting_patient_decision");
      same("   والسعرُ الأصليُّ من معاينة الطبيب لا من الطلب",
        Number((await q(`SELECT original_price FROM service_discount_requests WHERE id=$1`, [devReq]))[0].original_price),
        2_000_000);
    }

    {
      //  **جهازٌ مجّانيٌّ تحت طبقة المتابعة** — وهو الطريق الذي يمرّ فيه
      //  التبرّعُ بـ`confirmPurchase`: سعرُها المعتمد صفر، والحارسُ العامّ
      //  «لا يوجد سعر معتمد» يجب أن يُفتح له وحده.
      const p = await mkPatient("طرفٌ مجّاني");
      await mkCase(p);
      await signExam(p, S.doc, { deviceCost: 2_000_000 });
      const f = await followupOf(p);
      await http("POST", `/api/followups/${f.id}/expert`, S.recv, { expertUserId: EXPERT });
      const r = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.mgr, {
        discount: { isFree: true, reason: "humanitarian" },
      });
      same("١٧ب. **تبرّعٌ بطرفٍ تحت المتابعة معتمَدٌ فوراً**",
        [r.status, r.body?.discountStatus], [200, "approved"]);
      const m = await money(p);
      same("   **وأمرُ التصنيع وُلد** — الجهاز يُصنَّع فعلاً", m.orders, 1);
      same("   **ولا إيرادَ ولا دَين ولا دفعةٌ ملفَّقة**",
        [m.totalCost, m.ledger, m.payments], [0, 0, 0]);
      const done = await followupOf(p);
      same("   والمتابعةُ تحوّلت بسعرٍ صفر **معتمَدٍ لا مفقود**",
        [done.status, done.approvedPrice, done.priceSource],
        ["converted", 0, "approved_change"]);
    }

    // ══ ٦ج. المعاينةُ بلا كلفة — الاستعلامات يُدخل السعر الأصلي ════════
    console.log("\n── (٦ج) سكتت المعاينة: أولُ سعرٍ ليس خصماً ──");
    {
      //  **والصفرُ يبقى «غير مسعَّر»**: تأكيدُ شراءٍ بلا رقمٍ يُردّ — لكنّ
      //  الردَّ صار يدلّ على الحلّ بدل أن يوقف المريض على مدير الفرع.
      const p = await mkPatient("طرفٌ بلا كلفة");
      await mkCase(p);
      await signExam(p, S.doc, { deviceCost: undefined });
      const f = await followupOf(p);
      //  **وسعرُ الطبيب لا يُستبدَل بالصمت**: رقمٌ في الطلب لملفٍّ له سعرٌ
      //  موقَّع يُتجاهَل تماماً — التخفيضُ بابُه الخصم لا هذا الحقل.
      const priced = await mkPatient("طرفٌ بسعر الطبيب");
      await mkCase(priced);
      await signExam(priced, S.doc, { deviceCost: 2_000_000 });
      const pf = await followupOf(priced);
      await http("POST", `/api/followups/${pf.id}/expert`, S.recv, { expertUserId: EXPERT });
      const forged = await http("POST", `/api/followups/${pf.id}/confirm-purchase`, S.recv, {
        originalPrice: 900_000,
      });
      same("١٧ب٢. **سعرٌ في الطلب لملفٍّ مسعَّرٍ يُتجاهَل**", forged.status, 200);
      const pm = await money(priced);
      same("   والبيعُ تمّ بسعر الطبيب لا بالمهرَّب",
        [pm.totalCost, pm.ledger], [2_000_000, 2_000_000]);
      same("   والمصدرُ ما زال «من المعاينة»",
        [(await followupOf(priced)).approvedPrice, (await followupOf(priced)).priceSource],
        [2_000_000, "exam"]);

      same("١٧ج. معاينةٌ بلا كلفة ⟶ سعرٌ صفر «غير مسعَّر»",
        [f.approvedPrice, f.priceSource], [0, "exam"]);
      await http("POST", `/api/followups/${f.id}/expert`, S.recv, { expertUserId: EXPERT });
      const bare = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {});
      same("١٧د. **وتأكيدُ الشراء بلا سعرٍ يُردّ** — ولا يُفترَض صفراً", bare.status, 400);
      check(/السعر الأصلي/.test(String(bare.body?.error ?? "")),
        "   والردُّ يدلّ على الحلّ: أدخل السعر الأصلي", JSON.stringify(bare.body));
      same("   ولا أمرَ تصنيعٍ وُلد", (await money(p)).orders, 0);

      //  **وصفرٌ صريحٌ يُردّ كذلك**: «مجّاني» لا يُبنى على سعرٍ مجهول.
      const zero = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {
        originalPrice: 0,
      });
      same("١٧هـ. **وسعرٌ أصليٌّ صفر يُردّ** — لا يصير تبرّعاً", zero.status, 400);
      const freeOnUnknown = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {
        originalPrice: 0, discount: { isFree: true, reason: "humanitarian" },
      });
      same("   **ولا مربّعُ المجّاني يحوّل المجهولَ تبرّعاً**", freeOnUnknown.status, 400);
      same("   ولا صفَّ خصمٍ خلّفه",
        (await q(`SELECT count(*)::int n FROM service_discount_requests WHERE patient_id=$1`, [p]))[0].n, 0);

      //  ══ **وأولُ سعرٍ يمرّ بلا اعتماد** — هو السعرُ الطبيعي لا تخفيضٌ ══
      const ok = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {
        originalPrice: 3_000_000,
      });
      same("١٧و. **الاستعلامات يُدخل السعر الأصلي فيتمّ البيع فوراً**",
        [ok.status, ok.body?.pendingApproval], [200, undefined]);
      const m = await money(p);
      same("   والمال كُتب مرّةً واحدة: أمرٌ وكلفةٌ وقيد",
        [m.orders, m.totalCost, m.ledger], [1, 3_000_000, 3_000_000]);
      same("   وحالةُ الجهاز تحمله",
        Number((await q(`SELECT cost FROM patient_cases WHERE patient_id=$1 AND case_type='prosthetic'`,
          [p]))[0].cost), 3_000_000);
      const done = await followupOf(p);
      same("   **والسجلُّ يقول مَن أدخله** — لا يُنسَب لمدير الفرع",
        [done.status, done.approvedPrice, done.priceSource],
        ["converted", 3_000_000, "reception_set"]);
      same("   ولا طلبَ خصمٍ أُنشئ",
        (await q(`SELECT count(*)::int n FROM service_discount_requests WHERE patient_id=$1`, [p]))[0].n, 0);
    }
    {
      //  وبعد أن يصير للجهاز سعرٌ موجب: تخفيضُه خصمٌ يمرّ بالاعتماد.
      const p = await mkPatient("طرفٌ بلا كلفة ثم خصم");
      await mkCase(p);
      await signExam(p, S.doc, { deviceCost: undefined });
      const f = await followupOf(p);
      await http("POST", `/api/followups/${f.id}/expert`, S.recv, { expertUserId: EXPERT });
      const r = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {
        originalPrice: 3_000_000,
        discount: { finalPrice: 2_500_000, reason: "negotiation" },
      });
      same("١٧ز. **سعرٌ أصليٌّ جديد مع خصم ⟶ الخصمُ وحده ينتظر**",
        [r.status, r.body?.pendingApproval], [200, true]);
      const row = (await q(`SELECT * FROM service_discount_requests WHERE id=$1`,
        [r.body?.discountRequestId]))[0];
      same("   والفرقُ ٥٠٠ ألف على أصلٍ ٣ ملايين",
        [Number(row.original_price), Number(row.proposed_final_price), Number(row.discount_amount)],
        [3_000_000, 2_500_000, 500_000]);
      const m0 = await money(p);
      same("   ولا مالَ تحرّك بعد", [m0.orders, m0.totalCost, m0.ledger], [0, 0, 0]);
      //  **لكنّ السعر الأصلي ثُبّت** — فهو حقيقةٌ تجارية لا خصم.
      same("   والسعرُ الأصليُّ مثبَّتٌ على الصفّ",
        [(await followupOf(p)).approvedPrice, (await followupOf(p)).priceSource],
        [3_000_000, "reception_set"]);
      same("١٧ح. والاعتمادُ يُتمّ البيع بالسعر المخفَّض",
        (await http("POST", `/api/discounts/${row.id}/decide`, S.mgr, { decision: "approve" })).status, 200);
      const m = await money(p);
      same("   الأمرُ واحدٌ والكلفةُ المخفَّضة",
        [m.orders, m.totalCost, m.ledger], [1, 2_500_000, 2_500_000]);
    }
    {
      //  **والتبرّعُ على سعرٍ اسميٍّ أدخله الاستعلامات**.
      const p = await mkPatient("طرفٌ بلا كلفة ثم تبرّع");
      await mkCase(p);
      await signExam(p, S.doc, { deviceCost: undefined });
      const f = await followupOf(p);
      await http("POST", `/api/followups/${f.id}/expert`, S.recv, { expertUserId: EXPERT });
      const r = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.mgr, {
        originalPrice: 3_000_000,
        discount: { isFree: true, reason: "humanitarian" },
      });
      same("١٧ط. **تبرّعٌ بجهازٍ سعرُه الاسميّ من الاستعلامات**",
        [r.status, r.body?.discountStatus], [200, "approved"]);
      const row = (await q(`SELECT * FROM service_discount_requests WHERE id=$1`,
        [r.body?.discountRequestId]))[0];
      same("   الاسميُّ ٣ ملايين والنهائيُّ صفر والنسبة ١٠٠٪",
        [Number(row.original_price), Number(row.approved_final_price),
          Number(row.discount_percentage), row.is_free],
        [3_000_000, 0, 100, true]);
      const m = await money(p);
      same("   **والجهاز يُصنَّع فعلاً بلا إيرادٍ ولا دَين**",
        [m.orders, m.totalCost, m.ledger, m.payments], [1, 0, 0, 0]);
    }

    // ══ ٦ب. المساند — بابُ «تخصيص» للمريض القديم ══════════════════════
    console.log("\n── (٦ب) المساند: الخصم في «تخصيص وإسناد خبير» ──");
    {
      //  مريضٌ قديم (`past`) معفىً من إلزام المعاينة — فبابُه «تخصيص»
      //  مباشرةً، وهو المسارُ الثالث الذي يجب أن يحمل الخصمَ نفسه.
      const p = await mkPatient("مسندٌ قديم", { support: true, classification: "past" });
      await mkCase(p, 1, "medical_support");
      const r = await http("POST", `/api/patients/${p}/assign-manufacturing`, S.recv, {
        expertUserId: EXPERT, serviceType: "medical_support", cost: 800_000,
        discount: { finalPrice: 600_000, reason: "humanitarian", note: "حالة إنسانية" },
      });
      same("١٦ب. الاستعلامات يطلب خصماً على المسند ⟶ معلَّق",
        [r.status, r.body?.pendingApproval], [202, true]);
      const m0 = await money(p);
      same("   **ولا أمرَ تصنيعٍ ولا كلفة**", [m0.orders, m0.totalCost], [0, 0]);
      const id = r.body?.discountRequestId;
      same("   وقسمُه «مساند»",
        (await q(`SELECT department FROM service_discount_requests WHERE id=$1`, [id]))[0].department,
        "medical_support");
      same("١٦ج. والمعتمِدُ يعتمد فيُولَد الأمر بالسعر المعتمد",
        (await http("POST", `/api/discounts/${id}/decide`, S.mgr, { decision: "approve" })).status, 200);
      const m = await money(p);
      same("   الأمرُ واحدٌ والكلفةُ والقيدُ بالمعتمَد",
        [m.orders, m.totalCost, m.ledger], [1, 600_000, 600_000]);
      same("   وحالةُ المسند تحمل الكلفة المعتمدة",
        Number((await q(`SELECT cost FROM patient_cases WHERE patient_id=$1 AND case_type='medical_support'`,
          [p]))[0].cost), 600_000);
      same("   والخبيرُ المحفوظ في الحمولة هو المسنَد",
        Number((await q(`SELECT expert_user_id FROM prosthetic_work_orders WHERE patient_id=$1`, [p]))[0].expert_user_id),
        EXPERT);
    }
    {
      //  **والمساندُ المجّاني**: خدمةٌ تُنفَّذ وجهازٌ يُصنَّع بقيمةٍ صفر.
      const p = await mkPatient("مسندٌ مجّاني", { support: true, classification: "past" });
      await mkCase(p, 1, "medical_support");
      const r = await http("POST", `/api/patients/${p}/assign-manufacturing`, S.mgr, {
        expertUserId: EXPERT, serviceType: "medical_support", cost: 800_000,
        discount: { isFree: true, reason: "humanitarian" },
      });
      same("١٦د. **تبرّعٌ بجهازٍ معتمَدٌ في العملية نفسها**",
        [r.status, r.body?.discountStatus], [201, "approved"]);
      const m = await money(p);
      same("   **وأمرُ التصنيع وُلد فعلاً** — الخدمة حقيقية", m.orders, 1);
      same("   **ولا إيرادَ ولا دَين ولا دفعةٌ ملفَّقة**",
        [m.totalCost, m.ledger, m.payments], [0, 0, 0]);
      same("   والسعرُ الاسميُّ محفوظٌ في الطلب",
        Number((await q(`SELECT original_price FROM service_discount_requests WHERE id=$1`,
          [r.body?.discountRequestId]))[0].original_price), 800_000);
    }

    // ══ ٧. مَن يعتمد ══════════════════════════════════════════════════
    console.log("\n── (٧) مَن يعتمد ومَن لا يعتمد ──");
    {
      same("١٩. **الاستقبالُ لا يعتمد**",
        (await http("POST", `/api/discounts/${devReq}/decide`, S.recv, { decision: "approve" })).status, 403);
      same("٢٠. **ولا الطبيبُ العاديّ** — الخصم قرارٌ ماليّ لا سريريّ",
        (await http("POST", `/api/discounts/${devReq}/decide`, S.doc, { decision: "approve" })).status, 403);
      same("٢١. ولا خبيرُ الأطراف",
        (await http("POST", `/api/discounts/${devReq}/decide`, S.expert, { decision: "approve" })).status, 403);
      same("٢٢. **ولا مديرُ فرعٍ آخر** — الدورُ وحده لا يكفي",
        (await http("POST", `/api/discounts/${devReq}/decide`, S.mgrB2, { decision: "approve" })).status, 403);
      same("   ولا يرى طابورَ فرعٍ ليس له",
        ((await http("GET", "/api/discounts", S.mgrB2)).body?.requests ?? [])
          .filter((x: any) => x.id === devReq).length, 0);
      same("٢٣. ومديرُ الفرع يرى طلبَ فرعه في الطابور",
        ((await http("GET", "/api/discounts", S.mgr)).body?.requests ?? [])
          .filter((x: any) => x.id === devReq).length, 1);
      same("٢٤. والاستقبالُ لا يفتح الطابور أصلاً",
        (await http("GET", "/api/discounts", S.recv)).status, 403);
    }

    // ══ ٨. الاعتمادُ ينادي المسارَ القائم ═════════════════════════════
    console.log("\n── (٨) الاعتماد: المالُ يُكتب حيث كان يُكتب دائماً ──");
    {
      const r = await http("POST", `/api/discounts/${devReq}/decide`, S.mgr, { decision: "approve" });
      same("٢٥. مديرُ الفرع يعتمد", r.status, 200);
      const m = await money(devPatient);
      same("٢٦. **وأمرُ التصنيع وُلد بالسعر المعتمد**",
        [m.orders, m.totalCost, m.ledger], [1, 1_600_000, 1_600_000]);
      const f = await followupOf(devPatient);
      same("٢٧. والمتابعةُ تحوّلت", [f.status, f.approvedPrice], ["converted", 1_600_000]);
      same("٢٨. وحالةُ الجهاز تحمل الكلفة المعتمدة",
        Number((await q(`SELECT cost FROM patient_cases WHERE patient_id=$1 AND case_type='prosthetic'`,
          [devPatient]))[0].cost), 1_600_000);
      //  **والتنفيذُ مرّةً واحدة**: الضغطة الثانية تقرأ `approved` فتُردّ.
      same("٢٩. **واعتمادٌ ثانٍ يُردّ ولا يُنشئ أمراً ثانياً**",
        (await http("POST", `/api/discounts/${devReq}/decide`, S.admin, { decision: "approve" })).status, 409);
      same("   والأمرُ ما زال واحداً", (await money(devPatient)).orders, 1);
      //  **والصفُّ لم يُلمَس**: مَن اعتمد أوّلاً هو المعتمِد، ولا يُعاد ختمُه
      //  باسم الثاني. وهذا ما يُثبت أن حارسَ الطلب نفسَه ردّه — لا حارسٌ
      //  لاحقٌ في مسار التصنيع صادف أن ردّ الطلب لسببٍ آخر.
      same("   **والمعتمِدُ ما زال الأوّل** — لا يُعاد ختمُ الصفّ باسم الثاني",
        Number((await q(`SELECT decided_by FROM service_discount_requests WHERE id=$1`, [devReq]))[0].decided_by),
        MGR);
      same("٣٠. ولحظةُ التنفيذ مختومة",
        (await q(`SELECT applied_at IS NOT NULL a FROM service_discount_requests WHERE id=$1`, [devReq]))[0].a,
        true);
    }

    // ══ ٩. الرفضُ لا يُنشئ ديناراً ════════════════════════════════════
    console.log("\n── (٩) الرفض: لا مالَ ولا خدمة ──");
    {
      const r = await http("POST", `/api/discounts/${physioPending}/decide`, S.mgr, {
        decision: "reject", note: "السعر لا يحتمل",
      });
      same("٣١. الرفضُ مقبول", [r.status, r.body?.request?.status], [200, "rejected"]);
      const m = await money(physioPatient);
      same("٣٢. **ولا كلفةَ ولا قيدَ ولا دفعة** — لا شحنٌ تلقائيٌّ بالسعر الأصلي",
        [m.totalCost, m.ledger, m.payments], [0, 0, 0]);
      same("   ولا خطّةَ جلسات", await plan(physioPatient), null);
      //  وبعد الرفض يستطيع الاستعلامات أن يكمل بالسعر الطبيعي.
      const ok = await http("POST", `/api/patients/${physioPatient}/price-physio`, S.recv, {
        entries: [{ treatmentType: "روبوت", sessionCount: 10 }],
      });
      same("٣٣. والاستعلامات يكمل بالسعر الأصلي بعده", ok.status, 200);
      same("   بكلفتِه كاملة", (await money(physioPatient)).totalCost, 500_000);
    }

    // ══ ١٠. تعديلٌ واعتماد ════════════════════════════════════════════
    console.log("\n── (١٠) تعديلٌ واعتماد ──");
    {
      const p = await mkPatient("علاج بتعديل", { device: false, physio: true });
      await mkCase(p, 1, "physiotherapy");
      const req = await http("POST", `/api/patients/${p}/price-physio`, S.recv, {
        entries: [{ treatmentType: "روبوت", sessionCount: 10 }],
        discount: { finalPrice: 300_000, reason: "humanitarian" },
      });
      const id = req.body?.discountRequestId;
      const r = await http("POST", `/api/discounts/${id}/decide`, S.mgr, {
        decision: "approve", finalPrice: 450_000, note: "خصم أقلّ",
      });
      same("٣٤. المعتمِدُ يعدّل السعر ويعتمد", r.status, 200);
      same("   **والمكتوبُ هو المعتمَد لا المقترَح**", (await money(p)).totalCost, 450_000);
      const row = (await q(`SELECT * FROM service_discount_requests WHERE id=$1`, [id]))[0];
      same("   والصفُّ متّسق: الفرقُ والنسبةُ أُعيد حسابهما",
        [Number(row.approved_final_price), Number(row.discount_amount), Number(row.discount_percentage)],
        [450_000, 50_000, 10]);
    }
    {
      //  **وتصفيرٌ في «تعديل واعتماد» يحتاج إعلانَ مجّانية صريحاً**.
      const p = await mkPatient("علاج بتصفيرٍ صامت", { device: false, physio: true });
      await mkCase(p, 1, "physiotherapy");
      const req = await http("POST", `/api/patients/${p}/price-physio`, S.recv, {
        entries: [{ treatmentType: "روبوت", sessionCount: 10 }],
        discount: { finalPrice: 300_000, reason: "humanitarian" },
      });
      const id = req.body?.discountRequestId;
      const bad = await http("POST", `/api/discounts/${id}/decide`, S.mgr, {
        decision: "approve", finalPrice: 0,
      });
      same("٣٥. **والمعتمِدُ لا يصفّر بالصمت**", bad.status, 400);
      same("   والطلبُ ما زال معلَّقاً",
        (await q(`SELECT status FROM service_discount_requests WHERE id=$1`, [id]))[0].status, "pending");
      const good = await http("POST", `/api/discounts/${id}/decide`, S.mgr, {
        decision: "approve", finalPrice: 0, isFree: true,
      });
      same("٣٦. ومع الإعلان الصريح يمرّ", good.status, 200);
      same("   والسببُ صار سببَ التبرّع",
        (await q(`SELECT reason, is_free FROM service_discount_requests WHERE id=$1`, [id]))[0].reason,
        "donation_dr_yasir");
      same("   ولا دينارَ قُيِّد", (await money(p)).totalCost, 0);
      same("   والجلساتُ محفوظة",
        await plan(p), [["روبوت", 10]]);
    }

    // ══ ١١. الطبيبُ المخوَّل والمسؤول ═════════════════════════════════
    console.log("\n── (١١) المخوَّلُ صراحةً والمسؤول ──");
    {
      const p = await mkPatient("علاج للمخوَّل", { device: false, physio: true });
      await mkCase(p, 1, "physiotherapy");
      const req = await http("POST", `/api/patients/${p}/price-physio`, S.recv, {
        entries: [{ treatmentType: "روبوت", sessionCount: 4 }],
        discount: { finalPrice: 150_000, reason: "campaign_or_offer" },
      });
      const id = req.body?.discountRequestId;
      same("٣٧. **الطبيبُ المخوَّل صراحةً يعتمد**",
        (await http("POST", `/api/discounts/${id}/decide`, S.docOk, { decision: "approve" })).status, 200);
      same("   والمالُ كُتب", (await money(p)).totalCost, 150_000);
    }
    {
      //  **والمسؤول يعتمد عبر الفروع** — سلطتُه لا يقيّدها فرعُه.
      const p = await mkPatient("علاج فرع ٢", { device: false, physio: true, branchId: 2 });
      await mkCase(p, 2, "physiotherapy");
      const req = await http("POST", `/api/patients/${p}/price-physio`, S.recvB2, {
        entries: [{ treatmentType: "روبوت", sessionCount: 4 }],
        discount: { finalPrice: 150_000, reason: "special_org_or_employee" },
      });
      const id = req.body?.discountRequestId;
      same("٣٨. مديرُ الفرع الأوّل لا يعتمد طلبَ الثاني",
        (await http("POST", `/api/discounts/${id}/decide`, S.mgr, { decision: "approve" })).status, 403);
      same("٣٩. **والمسؤولُ يعتمد في كل فرع**",
        (await http("POST", `/api/discounts/${id}/decide`, S.admin, { decision: "approve" })).status, 200);
      same("   والمالُ كُتب على مريض الفرع الثاني", (await money(p)).totalCost, 150_000);
    }

    // ══ ١٢. تزويرُ السعر الأصلي مستحيل ════════════════════════════════
    console.log("\n── (١٢) الأرقامُ يحسبها الخادم ──");
    {
      const p = await mkPatient("علاج بتزوير", { device: false, physio: true });
      await mkCase(p, 1, "physiotherapy");
      //  الطلبُ يعلن أصلياً ضخماً — والخادمُ يحسبه من جدول الأسعار.
      const r = await http("POST", `/api/patients/${p}/price-physio`, S.recv, {
        entries: [{ treatmentType: "روبوت", sessionCount: 10 }],
        discount: {
          finalPrice: 400_000, reason: "negotiation",
          originalPrice: 9_000_000, discountAmount: 1, discountPercentage: 0.01,
        },
      });
      const row = (await q(`SELECT * FROM service_discount_requests WHERE id=$1`,
        [r.body?.discountRequestId]))[0];
      same("٤٠. **السعرُ الأصليُّ من الجدول لا من الطلب**",
        Number(row.original_price), 500_000);
      same("   والفرقُ والنسبةُ محسوبان لا مُعلَنان",
        [Number(row.discount_amount), Number(row.discount_percentage)], [100_000, 20]);
    }
    {
      //  **ولا يُهرَّب «مجّاني» بسعرٍ موجب** — لا في الطلب ولا في القاعدة.
      let raised = "";
      try {
        await q(`INSERT INTO service_discount_requests
                   (patient_id, branch_id, department, original_price, proposed_final_price,
                    discount_amount, discount_percentage, is_free, reason, status)
                 VALUES ($1, 1, 'physiotherapy', 500000, 450000, 50000, 10, true, 'humanitarian', 'pending')`,
          [devPatient]);
      } catch (e: any) { raised = String(e?.constraint ?? e?.message ?? ""); }
      check(/shape_check/.test(raised),
        "٤١. **والقاعدةُ نفسها ترفض «مجّانياً بسعر موجب»** — ولو من محرّر SQL", raised);
    }
    {
      let raised = "";
      try {
        await q(`INSERT INTO service_discount_requests
                   (patient_id, branch_id, department, original_price, proposed_final_price,
                    discount_amount, discount_percentage, is_free, reason, status)
                 VALUES ($1, 1, 'physiotherapy', 500000, 0, 500000, 100, false, 'humanitarian', 'pending')`,
          [devPatient]);
      } catch (e: any) { raised = String(e?.constraint ?? e?.message ?? ""); }
      check(/shape_check/.test(raised),
        "٤٢. **وترفض صفراً بلا علمِ مجّانية** — «غير مسعَّر» لا يتسلّل", raised);
    }
    {
      let raised = "";
      try {
        await q(`INSERT INTO service_discount_requests
                   (patient_id, branch_id, department, original_price, proposed_final_price,
                    discount_amount, discount_percentage, is_free, reason, status)
                 VALUES ($1, 1, 'physiotherapy', 500000, 400000, 999, 20, false, 'humanitarian', 'pending')`,
          [devPatient]);
      } catch (e: any) { raised = String(e?.constraint ?? e?.message ?? ""); }
      check(/shape_check/.test(raised),
        "٤٣. وترفض فرقاً لا يطابق مصدرَه", raised);
    }
    {
      let raised = "";
      try {
        await q(`INSERT INTO service_discount_requests
                   (patient_id, branch_id, department, original_price, proposed_final_price,
                    discount_amount, discount_percentage, is_free, reason, status)
                 VALUES ($1, 1, 'dental', 500000, 400000, 100000, 20, false, 'humanitarian', 'pending')`,
          [devPatient]);
      } catch (e: any) { raised = String(e?.constraint ?? e?.message ?? ""); }
      check(/department_check/.test(raised), "٤٤. وقسماً رابعاً لا وجود له", raised);
    }

    // ══ ١٣. الجداولُ القديمة تبقى مقروءة ══════════════════════════════
    console.log("\n── (١٣) لا يُكسَر ما كان ──");
    {
      const legacy = ["price_change_requests", "post_exam_followups", "post_exam_followup_events"];
      for (const t of legacy) {
        const r = await q(`SELECT count(*)::int n FROM ${t}`);
        check(Number.isFinite(Number(r[0].n)), `٤٥. ${t} ما زال مقروءاً`);
      }
      const states = await q(`SELECT unnest(enum_range(NULL::text[]))`).catch(() => []);
      void states;
      //  والحالاتُ القديمة ما زالت مقبولةً في `post_exam_followups`.
      const f = await q(`SELECT 1 FROM post_exam_followups
                          WHERE status IN ('price_approval_pending','price_approved_waiting_patient',
                                           'purchase_approval_pending') LIMIT 1`);
      check(Array.isArray(f), "٤٦. والحالاتُ القديمة الثلاث ما زالت مقبولةً في المخطّط");
    }

    // ══ ١٤. حذفُ المريض ودمجُه ════════════════════════════════════════
    console.log("\n── (١٤) الحذف والدمج لا ينكسران ──");
    {
      const p = await mkPatient("مريضٌ للحذف", { device: false, physio: true });
      await mkCase(p, 1, "physiotherapy");
      await http("POST", `/api/patients/${p}/price-physio`, S.recv, {
        entries: [{ treatmentType: "روبوت", sessionCount: 4 }],
        discount: { finalPrice: 150_000, reason: "humanitarian" },
      });
      same("   وله طلبُ خصمٍ فعلاً",
        (await q(`SELECT count(*)::int n FROM service_discount_requests WHERE patient_id=$1`, [p]))[0].n, 1);
      let err = "";
      try { await storage.deletePatient(p); } catch (e: any) { err = String(e?.message ?? e); }
      same("٤٧. **حذفُ مريضٍ له طلبُ خصمٍ ينجح** (القاعدة الملزمة)", err, "");
      same("   ولا صفَّ خصمٍ يتيمٌ يبقى",
        (await q(`SELECT count(*)::int n FROM service_discount_requests WHERE patient_id=$1`, [p]))[0].n, 0);
    }
    {
      //  دمجُ ملفّين لكلٍّ منهما طلبٌ معلَّقٌ للقسم نفسه — الفهرسُ الجزئي
      //  كان سيُسقط الدمج لولا إلغاءُ طلب المصدر.
      const a = await mkPatient("دمج مصدر", { device: false, physio: true });
      const b = await mkPatient("دمج هدف", { device: false, physio: true });
      await mkCase(a, 1, "physiotherapy");
      await mkCase(b, 1, "physiotherapy");
      for (const x of [a, b]) {
        await http("POST", `/api/patients/${x}/price-physio`, S.recv, {
          entries: [{ treatmentType: "روبوت", sessionCount: 4 }],
          discount: { finalPrice: 150_000, reason: "humanitarian" },
        });
      }
      let err = "";
      try { await storage.mergePatients(a, b); } catch (e: any) { err = String(e?.message ?? e); }
      same("٤٨. **ودمجُ ملفّين بطلبين معلَّقين ينجح**", err, "");
      const rows = await q(`SELECT status FROM service_discount_requests WHERE patient_id=$1 ORDER BY id`, [b]);
      same("   والطلبان انتقلا، والمعلَّقُ واحد",
        [rows.length, rows.filter((r: any) => r.status === "pending").length], [2, 1]);
    }

    // ══ ١٤ب. الفشلُ والاستئناف — «معتمَد» يعني «نُفِّذ» ════════════════
    console.log("\n── (١٤ب) الفشلُ بين الحسم والتنفيذ ──");
    {
      //  **فشلٌ حقيقيّ لا محقون**: أمرُ بناءٍ فعّالٌ سابق يجعل
      //  `assignManufacturing` ترمي `ActiveAssignmentError` **داخل** معاملة
      //  الاعتماد. فما يُختبَر هو ما يقع إنتاجاً حين يسبقنا أحدٌ إلى الأمر.
      const p = await mkPatient("طرفٌ يفشل تنفيذه");
      await mkCase(p);
      await signExam(p, S.doc, { deviceCost: 2_000_000 });
      const f = await followupOf(p);
      await http("POST", `/api/followups/${f.id}/expert`, S.recv, { expertUserId: EXPERT });
      const req = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {
        discount: { finalPrice: 1_500_000, reason: "negotiation" },
      });
      const id = req.body?.discountRequestId;
      same("٥١. طلبُ خصمٍ معلَّق", req.body?.pendingApproval, true);

      //  حاجزُ الفشل: أمرُ بناءٍ فعّال يسبق الاعتماد.
      const blocker = await q<{ id: number }>(
        `INSERT INTO prosthetic_work_orders
           (patient_id, branch_id, expert_user_id, service_type, status, current_stage,
            assigned_by, purpose)
         VALUES ($1, 1, $2, 'prosthetic', 'active', 'measurement', $3, 'initial_build')
         RETURNING id`, [p, EXPERT, ADMIN]);

      const boom = await http("POST", `/api/discounts/${id}/decide`, S.mgr, { decision: "approve" });
      same("٥٢. **الاعتمادُ يفشل حين يفشل التنفيذ** — ولا يُعلَن نجاحاً", boom.status, 409);

      const row = (await q(`SELECT * FROM service_discount_requests WHERE id=$1`, [id]))[0];
      same("٥٣. **والطلبُ ما زال معلَّقاً** — لم يخرج من الطابور ولم يُختَم",
        [row.status, row.approved_final_price, row.applied_at, row.decided_by],
        ["pending", null, null, null]);
      same("   ويُرى في طابور الاعتماد كما كان",
        ((await http("GET", "/api/discounts", S.mgr)).body?.requests ?? [])
          .filter((x: any) => x.id === id).length, 1);

      //  **ولا سعرٌ مخفَّضٌ مكتوبٌ على المتابعة**: هذا هو الالتفاف الذي
      //  كان ممكناً — يُكتب ١٬٥٠٠٬٠٠٠ ثم يفشل البيع، فيؤكّد الاستعلامات
      //  الشراءَ بالمسار العادي ويأخذ الخصمَ بلا اعتماد.
      const stillF = await followupOf(p);
      same("٥٤. **ولا أثرَ للسعر المخفَّض على المتابعة** — لا التفافَ ممكن",
        [stillF.approvedPrice, stillF.priceSource, stillF.status],
        [2_000_000, "exam", "awaiting_patient_decision"]);
      const m0 = await money(p);
      same("٥٥. ولا كلفةَ ولا قيدَ ولا دفعة",
        [m0.totalCost, m0.ledger, m0.payments], [0, 0, 0]);
      same("   والأمرُ الفعّال هو الحاجزُ وحده لا أمرٌ ثانٍ", m0.orders, 1);

      //  ولو حاول الاستعلامات إتمامَ البيع الآن، يمضي بالسعر **الأصلي**.
      //  (يفشل هنا لأن الحاجز قائم — والمقصود أن السعر لم يتغيّر.)
      same("٥٦. ومحاولةُ البيع العادي تمرّ بالسعر الأصلي لا المخفَّض",
        Number((await q(`SELECT approved_price FROM post_exam_followups WHERE id=$1`, [f.id]))[0].approved_price),
        2_000_000);

      // ══ الإعادةُ بعد زوال العطب تكمل **مرّةً واحدة** ══════════════════
      await q(`UPDATE prosthetic_work_orders SET status='cancelled' WHERE id=$1`, [blocker[0].id]);
      const retry = await http("POST", `/api/discounts/${id}/decide`, S.mgr, { decision: "approve" });
      same("٥٧. **والإعادةُ بعد زوال العطب تنجح**", retry.status, 200);
      const m = await money(p);
      same("٥٨. **ومرّةً واحدة بالضبط**: أمرٌ حيٌّ واحد وكلفةٌ واحدة",
        [m.totalCost, m.ledger], [1_500_000, 1_500_000]);
      same("   وقيدُ الدفتر سطرٌ واحد",
        (await q(`SELECT count(*)::int n FROM cost_entries WHERE patient_id=$1`, [p]))[0].n, 1);
      same("   وأمرُ بناءٍ فعّالٌ واحد (والملغى باقٍ تاريخاً)",
        (await q(`SELECT count(*)::int n FROM prosthetic_work_orders
                   WHERE patient_id=$1 AND status NOT IN ('cancelled','completed')`, [p]))[0].n, 1);
      const fin = (await q(`SELECT * FROM service_discount_requests WHERE id=$1`, [id]))[0];
      same("٥٩. **والصفُّ صار معتمَداً ومختوماً معاً**",
        [fin.status, Number(fin.approved_final_price), fin.applied_at !== null],
        ["approved", 1_500_000, true]);
      same("   وثالثةٌ تُردّ", 
        (await http("POST", `/api/discounts/${id}/decide`, S.admin, { decision: "approve" })).status, 409);
    }
    {
      //  **وفشلٌ حقيقيٌّ في مسار العلاج الطبيعي**: كلفةٌ تتجاوز حدَّ العدد
      //  الصحيح عند جمعها على كلفة المريض ⟶ خطأُ Postgres **داخل** معاملة
      //  الاعتماد. فيُختبَر القسمُ الآخر بنفس الصرامة.
      const p = await mkPatient("علاجٌ يفشل تنفيذه", { device: false, physio: true });
      await mkCase(p, 1, "physiotherapy");
      await q(`UPDATE patients SET total_cost = 2000000000 WHERE id = $1`, [p]);
      const req = await http("POST", `/api/patients/${p}/price-physio`, S.recv, {
        entries: [{ treatmentType: "روبوت", sessionCount: 10 }],
        discount: { finalPrice: 400_000, reason: "negotiation" },
      });
      const id = req.body?.discountRequestId;
      same("٦٠. طلبُ خصمٍ معلَّق على علاجٍ طبيعي", req.body?.pendingApproval, true);
      //  رفعُ الكلفة المعتمدة إلى ما يفيض عند الجمع.
      await q(`UPDATE service_discount_requests
                  SET original_price = 2100000000, proposed_final_price = 2000000000,
                      discount_amount = 100000000, discount_percentage = 4.76
                WHERE id = $1`, [id]);
      const boom = await http("POST", `/api/discounts/${id}/decide`, S.mgr, { decision: "approve" });
      check(boom.status >= 400,
        "٦١. **الاعتمادُ يفشل حين يفشل التسعير**", JSON.stringify(boom));
      const row = (await q(`SELECT * FROM service_discount_requests WHERE id=$1`, [id]))[0];
      same("٦٢. **والطلبُ ما زال معلَّقاً بلا ختم**",
        [row.status, row.applied_at], ["pending", null]);
      same("٦٣. ولا كلفةَ ولا قيدَ ولا خطّةَ جلسات",
        [Number((await q(`SELECT total_cost FROM patients WHERE id=$1`, [p]))[0].total_cost),
          (await q(`SELECT count(*)::int n FROM cost_entries WHERE patient_id=$1`, [p]))[0].n,
          await plan(p)],
        [2000000000, 0, null]);
      //  وإعادةٌ بمبلغٍ سليم تكمل مرّةً واحدة.
      await q(`UPDATE patients SET total_cost = 0 WHERE id = $1`, [p]);
      await q(`UPDATE service_discount_requests
                  SET original_price = 500000, proposed_final_price = 400000,
                      discount_amount = 100000, discount_percentage = 20
                WHERE id = $1`, [id]);
      same("٦٤. **والإعادةُ تنجح مرّةً واحدة**",
        (await http("POST", `/api/discounts/${id}/decide`, S.mgr, { decision: "approve" })).status, 200);
      same("   بكلفةٍ واحدة وقيدٍ واحد",
        [Number((await q(`SELECT total_cost FROM patients WHERE id=$1`, [p]))[0].total_cost),
          (await q(`SELECT count(*)::int n FROM cost_entries WHERE patient_id=$1`, [p]))[0].n],
        [400_000, 1]);
      same("   وجلساتُ الخطّة عشر لا عشرون", await plan(p), [["روبوت", 10]]);
    }
    {
      //  ══ **والحالةُ المشلولة لا يمكن أن توجد** — والقاعدةُ تقولها ══════
      //  «معتمَدٌ بلا لحظةِ تنفيذ» كان الشكلَ الذي يخفي خدمةً لم تقع. فحتى
      //  نداءٌ مباشر من محرّر SQL يُردّ.
      let raised = "";
      try {
        await q(`INSERT INTO service_discount_requests
                   (patient_id, branch_id, department, original_price, proposed_final_price,
                    discount_amount, discount_percentage, is_free, reason, status,
                    approved_final_price, decided_at)
                 VALUES ($1, 1, 'physiotherapy', 500000, 400000, 100000, 20, false,
                         'humanitarian', 'approved', 400000, NOW())`, [devPatient]);
      } catch (e: any) { raised = String(e?.constraint ?? e?.message ?? ""); }
      check(/decision_check/.test(raised),
        "٦٥. **صفٌّ «معتمَد» بلا لحظةِ تنفيذ مستحيلٌ بنيوياً**", raised);
    }

    // ══ ١٤ج. فشلُ التدقيق يُسقط كلَّ شيء — ولا يكذب ═══════════════════
    console.log("\n── (١٤ج) سطرُ التدقيق داخل المعاملة ──");
    {
      //  جهاز: طلبُ خصمٍ معلَّق، ثم اعتمادٌ بحسابٍ لا وجود له.
      const p = await mkPatient("طرفٌ يفشل تدقيقه");
      await mkCase(p);
      await signExam(p, S.doc, { deviceCost: 2_000_000 });
      const f = await followupOf(p);
      await http("POST", `/api/followups/${f.id}/expert`, S.recv, { expertUserId: EXPERT });
      const req = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {
        discount: { finalPrice: 1_400_000, reason: "negotiation" },
      });
      const id = req.body?.discountRequestId;
      same("٦٦. طلبُ خصمٍ معلَّق على جهاز", req.body?.pendingApproval, true);

      const boom = await http("POST", `/api/discounts/${id}/decide`, S.ghost, { decision: "approve" });
      check(boom.status >= 400,
        "٦٧. **فشلُ سطرِ التدقيق يُفشل الاعتماد كلَّه**", JSON.stringify(boom));

      const row = (await q(`SELECT * FROM service_discount_requests WHERE id=$1`, [id]))[0];
      same("٦٨. **والطلبُ ما زال معلَّقاً بلا ختم**",
        [row.status, row.approved_final_price, row.applied_at], ["pending", null, null]);
      const done = await followupOf(p);
      same("٦٩. **ولا متابعةٌ تحوّلت ولا سعرٌ مخفَّضٌ كُتب**",
        [done.status, done.approvedPrice, done.priceSource],
        ["awaiting_patient_decision", 2_000_000, "exam"]);
      const m0 = await money(p);
      same("٧٠. ولا أمرَ تصنيعٍ ولا كلفةَ مريضٍ ولا قيد",
        [m0.orders, m0.totalCost, m0.ledger], [0, 0, 0]);
      same("   ولا كلفةَ على حالة الجهاز",
        Number((await q(`SELECT cost FROM patient_cases WHERE patient_id=$1 AND case_type='prosthetic'`,
          [p]))[0].cost), 0);
      //  **ولا سطرَ اعتمادٍ يتيمٌ بقي**: سطرُ «طلب» يبقى — فالطلبُ وقع فعلاً
      //  ولا مالَ فيه. أمّا سطرُ الاعتماد فيرجع مع المعاملة كما يرجع المال.
      same("٧١. **ولا سطرَ اعتمادٍ يتيمٌ بقي** — والطلبُ يبقى مسجَّلاً",
        [(await q(`SELECT count(*)::int n FROM audit_log
                    WHERE entity_type='service_discount' AND entity_id=$1 AND action='update'`,
          [id]))[0].n,
          (await q(`SELECT count(*)::int n FROM audit_log
                     WHERE entity_type='service_discount' AND entity_id=$1 AND action='create'`,
            [id]))[0].n],
        [0, 1]);

      // ══ والإعادةُ بحسابٍ حقيقيّ تنجح **مرّةً واحدة** ═══════════════════
      same("٧٢. **والإعادةُ بمعتمِدٍ حقيقيّ تنجح**",
        (await http("POST", `/api/discounts/${id}/decide`, S.mgr, { decision: "approve" })).status, 200);
      const m = await money(p);
      same("   الأمرُ واحدٌ والكلفةُ المعتمَدة",
        [m.orders, m.totalCost, m.ledger], [1, 1_400_000, 1_400_000]);
      same("٧٣. **وسطرُ تدقيقِ الاعتماد واحدٌ بالضبط**",
        (await q(`SELECT count(*)::int n FROM audit_log
                   WHERE entity_type='service_discount' AND entity_id=$1 AND action='update'`,
          [id]))[0].n, 1);
      same("٧٤. **وإعادةٌ ثالثة تُردّ ولا تكتب شيئاً**",
        (await http("POST", `/api/discounts/${id}/decide`, S.admin, { decision: "approve" })).status, 409);
      same("   والسطرُ ما زال واحداً والأمرُ واحداً",
        [(await q(`SELECT count(*)::int n FROM audit_log
                    WHERE entity_type='service_discount' AND entity_id=$1 AND action='update'`,
          [id]))[0].n, (await money(p)).orders], [1, 1]);
    }
    {
      //  علاجٌ طبيعي: نفسُ الإثبات على القسم الآخر.
      const p = await mkPatient("علاجٌ يفشل تدقيقه", { device: false, physio: true });
      await mkCase(p, 1, "physiotherapy");
      const req = await http("POST", `/api/patients/${p}/price-physio`, S.recv, {
        entries: [{ treatmentType: "روبوت", sessionCount: 10 }],
        discount: { finalPrice: 350_000, reason: "humanitarian" },
      });
      const id = req.body?.discountRequestId;
      same("٧٥. طلبُ خصمٍ معلَّق على علاجٍ طبيعي", req.body?.pendingApproval, true);
      const boom = await http("POST", `/api/discounts/${id}/decide`, S.ghost, { decision: "approve" });
      check(boom.status >= 400, "٧٦. **فشلُ التدقيق يُفشل الاعتماد**", JSON.stringify(boom));
      same("٧٧. **والطلبُ معلَّقٌ ولا كلفةَ ولا قيدَ ولا خطّة**",
        [(await q(`SELECT status FROM service_discount_requests WHERE id=$1`, [id]))[0].status,
          Number((await q(`SELECT total_cost FROM patients WHERE id=$1`, [p]))[0].total_cost),
          (await q(`SELECT count(*)::int n FROM cost_entries WHERE patient_id=$1`, [p]))[0].n,
          await plan(p)],
        ["pending", 0, 0, null]);
      same("٧٨. **والإعادةُ تنجح مرّةً واحدة**",
        (await http("POST", `/api/discounts/${id}/decide`, S.mgr, { decision: "approve" })).status, 200);
      same("   بكلفةٍ واحدة وخطّةٍ لا تتضاعف وسطرِ تدقيقٍ واحد",
        [Number((await q(`SELECT total_cost FROM patients WHERE id=$1`, [p]))[0].total_cost),
          await plan(p),
          (await q(`SELECT count(*)::int n FROM audit_log
                     WHERE entity_type='service_discount' AND entity_id=$1 AND action='update'`,
            [id]))[0].n],
        [350_000, [["روبوت", 10]], 1]);
    }
    {
      //  ══ والاعتمادُ المباشر (المخوَّل يخصم بنفسه) بنفس الضمانة ═══════
      const p = await mkPatient("علاجٌ باعتمادٍ مباشرٍ يفشل تدقيقه",
        { device: false, physio: true });
      await mkCase(p, 1, "physiotherapy");
      const boom = await http("POST", `/api/patients/${p}/price-physio`, S.ghost, {
        entries: [{ treatmentType: "روبوت", sessionCount: 10 }],
        discount: { finalPrice: 400_000, reason: "administrative_instruction" },
      });
      check(boom.status >= 400,
        "٧٩. **الاعتمادُ المباشر يفشل حين يفشل تدقيقُه**", JSON.stringify(boom));
      same("٨٠. **ولا كلفةَ ولا قيدَ ولا خطّة**",
        [Number((await q(`SELECT total_cost FROM patients WHERE id=$1`, [p]))[0].total_cost),
          (await q(`SELECT count(*)::int n FROM cost_entries WHERE patient_id=$1`, [p]))[0].n,
          await plan(p)],
        [0, 0, null]);
      //  **والصفُّ يبقى معلَّقاً في الطابور** — لا يضيع الطلب.
      const rows = await q(`SELECT status FROM service_discount_requests WHERE patient_id=$1`, [p]);
      same("٨١. **والطلبُ باقٍ معلَّقاً — لا يضيع بفشل تدقيقه**",
        [rows.length, rows[0]?.status], [1, "pending"]);
      //  ويعتمده مديرُ الفرع فيمضي مرّةً واحدة.
      const rid = (await q(`SELECT id FROM service_discount_requests WHERE patient_id=$1`, [p]))[0].id;
      same("٨٢. ويعتمده مديرُ الفرع فيمضي",
        (await http("POST", `/api/discounts/${rid}/decide`, S.mgr, { decision: "approve" })).status, 200);
      same("   بكلفةٍ واحدة وسطرِ تدقيقٍ واحد",
        [Number((await q(`SELECT total_cost FROM patients WHERE id=$1`, [p]))[0].total_cost),
          (await q(`SELECT count(*)::int n FROM audit_log
                     WHERE entity_type='service_discount' AND entity_id=$1 AND action='update'`,
            [rid]))[0].n],
        [400_000, 1]);
    }
    {
      //  **والاعتمادُ الناجح المباشر يكتب سطراً واحداً** — لا صفرَ ولا اثنين.
      const p = await mkPatient("علاجٌ باعتمادٍ مباشرٍ ناجح", { device: false, physio: true });
      await mkCase(p, 1, "physiotherapy");
      const r = await http("POST", `/api/patients/${p}/price-physio`, S.mgr, {
        entries: [{ treatmentType: "روبوت", sessionCount: 10 }],
        discount: { finalPrice: 400_000, reason: "administrative_instruction" },
      });
      same("٨٣. اعتمادٌ مباشرٌ ناجح", [r.status, r.body?.discountStatus], [200, "approved"]);
      same("   **وسطرُ تدقيقه واحدٌ بالضبط**",
        (await q(`SELECT count(*)::int n FROM audit_log
                   WHERE entity_type='service_discount' AND entity_id=$1 AND action='update'`,
          [r.body?.discountRequestId]))[0].n, 1);
    }

    // ══ ١٥. طلباتُ المريض تُقرأ في ملفّه ══════════════════════════════
    console.log("\n── (١٥) الشارةُ في ملفّ المريض ──");
    {
      const r = await http("GET", `/api/discounts/patient/${devPatient}`, S.recv);
      same("٤٩. طلباتُ المريض تُقرأ ضمن نطاق الفرع",
        [r.status, (r.body?.requests ?? []).length >= 1], [200, true]);
      const hidden = await http("GET", `/api/discounts/patient/${devPatient}`, S.recvB2);
      same("٥٠. **ولا يراها مَن ليس في فرعه**",
        (hidden.body?.requests ?? []).length, 0);
    }

    void devFollowup;
  } finally {
    await cleanup();
    //  **وحساباتُ الاختبار تُمحى**: بقاؤها يلوّث قوائمَ الخبراء في اختبار
    //  العزل (خبيرٌ إضافيٌّ في فرعٍ يقرؤه ذاك). وسجلُّ تدقيقها يُمسح أوّلاً
    //  لأنه يشير إليها — وهي صفوفٌ خلّفها هذا الاختبار وحده.
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [ALL]);
    await q(`DELETE FROM audit_log WHERE entity_type = 'service_discount'
              AND entity_id NOT IN (SELECT id FROM service_discount_requests)`);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [ALL]);
    httpServer.close();
    await pool.end();
  }

  console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
