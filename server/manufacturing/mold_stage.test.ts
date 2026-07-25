// Pure-function tests for the delivery-date commitment rule. No database, so
// this runs anywhere: `npx tsx server/manufacturing/mold_stage.test.ts`.
//
// Why this file exists: `isAtOrBeyondMoldStage` used to measure an order's
// stage against `stagesForService()` — the INITIAL-BUILD list — even for
// maintenance orders, which run a completely different lifecycle. Every
// maintenance stage scored -1 in that list, so the answer came out right by
// accident rather than by rule. These cases pin the intended behaviour down:
// initial builds must demand a promised delivery date at (or past) the mold
// stage; maintenance episodes have no mold stage and must never demand one.

import {
  isAtOrBeyondMoldStage,
  stagesForOrder,
  PROSTHETIC_STAGES,
  MEDICAL_SUPPORT_STAGES,
} from "@shared/manufacturing";

let failures = 0;

function check(label: string, got: boolean, expected: boolean) {
  const ok = got === expected;
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌"} ${label}${ok ? "" : ` — expected ${expected}, got ${got}`}`);
}

console.log("── initial builds: the commitment must fire ──");
check("prosthetic @ cast_taken", isAtOrBeyondMoldStage("prosthetic", "cast_taken", null), true);
check(
  "prosthetic @ assessment_measurements (before the mold)",
  isAtOrBeyondMoldStage("prosthetic", "assessment_measurements", null),
  false,
);
check(
  "medical_support @ cast_if_needed",
  isAtOrBeyondMoldStage("medical_support", "cast_if_needed", null),
  true,
);

console.log("\n── jumping PAST the mold stage must still arm it ──");
// Stage transitions are not forced to be sequential; an expert who skips
// straight to a later stage must still be asked for the date, or the
// delivery-accuracy tracking silently never arms.
for (const stage of PROSTHETIC_STAGES.slice(PROSTHETIC_STAGES.indexOf("cast_taken") + 1)) {
  check(`prosthetic @ ${stage}`, isAtOrBeyondMoldStage("prosthetic", stage, null), true);
}
for (const stage of MEDICAL_SUPPORT_STAGES.slice(
  MEDICAL_SUPPORT_STAGES.indexOf("cast_if_needed") + 1,
)) {
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
