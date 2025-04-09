// LanguageContext.tsx
import React, { createContext, useState, useContext, useCallback } from "react";
import translations from "../context/Languages"; // Đảm bảo đường dẫn đúng

type Language = "vi" | "en";
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations[Language];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("vi");

  // Sử dụng useCallback để tối ưu hóa setLanguage
  const setLanguage = useCallback((lang: Language) => {
    console.log("Setting language to:", lang); // Thêm log để debug
    setLanguageState(lang);
  }, []);

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};