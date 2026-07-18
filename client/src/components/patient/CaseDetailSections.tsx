import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

// Each case type a patient carries is shown as its OWN clearly-labelled
// section with its full details, so a patient with more than one case
// (e.g. أطراف صناعية + مساند طبية + علاج طبيعي) never hides one type's
// details behind another. Rendered inside the patient file for reception,
// branch managers, accountants and the admin (experts use the order page).
export function CaseDetailSections({
  patient, t, translateInjurySide, translateInjuryType, translateInjuryArea, translateTreatmentType,
}: {
  patient: any;
  t: any;
  translateInjurySide: (s: string) => string;
  translateInjuryType: (s: string) => string;
  translateInjuryArea: (s: string) => string;
  translateTreatmentType: (s: string | null | undefined) => string;
}) {
  const Field = ({ label, value }: { label: string; value: any }) =>
    value ? (
      <div>
        <p className="text-muted-foreground mb-1">{label}</p>
        <p className="font-semibold text-base">{value}</p>
      </div>
    ) : null;

  const SectionHead = ({ title }: { title: string }) => (
    <p className="font-bold text-primary mb-3 flex items-center gap-2">
      <Activity className="w-4 h-4" /> {title}
    </p>
  );

  // Physiotherapy injuries list (from JSON array, or split legacy columns).
  let injuriesList: { type: string; area: string; side: string }[] = [];
  if (patient.injuries) {
    try {
      const parsed = JSON.parse(patient.injuries);
      if (Array.isArray(parsed) && parsed.length > 0) injuriesList = parsed.filter((e: any) => e.type || e.area);
    } catch {}
  }
  if (injuriesList.length === 0 && (patient.injuryType || patient.injuryArea)) {
    const types = patient.injuryType?.split(/، |, /).filter(Boolean) || [];
    const areas = patient.injuryArea?.split(/، |, /).filter(Boolean) || [];
    const maxLen = Math.max(types.length, areas.length, 1);
    for (let i = 0; i < maxLen; i++) injuriesList.push({ type: types[i] || "", area: areas[i] || "", side: "" });
  }

  // Physiotherapy treatment types (from payments).
  const treatmentTypes = new Set<string>();
  patient.payments?.forEach((p: any) => {
    if (p.paymentTreatmentType) p.paymentTreatmentType.split(",").forEach((tt: string) => { const x = tt.trim(); if (x) treatmentTypes.add(x); });
  });

  return (
    <div className="space-y-4">
      {/* ===== الطرف الصناعي ===== */}
      {patient.isAmputee && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
          <SectionHead title={t.patients.amputee} />
          <div className="grid grid-cols-2 gap-4">
            <Field label={t.patientDetails.diagnosisCondition} value={patient.amputationSite} />
            <Field label={t.patientDetails.injurySide} value={patient.injurySide ? translateInjurySide(patient.injurySide) : null} />
            <Field label={t.patientDetails.prostheticType} value={patient.prostheticType} />
            <Field label={t.patientDetails.siliconType} value={patient.siliconType} />
            <Field label={t.patientDetails.siliconSize} value={patient.siliconSize} />
            <Field label={t.patientDetails.suspensionSystem} value={patient.suspensionSystem} />
            <Field label={t.patientDetails.footType} value={patient.footType} />
            <Field label={t.patientDetails.footSize} value={patient.footSize} />
            <Field label={t.patientDetails.kneeJointType} value={patient.kneeJointType} />
          </div>
        </div>
      )}

      {/* ===== المسند الطبي ===== */}
      {patient.isMedicalSupport && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
          <SectionHead title={t.patients.medicalSupportLabel} />
          <div className="grid grid-cols-2 gap-4">
            <Field label={t.patientForm?.supportType || "نوع المسند"} value={patient.supportType} />
            <Field label={t.patientDetails.injurySide} value={patient.injurySide ? translateInjurySide(patient.injurySide) : null} />
          </div>
        </div>
      )}

      {/* ===== العلاج الطبيعي ===== */}
      {patient.isPhysiotherapy && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
          <SectionHead title={t.patients.physiotherapy} />
          <div className="space-y-3">
            <Field label={t.patientDetails.diagnosisCondition} value={patient.diseaseType} />
            {injuriesList.length > 0 && (
              <div>
                <p className="text-muted-foreground mb-2">{t.patientDetails.injuries} ({injuriesList.length})</p>
                <div className="space-y-2">
                  {injuriesList.map((injury, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{i + 1}</Badge>
                      {injury.type && <Badge variant="secondary" className="text-xs">{translateInjuryType(injury.type)}</Badge>}
                      {injury.area && <Badge variant="outline" className="text-xs">{translateInjuryArea(injury.area)}</Badge>}
                      {injury.side && <Badge variant="outline" className="text-xs">{translateInjurySide(injury.side)}</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {treatmentTypes.size > 0 && (
              <div>
                <p className="text-muted-foreground mb-1">{t.patientDetails.treatmentType}</p>
                <div className="flex flex-wrap gap-1">
                  {Array.from(treatmentTypes).map((tt, i) => (
                    <span key={i} className="inline-block bg-blue-50 text-blue-700 rounded px-2 py-0.5 text-sm">{translateTreatmentType(tt)}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
