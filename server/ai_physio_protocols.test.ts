// المساعدُ يجيب عن بروتوكولات العلاج الطبيعي (§4.cj — قرارُ المالك ٢٠٢٦-١٠-٠٧).
// `npm run test:ai-physio-protocols` — على Postgres محلّي وعبر `executeTool` نفسِه كما في الإنتاج.
//
// يحرس: (أ) المساعدُ يجد المكتبةَ في فهرس القدرات ويقرؤها؛ (ب) الموجزُ يصل كاملاً — النصوصُ والجرعةُ والأجهزةُ معاً، لا الأجهزةُ وحدها؛
// (ج) باللغة المطلوبة، والمسوّدةُ تُقال؛ (د) للمستشيرين وحدهم: الأخصائيّ والمشرف والطبيب ومدير الفرع والمسؤول — لا المنفّذون ولا
// الاستقبال، والصفحةُ تبقى مفتوحةً للمنفّذ؛ (هـ) التفصيلُ الكامل ممنوعٌ على المساعد بسببه.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "ai-physio-protocols-test-secret";

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { executeTool, toolsFor } from "./ai/tools/registry";
import { aiChat } from "./ai/chat";
import { safeAiComplete } from "./ai/provider";
import { searchTokens } from "./physio_protocols/store";
import { resolveAiAccess } from "./ai/access";
import { SEED, sql as seedSql } from "./migrations/107_physio_protocol_seed";
import { sql as englishSql } from "./migrations/108_physio_protocol_english";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6987;
const B1 = 9641;
const ADMIN = 9642, SUP = 9643, SPEC = 9644, TECH = 9645, DOC = 9646, MGR = 9647, REC = 9648;
const IDS = [ADMIN, SUP, SPEC, TECH, DOC, MGR, REC];
const CODES = SEED.map((p) => p.code);
const KNEE = "knee-oa-geriatric";

const q = (t: string, p: any[] = []) => pool.query(t, p);
const BROWSER_HEADERS = {
  host: "example.invalid", connection: "keep-alive", "content-length": "312", accept: "*/*",
  "content-type": "application/json", "accept-language": "ar", cookie: "connect.sid=s%3Afake.signature",
};
function session(u: any) {
  const s: any = { branchSession: u, destroyed: false };
  s.destroy = (cb: any) => { s.destroyed = true; if (cb) cb(); return s; };
  return s;
}

