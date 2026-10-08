// `GET /api/patients/:patientId/intake-sheets` — «استمارة المراجع» مكتملةً لكلّ جهاز (§4.cq، ملاحظاتُ المالك ٢٠٢٦-١٠-٠٨).
// قراءةٌ محضة بنطاق صفحة المريض نفسِه (فرعُ التسجيل أو فرعٌ أُتيح له الملفّ)، يقرؤها مستطيلُ مواصفات الأجهزة و«عرض الاستمارة» والطباعة.
// **والمالُ لمن يرى الدفعات وحده** — كبطاقة القسم: طبيبٌ أو خبيرٌ لا دورَ له غيره، أو مَن لا يملك «عرض الدفعات»، يرى الورقةَ وخانةُ
// المبلغ فيها مقفولة. ولا يُفتح ملفٌّ في السلّة.
import type { Express } from "express";
import { scopeReachesPatient } from "../patients/branch_access";
import { PATIENT_IN_TRASH_ERROR } from "@shared/patient_trash";
import { onlyRoles } from "@shared/user_roles";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { intakeSheetsFor } from "./store";

type Req = any;

function branchScope(s: any): number[] | null {
  if (s?.isAdmin) return null;
  if (Array.isArray(s?.accessibleBranches) && s.accessibleBranches.length > 0) return s.accessibleBranches as number[];
  return s?.branchId ? [Number(s.branchId)] : [];
}

/** يرى المالَ في الورقة؟ — القاعدةُ نفسُها في بطاقة القسم وباب المعاينات. */
export function sheetMoneyVisible(s: any): boolean {
  if (!s) return false;
  if (s.isAdmin) return true;
  if (onlyRoles(s, ["doctor"]) || onlyRoles(s, ["prosthetics_expert"])) return false;
  return Boolean(s.permissions?.canViewPayments);
}

export function registerIntakeSheetRoutes(app: Express, isAuthenticated: any) {
  app.get("/api/patients/:patientId/intake-sheets", isAuthenticated, async (req: Req, res) => {
    try {
      const patientId = Number(req.params.patientId);
      if (!Number.isFinite(patientId)) return res.status(400).json({ error: "معرّف مريض غير صالح" });
      const s = req.session?.branchSession;
      const pr = await db.execute(sql`SELECT id, branch_id, deleted_at FROM patients WHERE id = ${patientId}`);
      const p = (pr.rows ?? [])[0] as any;
      if (!p) return res.status(404).json({ error: "المريض غير موجود" });
      if (p.deleted_at) return res.status(409).json({ error: PATIENT_IN_TRASH_ERROR });
      if (!(await scopeReachesPatient(branchScope(s), { id: patientId, branchId: p.branch_id ?? null }))) {
        return res.status(403).json({ error: "لا يمكنك الاطّلاع على مرضى فرع آخر" });
      }
      const out = await intakeSheetsFor(patientId, { withMoney: sheetMoneyVisible(s) });
      if (!out) return res.status(404).json({ error: "المريض غير موجود" });
      res.json(out);
    } catch (err) {
      console.error("[intake-sheets] GET failed:", err);
      res.status(500).json({ error: "تعذّر تحميل الاستمارة" });
    }
  });
}
