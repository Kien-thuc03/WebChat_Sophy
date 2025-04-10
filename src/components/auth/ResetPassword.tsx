import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { forgotPassword } from "../../api/API";
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'; // Import icons
import { Input } from 'antd'; // Import Ant Design Input

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { phoneNumber } = location.state || {};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!phoneNumber) {
      setMessage("Không tìm thấy số điện thoại. Vui lòng thử lại từ đầu.");
      setMessageType("error");
      return;
    }

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

    setIsSubmitting(true);
    setMessage("");

    try {
      await forgotPassword(phoneNumber, newPassword);
      setMessage("Đặt lại mật khẩu thành công!");
      setMessageType("success");
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setMessage(error.message || "Có lỗi xảy ra. Vui lòng thử lại.");
      } else {
        setMessage("Có lỗi xảy ra. Vui lòng thử lại.");
      }
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
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
            <Input.Password
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-2 w-full rounded-md border border-[#e0e0e0] px-3 py-2 focus:border-[#0066ff] focus:outline-none"
              placeholder="Nhập mật khẩu mới"
              disabled={isSubmitting}
              iconRender={visible => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900">
              Xác nhận mật khẩu
            </label>
            <Input.Password
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-2 w-full rounded-md border border-[#e0e0e0] px-3 py-2 focus:border-[#0066ff] focus:outline-none"
              placeholder="Nhập lại mật khẩu mới"
              disabled={isSubmitting}
              iconRender={visible => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </div>

          {message && (
            <div
              className={`text-sm text-center ${
                messageType === "success" ? "text-green-500" : "text-red-500"
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full rounded-md ${
              isSubmitting
                ? "bg-[#99c2ff] cursor-not-allowed"
                : "bg-[#0066ff] hover:bg-[#0051cc]"
            } px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#0066ff] focus:ring-offset-2`}
          >
            {isSubmitting ? "Đang xử lý..." : "Xác nhận"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;