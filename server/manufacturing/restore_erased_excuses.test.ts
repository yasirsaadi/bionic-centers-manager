//  **استرجاعُ الأعذار التي مُحيت قبل إصلاح ٢٠٢٦-٠٩-٢٤ (طلب الدمج ٤٠٣)**.
//
//  ══ الواقعة ═══════════════════════════════════════════════════════════
//  قبل ٤٠٣ كان «إلغاء التوقّف ومتابعة العمل» والانتقالُ للمرحلة التالية
//  يمحوان عذرَ الخبير من الأمر (`holdReasonCode: null, holdNote: null`)، فعاد
//  كلُّ أمرٍ متأخّرٍ كتب خبيرُه عذرَه أحمرَ «متأخر بدون عذر». أصلح ٤٠٣ ذلك من
//  يومها ولم يُرجع ما مُحي قبله — **والعذرُ لم يضع**: سطرُه في الخطّ الزمني باقٍ.
//
//  وقاعدةُ المالك (٢٠٢٦-٠٩-٢٥): «الخبير الذي يكتب عذراً في أيّ موضعٍ خاصٍّ
//  للعذر يجب ألّا يكون مريضه أحمر وإنما أصفر، لأنه بعذر».
//
//  ما يحرسه هذا الملفّ: سكربتا الجذر — `restore_erased_excuses_preview.sql`
//  (قراءةٌ فقط) و`restore_erased_excuses_apply.sql` (الكتابة) — **بنصّهما كما
//  سيلصقه المالكُ في Neon**، على أوامر بُنيت بالنقاط الحقيقية ثمّ مُحي عذرُها
//  بما كان يفعله الاستئنافُ قبل ٤٠٣ بحرفه.
//
//  التشغيل على قاعدةٍ محلّيةٍ طازجة (نسخةٍ من القالب):
//  `DATABASE_URL=… npm run test:restore-excuses`
import { db, pool } from "../db";
import { sql } from "drizzle-orm";
import express from "express";
import { createServer } from "http";
import { readFileSync } from "fs";
import { registerRoutes } from "../routes";
import { HOLD_REASONS, REASON_CODE_LABELS, STATUS_LABELS, latenessOf } from "@shared/manufacturing";
import { rowToneOf } from "../../client/src/pages/manufacturing_row_tone";

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}

const PORT = 6141 + (Date.now() % 7);
const BASE = `http://127.0.0.1:${PORT}`;

const PREVIEW = readFileSync("restore_erased_excuses_preview.sql", "utf8");
const APPLY = readFileSync("restore_erased_excuses_apply.sql", "utf8");
const STORE_SRC = readFileSync("server/manufacturing/store.ts", "utf8");

//  السطران اللذان يعدّلهما المالكُ في سكربت الكتابة — بنصّهما في الملفّ.
const EXCL_LINE = "v_excluded      integer[] := ARRAY[]::integer[];";
const OP_LINE = "v_operator_id   integer := 0;";
function applyWith(excluded: number[], operator = 0): string {
  if (!APPLY.includes(EXCL_LINE) || !APPLY.includes(OP_LINE)) {
    throw new Error("سطرا الإعداد في سكربت الكتابة تغيّرا — حدّث الاختبار");
  }
  return APPLY
    .replace(EXCL_LINE, `v_excluded      integer[] := ARRAY[${excluded.join(", ")}]::integer[];`)
    .replace(OP_LINE, `v_operator_id   integer := ${operator};`);
}

//  جدولُ النقاط الحقيقيّ — نفسُ حَقنِ الجلسة المستعمَل في بقيّة الحزم.
async function bootRealRoutes() {
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
  (app as any).use = (...args: any[]) =>
    (args.length === 1 && typeof args[0] === "function" && args[0].name === "session")
      ? app : realUse(...(args as [any]));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));
  return httpServer;
}

async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "content-type": "application/json",
      "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

let pass = 0, fail = 0;
const ok = (c: boolean, m: string, detail = "") => {
  if (c) { pass++; console.log("  ✓ " + m); }
  else { fail++; console.log("  ✗ " + m + (detail ? `\n      ${detail}` : "")); }
};
const eq = (got: unknown, want: unknown, m: string) =>
  ok(JSON.stringify(got) === JSON.stringify(want), m,
    `want ${JSON.stringify(want)} got ${JSON.stringify(got)}`);

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}

type ScriptResult = { error: string | null; notices: string[] };
/** يُشغَّل السكربتُ بنصّه على اتّصالٍ مستقلّ، وتُلتقَط رسائلُه كما يراها المالك.
 *  ويُعاد رقمُ اتّصاله: `pg_stat_activity.query` يُقصّ عند ١٠٢٤ بايتاً، ورأسُ
 *  السكربت تعليقاتٌ عربية أطولُ من ذلك — فلا يُعرَف بنصّه. */
async function startScript(text: string): Promise<{ pid: number; done: Promise<ScriptResult> }> {
  const c = await pool.connect();
  const pid = Number((await c.query("SELECT pg_backend_pid() AS pid")).rows[0].pid);
  const notices: string[] = [];
  const onNotice = (n: any) => notices.push(String(n?.message ?? n));
  c.on("notice", onNotice);
  const done = (async () => {
    try {
      await c.query(text);
      return { error: null, notices };
    } catch (e: any) {
      return { error: String(e?.message ?? e), notices };
    } finally {
      c.off("notice", onNotice);
      c.release();
    }
  })();
  return { pid, done };
}
async function runScript(text: string): Promise<ScriptResult> {
  return (await startScript(text)).done;
}

