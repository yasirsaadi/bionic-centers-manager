// **مقاييسُ البروتوكول الرقمية** (§4.cp — المرحلةُ السادسة): ما يُقاس في كلّ تقييمٍ لخطّةٍ مبنيّةٍ عليه، ومعها لكلّ مريضٍ الألمُ والأهداف.
// **اعتمادُها مستقلٌّ عن البروتوكول** — يكتبها كاتبو البروتوكولات، ويعتمدها المسؤولُ والمشرفُ العام، وتعديلُ غيرِ المعتمِد يعيدها مسوّدة.
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Plus, Ruler, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { GOALS_MEASURE, MEASURE_CATALOG, PAIN_MEASURE, type MeasureDef } from "@shared/physio_assessments";

const errText = (e: any): string => {
  const raw = String(e?.message ?? "").replace(/^\d+:\s*/, "");
  try { return JSON.parse(raw)?.error ?? raw; } catch { return raw; }
};
/** المدى بأرقامه من اليسار إلى اليمين — «-30–30» داخل نصٍّ عربيّ تنقلب أطرافُه بلا عزل. */
export const MeasureRange = ({ m, en = false }: { m: Pick<MeasureDef, "min" | "max" | "unitAr" | "unitEn">; en?: boolean }) => (
  <span><span dir="ltr" className="inline-block">{m.min} – {m.max}</span>{(en ? m.unitEn : m.unitAr) ? ` ${en ? m.unitEn : m.unitAr}` : ""}</span>
);
export const directionLabel = (m: Pick<MeasureDef, "higherIsBetter">, en = false) =>
  m.higherIsBetter ? (en ? "higher is better" : "الأعلى أفضل") : (en ? "lower is better" : "الأقلّ أفضل");

