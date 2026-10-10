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
  PROSTHETIC_DEVICE_SPECS, SUPPORT_SPECS, buildAmputationSite, type AmputationParts,
} from "@shared/case_fields";
import { mergeDeviceSpecs } from "@shared/device_specs";
import { LIMB_SIDES, LIMB_SPEC_KEYS, sideSpecKey } from "@shared/limb_specs";

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
  caseType?: DeviceServiceType,
): Promise<EpisodeExam | null> {
  //  **واختصاصُ المعاينة يُطابَق حين يُعرَف**: صفٌّ مسندٍ يحمل معرّفَ حلقةِ
  //  أطراف بياناتٌ فاسدة (لا بابَ حيّاً يُنتجها — `claimAwaitingEpisodeForExam`
  //  يربط بالخيط)، لكنّه لو وُجد لصار «معاينةَ الحلقة» فتخرج مواصفاتُها خاليةً
  //  ويسقط الأمرُ إلى ملفّ المريض بينما معاينتُه الصحيحة قائمة. فيُستبعَد.
  const r = await executor.execute(sql`
    SELECT me.id, me.signed_at, me.doctor_name, me.prescription
      FROM medical_exams me
     WHERE me.device_episode_id = ${episodeId}
       ${caseType ? sql`AND me.case_type = ${caseType}` : sql``}
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
  //  **مواصفاتُ الجهاز** — ومعها نوعُ السوكيت (§4.cq)، وهو في الوصفة لا على صفّ المريض.
  const fields = serviceType === "prosthetic" ? PROSTHETIC_DEVICE_SPECS : SUPPORT_SPECS;
  for (const f of fields) put(f.key, rx[f.key]);
  put("injurySide", rx.injurySide);
  if (serviceType === "prosthetic") {
    //  **ولمبتور الطرفين مواصفاتُ كلّ جهة** (§4.de) — `footType:right` بجانب العامّ، ويقرؤها `limbSpecView`.
    for (const k of LIMB_SPEC_KEYS) for (const sd of LIMB_SIDES) put(sideSpecKey(k, sd), rx[sideSpecKey(k, sd)]);
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

/** خاناتُ الجهاز المحفوظةُ على الحلقة عند «اشترى» (ترحيل ١١٥) — `{}` حين لا شيء. */
export async function storedEpisodeSpecs(episodeId: number, executor: Executor = db): Promise<Record<string, unknown>> {
  const r = await executor.execute(sql`SELECT device_specs FROM patient_device_episodes WHERE id = ${episodeId}`);
  const v = (r.rows ?? [])[0]?.device_specs;
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** ما يُعرَض على أمر التصنيع — مصدرُه مُعلَنٌ دائماً. */
export type OrderDeviceSpecs =
  | { source: "exam"; examId: number; signedAt: string | null; doctorName: string | null; specs: DeviceSpecs;
      /** خاناتٌ تركها الطبيبُ فملأها الاستعلاماتُ عند «اشترى» (§4.cq) — تُعرَض بمصدرها. */
      filledAtSale: string[] }
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
  const exam = await effectiveExamForEpisode(deviceEpisodeId, executor, serviceType);
  if (!exam) return { source: "patient_file" };
  //  **وما ملأه الاستعلاماتُ عند «اشترى» يسدّ ما تركه الطبيب** (§4.cq) — والوصفةُ تغلب، ويُقال أيُّها من البيع.
  const fromExam = deviceSpecsFromPrescription(serviceType, exam.prescription);
  const specs = mergeDeviceSpecs(fromExam, await storedEpisodeSpecs(deviceEpisodeId, executor));
  if (!hasAnySpec(specs)) return { source: "patient_file" };
  const filledAtSale = Object.keys(specs).filter((k) => !(k in fromExam));
  return {
    source: "exam",
    examId: exam.examId,
    signedAt: exam.signedAt,
    doctorName: exam.doctorName,
    specs,
    filledAtSale,
  };
}

/** جهازٌ مَبيعٌ في خيطه بمواصفاته — `specs = null` حين لا معاينةَ تقول شيئاً عنه (موروثٌ أو جزءٌ بلا معاينة). */
export interface CaseDeviceSpecsRow {
  episodeId: number;
  sequenceNumber: number;
  status: string;
  requestedItem: string;
  specs: DeviceSpecs | null;
}

/**
 * **مواصفاتُ كلّ جهازٍ مَبيع في خيطه — من معاينته هو** (§4.q «مرحلةٌ لاحقة»، المالك ٢٠٢٦-١٠-٠٥).
 * `patient_cases.details` صفٌّ واحد للخيط: بيعُ الجهاز B يكتب فوق لقطة A، فتعرض بطاقةُ القسم مواصفاتِ B على مريضٍ أمرُ A
 * ما زال يُصنَع. فلكلّ خيطٍ أجهزتُه المبيعة (`in_manufacturing`/`delivered`) بترتيبها، ولكلّ جهازٍ مواصفاتُ أحدث معاينةٍ
 * فعّالة **على حلقته بعينها** — القاعدةُ نفسُها التي يقرأ بها أمرُ التصنيع (`orderDeviceSpecs`). قراءةٌ محضة، بلا كتابة.
 */
export async function caseDeviceSpecs(
  caseIds: number[],
  executor: Executor = db,
): Promise<Map<number, CaseDeviceSpecsRow[]>> {
  const out = new Map<number, CaseDeviceSpecsRow[]>();
  if (!caseIds.length) return out;
  const r = await executor.execute(sql`
    SELECT e.id, e.case_id, e.sequence_number, e.status, e.requested_item, e.device_specs, pc.case_type, ex.prescription
      FROM patient_device_episodes e
      JOIN patient_cases pc ON pc.id = e.case_id
      LEFT JOIN LATERAL (
        SELECT me.prescription FROM medical_exams me
         WHERE me.device_episode_id = e.id AND me.case_type = pc.case_type AND ${activeExamSql("me")}
         ORDER BY me.signed_at DESC, me.id DESC LIMIT 1
      ) ex ON TRUE
     WHERE e.case_id IN (${sql.join(caseIds.map((id) => sql`${id}`), sql`, `)})
       AND e.status IN ('in_manufacturing', 'delivered')
       AND pc.case_type IN ('prosthetic', 'medical_support')
     ORDER BY e.case_id, e.sequence_number, e.id`);
  for (const row of (r.rows ?? []) as any[]) {
    const rx = row.prescription && typeof row.prescription === "object" && !Array.isArray(row.prescription)
      ? row.prescription as Record<string, unknown> : null;
    //  الوصفةُ أوّلاً، وما ملأه الاستعلاماتُ عند «اشترى» يسدّ فراغَها (§4.cq).
    const specs = rx ? mergeDeviceSpecs(deviceSpecsFromPrescription(row.case_type as DeviceServiceType, rx), row.device_specs) : null;
    const list = out.get(Number(row.case_id)) ?? [];
    list.push({
      episodeId: Number(row.id), sequenceNumber: Number(row.sequence_number), status: String(row.status),
      requestedItem: String(row.requested_item ?? "full_device"),
      specs: specs && hasAnySpec(specs) ? specs : null,
    });
    out.set(Number(row.case_id), list);
  }
  return out;
}
