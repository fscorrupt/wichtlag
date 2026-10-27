import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SnowEffect from './components/SnowEffect';
import HomeHero from './components/HomeHero';
import EventCreate from './components/EventCreate';
import AdminDashboard from './components/AdminDashboard';
import JoinEvent from './components/JoinEvent';
import ParticipantPortal from './components/ParticipantPortal';
import { useTranslation } from './i18n';

export default function App() {
  const { t } = useTranslation();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentSearch, setCurrentSearch] = useState(window.location.search);
  const [appearance, setAppearance] = useState(() => {
    try { return localStorage.getItem('wichtlag_appearance') === 'light' ? 'light' : 'dark'; }
    catch { return 'dark'; }
  });

  useEffect(() => {
    document.documentElement.dataset.appearance = appearance;
    try { localStorage.setItem('wichtlag_appearance', appearance); } catch {}
  }, [appearance]);

  // Sync state on browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      setCurrentSearch(window.location.search);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (to) => {
    window.history.pushState({}, '', to);
    const [path, search] = to.split('?');
    setCurrentPath(path || '/');
    setCurrentSearch(search ? `?${search}` : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getSearchParams = () => new URLSearchParams(currentSearch);

  const renderContent = () => {
    if (currentPath === '/create') {
      return (
        <EventCreate
          onCreated={(eventId, adminToken) => {
            navigate(`/event/${eventId}/admin?token=${adminToken}`);
          }}
        />
      );
    }

    const adminMatch = currentPath.match(/^\/event\/([a-zA-Z0-9]+)\/admin/);
    if (adminMatch) {
      const eventId = adminMatch[1];
      const token = getSearchParams().get('token');
      return (
        <AdminDashboard
          eventId={eventId}
          adminToken={token}
          onNavigate={navigate}
        />
      );
    }

    const meMatch = currentPath.match(/^\/event\/([a-zA-Z0-9]+)\/me/);
    if (meMatch) {
      const eventId = meMatch[1];
      let token = getSearchParams().get('token');
      if (!token) {
        token = localStorage.getItem(`wichtel_token_${eventId}`);
      }
      return (
        <ParticipantPortal
          eventId={eventId}
          token={token}
          onNavigate={navigate}
        />
      );
    }

    const joinMatch = currentPath.match(/^\/event\/([a-zA-Z0-9]+)(\/join)?$/);
    if (joinMatch) {
      const eventId = joinMatch[1];
      return (
        <JoinEvent
          eventId={eventId}
          onClaimed={(participantToken) => {
            navigate(`/event/${eventId}/me?token=${participantToken}`);
          }}
          onNavigateToPortal={(token) => {
            navigate(`/event/${eventId}/me?token=${token}`);
          }}
        />
      );
    }

    return (
      <HomeHero
        onCreateClick={() => navigate('/create')}
        onNavigate={navigate}
      />
    );
  };

  return (
    <div className="app-container">
      <SnowEffect />
      <Navbar onNavigate={navigate} appearance={appearance} onToggleAppearance={() => setAppearance(appearance === 'light' ? 'dark' : 'light')} />

      <main className="main-content">
        {renderContent()}
      </main>

      <footer className="footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <p style={{ margin: 0 }}>
            <strong>WichtlAG.</strong> {t('footer.tagline')}
          </p>
          <span style={{ opacity: 0.35 }}>•</span>
          <a
            href="https://github.com/fscorrupt/wichtlag"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-github-link"
            aria-label={t('footer.githubAria')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'inherit', textDecoration: 'none' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ verticalAlign: '-1px' }}>
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>GitHub</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
