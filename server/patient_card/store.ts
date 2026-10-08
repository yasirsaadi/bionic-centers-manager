// بناءُ بطاقة المريض (§4.bv) — **قراءةٌ محضة**، ولا يخرج منها حقلٌ خارجَ `PatientCard`.
// ملاحظاتُ الطبيب والخصوماتُ وأسماءُ الموظّفين وأسبابُ التوقّف: لا تُقرأ هنا أصلاً. وسببُ الزيارة يظهر كما في سجلّ الملفّ (قرارُ المالك).
import { sql } from "drizzle-orm";
import { db } from "../db";
import { caseNotBoughtByCase } from "../followup/case_not_bought";
import { getEpisodeDisplayFieldsByIds } from "../device_episodes/store";
import { deriveDevicePaymentDisplay } from "@shared/payment_description";
import { SPECIALTY_LABELS } from "@shared/medical";
import { BUILD_STAGES, PROSTHETIC_MAINTENANCE_STAGES, SUPPORT_MAINTENANCE_STAGES, STAGE_LABELS } from "@shared/manufacturing";
import { requestedItemLabel } from "@shared/prosthetic_parts";
import { cardDeviceStatus, cardVisitLabel, type PatientCard, type PatientCardDay, type PatientCardOrder } from "@shared/patient_card";

const rows = async (q: any) => ((await db.execute(q)).rows ?? []) as any[];
const BAGHDAY = (col: string) => sql.raw(`to_char((${col} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Baghdad', 'YYYY-MM-DD')`);
const BAGTIME = (col: string) => sql.raw(`to_char((${col} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Baghdad', 'HH24:MI')`);

/** المرضى المفعَّلة بطاقاتُهم لحساب تلغرام هذا — ربطٌ نشِطٌ ومريضٌ فعّال. */
export async function cardPatientIdsForTelegram(telegramUserId: string): Promise<number[]> {
  const r = await rows(sql`
    SELECT DISTINCT p.id FROM patient_contacts c JOIN patients p ON p.id = c.patient_id
     WHERE c.channel = 'telegram' AND c.external_id = ${telegramUserId} AND c.revoked_at IS NULL
       AND p.deleted_at IS NULL AND p.patient_card_enabled = true
     ORDER BY p.id`);
  return r.map((x) => Number(x.id));
}

