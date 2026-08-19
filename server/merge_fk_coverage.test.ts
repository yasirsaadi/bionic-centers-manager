// سلك تعثّر (tripwire) على اكتمال قائمة الدمج.
// يحتاج قاعدة محلية: `npm run test:merge-fk-coverage`.
//
// ── لماذا يوجد ─────────────────────────────────────────────────────────────
// وقعت العلّة نفسها مرّتين: جدول جديد يحمل مفتاحاً أجنبياً إلى `patients`
// أو `patient_cases`، و`mergePatients` لا يعلم به — فيسقط الدمج على
// المفتاح، أو (أسوأ) يترك صفوفاً معلّقة. آخرها `medical_exams` التي جعلت
// دمج أي مريض سبق أن فُحِص يفشل كلّياً.
//
// المراجعة البشرية لا تمسك هذا: كاتب الترحيل يفكّر في جدوله هو، لا في
// دالّة دمج في ملفّ آخر. فالحارس هنا يقرأ **فهرس Postgres نفسه** ويقارن كل
// مفتاح موجود فعلاً بقائمة القرارات المعلَنة أدناه.
//
// ── ما لا يفعله عمداً ─────────────────────────────────────────────────────
// لا ينفّذ دمجاً لكل جدول ولا يتحقّق من صحّة القرار. هو سؤال واحد:
// «هل اتُّخذ قرار صريح بشأن هذا المفتاح؟» فإجابته «لا» تعني أن أحدهم أضاف
// جدولاً ونسي الدمج. الصواب يبقى مسؤولية المراجع؛ هذا يضمن ألّا يمرّ
// السؤال بلا طرح.
//
// ── وهو ثنائي الاتجاه ─────────────────────────────────────────────────────
// مفتاح في القاعدة بلا قرار ⇒ فشل (جدول جديد نُسي).
// قرار في القائمة بلا مفتاح في القاعدة ⇒ فشل أيضاً (قائمة متعفّنة تعطي
// طمأنينة كاذبة عن جدول لم يعد موجوداً).

import { pool } from "./db";

// Safety: read-only, but keep the same guard as the rest of the DB tests.
const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database (must contain 'test' or a local host).");
  process.exit(1);
}

/**
 * القرار المتَّخذ في `storage.mergePatients` لكل مفتاح أجنبي.
 * المفتاح: "الجدول.العمود" · القيمة: ما يفعله الدمج به.
 *
 * إضافة جدول جديد هنا **بلا** تعديل `mergePatients` غشٌّ للحارس — لكن
 * كتابة السطر تُجبر الكاتب على النظر في الدالّة، وهو كل المطلوب.
 */
