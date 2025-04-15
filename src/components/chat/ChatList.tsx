import React, { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisH, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { List, Spin } from "antd";
import Header from "../header/Header";
import { Avatar } from "../common/Avatar";
import { useConversationContext } from "../../features/chat/context/ConversationContext";
import ErrorBoundary from "../common/ErrorBoundary";
import { formatRelativeTime } from "../../utils/dateUtils";
import ChatNav from "./ChatNav";
import GroupAvatar from "./GroupAvatar";
import LabelModal from "./modals/LabelModal";
import NotificationModal from "./modals/NotificationModal";
import AutoDeleteModal from "./modals/AutoDeleteModal";
import { Conversation } from "../../features/chat/types/conversationTypes";
import { useLanguage } from "../../features/auth/context/LanguageContext";
import { getUserById } from "../../api/API";
import { User } from "../../features/auth/types/authTypes";

interface ChatListProps {
  onSelectConversation: (conversation: Conversation) => void;
}

const ChatList: React.FC<ChatListProps> = ({ onSelectConversation }) => {
  const { conversations, userCache, displayNames, userAvatars, isLoading } =
    useConversationContext();
  const { t } = useLanguage();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isAutoDeleteModalOpen, setIsAutoDeleteModalOpen] = useState(false);
  const [localUserCache, setLocalUserCache] = useState<Record<string, User>>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // USER == creator = receiver = receiverId
  // USER == receiver = receiver = creatorId
  
  /**
   * Gets the correct user ID to display for a conversation
   * @param conversation The conversation object
   * @returns The ID of the other user in the conversation
   */
  const getOtherUserId = (conversation: Conversation): string => {
    // Get current user ID from localStorage (or any authentication method you use)
    const currentUserId = localStorage.getItem('userId') || '';
    
    // If it's a group chat, there's no single "other user"
    if (conversation.isGroup) {
      return '';
    }
    
    // If the current user is the creator, return the receiverId
    if (currentUserId === conversation.creatorId) {
      return conversation.receiverId || '';
    }
    
    // If the current user is the receiver, return the creatorId
    if (currentUserId === conversation.receiverId) {
      return conversation.creatorId;
    }
    
    // Fallback: Return receiverId if we can't determine
    return conversation.receiverId || conversation.creatorId;
  };

  /**
   * Gets the appropriate display name for a conversation
   * @param conversation The conversation object
   * @returns The display name to use for the conversation
   */
  const getConversationName = (conversation: Conversation): string => {
    // For group chats, return the group name or display a formatted list of members
    if (conversation.isGroup) {
      if (conversation.groupName) {
        return conversation.groupName;
      }
      
      // Format group members (up to 3 names)
      const memberNames = conversation.groupMembers
        .slice(0, 3)
        .map(memberId => {
          const user = userCache[memberId] || localUserCache[memberId];
          return user?.fullname || "User";
        })
        .join(", ");
        
      return conversation.groupMembers.length > 3
        ? `${memberNames}...`
        : memberNames || "Nhóm";
    }
    
    // For individual chats, display the name of the other user
    const otherUserId = getOtherUserId(conversation);
    const user = userCache[otherUserId] || localUserCache[otherUserId];
    return user?.fullname || otherUserId || t.private_chat || "Private Chat";
  };

  /**
   * Gets the appropriate avatar URL for a conversation
   * @param conversation The conversation object
   * @returns The avatar URL to use for the conversation
   */
  const getConversationAvatar = (conversation: Conversation): string => {
    // For group chats, return the group avatar URL if available
    if (conversation.isGroup) {
      return conversation.groupAvatarUrl || '';
    }
    
    // For individual chats, return the avatar of the other user
    const otherUserId = getOtherUserId(conversation);
    const user = userCache[otherUserId] || localUserCache[otherUserId];
    return user?.urlavatar || '';
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setActiveMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load other user data for conversations when needed
  useEffect(() => {
    const loadUserData = async () => {
      // Get current user ID
      const currentUserId = localStorage.getItem('userId') || '';
      
      // Process each conversation
      for (const conversation of conversations) {
        // For individual chats, load the other user's data
        if (!conversation.isGroup) {
          const otherUserId = getOtherUserId(conversation);
          
          // If we don't have this user's data in cache, fetch it
          if (otherUserId && !userCache[otherUserId] && !localUserCache[otherUserId]) {
            try {
              const userData = await getUserById(otherUserId);
              if (userData) {
                // Add user to local cache
                setLocalUserCache(prev => ({
                  ...prev,
                  [otherUserId]: userData
                }));
              }
            } catch (error) {
              console.error(`Failed to load data for user ${otherUserId}:`, error);
            }
          }
        }
      }
    };
    
    loadUserData();
  }, [conversations, userCache, localUserCache]);

  return (
    <div className="chat-list w-80 bg-white dark:bg-gray-900 border-r dark:border-gray-100 h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0">
        <Header />
        <ChatNav />
      </div>
      
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800">
          <Spin size="large" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">Đang tải danh sách hội thoại...</p>
        </div>
      ) : (
        <List
          className="overflow-y-auto flex-1"
          dataSource={conversations}
          renderItem={(chat) => (
            <List.Item
              className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer px-3 py-2"
              onClick={() => onSelectConversation(chat)}>
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
                    name={userCache[getOtherUserId(chat)]?.fullname || "User"}
                    avatarUrl={getConversationAvatar(chat)}
                    size={40}
                    className="cursor-pointer"
                  />
                )}
              </div>

              {/* Content section */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center relative group">
                  <span className="truncate font-semibold text-gray-900 dark:text-gray-100">
                    {getConversationName(chat)}
                  </span>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400 group-hover:opacity-0 transition-opacity duration-200">
                      {chat.lastMessage &&
                        formatRelativeTime(chat.lastMessage.createdAt)}
                    </span>
                    <div className="absolute right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        ref={buttonRef}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        title={t.more || "Thêm"}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu(
                            activeMenu === chat.conversationId
                              ? null
                              : chat.conversationId
                          );
                        }}>
                        <FontAwesomeIcon
                          icon={faEllipsisH}
                          className="text-gray-600 dark:text-gray-300"
                        />
                      </button>
                      <div
                        ref={menuRef}
                        className={`absolute z-20 w-50 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-600 right-0 mt-1 ${
                          activeMenu === chat.conversationId ? "block" : "hidden"
                        }`}>
                        <div className="py-1">
                          <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                            {t.pin_conversation || "Ghim hội thoại"}
                          </div>
                          <div className="border-t border-gray-200 dark:border-gray-600"></div>
                          <div
                            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between"
                            onClick={() => {
                              setSelectedConversation(chat.conversationId);
                              setIsLabelModalOpen(true);
                              setActiveMenu(null);
                            }}>
                            <span>{t.label || "Phân loại"}</span>
                            <FontAwesomeIcon
                              icon={faChevronRight}
                              className="ml-1"
                            />
                          </div>
                          <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                            {t.mark_unread || "Đánh dấu chưa đọc"}
                          </div>
                          <div className="border-t border-gray-200 dark:border-gray-600"></div>
                          <div
                            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between"
                            onClick={() => {
                              setSelectedConversation(chat.conversationId);
                              setIsNotificationModalOpen(true);
                              setActiveMenu(null);
                            }}>
                            <span>
                              {t.turn_off_notifications || "Tắt thông báo"}
                            </span>
                            <FontAwesomeIcon
                              icon={faChevronRight}
                              className="ml-1"
                            />
                          </div>
                          <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between">
                            {t.hide_chat || "Ẩn trò chuyện"}
                          </div>
                          <div
                            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between"
                            onClick={() => {
                              setSelectedConversation(chat.conversationId);
                              setIsAutoDeleteModalOpen(true);
                              setActiveMenu(null);
                            }}>
                            <span>
                              {t.auto_delete_messages || "Tin nhắn tự xóa"}
                            </span>
                            <FontAwesomeIcon
                              icon={faChevronRight}
                              className="ml-1"
                            />
                          </div>
                          <div className="border-t border-gray-200 dark:border-gray-600"></div>
                          <div className="px-4 py-2 text-red-500 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                            {t.delete_conversation || "Xóa hội thoại"}
                          </div>
                          <div className="border-t border-gray-200 dark:border-gray-600"></div>
                          <div className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                            {t.report || "Báo xấu"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 truncate">
                  {chat.lastMessage?.senderId && (
                    <span className="mr-1 truncate">
                      {/* Display "You" if the sender is the current user */}
                      {chat.lastMessage.senderId === localStorage.getItem('userId') 
                        ? "Bạn" 
                        : (userCache[chat.lastMessage.senderId]?.fullname || 
                           localUserCache[chat.lastMessage.senderId]?.fullname || 
                           "User")}:
                    </span>
                  )}
                  <span className="truncate">
                    {chat.lastMessage?.content ||
                      t.no_messages ||
                      "Chưa có tin nhắn"}
                  </span>
                </div>
              </div>

              {/* Actions section */}
              <div className="shrink-0">
                <i className="fa fa-ellipsis-h text-gray-400 dark:text-gray-300 cursor-pointer hover:text-gray-600 dark:hover:text-gray-100"></i>
              </div>
            </List.Item>
          )}
          locale={{
            emptyText: (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
                <p className="mb-2">{t.no_conversations || "Không có hội thoại nào"}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 mt-2"
                >
                  Tải lại
                </button>
              </div>
            ),
          }}
        />
      )}

      {/* Modals */}
      <LabelModal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        labels={[
          {
            id: "customer",
            name: t.label_customer || "Khách hàng",
            color: "#FF6B6B",
            selected: false,
          },
          {
            id: "family",
            name: t.label_family || "Gia đình",
            color: "#4ECDC4",
            selected: false,
          },
          {
            id: "work",
            name: t.label_work || "Công việc",
            color: "#45B7D1",
            selected: false,
          },
          {
            id: "friends",
            name: t.label_friends || "Bạn bè",
            color: "#96CEB4",
            selected: false,
          },
          {
            id: "later",
            name: t.label_later || "Trả lời sau",
            color: "#FFEEAD",
            selected: false,
          },
        ]}
        onLabelSelect={(labelId) => {
          console.log(
            "Selected label:",
            labelId,
            "for conversation:",
            selectedConversation
          );
          setIsLabelModalOpen(false);
        }}
        onManageLabels={() => {
          console.log("Manage labels clicked");
          setIsLabelModalOpen(false);
        }}
      />

      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        onSelect={(duration) => {
          console.log(
            "Selected notification duration:",
            duration,
            "for conversation:",
            selectedConversation
          );
        }}
      />

      <AutoDeleteModal
        isOpen={isAutoDeleteModalOpen}
        onClose={() => setIsAutoDeleteModalOpen(false)}
        onSelect={(duration) => {
          console.log(
            "Selected auto-delete duration:",
            duration,
            "for conversation:",
            selectedConversation
          );
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
