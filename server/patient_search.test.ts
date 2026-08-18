// بحثُ المرضى — حيّاً على النقطة نفسها وعلى Postgres.
// قاعدة محلّية: `npm run test:patient-search`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **التطبيق والقاعدة يقولان الشيء نفسه**: `normalizeSearchText` في
//     جافاسكربت و`patient_search_norm` في SQL تُقارنان حرفاً بحرف على عيّنات
//     حقيقية. وهذا ليس تزيّداً: أوّل تنفيذٍ لدالّة القاعدة كان فيه طرفا
//     `translate` مختلفَي الطول، فصار ة⟶و و ى⟶ه بصمت — لم يكشفه إلّا هذا.
// (٢) **النتائج من أوّل حرف** بلا حدٍّ أدنى.
// (٣) **السلّم يُحترم**: لا نتيجةَ تقريبية تسبق مطابقةً تامّة أو ببادئة.
// (٤) **الفرع يبقى حاجزاً**: معرفةُ الاسم أو الرمز لا تُخرج موظّفاً من فرعه —
//     وهذا أهمّ ما في الملفّ، لأن البحث الأوسع هو أوسعُ بابٍ للتسريب.
// (٥) **والبحث الفارغ لم يتغيّر بشيء**: نفس الترتيب ونفس الترقيم ونفس
//     ترشيح التاريخ الذي كان يعمل قبل هذه المرحلة.

import express from "express";
import { createServer } from "http";
import { pool, db } from "./db";
import { registerRoutes } from "./routes";
import { patients } from "@shared/schema";
import {
  normalizeSearchText, digitsOnly, matchPatient, filterAndRank, RANK,
} from "@shared/patient_search";
import { buildPatientSearch, hasTrigram, resetTrigramCache } from "./patient_search/sql";

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

const PORT = 6841;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-بحث-المرضى";
const ADMIN = 9941, RECV1 = 9942, RECV2 = 9943;

const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 0, accessibleBranches: [1, 2],
    displayName: "adm", permissions: { canViewPatients: true, canAddPatients: true } },
  recv1: { userId: RECV1, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "r1", permissions: { canViewPatients: true, canAddPatients: true } },
  recv2: { userId: RECV2, role: "reception", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "r2", permissions: { canViewPatients: true, canAddPatients: true } },
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

