import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, UserPlus, LogOut, FileBarChart, Building2, ShieldCheck, Menu, X, BarChart3, Calculator, Settings, User, Globe, ClipboardCheck, CalendarDays, Activity, Target, ClipboardList, TrendingUp, PhoneCall, Wrench, Bell, Stethoscope, KeyRound, BadgePercent, Wallet, Undo2, Trash2, Banknote, Eye, BookOpen, Dumbbell, CalendarCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { clearBranchSession, useBranchSession } from "@/components/BranchGate";
import { BranchSwitcher, branchSwitcherVisible } from "@/components/BranchSwitcher";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { canTrashPatients, TRASH_TITLE, trashBadgeSeenKey } from "@shared/patient_trash";
import { LEGACY_QUEUE_TITLE } from "@shared/pending_charge";
import { DECISION_QUEUE_SIDEBAR_LABEL } from "@shared/decision_queue";
//  ══ **الأهليّةُ من الدالّة القانونية نفسِها — لا قائمةُ أدوارٍ ثانية**
//  (تصحيحٌ لاحق) ═══════════════════════════════════════════════════════
//  كانت الشارةُ والصفُّ يُعيدان كتابةَ شرط `canCompleteReceptionSale`
//  يدوياً (`isAdmin || role في reception/accountant/branch_manager`) —
//  متطابقٌ اليوم، لكنّه ينحرف صامتاً إن تغيّرت القاعدةُ القانونية في
//  `shared/commercial.ts` ولم يتذكّر أحدٌ هذا الملفّ.
import { canCompleteReceptionSale } from "@shared/commercial";
import { canCreateReview, canDecideReview, canSuperviseReview, RETURNED_FROM_DOCTOR_TITLE } from "@shared/medical_review";
//  ══ **«خصومات سابقة»** (تصحيحٌ تشغيليّ ٢٠٢٦-٠٨-٢٨) ═══════════════════
//  نفسُ المبدأ أعلاه بالضبط: `canApproveServiceDiscount` هي الدالّةُ
//  القانونية التي تحرس `/api/discounts/:id/decide` فعلياً
//  (`shared/discount.ts`)، فالأهليّةُ هنا منها لا من قائمة أدوارٍ يدوية.
import { canApproveServiceDiscount, DISCOUNT_HISTORY_TITLE } from "@shared/discount";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import logoImage from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/LanguageContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { hasAnyRole, hidesDashboard, onlyRoles, rolesOf } from "@shared/user_roles";
import { canWriteCashBook } from "@shared/cash_book";
import { canExecutePlans, canReadPlans } from "@shared/physio_plans";
import { canReadProtocols } from "@shared/physio_protocols";
import { canOperateNoExam } from "@shared/pending_charge";


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
  //  ══ **الجلسةُ الحيّة** (§4.ch) ══ كانت نسخةً تُقرأ من التخزين مرّةً عند التركيب ولا تتحدّث — فما يغيّره المسؤولُ
  //  في حساب موظّفٍ (دورٌ أو صلاحية) لا يبلغ شريطَه حتى يُعيد التحميل، وقد تُقرأ عند التحميل لقطةٌ أقدم. فصار الشريطُ
  //  يقرأ المخزنَ المشترك الذي يحدّثه `/api/auth/user` (`App.tsx`) — نفسَ ما يقرؤه `usePermissions`.
  const branchSession = useBranchSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  // Fetch branch settings
  //  ══ تصل بلا خروجٍ وعودة (٢٠٢٦-٠٩-١٩) ═══════════════════════════════
  //  الافتراضاتُ العامّة في `queryClient.ts` تُطفئ الاثنين
  //  (`refetchInterval: false` · `refetchOnWindowFocus: false`) وتضع
  //  `staleTime: 60_000` — فتبديلُ المسؤولِ لخيارِ إظهارٍ كان لا يبلغ موظّفَ
  //  الفرع حتى يخرج ويعود. و`"always"` لا `true`: الثانيةُ تُقاس بالبيات،
  //  فالستّون ثانية كانت ستبتلع أغلبَ العودات.
  const { data: branchSettings } = useQuery<BranchSettings>({
    queryKey: ["/api/branch-settings"],
    enabled: !!branchSession,
    refetchInterval: 30_000,
    refetchOnWindowFocus: "always",
  });

  // Delivery-alert count for the التنبيهات badge. Light polling keeps the
  // badge honest without hammering the server.
  //  **قاعدةُ الخادم نفسُها** (`/api/manufacturing/notifications`): الخبيرُ والمديرُ والمسؤول، وإلّا فموظّفُ فرعٍ يرى
  //  المرضى أو المحاسبة — لا قائمةُ أدوارٍ كانت تُظهر الصفحةَ لاستقبالٍ بلا صلاحيةٍ فيصله ٤٠٣.
  const alertEligible = !!branchSession && (
    branchSession.isAdmin ||
    hasAnyRole(branchSession, ["prosthetics_expert", "branch_manager"]) ||
    (Boolean(branchSession.branchId) && (permissions.canViewPatients || permissions.canManageAccounting))
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
  //  البوّابةُ في الخادم `canOperateNoExam` (المسؤول أو «إضافة مرضى») — لا الدور (قرارُ المالك ٢٠٢٦-٠٩-٣٠).
  const returnedEligible = canOperateNoExam(branchSession as any);
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

  //  ══ **شارةُ المحذوفات — إشعارٌ معلوماتيّ يُطفَأ بالمشاهدة** (تحكّمُ
  //  شاراتِ الشريط الجانبي، 2026-08-31 — يُلغي «تبقى ظاهرةً دائماً» القديم)
  //  ═════════════════════════════════════════════════════════════════════
  //  كانت شارةً بعددٍ كامل لا يهبط أبداً حتى تُستعاد كلُّ ملفٍّ أو يُحذَف
  //  نهائياً — عمداً يومَها («كي لا تنقضي مهلةُ ملفٍّ لأن أحداً لم يفتح
  //  الصفحة»). لكنّها بذلك لا تفرّق «شاهدتُ هذه العشرةَ أمس» عن «دخل ملفٌّ
  //  جديد اليوم» — فصارت `?since=` تُفلتر السلّةَ في الخادم (`listTrash`
  //  القائمة، بلا عمودٍ جديد ولا ترحيل) بآخر زيارةٍ لصفحة `/patient-trash`،
  //  المحفوظة في `localStorage`. الصفحةُ نفسُها (`PatientTrash.tsx`) تكتب
  //  وقتَ الفتح وتُبطل هذا المفتاح فوراً — فالشارةُ تصفر لحظةَ المشاهدة لا
  //  عند أقرب استقصاءٍ دوريّ.
  //
  //  **ولكلّ مستخدمٍ لا لكلّ متصفّح** (تصحيحٌ لاحق، 2026-08-31 — يُلغي
  //  افتراض «متصفّحٌ آخر لنفس الحساب» القديم الذي لم يكن يغطّي المشكلةَ
  //  الفعلية): مفتاحٌ واحد على نفس المتصفّح كان يعني أن موظّفةً تفتح السلّة
  //  تُطفئ الشارةَ لزميلها الذي يدخل بعدها من **نفس الجهاز** ولم يرَ شيئاً.
  //  `trashBadgeSeenKey(userId)` القانونية (`shared/patient_trash.ts`) تبني
  //  مفتاحاً بمعرّف المستخدم — نفسُ الدالّة يستوردها الطرفان فلا ينحرف
  //  بناءُ المفتاح هنا عمّا تكتبه `PatientTrash.tsx`.
  const trashEligible = canTrashPatients(branchSession as any);
  const { data: trashData } = useQuery<{ count: number }>({
    queryKey: ["/api/patient-trash/count", branchSession?.userId ?? null],
    enabled: trashEligible,
    refetchInterval: 10 * 60_000,
    queryFn: async () => {
      const since = localStorage.getItem(trashBadgeSeenKey(branchSession?.userId));
      const url = since
        ? `/api/patient-trash/count?since=${encodeURIComponent(since)}`
        : "/api/patient-trash/count";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
  });
  const trashCount = trashData?.count ?? 0;

  //  ══ **شارةُ «معايناتي»** — طابورُ عملٍ لا إشعارٌ معلوماتيّ (تحكّمُ
  //  شاراتِ الشريط الجانبي، 2026-08-31) ═══════════════════════════════════
  //  بلا مشاهدةٍ تُطفئها: تبقى حتى يوقّع الطبيبُ معاينةَ كلّ صفّ، تماماً
  //  كـ«بانتظار الحسم». والأهليّةُ **نفسُ ما يُظهر عنصرَ القائمة أصلاً**
  //  (`permissions.canWriteMedicalExam`) — لا شرطَ دورٍ ثانٍ.
  const { data: worklistCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/medical/worklist", "count"],
    enabled: !!permissions.canWriteMedicalExam,
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const res = await fetch("/api/medical/worklist/count", { credentials: "include" });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
  });
  const worklistCount = worklistCountData?.count ?? 0;

  //  ══ **«المُرجَعون من الطبيب»** (§4.ar، تكملةُ البند ١٨) ══════════════
  //  للاستعلامات وللطبيب — بالدالّتين اللتين تحرسان النقطةَ نفسَها. **بلا
  //  استطلاعٍ دوريّ** (قرارُ المالك ٢٠٢٦-٠٩-٢٣): التحديثُ الحيُّ عند الكتابة
  //  وعند العودة إلى النافذة يكفيه.
  const returnedFromDoctorEligible = canCreateReview(branchSession as any) || canDecideReview(branchSession as any);
  const { data: returnedFromDoctorData } = useQuery<{ count: number }>({
    queryKey: ["/api/medical-review/returned", "count"],
    enabled: returnedFromDoctorEligible,
    queryFn: async () => {
      const res = await fetch("/api/medical-review/returned/count", { credentials: "include" });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
  });
  const returnedFromDoctorCount = returnedFromDoctorData?.count ?? 0;

  //  ══ **شارةُ «بانتظار الحسم»** (المرحلة الخامسة) ═══════════════════════
  //  **نفسُ الدالّة القانونية بعينها** — لا نسخةٌ يدوية من قائمة الأدوار.
  //  `canCompleteReceptionSale` هي مَن تفتح البابين `/complete-sale`/
  //  `/not-bought` فعلياً (`shared/commercial.ts`)، فانحرافُها لاحقاً يسري
  //  إلى الشريط الجانبيّ من تلقاء نفسه — لا الطبيب.
  //  والعدّادُ **كلَّ الفروع** بلا فلترةٍ محليّة، مهما ضيّق الموظّفُ الصفحةَ
  //  بفرعٍ واحد؛ الخادمُ يفرض ذلك (`/api/followups/decision-queue/count`
  //  لا تقبل فلتراً).
  const decisionQueueEligible = canCompleteReceptionSale(branchSession as any);
  const { data: decisionQueueData } = useQuery<{ count: number }>({
    queryKey: ["/api/followups/decision-queue", "count"],
    enabled: decisionQueueEligible,
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const res = await fetch("/api/followups/decision-queue/count", { credentials: "include" });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
  });
  const decisionQueueCount = decisionQueueData?.count ?? 0;

  //  ══ **شارةُ الطابور الموروث** (المرحلة الخامسة) ═══════════════════════
  //  نفسُ أهليّة «مُعادة للتصحيح» بالضبط — كلاهما `canOperateNoExam` اليوم
  //  (`shared/pending_charge.ts`)، فلا حاجةَ لشرطٍ ثانٍ منفصل.
  const { data: legacyReviewData } = useQuery<{ count: number }>({
    queryKey: ["/api/no-exam/review", "count"],
    enabled: returnedEligible,
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const res = await fetch("/api/no-exam/review/count", { credentials: "include" });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
  });
  const legacyReviewCount = legacyReviewData?.count ?? 0;

  //  ══ **شارةُ «خصومات سابقة»** (تصحيحٌ تشغيليّ ٢٠٢٦-٠٨-٢٨) ═══════════════
  //  طابورُ اعتماد الخصومات تقاعد: كلُّ خصمٍ جديد يُطبَّق فوراً في نفس
  //  معاملة الحفظ (`applyDiscountImmediately`)، فلا صفَّ `pending` جديداً
  //  يُنشئه عملٌ حيّ بعد اليوم. وما بقي هو بقيّةٌ من قبل التغيير وحدها —
  //  فالعنصرُ **يختفي كلَّه عند الصفر**، نفسُ نمط الطابور الموروث الآخر
  //  بالضبط (`hideWhenZero`)، لا شارةٌ باقيةٌ على صفرٍ دائم.
  const discountHistoryEligible = canApproveServiceDiscount(branchSession as any);
  const { data: discountHistoryData } = useQuery<{ count: number }>({
    queryKey: ["/api/discounts/pending", "count"],
    enabled: discountHistoryEligible,
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const res = await fetch("/api/discounts/pending/count", { credentials: "include" });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
  });
  const discountHistoryCount = discountHistoryData?.count ?? 0;

  //  ══ **شارةُ «طلبات تصحيح الدفعات»** (إكمالُ واجهة تحكّم تصحيح الدفعات،
  //  2026-08-30) ═══════════════════════════════════════════════════════════
  //  المسؤولُ العامّ وحده يقرّر — نفسُ حارس `isGlobalAdmin` في
  //  `server/payments/correction_routes.ts` الذي يحرس نقطةَ العدّ نفسَها،
  //  فلا داعي لدالّةٍ قانونية مستوردة هنا: `adminOnly: true` وحدها تكفي
  //  (نفسُ نمط «الفروع» و«إعدادات النظام» أدناه).
  const { data: paymentCorrectionsData } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/payment-corrections", "pending-count"],
    enabled: !!branchSession?.isAdmin,
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const res = await fetch("/api/admin/payment-corrections/pending-count", { credentials: "include" });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
  });
  const paymentCorrectionsCount = paymentCorrectionsData?.count ?? 0;

  //  ══ **شارةُ «القالب الاختباري»** (§4.bz) — مرضى يُطلَب الاتصالُ بهم اليوم بشأن قالبهم النهائي ════════
  //  للاستعلامات والإدارة لا للخبير. **بلا `refetchInterval`** (قرارُ المالك ٢٠٢٦-٠٩-٢٣): تتحدّث عند الكتابة والعودة.
  const trialEligible = Boolean(branchSession) && !onlyRoles(branchSession, ["prosthetics_expert"])
    && Boolean(branchSession?.isAdmin || permissions.canViewPatients);
  const { data: trialRows } = useQuery<{ callState: string | null }[]>({
    queryKey: ["/api/manufacturing/trial-awaiting"],
    enabled: trialEligible,
  });
  const trialCallCount = (trialRows ?? []).filter((r) => r.callState !== null).length;

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const baseMenuItems = [
    { label: t.sidebar.dashboard, icon: LayoutDashboard, href: "/", adminOnly: false, settingKey: "showDashboard" as const, permission: null },
    { label: t.sidebar.patientRegistry, icon: Users, href: "/patients", adminOnly: false, settingKey: "showPatients" as const, permission: "canViewPatients" as const },
    { label: t.sidebar.addPatient, icon: UserPlus, href: "/patients/new", adminOnly: false, settingKey: "showPatients" as const, permission: "canAddPatients" as const },
    { label: t.sidebar.followUps, icon: PhoneCall, href: "/follow-ups", adminOnly: false, settingKey: "showPatients" as const, permission: "canViewPatients" as const, badge: trialCallCount },
    { label: t.sidebar.financialReports, icon: FileBarChart, href: "/reports", adminOnly: false, settingKey: "showPayments" as const, permission: "canViewReports" as const },
    { label: language === "ar" ? "التقرير اليومي للمرضى" : "Daily Patient Report", icon: CalendarDays, href: "/reports/daily-patients", adminOnly: false, settingKey: "showPayments" as const, permission: "canViewReports" as const },
    { label: t.sidebar.accountingSystem, icon: Calculator, href: "/accounting", adminOnly: false, settingKey: "showAccounting" as const, permission: "canManageAccounting" as const },
    //  دفترُ القاصة اليوميّ (§4.ca) — للمحاسب ومدير الفرع والمسؤول وحدهم، كبوّابة الخادم.
    { label: "دفتر القاصة", icon: BookOpen, href: "/cash-book", adminOnly: false, settingKey: null, permission: null, eligible: canWriteCashBook(branchSession) },
    //  قاصةُ الدكتور (§4.cb) — للمسؤول وحده بقرار المالك.
    { label: "قاصة الدكتور", icon: Wallet, href: "/dr-box", adminOnly: true, settingKey: null, permission: null },
    { label: t.sidebar.branches, icon: Building2, href: "/branches", adminOnly: true, settingKey: null, permission: null },
    //  الإحصائياتُ تقرأ `/api/patients` (تحتاج «عرض المرضى») مع تقاريرها — فبلا الاثنين تُفتح فارغة (§4.ch).
    { label: t.sidebar.statistics, icon: BarChart3, href: "/statistics", adminOnly: false, settingKey: "showStatistics" as const, permission: null, eligible: Boolean(branchSession?.isAdmin) || (permissions.canViewReports && permissions.canViewPatients) },
    //  والاستبيانُ يُختار له مريضٌ من السجلّ — فبلا «عرض المرضى» لا يُملأ.
    { label: t.sidebar.surveys, icon: ClipboardCheck, href: "/surveys", adminOnly: false, settingKey: null, permission: null, eligible: Boolean(branchSession?.isAdmin) || (permissions.canManageSurveys && permissions.canViewPatients) },
    { label: t.sidebar.sessionEntry, icon: Activity, href: "/session-tracking/entry", adminOnly: false, settingKey: null, permission: "canEnterSessions" as const },
    { label: t.sidebar.sessionTargets, icon: Target, href: "/session-tracking/targets", adminOnly: false, settingKey: null, permission: "canManageSessionTargets" as const },
    { label: t.sidebar.sessionsList, icon: ClipboardList, href: "/session-tracking/list", adminOnly: false, settingKey: null, permission: "canViewSessionsReport" as const },
    { label: t.sidebar.sessionAnalytics, icon: TrendingUp, href: "/session-tracking/analytics", adminOnly: false, settingKey: null, permission: "canViewSessionsReport" as const },
    //  مكتبةُ بروتوكولات العلاج الطبيعي (§4.cj) — بالقاعدة نفسِها التي تحرس قراءتَها في الخادم.
    { label: "بروتوكولات العلاج الطبيعي", icon: Dumbbell, href: "/physio/protocols", adminOnly: false, settingKey: null, permission: null, eligible: canReadProtocols(branchSession ? { ...branchSession, permissions } : null) },
    //  خططُ العلاج الطبيعي (§4.cm) — الاعتماداتُ والمسندةُ إليّ، لمن يقرأ الخطط كبوّابة الخادم.
    { label: "خطط العلاج الطبيعي", icon: ClipboardList, href: "/physio/plans", adminOnly: false, settingKey: null, permission: null, eligible: canReadPlans(branchSession ? { ...branchSession, permissions } : null) },
    //  جلساتُ اليوم (§4.cn) — لمنفّذي القسم، بالقاعدة نفسِها التي تحرس التنفيذَ في الخادم.
    { label: "جلسات اليوم", icon: CalendarCheck, href: "/physio/today", adminOnly: false, settingKey: null, permission: null, eligible: canExecutePlans(branchSession ? { ...branchSession, permissions } : null) },
    //  ══ **«بانتظار الحسم»** (المرحلة الخامسة — كانت «متابعة ما بعد
    //  المعاينة») ══════════════════════════════════════════════════════
    //  **ولا الطبيبُ بعد اليوم**: الحسمُ صار حصراً لمن يحمل
    //  `canCompleteReceptionSale` — الطبيبُ يكتب معاينته ويخرج، ولا زرَّ
    //  بيعٍ له في هذه الصفحة أصلاً. **`eligible` لا `roles`**: القاعدةُ
    //  التي تفتح البابين نفسِهما (`shared/commercial.ts`) — لا قائمةَ
    //  أدوارٍ ثانية تنحرف عنها صامتة لو تغيّرت القاعدةُ لاحقاً.
    { label: DECISION_QUEUE_SIDEBAR_LABEL, icon: ClipboardCheck, href: "/post-exam-followups", adminOnly: false, settingKey: null, permission: null, eligible: decisionQueueEligible, badge: decisionQueueCount },
    //  ══ **«خصومات سابقة»** (تصحيحٌ تشغيليّ ٢٠٢٦-٠٨-٢٨ — كانت «اعتماد
    //  الخصومات») ══════════════════════════════════════════════════════
    //  طابورُ اعتمادٍ حيّ لم يعد له وجود: الخصمُ يُطبَّق فوراً عند الحفظ،
    //  ولا صفَّ جديداً يراه أحدٌ هنا. `eligible` من الدالّة القانونية نفسِها
    //  لا قائمةَ أدوارٍ يدوية، و`hideWhenZero` يُسقط العنصرَ كلَّه حين يفرغ
    //  الطابورُ الموروث — نفسُ نمط «بانتظار الحسم» و«مبالغ سابقة بانتظار
    //  الإكمال» معاً.
    //  **يبقى ظاهراً ولو فرغ المعلَّق** (قرارُ المالك ٢٠٢٦-١٠-٠٧: «يبقوا وبها تاريخُ ما حدث كي أفحص إن احتجت»):
    //  الصفحةُ تعرض المكتمل والمرفوض والملغى، والشارةُ وحدها تعدّ المعلَّق.
    { label: DISCOUNT_HISTORY_TITLE, icon: BadgePercent, href: "/discount-approvals", adminOnly: false, settingKey: null, permission: null, eligible: discountHistoryEligible, badge: discountHistoryCount },
    //  ══ **شارةُ العدد** (تحكّمُ شاراتِ الشريط الجانبي، 2026-08-31) ═══════
    //  طابورُ عمل — لا تُخفيها المشاهدة، وحدها القائمةُ تفرغ.
    //  «معايناتي» لمن يكتب المعاينة وحده — ولا للمسؤول بسلطته: لا قائمةَ عملٍ له بلا العلَم (§4.ch).
    { label: "معايناتي", icon: Stethoscope, href: "/my-exams", adminOnly: false, settingKey: null, permission: "canWriteMedicalExam" as const, noAdminBypass: true, badge: worklistCount },
    //  «مراجعة الطبيب» بقاعدة الخادم `canSuperviseReview`: المسؤولُ ومديرُ الفرع يشرفان، والطبيبُ يقرّر (§4.ch).
    { label: "مراجعة الطبيب", icon: ClipboardCheck, href: "/medical-review", adminOnly: false, settingKey: null, permission: null, eligible: canSuperviseReview(branchSession as any) },
    { label: RETURNED_FROM_DOCTOR_TITLE, icon: Undo2, href: "/returned-from-doctor", adminOnly: false, settingKey: null, permission: null, eligible: returnedFromDoctorEligible, badge: returnedFromDoctorCount },
    //  **المراجعةُ المالية لعمليات «بلا معاينة»** — طابورٌ مستقلٌّ عن
    //  «معايناتي» و«مراجعة الطبيب»: سؤالٌ واحد له شاشتُه.
    //
    //  **والقائمةُ تطابق الخادمَ ولا تضيق عنه**: شرطُ الخادم شكلاً هو
    //  «مسؤولٌ أو دورُه طبيب أو يحمل `canWriteMedicalExam`»، ثمّ يصفّي
    //  ══ **طابورُ الإكمال الموروث — خرج من عمل الطبيب** ══════════════════
    //  كان «مراجعة مبيعات بلا معاينة» ويقف عليه طبيبٌ ليجعل المالَ حقيقياً.
    //  وقد أُلغيت تلك السلطة (قرارُ المالك): المبلغُ يُقيَّد لحظةَ إدخاله من
    //  الاستعلامات، ولا صفَّ جديد يدخل هذا الطابور.
    //
    //  فما بقي فيه **مبالغُ عملياتٍ وقعت قبل التغيير** تنتظر إنساناً يُنهيها
    //  — والإنسانُ هو الاستقبالُ ومديرُ الفرع والمسؤول، بالبوّابة نفسِها
    //  التي يقبلها الخادم (`canAddPatients`). **ولا يراه الطبيبُ بدوره.**
    //  ══ **شارةٌ بلا صفّ عند الصفر** (المرحلة الخامسة) ══════════════════
    //  طابورٌ فارغٌ لا يستحقّ سطراً في الشريط الجانبيّ — `hideWhenZero`
    //  تُخفي الصفَّ كلَّه لا الشارةَ وحدها (كانت الشارةُ تختفي والصفُّ يبقى).
    { label: LEGACY_QUEUE_TITLE, icon: Wallet, href: "/no-exam-review", adminOnly: false, settingKey: null, permission: null, eligible: returnedEligible, badge: legacyReviewCount, hideWhenZero: true },
    { label: "مُعادة للتصحيح", icon: Undo2, href: "/returned-charges", adminOnly: false, settingKey: null, permission: null, eligible: returnedEligible, badge: returnedCount, hideWhenZero: true },
    //  ══ **«طلبات تصحيح الدفعات»** (إكمالُ واجهة تحكّم تصحيح الدفعات،
    //  2026-08-30) ══════════════════════════════════════════════════════
    //  `adminOnly: true` وحدها تحجب مديرَ الفرع وكلَّ دورٍ آخر — لا قائمةَ
    //  أدوارٍ ولا صلاحيةَ دقيقة: هذه سلطةٌ للمسؤول العام حصراً في الخادم
    //  نفسِه (`server/payments/correction_routes.ts: isGlobalAdmin`).
    //  و`hideWhenZero` تُخفي الصفَّ كلَّه حين لا يوجد طلبٌ معلَّق — نفسُ نمط
    //  «خصومات سابقة» و«الطابور الموروث» أعلاه بالضبط.
    //  **ويبقى ظاهراً ولو فرغ المعلَّق** (قرارُ المالك ٢٠٢٦-١٠-٠٧) — والصفحةُ صارت تعرض المعتمَد والمرفوض بقرارهما.
    { label: "طلبات تصحيح الدفعات", icon: Banknote, href: "/payment-corrections", adminOnly: true, settingKey: null, permission: null, badge: paymentCorrectionsCount },
    //  سردٌ إشرافيٌّ للقراءة فقط — بلا شارةٍ (ليست طابورَ انتظار).
    { label: "المراجعة اليومية", icon: Eye, href: "/daily-review", adminOnly: true, settingKey: null, permission: null },
    //  لوحةُ التصنيع: المسؤولُ والمديرُ (اللوحة) والخبيرُ بدوره أو بقدرته (أوامرُه) — كبوّابتَي الخادم.
    { label: "تصنيع الأطراف والمساند", icon: Wrench, href: "/manufacturing", adminOnly: false, settingKey: null, permission: null, eligible: Boolean(branchSession?.isAdmin) || hasAnyRole(branchSession, ["prosthetics_expert", "branch_manager"]) || permissions.canWorkAsExpert },
    { label: "التنبيهات", icon: Bell, href: "/notifications", adminOnly: false, settingKey: null, permission: null, eligible: alertEligible, badge: alertCount },
    //  **والمحذوفاتُ لمن يحذف ويستعيد** — مسؤولٌ أو مديرُ فرعٍ أو طبيب.
    //  بقاعدة الخادم `canTrashPatients` (المسؤول أو «حذف المرضى») — كانت قائمةَ أدوارٍ تُظهرها لكلّ طبيبٍ فيصله «غير مصرّح» (§4.ch).
    { label: TRASH_TITLE, icon: Trash2, href: "/patient-trash", adminOnly: false, settingKey: null, permission: null, eligible: trashEligible, badge: trashCount },
    //  للمسؤول بسلطته وحدها كالخادم — كان يُشترط معه علَمُ `canManageSettings` المخزَّن فيختفي عن مسؤولٍ أُنشئ بعد إزالته من النافذة.
    { label: t.sidebar.systemSettings, icon: Settings, href: "/admin", adminOnly: true, settingKey: null, permission: null },
  ];

  // Filter menu items based on admin status, branch settings, and permissions
  const menuItems = baseMenuItems.filter(item => {
    // Admin-only items are only shown to admin users
    if (item.adminOnly && !branchSession?.isAdmin) {
      return false;
    }
    
    //  لوحةُ التحكّم تُخفى عمّن **أدوارُه كلُّها** لها شاشةُ عملٍ أخرى (§4.ch) — القاعدةُ نفسُها التي تحوّله عنها (`App.tsx`).
    if (item.href === "/" && hidesDashboard(branchSession)) {
      return false;
    }

    //  **لا قوائمَ أدوارٍ في الشريط بعد اليوم** (§4.ch): كلُّ عنصرٍ يُحسم بالدالّة التي تحرس صفحتَه في الخادم (`eligible`)
    //  أو بعلَم صلاحيته — فلا يظهر عنصرٌ يفتح صفحةً تقول «غير مصرّح»، ولا يختفي عمّن يفتحها الخادمُ له.

    //  ══ **أهليّةٌ من دالّةٍ قانونية — لا قائمةَ أدوار** (تصحيحٌ لاحق) ═════
    //  عكسُ `roles` أعلاه تماماً: هذا العنصرُ (الآن «بانتظار الحسم» وحدها)
    //  لا يحمل قائمةَ أدوارٍ مكتوبةً هنا أصلاً — القرارُ بالكامل من محمولٍ
    //  جاهزٍ (`eligible`) حسبته الدالّةُ القانونية نفسُها التي تحرس النقطة.
    if (typeof (item as any).eligible === "boolean" && !(item as any).eligible) {
      return false;
    }

    // Check branch settings for non-admin users
    if (!branchSession?.isAdmin && item.settingKey && branchSettings) {
      const settingValue = branchSettings[item.settingKey];
      if (settingValue === false) {
        return false;
      }
    }
    
    // Check permissions — والمسؤولُ يمرّ بسلطته كالخادم (`isAdmin || العلَم`) إلّا ما لا معنى له بلا العلَم.
    if (item.permission && !permissions[item.permission]
      && !(branchSession?.isAdmin && !(item as any).noAdminBypass)) {
      // The accounting section is also reachable with the narrow
      // "add expenses" grant (expenses tab only) — not just full management.
      if (!(item.href === "/accounting" && permissions.canAddExpenses)) {
        return false;
      }
    }

    //  ══ **صفٌّ يختفي عند الصفر** (المرحلة الخامسة) ══════════════════════
    //  طابورٌ فارغ لا يستحقّ سطراً — لا الشارةَ وحدها. القيمةُ نفسُها التي
    //  يعرضها البادج (`badge`)، فلا مصدرَ عدٍّ ثانٍ يختلف عنه.
    if ((item as any).hideWhenZero && ((item as any).badge ?? 0) <= 0) {
      return false;
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

      {/*  **أسفلُ الشريط نحيف** (قرارُ المالك ٢٠٢٦-١٠-٠٦): كان أربعَ طبقاتٍ تغطّي جزءاً من القائمة المتحرّكة على الشاشات القصيرة.
          صار سطرين: مبدِّلُ الفرع (سطرٌ واحد، ظاهرٌ كما قرّر — §4.ay)، ثمّ المستخدمُ وأزرارُه الصغيرة والخروج. */}
      <div className="shrink-0 px-3 md:px-4 py-2 border-t border-border/50 bg-slate-50/50 space-y-1.5">
        {branchSession && <BranchSwitcher />}
        <div className="flex items-center gap-1.5 text-xs">
          {branchSession?.displayName && (
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {branchSession.isAdmin
                ? <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                : <User className="w-4 h-4 text-primary shrink-0" />}
              <div className="min-w-0 leading-tight">
                <div className="font-medium text-slate-700 truncate">{branchSession.displayName}</div>
                <div className="text-[10px] text-muted-foreground truncate"
                  title={rolesOf(branchSession).map((r) => t.roles[r as keyof typeof t.roles] || r).join(" + ")}>
                  {rolesOf(branchSession).map((r) => t.roles[r as keyof typeof t.roles] || r).join(" + ")}
                  {/*  اسمُ الفرع هنا لمن لا مبدِّلَ له وحده — فلا يتكرّر. */}
                  {!branchSwitcherVisible(branchSession) && branchSession.branchName
                    ? ` · ${t.branches[branchSession.branchName as keyof typeof t.branches] || branchSession.branchName}` : ""}
                </div>
              </div>
            </div>
          )}
          {/* Only a real staff account has a personal password to change;
              the legacy admin key changes its own from admin settings. */}
          {(branchSession as any)?.userId && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => setPasswordOpen(true)}
              title="تغيير كلمة السر"
              data-testid="button-change-password"
            >
              <KeyRound className="w-4 h-4 text-muted-foreground" />
            </Button>
          )}
          {branchSession && (
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
              className="h-7 w-7 shrink-0"
              data-testid="button-toggle-language"
              title={language === "ar" ? "Switch to English" : "التبديل إلى العربية"}
            >
              <Globe className="w-4 h-4" />
            </Button>
          )}
          <button
            onClick={() => {
              clearBranchSession();
              logout();
            }}
            className="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors duration-200"
            title={t.sidebar.logout}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">{language === "ar" ? "خروج" : t.sidebar.logout}</span>
          </button>
        </div>
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
          {/*  الفرعُ النشط ظاهرٌ في شريط الهاتف أيضاً — ويُبدَّل منه (§4.ay). */}
          <BranchSwitcher compact />
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
