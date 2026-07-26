import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import {
  AMPUTATION_TYPE_OPTIONS,
  DISEASE_TYPE_LABEL,
  DISEASE_TYPE_PLACEHOLDER,
  INJURY_AREA_OPTIONS,
  INJURY_SIDE_OPTIONS,
  INJURY_SIDE_PLACEHOLDER,
  INJURY_TYPE_OPTIONS,
  LOWER_AMPUTATION_DETAILS,
  SILICONE_PARTS,
  UPPER_AMPUTATION_DETAILS,
  buildAmputationSite,
  specsForSpecialty,
  type AmputationParts,
  type InjuryEntry,
} from "@shared/case_fields";
import { PHYSIO_TREATMENT_TYPES } from "@shared/pricing";

export interface PrescriptionValue {
  /** Device specs, keyed exactly as the patient columns are. */
  [key: string]: any;
  injuries?: InjuryEntry[];
  treatments?: { treatmentType: string; sessionCount: number }[];
}

/**
 * The clinical DECISION half of an exam: which prosthesis, which support, which
 * course of physiotherapy.
 *
 * Every field, label, placeholder and option here comes from `shared/case_fields`
 * — the same definitions reception has always used, lifted out of the patient
 * form rather than re-authored, so a doctor-written case is indistinguishable
 * from a reception-written one downstream.
 *
 * What is deliberately ABSENT: money. The doctor prescribes the treatment and
 * its session count; reception prices it and collects. Cost never appears here.
 */
