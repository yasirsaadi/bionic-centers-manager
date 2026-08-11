// تعبئة رجعية لأعمدة رقم الاتصال المطبَّع (migration 043).
//
// تُنفَّذ بـTypeScript لا بـSQL عمداً: قواعد التطبيع مكتوبة ومُختبَرة مرّة
// واحدة في `shared/phone.ts`، وكتابتها ثانيةً بـregex داخل SQL كانت
// ستُنشئ نسخة توأماً تنحرف عن الأصل بصمت مع أول تعديل على القواعد.
// فالقاعدة والتطبيق الحيّ يقرآن من الدالّة نفسها.
//
// ── سباق التزامن، وهو سبب شكل الكود أدناه ────────────────────────────────
// التعبئة تقرأ دفعةً، ثم تحسب في الذاكرة، ثم تكتب. والفجوة بين القراءة
// والكتابة حقيقية: التعبئة تعمل في الخلفية بعد `listen`، فالموظفون يعملون
// على النظام في اللحظة نفسها. فلو عدّل موظف رقم مريض داخل تلك الفجوة،
// كتب `updatePatient` الرقم الجديد وأعمدته المشتقّة بشكل صحيح — ثم جاءت
// كتابة التعبئة المتأخّرة فدهست الأعمدة المشتقّة بقيم محسوبة من الرقم
// **القديم**. النتيجة صفّ يحمل رقماً جديداً وأعمدة تصفه بالقديم: تلف صامت،
// لا يظهر في أي سجل، ويفسد المطابقة وكشف التكرار لاحقاً.
//
// العلاج شرطان في جملة الكتابة نفسها — لا قفل ولا معاملة طويلة:
//   1. `phone_status IS NULL`  — الصفّ لم يُعالَج بعد.
//   2. `phone IS NOT DISTINCT FROM` لقطة الرقم التي حُسبت منها القيم.
// فالكتابة المتأخّرة **لا تطابق شيئاً** ولا تكتب. المطابقة null-safe لأن
// `phone` قد يكون NULL، و`= NULL` لا يساوي شيئاً في SQL.
//
// وثلاث خصائص أخرى تجعلها آمنة:
//   • **لا تلمس `phone` إطلاقاً** — الأصل الذي كتبه الإنسان لا يُمسّ.
//   • **مستأنِفة** — الشرط `phone_status IS NULL` هو المؤشّر نفسه، فإعادة
//     النشر في منتصف العمل (SIGTERM من Render) تُكمل من حيث توقّفت.
//   • **ما لا يُفسَّر يصير `needs_review`** ولا يُخترع له رقم.

import { pool } from "../db";
import { normalizePhone } from "@shared/phone";

const BATCH = 500;
// حارس دوران: صفّ مؤهَّل لا تُطبَّق عليه الكتابة (لأن رقمه يتغيّر خارجياً
// في كل مرّة، أو لأن كتابةً مباشرة غيّرت `phone` وتركت الحالة NULL) قد
// يُعيد اختياره إلى ما لا نهاية. ثلاث دورات بلا تقدّم تُنهي العمل بتحذير
// بدل أن تُشغِّل حلقة ساخنة على القاعدة. الصفوف الباقية تبقى NULL — وهي
// تُقرأ «تحتاج مراجعة» في كل مكان — وتُلتقط في التشغيل التالي.
const MAX_NO_PROGRESS_ROUNDS = 3;

export interface PhoneBackfillRow {
  id: number;
  /** لقطة الرقم لحظة القراءة — هي ما تُقارَن به عند الكتابة. */
  phone: string | null;
}

/** الصفوف المؤهَّلة للتعبئة: ما لم يُعالَج بعد. */
export async function selectPhoneBackfillBatch(limit: number = BATCH): Promise<PhoneBackfillRow[]> {
  const { rows } = await pool.query<PhoneBackfillRow>(
    `SELECT id, phone FROM patients WHERE phone_status IS NULL ORDER BY id LIMIT $1`,
    [limit],
  );
  return rows;
}

