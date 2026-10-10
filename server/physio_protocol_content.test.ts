// **البروتوكولاتُ المفصَّلة — المحتوى كلُّه بقواعد الشاشة، والقالبُ نفسُه لكلّ بروتوكول** (ترحيلا ١١٩ و١٢٤، §4.cx · §4.dd · §4.dg).
// `npm run test:physio-protocol-content` — حيٌّ على النقاط الحقيقية (منفذ ٧٠٠٦، فرع ٨٩٥٥، مستخدمون ٨٩٥٦–٨٩٥٩). يحرس:
//   ق — المحتوى قبل أن يصل القاعدة، **لكلّ ترحيل محتوى في `CONTENT`** (البروتوكولُ القادم يُضاف سطراً هنا فتحرسه القواعدُ نفسُها):
//       كلُّ بطاقةٍ ومرحلةٍ يحفظها المحرّرُ كما هي بلا قصّ، كاملةً بالنسختين؛ رموزُ الصور فريدةٌ في المكتبة كلّها؛ كلُّ تمرينٍ في المراحل بطاقةٌ موجودة؛
//       وللقالب الجديد (من ١٢٤): عددُ الجلسات والأسابيعُ مشتقّةٌ منه، والمراحلُ تغطّي الجلساتِ متّصلةً، ولكلّ جهازٍ استعمالُه وإعداداتٌ تقبلها خاناتُه؛
//       والمراجعُ بعنوانٍ وجهةٍ وسنة وروابطُ آمنة؛ ونصوصُ البروتوكول في حدّ المحرّر؛ **وترحيلُ ١١٩ لم يتغيّر حرفٌ منه** بتوسيع أداة البناء.
//   أ — الترحيلُ ١٢٤ على القاعدة: الجرعةُ والنطاقاتُ والروابطُ والأجهزةُ واستعمالُها والمراجع، ولا تكرار، وتعديلُ الإنسان باقٍ، والمعتمَدُ بلا مراحل يعود
//       مسوّدة، والخططُ المفتوحة تأخذ نسختَها والموقوفةُ لا، وألمُ الظهر المزمن لا يُمَسّ.
//   ب — من الأبواب الحقيقية: صفحةُ البروتوكول وموجزُ المساعد يحملانه، والخطّةُ الجديدة تنسخ مراحلَه وعددَه وتأخذ الأساسيَّ وحده، والصورُ الجديدة مطلوبة.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "physio-protocol-content-test-secret";

import express from "express";
import { createHash } from "crypto";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { DEVICE_PARAM_FIELDS, normalizeDeviceParams, parseExerciseBody, parsePhasesBody } from "@shared/physio_exercises";
import { normalizeDose } from "@shared/physio_protocols";
import type { ExerciseSeed, ProtocolContentSeed } from "./migrations/physio_content";
import * as m119 from "./migrations/119_physio_lbp_chronic_detail";
import * as m124 from "./migrations/124_physio_lbp_acute_detail";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

/** **ترحيلاتُ المحتوى بترتيبها** — `template: true` للقالب الكامل بعد ١٢٢ و١٢٣ (العدد والنطاقات والاستعمال). */
const CONTENT: { name: string; EXERCISES: ExerciseSeed[]; PROTOCOL: ProtocolContentSeed; template: boolean }[] = [
  { name: m119.name, EXERCISES: m119.EXERCISES, PROTOCOL: m119.PROTOCOL, template: false },
  { name: m124.name, EXERCISES: m124.EXERCISES, PROTOCOL: m124.PROTOCOL, template: true },
];
//  بصمةُ ما يُنتجه ترحيلُ ١١٩ — مُشغَّلٌ على الإنتاج؛ وأداةُ البناء المشتركة تتوسّع لكلّ بروتوكول، فلا يتغيّر ما أنتجته له.
const SQL119_SHA256 = "1a34f512f4e765e3f20b28364853eb31ebdf21625f81f52de564f6fa77dc24eb";

