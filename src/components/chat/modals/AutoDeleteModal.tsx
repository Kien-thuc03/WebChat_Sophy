import React from "react";
import { useLanguage } from "../../../features/auth/context/LanguageContext"; // Import context

interface AutoDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (duration: string) => void;
}

const AutoDeleteModal: React.FC<AutoDeleteModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const { t } = useLanguage(); // Sử dụng context

  if (!isOpen) return null;

  const options = [
    { id: "1d", label: t.auto_delete_1d || "1 ngày" },
    { id: "7d", label: t.auto_delete_7d || "7 ngày" },
    { id: "14d", label: t.auto_delete_14d || "14 ngày" },
    { id: "never", label: t.auto_delete_never || "Không bao giờ" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        className="bg-white rounded-lg shadow-xl w-96 max-w-md"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {t.auto_delete_messages || "Tin nhắn tự xóa"}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">{t.close || "Đóng"}</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-2">
            {options.map((option) => (
              <button
                key={option.id}
                className="w-full p-3 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-150"
                onClick={() => {
                  onSelect(option.id);
                  onClose();
                }}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoDeleteModal;
