// **مكتبةُ بروتوكولات العلاج الطبيعي** (ترحيل ١٠٦، §4.cj) — طبقةُ البيانات. القواعدُ في `shared/physio_protocols.ts`.
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  branches, devices, physioDeviceBranches, physioProtocolDevices, physioProtocolImages, physioProtocolMeasures, physioProtocols,
  type PhysioProtocol,
} from "@shared/schema";
import type { MeasureDef } from "@shared/physio_assessments";
import { deviceParamsLine, doseLine, mergeDose, normalizeDeviceParams } from "@shared/physio_exercises";
import { getPhases } from "./exercises_store";
import { searchProtocolIds } from "./search";
import {
  AGE_GROUP_LABELS, AGE_GROUP_LABELS_EN, CENTRE_USE_HINTS, CENTRE_USE_HINTS_EN, CENTRE_USE_LABELS, CENTRE_USE_LABELS_EN, centreUseOf,
  EVIDENCE_LABELS, EVIDENCE_LABELS_EN, PROTOCOL_CATEGORY_LABELS, PROTOCOL_CATEGORY_LABELS_EN, type CentreUse,
  PROTOCOL_TEXT_FIELDS, localizedText,
  type AgeGroup, type EvidenceLevel, type ProtocolCategory, type ProtocolLang, type ProtocolReference, type ProtocolStatus,
} from "@shared/physio_protocols";

export class ProtocolError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export interface DeviceLineInput {
  deviceId: number; evidence: EvidenceLevel; parameters: string | null; minutes: number | null; note: string | null;
  parametersEn: string | null; noteEn: string | null;
  /** §4.cx — خاناتُ الجهاز (`DEVICE_PARAM_FIELDS`)، تُتحقَّق برمز الجهاز في `assertDevices`. */
  params: Record<string, string>;
  /** ترحيل ١٢٢ — «استعمالُ المركز»؛ `null` يُشتقّ من درجة الدليل (`centreUseOf`). */
  centreUse?: CentreUse | null;
}
export interface ProtocolInput {
  code: string; titleAr: string; titleEn: string; category: string; ageGroup: string;
  summary: string | null; goals: string | null; assessment: string | null; exercises: string | null;
  contraindications: string | null; precautions: string | null;
  summaryEn: string | null; goalsEn: string | null; assessmentEn: string | null; exercisesEn: string | null;
  contraindicationsEn: string | null; precautionsEn: string | null;
  sessionsPerWeek: number | null; durationWeeks: number | null; sessionMinutes: number | null;
  /** ترحيل ١٢٣ — عددُ الجلسات، والأسابيعُ مشتقّةٌ منه (`normalizeDose` في `parseProtocolBody`). */
  totalSessions: number | null;
  references: ProtocolReference[]; devices: DeviceLineInput[];
}
export interface Actor { userId: number | null; name: string | null }

/**
 * قائمةُ المكتبة — بعددِ أجهزة كلّ بروتوكولٍ وعددِ ما دليلُه قويّ.
 * **ومع سؤال** (§4.dc): البحثُ في كلّ ما داخل البروتوكول بتطبيعٍ عربيٍّ واحد (`searchProtocolIds`) — والنتائجُ بترتيب الأدقّ، ولكلٍّ
 * `match`: أين وُجدت الكلمات ومقتطفٌ حولها. والمرشّحاتُ (الفئة والعمر والحالة والأرشيف) تُطبَّق قبل البحث.
 */
export async function listProtocols(p: { q?: string; category?: string; ageGroup?: string; status?: string; archived?: boolean; lang?: "ar" | "en" }) {
  const conds: any[] = [eq(physioProtocols.isArchived, Boolean(p.archived))];
  if (p.category) conds.push(eq(physioProtocols.category, p.category));
  if (p.ageGroup) conds.push(eq(physioProtocols.ageGroup, p.ageGroup));
  if (p.status) conds.push(eq(physioProtocols.status, p.status));
  const rows = await listRows(conds);
  const q = (p.q ?? "").trim();
  if (!q) return rows;
  const matches = await searchProtocolIds(rows.map((r) => r.id), q, p.lang);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return matches.map((m) => ({ ...byId.get(m.id)!, match: m }));
}

