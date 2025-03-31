import React, { useEffect, useState } from "react";
import { List, Avatar } from "antd";
import Header from "../header/Header";
import { useConversations } from "../../features/chat/hooks/useConversations";
import ErrorBoundary from '../common/ErrorBoundary';
import { useAuth } from "../../features/auth/hooks/useAuth";
import { formatMessageTime } from "../../utils/dateUtils";
import { Conversation } from "../../features/chat/types/conversationTypes";
import { getUserById } from "../../api/API";
import { User } from "../../features/auth/types/authTypes";

const formatGroupName = (members: string[] = []) => {
  if (!members.length) return 'Nhóm không có thành viên';
  const displayNames = members.slice(0, 3).join(', ');
  return members.length > 3 ? `${displayNames}...` : displayNames;
};

interface ChatListProps {
  onSelectConversation: (conversation: any) => void;
}

const ChatList: React.FC<ChatListProps> = ({ onSelectConversation }) => {
  const conversations = useConversations();
  const { user } = useAuth();
  const [userCache, setUserCache] = useState<Record<string, User>>({});
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});

  const getDisplayName = async (chat: Conversation) => {
    if (chat.isGroup) {
      return chat.groupName || formatGroupName(chat.groupMembers);
    }
    if (chat.receiverId) {
      try {
        if (!userCache[chat.receiverId]) {
          const userData = await getUserById(chat.receiverId);
          await setUserCache(prev => ({ ...prev, [chat.receiverId as string]: userData }));
          return userData?.fullname || chat.receiverId;
        }
        return userCache[chat.receiverId]?.fullname || chat.receiverId;
      } catch (error) {
        console.error('Lỗi khi lấy thông tin người dùng:', error);
        return chat.receiverId;
      }
    }
    return 'Private Chat';
  };

  useEffect(() => {
    const fetchUserInfo = async () => {
      for (const chat of conversations) {
        const displayName = await getDisplayName(chat);
        setDisplayNames(prev => ({
          ...prev,
          [chat.conversationId]: displayName
        }));

        // Fetch sender info for last message only if senderId exists
        if (chat.lastMessage?.senderId && !userCache[chat.lastMessage.senderId]) {
          try {
            const userData = await getUserById(chat.lastMessage.senderId);
            await setUserCache(prev => ({...prev, [chat.lastMessage?.senderId as string]: userData }));
          } catch (error) {
            console.warn(`Không thể tải thông tin người gửi ${chat.lastMessage.senderId}`);
          }
        }
      }
    };

    fetchUserInfo();
  }, [conversations]);

  return (
    <div className="chat-list w-80 bg-white border-r">
      <Header />
      <List
        className="overflow-y-auto h-[calc(100vh-64px)]"
        dataSource={conversations}
        renderItem={(chat) => (
          <List.Item
            className="grid grid-cols-[60px,auto,5px,22px] gap-0 hover:bg-gray-50 cursor-pointer items-center px-2 py-3"
            onClick={() => onSelectConversation(chat)}
          >
            {/* Avatar section */}
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="flex items-center justify-center">
                  {chat.isGroup && chat.groupMembers && chat.groupMembers.length > 0 ? (
                    <Avatar.Group
                      max={{ count: 4 }}
                      size={48}
                      className="cursor-pointer"
                    >
                      {chat.groupMembers.map((member, index) => (
                        <Avatar
                          key={index}
                          src={`/images/default-avatar.png`}
                          size={48}
                          draggable={false}
                        />
                      ))}
                    </Avatar.Group>
                  ) : (
                    <Avatar 
                      src={'/images/default-avatar.png'}
                      size={48}
                      draggable={false}
                      className="cursor-pointer"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Content section */}
            <div className="flex flex-col min-w-0">
              <div className="truncate font-semibold text-gray-900">
                {displayNames[chat.conversationId] || chat.receiverId || 'Private Chat'}
              </div>
              <div className="flex items-center text-sm text-gray-500 truncate">
                {chat.lastMessage?.senderId && (
                  <span className="mr-1 truncate">{userCache[chat.lastMessage.senderId]?.full_name || userCache[chat.lastMessage.senderId]?.fullname || chat.lastMessage.senderId}:</span>
                )}
                <span className="truncate">{chat.lastMessage?.content || 'Chưa có tin nhắn'}</span>
              </div>
            </div>

            {/* Time section */}
            <div className="text-xs text-gray-500">
              {chat.lastMessage && formatMessageTime(chat.lastMessage.createdAt)}
            </div>

            {/* Actions section */}
            <div className="relative">
              <button 
                type="button" 
                title="Thêm" 
                className="p-1 hover:bg-gray-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <i className="fa fa-ellipsis-h text-gray-400"></i>
              </button>
            </div>
          </List.Item>
        )}
        locale={{
          emptyText: (
            <div className="p-4 text-center text-gray-500">
              Không có hội thoại nào
            </div>
          )
        }}
      />
    </div>
  );
};

const ChatListWithErrorBoundary: React.FC<ChatListProps> = (props) => {
  return (
    <ErrorBoundary>
      <ChatList {...props} />
    </ErrorBoundary>
  );
};

export default ChatListWithErrorBoundary;