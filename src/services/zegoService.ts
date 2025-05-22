import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

interface CallConfig {
  appID: number;
  userID: string;
  userName: string;
  token: string;
  roomID: string;
  scenario?: {
    mode: typeof ZegoUIKitPrebuilt.OneONoneCall;
  };
}

// Định nghĩa interface cho phù hợp với ZegoUIKitPrebuilt instance
export interface ZegoJoinRoomConfig {
  container: HTMLElement;
  scenario?: {
    mode: typeof ZegoUIKitPrebuilt.OneONoneCall;
  };
  sharedLinks?: Array<{
    name: string;
    url: string;
  }>;
  user?: {
    userID: string;
    userName: string;
  };
  roomID?: string;
  turnOnCameraWhenJoining?: boolean;
  turnOnMicrophoneWhenJoining?: boolean;
  onLeaveRoom?: () => void;
}

export class ZegoService {
  private zp: ZegoUIKitPrebuilt | null = null;
  private isInitializing: boolean = false;
  private lastRoomID: string | null = null;

  initialize(container: HTMLElement, config: CallConfig, onLeave?: () => void) {
    console.log("ZegoService: Starting initialization with config:", {
      appID: config.appID,
      userID: config.userID,
      userName: config.userName,
      roomID: config.roomID,
      scenario: config.scenario,
    });

    if (this.isInitializing) {
      console.warn("ZegoService: Already initializing a call, please wait...");
      return;
    }

    // Nếu đang có một cuộc gọi trong cùng phòng, không khởi tạo lại
    if (this.zp && this.lastRoomID === config.roomID) {
      console.log("ZegoService: Already in the same room, reusing instance");
      return;
    }

    // Nếu còn một instance cũ, destroy nó trước
    if (this.zp) {
      this.destroy();
    }

    this.isInitializing = true;

    try {
      if (!container) {
        throw new Error("Container element is null or undefined.");
      }

      if (!config.appID || !config.userID || !config.token || !config.roomID) {
        throw new Error("Invalid configuration: Missing required fields.");
      }

      if (!ZegoUIKitPrebuilt) {
        throw new Error("ZegoUIKitPrebuilt is not imported correctly.");
      }

      this.zp = ZegoUIKitPrebuilt.create(config.token);
      if (!this.zp) {
        throw new Error("Failed to create ZegoUIKitPrebuilt instance.");
      }

      this.lastRoomID = config.roomID;
      console.log("ZegoService: Joining room...");

      this.zp.joinRoom({
        container,
        scenario: config.scenario || {
          mode: ZegoUIKitPrebuilt.OneONoneCall,
        },
        sharedLinks: [
          {
            name: "Copy link",
            url: window.location.href,
          },
        ],
        user: {
          userID: config.userID,
          userName: config.userName,
        },
        roomID: config.roomID,
        turnOnCameraWhenJoining: true,
        turnOnMicrophoneWhenJoining: true,
        onLeaveRoom: () => {
          console.log("ZegoService: User left the room.");
          this.lastRoomID = null;
          if (onLeave) onLeave();
        },
      });

      console.log("ZegoService: Successfully initialized and joined room.");
    } catch (error) {
      this.lastRoomID = null;
      console.error("ZegoService: Error during initialization:", error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  destroy() {
    console.log("ZegoService: Destroying ZEGOCLOUD instance...");
    try {
      if (this.zp) {
        this.zp.destroy();
        this.zp = null;
        this.lastRoomID = null;
        console.log("ZegoService: ZEGOCLOUD instance destroyed.");
      } else {
        console.log("ZegoService: No ZEGOCLOUD instance to destroy.");
      }
    } catch (error) {
      console.error("ZegoService: Error destroying ZEGOCLOUD instance:", error);
    }
  }

  muteMicrophone(mute: boolean) {
    console.log(`ZegoService: ${mute ? "Muting" : "Unmuting"} microphone...`);
    if (this.zp) {
      try {
        // Access the method directly
        this.zp.muteMicrophone(mute);
      } catch (error) {
        console.warn("ZegoService: Error muting microphone:", error);
      }
    } else {
      console.warn(
        "ZegoService: Cannot mute microphone, ZEGOCLOUD instance not initialized."
      );
    }
  }

  muteCamera(mute: boolean) {
    console.log(`ZegoService: ${mute ? "Muting" : "Unmuting"} camera...`);
    if (this.zp) {
      try {
        // Access the method directly
        this.zp.muteCamera(mute);
      } catch (error) {
        console.warn("ZegoService: Error muting camera:", error);
      }
    } else {
      console.warn(
        "ZegoService: Cannot mute camera, ZEGOCLOUD instance not initialized."
      );
    }
  }
}

export const zegoService = new ZegoService();
