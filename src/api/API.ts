import axios, { AxiosError } from "axios";
import {
  Conversation,
  Message,
} from "../features/chat/types/conversationTypes";
// import bcrypt from "bcryptjs";

// Khai báo URL API chính
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Tạo instance Axios
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
//update tên người dùng
export const updateUserName = async (userId: string, fullname: string) => {
  try {
    const response = await apiClient.put("/api/users/update-user/name", {
      userId,
      fullname,
    });
    return response.data;
  } catch (error: unknown) {
    const apiError = error as AxiosError<{ message?: string }>;
    if (apiError.response?.status === 404) {
      throw new Error("Không tìm thấy người dùng");
    }
    throw new Error(apiError.response?.data?.message || "Lỗi không xác định");
  }
};
//update thông tin người dùng
export const updateUserInfo = async (
  userId: string,
  data: { isMale: boolean; birthday: string; [key: string]: any }
) => {
  try {
    const response = await apiClient.put("/api/users/update-user/info", {
      userId,
      ...data,
    });
    return response.data;
  } catch (error: unknown) {
    const apiError = error as AxiosError<{ message?: string }>;
    if (apiError.response?.status === 404) {
      throw new Error("Không tìm thấy người dùng");
    }
    if (apiError.response?.status === 400) {
      throw new Error(
        apiError.response.data?.message || "Dữ liệu không hợp lệ"
      ); // Truyền lỗi cụ thể từ server
    }
    throw new Error(apiError.response?.data?.message || "Lỗi không xác định");
  }
};
//update avatar người dùng
export const updateUserAvatar = async (imageFile: File): Promise<void> => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Không có token xác thực");
    }

    const formData = new FormData();
    formData.append("avatar", imageFile);

    const response = await fetch(
      `${API_BASE_URL}/api/users/update-user/avatar`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error("Cập nhật avatar thất bại");
    }

    const updatedUser = await response.json();

    // Cập nhật thông tin người dùng vào localStorage
    localStorage.setItem("user", JSON.stringify(updatedUser));
    console.log("Avatar updated successfully:", updatedUser);
  } catch (error: unknown) {
    console.error("Error updating avatar:", error);
    throw new Error(
      error instanceof Error ? error.message : "Lỗi không xác định"
    );
  }
};

export const generateQRToken = async () => {
  try {
    const response = await apiClient.post("/api/auth/generate-qr-token");
    return {
      qrToken: response.data.qrToken,
      expiresAt: response.data.expiresAt,
    };
  } catch (error) {
    throw new Error("Không thể tạo mã QR");
  }
};

export const verifyQRToken = async (qrToken: string) => {
  try {
    const response = await apiClient.post("/api/auth/verify-qr-token", {
      qrToken,
    });
    return {
      message: response.data.message,
    };
  } catch (error: unknown) {
    const apiError = error as AxiosError<{ message?: string }>;
    if (apiError.response?.status === 404) {
      throw new Error("QR token không tồn tại hoặc đã hết hạn");
    }
    if (apiError.response?.status === 400) {
      throw new Error("QR token đã hết hạn");
    }
    throw new Error("Xác thực mã QR thất bại");
  }
};

