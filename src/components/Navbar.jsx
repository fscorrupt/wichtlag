import React from 'react';
import { PlusCircle, ShieldCheck } from 'lucide-react';

export default function Navbar({ onNavigate, onOpenInfo }) {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/');
          }}
          className="brand-link"
        >
          <img
            src="/logo.png"
            alt="WichtlAG Logo"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 0 12px rgba(239, 68, 68, 0.35)',
              flexShrink: 0
            }}
          />
          <span>WichtlAG</span>
        </a>

        <div className="nav-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onOpenInfo}
            title="Sicherheit & Datenschutz Info"
          >
            <ShieldCheck size={16} />
            <span style={{ display: 'none', '@media (min-width: 480px)': { display: 'inline' } }}>Datenschutz</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onNavigate('/create')}
          >
            <PlusCircle size={16} />
            <span>Neue Aktion</span>
          </button>
        </div>
      </div>
    </header>
  );
}
