// تشخيصُ مسار تسجيل مريضٍ جديد — **إثباتُ أنه تشخيصٌ لا أثرَ له**.
// قاعدة محلّية: `npm run test:diagnose-create-patient`.
//
// ══ ما يحرسه هذا الملفّ ═══════════════════════════════════════════════════
// أُضيفت أطوارُ تشخيصٍ إلى `POST /api/patients` وإلى `storage.createPatient`
// (٢٠٢٦-٠٩-١٧) لتحديد أين يتعلّق الطلبُ فعلياً. **والسؤالُ الذي يجيب عنه
// هذا الاختبار سؤالٌ واحد**: هل غيّرت هذه الأطوارُ نتيجةَ التسجيل؟
//
// والجوابُ يُثبَت لا يُوصَف — بمقارنةِ **الدالّة نفسِها منادَاةً بالوجهين**:
// مرّةً بلا معامِل التشخيص (شكلُ النداء قبل التغيير بالحرف) ومرّةً به، ثمّ
// مقارنةِ كلّ عمودٍ في صفّ المريض وكلِّ صفٍّ مشتقٍّ عنه **بايتاً بايت**.
//
// ══ وما لا يفعله التشخيص ═════════════════════════════════════════════════
// لا منطقَ تجاريٌّ يتغيّر · ولا مهلةَ تُعدَّل · ولا خطوةَ تُنقَل إلى الخلفية
// (يُثبَت بترتيب الأطوار: `after_sync_patient_cases` يسبق `before_audit`
// ويسبق `http_response_finish`) · ولا مسارَ آخر يُمَسّ (يُثبَت بصفر سطورٍ
// على مسارات `/api/patients/…` الأخرى).

import { pool } from "./db";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { DIAG_TAG } from "./diagnostics/request_timing";

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

const PORT = 6981;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-تشخيص-تسجيل-المريض";
//  نطاقٌ خالٍ عمداً — نفسُ درسِ عزلِ الاختبارات في `patient_duplicate_guard`.
const ADMIN = 8821, RECV = 8822, NOPERM = 8823;

