import React, { useState, useEffect } from 'react';
import {
  Calendar, Euro, Users, CheckCircle2, AlertCircle, Copy, Check,
  QrCode, Share2, Play, Lock, Trash2, ShieldCheck, Clock, ExternalLink,
  Edit2, Plus, Pencil, Upload, X
} from 'lucide-react';
import { BANNER_PRESETS, BUDGET_PRESETS, formatDate, AVATAR_PRESETS } from '../constants/presets';
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
        throw new Error(resData.error || 'Fehler beim Hochladen des Bildes.');
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
        throw new Error(resJson.error || 'Fehler beim Speichern der Aktions-Details.');
      }

      setShowEditModal(false);
      setFeedbackMessage({ type: 'success', text: 'Aktions-Details & Banner wurden erfolgreich gespeichert!' });
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
        throw new Error(resJson.error || 'Fehler beim Hinzufügen des Teilnehmers.');
      }

      setNewParticipantName('');
      setFeedbackMessage({ type: 'success', text: `Teilnehmer "${clean}" wurde erfolgreich hinzugefügt!` });
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
      ? `"${p.name}" ist bereits beigetreten und hat eventuell schon Wünsche hinterlegt.\n\nMöchtest du "${p.name}" wirklich unwiderruflich entfernen? Der persönliche Zugangslink wird ungültig. Bestehende andere Teilnehmer bleiben unverändert.`
      : `Möchtest du "${p.name}" aus der Aktion entfernen?`;

    if (!window.confirm(warning)) return;

    setFeedbackMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}/admin/participants/${p.id}?token=${adminToken}`, {
        method: 'DELETE'
      });
      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || 'Fehler beim Entfernen des Teilnehmers.');
      }

      setFeedbackMessage({ type: 'success', text: `Teilnehmer "${p.name}" wurde entfernt.` });
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
        throw new Error(resJson.error || 'Fehler beim Umbenennen des Teilnehmers.');
      }

      setFeedbackMessage({ type: 'success', text: `Name wurde erfolgreich in "${clean}" geändert.` });
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
    if (!window.confirm(`Ausschlussregel "${ex.giver_name} darf nicht ${ex.receiver_name}" wirklich löschen?`)) return;

    setFeedbackMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}/admin/exclusions/${ex.id}?token=${adminToken}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const resJson = await res.json();
        throw new Error(resJson.error || 'Fehler beim Löschen des Ausschlusses.');
      }

      await fetchAdminData();
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.message });
    }
  };

  // Trigger Secret Santa draw
  const handleStartDraw = async () => {
    if (!data?.stats.allReady) {
      const confirmForce = window.confirm(
        'Nicht alle Teilnehmer haben ihren Wunschzettel als fertig markiert. Möchtest du die Auslosung trotzdem jetzt starten?\n\n(Hinweis: Alle Teilnehmer können ihre Wunschzettel auch nach der Auslosung weiterhin jederzeit ausfüllen und anpassen!)'
      );
      if (!confirmForce) return;
    } else {
      const confirmNormal = window.confirm(
        'Möchtest du das Wichteln jetzt auslosen? Nach der Auslosung können keine weiteren Teilnehmer hinzugefügt oder Ausschlüsse geändert werden.\n\n(Hinweis: Wunschzettel können von allen Teilnehmern auch nach der Auslosung weiterhin jederzeit angepasst werden.)'
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
              <span>Aktions-Details & Banner anpassen</span>
            </button>
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
            <strong style={{ display: 'block', fontSize: '1rem', color: 'white' }}>Auslosung erfolgreich!</strong>
            <span style={{ fontSize: '0.9rem' }}>{drawSuccessMessage}</span>
          </div>
        </div>
      )}

      {/* Event Note / Description Card */}
      {event.description && (
        <div className="glass-card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#ffffff' }}>Notiz zur Aktion</h3>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.75rem', padding: '3px 8px', border: 'none' }}
              onClick={handleOpenEditModal}
            >
              <Edit2 size={12} />
              <span>Bearbeiten</span>
            </button>
          </div>
          <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
            {event.description}
          </p>
        </div>
      )}

      {/* Share Links Card */}
      <div className="glass-card">
        <h2 style={{ marginBottom: '16px' }}>Links zum Teilen & Verwalten</h2>

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
                ? 'Jeder Teilnehmer kann ab sofort mit seinem Link sein gezogenes Wichtelkind einsehen. Wunschzettel können weiterhin jederzeit angepasst werden!'
                : stats.allReady
                ? 'Alle Teilnehmer sind beigetreten und haben ihren Wunschzettel ausgefüllt.'
                : `Warte auf Teilnehmer: ${stats.readyCount} von ${stats.totalCount} bereit.`}
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
        marginBottom: '24px'
      }}>
        <span style={{ fontSize: '0.85rem', color: '#fef3c7' }}>
          <strong>Admin-Privatsphäre:</strong> Du siehst hier als Admin nur den Status (wer beigetreten ist und wer fertig ist). Auch nach der Auslosung kannst weder du noch sonst jemand einsehen, wer wen beschenkt.
        </span>
      </div>

      {/* Participants Table with Add & Manage functionality */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>Teilnehmer-Status ({participants.length})</h2>
          {event.is_drawn && (
            <span style={{ fontSize: '0.82rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={13} /> Auslosung erfolgt (Teilnehmerliste fixiert)
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
              placeholder="Weiteren Teilnehmer hinzufügen (z. B. Lisa, Papa)..."
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
              <span>{addingParticipant ? 'Füge hinzu...' : 'Teilnehmer hinzufügen'}</span>
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
                          title={`Name "${p.name}" korrigieren`}
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
                      {p.is_claimed ? 'Beigetreten' : 'Wartet auf Beitritt'}
                    </span>
                  </div>
                </div>

                <div className="participant-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {event.is_drawn ? (
                    p.has_wishlist ? (
                      <span className="badge badge-ready">Wunschzettel vorhanden</span>
                    ) : (
                      <span className="badge badge-empty">Noch keine Wünsche</span>
                    )
                  ) : p.is_ready ? (
                    <span className="badge badge-ready">Bereit</span>
                  ) : p.is_claimed ? (
                    <span className="badge badge-pending">Wunschzettel unvollständig</span>
                  ) : (
                    <span className="badge badge-empty">Noch offen</span>
                  )}

                  {p.is_claimed === 1 && p.participant_token && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleCopy(`${window.location.origin}/event/${eventId}/me?token=${p.participant_token}`, `p_${p.id}`)}
                      title={`Zugangslink für ${p.name} kopieren (falls verloren)`}
                      style={{ padding: '4px 9px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      {copiedLink === `p_${p.id}` ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                      <span>{copiedLink === `p_${p.id}` ? 'Kopiert!' : 'Link'}</span>
                    </button>
                  )}

                  {/* Delete participant button (before draw) */}
                  {!event.is_drawn && (
                    <button
                      type="button"
                      onClick={() => handleDeleteParticipant(p)}
                      title={`Teilnehmer "${p.name}" entfernen`}
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
                  borderRadius: 'var(--radius-sm)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{ex.giver_name} darf nicht {ex.receiver_name}</span>
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
                    title="Ausschlussregel entfernen"
                  >
                    <X size={12} color="#f87171" />
                  </button>
                )}
              </span>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.85rem', margin: 0 }}>Keine Ausschlüsse aktiv.</p>
        )}
      </div>

      {/* Auto-Deletion Notice & Danger Zone */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '16px 0' }}>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
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

      {/* Edit Event Details Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => !isSavingDetails && setShowEditModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Aktions-Details & Banner anpassen</h3>
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
                <strong>Hinweis:</strong> Das Wichteln ist bereits ausgelost. Du kannst Titel, Datum, Budget, Notiz und Banner jederzeit anpassen, ohne dass die Auslosung oder die Wunschzettel der Teilnehmer beeinflusst werden.
              </div>
            )}

            <form onSubmit={handleSaveEventDetails}>
              <div className="form-group">
                <label className="form-label">Titel der Aktion *</label>
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
                  <label className="form-label">Aktionsdatum (Bescherung) *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editEventDate}
                    onChange={(e) => setEditEventDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Budget (z. B. 20 €)</label>
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
                <label className="form-label">Beschreibung / Notiz</label>
                <textarea
                  className="form-textarea"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  placeholder="z. B. Ort, Uhrzeit oder besondere Hinweise an die Gruppe..."
                />
              </div>

              {/* Banner Selector */}
              <div className="form-group">
                <label className="form-label">Aktions-Banner / Thema:</label>
                <div className="preset-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', marginBottom: '12px' }}>
                  {BANNER_PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      className={`preset-card ${editBannerUrl === preset.id ? 'selected' : ''}`}
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
                        {preset.name}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                    <Upload size={14} />
                    <span>{isUploadingBanner ? 'Lade hoch...' : 'Eigenes Bild hochladen'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleBannerUpload}
                      disabled={isUploadingBanner}
                    />
                  </label>
                  {editBannerUrl.startsWith('/uploads/') && (
                    <span style={{ fontSize: '0.8rem', color: '#34d399' }}>✓ Eigenes Bild aktiv</span>
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
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-mobile-full"
                  disabled={isSavingDetails || !editTitle.trim() || !editEventDate}
                >
                  <span>{isSavingDetails ? 'Speichert...' : 'Änderungen speichern'}</span>
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
            <h3 style={{ marginBottom: '8px' }}>Teilnehmer umbenennen</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Korrigiere den Namen von <strong>{renameParticipant.name}</strong>. Zugangslink, Wunschzettel und Status bleiben für diese Person unverändert erhalten.
            </p>

            <form onSubmit={handleSaveRename}>
              <div className="form-group">
                <label className="form-label">Neuer Name</label>
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
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-mobile-full"
                  disabled={renaming || !renameNewName.trim() || renameNewName.trim() === renameParticipant.name}
                >
                  <span>{renaming ? 'Speichert...' : 'Name speichern'}</span>
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
          title={`Einladung für "${event.title}"`}
          onClose={() => setShowQrModal(false)}
        />
      )}
    </div>
  );
}
