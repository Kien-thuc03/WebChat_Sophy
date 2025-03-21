import React, { useState } from "react";
import { Link } from "react-router-dom";

const ForgotPassword: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log("Phone number submitted for password reset:", phoneNumber);
      // Gửi yêu cầu reset mật khẩu đến API
      // Ví dụ: await apiClient.post("/forgot-password", { phoneNumber });
      setMessage(
        "Nếu số điện thoại tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu."
      );
    } catch (error) {
      console.error("Error submitting forgot password request:", error);
      setMessage("Đã xảy ra lỗi. Vui lòng thử lại.");
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
            <div className="flex items-center mt-2">
              <span className="text-lg text-gray-700">+84</span>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="text"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="ml-2 w-full rounded-md border border-[#e0e0e0] px-3 py-2 focus:border-[#0066ff] focus:outline-none"
                placeholder="Số điện thoại"
              />
            </div>
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
          <a href="#" className="text-sm text-[#0066ff] hover:underline">
            <Link to="/">Quay lại</Link>
          </a>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
