import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AMPUTATION_TYPE_OPTIONS, LIMB_KIND_OPTIONS, LIMB_REGION_OPTIONS, LOWER_AMPUTATION_DETAILS, UPPER_AMPUTATION_DETAILS,
  SILICONE_PARTS, amputationLimbKey, buildAmputationSite, limbDetailOptions, limbNeedsSide, type AmputationLimb, type AmputationParts,
} from "@shared/case_fields";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { checkAmputationParts } from "@shared/patient_required";

// **بانِي تعريف البتر** — ضوابطٌ تبدأ فارغة، ومصدرٌ واحد لكلّ شاشة.
//
// ══ لماذا مكوّنٌ مشترَك ═════════════════════════════════════════════════
// السؤالُ نفسه يُطرَح في ثلاثة أماكن: تسجيلُ مريض، وإضافةُ حالة أطراف لمريضٍ
// قائم، ووصفةُ الطبيب. وثلاثُ نسخٍ من القوائم تنحرف: يُضاف «خلال الحوض»
// لواحدة فيصير المستوى مُدخَلاً في شاشةٍ ومفقوداً في أخرى — والسلسلةُ
// المخزَّنة واحدة، فالانحرافُ يظهر بعد شهرٍ في أمر تصنيع.
//
// ══ والفراغُ هنا فراغٌ لا افتراض ═══════════════════════════════════════
// **قائمةٌ تفتح على «احادي/سفلي/يمين» تُجيب عن المريض قبل أن يُسأل.** وهذا
// ما كان يقع: كلُّ مبتورٍ سُجّل بلا سؤالٍ يحمل «احادي - طرف سفلي - يمين».
// فالضوابطُ تبدأ **بلا اختيار**، والزرُّ لا يُفعَّل حتى يُجاب.
//
// ولا تُبنى السلسلةُ إلّا حين تكتمل: `buildAmputationSite` تكتب «طرف سفلي»
// و«يمين» افتراضاً حين لا يُختار شيء (تعبيرٌ ثلاثيّ)، فسلسلةٌ نصفُ مختارة
// تبدو مكتملةً للمحلّل. فيُفحَص **الأجزاءُ** لا السلسلة، ولا تُرسَل إلّا
// تامّة.

export type { AmputationParts };

/** السلسلةُ المركّبة — أو `""` ما دام التعريفُ ناقصاً. */
export function amputationSiteOf(parts: AmputationParts): string {
  return checkAmputationParts(parts).ok ? buildAmputationSite(parts) : "";
}

export const amputationComplete = (parts: AmputationParts) =>
  checkAmputationParts(parts).ok;

interface Props {
  value: AmputationParts;
  onChange: (next: AmputationParts) => void;
  /** بادئةٌ لمعرّفات الاختبار، فتتعايش نسختان في صفحةٍ واحدة. */
  testIdPrefix?: string;
}

