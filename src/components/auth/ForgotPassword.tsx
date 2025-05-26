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
  
  // Kiểm tra môi trường development dựa trên biến môi trường thay vì hostname
  // Điều này đảm bảo hoạt động đúng cả trên local và Vercel
  const isDevelopmentOrTest = process.env.NODE_ENV !== "production";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!phoneNumber) {
      setMessage("Vui lòng nhập số điện thoại");
      setMessageType("error");
      return;
    }

    let formattedPhone;
    // Kiểm tra xem số điện thoại có đúng định dạng hay không
    if (phoneNumber.startsWith("+84")) {
      formattedPhone = phoneNumber;
    } else if (phoneNumber.startsWith("0")) {
      formattedPhone = `+84${phoneNumber.substring(1)}`;
    } else if (phoneNumber.startsWith("84")) {
      formattedPhone = `+${phoneNumber}`;
    } else {
      formattedPhone = `+84${phoneNumber}`;
    }

    // Regex để kiểm tra định dạng số điện thoại Việt Nam
    const phoneRegex = /^\+84\d{9}$/;
    if (!phoneRegex.test(formattedPhone)) {
      setMessage("Vui lòng nhập số điện thoại Việt Nam hợp lệ");
      setMessageType("error");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await sendOTPForgotPassword(formattedPhone);
      
      // Hiển thị thông báo phù hợp với môi trường
      if (isDevelopmentOrTest && response.otp) {
        setMessage(`Đã gửi mã OTP! Dev mode: Sử dụng mã OTP ${response.otp}`);
      } else {
        setMessage("Đã gửi mã OTP!");
      }
      
      setMessageType("success");
      navigate("/verify-otp", {
        state: {
          phoneNumber: formattedPhone,
          otpId: response.otpId,
          backendOTP: response.otp
        },
      });
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

  const handlePhoneChange = (value: string | undefined) => {
    setMessage("");
    setPhoneNumber(value || "");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#e4f4ff] p-6">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-lg">
        <h2 className="text-3xl font-bold text-[#0066ff] text-center">SOPHY</h2>
        <p className="mt-2 text-lg text-[#666666] text-center">Quên mật khẩu</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#333333]">
              Số điện thoại
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
              className={`p-2 rounded-md border ${
                messageType === "success"
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <p
                className={`text-sm text-center ${
                  messageType === "success" ? "text-green-600" : "text-red-600"
                }`}
              >
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
            } px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#0066ff] focus:ring-offset-2`}
          >
            {isSubmitting ? "Đang xử lý..." : "Gửi mã xác thực"}
          </button>

          <div className="mt-4 text-center">
            <Link to="/" className="text-sm text-[#0066ff] hover:underline">
              Trở về đăng nhập
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
