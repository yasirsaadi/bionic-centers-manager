// **«اضغطه يا سليم» والبروتوكولُ المكتمل بلونه** (ترحيل ١٣٩، §4.dy).
// `npm run test:physio-supervisor-checklist` — حيٌّ على النقاط الحقيقية (منفذ ٧٠١٢، فرع ٨٩٦٥، مستخدمون ٨٩٦٦–٨٩٧٠). يحرس:
//   ق — المحسوبُ من البيانات (`liveChecks`) والبنودُ المكتوبة قبل القاعدة: رموزٌ فريدة ونصٌّ باللغتين وموضوعٌ معروف ولا «**».
//   أ — الترحيلُ على القاعدة: بنودُ كلّ بروتوكولٍ مفصَّل كما كُتبت، ولا شيءَ لغير المفصَّل، والإعادةُ لا تكرّر ولا تُرجع بنداً منجَزاً، **وكلُّ بروتوكولٍ له مراحل
//       له بنود** (البروتوكولُ القادم يزرع بنودَه في ترحيله)، والحذفُ يمرّ بها.
//   ب — من الأبواب: القائمةُ تقول «مفصَّل» وكم بنداً مفتوحاً، و«المفصَّلة» مرشّح؛ والصفحةُ تحمل البنود؛ وسليم والمسؤولُ يعلّمان «تمّ» بقرارٍ ويعيدان،
//       بسطر تدقيق؛ والأخصائيُّ والتقنيّ لا (٤٠٣)؛ والبندُ المجهول ٤٠٤، والمدخلُ الفاسد ٤٠٠.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "physio-supervisor-checklist-test-secret";

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import * as m139 from "./migrations/139_physio_supervisor_checklist";
import * as m140 from "./migrations/140_physio_tha_detail";
import { CHECKLIST_NOTE_MAX, CHECKLIST_TOPICS, isDetailedProtocol, liveChecks, openItemsCount, supervisorTodoCount } from "@shared/physio_supervisor_checklist";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 7012;
const BASE = `http://127.0.0.1:${PORT}`;
const B1 = 8965;
const ADMIN = 8966, SUP = 8967, SPEC = 8969, TECH = 8970;
const IDS = [ADMIN, SUP, SPEC, TECH];
const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");
const TKA = "tka-geriatric";

async function cleanup() {
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`UPDATE physio_protocol_checklist SET done_at = NULL, done_by = NULL, done_by_name = NULL, note = NULL WHERE done_by = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM physio_protocols WHERE code = 'test-checklist-cascade'`);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

