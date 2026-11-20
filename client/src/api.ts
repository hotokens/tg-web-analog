import type { Attachment, Chat, Message, User } from './types';

const TOKEN_KEY = 'tgweb.token';

let authToken: string | null = localStorage.getItem(TOKEN_KEY);

export function getStoredToken(): string | null {
  return authToken;
}

export function setStoredToken(token: string | null): void {
  authToken = token;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, { ...options, headers });
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    /* no body */
  }

  if (!response.ok) {
    if (response.status === 401 && !path.endsWith('/auth/login')) {
      window.dispatchEvent(new Event('tg:unauthorized'));
    }
    throw new Error(data?.error || 'Не удалось выполнить запрос');
  }

  return data as T;
}

export const api = {
  login(username: string, password: string) {
    return request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  me() {
    return request<{ user: User }>('/api/auth/me');
  },

  chats() {
    return request<{ chats: Chat[] }>('/api/chats');
  },

  messages(chatId: number, before?: number) {
    const query = before ? `?limit=30&before=${before}` : '?limit=30';
    return request<{ messages: Message[]; hasMore: boolean }>(`/api/chats/${chatId}/messages${query}`);
  },

  createChat(userId: number) {
    return request<{ chat: Chat }>('/api/chats', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  searchUsers(search: string) {
    return request<{ users: User[] }>(`/api/users?search=${encodeURIComponent(search)}`);
  },

  async upload(file: File) {
    const form = new FormData();
    form.append('file', file);
    const result = await request<{ attachment: Attachment }>('/api/upload', { method: 'POST', body: form });
    return result.attachment;
  },

  async uploadAvatar(file: File) {
    const form = new FormData();
    form.append('file', file);
    const result = await request<{ user: User }>('/api/profile/avatar', { method: 'POST', body: form });
    return result.user;
  },

  updateProfile(data: { name?: string; bio?: string }) {
    return request<{ user: User }>('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};
