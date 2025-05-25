import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { ZIM } from "zego-zim-web";
import { message } from "antd";

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
  }
}

// Thiết lập thông tin ZEGO với test account
// Không sử dụng dữ liệu thật cho tài khoản sản phẩm
const appID = 1502332796;
const serverSecret = "909c6e1e38843287267a33f633539f93";

// Dùng một roomID cố định cho ứng dụng
const ROOM_ID = "SophyWebChatRoom";

/**
 * ZegoService - Cung cấp các phương thức để làm việc với ZEGO Cloud
 */
class ZegoService {
  private observer: MutationObserver | null = null;

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
      // Tạo token với roomID cố định
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        appID,
        serverSecret,
        ROOM_ID,
        userId,
        userName
      );

      // Khởi tạo instance ZegoUIKit với các tùy chọn
      const zp = ZegoUIKitPrebuilt.create(kitToken);

      // Yêu cầu quyền truy cập camera và microphone sớm
      await this.requestMediaPermissions();

      // Khởi tạo ZIM và đồng bộ người dùng với hệ thống
      zp.addPlugins({ ZIM });

      // Lưu các xử lý sự kiện vào biến toàn cục để xử lý cuộc gọi
      window.zegoCallbacks = {
        onCallAccepted: () => {
          console.log("Cuộc gọi được chấp nhận");
          callbacks.onCallModalVisibilityChange(false);
          callbacks.onCallingProgressChange(false);
        },
        onCallEnd: () => {
          console.log("Cuộc gọi kết thúc");
          callbacks.onCallModalVisibilityChange(false);
          callbacks.onCallingProgressChange(false);
        },
        onCallRejected: () => {
          console.log("Cuộc gọi bị từ chối");
          callbacks.onCallModalVisibilityChange(false);
          callbacks.onCallingProgressChange(false);
        },
        onUserJoin: () => {
          console.log("Có người tham gia phòng");
          callbacks.onCallModalVisibilityChange(false);
        },
        onUserLeave: () => {
          console.log("Có người rời khỏi phòng");
          callbacks.onCallingProgressChange(false);
        },
      };

      // Đặt thời gian đợi để ZIM khởi tạo hoàn tất
      setTimeout(() => {
        console.log("ZIM đã được khởi tạo thành công");
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
        ? ZegoUIKitPrebuilt.InvitationTypeVideoCall
        : ZegoUIKitPrebuilt.InvitationTypeVoiceCall;

      message.loading(
        `Đang gọi ${isVideoCall ? "video cho" : "cho"} ${calleeName}...`
      );

      // Reset observer state để có thể bắt sự kiện mới
      window.zegoObserverActive = true;

      // Cấu hình cuộc gọi với các tùy chọn phù hợp
      const result = await zegoInstance.sendCallInvitation({
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
  }

  /**
   * Dọn dẹp tài nguyên ZEGO
   */
  cleanup(): void {
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