async function main() {
  // ══ ق. قبل القاعدة ══
  console.log("\n── ق. المحسوبُ والبنودُ المكتوبة ──");
  //  بنودُ ١٣٩ للأحد عشر، ثمّ كلُّ مفصَّلٍ بعده يزرع بنودَه في ترحيله بـ`checklistSql` (§4.dy) — فيُضاف هنا.
  const all = Object.entries({ ...m139.ITEMS, [m140.PROTOCOL.code]: m140.CHECKLIST });
  const issues = all.flatMap(([code, items]) => [
    ...(items.length ? [] : [`${code}: بلا بنود`]),
    ...(new Set(items.map((i) => i.key)).size === items.length ? [] : [`${code}: رمزٌ مكرّر`]),
    ...items.filter((i) => !/^[a-z0-9][a-z0-9-]{0,59}$/.test(i.key)).map((i) => `${code}.${i.key}: رمزٌ لا يقبله الباب`),
    ...items.filter((i) => !(CHECKLIST_TOPICS as readonly string[]).includes(i.topic)).map((i) => `${code}.${i.key}: موضوعٌ مجهول`),
    ...items.filter((i) => !i.ar.trim() || !i.en.trim()).map((i) => `${code}.${i.key}: نصٌّ ناقص`),
    ...items.filter((i) => (i.ar + i.en).includes("**")).map((i) => `${code}.${i.key}: «**»`),
  ]);
  same("ق.١ **كلُّ بندٍ برمزٍ فريد يقبله الباب، وموضوعٍ معروف، ونصٍّ باللغتين بلا «**»** — والبروتوكولاتُ الاثنا عشرَ المفصَّلة كلُّها لها بنود",
    [issues, all.length], [[], 12]);

  const blockers = [{ code: "shockwaves", nameAr: "موجات صادمة", nameEn: "Shockwaves", missing: [{ ar: "التردّد", en: "Frequency" }] }];
  const card = (status: string, urls: (string | null)[]) => ({ status, nameAr: "x", images: urls.map((url) => ({ url })) });
  const phases = [
    { exercises: [{ exerciseId: 1, exercise: card("draft", [null, "/a.webp"]) }, { exerciseId: 2, exercise: card("approved", ["/b.webp"]) }] },
    { exercises: [{ exerciseId: 1, exercise: card("draft", [null, "/a.webp"]) }] },
  ];
  const live = liveChecks({ status: "draft", settingsBlockers: blockers, measuresStatus: "draft", phases });
  same("ق.٢ **المحسوبُ بالترتيب**: إعداداتُ الجهاز تنتظره، والبطاقةُ المكرّرة في مرحلتين تُعدّ مرّة (١ من ٢ مسوّدة)، والمقاييسُ والاعتمادُ ينتظرانه، والصورةُ للعلم",
    live.map((c) => [c.key, c.state]), [["settings-shockwaves", "todo"], ["cards", "todo"], ["measures", "todo"], ["approve", "todo"], ["images", "info"]]);
  check(/مسوّدة في مراحله: ١ من ٢/.test(live.find((c) => c.key === "cards")?.ar ?? ""), "ق.٣ **ونصُّ البطاقات يقول العددين** («١ من ٢»)", live.find((c) => c.key === "cards")?.ar ?? "");
  const ready = liveChecks({ status: "approved", approvedByName: "سليم", settingsBlockers: [], measuresStatus: "approved",
    phases: [{ exercises: [{ exerciseId: 2, exercise: card("approved", ["/b.webp"]) }] }] });
  same("ق.٤ **والمكتملُ كلُّه «تمّ»** (لا جهازَ ناقص، والبطاقاتُ والمقاييسُ والاعتماد) — ولا سطرَ صورٍ حين لا ينقص شيء",
    ready.map((c) => [c.key, c.state]), [["settings", "done"], ["cards", "done"], ["measures", "done"], ["approve", "done"]]);
  same("ق.٥ **وما ينتظر سليمَ** = البنودُ المفتوحة + المحسوبُ «ينتظرك»، والمفصَّلُ ما له مراحل",
    [supervisorTodoCount({ status: "draft", settingsBlockers: blockers, measuresStatus: "draft", phases, checklist: [{ doneAt: null }, { doneAt: "2026-10-13" }] }),
      openItemsCount([{ doneAt: null }, { doneAt: new Date() }]), isDetailedProtocol(3), isDetailedProtocol(0), isDetailedProtocol(null)],
    [5, 1, true, false, false]);

  // ══ أ. الترحيل على القاعدة ══
  console.log("\n── أ. ترحيل ١٣٩ على القاعدة ──");
  await cleanup();
  const counts = async () => Object.fromEntries((await q(`SELECT p.code, count(c.id)::int AS n FROM physio_protocols p
      JOIN physio_protocol_checklist c ON c.protocol_id = p.id GROUP BY p.code ORDER BY p.code`)).rows.map((r) => [r.code, r.n]));
  await q(m139.sql);
  const c0 = await counts();
  same("أ.١ **بنودُ كلّ بروتوكولٍ مفصَّل كما كُتبت** في الترحيل، ولا بندَ لغيره",
    c0, Object.fromEntries(all.map(([code, items]): [string, number] => [code, items.length]).sort((a, b) => (a[0] < b[0] ? -1 : 1))));
  const withPhases = (await q(`SELECT p.code FROM physio_protocols p WHERE EXISTS (SELECT 1 FROM physio_protocol_phases ph WHERE ph.protocol_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM physio_protocol_checklist c WHERE c.protocol_id = p.id) ORDER BY 1`)).rows.map((r) => r.code);
  same("أ.٢ **وكلُّ بروتوكولٍ له مراحل له بنود** — فالبروتوكولُ المفصَّل القادم لا يدخل بلا «اضغطه يا سليم» (يزرعها ترحيلُه بـ`checklistSql`)", withPhases, []);
  await q(`UPDATE physio_protocol_checklist SET done_at = now(), done_by_name = 'سليم', note = 'قرارُ سليم'
            WHERE item_key = 'dose' AND protocol_id = (SELECT id FROM physio_protocols WHERE code = $1)`, [TKA]);
  await q(m139.sql);
  const kept = (await q(`SELECT c.note, c.done_at IS NOT NULL AS done FROM physio_protocol_checklist c JOIN physio_protocols p ON p.id = c.protocol_id
      WHERE p.code = $1 AND c.item_key = 'dose'`, [TKA])).rows[0];
  same("أ.٣ **والإعادةُ لا تكرّر ولا تُرجع بنداً منجَزاً** — قرارُ سليم باقٍ", [await counts(), kept], [c0, { note: "قرارُ سليم", done: true }]);
  await q(`UPDATE physio_protocol_checklist SET done_at = NULL, done_by_name = NULL, note = NULL WHERE item_key = 'dose'
            AND protocol_id = (SELECT id FROM physio_protocols WHERE code = $1)`, [TKA]);
  const tmp = Number((await q(`INSERT INTO physio_protocols (code, title_ar, title_en, category, age_group, status)
      VALUES ('test-checklist-cascade', 'اختبار', 'Test', 'spine', 'adult', 'draft') RETURNING id`)).rows[0].id);
  await q(`INSERT INTO physio_protocol_checklist (protocol_id, item_key, topic, text_ar, text_en) VALUES ($1, 'x', 'dose', 'س', 'Q')`, [tmp]);
  await q(`DELETE FROM physio_protocols WHERE id = $1`, [tmp]);
  same("أ.٤ **وحذفُ البروتوكول يمرّ ببنوده** (`ON DELETE CASCADE`)",
    (await q(`SELECT count(*)::int AS n FROM physio_protocol_checklist WHERE protocol_id = $1`, [tmp])).rows[0].n, 0);

  // ══ ب. من الأبواب ══
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع اضغطه يا سليم')`, [B1]);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_supervise_physio)
           VALUES ($1, 'psc-admin', 'x', 'المسؤول', 'admin', NULL, '[]', true, false),
                  ($2, 'psc-sup', 'x', 'سليم', 'branch_manager', $5, $6::jsonb, true, true),
                  ($3, 'psc-spec', 'x', 'مصطفى', 'physio_specialist', $5, $6::jsonb, true, false),
                  ($4, 'psc-tech', 'x', 'علي', 'physio_technician', $5, $6::jsonb, true, false)`,
    [ADMIN, SUP, SPEC, TECH, B1, JSON.stringify([B1])]);
  const S = {
    admin: hdr({ userId: ADMIN, displayName: "المسؤول", role: "admin", branchId: B1, isAdmin: true, permissions: {} }),
    sup: hdr({ userId: SUP, displayName: "سليم", role: "branch_manager", branchId: B1, isAdmin: false, permissions: { canSupervisePhysio: true } }),
    spec: hdr({ userId: SPEC, displayName: "مصطفى", role: "physio_specialist", branchId: B1, isAdmin: false, permissions: {} }),
    tech: hdr({ userId: TECH, displayName: "علي", role: "physio_technician", branchId: B1, isAdmin: false, permissions: {} }),
  };
  const app = express();
  app.use(express.json({ limit: "5mb" }));
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
    const r = await fetch(`${BASE}${path}`, { method, headers: { "content-type": "application/json", "x-test-session": session },
      body: body === undefined ? undefined : JSON.stringify(body) });
    let json: any = null;
    try { json = await r.json(); } catch { /* */ }
    return { status: r.status, json };
  };

  try {
    console.log("\n── ب. من الأبواب ──");
    const list = await call("GET", "/api/physio/protocols", S.spec);
    const rows: any[] = Array.isArray(list.json) ? list.json : [];
    const detailed = rows.filter((r) => isDetailedProtocol(r.phaseCount)).map((r) => r.code).sort();
    const tka = rows.find((r) => r.code === TKA);
    same("ب.١ **القائمةُ تقول مَن اكتمل** (الاثنا عشرَ لهم مراحل، والباقي بلا) **وكم سؤالاً مفتوحاً لسليم** على كلّ بروتوكول",
      [list.status, detailed, tka?.openItems, rows.filter((r) => !isDetailedProtocol(r.phaseCount)).every((r) => r.openItems === 0)],
      [200, all.map(([c]) => c).sort(), m139.ITEMS[TKA].length, true]);
    const only = await call("GET", "/api/physio/protocols?detailed=1", S.spec);
    same("ب.٢ **و«المفصَّلة بالكامل» مرشّحٌ** يُرجعها وحدها", [only.status, (only.json ?? []).map((r: any) => r.code).sort()], [200, detailed]);

    const page = async (s: string) => (await call("GET", `/api/physio/protocols/${tka.id}`, s)).json;
    const p0 = await page(S.sup);
    same("ب.٣ **وصفحةُ البروتوكول تحمل البنود بترتيبها**، مفتوحةً كلَّها، وسليم يعتمد",
      [(p0?.checklist ?? []).map((i: any) => i.key), (p0?.checklist ?? []).every((i: any) => i.doneAt === null), p0?.canApprove],
      [m139.ITEMS[TKA].map((i) => i.key), true, true]);

    const tick = await call("POST", `/api/physio/protocols/${tka.id}/checklist/dose`, S.sup, { done: true, note: "  أبقيتُه ٢٤  " });
    const p1 = await page(S.sup);
    const dose1 = (p1?.checklist ?? []).find((i: any) => i.key === "dose");
    //  القيمُ في `audit_log` نصُّ JSON (`logAudit`).
    const audit1 = (await q(`SELECT action, notes, new_values::jsonb AS new_values FROM audit_log WHERE user_id = $1 AND entity_type = 'physio_protocol' AND entity_id = $2 ORDER BY id DESC LIMIT 1`, [SUP, tka.id])).rows[0];
    same("ب.٤ **سليم يعلّم «تمّ» بقراره**: البندُ منجَزٌ باسمه وقرارِه المشذَّب، وسطرُ تدقيقٍ يقول ما تغيّر",
      [tick.status, Boolean(dose1?.doneAt), dose1?.doneByName, dose1?.note, audit1?.notes, audit1?.new_values?.checklist, audit1?.new_values?.done],
      [200, true, "سليم", "أبقيتُه ٢٤", "«اضغطه يا سليم»: بندٌ تمّ", "dose", true]);
    const l1 = (await call("GET", "/api/physio/protocols", S.spec)).json.find((r: any) => r.code === TKA);
    same("ب.٥ **والقائمةُ تُنقص سؤالاً**", l1?.openItems, m139.ITEMS[TKA].length - 1);

    const denied = await Promise.all([S.spec, S.tech].map((s) => call("POST", `/api/physio/protocols/${tka.id}/checklist/limits`, s, { done: true })));
    const limits = (await page(S.sup))?.checklist?.find((i: any) => i.key === "limits");
    same("ب.٦ **الأخصائيُّ والتقنيّ لا يعلّمان** (٤٠٣) والبندُ كما هو",
      [denied.map((d) => d.status), limits?.doneAt ?? null], [[403, 403], null]);

    const bad = await Promise.all([
      call("POST", `/api/physio/protocols/${tka.id}/checklist/no-such-item`, S.sup, { done: true }),
      call("POST", `/api/physio/protocols/${tka.id}/checklist/BAD_KEY`, S.sup, { done: true }),
      call("POST", `/api/physio/protocols/${tka.id}/checklist/limits`, S.sup, { done: "yes" }),
      call("POST", `/api/physio/protocols/${tka.id}/checklist/limits`, S.sup, { done: true, note: "x".repeat(CHECKLIST_NOTE_MAX + 1) }),
      call("POST", `/api/physio/protocols/${tka.id}/checklist/limits`, S.sup, { done: true, note: 5 }),
    ]);
    same("ب.٧ **والبندُ المجهول ٤٠٤، والرمزُ الفاسد و«تمّ» غيرُ المنطقيّ والقرارُ الطويل أو غيرُ النصّ ٤٠٠**",
      bad.map((b) => b.status), [404, 400, 400, 400, 400]);

    const reopen = await call("POST", `/api/physio/protocols/${tka.id}/checklist/dose`, S.sup, { done: false, note: "يُتجاهل" });
    const dose2 = (await page(S.sup))?.checklist?.find((i: any) => i.key === "dose");
    const audit2 = (await q(`SELECT notes, old_values::jsonb AS old_values, new_values::jsonb AS new_values FROM audit_log WHERE user_id = $1 AND entity_type = 'physio_protocol' ORDER BY id DESC LIMIT 1`, [SUP])).rows[0];
    same("ب.٨ **وإعادتُه مفتوحاً تمسح القرار** — وسطرُ تدقيقٍ بالقديم والجديد",
      [reopen.status, dose2?.doneAt ?? null, dose2?.note ?? null, audit2?.notes, audit2?.old_values?.note, audit2?.new_values?.done],
      [200, null, null, "«اضغطه يا سليم»: بندٌ أُعيد مفتوحاً", "أبقيتُه ٢٤", false]);

    const byAdmin = await call("POST", `/api/physio/protocols/${tka.id}/checklist/measures-add`, S.admin, { done: true });
    const m = (await page(S.admin))?.checklist?.find((i: any) => i.key === "measures-add");
    same("ب.٩ **والمسؤولُ يعلّم أيضاً** (قاعدةُ الاعتماد نفسُها) بلا قرارٍ مكتوب", [byAdmin.status, m?.doneByName, m?.note ?? null], [200, "المسؤول", null]);
    const specPage = await page(S.spec);
    same("ب.١٠ **والأخصائيُّ يقرأ الصفحةَ** وبنودَها ولا يعتمد", [Array.isArray(specPage?.checklist), specPage?.canApprove], [true, false]);
  } finally {
    await cleanup();
    httpServer.close();
    await pool.end();
  }
  console.log(failures === 0 ? "\nكلُّ التأكيدات نجحت." : `\n${failures} تأكيداً سقط.`);
  process.exit(failures ? 1 : 0);
}

main().catch(async (e) => { console.error(e); try { await cleanup(); } catch { /* */ } process.exit(1); });
