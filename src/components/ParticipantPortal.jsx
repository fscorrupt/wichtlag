import React, { useState, useEffect } from 'react';
import {
  Calendar, Euro, CheckCircle2, AlertCircle, Copy, Check, ExternalLink,
  Sparkles, Heart, Gift, Upload, Save, User, Lock, ArrowLeft, Bookmark
} from 'lucide-react';
import { BANNER_PRESETS, formatDate, AVATAR_PRESETS } from '../constants/presets';
import confetti from 'canvas-confetti';

export default function ParticipantPortal({ eventId, token, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form states
  const [avatarUrl, setAvatarUrl] = useState('avatar:santa');
  const [wishlistText, setWishlistText] = useState('');
  const [wishlistUrl, setWishlistUrl] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Secret reveal state
  const [isRevealed, setIsRevealed] = useState(() => {
    return localStorage.getItem(`revealed_${eventId}_${token}`) === 'true';
  });

  const fetchPortalData = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/me?token=${token}`);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Fehler beim Laden deines Profils.');
      }
      const json = await res.json();
      setData(json);

      // Populate form
      setAvatarUrl(json.participant.avatar_url || 'avatar:santa');
      setWishlistText(json.participant.wishlist_text || '');
      setWishlistUrl(json.participant.wishlist_url || '');
      setIsReady(json.participant.is_ready);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId && token) {
      fetchPortalData();
    }
  }, [eventId, token]);

  // Handle saving profile & wishlist
  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setError('');

    try {
      const isEventDrawn = Boolean(data?.event?.is_drawn);
      const res = await fetch(`/api/events/${eventId}/me?token=${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatar_url: avatarUrl,
          wishlist_text: wishlistText,
          wishlist_url: wishlistUrl,
          is_ready: isEventDrawn ? true : isReady
        })
      });

      if (!res.ok) {
        throw new Error('Fehler beim Speichern.');
      }

      setData((prev) => prev ? ({
        ...prev,
        participant: {
          ...prev.participant,
          avatar_url: avatarUrl,
          wishlist_text: wishlistText,
          wishlist_url: wishlistUrl,
          is_ready: isEventDrawn ? true : isReady
        }
      }) : prev);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Upload custom avatar
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setAvatarUrl(data.url);
      } else {
        alert(data.error || 'Fehler beim Upload des Avatars.');
      }
    } catch {
      alert('Upload fehlgeschlagen.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Trigger reveal animation
  const handleReveal = () => {
    setIsRevealed(true);
    localStorage.setItem(`revealed_${eventId}_${token}`, 'true');
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.55 }
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p>Lade deinen Wichtel-Zugang...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px auto' }} />
        <h2>Zugang ungültig</h2>
        <p style={{ marginBottom: '20px' }}>{error}</p>
        <button type="button" className="btn btn-secondary" onClick={() => onNavigate(`/event/${eventId}/join`)}>
          Zur Namensauswahl
        </button>
      </div>
    );
  }

  const { event, participant, target } = data;
  const selectedBanner = BANNER_PRESETS.find((p) => p.id === event.banner_url);
  const targetAvatarPreset = target ? AVATAR_PRESETS.find((a) => a.id === target.avatar_url) : null;
  const myAvatarPreset = AVATAR_PRESETS.find((a) => a.id === avatarUrl);

  return (
    <div>
      {/* Event Header Banner */}
      <div
        className="event-banner-display"
        style={{
          background: selectedBanner
            ? selectedBanner.background
            : event.banner_url && event.banner_url.startsWith('/uploads/')
            ? `url(${event.banner_url}) center/cover no-repeat`
            : 'var(--surface-2)'
        }}
      >
        <div className="banner-overlay" />
        <div className="banner-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.9)', color: 'white' }}>
              Hallo {participant.name}!
            </span>
            {Boolean(event.is_drawn) && (
              <span className="badge" style={{ background: '#10b981', color: 'white' }}>
                Ausgelost
              </span>
            )}
          </div>
          <h1 style={{ color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.7)', marginBottom: '4px' }}>
            {event.title}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem' }}>
            <span>Bescherung: {formatDate(event.event_date)}</span>
            {event.max_budget && <span>Budget: {event.max_budget}</span>}
          </div>
        </div>
      </div>

      {/* SECRET REVEAL SECTION IF DRAWN */}
      {Boolean(event.is_drawn) && target ? (
        <div className="glass-card" style={{ marginBottom: '28px', border: '2px solid var(--accent-gold)' }}>
          {!isRevealed ? (
            <div className="reveal-wrapper">
              <h2 style={{ marginBottom: '12px' }}>Die Auslosung ist erfolgt! 🎁</h2>
              <p style={{ maxWidth: '480px', margin: '0 auto 24px auto' }}>
                Dein Wichtelkind steht fest! Klicke auf das geheimnisvolle Geschenk, um zu enthüllen, wen du beschenken darfst:
              </p>

              <div className="gift-box" onClick={handleReveal}>
                <div className="gift-icon-container">
                  🎁
                </div>
              </div>

              <button type="button" className="btn btn-gold btn-lg" onClick={handleReveal}>
                <Sparkles size={18} />
                <span>Geschenk jetzt öffnen</span>
              </button>
            </div>
          ) : (
            <div className="revealed-target-card">
              <span className="badge" style={{ background: 'var(--accent-gold)', color: '#1e1302', fontWeight: 800, marginBottom: '12px' }}>
                ✨ DEIN WICHTELKIND ✨
              </span>

              <div style={{
                width: '84px',
                height: '84px',
                borderRadius: 'var(--radius-xl)',
                background: 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '44px',
                margin: '12px auto 16px auto',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                border: '2px solid var(--accent-gold)'
              }}>
                {targetAvatarPreset ? (
                  targetAvatarPreset.emoji
                ) : target.avatar_url && target.avatar_url.startsWith('/uploads/') ? (
                  <img src={target.avatar_url} alt={target.name} style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} />
                ) : (
                  '🎁'
                )}
              </div>

              <h2 style={{ fontSize: '2rem', color: 'white', marginBottom: '8px' }}>
                Du beschenkst: <span style={{ color: 'var(--accent-gold)' }}>{target.name}</span>
              </h2>

              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                Behalte das Geheimnis für dich! Maximales Budget: <strong>{event.max_budget || 'Keines vorgegeben'}</strong>
              </p>

              {/* Target Wishlist Box */}
              <div style={{
                background: 'rgba(10, 14, 23, 0.7)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                textAlign: 'left',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                    Wunschzettel von {target.name}:
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Live-Aktualisierung
                  </span>
                </div>

                {target.wishlist_text ? (
                  <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-main)', fontSize: '0.95rem', margin: 0 }}>
                    {target.wishlist_text}
                  </p>
                ) : (
                  <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', margin: 0 }}>
                    {target.name} hat noch keine Wünsche eingetragen. Schau später noch einmal vorbei – Änderungen werden hier automatisch sichtbar!
                  </p>
                )}

                {target.wishlist_url && (
                  <div style={{ marginTop: '16px' }}>
                    <a
                      href={target.wishlist_url.startsWith('http') ? target.wishlist_url : `https://${target.wishlist_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <ExternalLink size={14} />
                      <span>Online-Wunschliste von {target.name} ansehen</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Waiting banner if NOT drawn yet */}
      {!event.is_drawn ? (
        <div style={{
          background: 'rgba(56, 189, 248, 0.1)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          marginBottom: '24px'
        }}>
          <strong style={{ color: 'white', display: 'block', marginBottom: '4px' }}>Die Auslosung hat noch nicht begonnen.</strong>
          <span style={{ fontSize: '0.85rem', color: '#bae6fd' }}>
            Trage deine Wünsche ein und setze deinen Haken auf "Bereit". Hinweis: Du kannst deinen Wunschzettel auch nach der Auslosung jederzeit noch ändern und erweitern!
          </span>
        </div>
      ) : null}

      {/* Prominent Personal Bookmark Link */}
      <div
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.14) 0%, rgba(217, 119, 6, 0.08) 100%)',
          border: '2px solid #f59e0b',
          boxShadow: '0 0 28px rgba(245, 158, 11, 0.22)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          marginBottom: '28px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.2)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '2px'
            }}>
              <Bookmark size={24} color="#fbbf24" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <span className="badge" style={{ background: '#f59e0b', color: '#1e1302', fontWeight: 800, padding: '3px 8px' }}>
                  WICHTIG
                </span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff', letterSpacing: '-0.01em' }}>
                  Dein persönlicher Zugangslink
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.92rem', color: '#fef08a' }}>
                Speichere dieses Lesezeichen, um jederzeit von jedem Gerät zurückzukehren.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-gold btn-lg"
            onClick={handleCopyLink}
            style={{ padding: '10px 22px', fontSize: '0.98rem' }}
          >
            {copiedLink ? <Check size={18} color="#1e1302" /> : <Copy size={18} />}
            <span>{copiedLink ? 'Link kopiert!' : 'Link kopieren'}</span>
          </button>
        </div>

        {/* Visual Link Box with 1-click select */}
        <div
          onClick={handleCopyLink}
          style={{
            background: 'rgba(10, 14, 23, 0.85)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            cursor: 'pointer'
          }}
          title="Klicken zum Kopieren"
        >
          <span style={{
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            color: '#fef3c7',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {typeof window !== 'undefined' ? window.location.href : ''}
          </span>
          <span style={{ fontSize: '0.82rem', color: copiedLink ? '#34d399' : 'var(--accent-gold)', whiteSpace: 'nowrap', fontWeight: 700 }}>
            {copiedLink ? 'Kopiert' : 'Klick = Kopieren'}
          </span>
        </div>
      </div>

      {/* Profile & Wishlist Editor */}
      <form onSubmit={handleSave} className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>Dein Profil & Wunschzettel</h2>
          <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
            Auch nach Auslosung anpassbar
          </span>
        </div>

        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: '20px',
          fontSize: '0.88rem',
          color: '#a7f3d0'
        }}>
          <strong>Hinweis:</strong> Du kannst deinen Wunschzettel auch nach der Auslosung bis zur Bescherung jederzeit ändern oder ergänzen. Dein Wichtel sieht deine Aktualisierungen direkt.
        </div>

        {saveSuccess && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid rgba(16, 185, 129, 0.5)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            color: '#6ee7b7',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={18} />
            <span>
              {event.is_drawn
                ? 'Wunschzettel erfolgreich aktualisiert! Dein Wichtel sieht deine Änderungen direkt.'
                : 'Wunschzettel erfolgreich gespeichert!'}
            </span>
          </div>
        )}

        {/* Avatar Picker */}
        <div className="form-group">
          <label className="form-label">Wähle dein Profilbild / Wichtel-Icon:</label>
          <div className="avatar-grid">
            {AVATAR_PRESETS.map((av) => (
              <div
                key={av.id}
                className={`avatar-choice ${avatarUrl === av.id ? 'selected' : ''}`}
                onClick={() => setAvatarUrl(av.id)}
                title={av.label}
              >
                {av.emoji}
              </div>
            ))}
          </div>

          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              <Upload size={14} />
              <span>{isUploadingAvatar ? 'Lade hoch...' : 'Eigenes Foto hochladen'}</span>
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarUpload}
                disabled={isUploadingAvatar}
              />
            </label>
            {avatarUrl.startsWith('/uploads/') && (
              <span style={{ fontSize: '0.8rem', color: '#34d399' }}>Eigenes Bild aktiv</span>
            )}
          </div>
        </div>

        {/* Wishlist Textarea */}
        <div className="form-group">
          <label className="form-label">Meine Wünsche & Hinweise</label>
          <textarea
            className="form-textarea"
            placeholder="Was magst du? Hobbys, Kleidergröße, Lieblingsfarben, Schokolade, Teesorten... oder was du überhaupt nicht magst!"
            value={wishlistText}
            onChange={(e) => setWishlistText(e.target.value)}
            rows={5}
          />
          <span className="form-hint">Du kannst deine Wünsche auch nach der Auslosung jederzeit anpassen oder ergänzen.</span>
        </div>

        {/* Wishlist External Link */}
        <div className="form-group">
          <label className="form-label">Link zu deiner externen Wunschliste (optional)</label>
          <input
            type="url"
            className="form-input"
            placeholder="https://www.amazon.de/hz/wishlist/ls/... oder wunschliste.de"
            value={wishlistUrl}
            onChange={(e) => setWishlistUrl(e.target.value)}
          />
          <span className="form-hint">Egal ob Amazon, Wunschliste.de oder Notion – füge einfach den Link ein.</span>
        </div>

        {/* Ready Checkbox (nur vor der Auslosung relevant) */}
        {!event.is_drawn && (
          <div style={{
            background: 'rgba(10, 14, 23, 0.5)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isReady}
                onChange={(e) => setIsReady(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: 'var(--accent-emerald)', cursor: 'pointer' }}
              />
              <div>
                <strong style={{ color: 'white', display: 'block', fontSize: '0.95rem' }}>
                  Ich bin fertig & bereit für die Auslosung!
                </strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Signalisiert dem Admin, dass du bereit bist. Du kannst deinen Wunschzettel auch nach der Auslosung jederzeit weiter anpassen.
                </span>
              </div>
            </label>
          </div>
        )}

        {/* Save Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={16} />
            <span>
              {saving
                ? 'Speichere...'
                : event.is_drawn
                ? 'Wunschzettel jetzt aktualisieren'
                : 'Änderungen speichern'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
