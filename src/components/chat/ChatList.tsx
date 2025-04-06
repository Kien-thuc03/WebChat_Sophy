import React, { useEffect, useState } from "react";
import { List, Avatar } from "antd";
import Header from "../header/Header";
import { useConversations } from "../../features/chat/hooks/useConversations";
import ErrorBoundary from "../common/ErrorBoundary";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { formatMessageTime } from "../../utils/dateUtils";
import { Conversation } from "../../features/chat/types/conversationTypes";
import { getUserById } from "../../api/API";
import { User } from "../../features/auth/types/authTypes";
import GroupAvatar from "./GroupAvatar";

const formatGroupName = (members: string[] = []) => {
  if (!members.length) return "Nhóm không có thành viên";
  const displayNames = members.slice(0, 3).join(", ");
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
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});

  const getDisplayName = async (chat: Conversation) => {
    if (chat.isGroup) {
      return chat.groupName || formatGroupName(chat.groupMembers);
    }
    if (chat.receiverId) {
      try {
        if (!userCache[chat.receiverId]) {
          const userData = await getUserById(chat.receiverId);
          await setUserCache((prev) => ({
            ...prev,
            [chat.receiverId as string]: userData,
          }));
          return userData?.fullname || chat.receiverId;
        }
        return userCache[chat.receiverId]?.fullname || chat.receiverId;
      } catch (error) {
        console.error("Lỗi khi lấy thông tin người dùng:", error);
        return chat.receiverId;
      }
    }
    return "Private Chat";
  };

  useEffect(() => {
    const fetchUserInfo = async () => {
      for (const chat of conversations) {
        // Fetch group members' info
        if (chat.isGroup && chat.groupMembers) {
          for (const memberId of chat.groupMembers) {
            if (!userCache[memberId]) {
              try {
                const userData = await getUserById(memberId);
                await setUserCache((prev) => ({
                  ...prev,
                  [memberId]: userData
                }));
                
                // Lưu avatar URL của thành viên
                if (userData?.urlavatar) {
                  setUserAvatars(prev => ({
                    ...prev,
                    [memberId]: userData.urlavatar
                  }));
                }
              } catch (error) {
                console.warn(`Không thể tải thông tin thành viên ${memberId}`);
              }
            }
          }
        }
        const displayName = await getDisplayName(chat);
        setDisplayNames((prev) => ({
          ...prev,
          [chat.conversationId]: displayName,
        }));

        // Fetch sender info for last message only if senderId exists
        if (
          chat.lastMessage?.senderId &&
          !userCache[chat.lastMessage.senderId]
        ) {
          try {
            const userData = await getUserById(chat.lastMessage.senderId);
            await setUserCache((prev) => ({
              ...prev,
              [chat.lastMessage?.senderId as string]: userData,
            }));
          } catch (error) {
            console.warn(
              `Không thể tải thông tin người gửi ${chat.lastMessage.senderId}`
            );
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
            className="flex items-center gap-3 hover:bg-gray-50 cursor-pointer px-3 py-2"
            onClick={() => onSelectConversation(chat)}
          >
            {/* Avatar section */}
            <div className="relative shrink-0 pl-2">
              {chat.isGroup && chat.groupMembers.length > 0 ? (
                <GroupAvatar 
                  members={chat.groupMembers}
                  userAvatars={userAvatars}
                  size={40}
                  className="cursor-pointer"
                  groupAvatarUrl={chat.groupAvatarUrl || undefined}
                />
              ) : (
                <Avatar
                  src={userCache[chat.receiverId || '']?.urlavatar || "/images/default-avatar.png"}
                  size={40}
                  className="cursor-pointer"
                />
              )}
            </div>

            {/* Content section */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <span className="truncate font-semibold text-gray-900">
                  {displayNames[chat.conversationId] ||
                    chat.receiverId ||
                    "Private Chat"}
                </span>
                <div className="relative group">
                  <div className="relative group">
                    <span className="text-xs text-gray-500 hover:text-blue-500 cursor-pointer">
                      {chat.lastMessage && formatMessageTime(chat.lastMessage.createdAt)}
                    </span>
                    <div className="absolute hidden group-hover:block z-20 w-48 bg-white shadow-lg rounded-md border border-gray-200 right-0">
                      <div className="py-1">
                        <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                          Ghim hội thoại
                        </div>
                        <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                          Phân loại
                        </div>
                        <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                          Tắt thông báo
                        </div>
                        <div className="border-t border-gray-200"></div>
                        <div className="px-4 py-2 text-sm text-red-500 hover:bg-gray-100 cursor-pointer">
                          Xóa hội thoại
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute hidden group-hover:block z-20 w-48 bg-white shadow-lg rounded-md border border-gray-200 right-0">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                        Ghim hội thoại
                      </div>
                      <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                        Phân loại
                      </div>
                      <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                        Tắt thông báo
                      </div>
                      <div className="border-t border-gray-200"></div>
                      <div className="px-4 py-2 text-sm text-red-500 hover:bg-gray-100 cursor-pointer">
                        Xóa hội thoại
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center text-sm text-gray-500 truncate">
                {chat.lastMessage?.senderId && (
                  <span className="mr-1 truncate">
                    {userCache[chat.lastMessage.senderId]?.fullname ||
                      chat.lastMessage.senderId}
                    :
                  </span>
                )}
                <span className="truncate">
                  {chat.lastMessage?.content || "Chưa có tin nhắn"}
                </span>
              </div>
            </div>

            {/* Actions section */}
            <div className="shrink-0">
              <i className="fa fa-ellipsis-h text-gray-400 cursor-pointer hover:text-gray-600"></i>
            </div>
          </List.Item>
        )}
        locale={{
          emptyText: (
            <div className="p-4 text-center text-gray-500">
              Không có hội thoại nào
            </div>
          ),
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
