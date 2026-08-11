// Pure-function tests for the delivery-date commitment rule. No database, so
// this runs anywhere: `npx tsx server/manufacturing/mold_stage.test.ts`.
//
// Why this file exists: `isAtOrBeyondMoldStage` used to measure an order's
// stage against the INITIAL-BUILD list even for maintenance orders, which run
// a completely different lifecycle. Every maintenance stage scored -1 in that
// list, so the answer came out right by accident rather than by rule. These
// cases pin the intended behaviour down: initial builds must demand a promised
// delivery date at (or past) the mold stage; maintenance episodes have no mold
// stage and must never demand one.
//
// After the six-stage simplification the mold stage is literally named `mold`
// and both service types share one list — but the rule, and the maintenance
// exemption it is really guarding, are unchanged.

import {
  isAtOrBeyondMoldStage,
  stagesForOrder,
  BUILD_STAGES,
  MOLD_STAGE,
} from "@shared/manufacturing";

let failures = 0;

function check(label: string, got: boolean, expected: boolean) {
  const ok = got === expected;
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌"} ${label}${ok ? "" : ` — expected ${expected}, got ${got}`}`);
}

const MOLD_IDX = BUILD_STAGES.indexOf(MOLD_STAGE as any);

console.log("── initial builds: the commitment must fire at the mold ──");
check("prosthetic @ mold", isAtOrBeyondMoldStage("prosthetic", "mold", null), true);
check("medical_support @ mold", isAtOrBeyondMoldStage("medical_support", "mold", null), true);

console.log("\n── before the mold: not yet demanded ──");
for (const stage of BUILD_STAGES.slice(0, MOLD_IDX)) {
  check(`prosthetic @ ${stage}`, isAtOrBeyondMoldStage("prosthetic", stage, null), false);
  check(`medical_support @ ${stage}`, isAtOrBeyondMoldStage("medical_support", stage, null), false);
}

console.log("\n── jumping PAST the mold stage must still arm it ──");
// A support that needs no cast skips straight from measurements to
// manufacturing. It must still be asked for the date, or delivery-accuracy
// tracking silently never arms for exactly the orders that skip.
for (const stage of BUILD_STAGES.slice(MOLD_IDX + 1)) {
  check(`prosthetic @ ${stage}`, isAtOrBeyondMoldStage("prosthetic", stage, null), true);
  check(`medical_support @ ${stage}`, isAtOrBeyondMoldStage("medical_support", stage, null), true);
}

console.log("\n── maintenance: no mold stage exists, so never demanded ──");
for (const stage of stagesForOrder("prosthetic", "maintenance")) {
  check(`prosthetic maintenance @ ${stage}`, isAtOrBeyondMoldStage("prosthetic", stage, "maintenance"), false);
}
for (const stage of stagesForOrder("medical_support", "maintenance")) {
  check(
    `medical_support maintenance @ ${stage}`,
    isAtOrBeyondMoldStage("medical_support", stage, "maintenance"),
    false,
  );
}

console.log(
  failures === 0
    ? "\n✅ all mold-stage cases pass"
    : `\n❌ ${failures} case(s) failed`,
);
process.exit(failures === 0 ? 0 : 1);
