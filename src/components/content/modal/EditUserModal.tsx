import React, { useState, useEffect } from "react";
import { Modal, message } from "antd";
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
  const { t } = useLanguage();

  const validateAge = (year: string, month: string, day: string): boolean => {
    const updatedBirthday = `${year}-${month}-${day}`;
    const birthDate = new Date(updatedBirthday);
    const currentDate = new Date();

    if (isNaN(birthDate.getTime())) {
      return false;
    }

    let age = currentDate.getFullYear() - birthDate.getFullYear();
    const monthDifference = currentDate.getMonth() - birthDate.getMonth();
    const dayDifference = currentDate.getDate() - birthDate.getDate();

    if (monthDifference < 0 || (monthDifference === 0 && dayDifference < 0)) {
      age--;
    }

    return age >= 13 && age <= 123;
  };

  const handleSave = async () => {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        message.error(
          t.no_user_id || "Không tìm thấy userId trong localStorage"
        );
        return;
      }

      const updatedBirthday = `${selectedYear}-${selectedMonth}-${selectedDay}`;

      // Kiểm tra tuổi ở client trước
      if (!validateAge(selectedYear, selectedMonth, selectedDay)) {
        const birthDate = new Date(updatedBirthday);
        let age = new Date().getFullYear() - birthDate.getFullYear();
        const monthDiff = new Date().getMonth() - birthDate.getMonth();
        const dayDiff = new Date().getDate() - birthDate.getDate();
        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age--;

        if (age < 13) {
          message.error(t.invalid_age_min || "Tuổi phải lớn hơn hoặc bằng 13");
        } else if (age > 123) {
          message.error(t.invalid_age_max || "Tuổi phải nhỏ hơn hoặc bằng 123");
        } else {
          message.error(t.invalid_date || "Ngày sinh không hợp lệ");
        }
        return;
      }

      // Gửi request API
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
    } catch (error: unknown) {
      // Hiển thị lỗi cụ thể từ API
      const errorMessage =
        error instanceof Error ? error.message : "Lỗi không xác định";
      message.error(errorMessage);
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
                className={`w-5 h-5 rounded-full border-2 mr-2 flex items-center justify-center ${
                  isMale ? "border-blue-500" : "border-gray-300"
                }`}>
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
                className={`w-5 h-5 rounded-full border-2 mr-2 flex items-center justify-center ${
                  !isMale ? "border-blue-500" : "border-gray-300"
                }`}>
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
