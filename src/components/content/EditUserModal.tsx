import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faXmark,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import { updateUserInfo, updateUserName } from "../../api/API";

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  initialData: {
    displayName: string;
    isMale: boolean;
    birthday: string;
  };
  onSave: (data: {
    displayName: string;
    isMale: boolean;
    birthday: string;
  }) => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  onBack,
  initialData,
  onSave,
}) => {
  const [displayName, setDisplayName] = useState(initialData.displayName);
  const [isMale, setIsMale] = useState(initialData.isMale);
  const [birthday, setBirthday] = useState(initialData.birthday);

  // Kiểm tra và tách ngày, tháng, năm từ birthday
  const [day, month, year] =
    birthday && /^\d{4}-\d{2}-\d{2}$/.test(birthday)
      ? birthday.split("-")
      : ["01", "01", "2000"]; // Giá trị mặc định nếu birthday không hợp lệ

  const [selectedDay, setSelectedDay] = useState(day);
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [selectedYear, setSelectedYear] = useState(year);

  const handleSave = async () => {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        throw new Error("Không tìm thấy userId trong localStorage");
      }

      const updatedBirthday = `${selectedYear}-${selectedMonth}-${selectedDay}`;

      // Cập nhật tên hiển thị
      const nameResponse = await updateUserName(userId, displayName);

      // Cập nhật giới tính và ngày sinh
      const infoResponse = await updateUserInfo(userId, {
        isMale,
        birthday: updatedBirthday,
      });

      // Gọi hàm onSave để cập nhật state
      onSave({
        displayName: nameResponse.fullname || displayName,
        isMale: infoResponse.isMale || isMale,
        birthday: infoResponse.birthday || updatedBirthday,
      });

      onClose(); // Đóng modal
      alert("Cập nhật thông tin thành công!");
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Cập nhật thất bại!");
    }
  };
  const handleDateChange = (day: string, month: string, year: string) => {
    setSelectedDay(day);
    setSelectedMonth(month);
    setSelectedYear(year);

    // Cập nhật giá trị birthday
    setBirthday(`${year}-${month}-${day}`);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}>
      <div
        className="bg-white rounded-lg p-6 max-w-md w-[400px] relative shadow-lg flex flex-col"
        // Đồng bộ kích thước với UserModal
        style={{ height: "516px", minHeight: "400px" }} // Đảm bảo chiều cao tương tự
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <button
              type="button"
              className="text-gray-500 hover:text-gray-700 mr-2"
              onClick={onBack}>
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>
            <h2 className="text-xl font-semibold text-gray-800">
              Cập nhật thông tin cá nhân
            </h2>
          </div>
          <button
            type="button"
            title="Đóng"
            onClick={onClose}
            className="text-gray-500 text-xl hover:text-gray-700">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="mb-4">
            <div className="mb-2">
              <span className="text-gray-700 font-medium">Tên hiển thị</span>
            </div>
            <input
              type="text"
              placeholder="Nhập tên hiển thị"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <span className="text-gray-700 font-medium block mb-2">
              Thông tin cá nhân
            </span>
            <div className="flex items-center">
              <div
                className="flex items-center mr-8 cursor-pointer"
                onClick={() => setIsMale(true)}>
                <div
                  className={`w-5 h-5 rounded-full border-2 mr-2 flex items-center justify-center ${
                    isMale ? "border-blue-500" : "border-gray-300"
                  }`}>
                  {isMale && (
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  )}
                </div>
                <span>Nam</span>
              </div>
              <div
                className="flex items-center cursor-pointer"
                onClick={() => setIsMale(false)}>
                <div
                  className={`w-5 h-5 rounded-full border-2 mr-2 flex items-center justify-center ${
                    !isMale ? "border-blue-500" : "border-gray-300"
                  }`}>
                  {!isMale && (
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  )}
                </div>
                <span>Nữ</span>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <span className="text-gray-700 font-medium block mb-2">
              Ngày sinh
            </span>
            <div className="flex space-x-2">
              <div className="w-1/3">
                <div className="relative">
                  <select
                    value={selectedDay}
                    onChange={(e) =>
                      handleDateChange(
                        e.target.value,
                        selectedMonth,
                        selectedYear
                      )
                    }
                    className="w-full p-2 border rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={String(d).padStart(2, "0")}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
                  />
                </div>
              </div>
              <div className="w-1/3">
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full p-2 border rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={String(m).padStart(2, "0")}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
                  />
                </div>
              </div>
              <div className="w-1/3">
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full p-2 border rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {Array.from(
                      { length: 100 },
                      (_, i) => new Date().getFullYear() - i
                    ).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-2 mt-4">
          <button
            type="button"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            onClick={onClose}>
            Hủy
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            onClick={handleSave}>
            Cập nhật
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditUserModal;
