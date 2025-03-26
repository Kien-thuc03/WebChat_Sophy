import { useState, ReactNode, useCallback, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { User } from "../types/authTypes";
import {
  login as apiLogin,
  fetchUserData,
  getUserByPhone,
  changePassword as apiChangePassword, // Import hàm changePassword từ API
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

        if (!response?.userId || !response?.accessToken) {
          console.error("Invalid login response:", response);
          throw new Error("Đăng nhập thất bại, không có dữ liệu hợp lệ");
        }

        // Store accessToken and userId in localStorage
        localStorage.setItem("token", response.accessToken);
        localStorage.setItem("userId", response.userId);

        try {
          // Fetch user data using the phone number
          const userData = await getUserByPhone(form.phone);
          setUser(userData);
        } catch (error) {
          // If fetching user data fails, clean up localStorage
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

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string): Promise<void> => {
      if (!user) {
        throw new Error("Người dùng chưa đăng nhập");
      }

      try {
        // Gọi API changePassword
        await apiChangePassword(oldPassword, newPassword);

        // Không trả về chuỗi, chỉ xử lý thành công
      } catch (error: unknown) {
        console.error("Lỗi khi đổi mật khẩu:", error);

        // Kiểm tra kiểu của error
        if (error instanceof Error) {
          throw new Error(
            error.message || "Không thể đổi mật khẩu, vui lòng thử lại"
          );
        }

        // Nếu error không phải là Error, ném lỗi mặc định
        throw new Error("Không thể đổi mật khẩu, vui lòng thử lại");
      }
    },
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};
