// شريطُ «خصم بانتظار الاعتماد» في ملفّ المريض.
//
// ══ لماذا يظهر في الملفّ لا في الطابور وحده ═════════════════════════════
// الموظّف الذي أرسل الطلب يفتح ملفَّ المريض بعد يومين فيراه بلا كلفةٍ وبلا
// أمر تصنيع، فيظنّ أن حفظَه ضاع فيعيد الإدخال — أو يتّصل بالمريض ليعتذر.
// والسطرُ هنا يقول له **لماذا الملفُّ ساكن**: الخدمةُ موقوفةٌ بانتظار قرار،
// ومَن طلبها ومتى.
//
// **ولا يعرض شيئاً لم يقع**: يظهر للمعلَّق وحده، ويختفي بمجرّد الحسم —
// فالمعتمَدُ صار كلفةً حقيقيةً تُقرأ في مكانها من الملفّ.

import { useQuery } from "@tanstack/react-query";
import { BadgePercent, HeartHandshake } from "lucide-react";
import { discountReasonLabel, FREE_DONATION_LABEL } from "@shared/discount";
import { PriceTransition } from "@/components/PriceTransition";
import { DEPARTMENT_LABELS } from "@shared/service_taxonomy";

interface Row {
  id: number; department: string; originalPrice: number; proposedFinalPrice: number;
  discountAmount: number; discountPercentage: number; isFree: boolean;
  reason: string; note: string | null; status: string;
  requestedByName: string | null; requestedAt: string;
}

const money = (n: number) => Number(n || 0).toLocaleString("en-US");

const fmt = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? ""
    : d.toLocaleString("ar-IQ", { dateStyle: "medium", timeStyle: "short" });
};

export function PendingDiscountBanner({ patientId }: { patientId: number }) {
  const { data } = useQuery<{ requests: Row[] }>({
    queryKey: [`/api/discounts/patient/${patientId}`],
    queryFn: async () => {
      const res = await fetch(`/api/discounts/patient/${patientId}`, { credentials: "include" });
      if (!res.ok) return { requests: [] };
      return res.json();
    },
  });
  const pending = (data?.requests ?? []).filter((r) => r.status === "pending");
  if (pending.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="pending-discount-banner">
      {pending.map((r) => (
        <div key={r.id}
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          data-testid={`pending-discount-${r.id}`}>
          <div className="flex items-center gap-2 font-bold">
            {r.isFree ? <HeartHandshake className="w-4 h-4" /> : <BadgePercent className="w-4 h-4" />}
            {r.isFree ? "خدمة مجّانية بانتظار الاعتماد" : "خصم بانتظار الاعتماد"}
            <span className="font-normal text-xs">
              — {DEPARTMENT_LABELS[r.department as keyof typeof DEPARTMENT_LABELS] ?? r.department}
            </span>
          </div>
          <p className="mt-1">
            {r.isFree ? (
              <>تبرّع بقيمة <b className="font-mono">{money(r.originalPrice)}</b> د.ع
                {" "}({FREE_DONATION_LABEL}).</>
            ) : (
              <>{/*  السهمُ في وحدةٍ معزولةٍ من اليسار لليمين، فلا يقلبه
                     اتجاهُ الصفحة فيُقرأ الخصمُ ارتفاعاً. */}
                <PriceTransition from={r.originalPrice} to={r.proposedFinalPrice}
                  testId={`pending-discount-${r.id}-transition`} /> د.ع
                {" "}— خصم <b>{r.discountPercentage}%</b>. السبب: <b>{discountReasonLabel(r.reason)}</b>.</>
            )}
          </p>
          {r.note && <p className="mt-1 text-xs" dir="auto" style={{ unicodeBidi: "plaintext" }}>{r.note}</p>}
          <p className="mt-1 text-xs">
            طلبها {r.requestedByName ?? "—"} · {fmt(r.requestedAt)} —
            <b> لم تُسجَّل كلفة ولم تبدأ الخدمة</b>؛ تُنفَّذ فور اعتماد المسؤول أو مدير الفرع
            من صفحة «اعتماد الخصومات».
          </p>
        </div>
      ))}
    </div>
  );
}
