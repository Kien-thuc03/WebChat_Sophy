import React, { useState, useRef, useEffect } from 'react';
import { Avatar } from '../common/Avatar';
import { formatMessageTime } from '../../utils/dateUtils';
import { CheckOutlined, ClockCircleOutlined } from '@ant-design/icons';

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
    sendStatus?: string;
  };
  isOwnMessage: boolean;
  showAvatar?: boolean;
  showSender?: boolean;
  isGroupChat?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isOwnMessage,
  showAvatar = true,
  showSender = false,
  isGroupChat = false,
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

  // Get message status text
  const getMessageStatusText = (): string => {
    if (!isOwnMessage) return '';
    if (message.isError) return 'Gửi lỗi';
    
    switch (message.sendStatus) {
      case 'sending':
        return 'Đang gửi';
      case 'sent':
        return 'Đã gửi';
      case 'delivered':
        return 'Đã nhận';
      case 'read':
        return 'Đã xem';
      default:
        return 'Đã gửi';
    }
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
    <div className={`flex mb-1.5 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      {!isOwnMessage && showAvatar && (
        <div className="flex-shrink-0 mr-2 mt-auto">
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
        
        <div className={`relative px-3 py-2 rounded-2xl ${
          isOwnMessage 
            ? message.isError ? 'bg-red-100 text-red-800' : 'bg-blue-500 text-white rounded-tr-none' 
            : 'bg-gray-100 text-gray-800 rounded-tl-none'
        }`}>
          {renderMessageContent()}
          
          {/* Message footer with timestamp and status inside the bubble */}
          <div className="flex justify-between items-center mt-1 pt-1 text-xs">
            <span className={isOwnMessage ? 'text-blue-200' : 'text-gray-500'}>
              {formatMessageTime(message.timestamp)}
            </span>
            
            {isOwnMessage && (
              <span className={`ml-4 ${
                message.sendStatus === 'read' ? 'text-blue-200' : 
                message.isError ? 'text-red-400' : 'text-blue-200'
              }`}>
                {message.sendStatus === 'sending' && <ClockCircleOutlined className="mr-1" style={{ fontSize: '10px' }} />}
                {getMessageStatusText()}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Like/thumbs up button that appears in the UI */}
      {isOwnMessage && (
        <div className="flex items-end ml-2">
          <div className="text-gray-400 opacity-0 hover:opacity-100 transition-opacity">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage; 