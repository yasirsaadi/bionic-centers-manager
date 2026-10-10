// **مكتبةُ التمارين ومراحلُ البروتوكول** (ترحيل ١١٨، §4.cx) — النقاط. كلُّ كتابةٍ بسطر تدقيق، وبقواعد البروتوكول نفسِها.
//
//   GET    /api/physio/exercises                     — القائمة (قراءة: `canReadProtocols`)
//   GET    /api/physio/exercises/missing-images      — الصورُ المطلوبة: لم يصل ملفُّها (`canEditProtocols`)
//   GET    /api/physio/exercises/:id                 — البطاقةُ كاملةً وأين تُستعمل
//   POST   /api/physio/exercises                     — بطاقةٌ جديدة مسوّدةً (`canEditProtocols`)
//   PUT    /api/physio/exercises/:id                 — تعديلٌ كامل؛ المعتمَدُ يعود مسوّدةً بيد غير المعتمِد (`statusAfterEdit`)
//   POST   /api/physio/exercises/:id/approve         — اعتمادُ البطاقة (`canApproveProtocols`)
//   POST   /api/physio/exercises/:id/archive|restore — أرشفةٌ واستعادة؛ وما في مرحلةٍ لا يُؤرشَف
//   PUT    /api/physio/protocols/:id/phases          — مراحلُ البروتوكول كاملةً؛ والبروتوكولُ المعتمَد يعود مسوّدةً بيد غير المعتمِد
import type { Express } from "express";
import { logAudit } from "../accounting/ledger";
import { getSession } from "../sessions_module/permissions";
import {
  canApproveProtocols, canEditProtocols, canReadProtocols, statusAfterEdit, type ProtocolStatus,
} from "@shared/physio_protocols";
import { isBodyRegion, isExerciseKind, parseExerciseBody, parsePhasesBody } from "@shared/physio_exercises";
import { ProtocolError, getProtocolRow, type Actor } from "./store";
import * as ex from "./exercises_store";

function fail(res: any, e: unknown) {
  if (e instanceof ProtocolError) return res.status(e.status).json({ error: e.message });
  console.error("[physio-exercises]", e);
  res.status(500).json({ error: "تعذّر تنفيذ الطلب — لم يتغيّر شيء" });
}

