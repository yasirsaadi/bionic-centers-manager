// صادر إشعارات المريض — اختبار حيّ على Postgres عبر المسارات الحقيقية.
// قاعدة محلّية: `npm run test:notifications`.
//
// يحرس السلسلة كاملة: حدث تصنيع ⇒ صفٌّ في الصادر ⇒ نصٌّ آمن ⇒ تلغرام.
// وأهمّ ما فيه ثلاثة: **لا تكرار** مهما أُعيد المسار، و**لا تسرّب** لسبب
// رجوعٍ أو توقّفٍ أو خبير، و**لا تراجع** عن عمل التصنيع حين يفشل تلغرام.

import { pool, db } from "../db";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import * as mfg from "../manufacturing/store";
import { storage } from "../storage";
import { createLinkToken, redeemLinkToken, revokeContact, LinkTokenError } from "../patient_contacts/store";
import { enqueueLinkWelcome, currentDeviceSnapshot, redeemAndWelcome } from "./welcome";
import { renderNotification, patientDeviceName, LINK_NOTIFICATION_TYPES } from "./render";
import { dispatchOnce } from "./dispatcher";
import { claimDue, deliveriesForPatient, backoffFor, BACKOFF_MS } from "./outbox";
import { PATIENT_EVENT_TYPES } from "@shared/patient_events";
import { patientNotificationDeliveries as PND, patientEvents } from "@shared/schema";
import { eq } from "drizzle-orm";

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

// بيئة بوت وهمية — التكامل يعمل، والشبكة لا تُلمَس.
process.env.PATIENT_TELEGRAM_BOT_TOKEN = "1234567:TEST-OUTBOX-TOKEN";
process.env.PATIENT_TELEGRAM_BOT_USERNAME = "bionic_outbox_test_bot";
process.env.PATIENT_TELEGRAM_WEBHOOK_SECRET = "outbox-test-secret-0001";

const MARK = "اختبار-صادر-الإشعارات";
const EXPERT = 9901, MANAGER = 9902;

