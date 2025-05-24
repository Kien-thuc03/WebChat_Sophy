import { ZegoExpressEngine as ZegoExpressEngineBase } from "zego-express-engine-webrtc";
import socketService from "./socketService";

// Định nghĩa interface cho ZegoToken
export interface ZegoTokenResponse {
  token: string;
  appID: string | number;
  userId: string;
  effectiveTimeInSeconds: number;
  error?: string;
}

// Interface cho sự kiện stream
export interface ZegoStreamInfo {
  streamID: string;
  userID: string;
  userName?: string;
  extraInfo?: string;
}

// Define types for event data
export interface ZegoUserUpdateData {
  userID: string;
  userName?: string;
  [key: string]: unknown;
}

export interface ZegoStreamUpdateData {
  streamID: string;
  user?: { userID: string; userName?: string };
  [key: string]: unknown;
}

export interface ZegoStateUpdateData {
  state: string;
  errorCode?: number;
  [key: string]: unknown;
}

export interface ZegoDeviceUpdateData {
  userID: string;
  status: string;
  [key: string]: unknown;
}

// Định nghĩa interface cho ZegoEventHandlers đầy đủ
export interface ZegoEventHandlers {
  onRoomStateUpdate?: (state: string, errorCode?: number) => void;
  onUserUpdate?: (
    updateType: "ADD" | "DELETE",
    userList: ZegoUserUpdateData[]
  ) => void;
  onStreamUpdate?: (
    updateType: "ADD" | "DELETE",
    streamList: ZegoStreamUpdateData[]
  ) => void;
  onPublisherStateUpdate?: (state: ZegoStateUpdateData) => void;
  onPlayerStateUpdate?: (state: ZegoStateUpdateData) => void;
  onNetworkQuality?: (quality: unknown) => void;
  onRemoteCameraStateUpdate?: (info: ZegoDeviceUpdateData) => void;
  onRemoteMicStateUpdate?: (info: ZegoDeviceUpdateData) => void;
  onMicStatusChanged?: (enabled: boolean) => void;
  onCameraStatusChanged?: (enabled: boolean) => void;
}

// Định nghĩa interface cho App State
export interface AppState {
  token: string;
  roomID: string;
  appID: number;
  userID: string;
  userName: string;
}

// Định nghĩa interface cho Stream Info
export interface StreamInfo {
  streamID: string;
  userID: string;
  userName?: string;
  streamRef?: HTMLMediaElement | null;
}

// Interface cho các thông tin cần thiết để khởi tạo ZEGO room
export interface ZegoRoomConfig {
  appID: number;
  server: string;
  userID: string;
  userName: string;
  token: string;
  roomID: string;
  video?: boolean;
  audio?: boolean;
}

// Extended interface to add missing methods from the SDK
interface ZegoExpressEngine extends ZegoExpressEngineBase {
  createEngine?: (config: { appID: number; server: string }) => Promise<void>;
  setPlayVolume?: (streamID: string, volume: number) => Promise<void>;
  // Add any other missing methods here
}

// Using more flexible type definitions for SDK callbacks
// Note: This interface is used internally by the SDK for type casting
interface ZegoUser {
  userID: string;
  userName?: string;
  [key: string]: unknown; // Use unknown instead of any
}

class ZegoService {
  private zg: ZegoExpressEngine | null = null;
  private appID: number | null = null;
  private server: string | null = null;
  private roomID: string | null = null;
  private userID: string | null = null;
  private userName: string | null = null;
  private token: string | null = null;
  private localStream: MediaStream | null = null;
  private publishStreamID: string | null = null;
  private isLoggedInRoom: boolean = false;
  private micEnabled: boolean = true;
  private cameraEnabled: boolean = false;
  private eventHandlers: ZegoEventHandlers = {};
  private remoteStreams: Map<string, MediaStream> = new Map();
  private lastTokenRequestId: number = 0;
  private activeRooms: Set<string> = new Set();
  private roomState: string = "DISCONNECTED"; // DISCONNECTED, CONNECTING, CONNECTED
  private publishingState: boolean = false;
  private sdkLoadingPromise: Promise<boolean> | null = null;
  private maxSDKLoadRetries = 5;
  private currentSDKLoadRetry = 0;
  private hasRegisteredSDKLoadedListener = false; // Add flag to track listener registration

  constructor() {
    // Khởi tạo ZegoService singleton
    if (typeof window !== "undefined") {
      // Khởi tạo mảng theo dõi audio elements
      window.callAudioElements = window.callAudioElements || [];
    }

    // Lắng nghe sự kiện khi SDK được tải từ index.html
    if (typeof window !== "undefined" && !this.hasRegisteredSDKLoadedListener) {
      window.addEventListener("zegoSDKLoaded", this.handleSDKLoaded.bind(this));
      this.hasRegisteredSDKLoadedListener = true;
    }
  }

