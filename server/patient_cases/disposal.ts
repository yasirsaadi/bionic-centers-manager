// **السقالةُ التقنية لا تُخلّد خطأَ إدخال** — قاعدةٌ واحدة تقرّر: أهذه الحالةُ
// ما زالت قابلةً للسحب، أم اكتسبت تاريخاً ذا معنى؟ (تدقيق ٢٠٢٦-٠٩-١٢:
// CASEDEL-01/02/03/05/06 · INT-06 = RTP-5.)
//
// ══ الواقعةُ المُعادُ إنتاجُها ═══════════════════════════════════════════════
// موظّفٌ يضيف «أطراف صناعية» لمريضٍ بالخطأ. والتطبيقُ **يفتح له تلقائياً**
// طلبَ جهازٍ (`patient_device_episodes` بحالة `awaiting_exam`) وطلبَ مراجعةٍ
// للطبيب — لا قرارَ إنسانٍ فيهما، ولا معاينةَ ولا ديناراً ولا أمرَ تصنيع.
// ثمّ يضغط المسؤولُ سلّةَ بطاقة الحالة فيُردّ:
//   • «يوجد سجل أجهزة لهذا النوع — لا يمكن حذفه»  ← `caseHasEpisodes` كانت
//     `SELECT 1 … WHERE case_id = ?` **بلا شرطِ حالةٍ أو تاريخ**، فحتى حلقةٌ
//     `cancelled` فارغةٌ تحبس الخيطَ إلى الأبد؛
//   • أو نصَّ Postgres خاماً: `violates foreign key constraint
//     medical_review_requests_case_id_…` ← مفتاحٌ `NO ACTION` لم يتعلّمه أحد.
// **ولا مخرجَ ثالث**: إلغاءُ الحلقة لا يفكّ الحبس (ويترك طلبَه شبحاً)،
// والتصحيحُ الإداريّ يردّ ٤٠٤ لحلقةٍ لم تُبَع، و«تعديل مريض» يترك حالةً شبحاً.
// فصار خطأُ إدخالٍ في ثانيةٍ واحدة **غيرَ قابلٍ للتراجع إلى الأبد**.
//
// ══ القاعدة ═══════════════════════════════════════════════════════════════
// **الخلودُ يُكتسَب بالتاريخ لا بوجود الصفّ.** فالحالةُ تُسحَب متى كان **كلُّ**
// تابعٍ لها سقالةً أنشأها التطبيقُ ولم يستعملها أحد؛ وتُحجَب متى وُجد أثرٌ
// سريريٌّ أو ماليٌّ أو تصنيعيٌّ أو تسليميٌّ أو إداريٌّ واحد — **ويُسمّى الأثرُ
// وبابُه** بدل رسالةٍ مسدودة.
//
// ولا تُقرَّر السقالةُ بالنيّة: تُقرَّر بأن **لا شيءَ يشير إليها**.

import { sql } from "drizzle-orm";
import { isTerminal } from "@shared/followup";

/** الطرفيّةُ الخامسة (ترحيل ٠٧٩) — سُحب طلبُ الجهاز قبل التصنيع. */
const FOLLOWUP_REQUEST_CANCELLED = "closed_request_cancelled";

export type CaseServiceType = "prosthetic" | "medical_support" | "physiotherapy";

/** منفّذٌ داخل معاملة المُنادي — القرارُ يُعاد أخذُه تحت القفل لا قبله. */
type Executor = { execute: (q: any) => Promise<any> };

/** الحاجزُ باسمه وبابِه — لا نصَّ SQL خام، ولا «تعذّر الحذف» عارية. */
export interface CaseDisposalBlocker {
  /** رمزٌ للآلة والاختبار — لا يُعرَض. */
  code:
    | "signed_exam" | "followup" | "work_order" | "tagged_payment"
    | "pending_charge" | "discount_request" | "live_episode" | "reviewed_request";
  /** ما الذي يمنع، بالعربية. */
  reason: string;
  /** **الباب الصحيح** — فالمستخدم يخرج بخطوةٍ لا بحائط. */
  remedy: string;
}

