// Floating AI assistant available on every page after the BranchGate.
// Hidden only when AI isn't configured server-side.
//
// كان مخفيّاً عن كلّ من لا يملك المحاسبة، لأن جوابه كان يُبنى دائماً فوق
// لقطةٍ مالية. وبعد أن صار للخادم وضعان منفصلان — عامٌّ بلا أي قراءة مالية،
// ومالي للمصرَّح لهم — صار نافعاً لكلّ موظّف. والحجب هنا **عرضٌ لا حراسة**:
// الخادم يقرّر وحده مَن تُبنى له لقطةٌ مالية، ولا يقرأ من العميل شيئاً.

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles, Send, X, Loader2, Bot, User, MessageSquareWarning,
  GraduationCap, ChevronRight, CheckCircle2, AlertCircle, PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useBranchSession } from "@/components/BranchGate";
import {
  canOpenAssistant, introTextFor, scopeLabelFor, suggestionsFor,
} from "@/components/ai_assistant_access";
import { AssistantMarkdown } from "@/components/AssistantMarkdown";

interface KnowledgeProvenance {
  id: number;
  title: string;
}

// ══ التدريب — أنواعُ بيانات `/api/training/*` كما تُرجعها
// `server/training/store.ts` بالحرف (`TrackSummary`/`ModuleSummary`/
// `LessonView`/`SubmitAnswerOutcome`) — لا شكلَ ثانياً يُخترَع هنا. ══

type TrainingModuleStatus = "not_started" | "started" | "completed" | "needs_review" | "practice_only";

interface TrainingModuleSummary {
  id: number;
  title: string;
  description: string;
  position: number;
  hasQuiz: boolean;
  practiceOnly: boolean;
  status: TrainingModuleStatus;
}

interface TrainingTrackSummary {
  id: number;
  title: string;
  description: string;
  modules: TrainingModuleSummary[];
}

interface TrainingLessonView {
  moduleId: number;
  trackId: number;
  trackTitle: string;
  title: string;
  description: string;
  learningObjectives: string[];
  lesson: { articleId: number; articleTitle: string; body: string }[];
  quizQuestion: string | null;
  practiceOnly: boolean;
  status: Exclude<TrainingModuleStatus, "not_started">;
}

interface TrainingAnswerOutcome {
  result: "completed" | "needs_review";
  matchedCount: number;
  totalConcepts: number;
  missingHints: string[];
}

interface TrainingNext {
  trackId: number;
  trackTitle: string;
  moduleId: number;
  moduleTitle: string;
}

const TRAINING_STATUS_LABEL: Record<TrainingModuleStatus, string> = {
  not_started: "لم تبدأ بعد",
  started: "قيد التنفيذ",
  completed: "مكتملة",
  needs_review: "تحتاج مراجعة",
  practice_only: "درسٌ عمليّ",
};

function TrainingStatusBadge({ status }: { status: TrainingModuleStatus }) {
  const variantClass =
    status === "completed" || status === "practice_only"
      ? "bg-green-100 text-green-800 border-green-200"
      : status === "needs_review"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : status === "started"
          ? "bg-blue-100 text-blue-800 border-blue-200"
          : "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={`text-[10px] font-normal ${variantClass}`}>
      {TRAINING_STATUS_LABEL[status]}
    </Badge>
  );
}