async function cleanup() {
  await q(`DELETE FROM physio_device_branches WHERE branch_id = $1`, [B1]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

async function main() {
  await cleanup();
  //  القالبُ يحمل الزرعَ والترجمة؛ وإن لم يحملهما (قاعدةٌ أقدم) فالترحيلان نفسُهما — والإعادةُ لا تكرّر.
  await q(seedSql);
  await q(englishSql);
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع اختبار مساعد البروتوكولات')`, [B1]);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_supervise_physio)
           VALUES ($1, 'ap-admin', 'x', 'المسؤول', 'admin', NULL, '[]', true, false),
                  ($2, 'ap-sup', 'x', 'سليم', 'branch_manager', $8, $9::jsonb, true, true),
                  ($3, 'ap-spec', 'x', 'مصطفى', 'physio_specialist', $8, $9::jsonb, true, false),
                  ($4, 'ap-tech', 'x', 'تقنيّ', 'physio_technician', $8, $9::jsonb, true, false),
                  ($5, 'ap-doc', 'x', 'طبيب', 'doctor', $8, $9::jsonb, true, false),
                  ($6, 'ap-mgr', 'x', 'مدير', 'branch_manager', $8, $9::jsonb, true, false),
                  ($7, 'ap-rec', 'x', 'استقبال', 'reception', $8, $9::jsonb, true, false)`,
    [ADMIN, SUP, SPEC, TECH, DOC, MGR, REC, B1, JSON.stringify([B1])]);
  const knee = (await q(`SELECT id FROM physio_protocols WHERE code = $1`, [KNEE])).rows[0].id as number;
  const exerciseId = (await q(`SELECT id FROM devices WHERE code = 'exercise'`)).rows[0].id as number;
  await q(`INSERT INTO physio_device_branches (device_id, branch_id, available) VALUES ($1, $2, true)`, [exerciseId, B1]);

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const h = req.get("x-test-session");
    if (h) req.session = { branchSession: JSON.parse(Buffer.from(h, "base64").toString("utf8")), destroy: (cb: () => void) => cb() };
    next();
  });
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise<void>((r) => httpServer.once("listening", () => r()));

  const sessOf = (id: number, role: string, extra: Record<string, unknown> = {}) => ({
    userId: id, displayName: role, role, branchId: id === ADMIN ? null : B1, isAdmin: id === ADMIN,
    accessibleBranches: id === ADMIN ? null : [B1], permissions: {}, ...extra,
  });
  const S = {
    admin: sessOf(ADMIN, "admin"), sup: sessOf(SUP, "branch_manager", { permissions: { canSupervisePhysio: true } }),
    spec: sessOf(SPEC, "physio_specialist"), tech: sessOf(TECH, "physio_technician"), doc: sessOf(DOC, "doctor"),
    mgr: sessOf(MGR, "branch_manager"), rec: sessOf(REC, "reception"),
  };
  const ai = (u: any, name: string, input: any) =>
    executeTool(resolveAiAccess({ session: u, branchName: null, scopeBranchId: u.branchId }), name, input,
      { app, source: { session: session(u), headers: BROWSER_HEADERS } } as any);
  const read = (u: any, path: string, query: Record<string, unknown> = {}, pathParams?: Record<string, unknown>) =>
    ai(u, "read_capability", { name: path, query, ...(pathParams ? { pathParams } : {}) });
  const page = async (u: any, path: string) =>
    (await fetch(`http://127.0.0.1:${PORT}${path}`, { headers: { "x-test-session": Buffer.from(JSON.stringify(u)).toString("base64") } })).status;

  try {
    console.log("\n── أ. المساعدُ يجد المكتبةَ ويقرؤها ──");
    const found = await ai(S.spec, "list_capabilities", { topic: "بروتوكول علاج طبيعي ركبة" });
    const names = ((found as any).data?.capabilities ?? []).map((c: any) => c.name);
    check(names.includes("/api/physio/protocols"), "أ.١ الفهرسُ يُرجع المكتبةَ لسؤالٍ عن بروتوكول", JSON.stringify(names));
    const foundEn = await ai(S.doc, "list_capabilities", { topic: "physiotherapy protocol for a child with cerebral palsy" });
    check(((foundEn as any).data?.capabilities ?? []).some((c: any) => c.name === "/api/physio/protocols"), "أ.١ب وسؤالٌ بالإنكليزية يجدها أيضاً",
      JSON.stringify(((foundEn as any).data?.capabilities ?? []).map((c: any) => c.name)));
    const listed = await read(S.spec, "/api/physio/protocols", { q: "knee", ageGroup: "geriatric" });
    //  «knee» يطابق خشونةَ الركبة واستبدالَ الركبة (Total Knee Arthroplasty) — وكلاهما لكبار السنّ.
    //  **والبحثُ صار في المحتوى أيضاً** (§4.dc، طلبُ المالك): ما في اسمه «knee» أوّلاً بترتيب الأدقّ، ثمّ ما يذكرها في محتواه (خشونةُ الورك واليد).
    const listedCodes: string[] = ((listed as any).data?.rows ?? []).map((r: any) => r.code);
    same("أ.٢ القائمةُ تجد بروتوكولاتِ الركبة بالمصطلح الإنكليزي والعمر — أوّلاً", listedCodes.slice(0, 2).sort(), [KNEE, "tka-geriatric"]);
    const kids = await read(S.doc, "/api/physio/protocols", { ageGroup: "pediatric" });
    check(((kids as any).data?.rows ?? []).length >= 4, "أ.٣ وبروتوكولاتُ الأطفال تُقرأ بالعمر", JSON.stringify((kids as any).data));

    console.log("\n── ب. الموجزُ يصل كاملاً ──");
    const en = await read(S.doc, "/api/physio/protocols/:id/brief", { lang: "en" }, { id: knee });
    const pe = (en as any).data?.value?.protocol;
    check(!!pe, "ب.١ الموجزُ يمضي كائناً واحداً لا صفوفَ أجهزة", JSON.stringify((en as any).data).slice(0, 300));
    //  وعددُ الجلسات معها (ترحيل ١٢٣، §4.dd) — مملوءٌ من القديم بجلسات الأسبوع × الأسابيع.
    same("ب.٢ العنوانُ والجرعة", [pe?.title, pe?.dose], ["Knee Osteoarthritis", { totalSessions: 16, sessionsPerWeek: 2, durationWeeks: 8, minutesPerSession: 45 }]);
    check(typeof pe?.goals === "string" && pe.goals.startsWith("Reduce pain") && typeof pe?.contraindications === "string",
      "ب.٣ والأهدافُ والموانعُ معه", JSON.stringify([pe?.goals, pe?.contraindications]));
    const ex = (pe?.devices ?? []).find((d: any) => d.code === "exercise");
    //  ألفاظُ درجة الدليل بقرار المالك (ترحيل ١٢٢، §4.cx): تقول الدليلَ لا القرار — و«استعمالُ المركز» بجانبها.
    same("ب.٤ والأجهزةُ بدرجتها ودقائقها ومعاملاتها", [ex?.device, ex?.evidence, ex?.minutes, ex?.parameters], ["Exercise", "Strong evidence", 35, "Strengthening + aerobic + balance"]);
    same("ب.٥ وتوفّرُها في فرع السائل", ex?.availableInAskersBranch, true);
    same("ب.٦ وجهازٌ غيرُ مفعَّل في فرعه يُقال", (pe?.devices ?? []).find((d: any) => d.code === "electro")?.availableInAskersBranch, false);

    console.log("\n── ج. اللغةُ والمسوّدة ──");
    check(String(pe?.statusNote ?? "").startsWith("DRAFT"), "ج.١ المسوّدةُ تُقال بالإنكليزية", pe?.statusNote);
    const ar = (await read(S.doc, "/api/physio/protocols/:id/brief", { lang: "ar" }, { id: knee }) as any).data?.value?.protocol;
    same("ج.٢ وبالعربية عنوانُها ودرجتُها", [ar?.title, (ar?.devices ?? []).find((d: any) => d.code === "exercise")?.evidence], ["خشونة الركبة", "دليلٌ قويّ"]);
    check(String(ar?.statusNote ?? "").includes("مسوّدة"), "ج.٣ والمسوّدةُ تُقال بالعربية", ar?.statusNote);
    await q(`UPDATE physio_protocols SET exercises_en = NULL WHERE id = $1`, [knee]);
    const fb = (await read(S.doc, "/api/physio/protocols/:id/brief", { lang: "en" }, { id: knee }) as any).data?.value?.protocol;
    same("ج.٤ والحقلُ غيرُ المترجَم يعود بالعربية ويُسمّى", [fb?.exercises === ar?.exercises, fb?.untranslated?.fields], [true, ["exercises"]]);

    console.log("\n── د. للمستشيرين وحدهم ──");
    for (const [who, u] of [["المسؤول", S.admin], ["المشرف العام", S.sup], ["الأخصائيّ", S.spec], ["مدير الفرع", S.mgr]] as const) {
      const r = await read(u, "/api/physio/protocols/:id/brief", { lang: "ar" }, { id: knee });
      check((r as any).ok === true, `د — ${who} يسأل فيُجاب`, JSON.stringify((r as any).data).slice(0, 200));
    }
    const techList = await read(S.tech, "/api/physio/protocols", { q: "knee" });
    check((techList as any).ok === false && String((techList as any).data?.error).includes("يجيب المساعدُ"), "د.٥ التقنيُّ يسأل المساعدَ فيُردّ بالسبب", JSON.stringify((techList as any).data));
    same("د.٦ والموجزُ كذلك للتقنيّ", (await read(S.tech, "/api/physio/protocols/:id/brief", {}, { id: knee }) as any).ok, false);
    same("د.٧ والاستقبالُ لا يُجاب", (await read(S.rec, "/api/physio/protocols", { q: "knee" }) as any).ok, false);
    same("د.٨ والصفحةُ تبقى مفتوحةً للتقنيّ (بلا المساعد)", await page(S.tech, "/api/physio/protocols"), 200);
    same("د.٩ ومديرُ الفرع يقرأ الصفحةَ أيضاً", await page(S.mgr, "/api/physio/protocols"), 200);
    same("د.١٠ والاستقبالُ لا يقرأ الصفحة", await page(S.rec, "/api/physio/protocols"), 403);

    console.log("\n── هـ. التفصيلُ الكامل ممنوعٌ على المساعد ──");
    same("هـ.١ /api/physio/protocols/:id لا يُنادى", (await read(S.admin, "/api/physio/protocols/:id", {}, { id: knee }) as any).ok, false);
    same("هـ.٢ ولا مصفوفةُ التوفّر", (await read(S.admin, "/api/physio/devices") as any).ok, false);

    console.log("\n── و. أداةُ physio_protocol_lookup — سؤالُ المالك بحرفه ──");
    same("و.١ كلماتُ الحالة وحدها من السؤال العربيّ", searchTokens("طفل عمره 6 سنوات عنده شلل دماغي. شنو خطته وأجهزته ومدة علاجه؟"), ["شلل", "دماغي"]);
    same("و.٢ ومن الإنكليزيّ", searchTokens("What is the protocol for knee osteoarthritis in an elderly patient?"), ["knee", "osteoarthritis"]);
    const accessOf = (u: any) => resolveAiAccess({ session: u, branchName: null, scopeBranchId: u.branchId });
    const offered = (u: any) => toolsFor(accessOf(u)).some((t) => t.name === "physio_protocol_lookup");
    same("و.٣ تُعرَض للمستشيرين: المسؤول · المشرف · الأخصائيّ · الطبيب · المدير",
      [offered(S.admin), offered(S.sup), offered(S.spec), offered(S.doc), offered(S.mgr)], [true, true, true, true, true]);
    same("و.٤ ولا تُعرَض للتقنيّ ولا للاستقبال", [offered(S.tech), offered(S.rec)], [false, false]);
    const cp: any = await executeTool(accessOf(S.doc), "physio_protocol_lookup", { query: "شلل دماغي", ageGroup: "pediatric", lang: "ar" });
    const cp0 = cp.data?.protocols?.[0];
    same("و.٥ «شلل دماغي» لطفلٍ ⟵ بروتوكولُ الشلل الدماغي", cp0?.code, "cerebral-palsy-pediatric");
    check(!!cp0?.dose?.sessionsPerWeek && (cp0?.devices ?? []).length > 0 && typeof cp0?.contraindications === "string",
      "و.٦ …بجرعته وأجهزته وموانعه", JSON.stringify(cp0).slice(0, 200));
    const kn: any = await executeTool(accessOf(S.doc), "physio_protocol_lookup", { query: "knee osteoarthritis", ageGroup: "geriatric", lang: "en" });
    same("و.٧ «knee osteoarthritis» لكبير السنّ ⟵ خشونةُ الركبة بالإنكليزية", [kn.data?.protocols?.[0]?.code, kn.data?.protocols?.[0]?.title], [KNEE, "Knee Osteoarthritis"]);
    check(String(kn.data?.protocols?.[0]?.statusNote ?? "").startsWith("DRAFT") && /draft/i.test(String(kn.data?.howToAnswer)),
      "و.٨ والمسوّدةُ تُقال، والتعليمةُ بالإنكليزية", kn.data?.howToAnswer);
    const none: any = await executeTool(accessOf(S.doc), "physio_protocol_lookup", { query: "قرحة المعدة" });
    same("و.٩ حالةٌ لا بروتوكولَ لها ⟵ لا شيء، ومعه «لا تخترع»", [none.data?.protocols?.length, /لا تخترع/.test(String(none.data?.note))], [0, true]);
    same("و.١٠ والتقنيُّ يُردّ ولو اخترع النموذجُ الاسم", (await executeTool(accessOf(S.tech), "physio_protocol_lookup", { query: "شلل دماغي" }) as any).ok, false);

    console.log("\n── ز. نصُّ النظام: اللغةُ والبروتوكولات ──");
    let seenSystem = "";
    let seenTools: string[] = [];
    const capture = (async (p: any) => { seenSystem = p.system; seenTools = (p.tools ?? []).map((t: any) => t.name); return { text: "ok", toolCalls: [], blocks: [] }; }) as any;
    await aiChat(accessOf(S.doc), [{ role: "user", content: "What is the protocol for knee osteoarthritis in an elderly patient?" }], safeAiComplete, capture);
    check(seenSystem.includes("والإنكليزية إن سأل بالإنكليزية"), "ز.١ الوضعُ العامّ يجيب بلغة السؤال — لا «العربية» وحدها");
    check(seenSystem.includes("physio_protocol_lookup") && seenSystem.includes("من اختصاصك لا خارجه"), "ز.٢ والبروتوكولاتُ من اختصاصه، باسم الأداة");
    check(seenTools.includes("physio_protocol_lookup"), "ز.٣ والأداةُ في قائمة الطبيب فعلاً", JSON.stringify(seenTools));
  } finally {
    httpServer.close();
    await cleanup();
    await pool.end();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
