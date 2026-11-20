import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import { CLIENT_DIST, MAX_UPLOAD_SIZE, PORT, UPLOADS_DIR } from './config.js';
import './db.js';
import { initRealtime } from './realtime.js';
import authRouter from './routes/auth.js';
import chatsRouter from './routes/chats.js';
import profileRouter from './routes/profile.js';
import uploadRouter from './routes/upload.js';
import usersRouter from './routes/users.js';

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: Date.now() });
});
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/chats', chatsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/profile', profileRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Не найдено' });
});

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: `Файл больше ${Math.round(MAX_UPLOAD_SIZE / 1024 / 1024)} МБ` });
      return;
    }
    res.status(400).json({ error: 'Не удалось загрузить файл' });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

const server = http.createServer(app);
initRealtime(server);

server.listen(PORT, () => {
  console.log(`\n  ✈  Telegram Web API: http://localhost:${PORT}`);
  console.log(`     Демо-вход: alice / 123456\n`);
});