async function listRows(conds: any[]) {
  return db.select({
    id: physioProtocols.id, code: physioProtocols.code, titleAr: physioProtocols.titleAr, titleEn: physioProtocols.titleEn,
    category: physioProtocols.category, ageGroup: physioProtocols.ageGroup, status: physioProtocols.status,
    isArchived: physioProtocols.isArchived, updatedAt: physioProtocols.updatedAt,
    totalSessions: physioProtocols.totalSessions, sessionsPerWeek: physioProtocols.sessionsPerWeek,
    deviceCount: sql<number>`(SELECT count(*)::int FROM physio_protocol_devices d WHERE d.protocol_id = "physio_protocols"."id")`,
    recommendedCount: sql<number>`(SELECT count(*)::int FROM physio_protocol_devices d WHERE d.protocol_id = "physio_protocols"."id" AND d.evidence = 'recommended')`,
  }).from(physioProtocols).where(and(...conds))
    .orderBy(asc(physioProtocols.category), asc(physioProtocols.titleAr));
}

/** البروتوكولُ كاملاً: أجهزتُه بأسمائها وتوفّرِ كلٍّ منها في كلّ فرع، وصورُه بلا محتواها. */
export async function getProtocol(id: number) {
  const [p] = await db.select().from(physioProtocols).where(eq(physioProtocols.id, id));
  if (!p) return null;
  const lines = await db.select({
    id: physioProtocolDevices.id, deviceId: physioProtocolDevices.deviceId, evidence: physioProtocolDevices.evidence,
    parameters: physioProtocolDevices.parameters, minutes: physioProtocolDevices.minutes, note: physioProtocolDevices.note,
    parametersEn: physioProtocolDevices.parametersEn, noteEn: physioProtocolDevices.noteEn,
    params: physioProtocolDevices.params, centreUse: physioProtocolDevices.centreUse,
    displayOrder: physioProtocolDevices.displayOrder,
    code: devices.code, nameAr: devices.nameAr, nameEn: devices.nameEn,
  }).from(physioProtocolDevices).innerJoin(devices, eq(devices.id, physioProtocolDevices.deviceId))
    .where(eq(physioProtocolDevices.protocolId, id))
    .orderBy(asc(physioProtocolDevices.displayOrder), asc(devices.displayOrder));
  const avail = await availabilityRows();
  const images = await db.select({
    id: physioProtocolImages.id, caption: physioProtocolImages.caption, sourceUrl: physioProtocolImages.sourceUrl,
    credit: physioProtocolImages.credit, mimeType: physioProtocolImages.mimeType, sizeBytes: physioProtocolImages.sizeBytes,
  }).from(physioProtocolImages).where(eq(physioProtocolImages.protocolId, id)).orderBy(asc(physioProtocolImages.id));
  const measures = (await db.select().from(physioProtocolMeasures).where(eq(physioProtocolMeasures.protocolId, id))
    .orderBy(asc(physioProtocolMeasures.displayOrder), asc(physioProtocolMeasures.id)))
    .map((m) => ({ code: m.code, nameAr: m.nameAr, nameEn: m.nameEn, unitAr: m.unitAr, unitEn: m.unitEn,
      min: Number(m.minValue), max: Number(m.maxValue), higherIsBetter: m.higherIsBetter }));
  return {
    ...p,
    //  «استعمالُ المركز» فعّالاً — المكتوبُ أو المشتقُّ من درجة الدليل (`centreUse`)، ومعه هل كُتب (`centreUseSet`).
    devices: lines.map((l) => ({ ...l, centreUse: centreUseOf(l), centreUseSet: l.centreUse !== null && l.centreUse !== undefined,
      availableBranchIds: avail.filter((a) => a.deviceId === l.deviceId && a.available).map((a) => a.branchId) })),
    images,
    measures,
    //  §4.cx — مراحلُ البرنامج بتمارينها وبطاقاتها كاملة.
    phases: await getPhases(id),
  };
}