export function PrescriptionFields({
  caseType,
  value,
  onChange,
}: {
  caseType: string;
  value: PrescriptionValue;
  onChange: (next: PrescriptionValue) => void;
}) {
  const specs = specsForSpecialty(caseType);
  const set = (key: string, v: any) => onChange({ ...value, [key]: v });

  const injuries: InjuryEntry[] = value.injuries?.length
    ? value.injuries
    : [{ type: "", area: "", side: "" }];
  const setInjuries = (rows: InjuryEntry[]) => set("injuries", rows);
  const patchInjury = (i: number, patch: Partial<InjuryEntry>) =>
    setInjuries(injuries.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const treatments = value.treatments?.length
    ? value.treatments
    : [{ treatmentType: "", sessionCount: 0 }];
  const setTreatments = (rows: { treatmentType: string; sessionCount: number }[]) =>
    set("treatments", rows);

  // Choosing an amputation variant RESETS every builder key first, then seeds
  // that variant's defaults (the registration form's own defaults). Two
  // deliberate improvements over the original form: switching variants can't
  // leave another variant's values behind in the prescription, and clicking the
  // active variant again clears the builder entirely — because once signed, a
  // mistaken "احادي" would otherwise write a site string onto the patient with
  // no way to say "not specified".
  const setAmputationType = (type: string) => {
    const cleared: PrescriptionValue = { ...value };
    for (const k of [
      "amputationType", "singleLimb", "singleSide", "singleDetail",
      "doubleLimbType", "doubleRightDetail", "doubleLeftDetail",
      "bothRightLimb", "bothLeftLimb", "bothRightDetail", "bothLeftDetail",
      "siliconePart", "siliconeSide", "siliconeNotes",
    ]) {
      delete cleared[k];
    }
    if (value.amputationType === type) {
      onChange(cleared); // toggle off → "not specified"
      return;
    }
    cleared.amputationType = type;
    if (type === "single") {
      cleared.singleLimb = "lower";
      cleared.singleSide = "right";
    } else if (type === "double") {
      cleared.doubleLimbType = "lower";
    } else if (type === "silicone") {
      cleared.siliconeSide = "right";
    }
    onChange(cleared);
  };

  return (
    <div className="rounded-lg border border-teal-300 bg-teal-50/50 p-3 space-y-3">
      <div>
        <h4 className="text-sm font-bold text-teal-900">الوصفة — قرار الطبيب</h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          ما تحدّده هنا يُثبَّت على حالة المريض مباشرة. الكلفة والقبض من عمل الاستعلامات.
        </p>
      </div>

      {/* ── أطراف: نوع البتر — the amputation builder ────────────────────
          The exact structure of the registration form: three variants, each
          with its own sub-fields and the owner's original option lists. The
          parts live in the prescription as flat keys; the server composes
          `amputationSite` from them in the identical legacy string format. */}
      {caseType === "prosthetic" && (
        <div className="space-y-2 border-b border-teal-200 pb-3">
          <Label className="text-xs font-semibold">نوع البتر</Label>
          <div className="flex flex-wrap gap-2">
            {AMPUTATION_TYPE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                size="sm"
                variant={value.amputationType === opt.value ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => setAmputationType(opt.value)}
                data-testid={`rx-amputation-${opt.value}`}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          {value.amputationType === "single" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">الطرف</Label>
                <Select
                  value={value.singleLimb ?? "lower"}
                  onValueChange={(v) => onChange({ ...value, singleLimb: v, singleDetail: "" })}
                >
                  <SelectTrigger className="bg-white" data-testid="select-rx-single-limb">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upper">طرف علوي</SelectItem>
                    <SelectItem value="lower">طرف سفلي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">الجهة</Label>
                <Select value={value.singleSide ?? "right"} onValueChange={(v) => set("singleSide", v)}>
                  <SelectTrigger className="bg-white" data-testid="select-rx-single-side">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">يمين</SelectItem>
                    <SelectItem value="left">يسار</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">نوع البتر</Label>
                <Select value={value.singleDetail ?? ""} onValueChange={(v) => set("singleDetail", v)}>
                  <SelectTrigger className="bg-white" data-testid="select-rx-single-detail">
                    <SelectValue placeholder="اختر نوع البتر" />
                  </SelectTrigger>
                  <SelectContent>
                    {((value.singleLimb ?? "lower") === "lower"
                      ? LOWER_AMPUTATION_DETAILS
                      : UPPER_AMPUTATION_DETAILS
                    ).map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {value.amputationType === "double" && (
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">نوع البتر الثنائي</Label>
                <Select
                  value={value.doubleLimbType ?? "lower"}
                  onValueChange={(v) =>
                    // Seed the per-side limb pickers when entering the
                    // علوي-وسفلي variant (the form's default is "upper"), so the
                    // composed string matches what the selects display.
                    onChange({
                      ...value,
                      doubleLimbType: v,
                      doubleRightDetail: "",
                      doubleLeftDetail: "",
                      bothRightDetail: "",
                      bothLeftDetail: "",
                      bothRightLimb: v === "both" ? "upper" : "",
                      bothLeftLimb: v === "both" ? "upper" : "",
                    })
                  }
                >
                  <SelectTrigger className="bg-white" data-testid="select-rx-double-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upper">علوي</SelectItem>
                    <SelectItem value="lower">سفلي</SelectItem>
                    <SelectItem value="both">علوي وسفلي</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(value.doubleLimbType ?? "lower") !== "both" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {([["doubleRightDetail", "البتر اليمين"], ["doubleLeftDetail", "البتر اليسار"]] as const).map(
                    ([key, label]) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs">{label}</Label>
                        <Select value={value[key] ?? ""} onValueChange={(v) => set(key, v)}>
                          <SelectTrigger className="bg-white" data-testid={`select-rx-${key}`}>
                            <SelectValue placeholder="اختر نوع البتر" />
                          </SelectTrigger>
                          <SelectContent>
                            {((value.doubleLimbType ?? "lower") === "lower"
                              ? LOWER_AMPUTATION_DETAILS
                              : UPPER_AMPUTATION_DETAILS
                            ).map((o) => (
                              <SelectItem key={o} value={o}>{o}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {([["bothRightLimb", "bothRightDetail", "اليمين"], ["bothLeftLimb", "bothLeftDetail", "اليسار"]] as const).map(
                    ([limbKey, detailKey, label]) => (
                      <div key={limbKey} className="rounded-md border border-teal-200 bg-white/60 p-2 space-y-1.5">
                        <Label className="text-xs font-semibold">{label}</Label>
                        <Select
                          value={value[limbKey] ?? "upper"}
                          onValueChange={(v) => onChange({ ...value, [limbKey]: v, [detailKey]: "" })}
                        >
                          <SelectTrigger className="bg-white" data-testid={`select-rx-${limbKey}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="upper">علوي</SelectItem>
                            <SelectItem value="lower">سفلي</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={value[detailKey] ?? ""} onValueChange={(v) => set(detailKey, v)}>
                          <SelectTrigger className="bg-white" data-testid={`select-rx-${detailKey}`}>
                            <SelectValue placeholder="اختر نوع البتر" />
                          </SelectTrigger>
                          <SelectContent>
                            {((value[limbKey] ?? "upper") === "lower"
                              ? LOWER_AMPUTATION_DETAILS
                              : UPPER_AMPUTATION_DETAILS
                            ).map((o) => (
                              <SelectItem key={o} value={o}>{o}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          )}

          {value.amputationType === "silicone" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">نوع الطرف السليكوني</Label>
                <Select
                  value={value.siliconePart ?? ""}
                  onValueChange={(v) => set("siliconePart", v)}
                >
                  <SelectTrigger className="bg-white" data-testid="select-rx-silicone-part">
                    <SelectValue placeholder="اختر نوع الطرف" />
                  </SelectTrigger>
                  <SelectContent>
                    {SILICONE_PARTS.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {value.siliconePart && value.siliconePart !== "انف" && (
                <div className="space-y-1">
                  <Label className="text-xs">جهة البتر</Label>
                  <Select value={value.siliconeSide ?? "right"} onValueChange={(v) => set("siliconeSide", v)}>
                    <SelectTrigger className="bg-white" data-testid="select-rx-silicone-side">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="right">يمين</SelectItem>
                      <SelectItem value="left">يسار</SelectItem>
                      <SelectItem value="both">كلا الجانبين</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">ملاحظات عامة</Label>
                <Input
                  placeholder="أي ملاحظات إضافية..."
                  value={value.siliconeNotes ?? ""}
                  onChange={(e) => set("siliconeNotes", e.target.value)}
                  className="bg-white"
                  data-testid="input-rx-silicone-notes"
                />
              </div>
            </div>
          )}

          {value.amputationType && (
            <p className="text-[11px] text-teal-800 bg-white/70 border border-teal-200 rounded px-2 py-1" dir="auto">
              {buildAmputationSite(value as AmputationParts)}
            </p>
          )}
        </div>
      )}

      {/* ── أطراف / مساند: the device spec fields ───────────────────────── */}
      {specs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {specs.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={`rx-${f.key}`} className="text-xs">{f.label}</Label>
              <Input
                id={`rx-${f.key}`}
                inputMode={f.numeric ? "numeric" : undefined}
                placeholder={f.placeholder}
                value={value[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                className="bg-white"
                data-testid={`input-rx-${f.key}`}
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label htmlFor="rx-injurySide" className="text-xs">جهة الإصابة</Label>
            <Input
              id="rx-injurySide"
              placeholder={INJURY_SIDE_PLACEHOLDER}
              value={value.injurySide ?? ""}
              onChange={(e) => set("injurySide", e.target.value)}
              className="bg-white"
              data-testid="input-rx-injurySide"
            />
          </div>
        </div>
      )}

      {/* ── علاج طبيعي: diagnosis + injuries + prescribed course ─────────── */}
      {caseType === "physiotherapy" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="rx-diseaseType" className="text-xs">{DISEASE_TYPE_LABEL}</Label>
            <Input
              id="rx-diseaseType"
              placeholder={DISEASE_TYPE_PLACEHOLDER}
              value={value.diseaseType ?? ""}
              onChange={(e) => set("diseaseType", e.target.value)}
              className="bg-white"
              data-testid="input-rx-diseaseType"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">الإصابات</Label>
            {injuries.map((row, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
                <Select value={row.type} onValueChange={(v) => patchInjury(i, { type: v })}>
                  <SelectTrigger className="bg-white" data-testid={`select-rx-injury-type-${i}`}>
                    <SelectValue placeholder="نوع الإصابة" />
                  </SelectTrigger>
                  <SelectContent>
                    {INJURY_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={row.area} onValueChange={(v) => patchInjury(i, { area: v })}>
                  <SelectTrigger className="bg-white" data-testid={`select-rx-injury-area-${i}`}>
                    <SelectValue placeholder="منطقة الإصابة" />
                  </SelectTrigger>
                  <SelectContent>
                    {INJURY_AREA_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={row.side} onValueChange={(v) => patchInjury(i, { side: v })}>
                  <SelectTrigger className="bg-white w-28" data-testid={`select-rx-injury-side-${i}`}>
                    <SelectValue placeholder="اختياري" />
                  </SelectTrigger>
                  <SelectContent>
                    {INJURY_SIDE_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {injuries.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2 text-red-600"
                    onClick={() => setInjuries(injuries.filter((_, idx) => idx !== i))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => setInjuries([...injuries, { type: "", area: "", side: "" }])}
              data-testid="button-rx-add-injury"
            >
              <Plus className="w-3.5 h-3.5" /> إضافة إصابة أخرى
            </Button>
          </div>

          <div className="space-y-2 border-t border-teal-200 pt-3">
            <Label className="text-xs font-semibold">العلاج الموصوف وعدد الجلسات</Label>
            <p className="text-xs text-muted-foreground">
              تحدّد أنت العلاج والجلسات — والاستعلامات تفتح «الكلفة والجلسات» مملوءة بها لتسعيرها.
            </p>
            {treatments.map((row, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_7rem_auto] gap-2 items-end">
                <Select
                  value={row.treatmentType}
                  onValueChange={(v) =>
                    setTreatments(treatments.map((r, idx) => (idx === i ? { ...r, treatmentType: v } : r)))
                  }
                >
                  <SelectTrigger className="bg-white" data-testid={`select-rx-treatment-${i}`}>
                    <SelectValue placeholder="اختر نوع العلاج" />
                  </SelectTrigger>
                  <SelectContent>
                    {PHYSIO_TREATMENT_TYPES.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* استشارة طبية is a single visit, not a course — same rule the
                    pricing dialog applies, so the two agree. */}
                {row.treatmentType && row.treatmentType !== "استشارة طبية" && (
                  <Input
                    type="number"
                    min={0}
                    placeholder="الجلسات"
                    value={row.sessionCount || ""}
                    onChange={(e) =>
                      setTreatments(
                        treatments.map((r, idx) =>
                          idx === i ? { ...r, sessionCount: Number(e.target.value) || 0 } : r,
                        ),
                      )
                    }
                    className="bg-white"
                    data-testid={`input-rx-sessions-${i}`}
                  />
                )}
                {treatments.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2 text-red-600"
                    onClick={() => setTreatments(treatments.filter((_, idx) => idx !== i))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => setTreatments([...treatments, { treatmentType: "", sessionCount: 0 }])}
              data-testid="button-rx-add-treatment"
            >
              <Plus className="w-3.5 h-3.5" /> إضافة نوع علاج
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
