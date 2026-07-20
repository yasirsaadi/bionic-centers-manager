import { Card } from "@/components/ui/card";
import { Activity, Wrench, HeartPulse } from "lucide-react";
import { formatDateIraq } from "@/lib/utils";

// Phase 2 (relocated): the case selector lives as clickable CHIPS in the
// patient header (next to the branch), and clicking a chip shows that case's
// fully independent view — its own details, cost, paid/remaining, visits and
// payments (case_id-attributed). One patient, a separate page per specialty.

export interface CaseRow {
  id: number;
  caseType: "physiotherapy" | "prosthetic" | "medical_support" | string;
  status: string;
  cost: number;
  paid: number;
  remaining: number;
  visitCount: number;
  details: Record<string, any> | null;
}

const CASE_META: Record<string, { label: string; icon: any }> = {
  physiotherapy: { label: "علاج طبيعي", icon: Activity },
  prosthetic: { label: "أطراف صناعية", icon: Wrench },
  medical_support: { label: "مساند طبية", icon: HeartPulse },
};
const meta = (t: string) => CASE_META[t] ?? { label: t, icon: Activity };

const DETAIL_LABELS: Record<string, string> = {
  amputationSite: "موقع البتر", prostheticType: "نوع الطرف",
  siliconType: "نوع السيليكون", siliconSize: "قياس السيليكون",
  suspensionSystem: "نظام التعليق", footType: "نوع القدم",
  footSize: "قياس الحذاء", kneeJointType: "نوع مفصل الركبة",
  injurySide: "الجهة", injuryCause: "سبب الإصابة", injuryDate: "تاريخ الإصابة",
  injuryType: "نوع الإصابة", diseaseType: "التشخيص", injuryArea: "منطقة الإصابة",
  treatmentType: "نوع العلاج", supportType: "نوع المسند",
};

const fmtIQD = (n: number) => `${(n || 0).toLocaleString("en-US")} د.ع`;

// Clickable chips for the header — one per case.
export function PatientCaseChips({ cases, selectedId, onSelect }: {
  cases: CaseRow[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <>
      {cases.map((c) => {
        const m = meta(c.caseType);
        const Icon = m.icon;
        const active = c.id === selectedId;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            data-testid={`case-chip-${c.id}`}
            className={`inline-flex items-center gap-1 rounded-full px-3 md:px-4 py-1 md:py-1.5 text-xs md:text-base font-medium transition-colors border ${
              active
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-white text-primary border-primary/30 hover:bg-primary/5"
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {m.label}
          </button>
        );
      })}
    </>
  );
}

// The selected case's fully independent panel.
// The selected case's header: its finances + type-specific details. The
// case's visits and payments render in the tabs below (filtered by case),
// so they are NOT duplicated here.
export function PatientCasePanel({ caseRow }: { caseRow: CaseRow }) {
  const details = caseRow.details || {};
  const detailKeys = Object.keys(DETAIL_LABELS).filter((k) => details[k]);
  const m = meta(caseRow.caseType);
  const Icon = m.icon;

  return (
    <Card className="p-4 md:p-6 rounded-2xl shadow-sm border-primary/20 mb-6 space-y-4">
      <h3 className="font-bold text-lg text-primary flex items-center gap-2">
        <Icon className="w-5 h-5" /> {m.label}
      </h3>

      {/* Financial summary for THIS case */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox label="التكلفة" value={fmtIQD(caseRow.cost)} tone="slate" />
        <StatBox label="المدفوع" value={fmtIQD(caseRow.paid)} tone="green" />
        <StatBox label="المتبقّي" value={fmtIQD(caseRow.remaining)} tone={caseRow.remaining > 0 ? "red" : "green"} />
      </div>

      {detailKeys.length > 0 && (
        <div className="rounded-xl border p-3">
          <p className="text-sm font-semibold text-primary mb-2">التفاصيل</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {detailKeys.map((k) => (
              <div key={k}>
                <div className="text-xs text-muted-foreground">{DETAIL_LABELS[k]}</div>
                <div className="font-medium">{k === "injuryDate" ? formatDateIraq(details[k]) : String(details[k])}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function StatBox({ label, value, tone }: { label: string; value: string; tone: "slate" | "green" | "red" }) {
  const toneCls = tone === "green" ? "text-green-700 bg-green-50" : tone === "red" ? "text-red-700 bg-red-50" : "text-slate-700 bg-slate-50";
  return (
    <div className={`rounded-xl p-3 text-center ${toneCls}`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="font-bold text-sm md:text-base">{value}</div>
    </div>
  );
}
