// §4.ar البند ٢٤ — ترحيل ٠٨٩: مفتاحُ «حذف المرضى» صار الحاكم، **ولا يتغيّر أحدٌ يومَ الدمج** (قرارُ المالك «أُبقي الحاليّين»).
// قاعدة محلّية **لم يُطبَّق عليها ٠٨٩**: `npm run test:delete-switch-migration`.
import { pool } from "./db";
import { runMigrations } from "./migrations/runner";
import { canTrashPatients } from "@shared/patient_trash";

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
const q = async (t: string, p: any[] = []) => (await pool.query(t, p)).rows as any[];
const DOC = 9991, MGR = 9992, MGR_ON = 9993, RECV = 9994;

async function main() {
  //  **قاعدةُ الاختبار تُعاد إلى ما قبل ٠٨٩ بنفسها** — القالبُ المعتاد مُرحَّلٌ كاملاً، فكان الاختبارُ يخرج بلا قياس.
  //  ٠٨٩ لا يُنشئ مخطّطاً — أثرُه صفوفٌ وسطرُ تسجيل — فيكفي أن يُمحى سطرُه من `_migrations` كي يُعاد تشغيلُه على
  //  حسابات الاختبار أدناه وحدها. (الحارسُ أعلاه يقصر هذا على قاعدةٍ محلّية.)
  await q(`DELETE FROM _migrations WHERE name='089_delete_patients_switch'`);
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, role, on] of [[DOC, "doctor", false], [MGR, "branch_manager", false], [MGR_ON, "branch_manager", true], [RECV, "reception", false]] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,is_active,can_delete_patients)
             VALUES ($1,$2,'x','موظف',$3,1,true,$4)`, [id, `ds_u${id}`, role, on]);
  }
  const state = async (id: number) => (await q(`SELECT can_delete_patients v FROM system_users WHERE id=$1`, [id]))[0].v;
  const audit = async (id: number) => (await q(`SELECT user_name FROM audit_log WHERE entity_type='system_user' AND entity_id=$1 AND user_name = 'ترحيل ٠٨٩'` /* ٠٩٠ يكتب للمدراء سطرَه هو */, [id])).map((r) => r.user_name);
  try {
    same("٠. قبل الترحيل: الطبيبُ ومديرُ الفرع المُطفَآن **لا يحذفان بالقاعدة الجديدة**",
      [canTrashPatients({ role: "doctor", permissions: { canDeletePatients: await state(DOC) } }),
       canTrashPatients({ role: "branch_manager", permissions: { canDeletePatients: await state(MGR) } })], [false, false]);
    await runMigrations();
    same("١. **بعده: كلُّ مَن كان يحذف بدوره يحذف كما كان**", [await state(DOC), await state(MGR), await state(MGR_ON)], [true, true, true]);
    same("٢. **وبسطر تدقيقٍ لكلّ مَن تغيّر مفتاحُه** — لا للمُشغَّل أصلاً", [await audit(DOC), await audit(MGR), await audit(MGR_ON)],
      [["ترحيل ٠٨٩"], ["ترحيل ٠٨٩"], []]);
    same("٣. **والاستقبالُ كما هو** — الترحيلُ لا يمنح مَن لم يكن يحذف", [await state(RECV), await audit(RECV)], [false, []]);
  } finally {
    await q(`DELETE FROM audit_log WHERE entity_type='system_user' AND entity_id = ANY($1::int[])`, [[DOC, MGR, MGR_ON, RECV]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [[DOC, MGR, MGR_ON, RECV]]);
    await pool.end();
  }
  console.log(failures === 0 ? "\n✅ كل الاختبارات نجحت" : `\n❌ ${failures} فشل`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(2); });
