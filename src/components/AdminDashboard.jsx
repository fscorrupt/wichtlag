import React, { useState, useEffect } from 'react';
import {
  Calendar, Euro, Users, CheckCircle2, AlertCircle, Copy, Check,
  QrCode, Share2, Play, Lock, Trash2, ShieldCheck, Clock, ExternalLink
} from 'lucide-react';
import { BANNER_PRESETS, formatDate, AVATAR_PRESETS } from '../constants/presets';
import QRCodeModal from './QRCodeModal';
import confetti from 'canvas-confetti';

export default function AdminDashboard({ eventId, adminToken, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [drawSuccessMessage, setDrawSuccessMessage] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState('');

  // Fetch admin event details
  const fetchAdminData = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/admin?token=${adminToken}`);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Fehler beim Laden des Admin-Bereichs.');
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId && adminToken) {
      fetchAdminData();
      // Poll every 8 seconds so admin sees live when participants join or mark ready
      const interval = setInterval(fetchAdminData, 8000);
      return () => clearInterval(interval);
    }
  }, [eventId, adminToken]);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(key);
    setTimeout(() => setCopiedLink(''), 2500);
  };

  // Trigger Secret Santa draw
  const handleStartDraw = async () => {
    if (!data?.stats.allReady) {
      const confirmForce = window.confirm(
        'Nicht alle Teilnehmer haben ihren Wunschzettel als fertig markiert. Möchtest du die Auslosung trotzdem jetzt starten?'
      );
      if (!confirmForce) return;
    } else {
      const confirmNormal = window.confirm(
        'Möchtest du das Wichteln jetzt auslosen? Nach der Auslosung können keine weiteren Teilnehmer hinzugefügt oder Ausschlüsse geändert werden.'
      );
      if (!confirmNormal) return;
    }

    setDrawing(true);
    setError('');

    try {
      const res = await fetch(`/api/events/${eventId}/draw?token=${adminToken}`, {
        method: 'POST'
      });
      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || 'Fehler bei der Auslosung.');
      }

      setDrawSuccessMessage(resData.message);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      fetchAdminData();
    } catch (err) {
      setError(err.message);
    } finally {
      setDrawing(false);
    }
  };

  // Delete event manually
  const handleDeleteEvent = async () => {
    const confirmDel = window.confirm(
      'Möchtest du diese Wichtel-Aktion wirklich sofort unwiderruflich löschen?'
    );
    if (!confirmDel) return;

    try {
      const res = await fetch(`/api/events/${eventId}?token=${adminToken}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('Aktion wurde erfolgreich gelöscht.');
        onNavigate('/');
      } else {
        alert('Fehler beim Löschen.');
      }
    } catch (err) {
      alert('Serverfehler beim Löschen.');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p>Lade Admin-Dashboard...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px auto' }} />
        <h2>Zugriff nicht möglich</h2>
        <p style={{ marginBottom: '20px' }}>{error}</p>
        <button type="button" className="btn btn-secondary" onClick={() => onNavigate('/')}>
          Zur Startseite
        </button>
      </div>
    );
  }

  const { event, participants, exclusions, stats, validation } = data;
  const joinUrl = `${window.location.origin}/event/${event.id}/join`;
  const adminUrl = window.location.href;

  const selectedPreset = BANNER_PRESETS.find((p) => p.id === event.banner_url);

  return (
    <div>
      {/* Banner Display */}
      <div
        className="event-banner-display"
        style={{
          background: selectedPreset
            ? selectedPreset.background
            : event.banner_url && event.banner_url.startsWith('/uploads/')
            ? `url(${event.banner_url}) center/cover no-repeat`
            : 'var(--surface-2)'
        }}
      >
        <div className="banner-overlay" />
        <div className="banner-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.9)', color: 'white' }}>
              Admin-Bereich
            </span>
            {event.is_drawn ? (
              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.9)', color: 'white' }}>
                ✓ Ausgelost
              </span>
            ) : (
              <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.9)', color: '#1e1302' }}>
                In Vorbereitung
              </span>
            )}
          </div>
          <h1 style={{ color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.7)', marginBottom: '4px' }}>
            {event.title}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem' }}>
            <span>📅 {formatDate(event.event_date)}</span>
            {event.max_budget && <span>💶 Budget: {event.max_budget}</span>}
          </div>
        </div>
      </div>

      {drawSuccessMessage && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.2)',
          border: '1px solid rgba(16, 185, 129, 0.5)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          color: '#6ee7b7',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <CheckCircle2 size={24} color="#10b981" style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ display: 'block', fontSize: '1rem', color: 'white' }}>Auslosung erfolgreich!</strong>
            <span style={{ fontSize: '0.9rem' }}>{drawSuccessMessage}</span>
          </div>
        </div>
      )}

      {/* Share Links Card */}
      <div className="glass-card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Share2 size={22} color="#38bdf8" />
          <span>Links zum Teilen & Verwalten</span>
        </h2>

        <div style={{ marginBottom: '16px' }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Einladungslink für die Teilnehmer:</span>
            <span className="form-hint">(Teile diesen Link in WhatsApp / Signal / Chat)</span>
          </label>
          <div className="link-box">
            <span>{joinUrl}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleCopy(joinUrl, 'join')}
              >
                {copiedLink === 'join' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                <span>{copiedLink === 'join' ? 'Kopiert' : 'Kopieren'}</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setQrUrl(joinUrl);
                  setShowQrModal(true);
                }}
              >
                <QrCode size={14} />
                <span>QR-Code</span>
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Privater Admin-Link:</span>
            <span className="form-hint">(Diesen Link NICHT mit der Gruppe teilen!)</span>
          </label>
          <div className="link-box">
            <span>{adminUrl}</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleCopy(adminUrl, 'admin')}
            >
              {copiedLink === 'admin' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              <span>{copiedLink === 'admin' ? 'Kopiert' : 'Kopieren'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Draw Trigger Section */}
      <div className="glass-card" style={{
        background: event.is_drawn
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 78, 59, 0.2) 100%)'
          : stats.allReady
          ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(185, 28, 28, 0.15) 100%)'
          : 'var(--surface-1)',
        border: event.is_drawn
          ? '1px solid rgba(16, 185, 129, 0.4)'
          : stats.allReady
          ? '1px solid rgba(239, 68, 68, 0.4)'
          : '1px solid var(--surface-border)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ marginBottom: '6px' }}>
              {event.is_drawn ? 'Wichteln ist ausgelost!' : 'Status & Auslosung'}
            </h2>
            <p style={{ margin: 0 }}>
              {event.is_drawn
                ? 'Jeder Teilnehmer kann ab sofort mit seinem Link sein gezogenes Wichtelkind einsehen.'
                : stats.allReady
                ? '🎉 Alle Teilnehmer sind beigetreten und haben ihren Wunschzettel fertig ausgefüllt!'
                : `Warte auf Teilnehmer: ${stats.readyCount} von ${stats.totalCount} bereit.`}
            </p>
          </div>

          {!event.is_drawn && (
            <button
              type="button"
              className={`btn btn-lg ${stats.allReady ? 'btn-primary' : 'btn-secondary'}`}
              onClick={handleStartDraw}
              disabled={drawing || !validation.possible}
            >
              <Play size={20} />
              <span>{drawing ? 'Loste aus...' : 'Wichteln jetzt auslosen!'}</span>
            </button>
          )}
        </div>

        {/* Readiness progress bar */}
        {!event.is_drawn && (
          <div style={{ marginTop: '16px' }}>
            <div style={{
              height: '8px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255,255,255,0.1)',
              overflow: 'hidden'
            }}>
              <div
                style={{
                  height: '100%',
                  width: `${(stats.readyCount / Math.max(stats.totalCount, 1)) * 100}%`,
                  background: stats.allReady ? '#10b981' : 'var(--accent-gold)',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Strict Privacy Guarantee Box */}
      <div style={{
        background: 'rgba(251, 191, 36, 0.08)',
        border: '1px solid rgba(251, 191, 36, 0.25)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 18px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <Lock size={20} color="#fbbf24" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.85rem', color: '#fef3c7' }}>
          <strong>Absolute Admin-Privatsphäre:</strong> Du siehst hier als Admin nur den Status (wer beigetreten ist und wer fertig ist). Auch nach der Auslosung kannst weder du noch sonst jemand einsehen, wer wen beschenkt.
        </span>
      </div>

      {/* Participants Table */}
      <div className="glass-card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Users size={22} color="#38bdf8" />
          <span>Teilnehmer-Status ({participants.length})</span>
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {participants.map((p) => {
            const avatarPreset = AVATAR_PRESETS.find((a) => a.id === p.avatar_url);
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    overflow: 'hidden'
                  }}>
                    {avatarPreset ? (
                      avatarPreset.emoji
                    ) : p.avatar_url && p.avatar_url.startsWith('/uploads/') ? (
                      <img src={p.avatar_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      '👤'
                    )}
                  </div>
                  <div>
                    <span style={{ fontWeight: '600', color: 'var(--text-main)', display: 'block' }}>
                      {p.name}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {p.is_claimed ? 'Beigetreten' : 'Wartet auf Beitritt'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {p.is_ready ? (
                    <span className="badge badge-ready">✓ Bereit</span>
                  ) : p.is_claimed ? (
                    <span className="badge badge-pending">Wunschzettel unvollständig</span>
                  ) : (
                    <span className="badge badge-empty">Noch offen</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exclusions Summary */}
      <div className="glass-card">
        <h3 style={{ marginBottom: '12px' }}>Hinterlegte Ausschlussregeln ({exclusions.length})</h3>
        {exclusions.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {exclusions.map((ex) => (
              <span
                key={ex.id}
                style={{
                  fontSize: '0.82rem',
                  padding: '4px 10px',
                  background: 'rgba(10, 14, 23, 0.5)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                {ex.giver_name} ➔ 🚫 {ex.receiver_name}
              </span>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.85rem', margin: 0 }}>Keine Ausschlüsse aktiv.</p>
        )}
      </div>

      {/* Auto-Deletion Notice & Danger Zone */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <Clock size={16} />
          <span>Diese Aktion wird automatisch 14 Tage nach dem Aktionsdatum ({formatDate(event.event_date)}) gelöscht.</span>
        </div>

        <button
          type="button"
          className="btn btn-outline btn-sm"
          style={{ color: '#f87171' }}
          onClick={handleDeleteEvent}
        >
          <Trash2 size={14} />
          <span>Aktion sofort löschen</span>
        </button>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <QRCodeModal
          url={qrUrl}
          title={`Einladung für "${event.title}"`}
          onClose={() => setShowQrModal(false)}
        />
      )}
    </div>
  );
}
