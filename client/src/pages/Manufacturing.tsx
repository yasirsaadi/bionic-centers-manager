import { useMemo, useState } from "react";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useBranchSession } from "@/components/BranchGate";
import { usePermissions } from "@/hooks/usePermissions";
import { resolveManufacturingView } from "./manufacturing_view_mode";
import {
  bucketCounts, ordersInBucket, nextBucket, bucketDef, type BucketTone,
} from "./manufacturing_buckets";
import { rowToneOf } from "./manufacturing_row_tone";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Wrench, Search, AlertTriangle, PlusCircle } from "lucide-react";
import {
  STAGE_LABELS, STATUS_LABELS, STATUSES, SERVICE_TYPE_LABELS, REASON_CODE_LABELS, BUILD_STAGES,
} from "@shared/manufacturing";
import { CreateOrderDialog } from "@/components/manufacturing/CreateOrderDialog";

interface OrderCard {
  id: number; patientId: number; patientName: string; branchId: number; branchName: string | null;
  serviceType: string; itemType: string | null; currentStage: string; status: string;
  expertUserId: number; expertName: string | null; assignedAt: string | null; startedAt: string | null;
  expectedDeliveryDate: string | null; completedAt: string | null; finalResult: string | null;
  reworkCount: number; daysInStage: number; isOverdue: boolean;
  //  سببُ التوقّف الحاليّ — يرسله `listOrders` منذ ٢٠٢٦-٠٨-٣١،
  //  وكانت الشاشةُ تُسقطه فلا تعرف متأخّراً بعذرٍ من متأخّرٍ بلا عذر.
  holdReasonCode: string | null; holdNote: string | null;
}

interface Branch { id: number; name: string; }

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-IQ", { year: "numeric", month: "short", day: "numeric" });
}

function statusTone(status: string): string {
  if (status === "completed") return "bg-green-100 text-green-800 border-green-200";
  if (status === "cancelled") return "bg-slate-100 text-slate-600 border-slate-200";
  if (status === "technical_rework") return "bg-red-100 text-red-800 border-red-200";
  if (status.startsWith("waiting") || status === "medical_hold") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-blue-100 text-blue-800 border-blue-200";
}

//  ألوانُ شرائط التصنيف — **سلاسلُ أصنافٍ كاملة لا مركَّبة**: ماسحُ
//  أدوات التنسيق يقرأ النصَّ الحرفيّ، فاسمٌ يُبنى بالدمج لا يصل الحزمةَ
//  فيخرج الشريطُ بلا لون.
const CHIP_TONE: Record<BucketTone, string> = {
  blue: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200",
  red: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
  green: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
};
const CHIP_RING: Record<BucketTone, string> = {
  blue: "ring-blue-500",
  amber: "ring-amber-500",
  red: "ring-red-500",
  green: "ring-green-500",
};

