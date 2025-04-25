import React, { useState, useRef, useEffect } from 'react';
import { Avatar } from '../../common/Avatar';
import { formatMessageTime } from '../../../utils/dateUtils';
import { 
  CheckOutlined, 
  ClockCircleOutlined, 
  FileOutlined, 
  FileImageOutlined,
  FileWordOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileZipOutlined,
  FileUnknownOutlined,
  DownloadOutlined,
  PlayCircleOutlined,
  AudioOutlined,
  VideoCameraOutlined
} from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { formatFileSize } from '../../../services/cloudinaryService';
import ReactPlayer from 'react-player';

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
    type: 'text' | 'image' | 'file' | 'audio' | 'video' | 'document' | 'text-with-image' | 'notification';
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    isRead?: boolean;
    isError?: boolean;
    sendStatus?: string;
    attachments?: Array<{ 
      url: string; 
      type?: string; 
      name?: string; 
      size?: number; 
      downloadUrl?: string;
      format?: string;
    }>;
    attachment?: { 
      url: string; 
      type?: string; 
      name?: string; 
      size?: number; 
      downloadUrl?: string;
      format?: string;
    };
    isPinned?: boolean;
    isReply?: boolean;
    messageReplyId?: string | null;
    replyData?: any;
  };
  isOwnMessage: boolean;
  showAvatar?: boolean;
  showSender?: boolean;
  isGroupChat?: boolean;
  onImageClick?: (url: string) => void;
  onPinMessage?: (messageId: string) => void;
  onUnpinMessage?: (messageId: string) => void;
  onReplyClick?: (messageId: string) => void;
}

