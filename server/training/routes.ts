// نقاطُ تدريب الموظّفين — REST خفيفة فوق `server/training/store.ts`.
//
// ══ الهويّةُ من الجلسة دائماً ═══════════════════════════════════════════
// كلُّ نقطةٍ هنا تشتقّ `AiAccessContext` من `req.session.branchSession`
// بنفس الاستدعاء الذي تستعمله `/api/ai/chat` بالحرف (`resolveAiAccess`) —
// فقدراتُ التدريب **نفسُها** قدراتُ أدوات المساعد، لا حسابٌ ثانٍ ينحرف
// عنه. ولا `userId` يُقرأ من جسم الطلب في أيّ نقطة كتابة.

import type { Express } from "express";
import { resolveAiAccess, operationalBranchesOf } from "../ai/access";
import {
  listAccessibleTracks, findNextIncompleteModule, getModuleLesson,
  submitTrainingAnswer, getManagementTrainingProgress,
} from "./store";
import { db } from "../db";
import { trainingTracks, trainingModules } from "@shared/schema";
import { asc, eq } from "drizzle-orm";

type Req = any;

const INVALID_ID = Symbol("invalid_id");
function parsePositiveIntId(v: unknown): number | typeof INVALID_ID {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return INVALID_ID;
  return n;
}

function isGlobalAdmin(req: Req): boolean {
  return Boolean((req.session as any)?.branchSession?.isAdmin);
}

/** نفسُ سياق أدوات المساعد بالحرف — لا حسابَ صلاحيةٍ ثانٍ لهذه الشاشة. */
function accessFrom(req: Req) {
  const branchSession = (req.session as any)?.branchSession;
  //  ══ نطاقٌ تشغيليّ لا ماليّ ══ — التدريب ليس بيانات محاسبة، فلا حاجة
  //  لـ`enforceBranchAccess` (تخصّ اللقطة المالية) هنا؛ `scopeBranchId`
  //  المُمرَّر لـ`resolveAiAccess` غير مستعمَل فعلياً في نقاط هذا الملفّ
  //  (لا أداة `financial_summary` تُستدعى)، فيُترَك `undefined` بأمان.
  return resolveAiAccess({ session: branchSession });
}

