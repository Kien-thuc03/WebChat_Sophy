import React, { useState, useRef, useEffect } from 'react';
import { Button, Dropdown, Tooltip } from 'antd';
import { formatMessageTime } from "../../../utils/dateUtils";
import { Avatar } from '../../common/Avatar';
import { DisplayMessage } from '../../../features/chat/types/chatTypes';
import { Conversation } from '../../../features/chat/types/conversationTypes';
import { User } from '../../../features/auth/types/authTypes';
import { ReplyPreview } from './PreviewReply';
import NotificationMessage from './NotificationMessage';
import {
  CommentOutlined,
  ShareAltOutlined,
  MoreOutlined,
  DownloadOutlined,
  FileImageOutlined,
  AudioOutlined,
  VideoCameraOutlined,
  FileOutlined,
  FileWordOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileZipOutlined,
  CheckOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons';
import voiceMessageService from '../../../services/voiceMessageService';

// Helper function to check if a message is a notification type
const isNotificationMessage = (message: DisplayMessage): boolean => {
  return message.type === 'notification';
};

const isLikeMessage = (message: DisplayMessage): boolean => {
  const urlRegex =
    /\b(https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+\.(com|net|org|io|gov|edu|vn|co))\b/gi;
  return urlRegex.test(message.content || '');
};

// Helper function to check if a message is an audio file (expanded to support more formats)
const isAudioFile = (message: DisplayMessage): boolean => {
  // Kiểm tra tên file có chứa "voice_message" hoặc "audio" và có đuôi audio phổ biến
  const hasAudioNamePattern = Boolean(
    (message.fileName?.match(/voice_message_|audio|tin_nhắn_thoại|voice|ghi_âm/i) && 
     message.fileName?.match(/\.(webm|mp3|m4a|3gp|wav|aac|ogg)$/i)) ||
    (message.attachment?.name?.match(/voice_message_|audio|tin_nhắn_thoại|voice|ghi_âm/i) && 
     message.attachment?.name?.match(/\.(webm|mp3|m4a|3gp|wav|aac|ogg)$/i))
  );
  
  // Kiểm tra type của attachment là audio
  const hasAudioType = Boolean(
    message.attachment?.type?.startsWith('audio/') ||
    (message.type === 'audio')
  );
  
  // Kiểm tra attachment type là video/webm nhưng kích thước nhỏ (thường là audio)
  const isSmallWebmVideo = Boolean(
    message.attachment?.type === 'video/webm' && 
    message.fileSize && message.fileSize < 1024 * 1024
  );
  
  // Kiểm tra kích thước file nhỏ và có định dạng audio phổ biến
  const isSmallAudioFile = Boolean(
    message.fileSize && message.fileSize < 2 * 1024 * 1024 && 
    (Boolean(message.fileName?.match(/\.(webm|mp3|m4a|3gp|wav|aac|ogg)$/i)) || 
     Boolean(message.attachment?.name?.match(/\.(webm|mp3|m4a|3gp|wav|aac|ogg)$/i)))
  );
  
  // Kiểm tra nếu có audioDuration (thường chỉ có ở voice messages)
  const hasAudioDuration = Boolean(message.audioDuration);
  
  // Kiểm tra một số định dạng video nhỏ có thể là audio (như 3gp)
  const isSmallVideoFile = Boolean(
    message.attachment?.type?.startsWith('video/') && 
    message.fileSize && message.fileSize < 2 * 1024 * 1024 &&
    (message.fileName?.match(/\.3gp$/i) || message.attachment?.name?.match(/\.3gp$/i))
  );
  
  // Kiểm tra nếu file có định dạng audio và được gửi từ recorder
  const isAudioFromRecorder = Boolean(
    (message.fileName?.match(/\.(webm|mp3|m4a|3gp|wav|aac|ogg)$/i) || 
     message.attachment?.name?.match(/\.(webm|mp3|m4a|3gp|wav|aac|ogg)$/i)) &&
    (message.content?.includes('voice message') || message.content?.includes('tin nhắn thoại'))
  );
  
  return hasAudioNamePattern || hasAudioType || isSmallWebmVideo || isSmallAudioFile || hasAudioDuration || isSmallVideoFile || isAudioFromRecorder;
};

// Helper function to check if browser supports a specific audio format
const canBrowserPlayFormat = (url: string): boolean => {
  if (!url) return true; // Nếu không có URL, không thể kiểm tra
  
  const audio = document.createElement('audio');
  const fileExtension = url.split('.').pop()?.toLowerCase();
  
  switch(fileExtension) {
    case '3gp': return audio.canPlayType('audio/3gpp') !== '';
    case 'm4a': return audio.canPlayType('audio/mp4') !== '';
    case 'webm': return audio.canPlayType('audio/webm') !== '';
    case 'mp3': return audio.canPlayType('audio/mpeg') !== '';
    case 'wav': return audio.canPlayType('audio/wav') !== '';
    case 'ogg': return audio.canPlayType('audio/ogg') !== '';
    case 'aac': return audio.canPlayType('audio/aac') !== '';
    default: return true; // Mặc định cho phép thử phát
  }
};

// Custom Audio Player component for voice messages
export const AudioPlayer = ({ url, duration }: { url: string, duration?: number }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isError, setIsError] = useState(false);
  const [formatSupported, setFormatSupported] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Kiểm tra định dạng file khi component mount
  useEffect(() => {
    setFormatSupported(canBrowserPlayFormat(url));
    
    return () => {
      // Cleanup khi component unmount
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    };
  }, [url]);
  
  const togglePlay = () => {
    if (!formatSupported) {
      // Nếu không hỗ trợ, không làm gì cả
      return;
    }
    
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        // Thêm xử lý lỗi khi phát
        audioRef.current.play().catch(err => {
          console.error("Lỗi phát audio:", err);
          setIsError(true);
          setIsPlaying(false);
        });
        setIsPlaying(true);
      }
    }
  };
  
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };
  
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };
  
  const handleError = () => {
    setIsError(true);
    setIsPlaying(false);
    setFormatSupported(false);
  };
  
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  const progress = audioRef.current && audioRef.current.duration 
    ? (currentTime / audioRef.current.duration) * 100 
    : 0;
    
  // Generate wave bars for visualization using the memoized heights
  const waveHeights = React.useMemo(() => {
    const heights = [];
    const totalBars = 30;
    
    for (let i = 0; i < totalBars; i++) {
      // Generate random height for each bar between 3px and 15px
      heights.push(3 + Math.random() * 12);
    }
    
    return heights;
  }, []);
  
  const renderWaveBars = () => {
    const bars = [];
    const totalBars = waveHeights.length;
    
    for (let i = 0; i < totalBars; i++) {
      // Calculate if this bar should be highlighted based on progress
      const isActive = (i / totalBars) * 100 <= progress;
      
      // Add animation class for active bars when playing
      const animationClass = isPlaying && isActive ? 'animate-pulse' : '';
      
      bars.push(
        <div 
          key={i}
          className={`wave-bar ${isActive ? 'bg-blue-500' : 'bg-gray-300'} rounded-full mx-px transition-colors ${animationClass}`}
          style={{ 
            height: `${waveHeights[i]}px`, 
            width: '2px',
            opacity: formatSupported ? 1 : 0.5
          }}
        />
      );
    }
    
    return bars;
  };
    
  return (
    <div className="flex items-center gap-3 w-full py-1">
      <button 
        onClick={togglePlay}
        className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${
          formatSupported && !isError ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-400 text-white cursor-not-allowed'
        } transition-colors`}
        disabled={!formatSupported || isError}
      >
        {isPlaying ? 
          <PauseCircleOutlined style={{ fontSize: '16px' }} /> : 
          <PlayCircleOutlined style={{ fontSize: '16px' }} />
        }
      </button>
      
      <div className="flex-grow">
        {!formatSupported && (
          <div className="text-xs text-red-500 mb-1">
            Định dạng không được hỗ trợ phát trực tiếp
          </div>
        )}
        {isError && formatSupported && (
          <div className="text-xs text-red-500 mb-1">
            Không thể phát file này
          </div>
        )}
        
        <div className="h-5 flex items-center">
          {renderWaveBars()}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{duration ? voiceMessageService.formatAudioDuration(duration) : formatTime(audioRef.current?.duration || 0)}</span>
        </div>
      </div>
      
      <audio 
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
        style={{ display: 'none' }}
        preload="metadata"
      />
    </div>
  );
};

// Custom Video Player component
const VideoPlayer = ({ url, thumbnail }: { url: string, thumbnail?: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(err => {
          console.error("Error playing video:", err);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  return (
    <div className="relative w-full">
      {thumbnail && !isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
          style={{
            backgroundImage: `url(${thumbnail})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="bg-black bg-opacity-50 rounded-full p-3">
            <PlayCircleOutlined style={{ fontSize: '32px', color: 'white' }} />
          </div>
        </div>
      )}
      <video
        ref={videoRef}
        src={url}
        className="w-full rounded"
        controls={isPlaying}
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        poster={!isPlaying ? thumbnail : undefined}
      />
      {!isPlaying && !thumbnail && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <div className="bg-black bg-opacity-50 rounded-full p-3">
            <PlayCircleOutlined style={{ fontSize: '32px', color: 'white' }} />
          </div>
        </div>
      )}
    </div>
  );
};

