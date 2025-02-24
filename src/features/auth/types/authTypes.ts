// Định nghĩa kiểu dữ liệu cho form đăng nhập
export interface LoginForm {
    phone: string;
    password: string;
  }
  
  // Định nghĩa kiểu dữ liệu cho người dùng
  export interface User {
    // Thêm các trường khác tùy vào hệ thống của bạn
    id: string;
    name: string;
    phone: string;
  }
  
  // Định nghĩa kiểu cho Auth Context
  export interface AuthContextType {
    user: User | null;
    login: (form: { phone: string; password: string }) => Promise<void>;
    logout: () => void;
  }