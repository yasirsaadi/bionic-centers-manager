// **ما تختلف به خطّةُ المريض عن بروتوكولها الأصليّ** (ترحيل ١٣٢، §4.do — طلبُ المالك ٢٠٢٦-١٠-١١): «أشّر الذي يتغيّر في خطّة المريض عن
// البروتوكول الأصليّ ليعلم الأخصائيُّ أو سليم أو أنا». مربّعٌ يجمع الفروقَ كلَّها، وعلامةٌ صغيرة في مكان كلّ فرق (`DiffBadge` · `DiffFields`).
// والقاعدةُ في الخادم (`shared/physio_plan_diff.ts`) — هنا العرضُ وحده.
import { GitCompare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DIFF_AREAS, DIFF_AREA_LABELS, DIFF_AREA_LABELS_EN, DIFF_KIND_LABELS, DIFF_KIND_LABELS_EN,
  type DiffField, type DiffItem, type DiffKind, type PlanDiff,
} from "@shared/physio_plan_diff";
import type { ProtocolLang } from "@shared/physio_protocols";

export interface ProtocolDiffView {
  diff: PlanDiff; changedSinceCopy: boolean;
  reference: { status: string; updatedAt: string | null; updatedByName: string | null; approvedAt: string | null; approvedByName: string | null };
}

const TONE: Record<DiffKind, string> = {
  added: "bg-emerald-50 text-emerald-800 border-emerald-300",
  changed: "bg-amber-50 text-amber-900 border-amber-300",
  removed: "bg-rose-50 text-rose-800 border-rose-300",
};

/** «أُضيف» · «عُدّل» · «أُزيل» — بجانب ما اختلف. */
export function DiffBadge({ item, lang, testId }: { item: DiffItem | undefined; lang: ProtocolLang; testId?: string }) {
  if (!item) return null;
  return (
    <Badge variant="outline" className={`${TONE[item.kind]} text-[10px] px-1.5 py-0 print:hidden`} data-testid={testId}
      title={lang === "en" ? "Differs from the original protocol" : "يختلف عن البروتوكول الأصليّ"}>
      {(lang === "en" ? DIFF_KIND_LABELS_EN : DIFF_KIND_LABELS)[item.kind]}
    </Badge>
  );
}

const LONG = 60;
const clip = (v: string | null | undefined) => (v ?? "").trim() || "—";

/** خانةٌ اختلفت: قيمةُ البروتوكول ⟵ قيمةُ الخطّة؛ والنصُّ الطويل يُفتح ليُقرأ كاملاً. */
function FieldLine({ f, lang }: { f: DiffField; lang: ProtocolLang }) {
  const en = lang === "en";
  const from = en && f.fromEn !== undefined ? f.fromEn : f.from;
  const to = en && f.toEn !== undefined ? f.toEn : f.to;
  const label = en ? f.en : f.ar;
  //  النصُّ ذو النسختين قد يختلف في الأخرى وحدها — فيُقال ذلك بدل سطرين متطابقين.
  const otherOnly = clip(from) === clip(to);
  if (otherOnly) {
    return <li className="text-[11px] text-muted-foreground">{label}: {en ? "the Arabic text differs" : "يختلف النصُّ الإنكليزيّ"}</li>;
  }
  if (clip(from).length > LONG || clip(to).length > LONG) {
    return (
      <li className="text-[11px]">
        <details>
          <summary className="cursor-pointer">{label}: {en ? "text differs — open" : "نصٌّ مختلف — افتحه"}</summary>
          <div className="mt-1 grid gap-1 sm:grid-cols-2">
            <div className="rounded border bg-white p-1.5 whitespace-pre-wrap"><b>{en ? "Protocol" : "البروتوكول"}:</b> {clip(from)}</div>
            <div className="rounded border border-amber-300 bg-amber-50/50 p-1.5 whitespace-pre-wrap"><b>{en ? "This plan" : "الخطّة"}:</b> {clip(to)}</div>
          </div>
        </details>
      </li>
    );
  }
  return (
    <li className="text-[11px]">
      {label}: <span className="text-muted-foreground line-through decoration-rose-400">{clip(from)}</span>
      {en ? " → " : " ⟵ "}<b>{clip(to)}</b>
    </li>
  );
}

/** خاناتُ الفرق تحت ما اختلف. */
export function DiffFields({ item, lang, testId }: { item: DiffItem | undefined; lang: ProtocolLang; testId?: string }) {
  if (!item?.fields?.length) return null;
  return <ul className="mt-0.5 space-y-0.5 print:hidden" data-testid={testId}>{item.fields.map((f) => <FieldLine key={f.field} f={f} lang={lang} />)}</ul>;
}

const diffCountAr = (n: number) => (n === 1 ? "فرقٌ واحد" : n === 2 ? "فرقان" : `${n} ${n <= 10 ? "فروق" : "فرقاً"}`);
const fmt = (iso: string | null, en: boolean) =>
  iso ? new Date(iso).toLocaleDateString(en ? "en-GB" : "ar-IQ", { year: "numeric", month: "short", day: "numeric" }) : "—";