/** ما سيُزال فعلاً حين تكون الحالةُ قابلةً للسحب — يُعرَض ويُدقَّق. */
export interface CaseScaffolding {
  /** حلقاتٌ `awaiting_exam`/`cancelled` لا يشير إليها شيء. */
  episodeIds: number[];
  /** طلباتُ مراجعةٍ معلَّقة/مُرجَعة بلا معاينة. */
  reviewRequestIds: number[];
  /** زياراتُ «إضافة نوع حالة» العلامية — تُحذف حذفاً ناعماً. */
  markerVisitIds: number[];
}

export type CaseDisposal =
  | { disposable: true; scaffolding: CaseScaffolding }
  | { disposable: false; blocker: CaseDisposalBlocker };

/**
 * **الحاجزُ يسافر مع الخطأ.** كان الرفضُ `Error` بنصٍّ واحد فيصل الشاشةَ
 * جملةً مسدودة؛ وهذا يحمل الرمزَ والسببَ **والباب** فتبنيها الواجهةُ عملاً
 * ممكناً بدل حائط.
 */
export class CaseDisposalBlockedError extends Error {
  readonly status = 409;
  constructor(readonly blocker: CaseDisposalBlocker) {
    super(blocker.reason);
    this.name = "CaseDisposalBlockedError";
  }
}

const SERVICE_LABEL: Record<string, string> = {
  prosthetic: "أطراف صناعية",
  medical_support: "مساند طبية",
  physiotherapy: "علاج طبيعي",
};

/** وسمُ الدفعات لكلّ خدمةِ جهاز — الحارسُ القائم، بلا تغيير. */
const PAYMENT_TAG: Record<string, string> = {
  prosthetic: "أطراف صناعية",
  medical_support: "مساند طبية",
};

/**
 * **حلقةٌ سقالية**: لم تتجاوز `awaiting_exam`، أو أُلغيت — و**لا شيءَ يشير
 * إليها**: لا معاينة (ولو ملغاة)، ولا متابعة، ولا أمرُ عمل، ولا مبلغٌ معلَّق.
 *
 * والشرطُ الثاني ليس زينة: حلقةٌ `cancelled` قد تكون أُلغيت **بعد** أن وُقّعت
 * عليها معاينةٌ ثمّ سقطت (٠٦١)، أو بعد إبطالٍ إداريّ (٠٦٤) — وتلك تاريخٌ
 * كامل لا سقالة.
 */
/**
 * **طلبُ مراجعةٍ لا يحكم شيئاً**: معلَّقٌ (لم يصل الطبيبَ بعد)، أو مُرجَعٌ إلى
 * الاستعلامات (طلبَ الطبيبُ تصحيحاً ولم يقرّر سريرياً)، أو **مسحوبٌ سلفاً**
 * — و**بلا معاينةٍ أُنجزت عنه** في كلّ الأحوال.
 *
 * **و`cancelled` منها بالضرورة**: هذا المسارُ نفسُه يكتبها حين يُلغى طلبُ
 * الجهاز (`cancelScaffoldRequestsForEpisode`)، فلو عُدّت «تاريخاً» لصار كلُّ
 * إلغاءِ حلقةٍ يحبس خيطَها إلى الأبد — وهو العطبُ بعينه الذي يغلقه هذا
 * الملفّ. (أمسكه مراجعٌ مستقلّ قبل الدمج.)
 *
 * أمّا `approved`/`escalated`/`examined` فقرارُ إنسانٍ وقع — تاريخٌ يمنع.
 */
const SCAFFOLD_REQUEST_STATUS_SQL = sql`
  r.status IN ('pending', 'returned', 'cancelled') AND r.exam_id IS NULL
`;
const SCAFFOLD_REQUEST_SQL = SCAFFOLD_REQUEST_STATUS_SQL;

