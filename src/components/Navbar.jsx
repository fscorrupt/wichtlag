import React from 'react';
import { Moon, Plus, Sun } from 'lucide-react';

export default function Navbar({ onNavigate, appearance, onToggleAppearance }) {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <a href="/" onClick={(event) => { event.preventDefault(); onNavigate('/'); }} className="brand-link" aria-label="WichtlAG Startseite">
          <img className="brand-mark" src="/logo.svg" alt="" width="40" height="40" />
          <span className="brand-title">WichtlAG<span className="brand-period">.</span></span>
        </a>
        <div className="nav-actions">
          <span className="nav-tagline">Schenken verbindet.</span>
          <button type="button" className="icon-button" onClick={onToggleAppearance} aria-label={appearance === 'dark' ? 'Helles Design aktivieren' : 'Dunkles Design aktivieren'} title={appearance === 'dark' ? 'Licht an' : 'Licht aus'}>{appearance === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onNavigate('/create')}><Plus size={17} /><span>Neue Aktion</span></button>
        </div>
      </div>
    </header>
  );
}