export const checkQRStatus = async (qrToken: string) => {
  try {
    console.log("qrToken:", qrToken);
    const response = await apiClient.post(
      `/api/auth/check-qr-status/${qrToken}`
    );
    return {
      status: response.data.status,
      message: response.data.message,
      userId: response.data.user.userId,
      accessToken: response.data.token.accessToken,
      refreshToken: response.data.token.refreshToken,
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
    console.log("login with phone:", phone);

    // Đảm bảo số điện thoại đúng định dạng
    let formattedPhone = phone;
    if (phone.startsWith("+84")) {
      formattedPhone = "0" + phone.slice(3);
    }

    const response = await apiClient.post("/api/auth/login", {
      phone: formattedPhone,
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
      refreshToken: token.refreshToken,
      fullname: user.fullname,
    };
  } catch (error: any) {
    // Log chi tiết về lỗi cho debugging
    console.log("=== Chi tiết lỗi đăng nhập ===");
    console.log("Status:", error.response?.status);
    console.log("Response data:", error.response?.data);
    console.log("Error message:", error.message);

    // Xử lý các trường hợp lỗi cụ thể mà không gây reload trang
    if (error.response?.status === 401) {
      // Check if the error message from the server indicates wrong password
      if (
        error.response.data?.message
          ?.toLowerCase()
          .includes("incorrect password")
      ) {
        throw new Error("Sai mật khẩu");
      } else if (
        error.response.data?.message?.toLowerCase().includes("account locked")
      ) {
        throw new Error("Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.");
      }
      throw new Error("Thông tin đăng nhập không chính xác");
    }
    if (error.response?.status === 404) {
      if (
        error.response.data?.message?.toLowerCase().includes("user not found")
      ) {
        throw new Error("Tài khoản không tồn tại");
      }
      throw new Error("Tài khoản không tồn tại");
    }
    if (error.response?.status === 400) {
      if (
        error.response.data?.message
          ?.toLowerCase()
          .includes("invalid phone number format")
      ) {
        throw new Error("Định dạng số điện thoại không hợp lệ");
      } else if (
        error.response.data?.message
          ?.toLowerCase()
          .includes("missing required fields")
      ) {
        throw new Error("Vui lòng điền đầy đủ thông tin đăng nhập");
      }
      throw new Error(
        error.response.data.message || "Thông tin đăng nhập không hợp lệ"
      );
    }
    if (error.response?.status === 429) {
      throw new Error(
        "Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau."
      );
    }

    // Nếu không phải các lỗi trên, trả về thông báo lỗi chung
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

// Function to get config with auth token for axios requests
const getConfig = () => {
  const token = getAuthToken();
  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  };
};

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

    // If the error is 401 and it's not a retry and it's not a login request
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/api/auth/login")
    ) {
      if (originalRequest.url.includes("/api/auth/change-password")) {
        // Nếu là yêu cầu đổi mật khẩu, không logout mà để hàm gọi xử lý lỗi
        return Promise.reject(error);
      }
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          throw new Error("Refresh token not available");
        }

        const response = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          {},
          {
            headers: { Authorization: `Bearer ${refreshToken}` },
          }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        localStorage.setItem("token", accessToken);
        localStorage.setItem("refreshToken", newRefreshToken);
        apiClient.defaults.headers.common["Authorization"] =
          `Bearer ${accessToken}`;
        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userId");
        window.location.href = "/";
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
//Đăng xuất
export const logout = async () => {
  try {
    const response = await apiClient.post("/api/auth/logout");
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userId");

    apiClient.defaults.headers.common["Authorization"] = "";
    console.log("Đăng xuất thành công:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("Lỗi khi đăng xuất:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || "Đăng xuất thất bại, vui lòng thử lại"
    );
  }
};
//Thay đổi mật khẩu
export const changePassword = async (
  oldPassword: string,
  newPassword: string
): Promise<{ accessToken: string; refreshToken: string; userId: string }> => {
  try {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      throw new Error("Không tìm thấy thông tin người dùng");
    }

    const response = await apiClient.put("/api/auth/change-password", {
      userId,
      oldPassword,
      newPassword,
    });

    console.log("Response from changePassword API:", response.data);

    const { token, user } = response.data;

    if (!token?.accessToken || !token?.refreshToken || !user || !user.userId) {
      throw new Error("Dữ liệu không hợp lệ");
    }

    localStorage.setItem("token", token.accessToken);
    localStorage.setItem("refreshToken", token.refreshToken);
    apiClient.defaults.headers.common["Authorization"] =
      `Bearer ${token.accessToken}`;

    return {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      userId: user.userId,
    };
  } catch (error) {
    const apiError = error as AxiosError<{ message?: string }>;
    if (apiError.response) {
      const { status, data } = apiError.response;
      switch (status) {
        case 404:
          throw new Error("Không tìm thấy thông tin người dùng");
        case 401:
          throw new Error("Mật khẩu cũ không đúng");
        case 400:
          if (
            data?.message ===
            "Password must be at least 6 characters and contain both letters and numbers"
          ) {
            throw new Error(
              "Mật khẩu mới phải có ít nhất 6 ký tự và chứa cả chữ và số"
            );
          }
          throw new Error(data?.message || "Yêu cầu không hợp lệ");
        case 500:
          throw new Error("Lỗi server, vui lòng thử lại sau");
        default:
          throw new Error(
            data?.message || "Đổi mật khẩu thất bại, vui lòng thử lại"
          );
      }
    }
    throw new Error("Đổi mật khẩu thất bại, vui lòng thử lại");
  }
};

//Hàm lấy user theo userId
export const getUserById = async (userId: string): Promise<any> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Không có token xác thực");
    }

    const response = await apiClient.get(`/api/users/get-user-by-id/${userId}`);
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
    return validConversations;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách hội thoại:", error);
    return []; // Return empty array instead of throwing
  }
};
// Tạo 1 hội thoại
export const createConversation = async (receiverId: string) => {
  try {
    console.log("Creating conversation with receiverId:", receiverId);
    const response = await apiClient.post(
      "/api/conversations/create",
      { receiverId },
      getConfig()
    );

    // After successful creation, emit a custom event that our app can listen for
    const newConversation = response.data;
    console.log("Conversation created:", newConversation);

    // Emit a custom event that our components can listen for
    try {
      const customEvent = new CustomEvent("newConversationCreated", {
        detail: {
          conversation: newConversation,
          timestamp: new Date().toISOString(),
        },
      });
      window.dispatchEvent(customEvent);
      console.log("Emitted newConversationCreated event");
    } catch (eventError) {
      console.error("Error emitting newConversationCreated event:", eventError);
    }

    return response.data;
  } catch (error) {
    logApiError("createConversation", error);
    throw error;
  }
};
// Hàm xóa bạn bè
export const removeFriend = async (friendId: string) => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Không có token xác thực");
    }

    const response = await apiClient.delete(
      `/api/users/friends/unfriend/${friendId}`
    );

    if (response.status === 200) {
      return response.data;
    }

    throw new Error("Không thể xóa bạn");
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại");
    }
    if (error.response?.status === 404) {
      throw new Error("Không tìm thấy người dùng");
    }
    console.error("Error removing friend:", error);
    throw new Error(error.response?.data?.message || "Không thể xóa bạn");
  }
};
// chặn 1 người dùng
export const blockUser = async (userId: string) => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Không có token xác thực");
    }

    const response = await apiClient.put(`/api/users/block/${userId}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại");
    }
    if (error.response?.status === 404) {
      throw new Error("Không tìm thấy người dùng");
    }
    console.error("Error blocking user:", error);
    throw new Error(
      error.response?.data?.message || "Không thể chặn người dùng này"
    );
  }
};

// Mở khóa 1 người dùng bị chặn
export const unblockUser = async (userId: string) => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Không có token xác thực");
    }

    const response = await apiClient.put(`/api/users/unblock/${userId}`); // Change to DELETE
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại");
    }
    if (error.response?.status === 404) {
      throw new Error("Không tìm thấy người dùng");
    }
    if (error.response?.status === 400) {
      throw new Error("Người dùng không nằm trong danh sách chặn");
    }
    console.error("Error unblocking user:", error);
    throw new Error(
      error.response?.data?.message || "Không thể bỏ chặn người dùng này"
    );
  }
};

// Lấy danh sách người dùng bị chặn
export const getBlockedUsers = async () => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Không có token xác thực");
    }

    const response = await apiClient.get("/api/users/blocked");
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại");
    }
    console.error("Error fetching blocked users:", error);
    throw new Error(
      error.response?.data?.message ||
        "Không thể lấy danh sách người dùng bị chặn"
    );
  }
};
// Utility function to log errors with more detail
const logApiError = (endpoint: string, error: any) => {
  console.error(`API Error in ${endpoint}:`, {
    message: error.message,
    status: error.response?.status,
    statusText: error.response?.statusText,
    data: error.response?.data,
    requestURL: error.config?.url,
    method: error.config?.method,
    params: error.config?.params,
  });
};

// Get messages
export const getMessages = async (
  conversationId: string,
  lastMessageTime?: string,
  limit = 20,
  direction: "before" | "after" = "before"
) => {
  try {
    console.log(
      `getMessages: Đang lấy tin nhắn cho cuộc trò chuyện ${conversationId}`
    );
    console.log(`API URL: /api/messages/${conversationId}`);
    console.log("Parameters:", { lastMessageTime, limit, direction });

    if (!conversationId || conversationId === "undefined") {
      console.log("getMessages: conversationId không hợp lệ");
      return { messages: [], hasMore: false, nextCursor: null, direction };
    }

    // Xây dựng tham số query
    const params: any = {};
    if (lastMessageTime) {
      params.lastMessageTime = lastMessageTime;
      params.direction = direction;
    }
    // Thêm timeout để tránh treo vô hạn
    const response = await apiClient.get(`/api/messages/${conversationId}`, {
      params,
      timeout: 10000, // Timeout 10 giây
    });

    console.log(
      `getMessages: Nhận được phản hồi với status ${response.status}`
    );

    // Log the entire response for debugging
    console.log("getMessages: Raw response data:", response.data);

    // Kiểm tra và xử lý dữ liệu trả về
    if (!response.data) {
      console.error("getMessages: Không có dữ liệu từ server");
      return { messages: [], hasMore: false, nextCursor: null, direction };
    }

    console.log("getMessages: Cấu trúc dữ liệu nhận được:", {
      isArray: Array.isArray(response.data),
      hasMessages: !!response.data.messages,
      hasConversationId: !!response.data.conversationId,
      keys: Object.keys(response.data),
    });

    // Xử lý nhiều trường hợp định dạng dữ liệu khác nhau
    let messages = [];
    let hasMore = false;
    let nextCursor = null;
    let responseDirection = direction;

    if (Array.isArray(response.data)) {
      // Trường hợp 1: Dữ liệu trả về là mảng tin nhắn trực tiếp
      console.log("getMessages: Dữ liệu trả về là mảng tin nhắn");
      messages = response.data;
    } else if (
      response.data &&
      response.data.messages &&
      Array.isArray(response.data.messages)
    ) {
      // Trường hợp 2: Dữ liệu nằm trong property messages
      console.log("getMessages: Dữ liệu trả về chứa mảng messages");
      messages = response.data.messages;

      // Sử dụng nullish coalescing để đảm bảo giá trị boolean chính xác
      hasMore = response.data.hasMore ?? false;
      nextCursor = response.data.nextCursor ?? null;
      responseDirection = response.data.direction || direction;

      // Log pagination info
      console.log("getMessages: Thông tin phân trang:", {
        hasMore,
        nextCursor,
        direction: responseDirection,
      });
    } else if (response.data && Array.isArray(response.data.data)) {
      // Trường hợp 3: Dữ liệu nằm trong property data
      console.log("getMessages: Dữ liệu trả về chứa mảng data");
      messages = response.data.data;
      hasMore = response.data.hasMore ?? false;
      nextCursor = response.data.nextCursor ?? null;
      responseDirection = response.data.direction || direction;
    } else if (
      response.data &&
      response.data.messageList &&
      Array.isArray(response.data.messageList)
    ) {
      // Trường hợp 4: Dữ liệu nằm trong property messageList
      console.log("getMessages: Dữ liệu trả về chứa mảng messageList");
      messages = response.data.messageList;
      hasMore = response.data.hasMore ?? false;
      nextCursor = response.data.nextCursor ?? null;
      responseDirection = response.data.direction || direction;
    } else if (response.data && response.data.conversationId) {
      // Trường hợp 5: Nhận được đối tượng conversation
      console.log("getMessages: Nhận được đối tượng conversation");
      // Kiểm tra xem đối tượng conversation có chứa tin nhắn không
      if (response.data.messages && Array.isArray(response.data.messages)) {
        messages = response.data.messages;
        hasMore = response.data.hasMore ?? false;
        nextCursor = response.data.nextCursor ?? null;
        responseDirection = response.data.direction || direction;
      } else {
        // Nếu không có tin nhắn trong đối tượng conversation, trả về mảng rỗng
        console.log(
          "getMessages: Không tìm thấy tin nhắn trong đối tượng conversation"
        );
        messages = [];
      }
    } else {
      // Trường hợp không xác định: Log và trả về mảng rỗng
      console.error(
        "getMessages: Định dạng dữ liệu không hợp lệ:",
        response.data
      );
    }

    // Chuẩn hóa các trường trong tin nhắn để phù hợp với frontend
    const normalizedMessages = messages.map((msg: any) => {
      // Đảm bảo mỗi tin nhắn có messageId (dùng messageDetailId nếu cần)
      if (!msg.messageId && msg.messageDetailId) {
        return { ...msg, messageId: msg.messageDetailId };
      }
      return msg;
    });

    console.log("getMessages: Kết quả trả về:", {
      messages: normalizedMessages.length,
      hasMore,
      nextCursor,
      direction: responseDirection,
    });

    return {
      messages: normalizedMessages,
      hasMore,
      nextCursor,
      direction: responseDirection,
    };
  } catch (error: any) {
    logApiError("getMessages", error);
    return { messages: [], hasMore: false, nextCursor: null, direction };
  }
};

// Gửi tin nhắn mới
export const sendMessage = async (
  conversationId: string,
  content: string,
  type: string = "text",
  attachments: any[] = []
): Promise<Message> => {
  try {
    // Kiểm tra tham số đầu vào
    if (!conversationId) {
      throw new Error("ID cuộc trò chuyện không hợp lệ");
    }

    if (!content || content.trim() === "") {
      throw new Error("Nội dung tin nhắn không được để trống");
    }

    const token = getAuthToken();
    if (!token) {
      throw new Error("Không có token xác thực");
    }

    // Gửi yêu cầu với timeout để tránh treo vô hạn
    const response = await apiClient.post(
      `/api/messages/send`,
      {
        conversationId,
        content,
        type,
        attachments,
      },
      {
        timeout: 10000, // Timeout 10 giây
      }
    );

    // Kiểm tra phản hồi hợp lệ
    if (!response || !response.data) {
      throw new Error("Phản hồi không hợp lệ từ server");
    }

    // Kiểm tra dữ liệu tin nhắn có đầy đủ các trường cần thiết không
    const message = response.data;
    // Hỗ trợ cả messageId và messageDetailId
    const messageId = message.messageId || message.messageDetailId;
    if (!messageId || !message.senderId) {
      throw new Error("Dữ liệu tin nhắn không hợp lệ");
    }

    // Chuẩn hóa dữ liệu để phù hợp với frontend
    let result = {
      ...message,
      messageId: messageId,
    };

    // Xử lý nhất quán trường attachment và attachments
    if (type === "image" || type === "file") {
      // Nếu có attachments nhưng không phải array, chuyển đổi sang array
      if (message.attachments && typeof message.attachments === "string") {
        try {
          result.attachments = JSON.parse(message.attachments);
          // Nếu có dữ liệu attachments nhưng không có attachment, tạo attachment từ phần tử đầu tiên
          if (
            result.attachments &&
            Array.isArray(result.attachments) &&
            result.attachments.length > 0 &&
            !result.attachment
          ) {
            result.attachment = result.attachments[0];
          }
        } catch (e) {
          console.error("Lỗi parse attachments:", e);
        }
      }

      // Nếu có attachment nhưng không có attachments, tạo attachments từ attachment
      if (
        message.attachment &&
        (!message.attachments ||
          (Array.isArray(message.attachments) &&
            message.attachments.length === 0))
      ) {
        result.attachments = [message.attachment];
      }

      // Nếu có attachments (dạng array) nhưng không có attachment, tạo attachment từ phần tử đầu tiên
      if (
        Array.isArray(message.attachments) &&
        message.attachments.length > 0 &&
        !message.attachment
      ) {
        result.attachment = message.attachments[0];
      }
    }

    console.log("Normalized message for sending:", result);
    return result;
  } catch (error: any) {
    console.error("Lỗi khi gửi tin nhắn:", error);

    // Xử lý các loại lỗi cụ thể
    if (error.response) {
      if (error.response.status === 401) {
        throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
      } else if (error.response.status === 403) {
        throw new Error(
          error.response.data?.message ||
            "Bạn không có quyền gửi tin nhắn vào cuộc trò chuyện này."
        );
      } else if (error.response.status === 404) {
        throw new Error("Không tìm thấy cuộc trò chuyện.");
      } else if (error.response.data?.message) {
        throw new Error(error.response.data.message);
      }
    }

    if (error.code === "ECONNABORTED") {
      throw new Error(
        "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng."
      );
    }

    throw new Error(
      error.message || "Không thể gửi tin nhắn. Vui lòng thử lại sau."
    );
  }
};

// Lấy chi tiết một cuộc trò chuyện
export const getConversationDetail = async (
  conversationId: string
): Promise<Conversation> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Không có token xác thực");
    }

    const response = await apiClient.get(
      `/api/conversations/${conversationId}`
    );
    return response.data;
  } catch (error: any) {
    console.error("Lỗi khi lấy chi tiết cuộc trò chuyện:", error);
    throw new Error(
      error.response?.data?.message || "Không thể lấy chi tiết cuộc trò chuyện"
    );
  }
};

// Kiểm tra số điện thoại đã được sử dụng chưa
export const checkUsedPhone = async (
  phone: string
): Promise<{ otpId: string; otp: string }> => {
  try {
    console.log("checkUsedPhone with phone:", phone);

    if (!phone) {
      throw new Error("Thiếu số điện thoại. Vui lòng kiểm tra lại.");
    }

    // Đảm bảo số điện thoại có định dạng đúng
    let formattedPhone = phone;
    if (phone.startsWith("+84")) {
      formattedPhone = "0" + phone.slice(3);
    }

    const response = await apiClient.post(
      `/api/auth/check-used-phone/${formattedPhone}`
    );

    console.log("checkUsedPhone response:", response.data);

    if (!response.data.otpId) {
      throw new Error("Không nhận được mã OTP từ server");
    }

    return {
      otpId: response.data.otpId,
      otp: response.data.otp,
    };
  } catch (error: any) {
    console.error("checkUsedPhone error:", error);
    if (error.response) {
      console.error("Error response:", error.response.data);
    }

    if (error.response?.status === 400) {
      // Xử lý các loại lỗi 400 cụ thể
      if (error.response.data?.message === "Invalid phone number format.") {
        throw new Error("Định dạng số điện thoại không hợp lệ.");
      } else if (
        error.response.data?.message === "Phone number is already used"
      ) {
        throw new Error("Số điện thoại này đã được sử dụng.");
      } else {
        throw new Error(
          error.response.data.message || "Số điện thoại không hợp lệ"
        );
      }
    } else if (error.response?.status === 500) {
      if (error.response.data?.message === "Failed to send verification code") {
        throw new Error("Không thể gửi mã xác thực. Vui lòng thử lại sau.");
      } else {
        throw new Error("Lỗi hệ thống. Vui lòng thử lại sau.");
      }
    }
    throw new Error(
      error.response?.data?.message || "Không thể kiểm tra số điện thoại"
    );
  }
};
// Gửi mã Xác thực OTP
export const sendOTPForgotPassword = async (
  phone: string
): Promise<{ otpId: string }> => {
  try {
    console.log("sendOTPForgotPassword with phone:", phone);

    if (!phone) {
      throw new Error("Thiếu số điện thoại. Vui lòng kiểm tra lại.");
    }

    // Đảm bảo số điện thoại có định dạng đúng
    let formattedPhone = phone;
    if (phone.startsWith("+84")) {
      formattedPhone = "0" + phone.slice(3);
    }

    const response = await apiClient.post(
      "/api/auth/send-otp-forgot-password",
      {
        phone: formattedPhone,
      }
    );

    console.log("sendOTPForgotPassword response:", response.data);

    if (!response.data.otpId) {
      throw new Error("Không nhận được mã OTP từ server");
    }

    return {
      otpId: response.data.otpId,
    };
  } catch (error: unknown) {
    console.error("sendOTPForgotPassword error:", error);
    if (error instanceof AxiosError && error.response) {
      console.error("Error response:", error.response.data);
    }

    if (error instanceof AxiosError) {
      if (error.response?.status === 404) {
        if (error.response.data?.message === "User not found") {
          throw new Error("Không tìm thấy tài khoản với số điện thoại này");
        }
        throw new Error("Không tìm thấy tài khoản");
      }

      if (error.response?.status === 400) {
        if (error.response.data?.message === "Invalid phone number format") {
          throw new Error("Định dạng số điện thoại không hợp lệ");
        }
        throw new Error(
          error.response.data?.message || "Thông tin không hợp lệ"
        );
      }

      if (error.response?.status === 429) {
        throw new Error("Vui lòng đợi trước khi gửi lại mã OTP");
      }

      if (error.response?.status === 500) {
        if (
          error.response.data?.message === "Failed to send verification code"
        ) {
          throw new Error("Không thể gửi mã xác thực. Vui lòng thử lại sau.");
        }
        throw new Error("Lỗi máy chủ. Vui lòng thử lại sau.");
      }

      throw new Error(error.response?.data?.message || "Không thể gửi mã OTP");
    }
    throw new Error("Không thể gửi mã OTP");
  }
};
//Xác thực OTP
export const verifyOTPForgotPassword = async (
  phone: string,
  otp: string,
  otpId: string
): Promise<void> => {
  try {
    console.log("verifyOTPForgotPassword input params:", { phone, otp, otpId });

    if (!phone || !otp || !otpId) {
      throw new Error("Thiếu thông tin cần thiết. Vui lòng kiểm tra lại.");
    }

    // Đảm bảo số điện thoại có định dạng đúng
    let formattedPhone = phone;
    if (phone.startsWith("+84")) {
      formattedPhone = "0" + phone.slice(3);
    }

    const response = await apiClient.post(
      "/api/auth/verify-otp-forgot-password",
      {
        phone: formattedPhone,
        otp,
        otpId,
      }
    );

    if (response.status !== 200) {
      throw new Error("Xác thực OTP thất bại");
    }
  } catch (error: unknown) {
    console.error("verifyOTPForgotPassword error:", error);
    if (error instanceof AxiosError && error.response) {
      console.error("Error response:", error.response.data);
    }

    const apiError = error as AxiosError<{ message?: string }>;
    if (apiError.response) {
      const { status, data } = apiError.response;
      switch (status) {
        case 400:
          // Xử lý các loại lỗi cụ thể từ server và chuyển sang tiếng Việt
          if (data?.message === "Invalid verification attempt") {
            throw new Error(
              "Yêu cầu xác thực không hợp lệ. Vui lòng gửi lại mã mới."
            );
          } else if (data?.message === "Invalid OTP") {
            throw new Error("Mã OTP không chính xác.");
          } else if (data?.message === "OTP expired") {
            throw new Error("Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.");
          } else if (data?.message === "Phone number not found") {
            throw new Error(
              "Không tìm thấy số điện thoại. Vui lòng kiểm tra lại."
            );
          } else if (data?.message === "Invalid OTP ID") {
            throw new Error(
              "Mã xác thực không hợp lệ. Vui lòng yêu cầu mã mới."
            );
          } else if (data?.message === "Verification code not found") {
            throw new Error(
              "Không tìm thấy mã xác thực. Vui lòng yêu cầu mã mới."
            );
          } else if (
            data?.message?.includes("verification attempts exceeded")
          ) {
            throw new Error(
              "Quá nhiều lần xác thực thất bại. Vui lòng thử lại sau."
            );
          } else {
            throw new Error(data?.message || "Xác thực OTP thất bại");
          }
        case 404:
          throw new Error("Không tìm thấy mã OTP hợp lệ");
        case 429: // Thêm xử lý lỗi 429
          throw new Error("Quá nhiều lần xác thực. Vui lòng thử lại sau.");
        case 500:
          throw new Error("Lỗi máy chủ. Vui lòng thử lại sau.");
        default:
          throw new Error(data?.message || "Xác thực OTP thất bại");
      }
    }
    throw new Error("Xác thực OTP thất bại");
  }
};

//Quên mật khẩu
export const forgotPassword = async (
  phone: string,
  newPassword: string
): Promise<void> => {
  try {
    console.log("forgotPassword with phone:", phone);

    if (!phone || !newPassword) {
      throw new Error("Thiếu thông tin cần thiết. Vui lòng kiểm tra lại.");
    }

    // Đảm bảo số điện thoại có định dạng đúng
    let formattedPhone = phone;
    if (phone.startsWith("+84")) {
      formattedPhone = "0" + phone.slice(3);
    }

    const response = await apiClient.put("/api/auth/forgot-password", {
      phone: formattedPhone,
      newPassword,
    });

    if (response.status !== 200) {
      throw new Error("Không thể đặt lại mật khẩu");
    }
  } catch (error: unknown) {
    console.error("forgotPassword error:", error);
    if (error instanceof AxiosError && error.response) {
      console.error("Error response:", error.response.data);
    }

    const apiError = error as AxiosError<{ message?: string }>;
    if (apiError.response) {
      const { status, data } = apiError.response;
      switch (status) {
        case 400:
          if (
            data?.message ===
            "Password must be at least 6 characters and contain both letters and numbers"
          ) {
            throw new Error(
              "Mật khẩu mới phải có ít nhất 6 ký tự và chứa cả chữ và số"
            );
          } else if (data?.message === "Missing required fields") {
            throw new Error(
              "Thiếu thông tin cần thiết. Vui lòng kiểm tra lại."
            );
          } else if (data?.message === "Invalid phone number format") {
            throw new Error("Định dạng số điện thoại không hợp lệ");
          } else {
            throw new Error(data?.message || "Thông tin không hợp lệ");
          }
        case 404:
          if (data?.message === "User not found") {
            throw new Error("Không tìm thấy tài khoản với số điện thoại này");
          } else {
            throw new Error(data?.message || "Không tìm thấy người dùng");
          }
        case 401:
          throw new Error("Không được phép thực hiện thao tác này");
        case 429:
          throw new Error("Quá nhiều yêu cầu. Vui lòng thử lại sau.");
        case 500:
          throw new Error(data?.message || "Lỗi server, vui lòng thử lại sau");
        default:
          throw new Error(data?.message || "Không thể đặt lại mật khẩu");
      }
    }
    throw new Error("Không thể đặt lại mật khẩu");
  }
};

// Xác thực mã OTP

export const verifyPhoneOTP = async (
  phone: string,
  otp: string,
  otpId: string
): Promise<void> => {
  try {
    console.log("verifyPhoneOTP input params:", { phone, otp, otpId });

    if (!phone || !otp || !otpId) {
      throw new Error("Thiếu thông tin cần thiết. Vui lòng kiểm tra lại.");
    }

    // Đảm bảo số điện thoại đúng định dạng (bắt đầu bằng 0 ở Việt Nam)
    let formattedPhone = phone;
    if (phone.startsWith("+84")) {
      formattedPhone = "0" + phone.slice(3);
    }

    const response = await apiClient.post("/api/auth/verify-phone-otp", {
      phone: formattedPhone,
      otp,
      otpId,
    });

    console.log("Verify phone OTP response:", response.data);

    // Kiểm tra phản hồi từ server bằng tiếng Anh và chuyển sang tiếng Việt
    if (response.data.message !== "Phone verified successfully") {
      switch (response.data.message) {
        case "Invalid verification attempt":
          throw new Error("Mã xác thực không hợp lệ. Vui lòng yêu cầu mã mới.");
        case "Verification code expired":
        case "OTP expired":
          throw new Error("Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.");
        case "Invalid verification code":
        case "Invalid OTP":
          throw new Error("Mã OTP không chính xác. Vui lòng kiểm tra lại.");
        case "Too many failed attempts. Please request a new code.":
          throw new Error("Quá nhiều lần nhập sai. Vui lòng yêu cầu mã mới.");
        case "Phone number not found":
          throw new Error(
            "Không tìm thấy số điện thoại. Vui lòng kiểm tra lại."
          );
        case "Invalid OTP ID":
          throw new Error("Mã xác thực không hợp lệ. Vui lòng yêu cầu mã mới.");
        case "Verification code not found":
          throw new Error(
            "Không tìm thấy mã xác thực. Vui lòng yêu cầu mã mới."
          );
        default:
          throw new Error(response.data.message || "Xác thực OTP thất bại");
      }
    }
  } catch (error: any) {
    console.error("verifyPhoneOTP error:", error);
    if (error.response) {
      console.error("Error response:", error.response.data);
    }

    // Nếu lỗi đã được xử lý trong khối try, chỉ cần ném lại
    if (error.message && !error.response) {
      throw error;
    }

    // Xử lý lỗi từ API dựa trên mã lỗi HTTP
    if (error.response?.status === 400) {
      // Xử lý các loại lỗi 400 cụ thể
      switch (error.response.data?.message) {
        case "Invalid verification attempt":
          throw new Error("Mã xác thực không hợp lệ. Vui lòng yêu cầu mã mới.");
        case "Verification code expired":
        case "OTP expired":
          throw new Error("Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.");
        case "Invalid verification code":
        case "Invalid OTP":
          throw new Error("Mã OTP không chính xác. Vui lòng kiểm tra lại.");
        case "Too many failed attempts. Please request a new code.":
          throw new Error("Quá nhiều lần nhập sai. Vui lòng yêu cầu mã mới.");
        case "Phone number not found":
          throw new Error(
            "Không tìm thấy số điện thoại. Vui lòng kiểm tra lại."
          );
        case "Invalid OTP ID":
          throw new Error("Mã xác thực không hợp lệ. Vui lòng yêu cầu mã mới.");
        case "Verification code not found":
          throw new Error(
            "Không tìm thấy mã xác thực. Vui lòng yêu cầu mã mới."
          );
        default:
          throw new Error(
            error.response.data?.message || "Thông tin xác thực không hợp lệ"
          );
      }
    } else if (error.response?.status === 404) {
      throw new Error("Không tìm thấy thông tin xác thực");
    } else if (error.response?.status === 429) {
      throw new Error("Quá nhiều lần xác thực. Vui lòng thử lại sau.");
    } else if (error.response?.status === 500) {
      throw new Error("Lỗi máy chủ. Vui lòng thử lại sau.");
    } else if (!error.response) {
      throw new Error("Lỗi kết nối tới máy chủ");
    }
    throw new Error(
      error.response?.data?.message || "Xác thực số điện thoại thất bại"
    );
  }
};

// Upload avatar cho người dùng
export const uploadAvatar = async (imageFile: File): Promise<string> => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Không có token xác thực");
    }

    const formData = new FormData();
    formData.append("avatar", imageFile);

    // Sử dụng fetch API thay vì axios để xử lý tốt hơn với FormData
    const response = await fetch(
      `${API_BASE_URL}/api/users/update-user/avatar`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Cập nhật avatar thất bại");
    }

    const data = await response.json();
    console.log("Avatar uploaded successfully:", data);

    // Trả về URL của avatar mới
    return data.user.urlavatar;
  } catch (error) {
    console.error("Error uploading avatar:", error);
    throw new Error(
      error instanceof Error ? error.message : "Lỗi không xác định khi tải ảnh"
    );
  }
};

// Gửi ảnh trong cuộc trò chuyện
export const sendImageMessage = async (
  conversationId: string,
  imageFile: File
): Promise<Message> => {
  try {
    if (!conversationId) {
      throw new Error("ID cuộc trò chuyện không hợp lệ");
    }

    if (!imageFile) {
      throw new Error("Không có tập tin ảnh được chọn");
    }

    // Kiểm tra xem tập tin có phải là hình ảnh không
    if (!imageFile.type.startsWith("image/")) {
      throw new Error("Tập tin không phải là hình ảnh hợp lệ");
    }

    const token = getAuthToken();
    if (!token) {
      throw new Error("Không có token xác thực");
    }

    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("conversationId", conversationId);

    // Sử dụng fetch API để xử lý tốt hơn với FormData
    const response = await fetch(`${API_BASE_URL}/api/messages/send-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Gửi ảnh thất bại");
    }

    const message = await response.json();
    console.log("Image message sent successfully:", message);

    // Chuẩn hóa dữ liệu để phù hợp với frontend
    // Chuyển đổi từ cấu trúc backend sang frontend
    let result = {
      ...message,
      messageId: message.messageDetailId || message.messageId,
    };

    // Đảm bảo rằng dữ liệu ảnh được trả về đúng định dạng
    if (message.attachment && !result.attachment) {
      result.attachment = message.attachment;
    }

    // Tương thích ngược: đảm bảo rằng cả attachments cũng được định nghĩa đúng
    if (message.attachment && !result.attachments) {
      result.attachments = Array.isArray(message.attachments)
        ? message.attachments
        : [message.attachment];
    }

    console.log("Normalized message:", result);
    return result;
  } catch (error: any) {
    console.error("Lỗi khi gửi ảnh:", error);

    if (error.response) {
      if (error.response.status === 401) {
        throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
      } else if (error.response.status === 403) {
        throw new Error("Bạn không có quyền gửi ảnh vào cuộc trò chuyện này.");
      } else if (error.response.status === 404) {
        throw new Error("Không tìm thấy cuộc trò chuyện.");
      } else if (error.response.status === 413) {
        throw new Error(
          "Ảnh quá lớn. Vui lòng chọn ảnh có kích thước nhỏ hơn."
        );
      } else if (error.response.data?.message) {
        throw new Error(error.response.data.message);
      }
    }

    // Handle error object appropriately
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error("Không thể gửi ảnh. Vui lòng thử lại sau.");
    }
  }
};

