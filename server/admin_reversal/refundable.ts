// **ما يُردّ عند إلغاء عمليةٍ لا يتجاوز ما بقي عند المركز على حالتها** (واقعةُ فاطمة حميد شاكر — كربلاء، ٢٠٢٦-١١-١٨).
//
// كان مقبوضُ العملية يُقرأ من دفعات حلقتها وحدها (`device_episode_id`). و«طلبُ استرجاع مبلغ لمريض» (§4.fz) يكتب
// دفعتَه السالبة على **الحالة** بلا حلقة — فبقي مقبوضُ الحلقة كاملاً بعد الاسترجاع، وإلغاءُ العملية بعده ردّ المبلغَ
// نفسَه مرّةً ثانية.
//
// فالمردودُ الآن = `min(مقبوضُ العملية، صافي ما عند المركز على حالتها)`، وصافي الحالة دفعاتُها كلُّها — موجبُها
// وسالبُها، بالحالة أو بالحلقة (الموروثُ بلا حالة) — وهو المبلغُ نفسُه الذي يحدّ «طلب الاسترجاع» (`caseMoneyTx`).
// فأيُّ استرجاعٍ سابق على الحالة يُنقص ما يُردّ، ولا يُردّ دينارٌ مرّتين. وفي البيانات السليمة بلا استرجاعٍ سابق
// صافي الحالة ≥ مقبوضَ العملية فلا يتغيّر شيء.
import { sql } from "drizzle-orm";

export async function capRefundableByCase(
  h: { execute: (q: any) => Promise<any> },
  p: { patientId: number; caseId: number | null; episodeId: number | null; paid: number },
): Promise<number> {
  const paid = Math.max(0, Number(p.paid) || 0);
  if (paid === 0 || p.caseId === null) return paid;
  const r = await h.execute(sql`
    SELECT COALESCE(SUM(amount), 0)::int AS net FROM payments
     WHERE patient_id = ${p.patientId}
       AND (case_id = ${p.caseId}
            OR (case_id IS NULL AND device_episode_id = ${p.episodeId ?? -1}))
  `);
  const net = Number((r.rows ?? [])[0]?.net ?? 0);
  return Math.max(0, Math.min(paid, net));
}