const SCAFFOLD_EPISODE_SQL = sql`
  pde.status IN ('awaiting_exam', 'cancelled')
  AND NOT EXISTS (SELECT 1 FROM medical_exams me WHERE me.device_episode_id = pde.id)
  AND NOT EXISTS (SELECT 1 FROM post_exam_followups f WHERE f.device_episode_id = pde.id)
  AND NOT EXISTS (SELECT 1 FROM prosthetic_work_orders wo WHERE wo.device_episode_id = pde.id)
  AND NOT EXISTS (SELECT 1 FROM pending_service_charges pc WHERE pc.device_episode_id = pde.id)
  --  ══ **وكلُّ مفتاحٍ أجنبيٍّ يشير إليها يُفحَص هنا، لا بعضُه** ═══════════
  --  الحذفُ الفيزيائيّ يقع بعد هذا القرار مباشرةً؛ فمرجعٌ غيرُ مفحوصٍ يعني
  --  إمّا انفجارَ ٢٣٥٠٣ خامّاً على المستخدم (وهو العطبُ الذي نُغلقه)، وإمّا —
  --  أسوأ — هدمَ تاريخٍ حقيقيّ لو كان المفتاحُ كاسكيداً.
  AND NOT EXISTS (SELECT 1 FROM cost_entries ce WHERE ce.device_episode_id = pde.id)
  AND NOT EXISTS (SELECT 1 FROM payments pm WHERE pm.device_episode_id = pde.id)
  AND NOT EXISTS (SELECT 1 FROM visits v WHERE v.device_episode_id = pde.id)
  --  وطلبُ مراجعةٍ **يحكم الحلقة** مرساتُه هذه الحلقة: قرارٌ وقع — تاريخ.
  --  (والمعلَّقُ والمُرجَعُ والمسحوبُ سقالةٌ تُسحَب معها، لا حاجزٌ.)
  AND NOT EXISTS (
    SELECT 1 FROM medical_review_requests r
     WHERE r.device_episode_id = pde.id
       AND NOT (${SCAFFOLD_REQUEST_STATUS_SQL})
  )
`;

async function rows(tx: Executor, q: any): Promise<Record<string, any>[]> {
  const r = await tx.execute(q);
  return (r.rows ?? []) as Record<string, any>[];
}

/**
 * **القرارُ الواحد.** يُنادى **داخل معاملة الكتابة وتحت قفل المريض** — حالةُ
 * الشاشة ليست حدَّ أمان، وبين العرض والضغطة قد يوقّع طبيبٌ معاينةً أو يُفتَح
 * أمرُ تصنيع.
 */
