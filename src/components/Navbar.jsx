import React from 'react';
import { PlusCircle } from 'lucide-react';

export default function Navbar({ onNavigate }) {
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
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.3)',
              flexShrink: 0
            }}
          />
          <span>WichtlAG</span>
        </a>

        <div className="nav-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onNavigate('/create')}
          >
            <PlusCircle size={15} />
            <span>Neue Aktion</span>
          </button>
        </div>
      </div>
    </header>
  );
}
