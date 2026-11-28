// **إسنادُ خطّة Bionic AI بأجزائها والبديلُ لغياب المُسنَد** (ترحيل ٢٠١، §4.hc — المرحلةُ الرابعة) — طبقةُ البيانات. القواعدُ الصرفة في
// `shared/physio_plan_assignment.ts`. كلُّ كتابةٍ في معاملةٍ بسطر تدقيقٍ وتنبيهٍ في المعاملة نفسِها، وبعد الالتزام إشارةٌ حيّة لصاحبها (`notifyUser`).
import { sql } from "drizzle-orm";
import { db } from "../db";
import { logAudit } from "../accounting/ledger";
import { enqueueStaffEvent } from "../staff_telegram/outbox";
import { notifyUser } from "../live/updates";
import { isPlanAssigneeRole } from "@shared/physio_plans";
import { AI_BRAND } from "@shared/ai_brand";
import {
  canClosePlan, isPlanPart, LAPSE_ASSIGNMENT_CHANGED, LAPSE_EXPIRED, LAPSE_PLAN_CLOSED, normalizeParts, PART_LABELS, partVerdict, PLAN_PARTS,
  requiredParts, substitutionCovers, substitutionInputError, substitutionScopeLabel, type AssignmentLite, type PartVerdict, type PlanPart, type SubstitutionLite,
} from "@shared/physio_plan_assignment";
import { PlanError, type Actor } from "./store";

const rows = (r: any): any[] => (r?.rows ?? r ?? []) as any[];
const ar = (n: number | string) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
const ymd = (d: unknown): string => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d ?? "").slice(0, 10));
/** يومُ بغداد (UTC+3 ثابتة) — كـ`baghdadTodayYmd`، والساعةُ قابلةٌ للحقن في الاختبار. */
let clock: () => number = () => Date.now();
export function setAssignmentClockForTests(fn: (() => number) | null) { clock = fn ?? (() => Date.now()); }
export const baghdadToday = (): string => new Date(clock() + 3 * 3600 * 1000).toISOString().slice(0, 10);

export interface UserLite {
  id: number; name: string | null; role: string | null; extraRoles: unknown; branchId: number | null; branchIds: unknown; isActive: boolean; canDryNeedle: boolean;
}
const userOf = (r: any): UserLite => ({ id: Number(r.id), name: r.display_name ?? null, role: r.role ?? null, extraRoles: r.extra_roles ?? [], branchId: r.branch_id ?? null,
  branchIds: r.branch_ids ?? [], isActive: r.is_active !== false, canDryNeedle: r.can_dry_needle === true });
export function worksIn(u: { branchId: number | null; branchIds: unknown }, branchId: number): boolean {
  const list = Array.isArray(u.branchIds) ? (u.branchIds as unknown[]).map(Number) : [];
  return Number(u.branchId) === Number(branchId) || list.includes(Number(branchId));
}
/** **مؤهَّلٌ لتنفيذ خطّةٍ في فرعها**: نشطٌ، ودورٌ من أدوار القسم الأربعة، ويعمل في الفرع. */
export const eligibleIn = (u: UserLite | null | undefined, branchId: number): boolean =>
  !!u && u.isActive && isPlanAssigneeRole({ role: u.role, extraRoles: u.extraRoles }) && worksIn(u, branchId);

async function usersByIds(ex: any, ids: number[]): Promise<Map<number, UserLite>> {
  const u = Array.from(new Set(ids.filter((x) => Number.isInteger(x) && x > 0)));
  if (!u.length) return new Map();
  const r = rows(await ex.execute(sql`SELECT id, display_name, role, extra_roles, branch_id, branch_ids, is_active, can_dry_needle FROM system_users
      WHERE id IN (${sql.join(u.map((i) => sql`${i}`), sql`, `)})`));
  return new Map(r.map((x) => [Number(x.id), userOf(x)]));
}
async function allUsers(ex: any): Promise<UserLite[]> {
  return rows(await ex.execute(sql`SELECT id, display_name, role, extra_roles, branch_id, branch_ids, is_active, can_dry_needle FROM system_users`)).map(userOf);
}

/** أجزاءُ الخطّة المطلوبة — المحفوظةُ مع النسخة، وإلّا (خطّةٌ قبل ٢٠١ لم تُملأ) من صفوفها الحيّة. */
export async function partsOfPlanTx(ex: any, plan: { id: number; opus_parts?: unknown; opusParts?: unknown }): Promise<PlanPart[]> {
  const saved = plan.opus_parts ?? plan.opusParts;
  if (Array.isArray(saved)) return normalizeParts(saved);
  const devs = rows(await ex.execute(sql`SELECT d.code FROM physio_plan_devices l JOIN devices d ON d.id = l.device_id WHERE l.plan_id = ${plan.id}`));
  const ph = rows(await ex.execute(sql`SELECT count(*)::int AS n FROM physio_plan_phase_exercises e JOIN physio_plan_phases p ON p.id = e.phase_id WHERE p.plan_id = ${plan.id}`))[0];
  return requiredParts({ devices: devs.map((d) => ({ code: String(d.code) })), phases: Number(ph?.n ?? 0) > 0 ? [{ exercises: [{ exerciseId: 1 }] }] : [] });
}

export interface AssignmentRow { planId: number; part: PlanPart; userId: number; assignedBy: number | null; assignedByName: string | null; assignedAt: string | null;
  assignedVersion: number | null; reason: string | null; seenAt: string | null }
const assignmentOf = (r: any): AssignmentRow => ({ planId: Number(r.plan_id), part: r.part, userId: Number(r.user_id), assignedBy: r.assigned_by ?? null,
  assignedByName: r.assigned_by_name ?? null, assignedAt: r.assigned_at ? new Date(r.assigned_at).toISOString() : null, assignedVersion: r.assigned_version ?? null,
  reason: r.reason ?? null, seenAt: r.seen_at ? new Date(r.seen_at).toISOString() : null });
export async function assignmentsOf(ex: any, planIds: number[]): Promise<Map<number, Map<PlanPart, AssignmentRow>>> {
  const out = new Map<number, Map<PlanPart, AssignmentRow>>();
  if (!planIds.length) return out;
  for (const r of rows(await ex.execute(sql`SELECT * FROM physio_plan_part_assignments WHERE plan_id IN (${sql.join(planIds.map((i) => sql`${i}`), sql`, `)})`))) {
    const a = assignmentOf(r);
    if (!out.has(a.planId)) out.set(a.planId, new Map());
    out.get(a.planId)!.set(a.part, a);
  }
  return out;
}

export interface SubstitutionRow {
  id: number; assigneeId: number; assigneeName: string | null; substituteId: number; substituteName: string | null; requestedBy: number; requestedByName: string | null;
  planId: number | null; part: PlanPart | null; dateFrom: string; dateTo: string; effectiveFrom: string | null; reason: string; status: string; requestedAt: string | null;
  decidedBy: number | null; decidedByName: string | null; decidedAt: string | null; decisionNote: string | null; lapsedAt: string | null; lapseReason: string | null;
  lapsedBy: number | null; withdrawnAt: string | null; substituteSeenAt: string | null; requesterSeenAt: string | null;
}
const iso = (v: any) => (v ? new Date(v).toISOString() : null);
export const substitutionOf = (r: any): SubstitutionRow => ({ id: Number(r.id), assigneeId: Number(r.assignee_id), assigneeName: r.assignee_name ?? null,
  substituteId: Number(r.substitute_id), substituteName: r.substitute_name ?? null, requestedBy: Number(r.requested_by), requestedByName: r.requested_by_name ?? null,
  planId: r.plan_id == null ? null : Number(r.plan_id), part: r.part ?? null, dateFrom: ymd(r.date_from), dateTo: ymd(r.date_to),
  effectiveFrom: r.effective_from ? ymd(r.effective_from) : null, reason: r.reason, status: r.status, requestedAt: iso(r.requested_at), decidedBy: r.decided_by ?? null,
  decidedByName: r.decided_by_name ?? null, decidedAt: iso(r.decided_at), decisionNote: r.decision_note ?? null, lapsedAt: iso(r.lapsed_at), lapseReason: r.lapse_reason ?? null,
  lapsedBy: r.lapsed_by ?? null, withdrawnAt: iso(r.withdrawn_at), substituteSeenAt: iso(r.substitute_seen_at), requesterSeenAt: iso(r.requester_seen_at) });

/** بدائلُ معتمَدةٌ قد تغطّي هذه الخطط (لمُسنَديها، أو كلّ خططهم). */
async function approvedSubsFor(ex: any, planIds: number[], assigneeIds: number[]): Promise<SubstitutionRow[]> {
  if (!planIds.length || !assigneeIds.length) return [];
  return rows(await ex.execute(sql`SELECT * FROM physio_plan_substitutions WHERE status = 'approved'
      AND assignee_id IN (${sql.join(assigneeIds.map((i) => sql`${i}`), sql`, `)})
      AND (plan_id IS NULL OR plan_id IN (${sql.join(planIds.map((i) => sql`${i}`), sql`, `)}))`)).map(substitutionOf);
}

