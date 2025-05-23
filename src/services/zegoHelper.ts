import { v4 as uuidv4 } from "uuid";
import CryptoJS from "crypto-js";

// Thông tin ZEGO từ dashboard - sử dụng ZEGO AppID thật
export const ZEGO_APP_ID = 1206754025;
export const ZEGO_SERVER_SECRET = "79fd02b6cc05f2e44bfeea5af8629f2c";

// Cấu hình server ZEGO - sử dụng server Singapore cho khu vực Châu Á
export const ZEGO_SERVER = "wss://webliveroom-ap-singapore.zegocloud.com/ws";

// Cấu hình toàn cục cho ZEGO SDK
export const ZEGO_SDK_CONFIG = {
  useRealSDK: true, // Luôn sử dụng SDK thật, không sử dụng mock
  logLevel: "debug", // Thiết lập mức độ log: debug, info, warning, error, none
};

// Hàm tạo token ZEGO - dùng trong trường hợp server không trả về token
export const generateZegoToken = (
  userId: string,
  roomId: string = "",
  effectiveTimeInSeconds: number = 3600
): string => {
  try {
    // 1. Tạo nonce (số dùng một lần)
    const nonce = uuidv4().replace(/-/g, "");

    // 2. Tạo timestamp hiện tại tính bằng giây
    const timestamp = Math.floor(Date.now() / 1000);

    // 3. Tính toán thời gian hết hạn
    const expireTime = timestamp + effectiveTimeInSeconds;

    // 4. Tạo payload
    const payload = {
      app_id: ZEGO_APP_ID,
      user_id: userId,
      nonce,
      ctime: timestamp,
      expire: expireTime,
      room_id: roomId,
      privilege: {
        1: 1, // Truy cập phòng: 1 = Cho phép
        2: 1, // Đăng stream: 1 = Cho phép
      },
    };

    // 5. Chuyển payload thành JSON string
    const payloadString = JSON.stringify(payload);

    // 6. Mã hóa payload bằng base64
    const base64Payload = CryptoJS.enc.Base64.stringify(
      CryptoJS.enc.Utf8.parse(payloadString)
    );

    // 7. Tính toán signature sử dụng HMAC-SHA256
    const signature = CryptoJS.HmacSHA256(
      base64Payload,
      ZEGO_SERVER_SECRET
    ).toString();

    // 8. Tạo token với format: {signature}.{base64Payload}
    const token = `${signature}.${base64Payload}`;

    console.log("Đã tạo ZEGO token thành công với userId:", userId);
    return token;
  } catch (error) {
    console.error("Lỗi khi tạo ZEGO token:", error);
    throw new Error(
      "Không thể tạo ZEGO token: " +
        (error instanceof Error ? error.message : String(error))
    );
  }
};

// Kiểm tra quyền truy cập media
export const checkMediaPermissions = async (): Promise<{
  camera: boolean;
  microphone: boolean;
}> => {
  try {
    let camera = false;
    let microphone = false;

    try {
      // Yêu cầu quyền truy cập vào thiết bị
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Kiểm tra từng loại track
      stream.getTracks().forEach((track) => {
        if (track.kind === "video") camera = true;
        if (track.kind === "audio") microphone = true;
        track.stop(); // Đóng track sau khi kiểm tra
      });

      console.log(
        "Media permissions - camera:",
        camera,
        "microphone:",
        microphone
      );
    } catch (error) {
      console.warn("Không được cấp quyền truy cập media:", error);
    }

    return { camera, microphone };
  } catch (error) {
    console.error("Lỗi khi kiểm tra quyền truy cập media:", error);
    return { camera: false, microphone: false };
  }
};

// Cấu hình cho ZEGO từ người dùng
export const ZEGO_CONFIG = {
  turnOnMicrophoneWhenJoining: true,
  turnOnCameraWhenJoining: true,
  showMyCameraToggleButton: true,
  showMyMicrophoneToggleButton: true,
  showAudioVideoSettingsButton: true,
  showScreenSharingButton: true,
  showTextChat: true,
  showUserList: true,
  maxUsers: 2,
  layout: "Auto",
  showLayoutButton: false,
  scenario: {
    mode: "OneONoneCall",
    config: {
      role: "Host",
    },
  },
};

export default {
  generateZegoToken,
  checkMediaPermissions,
  ZEGO_CONFIG,
  ZEGO_APP_ID,
  ZEGO_SERVER,
  ZEGO_SDK_CONFIG,
};
