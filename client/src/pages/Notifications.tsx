import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useBranchSession } from "@/components/BranchGate";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";
import { SERVICE_TYPE_LABELS, STAGE_LABELS } from "@shared/manufacturing";
import {
  NOTIFICATION_SECTIONS, sectionOf, isLateSection, type AlertKind, type SectionKey,
} from "./notifications_sections";

interface AlertItem {
  orderId: number;
  patientId: number;
  patientName: string;
  serviceType: string;
  expertUserId: number | null;
  expertName: string | null;
  branchId: number | null;
  branchName: string | null;
  expectedDeliveryDate: string;
  currentStage: string;
  status: string;
  days: number;
  kind: AlertKind;
  /**
   * العذرُ المكتوب على الأمر — آخرُ سببٍ كُتب من «توقّف / مشكلة»، ويبقى
   * بعد استئناف العمل (٢٠٢٦-٠٩-٢٤). فارغٌ لأمرٍ لم يُكتب له سبب — فلا
   * عذرَ يُخترَع له. **ومنه وحدَه يُقرَّر القسم** (`sectionOf`)، لا من اسمه.
   */
  holdReasonCode: string | null;
  holdReasonLabel: string | null;
  holdNote: string | null;
}

const ALL_BRANCHES = "__all__";
const ALL_EXPERTS = "__all__";

//  أيقونةُ كلّ قسم — والأقسامُ نفسُها وقرارُ انتماء التنبيه إليها في
//  `notifications_sections.ts` (منطقٌ خالص يُختبَر، لا يعيش داخل المكوّن).
const SECTION_ICONS: Record<SectionKey, any> = {
  overdue: AlertTriangle,
  overdue_excused: AlertTriangle,
  due_today: CalendarClock,
  due_tomorrow: CalendarClock,
  due_in_2_days: CalendarClock,
  completed: CheckCircle2,
};

function fmtDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