const S = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1],
    displayName: "المسؤول",
    permissions: { canViewPatients: true, canAddPatients: true, canEditPatients: true },
  },
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "ريام", permissions: { canViewPatients: true, canAddPatients: true },
  },
  //  **الصلاحيةُ الفعلية من عمود `can_add_patients` في القاعدة** — الوسيطُ
  //  الحيّ يعيد قراءتها على كلّ طلب ويستبدل بها ما في الترويسة، فالمنعُ
  //  يأتي من العمود المضبوط `false` في `main()` لا من هذا الكائن.
  noPerm: {
    userId: NOPERM, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "بلا صلاحية", permissions: { canViewPatients: true, canAddPatients: true },
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

// ══ التقاطُ سطور السجلّ — نفسُ نمط `session_store_pool.test.ts` ═══════════
async function capturing<T>(fn: () => Promise<T>): Promise<{ result: T; lines: string[] }> {
  const lines: string[] = [];
  const origLog = console.log, origWarn = console.warn;
  console.log = ((...args: unknown[]) => { lines.push(String(args[0])); }) as typeof console.log;
  console.warn = ((...args: unknown[]) => { lines.push(String(args[0])); }) as typeof console.warn;
  try {
    const result = await fn();
    //  مهلةٌ قصيرة ليصل `finish`/`close` — **للاختبار وحده**، لا مهلةَ في
    //  الشيفرة المُشخَّصة نفسِها.
    await new Promise((r) => setTimeout(r, 150));
    return { result, lines };
  } finally {
    console.log = origLog;
    console.warn = origWarn;
  }
}
function diagObjects(lines: string[], route: string): Record<string, any>[] {
  return lines
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter((o): o is Record<string, any> => !!o && o.tag === DIAG_TAG && o.route === route);
}

// ══ حمولةُ التسجيل — نفسُ شكل `CreatePatient.tsx` القائم ═════════════════
function payload(overrides: Record<string, any> = {}) {
  return {
    name: `${MARK}-افتراضي`,
    phone: "07730000000",
    referralSource: MARK,
    age: "34", height: "171", weight: "72",
    medicalCondition: "physiotherapy",
    isAmputee: false, isPhysiotherapy: true, isMedicalSupport: false,
    branchId: 1,
    whatsappNotificationsEnabled: false,
    hadPriorCenterHistory: false,
    ...overrides,
  };
}

/** مدخلُ المخزن مباشرةً — نفسُ ما تمرّره النقطةُ بعد التحقّق وأختامِ الخادم. */
function storeInput(name: string, phone: string) {
  return {
    ...payload({ name, phone }),
    totalCost: 0,
    patientClassification: "new",
  } as any;
}

// ══ بصمةُ الملفّ — كلُّ ما يُنتجه التسجيل، منزوعَ ما يجب أن يختلف ═══════
//  **والهويّةُ وحدها تُنزَع** — لا حقلَ سلوكيّ. الاسمُ والهاتفُ **يجب** أن
//  يختلفا بين الملفّين (حارسُ منع التكرار يمنع تطابقَهما أصلاً)، ومعهما
//  الأعمدةُ المشتقّةُ منهما حتمياً: `name_norm` من الاسم، و`phone_digits`
//  من الهاتف، و`code_digits` من الرمز المتسلسل. وكلُّ ما عداها يُقارَن.
const VOLATILE = new Set([
  "id", "patient_code", "code_digits", "name", "name_norm",
  "phone", "phone_e164", "phone_digits",
  "created_at", "updated_at", "registration_date", "whatsapp_consent_at",
]);
async function patientFingerprint(id: number) {
  const [p] = await q<{ j: any }>(`SELECT row_to_json(p) j FROM patients p WHERE id=$1`, [id]);
  const row: Record<string, any> = { ...(p?.j ?? {}) };
  for (const k of Object.keys(row)) if (VOLATILE.has(k)) delete row[k];
  const cases = await q(
    `SELECT case_type, status, cost, cost_source FROM patient_cases
      WHERE patient_id=$1 ORDER BY case_type`, [id]);
  const contacts = await q(
    `SELECT channel, relation, (revoked_at IS NULL) active FROM patient_contacts
      WHERE patient_id=$1 ORDER BY id`, [id]);
  const deliveries = await q(
    `SELECT channel, notification_type, status, attempt_count FROM patient_notification_deliveries
      WHERE patient_id=$1 ORDER BY id`, [id]);
  const costEntries = await q<{ n: number }>(
    `SELECT COUNT(*)::int n FROM cost_entries WHERE patient_id=$1`, [id]);
  return { row, cases, contacts, deliveries, costEntryCount: costEntries[0]?.n ?? -1 };
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [[ADMIN, RECV, NOPERM]]);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM patient_code_aliases a
            WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, canAdd] of [
    [ADMIN, "admin", "المسؤول", true], [RECV, "reception", "ريام", true],
    [NOPERM, "reception", "بلا صلاحية", false],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,
               branch_ids,is_active,can_add_patients,can_view_patients)
             VALUES ($1,$2,'x',$3,$4,1,'[1]'::jsonb,true,$5,true)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               branch_id=1, branch_ids='[1]'::jsonb, is_active=true,
               can_add_patients=EXCLUDED.can_add_patients, can_view_patients=true`,
      [id, `dcp_u${id}`, name, role, canAdd]);
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
    check(skipped === 1, "جدولُ النقاط الحقيقيّ مُركَّب", String(skipped));

    // ══════════════════════════════════════════════════════════════════
    //  أ. **الأثرُ لا يتغيّر** — الدالّةُ نفسُها بالوجهين
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ. `storage.createPatient` بلا التشخيص وبه — بصمةٌ واحدة ──");
    {
      //  **بلا معامِلٍ ثانٍ إطلاقاً** — شكلُ النداء قبل هذا التغيير بالحرف.
      const plain = await storage.createPatient(storeInput(`${MARK}-بلا-تشخيص`, "07730000001"));
      //  **وبه** — نفسُ المدخل، ومعه ملتقطُ الأطوار.
      const phases: string[] = [];
      const probed = await storage.createPatient(
        storeInput(`${MARK}-بتشخيص`, "07730000002"),
        { onPhase: (p) => phases.push(p) },
      );

      const fpPlain = await patientFingerprint(plain.id);
      const fpProbed = await patientFingerprint(probed.id);

      check(plain.id > 0 && probed.id > 0 && plain.id !== probed.id,
        "١. الملفّان أُنشئا فعلاً ومستقلّان", `${plain.id} / ${probed.id}`);
      same("٢. **صفُّ المريض مطابقٌ عموداً بعمود** — بلا أيّ فرق",
        fpProbed.row, fpPlain.row);
      same("٣. وحالاتُه المشتقّة مطابقة (`syncPatientCases` لم تتأثّر)",
        fpProbed.cases, fpPlain.cases);
      same("٤. وجهاتُ الاتصال مطابقة", fpProbed.contacts, fpPlain.contacts);
      same("٥. وصفوفُ الإشعار مطابقة", fpProbed.deliveries, fpPlain.deliveries);
      same("٦. ولا قيدَ كلفةٍ في الحالتين (التسجيلُ بلا مال)",
        [fpProbed.costEntryCount, fpPlain.costEntryCount], [0, 0]);

      same("٧. **والطوران الداخليّان وحدهما** — لا ثالثَ ولا ناقص",
        phases, ["before_sync_patient_cases", "after_sync_patient_cases"]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ب. المسارُ الحيّ الكامل — الأطوارُ العشرةُ بمعرّفِ ارتباطٍ واحد
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. `POST /api/patients` — الأطوارُ بترتيبها ومعرّفٍ واحد ──");
    let liveId = 0;
    {
      const { result, lines } = await capturing(() =>
        http("POST", "/api/patients", S.recv, payload({
          name: `${MARK}-حيّ`, phone: "07730000003",
        })));

      check(result.status === 201, "٨. التسجيلُ نجح كما كان", JSON.stringify(result.body));
      liveId = Number(result.body?.id ?? 0);
      check(liveId > 0, "٩. والملفُّ له معرّفٌ حقيقيّ", String(liveId));

      const objs = diagObjects(lines, "patient_create");
      const ids = Array.from(new Set(objs.map((o) => String(o.requestId))));
      same("١٠. **معرّفُ ارتباطٍ واحد لكلّ الأطوار** — لا اثنان", ids.length, 1);

      same("١١. **الأطوارُ العشرةُ المطلوبة + طورا المزامنة، بترتيبها**",
        objs.map((o) => String(o.phase)),
        [
          "raw_request_arrival_before_session",
          "session_middleware_completed",
          "route_handler_reached",
          "before_create_patient",
          "before_sync_patient_cases",
          "after_sync_patient_cases",
          "after_create_patient",
          "before_audit",
          "after_audit",
          "before_response",
          "http_response_finish",
          "http_response_close",
        ]);

      check(objs.every((o) => typeof o.elapsedMs === "number" && o.elapsedMs >= 0),
        "١٢. ولكلّ طورٍ زمنُه المنقضي بالمللي");
      check(objs.every((o, i) => i === 0 || Number(o.elapsedMs) >= Number(objs[i - 1].elapsedMs)),
        "١٢.أ والأزمنةُ غيرُ متناقصة — سلسلةٌ واحدة من لحظةٍ واحدة");

      // ══ **ولا اسمَ ولا هاتفَ ولا بيانَ مريضٍ في السجلّ** ═══════════════
      const blob = objs.map((o) => JSON.stringify(o)).join("\n");
      check(!blob.includes(MARK) && !blob.includes("0773000000"),
        "١٣. **لا يُسجَّل اسمٌ ولا هاتفٌ ولا أيُّ بيانِ مريض**", blob.slice(0, 200));
      same("١٣.أ و`entityId` فارغٌ بصدق — لا يُقرأ «patients» معرّفَ صفّ",
        Array.from(new Set(objs.map((o) => String(o.entityId)))), [""]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ج. **لا خطوةَ في الخلفية** — الترتيبُ يُثبته
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. لا شيءَ أُجِّل: العملُ كلُّه قبل الاستجابة ──");
    {
      //  الملفُّ المُنشَأ في «ب» مقروءٌ **الآن** بحالته الكاملة: لو كانت
      //  المزامنةُ قد أُجِّلت خلفياً لَما كانت حالتُه موجودةً لحظةَ الردّ.
      const cases = await q<{ t: string }>(
        `SELECT case_type t FROM patient_cases WHERE patient_id=$1`, [liveId]);
      same("١٤. حالةُ المريض مشتقّةٌ فعلاً قبل الردّ",
        cases.map((c) => c.t), ["physiotherapy"]);
      const [audit] = await q<{ n: number }>(
        `SELECT COUNT(*)::int n FROM audit_log
          WHERE entity_type='patient' AND entity_id=$1 AND action='create'`, [liveId]);
      same("١٥. وسطرُ التدقيق مكتوبٌ قبل الردّ", audit?.n, 1);
    }

    // ══════════════════════════════════════════════════════════════════
    //  د. **لا مسارَ آخر يُمَسّ** — المرساةُ `$` بعد `patients` مباشرةً
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. عزلُ المسار — لا سطرَ تشخيصٍ لغيره ──");
    {
      const { lines: readLines } = await capturing(() =>
        http("GET", "/api/patients", S.recv));
      same("١٦. `GET /api/patients` — صفرُ سطور", diagObjects(readLines, "patient_create").length, 0);

      const { lines: subLines } = await capturing(() =>
        http("POST", `/api/patients/${liveId}/add-case-type`, S.recv, { caseType: "prosthetic" }));
      same("١٧. **`POST /api/patients/:id/add-case-type` — صفرُ سطور**",
        diagObjects(subLines, "patient_create").length, 0);

      const { lines: mergeLines } = await capturing(() =>
        http("POST", "/api/admin/patients/merge", S.admin, {}));
      same("١٨. و`POST /api/admin/patients/merge` — صفرُ سطور",
        diagObjects(mergeLines, "patient_create").length, 0);
    }

    // ══════════════════════════════════════════════════════════════════
    //  هـ. المنطقُ التجاريّ كما كان — الحُرّاسُ لم يضعفوا
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. حُرّاسُ النقطة كما هم ──");
    {
      const noPerm = await http("POST", "/api/patients", S.noPerm,
        payload({ name: `${MARK}-مرفوض`, phone: "07730000009" }));
      same("١٩. **بلا `canAddPatients` ⟵ ٤٠٣ كما كان**", noPerm.status, 403);
      const [rejected] = await q<{ n: number }>(
        `SELECT COUNT(*)::int n FROM patients WHERE referral_source=$1 AND name=$2`,
        [MARK, `${MARK}-مرفوض`]);
      same("١٩.أ وصفرُ كتابة — لا ملفَّ أُنشئ", rejected?.n, 0);

      const withCost = await http("POST", "/api/patients", S.recv,
        payload({ name: `${MARK}-بكلفة`, phone: "07730000010", totalCost: 5000 }));
      same("٢٠. **وكلفةٌ عند التسجيل ما زالت تُردّ ٤٠٠**", withCost.status, 400);

      const dup = await http("POST", "/api/patients", S.recv,
        payload({ name: `${MARK}-حيّ`, phone: "07730000011" }));
      same("٢١. **ومنعُ تكرار الاسم ما زال يردّ ٤٠٩**", dup.status, 409);
    }

  } finally {
    await cleanup();
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [[ADMIN, RECV, NOPERM]]);
    httpServer.close();
  }

  console.log(`\n${failures === 0 ? "✅ التشخيصُ لا يغيّر نتيجةَ التسجيل" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
