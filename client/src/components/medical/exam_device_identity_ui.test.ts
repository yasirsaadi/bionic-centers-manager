// **عقدُ الشاشة مع الخادم** — هويّةُ الجهاز في توقيع المعاينة (المرحلة
// الأولى من قطار الإصلاح، ترحيل ٠٧٧). `npm run test:exam-identity-ui`.
//
// ══ العطبُ الذي يحرسه ═══════════════════════════════════════════════════
// الخادمُ صار يشترط `deviceEpisodeId` حين ينتظر على الخيط أكثرُ من جهاز
// (٤٠٩ `device_episode_ambiguous`)، ويردّ ٤٠٩ `device_episode_stale` لشاشةٍ
// بائتة. وشاشةٌ لا ترسل المعرّف، أو لا تفهم الرمزين، أو تفتح نافذةً واحدة
// لصفَّين بهويّتين — تجعل الميزةَ الصحيحة في الخادم **بابَ رفضٍ دائم** في
// العمل: يضغط الطبيبُ «حفظ» فيُردّ بلا أن يعرف لماذا ولا كيف يصحّح.
//
// ══ ولماذا يُقرأ المصدر ═════════════════════════════════════════════════
// لا مُشغِّل DOM في هذا الريبو، واختبارُ الخادم (`test:exam-identity`) لا
// يرى هذا العطب: النقطةُ تعمل، والنافذةُ قد لا تناديها بما تحتاج.

import { readFileSync } from "fs";
import { join } from "path";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}
const read = (rel: string) => readFileSync(join(import.meta.dirname, rel), "utf8");
const dlg = read("./NewExamDialog.tsx");
const page = read("../../pages/MyExams.tsx");

console.log("\n═══ عقدُ هويّة الجهاز في نافذة المعاينة ═══\n");

// ── ١. الحمولة ───────────────────────────────────────────────────────────
console.log("── الحمولة ──");
check("١. **المعرّفُ يُرسَل في جسم التوقيع** حين يُحسَم",
  dlg.includes("{ deviceEpisodeId: resolvedEpisode }"));
check("٢. ولا يُرسَل في التحرير (النسخةُ الثانية لا تعيد ختمَ الجهاز)",
  dlg.includes("isEdit || resolvedEpisode === null ? {} : { deviceEpisodeId: resolvedEpisode }"));

// ── ٢. الحسمُ في الشاشة يطابق حسمَ الخادم ─────────────────────────────────
console.log("\n── الحسم ──");
check("٣. النافذةُ تقرأ الأجهزةَ المنتظرة من نقطة المعاينات (`awaitingEpisodes`)",
  dlg.includes("awaitingEpisodes") && dlg.includes("/api/medical/patients/${patientId}/exams"));
check("٤. **ولا تجلبها حين يصلها المعرّفُ ثابتاً** من صفّ القائمة — بالهويّة الفعّالة",
  dlg.includes("enabled: open && !isEdit && activeFixedEpisode === null"));
check("٥. المرشَّحون بالاختصاص المختار وحده",
  dlg.includes("filter((e) => e.caseType === specialty)"));
check("٦. **أكثرُ من مرشَّح بلا اختيار ⟵ لا حفظ** — لا تخمينَ في الشاشة كما لا تخمينَ في الخادم",
  dlg.includes("const needsEpisodeChoice = activeFixedEpisode === null && candidates.length > 1 && resolvedEpisode === null")
  && /disabled=\{[^}]*needsEpisodeChoice[^}]*\}/.test(dlg));
check("٧. وأثناءَ تحميل المرشَّحين لا حفظ (وإلّا وُقّع بلا هويّة على خيطٍ فيه جهازان)",
  /disabled=\{[^}]*candidatesLoading[^}]*\}/.test(dlg));
// ── ٨. **الاختصاصُ مفتوحٌ دائماً، والجهازُ يسقط بتبديله** ────────────────
//  ⚠ **انعكسَ عقدُ البند ٨ بقرارِ المالك (٢٠٢٦-٠٩-١٥)**: كان يثبت أن المنتقيَ
//  **مقفول** متى وصل جهازٌ ثابت. ومَن يفحص المريضَ هو مَن يحدّد اختصاصَه،
//  وتصحيحُه قرارٌ سريريّ (§4.b) لا يجوز أن يُقفَل بحجّة هويّة جهاز.
check("٨. **المنتقي مفتوحٌ دائماً** — لا `disabled` عليه إطلاقاً",
  !/<Select value=\{specialty\}[\s\S]{0,200}?disabled=/.test(dlg));
