// «أكثرُ من جزءٍ في طلبٍ واحد» — قالبٌ وسليكونٌ وقدمٌ في استمارةٍ واحدة (طلبُ المالك ٢٠٢٦-١٠-٠٨، §4.ct، ترحيل ١١٦).
// `npm run test:multi-part-request` — القواعدُ المشتركة، ثمّ النقاطُ الحقيقية من فتح الطلب إلى أمر التصنيع وعدِّ المبيعات.
//
// يحرس قرارَ المالك: «المطلوب» مربّعاتُ اختيار — **استمارةٌ واحدة ومعاينةٌ واحدة وسعرٌ واحد وأمرُ تصنيعٍ واحد** للأجزاء معاً،
// وعدُّ المبيعات يحسب كلَّ جزءٍ في صنفه؛ والطرفُ الكامل لا يُجمع مع أجزاء، والأجزاءُ للأطراف وحدها، والقديمُ بجزئه الواحد كما هو.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "multi-part-test-secret";

import express from "express";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { getDeviceSalesSummary } from "./ai/tools/device_sales";
import {
  normalizeExtraComponents, parseRequestedItems, requestedItemLabel, requestedItemsCsv, requestedItemsOf, toggleRequestedItem,
} from "@shared/prosthetic_parts";
import { checkIntakeSheet } from "@shared/intake_sheet";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6996;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-أجزاء-عدّة";
const B1 = 9961;
const RECV = 9962, DOC = 9963, EXPERT = 9964;
const IDS = [RECV, DOC, EXPERT];

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_sub_source = $1 OR referral_source = $1`, [MARK])).rows.map((r) => Number(r.id));
  for (const id of pts) await storage.deletePatient(id);
  await q(`DELETE FROM journal_lines WHERE entry_id IN (SELECT id FROM journal_entries WHERE created_by = ANY($1::int[]))`, [IDS]);
  await q(`DELETE FROM journal_entries WHERE created_by = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

