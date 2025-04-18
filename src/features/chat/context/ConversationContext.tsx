import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { fetchConversations, getUserById } from "../../../api/API";
import { Conversation } from "../types/conversationTypes";
import { User } from "../../auth/types/authTypes";
import socketService from "../../../services/socketService";

// Extended Message type to handle different message ID field names
interface Message {
  content: string;
  type: string;
  senderId: string;
  createdAt: string;
  messageDetailId?: string; // Used in ChatArea.tsx
  messageId?: string; // Used elsewhere
  id?: string; // Fallback
  readBy?: string[];
  deliveredTo?: string[];
}

interface ConversationContextType {
  conversations: Conversation[];
  userCache: Record<string, User>;
  userAvatars: Record<string, string>;
  displayNames: Record<string, string>;
  updateConversationWithNewMessage: (
    conversationId: string,
    message: Message
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
}

const ConversationContext = createContext<ConversationContextType | undefined>(
  undefined
);

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
    // Xác định ID của người dùng khác trong cuộc trò chuyện
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
    // Check if user is logged in
    const currentUserId = localStorage.getItem("userId");
    if (!currentUserId) {
      console.log("Không có ID người dùng, không thể tải hội thoại");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log("Đang tải danh sách hội thoại...");
      const data = await fetchConversations();
      console.log("Đã nhận được dữ liệu hội thoại:", data.length, "hội thoại");

      // Sắp xếp theo thời gian tin nhắn cuối cùng, mới nhất lên đầu
      const sortedConversations = data.sort((a, b) => {
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

  // New method to add a newly created conversation to the list
  const addNewConversation = useCallback((conversationData: any) => {
    console.log(
      "ConversationContext: Adding new conversation to context:",
      conversationData
    );

    // Ensure we have the required data
    if (!conversationData.conversation?.conversationId) {
      console.error(
        "ConversationContext: Invalid conversation data received:",
        conversationData
      );
      return;
    }

    const { conversationId, creatorId, receiverId, createdAt } =
      conversationData.conversation;

    // Check if the conversation already exists to avoid duplicates
    setConversations((prevConversations) => {
      const exists = prevConversations.some(
        (conv) => conv.conversationId === conversationId
      );
      if (exists) {
        console.log(
          "ConversationContext: Conversation already exists, skipping addition"
        );
        return prevConversations;
      }

      console.log(
        "ConversationContext: Creating new conversation object with ID:",
        conversationId
      );

      // Create a new conversation object with the data received
      const newConversation: Conversation = {
        conversationId,
        creatorId,
        receiverId,
        createdAt,
        isGroup: false,
        lastChange: new Date().toISOString(),
        unreadCount: 1, // Mark as unread initially
        hasUnread: true,
        // Add all required properties from the Conversation interface
        groupMembers: [],
        blockedBy: [],
        isDeleted: false,
        deletedAt: null,
        groupName: undefined,
        groupAvatarUrl: undefined,
        formerMembers: [],
        listImage: [],
        listFile: [],
        pinnedMessages: [],
        muteNotifications: [],
      };

      // Log the conversation object and the current state
      console.log(
        "ConversationContext: New conversation object:",
        newConversation
      );
      console.log(
        "ConversationContext: Current conversation count:",
        prevConversations.length
      );

      // Add the new conversation at the top of the list
      const updatedConversations = [newConversation, ...prevConversations];
      console.log(
        "ConversationContext: Updated conversation count:",
        updatedConversations.length
      );
      return updatedConversations;
    });

    // Fetch user data for the participants to display their names properly
    const fetchUserInfo = async () => {
      try {
        // Fetch creator info if needed
        if (creatorId) {
          const creatorData = await getUserById(creatorId);
          if (creatorData) {
            setUserCache((prev) => ({
              ...prev,
              [creatorId]: creatorData,
            }));
            if (creatorData.urlavatar) {
              setUserAvatars((prev) => ({
                ...prev,
                [creatorId]: creatorData.urlavatar,
              }));
            }
          }
        }

        // Fetch receiver info if needed
        if (receiverId) {
          const receiverData = await getUserById(receiverId);
          if (receiverData) {
            setUserCache((prev) => ({
              ...prev,
              [receiverId]: receiverData,
            }));
            if (receiverData.urlavatar) {
              setUserAvatars((prev) => ({
                ...prev,
                [receiverId]: receiverData.urlavatar,
              }));
            }
          }
        }
      } catch (error) {
        console.error("ConversationContext: Error fetching user data:", error);
      }
    };

    fetchUserInfo();
  }, []);

  // New method to mark a conversation as read
  const markConversationAsRead = useCallback((conversationId: string) => {
    setConversations((prevConversations) => {
      return prevConversations.map((conv) => {
        if (conv.conversationId === conversationId) {
          return {
            ...conv,
            unreadCount: 0,
            hasUnread: false,
          };
        }
        return conv;
      });
    });
  }, []);

  // Update unread status when messages are marked as read
  const updateUnreadStatus = useCallback(
    (conversationId: string, messageIds: string[]) => {
      setConversations((prevConversations) => {
        return prevConversations.map((conv) => {
          if (conv.conversationId === conversationId) {
            // Check if messageIds is defined before using includes
            if (messageIds && Array.isArray(messageIds)) {
              // Only update if any of the message IDs match the newest message
              const messageIdMatched = messageIds.includes(
                conv.newestMessageId || ""
              );

              if (messageIdMatched) {
                return {
                  ...conv,
                  unreadCount: 0,
                  hasUnread: false,
                };
              }
            } else {
              // If messageIds is undefined or not an array, just mark the conversation as read
              return {
                ...conv,
                unreadCount: 0,
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

  // Modify updateConversationWithNewMessage to handle unread status
  const updateConversationWithNewMessage = useCallback(
    (conversationId: string, message: Message) => {
      const currentUserId = localStorage.getItem("userId");
      const isFromCurrentUser = message.senderId === currentUserId;

      setConversations((prevConversations) => {
        // Find the conversation to update
        const conversationIndex = prevConversations.findIndex(
          (conv) => conv.conversationId === conversationId
        );

        if (conversationIndex === -1) return prevConversations;

        // Create a copy of the conversations list
        const updatedConversations = [...prevConversations];
        const existingConversation = updatedConversations[conversationIndex];

        // Get the message ID (handling different property names)
        const messageId =
          message.messageDetailId || message.messageId || message.id || "";

        // Calculate new unread count
        let newUnreadCount: number;
        if (typeof existingConversation.unreadCount === "number") {
          newUnreadCount = isFromCurrentUser
            ? 0
            : existingConversation.unreadCount + 1;
        } else {
          // If it's an array or undefined, start with a new count
          newUnreadCount = isFromCurrentUser ? 0 : 1;
        }

        // Update the conversation with the new message
        const updatedConversation: Conversation = {
          ...existingConversation,
          lastMessage: {
            senderId: message.senderId,
            content: message.content,
            type: message.type,
            createdAt: message.createdAt,
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
          },
          newestMessageId: messageId,
          lastChange: message.createdAt,
          unreadCount: newUnreadCount,
          hasUnread: !isFromCurrentUser,
        };

        // Remove the conversation from its old position
        updatedConversations.splice(conversationIndex, 1);

        // Add the updated conversation to the top of the list
        return [updatedConversation, ...updatedConversations];
      });
    },
    []
  );

  // Làm mới danh sách cuộc trò chuyện
  const refreshConversations = useCallback(async () => {
    setIsLoading(true);
    await loadConversations();
  }, []);

  // Tải thông tin người dùng
  useEffect(() => {
    const fetchUserInfo = async () => {
      for (const chat of conversations) {
        // Lấy thông tin người dùng trong nhóm
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

        // Cập nhật tên hiển thị
        const displayName = await getDisplayName(chat);
        setDisplayNames((prev) => ({
          ...prev,
          [chat.conversationId]: displayName,
        }));

        // Lấy thông tin người gửi tin nhắn cuối cùng
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

  // Check for auth changes
  useEffect(() => {
    const checkAuthStatus = () => {
      const currentUserId = localStorage.getItem("userId");

      // If user ID has changed or we got a user ID when we didn't have one before
      if (currentUserId !== userId) {
        setUserId(currentUserId);
        if (currentUserId) {
          console.log("Đã phát hiện đăng nhập mới, đang tải lại hội thoại...");
          loadConversations();
        } else {
          // User logged out
          setConversations([]);
        }
      }
    };

    // Check immediately
    checkAuthStatus();

    // Set up interval to check periodically
    const interval = setInterval(checkAuthStatus, 2000);

    return () => clearInterval(interval);
  }, [userId]);

  // Tải dữ liệu khi khởi tạo
  useEffect(() => {
    const initializeData = async () => {
      // Make sure to set loading state before attempting to load conversations
      setIsLoading(true);

      const currentUserId = localStorage.getItem("userId");
      if (currentUserId) {
        console.log(
          "Khởi tạo dữ liệu hội thoại cho người dùng:",
          currentUserId
        );
        await loadConversations();
      } else {
        console.log("Chưa đăng nhập, sẽ tải dữ liệu sau khi đăng nhập");
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      try {
        // Only save minimal conversation data needed to reconnect
        const minimalConversations = conversations.map((conv) => ({
          conversationId: conv.conversationId,
          creatorId: conv.creatorId,
          receiverId: conv.receiverId,
        }));
        localStorage.setItem(
          "lastConversations",
          JSON.stringify(minimalConversations)
        );
        console.log(
          "Saved",
          minimalConversations.length,
          "conversations to localStorage"
        );
      } catch (error) {
        console.error("Error saving conversations to localStorage:", error);
      }
    }
  }, [conversations]);

  // Ensure socket connections are reestablished when conversations are loaded
  useEffect(() => {
    if (conversations.length > 0 && !isLoading) {
      // There might be a slight delay after loading conversations before all socket
      // connections are fully established. Try to refresh connections after a brief delay.
      const timer = setTimeout(() => {
        const conversationIds = conversations.map(
          (conv) => conv.conversationId
        );
        console.log(
          "Refreshing socket connections for all conversations:",
          conversationIds
        );
        socketService.joinConversations(conversationIds);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [conversations, isLoading]);

  // Listen for custom events from API for new conversations
  useEffect(() => {
    // Handler for custom event emitted by createConversation API
    const handleNewConversationEvent = (event: CustomEvent) => {
      console.log(
        "Received newConversationCreated custom event:",
        event.detail
      );
      addNewConversation(event.detail);
    };

    // Add event listener
    window.addEventListener(
      "newConversationCreated",
      handleNewConversationEvent as EventListener
    );

    // Cleanup
    return () => {
      window.removeEventListener(
        "newConversationCreated",
        handleNewConversationEvent as EventListener
      );
    };
  }, [addNewConversation]);

  // Periodic polling to make sure we don't miss any new conversations
  useEffect(() => {
    // Only poll if user is logged in
    const currentUserId = localStorage.getItem("userId");
    if (!currentUserId || isLoading) return;

    console.log("Setting up periodic conversation polling");

    // Poll for new conversations every 5 seconds
    const pollInterval = setInterval(async () => {
      try {
        // Get the current conversations from API
        const latestConversations = await fetchConversations();

        // Compare with current state to find new ones
        if (latestConversations && latestConversations.length > 0) {
          // Check if we have new conversations that aren't in our current state
          const currentIds = new Set(
            conversations.map((c) => c.conversationId)
          );
          const newConversations = latestConversations.filter(
            (conv) => !currentIds.has(conv.conversationId)
          );

          if (newConversations.length > 0) {
            console.log(
              "Polling detected new conversations:",
              newConversations.length,
              newConversations
            );

            // Update our conversations state with the new ones at the top
            setConversations((prev) => {
              const updated = [...newConversations, ...prev];
              // Sort by latest message time
              return updated.sort((a, b) => {
                const timeA = a.lastMessage?.createdAt
                  ? new Date(a.lastMessage.createdAt).getTime()
                  : 0;
                const timeB = b.lastMessage?.createdAt
                  ? new Date(b.lastMessage.createdAt).getTime()
                  : 0;
                return timeB - timeA;
              });
            });

            // Join the socket rooms for these new conversations
            const newIds = newConversations.map((c) => c.conversationId);
            console.log("Joining new conversation rooms from polling:", newIds);
            socketService.joinConversations(newIds);

            // Flash a notification to the user about new conversations
            try {
              // Show browser notification if supported
              if (
                "Notification" in window &&
                Notification.permission === "granted"
              ) {
                new Notification("New conversation", {
                  body: `You have ${newConversations.length} new conversation${newConversations.length > 1 ? "s" : ""}`,
                });
              }
            } catch (notificationError) {
              console.error("Error showing notification:", notificationError);
            }
          }
        }
      } catch (error) {
        console.error("Error polling for conversations:", error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [conversations, isLoading]);

  const value = {
    conversations,
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
