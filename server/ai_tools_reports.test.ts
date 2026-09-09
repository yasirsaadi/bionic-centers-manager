// اختبارُ أدوات المساعد الجديدة: patient_search · operational_summary ·
// financial_summary. `npm run test:ai-tools-reports`.
//
// يُنادي `executeTool` مباشرةً (بلا HTTP) — نفسُ نمط `ai_tools.test.ts`
// القائم لبقيّة الأدوات الأربع.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}

import { pool } from "./db";
import { storage } from "./storage";
import { executeTool, toolsFor } from "./ai/tools/registry";
import { resolveAiAccess, type AiAccessContext } from "./ai/access";
import { computeComparison } from "./ai/tools/reports";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const B1 = 9940, B2 = 9941;
const RECEPTION = 9942, RECEPTION_NO_VIEW = 9943, ADMIN = 9944, ACCOUNTANT = 9945;
const P1 = 89401, P2 = 89402, P3_OTHER_BRANCH = 89403, P4_DELETED = 89404, P5_PHYSIO = 89405;
const MARK = "اختبار-تقارير-المساعد";
const TODAY = new Date().toISOString().slice(0, 10);

async function q(sql: string, params: any[] = []) { return pool.query(sql, params); }

async function cleanup() {
  await q(`DELETE FROM visits WHERE patient_id = ANY($1::int[])`, [[P1, P2, P3_OTHER_BRANCH, P4_DELETED, P5_PHYSIO]]);
  await q(`DELETE FROM patient_cases WHERE patient_id = ANY($1::int[])`, [[P1, P2, P3_OTHER_BRANCH, P4_DELETED, P5_PHYSIO]]);
  await q(`DELETE FROM cost_entries WHERE patient_id = ANY($1::int[])`, [[P1, P2, P3_OTHER_BRANCH, P4_DELETED, P5_PHYSIO]]);
  await q(`DELETE FROM payments WHERE patient_id = ANY($1::int[])`, [[P1, P2, P3_OTHER_BRANCH, P4_DELETED, P5_PHYSIO]]);
  await q(`DELETE FROM patients WHERE id = ANY($1::int[])`, [[P1, P2, P3_OTHER_BRANCH, P4_DELETED, P5_PHYSIO]]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [[RECEPTION, RECEPTION_NO_VIEW, ADMIN, ACCOUNTANT]]);
  await q(`DELETE FROM branches WHERE id = ANY($1::int[])`, [[B1, B2]]);
}

function access(over: Partial<AiAccessContext> & { operationalBranches: number[] | null }): AiAccessContext {
  return {
    userId: 1, role: "reception", isAdmin: false, branchId: null, branchName: null,
    permissions: {}, canUseFinance: false, mode: "general", financeScopeMissing: false,
    ...over,
  };
}

