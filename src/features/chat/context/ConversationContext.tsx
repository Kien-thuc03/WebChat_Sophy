// ConversationContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  fetchConversations,
  getUserById,
  getConversationDetail,
} from "../../../api/API";
import { Conversation, UnreadCount, Message } from "../types/conversationTypes";
import { User } from "../../auth/types/authTypes";
import socketService from "../../../services/socketService";

export interface ConversationContextType {
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  userCache: Record<string, User>;
  userAvatars: Record<string, string>;
  displayNames: Record<string, string>;
  updateConversationWithNewMessage: (
    conversationId: string,
    message: Partial<Message>
  ) => void;
  refreshConversations: () => Promise<void>;
  selectedConversation: Conversation | null;
  setSelectedConversation: React.Dispatch<
    React.SetStateAction<Conversation | null>
  >;
  isLoading: boolean;
  markConversationAsRead: (conversationId: string) => void;
  updateUnreadStatus: (conversationId: string, messageIds: string[]) => void;
  addNewConversation: (conversationData: any) => void;
  updateConversationField: (
    conversationId: string,
    field: string,
    value: any
  ) => void;
  updateConversationMembers: (conversationId: string, userId: string) => void;
  updateGroupName: (
    conversationId: string,
    newName: string,
    fromUserId?: string
  ) => void;
  updateGroupAvatar: (
    conversationId: string,
    newAvatar: string,
    fromUserId?: string
  ) => void;
}

export const ConversationContext = createContext<ConversationContextType>({
  conversations: [],
  setConversations: () => {},
  userCache: {},
  displayNames: {},
  userAvatars: {},
  isLoading: false,
  updateConversationWithNewMessage: () => {},
  updateConversationField: () => {},
  updateConversationMembers: () => {},
  refreshConversations: async () => {},
  selectedConversation: null,
  setSelectedConversation: () => {},
  markConversationAsRead: () => {},
  updateUnreadStatus: () => {},
  addNewConversation: () => {},
  updateGroupName: () => {},
  updateGroupAvatar: () => {},
});

// Helper functions for localStorage avatars
const saveGroupAvatarToLocalStorage = (
  conversationId: string,
  avatarUrl: string
) => {
  try {
    const storedAvatars = JSON.parse(
      localStorage.getItem("groupAvatars") || "{}"
    );
    
    // Kiểm tra xem URL mới có khác với URL đã lưu không
    if (storedAvatars[conversationId] === avatarUrl) {
      // URL không thay đổi, không cần lưu lại
      return true;
    }
    
    // Cập nhật URL mới
    storedAvatars[conversationId] = avatarUrl;
    localStorage.setItem("groupAvatars", JSON.stringify(storedAvatars));
    
    // Giới hạn log
    const lastLogTime = Number(sessionStorage.getItem(`lastAvatarLog_${conversationId}`) || "0");
    const currentTime = Date.now();
    if (currentTime - lastLogTime > 5000) { // Chỉ log mỗi 5 giây một lần cho mỗi conversationId
      console.log(
        "Saved avatar to localStorage for conversationId:",
        conversationId
      );
      sessionStorage.setItem(`lastAvatarLog_${conversationId}`, currentTime.toString());
    }
    
    return true;
  } catch (error) {
    console.error("Error saving avatar to localStorage:", error);
    return false;
  }
};

const getGroupAvatarFromLocalStorage = (conversationId: string) => {
  try {
    const storedAvatars = JSON.parse(
      localStorage.getItem("groupAvatars") || "{}"
    );
    return storedAvatars[conversationId] || null;
  } catch (error) {
    console.error("Error getting avatar from localStorage:", error);
    return null;
  }
};