// Gửi tin nhắn kèm ảnh (khi dán ảnh vào khung chat)
export const sendMessageWithImage = async (
  conversationId: string,
  content: string,
  imageFile: File
): Promise<Message> => {
  try {
    if (!conversationId) {
      throw new Error("ID cuộc trò chuyện không hợp lệ");
    }

    if (!imageFile) {
      throw new Error("Không có tập tin ảnh được chọn");
    }

    // Kiểm tra xem tập tin có phải là hình ảnh không
    if (!imageFile.type.startsWith("image/")) {
      throw new Error("Tập tin không phải là hình ảnh hợp lệ");
    }

    const token = getAuthToken();
    if (!token) {
      throw new Error("Không có token xác thực");
    }

    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("conversationId", conversationId);
    formData.append("content", content);
    formData.append("type", "text-with-image");

    // Sử dụng fetch API để xử lý tốt hơn với FormData
    const response = await fetch(
      `${API_BASE_URL}/api/messages/send-with-image`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Gửi tin nhắn kèm ảnh thất bại");
    }

    const message = await response.json();
    console.log("Message with image sent successfully:", message);

    // Chuẩn hóa dữ liệu để phù hợp với frontend
    let result = {
      ...message,
      messageId: message.messageDetailId || message.messageId,
    };

    // Đảm bảo rằng dữ liệu ảnh được trả về đúng định dạng
    if (message.attachment && !result.attachment) {
      result.attachment = message.attachment;
    }

    // Tương thích ngược: đảm bảo rằng cả attachments cũng được định nghĩa đúng
    if (message.attachment && !result.attachments) {
      result.attachments = Array.isArray(message.attachments)
        ? message.attachments
        : [message.attachment];
    }

    console.log("Normalized message with image:", result);
    return result;
  } catch (error: any) {
    console.error("Lỗi khi gửi tin nhắn kèm ảnh:", error);

    if (error.response) {
      if (error.response.status === 401) {
        throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
      } else if (error.response.status === 403) {
        throw new Error("Bạn không có quyền gửi ảnh vào cuộc trò chuyện này.");
      } else if (error.response.status === 404) {
        throw new Error("Không tìm thấy cuộc trò chuyện.");
      } else if (error.response.status === 413) {
        throw new Error(
          "Ảnh quá lớn. Vui lòng chọn ảnh có kích thước nhỏ hơn."
        );
      } else if (error.response.data?.message) {
        throw new Error(error.response.data.message);
      }
    }

    // Handle error object appropriately
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error("Không thể gửi tin nhắn kèm ảnh. Vui lòng thử lại sau.");
    }
  }
};

