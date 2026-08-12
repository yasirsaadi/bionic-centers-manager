// نقاط إدارة تواصل المريض — اختبار حيّ على Postgres عبر النقاط الحقيقية.
// قاعدة محلّية: `npm run test:communication-api`.
//
// يحرس ثلاثة أشياء لا يُثبتها فحص الشيفرة بالعين:
//   • **الصلاحية خادميّة**: مدير فرعٍ آخر يُردّ ولو نادى النقطة بـcurl،
//     وتذكرةُ مريضٍ آخر لا تُلمَس ولو عُرِف رقمها.
//   • **النصّ الخام لا يتسرّب**: لا إلى القاعدة، ولا إلى `audit_log`، ولا
//     إلى سجلّ الطلبات، ولا إلى أي ردّ بعد ردّ الإنشاء.
//   • **لا باب عامّ للاستهلاك**: فحصٌ ساكن على سطح النقاط كلّه.

import express from "express";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { pool, db } from "../db";
import { isAuthenticated } from "../replit_integrations/auth/replitAuth";
import { registerPatientCommunicationRoutes } from "./routes";
import { createLinkToken, redeemLinkToken, revokeContact } from "./store";
import { redactForLog } from "../log_redaction";
import { patientContacts, patientLinkTokens } from "@shared/schema";
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

const PORT = 6791;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-نقاط-التواصل";
const ADMIN = 9701, MANAGER1 = 9702, MANAGER2 = 9703, RECEPTION = 9704, RECEPTION_NO = 9705;

const S = {
  admin:      { userId: ADMIN,     role: "admin",          isAdmin: true,  branchId: 0, accessibleBranches: [],  permissions: {} },
  manager1:   { userId: MANAGER1,  role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1], permissions: { canViewPatients: true } },
  // مدير الفرع الثاني — لا شأن له بمريض الفرع الأول مهما فعل.
  manager2:   { userId: MANAGER2,  role: "branch_manager", isAdmin: false, branchId: 2, accessibleBranches: [2], permissions: { canViewPatients: true } },
  reception:  { userId: RECEPTION, role: "reception",      isAdmin: false, branchId: 1, accessibleBranches: [1], permissions: { canViewPatients: true } },
  // استقبالٌ بلا صلاحية الوصول إلى المرضى.
  receptionNo:{ userId: RECEPTION_NO, role: "reception",   isAdmin: false, branchId: 1, accessibleBranches: [1], permissions: {} },
};

async function req(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", "x-test-session": JSON.stringify(session) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, json };
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await pool.query(`DELETE FROM audit_log WHERE entity_type IN ('patient_link_token','patient_contact') AND user_id IN (${[ADMIN, MANAGER1, MANAGER2, RECEPTION, RECEPTION_NO].join(",")})`);
  await pool.query(`DELETE FROM patient_link_tokens WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function mkPatient(name: string, branchId = 1): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO patients (name, phone, phone_e164, phone_status, referral_source, age, medical_condition, branch_id, is_amputee)
     VALUES ($1,'07701234567','+9647701234567','ok',$2,'40','amputee',$3,true) RETURNING id`, [name, MARK, branchId]);
  return rows[0].id;
}

const ISSUE = (p: number) => `/api/patients/${p}/communication/link-tokens`;
const STATUS = (p: number) => `/api/patients/${p}/communication`;
const REVOKE_TOKEN = (p: number, t: number) => `/api/patients/${p}/communication/link-tokens/${t}/revoke`;
const REVOKE_CONTACT = (p: number, c: number) => `/api/patients/${p}/communication/contacts/${c}/revoke`;

