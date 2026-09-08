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

  try {
    // ══ أ. patient_search ═══════════════════════════════════════════════
    console.log("\n── أ. patient_search ──");
    const scopedRecep = access({ userId: RECEPTION, role: "reception", permissions: { canViewPatients: true }, operationalBranches: [B1] });
    const scopedNoView = access({ userId: RECEPTION_NO_VIEW, role: "reception", permissions: { canViewPatients: false }, operationalBranches: [B1] });
    const adminAccess = access({ userId: ADMIN, role: "admin", isAdmin: true, operationalBranches: null });

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

    // ══ ب. operational_summary ═══════════════════════════════════════════
    console.log("\n── ب. operational_summary ──");
    check(toolsFor(scopedNoView).some((t) => t.name === "operational_summary"),
      "ب.١ operational_summary متاحةٌ للجميع (خلافاً لـpatient_search)");

    const opsB1 = await executeTool(scopedRecep, "operational_summary", { startDate: TODAY, endDate: TODAY });
    check(opsB1.ok === true, "ب.٢ نجاحٌ لموظّف فرع أ");
    const opsData = opsB1.data as any;
    check(opsData.newPatients >= 3, "ب.٣ عدّ المرضى الجدد يشمل المرضى الثلاثة الفعّالين في فرع أ (وربما أكثر من تشغيلاتٍ أخرى)",
      `newPatients=${opsData.newPatients}`);
    check(typeof opsData.awaitingExamNow === "number", "ب.٤ awaitingExamNow رقمٌ حاضر");
    check(typeof opsData.manufacturingNow.activeBuilds === "number", "ب.٥ manufacturingNow.activeBuilds رقمٌ حاضر");
    check(opsData.byBranch === null, "ب.٦ **بلا تفصيلٍ بالفرع لغير المسؤول**");
    check(opsData.physiotherapySessions >= 1, "ب.٧ جلسةُ العلاج الطبيعي المُدرَجة مُحتسَبة", `n=${opsData.physiotherapySessions}`);

    //  ══ فرعٌ من الطلب لا يُعتمَد لغير المسؤول ══
    const opsIgnoredBranch = await executeTool(scopedRecep, "operational_summary", { startDate: TODAY, endDate: TODAY, branchId: B2 });
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

    const emptyScope = access({ userId: 777, role: "reception", operationalBranches: [] });
    const opsEmptyScope = await executeTool(emptyScope, "operational_summary", { startDate: TODAY, endDate: TODAY });
    same("ب.١٣ نطاقٌ فارغٌ (جلسةٌ بلا فرع) ⟶ صفرٌ حقيقيّ لا خطأ — مطابقٌ لبقيّة أدوات المساعد", opsEmptyScope.data.newPatients, 0);

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
    same("ج.٤ **المبيعات مطابقةٌ حرفياً** لـ`getAccountingSummary` — لا حسابَ مُوازٍ", finData.current.revenue, canonical.totalRevenue);
    same("ج.٥ **المقبوضُ نقداً مطابقٌ حرفياً**", finData.current.receivedCash, canonical.totalPaid);
    same("ج.٦ **المصاريفُ مطابقةٌ حرفياً**", finData.current.expenses, canonical.totalExpenses);
    same("ج.٧ **الصافي مطابقٌ حرفياً**", finData.current.net, canonical.netProfit);
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
