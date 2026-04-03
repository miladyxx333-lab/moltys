
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import KeyMasterPanel from './KeyMasterPanel';
import LandingPage from './LandingPage';
import './index.css';

import ColiseumPage from './ColiseumPage';
import NexusSilkRoadPage from './NexusSilkRoadPage';

function Router() {
  const path = window.location.pathname;

  if (path === '/nexus333' || path === '/nexus333/') {
    return <KeyMasterPanel />;
  }

  if (path === '/dashboard' || path === '/dashboard/') {
    return <App />;
  }

  if (path === '/coliseum') {
    return <ColiseumPage />;
  }

  if (path === '/nexus' || path === '/nexus/') {
    return <NexusSilkRoadPage />;
  }

  return <LandingPage />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>,
);
