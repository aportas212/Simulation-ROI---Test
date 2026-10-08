import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { fr, type Dictionary, type TranslationKey } from './fr';
import { en } from './en';
import { es } from './es';

export type Locale = 'fr' | 'en' | 'es';

const DICTIONARIES: Record<Locale, Partial<Dictionary>> = { fr, en, es };

/** Locale Intl utilisée pour les nombres, montants et dates. */
export const INTL_LOCALES: Record<Locale, string> = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES' };

export type TParams = Record<string, string | number>;
export type TFunction = (key: TranslationKey, params?: TParams) => string;

/** Traduit une clé et remplace les paramètres {x}. Repli sur le français si la clé manque. */
export function translate(locale: Locale, key: TranslationKey, params?: TParams): string {
  const template = DICTIONARIES[locale][key] ?? fr[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    params[name] !== undefined ? String(params[name]) : match,
  );
}

interface I18nValue {
  locale: Locale;
  intlLocale: string;
  t: TFunction;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<I18nValue>(
    () => ({
      locale,
      intlLocale: INTL_LOCALES[locale],
      t: (key, params) => translate(locale, key, params),
    }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n doit être utilisé dans <I18nProvider>');
  return ctx;
}

/** Langue initiale : paramètre d'URL ?lang=en|es, sinon français. */
export function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'fr';
  const lang = new URLSearchParams(window.location.search).get('lang');
  return lang === 'en' || lang === 'es' ? lang : 'fr';
}
