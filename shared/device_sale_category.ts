//  **ماذا بِيع بالضبط؟** — تصنيفُ بيعةِ جهازٍ واحدة، **دالّةٌ خالصة**.
//
//  ══ العطبُ الذي تغلقه ═══════════════════════════════════════════════════
//  كانت `device_sales_summary` تُرجع **عدداً إجمالياً واحداً** للأطراف
//  الصناعية الكاملة وحدها. فسؤالُ المالك «كم إصبعاً سليكونياً بِيع؟» —
//  وهو تصنيفٌ حقيقيّ داخل «اطراف سليكونية تعويضية» — لا جوابَ له، فيعتذر
//  المساعد عن رقمٍ موجودٍ في القاعدة. وكذلك كلُّ سؤالٍ عن **جزءٍ** بِيع
//  (قالب · ركبة · قدم …) أو عن **مسندٍ طبيّ**: الأوّلُ كان يُستبعَد بشرط
//  `requested_item = 'full_device'`، والثاني بشرط `service_type = 'prosthetic'`.
//
//  ══ ولماذا دالّةٌ خالصة لا SQL ثانية ════════════════════════════════════
//  قاعدةُ «مواصفاتُ الجهاز من معاينته هو» تعيش في
//  `server/medical/episode_prescription.ts` (القسم ٤.q)، **ولا تُكتَب بـSQL
//  ثانيةً فتنحرف عنه**. فالاستعلامُ يجلب الوصفةَ خامّاً، والتصنيفُ يقع هنا —
//  يُختبَر دخلاً وخرجاً، ولا يُقرأ بنصِّه (درسُ ٤.u).
//
//  ══ والمعاجمُ قانونيةٌ لا ثانية ═════════════════════════════════════════
//  `COMPONENT_LABELS` و`FULL_DEVICE_LABELS` و`AMPUTATION_TYPE_OPTIONS` و
//  `SILICONE_PARTS` — كلُّها من مصادرها، فلا يسمّي هذا الملفُّ قطعةً باسمٍ
//  لا يعرفه بقيّةُ النظام.
//
//  ══ **ولا يُخمَّن تصنيفٌ أبداً** ═════════════════════════════════════════
//  حلقةٌ بلا معاينةٍ فعّالة، أو وصفةٌ لم يُلمَس فيها بانيَ البتر، تُصنَّف
//  «نوعٌ غير مسجَّل» **صراحةً** — لا تُنسَب إلى «احادي» لأنه الأشيع، ولا
//  تُسقَط من العدّ فيَنقص المجموع بلا أن يعلم أحد.

import {
  COMPONENT_LABELS, FULL_DEVICE, FULL_DEVICE_LABELS, isDeviceServiceKind,
  isProstheticComponent, type DeviceServiceKind,
} from "./prosthetic_parts";
import { AMPUTATION_TYPE_OPTIONS } from "./case_fields";

/** وقائعُ بيعةٍ واحدة كما تخرج من القاعدة — بلا نصٍّ حرّ. */
export interface DeviceSaleFacts {
  /** `prosthetic_work_orders.service_type` */
  serviceType: unknown;
  /** `patient_device_episodes.requested_item` */
  requestedItem: unknown;
  /**
   * وصفةُ **المعاينة الفعّالة لهذه الحلقة بعينها** (بلا شاهدة إلغاء) —
   * أو `null` لحلقةٍ بلا معاينة. **لا أعمدةَ صفّ المريض**: تلك واحدةٌ
   * لكلّ مريض، ومريضٌ بجهازين يقرأ عليها جهازُه الأوّل مواصفاتِ الثاني —
   * وهو العطبُ الذي أُغلق في القسم ٤.q.
   */
  prescription: Record<string, unknown> | null | undefined;
}

/** صنفٌ واحد — مفتاحٌ ثابتٌ للتجميع وعنوانٌ عربيّ للقراءة. */
export interface DeviceSaleCategory {
  /** مفتاحٌ ثابت يُجمَع به، مستقرٌّ عبر النسخ. */
  key: string;
  /** عنوانٌ عربيّ كما ينطقه الفرع. */
  label: string;
  /** القسم — أطرافٌ أو مساند، أو `null` لما لا يُعرَف. */
  serviceType: DeviceServiceKind | null;
  /** جهازٌ كامل أم جزءٌ منه. */
  scope: "full" | "part" | "unknown";
  /**
   * نوعُ البتر للأطراف الكاملة: `single` · `double` · `silicone` ·
   * `unrecorded` (لا وصفةَ أو لم يُلمَس البانِي). و`null` لغيرها.
   */
  amputationType: "single" | "double" | "silicone" | "unrecorded" | null;
  /** جزءُ الطرف السليكونيّ («اصبع» · «اذن» …) — حين يُعرَف وحده. */
  siliconePart: string | null;
}

