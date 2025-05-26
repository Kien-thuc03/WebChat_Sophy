// LanguageContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
} from "react";
import translations from "../context/Languages"; // Đảm bảo đường dẫn đúng

type Language = "vi" | "en";
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (typeof translations)[Language];
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Get initial language from localStorage or use "vi" as default
  const [language, setLanguageState] = useState<Language>(
    () => (localStorage.getItem("language") as Language) || "vi"
  );

  // Effect to save language preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("language", language);
    console.log("Language saved to localStorage:", language);
  }, [language]);

  // Sử dụng useCallback để tối ưu hóa setLanguage
  const setLanguage = useCallback((lang: Language) => {
    console.log("Setting language to:", lang); // Thêm log để debug
    setLanguageState(lang);
  }, []);

  // Create the translations object for the current language
  const t = translations[language];

  // Use a memoized context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(() => {
    return { language, setLanguage, t };
  }, [language, setLanguage, t]);

  return (
    <LanguageContext.Provider value={contextValue}>
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
