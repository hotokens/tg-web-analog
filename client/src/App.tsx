import { useEffect, useRef } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { TelegramLogo } from './components/Avatar';
import { LoginPage } from './components/LoginPage';
import { Messenger } from './components/Messenger';
import { useStore } from './store';

export function App() {
  const booted = useStore((state) => state.booted);
  const user = useStore((state) => state.user);
  const theme = useStore((state) => state.theme);
  const boot = useStore((state) => state.boot);
  const bootStarted = useRef(false);

  useEffect(() => {
    if (bootStarted.current) return;
    bootStarted.current = true;
    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  if (!booted) {
    return (
      <div className="splash">
        <TelegramLogo size={92} />
        <div className="splash-text">Telegram Web</div>
        <div className="splash-spinner" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={user ? <Messenger /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
