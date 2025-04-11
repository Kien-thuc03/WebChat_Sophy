import io, { Socket } from "socket.io-client";

const SOCKET_SERVER_URL = "http://localhost:3000";

class SocketService {
  private socket: Socket | null = null;
  private static instance: SocketService;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_SERVER_URL, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        autoConnect: true,
      });

      // Handle reconnection events
      this.socket.on("reconnect_attempt", (attemptNumber: number) => {
        console.log("Socket reconnection attempt:", attemptNumber);
      });

      this.socket.on("reconnect", () => {
        console.log("Socket reconnected successfully");
        // Re-authenticate after reconnection
        const userId = localStorage.getItem("userId");
        if (userId) {
          this.authenticate(userId);
        }
      });

      this.socket.on("reconnect_error", (error: Error) => {
        console.error("Socket reconnection error:", error);
      });

      this.socket.on("reconnect_failed", () => {
        console.error("Socket reconnection failed after all attempts");
      });

      this.setupListeners();
    }
    return this.socket;
  }

  authenticate(userId: string) {
    if (this.socket) {
      this.socket.emit("authenticate", userId);
    }
  }

  onReconnect(callback: () => void) {
    if (this.socket) {
      this.socket.on("connect", callback);
    }
  }

  disconnect() {
    if (this.socket) {
      // Gửi event báo là disconnect có chủ ý
      this.socket.emit("intentionalDisconnect");
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Thêm method để xử lý cleanup khi unmount component
  cleanup() {
    if (this.socket) {
      this.disconnect();
    }
  }

  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);
      // Re-authenticate on new connection
      const userId = localStorage.getItem("userId");
      if (userId) {
        this.authenticate(userId);
      }
    });

    this.socket.on("disconnect", (reason: string) => {
      console.log("Socket disconnected, reason:", reason);
      // If server disconnected us, try to reconnect
      if (reason === "io server disconnect" && this.socket) {
        this.socket.connect();
      }
    });

    this.socket.on("error", (error: Error) => {
      console.error("Socket error:", error);
    });
  }

  // Add methods for emitting and handling other socket events as needed
}

export default SocketService.getInstance();
