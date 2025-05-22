import { createContext } from "react";
import { AuthContextType } from "../types/authTypes";

export const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {
    console.warn("setUser function is not implemented");
  },
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