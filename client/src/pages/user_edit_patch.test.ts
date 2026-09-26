// حفظُ نافذة تعديل الموظّف يرسل ما تغيّر وحدَه (٢٠٢٦-٠٩-٢٦). منطقٌ خالص.
// `npm run test:user-edit-patch`.
import { readFileSync } from "fs";
import { join } from "path";
import { userEditPatch } from "./user_edit_patch";

let failures = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}
//  مقارنةٌ لا يهمّها ترتيبُ المفاتيح — الطلبُ كائنٌ لا قائمة.
const sorted = (v: any): any => (v && typeof v === "object" && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sorted(v[k])])) : v);
const eq = (a: unknown, b: unknown) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));

const initial = { username: "ayoub", displayName: "أيوب", password: "", role: "prosthetics_expert",
  branchId: 1, branchIds: [1, 3, 4], isActive: true, canViewPayments: false, medicalSpecialties: [] };
const T = "2026-07-16T06:02:00.000Z";

console.log("\n── userEditPatch ──");
{
  const r = userEditPatch(initial, { ...initial, password: "Secret1" }, T);
  check("١. **كلمةُ المرور وحدها ⟶ لا فروع في الطلب** (واقعةُ أيوب)",
    eq(r.patch, { password: "Secret1", expectedUpdatedAt: T }), JSON.stringify(r.patch));
}
check("٢. لا تغيير ⟶ طلبٌ فارغ", userEditPatch(initial, { ...initial }, T).empty);
check("٣. مصفوفةٌ بالمحتوى نفسِه ليست تغييراً",
  userEditPatch(initial, { ...initial, branchIds: [1, 3, 4] }, T).empty);
{
  const r = userEditPatch(initial, { ...initial, branchIds: [1, 3, 4, 2] }, T);
  check("٤. تغييرُ الفروع يُرسل الحقلين معاً", eq(r.patch, { branchId: 1, branchIds: [1, 3, 4, 2], expectedUpdatedAt: T }),
    JSON.stringify(r.patch));
}
{
  const r = userEditPatch(initial, { ...initial, role: "branch_manager", canViewPayments: true }, T);
  check("٥. الدورُ والصلاحيةُ وحدهما", eq(Object.keys(r.patch).sort(), ["canViewPayments", "expectedUpdatedAt", "role"]),
    JSON.stringify(r.patch));
}
check("٦. وقتُ آخر حفظٍ يُلحَق بصيغةٍ واحدة (من Date أو نصّ)",
  userEditPatch(initial, { ...initial, displayName: "س" }, new Date(T)).patch.expectedUpdatedAt === T);
check("٧. ووقتٌ غائب ⟶ null صريحة لا غياب", userEditPatch(initial, { ...initial, displayName: "س" }, null).patch.expectedUpdatedAt === null);

console.log("\n── عقد النافذة ──");
{
  const src = readFileSync(join(import.meta.dirname, "./AdminSettings.tsx"), "utf8");
  check("٨. **الحفظُ يرسل الفرقَ لا النموذجَ كلَّه**",
    src.includes("updateUserMutation.mutate({ id: editingUser.id, data: patch as any });")
    && !src.includes("updateUserMutation.mutate({ id: editingUser.id, data: userFormData });"));
  check("٩. **والفرقُ من النافذة كما فُتحت ومعه وقتُ آخر حفظ**",
    src.includes("editInitialForm ?? {}, userFormData, (editingUser as any).updatedAt ?? null"));
  check("١٠. واللقطةُ تُؤخَذ عند الفتح", src.includes("setEditInitialForm(initialForm);"));
}

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
