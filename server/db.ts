import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const connectionString = process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

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
