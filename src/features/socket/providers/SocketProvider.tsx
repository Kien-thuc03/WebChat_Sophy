// SocketProvider.tsx
import React, { useEffect, useRef, ReactNode } from "react";
import socketService from "../../../services/socketService";

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const initialized = useRef(false);

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
  }, []);

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