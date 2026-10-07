// Migration 106: مكتبةُ بروتوكولات العلاج الطبيعي (§4.cj — المرحلةُ الثانية من خطّة العلاج الطبيعي، ٢٠٢٦-١٠-٠٧).
//
//   • physio_protocols          — البروتوكول: الحالة (عربي + المصطلح الإنكليزي)، الفئة، الفئة العمرية، الأهداف والتقييم والتمارين،
//                                 موانعُ الاستعمال والاحتياطات، الجرعة (جلسات/أسبوع · أسابيع · دقائق)، المراجعُ العالمية،
//                                 والحالة: مسوّدة ⟵ معتمَد (بالمشرف العام أو المسؤول). الحذفُ أرشفةٌ لا محو.
//   • physio_protocol_devices   — أجهزةُ البروتوكول من جدول `devices` نفسه، ولكلٍّ درجةُ دليل ومعاملاتٌ ودقائق.
//   • physio_protocol_images    — صورٌ توضيحية في القاعدة (كمستندات §4.cf) مع مصدرها ونسبتها.
//   • physio_device_branches    — توفّرُ الجهاز بالفرع. **صفٌّ غائب = غير متوفّر**: بغداد وذي قار متوفّرٌ فيهما كلُّ جهاز اليوم،
//                                 وكربلاء والموصل بلا صفّ حتى يُفعَّلا.
// ولا مفتاحَ إلى `patients` — فلا يمسّ كاسكيدَ حذف المريض (§8).

export const name = "106_physio_protocols";

export const sql = `
CREATE TABLE IF NOT EXISTS physio_protocols (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('spine','upper_limb','lower_limb','neurological','post_surgical','amputation','rheumatologic','other')),
  age_group TEXT NOT NULL CHECK (age_group IN ('pediatric','adult','geriatric','all')),
  summary TEXT,
  goals TEXT,
  assessment TEXT,
  exercises TEXT,
  contraindications TEXT,
  precautions TEXT,
  sessions_per_week INTEGER CHECK (sessions_per_week IS NULL OR sessions_per_week BETWEEN 1 AND 14),
  duration_weeks INTEGER CHECK (duration_weeks IS NULL OR duration_weeks BETWEEN 1 AND 104),
  session_minutes INTEGER CHECK (session_minutes IS NULL OR session_minutes BETWEEN 5 AND 240),
  "references" JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved')),
  approved_by INTEGER REFERENCES system_users(id),
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_by INTEGER REFERENCES system_users(id),
  created_by_name TEXT,
  updated_by INTEGER REFERENCES system_users(id),
  updated_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS physio_protocol_devices (
  id SERIAL PRIMARY KEY,
  protocol_id INTEGER NOT NULL REFERENCES physio_protocols(id) ON DELETE CASCADE,
  device_id INTEGER NOT NULL REFERENCES devices(id),
  evidence TEXT NOT NULL CHECK (evidence IN ('recommended','optional','not_recommended')),
  parameters TEXT,
  minutes INTEGER CHECK (minutes IS NULL OR minutes BETWEEN 1 AND 120),
  note TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (protocol_id, device_id)
);

CREATE TABLE IF NOT EXISTS physio_protocol_images (
  id SERIAL PRIMARY KEY,
  protocol_id INTEGER NOT NULL REFERENCES physio_protocols(id) ON DELETE CASCADE,
  content BYTEA NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  caption TEXT,
  source_url TEXT,
  credit TEXT,
  created_by INTEGER REFERENCES system_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_physio_protocol_images_protocol ON physio_protocol_images(protocol_id);

CREATE TABLE IF NOT EXISTS physio_device_branches (
  device_id INTEGER NOT NULL REFERENCES devices(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  available BOOLEAN NOT NULL DEFAULT true,
  updated_by INTEGER REFERENCES system_users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, branch_id)
);

INSERT INTO physio_device_branches (device_id, branch_id, available)
SELECT d.id, b.id, true FROM devices d CROSS JOIN branches b
 WHERE b.name LIKE '%بغداد%' OR b.name LIKE '%ذي قار%'
ON CONFLICT (device_id, branch_id) DO NOTHING;
`;
