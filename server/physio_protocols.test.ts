// مكتبةُ بروتوكولات العلاج الطبيعي (ترحيل ١٠٦، §4.cj — المرحلةُ الثانية من خطّة العلاج الطبيعي، ٢٠٢٦-١٠-٠٧).
// `npm run test:physio-protocols` — على النقاط الحقيقية بتطبيق Express الحقيقيّ.
//
// يحرس: (أ) مَن يقرأ ومَن يكتب ومَن يعتمد ومَن يضبط التوفّر؛ (ب) الجديدُ مسوّدة، والاعتمادُ للمشرف العام والمسؤول وحدهما؛
// (ج) تعديلُ المعتمَد بيد الأخصائيّ يعيده مسوّدة، وبيد المشرف يبقى معتمَداً؛ (د) التحقّقُ من الجسم والأجهزة ودرجات الدليل؛
// (هـ) الأرشفةُ لا محو، والمؤرشفُ لا يراه إلّا مَن يعدّل؛ (و) الصورُ في القاعدة بنوعها وحدّها؛ (ز) توفّرُ الجهاز بالفرع يظهر
// في البروتوكول؛ (ح) كلُّ كتابةٍ تكتب سطرَ تدقيق.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "physio-protocols-test-secret";

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6986;
const BASE = `http://127.0.0.1:${PORT}`;
const B1 = 9631;
const ADMIN = 9632, SUP = 9633, SPEC = 9634, TECH = 9635, DOC = 9636, REC = 9637;
const IDS = [ADMIN, SUP, SPEC, TECH, DOC, REC];
const CODE_PREFIX = "tstpp-";

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");
// PNG ١×١ حقيقيّ.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

