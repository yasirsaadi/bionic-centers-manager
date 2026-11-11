// **«طلب استرجاع مبلغ لمريض» و«نسبة مستشفى العين» التلقائية** (طلبُ المالك ٢٠٢٦-١١-٠٥، ترحيلا ١٩١ و١٩٢، §4.fz) — حيّاً على Postgres وعلى النقاط الحقيقية.
// قاعدة محلّية: `npm run test:patient-refunds`.
//
//   • **أ**: القواعدُ الخالصة — سلسلةُ العزل والخصمُ المؤجَّل، واقتراحُ تخفيض الكلفة، ومَن يطلب، وبصمةُ الورقة لا تتغيّر بانتقال الاسترجاع.
//   • **ب**: المفتاح — يشعله المسؤولُ فيطلب حاملُه، ويُفعَّل له تنبيهُ القرار مرّةً.
//   • **ج**: الطلب — بلا مفتاح ٤٠٣، والحدُّ صافي المدفوع بعد المعلَّق، والتفصيلُ إلزاميّ، والمكرّرُ وحده يُردّ، وتنبيهُ المسؤول مقروءاً.
//   • **د**: الاعتماد للمسؤول وحده — يُسأل في ذي قار عن نسبة المستشفى، ويكتب دفعةً سالبةً بيوم الاعتماد، وتنقص كلفةُ الحالة بقراره،
//     والسندُ لطالبه، ولا اعتمادَ مرّتين ولو تزامنت الضغطتان، ولا لملفٍّ في السلّة، ولا فوق ما دُفع الآن.
//   • **هـ**: الرفض بسببٍ والاسترجاعُ المباشر للمسؤول.
//   • **و**: العزلُ التلقائيّ — صفُّ مصروفٍ لكلّ دفترٍ ويوم، والاسترجاعُ المخصوم يُحمل على الغد، وغيرُ المخصوم لا يمسّه، والدفعةُ لماضٍ تُرى،
//     وما قبل يوم البدء لا يُمسّ، ولا زرّ، والاسترجاعُ سطرٌ في الصادر والمجموعُ كما كان، ولا «فرق» في تدقيق المساعد.
//   • **ز**: مربّعُ «نسبة مستشفى العين» وطلبُ التسليم — في دفتر العلاج الطبيعي وحده، ولا يُسلََّم فوق المتبقّي، والاعتمادُ ينقص المربّع لا القاصة.
//   • **ح**: الحذفُ النهائيّ والدمج يحملان طلبَ الاسترجاع.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}

function ymdShift(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const TODAY = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
const START = ymdShift(TODAY, -3), D1 = ymdShift(TODAY, -2), D2 = ymdShift(TODAY, -1), PRE = ymdShift(TODAY, -4);
//  **يومُ البدء قبل اليوم في الاختبار وحده** — قبل أيّ استيرادٍ يقرأ `@shared/hospital_ratio`.
process.env.HOSPITAL_AUTO_START_TEST = START;

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6886;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-الاسترجاع-والمستشفى";
const DQ = 9616, BG = 9617;
const ADMIN = 9624, RECV = 9625, ACC = 9626, RECV2 = 9627, MGR_BG = 9628;
const USERS = [ADMIN, RECV, ACC, RECV2, MGR_BG];
const BRANCHES = [DQ, BG];

const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: DQ, accessibleBranches: BRANCHES, displayName: "المسؤول", permissions: {} },
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: DQ, accessibleBranches: [DQ], displayName: "زينب", permissions: {} },
  acc: { userId: ACC, role: "accountant", isAdmin: false, branchId: DQ, accessibleBranches: [DQ], displayName: "المحاسب", permissions: {} },
  recv2: { userId: RECV2, role: "reception", isAdmin: false, branchId: DQ, accessibleBranches: [DQ], displayName: "هند", permissions: {} },
  mgrBg: { userId: MGR_BG, role: "branch_manager", isAdmin: false, branchId: BG, accessibleBranches: [BG], displayName: "مدير بغداد", permissions: {} },
};

