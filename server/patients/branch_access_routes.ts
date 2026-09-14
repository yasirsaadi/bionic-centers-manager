// نقاطُ «إتاحة الملفّ لفروع إضافية» — بديلُ `POST /api/patients/:id/transfer`.
//
// **والصلاحيةُ للمسؤول العام وحده**: الإتاحةُ تفتح ملفَّ مريضٍ كاملاً — مالَه
// وسجلَّه السريريّ — لفرعٍ آخر. ومديرُ فرعٍ كان يستطيع «النقل» قبل اليوم،
// لكنّ النقلَ كان يُخرج الملفَّ من فرعه، والإتاحةُ تُدخل فرعاً غيرَه إلى ملفٍّ
// ليس له. فالقرارُ للمسؤول العام — وهو ما طلبه المالك حرفاً: «فروع إضافية
// يحددها المسؤول».
//
// **والقراءةُ لمن يصل الملفَّ أصلاً** — ليرى الموظّفُ أن ملفَّه متاحٌ لفرعٍ آخر.

import type { Express } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import { logAudit } from "../accounting/ledger";
import { scopeReachesPatient, sharedBranchIdsOf } from "./branch_access";
import {
  grantBranchAccess, revokeBranchAccess, listOpenOperations,
  BranchAccessError,
} from "./branch_access_store";
import { listPatientBranchAccess } from "./branch_access";

type Req = any;

function session(req: Req) {
  const s = (req.session as any)?.branchSession;
  return {
    userId: s?.userId as number | undefined,
    userName: (s?.displayName ?? null) as string | null,
    isAdmin: Boolean(s?.isAdmin),
    branchId: s?.branchId as number | undefined,
    accessible: Array.isArray(s?.accessibleBranches) ? (s.accessibleBranches as number[]) : [],
  };
}

function scopeOf(req: Req): number[] | null {
  const s = session(req);
  if (s.isAdmin) return null;
  if (s.accessible.length > 0) return s.accessible;
  return s.branchId ? [s.branchId] : [];
}

