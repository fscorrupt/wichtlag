import React, { useState } from 'react';

export default function HomeHero({ onCreateClick, onNavigate }) {
  const [accessCode, setAccessCode] = useState('');

  const handleJoinDirect = (e) => {
    e.preventDefault();
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

  return (
    <div>
      {/* Hero Header */}
      <div style={{ textAlign: 'center', padding: '24px 10px 36px 10px' }}>
        <div style={{ marginBottom: '16px' }}>
          <img
            src="/logo.png"
            alt="WichtlAG"
            style={{
              width: '110px',
              height: '110px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 6px 24px rgba(0, 0, 0, 0.4)'
            }}
          />
        </div>

        <h1 style={{ fontSize: '2.5rem', marginBottom: '12px', lineHeight: 1.2 }}>
          WichtlAG
        </h1>

        <p style={{ fontSize: '1.1rem', maxWidth: '580px', margin: '0 auto 28px auto', color: 'var(--text-secondary)' }}>
          Wichteln für Freunde, Familie und Kollegen. Ohne E-Mail-Adressen, ohne Benutzerkonten und mit garantiertem Schutz vor neugierigen Admins.
        </p>

        <button
          type="button"
          className="btn btn-primary btn-lg btn-pill hero-cta-btn"
          onClick={onCreateClick}
        >
          <span>Neue Aktion erstellen</span>
        </button>
      </div>

      {/* Code / Link Entry */}
      <div className="glass-card" style={{ maxWidth: '480px', margin: '0 auto 40px auto', textAlign: 'center', padding: '22px' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '6px' }}>Bereits eingeladen?</h3>
        <p style={{ fontSize: '0.85rem', marginBottom: '14px', color: 'var(--text-muted)' }}>
          Gib den Aktions-Code oder den Einladungslink ein:
        </p>

        <form onSubmit={handleJoinDirect} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-input"
            style={{ flex: '1 1 180px' }}
            placeholder="Aktions-Code (z. B. a1b2c3d4)..."
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary btn-mobile-full" style={{ flex: '0 0 auto' }}>
            <span>Öffnen</span>
          </button>
        </form>
      </div>

      {/* 4-Step Workflow Progression */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <span className="card-tag" style={{ margin: '0 auto 8px auto', display: 'inline-block' }}>Ablauf</span>
          <h2 style={{ fontSize: '1.35rem', color: '#f8fafc', margin: 0 }}>In 4 einfachen Schritten</h2>
        </div>

        <div className="workflow-grid">
          <div className="workflow-step">
            <span className="workflow-step-num">01 // SCHRITT</span>
            <h4>Erstellen</h4>
            <p>Titel, Datum, Budget und Namen eintragen.</p>
          </div>

          <div className="workflow-step">
            <span className="workflow-step-num">02 // SCHRITT</span>
            <h4>Einladen</h4>
            <p>Aktionslink per WhatsApp oder Signal teilen.</p>
          </div>

          <div className="workflow-step">
            <span className="workflow-step-num">03 // SCHRITT</span>
            <h4>Wünschen</h4>
            <p>Eigenen Namen wählen und Wunschzettel ausfüllen.</p>
          </div>

          <div className="workflow-step">
            <span className="workflow-step-num">04 // SCHRITT</span>
            <h4>Auslosen</h4>
            <p>Admin startet die Ziehung – jeder sieht sein Wichtelkind.</p>
          </div>
        </div>
      </div>

      {/* Feature Bento Grid */}
      <div className="feature-bento-grid">
        <div className="feature-bento-card highlight-card">
          <span className="card-tag tag-gold">Wichtig // Lesezeichen</span>
          <h3>Link unbedingt speichern!</h3>
          <p>
            Weil wir komplett auf E-Mails verzichten, gibt es keine Mail-Zustellung und keine Passwort-Rücksetzung. Speichert euren persönlichen Zugangslink als Lesezeichen, um jederzeit wiederzukehren.
          </p>
        </div>

        <div className="feature-bento-card">
          <span className="card-tag tag-emerald">Privatsphäre</span>
          <h3>100% Geheim vor Admins</h3>
          <p>
            Der Organisator sieht nur, wer beigetreten ist und wer bereit ist. Die Auslosungs-Paarungen werden serverseitig so gefiltert, dass sie selbst für den Admin unsichtbar bleiben.
          </p>
        </div>

        <div className="feature-bento-card">
          <span className="card-tag">Wunschzettel</span>
          <h3>Wünsche & Shop-Links</h3>
          <p>
            Trage deine Geschenkideen als Text ein oder hinterlege einen direkten Link zu einer externen Wunschliste (z. B. Amazon oder wunschliste.de).
          </p>
        </div>

        <div className="feature-bento-card">
          <span className="card-tag">Sicherheit</span>
          <h3>Ausschlüsse & 14-Tage-Löschung</h3>
          <p>
            Paare oder Personen, die sich nicht ziehen dürfen, werden vorab ausgeschlossen. Genau 14 Tage nach dem Event werden alle Daten und Bilder automatisch gelöscht.
          </p>
        </div>

        <div className="feature-bento-card">
          <span className="card-tag">Web-App</span>
          <h3>Keine App & keine Registrierung</h3>
          <p>
            WichtlAG funktioniert direkt im Browser auf Smartphones, Tablets und PCs. Niemand muss ein Benutzerkonto anlegen oder eine App installieren.
          </p>
        </div>
      </div>
    </div>
  );
}
