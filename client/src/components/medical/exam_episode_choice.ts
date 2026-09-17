// ══ أيُّ طلبِ جهازٍ تُختَم عليه هذه المعاينة؟ — قرارٌ خالصٌ يُختبَر ═══════════
//
// **لماذا خارجَ المكوّن**: المشروعُ بلا مشغّل DOM، فقرارٌ يعيش داخل React لا
// يُختبَر إلّا بقراءة نصِّه — وقراءةُ النصّ لا تُمسك انقلاباً في المعنى يعود
// بصياغةٍ أخرى (درسُ §4.u). وهذا قرارٌ حقيقيّ: **أيُّ جهازٍ**، و**أهو تصحيحُ
// نوعٍ أم توقيعٌ عاديّ** — والخطأُ فيه يُختَم بترِكر ٠٢٨ فلا يُصحَّح بعدها.
//
// ══ الثابت ══════════════════════════════════════════════════════════════
//   صفُّ عملٍ أو صفحةُ مريض ⟶ طلبٌ بعينه ⟶ نيّةٌ صريحة ⟶ الخادمُ يحكم تحت القفل.
//   ولا تخمينَ بين طلبين، ولا التقاطَ طلبٍ مستقلٍّ لم ينظر فيه الطبيب.

export interface AwaitingEpisodeOption {
  id: number;
  caseType: string;
  sequenceNumber: number;
  requestedItem: string;
  awaitingSince: string | null;
  reviewKind: string | null;
}

/** الأجهزةُ للأطراف والمساند وحدهما — العلاجُ الطبيعي بلا حلقات. */
export function isDeviceSpecialty(s: string | null | undefined): boolean {
  return s === "prosthetic" || s === "medical_support";
}

export interface ExamEpisodeChoice {
  /** ما يُرسَل في `deviceEpisodeId` — أو `null` فمعاينةٌ بلا جهاز. */
  episodeId: number | null;
  /** رايةُ `retypeDeviceEpisode` — **نيّةٌ صريحة**، لا دلالةٌ تتغيّر ضمناً. */
  retype: boolean;
  /** ما يُعرَض للطبيب ليختار منه. */
  options: AwaitingEpisodeOption[];
  /** المرشَّحون من قائمة المريض لا من صفّ «معايناتي». */
  fromList: boolean;
  /** أكثرُ من طلبٍ بلا اختيار ⟶ لا حفظ. */
  needsChoice: boolean;
  /** الجهازُ المُمرَّر سقط حقّاً (تبديلٌ إلى العلاج الطبيعي مثلاً). */
  dropped: boolean;
  /** الجهازُ المُمرَّر يخصّ الاختصاصَ المختار — المسارُ العاديّ بحرفه. */
  fixedApplies: boolean;
  /**
   * الجهازُ المُمرَّر هو المقصود (طبَّق أو صُحِّح نوعُه) — **ولا يعتمد على
   * `awaiting` إطلاقاً**، فتقرؤه الشاشةُ قبل أن تجلب القائمة لتقرّر أتجلبها.
   */
  fixedActive: boolean;
}