export async function classifyCaseDisposal(
  tx: Executor,
  params: { patientId: number; caseId: number; caseType: CaseServiceType },
): Promise<CaseDisposal> {
  const { patientId, caseId, caseType } = params;
  const label = SERVICE_LABEL[caseType] ?? caseType;

  // ── ① معاينةٌ موقّعة — ولو أُلغيت لاحقاً ─────────────────────────────────
  //  الختمُ السريريّ (٠٢٨) لا يُمحى بحذف خيطه. وشاهدةُ الإلغاء (٠٦١) رفعت
  //  السلطةَ لا الشهادة، فالصفُّ ما زال سجلّاً طبّياً.
  if ((await rows(tx, sql`SELECT 1 FROM medical_exams WHERE case_id = ${caseId} LIMIT 1`)).length) {
    return {
      disposable: false,
      blocker: {
        code: "signed_exam",
        reason: `لهذا النوع (${label}) معاينةٌ طبّية موقّعة — والسجلُّ السريريّ لا يُحذف.`,
        remedy: "أغلِق الحالة بدل حذفها — يبقى السجلّ كاملاً وتخرج من طوابير العمل."
          + " وإن كانت المعاينةُ نفسُها خاطئة فألغِها من سجلّ المعاينات (يُلغيها صاحبُها أو المدير المسؤول).",
      },
    };
  }

  // ── ② متابعةُ ما بعد المعاينة ───────────────────────────────────────────
  if ((await rows(tx, sql`SELECT 1 FROM post_exam_followups WHERE case_id = ${caseId} LIMIT 1`)).length) {
    return {
      disposable: false,
      blocker: {
        code: "followup",
        reason: `لهذا النوع (${label}) متابعةُ قرارِ مريضٍ مسجَّلة بعد المعاينة.`,
        remedy: "أغلِق الحالة بدل حذفها — تبقى المتابعةُ وقرارُها كما هما."
          + " وإن كان القرارُ نفسُه خاطئاً فاحسمه من بطاقة «قرار المريض بعد المعاينة» أو صحّح العملية إدارياً.",
      },
    };
  }

  if (caseType !== "physiotherapy") {
    // ── ③ أمرُ تصنيعٍ أو صيانة — الحارسُ القائم بنصّه ──────────────────────
    const wo = await rows(tx, sql`
      SELECT 1 FROM prosthetic_work_orders
       WHERE patient_id = ${patientId} AND service_type = ${caseType} LIMIT 1
    `);
    if (wo.length) {
      return {
        disposable: false,
        blocker: {
          code: "work_order",
          reason: `يوجد سجل تصنيع أو صيانة لهذا النوع (${label}) — وتاريخُ التصنيع لا يُحذف.`,
          remedy: "أغلِق الحالة بدل حذفها — يبقى أمرُ التصنيع وسجلُّه ومراحلُه كما هي."
            + " وإن كان الأمرُ نفسُه خاطئاً فاستعمل «تصحيح / إلغاء العملية» الإداريّ.",
        },
      };
    }

    // ── ④ وسمٌ على مستوى المريض — الحارسُ القائم بنصّه ───────────────────
    //  يمسك دفعةَ جهازٍ لم تُربَط بحالةٍ قطّ، فلا يُضعَّف.
    const tag = PAYMENT_TAG[caseType];
    const paid = await rows(tx, sql`
      SELECT 1 FROM payments
       WHERE patient_id = ${patientId} AND payment_treatment_type LIKE ${"%" + tag + "%"} LIMIT 1
    `);
    if (paid.length) {
      return {
        disposable: false,
        blocker: {
          code: "tagged_payment",
          reason: `توجد دفعاتٌ موسومة بهذا النوع (${label}) — والمالُ المقبوض لا يُحذف.`,
          remedy: "أغلِق الحالة بدل حذفها — تبقى الدفعاتُ كما هي، ويُسجَّل ما يُسترجَع"
            + " حركةً مستقلّة. وإن كان الوسمُ نفسُه خاطئاً فعدّله من سجلّ الدفعات.",
        },
      };
    }
  }

  // ── ④ب مالٌ مربوطٌ بهذه الحالة بعينها — **في الأقسام الثلاثة** ──────────
  //  ══ ثغرةٌ سابقة على `main` ═══════════════════════════════════════════
  //  الحارسُ القائم يلفّ فحصَ الدفعات كلَّه في `caseType !== "physiotherapy"`،
  //  فحالةُ علاجٍ طبيعي قُبض عليها مالٌ فعلاً كانت تُقرأ «سقالة» وتُهدَم
  //  وتُعاد دفعاتُها إلى حالةٍ أخرى أو إلى `NULL`. ولا يُصلحه توسيعُ الوسم:
  //  **دفعةُ العلاج الطبيعي تُوسَم بنوع الجلسة** («روبوت»، «أبر صينية») لا
  //  بعبارة «علاج طبيعي»، فلا نصَّ واحداً تُمسَك به.
  //  والرابطُ `payments.case_id` هو الإشارةُ الدقيقة — وهو بعينه ما يحسب به
  //  الإغلاقُ صافيَ المقبوض. فمالٌ على الحالة = تاريخٌ يُغلَق ولا يُهدَم.
  const linked = await rows(tx, sql`
    SELECT 1 FROM payments WHERE case_id = ${caseId} LIMIT 1
  `);
  if (linked.length) {
    return {
      disposable: false,
      blocker: {
        code: "tagged_payment",
        reason: `توجد دفعاتٌ مسجَّلة على هذه الحالة (${label}) — والمالُ المقبوض لا يُحذف.`,
        remedy: "أغلِق الحالة بدل حذفها — تبقى الدفعاتُ كما هي، ويُسجَّل ما يُسترجَع"
          + " حركةً مستقلّة بسببها.",
      },
    };
  }

  // ── ⑤ مبلغُ «بلا معاينة» — **بأيّ حالة** ─────────────────────────────────
  //  المعلَّقُ والمُعادُ ينتظران إنساناً، والمُكتمَلُ **مالٌ قُيِّد فعلاً**.
  //  فالصفُّ بأيّ حالةٍ تاريخٌ يمنع — وجدولُ ٠٦٧ «تاريخٌ لا مسار» بنصّه.
  const charge = await rows(tx, sql`
    SELECT status FROM pending_service_charges WHERE case_id = ${caseId} LIMIT 1
  `);
  if (charge.length) {
    const open = ["pending_review", "returned"].includes(String(charge[0].status));
    return {
      disposable: false,
      blocker: {
        code: "pending_charge",
        reason: open
          ? `لهذا النوع (${label}) مبلغٌ سابقٌ بانتظار الإكمال.`
          : `لهذا النوع (${label}) عمليةُ «بلا معاينة» قُيِّد مبلغُها — والمالُ لا يُحذف.`,
        remedy: open
          ? "أنهِ المبلغ من «مبالغ سابقة بانتظار الإكمال» أوّلاً — لا يُغلَق ملفٌّ"
            + " وفيه مبلغٌ معلَّق ينتظر قراراً."
          : "أغلِق الحالة بدل حذفها — يبقى المبلغُ المقيَّد وقيدُه كما هما.",
      },
    };
  }

  // ── ⑥ طلبُ خصمٍ معلَّق ────────────────────────────────────────────────────
  const disc = await rows(tx, sql`
    SELECT 1 FROM service_discount_requests
     WHERE case_id = ${caseId} AND status = 'pending' LIMIT 1
  `);
  if (disc.length) {
    return {
      disposable: false,
      blocker: {
        code: "discount_request",
        reason: `لهذا النوع (${label}) طلبُ خصمٍ معلَّق لم يُحسَم.`,
        remedy: "احسم طلب الخصم (اعتماداً أو رفضاً) من طابور الاعتماد أوّلاً — لا"
          + " يُغلَق ملفٌّ وفيه طلبٌ ينتظر قراراً.",
      },
    };
  }

  // ── ⑦ حلقةُ جهازٍ حيّة أو ذاتُ تاريخ ─────────────────────────────────────
  const liveEpisodes = await rows(tx, sql`
    SELECT pde.id, pde.status FROM patient_device_episodes pde
     WHERE pde.case_id = ${caseId} AND NOT (${SCAFFOLD_EPISODE_SQL})
     LIMIT 1
  `);
  if (liveEpisodes.length) {
    return {
      disposable: false,
      blocker: {
        code: "live_episode",
        //  **ويبقى فيه «سجل أجهزة»** — نصُّ الحارس القديم حيث كان صادقاً:
        //  حلقةٌ اكتسبت تاريخاً فعلاً. وما تغيّر أن السقالةَ الفارغة لم تعد
        //  تُقرأ «سجلّاً».
        reason: `يوجد سجل أجهزة فعليّ لهذا النوع (${label}) — طلبُ جهازٍ تجاوز مرحلةَ الطلب (مُعايَن أو قيد التصنيع أو مُسلَّم).`,
        remedy: "أغلِق الحالة بدل حذفها — يبقى الجهازُ وحلقتُه وتسليمُه كما هي."
          + " وإن كانت العمليةُ نفسُها خاطئة فاستعمل «تصحيح / إلغاء العملية» الإداريّ.",
      },
    };
  }

  // ── ⑧ طلبُ مراجعةٍ حسمه إنسان ────────────────────────────────────────────
  const decided = await rows(tx, sql`
    SELECT 1 FROM medical_review_requests r
     WHERE r.case_id = ${caseId} AND NOT (${SCAFFOLD_REQUEST_SQL}) LIMIT 1
  `);
  if (decided.length) {
    return {
      disposable: false,
      blocker: {
        code: "reviewed_request",
        reason: `لهذا النوع (${label}) طلبُ مراجعةٍ حسمه الطبيب — والقرارُ سجلٌّ لا يُحذف.`,
        remedy: "أغلِق الحالة بدل حذفها — يبقى قرارُ الطبيب وسجلُّه كما هما."
          + " وإن كانت العمليةُ كلُّها خاطئة فاستعمل «تصحيح / إلغاء العملية» الإداريّ.",
      },
    };
  }

  // ── ⑨ كلُّ ما بقي سقالة ─────────────────────────────────────────────────
  const eps = await rows(tx, sql`
    SELECT pde.id FROM patient_device_episodes pde
     WHERE pde.case_id = ${caseId} AND (${SCAFFOLD_EPISODE_SQL}) ORDER BY pde.id
  `);
  //  **والمرساتان معاً لا إحداهما.** الحلقةُ تُعَدّ سقالةً بشرطٍ على
  //  `device_episode_id`، والصفُّ يُحذف بشرطٍ على `case_id` — فمفتاحان
  //  مختلفان لقرارٍ واحد. وطلبٌ مرساتُه الحلقةُ وحدها (بلا حالةٍ أو بحالةٍ
  //  أخرى) كان يجتاز شرطَ الحلقة ولا يدخل قائمةَ التحرير، فينفجر حذفُ
  //  الحلقة بـ٢٣٥٠٣ خامّاً — وهو العطبُ الذي نغلقه. (أمسكه مراجعٌ مستقلّ.)
  const episodeIds = eps.map((r) => Number(r.id));
  const reqs = await rows(tx, sql`
    SELECT r.id FROM medical_review_requests r
     WHERE (${SCAFFOLD_REQUEST_SQL})
       AND (r.case_id = ${caseId}
            ${episodeIds.length
              ? sql`OR r.device_episode_id IN (${sql.join(episodeIds.map((i) => sql`${i}`), sql`, `)})`
              : sql``})
     ORDER BY r.id
  `);
  //  زيارةُ «إضافة نوع حالة» علامةٌ يكتبها المسارُ نفسُه لا حضورَ مريض.
  //  تُحذف **ناعماً** لا تُنقَل: نقلُها إلى الخيط الباقي يُبقي علامةً تقول
  //  إن نوعاً أُضيف — وقد سُحب. والحذفُ الناعم يُبقيها في السجلّ الجنائي.
  //
  //  **والمطابقةُ على `details` وحده** — وهو ما يكتبه `addPatientCaseType`
  //  حرفياً. و`notes LIKE '%…%'` كانت تلتقط أيّ ملاحظةٍ بشريّةٍ تصادف أن
  //  تذكر العبارة، فتحذف زيارةً حقيقية.
  const markers = await rows(tx, sql`
    SELECT id FROM visits
     WHERE case_id = ${caseId} AND deleted_at IS NULL
       AND details = 'إضافة نوع حالة'
     ORDER BY id
  `);

  return {
    disposable: true,
    scaffolding: {
      episodeIds,
      reviewRequestIds: reqs.map((r) => Number(r.id)),
      markerVisitIds: markers.map((r) => Number(r.id)),
    },
  };
}

