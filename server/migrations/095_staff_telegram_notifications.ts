// **تنبيهاتُ الموظّفين عبر بوت تلغرام منفصل** (قرارُ المالك ٢٠٢٦-١٠-٠٤، §4.by).
//
// أربعةُ جداول، كلُّها إضافيّة و idempotent:
// - `staff_telegram_links`  — مَن ربط حسابَه بالبوت (معرّفُ المحادثة نصّاً؛ معرّفاتُ تلغرام تتجاوز ٣٢-بت).
// - `staff_link_tokens`     — تذكرةُ ربطٍ لمرّةٍ واحدة يصدرها المسؤول، **بصمتُها وحدها** تُحفَظ لا نصُّها.
// - `staff_notification_prefs` — صفٌّ لكلّ (موظّف، نوع تنبيه) مفعَّل؛ المسؤولُ وحده يكتبه.
// - `staff_notification_outbox` — صندوقٌ صادر يُكتب **داخل معاملة الحدث نفسِه**، فلا تنبيهَ لعمليةٍ ارتدّت؛
//   والمستلِمون يُحسَبون عند الإرسال من الإعدادات الحيّة.
// **والمفاتيحُ إلى `system_users` بـ`ON DELETE CASCADE`**: إعدادٌ لا تاريخ، فلا يمنع الحذفَ النهائيّ لموظّف.
export const name = "095_staff_telegram_notifications";

export const sql = `
CREATE TABLE IF NOT EXISTS staff_telegram_links (
  user_id    integer PRIMARY KEY REFERENCES system_users(id) ON DELETE CASCADE,
  chat_id    text NOT NULL,
  linked_at  timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_link_tokens (
  token_hash text PRIMARY KEY,
  user_id    integer NOT NULL REFERENCES system_users(id) ON DELETE CASCADE,
  created_by integer,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  expires_at timestamptz NOT NULL,
  used_at    timestamptz
);
CREATE INDEX IF NOT EXISTS idx_staff_link_tokens_user ON staff_link_tokens(user_id);

CREATE TABLE IF NOT EXISTS staff_notification_prefs (
  user_id    integer NOT NULL REFERENCES system_users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  PRIMARY KEY (user_id, event_type)
);

CREATE TABLE IF NOT EXISTS staff_notification_outbox (
  id              serial PRIMARY KEY,
  event_type      text NOT NULL,
  branch_id       integer,
  target_user_ids integer[],
  exclude_user_id integer,
  specialty       text,
  text            text NOT NULL,
  link_path       text,
  status          text NOT NULL DEFAULT 'pending',
  attempts        integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  sent_at         timestamptz
);
CREATE INDEX IF NOT EXISTS idx_staff_outbox_pending ON staff_notification_outbox(id) WHERE status = 'pending';
`;
