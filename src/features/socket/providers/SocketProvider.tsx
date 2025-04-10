import React, { useEffect, ReactNode } from 'react';
import socketService from '../../../utils/socketService';

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  useEffect(() => {
    // Initialize socket connection
    socketService.connect();

    // Check if user is already logged in
    const userId = localStorage.getItem('userId');
    if (userId) {
      // Authenticate socket if user is logged in
      socketService.authenticate(userId);
    }

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  return <>{children}</>;
};

export default SocketProvider; 