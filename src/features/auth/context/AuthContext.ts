import { createContext } from "react";
import { AuthContextType } from "../types/authTypes";

// Tạo context với giá trị mặc định
export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: () => {},
});