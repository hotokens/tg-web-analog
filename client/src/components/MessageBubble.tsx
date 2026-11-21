import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Attachment, Message, User } from '../types';
import { REACTION_EMOJIS, formatSize, formatTime, parseUrls } from '../utils';
import { Avatar } from './Avatar';
import { DownloadIcon, EmojiIcon, FileIcon, PencilIcon, TicksIcon } from './Icons';

interface MessageBubbleProps {
  message: Message;
  own: boolean;
  peer: User;
  read: boolean;
  showAvatar: boolean;
  stackedTop: boolean;
  stackedBottom: boolean;
  onImageClick: (attachment: Attachment) => void;
  onEdit: (message: Message) => void;
  onReact: (chatId: number, messageId: number, emoji: string) => void;
  onMediaLoad?: () => void;
}

export function MessageBubble({
  message,
  own,
  peer,
  read,
  showAvatar,
  stackedTop,
  stackedBottom,
  onImageClick,
  onEdit,
  onReact,
  onMediaLoad,
}: MessageBubbleProps) {
  const images = message.attachments.filter((attachment) => attachment.isImage);
  const files = message.attachments.filter((attachment) => !attachment.isImage);
  const reactions = message.reactions ?? [];

  const [actionsOpen, setActionsOpen] = useState(false);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const pressTimer = useRef<number | undefined>(undefined);
  const pressStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => window.clearTimeout(pressTimer.current);
  }, []);

  function cancelPress() {
    window.clearTimeout(pressTimer.current);
    pressStart.current = null;
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'touch') return;
    pressStart.current = { x: event.clientX, y: event.clientY };
    window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => {
      setActionsOpen(true);
      navigator.vibrate?.(8);
    }, 450);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pressStart.current) return;
    const distance = Math.hypot(event.clientX - pressStart.current.x, event.clientY - pressStart.current.y);
    if (distance > 10) cancelPress();
  }

  return (
    <div
      className={`msg-row ${own ? 'out' : 'in'} ${stackedTop ? 'stacked-top' : ''} ${
        stackedBottom ? 'stacked-bottom' : ''
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
    >
      {(actionsOpen || reactionPickerOpen) && (
        <div
          className="msg-actions-backdrop"
          onClick={() => {
            setActionsOpen(false);
            setReactionPickerOpen(false);
          }}
        />
      )}

      {!own && (
        <div className="msg-avatar-slot">{showAvatar ? <Avatar user={peer} size={34} /> : null}</div>
      )}

      <div className={`msg-stack ${own ? 'out' : 'in'}`}>
        <div className={`msg-actions ${actionsOpen || reactionPickerOpen ? 'is-open' : ''}`}>
          <button
            type="button"
            className="msg-action-btn"
            onClick={() => {
              const next = !reactionPickerOpen;
              setReactionPickerOpen(next);
              setActionsOpen(next);
            }}
            title="Поставить реакцию"
            aria-label="Поставить реакцию"
          >
            <EmojiIcon size={16} />
          </button>

          {own && (
            <button
              type="button"
              className="msg-action-btn"
              onClick={() => {
                setActionsOpen(false);
                setReactionPickerOpen(false);
                onEdit(message);
              }}
              title="Редактировать сообщение"
              aria-label="Редактировать сообщение"
            >
              <PencilIcon size={15} />
            </button>
          )}
        </div>

        {reactionPickerOpen && (
          <div className={`reaction-picker ${own ? 'out' : 'in'}`} onClick={(event) => event.stopPropagation()}>
            {REACTION_EMOJIS.map((emoji) => {
              const mine = reactions.some((reaction) => reaction.emoji === emoji && reaction.me);
              return (
                <button
                  key={emoji}
                  type="button"
                  className={`reaction-choice ${mine ? 'is-mine' : ''}`}
                  onClick={() => {
                    setReactionPickerOpen(false);
                    setActionsOpen(false);
                    onReact(message.chatId, message.id, emoji);
                  }}
                  title={emoji}
                  aria-label={`Реакция ${emoji}`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        )}

        <div
          className={`bubble ${own ? 'bubble-out' : 'bubble-in'} ${
            message.attachments.length ? 'has-media' : ''
          }`}
        >
          {images.length > 0 && (
            <div className={`msg-images ${images.length > 1 ? 'multi' : ''}`}>
              {images.map((attachment) => (
                <button
                  key={attachment.id}
                  type="button"
                  className="msg-image"
                  onClick={() => onImageClick(attachment)}
                  title={attachment.fileName}
                >
                  <img
                    src={attachment.url}
                    alt={attachment.fileName}
                    loading="lazy"
                    draggable={false}
                    onLoad={onMediaLoad}
                  />
                </button>
              ))}
            </div>
          )}

          {files.map((attachment) => (
            <a
              key={attachment.id}
              className="file-card"
              href={attachment.url}
              download={attachment.fileName}
              onClick={(event) => event.stopPropagation()}
            >
              <span className="file-card-icon">
                <FileIcon size={22} />
              </span>
              <span className="file-card-info">
                <span className="file-card-name">{attachment.fileName}</span>
                <span className="file-card-size">{formatSize(attachment.size)}</span>
              </span>
              <span className="file-card-download">
                <DownloadIcon size={18} />
              </span>
            </a>
          ))}

          {message.text && (
            <div className="msg-text">
              {parseUrls(message.text).map((part, index) => {
                if (part.type === 'link') {
                  return (
                    <a key={index} href={part.value} target="_blank" rel="noreferrer">
                      {part.value}
                    </a>
                  );
                }
                if (part.type === 'mention') {
                  return (
                    <span key={index} className="msg-mention">
                      {part.value}
                    </span>
                  );
                }
                return <span key={index}>{part.value}</span>;
              })}
            </div>
          )}

          <div className="msg-meta">
            {message.editedAt && <span className="msg-edited">изменено</span>}
            <span className="msg-time">{formatTime(message.createdAt)}</span>
            {own && <TicksIcon read={read} className="msg-ticks" />}
          </div>

          {reactions.length > 0 && (
            <div className="msg-reactions">
              {reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  type="button"
                  className={`reaction-chip ${reaction.me ? 'is-mine' : ''}`}
                  onClick={() => onReact(message.chatId, message.id, reaction.emoji)}
                  title={`${reaction.emoji} ${reaction.count}`}
                >
                  <span className="reaction-emoji">{reaction.emoji}</span>
                  <span className="reaction-count">{reaction.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
