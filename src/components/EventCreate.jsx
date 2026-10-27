import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { BANNER_PRESETS, BUDGET_PRESETS } from '../constants/presets';
import { matchSecretSanta } from '../../server/matcher.js';

export default function EventCreate({ onCreated }) {
  const [step, setStep] = useState(1);

  // Step 1: Eckdaten
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [maxBudget, setMaxBudget] = useState('20 €');
  const [description, setDescription] = useState('');

  // Step 2: Titelbild
  const [bannerUrl, setBannerUrl] = useState('preset:winterwald');
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // Step 3: Teilnehmer & Ausschlüsse
  const [names, setNames] = useState([]);
  const [nameInput, setNameInput] = useState('');
  const [exclusions, setExclusions] = useState([]);
  const [exGiver, setExGiver] = useState('');
  const [exReceiver, setExReceiver] = useState('');
  const [isBidirectional, setIsBidirectional] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 Validation & Next
  const handleNextFromStep1 = (e) => {
    e?.preventDefault();
    if (!title.trim()) {
      setError('Bitte gib einen Titel für die Aktion ein.');
      return;
    }
    if (!eventDate) {
      setError('Bitte wähle das Datum der Bescherung aus.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    setError('');
    setStep(3);
  };

  // Participant management
  const handleAddName = (e) => {
    e?.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;

    if (names.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      setError(`"${trimmed}" steht bereits in der Liste.`);
      return;
    }

    setNames([...names, trimmed]);
    setNameInput('');
    setError('');
  };

  const handleRemoveName = (nameToRemove) => {
    setNames(names.filter((n) => n !== nameToRemove));
    setExclusions(exclusions.filter(
      (ex) => ex.giver_name !== nameToRemove && ex.receiver_name !== nameToRemove
    ));
  };

  // Exclusion management
  const handleAddExclusion = (e) => {
    e?.preventDefault();
    if (!exGiver || !exReceiver || exGiver === exReceiver) {
      setError('Wähle zwei unterschiedliche Personen für den Ausschluss aus.');
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

  // Custom banner upload
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
        setError(data.error || 'Fehler beim Hochladen.');
      }
    } catch {
      setError('Verbindung zum Server fehlgeschlagen.');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  // Live validation of draw possibility
  const drawValidation = useMemo(() => {
    if (names.length < 2) {
      return { possible: false, message: 'Mindestens 2 Teilnehmer erforderlich.' };
    }

    const simulatedParticipants = names.map((n, i) => ({ id: `p${i}`, name: n }));
    const simulatedExclusions = exclusions.map((ex) => ({
      giver_name: ex.giver_name,
      receiver_name: ex.receiver_name
    }));

    const testResult = matchSecretSanta(simulatedParticipants, simulatedExclusions, false);
    if (!testResult) {
      return {
        possible: false,
        message: 'Mit diesen Ausschlussregeln ist keine vollständige Runde möglich. Bitte lockere die Regeln.'
      };
    }

    return { possible: true, message: 'Auslosung mit allen Regeln problemlos möglich.' };
  }, [names, exclusions]);

  // Submit complete event
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !eventDate) {
      setError('Titel und Datum sind erforderlich.');
      setStep(1);
      return;
    }
    if (names.length < 2) {
      setError('Es werden mindestens zwei Teilnehmer benötigt.');
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
        throw new Error(data.error || 'Fehler beim Erstellen.');
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
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ marginBottom: '6px' }}>Wichtel-Aktion anlegen</h1>
        <p style={{ margin: 0, fontSize: '0.95rem' }}>
          Erstelle eure Wichtelrunde in wenigen Schritten.
        </p>
      </div>

      <ol className="create-progress" aria-label="Fortschritt">
        {['Eure Runde', 'Euer Look', 'Eure Menschen'].map((label, index) => (
          <li key={label} className={step === index + 1 ? 'current' : step > index + 1 ? 'done' : ''} aria-current={step === index + 1 ? 'step' : undefined}><span>{step > index + 1 ? <CheckCircle2 size={16} /> : index + 1}</span>{label}</li>
        ))}
      </ol>

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
          <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* SCHRITT 1: ECKDATEN */}
      {step === 1 && (
        <div className="glass-card">
          <h2 style={{ fontSize: '1.3rem', marginBottom: '16px' }}>Eckdaten der Aktion</h2>

          <div className="form-group">
            <label className="form-label">Titel der Wichtelrunde *</label>
            <input
              type="text"
              className="form-input"
              placeholder="z. B. Familie Wichteln 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Aktionsdatum (Bescherung) *</label>
              <input
                type="date"
                className="form-input"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
              <span className="form-hint">Aktion wird 14 Tage nach diesem Tag automatisch gelöscht.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Maximaler Wert (Budget)</label>
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

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Beschreibung / Notiz (optional)</label>
            <textarea
              className="form-textarea"
              placeholder="z. B. Treffpunkt, Uhrzeit oder besondere Hinweise an die Gruppe..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNextFromStep1}
            >
              <span>Weiter</span>
            </button>
          </div>
        </div>
      )}

      {/* SCHRITT 2: TITELBILD */}
      {step === 2 && (
        <div className="glass-card">
          <h2 style={{ fontSize: '1.3rem', marginBottom: '16px' }}>Aktions-Banner / Titelbild</h2>

          {/* Banner Live-Vorschau */}
          <div
            className="event-banner-display"
            style={{
              background: selectedPreset
                ? selectedPreset.background
                : bannerUrl.startsWith('/uploads/')
                ? `url(${bannerUrl}) center/cover no-repeat`
                : 'var(--surface-2)',
              minHeight: '140px',
              height: 'auto',
              marginBottom: '16px'
            }}
          >
            <div className="banner-overlay" />
            <div className="banner-content">
              <h3 style={{ color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.7)', margin: '0 0 4px 0' }}>
                {title || 'Vorschau Titelbild'}
              </h3>
              <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)' }}>
                {eventDate ? `Bescherung am ${eventDate}` : 'Datum noch offen'} • Budget: {maxBudget}
              </span>
            </div>
          </div>

          <label className="form-label">Wähle ein grafisches Thema:</label>
          <div className="preset-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', marginBottom: '16px' }}>
            {BANNER_PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.id}
                className={`preset-card ${bannerUrl === preset.id ? 'selected' : ''}`}
                aria-pressed={bannerUrl === preset.id}
                style={{
                  background: preset.background,
                  height: '75px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '8px 12px',
                  textAlign: 'left'
                }}
                onClick={() => setBannerUrl(preset.id)}
              >
                <span style={{ fontSize: '0.82rem', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                  {preset.name}
                </span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
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

          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setStep(1)}
            >
              <span>Zurück</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNextFromStep2}
            >
              <span>Weiter</span>
            </button>
          </div>
        </div>
      )}

      {/* SCHRITT 3: TEILNEHMER & REGELN */}
      {step === 3 && (
        <form onSubmit={handleSubmit}>
          {/* Teilnehmer */}
          <div className="glass-card">
            <h2 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>
              Teilnehmer ({names.length})
            </h2>
            <p style={{ fontSize: '0.88rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>
              Trage die Namen aller Personen ein. Beim Beitreten wählt jeder Teilnehmer einfach seinen eigenen Namen aus.
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
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
                <Plus size={16} />
                <span>Hinzufügen</span>
              </button>
            </div>

            {names.length > 0 ? (
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
                      fontWeight: 600
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
                      <Trash2 size={13} color="#f87171" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Noch keine Namen hinzugefügt. Gib oben einen Namen ein.
              </p>
            )}
          </div>

          {/* Ausschlussregeln */}
          <div className="glass-card">
            <h2 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>
              Ausschlussregeln ({exclusions.length})
            </h2>
            <p style={{ fontSize: '0.88rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>
              Wer darf wen nicht beschenken? (z. B. Partner, Geschwister).
            </p>

            {names.length < 2 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Füge zuerst mindestens 2 Teilnehmer oben hinzu, um Ausschlüsse festzulegen.
              </p>
            ) : (
              <>
                <div
                  className="exclusion-builder-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '12px',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}
                >
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Person A</label>
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

                  <div className="exclusion-arrow" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', paddingTop: '16px' }}>
                    darf nicht ziehen ➔
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Person B</label>
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

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
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
                    className="btn btn-secondary btn-sm btn-mobile-full"
                    onClick={handleAddExclusion}
                    disabled={!exGiver || !exReceiver || exGiver === exReceiver}
                  >
                    <Plus size={14} />
                    <span>Ausschluss anlegen</span>
                  </button>
                </div>

                {exclusions.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                    {exclusions.map((ex, idx) => (
                      <div key={idx} className="exclusion-row" style={{ justifyContent: 'space-between', padding: '8px 12px' }}>
                        <span style={{ fontSize: '0.85rem' }}>
                          <strong>{ex.giver_name}</strong> darf <strong>{ex.receiver_name}</strong> nicht ziehen
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExclusion(idx)}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '2px 6px', border: 'none' }}
                        >
                          <Trash2 size={13} color="#f87171" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Validation Indicator */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: drawValidation.possible ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${drawValidation.possible ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.4)'}`,
                  color: drawValidation.possible ? '#34d399' : '#f87171',
                  fontSize: '0.83rem',
                  fontWeight: 600
                }}>
                  {drawValidation.possible ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                  <span>{drawValidation.message}</span>
                </div>
              </>
            )}
          </div>

          {/* Navigation & Submit */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setStep(2)}
            >
              <span>Zurück</span>
            </button>

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-mobile-full"
              disabled={loading || names.length < 2 || !drawValidation.possible}
            >
              <span>{loading ? 'Erstelle Aktion...' : 'Aktion erstellen'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
