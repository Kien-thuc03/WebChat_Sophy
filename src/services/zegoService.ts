import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { ZIM } from "zego-zim-web";
import { message, notification, Modal } from "antd";

// Mở rộng interface Window để thêm các thuộc tính ZEGO
declare global {
  interface Window {
    incomingCallAudio?: HTMLAudioElement;
    callAudioElements: HTMLAudioElement[];
    zegoCallbacks?: {
      onCallAccepted: () => void;
      onCallEnd: () => void;
      onCallRejected: () => void;
      onUserJoin: () => void;
      onUserLeave: () => void;
    };
    zegoObserverActive?: boolean; // Flag để kiểm soát trạng thái của observer
    globalCallNotification?: any; // Store the global call notification
    globalCallModal?: unknown; // Store the global call modal
    zegoErrorsShown?: boolean; // Đánh dấu đã hiển thị lỗi Zego
    zimInstance?: any; // Lưu ZIM instance toàn cục
    zimInitialized?: boolean; // Đánh dấu ZIM đã được khởi tạo
  }
}

// Định nghĩa type BeepSound cho audio fallback
interface BeepSound {
  oscillator: OscillatorNode;
  gainNode: GainNode;
  beepInterval: NodeJS.Timeout;
  audioCtx: AudioContext;
}

// Thiết lập thông tin ZEGO với test account
// Không sử dụng dữ liệu thật cho tài khoản sản phẩm
const appID = 1502332796;
const serverSecret = "909c6e1e38843287267a33f633539f93";

// Dùng một roomID cố định cho ứng dụng
const ROOM_ID = "SophyWebChatRoom";

// Ngăn chặn log lỗi WebSocket của Zego
const originalConsoleError = console.error;
console.error = (...args) => {
  const errorMessage = args.join(" ");
  // Bỏ qua các lỗi WebSocket từ Zego
  if (
    errorMessage.includes("weblogger") ||
    errorMessage.includes("WebSocket connection to") ||
    errorMessage.includes("coolzcloud.com")
  ) {
    // Chỉ hiển thị cảnh báo một lần
    if (!window.zegoErrorsShown) {
      console.warn(
        "Một số lỗi logging từ Zego đã được ẩn để cải thiện trải nghiệm."
      );
      window.zegoErrorsShown = true;
    }
    return;
  }
  originalConsoleError.apply(console, args);
};

/**
 * ZegoService - Cung cấp các phương thức để làm việc với ZEGO Cloud
 */
class ZegoService {
  private observer: MutationObserver | null = null;
  private zimLoginAttempts: number = 0;