export function AmputationBuilder({ value, onChange, testIdPrefix = "amp" }: Props) {
  const set = (patch: Partial<AmputationParts>) => onChange({ ...value, ...patch });
  const id = (k: string) => `${testIdPrefix}-${k}`;

  const detailOptions = (limb: string | undefined) =>
    limb === "upper" ? UPPER_AMPUTATION_DETAILS : LOWER_AMPUTATION_DETAILS;

  const LevelSelect = ({
    limb, val, onPick, testId, label,
  }: {
    limb: string | undefined; val: string | undefined;
    onPick: (v: string) => void; testId: string; label: string;
  }) => (
    <div className="space-y-2">
      <Label>{label} <span className="text-destructive">*</span></Label>
      <Select value={val ?? ""} onValueChange={onPick}>
        <SelectTrigger className="bg-white" data-testid={testId}>
          <SelectValue placeholder="اختر المستوى" />
        </SelectTrigger>
        <SelectContent>
          {detailOptions(limb).map((d) => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-4" data-testid={id("builder")}>
      <div className="space-y-2">
        <Label>نوع البتر <span className="text-destructive">*</span></Label>
        {/*  **بلا قيمةٍ افتراضية**: النائبُ يقول «اختر» ولا يجيب نيابةً. */}
        <Select
          value={value.amputationType ?? ""}
          //  «متعدد» يفتح على طرفين فارغين — يُضاف غيرُهما بزرّ.
          onValueChange={(v) => onChange(v === "multi" ? { amputationType: v, limbs: [{}, {}] } : { amputationType: v })}
        >
          <SelectTrigger className="bg-white" data-testid={id("type")}>
            <SelectValue placeholder="اختر نوع البتر" />
          </SelectTrigger>
          <SelectContent>
            {AMPUTATION_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {value.amputationType === "single" && (
        <div className="space-y-4 p-3 border rounded-xl bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>الطرف <span className="text-destructive">*</span></Label>
              <Select
                value={value.singleLimb ?? ""}
                //  تبديلُ الطرف يُفرِغ المستوى: قوائمُ العلويّ غيرُ السفليّ،
                //  وإبقاءُ «تحت الركبة» على طرفٍ علويّ قيمةٌ لا معنى لها.
                onValueChange={(v) => set({ singleLimb: v, singleDetail: "" })}
              >
                <SelectTrigger className="bg-white" data-testid={id("single-limb")}>
                  <SelectValue placeholder="اختر الطرف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upper">طرف علوي</SelectItem>
                  <SelectItem value="lower">طرف سفلي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الجهة <span className="text-destructive">*</span></Label>
              <Select
                value={value.singleSide ?? ""}
                onValueChange={(v) => set({ singleSide: v })}
              >
                <SelectTrigger className="bg-white" data-testid={id("single-side")}>
                  <SelectValue placeholder="اختر الجهة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="right">يمين</SelectItem>
                  <SelectItem value="left">يسار</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {value.singleLimb && (
            <LevelSelect
              limb={value.singleLimb} val={value.singleDetail}
              onPick={(v) => set({ singleDetail: v })}
              testId={id("single-level")} label="مستوى البتر"
            />
          )}
        </div>
      )}

      {value.amputationType === "double" && (
        <div className="space-y-4 p-3 border rounded-xl bg-slate-50/50">
          <div className="space-y-2">
            <Label>نمط الطرفين <span className="text-destructive">*</span></Label>
            <Select
              value={value.doubleLimbType ?? ""}
              onValueChange={(v) => set({
                doubleLimbType: v,
                doubleRightDetail: "", doubleLeftDetail: "",
                bothRightDetail: "", bothLeftDetail: "",
              })}
            >
              <SelectTrigger className="bg-white" data-testid={id("double-kind")}>
                <SelectValue placeholder="اختر النمط" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upper">طرفان علويان</SelectItem>
                <SelectItem value="lower">طرفان سفليان</SelectItem>
                <SelectItem value="both">علوي وسفلي</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/*  **والثنائيُّ يلزمه الجهتان معاً** — «ثنائي» تعني الطرفين
              بالتعريف، فنصفُ التعريف يترك الخبيرَ يقيس على فراغ. */}
          {(value.doubleLimbType === "upper" || value.doubleLimbType === "lower") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LevelSelect
                limb={value.doubleLimbType} val={value.doubleRightDetail}
                onPick={(v) => set({ doubleRightDetail: v })}
                testId={id("double-right")} label="مستوى اليمين"
              />
              <LevelSelect
                limb={value.doubleLimbType} val={value.doubleLeftDetail}
                onPick={(v) => set({ doubleLeftDetail: v })}
                testId={id("double-left")} label="مستوى اليسار"
              />
            </div>
          )}

          {value.doubleLimbType === "both" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>طرف اليمين <span className="text-destructive">*</span></Label>
                  <Select
                    value={value.bothRightLimb ?? ""}
                    onValueChange={(v) => set({ bothRightLimb: v, bothRightDetail: "" })}
                  >
                    <SelectTrigger className="bg-white" data-testid={id("both-right-limb")}>
                      <SelectValue placeholder="اختر الطرف" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upper">علوي</SelectItem>
                      <SelectItem value="lower">سفلي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {value.bothRightLimb && (
                  <LevelSelect
                    limb={value.bothRightLimb} val={value.bothRightDetail}
                    onPick={(v) => set({ bothRightDetail: v })}
                    testId={id("both-right-level")} label="مستوى اليمين"
                  />
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>طرف اليسار <span className="text-destructive">*</span></Label>
                  <Select
                    value={value.bothLeftLimb ?? ""}
                    onValueChange={(v) => set({ bothLeftLimb: v, bothLeftDetail: "" })}
                  >
                    <SelectTrigger className="bg-white" data-testid={id("both-left-limb")}>
                      <SelectValue placeholder="اختر الطرف" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upper">علوي</SelectItem>
                      <SelectItem value="lower">سفلي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {value.bothLeftLimb && (
                  <LevelSelect
                    limb={value.bothLeftLimb} val={value.bothLeftDetail}
                    onPick={(v) => set({ bothLeftDetail: v })}
                    testId={id("both-left-level")} label="مستوى اليسار"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {value.amputationType === "multi" && (
        <MultiLimbs limbs={Array.isArray(value.limbs) ? value.limbs : []} onLimbs={(limbs) => set({ limbs })} id={id} />
      )}

      {value.amputationType === "silicone" && (
        <div className="space-y-4 p-3 border rounded-xl bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>القطعة <span className="text-destructive">*</span></Label>
              <Select
                value={value.siliconePart ?? ""}
                onValueChange={(v) => set({ siliconePart: v })}
              >
                <SelectTrigger className="bg-white" data-testid={id("silicone-part")}>
                  <SelectValue placeholder="اختر القطعة" />
                </SelectTrigger>
                <SelectContent>
                  {SILICONE_PARTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/*  **والأنفُ وحده بلا جهة** — قاعدةُ الباني نفسه لا استثناءٌ
                يُخترَع هنا. */}
            {value.siliconePart && value.siliconePart !== "انف" && (
              <div className="space-y-2">
                <Label>الجهة <span className="text-destructive">*</span></Label>
                <Select
                  value={value.siliconeSide ?? ""}
                  onValueChange={(v) => set({ siliconeSide: v })}
                >
                  <SelectTrigger className="bg-white" data-testid={id("silicone-side")}>
                    <SelectValue placeholder="اختر الجهة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">يمين</SelectItem>
                    <SelectItem value="left">يسار</SelectItem>
                    <SelectItem value="both">كلا الجانبين</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>ملاحظات</Label>
            <Input
              value={value.siliconeNotes ?? ""}
              onChange={(e) => set({ siliconeNotes: e.target.value })}
              className="bg-white" data-testid={id("silicone-notes")}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * **«متعدد» طرفاً طرفاً** (قرارُ المالك ٢٠٢٦-١٠-١٠، §4.de): لكلّ طرفٍ موضعُه (سفلي/علوي/الوجه) وجهتُه ونوعُه (طرف صناعي/سليكوني)
 * ومستواه أو قطعتُه — فيُكتب علويٌّ وسفليٌّ من الجهة نفسِها، وطرفٌ عاديٌّ مع قطعةٍ سليكونية، وقطعتان سليكونيّتان مختلفتان، وثلاثةُ أطرافٍ
 * أو أربعة. **ولا طرفان في موضعٍ واحد** (يُقال «مكرَّر» ويردّه الفحص).
 */
function MultiLimbs({ limbs, onLimbs, id }: { limbs: AmputationLimb[]; onLimbs: (l: AmputationLimb[]) => void; id: (k: string) => string }) {
  const put = (i: number, patch: Partial<AmputationLimb>) => onLimbs(limbs.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const keys = limbs.map((l) => amputationLimbKey(l));
  return (
    <div className="space-y-2 p-3 border rounded-xl bg-slate-50/50" data-testid={id("multi")}>
      <p className="text-xs text-muted-foreground">
        أضف كلَّ طرفٍ مبتور: موضعَه وجهتَه ونوعَه ومستواه — علويٌّ وسفليٌّ من الجهة نفسها، وطرفٌ عاديٌّ مع قطعةٍ سليكونية، وثلاثةُ أطرافٍ أو أربعة.
      </p>
      {limbs.map((l, i) => {
        const dup = keys[i] !== null && keys.indexOf(keys[i]) !== i;
        return (
          <div key={i} className={"rounded-lg border bg-white p-2 space-y-2" + (dup ? " border-red-400" : "")} data-testid={id(`multi-limb-${i}`)}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold">الطرف {i + 1}</span>
              {/*  «متعدد» طرفان فأكثر — وما دونه «احادي» أو «اطراف سليكونية». */}
              {limbs.length > 2 && (
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1"
                  onClick={() => onLimbs(limbs.filter((_, j) => j !== i))} data-testid={id(`multi-remove-${i}`)}>
                  <X className="w-3.5 h-3.5" /> إزالة
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Select value={l.region ?? ""}
                onValueChange={(v) => put(i, { region: v, kind: v === "face" ? "silicone" : l.region === "face" ? undefined : l.kind, detail: "" })}>
                <SelectTrigger className="bg-white" data-testid={id(`multi-region-${i}`)}><SelectValue placeholder="الموضع" /></SelectTrigger>
                <SelectContent>{LIMB_REGION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              {l.region !== "face" && (
                <Select value={l.kind ?? ""} onValueChange={(v) => put(i, { kind: v, detail: "" })}>
                  <SelectTrigger className="bg-white" data-testid={id(`multi-kind-${i}`)}><SelectValue placeholder="النوع" /></SelectTrigger>
                  <SelectContent>{LIMB_KIND_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              )}
              <Select value={l.detail ?? ""} disabled={!l.region || (l.region !== "face" && !l.kind)}
                onValueChange={(v) => put(i, { detail: v, ...(l.region === "face" && v === "انف" ? { side: "" } : {}) })}>
                <SelectTrigger className="bg-white" data-testid={id(`multi-detail-${i}`)}>
                  <SelectValue placeholder={l.kind === "silicone" || l.region === "face" ? "القطعة" : "المستوى"} />
                </SelectTrigger>
                <SelectContent>{limbDetailOptions(l).map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
              {limbNeedsSide(l) && (
                <Select value={l.side ?? ""} onValueChange={(v) => put(i, { side: v })}>
                  <SelectTrigger className="bg-white" data-testid={id(`multi-side-${i}`)}><SelectValue placeholder="الجهة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">يمين</SelectItem>
                    <SelectItem value="left">يسار</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            {dup && <p className="text-xs text-red-700" data-testid={id(`multi-dup-${i}`)}>هذا الطرف مكرَّر — لكلّ موضعٍ وجهةٍ طرفٌ واحد.</p>}
          </div>
        );
      })}
      {limbs.length < 6 && (
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => onLimbs([...limbs, {}])} data-testid={id("multi-add")}>
          <Plus className="w-4 h-4" /> إضافة طرف
        </Button>
      )}
    </div>
  );
}
