import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Layers, Loader2 } from "lucide-react";
import { invalidatePatientData } from "@/lib/queryClient";
import {
  AmputationBuilder, amputationSiteOf, amputationComplete,
  type AmputationParts,
} from "@/components/AmputationBuilder";
import {
  CORE_MEASUREMENT_FIELDS, FIELD_LABELS, meaningfulMeasure,
} from "@shared/patient_required";

interface AddCaseTypeModalProps {
  patient: {
    id: number;
    branchId: number;
    isAmputee?: boolean | null;
    isPhysiotherapy?: boolean | null;
    isMedicalSupport?: boolean | null;
    //  المقاساتُ تُقرأ من الملفّ فلا يُسأل الموظّفُ عمّا هو مكتوبٌ أمامه.
    age?: string | null;
    height?: string | null;
    weight?: string | null;
  };
  /**
   * فتحٌ **موجَّه** من موزِّع الخدمات: النافذة تُدار من الخارج وتفتح على
   * النوع المطلوب مباشرةً، بلا زرٍّ خاصّ بها.
   *
   * والمنطق واحد لا اثنان: لا شيء هنا يتفرّع على مصدر الفتح — النداء نفسه،
   * والحمولة نفسها (`serviceCost: 0, paidNow: 0`)، والتحويل نفسه إلى صفحة
   * الحقول الكاملة. المتغيّر هو **مَن يفتح** لا **ماذا يجري**.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialCaseType?: string;
  hideTrigger?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  amputee: "أطراف صناعية",
  medical_support: "مساند طبية",
  physiotherapy: "علاج طبيعي",
};

// One person = one record: instead of opening a duplicate patient file when
// an existing patient needs a NEW kind of service (e.g. a physio patient who
// now needs a medical support), this dialog activates the new case type on
// the SAME record — with expert assignment for manufacturing types, and an
// optional cost + partial payment.
export function AddCaseTypeModal({
  patient, open: openProp, onOpenChange, initialCaseType, hideTrigger,
}: AddCaseTypeModalProps) {
  const [openSelf, setOpenSelf] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openSelf;
  const setOpen = (v: boolean) => { if (!controlled) setOpenSelf(v); onOpenChange?.(v); };
  const [caseType, setCaseType] = useState<string>(initialCaseType ?? "");

  // النوع الموجَّه يُثبَّت عند كل فتح: نافذةٌ أُغلقت ثم فُتحت على نوعٍ آخر
  // كانت ستحمل اختيار المرّة السابقة.
  useEffect(() => {
    if (open && initialCaseType) setCaseType(initialCaseType);
  }, [open, initialCaseType]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const missingTypes = [
    !patient.isAmputee && "amputee",
    !patient.isMedicalSupport && "medical_support",
    !patient.isPhysiotherapy && "physiotherapy",
  ].filter(Boolean) as string[];

  const isManufacturing = caseType === "amputee" || caseType === "medical_support";

  // ══ **فتحُ خيطِ أطرافٍ يُنتج ملفّاً مكتملاً أو لا يقع** ═════════════════
  //  كانت النافذةُ ترسل النوعَ وحده ثم **تحوّل** إلى صفحة الحقول الكاملة
  //  ليُكمِلها الموظّف لاحقاً — فيُولَد ملفٌّ مبتورٌ بلا تعريفِ بتره، ويبقى
  //  كذلك ما لم يعد أحدٌ. ثم يصطدم به الطبيبُ والخبير.
  //
  //  فالسؤالُ صار **هنا وفي الطلب نفسه**: تعريفُ البتر منظَّماً، وما ينقص
  //  من المقاسات وحده — وما هو مكتوبٌ على الملفّ لا يُسأل عنه ثانيةً.
  const isAmputeeCase = caseType === "amputee";
  const [amp, setAmp] = useState<AmputationParts>({});
  const [measures, setMeasures] = useState<Record<string, string>>({});
  useEffect(() => {
    if (open) { setAmp({}); setMeasures({}); }
  }, [open]);

  //  ما ينقص الملفَّ فعلاً — يُقرأ منه لا يُفترَض.
  const missingMeasures = CORE_MEASUREMENT_FIELDS.filter(
    (f) => !meaningfulMeasure((patient as any)[f]),
  );
  const measuresReady = missingMeasures.every((f) => meaningfulMeasure(measures[f]));
  const ampReady = !isAmputeeCase || (amputationComplete(amp) && measuresReady);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const body: Record<string, any> = {
        // Decision only — NO money here. Pricing stays in its dedicated
        // post-exam steps (تخصيص for devices / الكلفة والجلسات for physio),
        // so the clerk never sees mixed totals while adding a case.
        caseType, serviceCost: 0, paidNow: 0,
      };
      //  **والمساندُ والعلاجُ الطبيعي لا يُسألان عن بتر** — ولا يُرسَل عنهما.
      if (isAmputeeCase) {
        body.amputationSite = amputationSiteOf(amp);
        for (const f of missingMeasures) body[f] = measures[f]?.trim() ?? "";
      }
      const res = await fetch(`/api/patients/${patient.id}/add-case-type`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "تعذّرت إضافة نوع الحالة");
      }
      return res.json();
    },
    onSuccess: () => {
      const addedTypeIsAmputee = isAmputeeCase;
      invalidatePatientData(queryClient, patient.id);
      toast({
        title: "تمت إضافة نوع الحالة",
        description: addedTypeIsAmputee
          ? "الملفّ مكتمل. تُستكمل بقية تفاصيل النوع الجديد في صفحة الحقول الكاملة."
          : "أكمل الآن بقية حقول النوع الجديد — فُتحت لك صفحة الحقول الكاملة.",
      });
      const addedType = caseType;
      reset();
      setOpen(false);
      // The dialog holds only the decision; the FULL registration-grade fields
      // for the new type (amputation builder / injuries builder / device
      // specs) live in the edit page — open it directly on that section.
      setLocation(`/patients/${patient.id}/edit?section=${addedType}&adding=1`);
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  function reset() { setCaseType(initialCaseType ?? ""); setAmp({}); setMeasures({}); }

  const canSubmit = !!caseType && !isPending && ampReady;

  // بلا نوعٍ ناقص لا شيء يُضاف — ويبقى هذا صحيحاً في الوضعين. والموزِّع
  // يعطّل الخيار قبل ذلك، فلا يصل إلى هنا أصلاً.
  if (missingTypes.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); setOpen(v); }}>
      {!hideTrigger && (
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-teal-300 text-teal-700 hover:bg-teal-50" data-testid="button-add-case-type">
          <Layers className="w-4 h-4" />
          إضافة نوع حالة
        </Button>
      </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl text-primary">إضافة نوع حالة لنفس المريض</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          بدل فتح ملف جديد لنفس الشخص، يُفعَّل النوع الجديد على ملفه الحالي — فتبقى كل بياناته وأمواله في مكان واحد.
        </p>
        {/* الأطراف والمساند تُوجَّه إلى الطبيب مع الحفظ. والعلاج الطبيعي لا
            يُوجَّه — فالسطر يظهر لهما وحدهما. */}
        {isManufacturing && (
          <p className="text-xs text-primary">
            يُرسَل طلبُ معاينةٍ طبية كاملة إلى الطبيب تلقائياً مع الحفظ — لا حاجة لخطوة أخرى.
          </p>
        )}

        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium">نوع الحالة الجديد</label>
            <Select value={caseType} onValueChange={setCaseType}>
              <SelectTrigger className="mt-1" data-testid="select-case-type">
                <SelectValue placeholder="اختر النوع" />
              </SelectTrigger>
              <SelectContent>
                {missingTypes.map((t) => (
                  <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/*  ══ **تعريفُ البتر يُجمَع هنا** ═══════════════════════════════
              لا بعد الحفظ. فتحُ خيطِ أطرافٍ بلا تعريفِ بترٍ يُنتج ملفّاً
              نصفَ مكتمل يُترك إكمالُه لتعديلٍ لاحقٍ لا يقع. */}
          {isAmputeeCase && (
            <div className="space-y-4 rounded-md border p-3" data-testid="block-add-case-amputation">
              <p className="text-xs text-muted-foreground">
                <b>تعريف البتر مطلوب لفتح حالة الأطراف</b> — عليه يُقاس الجهاز،
                ولا يُحفَظ نصفُ الحالة ليُكمَل لاحقاً.
              </p>
              <AmputationBuilder value={amp} onChange={setAmp} testIdPrefix="add-case" />

              {missingMeasures.length > 0 && (
                <div className="space-y-3 border-t pt-3">
                  <p className="text-xs text-muted-foreground">
                    وينقص ملفَّ المريض ما يلي — الطرفُ يُصنَع عليه:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {missingMeasures.map((f) => (
                      <div key={f} className="space-y-1">
                        <Label className="text-xs">
                          {FIELD_LABELS[f]} <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          value={measures[f] ?? ""}
                          onChange={(e) => setMeasures((m) => ({ ...m, [f]: e.target.value }))}
                          inputMode="numeric"
                          className="bg-white"
                          data-testid={`input-add-case-${f}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {caseType && !isAmputeeCase && (
            <div className="text-xs text-muted-foreground bg-slate-50 border rounded-md px-3 py-2">
              بعد الحفظ ستُفتح لك <b>صفحة الحقول الكاملة</b> للنوع الجديد (كما في تسجيل مريض جديد) لتكمل بقية التفاصيل.
            </div>
          )}
          {isAmputeeCase && (
            <div className="text-xs text-muted-foreground bg-slate-50 border rounded-md px-3 py-2">
              بعد الحفظ ستُفتح لك <b>صفحة الحقول الكاملة</b> لبقية تفاصيل النوع الجديد —
              أمّا تعريف البتر والمقاسات فتُحفَظ الآن مع فتح الحالة.
            </div>
          )}

          {/* Expert assignment happens in the SEPARATE «تخصيص وإسناد خبير»
              registry step (the server ignores expert/date here and creates no
              work order) — asking for them in this dialog misled staff into
              thinking an order was created. */}
          {isManufacturing && (
            <div className="text-xs text-muted-foreground bg-slate-50 border rounded-md px-3 py-2">
              يُفعَّل النوع على الملف الآن. لإسناد الخبير وبدء التصنيع استخدم زر <b>«تخصيص وإسناد خبير»</b> بجانب المريض في سجل المرضى — وتاريخ التسليم يحدّده الخبير عند أخذ القالب.
            </div>
          )}

          <Button className="w-full h-11 font-semibold" disabled={!canSubmit} onClick={() => mutate()} data-testid="button-submit-case-type">
            {isPending ? (<><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جارٍ الإضافة…</>) : "إضافة النوع"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
