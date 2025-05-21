import { ZegoExpressEngine } from "zego-express-engine-webrtc";
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

// Interface cho các sự kiện callback
export interface ZegoEventHandlers {
  onRoomStateUpdate?: (state: string, errorCode: number) => void;
  onUserUpdate?: (updateType: string, userList: Array<unknown>) => void;
  onStreamUpdate?: (updateType: string, streamList: Array<unknown>) => void;
  onPublisherStateUpdate?: (result: unknown) => void;
  onPlayerStateUpdate?: (result: unknown) => void;
  onConnectionStateChanged?: (state: string) => void;
  onCallAccepted?: (data: {
    roomID: string;
    callerId: string;
    receiverId: string;
  }) => void;
  onCallRejected?: (data: {
    roomID: string;
    callerId: string;
    receiverId: string;
  }) => void;
  onCallEnded?: (roomID: string) => void;
  onMicStatusChanged?: (enabled: boolean) => void;
  onCameraStatusChanged?: (enabled: boolean) => void;
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
  private isPublishing: boolean = false;
  private isLoggedInRoom: boolean = false;
  private micEnabled: boolean = true;
  private cameraEnabled: boolean = false;
  private eventHandlers: ZegoEventHandlers = {};
  private remoteStreams: Map<string, MediaStream> = new Map();
  private lastTokenRequestId: number = 0;
  private activeRooms: Set<string> = new Set();

  constructor() {
    // Khởi tạo ZegoService singleton
    if (typeof window !== "undefined") {
      // Khởi tạo mảng theo dõi audio elements
      window.callAudioElements = window.callAudioElements || [];
    }
  }

