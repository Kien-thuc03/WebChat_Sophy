import { useState, ReactNode, useCallback, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { User } from "../types/authTypes";
import {
  login as apiLogin,
  fetchUserData,
  getUserByPhone,
  changePassword as apiChangePassword, // Import hàm changePassword từ API
} from "../../../api/API";
import socketService from "../../../services/socketService";
import zegoService from "../../../services/zegoService";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  // Kiểm tra token khi khởi động ứng dụng
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
    const refreshToken = localStorage.getItem("refreshToken");
    const fullname = localStorage.getItem("fullname"); // Lấy fullname

    if ((token && userId) || (refreshToken && userId)) {
      const fetchUser = async () => {
        try {
          const userData = await fetchUserData(userId);
          if (userData) {
            setUser(userData);
            // Lưu fullname vào localStorage nếu chưa có
            if (!fullname && userData.fullname) {
              localStorage.setItem("fullname", userData.fullname);
            }

            // Authenticate socket connection with userId
            socketService.authenticate(userId);

            // Khởi tạo ZIM cho cuộc gọi
            if (userData.fullname || fullname) {
              const userName = userData.fullname || fullname;
              console.log("AuthProvider: Khởi tạo ZIM sau khi xác thực token");
              zegoService.initializeZIM(userId, userName).catch((error) => {
                console.error("AuthProvider: Lỗi khởi tạo ZIM:", error);
              });
            }
          } else {
            localStorage.removeItem("token");
            localStorage.removeItem("userId");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("fullname");
          }
        } catch (error) {
          console.error("Lỗi khi lấy thông tin người dùng:", error);
          localStorage.removeItem("token");
          localStorage.removeItem("userId");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("fullname");
        }
      };
      fetchUser();
    }
  }, []);

  // Thêm class vào body để ẩn reCAPTCHA khi người dùng đã đăng nhập
  useEffect(() => {
    if (user) {
      document.body.classList.add("user-logged-in");

      // Ẩn tất cả các thành phần reCAPTCHA
      const recaptchaElements = document.querySelectorAll(
        '.grecaptcha-badge, .g-recaptcha, iframe[src*="recaptcha"]'
      );
      recaptchaElements.forEach((element) => {
        if (element instanceof HTMLElement) {
          element.style.display = "none";
          element.style.visibility = "hidden";
          element.style.opacity = "0";
        }
      });
    } else {
      document.body.classList.remove("user-logged-in");
    }
  }, [user]);

  const login = useCallback(
    async (form: { phone: string; password: string }) => {
      try {
        console.log("Attempting login with:", form);
        const response = await apiLogin(form.phone, form.password);

        if (
          !response?.userId ||
          !response?.accessToken ||
          !response?.refreshToken
        ) {
          console.error("Invalid login response:", response);
          throw new Error("Đăng nhập thất bại, không có dữ liệu hợp lệ");
        }

        // Store accessToken, refreshToken and userId in localStorage
        localStorage.setItem("token", response.accessToken);
        localStorage.setItem("refreshToken", response.refreshToken);
        localStorage.setItem("userId", response.userId.toString());

        try {
          // Fetch user data using the phone number
          const userData = await getUserByPhone(form.phone);
          setUser(userData);

          // Lưu fullname vào localStorage
          if (userData.fullname) {
            localStorage.setItem("fullname", userData.fullname);
          }

          // Authenticate socket connection after successful login
          socketService.authenticate(response.userId.toString());

          // Khởi tạo ZIM ngay sau khi đăng nhập
          if (userData.fullname) {
            console.log("AuthProvider: Khởi tạo ZIM sau khi đăng nhập");
            zegoService
              .initializeZIM(response.userId.toString(), userData.fullname)
              .catch((error) => {
                console.error("AuthProvider: Lỗi khởi tạo ZIM:", error);
              });
          }
        } catch (error) {
          // If fetching user data fails, clean up localStorage
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("userId");
          localStorage.removeItem("fullname");
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
    localStorage.removeItem("fullname");
    // Disconnect socket on logout
    // socketService.disconnect();
  }, []);

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string): Promise<void> => {
      if (!user) {
        throw new Error("Người dùng chưa đăng nhập");
      }

      try {
        const response = await apiChangePassword(oldPassword, newPassword);
        console.log("Change password response in AuthProvider:", response);

        localStorage.setItem("token", response.accessToken);
        localStorage.setItem("refreshToken", response.refreshToken);
        localStorage.setItem("userId", response.userId);

        if (user.phone) {
          const userData = await getUserByPhone(user.phone);
          setUser(userData);
        }
      } catch (error: unknown) {
        const apiError = error as Error;
        console.error("Lỗi khi đổi mật khẩu:", apiError.message);
        throw new Error(apiError.message); // Truyền trực tiếp lỗi từ API
      }
    },
    [user, setUser]
  );

  return (
    <AuthContext.Provider
      value={{ user, setUser, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};
