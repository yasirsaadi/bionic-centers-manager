// Floating AI assistant available on every page after the BranchGate.
// Hidden only when AI isn't configured server-side.
//
// كان مخفيّاً عن كلّ من لا يملك المحاسبة، لأن جوابه كان يُبنى دائماً فوق
// لقطةٍ مالية. وبعد أن صار للخادم وضعان منفصلان — عامٌّ بلا أي قراءة مالية،
// ومالي للمصرَّح لهم — صار نافعاً لكلّ موظّف. والحجب هنا **عرضٌ لا حراسة**:
// الخادم يقرّر وحده مَن تُبنى له لقطةٌ مالية، ولا يقرأ من العميل شيئاً.

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Sparkles, Send, X, Loader2, Bot, User, MessageSquareWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
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
          </Card>
        </div>
      )}
    </>
  );
}
