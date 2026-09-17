// **قرارُ هويّة الجهاز في نافذة المعاينة — خالصاً، دخلاً وخرجاً.**
// `npm run test:exam-episode-choice` — بلا قاعدة بيانات وبلا شبكة.
//
// ══ العطبُ الذي يحرسه (٢٠٢٦-٠٩-١٧) ══════════════════════════════════════
// «معايناتي» وحدها كانت تمرّر `deviceEpisodeId`. فالطبيبُ الذي يبدّل النوع
// **من صفحة المريض أو من السجلّ** كان توقيعُه يقع بلا هويّةٍ وبلا راية، فيمضي
// «بلا جهاز» ويتولّاه تبديلُ §4.b: يُسحَب الخيطُ القديم **وتُحذَف حلقتُه
// سقالةً** (§4.r) فيخرج المريضُ **بلا طلبِ جهازٍ إطلاقاً** — ومَن سُجّل
// بالنوع الصحيح من البداية يملك طلبَ جهازٍ حيّاً. مُعادٌ إنتاجُه حيّاً قبل
// الإصلاح: `الحلقات: []` و`exam.device_episode_id = null`.
//
// ══ ولماذا دالّةٌ خالصة لا قراءةُ مصدر ═════════════════════════════════════
// درسُ §4.u: قرارٌ داخل React لا يُختبَر إلّا بقراءة نصِّه، وقراءةُ النصّ لا
// تُمسك انقلاباً في المعنى يعود بصياغةٍ أخرى.

import { resolveExamEpisodeChoice, isDeviceSpecialty } from "./exam_episode_choice";
import type { AwaitingEpisodeOption } from "./exam_episode_choice";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const ep = (id: number, caseType: string, seq = id): AwaitingEpisodeOption => ({
  id, caseType, sequenceNumber: seq, requestedItem: "full_device",
  awaitingSince: "2026-09-01T00:00:00.000Z", reviewKind: null,
});
const base = {
  isEdit: false, specialty: null as string | null,
  fixedEpisodeId: null as number | null, fixedEpisodeSpecialty: null as string | null,
  openedSpecialty: null as string | null,
  awaiting: [] as AwaitingEpisodeOption[], choice: null as number | null,
};
const r = (o: Partial<typeof base>) => resolveExamEpisodeChoice({ ...base, ...o });
const shape = (x: ReturnType<typeof r>) =>
  ({ id: x.episodeId, retype: x.retype, n: x.options.length, fromList: x.fromList,
     needsChoice: x.needsChoice, dropped: x.dropped, fixedActive: x.fixedActive });

console.log("\n── أ. شكلُ المالك: «مساند» بالخطأ ⟵ الطبيبُ يختار «أطراف» ──");
{
  //  صفحةُ المريض والسجلّ لا يمرّران معرّفاً — هذا هو المدخلُ بعينه.
  const out = r({ specialty: "prosthetic", awaiting: [ep(1, "medical_support")] });
  same("١. الطلبُ نفسُه يُرسَل بمعرّفه — لا يُسقَط", out.episodeId, 1);
  check(out.retype, "٢. **ومعه نيّةُ التصحيح صريحة**");
  check(out.fromList, "٣. ومصدرُه قائمةُ المريض لا صفُّ «معايناتي»");
  check(!out.needsChoice, "٤. وطلبٌ واحد ⟵ بلا سؤال");
  same("٥. والشكلُ كاملاً", shape(out),
    { id: 1, retype: true, n: 1, fromList: true, needsChoice: false, dropped: false, fixedActive: false });
}

console.log("\n── ب. الاتجاهُ العكسيّ وعدمُ التبديل ──");
{
  const rev = r({ specialty: "medical_support", awaiting: [ep(5, "prosthetic")] });
  same("٦. أطرافٌ بالخطأ ⟵ مساند: الطلبُ نفسُه", [rev.episodeId, rev.retype], [5, true]);
  const plain = r({ specialty: "medical_support", awaiting: [ep(5, "medical_support")] });
  same("٧. **وبلا تبديلٍ المسارُ كما كان بحرفه** — بلا راية", [plain.episodeId, plain.retype, plain.fromList],
    [5, false, false]);
}

console.log("\n── ج. **المرساةُ هي الاختصاصُ الذي فُتحت به النافذة** ──");
{
  //  فُتحت على طلب مساندٍ «أ» (#١)، وللمريض طلبُ أطرافٍ مستقلٌّ «ب» (#٢).
  //  فبدّل الطبيبُ إلى أطراف. والقراءةُ بالاختصاص **الجديد** كانت تجد «ب»
  //  فتوقّع عليها — عمليةٌ مستقلّةٌ لم ينظر فيها — **وتبقى «أ» على خطئها**.
  const A = ep(1, "medical_support"), B = ep(2, "prosthetic", 2);
  const out = r({ openedSpecialty: "medical_support", specialty: "prosthetic", awaiting: [A, B] });
  same("٨. **يُصحَّح «أ» نفسُها** — الطلبُ الذي فُتحت عليه النافذة", out.episodeId, 1);
  check(out.retype, "٩. بنيّةِ تصحيحٍ صريحة");
  same("١٠. **و«ب» لا تُمَسّ ولا تُعرَض إطلاقاً**", out.options.map((o) => o.id), [1]);
  check(!out.needsChoice, "١١. وطلبٌ أصليٌّ واحد ⟵ بلا سؤال");

  //  والاتجاهُ العكسيّ بالمرآة.
  const rev = r({ openedSpecialty: "prosthetic", specialty: "medical_support", awaiting: [A, B] });
  same("١٢. والعكسُ كذلك: فُتحت على أطراف ⟵ يُصحَّح «ب» و«أ» لا تُمَسّ",
    [rev.episodeId, rev.retype, rev.options.map((o) => o.id)], [2, true, [2]]);
}