const MERGE_DECISIONS: Record<string, string> = {
  // ── تشير إلى patients.id ───────────────────────────────────────────────
  "visits.patient_id": "repoint إلى الملف الهدف",
  "payments.patient_id": "repoint إلى الملف الهدف",
  "documents.patient_id": "repoint إلى الملف الهدف",
  "invoices.patient_id": "repoint إلى الملف الهدف",
  "installment_plans.patient_id": "repoint إلى الملف الهدف",
  "follow_up_calls.patient_id": "repoint إلى الملف الهدف",
  "prosthetic_work_orders.patient_id": "repoint إلى الملف الهدف",
  "treatment_plans.patient_id": "repoint إلى الملف الهدف",
  "survey_responses.patient_id": "repoint إلى الملف الهدف",
  "journal_lines.patient_id": "repoint إلى الملف الهدف (تاريخ محاسبي)",
  "cost_entries.patient_id": "repoint — دفتر الكلف المؤرَّخ يتبع المريض",
  "patient_events.patient_id": "repoint داخل باب الختم، مع إفراغ dedupe_key المتصادم",
  "medical_exams.patient_id": "repoint داخل باب الختم — إعادة ربط إدارية بلا مساس سريري",
  "patient_cases.patient_id": "طيّ حالات المصدر في الهدف ثم حذف صفوف المصدر",
  "patient_link_tokens.patient_id": "repoint — البصمة فريدة عالمياً فلا تتصادم",
  "patient_contacts.patient_id": "ختم جهة المصدر المتصادمة ثم repoint — نشِطٌ واحد والتاريخ محفوظ",
  "patient_notification_deliveries.patient_id": "repoint — الصادر يتبع المريض، ولا تصادم فيه",

  "patient_device_episodes.patient_id": "repoint إلى الملف الهدف مع إعادة الترقيم",

  //  الهوية العلنية (ترحيل ٠٥٢): أسماء المصدر البديلة تُنقل، **ورمزُ المصدر
  //  نفسه يُضاف اسماً بديلاً** — فورقةٌ بيد المريض أو رسالةُ تلغرام تحمل
  //  الرمز القديم تبقى تدلّ على الملفّ الباقي. والهدف يحتفظ برمزه.
  "patient_code_aliases.patient_id": "repoint + إضافة رمز المصدر اسماً بديلاً للهدف",

  //  متابعةُ ما بعد المعاينة (ترحيل ٠٥٣). التصادم مشروع — كلا الملفّين قد
  //  يحمل متابعةً حيّةً للخدمة نفسها — فمتابعة المصدر تُغلق قبل نقلها،
  //  تماماً كجهة اتصال المصدر. والتاريخ ينتقل كاملاً.
  "post_exam_followups.patient_id": "إغلاق متابعة المصدر المتصادمة ثم repoint — حيّةٌ واحدة والتاريخ محفوظ",
  "post_exam_followup_events.patient_id": "repoint — التاريخ يتبع المريض بلا تصادم",
  "price_change_requests.patient_id": "repoint — الطلبات تتبع المريض بلا تصادم",

  //  مراجعةُ الطبيب (ترحيل ٠٥٥). التصادم الوحيد الممكن هو الطلب المعلَّق بلا
  //  مرساة: `uq_mrr_pending_bare` معلَّقٌ واحد لكل (مريض، اختصاص). فطلب
  //  المصدر يُعاد إلى الاستقبال قبل نقله، والتاريخ ينتقل كاملاً.
  "medical_review_requests.patient_id": "إعادة طلب المصدر المعلَّق المتصادم ثم repoint — معلَّقٌ واحد والتاريخ محفوظ",

  //  طلباتُ الخصم والتبرّع (ترحيل ٠٥٨). نفسُ نمط المتابعة والمراجعة:
  //  `uq_sdr_one_pending` معلَّقٌ واحدٌ لكل (مريض، قسم، مرجع)، فطلبُ المصدر
  //  المتصادم يُلغى قبل نقله، والتاريخ ينتقل كاملاً.
  "service_discount_requests.patient_id": "إلغاء طلب المصدر المعلَّق المتصادم ثم repoint — معلَّقٌ واحد والتاريخ محفوظ",

  // ── تشير إلى patient_cases.id ─────────────────────────────────────────
  "visits.case_id": "remap من حالة المصدر إلى حالة الهدف",
  "payments.case_id": "remap من حالة المصدر إلى حالة الهدف",
  "medical_exams.case_id": "remap مقيَّد بـ patient_id للمصدر، داخل باب الختم",
  "patient_device_episodes.case_id": "remap إلى حالة الهدف من النوع نفسه + إعادة ترقيم التسلسل",
  "post_exam_followups.case_id": "remap من حالة المصدر إلى حالة الهدف",
  //  دفترُ الكلف (ترحيل ٠٥٦): القسمُ هو نوعُ الحالة، فالقيدُ يُرمَّم إليها
  //  **قبل** حذف حالات المصدر — و`ON DELETE SET NULL` شبكةُ أمانٍ لا خطّة.
  "cost_entries.case_id": "remap مقيَّد بـ patient_id للمصدر إلى حالة الهدف، قبل الحذف",
  "medical_review_requests.case_id": "remap مقيَّد بـ patient_id للمصدر إلى حالة الهدف",

  // ── تشير إلى patient_device_episodes.id (migration 049) ────────────────
  // الحلقة تُنقَل **بمعرّفها** فلا يتغيّر `id`، ولذلك لا يحتاج أيٌّ من هذه
  // الأربعة لمسة واحدة في الدمج. والقرار معلَن هنا كي لا يظنّ قارئٌ لاحقاً
  // أنها نُسيت — «لا شيء» قرارٌ حين يُكتب، وسهوٌ حين يُسكت عنه.
  "prosthetic_work_orders.device_episode_id": "لا شيء — الحلقة تُنقَل بمعرّفها فلا يتغيّر",
  "cost_entries.device_episode_id": "لا شيء — الحلقة تُنقَل بمعرّفها فلا يتغيّر",
  "payments.device_episode_id": "لا شيء — الحلقة تُنقَل بمعرّفها فلا يتغيّر",
  "visits.device_episode_id": "لا شيء — الحلقة تُنقَل بمعرّفها فلا يتغيّر",
  "post_exam_followups.device_episode_id": "لا شيء — الحلقة تُنقَل بمعرّفها فلا يتغيّر",
  "medical_review_requests.device_episode_id": "لا شيء — الحلقة تُنقَل بمعرّفها فلا يتغيّر",
};

