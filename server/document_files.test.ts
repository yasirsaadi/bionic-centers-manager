// **مستنداتُ المرضى في قاعدة البيانات** (ترحيل ١٠٣، §4.cf) — حيّاً على Postgres وعلى النقاط الحقيقية.
// قاعدة محلّية: `npm run test:document-files`.
//
//   • **أ**: الرفعُ يحفظ المحتوى في القاعدة، والرابطُ رابطُ النقطة لا مجلّدٌ على القرص، والاسمُ العربيّ سليم.
//   • **ب**: القراءةُ بجلسةٍ تصل المريض وحدها — لا لفرعٍ آخر ولا بلا دخول، والمجلّدُ المفتوح `/uploads` أُزيل.
//   • **ج**: الحدود — نوعٌ غير مقبول، وحجمٌ فوق ١٠ ميغابايت، ومريضُ فرعٍ آخر.
//   • **د**: المستندُ القديم الذي ضاع ملفُّه يقول ذلك (٤١٠)، وحذفُ المستند أو «الحذفُ النهائيّ» للمريض يمحو المحتوى معه.

import express from "express";
import fs from "fs";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { importLegacyUploads } from "./documents/files";

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

const PORT = 6895;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-المستندات";
const BA = 9731, BB = 9732;
const UA = 9991, UB = 9992, ADMIN = 9993;
const sess = (userId: number, branchId: number) => ({
  userId, role: "reception", isAdmin: false, branchId, accessibleBranches: [branchId], displayName: `u${userId}`,
  permissions: { canViewPatients: true, canAddPatients: true },
});
const S = {
  a: sess(UA, BA), b: sess(UB, BB),
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: BA, accessibleBranches: [BA, BB], displayName: "المسؤول", permissions: {} },
};
const hdr = (s: any) => ({ "x-test-session": Buffer.from(JSON.stringify(s), "utf8").toString("base64") });

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  return (await pool.query(text, params)).rows as T[];
}
async function upload(s: any, patientId: number, bytes: Uint8Array, type: string, name: string) {
  const fd = new FormData();
  fd.append("file", new Blob([bytes], { type }), name);
  fd.append("patientId", String(patientId));
  fd.append("documentType", "report");
  const res = await fetch(`${BASE}/api/documents`, { method: "POST", headers: s ? hdr(s) : {}, body: fd });
  let body: any = null; try { body = await res.json(); } catch { /* */ }
  return { status: res.status, body };
}
async function download(s: any, docId: number) {
  const res = await fetch(`${BASE}/api/documents/${docId}/file`, { headers: s ? hdr(s) : {} });
  return { status: res.status, type: res.headers.get("content-type"), bytes: new Uint8Array(await res.arrayBuffer()) };
}

