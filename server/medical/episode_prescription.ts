// **مواصفاتُ الجهاز من معاينته هو** — تعريفٌ واحد لا يتكرّر (المرحلة الثانية
// من قطار الإصلاح، تدقيق ٢٠٢٦-٠٩-١٢: MULTI-2).
//
// ══ العطبُ الذي يغلقه ═══════════════════════════════════════════════════
// وصفةُ الطبيب تُكتب عند كلّ توقيعٍ على **أعمدة صفّ المريض الواحدة**
// (`applyPrescription` ⟶ `patients.foot_type`/`prosthetic_type`/`injury_side`/
// `amputation_site`…)، وكانت كلُّ قراءةٍ تصنيعية — صفحةُ الأمر، قائمةُ
// الأوامر، ولقطةُ `patient_cases.details` لحظةَ البيع — تقرأ تلك الأعمدة.
// فمريضٌ بجهازين (ترحيل ٠٧٣ أجاز ذلك): معاينةُ الجهاز B تكتب فوق الأعمدة،
// فيقرأ الخبيرُ على أمر الجهاز A مواصفاتِ B. **الحقيقةُ لكلّ جهازٍ تعيش في
// معاينته المختومة** (`medical_exams.prescription` بـ`device_episode_id`)،
// وهذا الملفُّ يقرؤها من هناك وحدها.
//
// ══ القاعدة ═══════════════════════════════════════════════════════════
// أحدثُ معاينةٍ **فعّالة** (بلا شاهدة إلغاء — `activeExamSql`) على الحلقة
// بعينها. والتحريرُ (ترحيل ٠٣٠) يكتب على الصفّ نفسِه بنسخةٍ محفوظة، فتصحيحٌ
// سريريٌّ لاحق للجهاز A يظهر على أمر A — ولا يمسّ B. وحلقةٌ بلا معاينةٍ
// فعّالة تعود `null` فيبقى للمنادي مخرجُ الأعمدة القديم (أمرٌ موروثٌ بلا
// هويّة جهاز) **مُعلَناً مصدرَه** لا مختلطاً.

import { sql } from "drizzle-orm";
import { db } from "../db";
import { activeExamSql } from "./active_exam";
import {
  PROSTHETIC_SPECS, SUPPORT_SPECS, buildAmputationSite, type AmputationParts,
} from "@shared/case_fields";

export type DeviceServiceType = "prosthetic" | "medical_support";

/** المعاينةُ الفعّالة الحاكمة لحلقةٍ بعينها — أو `null`. */
export interface EpisodeExam {
  examId: number;
  signedAt: string | null;
  doctorName: string | null;
  prescription: Record<string, unknown>;
}

/** مواصفاتُ جهازٍ كما تُعرَض وتُلتقَط: مفاتيحُ الوصفة + الجهةُ + موقعُ البتر المركَّب. */
export type DeviceSpecs = Record<string, string>;

type Executor = { execute: (q: any) => Promise<any> };

/**
 * أحدثُ معاينةٍ فعّالة على الحلقة — **بمعاملة المنادي** إن مرّرها، فتُقرأ
 * داخل معاملة البيع بالاتّساق نفسِه الذي تُقرأ به الحلقةُ المقفولة.
 */
export async function effectiveExamForEpisode(
  episodeId: number,
  executor: Executor = db,
): Promise<EpisodeExam | null> {
  const r = await executor.execute(sql`
    SELECT me.id, me.signed_at, me.doctor_name, me.prescription
      FROM medical_exams me
     WHERE me.device_episode_id = ${episodeId}
       AND ${activeExamSql("me")}
     ORDER BY me.signed_at DESC, me.id DESC
     LIMIT 1
  `);
  const row = (r.rows ?? [])[0];
  if (!row) return null;
  const rx = row.prescription;
  return {
    examId: Number(row.id),
    signedAt: row.signed_at ? new Date(row.signed_at).toISOString() : null,
    doctorName: row.doctor_name ? String(row.doctor_name) : null,
    prescription: rx && typeof rx === "object" && !Array.isArray(rx)
      ? (rx as Record<string, unknown>) : {},
  };
}

