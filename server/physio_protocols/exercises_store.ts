// **مكتبةُ التمارين ومراحلُ البروتوكول** (ترحيل ١١٨، §4.cx) — طبقةُ البيانات. القواعدُ في `shared/physio_exercises.ts`.
import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  physioExercises, physioProtocolPhaseExercises, physioProtocolPhases, physioProtocols, type PhysioExercise,
} from "@shared/schema";
import { EXERCISE_TEXT_FIELDS, PHASE_TEXT_FIELDS, type ExerciseInput, type PhaseInput } from "@shared/physio_exercises";
import { EXERCISE_IMAGE_FILES, exerciseImageUrl } from "@shared/physio_exercise_media";
import type { ProtocolStatus } from "@shared/physio_protocols";
import { ProtocolError, type Actor } from "./store";

/** صورُ البطاقة بروابطها — والتي لم تصل `url: null` فتُعرض «صورة منتظرة» برمزها وكلمات بحثها. */
export function withImageUrls(images: unknown) {
  return (Array.isArray(images) ? images : []).map((i: any) => {
    const f = EXERCISE_IMAGE_FILES[i.key];
    return { ...i, url: exerciseImageUrl(i.key), credit: f?.credit ?? null, sourceUrl: f?.sourceUrl ?? null };
  });
}

const card = (e: PhysioExercise) => ({ ...e, images: withImageUrls(e.images) });

export async function listExercises(p: { q?: string; region?: string; kind?: string; status?: string; archived?: boolean }) {
  const conds: any[] = [eq(physioExercises.isArchived, Boolean(p.archived))];
  if (p.region) conds.push(eq(physioExercises.region, p.region));
  if (p.kind) conds.push(eq(physioExercises.kind, p.kind));
  if (p.status) conds.push(eq(physioExercises.status, p.status));
  if (p.q) {
    const like = `%${p.q}%`;
    conds.push(or(ilike(physioExercises.nameAr, like), ilike(physioExercises.nameEn, like), ilike(physioExercises.code, like)));
  }
  const rows = await db.select({
    id: physioExercises.id, code: physioExercises.code, nameAr: physioExercises.nameAr, nameEn: physioExercises.nameEn,
    kind: physioExercises.kind, region: physioExercises.region, status: physioExercises.status, isArchived: physioExercises.isArchived,
    homeSuitable: physioExercises.homeSuitable, images: physioExercises.images,
    protocolCount: sql<number>`(SELECT count(DISTINCT ph.protocol_id)::int FROM physio_protocol_phase_exercises pe
      JOIN physio_protocol_phases ph ON ph.id = pe.phase_id WHERE pe.exercise_id = "physio_exercises"."id")`,
  }).from(physioExercises).where(and(...conds)).orderBy(asc(physioExercises.region), asc(physioExercises.nameAr));
  return rows.map((r) => ({ ...r, images: withImageUrls(r.images) }));
}

/** البطاقةُ كاملةً، وأين تُستعمل (البروتوكولُ ومرحلتُه). */
export async function getExercise(id: number) {
  const [e] = await db.select().from(physioExercises).where(eq(physioExercises.id, id));
  if (!e) return null;
  const usedIn = await db.select({
    protocolId: physioProtocols.id, code: physioProtocols.code, titleAr: physioProtocols.titleAr, titleEn: physioProtocols.titleEn,
    phaseNameAr: physioProtocolPhases.nameAr, phaseNameEn: physioProtocolPhases.nameEn, phasePosition: physioProtocolPhases.position,
  }).from(physioProtocolPhaseExercises)
    .innerJoin(physioProtocolPhases, eq(physioProtocolPhases.id, physioProtocolPhaseExercises.phaseId))
    .innerJoin(physioProtocols, eq(physioProtocols.id, physioProtocolPhases.protocolId))
    .where(eq(physioProtocolPhaseExercises.exerciseId, id))
    .orderBy(asc(physioProtocols.titleAr), asc(physioProtocolPhases.position));
  return { ...card(e), usedIn };
}

export async function getExerciseRow(id: number): Promise<PhysioExercise | null> {
  const [e] = await db.select().from(physioExercises).where(eq(physioExercises.id, id));
  return e ?? null;
}

function exerciseValues(input: ExerciseInput) {
  const v: Record<string, unknown> = {
    code: input.code, nameAr: input.nameAr, nameEn: input.nameEn, kind: input.kind, region: input.region,
    perSide: input.perSide, homeSuitable: input.homeSuitable,
    sets: input.sets, reps: input.reps, holdSeconds: input.holdSeconds, restSeconds: input.restSeconds, images: input.images,
  };
  for (const f of EXERCISE_TEXT_FIELDS) { v[f] = input[f] ?? null; v[`${f}En`] = input[`${f}En`] ?? null; }
  return v as any;
}

