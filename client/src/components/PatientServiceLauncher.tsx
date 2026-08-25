import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { AddCaseTypeModal } from "./AddCaseTypeModal";
import { NewServiceModal } from "./NewServiceModal";
import { NewDeviceEpisodeModal } from "./NewDeviceEpisodeModal";
import { NoExamOperationDialog } from "./NoExamOperationDialog";
import {
  launcherOptions, resumableNoExamSale, GROUP_LABELS,
  type LauncherGroup, type LauncherOption, type PatientEpisodeSummary,
  type ServiceFlow,
} from "./patient_service_launcher_logic";
import {
  saveDeviceFlowResume, takeDeviceFlowResume, clearDeviceFlowResume, sessionResumeStore,
} from "./device_flow_resume";
import {
  RECEPTION_ROUTING_QUESTION, receptionRoutingGroups, takeReceptionRoutingPending,
} from "./reception_routing";

// موزِّع خدمات المريض — **بابان لا أكثر**.
//
// ══ البابان ═════════════════════════════════════════════════════════════
// **«ما سبب حضور المريض اليوم؟»** — كلُّ عمليات الأطراف والمساند: معاينة،
//   بيعُ جزء، صيانة. يُفتَح تلقائياً مرّةً بعد التسجيل، ومن زرّ رأس صفحة
//   المريض، ومن رابطٍ داخل «إضافة خدمة جديدة».
// **«إضافة خدمة جديدة»** — ما يُضاف إلى الملفّ نفسِه: فتحُ خيط اختصاصٍ لم
//   يُفتَح بعد، وجلساتٌ إضافية، واستشارة، وخدمةٌ أخرى.
//
// وكانت القائمةُ الثانية تحمل ستّةَ أبوابٍ موازيةٍ للأولى (جهازٌ جديد،
// صيانة، بيعٌ بلا معاينة — لكلّ قسم)، ونافذةُ الزيارة تحمل بابَ صيانةٍ
// سابعاً. فصار للعملية الواحدة أربعةُ مداخل بسلوكٍ مختلف، ويختار الموظّفُ
// بالعادة لا بالمعنى. **فبقي بابٌ واحد لعمليات الأجهزة.**
//
// **ولم يُحذف في الخلفية حرف**: النقاط القائمة كما هي بحدودها وتحقّقاتها —
// الشاشةُ توقّفت عن تكرارها فحسب.
//
// ══ ولا منطق عمل هنا ════════════════════════════════════════════════════
// هذا الملفّ **لا ينادي نقطة نهاية واحدة**: لا `fetch` ولا `apiRequest`
// ولا `useMutation`. يختار المستخدم فتُفتح النافذة المسؤولة، وهي التي
// تنادي كما كانت تنادي دائماً. وقرار التوزيع نفسه في
// `patient_service_launcher_logic.ts` — خالصاً ومُختبَراً.

interface PatientServiceLauncherProps {
  patient: {
    id: number;
    branchId: number;
    totalCost?: number | null;
    isAmputee?: boolean | null;
    isPhysiotherapy?: boolean | null;
    isMedicalSupport?: boolean | null;
    //  تُمرَّر إلى «إضافة نوع حالة» فتسأل عمّا ينقص وحده — والمكتوبُ على
    //  الملفّ لا يُسأل عنه ثانيةً.
    age?: string | null;
    height?: string | null;
    weight?: string | null;
  };
  /**
   * فتحُ مُوجِّه «سبب الحضور» **من خارج المكوّن** — زرُّ رأس صفحة المريض.
   *
   * ونفسُ نمط `VisitModal` و`NewServiceModal` حرفاً: بلا هذه الخاصّية يبقى
   * الفتحُ الداخليّ (بعد التسجيل، ومن الرابط داخل «إضافة خدمة جديدة»)
   * عاملاً كما هو. **ولا نسخةَ ثانية من الحوار تُبنى في الصفحة** — الحوارُ
   * هذا بعينه، وحالتُه واحدة.
   */
  routingOpen?: boolean;
  onRoutingOpenChange?: (open: boolean) => void;
}