/**
 * **المربّعُ الجامع**: المرجعُ (البروتوكولُ كما عدّله المشرفُ آخرَ مرّة وحالُ اعتماده)، وهل عُدّل بعد نسخ الخطّة، ثمّ الفروقُ مجموعةً بمجالها.
 */
export function PlanDiffBox({ view, protocolTitle, lang }: { view: ProtocolDiffView | null | undefined; protocolTitle: string; lang: ProtocolLang }) {
  if (!view) return null;
  const en = lang === "en";
  const { diff, reference: ref } = view;
  const areaLabels = en ? DIFF_AREA_LABELS_EN : DIFF_AREA_LABELS;
  return (
    <div className={`rounded-md border p-3 space-y-2 print:hidden ${diff.count ? "border-amber-300 bg-amber-50/40" : "border-emerald-300 bg-emerald-50/40"}`}
      data-testid="plan-protocol-diff">
      <div className="flex items-center gap-2 flex-wrap">
        <GitCompare className="w-4 h-4 text-amber-700" />
        <span className="font-semibold text-sm">{en ? "What differs from the original protocol" : "ما يختلف عن البروتوكول الأصليّ"}</span>
        <Badge variant="outline" className={diff.count ? TONE.changed : "bg-emerald-50 text-emerald-800 border-emerald-300"} data-testid="plan-protocol-diff-count">
          {diff.count ? (en ? `${diff.count} difference${diff.count === 1 ? "" : "s"}` : diffCountAr(diff.count))
            : (en ? "Matches the protocol" : "مطابقةٌ للبروتوكول")}
        </Badge>
      </div>
      <p className="text-[11px] text-muted-foreground" data-testid="plan-protocol-diff-reference">
        {en
          ? `Compared with «${protocolTitle}» as last edited${ref.updatedByName ? ` by ${ref.updatedByName}` : ""} on ${fmt(ref.updatedAt, en)} — ${ref.status === "approved" ? `approved${ref.approvedByName ? ` by ${ref.approvedByName}` : ""}` : "not yet approved"}.`
          : `المقارنةُ بـ«${protocolTitle}» كما عُدّل آخرَ مرّة${ref.updatedByName ? ` بيد ${ref.updatedByName}` : ""} في ${fmt(ref.updatedAt, en)} — ${ref.status === "approved" ? `معتمَد${ref.approvedByName ? ` (${ref.approvedByName})` : ""}` : "لم يُعتمد بعد"}.`}
      </p>
      {view.changedSinceCopy && (
        <p className="text-[11px] text-amber-900" data-testid="plan-protocol-changed-since-copy">
          {en ? "The protocol was edited after this plan was copied from it — some differences come from that edit, not from the plan's author."
            : "عُدّل البروتوكولُ بعد نسخ هذه الخطّة منه — فبعضُ الفروق من ذلك التعديل لا من كاتب الخطّة."}
        </p>
      )}
      {DIFF_AREAS.map((area) => {
        const items = diff.items.filter((i) => i.area === area);
        if (!items.length) return null;
        return (
          <div key={area} className="space-y-1" data-testid={`plan-protocol-diff-${area}`}>
            <div className="text-xs font-semibold">{areaLabels[area]}</div>
            <ul className="space-y-1">
              {items.map((i) => (
                <li key={i.key} className="rounded border bg-white px-2 py-1" data-testid={`plan-diff-item-${i.key}`}>
                  <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    <DiffBadge item={i} lang={lang} />
                    <span className={`font-medium ${i.kind === "removed" ? "line-through decoration-rose-400" : ""}`}>{en ? i.nameEn : i.nameAr}</span>
                    {(en ? i.noteEn : i.noteAr) && <span className="text-muted-foreground">— {en ? i.noteEn : i.noteAr}</span>}
                  </div>
                  <DiffFields item={i} lang={lang} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/** ما أُزيل من مجالٍ — يُعرض تحت جدوله، مشطوباً. */
export function RemovedList({ items, lang, testId }: { items: DiffItem[]; lang: ProtocolLang; testId?: string }) {
  if (!items.length) return null;
  const en = lang === "en";
  return (
    <div className="mt-2 rounded border border-rose-200 bg-rose-50/40 px-2 py-1.5 text-xs print:hidden" data-testid={testId}>
      <span className="font-medium">{en ? "In the protocol, not in this plan:" : "في البروتوكول وليس في هذه الخطّة:"}</span>{" "}
      {items.map((i, n) => (
        <span key={i.key}>{n ? (en ? ", " : "، ") : ""}<span className="line-through decoration-rose-400">{en ? i.nameEn : i.nameAr}</span>
          {(en ? i.noteEn : i.noteAr) ? <span className="text-muted-foreground"> ({en ? i.noteEn : i.noteAr})</span> : null}</span>
      ))}
    </div>
  );
}
