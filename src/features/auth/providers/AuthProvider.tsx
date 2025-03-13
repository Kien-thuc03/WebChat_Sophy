import { useState, ReactNode, useCallback, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { User } from "../types/authTypes";
import { checkLogin, fetchUserData } from "../../../api/API";

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
        const response = await checkLogin(form.phone, form.password);
        console.log("Login API response:", response);
  
        if (!response?.userId || !response?.token) {
          throw new Error("Đăng nhập thất bại, không có dữ liệu hợp lệ");
        }
  
        localStorage.setItem("token", response.token);
        localStorage.setItem("userId", response.userId); // ✅ Lưu userId
  
        const userData = await fetchUserData(response.userId);
        console.log("Fetched user data:", userData);
  
        if (!userData) {
          throw new Error("Không lấy được thông tin người dùng");
        }
  
        setUser(userData);
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
