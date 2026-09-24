// **فرعُ البيع — يقرّره الخبيرُ المختار، لا فرعُ المتابعة وحدَه** (٢٠٢٦-٠٩-٢٤).
//
// ══ الواقعة (المريضة «زهراء») ═══════════════════════════════════════════
// مسجَّلةٌ في ذي قار ومُتاحٌ ملفُّها لبغداد. عاينها الطبيبُ فوُلدت متابعةُ
// قرار الشراء في ذي قار، ثمّ ضغط استقبالُ بغداد «اشترى»:
//   • قائمةُ الخبراء كانت تُجلب **بفرع المتابعة** (ذي قار) — وبغدادُ لا تصل
//     ذلك الفرع، فرُدّ ٤٠٣ وصار في الشاشة قائمةً فارغة؛
//   • والمسؤولُ رأى خبراءَ ذي قار وحدهم — **إلّا أيوب**، خبيرُ بغداد؛
//   • ولو اختير أيوب لرُدّ «الخبير غير مسموح له بالعمل في هذا الفرع».
//
// ══ القاعدة ══════════════════════════════════════════════════════════════
// **الفروعُ المرشَّحة = فروعُ ملفّ المريض (تسجيلُه وكلُّ فرعٍ أُتيح له) ∩
// نطاقُ الفاعل.** فاستقبالُ بغداد يرى خبراءَ بغداد، واستقبالُ ذي قار خبراءَ
// ذي قار، والمسؤولُ خبراءَ الفرعين معاً. **والخبيرُ المختار يحسم فرعَ
// العملية**: فرعٌ من المرشَّحين يعمل فيه — ويُفضَّل فرعُ المتابعة نفسُه إن
// كان يعمل فيه (لا نقلَ بلا سبب)، ثمّ فرعُ جلسة الفاعل، ثمّ فرعُ التسجيل.
//
// **ولا يتّسع شيءٌ خارج الملفّ**: فرعٌ لا يصل الملفَّ ليس مرشَّحاً، وفرعٌ
// خارج نطاق الفاعل ليس له. والمريضُ غيرُ المُتاح (الحالةُ الغالبة العظمى)
// مرشَّحُه فرعُه وحده — **السلوكُ القائم بحرفه**.
//
// ══ لماذا دالّةٌ خالصة ═══════════════════════════════════════════════════
// المفاضلةُ قرارٌ يُختبَر دخلاً وخرجاً (درسُ ٤.u)، والقراءةُ من القاعدة
// غلافٌ رقيقٌ حولها. ويستعملها البابان: قائمةُ الخبراء في الشاشة، والتحقّقُ
// عند الحفظ — فلا تُعرَض قائمةٌ يردّها الحفظ، ولا يُقبَل حفظٌ لم تعرضه.

import { patientBranchIdsOf } from "../patients/branch_access";
import { expertWorkBranchesTx } from "../manufacturing/store";
import { db } from "../db";

/** الفروعُ المرشَّحة للبيع — بترتيب فروع الملفّ (التسجيلُ أوّلاً). */
export function saleCandidateBranches(
  scope: number[] | null, patientBranchIds: number[],
): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const raw of patientBranchIds) {
    const b = Number(raw);
    if (!Number.isInteger(b) || b <= 0 || seen.has(b)) continue;
    if (scope !== null && !scope.includes(b)) continue;
    seen.add(b);
    out.push(b);
  }
  return out;
}

/**
 * **أيُّ فرعٍ يقع فيه البيع** — أو `null` حين لا يعمل الخبيرُ في أيّ مرشَّح.
 *
 * `prefer` بالترتيب: فرعُ المتابعة · فرعُ جلسة الفاعل · فرعُ التسجيل. وما
 * لا يعمل فيه الخبيرُ من هذه يُتخطّى، ثمّ أوّلُ مرشَّحٍ يعمل فيه.
 */
export function pickSaleBranch(params: {
  candidates: number[];
  workBranches: number[];
  prefer: Array<number | null | undefined>;
}): number | null {
  const work = new Set(params.workBranches.map(Number));
  const eligible = params.candidates.filter((b) => work.has(b));
  if (eligible.length === 0) return null;
  for (const p of params.prefer) {
    if (p === null || p === undefined) continue;
    const n = Number(p);
    if (eligible.includes(n)) return n;
  }
  return eligible[0];
}

export const EXPERT_OUTSIDE_PATIENT_BRANCHES =
  "الخبير لا يعمل في أيّ فرعٍ من فروع هذا المريض المتاحة لك — اختر خبيراً من القائمة";

type Executor = { execute: (q: any) => Promise<any>; select?: any };

/**
 * يحسم فرعَ البيع لخبيرٍ بعينه — القراءةُ من القاعدة حول `pickSaleBranch`.
 *
 * الردُّ برسالةِ الخبير نفسِها حين لا يصلح أصلاً (غيرُ موجود · غيرُ فعّال ·
 * ليس خبيراً) — نفسُ نصوص `validateExpertForBranchTx`، فلا رسالتان للعلّة
 * الواحدة.
 */
export async function resolveSaleBranch(params: {
  scope: number[] | null;
  patient: { id: number; branchId: number | null };
  expertUserId: number;
  followupBranchId: number | null;
  sessionBranchId: number | null | undefined;
  tx?: Executor;
}): Promise<{ ok: true; branchId: number } | { ok: false; reason: string }> {
  const ex = (params.tx ?? db) as any;
  const w = await expertWorkBranchesTx(ex, params.expertUserId);
  if (!w.ok) return { ok: false, reason: w.reason };
  const candidates = saleCandidateBranches(
    params.scope, await patientBranchIdsOf(params.patient, params.tx as any),
  );
  const session = params.sessionBranchId && params.sessionBranchId > 0
    ? params.sessionBranchId : null;
  const branchId = pickSaleBranch({
    candidates,
    workBranches: w.branches,
    prefer: [params.followupBranchId, session, params.patient.branchId],
  });
  if (branchId === null) return { ok: false, reason: EXPERT_OUTSIDE_PATIENT_BRANCHES };
  return { ok: true, branchId };
}
