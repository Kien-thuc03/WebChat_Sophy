import { DisplayMessage } from '../features/chat/types/chatTypes';

/**
 * Format a message preview for display in pinned messages or notifications
 */
export const formatMessagePreview = (message: DisplayMessage): string => {
  if (!message) return "";
  
  switch (message.type) {
    case 'image':
      return '📷 Hình ảnh';
    case 'file':
      return `📎 ${message.fileName || 'Tệp đính kèm'}`;
    case 'audio':
      return '🔊 Tin nhắn thoại';
    case 'video':
      return '🎥 Video';
    case 'text-with-image':
      return message.content || '📷 Hình ảnh với văn bản';
    default:
      return message.content || '';
  }
};

/**
 * Get the sender display name for a message
 */
export const getMessageSenderName = (message: DisplayMessage, currentUserId: string): string => {
  if (message.sender.id === currentUserId) {
    return 'Bạn';
  }
  return message.sender.name || 'Người dùng';
}; 