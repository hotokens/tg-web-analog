import { isChatMember } from './chat-utils.js';
import { db } from './db.js';
import { serializeReactions, type ReactionDTO } from './serialize.js';

export const REACTION_EMOJIS = ['👍', '❤️', '🔥', '😂', '😮', '😢', '🙏', '🎉'] as const;

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export interface ToggleReactionResult {
  chatId: number;
  messageId: number;
  reactions: ReactionDTO[];
}

export function toggleReaction(messageId: number, userId: number, rawEmoji: unknown): ToggleReactionResult {
  const message = db.prepare('SELECT id, chat_id FROM messages WHERE id = ?').get(messageId) as
    | { id: number; chat_id: number }
    | undefined;

  if (!message) {
    throw new Error('Сообщение не найдено');
  }
  if (!isChatMember(message.chat_id, userId)) {
    throw new Error('Чат не найден');
  }
  if (typeof rawEmoji !== 'string' || !REACTION_EMOJIS.includes(rawEmoji as ReactionEmoji)) {
    throw new Error('Недопустимая реакция');
  }

  const emoji = rawEmoji;
  const existing = db
    .prepare('SELECT 1 AS ok FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?')
    .get(messageId, userId, emoji);

  if (existing) {
    db.prepare('DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?').run(
      messageId,
      userId,
      emoji,
    );
  } else {
    db.prepare(
      'INSERT INTO message_reactions (message_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?)',
    ).run(messageId, userId, emoji, Date.now());
  }

  return {
    chatId: message.chat_id,
    messageId,
    reactions: serializeReactions(messageId, userId),
  };
}
