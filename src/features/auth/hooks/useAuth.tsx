import { useState, useContext, createContext, ReactNode, useCallback } from "react";
import { AuthContextType, User } from "../types/authTypes"; // Import các kiểu dữ liệu

// Tạo context với giá trị mặc định
const AuthContext = createContext<AuthContextType>({
    user: null,
    login: async () => {},
    logout: () => {},
  });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (form: { phone: string; password: string }) => {
    try {
      // Validate số điện thoại
      const phonePattern = /^[0-9]{10}$/;
      if (!phonePattern.test(form.phone)) {
        throw new Error("Số điện thoại phải có 10 chữ số");
      }

      // Giả lập API call
      const fakeUser: User = {
        id: "1",
        name: "Người dùng mẫu",
        phone: form.phone,
      };
      setUser(fakeUser);
      localStorage.setItem("token", "fake-token");
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("token");
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth phải được dùng trong AuthProvider");
  }
  return context;
};