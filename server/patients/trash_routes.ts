/**
 * **نقاطُ سلّة المرضى** (ترحيل ٠٦٨).
 *
 * ══ ولماذا بادئةٌ مستقلّة `/api/patient-trash` ═════════════════════════
 * `/api/patients/:id` مسجَّلةٌ قبل هذه النقاط في ترتيب express، فمسارٌ
 * مثل `/api/patients/trash` كان سيُقرأ «المريضُ رقمه trash» ويُردّ ٤٠٠.
 * وبادئةٌ مستقلّة تقول ما تفعله ولا تتعلّق بترتيب تسجيلٍ قد يتغيّر.
 *
 * **والحذفُ الناعم نفسُه يبقى على `DELETE /api/patients/:id`** — البابُ
 * الذي يعرفه العميلُ والموظّف: الزرُّ نفسُه، والأثرُ صار قابلاً للرجوع.
 */

import type { Express, RequestHandler } from "express";
import {
  TrashError, previewDelete, softDeletePatient, restorePatient,
  purgePatient, listTrash, type TrashActor,
} from "./trash_store";
import { canTrashPatients, canPurgePatients } from "@shared/patient_trash";

/** الفاعلُ من الجلسة الموقَّعة — **لا من جسم الطلب أبداً**. */
export function trashActor(req: any): TrashActor {
  const s = (req.session as any)?.branchSession ?? {};
  const list = Array.isArray(s.accessibleBranches) ? s.accessibleBranches : [];
  const scope: number[] | null = s.isAdmin === true
    ? null
    : (list.length > 0 ? list : (s.branchId ? [s.branchId] : []));
  return {
    userId: s.userId ?? null,
    role: s.role ?? null,
    isAdmin: s.isAdmin === true,
    permissions: s.permissions ?? null,
    displayName: s.displayName ?? null,
    scope,
    ipAddress: req.ip ?? null,
    userAgent: req.get?.("user-agent") ?? null,
  };
}

function fail(res: any, err: unknown, fallback: string) {
  if (err instanceof TrashError) return res.status(err.status).json({ message: err.message });
  console.error("[patient-trash]", err);
  return res.status(500).json({ message: fallback });
}

export function registerPatientTrashRoutes(app: Express, isAuthenticated: RequestHandler): void {
  /** **ما الذي سيحدث لو حذفت هذا الملفّ؟** — أرقامُ الخادم لا العميل. */
  app.get("/api/patient-trash/delete-preview/:id", isAuthenticated, async (req: any, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "معرّف غير صالح" });
    try {
      res.json(await previewDelete(id, trashActor(req)));
    } catch (err) { fail(res, err, "تعذّر قراءة حالة الملف"); }
  });

  /** صفوفُ السلّة ضمن نطاق الفاعل، مع بحثٍ **داخلها وحدها**. */
  app.get("/api/patient-trash", isAuthenticated, async (req: any, res) => {
    const actor = trashActor(req);
    if (!canTrashPatients(actor)) return res.status(403).json({ message: "غير مصرح" });
    try {
      const search = typeof req.query.search === "string" ? req.query.search : null;
      const rows = await listTrash({ actor, search });
      res.json({ rows, mayPurge: canPurgePatients(actor) });
    } catch (err) { fail(res, err, "تعذّر قراءة المحذوفات"); }
  });

  /** شارةُ العدد — ولمن لا يملك السلّة صفرٌ لا خطأ، فلا شارةَ تومض له. */
  app.get("/api/patient-trash/count", isAuthenticated, async (req: any, res) => {
    const actor = trashActor(req);
    if (!canTrashPatients(actor)) return res.json({ count: 0 });
    try {
      res.json({ count: (await listTrash({ actor, limit: 500 })).length });
    } catch (err) { fail(res, err, "تعذّر قراءة المحذوفات"); }
  });

  /** **الاستعادة** — الصفوفُ نفسُها تعود، ولا شيءَ يُبنى. */
  app.post("/api/patient-trash/:id/restore", isAuthenticated, async (req: any, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "معرّف غير صالح" });
    try {
      res.json(await restorePatient({ patientId: id, actor: trashActor(req) }));
    } catch (err) { fail(res, err, "تعذّرت الاستعادة"); }
  });

  /** **الحذفُ النهائيّ** — المسؤولُ العام وحده، بسببٍ مكتوب، من السلّة. */
  app.post("/api/patient-trash/:id/purge", isAuthenticated, async (req: any, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "معرّف غير صالح" });
    try {
      res.json(await purgePatient({
        patientId: id, reason: req.body?.reason, actor: trashActor(req),
      }));
    } catch (err) { fail(res, err, "تعذّر الحذف النهائي"); }
  });
}
