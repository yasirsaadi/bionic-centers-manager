// Drafts a polite, branch-appropriate Arabic reply to a (typically
// negative) patient survey. The output is meant for human review —
// the manager edits and sends; we never auto-send.
//
// Use case: a patient leaves a low-rated survey citing long wait times
// and rude reception. The manager pulls up the response, hits "اقترح
// ردّاً", and within seconds gets a draft that:
//   - acknowledges the issues by name
//   - apologises sincerely
//   - states a concrete next step
//   - keeps a respectful Iraqi-Arabic tone
//
// Cost: <$0.10/month at the expected volume of negative surveys.

import { storage } from "../storage";
import { safeAiComplete, type AiResult } from "./provider";

export interface SurveyReplyInput {
  responseId: number;
}

export interface SurveyReplyOutput {
  draftReply: string;
  summary: string; // 1-line summary of the patient's main concerns
  generatedAt: string;
  responseId: number;
}

const SYSTEM_PROMPT = `أنت مدير علاقات المرضى في مركز طبيّ عراقي متخصّص بالأطراف الصناعية والعلاج الطبيعي.
مهمّتك: صياغة مسوّدة ردّ خاص لمريض ترك استبياناً، لمراجعتها من المسؤول قبل الإرسال.

قواعد الصياغة:
- اللهجة: عربية فصحى بسيطة بنبرة دافئة ومهنيّة. لا تستخدم لهجة عاميّة.
- الطول: 4-6 جمل قصيرة. لا تطل.
- ابدأ بالشكر الصادق على وقت المريض في تقييمنا.
- إن كانت هناك ملاحظات سلبيّة، اذكرها صراحةً ثمّ اعتذر بصدق دون مبالغة.
- اذكر إجراءً ملموساً واحداً سيتمّ اتّخاذه (مثلاً: مراجعة فريق الاستقبال، تقصير وقت الانتظار، التواصل المباشر).
- إن كانت ملاحظات إيجابيّة، اشكر بصدق واذكر التزامنا بالاستمرار.
- اختم بترحيب باستفسارات إضافيّة ورقم تواصل وهمي [رقم خدمة العملاء].
- لا تستخدم اسم المريض إن لم يتوفّر.
- لا تذكر اسم المركز محدّداً (نتركه قابلاً للتعديل من المسؤول).

الاستجابة المطلوبة:
أعد كائن JSON بالشكل التالي فقط (لا نصّ خارجيّ):
{
  "summary": "جملة واحدة تلخّص أبرز نقطة من ملاحظات المريض",
  "draftReply": "نصّ الردّ كاملاً، بأسطر منفصلة عند اللزوم"
}`;

export async function generateSurveyReply(
  input: SurveyReplyInput
): Promise<AiResult<SurveyReplyOutput>> {
  const responses = await storage.getSurveyResponses();
  const response = responses.find((r) => r.id === input.responseId);
  if (!response) {
    return { ok: false, reason: "unknown", message: "الاستبيان غير موجود" };
  }

  const [answers, questions] = await Promise.all([
    storage.getSurveyAnswers(input.responseId),
    storage.getSurveyQuestions(response.templateId),
  ]);

  const questionById = new Map(questions.map((q) => [q.id, q]));

  // Build a compact JSON payload the model can reason over without us
  // stuffing in any PII beyond what's necessary for context. We keep
  // the patient's score, the question text + answer (rating or free
  // text), and the patient's optional note.
  const formattedAnswers = answers.map((a) => {
    const q = questionById.get(a.questionId);
    return {
      question: q?.questionText ?? `سؤال #${a.questionId}`,
      type: q?.questionType ?? "unknown",
      rating: a.ratingValue ?? null,
      text: a.textValue ?? null,
      bool: a.boolValue ?? null,
    };
  });

  const payload = {
    overallScore: response.totalScore,
    overallMax: response.maxScore,
    overallPercentage: response.percentage,
    notes: response.notes ?? null,
    answers: formattedAnswers,
  };

  const userPrompt = `صغ مسوّدة ردّ بناءً على هذا الاستبيان:
\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\``;

  const result = await safeAiComplete({
    system: SYSTEM_PROMPT,
    user: userPrompt,
    model: "haiku", // short polite letter — Haiku quality is fine here
    maxTokens: 600,
  });

  if (!result.ok) return result;

  // Defensive parse — the model is instructed to return strict JSON,
  // but we also handle the common failure mode of fenced output.
  let parsed: { summary?: string; draftReply?: string };
  try {
    const cleaned = result.value.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return {
      ok: false,
      reason: "unknown",
      message: "تعذّر تحليل ردّ النموذج",
    };
  }

  if (!parsed.draftReply || typeof parsed.draftReply !== "string") {
    return { ok: false, reason: "unknown", message: "النموذج لم يُعِد مسوّدة صالحة" };
  }

  return {
    ok: true,
    value: {
      draftReply: parsed.draftReply,
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      generatedAt: new Date().toISOString(),
      responseId: input.responseId,
    },
  };
}