console.log("\n── ج.٢ أكثرُ من طلبٍ للاختصاص الأصليّ ⟵ اختيارٌ لا تخمين ──");
{
  const A1 = ep(1, "medical_support"), A2 = ep(3, "medical_support", 2), B = ep(2, "prosthetic");
  const out = r({ openedSpecialty: "medical_support", specialty: "prosthetic", awaiting: [A1, A2, B] });
  same("١٣. **لا يُخمَّن أيُّ الطلبين** — لا معرّف", out.episodeId, null);
  check(out.needsChoice, "١٤. ومنتقٍ إلزاميّ (لا حفظ قبله)");
  same("١٥. **والخياران من الاختصاص الأصليّ وحده — بلا «ب»**",
    out.options.map((o) => o.id), [1, 3]);
  const picked = r({ openedSpecialty: "medical_support", specialty: "prosthetic",
    awaiting: [A1, A2, B], choice: 3 });
  same("١٦. واختيارُ الطبيب يُحسَم بنيّة التصحيح", [picked.episodeId, picked.retype], [3, true]);
  const stale = r({ openedSpecialty: "medical_support", specialty: "prosthetic",
    awaiting: [A1, A2, B], choice: 2 });
  same("١٧. **واختيارُ «ب» لا يُقبَل** — ليست من مرشَّحي التصحيح",
    [stale.episodeId, stale.needsChoice], [null, true]);
}

console.log("\n── ج.٣ ولا طلبَ للاختصاص الأصليّ ⟵ لا يُلتقَط بديل ──");
{
  const out = r({ openedSpecialty: "medical_support", specialty: "prosthetic",
    awaiting: [ep(2, "prosthetic")] });
  same("١٨. **السكوتُ أصدقُ من توقيعٍ على طلبِ غيرها**",
    [out.episodeId, out.retype, out.options.length], [null, false, 0]);
}

console.log("\n── ج.٤ وبلا تبديلٍ المرساةُ لا تغيّر شيئاً ──");
{
  const A = ep(1, "medical_support"), B = ep(2, "prosthetic");
  const same1 = r({ openedSpecialty: "medical_support", specialty: "medical_support", awaiting: [A, B] });
  same("١٩. فُتحت على مساندٍ وبقي ⟵ «أ» بلا راية",
    [same1.episodeId, same1.retype], [1, false]);
  const same2 = r({ openedSpecialty: "prosthetic", specialty: "prosthetic", awaiting: [A, B] });
  same("٢٠. وفُتحت على أطرافٍ وبقي ⟵ «ب» بلا راية",
    [same2.episodeId, same2.retype], [2, false]);
  const physio = r({ openedSpecialty: "medical_support", specialty: "physiotherapy", awaiting: [A, B] });
  same("٢١. وبُدّل إلى العلاج الطبيعي ⟵ لا جهازَ ولا تصحيح",
    [physio.episodeId, physio.retype], [null, false]);
}

console.log("\n── ج.٥ فتحٌ عامّ (بلا مرساة): طلبُ الاختصاص المختار يُوقَّع عليه ──");
{
  //  للمريض طلبُ أطرافٍ مستقلّ **وطلبُ مساندٍ مستقلّ**. اختارَ الطبيبُ أطرافاً
  //  ⟶ يُوقَّع على طلب الأطراف، **ولا يُصحَّح نوعُ المساند ولا يُمَسّ**.
  const out = r({ specialty: "prosthetic", awaiting: [ep(9, "medical_support"), ep(4, "prosthetic")] });
  same("٢٢. يُوقَّع على طلب اختصاصه هو", out.episodeId, 4);
  check(!out.retype, "٢٣. **ولا تصحيحَ** — الآخرُ طلبٌ مستقلٌّ حقيقيّ");
  same("٢٤. ولا يظهر الآخرُ في الخيارات إطلاقاً", out.options.map((o) => o.id), [4]);
}

