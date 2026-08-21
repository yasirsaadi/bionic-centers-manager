// رمزُ المريض في التطبيق — حيّاً على النقاط نفسها وعلى Postgres.
// قاعدة محلّية: `npm run test:patient-code-api`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **الرمز يولد في الخادم/القاعدة، ولا يختاره عميل** — لا عند الإنشاء
//     ولا بالتعديل. ومحاولةُ تغييره تُردّ بنصّها لا تُبتلع صامتة.
// (٢) **وهو ثابت**: تبديل الاسم والهاتف والفرع والحالة لا يلمسه.
// (٣) **والدمج لا يقتل رمزاً قيل لصاحبه**: الهدف يحتفظ برمزه، ورمزُ المصدر
//     يصير اسماً بديلاً يدلّ عليه — وأسماء المصدر البديلة تنتقل معه.
// (٤) **والرمز معرّفٌ لا مفتاح**: موظّفُ فرعٍ يكتب رمز مريضٍ في فرعٍ آخر لا
//     يحصل على شيء. وهذا أهمّ ما في الملفّ.
// (٥) **والمحذوف لا يحلّ ولا يُعاد استعماله**.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { storage } from "./storage";
import { registerRoutes } from "./routes";
import { resolvePatientByPublicCode } from "./patient_code/store";
import { PATIENT_CODE_PATTERN } from "@shared/patient_code";

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

const PORT = 6835;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-رمز-المريض";
const ADMIN = 9891, RECV1 = 9892, RECV2 = 9893;

