import React from 'react';
import { X, ShieldCheck, Clock, Link2, EyeOff, Sparkles } from 'lucide-react';

export default function InfoModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.15)', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <ShieldCheck size={22} color="#ef4444" />
            </div>
            <h3 style={{ margin: 0 }}>Über WichtlAG</h3>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.92rem' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <EyeOff size={20} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--text-main)', display: 'block' }}>100% Admin-Geheimnis</strong>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem' }}>
                Selbst der Ersteller/Admin der Aktion kann niemals einsehen, wer wen zieht. Das Matching wird auf dem Server gespeichert, jedoch schützt die API-Architektur die Daten: Nur jeder Teilnehmer selbst kann mit seinem persönlichen Token sein Wichtelkind entschlüsseln.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Link2 size={20} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--text-main)', display: 'block' }}>Rein linkbasiert (Keine E-Mail nötig)</strong>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem' }}>
                Keine E-Mail-Adressen, kein SMTP-Server, keine Registrierung. Teile einfach den Einladungslink per WhatsApp, Signal oder QR-Code mit deiner Gruppe.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Clock size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--text-main)', display: 'block' }}>Automatische Löschung nach 14 Tagen</strong>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem' }}>
                Genau 2 Wochen nach dem Aktionsdatum wird der Wichtel-Raum mitsamt allen Teilnehmerdaten, Wunschzetteln und Bildern automatisch vom Server unwiderruflich gelöscht.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Sparkles size={20} color="#e879f9" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--text-main)', display: 'block' }}>Smarte Ausschlussregeln</strong>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem' }}>
                Definiere Paare oder Personen, die sich nicht gegenseitig beschenken dürfen (z. B. Partner, Geschwister). Ein intelligenter Graph-Algorithmus garantiert eine faire Kreis-Zuteilung.
              </p>
            </div>
          </div>
        </div>

        <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: '24px' }} onClick={onClose}>
          Verstanden
        </button>
      </div>
    </div>
  );
}
