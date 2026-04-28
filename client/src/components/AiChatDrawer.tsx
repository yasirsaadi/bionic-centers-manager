// Floating AI assistant available on every page after the BranchGate.
// Hidden when AI isn't configured server-side, or when the current user
// lacks accounting permission (the only feature that exposes any
// financial data through AI today).

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Sparkles, Send, X, Loader2, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useBranchSession } from "@/components/BranchGate";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "كم بلغت الإيرادات هذا الشهر؟",
  "ما أكبر بنود المصاريف؟",
  "من المرضى الذين عليهم ذمم متأخّرة؟",
  "ما رصيد القاصة اليوم؟",
];

export function AiChatDrawer() {
  const session = useBranchSession();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Hide entirely when AI isn't configured. The endpoint also checks
  // permission, but doing it client-side too keeps the floating button
  // from confusing users who can't use the feature anyway.
  const { data: aiStatus } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/ai/status"],
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const canUse =
    !!session &&
    !!aiStatus?.enabled &&
    (session.isAdmin || session.permissions?.canManageAccounting);

  const askMutation = useMutation({
    mutationFn: async (history: ChatMessage[]) => {
      const res = await apiRequest("POST", "/api/ai/chat", { messages: history });
      return res.json() as Promise<{ reply: string; snapshotAt: string }>;
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
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
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <Card className="relative ml-0 mr-0 sm:ml-auto sm:mr-0 sm:my-0 w-full sm:w-[440px] sm:max-w-[440px] sm:h-screen sm:rounded-none rounded-t-2xl sm:rounded-tl-none flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">المساعد الذكي</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {session?.isAdmin
                      ? "نطاق: كل الفروع"
                      : `نطاق: ${session?.branchName ?? "فرعك"}`}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="إغلاق"
                data-testid="button-close-ai-chat"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-sm text-muted-foreground space-y-3">
                  <p>
                    اسألني عن إيرادات الفرع، المصاريف، الفواتير غير المدفوعة، أو رصيد القاصة.
                    البيانات تُحدَّث لحظياً، ومحصورة بنطاقك.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
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
                <div
                  key={i}
                  className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${
                      m.role === "user" ? "bg-primary/15 text-primary" : "bg-muted text-foreground"
                    }`}
                  >
                    {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {m.content}
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
