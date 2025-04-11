import React, { createContext, useContext, useEffect, useState } from "react";
import { ConfigProvider, theme } from "antd";
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

interface ThemeContextType {
  themeMode: "light" | "dark" | "system";
  setThemeMode: (mode: "light" | "dark" | "system") => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">(
    (localStorage.getItem("themeMode") as "light" | "dark" | "system") ||
      "system"
  );

  useEffect(() => {
    localStorage.setItem("themeMode", themeMode);
  }, [themeMode]);

  const getThemeConfig = () => {
    if (themeMode === "dark") {
      return {
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#1890ff",
        },
      };
    }
    if (themeMode === "light") {
      return {
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#1890ff",
        },
      };
    }
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    return {
      algorithm: prefersDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: {
        colorPrimary: "#1890ff",
      },
    };
  };

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode }}>
      <ConfigProvider theme={getThemeConfig()}>{children}</ConfigProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

const App = () => {
  const { themeMode } = useTheme();

  return (
    <div className={`${themeMode === 'dark' ? 'dark' : ''} min-h-screen bg-white dark:bg-gray-900`}>
      <LanguageProvider>
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
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/verify-otp" element={<VerifyOTP />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Routes>
          </Router>
        </SocketProvider>
      </LanguageProvider>
    </div>
  );
};

export default App;