/**
 * يكتب دفعة واحدة، ويُرجع معرّفات الصفوف التي طُبِّقت عليها فعلاً.
 *
 * الصفّ الذي تغيّر رقمه أو عولج منذ قراءة الدفعة **لا يُكتَب**، فلا يُرجَع
 * معرّفه. هذا هو الحارس ضد الكتابة المتأخّرة، وهو في القاعدة لا في الذاكرة
 * فيصمد أمام أي ترتيب زمني.
 */
export async function applyPhoneBackfillBatch(batch: PhoneBackfillRow[]): Promise<number[]> {
  if (batch.length === 0) return [];

  const ids: number[] = [];
  const oldPhones: (string | null)[] = [];
  const e164s: (string | null)[] = [];
  const countries: (string | null)[] = [];
  const statuses: string[] = [];

  for (const row of batch) {
    const n = normalizePhone(row.phone);
    ids.push(row.id);
    oldPhones.push(row.phone);
    e164s.push(n.e164);
    countries.push(n.country);
    statuses.push(n.status);
  }

  // جملة واحدة لكل دفعة بدل جملة لكل صفّ — أقلّ ذهاباً وإياباً إلى Neon.
  const { rows } = await pool.query<{ id: number }>(
    `UPDATE patients p
        SET phone_e164    = v.e164,
            phone_country = v.country,
            phone_status  = v.status
       FROM (
         SELECT * FROM UNNEST($1::int[], $2::text[], $3::text[], $4::text[], $5::text[])
           AS t(id, old_phone, e164, country, status)
       ) AS v
      WHERE p.id = v.id
        -- لم يُعالَج بعد …
        AND p.phone_status IS NULL
        -- … ورقمه ما زال هو نفسه الذي حُسبت منه هذه القيم.
        -- IS NOT DISTINCT FROM لأن NULL = NULL لا تساوي true في SQL.
        AND p.phone IS NOT DISTINCT FROM v.old_phone
    RETURNING p.id`,
    [ids, oldPhones, e164s, countries, statuses],
  );
  return rows.map((r) => r.id);
}

export async function backfillPhoneNormalization(): Promise<void> {
  try {
    let applied = 0;
    let normalized = 0;
    let review = 0;
    let skipped = 0;
    let noProgressRounds = 0;

    // الشرط الوحيد للتوقّف: لا صفّ مؤهَّل. عدد صفوف الدفعة **ليس** دليلاً
    // على الانتهاء بعد إضافة الحارس — دفعة قد تُقرأ كاملة ويُتخطّى بعضها
    // لتغيّر متزامن، فالخروج عند `rows.length < BATCH` كان سيترك صفوفاً
    // مؤهَّلة بلا معالجة إلى التشغيل التالي.
    for (;;) {
      const batch = await selectPhoneBackfillBatch();
      if (batch.length === 0) break;

      const appliedIds = await applyPhoneBackfillBatch(batch);
      const appliedSet = new Set(appliedIds);
      for (const row of batch) {
        if (!appliedSet.has(row.id)) { skipped++; continue; }
        if (normalizePhone(row.phone).ok) normalized++; else review++;
      }
      applied += appliedIds.length;

      if (appliedIds.length === 0) {
        if (++noProgressRounds >= MAX_NO_PROGRESS_ROUNDS) {
          console.warn(
            `[backfill-phone] ${batch.length} eligible row(s) kept changing under us — stopping; they stay 'needs review' and are retried on the next boot`,
          );
          break;
        }
      } else {
        noProgressRounds = 0;
      }
    }

    if (applied > 0 || skipped > 0) {
      console.log(
        `[backfill-phone] applied to ${applied} patient(s): ${normalized} normalized, ${review} need review` +
          (skipped > 0 ? ` — ${skipped} skipped (edited concurrently, their own values kept)` : ""),
      );
    } else {
      console.log("[backfill-phone] nothing to do");
    }
  } catch (err) {
    // الفشل لا يُسقط الخادم ولا يمنع أي عمل: الصفوف غير المعالَجة تبقى
    // phone_status = NULL، وهي تُقرأ كـ«يحتاج مراجعة» في كل مكان، وتُلتقط
    // في التشغيل التالي.
    console.error("[backfill-phone] failed (service unaffected):", err);
  }
}