// Gửi yêu cầu kết bạn
export const sendFriendRequest = async (
  receiverId: string,
  message?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Không có token xác thực");
    }

    if (!receiverId) {
      throw new Error("ID người nhận không hợp lệ");
    }

    console.log(`Sending friend request to receiverId: ${receiverId}`); // Debug

    const response = await apiClient.post(
      `/api/users/friend-requests/send-request/${receiverId}`,
      { message }
    );

    console.log("Send friend request response:", response.data); // Debug

    // Ghi đè thông báo thành công bằng tiếng Việt
    return {
      success: response.data.success ?? true,
      message: "Gửi yêu cầu kết bạn thành công", // Thông báo cố định bằng tiếng Việt
    };
  } catch (error: unknown) {
    console.error("Error sending friend request:", {
      error,
      status: (error as AxiosError)?.response?.status,
      errorMessage:
        ((error as AxiosError)?.response?.data as any)?.message ||
        "Unknown error",
    });

    // Xử lý các lỗi như hiện tại
    if (error instanceof AxiosError && error.response) {
      const { status, data } = error.response;
      console.error("Error details:", { status, data });

      if (status === 400) {
        switch (data.message) {
          case "Receiver ID is required":
            throw new Error("Vui lòng cung cấp ID người nhận.");
          case "You cannot send a friend request to yourself":
            throw new Error(
              "Bạn không thể gửi yêu cầu kết bạn cho chính mình."
            );
          case "A pending friend request already exists between you and this user":
            throw new Error(
              "Đã có yêu cầu kết bạn đang chờ xử lý với người này."
            );
          case "Friend request already sent":
            throw new Error("Yêu cầu kết bạn đã được gửi trước đó.");
          case "You are already friends with this user":
            throw new Error("Bạn đã là bạn bè với người này.");
          case "You cannot send a friend request to this user":
            throw new Error(
              "Không thể gửi yêu cầu kết bạn vì người này đã chặn bạn hoặc bạn đã chặn họ."
            );
          default:
            throw new Error(
              data.message || "Yêu cầu kết bạn không hợp lệ, vui lòng thử lại."
            );
        }
      } else if (status === 404) {
        switch (data.message) {
          case "Sender not found":
            throw new Error(
              "Không tìm thấy thông tin tài khoản của bạn. Vui lòng đăng nhập lại."
            );
          case "Receiver not found":
            throw new Error(
              "Không tìm thấy người dùng này. Vui lòng kiểm tra lại."
            );
          default:
            throw new Error(
              data.message || "Không tìm thấy người dùng, vui lòng thử lại."
            );
        }
      } else if (status === 401) {
        throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
      } else if (status === 429) {
        throw new Error("Quá nhiều yêu cầu. Vui lòng thử lại sau vài phút.");
      } else if (status === 500) {
        throw new Error(data.message || "Lỗi hệ thống, vui lòng thử lại sau.");
      }
    }

    throw new Error(
      "Không thể gửi yêu cầu kết bạn do lỗi không xác định. Vui lòng thử lại."
    );
  }
};
// Lấy danh sách yêu cầu kết bạn đã nhận
export const getFriendRequestsReceived = async () => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Không có token xác thực");
    }

    const response = await apiClient.get("/api/users/friend-requests-received");
    console.log("Friend requests received response:", response.data);

    // Transform the data to match our frontend interface
    const transformedData = response.data.map((request: any) => ({
      friendRequestId: request.friendRequestId,
      senderId: {
        userId: request.senderId.userId,
        fullname: request.senderId.fullname,
        urlavatar: request.senderId.urlavatar,
        isMale: request.senderId.isMale,
        phone: request.senderId.phone,
        birthday: request.senderId.birthday,
        _id: request.senderId._id,
      },
      receiverId: {
        userId: request.receiverId,
        fullname: "",
        urlavatar: undefined,
      },
      status: request.status,
      message: request.message || "",
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      _id: request._id,
      __v: request.__v,
      deletionDate: request.deletionDate,
    }));

    return transformedData;
  } catch (error: unknown) {
    console.error("Lỗi khi lấy danh sách yêu cầu kết bạn đã nhận:", error);
    if (error instanceof AxiosError && error.response) {
      console.error("Server error details:", error.response.data);
    }
    return [];
  }
};

