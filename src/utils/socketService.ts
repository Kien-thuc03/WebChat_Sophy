// socketService.ts
import io, { Socket } from "socket.io-client";

const SOCKET_SERVER_URL = "http://localhost:3000";

interface FriendRequestData {
  friendRequestId: string;
  message: string;
  sender: {
    userId: string;
    fullname: string;
    avatar?: string;
  };
  timestamp: string;
}

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

      this.socket.on("reconnect_attempt", (attemptNumber: number) => {
        console.log("Socket reconnection attempt:", attemptNumber);
      });

      this.socket.on("reconnect", () => {
        console.log("Socket reconnected successfully");
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
      this.socket.emit("intentionalDisconnect");
      this.socket.disconnect();
      this.socket = null;
    }
  }

  cleanup() {
    if (this.socket) {
      this.disconnect();
    }
  }

  onNewFriendRequest(callback: (data: FriendRequestData) => void) {
    if (this.socket) {
      this.socket.on("newFriendRequest", (data: FriendRequestData) => {
        console.log("SocketService: Received newFriendRequest event:", data);
        callback(data);
      });
    } else {
      console.warn("SocketService: Socket not initialized for newFriendRequest listener");
    }
  }

  onRejectedFriendRequest(callback: (data: FriendRequestData) => void) {
    if (this.socket) {
      this.socket.on("rejectedFriendRequest", (data: FriendRequestData) => {
        console.log("SocketService: Received rejectedFriendRequest event:", data);
        callback(data);
      });
    } else {
      console.warn("SocketService: Socket not initialized for rejectedFriendRequest listener");
    }
  }

  onAcceptedFriendRequest(callback: (data: FriendRequestData) => void) {
    if (this.socket) {
      this.socket.on("acceptedFriendRequest", (data: FriendRequestData) => {
        console.log("SocketService: Received acceptedFriendRequest event:", data);
        callback(data);
      });
    } else {
      console.warn("SocketService: Socket not initialized for acceptedFriendRequest listener");
    }
  }

  onRetrievedFriendRequest(callback: (data: FriendRequestData) => void) {
    if (this.socket) {
      this.socket.on("retrievedFriendRequest", (data: FriendRequestData) => {
        console.log("SocketService: Received retrievedFriendRequest event:", data);
        callback(data);
      });
    } else {
      console.warn("SocketService: Socket not initialized for retrievedFriendRequest listener");
    }
  }

  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);
      const userId = localStorage.getItem("userId");
      if (userId) {
        this.authenticate(userId);
      }
    });

    this.socket.on("disconnect", (reason: string) => {
      console.log("Socket disconnected, reason:", reason);
      if (reason === "io server disconnect" && this.socket) {
        this.socket.connect();
      }
    });

    this.socket.on("error", (error: Error) => {
      console.error("Socket error:", error);
    });
  }
}

export default SocketService.getInstance();