// **إلغاءُ طلبِ معاينةٍ لم تبدأ** — زرُّ «إلغاء المعاينة» في «معايناتي».
//
// ══ الواقعة ═══════════════════════════════════════════════════════════════
// الاستقبالُ يفتح «طلب جهاز» أو يضيف نوعَ حالةٍ بالخطأ، أو يعود المريضُ فلا
// يريد شيئاً. فيظهر في قائمة عمل الطبيب صفٌّ لا معاينةَ فيه ولا عملَ — ولم
// يكن للطبيب إلّا بابان: أن **يوقّع معاينةً يعرف أنها لا لزوم لها** ليُخرجها
// من قائمته، أو «إرجاع للاستعلامات» الذي يقول «صحّح البيانات وأعد الإرسال»
// — وكلاهما يصف شيئاً لم يحدث.
//
// ══ القاعدة ═══════════════════════════════════════════════════════════════
// **ما لم تبدأ معاينتُه يُلغى طلبُه، وما بدأ لا يُمَسّ.** والفعلُ يقع على
// **صفٍّ بعينه** لا على المريض كلِّه (تدقيق ٢٠٢٦-٠٩-١٢، هويّةُ الجهاز):
//   • صفٌّ بحلقة  ⟶ تُلغى **حلقتُه هي** ويُسحَب طلبُ مراجعتها معها.
//   • صفٌّ بلا حلقة ⟶ يُسحَب **الطلبُ على مستوى الاختصاص** الذي يُبقيه.
// وحلقةٌ أخرى منتظرةٌ على الخيط نفسِه **لا تُمَسّ**: هي صفٌّ آخر بزرّه.
//
// ══ وما لا يفعله ══════════════════════════════════════════════════════════
// **لا يُنشئ معاينةً ولا يُلغي واحدة**: لا صفَّ في `medical_exams` ولا في
// `medical_exam_cancellations` — فالمعاينةُ لم تُكتب أصلاً، وتلفيقُ سجلٍّ
// سريريٍّ لإغلاق طابورٍ يكتب ماضياً لم يقع. ولا يمسّ الحالةَ ولا يحذف صفَّها
// (بابُه الإدارة)، ولا مالاً، ولا أمرَ تصنيع، ولا دفعة، ولا قيداً.
//
// ══ والكتابةُ من طبقتها لا من هنا ═════════════════════════════════════════
// الحلقةُ تُلغى بـ`cancelPreManufacturingDeviceEpisodeTx` — **الدالّة
// القانونية نفسُها** التي تناديها نقطةُ إلغاء الجهاز، بحرّاسها كاملةً
// (`in_manufacturing` مرفوضة) وبسحبِ طلبِ مراجعتها وتقاعدِ متابعتها الحيّة.
// والطلبُ يُسحَب بـ`cancelScaffoldRequestsById` — كاتبُ «يضيف ولا يمحو»
// نفسُه (المرحلة الثالثة). **ولا نسخةَ ثانية من أيٍّ منهما هنا.**

import { sql } from "drizzle-orm";
import { db } from "../db";
import { PATIENT_IN_TRASH_ERROR } from "@shared/patient_trash";
import type { MedicalSpecialty } from "@shared/medical";
import { cancelPreManufacturingDeviceEpisodeTx } from "../device_episodes/store";
import { cancelScaffoldRequestsById } from "../patient_cases/disposal";
import { lockSpecialtyLevelQueueRequestsTx } from "../medical_review/store";

/** خطأُ عملٍ يحمل رمزَه ورسالتَه العربية — فتردّ النقطةُ ٤٠٩ لا ٥٠٠. */
export class CancelExamRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "CancelExamRequestError";
  }
}

export interface CancelExamRequestResult {
  /** الحلقةُ التي أُلغيت — `null` لصفٍّ بلا حلقة. */
  cancelledEpisodeId: number | null;
  /** أرقامُ طلبات المراجعة التي سُحبت (المرساة والعارية معاً). */
  cancelledRequestIds: number[];
  /** فرعُ المريض وقتَ الإلغاء — للتدقيق. */
  branchId: number | null;
}

type Executor = { execute: (q: any) => Promise<any> };

