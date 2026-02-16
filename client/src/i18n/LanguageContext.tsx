import { createContext, useContext, useState, useEffect } from "react";
import { getTranslations, getDirection, type Language, type Translations } from "./translations";

interface LanguageContextType {
  language: Language;
  t: Translations;
  dir: "rtl" | "ltr";
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "ar",
  t: getTranslations("ar"),
  dir: "rtl",
  setLanguage: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ar");

  useEffect(() => {
    const stored = localStorage.getItem("branch_session");
    if (stored) {
      try {
        const session = JSON.parse(stored);
        if (session.language === "en") {
          setLanguageState("en");
        }
      } catch {}
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = getTranslations(language);
  const dir = getDirection(language);

  return (
    <LanguageContext.Provider value={{ language, t, dir, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useTranslation() {
  const { t, language, dir } = useContext(LanguageContext);
  return { t, language, dir };
}
