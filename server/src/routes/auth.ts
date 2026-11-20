import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { requireAuth, signToken } from '../auth.js';
import { db } from '../db.js';
import { getUserRow, publicUser } from '../serialize.js';

const router = Router();

const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(128),
});

router.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Введите логин и пароль' });
    return;
  }

  const row = db
    .prepare('SELECT * FROM users WHERE lower(username) = lower(?)')
    .get(parsed.data.username) as any;

  if (!row || !bcrypt.compareSync(parsed.data.password, row.password_hash)) {
    res.status(401).json({ error: 'Неверный логин или пароль' });
    return;
  }

  res.json({ token: signToken(row.id), user: publicUser(row) });
});

router.get('/me', requireAuth, (req, res) => {
  const row = getUserRow(req.userId!);
  if (!row) {
    res.status(401).json({ error: 'Пользователь не найден' });
    return;
  }
  res.json({ user: publicUser(row) });
});

export default router;
