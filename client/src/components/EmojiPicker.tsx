import { CloseIcon } from './Icons';

const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥳',
  '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫',
  '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶',
  '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥',
  '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲',
  '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💯',
  '🔥', '✨', '🎉', '👏', '🙌', '👍', '👎', '🙏', '💪', '🤝',
  '☕', '🍕', '🎂', '🌞', '🌙', '⭐', '🌈', '🚀', '✈️', '📎',
  '📷', '🎨', '💻', '📱', '✅', '❌', '⚡', '💡', '🎯', '🏆',
];

interface EmojiPickerProps {
  onPick: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onPick, onClose }: EmojiPickerProps) {
  return (
    <>
      <div className="emoji-backdrop" onClick={onClose} />
      <div className="emoji-panel">
        <div className="emoji-panel-head">
          <span>Эмодзи</span>
          <button type="button" className="emoji-close" onClick={onClose} title="Закрыть">
            <CloseIcon size={16} />
          </button>
        </div>
        <div className="emoji-grid">
          {EMOJIS.map((emoji) => (
            <button key={emoji} type="button" className="emoji-item" onClick={() => onPick(emoji)}>
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