/** المعاينةُ داخل معاملةٍ للقراءة وحدها — أيُّ كتابةٍ فيها كانت ستُرفَض. */
async function runPreviewReadOnly(): Promise<any[]> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN READ ONLY");
    const r = await c.query(PREVIEW);
    await c.query("ROLLBACK");
    return r.rows;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => undefined);
    throw e;
  } finally {
    c.release();
  }
}

/** بصمةُ الأوامر وسجلّها وتدقيقها — كلُّ ما قد تمسّه الكتابة. */
async function fingerprint(ids: number[]): Promise<string> {
  const orders = await q(`
    SELECT id, status, current_stage, hold_reason_code, hold_note,
           expected_delivery_date::text AS due, expert_user_id, branch_id,
           updated_at::text AS updated_at
      FROM prosthetic_work_orders WHERE id = ANY($1) ORDER BY id`, [ids]);
  const hist = await q(`
    SELECT id, work_order_id, action_type, notes, performed_by
      FROM prosthetic_work_history WHERE work_order_id = ANY($1) ORDER BY id`, [ids]);
  const audit = await q(`
    SELECT id, entity_id, action, notes FROM audit_log
     WHERE entity_type = 'prosthetic_work_order' AND entity_id = ANY($1) ORDER BY id`, [ids]);
  return JSON.stringify({ orders, hist, audit });
}

/** الكتلةُ المشتركة بين الملفّين — بين علامتيها حرفاً بحرف. */
function sharedBlock(src: string): string | null {
  const a = src.indexOf("-- ▼▼"), b = src.indexOf("-- ▲▲");
  return a >= 0 && b > a ? src.slice(a, b) : null;
}
/** أزواجُ `('code', 'label')` في قائمة `VALUES` تبدأ باسمها. */
function valuesPairs(src: string, cteName: string): Record<string, string> {
  const start = src.indexOf(`${cteName}(code, label) AS (VALUES`);
  if (start < 0) return {};
  const end = src.indexOf("\n)", start);
  const body = src.slice(start, end);
  const out: Record<string, string> = {};
  for (const m of Array.from(body.matchAll(/\('([^']+)', '([^']+)'\)/g))) out[m[1]] = m[2];
  return out;
}
/** نصُّ SQL بلا تعليقات — كي لا يُقرأ شرحٌ فعلاً. */
const stripSqlComments = (s: string) => s.replace(/--[^\n]*/g, "");

//  تاريخان لا يتأثّران بيوم التشغيل: مضى موعدُه يقيناً.
const PAST = "2020-01-15";
const PAST2 = "2020-02-20";

//  أسبابٌ صالحةٌ من القائمة القانونية نفسِها — لا رموزٌ مكتوبةٌ هنا تنحرف.
const MAT = HOLD_REASONS.waiting_materials[0].code;
const PAT = HOLD_REASONS.waiting_patient[0].code;
const RWK = HOLD_REASONS.technical_rework[0].code;
const MAT_LABEL = REASON_CODE_LABELS[MAT];