async function availabilityRows() {
  return db.select({ deviceId: physioDeviceBranches.deviceId, branchId: physioDeviceBranches.branchId, available: physioDeviceBranches.available })
    .from(physioDeviceBranches);
}

function rowValues(input: ProtocolInput) {
  return {
    code: input.code, titleAr: input.titleAr, titleEn: input.titleEn, category: input.category, ageGroup: input.ageGroup,
    summary: input.summary, goals: input.goals, assessment: input.assessment, exercises: input.exercises,
    contraindications: input.contraindications, precautions: input.precautions,
    summaryEn: input.summaryEn, goalsEn: input.goalsEn, assessmentEn: input.assessmentEn, exercisesEn: input.exercisesEn,
    contraindicationsEn: input.contraindicationsEn, precautionsEn: input.precautionsEn,
    sessionsPerWeek: input.sessionsPerWeek, durationWeeks: input.durationWeeks, sessionMinutes: input.sessionMinutes,
    totalSessions: input.totalSessions,
    references: input.references,
  };
}

async function writeDevices(tx: any, protocolId: number, lines: DeviceLineInput[]) {
  await tx.delete(physioProtocolDevices).where(eq(physioProtocolDevices.protocolId, protocolId));
  if (!lines.length) return;
  await tx.insert(physioProtocolDevices).values(lines.map((l, i) => ({
    protocolId, deviceId: l.deviceId, evidence: l.evidence, parameters: l.parameters, minutes: l.minutes, note: l.note,
    parametersEn: l.parametersEn, noteEn: l.noteEn, params: l.params ?? {}, centreUse: l.centreUse ?? null, displayOrder: i,
  })));
}

/** يتأكّد أنّ الأجهزة موجودةٌ وفعّالة وغيرُ مكرّرة. */
export async function assertDevices(lines: DeviceLineInput[]) {
  const ids = lines.map((l) => l.deviceId);
  if (new Set(ids).size !== ids.length) throw new ProtocolError(400, "جهازٌ مكرّر في البروتوكول");
  if (!ids.length) return;
  const found = await db.select({ id: devices.id, code: devices.code }).from(devices).where(and(inArray(devices.id, ids), eq(devices.isActive, true)));
  if (found.length !== ids.length) throw new ProtocolError(400, "جهازٌ غير معروف");
  //  خاناتُ المعاملات لكلّ جهازٍ ما يخصّه وحده — «التردّد» لا يُكتب لكمادةٍ حارّة.
  for (const l of lines) {
    const code = found.find((f) => f.id === l.deviceId)?.code;
    const params = normalizeDeviceParams(code, l.params);
    if (typeof params === "string") throw new ProtocolError(400, params);
    l.params = params;
  }
}

export async function createProtocol(input: ProtocolInput, actor: Actor) {
  await assertDevices(input.devices);
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx.insert(physioProtocols).values({
        ...rowValues(input), status: "draft",
        createdBy: actor.userId, createdByName: actor.name, updatedBy: actor.userId, updatedByName: actor.name,
      }).returning();
      await writeDevices(tx, row.id, input.devices);
      return row;
    });
  } catch (e: any) {
    if (e?.code === "23505") throw new ProtocolError(409, "هذا الرمزُ مستعملٌ لبروتوكولٍ آخر");
    throw e;
  }
}

/** تعديلٌ كامل — والحالةُ بعده يقرّرها المُنادي (`statusAfterEdit`). يُرجع ما قبلُ وما بعدُ لسطر التدقيق. */
export async function updateProtocol(id: number, input: ProtocolInput, nextStatus: ProtocolStatus, actor: Actor) {
  await assertDevices(input.devices);
  try {
    return await db.transaction(async (tx) => {
      const [before] = await tx.select().from(physioProtocols).where(eq(physioProtocols.id, id)).for("update");
      if (!before) throw new ProtocolError(404, "البروتوكول غير موجود");
      const beforeDevices = await tx.select().from(physioProtocolDevices).where(eq(physioProtocolDevices.protocolId, id));
      const demote = before.status === "approved" && nextStatus === "draft";
      const [after] = await tx.update(physioProtocols).set({
        ...rowValues(input), status: nextStatus,
        ...(demote ? { approvedBy: null, approvedByName: null, approvedAt: null } : {}),
        updatedBy: actor.userId, updatedByName: actor.name, updatedAt: new Date(),
      }).where(eq(physioProtocols.id, id)).returning();
      await writeDevices(tx, id, input.devices);
      return { before: { ...before, devices: beforeDevices }, after, demoted: demote };
    });
  } catch (e: any) {
    if (e?.code === "23505") throw new ProtocolError(409, "هذا الرمزُ مستعملٌ لبروتوكولٍ آخر");
    throw e;
  }
}

