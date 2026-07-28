// Migration 035: the doctor may PROPOSE the manufacturing expert.
//
// Same shape as the device price (030): the doctor knows the case and often
// knows which expert should build it, but the assignment — like the money —
// is only real when reception saves «تخصيص وإسناد خبير». So the proposal
// lives on the exam, pre-fills reception's dialog, and reception keeps the
// final word: accept it, change it, or pick one when the doctor left it blank.
//
// أطراف/مساند only, by nature — physiotherapy has no manufacturing expert.
//
// NO foreign key, deliberately — and this was proven, not assumed. A first
// version used `REFERENCES system_users(id) ON DELETE SET NULL`; deleting a
// suggested expert then FAILED, because SET NULL is an UPDATE on medical_exams
// and the 028 seal-trigger rejects any update that has not opened the
// supervised `app.allow_exam_edit` door. So the column is a plain SNAPSHOT of
// the id, exactly like `doctor_name` is a snapshot of the name: an account
// that disappears leaves a stale id, the name simply resolves to nothing, and
// reception picks from the live roster. Nothing breaks and no seal is weakened.

export const name = "035_exam_proposed_expert";

export const sql = `
ALTER TABLE medical_exams
  ADD COLUMN IF NOT EXISTS proposed_expert_user_id INTEGER;

-- Defensive: an early build of this migration created the constraint. Drop it
-- so re-running lands on the snapshot form described above.
ALTER TABLE medical_exams
  DROP CONSTRAINT IF EXISTS medical_exams_proposed_expert_user_id_fkey;

ALTER TABLE medical_exam_revisions
  ADD COLUMN IF NOT EXISTS proposed_expert_user_id INTEGER;
`;
