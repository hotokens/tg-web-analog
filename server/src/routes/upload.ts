import fs from 'node:fs';
import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { db } from '../db.js';
import { serializeAttachment } from '../serialize.js';
import { originalFileName, upload } from '../uploader.js';

const router = Router();

router.post('/', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Файл не получен' });
    return;
  }

  const now = Date.now();
  try {
    const result = db
      .prepare(
        `INSERT INTO attachments (message_id, uploader_id, file_name, mime_type, size, path, created_at)
         VALUES (NULL, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        req.userId!,
        originalFileName(req.file),
        req.file.mimetype || 'application/octet-stream',
        req.file.size,
        req.file.filename,
        now,
      );

    const row = db.prepare('SELECT * FROM attachments WHERE id = ?').get(Number(result.lastInsertRowid));
    res.status(201).json({ attachment: serializeAttachment(row) });
  } catch (error) {
    try {
      fs.unlinkSync(req.file.path);
    } catch {
      /* ignore cleanup errors */
    }
    throw error;
  }
});

export default router;