// Lấy danh sách yêu cầu kết bạn đã gửi
export const getFriendRequestsSent = async () => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Không có token xác thực");
    }

    const response = await apiClient.get("/api/users/friend-requests-sent");
    console.log("Friend requests sent response:", response.data);

    // Transform the data to match our frontend interface
    const transformedData = response.data.map((request: any) => ({
      friendRequestId: request.friendRequestId,
      senderId: {
        userId: request.senderId,
        fullname: "", // Will be populated from current user info
        urlavatar: undefined,
      },
      receiverId: {
        userId: request.receiverId.userId,
        fullname: request.receiverId.fullname,
        urlavatar: request.receiverId.urlavatar,
        _id: request.receiverId._id,
        isMale: request.receiverId.isMale,
        phone: request.receiverId.phone,
        birthday: request.receiverId.birthday,
      },
      status: request.status,
      message: request.message || "",
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      _id: request._id,
      __v: request.__v,
      deletionDate: request.deletionDate,
    }));

    return transformedData;
  } catch (error: unknown) {
    console.error("Lỗi khi lấy danh sách yêu cầu kết bạn đã gửi:", error);
    if (error instanceof AxiosError && error.response) {
      console.error("Server error details:", error.response.data);
    }
    return [];
  }
};

// Chấp nhận yêu cầu kết bạn
export const acceptFriendRequest = async (requestId: string) => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Không có token xác thực");
    }

    const response = await apiClient.put(
      `/api/users/friend-requests/accept-request/${requestId}`
    );
    console.log("Accept friend request response:", response.data);
    return response.data;
  } catch (error: unknown) {
    console.error("Lỗi khi chấp nhận yêu cầu kết bạn:", error);
    if (error instanceof AxiosError && error.response) {
      if (error.response.status === 401) {
        throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
      }
      if (error.response.status === 404) {
        throw new Error("Không tìm thấy yêu cầu kết bạn");
      }
    }
    throw new Error("Không thể chấp nhận yêu cầu kết bạn");
  }
};

