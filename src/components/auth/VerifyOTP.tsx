import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { sendOTPForgotPassword, verifyOTPForgotPassword } from "../../api/API";

const VerifyOTP: React.FC = () => {
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [backendOTP, setBackendOTP] = useState("");

  // Kiểm tra môi trường development
  const isDevelopment = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';

  const location = useLocation();
  const navigate = useNavigate();
  const { phoneNumber: initialPhoneNumber, otpId: initialOtpId } =
    location.state || {};
  const [phoneNumber] = useState(initialPhoneNumber); // Giữ nguyên phoneNumber
  const [otpId, setOtpId] = useState(initialOtpId); // Cập nhật otpId khi gửi lại mã

  // Hiển thị mã OTP trong môi trường development nếu có
  useEffect(() => {
    if (isDevelopment && location.state && location.state.backendOTP) {
      setBackendOTP(location.state.backendOTP);
      setMessage(`Dev mode: Sử dụng mã OTP ${location.state.backendOTP}`);
      setMessageType("success");
    }
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting || isRateLimited) return;

    if (!phoneNumber || !otpId) {
      setMessage("Thông tin không hợp lệ. Vui lòng thử lại từ đầu.");
      setMessageType("error");
      return;
    }

    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      setMessage("Vui lòng nhập mã OTP 6 số hợp lệ");
      setMessageType("error");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      await verifyOTPForgotPassword(phoneNumber, otp, otpId);
      navigate("/reset-password", {
        state: {
          phoneNumber,
          verified: true,
        },
      });
    } catch (error: unknown) {
      let errorMessage = "Có lỗi xảy ra. Vui lòng thử lại.";
      if (error instanceof Error) {
        switch (error.message) {
          case "Invalid verification attempt":
            errorMessage =
              "Yêu cầu xác thực không hợp lệ. Vui lòng gửi lại mã mới.";
            break;
          case "Verification code expired":
            errorMessage = "Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.";
            break;
          case "Invalid verification code":
            errorMessage = "Mã OTP không đúng";
            break;
          case "Too many failed attempts. Please request a new code.":
            errorMessage = "Nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.";
            break;
          case "Quá nhiều lần xác thực. Vui lòng thử lại sau.":
            errorMessage = "Quá nhiều lần xác thực. Vui lòng thử lại sau.";
            setIsRateLimited(true);
            break;
          default:
            errorMessage = error.message;
        }
      }
      setMessage(errorMessage);
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    if (isResending || !phoneNumber || isRateLimited) {
      setMessage("Quá nhiều lần xác thực. Vui lòng thử lại sau.");
      setMessageType("error");
      return;
    }

    setIsResending(true);
    setMessage("");

    try {
      const response = await sendOTPForgotPassword(phoneNumber);
      setOtpId(response.otpId);
      
      // Hiển thị mã OTP trong môi trường development nếu có
      if (isDevelopment && response.otp) {
        setBackendOTP(response.otp);
        setMessage(`Đã gửi lại mã OTP! Dev mode: Sử dụng mã OTP ${response.otp}`);
      } else {
        setMessage("Đã gửi lại mã OTP!");
      }
      
      setMessageType("success");
      setIsRateLimited(false);
    } catch (error: unknown) {
      let errorMessage = "Không thể gửi lại mã OTP. Vui lòng thử lại sau.";
      if (error instanceof Error) {
        if (error.message === "Quá nhiều lần xác thực. Vui lòng thử lại sau.") {
          errorMessage = "Quá nhiều lần xác thực. Vui lòng thử lại sau.";
          setIsRateLimited(true);
        } else {
          errorMessage = error.message;
        }
      }
      setMessage(errorMessage);
      setMessageType("error");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#e4f4ff] p-6">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-lg">
        <h2 className="text-3xl font-bold text-[#0066ff] text-center">SOPHY</h2>
        <p className="mt-2 text-lg text-[#666666] text-center">Xác thực OTP</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900">
              Nhập mã OTP
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              className="mt-2 w-full rounded-md border border-[#e0e0e0] px-3 py-2 focus:border-[#0066ff] focus:outline-none"
              placeholder="Nhập mã OTP 6 số"
              disabled={isSubmitting || isRateLimited}
            />
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              <p>Yêu cầu về mã OTP:</p>
              <ul className="space-y-1 pl-1">
                <li className="flex items-start">
                  <span className="mr-2">-</span>
                  <span>Mã OTP gồm 6 chữ số</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">-</span>
                  <span>Mã không bao gồm ký tự</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={isResending || isRateLimited}
              className={`mt-2 text-sm ${
                isResending || isRateLimited
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-[#0066ff] hover:underline"
              }`}>
              {isResending
                ? "Đang gửi..."
                : isRateLimited
                  ? "Bị chặn"
                  : "Gửi lại mã"}
            </button>
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
            disabled={isSubmitting || isRateLimited}
            className={`w-full rounded-md ${
              isSubmitting || isRateLimited
                ? "bg-[#99c2ff] cursor-not-allowed"
                : "bg-[#0066ff] hover:bg-[#0051cc]"
            } px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#0066ff] focus:ring-offset-2`}>
            {isSubmitting ? "Đang xử lý..." : "Xác nhận"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link
            to="/forgot-password"
            className="text-sm text-[#0066ff] hover:underline">
            Quay lại
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
