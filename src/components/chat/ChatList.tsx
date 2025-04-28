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
import { getUserById, getConversationDetail } from "../../api/API";
import { User } from "../../features/auth/types/authTypes";
import socketService from "../../services/socketService";

// Xóa khai báo interface riêng và sử dụng kiểu any tạm thời để tránh xung đột type
// interface ConversationData {
//   conversation: Conversation;
//   timestamp: string;
// }

interface ChatListProps {
  onSelectConversation: (conversation: Conversation) => void;
}

const ChatList: React.FC<ChatListProps> = ({ onSelectConversation }) => {
  const {
    conversations,
    userCache,
    displayNames,
    userAvatars,
    isLoading,
    updateConversationWithNewMessage,
    setConversations,
    updateConversationMembers,
  } = useConversationContext();
  const { t } = useLanguage();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isAutoDeleteModalOpen, setIsAutoDeleteModalOpen] = useState(false);
  const [localUserCache, setLocalUserCache] = useState<Record<string, User>>(
    {}
  );
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [newMessageHighlight, setNewMessageHighlight] = useState<
    Record<string, boolean>
  >({});
  const [newConversationHighlight, setNewConversationHighlight] = useState<
    Record<string, boolean>
  >({});
  // Create a ref to track previously seen conversation IDs
  const prevConvIds = useRef<Set<string>>(new Set());

  // USER == creator = receiver = receiverId
  // USER == receiver = receiver = creatorId

  /**
   * Gets the correct user ID to display for a conversation
   * @param conversation The conversation object
   * @returns The ID of the other user in the conversation
   */
  const getOtherUserId = (conversation: Conversation): string => {
    // Get current user ID from localStorage (or any authentication method you use)
    const currentUserId = localStorage.getItem("userId") || "";

    // If it's a group chat, there's no single "other user"
    if (conversation.isGroup) {
      return "";
    }

    // If the current user is the creator, return the receiverId
    if (currentUserId === conversation.creatorId) {
      return conversation.receiverId || "";
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
        .map((memberId) => {
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
      return conversation.groupAvatarUrl || "";
    }

    // For individual chats, return the avatar of the other user
    const otherUserId = getOtherUserId(conversation);
    const user = userCache[otherUserId] || localUserCache[otherUserId];
    return user?.urlavatar || "";
  };

  // Add a helper function to calculate the unread count
  const getUnreadCount = (chat: Conversation): number => {
    if (typeof chat.unreadCount === "number") {
      return chat.unreadCount;
    }

    // If it's an array, calculate total for current user
    if (Array.isArray(chat.unreadCount)) {
      const currentUserId = localStorage.getItem("userId") || "";
      const userUnread = chat.unreadCount.find(
        (uc) => uc.userId === currentUserId
      );
      return userUnread?.count || 0;
    }

    return 0;
  };

  // Add a helper function to check if there are unread messages
  const hasUnreadMessages = (chat: Conversation): boolean => {
    // Use explicit hasUnread property if available
    if (typeof chat.hasUnread === "boolean") {
      return chat.hasUnread;
    }

    // Otherwise calculate based on unreadCount
    return getUnreadCount(chat) > 0;
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
      const currentUserId = localStorage.getItem("userId") || "";

      // Process each conversation
      for (const conversation of conversations) {
        // For individual chats, load the other user's data
        if (!conversation.isGroup) {
          const otherUserId = getOtherUserId(conversation);

          // If we don't have this user's data in cache, fetch it
          if (
            otherUserId &&
            !userCache[otherUserId] &&
            !localUserCache[otherUserId]
          ) {
            try {
              const userData = await getUserById(otherUserId);
              if (userData) {
                // Add user to local cache
                setLocalUserCache((prev) => ({
                  ...prev,
                  [otherUserId]: userData,
                }));
              }
            } catch (error) {
              console.error(
                `Failed to load data for user ${otherUserId}:`,
                error
              );
            }
          }
        }
      }
    };

    loadUserData();
  }, [conversations, userCache, localUserCache]);

  useEffect(() => {
    // Lắng nghe tin nhắn mới từ tất cả các cuộc trò chuyện
    const handleNewMessage = (data: any) => {
      // Cập nhật conversation trong danh sách, được xử lý bởi ConversationContext
      updateConversationWithNewMessage(data.conversationId, data.message);

      // Thêm highlight cho tin nhắn mới trong 3 giây
      if (data.message.senderId !== localStorage.getItem("userId")) {
        setNewMessageHighlight((prev) => ({
          ...prev,
          [data.conversationId]: true,
        }));

        // Xóa highlight sau 3 giây
        setTimeout(() => {
          setNewMessageHighlight((prev) => ({
            ...prev,
            [data.conversationId]: false,
          }));
        }, 3000);
      }
    };

    // Đăng ký lắng nghe sự kiện tin nhắn mới
    socketService.onNewMessage(handleNewMessage);

    // Hủy đăng ký khi component unmount
    return () => {
      socketService.off("newMessage", handleNewMessage);
    };
  }, [updateConversationWithNewMessage]);

  useEffect(() => {
    // Tham gia vào tất cả các phòng cuộc trò chuyện khi danh sách được tải
    if (conversations.length > 0 && !isLoading) {
      const conversationIds = conversations.map((conv) => conv.conversationId);
      socketService.joinConversations(conversationIds);
    }
  }, [conversations, isLoading]);

  // Thêm function vào ChatList để hiển thị tin nhắn cuối cùng đẹp hơn
  const getFormattedLastMessage = (chat: Conversation) => {
    if (!chat.lastMessage) return t.no_messages || "Chưa có tin nhắn";

    let content = "";

    // Xử lý nội dung theo loại tin nhắn
    switch (chat.lastMessage.type) {
      case "image":
        content = "📷 Hình ảnh";
        break;
      case "file":
        content = "📎 Tệp đính kèm";
        break;
      case "text-with-image":
        content = `📷 ${chat.lastMessage.content || "Hình ảnh"}`;
        break;
      default:
        content = chat.lastMessage.content || "";
    }

    // Giới hạn độ dài nội dung
    if (content.length > 30) {
      content = content.substring(0, 30) + "...";
    }

    return content;
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Cập nhật mỗi phút

    return () => clearInterval(intervalId);
  }, []);

  const renderLastMessageStatus = (chat: Conversation) => {
    // Hiển thị trạng thái chỉ khi người gửi tin nhắn cuối cùng là người dùng hiện tại
    if (
      !chat.lastMessage ||
      chat.lastMessage.senderId !== localStorage.getItem("userId")
    )
      return null;

    // Kiểm tra xem tin nhắn đã được đọc bởi tất cả người nhận chưa
    const isRead = chat.lastMessage.readBy?.length > 0;
    const isDelivered = chat.lastMessage.deliveredTo?.length > 0;

    if (isRead) {
      return <span className="text-blue-500 text-xs">✓✓</span>; // Đã đọc
    } else if (isDelivered) {
      return <span className="text-gray-500 text-xs">✓✓</span>; // Đã gửi
    } else {
      return <span className="text-gray-400 text-xs">✓</span>; // Đã gửi nhưng chưa nhận
    }
  };

  // Add useEffect to join new conversation rooms when they are added
  useEffect(() => {
    try {
      // When there's a new conversation, make sure to join its room
      if (conversations && conversations.length > 0) {
        const conversationIds = conversations
          .map((conv) => conv.conversationId)
          .filter(Boolean);

        if (conversationIds.length > 0) {
          socketService.joinConversations(conversationIds);

          // Check for newly added conversations to highlight them
          const currentIds = new Set(conversationIds);

          // Only check for new conversations after we've initialized our tracking Set
          if (prevConvIds.current && prevConvIds.current.size > 0) {
            // Find conversations that weren't in our previous set
            conversationIds.forEach((id) => {
              if (id && !prevConvIds.current.has(id)) {
                // This is a new conversation - highlight it
                setNewConversationHighlight((prev) => ({
                  ...prev,
                  [id]: true,
                }));

                // Remove highlight after 5 seconds
                setTimeout(() => {
                  setNewConversationHighlight((prev) => {
                    // Use the functional update to ensure we get the latest state
                    const updated = { ...prev };
                    updated[id] = false;
                    return updated;
                  });
                }, 5000);
              }
            });
          }

          // Update previous ids for next comparison
          prevConvIds.current = currentIds;
        }
      }
    } catch (error) {
      console.error("Error in conversation tracking effect:", error);
    }
  }, [conversations]);

  // Lắng nghe sự kiện thay đổi thành viên nhóm
  useEffect(() => {
    const handleMemberRemoved = (data: {
      conversationId: string;
      userId: string;
    }) => {
      // Tìm conversation cần cập nhật
      const conversationToUpdate = conversations.find(
        (conv) => conv.conversationId === data.conversationId
      );

      if (conversationToUpdate) {
        updateConversationMembers(data.conversationId, data.userId);
        // Thêm tin nhắn hệ thống
        updateConversationWithNewMessage(data.conversationId, {
          type: "system",
          content: `Thành viên đã bị xóa khỏi nhóm`,
          senderId: data.userId,
          createdAt: new Date().toISOString(),
        });
      }
    };

    socketService.on("userRemovedFromGroup", handleMemberRemoved);

    return () => {
      socketService.off("userRemovedFromGroup", handleMemberRemoved);
    };
  }, [
    conversations,
    updateConversationWithNewMessage,
    updateConversationMembers,
  ]);

  useEffect(() => {
    // Lắng nghe sự kiện cuộc trò chuyện mới
    const handleNewConversation = (data: any) => {
      if (data.conversation) {
        // Thêm cuộc trò chuyện mới vào danh sách
        setConversations((prev: Conversation[]) => {
          // Kiểm tra xem cuộc trò chuyện đã tồn tại chưa
          const exists = prev.some(
            (conv) => conv.conversationId === data.conversation.conversationId
          );
          if (!exists) {
            // Thêm vào đầu danh sách
            return [data.conversation, ...prev];
          }
          return prev;
        });

        // Tham gia vào phòng cuộc trò chuyện mới
        socketService.joinConversation(data.conversation.conversationId);

        // Highlight cuộc trò chuyện mới
        setNewConversationHighlight((prev) => ({
          ...prev,
          [data.conversation.conversationId]: true,
        }));

        // Xóa highlight sau 5 giây
        setTimeout(() => {
          setNewConversationHighlight((prev) => ({
            ...prev,
            [data.conversation.conversationId]: false,
          }));
        }, 5000);
      }
    };

    // Lắng nghe sự kiện thêm thành viên vào nhóm
    const handleUserAddedToGroup = (data: {
      conversationId: string;
      addedUser: { userId: string; fullname: string };
      addedByUser: { userId: string; fullname: string };
    }) => {
      // Kiểm tra xem người được thêm có phải là người dùng hiện tại không
      const currentUserId = localStorage.getItem("userId");
      if (data.addedUser.userId === currentUserId) {
        // Nếu là người dùng hiện tại, cập nhật danh sách cuộc trò chuyện
        const fetchNewConversation = async () => {
          try {
            const newConversation = await getConversationDetail(
              data.conversationId
            );
            if (newConversation) {
              setConversations((prev: Conversation[]) => {
                // Kiểm tra xem cuộc trò chuyện đã tồn tại chưa
                const exists = prev.some(
                  (conv) => conv.conversationId === data.conversationId
                );
                if (!exists) {
                  // Thêm vào đầu danh sách
                  return [newConversation, ...prev];
                }
                return prev;
              });
            }
          } catch (error) {
            console.error("Error fetching new conversation:", error);
          }
        };
        fetchNewConversation();
      }
    };

    // Thêm xử lý cho sự kiện nhóm bị giải tán
    const handleGroupDeleted = (data: { conversationId: string }) => {
      // Xóa conversation khỏi danh sách
      setConversations((prev: Conversation[]) => {
        return prev.filter(
          (conv) => conv.conversationId !== data.conversationId
        );
      });
      
      // Hiển thị thông báo
      const notification = document.createElement('div');
      notification.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
      notification.textContent = 'Một nhóm chat đã bị giải tán';
      document.body.appendChild(notification);
      
      // Xóa thông báo sau 5 giây
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 5000);
    };

    socketService.onNewConversation(handleNewConversation);
    socketService.onUserAddedToGroup(handleUserAddedToGroup);
    socketService.onGroupDeleted(handleGroupDeleted);

    return () => {
      socketService.off("newConversation", handleNewConversation);
      socketService.off("userAddedToGroup", handleUserAddedToGroup);
      socketService.off("groupDeleted", handleGroupDeleted);
    };
  }, [setConversations]);

  return (
    <div className="chat-list w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 h-full flex flex-col overflow-hidden">
      <Header onSelectConversation={onSelectConversation} />
      <div className="flex-shrink-0">
        <ChatNav />
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800">
          <Spin size="large" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Đang tải danh sách hội thoại...
          </p>
        </div>
      ) : (
        <List
          className="overflow-y-auto flex-1"
          dataSource={conversations.filter((conv) => {
            // Filter out deleted conversations
            if (conv.isDeleted) return false;

            // Filter out conversations where current user is in formerMembers
            const currentUserId = localStorage.getItem("userId") || "";
            if (
              conv.formerMembers &&
              conv.formerMembers.includes(currentUserId)
            ) {
              return false;
            }

            return true;
          })}
          renderItem={(chat) => (
            <List.Item
              className={`flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer px-3 py-2 ${
                hasUnreadMessages(chat) ? "bg-blue-50 dark:bg-blue-900/20" : ""
              } ${newMessageHighlight[chat.conversationId] ? "animate-pulse bg-blue-100 dark:bg-blue-800/30" : ""}
              ${newConversationHighlight[chat.conversationId] ? "bg-green-100 dark:bg-green-800/30 border border-green-400 dark:border-green-600" : ""}`}
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
                {hasUnreadMessages(chat) && (
                  <span className="absolute top-0 right-0 h-3 w-3 bg-blue-500 rounded-full border border-white"></span>
                )}
              </div>

              {/* Content section */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center relative group">
                  <span
                    className={`truncate font-semibold ${
                      hasUnreadMessages(chat)
                        ? "text-blue-700 dark:text-blue-400"
                        : "text-gray-900 dark:text-gray-100"
                    }`}>
                    {getConversationName(chat)}
                  </span>
                  <div className="flex items-center">
                    {getUnreadCount(chat) > 0 && (
                      <span className="inline-flex items-center justify-center bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] mr-1">
                        {getUnreadCount(chat) > 99
                          ? "99+"
                          : getUnreadCount(chat)}
                      </span>
                    )}
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
                          activeMenu === chat.conversationId
                            ? "block"
                            : "hidden"
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
                      {chat.lastMessage.senderId ===
                      localStorage.getItem("userId")
                        ? "Bạn"
                        : userCache[chat.lastMessage.senderId]?.fullname ||
                          localUserCache[chat.lastMessage.senderId]?.fullname ||
                          "User"}
                      :
                    </span>
                  )}
                  <div className="flex items-center space-x-1">
                    <span className="truncate">
                      {getFormattedLastMessage(chat)}
                    </span>
                    {renderLastMessageStatus(chat)}
                  </div>
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
                <p className="mb-2">
                  {t.no_conversations || "Không có hội thoại nào"}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 mt-2">
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