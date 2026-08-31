/**
 * نقاط REST لعملياتِ **«بلا معاينة»** — بيعُ جزءٍ من طرفٍ صناعي، **والصيانةُ
 * المبسّطة**، وطابورُ إكمالِ صفوفٍ موروثة سبقت الاثنين.
 *
 * ══ بيعُ الجزء — قاعدةٌ مبسّطة (المرحلة الرابعة، ٢٠٢٦-٠٨-٢٨) ═══════════════
 * **جزءٌ ⟵ خبيرٌ ⟵ سعرٌ أصليّ وخصمٌ ⟵ حفظٌ واحد.** لا طبيبَ، لا مراجعةَ
 * استرجاعية، لا طابورَ اعتماد — الحلقةُ وأمرُ العمل والمبلغُ النهائيّ
 * يُقيَّدان معاً في المعاملة نفسِها. `/api/no-exam/device-sale` هو البابُ
 * الوحيد (يُلغي عقدَه القديم ذا النداءين وسجلَّ المراجعة الاسترجاعية معاً).
 *
 * ══ الصيانةُ — قاعدةٌ مطابقة (المرحلة الثالثة، ٢٠٢٦-٠٨-٢٨) ═══════════════
 * **جهازٌ ⟵ جزءٌ إن لزم ⟵ خبيرٌ ⟵ سعرٌ أصليّ وخصمٌ ⟵ حفظٌ واحد.** لا مراجعةَ
 * لاحقة ولا طبيبَ ولا طابور — الأمرُ يُفتَح والمبلغُ النهائيّ يُقيَّد معاً
 * في المعاملة نفسِها. `/api/no-exam/maintenance` هو البابُ الوحيد.
 *
 * ══ الصلاحيات — مفروضةٌ هنا لا في الواجهة ═══════════════════════════════
 *   إنشاءُ بيع الجزء **ومبلغِه**   — استقبال · محاسب · مدير فرع · مسؤول (ضمن الفرع)
 *   إتمامُ الصيانة **ومبلغِها**    — استقبال · محاسب · مدير فرع · مسؤول (ضمن الفرع)
 *   إكمالُ صفٍّ موروثٍ معلَّق      — استقبال · مدير فرع · مسؤول (ضمن الفرع)
 *
 * **ولا معتمِدَ طبّيٌّ للمال في أيٍّ منها، ولا في أيّ صيغةٍ**: لا بيعُ الجزء
 * ولا الصيانةُ يُخبران الطبيبَ بعد اليوم — لا حيّاً ولا استرجاعياً. الطلبان
 * الجديدان بلا سلطةٍ طبّيةٍ عليهما من أوّلهما، والحيّةُ منهما فقط —
 * الاستقبالُ والمحاسبُ ومديرُ الفرع والمسؤول.
 *
 * **ولا صلاحيةَ طبيةٍ تُمنَح لأحد**: اختيارُ المسار توجيهٌ تشغيليّ (٠٦٥)،
 * ولا `medical_exams` تُنشأ ولا `service_path` يتغيّر.
 *
 * **ونطاقُ الفرع يُقرأ من صفّ المريض/العملية** لا مما يعلنه الطلب.
 *
 * **والطابورُ الموروث (② أدناه) لا يتغيّر بحرف**: صفوفٌ سُجِّلت أيّامَ كان
 * الطبيبُ معتمِداً تبقى تُقرأ وتُنهى بمسارها القائم — والقيمةُ `approved`
 * باقيةٌ في القاعدة كما هي.
 */

import type { Express } from "express";
import { logAudit } from "../accounting/ledger";
import { createJournalForPayment } from "../accounting/auto_journal";
import * as store from "./store";
import { ChargeError } from "./store";
import * as mfg from "../manufacturing/store";
import {
  canCorrectReturned, canFinalizeLegacyCharge,
} from "@shared/pending_charge";
import {
  parseComponent, componentLabel,
} from "@shared/prosthetic_parts";
import {
  canCompleteMaintenance, parseMaintenanceDeviceTarget, deriveMaintenanceOffer,
  parseMaintenancePaidNow, MAINTENANCE_SUCCESS_MESSAGE,
} from "@shared/maintenance";
import {
  canCompleteComponentSale, deriveComponentSaleOffer, parseComponentSaleComponent,
  parseComponentSalePaidNow, COMPONENT_SALE_SUCCESS_MESSAGE,
} from "@shared/component_sale";

type Req = any;

function getSession(req: Req) {
  const s = (req.session as any)?.branchSession;
  return {
    userId: (s?.userId ?? null) as number | null,
    userName: (s?.displayName ?? null) as string | null,
    role: (s?.role ?? "") as string,
    isAdmin: Boolean(s?.isAdmin),
    branchId: (s?.branchId ?? null) as number | null,
    accessible: Array.isArray(s?.accessibleBranches) ? (s.accessibleBranches as number[]) : [],
    permissions: (s?.permissions ?? {}) as Record<string, any>,
  };
}

/** الفروع التي يصلها المستخدم. `null` = مسؤول، أي كلّ الفروع. */
function branchScope(req: Req): number[] | null {
  const s = getSession(req);
  if (s.isAdmin) return null;
  if (s.accessible.length > 0) return s.accessible;
  return s.branchId ? [s.branchId] : [];
}

function canReachBranch(req: Req, branchId: number | null): boolean {
  const scope = branchScope(req);
  if (scope === null) return true;
  if (branchId === null) return false;
  return scope.includes(branchId);
}