export interface PlanLite { id: number; branchId: number; status: string; origin: string | null; parts: PlanPart[] }
const planLiteOf = async (ex: any, r: any): Promise<PlanLite> => ({ id: Number(r.id), branchId: Number(r.branch_id ?? r.branchId), status: String(r.status), origin: r.origin ?? null,
  parts: await partsOfPlanTx(ex, r) });

/**
 * **مَن يسجّل كلَّ جزء** لهذا السائل في هذا اليوم — لخططٍ كثيرة بقراءاتٍ مجمّعة. المعتمِدُ ⟵ كلُّها مسموحة.
 * ⟵ لكلّ خطّة: الإسنادُ (بأهليّة المُسنَد) والحكمُ لكلّ جزءٍ مطلوب.
 */
export async function verdictsFor(ex: any, planRows: any[], viewer: { userId: number | null; approver: boolean }, date: string): Promise<Map<number, {
  plan: PlanLite; assignments: Map<PlanPart, AssignmentRow & { user: UserLite | null; eligible: boolean }>; verdicts: Partial<Record<PlanPart, PartVerdict>>;
  subs: SubstitutionRow[]; users: Map<number, UserLite> }>> {
  const out = new Map();
  if (!planRows.length) return out;
  const plans = await Promise.all(planRows.map((r) => planLiteOf(ex, r)));
  const ids = plans.map((p) => p.id);
  const asg = await assignmentsOf(ex, ids);
  const holderIds = Array.from(asg.values()).flatMap((m) => Array.from(m.values()).map((a) => a.userId));
  const subs = await approvedSubsFor(ex, ids, holderIds);
  const users = await usersByIds(ex, [...holderIds, ...subs.map((s) => s.substituteId)]);
  for (const plan of plans) {
    const m = new Map<PlanPart, AssignmentRow & { user: UserLite | null; eligible: boolean }>();
    for (const [part, a] of Array.from(asg.get(plan.id)?.entries() ?? [])) {
      const user = users.get(a.userId) ?? null;
      m.set(part, { ...a, user, eligible: eligibleIn(user, plan.branchId) });
    }
    const lite: SubstitutionLite[] = subs.filter((s) => s.planId == null || s.planId === plan.id).map((s) => ({ id: s.id, assigneeId: s.assigneeId,
      substituteId: s.substituteId, planId: s.planId, part: s.part, status: s.status, effectiveFrom: s.effectiveFrom, dateTo: s.dateTo, decidedAt: s.decidedAt,
      substituteEligibleHere: eligibleIn(users.get(s.substituteId), plan.branchId) }));
    const verdicts: Partial<Record<PlanPart, PartVerdict>> = {};
    for (const part of plan.parts) {
      const a = m.get(part);
      const assignment: AssignmentLite | null = a ? { part, userId: a.userId, name: a.user?.name ?? null, eligible: a.eligible, assignedAt: a.assignedAt } : null;
      verdicts[part] = partVerdict({ approver: viewer.approver, userId: viewer.userId, planId: plan.id, part, assignment, substitutions: lite, date });
    }
    out.set(plan.id, { plan, assignments: m, verdicts, subs: subs.filter((s) => s.planId == null || s.planId === plan.id), users });
  }
  return out;
}

/** **أجزاءٌ مطلوبة بلا مُسنَدٍ مؤهَّل** — «بانتظار الإسناد». */
export const missingAssignments = (v: { plan: PlanLite; assignments: Map<PlanPart, { eligible: boolean }> }): PlanPart[] =>
  v.plan.parts.filter((p) => !v.assignments.get(p)?.eligible);

export async function unassignedPartsOf(ex: any, planId: number): Promise<PlanPart[]> {
  const r = rows(await ex.execute(sql`SELECT * FROM physio_plans WHERE id = ${planId}`))[0];
  if (!r || r.origin !== "opus" || r.status !== "approved") return [];
  const v = (await verdictsFor(ex, [r], { userId: null, approver: true }, baghdadToday())).get(Number(r.id));
  return v ? missingAssignments(v) : [];
}

/** **المنفّذون القدامى** (`physio_plan_assignees`) = اتّحادُ مُسنَدي الأجزاء — فقرّاؤه القدامى (التنبيهاتُ والقوائم) يعملون كما كانوا. */
async function syncLegacyAssigneesTx(tx: any, planId: number, actor: Actor): Promise<number[]> {
  const gone = rows(await tx.execute(sql`DELETE FROM physio_plan_assignees WHERE plan_id = ${planId}
      AND user_id NOT IN (SELECT user_id FROM physio_plan_part_assignments WHERE plan_id = ${planId}) RETURNING user_id`)).map((r) => Number(r.user_id));
  await tx.execute(sql`INSERT INTO physio_plan_assignees (plan_id, user_id, assigned_by)
      SELECT DISTINCT plan_id, user_id, ${actor.userId}::int FROM physio_plan_part_assignments WHERE plan_id = ${planId} ON CONFLICT DO NOTHING`);
  return gone.sort((a, b) => a - b);
}

async function planLabelTx(ex: any, plan: any): Promise<string> {
  const r = rows(await ex.execute(sql`SELECT p.name, p.patient_code, b.name AS branch FROM patients p LEFT JOIN branches b ON b.id = ${plan.branch_id} WHERE p.id = ${plan.patient_id}`))[0];
  return `${r?.name ?? `#${plan.patient_id}`}${r?.patient_code ? ` (${r.patient_code})` : ""}${r?.branch ? ` — ${r.branch}` : ""}`;
}

/** بدائلُ مُسنَدٍ لم يعد يحمل جزءاً يغطّيه طلبُها — تُلغى تلقائياً «تغيّر الإسناد». */
async function lapseOrphanedSubsTx(tx: any, assigneeIds: number[], reason: string): Promise<SubstitutionRow[]> {
  if (!assigneeIds.length) return [];
  await subLocksTx(tx, assigneeIds);
  const r = rows(await tx.execute(sql`UPDATE physio_plan_substitutions s SET status = 'lapsed', lapsed_at = now(), lapse_reason = ${reason}, lapsed_by = NULL
     WHERE s.status IN ('pending','approved') AND s.assignee_id IN (${sql.join(assigneeIds.map((i) => sql`${i}`), sql`, `)})
       AND NOT EXISTS (SELECT 1 FROM physio_plan_part_assignments a JOIN physio_plans p ON p.id = a.plan_id
                        WHERE a.user_id = s.assignee_id AND p.origin = 'opus' AND p.status = 'approved'
                          AND (s.plan_id IS NULL OR a.plan_id = s.plan_id) AND (s.part IS NULL OR a.part = s.part))
     RETURNING *`)).map(substitutionOf);
  for (const s of r) await auditSub(tx, s, "substitute_lapse", null, { reason }, `أُلغي البديلُ تلقائياً — ${reason}`);
  return r;
}

async function auditSub(tx: any, s: SubstitutionRow, action: string, actor: Actor | null, extra: Record<string, unknown>, notes: string, meta?: AuditMeta) {
  const branch = s.planId ? rows(await tx.execute(sql`SELECT branch_id FROM physio_plans WHERE id = ${s.planId}`))[0]?.branch_id ?? null : null;
  await logAudit({ entityType: s.planId ? "physio_plan" : "physio_substitution", entityId: s.planId ?? s.id, action, userId: actor?.userId ?? null,
    userName: actor?.name ?? (actor ? null : "النظام"), branchId: branch, newValues: { substitutionId: s.id, status: s.status, assigneeId: s.assigneeId, substituteId: s.substituteId,
      planId: s.planId, part: s.part, dateFrom: s.dateFrom, dateTo: s.dateTo, effectiveFrom: s.effectiveFrom, ...extra },
    notes, ipAddress: meta?.ip ?? null, userAgent: meta?.userAgent ?? null, tx });
}
export interface AuditMeta { ip?: string | null; userAgent?: string | null }

/** **إلغاءٌ تلقائيّ يُعلَن** — للمُسنَد والبديل (وصاحبِ الطلب)، فلا يُلغى بديلٌ بصمتٍ حين تُغلق الخطّة أو تتغيّر نسختُها أو ينتهي أجلُه. ⟵ مَن يُشار له بعد الالتزام. */
export async function noticeAutoLapsedTx(tx: any, list: SubstitutionRow[], reason: string, excludeUserId: number | null): Promise<number[]> {
  const touched = new Set<number>();
  for (const s of list) {
    const targets = Array.from(new Set([s.assigneeId, s.requestedBy, ...(s.status === "lapsed" && s.decidedAt ? [s.substituteId] : [])]));
    targets.forEach((u) => touched.add(u));
    await enqueueStaffEvent(tx, { event: "physio_substitute_decided", targetUserIds: targets, excludeUserId,
      text: `⏹ أُلغي البديلُ تلقائياً — ${reason}: ${s.substituteName ?? ""} عن ${s.assigneeName ?? ""}`, linkPath: "/physio/today" });
  }
  return Array.from(touched);
}

