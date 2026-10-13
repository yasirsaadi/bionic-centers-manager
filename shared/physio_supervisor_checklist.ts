// **«اضغطه يا سليم»** — ما ينتظر قرارَ المشرف العام في البروتوكول (ترحيل ١٣٩، §4.dy).
//
// قرارُ المالك (٢٠٢٦-١٠-١٣): كلُّ بروتوكولٍ مكتمل التفصيل يُعلَّم بلونٍ في المكتبة، وفي صفحته زرٌّ واضح لسليم «فيه كلُّ ما تحتاجه من سليم لهذا البروتوكول
// من إعداداتٍ وأجهزة وكلُّ ما تسألني عنه». فالزرُّ يجمع شيئين:
//   ١. **المحسوب من البيانات الآن** (`liveChecks`) — الاعتماد، وإعداداتُ الأجهزة الناقصة، والمقاييس، والبطاقاتُ المسوّدة، والصورُ المنتظرة — لا يُخزَّن فلا يكذب.
//   ٢. **البنودُ المكتوبة** (`physio_protocol_checklist`) — أسئلةُ المساعد التي كانت تمرّ عبر المالك، وسليم يعلّم كلّاً منها «تمّ» بقراره.

export type ChecklistTopic = "dose" | "limits" | "devices" | "settings" | "measures" | "content";
export const CHECKLIST_TOPICS: readonly ChecklistTopic[] = ["dose", "limits", "devices", "settings", "measures", "content"];
export const CHECKLIST_TOPIC_LABELS: Record<ChecklistTopic, { ar: string; en: string }> = {
  dose: { ar: "عددُ الجلسات", en: "Number of sessions" },
  limits: { ar: "حدودُ الانتقال", en: "Progression limits" },
  devices: { ar: "الأجهزة", en: "Devices" },
  settings: { ar: "إعداداتُ الأجهزة", en: "Device settings" },
  measures: { ar: "المقاييس", en: "Measures" },
  content: { ar: "المحتوى", en: "Content" },
};

/** قرارُ سليم على البند — سطرٌ قصير اختياريّ. */
export const CHECKLIST_NOTE_MAX = 500;

export interface ChecklistItem {
  key: string; topic: ChecklistTopic | string; textAr: string; textEn: string; position: number;
  doneAt: string | Date | null; doneByName: string | null; note: string | null;
}

/** **مكتملُ التفصيل** = له مراحلُ بتمارينها (القالبُ الكامل — §4.cx · §4.dd)؛ والمزروعُ المختصر بلا مراحل. */
export const isDetailedProtocol = (phaseCount: number | null | undefined) => Number(phaseCount ?? 0) > 0;

export const openItemsCount = (items: readonly Pick<ChecklistItem, "doneAt">[] | null | undefined) =>
  (items ?? []).filter((i) => !i.doneAt).length;

export type LiveState = "todo" | "done" | "info";
export interface LiveCheck { key: string; state: LiveState; ar: string; en: string }

interface LiveInput {
  status: "draft" | "approved" | string;
  approvedByName?: string | null;
  isArchived?: boolean;
  settingsBlockers?: readonly { code: string; nameAr: string; nameEn?: string; missing: readonly { ar: string; en: string }[] }[];
  measuresStatus?: "draft" | "approved" | string | null;
  phases?: readonly { exercises?: readonly { exerciseId?: number; exercise?: { status?: string | null; nameAr?: string; images?: readonly { url?: string | null }[] | null } | null }[] }[];
}

const nAr = (n: number) => n.toLocaleString("ar-IQ");

/**
 * **المحسوبُ الآن** — بالترتيب الذي يمرّ به سليم: إعداداتُ الأجهزة (تمنع الاعتماد)، ثمّ البطاقات، ثمّ المقاييس، ثمّ الاعتماد نفسُه؛ والصورُ للمالك لا له.
 * كلُّ سطرٍ «ينتظرك» أو «تمّ» أو «للعلم».
 */
