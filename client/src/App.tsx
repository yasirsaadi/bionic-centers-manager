import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { BranchGate } from "@/components/BranchGate";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { AiChatDrawer } from "@/components/AiChatDrawer";
import { LanguageProvider, useLanguage } from "@/i18n/LanguageContext";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import PatientsList from "@/pages/PatientsList";
import { useState, useEffect, lazy, Suspense } from "react";

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
            {/* عرضٌ فقط — بلا اعتماد/رفض بعد. لا عنصرَ شريطٍ جانبيّ ولا
                شارةَ عددٍ لهذه المرحلة (المهمّةُ تحظرهما صراحةً). */}
            <Route path="/payment-corrections" component={PaymentCorrections} />
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
