import axios from "axios";
// import bcrypt from "bcryptjs";

// Khai báo URL API chính
const API_BASE_URL = "http://localhost:5000";

// Tạo instance Axios
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Hàm đăng nhập
export const login = async (phone: string, password: string) => {
  const response = await apiClient.post("/login", { phone, password });
  console.log("Login response:", response.data);
  return response.data;
};

// Hàm lấy thông tin người dùng
export const fetchUserData = async (userId: string) => {
  const response = await apiClient.get("/users");
  const users = response.data;
  const user = users.find((u: any) => u._id === userId);

  if (!user) {
    throw new Error("Không tìm thấy người dùng!");
  }

  console.log("Fetch user data response:", user);
  return user;
};

// Hàm kiểm tra thông tin đăng nhập từ db.json
export const checkLogin = async (phone: string, password: string) => {
  const response = await apiClient.get("/users");
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
