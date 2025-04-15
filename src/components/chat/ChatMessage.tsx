import React, { useState, useRef, useEffect } from 'react';
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
    isError?: boolean;
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      const element = contentRef.current;
      setIsOverflowing(element.scrollHeight > element.clientHeight);
    }
  }, [message.content]);

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
        return (
          <div className="message-text relative">
            <div 
              ref={contentRef}
              className={`overflow-hidden ${isExpanded ? '' : 'max-h-32'}`}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            </div>
            {isOverflowing && !isExpanded && (
              <>
                <div className={`absolute bottom-0 left-0 right-0 h-8 ${
                  isOwnMessage 
                    ? message.isError ? 'bg-gradient-to-t from-red-100 to-transparent' 
                    : 'bg-gradient-to-t from-blue-500 to-transparent' 
                    : 'bg-gradient-to-t from-gray-100 to-transparent'
                } pointer-events-none`}></div>
                <div className="text-center mt-1">
                  <button
                    onClick={() => setIsExpanded(true)}
                    className={`text-xs ${isOwnMessage && !message.isError ? 'text-white' : 'text-blue-500'} hover:underline`}
                  >
                    Xem thêm
                  </button>
                </div>
              </>
            )}
          </div>
        );
    }
  };

  return (
    <div className={`flex mb-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      {!isOwnMessage && showAvatar && (
        <div className="flex-shrink-0 mr-2">
          <Avatar 
            name={message.sender.name} 
            avatarUrl={message.sender.avatar}
            size={30}
            className="rounded-full"
          />
        </div>
      )}
      
      <div className={`flex flex-col max-w-[70%]`}>
        {showSender && !isOwnMessage && (
          <div className="text-xs mb-1 ml-1 text-gray-600">
            {message.sender.name}
          </div>
        )}
        
        <div className={`px-3 py-2 rounded-2xl ${
          isOwnMessage 
            ? message.isError ? 'bg-red-100 text-red-800' : 'bg-blue-500 text-white rounded-tr-none' 
            : 'bg-gray-100 text-gray-800 rounded-tl-none'
        }`}>
          {renderMessageContent()}
        </div>
        
        <div className={`flex text-xs text-gray-500 mt-1 ${
          isOwnMessage ? 'justify-end' : 'justify-start'
        }`}>
          <span>{formatMessageTime(message.timestamp)}</span>
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