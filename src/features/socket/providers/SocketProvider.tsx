// SocketProvider.tsx
import React, { useEffect, useRef, ReactNode } from "react";
import socketService from "../../../utils/socketService";

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

  return <>{children}</>;
};

export default SocketProvider;