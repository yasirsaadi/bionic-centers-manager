// **مكتبةُ بروتوكولات العلاج الطبيعي** (ترحيل ١٠٦، §4.cj) — النقاط. كلُّ كتابةٍ بسطر تدقيق.
//
//   GET    /api/physio/protocols                         — القائمة (قراءة: `canReadProtocols`)
//   GET    /api/physio/protocols/:id                     — البروتوكولُ كاملاً
//   POST   /api/physio/protocols                         — جديدٌ مسوّدةً (`canEditProtocols`)
//   PUT    /api/physio/protocols/:id                     — تعديلٌ كامل؛ المعتمَدُ يعود مسوّدةً بيد غير المعتمِد (`statusAfterEdit`)
//   POST   /api/physio/protocols/:id/approve             — اعتمادُ المسوّدة (`canApproveProtocols`)
//   POST   /api/physio/protocols/:id/archive|restore     — أرشفةٌ واستعادة — لا محو (`canEditProtocols`)
//   POST   /api/physio/protocols/:id/images              — صورةٌ توضيحية بمصدرها (`canEditProtocols`)
//   DELETE /api/physio/protocols/:id/images/:imageId
//   GET    /api/physio/protocol-images/:imageId          — الصورةُ نفسُها (قراءة)
//   GET    /api/physio/devices                            — الأجهزةُ وتوفّرُها بالفروع (قراءة)
//   PUT    /api/physio/devices/:deviceId/branches/:branchId — تبديلُ التوفّر (`canManageDeviceAvailability`)
import type { Express } from "express";
import multer from "multer";
import { logAudit } from "../accounting/ledger";
import { getSession } from "../sessions_module/permissions";
import {
  canApproveProtocols, canEditProtocols, canManageDeviceAvailability, canReadProtocols, isAgeGroup, isEvidenceLevel,
  isProtocolCategory, normalizeReferences, statusAfterEdit, type ProtocolStatus,
} from "@shared/physio_protocols";
import * as store from "./store";

const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: store.IMAGE_MAX_BYTES, files: 1 } });

function fail(res: any, e: unknown) {
  if (e instanceof store.ProtocolError) return res.status(e.status).json({ error: e.message });
  console.error("[physio-protocols]", e);
  res.status(500).json({ error: "تعذّر تنفيذ الطلب — لم يتغيّر شيء" });
}

const text = (v: unknown, max = 8000) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const intIn = (v: unknown, lo: number, hi: number): number | null | "bad" => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= lo && n <= hi ? n : "bad";
};

/** يطبّع جسمَ البروتوكول — أو يُرجع رسالةَ الخطأ. */
export function parseProtocolBody(b: any): store.ProtocolInput | string {
  const code = typeof b?.code === "string" ? b.code.trim().toLowerCase() : "";
  if (!/^[a-z0-9][a-z0-9_-]{1,59}$/.test(code)) return "الرمزُ حروفٌ إنكليزية صغيرة وأرقام وشرطة (مثل low-back-pain-adult)";
  const titleAr = text(b?.titleAr, 200);
  const titleEn = text(b?.titleEn, 200);
  if (!titleAr || !titleEn) return "اكتب اسمَ الحالة بالعربية ومصطلحها بالإنكليزية";
  if (!isProtocolCategory(b?.category)) return "اختر فئة البروتوكول";
  if (!isAgeGroup(b?.ageGroup)) return "اختر الفئة العمرية";
  const sessionsPerWeek = intIn(b?.sessionsPerWeek, 1, 14);
  const durationWeeks = intIn(b?.durationWeeks, 1, 104);
  const sessionMinutes = intIn(b?.sessionMinutes, 5, 240);
  if (sessionsPerWeek === "bad" || durationWeeks === "bad" || sessionMinutes === "bad") return "الجلسات في الأسبوع ١–١٤، والأسابيع ١–١٠٤، والدقائق ٥–٢٤٠";
  const references = normalizeReferences(b?.references ?? []);
  if (!references) return "كلُّ مرجعٍ بعنوانه، ورابطُه إن وُجد يبدأ بـ http";
  if (!Array.isArray(b?.devices) || b.devices.length > 40) return "قائمةُ الأجهزة غير صالحة";
  const devicesIn: store.DeviceLineInput[] = [];
  for (const d of b.devices) {
    const deviceId = Number(d?.deviceId);
    if (!Number.isInteger(deviceId) || deviceId <= 0) return "جهازٌ غير صالح";
    if (!isEvidenceLevel(d?.evidence)) return "اختر لكلّ جهازٍ درجتَه: موصى به · اختياري · غير موصى به";
    const minutes = intIn(d?.minutes, 1, 120);
    if (minutes === "bad") return "دقائقُ الجهاز ١–١٢٠";
    devicesIn.push({ deviceId, evidence: d.evidence, parameters: text(d?.parameters, 1000), minutes, note: text(d?.note, 1000) });
  }
  return {
    code, titleAr, titleEn, category: b.category, ageGroup: b.ageGroup,
    summary: text(b?.summary), goals: text(b?.goals), assessment: text(b?.assessment), exercises: text(b?.exercises),
    contraindications: text(b?.contraindications), precautions: text(b?.precautions),
    sessionsPerWeek, durationWeeks, sessionMinutes, references, devices: devicesIn,
  };
}

