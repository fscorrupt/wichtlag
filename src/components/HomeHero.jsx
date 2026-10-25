import React, { useState } from 'react';
import {
  Gift, Sparkles, ShieldCheck, Link2, Users, Heart, ArrowRight, Clock, EyeOff
} from 'lucide-react';

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
      <div style={{ textAlign: 'center', padding: '30px 10px 48px 10px' }}>
        <div style={{ marginBottom: '20px' }}>
          <img
            src="/logo.png"
            alt="WichtlAG"
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(239, 68, 68, 0.4)',
              transition: 'transform 0.3s ease'
            }}
          />
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: '20px'
        }}>
          <Sparkles size={16} color="#fbbf24" />
          <span>WichtlAG – Geheimes Wichteln leicht gemacht</span>
        </div>

        <h1 style={{ fontSize: '2.75rem', marginBottom: '16px', lineHeight: 1.2 }}>
          Wichteln mit WichtlAG.<br />
          <span style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #fbbf24 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Einfach. Privat. Nur über Links.
          </span>
        </h1>

        <p style={{ fontSize: '1.15rem', maxWidth: '640px', margin: '0 auto 32px auto', color: 'var(--text-secondary)' }}>
          Plane deine Wichtelrunde in Sekunden ohne E-Mail-Adressen. Mit smarten Ausschlussregeln, Wunschzetteln und garantierter Geheimhaltung – auch für den Admin!
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={onCreateClick}
          >
            <Gift size={20} />
            <span>Jetzt Aktion erstellen</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Existing Event Code Form */}
      <div className="glass-card" style={{ maxWidth: '520px', margin: '0 auto 48px auto', textAlign: 'center', padding: '24px' }}>
        <h3 style={{ fontSize: '1.05rem', marginBottom: '8px' }}>Du wurdest eingeladen?</h3>
        <p style={{ fontSize: '0.85rem', marginBottom: '16px' }}>
          Gib den Aktions-Code oder Einladungslink ein, um direkt beizutreten:
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

      {/* Feature Highlights Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: '16px'
          }}>
            <EyeOff size={22} color="#ef4444" />
          </div>
          <h3 style={{ marginBottom: '8px' }}>100% Admin-Geheimnis</h3>
          <p style={{ fontSize: '0.88rem' }}>
            Der Admin darf und kann nicht sehen, wer wen gezogen hat. Die API gibt Zuteilungen niemals an die Admin-Ansicht heraus.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'rgba(56, 189, 248, 0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: '16px'
          }}>
            <Link2 size={22} color="#38bdf8" />
          </div>
          <h3 style={{ marginBottom: '8px' }}>Rein linkbasiert</h3>
          <p style={{ fontSize: '0.88rem' }}>
            Kein Mailserver (SMTP) nötig. Teile einfach den Einladungslink oder QR-Code in deiner WhatsApp- oder Signal-Gruppe.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'rgba(251, 191, 36, 0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: '16px'
          }}>
            <ShieldCheck size={22} color="#fbbf24" />
          </div>
          <h3 style={{ marginBottom: '8px' }}>Ausschlussregeln</h3>
          <p style={{ fontSize: '0.88rem' }}>
            Definiere ganz einfach, wer wen nicht ziehen darf (z. B. Paare oder Geschwister). Ein intelligenter Algorithmus prüft live die Lösbarkeit.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: '16px'
          }}>
            <Clock size={22} color="#10b981" />
          </div>
          <h3 style={{ marginBottom: '8px' }}>Auto-Löschung nach 14 Tagen</h3>
          <p style={{ fontSize: '0.88rem' }}>
            Vollkommene Datensparsamkeit: 2 Wochen nach dem Aktionsdatum wird die gesamte Aktion mit allen Daten und Bildern automatisch gelöscht.
          </p>
        </div>
      </div>
    </div>
  );
}
