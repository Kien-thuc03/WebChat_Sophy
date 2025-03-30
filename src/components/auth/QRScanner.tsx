import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate } from "react-router-dom";
import { generateQRToken, checkQRStatus } from "../../api/API";

const QRScanner: React.FC = () => {
  const navigate = useNavigate();
  const [qrToken, setQRToken] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    const generateQR = async () => {
      try {
        setIsLoading(true);
        const response = await generateQRToken();
        setQRToken(response.qrToken);
        setExpiresAt(new Date(response.expiresAt));
        setStatus("waiting");
      } catch (error) {
        setError("Không thể tạo mã QR. Vui lòng thử lại.");
      } finally {
        setIsLoading(false);
      }
    };

    generateQR();
  }, []);

  useEffect(() => {
    let pollingInterval: NodeJS.Timeout;

    if (qrToken && status === "waiting") {
      pollingInterval = setInterval(async () => {
        try {
          const response = await checkQRStatus(qrToken);
          setStatus(response.status);

          if (response.status === "authenticated") {
            localStorage.setItem("userId", response.userId);
            localStorage.setItem("token", response.accessToken);
            clearInterval(pollingInterval);
            navigate("/main");
          } else if (response.status === "expired") {
            setError("Mã QR đã hết hạn. Vui lòng tải lại trang để tạo mã mới.");
            clearInterval(pollingInterval);
          }
        } catch (error: any) {
          console.error("Lỗi kiểm tra trạng thái QR:", error);
          if (error.message === "QR token đã hết hạn") {
            setError("Mã QR đã hết hạn. Vui lòng tải lại trang để tạo mã mới.");
            clearInterval(pollingInterval);
          }
        }
      }, 2000);
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [qrToken, status, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-blue-100 p-6">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-lg">
        <div className="flex flex-col items-center">
          <img
            src="/images/logo.png"
            alt="Logo"
            className="h-20 w-20 rounded-full"
          />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            Đăng nhập bằng QR Code
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Quét mã QR bằng ứng dụng trên điện thoại để đăng nhập
          </p>
        </div>

        <div className="mt-6 flex justify-center">
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : (
            <div className="p-4 border-2 border-gray-200 rounded-lg">
              <QRCodeSVG value={qrToken} size={200} />
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-sm text-blue-500 hover:text-blue-400"
          >
            Đăng nhập bằng mật khẩu
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;