export function liveChecks(p: LiveInput): LiveCheck[] {
  const out: LiveCheck[] = [];
  const blockers = p.settingsBlockers ?? [];
  if (blockers.length) {
    for (const b of blockers) {
      out.push({ key: `settings-${b.code}`, state: "todo",
        ar: `إعداداتُ «${b.nameAr}» من جهاز المركز قبل الاعتماد: ${b.missing.map((m) => m.ar).join("، ")} — من «تعديل» في خانات الجهاز.`,
        en: `${b.nameEn ?? b.nameAr} settings from the centre's device before approval: ${b.missing.map((m) => m.en).join(", ")} — under 'Edit' in the device fields.` });
    }
  } else {
    out.push({ key: "settings", state: "done", ar: "لا جهازَ مستعمَلاً ناقصَ الإعدادات.", en: "No device in use is missing its settings." });
  }
  //  البطاقةُ مرّةً واحدة ولو تكرّرت في أكثر من مرحلة — مفتاحُ الخريطة رقمُها.
  const cards = new Map<string, { status: string; missing: number }>();
  for (const ph of p.phases ?? []) for (const x of ph.exercises ?? []) {
    const e = x.exercise;
    const id = x.exerciseId != null ? `#${x.exerciseId}` : e?.nameAr;
    if (!e || !id) continue;
    cards.set(id, { status: String(e.status ?? "draft"), missing: (e.images ?? []).filter((i) => !i?.url).length });
  }
  const draftCards = Array.from(cards.values()).filter((c) => c.status !== "approved").length;
  if (cards.size) {
    out.push(draftCards
      ? { key: "cards", state: "todo", ar: `بطاقاتُ تمرينٍ مسوّدة في مراحله: ${nAr(draftCards)} من ${nAr(cards.size)} — اعتمدها من «مكتبة التمارين» أو من «البطاقة» في المرحلة.`,
          en: `${draftCards} of ${cards.size} exercise cards in its phases are drafts — approve them from the exercise library or from 'Card' in the phase.` }
      : { key: "cards", state: "done", ar: `بطاقاتُ مراحله كلُّها معتمَدة: ${nAr(cards.size)}.`, en: `All ${cards.size} cards in its phases are approved.` });
  }
  out.push(p.measuresStatus === "approved"
    ? { key: "measures", state: "done", ar: "المقاييسُ معتمَدة.", en: "The measures are approved." }
    : { key: "measures", state: "todo", ar: "المقاييسُ لم تُعتمد — راجعها وأضف ما تريد واعتمدها من «المقاييس».", en: "The measures are not approved — review, add and approve them under 'Measures'." });
  out.push(p.status === "approved"
    ? { key: "approve", state: "done", ar: `البروتوكولُ معتمَد${p.approvedByName ? ` — اعتمده ${p.approvedByName}` : ""}.`, en: `The protocol is approved${p.approvedByName ? ` by ${p.approvedByName}` : ""}.` }
    : { key: "approve", state: "todo",
        ar: blockers.length ? "لم تعتمده بعد — يُعتمد بعد إعدادات الأجهزة أعلاه، بزرّ «اعتماد» في رأس الصفحة." : "لم تعتمده بعد — بعد المراجعة اعتمده بزرّ «اعتماد» في رأس الصفحة.",
        en: blockers.length ? "Not approved yet — approve it after the device settings above, with 'Approve' at the top." : "Not approved yet — after review, approve it with 'Approve' at the top." });
  const missingImages = Array.from(cards.values()).reduce((n, c) => n + c.missing, 0);
  if (missingImages) {
    out.push({ key: "images", state: "info", ar: `صورٌ لبطاقاته تنتظر المالك: ${nAr(missingImages)} — لا عملَ لك فيها، والبطاقةُ تُقرأ بلا صورة.`,
      en: `${missingImages} card images are awaited from the owner — nothing for you to do; the card reads without them.` });
  }
  return out;
}

/** كم ينتظر سليمَ الآن: البنودُ المكتوبة غيرُ المنجزة + المحسوبُ «ينتظرك». */
export function supervisorTodoCount(p: LiveInput & { checklist?: readonly Pick<ChecklistItem, "doneAt">[] | null }): number {
  return openItemsCount(p.checklist) + liveChecks(p).filter((c) => c.state === "todo").length;
}
