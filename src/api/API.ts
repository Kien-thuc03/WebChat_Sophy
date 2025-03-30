import axios, { AxiosError } from "axios";
import { Conversation } from "../features/chat/types/conversationTypes";
// import bcrypt from "bcryptjs";

// Khai báo URL API chính
const API_BASE_URL = "http://localhost:3000";

// Tạo instance Axios
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const generateQRToken = async () => {
  try {
    const response = await apiClient.post("/api/auth/generate-qr-token");
    return {
      qrToken: response.data.qrToken,
      expiresAt: response.data.expiresAt
    };
  } catch (error) {
    throw new Error("Không thể tạo mã QR");
  }
};

export const verifyQRToken = async (qrToken: string) => {
  try {
    const response = await apiClient.post("/api/auth/verify-qr-token", { qrToken });
    return {
      message: response.data.message
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error("QR token không tồn tại hoặc đã hết hạn");
    }
    if (error.response?.status === 400) {
      throw new Error("QR token đã hết hạn");
    }
    throw new Error("Xác thực mã QR thất bại");
  }
};

export const checkQRStatus = async (qrToken: string) => {
  try {
    const response = await apiClient.post(`/api/auth/check-qr-status/${qrToken}`);
    return {
      status: response.data.status,
      message: response.data.message,
      userId: response.data.userId,
      accessToken: response.data.accessToken
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error("QR token không tồn tại hoặc đã hết hạn");
    }
    if (error.response?.status === 400) {
      throw new Error("QR token đã hết hạn");
    }
    throw new Error("Kiểm tra trạng thái QR thất bại");
  }
};

export const login = async (phone: string, password: string) => {
  try {
    const response = await apiClient.post("/api/auth/login", {
      phone: phone.replace(/\+84/g, "0"),
      password,
    });

    const { token, user } = response.data;

    if (!token?.accessToken || !token?.refreshToken || !user || !user.userId) {
      throw new Error("Dữ liệu đăng nhập không hợp lệ");
    }

    // Lưu userId, accessToken và refreshToken vào localStorage
    localStorage.setItem("userId", user.userId);
    localStorage.setItem("token", token.accessToken);
    localStorage.setItem("refreshToken", token.refreshToken);

    return {
      userId: user.userId,
      accessToken: token.accessToken,
      fullname: user.fullname,
    };
  } catch (error: any) {
    // Xử lý lỗi từ API
    if (error.response?.status === 404) {
      throw new Error("Tài khoản không tồn tại");
    }
    if (error.response?.status === 401) {
      throw new Error("Sai mật khẩu");
    }
    if (error.response?.status === 400) {
      throw new Error(
        error.response.data.message || "Thông tin đăng nhập không hợp lệ"
      );
    }

    console.error("Login error:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || "Đăng nhập thất bại, vui lòng thử lại"
    );
  }
};

// Sửa lại endpoint và xử lý lỗi cho fetchUserData
export const fetchUserData = async (userId: string) => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Không có token xác thực");
    }

    const response = await apiClient.get(`/api/users/get-user-by-id/${userId}`);

    console.log("Fetch user data response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw new Error("Không tìm thấy người dùng!");
  }
};

// Hàm kiểm tra thông tin đăng nhập
export const checkLogin = async (phone: string, password: string) => {
  try {
    const response = await apiClient.get("/api/users");
    const users = response.data;
    console.log("Users:", users);

    const user = users.find((user: any) => user.phone_number === phone);

    if (user && password === user.hash_password) {
      // Simulate generating an access token (replace with actual token logic if available)
      const accessToken = `access-token-for-${user._id}`;
      console.log("User found:", user);
      return { userId: user._id, accessToken };
    }

    throw new Error("Sai số điện thoại hoặc mật khẩu");
  } catch (error: any) {
    console.error(
      "Error in checkLogin:",
      error.response?.data || error.message
    );
    throw new Error(
      error.response?.data?.message || "Đăng nhập thất bại, vui lòng thử lại"
    );
  }
};

const getAuthToken = () => localStorage.getItem("token");

// Update apiClient to include auth token in headers when available
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and it's not a retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request while refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          throw new Error("Refresh token not available");
        }

        // Call the refresh endpoint với refreshToken trong header
        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {}, {
          headers: {
            'Authorization': `Bearer ${refreshToken}`
          }
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Update tokens in localStorage
        localStorage.setItem("token", accessToken);
        localStorage.setItem("refreshToken", newRefreshToken);
        
        // Cập nhật header Authorization với accessToken mới
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

        // Process the queued requests
        processQueue(null, accessToken);

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (err) {
        processQueue(err, null);

        // If refresh fails, clear tokens and log out the user
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userId");
        window.location.href = "/"; // Redirect to login page
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const getUserByPhone = async (phone: string) => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Không có token xác thực");
    }

    const response = await apiClient.get(`/api/users/get-user/${phone}`);
    console.log("Get user by phone response:", response.data);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      await apiClient.patch("/api/auth/refresh");
    }
    if (error.response?.status === 404) {
      throw new Error("Không tìm thấy người dùng");
    }
    console.error("Error fetching user by phone:", error);
    throw new Error("Lỗi khi lấy thông tin người dùng");
  }
};