export async function createExercise(input: ExerciseInput, actor: Actor) {
  try {
    const [row] = await db.insert(physioExercises).values({
      ...exerciseValues(input), status: "draft",
      createdBy: actor.userId, createdByName: actor.name, updatedBy: actor.userId, updatedByName: actor.name,
    }).returning();
    return row;
  } catch (e: any) {
    if (e?.code === "23505") throw new ProtocolError(409, "هذا الرمزُ مستعملٌ لتمرينٍ آخر");
    throw e;
  }
}

/** تعديلٌ كامل — والحالةُ بعده يقرّرها المُنادي (`statusAfterEdit`): بيد مَن لا يعتمد يعود المعتمَدُ مسوّدة. */
export async function updateExercise(id: number, input: ExerciseInput, nextStatus: ProtocolStatus, actor: Actor) {
  try {
    return await db.transaction(async (tx) => {
      const [before] = await tx.select().from(physioExercises).where(eq(physioExercises.id, id)).for("update");
      if (!before) throw new ProtocolError(404, "التمرين غير موجود");
      if (before.isArchived) throw new ProtocolError(409, "التمرينُ مؤرشف — استعِده أوّلاً");
      const demote = before.status === "approved" && nextStatus === "draft";
      const [after] = await tx.update(physioExercises).set({
        ...exerciseValues(input), status: nextStatus,
        ...(demote ? { approvedBy: null, approvedByName: null, approvedAt: null } : {}),
        updatedBy: actor.userId, updatedByName: actor.name, updatedAt: new Date(),
      }).where(eq(physioExercises.id, id)).returning();
      return { before, after, demoted: demote };
    });
  } catch (e: any) {
    if (e?.code === "23505") throw new ProtocolError(409, "هذا الرمزُ مستعملٌ لتمرينٍ آخر");
    throw e;
  }
}

export async function approveExercise(id: number, actor: Actor) {
  const [row] = await db.update(physioExercises).set({
    status: "approved", approvedBy: actor.userId, approvedByName: actor.name, approvedAt: new Date(),
  }).where(and(eq(physioExercises.id, id), eq(physioExercises.status, "draft"), eq(physioExercises.isArchived, false))).returning();
  if (!row) throw new ProtocolError(409, "ليس مسوّدةً قائمة — أعد فتح الصفحة");
  return row;
}

/** الأرشفةُ تُخفي التمرينَ من الاختيار ولا تمسّ المراحلَ التي هو فيها — والتمرينُ في مرحلةٍ لا يُؤرشَف حتى يُزال منها. */
export async function setExerciseArchived(id: number, archived: boolean, actor: Actor) {
  if (archived) {
    const [used] = await db.select({ n: sql<number>`count(*)::int` }).from(physioProtocolPhaseExercises)
      .where(eq(physioProtocolPhaseExercises.exerciseId, id));
    if ((used?.n ?? 0) > 0) throw new ProtocolError(409, "التمرينُ في مراحل بروتوكول — أزِله منها أوّلاً");
  }
  const [row] = await db.update(physioExercises).set({
    isArchived: archived, updatedBy: actor.userId, updatedByName: actor.name, updatedAt: new Date(),
  }).where(and(eq(physioExercises.id, id), eq(physioExercises.isArchived, !archived))).returning();
  if (!row) throw new ProtocolError(409, archived ? "مؤرشفٌ أصلاً" : "ليس مؤرشفاً");
  return row;
}

// ── المراحل ─────────────────────────────────────────────────────────────────
/** مراحلُ البروتوكول بترتيبها، ولكلّ مرحلةٍ تمارينُها بجرعتها فيها **والبطاقةُ كاملة** — فالشاشةُ تعرضها بلا طلبٍ ثانٍ. */
export async function getPhases(protocolId: number) {
  const phases = await db.select().from(physioProtocolPhases)
    .where(eq(physioProtocolPhases.protocolId, protocolId)).orderBy(asc(physioProtocolPhases.position));
  if (!phases.length) return [];
  const links = await db.select({ link: physioProtocolPhaseExercises, exercise: physioExercises })
    .from(physioProtocolPhaseExercises)
    .innerJoin(physioExercises, eq(physioExercises.id, physioProtocolPhaseExercises.exerciseId))
    .where(inArray(physioProtocolPhaseExercises.phaseId, phases.map((p) => p.id)))
    .orderBy(asc(physioProtocolPhaseExercises.position), asc(physioProtocolPhaseExercises.id));
  return phases.map((p) => ({
    ...p,
    exercises: links.filter((l) => l.link.phaseId === p.id).map((l) => ({
      exerciseId: l.exercise.id,
      sets: l.link.sets, reps: l.link.reps, holdSeconds: l.link.holdSeconds, restSeconds: l.link.restSeconds,
      doseNote: l.link.doseNote, doseNoteEn: l.link.doseNoteEn, note: l.link.note, noteEn: l.link.noteEn,
      exercise: card(l.exercise),
    })),
  }));
}