export function registerPhysioExerciseRoutes(app: Express, isAuthenticated: any) {
  const sess = (req: any) => getSession(req) ?? ({} as any);
  const actor = (s: any): Actor => ({ userId: s.userId ?? null, name: s.displayName ?? null });
  const audit = (req: any, s: any, p: { entityType: string; entityId: number; action: string; oldValues?: any; newValues?: any; notes?: string }) =>
    logAudit({ ...p, userId: s.userId ?? null, userName: s.displayName ?? null, branchId: s.branchId ?? null,
      ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null });
  const idOf = (v: unknown) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };
  const READ_ONLY = "مكتبةُ التمارين لقسم العلاج الطبيعي";
  const WRITE_ONLY = "يكتب بطاقاتِ التمارين المشرفُ العام أو المسؤول — والأخصائيُّ يعدّل جرعةَ التمرين لمريضه في خطّته";

  app.get("/api/physio/exercises", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canReadProtocols(s)) return res.status(403).json({ error: READ_ONLY });
    try {
      const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
      res.json(await ex.listExercises({
        q: q || undefined,
        region: isBodyRegion(req.query.region) ? req.query.region : undefined,
        kind: isExerciseKind(req.query.kind) ? req.query.kind : undefined,
        status: req.query.status === "draft" || req.query.status === "approved" ? req.query.status : undefined,
        archived: req.query.archived === "1" && canEditProtocols(s),
      }));
    } catch (e) { fail(res, e); }
  });

  app.get("/api/physio/exercises/missing-images", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canEditProtocols(s)) return res.status(403).json({ error: WRITE_ONLY });
    try { res.json(await ex.missingImages()); } catch (e) { fail(res, e); }
  });

  app.get("/api/physio/exercises/:id", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canReadProtocols(s)) return res.status(403).json({ error: READ_ONLY });
    const id = idOf(req.params.id);
    if (!id) return res.status(400).json({ error: "رقمٌ غير صالح" });
    try {
      const e = await ex.getExercise(id);
      if (!e || (e.isArchived && !canEditProtocols(s))) return res.status(404).json({ error: "التمرين غير موجود" });
      res.json({ ...e, canEdit: canEditProtocols(s), canApprove: canApproveProtocols(s) });
    } catch (e) { fail(res, e); }
  });

  app.post("/api/physio/exercises", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canEditProtocols(s)) return res.status(403).json({ error: WRITE_ONLY });
    const input = parseExerciseBody(req.body);
    if (typeof input === "string") return res.status(400).json({ error: input });
    try {
      const row = await ex.createExercise(input, actor(s));
      await audit(req, s, { entityType: "physio_exercise", entityId: row.id, action: "create", newValues: row });
      res.json(row);
    } catch (e) { fail(res, e); }
  });

  app.put("/api/physio/exercises/:id", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canEditProtocols(s)) return res.status(403).json({ error: WRITE_ONLY });
    const id = idOf(req.params.id);
    if (!id) return res.status(400).json({ error: "رقمٌ غير صالح" });
    const input = parseExerciseBody(req.body);
    if (typeof input === "string") return res.status(400).json({ error: input });
    try {
      const current = await ex.getExerciseRow(id);
      if (!current) return res.status(404).json({ error: "التمرين غير موجود" });
      const r = await ex.updateExercise(id, input, statusAfterEdit(current.status as ProtocolStatus, s), actor(s));
      await audit(req, s, { entityType: "physio_exercise", entityId: id, action: "update", oldValues: r.before, newValues: r.after,
        notes: r.demoted ? "عُدّل تمرينٌ معتمَد فعاد مسوّدةً بانتظار الاعتماد" : undefined });
      res.json({ ...r.after, demoted: r.demoted });
    } catch (e) { fail(res, e); }
  });

  app.post("/api/physio/exercises/:id/approve", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canApproveProtocols(s)) return res.status(403).json({ error: "يعتمد التمرينَ المشرفُ العام أو المسؤول" });
    const id = idOf(req.params.id);
    if (!id) return res.status(400).json({ error: "رقمٌ غير صالح" });
    try {
      const row = await ex.approveExercise(id, actor(s));
      await audit(req, s, { entityType: "physio_exercise", entityId: id, action: "approve", newValues: { status: "approved", approvedByName: row.approvedByName } });
      res.json(row);
    } catch (e) { fail(res, e); }
  });

  for (const [path, archived] of [["archive", true], ["restore", false]] as const) {
    app.post(`/api/physio/exercises/:id/${path}`, isAuthenticated, async (req: any, res) => {
      const s = sess(req);
      if (!canEditProtocols(s)) return res.status(403).json({ error: WRITE_ONLY });
      const id = idOf(req.params.id);
      if (!id) return res.status(400).json({ error: "رقمٌ غير صالح" });
      try {
        const row = await ex.setExerciseArchived(id, archived, actor(s));
        await audit(req, s, { entityType: "physio_exercise", entityId: id, action: path, newValues: { isArchived: archived } });
        res.json(row);
      } catch (e) { fail(res, e); }
    });
  }

  app.put("/api/physio/protocols/:id/phases", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canEditProtocols(s)) return res.status(403).json({ error: "يعدّل مراحلَ البروتوكول الأساسيّ المشرفُ العام أو المسؤول — والأخصائيُّ يعدّل مراحلَ مريضه في خطّته" });
    const id = idOf(req.params.id);
    if (!id) return res.status(400).json({ error: "رقمٌ غير صالح" });
    const phases = parsePhasesBody(req.body?.phases);
    if (typeof phases === "string") return res.status(400).json({ error: phases });
    try {
      const current = await getProtocolRow(id);
      if (!current) return res.status(404).json({ error: "البروتوكول غير موجود" });
      const r = await ex.setPhases(id, phases, statusAfterEdit(current.status as ProtocolStatus, s), actor(s));
      await audit(req, s, { entityType: "physio_protocol", entityId: id, action: "update_phases", oldValues: r.before,
        newValues: { status: r.after.status, phases },
        notes: r.demoted ? "عُدّلت مراحلُ بروتوكولٍ معتمَد فعاد مسوّدةً بانتظار الاعتماد" : undefined });
      res.json({ status: r.after.status, demoted: r.demoted });
    } catch (e) { fail(res, e); }
  });
}
