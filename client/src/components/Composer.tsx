import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { getSocket } from '../socket';
import type { Attachment } from '../types';
import { formatSize } from '../utils';
import { EmojiPicker } from './EmojiPicker';
import { AttachIcon, CloseIcon, EmojiIcon, FileIcon, SendIcon } from './Icons';

interface ComposerProps {
  chatId: number;
  pending: Attachment[];
  setPending: Dispatch<SetStateAction<Attachment[]>>;
  uploadFiles: (files: File[] | FileList) => void;
  uploading: number;
  onSend: (text: string) => Promise<boolean>;
}

export function Composer({ chatId, pending, setPending, uploadFiles, uploading, onSend }: ComposerProps) {
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingSentAt = useRef(0);
  const typingTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setText('');
    setEmojiOpen(false);
  }, [chatId]);

  useEffect(() => {
    const element = inputRef.current;
    if (!element) return;
    element.style.height = '0px';
    element.style.height = `${Math.min(element.scrollHeight, 150)}px`;
  }, [text]);

  function stopTyping() {
    window.clearTimeout(typingTimer.current);
    if (typingSentAt.current) {
      getSocket()?.emit('typing', { chatId, isTyping: false });
      typingSentAt.current = 0;
    }
  }

  useEffect(() => {
    return () => stopTyping();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  function handleChange(value: string) {
    setText(value);
    if (!value.trim()) {
      stopTyping();
      return;
    }
    const now = Date.now();
    if (now - typingSentAt.current > 1500) {
      getSocket()?.emit('typing', { chatId, isTyping: true });
      typingSentAt.current = now;
    }
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      if (typingSentAt.current) {
        getSocket()?.emit('typing', { chatId, isTyping: false });
        typingSentAt.current = 0;
      }
    }, 2200);
  }

  async function submit() {
    const value = text.trim();
    if (sending || uploading > 0) return;
    if (!value && pending.length === 0) return;

    setSending(true);
    setEmojiOpen(false);
    try {
      const ok = await onSend(value);
      if (ok) {
        setText('');
        stopTyping();
        window.requestAnimationFrame(() => inputRef.current?.focus());
      }
    } finally {
      setSending(false);
    }
  }

  function insertEmoji(emoji: string) {
    const element = inputRef.current;
    const start = element?.selectionStart ?? text.length;
    const end = element?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    handleChange(next);
    window.requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

  const canSend = (text.trim().length > 0 || pending.length > 0) && uploading === 0 && !sending;

  return (
    <div className="composer-wrap">
      {emojiOpen && <EmojiPicker onPick={insertEmoji} onClose={() => setEmojiOpen(false)} />}

      {(pending.length > 0 || uploading > 0) && (
        <div className="pending-strip">
          {pending.map((attachment) => (
            <div className="pending-item" key={attachment.id} title={attachment.fileName}>
              {attachment.isImage ? (
                <img src={attachment.url} alt={attachment.fileName} />
              ) : (
                <span className="pending-file">
                  <FileIcon size={18} />
                </span>
              )}
              <span className="pending-info">
                <span className="pending-name">{attachment.fileName}</span>
                <span className="pending-size">{formatSize(attachment.size)}</span>
              </span>
              <button
                type="button"
                className="pending-remove"
                onClick={() => setPending((current) => current.filter((item) => item.id !== attachment.id))}
                title="Убрать"
              >
                <CloseIcon size={13} />
              </button>
            </div>
          ))}
          {uploading > 0 && (
            <div className="pending-item pending-loading">
              <span className="mini-spinner" />
              <span className="pending-info">
                <span className="pending-name">Загрузка…</span>
              </span>
            </div>
          )}
        </div>
      )}

      <div className="composer">
        <button
          type="button"
          className="composer-btn"
          onClick={() => fileRef.current?.click()}
          title="Прикрепить файл"
        >
          <AttachIcon size={23} />
        </button>

        <textarea
          ref={inputRef}
          className="composer-input"
          value={text}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void submit();
            }
          }}
          onPaste={(event) => {
            const files = Array.from(event.clipboardData.files);
            if (files.length > 0) {
              event.preventDefault();
              uploadFiles(files);
            }
          }}
          placeholder="Написать сообщение…"
          rows={1}
        />

        <button
          type="button"
          className={`composer-btn ${emojiOpen ? 'is-active' : ''}`}
          onClick={() => setEmojiOpen((open) => !open)}
          title="Эмодзи"
        >
          <EmojiIcon size={23} />
        </button>

        <button
          type="button"
          className={`send-btn ${canSend ? 'is-ready' : ''}`}
          onClick={() => void submit()}
          disabled={!canSend}
          title="Отправить"
        >
          {sending ? <span className="mini-spinner light" /> : <SendIcon size={21} />}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files?.length) uploadFiles(event.target.files);
          event.target.value = '';
        }}
      />

      <div className="composer-hint">
        <span>Enter — отправить</span>
        <span>Shift + Enter — новая строка</span>
        <span>До 25 МБ на файл</span>
      </div>
    </div>
  );
}
