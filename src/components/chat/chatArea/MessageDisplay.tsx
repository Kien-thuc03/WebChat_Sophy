import React from 'react';
import { Button, Tooltip, Dropdown } from 'antd';
import { formatMessageTime } from "../../../utils/dateUtils";
import { Avatar } from '../../common/Avatar';
import { DisplayMessage } from '../../../features/chat/types/chatTypes';
import { Conversation } from '../../../features/chat/types/conversationTypes';
import { User } from '../../../features/auth/types/authTypes';
import { ReplyPreview } from './PreviewReply';
import NotificationMessage from './NotificationMessage';
import ReactPlayer from 'react-player';
import {
  CommentOutlined,
  ShareAltOutlined,
  MoreOutlined,
  DownloadOutlined,
  FileImageOutlined,
  AudioOutlined,
  VideoCameraOutlined,
  FileOutlined,
  CheckOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

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
        if (message.type === 'notification') {
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
                  <div className="mb-1 rounded-t-md overflow-hidden">
                    <div className={`${isOwn ? 'bg-blue-400' : 'bg-gray-200'} bg-opacity-60 rounded-t-md`}>
                      <ReplyPreview
                        replyData={message.replyData}
                        isOwnMessage={isOwn}
                        messageReplyId={message.messageReplyId}
                        onReplyClick={(msgId: string) => {
                          setTimeout(() => scrollToPinnedMessage(msgId), 0);
                        }}
                      />
                    </div>
                  </div>
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
                      Tin nhắn đã bị thu hồi
                    </div>
                  ) : message.type === 'image' ? (
                    <div className="relative">
                      <img
                        src={message.fileUrl || message.content}
                        alt="Hình ảnh"
                        className="max-w-full max-h-60 rounded-lg cursor-pointer"
                        onClick={() => handleImagePreview(message.fileUrl || message.content)}
                        onError={e => {
                          (e.currentTarget as HTMLImageElement).onerror = null;
                          (e.currentTarget as HTMLImageElement).src = '/images/image-placeholder.png';
                        }}
                      />
                      <div className="text-right mt-1">
                        <Button
                          type="primary"
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => handleDownloadFile(message.fileUrl || message.content, 'image')}
                          className="inline-flex items-center text-xs shadow-sm"
                        ></Button>
                      </div>
                    </div>
                  ) : message.type === 'text-with-image' ? (
                    <div className="flex flex-col">
                      <p className="text-sm whitespace-pre-wrap break-words mb-2">{message.content}</p>
                      <div className="relative">
                        <img
                          src={
                            message.fileUrl ||
                            (message.attachments && message.attachments.length > 0
                              ? message.attachments[0].url
                              : message.attachment?.url || undefined)
                          }
                          alt="Hình ảnh đính kèm"
                          className="max-w-full max-h-60 rounded-lg cursor-pointer"
                          onClick={() =>
                            handleImagePreview(
                              message.fileUrl ||
                                (message.attachments && message.attachments.length > 0
                                  ? message.attachments[0].url
                                  : message.attachment?.url || '')
                            )
                          }
                          onError={e => {
                            (e.currentTarget as HTMLImageElement).onerror = null;
                            (e.currentTarget as HTMLImageElement).src = '/images/image-placeholder.png';
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
                    </div>
                  ) : message.type === 'file' ? (
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
                  ) : message.type === 'video' ? (
                    <div className="relative">
                      <div className="video-player-container rounded-lg overflow-hidden" style={{ maxWidth: '300px' }}>
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
                      </div>
                      <div className="text-right mt-1">
                        <Button
                          type="primary"
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() =>
                            handleDownloadFile(
                              message.fileUrl || message.attachment?.downloadUrl || message.attachment?.url,
                              message.fileName || message.attachment?.name || 'video'
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