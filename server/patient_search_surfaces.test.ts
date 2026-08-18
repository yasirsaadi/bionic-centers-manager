// رمزُ المريض والأسماءُ البديلة في **كل** شاشة بحث — حيّاً على النقاط وPostgres.
// قاعدة محلّية: `npm run test:search-surfaces`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **الرمزُ يصل إلى الشاشة أصلاً**: العقد في `shared/patient_search.ts`
//     يعرف `patientCode` و`aliasCodes`، لكن معرفتَه لا تنفع إن كانت النقطة
//     لا ترسلهما. فالمُختبَر هنا هو **حمولةُ النقطة** ثمّ البحثُ فوقها.
// (٢) **والاسم البديل كذلك**: ورقةٌ بيد مريضٍ تحمل رمز ملفٍّ دُمج يجب أن
//     تجد الملفّ الباقي في أي شاشة، لا في السجلّ وحده.
// (٣) **بلا N+1**: استعلامٌ واحد لكل طلبٍ مهما كان عدد الصفوف — يُعدُّ فعلاً
//     باعتراض `pool.query`، لا بالنظر إلى الشيفرة.
// (٤) **ولا يتّسع نطاق**: رمزُ مريضٍ في فرعٍ آخر — حالياً كان أو بديلاً —
//     لا يظهر في حمولة موظّفٍ لا يملك ذلك الفرع، ولا يجده بحثُه.
//     الاسمُ البديل **معرّفٌ لا مفتاح**.

import express from "express";
import { createServer } from "http";
import { pool, db } from "./db";
import { registerRoutes } from "./routes";
import { filterAndRank } from "@shared/patient_search";
import { aliasCodesByPatient } from "./patient_code/store";

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

const PORT = 6847;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-شاشات-البحث";
const ADMIN = 9951, RECV1 = 9952, RECV2 = 9953, DOC1 = 9954, DOC2 = 9955;

const perms = { canViewPatients: true, canAddPatients: true, canEnterSessions: true };
const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 0, accessibleBranches: [1, 2],
    displayName: "adm", permissions: perms },
  recv1: { userId: RECV1, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "r1", permissions: perms },
  recv2: { userId: RECV2, role: "reception", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "r2", permissions: perms },
  doc1: { userId: DOC1, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. فرع١", permissions: { ...perms, canWriteMedicalExam: true } },
  doc2: { userId: DOC2, role: "doctor", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "د. فرع٢", permissions: { ...perms, canWriteMedicalExam: true } },
};

