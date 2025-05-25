import React, { createContext, useContext, useEffect, useState } from "react";
import { ConfigProvider, theme } from "antd";

interface ThemeContextType {
  themeMode: "light" | "dark" | "system";
  setThemeMode: (mode: "light" | "dark" | "system") => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">(
    (localStorage.getItem("themeMode") as "light" | "dark" | "system") || "light"
  );

  useEffect(() => {
    localStorage.setItem("themeMode", themeMode);

    const applyTheme = () => {
      // const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const isDark = themeMode === "dark";
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    applyTheme();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      if (themeMode === "system") {
        applyTheme();
      }
    };
    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, [themeMode]);

  const getThemeConfig = () => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = themeMode === "dark";
    return {
      algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: {
        colorPrimary: "#1890ff",
      },
    };
  };

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode }}>
      <ConfigProvider theme={getThemeConfig()}>
        {children}
      </ConfigProvider>
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