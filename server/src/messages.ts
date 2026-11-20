import { db } from './db.js';
import { isChatMember, lastReadFor } from './chat-utils.js';
import { serializeMessage, type MessageDTO } from './serialize.js';

const MAX_TEXT_LENGTH = 4096;
const MAX_ATTACHMENTS = 10;

export function createMessage(
  chatId: number,
  senderId: number,
  rawText: unknown,
  rawAttachmentIds: unknown,
): MessageDTO {
  if (!Number.isInteger(chatId) || !isChatMember(chatId, senderId)) {
    throw new Error('Чат не найден');
  }

  const text = String(rawText ?? '').slice(0, MAX_TEXT_LENGTH).trim();
  const attachmentIds = Array.isArray(rawAttachmentIds)
    ? [...new Set(rawAttachmentIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))].slice(
        0,
        MAX_ATTACHMENTS,
      )
    : [];

  if (!text && attachmentIds.length === 0) {
    throw new Error('Сообщение не может быть пустым');
  }

  if (attachmentIds.length > 0) {
    const placeholders = attachmentIds.map(() => '?').join(', ');
    const rows = db
      .prepare(
        `SELECT id FROM attachments
          WHERE id IN (${placeholders}) AND uploader_id = ? AND message_id IS NULL`,
      )
      .all(...attachmentIds, senderId) as Array<{ id: number }>;
    if (rows.length !== attachmentIds.length) {
      throw new Error('Не удалось прикрепить файл');
    }
  }

  const now = Date.now();
  db.exec('BEGIN');
  let messageId = 0;
  try {
    const result = db
      .prepare('INSERT INTO messages (chat_id, sender_id, text, reply_to_id, created_at, edited_at) VALUES (?, ?, ?, NULL, ?, NULL)')
      .run(chatId, senderId, text, now);
    messageId = Number(result.lastInsertRowid);

    const attach = db.prepare(
      'UPDATE attachments SET message_id = ? WHERE id = ? AND uploader_id = ? AND message_id IS NULL',
    );
    for (const attachmentId of attachmentIds) {
      attach.run(messageId, attachmentId, senderId);
    }

    const read = lastReadFor(chatId, senderId);
    if (read < messageId) {
      db.prepare(
        'UPDATE chat_members SET last_read_message_id = ? WHERE chat_id = ? AND user_id = ?',
      ).run(messageId, chatId, senderId);
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId) as any;
  return serializeMessage(row);
}