export async function approveProtocol(id: number, actor: Actor) {
  const [row] = await db.update(physioProtocols).set({
    status: "approved", approvedBy: actor.userId, approvedByName: actor.name, approvedAt: new Date(),
  }).where(and(eq(physioProtocols.id, id), eq(physioProtocols.status, "draft"), eq(physioProtocols.isArchived, false))).returning();
  if (!row) throw new ProtocolError(409, "ليس مسوّدةً قائمة — أعد فتح الصفحة");
  return row;
}

// ── مقاييسُ البروتوكول (§4.cp) ────────────────────────────────────────────────────────────────────────────
/**
 * **المقاييسُ تُستبدل كاملة**. واعتمادُها مستقلٌّ عن البروتوكول: تعديلُ غيرِ المعتمِد يعيدها مسوّدة، وتعديلُ المعتمِد يُبقي حالَها.
 * والتقييماتُ القديمة لا تتغيّر — قياساتُها لقطةٌ بتعريفها يومَها.
 */
export async function setMeasures(id: number, list: MeasureDef[], keepStatus: boolean, actor: Actor) {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(physioProtocols).where(eq(physioProtocols.id, id)).for("update");
    if (!before) throw new ProtocolError(404, "البروتوكول غير موجود");
    if (before.isArchived) throw new ProtocolError(409, "البروتوكولُ مؤرشف — استعِده أوّلاً");
    const old = await tx.select().from(physioProtocolMeasures).where(eq(physioProtocolMeasures.protocolId, id));
    await tx.delete(physioProtocolMeasures).where(eq(physioProtocolMeasures.protocolId, id));
    if (list.length) {
      await tx.insert(physioProtocolMeasures).values(list.map((m, i) => ({
        protocolId: id, code: m.code, nameAr: m.nameAr, nameEn: m.nameEn, unitAr: m.unitAr, unitEn: m.unitEn,
        minValue: String(m.min), maxValue: String(m.max), higherIsBetter: m.higherIsBetter, displayOrder: i,
      })));
    }
    const status = keepStatus ? before.measuresStatus : "draft";
    const [after] = await tx.update(physioProtocols).set(status === "draft"
      ? { measuresStatus: "draft", measuresApprovedBy: null, measuresApprovedByName: null, measuresApprovedAt: null }
      : { measuresStatus: status }).where(eq(physioProtocols.id, id)).returning();
    return { before: { measuresStatus: before.measuresStatus, measures: old }, after, demoted: before.measuresStatus === "approved" && status === "draft" };
  });
}

export async function approveMeasures(id: number, actor: Actor) {
  const [row] = await db.update(physioProtocols).set({
    measuresStatus: "approved", measuresApprovedBy: actor.userId, measuresApprovedByName: actor.name, measuresApprovedAt: new Date(),
  }).where(and(eq(physioProtocols.id, id), eq(physioProtocols.measuresStatus, "draft"), eq(physioProtocols.isArchived, false))).returning();
  if (!row) throw new ProtocolError(409, "المقاييسُ ليست مسوّدةً قائمة — أعد فتح الصفحة");
  return row;
}

export async function setArchived(id: number, archived: boolean, actor: Actor) {
  const [row] = await db.update(physioProtocols).set({
    isArchived: archived, updatedBy: actor.userId, updatedByName: actor.name, updatedAt: new Date(),
  }).where(and(eq(physioProtocols.id, id), eq(physioProtocols.isArchived, !archived))).returning();
  if (!row) throw new ProtocolError(409, archived ? "مؤرشفٌ أصلاً" : "ليس مؤرشفاً");
  return row;
}