console.log("\n── د. أكثرُ من طلبٍ للاختصاص الآخر ⟵ لا تخمين ──");
{
  const two = [ep(1, "medical_support"), ep(2, "medical_support", 2)];
  const out = r({ specialty: "prosthetic", awaiting: two });
  same("٢٥. **لا يُخمَّن أيُّهما** — لا معرّف", out.episodeId, null);
  check(out.needsChoice, "٢٦. ومنتقٍ إلزاميّ (لا حفظ قبله)");
  same("٢٧. والخياران معروضان", out.options.map((o) => o.id), [1, 2]);
  const picked = r({ specialty: "prosthetic", awaiting: two, choice: 2 });
  same("٢٨. واختيارُ الطبيب يُحسَم بنيّة التصحيح", [picked.episodeId, picked.retype, picked.needsChoice],
    [2, true, false]);
  const stale = r({ specialty: "prosthetic", awaiting: two, choice: 77 });
  same("٢٩. **واختيارٌ بائتٌ لا يُقرأ اختياراً**", [stale.episodeId, stale.needsChoice], [null, true]);
}

console.log("\n── هـ. ما لا يُصحَّح ──");
{
  same("٣٠. بلا طلباتٍ إطلاقاً ⟵ معاينةٌ بلا جهاز، بلا راية",
    shape(r({ specialty: "prosthetic" })),
    { id: null, retype: false, n: 0, fromList: false, needsChoice: false, dropped: false, fixedActive: false });
  const physio = r({ specialty: "physiotherapy", awaiting: [ep(1, "medical_support")] });
  same("٣١. **ولا تصحيحَ إلى العلاج الطبيعي** — بلا حلقاتٍ أصلاً",
    [physio.episodeId, physio.retype, physio.options.length], [null, false, 0]);
  const edit = r({ isEdit: true, specialty: "prosthetic", awaiting: [ep(1, "medical_support")] });
  same("٣٢. والتحريرُ (نسخةٌ ثانية) لا يعيد ختمَ الجهاز ولا يصحّح نوعاً",
    [edit.episodeId, edit.retype], [null, false]);
  const noSpec = r({ specialty: null, awaiting: [ep(1, "medical_support")] });
  same("٣٣. وبلا اختصاصٍ مختار ⟵ لا شيء", [noSpec.episodeId, noSpec.retype], [null, false]);
}

console.log("\n── و. مسارُ «معايناتي» لم يتغيّر بحرف (٤.y) ──");
{
  const applies = r({ specialty: "medical_support", fixedEpisodeId: 7, fixedEpisodeSpecialty: "medical_support" });
  same("٣٤. جهازٌ مُمرَّرٌ يخصّ اختصاصَه ⟵ هو، بلا راية",
    [applies.episodeId, applies.retype, applies.fixedActive], [7, false, true]);
  const retyped = r({ specialty: "prosthetic", fixedEpisodeId: 7, fixedEpisodeSpecialty: "medical_support" });
  same("٣٥. وبُدّل اختصاصُه ⟵ **هو نفسُه** مع الراية",
    [retyped.episodeId, retyped.retype, retyped.fixedActive], [7, true, true]);
  const dropped = r({ specialty: "physiotherapy", fixedEpisodeId: 7, fixedEpisodeSpecialty: "medical_support" });
  same("٣٦. وبُدّل إلى العلاج الطبيعي ⟵ يسقط حقّاً ويُقال",
    [dropped.episodeId, dropped.dropped, dropped.fixedActive], [null, true, false]);
  //  **والجهازُ المُمرَّر يعلو على القائمة** — لا يُلتقَط غيرُه أبداً.
  const withList = r({ specialty: "prosthetic", fixedEpisodeId: 7, fixedEpisodeSpecialty: "medical_support",
    awaiting: [ep(3, "prosthetic")] });
  same("٣٧. **ولا يُختار طلبٌ آخر مكانه** ولو كان للاختصاص الجديد طلبُه",
    [withList.episodeId, withList.retype], [7, true]);
}

console.log("\n── ز. `fixedActive` لا تعتمد على القائمة ──");
{
  //  الشاشةُ تقرؤها **قبل** أن تجلب القائمة لتقرّر أتجلبها — فلو اعتمدت عليها
  //  لدارت على نفسها.
  for (const [spec, fspec] of [["medical_support", "medical_support"], ["prosthetic", "medical_support"],
    ["physiotherapy", "medical_support"]] as const) {
    const a = r({ specialty: spec, fixedEpisodeId: 7, fixedEpisodeSpecialty: fspec, awaiting: [] });
    const b = r({ specialty: spec, fixedEpisodeId: 7, fixedEpisodeSpecialty: fspec,
      awaiting: [ep(3, "prosthetic"), ep(4, "medical_support")] });
    same(`٣٨. ${spec}: بالقائمة وبدونها سواء`, a.fixedActive, b.fixedActive);
  }
}

console.log("\n── ح. `isDeviceSpecialty` ──");
{
  same("٣٩. الأجهزةُ للأطراف والمساند وحدهما",
    ["prosthetic", "medical_support", "physiotherapy", null, undefined, ""].map(isDeviceSpecialty),
    [true, true, false, false, false, false]);
}

console.log(failures === 0 ? "\n✅ كل الاختبارات نجحت" : `\n❌ ${failures} فشل`);
process.exit(failures === 0 ? 0 : 1);
