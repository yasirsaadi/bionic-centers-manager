// الاسترجاعُ الحيّ — يجلب المرشَّحين من القاعدة (ضمن نطاق الجلسة) ثم يسلّم
// الترشيحَ النهائيّ للدالّة الخالصة في `shared/ai_knowledge_retrieval.ts`.
//
// ══ ولماذا هذا الفصل ═══════════════════════════════════════════════════
// النطاقُ (فرعٌ، مالٌ، إدارة) سؤالُ **صلاحية** يُفحَص في القاعدة قبل أن
// يصل صفٌّ واحد إلى الترتيب. والترتيبُ نفسُه سؤالُ **صلة** لا صلاحية —
// فبقي خالصاً قابلاً للاختبار بلا قاعدة بيانات (`shared/
// ai_knowledge_retrieval.test.ts`).

import { listActiveArticlesInScope } from "./store";
import { selectTopArticles, type KnowledgeMatch } from "@shared/ai_knowledge_retrieval";
import type { AiAccessContext } from "../access";

export const MAX_KNOWLEDGE_RESULTS = 3;

/**
 * أقربُ ثلاث مقالاتٍ فعّالة لآخر سؤال المستخدم، **ضمن نطاقه هو**.
 *
 * `finance`/`administration` مستبعَدتان قبل الترشيح لا بعده — فمقالةٌ
 * مالية لا تصل موظّفاً عاماً حتى لو طابق سؤالُه كلماتِها حرفياً.
 */
export async function retrieveKnowledge(
  access: AiAccessContext, queryText: string,
): Promise<KnowledgeMatch[]> {
  const candidates = await listActiveArticlesInScope({
    operationalBranches: access.operationalBranches,
    allowFinance: access.mode === "financial",
    //  «سلطةٌ إدارية» هنا = نفسُ مَن يملك التصحيح الإداريّ فعلياً في
    //  التطبيق: المسؤولُ العام، أو مديرُ الفرع ضمن فرعه.
    allowAdministration: access.isAdmin || access.role === "branch_manager",
  });
  return selectTopArticles(queryText, candidates, MAX_KNOWLEDGE_RESULTS);
}
