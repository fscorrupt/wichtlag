import React, { useState, useEffect } from 'react';
import {
  Calendar, Euro, CheckCircle2, AlertCircle, Copy, Check, ExternalLink,
  Sparkles, Heart, Gift, Upload, Save, User, Lock, ArrowLeft, Bookmark
} from 'lucide-react';
import { BANNER_PRESETS, AVATAR_PRESETS } from '../constants/presets';
import confetti from 'canvas-confetti';
import { useTranslation } from '../i18n';

export default function ParticipantPortal({ eventId, token, onNavigate }) {
  const { t, formatDate, getAvatarLabel } = useTranslation();
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
        throw new Error(errJson.error || t('portal.invalidAccessTitle'));
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
      const interval = setInterval(fetchPortalData, 8000);
      return () => clearInterval(interval);
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
        throw new Error(t('common.serverError'));
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
      const resData = await res.json();
      if (res.ok && resData.url) {
        setAvatarUrl(resData.url);
      } else {
        alert(resData.error || t('create.errorUpload'));
      }
    } catch {
      alert(t('portal.uploadFailed') || t('common.uploadFailed'));
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
        <p>{t('portal.loading')}</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px auto' }} />
        <h2>{t('portal.invalidAccessTitle')}</h2>
        <p style={{ marginBottom: '20px' }}>{error}</p>
        <button type="button" className="btn btn-secondary" onClick={() => onNavigate(`/event/${eventId}/join`)}>
          {t('portal.backToJoinBtn')}
        </button>
      </div>
    );
  }

  const { event, participant, stats, target } = data;
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
              {t('portal.greeting', { name: participant.name })}
            </span>
            {Boolean(event.is_drawn) && (
              <span className="badge" style={{ background: '#10b981', color: 'white' }}>
                {t('portal.badgeDrawn')}
              </span>
            )}
          </div>
          <h1 style={{ color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.7)', marginBottom: '4px' }}>
            {event.title}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem' }}>
            <span>{t('portal.giftExchange', { date: formatDate(event.event_date) })}</span>
            {event.max_budget && <span>{t('portal.budget', { budget: event.max_budget })}</span>}
          </div>
        </div>
      </div>

      {/* SECRET REVEAL SECTION IF DRAWN */}
      {Boolean(event.is_drawn) && target ? (
        <div className="glass-card" style={{ marginBottom: '28px', border: '2px solid var(--accent-gold)' }}>
          {!isRevealed ? (
            <div className="reveal-wrapper">
              <h2 style={{ marginBottom: '12px' }}>{t('portal.drawCompleteTitle')}</h2>
              <p style={{ maxWidth: '480px', margin: '0 auto 24px auto' }}>
                {t('portal.drawCompleteDesc')}
              </p>

              <div className="gift-box" onClick={handleReveal}>
                <div className="gift-icon-container">
                  🎁
                </div>
              </div>

              <button type="button" className="btn btn-gold btn-lg" onClick={handleReveal}>
                <Sparkles size={18} />
                <span>{t('portal.openGiftBtn')}</span>
              </button>
            </div>
          ) : (
            <div className="revealed-target-card">
              <span className="badge" style={{ background: 'var(--accent-gold)', color: '#1e1302', fontWeight: 800, marginBottom: '12px' }}>
                {t('portal.yourTargetBadge')}
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
                {t('portal.youGiftHeading', { name: target.name }).split(target.name)[0]}
                <span style={{ color: 'var(--accent-gold)' }}>{target.name}</span>
                {t('portal.youGiftHeading', { name: target.name }).split(target.name)[1] || ''}
              </h2>

              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                {t('portal.keepSecretDesc', { budget: event.max_budget || t('portal.noBudgetLimit') })}
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
                    {t('portal.targetWishlistHeading', { name: target.name })}
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {t('portal.liveUpdate')}
                  </span>
                </div>

                {target.wishlist_text ? (
                  <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-main)', fontSize: '0.95rem', margin: 0 }}>
                    {target.wishlist_text}
                  </p>
                ) : (
                  <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', margin: 0 }}>
                    {t('portal.targetNoWishesYet', { name: target.name })}
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
                      <span>{t('portal.viewExternalListBtn', { name: target.name })}</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Overall Round Status & Progress Bar (before draw) */}
      {!event.is_drawn && stats && (
        <div className="glass-card" style={{
          background: stats.allReady
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.15) 100%)'
            : 'var(--surface-1)',
          border: stats.allReady
            ? '1px solid rgba(16, 185, 129, 0.4)'
            : '1px solid var(--surface-border)',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>
                {t('portal.roundStatusTitle')}
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {stats.allReady
                  ? t('portal.roundAllReadyDesc')
                  : t('portal.roundWaitingDesc', { ready: stats.readyCount, total: stats.totalCount })}
              </p>
            </div>

            <span
              className={`badge ${stats.allReady ? 'badge-ready' : 'badge-pending'}`}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              {t('portal.readyCountBadge', { ready: stats.readyCount, total: stats.totalCount })}
            </span>
          </div>

          <div style={{ marginTop: '12px' }}>
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
        </div>
      )}

      {/* Waiting banner if NOT drawn yet */}
      {!event.is_drawn ? (
        <div style={{
          background: isReady ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
          border: `1.5px solid ${isReady ? '#10b981' : '#f59e0b'}`,
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
            <strong style={{ color: 'white', display: 'block', marginBottom: '4px', fontSize: '1rem' }}>
              {isReady ? t('portal.youAreReadyTitle') : t('portal.waitingForYouTitle')}
            </strong>
            <span style={{ fontSize: '0.88rem', color: isReady ? '#a7f3d0' : '#fef08a' }}>
              {isReady
                ? t('portal.youAreReadyDesc')
                : t('portal.waitingForYouDesc')}
            </span>
          </div>
          <span className="badge" style={{
            background: isReady ? '#10b981' : '#f59e0b',
            color: '#1e1302',
            fontWeight: 800,
            padding: '6px 12px',
            fontSize: '0.82rem'
          }}>
            {isReady ? t('portal.readyMarkedBadge') : t('portal.notReadyBadge')}
          </span>
        </div>
      ) : null}

      {/* Prominent Personal Bookmark Link */}
      <div
        className="glass-card bookmark-card"
        style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.14) 0%, rgba(217, 119, 6, 0.08) 100%)',
          border: '2px solid #f59e0b',
          boxShadow: '0 0 28px rgba(245, 158, 11, 0.22)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          marginBottom: '28px'
        }}
      >
        <div className="bookmark-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
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
                  {t('portal.importantBadge')}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff', letterSpacing: '-0.01em' }}>
                  {t('portal.personalLinkTitle')}
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.92rem', color: '#fef08a' }}>
                {t('portal.personalLinkSubtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-gold btn-lg bookmark-btn"
            onClick={handleCopyLink}
            style={{ padding: '10px 22px', fontSize: '0.98rem' }}
          >
            {copiedLink ? <Check size={18} color="#1e1302" /> : <Copy size={18} />}
            <span>{copiedLink ? t('portal.linkCopiedBtn') : t('portal.copyLinkBtn')}</span>
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
          title={t('portal.clickToCopyHint')}
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
            {copiedLink ? t('common.copied') : t('portal.clickToCopyHint')}
          </span>
        </div>
      </div>

      {/* Profile & Wishlist Editor */}
      <form onSubmit={handleSave} className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>{t('portal.profileWishlistTitle')}</h2>
          <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
            {t('portal.editableAfterDrawBadge')}
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
          {t('portal.wishlistNotice')}
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
                ? t('portal.wishlistUpdatedSuccess')
                : t('portal.wishlistSavedSuccess')}
            </span>
          </div>
        )}

        {/* Avatar Picker */}
        <div className="form-group">
          <label className="form-label">{t('portal.chooseAvatarLabel')}</label>
          <div className="avatar-grid">
            {AVATAR_PRESETS.map((av) => {
              const label = getAvatarLabel(av);
              return (
                <button
                  type="button"
                  key={av.id}
                  className={`avatar-choice ${avatarUrl === av.id ? 'selected' : ''}`}
                  onClick={() => setAvatarUrl(av.id)}
                  title={label}
                  aria-label={label}
                  aria-pressed={avatarUrl === av.id}
                >
                  {av.emoji}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              <Upload size={14} />
              <span>{isUploadingAvatar ? t('common.uploading') : t('common.uploadCustomPhoto')}</span>
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarUpload}
                disabled={isUploadingAvatar}
              />
            </label>
            {avatarUrl.startsWith('/uploads/') && (
              <span style={{ fontSize: '0.8rem', color: '#34d399' }}>{t('common.customImageActive')}</span>
            )}
          </div>
        </div>

        {/* Wishlist Textarea */}
        <div className="form-group">
          <label className="form-label">{t('portal.myWishesLabel')}</label>
          <textarea
            className="form-textarea"
            placeholder={t('portal.myWishesPlaceholder')}
            value={wishlistText}
            onChange={(e) => setWishlistText(e.target.value)}
            rows={5}
          />
          <span className="form-hint">{t('portal.myWishesHint')}</span>
        </div>

        {/* Wishlist External Link */}
        <div className="form-group">
          <label className="form-label">{t('portal.externalWishlistLabel')}</label>
          <input
            type="url"
            className="form-input"
            placeholder={t('portal.externalWishlistPlaceholder')}
            value={wishlistUrl}
            onChange={(e) => setWishlistUrl(e.target.value)}
          />
          <span className="form-hint">{t('portal.externalWishlistHint')}</span>
        </div>

        {/* Ready Card (Sehr präsent vor der Auslosung) */}
        {!event.is_drawn && (
          <div
            className="ready-card"
            onClick={() => setIsReady(!isReady)}
            style={{
              background: isReady
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(5, 150, 105, 0.12) 100%)'
                : 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.1) 100%)',
              border: isReady ? '2px solid #10b981' : '2px solid #f59e0b',
              boxShadow: isReady ? '0 0 24px rgba(16, 185, 129, 0.25)' : '0 0 24px rgba(245, 158, 11, 0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              marginBottom: '24px',
              cursor: 'pointer',
              transition: 'all 0.25s ease'
            }}
          >
            <div className="ready-card-inner" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <input
                  type="checkbox"
                  checked={isReady}
                  onChange={(e) => setIsReady(e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '26px',
                    height: '26px',
                    accentColor: '#10b981',
                    cursor: 'pointer',
                    marginTop: '2px',
                    flexShrink: 0
                  }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span className="badge" style={{
                      background: isReady ? '#10b981' : '#f59e0b',
                      color: '#1e1302',
                      fontWeight: 800,
                      padding: '3px 8px',
                      fontSize: '0.78rem'
                    }}>
                      {isReady ? t('portal.readyCardBadgeReady') : t('portal.readyCardBadgeImportant')}
                    </span>
                    <strong style={{ color: '#ffffff', fontSize: '1.18rem', letterSpacing: '-0.01em' }}>
                      {t('portal.readyCardTitle')}
                    </strong>
                  </div>
                  <p style={{
                    fontSize: '0.92rem',
                    color: isReady ? '#a7f3d0' : '#fef08a',
                    margin: 0,
                    lineHeight: '1.45'
                  }}>
                    {t('portal.readyCardDesc')}
                  </p>
                </div>
              </div>

              <div
                className="ready-card-pill"
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  background: isReady ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.25)',
                  border: `1px solid ${isReady ? '#10b981' : '#f59e0b'}`,
                  color: isReady ? '#6ee7b7' : '#fef08a',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {isReady ? t('portal.readyCardPillReady') : t('portal.readyCardPillClick')}
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary btn-mobile-full" disabled={saving}>
            <Save size={16} />
            <span>
              {saving
                ? t('portal.savingBtn')
                : event.is_drawn
                ? t('portal.updateWishlistBtn')
                : t('portal.saveChangesBtn')}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