  private handleSDKLoaded() {
    console.log("ZegoService: Đã nhận sự kiện SDK được tải thành công");
    // Thử khởi tạo Zego nếu đang chờ
    this.initializeSDK();
  }

  // Đảm bảo SDK được tải và trả về Promise
  private async ensureSDKLoaded(): Promise<boolean> {
    if (this.zg) return true; // Đã có instance

    // Nếu đã có promise đang chờ, trả về promise đó
    if (this.sdkLoadingPromise) return this.sdkLoadingPromise;

    // Tạo promise mới nếu chưa có
    this.sdkLoadingPromise = new Promise<boolean>((resolve, reject) => {
      if (typeof window !== "undefined" && window.ZegoExpressEngine) {
        // SDK đã được tải, khởi tạo
        this.initializeSDK();
        resolve(true);
        return;
      }

      // SDK chưa được tải
      if (this.currentSDKLoadRetry >= this.maxSDKLoadRetries) {
        console.error(
          `ZegoService: Đã thử tải SDK ${this.maxSDKLoadRetries} lần nhưng không thành công`
        );
        reject(
          new Error(`Không thể tải SDK sau ${this.maxSDKLoadRetries} lần thử`)
        );
        return;
      }

      this.currentSDKLoadRetry++;
      console.log(
        `ZegoService: Đang thử tải SDK lần ${this.currentSDKLoadRetry}`
      );

      // Sử dụng SDK từ index.html
      if (typeof window !== "undefined") {
        // Hàm xử lý sự kiện khi SDK được tải
        const handleLoadEvent = () => {
          if (window.ZegoExpressEngine) {
            window.removeEventListener("zegoSDKLoaded", handleLoadEvent);
            this.initializeSDK();
            resolve(true);
          } else {
            console.warn(
              "ZegoService: Sự kiện zegoSDKLoaded được kích hoạt nhưng SDK không tồn tại"
            );
            reject(new Error("SDK không tồn tại sau khi tải"));
          }
        };

        // Đăng ký lắng nghe sự kiện SDK được tải - chỉ khi chưa đăng ký trước đó
        window.removeEventListener("zegoSDKLoaded", handleLoadEvent); // Xóa listener cũ nếu có
        window.addEventListener("zegoSDKLoaded", handleLoadEvent, { once: true }); // Sử dụng once: true để tự động xóa sau khi xử lý

        // Tải SDK nếu có hàm loadZegoSDK
        if (window.loadZegoSDK) {
          window.loadZegoSDK();

          // Đặt timeout để tránh chờ vô hạn
          setTimeout(() => {
            if (!window.ZegoExpressEngine) {
              window.removeEventListener("zegoSDKLoaded", handleLoadEvent);
              console.warn("ZegoService: Timeout khi đợi SDK tải");
              resolve(false); // Không reject để code vẫn tiếp tục
            }
          }, 10000);
        } else {
          console.error("ZegoService: Không tìm thấy phương thức loadZegoSDK");
          reject(new Error("loadZegoSDK không khả dụng"));
        }
      } else {
        reject(new Error("window không khả dụng (môi trường non-browser)"));
      }
    });

    return this.sdkLoadingPromise;
  }

  // Khởi tạo SDK khi nó đã được tải
  private initializeSDK(): boolean {
    try {
      if (typeof window !== "undefined" && window.ZegoExpressEngine) {
        // Sử dụng instance đã có nếu tồn tại
        if (!this.zg) {
          console.log("ZegoService: Khởi tạo ZegoExpressEngine");
          // Fix: Pass required appID and server arguments
          const appID = 1; // Default placeholder value
          const server = "wss://webliveroom-alpha.zego.im/ws"; // Default server
          this.zg = new window.ZegoExpressEngine(appID, server);
          console.log("ZegoService: Khởi tạo ZegoExpressEngine thành công");
        } else {
          console.log(
            "ZegoService: ZegoExpressEngine đã được khởi tạo trước đó"
          );
        }
        return true;
      } else {
        console.warn("ZegoService: ZegoExpressEngine chưa sẵn sàng");

        // Nếu có hàm initializeZegoEngine từ index.html mới thì sử dụng
        if (typeof window !== "undefined" && window.loadZegoSDK && !this.hasRegisteredSDKLoadedListener) {
          console.log("ZegoService: Đang yêu cầu tải SDK từ local...");
          window.loadZegoSDK();

          // Do NOT register event listener again here - we already have it in the constructor
          // This was causing infinite event listener registration loop
        }

        return false;
      }
    } catch (error) {
      console.error("ZegoService: Lỗi khi khởi tạo ZegoExpressEngine", error);
      return false;
    }
  }

