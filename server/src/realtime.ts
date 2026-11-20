import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { userIdFromToken } from './auth.js';
import { chatMemberIds, chatPartnerIds, isChatMember, markChatRead } from './chat-utils.js';
import { db } from './db.js';
import { createMessage } from './messages.js';
import { addConnection, removeConnection } from './presence.js';
import { getUserRow, publicUser } from './serialize.js';

let io: Server | null = null;

export function getIO(): Server | null {
  return io;
}

export function emitToUsers(userIds: number[], event: string, payload: unknown): void {
  if (!io) return;
  for (const userId of new Set(userIds)) {
    io.to(`user:${userId}`).emit(event, payload);
  }
}

function broadcastPresence(userId: number, online: boolean): void {
  const row = getUserRow(userId);
  if (!row) return;
  emitToUsers(chatPartnerIds(userId), 'presence', {
    userId,
    online,
    lastSeen: row.last_seen,
  });
}

export function notifyUserUpdated(userId: number): void {
  const row = getUserRow(userId);
  if (!row) return;
  const payload = publicUser(row);
  emitToUsers([userId, ...chatPartnerIds(userId)], 'user:updated', payload);
}

function registerSocket(socket: Socket): void {
  const userId = Number(socket.data.userId);
  socket.join(`user:${userId}`);
  const cameOnline = addConnection(userId);
  if (cameOnline) broadcastPresence(userId, true);

  socket.on('message:send', (payload: any, ack?: (response: any) => void) => {
    try {
      const chatId = Number(payload?.chatId);
      const message = createMessage(chatId, userId, payload?.text, payload?.attachmentIds);
      emitToUsers(chatMemberIds(chatId), 'message:new', message);
      ack?.({ ok: true, message });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось отправить сообщение';
      ack?.({ error: message });
    }
  });

  socket.on('typing', (payload: any) => {
    const chatId = Number(payload?.chatId);
    if (!Number.isInteger(chatId) || !isChatMember(chatId, userId)) return;
    const isTyping = Boolean(payload?.isTyping);
    const row = getUserRow(userId);
    if (!row) return;
    emitToUsers(
      chatMemberIds(chatId).filter((id) => id !== userId),
      'typing',
      {
        chatId,
        userId,
        name: row.name,
        isTyping,
      },
    );
  });

  socket.on('read', (payload: any) => {
    const chatId = Number(payload?.chatId);
    const messageId = Number(payload?.messageId);
    if (!Number.isInteger(chatId) || !Number.isInteger(messageId)) return;
    if (!isChatMember(chatId, userId)) return;
    const lastReadMessageId = markChatRead(chatId, userId, messageId);
    emitToUsers(
      chatMemberIds(chatId).filter((id) => id !== userId),
      'message:read',
      { chatId, userId, messageId: lastReadMessageId },
    );
  });

  socket.on('disconnect', () => {
    const wentOffline = removeConnection(userId);
    if (!wentOffline) return;
    db.prepare('UPDATE users SET last_seen = ? WHERE id = ?').run(Date.now(), userId);
    broadcastPresence(userId, false);
  });
}

export function initRealtime(server: HttpServer): void {
  io = new Server(server, {
    cors: { origin: true, credentials: true },
    maxHttpBufferSize: 1e6,
  });

  io.use((socket, next) => {
    const userId = userIdFromToken(socket.handshake.auth?.token);
    if (!userId || !getUserRow(userId)) {
      next(new Error('unauthorized'));
      return;
    }
    socket.data.userId = userId;
    next();
  });

  io.on('connection', registerSocket);
}