const PORT = 7006;
const BASE = `http://127.0.0.1:${PORT}`;
const B1 = 8955;
const ADMIN = 8956, SUP = 8957, SPEC = 8958, TECH = 8959;
const IDS = [ADMIN, SUP, SPEC, TECH];
const MARK = "اختبار-محتوى-البروتوكول";
const ACUTE = "lbp-acute-adult";
const CHRONIC = "lbp-chronic-adult";

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_source = $1`, [MARK])).rows.map((r) => r.id);
  await q(`DELETE FROM staff_notification_outbox WHERE text LIKE '%${MARK}%'`);
  await q(`DELETE FROM physio_plans WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM patients WHERE id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM physio_device_branches WHERE branch_id = $1`, [B1]);
  for (const t of ["physio_protocols", "physio_exercises"]) {
    await q(`UPDATE ${t} SET updated_by = NULL WHERE updated_by = ANY($1::int[])`, [IDS]);
    await q(`UPDATE ${t} SET approved_by = NULL WHERE approved_by = ANY($1::int[])`, [IDS]);
  }
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

/** البطاقةُ كما يرسلها المحرّر — فما يكتبه الترحيلُ يحفظه المحرّرُ لاحقاً بلا قصّ. */
const exerciseBody = (e: ExerciseSeed) => ({
  code: e.code, nameAr: e.nameAr, nameEn: e.nameEn, kind: e.kind, region: e.region, perSide: e.perSide, homeSuitable: e.homeSuitable,
  sets: e.sets, reps: e.reps, holdSeconds: e.hold, restSeconds: e.rest,
  purpose: e.purpose[0], purposeEn: e.purpose[1], startPosition: e.start[0], startPositionEn: e.start[1],
  steps: e.steps[0].join("\n"), stepsEn: e.steps[1].join("\n"), cues: e.cues[0].join("\n"), cuesEn: e.cues[1].join("\n"),
  easier: e.easier[0], easierEn: e.easier[1], harder: e.harder[0], harderEn: e.harder[1], stopIf: e.stopIf[0], stopIfEn: e.stopIf[1],
  equipment: e.equipment[0], equipmentEn: e.equipment[1], doseNote: e.doseNote?.[0], doseNoteEn: e.doseNote?.[1],
  images: e.images.map((i) => ({ key: i.key, captionAr: i.ar, captionEn: i.en, search: i.search })),
});
const phasesBody = (p: ProtocolContentSeed, idOf: (code: string) => number) => p.phases.map((ph) => ({
  nameAr: ph.name[0], nameEn: ph.name[1], sessionFrom: ph.sessionFrom, sessionTo: ph.sessionTo,
  timeframe: ph.timeframe[0], timeframeEn: ph.timeframe[1], goals: ph.goals[0], goalsEn: ph.goals[1],
  education: ph.education[0], educationEn: ph.education[1], progressCriteria: ph.criteria[0], progressCriteriaEn: ph.criteria[1],
  notes: ph.notes[0], notesEn: ph.notes[1],
  exercises: ph.exercises.map((x) => ({ exerciseId: idOf(x.code), sets: x.sets, reps: x.reps, holdSeconds: x.hold, restSeconds: x.rest,
    doseNote: x.doseNote?.[0], doseNoteEn: x.doseNote?.[1], note: x.note?.[0], noteEn: x.note?.[1] })),
}));
const PROTOCOL_TEXT_MAX = 8000; //  `text()` في `server/physio_protocols/routes.ts` — حدُّ المحرّر.

async function main() {
  // ══ ق. المحتوى قبل القاعدة ══
  console.log("\n── ق. المحتوى بقواعد الشاشة — لكلّ ترحيل محتوى ──");
  const allCards = CONTENT.flatMap((c) => c.EXERCISES);
  const allKeys = allCards.flatMap((e) => e.images.map((i) => i.key));
  same("ق.١ **رموزُ البطاقات ورموزُ الصور فريدةٌ في المكتبة كلّها** (بطاقةٌ تُزرع مرّةً في أوّل بروتوكولٍ يحتاجها، ويستعملها التالي برمزها)",
    [allCards.length - new Set(allCards.map((e) => e.code)).size, allKeys.length - new Set(allKeys).size], [0, 0]);
  const fakeId = new Map(allCards.map((e, i) => [e.code, i + 1]));
  for (const c of CONTENT) {
    const tag = c.name.slice(0, 3);
    //  البطاقة: ما يكتبه الترحيلُ هو ما يقبله المحرّرُ ويحفظه — لا قصَّ ولا رفض.
    const cardIssues = c.EXERCISES.flatMap((e) => {
      const body = exerciseBody(e);
      const r = parseExerciseBody(body);
      if (typeof r === "string") return [`${e.code}: ${r}`];
      const cut = Object.keys(body).filter((k) => typeof (body as any)[k] === "string" && k !== "code" && (r as any)[k] !== (body as any)[k]);
      const capCut = r.images.some((im, i) => im.captionAr !== e.images[i].ar || im.captionEn !== e.images[i].en || im.search !== e.images[i].search);
      return [...cut.map((k) => `${e.code}.${k} قُصّ`), ...(capCut ? [`${e.code}.images قُصّت`] : [])];
    });
    same(`ق.٢/${tag} **كلُّ بطاقةٍ يقبلها المحرّرُ ويحفظها كما هي** — لا قصَّ في نصٍّ ولا في صورة`, cardIssues, []);
    const incomplete = c.EXERCISES.filter((e) => !(e.purpose[0] && e.purpose[1] && e.start[0] && e.start[1] && e.steps[0].length >= 3
      && e.steps[0].length === e.steps[1].length && e.cues[0].length >= 3 && e.cues[0].length === e.cues[1].length && e.easier[0] && e.easier[1]
      && e.harder[0] && e.harder[1] && e.stopIf[0] && e.stopIf[1] && e.equipment[0] && e.equipment[1] && e.images.length >= 1
      && e.images.every((i) => i.ar && i.en && i.search.trim().split(/\s+/).length >= 2))).map((e) => e.code);
    same(`ق.٣/${tag} وكلُّ بطاقةٍ كاملةٌ بالنسختين: هدف، بداية، ٣ خطواتٍ فأكثر بعددٍ واحد، ٣ أخطاءٍ فأكثر، أسهل وأصعب، متى يتوقّف، أدوات، وصورٌ بكلمات بحث`, incomplete, []);
    //  المراحل: تمارينُها من بطاقات هذا الترحيل أو ما قبله، وكلُّ بطاقةٍ جديدةٍ في مرحلة، ويحفظها المحرّرُ كما هي.
    const known = new Set(CONTENT.slice(0, CONTENT.indexOf(c) + 1).flatMap((x) => x.EXERCISES.map((e) => e.code)));
    const used = c.PROTOCOL.phases.flatMap((p) => p.exercises.map((x) => x.code));
    same(`ق.٤/${tag} **كلُّ تمرينٍ في المراحل بطاقةٌ زُرعت قبله أو معه، وكلُّ بطاقةٍ جديدةٍ في مرحلة**`,
      [used.filter((x) => !known.has(x)), c.EXERCISES.filter((e) => !used.includes(e.code)).map((e) => e.code)], [[], []]);
    const body = phasesBody(c.PROTOCOL, (code) => fakeId.get(code) ?? 0);
    const parsed = parsePhasesBody(body);
    const phaseCut = typeof parsed === "string" ? [parsed] : parsed.flatMap((ph, i) => Object.keys(body[i])
      .filter((k) => typeof (body[i] as any)[k] === "string" && (ph as any)[k] !== (body[i] as any)[k]).map((k) => `مرحلة ${i + 1}.${k} قُصّ`)
      .concat(ph.exercises.flatMap((x, j) => (["doseNote", "doseNoteEn", "note", "noteEn"] as const)
        .filter((k) => (body[i].exercises[j] as any)[k] !== undefined && x[k] !== (body[i].exercises[j] as any)[k]).map((k) => `مرحلة ${i + 1} تمرين ${j + 1}.${k} قُصّ`))));
    same(`ق.٥/${tag} **والمراحلُ يقبلها المحرّرُ ويحفظها كما هي**، وكلٌّ بأهدافها وتثقيفها ومعيارها وملاحظاتها بالنسختين`,
      [phaseCut, c.PROTOCOL.phases.filter((p) => ![p.name, p.timeframe, p.goals, p.education, p.criteria, p.notes].every((b) => b[0] && b[1])).length], [[], 0]);
    const p = c.PROTOCOL;
    const longText = (["summary", "goals", "assessment", "exercises", "contraindications", "precautions"] as const)
      .flatMap((f) => p[f].map((v, i) => (v.length > PROTOCOL_TEXT_MAX ? `${f}${i ? "En" : ""}=${v.length}` : null))).filter(Boolean);
    same(`ق.٦/${tag} ونصوصُ البروتوكول الستّة بالنسختين، وفي حدّ المحرّر (${PROTOCOL_TEXT_MAX})`,
      [longText, (["summary", "goals", "assessment", "exercises", "contraindications", "precautions"] as const).filter((f) => !(p[f][0] && p[f][1]))], [[], []]);
    const refIssues = p.refs.filter((r) => !(r.title && r.org && r.year >= 1990 && r.year <= 2026) || (r.url !== undefined && !/^https:\/\/\S+$/.test(r.url))).map((r) => r.title);
    same(`ق.٧/${tag} والمراجعُ بعنوانٍ وجهةٍ وسنة، والرابطُ — حين يُتيقَّن منه — https`, refIssues, []);
    const deviceIssues = p.devices.flatMap((d) => {
      if (!(d.code in DEVICE_PARAM_FIELDS)) return [`${d.code}: جهازٌ مجهول`];
      const n = normalizeDeviceParams(d.code, d.params ?? {});
      if (typeof n === "string") return [`${d.code}: ${n}`];
      return JSON.stringify(n) === JSON.stringify(d.params ?? {}) ? [] : [`${d.code}: خاناتٌ قُصّت`];
    });
    same(`ق.٨/${tag} **إعداداتُ كلّ جهازٍ تقبلها خاناتُه** (لا خانةَ لا تخصّه)، ولا جهازَ مكرّر`,
      [deviceIssues, p.devices.length - new Set(p.devices.map((d) => d.code)).size], [[], 0]);
    if (!c.template) continue;
    //  القالبُ الكامل (§4.dd): العددُ أساسُ الجرعة، والمراحلُ تغطّي الجلساتِ متّصلة، ولكلّ جهازٍ استعمالُه.
    const ranges = p.phases.map((ph) => [ph.sessionFrom, ph.sessionTo]);
    const contiguous = ranges.every(([a, b], i) => typeof a === "number" && typeof b === "number" && a <= b && a === (i === 0 ? 1 : (ranges[i - 1][1] as number) + 1));
    same(`ق.٩/${tag} **عددُ الجلسات أساسُ الجرعة**: الأسابيعُ مشتقّةٌ منه، والمراحلُ متّصلةٌ من الجلسة ١ إلى الأخيرة`,
      [normalizeDose({ totalSessions: p.totalSessions ?? null, sessionsPerWeek: p.spw, durationWeeks: null }).durationWeeks, contiguous, ranges[ranges.length - 1]?.[1]],
      [p.weeks, true, p.totalSessions]);
    const uses = p.devices.map((d) => d.centreUse);
    same(`ق.١٠/${tag} **ولكلّ جهازٍ «استعمالُ المركز»** صريحاً: التمارين أساسيّ، وما «لا يُستخدم» بلا دقائق ولا إعدادات`,
      [uses.filter((u) => u === undefined).length, p.devices.find((d) => d.code === "exercise")?.centreUse,
        p.devices.filter((d) => d.centreUse === "not_used" && (d.minutes !== undefined || Object.keys(d.params ?? {}).length)).map((d) => d.code)],
      [0, "core", []]);
  }
  same("ق.١١ **وترحيلُ ١١٩ لم يتغيّر حرفٌ منه** — أداةُ البناء توسّعت للقالب الكامل والحقولُ الجديدة اختيارية",
    createHash("sha256").update(m119.sql).digest("hex"), SQL119_SHA256);

  // ══ أ. الترحيل على القاعدة ══
  console.log("\n── أ. ترحيل ١٢٤ على القاعدة ──");
  await cleanup();
  const proto = async (code: string) => (await q(`SELECT p.id, p.status, p.summary, p.total_sessions, p.sessions_per_week, p.duration_weeks, p.session_minutes,
      jsonb_array_length(p."references") AS refs,
      (SELECT json_agg(json_build_array(ph.position, ph.session_from, ph.session_to) ORDER BY ph.position) FROM physio_protocol_phases ph WHERE ph.protocol_id = p.id) AS ranges,
      (SELECT count(*)::int FROM physio_protocol_phase_exercises pe JOIN physio_protocol_phases ph ON ph.id = pe.phase_id WHERE ph.protocol_id = p.id) AS links,
      (SELECT json_agg(json_build_array(d.code, pd.centre_use, pd.evidence) ORDER BY pd.display_order) FROM physio_protocol_devices pd JOIN devices d ON d.id = pd.device_id WHERE pd.protocol_id = p.id) AS devices
      FROM physio_protocols p WHERE p.code = $1`, [code])).rows[0];
  const snapshot = async (code: string) => JSON.stringify((await q(`SELECT to_jsonb(p) - 'updated_at' AS p,
      (SELECT json_agg(to_jsonb(ph) - 'id' ORDER BY ph.position) FROM physio_protocol_phases ph WHERE ph.protocol_id = p.id) AS phases,
      (SELECT json_agg(to_jsonb(pd) - 'id' ORDER BY pd.display_order) FROM physio_protocol_devices pd WHERE pd.protocol_id = p.id) AS devices
      FROM physio_protocols p WHERE p.code = $1`, [code])).rows[0]);
  const chronicBefore = await snapshot(CHRONIC);
  await q(m124.sql);
  const a0 = await proto(ACUTE);
  const P = m124.PROTOCOL;
  same("أ.١ **ألمُ الظهر الحادّ ١٢ جلسة × ستّ في الأسبوع × ٥٠ دقيقة (أسبوعان)**، والمراحلُ ١–٤ · ٥–٩ · ١٠–١٢، والروابطُ والمراجعُ كما في الترحيل، ومسوّدة",
    [a0.total_sessions, a0.sessions_per_week, a0.duration_weeks, a0.session_minutes, a0.ranges, a0.links, a0.refs, a0.status],
    [12, 6, 2, 50, [[1, 1, 4], [2, 5, 9], [3, 10, 12]], P.phases.reduce((n, ph) => n + ph.exercises.length, 0), P.refs.length, "draft"]);
  same("أ.٢ **والأجهزةُ العشرة باستعمالها ودليلها**: التمارين أساسيّ، والحرارةُ أوّلُ المساعدين بدليلٍ قويّ، والليزرُ والأمواجُ فوق الصوتية لا يُستخدمان",
    a0.devices, P.devices.map((d) => [d.code, d.centreUse, d.evidence]));
  const newCodes = m124.EXERCISES.map((e) => e.code);
  const cards = async () => (await q(`SELECT code, status FROM physio_exercises WHERE code = ANY($1::text[]) ORDER BY code`, [newCodes])).rows;
  same("أ.٣ **والبطاقاتُ الأربع الجديدة مسوّدات**", (await cards()).map((r) => r.status), ["draft", "draft", "draft", "draft"]);
  await q(m124.sql);
  const a1 = await proto(ACUTE);
  same("أ.٤ **والإعادةُ لا تكرّر شيئاً**", [a1.ranges, a1.links, a1.devices.length, (await cards()).length], [a0.ranges, a0.links, 10, 4]);
  same("أ.٥ **وألمُ الظهر المزمن لم يُمَسّ** — بروتوكولُه ومراحلُه وأجهزتُه كما كانت قبل الترحيل", (await snapshot(CHRONIC)) === chronicBefore, true);
  //  سليمٌ عدّل الملخّص واعتمد، ثمّ حُذفت المراحل، وعدّل بطاقةً جديدة — الترحيلُ يعيد المراحلَ ولا يكتب فوق ما كتبه، ويعيده مسوّدةً لأنّ محتوىً جديداً دخل.
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع محتوى البروتوكول')`, [B1]);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_supervise_physio)
           VALUES ($1, 'ppc-admin', 'x', 'المسؤول', 'admin', NULL, '[]', true, false),
                  ($2, 'ppc-sup', 'x', 'سليم', 'branch_manager', $5, $6::jsonb, true, true),
                  ($3, 'ppc-spec', 'x', 'مصطفى', 'physio_specialist', $5, $6::jsonb, true, false),
                  ($4, 'ppc-tech', 'x', 'علي', 'physio_technician', $5, $6::jsonb, true, false)`,
    [ADMIN, SUP, SPEC, TECH, B1, JSON.stringify([B1])]);
  await q(`UPDATE physio_protocols SET summary = 'ملخّصُ سليم', updated_by = $1, total_sessions = 8, sessions_per_week = 4, duration_weeks = 2,
             status = 'approved', approved_by_name = 'سليم' WHERE id = $2`, [SUP, a0.id]);
  await q(`UPDATE physio_protocol_devices SET centre_use = 'core', minutes = 20 WHERE protocol_id = $1
             AND device_id = (SELECT id FROM devices WHERE code = 'hot_pack')`, [a0.id]);
  await q(`DELETE FROM physio_protocol_phases WHERE protocol_id = $1`, [a0.id]);
  await q(`UPDATE physio_exercises SET purpose = 'هدفُ سليم' WHERE code = 'log-roll'`);
  await q(m124.sql);
  const a2 = await proto(ACUTE);
  same("أ.٦ **تعديلُ الإنسان باقٍ** (الملخّصُ والعددُ واستعمالُ الحرارة والبطاقة)، **والمراحلُ تعود، والمعتمَدُ بلا مراحل يعود مسوّدة**",
    [a2.summary, a2.total_sessions, a2.sessions_per_week, a2.devices.find((d: any[]) => d[0] === "hot_pack")?.[1],
      (await q(`SELECT purpose FROM physio_exercises WHERE code = 'log-roll'`)).rows[0].purpose, a2.ranges, a2.status],
    ["ملخّصُ سليم", 8, 4, "core", "هدفُ سليم", [[1, 1, 4], [2, 5, 9], [3, 10, 12]], "draft"]);
  await q(`UPDATE physio_protocols SET updated_by = NULL WHERE id = $1`, [a0.id]);
  await q(m124.sql);
  //  ثمّ يُعاد كما يكتبه الترحيل — لباقي الحزمة، ولأنّ البطاقةَ المعدَّلة لا تعود (ON CONFLICT DO NOTHING) تُعاد يدوياً.
  await q(`UPDATE physio_exercises SET purpose = $1 WHERE code = 'log-roll'`, [m124.EXERCISES[0].purpose[0]]);
  same("أ.٧ **وحين يُرفع أثرُ الإنسان يكتب الترحيلُ محتواه كاملاً من جديد** (الجرعةُ والأجهزة)",
    [(await proto(ACUTE)).total_sessions, (await proto(ACUTE)).devices.find((d: any[]) => d[0] === "hot_pack")?.[1]], [12, "adjunct"]);
  //  الخططُ المفتوحة تأخذ نسختَها، والموقوفةُ تبقى تاريخاً.
  const mkPatient = async (label: string) => Number((await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_physiotherapy)
      VALUES ($1, '07709991002', $2, '38', 'physiotherapy', $3, true) RETURNING id`, [`${label} ${MARK}`, MARK, B1])).rows[0].id);
  const pt0 = await mkPatient("قديم");
  await q(`DELETE FROM physio_protocol_phases WHERE protocol_id = $1`, [a0.id]);
  const openPlan = Number((await q(`INSERT INTO physio_plans (patient_id, branch_id, protocol_id, title_ar, status, sessions_per_week, duration_weeks)
      VALUES ($1, $2, $3, 'خطّةٌ قبل التفصيل', 'pending', 2, 4) RETURNING id`, [pt0, B1, a0.id])).rows[0].id);
  const stoppedPlan = Number((await q(`INSERT INTO physio_plans (patient_id, branch_id, protocol_id, title_ar, status)
      VALUES ($1, $2, $3, 'خطّةٌ موقوفة', 'stopped') RETURNING id`, [pt0, B1, a0.id])).rows[0].id);
  await q(m124.sql);
  const planPhases = async (id: number) => (await q(`SELECT count(DISTINCT ph.id)::int AS phases, count(pe.id)::int AS links,
      (SELECT json_agg(json_build_array(x.session_from, x.session_to) ORDER BY x.position) FROM physio_plan_phases x WHERE x.plan_id = $1) AS ranges
      FROM physio_plan_phases ph LEFT JOIN physio_plan_phase_exercises pe ON pe.phase_id = ph.id WHERE ph.plan_id = $1`, [id])).rows[0];
  same("أ.٨ **الخطّةُ المفتوحة قبل التفصيل تأخذ نسختَها من المراحل بنطاقاتها، والموقوفةُ تبقى تاريخاً**",
    [await planPhases(openPlan), (await planPhases(stoppedPlan)).phases], [{ phases: 3, links: a0.links, ranges: [[1, 4], [5, 9], [10, 12]] }, 0]);
  await q(m124.sql);
  same("أ.٩ **ولا تتضاعف بالتكرار**", (await planPhases(openPlan)).links, a0.links);
  //  وترحيلُ بروتوكولٍ لا يمسّ خططَ غيره: خطّةُ ألمٍ مزمن مفتوحة بلا مراحل (أزالها الأخصائيُّ لمريضه عمداً) تبقى بلا مراحل.
  const chronicId = Number((await proto(CHRONIC)).id);
  const otherPlan = Number((await q(`INSERT INTO physio_plans (patient_id, branch_id, protocol_id, title_ar, status)
      VALUES ($1, $2, $3, 'خطّةُ ألمٍ مزمن بلا مراحل', 'approved') RETURNING id`, [pt0, B1, chronicId])).rows[0].id);
  await q(m124.sql);
  same("أ.١٠ **وخطّةٌ على بروتوكولٍ آخر لا يمسّها** — نسخُ المراحل لخطط هذا البروتوكول وحده", (await planPhases(otherPlan)).phases, 0);

  // ══ ب. من الأبواب الحقيقية ══
  const S = {
    sup: hdr({ userId: SUP, displayName: "سليم", role: "branch_manager", branchId: B1, isAdmin: false, permissions: { canSupervisePhysio: true } }),
    spec: hdr({ userId: SPEC, displayName: "مصطفى", role: "physio_specialist", branchId: B1, isAdmin: false, permissions: {} }),
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
    const r = await fetch(`${BASE}${path}`, {
      method, headers: { "content-type": "application/json", "x-test-session": session },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json: any = null;
    try { json = await r.json(); } catch { /* */ }
    return { status: r.status, json };
  };
  await q(`INSERT INTO physio_device_branches (device_id, branch_id, available) SELECT id, $1, true FROM devices`, [B1]);

  try {
    console.log("\n── ب. من الأبواب الحقيقية ──");
    const page = await call("GET", `/api/physio/protocols/${a0.id}`, S.spec);
    const ph1 = page.json?.phases?.[0];
    same("ب.١ **صفحةُ البروتوكول**: ١٢ جلسة، والمراحلُ بنطاقاتها، وأوّلُها يبدأ بالتنفّس ثمّ «النهوض من السرير بالتدحرج»، والحرارةُ «مساعد» مكتوباً",
      [page.status, page.json?.totalSessions, (page.json?.phases ?? []).map((p: any) => [p.sessionFrom, p.sessionTo]),
        (ph1?.exercises ?? []).slice(0, 2).map((x: any) => x.exercise?.code),
        (page.json?.devices ?? []).filter((d: any) => d.code === "hot_pack").map((d: any) => [d.centreUse, d.centreUseSet])],
      [200, 12, [[1, 4], [5, 9], [10, 12]], ["diaphragmatic-breathing", "log-roll"], [["adjunct", true]]]);
    const brief = await call("GET", `/api/physio/protocols/${a0.id}/brief?lang=ar`, S.spec);
    const bp = brief.json?.protocol;
    same("ب.٢ **وموجزُ المساعد** يحمل العددَ والمراحلَ الثلاث بتمارينها وجرعتها، والمراجعَ الاثنتي عشرة",
      [brief.status, bp?.dose?.totalSessions, (bp?.phases ?? []).map((p: any) => p.exercises.length), bp?.references?.length,
        (bp?.phases?.[1]?.exercises ?? []).some((x: any) => x.exercise === "رفع القدم بالتناوب مع شدّ البطن في الاستلقاء" && /تكرار/.test(x.dose))],
      [200, 12, P.phases.map((ph) => ph.exercises.length), 12, true]);
    const pt = await mkPatient("سعد");
    const created = await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: a0.id });
    const plan = (await call("GET", `/api/physio/plans/${created.json?.id}`, S.spec)).json;
    same("ب.٣ **والخطّةُ الجديدة عليه تنسخ مراحلَه بنطاقاتها وعددَه، وتأخذ الأساسيَّ وحده** — والمساعدُ يؤشّره الأخصائيُّ لمريضه",
      [created.status, plan?.totalSessions, plan?.sessionsPerWeek, (plan?.phases ?? []).map((p: any) => [p.sessionFrom, p.sessionTo, p.exercises.length]),
        (plan?.devices ?? []).map((d: any) => d.code), (plan?.protocolAdjuncts ?? []).length],
      [200, 12, 6, P.phases.map((ph) => [ph.sessionFrom, ph.sessionTo, ph.exercises.length]), ["exercise"], P.devices.filter((d) => d.centreUse === "adjunct").length]);
    const missing = await call("GET", "/api/physio/exercises/missing-images", S.sup);
    const keys = (Array.isArray(missing.json) ? missing.json : []).map((m: any) => m.key);
    const newKeys = m124.EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    same("ب.٤ **والصورُ الستّ الجديدة في «الصور المطلوبة»** بكلمات بحثها — منها يبحث المالك",
      [missing.status, newKeys.filter((k) => !keys.includes(k)), newKeys.length], [200, [], 6]);
  } finally {
    await cleanup();
    httpServer.close();
    await pool.end();
  }
  console.log(failures === 0 ? "\nكلُّ التأكيدات نجحت." : `\n${failures} تأكيداً سقط.`);
  process.exit(failures ? 1 : 0);
}

main().catch(async (e) => { console.error(e); try { await cleanup(); } catch { /* */ } process.exit(1); });
