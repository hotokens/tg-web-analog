import { create } from 'zustand';
import { api, getStoredToken, setStoredToken } from './api';
import { connectSocket, disconnectSocket, getSocket } from './socket';
import type { Attachment, Chat, LastMessage, Message, Theme, ToastState, TypingState, User } from './types';
import { sortChats, syncTitle } from './utils';

const THEME_KEY = 'tgweb.theme';

interface AppState {
  booted: boolean;
  token: string | null;
  user: User | null;
  chats: Chat[];
  chatsLoading: boolean;
  activeChatId: number | null;
  messages: Record<number, Message[]>;
  hasMore: Record<number, boolean>;
  loadingMessages: Record<number, boolean>;
  typing: Record<number, TypingState | null>;
  connected: boolean;
  theme: Theme;
  settingsOpen: boolean;
  newChatOpen: boolean;
  toast: ToastState | null;

  boot: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loadChats: () => Promise<void>;
  openChat: (chatId: number) => Promise<void>;
  closeChat: () => void;
  markRead: (chatId: number) => void;
  loadMore: (chatId: number) => Promise<void>;
  sendMessage: (text: string, attachments: Attachment[]) => Promise<boolean>;
  createChat: (userId: number) => Promise<Chat | null>;
  saveProfile: (name: string, bio: string) => Promise<void>;
  saveAvatar: (file: File) => Promise<void>;
  setTheme: (theme: Theme) => void;
  openSettings: () => void;
  closeSettings: () => void;
  openNewChat: () => void;
  closeNewChat: () => void;
  showToast: (text: string, kind?: ToastState['kind']) => void;
  clearToast: () => void;
  setConnected: (connected: boolean) => void;
  receiveMessage: (message: Message) => void;
  receiveRead: (payload: { chatId: number; userId: number; messageId: number }) => void;
  receiveTyping: (payload: { chatId: number; userId: number; name: string; isTyping: boolean }) => void;
  clearTyping: (chatId: number) => void;
  updatePresence: (payload: { userId: number; online: boolean; lastSeen: number }) => void;
  applyUserUpdated: (user: User) => void;
  applyNewChat: (chat: Chat) => void;
}

const typingTimers = new Map<number, number>();
let toastTimer: number | undefined;

function lastMessageFrom(message: Message): LastMessage {
  return {
    id: message.id,
    text: message.text,
    senderId: message.senderId,
    createdAt: message.createdAt,
    hasAttachments: message.attachments.length > 0,
    attachmentType: message.attachments[0] ? (message.attachments[0].isImage ? 'image' : 'file') : null,
  };
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Что-то пошло не так';
}

