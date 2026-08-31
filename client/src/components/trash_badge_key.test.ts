// شارةُ «المحذوفات» — الإقرارُ بالمشاهدة **لكلّ مستخدمٍ لا لكلّ متصفّح**
// (تصحيحٌ لاحقٌ على PR #267، 2026-08-31). منطقٌ خالص + عقدُ مصدر (لا مشغّل
// DOM، على نمط money_input.test.ts). `npm run test:trash-badge-key`.
//
// ══ العطبُ الذي يحرسه ═══════════════════════════════════════════════════
// كان مفتاحاً واحداً (`TRASH_BADGE_LAST_SEEN_KEY` وحده) يتشاركه كلُّ مَن
// يسجّل الدخول على نفس المتصفّح — موظّفةٌ تفتح السلّة تُطفئ الشارةَ لزميلها
// الذي يدخل بعدها من نفس الجهاز ولم يرَ شيئاً. الإصلاح: `trashBadgeSeenKey
// (userId)` قانونيةٌ واحدة يستوردها الطرفان (Sidebar.tsx وPatientTrash.tsx).
//
// وسلّةٌ فارغة **لا تكتب شيئاً بساعة العميل بعد اليوم** — ساعةٌ متقدّمة كانت
// تكتب طابعاً مستقبلياً فيُسقِط `deleted_at > since` حذفاً حقيقياً وقع قبل
// تلك اللحظة المزيَّفة.

import { readFileSync } from "fs";
import { join } from "path";
import { trashBadgeSeenKey, TRASH_BADGE_LAST_SEEN_KEY } from "@shared/patient_trash";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}

console.log("\n═══ مفتاحُ شارة المحذوفات لكلّ مستخدم ═══\n");

console.log("── trashBadgeSeenKey ──");
check("١. **مستخدمان مختلفان ⟶ مفتاحان مختلفان**",
  trashBadgeSeenKey(11) !== trashBadgeSeenKey(22));
check("٢. **ونفسُ المستخدم ⟶ نفسُ المفتاح دائماً** (حتميّ لا عشوائي)",
  trashBadgeSeenKey(11) === trashBadgeSeenKey(11));
check("٣. **`null`/`undefined` (مفتاحُ المسؤول القديم) ⟶ سلّةٌ ثابتة مشتركة**",
  trashBadgeSeenKey(null) === trashBadgeSeenKey(undefined));
check("٤. **وتلك السلّةُ لا تتقاطع مع أيّ مستخدمٍ حقيقيّ برقم**",
  trashBadgeSeenKey(null) !== trashBadgeSeenKey(11) && trashBadgeSeenKey(undefined) !== trashBadgeSeenKey(11));
check("٥. **والمفتاحُ يبدأ بالبادئة القانونية** — يبقى مفهوماً/قابلاً للبحث",
  trashBadgeSeenKey(11).startsWith(TRASH_BADGE_LAST_SEEN_KEY),
  trashBadgeSeenKey(11));
check("٦. صفرٌ رقمٌ صالح لا يُطابَق كغائب (`??` لا `||`)",
  trashBadgeSeenKey(0) !== trashBadgeSeenKey(null) && trashBadgeSeenKey(0).endsWith(":0"),
  trashBadgeSeenKey(0));

// ══ عقدُ المصدر — الطرفان يستعملان الدالّة القانونية فعلاً ═══════════════
console.log("\n── عقدُ الاستعمال في Sidebar.tsx وPatientTrash.tsx ──");
{
  const sidebarSrc = readFileSync(join(import.meta.dirname, "../components/Sidebar.tsx"), "utf8");
  check("٧. **Sidebar.tsx يستورد `trashBadgeSeenKey`**",
    /import\s*\{[^}]*trashBadgeSeenKey[^}]*\}\s*from\s*"@shared\/patient_trash"/.test(sidebarSrc));
  check("٨. **ولا يستورد `TRASH_BADGE_LAST_SEEN_KEY` مباشرةً بعد الآن** — البادئةُ لا تكفي وحدها",
    !/import\s*\{[^}]*TRASH_BADGE_LAST_SEEN_KEY[^}]*\}/.test(sidebarSrc),
    (sidebarSrc.match(/.*TRASH_BADGE_LAST_SEEN_KEY.*/g) ?? []).join("\n"));
  check("٩. **وطلبُ العدّاد يبني المفتاحَ بـ`branchSession?.userId`**",
    /localStorage\.getItem\(trashBadgeSeenKey\(branchSession\?\.userId\)\)/.test(sidebarSrc));
  check("١٠. **والنوعُ المحليّ `BranchSession` صار يحمل `userId`** — كان غائباً",
    /interface BranchSession \{[^}]*userId\?:\s*number/.test(sidebarSrc));
}
{
  const trashPageSrc = readFileSync(join(import.meta.dirname, "../pages/PatientTrash.tsx"), "utf8");
  check("١١. **PatientTrash.tsx يستورد `trashBadgeSeenKey`**",
    /import\s*\{[^}]*trashBadgeSeenKey[^}]*\}\s*from\s*"@shared\/patient_trash"/.test(trashPageSrc));
  check("١٢. **وكتابةُ آخر مشاهدةٍ تبني المفتاحَ بـ`session?.userId`**",
    /localStorage\.setItem\(trashBadgeSeenKey\(session\?\.userId\), latest\)/.test(trashPageSrc));
  check("١٣. **ولا `new Date().toISOString()` في مسار كتابة الشارة بعد الآن** — لا ساعةَ عميلٍ تتقدّم بسلّةٍ فارغة",
    !/rows\.length > 0[\s\S]{0,40}new Date\(\)\.toISOString\(\)/.test(trashPageSrc),
    (trashPageSrc.match(/.*new Date\(\)\.toISOString\(\).*/g) ?? []).join("\n"));
  check("١٤. **وسلّةٌ فارغة تُخرِج مبكراً قبل أيّ كتابة** (`rows.length === 0` في حارس المؤثّر)",
    /if \(!data \|\| search\.trim\(\) \|\| rows\.length === 0\) return;/.test(trashPageSrc));
}

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
