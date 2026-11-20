import { db } from './db.js';

export function isChatMember(chatId: number, userId: number): boolean {
  return Boolean(db.prepare('SELECT 1 AS ok FROM chat_members WHERE chat_id = ? AND user_id = ?').get(chatId, userId));
}

export function chatMemberIds(chatId: number): number[] {
  const rows = db.prepare('SELECT user_id FROM chat_members WHERE chat_id = ?').all(chatId) as Array<{ user_id: number }>;
  return rows.map((row) => row.user_id);
}

export function chatPartnerIds(userId: number): number[] {
  const rows = db
    .prepare(
      `SELECT DISTINCT other.user_id AS user_id
         FROM chat_members mine
         JOIN chat_members other ON other.chat_id = mine.chat_id
        WHERE mine.user_id = ? AND other.user_id <> ?`,
    )
    .all(userId, userId) as Array<{ user_id: number }>;
  return rows.map((row) => row.user_id);
}

export function lastReadFor(chatId: number, userId: number): number {
  const row = db
    .prepare('SELECT last_read_message_id FROM chat_members WHERE chat_id = ? AND user_id = ?')
    .get(chatId, userId) as { last_read_message_id: number } | undefined;
  return row?.last_read_message_id ?? 0;
}

export function markChatRead(chatId: number, userId: number, messageId: number): number {
  const maxRow = db.prepare('SELECT MAX(id) AS maxId FROM messages WHERE chat_id = ?').get(chatId) as {
    maxId: number | null;
  };
  const target = Math.min(messageId, maxRow.maxId ?? 0);
  const current = lastReadFor(chatId, userId);
  const next = Math.max(current, target);
  if (next > current) {
    db.prepare('UPDATE chat_members SET last_read_message_id = ? WHERE chat_id = ? AND user_id = ?').run(
      next,
      chatId,
      userId,
    );
  }
  return next;
}