const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 0, accessibleBranches: [1, 2],
    displayName: "adm", permissions: { canViewPatients: true, canAddPatients: true, canEditPatients: true } },
  recv1: { userId: RECV1, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "r1", permissions: { canViewPatients: true, canAddPatients: true, canEditPatients: true } },
  recv2: { userId: RECV2, role: "reception", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "r2", permissions: { canViewPatients: true, canAddPatients: true, canEditPatients: true } },
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
/** إنشاءٌ عبر النقطة الحقيقية — لا إدراجٌ مباشر. */
async function createVia(session: any, extra: any = {}) {
  return http("POST", "/api/patients", session, {
    name: `${MARK} ${extra.name ?? "مريض"}`, phone: "07701234567", age: "40",
    //  الطولُ والوزنُ إلزاميّان لكلّ ملفٍّ جديد (الطرفُ يُصنَع عليهما).
    height: "172", weight: "78",
    medicalCondition: "x", referralSource: MARK, branchId: session.branchId || 1,
    patientClassification: "new", ...extra,
  });
}
/** بحثُ السجلّ بنصٍّ كما يكتبه الموظّف. */
async function registrySearch(session: any, term: string) {
  const r = await http("GET",
    `/api/patients/registry?search=${encodeURIComponent(term)}&pageSize=50`, session);
  return (r.body?.rows ?? []).map((row: any) => ({ id: row.id, code: row.patientCode }));
}
const codeOf = async (id: number) =>
  (await q(`SELECT patient_code FROM patients WHERE id=$1`, [id]))[0]?.patient_code ?? null;

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
  //  أسماء بديلة صارت يتيمة بعد حذف الملفّات (لا يقع في الإنتاج).
  await q(`DELETE FROM patient_code_aliases a
            WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  for (const [id, role, b] of [[ADMIN, "admin", 1], [RECV1, "reception", 1], [RECV2, "reception", 2]] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
             VALUES ($1,$2,'x','موظّف',$3,$4,$5::jsonb,true)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id`,
      [id, `pc_u${id}`, role, b, JSON.stringify([b])]);
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

    // ══ أ. الإنشاء يُرجع الرمز ═══════════════════════════════════════
    console.log("\n── الإنشاء ──");
    const created = await createVia(S.recv1, { name: "أوّل" });
    same("أ. الإنشاء نجح", created.status, 201);
    const p1 = created.body.id;
    check(PATIENT_CODE_PATTERN.test(created.body.patientCode ?? ""),
      "   **والاستجابة تحمل الرمز المولَّد**", JSON.stringify(created.body.patientCode));
    same("   وهو ما في القاعدة", created.body.patientCode, await codeOf(p1));

    // ══ ب. العميل لا يختار الرمز ═════════════════════════════════════
    const forged = await createVia(S.recv1, { name: "ملفَّق", patientCode: "WB-00001" });
    same("ب. الإنشاء بحقلٍ ملفَّق ينجح", forged.status, 201);
    check(forged.body.patientCode !== "WB-00001",
      "   **لكنّ الرمز ليس ما طلبه العميل**", String(forged.body.patientCode));
    same("   والرمز المطلوب لم يُنقل عن صاحبه",
      (await q(`SELECT count(*)::int n FROM patients WHERE patient_code='WB-00001'`))[0].n <= 1, true);
    const p2 = forged.body.id;

    // ══ ج. ولا يُعدَّل ═══════════════════════════════════════════════
    console.log("\n── الثبات ──");
    const before = await codeOf(p1);
    const tryChange = await http("PUT", `/api/patients/${p1}`, S.admin, { patientCode: "WB-99999" });
    check(tryChange.status >= 400, "ج. **محاولة تغيير الرمز تُردّ صراحةً**",
      `status=${tryChange.status} ${JSON.stringify(tryChange.body)}`);
    same("   والرمز لم يتبدّل", await codeOf(p1), before);
    same("   ولم يُنقل إلى أحد",
      (await q(`SELECT count(*)::int n FROM patients WHERE patient_code='WB-99999'`))[0].n, 0);

    // ══ د. تغيّر البيانات لا يلمس الرمز ══════════════════════════════
    const edited = await http("PUT", `/api/patients/${p1}`, S.admin, {
      name: `${MARK} اسمٌ جديد`, phone: "07709998877", branchId: 2, medicalCondition: "y",
    });
    same("د. تعديل الاسم والهاتف والفرع والحالة نجح", [edited.status < 400, edited.body?.message ?? null], [true, null]);
    same("   **والرمز كما هو**", await codeOf(p1), before);

    // ══ هـ/و. البحث بالرمز وتطبيعه ═══════════════════════════════════
    console.log("\n── البحث ──");
    const code1 = await codeOf(p1);
    const digits = String(code1).slice(3);
    same("هـ. البحث بالرمز الكامل يجده",
      (await registrySearch(S.admin, code1)).map((r: any) => r.id), [p1]);
    for (const form of [code1.toLowerCase(), `wb${digits}`, `WB ${digits}`, `  ${code1}  `]) {
      same(`و. «${form}» يجده أيضاً`,
        (await registrySearch(S.admin, form)).map((r: any) => r.id), [p1]);
    }
    same("   والرمز يصل الواجهة في كل صفّ",
      (await registrySearch(S.admin, code1))[0]?.code, code1);
    same("   ورمزٌ لا ملفَّ له ⟶ لا نتيجة",
      await registrySearch(S.admin, "WB-98765"), []);

    // ══ ز. عزل الفروع — أهمّ ما في الملفّ ════════════════════════════
    console.log("\n── الرمز معرّفٌ لا مفتاح ──");
    const otherBranch = await createVia(S.recv2, { name: "في ذي قار" });
    same("   أُنشئ مريضٌ في الفرع ٢", otherBranch.status, 201);
    const pOther = otherBranch.body.id;
    const codeOther = otherBranch.body.patientCode;
    same("ز. **موظّف الفرع ١ يكتب رمز مريض الفرع ٢ ⟶ لا شيء**",
      await registrySearch(S.recv1, codeOther), []);
    same("   وموظّف الفرع ٢ يجده", (await registrySearch(S.recv2, codeOther)).map((r: any) => r.id), [pOther]);
    same("   ولا يرى مريض الفرع ١",
      await registrySearch(S.recv2, await codeOf(p2)), []);
    same("ح. والمسؤول يجده بنطاقه المعتاد",
      (await registrySearch(S.admin, codeOther)).map((r: any) => r.id), [pOther]);

    // ══ ط–ل. الدمج ═══════════════════════════════════════════════════
    console.log("\n── الدمج ──");
    const srcRes = await createVia(S.recv1, { name: "المصدر" });
    const tgtRes = await createVia(S.recv1, { name: "الهدف" });
    const src = srcRes.body.id, tgt = tgtRes.body.id;
    const srcCode = srcRes.body.patientCode, tgtCode = tgtRes.body.patientCode;
    //  اسمٌ بديل قديم على المصدر: دُمج فيه ملفٌّ قبلاً، فيجب أن ينتقل أيضاً.
    const oldAlias = "WB-90001";
    await q(`INSERT INTO patient_code_aliases (code, patient_id, reason) VALUES ($1,$2,'merge')`,
      [oldAlias, src]);

    await storage.mergePatients(src, tgt);

    same("ط. **الهدف يحتفظ برمزه الأصلي**", await codeOf(tgt), tgtCode);
    same("ي. **ورمزُ المصدر صار اسماً بديلاً له**",
      (await q(`SELECT patient_id, reason FROM patient_code_aliases WHERE code=$1`, [srcCode]))
        .map((r: any) => [Number(r.patient_id), r.reason]), [[tgt, "merge"]]);
    const viaAlias = await resolvePatientByPublicCode(srcCode);
    same("ك. **والبحث برمز المصدر يصل إلى الباقي**",
      [viaAlias?.patientId, viaAlias?.patientCode, viaAlias?.viaAlias], [tgt, tgtCode, true]);
    same("   والسجلّ كذلك",
      (await registrySearch(S.recv1, srcCode)).map((r: any) => r.id), [tgt]);
    same("   وبصيغةٍ مطبَّعة أيضاً",
      (await registrySearch(S.recv1, srcCode.replace("-", "").toLowerCase())).map((r: any) => r.id), [tgt]);
    same("ل. **وأسماء المصدر البديلة انتقلت معه**",
      (await q(`SELECT patient_id FROM patient_code_aliases WHERE code=$1`, [oldAlias]))
        .map((r: any) => Number(r.patient_id)), [tgt]);
    same("   ورمزُ الهدف يحلّ مباشرةً لا عبر بديل",
      (await resolvePatientByPublicCode(tgtCode))?.viaAlias, false);
    same("   وصفّ المصدر ذهب",
      (await q(`SELECT count(*)::int n FROM patients WHERE id=$1`, [src]))[0].n, 0);

    // ══ م. الحذف ═════════════════════════════════════════════════════
    console.log("\n── الحذف ──");
    const delCode = await codeOf(tgt);
    await storage.deletePatient(tgt);
    same("م. **رمزُ المحذوف لا يحلّ**", await resolvePatientByPublicCode(delCode), null);
    same("   ولا أسماؤه البديلة", await resolvePatientByPublicCode(srcCode), null);
    same("   ولا القديمة منها", await resolvePatientByPublicCode(oldAlias), null);
    same("   ولا صفَّ بديلاً بقي",
      (await q(`SELECT count(*)::int n FROM patient_code_aliases WHERE patient_id=$1`, [tgt]))[0].n, 0);

    // ══ ن. ولا يُعاد استعماله ════════════════════════════════════════
    const after = await createVia(S.recv1, { name: "بعد الحذف" });
    const afterCode = after.body.patientCode;
    check(![delCode, srcCode, oldAlias].includes(afterCode),
      "ن. **والجديد لا يرث رمزاً محذوفاً ولا مدموجاً**", String(afterCode));
    const num = (c: string) => Number(String(c).slice(3));
    check(num(afterCode) > num(delCode), "   ورمزُه أعلى — التسلسل لا يرجع",
      `${delCode} ⟶ ${afterCode}`);

    // ══ س. الرمز لا يفتح باباً بلا مصادقة ════════════════════════════
    console.log("\n── لا باب عام ──");
    const anon = await fetch(`${BASE}/api/patients/registry?search=${encodeURIComponent(afterCode)}`);
    check(anon.status === 401 || anon.status === 403,
      "س. **بلا جلسة: الرمز لا يُرجع شيئاً**", String(anon.status));
    same("   ولا نقطةَ بحثٍ عامّة بالرمز",
      (await fetch(`${BASE}/api/patient-code/${afterCode}`)).status, 404);
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [[ADMIN, RECV1, RECV2]]);
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