// ── عدّادُ استعلامات الأسماء البديلة — دليلُ غياب N+1 ────────────────────
// يُلفّ `pool.query` نفسه، فالعدّ حقيقيٌّ لا مقروءٌ من الشيفرة.
let aliasQueries = 0;
let aliasAskedIds: number[] = [];
const realQuery = pool.query.bind(pool);
(pool as any).query = (...args: any[]) => {
  const text = String(typeof args[0] === "string" ? args[0] : (args[0]?.text ?? ""));
  if (/patient_code_aliases/i.test(text) && /^\s*SELECT/i.test(text.trim())) {
    aliasQueries++;
    //  المفاتيح المطلوبة فعلاً — تُلتقط من المتغيّر لا من الشيفرة، فيمكن
    //  إثباتُ أن المسؤول عنها هو نطاقُ المستخدم لا الجدولُ كلّه.
    const params: any[] = (Array.isArray(args[1]) ? args[1] : args[0]?.values) ?? [];
    for (const v of params) {
      const m = /^\{([\d,]*)\}$/.exec(String(v));
      if (m) aliasAskedIds.push(...(m[1] ? m[1].split(",").map(Number) : []));
      else if (typeof v === "number") aliasAskedIds.push(v);
    }
  }
  return (realQuery as any)(...args);
};
const countAliasQueries = async <T>(fn: () => Promise<T>): Promise<[T, number]> => {
  aliasQueries = 0;
  aliasAskedIds = [];
  const out = await fn();
  return [out, aliasQueries];
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await realQuery(text, params);
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

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  //  طلباتُ مراجعة الطبيب (٠٥٥) تشير إلى الأمر والحلقة والزيارة — تُمسح أوّلاً.
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM follow_up_calls WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_link_tokens WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM patient_code_aliases a
            WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`);
}

async function mk(
  name: string, branchId: number, extra: { physio?: boolean; amputee?: boolean } = {},
): Promise<{ id: number; code: string }> {
  const r = await q<{ id: number; patient_code: string }>(
    `INSERT INTO patients (name, phone, referral_source, age, medical_condition,
       branch_id, is_amputee, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,$2,$3,'40','x',$4,$5,$6,0,'new') RETURNING id, patient_code`,
    [name, null, MARK, branchId, Boolean(extra.amputee), Boolean(extra.physio)]);
  return { id: r[0].id, code: r[0].patient_code };
}
const alias = (code: string, patientId: number) =>
  q(`INSERT INTO patient_code_aliases (code, patient_id, reason) VALUES ($1,$2,'merge')
     ON CONFLICT (code) DO UPDATE SET patient_id = EXCLUDED.patient_id`, [code, patientId]);

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  for (const [id, role, b, spec] of [
    [ADMIN, "admin", 1, null], [RECV1, "reception", 1, null],
    [RECV2, "reception", 2, null], [DOC1, "doctor", 1, JSON.stringify(["prosthetic"])],
    [DOC2, "doctor", 2, JSON.stringify(["prosthetic"])],
  ] as any[]) {
    await q(`INSERT INTO system_users
             (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,
              medical_specialties)
             VALUES ($1,$2,'x','موظّف',$3,$4,$5::jsonb,true,$6::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id,
               branch_ids=EXCLUDED.branch_ids, medical_specialties=EXCLUDED.medical_specialties`,
      [id, `ss_u${id}`, role, b, JSON.stringify([b]), spec]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(Buffer.from(h, "base64").toString("utf8")) } : {};
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

    // ══ العيّنة ═══════════════════════════════════════════════════════
    // مريضٌ في فرع ١ دُمج فيه ملفٌّ قديم، وآخرُ في فرع ٢ كذلك — فيُختبر
    // الوصولُ والحجب على الشكل نفسه.
    const A = await mk("زيدان فالح مطر", 1, { physio: true, amputee: true });
    const B = await mk("سجاد نوري عبد", 1, { physio: true, amputee: true });
    const X = await mk("ضرغام صبري لطيف", 2, { physio: true, amputee: true });
    const OLD_A = "WB-9910001";   // رمزُ ملفٍّ دُمج في A
    const OLD_X = "WB-9910002";   // ورمزُ ملفٍّ دُمج في X (فرع ٢)
    await alias(OLD_A, A.id);
    await alias(OLD_X, X.id);

    //  حالةُ أطراف نشطة بلا معاينة ⟶ يدخل صاحبها قائمة عمل طبيب الأطراف.
    for (const p of [A, B, X]) {
      await q(`INSERT INTO patient_cases (patient_id, case_type, status, branch_id, created_at)
               VALUES ($1,'prosthetic','active',$2, NOW() - INTERVAL '2 days')`,
        [p.id, p.id === X.id ? 2 : 1]);
    }
    //  زيارةٌ قديمة ⟶ تذكيرُ متابعة نشط (STOP_DAYS = 7).
    for (const p of [A, B, X]) {
      await q(`INSERT INTO visits (patient_id, branch_id, visit_date, treatment_type)
               VALUES ($1,$2, NOW() - INTERVAL '40 days', 'جلسة')`,
        [p.id, p.id === X.id ? 2 : 1]);
    }
    //  ومكالمةٌ مسجَّلة على مرساةٍ أخرى ⟶ صفٌّ في السجلّ بلا كتم التذكير.
    await q(`INSERT INTO follow_up_calls (patient_id, branch_id, last_visit_anchor, outcome_note, created_by)
             VALUES ($1,1, NOW() - INTERVAL '90 days', 'اتّصلنا', $2)`, [A.id, RECV1]);

    // ══ ١. قائمة عمل الطبيب ═══════════════════════════════════════════
    console.log("\n── ١. «معايناتي» ──");
    const [wl, wlQueries] = await countAliasQueries(() =>
      http("GET", "/api/medical/worklist", S.doc1));
    const wlRows: any[] = wl.body?.rows ?? [];
    check(wlRows.length >= 2, "١. قائمة الطبيب فيها صفوف", String(wlRows.length));
    const wlA = wlRows.find((r) => r.patientId === A.id);
    same("   والصفّ يحمل الرمز الحالي", wlA?.patientCode, A.code);
    same("   ويحمل الأسماء البديلة", wlA?.aliasCodes, [OLD_A]);
    same("   واستعلامُ الأسماء البديلة **واحد** لا واحدٌ لكل صفّ", wlQueries, 1);
    same("   ومفاتيحُه مفاتيحُ القائمة وحدها",
      Array.from(new Set(aliasAskedIds)).filter(
        (id) => !new Set(wlRows.map((r) => r.patientId)).has(id)), []);

    const wlSearch = (term: string) => filterAndRank(wlRows, term, (r: any) => ({
      name: r.patientName, phone: r.phone,
      patientCode: r.patientCode, aliasCodes: r.aliasCodes,
    })).map((r: any) => r.patientId);
    same("   والبحث بالرمز الحالي يجد صاحبه وحده", wlSearch(A.code), [A.id]);
    same("   **والبحث بالرمز القديم بعد الدمج يجده كذلك**", wlSearch(OLD_A), [A.id]);
    same("   وبصيغةٍ مشوّهة للرمز القديم", wlSearch(OLD_A.replace("WB-", "wb ")), [A.id]);
    same("   والبحث بالاسم يعمل كما كان", wlSearch("زيدان"), [A.id]);

    // ══ ٢. حدود الفرع ═════════════════════════════════════════════════
    console.log("\n── ٢. الفرع حاجزٌ لا يخترقه رمز ──");
    check(!wlRows.some((r) => r.patientId === X.id),
      "٢. مريضُ فرع ٢ ليس في قائمة طبيب فرع ١ أصلاً");
    same("   ورمزُه الحالي لا يجد شيئاً هنا", wlSearch(X.code), []);
    same("   **ورمزُه البديل كذلك — الاسمُ البديل معرّفٌ لا مفتاح**",
      wlSearch(OLD_X), []);
    //  والدليلُ أن الحجب بالفرع لا بحذف البيانات: طبيبُ فرع ٢ يراه كاملاً
    //  برمزه وباسمه البديل. فلا شيء نقص، بل وقف عند حدّه.
    const wl2: any[] = (await http("GET", "/api/medical/worklist", S.doc2)).body?.rows ?? [];
    const wl2X = wl2.find((r: any) => r.patientId === X.id);
    same("   وطبيبُ فرع ٢ يراه برمزه", wl2X?.patientCode, X.code);
    same("   وباسمه البديل", wl2X?.aliasCodes, [OLD_X]);
    same("   ولا يرى مريضَ فرع ١",
      wl2.some((r: any) => r.patientId === A.id), false);

    // ══ ٣. المتابعات ══════════════════════════════════════════════════
    console.log("\n── ٣. «المتابعات» ──");
    const [fu, fuQueries] = await countAliasQueries(() =>
      http("GET", "/api/follow-ups", S.recv1));
    const fuRows: any[] = fu.body ?? [];
    const fuA = fuRows.find((r) => r.patientId === A.id);
    same("٣. التذكير يحمل الرمز الحالي", fuA?.patientCode, A.code);
    same("   ويحمل الأسماء البديلة", fuA?.aliasCodes, [OLD_A]);
    same("   واستعلامٌ واحد", fuQueries, 1);
    const fuSearch = (term: string) => filterAndRank(fuRows, term, (r: any) => ({
      name: r.name, phone: r.phone,
      patientCode: r.patientCode, aliasCodes: r.aliasCodes,
    })).map((r: any) => r.patientId);
    same("   والبحث بالرمز الحالي", fuSearch(A.code), [A.id]);
    same("   **وبالرمز القديم**", fuSearch(OLD_A), [A.id]);
    same("   ورمزُ فرعٍ آخر لا يجد شيئاً", fuSearch(OLD_X), []);
    check(!fuRows.some((r) => r.patientId === X.id),
      "   ومريضُ فرع ٢ ليس في تذكيرات فرع ١");

    // ══ ٤. سجلّ المكالمات ═════════════════════════════════════════════
    console.log("\n── ٤. سجلّ المكالمات ──");
    const [hi, hiQueries] = await countAliasQueries(() =>
      http("GET", "/api/follow-ups/history", S.recv1));
    const hiRows: any[] = hi.body ?? [];
    const hiA = hiRows.find((r) => r.patientId === A.id);
    same("٤. الصفّ يحمل الرمز الحالي", hiA?.patientCode, A.code);
    same("   ويحمل الأسماء البديلة", hiA?.aliasCodes, [OLD_A]);
    same("   واستعلامٌ واحد", hiQueries, 1);
    const hiSearch = (term: string) => filterAndRank(hiRows, term, (r: any) => ({
      name: r.patientName, patientCode: r.patientCode, aliasCodes: r.aliasCodes,
    })).map((r: any) => r.patientId);
    same("   والبحث بالرمز القديم يجد المكالمة", hiSearch(OLD_A), [A.id]);

    // ══ ٥. قائمة المرضى الكاملة (تفاصيل الفرع · الدمج · أمر التصنيع) ══
    console.log("\n── ٥. `/api/patients` ──");
    const [pl, plQueries] = await countAliasQueries(() =>
      http("GET", "/api/patients", S.recv1));
    const plRows: any[] = pl.body ?? [];
    const plA = plRows.find((r) => r.id === A.id);
    same("٥. الصفّ يحمل الرمز الحالي", plA?.patientCode, A.code);
    same("   ويحمل الأسماء البديلة", plA?.aliasCodes, [OLD_A]);
    const plB = plRows.find((r) => r.id === B.id);
    same("   ومَن لا اسمَ بديلَ له لا يحمل الحقل إطلاقاً (لا يثقل الردّ)",
      Object.prototype.hasOwnProperty.call(plB ?? {}, "aliasCodes"), false);
    same("   واستعلامٌ واحد لكل القائمة", plQueries, 1);
    //  **ولا يُسأل عن مريضٍ خارج النطاق**: المفاتيح المطلوبة هي مفاتيح
    //  القائمة المُرجَعة نفسها لا غير — فالجلب لا يقرأ صفّاً لم يُقرأ.
    const returnedIds = new Set(plRows.map((r) => r.id));
    const outside = Array.from(new Set(aliasAskedIds)).filter((id) => !returnedIds.has(id));
    same("   ولم يُسأل عن أي مريضٍ خارج النطاق", outside, []);
    check(!aliasAskedIds.includes(X.id),
      "   ومريضُ فرع ٢ ليس بين المفاتيح المطلوبة إطلاقاً",
      JSON.stringify(aliasAskedIds.slice(0, 20)));
    const plSearch = (term: string) => filterAndRank(plRows, term, (r: any) => ({
      name: r.name, phone: r.phone,
      patientCode: r.patientCode, aliasCodes: r.aliasCodes,
    })).map((r: any) => r.id);
    same("   والبحث بالرمز الحالي (تفاصيل الفرع)", plSearch(A.code), [A.id]);
    same("   **وبالرمز القديم (دمج ملفّين · إنشاء أمر تصنيع)**", plSearch(OLD_A), [A.id]);
    check(!plRows.some((r) => r.id === X.id), "   ومريضُ فرع ٢ ليس في القائمة");
    same("   ورمزُه البديل لا يجده", plSearch(OLD_X), []);

    // ══ ٦. الدالّة نفسها: استعلامٌ واحد لأي عدد ═══════════════════════
    console.log("\n── ٦. دفعةٌ واحدة مهما كان العدد ──");
    const manyIds = plRows.map((r) => r.id);
    const [map, manyQueries] = await countAliasQueries(() => aliasCodesByPatient(manyIds));
    same(`٦. ${manyIds.length} مفتاحاً ⟶ استعلامٌ واحد`, manyQueries, 1);
    same("   والجواب صحيح", map.get(A.id), [OLD_A]);
    same("   وقائمةٌ فارغة لا تستعلم إطلاقاً",
      (await countAliasQueries(() => aliasCodesByPatient([])))[1], 0);
    //  ٥٠٠٠ مفتاح: `IN (...)` كان سيصنع ٥٠٠٠ متغيّر ربط؛ `ANY($1::int[])` واحد.
    const bulk = Array.from({ length: 5000 }, (_, i) => i + 1);
    const [, bulkQueries] = await countAliasQueries(() => aliasCodesByPatient(bulk));
    same("   و٥٠٠٠ مفتاح ⟶ استعلامٌ واحد أيضاً", bulkQueries, 1);

    // ══ ٦ب. البادئة التدريجية في القوائم المحمَّلة ════════════════════
    // نفس دلالة الخادم في المتصفّح: العقد واحد، فالنتيجة واحدة.
    console.log("\n── ٦ب. بادئةُ الرمز في الذاكرة ──");
    const wlRows2: any[] = (await http("GET", "/api/medical/worklist", S.doc1)).body?.rows ?? [];
    const byPrefix = (term: string) => filterAndRank(wlRows2, term, (r: any) => ({
      name: r.patientName, phone: r.phone,
      patientCode: r.patientCode, aliasCodes: r.aliasCodes,
    })).map((r: any) => r.patientId);
    const pfxOf = (code: string, n: number) => code.slice(0, n);
    same("٦ب. «WB» تعرض كلّ ذوي الرموز في القائمة",
      byPrefix("WB").length, wlRows2.length);
    check(byPrefix(pfxOf(A.code, 6)).includes(A.id),
      "   وبادئةُ ستّ محارف تجد صاحبها", `${pfxOf(A.code, 6)} → ${byPrefix(pfxOf(A.code, 6))}`);
    check(byPrefix(pfxOf(A.code, 7)).includes(A.id), "   وسبعةٌ كذلك");
    same("   والرمز الكامل يتصدّر", byPrefix(A.code)[0], A.id);
    check(byPrefix(OLD_A.slice(0, 6)).includes(A.id),
      "   **وبادئةُ الاسم البديل تجد الملفّ الباقي**");
    same("   والرمز الكامل البديل كذلك", byPrefix(OLD_A), [A.id]);
    //  (بادئةٌ قصيرة يتشاركها الاسمان البديلان عمداً — فالتمييز بالرمز
    //   الكامل، والحجبُ الحقيقي أن X ليس في القائمة أصلاً.)
    same("   ورمزُ فرعٍ آخر الكامل لا يجد شيئاً", byPrefix(OLD_X), []);
    check(!byPrefix("WB").includes(X.id),
      "   ومريضُ فرع ٢ ليس في نتائج البادئة إطلاقاً");
    //  ولا اسمَ يتسلّل إلى عالم الرموز.
    same("   ولا يُطابَق اسمٌ حين يبدأ المكتوب بـWB",
      byPrefix("WB-88").length, 0);

    // ══ ٧. الرمزُ لا يمنح شيئاً — النقطة نفسها لا تُفتح ════════════════
    console.log("\n── ٧. الاسم البديل ليس تصريحاً ──");
    const stolen = await http("GET", `/api/patients/${X.id}`, S.recv1);
    check(stolen.status === 403 || stolen.status === 404,
      "٧. مَن عرف رمز مريضٍ في فرعٍ آخر لا يفتح ملفّه", String(stolen.status));
    const reg = await http("GET",
      `/api/patients/registry?search=${encodeURIComponent(OLD_X)}&pageSize=50`, S.recv1);
    same("   والسجلّ لا يُرجعه برمزه البديل", (reg.body?.rows ?? []).length, 0);
  } finally {
    await cleanup();
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [[ADMIN, RECV1, RECV2, DOC1, DOC2]]);
    httpServer.close();
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
