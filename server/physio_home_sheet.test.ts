// **ورقةُ تمارين البيت** — «الطلب الثاني»، الشقُّ الثاني (§4.ds — ٢٠٢٦-١٠-١٢).
// `npm run test:physio-home-sheet` — حيٌّ على النقاط الحقيقية (منفذ ٧٠١١، فرع ٨٧١٠، مستخدمون ٨٧١١–٨٧١٥)، وتلغرامُ مُلتقَطٌ لا يخرج. يحرس:
//   ق — القاعدةُ المشتركة: مرحلةُ الورقة (آخرُ جلسةٍ نُفّذت)، وما يصلح للبيت افتراضاً، وفحصُ الاختيار، وأنّ الملفَّ PDF، والخطوات، ونصُّ الرسالة.
//   أ — من الأبواب على بروتوكول خشونة الركبة الحقيقيّ: قراءةُ الخطّة تقول هل تُطبع الورقة ومَن يرسلها ولكم حساب؛ والإرسالُ لمريضٍ غير مربوط يُردّ،
//       ولمربوطٍ يصل كلَّ حسابٍ نشِط (لا المسحوب) ملفّاً بنصٍّ من الخادم وسطرِ تدقيق؛ وما ليس PDF والتمرينُ من مرحلةٍ أخرى والمكرّرُ والمرحلةُ
//       المجهولة تُردّ؛ والمسوّدةُ تُردّ والموقوفةُ تُرسل؛ والمستشيرُ لا يرسل؛ والبوتُ غيرُ المُعدّ ٥٠٣؛ وتلغرامُ المتعثّر ٥٠٢ بسطر تدقيق؛ والكبيرُ ٤١٣.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "physio-home-sheet-test-secret";
process.env.PATIENT_TELEGRAM_BOT_TOKEN = "test-token-home-sheet";
process.env.PATIENT_TELEGRAM_BOT_USERNAME = "bionic_test_bot";
process.env.PATIENT_TELEGRAM_WEBHOOK_SECRET = "test-secret-home-sheet";

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import {
  homeSheetCaption, homeSheetDefaultExercises, homeSheetDefaultPhase, homeSheetFileName, homeSheetSelectionError, isPdfBytes, parseIdList, stepLines,
  HOME_SHEET_MAX_BYTES, HOME_SHEET_NOT_STARTED,
} from "@shared/physio_home_sheet";
import { intakeHeader } from "@shared/intake_sheet";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 7011;
const BASE = `http://127.0.0.1:${PORT}`;
const B1 = 8710;
const ADMIN = 8711, SUP = 8712, SPEC = 8713, TECH = 8714, DOC = 8715;
const IDS = [ADMIN, SUP, SPEC, TECH, DOC];
const MARK = "اختبار-ورقة-البيت";
const KNEE = "knee-oa-geriatric";
const BRANCH_NAME = "فرع ورقة البيت";