async function cleanup() {
  const pids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM documents WHERE patient_id IN (${pids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}
async function mkPatient(branchId: number) {
  const [p] = await q(`INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id,
       is_amputee, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','x',$3,true,false,0,'new') RETURNING id`, [`${MARK} ${branchId}`, MARK, branchId]);
  return Number(p.id);
}

async function main() {
  await q(`INSERT INTO branches (id, name) VALUES ($1,$2),($3,$4) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
    [BA, `${MARK} أ`, BB, `${MARK} ب`]);
  for (const [id, role, br] of [[UA, "reception", BA], [UB, "reception", BB], [ADMIN, "admin", BA]] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,can_view_patients,can_add_patients)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,true,true)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids, is_active=true,
               can_view_patients=true, can_add_patients=true`,
      [id, `df_u${id}`, `u${id}`, role, br, JSON.stringify(role === "admin" ? [BA, BB] : [br])]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")) } : {};
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
    const pA = await mkPatient(BA);
    const bytes = new Uint8Array(Array.from({ length: 3000 }, (_, i) => (i * 7) % 256));

    console.log("\n── أ. الرفع ──");
    const up = await upload(S.a, pA, bytes, "image/png", "أشعة الركبة.png");
    same("أ١. **الرفعُ ٢٠١، والرابطُ رابطُ النقطة** — لا `/uploads`",
      [up.status, up.body?.fileUrl], [201, `/api/documents/${up.body?.id}/file`]);
    same("أ٢. **والاسمُ العربيّ سليم** — لا «Ù…»", up.body?.fileName, "أشعة الركبة.png");
    const row = (await q(`SELECT size_bytes, mime_type, octet_length(content) n FROM document_files WHERE document_id=$1`, [up.body.id]))[0];
    same("أ٣. **والمحتوى في القاعدة** بحجمه ونوعه", [row?.size_bytes, row?.n, row?.mime_type], [3000, 3000, "image/png"]);

    console.log("\n── ب. القراءة ──");
    const dl = await download(S.a, up.body.id);
    same("ب١. **صاحبُ الفرع يقرؤه — البايتاتُ نفسُها والنوعُ نفسُه**",
      [dl.status, dl.type, dl.bytes.length, Buffer.from(dl.bytes).equals(Buffer.from(bytes))], [200, "image/png", 3000, true]);
    same("ب٢. **وموظّفُ فرعٍ آخر ⟵ ٤٠٤ · وبلا دخول ⟵ ٤٠١**", [(await download(S.b, up.body.id)).status, (await download(null, up.body.id)).status], [404, 401]);
    //  ملفٌّ حقيقيّ في المجلّد القديم — كان يُقرأ بلا دخولٍ لكلّ مَن عرف اسمه.
    fs.mkdirSync("uploads", { recursive: true });
    fs.writeFileSync("uploads/df-probe.png", Buffer.from(bytes));
    const legacyDir = await fetch(`${BASE}/uploads/df-probe.png`);
    fs.rmSync("uploads/df-probe.png", { force: true });
    check(!(legacyDir.headers.get("content-type") ?? "").startsWith("image/"), "ب٣. **ومجلّدُ `/uploads` المفتوح بلا دخول أُزيل** — ملفٌّ فيه لا يُقرأ",
      `${legacyDir.status} ${legacyDir.headers.get("content-type")}`);

    console.log("\n── ج. الحدود ──");
    same("ج١. **نوعٌ غير مقبول ⟵ ٤٠٠**", (await upload(S.a, pA, bytes, "text/plain", "x.txt")).status, 400);
    same("ج٢. **فوق ١٠ ميغابايت ⟵ ٤١٣**", (await upload(S.a, pA, new Uint8Array(10 * 1024 * 1024 + 10), "application/pdf", "big.pdf")).status, 413);
    same("ج٣. **ومريضُ فرعٍ آخر ⟵ ٤٠٤ ولا صفّ**",
      [(await upload(S.b, pA, bytes, "image/png", "x.png")).status, Number((await q(`SELECT count(*)::int n FROM documents WHERE patient_id=$1`, [pA]))[0].n)], [404, 1]);

    console.log("\n── د. القديم والحذف ──");
    const [legacy] = await q(`INSERT INTO documents (patient_id, document_type, file_name, file_url) VALUES ($1,'report','old.jpeg','/uploads/file-1.jpeg') RETURNING id`, [pA]);
    same("د١. **مستندٌ قديم ضاع ملفُّه ⟵ ٤١٠** «الملفّ غير متوفّر»", (await download(S.a, legacy.id)).status, 410);
    //  ملفٌّ قديم ما زال على القرص (كستّة ملفّات `uploads/` المُتتبَّعة في git) ⟵ يُنقل إلى القاعدة عند الإقلاع.
    fs.mkdirSync("uploads", { recursive: true });
    fs.writeFileSync("uploads/df-legacy.jpeg", Buffer.from(bytes));
    const [kept] = await q(`INSERT INTO documents (patient_id, document_type, file_name, file_url) VALUES ($1,'report','kept.jpeg','/uploads/df-legacy.jpeg') RETURNING id`, [pA]);
    const r1 = await importLegacyUploads();
    const r2 = await importLegacyUploads();
    fs.rmSync("uploads/df-legacy.jpeg", { force: true });
    const keptDl = await download(S.a, kept.id);
    const keptUrl = (await q(`SELECT file_url FROM documents WHERE id=$1`, [kept.id]))[0].file_url;
    same("د١ب. **ما بقي على القرص يُنقل إلى القاعدة** — ويُقرأ، ورابطُه النقطة، والضائعُ يبقى «غير متوفّر»",
      [r1.imported >= 1, keptDl.status, keptDl.type, keptDl.bytes.length, keptUrl, (await download(S.a, legacy.id)).status],
      [true, 200, "image/jpeg", 3000, `/api/documents/${kept.id}/file`, 410]);
    same("د١ج. **والنقلُ لا يتكرّر** — الإعادةُ لا تنقل شيئاً", r2.imported, 0);
    const del = await fetch(`${BASE}/api/documents/${up.body.id}`, { method: "DELETE", headers: hdr(S.admin) });
    same("د٢. **حذفُ المستند يمحو محتواه** (بقيد القاعدة)",
      [del.status, Number((await q(`SELECT count(*)::int n FROM document_files WHERE document_id=$1`, [up.body.id]))[0].n)], [204, 0]);
    const up2 = await upload(S.a, pA, bytes, "application/pdf", "تقرير.pdf");
    await storage.deletePatient(pA);
    same("د٣. **والحذفُ النهائيّ للمريض لا يتعثّر بالجدول الجديد** — ويمحو المحتوى",
      [up2.status, Number((await q(`SELECT count(*)::int n FROM document_files WHERE document_id=$1`, [up2.body.id]))[0].n),
       Number((await q(`SELECT count(*)::int n FROM patients WHERE id=$1`, [pA]))[0].n)], [201, 0, 0]);
  } finally {
    await cleanup();
    httpServer.close();
  }
  console.log(failures === 0 ? "\n✅ كل فحوص المستندات نجحت" : `\n❌ ${failures} فشل`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error(e); try { await cleanup(); } catch { /* */ } process.exit(1); });
