import { FaSearch, FaUserPlus, FaUsers } from "react-icons/fa";

const Header = () => {
  return (
    <div
      id="contact-search"
      className="flex items-center justify-between overflow-hidden w-full px-2 py-1 bg-white rounded-lg space-x-2"
    >
      {/* Ô tìm kiếm */}
      <div className="relative flex items-center border border-gray-300 rounded-lg px-2 py-1 w-2/3">
        <FaSearch className="absolute left-2 text-gray-500" />
        <input
          id="contact-search-input"
          type="text"
          maxLength={100}
          autoComplete="off"
          placeholder="Tìm kiếm"
          className="pl-8 w-full focus:outline-none"
        />
      </div>

      {/* Nút Thêm Bạn */}
      <button
        type="button"
        title="Thêm bạn"
        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-300"
      >
        <FaUserPlus className="text-gray-600" />
      </button>

      {/* Nút Tạo Nhóm */}
      <button
        type="button"
        title="Tạo nhóm chat"
        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-300"
      >
        <FaUsers className="text-gray-600" />
      </button>
    </div>
  );
};

export default Header;