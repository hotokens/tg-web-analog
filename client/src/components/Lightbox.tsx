import { useEffect } from 'react';
import type { Attachment } from '../types';
import { formatSize } from '../utils';
import { CloseIcon, DownloadIcon } from './Icons';

interface LightboxProps {
  attachment: Attachment;
  onClose: () => void;
}

export function Lightbox({ attachment, onClose }: LightboxProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="lightbox" onClick={onClose}>
      <div className="lightbox-bar" onClick={(event) => event.stopPropagation()}>
        <div className="lightbox-name">
          {attachment.fileName}
          <span>{formatSize(attachment.size)}</span>
        </div>
        <a
          className="lightbox-btn"
          href={attachment.url}
          download={attachment.fileName}
          title="Скачать"
          onClick={(event) => event.stopPropagation()}
        >
          <DownloadIcon size={20} />
        </a>
        <button type="button" className="lightbox-btn" onClick={onClose} title="Закрыть">
          <CloseIcon size={22} />
        </button>
      </div>
      <img
        className="lightbox-image"
        src={attachment.url}
        alt={attachment.fileName}
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}
