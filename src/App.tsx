import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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

const App = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <SocketProvider>
          <ConversationProvider>
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
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/verify-otp" element={<VerifyOTP />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Routes>
          </Router>
          </ConversationProvider>
        </SocketProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;