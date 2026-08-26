import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { resolveDatabaseUrl, assertDatabaseSafeForEntryPoint } from "./db_url";

const { Pool } = pg;

//  **الأسبقيةُ لم تتغيّر بحرف** — `EXTERNAL_DATABASE_URL || DATABASE_URL` كما
//  كانت، لكنّها صارت تُقرأ من مكانٍ واحد (`./db_url`) يقرؤه حارسُ الاختبارات
//  نفسُه. فلا نسختان تنحرفان: كان الحارسُ يفحص متغيّراً والمسبحُ يستعمل آخر.
const connectionString = resolveDatabaseUrl(process.env);

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

//  ══ **الحارسُ قبل المسبح — لا بعده** ══════════════════════════════════════
//  يرمي **قبل** `new Pool(...)`، فلا اتّصالَ يُفتَح ولا استعلامَ يُنفَّذ على
//  قاعدةٍ حيّة حين تكون العمليةُ اختباراً. وهو اختباريٌّ وحده: خارجَ نقطة
//  دخولِ `*.test.ts` يمرّ دائماً، فلا يتغيّر تشغيلُ التطوير ولا الإنتاج ولا
//  البناء بحرف.
//
//  **وهذا هو خطُّ الدفاع المعتمَد** — لا الحُرّاسُ المحلّيّون في الاختبارات:
//  تلك تفحص `DATABASE_URL` وحده بينما المسبحُ قد يستعمل `EXTERNAL_DATABASE_URL`.
assertDatabaseSafeForEntryPoint({ env: process.env, argv: process.argv });

export const pool = new Pool({ connectionString });

// Idle clients can emit errors when the backend (Neon) drops a connection
// after a network blip or maintenance. Without a listener pg surfaces this
// as an uncaught error event and the whole process exits with status 1.
// Log it instead; the pool discards the dead client and reconnects on the
// next query.
pool.on("error", (err) => {
  console.error("[db] Unexpected error on idle PostgreSQL client:", err);
});

// ══ عتبتا التشابه — مكتوبتان لا متروكتان للافتراض ═══════════════════════
// عاملا `pg_trgm` (`%` و`%>`) يقرآن عتبتيهما من إعدادَي الجلسة، فقيمتهما
// جزءٌ من سلوك البحث لا تفصيلٌ في القاعدة. وتركُهما على الافتراضي يعني أن
// تغييراً في إعدادات الخادم يبدّل ما يجده الموظّف بلا سطرٍ في هذا الريبو.
//
//   · `similarity_threshold = 0.3` (الافتراضي) — للتشابه على الاسم كلّه.
//   · `word_similarity_threshold = 0.5` — **دون الافتراضي ٠٫٦ عمداً**:
//     «مصطفاى» مقابل «مصطفى» = ٠٫٥٧، فحرفٌ زائدٌ في وسط الكلمة كان يسقط.
//     و٠٫٥ لا تفتح البابَ للبعيد: «حسين» مقابل «حسن» = ٠٫٤٠ فتبقى خارجاً.
//
// وتُضبط لكلّ اتّصالٍ جديد لا مرّةً على القاعدة: `ALTER DATABASE` يسري على
// الجلسات اللاحقة وحدها ويحتاج ملكية، وهذا يسري على كل اتّصالٍ يفتحه المسبح
// مهما كان صاحبُه — وفشلُه لا يعطّل شيئاً، فالبحث يبقى يعمل بالافتراضي.
pool.on("connect", (client) => {
  client
    .query("SET pg_trgm.similarity_threshold = 0.3; SET pg_trgm.word_similarity_threshold = 0.5")
    .catch((err) => console.error("[db] could not set pg_trgm thresholds:", err?.message ?? err));
});

export const db = drizzle(pool, { schema });