export function ProtocolMeasuresSection({ protocolId, measures, status, approvedByName, canEdit, canApprove, isArchived, lang }: {
  protocolId: number; measures: MeasureDef[]; status: "draft" | "approved"; approvedByName: string | null;
  canEdit: boolean; canApprove: boolean; isArchived: boolean; lang: "ar" | "en";
}) {
  const { toast } = useToast();
  const en = lang === "en";
  const [editing, setEditing] = useState(false);
  const approve = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/physio/protocols/${protocolId}/measures/approve`, {})).json(),
    onSuccess: () => toast({ title: "اعتُمدت المقاييس" }),
    onError: (e) => toast({ title: "خطأ", description: errText(e), variant: "destructive" }),
  });
  return (
    <div className="space-y-2" data-testid="protocol-measures">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="font-semibold flex items-center gap-1"><Ruler className="w-4 h-4" /> {en ? "Outcome measures" : "مقاييسُ التقييم"}</h2>
        {status === "approved"
          ? <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300">{en ? "Approved" : "معتمَدة"}{approvedByName ? ` — ${approvedByName}` : ""}</Badge>
          : <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300" data-testid="measures-draft">{en ? "Measures not yet approved" : "مقاييس غير معتمدة بعد"}</Badge>}
        {canApprove && status === "draft" && !isArchived && (
          <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" disabled={approve.isPending} onClick={() => approve.mutate()} data-testid="button-approve-measures">
            <CheckCircle2 className="w-4 h-4" /> اعتماد المقاييس
          </Button>
        )}
        {canEdit && !isArchived && <Button size="sm" variant="outline" onClick={() => setEditing(true)} data-testid="button-edit-measures">تعديل المقاييس</Button>}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {en ? "Recorded at every reassessment of a plan built on this protocol — with pain (0–10) and plan-goal attainment for every patient."
          : "تُسجَّل في كلّ تقييمٍ لخطّةٍ مبنيّةٍ على هذا البروتوكول — ومعها لكلّ مريض: الألمُ ٠–١٠ وتحقّقُ أهداف خطّته."}
      </p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <tbody>
            {[...measures, PAIN_MEASURE, GOALS_MEASURE].map((m) => (
              <tr key={m.code} className="border-t first:border-t-0">
                <td className="p-2 font-medium">{en ? m.nameEn : m.nameAr}
                  {(m.code === PAIN_MEASURE.code || m.code === GOALS_MEASURE.code) && <span className="text-[11px] text-muted-foreground"> — {en ? "every patient" : "لكلّ مريض"}</span>}</td>
                <td className="p-2 text-xs whitespace-nowrap"><MeasureRange m={m} en={en} /></td>
                <td className="p-2 text-xs whitespace-nowrap">{directionLabel(m, en)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <MeasuresEditor protocolId={protocolId} initial={measures} canApprove={canApprove} onClose={() => setEditing(false)} />}
    </div>
  );
}

function MeasuresEditor({ protocolId, initial, canApprove, onClose }: { protocolId: number; initial: MeasureDef[]; canApprove: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<MeasureDef[]>(initial.map((m) => ({ ...m })));
  const [pick, setPick] = useState("");
  const set = (i: number, patch: Partial<MeasureDef>) => setRows((p) => p.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const save = useMutation({
    mutationFn: async () => (await apiRequest("PUT", `/api/physio/protocols/${protocolId}/measures`, { measures: rows })).json(),
    onSuccess: (r: any) => { toast({ title: "حُفظت المقاييس", description: r.demoted ? "عادت مسوّدةً بانتظار الاعتماد" : undefined }); onClose(); },
    onError: (e) => toast({ title: "خطأ", description: errText(e), variant: "destructive" }),
  });
  const available = MEASURE_CATALOG.filter((c) => !rows.some((r) => r.code === c.code));
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>مقاييسُ التقييم</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">
          الألمُ وتحقّقُ الأهداف لكلّ مريضٍ دائماً، فلا تُضاف هنا. والتقييماتُ السابقة لا تتغيّر — كلٌّ محفوظٌ بتعريفه يومَه.
          {!canApprove && " وحفظُك يعيدها مسوّدةً حتى يعتمدها المشرفُ العام أو المسؤول."}
        </p>
        <div className="space-y-2">
          {rows.map((m, i) => (
            <div key={i} className="rounded-md border p-2 grid grid-cols-2 sm:grid-cols-6 gap-2 items-center" data-testid={`measure-row-${m.code}`}>
              <Input className="col-span-2 sm:col-span-2" value={m.nameAr} onChange={(e) => set(i, { nameAr: e.target.value })} placeholder="الاسم بالعربية" />
              <Input className="col-span-2 sm:col-span-2" dir="ltr" value={m.nameEn} onChange={(e) => set(i, { nameEn: e.target.value })} placeholder="English name" />
              <Input type="number" allowNegative value={m.min} onChange={(e) => set(i, { min: Number(e.target.value) })} placeholder="الأدنى" aria-label="الأدنى" />
              <Input type="number" allowNegative value={m.max} onChange={(e) => set(i, { max: Number(e.target.value) })} placeholder="الأعلى" aria-label="الأعلى" />
              <Input value={m.unitAr ?? ""} onChange={(e) => set(i, { unitAr: e.target.value || null })} placeholder="الوحدة" />
              <Input dir="ltr" value={m.unitEn ?? ""} onChange={(e) => set(i, { unitEn: e.target.value || null })} placeholder="unit" />
              <select className="h-9 rounded-md border bg-white px-2 text-sm col-span-2" value={m.higherIsBetter ? "1" : "0"}
                onChange={(e) => set(i, { higherIsBetter: e.target.value === "1" })}>
                <option value="1">الأعلى أفضل</option><option value="0">الأقلّ أفضل</option>
              </select>
              <Button variant="ghost" size="icon" onClick={() => setRows((p) => p.filter((_, j) => j !== i))} aria-label="حذف"><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <select className="h-9 rounded-md border bg-white px-2 text-sm flex-1 min-w-[12rem]" value={pick} onChange={(e) => setPick(e.target.value)} data-testid="select-catalog-measure">
            <option value="">— من المقاييس الشائعة —</option>
            {available.map((c) => <option key={c.code} value={c.code}>{c.nameAr}</option>)}
          </select>
          <Button size="sm" variant="outline" className="gap-1" disabled={!pick}
            onClick={() => { const c = MEASURE_CATALOG.find((x) => x.code === pick); if (c) setRows((p) => [...p, { ...c }]); setPick(""); }}>
            <Plus className="w-4 h-4" /> أضف
          </Button>
          <Button size="sm" variant="ghost" className="gap-1" onClick={() => setRows((p) => [...p, {
            code: `custom_${Date.now().toString(36)}`, nameAr: "", nameEn: "", unitAr: null, unitEn: null, min: 0, max: 10, higherIsBetter: true }])}>
            <Plus className="w-4 h-4" /> مقياسٌ آخر
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()} data-testid="button-save-measures">حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