/**
 * **المراحلُ تُستبدل كاملة** في معاملةٍ بقفل البروتوكول. التمارينُ موجودةٌ وغيرُ مؤرشفة — إلّا ما كان في مراحله من قبل.
 * والحالةُ بعدها يقرّرها المُنادي بقاعدة البروتوكول (`statusAfterEdit`).
 */
export async function setPhases(protocolId: number, phases: PhaseInput[], nextStatus: ProtocolStatus, actor: Actor) {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(physioProtocols).where(eq(physioProtocols.id, protocolId)).for("update");
    if (!before) throw new ProtocolError(404, "البروتوكول غير موجود");
    if (before.isArchived) throw new ProtocolError(409, "البروتوكولُ مؤرشف — استعِده أوّلاً");
    const oldPhases = await tx.select().from(physioProtocolPhases).where(eq(physioProtocolPhases.protocolId, protocolId));
    const oldLinks = oldPhases.length
      ? await tx.select().from(physioProtocolPhaseExercises).where(inArray(physioProtocolPhaseExercises.phaseId, oldPhases.map((p) => p.id)))
      : [];
    const ids = Array.from(new Set(phases.flatMap((p) => p.exercises.map((e) => e.exerciseId))));
    if (ids.length) {
      const found = await tx.select({ id: physioExercises.id, isArchived: physioExercises.isArchived })
        .from(physioExercises).where(inArray(physioExercises.id, ids));
      const had = new Set(oldLinks.map((l) => l.exerciseId));
      if (found.length !== ids.length) throw new ProtocolError(400, "تمرينٌ غير موجود في المكتبة");
      if (found.some((f) => f.isArchived && !had.has(f.id))) throw new ProtocolError(400, "تمرينٌ مؤرشف لا يُضاف إلى مرحلة");
    }
    if (oldPhases.length) await tx.delete(physioProtocolPhases).where(eq(physioProtocolPhases.protocolId, protocolId));
    for (let i = 0; i < phases.length; i++) {
      const p = phases[i];
      const values: Record<string, unknown> = { protocolId, position: i + 1, nameAr: p.nameAr, nameEn: p.nameEn,
        sessionFrom: p.sessionFrom ?? null, sessionTo: p.sessionTo ?? null };
      for (const f of PHASE_TEXT_FIELDS) { values[f] = p[f] ?? null; values[`${f}En`] = p[`${f}En`] ?? null; }
      const [row] = await tx.insert(physioProtocolPhases).values(values as any).returning({ id: physioProtocolPhases.id });
      if (p.exercises.length) {
        await tx.insert(physioProtocolPhaseExercises).values(p.exercises.map((e, j) => ({ ...e, phaseId: row.id, position: j })));
      }
    }
    const demote = before.status === "approved" && nextStatus === "draft";
    const [after] = await tx.update(physioProtocols).set({
      status: nextStatus,
      ...(demote ? { approvedBy: null, approvedByName: null, approvedAt: null } : {}),
      updatedBy: actor.userId, updatedByName: actor.name, updatedAt: new Date(),
    }).where(eq(physioProtocols.id, protocolId)).returning();
    return { before: { status: before.status, phases: oldPhases, exercises: oldLinks }, after, demoted: demote };
  });
}

/** **الصورُ المطلوبة** — كلُّ صورةٍ مخطَّطة لم يصل ملفُّها، بتمرينها وما تُظهره وكلمات بحثها، والمستعمَلُ في بروتوكولٍ أوّلاً. */
export async function missingImages() {
  const rows = await db.select({
    id: physioExercises.id, code: physioExercises.code, nameAr: physioExercises.nameAr, nameEn: physioExercises.nameEn,
    images: physioExercises.images,
    protocols: sql<string[]>`COALESCE((SELECT array_agg(DISTINCT p.title_ar) FROM physio_protocol_phase_exercises pe
      JOIN physio_protocol_phases ph ON ph.id = pe.phase_id JOIN physio_protocols p ON p.id = ph.protocol_id
      WHERE pe.exercise_id = "physio_exercises"."id"), '{}')`,
  }).from(physioExercises).where(eq(physioExercises.isArchived, false)).orderBy(asc(physioExercises.id));
  const out: { key: string; exerciseId: number; exerciseCode: string; nameAr: string; nameEn: string; captionAr: string; captionEn: string; search: string; protocols: string[] }[] = [];
  for (const r of rows) {
    for (const img of (r.images ?? []) as any[]) {
      if (EXERCISE_IMAGE_FILES[img.key]) continue;
      out.push({ key: img.key, exerciseId: r.id, exerciseCode: r.code, nameAr: r.nameAr, nameEn: r.nameEn,
        captionAr: img.captionAr, captionEn: img.captionEn, search: img.search, protocols: r.protocols ?? [] });
    }
  }
  return out.sort((a, b) => Number(b.protocols.length > 0) - Number(a.protocols.length > 0));
}