// Component to display the reply preview
const ReplyPreview: React.FC<{
  replyData: any;
  isOwnMessage: boolean;
  messageReplyId?: string | null;
  onReplyClick?: (messageId: string) => void;
}> = ({ replyData, isOwnMessage, messageReplyId, onReplyClick }) => {
  // Default content if replyData is missing
  if (!replyData) {
    return null;
  }

  let replyContent = '';
  let replySender = 'Người dùng';
  let replyType = 'text';
  let attachment = null;

  // Parse replyData if it's a string
  if (typeof replyData === 'string') {
    try {
      const parsedData = JSON.parse(replyData);
      replyContent = parsedData.content || '';
      // Thứ tự ưu tiên cho tên người gửi
      replySender = parsedData.senderName || (parsedData.sender && parsedData.sender.name) || 'Người dùng';
      replyType = parsedData.type || 'text';
      attachment = parsedData.attachment || null;
    } catch (error) {
      // If parsing fails, use the string directly
      replyContent = replyData;
    }
  } else if (typeof replyData === 'object') {
    // If replyData is already an object
    replyContent = replyData.content || '';
    // Thứ tự ưu tiên cho tên người gửi
    replySender = replyData.senderName || (replyData.sender && replyData.sender.name) || 'Người dùng';
    replyType = replyData.type || 'text';
    attachment = replyData.attachment || null;
  }


  const handleClick = () => {
    if (messageReplyId && onReplyClick) {
      onReplyClick(messageReplyId);
    }
  };

  // Render content based on message type
  const renderReplyTypeContent = () => {
    switch (replyType) {
      case 'text':
        return replyContent || 'Tin nhắn văn bản';
      case 'image':
        return (
          <div className="flex items-center">
            {attachment && attachment.url ? (
              <div className="flex items-center">
                <img 
                  src={attachment.url} 
                  alt="Preview" 
                  className="w-8 h-8 object-cover rounded mr-1"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/images/image-placeholder.png'; 
                  }}
                />
                <span>Hình ảnh</span>
              </div>
            ) : (
              <>
                <FileImageOutlined className="mr-1" />
                <span>Hình ảnh</span>
              </>
            )}
          </div>
        );
      case 'file':
        return (
          <div className="flex items-center">
            <FileOutlined className="mr-1" />
            <span>{attachment?.name || 'Tệp tin'}</span>
          </div>
        );
      case 'audio':
        return (
          <div className="flex items-center">
            <AudioOutlined className="mr-1" />
            <span>Tin nhắn thoại</span>
          </div>
        );
      case 'video':
        return (
          <div className="flex items-center">
            <VideoCameraOutlined className="mr-1" />
            <span>Video</span>
          </div>
        );
      default:
        return replyContent || 'Tin nhắn';
    }
  };

  return (
    <div 
      className={`flex items-start pl-2 cursor-pointer text-gray-600 ${isOwnMessage ? 'text-white/80' : ''}`}
      onClick={handleClick}
    >
      <div className={`w-1 self-stretch mr-2 ${isOwnMessage ? 'bg-blue-300' : 'bg-blue-500'}`}></div>
      <div className="reply-preview-content flex-1 text-xs py-1">
        <div className="reply-sender font-medium">{replySender}</div>
        <div className="reply-content truncate">
          {renderReplyTypeContent()}
        </div>
      </div>
    </div>
  );
};

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isOwnMessage,
  showAvatar = true,
  showSender = false,
  isGroupChat = false,
  onImageClick,
  onPinMessage,
  onUnpinMessage,
  onReplyClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      const element = contentRef.current;
      setIsOverflowing(element.scrollHeight > element.clientHeight);
    }
  }, [message.content]);

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

  // Get the correct file icon based on file format
  const getFileIcon = (format?: string, type?: string) => {
    if (!format && !type) return <FileUnknownOutlined />;
    
    const fileType = type || '';
    const fileFormat = format || '';
    
    if (fileType.startsWith('image/') || fileType === 'image') {
      return <FileImageOutlined />;
    } else if (fileFormat === 'pdf' || fileType === 'application/pdf') {
      return <FilePdfOutlined />;
    } else if (['doc', 'docx'].includes(fileFormat) || fileType.includes('word')) {
      return <FileWordOutlined />;
    } else if (['xls', 'xlsx'].includes(fileFormat) || fileType.includes('excel')) {
      return <FileExcelOutlined />;
    } else if (['ppt', 'pptx'].includes(fileFormat) || fileType.includes('powerpoint')) {
      return <FilePptOutlined />;
    } else if (['zip', 'rar', '7z'].includes(fileFormat) || fileType.includes('zip') || fileType.includes('compress')) {
      return <FileZipOutlined />;
    }
    
    return <FileOutlined />;
  };

  // Handle file download
  const handleDownload = (url?: string, fileName?: string) => {
    if (!url) return;
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render message content based on message type
  const renderMessageContent = () => {
    // Get attachment info from multiple possible sources
    const attachment = message.attachment || (message.attachments && message.attachments.length > 0 ? message.attachments[0] : null);
    const fileUrl = message.fileUrl || (attachment?.url || '');
    const fileName = message.fileName || (attachment?.name || 'File');
    const fileSize = message.fileSize || (attachment?.size || 0);
    const fileType = attachment?.type || '';
    const fileFormat = attachment?.format || fileName.split('.').pop() || '';
    const downloadUrl = attachment?.downloadUrl || fileUrl;

    switch (message.type) {
      case 'notification':
        return (
          <div className="flex items-center justify-center">
            <div className="text-xs text-gray-500 italic">
              {message.content}
            </div>
          </div>
        );
        
      case 'image':
        return (
          <div className="message-image">
            <img 
              src={fileUrl}
              alt={fileName || "Image"} 
              className="rounded-lg max-w-xs max-h-60 object-cover cursor-pointer shadow-sm hover:shadow-md transition-shadow duration-200" 
              onClick={() => onImageClick && onImageClick(fileUrl)}
              onError={(e) => {
                e.currentTarget.onerror = null; 
                e.currentTarget.src = '/images/image-placeholder.png';
              }}
              loading="lazy"
            />
            <div className="download-button mt-1 text-right">
              <Button 
                type="text" 
                size="small" 
                icon={<DownloadOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(downloadUrl, fileName);
                }}
                className={`${isOwnMessage ? 'text-blue-200 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Tải xuống
              </Button>
            </div>
          </div>
        );
      
      case 'video':
        return (
          <div className="message-video">
            <div className="video-container relative rounded-lg overflow-hidden max-w-xs">
              <ReactPlayer
                url={fileUrl}
                width="100%"
                height="auto"
                controls={true}
                light={true}
                playing={isVideoPlaying}
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
                pip={false}
                config={{
                  file: {
                    attributes: {
                      controlsList: 'nodownload',
                      disablePictureInPicture: true
                    }
                  }
                }}
                className="rounded-lg"
              />
              {!isVideoPlaying && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <PlayCircleOutlined className="text-4xl text-white opacity-80" />
                </div>
              )}
            </div>
            <div className="download-button mt-1 text-right">
              <Button 
                type="text" 
                size="small" 
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(downloadUrl, fileName)}
                className={`${isOwnMessage ? 'text-blue-200 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Tải xuống
              </Button>
            </div>
          </div>
        );
        
      case 'audio':
        return (
          <div className="message-audio">
            <audio 
              src={fileUrl}
              controls
              className="w-full max-w-xs"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="download-button mt-1">
              <Button 
                type="text" 
                size="small" 
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(downloadUrl, fileName)}
              >
                Download Audio
              </Button>
            </div>
          </div>
        );
        
      case 'document':
      case 'file':
        return (
          <div className="message-file bg-opacity-20 rounded-md p-3 bg-gray-200">
            <div className="flex items-center">
              <div className="file-icon text-2xl mr-3">
                {getFileIcon(fileFormat, fileType)}
              </div>
              <div className="file-info flex-grow">
                <div className="file-name font-medium truncate max-w-xs">{fileName}</div>
                <div className="file-size text-xs opacity-70">{formatFileSize(fileSize)}</div>
              </div>
              <Tooltip title="Download">
                <Button 
                  type="text"
                  shape="circle"
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownload(downloadUrl, fileName)}
                />
              </Tooltip>
            </div>
          </div>
        );
        
      case 'text-with-image':
        // Hiển thị cả nội dung text và ảnh
        return (
          <div className="message-text-with-image">
            {/* Hiển thị text trước */}
            <div className="message-text relative mb-2">
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
            
            {/* Hiển thị ảnh dưới text */}
            <div className="message-image mt-2">
              <img 
                src={fileUrl}
                alt="Image with text" 
                className="rounded-lg max-w-xs max-h-60 object-cover cursor-pointer shadow-sm hover:shadow-md transition-shadow duration-200" 
                onClick={() => onImageClick && onImageClick(fileUrl)}
                onError={(e) => {
                  e.currentTarget.onerror = null; 
                  e.currentTarget.src = '/images/image-placeholder.png';
                }}
                loading="lazy"
              />
              <div className="download-button mt-1 text-right">
                <Button 
                  type="text" 
                  size="small" 
                  icon={<DownloadOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(downloadUrl, fileName);
                  }}
                  className={`${isOwnMessage ? 'text-blue-200 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Tải xuống
                </Button>
              </div>
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
        <div className="flex-shrink-0 mr-2 self-end">
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
        
        {/* Replace the existing reply preview with improved version */}
        {message.isReply && message.replyData ? (
          <div className="mb-1 rounded-t-md overflow-hidden">
            <div className={`${isOwnMessage ? 'bg-blue-400' : 'bg-gray-200'} bg-opacity-60 rounded-t-md`}>
              <ReplyPreview 
                replyData={message.replyData} 
                isOwnMessage={isOwnMessage} 
                messageReplyId={message.messageReplyId}
                onReplyClick={onReplyClick}
              />
            </div>
          </div>
        ) : null}
        
        {/* Console log để hiển thị dữ liệu tin nhắn Reply */}
        {message.isReply ? (
          console.log('ChatMessage - Reply Data:', {
            id: message.id, 
            isReply: message.isReply, 
            replyData: message.replyData,
            replyDataType: typeof message.replyData,
            messageReplyId: message.messageReplyId
          }),
          null
        ) : null}
        
        <div className={`message-container relative ${
          isOwnMessage 
            ? message.isError ? 'bg-red-100 text-red-800' : 'bg-blue-500 text-white' 
            : 'bg-gray-100 text-gray-800'
        } rounded-2xl ${message.isReply ? 'rounded-tl-none rounded-tr-none' : isOwnMessage ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
          {/* Pin indicator */}
          {message.isPinned && (
            <div className="absolute -top-4 right-0 text-xs font-medium px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-t-lg flex items-center shadow-sm">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" className="mr-1">
                <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" />
              </svg>
              <span>Đã ghim</span>
            </div>
          )}
          
          {/* Message content */}
          <div className="px-3 py-2">
            {renderMessageContent()}
            
            {/* Message footer with timestamp and status inside the bubble */}
            <div className="flex justify-between items-center mt-1 pt-1 text-xs">
              <span className={isOwnMessage ? 'text-blue-200' : 'text-gray-500'}>
                {formatMessageTime(message.timestamp)}
              </span>
              
              <div className="flex items-center">
                {/* Pin/Unpin button */}
                {message.isPinned ? (
                  <Tooltip title="Bỏ ghim">
                    <Button 
                      type="text" 
                      size="small"
                      className={`${isOwnMessage ? 'text-blue-200 hover:text-white' : 'text-gray-500 hover:text-gray-700'} mr-2`}
                      onClick={() => onUnpinMessage && onUnpinMessage(message.id)}
                      icon={
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                          <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" />
                        </svg>
                      }
                    />
                  </Tooltip>
                ) : (
                  <Tooltip title="Ghim tin nhắn">
                    <Button 
                      type="text" 
                      size="small"
                      className={`${isOwnMessage ? 'text-blue-200 hover:text-white' : 'text-gray-500 hover:text-gray-700'} mr-2 opacity-0 group-hover:opacity-100`}
                      onClick={() => onPinMessage && onPinMessage(message.id)}
                      icon={
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                          <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" />
                        </svg>
                      }
                    />
                  </Tooltip>
                )}
                
                {isOwnMessage && (
                  <span className={`ml-1 ${
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