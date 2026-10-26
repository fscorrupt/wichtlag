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
          className="btn btn-primary btn-lg"
          onClick={onCreateClick}
        >
          <span>Neue Aktion erstellen</span>
        </button>
      </div>

      {/* Code / Link Entry */}
      <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto 36px auto', textAlign: 'center', padding: '20px' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '6px' }}>Bereits eingeladen?</h3>
        <p style={{ fontSize: '0.85rem', marginBottom: '14px', color: 'var(--text-muted)' }}>
          Gib den Aktions-Code oder den Einladungslink ein:
        </p>

        <form onSubmit={handleJoinDirect} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Aktions-Code (z. B. a1b2c3d4)..."
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary">
            <span>Öffnen</span>
          </button>
        </form>
      </div>

      {/* How it works & important guidance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '8px', color: '#f8fafc' }}>
            Ablauf in vier Schritten
          </h3>
          <p style={{ fontSize: '0.88rem', margin: 0, lineHeight: 1.6 }}>
            1. <strong>Erstellen:</strong> Titel, Datum, Budget und Namen eintragen.<br />
            2. <strong>Einladen:</strong> Link in WhatsApp oder Signal teilen.<br />
            3. <strong>Wünschen:</strong> Jeder wählt seinen Namen und füllt den Wunschzettel aus.<br />
            4. <strong>Auslosen:</strong> Sobald alle fertig sind, startet der Admin die Auslosung.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '22px', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '8px', color: '#fbbf24' }}>
            Wichtig: Link speichern!
          </h3>
          <p style={{ fontSize: '0.88rem', margin: 0, lineHeight: 1.6 }}>
            Weil wir keine E-Mail-Adressen speichern, gibt es keinen Link per Mail und keine „Passwort vergessen“-Funktion. Sowohl Teilnehmer als auch der Admin müssen ihren persönlichen Zugangslink als Lesezeichen speichern, um später ihr Wichtelkind einsehen zu können.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '8px', color: '#f8fafc' }}>
            Admin sieht keine Zuteilungen
          </h3>
          <p style={{ fontSize: '0.88rem', margin: 0, lineHeight: 1.6 }}>
            Der Admin sieht in der Übersicht nur, wer beigetreten ist und ob der Wunschzettel ausgefüllt wurde. Wer wen beschenkt, bleibt auch für den Admin vollständig geheim – der Server filtert diese Daten für Admins strikt heraus.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '8px', color: '#f8fafc' }}>
            Ausschlüsse & automatische Löschung
          </h3>
          <p style={{ fontSize: '0.88rem', margin: 0, lineHeight: 1.6 }}>
            Paare oder Personen, die sich nicht gegenseitig beschenken sollen, können vorab ausgeschlossen werden. Zudem wird jede Aktion genau 14 Tage nach dem Aktionsdatum automatisch samt Bildern und Wunschzetteln rückstandslos gelöscht.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '8px', color: '#f8fafc' }}>
            Wunschzettel & externe Links
          </h3>
          <p style={{ fontSize: '0.88rem', margin: 0, lineHeight: 1.6 }}>
            Jeder Teilnehmer kann eigene Wünsche als Freitext eintragen oder einen direkten Link zu einer externen Wunschliste (z. B. Amazon, wunschliste.de) hinterlegen. So weiß das Wichtelkind genau, worüber sich der Beschenkte freut.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '8px', color: '#f8fafc' }}>
            Keine App & keine Registrierung
          </h3>
          <p style={{ fontSize: '0.88rem', margin: 0, lineHeight: 1.6 }}>
            WichtlAG läuft direkt im Browser – auf Smartphones, Tablets und PCs. Niemand muss ein Konto anlegen oder eine App aus dem App Store herunterladen. Link öffnen, Namen wählen und sofort loslegen.
          </p>
        </div>
      </div>
    </div>
  );
}
