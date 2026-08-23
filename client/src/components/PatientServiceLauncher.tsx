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
import { VisitModal } from "./VisitModal";
import { NewDeviceEpisodeModal } from "./NewDeviceEpisodeModal";
import {
  launcherOptions, GROUP_LABELS,
  type LauncherGroup, type LauncherOption, type ServiceFlow,
} from "./patient_service_launcher_logic";
import {
  saveDeviceFlowResume, takeDeviceFlowResume, clearDeviceFlowResume, sessionResumeStore,
} from "./device_flow_resume";

// موزِّع خدمات المريض — **باب واحد إلى المسارات القائمة**.
//
// ══ ما تغيّر وما لم يتغيّر ══════════════════════════════════════════════
// كان قرب سجلّ الزيارات ثلاثة أزرار: «تسجيل زيارة» و«إضافة خدمة جديدة»
// و«إضافة نوع حالة». والاثنان الأخيران يقولان للموظّف الشيء نفسه تقريباً
// ولا يفرّقهما إلا من يعرف الفرق الداخلي بين **فتح خيط اختصاص** و**قيدٍ
// مالي على خيطٍ قائم**. فصارا زرّاً واحداً ونافذةً تسمّي الخدمات بأسمائها
// التي يعرفها الموظّف.
//
// **ولم يتغيّر في الخلفية حرف**: هذا توحيد لنقطة الدخول في الواجهة لا
// توحيد للمنطق. كلّ خيار يفتح **المكوّن القائم نفسه** بمساره ونقطته
// وتحقّقاته ومحاسبته — ولا نقطة «خدمة عامّة» تجمع الحالات والخدمات
// والتصنيع والصيانة، فتلك واحدة تُخفي أربع قواعد مختلفة.
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
}

//  ترتيبُ الأقسام الثلاثة على الشاشة — **ولا رابعَ بعدها**.
const GROUP_ORDER: LauncherGroup[] = ["prosthetic", "medical_support", "physiotherapy"];

export function PatientServiceLauncher({ patient }: PatientServiceLauncherProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  /** المسار المفتوح الآن — واحدٌ لا أكثر. */
  const [flow, setFlow] = useState<ServiceFlow | null>(null);
  const [, setLocation] = useLocation();
  /** الجزءُ المستأنَف بعد العودة من «تعديل مريض» — يُملأ من التخزين لا غير. */
  const [resumeItem, setResumeItem] = useState<string>("");

  // ══ **العودةُ من «تعديل مريض» تُستأنف حيث تُرك المسار** ═════════════════
  //  حفظُ التعديل يغيّر المسار، فتُفكَّك الصفحةُ والموزِّعُ والنافذةُ معاً.
  //  فاللقطةُ في `sessionStorage` لا في `useState` — وتُقرأ مرّةً واحدة عند
  //  التركيب ثمّ تُمسَح، فلا تلاحق الموظّفَ نافذةٌ في كلّ تحميل.
  useEffect(() => {
    const resume = takeDeviceFlowResume(sessionResumeStore(), patient.id);
    if (!resume) return;
    setResumeItem(resume.requestedItem);
    setFlow({ kind: "device_episode", serviceType: resume.serviceType });
  }, [patient.id]);

  // حلقات المريض — تُقرأ لتعطيل «جهاز جديد» بسببٍ مفهوم حين يكون له طلبٌ
  // قائم. والخادم يبقى صاحب القرار: يردّ 409 على السباق مهما قالت الواجهة.
  const { data: episodeData } = useQuery<{ episodes: { serviceType: string; status: string }[] }>({
    queryKey: [`/api/patients/${patient.id}/device-episodes`],
    enabled: Boolean(patient.isAmputee || patient.isMedicalSupport),
  });

  const options = launcherOptions({ ...patient, episodes: episodeData?.episodes ?? [] });

  function choose(option: LauncherOption) {
    if (option.disabled) return;
    // تُغلَق نافذة الاختيار أوّلاً ثم تُفتح نافذة المسار: نافذتان فوق
    // بعضهما تتنازعان حبس التركيز فتبقى الثانية غير قابلة للكتابة.
    setPickerOpen(false);
    //  اختيارٌ جديد بيدِ الموظّف ⟶ لا استئنافَ قديمٌ يملأ القائمة.
    setResumeItem("");
    setFlow(option.flow);
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

  return (
    <>
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
                        disabled={option.disabled}
                        onClick={() => choose(option)}
                        data-testid={`service-option-${option.id}`}
                        className="w-full text-right rounded-lg border px-3 py-2.5 transition-colors
                          enabled:hover:bg-slate-50 enabled:hover:border-primary/40
                          disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-50"
                      >
                        <div className="text-sm font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {option.disabled ? option.disabledReason : option.description}
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
          onEditPatient={(requestedItem) =>
            editPatientAndResume(flow.serviceType, requestedItem)}
        />
      )}

      {flow?.kind === "maintenance_visit" && (
        <VisitModal
          patientId={patient.id}
          branchId={patient.branchId}
          isPhysiotherapy={!!patient.isPhysiotherapy}
          isAmputee={!!patient.isAmputee}
          isMedicalSupport={!!patient.isMedicalSupport}
          open
          onOpenChange={closeFlow}
          initialPurpose="maintenance"
          initialMaintServiceType={flow.serviceType}
          hideTrigger
        />
      )}
    </>
  );
}
