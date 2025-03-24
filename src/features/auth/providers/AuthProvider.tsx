import { useState, ReactNode, useCallback, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { User } from "../types/authTypes";
import {
  login as apiLogin,
  fetchUserData,
  getUserByPhone,
} from "../../../api/API";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  // Kiểm tra token khi khởi động ứng dụng
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId"); // Lưu userId khi login

    if (token && userId) {
      const fetchUser = async () => {
        try {
          const userData = await fetchUserData(userId);
          if (userData) {
            setUser(userData);
          } else {
            localStorage.removeItem("token");
            localStorage.removeItem("userId");
          }
        } catch (error) {
          console.error("Lỗi khi lấy thông tin người dùng:", error);
          localStorage.removeItem("token");
          localStorage.removeItem("userId");
        }
      };
      fetchUser();
    }
  }, []);

  const login = useCallback(
    async (form: { phone: string; password: string }) => {
      try {
        console.log("Attempting login with:", form);
        const response = await apiLogin(form.phone, form.password);

        if (!response?.userId || !response?.token) {
          console.error("Invalid login response:", response);
          throw new Error("Đăng nhập thất bại, không có dữ liệu hợp lệ");
        }

        localStorage.setItem("token", response.token);
        localStorage.setItem("userId", response.userId);
        try {
          const userData = await getUserByPhone(form.phone);
          setUser(userData);
        } catch (error) {
          // If user data fetch fails, clean up
          localStorage.removeItem("token");
          localStorage.removeItem("userId");
          throw error;
        }
      } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        throw error;
      }
    },
    []
  );

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