import type { Attachment, Message, User } from '../types';
import { formatSize, formatTime, parseUrls } from '../utils';
import { Avatar } from './Avatar';
import { DownloadIcon, FileIcon, TicksIcon } from './Icons';

interface MessageBubbleProps {
  message: Message;
  own: boolean;
  peer: User;
  read: boolean;
  showAvatar: boolean;
  stackedTop: boolean;
  stackedBottom: boolean;
  onImageClick: (attachment: Attachment) => void;
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
  onMediaLoad,
}: MessageBubbleProps) {
  const images = message.attachments.filter((attachment) => attachment.isImage);
  const files = message.attachments.filter((attachment) => !attachment.isImage);

  return (
    <div
      className={`msg-row ${own ? 'out' : 'in'} ${stackedTop ? 'stacked-top' : ''} ${
        stackedBottom ? 'stacked-bottom' : ''
      }`}
    >
      {!own && (
        <div className="msg-avatar-slot">{showAvatar ? <Avatar user={peer} size={34} /> : null}</div>
      )}

      <div className={`bubble ${own ? 'bubble-out' : 'bubble-in'} ${message.attachments.length ? 'has-media' : ''}`}>
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
          <span className="msg-time">{formatTime(message.createdAt)}</span>
          {own && <TicksIcon read={read} className="msg-ticks" />}
        </div>
      </div>
    </div>
  );
}
