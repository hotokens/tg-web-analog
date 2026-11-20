import { useCallback, useEffect, useLayoutEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { api } from '../api';
import { useStore } from '../store';
import type { Attachment, Message } from '../types';
import { formatDateLabel, formatLastSeen, isSameDay } from '../utils';
import { Avatar, TelegramLogo } from './Avatar';
import { Composer } from './Composer';
import { ArrowDownIcon, BackIcon } from './Icons';
import { Lightbox } from './Lightbox';
import { MessageBubble } from './MessageBubble';

const GROUP_WINDOW = 5 * 60 * 1000;

export function ChatWindow() {
  const user = useStore((state) => state.user);
  const chats = useStore((state) => state.chats);
  const activeChatId = useStore((state) => state.activeChatId);
  const messagesByChat = useStore((state) => state.messages);
  const hasMoreByChat = useStore((state) => state.hasMore);
  const loadingByChat = useStore((state) => state.loadingMessages);
  const typing = useStore((state) => state.typing);
  const closeChat = useStore((state) => state.closeChat);
  const loadMore = useStore((state) => state.loadMore);
  const sendMessage = useStore((state) => state.sendMessage);
  const showToast = useStore((state) => state.showToast);

  const [pending, setPending] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState<Attachment | null>(null);
  const [showJump, setShowJump] = useState(false);

  const chat = activeChatId ? chats.find((item) => item.id === activeChatId) ?? null : null;
  const messages = activeChatId ? messagesByChat[activeChatId] ?? [] : [];
  const typingState = activeChatId ? typing[activeChatId] : null;
  const loading = activeChatId ? Boolean(loadingByChat[activeChatId]) : false;
  const hasMore = activeChatId ? hasMoreByChat[activeChatId] !== false : false;

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragDepth = useRef(0);
  const atBottomRef = useRef(true);
  const paginationRef = useRef<{ height: number; top: number } | null>(null);
  const prevInfoRef = useRef<{ chatId: number | null; count: number; lastId: number }>({
    chatId: null,
    count: 0,
    lastId: 0,
  });

  const uploadFiles = useCallback(
    async (files: File[] | FileList) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      for (const file of list) {
        if (file.size > 25 * 1024 * 1024) {
          showToast(`Файл «${file.name}» больше 25 МБ`, 'error');
          continue;
        }
        setUploading((count) => count + 1);
        try {
          const attachment = await api.upload(file);
          setPending((current) => (current.length >= 10 ? current : [...current, attachment]));
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Не удалось загрузить файл', 'error');
        } finally {
          setUploading((count) => Math.max(0, count - 1));
        }
      }
    },
    [showToast],
  );

  useEffect(() => {
    setPending([]);
    setLightbox(null);
    atBottomRef.current = true;
    setShowJump(false);
  }, [activeChatId]);

  const handleSend = useCallback(
    async (text: string) => {
      const ok = await sendMessage(text, pending);
      if (ok) setPending([]);
      return ok;
    },
    [pending, sendMessage],
  );

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element || !activeChatId) return;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    atBottomRef.current = distance < 140;
    setShowJump(distance > 400);

    if (element.scrollTop < 90 && hasMore && !loading) {
      paginationRef.current = { height: element.scrollHeight, top: element.scrollTop };
      void loadMore(activeChatId);
    }
  };

  const scrollToBottom = (smooth = true) => {
    const element = scrollRef.current;
    if (!element) return;
    if (smooth) element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
    else element.scrollTop = element.scrollHeight;
    atBottomRef.current = true;
    setShowJump(false);
  };

  useEffect(() => {
    if (typingState && atBottomRef.current) scrollToBottom(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(typingState), activeChatId]);

  useEffect(() => {
    if ((pending.length > 0 || uploading > 0) && atBottomRef.current) {
      window.requestAnimationFrame(() => scrollToBottom(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending.length, uploading]);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element || !activeChatId) return;
    const previous = prevInfoRef.current;
    const last = messages[messages.length - 1];

    if (previous.chatId !== activeChatId) {
      scrollToBottom(false);
    } else if (paginationRef.current) {
      element.scrollTop = element.scrollHeight - paginationRef.current.height + paginationRef.current.top;
      paginationRef.current = null;
    } else if (messages.length > previous.count && last && last.id !== previous.lastId) {
      if (previous.count === 0) {
        scrollToBottom(false);
        window.requestAnimationFrame(() => scrollToBottom(false));
      } else if (atBottomRef.current || last.senderId === user?.id) {
        scrollToBottom(true);
      }
    }

    prevInfoRef.current = {
      chatId: activeChatId,
      count: messages.length,
      lastId: last?.id ?? 0,
    };
  }, [messages, activeChatId, user?.id]);

  const onDragEnter = (event: DragEvent) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  };
  const onDragOver = (event: DragEvent) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
  };
  const onDragLeave = (event: DragEvent) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (event.dataTransfer.files.length > 0) void uploadFiles(event.dataTransfer.files);
  };

  if (!activeChatId || !chat || !user) {
    return (
      <section className="chat-pane chat-empty-pane">
        <div className="empty-chat">
          <div className="empty-logo">
            <TelegramLogo size={112} plain />
          </div>
          <h2>Выберите чат</h2>
          <p>Откройте переписку слева или начните новый диалог.</p>
          <div className="empty-tip">
            <span>Демо:</span> откройте второе окно в режиме инкогнито и войдите под другим аккаунтом — сообщения
            приходят в реальном времени.
          </div>
        </div>
      </section>
    );
  }

  const rows: ReactNode[] = [];
  messages.forEach((message: Message, index: number) => {
    const previous = messages[index - 1];
    const next = messages[index + 1];
    const newDay = !previous || !isSameDay(previous.createdAt, message.createdAt);
    const samePrevious =
      !newDay &&
      previous &&
      previous.senderId === message.senderId &&
      message.createdAt - previous.createdAt < GROUP_WINDOW;
    const sameNext =
      next &&
      next.senderId === message.senderId &&
      next.createdAt - message.createdAt < GROUP_WINDOW &&
      isSameDay(next.createdAt, message.createdAt);

    if (newDay) {
      rows.push(
        <div className="date-sep" key={`date-${message.id}`}>
          <span>{formatDateLabel(message.createdAt)}</span>
        </div>,
      );
    }

    rows.push(
      <MessageBubble
        key={message.id}
        message={message}
        own={message.senderId === user.id}
        peer={chat.peer}
        read={chat.peerLastReadMessageId >= message.id}
        showAvatar={!sameNext}
        stackedTop={Boolean(samePrevious)}
        stackedBottom={Boolean(sameNext)}
        onImageClick={setLightbox}
        onMediaLoad={() => {
          if (atBottomRef.current) scrollToBottom(false);
        }}
      />,
    );
  });

  const status = typingState
    ? 'печатает…'
    : chat.peer.online
      ? 'в сети'
      : formatLastSeen(chat.peer.lastSeen);

  return (
    <section
      className="chat-pane"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <header className="chat-head">
        <button type="button" className="icon-btn back-btn" onClick={closeChat} title="Назад">
          <BackIcon />
        </button>
        <Avatar user={chat.peer} size={42} showOnline />
        <div className="chat-head-info">
          <div className="chat-head-name">{chat.peer.name}</div>
          <div className={`chat-head-status ${typingState ? 'is-typing' : chat.peer.online ? 'is-online' : ''}`}>
            {status}
          </div>
        </div>
        <div className="chat-head-spacer" />
      </header>

      <div className="chat-body">
        <div className="chat-scroll" ref={scrollRef} onScroll={handleScroll}>
          <div className="messages-inner">
            {hasMore && loading && messages.length > 0 && (
              <div className="history-loading">
                <span className="mini-spinner" />
              </div>
            )}

            {loading && messages.length === 0 && (
              <div className="messages-loading">
                <span className="mini-spinner" />
              </div>
            )}

            {!loading && messages.length === 0 && (
              <div className="conversation-empty">
                <div className="conversation-empty-badge">
                  <Avatar user={chat.peer} size={74} />
                </div>
                <h3>{chat.peer.name}</h3>
                <p>@{chat.peer.username}</p>
                <span>Это начало вашей переписки</span>
              </div>
            )}

            {rows}

            {typingState && (
              <div className="typing-row">
                <div className="typing-bubble" aria-label="печатает">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>
        </div>

        {showJump && (
          <button type="button" className="jump-btn" onClick={() => scrollToBottom()} title="Вниз">
            <ArrowDownIcon size={20} />
          </button>
        )}

        {dragging && (
          <div className="drop-overlay">
            <div className="drop-inner">
              <div className="drop-icon">📎</div>
              <div>Отпустите файлы, чтобы прикрепить</div>
            </div>
          </div>
        )}
      </div>

      <Composer
        chatId={chat.id}
        pending={pending}
        setPending={setPending}
        uploadFiles={uploadFiles}
        uploading={uploading}
        onSend={handleSend}
      />

      {lightbox && <Lightbox attachment={lightbox} onClose={() => setLightbox(null)} />}
    </section>
  );
}