//  ترتيبُ الأقسام الثلاثة على الشاشة — **ولا رابعَ بعدها**.
const GROUP_ORDER: LauncherGroup[] = ["prosthetic", "medical_support", "physiotherapy"];

export function PatientServiceLauncher({
  patient, routingOpen: routingOpenProp, onRoutingOpenChange,
}: PatientServiceLauncherProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  /** مُوجِّهُ «ما سبب حضور المريض اليوم؟» — بحالةٍ داخلية ما لم تُدَر من الخارج. */
  const [routingOpenSelf, setRoutingOpenSelf] = useState(false);
  const routingControlled = routingOpenProp !== undefined;
  const routingOpen = routingControlled ? routingOpenProp : routingOpenSelf;
  const setRoutingOpen = (v: boolean) => {
    if (!routingControlled) setRoutingOpenSelf(v);
    onRoutingOpenChange?.(v);
  };
  /** المسار المفتوح الآن — واحدٌ لا أكثر. */
  const [flow, setFlow] = useState<ServiceFlow | null>(null);
  const [, setLocation] = useLocation();
  /** الجزءُ المستأنَف بعد العودة من «تعديل مريض» — يُملأ من التخزين لا غير. */
  const [resumeItem, setResumeItem] = useState<string>("");

  // ══ **العودةُ من «تعديل مريض» تُستأنف حيث تُرك المسار** ═════════════════
  //  حفظُ التعديل يغيّر المسار، فتُفكَّك الصفحةُ والموزِّعُ والنافذةُ معاً.
  //  فاللقطةُ في `sessionStorage` لا في `useState` — وتُقرأ مرّةً واحدة عند
  //  التركيب ثمّ تُمسَح، فلا تلاحق الموظّفَ نافذةٌ في كلّ تحميل.
  //
  //  **والقسمُ وما طُلب وحدهما** يُستأنفان: مسارُ النافذة `"exam"` ثابتٌ
  //  فلا شيءَ فيه يُحفَظ ولا يُستعاد.
  useEffect(() => {
    const resume = takeDeviceFlowResume(sessionResumeStore(), patient.id);
    if (!resume) return;
    setResumeItem(resume.requestedItem);
    setFlow({ kind: "device_episode", serviceType: resume.serviceType });
  }, [patient.id]);

  //  أقسامُ الأجهزة التي يملكها المريض — **كلُّها**، بلا تفضيلٍ صامت
  //  للأطراف. وفارغةٌ لمريض العلاج الطبيعي وحده، فلا مُوجِّه له إطلاقاً.
  const routingSections = receptionRoutingGroups(patient);
  const hasRouting = routingSections.length > 0;

  // ══ **المُوجِّهُ يُفتَح مرّةً واحدة بعد التسجيل مباشرةً** ═════════════════
  //  العلمُ في `sessionStorage`، ونفسُ نمط الاستئناف أعلاه: القراءةُ تمسح
  //  دائماً، فتحديثُ الصفحة أو فتحُ مريضٍ آخر بعده لا يعيد فتحه.
  useEffect(() => {
    if (!hasRouting) return;
    const pending = takeReceptionRoutingPending(sessionResumeStore(), patient.id);
    if (pending) setRoutingOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id, hasRouting]);

  // حلقات المريض — تُقرأ لاستئناف بيعٍ بلا معاينة بقي ناقصاً. والخادم يبقى
  // صاحب القرار: يردّ 409 على السباق مهما قالت الواجهة.
  const { data: episodeData } = useQuery<{ episodes: PatientEpisodeSummary[] }>({
    queryKey: [`/api/patients/${patient.id}/device-episodes`],
    enabled: Boolean(patient.isAmputee || patient.isMedicalSupport),
  });

  const options = launcherOptions(patient);

  /** فتحُ مسارٍ — من القائمة الكاملة أو من مُوجِّه «سبب الحضور»، سيّان. */
  function chooseFlow(newFlow: ServiceFlow) {
    // تُغلَق نوافذُ الاختيار أوّلاً ثم تُفتح نافذة المسار: نافذتان فوق
    // بعضهما تتنازعان حبس التركيز فتبقى الثانية غير قابلة للكتابة.
    setPickerOpen(false);
    setRoutingOpen(false);
    //  اختيارٌ جديد بيدِ الموظّف ⟶ لا استئنافَ قديمٌ يملأ القائمة.
    setResumeItem("");
    setFlow(newFlow);
  }

  function choose(option: LauncherOption) {
    chooseFlow(option.flow);
  }

  function closeFlow(open: boolean) {
    if (open) return;
    setFlow(null);
    setResumeItem("");
    //  إغلاقٌ بيدِ الموظّف قرارٌ صريح — فلا تُفتح النافذةُ عليه ثانيةً
    //  بلقطةٍ بقيت من محاولةٍ سابقة.
    clearDeviceFlowResume(sessionResumeStore());
  }

  /**
   * **«تغيير سبب الحضور»** — من نافذة «جهاز جديد».
   *
   * تُغلق النافذةَ **بنفس منطق الإغلاق العاديّ** (بلا فتح ولا إلغاء أيّ
   * حلقة — لا نداءَ شبكةٍ هنا إطلاقاً) ثمّ تعيد فتح المُوجِّه نفسَه.
   */
  function changeReceptionRoutingReason() {
    closeFlow(false);
    setRoutingOpen(true);
  }

  /**
   * **نقصُ الملفّ ⟶ شاشةُ التعديل القائمة، والاختيارُ محفوظ.**
   *
   * ولا شاشةَ تعديلٍ ثانية تُخترَع: المسارُ `/patients/:id/edit` نفسُه الذي
   * يفتحه زرُّ «تعديل» في رأس الصفحة — بفرعه إن جاء الموظّفُ من فرع، فحفظُ
   * التعديل يعيده إلى `/patients/:id` حيث يُستأنَف الطلب.
   */
  function editPatientAndResume(
    serviceType: "prosthetic" | "medical_support", requestedItem: string,
  ) {
    saveDeviceFlowResume(sessionResumeStore(), {
      patientId: patient.id, serviceType, requestedItem,
    });
    setFlow(null);
    const branch = typeof window === "undefined"
      ? null : new URLSearchParams(window.location.search).get("branch");
    setLocation(`/patients/${patient.id}/edit${branch ? `?branch=${branch}` : ""}`);
  }

  //  ══ **بيعٌ بلا معاينة بقي ناقصاً — يُستأنَف هو بعينه** ═════════════════
  //  حلقةٌ `awaiting_exam` بمسار `no_exam` تعني عمليةً فُتحت ولم تُكمَل:
  //  بلا سعرٍ ولا خبيرٍ ولا أمر تصنيع. فتُفتَح النافذةُ **عليها** فتُكمِلها،
  //  ولا تُنشأ ثانيةٌ فوقها. والمطلوبُ يُقرأ من صفّها لا يُخمَّن.
  const saleResume = flow?.kind === "no_exam_operation" && flow.initialKind === "device_sale"
    ? resumableNoExamSale(episodeData?.episodes, flow.serviceType)
    : null;

  return (
    <>
      {/*  ══ **«ما سبب حضور المريض اليوم؟»** ═══════════════════════════════
          بابُ عمليات الأجهزة الوحيد. يُفتَح تلقائياً مرّةً بعد تسجيل مريض
          أطرافٍ أو مسانِد جديد، ومن زرّ رأس الصفحة، ومن الرابط داخل «إضافة
          خدمة جديدة» — **وكلُّها تفتح هذا الحوار بعينه**، لا نسخةً ثانية. */}
      {hasRouting && (
        <Dialog open={routingOpen} onOpenChange={setRoutingOpen}>
          <DialogContent className="sm:max-w-[480px]" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl text-primary">
                {RECEPTION_ROUTING_QUESTION}
              </DialogTitle>
            </DialogHeader>
            {/*  **وصاحبُ القسمين يرى قسميه معاً مجموعَين** — ولا يُخمَّن له
                قسمٌ ولا يُعرَض أحدُهما وحده. وصاحبُ قسمٍ واحد يرى خياراته
                الثلاثة مباشرةً بلا عنوانٍ زائد لا يفصل شيئاً. */}
            <div className="grid gap-4 mt-2">
              {routingSections.map((section) => (
                <div key={section.serviceType} className="grid gap-2">
                  {routingSections.length > 1 && (
                    <h4 className="text-xs font-semibold text-muted-foreground"
                      data-testid={`reception-routing-group-${section.serviceType}`}>
                      {section.label}
                    </h4>
                  )}
                  {section.choices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => chooseFlow(choice.flow)}
                      data-testid={`reception-routing-${section.serviceType}-${choice.id}`}
                      className="w-full text-right rounded-lg border px-3 py-2.5 transition-colors
                        hover:bg-slate-50 hover:border-primary/40"
                    >
                      <div className="text-sm font-medium">{choice.label}</div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
            data-testid="button-new-service"
          >
            <RefreshCcw className="w-4 h-4" />
            إضافة خدمة جديدة
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[560px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl text-primary">إضافة خدمة جديدة</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            اختر الخدمة، وتُفتح لك نافذتها المعتادة مباشرةً.
          </p>

          {/*  **وعملياتُ الأجهزة بابُها المُوجِّه** — رابطٌ يفتحه هو بعينه،
              لا قائمةً موازية تكرّر خياراته. */}
          {hasRouting && (
            <button
              type="button"
              onClick={() => { setPickerOpen(false); setRoutingOpen(true); }}
              data-testid="link-reception-routing"
              className="text-xs text-primary underline underline-offset-2 -mt-2 text-right w-fit"
            >
              {RECEPTION_ROUTING_QUESTION}
            </button>
          )}

          <div className="space-y-4 mt-2">
            {GROUP_ORDER.map((group) => {
              const groupOptions = options.filter((o) => o.group === group);
              if (groupOptions.length === 0) return null;
              return (
                <div key={group}>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                    {GROUP_LABELS[group]}
                  </h4>
                  <div className="grid gap-2">
                    {groupOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => choose(option)}
                        data-testid={`service-option-${option.id}`}
                        className="w-full text-right rounded-lg border px-3 py-2.5 transition-colors
                          hover:bg-slate-50 hover:border-primary/40"
                      >
                        <div className="text-sm font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {option.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* المسارات القائمة — تُركَّب عند اختيارها وحدها، فلا نوافذ خاملة
          تستطلع الخادم ولا حالة قديمة تعلق من اختيارٍ سابق. */}
      {flow?.kind === "case_type" && (
        <AddCaseTypeModal
          patient={patient}
          open
          onOpenChange={closeFlow}
          initialCaseType={flow.caseType}
          hideTrigger
        />
      )}

      {flow?.kind === "new_service" && (
        <NewServiceModal
          patientId={patient.id}
          branchId={patient.branchId}
          currentTotalCost={patient.totalCost || 0}
          open
          onOpenChange={closeFlow}
          initialServiceType={flow.serviceType}
          hideTrigger
        />
      )}

      {flow?.kind === "device_episode" && (
        <NewDeviceEpisodeModal
          patientId={patient.id}
          serviceType={flow.serviceType}
          open
          onOpenChange={closeFlow}
          initialRequestedItem={resumeItem}
          onChangeReason={changeReceptionRoutingReason}
          onEditPatient={(requestedItem) =>
            editPatientAndResume(flow.serviceType, requestedItem)}
        />
      )}

      {/*  **بلا معاينة** (ترحيل ٠٦٧) — العملُ يُنجَز والمبلغُ ينتظر. */}
      {flow?.kind === "no_exam_operation" && (
        <NoExamOperationDialog
          patientId={patient.id}
          branchId={patient.branchId}
          serviceType={flow.serviceType}
          initialKind={flow.initialKind}
          existingEpisodeId={saleResume?.episodeId ?? null}
          existingRequestedItem={saleResume?.requestedItem ?? null}
          open
          onOpenChange={closeFlow}
        />
      )}
    </>
  );
}
