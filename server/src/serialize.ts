import { db } from './db.js';
import { isOnline } from './presence.js';

export interface PublicUser {
  id: number;
  username: string;
  name: string;
  bio: string;
  phone: string | null;
  avatar: string | null;
  online: boolean;
  lastSeen: number;
}

export interface AttachmentDTO {
  id: number;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  isImage: boolean;
}

export interface ReactionDTO {
  emoji: string;
  count: number;
  me: boolean;
}

export interface MessageDTO {
  id: number;
  chatId: number;
  senderId: number;
  text: string;
  createdAt: number;
  editedAt: number | null;
  replyToId: number | null;
  attachments: AttachmentDTO[];
  reactions: ReactionDTO[];
}

export interface LastMessageDTO {
  id: number;
  text: string;
  senderId: number;
  createdAt: number;
  hasAttachments: boolean;
  attachmentType: 'image' | 'file' | null;
}

export interface ChatDTO {
  id: number;
  type: string;
  peer: PublicUser;
  lastMessage: LastMessageDTO | null;
  unreadCount: number;
  peerLastReadMessageId: number;
  createdAt: number;
}

export function getUserRow(userId: number): any {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
}

export function publicUser(row: any, online: boolean = isOnline(row.id)): PublicUser {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    bio: row.bio ?? '',
    phone: row.phone ?? null,
    avatar: row.avatar ? `/uploads/${row.avatar}` : null,
    online,
    lastSeen: row.last_seen ?? 0,
  };
}

export function serializeAttachment(row: any): AttachmentDTO {
  return {
    id: row.id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    size: row.size,
    url: `/uploads/${row.path}`,
    isImage: String(row.mime_type).startsWith('image/'),
  };
}

export function serializeReactions(messageId: number, viewerId: number | null): ReactionDTO[] {
  const rows = db
    .prepare(
      `SELECT emoji,
              COUNT(*) AS count,
              MAX(CASE WHEN user_id = ? THEN 1 ELSE 0 END) AS me
         FROM message_reactions
        WHERE message_id = ?
        GROUP BY emoji
        ORDER BY MIN(created_at) ASC`,
    )
    .all(viewerId ?? 0, messageId) as Array<{ emoji: string; count: number; me: number }>;

  return rows.map((row) => ({
    emoji: row.emoji,
    count: Number(row.count),
    me: Boolean(row.me),
  }));
}

export function serializeMessage(row: any, viewerId?: number): MessageDTO {
  const attachments = db
    .prepare('SELECT * FROM attachments WHERE message_id = ? ORDER BY id ASC')
    .all(row.id)
    .map(serializeAttachment);
  return {
    id: row.id,
    chatId: row.chat_id,
    senderId: row.sender_id,
    text: row.text ?? '',
    createdAt: row.created_at,
    editedAt: row.edited_at ?? null,
    replyToId: row.reply_to_id ?? null,
    attachments,
    reactions: serializeReactions(row.id, viewerId ?? null),
  };
}

export function serializeChat(chatId: number, viewerId: number): ChatDTO | null {
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId) as any;
  if (!chat) return null;

  const members = db
    .prepare('SELECT user_id, last_read_message_id FROM chat_members WHERE chat_id = ?')
    .all(chatId) as Array<{ user_id: number; last_read_message_id: number }>;

  const viewerMember = members.find((member) => member.user_id === viewerId);
  if (!viewerMember) return null;

  const peerMember = members.find((member) => member.user_id !== viewerId);
  const peerRow = peerMember ? getUserRow(peerMember.user_id) : null;
  if (!peerRow) return null;

  const last = db.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT 1').get(chatId) as any;
  const attachmentRows = last
    ? (db.prepare('SELECT * FROM attachments WHERE message_id = ?').all(last.id) as any[])
    : [];
  const unreadRow = db
    .prepare(
      'SELECT COUNT(*) AS count FROM messages WHERE chat_id = ? AND sender_id <> ? AND id > ?',
    )
    .get(chatId, viewerId, viewerMember.last_read_message_id) as { count: number };

  const firstAttachment = attachmentRows[0];
  const lastMessage: LastMessageDTO | null = last
    ? {
        id: last.id,
        text: last.text ?? '',
        senderId: last.sender_id,
        createdAt: last.created_at,
        hasAttachments: attachmentRows.length > 0,
        attachmentType: firstAttachment
          ? String(firstAttachment.mime_type).startsWith('image/')
            ? 'image'
            : 'file'
          : null,
      }
    : null;

  return {
    id: chat.id,
    type: chat.type,
    peer: publicUser(peerRow),
    lastMessage,
    unreadCount: unreadRow.count,
    peerLastReadMessageId: peerMember?.last_read_message_id ?? 0,
    createdAt: chat.created_at,
  };
}
