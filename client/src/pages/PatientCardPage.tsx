import { useEffect, useState } from "react";
import type { PatientCard } from "@shared/patient_card";
import { PatientCardView, PatientCardBackdrop } from "@/components/patient/PatientCardView";
import { Loader2 } from "lucide-react";

//  صفحةُ «بطاقتي» داخل تلغرام (§4.bv) — **بلا دخول موظّف**: الهويّةُ من `initData` الذي يوقّعه تلغرام،
//  ويتحقّق منه الخادم. خارج تلغرام لا شيء يُعرض.

declare global {
  interface Window { Telegram?: { WebApp?: { initData?: string; ready?: () => void; expand?: () => void } } }
}

type State =
  | { s: "loading" } | { s: "outside" } | { s: "none" } | { s: "error" }
  | { s: "ok"; cards: PatientCard[] };

function loadTelegramScript(): Promise<void> {
  if (window.Telegram?.WebApp) return Promise.resolve();
  return new Promise((resolve) => {
    const el = document.createElement("script");
    el.src = "https://telegram.org/js/telegram-web-app.js";
    el.onload = () => resolve();
    el.onerror = () => resolve();
    document.head.appendChild(el);
  });
}

export default function PatientCardPage() {
  const [state, setState] = useState<State>({ s: "loading" });
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    document.title = "بطاقتي";
    (async () => {
      await loadTelegramScript();
      const wa = window.Telegram?.WebApp;
      wa?.ready?.(); wa?.expand?.();
      const initData = wa?.initData;
      if (!initData) return setState({ s: "outside" });
      try {
        const res = await fetch("/api/patient-card/me", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData }),
        });
        if (!res.ok) return setState({ s: res.status === 401 ? "outside" : "error" });
        const body = await res.json();
        const cards: PatientCard[] = Array.isArray(body?.cards) ? body.cards : [];
        setState(cards.length ? { s: "ok", cards } : { s: "none" });
      } catch { setState({ s: "error" }); }
    })();
  }, []);

  const msg = (t: string) => <div className="text-white text-center py-24 leading-relaxed" dir="rtl">{t}</div>;
  return (
    <div className="min-h-screen bg-slate-900">
      <PatientCardBackdrop>
        {state.s === "loading" && <div className="py-24 grid place-items-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>}
        {state.s === "outside" && msg("افتح البطاقة من بوت المركز في تلغرام — اكتب «بطاقتي».")}
        {state.s === "none" && msg("البطاقة غير متاحة لحسابك بعد. سيخبرك المركز حين تُفعَّل.")}
        {state.s === "error" && msg("تعذّر تحميل البطاقة الآن. حاول مرّةً أخرى بعد قليل.")}
        {state.s === "ok" && (
          <>
            {state.cards.length > 1 && (
              <div className="flex gap-2 overflow-x-auto mb-4" dir="rtl">
                {state.cards.map((c, i) => (
                  <button key={c.code} onClick={() => setIdx(i)}
                    className={`rounded-full px-3 py-1 text-sm whitespace-nowrap border ${i === idx ? "bg-white text-slate-900 border-white" : "bg-white/10 text-white border-white/30"}`}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}
            <PatientCardView card={state.cards[Math.min(idx, state.cards.length - 1)]} />
          </>
        )}
      </PatientCardBackdrop>
    </div>
  );
}