async function main() {
  await pool.query(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await pool.query(`INSERT INTO branches (id,name) VALUES (2,'البصرة') ON CONFLICT DO NOTHING`);
  for (const [id, role, branch] of [[ADMIN,"admin",1],[MANAGER1,"branch_manager",1],[MANAGER2,"branch_manager",2],[RECEPTION,"reception",1],[RECEPTION_NO,"reception",1]] as any[]) {
    await pool.query(
      `INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
       VALUES ($1,$2,'x','موظّف',$3,$4,$5::jsonb,true) ON CONFLICT (id) DO NOTHING`,
      [id, `comm_u${id}`, role, branch, JSON.stringify([branch])]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(h as string) } : {};
    next();
  });
  registerPatientCommunicationRoutes(app, isAuthenticated as any);
  const server = app.listen(PORT);
  await new Promise((r) => setTimeout(r, 300));

  try {
    // ══ ١-٤. مَن يُصدر ═══════════════════════════════════════════════════
    console.log("\n── مَن يُصدر رابط ربط ──");
    const p1 = await mkPatient("مريض الفرع الأول", 1);

    let r = await req("POST", ISSUE(p1), S.admin, { channel: "telegram", relation: "self" });
    same("١. المسؤول العام يُصدر", r.status, 201);
    check(typeof r.json?.rawToken === "string" && r.json.rawToken.length >= 40, "ويأتي النصّ الخام في الردّ");
    const adminTokenId = r.json.tokenId;

    r = await req("POST", ISSUE(p1), S.manager1, { channel: "telegram", relation: "guardian" });
    same("٢. مدير الفرع داخل فرعه يُصدر", r.status, 201);
    const managerTokenId = r.json.tokenId;

    r = await req("POST", ISSUE(p1), S.manager2, { channel: "telegram", relation: "self" });
    same("٣. مدير فرعٍ آخر ⇒ 403", r.status, 403);
    check(!r.json?.rawToken, "وبلا نصّ خام في ردّ المنع");

    r = await req("POST", ISSUE(p1), S.reception, { channel: "telegram", relation: "family" });
    same("٤. الاستقبال المخوَّل يُصدر", r.status, 201);
    const receptionTokenId = r.json.tokenId;

    // ومَن لا يملك الوصول إلى المرضى لا يمرّ ولو كان في الفرع نفسه.
    r = await req("POST", ISSUE(p1), S.receptionNo, { channel: "telegram", relation: "self" });
    same("والاستقبال بلا صلاحية الوصول ⇒ 403", r.status, 403);
    // ولا جلسة أصلاً ⇒ 401، فالحارس قبل كل شيء.
    const anon = await fetch(BASE + ISSUE(p1), {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel: "telegram", relation: "self" }),
    });
    same("وبلا جلسة ⇒ 401", anon.status, 401);

    // ══ ٥-٧. ما يُرفض في الجسم ═══════════════════════════════════════════
    console.log("\n── التحقّق من الجسم ──");
    r = await req("POST", ISSUE(p1), S.admin, { channel: "telegram", relation: "زوج" });
    same("٥. صلة غير صالحة ⇒ 400", r.status, 400);

    r = await req("POST", ISSUE(p1), S.admin, { channel: "whatsapp", relation: "self" });
    same("٦. قناة غير مدعومة ⇒ 400", r.status, 400);

    r = await req("POST", ISSUE(p1), S.admin, { channel: "telegram", relation: "self", ttlMs: 999999999 });
    same("٧. `ttlMs` من العميل ⇒ 400 رفضاً لا تجاهلاً", r.status, 400);
    check(String(r.json?.message ?? "").includes("ttlMs"), "والرسالة تسمّي الحقل المرفوض", JSON.stringify(r.json));

    for (const bad of ["externalId", "phone", "verified", "status"]) {
      r = await req("POST", ISSUE(p1), S.admin, { channel: "telegram", relation: "self", [bad]: "x" });
      same(`و«${bad}» مرفوض أيضاً`, r.status, 400);
    }

    // والمهلة هي الافتراضية دائماً — ١٥ دقيقة، مهما طلب العميل.
    const [issued] = await db.select().from(patientLinkTokens).where(eq(patientLinkTokens.id, adminTokenId));
    const ttl = issued.expiresAt.getTime() - issued.createdAt.getTime();
    check(Math.abs(ttl - 15 * 60 * 1000) < 5000, "والمهلة ١٥ دقيقة دائماً", String(ttl));

    // ══ ٨-١٠. النصّ الخام لا يتسرّب ══════════════════════════════════════
    console.log("\n── النصّ الخام: مرّة واحدة ولا أثر بعدها ──");
    const fresh = await req("POST", ISSUE(p1), S.admin, { channel: "telegram", relation: "self" });
    const raw: string = fresh.json.rawToken;
    const freshId: number = fresh.json.tokenId;

    same("٨. ردّ الإنشاء يحمل الحقول غير الحسّاسة وحدها",
      Object.keys(fresh.json).sort(),
      ["channel", "expiresAt", "rawToken", "relation", "tokenId"]);
    check(!("tokenHash" in fresh.json), "وبلا `tokenHash` إطلاقاً");

    // ولا يظهر في أي قراءة لاحقة.
    const after = await req("GET", STATUS(p1), S.admin);
    check(!JSON.stringify(after.json).includes(raw), "ولا يظهر في قراءة الحالة بعدها");

    // ٩. غير موجود في القاعدة — لا في صفّه ولا في الجدول كلّه.
    const { rows: rowDump } = await pool.query(`SELECT * FROM patient_link_tokens WHERE id = $1`, [freshId]);
    check(!JSON.stringify(rowDump[0]).includes(raw), "٩. وليس في صفّ القاعدة");
    const { rows: anyMatch } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM patient_link_tokens
        WHERE token_hash = $1 OR consumed_by_external_id = $1`, [raw]);
    same("ولا يطابق أي عمود نصّي في الجدول", anyMatch[0].n, 0);

    // ١٠. غير موجود في audit_log — بصفوفه كاملة، بأي عمود.
    const { rows: auditRows } = await pool.query(
      `SELECT * FROM audit_log WHERE entity_type IN ('patient_link_token','patient_contact')`);
    check(auditRows.length > 0, "وقيود التدقيق كُتبت فعلاً", `n=${auditRows.length}`);
    check(!JSON.stringify(auditRows).includes(raw), "١٠. والنصّ الخام ليس في التدقيق");
    const auditDump = JSON.stringify(auditRows);
    check(!/token_hash|tokenHash/.test(auditDump), "ولا بصمة في التدقيق");
    check(!/external_id|externalId/.test(auditDump), "ولا معرّف حساب في التدقيق");
    same("والأفعال المسجَّلة هي المعلَنة",
      [...new Set(auditRows.map((a: any) => a.action))].sort(),
      ["link_token_created"]);

    // ولا في سجلّ الطلبات: الحاجب يعمل على شكل الردّ الحقيقي.
    const logged = JSON.stringify(redactForLog(fresh.json));
    check(!logged.includes(raw), "ولا في سجلّ الطلبات — الحاجب يستبدله");
    check(logged.includes("[محجوب]"), "ويترك أثراً صريحاً مكانه", logged);

    // ══ ١١-١٣. ما لا تعرضه قراءة الحالة ══════════════════════════════════
    console.log("\n── قراءة الحالة: ما يراه الموظّف وما لا يراه ──");
    const secret = "tg-secret-55501";
    const forLink = await createLinkToken({ patientId: p1, channel: "telegram", relation: "guardian" });
    await redeemLinkToken({ rawToken: forLink.rawToken, externalId: secret });

    const st = await req("GET", STATUS(p1), S.reception);
    same("القراءة متاحة للاستقبال المخوَّل", st.status, 200);
    same("وجهة نشطة واحدة", st.json.activeContacts.length, 1);
    same("بحقولها الأربعة لا غير", Object.keys(st.json.activeContacts[0]).sort(),
      ["channel", "id", "linkedAt", "relation"]);
    same("والتذاكر المعلَّقة بحقولها الخمسة", Object.keys(st.json.pendingTokens[0]).sort(),
      ["channel", "createdAt", "expiresAt", "id", "relation"]);

    const dump = JSON.stringify(st.json);
    check(!dump.includes(secret), "١١. ولا يظهر `externalId` إطلاقاً");
    check(!/tokenHash|token_hash/.test(dump), "١٢. ولا `tokenHash`");
    check(!/consumedByExternalId|consumed_by_external_id/.test(dump), "١٣. ولا `consumedByExternalId`");
    check(!/rawToken/.test(dump), "ولا `rawToken`");

    // والمستهلَكة ليست «معلَّقة»: خرجت من القائمة بمجرّد استهلاكها.
    check(!st.json.pendingTokens.some((t: any) => t.id === forLink.token.id),
      "والتذكرة المستهلَكة خرجت من المعلَّقة");
    // والمنتهية كذلك — رابطٌ ميت لا يُعرض كأنه قائم.
    const expired = await createLinkToken({ patientId: p1, channel: "telegram", relation: "self", ttlMs: -1000 });
    const st2 = await req("GET", STATUS(p1), S.admin);
    check(!st2.json.pendingTokens.some((t: any) => t.id === expired.token.id),
      "والمنتهية لا تُعرض معلَّقة");

    // ══ ١٤-١٦. إلغاء التذاكر ═════════════════════════════════════════════
    console.log("\n── إلغاء رابط معلَّق ──");
    r = await req("POST", REVOKE_TOKEN(p1, managerTokenId), S.manager1);
    same("١٤. إلغاء المعلَّقة ينجح", [r.status, r.json.revoked, r.json.alreadyRevoked], [200, true, false]);
    const [revokedRow] = await db.select().from(patientLinkTokens).where(eq(patientLinkTokens.id, managerTokenId));
    check(!!revokedRow.revokedAt, "و`revoked_at` امتلأ");

    r = await req("POST", REVOKE_TOKEN(p1, managerTokenId), S.manager1);
    same("وتكراره idempotent بلا 500", [r.status, r.json.alreadyRevoked], [200, true]);

    // المستهلَكة: تُردّ 409 ولا تنقلب دلالتها.
    r = await req("POST", REVOKE_TOKEN(p1, forLink.token.id), S.admin);
    same("١٥. المستهلَكة ⇒ 409", r.status, 409);
    const [consumedRow] = await db.select().from(patientLinkTokens).where(eq(patientLinkTokens.id, forLink.token.id));
    check(!!consumedRow.consumedAt, "وتبقى مستهلَكة");
    check(consumedRow.revokedAt === null, "ولم تتحوّل إلى «مسحوبة»", String(consumedRow.revokedAt));

    // ١٦. تذكرة مريضٍ آخر: لا تُلمَس ولو عُرِف رقمها.
    const p2 = await mkPatient("مريض آخر بالفرع نفسه", 1);
    const otherToken = await createLinkToken({ patientId: p2, channel: "telegram", relation: "self" });
    r = await req("POST", REVOKE_TOKEN(p1, otherToken.token.id), S.admin);
    same("١٦. تذكرة مريضٍ آخر عبر مسار هذا المريض ⇒ 404", r.status, 404);
    const [untouched] = await db.select().from(patientLinkTokens).where(eq(patientLinkTokens.id, otherToken.token.id));
    check(untouched.revokedAt === null, "ولم تُمسّ", String(untouched.revokedAt));

    // ولا يصل إليها مدير الفرع الآخر من مسارها الصحيح أصلاً.
    r = await req("POST", REVOKE_TOKEN(p2, otherToken.token.id), S.manager2);
    same("ومدير الفرع الآخر ⇒ 403 حتى على المسار الصحيح", r.status, 403);
    r = await req("GET", STATUS(p1), S.manager2);
    same("ولا يقرأ حالة مريض ليس في فرعه", r.status, 403);

    // ══ ١٧-١٩. سحب جهة الاتصال ═══════════════════════════════════════════
    console.log("\n── سحب جهة اتصال نشطة ──");
    const contactId: number = st.json.activeContacts[0].id;

    // ١٧. جهة مريضٍ آخر عبر مسار هذا المريض.
    const otherLink = await createLinkToken({ patientId: p2, channel: "telegram", relation: "self" });
    const otherContact = await redeemLinkToken({ rawToken: otherLink.rawToken, externalId: "tg-other-9" });
    r = await req("POST", REVOKE_CONTACT(p1, otherContact.contact.id), S.admin);
    same("١٧. جهة مريضٍ آخر ⇒ 404", r.status, 404);
    const [otherStill] = await db.select().from(patientContacts).where(eq(patientContacts.id, otherContact.contact.id));
    check(otherStill.revokedAt === null, "ولم تُسحَب", String(otherStill.revokedAt));

    // ١٨. السحب يملأ revoked_at ولا يحذف الصفّ ولا يمسّ الصلة.
    const before = await pool.query(`SELECT COUNT(*)::int AS n FROM patient_contacts WHERE patient_id = $1`, [p1]);
    r = await req("POST", REVOKE_CONTACT(p1, contactId), S.reception);
    same("١٨. السحب ينجح", [r.status, r.json.revoked, r.json.alreadyRevoked], [200, true, false]);
    const [sealed] = await db.select().from(patientContacts).where(eq(patientContacts.id, contactId));
    check(!!sealed.revokedAt, "و`revoked_at` امتلأ");
    const afterCount = await pool.query(`SELECT COUNT(*)::int AS n FROM patient_contacts WHERE patient_id = $1`, [p1]);
    same("ولا صفّ حُذف", afterCount.rows[0].n, before.rows[0].n);
    same("والصلة لم تتغيّر", sealed.relation, "guardian");
    check(sealed.externalId === secret, "والحساب باقٍ في الصفّ كتاريخ");

    r = await req("POST", REVOKE_CONTACT(p1, contactId), S.reception);
    same("وتكراره idempotent بلا 500", [r.status, r.json.alreadyRevoked], [200, true]);

    // ١٩. ولا يظهر بعدها في النشطة.
    const st3 = await req("GET", STATUS(p1), S.admin);
    check(!st3.json.activeContacts.some((c: any) => c.id === contactId),
      "١٩. والمسحوبة لا تظهر في activeContacts");
    same("ولا تاريخ مسحوب في الردّ الافتراضي إطلاقاً", st3.json.activeContacts.length, 0);

    // وأفعال التدقيق الثلاثة كلّها مكتوبة الآن — وبلا سرّ.
    const { rows: allAudit } = await pool.query(
      `SELECT action, entity_type, new_values FROM audit_log
        WHERE entity_type IN ('patient_link_token','patient_contact') ORDER BY action`);
    same("وأفعال التدقيق الثلاثة معلَنة",
      [...new Set(allAudit.map((a: any) => a.action))].sort(),
      ["link_token_created", "link_token_revoked", "patient_contact_revoked"]);
    const allDump = JSON.stringify(allAudit);
    check(!allDump.includes(secret) && !allDump.includes(raw),
      "ولا سرّ في أيٍّ منها");

    // ══ ٢٠. لا باب عامّ للاستهلاك ════════════════════════════════════════
    // فحص ساكن على **كل** ملفّ نقاط في الخادم: `redeemLinkToken` لا تُستدعى
    // من أي مسار HTTP. الدالّة داخلية حتى تُحسم معمارية القناة الخارجية.
    console.log("\n── لا نقطة استهلاك عامّة ──");
    const routeFiles: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== "node_modules") walk(full); }
        else if (/routes\.ts$/.test(e.name)) routeFiles.push(full);
      }
    };
    walk(join(import.meta.dirname, ".."));
    check(routeFiles.length >= 5, `فُحصت ${routeFiles.length} ملفّات نقاط`, String(routeFiles.length));

    // **استدعاءً أو استيراداً** لا ذِكراً: التعليق الذي يشرح لماذا لا
    // تُستدعى ليس مخالفة — بل هو التوثيق المقصود. والمخالفة الحقيقية أن
    // يستوردها ملفّ نقاط أو يناديها، وكلاهما ممسوك هنا.
    const usesRedeem = (src: string) =>
      /\bredeemLinkToken\s*\(/.test(src) ||
      /import[^;]*\bredeemLinkToken\b[^;]*from/s.test(src);
    const offenders = routeFiles.filter((f) => usesRedeem(readFileSync(f, "utf8")));
    same("٢٠. ولا ملفّ نقاط يستدعي redeemLinkToken أو يستوردها",
      offenders.map((f) => f.split("/server/")[1] ?? f), []);
    // والحارس نفسه حيّ: لو أُدرج الاستدعاء لأمسكه.
    check(usesRedeem('import { redeemLinkToken } from "./store";'), "والحارس يمسك الاستيراد");
    check(usesRedeem("await redeemLinkToken({ rawToken, externalId })"), "ويمسك الاستدعاء");
    check(!usesRedeem("// redeemLinkToken تبقى داخلية"), "ولا يعثّره ذكرٌ في تعليق");

    // ولا مسار مسجَّل يقبل `rawToken` في جسمه.
    const ourRoutes = readFileSync(join(import.meta.dirname, "routes.ts"), "utf8");
    check(!/req\.body[^\n]*rawToken|body\.rawToken/.test(ourRoutes),
      "ولا نقطة تقرأ `rawToken` من جسم الطلب");
  } finally {
    server.close();
  }

  await cleanup();
  await pool.query(`DELETE FROM system_users WHERE id IN (${[ADMIN, MANAGER1, MANAGER2, RECEPTION, RECEPTION_NO].join(",")})`);
  console.log(failures === 0 ? "\n✅ all communication-api cases pass" : `\n❌ ${failures} case(s) failed`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
