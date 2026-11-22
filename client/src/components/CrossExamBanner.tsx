// **لافتةُ فتح القسم في ورقة «طلب معاينة جديدة»** (§4.gv — قرارُ المالك ٢٠٢٦-١١-٢٢): تقول القسمَ والفرعَ الذي يُرسَل إليه حين يختلف عن
// الفرع النشط — بالقاعدة نفسِها التي يحسم بها الخادمُ (`departmentHomeBranch`)، فما يُقال هنا هو ما يقع.
import { useQuery } from "@tanstack/react-query";
import { useBranchSession } from "./BranchGate";
import { crossExamActingBranch, crossExamAdminMustChoose } from "./reception_routing";
import { usePatientBranchAccess } from "./PatientBranchAccessDialog";
import {
  crossExamBannerText, crossExamMoveNoteText, CROSS_EXAM_ADMIN_CHOOSE_HINT, departmentHomeBranch, noDepartmentHomeMessage, type CrossExamDepartment,
} from "@shared/cross_department_exam";

type BranchRow = { id: number; name: string; temporarilyClosed?: boolean | null; offersPhysio?: boolean };

export function useCrossExamTarget(dept: CrossExamDepartment, patient: { id?: number | null; branchId?: number | null }, enabled: boolean) {
  const session = useBranchSession();
  const { data: branches } = useQuery<BranchRow[]>({ queryKey: ["/api/branches"], enabled });
  //  **فروعُ الملفّ** — فرعُ المسؤول المختار يُحسب إن وصل الملفَّ بإتاحة، كما يحسمه الخادم (`resolveActingBranchId`). المفتاحُ مفتاحُ رأس الملفّ.
  const { data: access } = usePatientBranchAccess(Number(patient.id ?? 0), enabled && Boolean(patient.id));
  const none = { ready: false, targetBranchId: null as number | null, targetName: null as string | null, differs: false, adminMustChoose: false };
  if (!enabled) return none;
  const shared = (access?.access ?? []).map((a) => Number(a.branchId));
  if (session?.isAdmin && patient.id && !access) return none;
  const acting = crossExamActingBranch(session, patient, shared);
  if (crossExamAdminMustChoose(session, patient, shared)) return { ...none, ready: true, adminMustChoose: true };
  if (!branches || branches.length === 0) return none;
  const physioBranchIds = new Set(branches.filter((b) => b.offersPhysio).map((b) => Number(b.id)));
  const target = departmentHomeBranch({ dept, actingBranchId: acting, branches, physioBranchIds });
  return {
    ready: true, adminMustChoose: false, targetBranchId: target, differs: target !== null && target !== acting,
    targetName: target === null ? null : branches.find((b) => Number(b.id) === target)?.name ?? null,
  };
}

export function CrossExamBanner({ dept, target }: { dept: CrossExamDepartment; target: ReturnType<typeof useCrossExamTarget> }) {
  if (!target.ready) return null;
  if (target.adminMustChoose) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-900" data-testid="cross-exam-admin-choose">
        {CROSS_EXAM_ADMIN_CHOOSE_HINT}
      </div>
    );
  }
  if (target.targetBranchId === null) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800" data-testid="cross-exam-no-home">
        {noDepartmentHomeMessage(dept)}
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-sky-300 bg-sky-50 p-3 text-sm font-medium text-sky-900" data-testid="cross-exam-banner">
      {crossExamBannerText(dept, target.targetName, target.differs)}
    </div>
  );
}

/**
 * **سطرُ «يُفتح القسمُ في» لنوافذ «إضافة خدمة جديدة»** (§4.gv د) — القسمُ الغائب يولد في فرعه (`routeNewCaseBranchTx`) كما يقول «سبب الحضور»
 * «يُرسَل إلى»، فلا يتحرّك صامتاً من بابٍ ويُقال من آخر. والمالُ والزيارةُ في الفرع النشط كما كانا.
 */
export function CrossExamMoveNote({ dept, patient, enabled }: {
  dept: CrossExamDepartment; patient: { id?: number | null; branchId?: number | null }; enabled: boolean;
}) {
  const t = useCrossExamTarget(dept, patient, enabled);
  if (!t.ready || t.adminMustChoose || !t.differs || !t.targetName) return null;
  return (
    <p className="font-medium" data-testid="cross-exam-move-note">{crossExamMoveNoteText(t.targetName)}</p>
  );
}
