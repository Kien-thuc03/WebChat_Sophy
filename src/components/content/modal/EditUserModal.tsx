import React, { useState, useEffect } from "react";
import { Modal, message } from "antd"; // Import message from antd
import { updateUserInfo, updateUserName } from "../../../api/API";
import { useLanguage } from "../../../features/auth/context/LanguageContext";

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  initialData: { displayName: string; isMale: boolean; birthday: string };
  onSave: (data: {
    displayName: string;
    isMale: boolean;
    birthday: string;
  }) => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSave,
}) => {
  const [displayName, setDisplayName] = useState(initialData.displayName);
  const [isMale, setIsMale] = useState(initialData.isMale);
  const [selectedDay, setSelectedDay] = useState("01");
  const [selectedMonth, setSelectedMonth] = useState("01");
  const [selectedYear, setSelectedYear] = useState("2000");
  const { t } = useLanguage(); // Sử dụng context

  const handleSave = async () => {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId)
        throw new Error(
          t.no_user_id || "Không tìm thấy userId trong localStorage"
        );

      const updatedBirthday = `${selectedYear}-${selectedMonth}-${selectedDay}`;
      const nameResponse = await updateUserName(userId, displayName);
      const infoResponse = await updateUserInfo(userId, {
        isMale,
        birthday: updatedBirthday,
      });

      onSave({
        displayName: nameResponse.fullname || displayName,
        isMale:
          infoResponse.isMale !== undefined ? infoResponse.isMale : isMale,
        birthday: infoResponse.birthday || updatedBirthday,
      });

      onClose();
      message.success(t.update_success || "Cập nhật thông tin thành công!");
    } catch (error) {
      console.error("Lỗi:", error);
      message.error(t.update_error || "Cập nhật thất bại!");
    }
  };

  useEffect(() => {
    if (
      initialData.birthday &&
      /^\d{4}-\d{2}-\d{2}$/.test(initialData.birthday)
    ) {
      const [year, month, day] = initialData.birthday.split("-");
      setSelectedDay(day);
      setSelectedMonth(month);
      setSelectedYear(year);
    } else {
      setSelectedDay("01");
      setSelectedMonth("01");
      setSelectedYear("2000");
    }
  }, [initialData.birthday]);

  const handleDateChange = (day: string, month: string, year: string) => {
    setSelectedDay(day);
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  return (
    <Modal
      title={t.update_profile || "Cập nhật thông tin cá nhân"}
      open={isOpen}
      onCancel={onClose}
      onOk={handleSave}
      centered
      bodyStyle={{ padding: "24px" }}
      footer={[
        <button
          key="cancel"
          type="button"
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          onClick={onClose}>
          {t.cancel || "Hủy"}
        </button>,
        <button
          key="save"
          type="button"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          onClick={handleSave}>
          {t.update || "Cập nhật"}
        </button>,
      ]}>
      <div>
        <div className="mb-4">
          <label className="text-gray-700 font-medium">
            {t.display_name || "Tên hiển thị"}
          </label>
          <input
            type="text"
            placeholder={t.enter_display_name || "Nhập tên hiển thị"}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="mb-4">
          <label className="text-gray-700 font-medium">
            {t.gender || "Giới tính"}
          </label>
          <div className="flex items-center space-x-4">
            <div
              className="flex items-center cursor-pointer"
              onClick={() => setIsMale(true)}>
              <div
                className={`w-5 h-5 rounded-full border-2 mr-2 flex items-center justify-center ${isMale ? "border-blue-500" : "border-gray-300"}`}>
                {isMale && (
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                )}
              </div>
              <span>{t.male || "Nam"}</span>
            </div>
            <div
              className="flex items-center cursor-pointer"
              onClick={() => setIsMale(false)}>
              <div
                className={`w-5 h-5 rounded-full border-2 mr-2 flex items-center justify-center ${!isMale ? "border-blue-500" : "border-gray-300"}`}>
                {!isMale && (
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                )}
              </div>
              <span>{t.female || "Nữ"}</span>
            </div>
          </div>
        </div>
        <div className="mb-4">
          <label className="text-gray-700 font-medium">
            {t.birthday || "Ngày sinh"}
          </label>
          <div className="flex space-x-2">
            <div className="w-1/3">
              <select
                value={selectedDay}
                onChange={(e) =>
                  handleDateChange(e.target.value, selectedMonth, selectedYear)
                }
                className="w-full p-2 border rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={String(d).padStart(2, "0")}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-1/3">
              <select
                value={selectedMonth}
                onChange={(e) =>
                  handleDateChange(selectedDay, e.target.value, selectedYear)
                }
                className="w-full p-2 border rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={String(m).padStart(2, "0")}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-1/3">
              <select
                value={selectedYear}
                onChange={(e) =>
                  handleDateChange(selectedDay, selectedMonth, e.target.value)
                }
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
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default EditUserModal;
