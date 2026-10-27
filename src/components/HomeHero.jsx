import React, { useState } from 'react';
import { ArrowDown, ArrowRight, Check, Gift, Link, ShieldCheck, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { BANNER_PRESETS } from '../constants/presets';
import { useTranslation } from '../i18n';

export default function HomeHero({ onCreateClick, onNavigate }) {
  const { t, getThemeName } = useTranslation();
  const [accessCode, setAccessCode] = useState('');
  const [activeTheme, setActiveTheme] = useState(0);
  const [surprise, setSurprise] = useState(-1);
  const winterThemeIds = new Set(['preset:winterwald', 'preset:bergenacht', 'preset:nordlicht', 'preset:sternenhimmel', 'preset:hopfen', 'preset:eiskristall', 'preset:rotgold', 'preset:tannengruen']);
  const themes = [
    ...BANNER_PRESETS.filter((theme) => winterThemeIds.has(theme.id)),
    ...BANNER_PRESETS.filter((theme) => !winterThemeIds.has(theme.id))
  ];
  const jokes = t('home.jokes') || [];

  const handleJoinDirect = (event) => {
    event.preventDefault();
    const clean = accessCode.trim();
    if (!clean) return;
    if (clean.includes('/event/')) {
      const match = clean.match(/\/event\/([a-zA-Z0-9]+)/);
      if (match && match[1]) {
        onNavigate(`/event/${match[1]}/join`);
        return;
      }
    }
    onNavigate(`/event/${clean}/join`);
  };

  const unwrapSurprise = () => {
    if (!jokes || jokes.length === 0) return;
    setSurprise((previous) => (previous + 1) % jokes.length);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      confetti({ particleCount: 65, spread: 65, origin: { y: 0.6 }, colors: ['#e8445a', '#76b4a1', '#edcc60', '#b8a8dc'], disableForReducedMotion: true });
    }
  };

  const currentThemeName = getThemeName(themes[activeTheme]);
  const steps = t('home.steps') || [];

  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <img className="hero-photo" src="/themes/cozy.jpg" alt={t('home.heroPhotoAlt')} fetchPriority="high" />
        <div className="hero-shade" />
        <div className="hero-copy">
          <span className="eyebrow"><span className="live-dot" /> {t('home.eyebrow')}</span>
          <h1 id="home-title">
            {t('home.titleMain')}
            <span>
              {t('home.titleSub').split('\n').map((line, i, arr) => (
                <React.Fragment key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </React.Fragment>
              ))}
            </span>
          </h1>
          <p>{t('home.description')}</p>
          <button type="button" className="btn btn-primary btn-lg" onClick={onCreateClick}>
            {t('home.createBtn')} <ArrowRight size={19} />
          </button>
          <div className="hero-assurances">
            <span><Check size={15} /> {t('home.assuranceNoAccount')}</span>
            <span><ShieldCheck size={15} /> {t('home.assuranceSecret')}</span>
          </div>
        </div>
        <button
          type="button"
          className="secret-gift"
          onClick={unwrapSurprise}
          aria-label={t('home.surpriseGiftAria')}
          title={t('home.surpriseGiftTitle')}
        >
          <Gift size={28} />
        </button>
        <div className="surprise-message" role="status">
          {surprise >= 0 && jokes[surprise] ? jokes[surprise] : ''}
        </div>
        <span className="hero-caption">{t('home.heroCaption')}</span>
      </section>

      <section className="join-strip" aria-labelledby="join-title">
        <div className="join-heading">
          <span className="join-icon"><Link size={20} /></span>
          <div>
            <h2 id="join-title">{t('home.joinTitle')}</h2>
            <p>{t('home.joinSubtitle')}</p>
          </div>
        </div>
        <form onSubmit={handleJoinDirect} className="join-form">
          <label htmlFor="access-code" className="sr-only">{t('home.joinPlaceholder')}</label>
          <input
            id="access-code"
            className="form-input"
            placeholder={t('home.joinPlaceholder')}
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
            required
          />
          <button type="submit" className="btn btn-ink">
            {t('home.joinBtn')} <ArrowRight size={17} />
          </button>
        </form>
      </section>

      <section className="occasion-section" aria-labelledby="occasion-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t('home.occasionEyebrow')}</span>
            <h2 id="occasion-title">{t('home.occasionTitle')}</h2>
          </div>
          <a href="#theme-gallery" className="text-link">
            {t('home.findLookLink')} <ArrowDown size={16} />
          </a>
        </div>
        <div className="theme-gallery" id="theme-gallery">
          {themes.map((theme, index) => {
            const name = getThemeName(theme);
            return (
              <button
                type="button"
                key={theme.id}
                className={`occasion-tile ${activeTheme === index ? 'active' : ''}`}
                onClick={() => setActiveTheme(index)}
                aria-pressed={activeTheme === index}
              >
                <span className="occasion-image" style={{ background: theme.background }}>
                  <span className="theme-check"><Check size={15} /></span>
                </span>
                <span>{name}</span>
              </button>
            );
          })}
        </div>
        <div className="theme-selection">
          <Sparkles size={16} />
          <span>{t('home.themeFitNote', { name: currentThemeName })}</span>
          <button type="button" className="text-link" onClick={onCreateClick}>
            {t('home.letsGoLink')} <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section className="how-section" aria-labelledby="how-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t('home.howEyebrow')}</span>
            <h2 id="how-title">{t('home.howTitle')}</h2>
          </div>
          <span className="small-note">{t('home.howSubtitle')}</span>
        </div>
        <div className="steps-grid">
          {steps.map((step) => (
            <div className="how-step" key={step.number}>
              <span className="step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="trust-strip">
        <ShieldCheck size={25} />
        <div>
          <h3>{t('home.trustHeading')}</h3>
          <p>{t('home.trustParagraph')}</p>
        </div>
        <span className="trust-seal">
          {t('home.trustSeal').split('\n').map((line, i, arr) => (
            <React.Fragment key={i}>
              {line}
              {i < arr.length - 1 && <br />}
            </React.Fragment>
          ))}
        </span>
      </section>

      <div className="link-reminder">
        <Link size={16} />
        <p>{t('home.linkReminder')}</p>
      </div>
    </div>
  );
}