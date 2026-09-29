// §4.ar البند ٣٣ — «تأكّد أن القسم موجود»: قانونٌ واحد (`ensureCaseTx`) لكلّ الأبواب.
// قاعدة محلّية: `npm run test:ensure-case`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (أ) الدالّةُ نفسُها: تُنشئ الغائب · لا تمسّ النشط · تفتح المغلقَ مُدقَّقاً حين يُطلَب · وتُبقيه مغلقاً
//     للمزامنة (`reopen: false`) · وشرطُ الوجود (`create: false`) لا يُنشئ شيئاً.
// (ب) **بيعُ متابعةٍ على قسمٍ مغلق يفتحه مُدقَّقاً** (`ensureFirstDeviceEpisodeForSale`) — كانت الحلقةُ
//     تُولَد حيّةً على قسمٍ مغلق لا يراها أحد.
// (ج) **تسعيرُ جلساتٍ لمريضٍ بلا حالة يكتب القيدَ على قسمه** — كان قيدُه يُكتب بلا قسم.
import { pool, db } from "./db";
import { ensureCaseTx } from "./patient_cases/reopen";
import { ensureFirstDeviceEpisodeForSale } from "./device_episodes/store";
import { storage } from "./storage";

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
let failures = 0;
function same(msg: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌ FAIL"}  ${msg}${ok ? "" : `\n      expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`}`);
}
const MARK = "اختبار-قانون-القسم";
const q = async (t: string, p: any[] = []) => (await pool.query(t, p)).rows as any[];
async function mk(label: string) {
  return Number((await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id,
      is_amputee, is_medical_support, is_physiotherapy, total_cost)
    VALUES ($1,'07700000000',$2,'40','x',1,true,false,true,0) RETURNING id`, [`${MARK} ${label}`, MARK]))[0].id);
}
async function mkCase(p: number, type: string, status: string) {
  return Number((await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, status)
    VALUES ($1,1,$2,0,$3) RETURNING id`, [p, type, status]))[0].id);
}
const statusOf = async (c: number) => (await q(`SELECT status FROM patient_cases WHERE id=$1`, [c]))[0]?.status;
const audits = async (c: number) => (await q(
  `SELECT notes FROM audit_log WHERE entity_type='patient_case' AND entity_id=$1 AND notes LIKE 'إعادة فتح%'`, [c])).map((r) => r.notes);
const ensure = (p: number, type: string, create: any, reopen: any) =>
  db.transaction((tx) => ensureCaseTx(tx as any, { patientId: p, caseType: type, branchId: 1, create, reopen }));

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM audit_log WHERE entity_type='patient_case' AND entity_id IN (SELECT id FROM patient_cases WHERE patient_id IN (${ids}))`);
  for (const t of ["cost_entries", "visits", "patient_events", "patient_device_episodes", "patient_cases"])
    await q(`DELETE FROM ${t} WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await cleanup();
  try {
    console.log("\n── أ. الدالّة ──");
    const a1 = await mk("غائب");
    const r1 = await ensure(a1, "prosthetic", { cost: 5, costSource: "manual", details: { x: 1 } }, { reason: "اختبار" });
    const row1 = (await q(`SELECT status, cost, cost_source, details FROM patient_cases WHERE id=$1`, [r1!.id]))[0];
    same("أ١. الغائبُ يُنشأ نشطاً بما طُلب", [r1!.created, row1.status, row1.cost, row1.cost_source, row1.details], [true, "active", 5, "manual", { x: 1 }]);

    const a2 = await mk("نشط"); const c2 = await mkCase(a2, "prosthetic", "active");
    const r2 = await ensure(a2, "prosthetic", { cost: 0 }, { reason: "اختبار" });
    same("أ٢. النشطُ يُرجَع كما هو بلا سطر", [r2!.id, r2!.created, r2!.reopened, await audits(c2)], [c2, false, false, []]);

    const a3 = await mk("مغلق يُفتح"); const c3 = await mkCase(a3, "prosthetic", "closed");
    const r3 = await ensure(a3, "prosthetic", false, { reason: "اختبار" });
    same("أ٣. **المغلقُ يُفتَح بالصفّ نفسِه، مُدقَّقاً**",
      [r3!.id, r3!.reopened, r3!.status, await statusOf(c3), await audits(c3)],
      [c3, true, "active", "active", ["إعادة فتح حالة أطراف صناعية المغلقة — اختبار"]]);

    const a4 = await mk("مغلق للمزامنة"); const c4 = await mkCase(a4, "prosthetic", "closed");
    const r4 = await ensure(a4, "prosthetic", { cost: 0 }, false);
    same("أ٤. `reopen: false` يُبقيه مغلقاً بلا سطر", [r4!.id, r4!.status, await statusOf(c4), await audits(c4)], [c4, "closed", "closed", []]);

    const a5 = await mk("شرط وجود");
    same("أ٥. `create: false` لا يُنشئ", [await ensure(a5, "prosthetic", false, { reason: "x" }),
      (await q(`SELECT count(*)::int n FROM patient_cases WHERE patient_id=$1`, [a5]))[0].n], [null, 0]);

    console.log("\n── ب. بيعُ متابعةٍ على قسمٍ مغلق ──");
    const b1 = await mk("بيع متابعة"); const cb = await mkCase(b1, "prosthetic", "closed");
    const ep = await db.transaction((tx) => ensureFirstDeviceEpisodeForSale(tx as any,
      { patientId: b1, serviceType: "prosthetic", createdBy: null }));
    same("ب١. **الحلقةُ تُفتح والقسمُ يُفتح معها مُدقَّقاً**",
      [Boolean(ep), await statusOf(cb), (await audits(cb)).length], [true, "active", 1]);

    console.log("\n── ج. تسعيرُ جلساتٍ لمريضٍ بلا حالة ──");
    const c1 = await mk("تسعير بلا حالة");
    await storage.pricePhysiotherapy(c1, { entries: [{ treatmentType: "روبوت", sessionCount: 10 }], totalCost: 100000,
      totalSessions: 10, treatmentType: "روبوت" } as any);
    const ce = await q(`SELECT c.case_type, c.cost FROM cost_entries e LEFT JOIN patient_cases c ON c.id = e.case_id
                          WHERE e.patient_id=$1 AND e.source='physio_pricing'`, [c1]);
    same("ج١. **القيدُ على قسم العلاج الطبيعي** وكلفةُ القسم = المبلغ", ce.map((r) => [r.case_type, r.cost]), [["physiotherapy", 100000]]);
  } finally {
    await cleanup();
    await pool.end();
  }
  console.log(failures === 0 ? "\n✅ كل الاختبارات نجحت" : `\n❌ ${failures} فشل`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(2); });
