// «استمارة المراجع» (ترحيل ١١٤، §4.cq — المرحلةُ الأولى، ٢٠٢٦-١٠-٠٨).
// `npm run test:intake-sheet` — على النقاط الحقيقية بتطبيق Express الحقيقيّ.
//
// يحرس قراراتِ المالك: (١) حقولُ الاستعلامات كلُّها إلزامية إلّا الملاحظات — والخادمُ يردّ ما ينقص باسمه؛ (٢) تاريخُ الإصابة تاريخٌ
// أو «منذ الولادة» أو «غير معروف» — لا الاثنان، على الإنشاء والتعديل وفي القاعدة نفسِها؛ (٣) المحافظةُ من القائمة؛ (٤) القسمُ في
// الاستمارة يقرّر أعلامَ المريض في الخادم؛ (٥) الحفظُ يفتح طلبَ المعاينة؛ (٦) صفحةُ العلاج الطبيعي (بلا `intakeSheet`) لا تتغيّر؛
// (٧) الترويسةُ «الوارث» لكربلاء وحدها؛ (٨) قوائمُ الجهة المحوِّلة ونصُّ منع تكرار الاسم مطابقةٌ لصفحة التسجيل.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "intake-sheet-test-secret";

import express from "express";
import { createServer } from "http";
import { readFileSync } from "fs";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import {
  checkIntakeSheet, intakeHeader, mergeInjuryDate, normalizeInjuryDate, injuryDateDisplay, REFERRAL_SOURCES, REFERRAL_SUB_SOURCES, GOVERNORATE_OPTIONS,
} from "@shared/intake_sheet";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6991;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-الاستمارة";
const B1 = 9791, B2 = 9792;
const ADMIN = 9795, REC = 9796;
const IDS = [ADMIN, REC];

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE name LIKE $1`, [`%${MARK}%`])).rows.map((r) => Number(r.id));
  for (const id of pts) await storage.deletePatient(id);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = ANY($1::int[])`, [[B1, B2]]);
}

/** استمارةٌ كاملة لطرف — وكلُّ اختبارٍ ينقص منها حقلاً. */
const FULL = (over: Record<string, unknown> = {}) => ({
  intakeSheet: true, department: "prosthetic", requestedItem: "full_device",
  name: `علي حسين ${MARK}`, phone: "07701230001", governorate: "بغداد", address: "الكرادة قرب الجسر",
  referralSource: "فيسبوك", age: "34", weight: "70", height: "172",
  injuryCause: "حادث سير", injuryDate: "", injuryDateStatus: "unknown",
  amputationSite: "احادي - طرف سفلي - يمين - تحت الركبة", generalNotes: "",
  totalCost: 0, whatsappNotificationsEnabled: false,
  ...over,
});

