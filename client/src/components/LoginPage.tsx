import { useState, type FormEvent } from 'react';
import { useStore } from '../store';
import { TelegramLogo } from './Avatar';

const DEMO_ACCOUNTS = [
  { username: 'alice', name: 'Алиса' },
  { username: 'bob', name: 'Борис' },
  { username: 'carol', name: 'Карина' },
  { username: 'dave', name: 'Денис' },
];

export function LoginPage() {
  const login = useStore((state) => state.login);
  const [username, setUsername] = useState('alice');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn(loginName: string, loginPassword: string) {
    setLoading(true);
    setError(null);
    try {
      await login(loginName, loginPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    void signIn(username, password);
  }

  function quickLogin(loginName: string) {
    if (loading) return;
    setUsername(loginName);
    setPassword('123456');
    void signIn(loginName, '123456');
  }

  return (
    <div className="login-page">
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />

      <div className="login-card">
        <div className="login-logo">
          <TelegramLogo size={84} />
        </div>
        <h1>Telegram Web</h1>
        <p className="login-sub">Войдите, чтобы продолжить переписку</p>

        <form onSubmit={handleSubmit} className="login-form">
          <label className="field">
            <span>Имя пользователя</span>
            <input
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setError(null);
              }}
              placeholder="alice"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              disabled={loading}
            />
          </label>

          <label className="field">
            <span>Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
              placeholder="••••••"
              autoComplete="current-password"
              disabled={loading}
            />
          </label>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading || !username.trim() || !password}>
            {loading ? <span className="btn-spinner" /> : 'Войти'}
          </button>
        </form>

        <div className="demo-block">
          <div className="demo-title">Демо-аккаунты · пароль 123456</div>
          <div className="demo-users">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.username}
                type="button"
                className="demo-chip"
                onClick={() => quickLogin(account.username)}
                disabled={loading}
              >
                <span className="demo-chip-name">{account.name}</span>
                <span className="demo-chip-login">@{account.username}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="login-foot">Локальная демо-версия · сообщения хранятся в SQLite</div>
    </div>
  );
}
