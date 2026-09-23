//  تسميةُ الجهاز بترتيبه — دالّةٌ خالصة، بلا قاعدة بيانات.
import { deviceOrdinalLabel } from "./device_label";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
};
const same = (msg: string, got: unknown, expected: unknown) =>
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}  got: ${JSON.stringify(got)}`);

same("أ١ · الأول", deviceOrdinalLabel(1), "الجهاز الأول");
same("أ٢ · الثاني", deviceOrdinalLabel(2), "الجهاز الثاني");
same("أ٣ · العاشر", deviceOrdinalLabel(10), "الجهاز العاشر");
same("أ٤ · وما بعده بالرقم", deviceOrdinalLabel(11), "الجهاز رقم 11");

//  **ولا يُخترَع ترتيبٌ لما ليس بجهاز** — دفعةُ علاجٍ طبيعي أو رصيدٌ غيرُ
//  مخصَّص يصل `null`، فتُعرَض شرطةٌ لا «الجهاز الأول» كاذبةً.
for (const bad of [null, undefined, 0, -1, 1.5, NaN, Infinity, "1", "الأول", {}, []]) {
  same(`ب · ${JSON.stringify(bad) ?? "undefined"} ⟶ لا تسمية`, deviceOrdinalLabel(bad as any), null);
}

console.log(failures === 0 ? "\n🎉 كل الفحوص نجحت" : `\n❌ ${failures} فحصاً فشل`);
process.exit(failures === 0 ? 0 : 1);
