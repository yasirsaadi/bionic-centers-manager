// اختبارُ لقطة الدور عند الحسم — **منطقٌ خالص، بلا قاعدة بيانات ولا شبكة**.
// `npm run test:decision-queue-rules`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// تسميةَ الفراغ التاريخيّ حين لا تحمل الحالةُ لقطةَ دور (٢٠٢٦-٠٨-٢٩ —
// «غير مسجلة تاريخياً» بدل «—» المبهمة)، وأن الأربعة الأدوارَ الصالحة
// تبقى كما هي بحرفها. **ولا اشتقاقَ من `system_users.role` الحاليّ ولا
// ترحيلَ يخمّن ماضياً** — السلوكُ التشغيليّ الحيّ (القراءة من الحدث،
// الفرزُ بين التبويبين) مُختبَرٌ حيّاً في `server/decision_queue.test.ts`؛
// هذا الملفّ يحرس المنطقَ الخالص وحده.

import {
  actorRoleLabel, actorRoleSnapshotOf, isActorRoleSnapshot,
  UNKNOWN_ROLE_LABEL, ACTOR_ROLE_LABELS, ACTOR_ROLE_SNAPSHOT_VALUES,
} from "./decision_queue";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}
function same(msg: string, got: unknown, expected: unknown) {
  check(msg, JSON.stringify(got) === JSON.stringify(expected),
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`);
}

console.log("\n═══ لقطةُ الدور عند الحسم ═══\n");

// ── ١. الفراغُ التاريخيّ يُقال صراحةً ─────────────────────────────────────
{
  same("١. غيابُ لقطةٍ (`null`) ⟶ «غير مسجلة تاريخياً»",
    actorRoleLabel(null), "غير مسجلة تاريخياً");
  same("٢. وكذلك `undefined`", actorRoleLabel(undefined), "غير مسجلة تاريخياً");
  same("٣. وكذلك سلسلةٌ فارغة", actorRoleLabel(""), "غير مسجلة تاريخياً");
  same("٤. وكذلك دورٌ لم يعد صالحاً (`doctor` — ليس من الأربعة)",
    actorRoleLabel("doctor"), "غير مسجلة تاريخياً");
  same("٥. وكذلك رقمٌ أو قيمةٌ من نوعٍ غير متوقَّع",
    actorRoleLabel(42), "غير مسجلة تاريخياً");
  same("٦. **والثابتُ نفسُه هو ما تُرجعه الدالّة** — لا نصّان قد ينحرفان",
    actorRoleLabel(null), UNKNOWN_ROLE_LABEL);
}

// ── ٢. الأربعةُ الأدوارُ الصالحة لم تتغيّر ────────────────────────────────
{
  same("٧. الاستعلامات", actorRoleLabel("reception"), "الاستعلامات");
  same("٨. المحاسب", actorRoleLabel("accountant"), "المحاسب");
  same("٩. مدير الفرع", actorRoleLabel("branch_manager"), "مدير الفرع");
  same("١٠. المسؤول العام", actorRoleLabel("global_admin"), "المسؤول العام");
  same("١١. **والمصفوفةُ القانونية بحرفها** — أربعةٌ لا خامس",
    ACTOR_ROLE_SNAPSHOT_VALUES,
    ["reception", "accountant", "branch_manager", "global_admin"]);
  for (const v of ACTOR_ROLE_SNAPSHOT_VALUES) {
    check(`١٢. و«${v}» يمرّ حارسَ النوع`, isActorRoleSnapshot(v));
    check(`     وتسميتُه ليست الفراغ التاريخيّ`,
      ACTOR_ROLE_LABELS[v] !== UNKNOWN_ROLE_LABEL);
  }
}

// ── ٣. اشتقاقُ اللقطة من الجلسة — `isAdmin` يعلو دائماً ───────────────────
{
  same("١٣. مسؤولٌ بلا دورٍ آخر ⟶ `global_admin`",
    actorRoleSnapshotOf({ isAdmin: true, role: null }), "global_admin");
  same("١٤. **ومسؤولٌ يحمل دوراً آخر (طبيباً مثلاً) ⟶ سلطتُه لا دورُه**",
    actorRoleSnapshotOf({ isAdmin: true, role: "doctor" }), "global_admin");
  same("١٥. موظّفٌ عاديّ بدورٍ صالح ⟶ دورُه كما هو",
    actorRoleSnapshotOf({ isAdmin: false, role: "accountant" }), "accountant");
  same("١٦. ودورٌ غيرُ معروف (لا `isAdmin`) ⟶ `null` — لا تخمين",
    actorRoleSnapshotOf({ isAdmin: false, role: "doctor" }), null);
  same("١٧. وجلسةٌ غائبة ⟶ `null`", actorRoleSnapshotOf(null), null);
  same("١٨. **والفراغُ (`null`) من هذه الدالّة يُترجَم لاحقاً بالعبارة الصريحة**",
    actorRoleLabel(actorRoleSnapshotOf({ isAdmin: false, role: "doctor" })),
    "غير مسجلة تاريخياً");
}

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
