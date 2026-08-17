import { createContext } from "react";

// Static context definitions are intentionally separated from the Provider component.
// This module remains free of component exports and is safe to hot-update independently.

export type Language = "vi" | "en";

export type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

export const LanguageContext = createContext<LanguageContextValue | null>(null);
