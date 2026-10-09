// **مكتبةُ التمارين ومراحلُ البروتوكول وخاناتُ الأجهزة، والبروتوكولُ الأوّل مفصَّلاً** (ترحيلا ١١٨ و١١٩، §4.cx) — `npm run test:physio-exercises`.
//
// حيٌّ على النقاط الحقيقية (منفذ ٦٩٧٤) وعلى قاعدةٍ طُبّق عليها الترحيلان. يحرس:
//   ق — القواعدُ الصافية: سطرُ الجرعة، جرعةُ المرحلة فوق البطاقة، خاناتُ الجهاز، تطبيعُ البطاقة والمراحل والصور، سطورُ الخطوات.
//   أ — مَن يقرأ ويكتب: أدوارُ القسم تقرأ، والاستقبالُ لا؛ والأخصائيُّ يكتب، والتقنيُّ لا.
//   ب — البطاقةُ مسوّدةٌ تُعتمد: الأخصائيُّ لا يعتمد، والمشرفُ يعتمد، وتعديلُ المعتمَد بيد الأخصائيّ يعيده مسوّدة وبيد المشرف يُبقيه.
//   ج — المراحل: تُحفظ كاملة، وتعيد البروتوكولَ المعتمَد مسوّدةً بيد الأخصائيّ، والتمرينُ المجهول والمؤرشف والمكرّر يُردّ.
//   د — الأرشفة: التمرينُ في مرحلةٍ لا يُؤرشَف، وغيرُه يُؤرشَف ويختفي ويُستعاد.
//   هـ — خاناتُ الجهاز: خانةٌ لا تخصّ الجهاز تُردّ، والصحيحةُ تُحفظ وتُقرأ وتصل الموجز.
//   و — الصور: ما لم يصل «منتظرة» في قائمة المحرّرين، وما سُجّل ملفُّه يُعرض برابطه ويخرج من القائمة؛ والملفّاتُ WebP صالحةٌ مضغوطة بلا يتيم،
//       وصورُ البروتوكول الأوّل السبعُ والعشرون كلُّها وصلت.
//   ز — الترحيلُ ١١٩: المحتوى كاملٌ وصالحٌ بقواعد الشاشة نفسِها، ولا يتكرّر، ولا يكتب فوق تعديل إنسان.
//   ح — سطورُ التدقيق.
import express from "express";
import fs from "fs";
import path from "path";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import {
  deviceParamsLine, doseLine, mergeDose, normalizeDeviceParams, normalizeImagePlans, parseExerciseBody, parsePhasesBody, textLines,
} from "@shared/physio_exercises";
import { EXERCISE_IMAGE_FILES } from "@shared/physio_exercise_media";
import { EXERCISES, PROTOCOL, sql as sql119 } from "./migrations/119_physio_lbp_chronic_detail";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6974;
const BASE = `http://127.0.0.1:${PORT}`;
const B1 = 9741;
const ADMIN = 9742, SUP = 9743, SPEC = 9744, TECH = 9745, REC = 9746;
const IDS = [ADMIN, SUP, SPEC, TECH, REC];
const PREFIX = "tstex-";

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  const pids = (await q(`SELECT id FROM physio_protocols WHERE code LIKE $1`, [PREFIX + "%"])).rows.map((r) => r.id);
  await q(`DELETE FROM physio_protocols WHERE id = ANY($1::int[])`, [pids]);
  await q(`DELETE FROM physio_exercises WHERE code LIKE $1`, [PREFIX + "%"]);
  //  الحزمةُ تضع أحدَ حساباتها معدِّلاً لبروتوكول القاعدة (ز.٩) — يُفكّ قبل حذف الحسابات.
  for (const t of ["physio_protocols", "physio_exercises"]) {
    await q(`UPDATE ${t} SET updated_by = NULL WHERE updated_by = ANY($1::int[])`, [IDS]);
    await q(`UPDATE ${t} SET approved_by = NULL WHERE approved_by = ANY($1::int[])`, [IDS]);
  }
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