  // Dọn dẹp trước khi bắt đầu cuộc gọi mới
  cleanupBeforeCall() {
    console.log("ZegoService: Dọn dẹp trước khi bắt đầu cuộc gọi mới");

    // Hủy mọi kết nối trước đó
    if (this.zg) {
      try {
        // Dừng phát stream nếu đang phát
        if (this.publishStreamID) {
          this.zg.stopPublishingStream(this.publishStreamID);
          this.publishStreamID = null;
          this.isPublishing = false;
        }

        // Đóng tất cả streams
        if (this.localStream) {
          try {
            this.zg.destroyStream(this.localStream);
          } catch (e) {
            console.warn("Không thể hủy localStream:", e);
          }
          this.localStream = null;
        }

        // Thoát phòng nếu đang trong phòng
        if (this.isLoggedInRoom && this.roomID) {
          try {
            this.zg.logoutRoom(this.roomID);
          } catch (e) {
            console.warn("Không thể đăng xuất khỏi phòng:", e);
          }
          this.isLoggedInRoom = false;
          this.roomID = null;
        }

        // Reset ZEGO Engine để tránh lỗi token
        this.zg = null;
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
    config: {
      appID: number;
      server: string;
      userID: string;
      userName: string;
      token: string;
      roomID: string;
      video?: boolean;
      audio?: boolean;
    },
    eventHandlers?: ZegoEventHandlers
  ): Promise<boolean> {
    try {
      // Kiểm tra xem SDK đã được tải chưa
      if (typeof window === "undefined" || !window.ZegoExpressEngine) {
        console.error(
          "ZegoService: ZegoExpressEngine không có sẵn - SDK chưa được tải"
        );
        if (window.loadZegoSDK) {
          console.log("ZegoService: Đang thử tải lại SDK");
          window.loadZegoSDK();

          // Đợi tối đa 5 giây cho SDK tải
          let attempts = 0;
          while (!window.ZegoExpressEngine && attempts < 10) {
            await new Promise((r) => setTimeout(r, 500));
            attempts++;
          }
        }

        if (!window.ZegoExpressEngine) {
          throw new Error("SDK chưa được tải đầy đủ - vui lòng thử lại");
        }
      }

      // Kiểm tra xem trình duyệt có hỗ trợ WebRTC không
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
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
      this.appID = config.appID;

      // Chỉ sử dụng server được cung cấp, nếu không sẽ dùng mặc định
      this.server = config.server || "wss://webliveroom-api.zego.im";

      this.roomID = config.roomID;
      this.userID = config.userID;
      this.userName = config.userName;
      this.token = config.token;
      this.micEnabled = config.audio !== false;
      this.cameraEnabled = !!config.video;

      if (eventHandlers) {
        this.eventHandlers = eventHandlers;
      }

      // Kiểm tra xem đã khởi tạo Zego chưa
      if (!this.zg) {
        try {
          console.log("ZegoService: Bắt đầu khởi tạo ZegoExpressEngine", {
            appID: config.appID,
            server: this.server,
          });

          // Tạo instance mới của ZegoExpressEngine
          this.zg = new ZegoExpressEngine(config.appID, this.server);

          if (!this.zg) {
            throw new Error("Không thể tạo instance ZegoExpressEngine");
          }

          console.log("ZegoService: Đã khởi tạo Zego SDK thành công");

          // Đăng ký các callback
          this.registerCallbacks();
        } catch (error) {
          console.error("ZegoService: Lỗi khởi tạo ZegoExpressEngine:", error);
          throw new Error(
            "Không thể khởi tạo Zego Engine: " +
              (error instanceof Error ? error.message : String(error))
          );
        }
      }

      // Đăng nhập vào phòng với 3 lần thử lại nếu thất bại
      if (this.zg && !this.isLoggedInRoom) {
        let attempts = 0;
        const maxAttempts = 3;
        let lastError = null;

        while (attempts < maxAttempts) {
          try {
            console.log(
              `ZegoService: Đang đăng nhập vào phòng (lần thử ${attempts + 1}):`,
              config.roomID
            );
            console.log("ZegoService: Thông tin đăng nhập:", {
              roomID: config.roomID,
              token: config.token
                ? `${config.token.substring(0, 10)}...`
                : "token không hợp lệ",
              userID: config.userID,
              userName: config.userName,
            });

            const loginResult = await this.zg.loginRoom(
              config.roomID,
              config.token,
              { userID: config.userID, userName: config.userName },
              { userUpdate: true }
            );

            this.isLoggedInRoom = loginResult;
            console.log(
              "ZegoService: Đăng nhập vào phòng:",
              config.roomID,
              "- Kết quả:",
              loginResult
            );

            return loginResult;
          } catch (roomError) {
            lastError = roomError;
            console.error(
              `ZegoService: Lỗi đăng nhập phòng (lần thử ${attempts + 1}):`,
              roomError
            );

            attempts++;
            if (attempts < maxAttempts) {
              // Đợi 1 giây trước khi thử lại
              await new Promise((r) => setTimeout(r, 1000));
            }
          }
        }

        // Xử lý khi đã thử hết số lần thử
        this.isLoggedInRoom = false;

        // Xử lý trường hợp roomError là object
        let errorMessage = "Không thể đăng nhập vào phòng sau nhiều lần thử";

        try {
          if (typeof lastError === "object" && lastError !== null) {
            const errorStr = JSON.stringify(lastError);
            if ("code" in lastError && typeof lastError === "object") {
              const errorWithCode = lastError as {
                code: number;
                [key: string]: unknown;
              };
              if (errorWithCode.code === 1102016) {
                errorMessage =
                  "Lỗi xác thực token (1102016) - Token không hợp lệ hoặc không phù hợp với môi trường server. Vui lòng kiểm tra cấu hình.";
                console.error(
                  "ZegoService: Lỗi liveroom 1102016 - Token không hợp lệ. Chi tiết:",
                  errorStr
                );
              } else if (errorWithCode.code === 1002001) {
                errorMessage =
                  "Lỗi giới hạn phòng (1002001) - Tài khoản đã vượt quá giới hạn số phòng hoạt động. Vui lòng đóng các phòng khác trước.";
                console.error(
                  "ZegoService: Lỗi liveroom 1002001 - Vượt quá giới hạn phòng. Chi tiết:",
                  errorStr
                );
              } else {
                errorMessage += ": " + errorStr;
              }
            } else {
              errorMessage += ": " + errorStr;
            }
          } else if (lastError instanceof Error) {
            errorMessage += ": " + lastError.message;
          } else {
            errorMessage += ": " + String(lastError);
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_) {
          errorMessage += ": Lỗi không xác định";
        }

        throw new Error(errorMessage);
      }

      return this.isLoggedInRoom;
    } catch (error) {
      console.error("ZegoService: Lỗi khởi tạo:", error);

      // Dọn dẹp bất kỳ tài nguyên nào đã được tạo
      if (this.zg) {
        try {
          this.zg.off("roomStateUpdate");
          this.zg.off("roomUserUpdate");
          this.zg.off("roomStreamUpdate");
          this.zg.off("publisherStateUpdate");
          this.zg.off("playerStateUpdate");
        } catch (cleanupError) {
          console.warn("ZegoService: Lỗi khi dọn dẹp:", cleanupError);
        }
        this.zg = null;
      }

      // Đặt lại các trạng thái
      this.isLoggedInRoom = false;
      this.localStream = null;
      this.publishStreamID = null;
      this.isPublishing = false;

      throw error; // Throw lại lỗi để component xử lý
    }
  }

  // Đăng ký các callback cho các sự kiện Zego
  private registerCallbacks() {
    if (!this.zg) return;

    // Sự kiện trạng thái phòng
    this.zg.on("roomStateUpdate", (roomID, state, errorCode) => {
      console.log(
        `ZegoService: Room state update - ${roomID}, ${state}, error: ${errorCode}`
      );
      if (this.eventHandlers.onRoomStateUpdate) {
        this.eventHandlers.onRoomStateUpdate(state, errorCode);
      }
    });

    // Sự kiện cập nhật người dùng
    this.zg.on("roomUserUpdate", (roomID, updateType, userList) => {
      console.log(
        `ZegoService: User update - ${roomID}, ${updateType}`,
        userList
      );
      if (this.eventHandlers.onUserUpdate) {
        this.eventHandlers.onUserUpdate(updateType, userList);
      }
    });

    // Sự kiện cập nhật stream
    this.zg.on("roomStreamUpdate", async (roomID, updateType, streamList) => {
      console.log(
        `ZegoService: Stream update - ${roomID}, ${updateType}`,
        streamList
      );

      if (updateType === "ADD") {
        // Xử lý streams mới được thêm vào
        for (const stream of streamList) {
          try {
            const playStream = await this.startPlayingStream(stream.streamID);
            if (playStream) {
              this.remoteStreams.set(stream.streamID, playStream);
            }
          } catch (error) {
            console.error(
              `ZegoService: Lỗi khi phát stream ${stream.streamID}:`,
              error
            );
          }
        }
      } else if (updateType === "DELETE") {
        // Xử lý streams bị xóa
        for (const stream of streamList) {
          this.stopPlayingStream(stream.streamID);
          this.remoteStreams.delete(stream.streamID);
        }
      }

      if (this.eventHandlers.onStreamUpdate) {
        this.eventHandlers.onStreamUpdate(updateType, streamList);
      }
    });

    // Sự kiện publisher state
    this.zg.on("publisherStateUpdate", (result) => {
      console.log("ZegoService: Publisher state:", result);
      if (result.state === "PUBLISHING") {
        this.isPublishing = true;
      } else {
        this.isPublishing = false;
      }

      if (this.eventHandlers.onPublisherStateUpdate) {
        this.eventHandlers.onPublisherStateUpdate(result);
      }
    });

    // Sự kiện player state
    this.zg.on("playerStateUpdate", (result) => {
      console.log("ZegoService: Player state:", result);
      if (this.eventHandlers.onPlayerStateUpdate) {
        this.eventHandlers.onPlayerStateUpdate(result);
      }
    });

    try {
      // @ts-expect-error - Bỏ qua lỗi TypeScript vì đây là API không chuẩn của Zego SDK
      this.zg.on("roomTokenWillExpire", (roomID, remainTimeInSecond) => {
        console.log(`ZegoService: Token will expire in ${remainTimeInSecond}s`);
        // Xử lý làm mới token ở đây nếu cần
      });
    } catch (error) {
      console.warn(
        "ZegoService: Không thể đăng ký sự kiện roomTokenWillExpire",
        error
      );
    }
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
      console.log("ZegoService: Tạo stream với video:", video, "audio:", audio);
      const stream = await this.zg.createStream({
        camera: {
          video,
          audio,
          videoQuality: 2,
          // @ts-expect-error - Bỏ qua lỗi vì API không chuẩn của Zego SDK
          videoMirrorMode: 1,
        },
      });

      this.localStream = stream;
      this.micEnabled = audio;
      this.cameraEnabled = video;

      console.log("ZegoService: Đã tạo stream:", {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
      });

      if (this.eventHandlers.onMicStatusChanged) {
        this.eventHandlers.onMicStatusChanged(audio);
      }

      if (this.eventHandlers.onCameraStatusChanged) {
        this.eventHandlers.onCameraStatusChanged(video);
      }

      return stream;
    } catch (error) {
      console.error("ZegoService: Lỗi khi tạo stream:", error);
      return null;
    }
  }

  // Phát stream lên server
  async startPublishingStream(customStreamID?: string): Promise<boolean> {
    if (!this.zg || !this.localStream || this.isPublishing) {
      return false;
    }

    try {
      const streamID = customStreamID || `${this.roomID}_${this.userID}`;
      console.log(`ZegoService: Phát stream với ID: ${streamID}`);

      await this.zg.startPublishingStream(streamID, this.localStream);
      this.publishStreamID = streamID;
      this.isPublishing = true;

      return true;
    } catch (error) {
      console.error("ZegoService: Lỗi khi phát stream:", error);
      return false;
    }
  }

  // Dừng phát stream
  stopPublishingStream(): void {
    if (!this.zg || !this.publishStreamID || !this.isPublishing) return;

    try {
      console.log(`ZegoService: Dừng phát stream ${this.publishStreamID}`);
      this.zg.stopPublishingStream(this.publishStreamID);
      this.isPublishing = false;
      this.publishStreamID = null;
    } catch (error) {
      console.error("ZegoService: Lỗi khi dừng phát stream:", error);
    }
  }

  // Phát stream của người dùng khác
  async startPlayingStream(
    streamID: string,
    options?: { video: boolean; audio: boolean }
  ): Promise<MediaStream | null> {
    if (!this.zg) {
      console.error("ZegoService: Chưa khởi tạo Zego SDK");
      return null;
    }

    try {
      console.log(`ZegoService: Phát stream ${streamID}`);
      const streamOptions = options || { video: true, audio: true };

      const stream = await this.zg.startPlayingStream(streamID, streamOptions);

      console.log(
        `ZegoService: Stream ${streamID} đang phát, tracks:`,
        stream?.getTracks()?.map((t: MediaStreamTrack) => ({
          kind: t.kind,
          enabled: t.enabled,
        })) || "Không có tracks"
      );

      return stream;
    } catch (error) {
      console.error(`ZegoService: Lỗi phát stream ${streamID}:`, error);
      return null;
    }
  }

  // Dừng phát stream của người dùng khác
  stopPlayingStream(streamID: string): void {
    if (!this.zg) return;

    try {
      console.log(`ZegoService: Dừng phát stream ${streamID}`);
      this.zg.stopPlayingStream(streamID);
      this.remoteStreams.delete(streamID);
    } catch (error) {
      console.error(`ZegoService: Lỗi dừng phát stream ${streamID}:`, error);
    }
  }

  // Bật/tắt mic
  toggleMicrophone(): boolean {
    if (!this.localStream) {
      return false;
    }

    try {
      const audioTracks = this.localStream.getAudioTracks();
      if (!audioTracks.length) {
        console.warn("ZegoService: Không có audio track");
        return false;
      }

      this.micEnabled = !this.micEnabled;
      audioTracks.forEach((track) => (track.enabled = this.micEnabled));

      console.log(
        `ZegoService: Microphone ${this.micEnabled ? "enabled" : "disabled"}`
      );

      if (this.eventHandlers.onMicStatusChanged) {
        this.eventHandlers.onMicStatusChanged(this.micEnabled);
      }

      return this.micEnabled;
    } catch (error) {
      console.error("ZegoService: Lỗi khi đổi trạng thái mic:", error);
      return false;
    }
  }

  // Bật/tắt camera
  toggleCamera(): boolean {
    if (!this.localStream) {
      return false;
    }

    try {
      const videoTracks = this.localStream.getVideoTracks();
      if (!videoTracks.length) {
        console.warn("ZegoService: Không có video track");
        return false;
      }

      this.cameraEnabled = !this.cameraEnabled;
      videoTracks.forEach((track) => (track.enabled = this.cameraEnabled));

      console.log(
        `ZegoService: Camera ${this.cameraEnabled ? "enabled" : "disabled"}`
      );

      if (this.eventHandlers.onCameraStatusChanged) {
        this.eventHandlers.onCameraStatusChanged(this.cameraEnabled);
      }

      return this.cameraEnabled;
    } catch (error) {
      console.error("ZegoService: Lỗi khi đổi trạng thái camera:", error);
      return false;
    }
  }

  // Kiểm tra trạng thái đăng nhập phòng
  async isRoomLoggedIn(): Promise<boolean> {
    return this.isLoggedInRoom;
  }

  // Kiểm tra trạng thái phát stream
  async isPublishingStream(): Promise<boolean> {
    return this.isPublishing;
  }

  // Đăng xuất khỏi phòng
  logoutRoom(): void {
    if (!this.zg || !this.isLoggedInRoom || !this.roomID) return;

    try {
      console.log(`ZegoService: Đăng xuất khỏi phòng ${this.roomID}`);
      this.zg.logoutRoom(this.roomID);
      this.isLoggedInRoom = false;
      this.roomID = null;
    } catch (error) {
      console.error("ZegoService: Lỗi khi đăng xuất:", error);
    }
  }

  // Dọn dẹp tài nguyên khi đóng
  destroy() {
    if (this.localStream) {
      try {
        this.stopPublishingStream();
        if (this.zg) {
          this.zg.destroyStream(this.localStream);
        }
        this.localStream = null;
      } catch (error) {
        console.error("ZegoService: Lỗi khi dọn dẹp localStream:", error);
      }
    }

    // Dừng tất cả remote streams
    for (const [streamID] of this.remoteStreams) {
      this.stopPlayingStream(streamID);
    }
    this.remoteStreams.clear();

    // Đăng xuất khỏi phòng
    if (this.isLoggedInRoom) {
      this.logoutRoom();
    }

    // Dừng tất cả audio
    this.stopAllCallAudios();

    // Gỡ bỏ các sự kiện Zego
    if (this.zg) {
      this.zg.off("roomStateUpdate");
      this.zg.off("roomUserUpdate");
      this.zg.off("roomStreamUpdate");
      this.zg.off("publisherStateUpdate");
      this.zg.off("playerStateUpdate");
      try {
        // @ts-expect-error - Bỏ qua lỗi TypeScript vì đây là API không chuẩn của Zego SDK
        this.zg.off("roomTokenWillExpire");
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        // Bỏ qua lỗi khi off sự kiện không tồn tại
        console.warn("Cannot unregister roomTokenWillExpire event");
      }

      this.zg = null;
    }

    // Reset các biến
    this.appID = null;
    this.server = null;
    this.userID = null;
    this.userName = null;
    this.token = null;
    this.isPublishing = false;
    this.publishStreamID = null;
    this.eventHandlers = {};
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

  // Yêu cầu Zego Token từ server
  async requestZegoToken(params: {
    roomID: string;
    userID: string;
    userName: string;
  }): Promise<ZegoTokenResponse> {
    console.log("ZegoService: Yêu cầu token với params:", params);

    return new Promise((resolve, reject) => {
      if (
        !socketService.socketInstance ||
        !socketService.socketInstance.connected
      ) {
        reject(new Error("Kết nối socket không khả dụng"));
        return;
      }

      // Đăng ký callback cho token
      const tokenCallback = (data: ZegoTokenResponse) => {
        console.log("ZegoService: Nhận được phản hồi token:", {
          success: !!data.token,
          appID: data.appID,
          error: data.error,
        });

        if (data.token && data.appID) {
          // Hủy đăng ký để tránh memory leak
          socketService.off("zegoToken", tokenCallback);
          clearTimeout(timeoutId); // Xóa timeout khi đã nhận được token
          resolve(data);
        } else {
          socketService.off("zegoToken", tokenCallback);
          clearTimeout(timeoutId); // Xóa timeout khi đã nhận được lỗi
          reject(new Error(data.error || "Server trả về token không hợp lệ"));
        }
      };

      // Đăng ký lắng nghe token
      socketService.on("zegoToken", tokenCallback);

      // Gửi yêu cầu token
      socketService.requestZegoToken(params);

      console.log("ZegoService: Đã gửi yêu cầu token, đang chờ phản hồi...");

      // Timeout sau 15 giây
      const timeoutId = setTimeout(() => {
        socketService.off("zegoToken", tokenCallback);
        console.error("ZegoService: Yêu cầu token hết thời gian chờ");
        reject(
          new Error(
            "Yêu cầu token hết thời gian chờ - vui lòng kiểm tra kết nối mạng và thử lại"
          )
        );
      }, 15000);
    });
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

      // Cơ chế chống trùng lặp token
      const tokenRequestId = Date.now();
      this.lastTokenRequestId = tokenRequestId;

      // Gửi yêu cầu cuộc gọi đến người nhận
      socketService.sendCallRequest({
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
      const tokenData = await this.requestZegoToken({
        roomID: params.roomID,
        userID: params.callerId,
        userName: params.callerName,
      });

      // Chỉ xử lý token mới nhất
      if (tokenRequestId !== this.lastTokenRequestId) {
        console.warn("ZegoService: Bỏ qua token cũ");
        throw new Error("Token đã bị thay thế bởi yêu cầu mới hơn");
      }

      // Thêm phòng vào danh sách phòng đang hoạt động
      this.activeRooms.add(params.roomID);

      return tokenData;
    } catch (error) {
      console.error("ZegoService: Lỗi khi bắt đầu cuộc gọi:", error);
      throw error;
    }
  }

  // Thiết lập lắng nghe cuộc gọi đến
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

  // Chấp nhận cuộc gọi
  async acceptCall(params: {
    roomID: string;
    callerId: string;
    receiverId: string;
  }): Promise<ZegoTokenResponse> {
    console.log("ZegoService: Chấp nhận cuộc gọi:", params);

    try {
      // Thông báo cho server rằng cuộc gọi đã được chấp nhận
      if (
        !socketService.socketInstance ||
        !socketService.socketInstance.connected
      ) {
        throw new Error("Kết nối socket không khả dụng");
      }

      socketService.socketInstance.emit("acceptCall", params);
      console.log(
        "ZegoService: Đã gửi thông báo chấp nhận, đang yêu cầu token..."
      );

      // Yêu cầu token từ server
      const tokenData = await this.requestZegoToken({
        roomID: params.roomID,
        userID: params.receiverId,
        userName: localStorage.getItem("username") || "User", // Sử dụng tên người dùng thực
      });

      console.log("ZegoService: Nhận được token cho cuộc gọi được chấp nhận:", {
        hasToken: !!tokenData.token,
        appID: tokenData.appID,
      });

      return tokenData;
    } catch (error) {
      console.error("ZegoService: Lỗi khi chấp nhận cuộc gọi:", error);
      throw new Error(
        "Không thể chấp nhận cuộc gọi: " +
          (error instanceof Error ? error.message : "Lỗi không xác định")
      );
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

  // Kết thúc cuộc gọi
  async endCall(roomID: string): Promise<void> {
    console.log("ZegoService: Kết thúc cuộc gọi, room:", roomID);

    // Dọn dẹp tài nguyên
    if (this.zg) {
      try {
        // Dừng phát stream nếu đang phát
        if (this.publishStreamID) {
          this.zg.stopPublishingStream(this.publishStreamID);
          this.publishStreamID = null;
          this.isPublishing = false;
        }

        // Đóng tất cả streams đang phát
        for (const [streamID] of this.remoteStreams) {
          this.stopPlayingStream(streamID);
        }
        this.remoteStreams.clear();

        // Hủy localStream nếu có
        if (this.localStream) {
          try {
            this.zg.destroyStream(this.localStream);
          } catch (e) {
            console.warn("Không thể hủy localStream:", e);
          }
          this.localStream = null;
        }

        // Đăng xuất khỏi phòng
        if (this.roomID === roomID || !this.roomID) {
          try {
            this.zg.logoutRoom(roomID);
          } catch (e) {
            console.warn("Không thể đăng xuất khỏi phòng:", e);
          }
          this.isLoggedInRoom = false;
          this.roomID = null;
        }
      } catch (error) {
        console.error("Lỗi khi kết thúc cuộc gọi:", error);
      }
    }

    // Xóa phòng khỏi danh sách phòng đang hoạt động
    this.activeRooms.delete(roomID);

    // Dừng tất cả audio
    this.stopAllCallAudios();

    // Gửi thông báo kết thúc cuộc gọi qua socket
    socketService.socketInstance?.emit("endCall", { roomID });
  }

  // Khởi tạo lại ZEGO với các tham số mới
  async reinitialize(params: {
    roomID: string;
    userID: string;
    userName: string;
    token: string;
    appID: number;
    video?: boolean;
    audio?: boolean;
  }): Promise<boolean> {
    // Đảm bảo đã dọn dẹp các kết nối cũ
    this.cleanupBeforeCall();

    // Khởi tạo với các tham số mới
    return this.initialize({
      appID: params.appID,
      server: "wss://webliveroom-api.zego.im",
      userID: params.userID,
      userName: params.userName,
      token: params.token,
      roomID: params.roomID,
      video: params.video,
      audio: params.audio,
    });
  }

  // Reset toàn bộ kết nối
  resetAllConnections() {
    console.log("ZegoService: Reset toàn bộ kết nối");
    this.cleanupBeforeCall();

    // Xóa tất cả phòng đang hoạt động
    this.activeRooms.clear();

    // Reset các biến trạng thái
    this.appID = null;
    this.server = null;
    this.userID = null;
    this.userName = null;
  }
}

// Declare global Window interface for audio elements
declare global {
  interface Window {
    incomingCallAudio?: HTMLAudioElement;
    callAudioElements: HTMLAudioElement[];
  }
}

// Export singleton instance
export const zegoService = new ZegoService();
