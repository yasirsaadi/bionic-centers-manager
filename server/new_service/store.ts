// «خدمة جديدة» — **الكتابةُ الواحدة التي يناديها البابان**.
//
// ══ لماذا خرجت من `routes.ts` ═══════════════════════════════════════════
// كانت هذه الكتابةُ كتلةً داخل النقطة: كلفةُ المريض، وكلفةُ الحالة، وقيدُ
// الدفتر، والزيارة، والدفعة، وخطّةُ الجلسات — كلُّها في جسم `POST
// /api/patients/:id/new-service`. وما دام البابُ واحداً كان ذلك مقبولاً.
//
// ثم صار للخدمة **بابان**: السعرُ الكامل يمضي فوراً، والمخفَّضُ ينتظر
// اعتماداً ثم يُنفَّذ. ولو نُسخ المنطقُ في مسار الاعتماد لصار للنظام
// حقيقتان ماليّتان: تُصلَح إحداهما يوماً وتبقى الأخرى — وهو بالضبط ما وقع
// في الصيانة قبل ٠٦٠. فالكتلةُ نُقلت كما هي إلى هنا، ونادَتها النقطةُ
// والاعتمادُ معاً.
//
// ══ والمعاملةُ تُمرَّر لا تُفتَح ═══════════════════════════════════════════
// اعتمادُ الخصم يجب أن ينتج **قرارَ الاعتماد والخدمةَ معاً أو لا شيء**:
// صفُّ خصمٍ يقول «معتمَد» بلا خدمةٍ وقعت كذبةٌ في الشاشة، وخدمةٌ وقعت بلا
// صفٍّ يفسّرها ثقبٌ في التدقيق. فمَن ينادي من داخل معاملةٍ يمرّرها، ومَن
// ينادي من نقطته يفتح معاملته هنا كما كانت النقطةُ تفعل.

import { db } from "../db";
import { storage } from "../storage";
import { logAudit } from "../accounting/ledger";
import { mergePhysioPlan, allocateApprovedCost } from "@shared/pricing";
import { NEW_SERVICE_DEPARTMENT, NEW_SERVICE_LABELS } from "@shared/service_taxonomy";

export { NEW_SERVICE_LABELS };

export class NewServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "NewServiceError";
    this.status = status;
  }
}

/** ما يُحوَّل إلى بابه الصحيح بدل أن يُنفَّذ هنا. */
export const NEW_SERVICE_REDIRECTS: Record<string, string> = {
  maintenance: "الصيانة تُسجَّل من «تسجيل زيارة» (زيارة صيانة) لتُقيَّد أجورها ويُفتح أمرها",
  new_prosthetic: "الطرف الجديد يمرّ عبر معاينة الطبيب ثم «تخصيص وإسناد خبير»",
  adjustment: "التعديل والضبط يُسجَّلان كزيارة صيانة من «تسجيل زيارة»",
};

export interface NewServiceEntry {
  treatmentType: string | null;
  sessionCount: number;
  cost: number;
}

export interface NewServiceResult {
  newTotalCost: number;
  openedPhysiotherapyCase: boolean;
  caseId: number | null;
}

/** تنقيةُ بنود الجلسات كما كانت النقطةُ تنقّيها حرفياً. */
export function normalizeEntries(raw: unknown): NewServiceEntry[] | null {
  return Array.isArray(raw)
    ? raw.map((e: any) => ({
      treatmentType: typeof e?.treatmentType === "string" && e.treatmentType ? e.treatmentType : null,
      sessionCount: Math.max(0, Math.floor(Number(e?.sessionCount) || 0)),
      cost: Math.max(0, Math.round(Number(e?.cost) || 0)),
    }))
    : null;
}

/**
 * تنفيذُ الخدمة — **الدالّةُ القانونية الوحيدة**.
 *
 * `serviceCost` هي الكلفةُ الفعلية: السعرُ الكامل في المسار المباشر،
 * **والسعرُ المعتمد** في مسار الخصم. ولا تعرف هذه الدالّةُ شيئاً عن الخصم
 * ولا عن الطابور — تكتب الخدمةَ بالمبلغ الذي وصلها.
 *
 * **والمجّانيُّ خدمةٌ حقيقية بقيمةٍ صفر**: الجلسةُ تُسجَّل بدفعةٍ مبلغُها صفر
 * موسومةٍ `is_free_sessions` — وهو المسارُ القائم نفسه الذي تسلكه الجلسةُ
 * المجّانية من نقطة الدفعات منذ زمن. فلا دينارَ ملفَّق، ولا جلسةٌ تضيع من
 * العدّاد.
 */
