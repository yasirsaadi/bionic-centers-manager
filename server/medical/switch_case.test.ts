// Pure-logic tests for "when is a doctor's specialty pick a SWITCH?".
// No database: `npx tsx server/medical/switch_case.test.ts`.
//
// The rule is easy to get wrong in a way that destroys data, and it did get
// written wrong first: retiring the other device case on EVERY device exam
// would delete a legitimately dual-service patient's second case — a patient
// who genuinely needs both a طرف and a مسند, added by reception through
// «إضافة نوع حالة». These cases pin the distinction down.
//
// A switch is ONLY: reception made exactly one device determination, and the
// doctor picked the other one.

/** Mirrors the decision inside store.retireSupersededCase. */
export function isSwitch(keepType: string, deviceTypesBefore: string[]): boolean {
  if (keepType !== "prosthetic" && keepType !== "medical_support") return false;
  const dropType = keepType === "prosthetic" ? "medical_support" : "prosthetic";
  return deviceTypesBefore.length === 1 && deviceTypesBefore[0] === dropType;
}

let failures = 0;
function check(label: string, got: boolean, expected: boolean) {
  const ok = got === expected;
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌"} ${label}${ok ? "" : ` — expected ${expected}, got ${got}`}`);
}

console.log("── the doctor overrides reception's single pick ⇒ SWITCH ──");
check("registered طرف, doctor says مسند", isSwitch("medical_support", ["prosthetic"]), true);
check("registered مسند, doctor says طرف", isSwitch("prosthetic", ["medical_support"]), true);

console.log("\n── the doctor confirms reception ⇒ nothing to retire ──");
check("registered طرف, doctor says طرف", isSwitch("prosthetic", ["prosthetic"]), false);
check("registered مسند, doctor says مسند", isSwitch("medical_support", ["medical_support"]), false);

console.log("\n── the patient genuinely needs BOTH ⇒ never retire ──");
// This is the case the first implementation would have destroyed.
check(
  "carries طرف+مسند, doctor documents طرف",
  isSwitch("prosthetic", ["prosthetic", "medical_support"]),
  false,
);
check(
  "carries طرف+مسند, doctor documents مسند",
  isSwitch("medical_support", ["medical_support", "prosthetic"]),
  false,
);

console.log("\n── physiotherapy is never a device switch ──");
check("physio with a طرف on file", isSwitch("physiotherapy", ["prosthetic"]), false);
check("physio with nothing on file", isSwitch("physiotherapy", []), false);
check("physio with both devices", isSwitch("physiotherapy", ["prosthetic", "medical_support"]), false);

console.log("\n── no prior device case ⇒ an addition, not a switch ──");
check("first ever device exam", isSwitch("prosthetic", []), false);
check("first ever support exam", isSwitch("medical_support", []), false);

console.log(
  failures === 0 ? "\n✅ all switch-rule cases pass" : `\n❌ ${failures} case(s) failed`,
);
process.exit(failures === 0 ? 0 : 1);
