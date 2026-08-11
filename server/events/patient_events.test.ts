// سجل أحداث المريض — اختبار حيّ على Postgres.
// يحتاج قاعدة محلية: `npm run test:patient-events`.
//
// يغطّي ما لا يمكن إثباته إلا على قاعدة حقيقية: الختم (ترِكر يرفض التعديل)،
// ومنع التكرار (فهرس فريد جزئي)، وسلوك الدمج والحذف مع المفاتيح الأجنبية،
// واتّساق الزمنين. أما منع الاستدعاء خارج معاملة فيُثبته المصرِّف نفسه في
// `type_guard.check.ts`.

import { pool, db } from "../db";
import { recordPatientEvent, listPatientEvents } from "./store";
import { storage } from "../storage";
import { patientEvents, patients } from "@shared/schema";
import { PATIENT_EVENT_TYPES, eventDedupeKey } from "@shared/patient_events";
import { and, eq, sql } from "drizzle-orm";

// Safety: this test writes and deletes patient rows. Local test DB only.
const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database (must contain 'test' or a local host).");
  process.exit(1);
}

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function eq_(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg, `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const MARK = "اختبار-سجل-الأحداث";

async function mkPatient(name: string): Promise<number> {
  const p = await storage.createPatient({
    name, phone: "07701234567", referralSource: MARK,
    age: "30", medicalCondition: "physiotherapy", branchId: 1,
  } as any);
  return p.id;
}

async function cleanup() {
  // جدول الاختبار المصنوع لإفشال الدمج: يُسقَط أولاً لأن مفتاحه إلى
  // `patients` يمنع حذف صفوف الاختبار لو تعطّل تشغيل سابق في منتصفه.
  await pool.query(`DROP TABLE IF EXISTS _merge_block_test`);
  await pool.query(
    `DELETE FROM patient_events WHERE patient_id IN (SELECT id FROM patients WHERE referral_source = $1)`, [MARK]);
  await pool.query(
    `DELETE FROM cost_entries WHERE patient_id IN (SELECT id FROM patients WHERE referral_source = $1)`, [MARK]);
  await pool.query(
    `DELETE FROM patient_cases WHERE patient_id IN (SELECT id FROM patients WHERE referral_source = $1)`, [MARK]);
  await pool.query(`DELETE FROM patients WHERE referral_source = $1`, [MARK]);
}

async function main() {
  // شرط مسبق: نصف ما يلي يختبر الختم، وقاعدةٌ لم يُطبَّق عليها ترحيل 044
  // كاملاً ستُظهر أربعة فشل غامضة بدل سبب واحد واضح. يُقال هنا صراحةً.
  const { rows: trig } = await pool.query(
    `SELECT 1 FROM information_schema.triggers
      WHERE event_object_table = 'patient_events' AND trigger_name = 'trg_patient_events_sealed'`,
  );
  if (trig.length === 0) {
    console.error(
      "❌ الترِكر trg_patient_events_sealed غير موجود — شغّل ترحيلات المشروع على قاعدة الاختبار أولاً.\n" +
      "   (drizzle-kit push ينشئ الجدول لكنه لا ينشئ الترِكر: هو من migration 044.)",
    );
    process.exit(1);
  }

  await pool.query(`INSERT INTO branches (id, name) VALUES (1, 'بغداد') ON CONFLICT (id) DO NOTHING`);
  await cleanup();

  // ── ١. إنشاء حدث ─────────────────────────────────────────────────────
  console.log("\n── إنشاء حدث ──");
  const p1 = await mkPatient("مريض الأحداث");
  const created = await db.transaction((tx) =>
    recordPatientEvent(tx, {
      patientId: p1,
      eventType: PATIENT_EVENT_TYPES.PATIENT_REGISTERED,
      branchId: 1,
      caseType: "physiotherapy",
      sourceType: "patient",
      sourceId: p1,
      payload: { name: "مريض الأحداث", note: "أول حدث" },
      actorUserId: 7, actorName: "ريام",
    }),
  );
  check(created.inserted && created.id !== null, "الحدث كُتب وأُرجع معرّفه");

  const [row] = await db.select().from(patientEvents).where(eq(patientEvents.id, created.id!));
  eq_("النوع", row.eventType, "patient.registered");
  eq_("الوجهة مشتقّة من السجل", row.visibility, "internal");
  eq_("الحمولة محفوظة كما هي", row.payload, { name: "مريض الأحداث", note: "أول حدث" });
  eq_("اسم الفاعل لقطة", row.actorName, "ريام");
  eq_("الفرع والحالة والمصدر", [row.branchId, row.caseType, row.sourceType, row.sourceId], [1, "physiotherapy", "patient", p1]);
  check(typeof row.id === "number" && row.id > 0, "المعرّف رقم كبير صالح", `got ${typeof row.id}: ${row.id}`);

  // نوع غير معلَن يُرفض عند الكتابة لا بعد سنة.
  let rejected = false;
  try {
    await db.transaction((tx) => recordPatientEvent(tx, { patientId: p1, eventType: "لا.يوجد" as any }));
  } catch { rejected = true; }
  check(rejected, "نوع حدث خارج السجل يُرفض");

  // ── ٢. لا يُعدَّل بعد إنشائه ─────────────────────────────────────────
  console.log("\n── الختم: إلحاق فقط ──");
  let sealed = false;
  let sealMsg = "";
  try {
    await pool.query(`UPDATE patient_events SET payload = '{"tampered":true}'::jsonb WHERE id = $1`, [created.id]);
  } catch (e: any) { sealed = true; sealMsg = String(e?.message ?? ""); }
  check(sealed, "التعديل المباشر مرفوض", sealMsg);
  check(/append-only/i.test(sealMsg), "والرسالة تشرح السبب", sealMsg);

  const [afterTamper] = await db.select().from(patientEvents).where(eq(patientEvents.id, created.id!));
  eq_("والحمولة لم تتغيّر", afterTamper.payload, { name: "مريض الأحداث", note: "أول حدث" });

  // الباب المراقَب يعمل — وهو مخرج الطوارئ الوحيد.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL app.allow_event_edit = 'on'");
    await client.query(`UPDATE patient_events SET actor_name = 'تصحيح إداري' WHERE id = $1`, [created.id]);
    await client.query("COMMIT");
    check(true, "والباب المراقَب داخل معاملة ينجح");
  } catch (e: any) {
    await client.query("ROLLBACK");
    check(false, "والباب المراقَب داخل معاملة ينجح", String(e?.message));
  } finally { client.release(); }

  // والباب لا يبقى مفتوحاً بعد المعاملة.
  let stillSealed = false;
  try {
    await pool.query(`UPDATE patient_events SET actor_name = 'x' WHERE id = $1`, [created.id]);
  } catch { stillSealed = true; }
  check(stillSealed, "والختم يعود فور انتهاء المعاملة");

  // الحذف غير محروس — وإلا انكسر حذف المريض للجميع.
  const throwaway = await db.transaction((tx) =>
    recordPatientEvent(tx, { patientId: p1, eventType: PATIENT_EVENT_TYPES.PATIENT_UPDATED }));
  await pool.query(`DELETE FROM patient_events WHERE id = $1`, [throwaway.id]);
  check(true, "والحذف المباشر مسموح (الكاسكيد يحتاجه)");

  // ── ٢.ب سياسة الوجهة ─────────────────────────────────────────────────
  console.log("\n── سياسة الوجهة: internal_only لا يصير patient أبداً ──");
  async function tryVisibility(type: any, vis: any): Promise<string | null> {
    try {
      await db.transaction((tx) => recordPatientEvent(tx, { patientId: p1, eventType: type, visibility: vis }));
      return null;
    } catch (e: any) { return String(e?.message ?? e); }
  }
  async function storedVisibility(type: any, vis?: any): Promise<string> {
    const r = await db.transaction((tx) =>
      recordPatientEvent(tx, { patientId: p1, eventType: type, ...(vis ? { visibility: vis } : {}) }));
    const [row] = await db.select().from(patientEvents).where(eq(patientEvents.id, r.id!));
    return row.visibility;
  }

  for (const clinical of [
    PATIENT_EVENT_TYPES.EXAM_SIGNED,
    PATIENT_EVENT_TYPES.VISIT_RECORDED,
    PATIENT_EVENT_TYPES.PRESCRIPTION_APPLIED,
  ]) {
    const err = await tryVisibility(clinical, "patient");
    check(err !== null, `${clinical} لا يمكن جعله patient`);
    check(/internal_only/.test(err ?? ""), `  والرسالة تسمّي السياسة`, err ?? "");
    const count = await db.select({ n: sql<number>`count(*)::int` }).from(patientEvents)
      .where(and(eq(patientEvents.patientId, p1), eq(patientEvents.eventType, clinical), eq(patientEvents.visibility, "patient")));
    eq_(`  ولا صفّ patient كُتب لـ${clinical}`, count[0].n, 0);
  }
  eq_("والسريري يبقى internal افتراضاً", await storedVisibility(PATIENT_EVENT_TYPES.EXAM_AMENDED), "internal");

  console.log("\n── internal_default_patient_allowed: الاختيار للمنتج ──");
  eq_(
    "manufacturing.stage_changed يبقى internal افتراضاً",
    await storedVisibility(PATIENT_EVENT_TYPES.MANUFACTURING_STAGE_CHANGED),
    "internal",
  );
  eq_(
    "ويمكن أن يصير patient حين يطلب المنتج ذلك",
    await storedVisibility(PATIENT_EVENT_TYPES.MANUFACTURING_STAGE_CHANGED, "patient"),
    "patient",
  );

  console.log("\n── patient_default ──");
  eq_("ready_for_delivery موجَّه للمريض افتراضاً", await storedVisibility(PATIENT_EVENT_TYPES.MANUFACTURING_READY_FOR_DELIVERY), "patient");
  eq_("payment.received كذلك", await storedVisibility(PATIENT_EVENT_TYPES.PAYMENT_RECEIVED), "patient");
  eq_("والتضييق إلى internal مسموح دائماً", await storedVisibility(PATIENT_EVENT_TYPES.MANUFACTURING_DELIVERED, "internal"), "internal");

  // قيد القاعدة: آخر خطّ دفاع لو تسلّلت قيمة ثالثة من خارج التطبيق.
  let checkViolated = false;
  try {
    await pool.query(
      `INSERT INTO patient_events (patient_id, event_type, visibility) VALUES ($1, 'patient.updated', 'everyone')`, [p1]);
  } catch (e: any) { checkViolated = /visibility_check/.test(String(e?.message ?? "")); }
  check(checkViolated, "وقيد القاعدة يرفض أي قيمة ثالثة للوجهة");

  // ── ٣. منع التكرار ───────────────────────────────────────────────────
  console.log("\n── منع التكرار عبر dedupe_key ──");
  const key = eventDedupeKey("wo", 8412, "stage:ready_for_delivery");
  const first = await db.transaction((tx) =>
    recordPatientEvent(tx, { patientId: p1, eventType: PATIENT_EVENT_TYPES.MANUFACTURING_READY_FOR_DELIVERY, dedupeKey: key }));
  const second = await db.transaction((tx) =>
    recordPatientEvent(tx, { patientId: p1, eventType: PATIENT_EVENT_TYPES.MANUFACTURING_READY_FOR_DELIVERY, dedupeKey: key }));
  check(first.inserted, "الأول كُتب");
  check(!second.inserted && second.id === null, "والثاني رُفض بلا استثناء", `got ${JSON.stringify(second)}`);
  check(second.id === null, "ولم يُرجع معرّفاً");

  const dupCount = await db.select({ n: sql<number>`count(*)::int` }).from(patientEvents)
    .where(and(eq(patientEvents.patientId, p1), eq(patientEvents.dedupeKey, key)));
  eq_("وصفّ واحد في القاعدة", dupCount[0].n, 1);

  // النطاق لكل مريض: المفتاح نفسه على مريض آخر مسموح.
  const p2 = await mkPatient("مريض آخر");
  const otherPatient = await db.transaction((tx) =>
    recordPatientEvent(tx, { patientId: p2, eventType: PATIENT_EVENT_TYPES.MANUFACTURING_READY_FOR_DELIVERY, dedupeKey: key }));
  check(otherPatient.inserted, "والمفتاح نفسه على مريض آخر مسموح (النطاق لكل مريض)");

  // بلا مفتاح ⇒ بلا منع.
  const noKeyA = await db.transaction((tx) => recordPatientEvent(tx, { patientId: p1, eventType: PATIENT_EVENT_TYPES.VISIT_RECORDED }));
  const noKeyB = await db.transaction((tx) => recordPatientEvent(tx, { patientId: p1, eventType: PATIENT_EVENT_TYPES.VISIT_RECORDED }));
  check(noKeyA.inserted && noKeyB.inserted, "وحدثان بلا مفتاح يمرّان (المنع اختياري)");

  // ── ٤. سلامة الزمنين ─────────────────────────────────────────────────
  console.log("\n── occurred_at و created_at ──");
  const past = new Date("2026-01-15T09:30:00.000Z");
  const back = await db.transaction((tx) =>
    recordPatientEvent(tx, {
      patientId: p1, eventType: PATIENT_EVENT_TYPES.PATIENT_REGISTERED,
      occurredAt: past, dedupeKey: eventDedupeKey("backdated", p1),
    }));
  const [backRow] = await db.select().from(patientEvents).where(eq(patientEvents.id, back.id!));
  eq_("الزمن التجاري محفوظ كما مُرِّر", backRow.occurredAt?.toISOString(), past.toISOString());
  const drift = Math.abs(Date.now() - (backRow.createdAt?.getTime() ?? 0));
  check(drift < 60_000, "وزمن الصفّ هو الآن لا التاريخ الرجعي", `drift=${drift}ms`);
  check(
    (backRow.createdAt?.getTime() ?? 0) > (backRow.occurredAt?.getTime() ?? 0),
    "فالزمنان مستقلّان فعلاً",
  );

  // العميل لا يستطيع تزوير زمن الصفّ.
  const forged = await db.transaction((tx) =>
    recordPatientEvent(tx, { patientId: p1, eventType: PATIENT_EVENT_TYPES.PATIENT_UPDATED, createdAt: past } as any));
  const [forgedRow] = await db.select().from(patientEvents).where(eq(patientEvents.id, forged.id!));
  check(
    Math.abs(Date.now() - (forgedRow.createdAt?.getTime() ?? 0)) < 60_000,
    "و created_at لا يقبل قيمة من المستدعي",
    `got ${forgedRow.createdAt?.toISOString()}`,
  );

  // الترتيب الزمني في القراءة.
  const timeline = await listPatientEvents(p1);
  check(timeline.length >= 5, `الجدول الزمني يُقرأ (${timeline.length} حدثاً)`);
  const ordered = timeline.every((e, i) =>
    i === 0 || (timeline[i - 1].occurredAt?.getTime() ?? 0) >= (e.occurredAt?.getTime() ?? 0));
  check(ordered, "ومرتّب بالأحدث أولاً");

  // ── ٥. الدمج ─────────────────────────────────────────────────────────
  console.log("\n── دمج مريضين لهما أحداث ──");
  const src = await mkPatient("ملف مصدر");
  const tgt = await mkPatient("ملف هدف");
  const sharedKey = eventDedupeKey("case", "prosthetic", "opened");

  // مفتاح مشترك بين الملفين — التصادم الحقيقي الذي يجعل إعادة توجيه
  // patient_id وحدها غير كافية.
  await db.transaction((tx) => recordPatientEvent(tx, {
    patientId: src, eventType: PATIENT_EVENT_TYPES.PATIENT_CASE_ADDED,
    dedupeKey: sharedKey, payload: { from: "source" },
  }));
  await db.transaction((tx) => recordPatientEvent(tx, {
    patientId: tgt, eventType: PATIENT_EVENT_TYPES.PATIENT_CASE_ADDED,
    dedupeKey: sharedKey, payload: { from: "target" },
  }));
  // ومفتاح خاصّ بالمصدر وحده — يجب أن ينجو بمفتاحه.
  const soleKey = eventDedupeKey("visit", 991);
  await db.transaction((tx) => recordPatientEvent(tx, {
    patientId: src, eventType: PATIENT_EVENT_TYPES.VISIT_RECORDED,
    dedupeKey: soleKey, payload: { from: "source-only" },
  }));

  await storage.mergePatients(src, tgt);

  const moved = await db.select().from(patientEvents).where(eq(patientEvents.patientId, tgt));
  check(moved.length === 3, `الأحداث الثلاثة كلها على الهدف (${moved.length})`);
  const srcLeft = await db.select({ n: sql<number>`count(*)::int` }).from(patientEvents).where(eq(patientEvents.patientId, src));
  eq_("ولا حدث بقي على المصدر", srcLeft[0].n, 0);

  const withShared = moved.filter((e) => e.dedupeKey === sharedKey);
  eq_("والمفتاح المتصادم بقي على صفّ واحد", withShared.length, 1);
  eq_("وهو صفّ الهدف الأصلي", (withShared[0].payload as any)?.from, "target");

  const neutralized = moved.find((e) => (e.payload as any)?.from === "source");
  check(!!neutralized, "وصفّ المصدر المتصادم لم يُحذف — نجا كاملاً");
  eq_("ومفتاحه وحده أُفرغ", neutralized?.dedupeKey, null);

  const sole = moved.find((e) => (e.payload as any)?.from === "source-only");
  eq_("والمفتاح غير المتصادم نجا كما هو", sole?.dedupeKey, soleKey);

  const srcGone = await db.select().from(patients).where(eq(patients.id, src));
  eq_("وصفّ المريض المصدر حُذف (الدمج اكتمل)", srcGone.length, 0);

  // والختم عاد بعد الدمج — الباب لا يتسرّب خارج معاملته.
  let sealedAfterMerge = false;
  try {
    await pool.query(`UPDATE patient_events SET actor_name = 'x' WHERE patient_id = $1`, [tgt]);
  } catch { sealedAfterMerge = true; }
  check(sealedAfterMerge, "والختم عاد بعد انتهاء الدمج");

  // ── ٥.ب الباب لا يتسرّب إلى المعاملة التالية على نفس الاتصال ─────────
  // `SET LOCAL` محدود بالمعاملة، لكن الاعتماد على ذلك بلا إثبات خطر: لو
  // كان `SET` عادياً بدل `SET LOCAL` لبقي الباب مفتوحاً على هذا الاتصال
  // المجمَّع، فتصير كل كتابة لاحقة تمرّ عليه قابلةً لتعديل الأحداث بصمت.
  console.log("\n── الباب لا يتسرّب على نفس الاتصال ──");
  {
    const c = await pool.connect();
    try {
      const [victim] = await db.select().from(patientEvents).where(eq(patientEvents.patientId, tgt)).limit(1);
      // معاملة تفتح الباب ثم تفشل.
      await c.query("BEGIN");
      await c.query("SET LOCAL app.allow_event_edit = 'on'");
      await c.query(`UPDATE patient_events SET actor_name = 'داخل المعاملة' WHERE id = $1`, [victim.id]);
      try { await c.query("SELECT 1/0"); } catch { /* الفشل مقصود */ }
      await c.query("ROLLBACK");

      const [afterRollback] = await db.select().from(patientEvents).where(eq(patientEvents.id, victim.id));
      check(afterRollback.actorName !== "داخل المعاملة", "التعديل تراجع كاملاً مع المعاملة الفاشلة",
        `actor_name=${afterRollback.actorName}`);

      // **نفس الاتصال** بعدها مباشرة: الباب يجب أن يكون مغلقاً.
      let sealedSameConn = false;
      try {
        await c.query(`UPDATE patient_events SET actor_name = 'بعد التراجع' WHERE id = $1`, [victim.id]);
      } catch { sealedSameConn = true; }
      check(sealedSameConn, "والباب مغلق في المعاملة التالية على نفس الاتصال");

      // وحتى بعد معاملة ناجحة فتحت الباب.
      await c.query("BEGIN");
      await c.query("SET LOCAL app.allow_event_edit = 'on'");
      await c.query(`UPDATE patient_events SET actor_name = 'مسموح' WHERE id = $1`, [victim.id]);
      await c.query("COMMIT");
      let sealedAfterCommit = false;
      try {
        await c.query(`UPDATE patient_events SET actor_name = 'ممنوع' WHERE id = $1`, [victim.id]);
      } catch { sealedAfterCommit = true; }
      check(sealedAfterCommit, "ومغلق كذلك بعد معاملة ناجحة فتحته");
    } finally { c.release(); }
  }

  // ── ٥.ج فشل الدمج يتراجع كاملاً ──────────────────────────────────────
  // الفشل يُصنَع بجدول خارجي يحمل مفتاحاً إلى المريض المصدر، فيسقط
  // `DELETE FROM patients` في آخر المعاملة — بعد أن تكون خطوة الأحداث قد
  // نُفِّذت. مصنوع هنا لا مستعار من علّة قائمة، فيبقى حتمياً.
  console.log("\n── فشل الدمج يتراجع كاملاً ──");
  {
    const s2 = await mkPatient("مصدر يفشل");
    const t2 = await mkPatient("هدف يفشل");
    await db.transaction((tx) => recordPatientEvent(tx, {
      patientId: s2, eventType: PATIENT_EVENT_TYPES.VISIT_RECORDED, dedupeKey: eventDedupeKey("rollback", 1),
    }));
    await pool.query(`CREATE TABLE IF NOT EXISTS _merge_block_test (id serial primary key, patient_id integer references patients(id))`);
    await pool.query(`INSERT INTO _merge_block_test (patient_id) VALUES ($1)`, [s2]);

    let mergeFailed = false;
    try { await storage.mergePatients(s2, t2); } catch { mergeFailed = true; }
    check(mergeFailed, "الدمج فشل كما هو مصمَّم للاختبار");

    const stillOnSource = await db.select({ n: sql<number>`count(*)::int` }).from(patientEvents).where(eq(patientEvents.patientId, s2));
    eq_("والحدث بقي على المصدر — لا نقل جزئي", stillOnSource[0].n, 1);
    const onTarget = await db.select({ n: sql<number>`count(*)::int` }).from(patientEvents).where(eq(patientEvents.patientId, t2));
    eq_("ولا شيء وصل الهدف", onTarget[0].n, 0);
    const srcAlive = await db.select({ n: sql<number>`count(*)::int` }).from(patients).where(eq(patients.id, s2));
    eq_("وصفّ المريض المصدر ما زال قائماً", srcAlive[0].n, 1);

    let sealedAfterFailure = false;
    try { await pool.query(`UPDATE patient_events SET actor_name = 'x' WHERE patient_id = $1`, [s2]); }
    catch { sealedAfterFailure = true; }
    check(sealedAfterFailure, "والختم سليم بعد الفشل");

    await pool.query(`DROP TABLE IF EXISTS _merge_block_test`);
  }

  // ── ٦. حذف مريض له أحداث ─────────────────────────────────────────────
  console.log("\n── حذف مريض له أحداث ──");
  const doomed = await mkPatient("مريض للحذف");
  for (let i = 0; i < 3; i++) {
    await db.transaction((tx) => recordPatientEvent(tx, {
      patientId: doomed, eventType: PATIENT_EVENT_TYPES.VISIT_RECORDED,
      dedupeKey: eventDedupeKey("visit", 5000 + i),
    }));
  }
  const before = await db.select({ n: sql<number>`count(*)::int` }).from(patientEvents).where(eq(patientEvents.patientId, doomed));
  eq_("للمريض ثلاثة أحداث قبل الحذف", before[0].n, 3);

  let deleteErr = "";
  try { await storage.deletePatient(doomed); } catch (e: any) { deleteErr = String(e?.message ?? e); }
  check(deleteErr === "", "حذف المريض نجح بلا خطأ مفاتيح", deleteErr);

  const gonePatient = await db.select().from(patients).where(eq(patients.id, doomed));
  eq_("صفّ المريض اختفى", gonePatient.length, 0);
  const goneEvents = await db.select({ n: sql<number>`count(*)::int` }).from(patientEvents).where(eq(patientEvents.patientId, doomed));
  eq_("وأحداثه معه", goneEvents[0].n, 0);

  await cleanup();
  console.log(failures === 0 ? "\n✅ all patient-events cases pass" : `\n❌ ${failures} case(s) failed`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