check("٨أ. واختصاصُ الجهاز المُمرَّر يُقرأ من `preferSpecialty` — الصفُّ نفسُه يمرّرهما",
  dlg.includes("const fixedEpisodeSpecialty = fixedEpisode === null ? null : (preferSpecialty ?? null)"));
//  ⚠ **وانعكسَ عقدُ ٨ب بقرارِ المالك (٢٠٢٦-٠٩-١٦)**: كان يثبت أن تبديلَ
//  الاختصاص **يُسقط** الجهازَ المُمرَّر. وإسقاطُ هويّته ليس حلّاً — التوقيعُ
//  بلا معرّف يلتقط «الوحيدةَ المنتظرة»، وقد تكون طلباً مستقلّاً آخر لم ينظر
//  فيه الطبيب (مُثبَتٌ حيّاً في `test:exam-identity` قسما ف وق). فالمعرّفُ
//  يبقى، ومعه رايةُ تصحيحٍ صريحة، والخادمُ يصحّح **ذلك الطلبَ بعينه**.
check("٨ب. **وتبديلُ الاختصاص يصحّح الطلبَ نفسَه ولا يُسقط هويّته**",
  dlg.includes("const fixedEpisodeApplies = fixedEpisode !== null && specialty === fixedEpisodeSpecialty")
  && dlg.includes("const activeFixedEpisode = (fixedEpisodeApplies || fixedEpisodeRetype) ? fixedEpisode : null"));
check("٨ب.١ **والتصحيحُ بين اختصاصَي الأجهزة وحدهما** — العلاجُ الطبيعي بلا حلقات",
  dlg.includes("const fixedEpisodeRetype = fixedEpisode !== null && !isEdit && !!specialty")
  && dlg.includes("&& isDeviceKind(fixedEpisodeSpecialty) && isDeviceKind(specialty)"));
check("٨ب.٢ **والنيّةُ صريحةٌ في الحمولة** — بلا الراية يبقى معرّفُ خيطٍ آخر بائتاً",
  dlg.includes("{ retypeDeviceEpisode: true }")
  && /!isEdit && fixedEpisodeRetype && resolvedEpisode !== null/.test(dlg));
check("٨ب.٣ **والسقوطُ يبقى للتبديل الذي لا تصحيحَ فيه** — لا يشمل تصحيحَ النوع",
  dlg.includes("const fixedEpisodeDropped = fixedEpisode !== null && !fixedEpisodeApplies")
  && dlg.includes("&& !fixedEpisodeRetype && !isEdit && !!specialty"));
check("٨ج. **والحمولةُ تُبنى من الهويّة الفعّالة** — فلا يُرسَل معرّفُ جهازِ اختصاصٍ آخر",
  dlg.includes("const resolvedEpisode: number | null = activeFixedEpisode !== null")
  && dlg.includes("? activeFixedEpisode"));
check("٨د. ويُقال للطبيب أن الجهازَ سقط — لا يختفي صامتاً",
  dlg.includes("fixedEpisodeDropped") && dlg.includes('data-testid="note-exam-device-dropped"'));
//  **والعبارةُ تقتصر على الربط ولا تَعِد بمصير**: كانت تقول «يبقى ذلك الطلب
//  كما هو بانتظار معاينته» — وذاك يكذب حين يكون الخيطُ وحيداً، فمنطقُ
//  التبديل القائم يسحبه: الحلقةُ تُحذَف والطلبُ يُلغى (مُثبَتٌ حيّاً في
//  `test:exam-identity` بنود ٨٣.أ–ج). والفحصُ على **نصّ السطر وحده**
//  لا الملفّ كلِّه، فتعليقٌ يشرح المصيرَ لا يُقرأ وعداً للطبيب.
const droppedNote = (() => {
  const at = dlg.indexOf('data-testid="note-exam-device-dropped"');
  return at < 0 ? "" : dlg.slice(at, dlg.indexOf("</p>", at));
})();
check("٨هـ. **ولا تَعِد بمصير الطلب القديم** — الربطُ وحده هو ما تقوله",
  droppedNote.includes("فلن تُربَط هذه المعاينة بطلب الجهاز")
  && !/يبقى|بانتظار معاينته|كما هو|سيُلغى|سيُحذف/.test(droppedNote), droppedNote);
