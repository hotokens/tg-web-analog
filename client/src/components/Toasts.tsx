import { useStore } from '../store';
import { CloseIcon } from './Icons';

export function Toasts() {
  const toast = useStore((state) => state.toast);
  const clearToast = useStore((state) => state.clearToast);

  if (!toast) return null;

  return (
    <div className={`toast toast-${toast.kind}`} role="status" key={toast.id}>
      <span>{toast.text}</span>
      <button type="button" className="toast-close" onClick={clearToast} aria-label="Закрыть">
        <CloseIcon size={15} />
      </button>
    </div>
  );
}
