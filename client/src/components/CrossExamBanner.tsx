// **لافتةُ فتح القسم في ورقة «طلب معاينة جديدة»** (§4.gv — قرارُ المالك ٢٠٢٦-١١-٢٢): تقول القسمَ والفرعَ الذي يُرسَل إليه — بالقاعدة نفسِها
// التي يحسم بها الخادمُ (`resolveCrossExamTarget`)، فما يُقال هنا هو ما يقع. **والفرعُ قائمةٌ يختار منها الاستعلامات** (طلبُ المالك
// ٢٠٢٦-١١-٢٣): الفروعُ المفتوحة التي تقدّم القسم (`crossExamTargetOptions`)، والمختارُ مسبقاً فرعُ المدينة، وبلا فرعٍ فيها (كربلاء والموصل
// للعلاج الطبيعيّ) لا يُرسَل قبل الاختيار.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBranchSession } from "./BranchGate";
import { crossExamActingBranch, crossExamAdminMustChoose } from "./reception_routing";
import { usePatientBranchAccess } from "./PatientBranchAccessDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  crossExamBannerText, crossExamMoveNoteText, CROSS_EXAM_ADMIN_CHOOSE_HINT, CROSS_EXAM_DEPARTMENT_NAMES, crossExamTargetOptions, branchOffersDepartment,
  departmentHomeBranch, noCrossExamTargetsMessage, noDepartmentHomeMessage, type CrossExamDepartment,
} from "@shared/cross_department_exam";

type BranchRow = { id: number; name: string; temporarilyClosed?: boolean | null; offersPhysio?: boolean };
type CaseLite = { id: number; caseType: string; branchId: number | null; status?: string | null };

export function useCrossExamTarget(dept: CrossExamDepartment, patient: { id?: number | null; branchId?: number | null }, enabled: boolean) {
  const session = useBranchSession();
  //  **اختيارُ الاستعلامات** — `null` ⟵ فرعُ المدينة المختارُ مسبقاً.
  const [chosen, setChosen] = useState<number | null>(null);
  const { data: branches } = useQuery<BranchRow[]>({ queryKey: ["/api/branches"], enabled });
  //  **أقسامُ المريض** (مراجعةُ Codex): القسمُ المغلقُ يُعاد في فرعه لا في المختار (`openDepartmentTarget`) — فالقائمةُ تقول فرعَه وحده.
  //  المفتاحُ مفتاحُ صفحة المريض نفسُه (`/api/patients/:id/cases`) فلا طلبَ ثانٍ.
  const { data: cases } = useQuery<CaseLite[]>({
    queryKey: ["/api/patients/:id", Number(patient.id ?? 0), "cases"],
    enabled: enabled && Boolean(patient.id),
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patient.id}/cases`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
  //  **فروعُ الملفّ** — فرعُ المسؤول المختار يُحسب إن وصل الملفَّ بإتاحة، كما يحسمه الخادم (`resolveActingBranchId`). المفتاحُ مفتاحُ رأس الملفّ.
  const { data: access } = usePatientBranchAccess(Number(patient.id ?? 0), enabled && Boolean(patient.id));
  const none = {
    ready: false, targetBranchId: null as number | null, targetName: null as string | null, differs: false, adminMustChoose: false,
    options: [] as { id: number; name: string }[], chosen: null as number | null, setChosen,
    /** القسمُ المغلقُ في فرعٍ لا يقدّمه — لا يُفتح من هنا (`department_closed_elsewhere`). */
    closedElsewhere: null as string | null,
  };
  if (!enabled) return none;
  const shared = (access?.access ?? []).map((a) => Number(a.branchId));
  if (session?.isAdmin && patient.id && !access) return none;
  const acting = crossExamActingBranch(session, patient, shared);
  if (crossExamAdminMustChoose(session, patient, shared)) return { ...none, ready: true, adminMustChoose: true };
  if (!branches || branches.length === 0 || (patient.id && !cases)) return none;
  const physioBranchIds = new Set(branches.filter((b) => b.offersPhysio).map((b) => Number(b.id)));
  //  **القسمُ المغلقُ يحكم** كالخادم (`openDepartmentState` — أحدثُ صفٍّ من هذا النوع): يُعاد في فرعه، فالقائمةُ فرعُه وحده؛
  //  وفرعُه لا يقدّمه ⟵ لا إرسال.
  const closed = (cases ?? []).filter((c) => c.caseType === dept).sort((a, b) => b.id - a.id)[0] ?? null;
  if (closed) {
    const cb = branches.find((b) => Number(b.id) === Number(closed.branchId)) ?? null;
    if (!cb || !branchOffersDepartment(cb, dept, physioBranchIds)) {
      return { ...none, ready: true, closedElsewhere: cb?.name ?? "فرعٍ آخر" };
    }
    return {
      ...none, ready: true, targetBranchId: Number(cb.id), targetName: cb.name, differs: Number(cb.id) !== acting,
      options: [{ id: Number(cb.id), name: cb.name }],
    };
  }
  const options = crossExamTargetOptions({ dept, branches, physioBranchIds }).map((b) => ({ id: Number(b.id), name: b.name }));
  //  المختارُ من القائمة وحدها — فإن خرج منها (أُغلق الفرع) عاد الاختيارُ إلى فرع المدينة.
  const picked = chosen !== null && options.some((o) => o.id === chosen) ? chosen : null;
  const target = picked ?? departmentHomeBranch({ dept, actingBranchId: acting, branches, physioBranchIds });
  return {
    ready: true, adminMustChoose: false, targetBranchId: target, differs: target !== null && target !== acting,
    targetName: target === null ? null : branches.find((b) => Number(b.id) === target)?.name ?? null,
    options, chosen: picked, setChosen, closedElsewhere: null,
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
  if (target.closedElsewhere) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800" data-testid="cross-exam-closed-elsewhere">
        {`للمريض قسم ${CROSS_EXAM_DEPARTMENT_NAMES[dept]} مغلق في ${target.closedElsewhere} لا يقدّمه — لا يُفتح من «سبب الحضور»؛ راجع المسؤول`}
      </div>
    );
  }
  if (target.options.length === 0) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800" data-testid="cross-exam-no-home">
        {noCrossExamTargetsMessage(dept)}
      </div>
    );
  }
  const missing = target.targetBranchId === null;
  return (
    <div className={`rounded-lg border p-3 text-sm font-medium space-y-2 ${missing ? "border-amber-300 bg-amber-50 text-amber-900" : "border-sky-300 bg-sky-50 text-sky-900"}`}
      data-testid="cross-exam-banner">
      <div>
        {missing ? noDepartmentHomeMessage(dept) : crossExamBannerText(dept, target.targetName, target.differs)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span>يُرسَل إلى:</span>
        <Select value={target.targetBranchId === null ? "" : String(target.targetBranchId)} onValueChange={(v) => target.setChosen(Number(v))}>
          <SelectTrigger className="h-9 w-auto min-w-[14rem] bg-white" data-testid="cross-exam-target"
            aria-label={`الفرع الذي يُرسَل إليه قسم ${CROSS_EXAM_DEPARTMENT_NAMES[dept]}`}>
            <SelectValue placeholder="اختر الفرع" />
          </SelectTrigger>
          <SelectContent>
            {target.options.map((o) => (
              <SelectItem key={o.id} value={String(o.id)} data-testid={`cross-exam-target-${o.id}`}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
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