const actorOf = (req: Req) => {
  const s = getSession(req);
  return { userId: s.userId, userName: s.userName };
};

/**
 * الجلسةُ كما يقرؤها حارسُ الصلاحية — **من الجلسة الموقَّعة لا من الطلب**.
 *
 * وبوّابةُ الإنشاء هي بوّابةُ «خدمة جديدة» و«بدء جهاز» نفسُها حرفاً بحرف:
 * `canAddPatients` هو ما يعنيه «استقبال» في هذا النظام.
 */
const chargeSession = (req: Req) => {
  const s = getSession(req);
  return { userId: s.userId, isAdmin: s.isAdmin, permissions: s.permissions, role: s.role };
};

const fail = (res: any, err: unknown, fallback: string) => {
  if (err instanceof ChargeError) return res.status(err.status).json({ error: err.message });
  const e = err as any;
  //  أخطاءُ الطبقات القائمة تمرّ برموزها — فلا تصير كلُّها ٥٠٠ عمياء.
  if (e?.status && typeof e?.message === "string" && e.status < 500) {
    return res.status(e.status).json({ error: e.message });
  }
  if (e?.name === "ActiveOrderError" || e?.name === "ActiveAssignmentError") {
    return res.status(409).json({ error: e.message ?? "لدى المريض أمر نشط" });
  }
  console.error(`[no-exam] ${fallback}:`, err);
  return res.status(500).json({ error: fallback });
};

async function patientRow(patientId: number) {
  const { db } = await import("../db");
  const { sql } = await import("drizzle-orm");
  const r = await db.execute<{
    id: number; name: string | null; branch_id: number | null;
    is_amputee: boolean | null; is_medical_support: boolean | null;
  }>(sql`
    SELECT id, name, branch_id, is_amputee, is_medical_support
      FROM patients WHERE id = ${patientId} AND deleted_at IS NULL
  `);
  return (r.rows ?? [])[0] ?? null;
}

/**
 * **أهليّةُ إكمال صفٍّ موروث** — تُفحَص **تحت قفل الصفّ**.
 *
 * ══ ولا اختصاصَ طبّياً يُسأل عنه ═══════════════════════════════════════
 * كانت الأهليّةُ «طبيبٌ باختصاص الجهاز × فرع العملية». وقد خرج الطبيبُ من
 * سلطة المال (قرارُ المالك)، فبقي **الفرعُ وحده** حاكماً — والبوّابةُ هي
 * بوّابةُ الإنشاء نفسُها: مَن يسجّل عمليةً ومبلغَها اليوم يُنهي مبلغَ
 * عمليةٍ سُجِّلت أمس.
 *
 * **والفرعُ من صفّ العملية نفسِه** لا مما يعلنه الطلب — والفحصُ تحت القفل
 * لأن المريضَ قد يُنقَل بين قراءة النقطة وكتابة المعاملة.
 */
function finalizeGate(req: Req) {
  return async (charge: store.ChargeRow): Promise<{ ok: boolean; reason?: string }> => {
    if (!canFinalizeLegacyCharge(chargeSession(req))) {
      return { ok: false, reason: "إكمال المبالغ السابقة للاستقبال ومدير الفرع والمسؤول" };
    }
    if (!canReachBranch(req, charge.branchId)) {
      return { ok: false, reason: "غير مصرح لك بعمليات فرع آخر" };
    }
    return { ok: true };
  };
}

