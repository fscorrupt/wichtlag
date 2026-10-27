import React, { useState } from 'react';
import { ArrowDown, ArrowRight, Check, Gift, Link, ShieldCheck, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { BANNER_PRESETS } from '../constants/presets';

export default function HomeHero({ onCreateClick, onNavigate }) {
  const [accessCode, setAccessCode] = useState('');
  const [activeTheme, setActiveTheme] = useState(0);
  const [surprise, setSurprise] = useState(-1);
  const winterThemeIds = new Set(['preset:winterwald', 'preset:bergenacht', 'preset:nordlicht', 'preset:sternenhimmel', 'preset:hopfen', 'preset:eiskristall', 'preset:rotgold', 'preset:tannengruen']);
  const themes = [
    ...BANNER_PRESETS.filter((theme) => winterThemeIds.has(theme.id)),
    ...BANNER_PRESETS.filter((theme) => !winterThemeIds.has(theme.id))
  ];
  const jokes = ['Plot Twist: Die Socken sind diesmal für dich.', 'Streng geheim. Sogar der Geschenkbeutel schweigt.', 'Budget: 20 €. Vorfreude: unbezahlbar.', 'Diese Runde enthält Spuren von Geschenkpapier.'];

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
    setSurprise((previous) => (previous + 1) % jokes.length);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      confetti({ particleCount: 65, spread: 65, origin: { y: 0.6 }, colors: ['#e8445a', '#76b4a1', '#edcc60', '#b8a8dc'], disableForReducedMotion: true });
    }
  };

  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <img className="hero-photo" src="/themes/cozy.jpg" alt="Liebevoll verpackte Geschenke für die nächste Wichtelrunde" fetchPriority="high" />
        <div className="hero-shade" />
        <div className="hero-copy">
          <span className="eyebrow"><span className="live-dot" /> Kleine Geschenke. Große Vorfreude.</span>
          <h1 id="home-title">WichtlAG<span>Verschenk ein<br />bisschen Freude.</span></h1>
          <p>Für deine Lieblingsmenschen. Fürs Team. Für die Familie. Organisiere eure Wichtelrunde ganz entspannt, ohne Konto und ohne E-Mail.</p>
          <button type="button" className="btn btn-primary btn-lg" onClick={onCreateClick}>Neue Aktion erstellen <ArrowRight size={19} /></button>
          <div className="hero-assurances"><span><Check size={15} /> Ohne Registrierung</span><span><ShieldCheck size={15} /> Paarungen bleiben geheim</span></div>
        </div>
        <button type="button" className="secret-gift" onClick={unwrapSurprise} aria-label="Kleine Überraschung auspacken" title="Was ist denn da drin?"><Gift size={28} /></button>
        <div className="surprise-message" role="status">{surprise >= 0 ? jokes[surprise] : ''}</div>
        <span className="hero-caption">Von Herzen. Nicht von der Stange.</span>
      </section>
      <section className="join-strip" aria-labelledby="join-title">
        <div className="join-heading"><span className="join-icon"><Link size={20} /></span><div><h2 id="join-title">Du bist eingeladen?</h2><p>Deine Runde wartet schon auf dich.</p></div></div>
        <form onSubmit={handleJoinDirect} className="join-form">
          <label htmlFor="access-code" className="sr-only">Aktions-Code oder Einladungslink</label>
          <input id="access-code" className="form-input" placeholder="Aktions-Code oder Einladungslink" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} required />
          <button type="submit" className="btn btn-ink">Dabei sein <ArrowRight size={17} /></button>
        </form>
      </section>
      <section className="occasion-section" aria-labelledby="occasion-title">
        <div className="section-heading"><div><span className="eyebrow">Weihnachtlich wichteln. Und auch mal anders.</span><h2 id="occasion-title">Deine Runde. Euer Stil.</h2></div><a href="#theme-gallery" className="text-link">Lieblingslook finden <ArrowDown size={16} /></a></div>
        <div className="theme-gallery" id="theme-gallery">
          {themes.map((theme, index) => (
            <button type="button" key={theme.id} className={`occasion-tile ${activeTheme === index ? 'active' : ''}`} onClick={() => setActiveTheme(index)} aria-pressed={activeTheme === index}>
              <span className="occasion-image" style={{ background: theme.background }}><span className="theme-check"><Check size={15} /></span></span>
              <span>{theme.name}</span>
            </button>
          ))}
        </div>
        <div className="theme-selection"><Sparkles size={16} /><span>{themes[activeTheme].name} passt zu euch? Diesen Look findest du bei der Aktionserstellung.</span><button type="button" className="text-link" onClick={onCreateClick}>Los geht’s <ArrowRight size={16} /></button></div>
      </section>
      <section className="how-section" aria-labelledby="how-title">
        <div className="section-heading"><div><span className="eyebrow">Weniger organisieren. Mehr freuen.</span><h2 id="how-title">Von „Wer macht mit?“ zu „Für dich!“</h2></div><span className="small-note">Vier Schritte bis zur Vorfreude.</span></div>
        <div className="steps-grid">
          {[
            ['01', 'Runde starten', 'Name, Datum und Budget festlegen. Eure Lieblingsmenschen auf die Liste setzen.'],
            ['02', 'Freude teilen', 'Einladungslink in euren Gruppenchat schicken. Jeder wählt seinen Namen.'],
            ['03', 'Wünsche sammeln', 'Avatar aussuchen, Geschenkideen notieren und sich bereit melden.'],
            ['04', 'Geheim auslosen', 'Die Organisation startet die Ziehung. Wer wen beschenkt, bleibt euer Geheimnis.']
          ].map(([number, title, text]) => <div className="how-step" key={number}><span className="step-number">{number}</span><h3>{title}</h3><p>{text}</p></div>)}
        </div>
      </section>
      <section className="trust-strip"><ShieldCheck size={25} /><div><h3>Ein gutes Gefühl gehört dazu.</h3><p>Keine Konten, keine E-Mail-Adressen. Die Paarungen bleiben auch für die Organisation verborgen. Eure Daten werden 14 Tage nach dem Event automatisch gelöscht.</p></div><span className="trust-seal">Weniger Daten.<br />Mehr Geheimnis.</span></section>
      <div className="link-reminder"><Link size={16} /><p>Gut zu wissen: Dein persönlicher Link ist dein Zugang. Bewahre ihn auf, damit du jederzeit zu deinem Wunschzettel zurückkommst.</p></div>
    </div>
  );
}