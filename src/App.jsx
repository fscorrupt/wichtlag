import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SnowEffect from './components/SnowEffect';
import HomeHero from './components/HomeHero';
import EventCreate from './components/EventCreate';
import AdminDashboard from './components/AdminDashboard';
import JoinEvent from './components/JoinEvent';
import ParticipantPortal from './components/ParticipantPortal';
import InfoModal from './components/InfoModal';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentSearch, setCurrentSearch] = useState(window.location.search);
  const [showInfo, setShowInfo] = useState(false);

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

  // Helper to parse URL params
  const getSearchParams = () => new URLSearchParams(currentSearch);

  // Route matching logic
  const renderContent = () => {
    // Route: /create
    if (currentPath === '/create') {
      return (
        <EventCreate
          onCreated={(eventId, adminToken) => {
            navigate(`/event/${eventId}/admin?token=${adminToken}`);
          }}
        />
      );
    }

    // Route: /event/:id/admin
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

    // Route: /event/:id/me
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

    // Route: /event/:id/join or /event/:id
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

    // Default / Home
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
      <Navbar onNavigate={navigate} onOpenInfo={() => setShowInfo(true)} />

      <main className="main-content">
        {renderContent()}
      </main>

      <footer className="footer">
        <p style={{ margin: 0 }}>
          🎁 <strong>WichtlAG</strong> • Secret-Santa • Privatsphäre garantiert • Auto-Cleanup nach 14 Tagen
        </p>
      </footer>

      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
    </div>
  );
}