async function main() {
  // ══ القواعدُ المشتركة (بلا قاعدة بيانات) ══
  console.log("\n── القواعد ──");
  same("ق.١ **أجزاءٌ عدّة بترتيب الورقة** أيّاً كان ترتيبُ النقر — الأوّلُ «المطلوب» وما بعده الإضافيّة",
    parseRequestedItems(["foot", "socket", "silicone", "socket"], "prosthetic"),
    { ok: true, requestedItem: "socket", extraComponents: ["silicone", "foot"] });
  same("ق.٢ **والكاملُ لا يُجمع مع أجزاء**",
    [parseRequestedItems(["full_device", "socket"], "prosthetic").ok, parseRequestedItems(["full_device"], "prosthetic")],
    [false, { ok: true, requestedItem: "full_device", extraComponents: [] }]);
  same("ق.٣ والأجزاءُ للأطراف وحدها، والمجهولُ يُردّ، والقيمةُ الواحدة (نافذةٌ قديمة) كما كانت، والغيابُ «لم يُرسَل»",
    [parseRequestedItems(["socket"], "medical_support").ok, parseRequestedItems(["socket", "wheel"], "prosthetic").ok,
      parseRequestedItems("knee", "prosthetic"), parseRequestedItems([], "prosthetic")],
    [false, false, { ok: true, requestedItem: "knee", extraComponents: [] }, { ok: true, requestedItem: null, extraComponents: [] }]);
  same("ق.٤ **نقرةُ المربّع**: الجزءُ يُضاف ويمحو «الكامل»، والكاملُ يمحو الأجزاء، والنقرةُ الثانية تُرفع",
    [toggleRequestedItem(["full_device"], "foot"), toggleRequestedItem(["foot"], "socket"), toggleRequestedItem(["socket", "foot"], "full_device"),
      toggleRequestedItem(["socket", "foot"], "foot"), toggleRequestedItem(["full_device"], "full_device")],
    [["foot"], ["socket", "foot"], ["full_device"], ["socket"], []]);
  same("ق.٥ **العنوانُ يقول الأجزاءَ كلّها**، والجزءُ الواحدُ والكاملُ كما كانا",
    [requestedItemLabel("socket", "prosthetic", ["silicone", "foot"]), requestedItemLabel("socket", "prosthetic"),
      requestedItemLabel("full_device", "prosthetic", ["socket"])],
    ["القالب + السليكون + القدم", "القالب", "طرف صناعي كامل"]);
  same("ق.٦ والإضافيّةُ مطبَّعة: بلا مكرَّر ولا الأوّل ولا مجهول، وفارغةٌ لجهازٍ كامل",
    [normalizeExtraComponents("socket", ["foot", "socket", "x", "foot", "silicone"]), normalizeExtraComponents("full_device", ["socket"])],
    [["silicone", "foot"], []]);
  same("ق.٧ **والاستئنافُ يحملها نصّاً واحداً** ثمّ تعود قائمةً",
    [requestedItemsCsv("foot,socket"), requestedItemsCsv("full_device"), requestedItemsCsv("full_device,socket"), requestedItemsCsv("wheel"),
      requestedItemsOf("socket", ["foot"])],
    ["socket,foot", "full_device", "", "", ["socket", "foot"]]);
  const base = { name: "س", phone: "07701234567", governorate: "بغداد", address: "ك", referralSource: "فيسبوك", age: "40", weight: "70",
    height: "170", injuryCause: "حادث", injuryDate: "2020-01-01", department: "prosthetic", amputationSite: "احادي - طرف سفلي - يمين - تحت الركبة" };
  same("ق.٨ **والاستمارةُ تقبل الأجزاءَ قائمةً** — والكاملُ مع جزءٍ ناقصٌ يُسمّى",
    [checkIntakeSheet({ ...base, requestedItems: ["socket", "silicone"] } as any).missing, checkIntakeSheet({ ...base, requestedItems: ["full_device", "socket"] } as any).missing],
    [[], ["requestedItem"]]);

  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع الأجزاء العدّة')`, [B1]);
  for (const [id, role] of [[RECV, "reception"], [DOC, "doctor"], [EXPERT, "prosthetics_expert"]] as const) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active)
             VALUES ($1, $2, 'x', $3, $4, $5, $6::jsonb, true)`, [id, `mpr-${id}`, `مستخدم ${id}`, role, B1, JSON.stringify([B1])]);
  }
  await q(`UPDATE system_users SET medical_specialties = '["prosthetic","medical_support","physiotherapy"]'::jsonb WHERE id = $1`, [DOC]);
  await q(`UPDATE system_users SET can_add_patients = true, can_add_payments = true, can_view_payments = true WHERE id = $1`, [RECV]);
  const PAY = { canViewPatients: true, canAddPatients: true, canAddPayments: true, canViewPayments: true };
  const S = {
    recv: hdr({ userId: RECV, displayName: "استقبال", role: "reception", branchId: B1, accessibleBranches: [B1], isAdmin: false, permissions: PAY }),
    doc: hdr({ userId: DOC, displayName: "د. سامر", role: "doctor", roles: ["doctor"], branchId: B1, accessibleBranches: [B1], isAdmin: false,
      permissions: { canViewPatients: true, canWriteMedicalExam: true } }),
    admin: hdr({ userId: RECV, displayName: "المسؤول", role: "admin", isAdmin: true, branchId: B1, permissions: PAY }),
    //  الخبيرُ المسنَد يفتح أمرَه — وهو قارئُ الأجزاء الأوّل.
    expert: hdr({ userId: EXPERT, displayName: "الخبير", role: "prosthetics_expert", roles: ["prosthetics_expert"], branchId: B1,
      accessibleBranches: [B1], isAdmin: false, permissions: { canViewPatients: true } }),
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

  let seq = 0;
  async function patient(kind: "prosthetic" | "medical_support", label: string) {
    seq += 1;
    const pid = Number((await q(`INSERT INTO patients (name, phone, referral_source, referral_sub_source, age, height, weight, medical_condition, amputation_site,
        support_type, branch_id, is_amputee, is_medical_support, total_cost, patient_classification, governorate, address, injury_cause, injury_date)
      VALUES ($1, $2, 'من شخص آخر', $3, '40', '172', '78', $4, $5, $6, $7, $8, $9, 0, 'new', 'بغداد', 'الكرادة', 'حادث سير', '2021-03-04') RETURNING id`,
      [`${label} ${MARK}`, `0773${String(6000000 + seq * 7919).slice(0, 7)}`, MARK, kind === "prosthetic" ? "amputee" : kind,
        kind === "prosthetic" ? "احادي - طرف سفلي - يمين - تحت الركبة" : null, kind === "medical_support" ? "مشد" : null, B1,
        kind === "prosthetic", kind === "medical_support"])).rows[0].id);
    await q(`UPDATE patients SET phone_e164 = '+964' || substr(phone, 2) WHERE id = $1`, [pid]);
    await storage.syncPatientCases(pid);
    return pid;
  }
  const open = (pid: number, kind: string, items: unknown, servicePath = "exam") =>
    call("POST", `/api/patients/${pid}/device-episodes`, S.recv, { serviceType: kind, requestedItems: items, servicePath });
  const row = async (ep: number) => (await q(`SELECT requested_item, component, extra_components FROM patient_device_episodes WHERE id = $1`, [ep])).rows[0];
  const RX = { amputationType: "single", singleLimb: "lower", singleSide: "right", singleDetail: "تحت الركبة" };

  try {
    console.log("\n── أ. فتحُ الطلب بأجزاءٍ عدّة ──");
    const a = await patient("prosthetic", "علي");
    const ra = await open(a, "prosthetic", ["foot", "socket", "silicone"]);
    const aEp = Number(ra.json?.id);
    same("أ.١ **طلبٌ واحد** — «المطلوب» القالبُ وما بعده بترتيب الورقة، والجوابُ يقولها",
      [ra.status, await row(aEp), ra.json?.extraComponents],
      [201, { requested_item: "socket", component: "socket", extra_components: ["silicone", "foot"] }, ["silicone", "foot"]]);
    const visit = (await q(`SELECT notes FROM visits WHERE patient_id = $1 ORDER BY id DESC LIMIT 1`, [a])).rows[0];
    const review = (await q(`SELECT reception_note FROM medical_review_requests WHERE device_episode_id = $1`, [aEp])).rows[0];
    same("أ.٢ **وزيارةُ الطلب وطلبُ الطبيب يقولان الأجزاءَ كلّها**",
      [visit?.notes, /المطلوب: القالب \+ السليكون \+ القدم/.test(review?.reception_note ?? "")], ["القالب + السليكون + القدم", true]);
    const one = await open(a, "prosthetic", ["knee"]);
    same("أ.٣ وجزءٌ واحد كما كان — بلا إضافيّة", [one.status, await row(Number(one.json?.id))],
      [201, { requested_item: "knee", component: "knee", extra_components: [] }]);
    const legacy = await call("POST", `/api/patients/${a}/device-episodes`, S.recv, { serviceType: "prosthetic", requestedItem: "tube", servicePath: "exam" });
    same("أ.٤ **والنافذةُ القديمة** (`requestedItem` وحده) تعمل كما كانت", [legacy.status, (await row(Number(legacy.json?.id)))?.requested_item], [201, "tube"]);
    const n0 = Number((await q(`SELECT count(*) FROM patient_device_episodes WHERE patient_id = $1`, [a])).rows[0].count);
    const mixed = await open(a, "prosthetic", ["full_device", "socket"]);
    const sup = await patient("medical_support", "منى");
    const onSupport = await open(sup, "medical_support", ["socket", "foot"]);
    const noExam = await open(a, "prosthetic", ["socket", "foot"], "no_exam");
    same("أ.٥ **ويُردّ ولا يُكتب**: الكاملُ مع جزء، والأجزاءُ على مسند، وأجزاءٌ عدّة على «بلا معاينة»",
      [mixed.status, onSupport.status, noExam.status, Number((await q(`SELECT count(*) FROM patient_device_episodes WHERE patient_id = $1`, [a])).rows[0].count) - n0],
      [400, 400, 400, 0]);

    const wl = (await call("GET", `/api/medical/worklist`, S.doc)).json;
    const wlRows = (Array.isArray(wl) ? wl : wl?.rows ?? wl?.items ?? []) as any[];
    same("أ.٦ **و«معايناتي» تقول للطبيب الأجزاءَ كلّها**", wlRows.find((r) => Number(r.episodeId) === aEp)?.extraComponents, ["silicone", "foot"]);

    console.log("\n── ب. القيدُ في القاعدة ──");
    const full = await open(a, "prosthetic", ["full_device"]);
    const fullEp = Number(full.json?.id);
    const bad = async (sqlText: string, p: any[]) => { try { await q(sqlText, p); return "ok"; } catch (e: any) { return e?.constraint ?? e?.code ?? "err"; } };
    same("ب.١ **القاعدةُ تردّ ما لا يجوز** ولو كُتب مباشرة: إضافيّةٌ لجهازٍ كامل، وتكرارُ الأوّل، وجزءٌ مجهول",
      [await bad(`UPDATE patient_device_episodes SET extra_components = '{socket}' WHERE id = $1`, [fullEp]),
        await bad(`UPDATE patient_device_episodes SET extra_components = '{socket,foot}' WHERE id = $1`, [aEp]),
        await bad(`UPDATE patient_device_episodes SET extra_components = '{wheel}' WHERE id = $1`, [aEp])],
      ["chk_pde_extra_components", "chk_pde_extra_components", "chk_pde_extra_components"]);

    console.log("\n── ج. الطبيبُ يصحّح «المطلوب» على الاستمارة ──");
    const b = await patient("prosthetic", "حسن");
    const bEp = Number((await open(b, "prosthetic", ["socket"])).json?.id);
    const aw = (await call("GET", `/api/medical/patients/${b}/exams`, S.doc)).json;
    same("ج.١ الطبيبُ يرى ما طُلب على الجهاز المنتظر", (aw?.awaitingEpisodes ?? []).find((e: any) => e.id === bEp)?.extraComponents, []);
    const signed = await call("POST", `/api/medical/patients/${b}/exams`, S.doc, {
      idempotencyKey: randomUUID(), caseType: "prosthetic", deviceEpisodeId: bEp, chiefComplaint: "", clinicalFindings: "", plan: "", notes: "",
      diagnosis: "يحتاج قالباً وسليكوناً وقدماً.", prescription: { ...RX, prostheticType: "طرف سفلي" }, requestedItems: ["socket", "silicone", "foot"],
    });
    const au = (await q(`SELECT notes, new_values::jsonb AS nv FROM audit_log WHERE entity_type = 'patient_device_episode' AND entity_id = $1 AND action = 'update' ORDER BY id`, [bEp])).rows;
    same("ج.٢ **الطبيبُ يضيف السليكونَ والقدم** — يُكتب على الجهاز بسطر تدقيقٍ يقول القديمَ والجديد",
      [signed.status, await row(bEp), au.length, /القالب ⟶ القالب \+ السليكون \+ القدم/.test(au[0]?.notes ?? ""), au[0]?.nv?.extraComponents],
      [200, { requested_item: "socket", component: "socket", extra_components: ["silicone", "foot"] }, 1, true, ["silicone", "foot"]]);
    const exams = (await call("GET", `/api/medical/patients/${b}/exams`, S.doc)).json;
    same("ج.٣ والمعاينةُ تحمل الأجزاءَ لتنقيحها", exams?.exams?.[0]?.deviceExtraComponents, ["silicone", "foot"]);
    const examId = Number(signed.json?.id);
    const revise = (items: string[]) => call("PATCH", `/api/medical/exams/${examId}`, S.doc, {
      caseType: "prosthetic", chiefComplaint: "", clinicalFindings: "", plan: "", notes: "", diagnosis: "يحتاج قالباً وسليكوناً وقدماً.",
      prescription: { ...RX, prostheticType: "طرف سفلي" }, requestedItems: items,
    });
    const sameList = await revise(["foot", "silicone", "socket"]);
    same("ج.٤ **والقائمةُ نفسُها بترتيبٍ آخر لا تُكتب ولا تُدقَّق**",
      [sameList.status, (await q(`SELECT count(*) FROM audit_log WHERE entity_type = 'patient_device_episode' AND entity_id = $1 AND action = 'update'`, [bEp])).rows[0].count],
      [200, "1"]);
    await q(`UPDATE patient_device_episodes SET agreed_cost = 1 WHERE id = $1`, [bEp]);
    const priced = await revise(["socket"]);
    same("ج.٥ **وبسعرٍ معتمَد لا تتغيّر الأجزاء** — يُقال ولا يُكتب",
      [priced.status, /لم يتغيّر «المطلوب»/.test(priced.json?.sheetNote ?? ""), (await row(bEp))?.extra_components], [200, true, ["silicone", "foot"]]);
    await q(`UPDATE patient_device_episodes SET agreed_cost = 0 WHERE id = $1`, [bEp]);

    console.log("\n── د. سعرٌ واحد وأمرُ تصنيعٍ واحد ──");
    const fid = Number((await q(`SELECT id FROM post_exam_followups WHERE device_episode_id = $1 ORDER BY id DESC LIMIT 1`, [bEp])).rows[0]?.id);
    const fl = (await call("GET", `/api/followups/patient/${b}`, S.recv)).json;
    same("د.١ **نافذةُ البيع تعرف الأجزاءَ كلّها**", (fl ?? []).find((f: any) => f.id === fid)?.extraComponents, ["silicone", "foot"]);
    //  **سعرٌ لكلّ جزء** (§4.cu) ومجموعُها البيعُ الواحد.
    const sale = await call("POST", `/api/followups/${fid}/complete-sale`, S.recv, {
      lines: [{ item: "socket", originalPrice: 500_000, discountAmount: 0 }, { item: "silicone", originalPrice: 250_000, discountAmount: 0 },
        { item: "foot", originalPrice: 150_000, discountAmount: 0 }],
      expertUserId: EXPERT,
      deviceSpecs: { socketType: "سوكيت سليكون", kneeJointType: "لا ينطبق", footType: "قدم كربون", siliconType: "سليكون طبي" },
    });
    const orders = (await q(`SELECT id FROM prosthetic_work_orders WHERE device_episode_id = $1`, [bEp])).rows;
    const orderRes = await call("GET", `/api/manufacturing/orders/${orders[0]?.id}`, S.expert);
    const order = orderRes.json?.order;
    same("د.٢ **بيعٌ واحد — مجموعُ أسطر أجزائه — وأمرُ تصنيعٍ واحد** يقرأ الخبيرُ فيه الأجزاءَ الثلاثة",
      [sale.status, Number((await q(`SELECT agreed_cost FROM patient_device_episodes WHERE id = $1`, [bEp])).rows[0].agreed_cost), orders.length,
        orderRes.status, order?.requestedItem, order?.extraComponents],
      [200, 900_000, 1, 200, "socket", ["silicone", "foot"]]);
    const sheet = (await call("GET", `/api/patients/${b}/intake-sheets`, S.recv)).json?.sheets?.find((s: any) => s.episodeId === bEp);
    const eps = (await call("GET", `/api/patients/${b}/device-episodes`, S.recv)).json;
    same("د.٣ **والاستمارةُ وقائمةُ الأجهزة تقولانها**",
      [sheet?.extraComponents, requestedItemLabel(sheet?.requestedItem, "prosthetic", sheet?.extraComponents),
        (Array.isArray(eps) ? eps : eps?.episodes ?? []).find((e: any) => e.id === bEp)?.extraComponents],
      [["silicone", "foot"], "القالب + السليكون + القدم", ["silicone", "foot"]]);

    console.log("\n── هـ. عدُّ المبيعات ──");
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
    const sum = await getDeviceSalesSummary({ operationalBranches: [B1], isAdmin: false, branchId: B1, branchName: null, start: today, end: today, days: 1 });
    const sold = (k: string) => sum.byCategory.find((c: any) => c.key === `prosthetic_part:${k}`)?.sold ?? 0;
    same("هـ.١ **كلُّ جزءٍ في صنفه** — أمرٌ واحد بثلاثة أجزاء: قالبٌ وسليكونٌ وقدمٌ مبيعة",
      [sold("socket"), sold("silicone"), sold("foot"), sold("knee")], [1, 1, 1, 0]);
  } finally {
    httpServer.close();
    await cleanup();
    await pool.end();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