// Từ chối yêu cầu kết bạn
export const rejectFriendRequest = async (requestId: string) => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Không có token xác thực");
    }

    const response = await apiClient.put(
      `/api/users/friend-requests/reject-request/${requestId}`
    );
    console.log("Reject friend request response:", response.data);
    return response.data;
  } catch (error: unknown) {
    console.error("Lỗi khi từ chối yêu cầu kết bạn:", error);
    if (error instanceof AxiosError && error.response) {
      if (error.response.status === 401) {
        throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
      }
      if (error.response.status === 404) {
        throw new Error("Không tìm thấy yêu cầu kết bạn");
      }
    }
    throw new Error("Không thể từ chối yêu cầu kết bạn");
  }
};

// Thu hồi yêu cầu kết bạn
export const cancelFriendRequest = async (requestId: string) => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Không có token xác thực");
    }

    const response = await apiClient.delete(
      `/api/users/friend-requests/retrieve-request/${requestId}` // Updated endpoint path
    );
    console.log("Cancel friend request response:", response.data);
    return response.data;
  } catch (error: unknown) {
    console.error("Lỗi khi thu hồi yêu cầu kết bạn:", error);
    if (error instanceof AxiosError && error.response) {
      if (error.response.status === 401) {
        throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
      }
      if (error.response.status === 404) {
        throw new Error("Không tìm thấy yêu cầu kết bạn");
      }
      if (error.response.status === 403) {
        throw new Error("Bạn không có quyền thu hồi yêu cầu kết bạn này");
      }
      if (error.response.status === 400) {
        throw new Error("Yêu cầu kết bạn này đã được xử lý");
      }
    }
    throw new Error("Không thể thu hồi yêu cầu kết bạn");
  }
};
// Hàm lấy danh sách bạn bè
export const fetchFriends = async () => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Không có token xác thực");
    }

    const response = await apiClient.get("/api/users/friends");
    console.log("Friends response:", response.data);

    if (!Array.isArray(response.data)) {
      console.error("Invalid friends data format:", response.data);
      return [];
    }

    console.log("Fetched friends:", response.data);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách bạn bè:", {
      error,
      status: (error as AxiosError).response?.status,
      message: (error as AxiosError).response?.data?.message,
    });
    const apiError = error as AxiosError<{ message?: string }>;
    if (apiError.response?.status === 401) {
      throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
    }
    if (apiError.response?.status === 404) {
      return [];
    }
    throw new Error(
      apiError.response?.data?.message || "Không thể lấy danh sách bạn bè"
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
    // Kiểm tra định dạng mật khẩu
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
    if (!passwordRegex.test(password)) {
      throw new Error("Mật khẩu phải có ít nhất 6 ký tự và chứa cả chữ và số");
    }

    const response = await apiClient.post("/api/auth/register", {
      phone,
      password,
      fullname,
      isMale,
      birthday,
    });

    const { token, user } = response.data;
    if (!token?.accessToken || !token?.refreshToken || !user?.userId) {
      throw new Error("Dữ liệu đăng ký không hợp lệ");
    }

    // Lưu thông tin người dùng và token vào localStorage
    localStorage.setItem("userId", user.userId);
    localStorage.setItem("token", token.accessToken);
    localStorage.setItem("refreshToken", token.refreshToken);

    return {
      userId: user.userId,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      fullname: user.fullname,
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

// Đăng ký tài khoản mới với avatar
export const registerWithAvatar = async (
  phone: string,
  password: string,
  fullname: string,
  isMale: boolean,
  birthday: string,
  avatarFile: File | null
) => {
  try {
    // Kiểm tra định dạng mật khẩu
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
    if (!passwordRegex.test(password)) {
      throw new Error("Mật khẩu phải có ít nhất 6 ký tự và chứa cả chữ và số");
    }

    // Đăng ký tài khoản cơ bản
    const response = await apiClient.post("/api/auth/register", {
      phone,
      password,
      fullname,
      isMale,
      birthday,
    });

    const { token, user } = response.data;
    if (!token?.accessToken || !token?.refreshToken || !user?.userId) {
      throw new Error("Dữ liệu đăng ký không hợp lệ");
    }

    // Lưu thông tin người dùng và token vào localStorage
    localStorage.setItem("userId", user.userId);
    localStorage.setItem("token", token.accessToken);
    localStorage.setItem("refreshToken", token.refreshToken);

    // Nếu có file avatar, tiến hành upload
    let avatarUrl = null;
    if (avatarFile) {
      try {
        avatarUrl = await uploadAvatar(avatarFile);
      } catch (avatarError) {
        console.error("Lỗi khi tải ảnh đại diện:", avatarError);
        // Vẫn tiếp tục mà không dừng quá trình đăng ký
      }
    }

    return {
      userId: user.userId,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      fullname: user.fullname,
      avatarUrl,
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

// Recall message (makes it invisible to everyone)
export const recallMessage = async (messageId: string): Promise<void> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
    const response = await axios.put(
      `${API_URL}/api/messages/recall/${messageId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status !== 200) {
      throw new Error(response.data.message || "Error recalling message");
    }

    return response.data;
  } catch (error) {
    logApiError("recallMessage", error);
    throw error;
  }
};

// Delete message (makes it invisible only to the person who deleted it)
export const deleteMessage = async (messageId: string): Promise<void> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
    const response = await axios.put(
      `${API_URL}/api/messages/delete/${messageId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status !== 200) {
      throw new Error(response.data.message || "Error deleting message");
    }

    return response.data;
  } catch (error) {
    logApiError("deleteMessage", error);
    throw error;
  }
};

// Pin message
export const pinMessage = async (messageId: string): Promise<void> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await apiClient.put(`/api/messages/pin/${messageId}`);

    if (response.status !== 200) {
      throw new Error(`Failed to pin message. Status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error while pinning message:", error);
    throw error;
  }
};

// Unpin message
export const unpinMessage = async (messageId: string): Promise<void> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await apiClient.put(`/api/messages/unpin/${messageId}`);

    if (response.status !== 200) {
      throw new Error(`Failed to unpin message. Status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error while unpinning message:", error);
    throw error;
  }
};

// Get pinned messages for a conversation
export const getPinnedMessages = async (
  conversationId: string
): Promise<Message[]> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await apiClient.get(
      `/api/conversations/${conversationId}`
    );
    console.log("Pinned messages response:", response.data.pinnedMessages);

    if (response.status !== 200) {
      throw new Error(
        `Failed to get pinned messages. Status: ${response.status}`
      );
    }

    return response.data.pinnedMessages;
  } catch (error: any) {
    console.error("Error while getting pinned messages:", error);
    throw error;
  }
};

// Get a specific message by ID
export const getSpecificMessage = async (
  messageId: string,
  conversationId?: string
): Promise<Message | null> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const endpoint = conversationId
      ? `/api/messages/${messageId}?conversationId=${conversationId}`
      : `/api/messages/${messageId}`;

    const response = await apiClient.get(endpoint);

    if (response.status !== 200) {
      throw new Error(`Failed to get message. Status: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching specific message:", error);
    // Return null instead of throwing to handle gracefully in UI
    return null;
  }
};

// Reply to a message
export const replyMessage = async (
  messageId: string,
  content: string
): Promise<Message> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await apiClient.post(`/api/messages/reply/${messageId}`, {
      content,
    });

    if (response.status !== 201) {
      throw new Error(`Failed to reply to message. Status: ${response.status}`);
    }

    // Normalize the response data to match the frontend message format
    const message = response.data;
    let result = {
      ...message,
      messageId: message.messageDetailId || message.messageId,
    };

    return result;
  } catch (error) {
    console.error("Error while replying to message:", error);
    throw error;
  }
};

// Forward an image message to another conversation
export const forwardImageMessage = async (
  messageId: string,
  conversationId: string,
  attachment: any
): Promise<Message> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await apiClient.post(
      `/api/messages/forward/${messageId}`,
      {
        conversationId,
        attachment,
      }
    );

    if (response.status !== 201) {
      throw new Error(
        `Failed to forward image message. Status: ${response.status}`
      );
    }

    // Normalize the response data to match the frontend message format
    const message = response.data;
    let result = {
      ...message,
      messageId: message.messageDetailId || message.messageId,
    };

    // Ensure attachment is properly formatted
    if (message.attachment && !result.attachment) {
      result.attachment = message.attachment;
    }

    return result;
  } catch (error) {
    console.error("Error while forwarding image message:", error);
    throw error;
  }
};

// Add this function after fetchFriends

// Tìm kiếm người dùng theo tên hoặc số điện thoại
export const searchUsers = async (searchParam: string) => {
  try {
    if (!searchParam || searchParam.trim() === "") {
      return [];
    }

    const token = getAuthToken();
    if (!token) {
      throw new Error("Không có token xác thực");
    }

    const response = await apiClient.get(
      `/api/users/search/${encodeURIComponent(searchParam)}`
    );

    console.log("Search users response:", response.data);

    if (!Array.isArray(response.data)) {
      console.error("Invalid search result format:", response.data);
      return [];
    }

    return response.data;
  } catch (error) {
    console.error("Lỗi khi tìm kiếm người dùng:", error);
    const apiError = error as AxiosError<{ message?: string }>;
    if (apiError.response?.status === 401) {
      throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
    }
    return [];
  }
};
// Tạo nhóm mới

export const createGroupConversation = async (
  groupName: string,
  groupMembers: string[]
): Promise<Conversation> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Vui lòng đăng nhập để tạo nhóm chat");
    }

    const response = await apiClient.post("/api/conversations/group/create", {
      groupName,
      groupMembers,
    });

    console.log("Tạo nhóm thành công:", response.data);
    return response.data;
  } catch (error: unknown) {
    console.error("Lỗi khi tạo nhóm chat:", error);
    const apiError = error as AxiosError<{ message?: string }>;
    if (apiError.response?.status === 401) {
      throw new Error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại");
    }
    throw new Error("Không thể tạo nhóm chat. Vui lòng thử lại.");
  }
};
// Cập nhật ảnh đại diện nhóm
export const updateGroupAvatar = async (
  conversationId: string,
  imageFile: File
): Promise<any> => {
  try {
    console.log("UpdateGroupAvatar - Start", { conversationId });

    const token = getAuthToken();
    if (!token) {
      throw new Error("Vui lòng đăng nhập để thực hiện chức năng này");
    }

    const formData = new FormData();
    formData.append("groupAvatar", imageFile); // Tên trường phải khớp với 'uploadImage.single('groupAvatar')' trên backend

    console.log(
      "UpdateGroupAvatar - FormData prepared with file:",
      imageFile.name,
      imageFile.type,
      imageFile.size
    );

    // Sử dụng đúng đường dẫn API đã đề cập trong backend
    const response = await apiClient.put(
      `/api/conversations/group/update/avatar/${conversationId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("UpdateGroupAvatar - Response:", response.data);

    // Trả về response data từ server
    return response.data;
  } catch (error) {
    console.error("Error updating group avatar:", error);
    throw error;
  }
};

/**
 * Sets co-owners for a group conversation
 * @param conversationId The ID of the conversation
 * @param coOwnerIds Array of user IDs to set as co-owners
 */
export const setCoOwner = async (
  conversationId: string,
  coOwnerIds: string[]
) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("User not authenticated");
    }
    const response = await apiClient.put(
      `/api/conversations/group/set-co-owner`,
      {
        conversationId,
        coOwnerIds,
      }
    );

    if (response.status !== 200) {
      throw new Error("Failed to set co-owners");
    }

    return response.data;
  } catch (error: any) {
    console.error("Error setting co-owners:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
};

/**
 * Sets a new owner for a group conversation
 * @param conversationId The ID of the conversation
 * @param userId The ID of the user to set as the new owner
 */
export const setOwner = async (conversationId: string, userId: string) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("User not authenticated");
    }

    const response = await apiClient.put(
      `/api/conversations/group/set-owner/${userId}`,
      {
        conversationId,
        userId,
      }
    );

    if (response.status !== 200) {
      throw new Error("Failed to set new owner");
    }

    return response.data;
  } catch (error: any) {
    console.error("Error setting new owner:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
};

/**
 * Removes a co-owner from a group conversation
 * @param conversationId The ID of the conversation
 * @param userId The ID of the co-owner to remove
 */
export const removeCoOwnerById = async (
  conversationId: string,
  userId: string
) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("User not authenticated");
    }

    const response = await apiClient.put(
      `/api/conversations/group/${conversationId}/remove-co-owner/${userId}`
    );

    if (response.status !== 200) {
      throw new Error("Failed to remove co-owner");
    }

    return response.data;
  } catch (error: any) {
    console.error("Error removing co-owner:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
};

/**
 * Deletes a group conversation (owner only)
 * @param conversationId The ID of the conversation to delete
 */
export const deleteGroup = async (conversationId: string) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("User not authenticated");
    }

    const response = await apiClient.put(
      `/api/conversations/group/delete/${conversationId}`
    );

    if (response.status !== 200) {
      throw new Error("Failed to delete group");
    }

    return response.data;
  } catch (error: any) {
    console.error("Error deleting group:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
};

/**
 * Leave a group conversation
 * @param conversationId ID of the group to leave
 * @returns Response with confirmation message
 */
export const leaveGroup = async (conversationId: string) => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Vui lòng đăng nhập để thực hiện chức năng này");
    }

    const response = await apiClient.put(
      `/api/conversations/group/${conversationId}/leave`
    );

    console.log("Rời nhóm thành công:", response.data);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi rời nhóm:", error);

    // Dịch các thông báo lỗi từ tiếng Anh sang tiếng Việt
    if (error instanceof AxiosError && error.response?.status === 400) {
      const errorMessage = error.response.data.message;

      // Kiểm tra các loại lỗi cụ thể
      if (errorMessage.includes("You cant leave because you are the owner")) {
        throw new Error("Bạn không thể rời nhóm vì bạn là chủ nhóm");
      } else if (errorMessage.includes("This is not a group conversation")) {
        throw new Error("Đây không phải là nhóm trò chuyện");
      } else if (errorMessage.includes("Group rules not defined")) {
        throw new Error("Quy tắc nhóm chưa được thiết lập");
      } else {
        throw new Error(
          errorMessage || "Không thể rời nhóm. Vui lòng thử lại sau."
        );
      }
    }

    if (error instanceof AxiosError && error.response?.status === 403) {
      throw new Error("Bạn không phải là thành viên của nhóm này");
    }

    if (error instanceof AxiosError && error.response?.status === 404) {
      throw new Error("Không tìm thấy nhóm hoặc người dùng");
    }

    throw new Error("Không thể rời nhóm. Vui lòng thử lại sau.");
  }
};

