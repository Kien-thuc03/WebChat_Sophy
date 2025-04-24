import React, { useEffect, useRef, ReactNode } from "react";
import socketService from "../../../services/socketService";
import { useConversationContext } from "../../chat/context/ConversationContext";

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const initialized = useRef(false);
  const authenticated = useRef(false);
  const { addNewConversation } = useConversationContext();

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;

      // Initialize socket connection
      socketService.connect();

      // Check if user is already logged in
      const userId = localStorage.getItem("userId");
      if (userId && !authenticated.current) {
        authenticated.current = true;
        socketService.authenticate(userId);

        // Đăng ký lắng nghe trạng thái active của người dùng
        socketService.listenToUserActivityStatus();

        // Đăng ký lắng nghe trạng thái online của người dùng
        socketService.listenToOnlineStatus();

        // Register listener for new conversations
        socketService.onNewConversation((data) => {
          console.log("SocketProvider: Received new conversation event:", data);
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

        // Register listener for ZEGOCLOUD token
        socketService.onZegoToken((data) => {
          console.log("SocketProvider: Received ZEGOCLOUD token:", {
            token: data.token.slice(0, 20) + "...",
            appID: data.appID,
            userId: data.userId,
            effectiveTimeInSeconds: data.effectiveTimeInSeconds,
          });
        });

        // Register listener for call events (for debugging purposes)
        socketService.onStartCall((data) => {
          console.log(
            "SocketProvider: Received startCall event at provider level:",
            data
          );
          // Logic xử lý ở đây nếu cần, nhưng hiện tại ChatHeader.tsx đã xử lý
        });

        socketService.onEndCall((data) => {
          console.log(
            "SocketProvider: Received endCall event at provider level:",
            data
          );
          // Logic xử lý ở đây nếu cần, nhưng hiện tại ChatHeader.tsx đã xử lý
        });

        socketService.onCallError((data) => {
          console.log(
            "SocketProvider: Received callError event at provider level:",
            data
          );
          // Logic xử lý ở đây nếu cần, nhưng hiện tại ChatHeader.tsx đã xử lý
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
                console.log(
                  "SocketProvider: Joining conversations from localStorage:",
                  conversationIds
                );
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
        if (userId && !authenticated.current) {
          authenticated.current = true;
          socketService.authenticate(userId);

          // Re-register ZEGOCLOUD token listener
          socketService.onZegoToken((data) => {
            console.log(
              "SocketProvider: Re-registered ZEGOCLOUD token listener:",
              {
                token: data.token.slice(0, 20) + "...",
                appID: data.appID,
                userId: data.userId,
                effectiveTimeInSeconds: data.effectiveTimeInSeconds,
              }
            );
          });

          // Re-register call event listeners
          socketService.onStartCall((data) => {
            console.log(
              "SocketProvider: Re-registered startCall event listener:",
              data
            );
          });

          socketService.onEndCall((data) => {
            console.log(
              "SocketProvider: Re-registered endCall event listener:",
              data
            );
          });

          socketService.onCallError((data) => {
            console.log(
              "SocketProvider: Re-registered callError event listener:",
              data
            );
          });
        }
      });
    }

    // Cleanup on unmount
    return () => {
      if (initialized.current) {
        authenticated.current = false;
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
        });

        socketService.onMessageDeleted((data) => {
          console.log("Message deleted for user:", data);
        });

        socketService.onMessagePinned((data) => {
          console.log("Message pinned:", data);
        });

        socketService.onMessageUnpinned((data) => {
          console.log("Message unpinned:", data);
        });
      };

      setupMessageListeners();
    }
  }, []);

  return <>{children}</>;
};

export default SocketProvider;
