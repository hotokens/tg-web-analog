import { useStore } from '../store';
import { ChatWindow } from './ChatWindow';
import { NewChatModal } from './NewChatModal';
import { SettingsModal } from './SettingsModal';
import { Sidebar } from './Sidebar';
import { Toasts } from './Toasts';

export function Messenger() {
  const activeChatId = useStore((state) => state.activeChatId);

  return (
    <div className={`app ${activeChatId ? 'chat-open' : ''}`}>
      <Sidebar />
      <ChatWindow />
      <SettingsModal />
      <NewChatModal />
      <Toasts />
    </div>
  );
}
