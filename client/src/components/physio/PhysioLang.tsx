// زرُّ «العربية | English» لصفحات العلاج الطبيعي (§4.cj) — المكتبةُ والخطط (§4.cm) معاً، واختيارٌ واحد محفوظٌ في المتصفّح.
import { useState } from "react";
import { isProtocolLang, type ProtocolLang } from "@shared/physio_protocols";

// ══ اللغة — يختارها القارئ، وتُحفظ في متصفّحه وحده (تفضيلٌ شخصيّ لا حالةٌ مشتركة) ═════════════════
const LANG_KEY = "physioProtocolLang";
export function useProtocolLang(): [ProtocolLang, (l: ProtocolLang) => void] {
  const [lang, setLang] = useState<ProtocolLang>(() => {
    try { const v = localStorage.getItem(LANG_KEY); return isProtocolLang(v) ? v : "ar"; } catch { return "ar"; }
  });
  const set = (l: ProtocolLang) => { setLang(l); try { localStorage.setItem(LANG_KEY, l); } catch { /* تفضيلٌ لا يُحفظ — لا ضرر */ } };
  return [lang, set];
}
export function LangToggle({ lang, onChange }: { lang: ProtocolLang; onChange: (l: ProtocolLang) => void }) {
  return (
    <div className="inline-flex rounded-md border overflow-hidden text-sm" role="group" aria-label="Language" data-testid="protocol-lang">
      {(["ar", "en"] as const).map((l) => (
        <button key={l} type="button" onClick={() => onChange(l)} aria-pressed={lang === l} data-testid={`protocol-lang-${l}`}
          className={`px-3 py-1 ${lang === l ? "bg-primary text-primary-foreground" : "bg-white hover:bg-muted"}`}>
          {l === "ar" ? "العربية" : "English"}
        </button>
      ))}
    </div>
  );
}
