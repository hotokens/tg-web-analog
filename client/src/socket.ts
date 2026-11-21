import { io, type Socket } from 'socket.io-client';
import type { Chat, Message, Reaction, User } from './types';

export interface SocketHandlers {
  onConnect: () => void;
  onDisconnect: () => void;
  onConnectError: (error: Error) => void;
  onMessage: (message: Message) => void;
  onMessageUpdated: (payload: { chatId: number; messageId: number; text: string; editedAt: number | null }) => void;
  onMessageReactions: (payload: { chatId: number; messageId: number; reactions: Reaction[] }) => void;
  onRead: (payload: { chatId: number; userId: number; messageId: number }) => void;
  onTyping: (payload: { chatId: number; userId: number; name: string; isTyping: boolean }) => void;
  onPresence: (payload: { userId: number; online: boolean; lastSeen: number }) => void;
  onUserUpdated: (user: User) => void;
  onChatNew: (chat: Chat) => void;
}

let socket: Socket | null = null;

export function connectSocket(token: string, handlers: SocketHandlers): Socket {
  disconnectSocket();
  socket = io({
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 700,
    reconnectionDelayMax: 4000,
  });

  socket.on('connect', handlers.onConnect);
  socket.on('disconnect', handlers.onDisconnect);
  socket.on('connect_error', handlers.onConnectError);
  socket.on('message:new', handlers.onMessage);
  socket.on('message:updated', (payload: { chatId: number; messageId: number; text: string; editedAt: number | null }) =>
    handlers.onMessageUpdated(payload),
  );
  socket.on('message:reactions', (payload: { chatId: number; messageId: number; reactions: Reaction[] }) =>
    handlers.onMessageReactions(payload),
  );
  socket.on('message:read', handlers.onRead);
  socket.on('typing', handlers.onTyping);
  socket.on('presence', handlers.onPresence);
  socket.on('user:updated', handlers.onUserUpdated);
  socket.on('chat:new', handlers.onChatNew);

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}