export async function getProtocolRow(id: number): Promise<PhysioProtocol | null> {
  const [p] = await db.select().from(physioProtocols).where(eq(physioProtocols.id, id));
  return p ?? null;
}

// ── الصور ─────────────────────────────────────────────────────────────────────
export const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export async function addImage(p: { protocolId: number; content: Buffer; mimeType: string; caption: string | null; sourceUrl: string | null; credit: string | null; userId: number | null }) {
  const [row] = await db.insert(physioProtocolImages).values({
    protocolId: p.protocolId, content: p.content, mimeType: p.mimeType, sizeBytes: p.content.length,
    caption: p.caption, sourceUrl: p.sourceUrl, credit: p.credit, createdBy: p.userId,
  }).returning({ id: physioProtocolImages.id, protocolId: physioProtocolImages.protocolId, caption: physioProtocolImages.caption,
    sourceUrl: physioProtocolImages.sourceUrl, credit: physioProtocolImages.credit, sizeBytes: physioProtocolImages.sizeBytes });
  return row;
}

export async function getImage(imageId: number) {
  const [row] = await db.select().from(physioProtocolImages).where(eq(physioProtocolImages.id, imageId));
  return row ?? null;
}

export async function deleteImage(protocolId: number, imageId: number) {
  const [row] = await db.delete(physioProtocolImages)
    .where(and(eq(physioProtocolImages.id, imageId), eq(physioProtocolImages.protocolId, protocolId)))
    .returning({ id: physioProtocolImages.id, caption: physioProtocolImages.caption, sourceUrl: physioProtocolImages.sourceUrl });
  return row ?? null;
}

// ── توفّرُ الأجهزة بالفروع ─────────────────────────────────────────────────────
/** الأجهزةُ الفعّالة، والفروعُ، والمتوفّرُ في كلّ فرع — مصفوفةٌ للشاشة. */
export async function deviceMatrix() {
  const devs = await db.select({ id: devices.id, code: devices.code, nameAr: devices.nameAr, nameEn: devices.nameEn })
    .from(devices).where(eq(devices.isActive, true)).orderBy(asc(devices.displayOrder));
  const brs = await db.select({ id: branches.id, name: branches.name }).from(branches).orderBy(asc(branches.id));
  const avail = await availabilityRows();
  return { devices: devs, branches: brs, available: avail.filter((a) => a.available).map((a) => `${a.deviceId}:${a.branchId}`) };
}

export async function setAvailability(deviceId: number, branchId: number, available: boolean, userId: number | null) {
  const [dev] = await db.select({ id: devices.id }).from(devices).where(eq(devices.id, deviceId));
  const [br] = await db.select({ id: branches.id }).from(branches).where(eq(branches.id, branchId));
  if (!dev || !br) throw new ProtocolError(404, "الجهاز أو الفرع غير موجود");
  const [before] = await db.select().from(physioDeviceBranches)
    .where(and(eq(physioDeviceBranches.deviceId, deviceId), eq(physioDeviceBranches.branchId, branchId)));
  await db.insert(physioDeviceBranches).values({ deviceId, branchId, available, updatedBy: userId, updatedAt: new Date() })
    .onConflictDoUpdate({ target: [physioDeviceBranches.deviceId, physioDeviceBranches.branchId], set: { available, updatedBy: userId, updatedAt: new Date() } });
  return { before: before ? before.available : false, after: available };
}