export const logout = async () => {
  try {
    const response = await apiClient.post("/api/auth/logout");
    localStorage.removeItem("token");
    console.log("Đăng xuất thành công:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("Lỗi khi đăng xuất:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || "Đăng xuất thất bại, vui lòng thử lại"
    );
  }
};
export const changePassword = async (
  oldPassword: string,
  newPassword: string
): Promise<string> => {
  try {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      throw new Error("Không tìm thấy thông tin người dùng");
    }

    const response = await apiClient.post("/api/auth/change-password", {
      userId,
      oldPassword,
      newPassword,
    });

    if (response.status !== 200) {
      throw new Error("Thay đổi mật khẩu không thành công");
    }

    return response.data.message || "Thay đổi mật khẩu thành công";
  } catch (error: unknown) {
    console.error("Error in changePassword:", error);

    if (error instanceof AxiosError && error.response) {
      throw new Error(error.response.data.message || "Lỗi từ server");
    }

    throw new Error("Không thể thay đổi mật khẩu, vui lòng thử lại");
  }
};

//Hàm lấy user theo userId
export const getUserById = async (userId: string): Promise<any> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Không có token xác thực");
    }

    const response = await apiClient.get(`/api/users/${userId}`);
    console.log("Get user by ID response:", response.data);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error("Không có quyền truy cập");
    }
    if (error.response?.status === 404) {
      throw new Error("Không tìm thấy người dùng");
    }
    console.error("Error fetching user by ID:", error);
    throw new Error("Lỗi khi lấy thông tin người dùng");
  }
};



// Hàm lấy danh sách hội thoại
export const fetchConversations = async (): Promise<Conversation[]> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Không có token xác thực");
    }

    const response = await apiClient.get("/api/conversations");

    if (!Array.isArray(response.data)) {
      console.error("Invalid conversations data format:", response.data);
      return [];
    }

    // Transform and validate conversations
    const validConversations = response.data;

    console.log("Processed conversations:", validConversations);
    return validConversations;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách hội thoại:", error);
    return []; // Return empty array instead of throwing
  }
};

// Kiểm tra số điện thoại đã được sử dụng chưa
export const checkUsedPhone = async (phone: string): Promise<{ otpId: string; otp: string }> => {
  try {
    const response = await apiClient.get(`/api/auth/check-used-phone/${phone}`);
    return {
      otpId: response.data.otpId,
      otp: response.data.otp
    };
  } catch (error: any) {
    if (error.response?.status === 400) {
      throw new Error(error.response.data.message || "Số điện thoại không hợp lệ");
    }
    throw new Error("Không thể kiểm tra số điện thoại");
  }
};

// Xác thực mã OTP
export const verifyPhoneOTP = async (phone: string, otp: string, otpId: string): Promise<void> => {
  try {
    const response = await apiClient.post("/api/auth/verify-phone-otp", {
      phone,
      otp,
      otpId
    });
    console.log("Verify phone OTP response:", response.data);
    if (response.data.message !== "Phone verified successfully") {
      throw new Error(response.data.message || "Xác thực OTP thất bại");
    }
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Xác thực OTP thất bại"
    );
  }
};

// Đăng ký tài khoản mới
export const register = async (
  phone: string,
  password: string,
  fullname: string,
  isMale: boolean,
  birthday: string
) => {
  try {
    const response = await apiClient.post("/api/auth/register", {
      phone,
      password,
      fullname,
      isMale,
      birthday
    });

    const { token, user } = response.data;

    if (!token?.accessToken || !token?.refreshToken || !user || !user.userId) {
      throw new Error("Dữ liệu đăng ký không hợp lệ");
    }

    localStorage.setItem("userId", user.userId);
    localStorage.setItem("token", token.accessToken);
    localStorage.setItem("refreshToken", token.refreshToken);

    return {
      userId: user.userId,
      accessToken: token.accessToken,
      fullname: user.fullname
    };
  } catch (error: any) {
    if (error.response?.status === 400) {
      throw new Error(
        error.response.data.message || "Thông tin đăng ký không hợp lệ"
      );
    }
    throw new Error("Đăng ký thất bại, vui lòng thử lại");
  }
};
