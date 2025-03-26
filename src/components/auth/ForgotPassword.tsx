import React, { useState } from "react"; // Xóa useContext nếu không cần
import { Link } from "react-router-dom";
import "react-phone-number-input/style.css";
import PhoneInput from "react-phone-number-input";
import { changePassword } from "../../api/API"; // Import API quên mật khẩu

const ForgotPassword: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState<string>(""); // Ensure phoneNumber is a string
  const [oldPassword, setOldPassword] = useState<string>(""); // Input for old password
  const [newPassword, setNewPassword] = useState<string>(""); // Input for new password
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Ngăn chặn reload trang

    try {
      // Gọi API changePassword
      const responseMessage = await changePassword(oldPassword, newPassword);

      // Hiển thị thông báo thành công
      setMessage(responseMessage);
    } catch (error: unknown) {
      // Xử lý lỗi và hiển thị thông báo lỗi
      if (error instanceof Error) {
        setMessage(error.message || "Đã xảy ra lỗi, vui lòng thử lại.");
      } else {
        setMessage("Đã xảy ra lỗi không xác định.");
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#e4f4ff] p-6">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-lg">
        <h2 className="text-3xl font-bold text-[#0066ff] text-center">SOPHY</h2>
        <p className="mt-2 text-lg text-[#666666] text-center">
          Khôi phục mật khẩu SOPHY để kết nối với ứng dụng SOPHY Web
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div>
            <label
              htmlFor="phoneNumber"
              className="block text-sm font-medium text-gray-900">
              Nhập số điện thoại của bạn
            </label>
            <PhoneInput
              international
              defaultCountry="VN"
              placeholder="Nhập số điện thoại"
              value={phoneNumber}
              onChange={(value) => setPhoneNumber(value || "")} // Handle undefined
              className="mt-2 w-full rounded-md border border-[#e0e0e0] px-3 py-2 focus:border-[#0066ff] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="oldPassword"
              className="block text-sm font-medium text-gray-900">
              Nhập mật khẩu cũ
            </label>
            <input
              type="password"
              id="oldPassword"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="mt-2 w-full rounded-md border border-[#e0e0e0] px-3 py-2 focus:border-[#0066ff] focus:outline-none"
              autoComplete="current-password" // Thêm thuộc tính này
            />
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-900">
              Nhập mật khẩu mới
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-2 w-full rounded-md border border-[#e0e0e0] px-3 py-2 focus:border-[#0066ff] focus:outline-none"
              autoComplete="new-password" // Thêm thuộc tính này
            />
          </div>

          {message && (
            <div className="text-sm text-green-500 text-center">{message}</div>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-[#0066ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0051cc] focus:outline-none focus:ring-2 focus:ring-[#0066ff] focus:ring-offset-2">
            Tiếp tục
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/" className="text-sm text-[#0066ff] hover:underline">
            Quay lại
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
