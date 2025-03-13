import { Navigate } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { ReactNode } from "react";

// const PrivateRoute = ({ children }: { children: JSX.Element }) => {
//   const { user } = useAuth(); // Sử dụng hook useAuth để kiểm tra người dùng
//   console.log("User in PrivateRoute:", user);
//   return user ? children : <Navigate to="/" />; // Chuyển hướng nếu không có người dùng
// };
const PrivateRoute = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const token = localStorage.getItem("token");

  if (user === null && token) {
    return <div>Đang tải...</div>;
  }

  if (!token) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
