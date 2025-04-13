import React from 'react';
import { Avatar } from '../common/Avatar';
import { formatMessageTime } from '../../utils/dateUtils';
import { CheckOutlined } from '@ant-design/icons';

interface ChatMessageProps {
  message: {
    id: string;
    content: string;
    timestamp: string;
    sender: {
      id: string;
      name: string;
      avatar?: string;
    };
    type: 'text' | 'image' | 'file';
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    isRead?: boolean;
  };
  isOwnMessage: boolean;
  showAvatar?: boolean;
  showSender?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isOwnMessage,
  showAvatar = true,
  showSender = false,
}) => {
  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Render message content based on message type
  const renderMessageContent = () => {
    switch (message.type) {
      case 'image':
        return (
          <div className="message-image">
            <img src={message.fileUrl} alt="Image" className="rounded-md max-w-xs max-h-60 object-cover" />
          </div>
        );
      case 'file':
        return (
          <div className="message-file flex items-center p-2 bg-opacity-10 rounded-md">
            <i className="fas fa-file mr-2"></i>
            <div className="file-info">
              <div className="file-name truncate max-w-xs">{message.fileName}</div>
              <div className="file-size text-xs opacity-70">{formatFileSize(message.fileSize)}</div>
            </div>
          </div>
        );
      case 'text':
      default:
        return <div className="message-text">{message.content}</div>;
    }
  };

  return (
    <div className={`chat-message flex mb-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      {!isOwnMessage && showAvatar && (
        <div className="avatar-container mr-2 flex-shrink-0">
          <Avatar 
            name={message.sender.name} 
            avatarUrl={message.sender.avatar}
            size={32}
            className="rounded-full"
          />
        </div>
      )}
      
      <div className={`message-container max-w-[70%]`}>
        {showSender && !isOwnMessage && (
          <div className="sender-name text-xs mb-1 ml-1">{message.sender.name}</div>
        )}
        
        <div className={`message-bubble p-2 rounded-lg ${
          isOwnMessage 
            ? 'bg-blue-500 text-white rounded-tr-none' 
            : 'bg-gray-100 text-gray-800 rounded-tl-none'
        }`}>
          {renderMessageContent()}
        </div>
        
        <div className={`message-info flex items-center mt-1 text-xs text-gray-500 ${
          isOwnMessage ? 'justify-end' : 'justify-start'
        }`}>
          <span className="timestamp">{formatMessageTime(message.timestamp)}</span>
          {isOwnMessage && message.isRead && (
            <span className="ml-1 text-blue-500">
              <CheckOutlined style={{ fontSize: '12px' }} />
              <CheckOutlined style={{ fontSize: '12px', marginLeft: '-4px' }} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage; 