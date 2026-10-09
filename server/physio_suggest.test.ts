// «اقترح خطّة» بالمساعد (ترحيل ١١٢، §4.co — المرحلةُ الخامسة، ٢٠٢٦-١٠-٠٨).
// `npm run test:physio-suggest` — على النقاط الحقيقية بتطبيق Express الحقيقيّ، **ومساعدٍ مزيّف** يعيد ردوداً جاهزة (لا مفتاحَ في بيئة التطوير).
//
// يحرس قراراتِ المالك الأربع: (١) يختار البروتوكولَ ويعدّله **داخل حدوده** — والخادمُ يرفض ما خرج عنها ويقوله؛ (٢) يقترح من المسوّدات؛
// (٣) لكاتبي الخطط وحدهم؛ (٤) حالةُ المريض من المعاينة وسطرِ الأخصائيّ — وبلا معاينةٍ يلزم السطر. ومعها: لا اسمَ ولا هاتفَ ولا رمزَ يصل المساعد،
// والقبولُ يفتح مسوّدةً مرّةً واحدة بتقاطعٍ مع البروتوكول الآن، وحذفُ المريض والخطّة يمرّان بالاقتراحات (§8).

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "physio-suggest-test-secret";
delete process.env.ANTHROPIC_API_KEY;

import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { setSuggestCompleterForTests } from "./physio_plans/suggest";
import { prefillSupported, requestMessages, type AiCompleteParams } from "./ai/provider";
import { parseModelJson, validateAdjustments, validateChoices } from "@shared/physio_plans";
import { emptyInitialAssessment } from "@shared/physio_initial_assessment";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6982;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-اقتراح-الخطط";
const B1 = 9761, B2 = 9762;
const ADMIN = 9771, SUP = 9772, SPEC = 9773, TECH = 9774, DOC = 9775, MGR = 9776, REC = 9777, SPEC2 = 9778;
const IDS = [ADMIN, SUP, SPEC, TECH, DOC, MGR, REC, SPEC2];

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_source = $1`, [MARK])).rows.map((r) => r.id);
  await q(`DELETE FROM physio_plan_suggestions WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM physio_plans WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM medical_exam_cancellations WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM medical_exams WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM patient_cases WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM patients WHERE id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM physio_protocols WHERE code LIKE 'TEST-SUG-%'`);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM physio_device_branches WHERE branch_id = ANY($1::int[])`, [[B1, B2]]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = ANY($1::int[])`, [[B1, B2]]);
}

async function main() {
  // ══ القواعد (بلا قاعدة) ══════════════════════════════════════════════════════════════════════════════
  console.log("\n── القواعد ──");
  same("ق.١ الاختيارُ من المكتبة وحدها، بلا تكرار، ثلاثةٌ على الأكثر",
    validateChoices({ choices: [{ protocolId: 99 }, { protocolId: 1 }, { protocolId: 1 }, { protocolId: 2 }, { protocolId: 3 }, { protocolId: 4 }] }, new Set([1, 2, 3, 4]))
      .map((c) => c.protocolId), [1, 2, 3]);
  const L = [{ deviceId: 1, minutes: 30, nameAr: "روبوت", nameEn: "Robot" }, { deviceId: 2, minutes: 10, nameAr: "ليزر", nameEn: "Laser" }];
  const D = { sessionsPerWeek: 3, durationWeeks: 12, sessionMinutes: 45 };
  const v = validateAdjustments({
    remove: [{ deviceId: 9, reasonAr: "x" }, { deviceId: 2 }],
    minutes: [{ deviceId: 1, minutes: 31, reasonAr: "x" }, { deviceId: 1, minutes: 20, reasonAr: "تعب" }],
    dose: [{ field: "sessionsPerWeek", value: 4, reasonAr: "x" }, { field: "durationWeeks", value: 8, reasonAr: "سبب" }, { field: "nope", value: 1, reasonAr: "x" }],
    add: [{ deviceId: 7 }],
  }, L, D);
  same("ق.٢ حذفٌ من خارج السطور وحذفٌ بلا سبب ودقائقُ فوق البروتوكول وجرعةٌ فوقه وحقلٌ مجهول وإضافةٌ — كلُّها مرفوضة",
    v.rejected.length, 6);
  same("ق.٣ والمقبول: الروبوتُ ٢٠ والليزرُ باقٍ والأسابيعُ ٨", [v.devices, v.dose.durationWeeks, v.dose.sessionsPerWeek, v.changes.map((c) => c.kind)],
    [[{ deviceId: 1, minutes: 20 }, { deviceId: 2, minutes: 10 }], 8, 3, ["minutes", "dose"]]);
  same("ق.٤ ولا تُحذف الأجهزةُ كلُّها", validateAdjustments({ remove: [{ deviceId: 1, reasonAr: "a" }, { deviceId: 2, reasonAr: "b" }] }, L, D).devices.length, 1);
  same("ق.٥ والردُّ بنصٍّ قبله يُقرأ، والمكسورُ لا", [parseModelJson("حسناً: {\"a\":1} انتهى")?.a, parseModelJson("{oops")], [1, null]);

  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع اقتراح ١'), ($2, 'فرع اقتراح ٢')`, [B1, B2]);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_supervise_physio)
           VALUES ($1, 'sg-admin', 'x', 'المسؤول', 'admin', NULL, '[]', true, false),
                  ($2, 'sg-sup', 'x', 'سليم', 'branch_manager', $9, $10::jsonb, true, true),
                  ($3, 'sg-spec', 'x', 'مصطفى', 'physio_specialist', $9, $10::jsonb, true, false),
                  ($4, 'sg-tech', 'x', 'تقنيّ', 'physio_technician', $9, $10::jsonb, true, false),
                  ($5, 'sg-doc', 'x', 'الطبيب', 'doctor', $9, $10::jsonb, true, false),
                  ($6, 'sg-mgr', 'x', 'مدير الفرع', 'branch_manager', $9, $10::jsonb, true, false),
                  ($7, 'sg-rec', 'x', 'استقبال', 'reception', $9, $10::jsonb, true, false),
                  ($8, 'sg-spec2', 'x', 'أخصائيّ الفرع الآخر', 'physio_specialist', $11, $12::jsonb, true, false)`,
    [ADMIN, SUP, SPEC, TECH, DOC, MGR, REC, SPEC2, B1, JSON.stringify([B1]), B2, JSON.stringify([B2])]);
  const who = (userId: number, role: string, branchId: number, isAdmin = false) => hdr({ userId, displayName: String(userId), role, branchId, isAdmin, permissions: {} });
  const S = {
    admin: who(ADMIN, "admin", B1, true), sup: who(SUP, "branch_manager", B1), spec: who(SPEC, "physio_specialist", B1),
    tech: who(TECH, "physio_technician", B1), doc: who(DOC, "doctor", B1), mgr: who(MGR, "branch_manager", B1),
    rec: who(REC, "reception", B1), spec2: who(SPEC2, "physio_specialist", B2),
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

  //  بروتوكولان للاختبار: الأوّلُ لطفلٍ بخمسة أجهزة — روبوتٌ موصى ٣٠، ليزرٌ اختياريّ ١٠، صادمةٌ «غير موصى به»، موجاتٌ فوق صوتية موصى (غيرُ متوفّرة
  //  في الفرع)، تمارينُ موصى ٢٠ — وجرعتُه ٣/أسبوع × ١٢ أسبوعاً × ٤٥ دقيقة. والثاني لبالغٍ بالتمارين وحدها.
  const dev = Object.fromEntries((await q(`SELECT id, code FROM devices`)).rows.map((r) => [r.code, Number(r.id)]));
  const [ROBOT, LASER, SHOCK, ULTRA, EXER] = [dev.robotik, dev.laser, dev.shockwaves, dev.ultrasound, dev.exercise];
  await q(`INSERT INTO physio_device_branches (device_id, branch_id, available) SELECT id, $1, code <> 'ultrasound' FROM devices`, [B1]);
  await q(`INSERT INTO physio_device_branches (device_id, branch_id, available) SELECT id, $1, true FROM devices`, [B2]);
  const P1 = (await q(`INSERT INTO physio_protocols (code, title_ar, title_en, category, age_group, contraindications, sessions_per_week, duration_weeks, session_minutes)
    VALUES ('TEST-SUG-1', 'شلل دماغي — اختبار', 'Cerebral palsy — test', 'neurological', 'pediatric', 'لا صادمة على صفائح النموّ', 3, 12, 45) RETURNING id`)).rows[0].id;
  const P2 = (await q(`INSERT INTO physio_protocols (code, title_ar, title_en, category, age_group, sessions_per_week, duration_weeks, session_minutes)
    VALUES ('TEST-SUG-2', 'تمارين عامّة — اختبار', 'General exercise — test', 'other', 'adult', 2, 6, 30) RETURNING id`)).rows[0].id;
  await q(`INSERT INTO physio_protocol_devices (protocol_id, device_id, evidence, minutes, display_order) VALUES
    ($1, $2, 'recommended', 30, 0), ($1, $3, 'optional', 10, 1), ($1, $4, 'not_recommended', 10, 2), ($1, $5, 'recommended', 8, 3), ($1, $6, 'recommended', 20, 4),
    ($7, $6, 'recommended', 30, 0)`, [P1, ROBOT, LASER, SHOCK, ULTRA, EXER, P2]);
  const pt = (await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_physiotherapy)
    VALUES ($1, '07709998887', $2, '6', 'شلل دماغي', $3, true) RETURNING id, patient_code`, [`زيد الاسم-السرّيّ ${MARK}`, MARK, B1])).rows[0];
  const pt2 = (await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_physiotherapy)
    VALUES ($1, '07701112223', $2, '40', 'x', $3, true) RETURNING id`, [`بلا معاينة ${MARK}`, MARK, B1])).rows[0].id;
  await q(`INSERT INTO medical_exams (patient_id, case_type, branch_id, doctor_name, chief_complaint, clinical_findings, diagnosis, plan)
    VALUES ($1, 'physiotherapy', $2, 'د. اختبار', 'صعوبة في المشي', 'تشنّجٌ في الساقين، صفائحُ النموّ مفتوحة', 'شلل دماغي تشنّجي', 'علاج طبيعي')`, [pt.id, B1]);
  //  مريضٌ معاينتُه الوحيدة ملغاة — كأنّه بلا معاينة.
  const pt3 = (await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_physiotherapy)
    VALUES ($1, '07703334445', $2, '30', 'x', $3, true) RETURNING id`, [`معاينة ملغاة ${MARK}`, MARK, B1])).rows[0].id;
  const ex3 = (await q(`INSERT INTO medical_exams (patient_id, case_type, branch_id, doctor_name, diagnosis)
    VALUES ($1, 'physiotherapy', $2, 'د. اختبار', 'تشخيصٌ أُلغي') RETURNING id`, [pt3, B1])).rows[0].id;
  await q(`INSERT INTO medical_exam_cancellations (exam_id, patient_id, branch_id, reason) VALUES ($1, $2, $3, 'سُجّلت خطأً')`, [ex3, pt3, B1]);

  //  المساعدُ المزيّف: يسجّل ما وصله، ويعيد ما يُطلب منه لكلّ خطوة.
  const calls: { step: string; system: string; user: string; params: AiCompleteParams }[] = [];
  let reply: Record<string, any> = {};
  setSuggestCompleterForTests(async (p) => {
    const step = JSON.parse(p.user).step;
    calls.push({ step, system: p.system, user: p.user, params: p });
    return JSON.stringify(reply[step] ?? {});
  });
  const suggestFor = (s: string, patientId: number, body: any = {}) => call("POST", `/api/patients/${patientId}/physio-plans/suggest`, s, body);
  const ADJUST = {
    remove: [{ deviceId: SHOCK, reasonAr: "صفائحُ النموّ مفتوحة" }, { deviceId: ULTRA, reasonAr: "x" }, { deviceId: LASER, reasonAr: "غيرُ ضروريّ لحالته", reasonEn: "Not needed" }, { deviceId: EXER }],
    minutes: [{ deviceId: ROBOT, minutes: 45, reasonAr: "x" }, { deviceId: ROBOT, minutes: 20, reasonAr: "طفلٌ يتعب سريعاً", reasonEn: "Tires quickly" }],
    dose: [{ field: "sessionsPerWeek", value: 5, reasonAr: "x" }, { field: "durationWeeks", value: 8, reasonAr: "إعادةُ تقييمٍ بعد ثمانية أسابيع" }],
    add: [{ deviceId: dev.wax }],
    notesAr: "يبدأ بجلساتٍ قصيرة", notesEn: "Start with short sessions", rationaleAr: "حالةُ شللٍ دماغيٍّ تشنّجيّ لطفل", rationaleEn: "Spastic CP, child",
  };

  try {
    console.log("\n── أ. لمن الزرّ (القرار ٣) ──");
    reply = { choose: { choices: [{ protocolId: P1, reasonAr: "طفلٌ بشللٍ دماغيّ" }] }, adjust: {} };
    same("أ.١ الاستقبالُ والتقنيُّ والطبيبُ ومديرُ الفرع لا يطلبونه ⟵ ٤٠٣",
      await Promise.all([S.rec, S.tech, S.doc, S.mgr].map(async (s) => (await suggestFor(s, pt.id)).status)), [403, 403, 403, 403]);
    same("أ.٢ وأخصائيُّ فرعٍ آخر لا يصل الملفّ ⟵ ٤٠٤", (await suggestFor(S.spec2, pt.id)).status, 404);
    same("أ.٣ ولم يُنادَ المساعدُ لأيٍّ منهم", calls.length, 0);
    setSuggestCompleterForTests(null);
    same("أ.٤ والمساعدُ غيرُ مفعّل ⟵ ٥٠٣ — قبل أيّ سؤالٍ عن المعاينة", (await suggestFor(S.spec, pt2)).status, 503);
    setSuggestCompleterForTests(async (p) => {
      const step = JSON.parse(p.user).step;
      calls.push({ step, system: p.system, user: p.user, params: p });
      return JSON.stringify(reply[step] ?? {});
    });
    const list = (await call("GET", `/api/patients/${pt.id}/physio-plans`, S.spec)).json;
    same("أ.٥ والملفُّ يقول للأخصائيّ إنّ الزرّ مفعّل وما سيُقرأ من المعاينة", [list.suggest?.enabled, list.suggest?.exam?.diagnosis], [true, "شلل دماغي تشنّجي"]);
    same("أ.٦ ولا يقوله للطبيب (يقرأ الخطط ولا يطلب)", (await call("GET", `/api/patients/${pt.id}/physio-plans`, S.doc)).json?.suggest ?? null, null);

    console.log("\n── ب. حالةُ المريض (القرار ٤) وما لا يصل المساعد ──");
    same("ب.١ بلا معاينةٍ ولا سطر ⟵ ٤٠٠", (await suggestFor(S.spec, pt2)).status, 400);
    same("ب.١ب **والمعاينةُ الملغاة لا تُقرأ**: معاينتُه الوحيدة ملغاة ⟵ ٤٠٠، والملفُّ لا يعرضها",
      [(await suggestFor(S.spec, pt3)).status, (await call("GET", `/api/patients/${pt3}/physio-plans`, S.spec)).json?.suggest?.exam ?? null], [400, null]);
    calls.length = 0;
    reply = { choose: { choices: [{ protocolId: P2, reasonAr: "بالغ" }] }, adjust: {} };
    same("ب.٢ وبسطرٍ يكتبه الأخصائيّ ⟵ ٢٠٠", (await suggestFor(S.spec, pt2, { note: "ألمٌ أسفل الظهر منذ شهرين" })).status, 200);
    check(calls.some((c) => c.user.includes("ألمٌ أسفل الظهر منذ شهرين")), "ب.٣ والسطرُ وصل المساعد");
    calls.length = 0;
    reply = { choose: { choices: [{ protocolId: 999999 }, { protocolId: P1, reasonAr: "طفلٌ بشللٍ دماغيّ", reasonEn: "Child with CP" }, { protocolId: P1 }, { protocolId: P2, reasonAr: "بديل" }] }, adjust: ADJUST };
    const r1 = await suggestFor(S.spec, pt.id, { note: "يمشي بمساعدة" });
    same("ب.٤ اقتراحٌ للطفل ⟵ ٢٠٠ بخطوتين", [r1.status, calls.map((c) => c.step)], [200, ["choose", "adjust"]]);
    //  **واقعةُ الإنتاج ٢٠٢٦-١٠-٠٨** (§4.co): «تعذّر الاقتراح — خطأ في خدمة الذكاء الاصطناعي» — بادئةُ ردٍّ «{» على Sonnet 4.6 يردّها بـ400.
    //  والمساعدُ المزيّف كان يقبلها، فيُفحص الطلبُ الذي يُبنى فعلاً.
    same("ب.٤ب **ولا يطلب الاقتراحُ بادئةَ ردّ** في أيٍّ من خطوتيه", calls.map((c) => c.params.prefillAssistant ?? null), [null, null]);
    same("ب.٤ج والطلبُ المبنيّ لكلّ خطوةٍ ينتهي برسالة المستخدم — لا دورَ للمساعد في آخره",
      calls.map((c) => requestMessages(c.params).at(-1)?.role), ["user", "user"]);
    same("ب.٤د **والمزوّدُ يُسقط البادئةَ لنموذجٍ يرفضها** — Sonnet ينتهي برسالة المستخدم ولو طُلبت",
      [prefillSupported("sonnet"), requestMessages({ user: "u", model: "sonnet", prefillAssistant: "{" }).map((m) => m.role)], [false, ["user"]]);
    //  **وسببُ فشل الواجهة يصل الشاشة** — «خطأ في خدمة الذكاء الاصطناعي» وحدها لم تكفِ لتشخيص الواقعة.
    const failWith = async (err: Error) => {
      setSuggestCompleterForTests(async () => { throw err; });
      const r = await suggestFor(S.spec, pt.id, { note: "x" });
      setSuggestCompleterForTests(async (p) => {
        const step = JSON.parse(p.user).step;
        calls.push({ step, system: p.system, user: p.user, params: p });
        return JSON.stringify(reply[step] ?? {});
      });
      return [r.status, String(r.json?.error ?? "")] as const;
    };
    const bad = await failWith(new Anthropic.BadRequestError(400,
      { type: "error", error: { type: "invalid_request_error", message: "This model does not support assistant message prefill." } }, undefined, new Headers()));
    same("ب.٤هـ رفضُ الواجهة ⟵ ٥٠٢ ونصُّه يحمل الحالةَ والنوعَ ورسالتَها",
      [bad[0], bad[1].startsWith("خطأ في خدمة الذكاء الاصطناعي"), bad[1].includes("400 · invalid_request_error · This model does not support assistant message prefill.")], [502, true, true]);
    const net = await failWith(new Anthropic.APIConnectionError({ message: "Connection error." }));
    same("ب.٤و وانقطاعُ الشبكة يقول ذلك", [net[0], net[1].includes("network · Connection error.")], [502, true]);
    const sent = calls.map((c) => c.user).join("\n");
    same("ب.٥ وصله العمرُ والتشخيصُ والسطر", [sent.includes("\"age\":\"6\""), sent.includes("شلل دماغي تشنّجي"), sent.includes("يمشي بمساعدة")], [true, true, true]);
    same("ب.٦ **ولا اسمَ ولا هاتفَ ولا رمز**", [sent.includes("الاسم-السرّيّ"), sent.includes("07709998887"), sent.includes(String(pt.patient_code))], [false, false, false]);
    const stored = (await q(`SELECT input::text AS t FROM physio_plan_suggestions WHERE id = $1`, [r1.json.id])).rows[0].t;
    same("ب.٧ ولا في الصفّ المحفوظ", [stored.includes("الاسم-السرّيّ"), stored.includes("07709998887")], [false, false]);

    // ══ §4.da المرحلة ٤: «على أساس هذه التقييمات تُختار الخطّة» ══
    console.log("\n── ت. التقييمُ الأوّليّ يصل المساعدَ ويظهر بجانب الاختيار ──");
    const pt4 = (await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_physiotherapy, presenting_complaint)
      VALUES ($1, '07705556667', $2, '52', 'physiotherapy', $3, true, 'ألمٌ في الرقبة ينزل إلى الذراع منذ شهر') RETURNING id`,
      [`تقييم-سرّيّ ${MARK}`, MARK, B1])).rows[0].id;
    const A4 = { ...emptyInitialAssessment(), onsetAtSigning: "unknown", allergy: ["drug"], allergySpecify: "Diclofenac",
      symptoms: "constant", painBest: 3, painWorst: 7, location: ["neck"], sensation: "impaired", sensationRegions: "C6 (R)",
      mmt: { ...emptyInitialAssessment().mmt, shoulder: { r: "4", l: "5" } }, plan: ["therapeutic_exercises", "traction"] };
    //  معاينةٌ **بتقييمها وحده** (بلا نصٍّ في الخانات الخمس) — تكفي حالةً للمساعد.
    await q(`INSERT INTO medical_exams (patient_id, case_type, branch_id, doctor_name, assessment) VALUES ($1, 'physiotherapy', $2, 'أخصائيّ اختبار', $3::jsonb)`,
      [pt4, B1, JSON.stringify(A4)]);
    //  ما سجّله المساعدُ المزيّف لاقتراح الطفل يُحفظ ويُعاد بعد هذا القسم — فد.١ يقرأ خطوةَ تعديله هو.
    const savedCalls = calls.splice(0);
    reply = { choose: { choices: [{ protocolId: P2, reasonAr: "ألم رقبة" }] }, adjust: {} };
    const r4 = await suggestFor(S.spec, pt4);
    const sent4 = calls.map((c) => c.user).join("\n");
    same("ت.١ **معاينةٌ بتقييمها وحده تكفي** — يُقترح بلا سطر", r4.status, 200);
    same("ت.٢ **والتقييمُ الأوّليّ كاملاً يصل المساعد**: الألمُ والإحساسُ والقوةُ وبنودُ خطّة العلاج والحساسيةُ وتاريخُ البداية",
      ["Pain (0–10): at best 3, at worst 7", "Sensation: Impaired (C6 (R))", "MMT: Shoulder Flexors / Extensors R 4 / L 5",
        "Plan of treatment: Therapeutic Exercises, Traction", "Drug / food allergy: Drug (Diclofenac)", "Date of onset / injury: Unknown"]
        .map((x) => sent4.includes(JSON.stringify(x).slice(1, -1))),
      [true, true, true, true, true, true]);
    same("ت.٣ **و«سبب المراجعة» بكلمات المراجع** — ولا اسمَ ولا هاتف",
      [sent4.includes("ألمٌ في الرقبة ينزل إلى الذراع منذ شهر"), sent4.includes("تقييم-سرّيّ"), sent4.includes("07705556667")], [true, false, false]);
    const info4 = (await call("GET", `/api/patients/${pt4}/physio-plans`, S.spec)).json?.suggest;
    same("ت.٤ **وبجانب اختيار البروتوكول سطرُ التقييم وبنودُ خطّة العلاج وأسوأُ الألم**", info4?.assessment,
      { summary: "الألم 3–7 من ١٠ · الرقبة · مستمرّ · الإحساس ضعيف · بنود خطة العلاج: 2", planItems: ["تمارين علاجية", "الشدّ"], painWorst: 7 });
    same("ت.٥ ومعاينةٌ بلا تقييم ⟵ لا سطرَ تقييم", (await call("GET", `/api/patients/${pt.id}/physio-plans`, S.spec)).json?.suggest?.assessment, null);
    calls.length = 0;
    calls.push(...savedCalls);

    console.log("\n── ج. الاختيار (القراران ١ و٢) ──");
    same("ج.١ رقمٌ ليس في المكتبة يُسقَط، والمكرّرُ مرّة، والمختارُ الأوّلُ الصالح", [r1.json.protocol.protocolId, r1.json.alternatives.map((a: any) => a.protocolId)], [P1, [P2]]);
    same("ج.٢ **ومن المسوّدات** بحالتها", r1.json.protocol.status, "draft");
    reply = { choose: { choices: [{ protocolId: 999999 }], noMatchReasonAr: "لا بروتوكولَ لهذه الحالة" } };
    const none = await suggestFor(S.spec, pt.id);
    same("ج.٣ ولا صالحَ ⟵ ٤٢٢ بسببه", [none.status, none.json?.error], [422, "لا بروتوكولَ لهذه الحالة"]);

    console.log("\n── د. التعديل داخل حدود البروتوكول (القرار ١) ──");
    const adjSent = JSON.parse(calls.filter((c) => c.step === "adjust")[0].user);
    same("د.١ المساعدُ يرى أجهزةَ البروتوكول الجائزة في الفرع وحدها (لا «غير موصى به» ولا غيرَ المتوفّر)",
      adjSent.protocol.devices.map((d: any) => d.deviceId).sort((a: number, b: number) => a - b), [ROBOT, LASER, EXER].sort((a, b) => a - b));
    same("د.٢ الخطّةُ المقترحة: الروبوتُ ٢٠ والتمارينُ ٢٠ (الليزرُ حُذف بسببه)",
      r1.json.devices.map((d: any) => [d.deviceId, d.minutes]).sort((a: any, b: any) => a[0] - b[0]), [[ROBOT, 20], [EXER, 20]].sort((a, b) => a[0] - b[0]));
    same("د.٣ والجرعةُ: ٨ أسابيع، والثلاثُ في الأسبوع لم تصر خمساً", [r1.json.dose.durationWeeks, r1.json.dose.sessionsPerWeek, r1.json.dose.sessionMinutes], [8, 3, 45]);
    same("د.٤ والتعديلاتُ ثلاثةٌ بأسبابها", r1.json.changes.map((c: any) => [c.kind, c.reasonAr]),
      [["remove", "غيرُ ضروريّ لحالته"], ["minutes", "طفلٌ يتعب سريعاً"], ["dose", "إعادةُ تقييمٍ بعد ثمانية أسابيع"]]);
    same("د.٥ **وما خرج عن الحدود رُفض وقيل**: الصادمةُ وفوقُ الصوتية والتمارينُ بلا سبب والروبوتُ ٤٥ والخمسُ في الأسبوع والإضافة", r1.json.rejected.length, 6);

    console.log("\n── هـ. القبول ──");
    same("هـ.١ التقنيُّ لا يقبل ⟵ ٤٠٣", (await call("POST", `/api/physio/suggestions/${r1.json.id}/accept`, S.tech)).status, 403);
    same("هـ.٢ وأخصائيُّ فرعٍ آخر لا يصل ⟵ ٤٠٤", (await call("POST", `/api/physio/suggestions/${r1.json.id}/accept`, S.spec2)).status, 404);
    const acc = await call("POST", `/api/physio/suggestions/${r1.json.id}/accept`, S.spec);
    same("هـ.٣ الأخصائيُّ يقبل ⟵ مسوّدةٌ من البروتوكول", [acc.status, acc.json?.status, acc.json?.protocolId], [200, "draft", P1]);
    const plan = acc.json.id as number;
    const g = (await call("GET", `/api/physio/plans/${plan}`, S.spec)).json;
    same("هـ.٤ بأجهزة الاقتراح ودقائقه وجرعته وملاحظاته", [g.devices.map((d: any) => [d.deviceId, d.minutes]).sort((a: any, b: any) => a[0] - b[0]),
      g.durationWeeks, g.sessionsPerWeek, g.notes, g.notesEn],
      [[[ROBOT, 20], [EXER, 20]].sort((a, b) => a[0] - b[0]), 8, 3, "يبدأ بجلساتٍ قصيرة", "Start with short sessions"]);
    same("هـ.٥ وشارةُ «مقترحة بالمساعد» بتعديلاتها", [g.aiSuggestion?.id, g.aiSuggestion?.changes?.length, g.aiSuggestion?.rationaleAr], [r1.json.id, 3, "حالةُ شللٍ دماغيٍّ تشنّجيّ لطفل"]);
    same("هـ.٦ ومرّةً واحدة ⟵ ٤٠٩", (await call("POST", `/api/physio/suggestions/${r1.json.id}/accept`, S.spec)).status, 409);
    const aud = (await q(`SELECT new_values FROM audit_log WHERE entity_type = 'physio_plan' AND entity_id = $1 AND action = 'create'`, [plan])).rows;
    same("هـ.٧ وسطرُ تدقيقٍ يسمّي الاقتراح", aud.map((r) => (typeof r.new_values === "string" ? JSON.parse(r.new_values) : r.new_values).suggestionId), [r1.json.id]);

    console.log("\n── و. «جرّب هذا» من البدائل ──");
    calls.length = 0;
    reply = { adjust: {} };
    const alt = await suggestFor(S.spec, pt.id, { protocolId: P2, fromSuggestionId: r1.json.id });
    same("و.١ بلا خطوة اختيار، والبديلُ مختارٌ بسببه، والأوّلُ صار بديلاً",
      [alt.status, calls.map((c) => c.step), alt.json.protocol.protocolId, alt.json.protocol.reasonAr, alt.json.alternatives.map((a: any) => a.protocolId)],
      [200, ["adjust"], P2, "بديل", [P1]]);

    console.log("\n── ز. القبولُ بتقاطعٍ مع البروتوكول الآن ──");
    reply = { choose: { choices: [{ protocolId: P1, reasonAr: "طفل" }] }, adjust: {} };
    const r3 = await suggestFor(S.sup, pt.id);
    await q(`UPDATE physio_protocol_devices SET minutes = 25 WHERE protocol_id = $1 AND device_id = $2`, [P1, ROBOT]);
    await q(`DELETE FROM physio_protocol_devices WHERE protocol_id = $1 AND device_id = $2`, [P1, EXER]);
    const acc3 = await call("POST", `/api/physio/suggestions/${r3.json.id}/accept`, S.sup);
    const g3 = (await call("GET", `/api/physio/plans/${acc3.json.id}`, S.sup)).json;
    same("ز.١ جهازٌ أُزيل من البروتوكول بعد الاقتراح لا يعود، ودقائقُ فوق البروتوكول الآن تنزل إليه",
      g3.devices.map((d: any) => [d.deviceId, d.minutes]).sort((a: any, b: any) => a[0] - b[0]), [[ROBOT, 25], [LASER, 10]].sort((a, b) => a[0] - b[0]));

    console.log("\n── ح. حذفُ الخطّة والمريض ──");
    same("ح.١ المسؤولُ يحذف خطّةً فُتحت من اقتراح ⟵ ٢٠٠", (await call("DELETE", `/api/physio/plans/${acc3.json.id}`, S.admin)).status, 200);
    same("ح.٢ والاقتراحُ باقٍ بلا خطّة", (await q(`SELECT plan_id FROM physio_plan_suggestions WHERE id = $1`, [r3.json.id])).rows[0].plan_id, null);
    let deleted = true;
    try { await storage.deletePatient(pt.id); } catch (e) { deleted = false; console.error(e); }
    check(deleted, "ح.٣ الحذفُ النهائيّ للمريض ينجح");
    same("ح.٤ ولا اقتراحَ باقٍ له", Number((await q(`SELECT count(*) FROM physio_plan_suggestions WHERE patient_id = $1`, [pt.id])).rows[0].count), 0);
  } finally {
    setSuggestCompleterForTests(null);
    httpServer.close();
    await cleanup();
    await pool.end();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