/**
 * Removes a user from a group conversation
 * @param conversationId The ID of the conversation
 * @param userId The ID of the user to remove
 */
export const removeUserFromGroup = async (
  conversationId: string,
  userId: string
) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("User not authenticated");
    }

    const response = await apiClient.put(
      `/api/conversations/group/${conversationId}/remove/${userId}`
    );

    if (response.status !== 200) {
      throw new Error("Failed to remove user from group");
    }

    return response.data;
  } catch (error: any) {
    console.error("Error removing user from group:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
};

/**
 * Block a user from a group conversation
 * @param conversationId - ID of the group conversation
 * @param userId - ID of the user to block
 */
export const blockUserFromGroup = async (
  conversationId: string,
  userId: string
) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("User not authenticated");
    }

    const response = await apiClient.put(
      `/api/conversations/group/${conversationId}/block/${userId}`,
      { userId }
    );

    if (response.status !== 200) {
      throw new Error("Failed to block user from group");
    }

    return response.data;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error blocking user from group:", error.message);
    } else {
      console.error("Unknown error blocking user from group");
    }
    throw error;
  }
};

/**
 * Unblock a user from a group conversation
 * @param conversationId conversation id
 * @param userId user id to unblock
 * @returns the updated conversation details
 */
export const unblockUserFromGroup = async (
  conversationId: string,
  userId: string
) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("User not authenticated");
    }

    const response = await apiClient.put(
      `/api/conversations/group/${conversationId}/unblock/${userId}`,
      { userId }
    );

    if (response.status !== 200) {
      throw new Error("Failed to unblock user from group");
    }

    return response.data;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error unblocking user from group:", error.message);
    } else {
      console.error("Unknown error unblocking user from group");
    }
    throw error;
  }
};

