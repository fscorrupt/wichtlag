import React, { useState, useEffect } from 'react';
import {
  Calendar, Euro, Users, CheckCircle2, AlertCircle, Copy, Check,
  QrCode, Share2, Play, Lock, Trash2, ShieldCheck, Clock, ExternalLink,
  Edit2, Plus, Pencil, Upload, X, RotateCcw
} from 'lucide-react';
import { BANNER_PRESETS, BUDGET_PRESETS, AVATAR_PRESETS } from '../constants/presets';
import QRCodeModal from './QRCodeModal';
import confetti from 'canvas-confetti';
import { useTranslation } from '../i18n';

export default function AdminDashboard({ eventId, adminToken, onNavigate }) {
  const { t, formatDate, getThemeName } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [drawSuccessMessage, setDrawSuccessMessage] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState('');

  // Edit Event Details Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editEventDate, setEditEventDate] = useState('');
  const [editMaxBudget, setEditMaxBudget] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editBannerUrl, setEditBannerUrl] = useState('');
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // Participant management state
  const [newParticipantName, setNewParticipantName] = useState('');
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [renameParticipant, setRenameParticipant] = useState(null);
  const [renameNewName, setRenameNewName] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Status feedback toast/banner
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Fetch admin event details
  const fetchAdminData = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/admin?token=${adminToken}`);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || t('admin.accessDeniedTitle'));
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
      const interval = setInterval(fetchAdminData, 8000);
      return () => clearInterval(interval);
    }
  }, [eventId, adminToken]);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(key);
    setTimeout(() => setCopiedLink(''), 2500);
  };

  // Open Edit Event Details Modal
  const handleOpenEditModal = () => {
    if (!data?.event) return;
    setEditTitle(data.event.title);
    setEditEventDate(data.event.event_date);
    setEditMaxBudget(data.event.max_budget || '');
    setEditDescription(data.event.description || '');
    setEditBannerUrl(data.event.banner_url || 'preset:winterwald');
    setShowEditModal(true);
  };

  // Handle Banner Upload in Edit Modal
  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    setIsUploadingBanner(true);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || t('create.errorUpload'));
      }
      setEditBannerUrl(resData.url);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsUploadingBanner(false);
    }
  };

  // Save Event Details
  const handleSaveEventDetails = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !editEventDate) return;

    setIsSavingDetails(true);
    setFeedbackMessage(null);

    try {
      const res = await fetch(`/api/events/${eventId}/admin?token=${adminToken}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          event_date: editEventDate,
          max_budget: editMaxBudget.trim(),
          description: editDescription.trim(),
          banner_url: editBannerUrl
        })
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || t('common.serverError'));
      }

      setShowEditModal(false);
      setFeedbackMessage({ type: 'success', text: t('admin.savedSuccess') });
      await fetchAdminData();
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.message });
    } finally {
      setIsSavingDetails(false);
    }
  };

  // Add a new participant
  const handleAddParticipant = async (e) => {
    e.preventDefault();
    const clean = newParticipantName.trim();
    if (!clean) return;

    setAddingParticipant(true);
    setFeedbackMessage(null);

    try {
      const res = await fetch(`/api/events/${eventId}/admin/participants?token=${adminToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clean })
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || t('common.serverError'));
      }

      setNewParticipantName('');
      setFeedbackMessage({ type: 'success', text: t('admin.participantAddedSuccess', { name: clean }) });
      await fetchAdminData();
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.message });
    } finally {
      setAddingParticipant(false);
    }
  };

  // Delete a participant
  const handleDeleteParticipant = async (p) => {
    const warning = p.is_claimed
      ? t('admin.deleteParticipantClaimedConfirm', { name: p.name })
      : t('admin.deleteParticipantUnclaimedConfirm', { name: p.name });

    if (!window.confirm(warning)) return;

    setFeedbackMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}/admin/participants/${p.id}?token=${adminToken}`, {
        method: 'DELETE'
      });
      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || t('common.serverError'));
      }

      setFeedbackMessage({ type: 'success', text: t('admin.participantDeletedSuccess', { name: p.name }) });
      await fetchAdminData();
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.message });
    }
  };

  // Reset participant claim (before draw)
  const handleResetParticipantClaim = async (p) => {
    const confirmReset = window.confirm(t('admin.resetClaimConfirm', { name: p.name }));
    if (!confirmReset) return;

    setFeedbackMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}/admin/participants/${p.id}/reset?token=${adminToken}`, {
        method: 'POST'
      });
      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || t('common.serverError'));
      }

      setFeedbackMessage({ type: 'success', text: t('admin.resetClaimSuccess', { name: p.name }) });
      await fetchAdminData();
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.message });
    }
  };

  // Open Rename Participant modal
  const handleOpenRename = (p) => {
    setRenameParticipant(p);
    setRenameNewName(p.name);
  };

  // Save Participant Rename
  const handleSaveRename = async (e) => {
    e.preventDefault();
    const clean = renameNewName.trim();
    if (!clean || !renameParticipant) return;

    setRenaming(true);
    setFeedbackMessage(null);

    try {
      const res = await fetch(`/api/events/${eventId}/admin/participants/${renameParticipant.id}?token=${adminToken}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clean })
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || t('common.serverError'));
      }

      setFeedbackMessage({ type: 'success', text: t('admin.renameSuccess', { name: clean }) });
      setRenameParticipant(null);
      await fetchAdminData();
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.message });
    } finally {
      setRenaming(false);
    }
  };

  // Delete an exclusion rule
  const handleDeleteExclusion = async (ex) => {
    if (!window.confirm(t('admin.deleteExclusionConfirm', { giver: ex.giver_name, receiver: ex.receiver_name }))) return;

    setFeedbackMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}/admin/exclusions/${ex.id}?token=${adminToken}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const resJson = await res.json();
        throw new Error(resJson.error || t('common.serverError'));
      }

      await fetchAdminData();
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.message });
    }
  };

  // Trigger Secret Santa draw
  const handleStartDraw = async () => {
    if (!data?.stats.allReady) {
      const confirmForce = window.confirm(t('admin.forceDrawConfirm'));
      if (!confirmForce) return;
    } else {
      const confirmNormal = window.confirm(t('admin.normalDrawConfirm'));
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
        throw new Error(resData.error || t('common.serverError'));
      }

      setDrawSuccessMessage(resData.message || t('admin.drawSuccessTitle'));
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
    const confirmDel = window.confirm(t('admin.deleteEventConfirm'));
    if (!confirmDel) return;

    try {
      const res = await fetch(`/api/events/${eventId}?token=${adminToken}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert(t('admin.deleteEventSuccess'));
        onNavigate('/');
      } else {
        alert(t('common.error'));
      }
    } catch (err) {
      alert(t('common.serverError'));
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p>{t('admin.loading')}</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px auto' }} />
        <h2>{t('admin.accessDeniedTitle')}</h2>
        <p style={{ marginBottom: '20px' }}>{error}</p>
        <button type="button" className="btn btn-secondary" onClick={() => onNavigate('/')}>
          {t('common.home')}
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
      {/* Banner Display with Edit Button */}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.9)', color: 'white' }}>
                {t('admin.badgeAdmin')}
              </span>
              {event.is_drawn ? (
                <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.9)', color: 'white' }}>
                  {t('admin.badgeDrawn')}
                </span>
              ) : (
                <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.9)', color: '#1e1302' }}>
                  {t('admin.badgeInPrep')}
                </span>
              )}
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleOpenEditModal}
              style={{
                background: 'rgba(10, 14, 23, 0.75)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                fontSize: '0.8rem',
                padding: '5px 12px'
              }}
            >
              <Edit2 size={13} />
              <span>{t('admin.editDetailsBtn')}</span>
            </button>
          </div>

          <h1 style={{ color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.7)', marginBottom: '4px' }}>
            {event.title}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem' }}>
            <span>{t('admin.giftExchange', { date: formatDate(event.event_date) })}</span>
            {event.max_budget && <span>{t('admin.budget', { budget: event.max_budget })}</span>}
          </div>
        </div>
      </div>

      {/* Feedback Toast / Banner */}
      {feedbackMessage && (
        <div style={{
          background: feedbackMessage.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
          border: `1px solid ${feedbackMessage.type === 'error' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(16, 185, 129, 0.5)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          color: feedbackMessage.type === 'error' ? '#fca5a5' : '#6ee7b7',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <span>{feedbackMessage.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: '2px' }}
          >
            <X size={15} />
          </button>
        </div>
      )}

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
            <strong style={{ display: 'block', fontSize: '1rem', color: 'white' }}>{t('admin.drawSuccessTitle')}</strong>
            <span style={{ fontSize: '0.9rem' }}>{drawSuccessMessage}</span>
          </div>
        </div>
      )}

      {/* Event Note / Description Card */}
      {event.description && (
        <div className="glass-card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#ffffff' }}>{t('admin.noteTitle')}</h3>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.75rem', padding: '3px 8px', border: 'none' }}
              onClick={handleOpenEditModal}
            >
              <Edit2 size={12} />
              <span>{t('common.edit')}</span>
            </button>
          </div>
          <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
            {event.description}
          </p>
        </div>
      )}

      {/* Share Links Card */}
      <div className="glass-card">
        <h2 style={{ marginBottom: '16px' }}>{t('admin.shareLinksTitle')}</h2>

        <div style={{ marginBottom: '16px' }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{t('admin.joinLinkPrompt')}</span>
            <span className="form-hint">{t('admin.joinLinkHint')}</span>
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
                <span>{copiedLink === 'join' ? t('common.copied') : t('common.copy')}</span>
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
                <span>{t('admin.qrCodeBtn')}</span>
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{t('admin.adminLinkPrompt')}</span>
            <span className="form-hint">{t('admin.adminLinkHint')}</span>
          </label>
          <div className="link-box">
            <span>{adminUrl}</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleCopy(adminUrl, 'admin')}
            >
              {copiedLink === 'admin' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              <span>{copiedLink === 'admin' ? t('common.copied') : t('common.copy')}</span>
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
              {event.is_drawn ? t('admin.statusDrawnTitle') : t('admin.statusPrepTitle')}
            </h2>
            <p style={{ margin: 0 }}>
              {event.is_drawn
                ? t('admin.statusDrawnDesc')
                : stats.allReady
                ? t('admin.statusAllReadyDesc')
                : t('admin.statusWaitingDesc', { ready: stats.readyCount, total: stats.totalCount })}
            </p>
          </div>

          {!event.is_drawn && (
            <button
              type="button"
              className={`btn btn-lg btn-mobile-full ${stats.allReady ? 'btn-primary' : 'btn-secondary'}`}
              onClick={handleStartDraw}
              disabled={drawing || !validation.possible}
            >
              <Play size={20} />
              <span>{drawing ? t('admin.drawingBtn') : t('admin.startDrawBtn')}</span>
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
        marginBottom: '24px'
      }}>
        <span style={{ fontSize: '0.85rem', color: '#fef3c7' }}>
          {t('admin.privacyGuarantee')}
        </span>
      </div>

      {/* Participants Table with Add & Manage functionality */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>{t('admin.participantsHeading', { count: participants.length })}</h2>
          {event.is_drawn && (
            <span style={{ fontSize: '0.82rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={13} /> {t('admin.listLocked')}
            </span>
          )}
        </div>

        {/* Add Participant Form (before draw) */}
        {!event.is_drawn && (
          <form onSubmit={handleAddParticipant} style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-input"
              style={{ flex: '1 1 200px' }}
              placeholder={t('admin.addParticipantPlaceholder')}
              value={newParticipantName}
              onChange={(e) => setNewParticipantName(e.target.value)}
              disabled={addingParticipant}
            />
            <button
              type="submit"
              className="btn btn-secondary btn-mobile-full"
              disabled={addingParticipant || !newParticipantName.trim()}
            >
              <Plus size={15} />
              <span>{addingParticipant ? t('admin.addingParticipantBtn') : t('admin.addParticipantBtn')}</span>
            </button>
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {participants.map((p) => {
            const avatarPreset = AVATAR_PRESETS.find((a) => a.id === p.avatar_url);
            return (
              <div
                key={p.id}
                className="participant-list-item"
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
                <div className="participant-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: '600', color: 'var(--text-main)', display: 'block' }}>
                        {p.name}
                      </span>
                      {!event.is_drawn && (
                        <button
                          type="button"
                          onClick={() => handleOpenRename(p)}
                          title={t('admin.editNameTitle', { name: p.name })}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '2px'
                          }}
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {p.is_claimed ? t('admin.joinedStatus') : t('admin.waitingJoinStatus')}
                    </span>
                  </div>
                </div>

                <div className="participant-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {event.is_drawn ? (
                    p.has_wishlist ? (
                      <span className="badge badge-ready">{t('admin.badgeWishlistExists')}</span>
                    ) : (
                      <span className="badge badge-empty">{t('admin.badgeNoWishes')}</span>
                    )
                  ) : p.is_ready ? (
                    <span className="badge badge-ready">{t('admin.badgeReady')}</span>
                  ) : p.is_claimed ? (
                    <span className="badge badge-pending">{t('admin.badgeIncomplete')}</span>
                  ) : (
                    <span className="badge badge-empty">{t('admin.badgePending')}</span>
                  )}

                  {/* Reset claim button (only before draw, if claimed) */}
                  {!event.is_drawn && p.is_claimed === 1 && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleResetParticipantClaim(p)}
                      title={t('admin.resetClaimTitle', { name: p.name })}
                      style={{ padding: '4px 8px', border: 'none', color: '#fbbf24' }}
                    >
                      <RotateCcw size={13} />
                    </button>
                  )}

                  {/* Delete participant button (before draw) */}
                  {!event.is_drawn && (
                    <button
                      type="button"
                      onClick={() => handleDeleteParticipant(p)}
                      title={t('admin.deleteParticipantTitle', { name: p.name })}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px'
                      }}
                    >
                      <Trash2 size={14} color="#f87171" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exclusions Summary */}
      <div className="glass-card">
        <h3 style={{ marginBottom: '12px' }}>{t('admin.exclusionsHeading', { count: exclusions.length })}</h3>
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
                  borderRadius: 'var(--radius-sm)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{t('admin.exclusionRule', { giver: ex.giver_name, receiver: ex.receiver_name })}</span>
                {!event.is_drawn && (
                  <button
                    type="button"
                    onClick={() => handleDeleteExclusion(ex)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0',
                      color: 'var(--text-muted)'
                    }}
                    title={t('admin.deleteExclusionTitle')}
                  >
                    <X size={12} color="#f87171" />
                  </button>
                )}
              </span>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.85rem', margin: 0 }}>{t('admin.noExclusions')}</p>
        )}
      </div>

      {/* Auto-Deletion Notice & Danger Zone */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '16px 0' }}>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <span>{t('admin.autoDeleteNotice', { date: formatDate(event.event_date) })}</span>
        </div>

        <button
          type="button"
          className="btn btn-outline btn-sm"
          style={{ color: '#f87171' }}
          onClick={handleDeleteEvent}
        >
          <Trash2 size={14} />
          <span>{t('admin.deleteEventBtn')}</span>
        </button>
      </div>

      {/* Edit Event Details Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => !isSavingDetails && setShowEditModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>{t('admin.editModalTitle')}</h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                disabled={isSavingDetails}
              >
                <X size={18} />
              </button>
            </div>

            {event.is_drawn && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                marginBottom: '16px',
                fontSize: '0.82rem',
                color: '#a7f3d0'
              }}>
                {t('admin.editModalDrawnNote')}
              </div>
            )}

            <form onSubmit={handleSaveEventDetails}>
              <div className="form-group">
                <label className="form-label">{t('admin.editTitleLabel')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">{t('admin.editDateLabel')}</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editEventDate}
                    onChange={(e) => setEditEventDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('admin.editBudgetLabel')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editMaxBudget}
                    onChange={(e) => setEditMaxBudget(e.target.value)}
                    placeholder="z. B. 20 €"
                  />
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {BUDGET_PRESETS.map((bp) => (
                      <button
                        key={bp}
                        type="button"
                        className={`btn btn-sm ${editMaxBudget === bp ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '2px 7px', fontSize: '0.72rem' }}
                        onClick={() => setEditMaxBudget(bp)}
                      >
                        {bp}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('admin.editDescLabel')}</label>
                <textarea
                  className="form-textarea"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  placeholder={t('admin.editDescPlaceholder')}
                />
              </div>

              {/* Banner Selector */}
              <div className="form-group">
                <label className="form-label">{t('admin.editBannerLabel')}</label>
                <div className="preset-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', marginBottom: '12px' }}>
                  {BANNER_PRESETS.map((preset) => {
                    const name = getThemeName(preset);
                    return (
                      <button
                        type="button"
                        key={preset.id}
                        className={`preset-card ${editBannerUrl === preset.id ? 'selected' : ''}`}
                        aria-pressed={editBannerUrl === preset.id}
                        style={{
                          background: preset.background,
                          height: '60px',
                          display: 'flex',
                          alignItems: 'flex-end',
                          padding: '6px 10px',
                          textAlign: 'left'
                        }}
                        onClick={() => setEditBannerUrl(preset.id)}
                      >
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                          {name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                    <Upload size={14} />
                    <span>{isUploadingBanner ? t('common.uploading') : t('common.uploadCustomImage')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleBannerUpload}
                      disabled={isUploadingBanner}
                    />
                  </label>
                  {editBannerUrl.startsWith('/uploads/') && (
                    <span style={{ fontSize: '0.8rem', color: '#34d399' }}>✓ {t('common.customImageActive')}</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-mobile-full"
                  onClick={() => setShowEditModal(false)}
                  disabled={isSavingDetails}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-mobile-full"
                  disabled={isSavingDetails || !editTitle.trim() || !editEventDate}
                >
                  <span>{isSavingDetails ? t('common.saving') : t('admin.saveChangesBtn')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Participant Modal */}
      {renameParticipant && (
        <div className="modal-overlay" onClick={() => !renaming && setRenameParticipant(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h3 style={{ marginBottom: '8px' }}>{t('admin.renameModalTitle')}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {t('admin.renameModalDesc', { name: renameParticipant.name })}
            </p>

            <form onSubmit={handleSaveRename}>
              <div className="form-group">
                <label className="form-label">{t('admin.renameModalLabel')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={renameNewName}
                  onChange={(e) => setRenameNewName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-mobile-full"
                  onClick={() => setRenameParticipant(null)}
                  disabled={renaming}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-mobile-full"
                  disabled={renaming || !renameNewName.trim() || renameNewName.trim() === renameParticipant.name}
                >
                  <span>{renaming ? t('common.saving') : t('admin.saveNameBtn')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && (
        <QRCodeModal
          url={qrUrl}
          title={t('modals.qrEventSubtitle', { title: event.title })}
          onClose={() => setShowQrModal(false)}
        />
      )}
    </div>
  );
}
