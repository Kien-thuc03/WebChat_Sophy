import { useState } from "react";
import {
  FaComments,
  FaUserFriends,
  FaTasks,
  FaCloud,
  FaBriefcase,
  FaCog,
} from "react-icons/fa";
import { useAuth } from "../../features/auth/hooks/useAuth"; // Import hook auth

const Sidebar = () => {
  const { user } = useAuth(); // Lấy thông tin user từ context
  const [active, setActive] = useState("chat"); // Lưu trạng thái mục được chọn

  return (
    <div className="h-screen w-16 bg-blue-600 flex flex-col justify-between items-center py-4">
      <div className="flex flex-col items-center">
        {/* Avatar */}
        <img
          src={user?.profile?.avatar || "/images/avatar.jpg"} // Nếu không có avatar, dùng ảnh mặc định
          alt="Avatar"
          className="w-12 h-12 rounded-full border-2 border-white object-cover"
        />

        {/* Icons List */}
        <div className="flex flex-col space-y-6 p-2">
          <div
            className={`p-2 rounded-lg cursor-pointer ${
              active === "chat" ? "bg-white text-blue-600" : "text-white"
            }`}
            onClick={() => setActive("chat")}
          >
            <FaComments className="text-2xl" />
          </div>
          <div
            className={`p-2 rounded-lg cursor-pointer ${
              active === "friends" ? "bg-white text-blue-600" : "text-white"
            }`}
            onClick={() => setActive("friends")}
          >
            <FaUserFriends className="text-2xl" />
          </div>
          <div
            className={`p-2 rounded-lg cursor-pointer ${
              active === "tasks" ? "bg-white text-blue-600" : "text-white"
            }`}
            onClick={() => setActive("tasks")}
          >
            <FaTasks className="text-2xl" />
          </div>
        </div>
      </div>
      <div>
        {/* Bottom Icons */}
        <div className="flex flex-col space-y-6 items-center">
          {/* Divider */}
          <div className="w-8 border-b border-white my-4"></div>
          <div
            className={`p-2 rounded-lg cursor-pointer ${
              active === "cloud" ? "bg-white text-blue-600" : "text-white"
            }`}
            onClick={() => setActive("cloud")}
          >
            <FaCloud className="text-2xl" />
          </div>
          <div
            className={`p-2 rounded-lg cursor-pointer ${
              active === "briefcase" ? "bg-white text-blue-600" : "text-white"
            }`}
            onClick={() => setActive("briefcase")}
          >
            <FaBriefcase className="text-2xl" />
          </div>
          <div
            className={`p-2 rounded-lg cursor-pointer ${
              active === "settings" ? "bg-white text-blue-600" : "text-white"
            }`}
            onClick={() => setActive("settings")}
          >
            <FaCog className="text-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
