// Migration 039: how the referring PERSON heard about the centre.
//
// «من شخص آخر» answers who sent the patient but not what reached that person
// in the first place — which is the number the owner actually markets on.
// A separate column rather than folding the answer into referral_source,
// because the statistics page groups by referral_source: a composite value
// would shatter one bucket into seven.
//
// Nullable: it applies only to the «من شخص آخر» branch of the form.

export const name = "039_referral_sub_source";

export const sql = `
ALTER TABLE patients ADD COLUMN IF NOT EXISTS referral_sub_source TEXT;
`;
