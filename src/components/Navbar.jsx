import React from 'react';

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
            className="brand-logo"
          />
          <span className="brand-title">WichtlAG</span>
        </a>

        <div className="nav-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm btn-pill"
            onClick={() => onNavigate('/create')}
          >
            <span>+ Neue Aktion</span>
          </button>
        </div>
      </div>
    </header>
  );
}
