import { createContext, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const LangContext = createContext();

export function LangProvider({ children }) {
  const { i18n } = useTranslation();
  const [lang, setLang] = useState(i18n.language);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    localStorage.setItem("lang", lang);
    i18n.changeLanguage(lang);
  }, [lang]);

  const toggleLang = () => setLang((l) => (l === "ar" ? "en" : "ar"));

  return (
    <LangContext.Provider
      value={{ lang, setLang, toggleLang, isRTL: lang === "ar" }}
    >
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
