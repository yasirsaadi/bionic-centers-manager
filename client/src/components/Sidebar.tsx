import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, UserPlus, LogOut, FileBarChart, Building2, ShieldCheck, Menu, X, BarChart3, Calculator, Settings, User, Globe, ClipboardCheck, CalendarDays, Activity, Target, ClipboardList, TrendingUp, PhoneCall, Wrench, Bell, Stethoscope, KeyRound, BadgePercent, Wallet, Undo2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { clearBranchSession } from "@/components/BranchGate";
import { BranchSwitcher } from "@/components/BranchSwitcher";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import logoImage from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/LanguageContext";
import { useLanguage } from "@/i18n/LanguageContext";

interface BranchSession {
  branchId: number;
  branchName: string;
  isAdmin: boolean;
  role?: string;
  displayName?: string;
  accessibleBranches?: number[];
}

interface BranchSettings {
  branchId: number;
  showDashboard: boolean;
  showPatients: boolean;
  showPayments: boolean;
  showAccounting: boolean;
  showStatistics: boolean;
}

export function Sidebar() {
  const [location] = useLocation();
  const { logout } = useAuth();
  const permissions = usePermissions();
  const { t, language } = useTranslation();
  const { setLanguage } = useLanguage();
  const [branchSession, setBranchSession] = useState<BranchSession | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("branch_session");
    if (stored) {
      try {
        setBranchSession(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  // Fetch branch settings
  const { data: branchSettings } = useQuery<BranchSettings>({
    queryKey: ["/api/branch-settings"],
    enabled: !!branchSession,
  });

  // Delivery-alert count for the التنبيهات badge. Light polling keeps the
  // badge honest without hammering the server.
  const alertEligible = !!branchSession && (
    branchSession.isAdmin ||
    permissions.canWorkAsExpert ||
    ["prosthetics_expert", "branch_manager", "reception", "accountant"].includes(branchSession.role ?? "")
  );
  const { data: alertData } = useQuery<{ alertCount: number }>({
    queryKey: ["/api/manufacturing/notifications"],
    enabled: alertEligible,
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const res = await fetch("/api/manufacturing/notifications", { credentials: "include" });
      if (!res.ok) return { alertCount: 0 };
      return res.json();
    },
  });
  const alertCount = alertData?.alertCount ?? 0;

  //  ══ **شارةُ «مُعادة للتصحيح»** (ترحيل ٠٦٧) ═══════════════════════════
  //  رسالةٌ تمرّ فتضيع، وطابورٌ بلا عددٍ ظاهر لا يُفتَح. فالعددُ على القائمة
  //  نفسِها: **عددُ الفرع** هو الحاكم (المهمّةُ للفرع لا للموظّف)، ومَن
  //  أنشأها يراها مُبرَزةً داخل الصفحة.
  const returnedEligible = !!branchSession && (
    branchSession.isAdmin
    || branchSession.role === "branch_manager"
    || permissions.canAddPatients
  );
  const { data: returnedData } = useQuery<{ branch: number; mine: number }>({
    queryKey: ["/api/no-exam/returned/count"],
    enabled: returnedEligible,
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const res = await fetch("/api/no-exam/returned/count", { credentials: "include" });
      if (!res.ok) return { branch: 0, mine: 0 };
      return res.json();
    },
  });
  const returnedCount = returnedData?.branch ?? 0;

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const baseMenuItems = [
    { label: t.sidebar.dashboard, icon: LayoutDashboard, href: "/", adminOnly: false, settingKey: "showDashboard" as const, permission: null },
    { label: t.sidebar.patientRegistry, icon: Users, href: "/patients", adminOnly: false, settingKey: "showPatients" as const, permission: "canViewPatients" as const },
    { label: t.sidebar.addPatient, icon: UserPlus, href: "/patients/new", adminOnly: false, settingKey: "showPatients" as const, permission: "canAddPatients" as const },
    { label: t.sidebar.followUps, icon: PhoneCall, href: "/follow-ups", adminOnly: false, settingKey: "showPatients" as const, permission: "canViewPatients" as const },
    { label: t.sidebar.financialReports, icon: FileBarChart, href: "/reports", adminOnly: false, settingKey: "showPayments" as const, permission: "canViewReports" as const },
    { label: language === "ar" ? "التقرير اليومي للمرضى" : "Daily Patient Report", icon: CalendarDays, href: "/reports/daily-patients", adminOnly: false, settingKey: "showPayments" as const, permission: "canViewReports" as const },
    { label: t.sidebar.accountingSystem, icon: Calculator, href: "/accounting", adminOnly: false, settingKey: "showAccounting" as const, permission: "canManageAccounting" as const },
    { label: t.sidebar.branches, icon: Building2, href: "/branches", adminOnly: true, settingKey: null, permission: null },
    { label: t.sidebar.statistics, icon: BarChart3, href: "/statistics", adminOnly: false, settingKey: "showStatistics" as const, permission: "canViewReports" as const },
    { label: t.sidebar.surveys, icon: ClipboardCheck, href: "/surveys", adminOnly: false, settingKey: null, permission: "canManageSurveys" as const },
    { label: t.sidebar.sessionEntry, icon: Activity, href: "/session-tracking/entry", adminOnly: false, settingKey: null, permission: "canEnterSessions" as const },
    { label: t.sidebar.sessionTargets, icon: Target, href: "/session-tracking/targets", adminOnly: false, settingKey: null, permission: "canManageSessionTargets" as const },
    { label: t.sidebar.sessionsList, icon: ClipboardList, href: "/session-tracking/list", adminOnly: false, settingKey: null, permission: "canViewSessionsReport" as const },
    { label: t.sidebar.sessionAnalytics, icon: TrendingUp, href: "/session-tracking/analytics", adminOnly: false, settingKey: null, permission: "canViewSessionsReport" as const },
    { label: "متابعة ما بعد المعاينة", icon: ClipboardCheck, href: "/post-exam-followups", adminOnly: false, settingKey: null, permission: null, roles: ["reception", "branch_manager", "doctor", "accountant"] as const },
    //  اعتمادُ الخصم لمديرِ الفرع والمخوَّل — والمسؤولُ يرى كلَّ شيء أصلاً.
    //  والطبيبُ العاديّ لا يراه: الخصمُ قرارٌ ماليٌّ لا سريريّ.
    { label: "اعتماد الخصومات", icon: BadgePercent, href: "/discount-approvals", adminOnly: false, settingKey: null, permission: null, roles: ["branch_manager"] as const },
    { label: "معايناتي", icon: Stethoscope, href: "/my-exams", adminOnly: false, settingKey: null, permission: "canWriteMedicalExam" as const },
    { label: "مراجعة الطبيب", icon: ClipboardCheck, href: "/medical-review", adminOnly: false, settingKey: null, permission: "canWriteMedicalExam" as const },
    //  **المراجعةُ المالية لعمليات «بلا معاينة»** — طابورٌ مستقلٌّ عن
    //  «معايناتي» و«مراجعة الطبيب»: سؤالٌ واحد له شاشتُه.
    { label: "مراجعة مبيعات بلا معاينة", icon: Wallet, href: "/no-exam-review", adminOnly: false, settingKey: null, permission: "canWriteMedicalExam" as const },
    //  **وطابورُ الاستقبال للمُعادات** — بعددٍ ظاهر، فيُعرَف أن هناك ما
    //  ينتظر بلا فتح الصفحة.
    { label: "مُعادة للتصحيح", icon: Undo2, href: "/returned-charges", adminOnly: false, settingKey: null, permission: null, roles: ["reception", "branch_manager"] as const, badge: returnedCount },
    { label: "تصنيع الأطراف والمساند", icon: Wrench, href: "/manufacturing", adminOnly: false, settingKey: null, permission: null, roles: ["prosthetics_expert", "branch_manager"] as const },
    { label: "التنبيهات", icon: Bell, href: "/notifications", adminOnly: false, settingKey: null, permission: null, roles: ["prosthetics_expert", "branch_manager", "reception", "accountant"] as const, badge: alertCount },
    { label: t.sidebar.systemSettings, icon: Settings, href: "/admin", adminOnly: true, settingKey: null, permission: "canManageSettings" as const },
  ];

  // Filter menu items based on admin status, branch settings, and permissions
  const menuItems = baseMenuItems.filter(item => {
    // Admin-only items are only shown to admin users
    if (item.adminOnly && !branchSession?.isAdmin) {
      return false;
    }
    
    // Hide dashboard for reception, therapist, surveyor, prosthetics-expert and
    // doctor users — each of them lands on their own working screen instead.
    if (item.href === "/" && (branchSession?.role === "reception" || branchSession?.role === "therapist" || branchSession?.role === "surveyor" || branchSession?.role === "prosthetics_expert" || branchSession?.role === "doctor")) {
      return false;
    }

    // Role-restricted items: an allow-list of roles. Admins always pass
    // (they have isAdmin, not a `role`); a non-admin must match the list.
    // The expert CAPABILITY flag also grants any expert-gated item, so an
    // accountant/manager who also works as an expert sees the manufacturing
    // board even though their primary role isn't prosthetics_expert.
    const itemRoles = (item as any).roles as string[] | undefined;
    if (itemRoles && !branchSession?.isAdmin) {
      const matchesRole = itemRoles.includes(branchSession?.role ?? "");
      const expertBypass = itemRoles.includes("prosthetics_expert") && permissions.canWorkAsExpert;
      //  والخصمُ كذلك: عَلَمُ `canApproveDiscount` يفتح الشاشةَ لمن دورُه شيءٌ
      //  آخر — طبيبٌ خُوِّل صراحةً مثلاً. **ولا يُفتَح بالدور وحده لغير
      //  مديرِ الفرع**، فالطبيبُ العاديّ لا يراها.
      const discountBypass = item.href === "/discount-approvals"
        && permissions.canApproveDiscount;
      //  **والمُعادات كذلك**: البوّابةُ في الخادم `canAddPatients` — وهي
      //  ما يعنيه «استقبال» — فمَن يحملها يرى طابورَه ولو كان دورُه شيئاً
      //  آخر. ولا تُفتَح لمن لا يملكها.
      const returnedBypass = item.href === "/returned-charges"
        && permissions.canAddPatients;
      if (!matchesRole && !expertBypass && !discountBypass && !returnedBypass) return false;
    }
    
    // Check branch settings for non-admin users
    if (!branchSession?.isAdmin && item.settingKey && branchSettings) {
      const settingValue = branchSettings[item.settingKey];
      if (settingValue === false) {
        return false;
      }
    }
    
    // Check permissions
    if (item.permission && !permissions[item.permission]) {
      // The accounting section is also reachable with the narrow
      // "add expenses" grant (expenses tab only) — not just full management.
      if (!(item.href === "/accounting" && permissions.canAddExpenses)) {
        return false;
      }
    }
    
    return true;
  });

  // NOTE: this is a plain JSX element, NOT a nested component. Defining it as
  // a component (`const SidebarContent = () => ...`) made React see a brand
  // new component type on every render, remounting the whole sidebar — which
  // reset the nav's scroll position to the top after every navigation.
  const sidebarContent = (
    <>
      <div className="p-4 flex items-center gap-3 border-b border-border/50">
        <img src={logoImage} alt="Logo" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
        <div>
          {t.sidebar.centerName.split('\n').map((line, i) => (
            i === 0 
              ? <h1 key={i} className="font-display font-bold text-xs md:text-sm text-primary leading-tight">{line}</h1>
              : <p key={i} className="text-xs md:text-sm font-bold text-slate-700">{line}</p>
          ))}
        </div>
        {/* Close button for mobile */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden mr-auto"
          onClick={() => setMobileOpen(false)}
          data-testid="button-close-mobile-menu"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 md:p-6 space-y-1 md:space-y-2">
        {menuItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center gap-3 px-3 md:px-4 py-3 md:py-3.5 rounded-xl transition-all duration-200 font-medium text-sm md:text-base group",
              isActive 
                ? "bg-primary/10 text-primary shadow-sm" 
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}>
              <item.icon className={cn(
                "w-5 h-5 transition-colors",
                isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
              )} />
              {item.label}
              {((item as any).badge ?? 0) > 0 && (
                <span className="mr-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold">
                  {(item as any).badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {branchSession && (
        <div className="px-4 md:px-6 py-3 md:py-4 border-t border-border/50 bg-slate-50/50">
          {branchSession.displayName && (
            <div className="flex items-center gap-2 text-xs md:text-sm mb-2">
              <User className="w-4 h-4 text-primary" />
              <span className="font-medium text-slate-700">{branchSession.displayName}</span>
              {branchSession.role && (
                <span className="text-xs text-muted-foreground">
                  ({t.roles[branchSession.role as keyof typeof t.roles] || branchSession.role})
                </span>
              )}
              {/* Only a real staff account has a personal password to change;
                  the legacy admin key changes its own from admin settings. */}
              {(branchSession as any).userId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 mr-auto"
                  onClick={() => setPasswordOpen(true)}
                  title="تغيير كلمة السر"
                  data-testid="button-change-password"
                >
                  <KeyRound className="w-4 h-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          )}
          {Array.isArray((branchSession as any).accessibleBranches) &&
           (branchSession as any).accessibleBranches.length > 1 && (
            <div className="mb-2">
              <BranchSwitcher />
            </div>
          )}
          <div className="flex items-center justify-between gap-2 text-xs md:text-sm">
            <div className="flex items-center gap-2">
              {branchSession.isAdmin ? (
                <ShieldCheck className="w-4 h-4 text-primary" />
              ) : (
                <Building2 className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="font-medium text-slate-700">{t.branches[branchSession.branchName as keyof typeof t.branches] || branchSession.branchName}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const newLang = language === "ar" ? "en" : "ar";
                setLanguage(newLang);
                const stored = localStorage.getItem("branch_session");
                if (stored) {
                  try {
                    const session = JSON.parse(stored);
                    session.language = newLang;
                    localStorage.setItem("branch_session", JSON.stringify(session));
                  } catch {}
                }
              }}
              className="h-7 w-7"
              data-testid="button-toggle-language"
              title={language === "ar" ? "Switch to English" : "التبديل إلى العربية"}
            >
              <Globe className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="p-4 md:p-6 border-t border-border/50">
        <button 
          onClick={() => {
            clearBranchSession();
            logout();
          }}
          className="flex items-center gap-3 w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors duration-200"
          data-testid="button-logout"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm md:text-base">{t.sidebar.logout}</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Header — fixed to viewport top. We pad-top via the
          inline style so the iOS notch / status bar doesn't sit on
          the hamburger and logo. body padding wouldn't help here
          because position: fixed is relative to the viewport. */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-border shadow-sm"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center justify-between p-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            data-testid="button-open-mobile-menu"
          >
            <Menu className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-2">
            <img src={logoImage} alt="Logo" className="w-8 h-8 object-contain" />
            <span className="font-display font-bold text-sm text-primary">مراكز د. ياسر الساعدي</span>
          </div>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "md:hidden fixed top-0 right-0 h-full w-72 bg-white z-50 transform transition-transform duration-300 shadow-xl",
          mobileOpen ? "translate-x-0" : "translate-x-full"
        )}
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex flex-col h-full">
          {sidebarContent}
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-l border-border h-screen sticky top-0 shadow-lg z-20">
        {sidebarContent}
      </aside>

      {/* Mounted once, outside both sidebars: `sidebarContent` is rendered
          twice (mobile + desktop) and a dialog must not be. */}
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  );
}
