// Định nghĩa kiểu dữ liệu cho ObjectId
export type ObjectId = string; // Chỉ lưu chuỗi ID, không cần { $oid }

// Định nghĩa kiểu dữ liệu cho Date
export type ISODate = string; // Chỉ lưu chuỗi ISO, không cần { $date }

// Định nghĩa kiểu dữ liệu cho thông tin profile của người dùng
export interface UserProfile {
  avatar: string;
  gender: "male" | "female" | "other";
  date_of_birth: ISODate;
}

// Định nghĩa kiểu dữ liệu cho cài đặt người dùng
export interface UserSettings {
  hidden_profile_from_strangers: boolean;
  block_msg_from_strangers: boolean;
}

// Định nghĩa kiểu dữ liệu cho người dùng
export interface User {
  _id: ObjectId;
  userId: string;
  full_name: string;
  fullname: string;
  isMale: boolean;
  phone: string;
  hash_password: string;
  birthday: string;
  profile: UserProfile;
  settings: UserSettings;
  friendList: string[];
  blockList: string[];
  createdAt: string;
  lastActive: string;
  deviceTokens: string[];
  created_at: ISODate;
  updated_at: ISODate;
}

// Định nghĩa kiểu dữ liệu cho payload đăng ký
export interface RegisterPayload {
  full_name: string;
  phone: string;
  password: string;
  profile: {
    gender: "male" | "female" | "other";
    date_of_birth: ISODate;
  };
}

// Định nghĩa kiểu dữ liệu cho payload đăng nhập
export interface LoginPayload {
  phone: string;
  password: string;
}

// Định nghĩa kiểu dữ liệu cho phản hồi đăng nhập
export interface LoginResponse {
  user: User; // Thông tin người dùng
  access_token: string; // Token để xác thực
  refresh_token: string; // Token để làm mới access token
}

// Định nghĩa kiểu dữ liệu cho lỗi xác thực
export interface AuthError {
  message: string;
  code?: number; // Mã lỗi (tùy chọn)
}

// Định nghĩa kiểu dữ liệu cho trạng thái xác thực
export interface AuthState {
  user: User | null; // Người dùng hiện tại
  access_token: string | null; // Access token hiện tại
  refresh_token: string | null; // Refresh token hiện tại
  loading: boolean; // Trạng thái loading
  error: AuthError | null; // Lỗi (nếu có)
}

// Định nghĩa kiểu dữ liệu cho hàm đăng ký
export interface RegisterFunction {
  (payload: RegisterPayload): Promise<LoginResponse>;
}

// Định nghĩa kiểu dữ liệu cho hàm đăng nhập
export interface LoginFunction {
  (payload: LoginPayload): Promise<LoginResponse>;
}

// Định nghĩa kiểu dữ liệu cho hàm đăng xuất
export interface LogoutFunction {
  (): void;
}

// Định nghĩa kiểu dữ liệu cho hàm làm mới token
export interface RefreshTokenFunction {
  (refresh_token: string): Promise<{ access_token: string }>;
}

// Định nghĩa kiểu dữ liệu cho context xác thực
export interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>; // Thêm setUser
  login: (form: { phone: string; password: string }) => Promise<void>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}
