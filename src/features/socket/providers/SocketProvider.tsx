// SocketProvider.tsx
import React, { useEffect, useRef, ReactNode } from "react";
import socketService from "../../../services/socketService";
import { useConversationContext } from "../../chat/context/ConversationContext";

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const initialized = useRef(false);
  const { addNewConversation } = useConversationContext();

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;

      // Initialize socket connection
      socketService.connect();

      // Check if user is already logged in
      const userId = localStorage.getItem("userId");
      if (userId) {
        socketService.authenticate(userId);

        // Đăng ký lắng nghe trạng thái active của người dùng
        socketService.listenToUserActivityStatus();

        // Đăng ký lắng nghe trạng thái online của người dùng
        socketService.listenToOnlineStatus();

        // Register listener for new conversations
        socketService.onNewConversation((data) => {
          // Make sure this conversation is for the current user
          const { creatorId, receiverId } = data.conversation;

          console.log("Current userId:", userId);
          console.log(
            "Conversation participants - creator:",
            creatorId,
            "receiver:",
            receiverId
          );

          if (receiverId === userId || creatorId === userId) {
            console.log(
              "This conversation is for the current user, adding to context"
            );
            addNewConversation(data);

            // If we have the conversation ID, join it for real-time updates
            if (data.conversation.conversationId) {
              console.log(
                "Joining new conversation room:",
                data.conversation.conversationId
              );
              socketService.joinConversations([
                data.conversation.conversationId,
              ]);
            }
          } else {
            console.log(
              "This conversation is not for the current user, ignoring"
            );
          }
        });

        // Get any conversation IDs from localStorage and join their rooms
        try {
          const conversationsData = localStorage.getItem("lastConversations");
          if (conversationsData) {
            const conversations = JSON.parse(conversationsData);
            if (Array.isArray(conversations) && conversations.length > 0) {
              const conversationIds = conversations
                .map((conv) => conv.conversationId)
                .filter(Boolean);
              if (conversationIds.length > 0) {
                socketService.joinConversations(conversationIds);
              }
            }
          }
        } catch (error) {
          console.error(
            "Error joining conversation rooms from localStorage:",
            error
          );
        }
      }

      // Handle reconnection
      socketService.onReconnect(() => {
        const userId = localStorage.getItem("userId");
        if (userId) {
          socketService.authenticate(userId);
        }
      });
    }

    // Cleanup on unmount
    return () => {
      if (initialized.current) {
        socketService.cleanup();
        initialized.current = false;
      }
    };
  }, [addNewConversation]);

  // Register additional socket listeners when user is authenticated
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (userId) {
      // Register listeners for message events like recall and delete
      const setupMessageListeners = () => {
        socketService.onMessageRecall((data) => {
          console.log("Message recalled:", data);
          // No need to handle here, handled in ChatArea component
        });

        socketService.onMessageDeleted((data) => {
          console.log("Message deleted for user:", data);
          // No need to handle here, handled in ChatArea component
        });

        socketService.onMessagePinned((data) => {
          console.log("Message pinned:", data);
          // No need to handle here, handled in ChatArea component
        });

        socketService.onMessageUnpinned((data) => {
          console.log("Message unpinned:", data);
          // No need to handle here, handled in ChatArea component
        });
      };

      setupMessageListeners();
    }
  }, []);

  return <>{children}</>;
};

export default SocketProvider;
