import { createContext } from "react";
import { AuthContextType } from "../types/authTypes";

// Tạo context với giá trị mặc định
export const AuthContext = createContext<AuthContextType>({
  user: null, // Giá trị mặc định là null
  login: async () => {
    console.warn("login function is not implemented");
  },
  logout: () => {
    console.warn("logout function is not implemented");
  },
  changePassword: async (oldPassword: string, newPassword: string) => {
    console.warn(
      `changePassword function is not implemented. Received oldPassword: ${oldPassword}, newPassword: ${newPassword}`
    );
  },
});