/**
 * الوصفةُ ⟶ مواصفاتُ الجهاز. **نقيّةٌ بلا قاعدة**: مفاتيحُ الاختصاص
 * (`PROSTHETIC_SPECS`/`SUPPORT_SPECS` — القائمةُ القانونية نفسُها التي يقرؤها
 * التخصيصُ والوصفة)، وجهةُ الإصابة، وللأطراف موقعُ البتر مركَّباً بـ
 * `buildAmputationSite` **بالصيغة البايتية نفسِها** التي تكتبها `applyPrescription`
 * على صفّ المريض. الفارغُ لا يُكتب — الوصفةُ لا تقول «امسح».
 */
export function deviceSpecsFromPrescription(
  serviceType: DeviceServiceType,
  prescription: Record<string, unknown> | null | undefined,
): DeviceSpecs {
  const rx = prescription && typeof prescription === "object" ? prescription : {};
  const out: DeviceSpecs = {};
  const put = (key: string, value: unknown) => {
    if (typeof value === "string" && value.trim()) out[key] = value.trim();
  };
  const fields = serviceType === "prosthetic" ? PROSTHETIC_SPECS : SUPPORT_SPECS;
  for (const f of fields) put(f.key, rx[f.key]);
  put("injurySide", rx.injurySide);
  if (serviceType === "prosthetic") {
    const site = buildAmputationSite(rx as AmputationParts);
    if (site) out.amputationSite = site;
  }
  return out;
}

/**
 * **ووصفةٌ لا تقول شيئاً عن الجهاز ليست حقيقةً عنه.** معاينةٌ فعّالة بوصفةٍ
 * خاليةٍ من كلّ مفاتيح الاختصاص (كُتب تشخيصُها نصّاً، أو وُقّعت قبل أن يُملأ
 * حقلٌ واحد) تترك الأمرَ بلا مواصفاتٍ إطلاقاً: فإخفاءُ أعمدة الملفّ حينها
 * يمحو من شاشة الخبير ما كان يقرؤه، ولقطةُ البيع تخرج فارغة. فيُقال «من ملفّ
 * المريض» بصدق — وهو الحقيقةُ الوحيدة المتاحة حينئذٍ.
 *
 * **ولا خلطَ بين المصدرين**: مفتاحٌ واحد يكفي ليصير الجهازُ هو المصدرَ، وما
 * لم تقله وصفتُه يبقى فارغاً **لا مستعاراً** من عمودٍ كتبه جهازٌ آخر — وذاك
 * هو العطبُ الذي أُغلق.
 */
export function hasAnySpec(specs: DeviceSpecs): boolean {
  return Object.keys(specs).length > 0;
}

/** ما يُعرَض على أمر التصنيع — مصدرُه مُعلَنٌ دائماً. */
export type OrderDeviceSpecs =
  | { source: "exam"; examId: number; signedAt: string | null; doctorName: string | null; specs: DeviceSpecs }
  | { source: "patient_file" };

/**
 * مواصفاتُ الجهاز لأمرٍ ما: من معاينة حلقته إن وُجدت، وإلّا **يُقال**
 * إنها من ملفّ المريض (أمرٌ موروثٌ بلا هويّة جهاز، أو حلقةٌ بلا معاينةٍ
 * فعّالة) — لا يُخلَط المصدران بصمت.
 */
export async function orderDeviceSpecs(
  deviceEpisodeId: number | null,
  serviceType: DeviceServiceType,
  executor: Executor = db,
): Promise<OrderDeviceSpecs> {
  if (deviceEpisodeId === null) return { source: "patient_file" };
  const exam = await effectiveExamForEpisode(deviceEpisodeId, executor);
  if (!exam) return { source: "patient_file" };
  const specs = deviceSpecsFromPrescription(serviceType, exam.prescription);
  if (!hasAnySpec(specs)) return { source: "patient_file" };
  return {
    source: "exam",
    examId: exam.examId,
    signedAt: exam.signedAt,
    doctorName: exam.doctorName,
    specs,
  };
}