async function main() {
  const express = (await import("express")).default;
  const { createServer } = await import("http");
  const { pool, db } = await import("./db");
  const { registerRoutes } = await import("./routes");
  const { storage } = await import("./storage");
  const hospital = await import("./hospital_ratio/store");
  const { cashBookPeriod } = await import("./cash_book/store");
  const { sheetFingerprint } = await import("./cash_book/prints");
  const { hospitalSeries, HOSPITAL_AUTO_START, HOSPITAL_AUTO_START_DEFAULT, hospitalAutoApplies } = await import("@shared/hospital_ratio");
  const { canRequestRefund, defaultReduceCost, parseReturnedSessions, suggestReturnedSessions, returnedSessionsLine } = await import("@shared/patient_refunds");
  const { resolvePurchasedSessions } = await import("@shared/pricing");
  const refundStore = await import("./patient_refunds/store");
  const { eligibleStaffEvents, staffEventDeliverable } = await import("@shared/staff_notifications");

  const q = async <T = any>(text: string, params: any[] = []): Promise<T[]> => (await pool.query(text, params)).rows as T[];
  const http = async (method: string, path: string, session: any, body?: any) => {
    const res = await fetch(BASE + path, {
      method,
      headers: { "content-type": "application/json", "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64") },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json: any = null;
    try { json = await res.json(); } catch { /* empty */ }
    return { status: res.status, body: json };
  };
  const pids: number[] = [];
  async function mkPatient(label: string, cases: { type: string; cost: number }[], branch = DQ) {
    const total = cases.reduce((s, c) => s + c.cost, 0);
    const [p] = await q<{ id: number }>(
      `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id, total_cost, patient_classification)
       VALUES ($1,'07709998877',$2,'40','172','78','حالة',$3,$4,'new') RETURNING id`, [`${MARK} ${label}`, MARK, branch, total]);
    pids.push(Number(p.id));
    const caseIds: Record<string, number> = {};
    for (const c of cases) {
      const [r] = await q<{ id: number }>(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
         VALUES ($1,$2,$3,$4,'manual','active') RETURNING id`, [p.id, branch, c.type, c.cost]);
      caseIds[c.type] = Number(r.id);
    }
    return { id: Number(p.id), cases: caseIds };
  }
  /** دفعةٌ بيوم بغداد (الظهر) — لأيّامٍ ماضية يُختبر عليها العزل. */
  const payOn = (patientId: number, caseId: number, amount: number, day: string, tag = "علاج طبيعي", branch = DQ) =>
    q(`INSERT INTO payments (patient_id, branch_id, amount, case_id, payment_treatment_type, notes, date)
       VALUES ($1,$2,$3,$4,$5,$6,$7::timestamp) RETURNING id`, [patientId, branch, amount, caseId, tag, MARK, `${day} 09:00:00`]);
  const hospitalRows = (book: "physio" | "prosthetic") => q<{ day: string; amount: number; created_by: string }>(
    `SELECT expense_date::text AS day, amount, created_by FROM expenses WHERE branch_id=$1 AND category='hospital_percentage' AND section=$2 ORDER BY expense_date, id`, [DQ, book]);
  const outbox = (ev: string) => q(`SELECT text, link_path, exclude_user_id, target_user_ids FROM staff_notification_outbox
      WHERE event_type = $1 AND (text LIKE $2 OR target_user_ids && $3::int[]) ORDER BY id`, [ev, `%${MARK}%`, USERS]);

  async function cleanup() {
    await q(`DELETE FROM staff_notification_outbox WHERE event_type IN ('refund_request_pending','refund_request_decided','hospital_delivery_pending','hospital_delivery_decided') AND (text LIKE $1 OR target_user_ids && $2::int[] OR text LIKE '%مستشفى العين%')`, [`%${MARK}%`, USERS]);
    await q(`DELETE FROM staff_notification_prefs WHERE user_id = ANY($1::int[])`, [USERS]);
    await q(`DELETE FROM hospital_ratio_deliveries WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
    await q(`DELETE FROM patient_refund_requests WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
    for (const id of (await q<{ id: number }>(`SELECT id FROM patients WHERE referral_source = $1`, [MARK])).map((r) => Number(r.id))) {
      await storage.deletePatient(id).catch((e: any) => console.error("cleanup", id, e?.message));
    }
    await q(`DELETE FROM expenses WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
    await q(`DELETE FROM cash_book_entries WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
    await q(`DELETE FROM cash_book_openings WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
    await q(`DELETE FROM audit_log WHERE branch_id = ANY($1::int[]) OR (entity_type = 'system_user' AND entity_id = ANY($2::int[]))`, [BRANCHES, USERS]);
  }

  await q(`INSERT INTO branches (id, name) VALUES ($1,$2),($3,$4) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
    [DQ, `${MARK} ذي قار`, BG, `${MARK} بغداد`]);
  for (const [id, role, br, viewPay] of [[ADMIN, "admin", DQ, true], [RECV, "reception", DQ, true], [ACC, "accountant", DQ, true],
    [RECV2, "reception", DQ, false], [MGR_BG, "branch_manager", BG, true]] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,can_request_refund,can_view_payments)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,false,$7)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               is_active=true, can_request_refund=false, can_view_payments=EXCLUDED.can_view_payments, display_name=EXCLUDED.display_name`,
      [id, `pr_u${id}`, (S as any)[Object.keys(S).find((k) => (S as any)[k].userId === id)!].displayName, role, br,
       JSON.stringify(role === "admin" ? BRANCHES : [br]), viewPay]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res: any, next: any) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")) } : {};
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
  await new Promise((r) => httpServer.once("listening", r));

  try {
    // ══ أ. القواعد ═════════════════════════════════════════════════════════════════════════════
    console.log("\n── أ. القواعد ──");
    same("أ١. يومُ البدء الحقيقيّ غداً (٢٠٢٦-١١-٠٦)، والاختبارُ وحده يقدّمه", [HOSPITAL_AUTO_START_DEFAULT, HOSPITAL_AUTO_START, hospitalAutoApplies(PRE)], ["2026-11-06", START, false]);
    const ser = hospitalSeries([
      { day: "a", positive: 700_000, deducted: 0 }, { day: "b", positive: 100_000, deducted: 300_000 },
      { day: "c", positive: 150_000, deducted: 0 }, { day: "d", positive: 300_000, deducted: 0 },
    ], 10);
    same("أ٢. **الخصمُ يُحمل على الغد** ولا مصروفَ سالب: ٧٠ ⟵ (١٠−٣٠) صفرٌ ويُحمل ٢٠ ⟵ (١٥−٢٠) صفرٌ ويُحمل ٥ ⟵ ٣٠−٥ = ٢٥",
      ser.map((r) => [r.amount, r.carriedIn, r.carriedOut]), [[70_000, 0, 0], [0, 0, 20_000], [0, 20_000, 5_000], [25_000, 5_000, 0]]);
    same("أ٣. **مجموعُ العزل عُشرُ الصافي** متى استُوفي المؤجَّل (٧٠٠+١٠٠−٣٠٠+١٥٠+٣٠٠ = ٩٥٠ ⟵ ٩٥)", ser.reduce((t, r) => t + r.amount, 0), 95_000);
    same("أ٤. اقتراحُ تخفيض الكلفة: أوقف العلاج/جهازٌ لم يُصنع نعم، ودفعٌ زائد وغيرُه لا",
      ["stopped_treatment", "device_not_made", "overpaid", "other"].map(defaultReduceCost), [true, true, false, false]);
    same("أ٥. مَن يطلب: المسؤولُ وحاملُ المفتاح وحدهما",
      [canRequestRefund({ isAdmin: true }), canRequestRefund({ permissions: { canRequestRefund: true } }), canRequestRefund({ permissions: {} })], [true, true, false]);
    //  بصمةُ الورقة: الاسترجاعُ في الصادر لا يغيّرها عن ورقةٍ طُبعت والاسترجاعُ سالبٌ في الوارد.
    const legacy = { branch: { id: 1 }, book: "physio", day: "x", opening: null, ratio: null, reserves: null,
      rows: [{ source: "payment", id: 5, column: "income", amount: 100, note: "دفعة: أ", category: null, at: "2026-01-01T08:00:00Z" },
        { source: "payment", id: 6, column: "income", amount: -30, note: "دفعة: ب", category: null, at: "2026-01-01T09:00:00Z" },
        { source: "expense", id: 9, column: "expense", amount: 10, note: "كهرباء", category: "utilities", at: "2026-01-01T07:00:00Z" }],
      totals: { income: 70, outflow: 10, dayNet: 60, prevRemaining: 0, remaining: 60 } };
    const moved = { ...legacy, refundTotal: 30,
      rows: [legacy.rows[0], { source: "expense", id: 9, column: "expense", amount: 10, note: "كهرباء", category: "utilities", at: "2026-01-01T07:00:00Z" },
        { source: "payment", id: 6, column: "expense", kind: "refund", amount: 30, note: "استرجاع: ب", legacyNote: "دفعة: ب", category: null, at: "2026-01-01T09:00:00Z" }],
      totals: { income: 100, outflow: 40, dayNet: 60, prevRemaining: 0, remaining: 60 } };
    same("أ٦. **بصمةُ ما طُبع لا تتغيّر** بانتقال الاسترجاع إلى الصادر — فلا «عُدّلت بعد الطباعة» بلا تغيير",
      sheetFingerprint(moved, []) === sheetFingerprint(legacy, []), true);

    // ══ تمهيد: بدايةُ الدفترين قبل يوم البدء، وسطرُ نسبةٍ قديمٌ بالزرّ قبله ═══════════════════════════
    for (const book of ["devices", "physio"]) {
      await http("POST", "/api/cash-book/opening", S.admin, { branchId: DQ, book, openingDate: PRE, cash: 1_000_000 });
    }
    await q(`INSERT INTO expenses (branch_id, category, section, description, amount, expense_date, payment_method, created_by)
             VALUES ($1,'hospital_percentage','physio','نسبة المستشفى 10٪ من وارد اليوم',12345,$2,'نقدي',$3)`, [DQ, PRE, String(ADMIN)]);

    const A = await mkPatient("أحمد", [{ type: "physiotherapy", cost: 700_000 }]);
    const B = await mkPatient("باقر", [{ type: "prosthetic", cost: 2_000_000 }]);
    const C = await mkPatient("كرار", [{ type: "physiotherapy", cost: 100_000 }]);
    await payOn(A.id, A.cases.physiotherapy, 700_000, D1);
    await payOn(B.id, B.cases.prosthetic, 200_000, D2, "أطراف صناعية");
    await payOn(C.id, C.cases.physiotherapy, 100_000, TODAY);

    // ══ ب. المفتاح ═════════════════════════════════════════════════════════════════════════════
    console.log("\n── ب. المفتاح ──");
    same("ب١. **بلا مفتاح ⟵ ٤٠٣** للنافذة والطلب",
      [(await http("GET", `/api/patients/${A.id}/refund-options`, S.recv)).status,
       (await http("POST", "/api/patient-refunds", S.recv, { patientId: A.id, caseId: A.cases.physiotherapy, amount: 1000, reason: "overpaid", detail: "تجربة" })).status],
      [403, 403]);
    const p1 = await http("PATCH", `/api/admin/users/${RECV}`, S.admin, { canRequestRefund: true });
    same("ب٢. المسؤولُ يشعله ⟵ ٢٠٠، ويُفعَّل له تنبيهُ القرار، وسطرُ تدقيقٍ على الحساب",
      [p1.status, (await q(`SELECT 1 FROM staff_notification_prefs WHERE user_id=$1 AND event_type='refund_request_decided'`, [RECV])).length,
       (await q(`SELECT 1 FROM audit_log WHERE entity_type='system_user' AND entity_id=$1 AND new_values::text LIKE '%canRequestRefund%'`, [RECV])).length > 0],
      [200, 1, true]);

    // ══ ج. الطلب ═══════════════════════════════════════════════════════════════════════════════
    console.log("\n── ج. الطلب ──");
    const opts = await http("GET", `/api/patients/${A.id}/refund-options`, S.recv);
    same("ج١. النافذة: القسمُ بصافي ما دُفع والمتاح، وفي ذي قار سؤالُ النسبة",
      [opts.status, opts.body?.cases?.[0]?.netPaid, opts.body?.cases?.[0]?.available, opts.body?.askHospital, opts.body?.cases?.[0]?.suggestDeductHospital],
      [200, 700_000, 700_000, true, true]);
    //  «كم جلسةً تُرجَع» إلزاميّةٌ للعلاج الطبيعي منذ ترحيل ١٩٣ — والأقسامُ أعلاه بلا جلساتٍ مسجَّلة، فصفرٌ صادق.
    const ask = (s: any, body: any) => http("POST", "/api/patient-refunds", s, { sessionsReturned: [], ...body });
    const base = { patientId: A.id, caseId: A.cases.physiotherapy, reason: "stopped_treatment", detail: "حضر ٤ جلسات من ١٠ وسافر" };
    same("ج٢. فوق المدفوع ⟵ ٤٠٩ · بلا تفصيل ⟵ ٤٠٠ · بلا سبب ⟵ ٤٠٠ · قسمٌ ليس للمريض ⟵ ٤٠٩",
      [(await ask(S.recv, { ...base, amount: 800_000 })).status, (await ask(S.recv, { ...base, amount: 1000, detail: "x" })).status,
       (await ask(S.recv, { ...base, amount: 1000, reason: "nope" })).status, (await ask(S.recv, { ...base, caseId: B.cases.prosthetic, amount: 1000 })).status],
      [409, 400, 400, 409]);
    const r1 = await ask(S.recv, { ...base, amount: 300_000 });
    same("ج٣. **الطلب ⟵ ٢٠١ معلَّقاً** ولا دفعةَ تُكتب، والبطاقةُ بالكلمات وما يبقى",
      [r1.status, r1.body?.status, r1.body?.amountWords, r1.body?.netAfter, (await q(`SELECT count(*)::int n FROM payments WHERE patient_id=$1 AND amount<0`, [A.id]))[0].n],
      [201, "pending", "ثلاثمئة ألف دينار", 400_000, 0]);
    same("ج٤. **المكرّرُ وحده يُردّ** — والطلبُ الثاني بتفصيلٍ آخر يُقبل، والثالثُ فوق المتاح بعد المعلَّق ⟵ ٤٠٩",
      [(await ask(S.recv, { ...base, amount: 300_000 })).status, (await ask(S.recv, { ...base, amount: 350_000, detail: "تجربةٌ ثانية للرفض" })).status,
       (await ask(S.recv, { ...base, amount: 60_000, detail: "ثالثٌ فوق المتاح" })).status],
      [409, 201, 409]);
    const pend = await outbox("refund_request_pending");
    check(pend.length === 2 && pend[0].text.includes("أحمد") && pend[0].text.includes("300,000") && pend[0].text.includes("ثلاثمئة ألف دينار")
      && pend[0].text.includes("أوقف العلاج") && pend[0].link_path === "/payment-corrections#refunds" && pend[0].exclude_user_id === RECV,
      "ج٥. **تنبيهُ المسؤول مقروءاً**: المريضُ والمبلغُ رقماً وكلمات والسبب، ورابطُه إلى قسم الاسترجاع", JSON.stringify(pend[0]));

    // ══ د. الاعتماد ═════════════════════════════════════════════════════════════════════════════
    console.log("\n── د. الاعتماد ──");
    const id1 = r1.body.id;
    same("د١. **لغير المسؤول ⟵ ٤٠٣**، والعدّادُ للمسؤول وحده",
      [(await http("POST", `/api/patient-refunds/${id1}/approve`, S.recv, { deductHospital: true })).status,
       (await http("GET", "/api/patient-refunds/pending-count", S.recv)).status, (await http("GET", "/api/patient-refunds/pending-count", S.admin)).body?.count],
      [403, 403, 2]);
    same("د٢. **في ذي قار يُسأل المسؤول**: بلا جواب نسبة المستشفى ⟵ ٤٠٠ ولا يتغيّر شيء",
      [(await http("POST", `/api/patient-refunds/${id1}/approve`, S.admin, {})).status, (await q(`SELECT status FROM patient_refund_requests WHERE id=$1`, [id1]))[0].status],
      [400, "pending"]);
    const [ap1, ap2] = await Promise.all([
      http("POST", `/api/patient-refunds/${id1}/approve`, S.admin, { deductHospital: true, reduceCost: true }),
      http("POST", `/api/patient-refunds/${id1}/approve`, S.admin, { deductHospital: true, reduceCost: true }),
    ]);
    same("د٣. **ضغطتان معاً ⟵ واحدةٌ تنجح** والأخرى ٤٠٩", [ap1.status, ap2.status].sort(), [200, 409]);
    const refundPays = await q(`SELECT id, amount, branch_id, case_id, payment_treatment_type, (date + interval '3 hours')::date::text AS day FROM payments WHERE patient_id=$1 AND amount<0`, [A.id]);
    const reqRow = (await q(`SELECT * FROM patient_refund_requests WHERE id=$1`, [id1]))[0];
    same("د٤. **دفعةٌ سالبةٌ واحدة بيوم الاعتماد** في فرع الطلب وقسمه، ومربوطةٌ بالطلب، وقرارا المسؤول محفوظان",
      [refundPays.length, refundPays[0]?.amount, refundPays[0]?.branch_id, refundPays[0]?.case_id, refundPays[0]?.payment_treatment_type, refundPays[0]?.day,
       reqRow.payment_id === refundPays[0]?.id, reqRow.deduct_hospital, reqRow.reduce_cost, reqRow.cost_before, reqRow.cost_after],
      [1, -300_000, DQ, A.cases.physiotherapy, "علاج طبيعي", TODAY, true, true, true, 700_000, 400_000]);
    same("د٥. **كلفةُ الحالة نقصت بقراره** (٧٠٠ ⟵ ٤٠٠) والكلّيةُ معها، وقيدٌ في دفتر الكلف",
      [(await q(`SELECT cost FROM patient_cases WHERE id=$1`, [A.cases.physiotherapy]))[0].cost, (await q(`SELECT total_cost FROM patients WHERE id=$1`, [A.id]))[0].total_cost,
       (await q(`SELECT amount FROM cost_entries WHERE patient_id=$1 AND source='refund_cost_reduction'`, [A.id])).map((r: any) => r.amount)],
      [400_000, 400_000, [-300_000]]);
    const dec = await outbox("refund_request_decided");
    check(dec.length === 1 && dec[0].target_user_ids?.[0] === RECV && dec[0].text.includes(`«استمارة استرداد مبلغ» رقم ${id1}`) && dec[0].text.includes("300,000"),
      "د٦. **تنبيهُ الطالب** برقم الاستمارة ليطبعها (§4.gi)، وموجَّهٌ إليه وحده", JSON.stringify(dec));
    same("د٧. سطرا تدقيق: دفعةُ الاسترجاع والاعتماد",
      (await q(`SELECT entity_type, action FROM audit_log WHERE branch_id=$1 AND (entity_type='payment' OR (entity_type='patient_refund_request' AND entity_id=$2)) ORDER BY id`, [DQ, id1]))
        .map((r: any) => `${r.entity_type}:${r.action}`), ["patient_refund_request:create", "payment:create", "patient_refund_request:approve"]);
    same("د٨. **السند**: لطالبه ٢٠٠، ولمن لا يرى الدفعات ٤٠٣، وللمسؤول ٢٠٠ بالكلمات",
      [(await http("GET", `/api/patient-refunds/${id1}`, S.recv)).status, (await http("GET", `/api/patient-refunds/${id1}`, S.recv2)).status,
       (await http("GET", `/api/patient-refunds/${id1}`, S.admin)).body?.amountWords], [200, 403, "ثلاثمئة ألف دينار"]);
    //  فوق ما دُفع الآن: الطلبُ الثاني (٣٥٠ ألف) والصافي صار ٤٠٠ ألف — فيُقبل؛ ونُنقص الصافي أوّلاً بدفعةٍ سالبةٍ أخرى ليصير ٣٠٠ ألف.
    const id2 = (await q(`SELECT id FROM patient_refund_requests WHERE patient_id=$1 AND status='pending'`, [A.id]))[0].id;
    await payOn(A.id, A.cases.physiotherapy, -100_000, TODAY);
    same("د٩. **لا اعتمادَ فوق صافي ما دُفع الآن** (٣٥٠ ألف وصافيه ٣٠٠ ألف) ⟵ ٤٠٩ ويبقى معلَّقاً",
      [(await http("POST", `/api/patient-refunds/${id2}/approve`, S.admin, { deductHospital: true })).status, (await q(`SELECT status FROM patient_refund_requests WHERE id=$1`, [id2]))[0].status],
      [409, "pending"]);
    await q(`DELETE FROM payments WHERE patient_id=$1 AND amount=-100000`, [A.id]);
    //  ملفٌّ في السلّة.
    const T = await mkPatient("تحسين", [{ type: "physiotherapy", cost: 200_000 }]);
    await payOn(T.id, T.cases.physiotherapy, 200_000, PRE);  //  قبل يوم البدء — فلا يدخل عزلَ المربّع.
    const rt = await ask(S.recv, { patientId: T.id, caseId: T.cases.physiotherapy, amount: 50_000, reason: "overpaid", detail: "دفع مرّتين" });
    const trash = await import("./patients/trash_store");
    const actor: any = { userId: ADMIN, isAdmin: true, role: "admin", displayName: "المسؤول", scope: null, permissions: {} };
    await trash.softDeletePatient({ patientId: T.id, reason: MARK, actor });
    same("د١٠. **ملفٌّ في السلّة لا يُسترجع له** ⟵ ٤٠٩ ويبقى معلَّقاً",
      [rt.status, (await http("POST", `/api/patient-refunds/${rt.body.id}/approve`, S.admin, { deductHospital: false })).status,
       (await q(`SELECT status FROM patient_refund_requests WHERE id=$1`, [rt.body.id]))[0].status], [201, 409, "pending"]);
    await trash.restorePatient({ patientId: T.id, actor });
    await q(`UPDATE patient_refund_requests SET status='rejected' WHERE id=$1`, [rt.body.id]);

    // ══ هـ. الرفض والاسترجاعُ المباشر ═══════════════════════════════════════════════════════════
    console.log("\n── هـ. الرفض والمباشر ──");
    same("هـ١. الرفضُ بلا سبب ⟵ ٤٠٠، وبسببٍ ⟵ ٢٠٠ ولا دفعة، والسببُ يصل الطالب",
      [(await http("POST", `/api/patient-refunds/${id2}/reject`, S.admin, { note: "" })).status,
       (await http("POST", `/api/patient-refunds/${id2}/reject`, S.admin, { note: "المبلغ غير صحيح" })).status,
       (await q(`SELECT count(*)::int n FROM payments WHERE patient_id=$1 AND amount<0`, [A.id]))[0].n,
       (await outbox("refund_request_decided")).some((r: any) => r.text.includes("رُفض") && r.text.includes("المبلغ غير صحيح"))],
      [400, 200, 1, true]);
    const direct = await ask(S.admin, { patientId: B.id, caseId: B.cases.prosthetic, amount: 100_000, reason: "overpaid", detail: "زيادة في الدفع",
      deductHospital: false, reduceCost: false });
    same("هـ٢. **المسؤولُ يسترجع مباشرةً** ⟵ ٢٠١ معتمداً بقراريه، والكلفةُ كما هي، ولا تنبيهَ له",
      [direct.status, direct.body?.status, direct.body?.deductHospital, (await q(`SELECT cost FROM patient_cases WHERE id=$1`, [B.cases.prosthetic]))[0].cost,
       (await outbox("refund_request_pending")).length], [201, "approved", false, 2_000_000, 3]);
    same("هـ٣. ملفُّ المريض يعرض طلباتِه بحالها", (await http("GET", `/api/patients/${A.id}/refunds`, S.recv)).body?.map((r: any) => r.status), ["rejected", "approved"]);

    // ══ و. العزلُ التلقائيّ ═════════════════════════════════════════════════════════════════════
    console.log("\n── و. العزل التلقائيّ ──");
    const sheetOf = async (book: string, day = TODAY, s: any = S.acc) => (await http("GET", `/api/cash-book?branchId=${DQ}&book=${book}&date=${day}`, s)).body;
    const phys = await sheetOf("physio");
    same("و١. **صفُّ مصروفٍ لكلّ دفترٍ ويوم** يكتبه الخادم: العلاج ٧٠ ألفاً يومَ دفع أحمد، واليومَ (١٠ − ٣٠ خصم) لا شيء، والأطراف ٢٠ ألفاً",
      [(await hospitalRows("physio")).map((r) => [r.day, r.amount]), (await hospitalRows("prosthetic")).map((r) => [r.day, r.amount])],
      [[[PRE, 12345], [D1, 70_000]], [[D2, 20_000]]]);
    same("و٢. **وما قبل يوم البدء لا يُمسّ** — سطرُ الزرّ القديم بمبلغه وكاتبه", (await hospitalRows("physio"))[0].created_by, String(ADMIN));
    const box = phys?.hospitalBox;
    same("و٣. **المربّع**: عزلُ العلاج والأطراف اليوم صفر، وخصمُ الاسترجاع ٣٠ ألفاً، والمتبقّي من أمس ٩٠ ألفاً، والمؤجَّلُ ٢٠ ألفاً",
      [box?.books?.map((b: any) => [b.book, b.amount]), box?.deductionToday, box?.prev, box?.today, box?.remaining, box?.deferred],
      [[["devices", 0], ["physio", 0]], 30_000, 90_000, 0, 90_000, 20_000]);
    check(!(await sheetOf("devices"))?.hospitalBox, "و٤. والمربّعُ في دفتر «علاج طبيعي» وحده");
    same("و٥. **الاسترجاعُ سطرٌ أحمر في الصادر** بمبلغه موجباً، والوارد ١٠٠ ألف، ومجموعُ اليوم كما كان (١٠٠ − ٣٠٠)",
      [phys.rows.filter((r: any) => r.kind === "refund").map((r: any) => [r.column, r.amount, r.note.startsWith("استرجاع: ")]), phys.totals.income, phys.totals.dayNet, phys.refundTotal],
      [[["expense", 300_000, true]], 100_000, -200_000, 300_000]);
    //  يومٌ فيه وارد (D1) — فبلا هذا الحارس كان الزرُّ القديم يكتب نسبتَه.
    const btn = await http("POST", "/api/cash-book/ratio", S.admin, { branchId: DQ, book: "physio", date: D1, kind: "hospital_ratio" });
    same("و٦. **لا زرَّ للنسبة** من يوم البدء ⟵ ٤٠٠ برسالة «تُعزل تلقائياً»، ولو كان في اليوم وارد",
      [btn.status, String(btn.body?.error ?? "").includes("تُعزل تلقائياً")], [400, true]);
    //  الاسترجاعُ الذي قال فيه المسؤولُ «لا»: لا يمسّ عزلَ الأطراف (لا وارد اليوم فيها فلا شيء يُخصم ولا يُحمل).
    same("و٧. **الاسترجاعُ غيرُ المخصوم لا يمسّ العزل** — الأطرافُ اليوم بلا خصمٍ ولا مؤجَّل",
      [box?.books?.find((b: any) => b.book === "devices")?.deduction, box?.books?.find((b: any) => b.book === "devices")?.carriedOut], [0, 0]);
    await payOn(A.id, A.cases.physiotherapy, 50_000, D1);
    same("و٨. **دفعةٌ لماضٍ تُرى بلا زرّ** — عزلُ يومها صار ٧٥ ألفاً بعد المطابقة", [await hospital.reconcileBranch(DQ), (await hospitalRows("physio")).map((r) => r.amount)], [1, [12345, 75_000]]);
    same("و٩. والمطابقةُ ثانيةً لا تغيّر شيئاً", await hospital.reconcileBranch(DQ), 0);
    const per = await cashBookPeriod(DQ, "physio", PRE, TODAY);
    same("و١٠. **تدقيقُ المساعد لا يرى «فرقاً» في أيّام العزل** — الفرقُ الوحيد سطرُ الزرّ القديم قبل البدء",
      (per as any)?.hospitalMismatches?.map((m: any) => m.date), [PRE]);
    //  صفٌّ زائدٌ يُكتب بيدٍ في يوم عزلٍ يُحذف بالمطابقة (صفٌّ واحدٌ لليوم).
    await q(`INSERT INTO expenses (branch_id, category, section, description, amount, expense_date, payment_method, created_by)
             VALUES ($1,'hospital_percentage','physio','يدوي',999,$2,'نقدي','x')`, [DQ, D1]);
    same("و١١. **صفٌّ واحدٌ لليوم** — الزائدُ يُحذف بالمطابقة", [await hospital.reconcileBranch(DQ), (await hospitalRows("physio")).map((r) => r.amount)], [1, [12345, 75_000]]);

    // ══ ز. التسليم للمستشفى ════════════════════════════════════════════════════════════════════
    console.log("\n── ز. التسليم ──");
    const deliver = (s: any, body: any) => http("POST", "/api/hospital-ratio/deliveries", s, body);
    same("ز١. الاستقبالُ لا يطلب ⟵ ٤٠٣ · فرعٌ بلا نسبة ⟵ ٤٠٠",
      [(await deliver(S.recv, { amount: 1000 })).status, (await deliver(S.mgrBg, { amount: 1000 })).status], [403, 400]);
    const dv1 = await deliver(S.acc, { amount: 50_000, note: "تسليم الأسبوع" });
    same("ز٢. **المحاسبُ يطلب** ⟵ ٢٠١ معلَّقاً، والمربّعُ لا ينقص، والطلبُ تحت المربّع",
      [dv1.status, dv1.body?.status, (await sheetOf("physio"))?.hospitalBox?.remaining, (await sheetOf("physio"))?.pendingHospitalDeliveries?.map((p: any) => p.amount)],
      [201, "pending", 95_000, [50_000]]);
    same("ز٣. **لا يُطلب فوق المتاح بعد المعلَّق** (٩٥ − ٥٠ = ٤٥) ⟵ ٤٠٩", (await deliver(S.acc, { amount: 46_000 })).status, 409);
    const hp = await outbox("hospital_delivery_pending");
    check(hp.length === 1 && hp[0].text.includes("50,000") && hp[0].text.includes("خمسون ألف دينار") && hp[0].text.includes("95,000") && hp[0].link_path === "/payment-corrections#hospital",
      "ز٤. **تنبيهُ المسؤول**: المبلغُ رقماً وكلمات والمتبقّي الآن وبعده", JSON.stringify(hp));
    same("ز٥. الاعتمادُ للمسؤول وحده ⟵ ٤٠٣", (await http("POST", `/api/hospital-ratio/deliveries/${dv1.body.id}/approve`, S.acc, {})).status, 403);
    const cashBefore = (await sheetOf("physio")).totals.remaining;
    const apv = await http("POST", `/api/hospital-ratio/deliveries/${dv1.body.id}/approve`, S.admin, {});
    const after = await sheetOf("physio");
    same("ز٦. **الاعتمادُ ينقص المربّعَ اليوم لا القاصة**، ويصل الطالب",
      [apv.status, apv.body?.deliveredOn, after.hospitalBox?.delivered, after.hospitalBox?.remaining, after.totals.remaining === cashBefore,
       (await outbox("hospital_delivery_decided")).some((r: any) => r.target_user_ids?.[0] === ACC && r.text.includes("اعتُمد"))],
      [200, TODAY, 50_000, 45_000, true, true]);
    const dv2 = await deliver(S.acc, { amount: 10_000 });
    same("ز٧. الرفضُ بسبب ⟵ لا يتغيّر شيء، وسجلُّ التسليم للمحاسب بالحالين",
      [(await http("POST", `/api/hospital-ratio/deliveries/${dv2.body.id}/reject`, S.admin, { note: "لم يُسلَّم بعد" })).status,
       (await sheetOf("physio")).hospitalBox?.remaining,
       (await http("GET", "/api/hospital-ratio/deliveries", S.acc)).body?.map((r: any) => [r.amount, r.status])],
      [200, 45_000, [[10_000, "rejected"], [50_000, "approved"]]]);
    same("ز٨. **المسؤولُ يسلّم مباشرةً** ⟵ ٢٠١ معتمداً، ولا فوق المتبقّي ⟵ ٤٠٩",
      [(await deliver(S.admin, { branchId: DQ, amount: 5_000 })).body?.status, (await deliver(S.admin, { branchId: DQ, amount: 41_000 })).status,
       (await sheetOf("physio")).hospitalBox?.remaining], ["approved", 409, 40_000]);

    // ══ ط. حرّاسُ المراجعة ═════════════════════════════════════════════════════════════════════
    console.log("\n── ط. الحرّاس ──");
    //  خطّةُ أقساطٍ نشطة على الحالة: الاسترجاعُ يُردّ — والمسؤولُ المباشرُ لا يترك طلباً يتيماً.
    const I = await mkPatient("إيناس", [{ type: "physiotherapy", cost: 600_000 }]);
    await payOn(I.id, I.cases.physiotherapy, 200_000, D2);
    await q(`INSERT INTO installment_plans (patient_id, branch_id, total_amount, installment_amount, number_of_installments, start_date, status, case_id)
             VALUES ($1,$2,400000,100000,4,$3,'active',$4)`, [I.id, DQ, TODAY, I.cases.physiotherapy]);
    const di = await ask(S.admin, { patientId: I.id, caseId: I.cases.physiotherapy, amount: 50_000, reason: "overpaid", detail: "زيادة",
      deductHospital: false, reduceCost: false });
    same("ط١. **المسؤولُ المباشر يفشل بلا طلبٍ يتيم** — خطّةُ أقساطٍ نشطة ⟵ ٤٠٩، ولا طلبَ ولا دفعةٌ سالبة",
      [di.status, String(di.body?.error ?? di.body?.message ?? "").includes("أقساط"),
       (await q(`SELECT count(*)::int n FROM patient_refund_requests WHERE patient_id=$1`, [I.id]))[0].n,
       (await q(`SELECT count(*)::int n FROM payments WHERE patient_id=$1 AND amount<0`, [I.id]))[0].n], [409, true, 0, 0]);
    const ri = await ask(S.recv, { patientId: I.id, caseId: I.cases.physiotherapy, amount: 50_000, reason: "overpaid", detail: "زيادة" });
    same("ط٢. **وطلبُ الموظّف يبقى معلَّقاً** حين يُعتمد على خطّةٍ نشطة ⟵ ٤٠٩",
      [ri.status, (await http("POST", `/api/patient-refunds/${ri.body.id}/approve`, S.admin, { deductHospital: false, reduceCost: false })).status,
       (await q(`SELECT status FROM patient_refund_requests WHERE id=$1`, [ri.body.id]))[0].status], [201, 409, "pending"]);
    await q(`UPDATE patient_refund_requests SET status='rejected' WHERE id=$1`, [ri.body.id]);
    await q(`DELETE FROM installment_plans WHERE patient_id=$1`, [I.id]);
    //  دفعةُ الاسترجاع لا تُعدَّل ولا تُحذف — ولا لمسؤول.
    const refundPayId = refundPays[0].id;
    const adminPay = { ...S.admin, permissions: { canEditPayments: true, canDeletePayments: true } };
    same("ط٣. **دفعةُ الاسترجاع لا تُعدَّل ولا تُحذف** (تعديل · معلومات الجلسات · حذف) ⟵ ٤٠٠ والمبلغُ كما هو",
      [(await http("PATCH", `/api/payments/${refundPayId}`, adminPay, { amount: -1000, reason: "تجربة" })).status,
       (await http("PATCH", `/api/payments/${refundPayId}/session-info`, adminPay, { sessionCount: 2 })).status,
       (await http("DELETE", `/api/payments/${refundPayId}`, adminPay, { reason: "تجربة" })).status,
       (await q(`SELECT amount FROM payments WHERE id=$1`, [refundPayId]))[0]?.amount], [400, 400, 400, -300_000]);
    //  صفُّ العزل التلقائيّ لا يُمسّ باليد.
    const autoRow = (await q<{ id: number }>(`SELECT id FROM expenses WHERE branch_id=$1 AND category='hospital_percentage' AND expense_date=$2`, [DQ, D1]))[0];
    same("ط٤. **صفُّ العزل التلقائيّ لا يُعدَّل ولا يُحذف** (الدفترُ وباب المصروفات) ⟵ ٤٠٠ والصفُّ باقٍ",
      [(await http("PATCH", `/api/cash-book/rows/expense/${autoRow.id}`, S.admin, { note: "يدوي" })).status,
       (await http("DELETE", `/api/cash-book/rows/expense/${autoRow.id}`, S.admin)).status,
       (await http("PUT", `/api/expenses/${autoRow.id}`, S.admin, { amount: 1 })).status,
       (await http("DELETE", `/api/expenses/${autoRow.id}`, S.admin)).status,
       (await q(`SELECT amount FROM expenses WHERE id=$1`, [autoRow.id]))[0]?.amount], [400, 400, 400, 400, 75_000]);
    //  مطابقاتٌ متزامنة لفرعٍ واحد: تتسلسل، فتُحسب الكتابةُ مرّةً واحدة ولا يبقى قيدان قائمان لصفٍّ واحد.
    await hospital.reconcileBranch(DQ);  //  ما تركه ط١ (دفعةُ إيناس) يُطابَق أوّلاً.
    await payOn(A.id, A.cases.physiotherapy, 10_000, D1);
    const runs = await Promise.all([hospital.reconcileBranch(DQ), hospital.reconcileBranch(DQ), hospital.reconcileBranch(DQ)]);
    same("ط٥. **ثلاثُ مطابقاتٍ معاً ⟵ تغييرٌ واحد**، وعزلُ اليوم ٧٦ ألفاً، ولا قيدان قائمان لصفّ",
      [runs.reduce((t, n) => t + n, 0), (await hospitalRows("physio")).map((r) => r.amount),
       (await q(`SELECT COALESCE(MAX(n),0)::int m FROM (SELECT count(*) n FROM journal_entries WHERE source_type='expense' AND status='posted'
                  AND source_id IN (SELECT id FROM expenses WHERE branch_id=$1) GROUP BY source_id) x`, [DQ]))[0].m <= 1],
      [1, [12345, 76_000, 20_000], true]);

    // ══ ح. الحذف والدمج والتنبيهات ════════════════════════════════════════════════════════════
    console.log("\n── ح. الحذف والدمج ──");
    const M1 = await mkPatient("مرتضى", [{ type: "physiotherapy", cost: 100_000 }]);
    const M2 = await mkPatient("مرتضى ثانٍ", [{ type: "physiotherapy", cost: 100_000 }]);
    await payOn(M1.id, M1.cases.physiotherapy, 100_000, D2);
    const rm = await ask(S.recv, { patientId: M1.id, caseId: M1.cases.physiotherapy, amount: 20_000, reason: "overpaid", detail: "قبل الدمج" });
    let mergeErr = "";
    try { await storage.mergePatients(M1.id, M2.id); } catch (e: any) { mergeErr = e?.message ?? String(e); }
    same("ح٠. الدمجُ يمرّ", mergeErr, "");
    const merged = (await q(`SELECT patient_id, case_id, status FROM patient_refund_requests WHERE id=$1`, [rm.body.id]))[0];
    same("ح١. **الدمجُ يحمل الطلب**: المعلَّقُ يُرفض والطلبُ يتبع الملفَّ المدموج وحالتَه",
      [merged.patient_id, merged.case_id === M2.cases.physiotherapy, merged.status], [M2.id, true, "rejected"]);
    let delErr = "";
    try { await storage.deletePatient(M2.id); } catch (e: any) { delErr = e?.message ?? String(e); }
    same("ح٢. **الحذفُ النهائيّ يمرّ** وطلبُه يُحذف معه", [delErr, (await q(`SELECT count(*)::int n FROM patient_refund_requests WHERE id=$1`, [rm.body.id]))[0].n], ["", 0]);
    same("ح٣. التنبيهات: الطلبُ للمسؤول وحده، والقرارُ للاستقبال والمدير والمحاسب، ويصل الطالبَ ولو تغيّر دورُه",
      [["admin", "reception", "branch_manager", "accountant"].map((role) => eligibleStaffEvents({ role }).includes("refund_request_pending")),
       ["reception", "branch_manager", "accountant", "doctor"].map((role) => eligibleStaffEvents({ role }).includes("refund_request_decided")),
       ["accountant", "branch_manager", "reception"].map((role) => eligibleStaffEvents({ role }).includes("hospital_delivery_decided")),
       staffEventDeliverable({ role: "doctor" }, "refund_request_decided", true), staffEventDeliverable({ role: "doctor" }, "refund_request_decided", false)],
      [[true, false, false, false], [true, true, true, false], [true, true, false], true, false]);

    // ══ ي. الجلساتُ المُرجَعة (ترحيل ١٩٣ — واقعةُ كرار ناصر) ════════════════════════════════════
    console.log("\n── ي. الجلساتُ المُرجَعة ──");
    const DEV = "أجهزة علاج طبيعي";
    const pay = (type: string, n: number | null, extra: any = {}) => ({ treatmentType: type, sessionCount: n, ...extra });
    same("ي١. **العدّادُ يطرح المُرجَع** من الدفعات (كرار: ٥ + ١ + ١٠ − ٩ = ٧)، ومن الكلفة، **ولا يطرح من الخطّة**",
      [resolvePurchasedSessions({ treatmentTypeText: `${DEV} (20 جلسات)، أبر صينية (6 جلسات)`, caseCost: 195_000,
         paymentSessions: [pay(DEV, 5), pay(DEV, 1), pay(DEV, 10), pay("علاج طبيعي", null, { returned: [{ treatmentType: DEV, sessionCount: 9 }] })] }).byType,
       resolvePurchasedSessions({ treatmentTypeText: DEV, caseCost: 350_000,
         paymentSessions: [pay(DEV, 2), pay("علاج طبيعي", null, { returned: [{ treatmentType: DEV, sessionCount: 4 }] })] }),
       resolvePurchasedSessions({ plan: [{ treatmentType: DEV, sessionCount: 6 }],
         paymentSessions: [pay(DEV, 10), pay("علاج طبيعي", null, { returned: [{ treatmentType: DEV, sessionCount: 4 }] })] }).byType,
       resolvePurchasedSessions({ paymentSessions: [pay(DEV, 2), pay("x", null, { returned: [{ treatmentType: DEV, sessionCount: 9 }] })] }).byType],
      [{ [DEV]: 7 }, { byType: { [DEV]: 6 }, total: 6, source: "cost" }, { [DEV]: 6 }, { [DEV]: 0 }]);
    same("ي٢. القراءةُ والاقتراح: الصفرُ يُحذف والمكرّرُ يُجمع والسالبُ يُردّ، و٣١٥ ألفاً ÷ ٣٥ ألفاً = ٩ لا تتجاوز الباقي",
      [parseReturnedSessions([{ treatmentType: DEV, sessionCount: 2 }, { treatmentType: DEV, sessionCount: 1 }, { treatmentType: "إبر", sessionCount: 0 }]),
       parseReturnedSessions([{ treatmentType: DEV, sessionCount: -1 }]), parseReturnedSessions("x"),
       suggestReturnedSessions(315_000, 35_000, 9), suggestReturnedSessions(315_000, 35_000, 5), returnedSessionsLine([{ treatmentType: DEV, sessionCount: 9 }])],
      [[{ treatmentType: DEV, sessionCount: 3 }], null, null, 9, 5, `9 جلسات ${DEV}`]);

    await q(`UPDATE system_users SET can_request_refund = true WHERE id = $1`, [MGR_BG]);
    const mgr = { ...S.mgrBg, permissions: { canRequestRefund: true, canViewPayments: true } };
    const K = await mkPatient("كرار", [{ type: "physiotherapy", cost: 350_000 }], BG);
    await q(`UPDATE patients SET is_physiotherapy = true, treatment_type = $2 WHERE id = $1`, [K.id, `${DEV} (10 جلسات)`]);
    await q(`INSERT INTO payments (patient_id, branch_id, amount, case_id, payment_treatment_type, session_count, notes, date)
             VALUES ($1,$2,350000,$3,$4,10,$5, now() - interval '3 day')`, [K.id, BG, K.cases.physiotherapy, DEV, MARK]);
    await q(`INSERT INTO visits (patient_id, branch_id, case_id, treatment_type, visit_date) VALUES ($1,$2,$3,$4, now() - interval '2 day')`,
      [K.id, BG, K.cases.physiotherapy, DEV]);
    const ko = await http("GET", `/api/patients/${K.id}/refund-options`, mgr);
    const ks = ko.body?.cases?.[0]?.sessions?.[0];
    same("ي٣. **النافذةُ تعرض جلسات القسم**: اشترى ١٠ · حضر ١ · الباقي ٩ · بسعره",
      [ko.status, ks?.treatmentType, ks?.bought, ks?.done, ks?.remaining, ks?.available, ks?.price], [200, DEV, 10, 1, 9, 9, 35_000]);
    const kb = { patientId: K.id, caseId: K.cases.physiotherapy, amount: 315_000, reason: "stopped_treatment", detail: "حضر جلسة من عشر" };
    //  **فوق الباقي لم يعد يُمنع** (قرارُ المالك ٢٠٢٦-١١-١١، §4.gj) — تنبيهٌ أحمر، ويُفحص في ي١٤–ي١٨.
    same("ي٤. **بلا عدد الجلسات ⟵ ٤٠٠** · نوعٌ ليس في القسم ⟵ ٤٠٩ · مصفوفةٌ فاسدة ⟵ ٤٠٠ · جلساتٌ لقسم جهاز ⟵ ٤٠٠",
      [(await http("POST", "/api/patient-refunds", mgr, kb)).status,
       (await ask(mgr, { ...kb, sessionsReturned: [{ treatmentType: "روبوت", sessionCount: 1 }] })).status,
       (await ask(mgr, { ...kb, sessionsReturned: [{ treatmentType: DEV, sessionCount: 1.5 }] })).status,
       (await ask(S.recv, { patientId: B.id, caseId: B.cases.prosthetic, amount: 1000, reason: "overpaid", detail: "جهاز",
         sessionsReturned: [{ treatmentType: DEV, sessionCount: 1 }] })).status,
       (await q(`SELECT count(*)::int n FROM patient_refund_requests WHERE patient_id = $1`, [K.id]))[0].n],
      [400, 409, 400, 400, 0]);
    const kr = await ask(mgr, { ...kb, sessionsReturned: [{ treatmentType: DEV, sessionCount: 9 }] });
    //  طلبٌ ثانٍ بجلسةٍ والتسعُ معلَّقة: **يُرسل بتنبيهٍ أحمر** (§4.gj) — والمسؤولُ يراه في البطاقة وتلغرام، ثمّ يُرفض هنا ليمضي الاختبار.
    const k2 = await ask(mgr, { ...kb, amount: 1000, detail: "طلبٌ ثانٍ", sessionsReturned: [{ treatmentType: DEV, sessionCount: 1 }] });
    const k2card = await http("GET", `/api/patient-refunds/${k2.body?.id}`, S.admin);
    same("ي٥. **الطلبُ بتسع جلسات ⟵ ٢٠١** بلا تنبيه، وطلبٌ آخر بجلسةٍ والتسعُ معلَّقة ⟵ ٢٠١ **بتنبيهٍ أحمر** في البطاقة وتلغرام",
      [kr.status, kr.body?.sessionsLine, (kr.body?.sessionsReturned ?? []).map((x: any) => [x.treatmentType, x.sessionCount]), kr.body?.physioWarnings,
       k2.status, (k2card.body?.physioWarnings ?? []).some((w: string) => w.includes(`طُلب إرجاع 1 ${DEV} والباقي 0 (بعد 9 معلَّقة في طلبٍ آخر)`)),
       (await outbox("refund_request_pending")).some((r: any) => r.text.includes("🔴 تنبيه: طُلب إرجاع 1"))],
      [201, `9 جلسات ${DEV}`, [[DEV, 9]], [], 201, true, true]);
    await http("POST", `/api/patient-refunds/${k2.body?.id}/reject`, S.admin, { note: "مكرّر" });
    //  زيارةٌ بعد الطلب: الباقي ٨ — **والاعتمادُ لا يُمنع**، والبطاقةُ تنبّه بالأحمر (والاعتمادُ نفسُه في ي١٦ على مريضٍ آخر).
    const [lateVisit] = await q<{ id: number }>(`INSERT INTO visits (patient_id, branch_id, case_id, treatment_type, visit_date)
      VALUES ($1,$2,$3,$4, now()) RETURNING id`, [K.id, BG, K.cases.physiotherapy, DEV]);
    const card = await http("GET", `/api/patient-refunds/${kr.body.id}`, S.admin);
    same("ي٦. **حضر بعد الطلب ⟵ البطاقةُ تنبّه بالأحمر**: الممكن الآن ٨، و«طُلب ٩ والباقي ٨»، والمبلغُ فوق قيمة الثماني",
      [card.body?.sessionsNow?.[0]?.available, card.body?.sessionsOverRemaining,
       (card.body?.physioWarnings ?? []).length, card.body?.overSessionsValue],
      [8, [{ treatmentType: DEV, asked: 9, available: 8, pending: 0 }], 2, 35_000]);
    await q(`DELETE FROM visits WHERE id=$1`, [lateVisit.id]);
    const kap = await http("POST", `/api/patient-refunds/${kr.body.id}/approve`, S.admin, { reduceCost: true });
    const kpay = (await q(`SELECT returned_sessions, notes FROM payments WHERE patient_id=$1 AND amount<0`, [K.id]))[0];
    const kstate = await refundStore.physioSessionStateTx(db as any, K.id, K.cases.physiotherapy);
    same("ي٧. **الاعتمادُ يطرح التسع**: على صفّ الاسترجاع، والعدّادُ ١ · حضر ١ · باقي ٠، والملاحظةُ تقولها، ودفعتُه الأصلية كما هي",
      [kap.status, (kpay?.returned_sessions ?? []).map((x: any) => [x.treatmentType, x.sessionCount]), kpay?.notes?.includes(`أُرجع 9 جلسات ${DEV}`), kstate.state[0]?.bought, kstate.state[0]?.remaining,
       (await q(`SELECT session_count FROM payments WHERE patient_id=$1 AND amount>0`, [K.id]))[0].session_count],
      [200, [[DEV, 9]], true, 1, 0, 10]);
    //  مَن لا يرى المال يرى العدّادَ محسوباً في الخادم — وبالطرح نفسِه.
    await q(`UPDATE system_users SET can_view_payments = false WHERE id = $1`, [MGR_BG]);
    const noMoney = { ...S.mgrBg, permissions: {} };
    const kview = await http("GET", `/api/patients/${K.id}`, noMoney);
    await q(`UPDATE system_users SET can_view_payments = true WHERE id = $1`, [MGR_BG]);
    same("ي٨. **ملفُّ المريض لمن حُجب عنه المال**: العدّادُ ١ والملخّصُ ١ — لا ١٠",
      [kview.status, kview.body?.physioSessionsResolved?.byType, kview.body?.paymentSessionsSummary], [200, { [DEV]: 1 }, [{ treatmentType: DEV, sessionCount: 1 }]]);

    //  صاحبُ الخطّة: الخطّةُ نفسُها تنقص، والعدّادُ لا يطرح مرّتين.
    const P = await mkPatient("صاحب خطّة", [{ type: "physiotherapy", cost: 350_000 }], BG);
    await q(`UPDATE patients SET is_physiotherapy = true, physio_plan = $2::jsonb WHERE id = $1`, [P.id, JSON.stringify([{ treatmentType: DEV, sessionCount: 10 }])]);
    await q(`INSERT INTO payments (patient_id, branch_id, amount, case_id, payment_treatment_type, session_count, notes, date)
             VALUES ($1,$2,350000,$3,$4,10,$5, now() - interval '3 day')`, [P.id, BG, P.cases.physiotherapy, DEV, MARK]);
    const pr = await ask(S.admin, { patientId: P.id, caseId: P.cases.physiotherapy, amount: 140_000, reason: "stopped_treatment",
      detail: "أربعٌ تُرجَع", sessionsReturned: [{ treatmentType: DEV, sessionCount: 4 }], reduceCost: true });
    const pstate = await refundStore.physioSessionStateTx(db as any, P.id, P.cases.physiotherapy);
    same("ي٩. **صاحبُ الخطّة** (المسؤولُ مباشرةً): الخطّةُ ١٠ ⟵ ٦ والعدّادُ ٦ لا ٢",
      [pr.status, pr.body?.status, ((await q(`SELECT physio_plan FROM patients WHERE id=$1`, [P.id]))[0].physio_plan ?? []).map((x: any) => [x.treatmentType, x.sessionCount]), pstate.state[0]?.bought],
      [201, "approved", [[DEV, 6]], 6]);

    // ══ ي١٠–ي١٣. مراجعةُ Codex: لا طرحَ مرّتين، والخطّةُ المستنفَدة حاكمة، والتسعيرُ لا يُحيي المُرجَع ══
    //  مثالُ المراجعة نفسُه: ١٠ جلساتٍ بـ٣٥٠ ألفاً، وعلى الأقساط جلستان، ويُرجع أربعاً بـ١٤٠ ألفاً مع تخفيض الكلفة.
    const CD = await mkPatient("مشتقٌّ من الكلفة", [{ type: "physiotherapy", cost: 350_000 }], BG);
    await q(`UPDATE patients SET is_physiotherapy = true, treatment_type = $2 WHERE id = $1`, [CD.id, DEV]);
    await q(`INSERT INTO payments (patient_id, branch_id, amount, case_id, payment_treatment_type, session_count, notes, date)
             VALUES ($1,$2,200000,$3,$4,2,$5, now() - interval '3 day')`, [CD.id, BG, CD.cases.physiotherapy, DEV, MARK]);
    const cBefore = (await refundStore.physioSessionStateTx(db as any, CD.id, CD.cases.physiotherapy)).state[0]?.bought;
    const cr = await ask(S.admin, { patientId: CD.id, caseId: CD.cases.physiotherapy, amount: 140_000, reason: "stopped_treatment",
      detail: "أربعٌ من المشتقّ", sessionsReturned: [{ treatmentType: DEV, sessionCount: 4 }], reduceCost: true });
    same("ي١١. **المشتقُّ من الكلفة لا يُطرح مرّتين**: ١٠ ⟵ ٦ لا ٢، ولا يُكتب على صفّ الاسترجاع ما أنقصه التخفيضُ أصلاً",
      [cBefore, cr.status, (await refundStore.physioSessionStateTx(db as any, CD.id, CD.cases.physiotherapy)).state[0]?.bought,
       (await q(`SELECT returned_sessions FROM payments WHERE patient_id=$1 AND amount<0`, [CD.id]))[0]?.returned_sessions ?? null],
      [10, 201, 6, null]);
    same("ي١١ب. **وتجمّد خطّةً بـ«قبل − المُرجَع»** فلا تتبع الكلفةَ بعدها",
      ((await q(`SELECT physio_plan FROM patients WHERE id=$1`, [CD.id]))[0].physio_plan ?? []).map((x: any) => [x.treatmentType, x.sessionCount]),
      [[DEV, 6]]);
    //  مراجعةُ Codex الثانية: مبلغٌ لا يساوي ثمنَ الجلسات (١٠ آلاف عن أربع) مع تخفيض الكلفة ⟵ ٣٤٠ ألفاً لا تُقسم على ٣٥ ألفاً.
    const CE = await mkPatient("اشتقاقٌ يسقط", [{ type: "physiotherapy", cost: 350_000 }], BG);
    await q(`UPDATE patients SET is_physiotherapy = true, treatment_type = $2 WHERE id = $1`, [CE.id, DEV]);
    await q(`INSERT INTO payments (patient_id, branch_id, amount, case_id, payment_treatment_type, session_count, notes, date)
             VALUES ($1,$2,200000,$3,$4,2,$5, now() - interval '3 day')`, [CE.id, BG, CE.cases.physiotherapy, DEV, MARK]);
    const ce = await ask(S.admin, { patientId: CE.id, caseId: CE.cases.physiotherapy, amount: 10_000, reason: "stopped_treatment",
      detail: "أربعٌ بمبلغٍ قليل", sessionsReturned: [{ treatmentType: DEV, sessionCount: 4 }], reduceCost: true });
    same("ي١٠. **سقوطُ الاشتقاق بعد التخفيض لا يُسقط العدد**: ١٠ − ٤ = ٦ لا جلستا الأقساط",
      [ce.status, (await q(`SELECT cost FROM patient_cases WHERE id=$1`, [CE.cases.physiotherapy]))[0].cost,
       (await refundStore.physioSessionStateTx(db as any, CE.id, CE.cases.physiotherapy)).state[0]?.bought], [201, 340_000, 6]);
    //  خطّةٌ صُحّحت إلى أربعٍ تحت دفعةٍ قديمة بعشر — يُرجع الأربعَ كلَّها.
    const Z = await mkPatient("خطّةٌ تُستنفَد", [{ type: "physiotherapy", cost: 140_000 }], BG);
    await q(`UPDATE patients SET is_physiotherapy = true, physio_plan = $2::jsonb WHERE id = $1`, [Z.id, JSON.stringify([{ treatmentType: DEV, sessionCount: 4 }])]);
    await q(`INSERT INTO payments (patient_id, branch_id, amount, case_id, payment_treatment_type, session_count, notes, date)
             VALUES ($1,$2,350000,$3,$4,10,$5, now() - interval '3 day')`, [Z.id, BG, Z.cases.physiotherapy, DEV, MARK]);
    const zr = await ask(S.admin, { patientId: Z.id, caseId: Z.cases.physiotherapy, amount: 140_000, reason: "stopped_treatment",
      detail: "الأربعُ كلُّها", sessionsReturned: [{ treatmentType: DEV, sessionCount: 4 }], reduceCost: true });
    const zPlan = (await q(`SELECT physio_plan FROM patients WHERE id=$1`, [Z.id]))[0].physio_plan;
    const zPays = (await q(`SELECT payment_treatment_type, session_count, returned_sessions FROM payments WHERE patient_id=$1`, [Z.id]))
      .map((x: any) => ({ treatmentType: x.payment_treatment_type, sessionCount: x.session_count, returned: x.returned_sessions }));
    const zRes = resolvePurchasedSessions({ plan: zPlan, paymentSessions: zPays });
    same("ي١٢. **الخطّةُ المستنفَدة تبقى حاكمة**: صفرٌ من الخطّة لا ستٌّ من الدفعة القديمة",
      [zr.status, (zPlan ?? []).map((x: any) => [x.treatmentType, x.sessionCount, x.depleted === true]), zRes.total, zRes.source],
      [201, [[DEV, 0, true]], 0, "plan"]);
    //  كرار بلا خطّة: «الكلفة والجلسات» تبني خطّتَه من دفعاته — والمُرجَعُ مطروح.
    await storage.pricePhysiotherapy(K.id, { entries: [{ treatmentType: DEV, sessionCount: 2 }], totalCost: 70_000, totalSessions: 2, treatmentType: DEV } as any);
    same("ي١٣. **التسعيرُ لا يُحيي المُرجَع**: بذرةُ كرار من دفعاته ١٠ − ٩ = ١ ثمّ +٢ = ٣ لا ١٢",
      ((await q(`SELECT physio_plan FROM patients WHERE id=$1`, [K.id]))[0].physio_plan ?? []).map((x: any) => [x.treatmentType, x.sessionCount]),
      [[DEV, 3]]);
    same("ي١٤. **وما أكل منه استرجاعٌ لا يُوسَم في البذرة** — فتصحيحُ دفعة كرار القديمة لاحقاً لا يأكل الجلستين الجديدتين",
      (await q(`SELECT plan_credited FROM payments WHERE patient_id=$1 AND amount > 0`, [K.id])).map((x: any) => x.plan_credited === true), [false]);
    //  مراجعةُ Codex الثالثة: صفوفُ النوع التي لم يأكلها الاسترجاعُ تبقى موسومة.
    const T2 = await mkPatient("دفعتان", [{ type: "physiotherapy", cost: 525_000 }], BG);
    await q(`UPDATE patients SET is_physiotherapy = true WHERE id = $1`, [T2.id]);
    await q(`INSERT INTO payments (patient_id, branch_id, amount, case_id, payment_treatment_type, session_count, notes, date)
             VALUES ($1,$2,175000,$3,$4,5,$5, now() - interval '9 day'), ($1,$2,350000,$3,$4,10,$5, now() - interval '3 day')`,
      [T2.id, BG, T2.cases.physiotherapy, DEV, MARK]);
    const t2r = await ask(S.admin, { patientId: T2.id, caseId: T2.cases.physiotherapy, amount: 315_000, reason: "stopped_treatment",
      detail: "تسعٌ من الأحدث", sessionsReturned: [{ treatmentType: DEV, sessionCount: 9 }], reduceCost: false });
    await storage.pricePhysiotherapy(T2.id, { entries: [{ treatmentType: DEV, sessionCount: 2 }], totalCost: 70_000, totalSessions: 2, treatmentType: DEV } as any);
    same("ي١٥. **الاسترجاعُ يأكل الأحدثَ وحده**: دفعةُ الخمس القديمة موسومةٌ ودفعةُ العشر التي أُرجع منها تسعٌ بلا وسم، والخطّةُ ٥ + ١٠ − ٩ + ٢ = ٨",
      [t2r.status, (await q(`SELECT session_count, plan_credited FROM payments WHERE patient_id=$1 AND amount > 0 ORDER BY date`, [T2.id]))
        .map((x: any) => [x.session_count, x.plan_credited === true]),
       ((await q(`SELECT physio_plan FROM patients WHERE id=$1`, [T2.id]))[0].physio_plan ?? []).map((x: any) => [x.treatmentType, x.sessionCount])],
      [201, [[5, true], [10, false]], [[DEV, 8]]]);
    //  مراجعةُ Codex الرابعة: شراءٌ بعد الاسترجاع لا يُحمَّل استرجاعاً سبقه.
    const T3 = await mkPatient("شراءٌ بعد الاسترجاع", [{ type: "physiotherapy", cost: 525_000 }], BG);
    await q(`UPDATE patients SET is_physiotherapy = true WHERE id = $1`, [T3.id]);
    await q(`INSERT INTO payments (patient_id, branch_id, amount, case_id, payment_treatment_type, session_count, notes, date)
             VALUES ($1,$2,350000,$3,$4,10,$5, now() - interval '9 day')`, [T3.id, BG, T3.cases.physiotherapy, DEV, MARK]);
    const t3r = await ask(S.admin, { patientId: T3.id, caseId: T3.cases.physiotherapy, amount: 315_000, reason: "stopped_treatment",
      detail: "تسعٌ قبل الشراء الجديد", sessionsReturned: [{ treatmentType: DEV, sessionCount: 9 }], reduceCost: false });
    await q(`INSERT INTO payments (patient_id, branch_id, amount, case_id, payment_treatment_type, session_count, notes, date)
             VALUES ($1,$2,175000,$3,$4,5,$5, now() + interval '1 day')`, [T3.id, BG, T3.cases.physiotherapy, DEV, MARK]);
    await storage.pricePhysiotherapy(T3.id, { entries: [{ treatmentType: DEV, sessionCount: 2 }], totalCost: 70_000, totalSessions: 2, treatmentType: DEV } as any);
    same("ي١٦. **الشراءُ بعد الاسترجاع موسوم**: العشرُ التي أُرجع منها تسعٌ بلا وسم، والخمسُ اللاحقة موسومة، والخطّةُ ١٠ − ٩ + ٥ + ٢ = ٨",
      [t3r.status, (await q(`SELECT session_count, plan_credited FROM payments WHERE patient_id=$1 AND amount > 0 ORDER BY id`, [T3.id]))
        .map((x: any) => [x.session_count, x.plan_credited === true]),
       ((await q(`SELECT physio_plan FROM patients WHERE id=$1`, [T3.id]))[0].physio_plan ?? []).map((x: any) => [x.treatmentType, x.sessionCount])],
      [201, [[10, false], [5, true]], [[DEV, 8]]]);

    // ══ ك. «استمارة استرداد مبلغ» (ترحيل ١٩٥، §4.gi) ══════════════════════════════════════════════════════════════════════════
    console.log("\n── ك. الاستمارة ──");
    const F = await mkPatient("استمارة", [{ type: "prosthetic", cost: 1_000_000 }]);
    const [fcode] = await q(`SELECT patient_code FROM patients WHERE id = $1`, [F.id]);
    await payOn(F.id, F.cases.prosthetic, 600_000, TODAY, "أطراف صناعية");
    const fo = await http("GET", `/api/patients/${F.id}/refund-options`, S.recv);
    same("ك١. **رأسُ الاستمارة من الملفّ**: اسمُ المريض ورقمُ ملفّه في نافذة الطلب",
      [fo.status, fo.body?.patientName, fo.body?.patientCode, Boolean(fcode?.patient_code)], [200, `${MARK} استمارة`, fcode?.patient_code, true]);
    const fb = { patientId: F.id, caseId: F.cases.prosthetic, reason: "device_not_made", detail: "لم يُصنع الطرف" };
    const f1 = await ask(S.recv, { ...fb, amount: 100_000, companionName: "  علي   حسين ", nationalId: " 199012345678 " });
    const [fr] = await q(`SELECT companion_name, national_id FROM patient_refund_requests WHERE id=$1`, [f1.body?.id]);
    same("ك٢. **اسمُ المرافق ورقمُ الجنسية يُحفظان** (بلا مسافاتٍ زائدة) ويعودان في البطاقة",
      [f1.status, fr?.companion_name, fr?.national_id, f1.body?.companionName, f1.body?.nationalId],
      [201, "علي حسين", "199012345678", "علي حسين", "199012345678"]);
    const f2 = await ask(S.recv, { ...fb, amount: 50_000, detail: "بلا مرافق", companionName: "   ", nationalId: "" });
    const [fr2] = await q(`SELECT companion_name, national_id FROM patient_refund_requests WHERE id=$1`, [f2.body?.id]);
    same("ك٣. **وغيرُ إلزاميَّين**: الفارغُ يُحفظ فراغاً لا نصّاً", [f2.status, fr2?.companion_name, fr2?.national_id], [201, null, null]);
    same("ك٤. **والأطولُ من الحدّ يُردّ لا يُقصّ** (٤٠٠) — المرافقُ ورقمُ الجنسية — ونوعٌ غيرُ نصّيّ ٤٠٠",
      [(await ask(S.recv, { ...fb, amount: 10_000, detail: "طويل", companionName: "س".repeat(121) })).status,
       (await ask(S.recv, { ...fb, amount: 10_000, detail: "طويل", nationalId: "1".repeat(41) })).status,
       (await ask(S.recv, { ...fb, amount: 10_000, detail: "رقم", nationalId: 12345 })).status],
      [400, 400, 400]);
    same("ك٥. **والبطاقةُ للطباعة بالحقلين وهي معلَّقة** — والصفحةُ تمنع الطباعةَ قبل الاعتماد",
      [(await http("GET", `/api/patient-refunds/${f1.body?.id}`, S.recv)).body?.companionName, (await http("GET", `/api/patient-refunds/${f1.body?.id}`, S.recv)).body?.status],
      ["علي حسين", "pending"]);
    const [aud] = await q(`SELECT new_values FROM audit_log WHERE entity_type='patient_refund_request' AND entity_id=$1 AND action='create'`, [f1.body?.id]);
    const nv = typeof aud?.new_values === "string" ? JSON.parse(aud.new_values) : aud?.new_values;
    same("ك٦. وسطرُ التدقيق يحملهما", [nv?.companionName, nv?.nationalId], ["علي حسين", "199012345678"]);
    //  **ورقةٌ واحدة في طباعة المتصفّح** (ملاحظة Codex على #732): ما لا يزيد على صفحة ٢٩٤ × ٢١٠ لا يُصغَّر، وما زاد يُصغَّر حتى يدخلها
    //  — والنسبةُ وحدها تحكم فتكبيرُ الهاتف لا يغيّرها، وقياسٌ فارغ لا يُصغّر.
    {
      const { refundPrintFit, REFUND_PRINT_PAGE_RATIO } = await import("@shared/patient_refunds");
      const big = refundPrintFit(1500, 794);
      same("ك٧. **التصغيرُ للطباعة**: صفحةٌ بقدرها ١، وأطولُ تُصغَّر فتدخل الورقة، وبتكبير الهاتف العاملُ نفسُه، والقياسُ الفارغ ١",
        [refundPrintFit(Math.floor(794 * REFUND_PRINT_PAGE_RATIO), 794), big < 1 && Math.abs(1500 * big / 794 - REFUND_PRINT_PAGE_RATIO) < 1e-9,
         Math.abs(refundPrintFit(750, 397) - big) < 1e-9, refundPrintFit(0, 0), refundPrintFit(900, 0)],
        [1, true, true, 1, 1]);
    }

    // ══ م. تنبيهاتُ العلاج الطبيعي — لا منع (قرارُ المالك ٢٠٢٦-١١-١١، §4.gj) ══════════════════════════════════════════════════════
    //  المنعُ الوحيد: فوق ما دفعه. والمبلغُ فوق قيمة الجلسات الباقية **بسعر ما دفعه** والجلساتُ فوق الباقي تنبيهٌ أحمر، والعدّادُ لا ينزل تحت الصفر.
    console.log("\n── م. تنبيهاتُ العلاج الطبيعي ──");
    {
      const { physioRefundGuide, refundOverSessionsValue, clampReturnedSessions, sessionsOverRemaining } = await import("@shared/patient_refunds");
      const g = physioRefundGuide(300_000, [{ treatmentType: DEV, bought: 10, remaining: 9, pending: 0, available: 9 }]);
      same("م١. **سعرُ الجلسة ممّا دفعه** (٣٠٠ ألف ÷ ١٠ = ٣٠ ألفاً لا ٣٥ النظام) والحدُّ ٩ × ٣٠ = ٢٧٠ ألفاً، وفوقه بكم، وبلا جلساتٍ مشتراة صفر، والعدّادُ يُطرح بالباقي وحده",
        [g.perSession, g.limit, refundOverSessionsValue(290_000, g), refundOverSessionsValue(270_000, g),
         physioRefundGuide(100_000, []).limit, clampReturnedSessions([{ treatmentType: DEV, sessionCount: 9 }], [{ treatmentType: DEV, remaining: 8 }]),
         sessionsOverRemaining([{ treatmentType: DEV, sessionCount: 9 }], [{ treatmentType: DEV, available: 8 }])],
        [30_000, 270_000, 20_000, 0, 0, [{ treatmentType: DEV, sessionCount: 8 }], [{ treatmentType: DEV, asked: 9, available: 8, pending: 0 }]]);
      //  مراجعةُ §4.gj: المُهدى بلا مال لا يُخفّض السعر، والمعادلةُ تجمع بالسعر المعروض، والحدُّ لا يتجاوز ما دفعه.
      const gGift = physioRefundGuide(300_000, [{ treatmentType: DEV, bought: 12, remaining: 9, pending: 0, available: 9 }], 2);
      const gOdd = physioRefundGuide(100_000, [{ treatmentType: DEV, bought: 11, remaining: 10, pending: 0, available: 10 }]);
      const gCap = physioRefundGuide(200_000, [{ treatmentType: DEV, bought: 3, remaining: 3, pending: 0, available: 3 }]);
      same("م١ب. **الهديةُ خارج القسمة** (٣٠٠ ألف ÷ ١٠ مدفوعة = ٣٠ ألفاً لا ٢٥)، و١٠ × ٩٬٠٩١ = ٩٠٬٩١٠ تجمع، والحدُّ ٢٠٠ ألف لا ٢٠٠٬٠٠١ (٣ × ٦٦٬٦٦٧)",
        [gGift.perSession, gGift.limit, gOdd.perSession, gOdd.limit === gOdd.available * (gOdd.perSession ?? 0), gCap.limit],
        [30_000, 270_000, 9_091, true, 200_000]);

      const W = await mkPatient("تنبيه الجلسات", [{ type: "physiotherapy", cost: 300_000 }], BG);
      await q(`UPDATE patients SET is_physiotherapy = true, treatment_type = $2 WHERE id = $1`, [W.id, `${DEV} (10 جلسات)`]);
      await q(`INSERT INTO payments (patient_id, branch_id, amount, case_id, payment_treatment_type, session_count, notes, date)
               VALUES ($1,$2,300000,$3,$4,10,$5, now() - interval '3 day')`, [W.id, BG, W.cases.physiotherapy, DEV, MARK]);
      await q(`INSERT INTO visits (patient_id, branch_id, case_id, treatment_type, visit_date) VALUES ($1,$2,$3,$4, now() - interval '2 day')`,
        [W.id, BG, W.cases.physiotherapy, DEV]);
      const wo = await http("GET", `/api/patients/${W.id}/refund-options`, mgr);
      same("م٢. **النافذةُ تعرض الحدَّ المعتاد**: ٩ جلسات × ٣٠ ألفاً (ممّا دفعه) = ٢٧٠ ألفاً",
        [wo.status, wo.body?.cases?.[0]?.physioGuide], [200, { netPaid: 300_000, bought: 10, available: 9, perSession: 30_000, limit: 270_000 }]);

      const wb = { patientId: W.id, caseId: W.cases.physiotherapy, reason: "stopped_treatment" };
      const wr = await ask(mgr, { ...wb, amount: 290_000, detail: "أكثر من الباقي", sessionsReturned: [{ treatmentType: DEV, sessionCount: 9 }] });
      const wcard = await http("GET", `/api/patient-refunds/${wr.body?.id}`, S.admin);
      same("م٣. **فوق قيمة الجلسات ⟵ يُرسل (٢٠١)** وتنبيهٌ أحمر بالفرق ٢٠ ألفاً في البطاقة وتلغرام",
        [wr.status, wcard.body?.overSessionsValue, (wcard.body?.physioWarnings ?? []).some((w: string) => w.includes("بـ20,000")),
         (await outbox("refund_request_pending")).some((r: any) => r.text.includes("🔴 تنبيه: المبلغ 290,000 أكثر من قيمة الجلسات الباقية"))],
        [201, 20_000, true, true]);

      //  حضر بعد الطلب: الباقي ٨ — **والاعتمادُ يمرّ** والعدّادُ ينقص بثمانٍ لا تسع.
      await q(`INSERT INTO visits (patient_id, branch_id, case_id, treatment_type, visit_date) VALUES ($1,$2,$3,$4, now())`,
        [W.id, BG, W.cases.physiotherapy, DEV]);
      const wap = await http("POST", `/api/patient-refunds/${wr.body?.id}/approve`, S.admin, { reduceCost: false });
      const wpay = (await q(`SELECT returned_sessions, notes FROM payments WHERE patient_id=$1 AND amount<0`, [W.id]))[0];
      const wstate = await refundStore.physioSessionStateTx(db as any, W.id, W.cases.physiotherapy);
      same("م٤. **الجلساتُ فوق الباقي لا تمنع الاعتماد** (٢٠٠): يُطرح ٨ لا ٩، والملاحظةُ تقول «طُلب ٩»، والعدّادُ ٢ · حضر ٢ · باقي ٠ لا سالب",
        [wap.status, (wpay?.returned_sessions ?? []).map((x: any) => [x.treatmentType, x.sessionCount]),
         Boolean(wpay?.notes?.includes(`أُرجع 8 جلسات ${DEV}`) && wpay?.notes?.includes(`طُلب 9 جلسات ${DEV}`)),
         wstate.state[0]?.bought, wstate.state[0]?.done, wstate.state[0]?.remaining],
        [200, [[DEV, 8]], true, 2, 2, 0]);
      const wdone = await http("GET", `/api/patient-refunds/${wr.body?.id}`, S.admin);
      same("م٤ب. **والاستمارةُ والبطاقةُ بعد الاعتماد تقول ما أُرجع فعلاً** (٨ لا ٩)، والمطلوبُ باقٍ في سطر تدقيق الطلب",
        [wdone.body?.sessionsLine, (await q(`SELECT new_values FROM audit_log WHERE entity_type='patient_refund_request' AND entity_id=$1 AND action='create'`, [wr.body?.id]))
          .map((r: any) => (typeof r.new_values === "string" ? JSON.parse(r.new_values) : r.new_values)?.sessionsReturned?.[0]?.sessionCount)[0]],
        [`8 جلسات ${DEV}`, 9]);
      same("م٥. **والمنعُ الوحيد باقٍ**: فوق صافي ما دفعه (١٠ آلاف) ⟵ ٤٠٩",
        (await ask(mgr, { ...wb, amount: 20_000, detail: "فوق المدفوع", sessionsReturned: [] })).status, 409);
    }

  } finally {
    await cleanup().catch((e) => console.error("cleanup failed", e));
    httpServer.close();
    await pool.end();
  }
  console.log(failures ? `\n❌ ${failures} failed` : "\n✅ all passed");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
