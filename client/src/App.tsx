import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import PatientsList from "@/pages/PatientsList";
import CreatePatient from "@/pages/CreatePatient";
import PatientDetails from "@/pages/PatientDetails";
import Reports from "@/pages/Reports";

// Wrapper for protected routes to ensure clean layout
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50/50" dir="rtl">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto h-screen">
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

  if (!user) {
    // Redirect logic handled by backend auth usually, but here we can show a welcome/login screen
    // For now, let's assume auth redirect happens automatically or show a simple login button
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4" dir="rtl">
        <h1 className="text-3xl font-display font-bold text-primary">المركز الطبي</h1>
        <p className="text-slate-600 mb-4">يرجى تسجيل الدخول للمتابعة</p>
        <a href="/api/login" className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg">
          تسجيل الدخول
        </a>
      </div>
    );
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/patients" component={PatientsList} />
        <Route path="/patients/new" component={CreatePatient} />
        <Route path="/patients/:id" component={PatientDetails} />
        <Route path="/reports" component={Reports} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