interface MessageDisplayProps {
  messages: DisplayMessage[];
  currentUserId: string;
  conversation: Conversation | null;
  userCache: Record<string, User>;
  handleImagePreview: (url: string) => void;
  handleDownloadFile: (url: string | undefined, name: string) => void;
  handleReplyMessage: (message: DisplayMessage) => void;
  handleForwardMessage: (message: DisplayMessage) => void;
  scrollToPinnedMessage: (messageId: string) => void;
  getMessageMenu: (message: DisplayMessage) => JSX.Element;
  messageActionLoading: string | null;
  activeMessageMenu: string | null;
  setActiveMessageMenu: (id: string | null) => void;
  dropdownVisible: { [key: string]: boolean };
  setDropdownVisible: (visible: { [key: string]: boolean }) => void;
  hoveredMessageId: string | null;
  setHoveredMessageId: (id: string | null) => void;
  hoverTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
}


const formatDateForSeparator = (timestamp: string) => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) {
    return `Hôm nay, ${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Hôm qua, ${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  } else {
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}/${date.getFullYear()}, ${date
      .getHours()
      .toString()
      .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
};

const shouldShowTimestampSeparator = (
  currentMsg: DisplayMessage,
  prevMsg: DisplayMessage | null
) => {
  if (!prevMsg) return true;
  const currentTime = new Date(currentMsg.timestamp).getTime();
  const prevTime = new Date(prevMsg.timestamp).getTime();
  return currentTime - prevTime >= 300000;
};

const renderMessageStatus = (message: DisplayMessage, isOwn: boolean) => {
  if (!isOwn) return null;
  if (message.isError) {
    return (
      <span className="text-red-500 text-xs ml-1 flex items-center">
        <span className="mr-1">⚠️</span>
        Lỗi
      </span>
    );
  }
  switch (message.sendStatus) {
    case 'sending':
      return (
        <span className="text-gray-400 text-xs ml-1 flex items-center">
          <CheckOutlined className="mr-1" style={{ fontSize: '10px' }} />
          Đang gửi
        </span>
      );
    case 'sent':
      return (
        <span className="text-blue-400 text-xs ml-1 flex items-center">
          <CheckOutlined className="mr-1" style={{ fontSize: '10px' }} />
          Đã gửi
        </span>
      );
    case 'delivered':
      return (
        <span className="text-blue-400 text-xs ml-1 flex items-center">
          <span className="mr-1">✓✓</span>
          Đã nhận
        </span>
      );
    case 'read':
      return (
        <span className="text-blue-500 text-xs ml-1 flex items-center">
          <CheckCircleOutlined className="mr-1" style={{ fontSize: '10px' }} />
          Đã xem
        </span>
      );
    default:
      return (
        <span className="text-blue-400 text-xs ml-1 flex items-center">
          <CheckOutlined className="mr-1" style={{ fontSize: '10px' }} />
          Đã gửi
        </span>
      );
  }
};

// Helper function to render audio message
const renderAudioMessage = (message: DisplayMessage, handleDownloadFile: (url: string | undefined, name: string) => void) => {
  const fileUrl = message.fileUrl || message.attachment?.url || '';
  const fileName = message.fileName || message.attachment?.name || 'audio';
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  const isFormatSupported = canBrowserPlayFormat(fileUrl);

  return (
    <div className="flex flex-col gap-1 rounded-lg">
      <div className="text-xs text-gray-500 ml-10 mb-1">
        Tin nhắn thoại {!isFormatSupported ? `(${fileExtension})` : ''}
      </div>
      <div className="flex items-center">
        <AudioPlayer 
          url={fileUrl} 
          duration={message.audioDuration} 
        />
        <Button
          type={!isFormatSupported ? "primary" : "text"}
          size="small"
          icon={<DownloadOutlined className={isFormatSupported ? "text-gray-500" : ""} />}
          onClick={() =>
            handleDownloadFile(
              message.fileUrl || message.attachment?.downloadUrl || message.attachment?.url,
              fileName
            )
          }
          className={`ml-2 flex items-center justify-center ${isFormatSupported ? "h-8 w-8 hover:bg-gray-100 rounded-full" : ""}`}
        >
          {!isFormatSupported && "Tải xuống"}
        </Button>
      </div>
    </div>
  );
};

// Helper function to convert text with URLs to clickable links
const convertLinksToAnchors = (text: string, isOwn: boolean): React.ReactNode[] => {
  const urlRegex = /\b(https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+\.(com|net|org|io|gov|edu|vn|co))\b/gi;
  
  if (!text) return [<span key="empty"></span>];
  
  const segments: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = urlRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      segments.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex, match.index)}</span>);
    }
    
    // Process the URL
    let url = match[0];
    // Add https protocol if www. is found but no protocol
    if (url.startsWith('www.') && !url.startsWith('http')) {
      url = 'https://' + url;
    }
    // Add https protocol if domain name only without protocol
    if (!url.startsWith('http') && !url.startsWith('www.')) {
      url = 'https://' + url;
    }
    
    segments.push(
      <a 
        key={`link-${match.index}`} 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className={isOwn ? "!text-blue-50 hover:underline font-medium" : "!text-blue-600 hover:underline"}
        onClick={(e) => {
          e.stopPropagation(); // Prevent message selection
        }}
      >
        {match[0]}
      </a>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    segments.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>);
  }
  
  return segments;
};

const MessageDisplay: React.FC<MessageDisplayProps> = ({
  messages,
  currentUserId,
  conversation,
  userCache,
  handleImagePreview,
  handleDownloadFile,
  handleReplyMessage,
  handleForwardMessage,
  scrollToPinnedMessage,
  getMessageMenu,
  messageActionLoading,
  activeMessageMenu,
  setActiveMessageMenu,
  dropdownVisible,
  setDropdownVisible,
  hoveredMessageId,
  setHoveredMessageId,
  hoverTimeoutRef,
}) => {
  const isOwnMessage = (senderId: string) => senderId === currentUserId;
  const shouldShowAvatar = () => true;

  return (
    <div className="space-y-3">
      {messages.map((message, index) => {
        if (!message) return null;
        const isOwn = isOwnMessage(message.sender.id);
        const showAvatar = !isOwn && shouldShowAvatar();
        const showSender = showAvatar && conversation && conversation.isGroup;
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const showTimestamp = shouldShowTimestampSeparator(message, prevMessage);
        const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
        const isLastInSequence =
          !nextMessage ||
          nextMessage.sender.id !== message.sender.id ||
          shouldShowTimestampSeparator(nextMessage, message);
        const isLastMessageFromUser =
          isOwn && messages.findIndex((msg, i) => i > index && msg.sender.id === currentUserId) === -1;
        if (isNotificationMessage(message)) {
          return (
            <React.Fragment key={`${message.id}-${index}`}>
              {showTimestamp && (
                <div className="flex justify-center my-2">
                  <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                    {formatDateForSeparator(message.timestamp)}
                  </div>
                </div>
              )}
              <NotificationMessage
                message={message}
                onViewClick={() => {
                  const pinnedMessageId = message.attachment?.url || '';
                  scrollToPinnedMessage(pinnedMessageId);
                }}
              />
            </React.Fragment>
          );
        }
        return (
          <React.Fragment key={`${message.id}-${index}`}>
            {showTimestamp && (
              <div className="flex justify-center my-2">
                <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                  {formatDateForSeparator(message.timestamp)}
                </div>
              </div>
            )}
            <div
              className={`flex mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
              id={`message-${message.id}`}
              onMouseEnter={() => {
                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                setHoveredMessageId(message.id);
              }}
              onMouseLeave={() => {
                hoverTimeoutRef.current = setTimeout(() => setHoveredMessageId(null), 300);
              }}
            >
              {!isOwn && (
                <div className="flex-shrink-0 mr-2">
                  <Avatar
                    name={message.sender.name}
                    avatarUrl={userCache[message.sender.id]?.urlavatar || ''}
                    size={30}
                    className="rounded-full"
                  />
                </div>
              )}
              <div className="flex flex-col relative group" style={{ maxWidth: 'min(80%)' }}
                onMouseEnter={() => {
                  if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                  setHoveredMessageId(message.id);
                }}
                onMouseLeave={() => {
                  hoverTimeoutRef.current = setTimeout(() => setHoveredMessageId(null), 300);
                }}
              >
                <div
                  className={`absolute right-0 top-0 -mt-8 ${
                    activeMessageMenu === message.id || hoveredMessageId === message.id ? 'flex' : 'hidden group-hover:flex'
                  } items-center space-x-1 bg-white rounded-lg shadow-md px-1 py-0.5 z-10 message-hover-controls ${
                    activeMessageMenu === message.id ? 'active' : ''
                  }`}
                  onMouseEnter={() => {
                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                    setHoveredMessageId(message.id);
                  }}
                  onMouseLeave={() => {
                    hoverTimeoutRef.current = setTimeout(() => setHoveredMessageId(null), 300);
                  }}
                >
                  <Tooltip title="Trả lời">
                    <Button
                      type="text"
                      size="small"
                      icon={<CommentOutlined />}
                      className="text-gray-500 hover:text-blue-500"
                      onClick={e => {
                        e.stopPropagation();
                        e.preventDefault();
                        setActiveMessageMenu(message.id);
                        handleReplyMessage(message);
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="Chia sẻ">
                    <Button
                      type="text"
                      size="small"
                      icon={<ShareAltOutlined />}
                      className="text-gray-500 hover:text-blue-500"
                      onClick={e => {
                        e.stopPropagation();
                        e.preventDefault();
                        setActiveMessageMenu(message.id);
                        handleForwardMessage(message);
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="Tùy chọn khác">
                    <Dropdown
                      overlay={getMessageMenu(message)}
                      trigger={['click']}
                      placement="bottomRight"
                      overlayClassName="message-dropdown-overlay"
                      visible={dropdownVisible[message.id] || false}
                      onVisibleChange={visible => {
                        setDropdownVisible({ ...dropdownVisible, [message.id]: visible });
                        if (visible) {
                          setActiveMessageMenu(message.id);
                        } else {
                          setTimeout(() => {
                            if (activeMessageMenu === message.id) {
                              setActiveMessageMenu(null);
                            }
                          }, 200);
                        }
                      }}
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<MoreOutlined />}
                        className="text-gray-500 hover:text-blue-500"
                        loading={messageActionLoading === message.id}
                        onClick={e => {
                          e.stopPropagation();
                        }}
                        onMouseEnter={() => {
                          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                          setHoveredMessageId(message.id);
                        }}
                        onMouseLeave={() => {
                          hoverTimeoutRef.current = setTimeout(() => setHoveredMessageId(null), 300);
                        }}
                      />
                    </Dropdown>
                  </Tooltip>
                </div>
                {showSender && !isOwn && (
                  <div className="text-xs mb-1 ml-1 text-gray-600 truncate">
                    {message.sender.name}
                  </div>
                )}
                {message.isReply && message.replyData && (
                  <ReplyPreview
                    replyData={message.replyData}
                    isOwnMessage={isOwn}
                    messageReplyId={message.messageReplyId}
                    onReplyClick={(msgId) => scrollToPinnedMessage(msgId)}
                    userCache={userCache}
                  />
                )}
                <div 
                  className={`px-3 py-2 rounded-2xl ${
                    isOwn
                      ? message.isError
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-500 text-white rounded-tr-none'
                      : 'bg-gray-100 text-gray-800 rounded-tl-none'
                  } overflow-hidden ${message.isReply ? 'rounded-tl-none rounded-tr-none' : ''}`}
                  style={{ wordBreak: 'break-word', maxWidth: '100%' }}
                  onClick={() => setActiveMessageMenu(message.id)}
                >
                  {message.isRecall ? (
                    <div className={`text-xs italic ${isOwn ? 'text-blue-200' : 'text-gray-500'}`}>
                      Tin nhắn đã thu hồi
                    </div>
                  ) : isNotificationMessage(message) ? (
                    <NotificationMessage 
                      message={message}
                      onViewClick={() => {
                        if (message.messageReplyId) {
                          scrollToPinnedMessage(message.messageReplyId);
                        }
                      }} 
                    />
                  ) : message.type === 'text-with-image' ? (
                    <div className="relative">
                      <p className="text-sm whitespace-pre-wrap break-words mb-2">{message.content}</p>
                      <img
                        src={message.fileUrl || (message.attachment && message.attachment.url) || ''}
                        alt="Attachment"
                        className="rounded max-w-full cursor-pointer"
                        style={{ maxHeight: '200px' }}
                        onClick={() => handleImagePreview(message.fileUrl || (message.attachment && message.attachment.url) || '')}
                        onLoad={() => {
                          if (index === messages.length - 1) {
                            setTimeout(() => {
                              const element = document.getElementById(`message-${message.id}`);
                              element?.scrollIntoView({ behavior: 'smooth' });
                            }, 100);
                          }
                        }}
                      />
                      <div className="text-right mt-1">
                        <Button
                          type="primary"
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() =>
                            handleDownloadFile(
                              message.fileUrl || message.attachment?.downloadUrl || message.attachment?.url,
                              message.fileName || message.attachment?.name || 'image'
                            )
                          }
                          className="inline-flex items-center text-xs shadow-sm"
                        ></Button>
                      </div>
                    </div>
                  ) : message.type === 'image' ? (
                    <div className="relative">
                      <img
                        src={message.fileUrl || (message.attachment && message.attachment.url) || ''}
                        alt="Attachment"
                        className="rounded max-w-full cursor-pointer"
                        style={{ maxHeight: '200px' }}
                        onClick={() => handleImagePreview(message.fileUrl || (message.attachment && message.attachment.url) || '')}
                        onLoad={() => {
                          if (index === messages.length - 1) {
                            setTimeout(() => {
                              const element = document.getElementById(`message-${message.id}`);
                              element?.scrollIntoView({ behavior: 'smooth' });
                            }, 100);
                          }
                        }}
                      />
                      <div className="text-right mt-1">
                        <Button
                          type="primary"
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() =>
                            handleDownloadFile(
                              message.fileUrl ||
                                (message.attachments && message.attachments.length > 0
                                  ? message.attachments[0].downloadUrl || message.attachments[0].url
                                  : message.attachment?.downloadUrl || message.attachment?.url),
                              message.fileName || message.attachment?.name || 'image'
                            )
                          }
                          className="inline-flex items-center text-xs shadow-sm"
                        ></Button>
                      </div>
                    </div>
                  ) : message.type === 'file' ? (
                    isAudioFile(message) ? 
                      renderAudioMessage(message, handleDownloadFile)
                    : (
                    <div className={`flex items-center gap-2 ${isOwn ? 'bg-blue-400' : 'bg-gray-50'} p-2 rounded-lg`}>
                      <div className="text-xl mr-2">
                        {message.attachment?.type?.startsWith('image/') ? (
                          <FileImageOutlined className={`${isOwn ? 'text-white' : 'text-blue-500'}`} />
                        ) : message.attachment?.type?.startsWith('audio/') ? (
                          <AudioOutlined className={`${isOwn ? 'text-white' : 'text-green-500'}`} />
                        ) : message.attachment?.type?.startsWith('video/') ? (
                          <VideoCameraOutlined className={`${isOwn ? 'text-white' : 'text-purple-500'}`} />
                        ) : message.attachment?.type?.includes('word') || message.attachment?.name?.endsWith('.doc') || message.attachment?.name?.endsWith('.docx') ? (
                          <FileWordOutlined className={`${isOwn ? 'text-white' : 'text-blue-500'}`} />
                        ) : message.attachment?.type?.includes('excel') || message.attachment?.name?.endsWith('.xls') || message.attachment?.name?.endsWith('.xlsx') ? (
                          <FileExcelOutlined className={`${isOwn ? 'text-white' : 'text-green-500'}`} />
                        ) : message.attachment?.type?.includes('powerpoint') || message.attachment?.name?.endsWith('.ppt') || message.attachment?.name?.endsWith('.pptx') ? (
                          <FilePptOutlined className={`${isOwn ? 'text-white' : 'text-red-500'}`} />
                        ) : message.attachment?.type?.includes('zip') || message.attachment?.name?.endsWith('.zip') || message.attachment?.name?.endsWith('.rar') || message.attachment?.name?.endsWith('.7z') ? (
                          <FileZipOutlined className={`${isOwn ? 'text-white' : 'text-orange-500'}`} />
                        ) : message.attachment?.type?.startsWith('application/pdf') ? (
                          <FilePdfOutlined className={`${isOwn ? 'text-white' : 'text-red-500'}`} />
                        ) : (
                          <FileOutlined className={`${isOwn ? 'text-white' : 'text-gray-500'}`} />
                        )}
                      </div>
                      <div className="flex-grow">
                        <div className="text-sm font-medium truncate">
                          {message.fileName || message.attachment?.name || message.content}
                        </div>
                        <div className={`text-xs ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                          {message.fileSize
                            ? `${Math.round(message.fileSize / 1024)} KB`
                            : message.attachment?.size
                            ? `${Math.round(message.attachment.size / 1024)} KB`
                            : ''}
                        </div>
                      </div>
                      <Button
                        type="primary"
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={() =>
                          handleDownloadFile(
                            message.fileUrl || message.attachment?.downloadUrl || message.attachment?.url,
                            message.fileName || message.attachment?.name || 'file'
                          )
                        }
                        className="inline-flex items-center text-xs shadow-sm ml-2"
                      ></Button>
                    </div>
                    )
                  ) : message.type === 'audio' || isAudioFile(message) ? (
                    renderAudioMessage(message, handleDownloadFile)
                  ) : message.type === 'video' ? (
                    <div className="relative">
                      <div className="video-player-container rounded-lg overflow-hidden" style={{ maxWidth: '300px' }}>
                        {isAudioFile(message) ? 
                          renderAudioMessage(message, handleDownloadFile)
                        : (
                          <VideoPlayer
                            url={message.fileUrl || (message.attachment && message.attachment.url) || ''}
                            thumbnail={message.attachment?.thumbnail}
                          />
                        )}
                      </div>
                      <div className="text-right mt-1">
                        <Button
                          type="primary"
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() =>
                            handleDownloadFile(
                              message.fileUrl || message.attachment?.downloadUrl || message.attachment?.url,
                              message.fileName || message.attachment?.name || (isAudioFile(message) ? 'audio' : 'video')
                            )
                          }
                          className="inline-flex items-center text-xs shadow-sm"
                        ></Button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {isLikeMessage(message) ? 
                          convertLinksToAnchors(message.content || '', isOwn) : 
                          message.content}
                      </p>
                    </div>
                  )}
                </div>
                {isLastInSequence && (
                  <div
                    className={`flex text-xs text-gray-500 mt-1 ${
                      isOwn ? 'justify-end items-center' : 'justify-start'
                    }`}
                  >
                    <span>{formatMessageTime(message.timestamp)}</span>
                    {isOwn && !message.isRecall && (
                      <span className="ml-2">
                        {message.sendStatus === 'read'
                          ? isLastMessageFromUser
                            ? renderMessageStatus(message, isOwn)
                            : (
                                <span className="text-blue-400 text-xs flex items-center">
                                  <CheckOutlined className="mr-1" style={{ fontSize: '10px' }} />
                                </span>
                              )
                          : renderMessageStatus(message, isOwn)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default MessageDisplay;