async function cleanup() {
  const pids = (await q(`SELECT id FROM physio_protocols WHERE code LIKE $1`, [CODE_PREFIX + "%"])).rows.map((r) => r.id);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM physio_protocols WHERE id = ANY($1::int[])`, [pids]);
  await q(`DELETE FROM physio_device_branches WHERE branch_id = $1`, [B1]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

async function main() {
  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع اختبار البروتوكولات')`, [B1]);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_supervise_physio)
           VALUES ($1, 'pp-admin', 'x', 'المسؤول', 'admin', NULL, '[]', true, false),
                  ($2, 'pp-sup', 'x', 'سليم', 'branch_manager', $7, $8::jsonb, true, true),
                  ($3, 'pp-spec', 'x', 'مصطفى', 'physio_specialist', $7, $8::jsonb, true, false),
                  ($4, 'pp-tech', 'x', 'تقنيّ', 'physio_technician', $7, $8::jsonb, true, false),
                  ($5, 'pp-doc', 'x', 'طبيب', 'doctor', $7, $8::jsonb, true, false),
                  ($6, 'pp-rec', 'x', 'استقبال', 'reception', $7, $8::jsonb, true, false)`,
    [ADMIN, SUP, SPEC, TECH, DOC, REC, B1, JSON.stringify([B1])]);

  const S = {
    admin: hdr({ userId: ADMIN, displayName: "المسؤول", role: "admin", branchId: null, isAdmin: true, permissions: { canSupervisePhysio: true } }),
    sup: hdr({ userId: SUP, displayName: "سليم", role: "branch_manager", branchId: B1, isAdmin: false, permissions: { canSupervisePhysio: true } }),
    spec: hdr({ userId: SPEC, displayName: "مصطفى", role: "physio_specialist", branchId: B1, isAdmin: false, permissions: {} }),
    tech: hdr({ userId: TECH, displayName: "تقنيّ", role: "physio_technician", branchId: B1, isAdmin: false, permissions: {} }),
    doc: hdr({ userId: DOC, displayName: "طبيب", role: "doctor", branchId: B1, isAdmin: false, permissions: {} }),
    rec: hdr({ userId: REC, displayName: "استقبال", role: "reception", branchId: B1, isAdmin: false, permissions: {} }),
  };

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const h = req.get("x-test-session");
    if (h) {
      try { req.session = { branchSession: JSON.parse(Buffer.from(h, "base64").toString("utf8")), destroy: (cb: () => void) => cb() }; }
      catch { /* ignore */ }
    }
    next();
  });
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise<void>((r) => httpServer.once("listening", () => r()));

  const call = async (method: string, path: string, session: string, body?: unknown) => {
    const r = await fetch(`${BASE}${path}`, {
      method, headers: { "content-type": "application/json", "x-test-session": session },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json: any = null;
    try { json = await r.json(); } catch { /* */ }
    return { status: r.status, json };
  };
  const upload = async (id: number, session: string, buf: Buffer, mime: string, extra: Record<string, string> = {}) => {
    const fd = new FormData();
    fd.append("file", new Blob([buf], { type: mime }), "x.png");
    for (const [k, v] of Object.entries(extra)) fd.append(k, v);
    const r = await fetch(`${BASE}/api/physio/protocols/${id}/images`, { method: "POST", headers: { "x-test-session": session }, body: fd });
    let json: any = null;
    try { json = await r.json(); } catch { /* */ }
    return { status: r.status, json };
  };
  const auditCount = async (entityType: string, entityId: number, action: string) =>
    Number((await q(`SELECT count(*) FROM audit_log WHERE entity_type = $1 AND entity_id = $2 AND action = $3`, [entityType, entityId, action])).rows[0].count);

  const devs = (await q(`SELECT id, code FROM devices WHERE is_active ORDER BY display_order, id`)).rows as { id: number; code: string }[];
  const dev = (code: string) => devs.find((d) => d.code === code)?.id ?? devs[0].id;
  const [D1, D2, D3] = [devs[0].id, devs[1].id, devs[2].id];

  const body = (code: string, extra: Record<string, unknown> = {}) => ({
    code, titleAr: "ألم أسفل الظهر", titleEn: "Low Back Pain", category: "spine", ageGroup: "adult",
    summary: "ملخّص", goals: "تقليل الألم", sessionsPerWeek: 3, durationWeeks: 6, sessionMinutes: 45,
    references: [{ title: "Low Back Pain CPG", org: "JOSPT", year: 2021, url: "https://www.jospt.org/doi/10.2519/jospt.2021.0304" }],
    devices: [
      { deviceId: D1, evidence: "recommended", parameters: "10 دقائق", minutes: 10 },
      { deviceId: D2, evidence: "optional" },
      { deviceId: D3, evidence: "not_recommended", note: "لا دليل" },
    ],
    ...extra,
  });

  try {
    console.log("\n── أ. مَن يقرأ ومَن يكتب ──");
    same("أ.١ الاستقبالُ لا يقرأ المكتبة", (await call("GET", "/api/physio/protocols", S.rec)).status, 403);
    same("أ.٢ التقنيُّ يقرأ", (await call("GET", "/api/physio/protocols", S.tech)).status, 200);
    same("أ.٣ الطبيبُ يقرأ", (await call("GET", "/api/physio/protocols", S.doc)).status, 200);
    same("أ.٤ التقنيُّ لا يضيف", (await call("POST", "/api/physio/protocols", S.tech, body(CODE_PREFIX + "x"))).status, 403);
    same("أ.٥ الطبيبُ لا يضيف", (await call("POST", "/api/physio/protocols", S.doc, body(CODE_PREFIX + "x"))).status, 403);
    same("أ.٦ الاستقبالُ لا يرى مصفوفةَ الأجهزة", (await call("GET", "/api/physio/devices", S.rec)).status, 403);

    console.log("\n── ب. الجديدُ مسوّدة، والاعتمادُ للمشرف والمسؤول ──");
    const created = await call("POST", "/api/physio/protocols", S.spec, body(CODE_PREFIX + "lbp"));
    same("ب.١ الأخصائيُّ يضيف", created.status, 200);
    const P = created.json?.id as number;
    same("ب.٢ …مسوّدةً", created.json?.status, "draft");
    same("ب.٣ الرمزُ المكرّر ⟵ ٤٠٩", (await call("POST", "/api/physio/protocols", S.sup, body(CODE_PREFIX + "lbp"))).status, 409);
    same("ب.٤ الأخصائيُّ لا يعتمد", (await call("POST", `/api/physio/protocols/${P}/approve`, S.spec)).status, 403);
    same("ب.٥ …ولم يتغيّر شيء", (await q(`SELECT status FROM physio_protocols WHERE id = $1`, [P])).rows[0].status, "draft");
    const appr = await call("POST", `/api/physio/protocols/${P}/approve`, S.sup);
    same("ب.٦ المشرفُ العام يعتمد", appr.status, 200);
    same("ب.٧ …باسمه", (await q(`SELECT status, approved_by, approved_by_name FROM physio_protocols WHERE id = $1`, [P])).rows[0],
      { status: "approved", approved_by: SUP, approved_by_name: "سليم" });
    same("ب.٨ اعتمادُ المعتمَد ⟵ ٤٠٩", (await call("POST", `/api/physio/protocols/${P}/approve`, S.admin)).status, 409);
    const detSpec = await call("GET", `/api/physio/protocols/${P}`, S.spec);
    same("ب.٩ الأخصائيُّ يرى أنه يعدّل ولا يعتمد", [detSpec.json?.canEdit, detSpec.json?.canApprove], [true, false]);
    const detTech = await call("GET", `/api/physio/protocols/${P}`, S.tech);
    same("ب.١٠ التقنيُّ يرى بلا تعديل", [detTech.status, detTech.json?.canEdit, detTech.json?.canApprove], [200, false, false]);

    console.log("\n── ج. تعديلُ المعتمَد ──");
    const supEdit = await call("PUT", `/api/physio/protocols/${P}`, S.sup, body(CODE_PREFIX + "lbp", { summary: "ملخّص المشرف" }));
    same("ج.١ تعديلُ المشرف يُبقيه معتمَداً", [supEdit.status, supEdit.json?.status, supEdit.json?.demoted], [200, "approved", false]);
    const specEdit = await call("PUT", `/api/physio/protocols/${P}`, S.spec, body(CODE_PREFIX + "lbp", { summary: "ملخّص الأخصائيّ" }));
    same("ج.٢ تعديلُ الأخصائيّ يعيده مسوّدة", [specEdit.status, specEdit.json?.status, specEdit.json?.demoted], [200, "draft", true]);
    same("ج.٣ …ويُمحى اسمُ المعتمِد", (await q(`SELECT approved_by, approved_at FROM physio_protocols WHERE id = $1`, [P])).rows[0],
      { approved_by: null, approved_at: null });
    check(Number((await q(`SELECT count(*) FROM audit_log WHERE entity_type = 'physio_protocol' AND entity_id = $1 AND action = 'update' AND notes LIKE '%عاد مسوّدةً%'`, [P])).rows[0].count) === 1,
      "ج.٤ وسطرُ التدقيق يقول إنه عاد مسوّدة");
    same("ج.٥ المسؤولُ يعتمده ثانيةً", (await call("POST", `/api/physio/protocols/${P}/approve`, S.admin)).status, 200);

    console.log("\n── د. التحقّق والأجهزة ──");
    same("د.١ رمزٌ عربيّ ⟵ ٤٠٠", (await call("POST", "/api/physio/protocols", S.spec, body("ألم"))).status, 400);
    same("د.٢ فئةٌ مجهولة ⟵ ٤٠٠", (await call("POST", "/api/physio/protocols", S.spec, body(CODE_PREFIX + "a", { category: "magic" }))).status, 400);
    same("د.٣ درجةُ دليلٍ مجهولة ⟵ ٤٠٠",
      (await call("POST", "/api/physio/protocols", S.spec, body(CODE_PREFIX + "b", { devices: [{ deviceId: D1, evidence: "maybe" }] }))).status, 400);
    same("د.٤ جهازٌ مكرّر ⟵ ٤٠٠",
      (await call("POST", "/api/physio/protocols", S.spec, body(CODE_PREFIX + "c", { devices: [{ deviceId: D1, evidence: "optional" }, { deviceId: D1, evidence: "optional" }] }))).status, 400);
    same("د.٥ جهازٌ غير موجود ⟵ ٤٠٠",
      (await call("POST", "/api/physio/protocols", S.spec, body(CODE_PREFIX + "d", { devices: [{ deviceId: 999999, evidence: "optional" }] }))).status, 400);
    same("د.٦ رابطُ مرجعٍ بلا http ⟵ ٤٠٠",
      (await call("POST", "/api/physio/protocols", S.spec, body(CODE_PREFIX + "e", { references: [{ title: "x", url: "javascript:alert(1)" }] }))).status, 400);
    same("د.٧ جلساتٌ ٢٠ في الأسبوع ⟵ ٤٠٠", (await call("POST", "/api/physio/protocols", S.spec, body(CODE_PREFIX + "f", { sessionsPerWeek: 20 }))).status, 400);
    same("د.٨ ولم يُكتب شيءٌ من المرفوض", Number((await q(`SELECT count(*) FROM physio_protocols WHERE code LIKE $1`, [CODE_PREFIX + "%"])).rows[0].count), 1);
    const det = await call("GET", `/api/physio/protocols/${P}`, S.doc);
    same("د.٩ الأجهزةُ بترتيبها ودرجاتها", (det.json?.devices ?? []).map((d: any) => [d.deviceId, d.evidence]),
      [[D1, "recommended"], [D2, "optional"], [D3, "not_recommended"]]);
    const list = await call("GET", `/api/physio/protocols?q=${encodeURIComponent(CODE_PREFIX)}`, S.doc);
    same("د.١٠ القائمةُ تعدّ الأجهزة والموصى به", (list.json ?? []).map((r: any) => [r.code, r.deviceCount, r.recommendedCount]),
      [[CODE_PREFIX + "lbp", 3, 1]]);

    console.log("\n── هـ. الأرشفةُ لا محو ──");
    same("هـ.١ التقنيُّ لا يؤرشف", (await call("POST", `/api/physio/protocols/${P}/archive`, S.tech)).status, 403);
    same("هـ.٢ الأخصائيُّ يؤرشف", (await call("POST", `/api/physio/protocols/${P}/archive`, S.spec)).status, 200);
    same("هـ.٣ الصفُّ باقٍ", Number((await q(`SELECT count(*) FROM physio_protocols WHERE id = $1 AND is_archived`, [P])).rows[0].count), 1);
    same("هـ.٤ المؤرشفُ لا يراه الطبيب ⟵ ٤٠٤", (await call("GET", `/api/physio/protocols/${P}`, S.doc)).status, 404);
    same("هـ.٥ ولا يظهر له في قائمة المؤرشف", ((await call("GET", `/api/physio/protocols?archived=1`, S.doc)).json ?? []).some((r: any) => r.id === P), false);
    same("هـ.٦ ويظهر للأخصائيّ فيها", ((await call("GET", `/api/physio/protocols?archived=1`, S.spec)).json ?? []).some((r: any) => r.id === P), true);
    same("هـ.٧ المؤرشفُ لا يُعدَّل ⟵ ٤٠٩", (await call("PUT", `/api/physio/protocols/${P}`, S.sup, body(CODE_PREFIX + "lbp"))).status, 409);
    same("هـ.٨ الاستعادةُ تنجح", (await call("POST", `/api/physio/protocols/${P}/restore`, S.spec)).status, 200);

    console.log("\n── و. الصور ──");
    same("و.١ التقنيُّ لا يرفع", (await upload(P, S.tech, PNG, "image/png")).status, 403);
    same("و.٢ نوعٌ غير صورة ⟵ ٤٠٠", (await upload(P, S.spec, Buffer.from("%PDF-1.4"), "application/pdf")).status, 400);
    same("و.٣ مصدرٌ بلا http ⟵ ٤٠٠", (await upload(P, S.spec, PNG, "image/png", { sourceUrl: "ftp://x" })).status, 400);
    same("و.٤ أكبرُ من ٥ ميغابايت ⟵ ٤١٣", (await upload(P, S.spec, Buffer.alloc(5 * 1024 * 1024 + 10, 1), "image/png")).status, 413);
    const up = await upload(P, S.spec, PNG, "image/png", { caption: "وضعية", sourceUrl: "https://www.btlnet.com/", credit: "BTL" });
    same("و.٥ الأخصائيُّ يرفع صورةً بمصدرها", up.status, 200);
    const imgId = up.json?.id as number;
    const img = await fetch(`${BASE}/api/physio/protocol-images/${imgId}`, { headers: { "x-test-session": S.doc } });
    const imgBuf = Buffer.from(await img.arrayBuffer());
    same("و.٦ الطبيبُ يقرأها بنوعها وبايتاتها", [img.status, img.headers.get("content-type"), imgBuf.equals(PNG)], [200, "image/png", true]);
    same("و.٧ الاستقبالُ لا يقرأها", (await fetch(`${BASE}/api/physio/protocol-images/${imgId}`, { headers: { "x-test-session": S.rec } })).status, 403);
    same("و.٨ وتظهر في البروتوكول بمصدرها", ((await call("GET", `/api/physio/protocols/${P}`, S.doc)).json?.images ?? []).map((i: any) => [i.id, i.credit, i.sourceUrl]),
      [[imgId, "BTL", "https://www.btlnet.com/"]]);
    same("و.٩ حذفُها من بروتوكولٍ آخر ⟵ ٤٠٤", (await call("DELETE", `/api/physio/protocols/${P + 100000}/images/${imgId}`, S.spec)).status, 404);
    same("و.١٠ وحذفُها ينجح", (await call("DELETE", `/api/physio/protocols/${P}/images/${imgId}`, S.spec)).status, 200);

    console.log("\n── ز. توفّرُ الجهاز بالفرع ──");
    same("ز.١ الأخصائيُّ لا يضبط التوفّر", (await call("PUT", `/api/physio/devices/${D1}/branches/${B1}`, S.spec, { available: true })).status, 403);
    same("ز.٢ قيمةٌ غير منطقية ⟵ ٤٠٠", (await call("PUT", `/api/physio/devices/${D1}/branches/${B1}`, S.sup, { available: "true" })).status, 400);
    same("ز.٣ قبل التفعيل: الجهازُ غير متوفّر في الفرع",
      ((await call("GET", `/api/physio/protocols/${P}`, S.doc)).json?.devices ?? []).find((d: any) => d.deviceId === D1)?.availableBranchIds.includes(B1), false);
    const on = await call("PUT", `/api/physio/devices/${D1}/branches/${B1}`, S.sup, { available: true });
    same("ز.٤ المشرفُ يفعّله", [on.status, on.json], [200, { before: false, after: true }]);
    same("ز.٥ فيظهر متوفّراً في البروتوكول",
      ((await call("GET", `/api/physio/protocols/${P}`, S.doc)).json?.devices ?? []).find((d: any) => d.deviceId === D1)?.availableBranchIds.includes(B1), true);
    const mx = await call("GET", "/api/physio/devices", S.tech);
    same("ز.٦ والمصفوفةُ تقوله، والتقنيُّ يراها بلا ضبط", [mx.json?.available?.includes(`${D1}:${B1}`), mx.json?.canManage], [true, false]);
    same("ز.٧ والمسؤولُ يطفئه", (await call("PUT", `/api/physio/devices/${D1}/branches/${B1}`, S.admin, { available: false })).json, { before: true, after: false });
    void dev;

    console.log("\n── ح. التدقيق ──");
    same("ح.١ الإنشاء", await auditCount("physio_protocol", P, "create"), 1);
    same("ح.٢ التعديلان", await auditCount("physio_protocol", P, "update"), 2);
    same("ح.٣ الاعتمادان", await auditCount("physio_protocol", P, "approve"), 2);
    same("ح.٤ الأرشفةُ والاستعادة", [await auditCount("physio_protocol", P, "archive"), await auditCount("physio_protocol", P, "restore")], [1, 1]);
    same("ح.٥ الصورة: رفعٌ وحذف", [await auditCount("physio_protocol_image", imgId, "create"), await auditCount("physio_protocol_image", imgId, "delete")], [1, 1]);
    same("ح.٦ التوفّر: تبديلان", await auditCount("physio_device_branch", D1, "update"), 2);
  } finally {
    httpServer.close();
    await cleanup();
    await pool.end();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