async function rows(tx: Executor, q: any): Promise<Record<string, any>[]> {
  const r = await tx.execute(q);
  return (r.rows ?? []) as Record<string, any>[];
}

/**
 * **الفعلُ كلُّه في معاملةٍ واحدة تحت قفل المريض.**
 *
 * وحالةُ الشاشة ليست حدَّ أمان: بين رسم الصفّ والضغطة قد يوقّع طبيبٌ آخر
 * معاينةً على هذه الحلقة بعينها، أو يُحيل الطلبَ، أو يُنقَل المريضُ فرعاً.
 * فكلُّ ما يقرّر يُقرأ **الآن وتحت القفل** ويُطابَق، والتناقضُ يُردّ ٤٠٩
 * **بصفر كتابة** — لا نصفَ إلغاء.
 */
export async function cancelExamRequest(params: {
  patientId: number;
  caseType: MedicalSpecialty;
  /** هويّةُ الجهاز من الصفّ — `null` لصفٍّ بلا حلقة. لا يُخمَّن أبداً. */
  deviceEpisodeId: number | null;
  reason: string;
  actor: { userId: number | null; userName: string | null };
  /** نطاقُ الجلسة الحيّ — `null` للمسؤول العام. */
  branchIds: number[] | null;
}): Promise<CancelExamRequestResult> {
  const reason = (params.reason ?? "").trim();
  if (!reason) {
    throw new CancelExamRequestError("سبب الإلغاء إلزامي", 400, "reason_required");
  }

  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(919, ${params.patientId})`);

    // ── ① المريضُ تحت القفل — لا لقطةَ ما قبلَه ────────────────────────────
    const [patient] = await rows(tx, sql`
      SELECT id, branch_id, deleted_at FROM patients
       WHERE id = ${params.patientId} FOR UPDATE
    `);
    if (!patient) throw new CancelExamRequestError("المريض غير موجود", 404, "patient_missing");
    if (patient.deleted_at) {
      throw new CancelExamRequestError(PATIENT_IN_TRASH_ERROR, 409, "patient_in_trash");
    }
    //  **ونطاقُ الفرع يُعاد فحصُه من الصفّ المقفول**: قد يُنقَل المريضُ بين
    //  المعاينة والتنفيذ، والفحصُ في النقطة ردٌّ مبكّرٌ لا الحارسُ الأخير.
    const branchId = patient.branch_id === null ? null : Number(patient.branch_id);
    if (params.branchIds !== null
      && (branchId === null || !params.branchIds.includes(branchId))) {
      throw new CancelExamRequestError(
        "لا يمكنك التعديل على مريض فرع آخر", 403, "branch_out_of_scope",
      );
    }

    // ── ② الحالةُ تحت القفل — والنشطةُ وحدها لها طابور ────────────────────
    const [caseRow] = await rows(tx, sql`
      SELECT id, status FROM patient_cases
       WHERE patient_id = ${params.patientId} AND case_type = ${params.caseType}
       FOR UPDATE
    `);
    if (!caseRow) {
      throw new CancelExamRequestError(
        "لا توجد حالة من هذا النوع لهذا المريض", 404, "case_missing",
      );
    }
    if (String(caseRow.status) !== "active") {
      throw new CancelExamRequestError(
        "هذه الحالة مغلقة — لم تعد في طابور المعاينة", 409, "case_not_active",
      );
    }

    // ── ③ القراراتُ كلُّها قبل أيّ كتابة — ولا نصفَ إلغاء ──────────────────
    //  الحلقةُ **بمعرّفها** لا بـ«الحلقة المنتظرة»: للخيط الواحد أكثرُ من
    //  حلقةٍ منتظرة بعد ترحيل ٠٧٣، وكلٌّ صفٌّ مستقلّ.
    let episodeToCancel: number | null = null;
    if (params.deviceEpisodeId !== null) {
      const [ep] = await rows(tx, sql`
        SELECT id, status, service_path FROM patient_device_episodes
         WHERE id = ${params.deviceEpisodeId}
           AND patient_id = ${params.patientId}
           AND case_id = ${caseRow.id}
         FOR UPDATE
      `);
      //  **والبياتُ يُقال بياتاً**: حلقةٌ وُقّعت عليها معاينةٌ للتوّ صارت
      //  `examined` — والصفُّ الذي ضغطه الطبيبُ لم يعد قائماً. ولا يُلغى
      //  ما بدأت معاينتُه.
      if (!ep || String(ep.status) !== "awaiting_exam") {
        throw new CancelExamRequestError(
          "تغيّر هذا الطلب — حدّث الصفحة", 409, "device_episode_stale",
        );
      }
      //  ومسارُ «بلا معاينة» ليس من هذا الطابور أصلاً (ترحيل ٠٦٥): لا يُعرَض
      //  فيه ولا يُلغى منه — وبابُه التصحيحُ الإداريّ.
      if (String(ep.service_path ?? "") === "no_exam") {
        throw new CancelExamRequestError(
          "هذا الطلب على مسار «بلا معاينة» — لا يُلغى من قائمة المعاينات",
          409, "no_exam_path",
        );
      }
      episodeToCancel = Number(ep.id);
    }

    //  الطلباتُ على مستوى الاختصاص — هي ما يُبقي **الصفَّ بلا حلقة** قائماً.
    //  وتُقرأ في الحالتين: صفٌّ بحلقة قد يحمل طلباً عارياً بجانبه، وسحبُه
    //  معه يمنع الصفَّ من العودة بلا جهاز بعد لحظة (المُعادُ إنتاجُه حيّاً).
    const specialtyRequests = await lockSpecialtyLevelQueueRequestsTx(tx, {
      patientId: params.patientId,
      serviceType: params.caseType,
      branchIds: params.branchIds,
    });
    //  **وقرارُ الطبيب لا يُسحَب من هنا**: `escalated` إحالةٌ وقعت — طبيبٌ
    //  نظر وقال «يتطلّب معاينة كاملة». وبابُها «إرجاع للاستعلامات» بسببه،
    //  لا زرٌّ يمحوها بلا أثر.
    const escalated = specialtyRequests.filter((r) => r.status === "escalated");
    if (escalated.length > 0) {
      throw new CancelExamRequestError(
        "هذه الحالة أحالها طبيبٌ إلى معاينة كاملة — استعمل «إرجاع للاستعلامات» بسببها",
        409, "request_escalated",
      );
    }
    const pendingIds = specialtyRequests.filter((r) => r.status === "pending").map((r) => r.id);

    //  **ولا ضغطةٌ بلا أثر**: صفٌّ لا حلقةَ له ولا طلبَ لم يعد فيه ما يُلغى
    //  — إمّا سبقه غيرُه، وإمّا يقف على قاعدةٍ أخرى بابُها الإدارة.
    if (episodeToCancel === null && pendingIds.length === 0) {
      throw new CancelExamRequestError(
        "لا يوجد طلبُ معاينةٍ قابلٌ للإلغاء على هذا الصفّ — حدّث الصفحة",
        409, "nothing_to_cancel",
      );
    }

    // ── ④ الكتابة — بالدالّات القانونية وحدها ─────────────────────────────
    const cancelledRequestIds: number[] = [];
    if (episodeToCancel !== null) {
      const done = await cancelPreManufacturingDeviceEpisodeTx(tx, {
        patientId: params.patientId,
        episodeId: episodeToCancel,
        reason,
        actor: params.actor,
      });
      cancelledRequestIds.push(...done.cancelledReviewRequestIds);
    }
    if (pendingIds.length > 0) {
      await cancelScaffoldRequestsById(tx, {
        ids: pendingIds, reason, actor: params.actor,
      });
      cancelledRequestIds.push(...pendingIds);
    }

    return {
      cancelledEpisodeId: episodeToCancel,
      //  فرزٌ وإزالةُ تكرارٍ بلا `Set` مُفكَّك: هدفُ TypeScript في هذا
      //  المستودع يسبق `downlevelIteration`.
      cancelledRequestIds: cancelledRequestIds
        .filter((id, i) => cancelledRequestIds.indexOf(id) === i)
        .sort((a, b) => a - b),
      branchId,
    };
  });
}
