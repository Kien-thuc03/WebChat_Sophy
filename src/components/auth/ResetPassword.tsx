import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { forgotPassword } from "../../api/API";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import { Input } from "antd";

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );
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

    // Kiểm tra định dạng mật khẩu
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,20}$/;
    if (!passwordRegex.test(newPassword)) {
      setMessage("Mật khẩu phải từ 6-20 ký tự, bao gồm chữ và số");
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

      navigate("/");

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
          {/* Trường số điện thoại ẩn để hỗ trợ trình quản lý mật khẩu */}
          <input 
            type="text" 
            name="username" 
            autoComplete="username" 
            value={phoneNumber || ""} 
            readOnly 
            style={{ display: 'none' }} 
            aria-hidden="true"
          />
          
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
              iconRender={(visible) =>
                visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
              }
              autoComplete="new-password"
            />
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              <p>Yêu cầu về mật khẩu:</p>
              <ul className="space-y-1 pl-1">
                <li className="flex items-start">
                  <span className="mr-2">-</span>
                  <span>Mật khẩu phải từ 6-20 ký tự</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">-</span>
                  <span>Phải chứa ít nhất 1 chữ cái</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">-</span>
                  <span>Phải chứa ít nhất 1 chữ số</span>
                </li>
              </ul>
            </div>
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
              iconRender={(visible) =>
                visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
              }
              autoComplete="new-password"
            />
          </div>

          {message && (
            <div
              className={`p-2 rounded-md border ${
                messageType === "success"
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}>
              <p
                className={`text-sm text-center ${
                  messageType === "success" ? "text-green-600" : "text-red-600"
                }`}>
                {message}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full rounded-md ${
              isSubmitting
                ? "bg-[#99c2ff] cursor-not-allowed"
                : "bg-[#0066ff] hover:bg-[#0051cc]"
            } px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#0066ff] focus:ring-offset-2`}>
            {isSubmitting ? "Đang xử lý..." : "Xác nhận"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
