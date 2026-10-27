import React from 'react';
import { X, ShieldCheck, Clock, Link2, EyeOff, Sparkles } from 'lucide-react';
import { useTranslation } from '../i18n';

export default function InfoModal({ onClose }) {
  const { t } = useTranslation();

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
            <h3 style={{ margin: 0 }}>{t('modals.aboutTitle')}</h3>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.92rem' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <EyeOff size={20} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--text-main)', display: 'block' }}>{t('modals.feature1Title')}</strong>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem' }}>
                {t('modals.feature1Desc')}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Link2 size={20} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--text-main)', display: 'block' }}>{t('modals.feature2Title')}</strong>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem' }}>
                {t('modals.feature2Desc')}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Clock size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--text-main)', display: 'block' }}>{t('modals.feature3Title')}</strong>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem' }}>
                {t('modals.feature3Desc')}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Sparkles size={20} color="#e879f9" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--text-main)', display: 'block' }}>{t('modals.feature4Title')}</strong>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem' }}>
                {t('modals.feature4Desc')}
              </p>
            </div>
          </div>
        </div>

        <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: '24px' }} onClick={onClose}>
          {t('common.gotIt')}
        </button>
      </div>
    </div>
  );
}
