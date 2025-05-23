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
  
  // Kiểm tra môi trường development
  const isDevelopment = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    // Kiểm tra định dạng số điện thoại
    let formattedPhone = phoneNumber;
    if (!phoneNumber || typeof phoneNumber !== "string") {
      setMessage("Vui lòng nhập số điện thoại hợp lệ");
      setMessageType("error");
      return;
    }

    // Kiểm tra xem số điện thoại có định dạng quốc tế (+84) không
    if (phoneNumber.startsWith("+84")) {
      // Đảm bảo có 9 số sau mã quốc gia +84
      if (phoneNumber.length !== 12) {
        setMessage("Định dạng số điện thoại không hợp lệ.");
        setMessageType("error");
        return;
      }
      formattedPhone = "0" + phoneNumber.slice(3);
    } else if (!phoneNumber.startsWith("0")) {
      setMessage("Định dạng số điện thoại không hợp lệ.");
      setMessageType("error");
      return;
    }

    // Kiểm tra độ dài số điện thoại (10 số với số 0 đầu tiên)
    if (formattedPhone.length !== 10) {
      setMessage("Số điện thoại phải có 10 chữ số bắt đầu bằng số 0.");
      setMessageType("error");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await sendOTPForgotPassword(formattedPhone);
      
      // Hiển thị thông báo phù hợp với môi trường
      if (isDevelopment && response.otp) {
        setMessage(`Đã gửi mã OTP! Dev mode: Sử dụng mã OTP ${response.otp}`);
      } else {
        setMessage("Đã gửi mã OTP!");
      }
      
      setMessageType("success");
      navigate("/verify-otp", {
        state: {
          phoneNumber: formattedPhone,
          otpId: response.otpId,
          backendOTP: isDevelopment ? response.otp : undefined
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
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              <p>Yêu cầu về số điện thoại:</p>
              <ul className="space-y-1 pl-1">
                <li className="flex items-start">
                  <span className="mr-2">-</span>
                  <span>Số điện thoại Việt Nam hợp lệ</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">-</span>
                  <span>Có 9 chữ số sau mã quốc gia +84</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">-</span>
                  <span>
                    Có 10 chữ số với số 0 đầu tiên (không kể mã quốc gia)
                  </span>
                </li>
              </ul>
            </div>
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