export function registerTrainingRoutes(app: Express, isAuthenticated: any) {
  // ══ ١. الكتالوج — المساراتُ المتاحة لهذه الجلسة، ومعها تقدّمها ═══════════
  app.get("/api/training/tracks", isAuthenticated, async (req: Req, res) => {
    const access = accessFrom(req);
    const tracks = await listAccessibleTracks(access);
    res.json({ tracks });
  });

  // ══ ٢. «كمّل تدريبي من آخر مكان» — أوّلُ وحدةٍ غيرِ منجَزة ═══════════════
  app.get("/api/training/next", isAuthenticated, async (req: Req, res) => {
    const access = accessFrom(req);
    const next = await findNextIncompleteModule(access);
    res.json({ next });
  });

  // ══ ٣. فتحُ درسِ وحدة — يحلّ المعرفةَ الفعّالة حيّاً ويبدأ/يلمس التقدّم ═══
  app.get("/api/training/modules/:id/lesson", isAuthenticated, async (req: Req, res) => {
    const idParsed = parsePositiveIntId(req.params.id);
    if (idParsed === INVALID_ID) return res.status(400).json({ error: "معرّفٌ غير صالح" });
    const access = accessFrom(req);
    const result = await getModuleLesson({ moduleId: idParsed, access });
    if (!result.ok) return res.status(403).json({ error: result.error });
    res.json({ lesson: result.lesson });
  });

  // ══ ٤. تصحيحُ إجابةِ اختبار — الكتابةُ الوحيدة على هذا الجدول للموظّف ═══
  app.post("/api/training/modules/:id/answer", isAuthenticated, async (req: Req, res) => {
    const idParsed = parsePositiveIntId(req.params.id);
    if (idParsed === INVALID_ID) return res.status(400).json({ error: "معرّفٌ غير صالح" });
    const answerText = typeof req.body?.answerText === "string" ? req.body.answerText : "";
    const access = accessFrom(req);
    const result = await submitTrainingAnswer({
      moduleId: idParsed, answerText, access,
      ipAddress: req.ip ?? null, userAgent: req.get?.("user-agent") ?? null,
    });
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json({ outcome: result.outcome });
  });

  // ══ ٥. عرضُ الإدارة — مسؤولٌ عامّ (كلّ الفروع) أو مديرُ فرعٍ (فرعه) ═══════
  app.get("/api/training/management/progress", isAuthenticated, async (req: Req, res) => {
    const branchSession = (req.session as any)?.branchSession;
    const result = await getManagementTrainingProgress({
      isAdmin: Boolean(branchSession?.isAdmin),
      role: branchSession?.role ?? null,
      operationalBranches: operationalBranchesOf(branchSession),
    });
    if (!result.ok) return res.status(403).json({ error: result.error });
    res.json({ rows: result.rows });
  });

  // ══ ٦. لوحةُ المسؤول — كلّ المسارات والوحدات بلا فلترةِ جمهور ═══════════
  //  للمسؤول العام وحده، **نفسُ نمط `GET /api/ai/knowledge/articles`
  //  بالحرف**: قائمةٌ كاملة، لا كتالوج مستخدمٍ عاديّ.
  app.get("/api/training/admin/tracks", isAuthenticated, async (req: Req, res) => {
    if (!isGlobalAdmin(req)) return res.status(403).json({ error: "لإدارة التدريب المسؤولُ العام وحده" });
    const tracks = await db.select().from(trainingTracks).orderBy(asc(trainingTracks.sortOrder));
    const modules = await db.select().from(trainingModules).orderBy(asc(trainingModules.position));
    const modulesByTrack = new Map<number, typeof modules>();
    for (const m of modules) {
      const list = modulesByTrack.get(m.trackId) ?? [];
      list.push(m);
      modulesByTrack.set(m.trackId, list);
    }
    res.json({
      tracks: tracks.map((t) => ({ ...t, modules: modulesByTrack.get(t.id) ?? [] })),
    });
  });

  // ══ ٧. تفعيل/تعطيل مسار أو وحدة — **بلا حذفٍ فعليّ إطلاقاً** ═════════════
  app.patch("/api/training/admin/tracks/:id/active", isAuthenticated, async (req: Req, res) => {
    if (!isGlobalAdmin(req)) return res.status(403).json({ error: "لإدارة التدريب المسؤولُ العام وحده" });
    const idParsed = parsePositiveIntId(req.params.id);
    if (idParsed === INVALID_ID) return res.status(400).json({ error: "معرّفٌ غير صالح" });
    if (typeof req.body?.active !== "boolean") {
      return res.status(400).json({ error: "الحقل active يجب أن يكون true أو false" });
    }
    const [row] = await db.update(trainingTracks)
      .set({ isActive: req.body.active, updatedAt: new Date() })
      .where(eq(trainingTracks.id, idParsed)).returning();
    if (!row) return res.status(404).json({ error: "المسار غير موجود" });
    res.json({ track: row });
  });

  app.patch("/api/training/admin/modules/:id/active", isAuthenticated, async (req: Req, res) => {
    if (!isGlobalAdmin(req)) return res.status(403).json({ error: "لإدارة التدريب المسؤولُ العام وحده" });
    const idParsed = parsePositiveIntId(req.params.id);
    if (idParsed === INVALID_ID) return res.status(400).json({ error: "معرّفٌ غير صالح" });
    if (typeof req.body?.active !== "boolean") {
      return res.status(400).json({ error: "الحقل active يجب أن يكون true أو false" });
    }
    const [row] = await db.update(trainingModules)
      .set({ isActive: req.body.active, updatedAt: new Date() })
      .where(eq(trainingModules.id, idParsed)).returning();
    if (!row) return res.status(404).json({ error: "الوحدة غير موجودة" });
    res.json({ module: row });
  });
}
