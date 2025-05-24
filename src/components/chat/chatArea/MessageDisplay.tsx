import React, { useState, useRef } from 'react';
import { Button } from 'antd';
import { formatMessageTime } from "../../../utils/dateUtils";
import { Avatar } from '../../common/Avatar';
import { DisplayMessage } from '../../../features/chat/types/chatTypes';
import { Conversation } from '../../../features/chat/types/conversationTypes';
import { User } from '../../../features/auth/types/authTypes';
import { ReplyPreview } from './PreviewReply';
import NotificationMessage from './NotificationMessage';
import ReactPlayer from 'react-player';
import {
  DownloadOutlined,
  FileImageOutlined,
  AudioOutlined,
  VideoCameraOutlined,
  FileOutlined,
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

// Helper function to check if a message is a webm audio file
const isWebmAudioFile = (message: DisplayMessage): boolean => {
  // Kiểm tra tên file có chứa "voice_message" hoặc "audio" và có đuôi .webm
  const hasAudioNamePattern = Boolean(
    (message.fileName?.match(/voice_message_|audio|tin_nhắn_thoại|voice|ghi_âm/i) && message.fileName?.match(/\.webm$/i)) ||
    (message.attachment?.name?.match(/voice_message_|audio|tin_nhắn_thoại|voice|ghi_âm/i) && message.attachment?.name?.match(/\.webm$/i))
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
  
  // Kiểm tra kích thước file nhỏ (thường là audio) và có đuôi .webm
  const isSmallWebmFile = Boolean(
    message.fileSize && message.fileSize < 1024 * 1024 && 
    (Boolean(message.fileName?.match(/\.webm$/i)) || Boolean(message.attachment?.name?.match(/\.webm$/i)))
  );
  
  // Kiểm tra nếu có audioDuration (thường chỉ có ở voice messages)
  const hasAudioDuration = Boolean(message.audioDuration);
  
  // Kiểm tra nếu file có đuôi .webm và được gửi từ recorder
  const isWebmFromRecorder = Boolean(
    (message.fileName?.match(/\.webm$/i) || message.attachment?.name?.match(/\.webm$/i)) &&
    (message.content?.includes('voice message') || message.content?.includes('tin nhắn thoại'))
  );
  
  return hasAudioNamePattern || hasAudioType || isSmallWebmFile || isSmallWebmVideo || hasAudioDuration || isWebmFromRecorder;
};

// Custom Audio Player component for voice messages
export const AudioPlayer = ({ url, duration }: { url: string, duration?: number }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Use useMemo to generate wave heights only once
  const waveHeights = React.useMemo(() => {
    const heights = [];
    const totalBars = 30;
    
    for (let i = 0; i < totalBars; i++) {
      // Generate random height for each bar between 3px and 15px
      heights.push(3 + Math.random() * 12);
    }
    
    return heights;
  }, []);
  
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
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
  
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  const progress = audioRef.current && audioRef.current.duration 
    ? (currentTime / audioRef.current.duration) * 100 
    : 0;
    
  // Generate wave bars for visualization using the memoized heights
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
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
      >
        {isPlaying ? 
          <PauseCircleOutlined style={{ fontSize: '16px' }} /> : 
          <PlayCircleOutlined style={{ fontSize: '16px' }} />
        }
      </button>
      
      <div className="flex-grow">
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
        style={{ display: 'none' }}
        preload="metadata"
      />
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
  return (
    <div className="flex flex-col gap-1 rounded-lg">
      <div className="text-xs text-gray-500 ml-10 mb-1">Tin nhắn thoại</div>
      <div className="flex items-center">
        <AudioPlayer 
          url={message.fileUrl || message.attachment?.url || ''} 
          duration={message.audioDuration} 
        />
        <Button
          type="text"
          size="small"
          icon={<DownloadOutlined className="text-gray-500" />}
          onClick={() =>
            handleDownloadFile(
              message.fileUrl || message.attachment?.downloadUrl || message.attachment?.url,
              message.fileName || message.attachment?.name || 'audio.webm'
            )
          }
          className="ml-2 flex items-center justify-center h-8 w-8 hover:bg-gray-100 rounded-full"
        />
      </div>
    </div>
  );
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
              <div className={`message-bubble ${isOwn ? 'own-message' : 'other-message'}`}>
                {message.isReply && message.replyData && (
                  <ReplyPreview
                    replyData={message.replyData}
                    isOwnMessage={isOwn}
                    messageReplyId={message.messageReplyId}
                    onReplyClick={(msgId) => scrollToPinnedMessage(msgId)}
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
                    isWebmAudioFile(message) ? 
                      renderAudioMessage(message, handleDownloadFile)
                    : (
                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                      <div className="text-xl mr-2">
                        {message.attachment?.type?.startsWith('image/') ? (
                          <FileImageOutlined className="text-blue-500" />
                        ) : message.attachment?.type?.startsWith('audio/') ? (
                          <AudioOutlined className="text-green-500" />
                        ) : message.attachment?.type?.startsWith('video/') ? (
                          <VideoCameraOutlined className="text-purple-500" />
                        ) : (
                          <FileOutlined className="text-gray-500" />
                        )}
                      </div>
                      <div className="flex-grow">
                        <div className="text-sm font-medium truncate">
                          {message.fileName || message.attachment?.name || message.content}
                        </div>
                        <div className="text-xs text-gray-500">
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
                  ) : message.type === 'audio' || isWebmAudioFile(message) ? (
                    renderAudioMessage(message, handleDownloadFile)
                  ) : message.type === 'video' ? (
                    <div className="relative">
                      <div className="video-player-container rounded-lg overflow-hidden" style={{ maxWidth: '300px' }}>
                        {isWebmAudioFile(message) ? 
                          renderAudioMessage(message, handleDownloadFile)
                        : (
                          <ReactPlayer
                            url={message.fileUrl || (message.attachment && message.attachment.url) || ''}
                            width="100%"
                            height="auto"
                            controls={true}
                            light={message.attachment && message.attachment.thumbnail ? message.attachment.thumbnail : true}
                            pip={false}
                            playing={false}
                            className="video-player"
                            config={{
                              file: {
                                attributes: {
                                  controlsList: 'nodownload',
                                  onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
                                },
                              },
                            }}
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
                              message.fileName || message.attachment?.name || (isWebmAudioFile(message) ? 'audio.webm' : 'video')
                            )
                          }
                          className="inline-flex items-center text-xs shadow-sm"
                        ></Button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
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