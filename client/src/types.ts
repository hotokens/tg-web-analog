export interface User {
  id: number;
  username: string;
  name: string;
  bio: string;
  phone: string | null;
  avatar: string | null;
  online: boolean;
  lastSeen: number;
}

export interface Attachment {
  id: number;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  isImage: boolean;
}

export interface Message {
  id: number;
  chatId: number;
  senderId: number;
  text: string;
  createdAt: number;
  editedAt: number | null;
  replyToId: number | null;
  attachments: Attachment[];
}

export interface LastMessage {
  id: number;
  text: string;
  senderId: number;
  createdAt: number;
  hasAttachments: boolean;
  attachmentType: 'image' | 'file' | null;
}

export interface Chat {
  id: number;
  type: string;
  peer: User;
  lastMessage: LastMessage | null;
  unreadCount: number;
  peerLastReadMessageId: number;
  createdAt: number;
}

export interface TypingState {
  userId: number;
  name: string;
  at: number;
}

export type Theme = 'light' | 'dark';

export interface ToastState {
  id: number;
  text: string;
  kind: 'info' | 'error' | 'success';
}