// ── موجزُ البروتوكول للمساعد الذكي (§4.cj) ─────────────────────────────────────
// **كائنٌ واحدٌ متداخل لا مصفوفاتٌ في مستواه الأوّل**: طبقةُ القدرات (`server/ai/capabilities/shape.ts`) تأخذ أطولَ مصفوفةٍ في المستوى
// الأوّل وتُسقط ما سواها — فتفصيلُ البروتوكول العاديّ كان يصل النموذجَ أجهزةً بلا أهدافٍ ولا تمارين ولا موانع ولا جرعة. **وباللغة
// المطلوبة**، والغائبةُ تقع على الأخرى ويُقال ذلك.
export async function protocolBrief(id: number, lang: ProtocolLang, activeBranchId: number | null) {
  const p = await getProtocol(id);
  if (!p || p.isArchived) return null;
  const branchRows = await db.select({ id: branches.id, name: branches.name }).from(branches);
  const nameOf = new Map(branchRows.map((b) => [b.id, b.name]));
  const en = lang === "en";
  const fellBack: string[] = [];
  const pick = (row: Record<string, any>, field: string, label: string) => {
    const v = localizedText(row, field, lang);
    if (v.fallback) fellBack.push(label);
    return v.text;
  };
  const text: Record<string, string | null> = {};
  for (const f of PROTOCOL_TEXT_FIELDS) text[f] = pick(p, f, f);
  return {
    protocol: {
      id: p.id, code: p.code, language: lang,
      title: en ? p.titleEn : p.titleAr, titleOtherLanguage: en ? p.titleAr : p.titleEn,
      category: (en ? PROTOCOL_CATEGORY_LABELS_EN : PROTOCOL_CATEGORY_LABELS)[p.category as ProtocolCategory] ?? p.category,
      ageGroup: (en ? AGE_GROUP_LABELS_EN : AGE_GROUP_LABELS)[p.ageGroup as AgeGroup] ?? p.ageGroup,
      status: p.status,
      statusNote: p.status === "approved"
        ? (en ? `Approved by ${p.approvedByName ?? "the supervisor"}.` : `معتمَدٌ — اعتمده ${p.approvedByName ?? "المشرف"}.`)
        : (en ? "DRAFT — not yet approved by the physiotherapy supervisor. Say so explicitly: it is reference, not an instruction."
              : "مسوّدةٌ لم يعتمدها المشرفُ العام بعد — قل ذلك للسائل صراحةً: مرجعٌ لا تعليمات."),
      dose: { totalSessions: p.totalSessions, sessionsPerWeek: p.sessionsPerWeek, durationWeeks: p.durationWeeks, minutesPerSession: p.sessionMinutes },
      ...text,
      devices: p.devices.map((d) => ({
        device: en ? d.nameEn : d.nameAr, deviceOtherLanguage: en ? d.nameAr : d.nameEn, code: d.code,
        evidence: (en ? EVIDENCE_LABELS_EN : EVIDENCE_LABELS)[d.evidence as EvidenceLevel] ?? d.evidence,
        //  ترحيل ١٢٢ — ما يحكم الخطّة في المركز، منفصلاً عن درجة الدليل.
        centreUse: `${(en ? CENTRE_USE_LABELS_EN : CENTRE_USE_LABELS)[d.centreUse as CentreUse]} — ${(en ? CENTRE_USE_HINTS_EN : CENTRE_USE_HINTS)[d.centreUse as CentreUse]}`,
        minutes: d.minutes,
        parameters: pick(d, "parameters", `${d.code}.parameters`),
        settings: deviceParamsLine(d.code, d.params as Record<string, string>, lang) || null,
        note: pick(d, "note", `${d.code}.note`),
        availableInBranches: d.availableBranchIds.map((b) => nameOf.get(b) ?? `#${b}`),
        ...(activeBranchId ? { availableInAskersBranch: d.availableBranchIds.includes(activeBranchId) } : {}),
      })),
      //  §4.cx — البرنامجُ على مراحل: لكلّ مرحلةٍ أهدافُها ومعيارُ الانتقال وتمارينُها بجرعتها. والبطاقةُ الكاملة في صفحة البروتوكول.
      phases: p.phases.map((ph) => ({
        phase: ph.position, name: en ? ph.nameEn : ph.nameAr,
        timeframe: pick(ph, "timeframe", `phase${ph.position}.timeframe`),
        goals: pick(ph, "goals", `phase${ph.position}.goals`),
        progressCriteria: pick(ph, "progressCriteria", `phase${ph.position}.progressCriteria`),
        exercises: ph.exercises.map((x) => ({
          exercise: en ? x.exercise.nameEn : x.exercise.nameAr,
          dose: doseLine(mergeDose(x.exercise as any, x as any), x.exercise.perSide, lang),
          approved: x.exercise.status === "approved",
        })),
      })),
      references: (p.references as ProtocolReference[] | null) ?? [],
      ...(fellBack.length ? { untranslated: { fields: fellBack, note: en ? "These fields exist only in Arabic so far." : "هذه الحقولُ بالإنكليزية وحدها حتى الآن." } } : {}),
    },
  };
}

