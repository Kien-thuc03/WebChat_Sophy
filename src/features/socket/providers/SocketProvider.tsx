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

      // Register listeners for group management events
      const setupGroupManagementListeners = () => {
        // When a user leaves a group
        socketService.onUserLeftGroup((data) => {
          console.log("User left group:", data);
          // If the current user was removed, we should update the conversation list
          if (data.userId === userId) {
            // Force reload conversations
            window.dispatchEvent(new CustomEvent("refreshConversations"));
          }
        });

        // When a group is deleted
        socketService.onGroupDeleted((data) => {
          console.log("Group deleted:", data);
          // Force reload conversations
          window.dispatchEvent(new CustomEvent("refreshConversations"));
        });

        // When a co-owner is removed
        socketService.onGroupCoOwnerRemoved((data) => {
          console.log("Group co-owner removed:", data);
          // If it's the current user being removed as co-owner, refresh conversation for updated permissions
          if (data.removedCoOwner === userId) {
            window.dispatchEvent(
              new CustomEvent("refreshConversationDetail", {
                detail: { conversationId: data.conversationId },
              })
            );
          }
        });

        // When a co-owner is added
        socketService.onGroupCoOwnerAdded((data) => {
          console.log("Group co-owner added:", data);
          // If current user is in the new co-owners list, refresh conversation for updated permissions
          if (data.newCoOwnerIds.includes(userId)) {
            window.dispatchEvent(
              new CustomEvent("refreshConversationDetail", {
                detail: { conversationId: data.conversationId },
              })
            );
          }
        });

        // When group owner changes
        socketService.onGroupOwnerChanged((data) => {
          console.log("Group owner changed:", data);
          // If current user is the new owner or was previously the owner, refresh
          window.dispatchEvent(
            new CustomEvent("refreshConversationDetail", {
              detail: { conversationId: data.conversationId },
            })
          );
        });

        // When group name changes
        socketService.onGroupNameChanged((data) => {
          console.log("Group name changed:", data);
          // Dispatch event to refresh conversation detail
          window.dispatchEvent(
            new CustomEvent("refreshConversationDetail", {
              detail: {
                conversationId: data.conversationId,
                changedBy: data.changedBy,
              },
            })
          );
        });
      };

      setupMessageListeners();
      setupGroupManagementListeners();
    }
  }, []);

  return <>{children}</>;
};

export default SocketProvider;
