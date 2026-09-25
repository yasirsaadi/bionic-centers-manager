//  **أقسامُ شاشة التنبيهات** — منطقٌ خالص، بلا React ولا شبكة ولا قاعدة.
//
//  ══ الواقعة (قرارُ المالك ٢٠٢٦-٠٩-٢٤، ونُفِّذ ٢٠٢٦-٠٩-٢٥) ════════════════
//  كانت الشاشةُ تجمع كلَّ ما مضى موعدُه تحت قسمٍ واحد «متأخرة عن موعد
//  التسليم» وتفرّق بين الاثنين باللون وحدَه (تصحيحُ ٢٠٢٦-٠٨-٣١). ولوحةُ
//  التصنيع انقسمت قبلها: «الأحمرُ فقط وفقط لمن متأخرٌ وليس لديه عذر» (§4.ao).
//  فصار للشاشتين كلامان عن الأمر نفسِه — عددٌ واحدٌ هنا واثنان هناك. وقرارُ
//  المالك: تنقسم التنبيهاتُ «متأخرة بدون عذر» و«متأخرة بعذر» **كلوحة التصنيع**.
//
//  ══ تعريفٌ واحد لا اثنان ═══════════════════════════════════════════════
//  القسمُ يُقرَّر بـ`latenessOf` من `shared/manufacturing.ts` — **الدالّةُ
//  نفسُها** التي تُرشِّح بها شرائطُ اللوحة ويعدّ بها `getOverview`. فالبياضُ
//  وحده ليس عذراً هنا كما ليس عذراً هناك، ولا يُستنتَج عذرٌ من حالةٍ أو
//  مرحلة. و«متأخر» هنا هو `kind === "overdue"` من الخادم: موعدٌ مضى وأمرٌ
//  لم يكتمل ولم يُلغَ — الشرطُ نفسُه الذي يحسب به `isOrderOverdue` حقلَ
//  `isOverdue` في اللوحة.
//
//  **والخادمُ لم يتغيّر عقدُه**: ما زال يُرسل `kind: "overdue"` للاثنين، وما
//  زال `alertCount` يعدّ كلَّ ما ليس مكتملاً — فالشارةُ في الشريط الجانبيّ
//  تنبيهٌ يستحقّ النظر لا عددُ المتأخّرين بدون عذر.

import { latenessOf } from "@shared/manufacturing";

/** ما يُرسله الخادمُ في `kind` — لم يتغيّر. */
export type AlertKind = "overdue" | "due_today" | "due_tomorrow" | "due_in_2_days" | "completed";

/** القسمُ المعروض — `overdue` انقسم اثنين، والباقي كما هو. */
export type SectionKey =
  | "overdue" | "overdue_excused" | "due_today" | "due_tomorrow" | "due_in_2_days" | "completed";

/** أقلُّ ما يلزم من التنبيه ليُصنَّف — لا أكثر. */
export interface SectionItemLike {
  kind: AlertKind;
  /** العذرُ المكتوب على الأمر كما خزّنه الخادم — لا اسمُه المعروض. */
  holdReasonCode: string | null;
}

export interface SectionDef {
  key: SectionKey;
  title: string;
  /** لونُ البطاقة. */
  tone: string;
  /** لونُ أيقونة العنوان. */
  iconTone: string;
}

//  **الترتيبُ ترتيبُ الإلحاح**: بدون عذرٍ أوّلاً ثمّ بعذر ثمّ ما يقترب موعدُه.
//  **والعنوانان بكلمات مربّعَي اللوحة بحرفهما** («متأخرة بدون عذر» ·
//  «متأخرة بعذر») — يحرسه الاختبار بقراءة `Manufacturing.tsx` نفسِه.
//  **والكهرمانيُّ لونُ «غداً» نفسُه** كما كان منذ ٢٠٢٦-٠٨-٣١ — لا لونٌ ثالث.
export const NOTIFICATION_SECTIONS: readonly SectionDef[] = [
  { key: "overdue", title: "متأخرة بدون عذر", tone: "border-red-300 bg-red-50", iconTone: "text-red-600" },
  { key: "overdue_excused", title: "متأخرة بعذر", tone: "border-amber-300 bg-amber-50", iconTone: "text-amber-600" },
  { key: "due_today", title: "موعد تسليمها اليوم", tone: "border-orange-300 bg-orange-50", iconTone: "text-amber-600" },
  { key: "due_tomorrow", title: "موعد تسليمها غداً", tone: "border-amber-300 bg-amber-50", iconTone: "text-amber-600" },
  { key: "due_in_2_days", title: "موعد تسليمها بعد يومين", tone: "border-yellow-300 bg-yellow-50", iconTone: "text-amber-600" },
  { key: "completed", title: "اكتملت في موعدها", tone: "border-green-300 bg-green-50", iconTone: "text-green-600" },
] as const;

/** قسمُ التنبيه. والعذرُ لا يمسّ إلّا المتأخّر — «اليوم» بعذرٍ يبقى «اليوم». */
export function sectionOf(i: SectionItemLike): SectionKey {
  if (i.kind !== "overdue") return i.kind;
  return latenessOf({ isOverdue: true, holdReasonCode: i.holdReasonCode }) === "late_excused"
    ? "overdue_excused"
    : "overdue";
}

/** هل القسمُ قسمُ تأخّر — تظهر فيه شارةُ «متأخر N يوم». */
export function isLateSection(key: SectionKey): boolean {
  return key === "overdue" || key === "overdue_excused";
}
