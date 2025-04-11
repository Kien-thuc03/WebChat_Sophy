import React, { useEffect, useRef, ReactNode } from "react";
import socketService from "../../../utils/socketService";

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const initialized = useRef(false);

  useEffect(() => {
    // Only initialize socket once
    if (!initialized.current) {
      initialized.current = true;

      // Initialize socket connection
      socketService.connect();

      // Check if user is already logged in
      const userId = localStorage.getItem("userId");
      if (userId) {
        // Authenticate socket if user is logged in
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

    // Cleanup only when component is truly unmounting
    return () => {
      if (initialized.current) {
        socketService.disconnect();
        initialized.current = false;
      }
    };
  }, []);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      socketService.connect();

      const userId = localStorage.getItem("userId");
      if (userId) {
        socketService.authenticate(userId);
      }
    }

    return () => {
      // Chỉ cleanup khi thực sự unmount component
      if (initialized.current) {
        socketService.cleanup(); // Sử dụng cleanup thay vì disconnect
        initialized.current = false;
      }
    };
  }, []);

  return <>{children}</>;
};

export default SocketProvider;
