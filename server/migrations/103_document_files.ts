// **مستنداتُ المرضى في قاعدة البيانات** (قرارُ المالك ٢٠٢٦-١٠-٠٧، §4.cf): كان الملفُّ يُحفظ على قرص خادم Render ويُكتب رابطُه
// في `documents` — والقرصُ يُمحى مع كلّ نشر، فضاعت الملفّاتُ وبقيت روابطُها (ثبت ذلك على WB-00027: «404»). فصار المحتوى صفّاً
// هنا بجانب المستند، ويُحذف معه بقيده (`ON DELETE CASCADE`) — في حذف المستند وفي «حذف نهائي» للمريض بلا سطرٍ إضافيّ.
// إضافيّ، idempotent، ولا يلمس صفّاً قائماً.

export const name = "103_document_files";

export const sql = `
CREATE TABLE IF NOT EXISTS document_files (
  document_id INTEGER PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  content BYTEA NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;