export function registerPendingChargeRoutes(app: Express, isAuthenticated: any) {
  // ══ ① إنشاءُ عملية «بلا معاينة» ════════════════════════════════════════

  /**
   * **بيعُ جزءٍ من طرفٍ صناعي، مبسّطاً — حفظٌ واحد.** (المرحلة الرابعة،
   * ٢٠٢٦-٠٨-٢٨ — تُلغي عقدَ «افتح الحلقة أوّلاً ثمّ بِعها» ذا النداءين.)
   *
   * جزءٌ ⟵ خبيرٌ ⟵ سعرٌ أصليّ وخصمٌ ⟵ سعرٌ نهائيّ يشتقّه الخادم ⟵ حفظٌ واحد
   * يفتح الحلقةَ (أو يستأنف حلقةً موروثة بمعرّفها الصريح) وأمرَ العمل ويقيّد
   * المبلغ معاً في معاملةٍ واحدة — **بلا طبيبٍ، بلا مراجعةٍ استرجاعية، بلا
   * خطوتَي إنشاءٍ ثمّ بيع**. الاستقبالُ والمحاسبُ ومديرُ الفرع والمسؤولُ
   * متكافئون تماماً هنا؛ الطبيبُ ليس منهم إطلاقاً (`canCompleteComponentSale`،
   * `shared/component_sale.ts`).
   *
   * **جزءٌ من طرفٍ صناعي وحده** — الجهازُ الكاملُ (طرفاً كان أو مسنداً)
   * قرارٌ سريريٌّ يبقى يمرّ بمسار المعاينة، ولا هذا البابَ.
   */
  app.post("/api/no-exam/device-sale", isAuthenticated, async (req: Req, res) => {
    try {
      if (!canCompleteComponentSale(chargeSession(req))) {
        return res.status(403).json({
          error: "بيع جزء من طرف صناعي للاستقبال والمحاسب ومدير الفرع والمسؤول",
        });
      }

      //  ══ **العقدُ القديم مرفوضٌ صراحةً** ═══════════════════════════════
      //  عميلٌ بائتٌ يرسل `charged`/`amount` (عقدُ ما قبل هذه المرحلة —
      //  مبلغٌ نهائيّ يُدخَل يدوياً بلا خصمٍ مُشتقّ) يستحقّ رسالةً تدلّه على
      //  العقد الجديد — لا أن يُقرأ بصمت فيصير مبلغٌ قديم سعراً نهائياً
      //  لعمليةٍ لم تُشتقّ.
      if (req.body?.charged !== undefined || req.body?.amount !== undefined) {
        return res.status(400).json({
          error: "هذا العقدُ قديم — أرسل originalPrice وdiscountAmount بدل charged/amount",
        });
      }

      const patientId = Number(req.body?.patientId);
      if (!Number.isFinite(patientId)) {
        return res.status(400).json({ error: "بيانات ناقصة" });
      }
      const patient = await patientRow(patientId);
      if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
      if (!canReachBranch(req, patient.branch_id)) {
        return res.status(403).json({ error: "غير مصرح لك بهذا الفرع" });
      }

      //  ══ **ثلاثةُ أوضاع — حلقةٌ جديدة، استئنافُ حلقةٍ موروثة، أو إلحاقٌ
      //  صريحٌ بجهازٍ قيد التصنيع** ═══════════════════════════════════════
      //  والنافذةُ لا تُرسل أكثرَ من واحدٍ منها أبداً. `existingEpisodeId`
      //  مخرجُ الحلقات اليتيمة التي فتحها الشكلُ القديم ذو النداءين ولم
      //  يكتمل بيعُها — والجزءُ حينها **يُشتقّ من الحلقة المقفولة لاحقاً
      //  داخل المعاملة** لا من هذا الطلب. و`attachToDeviceEpisodeId` يصل
      //  فقط حين أجاب الموظّفُ «نعم» عن سؤال الإلحاق الصريح على الشاشة —
      //  والخادمُ **لا يثق به وحده**: يُعاد التحقّق الكامل تحت القفل داخل
      //  المعاملة (`storage.ts: loadInManufacturingDeviceOperationTx`)،
      //  فمعرّفٌ بائتٌ أو لجهازٍ لم يعد `in_manufacturing` يُرفَض ٤٠٩.
      const rawExisting = req.body?.existingEpisodeId;
      const hasExisting = rawExisting !== null && rawExisting !== undefined && rawExisting !== "";
      const rawAttach = req.body?.attachToDeviceEpisodeId;
      const hasAttach = !hasExisting
        && rawAttach !== null && rawAttach !== undefined && rawAttach !== "";
      let existingEpisodeId: number | null = null;
      let attachToDeviceEpisodeId: number | null = null;
      let component: ReturnType<typeof parseComponentSaleComponent>["value"] = null;
      if (hasExisting) {
        const id = Number(rawExisting);
        if (!Number.isInteger(id) || id <= 0) {
          return res.status(400).json({ error: "معرّف جهاز غير صالح" });
        }
        existingEpisodeId = id;
      } else if (hasAttach) {
        const id = Number(rawAttach);
        if (!Number.isInteger(id) || id <= 0) {
          return res.status(400).json({ error: "معرّف الجهاز قيد التصنيع غير صالح" });
        }
        attachToDeviceEpisodeId = id;
        const comp = parseComponentSaleComponent(req.body?.component);
        if (!comp.ok) return res.status(400).json({ error: comp.error });
        component = comp.value;
      } else {
        const comp = parseComponentSaleComponent(req.body?.component);
        if (!comp.ok) return res.status(400).json({ error: comp.error });
        component = comp.value;
      }

      //  ══ **الخبيرُ — إلّا عند الإلحاق** ═══════════════════════════════════
      //  الإلحاقُ لا يُسنِد خبيراً جديداً؛ يشتقّه من أمر العمل القائم
      //  (`storage.ts: loadInManufacturingDeviceOperationTx`). فسؤالُ
      //  الموظّف عن خبيرٍ هنا ثمّ تجاهلُ اختياره كان الخطأ — فلا يُسأل
      //  أصلاً، ولا يُتحقَّق من قيمةٍ لن تُستعمَل.
      let expertUserId = Number(req.body?.expertUserId);
      if (hasAttach) {
        expertUserId = NaN;   // لا يُقرأ في مسار الإلحاق إطلاقاً — انظر أدناه.
      } else {
        //  **فحصٌ مبكّرٌ سريع للردّ الفوري**؛ الكتابةُ الفعليةُ تراجعه تحت
        //  قفل المعاملة لا تثق بهذا وحده.
        if (!Number.isInteger(expertUserId) || expertUserId <= 0) {
          return res.status(400).json({ error: "اختر الخبير المسؤول عن التنفيذ" });
        }
        const v = await mfg.validateExpertForBranch(expertUserId, patient.branch_id as number);
        if (!v.ok) return res.status(400).json({ error: v.reason });
      }

      //  ══ **السعرُ — يُشتقّ في الخادم من مُدخَلين فقط** ═══════════════════
      //  والعميلُ لا يُرسل سعراً نهائياً ولا نوعَ سعرٍ أبداً — وإن أرسلهما
      //  عميلٌ بائتٌ أو خبيث، **يُتجاهَلان تماماً**: لا يُقرآن هنا ولا في
      //  المخزن، فلا سبيلَ لهما إلى ما يُكتب.
      const offer = deriveComponentSaleOffer({
        originalPrice: req.body?.originalPrice, discountAmount: req.body?.discountAmount,
      });
      if (!offer.ok) return res.status(400).json({ error: offer.error });

      //  ══ **«المبلغ المدفوع الآن» — إلزاميٌّ صراحةً، لا يُخمَّن من السعر**
      //  ═══════════════════════════════════════════════════════════════════
      //  `offer.finalPrice` هو الحدُّ الأعلى — نفسُ الرقم الذي سيُقيَّد فعلاً.
      const paidNowResult = parseComponentSalePaidNow({
        raw: req.body?.paidNow, finalPrice: offer.finalPrice!,
      });
      if (!paidNowResult.ok) return res.status(400).json({ error: paidNowResult.error });

      const note = typeof req.body?.note === "string" ? req.body.note.trim() || null : null;

      const out = await store.createComponentSaleOperation({
        patientId, branchId: patient.branch_id ?? null, expertUserId,
        originalPrice: offer.originalPrice!, priceKind: offer.kind!,
        finalPrice: offer.finalPrice!, paidNow: paidNowResult.amount,
        note, actor: actorOf(req), component, existingEpisodeId, attachToDeviceEpisodeId,
      });

      await logAudit({
        entityType: "no_exam_operation",
        entityId: out.workOrderId, action: "create",
        userId: getSession(req).userId, userName: getSession(req).userName ?? null,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        //  **حقيقةٌ مُهيكَلة كاملة** — لا نصَّ تدقيقٍ وحده: الجزءُ والخبيرُ
        //  والأصليُّ والخصمُ والنهائيُّ والنوعُ، وهويّةُ الحلقة والأمر، ومَن
        //  ومتى. **والخبيرُ من الاستجابة** (`out.expertUserId`) لا من
        //  الطلب — فالإلحاقُ يُنسَب لخبير أمر العمل الفعليّ لا لقيمةٍ
        //  لم تُقرَأ أصلاً.
        newValues: {
          patientId, workOrderId: out.workOrderId, serviceType: "prosthetic",
          operationKind: "device_sale",
          component: out.component, deviceEpisodeId: out.deviceEpisodeId,
          existingEpisodeId, attachToDeviceEpisodeId, expertUserId: out.expertUserId,
          originalPrice: offer.originalPrice, discountAmount: offer.discountAmount,
          finalPrice: offer.finalPrice, priceKind: offer.kind,
          //  **حقيقةُ القبض — لا تُستنتَج من السعر**: كم دُفع الآن، وكم
          //  تبقّى ديناً على هذه العمليةِ بعينها (لا على المريض كلِّه).
          paidNow: out.paidNow, paymentId: out.paymentId,
          remainingUnpaid: offer.finalPrice! - out.paidNow,
          note,
        },
        notes: (offer.kind === "free"
          ? `بيع جزء (${componentLabel(out.component) ?? out.component}) — مجّاني`
            + ` (أصلُه ${offer.originalPrice!.toLocaleString("en-US")} د.ع)`
          : `بيع جزء (${componentLabel(out.component) ?? out.component}) —`
            + ` ${offer.finalPrice!.toLocaleString("en-US")} د.ع`
            + (offer.kind === "discount"
              ? ` (بعد خصم ${offer.discountAmount!.toLocaleString("en-US")}`
                + ` من ${offer.originalPrice!.toLocaleString("en-US")})`
              : ""))
          //  **وسطرُ القبض** — دَينٌ أو دفعٌ جزئيّ أو كامل، بصياغةٍ يقرؤها
          //  الموظّف بلا فتح صفّ الدفعة.
          + (offer.kind === "free" ? ""
            : out.paidNow <= 0 ? " — دَينٌ كامل، لم يُدفَع شيء الآن"
              : out.paidNow >= offer.finalPrice!
                ? ` — دُفع بالكامل الآن (${out.paidNow.toLocaleString("en-US")} د.ع)`
                : ` — دُفع جزئياً الآن (${out.paidNow.toLocaleString("en-US")} د.ع،`
                  + ` تبقّى ${(offer.finalPrice! - out.paidNow).toLocaleString("en-US")} د.ع)`),
      });

      //  ══ القبضُ — القيدُ اليوميّ والتدقيقُ **بعد** الالتزام، خارج معاملة
      //  المخزن تماماً (تصحيحٌ لاحق، المرحلة السادسة) ═══════════════════════
      //  نفسُ نمط كلّ نقطةِ دفعةٍ أخرى في هذا الريبو (`server/followup/
      //  routes.ts` مع إتمام البيع على مسار المعاينة): الدفعةُ نفسُها كُتبت
      //  **داخل** معاملة البيع (`createPaidNowPaymentTx`، أعلى قِسمَي
      //  الذرّية) فهي محفوظةٌ بالفعل؛ القيدُ والتدقيقُ لاحقان — فشلُ أيٍّ
      //  منهما لا يمسّ الدفعةَ المحفوظة فعلاً (`createJournalForPayment`
      //  «آمنٌ للفشل» بتصميمه). ولا محاسبةَ ثانية تُخترَع هنا.
      if (out.payment) {
        await createJournalForPayment(out.payment, getSession(req).userId);
        await logAudit({
          entityType: "payment",
          entityId: out.payment.id,
          action: "create",
          userId: getSession(req).userId, userName: getSession(req).userName ?? null,
          branchId: out.payment.branchId,
          newValues: out.payment,
          ipAddress: req.ip ?? null,
          userAgent: req.get("user-agent") ?? null,
        });
      }

      //  **بلا مراجعةٍ استرجاعية** — لا `routeRetrospectiveReview` هنا:
      //  قرارُ المالك (المرحلة الرابعة) لا يُبقي دوراً للطبيب في بيع الجزء
      //  إطلاقاً، لا حيّاً ولا استرجاعياً.
      return res.status(201).json({
        ok: true, workOrderId: out.workOrderId, deviceEpisodeId: out.deviceEpisodeId,
        component: out.component,
        //  **خبيرُ العملية الفعليّ** — للإلحاق هو خبيرُ أمر العمل القائم،
        //  لا مُدخَلاً من هذا الطلب.
        expertUserId: out.expertUserId,
        originalPrice: offer.originalPrice, discountAmount: offer.discountAmount,
        finalPrice: offer.finalPrice, priceKind: offer.kind,
        paidNow: out.paidNow, paymentId: out.paymentId,
        remainingUnpaid: offer.finalPrice! - out.paidNow,
        message: COMPONENT_SALE_SUCCESS_MESSAGE,
      });
    } catch (err) {
      fail(res, err, "تعذّر تسجيل بيع الجزء");
    }
  });

  /**
   * **الصيانةُ المبسّطة — بابٌ واحد، حفظةٌ واحدة، بلا مراجعة لاحقة.**
   * (المرحلة الثالثة، ٢٠٢٦-٠٨-٢٨ — تُلغي «الأجرُ ينتظر الطبيب».)
   *
   * جهازٌ ⟵ جزءٌ إن لزم ⟵ خبيرٌ ⟵ سعرٌ أصليّ وخصمٌ ⟵ حفظٌ واحد يفتح أمرَ
   * العمل ويقيّد المبلغَ النهائيّ معه في المعاملة نفسِها. **بلا اعتمادٍ
   * لاحق ولا مراجعةٍ طبية ولا طابور**: الاستقبالُ والمحاسبُ ومديرُ الفرع
   * والمسؤولُ متكافئون تماماً — والطبيبُ بلا سلطةٍ هنا إطلاقاً، ولو نادى
   * النقطةَ مباشرةً.
   *
   * والسعرُ يُشتقّ بـ`deriveMaintenanceOffer` (= `deriveOfferFromDiscount`
   * من المرحلة الثانية) — لا حسابَ ثانٍ. والجهازُ يُحسَم بـ
   * `resolveDeviceTargetTx` القانونيّة (داخل `createMaintenanceOrderWithVisit`).
   */
  app.post("/api/no-exam/maintenance", isAuthenticated, async (req: Req, res) => {
    try {
      if (!canCompleteMaintenance(chargeSession(req))) {
        return res.status(403).json({
          error: "إتمام الصيانة للاستقبال والمحاسب ومدير الفرع والمسؤول",
        });
      }
      //  ══ **الحقولُ القديمة تُرفَض صراحةً** ══════════════════════════════
      //  عميلٌ بائتٌ يرسل `charged`/`amount`/`deviceOrigin` (العقدُ الذي
      //  تقاعد مع هذه المرحلة) يستحقّ رسالةً تدلّه على العقد الجديد — لا
      //  أن تُقرأ بصمت فيصير مبلغٌ قديم سعراً نهائياً لعمليةٍ لم تُشتقّ.
      if (req.body?.charged !== undefined || req.body?.amount !== undefined
        || req.body?.deviceOrigin !== undefined) {
        return res.status(400).json({
          error: "هذا العقدُ قديم — أرسل originalPrice وdiscountAmount بدل"
            + " charged/amount/deviceOrigin",
        });
      }
      const patientId = Number(req.body?.patientId);
      const expertUserId = Number(req.body?.expertUserId);
      if (!Number.isFinite(patientId) || !Number.isInteger(expertUserId) || expertUserId <= 0) {
        return res.status(400).json({ error: "بيانات ناقصة" });
      }
      const patient = await patientRow(patientId);
      if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
      if (!canReachBranch(req, patient.branch_id)) {
        return res.status(403).json({ error: "غير مصرح لك بهذا الفرع" });
      }

      //  **أيُّ جهازٍ يُصان؟** — قاعدةُ الصيانة القائمة بحرفها: صاحبُ نوعٍ
      //  واحد يبقى تلقائياً، وصاحبُ الاثنين يُصرِّح، والصمتُ يُردّ لا يُخمَّن.
      const owned = [
        patient.is_amputee ? "prosthetic" : null,
        patient.is_medical_support ? "medical_support" : null,
      ].filter(Boolean) as ("prosthetic" | "medical_support")[];
      if (owned.length === 0) {
        return res.status(400).json({ error: "الصيانة لمرضى الأطراف والمساند فقط" });
      }
      const requested = req.body?.serviceType;
      let serviceType: "prosthetic" | "medical_support";
      if (typeof requested === "string" && requested) {
        if (!owned.includes(requested as any)) {
          return res.status(400).json({ error: "هذا النوع غير مفعّل على ملف المريض" });
        }
        serviceType = requested as "prosthetic" | "medical_support";
      } else if (owned.length === 1) {
        serviceType = owned[0];
      } else {
        return res.status(400).json({
          error: "المريض يحمل طرفاً ومسنداً — حدّد نوع الجهاز المراد صيانته",
        });
      }

      const v = await mfg.validateExpertForBranch(expertUserId, patient.branch_id as number);
      if (!v.ok) return res.status(400).json({ error: v.reason });

      //  **والجزءُ من القائمة القائمة وحدها** (ترحيل ٠٦٠) — ولا قائمةَ
      //  ثانية تُخترَع ولا حقلٌ حرٌّ يُفرغها من معناها.
      const comp = parseComponent(req.body?.maintenanceComponent);
      if (!comp.ok) return res.status(400).json({ error: comp.error });
      if (serviceType === "prosthetic" && !comp.value) {
        return res.status(400).json({ error: "حدّد الجزء المراد صيانته" });
      }

      //  ══ **الجهازُ — نيّةٌ صريحة، لا افتراض** ══════════════════════════
      //  فحصُ شكلٍ مبكّر فقط: الحسمُ الدقيق (الانتماء والحالة `delivered`)
      //  يقع تحت القفل داخل `resolveDeviceTargetTx`.
      const target = parseMaintenanceDeviceTarget({
        deviceEpisodeId: req.body?.deviceEpisodeId,
        legacyUnrecordedDevice: req.body?.legacyUnrecordedDevice,
      });
      if (!target.ok) return res.status(400).json({ error: target.error });

      //  ══ **السعرُ — يُشتقّ في الخادم من مُدخَلين فقط** (المرحلة الثانية) ══
      //  والعميلُ لا يُرسل سعراً نهائياً ولا نوعَ سعرٍ أبداً.
      const offer = deriveMaintenanceOffer({
        originalPrice: req.body?.originalPrice, discountAmount: req.body?.discountAmount,
      });
      if (!offer.ok) return res.status(400).json({ error: offer.error });

      //  ══ **«المبلغ المدفوع الآن» — إلزاميٌّ صراحةً، لا يُخمَّن من السعر**
      //  (نفسُ قاعدة بيع الجزء بحرفها) ═══════════════════════════════════════
      const paidNowResult = parseMaintenancePaidNow({
        raw: req.body?.paidNow, finalPrice: offer.finalPrice!,
      });
      if (!paidNowResult.ok) return res.status(400).json({ error: paidNowResult.error });

      const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";

      const out = await store.createMaintenanceOperation({
        patientId, branchId: patient.branch_id ?? null, serviceType, expertUserId,
        maintenanceComponent: comp.value,
        deviceEpisodeId: target.deviceEpisodeId,
        legacyUnrecordedDevice: target.legacyUnrecordedDevice,
        originalPrice: offer.originalPrice!, priceKind: offer.kind!, finalPrice: offer.finalPrice!,
        paidNow: paidNowResult.amount,
        visitNotes: note || "صيانة طرف/مسند",
        actor: actorOf(req),
      });

      await logAudit({
        entityType: "no_exam_operation",
        entityId: out.workOrderId, action: "create",
        userId: getSession(req).userId, userName: getSession(req).userName ?? null,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        //  **حقيقةٌ مُهيكَلة كاملة** — لا نصَّ تدقيقٍ وحده: الجهازُ (أو
        //  الإقرارُ الصريح بعدم التسجيل)، والجزءُ، والخبيرُ، والأصليُّ
        //  والخصمُ والنهائيُّ والنوعُ، ومَن ومتى ورقمُ الأمر.
        newValues: {
          patientId, workOrderId: out.workOrderId, serviceType,
          operationKind: "maintenance",
          maintenanceComponent: comp.value,
          deviceEpisodeId: out.deviceEpisodeId,
          legacyUnrecordedDevice: target.legacyUnrecordedDevice,
          expertUserId,
          originalPrice: offer.originalPrice, discountAmount: offer.discountAmount,
          finalPrice: offer.finalPrice, priceKind: offer.kind,
          //  **حقيقةُ القبض — لا تُستنتَج من السعر**: كم دُفع الآن، وكم
          //  تبقّى ديناً على هذه العمليةِ بعينها (لا على المريض كلِّه).
          paidNow: out.paidNow, paymentId: out.paymentId,
          remainingUnpaid: offer.finalPrice! - out.paidNow,
          note: note || null,
        },
        notes: (offer.kind === "free"
          ? `صيانة — مجّاني (أصلُه ${offer.originalPrice!.toLocaleString("en-US")} د.ع)`
          : `صيانة — ${offer.finalPrice!.toLocaleString("en-US")} د.ع`
            + (offer.kind === "discount"
              ? ` (بعد خصم ${offer.discountAmount!.toLocaleString("en-US")}`
                + ` من ${offer.originalPrice!.toLocaleString("en-US")})`
              : ""))
          //  **وسطرُ القبض** — دَينٌ أو دفعٌ جزئيّ أو كامل.
          + (offer.kind === "free" ? ""
            : out.paidNow <= 0 ? " — دَينٌ كامل، لم يُدفَع شيء الآن"
              : out.paidNow >= offer.finalPrice!
                ? ` — دُفع بالكامل الآن (${out.paidNow.toLocaleString("en-US")} د.ع)`
                : ` — دُفع جزئياً الآن (${out.paidNow.toLocaleString("en-US")} د.ع،`
                  + ` تبقّى ${(offer.finalPrice! - out.paidNow).toLocaleString("en-US")} د.ع)`),
      });

      //  ══ القبضُ — القيدُ اليوميّ والتدقيقُ بعد الالتزام (نفسُ نمط بيع
      //  الجزء أعلاه بحرفه، المرحلة السادسة) ═══════════════════════════════
      if (out.payment) {
        await createJournalForPayment(out.payment, getSession(req).userId);
        await logAudit({
          entityType: "payment",
          entityId: out.payment.id,
          action: "create",
          userId: getSession(req).userId, userName: getSession(req).userName ?? null,
          branchId: out.payment.branchId,
          newValues: out.payment,
          ipAddress: req.ip ?? null,
          userAgent: req.get("user-agent") ?? null,
        });
      }

      //  **بلا مراجعةٍ لاحقة** — لا `routeRetrospectiveReview` هنا: الطبيبُ
      //  بلا سلطةٍ على هذا المسار من أوّله، فلا حاجةَ لإخباره.
      return res.status(201).json({
        ok: true, workOrderId: out.workOrderId, deviceEpisodeId: out.deviceEpisodeId,
        originalPrice: offer.originalPrice, discountAmount: offer.discountAmount,
        finalPrice: offer.finalPrice, priceKind: offer.kind,
        paidNow: out.paidNow, paymentId: out.paymentId,
        remainingUnpaid: offer.finalPrice! - out.paidNow,
        message: MAINTENANCE_SUCCESS_MESSAGE,
      });
    } catch (err) {
      fail(res, err, "تعذّر تسجيل الصيانة");
    }
  });

  // ══ ② الطابورُ الموروث — إكمالُ مبالغَ سُجِّلت قبل التغيير ═══════════════
  //
  //  **ولا صفَّ جديد يدخله**: العملياتُ الجديدة تُقيَّد مبالغُها لحظتَها.
  //  وما بقي هنا مالٌ حقيقيٌّ لعملياتٍ وقعت، ينتظر إنساناً يُنهيه — والإنسانُ
  //  هو الاستقبالُ ومديرُ الفرع والمسؤول، لا طبيب.

  /**
   * **طابورُ الإكمال الموروث** — بنطاق الفرع وحده.
   *
   * ولا يُقصَر على اختصاصٍ طبّيّ بعد اليوم: الطبيبُ خرج من سلطة المال،
   * فقصرُ القائمة على اختصاصاته كان سيُخفي صفوفاً عمّن صار يملك إنهاءها.
   */
  app.get("/api/no-exam/review", isAuthenticated, async (req: Req, res) => {
    try {
      if (!canFinalizeLegacyCharge(chargeSession(req))) return res.json({ rows: [] });
      res.json({ rows: await store.listLegacyOpen(branchScope(req)) });
    } catch (err) {
      fail(res, err, "تعذّر تحميل المبالغ السابقة");
    }
  });

  /**
   * **شارةُ الطابور الموروث** (المرحلة الخامسة) — فيُعرَف أن هناك ما ينتظر
   * بلا فتح الصفحة، تماماً كشارة «مُعادة للتصحيح». `count` وحده — لا حاجةَ
   * لتفريق «لي» هنا: لا مالكَ شخصياً لصفٍّ موروث كهذا.
   */
  app.get("/api/no-exam/review/count", isAuthenticated, async (req: Req, res) => {
    try {
      if (!canFinalizeLegacyCharge(chargeSession(req))) return res.json({ count: 0 });
      res.json({ count: await store.legacyOpenCount(branchScope(req)) });
    } catch (err) {
      fail(res, err, "تعذّر قراءة عدّاد المبالغ السابقة");
    }
  });

  /** **الإكمال** — ويُقيَّد المبلغُ مرّةً واحدة بالضبط بالكاتب القانونيّ. */
  app.post("/api/no-exam/charges/:id/approve", isAuthenticated, async (req: Req, res) => {
    try {
      const chargeId = Number(req.params.id);
      if (!Number.isFinite(chargeId)) return res.status(400).json({ error: "معرّف غير صالح" });
      //  ردٌّ مبكّر لمن ليس مخوَّلاً أصلاً — والحارسُ الأخير تحت القفل.
      if (!canFinalizeLegacyCharge(chargeSession(req))) {
        return res.status(403).json({
          error: "إكمال المبالغ السابقة للاستقبال ومدير الفرع والمسؤول",
        });
      }
      //  **ولا لقطةَ قبل القفل**: الخبيرُ والهويّةُ يُقرآن من الصفّ المقفول
      //  داخل المعاملة ويُعاد التحقّق منهما هناك — فما قُرئ قبل القفل قد
      //  يشيخ قبل أن يُكتب دينار.
      const out = await store.approveCharge({
        chargeId, actor: actorOf(req), eligible: finalizeGate(req),
      });
      await logAudit({
        entityType: "pending_service_charge", entityId: chargeId, action: "update",
        userId: getSession(req).userId, userName: getSession(req).userName ?? null,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        oldValues: { status: "pending_review", amount: out.charge.amount },
        newValues: {
          status: "approved", amount: out.charge.amount, workOrderId: out.workOrderId,
        },
        notes: `إكمال مبلغ سابق بلا معاينة — ${out.charge.amount} د.ع`,
      });
      res.json({ ok: true, charge: out.charge, workOrderId: out.workOrderId });
    } catch (err) {
      fail(res, err, "تعذّر اعتماد المبلغ");
    }
  });

  /** **الإعادةُ للتصحيح** — بسببٍ إلزاميّ، ولا شيءَ يُهدَم ولا دينارَ يتحرّك. */
  app.post("/api/no-exam/charges/:id/return", isAuthenticated, async (req: Req, res) => {
    try {
      const chargeId = Number(req.params.id);
      if (!Number.isFinite(chargeId)) return res.status(400).json({ error: "معرّف غير صالح" });
      if (!canFinalizeLegacyCharge(chargeSession(req))) {
        return res.status(403).json({
          error: "إكمال المبالغ السابقة للاستقبال ومدير الفرع والمسؤول",
        });
      }
      const charge = await store.returnCharge({
        chargeId, reason: String(req.body?.reason ?? ""),
        actor: actorOf(req), eligible: finalizeGate(req),
      });
      await logAudit({
        entityType: "pending_service_charge", entityId: chargeId, action: "update",
        userId: getSession(req).userId, userName: getSession(req).userName ?? null,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        oldValues: { status: "pending_review" },
        newValues: { status: "returned", returnReason: charge.returnReason },
        notes: `إعادة مبلغ للتصحيح — ${charge.returnReason}`,
      });
      res.json({ ok: true, charge });
    } catch (err) {
      fail(res, err, "تعذّر إعادة العملية");
    }
  });

  // ══ ③ طابورُ الاستقبال — المُعادات ═════════════════════════════════════

  app.get("/api/no-exam/returned", isAuthenticated, async (req: Req, res) => {
    try {
      if (!canCorrectReturned(chargeSession(req))) return res.json({ rows: [] });
      res.json({ rows: await store.listReturned(branchScope(req)) });
    } catch (err) {
      fail(res, err, "تعذّر تحميل المُعادات");
    }
  });

  /**
   * **الشارةُ** — فيُعرَف أن هناك ما ينتظر بلا فتحِ الصفحة.
   *
   * `branch` هو الرقمُ الحاكم (المهمّةُ للفرع)، و`mine` تبليغٌ شخصيٌّ لمن
   * أنشأها — **ولا يقفل التصحيحَ عليه** فقد يكون غائباً.
   */
  app.get("/api/no-exam/returned/count", isAuthenticated, async (req: Req, res) => {
    try {
      if (!canCorrectReturned(chargeSession(req))) return res.json({ branch: 0, mine: 0 });
      res.json(await store.returnedCounts({
        scope: branchScope(req), userId: getSession(req).userId,
      }));
    } catch (err) {
      fail(res, err, "تعذّر قراءة عدّاد المُعادات");
    }
  });

  /** **التصحيحُ وإعادةُ الإرسال — على الصفّ نفسِه** ولا صفَّ ثانٍ يُستنسَخ. */
  app.post("/api/no-exam/charges/:id/resubmit", isAuthenticated, async (req: Req, res) => {
    try {
      const chargeId = Number(req.params.id);
      if (!Number.isFinite(chargeId)) return res.status(400).json({ error: "معرّف غير صالح" });
      if (!canCorrectReturned(chargeSession(req))) {
        return res.status(403).json({ error: "غير مصرح" });
      }
      const charge = await store.resubmitCharge({
        chargeId, amount: Number(req.body?.amount),
        note: typeof req.body?.note === "string" ? req.body.note.trim() || null : null,
        actor: actorOf(req),
        //  الفرعُ يُقرأ من صفّ العملية **تحت القفل** لا من الطلب.
        reachable: (c) => canReachBranch(req, c.branchId),
      });
      await logAudit({
        entityType: "pending_service_charge", entityId: chargeId, action: "update",
        userId: getSession(req).userId, userName: getSession(req).userName ?? null,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        oldValues: { status: "returned" },
        newValues: { status: "pending_review", amount: charge.amount },
        notes: `تصحيح وإعادة إرسال — ${charge.amount} د.ع`,
      });
      res.json({ ok: true, charge });
    } catch (err) {
      fail(res, err, "تعذّر إعادة الإرسال");
    }
  });

  // ══ ④ القراءةُ على الملفّ ══════════════════════════════════════════════

  app.get("/api/patients/:patientId/pending-charges", isAuthenticated, async (req: Req, res) => {
    try {
      const patientId = Number(req.params.patientId);
      if (!Number.isFinite(patientId)) return res.status(400).json({ error: "معرّف غير صالح" });
      const patient = await patientRow(patientId);
      if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
      if (!canReachBranch(req, patient.branch_id)) {
        return res.status(403).json({ error: "لا يمكنك الاطّلاع على مرضى فرع آخر" });
      }
      res.json({ rows: await store.listForPatient(patientId) });
    } catch (err) {
      fail(res, err, "تعذّر تحميل مبالغ المريض المعلّقة");
    }
  });

  /** **الرحلةُ كاملةً** — فلا يمحو سببُ إعادةٍ سبباً قبله. */
  app.get("/api/no-exam/charges/:id/events", isAuthenticated, async (req: Req, res) => {
    try {
      const chargeId = Number(req.params.id);
      if (!Number.isFinite(chargeId)) return res.status(400).json({ error: "معرّف غير صالح" });
      const charge = await store.getCharge(chargeId);
      if (!charge) return res.status(404).json({ error: "العملية غير موجودة" });
      if (!canReachBranch(req, charge.branchId)) {
        return res.status(403).json({ error: "غير مصرح لك بهذا الفرع" });
      }
      res.json({ charge, events: await store.getChargeEvents(chargeId) });
    } catch (err) {
      fail(res, err, "تعذّر تحميل سجل العملية");
    }
  });
}