// ══ الإسناد ═════════════════════════════════════════════════════════════════════════════════════════
/**
 * **«إسناد» خطّة Bionic AI** — المعتمِدُ وحده (يُفحص في المسار). `want`: لكلّ جزءٍ مُرسَل رقمُ المُسنَد أو `null` لسحبه، والغائبُ لا يتغيّر.
 * تغييرُ مُسنَدٍ قائم أو سحبُه بسبب. ⟵ قبلُ وبعدُ وما أُلغي من البدائل ومَن يُشار له.
 */
export async function assignParts(planId: number, want: Partial<Record<PlanPart, number | null>>, reason: string | null, actor: Actor, meta: AuditMeta = {}) {
  const r = await db.transaction(async (tx) => {
    await (await import("../physio_agent/versions")).lockOpusPatientFirstTx(tx, planId);
    const plan = rows(await tx.execute(sql`SELECT * FROM physio_plans WHERE id = ${planId} FOR UPDATE`))[0];
    if (!plan) throw new PlanError(404, "الخطّة غير موجودة");
    if (plan.origin !== "opus") throw new PlanError(409, `الإسنادُ بالأجزاء لخطّة ${AI_BRAND} وحدها`, "opus_only");
    if (plan.status !== "approved") throw new PlanError(409, "الخطّةُ منتهية — موقوفةٌ أو متخرّجة", "plan_closed");
    const parts = await partsOfPlanTx(tx, plan);
    const sent = (Object.keys(want) as PlanPart[]).filter(isPlanPart);
    if (sent.some((p) => !parts.includes(p))) throw new PlanError(400, "جزءٌ ليس في الخطّة", "part_not_in_plan");
    const cur = (await assignmentsOf(tx, [planId])).get(planId) ?? new Map<PlanPart, AssignmentRow>();
    const users = await usersByIds(tx, [...sent.map((p) => want[p]).filter((x): x is number => typeof x === "number"), ...Array.from(cur.values()).map((a) => a.userId)]);
    const changes: { part: PlanPart; from: number | null; to: number | null }[] = [];
    for (const part of sent) {
      const to = want[part] ?? null;
      const from = cur.get(part)?.userId ?? null;
      if (to === from) continue;
      if (to !== null && !eligibleIn(users.get(to), Number(plan.branch_id))) {
        throw new PlanError(400, "يُسنَد إلى أدوار العلاج الطبيعي العاملة في فرع الخطّة وحدها", "assignee_invalid");
      }
      changes.push({ part, from, to });
    }
    if (!changes.length) throw new PlanError(400, "لم يتغيّر الإسناد", "no_change");
    const why = (reason ?? "").trim();
    if (changes.some((c) => c.from !== null) && why.length < 3) throw new PlanError(400, "اكتب سببَ تغيير الإسناد (ثلاثةُ أحرفٍ على الأقلّ)", "reason_required");
    for (const c of changes) {
      if (c.to === null) await tx.execute(sql`DELETE FROM physio_plan_part_assignments WHERE plan_id = ${planId} AND part = ${c.part}`);
      else {
        await tx.execute(sql`INSERT INTO physio_plan_part_assignments (plan_id, part, user_id, assigned_by, assigned_by_name, assigned_at, assigned_version, reason, seen_at)
            VALUES (${planId}, ${c.part}, ${c.to}, ${actor.userId}, ${actor.name}, now(), ${plan.opus_version ?? null}, ${c.from !== null ? why : null}, NULL)
            ON CONFLICT (plan_id, part) DO UPDATE SET user_id = EXCLUDED.user_id, assigned_by = EXCLUDED.assigned_by, assigned_by_name = EXCLUDED.assigned_by_name,
              assigned_at = now(), assigned_version = EXCLUDED.assigned_version, reason = EXCLUDED.reason, seen_at = NULL`);
      }
    }
    const legacyRemoved = await syncLegacyAssigneesTx(tx, planId, actor);
    const removedHolders = changes.map((c) => c.from).filter((x): x is number => x !== null);
    const lapsed = await lapseOrphanedSubsTx(tx, removedHolders, LAPSE_ASSIGNMENT_CHANGED);
    const after = (await assignmentsOf(tx, [planId])).get(planId) ?? new Map();
    const before = Object.fromEntries(PLAN_PARTS.map((p) => [p, cur.get(p)?.userId ?? null]));
    const afterObj = Object.fromEntries(PLAN_PARTS.map((p) => [p, after.get(p)?.userId ?? null]));
    await logAudit({ entityType: "physio_plan", entityId: planId, action: "assign_parts", userId: actor.userId, userName: actor.name, branchId: plan.branch_id,
      oldValues: { parts: before, ...(legacyRemoved.length ? { legacyAssigneesRemoved: legacyRemoved } : {}) },
      newValues: { parts: afterObj, reason: why || null, version: plan.opus_version ?? null, lapsedSubstitutions: lapsed.map((s) => s.id) },
      notes: changes.map((c) => `${PART_LABELS[c.part]}: ${c.from ? users.get(c.from)?.name ?? `#${c.from}` : "—"} ⟵ ${c.to ? users.get(c.to)?.name ?? `#${c.to}` : "بلا إسناد"}`).join(" · "),
      ipAddress: meta.ip ?? null, userAgent: meta.userAgent ?? null, tx });
    const who = await planLabelTx(tx, plan);
    const versionLine = plan.opus_version ? ` · النسخة ${ar(Number(plan.opus_version))}` : "";
    const sessions = plan.total_sessions ? `${ar(Number(plan.total_sessions))} جلسة` : "";
    for (const c of changes) {
      if (c.to !== null) {
        await enqueueStaffEvent(tx, { event: "physio_plan_assigned", targetUserIds: [c.to], excludeUserId: actor.userId,
          text: `🧑‍⚕️ أُسند إليك جزءُ «${PART_LABELS[c.part]}» من خطّة ${AI_BRAND}: ${who}\n${plan.title_ar}${sessions ? ` — ${sessions}` : ""}${versionLine}`,
          linkPath: `/physio/plans/${planId}` });
      }
      if (c.from !== null) {
        await enqueueStaffEvent(tx, { event: "physio_plan_assigned", targetUserIds: [c.from], excludeUserId: actor.userId,
          text: `↩️ سُحب منك جزءُ «${PART_LABELS[c.part]}» من خطّة ${who}\n${plan.title_ar} — ${why}`, linkPath: `/physio/plans/${planId}` });
      }
    }
    for (const s of lapsed) {
      await enqueueStaffEvent(tx, { event: "physio_substitute_decided", targetUserIds: [s.assigneeId, s.substituteId], excludeUserId: actor.userId,
        text: `⏹ أُلغي البديلُ تلقائياً — ${LAPSE_ASSIGNMENT_CHANGED}: ${s.substituteName ?? ""} عن ${s.assigneeName ?? ""}`, linkPath: "/physio/today" });
    }
    const touched = Array.from(new Set([...changes.flatMap((c) => [c.from, c.to]), ...lapsed.flatMap((s) => [s.assigneeId, s.substituteId])].filter((x): x is number => x != null)));
    return { before, after: afterObj, lapsed: lapsed.map((s) => s.id), touched, branchId: Number(plan.branch_id) };
  });
  for (const u of r.touched) notifyUser(u, "physio_assignment");
  return r;
}

/**
 * **نسخةٌ جديدة كُتبت** (`versions.writeVersionTx`): جزءٌ أزالته النسخةُ ⟵ يُحذف إسنادُه وتُلغى بدائلُه في هذه الخطّة «تغيّر الإسناد»؛
 * وجزءٌ أضافته ⟵ «بانتظار الإسناد» (يُعاد لمَن يُنبّه المعتمِدين). المُستدعي يحمل قفلَ الخطّة.
 */
export async function onVersionWrittenTx(tx: any, plan: Record<string, any>, newParts: PlanPart[], oldParts: PlanPart[] | null, version: number, actor: Actor): Promise<PlanPart[]> {
  if (oldParts === null) return [];
  const removed = oldParts.filter((p) => !newParts.includes(p));
  const added = newParts.filter((p) => !oldParts.includes(p));
  if (removed.length) {
    //  القفلُ بالترتيب الواحد: الخطّةُ (عند المُستدعي) ⟵ مُسنَدو البدائل ⟵ صفوفُها.
    const affected = rows(await tx.execute(sql`SELECT DISTINCT assignee_id FROM physio_plan_substitutions WHERE status IN ('pending','approved')
        AND (plan_id = ${plan.id} OR (plan_id IS NULL AND assignee_id IN (SELECT user_id FROM physio_plan_part_assignments WHERE plan_id = ${plan.id})))`));
    await subLocksTx(tx, affected.map((r) => Number(r.assignee_id)));
    const gone = rows(await tx.execute(sql`DELETE FROM physio_plan_part_assignments WHERE plan_id = ${plan.id}
        AND part IN (${sql.join(removed.map((p) => sql`${p}`), sql`, `)}) RETURNING part, user_id`));
    const lapsedPlan = rows(await tx.execute(sql`UPDATE physio_plan_substitutions SET status = 'lapsed', lapsed_at = now(), lapse_reason = ${LAPSE_ASSIGNMENT_CHANGED}, lapsed_by = NULL
        WHERE plan_id = ${plan.id} AND status IN ('pending','approved') AND part IN (${sql.join(removed.map((p) => sql`${p}`), sql`, `)}) RETURNING *`)).map(substitutionOf);
    for (const s of lapsedPlan) await auditSub(tx, s, "substitute_lapse", null, { reason: LAPSE_ASSIGNMENT_CHANGED }, `أُلغي البديلُ تلقائياً — ${LAPSE_ASSIGNMENT_CHANGED}`);
    await syncLegacyAssigneesTx(tx, Number(plan.id), actor);
    const orphans = await lapseOrphanedSubsTx(tx, gone.map((g) => Number(g.user_id)), LAPSE_ASSIGNMENT_CHANGED);
    await noticeAutoLapsedTx(tx, [...lapsedPlan, ...orphans], LAPSE_ASSIGNMENT_CHANGED, actor.userId);
    if (gone.length) {
      await logAudit({ entityType: "physio_plan", entityId: Number(plan.id), action: "assign_parts", userId: actor.userId, userName: actor.name, branchId: plan.branch_id,
        oldValues: { parts: Object.fromEntries(gone.map((g) => [g.part, Number(g.user_id)])) }, newValues: { parts: Object.fromEntries(gone.map((g) => [g.part, null])),
          reason: `أزالت النسخةُ ${ar(version)} الجزء`, lapsedSubstitutions: [...lapsedPlan, ...orphans].map((s) => s.id) },
        notes: `أزالت النسخةُ ${ar(version)} ${removed.map((p) => `جزءَ «${PART_LABELS[p]}»`).join(" و")} — سُحب إسنادُه`, tx });
    }
  }
  return added;
}

// ══ البديل ══════════════════════════════════════════════════════════════════════════════════════════
const subLock = (tx: any, assigneeId: number) => tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`physio_sub:${assigneeId}`}))`);
/** أقفالُ بدائل مُسنَدين كثيرين — مرتّبةً فلا تتعاكس بينها. **والترتيبُ الواحد في كلّ مكان**: المريضُ ⟵ الخطّة ⟵ هذا القفل ⟵ صفوفُ البدائل. */
async function subLocksTx(tx: any, assigneeIds: number[]) {
  for (const id of Array.from(new Set(assigneeIds.filter((x) => Number.isInteger(x) && x > 0))).sort((a, b) => a - b)) await subLock(tx, id);
}

/** **ما يحمله المُسنَدُ مؤهَّلاً** من أجزاء خطط Bionic AI المعتمَدة (لمرضى خارج السلّة) — في نطاق الطلب. */
async function heldPartsTx(ex: any, assigneeId: number, scope: { planId: number | null; part: PlanPart | null }) {
  const r = rows(await ex.execute(sql`SELECT a.plan_id, a.part, p.branch_id, p.patient_id FROM physio_plan_part_assignments a JOIN physio_plans p ON p.id = a.plan_id
      JOIN patients pt ON pt.id = p.patient_id
     WHERE a.user_id = ${assigneeId} AND p.origin = 'opus' AND p.status = 'approved' AND pt.deleted_at IS NULL
       ${scope.planId ? sql`AND a.plan_id = ${scope.planId}` : sql``} ${scope.part ? sql`AND a.part = ${scope.part}` : sql``}`));
  const u = (await usersByIds(ex, [assigneeId])).get(assigneeId) ?? null;
  return r.filter((x) => eligibleIn(u, Number(x.branch_id))).map((x) => ({ planId: Number(x.plan_id), part: x.part as PlanPart, branchId: Number(x.branch_id) }));
}

/** **انتهى أجلُه** — طلبٌ منتظر مضى يومُ نهايته يُلغى تلقائياً (كسولاً: عند الطلب والقرار والقائمة والعدّ). */
export async function lapseExpiredTx(ex: any, today: string, assigneeId?: number): Promise<SubstitutionRow[]> {
  const r = rows(await ex.execute(sql`UPDATE physio_plan_substitutions SET status = 'lapsed', lapsed_at = now(), lapse_reason = ${LAPSE_EXPIRED}, lapsed_by = NULL
      WHERE status = 'pending' AND date_to < ${today}::date ${assigneeId ? sql`AND assignee_id = ${assigneeId}` : sql``} RETURNING *`)).map(substitutionOf);
  for (const s of r) await auditSub(ex, s, "substitute_lapse", null, { reason: LAPSE_EXPIRED }, `أُلغي طلبُ البديل تلقائياً — ${LAPSE_EXPIRED}`);
  return r;
}

const overlapSql = (assigneeId: number, planId: number | null, part: PlanPart | null, from: string, to: string, exceptId?: number) => sql`
  SELECT id FROM physio_plan_substitutions WHERE assignee_id = ${assigneeId} AND status = 'approved'
     AND (plan_id IS NULL OR ${planId}::int IS NULL OR plan_id = ${planId}::int)
     AND (part IS NULL OR ${part}::text IS NULL OR part = ${part}::text)
     AND COALESCE(effective_from, date_from) <= ${to}::date AND date_to >= ${from}::date ${exceptId ? sql`AND id <> ${exceptId}` : sql``} LIMIT 1`;

/** مرشّحو البديل: مؤهَّلون في فرعٍ واحدٍ على الأقلّ من فروع الخطط المغطّاة، غيرُ المُسنَد. */
export async function substituteCandidates(p: { assigneeId: number; planId: number | null; part: PlanPart | null }) {
  const held = await heldPartsTx(db, p.assigneeId, { planId: p.planId, part: p.part });
  const branchIds = Array.from(new Set(held.map((h) => h.branchId)));
  const planIds = Array.from(new Set(held.map((h) => h.planId)));
  const needleInScope = planIds.length > 0 && Boolean(rows(await db.execute(sql`SELECT 1 FROM physio_plan_devices l JOIN devices d ON d.id = l.device_id
      WHERE d.code = 'needle' AND l.plan_id IN (${sql.join(planIds.map((i) => sql`${i}`), sql`, `)}) LIMIT 1`)).length)
    && (p.part === null || p.part === "devices");
  const people = (await allUsers(db)).filter((u) => u.id !== p.assigneeId && branchIds.some((b) => eligibleIn(u, b)))
    .map((u) => ({ id: u.id, name: u.name, role: u.role, branches: branchIds.filter((b) => eligibleIn(u, b)), canDryNeedle: u.canDryNeedle }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "ar"));
  return { candidates: people, needleInScope, coveredPlans: planIds.length, branchIds };
}

export interface SubstituteRequest { assigneeId: number; substituteId: number; planId: number | null; part: PlanPart | null; dateFrom: string; dateTo: string; reason: string }

/** **طلبُ بديل** — من المُسنَد نفسِه (منتظراً) أو من معتمِدٍ نيابةً عنه (معتمَداً حين يُنشأ). */
export async function requestSubstitute(input: SubstituteRequest, actor: Actor, meta: AuditMeta = {}) {
  const today = baghdadToday();
  const err = substitutionInputError({ dateFrom: input.dateFrom, dateTo: input.dateTo, reason: input.reason, today });
  if (err) throw new PlanError(400, err, "substitute_input");
  const approver = actor.isApprover === true;
  if (!approver && input.assigneeId !== actor.userId) throw new PlanError(403, "يطلب البديلَ المُسنَدُ نفسُه أو المسؤولُ أو المشرفُ العام", "not_assignee");
  if (input.substituteId === input.assigneeId) throw new PlanError(400, "البديلُ غيرُ المُسنَد نفسِه", "substitute_invalid");
  const r = await db.transaction(async (tx) => {
    //  **الترتيبُ الواحد**: المريضُ ثمّ الخطّة (إن كان الطلبُ لخطّة) ثمّ قفلُ بدائل المُسنَد — كالإسناد والإيقاف والنسخ، فلا جمود.
    if (input.planId) {
      await (await import("../physio_agent/versions")).lockOpusPatientFirstTx(tx, input.planId);
      const pl = rows(await tx.execute(sql`SELECT p.status, p.origin, pt.deleted_at FROM physio_plans p JOIN patients pt ON pt.id = p.patient_id WHERE p.id = ${input.planId} FOR UPDATE OF p`))[0];
      if (!pl || pl.origin !== "opus") throw new PlanError(404, "الخطّة غير موجودة");
      if (pl.status !== "approved" || pl.deleted_at) throw new PlanError(409, "الخطّةُ منتهية — موقوفةٌ أو متخرّجة", "plan_closed");
    }
    await subLock(tx, input.assigneeId);
    await lapseExpiredTx(tx, today, input.assigneeId);
    //  **المُسنَدُ يحمل الآن مؤهَّلاً جزءاً في النطاق** — وإلّا فلا شيءَ يُغطّى.
    const anyHeld = rows(await tx.execute(sql`SELECT 1 FROM physio_plan_part_assignments a JOIN physio_plans p ON p.id = a.plan_id
        WHERE a.user_id = ${input.assigneeId} AND p.origin = 'opus' AND p.status = 'approved'
          ${input.planId ? sql`AND a.plan_id = ${input.planId}` : sql``} ${input.part ? sql`AND a.part = ${input.part}` : sql``} LIMIT 1`)).length > 0;
    if (!anyHeld) throw new PlanError(approver ? 409 : 403, "لا جزءَ مُسنَداً إليه في هذا النطاق — لا شيءَ يُغطّى", approver ? "assignee_ineligible" : "not_assignee");
    const held = await heldPartsTx(tx, input.assigneeId, { planId: input.planId, part: input.part });
    if (!held.length) throw new PlanError(409, "المُسنَدُ لم يعد مؤهَّلاً في فرع خططه — أعِد الإسناد", "assignee_ineligible");
    const users = await usersByIds(tx, [input.assigneeId, input.substituteId]);
    const sub = users.get(input.substituteId);
    if (!held.some((h) => eligibleIn(sub, h.branchId))) throw new PlanError(400, "البديلُ من أدوار العلاج الطبيعي العاملة في فرع الخطّة", "substitute_invalid");
    const dup = rows(await tx.execute(sql`SELECT id FROM physio_plan_substitutions WHERE status = 'pending' AND assignee_id = ${input.assigneeId}
        AND COALESCE(plan_id, 0) = ${input.planId ?? 0} AND COALESCE(part, '*') = ${input.part ?? "*"} LIMIT 1`))[0];
    if (dup) throw new PlanError(409, "طلبُ بديلٍ لهذا النطاق ينتظر الاعتماد من قبل — اسحبه أو انتظر القرار", "substitute_pending_exists");
    if (rows(await tx.execute(overlapSql(input.assigneeId, input.planId, input.part, input.dateFrom, input.dateTo))).length) {
      throw new PlanError(409, "لهذه الأيّام بديلٌ معتمَد يغطّي النطاقَ نفسَه — أنهِه أوّلاً", "substitute_overlap");
    }
    const assigneeName = users.get(input.assigneeId)?.name ?? null;
    const onBehalf = approver;
    const effective = onBehalf ? (input.dateFrom > today ? input.dateFrom : today) : null;
    const note = onBehalf ? (input.assigneeId === actor.userId ? "أنشأه المعتمِدُ لنفسه" : `أنشأه المعتمِدُ نيابةً عن «${assigneeName ?? ""}»`) : null;
    const row = substitutionOf(rows(await tx.execute(sql`INSERT INTO physio_plan_substitutions (assignee_id, assignee_name, substitute_id, substitute_name, requested_by,
        requested_by_name, plan_id, part, date_from, date_to, effective_from, reason, status, decided_by, decided_by_name, decided_at, decision_note)
      VALUES (${input.assigneeId}, ${assigneeName}, ${input.substituteId}, ${sub?.name ?? null}, ${actor.userId}, ${actor.name}, ${input.planId}, ${input.part},
        ${input.dateFrom}::date, ${input.dateTo}::date, ${effective}::date, ${input.reason.trim()}, ${onBehalf ? "approved" : "pending"},
        ${onBehalf ? actor.userId : null}, ${onBehalf ? actor.name : null}, ${onBehalf ? sql`now()` : sql`NULL`}, ${note}) RETURNING *`))[0]);
    let planLabel: string | null = null;
    if (row.planId) {
      const pl = rows(await tx.execute(sql`SELECT * FROM physio_plans WHERE id = ${row.planId}`))[0];
      planLabel = await planLabelTx(tx, pl);
    }
    const scope = substitutionScopeLabel(row, planLabel);
    await auditSub(tx, row, "substitute_request", actor, { reason: row.reason, onBehalf }, `طلبُ بديل: ${row.substituteName ?? ""} عن ${row.assigneeName ?? ""} — ${scope}`, meta);
    if (onBehalf) {
      await auditSub(tx, row, "substitute_decide", actor, { decision: "approve", note }, `اعتُمد البديلُ حين أُنشئ — ${note}`, meta);
      await enqueueStaffEvent(tx, { event: "physio_substitute_decided", targetUserIds: [row.assigneeId, row.substituteId], excludeUserId: actor.userId,
        text: `✅ اعتُمد البديل: ${row.substituteName ?? ""} يغطّي ${row.assigneeName ?? ""} — ${scope} — من ${ar(row.effectiveFrom ?? row.dateFrom)} إلى ${ar(row.dateTo)}`, linkPath: "/physio/today" });
    } else {
      await enqueueStaffEvent(tx, { event: "physio_substitute_pending", excludeUserId: actor.userId,
        text: `🔁 ${row.assigneeName ?? ""} يطلب بديلاً: ${row.substituteName ?? ""} — ${scope} — من ${ar(row.dateFrom)} إلى ${ar(row.dateTo)}\n${row.reason}`,
        linkPath: "/physio/approvals?tab=substitutes" });
    }
    return row;
  });
  notifyUser(r.substituteId, "physio_substitution");
  if (r.assigneeId !== actor.userId) notifyUser(r.assigneeId, "physio_substitution");
  return r;
}

/**
 * **قفلُ طلب البديل بالترتيب الواحد** — المريضُ ثمّ الخطّةُ (لطلبٍ على خطّة) ثمّ قفلُ بدائل المُسنَد ثمّ الصفّ: الإيقافُ والتخرّجُ والإسنادُ والنسخُ
 * تأخذ الخطّةَ أوّلاً ثمّ تكتب صفوفَ البدائل، فلو أخذ القرارُ الصفَّ قبل الخطّة لتعاكسا (جمودٌ يُرَدّ ٥٠٠). ورقمُ الخطّة والمُسنَد لا يتغيّران.
 */
async function lockSub(tx: any, id: number): Promise<SubstitutionRow> {
  const r0 = rows(await tx.execute(sql`SELECT assignee_id, plan_id FROM physio_plan_substitutions WHERE id = ${id}`))[0];
  if (!r0) throw new PlanError(404, "طلبُ البديل غير موجود");
  if (r0.plan_id != null) {
    await (await import("../physio_agent/versions")).lockOpusPatientFirstTx(tx, Number(r0.plan_id));
    await tx.execute(sql`SELECT id FROM physio_plans WHERE id = ${Number(r0.plan_id)} FOR UPDATE`);
  }
  await subLock(tx, Number(r0.assignee_id));
  return substitutionOf(rows(await tx.execute(sql`SELECT * FROM physio_plan_substitutions WHERE id = ${id} FOR UPDATE`))[0]);
}

/** **سحبُ الطلب** — صاحبُه أو المُسنَد، ما دام منتظراً. */
export async function withdrawSubstitute(id: number, actor: Actor, meta: AuditMeta = {}) {
  const r = await db.transaction(async (tx) => {
    const s = await lockSub(tx, id);
    if (s.requestedBy !== actor.userId && s.assigneeId !== actor.userId) throw new PlanError(403, "يسحب الطلبَ صاحبُه", "not_requester");
    if (s.status !== "pending") throw new PlanError(409, "الطلبُ ليس منتظراً", "not_pending");
    const after = substitutionOf(rows(await tx.execute(sql`UPDATE physio_plan_substitutions SET status = 'withdrawn', withdrawn_at = now() WHERE id = ${id} RETURNING *`))[0]);
    await auditSub(tx, after, "substitute_withdraw", actor, {}, "سُحب طلبُ البديل", meta);
    return after;
  });
  notifyUser(r.substituteId, "physio_substitution");
  return r;
}

/** **قرارُ المعتمِد** على طلبٍ منتظر — اعتمادٌ (يُعاد فحصُ كلّ شيء تحت القفل) أو رفضٌ بملاحظة. */
export async function decideSubstitute(id: number, decision: "approve" | "reject", note: string | null, actor: Actor, meta: AuditMeta = {}) {
  if (!actor.isApprover) throw new PlanError(403, "يعتمد البديلَ المسؤولُ أو المشرفُ العام", "approver_only");
  const why = (note ?? "").trim();
  if (decision === "reject" && why.length < 3) throw new PlanError(400, "اكتب سببَ الرفض (ثلاثةُ أحرفٍ على الأقلّ)", "note_required");
  const today = baghdadToday();
  //  الإلغاءُ التلقائيّ يُلتزم قبل الرفض (٤٠٩) — فلا يبقى الطلبُ منتظراً بعد أن رُدّ.
  const lapsedFirst = await db.transaction(async (tx) => {
    const s = await lockSub(tx, id);
    if (s.status !== "pending") throw new PlanError(409, "الطلبُ ليس منتظراً", "not_pending");
    if (s.dateTo < today) {
      const l = await lapseExpiredTx(tx, today, s.assigneeId);
      await noticeAutoLapsedTx(tx, l.filter((x) => x.id === id), LAPSE_EXPIRED, actor.userId);
      return { code: "substitute_expired", msg: "انتهى أجلُ الطلب — أُلغي تلقائياً", s };
    }
    if (decision === "approve") {
      if (s.planId) {
        const pl = rows(await tx.execute(sql`SELECT p.status, pt.deleted_at FROM physio_plans p JOIN patients pt ON pt.id = p.patient_id WHERE p.id = ${s.planId} FOR UPDATE OF p`))[0];
        if (!pl || pl.status !== "approved" || pl.deleted_at) {
          const l = substitutionOf(rows(await tx.execute(sql`UPDATE physio_plan_substitutions SET status = 'lapsed', lapsed_at = now(), lapse_reason = ${LAPSE_PLAN_CLOSED} WHERE id = ${id} RETURNING *`))[0]);
          await auditSub(tx, l, "substitute_lapse", null, { reason: LAPSE_PLAN_CLOSED }, `أُلغي طلبُ البديل تلقائياً — ${LAPSE_PLAN_CLOSED}`);
          await noticeAutoLapsedTx(tx, [l], LAPSE_PLAN_CLOSED, actor.userId);
          return { code: "plan_closed", msg: "الخطّةُ منتهية — أُلغي الطلبُ تلقائياً", s: l };
        }
      }
      const held = await heldPartsTx(tx, s.assigneeId, { planId: s.planId, part: s.part });
      if (!held.length) {
        const l = substitutionOf(rows(await tx.execute(sql`UPDATE physio_plan_substitutions SET status = 'lapsed', lapsed_at = now(), lapse_reason = ${LAPSE_ASSIGNMENT_CHANGED} WHERE id = ${id} RETURNING *`))[0]);
        await auditSub(tx, l, "substitute_lapse", null, { reason: LAPSE_ASSIGNMENT_CHANGED }, `أُلغي طلبُ البديل تلقائياً — ${LAPSE_ASSIGNMENT_CHANGED}`);
        await noticeAutoLapsedTx(tx, [l], LAPSE_ASSIGNMENT_CHANGED, actor.userId);
        return { code: "assignment_changed", msg: "تغيّر الإسناد منذ الطلب — أُلغي تلقائياً", s: l };
      }
    }
    return null;
  });
  if (lapsedFirst) {
    notifyUser(lapsedFirst.s.assigneeId, "physio_substitution");
    if (lapsedFirst.s.requestedBy !== lapsedFirst.s.assigneeId) notifyUser(lapsedFirst.s.requestedBy, "physio_substitution");
    throw new PlanError(409, lapsedFirst.msg, lapsedFirst.code);
  }
  const r = await db.transaction(async (tx) => {
    const s = await lockSub(tx, id);
    if (s.status !== "pending") throw new PlanError(409, "الطلبُ ليس منتظراً", "not_pending");
    let after: SubstitutionRow;
    if (decision === "approve") {
      const held = await heldPartsTx(tx, s.assigneeId, { planId: s.planId, part: s.part });
      const sub = (await usersByIds(tx, [s.substituteId])).get(s.substituteId);
      if (!held.some((h) => eligibleIn(sub, h.branchId))) throw new PlanError(409, "البديلُ لم يعد مؤهَّلاً في فرع الخطّة", "substitute_ineligible");
      if (rows(await tx.execute(overlapSql(s.assigneeId, s.planId, s.part, s.dateFrom, s.dateTo, s.id))).length) {
        throw new PlanError(409, "لهذه الأيّام بديلٌ معتمَد يغطّي النطاقَ نفسَه", "substitute_overlap");
      }
      const effective = s.dateFrom > today ? s.dateFrom : today;
      after = substitutionOf(rows(await tx.execute(sql`UPDATE physio_plan_substitutions SET status = 'approved', effective_from = ${effective}::date, decided_by = ${actor.userId},
          decided_by_name = ${actor.name}, decided_at = now(), decision_note = ${why || null} WHERE id = ${id} RETURNING *`))[0]);
    } else {
      after = substitutionOf(rows(await tx.execute(sql`UPDATE physio_plan_substitutions SET status = 'rejected', decided_by = ${actor.userId}, decided_by_name = ${actor.name},
          decided_at = now(), decision_note = ${why} WHERE id = ${id} RETURNING *`))[0]);
    }
    await auditSub(tx, after, "substitute_decide", actor, { decision, note: why || null }, decision === "approve" ? "اعتُمد البديل" : `رُفض طلبُ البديل — ${why}`, meta);
    const scope = substitutionScopeLabel(after, after.planId ? await planLabelTx(tx, rows(await tx.execute(sql`SELECT * FROM physio_plans WHERE id = ${after.planId}`))[0]) : null);
    const targets = Array.from(new Set([after.assigneeId, after.requestedBy, ...(decision === "approve" ? [after.substituteId] : [])]));
    await enqueueStaffEvent(tx, { event: "physio_substitute_decided", targetUserIds: targets, excludeUserId: actor.userId,
      text: decision === "approve"
        ? `✅ اعتُمد البديل: ${after.substituteName ?? ""} يغطّي ${after.assigneeName ?? ""} — ${scope} — من ${ar(after.effectiveFrom ?? after.dateFrom)} إلى ${ar(after.dateTo)}`
        : `⛔ رُفض طلبُ البديل (${after.substituteName ?? ""} عن ${after.assigneeName ?? ""}) — ${why}`,
      linkPath: "/physio/today" });
    return after;
  });
  for (const u of Array.from(new Set([r.assigneeId, r.requestedBy, r.substituteId]))) notifyUser(u, "physio_substitution");
  return r;
}

/** **إنهاءُ بديلٍ معتمَد مبكّراً** — المعتمِدُ أو المُسنَد، بسبب. والجلساتُ المسجَّلة تبقى. */
export async function endSubstitute(id: number, reason: string, actor: Actor, meta: AuditMeta = {}) {
  const why = (reason ?? "").trim();
  const r = await db.transaction(async (tx) => {
    const s = await lockSub(tx, id);
    if (!actor.isApprover && s.assigneeId !== actor.userId) throw new PlanError(403, "يُنهي البديلَ المسؤولُ أو المشرفُ العام أو المُسنَدُ نفسُه", "not_allowed");
    if (why.length < 3) throw new PlanError(400, "اكتب سببَ الإنهاء (ثلاثةُ أحرفٍ على الأقلّ)", "reason_required");
    if (s.status !== "approved") throw new PlanError(409, "البديلُ ليس معتمَداً", "not_approved");
    const after = substitutionOf(rows(await tx.execute(sql`UPDATE physio_plan_substitutions SET status = 'lapsed', lapsed_at = now(), lapse_reason = ${why}, lapsed_by = ${actor.userId}
        WHERE id = ${id} RETURNING *`))[0]);
    await auditSub(tx, after, "substitute_end", actor, { reason: why }, `أُنهي البديلُ مبكّراً — ${why}`, meta);
    await enqueueStaffEvent(tx, { event: "physio_substitute_decided", targetUserIds: [after.assigneeId, after.substituteId], excludeUserId: actor.userId,
      text: `⏹ انتهى البديل مبكّراً: ${after.substituteName ?? ""} عن ${after.assigneeName ?? ""} — ${why}`, linkPath: "/physio/today" });
    return after;
  });
  notifyUser(r.assigneeId, "physio_substitution");
  notifyUser(r.substituteId, "physio_substitution");
  return r;
}

/** **خطّةٌ تُغلق** (إيقاف · تخرّج · حذف): بدائلُها المنتظرة والمعتمَدةُ التي لم تنتهِ تُلغى «أُغلقت الخطّة»؛ وبدائلُ «كلّ خططه» لا تُمسّ (لا تعود تطابقها). */
export async function lapseOnCloseTx(tx: any, planId: number, actor: Actor | null = null): Promise<SubstitutionRow[]> {
  const today = baghdadToday();
  const live = sql`plan_id = ${planId} AND (status = 'pending' OR (status = 'approved' AND date_to >= ${today}::date))`;
  //  القفلُ بالترتيب الواحد (الخطّةُ عند المُستدعي ⟵ مُسنَدو البدائل ⟵ الصفوف).
  await subLocksTx(tx, rows(await tx.execute(sql`SELECT DISTINCT assignee_id FROM physio_plan_substitutions WHERE ${live}`)).map((x) => Number(x.assignee_id)));
  const r = rows(await tx.execute(sql`UPDATE physio_plan_substitutions SET status = 'lapsed', lapsed_at = now(), lapse_reason = ${LAPSE_PLAN_CLOSED}, lapsed_by = NULL
      WHERE ${live} RETURNING *`)).map(substitutionOf);
  for (const s of r) await auditSub(tx, s, "substitute_lapse", null, { reason: LAPSE_PLAN_CLOSED }, `أُلغي البديلُ تلقائياً — ${LAPSE_PLAN_CLOSED}`);
  //  **ولا يُلغى بصمت**: المُسنَدُ والبديلُ (لما اعتُمد) وصاحبُ الطلب يُبلَّغون، وصفحاتُهم تتحدّث بإشارة الكتابة نفسِها.
  await noticeAutoLapsedTx(tx, r, LAPSE_PLAN_CLOSED, actor?.userId ?? null);
  return r;
}

// ══ القراءة ═════════════════════════════════════════════════════════════════════════════════════════
/** **طلبٌ منتظر مضى أجلُه** يُعرض «أُلغي تلقائياً — انتهى أجلُه» بلا كتابةٍ في القراءة (يُكتب كسولاً عند أوّل طلبٍ أو قرارٍ على مُسنَده). */
const asRead = (s: SubstitutionRow, today: string): SubstitutionRow & { expired: boolean } =>
  s.status === "pending" && s.dateTo < today ? { ...s, status: "lapsed", lapseReason: LAPSE_EXPIRED, expired: true } : { ...s, expired: false };

async function decorateSubs(ex: any, list: SubstitutionRow[]) {
  const planIds = Array.from(new Set(list.map((s) => s.planId).filter((x): x is number => x != null)));
  const plans = planIds.length ? rows(await ex.execute(sql`SELECT p.id, p.title_ar, p.patient_id, p.branch_id, pt.name AS patient_name, pt.patient_code, b.name AS branch_name
      FROM physio_plans p JOIN patients pt ON pt.id = p.patient_id LEFT JOIN branches b ON b.id = p.branch_id
     WHERE p.id IN (${sql.join(planIds.map((i) => sql`${i}`), sql`, `)})`)) : [];
  const byPlan = new Map(plans.map((p) => [Number(p.id), p]));
  const assignees = Array.from(new Set(list.filter((s) => s.planId == null).map((s) => s.assigneeId)));
  const counts = new Map<number, number>();
  for (const a of assignees) counts.set(a, (await heldPartsTx(ex, a, { planId: null, part: null })).reduce((acc, h) => acc.add(h.planId), new Set<number>()).size);
  const subUsers = await usersByIds(ex, list.map((s) => s.substituteId));
  return list.map((s) => {
    const p = s.planId ? byPlan.get(s.planId) : null;
    return { ...s, statusLabel: s.status, plan: p ? { id: Number(p.id), titleAr: p.title_ar, patientId: Number(p.patient_id), patientName: p.patient_name,
      patientCode: p.patient_code ?? null, branchName: p.branch_name ?? null } : null,
      coveredPlans: s.planId == null ? counts.get(s.assigneeId) ?? 0 : 1, substituteCanDryNeedle: subUsers.get(s.substituteId)?.canDryNeedle ?? false };
  });
}

/** طابورُ البدلاء للمعتمِد: «بانتظار القرار» أقدمُها أوّلاً، و«المحسومة» أحدثُها (آخرُ ١٠٠). */
export async function listSubstitutions(view: "pending" | "decided") {
  const today = baghdadToday();
  //  القراءةُ لا تكتب: المنتهي أجلُه يُعرض في «المحسومة» بحاله المحسوبة.
  const r = view === "pending"
    ? rows(await db.execute(sql`SELECT s.* FROM physio_plan_substitutions s LEFT JOIN physio_plans p ON p.id = s.plan_id LEFT JOIN patients pt ON pt.id = p.patient_id
        WHERE s.status = 'pending' AND s.date_to >= ${today}::date AND (s.plan_id IS NULL OR pt.deleted_at IS NULL) ORDER BY s.requested_at ASC LIMIT 200`))
    : rows(await db.execute(sql`SELECT s.* FROM physio_plan_substitutions s WHERE s.status <> 'pending' OR s.date_to < ${today}::date
        ORDER BY COALESCE(s.lapsed_at, s.withdrawn_at, s.decided_at, (s.date_to + 1)::timestamp, s.requested_at) DESC LIMIT 100`));
  return decorateSubs(db, r.map(substitutionOf).map((s) => asRead(s, today)));
}
/** عددُ الطلبات المنتظرة (غيرُ المنتهية — بالشرط، فلا يحتاج كتابة). */
export async function pendingSubstituteCount(): Promise<number> {
  const today = baghdadToday();
  return Number(rows(await db.execute(sql`SELECT count(*)::int AS n FROM physio_plan_substitutions s LEFT JOIN physio_plans p ON p.id = s.plan_id
      LEFT JOIN patients pt ON pt.id = p.patient_id WHERE s.status = 'pending' AND s.date_to >= ${today}::date AND (s.plan_id IS NULL OR pt.deleted_at IS NULL)`))[0]?.n ?? 0);
}

/** طلباتُ البديل التي تخصّ هذا الموظّف: طلبها، أو هو المُسنَدُ فيها، أو البديل — المنتظرة، والمعتمَدةُ القائمة، وما حُسم في سبعة أيّام. */
export async function mySubstitutions(userId: number) {
  const today = baghdadToday();
  const r = rows(await db.execute(sql`SELECT * FROM physio_plan_substitutions WHERE (requested_by = ${userId} OR assignee_id = ${userId} OR substitute_id = ${userId})
      AND (status = 'pending' OR (status = 'approved' AND date_to >= ${today}::date)
           OR COALESCE(lapsed_at, withdrawn_at, decided_at) >= now() - interval '7 days')
      ORDER BY requested_at DESC LIMIT 50`)).map(substitutionOf).map((s) => asRead(s, today));
  return (await decorateSubs(db, r)).map((s) => ({ ...s,
    unseen: (s.substituteId === userId && s.status === "approved" && !s.substituteSeenAt)
      || ((s.requestedBy === userId || s.assigneeId === userId) && s.status !== "pending" && !s.requesterSeenAt && s.lapsedBy !== userId) }));
}

/** **خططُ Bionic AI المعتمَدة بلا إسنادٍ مؤهَّلٍ لجزءٍ مطلوب** — للمعتمِد. */
export async function listUnassignedOpusPlans(branchIds: number[] | null) {
  const plans = rows(await db.execute(sql`SELECT p.*, pt.name AS patient_name, pt.patient_code, b.name AS branch_name,
        (SELECT count(*)::int FROM physio_plan_sessions s WHERE s.plan_id = p.id AND s.cancelled_at IS NULL) AS sessions_done
      FROM physio_plans p JOIN patients pt ON pt.id = p.patient_id LEFT JOIN branches b ON b.id = p.branch_id
     WHERE p.origin = 'opus' AND p.status = 'approved' AND pt.deleted_at IS NULL
       ${branchIds ? (branchIds.length ? sql`AND p.branch_id IN (${sql.join(branchIds.map((i) => sql`${i}`), sql`, `)})` : sql`AND false`) : sql``}
     ORDER BY p.decided_at ASC NULLS LAST, p.id ASC`));
  const v = await verdictsFor(db, plans, { userId: null, approver: true }, baghdadToday());
  return plans.map((p) => ({ p, missing: missingAssignments(v.get(Number(p.id))!) })).filter((x) => x.missing.length).map(({ p, missing }) => ({
    id: Number(p.id), titleAr: p.title_ar, patientId: Number(p.patient_id), patientName: p.patient_name, patientCode: p.patient_code ?? null, branchId: Number(p.branch_id),
    branchName: p.branch_name ?? null, opusVersion: p.opus_version ?? null, decidedAt: iso(p.decided_at), decidedByName: p.decided_by_name ?? null,
    sessionsDone: Number(p.sessions_done ?? 0), totalSessions: p.total_sessions ?? null, missingParts: missing, parts: v.get(Number(p.id))!.plan.parts }));
}
export async function unassignedOpusCount(branchIds: number[] | null = null): Promise<number> {
  return (await listUnassignedOpusPlans(branchIds)).length;
}

/** **مَن يحمل كلَّ جزءٍ اليوم** — المُسنَدُ المؤهَّل والبدلاءُ المعتمَدون النافذون (لافتةُ النسخة والأوراقُ المطبوعة في المرحلة الخامسة). */
export async function partHoldersOf(ex: any, planId: number, today = baghdadToday()): Promise<Record<PlanPart, number[]>> {
  const p = rows(await ex.execute(sql`SELECT * FROM physio_plans WHERE id = ${planId}`))[0];
  const out: Record<PlanPart, number[]> = { devices: [], exercises: [] };
  if (!p) return out;
  const v = (await verdictsFor(ex, [p], { userId: null, approver: true }, today)).get(planId);
  if (!v) return out;
  for (const part of v.plan.parts) {
    const a = v.assignments.get(part);
    if (!a?.eligible) continue;
    out[part].push(a.userId);
    for (const s of v.subs) {
      if (substitutionCovers({ ...s, substituteEligibleHere: eligibleIn(v.users.get(s.substituteId), v.plan.branchId) }, planId, part, a.userId, today, a.assignedAt)) out[part].push(s.substituteId);
    }
    out[part] = Array.from(new Set(out[part]));
  }
  return out;
}

/** **«رآه»** — المُسنَدُ فتح خطّته (مرّةً لكلّ إسناد). */
export async function markAssignmentSeen(planId: number, actor: Actor): Promise<PlanPart[]> {
  if (!actor.userId) return [];
  return db.transaction(async (tx) => {
    const r = rows(await tx.execute(sql`UPDATE physio_plan_part_assignments SET seen_at = now() WHERE plan_id = ${planId} AND user_id = ${actor.userId} AND seen_at IS NULL RETURNING part`));
    if (r.length) {
      const b = rows(await tx.execute(sql`SELECT branch_id FROM physio_plans WHERE id = ${planId}`))[0];
      await logAudit({ entityType: "physio_plan", entityId: planId, action: "assignment_seen", userId: actor.userId, userName: actor.name, branchId: b?.branch_id ?? null,
        newValues: { parts: r.map((x) => x.part) }, notes: `اطّلع المُسنَدُ على إسناده: ${r.map((x) => PART_LABELS[x.part as PlanPart]).join(" و")}`, tx });
    }
    return r.map((x) => x.part as PlanPart);
  });
}
export async function markSubstitutionsSeen(ids: number[], actor: Actor): Promise<number> {
  if (!actor.userId || !ids.length) return 0;
  const today = baghdadToday();
  const list = sql.join(ids.map((i) => sql`${i}`), sql`, `);
  const n = await db.transaction(async (tx) => {
    const a = rows(await tx.execute(sql`UPDATE physio_plan_substitutions SET substitute_seen_at = now() WHERE id IN (${list}) AND substitute_id = ${actor.userId}
        AND substitute_seen_at IS NULL AND status = 'approved' RETURNING *`)).map(substitutionOf);
    const b = rows(await tx.execute(sql`UPDATE physio_plan_substitutions SET requester_seen_at = now() WHERE id IN (${list})
        AND (requested_by = ${actor.userId} OR assignee_id = ${actor.userId}) AND requester_seen_at IS NULL
        AND (status <> 'pending' OR date_to < ${today}::date) RETURNING *`)).map(substitutionOf);
    //  سطرُ تدقيقٍ لكلّ طلبٍ اطّلع عليه — كـ«assignment_seen».
    const seen = new Map<number, SubstitutionRow>();
    for (const s of [...a, ...b]) seen.set(s.id, s);
    for (const s of Array.from(seen.values())) await auditSub(tx, s, "substitute_seen", actor, { as: a.some((x) => x.id === s.id) ? "substitute" : "requester" }, "اطّلع على طلب البديل");
    return seen.size;
  });
  if (n) notifyUser(actor.userId, "physio_substitution");
  return n;
}

/** **حالُ الإسناد في صفحة الخطّة** (§6.4) — لخطّة Bionic AI المعتمَدة أو المنتهية. */
export async function assignmentView(plan: Record<string, any>, viewer: { userId: number | null; approver: boolean; session: any; scope?: number[] | null }, today = baghdadToday()) {
  const v = (await verdictsFor(db, [plan], { userId: viewer.userId, approver: viewer.approver }, today)).get(Number(plan.id))!;
  const required = v.plan.parts;
  const planHasNeedle = Boolean(rows(await db.execute(sql`SELECT 1 FROM physio_plan_devices l JOIN devices d ON d.id = l.device_id WHERE l.plan_id = ${plan.id} AND d.code = 'needle' LIMIT 1`)).length);
  const subsAll = rows(await db.execute(sql`SELECT * FROM physio_plan_substitutions s WHERE (s.plan_id = ${plan.id}
        OR (s.plan_id IS NULL AND s.assignee_id IN (SELECT user_id FROM physio_plan_part_assignments WHERE plan_id = ${plan.id})))
      ORDER BY s.requested_at DESC LIMIT 30`)).map(substitutionOf);
  const today_ = today;
  const relevant = subsAll.filter((s) => s.status === "pending" || (s.status === "approved" && s.dateTo >= today_));
  const recent = subsAll.filter((s) => !relevant.includes(s)).slice(0, 10);
  const mine = (s: SubstitutionRow) => viewer.userId != null && [s.assigneeId, s.substituteId, s.requestedBy].includes(viewer.userId);
  const substitutions = await decorateSubs(db, (viewer.approver ? [...relevant, ...recent] : subsAll.filter(mine)));
  const parts = required.map((part) => {
    const a = v.assignments.get(part);
    return { part, assignee: a ? { id: a.userId, name: a.user?.name ?? null, role: a.user?.role ?? null, eligible: a.eligible, canDryNeedle: a.user?.canDryNeedle ?? false } : null,
      //  **سببُ تغيير الإسناد للمعتمِد وللمُسنَد نفسِه وحدهما** — كملاحظة المعتمِد في النسخ (§4.hb): لا تصل الفرعَ كلَّه.
      assignedAt: a?.assignedAt ?? null, assignedByName: a?.assignedByName ?? null, assignedVersion: a?.assignedVersion ?? null,
      reason: a && (viewer.approver || a.userId === viewer.userId) ? a.reason ?? null : null,
      seenByHolder: Boolean(a?.seenAt) };
  });
  const verdicts = Object.fromEntries(required.map((p) => { const x = v.verdicts[p]!; return [p, x.ok ? { ok: true, via: x.via } : { ok: false, code: x.code, reasonAr: x.reasonAr }]; }));
  const myUnseen = required.filter((p) => { const a = v.assignments.get(p); return a && a.userId === viewer.userId && !a.seenAt; });
  const canRequestSubstitute = required.filter((p) => { const a = v.assignments.get(p); return a && a.eligible && a.userId === viewer.userId; });
  //  **جلسةُ اليوم المفتوحة** بجزءٍ ناقص — «إكمال جلسة اليوم» على الزيارة نفسِها.
  const todays = rows(await db.execute(sql`SELECT s.id, s.session_date, s.parts_required, s.phase_position,
        (SELECT count(*)::int FROM physio_plan_sessions s2 WHERE s2.plan_id = s.plan_id AND s2.cancelled_at IS NULL AND s2.id < s.id) AS before
      FROM physio_plan_sessions s WHERE s.plan_id = ${plan.id} AND s.cancelled_at IS NULL AND s.session_date = ${today}::date AND s.parts_required IS NOT NULL ORDER BY s.id`));
  let openSession: { id: number; date: string; recordedParts: { part: PlanPart; byName: string | null; at: string | null }[]; missingParts: PlanPart[];
    sessionsBefore: number; phasePosition: number | null } | null = null;
  for (const t of todays) {
    const rec = rows(await db.execute(sql`SELECT part, recorded_by_name, recorded_at FROM physio_plan_session_parts WHERE session_id = ${t.id} ORDER BY recorded_at`));
    const miss = PLAN_PARTS.filter((p) => (t.parts_required ?? []).includes(p) && required.includes(p) && !rec.some((r) => r.part === p));
    if (miss.length) {
      openSession = { id: Number(t.id), date: ymd(t.session_date), recordedParts: rec.map((r) => ({ part: r.part, byName: r.recorded_by_name ?? null, at: iso(r.recorded_at) })),
        missingParts: miss, sessionsBefore: Number(t.before ?? 0), phasePosition: t.phase_position ?? null };
      break;
    }
  }
  return { required, parts, awaiting: missingAssignments(v).length > 0, missingParts: missingAssignments(v), openSession,
    canAssign: viewer.approver && plan.status === "approved", canClose: canClosePlan(viewer.session, { origin: "opus", branchId: Number(plan.branch_id ?? plan.branchId) }, viewer.scope ?? null) && plan.status === "approved",
    planHasNeedle, verdicts, myUnseen, canRequestSubstitute, substitutions };
}

export async function assignmentViewById(planId: number, viewer: { userId: number | null; approver: boolean; session: any; scope?: number[] | null }) {
  const r = rows(await db.execute(sql`SELECT * FROM physio_plans WHERE id = ${planId}`))[0];
  return assignmentView(r, viewer);
}