// ── جاسوس تلغرام ──────────────────────────────────────────────────────────
interface Sent { chatId: string; text: string }
let sent: Sent[] = [];
let mode: "ok" | "network" | "api" = "ok";
const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: any, init: any) => {
  if (String(url).startsWith("https://api.telegram.org/")) {
    if (mode === "network") throw new TypeError("fetch failed");
    if (mode === "api") return new Response(JSON.stringify({ ok: false }), { status: 400 });
    const body = JSON.parse(String(init?.body ?? "{}"));
    sent.push({ chatId: String(body.chat_id), text: String(body.text) });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  return realFetch(url, init);
}) as any;

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await pool.query(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await pool.query(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await pool.query(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_link_tokens WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function mkPatient(name: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO patients (name, phone, phone_e164, phone_status, referral_source, age, medical_condition, branch_id, is_amputee)
     VALUES ($1,'07701234567','+9647701234567','ok',$2,'40','amputee',1,true) RETURNING id`, [name, MARK]);
  return rows[0].id;
}

async function mkOrder(patientId: number, purpose = "initial_build", serviceType = "prosthetic"): Promise<any> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type, purpose, status, current_stage, assigned_by)
     VALUES ($1,1,$2,$4,$3,'active','order_received',$2) RETURNING id`, [patientId, EXPERT, purpose, serviceType]);
  await pool.query(
    `INSERT INTO prosthetic_work_history (work_order_id, action_type, from_stage, to_stage, performed_by)
     VALUES ($1,'created','order_received','order_received',$2)`, [rows[0].id, EXPERT]);
  return (await mfg.getRawOrder(rows[0].id))!;
}

/** يربط حساب تلغرام بالمريض عبر المسار الحقيقي (تذكرة ⇒ استهلاك). */
async function linkContact(patientId: number, tgId: string): Promise<number> {
  const t = await createLinkToken({ patientId, channel: "telegram", relation: "self" });
  const r = await redeemLinkToken({ rawToken: t.rawToken, externalId: tgId });
  return r.contact.id;
}

const rowsFor = (list: any[], type: string) => list.filter((d) => d.notificationType === type);
/**
 * `jsonb` لا يحفظ ترتيب المفاتيح — يعيدها مرتَّبةً بطولها ثم بترتيب بايتاتها.
 * فمقارنةٌ نصّية على الحمولة كانت تسقط بمفتاحٍ ثانٍ لا بخطأ. التسوية هنا
 * تحكم على **المحتوى**، ويبقى انفراد المفاتيح محكوماً عليه صراحةً بجواره.
 */
const payloadOf = (p: unknown): Record<string, unknown> =>
  Object.fromEntries(Object.entries((p ?? {}) as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
const texts = () => sent.map((s) => s.text);

async function main() {
  await pool.query(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, role] of [[EXPERT, "prosthetics_expert"], [MANAGER, "branch_manager"]] as any[]) {
    await pool.query(
      `INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
       VALUES ($1,$2,'x','موظّف',$3,1,'[1]'::jsonb,true) ON CONFLICT (id) DO NOTHING`,
      [id, `nt_u${id}`, role]);
  }
  await cleanup();

  try {
    // ══ ١-٦. كل مرحلة تُنتج صفّاً واحداً ═════════════════════════════════
    console.log("\n── المراحل الستّ ──");
    const p1 = await mkPatient("مريض المراحل");
    const c1 = await linkContact(p1, "tg-1001");
    let order = await mkOrder(p1);

    // الإنشاء يُصدر حدثه من مسار الإنشاء؛ هنا نبدأ من أول انتقال.
    const seen: string[] = [];
    for (const stage of ["measurements", "mold", "manufacturing", "ready_for_fitting", "delivered"]) {
      order = await mfg.updateStage({ order, toStage: stage, performedBy: EXPERT });
      seen.push(stage);
    }
    const d1 = await deliveriesForPatient(p1);
    same("٢-٦. خمسة انتقالات ⇒ خمسة صفوف", d1.length, 5);
    same("كلّها معلَّقة وبقناة تلغرام",
      [new Set(d1.map((d) => d.status)).size, new Set(d1.map((d) => d.channel)).size], [1, 1]);
    same("وكلٌّ مربوط بحدثه", d1.filter((d) => d.patientEventId !== null).length, 5);
    same("وكلٌّ لجهة الاتصال نفسها", new Set(d1.map((d) => d.patientContactId)).size, 1);
    // المرحلة **والتصنيف** — ولا ثالث. والتصنيف تمييزُ خيطٍ لا وصفُ جهاز.
    same("وحمولتها المرحلة والتصنيف لا غير",
      [...new Set(d1.map((d) => Object.keys(d.payload as any).sort().join(",")))], ["serviceType,stage"]);
    same("والتصنيف من صفّ الأمر",
      [...new Set(d1.map((d) => (d.payload as any).serviceType))], ["prosthetic"]);
    same("وبأنواعها الثلاثة",
      [...new Set(d1.map((d) => d.notificationType))].sort(),
      ["manufacturing.delivered", "manufacturing.ready_for_delivery", "manufacturing.stage_changed"]);

    // ══ ١. أمر جديد ⇒ order_created ══════════════════════════════════════
    const p2 = await mkPatient("مريض الأمر الجديد");
    const c2 = await linkContact(p2, "tg-1002");
    const created = await mfg.createWorkOrderForExisting({
      patientId: p2, branchId: 1, expertUserId: EXPERT, serviceType: "prosthetic", assignedBy: MANAGER,
    });
    const d2 = await deliveriesForPatient(p2);
    same("١. أمرٌ جديد ⇒ صفّ واحد", d2.length, 1);
    same("نوعه order_created", d2[0].notificationType, PATIENT_EVENT_TYPES.MANUFACTURING_ORDER_CREATED);

    // ══ ٧-٩. موعد التسليم ════════════════════════════════════════════════
    console.log("\n── موعد التسليم ──");
    let o2 = (await mfg.getRawOrder(created.id))!;
    o2 = await mfg.updateDeliveryDate({
      order: o2, expectedDeliveryDate: "2026-09-15", performedBy: EXPERT,
    });
    let dd = rowsFor(await deliveriesForPatient(p2), PATIENT_EVENT_TYPES.MANUFACTURING_DELIVERY_DATE_CHANGED);
    same("٧. أول تحديد للموعد ⇒ حدث وصفّ", dd.length, 1);
    same("بحمولة الموعد والتصنيف", payloadOf(dd[0].payload), { expectedDeliveryDate: "2026-09-15", serviceType: "prosthetic" });

    o2 = await mfg.updateDeliveryDate({
      order: o2, expectedDeliveryDate: "2026-10-01", performedBy: EXPERT,
      reason: "تأخّر وصول المواد من المورّد",
    });
    dd = rowsFor(await deliveriesForPatient(p2), PATIENT_EVENT_TYPES.MANUFACTURING_DELIVERY_DATE_CHANGED);
    same("٨. وتغييره ⇒ صفّ ثانٍ", dd.length, 2);
    // **٩. السبب لا يدخل الحمولة** — وهو إلزامي داخلياً ومحفوظ في السجلّ.
    const ddDump = JSON.stringify(dd.map((d) => d.payload));
    check(!ddDump.includes("المواد") && !ddDump.includes("المورّد"), "٩. والسبب لا يدخل الحمولة", ddDump);
    same("ولا الموعد السابق ولا الفاعل",
      [...new Set(dd.map((d) => Object.keys(d.payload as any).sort().join(",")))], ["expectedDeliveryDate,serviceType"]);
    // ومحفوظ داخلياً فعلاً.
    const { rows: hist } = await pool.query(
      `SELECT notes FROM prosthetic_work_history WHERE work_order_id = $1 AND action_type = 'date_change' ORDER BY id`, [created.id]);
    check(hist.some((h: any) => String(h.notes).includes("المواد")), "لكنه محفوظ في سجلّ الأمر");

    // والالتزام الأول أثناء التقدّم يُصدر حدثه مرّة واحدة.
    const p3 = await mkPatient("مريض الموعد مع التقدّم");
    await linkContact(p3, "tg-1003");
    let o3 = await mkOrder(p3);
    o3 = await mfg.updateStage({ order: o3, toStage: "measurements", performedBy: EXPERT, deliveryDate: "2026-11-20" });
    const dd3 = rowsFor(await deliveriesForPatient(p3), PATIENT_EVENT_TYPES.MANUFACTURING_DELIVERY_DATE_CHANGED);
    same("والالتزام الأول أثناء التقدّم ⇒ حدث موعد واحد", dd3.length, 1);
    same("بموعده", payloadOf(dd3[0].payload), { expectedDeliveryDate: "2026-11-20", serviceType: "prosthetic" });
    // وتقدّمٌ ثانٍ بنفس الموعد لا يُصدر ثانياً (العمود لم يعد فارغاً).
    o3 = await mfg.updateStage({ order: o3, toStage: "mold", performedBy: EXPERT, deliveryDate: "2026-11-20" });
    same("ولا يتكرّر مع التقدّم التالي",
      rowsFor(await deliveriesForPatient(p3), PATIENT_EVENT_TYPES.MANUFACTURING_DELIVERY_DATE_CHANGED).length, 1);

    // ══ ١٠-١٢. ما لا يُرسَل ══════════════════════════════════════════════
    console.log("\n── ما لا يصل المريض ──");
    const p4 = await mkPatient("مريض الحجب");
    await linkContact(p4, "tg-1004");
    let o4 = await mkOrder(p4);
    o4 = await mfg.updateStage({ order: o4, toStage: "measurements", performedBy: EXPERT });
    const beforeHold = (await deliveriesForPatient(p4)).length;

    o4 = await mfg.holdOrder({ order: o4, status: "waiting_materials", reasonCode: "materials", note: "المواد لم تصل", performedBy: EXPERT });
    same("١٠. التوقّف لا يُنشئ صفّاً", (await deliveriesForPatient(p4)).length, beforeHold);
    o4 = await mfg.resumeOrder({ order: o4, performedBy: EXPERT });
    same("١١. والاستئناف كذلك", (await deliveriesForPatient(p4)).length, beforeHold);
    o4 = await mfg.reassignExpert({ order: o4, newExpertUserId: MANAGER, reason: "الخبير في إجازة", performedBy: MANAGER });
    same("١٢. وإسناد خبيرٍ آخر كذلك", (await deliveriesForPatient(p4)).length, beforeHold);

    // ولا أثر لسبب التوقّف في أي صفّ.
    const p4dump = JSON.stringify(await deliveriesForPatient(p4));
    check(!p4dump.includes("المواد") && !p4dump.includes("waiting_materials"),
      "ولا سبب توقّف في أي حمولة", p4dump.slice(0, 200));

    // ══ ١٣. إعادة العمل الفنّي: الوجهة وحدها ═════════════════════════════
    console.log("\n── إعادة العمل الفنّي ──");
    const p5 = await mkPatient("مريض إعادة العمل");
    await linkContact(p5, "tg-1005");
    let o5 = await mkOrder(p5);
    for (const st of ["measurements", "mold", "manufacturing", "ready_for_fitting"]) {
      o5 = await mfg.updateStage({ order: o5, toStage: st, performedBy: EXPERT });
    }
    const beforeRework = (await deliveriesForPatient(p5)).length;
    o5 = await mfg.reworkToStage({
      order: o5, returnToStage: "manufacturing", reasonCode: "fit_issue",
      note: "القياس غير مضبوط ويحتاج إعادة تصنيع", performedBy: EXPERT,
    });
    const d5 = await deliveriesForPatient(p5);
    same("١٣. الرجوع يُنتج صفّاً واحداً", d5.length, beforeRework + 1);
    const back = d5[d5.length - 1];
    same("لوجهته وحدها", payloadOf(back.payload), { serviceType: "prosthetic", stage: "manufacturing" });
    same("وبنوع «تغيّرت المرحلة»", back.notificationType, PATIENT_EVENT_TYPES.MANUFACTURING_STAGE_CHANGED);
    const d5dump = JSON.stringify(d5);
    check(!d5dump.includes("fit_issue") && !d5dump.includes("القياس") && !d5dump.includes("rework"),
      "**ولا سبب الرجوع ولا كلمة «إعادة عمل» في أي صفّ**", d5dump.slice(0, 200));
    // ونصّه يقول موضعه لا قصّته.
    same("ونصّه موضعُه الحالي لا رجوعه",
      renderNotification(back.notificationType, back.payload as any),
      "تم تحديث حالة طرفك الصناعي: التصنيع والتجهيز.");

    // ══ ١٤-١٥. الربط قبل الحدث وبعده ═════════════════════════════════════
    console.log("\n── مَن يستلم ومَن لا ──");
    const p6 = await mkPatient("مريض الربط المتأخّر");
    let o6 = await mkOrder(p6);
    o6 = await mfg.updateStage({ order: o6, toStage: "measurements", performedBy: EXPERT }); // بلا جهة اتصال
    same("١٤. حدثٌ قبل الربط ⇒ لا صفّ", (await deliveriesForPatient(p6)).length, 0);
    const eventsBefore = await db.select().from(patientEvents).where(eq(patientEvents.patientId, p6));
    check(eventsBefore.length >= 1, "مع أن الحدث نفسه كُتب", String(eventsBefore.length));

    const c6 = await linkContact(p6, "tg-1006");
    same("والربط لا يجلب القديم", (await deliveriesForPatient(p6)).length, 0);
    o6 = await mfg.updateStage({ order: o6, toStage: "mold", performedBy: EXPERT });
    const d6 = await deliveriesForPatient(p6);
    same("١٥. والحدث التالي يصله", d6.length, 1);
    same("بالمرحلة الجديدة", payloadOf(d6[0].payload), { serviceType: "prosthetic", stage: "mold" });

    // ══ ٢٢. جهتان نشطتان ⇒ صفّان ═════════════════════════════════════════
    const c6b = await linkContact(p6, "tg-1006-b");
    o6 = await mfg.updateStage({ order: o6, toStage: "manufacturing", performedBy: EXPERT });
    const d6b = (await deliveriesForPatient(p6)).filter((d) => (d.payload as any).stage === "manufacturing");
    same("٢٢. جهتان نشطتان ⇒ صفّان مستقلّان", d6b.length, 2);
    same("لجهتين مختلفتين", new Set(d6b.map((d) => d.patientContactId)).size, 2);
    same("ولحدثٍ واحد", new Set(d6b.map((d) => d.patientEventId)).size, 1);

    // ══ ١٦. المسحوبة تُخطّى ══════════════════════════════════════════════
    console.log("\n── السحب والإرسال ──");
    await revokeContact(c6b);
    sent = []; mode = "ok";
    let sum = await dispatchOnce(100);
    const d6after = await deliveriesForPatient(p6);
    const skipped = d6after.filter((d) => d.status === "skipped");
    check(skipped.length >= 1, "١٦. صفوف الجهة المسحوبة تُخطّى", JSON.stringify(sum));
    check(skipped.every((d) => d.patientContactId === c6b), "وهي وحدها");
    check(!sent.some((s) => s.chatId === "tg-1006-b"), "ولم تُرسَل إليها رسالة");
    check(sent.some((s) => s.chatId === "tg-1006"), "والنشطة استلمت");

    // ══ ١٩. المرسَل لا يُعاد بعد «إعادة التشغيل» ═════════════════════════
    const sentCount = (await deliveriesForPatient(p6)).filter((d) => d.status === "sent").length;
    sent = [];
    await dispatchOnce(100); // دورة ثانية = محاكاة إقلاع جديد
    same("١٩. والمرسَل لا يُعاد في الدورة التالية",
      sent.filter((s) => s.chatId === "tg-1006").length, 0);
    same("وحالته باقية", (await deliveriesForPatient(p6)).filter((d) => d.status === "sent").length, sentCount);

    // ══ ١٧. منع التكرار ══════════════════════════════════════════════════
    const p7 = await mkPatient("مريض التكرار");
    const c7 = await linkContact(p7, "tg-1007");
    let o7 = await mkOrder(p7);
    o7 = await mfg.updateStage({ order: o7, toStage: "measurements", performedBy: EXPERT });
    const ev7 = (await deliveriesForPatient(p7))[0]!;
    let dup = false;
    try {
      await pool.query(
        `INSERT INTO patient_notification_deliveries (patient_id, patient_event_id, patient_contact_id, channel, notification_type)
         VALUES ($1,$2,$3,'telegram','manufacturing.stage_changed')`, [p7, ev7.patientEventId, c7]);
    } catch { dup = true; }
    check(dup, "١٧. والقاعدة نفسها ترفض صفّاً ثانياً لنفس (حدث، جهة)");
    same("فيبقى صفٌّ واحد", (await deliveriesForPatient(p7)).length, 1);

    // ══ ١٨. إعادة المحاولة بعد فشل تلغرام ════════════════════════════════
    console.log("\n── الفشل وإعادة المحاولة ──");
    sent = []; mode = "network";
    sum = await dispatchOnce(100);
    const failed = (await deliveriesForPatient(p7))[0]!;
    same("١٨. الفشل يُسجَّل failed", failed.status, "failed");
    same("والمحاولة تُعدّ", failed.attemptCount, 1);
    check(failed.lastErrorCode === "telegram_network", "برمز آمن", String(failed.lastErrorCode));
    check(failed.nextAttemptAt.getTime() > Date.now() + 30_000, "وموعدها مؤجَّل بدقيقة",
      String(failed.nextAttemptAt));
    check(failed.sentAt === null, "ولم تُختم بإرسال");
    // ولا تُلتقط قبل موعدها.
    same("ولا تُلتقط قبل موعدها", (await claimDue(100)).filter((d) => d.id === failed.id).length, 0);
    // وحين يحين موعدها وتعمل الشبكة تنجح.
    await pool.query(`UPDATE patient_notification_deliveries SET next_attempt_at = NOW() - INTERVAL '1 second' WHERE id = $1`, [failed.id]);
    sent = []; mode = "ok";
    await dispatchOnce(100);
    const recovered = (await deliveriesForPatient(p7))[0]!;
    same("وتنجح عند تعافي الشبكة", recovered.status, "sent");
    check(recovered.sentAt !== null, "وتُختم بوقت الإرسال");
    same("والنصّ وصل", sent.filter((s) => s.chatId === "tg-1007").length, 1);
    // والتباعد متزايد.
    same("والتباعد متزايد كما أُعلن", [backoffFor(1), backoffFor(2), backoffFor(9)],
      [BACKOFF_MS[0], BACKOFF_MS[1], BACKOFF_MS[BACKOFF_MS.length - 1]]);

    // ══ ٢٠-٢١. الحجز والاسترداد ══════════════════════════════════════════
    console.log("\n── الحجز ──");
    const p8 = await mkPatient("مريض الحجز");
    const c8 = await linkContact(p8, "tg-1008");
    let o8 = await mkOrder(p8);
    o8 = await mfg.updateStage({ order: o8, toStage: "measurements", performedBy: EXPERT });
    const target = (await deliveriesForPatient(p8))[0]!;

    // ٢١. عاملان معاً: واحد يحجز والآخر لا يراه.
    const [claimA, claimB] = await Promise.all([claimDue(100), claimDue(100)]);
    const inA = claimA.filter((d) => d.id === target.id).length;
    const inB = claimB.filter((d) => d.id === target.id).length;
    same("٢١. عاملان متزامنان: واحدٌ فقط يحجز الصفّ", inA + inB, 1);

    // و`SKIP LOCKED` تحديداً: عاملٌ يحمل قفل صفٍّ **لا يُعطّل** غيره.
    // بدونها ينتظر الثاني حتى يفرغ الأول — وهو ما يجعل صفّاً عالقاً يوقف
    // الطابور كلّه. نُمسك ذلك بقفلٍ محجوز من اتصالٍ آخر ثم نقيس.
    const p8b = await mkPatient("مريض القفل الحيّ");
    await linkContact(p8b, "tg-1008b");
    let o8b = await mkOrder(p8b);
    o8b = await mfg.updateStage({ order: o8b, toStage: "measurements", performedBy: EXPERT });
    const blocked = (await deliveriesForPatient(p8b))[0]!;
    await pool.query(`UPDATE patient_notification_deliveries SET status='pending', locked_at=NULL WHERE id=$1`, [blocked.id]);

    const holder = await pool.connect();
    try {
      await holder.query("BEGIN");
      await holder.query(`SELECT id FROM patient_notification_deliveries WHERE id = $1 FOR UPDATE`, [blocked.id]);
      // القفل محجوز الآن. `claimDue` يجب أن تعود **فوراً** بلا هذا الصفّ.
      const raced = await Promise.race([
        claimDue(100).then((r) => ({ ok: true, rows: r })),
        new Promise((r) => setTimeout(() => r({ ok: false, rows: [] }), 4000)),
      ]) as { ok: boolean; rows: any[] };
      check(raced.ok, "**والصفّ المقفول لا يُعطّل الطابور** — `claimDue` عادت بلا انتظار");
      same("وبلا الصفّ المحجوز", raced.rows.filter((d: any) => d.id === blocked.id).length, 0);
    } finally {
      await holder.query("ROLLBACK");
      holder.release();
    }

    // ٢٠. المحجوز المنسيّ يُستردّ بعد المهلة.
    same("والمحجوز لا يُلتقط ثانيةً فوراً", (await claimDue(100)).filter((d) => d.id === target.id).length, 0);
    await pool.query(`UPDATE patient_notification_deliveries SET locked_at = NOW() - INTERVAL '10 minutes' WHERE id = $1`, [target.id]);
    same("٢٠. وبعد انقضاء المهلة يُستردّ", (await claimDue(100)).filter((d) => d.id === target.id).length, 1);

    // ══ ٢٣-٢٧. الترحيب واللقطة ═══════════════════════════════════════════
    console.log("\n── الترحيب ولقطة الحالة ──");
    // (أ) بلا أمر تصنيع ⇒ ترحيب وحده.
    const p9 = await mkPatient("مريض بلا أمر");
    const c9 = await linkContact(p9, "tg-1009");
    await enqueueLinkWelcome({ patientId: p9, patientContactId: c9 });
    const d9 = await deliveriesForPatient(p9);
    same("٢٣. الربط بلا أمر ⇒ ترحيب وحده", d9.map((d) => d.notificationType), [LINK_NOTIFICATION_TYPES.WELCOME]);
    check(d9[0].patientEventId === null, "**وبلا حدث مريض مخترَع**");

    // (ب) مع أمر حيّ وموعد ⇒ ترحيب + مرحلة + موعد.
    const p10 = await mkPatient("مريض بأمر حيّ");
    let o10 = await mkOrder(p10);
    o10 = await mfg.updateStage({ order: o10, toStage: "measurements", performedBy: EXPERT });
    o10 = await mfg.updateStage({ order: o10, toStage: "mold", performedBy: EXPERT });
    o10 = await mfg.updateDeliveryDate({ order: o10, expectedDeliveryDate: "2026-12-25", performedBy: EXPERT });
    // الربط **بعد** كل ذلك — فلا شيء من الماضي يصله.
    const c10 = await linkContact(p10, "tg-1010");
    await enqueueLinkWelcome({ patientId: p10, patientContactId: c10 });
    const d10 = await deliveriesForPatient(p10);
    same("٢٤-٢٥. ترحيب + لقطة مرحلة + موعد", d10.map((d) => d.notificationType).sort(),
      [LINK_NOTIFICATION_TYPES.CURRENT_STAGE, LINK_NOTIFICATION_TYPES.DELIVERY_DATE, LINK_NOTIFICATION_TYPES.WELCOME].sort());
    same("٢٧. **ولا صفٌّ واحد من أحداث الماضي**", d10.filter((d) => d.patientEventId !== null).length, 0);
    const snap = await currentDeviceSnapshot(p10);
    same("واللقطة ثلاثة حقول لا غير", Object.keys(snap ?? {}).sort(),
      ["expectedDeliveryDate", "serviceType", "stage"]);
    same("بالمرحلة الحالية", snap?.stage, "mold");

    sent = []; mode = "ok";
    await dispatchOnce(100);
    const w = sent.filter((s) => s.chatId === "tg-1010").map((s) => s.text);
    check(w.some((t) => t === "مرحباً بك في مجموعة مراكز الوارث وبايونك للأطراف الذكية والعلاج الطبيعي. تم ربط حساب Telegram بملفك في نظام المراكز الموحد بنجاح."), "ونصّ الترحيب وصل بحرفه", JSON.stringify(w));
    check(w.some((t) => t === "حالة طرفك الصناعي الحالية: أخذ وتجهيز القالب."), "ولقطة المرحلة باسم الطرف", JSON.stringify(w));
    check(w.some((t) => t === "موعد التسليم المتوقع لطرفك الصناعي: 25/12/2026."), "والموعد بصيغته", JSON.stringify(w));

    // ٢٦. ولا تفصيلة ممنوعة في اللقطة.
    const wDump = JSON.stringify(w) + JSON.stringify(d10.map((d) => d.payload));
    for (const forbidden of ["خبير", "expert", "hold", "توقّف", "rework", "إعادة عمل", "fit_issue", "active", "status", "دينار"]) {
      check(!wDump.includes(forbidden), `٢٦. ولا «${forbidden}» في اللقطة`, wDump.slice(0, 160));
    }

    // ══ ٢٨-٢٩. الفشل لا يتراجع، ولا أسرار ════════════════════════════════
    console.log("\n── الفشل والأسرار ──");
    const p11 = await mkPatient("مريض فشل الإرسال");
    const c11 = await linkContact(p11, "tg-1011");
    let o11 = await mkOrder(p11);
    mode = "network";
    // **التصنيع ينجح رغم أن تلغرام معطَّل**: لا استثناء ولا تراجع.
    let threw: any = null;
    try { o11 = await mfg.updateStage({ order: o11, toStage: "measurements", performedBy: EXPERT }); }
    catch (e) { threw = e; }
    check(threw === null, "٢٨. نقل المرحلة نجح رغم تعطّل تلغرام", String(threw));
    same("والمرحلة تحرّكت فعلاً في القاعدة", (await mfg.getRawOrder(o11.id))!.currentStage, "measurements");
    await dispatchOnce(100);
    const d11 = await deliveriesForPatient(p11);
    same("والرسالة بقيت في الصادر للمحاولة", d11[0].status, "failed");
    same("والجهة ما زالت مربوطة", (await pool.query(
      `SELECT COUNT(*)::int AS n FROM patient_contacts WHERE id = $1 AND revoked_at IS NULL`, [c11])).rows[0].n, 1);

    // ٢٩. لا سرّ في الصادر إطلاقاً.
    mode = "ok";
    const { rows: allRows } = await pool.query(
      `SELECT * FROM patient_notification_deliveries WHERE patient_id IN (SELECT id FROM patients WHERE referral_source = $1)`, [MARK]);
    const outboxDump = JSON.stringify(allRows);
    for (const secret of [process.env.PATIENT_TELEGRAM_BOT_TOKEN!, process.env.PATIENT_TELEGRAM_WEBHOOK_SECRET!, "tg-1001", "tg-1010"]) {
      check(!outboxDump.includes(secret), `٢٩. ولا «${secret.slice(0, 18)}…» في الصادر`);
    }
    check(!/token|secret|external/i.test(Object.keys(allRows[0] ?? {}).join(",")),
      "ولا عمود يحمل سرّاً أو معرّف حساب", Object.keys(allRows[0] ?? {}).join(","));
    // ورموز الأخطاء من قائمة مغلقة.
    const codes = [...new Set(allRows.map((r: any) => r.last_error_code).filter(Boolean))];
    check(codes.every((c: any) => /^(telegram_timeout|telegram_network|telegram_api_error|telegram_disabled|render_failed)$/.test(c)),
      "ورموز الفشل من القائمة المغلقة", JSON.stringify(codes));

    // ══ ٣٠. الصيانة لم تُمَسّ ════════════════════════════════════════════
    console.log("\n── الصيانة ──");
    const p12 = await mkPatient("مريض الصيانة");
    await linkContact(p12, "tg-1012");
    let o12 = await mkOrder(p12, "maintenance");
    o12 = await mfg.updateStage({ order: o12, toStage: "maintenance_repair", performedBy: EXPERT });
    same("٣٠. أمر الصيانة لا يُنشئ صفّ صادر إطلاقاً", (await deliveriesForPatient(p12)).length, 0);

    // ══ اللقطة تشمل الأمر الموقوف — لا `active` وحدها ════════════════════
    // أمر البناء الحيّ قد يكون موقوفاً لانتظار مواد أو لسبب طبّي أو راجعاً
    // لإعادة عمل. والجهاز في كلّها في الورشة وصاحبه ينتظره — فاشتراط
    // `active` كان يحرم أكثر المنتظرين من لقطة حالتهم.
    console.log("\n── لقطة الحالة لكل أمرٍ حيّ ──");
    for (const [status, label] of [
      ["waiting_materials", "انتظار مواد"],
      ["medical_hold", "إيقاف طبّي"],
      ["waiting_patient", "انتظار المريض"],
      ["technical_rework", "إعادة عمل فنّي"],
    ] as [string, string][]) {
      const ph = await mkPatient(`مريض ${label}`);
      const oh = await mkOrder(ph);
      await pool.query(
        `UPDATE prosthetic_work_orders SET status = $1, current_stage = 'manufacturing',
             hold_reason_code = 'materials', hold_note = 'سبب داخلي لا يخرج' WHERE id = $2`,
        [status, oh.id]);
      const snapH = await currentDeviceSnapshot(ph);
      check(snapH !== null, `«${label}» ⇒ للمريض لقطة حالة`, String(snapH));
      same(`و مرحلتها الحالية`, snapH?.stage, "manufacturing");
      same(`وبثلاثة حقول لا غير`, Object.keys(snapH ?? {}).sort(),
        ["expectedDeliveryDate", "serviceType", "stage"]);
      const snapDump = JSON.stringify(snapH);
      check(!snapDump.includes(status) && !snapDump.includes("materials") && !snapDump.includes("سبب"),
        `**ولا حالة ولا سبب توقّف في لقطة «${label}»**`, snapDump);
    }
    // والمنتهي لا لقطة له.
    for (const [status, label] of [["completed", "مكتمل"], ["cancelled", "ملغى"]] as [string, string][]) {
      const pf = await mkPatient(`مريض ${label}`);
      const of_ = await mkOrder(pf);
      await pool.query(`UPDATE prosthetic_work_orders SET status = $1 WHERE id = $2`, [status, of_.id]);
      same(`و«${label}» ⇒ لا لقطة`, await currentDeviceSnapshot(pf), null);
    }

    // ══ الربط ورسائله ذرّيان ═════════════════════════════════════════════
    console.log("\n── الاستهلاك ورسائله: الكلّ أو لا شيء ──");
    const pAtom = await mkPatient("مريض الذرّية");
    let oAtom = await mkOrder(pAtom);
    oAtom = await mfg.updateStage({ order: oAtom, toStage: "measurements", performedBy: EXPERT });
    oAtom = await mfg.updateDeliveryDate({ order: oAtom, expectedDeliveryDate: "2027-01-15", performedBy: EXPERT });
    await pool.query(`UPDATE prosthetic_work_orders SET status = 'waiting_materials' WHERE id = $1`, [oAtom.id]);
    const tAtom = await createLinkToken({ patientId: pAtom, channel: "telegram", relation: "self" });

    // نُجبر فشل الصادر بترِكر يرمي — فشلٌ حقيقي في القاعدة لا محاكاة.
    await pool.query(`
      CREATE OR REPLACE FUNCTION _test_block_pnd() RETURNS trigger AS $fn$
      BEGIN RAISE EXCEPTION 'forced outbox failure'; END; $fn$ LANGUAGE plpgsql;
      CREATE TRIGGER _test_block_pnd BEFORE INSERT ON patient_notification_deliveries
        FOR EACH ROW EXECUTE FUNCTION _test_block_pnd();
    `);
    let atomErr: any = null;
    try { await redeemAndWelcome({ rawToken: tAtom.rawToken, externalId: "tg-atomic" }); }
    catch (e) { atomErr = e; }
    check(atomErr !== null, "٥. فشل الصادر يرمي — ولا يُبتلَع");
    check(!(atomErr instanceof LinkTokenError), "وهو خطأ تقني لا رفض تذكرة");
    // والتراجع كامل: لا جهة، ولا استهلاك، ولا صفّ.
    same("**ولا جهة اتصال جديدة**",
      (await pool.query(`SELECT COUNT(*)::int AS n FROM patient_contacts WHERE patient_id = $1`, [pAtom])).rows[0].n, 0);
    const { rows: tokRow } = await pool.query(
      `SELECT consumed_at, consumed_by_external_id FROM patient_link_tokens WHERE id = $1`, [tAtom.token.id]);
    check(tokRow[0].consumed_at === null, "**والتذكرة غير مستهلَكة**", String(tokRow[0].consumed_at));
    check(tokRow[0].consumed_by_external_id === null, "ولا مَن استهلكها");
    same("ولا صفّ صادر", (await deliveriesForPatient(pAtom)).length, 0);

    // ثم نرفع العائق ونعيد المحاولة — كما يفعل تلغرام بعد 500.
    await pool.query(`DROP TRIGGER _test_block_pnd ON patient_notification_deliveries; DROP FUNCTION _test_block_pnd();`);
    const retry = await redeemAndWelcome({ rawToken: tAtom.rawToken, externalId: "tg-atomic" });
    check(retry.contactId > 0, "٦. وإعادة المحاولة تنجح على التذكرة نفسها");
    same("وجهة اتصال واحدة",
      (await pool.query(`SELECT COUNT(*)::int AS n FROM patient_contacts WHERE patient_id = $1`, [pAtom])).rows[0].n, 1);
    const { rows: tok2 } = await pool.query(
      `SELECT consumed_at FROM patient_link_tokens WHERE id = $1`, [tAtom.token.id]);
    check(tok2[0].consumed_at !== null, "والتذكرة استُهلكت مرّة واحدة");
    const dAtom = await deliveriesForPatient(pAtom);
    same("والرسائل الثلاث استُحقّت", dAtom.map((d) => d.notificationType).sort(),
      [LINK_NOTIFICATION_TYPES.CURRENT_STAGE, LINK_NOTIFICATION_TYPES.DELIVERY_DATE, LINK_NOTIFICATION_TYPES.WELCOME].sort());
    same("ولقطة المرحلة من أمرٍ موقوف",
      (dAtom.find((d) => d.notificationType === LINK_NOTIFICATION_TYPES.CURRENT_STAGE)!.payload as any).stage,
      "measurements");
    same("والموعد", payloadOf(dAtom.find((d) => d.notificationType === LINK_NOTIFICATION_TYPES.DELIVERY_DATE)!.payload),
      { expectedDeliveryDate: "2027-01-15", serviceType: "prosthetic" });

    // ══ ٧. إعادة ربط الجهة نفسها لا تُكرّر رسائل الربط ═══════════════════
    const tAgain = await createLinkToken({ patientId: pAtom, channel: "telegram", relation: "self" });
    await redeemAndWelcome({ rawToken: tAgain.rawToken, externalId: "tg-atomic" });
    const dAgain = await deliveriesForPatient(pAtom);
    same("٧. وربطٌ ثانٍ لنفس الجهة ⇒ لا رسائل ربط مكرَّرة", dAgain.length, 3);
    same("واحدةٌ من كل نوع",
      [...new Set(dAgain.map((d) => d.notificationType))].length, 3);
    // والقاعدة نفسها ترفض التكرار.
    let dupLink = false;
    try {
      await pool.query(
        `INSERT INTO patient_notification_deliveries (patient_id, patient_contact_id, channel, notification_type)
         VALUES ($1,$2,'telegram','link.welcome')`, [pAtom, retry.contactId]);
    } catch { dupLink = true; }
    check(dupLink, "والقاعدة ترفض ترحيباً ثانياً للجهة نفسها");

    // ══ ٨. فشل تلغرام بعد الحفظ لا يتراجع عن شيء ═════════════════════════
    sent = []; mode = "network";
    await dispatchOnce(100);
    const dAfterFail = await deliveriesForPatient(pAtom);
    same("٨. الرسائل بقيت للمحاولة", dAfterFail.filter((d) => d.status === "failed").length, 3);
    same("والجهة ما زالت مربوطة",
      (await pool.query(`SELECT COUNT(*)::int AS n FROM patient_contacts WHERE patient_id = $1 AND revoked_at IS NULL`, [pAtom])).rows[0].n, 1);
    check((await pool.query(`SELECT consumed_at FROM patient_link_tokens WHERE id = $1`, [tAtom.token.id])).rows[0].consumed_at !== null,
      "والتذكرة ما زالت مستهلَكة — لا تراجع");
    mode = "ok";

    // ══ تمييز الطرف الصناعي من المسند الطبي ══════════════════════════════
    // «جهازك» كانت تكفي حين كان المرسَل إليه صنفاً واحداً. ومَن يحمل أمرَين
    // متوازيين — طرفاً ومسنداً — كان يستلم رسالتين متطابقتين حرفياً لا
    // يعرف أيّهما لأيّ. والقيم قيمُ النظام نفسها: `prosthetic` و
    // `medical_support` كما في `service_type` و`case_type`، بلا رمزٍ مخترَع.
    console.log("\n── الطرف الصناعي والمسند الطبي ──");

    // ── (أ) مصفوفة النصوص كاملةً عبر العارض ────────────────────────────
    // خالصة وسريعة، وتثبّت **الحرف** لكل (نوع × مرحلة × تصنيف): نصٌّ يُفحَص
    // بالتضمين ينحرف بتعديلٍ عابر في وسطه ولا يكشفه شيء.
    const T = (type: string, payload: Record<string, unknown>) =>
      renderNotification(type, payload as any);
    const OC = PATIENT_EVENT_TYPES.MANUFACTURING_ORDER_CREATED;
    const ST = PATIENT_EVENT_TYPES.MANUFACTURING_STAGE_CHANGED;
    const RF = PATIENT_EVENT_TYPES.MANUFACTURING_READY_FOR_DELIVERY;
    const DV = PATIENT_EVENT_TYPES.MANUFACTURING_DELIVERED;
    const DD = PATIENT_EVENT_TYPES.MANUFACTURING_DELIVERY_DATE_CHANGED;
    const PRO = "prosthetic", SUP = "medical_support";

    same("المفردة نفسها: أطراف", patientDeviceName(PRO), "طرفك الصناعي");
    same("المفردة نفسها: مساند", patientDeviceName(SUP), "مسندك الطبي");
    same("والمجهول جهازك", patientDeviceName(undefined), "جهازك");
    // `Orthosis` اسمٌ علميّ صحيح لكنه **ليس** قيمةً في هذا النظام: لو تسرّب
    // رمزاً داخلياً لقرأه المريض «جهازك» ولم يعلم أحد أن التصنيف ضاع.
    same("و«orthosis» ليست قيمةً معروفة هنا", patientDeviceName("orthosis"), "جهازك");

    same("١. أطراف: فتح الأمر", T(OC, { stage: "order_received", serviceType: PRO }),
      "تم استلام أمر تصنيع طرفك الصناعي وبدأت إجراءات العمل عليه. سنوافيك بتحديثات مراحل العمل عبر هذه القناة.");
    same("٢. مساند: فتح الأمر", T(OC, { stage: "order_received", serviceType: SUP }),
      "تم استلام أمر تصنيع مسندك الطبي وبدأت إجراءات العمل عليه. سنوافيك بتحديثات مراحل العمل عبر هذه القناة.");
    // المركز مجموعةُ مراكز الوارث وبايونك — فلا يُنسَب أمرٌ إلى أحدهما.
    check(!String(T(OC, { stage: "order_received", serviceType: PRO })).includes("مركز بايونك"),
      "ولا يُسمّى مركزٌ بعينه في فتح الأمر");

    same("٣. أطراف: القياسات", T(ST, { stage: "measurements", serviceType: PRO }),
      "تم تحديث حالة طرفك الصناعي: القياسات والتقييم.");
    same("٤. مساند: القياسات", T(ST, { stage: "measurements", serviceType: SUP }),
      "تم تحديث حالة مسندك الطبي: القياسات والتقييم.");
    same("٥. أطراف: القالب", T(ST, { stage: "mold", serviceType: PRO }),
      "تم تحديث حالة طرفك الصناعي: أخذ وتجهيز القالب.");
    same("٥.ب مساند: القالب (حين يمرّ به)", T(ST, { stage: "mold", serviceType: SUP }),
      "تم تحديث حالة مسندك الطبي: أخذ وتجهيز القالب.");
    same("٦. مساند: التصنيع", T(ST, { stage: "manufacturing", serviceType: SUP }),
      "تم تحديث حالة مسندك الطبي: التصنيع والتجهيز.");
    same("٦.ب أطراف: التصنيع", T(ST, { stage: "manufacturing", serviceType: PRO }),
      "تم تحديث حالة طرفك الصناعي: التصنيع والتجهيز.");
    same("٧. أطراف: جاهز للتجربة", T(RF, { stage: "ready_for_fitting", serviceType: PRO }),
      "أصبح طرفك الصناعي جاهزاً للتجربة والتسليم. يرجى التواصل مع المركز لتنسيق موعدك.");
    same("٨. مساند: جاهز للتجربة", T(RF, { stage: "ready_for_fitting", serviceType: SUP }),
      "أصبح مسندك الطبي جاهزاً للتجربة والتسليم. يرجى التواصل مع المركز لتنسيق موعدك.");
    same("٩. أطراف: التسليم", T(DV, { stage: "delivered", serviceType: PRO }),
      "تم تسجيل تسليم طرفك الصناعي بنجاح. نتمنى لكم دوام الصحة والعافية.");
    same("١٠. مساند: التسليم", T(DV, { stage: "delivered", serviceType: SUP }),
      "تم تسجيل تسليم مسندك الطبي بنجاح. نتمنى لكم دوام الصحة والعافية.");
    same("١١. أطراف: الموعد", T(DD, { expectedDeliveryDate: "2027-03-09", serviceType: PRO }),
      "موعد التسليم المتوقع لطرفك الصناعي: 09/03/2027.");
    same("١٢. مساند: الموعد", T(DD, { expectedDeliveryDate: "2027-03-09", serviceType: SUP }),
      "موعد التسليم المتوقع لمسندك الطبي: 09/03/2027.");
    same("١٣. الربط/المرحلة: أطراف", T(LINK_NOTIFICATION_TYPES.CURRENT_STAGE, { stage: "manufacturing", serviceType: PRO }),
      "حالة طرفك الصناعي الحالية: التصنيع والتجهيز.");
    same("١٤. الربط/المرحلة: مساند", T(LINK_NOTIFICATION_TYPES.CURRENT_STAGE, { stage: "manufacturing", serviceType: SUP }),
      "حالة مسندك الطبي الحالية: التصنيع والتجهيز.");
    same("١٥. الربط/الموعد: أطراف", T(LINK_NOTIFICATION_TYPES.DELIVERY_DATE, { expectedDeliveryDate: "2027-05-01", serviceType: PRO }),
      "موعد التسليم المتوقع لطرفك الصناعي: 01/05/2027.");
    same("١٦. الربط/الموعد: مساند", T(LINK_NOTIFICATION_TYPES.DELIVERY_DATE, { expectedDeliveryDate: "2027-05-01", serviceType: SUP }),
      "موعد التسليم المتوقع لمسندك الطبي: 01/05/2027.");

    // ١٧. **الحمولة القديمة** — صفوفٌ أُنشئت قبل اليوم لا تحمل التصنيف.
    // فترجع إلى النصّ الآمن، و**لا تُرجِع `null`**: العائد `null` يعني عند
    // العامل `render_failed` ⇒ `skipped`، فتُفقَد رسالةٌ صحيحة لأنها أقلّ
    // تحديداً فقط. وهذا أسوأ من «جهازك» بما لا يُقاس.
    same("١٧. قديمة بلا تصنيف: فتح الأمر", T(OC, { stage: "order_received" }),
      "تم استلام أمر تصنيع جهازك وبدأت إجراءات العمل عليه. سنوافيك بتحديثات مراحل العمل عبر هذه القناة.");
    same("وقديمة: مرحلة", T(ST, { stage: "mold" }), "تم تحديث حالة جهازك: أخذ وتجهيز القالب.");
    same("وقديمة: جاهز للتجربة", T(RF, { stage: "ready_for_fitting" }),
      "أصبح جهازك جاهزاً للتجربة والتسليم. يرجى التواصل مع المركز لتنسيق موعدك.");
    same("وقديمة: تسليم", T(DV, { stage: "delivered" }), "تم تسجيل تسليم جهازك بنجاح. نتمنى لكم دوام الصحة والعافية.");
    same("وقديمة: موعد", T(DD, { expectedDeliveryDate: "2026-02-01" }), "موعد التسليم المتوقع لجهازك: 01/02/2026.");
    same("وقديمة: لقطة الربط", T(LINK_NOTIFICATION_TYPES.CURRENT_STAGE, { stage: "measurements" }),
      "حالة جهازك الحالية: القياسات والتقييم.");
    // وتصنيفٌ مجهولٌ تماماً يسلك مسلك الغائب لا مسلك الخطأ.
    check(T(ST, { stage: "mold", serviceType: "something_new" }) !== null,
      "وتصنيفٌ لا يُعرَف لا يُبطل الرسالة");

    // ── (ب) مسارٌ حيّ لكلّ صنف ─────────────────────────────────────────
    // المصفوفة أعلاه تثبت العارض. وهذا يثبت أن التصنيف **يصل** إليه من صفّ
    // الأمر عبر المسار الحقيقي — وهو الوصل الذي ينكسر بصمت لو نُسي.
    const pSup = await mkPatient("مريض المسند الطبي");
    await linkContact(pSup, "tg-support-1");
    let oSup = await mkOrder(pSup, "initial_build", SUP);
    // مسار المساند المعروف: يتخطّى القالب. والتعديل نصوصٌ فقط — المراحل
    // كما هي، والقفزة تبقى مشروعة ولا تُنتج حدث قالب.
    for (const st of ["measurements", "manufacturing", "ready_for_fitting", "delivered"]) {
      // الموعد يُلتزَم به عند بلوغ التصنيع — كما في المسار الحقيقي تماماً.
      oSup = await mfg.updateStage({
        order: oSup, toStage: st, performedBy: EXPERT,
        deliveryDate: st === "manufacturing" ? "2027-04-10" : undefined,
      });
    }
    const dSup = await deliveriesForPatient(pSup);
    same("والمسند: التصنيف على كل صفوفه",
      [...new Set(dSup.map((d) => (d.payload as any).serviceType))], [SUP]);
    same("ولا صفّ بمرحلة القالب — المراحل لم تتغيّر",
      dSup.filter((d) => (d.payload as any).stage === "mold").length, 0);

    sent = []; mode = "ok";
    await dispatchOnce(100);
    const sup = sent.filter((s) => s.chatId === "tg-support-1").map((s) => s.text);
    check(sup.includes("تم تحديث حالة مسندك الطبي: القياسات والتقييم."), "ووصلت باسم المسند: القياسات", JSON.stringify(sup));
    check(sup.includes("تم تحديث حالة مسندك الطبي: التصنيع والتجهيز."), "والتصنيع", JSON.stringify(sup));
    check(sup.includes("أصبح مسندك الطبي جاهزاً للتجربة والتسليم. يرجى التواصل مع المركز لتنسيق موعدك."), "وجاهز للتجربة", JSON.stringify(sup));
    check(sup.includes("تم تسجيل تسليم مسندك الطبي بنجاح. نتمنى لكم دوام الصحة والعافية."), "والتسليم", JSON.stringify(sup));
    check(sup.includes("موعد التسليم المتوقع لمسندك الطبي: 10/04/2027."), "والموعد", JSON.stringify(sup));
    check(!sup.some((t) => t.includes("طرفك الصناعي")), "**ولا كلمة «طرفك الصناعي» لمريض مسند**", JSON.stringify(sup));

    // والأطراف حيّاً كذلك — عبر مسار الإنشاء الحقيقي لا الحقن.
    const pPro = await mkPatient("مريض الطرف الصناعي");
    await linkContact(pPro, "tg-prosthetic-1");
    const proOrder = await mfg.createWorkOrderForExisting({
      patientId: pPro, branchId: 1, expertUserId: EXPERT, serviceType: PRO, assignedBy: MANAGER,
    });
    sent = [];
    await dispatchOnce(100);
    const pro = sent.filter((s) => s.chatId === "tg-prosthetic-1").map((s) => s.text);
    check(pro.includes("تم استلام أمر تصنيع طرفك الصناعي وبدأت إجراءات العمل عليه. سنوافيك بتحديثات مراحل العمل عبر هذه القناة."),
      "والأطراف حيّاً: فتح الأمر باسم الطرف", JSON.stringify(pro));
    check(!pro.some((t) => t.includes("مسندك الطبي")), "ولا كلمة «مسندك الطبي» لمريض أطراف", JSON.stringify(pro));

    // ١٩. **ولا تفصيلة جهاز في أي صفّ صادر** — التصنيف العام وحده.
    const svcRows = [...dSup, ...(await deliveriesForPatient(pPro))];
    same("١٩. مفاتيح الصادر من قائمة مغلقة",
      [...new Set(svcRows.map((d) => Object.keys(d.payload as any).sort().join(",")))].sort(),
      ["expectedDeliveryDate,serviceType", "serviceType,stage"]);
    const svcDump = JSON.stringify(svcRows.map((d) => d.payload));
    for (const forbidden of [
      "supportType", "prostheticType", "amputationSite", "diagnosis",
      "injury", "socket", "expertUserId", "cost",
    ]) {
      check(!svcDump.includes(forbidden), `ولا «${forbidden}» في الصادر`, svcDump.slice(0, 160));
    }

    // ١٧.ب والقديمة **تُرسَل فعلاً** لا تُخطّى — الحرف الأهمّ في الاحتياط.
    await pool.query(
      `INSERT INTO patient_notification_deliveries (patient_id, patient_contact_id, channel, notification_type, payload)
       SELECT $1, id, 'telegram', 'manufacturing.stage_changed', '{"stage":"manufacturing"}'::jsonb
         FROM patient_contacts WHERE patient_id = $1 AND revoked_at IS NULL LIMIT 1`, [pPro]);
    sent = [];
    await dispatchOnce(100);
    const legacy = sent.filter((s) => s.chatId === "tg-prosthetic-1").map((s) => s.text);
    check(legacy.includes("تم تحديث حالة جهازك: التصنيع والتجهيز."),
      "١٧.ب صفٌّ قديم بلا تصنيف يُرسَل بـ«جهازك»", JSON.stringify(legacy));
    same("ولم يُخطَّ بـrender_failed",
      (await deliveriesForPatient(pPro)).filter((d) => d.lastErrorCode === "render_failed").length, 0);

    // ١٨. **وعقد `patient_events` لم يتغيّر**: مفتاحٌ واحد يطابق نوعه، ولا
    // `serviceType` فيه إطلاقاً. التمييز يعيش حيث يُستهلَك لا في السجلّ.
    const svcEvents = await db.select().from(patientEvents).where(eq(patientEvents.patientId, pSup));
    check(svcEvents.length >= 4, "للمسند أحداثه في السجلّ", String(svcEvents.length));
    const evKeys = [...new Set(svcEvents.map((e) => Object.keys((e.payload ?? {}) as object).sort().join(",")))].sort();
    same("١٨. حمولة الحدث مفتاحٌ واحد كما كانت", evKeys, ["expectedDeliveryDate", "stage"]);
    check(!JSON.stringify(svcEvents.map((e) => e.payload)).includes("serviceType"),
      "**ولا `serviceType` في سجلّ أحداث المريض**");

    // ٢٠. **والصيانة لم تُمَسّ**: خارج نطاق الأحداث كلّها كما كانت.
    const pMnt = await mkPatient("مريض الصيانة");
    await linkContact(pMnt, "tg-maint-1");
    const mnt = await mfg.createWorkOrderForExisting({
      patientId: pMnt, branchId: 1, expertUserId: EXPERT, serviceType: PRO,
      purpose: "maintenance", assignedBy: MANAGER,
    });
    await mfg.updateStage({
      order: (await mfg.getRawOrder(mnt.id))!, toStage: "maintenance_cast_done", performedBy: EXPERT,
    });
    same("٢٠. الصيانة: لا صفّ صادر", (await deliveriesForPatient(pMnt)).length, 0);
    same("ولا حدث مريض", (await db.select().from(patientEvents).where(eq(patientEvents.patientId, pMnt))).length, 0);

    // ══ الحذف والدمج — القاعدة الملزمة في CLAUDE.md ══════════════════════
    // أي جدول جديد بمفتاح إلى `patients` يجب أن يدخل كاسكيد الحذف **ويُختبَر
    // بحذف مريض كامل يحمل صفوفاً فيه**. والصادر يشير إلى ثلاثة جداول معاً،
    // فترتيبه في الكاسكيد يقرّر نجاح الحذف كلّه.
    console.log("\n── الحذف والدمج ──");
    const pDel = await mkPatient("مريض الحذف");
    const cDel = await linkContact(pDel, "tg-del-1");
    let oDel = await mkOrder(pDel);
    oDel = await mfg.updateStage({ order: oDel, toStage: "measurements", performedBy: EXPERT });
    await enqueueLinkWelcome({ patientId: pDel, patientContactId: cDel });
    check((await deliveriesForPatient(pDel)).length >= 2, "للمريض صفوف صادر قبل الحذف");

    let delErr: any = null;
    try { await storage.deletePatient(pDel); } catch (e) { delErr = e; }
    check(delErr === null, "**حذف المريض نجح بلا خطأ مفتاح أجنبي**", String(delErr));
    same("ولا صفّ صادر يتيم",
      (await pool.query(`SELECT COUNT(*)::int AS n FROM patient_notification_deliveries WHERE patient_id = $1`, [pDel])).rows[0].n, 0);
    same("والمريض حُذف",
      (await pool.query(`SELECT COUNT(*)::int AS n FROM patients WHERE id = $1`, [pDel])).rows[0].n, 0);

    // والدمج ينقل الصادر مع المريض.
    const src = await mkPatient("ملفّ مكرّر");
    const dst = await mkPatient("الملفّ الأصلي");
    const cSrc = await linkContact(src, "tg-merge-1");
    let oSrc = await mkOrder(src);
    oSrc = await mfg.updateStage({ order: oSrc, toStage: "measurements", performedBy: EXPERT });
    const beforeMerge = (await deliveriesForPatient(src)).length;
    check(beforeMerge >= 1, "وللمصدر صفوف صادر قبل الدمج");
    let mergeErr: any = null;
    try { await storage.mergePatients(src, dst); } catch (e) { mergeErr = e; }
    check(mergeErr === null, "والدمج نجح", String(mergeErr));
    same("والصادر انتقل إلى الهدف", (await deliveriesForPatient(dst)).length, beforeMerge);
    same("ولا صفّ بقي على المصدر", (await deliveriesForPatient(src)).length, 0);

    // ══ العزل المعماري ═══════════════════════════════════════════════════
    console.log("\n── العزل ──");
    const evStore = readFileSync(join(import.meta.dirname, "..", "events", "store.ts"), "utf8");
    check(!/patient_notifications|patientNotificationDeliveries|telegram/i.test(evStore),
      "سجلّ الأحداث لا يعرف الصادر ولا تلغرام");
    const ourFiles = readdirSync(import.meta.dirname).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    const infra = ["outbox.ts", "render.ts"];
    for (const f of infra) {
      const src = readFileSync(join(import.meta.dirname, f), "utf8");
      check(!/manufacturing\/store|from "\.\.\/manufacturing/.test(src),
        `و«${f}» لا يستورد التصنيع`);
    }
    const tg = readFileSync(join(import.meta.dirname, "..", "patient_telegram", "client.ts"), "utf8");
    check(!/manufacturing/i.test(tg), "ووحدة تلغرام لا تعرف التصنيع");
    check(ourFiles.length >= 4, `وحدة الإشعارات ${ourFiles.length} ملفّات`, ourFiles.join(", "));
  } finally {
    globalThis.fetch = realFetch;
  }

  await cleanup();
  await pool.query(`DELETE FROM system_users WHERE id IN ($1,$2)`, [EXPERT, MANAGER]);
  console.log(failures === 0 ? "\n✅ all notification-outbox cases pass" : `\n❌ ${failures} case(s) failed`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { globalThis.fetch = realFetch; await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