export async function buildPatientCard(patientId: number): Promise<PatientCard | null> {
  const [p] = await rows(sql`
    SELECT p.id, p.name, p.patient_code, ${BAGHDAY("p.created_at")} AS registered, p.phone, p.address, p.branch_id, p.total_cost,
           p.is_amputee, p.is_medical_support, p.is_physiotherapy, p.amputation_site, p.support_type, p.disease_type
      FROM patients p WHERE p.id = ${patientId} AND p.deleted_at IS NULL`);
  if (!p) return null;

  const branches = (await rows(sql`
    SELECT b.name FROM branches b
     WHERE b.id = ${p.branch_id}
        OR b.id IN (SELECT branch_id FROM patient_branch_access WHERE patient_id = ${patientId})
     ORDER BY (b.id = ${p.branch_id}) DESC, b.name`)).map((b) => String(b.name));

  //  آخرُ جهازٍ حيٍّ لكلّ قسم — «المطلوب» (طرفٌ كامل أو جزء).
  const eps = await rows(sql`
    SELECT DISTINCT ON (pc.case_type) pc.case_type, pc.id AS case_id, e.requested_item, e.extra_components, e.status
      FROM patient_device_episodes e JOIN patient_cases pc ON pc.id = e.case_id
     WHERE e.patient_id = ${patientId} AND e.status <> 'cancelled'
     ORDER BY pc.case_type, e.sequence_number DESC`);
  const itemOf = (t: string) => {
    const e = eps.find((x) => x.case_type === t);
    return e ? requestedItemLabel(e.requested_item, t, e.extra_components) : null;
  };
  const notBought = await caseNotBoughtByCase(patientId);
  const statusOf = (t: string) => {
    const e = eps.find((x) => x.case_type === t);
    return e ? cardDeviceStatus(String(e.status), notBought.has(Number(e.case_id))) : null;
  };
  const join = (...xs: (string | null | undefined)[]) => xs.map((x) => String(x ?? "").trim()).filter(Boolean).join(" — ") || null;
  const departments: PatientCard["departments"] = [];
  if (p.is_amputee) departments.push({ key: "prosthetic", label: SPECIALTY_LABELS.prosthetic, detail: join(itemOf("prosthetic"), p.amputation_site), status: statusOf("prosthetic") });
  if (p.is_medical_support) departments.push({ key: "medical_support", label: SPECIALTY_LABELS.medical_support, detail: join(p.support_type) ?? itemOf("medical_support"), status: statusOf("medical_support") });
  if (p.is_physiotherapy) departments.push({ key: "physiotherapy", label: SPECIALTY_LABELS.physiotherapy, detail: join(p.disease_type), status: null });

  //  أوامرُ التصنيع والصيانة — المرحلةُ وموعدُ التسليم، **بلا سبب توقّفٍ ولا اسم خبير**.
  const ordersRaw = await rows(sql`
    SELECT id, service_type, purpose, status, current_stage, expected_delivery_date::text AS edd, to_char(created_at AT TIME ZONE 'Asia/Baghdad', 'YYYY-MM-DD') AS opened
      FROM prosthetic_work_orders
     WHERE patient_id = ${patientId} AND status <> 'cancelled'
     ORDER BY created_at DESC, id DESC`);
  const orders: PatientCardOrder[] = ordersRaw.map((o) => {
    const maintenance = o.purpose === "maintenance";
    const list: readonly string[] = !maintenance ? BUILD_STAGES
      : o.service_type === "medical_support" ? SUPPORT_MAINTENANCE_STAGES : PROSTHETIC_MAINTENANCE_STAGES;
    const done = o.status === "completed";
    const idx = done ? list.length - 1 : Math.max(0, list.indexOf(String(o.current_stage)));
    return {
      id: Number(o.id),
      serviceLabel: o.service_type === "medical_support" ? "مسند طبي" : "طرف صناعي",
      kindLabel: maintenance ? "صيانة" : "تصنيع",
      stages: list.map((k, i) => ({
        key: k, label: STAGE_LABELS[k] ?? k,
        state: (done || i < idx ? "done" : i === idx ? "current" : "todo") as "done" | "current" | "todo",
      })),
      openedAt: String(o.opened),
      delivered: done,
      expectedDeliveryDate: !maintenance && !done && o.edd ? String(o.edd) : null,
    };
  });

  //  الأيّام: زياراتٌ (بسببها كما في سجلّ الملفّ) ودفعاتٌ (بمبالغها، بلا مجموع).
  const visits = await rows(sql`
    SELECT v.id, ${BAGHDAY("v.visit_date")} AS d, ${BAGTIME("v.visit_date")} AS tm, v.visit_date, v.details, v.notes, v.treatment_type, b.name AS branch
      FROM visits v LEFT JOIN branches b ON b.id = v.branch_id
     WHERE v.patient_id = ${patientId} AND v.deleted_at IS NULL`);
  const pays = await rows(sql`
    SELECT y.id, ${BAGHDAY("y.date")} AS d, ${BAGTIME("y.date")} AS tm, y.date, y.amount, y.notes, y.visit_id, y.device_episode_id, b.name AS branch
      FROM payments y LEFT JOIN branches b ON b.id = y.branch_id
     WHERE y.patient_id = ${patientId} AND y.amount <> 0`);
  const byDay = new Map<string, { at: number; e: PatientCardDay["entries"][number] }[]>();
  const push = (d: string, at: number, e: PatientCardDay["entries"][number]) => {
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push({ at, e });
  };
  for (const v of visits) push(String(v.d), new Date(v.visit_date).getTime(),
    { kind: "visit", label: cardVisitLabel(v.details, v.notes, v.treatment_type), time: v.tm ?? null, branch: v.branch ?? null, amount: null });
  //  **وصفُ الدفعة كما في سجلّ دفعات الملفّ** (قرارُ المالك — شفافية): الوصفُ المشتقُّ لدفعات الأجهزة وإلّا الملاحظةُ المكتوبة.
  const epFields = await getEpisodeDisplayFieldsByIds(pays.map((y) => y.device_episode_id).filter((x) => x != null).map(Number));
  const saleCount = new Map<number, number>();
  for (const y of pays) if (y.device_episode_id != null && y.visit_id == null)
    saleCount.set(Number(y.device_episode_id), (saleCount.get(Number(y.device_episode_id)) ?? 0) + 1);
  for (const y of pays) {
    const epId = y.device_episode_id != null ? Number(y.device_episode_id) : null;
    const derived = epId !== null
      ? deriveDevicePaymentDisplay({ amount: Number(y.amount), visitId: y.visit_id ?? null }, epFields.get(epId) ?? null,
          { linkedPaymentsCount: saleCount.get(epId) ?? 0 })
      : null;
    const desc = (derived || String(y.notes ?? "").trim()) || null;
    const base = Number(y.amount) < 0 ? "استرجاع" : "دفعة";
    push(String(y.d), new Date(y.date).getTime(),
      { kind: "payment", label: !desc ? base : /^(دفعة|استرجاع)/.test(desc) ? desc : `${base} — ${desc}`, time: y.tm ?? null, branch: y.branch ?? null, amount: Number(y.amount) });
  }
  const days: PatientCardDay[] = Array.from(byDay.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, xs]) => ({ date, entries: xs.sort((a, b) => a.at - b.at).map((x) => x.e) }));

  const paid = pays.reduce((s, y) => s + Number(y.amount), 0);
  const remaining = Math.max(0, Number(p.total_cost ?? 0) - paid);

  return {
    name: String(p.name), code: String(p.patient_code), registeredAt: p.registered ? String(p.registered) : null,
    phone: p.phone ? String(p.phone) : null, address: p.address ? String(p.address) : null,
    branches, departments, orders, days, remaining,
  };
}