export async function executeNewService(params: {
  patientId: number;
  serviceType: string;
  serviceCost: number;
  entries: NewServiceEntry[] | null;
  notes?: string | null;
  paymentTreatmentType?: string | null;
  sessionCount?: number | null;
  /**
   * ما دفعه المريضُ الآن فعلاً — يُقصَر على الكلفة.
   *
   * **وفي مسار البنود (تصحيحٌ تشغيليّ — صدقُ الإيصال) لم يعد يُتجاهَل**:
   * كان المسار القديم يكتب حصّةَ كلفة كلّ بندٍ بوصفها دفعتَه — أي «خصمٌ
   * يعني قبضاً كاملاً» — فيظهر واردٌ لم يُقبَض فعلاً. الآن يُوزَّع **هذا
   * الحقلُ وحده**، تناسبياً على البنود، ومجموعُه هو المكتوب لا كلفتُها.
   */
  initialPayment?: number | null;
  /** تبرّعٌ معتمَد: الجلسةُ تُسجَّل بقيمةٍ صفر بدل أن تختفي. */
  isFree?: boolean;
  actor: { userId: number | null; userName: string | null };
  audit?: { ipAddress?: string | null; userAgent?: string | null };
  tx?: any;
}): Promise<NewServiceResult> {
  const serviceLabel = NEW_SERVICE_LABELS[params.serviceType];
  if (!serviceLabel) throw new NewServiceError("نوع الخدمة غير صالح", 400);
  const serviceCost = Math.max(0, Math.round(Number(params.serviceCost) || 0));
  const isFree = params.isFree === true;

  // ══ **الجهوزيةُ الماليةُ — بابٌ واحدٌ أخيرٌ قبل الكتابة** (تصحيحٌ
  //  تشغيليّ) ═══════════════════════════════════════════════════════════
  //  كان مبلغٌ غائبٌ أو صفريّ في `initialPayment` يُقرأ «لم يُقبَض شيءٌ
  //  الآن» بصمت — وهذا صحيحٌ كحقيقةِ دفع، لكنّ النافذةَ لم تكن تسأل
  //  الموظّفَ عن قصده: خدمةٌ حقيقيةٌ موجبةُ الكلفة كانت تُسجَّل ودَينُها
  //  كاملٌ **بلا أن يكتب أحدٌ رقماً ولا يقرّر ذلك عمداً** — لا فرقَ بين
  //  موظّفٍ نسي الحقلَ وآخرَ قرَّر تأجيلَ القبض. فصار البابُ الأخيرَ هنا —
  //  **الكاتبُ القانونيُّ الوحيد**، فيُغلَق على كلّ الأبواب معاً (`/new-service`
  //  المباشرة، ومسارُ الخصم/التبرّع الفوريّ عبر `applyDiscountImmediatelyTx`،
  //  والبابُ التاريخيُّ لبقايا `service_discount_requests` القديمة) —
  //  لا حارسٌ في نقطةٍ واحدة يلتفّ عليه نداءٌ من أخرى.
  //
  //  **ويُستثنى فقط**: `isFree` (تبرّعٌ صريح — الخادمُ يفرض الصفرَ عليه
  //  بصرف النظر عمّا وصل، فلا معنى لإلزامه مبلغاً) و`serviceCost === 0`
  //  (استشارةٌ طبية لا كلفةَ فيها أصلاً — لا شيءَ يُقبَض). **وليس مضاعفَ
  //  سعر الجلسة**: أيّ مبلغٍ موجبٍ يكفي، جزئياً كان أو كاملاً.
  if (!isFree && serviceCost > 0) {
    const receivedNow = Math.max(0, Math.min(Number(params.initialPayment) || 0, serviceCost));
    if (receivedNow <= 0) {
      throw new NewServiceError("«أدخل المبلغ المدفوع الآن»", 400);
    }
  }

  const body = async (tx: any): Promise<NewServiceResult> => {
    const patient = await storage.getPatient(params.patientId, tx);
    if (!patient) throw new NewServiceError("المريض غير موجود", 404);

    const entries = params.entries;
    const notes = params.notes ?? null;

    // Update totalCost. Extra physiotherapy sessions top up the stored plan
    // (036) — but ONLY when a plan already exists. A per-session patient
    // (يدفع مفرد) has no plan: his whole history lives on his payments, and
    // creating a one-session plan here OVERRODE that history in the counter —
    // a patient with 15 paid sessions read "1 purchased" the moment he bought
    // one more, and went deeply negative (ذي قار incident, 2026-07-29). For
    // him we write no plan: the payment rows this function creates below
    // carry the session counts, which is exactly where his counter reads.
    const newTotalCost = (patient.totalCost || 0) + serviceCost;
    const hasPlan = Array.isArray(patient.physioPlan) && patient.physioPlan.length > 0;
    const planPatch = hasPlan && entries && entries.length > 0
      ? {
        physioPlan: mergePhysioPlan(patient.physioPlan, entries.map((e) => ({
          treatmentType: e.treatmentType ?? "", sessionCount: e.sessionCount,
        }))),
      }
      : {};

    // ══ قسمُ «خدمة جديدة» — علاجٌ طبيعي بحكم التصنيف ═══════════════════
    //  الأنواعُ الثلاثة — جلساتٌ إضافية · استشارة · خدمة أخرى — **كلُّها
    //  علاجٌ طبيعي**، تحسمها خريطةٌ مهيكلة على نوع الخدمة لا مطابقةُ نصٍّ حرّ.
    //
    //  **والخيطُ يُفتح قبل أن يتحرّك دينار**، ومعرّفُه هو المستعمَل في
    //  الأربعة كلّها: قيدُ الكلفة، وكلفةُ الحالة، والزيارة، والدفعة. فلا
    //  يقول أحدُها قسماً ويقول الآخرُ غيرَه.
    const nsDepartment = NEW_SERVICE_DEPARTMENT[String(params.serviceType)] ?? null;
    //  هل كان الخيطُ مفتوحاً قبلنا؟ يُقرأ **قبل** الفتح كي يُذكَر في التدقيق
    //  ويُخبَر به الموظّف — فتحُ قسمٍ للمريض حدثٌ يُعلَن لا أثرٌ صامت.
    const hadPhysioBefore = Boolean(patient.isPhysiotherapy)
      || (await storage.getCasesByPatientId(params.patientId, tx)).some((c: any) => c.caseType === "physiotherapy");
    const nsCaseId = nsDepartment === "physiotherapy"
      ? await storage.ensurePhysiotherapyCase(params.patientId, tx)
      : null;
    const openedPhysioCase = nsDepartment === "physiotherapy" && !hadPhysioBefore;
    if (nsDepartment === "physiotherapy" && nsCaseId === null) {
      //  تعذّر فتحُ الخيط ⟹ **لا مال يُكتب**. قيدٌ بلا قسمٍ من مسارٍ يومي
      //  هو بالضبط ما جاء هذا الإصلاح يمنعه، فالفشلُ الصريح خيرٌ منه.
      throw new NewServiceError("تعذّر فتح حالة العلاج الطبيعي — لم تُسجَّل الخدمة", 500);
    }
    await storage.updatePatient(
      params.patientId, { totalCost: newTotalCost, ...planPatch } as any,
      "new_service", nsCaseId, tx,
    );

    // Keep the per-case split in step: the same amount the aggregate just
    // gained is added onto the case(s) the service belongs to — otherwise
    // sum(case costs) permanently diverges from total_cost.
    if (entries) {
      let distributed = 0;
      for (const entry of entries) {
        if (entry.cost > 0) {
          await storage.addToCaseCostById(params.patientId, nsCaseId!, entry.cost, tx);
          distributed += entry.cost;
        }
      }
      // The aggregate gained `serviceCost`, but the lines only account for
      // `distributed` — they differ whenever the total was typed by hand, and
      // **whenever a discount was approved**: the lines still carry the
      // standard price while the total carries the agreed one. Booking only
      // the lines left the remainder on the patient and on NO case, so
      // sum(cases) fell short of total_cost permanently — the 25,000 gap the
      // owner found on امل عويز.
      const remainder = serviceCost - distributed;
      if (remainder > 0) await storage.addToCaseCostById(params.patientId, nsCaseId!, remainder, tx);
    } else {
      await storage.addToCaseCostById(params.patientId, nsCaseId!, serviceCost, tx);
    }

    // Create payment records and visit records - either from treatmentEntries
    // or single entry.
    if (entries) {
      //  ══ **حقيقةُ الدفع منفصلةٌ عن حصّة الكلفة** (تصحيحٌ تشغيليّ —
      //  صدقُ الإيصال) ═══════════════════════════════════════════════════
      //  `entry.cost` هو حصّةُ البند من **الكلفة المتَّفَق عليها** (القياسية
      //  عبر النقطة، أو المخفَّضة عبر الاعتماد الفوريّ) — وهذا صحيحٌ ويبقى
      //  كما هو تماماً؛ به وحده تُقيَّد كلفةُ الحالة أعلاه.
      //
      //  أمّا **ما قُبض فعلاً** فحقيقةٌ مستقلّة: خصمٌ أو موافقةٌ على السعر
      //  لا يعنيان قبضاً كاملاً، والمريضُ قد يدفع جزءاً الآن ويُكمل لاحقاً.
      //  فالمقبوضُ الفعليّ (`params.initialPayment`، مقصوراً على الكلفة)
      //  **وحده** يُوزَّع على البنود — بنفس التوزيع التناسبيّ
      //  (`allocateApprovedCost`) وبنفس أوزان حصص الكلفة، لا بحصص الكلفة
      //  نفسها — ومجموعُ صفوف الدفعة يساوي المقبوضَ بالضبط لا الكلفة.
      const receivedTotal = Math.max(0, Math.min(Number(params.initialPayment) || 0, serviceCost));
      const paymentShares = isFree
        ? entries.map(() => 0)
        : allocateApprovedCost(entries.map((e) => e.cost), receivedTotal);

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        //  `caseId` صريحة في الزيارة والدفعة معاً: بدونها يعيد كلٌّ منهما
        //  الحلَّ من وسمه فينتهيان إلى حالتين مختلفتين لخدمةٍ واحدة.
        await storage.createVisit({
          patientId: params.patientId,
          branchId: patient.branchId,
          caseId: nsCaseId!,
          treatmentType: entry.treatmentType,
          details: "خدمة جديدة",
          notes: `${serviceLabel} - ${entry.treatmentType} (${entry.sessionCount} جلسة)`
            + ` (تكلفة: ${entry.cost.toLocaleString()} د.ع)${notes ? ` - ${notes}` : ""}`,
        } as any, tx);

        //  ══ **الجلسةُ تُسجَّل ولو كان نصيبُها من المال صفراً** ═══════════
        //  دفعةُ البند هي **ذاكرةُ جلساته** لمريض المفرد (٠٣٦): عدّادُه يقرأ
        //  `payments.session_count` لا شيئاً آخر. فشرطُ `cost > 0` وحده كان
        //  يُسقط صفَّ كلِّ بندٍ نصيبُه صفر — والخصمُ الموزَّع على بندين قد
        //  يُنزل أحدَهما إلى صفر، فتضيع جلستُه من العدّاد نهائياً.
        //
        //  فالشرطُ صار: كلفةٌ موجبة (لا قبضٌ)، أو تبرّعٌ صريح، **أو جلسةٌ
        //  اشتُريت**. **والمبلغُ المكتوب حصّةُ هذا البند من المقبوض الفعليّ
        //  لا من كلفته** — فقد يُسجَّل صفراً على بندٍ كلفتُه موجبة، ولو لم
        //  يُقبَض شيءٌ الآن.
        if (entry.cost > 0 || isFree || entry.sessionCount > 0) {
          await storage.createPayment({
            patientId: params.patientId,
            branchId: patient.branchId,
            caseId: nsCaseId!,
            amount: isFree ? 0 : (paymentShares[i] ?? 0),
            isFreeSessions: isFree,
            notes: `${serviceLabel} - ${entry.treatmentType} (${entry.sessionCount} جلسة)${notes ? ` - ${notes}` : ""}`,
            paymentTreatmentType: entry.treatmentType,
            sessionCount: entry.sessionCount,
          } as any, tx);
        }
      }
    } else {
      const sc = params.sessionCount ?? null;
      await storage.createVisit({
        patientId: params.patientId,
        branchId: patient.branchId,
        caseId: nsCaseId!,
        treatmentType: params.paymentTreatmentType || null,
        details: "خدمة جديدة",
        notes: `${serviceLabel}${sc ? ` (${sc} جلسة)` : ""}`
          + ` (تكلفة: ${serviceCost.toLocaleString()} د.ع)${notes ? ` - ${notes}` : ""}`,
      } as any, tx);

      // Record ONLY the amount actually paid now (may be partial or zero).
      // The service still raised totalCost above, so any unpaid part stays
      // as a remaining balance the accountant collects later.
      const paidNow = Math.max(0, Math.min(Number(params.initialPayment) || 0, serviceCost));
      if (paidNow > 0 || isFree) {
        await storage.createPayment({
          patientId: params.patientId,
          branchId: patient.branchId,
          caseId: nsCaseId!,
          amount: isFree ? 0 : paidNow,
          isFreeSessions: isFree,
          notes: `${serviceLabel}${sc ? ` (${sc} جلسة)` : ""}${notes ? ` - ${notes}` : ""}`,
          paymentTreatmentType: params.paymentTreatmentType || null,
          sessionCount: sc ? Number(sc) : null,
        } as any, tx);
      }
    }

    await logAudit({
      entityType: "patient", entityId: params.patientId, action: "update",
      userId: params.actor.userId, userName: params.actor.userName,
      branchId: patient.branchId,
      ipAddress: params.audit?.ipAddress ?? null,
      userAgent: params.audit?.userAgent ?? null,
      notes: `خدمة جديدة (${serviceLabel}) بكلفة ${serviceCost.toLocaleString()} د.ع`
        + `${isFree ? " — مجّانية (تبرع معتمد)" : ""}`
        + `${openedPhysioCase ? " — وفُتحت حالة علاج طبيعي للمريض" : ""}`,
      tx,
    });

    return { newTotalCost, openedPhysiotherapyCase: openedPhysioCase, caseId: nsCaseId };
  };

  return params.tx ? await body(params.tx) : await db.transaction(body);
}
