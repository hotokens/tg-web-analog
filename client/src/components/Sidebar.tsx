import { useMemo, useState } from 'react';
import { useStore } from '../store';
import type { Chat } from '../types';
import { formatChatTime } from '../utils';
import { Avatar } from './Avatar';
import { CloseIcon, PencilIcon, SearchIcon, SettingsIcon } from './Icons';

function previewText(chat: Chat, myId: number, typing: boolean): { text: string; accent: boolean } {
  if (typing) return { text: 'печатает…', accent: true };
  const last = chat.lastMessage;
  if (!last) return { text: 'Нет сообщений', accent: false };

  let text = last.text;
  if (!text) {
    text = last.attachmentType === 'image' ? 'Фотография' : last.attachmentType === 'file' ? 'Файл' : '';
  }
  if (last.attachmentType === 'image' && last.text) text = `Фотография · ${text}`;
  if (last.attachmentType === 'file' && last.text) text = `Файл · ${text}`;
  if (last.senderId === myId) text = `Вы: ${text}`;
  return { text, accent: false };
}

interface ChatItemProps {
  chat: Chat;
  active: boolean;
  myId: number;
  typing: boolean;
}

function ChatItem({ chat, active, myId, typing }: ChatItemProps) {
  const openChat = useStore((state) => state.openChat);
  const preview = previewText(chat, myId, typing);
  const unread = chat.unreadCount;

  return (
    <button
      type="button"
      className={`chat-item ${active ? 'is-active' : ''} ${unread > 0 ? 'has-unread' : ''}`}
      onClick={() => void openChat(chat.id)}
    >
      <Avatar user={chat.peer} size={54} showOnline />
      <div className="chat-item-body">
        <div className="chat-item-top">
          <span className="chat-item-name">{chat.peer.name}</span>
          <span className="chat-item-time">{formatChatTime(chat.lastMessage?.createdAt)}</span>
        </div>
        <div className="chat-item-bottom">
          <span className={`chat-item-preview ${preview.accent ? 'accent' : ''}`}>{preview.text}</span>
          {unread > 0 && <span className="unread-badge">{unread > 99 ? '99+' : unread}</span>}
        </div>
      </div>
    </button>
  );
}

export function Sidebar() {
  const user = useStore((state) => state.user);
  const chats = useStore((state) => state.chats);
  const chatsLoading = useStore((state) => state.chatsLoading);
  const activeChatId = useStore((state) => state.activeChatId);
  const typing = useStore((state) => state.typing);
  const connected = useStore((state) => state.connected);
  const openSettings = useStore((state) => state.openSettings);
  const openNewChat = useStore((state) => state.openNewChat);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return chats;
    return chats.filter(
      (chat) =>
        chat.peer.name.toLowerCase().includes(needle) ||
        chat.peer.username.toLowerCase().includes(needle) ||
        (chat.lastMessage?.text ?? '').toLowerCase().includes(needle),
    );
  }, [chats, query]);

  if (!user) return null;

  return (
    <aside className="sidebar">
      <header className="sidebar-head">
        <button type="button" className="avatar-btn" onClick={openSettings} title="Профиль и настройки">
          <Avatar user={user} size={40} />
        </button>
        <div className="sidebar-title">
          Telegram <span>web</span>
        </div>
        <button type="button" className="icon-btn" onClick={openSettings} title="Настройки">
          <SettingsIcon />
        </button>
      </header>

      {!connected && <div className="offline-banner">Подключение к серверу…</div>}

      <div className="search-wrap">
        <SearchIcon size={19} className="search-icon" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск"
          className="search-input"
          spellCheck={false}
        />
        {query && (
          <button type="button" className="search-clear" onClick={() => setQuery('')} title="Очистить">
            <CloseIcon size={16} />
          </button>
        )}
      </div>

      <div className="chat-list">
        {chatsLoading && chats.length === 0 ? (
          <div className="chat-skeleton-wrap">
            {[0, 1, 2, 3, 4].map((row) => (
              <div className="chat-skeleton" key={row}>
                <div className="skeleton skeleton-avatar" />
                <div className="skeleton-lines">
                  <div className="skeleton skeleton-line" style={{ width: `${55 + row * 6}%` }} />
                  <div className="skeleton skeleton-line short" style={{ width: `${38 + row * 5}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="list-empty">
            <p>{query ? 'Никого не нашли' : 'Пока нет чатов'}</p>
            <button type="button" className="btn-ghost" onClick={openNewChat}>
              Начать переписку
            </button>
          </div>
        ) : (
          filtered.map((chat) => (
            <ChatItem
              key={chat.id}
              chat={chat}
              active={chat.id === activeChatId}
              myId={user.id}
              typing={Boolean(typing[chat.id])}
            />
          ))
        )}
      </div>

      <button type="button" className="fab" onClick={openNewChat} title="Новый чат">
        <PencilIcon size={22} />
      </button>
    </aside>
  );
}
