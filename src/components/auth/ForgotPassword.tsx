import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "react-phone-number-input/style.css";
import PhoneInput from "react-phone-number-input";
import { sendOTPForgotPassword } from "../../api/API";

const ForgotPassword: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!phoneNumber || phoneNumber.length < 10) {
      setMessage("Vui lòng nhập số điện thoại hợp lệ");
      setMessageType("error");
      return;
    }

    setIsSubmitting(true);
    const formattedPhone = phoneNumber.startsWith("+84")
      ? "0" + phoneNumber.substring(3)
      : phoneNumber;

    try {
      const response = await sendOTPForgotPassword(formattedPhone);
      setMessage("Đã gửi mã OTP!");
      setMessageType("success");
      
      setTimeout(() => {
        navigate("/verify-otp", {
          state: {
            phoneNumber: formattedPhone,
            otpId: response.otpId,
          },
        });
      }, 1500);
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Có lỗi xảy ra. Vui lòng thử lại.");
      }
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove the standalone button component

  const handlePhoneChange = (value: string | undefined) => {
    setMessage("");
    setPhoneNumber(value || "");
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
              onChange={handlePhoneChange}
              className="mt-2 w-full rounded-md border border-[#e0e0e0] px-3 py-2 focus:border-[#0066ff] focus:outline-none"
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
            disabled={isSubmitting}
            className={`w-full rounded-md ${
              isSubmitting ? "bg-[#99c2ff]" : "bg-[#0066ff] hover:bg-[#0051cc]"
            } px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#0066ff] focus:ring-offset-2`}>
            {isSubmitting ? "Đang xử lý..." : "Tiếp tục"}
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
