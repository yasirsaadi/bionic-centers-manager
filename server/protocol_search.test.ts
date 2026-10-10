// **البحثُ في مكتبة البروتوكولات** (§4.dc — طلبُ المالك ٢٠٢٦-١٠-٠٩).
// `npm run test:protocol-search` — القاعدةُ المشتركة (`shared/protocol_search.ts`)، ثمّ البابُ الحقيقيّ `GET /api/physio/protocols?q=`
// على البروتوكولات المزروعة: الألفُ بلا همزة، والكلمةُ في المحتوى، والترتيبُ، و«وُجدت في» بلغة الصفحة، والمرشّحات.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "protocol-search-test-secret";

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { DESCRIBED } from "./ai/capabilities/catalog";
import { normalizeSearchText } from "@shared/patient_search";
import { normalizeWithMap, queryTokens, rankProtocols, titleMatches, type ProtocolDoc } from "@shared/protocol_search";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 7004;
const BASE = `http://127.0.0.1:${PORT}`;
const B1 = 8977;
const SPEC = 8996, SPEC2 = 8997;
const IDS = [SPEC, SPEC2];
const CODE = "tstps-search";

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM physio_protocols WHERE code = $1`, [CODE]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

/** النصُّ تحت مواضع التظليل. */
const marked = (text: string, ranges: [number, number][]) => ranges.map(([a, b]) => text.slice(a, b));

async function main() {
  // ══ القاعدةُ المشتركة ══
  console.log("\n── ن. التطبيع والترتيب ──");
  const samples = ["ألمُ  أسفلِ الظهرِ", "إصابـــة الركبة\nوالكاحل", "  آلام مزمنة ", "Knee  OA ٢٠٢٣", "مسؤوليّة الأخصائيّ", "ٱلشلل\tالدماغي", ""];
  same("ن.١ **التطبيعُ بخريطةٍ يطابق تطبيعَ سجلّ المرضى حرفاً بحرف** — التشكيلُ والتطويلُ والمسافاتُ وصورُ الألف والأرقام",
    samples.map((x) => normalizeWithMap(x).norm), samples.map((x) => normalizeSearchText(x)));
  same("ن.٢ كلماتُ السؤال مطبَّعةً بلا تكرار، وما دون حرفين يُترك", queryTokens("  الم   الظهر ب الظهر "), ["الم", "الظهر"]);

  const docs: ProtocolDoc[] = [
    { id: 1, fields: [
      { key: "title", label: "اسم الحالة", labelEn: "Condition", weight: 100, text: "ألم أسفل الظهر المزمن" },
      { key: "titleEn", label: "اسم الحالة", labelEn: "Condition", weight: 100, text: "Chronic low back pain" },
      { key: "goals", label: "الأهداف", labelEn: "Goals", weight: 22, text: "تقويةُ عضلات الجذع وتمارينُ ركبةٍ إلى الصدر (NICE)" },
      { key: "goalsEn", label: "الأهداف", labelEn: "Goals", weight: 22, text: "Trunk strengthening and knee to chest (NICE)" },
    ] },
    { id: 2, fields: [
      { key: "title", label: "اسم الحالة", labelEn: "Condition", weight: 100, text: "خشونة الركبة" },
      { key: "titleEn", label: "اسم الحالة", labelEn: "Condition", weight: 100, text: "Knee osteoarthritis" },
      { key: "summary", label: "نظرة عامة", labelEn: "Overview", weight: 30, text: "الألمُ في الركبة يزداد بالدرج" },
      { key: "summaryEn", label: "نظرة عامة", labelEn: "Overview", weight: 30, text: "Pain on stairs (NICE NG226)" },
    ] },
    { id: 3, fields: [
      { key: "title", label: "اسم الحالة", labelEn: "Condition", weight: 100, text: "الكتف المتجمّد" },
      { key: "precautions", label: "احتياطات", labelEn: "Precautions", weight: 12, text: "لا تُجبَر الحركةُ فوق الألم" },
    ] },
  ];
  const r1 = rankProtocols(docs, "الم الظهر");
  same("ن.٣ **«الم الظهر» بلا همزة تجد «ألم أسفل الظهر»** — في الاسم، وكلُّ الكلمات شرط", r1.map((m) => [m.id, m.inTitle]), [[1, true]]);
  same("ن.٤ **والتظليلُ على الكلمة كما كُتبت** — «ألم» بهمزتها في الاسم", marked("ألم أسفل الظهر المزمن", r1[0]?.titleRanges.ar ?? []), ["ألم", "الظهر"]);
  const r2 = rankProtocols(docs, "ركبه");
  same("ن.٥ **«ركبه» تجد «ركبة» في الاسم أوّلاً ثمّ في المحتوى** — والاسمُ يسبق", r2.map((m) => m.id), [2, 1]);
  const hit = r2.find((m) => m.id === 1)?.hits[0];
  same("ن.٦ **و«وُجدت في»**: مكانُها ومقتطفٌ يظلّل «ركبةٍ» بتنوينها", [hit?.label, marked(hit?.snippet ?? "", hit?.ranges ?? [])], ["الأهداف", ["ركبة"]]);
  same("ن.٧ **و«الركبة» بأداة التعريف تجد «ركبة» بدونها**", rankProtocols(docs, "الركبة").map((m) => m.id), [2, 1]);
  same("ن.٨ **والكلمةُ في المحتوى وحده تُظهر البروتوكول**: «تجبر» في الاحتياطات", rankProtocols(docs, "تجبر الحركة").map((m) => [m.id, m.hits[0]?.label]), [[3, "احتياطات"]]);
  same("ن.٩ **الموضعُ مرّةً بلغة الصفحة**: «NICE» في النسختين ⟵ العربيةُ إن طُلبت، والإنكليزيةُ بلا تحديد لسؤالٍ لاتينيّ",
    [rankProtocols(docs, "NICE", { lang: "ar" }).find((m) => m.id === 1)?.hits.map((h) => h.key),
      rankProtocols(docs, "NICE").find((m) => m.id === 1)?.hits.map((h) => h.key)],
    [["goals"], ["goalsEn"]]);
  same("ن.١٠ **والعبارةُ متّصلةً فوق كلماتها متفرّقة**", (() => {
    const d: ProtocolDoc[] = [
      { id: 7, fields: [{ key: "summary", label: "s", labelEn: "s", weight: 30, text: "ألم في الرقبة ثم الظهر" }] },
      { id: 8, fields: [{ key: "summary", label: "s", labelEn: "s", weight: 30, text: "يشكو من ألم الظهر" }] },
    ];
    return rankProtocols(d, "الم الظهر").map((m) => m.id);
  })(), [8, 7]);
  const wd: ProtocolDoc[] = [
    { id: 11, fields: [{ key: "summary", label: "s", labelEn: "s", weight: 30, text: "نُقل بمركبةِ الإسعاف" }] },
    { id: 12, fields: [{ key: "summary", label: "s", labelEn: "s", weight: 30, text: "تمارينُ للركبتين وبالركبة" }] },
    { id: 13, fields: [{ key: "summaryEn", label: "s", labelEn: "s", weight: 30, text: "Knee osteoarthritis" }] },
  ];
  same("ن.١٠ب **بداياتُ الكلمات لا أجزاؤها**: «ركب» لا تجد «بمركبة» وتجد «الركبتين» و«بالركبة» — والإنكليزيةُ تقبل الجزءَ («arthritis» في osteoarthritis)",
    [rankProtocols(wd, "ركب").map((m) => m.id), rankProtocols(wd, "arthritis").map((m) => m.id)], [[12], [13]]);
  same("ن.١١ ولا شيءَ لسؤالٍ فارغ أو بحرفٍ واحد أو بلا مطابقة", [rankProtocols(docs, " ").length, rankProtocols(docs, "ا").length, rankProtocols(docs, "زززز").length], [0, 0, 0]);
  same("ن.١٢ **ومنتقي بروتوكول الخطّة بالقاعدة نفسِها** (الاسمُ وحده)",
    [titleMatches("الم الظهر", "ألم أسفل الظهر المزمن", "Chronic LBP"), titleMatches("LOW back", "ألم", "Chronic low back pain"), titleMatches("ركبه", "ألم الظهر", "LBP"), titleMatches("", "x", "y")],
    [true, true, false, true]);

  // ══ البابُ الحقيقيّ ══
  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع بحث البروتوكولات')`, [B1]);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active)
           VALUES ($1, 'ps-spec', 'x', 'مصطفى', 'physio_specialist', $3, $4::jsonb, true),
                  ($2, 'ps-spec2', 'x', 'علي', 'physio_specialist', $3, $4::jsonb, true)`, [SPEC, SPEC2, B1, JSON.stringify([B1])]);
  const S = { spec: hdr({ userId: SPEC, displayName: "مصطفى", role: "physio_specialist", branchId: B1, isAdmin: false, permissions: {} }) };
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
  const search = async (term: string, extra = "") => {
    const r = await fetch(`${BASE}/api/physio/protocols?q=${encodeURIComponent(term)}${extra}`, { headers: { "x-test-session": S.spec } });
    return { status: r.status, json: await r.json().catch(() => null) as any[] };
  };

  try {
    console.log("\n── ب. البابُ الحقيقيّ ──");
    const a = await search("الم الظهر");
    const lbp = a.json?.[0];
    same("ب.١ **«الم الظهر» بلا همزة: «ألم أسفل الظهر المزمن» أوّلاً** — والكلمةُ مظلّلةٌ بهمزتها في الاسم",
      [a.status, lbp?.code, marked(lbp?.titleAr ?? "", lbp?.match?.titleRanges?.ar ?? [])], [200, "lbp-chronic-adult", ["ألم", "الظهر"]]);
    same("ب.٢ **و«ألم الظهر» بهمزتها النتائجُ نفسُها بترتيبها**", (await search("ألم الظهر")).json.map((r) => r.id), a.json.map((r) => r.id));
    const k = (await search("ركبه")).json;
    const firstContent = k.findIndex((r) => !r.match?.inTitle);
    check(k.length >= 3 && k.slice(0, firstContent).every((r) => r.match.inTitle) && k.slice(firstContent).every((r) => !r.match.inTitle)
      && k.some((r) => r.code === "knee-oa-geriatric" && r.match.inTitle),
      "ب.٣ **«ركبه» تجد كلَّ بروتوكولٍ فيه «ركبة»**: ما في اسمه أوّلاً (خشونةُ الركبة…) ثمّ ما في محتواه", JSON.stringify(k.map((r) => [r.code, r.match?.inTitle])));
    const j = (await search("الجسر")).json;
    same("ب.٤ **وكلمةٌ في بطاقة تمرين** («الجسر») تُظهر بروتوكولَها ومكانَها «تمارين المرحلة»",
      [j.map((r) => r.code), j[0]?.match?.hits?.some((h: any) => /^تمارين المرحلة/.test(h.label))], [["lbp-chronic-adult"], true]);
    const t = (await search("تيكار")).json;
    check(t.length > 0 && t.every((r) => r.match.hits.some((h: any) => h.label === "الأجهزة" && marked(h.snippet, h.ranges).includes("تيكار"))),
      "ب.٥ **واسمُ جهاز** («تيكار») يُظهر كلَّ بروتوكولٍ فيه — «الأجهزة: تيكار»", JSON.stringify(t.map((r) => [r.code, r.match.hits.map((h: any) => h.label)])));
    const en = (await search("knee", "&lang=en")).json;
    const enHit = en.find((r) => !r.match.inTitle)?.match?.hits?.[0];
    same("ب.٦ **وبالإنكليزية بلغة الصفحة**: المكانُ والمقتطفُ إنكليزيان", [en[0]?.match?.inTitle, /^[\x00-\x7F]/.test(enHit?.snippet?.replace(/^… /, "") ?? ""), enHit?.key?.endsWith("En")], [true, true, true]);
    const nice = async (extra: string) => ((await search("NICE", extra)).json.find((r) => r.code === "lbp-chronic-adult")?.match?.hits ?? []).map((h: any) => h.key);
    const [niceAr, niceDefault] = [await nice("&lang=ar"), await nice("")];
    same("ب.٦ب **ولغةُ الصفحة تغلب لغةَ السؤال**: «NICE» في صفحةٍ عربية مقتطفُه عربيّ، وبلا لغةٍ إنكليزيّ",
      [niceAr.length > 0 && niceAr.every((k: string) => !k.endsWith("En")), niceDefault.length > 0 && niceDefault.every((k: string) => k.endsWith("En"))], [true, true]);
    same("ب.٧ **والمرشّحاتُ تبقى**: «الم الظهر» للأطفال لا تُظهر بروتوكولاتِ البالغين",
      (await search("الم الظهر", "&ageGroup=pediatric")).json.some((r) => r.code === "lbp-chronic-adult"), false);
    const plain = await fetch(`${BASE}/api/physio/protocols`, { headers: { "x-test-session": S.spec } }).then((r) => r.json());
    same("ب.٨ **وبلا سؤال القائمةُ كما كانت** — كلُّها، بلا «وُجدت في»", [plain.length >= 44, plain.some((r: any) => r.match)], [true, false]);
    same("ب.٩ وكلمةٌ لا توجد ⟵ قائمةٌ فارغة", (await search("زززز")).json.length, 0);

    //  وما يُكتب اليوم في بروتوكولٍ يُبحث عنه في الحال.
    await q(`INSERT INTO physio_protocols (code, title_ar, title_en, category, age_group, status, precautions)
             VALUES ($1, 'بروتوكول اختبار البحث', 'Search test protocol', 'other', 'adult', 'draft', 'يُتجنّب الضغطُ على النتوء الأخرميّ')`, [CODE]);
    const nw = (await search("النتوء الاخرمي")).json;
    same("ب.١٠ **ونصٌّ كُتب الآن في الاحتياطات يُوجد فوراً** — ولو كُتب «الأخرميّ» بهمزةٍ وشدّة",
      [nw.map((r) => r.code), nw[0]?.match?.hits?.[0]?.label, marked(nw[0]?.match?.hits?.[0]?.snippet ?? "", nw[0]?.match?.hits?.[0]?.ranges ?? [])],
      [[CODE], "احتياطات", ["النتوء الأخرمي"]]);
    check(/محتوى البروتوكول/.test(String((DESCRIBED as any)["/api/physio/protocols"]?.d ?? "")),
      "ب.١١ **والمساعدُ يعرف أنّ البحث يشمل المحتوى** — في وصف فهرس القدرات");
  } finally {
    await cleanup();
    httpServer.close();
    await pool.end();
  }
  console.log(failures === 0 ? "\nكلُّ التأكيدات نجحت." : `\n${failures} تأكيداً سقط.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); } catch { /* */ }
  process.exit(1);
});
