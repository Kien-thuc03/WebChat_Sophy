import { FaSearch, FaUserPlus, FaUsers } from "react-icons/fa";
import { useLanguage } from "../../features/auth/context/LanguageContext";
import { useState } from "react";
import AddFriendModal from "./modal/AddFriendModal"; // Import the modal component

const Header = () => {
  const { t } = useLanguage();
  const [isAddFriendModalVisible, setIsAddFriendModalVisible] = useState(false); // State for modal visibility

  const handleAddFriendClick = () => {
    setIsAddFriendModalVisible(true); // Show modal on button click
  };

  const handleCloseModal = () => {
    setIsAddFriendModalVisible(false); // Close modal
  };

  return (
    <div
      id="contact-search"
      className="flex items-center justify-between overflow-hidden w-full px-2 pt-5 py-1 bg-white dark:bg-gray-800 rounded-lg space-x-2">
      {/* Ô tìm kiếm */}
      <div className="relative flex items-center border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 w-2/3">
        <FaSearch className="absolute left-2 text-gray-500 dark:text-gray-300" />
        <input
          id="contact-search-input"
          type="text"
          maxLength={100}
          autoComplete="off"
          placeholder={t.search || "Tìm kiếm"}
          className="pl-8 w-full focus:outline-none bg-transparent text-gray-900 dark:text-gray-100"
        />
      </div>

      <button
        type="button"
        title={t?.add_friend || "Thêm bạn"}
        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"
        onClick={handleAddFriendClick} // Add click handler
      >
        <FaUserPlus className="text-gray-600 dark:text-gray-300" />
      </button>

      <button
        type="button"
        title={t?.create_group || "Tạo nhóm chat"}
        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600">
        <FaUsers className="text-gray-600 dark:text-gray-300" />
      </button>

      {/* Render the modal conditionally */}
      {isAddFriendModalVisible && (
        <AddFriendModal visible={isAddFriendModalVisible} onClose={handleCloseModal} />
      )}
    </div>
  );
};

export default Header;