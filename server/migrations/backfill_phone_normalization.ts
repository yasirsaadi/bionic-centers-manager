// تعبئة رجعية لأعمدة رقم الاتصال المطبَّع (migration 043).
//
// تُنفَّذ بـTypeScript لا بـSQL عمداً: قواعد التطبيع مكتوبة ومُختبَرة مرّة
// واحدة في `shared/phone.ts`، وكتابتها ثانيةً بـregex داخل SQL كانت
// ستُنشئ نسخة توأماً تنحرف عن الأصل بصمت مع أول تعديل على القواعد.
// فالقاعدة والتطبيق الحيّ يقرآن من الدالّة نفسها.
//
// ثلاث خصائص تجعلها آمنة:
//   1. **لا تلمس `phone` إطلاقاً** — الأصل الذي كتبه الإنسان لا يُمسّ.
//      تكتب الأعمدة الثلاثة المشتقّة فقط.
//   2. **مستأنِفة بلا مؤشّر** — الشرط `phone_status IS NULL` هو المؤشّر
//      نفسه: كل صفّ يُعالَج يخرج من مجموعة العمل. فإعادة النشر في منتصف
//      العمل (SIGTERM من Render) تُكمل من حيث توقّفت، وإعادة تشغيلها بعد
//      اكتمالها لا تفعل شيئاً.
//   3. **ما لا يُفسَّر يصير `needs_review`** — ولا يُخترع له رقم. رقم من
//      ثمانية أرقام أو نصّ مثل «هاتف الجار» يبقى كما هو في `phone`،
//      و`phone_e164` فارغاً، فيظهر في قائمة التنظيف للمدير.

import { pool } from "../db";
import { normalizePhone } from "@shared/phone";

const BATCH = 500;

export async function backfillPhoneNormalization(): Promise<void> {
  try {
    let scanned = 0;
    let normalized = 0;
    let review = 0;

    for (;;) {
      const { rows } = await pool.query<{ id: number; phone: string | null }>(
        `SELECT id, phone FROM patients WHERE phone_status IS NULL ORDER BY id LIMIT $1`,
        [BATCH],
      );
      if (rows.length === 0) break;

      // جملة واحدة لكل دفعة بدل جملة لكل صفّ — أقلّ ذهاباً وإياباً إلى Neon.
      const ids: number[] = [];
      const e164s: (string | null)[] = [];
      const countries: (string | null)[] = [];
      const statuses: string[] = [];

      for (const r of rows) {
        const n = normalizePhone(r.phone);
        ids.push(r.id);
        e164s.push(n.e164);
        countries.push(n.country);
        statuses.push(n.status);
        if (n.ok) normalized++; else review++;
      }

      await pool.query(
        `UPDATE patients p
            SET phone_e164    = v.e164,
                phone_country = v.country,
                phone_status  = v.status
           FROM (
             SELECT * FROM UNNEST($1::int[], $2::text[], $3::text[], $4::text[])
               AS t(id, e164, country, status)
           ) AS v
          WHERE p.id = v.id`,
        [ids, e164s, countries, statuses],
      );

      scanned += rows.length;
      if (rows.length < BATCH) break;
    }

    if (scanned > 0) {
      console.log(
        `[backfill-phone] processed ${scanned} patient(s): ${normalized} normalized, ${review} need review`,
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
