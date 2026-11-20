import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useStore } from '../store';
import type { User } from '../types';
import { Avatar } from './Avatar';
import { CloseIcon, SearchIcon } from './Icons';

export function NewChatModal() {
  const open = useStore((state) => state.newChatOpen);
  const close = useStore((state) => state.closeNewChat);
  const createChat = useStore((state) => state.createChat);

  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingId, setCreatingId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setUsers([]);
    setError(null);
    setCreatingId(null);
    window.setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(
      async () => {
        try {
          const result = await api.searchUsers(query);
          if (!cancelled) {
            setUsers(result.users);
            setError(null);
          }
        } catch (err) {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Не удалось загрузить список');
        } finally {
          if (!cancelled) setLoading(false);
        }
      },
      query ? 250 : 0,
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  if (!open) return null;

  async function pick(user: User) {
    if (creatingId !== null) return;
    setCreatingId(user.id);
    const chat = await createChat(user.id);
    setCreatingId(null);
    if (chat) close();
  }

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <div className="modal new-chat-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-head">
          <h3>Новый чат</h3>
          <button type="button" className="icon-btn" onClick={close} title="Закрыть">
            <CloseIcon size={20} />
          </button>
        </header>

        <div className="modal-search">
          <SearchIcon size={19} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Имя или @username"
            spellCheck={false}
          />
          {query && (
            <button type="button" className="search-clear" onClick={() => setQuery('')} title="Очистить">
              <CloseIcon size={16} />
            </button>
          )}
        </div>

        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}
          {loading && users.length === 0 && (
            <div className="modal-loading">
              <span className="mini-spinner" />
            </div>
          )}
          {!loading && users.length === 0 && !error && (
            <div className="modal-empty">
              <p>Никого не нашли</p>
              <span>Попробуйте другое имя или @username</span>
            </div>
          )}

          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              className="user-row"
              onClick={() => void pick(user)}
              disabled={creatingId !== null}
            >
              <Avatar user={user} size={48} showOnline />
              <span className="user-row-body">
                <span className="user-row-name">{user.name}</span>
                <span className="user-row-sub">
                  @{user.username}
                  {user.bio ? ` · ${user.bio}` : ''}
                </span>
              </span>
              {creatingId === user.id && <span className="mini-spinner" />}
            </button>
          ))}
        </div>

        <footer className="modal-foot">Демо-пользователи из локальной базы</footer>
      </div>
    </div>
  );
}
