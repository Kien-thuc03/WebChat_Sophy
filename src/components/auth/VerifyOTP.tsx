import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { sendOTPForgotPassword, verifyOTPForgotPassword } from "../../api/API";

const VerifyOTP: React.FC = () => {
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );
  const [isResending, setIsResending] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { phoneNumber, otpId } = location.state || {};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      setMessage("Vui lòng nhập mã OTP hợp lệ");
      setMessageType("error");
      return;
    }

    try {
      await verifyOTPForgotPassword(phoneNumber, otp, otpId);
      setMessage("Xác thực OTP thành công!");
      setMessageType("success");

      setTimeout(() => {
        navigate("/reset-password", {
          state: {
            phoneNumber,
            verified: true,
          },
        });
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

  const handleResendOTP = async () => {
    try {
      setIsResending(true);
      await sendOTPForgotPassword(phoneNumber);
      setMessage("Đã gửi lại mã OTP!");
      setMessageType("success");
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Không thể gửi lại mã OTP. Vui lòng thử lại sau.");
      }
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
            />
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={isResending}
              className="mt-2 text-sm text-[#0066ff] hover:underline">
              {isResending ? "Đang gửi..." : "Gửi lại mã"}
            </button>
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