// ── البحثُ بالكلمات للمساعد (§4.cj) ─────────────────────────────────────────────
// `ilike` على العبارة كاملةً لا يجد «الشلل الدماغي» من «شلل دماغي»، ولا «knee osteoarthritis» من سؤالٍ طويل.
// فيُطبَّع النصُّ (التشكيل · الهمزات · التاء المربوطة · «ال») ويُعَدّ ما يطابق من كلمات السؤال المعتبَرة — والمكتبةُ بضع عشرات صفّاً.
const STOP = new Set([
  // عربية: كلماتُ السؤال لا الحالة
  "شنو", "شو", "ما", "ماذا", "هي", "هو", "عن", "في", "من", "على", "الى", "او", "مع", "عند", "عنده", "عندها", "لديه", "لديها", "يعاني",
  "تعاني", "طفل", "طفله", "عمره", "عمرها", "سنه", "سنوات", "سنين", "مريض", "مريضه", "خطه", "خطته", "خطتها", "اجهزه", "اجهزته", "مده",
  "علاج", "علاجه", "بروتوكول", "بروتوكولات", "انطيني", "اعطني", "اريد", "كم", "كيف", "هل", "حاله", "طبيعي", "جلسه", "جلسات",
  // إنكليزية
  "what", "is", "the", "for", "a", "an", "in", "of", "with", "and", "or", "to", "patient", "protocol", "protocols", "plan", "treatment",
  "physiotherapy", "physical", "therapy", "child", "old", "year", "years", "elderly", "adult", "give", "me", "please", "how", "long",
]);
export function normalizeSearchText(s: string): string {
  return String(s ?? "").toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
    .replace(/[^0-9a-z\u0621-\u064A]+/g, " ").trim();
}
const stem = (w: string) => {
  //  واوُ العطف: «والركبة» ⟵ «ركبه»، و«وأجهزته» ⟵ كلمةُ سؤالٍ تُسقَط.
  if (w.length > 5 && w.startsWith("وال")) return w.slice(3);
  if (w.length > 3 && w.startsWith("و") && STOP.has(w.slice(1))) return w.slice(1);
  return w.length > 4 && w.startsWith("ال") ? w.slice(2) : w;
};
export function searchTokens(query: string): string[] {
  return Array.from(new Set(normalizeSearchText(query).split(" ").map(stem).filter((w) => w.length >= 3 && !STOP.has(w))));
}

export async function searchProtocols(query: string, ageGroup?: string | null) {
  const tokens = searchTokens(query);
  if (!tokens.length) return [];
  const rows = await db.select({
    id: physioProtocols.id, code: physioProtocols.code, titleAr: physioProtocols.titleAr, titleEn: physioProtocols.titleEn,
    category: physioProtocols.category, ageGroup: physioProtocols.ageGroup, status: physioProtocols.status,
  }).from(physioProtocols).where(eq(physioProtocols.isArchived, false));
  return rows
    .map((r) => {
      const hay = normalizeSearchText(`${r.titleAr} ${r.titleEn} ${r.code.replace(/-/g, " ")}`).split(" ").map(stem);
      const hits = tokens.filter((t) => hay.some((h) => h === t || (t.length >= 4 && (h.startsWith(t) || t.startsWith(h) && h.length >= 4))));
      const ageFit = !ageGroup || r.ageGroup === ageGroup || r.ageGroup === "all";
      return { ...r, score: hits.length + (ageGroup && r.ageGroup === ageGroup ? 0.5 : 0), ageFit };
    })
    .filter((r) => r.score >= 1 && r.ageFit)
    .sort((a, b) => b.score - a.score || a.titleAr.localeCompare(b.titleAr))
    .slice(0, 6)
    .map(({ ageFit: _a, ...r }) => r);
}