//  ══ صفُّ الأمر — اللونُ يقول الحالةَ، والاسمُ يُقرأ أوّلاً ══════════════
//  كان الاسمُ محشوراً في سطرٍ واحد مع الشارات فينضغط على الهاتف، وكان
//  اللونُ حاشيةً حمراء رفيعة للمتأخّر وحده — فلا يفرّق بين متأخّرٍ بعذرٍ
//  ومتأخّرٍ بلا عذر. والقرارُ كلُّه في `manufacturing_row_tone` ليُختبَر
//  دخلاً وخرجاً، فلا قاعدةَ لونٍ ثانيةٌ مكتوبةٌ هنا.
function OrderRow({ o }: { o: OrderCard }) {
  const t = rowToneOf(o);
  return (
    <Link href={`/manufacturing/orders/${o.id}`}>
      <Card className={`hover:shadow-sm transition-shadow cursor-pointer ${t.cardClass}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              {/* الاسمُ سطرٌ قائمٌ بذاته — لا ينضغط بين الشارات */}
              <div className="text-base font-bold leading-tight break-words">{o.patientName}</div>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <Badge variant="outline" className="text-xs">{SERVICE_TYPE_LABELS[o.serviceType as "prosthetic"] ?? o.serviceType}</Badge>
                {o.itemType && <span className="text-xs text-muted-foreground">{o.itemType}</span>}
                {o.isOverdue && (
                  <Badge className={`text-xs gap-1 ${t.overdueBadgeClass}`}>
                    <AlertTriangle className="w-3 h-3" /> {t.overdueBadgeLabel}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span>الفرع: {o.branchName ?? "—"}</span>
                <span>الخبير: {o.expertName ?? "—"}</span>
                <span>الإسناد: {fmtDate(o.assignedAt)}</span>
                <span>التسليم المتوقّع: {fmtDate(o.expectedDeliveryDate)}</span>
                <span>في المرحلة منذ {o.daysInStage} يوم</span>
                {o.reworkCount > 0 && <span>إعادة عمل فني: {o.reworkCount}</span>}
              </div>
              {/* السببُ كاملاً — لا يظهر إلّا حين يحمله الأمرُ فعلاً (لا استنتاج) */}
              {t.reason && (
                <div className="text-xs text-amber-800 bg-amber-100 border border-amber-200 rounded px-2 py-1 mt-1.5 inline-block">
                  {t.reason.prefix}: {t.reason.label}
                  {t.reason.note && <span className="text-amber-700"> — {t.reason.note}</span>}
                </div>
              )}
            </div>
            <div className="text-left flex flex-col items-end gap-1 shrink-0">
              <Badge variant="outline" className={`text-xs ${statusTone(o.status)}`}>{STATUS_LABELS[o.status] ?? o.status}</Badge>
              <span className="text-xs font-medium text-slate-700">{STAGE_LABELS[o.currentStage] ?? o.currentStage}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Manufacturing() {
  const session = useBranchSession();
  const permissions = usePermissions();
  //  **الدورُ وحدَه لا يكفي**: الشريطُ الجانبيُّ و`my-orders` يقبلان
  //  `canWorkAsExpert` كذلك، فكانت الصفحةُ وحدها تقرأ الدورَ فتُرسل
  //  صاحبَ القدرة إلى `/orders` فيرى لوحةً فارغة. والقرارُ صار في
  //  `manufacturing_view_mode` ليُختبَر دخلاً وخرجاً.
  const { isAdmin, isManager, expertOnly, endpoint } = resolveManufacturingView({
    isAdmin: session?.isAdmin,
    role: session?.role,
    canWorkAsExpert: permissions.canWorkAsExpert,
  });
  const accessible = session?.accessibleBranches ?? [];

  const [search, setSearch] = useState("");
  //  البحث يقع في الخادم، فيُهدَّأ بنفس مهلة سجلّ المرضى.
  const debouncedSearch = useDebouncedSearch(search);
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expertFilter, setExpertFilter] = useState<string>("all");
  //  التصنيفُ المختار من الشرائط — `null` يعني «كلَّها». وهو **فوق**
  //  مرشِّحات الخادم لا بدلاً منها، فيتركّب مع الخبير والفرع والبحث.
  const [bucket, setBucket] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    enabled: isAdmin || isManager,
  });

  // Build the server query string from active filters.
  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (debouncedSearch) p.set("search", debouncedSearch);
    if (serviceFilter !== "all") p.set("serviceType", serviceFilter);
    if (stageFilter !== "all") p.set("stage", stageFilter);
    if (statusFilter !== "all") p.set("status", statusFilter);
    if (branchFilter !== "all") p.set("branchId", branchFilter);
    if (!expertOnly && expertFilter !== "all") p.set("expertUserId", expertFilter);
    return p.toString();
  }, [debouncedSearch, serviceFilter, stageFilter, statusFilter, branchFilter, expertFilter, expertOnly]);

  const { data: orders = [], isLoading } = useQuery<OrderCard[]>({
    queryKey: [endpoint, qs],
    queryFn: async () => {
      const res = await fetch(`${endpoint}?${qs}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: overview } = useQuery<any>({
    queryKey: ["/api/manufacturing/overview", branchFilter],
    queryFn: async () => {
      const p = branchFilter !== "all" ? `?branchId=${branchFilter}` : "";
      const res = await fetch(`/api/manufacturing/overview${p}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAdmin || isManager,
  });

  // Client-side buckets (from the fetched list) for the summary chips.
  const nowMonth = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" }).slice(0, 7);
  //  **العددُ والقائمةُ من مصدرٍ واحد** (`manufacturing_buckets`): الشريطُ
  //  يقول «متأخرون ٢١» وضغطُه يعرض الواحدَ والعشرين بعينهم — لأن كليهما
  //  من `orders` نفسِها بعد مرشِّحات الخادم.
  const chips = useMemo(() => bucketCounts(orders, nowMonth), [orders, nowMonth]);
  const visibleOrders = useMemo(
    () => ordersInBucket(orders, bucket, nowMonth), [orders, bucket, nowMonth]);
  const activeBucket = bucketDef(bucket);

  const experts: { expertUserId: number; expertName: string }[] = overview?.experts ?? [];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto" dir="rtl">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="w-6 h-6 text-primary" />
            تصنيع الأطراف والمساند
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {expertOnly ? "الحالات المسندة إليك — تابع مراحل التصنيع وسجّل إعادة العمل والنتائج."
              : "متابعة أوامر التصنيع، مراحلها، وإعادات العمل."}
          </p>
        </div>
        {(isAdmin || isManager) && (
          <Button onClick={() => setCreateOpen(true)} className="gap-1">
            <PlusCircle className="w-4 h-4" /> أمر تصنيع لمريض موجود
          </Button>
        )}
      </div>

      {/* Admin/manager overview —
          «متأخرة» كانت رقماً واحداً يخلط مَن كتب خبيرُه عذرَه بمَن لم يكتب،
          فانقسمت اثنين بقرار المالك (٢٠٢٦-٠٩-٢٤): الأحمرُ بدون عذرٍ وحدَه،
          والكهرمانيُّ بعذر — ومجموعُهما الرقمُ القديم بالضبط. */}
      {(isAdmin || isManager) && overview && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-5">
          <StatTile label="إجمالي الأوامر" value={overview.totals.total} />
          <StatTile label="جاهز للتسليم" value={overview.totals.ready} tone="green" />
          <StatTile label="متأخرة بدون عذر" value={overview.totals.overdue} tone="red" />
          <StatTile label="متأخرة بعذر" value={overview.totals.overdueExcused} tone="amber" />
          <StatTile label="لم تتحرّك ≥14 يوم" value={overview.totals.stale} tone="amber" />
          <StatTile label="مكتملة" value={overview.totals.completed} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث باسم المريض…" className="pr-9" />
        </div>
        {(isAdmin || isManager) && (
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="الفرع" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفروع</SelectItem>
              {branches.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {expertOnly && accessible.length > 1 && (
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="الفرع" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل فروعي</SelectItem>
              {accessible.map((b) => <SelectItem key={b} value={String(b)}>#{b}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {(isAdmin || isManager) && experts.length > 0 && (
          <Select value={expertFilter} onValueChange={setExpertFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="الخبير" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الخبراء</SelectItem>
              {experts.map((e) => <SelectItem key={e.expertUserId} value={String(e.expertUserId)}>{e.expertName}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="النوع" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأنواع</SelectItem>
            <SelectItem value="prosthetic">أطراف صناعية</SelectItem>
            <SelectItem value="medical_support">مساند طبية</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="المرحلة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المراحل</SelectItem>
            {BUILD_STAGES.map((st) => <SelectItem key={st} value={st}>{STAGE_LABELS[st]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/*  ══ **شرائطُ التصنيف — تُضغَط فتُرشِّح** (٢٠٢٦-٠٩-٢٤) ══════════════
          كانت تعدّ ولا تُضغَط. وهي الآن أزرارٌ ملوّنةٌ بمعنى حالتها،
          **تتركّب فوق مرشِّحات الخادم**: «عناد» ثمّ «متأخرون» ⟶ متأخرو
          عناد وحدهم. والضغطةُ الثانية على الشريط نفسِه تُلغي اختيارَه. */}
      <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="تصنيفات أوامر التصنيع">
        {chips.map(({ def, count }) => {
          const on = bucket === def.key;
          return (
            <button
              key={def.key}
              type="button"
              aria-pressed={on}
              data-testid={`chip-bucket-${def.key}`}
              onClick={() => setBucket((cur) => nextBucket(cur, def.key))}
              className={[
                "text-xs px-3 py-2.5 sm:py-1.5 rounded-lg border flex items-center gap-1.5",
                "transition-colors cursor-pointer",
                CHIP_TONE[def.tone],
                on ? `ring-2 ring-offset-1 font-bold ${CHIP_RING[def.tone]}` : "",
              ].join(" ")}
            >
              <span>{def.label}</span>
              <span className="font-bold">{count}</span>
              {on && <span aria-hidden className="opacity-70">✕</span>}
            </button>
          );
        })}
        {activeBucket && (
          <button
            type="button"
            data-testid="chip-bucket-clear"
            onClick={() => setBucket(null)}
            className="text-xs px-3 py-2.5 sm:py-1.5 rounded-lg border bg-white text-slate-600 hover:bg-slate-50"
          >
            إظهار الكل
          </button>
        )}
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">جارٍ التحميل…</div>
      ) : visibleOrders.length === 0 ? (
        //  **ويُقال أيُّ تصنيفٍ أفرغ الشاشة** ومعه بابُ الخروج منه — وإلّا
        //  قرأ الموظّفُ «لا توجد أوامر» وظنّ أن العمل اختفى.
        <div className="text-center py-12 text-muted-foreground text-sm">
          {activeBucket ? (
            <>
              <div>لا توجد أوامر ضمن «{activeBucket.label}» بهذه المرشِّحات.</div>
              <button
                type="button"
                onClick={() => setBucket(null)}
                className="mt-2 text-primary underline underline-offset-4"
              >
                إظهار كل الأوامر
              </button>
            </>
          ) : "لا توجد أوامر مطابقة."}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleOrders.map((o) => <OrderRow key={o.id} o={o} />)}
        </div>
      )}

      {/* Admin/manager: per-expert comparison + top rework reasons */}
      {(isAdmin || isManager) && overview && overview.experts.length > 0 && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-sm mb-3">مقارنة الخبراء</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground border-b">
                      <th className="text-right py-2">الخبير</th>
                      <th className="py-2">قيد العمل</th>
                      <th className="py-2">مكتمل</th>
                      <th className="py-2">متأخر بدون عذر</th>
                      <th className="py-2">متأخر بعذر</th>
                      {/* عمودٌ واحد من `reworks` الذي يحسبه `getOverview` — كان هنا عمودا
                          «إعادة قالب» و«إعادة سوكت» يقرآن حقلين لا يحسبهما الخادم
                          فيظهران فارغين دائماً (§4.ao). */}
                      <th className="py-2">إعادات العمل</th>
                      <th className="py-2">نجاح أول تجربة</th>
                      <th className="py-2">متوسط المدة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.experts.map((e: any) => (
                      <tr key={e.expertUserId} className="border-b last:border-0 text-center">
                        <td className="text-right py-2 font-medium">{e.expertName}</td>
                        <td>{e.active}</td>
                        <td>{e.completed}</td>
                        <td className={e.overdue > 0 ? "text-red-600 font-bold" : ""}>{e.overdue}</td>
                        <td className={e.overdueExcused > 0 ? "text-amber-700 font-bold" : ""}>{e.overdueExcused}</td>
                        <td>{e.reworks}</td>
                        <td>{e.firstFitRate != null ? `${e.firstFitRate}%` : "—"}</td>
                        <td>{e.avgDurationDays != null ? `${e.avgDurationDays} يوم` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-sm mb-3">أكثر أسباب إعادة العمل</h3>
              {overview.topReasons.length === 0 ? (
                <p className="text-xs text-muted-foreground">لا توجد بيانات.</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {overview.topReasons.map((r: any) => (
                    <li key={r.code} className="flex justify-between border-b last:border-0 py-1">
                      <span>{REASON_CODE_LABELS[r.code] ?? r.code}</span>
                      <span className="font-bold">{r.count}</span>
                    </li>
                  ))}
                </ul>
              )}
              {isAdmin && overview.branches?.length > 0 && (
                <>
                  <h3 className="font-bold text-sm mt-4 mb-2">مقارنة الفروع</h3>
                  <ul className="space-y-1 text-xs">
                    {overview.branches.map((b: any) => (
                      <li key={b.branchId} className="flex justify-between border-b last:border-0 py-1">
                        <span>{b.branchName}</span>
                        <span className="text-muted-foreground">إجمالي {b.total} • مكتمل {b.completed} • متأخر بدون عذر {b.overdue} • متأخر بعذر {b.overdueExcused}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {(isAdmin || isManager) && (
        <CreateOrderDialog open={createOpen} onOpenChange={setCreateOpen} branches={branches} isAdmin={isAdmin} />
      )}
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone?: "green" | "red" | "amber" }) {
  const color = tone === "green" ? "text-green-700" : tone === "red" ? "text-red-700" : tone === "amber" ? "text-amber-700" : "text-slate-800";
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}