const parseId = (raw: unknown): number | null => {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export function registerPatientBranchAccessRoutes(app: Express, isAuthenticated: any) {
  /** حالةُ الإتاحة + العملياتُ المفتوحة — لبناء النافذة بلا تخمين. */
  app.get("/api/patients/:id/branch-access", isAuthenticated, async (req: Req, res) => {
    const patientId = parseId(req.params.id);
    if (patientId === null) return res.status(400).json({ message: "معرّف غير صالح" });
    const patient = await storage.getPatient(patientId);
    if (!patient) return res.status(404).json({ message: "المريض غير موجود" });
    if (!(await scopeReachesPatient(scopeOf(req), patient))) {
      return res.status(403).json({ message: "غير مصرح لك بهذا الفرع" });
    }
    const [access, openOperations, branches] = await Promise.all([
      listPatientBranchAccess(patientId),
      listOpenOperations(patientId),
      storage.getBranches(),
    ]);
    res.json({
      patientId,
      homeBranchId: patient.branchId,
      homeBranchName: branches.find((b: any) => b.id === patient.branchId)?.name ?? null,
      access,
      openOperations,
      //  **الفروعُ المؤهَّلة** — كلُّ فرعٍ ليس فرعَ التسجيل ولا مُتاحاً سلفاً.
      eligibleBranches: branches
        .filter((b: any) => b.id !== patient.branchId
          && !access.some((a) => a.branchId === b.id))
        .map((b: any) => ({ id: b.id, name: b.name })),
      //  ولا يُعرَض زرُّ المنح لمن لا يملكه — والخادمُ هو الحارس.
      canManage: session(req).isAdmin,
    });
  });

  /** **منحُ الإتاحة** — للمسؤول العام وحده. */
  app.post("/api/patients/:id/branch-access", isAuthenticated, async (req: Req, res) => {
    const s = session(req);
    if (!s.isAdmin) {
      return res.status(403).json({
        message: "إتاحة الملف لفرع إضافي صلاحية المسؤول العام وحده",
      });
    }
    const patientId = parseId(req.params.id);
    const branchId = parseId(req.body?.branchId);
    if (patientId === null) return res.status(400).json({ message: "معرّف غير صالح" });
    if (branchId === null) return res.status(400).json({ message: "اختر الفرع المضاف" });

    //  **بوليانٌ صريح أو غياب** — نصٌّ أو `null` لا يُقرأ «لا» بصمت.
    const moveRaw = req.body?.moveOpenOperations;
    if (moveRaw !== undefined && typeof moveRaw !== "boolean") {
      return res.status(400).json({ message: "قيمة «نقل مسؤولية العملية» غير صالحة" });
    }
    const keepRaw = req.body?.keepExpert;
    if (keepRaw !== undefined && typeof keepRaw !== "boolean") {
      return res.status(400).json({ message: "قيمة «إبقاء الخبير الحالي» غير صالحة" });
    }
    const rawExpert = req.body?.newExpertUserId;
    let newExpertUserId: number | null = null;
    if (rawExpert !== undefined && rawExpert !== null && rawExpert !== "") {
      newExpertUserId = parseId(rawExpert);
      if (newExpertUserId === null) return res.status(400).json({ message: "خبير غير صالح" });
    }

    try {
      const out = await grantBranchAccess({
        patientId, branchId,
        actorUserId: s.userId ?? null, actorName: s.userName,
        note: typeof req.body?.note === "string" ? req.body.note.trim() || null : null,
        moveOpenOperations: moveRaw as boolean | undefined,
        keepExpert: keepRaw as boolean | undefined,
        newExpertUserId,
      });
      await logAudit({
        entityType: "patient_branch_access", entityId: patientId, action: "create",
        userId: s.userId ?? null, userName: s.userName, branchId,
        newValues: out,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: `إتاحة ملف المريض #${patientId} للفرع #${branchId}`
          + (out.movedOperations.length > 0
            ? ` — ونُقلت مسؤولية ${out.movedOperations.length} عملية مفتوحة`
              + (out.expertChanged ? " مع إسناد خبير الفرع الجديد" : " مع إبقاء الخبير الحالي")
            : " — والعمليات المفتوحة وخبراؤها كما هم"),
      });
      res.status(out.created ? 201 : 200).json(out);
    } catch (e: any) {
      if (e instanceof BranchAccessError || e?.name === "BranchAccessError") {
        return res.status(e.status ?? 400).json({ message: e.message });
      }
      console.error("[branch-access] grant failed:", e);
      res.status(500).json({ message: "تعذّر إتاحة الملف — لم يتغيّر شيء" });
    }
  });

  /** **سحبُ الإتاحة** — الرؤيةُ وحدها، ولا صفَّ تاريخيّ يُمَسّ. */
  app.delete("/api/patients/:id/branch-access/:branchId", isAuthenticated, async (req: Req, res) => {
    const s = session(req);
    if (!s.isAdmin) {
      return res.status(403).json({
        message: "سحب الإتاحة صلاحية المسؤول العام وحده",
      });
    }
    const patientId = parseId(req.params.id);
    const branchId = parseId(req.params.branchId);
    if (patientId === null || branchId === null) {
      return res.status(400).json({ message: "معرّف غير صالح" });
    }
    try {
      const out = await revokeBranchAccess({ patientId, branchId });
      if (!out.removed) return res.status(404).json({ message: "لا توجد إتاحة لهذا الفرع" });
      await logAudit({
        entityType: "patient_branch_access", entityId: patientId, action: "delete",
        userId: s.userId ?? null, userName: s.userName, branchId,
        ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
        notes: `سحب إتاحة ملف المريض #${patientId} عن الفرع #${branchId}`
          + " — ولم يتغيّر أي صف تاريخي",
      });
      res.json(out);
    } catch (e: any) {
      if (e instanceof BranchAccessError || e?.name === "BranchAccessError") {
        return res.status(e.status ?? 400).json({ message: e.message });
      }
      console.error("[branch-access] revoke failed:", e);
      res.status(500).json({ message: "تعذّر سحب الإتاحة" });
    }
  });

  /** خبراءُ الفرع المضاف — لاختيار خبيرٍ منه عند نقل المسؤولية. */
  app.get("/api/patients/:id/branch-access/:branchId/experts", isAuthenticated,
    async (req: Req, res) => {
      if (!session(req).isAdmin) return res.status(403).json({ message: "غير مصرح" });
      const branchId = parseId(req.params.branchId);
      if (branchId === null) return res.status(400).json({ message: "معرّف غير صالح" });
      const r = await db.execute(sql`
        SELECT id, display_name FROM system_users
         WHERE is_active = true
           AND (role = 'prosthetics_expert' OR can_work_as_expert = true)
           AND (branch_id = ${branchId}
                OR branch_ids @> ${JSON.stringify([branchId])}::jsonb)
         ORDER BY display_name
      `);
      res.json((r.rows ?? []).map((x: any) => ({
        id: Number(x.id), displayName: x.display_name,
      })));
    });
}

export { sharedBranchIdsOf };
