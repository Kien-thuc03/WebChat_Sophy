import { Navigate } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { ReactNode, useEffect, useState } from "react";
import { Spin } from "antd";
import { useConversationContext } from "../../features/chat/context/ConversationContext";

// const PrivateRoute = ({ children }: { children: JSX.Element }) => {
//   const { user } = useAuth(); // Sử dụng hook useAuth để kiểm tra người dùng
//   console.log("User in PrivateRoute:", user);
//   return user ? children : <Navigate to="/" />; // Chuyển hướng nếu không có người dùng
// };
const PrivateRoute = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { isLoading, refreshConversations, conversations } = useConversationContext();
  const token = localStorage.getItem("token");
  const [showLoading, setShowLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState<'auth' | 'data' | 'complete'>('auth');
  const [loadingText, setLoadingText] = useState("Đang xác thực tài khoản...");
  
  // When component mounts, initiate loading sequence
  useEffect(() => {
    if (!token) return;
    
    let timer: NodeJS.Timeout;
    
    // First stage - authenticating
    setLoadingStage('auth');
    setLoadingText("Đang xác thực tài khoản...");
    
    if (user) {
      // User is already loaded, move to data loading stage
      setLoadingStage('data');
      setLoadingText("Đang tải dữ liệu hội thoại...");
      refreshConversations();
      
      // After minimum display time, check if data is loaded
      timer = setTimeout(() => {
        if (conversations.length > 0 || !isLoading) {
          // If we have conversations or loading is complete, finish
          setLoadingStage('complete');
          setTimeout(() => setShowLoading(false), 300);
        }
      }, 1200);
    } else {
      // User is not loaded yet, wait for user info
      timer = setTimeout(() => {
        if (user) {
          // User loaded, move to data stage
          setLoadingStage('data');
          setLoadingText("Đang tải dữ liệu hội thoại...");
          refreshConversations();
        }
      }, 800);
    }
    
    return () => clearTimeout(timer);
  }, [user, token]);
  
  // When loading stage changes to data, monitor data loading
  useEffect(() => {
    if (loadingStage === 'data') {
      const timer = setTimeout(() => {
        if (!isLoading || conversations.length > 0) {
          setLoadingStage('complete');
          setTimeout(() => setShowLoading(false), 300);
        }
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, conversations, loadingStage]);
  
  // When loading completes, hide loading screen
  useEffect(() => {
    if (loadingStage === 'complete') {
      const timer = setTimeout(() => {
        setShowLoading(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [loadingStage]);

  if (!token) {
    return <Navigate to="/" />;
  }

  if (showLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 loading-screen">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md loading-content max-w-md">
          <Spin size="large" />
          <h2 className="mt-6 text-xl font-semibold text-gray-800 dark:text-gray-200">
            {loadingText}
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {loadingStage === 'auth' 
              ? "Vui lòng đợi trong giây lát..." 
              : "Đang chuẩn bị hiển thị cuộc trò chuyện..."}
          </p>
          <div className="mt-4 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ 
                width: loadingStage === 'auth' 
                  ? '33%' 
                  : loadingStage === 'data' 
                    ? '66%' 
                    : '100%' 
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PrivateRoute;