async function main() {
  // ══ ق — القواعدُ الصافية ═══════════════════════════════════════════════════════════════
  console.log("\n── ق. القواعدُ الصافية ──");
  same("ق.١ سطرُ الجرعة بالعربية: مجموعات × تكرار لكلّ جانب · ثبات · راحة · ملاحظة",
    doseLine({ sets: 3, reps: 8, holdSeconds: 10, restSeconds: 30, doseNote: "يومياً" }, true, "ar"),
    "٣ × ٨ تكرار لكلّ جانب · ثبات ١٠ ث · راحة ٣٠ ث · يومياً");
  same("ق.٢ وبالإنكليزية، والملاحظةُ الغائبة تقع على الأخرى",
    doseLine({ sets: 3, reps: 8, holdSeconds: null, restSeconds: null, doseNote: "يومياً", doseNoteEn: null }, false, "en"),
    "3 × 8 reps · يومياً");
  same("ق.٣ جرعةُ المرحلة تغلب البطاقةَ حقلاً حقلاً، والفارغُ يأخذ البطاقة",
    mergeDose({ sets: 3, reps: 12, holdSeconds: 3, restSeconds: 45, doseNote: "يوماً بعد يوم", doseNoteEn: "EOD" }, { reps: 8, sets: null, doseNote: null } as any),
    { sets: 3, reps: 8, holdSeconds: 3, restSeconds: 45, doseNote: "يوماً بعد يوم", doseNoteEn: "EOD" });
  same("ق.٤ خاناتُ الجهاز: المعروفةُ له وحدها، والفارغُ يُسقَط",
    [normalizeDeviceParams("ultrasound", { frequencyMhz: "1", intensityWcm2: " 1.0 ", dutyCycle: "" }),
      normalizeDeviceParams("hot_pack", { frequencyMhz: "1" }), normalizeDeviceParams("exercise", { durationMin: "5" })],
    [{ frequencyMhz: "1", intensityWcm2: "1.0" }, "خانةٌ لا تخصّ هذا الجهاز: frequencyMhz", "خانةٌ لا تخصّ هذا الجهاز: durationMin"]);
  same("ق.٥ سطرُ الخانات بترتيب الجهاز وبوحدته، والوحدةُ المكتوبة لا تتكرّر",
    [deviceParamsLine("ultrasound", { intensityWcm2: "1.0", frequencyMhz: "1 MHz" }, "ar"), deviceParamsLine("hot_pack", { durationMin: "15–20" }, "en")],
    ["التردّد: 1 MHz · الشدّة: 1.0 W/cm²", "Duration: 15–20 min"]);
  same("ق.٦ سطورُ الخطوات بلا ترقيمٍ يدويّ ولا فراغ", textLines("1. أوّل\n\n٢) ثانٍ\n- ثالث\n"), ["أوّل", "ثانٍ", "ثالث"]);
  const good = { code: "x-ex", nameAr: "تمرين", nameEn: "Ex", kind: "strength", region: "hip", steps: "خطوة" };
  same("ق.٧ البطاقة: الخطواتُ إلزامية، والنوعُ والمنطقةُ من القائمة، والجرعةُ في حدودها",
    [typeof parseExerciseBody(good), parseExerciseBody({ ...good, steps: "" }), parseExerciseBody({ ...good, kind: "yoga" }), parseExerciseBody({ ...good, sets: 11 })],
    ["object", "اكتب خطواتِ الأداء — سطرٌ لكلّ خطوة", "اختر نوعَ التمرين", "المجموعات من ١ إلى ١٠"]);
  same("ق.٨ الصور: رمزٌ صالحٌ غيرُ مكرّر ووصفٌ لكلّ صورة",
    [normalizeImagePlans([{ key: "Bad Key", captionAr: "x" }]), normalizeImagePlans([{ key: "ab-1", captionAr: "x" }, { key: "ab-1", captionAr: "y" }]),
      normalizeImagePlans([{ key: "ab-1" }]), (normalizeImagePlans([{ key: "ab-1", captionEn: "x", search: "s" }]) as any).length],
    ["رمزُ الصورة حروفٌ إنكليزية صغيرة وأرقام وشرطة", "رمزُ صورةٍ مكرّر", "اكتب ما تُظهره كلُّ صورة", 1]);
  same("ق.٩ المراحل: اسمان لكلّ مرحلة، ولا تمرينَ مكرّرٌ في المرحلة الواحدة",
    [parsePhasesBody([{ nameAr: "أ", exercises: [] }]), parsePhasesBody([{ nameAr: "أ", nameEn: "A", exercises: [{ exerciseId: 1 }, { exerciseId: 1 }] }]),
      (parsePhasesBody([{ nameAr: "أ", nameEn: "A", exercises: [{ exerciseId: 1, sets: 2 }] }]) as any)[0].exercises[0].sets],
    ["اكتب اسمَ كلّ مرحلةٍ بالعربية والإنكليزية", "تمرينٌ مكرّر في المرحلة نفسِها", 2]);

  // ══ الإعداد ═════════════════════════════════════════════════════════════════════════
  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع اختبار التمارين')`, [B1]);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_supervise_physio)
           VALUES ($1, 'ex-admin', 'x', 'المسؤول', 'admin', NULL, '[]', true, false),
                  ($2, 'ex-sup', 'x', 'سليم', 'branch_manager', $6, $7::jsonb, true, true),
                  ($3, 'ex-spec', 'x', 'مصطفى', 'physio_specialist', $6, $7::jsonb, true, false),
                  ($4, 'ex-tech', 'x', 'تقنيّ', 'physio_technician', $6, $7::jsonb, true, false),
                  ($5, 'ex-rec', 'x', 'استقبال', 'reception', $6, $7::jsonb, true, false)`,
    [ADMIN, SUP, SPEC, TECH, REC, B1, JSON.stringify([B1])]);
  const S = {
    admin: hdr({ userId: ADMIN, displayName: "المسؤول", role: "admin", branchId: null, isAdmin: true, permissions: { canSupervisePhysio: true } }),
    sup: hdr({ userId: SUP, displayName: "سليم", role: "branch_manager", branchId: B1, isAdmin: false, permissions: { canSupervisePhysio: true } }),
    spec: hdr({ userId: SPEC, displayName: "مصطفى", role: "physio_specialist", branchId: B1, isAdmin: false, permissions: {} }),
    tech: hdr({ userId: TECH, displayName: "تقنيّ", role: "physio_technician", branchId: B1, isAdmin: false, permissions: {} }),
    rec: hdr({ userId: REC, displayName: "استقبال", role: "reception", branchId: B1, isAdmin: false, permissions: {} }),
  };
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const h = req.get("x-test-session");
    if (h) { try { req.session = { branchSession: JSON.parse(Buffer.from(h, "base64").toString("utf8")), destroy: (cb: () => void) => cb() }; } catch { /* */ } }
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
  const audits = async (entityType: string, entityId: number, action: string) =>
    Number((await q(`SELECT count(*) FROM audit_log WHERE entity_type = $1 AND entity_id = $2 AND action = $3`, [entityType, entityId, action])).rows[0].count);

  try {
    // ══ أ — مَن يقرأ ويكتب ═════════════════════════════════════════════════════════════════
    console.log("\n── أ. مَن يقرأ ويكتب ──");
    same("أ.١ التقنيُّ والأخصائيُّ يقرآن المكتبة، والاستقبالُ لا",
      [(await call("GET", "/api/physio/exercises", S.tech)).status, (await call("GET", "/api/physio/exercises", S.spec)).status,
        (await call("GET", "/api/physio/exercises", S.rec)).status], [200, 200, 403]);
    const card = (code: string, extra: Record<string, unknown> = {}) => ({
      code: PREFIX + code, nameAr: "تمرين اختبار", nameEn: "Test exercise", kind: "strength", region: "hip",
      sets: 3, reps: 10, steps: "خطوةٌ أولى\nخطوةٌ ثانية", stepsEn: "First\nSecond",
      images: [{ key: PREFIX + code + "-1", captionAr: "البداية", captionEn: "Start", search: "test exercise" }], ...extra,
    });
    const techWrite = await call("POST", "/api/physio/exercises", S.tech, card("a"));
    const created = await call("POST", "/api/physio/exercises", S.spec, card("a"));
    same("أ.٢ التقنيُّ لا يكتب بطاقة (٤٠٣)، والأخصائيُّ يكتبها مسوّدة", [techWrite.status, created.status, created.json?.status], [403, 200, "draft"]);
    const exId = created.json.id;
    same("أ.٣ والرمزُ المكرّر ٤٠٩", (await call("POST", "/api/physio/exercises", S.spec, card("a"))).status, 409);

    // ══ ب — الاعتماد ═════════════════════════════════════════════════════════════════════
    console.log("\n── ب. البطاقةُ مسوّدةٌ تُعتمد ──");
    same("ب.١ الأخصائيُّ لا يعتمد", (await call("POST", `/api/physio/exercises/${exId}/approve`, S.spec)).status, 403);
    const appr = await call("POST", `/api/physio/exercises/${exId}/approve`, S.sup);
    same("ب.٢ المشرفُ العام يعتمد، واسمُه على البطاقة", [appr.status, appr.json?.status, appr.json?.approvedByName], [200, "approved", "سليم"]);
    const byAdminKeep = await call("PUT", `/api/physio/exercises/${exId}`, S.admin, card("a", { purpose: "هدفٌ بيد المسؤول" }));
    same("ب.٣ تعديلُ المسؤول يُبقيها معتمَدة", [byAdminKeep.status, byAdminKeep.json?.status, byAdminKeep.json?.demoted], [200, "approved", false]);
    const bySpec = await call("PUT", `/api/physio/exercises/${exId}`, S.spec, card("a", { purpose: "هدفٌ معدَّل" }));
    same("ب.٤ وتعديلُ الأخصائيّ يعيدها مسوّدةً ويمحو المعتمِد", [bySpec.json?.status, bySpec.json?.demoted, bySpec.json?.approvedByName], ["draft", true, null]);
    const got = await call("GET", `/api/physio/exercises/${exId}`, S.tech);
    same("ب.٥ والبطاقةُ تُقرأ كاملةً بلا صلاحية تعديلٍ للتقنيّ", [got.status, got.json?.purpose, got.json?.canEdit, got.json?.canApprove], [200, "هدفٌ معدَّل", false, false]);

    // ══ ج — المراحل ══════════════════════════════════════════════════════════════════════
    console.log("\n── ج. المراحل ──");
    const devs = (await q(`SELECT id, code FROM devices WHERE is_active ORDER BY display_order`)).rows as { id: number; code: string }[];
    const dev = (code: string) => devs.find((d) => d.code === code)!.id;
    const proto = await call("POST", "/api/physio/protocols", S.spec, {
      code: PREFIX + "p1", titleAr: "بروتوكول اختبار", titleEn: "Test protocol", category: "spine", ageGroup: "adult",
      references: [{ title: "Ref" }], devices: [{ deviceId: dev("exercise"), evidence: "recommended" }],
    });
    const pid = proto.json.id;
    await call("POST", `/api/physio/protocols/${pid}/approve`, S.sup);
    const ex2 = (await call("POST", "/api/physio/exercises", S.spec, card("b"))).json.id;
    const phases = [
      { nameAr: "الأولى", nameEn: "First", timeframe: "الأسبوع ١–٢", progressCriteria: "يمشي ١٥ دقيقة", exercises: [{ exerciseId: exId, reps: 6, note: "ببطء" }] },
      { nameAr: "الثانية", nameEn: "Second", exercises: [{ exerciseId: exId }, { exerciseId: ex2, sets: 2 }] },
    ];
    same("ج.١ التقنيُّ لا يعدّل المراحل", (await call("PUT", `/api/physio/protocols/${pid}/phases`, S.tech, { phases })).status, 403);
    const put = await call("PUT", `/api/physio/protocols/${pid}/phases`, S.spec, { phases });
    same("ج.٢ الأخصائيُّ يحفظها، والبروتوكولُ المعتمَد يعود مسوّدة", [put.status, put.json?.status, put.json?.demoted], [200, "draft", true]);
    const det = await call("GET", `/api/physio/protocols/${pid}`, S.tech);
    same("ج.٣ البروتوكولُ يُقرأ بمراحله بترتيبها وتمارينها بجرعتها وبطاقتها",
      [det.json?.phases?.length, det.json?.phases?.[0]?.progressCriteria, det.json?.phases?.[0]?.exercises?.[0]?.reps,
        det.json?.phases?.[0]?.exercises?.[0]?.exercise?.code, det.json?.phases?.[1]?.exercises?.map((x: any) => x.exerciseId)],
      [2, "يمشي ١٥ دقيقة", 6, PREFIX + "a", [exId, ex2]]);
    same("ج.٤ والصورةُ التي لم تصل بلا رابط", det.json?.phases?.[0]?.exercises?.[0]?.exercise?.images?.[0]?.url, null);
    await call("POST", `/api/physio/protocols/${pid}/approve`, S.sup);
    const supPut = await call("PUT", `/api/physio/protocols/${pid}/phases`, S.sup, { phases: phases.slice(0, 1) });
    same("ج.٥ وتعديلُ المشرف يُبقيه معتمَداً، والمراحلُ تُستبدل كاملة",
      [supPut.json?.status, (await call("GET", `/api/physio/protocols/${pid}`, S.sup)).json?.phases?.length], ["approved", 1]);
    same("ج.٦ تمرينٌ مجهول ٤٠٠، ومكرّرٌ في المرحلة ٤٠٠",
      [(await call("PUT", `/api/physio/protocols/${pid}/phases`, S.sup, { phases: [{ nameAr: "أ", nameEn: "A", exercises: [{ exerciseId: 99999999 }] }] })).status,
        (await call("PUT", `/api/physio/protocols/${pid}/phases`, S.sup, { phases: [{ nameAr: "أ", nameEn: "A", exercises: [{ exerciseId: exId }, { exerciseId: exId }] }] })).status],
      [400, 400]);
    const brief = await call("GET", `/api/physio/protocols/${pid}/brief?lang=ar`, S.spec);
    same("ج.٧ الموجزُ يحمل المراحلَ وتمارينَها بسطر الجرعة",
      [brief.json?.protocol?.phases?.[0]?.name, brief.json?.protocol?.phases?.[0]?.exercises?.[0]?.dose],
      ["الأولى", "٣ × ٦ تكرار"]);

    // ══ د — الأرشفة ══════════════════════════════════════════════════════════════════════
    console.log("\n── د. الأرشفة ──");
    same("د.١ التمرينُ في مرحلةٍ لا يُؤرشَف (٤٠٩)", (await call("POST", `/api/physio/exercises/${exId}/archive`, S.spec)).status, 409);
    const arch = await call("POST", `/api/physio/exercises/${ex2}/archive`, S.spec);
    const listAfter = (await call("GET", "/api/physio/exercises?q=" + encodeURIComponent(PREFIX), S.spec)).json.map((r: any) => r.id);
    same("د.٢ وغيرُه يُؤرشَف ويختفي من القائمة", [arch.status, listAfter.includes(ex2), listAfter.includes(exId)], [200, false, true]);
    same("د.٣ والمؤرشفُ لا يُضاف إلى مرحلة (٤٠٠)",
      (await call("PUT", `/api/physio/protocols/${pid}/phases`, S.sup, { phases: [{ nameAr: "أ", nameEn: "A", exercises: [{ exerciseId: ex2 }] }] })).status, 400);
    same("د.٤ والتقنيُّ لا يرى المؤرشف (٤٠٤)، والاستعادةُ تعيده", [(await call("GET", `/api/physio/exercises/${ex2}`, S.tech)).status,
      (await call("POST", `/api/physio/exercises/${ex2}/restore`, S.spec)).status, (await call("GET", `/api/physio/exercises/${ex2}`, S.tech)).status], [404, 200, 200]);

    // ══ هـ — خاناتُ الجهاز ═══════════════════════════════════════════════════════════════
    console.log("\n── هـ. خاناتُ الجهاز ──");
    const pbody = (params: Record<string, string>) => ({
      code: PREFIX + "p1", titleAr: "بروتوكول اختبار", titleEn: "Test protocol", category: "spine", ageGroup: "adult", references: [{ title: "Ref" }],
      devices: [{ deviceId: dev("hot_pack"), evidence: "optional", params }],
    });
    same("هـ.١ خانةٌ لا تخصّ الجهاز تُردّ (٤٠٠)", (await call("PUT", `/api/physio/protocols/${pid}`, S.sup, pbody({ frequencyMhz: "1" }))).status, 400);
    await call("PUT", `/api/physio/protocols/${pid}`, S.sup, pbody({ temperatureC: "70–75", durationMin: "15–20" }));
    const withParams = await call("GET", `/api/physio/protocols/${pid}`, S.tech);
    same("هـ.٢ والصحيحةُ تُحفظ وتُقرأ", withParams.json?.devices?.[0]?.params, { durationMin: "15–20", temperatureC: "70–75" });
    same("هـ.٣ وتصل الموجزَ سطراً بالوحدات",
      (await call("GET", `/api/physio/protocols/${pid}/brief?lang=ar`, S.spec)).json?.protocol?.devices?.[0]?.settings, "الحرارة: 70–75 °C · المدّة: 15–20 min");

    // ══ و — الصور ════════════════════════════════════════════════════════════════════════
    console.log("\n── و. الصور ──");
    const missingKeys = async (s: string) => { const r = await call("GET", "/api/physio/exercises/missing-images", s); return { status: r.status, keys: (Array.isArray(r.json) ? r.json : []).map((m: any) => m.key) }; };
    const m1 = await missingKeys(S.spec);
    //  و«bird-dog-1» من البروتوكول الأوّل: وصلت صورتُه (الدفعةُ الأولى ٢٠٢٦-١٠-٠٩) فلم تعد مطلوبة — شاهدٌ حقيقيّ على الخروج من القائمة.
    same("و.١ المحرّرُ يرى الصورَ المطلوبة (وما وصل ملفُّه ليس منها)، والتقنيُّ لا (٤٠٣)",
      [m1.status, m1.keys.includes(PREFIX + "a-1"), m1.keys.includes("bird-dog-1"), (await missingKeys(S.tech)).status], [200, true, false, 403]);
    EXERCISE_IMAGE_FILES[PREFIX + "a-1"] = { file: PREFIX + "a-1.webp", credit: "مصدرُ اختبار", sourceUrl: "https://example.org/x" };
    try {
      const withUrl = await call("GET", `/api/physio/exercises/${exId}`, S.tech);
      same("و.٢ ما سُجّل ملفُّه يُعرض برابطه ومصدره، ويخرج من القائمة",
        [withUrl.json?.images?.[0]?.url, withUrl.json?.images?.[0]?.credit, (await missingKeys(S.spec)).keys.includes(PREFIX + "a-1")],
        [`/physio-exercises/${PREFIX}a-1.webp`, "مصدرُ اختبار", false]);
    } finally { delete EXERCISE_IMAGE_FILES[PREFIX + "a-1"]; }
    //  **والملفّاتُ نفسُها** (`client/public/physio-exercises/`): كلُّ سطرٍ في السجلّ له ملفُّ WebP صالحٌ باسم رمزه وبحجمٍ مضغوط، ولا ملفَّ بلا سطر —
    //  فلا رابطَ مكسور في بطاقة، ولا صورةَ ثقيلة تُحمَّل على هاتف، ولا ملفَّ منسيّ.
    const mediaDir = path.resolve(process.cwd(), "client/public/physio-exercises");
    const onDisk = fs.existsSync(mediaDir) ? fs.readdirSync(mediaDir).sort() : [];
    const bad = Object.entries(EXERCISE_IMAGE_FILES).map(([key, f]) => {
      if (f.file !== `${key}.webp`) return `${key}: الاسم ${f.file}`;
      const p = path.join(mediaDir, f.file);
      if (!fs.existsSync(p)) return `${key}: لا ملفّ`;
      const b = fs.readFileSync(p);
      if (b.subarray(0, 4).toString("ascii") !== "RIFF" || b.subarray(8, 12).toString("ascii") !== "WEBP") return `${key}: ليس WebP`;
      if (b.length > 100 * 1024) return `${key}: ${Math.round(b.length / 1024)} ك.ب`;
      return null;
    }).filter(Boolean);
    same("و.٣ كلُّ صورةٍ مسجّلة ملفُّ WebP صالح باسم رمزها، دون ١٠٠ ك.ب", bad, []);
    same("و.٤ ولا ملفَّ في المجلّد بلا سطرٍ في السجلّ", onDisk.filter((f) => !Object.values(EXERCISE_IMAGE_FILES).some((x) => x.file === f)), []);
    const lbpKeys = EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    same("و.٥ والبروتوكولُ الأوّل اكتملت صورُه: ٢٧ رمزاً كلُّها مسجّلة", [lbpKeys.length, lbpKeys.filter((k) => !EXERCISE_IMAGE_FILES[k])], [27, []]);

    // ══ ز — الترحيلُ ١١٩ ═════════════════════════════════════════════════════════════════
    console.log("\n── ز. الترحيلُ ١١٩ — البروتوكولُ الأوّل مفصَّلاً ──");
    const invalid = EXERCISES.map((e) => {
      const r = parseExerciseBody({ code: e.code, nameAr: e.nameAr, nameEn: e.nameEn, kind: e.kind, region: e.region, sets: e.sets, reps: e.reps,
        holdSeconds: e.hold, restSeconds: e.rest, steps: e.steps[0].join("\n"), stepsEn: e.steps[1].join("\n"),
        images: e.images.map((i) => ({ key: i.key, captionAr: i.ar, captionEn: i.en, search: i.search })) });
      return typeof r === "string" ? `${e.code}: ${r}` : null;
    }).filter(Boolean);
    same("ز.١ كلُّ بطاقةٍ تجتاز قواعدَ الشاشة نفسَها", invalid, []);
    const complete = EXERCISES.filter((e) => !(e.purpose[0] && e.purpose[1] && e.start[0] && e.start[1] && e.steps[0].length >= 3 && e.steps[0].length === e.steps[1].length
      && e.cues[0].length >= 3 && e.cues[0].length === e.cues[1].length && e.easier[0] && e.harder[0] && e.stopIf[0] && e.stopIf[1] && e.images.length >= 1)).map((e) => e.code);
    same("ز.٢ وكلُّ بطاقةٍ كاملة بالنسختين: هدف، بداية، ٣ خطواتٍ فأكثر، ٣ أخطاءٍ فأكثر، أسهل وأصعب، متى يتوقّف، وصورة", complete, []);
    const keys = EXERCISES.flatMap((e) => e.images.map((i) => i.key));
    same("ز.٣ رموزُ الصور فريدةٌ في المكتبة كلّها، ولكلٍّ كلماتُ بحث", [new Set(keys).size === keys.length, EXERCISES.every((e) => e.images.every((i) => i.search.trim().split(/\s+/).length >= 2))], [true, true]);
    const codes = new Set(EXERCISES.map((e) => e.code));
    same("ز.٤ كلُّ تمرينٍ في المراحل من البطاقات، وكلُّ بطاقةٍ في مرحلة",
      [PROTOCOL.phases.flatMap((p) => p.exercises.map((x) => x.code)).filter((c) => !codes.has(c)),
        EXERCISES.filter((e) => !PROTOCOL.phases.some((p) => p.exercises.some((x) => x.code === e.code))).map((e) => e.code)], [[], []]);
    same("ز.٥ وكلُّ مرحلةٍ بأهدافها وتثقيفها ومعيار انتقالها بالنسختين",
      PROTOCOL.phases.filter((p) => !(p.goals[0] && p.goals[1] && p.education[0] && p.education[1] && p.criteria[0] && p.criteria[1])).length, 0);
    const lbp = async () => (await q(`SELECT p.id, p.status, p.summary, p.duration_weeks,
        (SELECT count(*)::int FROM physio_protocol_phases ph WHERE ph.protocol_id = p.id) AS phases,
        (SELECT count(*)::int FROM physio_protocol_phase_exercises pe JOIN physio_protocol_phases ph ON ph.id = pe.phase_id WHERE ph.protocol_id = p.id) AS links,
        (SELECT count(*)::int FROM physio_protocol_devices d WHERE d.protocol_id = p.id) AS devices,
        (SELECT params FROM physio_protocol_devices d JOIN devices dv ON dv.id = d.device_id WHERE d.protocol_id = p.id AND dv.code = 'hot_pack') AS hot
      FROM physio_protocols p WHERE p.code = 'lbp-chronic-adult'`)).rows[0];
    const before = await lbp();
    same("ز.٦ في القاعدة: ثلاثُ مراحل و٢٤ رابطاً وعشرةُ أجهزة وخاناتُ الكمادة، و١٢ أسبوعاً، ومسوّدة",
      [before.phases, before.links, before.devices, before.hot, before.duration_weeks, before.status],
      [3, 24, 10, { layers: "6–8", durationMin: "15–20", temperatureC: "70–75" }, 12, "draft"]);
    const exCount = async () => Number((await q(`SELECT count(*) FROM physio_exercises WHERE code = ANY($1::text[])`, [Array.from(codes)])).rows[0].count);
    same("ز.٧ والبطاقاتُ الثماني عشرة مسوّدات", [await exCount(), Number((await q(`SELECT count(*) FROM physio_exercises WHERE code = ANY($1::text[]) AND status = 'draft'`, [Array.from(codes)])).rows[0].count)], [18, 18]);
    await q(sql119);
    const again = await lbp();
    same("ز.٨ الإعادةُ لا تكرّر شيئاً", [again.phases, again.links, again.devices, await exCount()], [3, 24, 10, 18]);
    //  سليمٌ عدّل الملخّص واعتمد، ثمّ حُذفت المراحل — الترحيلُ يعيد المراحلَ ولا يكتب فوق ملخّصه، ويعيده مسوّدةً لأن محتوىً جديداً دخل.
    await q(`UPDATE physio_protocols SET summary = 'ملخّصُ سليم', updated_by = $1, status = 'approved', approved_by_name = 'سليم' WHERE id = $2`, [SUP, before.id]);
    await q(`DELETE FROM physio_protocol_phases WHERE protocol_id = $1`, [before.id]);
    await q(`UPDATE physio_exercises SET purpose = 'هدفُ سليم' WHERE code = 'bird-dog'`);
    await q(sql119);
    const edited = await lbp();
    same("ز.٩ تعديلُ الإنسان باقٍ (الملخّصُ والبطاقة)، والمراحلُ تعود، والبروتوكولُ مسوّدة",
      [edited.summary, (await q(`SELECT purpose FROM physio_exercises WHERE code = 'bird-dog'`)).rows[0].purpose, edited.phases, edited.status],
      ["ملخّصُ سليم", "هدفُ سليم", 3, "draft"]);

    // ══ ح — التدقيق ══════════════════════════════════════════════════════════════════════
    console.log("\n── ح. سطورُ التدقيق ──");
    same("ح.١ إنشاءُ البطاقة وتعديلُها واعتمادُها، وتعديلُ المراحل",
      [await audits("physio_exercise", exId, "create"), await audits("physio_exercise", exId, "update"), await audits("physio_exercise", exId, "approve"),
        await audits("physio_protocol", pid, "update_phases") >= 2],
      [1, 2, 1, true]);
    const demoteNote = (await q(`SELECT notes FROM audit_log WHERE entity_type = 'physio_exercise' AND entity_id = $1 AND action = 'update' ORDER BY id DESC LIMIT 1`, [exId])).rows[0]?.notes;
    same("ح.٢ وسطرُ التعديل يقول إنّ المعتمَد عاد مسوّدة", demoteNote, "عُدّل تمرينٌ معتمَد فعاد مسوّدةً بانتظار الاعتماد");
  } finally {
    //  الترحيلُ في ز عدّل بروتوكولَ القاعدة نفسها — القاعدةُ نسخةٌ للحزمة، فلا يُعاد شيء.
    await cleanup();
    httpServer.close();
    await pool.end();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