  // Dọn dẹp trước khi bắt đầu cuộc gọi mới
  cleanupBeforeCall() {
    console.log("ZegoService: Dọn dẹp trước khi bắt đầu cuộc gọi mới");

    // Hủy mọi kết nối trước đó
    if (this.zg) {
      try {
        // Dừng phát stream nếu đang phát
        this.stopPublishingStream();

        // Đóng tất cả streams
        if (this.localStream) {
          try {
            const tracks = this.localStream.getTracks();
            tracks.forEach((track) => track.stop());
            this.localStream = null;
          } catch (e) {
            console.warn("Không thể hủy localStream:", e);
          }
        }

        // Thoát phòng nếu đang trong phòng
        if (this.roomState === "CONNECTED" && this.roomID) {
          try {
            this.zg.logoutRoom(this.roomID);
          } catch (e) {
            console.warn("Không thể đăng xuất khỏi phòng:", e);
          }
          this.roomState = "DISCONNECTED";
          this.roomID = "";
        }
      } catch (error) {
        console.error("ZegoService: Lỗi khi dọn dẹp:", error);
      }
    }

    // Dừng tất cả audio đang phát
    this.stopAllCallAudios();

    // Reset các trạng thái
    this.token = null;
    this.remoteStreams.clear();
  }

  // Khởi tạo Zego SDK và đăng nhập vào phòng
  async initialize(
    config: ZegoRoomConfig,
    eventHandlers?: ZegoEventHandlers
  ): Promise<boolean> {
    try {
      console.log("ZegoService: Bắt đầu khởi tạo với config:", {
        appID: config.appID,
        roomID: config.roomID,
        userID: config.userID,
        hasToken: !!config.token,
      });

      // Lưu các handlers
      this.eventHandlers = eventHandlers || {};

      // Đảm bảo SDK đã được tải
      const sdkLoaded = await this.ensureSDKLoaded();
      if (!sdkLoaded) {
        throw new Error("Không thể tải Zego SDK");
      }

      // Kiểm tra xem trình duyệt có hỗ trợ WebRTC không
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        console.error("ZegoService: Trình duyệt không hỗ trợ WebRTC");
        throw new Error("Trình duyệt không hỗ trợ WebRTC");
      }

      // Kiểm tra các tham số bắt buộc
      if (!config.appID || !config.token || !config.roomID || !config.userID) {
        console.error("ZegoService: Thiếu tham số cần thiết", {
          hasAppID: !!config.appID,
          hasToken: !!config.token,
          hasRoomID: !!config.roomID,
          hasUserID: !!config.userID,
        });
        throw new Error("Thiếu các tham số kết nối cần thiết");
      }

      // Lưu trữ các tham số
      this.appID = Number(config.appID);
      this.server = config.server;
      this.roomID = config.roomID;
      this.userID = config.userID;
      this.token = config.token;
      this.micEnabled = config.audio !== false;
      this.cameraEnabled = !!config.video;

      if (!this.zg) {
        throw new Error("ZegoExpressEngine chưa được khởi tạo");
      }

      // Khởi tạo Zego với server ưu tiên: config > window.ZEGO_SERVER > default
      const serverUrl =
        this.server ||
        (typeof window !== "undefined" && window.ZEGO_SERVER) ||
        "wss://webliveroom-alpha.zego.im/ws"; // Default server

      // Khởi tạo Zego
      try {
        if (this.zg && typeof this.zg.createEngine === "function") {
          await this.zg.createEngine({
            appID: this.appID,
            server: serverUrl,
          });
        } else {
          console.warn(
            "ZegoService: createEngine không khả dụng, sử dụng instance hiện tại."
          );
        }
      } catch (error) {
        console.warn("ZegoService: Lỗi khi gọi createEngine:", error);
        console.log("ZegoService: Tiếp tục với instance hiện tại");
      }

      // Thiết lập sự kiện callback
      this.setupEventHandlers();

      // Đăng nhập vào phòng
      try {
        await this.zg.loginRoom(
          this.roomID,
          this.token,
          {
            userID: this.userID,
            userName: config.userName,
          },
          { userUpdate: true }
        );

        console.log("ZegoService: Đăng nhập vào phòng thành công");
        this.roomState = "CONNECTED";

        // Nếu có yêu cầu tự động tạo stream
        if (config.video !== undefined || config.audio !== undefined) {
          await this.createStream(config.video, config.audio);
          await this.publishStream();
        }

        return true;
      } catch (loginError) {
        console.error("ZegoService: Lỗi đăng nhập vào phòng", loginError);
        throw new Error(
          `Lỗi đăng nhập: ${loginError instanceof Error ? loginError.message : String(loginError)}`
        );
      }
    } catch (error) {
      console.error("ZegoService: Lỗi khởi tạo Zego", error);
      throw error;
    }
  }

  // Thiết lập các sự kiện callback
  private setupEventHandlers(): void {
    if (!this.zg) return;

    // Room state update
    this.zg.on("roomStateUpdate", (roomID, state, errorCode) => {
      console.log(
        `ZegoService: Room state update - room: ${roomID}, state: ${state}, code: ${errorCode}`
      );
      this.roomState = state;
      if (this.eventHandlers?.onRoomStateUpdate) {
        this.eventHandlers.onRoomStateUpdate(state, errorCode);
      }
    });

    // User update with proper casting
    this.zg.on("roomUserUpdate", (roomID, updateType, userList) => {
      console.log(
        `ZegoService: User update - ${updateType}, count: ${userList.length}, users: ${JSON.stringify(userList)}`
      );

      if (this.eventHandlers?.onUserUpdate) {
        // Cast to the expected type
        const typedUserList = userList as unknown as ZegoUserUpdateData[];
        this.eventHandlers.onUserUpdate(
          updateType as "ADD" | "DELETE",
          typedUserList
        );
      }
    });

    // Stream update with proper casting
    this.zg.on("roomStreamUpdate", (roomID, updateType, streamList) => {
      console.log(
        `ZegoService: Stream update - ${updateType}, count: ${streamList.length}, streams: ${JSON.stringify(streamList)}`
      );

      // Xử lý streams từ người dùng khác
      if (updateType === "ADD") {
        console.log(
          "ZegoService: Processing remote stream ADD event:",
          streamList
        );
        streamList.forEach((stream) => {
          if (
            stream.streamID &&
            (!stream.user ||
              (stream.user && stream.user.userID !== this.userID))
          ) {
            console.log(
              `ZegoService: Playing remote stream ${stream.streamID} from user ${stream.user?.userID || "unknown"}`
            );
            // Wait a short time before playing to ensure the stream is ready
            setTimeout(() => {
              this.playStream(stream.streamID).then((remoteStream) => {
                if (remoteStream) {
                  console.log(
                    `ZegoService: Successfully started playing remote stream ${stream.streamID}`
                  );
                } else {
                  console.error(
                    `ZegoService: Failed to play remote stream ${stream.streamID}`
                  );
                }
              });
            }, 500); // Give some time for the stream to be ready
          } else {
            console.log(`ZegoService: Ignoring own stream ${stream.streamID}`);
          }
        });
      } else if (updateType === "DELETE") {
        console.log(
          "ZegoService: Processing remote stream DELETE event:",
          streamList
        );
        streamList.forEach((stream) => {
          if (stream.streamID) {
            console.log(
              `ZegoService: Stopping remote stream ${stream.streamID}`
            );
            this.remoteStreams.delete(stream.streamID);
            this.stopPlayingStream(stream.streamID);
          }
        });
      }

      // Gọi callback nếu có
      if (this.eventHandlers?.onStreamUpdate) {
        // Cast to the expected type
        const typedStreamList = streamList as unknown as ZegoStreamUpdateData[];
        this.eventHandlers.onStreamUpdate(
          updateType as "ADD" | "DELETE",
          typedStreamList
        );
      }
    });

    // Publisher state update
    this.zg.on("publisherStateUpdate", (state) => {
      console.log(`ZegoService: Publisher state update: ${state.state}`);

      if (state.state === "PUBLISHING") {
        this.publishingState = true;
      } else if (state.state === "NO_PUBLISH") {
        this.publishingState = false;
      }

      if (this.eventHandlers?.onPublisherStateUpdate) {
        // Cast to the expected type
        const typedState = state as unknown as ZegoStateUpdateData;
        this.eventHandlers.onPublisherStateUpdate(typedState);
      }
    });

    // Player state update
    this.zg.on("playerStateUpdate", (state) => {
      console.log(`ZegoService: Player state update: ${state.state}`);
      if (this.eventHandlers?.onPlayerStateUpdate) {
        // Cast to the expected type
        const typedState = state as unknown as ZegoStateUpdateData;
        this.eventHandlers.onPlayerStateUpdate(typedState);
      }
    });

    // Network quality
    this.zg.on("networkQuality", (quality) => {
      if (this.eventHandlers?.onNetworkQuality) {
        this.eventHandlers.onNetworkQuality(quality);
      }
    });

    // Camera state update - handle type mismatch safely
    this.zg.on("remoteCameraStatusUpdate", (streamID, status) => {
      // Convert to compatible format for our interface
      const info: ZegoDeviceUpdateData = {
        userID: streamID,
        status: status || "unknown",
      };

      console.log(
        `ZegoService: Remote camera status update: ${info.status} for ${streamID}`
      );
      if (this.eventHandlers?.onRemoteCameraStateUpdate) {
        this.eventHandlers.onRemoteCameraStateUpdate(info);
      }
    });

    // Microphone state update - handle type mismatch safely
    this.zg.on("remoteMicStatusUpdate", (streamID, status) => {
      // Convert to compatible format for our interface
      const info: ZegoDeviceUpdateData = {
        userID: streamID,
        status: status || "unknown",
      };

      console.log(
        `ZegoService: Remote mic status update: ${info.status} for ${streamID}`
      );
      if (this.eventHandlers?.onRemoteMicStateUpdate) {
        this.eventHandlers.onRemoteMicStateUpdate(info);
      }
    });
  }

  // Tạo và lấy stream từ thiết bị của user (camera/mic)
  async createStream(
    video: boolean = false,
    audio: boolean = true
  ): Promise<MediaStream | null> {
    if (!this.zg) {
      console.error("ZegoService: Chưa khởi tạo Zego SDK");
      return null;
    }

    try {
      console.log(
        "ZegoService: Đang tạo stream với video:",
        video,
        "audio:",
        audio
      );

      // Tạo stream với cấu hình đã thiết lập
      const stream = await this.zg.createStream({
        camera: {
          video,
          audio,
          videoQuality: 2, // 1-Fluent, 2-Standard, 3-HD
        },
      });

      console.log("ZegoService: Đã tạo stream thành công");
      this.localStream = stream;
      this.micEnabled = audio;
      this.cameraEnabled = video;

      // Gọi callbacks nếu có
      if (this.eventHandlers?.onMicStatusChanged) {
        this.eventHandlers.onMicStatusChanged(audio);
      }

      if (this.eventHandlers?.onCameraStatusChanged) {
        this.eventHandlers.onCameraStatusChanged(video);
      }

      return stream;
    } catch (error) {
      console.error("ZegoService: Lỗi khi tạo stream", error);

      if (error instanceof Error && error.name === "NotAllowedError") {
        throw new Error(
          "Không được cấp quyền truy cập camera/microphone. Vui lòng cấp quyền và thử lại."
        );
      }

      throw error;
    }
  }

  // Phát stream lên server
  async publishStream(customStreamID?: string): Promise<boolean> {
    if (!this.zg || !this.localStream) {
      console.error("ZegoService: Chưa khởi tạo Zego SDK hoặc chưa có stream");
      return false;
    }

    try {
      const streamID =
        customStreamID || `${this.roomID}_${this.userID}_${Date.now()}`;
      console.log(`ZegoService: Đang phát stream với ID: ${streamID}`);

      await this.zg.startPublishingStream(streamID, this.localStream);
      console.log("ZegoService: Đã bắt đầu phát stream");

      this.publishStreamID = streamID; // Save the stream ID
      this.publishingState = true;
      return true;
    } catch (error) {
      console.error("ZegoService: Lỗi khi phát stream", error);
      this.publishingState = false;
      return false;
    }
  }

  // Alias for publishStream to maintain compatibility with components that call startPublishingStream
  async startPublishingStream(customStreamID?: string): Promise<boolean> {
    console.log("ZegoService: startPublishingStream alias called");
    return this.publishStream(customStreamID);
  }

  // Dừng phát stream
  async stopPublishingStream(): Promise<void> {
    if (!this.zg || !this.publishingState) return;

    try {
      if (this.publishStreamID) {
        this.zg.stopPublishingStream(this.publishStreamID);
        console.log(`ZegoService: Đã dừng phát stream ${this.publishStreamID}`);
      } else {
        // Handle case where publishStreamID is null but still need to stop publishing
        try {
          // @ts-expect-error - Ignore the parameter requirement for backward compatibility
          this.zg.stopPublishingStream();
        } catch (e) {
          console.warn("ZegoService: Lỗi khi dừng stream không có ID:", e);
        }
      }
      this.publishingState = false;
      this.publishStreamID = null;
    } catch (error) {
      console.error("ZegoService: Lỗi khi dừng phát stream", error);
    }
  }

  // Play stream từ người dùng khác
  async playStream(streamID: string): Promise<MediaStream | null> {
    if (!this.zg) {
      console.error("ZegoService: Chưa khởi tạo Zego SDK");
      return null;
    }

    try {
      console.log(`ZegoService: Đang play stream với ID: ${streamID}`);
      const remoteStream = await this.zg.startPlayingStream(streamID);

      if (remoteStream) {
        this.remoteStreams.set(streamID, remoteStream);
        console.log(`ZegoService: Đã play stream ${streamID} thành công`);

        // Emit a custom event to notify that a remote stream is ready to be attached
        if (typeof window !== "undefined") {
          const event = new CustomEvent("zegoRemoteStreamReady", {
            detail: { streamID, stream: remoteStream },
          });
          window.dispatchEvent(event);
        }

        return remoteStream;
      }

      console.warn(`ZegoService: Không nhận được stream từ ${streamID}`);
      return null;
    } catch (error) {
      console.error(`ZegoService: Lỗi khi play stream ${streamID}`, error);
      return null;
    }
  }

  // Alias for playStream to maintain compatibility with components expecting startPlayingStream
  async startPlayingStream(streamID: string): Promise<MediaStream | null> {
    console.log("ZegoService: startPlayingStream alias called");
    return this.playStream(streamID);
  }

  // Dừng play stream
  stopPlayingStream(streamID: string): void {
    if (!this.zg) return;

    try {
      this.zg.stopPlayingStream(streamID);
      this.remoteStreams.delete(streamID);
      console.log(`ZegoService: Đã dừng play stream ${streamID}`);
    } catch (error) {
      console.error(`ZegoService: Lỗi khi dừng play stream ${streamID}`, error);
    }
  }

  // Thoát khỏi phòng và dọn dẹp tài nguyên
  async leaveRoom(): Promise<void> {
    if (!this.zg) return;

    try {
      // Dừng tất cả các stream
      this.stopPublishingStream();

      // Dừng tất cả các remote stream
      for (const streamID of this.remoteStreams.keys()) {
        this.stopPlayingStream(streamID);
      }

      // Dừng và giải phóng local stream
      if (this.localStream) {
        const tracks = this.localStream.getTracks();
        tracks.forEach((track) => {
          track.stop();
        });
        this.localStream = null;
      }

      // Thoát khỏi phòng
      if (this.roomID) {
        await this.zg.logoutRoom(this.roomID);
        console.log(`ZegoService: Đã thoát khỏi phòng ${this.roomID}`);
      }

      this.roomState = "DISCONNECTED";
    } catch (error) {
      console.error("ZegoService: Lỗi khi thoát khỏi phòng", error);
    }
  }

  // Bật/tắt micro
  async toggleMicrophone(): Promise<boolean | undefined> {
    if (!this.zg || !this.localStream) return undefined;

    try {
      const audioTracks = this.localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        const enabled = !audioTracks[0].enabled;
        audioTracks[0].enabled = enabled;
        console.log(`ZegoService: Đã ${enabled ? "bật" : "tắt"} microphone`);
        return enabled;
      }
      return undefined;
    } catch (error) {
      console.error("ZegoService: Lỗi khi toggle microphone", error);
      return undefined;
    }
  }

  // Bật/tắt camera
  async toggleCamera(): Promise<boolean | undefined> {
    if (!this.zg || !this.localStream) return undefined;

    try {
      const videoTracks = this.localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        const enabled = !videoTracks[0].enabled;
        videoTracks[0].enabled = enabled;
        console.log(`ZegoService: Đã ${enabled ? "bật" : "tắt"} camera`);
        return enabled;
      }
      return undefined;
    } catch (error) {
      console.error("ZegoService: Lỗi khi toggle camera", error);
      return undefined;
    }
  }

  // Thiết lập volume của stream đầu ra
  async setPlayVolume(streamID: string, volume: number): Promise<void> {
    if (!this.zg) return;

    try {
      // Use alternative API or safe access pattern for incompatible types
      const zg = this.zg as unknown as {
        setPlayVolume?: (streamID: string, volume: number) => Promise<void>;
      };
      if (typeof zg.setPlayVolume === "function") {
        await zg.setPlayVolume(streamID, volume);
        console.log(
          `ZegoService: Đã thiết lập volume cho stream ${streamID}: ${volume}`
        );
      } else {
        console.warn("ZegoService: Phương thức setPlayVolume không khả dụng");
      }
    } catch (error) {
      console.error(
        `ZegoService: Lỗi khi thiết lập volume cho stream ${streamID}`,
        error
      );
    }
  }

  // Kiểm tra trạng thái kết nối phòng
  isRoomConnected(): boolean {
    return this.roomState === "CONNECTED";
  }

  // Kiểm tra trạng thái phát stream - sửa tên hàm để tránh trùng lặp
  getPublishingState(): boolean {
    return this.publishingState;
  }

  // Cung cấp đồng thời hàm cũ để tương thích với code hiện tại
  isPublishing(): boolean {
    return this.getPublishingState();
  }

  // Kiểm tra quyền truy cập media
  async checkMediaPermissions(): Promise<{
    camera: boolean;
    microphone: boolean;
  }> {
    try {
      let camera = false;
      let microphone = false;

      try {
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
          "ZegoService: Đã kiểm tra quyền truy cập media - camera:",
          camera,
          "microphone:",
          microphone
        );
      } catch (error) {
        console.warn("ZegoService: Không được cấp quyền truy cập media", error);
      }

      return { camera, microphone };
    } catch (error) {
      console.error(
        "ZegoService: Lỗi khi kiểm tra quyền truy cập media",
        error
      );
      return { camera: false, microphone: false };
    }
  }

  // Reset toàn bộ kết nối
  async reset(): Promise<void> {
    console.log("ZegoService: Reset toàn bộ kết nối");

    // Dọn dẹp trước khi reset
    await this.leaveRoom();

    // Reset các biến trạng thái
    this.zg = null;
    this.localStream = null;
    this.remoteStreams.clear();
    this.roomState = "DISCONNECTED";
    this.publishingState = false;
    this.appID = 0;
    this.roomID = "";
    this.userID = "";
    this.token = "";
    this.eventHandlers = {};
    this.sdkLoadingPromise = null;
    this.currentSDKLoadRetry = 0;

    // Thử khởi tạo lại SDK nếu có sẵn
    if (typeof window !== "undefined" && window.ZegoExpressEngine) {
      this.initializeSDK();
    }
  }

  // Xử lý cuộc gọi đến
  async handleIncomingCall(
    roomID: string,
    callerID: string,
    callerName: string
  ): Promise<void> {
    console.log(
      `ZegoService: Xử lý cuộc gọi đến từ ${callerName} (${callerID}) trong phòng ${roomID}`
    );

    // TODO: Hiện UI thông báo cuộc gọi đến
    // Việc này nên được xử lý bởi component gọi hàm này
  }

  // Phương thức để gọi
  async makeCall(
    targetUserID: string,
    video: boolean = false,
    audio: boolean = true
  ): Promise<string> {
    // Tạo room ID cho cuộc gọi
    const roomID = `call_${targetUserID}_${this.userID}`;
    console.log(
      `ZegoService: Đang thực hiện cuộc gọi đến ${targetUserID} với roomID: ${roomID}`
    );

    // Lưu thông tin cuộc gọi vào local storage để có thể phục hồi nếu bị mất kết nối
    localStorage.setItem(
      "lastCallInfo",
      JSON.stringify({
        roomID,
        targetUserID,
        timestamp: Date.now(),
        video,
        audio,
      })
    );

    return roomID;
  }

  // Phương thức để yêu cầu token từ server
  async requestToken(
    roomID: string,
    userID: string
  ): Promise<ZegoTokenResponse> {
    console.log("ZegoService: Đã gửi yêu cầu cuộc gọi, đang yêu cầu token...");

    // Tham số để yêu cầu token
    const params = {
      roomID,
      userID,
      effectiveTimeInSeconds: 3600 * 24, // 24 giờ
    };

    console.log("ZegoService: Yêu cầu token với params:", params);

    // Yêu cầu token từ server qua socket
    try {
      return await socketService.requestZegoToken(params);
    } catch (error) {
      console.error("ZegoService: Lỗi khi yêu cầu token:", error);
      throw new Error(
        "Không thể lấy token: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }

  // Tắt audio của cuộc gọi
  stopAllCallAudios() {
    try {
      if (typeof window !== "undefined") {
        if (window.incomingCallAudio) {
          window.incomingCallAudio.pause();
          window.incomingCallAudio.currentTime = 0;
        }

        if (
          window.callAudioElements &&
          Array.isArray(window.callAudioElements)
        ) {
          window.callAudioElements.forEach((audio) => {
            if (audio && typeof audio.pause === "function") {
              audio.pause();
              audio.currentTime = 0;
            }
          });
          window.callAudioElements = [];
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      // Ignore errors when stopping audios
    }
  }

  isInitialized(): boolean {
    return !!this.zg;
  }

  // Thêm phương thức giữ tương thích với code cũ
  setupIncomingCallListener(
    callback: (data: {
      roomID: string;
      callerId: string;
      callerName: string;
      isVideo: boolean;
    }) => void
  ): void {
    console.log("ZegoService: Thiết lập lắng nghe cuộc gọi đến");
    socketService.onIncomingCall(callback);
  }

  // Hủy lắng nghe cuộc gọi đến
  removeIncomingCallListener(
    callback?: (data: {
      roomID: string;
      callerId: string;
      callerName: string;
      isVideo: boolean;
    }) => void
  ): void {
    if (callback) {
      socketService.off("incomingCall", callback);
    } else {
      socketService.off("incomingCall");
    }
  }

  // Từ chối cuộc gọi
  async rejectCall(
    roomID: string,
    callerId: string,
    receiverId: string
  ): Promise<void> {
    console.log("ZegoService: Từ chối cuộc gọi:", {
      roomID,
      callerId,
      receiverId,
    });

    socketService.socketInstance?.emit("rejectCall", {
      roomID,
      callerId,
      receiverId,
    });
  }

  // Chấp nhận cuộc gọi
  async acceptCall(params: {
    roomID: string;
    callerId: string;
    receiverId: string;
  }): Promise<ZegoTokenResponse> {
    console.log("ZegoService: Chấp nhận cuộc gọi:", params);

    // Dừng phát nhạc chuông cuộc gọi đến
    this.stopAllCallAudios();

    // Thông báo cho người gọi là đã chấp nhận cuộc gọi
    console.log(
      "ZegoService: Đã gửi thông báo chấp nhận, đang yêu cầu token..."
    );

    // Use the new sendAcceptCall method instead of directly emitting the event
    await socketService.sendAcceptCall(params);

    // Yêu cầu token để tham gia phòng
    return await this.requestToken(params.roomID, params.receiverId);
  }

  // Lấy token và bắt đầu cuộc gọi
  async startCall(params: {
    roomID: string;
    receiverId: string;
    callerId: string;
    callerName: string;
    isVideo: boolean;
  }): Promise<ZegoTokenResponse> {
    try {
      // Dọn dẹp trước khi bắt đầu cuộc gọi mới
      this.cleanupBeforeCall();

      console.log("ZegoService: Bắt đầu cuộc gọi mới với thông số:", {
        room: params.roomID,
        caller: params.callerId,
        receiver: params.receiverId,
        isVideo: params.isVideo,
      });

      // Lưu thông tin cuộc gọi vào localStorage để hỗ trợ refresh token
      try {
        localStorage.setItem(
          "lastCallInfo",
          JSON.stringify({
            roomID: params.roomID,
            callerId: params.callerId,
            receiverId: params.receiverId,
            timestamp: Date.now(),
          })
        );
      } catch (e) {
        console.warn(
          "ZegoService: Không thể lưu thông tin cuộc gọi vào localStorage",
          e
        );
      }

      // Gửi yêu cầu cuộc gọi đến người nhận
      await socketService.sendCallRequest({
        receiverId: params.receiverId,
        callerId: params.callerId,
        callerName: params.callerName,
        roomID: params.roomID,
        isVideo: params.isVideo,
      });

      console.log(
        "ZegoService: Đã gửi yêu cầu cuộc gọi, đang yêu cầu token..."
      );

      // Yêu cầu token từ server
      return await this.requestToken(params.roomID, params.callerId);
    } catch (error) {
      console.error("ZegoService: Lỗi khi bắt đầu cuộc gọi:", error);
      throw error;
    }
  }

  // Reset toàn bộ kết nối
  resetAllConnections() {
    console.log("ZegoService: Reset toàn bộ kết nối");
    this.cleanupBeforeCall();
    this.reset();
  }

  // This is the endCall method called by ChatHeader.tsx when ending a call
  async endCall(roomID?: string): Promise<void> {
    console.log("ZegoService: Ending call for room:", roomID || this.roomID);

    // Stop publishing stream
    await this.stopPublishingStream();

    // Stop all remote streams
    for (const streamID of this.remoteStreams.keys()) {
      this.stopPlayingStream(streamID);
    }

    // Clean up local stream
    if (this.localStream) {
      const tracks = this.localStream.getTracks();
      tracks.forEach((track) => track.stop());
      this.localStream = null;
    }

    // Logout from room
    if (this.roomID || roomID) {
      const targetRoomID = roomID || this.roomID;
      if (this.zg && targetRoomID) {
        await this.zg.logoutRoom(targetRoomID);
        console.log(`ZegoService: Left room ${targetRoomID}`);
      }
    }

    // Emit socket event to notify other user
    if (roomID) {
      socketService.socketInstance?.emit("endCall", { roomID });
    }

    // Reset room state
    this.roomID = null;
    this.roomState = "DISCONNECTED";

    // Stop all audio playing
    this.stopAllCallAudios();

    console.log("ZegoService: Call ended");
  }

  // This is the destroy method called by ZegoVideoCallWithService.tsx
  destroy(): void {
    console.log("ZegoService: Destroy called");
    this.reset();
  }
}

// Define the extended Window interface
declare global {
  interface Window {
    ZegoExpressEngine?: typeof ZegoExpressEngineBase;
    incomingCallAudio?: HTMLAudioElement;
    callAudioElements: HTMLAudioElement[];
    loadZegoSDK?: () => void;
    initializeZegoEngine?: () => boolean | null;
    zegoSDKLoaded?: boolean;
    zegoSDKLoading?: boolean;
    ZEGO_SERVER?: string;
  }
}

// Export singleton instance
export const zegoService = new ZegoService();
export default zegoService;