/** كتالوجُ التدريب: مسارات الجلسة المتاحة، مطويّةً وحدةً وحدة. */
function TrainingCatalog(props: {
  tracks: TrainingTrackSummary[];
  isLoading: boolean;
  next: TrainingNext | null | undefined;
  onOpenModule: (moduleId: number) => void;
}) {
  const { tracks, isLoading, next, onOpenModule } = props;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> جارٍ تحميل مسارات التدريب…
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-training-empty">
        لا توجد مساراتُ تدريبٍ متاحة لصلاحياتك الحالية بعد.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {next && (
        <button
          type="button"
          onClick={() => onOpenModule(next.moduleId)}
          className="w-full flex items-center gap-2 rounded-lg border bg-primary/5 hover:bg-primary/10 transition px-3 py-2.5 text-right"
          data-testid="button-training-continue"
        >
          <PlayCircle className="h-5 w-5 text-primary shrink-0" />
          <span className="min-w-0">
            <span className="block text-xs text-muted-foreground">متابعةُ التدريب من حيث توقّفت</span>
            <span className="block text-sm font-medium truncate">
              {next.trackTitle} — {next.moduleTitle}
            </span>
          </span>
        </button>
      )}

      {tracks.map((track) => (
        <div key={track.id} className="space-y-1.5" data-testid={`section-training-track-${track.id}`}>
          <div>
            <div className="text-sm font-semibold">{track.title}</div>
            {track.description && (
              <p className="text-xs text-muted-foreground">{track.description}</p>
            )}
          </div>
          <div className="space-y-1">
            {track.modules.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onOpenModule(m.id)}
                className="w-full flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-right hover:bg-accent transition"
                data-testid={`button-training-module-${m.id}`}
              >
                <span className="text-xs min-w-0 truncate">{m.title}</span>
                <TrainingStatusBadge status={m.status} />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** درسُ وحدةٍ واحدة — متنُها من المعرفة الموثوقة الفعّالة، ومعها اختبارُها إن وُجد. */
function TrainingLessonPanel(props: {
  lesson: TrainingLessonView | null | undefined;
  isLoading: boolean;
  quizAnswer: string;
  onChangeAnswer: (v: string) => void;
  onSubmitAnswer: () => void;
  isSubmitting: boolean;
  outcome: TrainingAnswerOutcome | null;
  onBack: () => void;
}) {
  const {
    lesson, isLoading, quizAnswer, onChangeAnswer, onSubmitAnswer, isSubmitting, outcome, onBack,
  } = props;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
        data-testid="button-training-back"
      >
        <ChevronRight className="h-3.5 w-3.5" />
        كلّ المسارات
      </button>

      {isLoading || !lesson ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> جارٍ تحميل الدرس…
        </div>
      ) : (
        <>
          <div>
            <div className="text-xs text-muted-foreground">{lesson.trackTitle}</div>
            <div className="text-sm font-semibold">{lesson.title}</div>
            {lesson.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{lesson.description}</p>
            )}
          </div>

          {lesson.learningObjectives.length > 0 && (
            <ul className="text-xs list-disc pr-4 space-y-0.5 text-muted-foreground">
              {lesson.learningObjectives.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          )}

          <div className="space-y-2">
            {lesson.lesson.map((a) => (
              <div key={a.articleId} className="rounded-md border bg-muted/40 p-2.5 text-xs leading-relaxed whitespace-pre-wrap">
                {a.body}
              </div>
            ))}
          </div>

          {lesson.quizQuestion ? (
            <div className="rounded-md border p-2.5 space-y-2" data-testid="panel-training-quiz">
              <div className="text-xs font-medium">{lesson.quizQuestion}</div>
              <Textarea
                value={quizAnswer}
                onChange={(e) => onChangeAnswer(e.target.value)}
                rows={3}
                className="text-xs"
                placeholder="اكتب إجابتك…"
                disabled={isSubmitting}
                data-testid="input-training-answer"
              />
              <div className="flex justify-end">
                <Button
                  type="button" size="sm" className="h-7 text-xs"
                  disabled={!quizAnswer.trim() || isSubmitting}
                  onClick={onSubmitAnswer}
                  data-testid="button-training-submit-answer"
                >
                  {isSubmitting ? "جارٍ التصحيح…" : "إرسال الإجابة"}
                </Button>
              </div>

              {outcome && (
                <div
                  className={`rounded-md p-2 text-xs space-y-1 ${
                    outcome.result === "completed"
                      ? "bg-green-50 text-green-900 border border-green-200"
                      : "bg-amber-50 text-amber-900 border border-amber-200"
                  }`}
                  data-testid="text-training-outcome"
                >
                  <div className="flex items-center gap-1.5 font-medium">
                    {outcome.result === "completed" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5" />
                    )}
                    {outcome.result === "completed"
                      ? "إجابةٌ صحيحة — أُنجزت الوحدة"
                      : `تحتاج مراجعة (${outcome.matchedCount}/${outcome.totalConcepts})`}
                  </div>
                  {outcome.result === "needs_review" && outcome.missingHints.length > 0 && (
                    <ul className="list-disc pr-4 space-y-0.5">
                      {outcome.missingHints.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {lesson.practiceOnly
                ? "درسٌ عمليّ بلا تصحيحٍ آليّ — اقرأه واكتفِ به، ثمّ عُد لاختيار وحدةٍ أخرى."
                : "لا اختبار لهذه الوحدة — القراءةُ وحدها تكفي، وقد سُجِّلت مكتملة."}
            </p>
          )}
        </>
      )}
    </div>
  );
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** بطاقاتُ المعرفة الموثوقة التي اعتمد عليها **هذا الردّ بعينه** — للعرض والاقتراح، لا أكثر. */
  knowledge?: KnowledgeProvenance[];
  /**
   * تسمياتٌ عربية لمصادر البيانات الحيّة التي قرأها هذا الردّ (مثل «بيانات
   * المريض الحية»، «الملخص المالي») — **بلا اسم أداةٍ تقنيّ ولا وسائط ولا
   * معرّفاتٍ داخلية إطلاقاً**؛ الخادمُ يترجمها قبل الإرسال
   * (`server/ai/semantics.ts: toolProvenanceLabels`) ولا يرسل الاسم الخام أصلاً.
   */
  toolsUsed?: string[];
}

export function AiChatDrawer() {
  const session = useBranchSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  //  ══ «اقترح تصحيحاً» — فهرسُ رسالة المساعد المفتوحة نموذجُها الآن ══════
  //  فهرسٌ واحد لا خريطة: نافذةُ تصحيحٍ واحدة مفتوحة في كل لحظة تكفي، وتبسّط
  //  إعادة الضبط عند الإغلاق (راجع `closeDrawer`).
  const [correctingIndex, setCorrectingIndex] = useState<number | null>(null);
  const [whatIsWrong, setWhatIsWrong] = useState("");
  const [suggestedFix, setSuggestedFix] = useState("");

  //  ══ «التدريب» — لوحةٌ بديلةٌ لجسم الدرج، لا محادثةٌ ثانية ══════════════
  //  `trainingOpen` يبدّل جسمَ الدرج بين المحادثة ولوحة التدريب؛ `activeModuleId`
  //  يبدّل داخل اللوحة بين كتالوج المسارات ودرسِ وحدةٍ بعينها. كلاهما يصفّران
  //  عند إغلاق الدرج (`closeDrawer`) كبقيّة حالة المحادثة.
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<number | null>(null);
  const [quizAnswer, setQuizAnswer] = useState("");
  const [quizOutcome, setQuizOutcome] = useState<TrainingAnswerOutcome | null>(null);

  // Hide entirely when AI isn't configured — otherwise every authenticated
  // employee gets the assistant. What it can SEE is decided server-side.
  const { data: aiStatus } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/ai/status"],
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const canUse = canOpenAssistant(session, aiStatus?.enabled);
  const suggestions = suggestionsFor(session);

  // ══ كلُّ فتحةٍ محادثةٌ جديدة ═══════════════════════════════════════════
  // كانت المحادثة تبقى بعد الإغلاق، فيفتح الموظّف المساعد بعد ساعة فيجد
  // كلاماً عن مريضٍ آخر — والمساعد صار يقرأ ملفّات حيّة، فبقاءُ سياقٍ قديم
  // يجعله يجيب عن غير مَن أمامه. والتنظيف **عند الإغلاق** لا عند الفتح، كي
  // لا يبقى محتوى مريضٍ في الذاكرة بعد أن أغلق الموظّف النافذة.
  // (بلا تخزينٍ في المتصفّح ولا في القاعدة — لا شيء يُحفظ أصلاً.)
  const closeDrawer = () => {
    setOpen(false);
    setMessages([]);
    setDraft("");
    setCorrectingIndex(null);
    setWhatIsWrong("");
    setSuggestedFix("");
    setTrainingOpen(false);
    setActiveModuleId(null);
    setQuizAnswer("");
    setQuizOutcome(null);
  };

  const askMutation = useMutation({
    mutationFn: async (history: ChatMessage[]) => {
      const res = await apiRequest("POST", "/api/ai/chat", {
        messages: history.map(({ role, content }) => ({ role, content })),
      });
      return res.json() as Promise<{
        reply: string;
        snapshotAt: string;
        knowledge?: KnowledgeProvenance[];
        toolsUsed?: string[];
      }>;
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, knowledge: data.knowledge, toolsUsed: data.toolsUsed },
      ]);
    },
    onError: (err: any) => {
      toast({
        title: "تعذّر الحصول على إجابة",
        description: err?.message ?? "حاول مرة أخرى بعد قليل",
        variant: "destructive",
      });
      // Roll back the optimistic user message so the user can retype.
      setMessages((prev) => prev.slice(0, -1));
    },
  });

  //  ══ «اقترح تصحيحاً» — يُرسل، لا يُطبَّق ═════════════════════════════════
  //  إرسالُ الاقتراح لا يغيّر معرفة المساعد بحرف — صفٌّ `pending` وحده،
  //  ينتظر قرار المسؤول العام. `server/ai/knowledge/store.ts` هو الحارس
  //  الحقيقيّ؛ هذا الزرّ مجرّد بابٍ إليه.
  const suggestMutation = useMutation({
    mutationFn: async (params: { index: number; reason: string; suggestedText: string }) => {
      const assistantMsg = messages[params.index];
      const priorUserMsg = [...messages.slice(0, params.index)].reverse().find((m) => m.role === "user");
      const res = await apiRequest("POST", "/api/ai/knowledge/suggestions", {
        reason: params.reason,
        suggestedText: params.suggestedText,
        sourceQuestion: priorUserMsg?.content ?? null,
        sourceAnswer: assistantMsg?.content ?? null,
        referencedArticleIds: (assistantMsg?.knowledge ?? []).map((k) => k.id),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم إرسال الاقتراح للمراجعة", description: "سيراجعه المسؤول العام." });
      setCorrectingIndex(null);
      setWhatIsWrong("");
      setSuggestedFix("");
    },
    onError: (err: any) => {
      toast({
        title: "تعذّر إرسال الاقتراح",
        description: err?.message ?? "حاول مرة أخرى بعد قليل",
        variant: "destructive",
      });
    },
  });

  //  ══ التدريب — قراءتان وكتابةٌ واحدة، كلُّها خلف `enabled: trainingOpen` ══
  //  لا نداءَ شبكةٍ إضافيّاً لموظّفٍ لم يفتح لوحة التدريب أصلاً.
  const tracksQuery = useQuery<{ tracks: TrainingTrackSummary[] }>({
    queryKey: ["/api/training/tracks"],
    enabled: open && trainingOpen,
  });
  const nextQuery = useQuery<{ next: TrainingNext | null }>({
    queryKey: ["/api/training/next"],
    enabled: open && trainingOpen && activeModuleId == null,
  });
  const lessonQuery = useQuery<{ lesson: TrainingLessonView }>({
    queryKey: [`/api/training/modules/${activeModuleId}/lesson`],
    enabled: open && trainingOpen && activeModuleId != null,
  });

  const openModule = (moduleId: number) => {
    setActiveModuleId(moduleId);
    setQuizAnswer("");
    setQuizOutcome(null);
  };
  const backToTracks = () => {
    setActiveModuleId(null);
    setQuizAnswer("");
    setQuizOutcome(null);
    // الفتحُ يكتب تقدّماً (بدءاً أو إكمالاً) — فقائمةُ المسارات وشارةُ كلّ
    // وحدةٍ يجب أن تعكسه فور العودة، لا بعد إغلاقٍ وفتحٍ ثانٍ للدرج.
    queryClient.invalidateQueries({ queryKey: ["/api/training/tracks"] });
    queryClient.invalidateQueries({ queryKey: ["/api/training/next"] });
  };

  const submitAnswerMutation = useMutation({
    mutationFn: async (params: { moduleId: number; answerText: string }) => {
      const res = await apiRequest("POST", `/api/training/modules/${params.moduleId}/answer`, {
        answerText: params.answerText,
      });
      return res.json() as Promise<{ outcome: TrainingAnswerOutcome }>;
    },
    onSuccess: (data) => {
      setQuizOutcome(data.outcome);
      queryClient.invalidateQueries({ queryKey: ["/api/training/tracks"] });
    },
    onError: (err: any) => {
      toast({
        title: "تعذّر تصحيح الإجابة",
        description: err?.message ?? "حاول مرة أخرى بعد قليل",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, messages, askMutation.isPending]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || askMutation.isPending) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setDraft("");
    askMutation.mutate(next);
  };

  if (!canUse) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="فتح المساعد الذكي"
          className="fixed bottom-5 left-5 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition flex items-center justify-center"
          data-testid="button-open-ai-chat"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-start"
          dir="rtl"
        >
          <div
            className="absolute inset-0 bg-black/30"
            onClick={closeDrawer}
            aria-hidden
          />
          <Card className="relative ml-0 mr-0 sm:ml-auto sm:mr-0 sm:my-0 w-full sm:w-[440px] sm:max-w-[440px] sm:h-screen sm:rounded-none rounded-t-2xl sm:rounded-tl-none flex flex-col shadow-2xl !bg-white">
            <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">المساعد الذكي</div>
                  <div className="text-xs text-muted-foreground truncate" data-testid="text-ai-scope">
                    {scopeLabelFor(session)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant={trainingOpen ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-1.5 text-xs h-8"
                  onClick={() => setTrainingOpen((v) => !v)}
                  data-testid="button-toggle-training"
                >
                  <GraduationCap className="h-4 w-4" />
                  {trainingOpen ? "المحادثة" : "التدريب"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={closeDrawer}
                  aria-label="إغلاق"
                  data-testid="button-close-ai-chat"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {trainingOpen ? (
              <div className="flex-1 overflow-y-auto px-4 py-3" data-testid="panel-training">
                {activeModuleId == null ? (
                  <TrainingCatalog
                    tracks={tracksQuery.data?.tracks ?? []}
                    isLoading={tracksQuery.isLoading}
                    next={nextQuery.data?.next}
                    onOpenModule={openModule}
                  />
                ) : (
                  <TrainingLessonPanel
                    lesson={lessonQuery.data?.lesson}
                    isLoading={lessonQuery.isLoading}
                    quizAnswer={quizAnswer}
                    onChangeAnswer={setQuizAnswer}
                    onSubmitAnswer={() => {
                      if (activeModuleId != null) {
                        submitAnswerMutation.mutate({ moduleId: activeModuleId, answerText: quizAnswer });
                      }
                    }}
                    isSubmitting={submitAnswerMutation.isPending}
                    outcome={quizOutcome}
                    onBack={backToTracks}
                  />
                )}
              </div>
            ) : (
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-sm text-muted-foreground space-y-3">
                  <p data-testid="text-ai-intro">{introTextFor(session)}</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="text-xs rounded-full border px-3 py-1.5 hover:bg-accent transition"
                        data-testid={`button-ai-suggestion-${s}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${
                      m.role === "user" ? "bg-primary/15 text-primary" : "bg-muted text-foreground"
                    }`}
                  >
                    {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`max-w-[80%] space-y-1 ${m.role === "user" ? "items-end" : ""} flex flex-col`}>
                    <div
                      className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground whitespace-pre-wrap"
                          : "bg-muted"
                      }`}
                    >
                      {/*  ══ رسالةُ المستخدم نصٌّ عاديّ دائماً؛ ردُّ المساعد وحده يُرسَم
                          كـMarkdown آمنٍ صغير — لا HTML خام، ولا رابط، ولا صورة
                          (`AssistantMarkdown.tsx`) ══ */}
                      {m.role === "assistant" ? <AssistantMarkdown text={m.content} /> : m.content}
                    </div>

                    {m.role === "assistant" && (
                      <div className="px-1 space-y-1.5 w-full">
                        {/*  ══ سطرُ التزويد — بطاقاتُ المعرفة **وبيانات الأدوات الحيّة معاً** ══
                            عناوينُ المعرفة (بلا رقمٍ داخليّ) وتسمياتُ الأدوات العربية (بلا اسمٍ
                            تقنيّ ولا وسائط — `toolsUsed` وصلت مُترجَمةً من الخادم أصلاً) في
                            سطرٍ واحد: كلاهما «اعتمدتُ على ماذا» من منظور الموظّف. */}
                        {((m.knowledge && m.knowledge.length > 0) || (m.toolsUsed && m.toolsUsed.length > 0)) && (
                          <p className="text-[11px] text-muted-foreground" data-testid={`text-ai-provenance-${i}`}>
                            اعتمدتُ على: {[
                              ...(m.toolsUsed ?? []),
                              ...(m.knowledge ?? []).map((k) => k.title),
                            ].join("، ")}
                          </p>
                        )}

                        {correctingIndex === i ? (
                          <div className="rounded-md border bg-background p-2.5 space-y-2" data-testid={`form-ai-suggest-${i}`}>
                            <div className="space-y-1">
                              <label className="text-[11px] font-medium text-muted-foreground">ما الخطأ في هذا الجواب؟</label>
                              <Textarea
                                value={whatIsWrong}
                                onChange={(e) => setWhatIsWrong(e.target.value)}
                                rows={2}
                                className="text-xs"
                                placeholder="مثلاً: هذا لم يعد صحيحاً، الخطوة الآن مختلفة"
                                data-testid={`input-ai-suggest-reason-${i}`}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] font-medium text-muted-foreground">ما الذي يجب أن يقوله المساعد بدلاً من ذلك؟</label>
                              <Textarea
                                value={suggestedFix}
                                onChange={(e) => setSuggestedFix(e.target.value)}
                                rows={2}
                                className="text-xs"
                                placeholder="اكتب الصياغة الصحيحة"
                                data-testid={`input-ai-suggest-text-${i}`}
                              />
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              سيُرسل الاقتراح للمراجعة ولن يغيّر معرفة المساعد مباشرةً.
                            </p>
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button" size="sm" variant="ghost" className="h-7 text-xs"
                                onClick={() => { setCorrectingIndex(null); setWhatIsWrong(""); setSuggestedFix(""); }}
                              >
                                إلغاء
                              </Button>
                              <Button
                                type="button" size="sm" className="h-7 text-xs"
                                disabled={!whatIsWrong.trim() || !suggestedFix.trim() || suggestMutation.isPending}
                                onClick={() => suggestMutation.mutate({
                                  index: i, reason: whatIsWrong.trim(), suggestedText: suggestedFix.trim(),
                                })}
                                data-testid={`button-ai-suggest-submit-${i}`}
                              >
                                {suggestMutation.isPending ? "جارٍ الإرسال…" : "إرسال الاقتراح"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition"
                            onClick={() => { setCorrectingIndex(i); setWhatIsWrong(""); setSuggestedFix(""); }}
                            data-testid={`button-ai-suggest-correction-${i}`}
                          >
                            <MessageSquareWarning className="h-3 w-3" />
                            اقترح تصحيحاً
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {askMutation.isPending && (
                <div className="flex gap-2">
                  <div className="shrink-0 h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ التفكير…
                  </div>
                </div>
              )}
            </div>
            )}

            {!trainingOpen && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(draft);
              }}
              className="border-t px-3 py-2 flex items-center gap-2 shrink-0"
            >
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="اكتب سؤالك…"
                disabled={askMutation.isPending}
                data-testid="input-ai-chat"
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!draft.trim() || askMutation.isPending}
                data-testid="button-send-ai-chat"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
