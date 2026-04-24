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
import { LanguageProvider, useLanguage } from "@/i18n/LanguageContext";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import PatientsList from "@/pages/PatientsList";
import CreatePatient from "@/pages/CreatePatient";
import PatientDetails from "@/pages/PatientDetails";
import EditPatient from "@/pages/EditPatient";
import Reports from "@/pages/Reports";
import DailyPatientReport from "@/pages/DailyPatientReport";
import Branches from "@/pages/Branches";
import BranchDetails from "@/pages/BranchDetails";
import BranchRevenues from "@/pages/BranchRevenues";
import Statistics from "@/pages/Statistics";
import Accounting from "@/pages/Accounting";
import AdminSettings from "@/pages/AdminSettings";
import Surveys from "@/pages/Surveys";
import { useState, useEffect } from "react";

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
  
  return <Dashboard />;
}

// Wrapper for protected routes to ensure clean layout
function Layout({ children }: { children: React.ReactNode }) {
  const { dir } = useLanguage();
  return (
    <div className="flex min-h-screen bg-slate-50/50" dir={dir}>
      <Sidebar />
      <main className="flex-1 p-4 pt-20 md:pt-6 md:p-8 overflow-y-auto h-screen">
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
        <Switch>
          <Route path="/" component={DashboardRoute} />
          <Route path="/patients" component={PatientsList} />
          <Route path="/patients/new" component={CreatePatient} />
          <Route path="/patients/:id/edit" component={EditPatient} />
          <Route path="/patients/:id" component={PatientDetails} />
          <Route path="/reports" component={Reports} />
          <Route path="/reports/daily-patients" component={DailyPatientReport} />
          <Route path="/revenues" component={BranchRevenues} />
          <Route path="/branches" component={Branches} />
          <Route path="/branches/:id" component={BranchDetails} />
          <Route path="/statistics" component={Statistics} />
          <Route path="/accounting" component={Accounting} />
          <Route path="/surveys" component={Surveys} />
          <Route path="/admin" component={AdminSettings} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </BranchGate>
  );

  return (
    <BranchGate>
      <Layout>
        <Switch>
          <Route path="/" component={DashboardRoute} />
          <Route path="/patients" component={PatientsList} />
          <Route path="/patients/new" component={CreatePatient} />
          <Route path="/patients/:id/edit" component={EditPatient} />
          <Route path="/patients/:id" component={PatientDetails} />
          <Route path="/reports" component={Reports} />
          <Route path="/reports/daily-patients" component={DailyPatientReport} />
          <Route path="/revenues" component={BranchRevenues} />
          <Route path="/branches" component={Branches} />
          <Route path="/branches/:id" component={BranchDetails} />
          <Route path="/statistics" component={Statistics} />
          <Route path="/accounting" component={Accounting} />
          <Route path="/surveys" component={Surveys} />
          <Route path="/admin" component={AdminSettings} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
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