export function resolveExamEpisodeChoice(params: {
  isEdit: boolean;
  specialty: string | null;
  /** من صفّ «معايناتي» وحده — البابان الآخران لا يمرّرانه. */
  fixedEpisodeId: number | null;
  fixedEpisodeSpecialty: string | null;
  /**
   * **الاختصاصُ الذي فُتحت به النافذة** (`preferSpecialty`) — يمرّره الأبوابُ
   * الثلاثة. وهو **مرساةُ التصحيح**: متى بدّله الطبيبُ صار طلبُ التصحيح
   * يُطلَب من أجهزة هذا الاختصاص هو، لا من أجهزة الاختصاص الجديد.
   */
  openedSpecialty: string | null;
  awaiting: AwaitingEpisodeOption[];
  choice: number | null;
}): ExamEpisodeChoice {
  const { isEdit, specialty, fixedEpisodeId, fixedEpisodeSpecialty, openedSpecialty,
    awaiting, choice } = params;

  //  ══ ① الجهازُ المُمرَّر — حين يصل الصفُّ بهويّته ═══════════════════════
  const fixedApplies = fixedEpisodeId !== null && !!specialty && specialty === fixedEpisodeSpecialty;
  //  بُدّل الاختصاصُ على طلبٍ بعينه ⟶ **يُصحَّح هو** ولا تُسقَط هويّتُه (§4.y).
  const fixedRetype = fixedEpisodeId !== null && !isEdit && !!specialty
    && !fixedApplies
    && isDeviceSpecialty(fixedEpisodeSpecialty) && isDeviceSpecialty(specialty);
  const activeFixed = (fixedApplies || fixedRetype) ? fixedEpisodeId : null;
  //  سقوطٌ حقيقيّ — يُقال للطبيب، ولا يختفي صامتاً.
  const dropped = fixedEpisodeId !== null && !fixedApplies && !fixedRetype && !isEdit && !!specialty;

  //  ══ ② وإلّا فمن قائمة أجهزة المريض المنتظرة ════════════════════════════
  // ══ **والمرساةُ هي الاختصاصُ الذي فُتحت به النافذة، لا الجديد** ═════════
  //  فُتحت على طلب مساندٍ «أ»، وللمريض طلبُ أطرافٍ مستقلٌّ «ب»، فبدّل الطبيبُ
  //  إلى أطراف. والقراءةُ بالاختصاص **الجديد** تجد «ب» فتوقّع عليها — وهي
  //  عمليةٌ مستقلّةٌ لم ينظر فيها، **وتبقى «أ» على خطئها**. والمقصودُ يقيناً
  //  هو الطلبُ الذي فُتحت عليه النافذة.
  //
  //  **فالمرشَّحون من أجهزة الاختصاص الأصليّ وحدها**، وأجهزةُ الاختصاص الجديد
  //  لا تُقرأ ولا تُعرَض ولا تُمَسّ. وصفرٌ منها ⟶ **لا يُلتقَط بديلٌ**:
  //  السكوتُ أصدقُ من توقيعٍ على طلبِ غيرها.
  const switchedFromOpened = !isEdit && activeFixed === null
    && isDeviceSpecialty(openedSpecialty) && isDeviceSpecialty(specialty)
    && specialty !== openedSpecialty;

  //  **والتحريرُ خارجَ هذا كلِّه**: النسخةُ الثانية لا تعيد ختمَ الجهاز.
  //  ويُقال صراحةً هنا لا يُترَك لكون الاستعلام معطَّلاً في الشاشة —
  //  الاستثناءُ يُطلَب باسمه ولا يُنال بالسهو.
  const sameSpecialty = !isEdit && activeFixed === null && specialty && !switchedFromOpened
    ? awaiting.filter((e) => e.caseType === specialty)
    : [];

  //  **والتصحيحُ من صفحة المريض والسجلّ أيضاً** — لا من «معايناتي» وحدها:
  //  هما لا يمرّران معرّفاً، فكان التبديلُ يقع بلا هويّةٍ وبلا راية فيمضي
  //  التوقيعُ «بلا جهاز» ويتولّاه تبديلُ §4.b — **فتُحذَف حلقةُ الطلب سقالةً
  //  ويخرج المريضُ بلا طلبِ جهازٍ إطلاقاً**. ومَن سُجّل بالنوع الصحيح من
  //  البداية يملك طلبَ جهازٍ حيّاً، فذاك ليس «كأنه سُجّل صحيحاً».
  //
  //  ══ **ولا تصحيحَ تلقائيّاً بلا مرساة — والفتحُ العامّ لا يختطف** ════════
  //  (قرارُ المالك ٢٠٢٦-٠٩-١٧ — **يضيّق ما كان هنا**)
  //
  //  كان الفتحُ العامّ — نافذةٌ تُفتَح **بلا اختصاصٍ أصليٍّ معلوم** — يسقط إلى
  //  مخرجٍ ظُنّ ضيّقاً: «لا جهازَ للاختصاص المختار وللآخر أجهزتُه ⟶ هي
  //  المقصودة». **وذاك تخمينُ نيّةٍ لا قراءتُها**: لم يبدّل الطبيبُ شيئاً، ولا
  //  إشارةَ في المُدخَل كلِّه أن ذلك الطلبَ خطأٌ يُصحَّح.
  //
  //  **ويقع فعلاً**: زرُّ «معاينة جديدة» في صفحة المريض يمرّر `preferSpecialty`
  //  من اختصاصٍ **منتظرٍ يملكه الطبيبُ نفسُه**، وإلّا `null`. فمريضٌ له طلبُ
  //  مساندٍ منتظر وطبيبٌ اختصاصُه الأطرافُ وحدها ⟶ فتحٌ عامّ، ثمّ يستقرّ
  //  الاختصاصُ على «أطراف» (اختصاصُه الوحيد) ⟶ **فيُصحَّح نوعُ طلبِ مساندٍ
  //  مستقلٍّ لم يبدّله أحد**: يُنقَل إلى خيط الأطراف، وتُختَم عليه معاينةٌ
  //  (ترِكر ٠٢٨) لا تُصحَّح بعدها، ويُغلق طلبُ مراجعته، وتُولَد له متابعةُ
  //  شراء لجهازٍ لم ينظر فيه أحد.
  //
  //  **فالتصحيحُ التلقائيُّ بين الأطراف والمساند مشروطٌ بتبديلٍ صريح عن
  //  مرساةٍ معلومة** — لا غير. وفي الفتح العامّ:
  //    · للاختصاص المختار طلبُه المنتظر ⟶ يُوقَّع عليه كما كان (`sameSpecialty`).
  //    · ولا طلبَ له ⟶ **معاينةٌ بلا جهاز**، ولا يُمَسّ طلبُ الاختصاص الآخر
  //      لا نوعاً ولا حالةً ولا طلبَ مراجعة، ولا يُعرَض خياراً أصلاً.
  const otherSpecialty = switchedFromOpened
    //  بُدّل عن اختصاصٍ معلوم ⟶ **أجهزتُه هو، لا غيرُها**.
    ? awaiting.filter((e) => e.caseType === openedSpecialty)
    : [];

  //  **ولا تصحيحَ حين للاختصاص المختار طلبُه هو**: ذاك طلبٌ مستقلٌّ حقيقيّ
  //  يُوقَّع عليه، والآخرُ لا يُمَسّ (§4.y).
  const fromList = sameSpecialty.length === 0 && otherSpecialty.length > 0;
  const options = fromList ? otherSpecialty : sameSpecialty;

  //  واحدٌ ⟵ هو؛ أكثرُ ⟵ ما اختاره الطبيب؛ صفرٌ ⟵ معاينةٌ بلا جهاز.
  //  **ولا تخمينَ بين طلبين** — لا في الشاشة كما لا في الخادم.
  const episodeId: number | null = activeFixed !== null
    ? activeFixed
    : options.length === 1
      ? options[0].id
      : options.length > 1
        ? (options.some((c) => c.id === choice) ? choice : null)
        : null;

  const needsChoice = activeFixed === null && options.length > 1 && episodeId === null;

  //  النيّةُ صريحةٌ من البابين معاً — وبلا هذه الراية يبقى معرّفُ خيطٍ آخر
  //  بائتاً ٤٠٩ في الخادم كما كان بحرفه.
  const retype = !isEdit && episodeId !== null
    && (fixedRetype || (activeFixed === null && fromList));

  return { episodeId, retype, options, fromList, needsChoice, dropped, fixedApplies,
    fixedActive: activeFixed !== null };
}
