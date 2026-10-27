import React from 'react';
import { Moon, Plus, Sun } from 'lucide-react';
import { useTranslation } from '../i18n';

export default function Navbar({ onNavigate, appearance, onToggleAppearance }) {
  const { lang, setLang, t } = useTranslation();

  const toggleLanguage = () => {
    setLang(lang === 'de' ? 'en' : 'de');
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <a href="/" onClick={(event) => { event.preventDefault(); onNavigate('/'); }} className="brand-link" aria-label={t('nav.brandHomeAria')}>
          <img className="brand-mark" src="/logo.svg" alt="" width="40" height="40" />
          <span className="brand-title">WichtlAG<span className="brand-period">.</span></span>
        </a>
        <div className="nav-actions">
          <span className="nav-tagline">{t('nav.tagline')}</span>
          <button
            type="button"
            className="icon-button"
            onClick={toggleLanguage}
            aria-label={t('nav.switchLangAria')}
            title={lang === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'}
            style={{ fontWeight: 700, fontSize: '0.8rem', minWidth: '38px', letterSpacing: '0.04em' }}
          >
            {lang === 'de' ? 'EN' : 'DE'}
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={onToggleAppearance}
            aria-label={appearance === 'dark' ? t('nav.lightModeAria') : t('nav.darkModeAria')}
            title={appearance === 'dark' ? t('nav.lightOnTitle') : t('nav.lightOffTitle')}
          >
            {appearance === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onNavigate('/create')}>
            <Plus size={17} />
            <span>{t('nav.newEvent')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}