const AMPUTATION_LABEL: Record<string, string> = Object.fromEntries(
  AMPUTATION_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

/** عنوانُ «طرف صناعي كامل» / «مسند طبي كامل» — من المعجم القانونيّ. */
const fullLabel = (t: DeviceServiceKind) => FULL_DEVICE_LABELS[t];

/** النصُّ المقلَّم أو `null` — لا سلسلةٌ فارغة تُقرأ قيمة. */
function text(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/**
 * بيعةٌ واحدة ⟶ صنفُها.
 *
 * **أربعةُ فروعٍ لا خامس**، بالترتيب:
 *  ① أطرافٌ + جهازٌ كامل ⟶ يُفصَّل بنوع البتر، والسليكونيُّ بجزئه.
 *  ② أطرافٌ + جزءٌ من الثمانية ⟶ باسم الجزء.
 *  ③ مساندُ + جهازٌ كامل ⟶ «مسند طبي كامل».
 *  ④ ما عدا ذلك ⟶ «غير مصنّف» صراحةً. (لا جزءَ للمساند أصلاً —
 *     `noExamSaleRefusal` تردّه — فصفٌّ كهذا بياناتٌ فاسدة تُقال ولا تُخمَّن.)
 */
export function classifyDeviceSale(f: DeviceSaleFacts): DeviceSaleCategory {
  const service = isDeviceServiceKind(f.serviceType) ? f.serviceType : null;
  const item = f.requestedItem;
  const rx = f.prescription && typeof f.prescription === "object" && !Array.isArray(f.prescription)
    ? (f.prescription as Record<string, unknown>) : null;

  if (service === "prosthetic" && item === FULL_DEVICE) {
    const raw = rx ? text(rx.amputationType) : null;
    const known = raw === "single" || raw === "double" || raw === "silicone" ? raw : null;

    if (known === "silicone") {
      const part = rx ? text(rx.siliconePart) : null;
      return {
        key: part ? `prosthetic_full:silicone:${part}` : "prosthetic_full:silicone:unrecorded",
        label: part
          ? `${AMPUTATION_LABEL.silicone} — ${part}`
          //  سليكونيٌّ بلا جزء: النوعُ معلومٌ والجزءُ لا — يُقال كذلك.
          : `${AMPUTATION_LABEL.silicone} — جزءٌ غير مسجَّل`,
        serviceType: service, scope: "full", amputationType: "silicone", siliconePart: part,
      };
    }
    if (known) {
      return {
        key: `prosthetic_full:${known}`,
        label: `${fullLabel(service)} — ${AMPUTATION_LABEL[known]}`,
        serviceType: service, scope: "full", amputationType: known, siliconePart: null,
      };
    }
    //  **لا معاينةَ فعّالة، أو وصفةٌ لم تلمس بانيَ البتر** — يُقال ولا يُخمَّن.
    return {
      key: "prosthetic_full:unrecorded",
      label: `${fullLabel(service)} — نوعٌ غير مسجَّل`,
      serviceType: service, scope: "full", amputationType: "unrecorded", siliconePart: null,
    };
  }

  if (service === "prosthetic" && isProstheticComponent(item)) {
    return {
      key: `prosthetic_part:${item}`,
      label: COMPONENT_LABELS[item],
      serviceType: service, scope: "part", amputationType: null, siliconePart: null,
    };
  }

  if (service === "medical_support" && item === FULL_DEVICE) {
    return {
      key: "support_full",
      label: fullLabel(service),
      serviceType: service, scope: "full", amputationType: null, siliconePart: null,
    };
  }

  return {
    key: "unclassified",
    label: "غير مصنّف",
    serviceType: service, scope: "unknown", amputationType: null, siliconePart: null,
  };
}

/** صفُّ عدٍّ واحد في التفصيل. */
export interface DeviceSaleCategoryCount extends DeviceSaleCategory {
  sold: number;
}

/**
 * تجميعُ بيعاتٍ ⟶ صفوفُ تفصيل، **مرتّبةً بالأكثر مبيعاً ثمّ بالمفتاح**.
 *
 * والترتيبُ حتميّ: تساوي عددين لا يجعل الصفوفَ تتبادل بين نداءين، فلا
 * يقرأ النموذجُ ترتيباً يتغيّر بلا أن يتغيّر شيء.
 */
export function tallyDeviceSales(sales: DeviceSaleFacts[]): DeviceSaleCategoryCount[] {
  const by = new Map<string, DeviceSaleCategoryCount>();
  for (const s of sales) {
    const c = classifyDeviceSale(s);
    const row = by.get(c.key);
    if (row) row.sold += 1;
    else by.set(c.key, { ...c, sold: 1 });
  }
  return Array.from(by.values()).sort((a, b) => b.sold - a.sold || a.key.localeCompare(b.key));
}
