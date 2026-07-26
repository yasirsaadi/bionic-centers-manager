// Which services a patient actually has. No database:
// `npx tsx server/medical/case_signals.test.ts`.
//
// This rule decides whether a `patient_cases` row is created, and it was the
// source of a real production defect: a patient registered as مساند ONLY was
// given a phantom أطراف case, because the registration form had left a stale
// `amputationSite` behind when the receptionist switched the service type, and
// the rule read that leftover as proof of an amputation. The patient then sat
// permanently "بانتظار معاينة أطراف صناعية" for a limb they do not need.
//
// The fix: an EXPLICIT classification beats a stale detail column. The detail
// column still rescues legacy rows that carry no classification at all.

import { wantedServices, type ServiceSignals } from "@shared/case_signals";

const NONE: ServiceSignals = {
  isAmputee: false,
  isMedicalSupport: false,
  isPhysiotherapy: false,
  hasProstheticWorkOrder: false,
  hasSupportWorkOrder: false,
  hasProstheticTag: false,
  hasSupportTag: false,
  hasPhysioTag: false,
  hasProstheticDetails: false,
  hasSupportDetails: false,
};

let failures = 0;
function check(label: string, got: boolean, expected: boolean) {
  const ok = got === expected;
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌"} ${label}${ok ? "" : ` — expected ${expected}, got ${got}`}`);
}

console.log("── the reported defect ──");
// جواد نعمة ثامر: registered مساند only, stale amputationSite from the form.
const jawad = { ...NONE, isMedicalSupport: true, hasProstheticDetails: true, hasSupportDetails: true };
check("مساند-only patient gets NO أطراف case", wantedServices(jawad).prosthetic, false);
check("…and keeps their مساند case", wantedServices(jawad).medical_support, true);

console.log("\n── the legacy rescue still works ──");
// No classification at all: the detail column is the only record of the service.
check(
  "unclassified patient with a prosthetic type",
  wantedServices({ ...NONE, hasProstheticDetails: true }).prosthetic,
  true,
);
check(
  "unclassified patient with a support type",
  wantedServices({ ...NONE, hasSupportDetails: true }).medical_support,
  true,
);

console.log("\n── hard signals always win, whatever the flags say ──");
check(
  "work order proves the service",
  wantedServices({ ...NONE, isMedicalSupport: true, hasProstheticWorkOrder: true }).prosthetic,
  true,
);
check(
  "tagged payment proves the service",
  wantedServices({ ...NONE, isPhysiotherapy: true, hasProstheticTag: true }).prosthetic,
  true,
);
check(
  "the flag itself proves the service",
  wantedServices({ ...NONE, isAmputee: true }).prosthetic,
  true,
);

console.log("\n── a genuine dual-service patient keeps both ──");
const dual = { ...NONE, isAmputee: true, isMedicalSupport: true };
check("أطراف kept", wantedServices(dual).prosthetic, true);
check("مساند kept", wantedServices(dual).medical_support, true);

console.log("\n── physiotherapy: isolated, and unchanged by any of this ──");
check(
  "physio patient never gains أطراف from a stale field",
  wantedServices({ ...NONE, isPhysiotherapy: true, hasProstheticDetails: true }).prosthetic,
  false,
);
check(
  "physio patient never gains مساند from a stale field",
  wantedServices({ ...NONE, isPhysiotherapy: true, hasSupportDetails: true }).medical_support,
  false,
);
check("physio by flag", wantedServices({ ...NONE, isPhysiotherapy: true }).physiotherapy, true);
check("physio by tag", wantedServices({ ...NONE, hasPhysioTag: true }).physiotherapy, true);
check("no physio without either", wantedServices({ ...NONE, isAmputee: true }).physiotherapy, false);

console.log("\n── a patient with nothing gets nothing ──");
const empty = wantedServices(NONE);
check("no أطراف", empty.prosthetic, false);
check("no مساند", empty.medical_support, false);
check("no علاج طبيعي", empty.physiotherapy, false);

console.log(
  failures === 0 ? "\n✅ all case-signal cases pass" : `\n❌ ${failures} case(s) failed`,
);
process.exit(failures === 0 ? 0 : 1);
