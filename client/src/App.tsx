import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { BranchGate, getBranchSession, setBranchSession } from "@/components/BranchGate";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { AiChatDrawer } from "@/components/AiChatDrawer";
import { LanguageProvider, useLanguage } from "@/i18n/LanguageContext";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import PatientsList from "@/pages/PatientsList";
import { useState, useEffect, useRef, lazy, Suspense } from "react";

// Heavy pages — code-split so the main bundle stays small. Each
// chunk only loads when the user navigates to that route, which
// noticeably speeds up the initial paint of Dashboard and Patients
// (the screens most users open first). Only those two entry screens
// (plus NotFound) stay eager — everything else, including the very
// large patient file/registration/edit pages, is fetched on demand.
const CreatePatient = lazy(() => import("@/pages/CreatePatient"));
const PatientDetails = lazy(() => import("@/pages/PatientDetails"));
const EditPatient = lazy(() => import("@/pages/EditPatient"));
const Reports = lazy(() => import("@/pages/Reports"));
const DailyPatientReport = lazy(() => import("@/pages/DailyPatientReport"));
const Branches = lazy(() => import("@/pages/Branches"));
const BranchDetails = lazy(() => import("@/pages/BranchDetails"));
const BranchRevenues = lazy(() => import("@/pages/BranchRevenues"));
const Accounting = lazy(() => import("@/pages/Accounting"));
const Statistics = lazy(() => import("@/pages/Statistics"));
const Surveys = lazy(() => import("@/pages/Surveys"));
const AdminSettings = lazy(() => import("@/pages/AdminSettings"));
const SessionEntry = lazy(() => import("@/pages/SessionEntry"));
const SessionTargets = lazy(() => import("@/pages/SessionTargets"));
const SessionsList = lazy(() => import("@/pages/SessionsList"));
const SessionAnalytics = lazy(() => import("@/pages/SessionAnalytics"));
const FollowUps = lazy(() => import("@/pages/FollowUps"));
const Manufacturing = lazy(() => import("@/pages/Manufacturing"));
const MyExams = lazy(() => import("@/pages/MyExams"));
const MedicalReview = lazy(() => import("@/pages/MedicalReview"));
const PostExamFollowups = lazy(() => import("@/pages/PostExamFollowups"));
const DiscountApprovals = lazy(() => import("@/pages/DiscountApprovals"));
const NoExamReview = lazy(() => import("@/pages/NoExamReview"));
const ReturnedCharges = lazy(() => import("@/pages/ReturnedCharges"));
const PaymentCorrections = lazy(() => import("@/pages/PaymentCorrections"));
const DailyReview = lazy(() => import("@/pages/DailyReview"));
const PatientTrash = lazy(() => import("@/pages/PatientTrash"));
const ManufacturingOrder = lazy(() => import("@/pages/ManufacturingOrder"));
const Notifications = lazy(() => import("@/pages/Notifications"));

function DashboardRoute() {
  const [session, setSession] = useState<{ role?: string } | null>(null);
  
  useEffect(() => {
    const stored = localStorage.getItem("branch_session");
    if (stored) {
      try {
        setSession(JSON.parse(stored));
      } catch {
        setSession(null);
      }
    }
  }, []);
  
  if (session?.role === "reception") {
    return <Redirect to="/patients" />;
  }

  if (session?.role === "surveyor") {
    return <Redirect to="/surveys" />;
  }

  // Prosthetics experts land straight in the manufacturing module.
  if (session?.role === "prosthetics_expert") {
    return <Redirect to="/manufacturing" />;
  }

  // Doctors land on their worklist, not the dashboard: clinical systems put the
  // clinician in front of the queue waiting on them rather than a directory
  // they would have to search.
  if (session?.role === "doctor") {
    return <Redirect to="/my-exams" />;
  }

  return <Dashboard />;
}