async function main() {
  // ══ القواعد (بلا قاعدة) ══
  console.log("\n── القواعد ──");
  const base = {
    name: "س", phone: "0770", governorate: "بغداد", address: "ع", referralSource: "فيسبوك", age: "3", weight: "20", height: "100",
    injuryCause: "ولادة", injuryDate: "", injuryDateStatus: "congenital", department: "prosthetic",
    amputationSite: "احادي - طرف علوي - يسار - خلال الرسغ", requestedItem: "full_device",
  };
  same("ق.١ استمارةٌ كاملة ⟵ مقبولة — و«منذ الولادة» يكفي عن التاريخ", checkIntakeSheet(base).ok, true);
  same("ق.٢ كلُّ حقلٍ ينقص يُسمّى — بترتيب الورقة",
    checkIntakeSheet({ department: "prosthetic" }).missing,
    ["name", "phone", "governorate", "address", "referralSource", "age", "weight", "height", "injuryCause", "injuryDate", "amputationSite", "requestedItem"]);
  same("ق.٣ محافظةٌ خارج القائمة ناقصة · وزنٌ صفر ناقص · تعريفُ بترٍ ناقص ناقص · «المطلوب» مجهول ناقص",
    checkIntakeSheet({ ...base, governorate: "بغدادد", weight: "0", amputationSite: "احادي - طرف سفلي", requestedItem: "wheel" }).missing,
    ["governorate", "weight", "amputationSite", "requestedItem"]);
  same("ق.٤ المسند: نوعُه وجهتُه إلزاميان، ولا «مطلوب» ولا بتر",
    checkIntakeSheet({ ...base, department: "medical_support", amputationSite: "", requestedItem: "" }).missing, ["supportType", "injurySide"]);
  same("ق.٥ «من شخص آخر» بلا الفرعيّ ناقص · وبلا قسمٍ ناقص",
    checkIntakeSheet({ ...base, referralSource: "من شخص آخر", department: "" }).missing, ["referralSubSource", "department"]);
  same("ق.٦ تاريخٌ يُسقط الحالة · حالةٌ بلا تاريخ تبقى · حالةٌ مجهولة تسقط",
    [normalizeInjuryDate("2020-01-02", "congenital"), normalizeInjuryDate("", "unknown"), normalizeInjuryDate(null, "x")],
    [{ injuryDate: "2020-01-02", injuryDateStatus: null }, { injuryDate: null, injuryDateStatus: "unknown" }, { injuryDate: null, injuryDateStatus: null }]);
  same("ق.٦ب **التعديل: ما اختير الآن يغلب** — حالةٌ تُسقط تاريخاً قائماً · تاريخٌ فارغٌ لا يمحو حالةً قائمة · تاريخٌ يُسقط حالةً · تفريغُ الحالة",
    [mergeInjuryDate(undefined, "congenital", "2020-01-02", null), mergeInjuryDate("", undefined, null, "unknown"),
      mergeInjuryDate("2021-02-03", null, null, "unknown"), mergeInjuryDate(undefined, null, null, "unknown"), mergeInjuryDate("", "unknown", "2020-01-02", null)],
    [{ injuryDate: null, injuryDateStatus: "congenital" }, { injuryDate: null, injuryDateStatus: "unknown" },
      { injuryDate: "2021-02-03", injuryDateStatus: null }, { injuryDate: null, injuryDateStatus: null }, { injuryDate: null, injuryDateStatus: "unknown" }]);
  same("ق.٧ العرض: التاريخُ أو عنوانُ الحالة", [injuryDateDisplay(null, "congenital"), injuryDateDisplay("2020-01-02", null), injuryDateDisplay(null, null)],
    ["منذ الولادة", "2020-01-02", null]);
  same("ق.٨ **كربلاء وحدها «الوارث»** والبقيّةُ «بايونك»",
    [intakeHeader("كربلاء الوارث"), intakeHeader("بغداد").brand, intakeHeader("ذي قار").brand, intakeHeader("الموصل").centerName],
    [{ brand: "warith", centerName: "مركز الوارث للأطراف الذكية والتأهيل الطبي", city: "كربلاء" }, "bionic", "bionic",
      "مركز بايونك للأطراف الصناعية الذكية والتأهيل الطبي"]);
  same("ق.٩ المحافظاتُ التسع عشرة و«خارج العراق»", [GOVERNORATE_OPTIONS.length, GOVERNORATE_OPTIONS.includes("ذي قار"), GOVERNORATE_OPTIONS.at(-1)], [20, true, "خارج العراق"]);

  // ══ مطابقةُ صفحة التسجيل — نسختان يجب أن تقولا الشيءَ نفسَه ══
  console.log("\n── مطابقةُ صفحة التسجيل ──");
  const createSrc = readFileSync("client/src/pages/CreatePatient.tsx", "utf8");
  const items = (block: string) => [...block.matchAll(/<SelectItem value="([^"]+)">/g)].map((m) => m[1]);
  const refBlock = createSrc.slice(createSrc.indexOf('data-testid="select-referral-source"'), createSrc.indexOf('data-testid="select-referral-sub-source"'));
  const subBlock = createSrc.slice(createSrc.indexOf('data-testid="select-referral-sub-source"'), createSrc.indexOf('name="referralSubSourceOther"'));
  same("م.١ قيمُ الجهة المحوِّلة في الاستمارة هي قيمُ صفحة التسجيل بالترتيب",
    [...REFERRAL_SOURCES], items(refBlock.replace("value={REFERRAL_OTHER_PERSON}", 'value="من شخص آخر"')));
  same("م.٢ وقيمُ «كيف عرف الشخص الآخر»", [...REFERRAL_SUB_SOURCES], items(subBlock.replace("value={REFERRAL_SUB_OTHER}", 'value="أخرى"')));
  const hookSrc = readFileSync("client/src/hooks/use-name-availability.ts", "utf8");
  const MSG = "يوجد اسم مسجل يبدأ بهذا الاسم، أكمل كتابة الاسم.";
  same("م.٣ ومنعُ تكرار الاسم في الاستمارة: النقطةُ نفسُها والرسالةُ نفسُها بالحرف",
    [hookSrc.includes("/api/patients/name-availability"), hookSrc.includes(MSG), createSrc.includes(MSG)], [true, true, true]);

  // ══ الخادم ══
  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع الاستمارة'), ($2, 'كربلاء الوارث')`, [B1, B2]);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_add_patients, can_edit_patients)
           VALUES ($1, 'is-admin', 'x', 'المسؤول', 'admin', NULL, '[]', true, true, true),
                  ($2, 'is-rec', 'x', 'استعلامات', 'reception', $3, $4::jsonb, true, true, true)`,
    [ADMIN, REC, B1, JSON.stringify([B1])]);
  const perms = { canViewPatients: true, canAddPatients: true, canEditPatients: true };
  const S = {
    admin: hdr({ userId: ADMIN, displayName: "المسؤول", role: "admin", branchId: B1, isAdmin: true, permissions: perms }),
    rec: hdr({ userId: REC, displayName: "استعلامات", role: "reception", branchId: B1, accessibleBranches: [B1], isAdmin: false, permissions: perms }),
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
  const count = async () => Number((await q(`SELECT count(*) FROM patients WHERE name LIKE $1`, [`%${MARK}%`])).rows[0].count);

  try {
    console.log("\n── أ. الإلزامُ في الخادم ──");
    const noGov = await call("POST", "/api/patients", S.rec, FULL({ governorate: "" }));
    same("أ.١ بلا محافظة ⟵ ٤٠٠ ويسمّيها، ولا ملفّ", [noGov.status, noGov.json?.missing, await count()], [400, ["governorate"], 0]);
    same("أ.٢ ومحافظةٌ خارج القائمة ⟵ ٤٠٠", (await call("POST", "/api/patients", S.rec, FULL({ governorate: "بغدادد" }))).status, 400);
    const noMany = await call("POST", "/api/patients", S.rec, FULL({ address: " ", injuryCause: "", injuryDateStatus: null, requestedItem: "" }));
    same("أ.٣ بلا عنوانٍ ولا سببٍ ولا تاريخ إصابةٍ ولا «مطلوب» ⟵ ٤٠٠ بها كلِّها", [noMany.status, noMany.json?.missing], [400, ["address", "injuryCause", "injuryDate", "requestedItem"]]);
    const noSide = await call("POST", "/api/patients", S.rec, FULL({ department: "medical_support", supportType: "مشدّ ظهر", amputationSite: "" }));
    same("أ.٤ مسندٌ بلا جهة ⟵ ٤٠٠", [noSide.status, noSide.json?.missing], [400, ["injurySide"]]);
    same("أ.٥ ولم يُحفظ شيءٌ من ذلك كلِّه", await count(), 0);

    console.log("\n── ب. الحفظ وطلبُ المعاينة ──");
    //  والعميلُ يرسل «علاجاً طبيعياً» — والقسمُ في الاستمارة هو الحَكَم.
    const ok = await call("POST", "/api/patients", S.rec, FULL({ medicalCondition: "physiotherapy", isPhysiotherapy: true, isAmputee: false }));
    same("ب.١ استمارةُ طرفٍ كاملة ⟵ ٢٠١", ok.status, 201);
    const row = (await q(`SELECT governorate, injury_date, injury_date_status, medical_condition, is_amputee, is_physiotherapy, amputation_site
                            FROM patients WHERE id = $1`, [ok.json.id])).rows[0];
    same("ب.٢ **القسمُ يقرّر الأعلام** — طرف لا علاج طبيعي — والمحافظةُ و«غير معروف» محفوظان",
      [row.governorate, row.injury_date, row.injury_date_status, row.medical_condition, row.is_amputee, row.is_physiotherapy, row.amputation_site],
      ["بغداد", null, "unknown", "amputee", true, false, "احادي - طرف سفلي - يمين - تحت الركبة"]);
    const ep = await call("POST", `/api/patients/${ok.json.id}/device-episodes`, S.rec, { serviceType: "prosthetic", requestedItem: "full_device", servicePath: "exam" });
    same("ب.٣ وطلبُ المعاينة الذي يرسله الحفظ ⟵ ٢٠١", ep.status, 201);
    const routed = (await q(`SELECT
        (SELECT status FROM patient_device_episodes WHERE patient_id = $1) AS ep,
        (SELECT count(*)::int FROM medical_review_requests WHERE patient_id = $1 AND status = 'pending') AS req,
        (SELECT details FROM visits WHERE patient_id = $1 AND deleted_at IS NULL) AS visit`, [ok.json.id])).rows[0];
    same("ب.٤ فصار عند الطبيب: جهازٌ بانتظار المعاينة وطلبٌ قائم وزيارةُ «طلب معاينة طبية»", [routed.ep, routed.req, routed.visit],
      ["awaiting_exam", 1, "طلب معاينة طبية"]);

    const sup = await call("POST", "/api/patients", S.rec, FULL({
      name: `زينب كاظم ${MARK}`, phone: "07701230002", department: "medical_support", supportType: "مشدّ ظهر", injurySide: "لا ينطبق",
      amputationSite: "احادي - طرف سفلي - يمين - تحت الركبة", injuryDate: "2024-05-01", injuryDateStatus: "congenital", requestedItem: undefined,
    }));
    const srow = (await q(`SELECT medical_condition, is_medical_support, is_amputee, amputation_site, injury_date::text, injury_date_status FROM patients WHERE id = $1`, [sup.json?.id])).rows[0];
    same("ب.٥ مسندٌ ⟵ ٢٠١، أعلامُ المسند وحدها، وبترٌ أرسله العميل يُمحى، **وتاريخٌ مع حالة ⟵ التاريخُ وحده**",
      [sup.status, srow?.medical_condition, srow?.is_medical_support, srow?.is_amputee, srow?.amputation_site, srow?.injury_date, srow?.injury_date_status],
      [201, "medical_support", true, false, "", "2024-05-01", null]);

    console.log("\n── ج. صفحةُ العلاج الطبيعي لا تتغيّر ──");
    const physio = await call("POST", "/api/patients", S.rec, {
      name: `حسن جاسم ${MARK}`, phone: "07701230003", referralSource: "فيسبوك", age: "50", weight: "80", height: "170",
      medicalCondition: "physiotherapy", isPhysiotherapy: true, isAmputee: false, isMedicalSupport: false, injuryDate: "",
      totalCost: 0, whatsappNotificationsEnabled: false,
    });
    const prow = (await q(`SELECT governorate, injury_date, injury_date_status, address FROM patients WHERE id = $1`, [physio.json?.id])).rows[0];
    same("ج.١ بلا `intakeSheet`: لا محافظةَ ولا عنوانَ ولا سببَ مطلوب ⟵ ٢٠١ كما كان", [physio.status, prow?.governorate, prow?.injury_date, prow?.injury_date_status],
      [201, null, null, null]);

    const physioBadGov = await call("POST", "/api/patients", S.rec, {
      name: `كريم عادل ${MARK}`, phone: "07701230004", referralSource: "فيسبوك", age: "50", weight: "80", height: "170", governorate: "روما",
      medicalCondition: "physiotherapy", isPhysiotherapy: true, isAmputee: false, isMedicalSupport: false, totalCost: 0, whatsappNotificationsEnabled: false,
    });
    same("ج.٢ لكنّ محافظةً خارج القائمة تُردّ في أيّ تسجيل — لا في الاستمارة وحدها", [physioBadGov.status, physioBadGov.json?.missing], [400, ["governorate"]]);

    console.log("\n── د. التعديل ──");
    const put = (id: number, body: unknown) => call("PUT", `/api/patients/${id}`, S.rec, body);
    same("د.١ تاريخٌ يُكتب على «غير معروف» ⟵ يُسقطها", [(await put(ok.json.id, { injuryDate: "2023-03-04" })).status,
      (await q(`SELECT injury_date::text AS d, injury_date_status AS s FROM patients WHERE id = $1`, [ok.json.id])).rows[0]],
    [200, { d: "2023-03-04", s: null }]);
    same("د.٢ و«منذ الولادة» تُختار على تاريخٍ ⟵ تُسقطه", [(await put(ok.json.id, { injuryDateStatus: "congenital" })).status,
      (await q(`SELECT injury_date::text AS d, injury_date_status AS s FROM patients WHERE id = $1`, [ok.json.id])).rows[0]],
    [200, { d: null, s: "congenital" }]);
    same("د.٣ **ونموذجُ التعديل يرسل التاريخَ فارغاً مع كلّ حفظ — فلا تُمحى الحالة**",
      [(await put(ok.json.id, { injuryDate: "", address: "الكرادة داخل" })).status,
        (await q(`SELECT injury_date_status AS s FROM patients WHERE id = $1`, [ok.json.id])).rows[0].s], [200, "congenital"]);
    same("د.٤ ومحافظةٌ خارج القائمة ⟵ ٤٠٠ · وفراغٌ يمحوها",
      [(await put(ok.json.id, { governorate: "روما" })).status, (await put(ok.json.id, { governorate: "" })).status,
        (await q(`SELECT governorate FROM patients WHERE id = $1`, [ok.json.id])).rows[0].governorate], [400, 200, null]);
    const audit = (await q(`SELECT notes FROM audit_log WHERE entity_type = 'patient' AND entity_id = $1 AND action = 'update' ORDER BY id`, [ok.json.id])).rows.map((r) => r.notes);
    check(audit.some((n: string) => n.includes("المحافظة")) && audit.some((n: string) => n.includes("منذ الولادة")),
      "د.٥ والتعديلُ في سجلّ التدقيق بأسمائه العربية", JSON.stringify(audit));

    console.log("\n── هـ. القيدُ في القاعدة ──");
    let rejected = false;
    try { await q(`UPDATE patients SET injury_date = '2020-01-01', injury_date_status = 'unknown' WHERE id = $1`, [ok.json.id]); }
    catch { rejected = true; }
    check(rejected, "هـ.١ تاريخٌ وحالةٌ معاً ⟵ ترفضه القاعدة نفسُها");
    let badStatus = false;
    try { await q(`UPDATE patients SET injury_date = NULL, injury_date_status = 'yesterday' WHERE id = $1`, [ok.json.id]); }
    catch { badStatus = true; }
    check(badStatus, "هـ.٢ وحالةٌ خارج الاثنتين ⟵ ترفضها");

    console.log("\n── و. الحذف ──");
    let deleted = true;
    try { await storage.deletePatient(ok.json.id); } catch (e) { deleted = false; console.error(e); }
    check(deleted, "و.١ الحذفُ النهائيّ لمريض الاستمارة بطلبه وزيارته ينجح");
  } finally {
    httpServer.close();
    await cleanup();
    await pool.end();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
