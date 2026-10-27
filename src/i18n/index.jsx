import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { translations } from './translations';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const stored = localStorage.getItem('wichtlag_lang');
      if (stored === 'de' || stored === 'en') return stored;
      // Default to English if browser begins with 'en', else German
      if (typeof navigator !== 'undefined' && navigator.language && navigator.language.toLowerCase().startsWith('en')) {
        return 'en';
      }
    } catch {}
    return 'de';
  });

  const setLang = useCallback((newLang) => {
    if (newLang !== 'de' && newLang !== 'en') return;
    setLangState(newLang);
    try {
      localStorage.setItem('wichtlag_lang', newLang);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      document.documentElement.lang = lang;
      localStorage.setItem('wichtlag_lang', lang);
    } catch {}
  }, [lang]);

  /**
   * Translate a key path (e.g. 'home.titleMain') with optional params ({ count: 5 })
   */
  const t = useCallback((keyPath, params = {}) => {
    const keys = keyPath.split('.');
    
    // Resolve in active language
    let result = translations[lang];
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        result = undefined;
        break;
      }
    }

    // Fallback to German if not found in active language
    if (result === undefined && lang !== 'de') {
      let fallback = translations.de;
      for (const key of keys) {
        if (fallback && typeof fallback === 'object' && key in fallback) {
          fallback = fallback[key];
        } else {
          fallback = undefined;
          break;
        }
      }
      result = fallback;
    }

    if (result === undefined) {
      return keyPath;
    }

    if (typeof result !== 'string') {
      return result;
    }

    // Interpolate {paramName}
    return result.replace(/\{(\w+)\}/g, (_, paramKey) => {
      return params[paramKey] !== undefined ? params[paramKey] : `{${paramKey}}`;
    });
  }, [lang]);

  /**
   * Format long date in active locale (e.g. "20. Dezember 2026" or "December 20, 2026")
   */
  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString + 'T00:00:00');
      const locale = lang === 'en' ? 'en-US' : 'de-DE';
      return new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(date);
    } catch {
      return dateString;
    }
  }, [lang]);

  /**
   * Format short date in active locale (e.g. "20.12.2026" or "12/20/2026")
   */
  const formatShortDate = useCallback((dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString + 'T00:00:00');
      const locale = lang === 'en' ? 'en-US' : 'de-DE';
      return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch {
      return dateString;
    }
  }, [lang]);

  /**
   * Get translated preset theme name
   */
  const getThemeName = useCallback((preset) => {
    if (!preset) return '';
    const themeKey = typeof preset === 'string' ? preset : preset.id;
    return translations[lang]?.presets?.themes?.[themeKey] ||
           translations.de?.presets?.themes?.[themeKey] ||
           (typeof preset === 'object' ? preset.name : themeKey);
  }, [lang]);

  /**
   * Get translated avatar label
   */
  const getAvatarLabel = useCallback((avatar) => {
    if (!avatar) return '';
    const avatarKey = typeof avatar === 'string' ? avatar : avatar.id;
    return translations[lang]?.presets?.avatars?.[avatarKey] ||
           translations.de?.presets?.avatars?.[avatarKey] ||
           (typeof avatar === 'object' ? avatar.label : avatarKey);
  }, [lang]);

  const value = useMemo(() => ({
    lang,
    setLang,
    t,
    formatDate,
    formatShortDate,
    getThemeName,
    getAvatarLabel
  }), [lang, setLang, t, formatDate, formatShortDate, getThemeName, getAvatarLabel]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}
