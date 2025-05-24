import React, { useEffect, useState } from "react";
import zegoService from "../../services/zegoService";

interface ZegoDebugProps {
  onClose?: () => void;
}

const ZegoDebug: React.FC<ZegoDebugProps> = ({ onClose }) => {
  const [sdkLoaded, setSdkLoaded] = useState<boolean>(false);
  const [sdkVersion, setSdkVersion] = useState<string>("Unknown");
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(
    null
  );
  const [micPermission, setMicPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string>("");
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Kiểm tra SDK khi component mount
  useEffect(() => {
    checkSDKStatus();
    checkPermissions();

    // Lắng nghe sự kiện SDK tải
    const handleSDKLoaded = () => {
      checkSDKStatus();
    };

    window.addEventListener("zegoSDKLoaded", handleSDKLoaded);
    return () => {
      window.removeEventListener("zegoSDKLoaded", handleSDKLoaded);
    };
  }, []);

  // Kiểm tra trạng thái Zego SDK
  const checkSDKStatus = () => {
    if (typeof window !== "undefined") {
      if (window.ZegoExpressEngine) {
        setSdkLoaded(true);
        try {
          // Thử lấy phiên bản SDK
          if (window.ZegoExpressEngine.version) {
            setSdkVersion(window.ZegoExpressEngine.version);
          } else if (typeof window.ZegoExpressEngine === "function") {
            setSdkVersion("Khả dụng (phiên bản không xác định)");
          }
        } catch (e) {
          setSdkVersion("Lỗi khi kiểm tra phiên bản");
        }
      } else {
        setSdkLoaded(false);
        setSdkVersion("Chưa tải");
      }
    }
  };

  // Kiểm tra quyền camera và microphone
  const checkPermissions = async () => {
    try {
      const { camera, microphone } = await zegoService.checkMediaPermissions();
      setCameraPermission(camera);
      setMicPermission(microphone);
    } catch (e) {
      console.error("Lỗi khi kiểm tra quyền:", e);
      setCameraPermission(false);
      setMicPermission(false);
    }
  };

  // Test tạo stream
  const testCreateStream = async () => {
    setLoading(true);
    setTestResult("");
    setError(null);

    try {
      // Kiểm tra xem SDK đã tải chưa
      if (!window.ZegoExpressEngine) {
        throw new Error("SDK chưa được tải");
      }

      // Tạo stream
      const stream = await zegoService.createStream(false, true);
      setStream(stream);
      setTestResult("Đã tạo stream thành công");
      console.log("Stream created:", stream);
    } catch (e) {
      setError(
        `Lỗi khi tạo stream: ${e instanceof Error ? e.message : String(e)}`
      );
      console.error("Lỗi khi tạo stream:", e);
    } finally {
      setLoading(false);
    }
  };

  // Test phát stream
  const testPublishStream = async () => {
    setLoading(true);
    setTestResult("");
    setError(null);

    try {
      // Kiểm tra xem có stream không
      if (!stream) {
        throw new Error("Chưa tạo stream, hãy tạo stream trước");
      }

      // Phát stream với ID test
      const testStreamID = `test_stream_${Date.now()}`;

      // Thử startPublishingStream trước
      if (typeof zegoService.startPublishingStream === "function") {
        const result = await zegoService.startPublishingStream(testStreamID);
        setTestResult(
          `startPublishingStream ${result ? "thành công" : "thất bại"} với ID: ${testStreamID}`
        );
      } else {
        throw new Error("Không tìm thấy phương thức startPublishingStream");
      }
    } catch (e) {
      setError(
        `Lỗi khi phát stream: ${e instanceof Error ? e.message : String(e)}`
      );
      console.error("Lỗi khi phát stream:", e);
    } finally {
      setLoading(false);
    }
  };

  // Tải SDK thủ công
  const handleLoadSDK = () => {
    setLoading(true);
    setError(null);

    try {
      if (typeof window !== "undefined" && window.loadZegoSDK) {
        window.loadZegoSDK();
        setTimeout(() => {
          checkSDKStatus();
          setLoading(false);
        }, 3000);
      } else {
        setError("Không tìm thấy hàm loadZegoSDK");
        setLoading(false);
      }
    } catch (e) {
      setError(
        `Lỗi khi tải SDK: ${e instanceof Error ? e.message : String(e)}`
      );
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg w-full max-w-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Trạng thái Zego SDK</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700">
            <span className="text-2xl">&times;</span>
          </button>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between border-b pb-2">
          <span className="font-medium">SDK đã tải:</span>
          <span
            className={`${sdkLoaded ? "text-green-600" : "text-red-600"} font-bold`}>
            {sdkLoaded ? "Đã tải" : "Chưa tải"}
          </span>
        </div>

        <div className="flex justify-between border-b pb-2">
          <span className="font-medium">Phiên bản:</span>
          <span>{sdkVersion}</span>
        </div>

        <div className="flex justify-between border-b pb-2">
          <span className="font-medium">Quyền camera:</span>
          <span
            className={`${
              cameraPermission === null
                ? "text-gray-500"
                : cameraPermission
                  ? "text-green-600"
                  : "text-red-600"
            } font-bold`}>
            {cameraPermission === null
              ? "Chưa kiểm tra"
              : cameraPermission
                ? "Được phép"
                : "Bị từ chối"}
          </span>
        </div>

        <div className="flex justify-between border-b pb-2">
          <span className="font-medium">Quyền microphone:</span>
          <span
            className={`${
              micPermission === null
                ? "text-gray-500"
                : micPermission
                  ? "text-green-600"
                  : "text-red-600"
            } font-bold`}>
            {micPermission === null
              ? "Chưa kiểm tra"
              : micPermission
                ? "Được phép"
                : "Bị từ chối"}
          </span>
        </div>

        {testResult && (
          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">Kết quả test:</span>
            <span className="text-blue-600">{testResult}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-800 rounded mb-4">{error}</div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={handleLoadSDK}
          disabled={sdkLoaded || loading}
          className={`px-4 py-2 rounded ${
            sdkLoaded
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}>
          {loading ? "Đang tải..." : "Tải SDK"}
        </button>

        <button
          onClick={checkPermissions}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded">
          Kiểm tra quyền
        </button>

        <button
          onClick={testCreateStream}
          disabled={!sdkLoaded || loading}
          className={`px-4 py-2 rounded ${
            !sdkLoaded || loading
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-purple-600 hover:bg-purple-700 text-white"
          }`}>
          {loading ? "Đang xử lý..." : "Tạo stream"}
        </button>

        <button
          onClick={testPublishStream}
          disabled={!sdkLoaded || !stream || loading}
          className={`px-4 py-2 rounded ${
            !sdkLoaded || !stream || loading
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-orange-600 hover:bg-orange-700 text-white"
          }`}>
          {loading ? "Đang xử lý..." : "Phát stream"}
        </button>
      </div>

      <div className="text-sm text-gray-600 mt-4">
        <p>
          * Chức năng debug này giúp kiểm tra trạng thái của Zego SDK và các
          quyền cần thiết cho cuộc gọi.
        </p>
      </div>
    </div>
  );
};

export default ZegoDebug;
