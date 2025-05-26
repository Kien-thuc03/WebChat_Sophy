import "./utils/logFilterPlugin";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Signin from "./components/auth/Signin";
import Register from "./components/auth/Register";
import Dashboard from "./pages/Dashboard";
import PrivateRoute from "./components/routes/PrivateRoute";
import { LanguageProvider } from "./features/auth/context/LanguageContext";
import SocketProvider from "./features/socket/providers/SocketProvider";
import QRScanner from "./components/auth/QRScanner";
import ForgotPassword from "./components/auth/ForgotPassword";
import VerifyOTP from "./components/auth/VerifyOTP";
import ResetPassword from "./components/auth/ResetPassword";
import { ThemeProvider } from "./features/auth/context/ThemeContext";
import { ConversationProvider } from "./features/chat/context/ConversationContext";
import ModalDialog from "./components/common/ModalDialog";
import { App as AntApp, ConfigProvider } from "antd";
import React, { useEffect } from "react";
import zegoService from "./services/zegoService";

// Khởi tạo âm thanh cuộc gọi đến
if (typeof window !== "undefined") {
  window.callAudioElements = window.callAudioElements || [];
  // Tạo sẵn audio element cho cuộc gọi đến
  window.incomingCallAudio = new Audio("/sounds/incoming-call.mp3");
  window.incomingCallAudio.loop = true;
}

// Component wrapper để khởi tạo Zego
const ZegoInitializer = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const initZIM = async () => {
      const userId = localStorage.getItem("userId");
      const userName = localStorage.getItem("fullname");

      if (userId && userName) {
        console.log("App: Khởi tạo ZIM riêng trước");
        try {
          // Thử khởi tạo ZIM trực tiếp trước
          const zimSuccess = await zegoService.initializeZIM(userId, userName);
          if (zimSuccess) {
            console.log("App: ZIM đã được khởi tạo thành công");
          } else {
            console.log("App: ZIM không khởi tạo được, thử lại sau 2 giây");
            // Thử lại sau 2 giây
            setTimeout(async () => {
              const retrySuccess = await zegoService.initializeZIM(
                userId,
                userName
              );
              if (retrySuccess) {
                console.log("App: ZIM khởi tạo thành công sau khi thử lại");
              } else {
                console.log("App: ZIM không khởi tạo được sau nhiều lần thử");
              }
            }, 2000);
          }
        } catch (error) {
          console.error("App: Lỗi khởi tạo ZIM:", error);
        }
      }
    };

    // Khởi tạo ZIM ngay lập tức khi có thông tin người dùng
    initZIM();

    const initializeZego = async () => {
      const userId = localStorage.getItem("userId");
      const userName = localStorage.getItem("fullname");

      if (userId && userName) {
        try {
          console.log("Initializing Zego service at application level");
          await zegoService.initializeZego(userId, userName, {
            onZIMInitialized: () => console.log("ZIM initialized globally"),
            onCallModalVisibilityChange: () => {},
            onCallingProgressChange: () => {},
          });
          console.log("Zego initialized successfully");
        } catch (error) {
          console.error("Failed to initialize Zego service:", error);
        }
      }
    };

    // Khởi tạo ZegoUIKit sau ZIM
    setTimeout(() => {
      initializeZego();
    }, 1000);

    return () => {
      // Giữ zegoService khi component unmount để tiếp tục nhận cuộc gọi
      // zegoService.cleanup();
    };
  }, []);

  return <>{children}</>;
};

const App = () => {
  return (
    <ConfigProvider>
      <AntApp>
        <ThemeProvider>
          <LanguageProvider>
            <ConversationProvider>
              <SocketProvider>
                <ZegoInitializer>
                  <Router>
                    <Routes>
                      <Route path="/" element={<Signin />} />
                      <Route path="/qr-signin" element={<QRScanner />} />
                      <Route path="/register" element={<Register />} />
                      <Route
                        path="/main"
                        element={
                          <PrivateRoute>
                            <Dashboard />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/dashboard"
                        element={<Navigate to="/main" replace />}
                      />
                      <Route
                        path="/forgot-password"
                        element={<ForgotPassword />}
                      />
                      <Route path="/verify-otp" element={<VerifyOTP />} />
                      <Route
                        path="/reset-password"
                        element={<ResetPassword />}
                      />
                      <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                  </Router>
                  {/* Global Modal for displaying notifications like forceLogout */}
                  <ModalDialog />
                </ZegoInitializer>
              </SocketProvider>
            </ConversationProvider>
          </LanguageProvider>
        </ThemeProvider>
      </AntApp>
    </ConfigProvider>
  );
};

export default App;
