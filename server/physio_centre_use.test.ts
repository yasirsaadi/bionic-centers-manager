// **«استعمالُ المركز» لأجهزة البروتوكول، والمساعدُ يتناوب** (ترحيل ١٢٢، §4.cx — قراراتُ المالك ٢٠٢٦-١٠-٠٩).
// `npm run test:physio-centre-use` — القاعدةُ المشتركة، ثمّ الترحيلُ على ألم الظهر المزمن، ثمّ الأبوابُ الحقيقية: الخطّةُ من البروتوكول،
// و«إنهاء الجلسة» بالتناوب، والانحرافات، وتعديلُ البروتوكول والخطّة، و«اقترح خطّة».

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "physio-centre-use-test-secret";

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { setSuggestCompleterForTests } from "./physio_plans/suggest";
import { sql as MIGRATION_SQL } from "./migrations/122_physio_centre_use";
import {
  ADJUNCT_OFF_TURN_NOTE, CENTRE_USE_LABELS, EVIDENCE_LABELS, adjunctTurn, centreUseOf,
} from "@shared/physio_protocols";
import { executionItemsError, sessionAdjuncts } from "@shared/physio_plans";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 7003;
const BASE = `http://127.0.0.1:${PORT}`;
const B1 = 8975;
const ADMIN = 8991, SUP = 8992, SPEC = 8993, TECH = 8994;
const IDS = [ADMIN, SUP, SPEC, TECH];
const MARK = "اختبار-استعمال-المركز";
const LBP = "lbp-chronic-adult";

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_source = $1`, [MARK])).rows.map((r) => r.id);
  await q(`DELETE FROM staff_notification_outbox WHERE text LIKE '%${MARK}%'`);
  await q(`DELETE FROM physio_plan_sessions WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM physio_plan_suggestions WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM physio_plans WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM visits WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM patient_cases WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM patients WHERE id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM session_counts WHERE daily_session_id IN (SELECT id FROM daily_sessions WHERE branch_id = $1)`, [B1]);
  await q(`DELETE FROM daily_sessions WHERE branch_id = $1`, [B1]);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM physio_device_branches WHERE branch_id = $1`, [B1]);
  //  سليمُ الاختبار عدّل بروتوكولَ ألم الظهر (د.١) — فيُفكّ اسمُه منه قبل حذف حسابه.
  await q(`UPDATE physio_protocols SET updated_by = NULL WHERE updated_by = ANY($1::int[])`, [IDS]);
  await q(`UPDATE physio_protocols SET approved_by = NULL WHERE approved_by = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

async function main() {
  // ══ القاعدةُ المشتركة ══
  console.log("\n── ق. القواعد ──");
  same("ق.١ **المكتوبُ يغلب، والغائبُ يُشتقّ من درجة الدليل كما كان يحكم** — فالبروتوكولاتُ الباقية لا يتغيّر ما يدخل خطّتَها",
    [centreUseOf({ centreUse: "adjunct", evidence: "not_recommended" }), centreUseOf({ centreUse: null, evidence: "recommended" }),
      centreUseOf({ evidence: "optional" }), centreUseOf({ centreUse: "x", evidence: "not_recommended" })],
    ["adjunct", "core", "adjunct", "not_used"]);
  same("ق.٢ **المساعدُ يتناوب**: الأوّلُ في الجلسة الأولى، فالثاني، فالثالث، ثمّ يعود — وبلا مساعدٍ لا دور",
    [0, 1, 2, 3, 7].map((k) => adjunctTurn([10, 20, 30], k)).concat([adjunctTurn([], 4) as any]), [10, 20, 30, 10, 20, null]);
  same("ق.٣ والدورُ بترتيب الخطّة، والأساسيُّ خارج التناوب، والقديمُ بلا استعمالٍ أساسيّ",
    sessionAdjuncts([{ deviceId: 5, centreUse: "core", displayOrder: 0 }, { deviceId: 7, centreUse: "adjunct", displayOrder: 3 },
      { deviceId: 6, centreUse: "adjunct", displayOrder: 1 }, { deviceId: 8, centreUse: null, displayOrder: 2 }], 1),
    { turnDeviceId: 7, offTurnDeviceIds: [6] });
  const it = (deviceId: number, done: boolean, note: string | null = null) => ({ deviceId, done, minutes: null, note });
  same("ق.٤ **المساعدُ الذي ليس دورَه لا يُطلب له سبب** — والذي دورُه يُطلب",
    [executionItemsError({ planDeviceIds: [1, 2, 3], needleDeviceId: null, canDryNeedle: false, offTurnDeviceIds: [3], items: [it(1, true), it(2, true), it(3, false)] }),
      Boolean(executionItemsError({ planDeviceIds: [1, 2, 3], needleDeviceId: null, canDryNeedle: false, offTurnDeviceIds: [3], items: [it(1, true), it(2, false), it(3, false)] }))],
    [null, true]);
  same("ق.٥ **بُعدان بأسمائهما**: درجةُ الدليل تقول الدليلَ لا القرار، واستعمالُ المركز أساسيّ · مساعد · لا يُستخدم",
    [EVIDENCE_LABELS.recommended, EVIDENCE_LABELS.optional, EVIDENCE_LABELS.not_recommended, CENTRE_USE_LABELS.core, CENTRE_USE_LABELS.adjunct, CENTRE_USE_LABELS.not_used],
    ["دليلٌ قويّ", "دليلٌ محدود أو متضارب", "الإرشاداتُ ضدّه روتينياً", "أساسيّ", "مساعد", "لا يُستخدم"]);

  // ══ أ. الترحيل على ألم الظهر المزمن ══
  console.log("\n── أ. ترحيل ١٢٢ ──");
  const lbpRows = async () => Object.fromEntries((await q(`SELECT d.code, pd.centre_use, pd.evidence, pd.minutes FROM physio_protocol_devices pd
      JOIN devices d ON d.id = pd.device_id JOIN physio_protocols p ON p.id = pd.protocol_id WHERE p.code = $1`, [LBP])).rows
    .map((r) => [r.code, [r.centre_use, r.evidence, r.minutes]]));
  const r0 = await lbpRows();
  same("أ.١ **قرارُ المالك على ألم الظهر المزمن**: التمارين أساسيّ · التيكار والمغناطيس والشدّ والتحفيز مساعد · الحرارةُ والأشعّةُ والإبر مساعد · الليزر والأمواج لا يُستخدم",
    [r0.exercise?.[0], r0.tecar?.[0], r0.megnatik?.[0], r0.traction?.[0], r0.electro?.[0], r0.hot_pack?.[0], r0.infrared?.[0], r0.needle?.[0], r0.laser?.[0], r0.ultrasound?.[0]],
    ["core", "adjunct", "adjunct", "adjunct", "adjunct", "adjunct", "adjunct", "adjunct", "not_used", "not_used"]);
  same("أ.٢ **ودرجةُ الدليل صادقة**: التيكار والمغناطيس «محدود» (لا «غير موصى به»)، والشدُّ والتحفيز «الإرشاداتُ ضدّه» كما في NICE — والمساعدُ ≤ ١٥ دقيقة",
    [r0.tecar?.[1], r0.megnatik?.[1], r0.traction?.[1], r0.electro?.[1], Math.max(...["tecar", "megnatik", "traction", "electro", "hot_pack"].map((c) => Number(r0[c]?.[2])))],
    ["optional", "optional", "not_recommended", "not_recommended", 15]);
  //  التكرارُ بلا أثر — وما كتبه إنسانٌ يبقى.
  await q(`UPDATE physio_protocol_devices SET centre_use = 'core' WHERE device_id = (SELECT id FROM devices WHERE code = 'traction')
      AND protocol_id = (SELECT id FROM physio_protocols WHERE code = $1)`, [LBP]);
  await q(MIGRATION_SQL);
  const r1 = await lbpRows();
  same("أ.٣ **والترحيلُ يتكرّر بلا أثر ولا يكتب فوق ما قرّره سليم**: شدٌّ جعله سليم أساسياً يبقى أساسياً",
    [r1.traction?.[0], r1.tecar?.[0], r1.laser?.[0]], ["core", "adjunct", "not_used"]);
  await q(`UPDATE physio_protocol_devices SET centre_use = 'adjunct' WHERE device_id = (SELECT id FROM devices WHERE code = 'traction')
      AND protocol_id = (SELECT id FROM physio_protocols WHERE code = $1)`, [LBP]);
  const others = (await q(`SELECT count(*)::int AS n FROM physio_protocol_devices pd JOIN physio_protocols p ON p.id = pd.protocol_id
      WHERE p.code <> $1 AND pd.centre_use IS NOT NULL`, [LBP])).rows[0].n;
  same("أ.٤ **والبروتوكولاتُ الباقية لا يُكتب لها استعمال** — تبقى مشتقّةً من درجتها حتى يقرّر سليم", others, 0);

  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع استعمال المركز')`, [B1]);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_supervise_physio, can_dry_needle)
           VALUES ($1, 'cu-admin', 'x', 'المسؤول', 'admin', NULL, '[]', true, false, false),
                  ($2, 'cu-sup', 'x', 'سليم', 'branch_manager', $5, $6::jsonb, true, true, false),
                  ($3, 'cu-spec', 'x', 'مصطفى', 'physio_specialist', $5, $6::jsonb, true, false, false),
                  ($4, 'cu-tech', 'x', 'علي', 'physio_technician', $5, $6::jsonb, true, false, false)`,
    [ADMIN, SUP, SPEC, TECH, B1, JSON.stringify([B1])]);
  //  **وبروتوكولٌ عدّله إنسانٌ لا يمسّه الترحيل** (قاعدةُ `physio_content.ts`): ولو بقي استعمالٌ فيه فارغاً.
  await q(`UPDATE physio_protocols SET updated_by = $2 WHERE code = $1`, [LBP, SUP]);
  await q(`UPDATE physio_protocol_devices SET centre_use = NULL WHERE device_id = (SELECT id FROM devices WHERE code = 'laser')
      AND protocol_id = (SELECT id FROM physio_protocols WHERE code = $1)`, [LBP]);
  await q(MIGRATION_SQL);
  same("أ.٥ **وبروتوكولٌ عدّله سليم لا يكتب فيه الترحيلُ شيئاً** — ولو بقيت خانةٌ فيه فارغة", (await lbpRows()).laser?.[0], null);
  await q(`UPDATE physio_protocol_devices SET centre_use = 'not_used' WHERE device_id = (SELECT id FROM devices WHERE code = 'laser')
      AND protocol_id = (SELECT id FROM physio_protocols WHERE code = $1)`, [LBP]);
  await q(`UPDATE physio_protocols SET updated_by = NULL WHERE code = $1`, [LBP]);
  const S = {
    admin: hdr({ userId: ADMIN, displayName: "المسؤول", role: "admin", branchId: B1, isAdmin: true, permissions: {} }),
    sup: hdr({ userId: SUP, displayName: "سليم", role: "branch_manager", branchId: B1, isAdmin: false, permissions: {} }),
    spec: hdr({ userId: SPEC, displayName: "مصطفى", role: "physio_specialist", branchId: B1, isAdmin: false, permissions: {} }),
    tech: hdr({ userId: TECH, displayName: "علي", role: "physio_technician", branchId: B1, isAdmin: false, permissions: {} }),
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

  const dev = Object.fromEntries((await q(`SELECT id, code FROM devices`)).rows.map((r) => [r.code, Number(r.id)]));
  await q(`INSERT INTO physio_device_branches (device_id, branch_id, available) SELECT id, $1, true FROM devices`, [B1]);
  const lbpId = Number((await q(`SELECT id FROM physio_protocols WHERE code = $1`, [LBP])).rows[0].id);
  const pt = Number((await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_physiotherapy)
      VALUES ($1, '07709990001', $2, '45', 'physiotherapy', $3, true) RETURNING id`, [`سعد ${MARK}`, MARK, B1])).rows[0].id);
  await q(`INSERT INTO patient_cases (patient_id, case_type) VALUES ($1, 'physiotherapy')`, [pt]);

  try {
    // ══ ب. الخطّةُ من البروتوكول ══
    console.log("\n── ب. الخطّة من البروتوكول ──");
    const created = await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: lbpId });
    const plan = Number(created.json?.id);
    const g0 = (await call("GET", `/api/physio/plans/${plan}`, S.spec)).json;
    //  §4.dd (سليم: «الأجهزةُ على مريض مريض»، وقرارُ المالك ٢٠٢٦-١٠-١٠): الأساسيُّ وحده يدخل الخطّةَ الجديدة، والمساعدُ يُعرض قائمةً
    //  بإعداداته الأولى يؤشّر منها الأخصائيُّ لمريضه — و«لا يُستخدم» لا يُعرض أصلاً.
    const offered = (g0?.protocolAdjuncts ?? []).map((d: any) => d.code);
    same("ب.١ **الأساسيُّ وحده يدخل الخطّةَ الجديدة، والمساعدُ يُعرض للاختيار** — ولو كانت درجتُه «الإرشاداتُ ضدّه» (الشدّ والتحفيز)، و«لا يُستخدم» لا يُعرض",
      [created.status, (g0?.devices ?? []).map((d: any) => [d.code, d.centreUse]), offered.includes("traction"), offered.includes("electro"),
        offered.includes("laser"), offered.includes("ultrasound"), offered.length],
      [200, [["exercise", "core"]], true, true, false, false, 7]);
    //  والأخصائيُّ يؤشّرها كلَّها لهذا المريض (ما ترسله «الأجهزةُ المساعدة لهذا المريض» في المحرّر) — فيتناوب السبعة.
    const ticked = await call("PUT", `/api/physio/plans/${plan}`, S.spec, { titleAr: g0.titleAr,
      devices: [...g0.devices, ...g0.protocolAdjuncts].map((d: any) => ({ deviceId: d.deviceId, minutes: d.minutes, parameters: d.parameters,
        parametersEn: d.parametersEn, note: d.note, noteEn: d.noteEn, centreUse: d.centreUse })) });
    const g = (await call("GET", `/api/physio/plans/${plan}`, S.spec)).json;
    const byCode = Object.fromEntries((g?.devices ?? []).map((d: any) => [d.code, d]));
    same("ب.١ب **والمؤشَّرُ يدخل مساعداً بالتناوب**",
      [ticked.status, byCode.traction?.centreUse, byCode.electro?.centreUse, byCode.exercise?.centreUse, (g?.devices ?? []).length],
      [200, "adjunct", "adjunct", "core", 8]);
    check(/^النمط: CAP → RES · القدرة: 20–40 % · المدّة: 10–15 min/.test(byCode.tecar?.parameters ?? "")
      && /^Mode: CAP → RES · Power: 20–40 % · Duration: 10–15 min/.test(byCode.tecar?.parametersEn ?? ""),
      "ب.٢ **وإعداداتُ الجهاز سطرٌ أوّل في «المعاملات» باللغتين** — يراها الأخصائيُّ ويعدّلها لهذا المريض", `${byCode.tecar?.parameters} | ${byCode.tecar?.parametersEn}`);
    same("ب.٣ **ودورُ المساعد في الجلسة الأولى أوّلُهم بترتيب البروتوكول** (التيكار)", [g?.rotation?.sessionsSoFar, g?.rotation?.turnDeviceId], [0, dev.tecar]);

    //  بروتوكولٌ لم يقرّر فيه سليم بعد — يبقى كما كان: «غير موصى به» لا يدخل، و«اختياري» يدخل مساعداً.
    const other = (await q(`SELECT p.id FROM physio_protocols p WHERE p.code <> $1 AND p.is_archived = false
        AND EXISTS (SELECT 1 FROM physio_protocol_devices d WHERE d.protocol_id = p.id AND d.evidence = 'not_recommended')
        AND EXISTS (SELECT 1 FROM physio_protocol_devices d WHERE d.protocol_id = p.id AND d.evidence = 'optional') ORDER BY p.id LIMIT 1`, [LBP])).rows[0];
    if (other) {
      const op = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: Number(other.id) })).json;
      const og = (await call("GET", `/api/physio/plans/${op?.id}`, S.spec)).json;
      const ev = Object.fromEntries((await q(`SELECT device_id, evidence FROM physio_protocol_devices WHERE protocol_id = $1`, [Number(other.id)])).rows
        .map((r) => [Number(r.device_id), r.evidence]));
      same("ب.٤ **والبروتوكولُ الذي لم يُقرَّر فيه بعدُ على حاله**: «غير موصى به» خارجَ الخطّة، و«اختياري» مساعدٌ يُعرض للاختيار، و«موصى به» أساسيٌّ فيها",
        [(og?.devices ?? []).some((d: any) => ev[d.deviceId] === "not_recommended"),
          (og?.devices ?? []).every((d: any) => d.centreUse === "core" && ev[d.deviceId] === "recommended"),
          (og?.protocolAdjuncts ?? []).length > 0 && (og?.protocolAdjuncts ?? []).every((d: any) => ev[d.deviceId] === "optional" && d.centreUse === "adjunct")],
        [false, true, true]);
      await call("DELETE", `/api/physio/plans/${op?.id}`, S.admin);
    } else check(false, "ب.٤ تهيئة: بروتوكولٌ بدرجتين للاختبار");

    // ══ ج. «إنهاء الجلسة» بالتناوب ══
    console.log("\n── ج. التناوب في التنفيذ ──");
    await call("PUT", `/api/physio/plans/${plan}/assignees`, S.spec, { userIds: [TECH] });
    const ap = await call("POST", `/api/physio/plans/${plan}/approve`, S.sup);
    check(ap.status === 200, "تهيئة: سليم اعتمد الخطّة", JSON.stringify(ap.json));
    const planDevs: any[] = g.devices;
    const items = (doneIds: number[], notes: Record<number, string> = {}) => planDevs.map((d) => ({
      deviceId: d.deviceId, done: doneIds.includes(d.deviceId), minutes: doneIds.includes(d.deviceId) ? d.minutes : null, note: notes[d.deviceId] ?? null }));
    const exec = (body: any) => call("POST", `/api/physio/plans/${plan}/sessions`, S.tech, { ...body, date: undefined });
    const s1 = await exec({ items: items([dev.exercise, dev.tecar]) });
    const it1 = (await q(`SELECT d.code, i.done, i.off_turn, i.note FROM physio_plan_session_items i JOIN devices d ON d.id = i.device_id
        WHERE i.session_id = $1`, [s1.json?.session?.id ?? s1.json?.id])).rows;
    const of = (c: string) => it1.find((r) => r.code === c);
    same("ج.١ **الجلسةُ الأولى: التمارين والتيكار، والمساعدون الباقون «ليس دورَهم» بلا سببٍ يُطلب** — ويُكتب ذلك ملاحظةً",
      [s1.status, of("tecar")?.done, of("tecar")?.off_turn, of("megnatik")?.done, of("megnatik")?.off_turn, of("megnatik")?.note],
      [200, true, false, false, true, ADJUNCT_OFF_TURN_NOTE]);
    const visit = (await q(`SELECT notes FROM visits WHERE patient_id = $1 AND deleted_at IS NULL ORDER BY id DESC LIMIT 1`, [pt])).rows[0];
    check(!/لم يُنفَّذ/.test(visit?.notes ?? "") && /التيكار|تيكار/.test(visit?.notes ?? ""),
      "ج.٢ **وزيارةُ الجلسة لا تقول «لم يُنفَّذ» عن مساعدٍ ليس دورَه**", visit?.notes);
    const dv1 = (await call("GET", `/api/physio/deviations`, S.sup)).json?.sessions ?? [];
    same("ج.٣ **ولا انحرافَ يُبلَّغ به الأخصائيّ** عن التناوب", dv1.filter((x: any) => x.planId === plan).length, 0);
    const g2 = (await call("GET", `/api/physio/plans/${plan}`, S.tech)).json;
    same("ج.٤ **والدورُ يتقدّم**: الجلسةُ الثانية للمغناطيس", [g2?.rotation?.sessionsSoFar, g2?.rotation?.turnDeviceId], [1, dev.megnatik]);
    const bad = await exec({ items: items([dev.exercise]) });
    same("ج.٥ **وتركُ المساعد الذي دورُه بلا سبب يُردّ** — وتركُ التيكار (ليس دورَه) لا يُطلب له شيء", [bad.status, /سبب/.test(bad.json?.error ?? "")], [400, true]);
    const s2 = await exec({ items: items([dev.exercise], { [dev.megnatik]: "الجهازُ معطّل اليوم" }) });
    const dv2 = (await call("GET", `/api/physio/deviations`, S.sup)).json?.sessions ?? [];
    const mine = dv2.filter((x: any) => x.planId === plan);
    same("ج.٦ **وتركُه بسببٍ يُحفَظ انحرافاً واحداً يراه الأخصائيّ** — المغناطيسُ وحده لا الباقون",
      [s2.status, mine.length, (mine[0]?.differences ?? []).map((d: any) => d.note)], [200, 1, ["الجهازُ معطّل اليوم"]]);
    const s3 = await exec({ items: items([dev.exercise, dev.traction, dev.hot_pack]) });
    const it3 = (await q(`SELECT d.code, i.done, i.off_turn FROM physio_plan_session_items i JOIN devices d ON d.id = i.device_id
        WHERE i.session_id = $1 AND d.code IN ('traction', 'hot_pack')`, [s3.json?.session?.id ?? s3.json?.id])).rows;
    same("ج.٧ **ومساعدٌ ليس دورَه يُنفَّذ إن أراد المعالج** — يُحفَظ «نُفّذ» لا «ليس دورَه»",
      [s3.status, it3.map((r) => [r.code, r.done, r.off_turn]).sort()], [200, [["hot_pack", true, false], ["traction", true, false]]]);

    // ══ د. التعديل: البروتوكول والخطّة ══
    console.log("\n── د. التعديل ──");
    const full = (await call("GET", `/api/physio/protocols/${lbpId}`, S.sup)).json;
    //  ما ترسله شاشةُ تحرير البروتوكول: حقولُ النموذج والمراجعُ والأجهزة — لا الصفحةَ كاملةً بمراحلها.
    const pick = (o: any, ks: string[]) => Object.fromEntries(ks.map((k) => [k, o?.[k]]));
    const body = {
      ...pick(full, ["code", "titleAr", "titleEn", "category", "ageGroup", "summary", "goals", "assessment", "exercises", "contraindications", "precautions",
        "summaryEn", "goalsEn", "assessmentEn", "exercisesEn", "contraindicationsEn", "precautionsEn", "sessionsPerWeek", "durationWeeks", "sessionMinutes", "references"]),
      devices: (full?.devices ?? []).map((d: any) => ({
        ...pick(d, ["deviceId", "evidence", "parameters", "parametersEn", "minutes", "note", "noteEn", "params"]),
        centreUse: d.code === "laser" ? "adjunct" : d.centreUse })),
    };
    const put = await call("PUT", `/api/physio/protocols/${lbpId}`, S.sup, body);
    const after = (await call("GET", `/api/physio/protocols/${lbpId}`, S.sup)).json;
    const laser = (after?.devices ?? []).find((d: any) => d.code === "laser");
    same("د.١ **سليم يغيّر «استعمال المركز»**: الليزرُ مساعدٌ في البروتوكول — مكتوباً، ودرجتُه كما هي",
      [put.status, laser?.centreUse, laser?.centreUseSet, laser?.evidence], [200, "adjunct", true, "not_recommended"]);
    const badUse = await call("PUT", `/api/physio/protocols/${lbpId}`, S.sup, { ...body, devices: body.devices.map((d: any, i: number) => (i === 0 ? { ...d, centreUse: "sometimes" } : d)) });
    same("د.٢ وقيمةٌ خارج الثلاث تُردّ", badUse.status, 400);
    const pl = (await call("GET", `/api/physio/plans/${plan}`, S.spec)).json;
    const planBody = { titleAr: pl.titleAr, devices: pl.devices.map((d: any) => ({ ...d, centreUse: d.code === "tecar" ? "core" : d.centreUse })) };
    const pp = await call("PUT", `/api/physio/plans/${plan}`, S.spec, planBody);
    const pg = (await call("GET", `/api/physio/plans/${plan}`, S.spec)).json;
    same("د.٣ **والأخصائيُّ يجعل التيكار أساسياً لهذا المريض** — يخرج من التناوب",
      [pp.status, pg?.devices?.find((d: any) => d.code === "tecar")?.centreUse], [200, "core"]);
    const badPlan = await call("PUT", `/api/physio/plans/${plan}`, S.spec, { ...planBody, devices: planBody.devices.map((d: any, i: number) => (i === 0 ? { ...d, centreUse: "not_used" } : d)) });
    same("د.٤ وبندُ الخطّة أساسيٌّ أو مساعد فقط", badPlan.status, 400);

    // ══ هـ. «اقترح خطّة» ══
    console.log("\n── هـ. اقترح خطّة ──");
    let adjustPayload: any = null; let adjustSystem = "";
    setSuggestCompleterForTests(async (p) => {
      const u = JSON.parse(p.user);
      if (u.step === "adjust") { adjustPayload = u; adjustSystem = p.system; }
      return JSON.stringify(u.step === "choose" ? { choices: [{ protocolId: lbpId, reasonAr: "ألمٌ مزمن" }] } : {});
    });
    const sg = await call("POST", `/api/patients/${pt}/physio-plans/suggest`, S.spec, { note: "ألمٌ أسفل الظهر منذ سنة" });
    const codes = new Map(Object.entries(dev).map(([c, id]) => [id, c]));
    const seen = (adjustPayload?.protocol?.devices ?? []).map((d: any) => [codes.get(d.deviceId), d.centreUse]);
    const seenMap = Object.fromEntries(seen);
    same("هـ.١ **المساعدُ يرى «استعمال المركز» لكلّ جهاز، ولا يرى ما لا يُستخدم** — والليزرُ صار مساعداً بقرار سليم أعلاه",
      [sg.status, seenMap.ultrasound ?? null, seenMap.laser, seenMap.tecar, seenMap.exercise], [200, null, "adjunct", "adjunct", "core"]);
    check(/ROTATE/.test(adjustSystem) && /PER PATIENT/.test(adjustSystem) && /at most the two adjuncts/.test(adjustSystem),
      "هـ.٢ **ويُقال له إنّ المساعد يتناوب، ويُختار لكلّ مريض — اثنان على الأكثر** (§4.dd)", adjustSystem.slice(0, 400));
  } finally {
    setSuggestCompleterForTests(null);
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
