// **البروتوكولاتُ المفصَّلة — المحتوى كلُّه بقواعد الشاشة، والقالبُ نفسُه لكلّ بروتوكول** (ترحيلات ١١٩ و١٢٤ و١٢٥ و١٢٦ و١٢٨ و١٢٩ و١٣٠ … ١٣٨، §4.cx · §4.dd · §4.dg · §4.dh).
// `npm run test:physio-protocol-content` — حيٌّ على النقاط الحقيقية (منفذ ٧٠٠٦، فرع ٨٩٥٥، مستخدمون ٨٩٥٦–٨٩٥٩). يحرس:
//   ق — المحتوى قبل أن يصل القاعدة، **لكلّ ترحيل محتوى في `CONTENT`** (البروتوكولُ القادم يُضاف سطراً هنا فتحرسه القواعدُ نفسُها):
//       كلُّ بطاقةٍ ومرحلةٍ يحفظها المحرّرُ كما هي بلا قصّ، كاملةً بالنسختين؛ رموزُ الصور فريدةٌ في المكتبة كلّها؛ كلُّ تمرينٍ في المراحل بطاقةٌ موجودة؛
//       وللقالب الجديد (من ١٢٤): عددُ الجلسات والأسابيعُ مشتقّةٌ منه، والمراحلُ تغطّي الجلساتِ متّصلةً، ولكلّ جهازٍ استعمالُه وإعداداتٌ تقبلها خاناتُه؛
//       والمراجعُ بعنوانٍ وجهةٍ وسنة وروابطُ آمنة؛ ونصوصُ البروتوكول في حدّ المحرّر ولا «**» فيها (الشاشةُ لا تنسّق)؛ **وترحيلُ ١١٩ لم يتغيّر حرفٌ منه** بتوسيع أداة البناء.
//   أ — الترحيلُ ١٢٤ على القاعدة: الجرعةُ والنطاقاتُ والروابطُ والأجهزةُ واستعمالُها والمراجع، ولا تكرار، وتعديلُ الإنسان باقٍ، والمعتمَدُ بلا مراحل يعود
//       مسوّدة، والخططُ المفتوحة تأخذ نسختَها والموقوفةُ لا، وألمُ الظهر المزمن لا يُمَسّ.
//   ج — **كلُّ بروتوكولٍ بعد الثاني على القاعدة بالقواعد نفسِها** (سطرُه في `CONTENT` يكفي): الجرعةُ والنطاقاتُ والروابطُ والأجهزةُ والمراجع، والبطاقاتُ
//       مسوّدات، ولا تكرار، والخطّةُ المفتوحة تأخذ نسختَها، وكلُّ بروتوكولٍ مفصَّلٍ غيره لا يُمَسّ.
//   ص — وصفُ صور الورك كما وصلت (ترحيل ١٤١): يقبله المحرّر، ولا يُكتب فوق وصفٍ عدّله المشرف، والإعادةُ لا تفعل شيئاً.
//   ب — من الأبواب الحقيقية: صفحةُ البروتوكول وموجزُ المساعد يحملانه، والخطّةُ الجديدة تنسخ مراحلَه وعددَه وتأخذ الأساسيَّ وحده، وكلُّ صورةٍ
//       في مكانها: ما وصل معروضٌ وما لم يصل في «الصور المطلوبة» (وصورُ الثاني وصلت ٢٠٢٦-١٠-١٠)؛ وكلُّ بروتوكولٍ بعده بصفحته وخطّته (ب.٥).

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
import { EXERCISE_IMAGE_FILES } from "@shared/physio_exercise_media";
import type { ExerciseSeed, ProtocolContentSeed } from "./migrations/physio_content";
import * as m119 from "./migrations/119_physio_lbp_chronic_detail";
import * as m124 from "./migrations/124_physio_lbp_acute_detail";
import * as m125 from "./migrations/125_physio_neck_pain_detail";
import * as m126 from "./migrations/126_physio_knee_oa_detail";
import * as m128 from "./migrations/128_physio_subacromial_detail";
import * as m129 from "./migrations/129_physio_stroke_subacute_detail";
import * as m130 from "./migrations/130_physio_ankle_sprain_detail";
import * as m135 from "./migrations/135_physio_prosthetic_gait_detail";
import * as m136 from "./migrations/136_physio_preprosthetic_detail";
import * as m137 from "./migrations/137_physio_upper_limb_amputation_detail";
import * as m138 from "./migrations/138_physio_tka_detail";
import * as m140 from "./migrations/140_physio_tha_detail";
import * as m141 from "./migrations/141_physio_tha_image_captions";
import * as m144 from "./migrations/144_physio_heel_image_captions";
import * as m143 from "./migrations/143_physio_plantar_heel_detail";
import * as m145 from "./migrations/145_physio_sciatica_detail";
import * as m149 from "./migrations/149_physio_frozen_shoulder_detail";
import * as m151 from "./migrations/151_physio_cervical_radiculopathy_detail";
import * as m152 from "./migrations/152_physio_lateral_elbow_detail";
import * as m153 from "./migrations/153_physio_lumbar_stenosis_detail";
import * as m155 from "./migrations/155_physio_patellofemoral_detail";
import * as m156 from "./migrations/156_physio_hip_oa_detail";
import * as m157 from "./migrations/157_physio_stroke_chronic_detail";
import * as m158 from "./migrations/158_physio_meniscal_detail";
import * as m159 from "./migrations/159_physio_acl_reconstruction_detail";
import * as m150 from "./migrations/150_physio_frozen_shoulder_hbb_direction";

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
const CONTENT: { name: string; sql: string; EXERCISES: ExerciseSeed[]; PROTOCOL: ProtocolContentSeed; template: boolean }[] = [
  { name: m119.name, sql: m119.sql, EXERCISES: m119.EXERCISES, PROTOCOL: m119.PROTOCOL, template: false },
  { name: m124.name, sql: m124.sql, EXERCISES: m124.EXERCISES, PROTOCOL: m124.PROTOCOL, template: true },
  { name: m125.name, sql: m125.sql, EXERCISES: m125.EXERCISES, PROTOCOL: m125.PROTOCOL, template: true },
  { name: m126.name, sql: m126.sql, EXERCISES: m126.EXERCISES, PROTOCOL: m126.PROTOCOL, template: true },
  { name: m128.name, sql: m128.sql, EXERCISES: m128.EXERCISES, PROTOCOL: m128.PROTOCOL, template: true },
  { name: m129.name, sql: m129.sql, EXERCISES: m129.EXERCISES, PROTOCOL: m129.PROTOCOL, template: true },
  { name: m130.name, sql: m130.sql, EXERCISES: m130.EXERCISES, PROTOCOL: m130.PROTOCOL, template: true },
  { name: m135.name, sql: m135.sql, EXERCISES: m135.EXERCISES, PROTOCOL: m135.PROTOCOL, template: true },
  { name: m136.name, sql: m136.sql, EXERCISES: m136.EXERCISES, PROTOCOL: m136.PROTOCOL, template: true },
  { name: m137.name, sql: m137.sql, EXERCISES: m137.EXERCISES, PROTOCOL: m137.PROTOCOL, template: true },
  { name: m138.name, sql: m138.sql, EXERCISES: m138.EXERCISES, PROTOCOL: m138.PROTOCOL, template: true },
  { name: m140.name, sql: m140.sql, EXERCISES: m140.EXERCISES, PROTOCOL: m140.PROTOCOL, template: true },
  { name: m143.name, sql: m143.sql, EXERCISES: m143.EXERCISES, PROTOCOL: m143.PROTOCOL, template: true },
  { name: m145.name, sql: m145.sql, EXERCISES: m145.EXERCISES, PROTOCOL: m145.PROTOCOL, template: true },
  { name: m149.name, sql: m149.sql, EXERCISES: m149.EXERCISES, PROTOCOL: m149.PROTOCOL, template: true },
  { name: m151.name, sql: m151.sql, EXERCISES: m151.EXERCISES, PROTOCOL: m151.PROTOCOL, template: true },
  { name: m152.name, sql: m152.sql, EXERCISES: m152.EXERCISES, PROTOCOL: m152.PROTOCOL, template: true },
  { name: m153.name, sql: m153.sql, EXERCISES: m153.EXERCISES, PROTOCOL: m153.PROTOCOL, template: true },
  { name: m155.name, sql: m155.sql, EXERCISES: m155.EXERCISES, PROTOCOL: m155.PROTOCOL, template: true },
  { name: m156.name, sql: m156.sql, EXERCISES: m156.EXERCISES, PROTOCOL: m156.PROTOCOL, template: true },
  { name: m157.name, sql: m157.sql, EXERCISES: m157.EXERCISES, PROTOCOL: m157.PROTOCOL, template: true },
  { name: m158.name, sql: m158.sql, EXERCISES: m158.EXERCISES, PROTOCOL: m158.PROTOCOL, template: true },
  { name: m159.name, sql: m159.sql, EXERCISES: m159.EXERCISES, PROTOCOL: m159.PROTOCOL, template: true },
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
    //  الشاشةُ تعرض النصَّ كما هو — لا تنسيق؛ فـ«**» تظهر نجمتين حرفاً بحرف (وقعت في مسوّدة ١٢٥ وأُصلحت قبل الدمج).
    const stars = [c.PROTOCOL, ...c.EXERCISES].map((x) => JSON.stringify(x)).filter((j) => j.includes("**")).map((j) => JSON.parse(j).code);
    same(`ق.١٢/${tag} **ولا علامةَ تنسيقٍ «**» في نصٍّ يُعرض** — البطاقاتُ والبروتوكولُ بنصٍّ خام`, stars, []);
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

  // ══ ج. كلُّ بروتوكولٍ بعد الثاني على القاعدة ══
  //  القواعدُ نفسُها لكلّ بروتوكولٍ قادم — سطرُه في `CONTENT` يكفي، ولا يُكتب له قسمٌ هنا.
  console.log("\n── ج. كلُّ بروتوكولٍ مفصَّلٍ بعد الثاني على القاعدة ──");
  for (const c of CONTENT.slice(CONTENT.findIndex((x) => x.name === m124.name) + 1)) {
    const tag = c.name.slice(0, 3);
    const P = c.PROTOCOL;
    const others = CONTENT.filter((x) => x !== c).map((x) => x.PROTOCOL.code);
    const othersBefore = await Promise.all(others.map(snapshot));
    const pid = Number((await proto(P.code)).id);
    const pt = await mkPatient(`قبل ${tag}`);
    const open = Number((await q(`INSERT INTO physio_plans (patient_id, branch_id, protocol_id, title_ar, status)
        VALUES ($1, $2, $3, 'خطّةٌ قبل التفصيل', 'pending') RETURNING id`, [pt, B1, pid])).rows[0].id);
    await q(c.sql);
    const r0 = await proto(P.code);
    const links = P.phases.reduce((n, ph) => n + ph.exercises.length, 0);
    const ranges = P.phases.map((ph, i) => [i + 1, ph.sessionFrom, ph.sessionTo]);
    same(`ج.١/${tag} **الجرعةُ كما كُتبت** (${P.totalSessions} × ${P.spw} × ${P.minutes} — ${P.weeks} أسابيع)، والمراحلُ بنطاقاتها، والروابطُ والمراجعُ، ومسوّدة`,
      [r0.total_sessions, r0.sessions_per_week, r0.duration_weeks, r0.session_minutes, r0.ranges, r0.links, r0.refs, r0.status],
      [P.totalSessions, P.spw, P.weeks, P.minutes, ranges, links, P.refs.length, "draft"]);
    same(`ج.٢/${tag} **والأجهزةُ بترتيبها واستعمالها ودليلها** — ولا جهازَ من الزرع القديم يبقى خارجها`,
      r0.devices, P.devices.map((d) => [d.code, d.centreUse, d.evidence]));
    //  والموعدُ الدوريّ يُكتب مع سطره (§4.eb): السطرُ يُحذف ويُعاد، فبلا الحقلين ضاع الأسبوعيُّ الذي كتبه ١٣١ للموجات الصادمة.
    const sched = (await q(`SELECT json_agg(json_build_array(d.code, pd.every_days, pd.times) ORDER BY pd.display_order) AS s
        FROM physio_protocol_devices pd JOIN devices d ON d.id = pd.device_id WHERE pd.protocol_id = $1`, [pid])).rows[0].s;
    same(`ج.٢ب/${tag} **والموعدُ الدوريّ لكلّ جهازٍ كما كُتب** (كلَّ كم يوماً وكم مرّة)`,
      sched, P.devices.map((d) => [d.code, d.everyDays ?? null, d.times ?? null]));
    const codes = c.EXERCISES.map((e) => e.code);
    const cardRows = async () => (await q(`SELECT status FROM physio_exercises WHERE code = ANY($1::text[])`, [codes])).rows.map((r) => r.status);
    same(`ج.٣/${tag} **والبطاقاتُ الجديدة (${codes.length}) مسوّدات**`, await cardRows(), codes.map(() => "draft"));
    same(`ج.٤/${tag} **والخطّةُ المفتوحة قبله تأخذ نسختَها** من المراحل بنطاقاتها`,
      await planPhases(open), { phases: P.phases.length, links, ranges: ranges.map(([, a, b]) => [a, b]) });
    await q(c.sql);
    const r1 = await proto(P.code);
    same(`ج.٥/${tag} **والإعادةُ لا تكرّر شيئاً** (المراحلُ والروابطُ والأجهزةُ والبطاقاتُ ونسخةُ الخطّة)`,
      [r1.ranges, r1.links, r1.devices.length, (await cardRows()).length, (await planPhases(open)).links], [r0.ranges, r0.links, P.devices.length, codes.length, links]);
    same(`ج.٦/${tag} **وكلُّ بروتوكولٍ مفصَّلٍ غيره لم يُمَسّ** (${others.length})`,
      (await Promise.all(others.map(snapshot))).map((x, i) => x === othersBefore[i]), others.map(() => true));
  }

  // ══ ص. وصفُ صور الورك كما وصلت (ترحيل ١٤١، §4.dz التكملة) ══
  //  الوصفُ يُعرض تحت الصورة، وكُتب في ١٤٠ قبل وصولها — فيُصحَّح ما خالفها، ولا يُكتب فوق وصفٍ عدّله المشرف.
  console.log("\n── ص. وصفُ صور ما بعد استبدال الورك كما وصلت ──");
  const capKeys = Object.keys(m141.CAPTIONS);
  const thaCards = m140.EXERCISES.map((e) => e.code);
  const imagesOf = async () => Object.fromEntries((await q(`SELECT code, images FROM physio_exercises WHERE code = ANY($1::text[]) ORDER BY code`, [thaCards])).rows
    .map((r) => [r.code, r.images]));
  const sorted = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
  const capOf = (imgs: Record<string, any[]>) => sorted(Object.fromEntries(Object.values(imgs).flat().filter((i) => capKeys.includes(i.key)).map((i) => [i.key, [i.captionAr, i.captionEn]])));
  const capIssues = m140.EXERCISES.filter((e) => e.images.some((i) => m141.CAPTIONS[i.key])).flatMap((e) => {
    const body = exerciseBody({ ...e, images: e.images.map((i) => (m141.CAPTIONS[i.key] ? { ...i, ...m141.CAPTIONS[i.key] } : i)) });
    const r = parseExerciseBody(body);
    if (typeof r === "string") return [`${e.code}: ${r}`];
    return r.images.some((im, i) => im.captionAr !== body.images[i].captionAr || im.captionEn !== body.images[i].captionEn) ? [`${e.code}.images قُصّت`] : [];
  });
  same("ص.١ **الوصفُ الجديد لكلّ صورةٍ يقبله المحرّرُ كما هو** — ولأربع صورٍ من صور الورك", [capKeys.length, capIssues], [4, []]);
  //  من الوصف كما زرعه ١٤٠ — والقالبُ قد يحمل ١٤١ مطبَّقاً (قاعدةٌ بُنيت بعده)، فلا يُبنى التأكيدُ على حاله.
  for (const e of m140.EXERCISES.filter((x) => x.images.some((i) => m141.CAPTIONS[i.key]))) {
    await q(`UPDATE physio_exercises SET images = $1::jsonb WHERE code = $2`,
      [JSON.stringify(e.images.map((i) => ({ key: i.key, captionAr: i.ar, captionEn: i.en, search: i.search }))), e.code]);
  }
  const capBefore = await imagesOf();
  //  سليمٌ عدّل وصفَ «مُلبِس الجوارب» قبل الترحيل — يبقى وصفُه.
  await q(`UPDATE physio_exercises SET images = jsonb_set(images, '{0,captionAr}', '"وصفُ سليم"') WHERE code = 'dressing-aids-hip'`);
  await q(m141.sql);
  const capAfter = await imagesOf();
  same("ص.٢ **يتغيّر وصفُ الصور الثلاث كما وصلت، ووصفٌ عدّله المشرفُ يبقى**، ورموزُها وكلماتُ بحثها كما هي",
    [capOf(capAfter), Object.values(capAfter).flat().map((i: any) => [i.key, i.search])],
    [sorted({ ...Object.fromEntries(capKeys.map((k) => [k, [m141.CAPTIONS[k].ar, m141.CAPTIONS[k].en]])),
      "dressing-aids-hip-1": ["وصفُ سليم", capBefore["dressing-aids-hip"][0].captionEn] }),
      Object.values(capBefore).flat().map((i: any) => [i.key, i.search])]);
  same("ص.٣ **وبطاقاتُ الورك الأخرى لم تُمَسّ**",
    thaCards.filter((c) => !["raised-seat-transfer-hip", "hip-safe-movement", "bed-mobility-hip", "dressing-aids-hip"].includes(c))
      .filter((c) => JSON.stringify(capAfter[c]) !== JSON.stringify(capBefore[c])), []);
  //  بالنصّ من القاعدة (جزءُ المليون من الثانية) — `Date` في جافاسكربت يقف عند الجزء من الألف فتتساوى كتابتان متقاربتان.
  const stamp = async () => (await q(`SELECT code, updated_at::text AS t FROM physio_exercises WHERE code = ANY($1::text[]) ORDER BY code`, [thaCards])).rows
    .map((r) => [r.code, r.t]);
  const stamps = await stamp();
  await q(m141.sql);
  same("ص.٤ **والإعادةُ لا تفعل شيئاً** — لا وصفَ ولا وقتَ تعديل", [await imagesOf(), await stamp()], [capAfter, stamps]);
  await q(`UPDATE physio_exercises SET images = jsonb_set(images, '{0,captionAr}', to_jsonb($1::text)) WHERE code = 'dressing-aids-hip'`,
    [m140.EXERCISES.find((e) => e.code === "dressing-aids-hip")!.images[0].ar]);
  await q(m141.sql);
  same("ص.٥ **وحين يعود الوصفُ كما زرعه ١٤٠ يكتب الترحيلُ الجديدَ** (لباقي الحزمة)",
    capOf(await imagesOf())["dressing-aids-hip-1"], [m141.CAPTIONS["dressing-aids-hip-1"].ar, m141.CAPTIONS["dressing-aids-hip-1"].en]);

  // ══ ض. وصفُ صور ألم الكعب كما وصلت (ترحيل ١٤٤، §4.eb التكملة) — بقاعدة ١٤١ نفسِها ══
  console.log("\n── ض. وصفُ صور ألم الكعب كما وصلت ──");
  const hCapKeys = Object.keys(m144.CAPTIONS);
  const heelCards = m143.EXERCISES.map((e) => e.code);
  const hImagesOf = async () => Object.fromEntries((await q(`SELECT code, images FROM physio_exercises WHERE code = ANY($1::text[]) ORDER BY code`, [heelCards])).rows
    .map((r) => [r.code, r.images]));
  const hCapOf = (imgs: Record<string, any[]>) => sorted(Object.fromEntries(Object.values(imgs).flat().filter((i) => hCapKeys.includes(i.key)).map((i) => [i.key, [i.captionAr, i.captionEn]])));
  const hCapIssues = m143.EXERCISES.filter((e) => e.images.some((i) => m144.CAPTIONS[i.key])).flatMap((e) => {
    const body = exerciseBody({ ...e, images: e.images.map((i) => (m144.CAPTIONS[i.key] ? { ...i, ...m144.CAPTIONS[i.key] } : i)) });
    const r = parseExerciseBody(body);
    if (typeof r === "string") return [`${e.code}: ${r}`];
    return r.images.some((im, i) => im.captionAr !== body.images[i].captionAr || im.captionEn !== body.images[i].captionEn) ? [`${e.code}.images قُصّت`] : [];
  });
  same("ض.١ **الوصفُ الجديد يقبله المحرّرُ كما هو** — لصورتين: «التشريط» و«القدم القصيرة»", [hCapKeys.sort(), hCapIssues], [["low-dye-taping-1", "short-foot-1"], []]);
  //  من الوصف كما زرعه ١٤٣ — والقالبُ قد يحمل ١٤٤ مطبَّقاً.
  for (const e of m143.EXERCISES.filter((x) => x.images.some((i) => m144.CAPTIONS[i.key]))) {
    await q(`UPDATE physio_exercises SET images = $1::jsonb WHERE code = $2`,
      [JSON.stringify(e.images.map((i) => ({ key: i.key, captionAr: i.ar, captionEn: i.en, search: i.search }))), e.code]);
  }
  const hBefore = await hImagesOf();
  //  سليمٌ عدّل وصفَ «القدم القصيرة» قبل الترحيل — يبقى وصفُه.
  await q(`UPDATE physio_exercises SET images = jsonb_set(images, '{0,captionAr}', '"وصفُ سليم"') WHERE code = 'short-foot'`);
  await q(m144.sql);
  const hAfter = await hImagesOf();
  same("ض.٢ **يتغيّر وصفُ «التشريط» كما وصل، ووصفٌ عدّله المشرفُ يبقى**، ورموزُها وكلماتُ بحثها كما هي",
    [hCapOf(hAfter), Object.values(hAfter).flat().map((i: any) => [i.key, i.search])],
    [sorted({ "low-dye-taping-1": [m144.CAPTIONS["low-dye-taping-1"]?.ar, m144.CAPTIONS["low-dye-taping-1"]?.en],
      "short-foot-1": ["وصفُ سليم", hBefore["short-foot"][0].captionEn] }),
      Object.values(hBefore).flat().map((i: any) => [i.key, i.search])]);
  same("ض.٣ **وبطاقاتُ الكعب الأخرى لم تُمَسّ**",
    heelCards.filter((c) => !["low-dye-taping", "short-foot"].includes(c)).filter((c) => JSON.stringify(hAfter[c]) !== JSON.stringify(hBefore[c])), []);
  const hStamp = async () => (await q(`SELECT code, updated_at::text AS t FROM physio_exercises WHERE code = ANY($1::text[]) ORDER BY code`, [heelCards])).rows
    .map((r) => [r.code, r.t]);
  const hStamps = await hStamp();
  await q(m144.sql);
  same("ض.٤ **والإعادةُ لا تفعل شيئاً** — لا وصفَ ولا وقتَ تعديل", [await hImagesOf(), await hStamp()], [hAfter, hStamps]);
  await q(`UPDATE physio_exercises SET images = jsonb_set(images, '{0,captionAr}', to_jsonb($1::text)) WHERE code = 'short-foot'`,
    [m143.EXERCISES.find((e) => e.code === "short-foot")!.images[0].ar]);
  await q(m144.sql);
  same("ض.٥ **وحين يعود الوصفُ كما زرعه ١٤٣ يكتب الترحيلُ الجديدَ** (لباقي الحزمة)",
    hCapOf(await hImagesOf())["short-foot-1"], [m144.CAPTIONS["short-foot-1"].ar, m144.CAPTIONS["short-foot-1"].en]);

  // ══ ط. مسافةُ اليد خلف الظهر في الكتف المتجمّد بإشارة، والأكثرُ أفضل (ترحيل ١٥٠، §4.eg التكملة — مراجعةُ Codex) ══
  console.log("\n── ط. مسافةُ اليد خلف الظهر بإشارة ──");
  const T = m150.TEXTS;
  const occ = (s: string, x: string) => s.split(x).length - 1;
  same("ط.١ **كلُّ تصحيحٍ يجد نصَّه مرّةً واحدة** فيما كتبه ١٤٩ فيتغيّر، والقديمُ («الأقلّ أفضل») خرج، والجديدُ في حدّ المحرّر بلا «**»",
    [(Object.keys(T) as (keyof typeof T)[]).map((k) => [occ(T[k][0], m150.FIXES[k][0]), T[k][0] !== T[k][1], occ(T[k][1], m150.FIXES[k][0]), occ(T[k][1], m150.FIXES[k][1])]),
      T.assessmentAr[1].length <= PROTOCOL_TEXT_MAX && T.assessmentEn[1].length <= PROTOCOL_TEXT_MAX, Object.values(T).some(([, b]) => b.includes("**")),
      [T.assessmentAr[0], T.assessmentEn[0], T.checklistAr[0], T.checklistEn[0]]],
    [[[1, true, 0, 1], [1, true, 0, 1], [1, true, 0, 1], [1, true, 0, 1]], true, false,
      [m149.PROTOCOL.assessment[0], m149.PROTOCOL.assessment[1], m149.CHECKLIST.find((i) => i.key === "measures-add")!.ar, m149.CHECKLIST.find((i) => i.key === "measures-add")!.en]]);
  const fsId = Number((await q(`SELECT id FROM physio_protocols WHERE code = $1`, [m149.PROTOCOL.code])).rows[0]?.id);
  await q(m149.sql); //  البندُ والنصوصُ كما زرعها ١٤٩ — والقالبُ قد يحمل ١٥٠ مطبَّقاً.
  await q(`UPDATE physio_protocols SET assessment = $2, assessment_en = $3 WHERE id = $1`, [fsId, T.assessmentAr[0], T.assessmentEn[0]]);
  await q(`UPDATE physio_protocol_checklist SET text_ar = $2, text_en = $3, done_at = now(), done_by_name = 'سليم' WHERE protocol_id = $1 AND item_key = 'measures-add'`,
    [fsId, T.checklistAr[0], T.checklistEn[0]]);
  //  سليمٌ عدّل «التقييم» بالإنكليزية قبل الترحيل — يبقى نصُّه.
  await q(`UPDATE physio_protocols SET assessment_en = 'Saleem''s text' WHERE id = $1`, [fsId]);
  const fsState = async () => {
    const p = (await q(`SELECT assessment, assessment_en, updated_at::text AS t FROM physio_protocols WHERE id = $1`, [fsId])).rows[0];
    const c = (await q(`SELECT text_ar, text_en, done_at IS NOT NULL AS done FROM physio_protocol_checklist WHERE protocol_id = $1 AND item_key = 'measures-add'`, [fsId])).rows[0];
    return { ar: p?.assessment, en: p?.assessment_en, t: p?.t, cAr: c?.text_ar, cEn: c?.text_en, done: c?.done };
  };
  await q(m150.sql);
  const fs1 = await fsState();
  same("ط.٢ **يتصحّح «التقييم» العربيّ وبندُ المقاييس باللغتين، والإنكليزيُّ الذي عدّله المشرفُ يبقى، والبندُ المعلَّم «تمّ» يبقى معلَّماً**",
    [fs1.ar, fs1.en, fs1.cAr, fs1.cEn, fs1.done], [T.assessmentAr[1], "Saleem's text", T.checklistAr[1], T.checklistEn[1], true]);
  await q(m150.sql);
  same("ط.٣ **والإعادةُ لا تفعل شيئاً** — لا نصَّ ولا وقتَ تعديل", await fsState(), fs1);
  await q(`UPDATE physio_protocols SET assessment_en = $2 WHERE id = $1`, [fsId, T.assessmentEn[0]]);
  await q(m150.sql);
  same("ط.٤ **وحين يعود النصُّ كما زرعه ١٤٩ يكتب الترحيلُ الجديدَ**", (await fsState()).en, T.assessmentEn[1]);

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
    //  ما وصل ملفُّه (`shared/physio_exercise_media.ts`) يُعرض ويخرج من القائمة، وما لم يصل فيها بكلمات بحثه — منها يبحث المالك.
    const misplaced = CONTENT.flatMap((c) => c.EXERCISES.flatMap((e) => e.images.map((i) => i.key)))
      .filter((k) => Boolean(EXERCISE_IMAGE_FILES[k]) === keys.includes(k));
    const acuteKeys = m124.EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    //  والدفعةُ الخامسة (٢٠٢٦-١٠-١٢) أكملت كلَّ المطلوب حتى العاشر إلّا اثنتين لا تُظهران بطاقتَيهما (§4.dv التكملة)، ثمّ وصلت «نقلُ الوزن واقفاً»
    //  ثانيةً أمام طاولة (التكملة ٢)، ثمّ «الدرجُ جلوساً» جلوساً على الدرجة (التكملة ٣) — **فلا صورةَ مطلوبة**.
    //  ووصلت «Y منبطحاً» للثالث، و«القرفصاءُ الجزئية» و«الدرّاجة» للرابع بعد ردّ نسخها الأولى (§4.dh · §4.di).
    const neckKeys = m125.EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    const kneeKeys = m126.EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    //  والخامسُ (الكتف): اثنتا عشرةَ بطاقةً جديدة بصورةٍ لكلٍّ منها — وبطاقاتُ الرقبة الأربع التي يستعملها بصورها هي، فلا تُطلب ثانيةً (§4.dk).
    const shoulderKeys = m128.EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    //  والسادسُ (الجلطة تحت الحادّة): أربعَ عشرةَ بطاقةً جديدة بصورةٍ لكلٍّ منها — والخمسُ المعادة (الجلوسُ والقيام، الجسر، صعودُ الدرجة،
    //  رفعُ الكعبين، الدرّاجة) بصورها هي (§4.dl).
    const strokeKeys = m129.EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    //  والسابعُ (التواءُ الكاحل): تسعُ خاناتٍ، و«توازنُ الكاحل» بصورة «الوقوف على ساقٍ واحدة» منسوخةً باسم رمزها (§4.dm).
    const ankleKeys = m130.EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    //  والثامنُ (المشيُ بالطرف الصناعيّ): إحدى عشرةَ بطاقةً جديدة بخمسَ عشرةَ صورة — والستُّ المعادة بصورها هي (§4.dt).
    const gaitKeys = m135.EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    //  والتاسعُ (ما قبل الطرف السفليّ): إحدى عشرةَ بطاقةً جديدة باثنتي عشرةَ صورة — والإحدى عشرةَ المعادة بصورها هي (§4.du).
    const preKeys = m136.EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    //  والعاشرُ (بترُ الطرف العلويّ): ثماني عشرةَ بطاقةً جديدة بصورةٍ لكلٍّ منها — والثماني المعادة بصورها هي (§4.dv).
    const ulKeys = m137.EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    //  والحادي عشرَ (ما بعد استبدال الركبة): اثنتا عشرةَ بطاقةً جديدة بصورةٍ لكلٍّ منها — **وصلت كلُّها** (٢٠٢٦-١٠-١٣، §4.dx التكملة)؛
    //  والعشرون المعادة بصورها هي.
    const tkaKeys = m138.EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    //  والثاني عشرَ (ما بعد استبدال الورك): ثلاثَ عشرةَ بطاقةً جديدة بصورةٍ لكلٍّ منها — الدرجُ والسيارة بصورتَي بطاقتَي الركبة منسوختين، **والإحدى عشرةَ
    //  الباقية وصلت** (٢٠٢٦-١٠-١٣، §4.dz التكملة)؛ والثماني عشرةَ المعادة بصورها هي.
    const thaKeys = m140.EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    //  والثالثَ عشرَ (ألمُ الكعب): ستُّ بطاقاتٍ جديدة بصورةٍ لكلٍّ منها — **وصلت كلُّها** (٢٠٢٦-١٠-١٤، §4.eb التكملة)؛ والسبعُ المعادة بصورها هي.
    const heelKeys = m143.EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    //  والرابعَ عشرَ (عِرقُ النسا): خمسُ بطاقاتٍ جديدة بصورةٍ لكلٍّ منها — **وصلت أربعٌ** (٢٠٢٦-١٠-١٤، §4.ec التكملة: «الانبطاح على المرفقين» من صورةٍ
    //  مسجَّلة، وثلاثٌ بحث عنها المساعد)، **و«الركوع بثني الركبتين» وحدها في «الصور المطلوبة»**؛ والأربعَ عشرةَ المعادة بصورها هي.
    const sciaticaKeys = m145.EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    //  والخامسَ عشرَ (الكتفُ المتجمّد): ستُّ بطاقاتٍ جديدة بصورةٍ لكلٍّ منها — **وصلت كلُّها مع ترحيلها** (٢٠٢٦-١٠-١٤، بحث عنها المساعد على الويب، §4.eg)؛
    //  والأربعَ عشرةَ المعادة بصورها هي.
    const frozenKeys = m149.EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    //  والسادسَ عشرَ (الاعتلالُ الجذريّ العنقيّ): ستُّ بطاقاتٍ جديدة بصورةٍ لكلٍّ منها — **وصلت كلُّها مع ترحيلها** (٢٠٢٦-١٠-١٧، بحث عنها المساعد على الويب، §4.ei)؛
    //  والمعادةُ بصورها هي.
    const cervKeys = m151.EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    //  والسابعَ عشرَ (مرفقُ التنس): خمسُ بطاقاتٍ جديدة بصورةٍ لكلٍّ منها — **وصلت كلُّها مع ترحيلها** (٢٠٢٦-١٠-١٧، بحث عنها المساعد على الويب، §4.ej)؛
    //  والمعادةُ بصورها هي.
    const elbowKeys = m152.EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    //  والثامنَ عشرَ (تضيّقُ القناة القطنية): أربعُ بطاقاتٍ جديدة بصورةٍ لكلٍّ منها — **وصلت كلُّها مع ترحيلها** (٢٠٢٦-١٠-١٧، بحث عنها المساعد على الويب، §4.ek)؛
    //  والمعادةُ بصورها هي.
    const lssKeys = m153.EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    //  والتاسعَ عشرَ (ألمُ الرضفة الفخذيّ): خمسُ بطاقاتٍ جديدة بصورةٍ لكلٍّ منها — **وصلت كلُّها مع ترحيلها** (٢٠٢٦-١٠-١٧، بحث عنها المساعد على الويب، §4.en)؛
    //  والمعادةُ بصورها هي.
    const pfpKeys = m155.EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    //  والعشرون (خشونةُ الورك): خمسُ بطاقاتٍ جديدة بصورةٍ لكلٍّ منها — **وصلت كلُّها مع ترحيلها** (٢٠٢٦-١٠-١٨، بحث عنها المساعد على الويب، §4.eo)؛
    //  والمعادةُ بصورها هي.
    const hoaKeys = m156.EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    //  والحادي والعشرون (الجلطةُ المزمنة): ستُّ بطاقاتٍ جديدة بصورةٍ لكلٍّ منها — **وصلت كلُّها مع ترحيلها** (٢٠٢٦-١٠-١٨، بحث عنها المساعد، §4.ep)؛
    //  والمعادةُ بصورها هي.
    const chronicStrokeKeys = m157.EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    //  والثاني والعشرون (إصاباتُ الغضروف الهلاليّ): ستُّ بطاقاتٍ جديدة بصورةٍ لكلٍّ منها — **وصلت خمسٌ مع ترحيلها** (٢٠٢٦-١٠-١٨، بحث عنها المساعد، §4.eq)،
    //  **و«الصلاة مع الغضروف» في «الصور المطلوبة»** (لا صورةَ مفتوحة الرخصة للجلوس على الكعبين بوسادة ولا للصلاة على الكرسيّ تخصّها)؛ والمعادةُ بصورها هي. والمفصَّلُ القادم يُضيف خاناته هنا.
    const meniscalKeys = m158.EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    //  والثالثُ والعشرون (ما بعد إعادة بناء الرباط الصليبيّ): ثماني بطاقاتٍ جديدة بصورةٍ لكلٍّ منها — **في «الصور المطلوبة» حتى تصل** (٢٠٢٦-١٠-١٩، §4.er)؛
    //  والمعادةُ بصورها هي.
    const aclKeys = m159.EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    const notYet = (ks: string[]) => ks.filter((k) => !EXERCISE_IMAGE_FILES[k]);
    same("ب.٤ **وصورُ كلّ بروتوكولٍ مفصَّل في مكانها**: ما وصل ملفُّه خارجَ «الصور المطلوبة» وما لم يصل فيها — **وصلت كلُّها من الثاني إلى الثالثَ عشرَ، وأربعٌ من خمس الرابعَ عشرَ، والستُّ للخامسَ عشرَ وللسادسَ عشرَ، والخمسُ للسابعَ عشرَ، والأربعُ للثامنَ عشرَ، والخمسُ للتاسعَ عشرَ وللعشرين، والستُّ للحادي والعشرين، وخمسٌ من ستّ للثاني والعشرين، و«الركوع بثني الركبتين» و«الصلاة مع الغضروف» وحدهما في «الصور المطلوبة»**",
      [missing.status, misplaced, acuteKeys.length, notYet(acuteKeys), neckKeys.length, notYet(neckKeys), kneeKeys.length, notYet(kneeKeys),
        shoulderKeys.length, notYet(shoulderKeys), strokeKeys.length, notYet(strokeKeys), ankleKeys.length, notYet(ankleKeys),
        gaitKeys.length, notYet(gaitKeys), preKeys.length, notYet(preKeys), ulKeys.length, notYet(ulKeys), tkaKeys.length, notYet(tkaKeys), thaKeys.length, notYet(thaKeys), heelKeys.length, notYet(heelKeys),
        sciaticaKeys.length, notYet(sciaticaKeys), frozenKeys.length, notYet(frozenKeys), cervKeys.length, notYet(cervKeys), elbowKeys.length, notYet(elbowKeys), lssKeys.length, notYet(lssKeys), pfpKeys.length, notYet(pfpKeys), hoaKeys.length, notYet(hoaKeys), chronicStrokeKeys.length, notYet(chronicStrokeKeys), meniscalKeys.length, notYet(meniscalKeys), aclKeys.length, notYet(aclKeys), [...keys].sort()],
      [200, [], 6, [], 17, [], 14, [], 12, [], 14, [], 9, [], 15, [], 12, [], 18, [], 12, [], 13, [], 6, [], 5, ["prayer-bent-knee-ruku-1"], 6, [], 6, [], 5, [], 4, [], 5, [], 5, [], 6, [], 6, ["prayer-deep-flexion-meniscus-1"], ["prayer-bent-knee-ruku-1", "prayer-deep-flexion-meniscus-1"]]);
    for (const c of CONTENT.slice(CONTENT.findIndex((x) => x.name === m124.name) + 1)) {
      const tag = c.name.slice(0, 3);
      const P = c.PROTOCOL;
      const id = Number((await proto(P.code)).id);
      const pg = await call("GET", `/api/physio/protocols/${id}`, S.spec);
      const made = await call("POST", `/api/patients/${await mkPatient(`باب ${tag}`)}/physio-plans`, S.spec, { protocolId: id });
      const pl = (await call("GET", `/api/physio/plans/${made.json?.id}`, S.spec)).json;
      const shape = P.phases.map((ph) => [ph.sessionFrom, ph.sessionTo, ph.exercises.length]);
      same(`ب.٥/${tag} **ومن الأبواب**: صفحتُه بعدده ومراحله، والخطّةُ الجديدة عليه تنسخها وتأخذ الأساسيَّ وحده، والمساعدُ للاختيار`,
        [pg.status, pg.json?.totalSessions, (pg.json?.phases ?? []).map((x: any) => [x.sessionFrom, x.sessionTo, x.exercises?.length]),
          made.status, pl?.totalSessions, (pl?.phases ?? []).map((x: any) => [x.sessionFrom, x.sessionTo, x.exercises.length]),
          (pl?.devices ?? []).map((d: any) => d.code), (pl?.protocolAdjuncts ?? []).length],
        [200, P.totalSessions, shape, 200, P.totalSessions, shape,
          P.devices.filter((d) => d.centreUse === "core").map((d) => d.code), P.devices.filter((d) => d.centreUse === "adjunct").length]);
    }
  } finally {
    await cleanup();
    httpServer.close();
    await pool.end();
  }
  console.log(failures === 0 ? "\nكلُّ التأكيدات نجحت." : `\n${failures} تأكيداً سقط.`);
  process.exit(failures ? 1 : 0);
}

main().catch(async (e) => { console.error(e); try { await cleanup(); } catch { /* */ } process.exit(1); });
