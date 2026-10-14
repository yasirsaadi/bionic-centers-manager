import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Phone, UserRound, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PHONE_RELATIONS, type PhoneHolder, type PhoneRelation, type SharedPhoneConfirm } from "@shared/shared_phone";

/**
 * **«هذا الرقم مسجَّل باسم…: الشخص نفسه أم قريبٌ له؟»** (§4.ef — قرارُ المالك ٢٠٢٦-١٠-١٤). تظهر حين يردّ الخادمُ الرقمَ بأسماء حامليه:
 *  • «الشخص نفسه» ⟵ يفتح ملفَّه ولا يُنشئ ملفّاً (وملفٌّ في فرعٍ لا يصله السائلُ يُقال أين هو).
 *  • «قريب يستعمل الرقم نفسه» ⟵ يختار صاحبَ الرقم (إن كانوا أكثر من واحد) وصلتَه بهذا المريض، ثمّ يُعاد الحفظُ بالتأكيد.
 * والاستقبالُ نفسُه يختار (قرارُ المالك) — والاختيارُ في سطر التدقيق.
 */
export function SharedPhoneDialog({ holders, mode, pending, onCancel, onConfirm }: {
  holders: PhoneHolder[] | null;
  mode: "create" | "edit";
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (c: SharedPhoneConfirm) => void;
}) {
  const [, setLocation] = useLocation();
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [relation, setRelation] = useState<PhoneRelation | null>(null);
  useEffect(() => {
    setOwnerId(holders && holders.length > 0 ? holders[0].id : null);
    setRelation(null);
  }, [holders]);

  const open = !!holders && holders.length > 0;
  const owner = holders?.find((h) => h.id === ownerId) ?? null;
  const many = (holders?.length ?? 0) > 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" dir="rtl" data-testid="shared-phone-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Phone className="w-5 h-5 text-amber-600" /> هذا الرقم مسجَّل مسبقاً</DialogTitle>
          <DialogDescription>هل هو الشخص نفسه، أم قريبٌ له يستعمل الرقم نفسه؟</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {(holders ?? []).map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-2 rounded-lg border p-2.5 bg-slate-50" data-testid={`shared-phone-holder-${h.id}`}>
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{h.name}</div>
                <div className="text-xs text-muted-foreground">{[h.patientCode, h.branchName].filter(Boolean).join(" · ")}</div>
              </div>
              {h.reachable ? (
                <Button type="button" size="sm" variant="outline" className="shrink-0 gap-1"
                  onClick={() => setLocation(`/patients/${h.id}`)} data-testid={`shared-phone-open-${h.id}`}>
                  <UserRound className="w-4 h-4" /> الشخص نفسه — افتح ملفّه
                </Button>
              ) : (
                <span className="text-[11px] text-muted-foreground shrink-0 text-left">ملفّه في فرعٍ آخر</span>
              )}
            </div>
          ))}
          {mode === "edit" && (
            <p className="text-[11px] text-muted-foreground">وإن كان الملفّان لشخصٍ واحد فدمجُهما للمسؤول من «دمج الملفات».</p>
          )}
        </div>

        <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-3 space-y-2.5">
          <div className="flex items-center gap-2 font-semibold text-sm text-sky-900"><Users className="w-4 h-4" /> قريب يستعمل الرقم نفسه</div>
          {many && (
            <div className="space-y-1">
              <div className="text-xs text-slate-600">صاحب الرقم:</div>
              <div className="flex flex-wrap gap-1.5">
                {(holders ?? []).map((h) => (
                  <button key={h.id} type="button" onClick={() => setOwnerId(h.id)} data-testid={`shared-phone-owner-${h.id}`}
                    className={cn("px-2.5 py-1.5 rounded-lg border text-xs", ownerId === h.id ? "bg-sky-600 text-white border-sky-600" : "bg-white hover:bg-slate-50")}>
                    {h.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-1">
            <div className="text-xs text-slate-600">{owner ? `«${owner.name}» بالنسبة لهذا المريض:` : "صاحب الرقم بالنسبة لهذا المريض:"}</div>
            <div className="grid grid-cols-3 gap-1.5">
              {PHONE_RELATIONS.map((r) => (
                <button key={r} type="button" onClick={() => setRelation(r)} data-testid={`shared-phone-rel-${r}`}
                  className={cn("px-2 py-2 rounded-lg border text-sm", relation === r ? "bg-sky-600 text-white border-sky-600" : "bg-white hover:bg-slate-50")}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="shared-phone-cancel">رجوع للتعديل</Button>
          <Button type="button" disabled={!ownerId || !relation || pending} data-testid="shared-phone-confirm"
            onClick={() => { if (ownerId && relation) onConfirm({ withPatientId: ownerId, relation }); }}>
            {mode === "create" ? "سجّل بالرقم المشترك" : "احفظ بالرقم المشترك"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