async function main() {
  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1,'فرع تقارير أ'),($2,'فرع تقارير ب') ON CONFLICT (id) DO NOTHING`, [B1, B2]);
  await q(`
    INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, can_view_patients, is_active)
    VALUES
      ($1,'art-recep','x','استقبال بحث','reception',$5,true,true),
      ($2,'art-norecep','x','استقبال بلا بحث','reception',$5,false,true),
      ($3,'art-admin','x','مسؤول تقارير','admin',NULL,true,true),
      ($4,'art-acc','x','محاسب تقارير','accountant',$5,true,true)
    ON CONFLICT (id) DO UPDATE SET is_active = true
  `, [RECEPTION, RECEPTION_NO_VIEW, ADMIN, ACCOUNTANT, B1]);

  const patientCode = (n: number) => `WB-8940${n}`;
  await q(`
    INSERT INTO patients
      (id, patient_code, name, phone, branch_id, is_amputee, is_physiotherapy, total_cost,
       referral_source, age, medical_condition, created_at, deleted_at)
    VALUES
      ($1, $5, '${MARK} فلان الاول', '07701110001', $9, false, false, 0, '${MARK}', '30', '${MARK}', NOW(), NULL),
      ($2, $6, '${MARK} فلان الثاني', '07701110002', $9, false, false, 0, '${MARK}', '30', '${MARK}', NOW(), NULL),
      ($3, $7, '${MARK} فلان فرع ب', '07701110003', $10, false, false, 0, '${MARK}', '30', '${MARK}', NOW(), NULL),
      ($4, $8, '${MARK} فلانة علاج طبيعي', '07701110005', $9, false, true, 0, '${MARK}', '30', '${MARK}', NOW(), NULL)
  `, [P1, P2, P3_OTHER_BRANCH, P5_PHYSIO,
    patientCode(1), patientCode(2), patientCode(3), patientCode(5), B1, B2]);

  //  ══ مريضٌ في السلّة — كلُّ أعمدة لقطة الحذف (ترحيل ٠٦٨) إلزامية ══
  //  ليست هذه إعادة اختبارٍ لآليّة السلّة (تلك في `patient_trash.test.ts`)،
  //  بل إثباتٌ أن `patient_search` يستعمل `activePatientDrizzle()` نفسَها.
  await q(`
    INSERT INTO patients
      (id, patient_code, name, phone, branch_id, is_amputee, is_physiotherapy, total_cost,
       referral_source, age, medical_condition, created_at, deleted_at,
       deleted_reason, restore_until, deleted_total_cost, deleted_total_paid, deleted_remaining,
       deleted_pending_json, deleted_needed_admin)
    VALUES
      ($1, $2, '${MARK} فلان محذوف', '07701110004', $3, false, false, 0, '${MARK}', '30', '${MARK}', NOW(), NOW(),
       'تنظيفُ اختبار', NOW() + INTERVAL '30 days', 0, 0, 0,
       '{"pendingCharges":false,"pendingDiscounts":false,"pendingPriceRequests":false,"openFollowups":false,"openSettlements":false}'::jsonb,
       false)
  `, [P4_DELETED, patientCode(4), B1]);

  const [physioCase] = (await q(
    `INSERT INTO patient_cases (patient_id, case_type, status) VALUES ($1, 'physiotherapy', 'active') RETURNING id`,
    [P5_PHYSIO],
  )).rows;
  await q(`
    INSERT INTO visits (patient_id, branch_id, case_id, treatment_type, visit_date, cost)
    VALUES ($1, $2, $3, 'روبوت', NOW(), 0)
  `, [P5_PHYSIO, B1, physioCase.id]);
  await q(`
    INSERT INTO visits (patient_id, branch_id, treatment_type, visit_date, cost)
    VALUES ($1, $2, 'زيارة عادية', NOW(), 0)
  `, [P1, B1]);

  //  ══ مبيعاتٌ ونقدٌ مقبوض **بمبلغين مختلفين عمداً** ══════════════════════
  //  لو تساوى الرقمان (كما كانا صفرَين قبل هذه الإضافة) يمرّ اختبارُ
  //  التطابق حتى لو انعكس الحقلان خطأً — ٥٠٠,٠٠٠ مقابل ٢٠٠,٠٠٠ يفضح أيّ
  //  تبديلٍ مستقبليّ بين salesValue وrevenue فوراً.
  const SALES_AMOUNT = 500000, PAID_AMOUNT = 200000;
  await q(`
    INSERT INTO cost_entries (patient_id, branch_id, amount, source, notes)
    VALUES ($1, $2, $3, 'registration', '${MARK}')
  `, [P1, B1, SALES_AMOUNT]);
  await q(`
    INSERT INTO payments (patient_id, branch_id, amount, notes)
    VALUES ($1, $2, $3, '${MARK}')
  `, [P1, B1, PAID_AMOUNT]);

  try {
    // ══ أ. patient_search ═══════════════════════════════════════════════
    console.log("\n── أ. patient_search ──");
    const scopedRecep = access({ userId: RECEPTION, role: "reception", permissions: { canViewPatients: true }, operationalBranches: [B1] });
    const scopedNoView = access({ userId: RECEPTION_NO_VIEW, role: "reception", permissions: { canViewPatients: false }, operationalBranches: [B1] });
    const adminAccess = access({ userId: ADMIN, role: "admin", isAdmin: true, operationalBranches: null });
    //  ══ (ب) موظّفٌ يملك صلاحية التقارير تحديداً — منفصلةٌ عن canViewPatients
    //  عمداً: التقاريرُ صلاحيةٌ حقيقية بذاتها (`canViewReports`)، لا تابعةٌ
    //  لصلاحية عرض سجلّ المرضى.
    const scopedRecepReports = access({
      userId: RECEPTION, role: "reception",
      permissions: { canViewPatients: true, canViewReports: true }, operationalBranches: [B1],
    });

    check(!toolsFor(scopedNoView).some((t) => t.name === "patient_search"),
      "أ.١ **لا تُعرَض** لمن لا يملك canViewPatients");
    check(toolsFor(scopedRecep).some((t) => t.name === "patient_search"), "أ.٢ تُعرَض لمن يملك canViewPatients");

    const deniedDirect = await executeTool(scopedNoView, "patient_search", { query: MARK });
    check(deniedDirect.ok === false, "أ.٣ ونداءٌ مباشر (متجاوزاً toolsFor) يُرفَض أيضاً");

    const found = await executeTool(scopedRecep, "patient_search", { query: MARK });
    check(found.ok === true, "أ.٤ بحثٌ ناجح لمن يملك الصلاحية");
    const results = (found.data as any).results as any[];
    check(results.length <= 5, "أ.٥ محدودةٌ بخمسة نتائج كحدٍّ أقصى", `len=${results.length}`);
    check(results.every((r) => typeof r.patientCode === "string" && !("id" in r) && !("patientId" in r)),
      "أ.٦ لا رقمَ مريضٍ داخليّاً في أيّ نتيجة");
    check(!results.some((r) => r.patientCode === patientCode(3)),
      "أ.٧ **مريضُ فرعٍ آخر لا يظهر** — النطاقُ يُفرض قبل القراءة");
    check(!results.some((r) => r.patientCode === patientCode(4)),
      "أ.٨ **المريضُ المحذوف (سلّة) لا يظهر**");
    check(results.some((r) => r.patientCode === patientCode(1)), "أ.٩ مريضُ الفرع الفعّال يظهر");

    const tooShort = await executeTool(scopedRecep, "patient_search", { query: "ا" });
    check(tooShort.ok === false, "أ.١٠ استعلامٌ أقصر من حرفين يُرفَض");

    const outOfScopeQuery = await executeTool(scopedRecep, "patient_search", { query: patientCode(3) });
    same("أ.١١ بحثٌ برمز مريضٍ خارج النطاق ⟶ نتائج فارغة (لا رسالةَ فرقٍ عن «غير موجود»)",
      (outOfScopeQuery.data as any).results, []);

    const adminSearch = await executeTool(adminAccess, "patient_search", { query: MARK });
    check((adminSearch.data as any).results.some((r: any) => r.patientCode === patientCode(3)),
      "أ.١٢ المسؤولُ (نطاقٌ null) يرى مرضى كلّ الفروع");

    // ══ ب. operational_summary — صلاحيةٌ حقيقية (canViewReports)، لا للجميع ═
    console.log("\n── ب. operational_summary ──");
    //  ══ (تصحيحٌ — مراجعةٌ حيّة على PR #281) لم تعد «متاحةً للجميع» ══════
    //  التقاريرُ صلاحيةٌ حقيقية في التطبيق (`canViewReports`، تحرس كلّ نقطة
    //  تقريرٍ في `server/routes.ts`) — لا افتراضَ دورٍ ولا اشتقاقٌ من
    //  `canViewPatients`. `scopedRecep` يملك الثانية دون الأولى فيبقى محجوباً.
    check(!toolsFor(scopedRecep).some((t) => t.name === "operational_summary"),
      "ب.١ **بلا canViewReports لا تُعرَض** — ولو ملك المستخدم canViewPatients");
    const opsDeniedDirect = await executeTool(scopedRecep, "operational_summary", { startDate: TODAY, endDate: TODAY });
    check(opsDeniedDirect.ok === false, "ب.١ب ونداءٌ مباشر (متجاوزاً toolsFor، كأنّ النموذج اخترع الاسم) يُرفَض أيضاً");
    check(!toolsFor(scopedNoView).some((t) => t.name === "operational_summary"),
      "ب.١ج ومن لا يملك أيّ صلاحيةٍ عرضٍ لا يراها كذلك");

    check(toolsFor(scopedRecepReports).some((t) => t.name === "operational_summary"),
      "ب.١د **canViewReports=true ⟶ تُعرَض** ضمن نطاق الفرع");
    check(toolsFor(adminAccess).some((t) => t.name === "operational_summary"),
      "ب.١هـ والمسؤولُ العام يراها دائماً — بسلطته لا بعَلَمٍ صريح على صفّه");

    const opsB1 = await executeTool(scopedRecepReports, "operational_summary", { startDate: TODAY, endDate: TODAY });
    check(opsB1.ok === true, "ب.٢ نجاحٌ لموظّف فرع أ يملك canViewReports");
    const opsData = opsB1.data as any;
    check(opsData.newPatients >= 3, "ب.٣ عدّ المرضى الجدد يشمل المرضى الثلاثة الفعّالين في فرع أ (وربما أكثر من تشغيلاتٍ أخرى)",
      `newPatients=${opsData.newPatients}`);
    check(typeof opsData.awaitingExamNow === "number", "ب.٤ awaitingExamNow رقمٌ حاضر");
    check(typeof opsData.manufacturingNow.activeBuilds === "number", "ب.٥ manufacturingNow.activeBuilds رقمٌ حاضر");
    check(opsData.byBranch === null, "ب.٦ **بلا تفصيلٍ بالفرع لغير المسؤول**");
    check(opsData.physiotherapySessions >= 1, "ب.٧ جلسةُ العلاج الطبيعي المُدرَجة مُحتسَبة", `n=${opsData.physiotherapySessions}`);
    //  ══ ب.٧ب — activePhysiotherapyPatientsNow (المهمّة الأصلية، أُكمِلت الآن) ══
    //  **حالةٌ الآن لا مقياسَ فترة**: P5_PHYSIO يحمل `patient_cases` بنوع
    //  physiotherapy وحالة active — نفسُ حقيقة `my_worklist` بالحرف
    //  (`shared` بين الأداتين لا حسابٌ ثانٍ). ويبقى حاضراً بصرف النظر عن
    //  startDate/endDate المطلوبتين — لذلك لا يظهر في `comparison` أدناه.
    check(typeof opsData.activePhysiotherapyPatientsNow === "number"
      && opsData.activePhysiotherapyPatientsNow >= 1,
      "ب.٧ب **activePhysiotherapyPatientsNow** يحتسب مريض العلاج الطبيعي النشط",
      `n=${opsData.activePhysiotherapyPatientsNow}`);

    //  ══ فرعٌ من الطلب لا يُعتمَد لغير المسؤول — ولو ملك canViewReports ══
    const opsIgnoredBranch = await executeTool(scopedRecepReports, "operational_summary", { startDate: TODAY, endDate: TODAY, branchId: B2 });
    check((opsIgnoredBranch.data as any).newPatients === opsData.newPatients,
      "ب.٨ **فرعٌ في الطلب من غير مسؤول يُتجاهَل** — النتيجةُ مطابقةٌ لنطاق جلسته لا للفرع المطلوب");

    const opsAdminAll = await executeTool(adminAccess, "operational_summary", { startDate: TODAY, endDate: TODAY });
    check(Array.isArray((opsAdminAll.data as any).byBranch), "ب.٩ المسؤولُ بلا فرعٍ محدَّد يحصل على تفصيلٍ بالفرع");

    const opsAdminOneBranch = await executeTool(adminAccess, "operational_summary", { startDate: TODAY, endDate: TODAY, branchId: B1 });
    check((opsAdminOneBranch.data as any).byBranch === null, "ب.١٠ والمسؤولُ بفرعٍ محدَّد لا يحصل على تفصيلٍ بالفرع");

    const opsTooLong = await executeTool(adminAccess, "operational_summary", { startDate: "2020-01-01", endDate: "2020-12-31" });
    check(opsTooLong.ok === false, "ب.١١ مدىً أطول من ٩٢ يوماً **يُرفَض صراحةً لا يُقصَّر صامتاً**");

    const opsBadRange = await executeTool(adminAccess, "operational_summary", { startDate: TODAY, endDate: "2020-01-01" });
    check(opsBadRange.ok === false, "ب.١٢ تاريخُ بدايةٍ بعد تاريخ النهاية يُرفَض");

    //  ══ canViewReports:true هنا **لأنّ ما يُختبَر نطاقُ الفرع لا الصلاحية**
    //  — بلا هذا العَلَم يُرَدّ الطلبُ بسبب الصلاحية فيُخفي ما يُراد إثباته.
    const emptyScope = access({
      userId: 777, role: "reception", permissions: { canViewReports: true }, operationalBranches: [],
    });
    const opsEmptyScope = await executeTool(emptyScope, "operational_summary", { startDate: TODAY, endDate: TODAY });
    same("ب.١٣ نطاقٌ فارغٌ (جلسةٌ بلا فرع) ⟶ صفرٌ حقيقيّ لا خطأ — مطابقٌ لبقيّة أدوات المساعد", opsEmptyScope.data.newPatients, 0);

    //  ══ ب.١٤ — حدودُ اليوم **بتوقيت بغداد لا UTC** (مراجعةٌ حيّة) ══════════
    //  `patients.created_at`/`visits.visit_date` أعمدةُ `TIMESTAMP WITHOUT
    //  TIME ZONE` تُكتَب بـNOW() على جلسةٍ توقيتُها UTC — فمقارنةٌ خاميّة
    //  بـ`'YYYY-MM-DD'::date` تحسب حدود اليوم بتوقيت UTC لا بغداد (فرقُ ٣
    //  ساعات). مريضٌ سُجّل بتوقيت بغداد ٠٠:٣٠ (= ٢١:٣٠ UTC اليوم السابق)
    //  زمنٌ اخترناه عمداً — يقع بين منتصفَي الليلين فيفضح أيّ إزاحةٍ ناقصة.
    console.log("\n── ب.١٤ حدود اليوم بتوقيت بغداد ──");
    const BOUNDARY_DAY = "2025-01-16"; // بتوقيت بغداد
    const BOUNDARY_UTC_PREV_DAY = "2025-01-15"; // نفسُ اللحظة بتوقيت UTC الخام
    const PBOUNDARY = 89406;
    await q(`
      INSERT INTO patients
        (id, patient_code, name, phone, branch_id, is_amputee, is_physiotherapy, total_cost,
         referral_source, age, medical_condition, created_at, deleted_at)
      VALUES ($1, $2, '${MARK} حدّ التوقيت', '07701110006', $3, false, false, 0, '${MARK}', '30', '${MARK}',
        '2025-01-15 21:30:00'::timestamp, NULL)
    `, [PBOUNDARY, patientCode(6), B1]);
    try {
      const opsBoundaryDay = await executeTool(scopedRecepReports, "operational_summary",
        { startDate: BOUNDARY_DAY, endDate: BOUNDARY_DAY });
      check(opsBoundaryDay.data.newPatients === 1,
        "ب.١٤.١ **مريضٌ سُجّل ٠٠:٣٠ بتوقيت بغداد يُحتسَب ضمن يومه ببغداد (١٦ كانون الثاني) لا يوم UTC (١٥)**",
        `newPatients=${opsBoundaryDay.data.newPatients}`);
      const opsBoundaryPrevDay = await executeTool(scopedRecepReports, "operational_summary",
        { startDate: BOUNDARY_UTC_PREV_DAY, endDate: BOUNDARY_UTC_PREV_DAY });
      check(opsBoundaryPrevDay.data.newPatients === 0,
        "ب.١٤.٢ **ولا يظهر في يوم UTC الخام (١٥) رغم أن `created_at` مكتوبٌ بتاريخه**",
        `newPatients=${opsBoundaryPrevDay.data.newPatients}`);
    } finally {
      await q(`DELETE FROM patients WHERE id = $1`, [PBOUNDARY]);
    }

    //  ══ ب.١٥ — compare: مقاييسُ الفترة فقط، بفترتها الخاصّة ═════════════
    //  المهمّة الأصلية تطلب مقارنةً بالفترة السابقة بنفس الطول لـ
    //  newPatients/visits/physiotherapySessions **فقط** — لا حالة الآن.
    console.log("\n── ب.١٥ compare (الفترة السابقة) ──");
    const prevDayDate = new Date(`${TODAY}T00:00:00Z`);
    prevDayDate.setUTCDate(prevDayDate.getUTCDate() - 1);
    const PREV_DAY = prevDayDate.toISOString().slice(0, 10);
    const P6_PREV = 89407;
    //  ٠٩:٠٠ UTC = ١٢:٠٠ بغداد — منتصفَ اليوم السابق بكلا التقويمين، فلا
    //  التباسَ حدوديّاً كالذي يثبته ب.١٤ عمداً.
    await q(`
      INSERT INTO patients
        (id, patient_code, name, phone, branch_id, is_amputee, is_physiotherapy, total_cost,
         referral_source, age, medical_condition, created_at, deleted_at)
      VALUES ($1, $2, '${MARK} فترة سابقة', '07701110007', $3, false, false, 0, '${MARK}', '30', '${MARK}',
        '${PREV_DAY} 09:00:00'::timestamp, NULL)
    `, [P6_PREV, patientCode(7), B1]);
    try {
      const opsNoCompare = await executeTool(scopedRecepReports, "operational_summary", { startDate: TODAY, endDate: TODAY });
      check((opsNoCompare.data as any).comparison === null,
        "ب.١٥.١ بلا compare ⟶ comparison تبقى null (كالسلوك الافتراضي دائماً)");

      const opsCompare = await executeTool(scopedRecepReports, "operational_summary",
        { startDate: TODAY, endDate: TODAY, compare: true });
      const cmp = (opsCompare.data as any).comparison;
      check(cmp !== null, "ب.١٥.٢ compare:true ⟶ comparison غيرُ فارغة");
      same("ب.١٥.٣ **الفترةُ السابقة بنفس الطول بالضبط** — يومٌ واحدٌ سابقٌ ليومٍ واحد",
        [cmp?.start, cmp?.end], [PREV_DAY, PREV_DAY]);
      //  ══ (مراجعةٌ إنتاجية) — كلُّ مقياسٍ كائنٌ محسوبٌ، لا رقمَ فترتين خامَين ══
      //  `metrics.newPatients` (وأخواتها) صار `{currentValue, previousValue,
      //  delta, percentChange}` — النموذج يرحّله كما هو، ولا يطرح بنفسه.
      const newPatientsCmp = cmp?.metrics?.newPatients;
      check(newPatientsCmp?.previousValue >= 1,
        "ب.١٥.٤ ومريضُ الفترة السابقة مُحتسَبٌ في previousValue", `newPatients=${JSON.stringify(newPatientsCmp)}`);
      //  ══ **ولا مقياسَ «آن» واحداً يتسلّل إلى المقارنة** — الأثبتُ هنا: ══
      //  مقارنةُ فترةٍ تاريخية بحالةٍ حاضرة تُنتج رقماً لا معنى له (كأنّ
      //  الطابورَ أو التصنيعَ «كانا كذلك» في الأمس، وهما لم يُقاسا هناك أصلاً).
      check(!("awaitingExamNow" in (cmp ?? {}))
        && !("manufacturingNow" in (cmp ?? {}))
        && !("activePhysiotherapyPatientsNow" in (cmp ?? {})),
        "ب.١٥.٥ **بلا awaitingExamNow/manufacturingNow/activePhysiotherapyPatientsNow في comparison** — تلك حالةٌ الآن لا فترة",
        JSON.stringify(cmp));
      same("ب.١٥.٦ ومقاييسُ الفترة الحاضرة نفسُها لم تتحرّك بسبب compare — مطابقةٌ لنداءٍ بلا compare",
        [(opsCompare.data as any).newPatients, (opsCompare.data as any).visits, (opsCompare.data as any).physiotherapySessions],
        [opsData.newPatients, opsData.visits, opsData.physiotherapySessions]);
      //  ══ ب.١٥.٧ — شكلُ `metrics`: ثلاثةٌ فقط، وكلٌّ كائنٌ محسوبٌ كاملاً ══
      same("ب.١٥.٧ metrics تحمل newPatients/visits/physiotherapySessions فقط",
        Object.keys(cmp?.metrics ?? {}).sort(), ["newPatients", "physiotherapySessions", "visits"]);
      same("   وكلُّ حقلٍ منها أربعةُ مفاتيح بالضبط",
        Object.keys(newPatientsCmp ?? {}).sort(), ["currentValue", "delta", "percentChange", "previousValue"]);
      //  ══ ب.١٥.٨ — الحسابُ الحقيقيّ يطابق `computeComparison` نفسَها حرفياً:
      //  currentValue من العدّ الحاضر، وdelta/percentChange مشتقّان منه ومن
      //  previousValue بالصيغة نفسِها — لا نسخةَ حسابٍ ثانية داخل الأداة ══
      same("ب.١٥.٨ currentValue يطابق newPatients الحاضر بالضبط",
        newPatientsCmp?.currentValue, (opsCompare.data as any).newPatients);
      same("   وdelta/percentChange يطابقان computeComparison على نفس الرقمين حرفياً",
        [newPatientsCmp?.delta, newPatientsCmp?.percentChange],
        [
          computeComparison(newPatientsCmp?.currentValue, newPatientsCmp?.previousValue).delta,
          computeComparison(newPatientsCmp?.currentValue, newPatientsCmp?.previousValue).percentChange,
        ]);
    } finally {
      await q(`DELETE FROM patients WHERE id = $1`, [P6_PREV]);
    }

    //  ══ ب.١٦ — زيارةٌ محذوفةٌ ناعماً لا تُحتسَب في تفصيل الفرع (byBranch) ══
    //  «العدُّ الرئيسيّ يستبعد المحذوف؛ تفصيلُ byBranch للمسؤول يجب أن يطابقه
    //  بالحرف» — نفسُ الاستبعاد الذي يفرضه `deleted_at IS NULL` على العدّ
    //  الرئيسيّ (سطرٌ ١٤١ في `reports.ts`) يجب أن يفرضه أيضاً على تجميع
    //  الفرع (سطرٌ ١٨٦-١٨٩). **مُتحقَّقٌ حيّاً هنا لا مُفترَض**: قراءةٌ فُحص
    //  الكودُ قبلها ووُجد فيه `deleted_at IS NULL` بالفعل — هذا الاختبارُ
    //  يقفلها ثابتةً بدل تركها ادّعاءً غيرَ مُختبَر.
    console.log("\n── ب.١٦ زيارةٌ محذوفة لا تُحتسَب في byBranch ──");
    const beforeDel = await executeTool(adminAccess, "operational_summary", { startDate: TODAY, endDate: TODAY });
    const b1VisitsBefore = ((beforeDel.data as any).byBranch as any[]).find((b) => b.branchId === B1)?.visits ?? 0;
    const [delVisitRow] = (await q(`
      INSERT INTO visits (patient_id, branch_id, treatment_type, visit_date, cost, deleted_at)
      VALUES ($1, $2, '${MARK} محذوفة', NOW(), 0, NOW()) RETURNING id
    `, [P1, B1])).rows;
    const afterDel = await executeTool(adminAccess, "operational_summary", { startDate: TODAY, endDate: TODAY });
    const b1VisitsAfter = ((afterDel.data as any).byBranch as any[]).find((b) => b.branchId === B1)?.visits ?? 0;
    same("ب.١٦.١ **زيارةٌ محذوفةٌ ناعماً لا تُضيف إلى تفصيل الفرع (byBranch)** — مطابقةً للعدّ الرئيسيّ",
      b1VisitsAfter, b1VisitsBefore);
    //  والعدُّ الرئيسيّ (لا byBranch) على نفس الجلسة يبقى غيرَ متأثّرٍ أيضاً —
    //  إثباتُ أن كِلا العدّادين يتّفقان لا أحدُهما فقط.
    const mainAfterDel = await executeTool(scopedRecepReports, "operational_summary", { startDate: TODAY, endDate: TODAY });
    same("ب.١٦.٢ والعدُّ الرئيسيّ (visits) لنفس الفرع أيضاً لم يتغيّر",
      (mainAfterDel.data as any).visits, opsData.visits);
    await q(`DELETE FROM visits WHERE id = $1`, [delVisitRow.id]);

    //  ══ ب.١٧ — branchId فاشلٌ مغلَقاً للمسؤول: لا تحوّلَ صامتاً لكلّ الفروع ══
    console.log("\n── ب.١٧ branchId فاشلٌ مغلَقاً (المسؤول) ──");
    const badAdminBranchIds: Array<{ v: unknown; label: string }> = [
      { v: "abc", label: "نصٌّ غيرُ رقميّ" },
      { v: 0, label: "صفر" },
      { v: -3, label: "سالب" },
      { v: 2.5, label: "كسريّ" },
      { v: 999999, label: "فرعٌ غيرُ موجود" },
      { v: true, label: "بوليان (لا يُقبَل رقماً)" },
      { v: [B1], label: "مصفوفة" },
      { v: {}, label: "كائن" },
    ];
    for (const { v, label } of badAdminBranchIds) {
      const r = await executeTool(adminAccess, "operational_summary", { startDate: TODAY, endDate: TODAY, branchId: v });
      check(r.ok === false, `ب.١٧ branchId=${JSON.stringify(v)} (${label}) ⟶ خطأٌ صريح لا كلّ الفروع صامتاً`,
        JSON.stringify(r));
    }
    //  والغيابُ الصريح يبقى صحيحاً بعد كلّ هذه المحاولات — لا أثرَ جانبيّ.
    const opsAdminAgain = await executeTool(adminAccess, "operational_summary", { startDate: TODAY, endDate: TODAY });
    check(Array.isArray((opsAdminAgain.data as any).byBranch),
      "ب.١٧ب وغيابُ branchId يبقى «كلّ الفروع» بلا أثرٍ من المحاولات الفاشلة أعلاه");
    //  ══ وغيرُ المسؤول: **لا يُفحَص أصلاً** — يُتجاهَل كأيّ قيمةٍ أخرى، ولا
    //  يُرَدّ بخطإٍ بسبب شكله (السلطةُ من الجلسة فقط، فالتحقّقُ لا يخصّه).
    const nonAdminBadBranch = await executeTool(scopedRecepReports, "operational_summary",
      { startDate: TODAY, endDate: TODAY, branchId: "abc" });
    check(nonAdminBadBranch.ok === true,
      "ب.١٧ج **وغيرُ المسؤول بـbranchId مشوَّه لا يُرفَض** — يُتجاهَل بصمت لأنه ليس سلطةً أصلاً",
      JSON.stringify(nonAdminBadBranch));

    //  ══ ب.١٨ — branchId="" (فراغٌ صريح) **ليس غياباً** ══════════════════
    //  (تصحيحٌ — مراجعةٌ حيّة) — كانت `""` تُقرأ مثل الغياب تماماً ⟶ «كلّ
    //  الفروع» صامتاً. المفتاحُ وصل بقيمةٍ لا تصلح رقماً، فيُرفَض كأيّ
    //  قيمةٍ أخرى في `badAdminBranchIds` أعلاه — لا استثناءَ للفراغ.
    console.log("\n── ب.١٨ branchId=\"\" (فراغٌ صريح) للمسؤول ──");
    for (const emptyLike of ["", "   "]) {
      const r = await executeTool(adminAccess, "operational_summary",
        { startDate: TODAY, endDate: TODAY, branchId: emptyLike });
      check(r.ok === false,
        `ب.١٨ branchId=${JSON.stringify(emptyLike)} ⟶ خطأٌ صريح — **ليس** غياباً ولا كلّ الفروع`,
        JSON.stringify(r));
    }
    //  وغيرُ المسؤول: الفراغُ يُتجاهَل كأيّ قيمةٍ أخرى، بلا فحصٍ أصلاً.
    const nonAdminEmptyBranch = await executeTool(scopedRecepReports, "operational_summary",
      { startDate: TODAY, endDate: TODAY, branchId: "" });
    check(nonAdminEmptyBranch.ok === true,
      "ب.١٨ب وغيرُ المسؤول بـbranchId=\"\" لا يُرفَض كذلك — نطاقُه من الجلسة وحدها");

    //  ══ ب.١٩ — تحقّقٌ صارمٌ من التاريخ: حضورٌ مشوَّه لا يُقرأ غياباً ═════
    //  (تصحيحٌ — مراجعةٌ حيّة) — كان تاريخٌ **مُرسَلٌ صراحةً** بصيغةٍ خاطئة
    //  أو تقويمٍ مستحيل يسقط بصمتٍ إلى `null` فيحلّ محلَّه «اليوم» أو
    //  التاريخُ الآخر — طلبٌ لفترةٍ محدَّدة ينقلب صمتاً إلى فترةٍ لم تُطلَب.
    console.log("\n── ب.١٩ تحقّقٌ صارمٌ من startDate/endDate ──");
    const badDates: Array<{ v: unknown; label: string }> = [
      { v: "2026-02-31", label: "تقويمٌ مستحيل — لا ٣١ شباط" },
      { v: "2026-13-01", label: "شهرٌ غيرُ موجود" },
      { v: "2026-00-10", label: "شهرٌ صفر" },
      { v: "2026-04-31", label: "نيسان بلا يوم ٣١" },
      { v: "09/09/2026", label: "صيغةٌ مختلفة (DD/MM/YYYY)" },
      { v: "2026-9-9", label: "بلا أصفارٍ بادئة" },
      { v: "not-a-date", label: "نصٌّ عشوائيّ" },
      { v: "", label: "سلسلةٌ فارغة" },
      { v: "   ", label: "بياضٌ محض" },
      { v: 20260909, label: "رقمٌ لا نصّاً" },
      { v: true, label: "بوليان" },
      { v: {}, label: "كائن" },
      { v: [TODAY], label: "مصفوفة" },
    ];
    for (const { v, label } of badDates) {
      const rStart = await executeTool(scopedRecepReports, "operational_summary", { startDate: v, endDate: TODAY });
      check(rStart.ok === false,
        `ب.١٩ operational_summary: startDate=${JSON.stringify(v)} (${label}) ⟶ خطأٌ صريح لا استبدالاً باليوم`,
        JSON.stringify(rStart));
      const rEnd = await executeTool(scopedRecepReports, "operational_summary", { startDate: TODAY, endDate: v });
      check(rEnd.ok === false,
        `ب.١٩ operational_summary: endDate=${JSON.stringify(v)} (${label}) ⟶ خطأٌ صريح`,
        JSON.stringify(rEnd));
    }
    //  ══ والسلوكُ الصحيح لم يتغيّر: تاريخٌ صحيحٌ واحد ⟶ يومٌ واحد، وغيابٌ
    //  (بلا startDate/endDate إطلاقاً، أو `null` صريحة) ⟶ اليوم كالمعتاد.
    const oneValidDate = await executeTool(scopedRecepReports, "operational_summary", { startDate: TODAY });
    same("ب.١٩ب **تاريخٌ صحيحٌ واحد يبقى يومَه نفسَه** (لم يتغيّر السلوك القائم)",
      [oneValidDate.data.start, oneValidDate.data.end], [TODAY, TODAY]);
    const noDatesAtAll = await executeTool(scopedRecepReports, "operational_summary", {});
    same("ب.١٩ج وغيابُ الحقلين معاً يبقى اليوم — كالمعتاد",
      [noDatesAtAll.data.start, noDatesAtAll.data.end], [TODAY, TODAY]);
    const explicitNullDates = await executeTool(scopedRecepReports, "operational_summary",
      { startDate: null, endDate: null });
    same("ب.١٩د و`null` صريحةً تُقرأ غياباً أيضاً — اليوم كالمعتاد",
      [explicitNullDates.data.start, explicitNullDates.data.end], [TODAY, TODAY]);

    // ══ ج. financial_summary ══════════════════════════════════════════════
    console.log("\n── ج. financial_summary ──");
    const financeAccess = resolveAiAccess({
      session: { userId: ACCOUNTANT, role: "accountant", isAdmin: false, branchId: B1, permissions: { canManageAccounting: true } },
      scopeBranchId: B1,
    });
    const generalAccess = access({ userId: RECEPTION, role: "reception", operationalBranches: [B1], mode: "general" });

    check(!toolsFor(generalAccess).some((t) => t.name === "financial_summary"), "ج.١ لا تُعرَض لغير الوضع المالي");
    const deniedFin = await executeTool(generalAccess, "financial_summary", { startDate: TODAY, endDate: TODAY });
    check(deniedFin.ok === false, "ج.٢ ونداءٌ مباشر يُرفَض أيضاً");

    const finResult = await executeTool(financeAccess, "financial_summary", { startDate: TODAY, endDate: TODAY });
    check(finResult.ok === true, "ج.٣ نجاحٌ للمحاسب");
    const finData = finResult.data as any;
    //  ══ التطابقُ البنيويّ مع `storage.getAccountingSummary` — **لا حسابَ
    //  ثانياً**: نفسُ الاستدعاء بنفس الوسائط يجب أن يعطي نفسَ الأرقام.
    const canonical = await storage.getAccountingSummary(B1, TODAY, TODAY, { baghdadDays: true });
    //  ══ لا تبديلَ بين المبيعات والإيراد الفعليّ ══
    //  `totalRevenue` (الاسمُ الموروث في `storage.ts`) هو **قيمةُ المبيعات**
    //  (قيدُ كلفة)، و`totalPaid` هو **النقدُ المقبوضُ فعلاً**. محوِّلُ
    //  المساعد يخرج بأسماءَ صادقة: salesValue ⟵ totalRevenue، وrevenue ⟵
    //  totalPaid — لا العكس.
    same("ج.٤ **قيمةُ المبيعات (salesValue) مطابقةٌ حرفياً** لـ`totalRevenue` — لا حسابَ مُوازٍ", finData.current.salesValue, canonical.totalRevenue);
    same("ج.٥ **الإيرادُ الفعليّ (revenue) مطابقٌ حرفياً** لـ`totalPaid` — النقدُ المقبوض لا المبيعات", finData.current.revenue, canonical.totalPaid);
    check(finData.current.salesValue === SALES_AMOUNT, "ج.٥.١ salesValue = مبلغُ قيد الكلفة المُدرَج (٥٠٠,٠٠٠)", `got=${finData.current.salesValue}`);
    check(finData.current.revenue === PAID_AMOUNT, "ج.٥.٢ revenue = مبلغُ الدفعة المُدرَجة (٢٠٠,٠٠٠) — **وليس** ٥٠٠,٠٠٠", `got=${finData.current.revenue}`);
    check(finData.current.salesValue !== finData.current.revenue,
      "ج.٥.٣ **الحقلان مختلفان فعلياً في هذه البيانات** — فتطابقٌ صدفويّ (كلاهما صفر) لا يمكن أن يُخفي انعكاساً مستقبلياً");
    check(!("receivedCash" in finData.current), "ج.٥.٤ لا حقلَ `receivedCash` قديماً متروكاً في المخرَج");
    same("ج.٦ **المصاريفُ مطابقةٌ حرفياً**", finData.current.expenses, canonical.totalExpenses);
    same("ج.٧ **الصافي مطابقٌ حرفياً** (= revenue − expenses، نقدٌ لا مبيعات)", finData.current.net, canonical.netProfit);
    check(finData.comparison === null, "ج.٨ بلا مقارنةٍ ما لم تُطلَب صراحةً");

    const finCompare = await executeTool(financeAccess, "financial_summary", { startDate: TODAY, endDate: TODAY, compare: true });
    check((finCompare.data as any).comparison !== null, "ج.٩ compare:true ينتج مقارنة");

    //  ══ فرعٌ من الطلب من غير مسؤول لا يوسّع نطاقه الماليّ ══
    const finOtherBranchIgnored = await executeTool(financeAccess, "financial_summary", { startDate: TODAY, endDate: TODAY, branchId: B2 });
    same("ج.١٠ **فرعٌ في الطلب من غير مسؤول يُتجاهَل** — نطاقُه الماليّ الموقَّع وحده يُستعمَل",
      (finOtherBranchIgnored.data as any).current, finData.current);

    check(finData.byBranch === null, "ج.١١ غيرُ المسؤول لا يحصل على تفصيلٍ بالفرع");

    const finTooLong = await executeTool(financeAccess, "financial_summary", { startDate: "2020-01-01", endDate: "2025-01-01" });
    check(finTooLong.ok === false, "ج.١٢ مدىً أطول من سنة يُرفَض صراحةً");

    //  ══ ج.١٣ — branchId فاشلٌ مغلَقاً للمسؤول (نفسُ حارس operational_summary) ══
    console.log("\n── ج.١٣ branchId فاشلٌ مغلَقاً (المسؤول، ماليّ) ──");
    const financeAdminAccess = resolveAiAccess({
      session: { userId: ADMIN, role: "admin", isAdmin: true, permissions: {} },
    });
    check(financeAdminAccess.mode === "financial" && financeAdminAccess.isAdmin,
      "ج.١٣.٠ (تجهيز) جلسةُ مسؤولٍ ماليّة فعلاً — بلا هذا الشرط تصبح الاختباراتُ التالية بلا معنى");
    const badFinBranchIds: Array<{ v: unknown; label: string }> = [
      { v: "abc", label: "نصٌّ غيرُ رقميّ" }, { v: 0, label: "صفر" },
      { v: -1, label: "سالب" }, { v: 1.5, label: "كسريّ" },
      { v: 999999, label: "فرعٌ غيرُ موجود" }, { v: false, label: "بوليان" },
    ];
    for (const { v, label } of badFinBranchIds) {
      const r = await executeTool(financeAdminAccess, "financial_summary", { startDate: TODAY, endDate: TODAY, branchId: v });
      check(r.ok === false, `ج.١٣ branchId=${JSON.stringify(v)} (${label}) ⟶ خطأٌ صريح لا كلّ الفروع صامتاً`,
        JSON.stringify(r));
    }
    const finAdminValidBranch = await executeTool(financeAdminAccess, "financial_summary",
      { startDate: TODAY, endDate: TODAY, branchId: B1 });
    check(finAdminValidBranch.ok === true, "ج.١٣ب وbranchId صحيحٌ وموجودٌ يبقى يعمل بعد كلّ الرفض أعلاه");
    const finAdminAbsent = await executeTool(financeAdminAccess, "financial_summary", { startDate: TODAY, endDate: TODAY });
    check(Array.isArray(finAdminAbsent.data.byBranch), "ج.١٣ج وغيابُ branchId يبقى «كلّ الفروع» — تفصيلٌ بكلّ فرع");

    //  ══ ج.١٤ — غيرُ المسؤول: branchId مشوَّه يُتجاهَل بصمت (لا يُفحَص أصلاً) ══
    const nonAdminBadFinBranch = await executeTool(financeAccess, "financial_summary",
      { startDate: TODAY, endDate: TODAY, branchId: "abc" });
    check(nonAdminBadFinBranch.ok === true,
      "ج.١٤ **وغيرُ المسؤول بـbranchId مشوَّه لا يُرفَض** — نطاقُه الماليّ الموقَّع وحده يُستعمَل",
      JSON.stringify(nonAdminBadFinBranch));

    //  ══ ج.١٥ — branchId="" للمسؤول الماليّ: فراغٌ صريحٌ لا غياب ══════════
    console.log("\n── ج.١٥ branchId=\"\" للمسؤول (ماليّ) ──");
    for (const emptyLike of ["", "  "]) {
      const r = await executeTool(financeAdminAccess, "financial_summary",
        { startDate: TODAY, endDate: TODAY, branchId: emptyLike });
      check(r.ok === false,
        `ج.١٥ branchId=${JSON.stringify(emptyLike)} ⟶ خطأٌ صريح — ليس غياباً`, JSON.stringify(r));
    }

    //  ══ ج.١٦ — تحقّقٌ صارمٌ من التاريخ (نفسُ قائمة ب.١٩، نقطةٌ ثانية) ═════
    console.log("\n── ج.١٦ تحقّقٌ صارمٌ من startDate/endDate (ماليّ) ──");
    for (const { v, label } of [
      { v: "2026-02-31", label: "تقويمٌ مستحيل" },
      { v: "09/09/2026", label: "صيغةٌ مختلفة" },
      { v: "", label: "سلسلةٌ فارغة" },
      { v: 20260909, label: "رقمٌ" },
    ]) {
      const r = await executeTool(financeAccess, "financial_summary", { startDate: v, endDate: TODAY });
      check(r.ok === false,
        `ج.١٦ financial_summary: startDate=${JSON.stringify(v)} (${label}) ⟶ خطأٌ صريح`, JSON.stringify(r));
    }
    const finOneValidDate = await executeTool(financeAccess, "financial_summary", { startDate: TODAY });
    same("ج.١٦ب وتاريخٌ صحيحٌ واحد يبقى يومَه نفسَه", finOneValidDate.data.current.start, TODAY);

    //  ══ ج.١٧ — شكلُ `comparison`: مقاييسُ الفترة فقط، بلا أرقام «الآن» ════
    //  `getAccountingSummary` يعرّف `totalRemaining`/`collectionRate` صراحةً
    //  أرقاماً **مدى الحياة حتى الآن** — لا مقياسَ فترة. فحملُهما في مقارنةٍ
    //  بفترةٍ سابقة يوهم بأنهما قيسا هناك، وهما لم يُقاسا. `current`/
    //  `byBranch` يحتفظان بهما (حالةٌ حاضرة، الاسمُ يقولها) — `comparison`
    //  وحدها تخلو منهما.
    console.log("\n── ج.١٧ شكلُ المقارنة — بلا أرقام «الآن»، وكلُّ مقياسٍ محسوبٌ كاملاً ──");
    const finCompareShape = await executeTool(financeAccess, "financial_summary",
      { startDate: TODAY, endDate: TODAY, compare: true });
    const cmpFin = (finCompareShape.data as any).comparison;
    check(cmpFin !== null, "ج.١٧.٠ (تجهيز) المقارنةُ موجودة فعلاً");
    check(!("outstandingLifetime" in (cmpFin ?? {})) && !("collectionRateLifetime" in (cmpFin ?? {})),
      "ج.١٧.١ **لا outstandingLifetime ولا collectionRateLifetime في comparison** — أرقامُ «الآن» لا الفترة",
      JSON.stringify(cmpFin));
    //  ══ (مراجعةٌ إنتاجية) — start/end/metrics فقط على المستوى الأعلى؛
    //  المقاييسُ الأربعة داخل metrics، كلٌّ منها كائنٌ محسوبٌ كاملاً ══════
    same("ج.١٧.٢ **والمستوى الأعلى start/end/metrics فقط**",
      Object.keys(cmpFin ?? {}).sort(), ["end", "metrics", "start"]);
    same("ج.١٧.٢ب ومقاييسُ metrics الخمسة بالضبط — salesValue/revenue/expenses/net/uncollectedSalesValue",
      Object.keys(cmpFin?.metrics ?? {}).sort(),
      ["expenses", "net", "revenue", "salesValue", "uncollectedSalesValue"]);
    const netCmp = cmpFin?.metrics?.net;
    same("ج.١٧.٢ج وكلُّ حقلٍ منها أربعةُ مفاتيح بالضبط — currentValue/previousValue/delta/percentChange",
      Object.keys(netCmp ?? {}).sort(), ["currentValue", "delta", "percentChange", "previousValue"]);
    //  ══ الحسابُ الحقيقيّ يطابق computeComparison على الرقمين المُبلَّغين
    //  حرفياً — لا نسخةَ حسابٍ ثانية داخل الأداة ══
    same("ج.١٧.٢د وdelta/percentChange في net يطابقان computeComparison على نفس الرقمين",
      [netCmp?.delta, netCmp?.percentChange],
      [
        computeComparison(netCmp?.currentValue, netCmp?.previousValue).delta,
        computeComparison(netCmp?.currentValue, netCmp?.previousValue).percentChange,
      ]);
    //  ══ وcurrent/byBranch يحتفظان بالحقلين — لم يُحذَفا من هناك ══
    const curFin = (finCompareShape.data as any).current;
    check("outstandingLifetime" in curFin && "collectionRateLifetime" in curFin,
      "ج.١٧.٣ **وcurrent يحتفظ بهما** — حالةٌ حاضرة، لم تُمَسّ", JSON.stringify(curFin));
    const finAdminByBranch = await executeTool(financeAdminAccess, "financial_summary", { startDate: TODAY, endDate: TODAY });
    const firstBranchRow = ((finAdminByBranch.data as any).byBranch ?? [])[0];
    check(Boolean(firstBranchRow) && "outstandingLifetime" in firstBranchRow && "collectionRateLifetime" in firstBranchRow,
      "ج.١٧.٤ **وbyBranch كذلك يحتفظ بهما لكلّ فرع**", JSON.stringify(firstBranchRow));

    //  ══ ج.١٨ — uncollectedSalesValue: حسابٌ صحيح، ومفهومٌ مستقلٌّ عن
    //  outstandingLifetime (القسم K من المهمّة) ══════════════════════════
    console.log("\n── ج.١٨ uncollectedSalesValue — صحّةٌ واستقلالٌ عن outstandingLifetime ──");
    same("ج.١٨.١ current.uncollectedSalesValue = salesValue − revenue **بالضبط** — لا حسابَ آخر",
      curFin.uncollectedSalesValue, curFin.salesValue - curFin.revenue);
    check(curFin.uncollectedSalesValue === SALES_AMOUNT - PAID_AMOUNT,
      "ج.١٨.٢ وبالأرقام المعروفة للفترة: ٥٠٠,٠٠٠ − ٢٠٠,٠٠٠ = ٣٠٠,٠٠٠",
      `got=${curFin.uncollectedSalesValue}`);
    //  ══ **مفهومٌ منفصل لا اسمٌ بديل لنفس الرقم**: مبيعاتُ الفترة التي لم
    //  تُقبَض بعد **في نفس الفترة** ≠ إجماليُّ ما لم يُقبَض من المريض مدى
    //  الحياة حتى الآن (outstandingLifetime يشمل مرضى آخرين وفتراتٍ أخرى) ══
    check(curFin.uncollectedSalesValue !== curFin.outstandingLifetime,
      "ج.١٨.٣ **ومختلفٌ فعلياً عن outstandingLifetime في نفس الاستجابة** — رقمان بمعنيين مختلفين، لا تطابقَ صدفويّاً يُخفي أنهما نفسَ الحساب",
      `uncollectedSalesValue=${curFin.uncollectedSalesValue} outstandingLifetime=${curFin.outstandingLifetime}`);

    const uncCmp = cmpFin?.metrics?.uncollectedSalesValue;
    check(Boolean(uncCmp) && typeof uncCmp.currentValue === "number",
      "ج.١٨.٤ compare=true يضيف uncollectedSalesValue إلى metrics أيضاً، كائناً محسوباً كاملاً", JSON.stringify(uncCmp));
    same("ج.١٨.٥ ودلتاه/نسبتُه المئوية تطابقان computeComparison على نفس الرقمين حرفياً — لا حسابَ ثانٍ داخل الأداة",
      [uncCmp?.delta, uncCmp?.percentChange],
      [
        computeComparison(uncCmp?.currentValue, uncCmp?.previousValue).delta,
        computeComparison(uncCmp?.currentValue, uncCmp?.previousValue).percentChange,
      ]);

    //  ══ توجيهُ الأداة يمنع النموذج من طرحها يدوياً — نفسُ نصّ الوصف الذي
    //  يقرؤه النموذج فعلياً، لا افتراضٌ عن نيّته ══
    const finSpec = toolsFor(financeAccess).find((t) => t.name === "financial_summary");
    check(Boolean(finSpec) && finSpec!.description.includes("uncollectedSalesValue"),
      "ج.١٨.٦ وصفُ الأداة يذكر uncollectedSalesValue صراحةً للنموذج");
    check(Boolean(finSpec) && /يدويّاً|يدوياً/.test(finSpec!.description) && finSpec!.description.includes("لا تحسبها بنفسك"),
      "ج.١٨.٧ **ويمنع صراحةً حسابها يدوياً بالطرح** — لا تعليمة نموذجٍ مفقودة", finSpec?.description);

    // ══ د. computeComparison — حسابٌ خالص، دقيقٌ حرفياً («exact arithmetic») ══
    //  الدالّةُ الواحدة التي يبنى عليها comparison.metrics.* في كلا التقريرين
    //  (تشغيليّ وماليّ) — أربعُ حالاتٍ تطلبها المهمّة صراحةً: زيادةٌ موجبة،
    //  نقصانٌ، قيمةٌ سابقة صفر، وصافٍ سالب (net قد يكون سالباً).
    console.log("\n── د. computeComparison — حسابٌ خالص ──");
    same("د.١ زيادةٌ موجبة: ١٠٠ ⟶ ١٢٠ ⟶ delta=+20، نسبة=+20%",
      computeComparison(120, 100), { currentValue: 120, previousValue: 100, delta: 20, percentChange: 20 });
    same("د.٢ نقصان: ١٠٠ ⟶ ٨٠ ⟶ delta=-20، نسبة=-20%",
      computeComparison(80, 100), { currentValue: 80, previousValue: 100, delta: -20, percentChange: -20 });
    same("د.٣ القيمةُ السابقة صفر ⟶ percentChange=null صراحةً — لا رقمَ مختلَق",
      computeComparison(50, 0), { currentValue: 50, previousValue: 0, delta: 50, percentChange: null });
    same("   وصفرٌ مقابل صفر ⟶ null أيضاً — لا 0% ملفَّقة توهم بقياسٍ وقع",
      computeComparison(0, 0), { currentValue: 0, previousValue: 0, delta: 0, percentChange: null });
    //  ══ صافٍ سالب: القسمةُ على |previousValue| عمداً — خسارةٌ تصغر (تحسّنٌ
    //  حقيقيّ) يجب أن تُقرأ نسبةً **موجبة**، لا سالبة توهم بمزيد تراجع ══
    same("د.٤ صافٍ سالبٌ يتحسّن: -50,000 ⟶ -20,000 ⟶ +60% (تحسّنٌ لا تراجع)",
      computeComparison(-20000, -50000),
      { currentValue: -20000, previousValue: -50000, delta: 30000, percentChange: 60 });
    same("   ومقابلُها — صافٍ سالبٌ يزداد سوءاً: -20,000 ⟶ -50,000 ⟶ -150%",
      computeComparison(-50000, -20000),
      { currentValue: -50000, previousValue: -20000, delta: -30000, percentChange: -150 });
    //  ══ ودقّةُ التقريب — منزلةٌ عشرية واحدة ══
    same("د.٥ التقريبُ لمنزلةٍ عشرية واحدة: ٣ ⟶ ١ ⟶ -66.7%",
      computeComparison(1, 3).percentChange, -66.7);
  } finally {
    await cleanup();
  }

  console.log(`\n${failures === 0 ? "✅ كل الاختبارات نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