// Delivery alerts — computed live from manufacturing work orders. Alerts fire
// at D-2, D-1 and delivery day for unfinished orders, stay on while overdue,
// and switch to a green "completed" entry once the expert marks delivery.
export default function Notifications() {
  const session = useBranchSession();
  const canOpenOrder = session?.isAdmin || session?.role === "branch_manager" || session?.role === "prosthetics_expert";

  const { data, isLoading } = useQuery<{ alertCount: number; items: AlertItem[] }>({
    queryKey: ["/api/manufacturing/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/manufacturing/notifications", { credentials: "include" });
      if (!res.ok) return { alertCount: 0, items: [] };
      return res.json();
    },
    refetchInterval: 5 * 60_000,
  });

  const allItems = data?.items ?? [];

  //  ══ **فلترةٌ بالفرع والخبير — على ما وصل فعلاً، لا نداءً ثانياً**
  //  (تحكّمُ تباين تنبيهات التسليم، 2026-08-31) ═══════════════════════════
  //  الخادمُ يُرجع أصلاً كلَّ ما يملك المستخدمُ صلاحيةَ رؤيته (خبيرٌ محضٌ
  //  ⟶ أوامرُه هو فقط، مديرٌ ⟶ فروعُه، ... إلخ — `server/manufacturing/
  //  routes.ts`). فالفلترةُ هنا تضييقٌ على شاشته وحدها فوق بياناتٍ مأذونةٍ
  //  أصلاً — لا استعلامَ خادمٍ جديد، ولا احتمالَ تسريب: خيارا «كلّ
  //  الفروع/الخبراء» مُشتقّان من العناصر المُرجَعة نفسِها لا من قائمةٍ
  //  مستقلّة، فلا يظهر فرعٌ أو خبيرٌ لم يصل أصلاً ضمن نطاق المستخدم.
  const [branchFilter, setBranchFilter] = useState(ALL_BRANCHES);
  const [expertFilter, setExpertFilter] = useState(ALL_EXPERTS);

  const branchOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const i of allItems) if (i.branchId != null) map.set(i.branchId, i.branchName ?? String(i.branchId));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], "ar"));
  }, [allItems]);

  const expertOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const i of allItems) if (i.expertUserId != null) map.set(i.expertUserId, i.expertName ?? String(i.expertUserId));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], "ar"));
  }, [allItems]);

  const items = allItems.filter((i) =>
    (branchFilter === ALL_BRANCHES || String(i.branchId) === branchFilter)
    && (expertFilter === ALL_EXPERTS || String(i.expertUserId) === expertFilter)
  );

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary" />
          التنبيهات
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          مواعيد تسليم الأطراف والمساند: تنبيه قبل يومين، وقبل يوم، وفي يوم التسليم — ويتحوّل أخضر عند اكتمال التصنيع.
        </p>
      </div>

      {(branchOptions.length > 0 || expertOptions.length > 0) && (
        <div className="flex flex-wrap gap-3 mb-4">
          {branchOptions.length > 0 && (
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-notifications-branch">
                <SelectValue placeholder="الفرع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_BRANCHES}>كل الفروع</SelectItem>
                {branchOptions.map(([id, name]) => (
                  <SelectItem key={id} value={String(id)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {expertOptions.length > 0 && (
            <Select value={expertFilter} onValueChange={setExpertFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-notifications-expert">
                <SelectValue placeholder="الخبير" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_EXPERTS}>كل الخبراء</SelectItem>
                {expertOptions.map(([id, name]) => (
                  <SelectItem key={id} value={String(id)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">جارٍ التحميل…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {allItems.length === 0
            ? "لا توجد تنبيهات حالياً — لا مواعيد تسليم قريبة أو متأخرة. 👍"
            : "لا نتائج تطابق هذا الفلتر."}
        </div>
      ) : (
        <div className="space-y-6">
          {NOTIFICATION_SECTIONS.map(({ key, title, tone, iconTone }) => {
            //  **القسمُ من `sectionOf` وحدها** — تعريفُ لوحة التصنيع نفسُه
            //  (`latenessOf`)، فلا يقع متأخرٌ بعذرٍ تحت «متأخرة بدون عذر».
            const list = items.filter((i) => sectionOf(i) === key);
            if (list.length === 0) return null;
            const Icon = SECTION_ICONS[key];
            const late = isLateSection(key);
            const excused = key === "overdue_excused";
            return (
              <div key={key}>
                <h2 className="text-sm font-bold mb-2 flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${iconTone}`} />
                  {title}
                  <Badge variant="secondary" className="text-xs">{list.length}</Badge>
                </h2>
                <div className="space-y-2">
                  {list.map((i) => {
                    const card = (
                      <Card className={`${tone} ${canOpenOrder ? "hover:shadow-sm transition-shadow cursor-pointer" : ""}`}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="min-w-0">
                              <div className="font-semibold">{i.patientName}</div>
                              <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                                <span>{SERVICE_TYPE_LABELS[i.serviceType as "prosthetic"] ?? i.serviceType}</span>
                                <span>الخبير: {i.expertName ?? "—"}</span>
                                {i.branchName && <span>الفرع: {i.branchName}</span>}
                                <span>المرحلة: {STAGE_LABELS[i.currentStage] ?? i.currentStage}</span>
                              </div>
                              {/* سببُ التأخير — في قسم «متأخرة بعذر» وحدَه، وهو ما وضعه فيه (لا استنتاج) */}
                              {excused && (
                                <div className="text-xs text-amber-800 bg-amber-100 border border-amber-200 rounded px-2 py-1 mt-1.5 inline-block">
                                  سببُ التأخير: {i.holdReasonLabel}
                                  {i.holdNote && <span className="text-amber-700"> — {i.holdNote}</span>}
                                </div>
                              )}
                            </div>
                            <div className="text-left">
                              <div className="text-xs font-medium">{fmtDate(i.expectedDeliveryDate)}</div>
                              {late && (
                                <Badge
                                  className={`mt-1 text-xs ${excused ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-red-100 text-red-800 border-red-200"}`}
                                >
                                  متأخر {Math.abs(i.days)} يوم
                                </Badge>
                              )}
                              {key === "completed" && (
                                <Badge className="mt-1 text-xs bg-green-100 text-green-800 border-green-200">
                                  ✓ مكتمل
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                    return canOpenOrder ? (
                      <Link key={i.orderId} href={`/manufacturing/orders/${i.orderId}`}>{card}</Link>
                    ) : (
                      <div key={i.orderId}>{card}</div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