export function registerPhysioProtocolRoutes(app: Express, isAuthenticated: any) {
  const sess = (req: any) => getSession(req) ?? ({} as any);
  const actor = (s: any): store.Actor => ({ userId: s.userId ?? null, name: s.displayName ?? null });
  const audit = (req: any, s: any, p: { entityType: string; entityId: number; action: string; oldValues?: any; newValues?: any; notes?: string }) =>
    logAudit({ ...p, userId: s.userId ?? null, userName: s.displayName ?? null, branchId: s.branchId ?? null,
      ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null });
  const idOf = (v: unknown) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };

  app.get("/api/physio/protocols", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canReadProtocols(s)) return res.status(403).json({ error: "مكتبةُ البروتوكولات لقسم العلاج الطبيعي" });
    try {
      const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
      const archived = req.query.archived === "1" && canEditProtocols(s);
      res.json(await store.listProtocols({
        q: q || undefined,
        category: isProtocolCategory(req.query.category) ? req.query.category : undefined,
        ageGroup: isAgeGroup(req.query.ageGroup) ? req.query.ageGroup : undefined,
        status: req.query.status === "draft" || req.query.status === "approved" ? req.query.status : undefined,
        archived,
      }));
    } catch (e) { fail(res, e); }
  });

  app.get("/api/physio/protocols/:id", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canReadProtocols(s)) return res.status(403).json({ error: "مكتبةُ البروتوكولات لقسم العلاج الطبيعي" });
    const id = idOf(req.params.id);
    if (!id) return res.status(400).json({ error: "رقمٌ غير صالح" });
    try {
      const p = await store.getProtocol(id);
      if (!p || (p.isArchived && !canEditProtocols(s))) return res.status(404).json({ error: "البروتوكول غير موجود" });
      res.json({ ...p, canEdit: canEditProtocols(s), canApprove: canApproveProtocols(s) });
    } catch (e) { fail(res, e); }
  });

  app.post("/api/physio/protocols", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canEditProtocols(s)) return res.status(403).json({ error: "يضيف البروتوكولَ الأخصائيُّ أو المشرفُ العام أو المسؤول" });
    const input = parseProtocolBody(req.body);
    if (typeof input === "string") return res.status(400).json({ error: input });
    try {
      const row = await store.createProtocol(input, actor(s));
      await audit(req, s, { entityType: "physio_protocol", entityId: row.id, action: "create", newValues: { ...row, devices: input.devices } });
      res.json(row);
    } catch (e) { fail(res, e); }
  });

  app.put("/api/physio/protocols/:id", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canEditProtocols(s)) return res.status(403).json({ error: "يعدّل البروتوكولَ الأخصائيُّ أو المشرفُ العام أو المسؤول" });
    const id = idOf(req.params.id);
    if (!id) return res.status(400).json({ error: "رقمٌ غير صالح" });
    const input = parseProtocolBody(req.body);
    if (typeof input === "string") return res.status(400).json({ error: input });
    try {
      const current = await store.getProtocolRow(id);
      if (!current) return res.status(404).json({ error: "البروتوكول غير موجود" });
      if (current.isArchived) return res.status(409).json({ error: "البروتوكولُ مؤرشف — استعِده أوّلاً" });
      const next = statusAfterEdit(current.status as ProtocolStatus, s);
      const r = await store.updateProtocol(id, input, next, actor(s));
      await audit(req, s, { entityType: "physio_protocol", entityId: id, action: "update",
        oldValues: r.before, newValues: { ...r.after, devices: input.devices },
        notes: r.demoted ? "عُدّل بروتوكولٌ معتمَد فعاد مسوّدةً بانتظار الاعتماد" : undefined });
      res.json({ ...r.after, demoted: r.demoted });
    } catch (e) { fail(res, e); }
  });

  app.post("/api/physio/protocols/:id/approve", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canApproveProtocols(s)) return res.status(403).json({ error: "يعتمد البروتوكولَ المشرفُ العام أو المسؤول" });
    const id = idOf(req.params.id);
    if (!id) return res.status(400).json({ error: "رقمٌ غير صالح" });
    try {
      const row = await store.approveProtocol(id, actor(s));
      await audit(req, s, { entityType: "physio_protocol", entityId: id, action: "approve", newValues: { status: "approved", approvedByName: row.approvedByName } });
      res.json(row);
    } catch (e) { fail(res, e); }
  });

  for (const [path, archived] of [["archive", true], ["restore", false]] as const) {
    app.post(`/api/physio/protocols/:id/${path}`, isAuthenticated, async (req: any, res) => {
      const s = sess(req);
      if (!canEditProtocols(s)) return res.status(403).json({ error: "للأخصائيّ والمشرف العام والمسؤول" });
      const id = idOf(req.params.id);
      if (!id) return res.status(400).json({ error: "رقمٌ غير صالح" });
      try {
        const row = await store.setArchived(id, archived, actor(s));
        await audit(req, s, { entityType: "physio_protocol", entityId: id, action: path, newValues: { isArchived: archived } });
        res.json(row);
      } catch (e) { fail(res, e); }
    });
  }

  app.post("/api/physio/protocols/:id/images", isAuthenticated, (req: any, res, next) => {
    imageUpload.single("file")(req, res, (err: any) => {
      if (err?.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "الصورةُ أكبر من ٥ ميغابايت" });
      if (err) return next(err);
      next();
    });
  }, async (req: any, res) => {
    const s = sess(req);
    if (!canEditProtocols(s)) return res.status(403).json({ error: "للأخصائيّ والمشرف العام والمسؤول" });
    const id = idOf(req.params.id);
    if (!id) return res.status(400).json({ error: "رقمٌ غير صالح" });
    const f = req.file;
    if (!f || !f.buffer?.length) return res.status(400).json({ error: "اختر صورة" });
    if (!(store.IMAGE_MIME as readonly string[]).includes(f.mimetype)) return res.status(400).json({ error: "الصورةُ JPEG أو PNG أو WEBP" });
    const sourceUrl = text(req.body?.sourceUrl, 1000);
    if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) return res.status(400).json({ error: "رابطُ المصدر يبدأ بـ http" });
    try {
      const p = await store.getProtocolRow(id);
      if (!p) return res.status(404).json({ error: "البروتوكول غير موجود" });
      const row = await store.addImage({ protocolId: id, content: f.buffer, mimeType: f.mimetype,
        caption: text(req.body?.caption, 300), sourceUrl, credit: text(req.body?.credit, 300), userId: s.userId ?? null });
      await audit(req, s, { entityType: "physio_protocol_image", entityId: row.id, action: "create", newValues: row });
      res.json(row);
    } catch (e) { fail(res, e); }
  });

  app.delete("/api/physio/protocols/:id/images/:imageId", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canEditProtocols(s)) return res.status(403).json({ error: "للأخصائيّ والمشرف العام والمسؤول" });
    const id = idOf(req.params.id); const imageId = idOf(req.params.imageId);
    if (!id || !imageId) return res.status(400).json({ error: "رقمٌ غير صالح" });
    try {
      const row = await store.deleteImage(id, imageId);
      if (!row) return res.status(404).json({ error: "الصورة غير موجودة" });
      await audit(req, s, { entityType: "physio_protocol_image", entityId: imageId, action: "delete", oldValues: row });
      res.json({ ok: true });
    } catch (e) { fail(res, e); }
  });

  app.get("/api/physio/protocol-images/:imageId", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canReadProtocols(s)) return res.status(403).json({ error: "غير مصرّح" });
    const imageId = idOf(req.params.imageId);
    if (!imageId) return res.status(400).json({ error: "رقمٌ غير صالح" });
    try {
      const img = await store.getImage(imageId);
      if (!img) return res.status(404).json({ error: "الصورة غير موجودة" });
      res.setHeader("Content-Type", img.mimeType);
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.send(img.content);
    } catch (e) { fail(res, e); }
  });

  app.get("/api/physio/devices", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canReadProtocols(s)) return res.status(403).json({ error: "غير مصرّح" });
    try { res.json({ ...(await store.deviceMatrix()), canManage: canManageDeviceAvailability(s) }); } catch (e) { fail(res, e); }
  });

  app.put("/api/physio/devices/:deviceId/branches/:branchId", isAuthenticated, async (req: any, res) => {
    const s = sess(req);
    if (!canManageDeviceAvailability(s)) return res.status(403).json({ error: "توفّرُ الأجهزة للمشرف العام والمسؤول" });
    const deviceId = idOf(req.params.deviceId); const branchId = idOf(req.params.branchId);
    if (!deviceId || !branchId || typeof req.body?.available !== "boolean") return res.status(400).json({ error: "طلبٌ غير صالح" });
    try {
      const r = await store.setAvailability(deviceId, branchId, req.body.available, s.userId ?? null);
      await audit(req, s, { entityType: "physio_device_branch", entityId: deviceId, action: "update",
        oldValues: { branchId, available: r.before }, newValues: { branchId, available: r.after } });
      res.json(r);
    } catch (e) { fail(res, e); }
  });
}
