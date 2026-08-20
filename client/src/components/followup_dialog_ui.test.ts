// نافذتا «التأجيل» و«إعادة الفتح» — منطقٌ خالص، بلا React.
// `npm run test:followup-dialog`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// **إعادةُ الفتح لا تخترع موعداً.** كان الحقلُ يُفتح مملوءاً بأسبوعٍ من
// اليوم، فمَن أراد إعادة الفتح وحدها يضغط «حفظ» فيصير الملفّ «مؤجَّل —
// متابعة» بموعدٍ لم يقرّره أحد، ويخرج من الطابور الذي يجب أن يعود إليه.
//
// **والتأجيلُ لم يتغيّر**: هو فعلٌ يُقصَد بذاته، فموعدُه المقترَح في محلّه.

import { readFileSync } from "fs";
import { join } from "path";
import { reopenPayload, deferPayload, dateInputToIso } from "./followup_dialog_ui";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}
function same(msg: string, got: unknown, expected: unknown) {
  check(msg, JSON.stringify(got) === JSON.stringify(expected),
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`);
}

console.log("\n═══ نافذتا التأجيل وإعادة الفتح ═══\n");

// ── ١. **إعادةُ الفتح بلا تاريخ** ────────────────────────────────────────
console.log("── إعادة الفتح ──");
same("١. **بلا تاريخ ⟶ بانتظار قرار المريض، بلا موعد**",
  reopenPayload({ nextDate: "" }), { toStatus: "awaiting_patient_decision" });
same("٢. والحقلُ الغائب كذلك", reopenPayload({}), { toStatus: "awaiting_patient_decision" });
same("٣. و`null` كذلك", reopenPayload({ nextDate: null }),
  { toStatus: "awaiting_patient_decision" });
same("٤. والمسافاتُ وحدها ليست تاريخاً", reopenPayload({ nextDate: "   " }),
  { toStatus: "awaiting_patient_decision" });
//  **ولا يُرسَل `nextFollowUpAt` إطلاقاً** — لا `undefined` ولا `null`:
//  الحقلُ غائبٌ عن الجسم، فلا يقرؤه الخادم موعداً بأي حال.
check("٥. **ولا مفتاحَ موعدٍ في الجسم أصلاً**",
  !("nextFollowUpAt" in reopenPayload({ nextDate: "" })),
  JSON.stringify(reopenPayload({ nextDate: "" })));
//  **ولا `noScheduledFollowUp`**: هو «قرارٌ صريح بلا موعد» داخل التأجيل،
//  ولا معنى له في ملفٍّ عاد بانتظار قرار المريض.
check("٦. **ولا علمَ «بلا موعد»** — لا معنى له هنا",
  !("noScheduledFollowUp" in reopenPayload({ nextDate: "" })));

// ── ٢. **وبتاريخٍ صريح: تأجيلٌ مقصود** ───────────────────────────────────
{
  const p = reopenPayload({ nextDate: "2026-09-01" });
  same("٧. **وبتاريخٍ صريح ⟶ مؤجَّل بذلك الموعد**",
    [p.toStatus, String(p.nextFollowUpAt).slice(0, 10)], ["follow_up", "2026-09-01"]);
}
same("٨. والملاحظةُ تُمرَّر حين تُكتب",
  reopenPayload({ nextDate: "", note: "عاد بعد شهرين" }),
  { toStatus: "awaiting_patient_decision", note: "عاد بعد شهرين" });
same("٩. والملاحظةُ الفارغة لا تُرسَل",
  "note" in reopenPayload({ nextDate: "", note: "   " }), false);

// ── ٣. **وتاريخٌ فاسد لا يُسقط النافذة** ────────────────────────────────
//  `new Date("").toISOString()` ترمي `RangeError` — وكان هذا كامناً في
//  الشيفرة القديمة: حقلُ تاريخٍ فُرِّغ بيد الموظّف يُسقط الحفظ بلا رسالة.
console.log("\n── التاريخ الفاسد ──");
for (const bad of ["", "   ", "abc", "2026-13-45", "not-a-date"]) {
  same(`١٠. «${bad || "(فارغ)"}» يُقرأ «بلا موعد» ولا يرمي`,
    dateInputToIso(bad), undefined);
}
same("١١. وقيمةٌ ليست نصّاً كذلك",
  [dateInputToIso(null), dateInputToIso(undefined), dateInputToIso(5 as any)],
  [undefined, undefined, undefined]);
same("١٢. **وتاريخٌ فاسدٌ يعيد الملفّ بانتظار القرار لا يُسقطه**",
  reopenPayload({ nextDate: "abc" }), { toStatus: "awaiting_patient_decision" });

// ── ٤. **والتأجيلُ لم يتغيّر** ───────────────────────────────────────────
console.log("\n── التأجيل ──");
{
  const p = deferPayload({ reason: "needs_time", nextDate: "2026-09-01" });
  same("١٣. تأجيلٌ بموعده وسببه",
    [p.reason, String(p.nextFollowUpAt).slice(0, 10), p.noScheduledFollowUp],
    ["needs_time", "2026-09-01", false]);
}
same("١٤. **و«بلا موعد» قرارٌ صريح يُرسَل علماً**",
  deferPayload({ reason: "cannot_reach", nextDate: "2026-09-01", noSchedule: true }),
  { reason: "cannot_reach", noScheduledFollowUp: true });
same("١٥. **وتأجيلٌ بلا موعدٍ ولا علم يُرسَل ناقصاً ليردّه الخادم**",
  deferPayload({ reason: "needs_time", nextDate: "" }),
  { reason: "needs_time", noScheduledFollowUp: false });

// ── ٥. **والبطاقةُ تستعمل هذه القاعدة فعلاً** ────────────────────────────
console.log("\n── عقد البطاقة ──");
{
  const src = readFileSync(
    join(import.meta.dirname, "./PostExamDecisionCard.tsx"), "utf8");
  check("١٦. **البطاقةُ تبني الجسمين بالدالّتين لا في الشاشة**",
    src.includes("reopenPayload({") && src.includes("deferPayload({"));
  //  **وزرُّ إعادة الفتح يفرّغ الحقل قبل أن يفتح النافذة** — وهذا هو
  //  الإصلاح نفسه: لولاه لبقي موعدُ الأسبوع مقترَحاً.
  check("١٧. **وزرُّ إعادة الفتح يفرّغ حقل الموعد أوّلاً**",
    /setNextDate\(""\);\s*setDialog\("reopen"\)/.test(src),
    (src.match(/.*setDialog\("reopen"\).*/g) ?? []).join("\n"));
  //  **ولم يبقَ `new Date(nextDate).toISOString()` عارياً في الشاشة.**
  check("١٨. **ولا تحويلَ تاريخٍ خامٌّ في الشاشة يرمي على الفراغ**",
    !/new Date\(nextDate\)/.test(src),
    (src.match(/.*new Date\(nextDate\).*/g) ?? []).join("\n"));
  //  ومربّعُ «بلا موعد» لا يظهر في إعادة الفتح — الفراغُ يقوله وحده.
  //  ويُثبَت بالترتيب لا بالمسافة: الشرطُ يسبق، والفرعُ الآخر (`) : (`)
  //  بينهما، والمربّعُ بعدهما — أي أنه في فرع «ليست إعادة فتح».
  {
    const gate = src.indexOf('dialog === "reopen" ? (');
    const other = src.indexOf(") : (", gate);
    const box = src.indexOf("checkbox-no-schedule", gate);
    check("١٩. **ومربّعُ «بلا موعد» في الفرع الآخر لا في إعادة الفتح**",
      gate > 0 && other > gate && box > other,
      JSON.stringify({ gate, other, box }));
  }
  check("٢٠. **ونصٌّ يشرح للموظّف ما يعنيه الفراغ**",
    src.includes("text-reopen-hint"));
}

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
