import React, { useState, useMemo } from 'react';
import {
  Calendar, Euro, Users, ShieldAlert, Sparkles, Plus, Trash2,
  Image as ImageIcon, ArrowRight, CheckCircle2, AlertTriangle, Upload
} from 'lucide-react';
import { BANNER_PRESETS, BUDGET_PRESETS } from '../constants/presets';
import { matchSecretSanta } from '../../server/matcher.js'; // Can be simulated or checked locally!

export default function EventCreate({ onCreated }) {
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [maxBudget, setMaxBudget] = useState('20 €');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState('preset:winter1');
  const [customBannerFile, setCustomBannerFile] = useState(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // Participants
  const [names, setNames] = useState(['Anna', 'Ben', 'Clara', 'David']);
  const [nameInput, setNameInput] = useState('');

  // Exclusions: [{ giver_name, receiver_name }]
  const [exclusions, setExclusions] = useState([]);
  const [exGiver, setExGiver] = useState('');
  const [exReceiver, setExReceiver] = useState('');
  const [isBidirectional, setIsBidirectional] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle adding a participant name
  const handleAddName = (e) => {
    e?.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;

    if (names.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      setError(`"${trimmed}" existiert bereits in der Liste.`);
      return;
    }

    setNames([...names, trimmed]);
    setNameInput('');
    setError('');
  };

  // Handle removing a participant name
  const handleRemoveName = (nameToRemove) => {
    setNames(names.filter((n) => n !== nameToRemove));
    // Also remove any exclusions containing this name
    setExclusions(exclusions.filter(
      (ex) => ex.giver_name !== nameToRemove && ex.receiver_name !== nameToRemove
    ));
  };

  // Handle adding an exclusion rule
  const handleAddExclusion = (e) => {
    e?.preventDefault();
    if (!exGiver || !exReceiver || exGiver === exReceiver) {
      setError('Bitte wähle zwei unterschiedliche Personen für den Ausschluss aus.');
      return;
    }

    const newExclusions = [...exclusions];

    const exists = (g, r) => newExclusions.some((ex) => ex.giver_name === g && ex.receiver_name === r);

    if (!exists(exGiver, exReceiver)) {
      newExclusions.push({ giver_name: exGiver, receiver_name: exReceiver });
    }

    if (isBidirectional && !exists(exReceiver, exGiver)) {
      newExclusions.push({ giver_name: exReceiver, receiver_name: exGiver });
    }

    setExclusions(newExclusions);
    setExGiver('');
    setExReceiver('');
    setError('');
  };

  const handleRemoveExclusion = (index) => {
    setExclusions(exclusions.filter((_, i) => i !== index));
  };

  // Upload custom banner
  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBanner(true);
    setError('');
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setBannerUrl(data.url);
      } else {
        setError(data.error || 'Fehler beim Hochladen des Banners.');
      }
    } catch (err) {
      setError('Verbindung zum Server fehlgeschlagen.');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  // Live validation of draw feasibility
  const drawValidation = useMemo(() => {
    if (names.length < 2) {
      return { possible: false, message: 'Mindestens 2 Teilnehmer erforderlich.' };
    }

    // Prepare simulated participants
    const simulatedParticipants = names.map((n, i) => ({ id: `p${i}`, name: n }));
    const simulatedExclusions = exclusions.map((ex) => {
      const g = simulatedParticipants.find((p) => p.name.toLowerCase() === ex.giver_name.toLowerCase());
      const r = simulatedParticipants.find((p) => p.name.toLowerCase() === ex.receiver_name.toLowerCase());
      return {
        giver_name: ex.giver_name,
        receiver_name: ex.receiver_name
      };
    });

    // Check with simplified matching
    const testResult = matchSecretSanta(simulatedParticipants, simulatedExclusions, false);
    if (!testResult) {
      return {
        possible: false,
        message: 'Achtung: Mit den aktuellen Ausschlüssen ist keine Auslosung möglich!'
      };
    }

    return { possible: true, message: 'Auslosung mit allen Regeln erfolgreich möglich.' };
  }, [names, exclusions]);

  // Submit create event
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Bitte gib einen Titel für die Aktion ein.');
      return;
    }
    if (!eventDate) {
      setError('Bitte wähle das Datum der Wichtel-Aktion aus.');
      return;
    }
    if (names.length < 2) {
      setError('Es müssen mindestens zwei Personen teilnehmen.');
      return;
    }
    if (!drawValidation.possible) {
      setError(drawValidation.message);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          event_date: eventDate,
          max_budget: maxBudget,
          banner_url: bannerUrl,
          names,
          exclusions
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Erstellen der Aktion.');
      }

      onCreated(data.id, data.admin_token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedPreset = BANNER_PRESETS.find((p) => p.id === bannerUrl);

  return (
    <form onSubmit={handleSubmit} className="event-create-form">
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ marginBottom: '8px' }}>Wichtel-Aktion erstellen</h1>
        <p style={{ maxWidth: '600px', margin: '0 auto' }}>
          Erstelle deine eigene Secret-Santa-Runde ohne E-Mail-Zwang. Nach dem Erstellen erhältst du einen Admin-Link und einen Einladungslink für deine Gruppe.
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          color: '#fca5a5',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Grunddaten */}
      <div className="glass-card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Sparkles size={22} color="#fbbf24" />
          <span>1. Eckdaten der Aktion</span>
        </h2>

        <div className="form-group">
          <label className="form-label">Titel der Wichtel-Aktion *</label>
          <input
            type="text"
            className="form-input"
            placeholder="z. B. Weihnachtswichteln 2026 – Familie & Freunde"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={16} color="#38bdf8" />
              <span>Aktionsdatum (Bescherung) *</span>
            </label>
            <input
              type="date"
              className="form-input"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
            <span className="form-hint">Hinweis: 14 Tage nach diesem Datum wird der Raum automatisch gelöscht.</span>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Euro size={16} color="#10b981" />
              <span>Maximalwert (Budget)</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="z. B. 20 €"
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
              {BUDGET_PRESETS.map((bp) => (
                <button
                  key={bp}
                  type="button"
                  className={`btn btn-sm ${maxBudget === bp ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                  onClick={() => setMaxBudget(bp)}
                >
                  {bp}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Beschreibung / Notizen (optional)</label>
          <textarea
            className="form-textarea"
            placeholder="z. B. 'Wir treffen uns am 24.12. um 18:00 Uhr bei Oma. Bitte verpackt die Geschenke neutral!'"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      {/* 2. Banner-Auswahl */}
      <div className="glass-card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <ImageIcon size={22} color="#e879f9" />
          <span>2. Aktions-Banner / Titelbild</span>
        </h2>

        {/* Live Banner Preview */}
        <div
          className="event-banner-display"
          style={{
            background: selectedPreset
              ? selectedPreset.background
              : bannerUrl.startsWith('/uploads/')
              ? `url(${bannerUrl}) center/cover no-repeat`
              : 'var(--surface-2)',
            height: '140px',
            marginBottom: '16px'
          }}
        >
          <div className="banner-overlay" />
          <div className="banner-content">
            <h3 style={{ color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}>
              {title || 'Vorschau Titelbild'}
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>
              {eventDate ? `Bescherung am ${eventDate}` : 'Datum noch nicht gewählt'} • Budget: {maxBudget}
            </span>
          </div>
        </div>

        <label className="form-label">Wähle ein stimmungsvolles Theme:</label>
        <div className="preset-grid">
          {BANNER_PRESETS.map((preset) => (
            <div
              key={preset.id}
              className={`preset-card ${bannerUrl === preset.id ? 'selected' : ''}`}
              style={{ background: preset.background }}
              onClick={() => setBannerUrl(preset.id)}
            >
              <span>{preset.icon}</span>
              <span>{preset.name}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
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
          {bannerUrl.startsWith('/uploads/') && (
            <span style={{ fontSize: '0.8rem', color: '#34d399' }}>✓ Eigenes Bild aktiv</span>
          )}
        </div>
      </div>

      {/* 3. Teilnehmerliste (Namen vordefinieren) */}
      <div className="glass-card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <Users size={22} color="#38bdf8" />
          <span>3. Teilnehmer festlegen ({names.length})</span>
        </h2>
        <p style={{ fontSize: '0.88rem', marginBottom: '16px' }}>
          Gib die Namen aller Personen an, die mitmachen. Beim Beitreten wählt jeder Teilnehmer einfach seinen vordefinierten Namen aus der Liste.
        </p>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Name eingeben (z. B. Felix, Oma, Lukas)..."
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddName(e)}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleAddName}
          >
            <Plus size={18} />
            <span>Hinzufügen</span>
          </button>
        </div>

        {/* Name Chips Grid */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {names.map((name) => (
            <div
              key={name}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                background: 'var(--surface-2)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.9rem',
                fontWeight: '600'
              }}
            >
              <span>{name}</span>
              <button
                type="button"
                onClick={() => handleRemoveName(name)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px'
                }}
                title="Entfernen"
              >
                <Trash2 size={14} color="#f87171" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Ausschlüsse definieren */}
      <div className="glass-card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <ShieldAlert size={22} color="#ef4444" />
          <span>4. Ausschlussregeln definieren ({exclusions.length})</span>
        </h2>
        <p style={{ fontSize: '0.88rem', marginBottom: '16px' }}>
          Wer darf wen nicht beschenken? Ideal für Partner, Geschwister oder wenn jemand im Vorjahr dieselbe Person hatte.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Schenker (Person A)</label>
            <select
              className="form-select"
              value={exGiver}
              onChange={(e) => setExGiver(e.target.value)}
            >
              <option value="">– Wähle Person –</option>
              {names.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', paddingTop: '20px' }}>
            darf nicht ziehen ➔
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Empfänger (Person B)</label>
            <select
              className="form-select"
              value={exReceiver}
              onChange={(e) => setExReceiver(e.target.value)}
            >
              <option value="">– Wähle Person –</option>
              {names.filter((n) => n !== exGiver).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
            <input
              type="checkbox"
              checked={isBidirectional}
              onChange={(e) => setIsBidirectional(e.target.checked)}
              style={{ accentColor: 'var(--primary-red)' }}
            />
            <span>Gegenseitig ausschließen (A darf nicht B, und B darf nicht A)</span>
          </label>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleAddExclusion}
            disabled={!exGiver || !exReceiver || exGiver === exReceiver}
          >
            <Plus size={14} />
            <span>Ausschluss anlegen</span>
          </button>
        </div>

        {/* Exclusions List */}
        {exclusions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            {exclusions.map((ex, idx) => (
              <div key={idx} className="exclusion-row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.88rem' }}>
                  <strong>{ex.giver_name}</strong> darf <strong>{ex.receiver_name}</strong> nicht ziehen
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveExclusion(idx)}
                  className="btn btn-outline btn-sm"
                  style={{ padding: '2px 6px', border: 'none' }}
                >
                  <Trash2 size={14} color="#f87171" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Noch keine Ausschlüsse hinterlegt. Jeder kann jeden ziehen.
          </p>
        )}

        {/* Realtime Draw Validation Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          background: drawValidation.possible ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${drawValidation.possible ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.4)'}`,
          color: drawValidation.possible ? '#34d399' : '#f87171',
          fontSize: '0.85rem',
          fontWeight: '600'
        }}>
          {drawValidation.possible ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{drawValidation.message}</span>
        </div>
      </div>

      {/* Submit Button */}
      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <button
          type="submit"
          className="btn btn-primary btn-lg"
          style={{ width: '100%', maxWidth: '400px' }}
          disabled={loading || !drawValidation.possible}
        >
          <span>{loading ? 'Erstelle Aktion...' : 'Aktion jetzt erstellen'}</span>
          <ArrowRight size={20} />
        </button>
      </div>
    </form>
  );
}
