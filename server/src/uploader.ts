import crypto from 'node:crypto';
import path from 'node:path';
import multer from 'multer';
import { MAX_UPLOAD_SIZE, UPLOADS_DIR } from './config.js';

/** Busboy decodes UTF-8 filenames as latin1 — repair the mojibake when possible. */
function decodeName(raw: string): string {
  if (!/[\u0080-\u00ff]/.test(raw)) return raw;
  const repaired = Buffer.from(raw, 'latin1').toString('utf8');
  return repaired.includes('\uFFFD') ? raw : repaired;
}

export function originalFileName(file: Express.Multer.File): string {
  return decodeName(file.originalname).slice(0, 180) || 'file';
}

export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, UPLOADS_DIR),
    filename: (_req, file, callback) => {
      const ext = path
        .extname(decodeName(file.originalname))
        .slice(0, 12)
        .replace(/[^a-zA-Z0-9.]/g, '');
      const name = `${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}${ext.toLowerCase()}`;
      callback(null, name);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_SIZE, files: 1 },
});
