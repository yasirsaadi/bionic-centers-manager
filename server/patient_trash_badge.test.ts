// شارةُ «المحذوفات» — «رأيتُها» لا عدّاً مطلقاً دائماً. حيّاً على Postgres
// وعلى النقاط الحقيقية. قاعدة محلّية: `npm run test:trash-badge`.
//
// ══ القاعدةُ التي يحرسها (تحكّمُ شارات الشريط الجانبي، 2026-08-31) ═══════
// «المحذوفات» شارةٌ **معلوماتية**: يجب أن تُقِرّ بما رآه المستخدمُ عند فتح
// الصفحة وتصمت حتى يصل جديد — لا أن تبقى تعرض كلَّ ما في السلّة إلى الأبد.
// الحلُّ **بلا عمودٍ جديد ولا ترحيل**: `?since=` اختياريّ على
// `GET /api/patient-trash/count` يقرأ `deleted_at` القائم نفسَه، والعميلُ
// (لا الخادم) يتذكّر آخرَ زيارةٍ في `localStorage`.
//
// ══ ما يثبته هذا الملفّ ═══════════════════════════════════════════════
// A. بلا `since` ⟶ العددُ الكامل (السلوكُ القديم، لم يتغيّر).
// B. **`since` بين صفّين ⟶ الأقدمُ لا يُحتسَب، الأحدثُ وحده يُحتسَب**
//    (`deleted_at > since` صارمة — لا `>=` تُعيد ما رآه المستخدم بالفعل).
// C. `since` في المستقبل ⟶ صفر (لا شيء جديد).
// D. **تاريخٌ لا يُفكَّك ⟶ لا فلترة** (شارةٌ خاطئة أهونُ من صفحةٍ معطوبة) —
//    يعود العددُ الكامل لا صفراً ولا خطأ ٥٠٠.
// E. مَن لا يملك السلّة (استقبال) ⟶ ٠ بلا ٤٠٣ — فلا شارةَ تومض له أصلاً.
// F. النطاقُ (فرع) يبقى مفروضاً مع `since` معاً — لا يتّسع بها.

import { pool } from "./db";
import { registerRoutes } from "./routes";
import express from "express";
import { createServer } from "http";

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

const PORT = 6941;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-شارة-المحذوفات";
const ADMIN = 9951, RECV = 9952, MANAGER_OTHER = 9953;

const S: Record<string, any> = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2], displayName: "المسؤول" },
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "الاستقبال" },
  managerOther: { userId: MANAGER_OTHER, role: "branch_manager", isAdmin: false, branchId: 2, accessibleBranches: [2], displayName: "مديرُ فرعٍ آخر" },
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

async function cleanup() {
  await q(`DELETE FROM patients WHERE referral_source = $1`, [MARK]);
}
async function mkPatient(branchId = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, branch_id, is_amputee, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر',$3,true,0,'new') RETURNING id`,
    [`${MARK} مريض`, MARK, branchId]);
  return r[0].id;
}

async function main() {
  await q(
    `INSERT INTO system_users (id, username, password_hash, role, display_name, branch_id, branch_ids)
     VALUES ($1,$2,'x','admin',$3,1,'[1,2]'::jsonb)
     ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, branch_id = EXCLUDED.branch_id`,
    [ADMIN, "ptb_admin", "المسؤول"]);

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
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") return app;
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));

  try {
    const p1 = await mkPatient(1);
    const p2 = await mkPatient(1);
    const p3 = await mkPatient(2); // فرعٌ آخر — لاختبار النطاق مع since معاً

    let r = await http("DELETE", `/api/patients/${p1}`, S.admin, { reason: "اختبار" });
    same("تمهيد: حذفُ المريض الأوّل نجح", r.status, 200);
    r = await http("DELETE", `/api/patients/${p3}`, S.admin, { reason: "اختبار" });
    same("تمهيد: حذفُ مريض الفرع الآخر نجح", r.status, 200);

    //  إبعادُ حذف p1/p3 زمنياً — «رآهما المستخدمُ في زيارةٍ سابقة».
    await q(`UPDATE patients SET deleted_at = deleted_at - INTERVAL '2 hours' WHERE id IN ($1,$2)`, [p1, p3]);
    const between = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // بين p1/p3 والحذف القادم

    r = await http("DELETE", `/api/patients/${p2}`, S.admin, { reason: "اختبار" });
    same("تمهيد: حذفُ المريض الثاني (الأحدث) نجح", r.status, 200);

    console.log("\n── أ. بلا since ──");
    r = await http("GET", "/api/patient-trash/count", S.admin);
    same("١. العددُ الكاملُ كما كان (نطاقُ المسؤول كلُّ الفروع ⟶ الثلاثة)",
      r.body?.count, 3);

    console.log("\n── ب. since بين صفّين ──");
    r = await http("GET", `/api/patient-trash/count?since=${encodeURIComponent(between)}`, S.admin);
    same("٢. **الأقدمُ (p1, p3) لا يُحتسَب، الأحدثُ (p2) وحده**", r.body?.count, 1);

    console.log("\n── ج. since في المستقبل ──");
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    r = await http("GET", `/api/patient-trash/count?since=${encodeURIComponent(future)}`, S.admin);
    same("٣. لا شيء جديد بعد المستقبل ⟶ صفر", r.body?.count, 0);

    console.log("\n── د. تاريخٌ فاسد ──");
    r = await http("GET", "/api/patient-trash/count?since=not-a-real-date", S.admin);
    same("٤. **يعود العددُ الكامل — لا صفر ولا خطأ**", r.body?.count, 3);
    same("   والحالةُ ٢٠٠ لا ٥٠٠", r.status, 200);

    console.log("\n── هـ. مَن لا يملك السلّة ──");
    r = await http("GET", "/api/patient-trash/count", S.recv);
    same("٥. الاستقبالُ يرى صفراً بلا خطأ (٢٠٠، لا ٤٠٣)", [r.status, r.body?.count], [200, 0]);
    r = await http("GET", `/api/patient-trash/count?since=${encodeURIComponent(between)}`, S.recv);
    same("٦. وكذلك مع since", [r.status, r.body?.count], [200, 0]);

    console.log("\n── و. النطاقُ يبقى مفروضاً مع since معاً ──");
    r = await http("GET", "/api/patient-trash/count", S.managerOther);
    same("٧. مديرُ فرعٍ آخر يرى مريضَ فرعه وحده (p3)", r.body?.count, 1);
    r = await http("GET", `/api/patient-trash/count?since=${encodeURIComponent(between)}`, S.managerOther);
    same("٨. **و`since` لا توسّع نطاقه** — p3 أقدمُ من since فيبقى صفراً", r.body?.count, 0);

    console.log("\n── ز. القائمةُ الكاملة (الصفحة نفسها) لا تتأثّر بـsince أصلاً ──");
    r = await http("GET", "/api/patient-trash", S.admin);
    same("٩. صفحةُ السلّة تعرض كلَّ شيء دائماً — العدّادُ وحده يُفلتَر",
      (r.body?.rows ?? []).length >= 3, true, `rows=${(r.body?.rows ?? []).length}`);
  } finally {
    httpServer.close();
    await cleanup();
  }

  console.log(`\n${failures === 0 ? "✅ كل الاختبارات نجحت" : `❌ ${failures} اختباراً فشل`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
