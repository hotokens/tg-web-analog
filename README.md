# Telegram Web — демо-мессенджер

[![CI](https://github.com/hotokens/tg-web-analog/actions/workflows/ci.yml/badge.svg)](https://github.com/hotokens/tg-web-analog/actions/workflows/ci.yml)

Аналог Telegram Web: личные чаты в реальном времени, медиа и файлы, профиль и настройки.
React + TypeScript + Vite на клиенте, Express + Socket.IO + SQLite на сервере.

Репозиторий: [github.com/hotokens/tg-web-analog](https://github.com/hotokens/tg-web-analog)

## Быстрый старт

```bash
git clone git@github.com:hotokens/tg-web-analog.git
cd tg-web-analog
npm install
npm run dev
```

Если SSH не настроен, используйте HTTPS:

```bash
git clone https://github.com/hotokens/tg-web-analog.git
```

- Клиент: http://localhost:5173
- API: http://localhost:3001

Демо-аккаунты (пароль `123456`):

| Логин | Имя |
| --- | --- |
| `alice` | Алиса Морозова |
| `bob` | Борис Лебедев |
| `carol` | Карина Соколова |
| `dave` | Денис Волков |
| `maria` | Мария Кузнецова |
| `igor` | Игорь Белов |

Чтобы увидеть real-time: откройте второе окно в режиме инкогнито, войдите под другим аккаунтом и напишите сообщение.
Индикатор «печатает…», статусы онлайн и галочки прочтения работают между окнами.

## Возможности

- Личные чаты с доставкой сообщений через Socket.IO
- История сообщений с подгрузкой при прокрутке вверх
- Индикатор набора текста, статусы «в сети» / «был(а) недавно», прочтение (одна/две галочки)
- Непрочитанные сообщения и счётчики в списке чатов, счётчик в заголовке вкладки
- Отправка изображений и файлов: кнопка, drag & drop, вставка из буфера
- Превью изображений, полноэкранный просмотр, скачивание файлов
- Поиск по чатам, поиск людей и создание новых диалогов
- Профиль: имя, описание, аватар; светлая и тёмная темы
- Адаптивная вёрстка: на мобильных список и чат — отдельные экраны
- Демо-данные: 6 пользователей, 4 диалога, история и пример изображения

## Скриншоты

| Переписка · светлая тема | Переписка · тёмная тема |
| --- | --- |
| ![Переписка, светлая тема](docs/screenshots/chat-light.png) | ![Переписка, тёмная тема](docs/screenshots/chat-dark.png) |

| Список чатов | Мобильный вид |
| --- | --- |
| ![Список чатов](docs/screenshots/chats.png) | ![Мобильный вид](docs/screenshots/mobile.png) |

## Скрипты

```bash
npm run dev          # клиент + сервер одновременно
npm run dev:client   # только Vite (:5173)
npm run dev:server   # только API (:3001)
npm run build        # production-сборка клиента
npm start            # сервер + собранный клиент на :3001
npm run typecheck    # проверка типов клиента и сервера
```

Production-режим:

```bash
npm run build
npm start
# http://localhost:3001
```

## Структура

```
client/                  React + Vite
  src/
    api.ts               REST-клиент
    socket.ts            Socket.IO-клиент
    store.ts             Zustand: сессия, чаты, сообщения, темы
    components/          UI (сайдбар, чат, composer, модалки)
    styles.css           токены тем и все стили
server/                  Express + Socket.IO
  src/
    db.ts                схема SQLite и демо-сиды
    realtime.ts          сокеты: сообщения, typing, presence, прочтение
    routes/              auth, users, chats, upload, profile
    uploads/             загруженные файлы (создаётся автоматически)
    data/app.db          база SQLite (создаётся автоматически)
docs/screenshots/        скриншоты для README
.github/workflows/       CI: typecheck и сборка клиента
```

## API

| Метод | Путь | Описание |
| --- | --- | --- |
| POST | `/api/auth/login` | Вход по username и паролю |
| GET | `/api/auth/me` | Текущий пользователь |
| GET | `/api/users?search=` | Поиск пользователей |
| GET | `/api/chats` | Список диалогов |
| POST | `/api/chats` | Создать/получить личный диалог |
| GET | `/api/chats/:id/messages?before=` | История сообщений |
| POST | `/api/chats/:id/read` | Отметить прочитанным |
| POST | `/api/upload` | Загрузить файл (до 25 МБ) |
| PATCH | `/api/profile` | Имя и описание |
| POST | `/api/profile/avatar` | Аватар |

События сокета: `message:send`, `message:new`, `read`, `message:read`, `typing`, `presence`,
`user:updated`, `chat:new`.

## Сброс демо-данных

Остановите сервер и удалите базу:

```bash
rm -rf server/data server/uploads
npm run dev
```

При следующем запуске база и демо-переписка создадутся заново.

## Требования

Node.js 22.5+ (используется встроенный модуль `node:sqlite`).

## Переменные окружения

| Переменная | По умолчанию | Назначение |
| --- | --- | --- |
| `PORT` | `3001` | Порт API и production-клиента |
| `JWT_SECRET` | локальный dev-секрет | Подпись JWT; задайте свой в production |
| `DATA_DIR` | `server/data` | Каталог с базой SQLite |
| `UPLOADS_DIR` | `server/uploads` | Каталог загруженных файлов |

Пример запуска с отдельными каталогами:

```bash
PORT=8080 JWT_SECRET="change-me" \
  DATA_DIR=/var/lib/tg-web \
  UPLOADS_DIR=/var/lib/tg-web/uploads \
  npm start
```
