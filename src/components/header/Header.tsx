import { FaSearch, FaUserPlus, FaUsers } from "react-icons/fa";

const Header = () => {
  return (
    <div
      id="contact-search"
      className="grid grid-cols-[auto_32px_32px] items-center overflow-hidden w-full px-2 py-1 bg-white shadow-md rounded-lg"
    >
      {/* Ô tìm kiếm */}
      <div className="relative flex items-center border border-gray-300 rounded-lg px-2 py-1 w-full">
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
        title="Thêm bạn"
        className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full hover:bg-gray-300"
      >
        <FaUserPlus className="text-gray-600" />
      </button>

      {/* Nút Tạo Nhóm */}
      <button
        title="Tạo nhóm chat"
        className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full hover:bg-gray-300"
      >
        <FaUsers className="text-gray-600" />
      </button>
    </div>
  );
};

export default Header;
