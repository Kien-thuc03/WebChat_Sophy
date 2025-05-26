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
  const [, setBackendOTP] = useState("");

  // Kiểm tra môi trường development dựa trên biến môi trường thay vì hostname
  // Điều này đảm bảo hoạt động đúng cả trên local và Vercel
  const isDevelopmentOrTest = process.env.NODE_ENV !== "production";

  const location = useLocation();
  const navigate = useNavigate();
  const { phoneNumber: initialPhoneNumber, otpId: initialOtpId } =
    location.state || {};
  const [phoneNumber] = useState(initialPhoneNumber); // Giữ nguyên phoneNumber
  const [otpId, setOtpId] = useState(initialOtpId); // Cập nhật otpId khi gửi lại mã

  // Hiển thị mã OTP trong môi trường development hoặc testing
  useEffect(() => {
    const stateBackendOTP = location.state?.backendOTP;
    if (isDevelopmentOrTest && stateBackendOTP) {
      setBackendOTP(stateBackendOTP);
      setMessage(`Dev mode: Sử dụng mã OTP ${stateBackendOTP}`);
      setMessageType("success");
    }
  }, [location.state, isDevelopmentOrTest]);

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
      
      // Hiển thị mã OTP trong môi trường development hoặc testing nếu có
      if (isDevelopmentOrTest && response.otp) {
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
          </div>

          {message && (
            <div
              className={`mt-4 p-2 rounded-md text-sm ${
                messageType === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message}
            </div>
          )}

          <div className="flex flex-col mt-6 space-y-4">
            <button
              type="submit"
              className={`w-full px-4 py-2 text-white font-medium rounded-md bg-[#0066ff] hover:bg-[#0055dd] focus:outline-none ${
                (isSubmitting || isRateLimited) &&
                "opacity-50 cursor-not-allowed"
              }`}
              disabled={isSubmitting || isRateLimited}
            >
              {isSubmitting ? "Đang xử lý..." : "Xác nhận"}
            </button>
            <button
              type="button"
              className={`w-full px-4 py-2 text-[#0066ff] font-medium rounded-md border border-[#0066ff] hover:bg-[#e6f0ff] focus:outline-none ${
                (isResending || isRateLimited) && "opacity-50 cursor-not-allowed"
              }`}
              onClick={handleResendOTP}
              disabled={isResending || isRateLimited}
            >
              {isResending ? "Đang gửi..." : "Gửi lại mã"}
            </button>
            <Link
              to="/forgot-password"
              className="text-center text-[#0066ff] hover:underline"
            >
              Quay lại
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyOTP;
