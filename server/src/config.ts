import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const SERVER_ROOT = path.resolve(here, '..');
export const PROJECT_ROOT = path.resolve(SERVER_ROOT, '..');
export const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(SERVER_ROOT, 'data');
export const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(SERVER_ROOT, 'uploads');
export const DB_PATH = path.join(DATA_DIR, 'app.db');
export const CLIENT_DIST = path.join(PROJECT_ROOT, 'client', 'dist');

export const PORT = Number(process.env.PORT || 3001);
export const JWT_SECRET = process.env.JWT_SECRET || 'tg-web-local-dev-secret';
export const TOKEN_TTL = '30d';
export const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;
