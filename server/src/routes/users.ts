import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { db } from '../db.js';
import { publicUser } from '../serialize.js';

const router = Router();

router.get('/', requireAuth, (req, res) => {
  const query = String(req.query.search ?? '').trim();
  const like = `%${query}%`;
  const rows = db
    .prepare(
      `SELECT * FROM users
        WHERE id <> ? AND (name LIKE ? OR username LIKE ?)
        ORDER BY name COLLATE NOCASE ASC
        LIMIT 30`,
    )
    .all(req.userId!, like, like) as any[];
  res.json({ users: rows.map((row) => publicUser(row)) });
});

export default router;