/**
 * **سحبُ السقالة — داخل معاملة المُنادي.** لا تُنادى إلّا بعد `classifyCaseDisposal`
 * في المعاملة نفسِها: القرارُ والتنفيذُ حدثٌ واحد أو لا شيء.
 *
 * والترتيبُ مقصود: الطلباتُ تُسحَب **قبل** حذف الحلقات (مفتاحُها الأجنبيّ
 * `device_episode_id`)، والحلقاتُ قبل حذف صفّ الحالة (`case_id`).
 */
export async function disposeCaseScaffolding(
  tx: Executor,
  params: {
    scaffolding: CaseScaffolding;
    reason: string;
    actor: { userId: number | null; userName: string | null };
  },
): Promise<void> {
  const { scaffolding, reason, actor } = params;

  if (scaffolding.reviewRequestIds.length) {
    await withdrawRequestsTx(tx, {
      ids: scaffolding.reviewRequestIds,
      note: `سُحبت الحالة: ${reason}`,
      actor,
      releaseAnchors: true,
    });
  }

  if (scaffolding.markerVisitIds.length) {
    //  **ناعماً ومفصولةً معاً**: الحذفُ الناعم يُخرجها من كلّ قراءة (ولا
    //  يستثير الجدولَ الجنائيّ، فذاك للهدم الحقيقيّ)، والفصلُ عن الحالة
    //  يمنع النقلَ التالي من إسنادها إلى الخيط الباقي — فلا يقرأ أحدٌ على
    //  خيط العلاج الطبيعي زيارةً تقول إن نوعاً أُضيف، وقد سُحب.
    await tx.execute(sql`
      UPDATE visits SET deleted_at = NOW(), case_id = NULL
       WHERE id IN (${sql.join(scaffolding.markerVisitIds.map((i) => sql`${i}`), sql`, `)})
    `);
  }

  if (scaffolding.episodeIds.length) {
    //  **الحذفُ الفيزيائيّ هنا هو الصدق**: صفٌّ فتحه التطبيقُ ولم يستعمله
    //  أحد ليس تاريخاً يُحفَظ — و`classifyCaseDisposal` أثبتت للتوّ أن لا
    //  معاينةَ ولا متابعةَ ولا أمرَ ولا مبلغَ يشير إليه.
    await tx.execute(sql`
      DELETE FROM patient_device_episodes
       WHERE id IN (${sql.join(scaffolding.episodeIds.map((i) => sql`${i}`), sql`, `)})
    `);
  }
}

