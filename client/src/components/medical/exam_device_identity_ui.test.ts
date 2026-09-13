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
check("٤. **ولا تجلبها حين يصلها المعرّفُ ثابتاً** من صفّ القائمة",
  dlg.includes("enabled: open && !isEdit && fixedEpisode === null"));
check("٥. المرشَّحون بالاختصاص المختار وحده",
  dlg.includes("filter((e) => e.caseType === specialty)"));
check("٦. **أكثرُ من مرشَّح بلا اختيار ⟵ لا حفظ** — لا تخمينَ في الشاشة كما لا تخمينَ في الخادم",
  dlg.includes("const needsEpisodeChoice = fixedEpisode === null && candidates.length > 1 && resolvedEpisode === null")
  && /disabled=\{[^}]*needsEpisodeChoice[^}]*\}/.test(dlg));
check("٧. وأثناءَ تحميل المرشَّحين لا حفظ (وإلّا وُقّع بلا هويّة على خيطٍ فيه جهازان)",
  /disabled=\{[^}]*candidatesLoading[^}]*\}/.test(dlg));
check("٨. والاختصاصُ مقفولٌ حين يكون الجهازُ ثابتاً — المعرّفُ يقول اختصاصَه",
  dlg.includes("disabled={!isEdit && fixedEpisode !== null}"));

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
  dlg.includes('err?.code === "device_episode_stale" && fixedEpisode !== null) onOpenChange(false)'));

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