export const useStore = create<AppState>()((set, get) => ({
  booted: false,
  token: null,
  user: null,
  chats: [],
  chatsLoading: true,
  activeChatId: null,
  messages: {},
  hasMore: {},
  loadingMessages: {},
  typing: {},
  connected: false,
  theme: 'light',
  settingsOpen: false,
  newChatOpen: false,
  toast: null,

  boot: async () => {
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    const theme: Theme =
      savedTheme ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    set({ theme });

    const token = getStoredToken();
    if (!token) {
      set({ booted: true, chatsLoading: false });
      return;
    }

    try {
      const { user } = await api.me();
      set({ user, token });
      attachSocket(token);
      await get().loadChats();
    } catch {
      setStoredToken(null);
      set({ user: null, token: null, chatsLoading: false });
    } finally {
      set({ booted: true });
    }
  },

  login: async (username, password) => {
    const { token, user } = await api.login(username.trim(), password);
    setStoredToken(token);
    set({ token, user });
    attachSocket(token);
    await get().loadChats();
  },

  logout: () => {
    disconnectSocket();
    setStoredToken(null);
    for (const timer of typingTimers.values()) window.clearTimeout(timer);
    typingTimers.clear();
    set({
      user: null,
      token: null,
      chats: [],
      activeChatId: null,
      messages: {},
      hasMore: {},
      loadingMessages: {},
      typing: {},
      connected: false,
      settingsOpen: false,
      newChatOpen: false,
    });
    syncTitle([], null);
  },

  loadChats: async () => {
    const hadChats = get().chats.length > 0;
    if (!hadChats) set({ chatsLoading: true });
    try {
      const { chats } = await api.chats();
      const sorted = sortChats(chats);
      set({ chats: sorted, chatsLoading: false });
      syncTitle(sorted, get().activeChatId);
    } catch (error) {
      set({ chatsLoading: false });
      if (get().user) get().showToast(errorText(error), 'error');
    }
  },

  openChat: async (chatId) => {
    set({ activeChatId: chatId, newChatOpen: false });
    syncTitle(get().chats, chatId);

    if (!get().messages[chatId]) {
      set((state) => ({ loadingMessages: { ...state.loadingMessages, [chatId]: true } }));
      try {
        const { messages, hasMore } = await api.messages(chatId);
        set((state) => ({
          messages: { ...state.messages, [chatId]: messages },
          hasMore: { ...state.hasMore, [chatId]: hasMore },
        }));
      } catch (error) {
        get().showToast(errorText(error), 'error');
      } finally {
        set((state) => ({ loadingMessages: { ...state.loadingMessages, [chatId]: false } }));
      }
    }

    get().markRead(chatId);
  },

  closeChat: () => {
    set({ activeChatId: null });
    syncTitle(get().chats, null);
  },

  markRead: (chatId) => {
    const state = get();
    const chat = state.chats.find((item) => item.id === chatId);
    if (!chat) return;

    const messages = state.messages[chatId] ?? [];
    const lastId = messages.length > 0 ? messages[messages.length - 1].id : chat.lastMessage?.id;
    if (!lastId) return;

    if (chat.unreadCount > 0) {
      const chats = state.chats.map((item) => (item.id === chatId ? { ...item, unreadCount: 0 } : item));
      set({ chats });
      syncTitle(chats, state.activeChatId);
    }

    getSocket()?.emit('read', { chatId, messageId: lastId });
  },

  loadMore: async (chatId) => {
    const state = get();
    if (state.loadingMessages[chatId] || state.hasMore[chatId] === false) return;
    const current = state.messages[chatId] ?? [];
    if (current.length === 0) return;

    set((prev) => ({ loadingMessages: { ...prev.loadingMessages, [chatId]: true } }));
    try {
      const { messages, hasMore } = await api.messages(chatId, current[0].id);
      set((prev) => {
        const existing = prev.messages[chatId] ?? [];
        const known = new Set(existing.map((message) => message.id));
        const merged = [...messages.filter((message) => !known.has(message.id)), ...existing];
        return {
          messages: { ...prev.messages, [chatId]: merged },
          hasMore: { ...prev.hasMore, [chatId]: hasMore },
        };
      });
    } catch (error) {
      get().showToast(errorText(error), 'error');
    } finally {
      set((prev) => ({ loadingMessages: { ...prev.loadingMessages, [chatId]: false } }));
    }
  },

  sendMessage: (text, attachments) =>
    new Promise<boolean>((resolve) => {
      const { activeChatId } = get();
      const socket = getSocket();
      if (!activeChatId) {
        resolve(false);
        return;
      }
      if (!socket || !socket.connected) {
        get().showToast('Нет соединения с сервером', 'error');
        resolve(false);
        return;
      }

      socket.emit(
        'message:send',
        {
          chatId: activeChatId,
          text,
          attachmentIds: attachments.map((attachment) => attachment.id),
        },
        (response: { ok?: boolean; error?: string }) => {
          if (response?.error) {
            get().showToast(response.error, 'error');
            resolve(false);
          } else {
            resolve(true);
          }
        },
      );
    }),

  createChat: async (userId) => {
    try {
      const { chat } = await api.createChat(userId);
      get().applyNewChat(chat);
      await get().openChat(chat.id);
      return chat;
    } catch (error) {
      get().showToast(errorText(error), 'error');
      return null;
    }
  },

  saveProfile: async (name, bio) => {
    try {
      const { user } = await api.updateProfile({ name, bio });
      set({ user });
      get().showToast('Профиль обновлён', 'success');
    } catch (error) {
      get().showToast(errorText(error), 'error');
    }
  },

  saveAvatar: async (file) => {
    try {
      const user = await api.uploadAvatar(file);
      set({ user });
      get().showToast('Аватар обновлён', 'success');
    } catch (error) {
      get().showToast(errorText(error), 'error');
    }
  },

  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
    set({ theme });
  },

  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  openNewChat: () => set({ newChatOpen: true }),
  closeNewChat: () => set({ newChatOpen: false }),

  showToast: (text, kind = 'info') => {
    window.clearTimeout(toastTimer);
    set({ toast: { id: Date.now(), text, kind } });
    toastTimer = window.setTimeout(() => set({ toast: null }), 3500);
  },

  clearToast: () => {
    window.clearTimeout(toastTimer);
    set({ toast: null });
  },

  setConnected: (connected) => set({ connected }),

  receiveMessage: (message) => {
    const state = get();
    const me = state.user?.id;
    if (!me) return;

    const existing = state.messages[message.chatId] ?? [];
    if (existing.some((item) => item.id === message.id)) return;

    const isActive = state.activeChatId === message.chatId;
    const index = state.chats.findIndex((chat) => chat.id === message.chatId);
    let chats = state.chats;

    if (index >= 0) {
      const current = state.chats[index];
      const updated: Chat = {
        ...current,
        lastMessage: lastMessageFrom(message),
        unreadCount:
          isActive || message.senderId === me ? (isActive ? 0 : current.unreadCount) : current.unreadCount + 1,
      };
      chats = [updated, ...state.chats.filter((chat) => chat.id !== message.chatId)];
    } else {
      void get().loadChats();
    }

    const typing = { ...state.typing };
    if (message.senderId !== me) typing[message.chatId] = null;

    set({
      messages: {
        ...state.messages,
        [message.chatId]: [...existing, message].sort((a, b) => a.id - b.id),
      },
      chats,
      typing,
    });
    syncTitle(chats, state.activeChatId);

    if (isActive && message.senderId !== me) {
      getSocket()?.emit('read', { chatId: message.chatId, messageId: message.id });
    }
  },

  receiveRead: ({ chatId, userId, messageId }) => {
    const chats = get().chats.map((chat) =>
      chat.id === chatId && chat.peer.id === userId
        ? { ...chat, peerLastReadMessageId: Math.max(chat.peerLastReadMessageId, messageId) }
        : chat,
    );
    set({ chats });
  },

  receiveTyping: ({ chatId, userId, name, isTyping }) => {
    if (userId === get().user?.id) return;
    if (!get().chats.some((chat) => chat.id === chatId)) return;

    const existingTimer = typingTimers.get(chatId);
    if (existingTimer) window.clearTimeout(existingTimer);

    if (!isTyping) {
      get().clearTyping(chatId);
      return;
    }

    set((state) => ({ typing: { ...state.typing, [chatId]: { userId, name, at: Date.now() } } }));
    const timer = window.setTimeout(() => {
      const state = useStore.getState();
      if (state.typing[chatId]?.userId === userId) {
        set((prev) => ({ typing: { ...prev.typing, [chatId]: null } }));
      }
      typingTimers.delete(chatId);
    }, 5000);
    typingTimers.set(chatId, timer);
  },

  clearTyping: (chatId) => {
    const timer = typingTimers.get(chatId);
    if (timer) window.clearTimeout(timer);
    typingTimers.delete(chatId);
    set((state) => ({ typing: { ...state.typing, [chatId]: null } }));
  },

  updatePresence: ({ userId, online, lastSeen }) => {
    const chats = get().chats.map((chat) =>
      chat.peer.id === userId ? { ...chat, peer: { ...chat.peer, online, lastSeen } } : chat,
    );
    set({ chats });
  },

  applyUserUpdated: (user) => {
    if (user.id === get().user?.id) {
      set({ user });
    }
    const chats = get().chats.map((chat) => (chat.peer.id === user.id ? { ...chat, peer: user } : chat));
    set({ chats });
  },

  applyNewChat: (chat) => {
    const state = get();
    const exists = state.chats.some((item) => item.id === chat.id);
    const chats = sortChats(
      exists ? state.chats.map((item) => (item.id === chat.id ? chat : item)) : [chat, ...state.chats],
    );
    set({ chats });
    syncTitle(chats, state.activeChatId);
  },
}));

function attachSocket(token: string): void {
  connectSocket(token, {
    onConnect: () => {
      const state = useStore.getState();
      state.setConnected(true);
      void state.loadChats();
      if (state.activeChatId) state.markRead(state.activeChatId);
    },
    onDisconnect: () => useStore.getState().setConnected(false),
    onConnectError: (error) => {
      if (error.message === 'unauthorized') useStore.getState().logout();
    },
    onMessage: (message) => useStore.getState().receiveMessage(message),
    onRead: (payload) => useStore.getState().receiveRead(payload),
    onTyping: (payload) => useStore.getState().receiveTyping(payload),
    onPresence: (payload) => useStore.getState().updatePresence(payload),
    onUserUpdated: (user) => useStore.getState().applyUserUpdated(user),
    onChatNew: (chat) => useStore.getState().applyNewChat(chat),
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('tg:unauthorized', () => useStore.getState().logout());
}