/**
 * **وسحبُ طلبِ جهازٍ يسحب طلبَ مراجعته معه** (INT-06 = RTP-5).
 *
 * كان إلغاءُ الحلقة يترك `medical_review_requests` معلَّقاً إلى الأبد: يقرأ
 * الطبيبُ طلبَ جهازٍ سُحب، ويشغل مرساةَ التفرّد فيُردّ الطلبُ الصحيح ٤٠٩.
 * يُنادى **داخل معاملة الإلغاء** فيقعان معاً أو لا يقع شيء.
 */
export async function cancelScaffoldRequestsForEpisode(
  tx: Executor,
  params: {
    episodeId: number;
    reason: string;
    actor: { userId: number | null; userName: string | null };
  },
): Promise<number[]> {
  //  **والمسحوبُ سلفاً لا يُعاد سحبُه**: شرطُ الحالة يستثني `cancelled`
  //  فلا تُكتب ملاحظةُ سحبٍ ثانية على صفٍّ سُحب من قبل.
  const found = await rows(tx, sql`
    SELECT r.id FROM medical_review_requests r
     WHERE r.device_episode_id = ${params.episodeId}
       AND r.status IN ('pending', 'returned') AND r.exam_id IS NULL
     FOR UPDATE
  `);
  const ids = found.map((x) => Number(x.id));
  if (!ids.length) return [];
  await withdrawRequestsTx(tx, {
    ids,
    note: `أُلغي طلبُ الجهاز: ${params.reason}`,
    actor: params.actor,
    //  **والمرساةُ تبقى هنا**: الحلقةُ باقيةٌ (أُلغيت لا حُذفت)، فربطُ الطلب
    //  بها ما زال صادقاً ومفيداً للتدقيق. وفهرسُ التفرّد مشروطٌ بـ`pending`
    //  فتحرَّر بتغيّر الحالة وحدها.
    releaseAnchors: false,
  });
  return ids;
}