/** أسماءُ نتائج البحث بترتيبها كما يراها الموظّف. */
async function search(session: any, term: string, extra = "") {
  const r = await http("GET",
    `/api/patients/registry?search=${encodeURIComponent(term)}&pageSize=50${extra}`, session);
  return {
    status: r.status,
    names: (r.body?.rows ?? []).map((row: any) => String(row.name)),
    ids: (r.body?.rows ?? []).map((row: any) => Number(row.id)),
    branches: Array.from(new Set((r.body?.rows ?? []).map((row: any) => Number(row.branchId)))),
    total: r.body?.total ?? r.body?.totalCount ?? null,
  };
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  //  طلباتُ مراجعة الطبيب (٠٥٥) تشير إلى الأمر والحلقة والزيارة — تُمسح أوّلاً.
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`);
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

/**
 * إدراجٌ مباشر: هذا اختبارُ بحثٍ لا اختبارُ تسجيل، والأسماء مقصودةُ الرسم.
 *
 * **والاسم يُكتب نظيفاً بلا وسم**: الوسمُ في `referral_source` يكفي للتنظيف،
 * ووضعُه في الاسم كان سيغيّر ما يُختبَر — فالبادئة تصير بادئةَ الوسم لا
 * بادئةَ الاسم، وطولُ الاسم يقلب كسرَ التعادل.
 */
async function mk(name: string, phone: string | null, branchId = 1): Promise<number> {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, medical_condition,
       branch_id, is_amputee, total_cost, patient_classification)
     VALUES ($1,$2,$3,'40','x',$4,true,0,'new') RETURNING id`,
    [name, phone, MARK, branchId]);
  return r[0].id;
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  for (const [id, role, b] of [[ADMIN, "admin", 1], [RECV1, "reception", 1], [RECV2, "reception", 2]] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
             VALUES ($1,$2,'x','موظّف',$3,$4,$5::jsonb,true)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id`,
      [id, `ps_u${id}`, role, b, JSON.stringify([b])]);
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
    resetTrigramCache();
    const trigram = await hasTrigram(db);
    check(trigram, "امتداد pg_trgm مثبَّت في قاعدة الاختبار (وإلّا فالتسامح معطَّل)");

    // ══ أ. تطابقُ التطبيع بين جافاسكربت وSQL ═════════════════════════
    // العطبُ الذي كشفه هذا فعلاً: هدفُ `translate` كان أقصر من مصدره بمحرف،
    // فانزاحت كلّ المطابقات بعده — ة صارت و، وى صارت ه.
    console.log("\n── ١. التطبيع: جافاسكربت = SQL ──");
    const samples = [
      "أحمد علي حسن", "احمد", "إبراهيم", "آلاء", "مصطفى", "سعاد عطيّة",
      "عبد الله", "مُحَمَّد", "محـمـد", "  فراس   كاظم  ", "Ali Hassan",
      "زينب ة ى ؤ ئ", "٠٧٧٠١٢٣٤٥٦٧", "WB-٠١٦٢٩", "نور الهدى",
    ];
    const sqlNorm = await q<{ i: number; v: string }>(
      `SELECT i, patient_search_norm(t) AS v
         FROM unnest($1::text[]) WITH ORDINALITY AS u(t, i)`, [samples]);
    let mismatches: string[] = [];
    for (const row of sqlNorm) {
      const js = normalizeSearchText(samples[row.i - 1]);
      if (js !== row.v) mismatches.push(`«${samples[row.i - 1]}»: js=«${js}» sql=«${row.v}»`);
    }
    same("١. كلّ عيّنة تُطبَّع بالنتيجة نفسها في الطرفين", mismatches, []);
    const sqlDigits = await q<{ i: number; v: string }>(
      `SELECT i, patient_digits_only(t) AS v
         FROM unnest($1::text[]) WITH ORDINALITY AS u(t, i)`,
      [["0770 123-4567", "٠٧٧٠١٢٣٤٥٦٧", "(0770) 111", "WB-01629"]]);
    same("   والأرقام كذلك",
      sqlDigits.map((r) => r.v),
      ["0770 123-4567", "٠٧٧٠١٢٣٤٥٦٧", "(0770) 111", "WB-01629"].map(digitsOnly));

    // ══ العيّنة الحيّة ═══════════════════════════════════════════════
    const A = await mk("أحمد علي حسن", "07701234567");        // فرع ١
    const B = await mk("احمد كريم جبار", "07809876543");       // فرع ١
    const C = await mk("محمد أحمد صالح", "07712223333");       // فرع ١
    const D = await mk("سعاد عطيّة ناصر", "07734445555");      // فرع ١
    const E = await mk("مصطفى حيدر وادي", null);               // فرع ١
    const F = await mk("أحمد علي حسن", "07700000001", 2);      // **فرع ٢** — نفس الاسم
    const G = await mk("حسن جبر علي", "07755556666");          // اسمٌ قريب رسماً لا معنى
    void G;
    //  الحالة المرضية كانت مبحوثاً فيها في السجلّ قبل هذه المرحلة.
    await q(`UPDATE patients SET medical_condition = $2 WHERE id = $1`, [E, "بتر تحت الركبة"]);
    const codeA = (await q(`SELECT patient_code FROM patients WHERE id=$1`, [A]))[0].patient_code;
    const codeF = (await q(`SELECT patient_code FROM patients WHERE id=$1`, [F]))[0].patient_code;
    //  رمزٌ قديم لملفٍّ دُمج سابقاً — يجب أن يصل لصاحبه الحالي.
    await q(`INSERT INTO patient_code_aliases (code, patient_id) VALUES ($1,$2)
             ON CONFLICT (code) DO UPDATE SET patient_id = EXCLUDED.patient_id`,
      ["WB-9900001", B]);

    // ══ ب. النتائج من أوّل حرف ═══════════════════════════════════════
    console.log("\n── ٢. من أوّل حرف ──");
    const one = await search(S.recv1, "ا");
    same("٢. حرفٌ واحد يُرجع نتائج (بلا حدٍّ أدنى)", one.status, 200);
    check(one.names.length >= 2, "   وفيها مَن يبدأ اسمه به", JSON.stringify(one.names));
    const two = await search(S.recv1, "اح");
    check(two.names.includes("أحمد علي حسن") && two.names.includes("احمد كريم جبار"),
      "   وحرفان يجدان الاثنين", JSON.stringify(two.names));

    // ══ ج. التطبيع العربي في البحث الحقيقي ═══════════════════════════
    console.log("\n── ٣. صور الحروف ──");
    same("٣. «احمد» بلا همزة تجد «أحمد»",
      (await search(S.recv1, "احمد")).names.includes("أحمد علي حسن"), true);
    same("   و«أحمد» بهمزة تجد «احمد»",
      (await search(S.recv1, "أحمد")).names.includes("احمد كريم جبار"), true);
    same("   و«عطيه» بالهاء تجد «عطيّة» بالتاء والشدّة",
      (await search(S.recv1, "عطيه")).names.includes("سعاد عطيّة ناصر"), true);
    same("   و«مصطفي» بالياء تجد «مصطفى» بالألف المقصورة",
      (await search(S.recv1, "مصطفي")).names.includes("مصطفى حيدر وادي"), true);
    same("   والتطويل «مصـطفى» كذلك",
      (await search(S.recv1, "مصـ__طفى".replace("__", "ـ"))).names.includes("مصطفى حيدر وادي"), true);
    same("   والمسافات المكرّرة كذلك",
      (await search(S.recv1, "احمد    علي")).names.includes("أحمد علي حسن"), true);

    // ══ د. الهاتف والرمز ═════════════════════════════════════════════
    console.log("\n── ٤. الهاتف والرمز ──");
    same("٤. الهاتف بصيغة العرض (مسافات وشرطات)",
      (await search(S.recv1, "0770 123-4567")).names, ["أحمد علي حسن"]);
    same("   وبالأرقام الهندية",
      (await search(S.recv1, "٠٧٧٠١٢٣٤٥٦٧")).names, ["أحمد علي حسن"]);
    same("   وببادئته يجد كلّ من يبدأ بها",
      (await search(S.recv1, "0780")).names, ["احمد كريم جبار"]);
    same("   والرمز يجد صاحبه وحده",
      (await search(S.recv1, codeA)).names, ["أحمد علي حسن"]);
    same("   والرمز بصيغةٍ مشوّهة (wb 1629 ⟵ بأرقام المريض نفسه)",
      (await search(S.recv1, codeA.replace("WB-", "wb "))).names, ["أحمد علي حسن"]);
    same("   والاسمُ البديل لملفٍّ دُمج يصل إلى الباقي",
      (await search(S.recv1, "WB-9900001")).names, ["احمد كريم جبار"]);
    same("   ورقمُ الرمز وحده بلا WB",
      (await search(S.recv1, digitsOnly(codeA))).names.includes("أحمد علي حسن"), true);

    // ══ هـ. الخطأ المطبعي ════════════════════════════════════════════
    console.log("\n── ٥. الخطأ المطبعي ──");
    const typo = await search(S.recv1, "احمذ");
    check(typo.names.includes("أحمد علي حسن") && typo.names.includes("احمد كريم جبار"),
      "٥. حرفٌ خاطئ «احمذ» يجد «أحمد» و«احمد»", JSON.stringify(typo.names));
    const missing = await search(S.recv1, "مصطف");
    check(missing.names.includes("مصطفى حيدر وادي"),
      "   وحرفٌ ناقص «مصطف» يجد «مصطفى»", JSON.stringify(missing.names));
    const extra = await search(S.recv1, "مصطفاى");
    check(extra.names.includes("مصطفى حيدر وادي"),
      "   وحرفٌ زائد في وسط الكلمة «مصطفاى» كذلك (وهو ما تخدمه عتبة ٠٫٥)",
      JSON.stringify(extra.names));
    const extra2 = await search(S.recv1, "كريمم");
    check(extra2.names.includes("احمد كريم جبار"),
      "   وحرفٌ زائد في آخرها «كريمم»", JSON.stringify(extra2.names));
    same("   والاسمُ البعيد لا يدخل: «حسين» لا تجد «حسن»",
      (await search(S.recv1, "حسين")).names.includes("حسن جبر علي"), false);
    same("   وحرفان لا يُسامَحان (ضجيجٌ لا بحث)",
      (await search(S.recv1, "زك")).names, []);

    // ══ و. السلّم — التامّ قبل التقريبي ═══════════════════════════════
    console.log("\n── ٦. الترتيب ──");
    const exact = await search(S.recv1, "احمد كريم جبار");
    same("٦. المطابقة التامّة أوّلاً ولو شابهها غيرها",
      exact.names[0], "احمد كريم جبار");
    const byToken = await search(S.recv1, "كريم");
    same("   وبادئةُ كلمةٍ تجد صاحبها", byToken.names[0], "احمد كريم جبار");
    const pref = await search(S.recv1, "احمد");
    check(pref.names.indexOf("أحمد علي حسن") < pref.names.indexOf("محمد أحمد صالح")
       && pref.names.indexOf("أحمد علي حسن") >= 0,
      "   والبادئة قبل الاحتواء", JSON.stringify(pref.names));

    // ══ ز. الفرع حاجزٌ لا يخترقه بحث ═════════════════════════════════
    console.log("\n── ٧. حدود الفرع ──");
    const r1 = await search(S.recv1, "أحمد علي حسن");
    check(r1.ids.includes(A) && !r1.ids.includes(F),
      "٧. موظّف فرع ١ يجد نسخته ولا يرى نسخة الفرع الآخر رغم تطابق الاسمين",
      JSON.stringify(r1.ids));
    same("   ولا صفَّ من فرعٍ آخر في نتائجه إطلاقاً", r1.branches, [1]);
    same("   والمطابقة التامّة أوّلاً", r1.names[0], "أحمد علي حسن");
    const r2 = await search(S.recv2, "أحمد علي حسن");
    check(r2.ids.includes(F) && !r2.ids.includes(A),
      "   وموظّف فرع ٢ بالعكس", JSON.stringify(r2.ids));
    same("   ونتائجه من فرعه وحده", r2.branches, [2]);
    same("   **ورمزُ مريضٍ في فرعٍ آخر لا يُرجع شيئاً**",
      (await search(S.recv1, codeF)).names, []);
    same("   وهاتفُه كذلك",
      (await search(S.recv1, "07700000001")).names, []);
    const adminAll = await search(S.admin, "أحمد علي حسن");
    check(adminAll.ids.includes(A) && adminAll.ids.includes(F),
      "   والمسؤول يرى الاثنين", JSON.stringify(adminAll.ids));

    // ══ ح. البحث الفارغ لم يتغيّر ════════════════════════════════════
    console.log("\n── ٨. البحث الفارغ ──");
    const empty = await http("GET", "/api/patients/registry?pageSize=5&page=1", S.recv1);
    same("٨. السجلّ بلا بحثٍ يفتح", empty.status, 200);
    const emptyIds = (empty.body?.rows ?? []).map((r: any) => r.id);
    const newestFirst = await q<{ id: number }>(
      `SELECT id FROM patients WHERE branch_id = 1 ORDER BY created_at DESC NULLS LAST LIMIT 5`);
    same("   وترتيبُه الأحدث أوّلاً كما كان حرفاً بحرف",
      emptyIds, newestFirst.map((r) => r.id));
    const dated = await http("GET",
      "/api/patients/registry?pageSize=5&visitDate=2026-01-01", S.recv1);
    same("   وترشيحُ تاريخ الزيارة ما زال يعمل", dated.status, 200);
    same("   ولا مريضَ لذلك اليوم", (dated.body?.rows ?? []).length, 0);

    // ══ ط. الترقيم يعمل مع البحث ═════════════════════════════════════
    console.log("\n── ٩. الترقيم ──");
    const pg1 = await http("GET", "/api/patients/registry?search=" +
      encodeURIComponent("ا") + "&pageSize=1&page=1", S.recv1);
    const pg2 = await http("GET", "/api/patients/registry?search=" +
      encodeURIComponent("ا") + "&pageSize=1&page=2", S.recv1);
    check((pg1.body?.rows ?? []).length === 1 && (pg2.body?.rows ?? []).length === 1,
      "٩. صفحتان بصفٍّ واحدٍ لكلّ منهما");
    check(pg1.body.rows[0].id !== pg2.body.rows[0].id,
      "   وليستا الصفَّ نفسه — فالترتيب حتميٌّ عبر الصفحات");

    // ══ ي. الشرط لا يعرف الصلاحيات ═══════════════════════════════════
    // بابُ الحراسة هو `conditions` في النقطة، لا باني البحث. وهذا يُثبَت
    // بأن الباني لا يذكر فرعاً ولا مستخدماً في نصّه أصلاً.
    console.log("\n── ١٠. الباني لا يحرس ──");
    const built = buildPatientSearch("أحمد", { trigram });
    const text = db.select({ id: patients.id }).from(patients).where(built.where).toSQL().sql;
    check(!/branch/i.test(text) && !/system_users/i.test(text),
      "١٠. باني الشرط لا يذكر فرعاً ولا مستخدماً — الحراسة في النقطة", text);

    // ══ ك. المطابق في الذاكرة يقول ما يقوله SQL ══════════════════════
    console.log("\n── ١١. الذاكرة = الخادم ──");
    const inMemory = [
      { name: "أحمد علي حسن", phone: "07701234567" },
      { name: "احمد كريم جبار", phone: "07809876543" },
      { name: "محمد أحمد صالح", phone: "07712223333" },
      { name: "سعاد عطيّة ناصر", phone: "07734445555" },
      { name: "مصطفى حيدر وادي", phone: null },
    ];
    const memNames = (term: string) =>
      filterAndRank(inMemory, term, (p) => p).map((p) => p.name);
    for (const term of ["احمد", "عطيه", "مصطفي", "كريم", "احمذ", "0780"]) {
      const server = (await search(S.recv1, term)).names;
      const mem = memNames(term);
      same(`   «${term}»: نفس المجموعة في الذاكرة وفي الخادم`,
        [...mem].sort(), [...server].sort());
    }
    same("١١. والمطابقُ يميّز الرتب",
      [
        matchPatient("احمد كريم جبار", { name: "احمد كريم جبار" })?.rank,
        matchPatient("احمد", { name: "احمد كريم جبار" })?.rank,
        matchPatient("كريم", { name: "احمد كريم جبار" })?.rank,
        matchPatient("ريم", { name: "احمد كريم جبار" })?.rank,
        matchPatient("احمذ", { name: "احمد كريم جبار" })?.rank,
        matchPatient("خالد", { name: "احمد كريم جبار" })?.rank,
      ],
      [RANK.NAME_EXACT, RANK.NAME_PREFIX, RANK.TOKEN_PREFIX,
       RANK.SUBSTRING, RANK.FUZZY, undefined]);

    // ══ ك٢. الحالة المرضية — بحثٌ كان يعمل فبقي ═══════════════════════
    console.log("\n── ١٢. الحالة المرضية ──");
    same("١٢. البحث بالحالة المرضية ما زال يجد صاحبها",
      (await search(S.recv1, "الركبة")).names.includes("مصطفى حيدر وادي"), true);
    same("   وبتطبيعٍ لم يكن له من قبل («ركبه» بالهاء)",
      (await search(S.recv1, "ركبه")).names.includes("مصطفى حيدر وادي"), true);

    // ══ ك٣. البحث التدريجي بالرمز — البادئة وهي تُكتب ══════════════════
    // العطبُ: البحث لم يكن يعرف الرمزَ إلّا مكتملاً، فكلُّ ما دون خمس خاناتٍ
    // صار بحثَ اسم. يكتب الموظّف W ثمّ B ثمّ - ثمّ 0 فلا يرى شيئاً.
    console.log("\n── ١٣. البادئة التدريجية ──");
    //  رموزٌ مضبوطة يدوياً: الاختبار عن البادئة، فلا يصحّ أن يعتمد على
    //  ما يعطيه التسلسل يوم التشغيل.
    const setCode = (id: number, c: string) =>
      q(`UPDATE patients SET patient_code=$2 WHERE id=$1`, [id, c]);
    await setCode(A, "WB-02119");   // فرع ١
    await setCode(B, "WB-02110");   // فرع ١
    await setCode(C, "WB-09090");   // فرع ١ — لا يبدأ بـWB-02
    await setCode(F, "WB-02777");   // **فرع ٢** — بادئةٌ مطابقة، وخارج النطاق
    //  واسمٌ يحوي الحرفين، برمزٍ بعيد عن البادئة.
    const WBNAME = await mk("عيادة WB الطبية", "07766667777");
    await setCode(WBNAME, "WB-71234");
    //  ورمزٌ قديم بعد دمج، ببادئةٍ مطابقة، على مريضٍ رمزُه الحالي بعيد.
    await q(`INSERT INTO patient_code_aliases (code, patient_id) VALUES ($1,$2)
             ON CONFLICT (code) DO UPDATE SET patient_id = EXCLUDED.patient_id`,
      ["WB-02900", C]);

    const codes = async (term: string) => {
      const r = await http("GET",
        `/api/patients/registry?search=${encodeURIComponent(term)}&pageSize=50`, S.recv1);
      return (r.body?.rows ?? []).map((row: any) => String(row.patientCode));
    };

    same("١٣. «WB» تعرض مرضى الرموز",
      (await codes("WB")).includes("WB-02119"), true);
    same("   و«WB-» كذلك", (await codes("WB-")).includes("WB-02119"), true);
    same("   و«W» وحدها", (await codes("W")).includes("WB-02119"), true);
    //  «WB-0» تضمّ مرضى القاعدة القدامى ذوي الرموز الصغيرة أيضاً، وهذا
    //  صحيح — فيُتحقَّق من الخاصّية لا من قائمةٍ حرفية.
    const wb0 = await codes("WB-0");
    check(wb0.every((c) => c.startsWith("WB-0")),
      "   و«WB-0»: كلُّ ما تُرجعه يبدأ بها فعلاً", JSON.stringify(wb0));
    check(["WB-02110", "WB-02119", "WB-09090"].every((c) => wb0.includes(c)),
      "   وفيها الثلاثة المتوقّعة", JSON.stringify(wb0));
    check(!wb0.includes("WB-71234"), "   ولا رمزَ خارج البادئة");
    same("   **و«WB-02» تجد WB-02119**", await codes("WB-02"),
      ["WB-02110", "WB-02119", "WB-09090"]);
    same("   و«WB-021» تضيّق أكثر", await codes("WB-021"), ["WB-02110", "WB-02119"]);
    same("   و«WB-0211» كذلك", await codes("WB-0211"), ["WB-02110", "WB-02119"]);
    same("   و«wb02» بلا شَرطة", await codes("wb02"),
      ["WB-02110", "WB-02119", "WB-09090"]);
    same("   و«WB-٠٢» بالأرقام العربية", await codes("WB-٠٢"),
      ["WB-02110", "WB-02119", "WB-09090"]);

    console.log("\n── ١٤. ترتيبُ البادئة ──");
    same("١٤. الرمز الكامل يتصدّر ولو شاركه غيرُه البادئة",
      (await codes("WB-02119"))[0], "WB-02119");
    //  والاسم البديل الكامل يسبق بادئةَ الرمز الحالي.
    same("   والاسم البديل الكامل يتصدّر كذلك",
      (await codes("WB-02900"))[0], "WB-09090");
    //  و«WB-029» تدخل WB-09090 ببادئة اسمه البديل وحدها — بعد كل حاملي
    //  البادئة في رمزهم الحالي (ولا حاملَ لها هنا).
    same("   وبادئةُ الاسم البديل تُدخل صاحبها", await codes("WB-029"), ["WB-09090"]);
    //  والترتيب داخل البادئة بالرمز لا بتاريخ التسجيل.
    same("   والترتيب داخل البادئة بالرمز صعوداً",
      await codes("WB-021"), ["WB-02110", "WB-02119"]);

    console.log("\n── ١٥. ما لا يجب أن يظهر ──");
    same("١٥. **رمزُ فرعٍ آخر لا يظهر ولو طابقت بادئتُه**",
      (await codes("WB-02")).includes("WB-02777"), false);
    same("   وموظّفُ فرع ٢ يراه وحده",
      (await http("GET", "/api/patients/registry?search=WB-02&pageSize=50", S.recv2))
        .body?.rows?.map((r: any) => r.patientCode), ["WB-02777"]);
    same("   **والاسمُ الذي يحوي WB لا يظهر ببادئةٍ لا يحملها رمزُه**",
      (await codes("WB-02")).includes("WB-71234"), false);
    same("   ولا يظهر باسمه حين يكون البحث بادئةَ رمز",
      (await codes("WB-71")), ["WB-71234"]);
    same("   ورمزٌ لا وجود له لا يُرجع شيئاً", await codes("WB-88"), []);
    //  ولا تقريبَ في عالم الرموز: WB-02118 لا تجد WB-02119.
    same("   ولا تسامحَ مع الخطأ في الرمز", await codes("WB-02118"), []);

    console.log("\n── ١٦. والبحث بالاسم والهاتف لم يتغيّر ──");
    same("١٦. الاسم كما كان",
      (await search(S.recv1, "احمد")).names.includes("أحمد علي حسن"), true);
    same("   والهاتف كما كان",
      (await search(S.recv1, "0770 123-4567")).names, ["أحمد علي حسن"]);
    same("   والخطأ المطبعي كما كان",
      (await search(S.recv1, "احمذ")).names.includes("أحمد علي حسن"), true);
    same("   ورقمُ الرمز وحده بلا WB كما كان",
      (await codes("02119")), ["WB-02119"]);

    // ══ ل. المكتوب رموزاً بلا حرفٍ ولا رقم ═══════════════════════════
    console.log("\n── ١٧. مُدخلٌ فارغ المعنى ──");
    same("١٧. «---» لا تُرجع السجلّ كلّه",
      (await search(S.recv1, "---")).names, []);
    same("   ولا «؟؟»", (await search(S.recv1, "؟؟")).names, []);
  } finally {
    await cleanup();
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [[ADMIN, RECV1, RECV2]]);
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
