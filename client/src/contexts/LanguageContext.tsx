import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { SUPPORTED_LANGUAGES } from "@/lib/languageOptions";
import { LanguageContext, type Language } from "./languageStore";

// This module exports only the Provider component; data and hooks live in dedicated modules for Fast Refresh.
// Keeping this boundary stable preserves component state during hot updates.

const LANGUAGE_STORAGE_KEY = "taskflow-language";

function readInitialLanguage(): Language {
  if (typeof window === "undefined") return "vi";
  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return SUPPORTED_LANGUAGES.includes(saved as Language) ? (saved as Language) : "vi";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<Language>(readInitialLanguage);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((nextLanguage: Language) => {
    updateLanguage(nextLanguage);
  }, []);

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