  /**
   * Khởi tạo và đăng nhập ZIM trực tiếp để đảm bảo nhận được cuộc gọi
   */
  async initializeZIM(userId: string, userName: string): Promise<boolean> {
    try {
      if (window.zimInitialized && window.zimInstance) {
        console.log("ZIM đã được khởi tạo trước đó");
        return true;
      }

      console.log("Đang khởi tạo ZIM trực tiếp...");

      // Đảm bảo thư viện đã được tải hoàn toàn
      if (typeof ZIM === "undefined") {
        console.error("Thư viện ZIM chưa được tải");
        // Chờ thư viện tải xong (thử lại sau)
        return false;
      }

      // Khởi tạo ZIM instance
      try {
        const zim = ZIM.create({
          appID,
        });

        if (!zim) {
          console.error("Không thể khởi tạo ZIM");
          return false;
        }

        // Lưu instance vào biến toàn cục
        window.zimInstance = zim;

        // Đăng ký các sự kiện cuộc gọi
        zim.on("connectionStateChanged", (state) => {
          console.log(`ZIM connection state: ${state}`);
        });

        zim.on("error", (errorInfo) => {
          console.error("ZIM error:", errorInfo);
        });

        zim.on("callInvitationReceived", (zimInstance, data) => {
          console.log("ZIM call invitation received:", data);
          // Xử lý cuộc gọi đến nếu cần
        });

        // Đăng nhập vào ZIM với các tùy chọn cần thiết
        try {
          // Tạo token cho ZIM login
          const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
            appID,
            serverSecret,
            ROOM_ID,
            userId,
            userName
          );

          // Đăng nhập vào ZIM với token được tạo
          await zim.login({
            userID: userId,
            userName: userName,
            token: kitToken,
          });

          console.log("ZIM login success:", userId, userName);
          window.zimInitialized = true;
          return true;
        } catch (loginError) {
          console.error("ZIM login failed:", loginError);
          this.zimLoginAttempts++;

          if (this.zimLoginAttempts < 3) {
            console.log(
              `Thử đăng nhập ZIM lần ${this.zimLoginAttempts + 1}...`
            );
            // Thử lại sau 1 giây
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return this.initializeZIM(userId, userName);
          }
          return false;
        }
      } catch (createError) {
        console.error("Không thể khởi tạo ZIM:", createError);
        return false;
      }
    } catch (error) {
      console.error("ZIM initialization error:", error);
      return false;
    }
  }

  private playIncomingCallSound() {
    try {
      if (!window.incomingCallAudio) {
        try {
          // Try to load the mp3 file
          window.incomingCallAudio = new Audio("/sounds/incoming-call.mp3");
        } catch (_) {
          console.warn("Could not load incoming call sound, using fallback");
          // Use a simple oscillator as fallback
          this.playBeepSound();
          return;
        }
        window.incomingCallAudio.loop = true;
      }
      window.incomingCallAudio.play().catch((_) => {
        console.warn("Could not play incoming call sound, using fallback");
        // Use a simple oscillator as fallback
        this.playBeepSound();
      });
    } catch (err) {
      console.error("Error playing incoming call sound:", err);
      // Use a simple oscillator as fallback
      this.playBeepSound();
    }
  }

  // Fallback sound using Web Audio API
  private playBeepSound() {
    try {
      // Create a periodic beep sound using Web Audio API
      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;

      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = "sine";
      oscillator.frequency.value = 1000; // value in hertz
      gainNode.gain.value = 0.5; // volume

      oscillator.start();

      // Beep pattern for incoming call
      const beepInterval = setInterval(() => {
        gainNode.gain.value = gainNode.gain.value > 0 ? 0 : 0.5;
      }, 500); // toggle every 500ms

      // Store reference for cleanup
      const beepSound: BeepSound = {
        oscillator,
        gainNode,
        beepInterval,
        audioCtx,
      };
      window.callAudioElements.push(beepSound as unknown as HTMLAudioElement);

      // Stop after 10 seconds if not manually stopped
      setTimeout(() => {
        // Ensure safe type casting for comparison
        const audioElements = window.callAudioElements as unknown as Array<
          BeepSound | HTMLAudioElement
        >;
        if (audioElements.includes(beepSound as unknown as HTMLAudioElement)) {
          oscillator.stop();
          clearInterval(beepInterval);
          window.callAudioElements = window.callAudioElements.filter(
            (s) => s !== (beepSound as unknown as HTMLAudioElement)
          );
        }
      }, 10000);
    } catch (err) {
      console.error("Failed to create fallback sound:", err);
    }
  }

  private stopIncomingCallSound() {
    if (window.incomingCallAudio) {
      window.incomingCallAudio.pause();
      window.incomingCallAudio.currentTime = 0;
    }
  }

  /**
   * Khởi tạo instance ZEGO cho người dùng hiện tại
   * @param userId ID của người dùng hiện tại
   * @param userName Tên của người dùng hiện tại
   * @param callbacks Các hàm callback cho các sự kiện ZEGO
   * @returns Promise<ZegoUIKitPrebuilt | null> Instance ZEGO hoặc null nếu có lỗi
   */
  async initializeZego(
    userId: string,
    userName: string,
    callbacks: {
      onZIMInitialized: () => void;
      onCallModalVisibilityChange: (visible: boolean) => void;
      onCallingProgressChange: (inProgress: boolean) => void;
    }
  ): Promise<ZegoUIKitPrebuilt | null> {
    try {
      // Khởi tạo ZIM riêng trước
      const zimInitialized = await this.initializeZIM(userId, userName);
      if (!zimInitialized) {
        console.warn("ZIM không thể khởi tạo riêng, tiếp tục với ZegoUIKit");
        // Không return, vẫn thử khởi tạo ZegoUIKit
      }

      // Tạo token với roomID cố định và bổ sung cấu hình
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        appID,
        serverSecret,
        ROOM_ID,
        userId,
        userName
      );

      // Khởi tạo instance ZegoUIKit với các tùy chọn
      const zp = ZegoUIKitPrebuilt.create(kitToken);

      // Tắt logging để tránh lỗi WebSocket
      if (zp && (zp as any).setLogConfig) {
        try {
          (zp as any).setLogConfig({
            logLevel: "error", // Chỉ log lỗi nghiêm trọng
            remoteLogLevel: "error", // Chỉ gửi lỗi nghiêm trọng lên server
            logUploader: false, // Tắt việc upload logs lên server Zego
          });
        } catch (_) {
          console.warn("Không thể cấu hình log cho Zego");
        }
      }

      // Yêu cầu quyền truy cập camera và microphone sớm
      await this.requestMediaPermissions();

      // Khởi tạo ZIM và đồng bộ người dùng với hệ thống
      zp.addPlugins({ ZIM });

      // Thiết lập handler cho các cuộc gọi đến
      this.setupIncomingCallHandler(zp);

      // Lưu các xử lý sự kiện vào biến toàn cục để xử lý cuộc gọi
      window.zegoCallbacks = {
        onCallAccepted: () => {
          console.log("Cuộc gọi được chấp nhận");
          this.stopIncomingCallSound();
          if (window.globalCallNotification) {
            notification.destroy(window.globalCallNotification as any);
            window.globalCallNotification = null;
          }
          if (window.globalCallModal) {
            Modal.destroyAll();
            window.globalCallModal = null;
          }
          callbacks.onCallModalVisibilityChange(false);
          callbacks.onCallingProgressChange(false);
        },
        onCallEnd: () => {
          console.log("Cuộc gọi kết thúc");
          this.stopIncomingCallSound();
          if (window.globalCallNotification) {
            notification.destroy(window.globalCallNotification as any);
            window.globalCallNotification = null;
          }
          if (window.globalCallModal) {
            Modal.destroyAll();
            window.globalCallModal = null;
          }
          callbacks.onCallModalVisibilityChange(false);
          callbacks.onCallingProgressChange(false);
        },
        onCallRejected: () => {
          console.log("Cuộc gọi bị từ chối");
          this.stopIncomingCallSound();
          if (window.globalCallNotification) {
            notification.destroy(window.globalCallNotification as any);
            window.globalCallNotification = null;
          }
          if (window.globalCallModal) {
            Modal.destroyAll();
            window.globalCallModal = null;
          }
          callbacks.onCallModalVisibilityChange(false);
          callbacks.onCallingProgressChange(false);
        },
        onUserJoin: () => {
          console.log("Có người tham gia phòng");
          this.stopIncomingCallSound();
          if (window.globalCallNotification) {
            notification.destroy(window.globalCallNotification as any);
            window.globalCallNotification = null;
          }
          if (window.globalCallModal) {
            Modal.destroyAll();
            window.globalCallModal = null;
          }
          callbacks.onCallModalVisibilityChange(false);
        },
        onUserLeave: () => {
          console.log("Có người rời khỏi phòng");
          callbacks.onCallingProgressChange(false);
        },
      };

      // Đặt thời gian đợi để ZIM khởi tạo hoàn tất
      setTimeout(() => {
        console.log("ZIM đã được khởi tạo thành công thông qua ZegoUIKit");
        callbacks.onZIMInitialized();
      }, 2000);

      console.log("Khởi tạo ZEGO thành công cho user:", userId);
      return zp;
    } catch (error) {
      console.error("Error initializing Zego:", error);
      message.error(
        "Không thể khởi tạo dịch vụ gọi điện: " +
          (error instanceof Error ? error.message : String(error))
      );
      return null;
    }
  }

  /**
   * Thiết lập handler cho cuộc gọi đến
   */
  private setupIncomingCallHandler(zp: ZegoUIKitPrebuilt) {
    if (!zp || !(zp as any).getCallInvitationList) return;

    // Lắng nghe sự kiện cuộc gọi đến
    (zp as any)
      .getCallInvitationList()
      .onCallInvitationReceived(
        (callID: string, caller: any, callType: any, callData: string) => {
          console.log("Received call invitation:", {
            callID,
            caller,
            callType,
          });

          // Parse callData nếu có
          try {
            JSON.parse(callData || "{}");
          } catch (e) {
            console.error("Failed to parse call data:", e);
          }

          // Xác định kiểu cuộc gọi
          const isVideoCall =
            callType === (ZegoUIKitPrebuilt as any).InvitationTypeVideoCall;

          // Phát nhạc chuông
          this.playIncomingCallSound();

          // Hiển thị thông báo toàn cục
          window.globalCallNotification = notification.open({
            message: `${isVideoCall ? "Cuộc gọi video" : "Cuộc gọi thoại"} đến`,
            description: `${caller.userName} đang gọi cho bạn`,
            icon: null,
            duration: 0,
            key: "incoming-call",
            placement: "bottomRight",
            btn: null,
            onClick: () => {
              // Hiển thị modal khi click vào notification
              this.showIncomingCallModal(zp, callID, caller, isVideoCall);
            },
          });

          // Tự động hiển thị modal cuộc gọi đến
          this.showIncomingCallModal(zp, callID, caller, isVideoCall);
        }
      );

    // Xử lý khi có người hủy cuộc gọi
    (zp as any)
      .getCallInvitationList()
      .onCallInvitationCanceled((callID: string, caller: any) => {
        console.log("Call invitation canceled:", { callID, caller });
        this.stopIncomingCallSound();

        if (window.globalCallNotification) {
          notification.destroy(window.globalCallNotification as any);
          window.globalCallNotification = null;
        }

        if (window.globalCallModal) {
          Modal.destroyAll();
          window.globalCallModal = null;
        }

        notification.info({
          message: "Cuộc gọi kết thúc",
          description: `${caller.userName} đã hủy cuộc gọi`,
          duration: 4,
        });
      });

    // Xử lý khi cuộc gọi kết thúc
    (zp as any)
      .getCallInvitationList()
      .onCallInvitationEnded((callID: string, reason: any) => {
        console.log("Call invitation ended:", { callID, reason });
        this.stopIncomingCallSound();

        if (window.globalCallNotification) {
          notification.destroy(window.globalCallNotification as any);
          window.globalCallNotification = null;
        }

        if (window.globalCallModal) {
          Modal.destroyAll();
          window.globalCallModal = null;
        }
      });

    // Xử lý khi cuộc gọi hết hạn
    (zp as any)
      .getCallInvitationList()
      .onCallInvitationTimeout((callID: string) => {
        console.log("Call invitation timeout:", callID);
        this.stopIncomingCallSound();

        if (window.globalCallNotification) {
          notification.destroy(window.globalCallNotification as any);
          window.globalCallNotification = null;
        }

        if (window.globalCallModal) {
          Modal.destroyAll();
          window.globalCallModal = null;
        }

        notification.info({
          message: "Cuộc gọi nhỡ",
          description: "Bạn đã bỏ lỡ một cuộc gọi",
          duration: 4,
        });
      });
  }

  /**
   * Hiển thị modal cuộc gọi đến
   */
  private showIncomingCallModal(
    zp: ZegoUIKitPrebuilt,
    callID: string,
    caller: any,
    isVideoCall: boolean
  ) {
    // Nếu đã có modal đang hiển thị, không hiển thị thêm
    if (window.globalCallModal) return;

    // Close notification if it exists
    if (window.globalCallNotification) {
      notification.destroy(window.globalCallNotification as any);
      window.globalCallNotification = null;
    }

    // Hiển thị modal cuộc gọi đến
    window.globalCallModal = Modal.confirm({
      title: `${isVideoCall ? "Cuộc gọi video" : "Cuộc gọi thoại"} đến`,
      content: `${caller.userName} đang gọi cho bạn`,
      icon: null, // Không sử dụng JSX icon
      okText: "Trả lời",
      cancelText: "Từ chối",
      centered: true,
      width: 400,
      keyboard: false, // Ngăn chặn đóng bằng ESC
      maskClosable: false, // Ngăn chặn đóng bằng click outside
      okButtonProps: {
        style: {
          backgroundColor: "#52c41a",
          borderColor: "#52c41a",
        },
      },
      cancelButtonProps: {
        danger: true,
      },
      onOk: () => {
        // Chấp nhận cuộc gọi
        console.log("Accepting call:", callID);
        this.stopIncomingCallSound();
        (zp as any).getCallInvitationList().acceptCallInvitation(callID);
        return Promise.resolve();
      },
      onCancel: () => {
        // Từ chối cuộc gọi
        console.log("Rejecting call:", callID);
        this.stopIncomingCallSound();
        (zp as any).getCallInvitationList().refuseCallInvitation(callID);
        return Promise.resolve();
      },
      afterClose: () => {
        window.globalCallModal = null;
      },
    });
  }

  /**
   * Yêu cầu quyền truy cập vào microphone và camera
   */
  async requestMediaPermissions(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      console.log("Đã cấp quyền truy cập camera và microphone");

      // Kiểm tra các track âm thanh
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        console.log(`Microphone đã được kích hoạt: ${audioTracks[0].enabled}`);
        console.log(`Microphone đang hoạt động: ${audioTracks[0].readyState}`);

        // Đảm bảo microphone được bật
        audioTracks.forEach((track) => {
          track.enabled = true;
        });
      } else {
        console.warn("Không tìm thấy thiết bị microphone");
      }

      // Đóng stream sau khi kiểm tra để tránh sử dụng tài nguyên
      // nhưng giữ permissions
      stream.getTracks().forEach((track) => track.stop());
    } catch (err) {
      console.warn("Chưa cấp quyền truy cập camera hoặc microphone:", err);
      // message.warning(
      //   "Vui lòng cấp quyền truy cập camera và microphone để sử dụng tính năng gọi điện"
      // );
    }
  }

  /**
   * Thiết lập observer để theo dõi khi giao diện ZEGO được tạo ra
   * @param callbacks Các hàm callback cho việc thay đổi trạng thái
   */
  setupZegoInterfaceObserver(callbacks: {
    onCallModalVisibilityChange: (visible: boolean) => void;
    onCallingProgressChange: (inProgress: boolean) => void;
  }): MutationObserver {
    // Nếu đã có observer, hủy nó đi để tránh trùng lặp
    if (this.observer) {
      this.observer.disconnect();
    }

    // Reset flag
    window.zegoObserverActive = true;

    this.observer = new MutationObserver((mutations) => {
      // Chỉ tiếp tục nếu flag còn active
      if (!window.zegoObserverActive) return;

      for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
          // Kiểm tra xem có phần tử ZEGO được thêm vào không
          const zegoElements = document.querySelectorAll('[class*="zego"]');
          if (zegoElements.length > 0) {
            console.log("Phát hiện giao diện ZEGO, đóng modal ngay lập tức");
            callbacks.onCallModalVisibilityChange(false);

            // Đồng thời đóng call notification và modal nếu có
            if (window.globalCallNotification) {
              notification.destroy(window.globalCallNotification as any);
              window.globalCallNotification = null;
            }

            if (window.globalCallModal) {
              Modal.destroyAll();
              window.globalCallModal = null;
            }

            // Dừng âm thanh cuộc gọi đến
            this.stopIncomingCallSound();

            // Vô hiệu hóa observer sau khi đã tìm thấy để tránh log lặp lại
            window.zegoObserverActive = false;

            // Không disconnect ngay vì có thể cần cho cuộc gọi tiếp theo
            // Chúng ta chỉ dừng xử lý sự kiện
            break;
          }
        }
      }
    });

    // Bắt đầu quan sát DOM để phát hiện khi giao diện ZEGO được tạo
    this.observer.observe(document.body, { childList: true, subtree: true });
    return this.observer;
  }

  /**
   * Gửi lời mời gọi điện thoại
   * @param zegoInstance Instance ZEGO đã được khởi tạo
   * @param calleeId ID của người nhận cuộc gọi
   * @param calleeName Tên của người nhận cuộc gọi
   * @param isVideoCall True nếu là cuộc gọi video, False nếu là cuộc gọi thoại
   * @returns Promise<void>
   */
  async sendCallInvitation(
    zegoInstance: ZegoUIKitPrebuilt,
    calleeId: string,
    calleeName: string,
    isVideoCall: boolean,
    callbacks: {
      onCallModalVisibilityChange: (visible: boolean) => void;
      onCallingProgressChange: (inProgress: boolean) => void;
    }
  ): Promise<void> {
    try {
      // Đảm bảo ID người dùng là chuỗi và không có ký tự đặc biệt
      const normalizedCalleeId = String(calleeId).replace(/[^a-zA-Z0-9]/g, "");

      const targetUser = {
        userID: normalizedCalleeId,
        userName: calleeName || "User",
      };

      const callType = isVideoCall
        ? (ZegoUIKitPrebuilt as any).InvitationTypeVideoCall
        : (ZegoUIKitPrebuilt as any).InvitationTypeVoiceCall;

      message.loading(
        `Đang gọi ${isVideoCall ? "video cho" : "cho"} ${calleeName}...`
      );

      // Reset observer state để có thể bắt sự kiện mới
      window.zegoObserverActive = true;

      // Cấu hình cuộc gọi với các tùy chọn phù hợp
      const result = await (zegoInstance as any).sendCallInvitation({
        callees: [targetUser],
        callType: callType,
        timeout: 60,
        data: JSON.stringify({
          roomID: ROOM_ID,
          action: isVideoCall ? "video-call" : "voice-call",
          config: {
            // Cấu hình chung
            turnOnCameraWhenJoining: isVideoCall, // Chỉ bật camera tự động nếu là video call
            turnOnMicrophoneWhenJoining: true, // Luôn bật micro tự động
            useFrontFacingCamera: true, // Sử dụng camera trước
            showPreJoinView: true, // Hiển thị màn hình xác nhận trước khi tham gia
            showLeavingView: true, // Hiển thị xác nhận khi rời khỏi

            // Cấu hình UI
            showMicrophoneToggleButton: true, // Hiển thị nút bật/tắt mic
            showCameraToggleButton: isVideoCall, // Chỉ hiển thị nút camera trong cuộc gọi video
            showUserList: true, // Hiển thị danh sách người dùng trong cuộc gọi
            showLayoutToggleButton: isVideoCall, // Chỉ hiển thị nút bố cục cho cuộc gọi video
            showScreenSharingButton: isVideoCall, // Hiển thị nút chia sẻ màn hình chỉ trong cuộc gọi video
            showTextChat: false, // Ẩn chat trong cuộc gọi
            showAudioVideoSettingsButton: true, // Hiển thị cài đặt âm thanh/video

            // Cấu hình âm thanh nâng cao
            enableStereo: true, // Bật âm thanh stereo cho chất lượng tốt hơn
            echoCancellation: true, // Loại bỏ tiếng vang
            noiseSuppression: true, // Giảm tiếng ồn
            autoGainControl: true, // Tự động điều chỉnh âm lượng

            // Custom sự kiện
            onOnlySelfInRoom: () => {
              // Khi chỉ có mình trong phòng (đối phương đã rời đi)
              console.log("Chỉ còn mình trong phòng, hủy cuộc gọi");
              callbacks.onCallingProgressChange(false);
              callbacks.onCallModalVisibilityChange(false);
            },
            onUserJoin: () => {
              if (window.zegoCallbacks?.onUserJoin) {
                window.zegoCallbacks.onUserJoin();
              }
              // Đóng modal ngay lập tức khi người dùng tham gia cuộc gọi
              console.log("Người dùng tham gia, đóng modal ngay");
              callbacks.onCallModalVisibilityChange(false);
            },
            onCallEnd: () => {
              if (window.zegoCallbacks?.onCallEnd) {
                window.zegoCallbacks.onCallEnd();
              }
              // Reset trạng thái cuộc gọi
              callbacks.onCallingProgressChange(false);
            },
            onJoinRoom: () => {
              // Khi tham gia phòng
              console.log("Đã tham gia phòng, đóng modal");
              callbacks.onCallModalVisibilityChange(false);
            },
          },
        }),
      });

      console.log(
        `${isVideoCall ? "Video c" : "C"}all invitation sent:`,
        result
      );

      if (!result.errorInvitees || result.errorInvitees.length === 0) {
        callbacks.onCallModalVisibilityChange(true);
        message.success(
          `Đang kết nối cuộc gọi${isVideoCall ? " video" : ""}...`
        );

        // Timeout để đóng modal sau một khoảng thời gian
        setTimeout(() => {
          callbacks.onCallModalVisibilityChange(false);
          callbacks.onCallingProgressChange(false);
        }, 5000);
      } else {
        message.error("Người nhận hiện không khả dụng. Vui lòng thử lại sau.");
        console.error("Error invitees:", result.errorInvitees);
        callbacks.onCallingProgressChange(false);
      }
    } catch (error) {
      console.error(`Error making ${isVideoCall ? "video " : ""}call:`, error);
      message.error(`Đã xảy ra lỗi khi gọi ${isVideoCall ? "video" : "điện"}`);
      callbacks.onCallingProgressChange(false);
      throw error;
    }
  }

  /**
   * Kết thúc cuộc gọi hiện tại
   * @param zegoInstance Instance ZEGO đã được khởi tạo
   */
  endCall(zegoInstance: ZegoUIKitPrebuilt | null): void {
    if (zegoInstance) {
      zegoInstance.hangUp();
    }

    // Dừng âm thanh cuộc gọi đến
    this.stopIncomingCallSound();

    // Đóng notification và modal nếu có
    if (window.globalCallNotification) {
      notification.destroy(window.globalCallNotification as any);
      window.globalCallNotification = null;
    }

    if (window.globalCallModal) {
      Modal.destroyAll();
      window.globalCallModal = null;
    }
  }

  /**
   * Dọn dẹp tài nguyên ZEGO
   */
  cleanup(): void {
    // Dừng âm thanh cuộc gọi đến
    this.stopIncomingCallSound();

    // Đóng notification và modal nếu có
    if (window.globalCallNotification) {
      notification.destroy(window.globalCallNotification as any);
      window.globalCallNotification = null;
    }

    if (window.globalCallModal) {
      Modal.destroyAll();
      window.globalCallModal = null;
    }

    // Xóa các callbacks khỏi window nếu đã đăng ký
    if (window.zegoCallbacks) {
      window.zegoCallbacks = undefined;
    }

    // Reset flag observer
    window.zegoObserverActive = false;

    // Hủy observer nếu đang tồn tại
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// Export instance duy nhất của ZegoService
const zegoService = new ZegoService();
export default zegoService;
