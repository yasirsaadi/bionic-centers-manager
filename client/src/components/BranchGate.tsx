import { useState, useSyncExternalStore } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, Loader2, User, ShieldCheck, Building2, Clock, Globe, Eye, EyeOff } from "lucide-react";
import logoImage from "@/assets/logo.png";
import { useLanguage } from "@/i18n/LanguageContext";
import { useTranslation } from "@/i18n/LanguageContext";

const userOptions = [
  { value: "admin", label: "مسؤول النظام", labelEn: "System Admin", icon: ShieldCheck },
  { value: "baghdad", label: "بايونك بغداد", labelEn: "Bionic Baghdad", icon: Building2 },
  { value: "karbala", label: "الوارث كربلاء", labelEn: "Al-Warith Karbala", icon: Building2 },
  { value: "dhiqar", label: "بايونك ذي قار", labelEn: "Bionic Dhi Qar", icon: Building2 },
  { value: "mosul", label: "بايونك الموصل", labelEn: "Bionic Mosul", icon: Building2 },
  { value: "kirkuk", label: "بايونك كركوك", labelEn: "Bionic Kirkuk", icon: Building2 },
];

interface UserPermissions {
  canViewPatients: boolean;
  canAddPatients: boolean;
  canEditPatients: boolean;
  canDeletePatients: boolean;
  canViewPayments: boolean;
  canAddPayments: boolean;
  canEditPayments: boolean;
  canDeletePayments: boolean;
  canViewReports: boolean;
  canManageAccounting: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
  canManageSurveys: boolean;
}

interface BranchSession {
  branchId: number;
  branchName: string;
  isAdmin: boolean;
  userId?: number;
  role?: string;
  displayName?: string;
  permissions?: UserPermissions;
  shift?: string;
  language?: string;
  // Set on multi-branch users (branch_manager assigned to several
  // branches). The user can switch between any of these via a header
  // dropdown; switching updates branchId / branchName here and on
  // the server session.
  accessibleBranches?: number[];
}

interface BranchGateProps {
  children: React.ReactNode;
}

// ══ مخزنٌ مشتركٌ عابرٌ للمكوّنات (إصلاحٌ 2026-09-02) ═══════════════════════
// كانت `useBranchSession` تقرأ `localStorage` مرّةً واحدة داخل كل مكوّنٍ
// يستدعيها — نسخةٌ محليّة معزولة عن أيّ نسخةٍ أخرى مُركَّبة في الصفحة نفسها.
// فتحديثُ الصلاحيات من الخادم (`App.tsx: Router()`، أدناه) كان سيكتب
// `localStorage` وحده عبر أيّ نسخةٍ منفصلة كهذه، ولا يصل أيَّ مكوّنٍ آخر — لا بدّ
// من خروجٍ وعودة، أو إعادة تحميلٍ كاملة (كما يفعل `BranchSwitcher` اليوم
// لسببه الخاصّ)، ليرى المستخدمُ التغيير. وهذا بالضبط ما يخالف «صلاحيةٌ
// تتغيّر بلا خروجٍ وعودة».
//
// فصار كائناً وحيداً على مستوى الوحدة (module-level)، يُكتَب عليه من نقطةٍ
// واحدة (`setBranchSession`)، وتشترك فيه كلُّ نسخةٍ من `useBranchSession()`
// عبر `useSyncExternalStore` — تحديثٌ واحد يصل الجميع فوراً، بلا Context
// جديد يُغلَّف حوله شجرةُ المكوّنات، وبلا WebSocket ولا بنية جلساتٍ كبيرة.
let cachedSession: BranchSession | null = readStoredSession();
const sessionListeners = new Set<() => void>();

function readStoredSession(): BranchSession | null {
  const stored = localStorage.getItem("branch_session");
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    localStorage.removeItem("branch_session");
    return null;
  }
}

function notifySessionListeners() {
  sessionListeners.forEach((listener) => listener());
}