// Wrapper for protected routes to ensure clean layout
function Layout({ children }: { children: React.ReactNode }) {
  const { dir } = useLanguage();
  return (
    <div className="flex min-h-screen bg-slate-50/50" dir={dir}>
      <Sidebar />
      <main
        // Mobile: reserve space for the fixed header AND the iOS notch
        // via env(safe-area-inset-top). Desktop overrides with md:pt-6
        // because the desktop sidebar is sticky, not fixed.
        className="flex-1 p-4 pt-[calc(env(safe-area-inset-top)+5rem)] md:pt-6 md:p-8 overflow-y-auto h-screen"
      >
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  //  ══ ربطُ `useAuth()` بمخزن `useBranchSession` المشترك — «بلا خروجٍ
  //  وعودة» تصل الشاشاتِ فعلاً (إصلاحٌ 2026-09-02) ══════════════════════
  //  `useAuth()` تجلب `GET /api/auth/user` عبر react-query (البنيةُ
  //  القائمة التي كانت تُستهلَك هنا أصلاً لبوّابة `isLoading` وحدها) — وهي
  //  تُعيد الجلبَ عند كل تحميلٍ جديد للصفحة (لا كاشَ يعبر إعادة تحميل)
  //  وعند عودة تركيز النافذة (`refetchOnWindowFocus: "always"`، أُضيفت
  //  لهذا الاستعلام بعينه في `hooks/use-auth.ts`). لكنّ نتيجتها لم تكن
  //  تصل الصلاحياتِ الفعليةَ التي تقرؤها الشاشاتُ
  //  (`useBranchSession`/`usePermissions`، `components/BranchGate.tsx`) —
  //  فهذا الأثرُ هو الجسرُ الوحيد بينهما: كلَّ مرّةٍ يتغيّر فيها `user`،
  //  تُكتب صلاحياتُه ودورُه وحالتُه الإداريّة على المخزن المشترك، فيراها
  //  كلُّ مستهلكٍ فوراً بإعادة عرضٍ واحدة — بلا خروجٍ وعودة، وبلا نداءِ
  //  شبكةٍ ثانٍ (`BranchGate.tsx` لا تجلب شيئاً بنفسها بعد اليوم).
  //
  //  **و`user === null` بعد جلسةٍ كانت قائمة تعني جلسةً ميتة**: صفُّ
  //  المستخدم حُذف أو عُطِّل (تحصينُ المِعترِضة الحيّة في `server/routes.ts`)
  //  — فتُمسَح الجلسةُ المحليّة فوراً، وتعرض `BranchGate` شاشةَ الدخول
  //  مباشرةً بلا انتظار طلبٍ آخر يرتطم بالمِعترِضة. ونوعُ `user` هنا
  //  (`@shared/models/auth`) لقطةٌ من مخطّط Replit Auth القديم لا يطابق
  //  الشكلَ الفعليّ الذي تُرجعه هذه النقطةُ اليوم (`role`/`branchId`/
  //  `isAdmin`/`permissions`…) — تناقضٌ سابقٌ لهذا الإصلاح في `use-auth.ts`
  //  نفسِه، فيُقرأ هنا بمرونةٍ (`as any`) بدل توسيع ذلك النوع في مهمّةٍ
  //  مركَّزة على الصلاحيات لا على تصحيح الأنواع.
  //  ══ وتحديثُ الاستعلاماتِ المخبَّأة عند تغيّر لقطة الصلاحيات (إصلاحٌ
  //  2026-09-03) ══════════════════════════════════════════════════════════
  //  سريانُ الصلاحية فوراً على `useBranchSession`/`usePermissions` (أعلاه)
  //  لا يكفي وحده: صفحةٌ مفتوحةٌ بالفعل تحمل نتيجةَ `useQuery` **مخبَّأةً**
  //  من طلبٍ سابق بالشكل القديم — فمنحُ `canViewPayments` حيّاً لا يُظهر
  //  عمودَ المدفوعات في صفٍّ عُرض قبل المنح إلا بإعادة جلبٍ فعلية. فيُقارَن
  //  اللقطُ السابقُ بالجديد في `prevPermSnapshotRef`، وتُبطَل عائلاتُ
  //  الاستعلامات ذاتُ الصلة **فقط** — لا الذاكرةُ كلُّها، ولا آليّةَ شبكةٍ
  //  أو جلسةٍ جديدة (نفسُ `queryClient` المستعمَل في كل مكان).
  const prevPermSnapshotRef = useRef<{
    isAdmin: boolean;
    canViewPatients: boolean;
    canViewPayments: boolean;
    canViewReports: boolean;
  } | null>(null);

  useEffect(() => {
    if (isLoading) return;
    const raw = user as any;
    //  **`null` صريحةٌ لا `undefined`**: `fetchUser` (`use-auth.ts`) تُعيد
    //  `null` **فقط** حين يردّ `/api/auth/user` ٤٠١ حقيقياً — أيّ فشلٍ آخر
    //  (شبكةٌ، ٥٠٠، مهلة) يرمي فيبقى `user` بقيمته السابقة أو `undefined`
    //  دون أن يُصبح `null` أبداً. فالمسحُ هنا مشروطٌ بـ`=== null` تحديداً:
    //  عطلٌ عابر في هذا النداء يجب ألّا يُخرج مستخدماً لديه جلسةٌ محليّة
    //  صالحة فعلاً — ذاك تشاؤمٌ لا يوازيه خطر (الخادمُ يبقى الحارسَ الحقيقيّ
    //  لأيّ طلبٍ فعليّ لاحق، عبر مِعترِضة `server/routes.ts`).
    if (raw === null) {
      setBranchSession(null);
      //  خروجٌ فعليّ أو جلسةٌ ماتت — لا لقطةَ سابقةً تُقارَن بها لقطةُ
      //  حسابٍ آخر يدخل لاحقاً على هذا المتصفّح نفسِه.
      prevPermSnapshotRef.current = null;
      return;
    }
    if (!raw) return; // `undefined` — لم يُحسَم بعد أو فشل النداءُ عرَضاً؛ لا تغيير.
    //  **دمجٌ لا كتابةٌ فوق**: `/api/auth/user` لا تُرجع `branchName` ولا
    //  `accessibleBranches` (ليستا من مسؤوليتها) — فتُستبقيان من الجلسة
    //  المحفوظة (تسجيلُ الدخول أو تبديلُ الفرع)، وإلّا محا كلَّ تركيزٍ على
    //  النافذة اسمَ الفرع المعروض في `Sidebar.tsx` وغيره.
    const current = getBranchSession();
    setBranchSession({
      ...current,
      branchId: raw.branchId,
      isAdmin: Boolean(raw.isAdmin),
      userId: raw.id ?? current?.userId,
      role: raw.role ?? current?.role,
      displayName: raw.displayName ?? current?.displayName,
      permissions: raw.permissions ?? current?.permissions,
      shift: raw.shift ?? current?.shift,
      language: raw.language ?? current?.language,
    } as any);

    //  ══ اللقطةُ الحاليّة — نفسُ صيغة `isAdmin || العَلَم` التي يفرضها
    //  الخادمُ على كل نقطةٍ مسَّتها هذه الجولة ═══════════════════════════
    const nextPermSnapshot = {
      isAdmin: Boolean(raw.isAdmin),
      canViewPatients: Boolean(raw.isAdmin) || Boolean(raw.permissions?.canViewPatients),
      canViewPayments: Boolean(raw.isAdmin) || Boolean(raw.permissions?.canViewPayments),
      canViewReports: Boolean(raw.isAdmin) || Boolean(raw.permissions?.canViewReports),
    };
    const prevPermSnapshot = prevPermSnapshotRef.current;
    //  لا مقارنةَ عند أوّل تحليلٍ ناجح (لا سابقةَ ذات معنى) — الإبطالُ
    //  عند **تغيّرٍ فعليّ** فقط، لا عند كل تحديثٍ حتى لو بلا تغيير.
    if (prevPermSnapshot) {
      //  ١) مرضى/دفعات: يمسّ شكلَ ردّ `GET /api/patients` و`/registry`
      //  و`/:id` (و`/:id/cases` تحت المفتاح نفسِه) — راجع الأقسام ز/ح أعلاه.
      const patientOrPaymentViewChanged =
        prevPermSnapshot.canViewPatients !== nextPermSnapshot.canViewPatients
        || prevPermSnapshot.canViewPayments !== nextPermSnapshot.canViewPayments
        || prevPermSnapshot.isAdmin !== nextPermSnapshot.isAdmin;
      if (patientOrPaymentViewChanged) {
        queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
        queryClient.invalidateQueries({ queryKey: ["/api/patients/registry"] });
        //  مفتاحٌ منفصل فعلياً (`"/api/patients/:id"` حرفياً، لا بادئةً
        //  نصّية لـ`"/api/patients"`) — يغطّي `GET /api/patients/:id` نفسَها
        //  و`GET /api/patients/:id/cases` معاً (`PatientDetails.tsx` سطر ١٩٢).
        queryClient.invalidateQueries({ queryKey: ["/api/patients/:id"] });
      }
      //  ٢) تقارير/إحصاءات: نفسُ الأبواب الأربعة المحروسة بـ`canViewReports`
      //  زائداً البابَ الخامسَ المشترك مع المحاسبة (القسم ط أعلاه).
      const reportsViewChanged =
        prevPermSnapshot.canViewReports !== nextPermSnapshot.canViewReports
        || prevPermSnapshot.isAdmin !== nextPermSnapshot.isAdmin;
      if (reportsViewChanged) {
        queryClient.invalidateQueries({ queryKey: ["/api/reports/detailed"] });
        queryClient.invalidateQueries({ queryKey: ["/api/reports/daily-patient-report"] });
        queryClient.invalidateQueries({ queryKey: ["/api/statistics/visits-by-treatment"] });
        queryClient.invalidateQueries({ queryKey: ["/api/statistics/monthly-new-patients"] });
        queryClient.invalidateQueries({ queryKey: ["/api/statistics/revenue-by-treatment"] });
      }
    }
    prevPermSnapshotRef.current = nextPermSnapshot;
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <BranchGate>
      <Layout>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          }
        >
          <Switch>
            <Route path="/" component={DashboardRoute} />
            <Route path="/patients" component={PatientsList} />
            <Route path="/patients/new" component={CreatePatient} />
            <Route path="/patients/:id/edit" component={EditPatient} />
            <Route path="/patients/:id" component={PatientDetails} />
            <Route path="/follow-ups" component={FollowUps} />
            <Route path="/post-exam-followups" component={PostExamFollowups} />
            <Route path="/discount-approvals" component={DiscountApprovals} />
            <Route path="/no-exam-review" component={NoExamReview} />
            <Route path="/returned-charges" component={ReturnedCharges} />
            {/* اعتمادٌ ورفضٌ للمسؤول العام، مع عنصر شريطٍ جانبيّ وشارة
                عددٍ (`Sidebar.tsx`) — أُكملت الواجهةُ في 2026-08-30. */}
            <Route path="/payment-corrections" component={PaymentCorrections} />
            {/* سردٌ إشرافيٌّ للقراءة فقط — بلا أفعال. راجع server/daily_review/store.ts. */}
            <Route path="/daily-review" component={DailyReview} />
            <Route path="/patient-trash" component={PatientTrash} />
            <Route path="/my-exams" component={MyExams} />
            <Route path="/medical-review" component={MedicalReview} />
            <Route path="/manufacturing" component={Manufacturing} />
            <Route path="/manufacturing/orders/:id" component={ManufacturingOrder} />
            <Route path="/notifications" component={Notifications} />
            <Route path="/reports" component={Reports} />
            <Route path="/reports/daily-patients" component={DailyPatientReport} />
            <Route path="/revenues" component={BranchRevenues} />
            <Route path="/branches" component={Branches} />
            <Route path="/branches/:id" component={BranchDetails} />
            <Route path="/statistics" component={Statistics} />
            <Route path="/accounting" component={Accounting} />
            <Route path="/surveys" component={Surveys} />
            <Route path="/session-tracking/entry" component={SessionEntry} />
            <Route path="/session-tracking/targets" component={SessionTargets} />
            <Route path="/session-tracking/list" component={SessionsList} />
            <Route path="/session-tracking/analytics" component={SessionAnalytics} />
            <Route path="/admin" component={AdminSettings} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </Layout>
      <AiChatDrawer />
    </BranchGate>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <PWAInstallPrompt />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
