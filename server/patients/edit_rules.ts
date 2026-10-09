// **قفلُ ما بعد المعاينة في ملفّ المريض، و«المطلوب» يُصحَّح قبلها** (§4.db — قرارُ المالك ٢٠٢٦-١٠-٠٩).
//
// القاعدةُ نفسُها في `shared/patient_edit_rules.ts` — وهنا ما يقرؤها من القاعدة:
//   • `patientEditStateFor` — أيُّ الأقسام عُوينت (معاينةٌ فعّالة: الملغاةُ لا تُحسَب فتعود الخاناتُ للاستعلامات)، ومَن السائل.
//   • `GET /api/patients/:id/edit-scope` — الخاناتُ المقفولة على السائل، تقرؤها «تعديل مريض» فتقفلها بجملتها. والخادمُ هو الحَكَم:
//     `PUT /api/patients/:id` يردّ المقفولَ إن تغيّر ويُسقطه إن لم يتغيّر (`applyEditLocks`).
//   • `PATCH /api/patients/:id/device-episodes/:episodeId/requested-item` — «المطلوب» على طلب جهاز الأطراف: للاستعلامات ما دام ينتظر
//     المعاينة، وللمسؤول ومدير الفرع بعدها ما دام بلا سعرٍ ولا تصنيع. بمفتاح «تعديل مرضى»، تحت قفل الطلب، وبسطر تدقيق.
import type { Express } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { activeExamSql } from "../medical/active_exam";
import { scopeReachesPatient } from "./branch_access";
import { logAudit } from "../accounting/ledger";
import { setEpisodeRequestedItemTx } from "../device_episodes/store";
import { PATIENT_IN_TRASH_ERROR } from "@shared/patient_trash";
import { parseRequestedItems, requestedItemLabel } from "@shared/prosthetic_parts";
import {
  isPrivilegedPatientEditor, lockedPatientFields, lockReason, requestedItemEditable, ALWAYS_OPEN_FIELDS,
  type PatientEditState,
} from "@shared/patient_edit_rules";

type Req = any;

/** الأقسامُ التي لها معاينةٌ فعّالة لهذا المريض. */
export async function examinedCaseTypes(patientId: number): Promise<string[]> {
  const r = await db.execute(sql`
    SELECT DISTINCT me.case_type FROM medical_exams me
     WHERE me.patient_id = ${patientId} AND ${activeExamSql("me")}
  `);
  return (r.rows ?? []).map((x: any) => String(x.case_type)).filter(Boolean);
}

export async function patientEditStateFor(patientId: number, session: any): Promise<PatientEditState> {
  const examinedTypes = await examinedCaseTypes(patientId);
  return { privileged: isPrivilegedPatientEditor(session), examinedAny: examinedTypes.length > 0, examinedTypes };
}

/** «تعديل مرضى» — المفتاحُ الذي يفتح بابَ التعديل أصلاً (والمسؤولُ العامّ بلا مفتاح). */
export const mayEditPatients = (s: any): boolean => Boolean(s?.isAdmin) || s?.permissions?.canEditPatients === true;

/** نطاقُ الكتابة — الفرعُ النشط وحده، كبابِ «تعديل مريض» نفسِه. */
const writeScope = (s: any): number[] | null => (s?.isAdmin ? null : s?.branchId ? [Number(s.branchId)] : []);

