
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import KeyMasterPanel from './KeyMasterPanel';
import './index.css';

import LandingPage from './LandingPage';

// Simple routing based on pathname
function Router() {
  const path = window.location.pathname;

  // Admin Nexus (Unlisted)
  if (path === '/nexus333' || path === '/nexus333/') {
    return <KeyMasterPanel />;
  }

  // Dashboard Logged In
  if (path === '/dashboard') {
    return <App />;
  }

  // Default Entry: Landing Page
  return <LandingPage />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>,
);
