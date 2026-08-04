// buildAmputationSite must produce BYTE-IDENTICAL strings to the registration
// form's inline builder (CreatePatient.tsx useEffect), because everything
// downstream — EditPatient's reverse-parser, the expert order page's
// «موقع البتر», old records — reads that exact format.
// No database: `npm run test:amputation-site`.

import {
  AMPUTATION_TYPE_OPTIONS,
  LOWER_AMPUTATION_DETAILS,
  SILICONE_PARTS,
  UPPER_AMPUTATION_DETAILS,
  buildAmputationSite,
  parseAmputationSite,
  type AmputationParts,
} from "@shared/case_fields";

let failures = 0;
function check(label: string, got: string, expected: string) {
  const ok = got === expected;
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌"} ${label}${ok ? "" : `\n   expected: "${expected}"\n   got:      "${got}"`}`);
}

console.log("── احادي ──");
check(
  "lower right + detail",
  buildAmputationSite({ amputationType: "single", singleLimb: "lower", singleSide: "right", singleDetail: "تحت الركبة" }),
  "احادي - طرف سفلي - يمين - تحت الركبة",
);
check(
  "upper left, no detail (3 segments only)",
  buildAmputationSite({ amputationType: "single", singleLimb: "upper", singleSide: "left" }),
  "احادي - طرف علوي - يسار",
);

console.log("\n── ثنائي: علوي / سفلي ──");
check(
  "lower, only right detail → left shows -",
  buildAmputationSite({ amputationType: "double", doubleLimbType: "lower", doubleRightDetail: "فوق الركبة" }),
  "ثنائي - سفلي | يمين: فوق الركبة | يسار: -",
);
check(
  "upper, both details",
  buildAmputationSite({ amputationType: "double", doubleLimbType: "upper", doubleRightDetail: "تحت المرفق", doubleLeftDetail: "خلال الكتف" }),
  "ثنائي - علوي | يمين: تحت المرفق | يسار: خلال الكتف",
);
check(
  "lower, no details → NO tail at all",
  buildAmputationSite({ amputationType: "double", doubleLimbType: "lower" }),
  "ثنائي - سفلي",
);

console.log("\n── ثنائي: علوي وسفلي (both) ──");
check(
  "mixed limbs with details — parenthesized limb per side",
  buildAmputationSite({
    amputationType: "double", doubleLimbType: "both",
    bothRightLimb: "upper", bothRightDetail: "فوق المرفق",
    bothLeftLimb: "lower", bothLeftDetail: "تحت الركبة",
  }),
  "ثنائي - علوي وسفلي | يمين (علوي): فوق المرفق | يسار (سفلي): تحت الركبة",
);
check(
  "both with nothing chosen → both segments still appear with -",
  buildAmputationSite({ amputationType: "double", doubleLimbType: "both", bothRightLimb: "upper", bothLeftLimb: "upper" }),
  "ثنائي - علوي وسفلي | يمين (علوي): - | يسار (علوي): -",
);

console.log("\n── اطراف سليكونية تعويضية ──");
check(
  "انف hides the side",
  buildAmputationSite({ amputationType: "silicone", siliconePart: "انف", siliconeSide: "right" }),
  "اطراف سليكونية تعويضية - انف",
);
check(
  "اذن + كلا الجانبين + notes",
  buildAmputationSite({ amputationType: "silicone", siliconePart: "اذن", siliconeSide: "both", siliconeNotes: "نص" }),
  "اطراف سليكونية تعويضية - اذن - كلا الجانبين | ملاحظات: نص",
);
check(
  "no part chosen → placeholder dash, no side",
  buildAmputationSite({ amputationType: "silicone" }),
  "اطراف سليكونية تعويضية - -",
);

console.log("\n── untouched builder writes nothing ──");
check("empty parts → empty string", buildAmputationSite({}), "");
check("unknown type → empty string", buildAmputationSite({ amputationType: "x" }), "");

console.log("\n── vocabulary pins (the owner's lists, verbatim) ──");
function pin(label: string, ok: boolean) {
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌"} ${label}`);
}
pin("3 amputation variants", AMPUTATION_TYPE_OPTIONS.length === 3);
pin("lower list = 6 levels ending خلال الحوض",
  LOWER_AMPUTATION_DETAILS.length === 6 && LOWER_AMPUTATION_DETAILS[5] === "خلال الحوض");
