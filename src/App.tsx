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
import ZegoTokenTest from "./components/zego/ZegoTokenTest";
import ZegoDebug from "./components/zego/ZegoDebug";

const App = () => {
  return (
    <ConfigProvider>
      <AntApp>
        <ThemeProvider>
          <LanguageProvider>
            <ConversationProvider>
              <SocketProvider>
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
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route
                      path="/zego-test"
                      element={
                        <PrivateRoute>
                          <ZegoTokenTest />
                        </PrivateRoute>
                      }
                    />
                    <Route path="/zego-debug" element={<ZegoDebug />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </Router>
                {/* Global Modal for displaying notifications like forceLogout */}
                <ModalDialog />
              </SocketProvider>
            </ConversationProvider>
          </LanguageProvider>
        </ThemeProvider>
      </AntApp>
    </ConfigProvider>
  );
};

export default App;