function subscribeToSession(listener: () => void) {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

function getSessionSnapshot(): BranchSession | null {
  return cachedSession;
}

/**
 * قراءةٌ مباشرة للجلسة الحالية خارج React — لِمَن يحتاج **يدمج** فوقها
 * (مثل أثر المزامنة في `App.tsx: Router()`) لا مَن يعرضها فقط (ذاك
 * يستعمل `useBranchSession()` كي يُعاد عرضه عند كل تغيير).
 */
export function getBranchSession(): BranchSession | null {
  return cachedSession;
}

/** يكتب الجلسةَ (دخولٌ جديد، أو تحديثٌ حيّ) ويُخطر كل مستهلكٍ فوراً. */
export function setBranchSession(session: BranchSession | null) {
  cachedSession = session;
  if (session) localStorage.setItem("branch_session", JSON.stringify(session));
  else localStorage.removeItem("branch_session");
  notifySessionListeners();
}

// ══ مَن يُحدِّث الصلاحياتِ فعلياً؟ `useAuth()` — لا نداءُ شبكةٍ ثانٍ هنا
// (إصلاحٌ 2026-09-02) ══════════════════════════════════════════════════
// `client/src/hooks/use-auth.ts` يجلب `GET /api/auth/user` عبر
// react-query أصلاً — وهي البنية القائمة التي تُعيد الجلبَ عند كل تحميلٍ
// جديد للصفحة (لا كاش يعبر إعادة تحميل) وعند عودة تركيز النافذة
// (`refetchOnWindowFocus: "always"` أُضيفت لهذا الاستعلام بعينه هناك).
// بناءُ آليّةِ جلبٍ ثانية هنا (بـ`fetch` خام + مستمع `focus` خاصّ) كان
// سيُضاعف نداءَ الشبكة لكل تحديث بلا داعٍ — نسخةٌ ثانية من نفس الوظيفة.
//
// فبدل ذلك: `App.tsx: Router()` يستهلك `useAuth()` (كان يستهلكها أصلاً
// لبوّابة `isLoading`) ويُزامن نتيجتها إلى هذا المخزن عبر `setBranchSession`
// في أثرٍ واحد — بما فيه مسحُ الجلسة المحليّة حين تعود `user: null` بعد
// ٤٠١ (تحصينُ المِعترِضة الحيّة في `server/routes.ts`: صفُّ المستخدم حُذف
// أو عُطِّل). فمصدرُ الجلب واحدٌ، ومصدرُ الكتابة على هذا المخزن واحد
// (`setBranchSession`)، ولا نسخةَ ثانية من أيٍّ منهما.

export function useBranchSession(): BranchSession | null {
  return useSyncExternalStore(subscribeToSession, getSessionSnapshot);
}

export function clearBranchSession() {
  setBranchSession(null);
  localStorage.removeItem("admin_verified");
  window.location.reload();
}

export function BranchGate({ children }: BranchGateProps) {
  const { setLanguage } = useLanguage();
  const { t, language, dir } = useTranslation();
  //  ══ بوّابةُ الدخول تقرأ المخزنَ المشترك نفسَه (إصلاحٌ 2026-09-02) ═════
  //  كانت تحمل نسخةً محليّةً منفصلة (`useState` + قراءةُ `localStorage`
  //  الخاصّة بها)، فحتى لو تحدّث المخزنُ المشترك (تسجيلُ دخولٍ يكتبه
  //  `setBranchSession`، أو جلسةٌ أُنهيت من الخادم عبر أثر المزامنة في
  //  `App.tsx: Router()` عند حساب مُعطَّل) كانت هذه البوّابةُ لا تعلم —
  //  تبقى تعرض المحتوى القديم أو شاشةَ الدخول القديمة حتى إعادة تحميلٍ يدوية.
  //  فصارت تستهلك `useBranchSession()` مباشرةً: نفسُ مصدر الحقيقة الذي
  //  يقرؤه كلُّ مكوّنٍ آخر، فتتوافق البوّابةُ ومحتواها دائماً. **ولا حاجةَ
  //  لـ`isChecking` بعد اليوم**: `useSyncExternalStore` يُرجع القيمةَ
  //  المُهيَّأة من `localStorage` من أوّل عرضٍ (تهيئتُها تقع عند تحميل
  //  الوحدة، قبل أوّل عرض) — لا فجوةً غير متزامنة تحتاج طيفَ تحميل.
  const session = useBranchSession();
  const [selectedBranch, setSelectedBranch] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedShift, setSelectedShift] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/verify-branch", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          branchKey: selectedBranch,
          username: username.toLowerCase().trim(), 
          password,
          shift: selectedShift
        }),
        credentials: "include",
      });
      
      const data = await res.json();
      
      if (res.ok) {
        const effectiveLanguage = language || data.language || "ar";
        const branchSession: BranchSession = {
          branchId: data.branchId,
          branchName: data.branchName,
          isAdmin: data.isAdmin,
          userId: data.userId,
          role: data.role,
          displayName: data.displayName,
          permissions: data.permissions,
          shift: data.shift,
          language: effectiveLanguage,
          accessibleBranches: Array.isArray(data.accessibleBranches) ? data.accessibleBranches : undefined,
        };
        setBranchSession(branchSession);
        setLanguage(effectiveLanguage as "ar" | "en");

        if (data.isAdmin) {
          localStorage.setItem("admin_verified", "true");
        }
      } else {
        setError(data.message || t.login.errorInvalid);
      }
    } catch (err) {
      console.error("Branch verification error:", err);
      setError(t.login.errorGeneral);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (session) {
    return <>{children}</>;
  }

  const isRtl = dir === "rtl";
  const iconPosition = isRtl ? "right-3" : "left-3";
  const inputPadding = isRtl ? "pr-10" : "pl-10";

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4" dir={dir}>
      <Card className="p-6 sm:p-8 w-full max-w-md rounded-2xl shadow-xl border-0 mx-auto">
        <div className="flex justify-end mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
            data-testid="button-login-language-toggle"
            title={language === "ar" ? "English" : "العربية"}
          >
            <Globe className="w-5 h-5" />
          </Button>
        </div>
        <div className="text-center mb-8">
          <img src={logoImage} alt="Bionic Logo" className="w-28 h-28 sm:w-32 sm:h-32 object-contain mx-auto mb-4" />
          <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-800 text-center">{t.login.title}</h1>
          <p className="text-muted-foreground mt-2">{t.login.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t.login.branch}</label>
            <Select value={selectedBranch} onValueChange={(val) => { setSelectedBranch(val); if (val !== "admin") setSelectedShift("auto"); else setSelectedShift(""); }}>
              <SelectTrigger className="h-12" data-testid="select-branch-login">
                <SelectValue placeholder={t.login.selectBranch} />
              </SelectTrigger>
              <SelectContent>
                {userOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center gap-2">
                      <option.icon className="w-4 h-4 text-primary" />
                      {language === "en" ? option.labelEn : option.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t.login.username}</label>
            <div className="relative">
              <User className={`absolute ${iconPosition} top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground`} />
              <Input
                type="text"
                placeholder={t.login.usernamePlaceholder}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`${inputPadding} h-12`}
                autoComplete="username"
                data-testid="input-username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t.login.password}</label>
            <div className="relative">
              <Lock className={`absolute ${iconPosition} top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground`} />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={t.login.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputPadding} h-12 ${dir === "rtl" ? "pl-10" : "pr-10"}`}
                autoComplete="current-password"
                data-testid="input-branch-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className={`absolute ${dir === "rtl" ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground`}
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                tabIndex={-1}
                data-testid="button-toggle-password"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {selectedBranch && selectedBranch !== "admin" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t.login.shift}</label>
              <div className="relative">
                <Clock className={`absolute ${iconPosition} top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10`} />
                <Select value={selectedShift} onValueChange={setSelectedShift}>
                  <SelectTrigger className={`${inputPadding} h-12`} data-testid="select-shift">
                    <SelectValue placeholder={t.login.selectShift} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t.login.shiftAuto}</SelectItem>
                    <SelectItem value="morning">{t.login.shiftMorning}</SelectItem>
                    <SelectItem value="evening">{t.login.shiftEvening}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          <Button 
            type="submit" 
            className="w-full h-12 text-lg gap-2" 
            disabled={!selectedBranch || !username || !password || isSubmitting}
            data-testid="button-branch-login"
          >
            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
            {t.login.login}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          {t.login.footer}
        </p>
      </Card>
    </div>
  );
}