export const ConversationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [userCache, setUserCache] = useState<Record<string, User>>({});
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(
    localStorage.getItem("userId")
  );

  // Định dạng tên nhóm chat dựa trên danh sách thành viên
  const formatGroupName = (members: string[] = []) => {
    if (!members.length) return "Nhóm không có thành viên";
    const memberNames = members
      .slice(0, 3)
      .map((id) => userCache[id]?.fullname || id)
      .join(", ");
    return members.length > 3 ? `${memberNames}...` : memberNames;
  };

  // Lấy tên hiển thị cho một cuộc trò chuyện
  const getDisplayName = async (chat: Conversation) => {
    if (chat.isGroup) {
      return chat.groupName || formatGroupName(chat.groupMembers);
    }

    const currentUserId = localStorage.getItem("userId");
    const otherUserId =
      chat.creatorId === currentUserId ? chat.receiverId : chat.creatorId;

    if (otherUserId) {
      try {
        if (!userCache[otherUserId]) {
          const userData = await getUserById(otherUserId);
          setUserCache((prev) => ({
            ...prev,
            [otherUserId]: userData,
          }));
          return userData?.fullname || otherUserId;
        }
        return userCache[otherUserId]?.fullname || otherUserId;
      } catch (error) {
        console.error("Lỗi khi lấy thông tin người dùng:", error);
        return otherUserId;
      }
    }
    return "Cuộc trò chuyện riêng tư";
  };

  // Tải danh sách hội thoại
  const loadConversations = async () => {
    const currentUserId = localStorage.getItem("userId");
    if (!currentUserId) {
      console.log("Không có ID người dùng, không thể tải hội thoại");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchConversations();

      // Check localStorage for saved avatars and apply them
      const processedData = data.map((conversation) => {
        if (conversation.isGroup && conversation.conversationId) {
          const localAvatar = getGroupAvatarFromLocalStorage(
            conversation.conversationId
          );
          if (
            localAvatar &&
            (!conversation.groupAvatarUrl ||
              conversation.groupAvatarUrl === "null")
          ) {
            console.log(
              `Using localStorage avatar for ${conversation.conversationId}`
            );
            return {
              ...conversation,
              groupAvatarUrl: localAvatar,
            };
          }
        }
        return conversation;
      });

      const sortedConversations = processedData.sort((a, b) => {
        const timeA = a.lastMessage?.createdAt
          ? new Date(a.lastMessage.createdAt).getTime()
          : 0;
        const timeB = b.lastMessage?.createdAt
          ? new Date(b.lastMessage.createdAt).getTime()
          : 0;
        return timeB - timeA;
      });
      setConversations(sortedConversations);
    } catch (error) {
      console.error("Lỗi khi tải danh sách hội thoại:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Thêm hội thoại mới
  const addNewConversation = useCallback(
    (conversationData: any) => {
      console.log(
        "ConversationContext: Adding new conversation:",
        conversationData
      );

      if (!conversationData.conversation?.conversationId) {
        console.error(
          "ConversationContext: Invalid conversation data:",
          conversationData
        );
        return;
      }

      const { conversation } = conversationData;
      const {
        conversationId,
        creatorId,
        receiverId,
        createdAt,
        isGroup,
        groupName,
        groupMembers,
        groupAvatarUrl,
      } = conversation;

      // If it's a group conversation with an avatar, save it to localStorage
      if (isGroup && conversationId && groupAvatarUrl) {
        saveGroupAvatarToLocalStorage(conversationId, groupAvatarUrl);
      }

      setConversations((prevConversations) => {
        const exists = prevConversations.some(
          (conv) => conv.conversationId === conversationId
        );
        if (exists) {
          console.log(
            "ConversationContext: Conversation already exists:",
            conversationId
          );

          // Update existing conversation's avatar if needed
          if (isGroup && groupAvatarUrl) {
            return prevConversations.map((conv) =>
              conv.conversationId === conversationId
                ? { ...conv, groupAvatarUrl, ...conversation }
                : conv
            );
          }

          return prevConversations;
        }

        // Tạo đối tượng hội thoại mới
        const newConversation: Conversation = {
          conversationId,
          creatorId,
          receiverId: isGroup ? undefined : receiverId,
          createdAt: createdAt || new Date().toISOString(),
          lastChange: createdAt || new Date().toISOString(),
          isGroup: isGroup || false,
          groupName: isGroup ? groupName : undefined,
          groupMembers: isGroup ? groupMembers || [] : [],
          groupAvatarUrl: isGroup ? groupAvatarUrl || undefined : undefined,
          unreadCount: isGroup
            ? []
            : [
                {
                  userId: localStorage.getItem("userId") || "",
                  count: 1,
                  lastReadMessageId: "",
                },
              ],
          hasUnread: !isGroup,
          blocked: [],
          isDeleted: false,
          deletedAt: null,
          formerMembers: [],
          listImage: [],
          listFile: [],
          pinnedMessages: [],
          muteNotifications: [],
        };

        console.log(
          "ConversationContext: New conversation object:",
          newConversation
        );

        // Thêm hội thoại mới vào đầu danh sách
        const updatedConversations = [newConversation, ...prevConversations];
        console.log(
          "ConversationContext: Updated conversation count:",
          updatedConversations.length
        );
        return updatedConversations;
      });

      // Lấy thông tin người dùng cho các thành viên
      const fetchUserInfo = async () => {
        try {
          if (isGroup && groupMembers) {
            for (const memberId of groupMembers) {
              if (!userCache[memberId]) {
                const userData = await getUserById(memberId);
                setUserCache((prev) => ({
                  ...prev,
                  [memberId]: userData,
                }));
                if (userData?.urlavatar) {
                  setUserAvatars((prev) => ({
                    ...prev,
                    [memberId]: userData.urlavatar,
                  }));
                }
              }
            }
          } else {
            if (creatorId && !userCache[creatorId]) {
              const creatorData = await getUserById(creatorId);
              setUserCache((prev) => ({
                ...prev,
                [creatorId]: creatorData,
              }));
              if (creatorData?.urlavatar) {
                setUserAvatars((prev) => ({
                  ...prev,
                  [creatorId]: creatorData.urlavatar,
                }));
              }
            }
            if (receiverId && !userCache[receiverId]) {
              const receiverData = await getUserById(receiverId);
              setUserCache((prev) => ({
                ...prev,
                [receiverId]: receiverData,
              }));
              if (receiverData?.urlavatar) {
                setUserAvatars((prev) => ({
                  ...prev,
                  [receiverId]: receiverData.urlavatar,
                }));
              }
            }
          }
        } catch (error) {
          console.error(
            "ConversationContext: Error fetching user data:",
            error
          );
        }
      };

      fetchUserInfo();
    },
    [userCache]
  );

  // Đánh dấu hội thoại là đã đọc
  const markConversationAsRead = useCallback((conversationId: string) => {
    setConversations((prevConversations) => {
      return prevConversations.map((conv) => {
        if (conv.conversationId === conversationId) {
          return {
            ...conv,
            unreadCount: [] as UnreadCount[],
            hasUnread: false,
          };
        }
        return conv;
      });
    });
  }, []);

  // Cập nhật trạng thái chưa đọc
  const updateUnreadStatus = useCallback(
    (conversationId: string, messageIds: string[]) => {
      setConversations((prevConversations) => {
        return prevConversations.map((conv) => {
          if (conv.conversationId === conversationId) {
            if (messageIds && Array.isArray(messageIds)) {
              const messageIdMatched = messageIds.includes(
                conv.newestMessageId || ""
              );
              if (messageIdMatched) {
                return {
                  ...conv,
                  unreadCount: [] as UnreadCount[],
                  hasUnread: false,
                };
              }
            } else {
              return {
                ...conv,
                unreadCount: [] as UnreadCount[],
                hasUnread: false,
              };
            }
          }
          return conv;
        });
      });
    },
    []
  );

  // Cập nhật hội thoại với tin nhắn mới
  const updateConversationWithNewMessage = useCallback(
    (conversationId: string, message: Partial<Message>) => {
      const currentUserId = localStorage.getItem("userId");
      const isFromCurrentUser = message.senderId === currentUserId;

      setConversations((prevConversations) => {
        const conversationIndex = prevConversations.findIndex(
          (conv) => conv.conversationId === conversationId
        );

        if (conversationIndex === -1) return prevConversations;

        const updatedConversations = [...prevConversations];
        const existingConversation = updatedConversations[conversationIndex];

        const messageId = message.messageDetailId || `msg_${Date.now()}`;

        let newUnreadCount: UnreadCount[];
        if (Array.isArray(existingConversation.unreadCount)) {
          newUnreadCount = isFromCurrentUser
            ? existingConversation.unreadCount
            : [
                ...existingConversation.unreadCount,
                {
                  userId: currentUserId || "",
                  count: 1,
                  lastReadMessageId: "",
                },
              ];
        } else {
          newUnreadCount = [
            {
              userId: currentUserId || "",
              count: isFromCurrentUser ? 0 : 1,
              lastReadMessageId: "",
            },
          ];
        }

        const fullMessage: Message = {
          senderId: message.senderId || "",
          content: message.content || "",
          type: message.type || "text",
          createdAt: message.createdAt || new Date().toISOString(),
          messageDetailId: messageId,
          conversationId: conversationId,
          sendStatus: "sent",
          hiddenFrom: [],
          isRecall: false,
          isReply: false,
          messageReplyId: null,
          replyData: null,
          isPinned: false,
          pinnedAt: null,
          reactions: [],
          attachments: null,
          poll: null,
          linkPreview: null,
          deliveredTo: [],
          readBy: [],
          deletedFor: [],
        };

        const updatedConversation: Conversation = {
          ...existingConversation,
          lastMessage: fullMessage,
          newestMessageId: messageId,
          lastChange: message.createdAt || new Date().toISOString(),
          unreadCount: newUnreadCount,
          hasUnread: !isFromCurrentUser,
        };

        updatedConversations.splice(conversationIndex, 1);
        return [updatedConversation, ...updatedConversations];
      });
    },
    []
  );

  // Làm mới danh sách hội thoại
  const refreshConversations = useCallback(async () => {
    setIsLoading(true);
    await loadConversations();
  }, []);

  // Tải thông tin người dùng
  useEffect(() => {
    const fetchUserInfo = async () => {
      for (const chat of conversations) {
        if (chat.isGroup && chat.groupMembers) {
          for (const memberId of chat.groupMembers) {
            if (!userCache[memberId]) {
              try {
                const userData = await getUserById(memberId);
                setUserCache((prev) => ({
                  ...prev,
                  [memberId]: userData,
                }));

                if (userData?.urlavatar) {
                  setUserAvatars((prev) => ({
                    ...prev,
                    [memberId]: userData.urlavatar,
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

        if (
          chat.lastMessage?.senderId &&
          !userCache[chat.lastMessage.senderId]
        ) {
          try {
            const userData = await getUserById(chat.lastMessage.senderId);
            setUserCache((prev) => ({
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

  // Kiểm tra trạng thái xác thực
  useEffect(() => {
    const checkAuthStatus = () => {
      const currentUserId = localStorage.getItem("userId");
      if (currentUserId !== userId) {
        setUserId(currentUserId);
        if (currentUserId) {
          console.log("Đã phát hiện đăng nhập mới, đang tải lại hội thoại...");
          loadConversations();
        } else {
          setConversations([]);
        }
      }
    };

    checkAuthStatus();
    const interval = setInterval(checkAuthStatus, 2000);
    return () => clearInterval(interval);
  }, [userId]);

  // Tải dữ liệu khi khởi tạo
  useEffect(() => {
    const initializeData = async () => {
      await loadConversations();
    };

    // Check if user is logged in
    const currentUserId = localStorage.getItem("userId");
    if (currentUserId) {
      initializeData();
      // Initialize socket connection
      socketService.connect();

      // Add socket listeners for group avatar changes
      const handleGroupAvatarChanged = (data: {
        conversationId: string;
        newAvatar: string;
      }) => {
        setConversations((prevConversations) =>
          prevConversations.map((conv) => {
            if (conv.conversationId === data.conversationId) {
              // Kiểm tra nếu avatar đã được cập nhật rồi
              if (conv.groupAvatarUrl === data.newAvatar) {
                return conv;
              }
              // Save to local storage
              saveGroupAvatarToLocalStorage(
                data.conversationId,
                data.newAvatar
              );

              // Thêm timestamp để tránh cache trình duyệt
              const avatarWithTimestamp = `${data.newAvatar}?t=${Date.now()}`;

              const updatedConv: Conversation = {
                ...conv,
                groupAvatarUrl: avatarWithTimestamp,
              };
              return updatedConv;
            }
            return conv;
          })
        );
      };

      socketService.onGroupAvatarChanged(handleGroupAvatarChanged);

      return () => {
        socketService.off("groupAvatarChanged", handleGroupAvatarChanged);
      };
    }
  }, [userId]);

  // Lưu hội thoại vào localStorage
  useEffect(() => {
    if (conversations.length > 0) {
      try {
        const minimalConversations = conversations.map((conv) => ({
          conversationId: conv.conversationId,
          creatorId: conv.creatorId,
          receiverId: conv.receiverId,
          isGroup: conv.isGroup,
          groupName: conv.groupName,
          groupAvatarUrl: conv.groupAvatarUrl,
        }));
        localStorage.setItem(
          "lastConversations",
          JSON.stringify(minimalConversations)
        );
      } catch (error) {
        console.error("Error saving conversations to localStorage:", error);
      }
    }
  }, [conversations]);

  // Kết nối socket cho các hội thoại
  useEffect(() => {
    if (conversations.length > 0 && !isLoading) {
      const timer = setTimeout(() => {
        const conversationIds = conversations.map(
          (conv) => conv.conversationId
        );
        socketService.joinConversations(conversationIds);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [conversations, isLoading]);

  // Lắng nghe sự kiện tạo hội thoại mới
  useEffect(() => {
    const handleNewConversationEvent = (event: CustomEvent) => {
      console.log(
        "Received newConversationCreated custom event:",
        event.detail
      );
      addNewConversation(event.detail);
    };

    window.addEventListener(
      "newConversationCreated",
      handleNewConversationEvent as EventListener
    );

    return () => {
      window.removeEventListener(
        "newConversationCreated",
        handleNewConversationEvent as EventListener
      );
    };
  }, [addNewConversation]);

  // Lắng nghe sự kiện làm mới danh sách hội thoại (cho socket events)
  useEffect(() => {
    const handleRefreshConversations = () => {
      console.log("Refreshing all conversations from socket event");
      fetchConversations(); // Gọi hàm để tải lại toàn bộ danh sách
    };

    const handleRefreshConversationDetail = (event: CustomEvent) => {
      const { conversationId } = event.detail || {};
      if (conversationId) {
        console.log(`Refreshing conversation detail for ID: ${conversationId}`);

        // Tìm và cập nhật thông tin hội thoại cụ thể
        (async () => {
          try {
            const response = await getConversationDetail(conversationId);
            if (response) {
              // Cập nhật conversation cụ thể trong state
              setConversations((prevConversations) =>
                prevConversations.map((conv) =>
                  conv.conversationId === conversationId
                    ? { ...conv, ...response }
                    : conv
                )
              );
            }
          } catch (err) {
            console.error(
              `Failed to refresh conversation detail: ${conversationId}`,
              err
            );
          }
        })();
      }
    };

    window.addEventListener(
      "refreshConversations",
      handleRefreshConversations as EventListener
    );
    window.addEventListener(
      "refreshConversationDetail",
      handleRefreshConversationDetail as EventListener
    );

    return () => {
      window.removeEventListener(
        "refreshConversations",
        handleRefreshConversations as EventListener
      );
      window.removeEventListener(
        "refreshConversationDetail",
        handleRefreshConversationDetail as EventListener
      );
    };
  }, [fetchConversations]);

  // Function to update a specific field in a conversation
  const updateConversationField = useCallback(
    (conversationId: string, field: string, value: any) => {
      setConversations((prevConversations) => {
        return prevConversations.map((conv) => {
          if (conv.conversationId === conversationId) {
            return {
              ...conv,
              [field]: value,
            };
          }
          return conv;
        });
      });
    },
    []
  );

  // Thêm hàm cập nhật thành viên nhóm
  const updateConversationMembers = useCallback(
    (conversationId: string, userId: string) => {
      setConversations((prevConversations) =>
        prevConversations.map((conv) => {
          if (conv.conversationId === conversationId) {
            return {
              ...conv,
              groupMembers: conv.groupMembers.filter((id) => id !== userId),
            };
          }
          return conv;
        })
      );
    },
    []
  );

  // Lắng nghe sự kiện thay đổi tên nhóm
  useEffect(() => {
    const handleGroupNameChanged = (data: {
      conversationId: string;
      newName: string;
    }) => {
      console.log(
        "ConversationContext: Received group name change event:",
        data
      );

      // Cập nhật conversations ngay lập tức
      setConversations((prevConversations) => {
        return prevConversations.map((conv) => {
          if (conv.conversationId === data.conversationId) {
            console.log(
              "ConversationContext: Updating conversation name:",
              conv.conversationId,
              "to:",
              data.newName
            );

            // Tạo một bản sao của conversation để cập nhật
            const updatedConv = {
              ...conv,
              groupName: data.newName,
              lastChange: new Date().toISOString(),
            };

            // Cập nhật selectedConversation nếu đang được chọn
            if (selectedConversation?.conversationId === data.conversationId) {
              setSelectedConversation(updatedConv);
            }

            return updatedConv;
          }
          return conv;
        });
      });

      // Thêm tin nhắn hệ thống và đảm bảo nó được hiển thị ngay lập tức
      const systemMessage = {
        type: "system",
        content: `Tên nhóm đã được đổi thành "${data.newName}"`,
        senderId: userId || "",
        createdAt: new Date().toISOString(),
      };

      updateConversationWithNewMessage(data.conversationId, systemMessage);

      // Kích hoạt sự kiện refresh để đảm bảo UI được cập nhật
      window.dispatchEvent(
        new CustomEvent("refreshConversationDetail", {
          detail: { conversationId: data.conversationId },
        })
      );
    };

    // Đảm bảo socket đã kết nối và lắng nghe sự kiện
    if (!socketService.isConnected) {
      socketService.connect();
    }

    // Đăng ký lắng nghe sự kiện
    socketService.onGroupNameChanged(handleGroupNameChanged);

    return () => {
      socketService.off("groupNameChanged", handleGroupNameChanged);
    };
  }, [userId, updateConversationWithNewMessage, selectedConversation]);

  const updateGroupName = (
    conversationId: string,
    newName: string,
    fromUserId?: string
  ) => {
    setConversations((prevConversations) =>
      prevConversations.map((conv) => {
        if (conv.conversationId === conversationId) {
          // Thêm tin nhắn hệ thống về việc thay đổi tên nhóm
          const currentUserId = localStorage.getItem("userId");
          const isCurrentUser = fromUserId === currentUserId;

          // Tạo tin nhắn hệ thống
          const systemMessage: Message = {
            type: "system",
            content: isCurrentUser
              ? "Bạn đã đổi tên nhóm thành " + newName
              : "Tên nhóm đã được đổi thành " + newName,
            senderId: fromUserId || "",
            createdAt: new Date().toISOString(),
            messageDetailId: `system_${Date.now()}`,
            conversationId: conversationId,
            sendStatus: "sent",
            hiddenFrom: [],
            isRecall: false,
            isReply: false,
            messageReplyId: null,
            replyData: null,
            isPinned: false,
            pinnedAt: null,
            reactions: [],
            attachments: null,
            poll: null,
            linkPreview: null,
            deliveredTo: [],
            readBy: [],
            deletedFor: [],
          };

          // Cập nhật conversation với tin nhắn hệ thống
          return {
            ...conv,
            groupName: newName,
            lastChange: new Date().toISOString(),
            lastMessage: systemMessage,
          };
        }
        return conv;
      })
    );

    // Gọi hàm cập nhật tin nhắn để hiển thị thông báo trong chat
    updateConversationWithNewMessage(conversationId, {
      type: "system",
      content: `Tên nhóm đã được đổi thành "${newName}"`,
      senderId: fromUserId || "",
      createdAt: new Date().toISOString(),
      messageDetailId: `system_${Date.now()}`,
      conversationId: conversationId,
      sendStatus: "sent",
      hiddenFrom: [],
      isRecall: false,
      isReply: false,
      messageReplyId: null,
      replyData: null,
      isPinned: false,
      pinnedAt: null,
      reactions: [],
      attachments: null,
      poll: null,
      linkPreview: null,
      deliveredTo: [],
      readBy: [],
      deletedFor: [],
    });
  };

  const updateGroupAvatar = (
    conversationId: string,
    newAvatar: string,
    fromUserId?: string
  ) => {
    setConversations((prevConversations) =>
      prevConversations.map((conv) => {
        if (conv.conversationId === conversationId) {
          // Save to localStorage
          saveGroupAvatarToLocalStorage(conversationId, newAvatar);

          // Thêm tin nhắn hệ thống về việc thay đổi avatar
          const currentUserId = localStorage.getItem("userId");
          const isCurrentUser = fromUserId === currentUserId;

          // Tạo tin nhắn hệ thống
          const systemMessage: Message = {
            type: "system",
            content: isCurrentUser
              ? "Bạn đã thay đổi ảnh nhóm"
              : `${userCache[fromUserId || ""]?.fullname || "Người dùng"} đã thay đổi ảnh nhóm`,
            senderId: fromUserId || "",
            createdAt: new Date().toISOString(),
            messageDetailId: `system_${Date.now()}`,
            conversationId: conversationId,
            sendStatus: "sent",
            hiddenFrom: [],
            isRecall: false,
            isReply: false,
            messageReplyId: null,
            replyData: null,
            isPinned: false,
            pinnedAt: null,
            reactions: [],
            attachments: null,
            poll: null,
            linkPreview: null,
            deliveredTo: [],
            readBy: [],
            deletedFor: [],
          };

          // Cập nhật conversation với tin nhắn hệ thống
          return {
            ...conv,
            groupAvatarUrl: newAvatar,
            lastChange: new Date().toISOString(),
            lastMessage: systemMessage,
          };
        }
        return conv;
      })
    );

    // Gọi hàm cập nhật tin nhắn để hiển thị thông báo trong chat
    updateConversationWithNewMessage(conversationId, {
      type: "system",
      content: "Ảnh nhóm đã được thay đổi",
      senderId: fromUserId || "",
      createdAt: new Date().toISOString(),
    });
  };

  const value = {
    conversations,
    setConversations,
    userCache,
    userAvatars,
    displayNames,
    updateConversationWithNewMessage,
    refreshConversations,
    selectedConversation,
    setSelectedConversation,
    isLoading,
    markConversationAsRead,
    updateUnreadStatus,
    addNewConversation,
    updateConversationField,
    updateConversationMembers,
    updateGroupName,
    updateGroupAvatar,
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
};

export const useConversationContext = () => {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error(
      "useConversationContext must be used within a ConversationProvider"
    );
  }
  return context;
};
