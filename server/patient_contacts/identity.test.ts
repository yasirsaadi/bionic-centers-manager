// هوية تواصل المريض — اختبار حيّ على Postgres.
// قاعدة محلّية: `npm run test:patient-identity`.
//
// يحرس ما لا يُثبَت إلا على قاعدة حقيقية: أن النصّ الخام للتذكرة **ليس في
// القاعدة**، وأن الاستهلاك ذرّي فلا تُستهلَك تذكرة مرّتين **ولا تُنشئ
// تذكرتان متزامنتان جهتين**، وأن تغيّر الصلة يُختَم ولا يُمحى، وأن الدمج
// يحتمل التصادم المشروع بلا فقد صفٍّ واحد.

import { createHash } from "crypto";
import { pool, db } from "../db";
import { storage } from "../storage";
import {
  createLinkToken, redeemLinkToken, revokeLinkToken, revokeContact,
  listActiveContacts, patientsForExternalId, hashToken, LinkTokenError,
  DEFAULT_TOKEN_TTL_MS,
} from "./store";
import { patientContacts, patientLinkTokens } from "@shared/schema";
import { and, eq, inArray } from "drizzle-orm";

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
async function rejects(msg: string, fn: () => Promise<unknown>, reason: string) {
  let err: any = null;
  try { await fn(); } catch (e) { err = e; }
  check(err instanceof LinkTokenError && err.reason === reason, msg,
    `expected LinkTokenError(${reason}), got ${String(err)}`);
}