export function registerPatientEditRulesRoutes(app: Express, isAuthenticated: any) {
  app.get("/api/patients/:id/edit-scope", isAuthenticated, async (req: Req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "معرّف غير صالح" });
      const s = req.session?.branchSession;
      const pr = await db.execute(sql`SELECT id, branch_id, deleted_at FROM patients WHERE id = ${id}`);
      const p = (pr.rows ?? [])[0] as any;
      if (!p) return res.status(404).json({ message: "المريض غير موجود" });
      if (p.deleted_at) return res.status(409).json({ message: PATIENT_IN_TRASH_ERROR });
      if (!(await scopeReachesPatient(writeScope(s), { id, branchId: p.branch_id ?? null }))) {
        return res.status(403).json({ message: "غير مصرح لك بتعديل هذا المريض" });
      }
      if (!mayEditPatients(s)) return res.status(403).json({ message: "ليس لديك صلاحية تعديل بيانات المرضى" });
      const state = await patientEditStateFor(id, s);
      const locked = Array.from(lockedPatientFields(state));
      const reasons: Record<string, string> = {};
      for (const k of locked) reasons[k] = lockReason(k, state) ?? "";
      res.json({ ...state, locked, reasons, alwaysOpen: ALWAYS_OPEN_FIELDS });
    } catch (err) {
      console.error("[edit-scope] GET failed:", err);
      res.status(500).json({ message: "تعذّر تحميل صلاحيات التعديل" });
    }
  });

  app.patch("/api/patients/:id/device-episodes/:episodeId/requested-item", isAuthenticated, async (req: Req, res) => {
    try {
      const id = Number(req.params.id);
      const episodeId = Number(req.params.episodeId);
      if (!Number.isFinite(id) || !Number.isFinite(episodeId)) return res.status(400).json({ message: "معرّف غير صالح" });
      const s = req.session?.branchSession;
      const pr = await db.execute(sql`SELECT id, branch_id, deleted_at FROM patients WHERE id = ${id}`);
      const p = (pr.rows ?? [])[0] as any;
      if (!p) return res.status(404).json({ message: "المريض غير موجود" });
      if (p.deleted_at) return res.status(409).json({ message: PATIENT_IN_TRASH_ERROR });
      if (!(await scopeReachesPatient(writeScope(s), { id, branchId: p.branch_id ?? null }))) {
        return res.status(403).json({ message: "غير مصرح لك بتعديل هذا المريض" });
      }
      if (!mayEditPatients(s)) return res.status(403).json({ message: "ليس لديك صلاحية تعديل بيانات المرضى" });

      const raw = req.body?.requestedItems ?? req.body?.requestedItem;
      const items = parseRequestedItems(raw, "prosthetic");
      if (!items.ok || !items.requestedItem) {
        return res.status(400).json({ message: items.error ?? "«المطلوب» غير صالح — اختر طرفاً كاملاً أو أحد الأجزاء", missing: ["requestedItem"] });
      }
      const privileged = isPrivilegedPatientEditor(s);

      const out = await db.transaction(async (tx) => {
        //  **الحالُ يُقرأ تحت قفل الطلب** — طبيبٌ يوقّع المعاينةَ في اللحظة نفسِها لا يُفلت منه تعديلُ الاستعلامات بعدها.
        const er = await tx.execute(sql`
          SELECT e.status, e.agreed_cost, c.case_type
            FROM patient_device_episodes e JOIN patient_cases c ON c.id = e.case_id
           WHERE e.id = ${episodeId} AND e.patient_id = ${id}
           FOR UPDATE OF e
        `);
        const ep = (er.rows ?? [])[0] as any;
        if (!ep) return { status: 404 as const, message: "طلب الجهاز غير موجود لهذا المريض" };
        const state = { privileged, status: String(ep.status), agreedCost: Number(ep.agreed_cost ?? 0), caseType: String(ep.case_type) };
        if (!requestedItemEditable(state)) {
          if (state.caseType !== "prosthetic") return { status: 409 as const, message: "«المطلوب» لطلبات الأطراف وحدها" };
          if (state.status === "examined" && !privileged && !(state.agreedCost > 0)) {
            return { status: 403 as const, message: "بعد المعاينة يعدّل «المطلوب» المسؤولُ أو مديرُ الفرع" };
          }
          return { status: 409 as const, message: "فات أوانُ تعديل «المطلوب»: للجهاز سعرٌ معتمَد أو دخل التصنيع" };
        }
        const r = await setEpisodeRequestedItemTx(tx, {
          episodeId, patientId: id, requestedItem: items.requestedItem!, extraComponents: items.extraComponents,
        });
        if (r.result === "locked") return { status: 409 as const, message: "فات أوانُ تعديل «المطلوب»: للجهاز سعرٌ معتمَد أو دخل التصنيع" };
        if (r.result === "changed") {
          await logAudit({
            entityType: "patient_device_episode", entityId: episodeId, action: "update",
            userId: s?.userId ?? null, userName: s?.displayName ?? null, branchId: p.branch_id ?? null,
            oldValues: { requestedItem: r.from, extraComponents: r.fromExtras },
            newValues: { requestedItem: items.requestedItem, extraComponents: items.extraComponents },
            ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
            notes: `«المطلوب»: ${requestedItemLabel(r.from, "prosthetic", r.fromExtras)} ⟶ ${requestedItemLabel(items.requestedItem!, "prosthetic", items.extraComponents)}`
              + ` — تعديل الاستمارة قبل الحسم`,
            tx,
          });
        }
        return { status: 200 as const, result: r.result };
      });
      if (out.status !== 200) return res.status(out.status).json({ message: out.message });
      res.json({ ok: true, result: out.result });
    } catch (err) {
      console.error("[requested-item] PATCH failed:", err);
      res.status(500).json({ message: "تعذّر حفظ «المطلوب» — لم يُحفظ شيء، أعد المحاولة" });
    }
  });
}
