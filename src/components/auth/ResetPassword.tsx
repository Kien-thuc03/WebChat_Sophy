import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { forgotPassword } from "../../api/API";

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  
  const location = useLocation();
  const navigate = useNavigate();
  const { phoneNumber } = location.state || {};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || newPassword.length < 6) {
      setMessage("Mật khẩu phải có ít nhất 6 ký tự");
      setMessageType("error");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Mật khẩu xác nhận không khớp");
      setMessageType("error");
      return;
    }

    try {
      await forgotPassword(phoneNumber, newPassword);
      setMessage("Đặt lại mật khẩu thành công!");
      setMessageType("success");
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Có lỗi xảy ra. Vui lòng thử lại.");
      }
      setMessageType("error");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#e4f4ff] p-6">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-lg">
        <h2 className="text-3xl font-bold text-[#0066ff] text-center">SOPHY</h2>
        <p className="mt-2 text-lg text-[#666666] text-center">
          Đặt lại mật khẩu
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900">
              Mật khẩu mới
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-2 w-full rounded-md border border-[#e0e0e0] px-3 py-2 focus:border-[#0066ff] focus:outline-none"
              placeholder="Nhập mật khẩu mới"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900">
              Xác nhận mật khẩu
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-2 w-full rounded-md border border-[#e0e0e0] px-3 py-2 focus:border-[#0066ff] focus:outline-none"
              placeholder="Nhập lại mật khẩu mới"
            />
          </div>

          {message && (
            <div
              className={`text-sm text-center ${
                messageType === "success" ? "text-green-500" : "text-red-500"
              }`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-[#0066ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0051cc] focus:outline-none focus:ring-2 focus:ring-[#0066ff] focus:ring-offset-2">
            Xác nhận
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;