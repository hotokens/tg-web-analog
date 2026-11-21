import type { Chat } from './types';

export const DAY = 24 * 60 * 60 * 1000;

export function isSameDay(a: number, b: number): boolean {
  const first = new Date(a);
  const second = new Date(b);
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function formatChatTime(ts: number | null | undefined): string {
  if (!ts) return '';
  const now = Date.now();
  if (isSameDay(ts, now)) return formatTime(ts);
  if (isSameDay(ts, now - DAY)) return 'Вчера';
  const date = new Date(ts);
  if (now - ts < 6 * DAY) return date.toLocaleDateString('ru-RU', { weekday: 'short' });
  if (date.getFullYear() === new Date(now).getFullYear()) {
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  }
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function formatDateLabel(ts: number): string {
  const now = Date.now();
  if (isSameDay(ts, now)) return 'Сегодня';
  if (isSameDay(ts, now - DAY)) return 'Вчера';
  const date = new Date(ts);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export function formatLastSeen(ts: number): string {
  if (!ts) return 'не в сети';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'был(а) только что';
  if (diff < 60 * 60_000) return `был(а) ${Math.max(1, Math.round(diff / 60_000))} мин назад`;
  if (isSameDay(ts, Date.now())) return `был(а) сегодня в ${formatTime(ts)}`;
  if (isSameDay(ts, Date.now() - DAY)) return `был(а) вчера в ${formatTime(ts)}`;
  return `был(а) ${new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export const REACTION_EMOJIS = ['👍', '❤️', '🔥', '😂', '😮', '😢', '🙏', '🎉'] as const;

export function sortChats(chats: Chat[]): Chat[] {
  return [...chats].sort((a, b) => {
    const aTime = a.lastMessage?.createdAt ?? a.createdAt;
    const bTime = b.lastMessage?.createdAt ?? b.createdAt;
    return bTime - aTime;
  });
}

export function syncTitle(chats: Chat[], activeChatId: number | null): void {
  const unread = chats.reduce((sum, chat) => sum + (chat.id === activeChatId ? 0 : chat.unreadCount), 0);
  document.title = unread > 0 ? `(${unread > 99 ? '99+' : unread}) Telegram Web` : 'Telegram Web';
}
