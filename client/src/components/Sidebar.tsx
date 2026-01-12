import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, UserPlus, LogOut, Activity, FileBarChart, Building2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { clearBranchSession } from "@/components/BranchGate";
import { useState, useEffect } from "react";

interface BranchSession {
  branchId: number;
  branchName: string;
  isAdmin: boolean;
}

export function Sidebar() {
  const [location] = useLocation();
  const { logout } = useAuth();
  const [branchSession, setBranchSession] = useState<BranchSession | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("branch_session");
    if (stored) {
      try {
        setBranchSession(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  const menuItems = [
    { label: "لوحة التحكم", icon: LayoutDashboard, href: "/" },
    { label: "سجل المرضى", icon: Users, href: "/patients" },
    { label: "إضافة مريض", icon: UserPlus, href: "/patients/new" },
    { label: "التقارير المالية", icon: FileBarChart, href: "/reports" },
    { label: "الفروع", icon: Building2, href: "/branches" },
  ];

  return (
    <aside className="hidden md:flex flex-col w-72 bg-white border-l border-border h-screen sticky top-0 shadow-lg z-20">
      <div className="p-6 flex items-center gap-3 border-b border-border/50">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-primary/30 shadow-lg">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-display font-bold text-lg text-primary leading-tight">مركز بايونك</h1>
          <p className="text-xs text-muted-foreground font-body">للأطراف الصناعية والعلاج الطبيعي</p>
        </div>
      </div>

      <nav className="flex-1 p-6 space-y-2">
        {menuItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-medium text-base group",
              isActive 
                ? "bg-primary/10 text-primary shadow-sm" 
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}>
              <item.icon className={cn(
                "w-5 h-5 transition-colors",
                isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
              )} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {branchSession && (
        <div className="px-6 py-4 border-t border-border/50 bg-slate-50/50">
          <div className="flex items-center gap-2 text-sm">
            {branchSession.isAdmin ? (
              <ShieldCheck className="w-4 h-4 text-primary" />
            ) : (
              <Building2 className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="font-medium text-slate-700">{branchSession.branchName}</span>
          </div>
        </div>
      )}

      <div className="p-6 border-t border-border/50">
        <button 
          onClick={() => {
            clearBranchSession();
            logout();
          }}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors duration-200"
          data-testid="button-logout"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
