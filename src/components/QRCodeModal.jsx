import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check } from 'lucide-react';
import { useTranslation } from '../i18n';

export default function QRCodeModal({ url, title, onClose }) {
  const { t } = useTranslation();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (url) {
      QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0a0e17',
          light: '#ffffff'
        }
      })
        .then((dataUrl) => setQrDataUrl(dataUrl))
        .catch((err) => console.error('QR code error', err));
    }
  }, [url]);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>{t('modals.qrTitle')}</h3>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onClose}
            style={{ padding: '4px 8px' }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>
          {title || t('modals.qrDefaultSubtitle')}
        </p>

        {qrDataUrl && (
          <div style={{ background: 'white', padding: '16px', borderRadius: '16px', display: 'inline-block', marginBottom: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            <img src={qrDataUrl} alt="QR Code" style={{ display: 'block', maxWidth: '240px', width: '100%', height: 'auto' }} />
          </div>
        )}

        <div className="link-box" style={{ marginBottom: '16px', textAlign: 'left' }}>
          <span style={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {url}
          </span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopy}>
            {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            <span>{copied ? t('common.copied') : t('common.copy')}</span>
          </button>
        </div>

        <button type="button" className="btn btn-outline" style={{ width: '100%' }} onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}
