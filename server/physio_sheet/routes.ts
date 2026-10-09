// `GET /api/patients/:patientId/physio-sheet` — «استمارة مراجع — علاج طبيعي» مكتملةً (§4.da — المرحلةُ الثالثة).
// قراءةٌ محضة بنطاق صفحة المريض نفسِه (فرعُ التسجيل أو فرعٌ أُتيح له الملفّ) — **كبابِ استمارة الأجهزة حرفاً**: المالُ لمن يرى الدفعات
// وحده (`sheetMoneyVisible`)، والخطّةُ لمن يقرأ الخطط، ولا يُفتح ملفٌّ في السلّة. يقرؤها مستطيلُ الاستمارة في الملفّ و«عرض الاستمارة» والطباعة.
import type { Express } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { scopeReachesPatient } from "../patients/branch_access";
import { branchScope, sheetMoneyVisible } from "../intake_sheet/routes";
import { PATIENT_IN_TRASH_ERROR } from "@shared/patient_trash";
import { physioSheetFor } from "./store";

export function registerPhysioSheetRoutes(app: Express, isAuthenticated: any) {
  app.get("/api/patients/:patientId/physio-sheet", isAuthenticated, async (req: any, res) => {
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
      const out = await physioSheetFor(patientId, { withMoney: sheetMoneyVisible(s), session: s });
      if (!out) return res.status(404).json({ error: "لا قسمَ علاجٍ طبيعيّ لهذا المريض" });
      res.json(out);
    } catch (err) {
      console.error("[physio-sheet] GET failed:", err);
      res.status(500).json({ error: "تعذّر تحميل الاستمارة" });
    }
  });
}