async function main() {
  // ══ أ — ما يُقرأ من النصّ نفسِه، بلا قاعدة ═══════════════════════════
  console.log("\nأ — السكربتان كما سيلصقهما المالك");
  const b1 = sharedBlock(PREVIEW), b2 = sharedBlock(APPLY);
  ok(!!b1 && b1 === b2,
    "أ١. تعريفُ المرشَّحين **نصٌّ واحد حرفاً بحرف** في المعاينة والكتابة — فما تعرضه المعاينةُ هو ما يُكتب");
  eq(valuesPairs(PREVIEW, "reason_labels"), REASON_CODE_LABELS,
    "أ٢. أسماءُ الأعذار في السكربت هي المعجمُ القانونيّ نفسُه (`REASON_CODE_LABELS`) — لا معجمَ ثانٍ ينحرف");
  eq(valuesPairs(PREVIEW, "status_labels"), STATUS_LABELS,
    "أ٣. وأسماءُ الحالات هي `STATUS_LABELS` نفسُها");
  //  الصيغةُ التي يقرؤها السكربت هي بعينها ما يكتبه الكتّابُ الثلاثة.
  ok(STORE_SRC.includes("`توقّف: ${status} — السبب: ${reasonCode}${params.note ? ` — ${params.note}` : \"\"}`")
    && PREVIEW.includes("h.notes LIKE 'توقّف: %'"),
    "أ٤. سطرُ «توقّف / مشكلة» بصيغة `holdOrder` حرفاً بحرف");
  ok(STORE_SRC.includes("`إعادة عمل فني — رجوع من ${live.currentStage} إلى ${returnToStage} — السبب: ${reasonCode}${params.note ? ` — ${params.note}` : \"\"}`")
    && PREVIEW.includes("h.notes LIKE 'إعادة عمل فني — رجوع من %'"),
    "أ٥. وسطرُ إعادة العمل الفنّي بصيغة `reworkToStage`");
  ok(STORE_SRC.includes("`سبب التوقّف: ${live.status} — السبب: ${reasonCode}${params.note ? ` — ${params.note}` : \"\"}`")
    && PREVIEW.includes("h.notes LIKE 'سبب التوقّف: %'"),
    "أ٦. وسطرُ «كتابة سبب التوقّف» بصيغة `documentHoldReason`");
  const previewCode = stripSqlComments(PREVIEW);
  ok(!/\b(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE|GRANT)\b/i.test(previewCode),
    "أ٧. المعاينةُ لا تحمل فعلَ كتابةٍ واحداً");
  const applyCode = stripSqlComments(APPLY);
  //  و`ON COMMIT DROP` تُسقط الجدولَ **المؤقّت** وحدَه عند الالتزام — ليست إسقاطاً لشيءٍ قائم.
  ok(!/\b(DELETE\s+FROM|DROP\s+(TABLE|COLUMN|INDEX|SCHEMA|CONSTRAINT|TRIGGER|FUNCTION|VIEW)|TRUNCATE|ALTER\s+TABLE)\b/i
      .test(applyCode) && (applyCode.match(/\bDROP\b/gi) ?? []).length === 1
      && /CREATE TEMP TABLE _excuse_restore ON COMMIT DROP AS/.test(applyCode),
    "أ٨. وسكربتُ الكتابة بلا حذفٍ ولا إسقاطٍ ولا تعديلِ بنية (والجدولُ المؤقّت يزول وحدَه عند الالتزام)");
  const updates = Array.from(applyCode.matchAll(/UPDATE\s+([a-z_]+)/gi)).map((m) => m[1]);
  eq(updates, ["prosthetic_work_orders"],
    "أ٩. وتحديثٌ واحد، على أوامر التصنيع وحدها");
  ok(/SET hold_reason_code = rec\.code,\s+hold_note\s+= rec\.note,\s+updated_at\s+= NOW\(\)\s+WHERE/.test(applyCode),
    "أ١٠. ولا يكتب فيها إلّا عمودَي العذر (وختمَ التحديث)");

  // ══ العيّنة — بالنقاط الحقيقية ════════════════════════════════════════
  let srv: any = null;
  const t = Date.now() % 1000000;
  const one = async (qq: any) => (await db.execute(qq)).rows[0] as any;
  const ids: number[] = [];
  const userIds: number[] = [];
  const patientIds: number[] = [];

  const bE = Number((await one(sql`INSERT INTO branches (name) VALUES (${"فرع الاسترجاع " + t}) RETURNING id`)).id);
  //  فرعٌ ثانٍ لملفّ السلّة وحدَه — فتبقى أرقامُ لوحة الفرع الأوّل مقيسةً بلا أثرٍ منه.
  const bT = Number((await one(sql`INSERT INTO branches (name) VALUES (${"فرع السلّة " + t}) RETURNING id`)).id);
  const mkUser = async (role: string, name: string) => {
    const id = Number((await one(sql`
      INSERT INTO system_users (username, password_hash, display_name, role, branch_id, branch_ids,
                                is_active, can_view_patients)
      VALUES (${role + "_rx_" + t + "_" + userIds.length}, 'x', ${name + " " + t}, ${role},
              ${bE}, ${JSON.stringify([bE])}::jsonb, true, true)
      RETURNING id`)).id);
    userIds.push(id);
    return id;
  };
  const X = await mkUser("prosthetics_expert", "مصطفى شرف");
  const M = await mkUser("branch_manager", "مدير الفرع");
  const X_NAME = "مصطفى شرف " + t, M_NAME = "مدير الفرع " + t;

  const S = {
    expert: { userId: X, role: "prosthetics_expert", isAdmin: false, branchId: bE,
      accessibleBranches: [bE], displayName: X_NAME, permissions: {} },
    manager: { userId: M, role: "branch_manager", isAdmin: false, branchId: bE,
      accessibleBranches: [bE], displayName: M_NAME, permissions: { canViewPatients: true } },
    admin: { userId: 0, role: "admin", isAdmin: true, branchId: 0, accessibleBranches: [], permissions: {} },
  };

  //  مريضٌ لكلّ أمر — القاعدةُ تمنع بناءين مفتوحين لمريضٍ واحد.
  const mkOrder = async (name: string,
                         o: { stage?: string; status?: string; due?: string | null; branch?: number } = {}) => {
    const br = o.branch ?? bE;
    const patient = Number((await one(sql`
      INSERT INTO patients (name, phone, branch_id, is_amputee, referral_source, age, medical_condition)
      VALUES (${name + " " + t}, ${"0773" + t + patientIds.length}, ${br}, true, 'اختبار', 30, 'بتر')
      RETURNING id`)).id);
    patientIds.push(patient);
    const id = Number((await one(sql`
      INSERT INTO prosthetic_work_orders
        (patient_id, branch_id, service_type, purpose, expert_user_id, status, current_stage,
         expected_delivery_date)
      VALUES (${patient}, ${br}, 'prosthetic', 'initial_build', ${X}, ${o.status ?? "active"},
              ${o.stage ?? "manufacturing"}, ${o.due === undefined ? PAST : o.due})
      RETURNING id`)).id);
    ids.push(id);
    return id;
  };
  //  **ما كان يفعله الاستئنافُ والتقدّمُ قبل ٤٠٣ بحرفه** (`2477990`):
  //  `.set({ status: "active", holdReasonCode: null, holdNote: null })` — والسطرُ
  //  «استئناف العمل» يكتبه الاستئنافُ الحاليّ نفسُه، فلا يُلفَّق هنا.
  const eraseLikeBefore403 = (id: number) =>
    db.execute(sql`UPDATE prosthetic_work_orders SET hold_reason_code = NULL, hold_note = NULL WHERE id = ${id}`);
  const hold = (id: number, status: string, reasonCode: string, note?: string, extra: any = {}) =>
    http("POST", `/api/manufacturing/orders/${id}/hold`, S.expert,
      { status, reasonCode, ...(note === undefined ? {} : { note }), ...extra });
  const resume = (id: number) => http("POST", `/api/manufacturing/orders/${id}/resume`, S.expert, {});
  const rawOrder = async (id: number) => (await q(`
    SELECT status, current_stage, hold_reason_code, hold_note, expected_delivery_date::text AS due,
           expert_user_id FROM prosthetic_work_orders WHERE id = $1`, [id]))[0];
  const boardRow = async (id: number) => {
    const r = await http("GET", `/api/manufacturing/orders?branchId=${bE}`, S.admin);
    return (r.body as any[]).find((x) => x.id === id);
  };

  const ML_NOTE = "سطرٌ أوّل\nوسطرٌ ثانٍ — بشرطةٍ في وسطه";

  const W = await mkOrder("وهج");                     // توقّفٌ ثمّ استئناف
  const ADV = await mkOrder("تقدّم");                  // توقّفٌ ثمّ انتقالٌ للمرحلة التالية
  const RW = await mkOrder("إعادة عمل");               // إعادةُ عملٍ فنّي ثمّ استئناف
  const TWO = await mkOrder("عذران");                  // عذران متتاليان — الأحدثُ يعود
  const ML = await mkOrder("ملاحظة بسطرين");           // ملاحظةٌ بسطرين وشرطة
  const DATE = await mkOrder("تغيّر موعده");            // عذرٌ ثمّ تغييرُ موعدٍ بسبب
  const HR = await mkOrder("سبب توقّف قائم", { status: "technical_rework", stage: "mold" });
  const TRASH = await mkOrder("في المحذوفات", { branch: bT });  // ملفٌّ في السلّة
  const EXCL = await mkOrder("مستبعد");                 // يستبعده المالك
  const RACE = await mkOrder("كُتب له عذرٌ أثناء التشغيل");
  const KEEP = await mkOrder("عذرٌ باقٍ");              // بعد ٤٠٣: لم يُمحَ
  const NONE = await mkOrder("لم يُكتب له شيء");        // لا عذرَ قطّ
  const NOTES = await mkOrder("ملاحظة وسبب موعد");      // ليسا مكانَ العذر
  const CANC = await mkOrder("ملغى");                   // منتهٍ
  const LEGACY = await mkOrder("موروث بلا سبب", { status: "technical_rework", stage: "mold" });

  const restoredSet = [W, ADV, RW, TWO, ML, DATE, HR, TRASH];

  try {
    srv = await bootRealRoutes();

    console.log("\nب — بناءُ الأشكال بالنقاط الحقيقية، ثمّ المحوُ كما كان قبل ٤٠٣");
    const steps: [string, number][] = [];
    const st = async (label: string, p: Promise<{ status: number }>) => steps.push([label, (await p).status]);

    await st("W hold", hold(W, "waiting_materials", MAT, "تأخّر البرلون"));
    await st("W resume", resume(W));

    await st("ADV hold", hold(ADV, "waiting_patient", PAT));
    await st("ADV advance", http("PATCH", `/api/manufacturing/orders/${ADV}/advance`, S.expert, {}));

    await st("RW rework", hold(RW, "technical_rework", RWK, "السوكت ضيّق", { returnToStage: "mold" }));
    await st("RW resume", resume(RW));

    await st("TWO hold1", hold(TWO, "waiting_patient", PAT, "أوّل"));
    await st("TWO resume1", resume(TWO));
    await st("TWO hold2", hold(TWO, "waiting_materials", MAT, "ثانٍ"));
    await st("TWO resume2", resume(TWO));

    await st("ML hold", hold(ML, "waiting_materials", MAT, ML_NOTE));
    await st("ML resume", resume(ML));

    await st("DATE hold", hold(DATE, "waiting_materials", MAT, "قبل تغيير الموعد"));
    await st("DATE resume", resume(DATE));
    await st("DATE date", http("PATCH", `/api/manufacturing/orders/${DATE}/delivery-date`, S.expert,
      { expectedDeliveryDate: PAST2, reason: "تأخّر وصول مفصل الركبة من المورّد", ifCurrentDate: PAST }));

    //  أمرٌ متوقّفٌ بلا سببٍ مكتوب (موروث) يُكتب سببُه من «كتابة سبب التوقّف» ثمّ
    //  يُستأنف — فيبقى سطرُ ذلك الكاتب هو العذرَ المقروء.
    await st("HR hold-reason", http("POST", `/api/manufacturing/orders/${HR}/hold-reason`, S.expert,
      { status: "technical_rework", reasonCode: RWK, note: "كتبه الخبيرُ على المتوقّف" }));
    await st("HR resume", resume(HR));

    await st("TRASH hold", hold(TRASH, "waiting_materials", MAT, "في السلّة"));
    await st("TRASH resume", resume(TRASH));

    await st("EXCL hold", hold(EXCL, "waiting_materials", MAT, "مستبعد"));
    await st("EXCL resume", resume(EXCL));

    await st("RACE hold", hold(RACE, "waiting_materials", MAT, "العذرُ القديم"));
    await st("RACE resume", resume(RACE));

    await st("KEEP hold", hold(KEEP, "waiting_materials", MAT, "باقٍ"));
    await st("KEEP resume", resume(KEEP));

    await st("NOTES advance", http("PATCH", `/api/manufacturing/orders/${NOTES}/advance`, S.expert,
      { notes: "تأخّر المورّد" }));
    await st("NOTES date", http("PATCH", `/api/manufacturing/orders/${NOTES}/delivery-date`, S.expert,
      { expectedDeliveryDate: PAST2, reason: "تأخّر وصول مفصل الركبة من المورّد", ifCurrentDate: PAST }));

    await st("CANC hold", hold(CANC, "waiting_materials", MAT, "ثمّ أُلغي"));
    await st("CANC resume", resume(CANC));

    eq(steps.filter(([, s]) => s !== 200), [], "ب١. كلُّ خطوةٍ بالنقاط الحقيقية نجحت");

    //  المحوُ كما كان — على كلّ ما استؤنف أو تقدّم قبل ٤٠٣. و`KEEP` وحدَه لا يُمحى:
    //  استُؤنف بعد ٤٠٣ فبقي عذرُه. و`CANC` مُحي ثمّ أُلغي.
    for (const id of [W, ADV, RW, TWO, ML, DATE, HR, TRASH, EXCL, RACE, CANC]) await eraseLikeBefore403(id);
    const cn = await http("POST", `/api/manufacturing/orders/${CANC}/cancel`, S.manager, {});
    eq(cn.status, 200, "ب٢. والملغى أُلغي من بابه");
    await db.execute(sql`
      UPDATE patients SET deleted_at = NOW(), deleted_reason = 'اختبار الاسترجاع',
        restore_until = NOW() + INTERVAL '30 days', deleted_total_cost = 0, deleted_total_paid = 0,
        deleted_remaining = 0, deleted_needed_admin = false,
        deleted_pending_json = '{"pendingCharges":[],"pendingDiscounts":[],"pendingPriceRequests":[],"openFollowups":[],"openSettlements":[]}'::jsonb
      WHERE id = (SELECT patient_id FROM prosthetic_work_orders WHERE id = ${TRASH})`);

    const w0 = await rawOrder(W);
    eq([w0.status, w0.hold_reason_code, w0.hold_note], ["active", null, null],
      "ب٣. «وهج» بعد المحو: يعمل بلا عذر — هكذا تركه الاستئنافُ قبل ٤٠٣");
    const k0 = await rawOrder(KEEP);
    eq([k0.status, k0.hold_reason_code, k0.hold_note], ["active", MAT, "باقٍ"],
      "ب٤. والمستأنَفُ بعد ٤٠٣ عذرُه باقٍ — لا يحتاج استرجاعاً");

    console.log("\nج — اللوحةُ قبل الاسترجاع: مَن كتب خبيرُه عذراً ثمّ مُحي أحمر");
    const beforeRows = new Map<number, any>();
    for (const id of [W, ADV, RW, TWO, ML, DATE, HR, EXCL, RACE, KEEP, NONE, NOTES]) {
      beforeRows.set(id, await boardRow(id));
    }
    eq([W, ADV, RW, TWO, ML, DATE, HR, EXCL, RACE].map((id) => latenessOf(beforeRows.get(id))),
      Array(9).fill("late"),
      "ج١. الأوامرُ التي مُحي عذرُها كلُّها «متأخر بدون عذر» — العطبُ بعينه");
    eq([W, ADV, RW, TWO, ML, DATE, HR, EXCL, RACE].map((id) => rowToneOf(beforeRows.get(id)).tone),
      Array(9).fill("red"), "ج٢. وبالأحمر");
    eq(latenessOf(beforeRows.get(KEEP)), "late_excused", "ج٣. والمستأنَفُ بعد ٤٠٣ أصفرُ بعذره");
    const ovBefore = (await http("GET", `/api/manufacturing/overview?branchId=${bE}`, S.admin)).body;

    console.log("\nد — المعاينة: تقرأ ولا تكتب، وتعرض ما سيعود بعينه");
    const fpAll = () => fingerprint(ids);
    const fp0 = await fpAll();
    const rows = await runPreviewReadOnly();
    ok(true, "د١. نُفِّذت داخل معاملةٍ **للقراءة وحدها** بلا خطأ — أيُّ كتابةٍ فيها كانت ستُرفَض");
    eq(await fpAll(), fp0, "د٢. ولم يتغيّر حرفٌ في الأوامر ولا سجلّها ولا تدقيقها");
    const byId = new Map<number, any>(rows.map((r: any) => [Number(r["رقم الأمر"]), r]));
    const listed = ids.filter((id) => byId.has(id)).sort((a, b) => a - b);
    eq(listed, [...restoredSet, EXCL, RACE].sort((a, b) => a - b),
      "د٣. القائمةُ هي الأوامرُ التي مُحي عذرُها بعينها — لا الباقي عذرُه ولا مَن لم يُكتب له ولا الملغى ولا الموروث ولا ملاحظةُ التقدّم وسببُ الموعد");
    const w = byId.get(W);
    eq([w?.["العذر الذي سيعود"], w?.["ملاحظة الخبير"], w?.["كتبه"], w?.["الحالة الآن"], w?.["متأخر الآن"]],
      [MAT_LABEL, "تأخّر البرلون", X_NAME, "قيد العمل", "نعم"],
      "د٤. «وهج»: العذرُ باسمه العربيّ وملاحظتُه ومَن كتبه — والأمرُ يعمل ومتأخّرٌ الآن");
    eq([byId.get(TWO)?.["العذر الذي سيعود"], byId.get(TWO)?.["ملاحظة الخبير"]], [MAT_LABEL, "ثانٍ"],
      "د٥. عذران متتاليان ⟶ **الأحدثُ** يعود، كما في القاعدة اليوم");
    eq(byId.get(ML)?.["ملاحظة الخبير"], ML_NOTE,
      "د٦. والملاحظةُ بسطرين وشرطةٍ في وسطها تُقرأ بحرفها");
    eq([byId.get(RW)?.["العذر الذي سيعود"], byId.get(RW)?.["ملاحظة الخبير"]],
      [REASON_CODE_LABELS[RWK], "السوكت ضيّق"], "د٧. وإعادةُ العمل الفنّي يُقرأ سطرُها");
    eq([byId.get(DATE)?.["ملاحظة الخبير"]], ["قبل تغيير الموعد"],
      "د٨. وتغييرُ الموعد بعد العذر لا يحجبه — سببُ الموعد ليس عذراً ولا يحلّ محلَّه");
    eq(byId.get(HR)?.["ملاحظة الخبير"], "كتبه الخبيرُ على المتوقّف",
      "د٩. و«كتابة سبب التوقّف» يُقرأ سطرُها كذلك");
    eq([byId.get(TRASH)?.["في المحذوفات"], byId.get(W)?.["في المحذوفات"]], ["نعم", ""],
      "د١٠. والملفُّ في السلّة يُوسَم ليراه المالكُ قبل أن يقرّر");
    eq(Number(w?.["العدد الكلي"]) >= listed.length, true, "د١١. والعددُ الكلّيّ في كلّ صفّ");

    console.log("\nهـ — أخطاءُ الكتابة تُوقِف قبل أيّ كتابة");
    let res = await runScript(applyWith([999999999]));
    ok(/ليست في قائمة المعاينة/.test(res.error ?? ""), "هـ١. رقمٌ مستبعَدٌ ليس في القائمة ⟶ يتوقّف برسالةٍ تقول ذلك",
      String(res.error));
    eq(await fpAll(), fp0, "هـ٢. ولم يُكتب شيء");
    res = await runScript(applyWith([KEEP]));
    ok(/ليست في قائمة المعاينة/.test(res.error ?? ""),
      "هـ٣. ورقمُ أمرٍ حقيقيّ لكنه ليس في القائمة ⟶ يتوقّف كذلك (خطأُ كتابةٍ لا يمرّ)", String(res.error));
    eq(await fpAll(), fp0, "هـ٤. ولم يُكتب شيء");
    res = await runScript(applyWith([], 999999999));
    ok(/لا حسابَ في النظام/.test(res.error ?? ""), "هـ٥. ومنفِّذٌ بلا حسابٍ قائم ⟶ يتوقّف", String(res.error));
    eq(await fpAll(), fp0, "هـ٦. ولم يُكتب شيء");

    console.log("\nو — الكتابة: يُستبعَد ما طلبه المالك، ولا يُكتب فوق عذرٍ كُتب أثناء التشغيل");
    const before = new Map<number, any>();
    for (const id of ids) before.set(id, await rawOrder(id));
    const fpOthersBefore = await fingerprint([KEEP, NONE, NOTES, CANC, LEGACY]);
    const lastLine = async (id: number) => Number((await q(`
      SELECT id FROM prosthetic_work_history
       WHERE work_order_id = $1 AND action_type IN ('status_change', 'rework', 'hold_reason')
         AND (notes LIKE 'توقّف: %' OR notes LIKE 'إعادة عمل فني — رجوع من %' OR notes LIKE 'سبب التوقّف: %')
       ORDER BY created_at DESC, id DESC LIMIT 1`, [id]))[0]?.id);
    const wLine = await lastLine(W);

    //  خبيرٌ يكتب عذراً جديداً للأمر `RACE` في اللحظة نفسِها: معاملتُه تمسك الصفَّ،
    //  والسكربتُ يقرأ القائمةَ قبل التزامها ثمّ يقف على قفل الصفّ.
    const blocker = await pool.connect();
    let applying: Promise<ScriptResult> | null = null;
    try {
      await blocker.query("BEGIN");
      await blocker.query(
        `UPDATE prosthetic_work_orders SET hold_reason_code = $1, hold_note = $2 WHERE id = $3`,
        [PAT, "كتبه الخبيرُ الآن", RACE]);
      const run = await startScript(applyWith([EXCL]));
      applying = run.done;
      let waited = false;
      for (let i = 0; i < 80 && !waited; i++) {
        const [{ n }] = await q<{ n: number }>(`
          SELECT count(*)::int AS n FROM pg_stat_activity
           WHERE pid = $1 AND wait_event_type = 'Lock'`, [run.pid]);
        waited = n > 0;
        if (!waited) await new Promise((r) => setTimeout(r, 40));
      }
      ok(waited, "و١. السكربتُ وقف فعلاً على قفل الصفّ الذي يُكتب له عذرٌ الآن");
      await blocker.query("COMMIT");
    } finally {
      blocker.release();
    }
    res = await applying!;
    eq(res.error, null, "و٢. نُفِّذ سكربتُ الكتابة بلا خطأ");

    const after = new Map<number, any>();
    for (const id of ids) after.set(id, await rawOrder(id));
    const excuseOf = (id: number) => [after.get(id).hold_reason_code, after.get(id).hold_note];
    eq(excuseOf(W), [MAT, "تأخّر البرلون"], "و٣. «وهج» عاد عذرُه بحرفه");
    eq(excuseOf(ADV), [PAT, null], "و٤. والمتقدِّمُ عاد عذرُه (بلا ملاحظة كما كُتب)");
    eq(excuseOf(RW), [RWK, "السوكت ضيّق"], "و٥. وإعادةُ العمل الفنّي");
    eq(excuseOf(TWO), [MAT, "ثانٍ"], "و٦. والأحدثُ من عذرين");
    eq(excuseOf(ML), [MAT, ML_NOTE], "و٧. والملاحظةُ بسطرين بحرفها");
    eq(excuseOf(DATE), [MAT, "قبل تغيير الموعد"], "و٨. والذي تغيّر موعدُه بعد عذره");
    eq(excuseOf(HR), [RWK, "كتبه الخبيرُ على المتوقّف"], "و٩. والذي كُتب سببُه من «كتابة سبب التوقّف»");
    eq(excuseOf(TRASH), [MAT, "في السلّة"], "و١٠. والذي في السلّة — يعود بعذره إن استُعيد");
    eq(excuseOf(EXCL), [null, null], "و١١. **والمستبعَدُ لم يُمَسّ**");
    eq(excuseOf(RACE), [PAT, "كتبه الخبيرُ الآن"],
      "و١٢. **وما كُتب له عذرٌ أثناء التشغيل بقي عذرُه الجديد** — لم يُكتب فوقه العذرُ القديم");
    ok(res.notices.some((n) => n.includes(`#${RACE}`) && n.includes("تغيّر أثناء التشغيل")),
      "و١٣. والسكربتُ قال ذلك باسم الأمر", JSON.stringify(res.notices));
    const moved = restoredSet.filter((id) => {
      const a = after.get(id), b = before.get(id);
      return a.status !== b.status || a.current_stage !== b.current_stage || a.due !== b.due
        || a.expert_user_id !== b.expert_user_id;
    });
    eq(moved, [], "و١٤. ولا حالةَ ولا مرحلةَ ولا موعدَ ولا خبيرَ تحرّك في أيّ أمرٍ أُعيد عذرُه");
    eq(await fingerprint([KEEP, NONE, NOTES, CANC, LEGACY]), fpOthersBefore,
      "و١٥. والأوامرُ خارج القائمة مطابقةٌ بايتاً: الباقي عذرُه · مَن لم يُكتب له · الملاحظةُ وسببُ الموعد · الملغى · الموروث");
    ok(res.notices.some((n) => n.includes(`إلى ${restoredSet.length} أمراً`) && n.includes("استُبعد 1")
      && n.includes("وتُرك 1")), "و١٦. والخلاصةُ تقول: كم أُعيد، وكم استُبعد، وكم تُرك", JSON.stringify(res.notices));

    console.log("\nز — الأثرُ مكتوبٌ: سطرٌ في الخطّ الزمني وسطرٌ في التدقيق لكلّ أمر");
    const restoreLines = await q(`
      SELECT work_order_id, action_type, notes, performed_by FROM prosthetic_work_history
       WHERE work_order_id = ANY($1) AND notes LIKE 'استرجاعُ عذرٍ مُحي%' ORDER BY work_order_id`, [ids]);
    eq(restoreLines.map((r: any) => r.work_order_id).sort((a: number, b: number) => a - b),
      [...restoredSet].sort((a, b) => a - b),
      "ز١. سطرٌ واحد لكلّ أمرٍ أُعيد عذرُه — لا للمستبعَد ولا لما تغيّر أثناء التشغيل");
    const wl = restoreLines.find((r: any) => r.work_order_id === W);
    ok(!!wl && wl.action_type === "hold_reason" && wl.performed_by === null
      && wl.notes.includes(MAT_LABEL) && wl.notes.includes("تأخّر البرلون")
      && wl.notes.includes(`كتبه ${X_NAME} في `) && wl.notes.includes("نفّذه: تدخّلٌ يدويّ على قاعدة البيانات"),
      "ز٢. ويقول ما أُعيد ومَن كتبه أصلاً ومتى ومَن نفّذ — بنوع «كتابة سبب التوقّف»", JSON.stringify(wl));
    const auditRows = await q(`
      SELECT entity_id, user_id, user_name, old_values, new_values FROM audit_log
       WHERE entity_type = 'prosthetic_work_order' AND entity_id = ANY($1)
         AND notes = 'استرجاعُ عذرٍ مكتوبٍ مُحي قبل إصلاح ٢٠٢٦-٠٩-٢٤ (طلب الدمج ٤٠٣)'
       ORDER BY entity_id`, [ids]);
    eq(auditRows.map((r: any) => r.entity_id).sort((a: number, b: number) => a - b),
      [...restoredSet].sort((a, b) => a - b), "ز٣. وسطرُ تدقيقٍ واحد لكلّ أمر");
    const wa = auditRows.find((r: any) => r.entity_id === W);
    const waNew = wa ? JSON.parse(wa.new_values) : {};
    eq([wa?.user_id, wa?.user_name, JSON.parse(wa?.old_values ?? "{}"), waNew.holdReasonCode,
        waNew.holdNote, waNew.restoredFromHistoryId, waNew.writtenBy],
      [null, "تدخّلٌ يدويّ على قاعدة البيانات", { holdNote: null, holdReasonCode: null }, MAT,
        "تأخّر البرلون", wLine, X],
      "ز٤. بالقيمتين قبل وبعد، ورقمِ السطر الذي أُعيد منه، ومَن كتبه — بلا رقمِ مستخدمٍ يُلفَّق");

    console.log("\nح — الأصفرُ للمعذور: اللوحةُ وصفحةُ الأمر والتنبيهات");
    const afterRows = new Map<number, any>();
    for (const id of [W, ADV, RW, TWO, ML, DATE, HR, EXCL, RACE, NONE]) afterRows.set(id, await boardRow(id));
    eq([W, ADV, RW, TWO, ML, DATE, HR].map((id) => latenessOf(afterRows.get(id))),
      Array(7).fill("late_excused"), "ح١. **كلُّ أمرٍ عاد عذرُه «متأخر بعذر»**");
    eq([W, ADV, RW, TWO, ML, DATE, HR].map((id) => rowToneOf(afterRows.get(id)).tone),
      Array(7).fill("amber"), "ح٢. **وبالأصفر لا بالأحمر** — قاعدةُ المالك بعينها");
    eq(rowToneOf(afterRows.get(W)).reason?.note, "تأخّر البرلون", "ح٣. وسببُه ظاهرٌ في الصفّ بملاحظته");
    eq([latenessOf(afterRows.get(EXCL)), latenessOf(afterRows.get(NONE))], ["late", "late"],
      "ح٤. والمستبعَدُ ومَن لم يُكتب له عذرٌ قطّ باقيان أحمرَين — لا عذرَ يُخترَع");
    const ovAfter = (await http("GET", `/api/manufacturing/overview?branchId=${bE}`, S.admin)).body;
    //  انتقل من «بدون عذر» إلى «بعذر»: السبعةُ التي أُعيد عذرُها على اللوحة، و`RACE`
    //  بعذره الجديد. وملفُّ السلّة في فرعٍ آخر فلا يدخل هذه الأرقام.
    eq([ovAfter?.totals?.overdue - ovBefore?.totals?.overdue,
        ovAfter?.totals?.overdueExcused - ovBefore?.totals?.overdueExcused],
      [-8, 8], "ح٥. واللوحة: ثمانيةٌ خرجت من «بدون عذر» ودخلت «بعذر» — لا صفَّ يضيع");
    const detail = (await http("GET", `/api/manufacturing/orders/${W}`, S.admin)).body;
    ok((detail?.timeline ?? []).some((h: any) => h.actionType === "hold_reason"
      && String(h.notes).startsWith("استرجاعُ عذرٍ مُحي")),
      "ح٦. وصفحةُ الأمر تعرض سطرَ الاسترجاع في خطّه الزمني");
    const notif = (await http("GET", `/api/manufacturing/notifications`, S.admin)).body;
    const nOf = (id: number) => (notif?.items ?? []).find((i: any) => i.orderId === id);
    eq([nOf(W)?.kind, nOf(W)?.holdReasonLabel, nOf(W)?.holdNote],
      ["overdue", MAT_LABEL, "تأخّر البرلون"],
      "ح٧. وشاشةُ التنبيهات تقرأ عذرَه — وبه تُلوَّن بطاقتُه كهرمانيّة");
    eq([nOf(NONE)?.kind, nOf(NONE)?.holdReasonLabel], ["overdue", null],
      "ح٨. ومَن لم يُكتب له عذرٌ يبقى فيها بلا عذر (أحمر)");

    console.log("\nط — التشغيلُ الثاني لا يفعل شيئاً");
    const fp1 = await fpAll();
    res = await runScript(applyWith([EXCL]));
    eq(res.error, null, "ط١. نُفِّذ ثانيةً بلا خطأ");
    eq(await fpAll(), fp1, "ط٢. ولم يتغيّر حرف — ما عاد عذرُه خرج من القائمة");
    const rows2 = await runPreviewReadOnly();
    eq(ids.filter((id) => rows2.some((r: any) => Number(r["رقم الأمر"]) === id)), [EXCL],
      "ط٣. والمعاينةُ بعده لا تعرض إلّا المستبعَد — يبقى متاحاً إن غيّر المالكُ رأيه");

    console.log("\nي — المنفِّذُ باسمه إن كان له حساب");
    res = await runScript(applyWith([], M));
    eq(res.error, null, "ي١. نُفِّذ برقم حسابٍ قائم");
    const ex = await rawOrder(EXCL);
    eq([ex.hold_reason_code, ex.hold_note], [MAT, "مستبعد"],
      "ي٢. فعاد عذرُ المستبعَد حين رُفع الاستبعاد — والتدقيقُ القديم لم يتكرّر لغيره");
    eq((await q(`SELECT count(*)::int AS n FROM prosthetic_work_history
      WHERE work_order_id = ANY($1) AND notes LIKE 'استرجاعُ عذرٍ مُحي%'`, [restoredSet]))[0].n,
      restoredSet.length, "ي٣. ولا سطرَ استرجاعٍ ثانٍ لأمرٍ أُعيد عذرُه قبلُ");
    const [exLine] = await q(`SELECT performed_by, notes FROM prosthetic_work_history
      WHERE work_order_id = $1 AND notes LIKE 'استرجاعُ عذرٍ مُحي%'`, [EXCL]);
    const [exAudit] = await q(`SELECT user_id, user_name FROM audit_log
      WHERE entity_type = 'prosthetic_work_order' AND entity_id = $1
        AND notes LIKE 'استرجاعُ عذرٍ مكتوبٍ مُحي%'`, [EXCL]);
    eq([exLine?.performed_by, exLine?.notes?.endsWith(`نفّذه: ${M_NAME}`), exAudit?.user_id, exAudit?.user_name],
      [M, true, M, M_NAME], "ي٤. والخطُّ الزمني والتدقيقُ يسمّيانه باسمه ورقمه");
    eq(latenessOf(await boardRow(EXCL)), "late_excused", "ي٥. وصار أصفرَ بعذره");
  } finally {
    if (srv) await new Promise((r) => srv.close(() => r(null)));
    const idList = sql.join(ids.map((i) => sql`${i}`), sql`, `);
    const pList = sql.join(patientIds.map((i) => sql`${i}`), sql`, `);
    const uList = sql.join(userIds.map((i) => sql`${i}`), sql`, `);
    await db.execute(sql`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${pList})`);
    await db.execute(sql`DELETE FROM patient_events WHERE patient_id IN (${pList})`);
    await db.execute(sql`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (${idList})`);
    await db.execute(sql`DELETE FROM prosthetic_work_history WHERE work_order_id IN (${idList})`);
    await db.execute(sql`DELETE FROM audit_log WHERE entity_type = 'prosthetic_work_order' AND entity_id IN (${idList})`);
    await db.execute(sql`DELETE FROM prosthetic_work_orders WHERE id IN (${idList})`);
    await db.execute(sql`DELETE FROM patients WHERE id IN (${pList})`);
    await db.execute(sql`DELETE FROM audit_log WHERE user_id IN (${uList})`);
    await db.execute(sql`DELETE FROM system_users WHERE id IN (${uList})`);
    await db.execute(sql`DELETE FROM branches WHERE id IN (${bE}, ${bT})`);
  }

  console.log(`\nنجح ${pass} · فشل ${fail}`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
