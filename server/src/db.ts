import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { DatabaseSync } from 'node:sqlite';
import { DATA_DIR, DB_PATH, UPLOADS_DIR } from './config.js';

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    phone         TEXT,
    name          TEXT    NOT NULL,
    bio           TEXT    NOT NULL DEFAULT '',
    avatar        TEXT,
    password_hash TEXT    NOT NULL,
    last_seen     INTEGER NOT NULL DEFAULT 0,
    created_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chats (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    type       TEXT    NOT NULL DEFAULT 'private',
    title      TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chat_members (
    chat_id              INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_message_id INTEGER NOT NULL DEFAULT 0,
    joined_at            INTEGER NOT NULL,
    PRIMARY KEY (chat_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id     INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text        TEXT    NOT NULL DEFAULT '',
    reply_to_id INTEGER,
    created_at  INTEGER NOT NULL,
    edited_at   INTEGER
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id  INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    uploader_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name   TEXT    NOT NULL,
    mime_type   TEXT    NOT NULL,
    size        INTEGER NOT NULL,
    path        TEXT    NOT NULL,
    created_at  INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id, id);
  CREATE INDEX IF NOT EXISTS idx_members_user ON chat_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_attachments_message ON attachments(message_id);
`);

const MINUTE = 60_000;
const DAY_MINUTES = 24 * 60;

const SEED_IMAGE = 'seed-chat-mockup.svg';

function writeSeedImage(): void {
  const file = path.join(UPLOADS_DIR, SEED_IMAGE);
  if (fs.existsSync(file)) return;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="880" height="560" viewBox="0 0 880 560">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2aabee"/>
      <stop offset="1" stop-color="#229ed9"/>
    </linearGradient>
    <linearGradient id="bubble" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#f1f7fb"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#0b3d5c" flood-opacity="0.25"/>
    </filter>
  </defs>
  <rect width="880" height="560" rx="28" fill="url(#bg)"/>
  <circle cx="770" cy="90" r="110" fill="#ffffff" opacity="0.08"/>
  <circle cx="110" cy="500" r="150" fill="#ffffff" opacity="0.07"/>
  <g filter="url(#shadow)">
    <rect x="90" y="80" width="700" height="410" rx="22" fill="#ffffff"/>
    <rect x="90" y="80" width="230" height="410" rx="22" fill="#f4f8fb"/>
    <rect x="90" y="80" width="30" height="410" fill="#f4f8fb"/>
    <rect x="116" y="112" width="150" height="12" rx="6" fill="#d5e3ee"/>
    <g fill="#e4eef6">
      <rect x="110" y="150" width="190" height="52" rx="12"/>
      <rect x="110" y="214" width="190" height="52" rx="12"/>
      <rect x="110" y="278" width="190" height="52" rx="12"/>
    </g>
    <rect x="110" y="150" width="190" height="52" rx="12" fill="#dceefb"/>
    <circle cx="136" cy="176" r="13" fill="#8ec9ec"/>
    <rect x="158" y="166" width="90" height="8" rx="4" fill="#b7d8ec"/>
    <rect x="158" y="181" width="120" height="7" rx="3.5" fill="#cfe3f0"/>
    <g>
      <rect x="360" y="130" width="300" height="52" rx="16" fill="#ffffff" stroke="#e3edf5"/>
      <rect x="380" y="148" width="180" height="8" rx="4" fill="#dbe7f0"/>
      <rect x="380" y="162" width="120" height="7" rx="3.5" fill="#e8f1f7"/>
    </g>
    <g>
      <rect x="440" y="198" width="300" height="70" rx="16" fill="#eeffde"/>
      <rect x="460" y="216" width="210" height="8" rx="4" fill="#b7d9a1"/>
      <rect x="460" y="232" width="160" height="7" rx="3.5" fill="#cde7bb"/>
      <circle cx="710" cy="250" r="7" fill="#6ec26e"/>
    </g>
    <g>
      <rect x="360" y="284" width="300" height="52" rx="16" fill="#ffffff" stroke="#e3edf5"/>
      <rect x="380" y="302" width="200" height="8" rx="4" fill="#dbe7f0"/>
      <rect x="380" y="316" width="140" height="7" rx="3.5" fill="#e8f1f7"/>
    </g>
    <g>
      <rect x="440" y="352" width="300" height="70" rx="16" fill="#eeffde"/>
      <rect x="460" y="370" width="230" height="8" rx="4" fill="#b7d9a1"/>
      <rect x="460" y="386" width="170" height="7" rx="3.5" fill="#cde7bb"/>
      <circle cx="710" cy="404" r="7" fill="#6ec26e"/>
    </g>
    <rect x="360" y="440" width="380" height="34" rx="17" fill="#f1f6fa"/>
    <rect x="378" y="454" width="150" height="7" rx="3.5" fill="#d9e6ef"/>
    <circle cx="712" cy="457" r="12" fill="#3390ec"/>
  </g>
</svg>`;
  fs.writeFileSync(file, svg);
}

function seed(): void {
  writeSeedImage();

  const now = Date.now();
  const passwordHash = bcrypt.hashSync('123456', 10);
  const insertUser = db.prepare(
    `INSERT INTO users (username, phone, name, bio, avatar, password_hash, last_seen, created_at)
     VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`,
  );

  const u: Record<string, number> = {};
  const addUser = (username: string, name: string, phone: string, bio: string, lastSeenMinutesAgo: number) => {
    const result = insertUser.run(username, phone, name, bio, passwordHash, now - lastSeenMinutesAgo * MINUTE, now);
    u[username] = Number(result.lastInsertRowid);
    return u[username];
  };

  addUser('alice', 'Алиса Морозова', '+7 999 123-45-67', 'Дизайнер интерфейсов ✨ Люблю чистые макеты и крепкий кофе', 3);
  addUser('bob', 'Борис Лебедев', '+7 999 765-43-21', 'Фронтенд-разработчик. React, TypeScript, немного магии', 12);
  addUser('carol', 'Карина Соколова', '+7 999 555-12-34', 'Продакт-менеджер. Делаю продукты понятными', 47);
  addUser('dave', 'Денис Волков', '+7 999 444-88-22', 'Люблю вёрстку и велосипеды 🚲', 130);
  addUser('maria', 'Мария Кузнецова', '+7 999 222-33-44', 'QA-инженер. Ломаю то, что вы только что собрали', 1500);
  addUser('igor', 'Игорь Белов', '+7 999 888-77-66', 'Бэкенд, Node.js, базы данных', 320);

  const insertChat = db.prepare('INSERT INTO chats (type, title, created_at) VALUES (?, ?, ?)');
  const insertMember = db.prepare(
    'INSERT INTO chat_members (chat_id, user_id, last_read_message_id, joined_at) VALUES (?, ?, 0, ?)',
  );
  const insertMessage = db.prepare(
    'INSERT INTO messages (chat_id, sender_id, text, reply_to_id, created_at, edited_at) VALUES (?, ?, ?, NULL, ?, NULL)',
  );
  const insertAttachment = db.prepare(
    `INSERT INTO attachments (message_id, uploader_id, file_name, mime_type, size, path, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  const addChat = (members: number[], createdMinutesAgo: number): number => {
    const result = insertChat.run('private', null, now - createdMinutesAgo * MINUTE);
    const chatId = Number(result.lastInsertRowid);
    for (const member of members) insertMember.run(chatId, member, now - createdMinutesAgo * MINUTE);
    return chatId;
  };

  const addMessage = (chatId: number, senderId: number, text: string, minutesAgo: number): number => {
    const result = insertMessage.run(chatId, senderId, text, now - minutesAgo * MINUTE);
    return Number(result.lastInsertRowid);
  };

  // Alice & Bob
  const bobChat = addChat([u.alice, u.bob], 3 * DAY_MINUTES);
  addMessage(bobChat, u.bob, 'Привет! Ты уже видела новый дизайн Telegram Web?', 3 * DAY_MINUTES);
  addMessage(bobChat, u.alice, 'Привет! Да, вчера зашла — выглядит очень чисто', 3 * DAY_MINUTES - 2);
  addMessage(bobChat, u.alice, 'Особенно нравится, что темы переключаются без перезагрузки', 3 * DAY_MINUTES - 3);
  addMessage(bobChat, u.bob, 'Ага. И анимации стали плавнее', 3 * DAY_MINUTES - 9);
  addMessage(bobChat, u.bob, 'Кстати, скинь, пожалуйста, макет, который мы обсуждали', 3 * DAY_MINUTES - 11);
  addMessage(bobChat, u.alice, 'Секунду, найду в файлах', 3 * DAY_MINUTES - 14);
  const mockupMessage = addMessage(bobChat, u.alice, 'Вот, держи 👇', 3 * DAY_MINUTES - 16);
  const seedFile = path.join(UPLOADS_DIR, SEED_IMAGE);
  insertAttachment.run(
    mockupMessage,
    u.alice,
    'telegram-web-mockup.svg',
    'image/svg+xml',
    fs.statSync(seedFile).size,
    SEED_IMAGE,
    now - (3 * DAY_MINUTES - 16) * MINUTE,
  );
  addMessage(bobChat, u.bob, 'Спасибо! Выглядит супер 🔥', 3 * DAY_MINUTES - 21);
  addMessage(bobChat, u.alice, 'Ещё добавила тёмную тему в настройках', 3 * DAY_MINUTES - 22);
  addMessage(bobChat, u.bob, 'Проверил, всё работает', 25 * 60);
  addMessage(bobChat, u.bob, 'Кстати, го завтра обсудим группы и каналы?', 120);
  addMessage(bobChat, u.bob, 'Я набросал план, покажу после обеда', 45);

  // Alice & Carol
  const carolChat = addChat([u.alice, u.carol], 300);
  addMessage(carolChat, u.carol, 'Алиса, привет! Ты свободна сегодня вечером?', 300);
  addMessage(carolChat, u.alice, 'Привет! Да, после семи', 295);
  addMessage(carolChat, u.carol, 'Отлично, тогда созвонимся', 294);
  addMessage(carolChat, u.carol, 'И захвати, пожалуйста, тот список задач', 240);

  // Alice & Dave
  const daveChat = addChat([u.alice, u.dave], 2 * DAY_MINUTES);
  addMessage(daveChat, u.dave, 'Привет! Спасибо за помощь с вёрсткой 🙌', 2 * DAY_MINUTES);
  addMessage(daveChat, u.alice, 'Всегда пожалуйста! Получилось отлично', 2 * DAY_MINUTES - 2);
  addMessage(daveChat, u.dave, 'Если что, обращайся', 2 * DAY_MINUTES - 3);

  // Bob & Carol
  const bobCarolChat = addChat([u.bob, u.carol], 30);
  addMessage(bobCarolChat, u.carol, 'Борис, привет! Макет готов?', 30);
  addMessage(bobCarolChat, u.bob, 'Почти, доделаю к вечеру', 25);

  const setRead = (chatId: number, userId: number, offsetFromEnd: number) => {
    const maxRow = db.prepare('SELECT MAX(id) AS maxId FROM messages WHERE chat_id = ?').get(chatId) as {
      maxId: number | null;
    };
    const target = Math.max(0, (maxRow.maxId ?? 0) - offsetFromEnd);
    db.prepare('UPDATE chat_members SET last_read_message_id = ? WHERE chat_id = ? AND user_id = ?').run(
      target,
      chatId,
      userId,
    );
  };

  setRead(bobChat, u.alice, 2);
  setRead(bobChat, u.bob, 0);
  setRead(carolChat, u.alice, 1);
  setRead(carolChat, u.carol, 0);
  setRead(daveChat, u.alice, 0);
  setRead(daveChat, u.dave, 0);
  setRead(bobCarolChat, u.bob, 0);
  setRead(bobCarolChat, u.carol, 1);
}

const row = db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number };
if (row.count === 0) {
  seed();
  console.log('🌱 Демо-данные созданы (alice / bob / carol / dave, пароль 123456)');
}
