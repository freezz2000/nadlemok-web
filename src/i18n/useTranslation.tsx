"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import ko from "./ko.json";
import en from "./en.json";

type Locale = "ko" | "en";
type Translations = typeof ko;

const translations: Record<Locale, Translations> = { ko, en };

interface I18nContextType {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType>({
  locale: "ko",
  t: ko,
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("ko");
  return (
    <I18nContext.Provider value={{ locale, t: translations[locale], setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
