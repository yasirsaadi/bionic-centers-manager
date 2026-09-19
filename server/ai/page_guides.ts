/**
 * دليلُ الشاشة — **صفحةٌ واحدة في هذه المرحلة** (٤أ): «بانتظار الحسم».
 *
 * يقول للنموذج ما على الشاشة فعلاً: تبويباها، ومرشِّحاتُها، وأزرارُ صفوفها
 * بأسمائها كما يقرؤها الموظّف. فيفهم «ليش ما أشوف زرّ إتمام البيع؟» بدل
 * أن يخمّن.
 *
 * ══ ثلاثةُ ثوابتَ في بنائه ═════════════════════════════════════════════
 * ① **لا مصدرَ حقيقةٍ ثانٍ**: التسمياتُ من `shared/decision_queue.ts`
 *    والصلاحيةُ من `canCompleteReceptionSale` في `shared/commercial.ts` —
 *    **تُستدعى لا تُنسَخ قائمةُ أدوارها**. فتغييرُ أيٍّ منهما يتبعه الدليل.
 * ② **لا بياناتِ صفٍّ حيّة**: هذه المرحلةُ لا تقرأ صفّاً ولا تنادي أداةً
 *    ولا تلمس قاعدة. فالدليلُ يصف **القواعد**، ولا يدّعي حالةَ صفٍّ بعينه.
 * ③ **ووجودُ الزرّ لصفٍّ بعينه لا يُستنتَج من الدور**: يقرّره الخادمُ لكلّ
 *    صفٍّ عبر `examPath` و`actions` و`mayCancelDecision` وحالةِ الصفّ —
 *    وهي **ليست في هذه المرحلة**. فالنموذجُ مُلزَمٌ أن يقول ذلك صراحةً.
 */

import {
  DECISION_QUEUE_PAGE_TITLE, DECISION_QUEUE_PAGE_SUBTITLE,
  DECISION_QUEUE_TAB_WAITING, DECISION_QUEUE_TAB_RESOLVED,
  DECISION_QUEUE_SERVICE_FILTERS,
} from "@shared/decision_queue";
import { canCompleteReceptionSale } from "@shared/commercial";
import type { AiAccessContext } from "./access";
import type { PageContext } from "./page_context";

/** المسارُ القانونيّ الذي يصفه هذا الدليل (كما يقنّنه `page_context`). */
export const DECISION_QUEUE_PAGE_PATH = "/post-exam-followups";

/**
 * **مرشِّحُ الفرع يظهر فقط لمن يملك أكثرَ من فرعٍ فعلاً** — نفسُ شرط
 * `PostExamFollowups.tsx` (`isAdmin || accessible.length > 1`) مقروءاً من
 * نطاق الجلسة الخادميّ. و`operationalBranches === null` تعني «كلّ الفروع».
 */
function showsBranchFilter(access: AiAccessContext): boolean {
  if (access.isAdmin) return true;
  const branches = access.operationalBranches;
  return branches === null || branches.length > 1;
}

function decisionQueueGuide(access: AiAccessContext): string {
  const filters = DECISION_QUEUE_SERVICE_FILTERS.map((f) => f.label).join(" · ");
  //  **الدالّةُ القانونية نفسُها** التي تحرس `/complete-sale` و`/not-bought`
  //  في الخادم — لا قائمةَ أدوارٍ ثانية هنا.
  const maySell = canCompleteReceptionSale({
    isAdmin: access.isAdmin, role: access.role,
  } as any);

  return `

دليلُ هذه الشاشة — «${DECISION_QUEUE_PAGE_TITLE}»:

**الغرض**: ${DECISION_QUEUE_PAGE_SUBTITLE} ومعها تبويبٌ ثانٍ لمن حُسم أمرُهم.

**ما على الشاشة**:
- تبويبان: «${DECISION_QUEUE_TAB_WAITING}» و«${DECISION_QUEUE_TAB_RESOLVED}».
- مرشِّحُ التصنيف: ${filters}.
- ضابطُ ترتيب (الأقدم/الأحدث).
- مرشِّحُ الفرع: ${showsBranchFilter(access)
    ? "**يظهر له** — لأنّ نطاقه أكثرُ من فرع."
    : "**لا يظهر له** — لأنّ نطاقه فرعٌ واحد؛ وهذا ليس نقصَ صلاحية."}

**أزرارُ صفّ «${DECISION_QUEUE_TAB_WAITING}»**:
- «فتح الملف» — متاحٌ من البطاقة دائماً.
- صفُّ **مسار المعاينة**: «إتمام البيع» و«لم يشترِ».
- صفٌّ **موروث** (بلا مسار معاينة): «اشترى» و«لم يشترِ».
- «إلغاء الحسم» — سلطةٌ إدارية، يقولها الخادمُ لكلّ صفٍّ على حدة.

**وصلاحيةُ هذا المستخدم للبيع على هذه الشاشة**: ${maySell
    ? "**يملكها** (بحسب الدالّة القانونية في الخادم)."
    : "**لا يملكها** — والطبيبُ بلا صفةِ مسؤولٍ عامّ ليس منهم."}

**⚠ وقاعدةٌ لا تُخالَف**: صلاحيةُ المستخدم **لا تُثبت** أن زرّاً بعينه ظاهرٌ
على صفٍّ بعينه. فظهورُ الزرّ يقرّره الخادمُ **لكلّ صفٍّ على حدة** من
\`examPath\` و\`actions\` و\`mayCancelDecision\` وحالةِ الصفّ وشروطِ العمل —
**وهذه القيمُ الحيّة ليست عندك في هذه المرحلة**. فإن سُئلتَ «ليش هذا الزر ما
يظهر عندي؟» فاشرح القواعدَ أعلاه وصلاحيتَه، **وقل صراحةً إنك لا تستطيع
تحديدَ سبب هذا الصفّ بعينه بلا حالته الحيّة** — ولا تجزم بوجود زرٍّ ولا
بغيابه.`;
}

/**
 * دليلُ الصفحة الحالية إن كان لها دليل — وإلّا نصٌّ فارغ.
 *
 * صفحةٌ واحدة اليوم عمداً: لا إطارَ عامّ قبل أن تُثبت الحاجةُ إليه.
 */
export function pageGuideFor(page: PageContext | null, access: AiAccessContext): string {
  if (page?.path !== DECISION_QUEUE_PAGE_PATH) return "";
  return decisionQueueGuide(access);
}
