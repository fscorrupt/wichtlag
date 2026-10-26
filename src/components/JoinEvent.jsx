import React, { useState, useEffect } from 'react';
import {
  Calendar, Euro, Users, CheckCircle2, AlertCircle, ArrowRight,
  ShieldCheck, Lock, UserCheck
} from 'lucide-react';
import { BANNER_PRESETS, formatDate, AVATAR_PRESETS } from '../constants/presets';

export default function JoinEvent({ eventId, onClaimed, onNavigateToPortal }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [claimedInfoModal, setClaimedInfoModal] = useState(null);
  const [claiming, setClaiming] = useState(false);

  // Check if participant already has a saved token for this event
  const existingToken = localStorage.getItem(`wichtel_token_${eventId}`);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        if (!res.ok) {
          throw new Error('Wichtel-Aktion nicht gefunden oder abgelaufen.');
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
    const interval = setInterval(fetchEvent, 8000);
    return () => clearInterval(interval);
  }, [eventId]);

  const handleClaim = async () => {
    if (!selectedParticipant) return;
    setClaiming(true);
    setError('');

    try {
      const res = await fetch(`/api/events/${eventId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_id: selectedParticipant.id })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Fehler beim Auswählen des Namens.');
      }

      // Store token in localStorage
      localStorage.setItem(`wichtel_token_${eventId}`, resData.participant_token);

      onClaimed(resData.participant_token);
    } catch (err) {
      setError(err.message);
      // Reload event to refresh claimed statuses
      fetch(`/api/events/${eventId}`)
        .then((r) => r.json())
        .then((d) => setData(d));
    } finally {
      setClaiming(false);
      setSelectedParticipant(null);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p>Lade Wichtel-Aktion...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px auto' }} />
        <h2>Aktion nicht gefunden</h2>
        <p style={{ marginBottom: '20px' }}>{error}</p>
        <button type="button" className="btn btn-secondary" onClick={() => window.location.href = '/'}>
          Zur Startseite
        </button>
      </div>
    );
  }

  const { event, participants, stats } = data;
  const selectedPreset = BANNER_PRESETS.find((p) => p.id === event.banner_url);

  return (
    <div>
      {/* Event Banner */}
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
          <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.9)', color: 'white', marginBottom: '8px' }}>
            Einladung zum Wichteln
          </span>
          <h1 style={{ color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.7)', marginBottom: '4px' }}>
            {event.title}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem' }}>
            <span>Bescherung: {formatDate(event.event_date)}</span>
            {event.max_budget && <span>Budget: {event.max_budget}</span>}
          </div>
        </div>
      </div>

      {/* Existing token shortcut */}
      {existingToken && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <strong style={{ color: 'white', display: 'block' }}>Du nimmst bereits an dieser Aktion teil!</strong>
            <span style={{ fontSize: '0.85rem', color: '#a7f3d0' }}>
              Dein Zugang wurde auf diesem Gerät gespeichert.
            </span>
          </div>
          <button
            type="button"
            className="btn btn-success btn-sm btn-mobile-full"
            onClick={() => onNavigateToPortal(existingToken)}
          >
            <span>Zu meinem Wunschzettel</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Description */}
      {event.description && (
        <div className="glass-card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '8px' }}>Notiz zur Aktion</h3>
          <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '0.95rem' }}>{event.description}</p>
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          color: '#fca5a5',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* Status & Vorbereitung / Auslosung */}
      <div className="glass-card" style={{
        background: event.is_drawn
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 78, 59, 0.2) 100%)'
          : stats?.allReady
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.15) 100%)'
          : 'var(--surface-1)',
        border: event.is_drawn
          ? '1px solid rgba(16, 185, 129, 0.4)'
          : stats?.allReady
          ? '1px solid rgba(16, 185, 129, 0.4)'
          : '1px solid var(--surface-border)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem' }}>
              {event.is_drawn ? 'Wichteln ist ausgelost!' : 'Status & Auslosung'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {event.is_drawn
                ? 'Das Wichteln wurde ausgelost! Jeder Teilnehmer kann über seinen persönlichen Zugang sein Wichtelkind einsehen.'
                : stats?.allReady
                ? 'Alle Teilnehmer sind beigetreten und haben ihren Wunschzettel ausgefüllt. Der Organisator kann das Wichteln nun auslosen!'
                : `Warte auf Teilnehmer: ${stats?.readyCount || 0} von ${stats?.totalCount || participants.length} bereit.`}
            </p>
          </div>

          {!event.is_drawn && stats && (
            <span
              className={`badge ${stats.allReady ? 'badge-ready' : 'badge-pending'}`}
              style={{ padding: '6px 12px', fontSize: '0.82rem' }}
            >
              {stats.readyCount} von {stats.totalCount} bereit
            </span>
          )}
        </div>

        {/* Readiness progress bar */}
        {!event.is_drawn && stats && (
          <div style={{ marginTop: '14px' }}>
            <div style={{
              height: '8px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255,255,255,0.1)',
              overflow: 'hidden'
            }}>
              <div
                style={{
                  height: '100%',
                  width: `${((stats.readyCount || 0) / Math.max(stats.totalCount || 1, 1)) * 100}%`,
                  background: stats.allReady ? '#10b981' : 'var(--accent-gold)',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Name Selection Grid */}
      <div className="glass-card">
        <h2 style={{ marginBottom: '8px' }}>Wähle deinen Namen aus der Liste</h2>
        <p style={{ fontSize: '0.9rem', marginBottom: '20px' }}>
          Der Organisator hat folgende Namen für die Runde festgelegt. Klicke auf deinen Namen, um beizutreten.
          Jeder Name kann nur genau einmal gewählt werden!
        </p>

        <div className="name-picker-grid">
          {participants.map((p) => {
            const isClaimed = p.is_claimed === 1;
            const isReady = p.is_ready === 1;
            const avatarPreset = AVATAR_PRESETS.find((a) => a.id === p.avatar_url);

            return (
              <div
                key={p.id}
                className={`name-card ${isClaimed ? (isReady ? 'claimed ready' : 'claimed pending') : ''}`}
                onClick={() => {
                  if (isClaimed) {
                    if (existingToken) {
                      onNavigateToPortal(existingToken);
                    } else {
                      setClaimedInfoModal(p);
                    }
                  } else {
                    setSelectedParticipant(p);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                  }}>
                    {avatarPreset ? (
                      avatarPreset.emoji
                    ) : p.avatar_url && p.avatar_url.startsWith('/uploads/') ? (
                      <img src={p.avatar_url} alt={p.name} style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} />
                    ) : (
                      '👤'
                    )}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-main)', fontSize: '1rem', display: 'block' }}>
                      {p.name}
                    </strong>
                    {event.is_drawn ? (
                      <span style={{ fontSize: '0.75rem', color: '#34d399' }}>
                        Ausgelost
                      </span>
                    ) : isReady ? (
                      <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <span>✓ Bereit für Auslosung</span>
                      </span>
                    ) : isClaimed ? (
                      <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <span>Beigetreten (Wunschzettel noch offen)</span>
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Noch frei zum Auswählen
                      </span>
                    )}
                  </div>
                </div>

                {isClaimed ? (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ marginTop: '4px', width: '100%', fontSize: '0.78rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (existingToken) {
                        onNavigateToPortal(existingToken);
                      } else {
                        setClaimedInfoModal(p);
                      }
                    }}
                  >
                    <span>{existingToken ? 'Zu meinem Wunschzettel' : 'Zugang öffnen'}</span>
                    <ArrowRight size={13} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: '4px', width: '100%' }}
                  >
                    <span>Das bin ich</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal */}
      {selectedParticipant && (
        <div className="modal-overlay" onClick={() => setSelectedParticipant(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <h3 style={{ marginBottom: '8px' }}>Bist du wirklich {selectedParticipant.name}?</h3>
            <p style={{ fontSize: '0.9rem', marginBottom: '20px' }}>
              Sobald du diesen Namen wählst, ist er für andere gesperrt. Im nächsten Schritt kannst du deinen Wunschzettel ausfüllen – dieser kann auch nach der Auslosung jederzeit noch angepasst werden.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-outline btn-mobile-full"
                onClick={() => setSelectedParticipant(null)}
                disabled={claiming}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="btn btn-primary btn-mobile-full"
                onClick={handleClaim}
                disabled={claiming}
              >
                <span>{claiming ? 'Beitreten...' : 'Ja, das bin ich!'}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Claimed Notice Modal */}
      {claimedInfoModal && (
        <div className="modal-overlay" onClick={() => setClaimedInfoModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <h3 style={{ marginBottom: '8px' }}>{claimedInfoModal.name} ist bereits beigetreten</h3>
            <p style={{ fontSize: '0.9rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>
              Um deinen Wunschzettel zu bearbeiten oder dein Wichtelkind einzusehen, nutze bitte deinen persönlichen Zugangslink (aus deinen Browser-Lesezeichen oder WhatsApp).
            </p>
            <div style={{
              background: 'rgba(10, 14, 23, 0.5)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              marginBottom: '20px',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              textAlign: 'left'
            }}>
              <strong>Tipp:</strong> Falls du deinen Link nicht mehr findest, kann dir der Organisator deinen persönlichen Link im Admin-Bereich mit einem Klick neu kopieren und schicken.
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => setClaimedInfoModal(null)}
            >
              Verstanden
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
