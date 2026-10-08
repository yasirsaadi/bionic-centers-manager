// «بيعُ الأجزاء الجاهزة بلا أمر تصنيع، وسعرٌ لكلّ جزء» (قرارُ المالك ٢٠٢٦-١٠-٠٨، §4.cu، ترحيل ١١٧).
// `npm run test:ready-part-sale` — القواعدُ المشتركة، ثمّ النقاطُ الحقيقية: «شراء جزء» بلا معاينة، و«إتمام البيع» بعد المعاينة،
// والاستمارة، وعدُّ المبيعات، و«تصحيح / إلغاء العملية».
//
// يحرس قرارَ المالك: **القالبُ والغلافُ الإسفنجيّ للخبير** بأمر تصنيعٍ واحد يسمّي الأجزاءَ كلَّها، وما عداهما **جاهزٌ يُسلَّم يومَه بلا خبيرٍ
// ولا أمر**؛ ولكلّ جزءٍ سعرُه وخصمُه ونهائيُّه، والمجموعُ هو البيع، والمدفوعُ والمتبقّي عليه وحده.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "ready-part-sale-test-secret";

import express from "express";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage, startReadyPartSaleTx } from "./storage";
import { db } from "./db";
import { startDeviceEpisodeTx } from "./device_episodes/store";
import { getDeviceSalesSummary } from "./ai/tools/device_sales";
import { getDailyReviewEvents } from "./daily_review/store";
import { needsExpertOrder, parseSaleLines, saleTotalsOf } from "@shared/part_sale";
import { CONVERTED_READY_LABEL, FOLLOWUP_STATUS_LABELS, followupStatusLabel } from "@shared/followup";
import { followupEventView, purchasePresentation, purchaseStateText } from "@shared/followup_events";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6997;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-أجزاء-جاهزة";
const B1 = 9856;
const RECV = 9857, DOC = 9858, EXPERT = 9859, MANAGER = 9877;
const IDS = [RECV, DOC, EXPERT, MANAGER];

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_sub_source = $1`, [MARK])).rows.map((r) => Number(r.id));
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
  same("ر.١ **الخبيرُ للقالب والغلاف الإسفنجيّ والجهاز الكامل** — والسليكونُ والقدمُ والركبةُ وأخواتُها جاهزة",
    [needsExpertOrder("prosthetic", "socket"), needsExpertOrder("prosthetic", "foam_cover"), needsExpertOrder("prosthetic", "silicone"),
      needsExpertOrder("prosthetic", "silicone", ["foot", "knee", "tube", "adapter", "foot_shell"]),
      needsExpertOrder("prosthetic", "socket", ["silicone"]), needsExpertOrder("prosthetic", "silicone", ["foam_cover"]),
      needsExpertOrder("prosthetic", "full_device"), needsExpertOrder("medical_support", "full_device")],
    [true, true, false, false, true, true, true, true]);
  const two = parseSaleLines([{ item: "foot", originalPrice: 600_000, discountAmount: 0 }, { item: "silicone", originalPrice: 400_000, discountAmount: 50_000 }],
    ["silicone", "foot"], "prosthetic");
  same("ر.٢ **سطرٌ لكلّ جزء، بترتيب الطلب، والمجموعُ منها**",
    two, { ok: true, lines: [{ item: "silicone", originalPrice: 400_000, discountAmount: 50_000, finalPrice: 350_000 },
      { item: "foot", originalPrice: 600_000, discountAmount: 0, finalPrice: 600_000 }],
    totals: { originalPrice: 1_000_000, discountAmount: 50_000, finalPrice: 950_000, kind: "discount" } });
  const err = (r: ReturnType<typeof parseSaleLines>) => (r.ok ? "ok" : r.error);
  same("ر.٣ **والناقصُ والمكرَّرُ والغريبُ يُردّ**، والخطأُ يسمّي الجزء",
    [err(parseSaleLines([{ item: "silicone", originalPrice: 1, discountAmount: 0 }], ["silicone", "foot"])),
      err(parseSaleLines([{ item: "foot", originalPrice: 5, discountAmount: 0 }, { item: "foot", originalPrice: 5, discountAmount: 0 }], ["foot"])),
      err(parseSaleLines([{ item: "knee", originalPrice: 5, discountAmount: 0 }], ["foot"])),
      err(parseSaleLines([{ item: "foot", originalPrice: 100, discountAmount: 200 }], ["foot"]))],
    ["أدخل سعر: القدم", "القدم: سعرُه مكرّر", "سطرُ سعرٍ لجزءٍ غير مطلوب — حدّث الصفحة",
      "القدم: مقدار الخصم لا يمكن أن يتجاوز السعر الأصلي"]);
  same("ر.٤ **ونوعُ المجموع**: كلُّه مجّانيّ ⟵ مجّاني، وبلا خصم ⟵ عاديّ، وإلّا بخصم",
    [saleTotalsOf([{ originalPrice: 5, discountAmount: 5 }, { originalPrice: 7, discountAmount: 7 }]).kind,
      saleTotalsOf([{ originalPrice: 5, discountAmount: 0 }]).kind, saleTotalsOf([{ originalPrice: 5, discountAmount: 5 }, { originalPrice: 7, discountAmount: 0 }]).kind],
    ["free", "normal", "discount"]);

  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع الأجزاء الجاهزة')`, [B1]);
  for (const [id, role] of [[RECV, "reception"], [DOC, "doctor"], [EXPERT, "prosthetics_expert"], [MANAGER, "branch_manager"]] as const) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active)
             VALUES ($1, $2, 'x', $3, $4, $5, $6::jsonb, true)`, [id, `rps-${id}`, `مستخدم ${id}`, role, B1, JSON.stringify([B1])]);
  }
  await q(`UPDATE system_users SET medical_specialties = '["prosthetic","medical_support","physiotherapy"]'::jsonb WHERE id = $1`, [DOC]);
  await q(`UPDATE system_users SET can_add_patients = true, can_add_payments = true, can_view_payments = true WHERE id = ANY($1::int[])`, [[RECV, MANAGER]]);
  const PAY = { canViewPatients: true, canAddPatients: true, canAddPayments: true, canViewPayments: true };
  const S = {
    recv: hdr({ userId: RECV, displayName: "استقبال", role: "reception", branchId: B1, accessibleBranches: [B1], isAdmin: false, permissions: PAY }),
    doc: hdr({ userId: DOC, displayName: "د. سامر", role: "doctor", roles: ["doctor"], branchId: B1, accessibleBranches: [B1], isAdmin: false,
      permissions: { canViewPatients: true, canWriteMedicalExam: true } }),
    manager: hdr({ userId: MANAGER, displayName: "مدير الفرع", role: "branch_manager", roles: ["branch_manager"], branchId: B1,
      accessibleBranches: [B1], isAdmin: false, permissions: PAY }),
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
  async function patient(label: string) {
    seq += 1;
    const pid = Number((await q(`INSERT INTO patients (name, phone, referral_source, referral_sub_source, age, height, weight, medical_condition, amputation_site,
        branch_id, is_amputee, total_cost, patient_classification, governorate, address, injury_cause, injury_date)
      VALUES ($1, $2, 'من شخص آخر', $3, '40', '172', '78', 'amputee', 'احادي - طرف سفلي - يمين - تحت الركبة', $4, true, 0, 'new', 'بغداد',
        'الكرادة', 'حادث سير', '2021-03-04') RETURNING id`,
      [`${label} ${MARK}`, `0774${String(3000000 + seq * 7919).slice(0, 7)}`, MARK, B1])).rows[0].id);
    await q(`UPDATE patients SET phone_e164 = '+964' || substr(phone, 2) WHERE id = $1`, [pid]);
    await storage.syncPatientCases(pid);
    return pid;
  }
  const sell = (pid: number, body: Record<string, unknown>) =>
    call("POST", "/api/no-exam/device-sale", S.recv, { patientId: pid, submissionToken: randomUUID(), ...body });
  //  أسطرُ السعر بترتيب حقولٍ ثابت — `jsonb` يعيد ترتيبَ المفاتيح، والمقارنةُ بالقيم لا بترتيب الكتابة.
  const lineView = (v: any) => (Array.isArray(v)
    ? v.map((l: any) => ({ item: l.item, originalPrice: l.originalPrice, discountAmount: l.discountAmount, finalPrice: l.finalPrice })) : v);
  const ep = async (id: number) => {
    const r = (await q(`SELECT status, requested_item, extra_components, agreed_cost, sold_ready_at IS NOT NULL AS ready,
      delivered_at IS NOT NULL AS delivered, component_sale_original_price AS orig, component_sale_price_kind AS kind, sale_lines,
      admin_void_reversal_id FROM patient_device_episodes WHERE id = $1`, [id])).rows[0];
    return r ? { ...r, sale_lines: lineView(r.sale_lines) } : r;
  };
  const orders = async (id: number) => Number((await q(`SELECT count(*) FROM prosthetic_work_orders WHERE device_episode_id = $1`, [id])).rows[0].count);
  const money = async (pid: number, id: number) => {
    const r = (await q(`SELECT (SELECT COALESCE(SUM(amount),0)::int FROM cost_entries WHERE patient_id = $1 AND device_episode_id = $2) AS cost,
      (SELECT COALESCE(SUM(amount),0)::int FROM payments WHERE patient_id = $1 AND device_episode_id = $2) AS paid,
      (SELECT total_cost FROM patients WHERE id = $1) AS total`, [pid, id])).rows[0];
    return [Number(r.cost), Number(r.paid), Number(r.total)];
  };
  const epCount = async (pid: number) => Number((await q(`SELECT count(*) FROM patient_device_episodes WHERE patient_id = $1`, [pid])).rows[0].count);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
  const soldCounts = async () => {
    const sum = await getDeviceSalesSummary({ operationalBranches: [B1], isAdmin: false, branchId: B1, branchName: null, start: today, end: today, days: 1 });
    const n = (k: string) => sum.byCategory.find((c: any) => c.key === `prosthetic_part:${k}`)?.sold ?? 0;
    return { socket: n("socket"), silicone: n("silicone"), foot: n("foot"), knee: n("knee") };
  };
  const RX = { amputationType: "single", singleLimb: "lower", singleSide: "right", singleDetail: "تحت الركبة" };
  const SPECS = { socketType: "لا ينطبق", kneeJointType: "لا ينطبق", footType: "لا ينطبق", siliconType: "سليكون طبي" };

  try {
    console.log("\n── أ. «شراء جزء» بلا معاينة ──");
    const a = await patient("علي");
    const r1 = await sell(a, {
      components: ["foot", "silicone"],
      lines: [{ item: "silicone", originalPrice: 400_000, discountAmount: 50_000 }, { item: "foot", originalPrice: 600_000, discountAmount: 0 }],
      paidNow: 500_000,
    });
    const aEp = Number(r1.json?.deviceEpisodeId);
    const aRow = await ep(aEp);
    same("أ.١ **سليكونٌ وقدمٌ بلا خبير** — يُسلَّمان اليوم بلا أمر تصنيع، والمجموعُ من سطريهما",
      [r1.status, r1.json?.ready, r1.json?.workOrderId, aRow?.status, aRow?.ready, aRow?.delivered, aRow?.requested_item, aRow?.extra_components,
        Number(aRow?.agreed_cost), Number(aRow?.orig), aRow?.kind, await orders(aEp)],
      [201, true, null, "delivered", true, true, "silicone", ["foot"], 950_000, 1_000_000, "discount", 0]);
    same("أ.٢ **وسعرُ كلّ جزء محفوظٌ على الجهاز**، والمالُ: الكلفةُ المجموعُ والمدفوعُ ما قُبض",
      [aRow?.sale_lines, await money(a, aEp)],
      [[{ item: "silicone", originalPrice: 400_000, discountAmount: 50_000, finalPrice: 350_000 },
        { item: "foot", originalPrice: 600_000, discountAmount: 0, finalPrice: 600_000 }], [950_000, 500_000, 950_000]]);
    const v1 = (await q(`SELECT details, notes, device_episode_id FROM visits WHERE patient_id = $1 ORDER BY id DESC LIMIT 1`, [a])).rows[0];
    same("أ.٣ **وزيارةُ «شراء جزء» تقول الجزأين وسعرَ كلٍّ وأنه جاهز** — على الجهاز نفسِه",
      [v1?.details, /السليكون 350,000/.test(v1?.notes ?? ""), /جاهز/.test(v1?.notes ?? ""), Number(v1?.device_episode_id)],
      ["شراء جزء: السليكون + القدم", true, true, aEp]);
    const au = (await q(`SELECT entity_type, entity_id FROM audit_log WHERE user_id = $1 AND (entity_type = 'ready_part_sale' OR entity_type = 'no_exam_operation')
      ORDER BY id DESC LIMIT 1`, [RECV])).rows[0];
    same("أ.٤ **وسطرُ التدقيق كيانُه الجهاز** (`ready_part_sale`) — لا «عملية بلا معاينة» برقم جهازٍ يصادف رقمَ أمر",
      [au?.entity_type, Number(au?.entity_id)], ["ready_part_sale", aEp]);

    const n0 = await epCount(a);
    const r2 = await sell(a, { components: ["socket", "silicone"],
      lines: [{ item: "socket", originalPrice: 700_000, discountAmount: 0 }, { item: "silicone", originalPrice: 400_000, discountAmount: 0 }], paidNow: 0 });
    const r2b = await sell(a, { components: ["foam_cover"], lines: [{ item: "foam_cover", originalPrice: 150_000, discountAmount: 0 }], paidNow: 0 });
    same("أ.٥ **قالبٌ أو غلافٌ إسفنجيّ بلا خبير يُردّ — ولا يُكتب شيء**",
      [r2.status, /اختر الخبير/.test(r2.json?.error ?? ""), r2b.status, (await epCount(a)) - n0], [400, true, 400, 0]);
    const r3 = await sell(a, { components: ["silicone", "socket"], expertUserId: EXPERT,
      lines: [{ item: "socket", originalPrice: 700_000, discountAmount: 0 }, { item: "silicone", originalPrice: 400_000, discountAmount: 100_000 }], paidNow: 0 });
    const sEp = Number(r3.json?.deviceEpisodeId);
    const sRow = await ep(sEp);
    const ord = (await q(`SELECT id, expert_user_id FROM prosthetic_work_orders WHERE device_episode_id = $1`, [sEp])).rows;
    same("أ.٦ **وقالبٌ وسليكونٌ بخبير: أمرُ تصنيعٍ واحد يسمّي الجزأين**، والسعرُ من سطريهما",
      [r3.status, r3.json?.ready, sRow?.status, sRow?.ready, sRow?.requested_item, sRow?.extra_components, Number(sRow?.agreed_cost), ord.length,
        Number(ord[0]?.expert_user_id), (sRow?.sale_lines ?? []).length],
      [201, false, "in_manufacturing", false, "socket", ["silicone"], 1_000_000, 1, EXPERT, 2]);

    const n1 = await epCount(a);
    const noLines = await sell(a, { components: ["knee", "foot"], originalPrice: 500_000, discountAmount: 0, paidNow: 0 });
    const shortLines = await sell(a, { components: ["knee", "foot"], lines: [{ item: "knee", originalPrice: 500_000, discountAmount: 0 }], paidNow: 0 });
    const fullDev = await sell(a, { components: ["full_device"], lines: [{ item: "full_device", originalPrice: 5, discountAmount: 0 }], paidNow: 0 });
    const overPaid = await sell(a, { components: ["knee"], lines: [{ item: "knee", originalPrice: 500_000, discountAmount: 0 }], paidNow: 600_000 });
    same("أ.٧ **ويُردّ ولا يُكتب**: أجزاءٌ عدّة بسعرٍ واحد، وسطرٌ ناقص، والطرفُ الكامل، ومدفوعٌ فوق المجموع",
      [noLines.status, shortLines.status, /أدخل سعر: القدم/.test(shortLines.json?.error ?? ""), fullDev.status, overPaid.status, (await epCount(a)) - n1],
      [400, 400, true, 400, 400, 0]);
    const legacy = await sell(a, { component: "knee", originalPrice: 1_200_000, discountAmount: 200_000, paidNow: 1_000_000 });
    const kEp = Number(legacy.json?.deviceEpisodeId);
    const kRow = await ep(kEp);
    same("أ.٨ **والعقدُ القديم** (جزءٌ واحد بسعرٍ واحد، بلا خبير) جاهزٌ كذلك — وسطرُه محفوظ",
      [legacy.status, legacy.json?.ready, kRow?.status, Number(kRow?.agreed_cost), kRow?.sale_lines, await orders(kEp)],
      [201, true, "delivered", 1_000_000, [{ item: "knee", originalPrice: 1_200_000, discountAmount: 200_000, finalPrice: 1_000_000 }], 0]);

    console.log("\n── ب. الاستمارة ──");
    const sheets = (await call("GET", `/api/patients/${a}/intake-sheets`, S.recv)).json?.sheets ?? [];
    const sh = sheets.find((s: any) => s.episodeId === aEp);
    const shS = sheets.find((s: any) => s.episodeId === sEp);
    same("ب.١ **الاستمارةُ تقول: جاهز، وسعرُ كلّ جزء، والكلّيّ والمدفوعُ والمتبقّي** — وزرُّ التصحيح للجاهز وحده",
      [sh?.soldReady, sh?.readyReversible, (sh?.money?.lines ?? []).map((l: any) => [l.item, l.finalPrice]), sh?.money?.total, sh?.money?.paid, sh?.money?.remaining,
        shS?.soldReady, shS?.readyReversible],
      [true, true, [["silicone", 350_000], ["foot", 600_000]], 950_000, 500_000, 450_000, false, false]);

    console.log("\n── ج. عدُّ المبيعات ──");
    same("ج.١ **الجاهزُ يُعدّ بلا أمر** — كلُّ جزءٍ في صنفه، والقالبُ من أمره",
      await soldCounts(), { socket: 1, silicone: 2, foot: 1, knee: 1 });

    const review = await getDailyReviewEvents({ date: today, branchId: B1, serviceType: "all" });
    const rRow = review.find((x: any) => x.id === `component_sale_opened:${aEp}`);
    const oRow = review.find((x: any) => x.id === `component_sale_opened:${sEp}`);
    same("ج.٢ **والمراجعةُ اليومية تقول البيعَ الجاهز** — بلا خبير، ومن سجّله — والبيعُ بأمرٍ كما كان",
      [rRow?.whatHappened, rRow?.expertName, rRow?.performedByName, oRow?.whatHappened],
      ["بيع جزء جاهز بلا معاينة — سُلِّم بلا أمر تصنيع", null, `مستخدم ${RECV}`, "بيع جزء بلا معاينة"]);

    console.log("\n── د. «إتمام البيع» بعد المعاينة ──");
    const b = await patient("حسن");
    const opened = await call("POST", `/api/patients/${b}/device-episodes`, S.recv, { serviceType: "prosthetic", requestedItems: ["silicone", "knee"], servicePath: "exam" });
    const bEp = Number(opened.json?.id);
    const signed = await call("POST", `/api/medical/patients/${b}/exams`, S.doc, {
      idempotencyKey: randomUUID(), caseType: "prosthetic", deviceEpisodeId: bEp, chiefComplaint: "", clinicalFindings: "", plan: "", notes: "",
      diagnosis: "يحتاج سليكوناً وركبة.", prescription: { ...RX, prostheticType: "طرف سفلي" },
    });
    const fid = Number((await q(`SELECT id FROM post_exam_followups WHERE device_episode_id = $1 ORDER BY id DESC LIMIT 1`, [bEp])).rows[0]?.id);
    const fl = ((await call("GET", `/api/followups/patient/${b}`, S.recv)).json ?? []).find((f: any) => f.id === fid);
    same("د.١ **المتابعةُ تقول: لا خبيرَ لهذا البيع** — ولا يُنتظر لها خبير",
      [opened.status, signed.status, fl?.needsExpert, (fl?.missing ?? []).includes("expert")], [201, 200, false, false]);
    const oneSale = await call("POST", `/api/followups/${fid}/complete-sale`, S.recv, { originalPrice: 1_500_000, discountAmount: 0, deviceSpecs: SPECS });
    const sale = await call("POST", `/api/followups/${fid}/complete-sale`, S.recv, {
      lines: [{ item: "silicone", originalPrice: 300_000, discountAmount: 0 }, { item: "knee", originalPrice: 1_200_000, discountAmount: 200_000 }],
      paidNow: 300_000, deviceSpecs: SPECS,
    });
    const bRow = await ep(bEp);
    const fRow = (await q(`SELECT status, converted_work_order_id, approved_price, price_kind, original_price FROM post_exam_followups WHERE id = $1`, [fid])).rows[0];
    same("د.٢ **أجزاءٌ عدّة بسعرٍ واحد تُردّ؛ وبسطرٍ لكلّ جزء تُباع بلا خبير** — مُسلَّمةٌ بلا أمر، والمتابعةُ محوَّلةٌ بلا رقم أمر",
      [oneSale.status, sale.status, bRow?.status, bRow?.ready, Number(bRow?.agreed_cost), (bRow?.sale_lines ?? []).map((l: any) => l.finalPrice),
        await orders(bEp), fRow?.status, fRow?.converted_work_order_id, Number(fRow?.approved_price), fRow?.price_kind, Number(fRow?.original_price)],
      [400, 200, "delivered", true, 1_300_000, [300_000, 1_000_000], 0, "converted", null, 1_300_000, "discount", 1_500_000]);
    const vb = (await q(`SELECT details FROM visits WHERE patient_id = $1 AND device_episode_id = $2 ORDER BY id DESC LIMIT 1`, [b, bEp])).rows[0];
    const bSheet = ((await call("GET", `/api/patients/${b}/intake-sheets`, S.recv)).json?.sheets ?? []).find((x: any) => x.episodeId === bEp);
    //  **وزرُّ التصحيح في الاستمارة لبيعٍ بلا متابعة وحده** — ذو المتابعة يُصحَّح من بطاقة قرارها.
    same("د.٣ **وزيارةُ «شراء جزء» بالجزأين، والمالُ على الجهاز**، والاستمارةُ تقول «جاهز» بلا زرّ تصحيحٍ ثانٍ",
      [vb?.details, await money(b, bEp), bSheet?.soldReady, bSheet?.readyReversible],
      ["شراء جزء: السليكون + الركبة", [1_300_000, 300_000, 1_300_000], true, false]);

    const c = await patient("زينب");
    const cEp = Number((await call("POST", `/api/patients/${c}/device-episodes`, S.recv, { serviceType: "prosthetic", requestedItems: ["socket", "silicone"], servicePath: "exam" })).json?.id);
    await call("POST", `/api/medical/patients/${c}/exams`, S.doc, {
      idempotencyKey: randomUUID(), caseType: "prosthetic", deviceEpisodeId: cEp, chiefComplaint: "", clinicalFindings: "", plan: "", notes: "",
      diagnosis: "قالبٌ وسليكون.", prescription: { ...RX, prostheticType: "طرف سفلي" },
    });
    const cf = Number((await q(`SELECT id FROM post_exam_followups WHERE device_episode_id = $1 ORDER BY id DESC LIMIT 1`, [cEp])).rows[0]?.id);
    const lines2 = [{ item: "socket", originalPrice: 800_000, discountAmount: 0 }, { item: "silicone", originalPrice: 400_000, discountAmount: 0 }];
    const noExpert = await call("POST", `/api/followups/${cf}/complete-sale`, S.recv, { lines: lines2, deviceSpecs: SPECS });
    const withExpert = await call("POST", `/api/followups/${cf}/complete-sale`, S.recv, { lines: lines2, expertUserId: EXPERT, deviceSpecs: SPECS });
    same("د.٤ **وقالبٌ وسليكونٌ بعد المعاينة يحتاجان الخبير** — بلا خبيرٍ يُردّ، وبه أمرٌ واحد",
      [noExpert.status, withExpert.status, (await ep(cEp))?.status, await orders(cEp), (await ep(cEp))?.ready], [400, 200, "in_manufacturing", 1, false]);

    //  ══ **الشارةُ العامّة للبيع الجاهز** (ملاحظةُ المالك ٢٠٢٦-١٠-٠٨): «تم الشراء — بدأ التصنيع» كانت تُقال لأجزاءٍ سُلِّمت يومَ بيعها. ══
    const shown = async (pid: number, followupId: number) => {
      const f = ((await call("GET", `/api/followups/patient/${pid}`, S.recv)).json ?? []).find((x: any) => x.id === followupId);
      const conv = (f?.events ?? []).find((e: any) => e.eventType === "converted");
      const soldReady = Boolean(f?.soldReadyAt);
      return [followupStatusLabel(f?.status, { soldReady }), purchaseStateText(purchasePresentation(f), { soldReady }), followupEventView(conv).title];
    };
    const resolved = ((await call("GET", "/api/followups/decision-queue?state=resolved", S.recv)).json?.rows ?? []) as any[];
    same("د.٥ **البيعُ الجاهز يقول «سُلِّمت الأجزاء الجاهزة بلا أمر تصنيع»** — في شارة الحالة وسطر الشراء وحدث التحويل، و«تم الحسم» يعرفه",
      [await shown(b, fid), resolved.find((r) => r.followupId === fid)?.soldReady],
      [[CONVERTED_READY_LABEL, CONVERTED_READY_LABEL, CONVERTED_READY_LABEL], true]);
    same("د.٦ **والبيعُ بأمر تصنيعٍ كما كان** — «تم الشراء — بدأ التصنيع»",
      [await shown(c, cf), resolved.find((r) => r.followupId === cf)?.soldReady],
      [[FOLLOWUP_STATUS_LABELS.converted, FOLLOWUP_STATUS_LABELS.converted, FOLLOWUP_STATUS_LABELS.converted], false]);

    console.log("\n── هـ. «تصحيح / إلغاء العملية» ──");
    const before = await soldCounts();
    const pv = await call("POST", "/api/admin/operation-reversal/preview", S.manager, { episodeId: aEp });
    same("هـ.١ **بيعٌ جاهزٌ «بلا معاينة» يُفتح عليه التصحيح بجهازه** — إلغاءٌ كامل بماله ومقبوضه",
      [pv.status, pv.json?.availableModes, pv.json?.saleAmount, pv.json?.paidAmount, pv.json?.workOrderId ?? null, pv.json?.deviceEpisodeId],
      [200, ["full_operation"], 950_000, 500_000, null, aEp]);
    const ex = await call("POST", "/api/admin/operation-reversal/execute", S.manager, {
      episodeId: aEp, intent: "cancel_operation", reasonNote: "بيعٌ بالخطأ", stateStamp: pv.json?.stateStamp, refundAnswer: "yes",
    });
    const aAfter = await ep(aEp);
    const rev = (await q(`SELECT work_order_id, device_episode_id, followup_id FROM administrative_operation_reversals WHERE device_episode_id = $1`, [aEp])).rows;
    same("هـ.٢ **يُلغى ويُعكس مالُه ويُردّ مقبوضُه** — الجهازُ ملغى إدارياً، وصفُّ التصحيح بلا أمرٍ ولا متابعة",
      [ex.status, ex.json?.refundedAmount, aAfter?.admin_void_reversal_id !== null, rev.length, rev[0]?.work_order_id, rev[0]?.followup_id,
        await money(a, aEp)],
      [200, 500_000, true, 1, null, null, [0, 0, 1_000_000 + 1_000_000]]);
    const after = await soldCounts();
    const again = await call("POST", "/api/admin/operation-reversal/execute", S.manager, {
      episodeId: aEp, intent: "cancel_operation", reasonNote: "مرّةً ثانية", stateStamp: pv.json?.stateStamp, refundAnswer: "yes",
    });
    const sheetAfter = ((await call("GET", `/api/patients/${a}/intake-sheets`, S.recv)).json?.sheets ?? []).find((s: any) => s.episodeId === aEp);
    same("هـ.٣ **ويخرج من العدّ، ولا يُلغى مرّتين، ويختفي زرُّه**",
      [before.silicone - after.silicone, before.foot - after.foot, again.status, sheetAfter?.readyReversible, sheetAfter?.adminVoided],
      [1, 1, 409, false, true]);

    const pvB = await call("POST", "/api/admin/operation-reversal/preview", S.manager, { followupId: fid });
    same("هـ.٤ **وبيعٌ جاهزٌ بعد المعاينة يقبل «تراجع عن الشراء»** — الشراءُ وحده لا العملية، ونافذتُه تقول حالَه الصحيح",
      [pvB.status, (pvB.json?.availableIntents ?? []).includes("purchase_mistake"), pvB.json?.currentStatusText], [200, true, CONVERTED_READY_LABEL]);
    const undo = await call("POST", "/api/admin/operation-reversal/execute", S.manager, {
      followupId: fid, intent: "purchase_mistake", reasonNote: "اختار سعراً خطأ", stateStamp: pvB.json?.stateStamp, refundAnswer: "yes",
    });
    const bBack = await ep(bEp);
    const fBack = (await q(`SELECT status FROM post_exam_followups WHERE id = $1`, [fid])).rows[0];
    //  و«التراجعُ عن الشراء» لا يردّ المقبوض — يبقى رصيداً يُشترى به الطلبُ الصحيح (عقدُ التصحيح القائم، §4.v).
    same("هـ.٥ **يعود الجهازُ معايَناً بلا بيعٍ ولا أسطر، والمتابعةُ بانتظار القرار، والكلفةُ معكوسة** — والمقبوضُ باقٍ للشراء الصحيح",
      [undo.status, bBack?.status, bBack?.ready, bBack?.delivered, bBack?.sale_lines, Number(bBack?.agreed_cost), fBack?.status, (await money(b, bEp)).slice(0, 2)],
      [200, "examined", false, false, null, 0, "awaiting_patient_decision", [0, 300_000]]);
    const resale = await call("POST", `/api/followups/${fid}/complete-sale`, S.recv, {
      lines: [{ item: "silicone", originalPrice: 300_000, discountAmount: 0 }, { item: "knee", originalPrice: 1_000_000, discountAmount: 0 }], deviceSpecs: SPECS,
    });
    same("هـ.٦ **ثمّ يُباع ثانيةً بشكلٍ صحيح** — جاهزاً كما كان",
      [resale.status, (await ep(bEp))?.status, Number((await ep(bEp))?.agreed_cost)], [200, "delivered", 1_300_000]);

    console.log("\n── و. القيدُ في القاعدة ──");
    const bad = async (sqlText: string, p: any[]) => { try { await q(sqlText, p); return "ok"; } catch (e: any) { return e?.constraint ?? e?.code ?? "err"; } };
    same("و.١ **القاعدةُ تردّ** بيعاً جاهزاً لجهازٍ غير مُسلَّم، وأسطراً ليست قائمة",
      [await bad(`UPDATE patient_device_episodes SET status = 'in_manufacturing' WHERE id = $1`, [kEp]),
        await bad(`UPDATE patient_device_episodes SET sale_lines = '{"a":1}'::jsonb WHERE id = $1`, [kEp])],
      ["chk_pde_sold_ready", "chk_pde_sale_lines"]);
    //  **والحارسُ تحت القفل لا يثق بالمُنادي**: طلبُ قالبٍ على «بلا معاينة» يُفتح بالمخزن ثمّ يُنادى البيعُ الجاهزُ عليه مباشرةً — في معاملةٍ واحدة تُرتَدّ.
    let guardMsg = "";
    let opened2 = false;
    try {
      await db.transaction(async (tx) => {
        const e2 = await startDeviceEpisodeTx(tx, { patientId: c, serviceType: "prosthetic", createdBy: RECV, requestedItem: "socket", servicePath: "no_exam" });
        opened2 = Number.isInteger(e2.id);
        await startReadyPartSaleTx(tx, { patientId: c, deviceEpisodeId: e2.id, expectServicePath: "no_exam" });
      });
    } catch (e: any) { guardMsg = String(e?.message ?? ""); }
    same("و.٢ **والبيعُ الجاهزُ يردّ القالبَ تحت القفل** ولو ناداه مُستدعٍ مباشرةً",
      [opened2, /قالبٌ أو غلافٌ إسفنجيّ/.test(guardMsg)], [true, true]);
  } finally {
    httpServer.close();
    await cleanup();
    await pool.end();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
