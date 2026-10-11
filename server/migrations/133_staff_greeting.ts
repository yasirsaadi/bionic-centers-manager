// Migration 133: تحيّةُ الموظّف اليومية (§4.dp — ٢٠٢٦-١٠-١١).
//
// طلبُ المالك: «حين يدخل أيُّ موظّف تظهر له عبارةٌ حسب الوقت لا تختفي إلّا أن يضغط «حسناً»» — **مرّةً كلَّ يوم**، وعشرُ عباراتٍ تتناوب،
// وتذكيرُه كلَّ شهر ليغيّرها (`shared/staff_greeting.ts`).
//   • `system_users.last_greeted_on` — يومُ بغداد الذي ضغط فيه «حسناً» آخرَ مرّة: لا تظهر ثانيةً في اليوم نفسِه ولو من جهازٍ آخر.
//   • `system_settings.staff_greeting` — العباراتُ العشر الأولى ويومُ كتابتها (منه يبدأ عدُّ الشهر)؛ **لا يُكتب فوق ما غيّره المالك** (`DO NOTHING`).
import { DEFAULT_GREETINGS, GREETING_SETTING_KEY } from "@shared/staff_greeting";

export const name = "133_staff_greeting";

const seed = JSON.stringify({ phrases: DEFAULT_GREETINGS, updatedAt: "__NOW__", updatedByName: null, keptAt: null });
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;

export const sql = `
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS last_greeted_on date;

INSERT INTO system_settings (setting_key, setting_value, updated_at)
VALUES (${lit(GREETING_SETTING_KEY)}, replace(${lit(seed)}, '__NOW__', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')), now())
ON CONFLICT (setting_key) DO NOTHING;
`;