/**
 * **السحبُ يضيف ولا يمحو** — الكتابةُ الواحدة التي يشاركها البابان.
 *
 * ══ ولماذا لا تُكتب `decision = NULL` فوق ما كان ═══════════════════════════
 * طلبٌ حالتُه `returned` يحمل **قرارَ طبيبٍ حقيقياً**: `decision =
 * 'return_to_reception'`، ومعه `decided_by` و`doctor_note` بالسبب الإلزاميّ
 * الذي كتبه («جهة البتر غير صحيحة — عدّلها وأعد إرسال الطلب»). ومحوُ
 * الثلاثة يهدم شهادةً طبّيةً وقعت — وهو ما يمنعه الثابتُ الأوّل صراحةً.
 * (أمسكه مراجعٌ مستقلّ قبل الدمج.)
 *
 * **فالقرارُ يبقى كما هو**، و`decided_by`/`decided_at` لا يُكتَبان إلّا إن
 * كانا فارغين (طلبٌ معلَّق لم يقرّر فيه أحدٌ شيئاً)، **والملاحظةُ تُلحَق**
 * بسطرٍ جديد يقول مَن سحب ولماذا ومتى. فيُقرأ الصفُّ كاملاً: ما قرّره
 * الطبيبُ يومَها، ثمّ أن الطلبَ سُحب بعده.
 */
