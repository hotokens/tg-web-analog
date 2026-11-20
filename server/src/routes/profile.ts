import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import { db } from '../db.js';
import { UPLOADS_DIR } from '../config.js';
import { notifyUserUpdated } from '../realtime.js';
import { getUserRow, publicUser } from '../serialize.js';
import { upload } from '../uploader.js';

const router = Router();

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Укажите имя').max(64, 'Слишком длинное имя').optional(),
  bio: z.string().trim().max(200, 'Слишком длинное описание').optional(),
});

router.patch('/', requireAuth, (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Некорректные данные' });
    return;
  }

  const userId = req.userId!;
  const current = getUserRow(userId);
  if (!current) {
    res.status(404).json({ error: 'Пользователь не найден' });
    return;
  }

  const name = parsed.data.name ?? current.name;
  const bio = parsed.data.bio ?? current.bio;
  db.prepare('UPDATE users SET name = ?, bio = ? WHERE id = ?').run(name, bio, userId);
  notifyUserUpdated(userId);
  res.json({ user: publicUser(getUserRow(userId)) });
});

router.post('/avatar', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Файл не получен' });
    return;
  }

  if (!req.file.mimetype.startsWith('image/')) {
    try {
      fs.unlinkSync(req.file.path);
    } catch {
      /* ignore */
    }
    res.status(400).json({ error: 'Аватар должен быть изображением' });
    return;
  }

  const userId = req.userId!;
  const current = getUserRow(userId);
  if (!current) {
    res.status(404).json({ error: 'Пользователь не найден' });
    return;
  }

  db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(req.file.filename, userId);

  if (current.avatar && current.avatar !== req.file.filename) {
    try {
      fs.unlinkSync(path.join(UPLOADS_DIR, current.avatar));
    } catch {
      /* ignore */
    }
  }

  notifyUserUpdated(userId);
  res.json({ user: publicUser(getUserRow(userId)) });
});

export default router;