//  ══ تلغرامُ مُلتقَط: كلُّ نداءٍ يُسجَّل بحقوله ولا يخرج؛ و`tgFail` يجعله يفشل. ══
interface TgCall { method: string; chatId: string | null; caption: string | null; fileName: string | null; size: number }
const tg: TgCall[] = [];
let tgFail = false;
const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: any, init?: any) => {
  const u = String(url);
  if (u.startsWith("https://api.telegram.org/")) {
    const method = u.split("/").pop() ?? "";
    const body = init?.body;
    if (body instanceof FormData) {
      const doc = body.get("document") as any;
      tg.push({ method, chatId: String(body.get("chat_id") ?? ""), caption: String(body.get("caption") ?? ""), fileName: doc?.name ?? null, size: doc?.size ?? 0 });
    } else {
      tg.push({ method, chatId: null, caption: null, fileName: null, size: 0 });
    }
    return new Response(tgFail ? "{\"ok\":false}" : "{\"ok\":true}", { status: tgFail ? 500 : 200 });
  }
  return realFetch(url, init);
}) as typeof fetch;

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_source = $1`, [MARK])).rows.map((r) => r.id);
  await q(`DELETE FROM staff_notification_outbox WHERE text LIKE '%${MARK}%'`);
  await q(`DELETE FROM patient_contacts WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM physio_plan_sessions WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM physio_plans WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM visits WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM patient_cases WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM patients WHERE id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM physio_device_branches WHERE branch_id = $1`, [B1]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

const PDF = (extra = 2000) => Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(extra, 0x20), Buffer.from("\n%%EOF\n")]);

async function main() {
  // ══ ق. القاعدة ══
  console.log("\n── ق. القاعدة ──");
  const ranged = [{ position: 1, sessionFrom: 1, sessionTo: 6 }, { position: 2, sessionFrom: 7, sessionTo: 16 }, { position: 3, sessionFrom: 17, sessionTo: 24 }];
  same("ق.١ **مرحلةُ الورقة مرحلةُ آخر جلسةٍ نُفّذت** — وقبل أيّ جلسةٍ الأولى، وبعد آخر نطاقٍ الأخيرة",
    [homeSheetDefaultPhase(ranged, 0), homeSheetDefaultPhase(ranged, 6), homeSheetDefaultPhase(ranged, 7), homeSheetDefaultPhase(ranged, 30), homeSheetDefaultPhase([], 3)],
    [1, 1, 2, 3, null]);
  same("ق.٢ **ما يصلح للبيت افتراضاً**، بترتيب المرحلة",
    homeSheetDefaultExercises([{ exerciseId: 4, exercise: { homeSuitable: true } }, { exerciseId: 2, exercise: { homeSuitable: false } }, { exerciseId: 9, exercise: { homeSuitable: true } }]),
    [4, 9]);
  same("ق.٣ **فحصُ الاختيار**: من المرحلة مقبول، والفارغُ والمكرّرُ وما خارج المرحلة يُردّ",
    [homeSheetSelectionError({ phaseExerciseIds: [1, 2, 3], exerciseIds: [3, 1] }),
      Boolean(homeSheetSelectionError({ phaseExerciseIds: [1, 2], exerciseIds: [] })),
      Boolean(homeSheetSelectionError({ phaseExerciseIds: [1, 2], exerciseIds: [1, 1] })),
      Boolean(homeSheetSelectionError({ phaseExerciseIds: [1, 2], exerciseIds: [1, 7] }))],
    [null, true, true, true]);
  same("ق.٤ **الملفُّ PDF حقّاً** — `%PDF-` في أوّله، لا صفحةَ HTML ولا ملفَّ قصير",
    [isPdfBytes(PDF(10)), isPdfBytes(Buffer.from("<html>")), isPdfBytes(Buffer.from("%PD")), isPdfBytes(null)], [true, false, false, false]);
  same("ق.٥ **قائمةُ الأرقام**: «3,1, 2» تُقرأ، وحرفٌ أو صفرٌ يُردّ، والفراغُ قائمةٌ فارغة",
    [parseIdList("3,1, 2"), parseIdList("a,1"), parseIdList("0"), parseIdList(""), parseIdList(undefined)], [[3, 1, 2], null, null, [], null]);
  same("ق.٦ **خطواتُ البطاقة سطراً لكلّ خطوة** بلا ترقيمٍ مكتوب", stepLines("1. استلقِ\n٢) ارفع الساق\n• ثبّت\n\n"), ["استلقِ", "ارفع الساق", "ثبّت"]);
  const cap = homeSheetCaption({ centerName: "مركز بايونك", city: "بغداد", phaseName: "التهدئة", count: 3 });
  same("ق.٧ **نصُّ الرسالة واسمُ الملفّ**: البرنامجُ والمرحلةُ والعددُ والمركزُ ومدينتُه، واسمٌ لاتينيّ برمز الملفّ أو برقم الخطّة",
    [cap.includes("برنامج تمارينك المنزلية"), cap.includes("التهدئة — ٣ تمارين"), cap.includes("مركز بايونك — بغداد"),
      homeSheetFileName("BG-0012", 5), homeSheetFileName("ب-١", 5), homeSheetFileName(null, 5)],
    [true, true, true, "home-exercises-BG-0012.pdf", "home-exercises-plan-5.pdf", "home-exercises-plan-5.pdf"]);

  // ══ أ. من الأبواب ══
  console.log("\n── أ. من الأبواب ──");
  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, $2)`, [B1, BRANCH_NAME]);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_supervise_physio)
           VALUES ($1, 'hs-admin', 'x', 'المسؤول', 'admin', NULL, '[]', true, false),
                  ($2, 'hs-sup', 'x', 'سليم', 'branch_manager', $6, $7::jsonb, true, true),
                  ($3, 'hs-spec', 'x', 'مصطفى', 'physio_specialist', $6, $7::jsonb, true, false),
                  ($4, 'hs-tech', 'x', 'علي', 'physio_technician', $6, $7::jsonb, true, false),
                  ($5, 'hs-doc', 'x', 'الطبيب', 'doctor', $6, $7::jsonb, true, false)`,
    [ADMIN, SUP, SPEC, TECH, DOC, B1, JSON.stringify([B1])]);
  await q(`INSERT INTO physio_device_branches (device_id, branch_id, available) SELECT id, $1, true FROM devices`, [B1]);
  const S = {
    admin: hdr({ userId: ADMIN, displayName: "المسؤول", role: "admin", branchId: B1, isAdmin: true, permissions: {} }),
    spec: hdr({ userId: SPEC, displayName: "مصطفى", role: "physio_specialist", branchId: B1, isAdmin: false, permissions: {} }),
    tech: hdr({ userId: TECH, displayName: "علي", role: "physio_technician", branchId: B1, isAdmin: false, permissions: {} }),
    doc: hdr({ userId: DOC, displayName: "الطبيب", role: "doctor", branchId: B1, isAdmin: false, permissions: {} }),
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
    const r = await realFetch(`${BASE}${path}`, {
      method, headers: { "content-type": "application/json", "x-test-session": session },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json: any = null;
    try { json = await r.json(); } catch { /* */ }
    return { status: r.status, json };
  };
  const send = async (planId: number, session: string, p: { file?: Buffer | null; phase?: unknown; ids?: unknown }) => {
    const form = new FormData();
    if (p.phase !== undefined) form.append("phasePosition", String(p.phase));
    if (p.ids !== undefined) form.append("exerciseIds", String(p.ids));
    if (p.file) form.append("file", new Blob([p.file], { type: "application/pdf" }), "sheet.pdf");
    const r = await realFetch(`${BASE}/api/physio/plans/${planId}/home-sheet/telegram`, { method: "POST", headers: { "x-test-session": session }, body: form });
    let json: any = null;
    try { json = await r.json(); } catch { /* */ }
    return { status: r.status, json };
  };
  try {
    const kneeId = Number((await q(`SELECT id FROM physio_protocols WHERE code = $1`, [KNEE])).rows[0].id);
    const newPatient = async (n: string) => {
      const id = Number((await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_physiotherapy, patient_code)
        VALUES ($1, '07709990871', $2, '61', 'physiotherapy', $3, true, $4) RETURNING id`, [`${n} ${MARK}`, MARK, B1, `WB-${n === "سعاد" ? "98711" : "98712"}`])).rows[0].id);
      await q(`INSERT INTO patient_cases (patient_id, case_type) VALUES ($1, 'physiotherapy')`, [id]);
      return id;
    };
    const pt = await newPatient("سعاد");
    const plan = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: kneeId })).json.id as number;
    const draft = (await call("GET", `/api/physio/plans/${plan}`, S.spec)).json;
    await call("POST", `/api/physio/plans/${plan}/activate`, S.spec);
    const g = (await call("GET", `/api/physio/plans/${plan}`, S.tech)).json;
    const gDoc = (await call("GET", `/api/physio/plans/${plan}`, S.doc)).json;
    same("أ.١ **قراءةُ الخطّة تقول حالَ الورقة**: المسوّدةُ لا تُطبع، والمعتمَدةُ تُطبع والبوتُ مُعدّ ولا حسابَ مربوط، والمنفّذُ يرسل والطبيبُ المستشيرُ لا",
      [draft.homeSheet?.allowed, g.homeSheet, gDoc.homeSheet?.canSend],
      [false, { allowed: true, botEnabled: true, telegramRecipients: 0, canSend: true }, false]);

    const phase = (pos: number) => g.phases.find((p: any) => p.position === pos);
    const homeIds1 = homeSheetDefaultExercises(phase(1).exercises);
    const only2 = phase(2).exercises.map((e: any) => e.exerciseId).filter((id: number) => !phase(1).exercises.some((x: any) => x.exerciseId === id));
    check(homeIds1.length >= 3 && only2.length > 0, "أ.١ب في المرحلة الأولى تمارينُ للبيت، وفي الثانية تمارينُ ليست في الأولى", JSON.stringify({ homeIds1, only2 }));

    tg.length = 0;
    const noLink = await send(plan, S.tech, { file: PDF(), phase: 1, ids: homeIds1.join(",") });
    same("أ.٢ **مريضٌ غيرُ مربوطٍ بتلغرام** ⟵ ٤٠٩ ولا نداءَ لتلغرام", [noLink.status, /غيرُ مربوط/.test(noLink.json?.error ?? ""), tg.length], [409, true, 0]);

    await q(`INSERT INTO patient_contacts (patient_id, channel, external_id, relation) VALUES ($1,'telegram','5550001','self'), ($1,'telegram','5550002','guardian')`, [pt]);
    await q(`INSERT INTO patient_contacts (patient_id, channel, external_id, relation, revoked_at) VALUES ($1,'telegram','5550003','family', now())`, [pt]);
    same("أ.٣أ **عددُ الحسابات النشِطة** في قراءة الخطّة — المسحوبُ لا يُعدّ", (await call("GET", `/api/physio/plans/${plan}`, S.tech)).json.homeSheet.telegramRecipients, 2);

    tg.length = 0;
    const file = PDF(4000);
    const ok = await send(plan, S.tech, { file, phase: 1, ids: homeIds1.join(",") });
    const h = intakeHeader(BRANCH_NAME);
    same("أ.٣ **يصل كلَّ حسابٍ نشِط ملفّاً واحداً** — لا المسحوب — بحجمه واسمِه برمز الملفّ ونصٍّ من الخادم بالمركز والمرحلة",
      [ok.status, ok.json?.recipients, ok.json?.sent, ok.json?.failed, tg.map((c) => c.method), tg.map((c) => c.chatId).sort(), tg.every((c) => c.size === file.length),
        tg.every((c) => c.fileName === "home-exercises-WB-98711.pdf"),
        tg.every((c) => (c.caption ?? "").includes(phase(1).nameAr) && (c.caption ?? "").includes(h.centerName) && (c.caption ?? "").includes(BRANCH_NAME))],
      [200, 2, 2, 0, ["sendDocument", "sendDocument"], ["5550001", "5550002"], true, true, true]);
    const auditRow = (await q(`SELECT new_values::jsonb AS new_values, branch_id FROM audit_log WHERE entity_type = 'physio_plan' AND entity_id = $1 AND action = 'home_sheet_telegram' ORDER BY id DESC LIMIT 1`, [plan])).rows[0];
    same("أ.٣ب **سطرُ تدقيق** بالمرحلة والتمارين والحجم وبصمته وكم وصل",
      [auditRow?.branch_id, auditRow?.new_values?.phasePosition, auditRow?.new_values?.exerciseIds, auditRow?.new_values?.bytes, String(auditRow?.new_values?.sha256 ?? "").length, auditRow?.new_values?.sent],
      [B1, 1, homeIds1, file.length, 64, 2]);

    tg.length = 0;
    const html = await send(plan, S.tech, { file: Buffer.from("<html>not a pdf</html>"), phase: 1, ids: homeIds1.join(",") });
    const noFile = await send(plan, S.tech, { file: null, phase: 1, ids: homeIds1.join(",") });
    same("أ.٤ **ما ليس PDF** والطلبُ بلا ملفّ ⟵ ٤٠٠ ولا نداء", [html.status, noFile.status, tg.length], [400, 400, 0]);

    tg.length = 0;
    const other = await send(plan, S.tech, { file: PDF(), phase: 1, ids: [homeIds1[0], only2[0]].join(",") });
    const dup = await send(plan, S.tech, { file: PDF(), phase: 1, ids: [homeIds1[0], homeIds1[0]].join(",") });
    const none = await send(plan, S.tech, { file: PDF(), phase: 1, ids: "" });
    const badPhase = await send(plan, S.tech, { file: PDF(), phase: 9, ids: homeIds1.join(",") });
    const okPhase2 = await send(plan, S.tech, { file: PDF(), phase: 2, ids: String(only2[0]) });
    same("أ.٥ **تمرينٌ من مرحلةٍ أخرى** والمكرّرُ والفارغُ والمرحلةُ المجهولة ⟵ ٤٠٠، **واختيارُ المرحلة الثانية بتمرينها** يمرّ",
      [other.status, dup.status, none.status, badPhase.status, okPhase2.status, tg.length], [400, 400, 400, 400, 200, 2]);

    const pt2 = await newPatient("هدى");
    await q(`INSERT INTO patient_contacts (patient_id, channel, external_id, relation) VALUES ($1,'telegram','5550009','self')`, [pt2]);
    const plan2 = (await call("POST", `/api/patients/${pt2}/physio-plans`, S.spec, { protocolId: kneeId })).json.id as number;
    const g2 = (await call("GET", `/api/physio/plans/${plan2}`, S.spec)).json;
    tg.length = 0;
    const draftSend = await send(plan2, S.spec, { file: PDF(), phase: 1, ids: homeSheetDefaultExercises(g2.phases[0].exercises).join(",") });
    same("أ.٦ **خطّةٌ لم يبدأ علاجُها** (مسوّدة) ⟵ ٤٠٩ برسالتها ولا نداء", [draftSend.status, draftSend.json?.error, tg.length], [409, HOME_SHEET_NOT_STARTED, 0]);

    tg.length = 0;
    const docSend = await send(plan, S.doc, { file: PDF(), phase: 1, ids: homeIds1.join(",") });
    same("أ.٧ **الطبيبُ المستشير** يقرأ الخطّةَ ولا يرسل للمريض ⟵ ٤٠٣", [docSend.status, tg.length], [403, 0]);

    tg.length = 0;
    const savedToken = process.env.PATIENT_TELEGRAM_BOT_TOKEN;
    delete process.env.PATIENT_TELEGRAM_BOT_TOKEN;
    const noBot = await send(plan, S.tech, { file: PDF(), phase: 1, ids: homeIds1.join(",") });
    process.env.PATIENT_TELEGRAM_BOT_TOKEN = savedToken;
    same("أ.٨ **بوتُ المرضى غيرُ مُعدّ** ⟵ ٥٠٣ ولا نداء", [noBot.status, tg.length], [503, 0]);

    tgFail = true;
    const before = Number((await q(`SELECT count(*)::int AS n FROM audit_log WHERE entity_id = $1 AND action = 'home_sheet_telegram'`, [plan])).rows[0].n);
    const down = await send(plan, S.tech, { file: PDF(), phase: 1, ids: homeIds1.join(",") });
    tgFail = false;
    const after = (await q(`SELECT count(*)::int AS n, (array_agg(new_values::jsonb ORDER BY id DESC))[1] AS last FROM audit_log WHERE entity_id = $1 AND action = 'home_sheet_telegram'`, [plan])).rows[0];
    same("أ.٩ **تلغرامُ متعثّر** ⟵ ٥٠٢ بلا وصول، والمحاولةُ في سطر تدقيقٍ بما تعذّر", [down.status, down.json?.sent, after.n - before, after.last?.failed], [502, 0, 1, 2]);

    tg.length = 0;
    const big = await send(plan, S.tech, { file: PDF(HOME_SHEET_MAX_BYTES + 10), phase: 1, ids: homeIds1.join(",") });
    same("أ.١٠ **ملفٌّ أكبرُ من الحدّ** ⟵ ٤١٣ ولا نداء", [big.status, tg.length], [413, 0]);

    await call("POST", `/api/physio/plans/${plan}/stop`, S.spec, { reason: "انتهى العلاج" });
    const stopped = (await call("GET", `/api/physio/plans/${plan}`, S.tech)).json;
    const afterStop = await send(plan, S.tech, { file: PDF(), phase: 1, ids: homeIds1.join(",") });
    same("أ.١١ **الخطّةُ الموقوفة** (برنامجُ ما بعد العلاج) تُطبع ورقتُها وتُرسل", [stopped.status, stopped.homeSheet?.allowed, afterStop.status], ["stopped", true, 200]);
  } finally {
    await new Promise<void>((r) => httpServer.close(() => r()));
    await cleanup();
  }
}

main()
  .then(async () => {
    await pool.end();
    console.log(failures === 0 ? "\nAll home-sheet checks passed." : `\n${failures} check(s) failed.`);
    process.exit(failures === 0 ? 0 : 1);
  })
  .catch(async (e) => {
    console.error(e);
    try { await pool.end(); } catch { /* */ }
    process.exit(1);
  });