// و`medical_exams.device_episode_id` ليس مفتاحاً أجنبياً عمداً (لقطةُ رقم،
// لأن الجدول مختوم بترِكر يرفض `ON DELETE SET NULL`) — فلا يظهر في فهرس
// Postgres ولا يُذكَر أعلاه. وهو لا يحتاج نقلاً للسبب نفسه: المعرّف ثابت.

const PARENTS = ["patients", "patient_cases", "patient_device_episodes"];

let failures = 0;
function fail(msg: string) { failures++; console.log(`❌ FAIL  ${msg}`); }
function pass(msg: string) { console.log(`✅  ${msg}`); }

async function main() {
  const { rows } = await pool.query<{ parent: string; child: string; column: string; constraint: string }>(
    `SELECT tgt.relname AS parent, src.relname AS child, a.attname AS column, c.conname AS constraint
       FROM pg_constraint c
       JOIN pg_class src ON src.oid = c.conrelid
       JOIN pg_class tgt ON tgt.oid = c.confrelid
       JOIN unnest(c.conkey) AS k(attnum) ON true
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
      WHERE c.contype = 'f' AND tgt.relname = ANY($1)
      ORDER BY tgt.relname, src.relname, a.attname`,
    [PARENTS],
  );

  if (rows.length === 0) {
    console.error("❌ لم يُعثر على أي مفتاح أجنبي — هل شُغّلت ترحيلات المشروع على قاعدة الاختبار؟");
    await pool.end();
    process.exit(1);
  }
  pass(`قُرئ فهرس Postgres: ${rows.length} مفتاحاً أجنبياً إلى ${PARENTS.join(" و ")}`);

  console.log("\n── كل مفتاح في القاعدة له قرار معلَن ──");
  const found = new Set<string>();
  for (const r of rows) {
    const key = `${r.child}.${r.column}`;
    found.add(key);
    if (MERGE_DECISIONS[key]) {
      pass(`${r.parent} ← ${key} — ${MERGE_DECISIONS[key]}`);
    } else {
      fail(
        `${r.parent} ← ${key} بلا قرار في الدمج.\n` +
        `      جدول جديد يشير إلى ${r.parent} أُضيف بلا تحديث storage.mergePatients.\n` +
        `      اتّخذ قراراً صريحاً (repoint / حذف / تجاهل) ثم أضف السطر إلى\n` +
        `      MERGE_DECISIONS في server/merge_fk_coverage.test.ts.\n` +
        `      القيد: ${r.constraint}`,
      );
    }
  }

  console.log("\n── ولا قرار متعفّن لمفتاح لم يعد موجوداً ──");
  const stale = Object.keys(MERGE_DECISIONS).filter((k) => !found.has(k));
  if (stale.length === 0) {
    pass("كل القرارات المعلَنة تقابل مفاتيح قائمة");
  } else {
    fail(
      `قرارات لمفاتيح غير موجودة: ${stale.join("، ")}\n` +
      `      إمّا حُذف الجدول أو أُزيل مفتاحه — احذف السطر من MERGE_DECISIONS\n` +
      `      كي لا تعطي القائمة طمأنينة كاذبة.`,
    );
  }

  // تذكير صريح: هذا حارس تغيّر مخطّط، لا اختبار صحّة.
  console.log(
    "\nℹ  هذا الحارس يسأل «هل اتُّخذ قرار؟» لا «هل القرار صحيح؟».\n" +
    "   صحّة السلوك يغطّيها test:merge-exams و test:patient-events.",
  );

  console.log(failures === 0 ? "\n✅ all merge-fk-coverage cases pass" : `\n❌ ${failures} case(s) failed`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
