import axios from "axios";
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


export const login = async (phone: string, password: string) => {
  try {
    // Log request data
    console.log("Login request data:", {
      phone,
      password
    });

    const response = await apiClient.post("/api/auth/login", {
      phone: phone.replace(/\+84/g, '0'), // Convert +84 to 0
      password
    });
    
    console.log("Login response:", response.data);
    
    const { token, user } = response.data;
    
    if (!user?.id || !token) {
      throw new Error("Dữ liệu đăng nhập không hợp lệ");
    }
    
    return {
      userId: user.id, // Changed from _id to id to match backend response
      token: token,
      fullname: user.fullname // Add fullname from response
    };
  } catch (error: any) {
    // Handle specific error cases from backend
    if (error.response?.status === 404) {
      throw new Error("Tài khoản không tồn tại");
    }
    if (error.response?.status === 401) {
      throw new Error("Sai mật khẩu");
    }
    if (error.response?.status === 400) {
      throw new Error(error.response.data.message || "Thông tin đăng nhập không hợp lệ");
    }
    
    console.error("Login error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Đăng nhập thất bại, vui lòng thử lại");
  }
};

// Sửa lại endpoint và xử lý lỗi cho fetchUserData
export const fetchUserData = async (userId: string) => {
  try {
    const response = await apiClient.get(`/api/users/${userId}`); // Sửa endpoint để lấy user theo ID
    console.log("Fetch user data response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw new Error("Không tìm thấy người dùng!");
  }
};


// Hàm kiểm tra thông tin đăng nhập từ db.json
export const checkLogin = async (phone: string, password: string) => {
  const response = await apiClient.get("/api/users");
  // const users = response.data.users;
  const users = response.data;
  console.log("Users:", users);

  const user = users.find((user: any) => user.phone_number === phone);

  console.log("User found:", user);
  console.log("Password match:", password === user.hash_password);
  // console.log("Password match:", bcrypt.compareSync(password, user.hash_password));
  // if (user && bcrypt.compareSync(password, user.hash_password)) {
  if (user && password === user.hash_password) {
    return { userId: user._id, token: "fake-token" };
  }

  throw new Error("Sai số điện thoại hoặc mật khẩu"); // Trả về lỗi nếu không tìm thấy user hợp lệ
};

const getAuthToken = () => localStorage.getItem('token');

// Update apiClient to include auth token in headers when available
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
      throw new Error("Phiên đăng nhập hết hạn");
    }
    if (error.response?.status === 404) {
      throw new Error("Không tìm thấy người dùng");
    }
    console.error("Error fetching user by phone:", error);
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
    const validConversations = response.data
      .filter((conv: any) => conv && conv._id)
      .map((conv: any) => ({
        _id: conv._id,
        type: conv.type || 'private',
        creatorId: conv.creatorId,
        receiverId: conv.receiverId,
        groupName: conv.groupName,
        groupMembers: conv.groupMembers,
        lastMessage: conv.lastMessage ? {
          _id: conv.lastMessage._id,
          conversationId: conv.lastMessage.conversationId,
          senderId: conv.lastMessage.senderId,
          content: conv.lastMessage.content,
          type: conv.lastMessage.type,
          createdAt: conv.lastMessage.createdAt,
          updatedAt: conv.lastMessage.updatedAt
        } : undefined,
        lastChange: conv.lastChange,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      }));

    console.log("Processed conversations:", validConversations);
    return validConversations;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách hội thoại:", error);
    return []; // Return empty array instead of throwing
  }
};