/**
 Lấy danh sách nhóm của mình
 */
export const fetchUserGroups = async (): Promise<Conversation[]> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Vui lòng đăng nhập để xem danh sách nhóm");
    }

    const response = await apiClient.get("/api/conversations/groups");

    console.log("Lấy danh sách nhóm thành công:", response.data);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách nhóm:", error);
    if (error instanceof AxiosError && error.response?.status === 401) {
      throw new Error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại");
    }
    throw new Error("Không thể lấy danh sách nhóm. Vui lòng thử lại.");
  }
};

export const updateGroupName = async (
  conversationId: string,
  newName: string
): Promise<{ message: string; conversation: any }> => {
  try {
    const response = await apiClient.put(
      `/api/conversations/group/update/name/${conversationId}`,
      { newName }
    );
    return response.data;
  } catch (error: any) {
    console.error("Error updating group name:", error);
    if (error.response?.status === 400) {
      throw new Error(error.response.data.message || "Tên nhóm không hợp lệ");
    }
    if (error.response?.status === 403) {
      throw new Error("Bạn không có quyền cập nhật tên nhóm");
    }
    if (error.response?.status === 404) {
      throw new Error("Không tìm thấy nhóm chat");
    }
    throw new Error("Không thể cập nhật tên nhóm, vui lòng thử lại sau");
  }
};