pin("upper list = 7 levels ending خلال الكتف",
  UPPER_AMPUTATION_DETAILS.length === 7 && UPPER_AMPUTATION_DETAILS[6] === "خلال الكتف");
pin("silicone parts = 5 incl. محجر عين",
  SILICONE_PARTS.length === 5 && SILICONE_PARTS.includes("محجر عين"));

// ── parseAmputationSite: the exact inverse ──────────────────────────────────
// Reception now records the amputation at registration, and the doctor's exam
// opens carrying it. That round trip is only safe if parse(build(x)) === x for
// every shape the builder can produce.
console.log("\n── round trip: parse(build(x)) === x ──");
function roundTrip(label: string, parts: AmputationParts) {
  const built = buildAmputationSite(parts);
  const back = parseAmputationSite(built);
  const rebuilt = buildAmputationSite(back);
  const ok = rebuilt === built;
  if (!ok) failures++;
  console.log(
    `${ok ? "✅" : "❌"} ${label}` +
      (ok ? "" : `\n   built:   "${built}"\n   rebuilt: "${rebuilt}"\n   parsed:  ${JSON.stringify(back)}`),
  );
}

roundTrip("احادي سفلي يمين + مستوى", { amputationType: "single", singleLimb: "lower", singleSide: "right", singleDetail: "تحت الركبة" });
roundTrip("احادي علوي يسار بلا مستوى", { amputationType: "single", singleLimb: "upper", singleSide: "left" });
roundTrip("ثنائي سفلي بجهتين", { amputationType: "double", doubleLimbType: "lower", doubleRightDetail: "فوق الركبة", doubleLeftDetail: "تحت الركبة" });
roundTrip("ثنائي علوي بيمين فقط", { amputationType: "double", doubleLimbType: "upper", doubleRightDetail: "تحت المرفق" });
roundTrip("ثنائي بلا تفاصيل", { amputationType: "double", doubleLimbType: "lower" });
roundTrip("ثنائي علوي وسفلي كامل", { amputationType: "double", doubleLimbType: "both", bothRightLimb: "upper", bothLeftLimb: "lower", bothRightDetail: "خلال الكتف", bothLeftDetail: "خلال الحوض" });
roundTrip("ثنائي علوي وسفلي بلا تفاصيل", { amputationType: "double", doubleLimbType: "both", bothRightLimb: "lower", bothLeftLimb: "lower" });
roundTrip("سليكوني اذن يمين", { amputationType: "silicone", siliconePart: "اذن", siliconeSide: "right" });
roundTrip("سليكوني اصبع يسار + ملاحظات", { amputationType: "silicone", siliconePart: "اصبع", siliconeSide: "left", siliconeNotes: "السبابة" });
roundTrip("سليكوني انف — بلا جهة", { amputationType: "silicone", siliconePart: "انف", siliconeNotes: "بعد استئصال" });
roundTrip("سليكوني محجر عين كلا الجانبين", { amputationType: "silicone", siliconePart: "محجر عين", siliconeSide: "both" });
roundTrip("سليكوني بلا جزء", { amputationType: "silicone" });

console.log("\n── ما لا يُفهَم يُترك للطبيب فارغاً ──");
function empty(label: string, site: string | null | undefined) {
  const got = parseAmputationSite(site);
  const ok = Object.keys(got).length === 0;
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌"} ${label}${ok ? "" : `\n   got: ${JSON.stringify(got)}`}`);
}
empty("فارغ", "");
empty("null", null);
empty("نص حرّ قديم", "بتر تحت الركبة يمين");

console.log("\n── الملاحظات تُقرأ كاملة ولو حوت فواصل ──");
{
  const site = buildAmputationSite({ amputationType: "silicone", siliconePart: "كف", siliconeSide: "right", siliconeNotes: "جزئي - الإبهام | مراجعة" });
  const back = parseAmputationSite(site);
  const ok = back.siliconeNotes === "جزئي - الإبهام | مراجعة";
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌"} ملاحظة تحوي - و |${ok ? "" : `\n   got: "${back.siliconeNotes}"`}`);
}

console.log(failures === 0 ? "\n✅ all amputation-site cases pass" : `\n❌ ${failures} case(s) failed`);
process.exit(failures === 0 ? 0 : 1);
