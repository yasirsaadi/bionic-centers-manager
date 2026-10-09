// **«استمارة المراجع» مكتملةً لكلّ جهاز** (§4.cq، ملاحظاتُ المالك ٢٠٢٦-١٠-٠٨) — قراءةٌ محضة، لا كتابةَ هنا.
//
// تجمع لكلّ جهازٍ (حلقةٍ غير ملغاة) ما في ورقته: حقولَ الاستعلامات من ملفّ المريض، و«المعاينة الطبية» من معاينة **ذلك الجهاز**
// (لا آخرِ معاينةٍ للمريض)، وخاناتِ الجهاز مدموجةً (`mergeDeviceSpecs`: الطبيبُ أوّلاً وما ملأه الاستعلاماتُ يسدّ الفراغ)، والمبلغَ من
// قرار الحسم (النهائيّ `agreed_cost`، والأصليّ ونوعُه من المتابعة أو من شروط بيع الجزء)، والمدفوعَ صافياً من دفعات الجهاز
// (والمردودُ صفٌّ سالب فيها — `recordRefundPaymentTx`)، والمراجعاتِ من سجلّ الزيارات نفسِه (`visits.device_episode_id`) — ومعها
// زيارتا «طلب معاينة طبية» و«عاد للشراء» بلحظة كتابتهما (§4.cv).
import { sql } from "drizzle-orm";
import { db } from "../db";
import { activeExamSql } from "../medical/active_exam";
import { deviceSpecsFromPrescription } from "../medical/episode_prescription";
import { mergeDeviceSpecs } from "@shared/device_specs";
import { normalizeExtraComponents } from "@shared/prosthetic_parts";
import { storedSaleLines } from "@shared/part_sale";
import { buildAmputationSite } from "@shared/case_fields";
import { examSheetTextOf } from "@shared/exam_sheet";
import { ATTENDANCE_REASONS } from "@shared/attendance";
import { attachPaymentsToVisits } from "@shared/visit_payments";
import { baghdadDayOf, type IntakeSheet, type IntakeSheetPatient, type IntakeSheetsResponse, type IntakeSheetVisit, type SheetServiceType } from "@shared/intake_sheet_view";
import { requestedItemEditable } from "@shared/patient_edit_rules";

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
//  **تاريخٌ بصيغةٍ قياسية** (`…T…Z`) كبقيّة الأبواب — النصُّ الخامُ من القاعدة («2026-10-08 11:40:34+00») لا يقرؤه متصفّحُ آيفون فيخرج التاريخُ فارغاً.
const iso = (v: unknown): string | null => {
  if (v === null || v === undefined || v === "") return null;
  const d = v instanceof Date ? v : new Date(v as string);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export async function intakeSheetsFor(
  patientId: number,
  opts: { withMoney: boolean; /** مَن يعدّل «المطلوب» (§4.db) — `null` لمن لا يملك «تعديل مرضى». */ editor?: { privileged: boolean } | null },
): Promise<IntakeSheetsResponse | null> {
  const pr = await db.execute(sql`
    SELECT p.patient_code, p.name, p.phone, p.governorate, p.address, p.referral_source, p.referral_sub_source,
           p.had_prior_center_history, p.age, p.weight, p.height, p.injury_cause, p.injury_date::text AS injury_date,
           p.injury_date_status, p.general_notes, p.amputation_site, p.support_type, p.injury_side, b.name AS branch_name
      FROM patients p LEFT JOIN branches b ON b.id = p.branch_id
     WHERE p.id = ${patientId} AND p.deleted_at IS NULL
  `);
  const p = (pr.rows ?? [])[0] as Record<string, any> | undefined;
  if (!p) return null;
  const patient: IntakeSheetPatient = {
    patientCode: str(p.patient_code), name: str(p.name), phone: str(p.phone), governorate: str(p.governorate),
    address: str(p.address), referralSource: str(p.referral_source), referralSubSource: str(p.referral_sub_source),
    hadPriorCenterHistory: typeof p.had_prior_center_history === "boolean" ? p.had_prior_center_history : null,
    age: str(p.age), weight: str(p.weight), height: str(p.height), injuryCause: str(p.injury_cause),
    injuryDate: str(p.injury_date), injuryDateStatus: str(p.injury_date_status), generalNotes: str(p.general_notes),
    branchName: str(p.branch_name),
  };

  const er = await db.execute(sql`
    SELECT e.id, e.sequence_number, e.status, e.requested_item, e.extra_components, e.agreed_cost, e.created_at, e.device_specs,
           e.sold_ready_at, e.sale_lines, e.admin_void_reversal_id,
           EXISTS (SELECT 1 FROM post_exam_followups fx WHERE fx.device_episode_id = e.id) AS has_followup,
           e.component_sale_original_price, e.component_sale_price_kind, pc.case_type, b.name AS branch_name,
           ex.chief_complaint, ex.clinical_findings, ex.diagnosis, ex.plan, ex.notes, ex.doctor_name, ex.signed_at, ex.prescription,
           f.status AS f_status, f.price_kind AS f_price_kind, f.original_price AS f_original_price,
           f.converted_at AS f_converted_at, f.purchase_decision_at AS f_decided_at, f.not_bought_reason_text AS f_reason,
           (SELECT COALESCE(SUM(pay.amount), 0)::int FROM payments pay WHERE pay.device_episode_id = e.id) AS paid
      FROM patient_device_episodes e
      JOIN patient_cases pc ON pc.id = e.case_id
      LEFT JOIN branches b ON b.id = e.branch_id
      LEFT JOIN LATERAL (
        SELECT me.chief_complaint, me.clinical_findings, me.diagnosis, me.plan, me.notes, me.doctor_name, me.signed_at, me.prescription
          FROM medical_exams me
         WHERE me.device_episode_id = e.id AND me.case_type = pc.case_type AND ${activeExamSql("me")}
         ORDER BY me.signed_at DESC, me.id DESC LIMIT 1
      ) ex ON TRUE
      LEFT JOIN LATERAL (
        SELECT f0.status, f0.price_kind, f0.original_price, f0.converted_at, f0.purchase_decision_at, f0.not_bought_reason_text
          FROM post_exam_followups f0 WHERE f0.device_episode_id = e.id
         ORDER BY f0.id DESC LIMIT 1
      ) f ON TRUE
     WHERE e.patient_id = ${patientId} AND e.status <> 'cancelled'
       AND pc.case_type IN ('prosthetic', 'medical_support')
     ORDER BY e.created_at, e.id
  `);
  const rows = (er.rows ?? []) as Record<string, any>[];

  const ids = rows.map((r) => Number(r.id));
  const visitsBy = new Map<number, IntakeSheet["visits"]>();
  if (ids.length) {
    const idsArr = `{${ids.join(",")}}`;
    //  ══ **زياراتُ الجهاز — ومنها اثنتان لا تحملان رقمَه** (ملاحظةُ المالك ٢٠٢٦-١٠-٠٨، §4.cv) ══
    //  «طلب معاينة طبية» و«عاد للشراء» تُكتبان بلا ربطٍ بالحلقة **عمداً**: حلقةٌ تشير إليها زيارةٌ تصير تاريخاً لا يُسحَب
    //  (`classifyCaseDisposal`)، فيبقى الطلبُ الخاطئ قابلاً للسحب. لكنّ كلتيهما تُكتب **في معاملة الحلقة نفسِها**، و`now()` في
    //  المعاملة لحظةٌ واحدة — فزيارةُ الطلب لحظتُها `created_at` الحلقة، وزيارةُ «عاد للشراء» لحظتُها `created_at` طلب المراجعة
    //  الذي فتحته على الحلقة. فالمطابقةُ تامّةٌ بلا تخمين، ولا صفَّ يُكتب ولا ترحيل — والقديمُ يظهر كالجديد.
    const vr = await db.execute(sql`
      SELECT v.id, x.episode_id AS device_episode_id, v.visit_date, v.details, v.notes, v.case_id
        FROM visits v
        JOIN LATERAL (
          SELECT v.device_episode_id AS episode_id WHERE v.device_episode_id = ANY(${idsArr}::int[])
          UNION ALL
          SELECT e.id FROM patient_device_episodes e
           WHERE v.device_episode_id IS NULL AND v.details = ${ATTENDANCE_REASONS.examRequest}
             AND e.id = ANY(${idsArr}::int[]) AND e.patient_id = v.patient_id AND e.created_at::timestamp = v.visit_date
          UNION ALL
          SELECT r.device_episode_id FROM medical_review_requests r
           WHERE v.device_episode_id IS NULL AND v.details = ${ATTENDANCE_REASONS.returnToPurchase}
             AND r.review_kind = 'return_to_purchase' AND r.patient_id = v.patient_id
             AND r.device_episode_id = ANY(${idsArr}::int[]) AND r.created_at::timestamp = v.visit_date
        ) x ON TRUE
       WHERE v.patient_id = ${patientId} AND v.deleted_at IS NULL
       ORDER BY v.visit_date, v.id
    `);
    for (const v of (vr.rows ?? []) as Record<string, any>[]) {
      const list = visitsBy.get(Number(v.device_episode_id)) ?? [];
      list.push({ id: Number(v.id), kind: "visit", date: iso(v.visit_date), details: str(v.details), notes: str(v.notes), paid: null });
      visitsBy.set(Number(v.device_episode_id), list);
    }
    //  ══ **ما دُفع في كلّ مراجعة** (ملاحظةُ المالك ٢٠٢٦-١٠-٠٨) — لمن يرى المال وحده ══
    //  دفعةُ «إتمام البيع» لا تحمل رقمَ زيارتها (`payments.visit_id` فارغ) لكنها وزيارةُ الشراء تُكتبان في اللحظة نفسها على الجهاز
    //  نفسِه — فالربطُ بالقاعدة الواحدة (`attachPaymentsToVisits`): رقمُ الزيارة إن حُمل، وإلّا الأقربُ وقتاً من زيارات الجهاز في
    //  يوم بغداد نفسِه؛ ويومٌ بلا زيارةٍ سطرُ «دفعة» مستقلّ.
    if (opts.withMoney) {
      const pr2 = await db.execute(sql`
        SELECT id, device_episode_id, visit_id, amount, date, notes FROM payments
         WHERE device_episode_id = ANY(${idsArr}::int[])
         ORDER BY date, id
      `);
      const paysBy = new Map<number, { id: number; amount: number; date: string | null; visitId: number | null; deviceEpisodeId: number; notes: string | null }[]>();
      for (const p0 of (pr2.rows ?? []) as Record<string, any>[]) {
        const ep = Number(p0.device_episode_id);
        const list = paysBy.get(ep) ?? [];
        list.push({
          id: Number(p0.id), amount: Number(p0.amount ?? 0), date: iso(p0.date), deviceEpisodeId: ep,
          visitId: p0.visit_id === null || p0.visit_id === undefined ? null : Number(p0.visit_id), notes: str(p0.notes),
        });
        paysBy.set(ep, list);
      }
      for (const [ep, pays] of Array.from(paysBy.entries())) {
        const list: IntakeSheetVisit[] = visitsBy.get(ep) ?? [];
        const { byVisit, unattached } = attachPaymentsToVisits(list.map((v) => ({ id: v.id, date: v.date, deviceEpisodeId: ep })), pays);
        for (const v of list) {
          const hit = byVisit.get(v.id);
          if (hit) v.paid = hit.sum;
        }
        const days = new Map<string, { sum: number; firstId: number; at: string | null; notes: string[] }>();
        for (const p0 of unattached) {
          const day = baghdadDayOf(p0.date) ?? "—";
          const cur = days.get(day) ?? { sum: 0, firstId: p0.id, at: p0.date, notes: [] };
          cur.sum += p0.amount;
          if (p0.notes && !cur.notes.includes(p0.notes)) cur.notes.push(p0.notes);
          days.set(day, cur);
        }
        for (const d of Array.from(days.values())) {
          list.push({ id: -d.firstId, kind: "payment", date: d.at, details: "دفعة", notes: d.notes.join(" · ") || null, paid: d.sum });
        }
        list.sort((x, y) => String(x.date ?? "").localeCompare(String(y.date ?? "")) || x.id - y.id);
        visitsBy.set(ep, list);
      }
    }
  }

  const sheets: IntakeSheet[] = rows.map((r) => {
    const kind = r.case_type as SheetServiceType;
    const rx = r.prescription && typeof r.prescription === "object" && !Array.isArray(r.prescription)
      ? (r.prescription as Record<string, unknown>) : null;
    const fromExam = rx ? deviceSpecsFromPrescription(kind, rx) : {};
    const stored = (r.device_specs && typeof r.device_specs === "object" ? r.device_specs : {}) as Record<string, unknown>;
    const specs = mergeDeviceSpecs(fromExam, stored) as Record<string, string>;
    const filledAtSale = Object.keys(stored).filter((k) => str(stored[k]) && !str((fromExam as Record<string, unknown>)[k]));
    const hasExam = r.signed_at !== null && r.signed_at !== undefined;

    const sold = r.status === "in_manufacturing" || r.status === "delivered" || r.f_status === "converted";
    const notBought = !sold && r.f_status === "closed_without_purchase";
    const decision: IntakeSheet["decision"] = sold
      ? { kind: "bought", at: iso(r.f_converted_at) ?? iso(r.f_decided_at) ?? iso(r.created_at), reason: null }
      : notBought ? { kind: "not_bought", at: iso(r.f_decided_at), reason: str(r.f_reason) }
        : { kind: "pending", at: null, reason: null };

    const priceKind = str(r.f_price_kind) ?? str(r.component_sale_price_kind);
    const originalPrice = r.f_original_price ?? r.component_sale_original_price;
    const total = sold ? Number(r.agreed_cost ?? 0) : null;
    const paid = Number(r.paid ?? 0);

    return {
      episodeId: Number(r.id), sequenceNumber: Number(r.sequence_number), serviceType: kind,
      requestedItem: str(r.requested_item) ?? "full_device", status: String(r.status),
      soldReady: r.sold_ready_at !== null && r.sold_ready_at !== undefined,
      adminVoided: r.admin_void_reversal_id !== null && r.admin_void_reversal_id !== undefined,
      readyReversible: r.sold_ready_at !== null && r.sold_ready_at !== undefined
        && (r.admin_void_reversal_id === null || r.admin_void_reversal_id === undefined) && r.has_followup !== true,
      extraComponents: normalizeExtraComponents(r.requested_item, r.extra_components),
      //  **«المطلوب» يُصحَّح من هنا** (§4.db): للاستعلامات قبل معاينة الجهاز، وللمسؤول ومدير الفرع بعدها ما دام بلا سعرٍ ولا تصنيع.
      requestedItemEditable: Boolean(opts.editor) && requestedItemEditable({
        privileged: opts.editor?.privileged === true, status: String(r.status), agreedCost: Number(r.agreed_cost ?? 0), caseType: kind,
      }),
      openedAt: iso(r.created_at), branchName: str(r.branch_name) ?? str(p.branch_name),
      amputationSite: kind === "prosthetic" ? ((rx && buildAmputationSite(rx as any)) || str(p.amputation_site)) : null,
      supportType: kind === "medical_support" ? (str(rx?.supportType) ?? str(p.support_type)) : null,
      injurySide: kind === "medical_support" ? (str(rx?.injurySide) ?? str(p.injury_side)) : null,
      exam: hasExam ? {
        text: examSheetTextOf(kind, {
          chiefComplaint: r.chief_complaint, clinicalFindings: r.clinical_findings, diagnosis: r.diagnosis, plan: r.plan, notes: r.notes,
        }),
        doctorName: String(r.doctor_name ?? ""), signedAt: iso(r.signed_at),
      } : null,
      specs, filledAtSale, decision,
      money: opts.withMoney ? {
        total, originalPrice: originalPrice === null || originalPrice === undefined ? null : Number(originalPrice),
        priceKind, paid, remaining: total === null ? null : total - paid,
        //  **أسطرُ السعر حين يتعدّد ما بِيع** — بندٌ واحد يقوله سطرُ المبلغ نفسُه.
        ...(storedSaleLines(r.sale_lines).length > 1 ? { lines: storedSaleLines(r.sale_lines) } : {}),
      } : null,
      visits: visitsBy.get(Number(r.id)) ?? [],
    };
  });

  return { patient, sheets, canViewMoney: opts.withMoney };
}
