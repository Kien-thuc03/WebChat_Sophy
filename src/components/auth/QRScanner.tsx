import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate } from "react-router-dom";
import { generateQRToken, checkQRStatus } from "../../api/API";
import io from "socket.io-client";

const SOCKET_SERVER_URL =
  import.meta.env.VITE_SOCKET_URL;

const QRScanner: React.FC = () => {
  const navigate = useNavigate();
  const [qrToken, setQRToken] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(300000); // Khởi tạo 300 giây (300000ms)
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [isNearExpiration, setIsNearExpiration] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<{
    fullname: string;
    urlavatar: string | null;
  } | null>(null);

  // Khởi tạo QR Token
  useEffect(() => {
    const generateQR = async () => {
      try {
        setIsLoading(true);
        const response = await generateQRToken();
        setQRToken(response.qrToken);
        console.log("Generated QR Token:", response.qrToken); // Debug log
        const expiresAtDate = new Date(response.expiresAt);
        setExpiresAt(expiresAtDate);
        // Tính toán thời gian còn lại ngay lập tức
        const initialTimeLeft = Math.max(
          0,
          expiresAtDate.getTime() - new Date().getTime()
        );
        setTimeLeft(initialTimeLeft); // Cập nhật timeLeft ngay khi nhận được expiresAt
        setStatus("waiting");
        setIsExpired(false);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Không thể tạo mã QR. Vui lòng thử lại."
        );
      } finally {
        setIsLoading(false);
      }
    };

    generateQR();
  }, []);

  // Theo dõi trạng thái và thực hiện điều hướng
  useEffect(() => {
    if (status === "authenticated") {
      navigate("/main");
      window.location.reload();
    }
  }, [status, navigate]);

  // Cập nhật thời gian còn lại
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const timeRemaining = Math.max(
        0,
        expiresAt.getTime() - new Date().getTime()
      );
      setTimeLeft(timeRemaining);
      if (timeRemaining === 0) {
        setIsExpired(true);
      } else if (timeRemaining <= 30000) {
        setIsNearExpiration(true);
      } else {
        setIsNearExpiration(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Kết nối WebSocket
  useEffect(() => {
    if (!qrToken || status !== "waiting") return;

    console.log("Connecting to socket with qrToken:", qrToken); // Debug log

    const socketIo = io(SOCKET_SERVER_URL, {
      query: { qrToken },
    });

    socketIo.on("connect", () => {
      console.log("Socket connected!"); // Debug log
      socketIo.emit("initQrLogin", qrToken);
      console.log("Emitted 'initQrLogin' with qrToken:", qrToken); // Debug log
    });

    socketIo.on("qrScanned", (data) => {
      console.log("Received 'qrScanned' event:", data); // Debug log
      setStatus("scanned");
      setUserInfo({
        fullname: data.fullname,
        urlavatar: data.urlavatar,
      });
    });

    socketIo.on("qrLoginConfirmed", async (data) => {
      try {
        const qrToken = data.token;
        const response = await checkQRStatus(qrToken);

        localStorage.setItem("userId", response.userId);
        localStorage.setItem("token", response.accessToken);
        localStorage.setItem("refreshToken", response.refreshToken);

        setStatus("authenticated");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Không thể xác thực login, vui lòng thử lại hoặc đăng nhập bằng mật khẩu."
        );
      }
    });

    socketIo.on("qrLoginRejected", (data) => {
      setError(data.message || "Đăng nhập QR bị từ chối.");
      setStatus("rejected");
    });

    socketIo.on("qrError", (data) => {
      setError(data.message || "Lỗi không xác định.");
      setStatus("error");
    });

    socketIo.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason); // Debug log
    });

    
  }, [qrToken, status]);

  const handleRegenerateQR = async () => {
    setIsExpired(false);
    setTimeLeft(300000); // Đặt lại timeLeft thành 300 giây
    setQRToken("");
    setExpiresAt(null);
    setStatus("waiting");
    setUserInfo(null);

    try {
      const response = await generateQRToken();
      setQRToken(response.qrToken);
      const expiresAtDate = new Date(response.expiresAt);
      setExpiresAt(expiresAtDate);
      const initialTimeLeft = Math.max(
        0,
        expiresAtDate.getTime() - new Date().getTime()
      );
      setTimeLeft(initialTimeLeft); // Cập nhật timeLeft khi tạo lại QR
      setStatus("waiting");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tạo mã QR. Vui lòng thử lại."
      );
    }
  };

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
          ) : status === "scanned" && userInfo ? (
            <div className="text-center">
              <img
                src={userInfo.urlavatar || "/images/default-avatar.png"}
                alt="User avatar"
                className="h-24 w-24 rounded-full mx-auto"
                onError={(e) => {
                  e.currentTarget.src = "/images/default-avatar.png";
                }}
              />
              <p className="mt-2 text-lg font-semibold">{userInfo.fullname}</p>
              <p className="text-sm text-gray-600">
                Đã quét QR, đang chờ xác nhận...
              </p>
            </div>
          ) : isExpired ? (
            <div className="text-center text-gray-500">
              <p>Mã QR đã hết hạn!</p>
              <button
                onClick={handleRegenerateQR}
                className="mt-4 text-blue-500">
                Tạo lại mã QR
              </button>
            </div>
          ) : (
            <div className="p-4 border-2 border-gray-200 rounded-lg">
              <QRCodeSVG
                value={JSON.stringify({
                  token: qrToken,
                  expiresAt: expiresAt?.toISOString(),
                  type: "sophy_auth",
                })}
                size={200}
              />
              <p
                className={`font-bold text-xl text-center mt-2 ${
                  isNearExpiration ? "text-red-500" : "text-black"
                }`}
              >
                {Math.ceil(timeLeft / 1000)} giây còn lại
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-sm text-blue-500 transition-colors duration-200 hover:text-blue-600 underline hover:no-underline"
          >
            Đăng nhập bằng mật khẩu
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;