//  وسطرُ التصحيح كذلك: يقول إن المقصودَ الطلبُ نفسُه وإنه لن يُربَط بغيره —
//  **ولا يَعِد بنقلٍ** قد لا يقع (خيطٌ هدفٌ غيرُ موجود ⟵ مسارُ §4.b القائم).
const retypedNote = (() => {
  const at = dlg.indexOf('data-testid="note-exam-device-retyped"');
  return at < 0 ? "" : dlg.slice(at, dlg.indexOf("</p>", at));
})();
check("٨و. **وسطرُ التصحيح يقول المقصودَ ونفيَ الربط بغيره، ولا يَعِد بنقل**",
  retypedNote.includes("المقصود طلب الجهاز نفسه")
  && retypedNote.includes("ولن تُربَط هذه المعاينة بأي طلب جهاز آخر")
  && !/سيُنقَل|سيُحذف|سيُلغى|يبقى/.test(retypedNote), retypedNote);

// ── ٣. ثلاثُ حالاتِ عرض ───────────────────────────────────────────────────
console.log("\n── العرض ──");
check("٩. جهازٌ ثابت: سطرٌ يسمّيه", dlg.includes('data-testid="note-exam-device-fixed"'));
check("١٠. مرشَّحٌ واحد: سطرٌ يسمّيه بلا سؤال", dlg.includes('data-testid="note-exam-device-single"'));
check("١١. أكثرُ من مرشَّح: منتقٍ صريح", dlg.includes('data-testid="select-exam-device"'));

// ── ٤. أخطاءُ الخادم تُفهَم لا تُعرَض خاماً ─────────────────────────────
console.log("\n── الأخطاء ──");
check("١٢. **الرمزان يُلتقَطان** ويُعاد تحميلُ المرشَّحين",
  dlg.includes('err?.code === "device_episode_ambiguous" || err?.code === "device_episode_stale"'));
check("١٣. وشاشةٌ بائتة على جهازٍ ثابت تُغلَق — الصفُّ لم يعد قائماً",
  dlg.includes('err?.code === "device_episode_stale" && activeFixedEpisode !== null) onOpenChange(false)'));
//  **وبالهويّة الفعّالة لا الممرَّرة**: تبديلٌ إلى العلاج الطبيعي يُسقط
//  الجهازَ حقّاً، فللطبيب بديلٌ يُحَلّ من القائمة ولا تُغلَق نافذتُه. أمّا
//  تصحيحُ النوع فهويّتُه فعّالة — و٤٠٩ عليها يعني أن الطلبَ نفسَه لم يعد
//  قائماً، فالإغلاقُ صحيح.
check("١٣ب. **ولا تُغلَق على مَن سقط جهازُه** — الفحصُ بالفعّالة لا بالممرَّرة",
  !dlg.includes('err?.code === "device_episode_stale" && fixedEpisode !== null) onOpenChange(false)'));

// ── ٥. «معايناتي» — صفٌّ لكلّ جهاز ────────────────────────────────────────
console.log("\n── معايناتي ──");
check("١٤. مفتاحُ الصفّ بالحلقة لا بالمريض (جهازان = صفّان)",
  page.includes('return `${r.patientId}-${r.caseType}-${r.episodeId ?? "case"}`'));
check("١٥. **والنافذةُ تُعاد تركيبُها لكلّ صفّ** — لا حالةَ جهازٍ تتسرّب بين صفَّين",
  page.includes("key={rowKey(target)}"));
check("١٦. ويصلها معرّفُ الجهاز من الصفّ",
  page.includes("deviceEpisodeId={target.episodeId ?? null}"));
check("١٧. والصفُّ يسمّي جهازَه (رقمُه وما طُلب) لا الاختصاصَ وحده",
  page.includes("جهاز #{r.sequenceNumber ?? \"?\"} · {requestedItemLabel(r.requestedItem, r.caseType)}"));

console.log(failures === 0 ? "\n✅ كل الاختبارات نجحت" : `\n❌ ${failures} فشل`);
process.exit(failures === 0 ? 0 : 1);
