import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import { chatMemberIds, isChatMember, markChatRead } from '../chat-utils.js';
import { db } from '../db.js';
import { emitToUsers } from '../realtime.js';
import { getUserRow, serializeChat, serializeMessage, type ChatDTO } from '../serialize.js';

const router = Router();

router.get('/', requireAuth, (req, res) => {
  const userId = req.userId!;
  const rows = db
    .prepare('SELECT chat_id FROM chat_members WHERE user_id = ?')
    .all(userId) as Array<{ chat_id: number }>;

  const chats = rows
    .map((row) => serializeChat(row.chat_id, userId))
    .filter((chat): chat is ChatDTO => Boolean(chat))
    .sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ?? a.createdAt;
      const bTime = b.lastMessage?.createdAt ?? b.createdAt;
      return bTime - aTime;
    });

  res.json({ chats });
});

const createChatSchema = z.object({ userId: z.number().int().positive() });

router.post('/', requireAuth, (req, res) => {
  const parsed = createChatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Некорректный пользователь' });
    return;
  }

  const me = req.userId!;
  const other = parsed.data.userId;
  if (other === me) {
    res.status(400).json({ error: 'Нельзя начать чат с самим собой' });
    return;
  }
  if (!getUserRow(other)) {
    res.status(404).json({ error: 'Пользователь не найден' });
    return;
  }

  const existing = db
    .prepare(
      `SELECT c.id AS id
         FROM chats c
         JOIN chat_members m1 ON m1.chat_id = c.id AND m1.user_id = ?
         JOIN chat_members m2 ON m2.chat_id = c.id AND m2.user_id = ?
        WHERE c.type = 'private'
          AND (SELECT COUNT(*) FROM chat_members m3 WHERE m3.chat_id = c.id) = 2
        LIMIT 1`,
    )
    .get(me, other) as { id: number } | undefined;

  let chatId: number;
  let created = false;

  if (existing) {
    chatId = existing.id;
  } else {
    const now = Date.now();
    const result = db.prepare('INSERT INTO chats (type, title, created_at) VALUES (?, NULL, ?)').run('private', now);
    chatId = Number(result.lastInsertRowid);
    const insertMember = db.prepare(
      'INSERT INTO chat_members (chat_id, user_id, last_read_message_id, joined_at) VALUES (?, ?, 0, ?)',
    );
    insertMember.run(chatId, me, now);
    insertMember.run(chatId, other, now);
    created = true;
  }

  const myChat = serializeChat(chatId, me);
  if (!myChat) {
    res.status(500).json({ error: 'Не удалось создать чат' });
    return;
  }

  if (created) {
    for (const memberId of chatMemberIds(chatId)) {
      const chat = serializeChat(chatId, memberId);
      if (chat) emitToUsers([memberId], 'chat:new', chat);
    }
  }

  res.status(created ? 201 : 200).json({ chat: myChat });
});

router.get('/:id/messages', requireAuth, (req, res) => {
  const userId = req.userId!;
  const chatId = Number(req.params.id);
  if (!Number.isInteger(chatId) || !isChatMember(chatId, userId)) {
    res.status(404).json({ error: 'Чат не найден' });
    return;
  }

  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const before = Number(req.query.before);

  const rows = (
    Number.isInteger(before) && before > 0
      ? db
          .prepare('SELECT * FROM messages WHERE chat_id = ? AND id < ? ORDER BY id DESC LIMIT ?')
          .all(chatId, before, limit + 1)
      : db
          .prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT ?')
          .all(chatId, limit + 1)
  ) as any[];

  const hasMore = rows.length > limit;
  const page = (hasMore ? rows.slice(0, limit) : rows).reverse();

  res.json({
    messages: page.map((row) => serializeMessage(row, userId)),
    hasMore,
  });
});

const readSchema = z.object({ messageId: z.number().int().nonnegative() });

router.post('/:id/read', requireAuth, (req, res) => {
  const userId = req.userId!;
  const chatId = Number(req.params.id);
  const parsed = readSchema.safeParse(req.body);
  if (!Number.isInteger(chatId) || !isChatMember(chatId, userId) || !parsed.success) {
    res.status(400).json({ error: 'Некорректный запрос' });
    return;
  }

  const lastReadMessageId = markChatRead(chatId, userId, parsed.data.messageId);
  emitToUsers(
    chatMemberIds(chatId).filter((id) => id !== userId),
    'message:read',
    { chatId, userId, messageId: lastReadMessageId },
  );
  res.json({ lastReadMessageId });
});

export default router;