async function withdrawRequestsTx(
  tx: Executor,
  params: {
    ids: number[];
    note: string;
    actor: { userId: number | null; userName: string | null };
    /** هل تُحرَّر المرساتان؟ — نعم حين تُحذف الحالةُ والحلقةُ بعد أسطر. */
    releaseAnchors: boolean;
  },
): Promise<void> {
  const { ids, note, actor, releaseAnchors } = params;
  if (!ids.length) return;
  const by = actor.userName ? ` بواسطة ${actor.userName}` : "";
  const idList = sql.join(ids.map((i) => sql`${i}`), sql`, `);
  //  **والمرساتان تُقالان قبل أن تُحرَّرا.** الحالةُ والحلقةُ تُحذفان بعد
  //  أسطر ومفتاحاهما `NO ACTION`، فبقاؤهما يعني ٢٣٥٠٣ خامّاً على وجه
  //  المستخدم. وكلُّ تعابير `SET` في Postgres تقرأ الصفَّ **قبل** التحديث،
  //  فيُلتقَط رقماهما في الملاحظة وتُفرَّغ الأعمدةُ في الجملة نفسِها.
  const anchorText = releaseAnchors
    ? sql` || COALESCE(' (الحالة #' || case_id::text || ')', '')
           || COALESCE(' (طلب الجهاز #' || device_episode_id::text || ')', '')`
    : sql``;
  await tx.execute(sql`
    UPDATE medical_review_requests
       SET status = 'cancelled',
           --  القرارُ السابق يبقى؛ والفارغُ يبقى فارغاً (لا قرارَ يُدَّعى).
           decided_at = COALESCE(decided_at, NOW()),
           decided_by = COALESCE(decided_by, ${actor.userId}),
           updated_at = NOW(),
           --  **تُلحَق لا تُستبدَل** — وسببُ الطبيب يبقى أوّلَ ما يُقرأ.
           doctor_note = CASE
             WHEN COALESCE(btrim(doctor_note), '') = ''
               THEN ${note + by}${anchorText}
             ELSE doctor_note || E'\n' || ${note + by}${anchorText}
           END
           ${releaseAnchors
             ? sql`, case_id = NULL, device_episode_id = NULL`
             : sql``}
     WHERE id IN (${idList})
  `);
}

/**
 * **وتتقاعد متابعتُه الحيّة معه** — بالسبب الحقيقيّ (INT-06 = RTP-5).
 *
 * حلقةٌ `examined` تحمل متابعةً وُلدت عن توقيع معاينتها. وسحبُ الطلب كان
 * يتركها حيّةً إلى الأبد: تُعرَض في «بانتظار الحسم» على جهازٍ سُحب،
 * و«لم يشترِ» عليها تكتب قراراً لم يتّخذه المريض، و«إتمام البيع» يعلّق.
 *
 * **والمنتهيةُ لا يُعاد كتابةُ تاريخها** (درسُ INT-01 بالحرف): «لم يشترِ»
 * واقعةٌ قالها المريضُ يومَها، وسحبُ الطلب لاحقاً لا يجعلها شيئاً آخر.
 * فيتقاعد ما كان **حيّاً** وحده.
 *
 * **ولا معاملةَ ثانية**: يُنادى داخل معاملة الإلغاء، فيقعان معاً أو لا شيء.
 */
export async function retireFollowupForCancelledEpisode(
  tx: Executor,
  params: {
    episodeId: number;
    patientId: number;
    branchId: number | null;
    reason: string;
    actor: { userId: number | null; userName: string | null };
  },
): Promise<number | null> {
  const found = await rows(tx, sql`
    SELECT id, status FROM post_exam_followups
     WHERE device_episode_id = ${params.episodeId}
     FOR UPDATE
  `);
  const live = found.find((f) => !isTerminal(String(f.status)));
  if (!live) return null;

  const id = Number(live.id);
  const from = String(live.status);
  await tx.execute(sql`
    UPDATE post_exam_followups
       SET status = ${FOLLOWUP_REQUEST_CANCELLED}, updated_at = NOW()
     WHERE id = ${id}
  `);
  await tx.execute(sql`
    INSERT INTO post_exam_followup_events
      (followup_id, patient_id, branch_id, event_type, from_status, to_status,
       reason, note, payload, actor_user_id, actor_name)
    VALUES (${id}, ${params.patientId}, ${params.branchId},
            ${FOLLOWUP_REQUEST_CANCELLED}, ${from}, ${FOLLOWUP_REQUEST_CANCELLED},
            ${"device_request_cancelled"}, ${params.reason},
            ${JSON.stringify({ deviceEpisodeId: params.episodeId })}::jsonb,
            ${params.actor.userId}, ${params.actor.userName})
  `);
  return id;
}