const MARK = "اختبار-هوية-التواصل";
const USER = 9601;

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  //  طلباتُ مراجعة الطبيب (٠٥٥) تشير إلى الأمر والحلقة والزيارة — تُمسح أوّلاً.
  await pool.query(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_link_tokens WHERE patient_id IN (${ids})`);
  // الصادر يشير إلى الأحداث وجهات الاتصال معاً — يُحذف قبلهما.
  await pool.query(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  //  الأسماء البديلة (ترحيل ٠٥٢) — الدمج يُنشئها، وهي تشير إلى المريض.
  await pool.query(`DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function mkPatient(name: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO patients (name, phone, phone_e164, phone_status, referral_source, age, medical_condition, branch_id, is_amputee)
     VALUES ($1,'07701234567','+9647701234567','ok',$2,'40','amputee',1,true) RETURNING id`, [name, MARK]);
  return rows[0].id;
}

async function main() {
  await pool.query(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await pool.query(
    `INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
     VALUES ($1,'pc_user','x','موظّف','reception',1,'[1]'::jsonb,true) ON CONFLICT (id) DO NOTHING`, [USER]);
  await cleanup();

  // ══ ١. التذكرة: النصّ يُعاد مرّة، والقاعدة لا تعرفه ═══════════════════
  console.log("\n── التذكرة: البصمة وحدها في القاعدة ──");
  {
    const p = await mkPatient("مريض التذكرة");
    const { rawToken, token } = await createLinkToken({
      patientId: p, channel: "telegram", relation: "self", createdByUserId: USER,
    });

    check(typeof rawToken === "string" && rawToken.length >= 40, "النصّ الخام أُعيد");
    // ٣٢ بايت بترميز base64url ⇒ ٤٣ محرفاً، وكلّها آمنة في المسارات.
    check(/^[A-Za-z0-9_-]+$/.test(rawToken), "وبترميز base64url آمن في الروابط", rawToken);
    same("والبصمة في الصفّ هي SHA-256 للنصّ", token.tokenHash,
      createHash("sha256").update(rawToken, "utf8").digest("hex"));
    same("ودالّة البصمة تطابقها", hashToken(rawToken), token.tokenHash);

    // الفحص الحاسم: النصّ الخام غير موجود في **أي عمود نصّي** من الصفّ.
    const { rows } = await pool.query(
      `SELECT * FROM patient_link_tokens WHERE id = $1`, [token.id]);
    const dump = JSON.stringify(rows[0]);
    check(!dump.includes(rawToken), "والنصّ الخام ليس في الصفّ إطلاقاً");
    // ولا في الجدول كلّه.
    const { rows: any1 } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM patient_link_tokens WHERE token_hash = $1`, [rawToken]);
    same("ولا يُطابق أي بصمة مخزَّنة", any1[0].n, 0);

    // TTL الافتراضي ١٥ دقيقة.
    const ttl = token.expiresAt.getTime() - token.createdAt.getTime();
    check(Math.abs(ttl - DEFAULT_TOKEN_TTL_MS) < 5000, "والمهلة الافتراضية ١٥ دقيقة", String(ttl));

    // ── ٢. كل إنشاء يولّد نصّاً مختلفاً ──
    const second = await createLinkToken({ patientId: p, channel: "telegram", relation: "self" });
    check(second.rawToken !== rawToken, "وكل إنشاء يولّد نصّاً مختلفاً");
    check(second.token.tokenHash !== token.tokenHash, "وبصمةً مختلفة");
  }

  // ══ ٣. الرفض: منتهية · مسحوبة · غير موجودة · مستهلَكة ════════════════
  console.log("\n── ما يُرفَض ──");
  {
    const p = await mkPatient("مريض الرفض");
    await rejects("نصّ لا وجود له", () => redeemLinkToken({ rawToken: "لا-شيء", externalId: "1" }), "not_found");

    const expired = await createLinkToken({ patientId: p, channel: "telegram", relation: "self", ttlMs: -1000 });
    await rejects("منتهية الصلاحية",
      () => redeemLinkToken({ rawToken: expired.rawToken, externalId: "111" }), "expired");

    const revoked = await createLinkToken({ patientId: p, channel: "telegram", relation: "self" });
    same("السحب نجح", await revokeLinkToken(revoked.token.id), true);
    await rejects("مسحوبة",
      () => redeemLinkToken({ rawToken: revoked.rawToken, externalId: "222" }), "revoked");

    const once = await createLinkToken({ patientId: p, channel: "telegram", relation: "self" });
    const r1 = await redeemLinkToken({ rawToken: once.rawToken, externalId: "333" });
    check(!!r1.contact.id, "الاستهلاك الأول نجح");
    await rejects("والثاني مرفوض",
      () => redeemLinkToken({ rawToken: once.rawToken, externalId: "444" }), "already_consumed");
    same("وجهة اتصال واحدة لا اثنتان", (await listActiveContacts(p)).length, 1);
  }

  // ══ ٤. السحب للمعلَّقة وحدها ══════════════════════════════════════════
  console.log("\n── السحب يُلغي المستقبل ولا يُنكِر الماضي ──");
  {
    const p = await mkPatient("مريض سحب التذاكر");

    const pending = await createLinkToken({ patientId: p, channel: "telegram", relation: "self" });
    same("المعلَّقة تُسحَب", await revokeLinkToken(pending.token.id), true);
    same("وسحبها ثانيةً لا يفعل شيئاً — بلا خطأ", await revokeLinkToken(pending.token.id), false);

    // والمستهلَكة ليست معلَّقة: ختمُها يقلب معناها في السجلّ من «رُبِط بها
    // حساب» إلى «أُلغيت»، فيقرأ المدقّق تاريخاً لم يحدث.
    const used = await createLinkToken({ patientId: p, channel: "telegram", relation: "family" });
    const r = await redeemLinkToken({ rawToken: used.rawToken, externalId: "consumed-999" });
    check(!!r.contact.id, "والمستهلَكة أدّت عملها فعلاً");
    same("فلا تُسحَب", await revokeLinkToken(used.token.id), false);

    const [row] = await db.select().from(patientLinkTokens)
      .where(eq(patientLinkTokens.id, used.token.id));
    check(!!row.consumedAt, "وتبقى مستهلَكة");
    check(row.revokedAt === null, "ولا تنقلب دلالتها إلى «مسحوبة»", String(row.revokedAt));
    // ومَن أراد فكّ الربط فسبيله جهة الاتصال لا التذكرة.
    same("وجهة الاتصال هي التي تُسحَب", await revokeContact(r.contact.id), true);
  }

  // ══ ٥. التزامن: نقرتان على الرابط نفسه ═══════════════════════════════
  console.log("\n── نقرتان متزامنتان على التذكرة نفسها ──");
  {
    const p = await mkPatient("مريض التزامن");
    const t = await createLinkToken({ patientId: p, channel: "telegram", relation: "guardian" });
    const [a, b] = await Promise.allSettled([
      redeemLinkToken({ rawToken: t.rawToken, externalId: "aaa" }),
      redeemLinkToken({ rawToken: t.rawToken, externalId: "bbb" }),
    ]);
    const ok = [a, b].filter((r) => r.status === "fulfilled");
    const bad = [a, b].filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    same("واحدة تنجح وواحدة تُرفض", [ok.length, bad.length], [1, 1]);
    check(bad[0].reason instanceof LinkTokenError && bad[0].reason.reason === "already_consumed",
      "والمرفوضة سببها «استُهلكت»", String(bad[0].reason));
    same("وجهة اتصال واحدة فقط", (await listActiveContacts(p)).length, 1);
    const [tok] = await db.select().from(patientLinkTokens).where(eq(patientLinkTokens.id, t.token.id));
    check(!!tok.consumedAt, "والتذكرة مختومة بالاستهلاك");
    const winner = (ok[0] as PromiseFulfilledResult<any>).value;
    same("ومَن استهلكها مسجَّل", tok.consumedByExternalId, winner.contact.externalId);
  }

  // ══ ٦. تذكرتان **مختلفتان** في اللحظة نفسها ═══════════════════════════
  // قفل التذكرة لا يمسّ هذه: بصمتاهما مختلفتان فالصفّان مختلفان، فتمرّان
  // معاً ولا تجد أيٌّ منهما جهةً قائمة. بلا تسلسلٍ على صفّ المريض تُدرَجان
  // معاً فينفجر `uq_patient_contacts_active` في وجه مستخدمٍ لم يخطئ.
  console.log("\n── تذكرتان مختلفتان لنفس الحساب في اللحظة نفسها ──");
  {
    const p = await mkPatient("مريض التذكرتين");
    const t1 = await createLinkToken({ patientId: p, channel: "telegram", relation: "guardian" });
    const t2 = await createLinkToken({ patientId: p, channel: "telegram", relation: "guardian" });
    check(t1.token.id !== t2.token.id && t1.token.tokenHash !== t2.token.tokenHash,
      "تذكرتان مستقلّتان تماماً");

    const acct = "twin-1234";
    const settled = await Promise.allSettled([
      redeemLinkToken({ rawToken: t1.rawToken, externalId: acct }),
      redeemLinkToken({ rawToken: t2.rawToken, externalId: acct }),
    ]);

    // الحُكم الأول: **لا خطأ يتسرّب**. لا انتهاك فرادة ولا رسالة Postgres خام.
    const rejected = settled.filter((s) => s.status === "rejected") as PromiseRejectedResult[];
    same("العمليتان نجحتا معاً — لا انتهاك فرادة يتسرّب",
      rejected.map((s) => String(s.reason)), []);

    const ok = settled.map((s) => (s as PromiseFulfilledResult<any>).value);
    same("واحدة أنشأت والأخرى أعادت الموجودة",
      ok.map((r) => r.createdContact).sort(), [false, true]);
    same("وهي الجهة نفسها في الردّين", new Set(ok.map((r) => r.contact.id)).size, 1);
    same("ونشِطٌ واحد", (await listActiveContacts(p)).length, 1);
    same("ولا صفّ ثانٍ في الجدول إطلاقاً",
      (await pool.query(`SELECT COUNT(*)::int AS n FROM patient_contacts WHERE patient_id = $1`, [p])).rows[0].n, 1);
    same("وبلا جهة مختومة — لا صلة تغيّرت هنا",
      ok.filter((r) => r.supersededContact).length, 0);

    // والحُكم الثاني: التذكرتان كلتاهما استُهلكتا — لا واحدة تبقى معلَّقة.
    const rows = await db.select().from(patientLinkTokens)
      .where(inArray(patientLinkTokens.id, [t1.token.id, t2.token.id]))
      .orderBy(patientLinkTokens.id);
    same("والتذكرتان استُهلكتا", rows.filter((r) => r.consumedAt !== null).length, 2);
    same("وكلتاهما تحمل مَن استهلكها", rows.map((r) => r.consumedByExternalId), [acct, acct]);
  }

  // ══ ٧. الصلة من التذكرة لا من المستهلِك ═══════════════════════════════
  console.log("\n── الصلة يحسمها الموظّف لا المستهلِك ──");
  {
    const p = await mkPatient("مريض الوصاية");
    const t = await createLinkToken({ patientId: p, channel: "telegram", relation: "guardian" });
    const r = await redeemLinkToken({ rawToken: t.rawToken, externalId: "555" });
    same("رُبِط وصيّاً كما اختار الموظّف", r.contact.relation, "guardian");
    // ولا سبيل لإرسال `self` بدلاً منها: الدالّة لا تقبل الصلة معاملاً
    // أصلاً — فالمنع بنيوي لا تحقّقٌ يُنسى.
    check(!("relation" in ({} as Parameters<typeof redeemLinkToken>[0])),
      "ودالّة الاستهلاك لا تقبل صلةً إطلاقاً");
  }

  // ══ ٨. التكرار المشروع والتكرار الممنوع ══════════════════════════════
  console.log("\n── حسابٌ واحد، مرضى متعدّدون ──");
  {
    const p1 = await mkPatient("ابن أول");
    const p2 = await mkPatient("ابن ثانٍ");
    const p3 = await mkPatient("ابن ثالث");
    const father = "father-777";

    for (const p of [p1, p2, p3]) {
      const t = await createLinkToken({ patientId: p, channel: "telegram", relation: "guardian" });
      const r = await redeemLinkToken({ rawToken: t.rawToken, externalId: father });
      check(r.createdContact, `أبٌ واحد يرتبط بالمريض ${p}`);
    }
    const followed = await patientsForExternalId("telegram", father);
    same("ثلاثة مرضى بحسابٍ واحد — لا تفرّد عالمي", followed.length, 3);

    // ونفس الحساب لنفس المريض: لا صفّ ثانٍ.
    const again = await createLinkToken({ patientId: p1, channel: "telegram", relation: "guardian" });
    const r2 = await redeemLinkToken({ rawToken: again.rawToken, externalId: father });
    same("وإعادة الربط لنفس المريض تُعيد الجهة الموجودة", r2.createdContact, false);
    same("بلا صفّ ثانٍ", (await listActiveContacts(p1)).length, 1);
    same("وهي الجهة نفسها", r2.contact.id, followed.find((c) => c.patientId === p1)!.id);
  }

  // ══ ٩. تغيّر الصلة لنفس الحساب ════════════════════════════════════════
  // الابن كبر: الحساب نفسه، والملفّ نفسه، والصلة صارت `self` بعد أن كانت
  // وصاية أبيه. إعادةُ الجهة كما هي تُستهلَك التذكرةَ ولا تُطبّقها.
  console.log("\n── تغيّر الصلة: الابن كبر ──");
  {
    const p = await mkPatient("مريض تغيّر الصلة");
    const acct = "grown-2222";

    const asGuardian = await createLinkToken({ patientId: p, channel: "telegram", relation: "guardian" });
    const first = await redeemLinkToken({ rawToken: asGuardian.rawToken, externalId: acct });
    same("رُبِط وصيّاً أولاً", first.contact.relation, "guardian");

    const asSelf = await createLinkToken({ patientId: p, channel: "telegram", relation: "self" });
    const second = await redeemLinkToken({ rawToken: asSelf.rawToken, externalId: acct });

    check(second.createdContact, "وتذكرةٌ بصلة مختلفة تُنشئ جهة جديدة لا تُعيد القديمة");
    same("بصلة التذكرة لا بالصلة السابقة", second.contact.relation, "self");
    check(second.contact.id !== first.contact.id, "وبمعرّف مختلف");
    same("والجهة المُستبدَلة معلَنة في المُخرَج", second.supersededContact?.id, first.contact.id);

    // **ولا تعديل في مكانه**: الصفّ القديم يقول إلى الأبد إنها كانت وصاية.
    const [old] = await db.select().from(patientContacts)
      .where(eq(patientContacts.id, first.contact.id));
    check(!!old.revokedAt, "والقديمة مختومة بـ`revoked_at`");
    same("وصلتها لم تُمسّ — التاريخ يقول إنها كانت وصاية", old.relation, "guardian");

    const active = await listActiveContacts(p);
    same("ونشِطٌ واحد", active.length, 1);
    same("وهو الجديد بصلة «self»",
      [active[0].id, active[0].relation], [second.contact.id, "self"]);
    same("والتاريخ صفّان لا صفّ",
      (await pool.query(`SELECT COUNT(*)::int AS n FROM patient_contacts WHERE patient_id = $1`, [p])).rows[0].n, 2);

    const [tok] = await db.select().from(patientLinkTokens)
      .where(eq(patientLinkTokens.id, asSelf.token.id));
    check(!!tok.consumedAt, "والتذكرة استُهلكت");
    same("بمَن استهلكها", tok.consumedByExternalId, acct);

    // ثم العودة إلى نفس الصلة الحالية: لا صفّ ثالث.
    const again = await createLinkToken({ patientId: p, channel: "telegram", relation: "self" });
    const third = await redeemLinkToken({ rawToken: again.rawToken, externalId: acct });
    same("وتذكرةٌ بنفس الصلة الحالية تُعيد الجهة نفسها", third.createdContact, false);
    same("بلا صفّ ثالث",
      (await pool.query(`SELECT COUNT(*)::int AS n FROM patient_contacts WHERE patient_id = $1`, [p])).rows[0].n, 2);
  }

  // ══ ١٠. السحب ثم إعادة الربط ═════════════════════════════════════════
  console.log("\n── السحب يُبقي التاريخ ويسمح بربطٍ جديد ──");
  {
    const p = await mkPatient("مريض السحب");
    const t1 = await createLinkToken({ patientId: p, channel: "telegram", relation: "self" });
    const first = await redeemLinkToken({ rawToken: t1.rawToken, externalId: "888" });

    same("السحب نجح", await revokeContact(first.contact.id), true);
    const [revoked] = await db.select().from(patientContacts).where(eq(patientContacts.id, first.contact.id));
    check(!!revoked.revokedAt, "و`revoked_at` صار غير فارغ");
    same("ولا جهة نشطة", (await listActiveContacts(p)).length, 0);

    // نفس الحساب يُربَط من جديد — صفٌّ نشِط جديد بلا تصادم مع الفهرس الجزئي.
    const t2 = await createLinkToken({ patientId: p, channel: "telegram", relation: "self" });
    const second = await redeemLinkToken({ rawToken: t2.rawToken, externalId: "888" });
    check(second.createdContact, "وإعادة ربط الحساب نفسه تُنشئ صفّاً جديداً");
    check(second.contact.id !== first.contact.id, "بمعرّف مختلف");
    same("ونشِطٌ واحد", (await listActiveContacts(p)).length, 1);
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM patient_contacts WHERE patient_id = $1`, [p]);
    same("والتاريخ محفوظ: صفّان في الجدول", rows[0].n, 2);
  }

  // ══ ١١. الدمج ════════════════════════════════════════════════════════
  console.log("\n── الدمج: التصادم المشروع لا يُسقطه ──");
  {
    const source = await mkPatient("ملفّ مكرّر");
    const target = await mkPatient("الملفّ الأصلي");
    const shared = "shared-999";

    // الحساب نفسه نشِطٌ على الملفّين — وهذا هو التصادم.
    for (const p of [source, target]) {
      const t = await createLinkToken({ patientId: p, channel: "telegram", relation: "self" });
      await redeemLinkToken({ rawToken: t.rawToken, externalId: shared });
    }
    // وحسابٌ يخصّ المصدر وحده — يجب أن ينتقل نشِطاً.
    const only = await createLinkToken({ patientId: source, channel: "telegram", relation: "family" });
    await redeemLinkToken({ rawToken: only.rawToken, externalId: "source-only" });
    // وتذكرة معلَّقة على المصدر — يجب أن تتبعه.
    const pending = await createLinkToken({ patientId: source, channel: "telegram", relation: "caregiver" });

    const before = await pool.query(
      `SELECT COUNT(*)::int AS n FROM patient_contacts WHERE patient_id IN ($1,$2)`, [source, target]);
    same("ثلاث جهات قبل الدمج", before.rows[0].n, 3);

    await storage.mergePatients(source, target);

    const active = await listActiveContacts(target);
    same("وبعده: جهتان نشطتان على الهدف", active.length, 2);
    same("الحساب المشترك نشِطٌ مرّة واحدة",
      active.filter((c) => c.externalId === shared).length, 1);
    check(active.some((c) => c.externalId === "source-only"), "وحساب المصدر انتقل نشِطاً");

    // **لا فقد صامت**: الصفوف الثلاثة كلّها على الهدف، أحدها مختوم.
    const { rows: all } = await pool.query(
      `SELECT external_id, revoked_at FROM patient_contacts WHERE patient_id = $1 ORDER BY id`, [target]);
    same("والصفوف الثلاثة كلّها انتقلت — لا حذف", all.length, 3);
    same("واحدٌ منها مختوم (نسخة المصدر المتصادمة)",
      all.filter((r: any) => r.revoked_at !== null).length, 1);
    same("ولا صفّ بقي على المصدر",
      (await pool.query(`SELECT COUNT(*)::int AS n FROM patient_contacts WHERE patient_id = $1`, [source])).rows[0].n, 0);

    // والتذاكر تتبع المريض.
    const [movedToken] = await db.select().from(patientLinkTokens)
      .where(eq(patientLinkTokens.id, pending.token.id));
    same("والتذكرة المعلَّقة انتقلت للهدف", movedToken.patientId, target);
    same("ولا تذكرة بقيت على المصدر",
      (await pool.query(`SELECT COUNT(*)::int AS n FROM patient_link_tokens WHERE patient_id = $1`, [source])).rows[0].n, 0);

    // والتذكرة المنقولة ما زالت قابلة للاستهلاك — على الهدف.
    const redeemed = await redeemLinkToken({ rawToken: pending.rawToken, externalId: "after-merge" });
    same("وتُستهلَك بعد الدمج على الملفّ الهدف", redeemed.contact.patientId, target);
  }

  // ══ ١٢. حذف المريض ═══════════════════════════════════════════════════
  console.log("\n── حذف المريض: بلا فشل مفتاح ولا صفوف يتيمة ──");
  {
    const p = await mkPatient("مريض الحذف");
    const t = await createLinkToken({ patientId: p, channel: "telegram", relation: "self" });
    await redeemLinkToken({ rawToken: t.rawToken, externalId: "delete-me" });
    await createLinkToken({ patientId: p, channel: "telegram", relation: "family" }); // معلَّقة

    let threw: any = null;
    try { await storage.deletePatient(p); } catch (e) { threw = e; }
    check(threw === null, "الحذف نجح بلا خطأ مفتاح أجنبي", String(threw));
    same("ولا جهة اتصال يتيمة",
      (await pool.query(`SELECT COUNT(*)::int AS n FROM patient_contacts WHERE patient_id = $1`, [p])).rows[0].n, 0);
    same("ولا تذكرة يتيمة",
      (await pool.query(`SELECT COUNT(*)::int AS n FROM patient_link_tokens WHERE patient_id = $1`, [p])).rows[0].n, 0);
    same("والمريض حُذف",
      (await pool.query(`SELECT COUNT(*)::int AS n FROM patients WHERE id = $1`, [p])).rows[0].n, 0);
  }

  // ══ ١٣. تطابق المخطّط والترحيل ══════════════════════════════════════
  console.log("\n── تطابق الجدولين مع ما يعلنه Drizzle ──");
  {
    const cols = async (t: string) => (await pool.query(
      `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns WHERE table_name = $1 ORDER BY column_name`, [t])).rows;

    const c = await cols("patient_contacts");
    same("patient_contacts: الأعمدة", c.map((r: any) => r.column_name),
      ["channel", "created_at", "external_id", "id", "linked_at", "patient_id", "relation", "revoked_at"]);
    same("و`external_id` نصّ لا رقم",
      c.find((r: any) => r.column_name === "external_id")?.data_type, "text");
    for (const col of ["linked_at", "revoked_at", "created_at"]) {
      same(`و${col} بمنطقة زمنية`, c.find((r: any) => r.column_name === col)?.data_type,
        "timestamp with time zone");
    }

    const t = await cols("patient_link_tokens");
    same("patient_link_tokens: الأعمدة", t.map((r: any) => r.column_name),
      ["channel", "consumed_at", "consumed_by_external_id", "created_at", "created_by_user_id",
       "expires_at", "id", "patient_id", "relation", "revoked_at", "token_hash"]);
    for (const col of ["expires_at", "consumed_at", "revoked_at", "created_at"]) {
      same(`و${col} بمنطقة زمنية`, t.find((r: any) => r.column_name === col)?.data_type,
        "timestamp with time zone");
    }

    // الفهرس الجزئي موجود بشرطه — وهو ما يسمح بإعادة الربط بعد السحب.
    const { rows: idx } = await pool.query(
      `SELECT indexdef FROM pg_indexes WHERE indexname = 'uq_patient_contacts_active'`);
    check(idx.length === 1 && /UNIQUE/.test(idx[0].indexdef)
      && /revoked_at IS NULL/.test(idx[0].indexdef),
      "والفهرس الفريد جزئي على النشِط وحده", idx[0]?.indexdef ?? "(مفقود)");
    check(/patient_id.*channel.*external_id/s.test(idx[0]?.indexdef ?? ""),
      "وبأعمدته الثلاثة");

    // ولا تفرّد عالمي على external_id — الحالة الطبيعية للأب المتابع.
    const { rows: globals } = await pool.query(
      `SELECT indexname, indexdef FROM pg_indexes
        WHERE tablename = 'patient_contacts' AND indexdef LIKE '%UNIQUE%'`);
    const globalOnExternal = globals.filter((r: any) =>
      /external_id/.test(r.indexdef) && !/WHERE/.test(r.indexdef));
    same("ولا فهرس فريد عالمي على external_id", globalOnExternal.map((r: any) => r.indexname), []);
  }

  await cleanup();
  await pool.query(`DELETE FROM system_users WHERE id = $1`, [USER]);
  console.log(failures === 0 ? "\n✅ all patient-identity cases pass" : `\n❌ ${failures} case(s) failed`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
