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

// Thêm interface cho tin nhắn
interface MessageData {
  conversationId: string;
  message: {
    messageDetailId?: string;
    messageId?: string;
    content: string;
    type: string;
    senderId: string;
    attachment?: any;
    attachments?: any;
    createdAt: string;
    readBy: string[];
    deliveredTo: string[];
    _doc?: any; // Thêm trường _doc để xử lý document MongoDB
  };
  sender: {
    userId: string;
    fullname: string;
    avatar?: string;
  };
}

class SocketService {
  private socket: Socket | null = null;
  private static instance: SocketService;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting: boolean = false;
  private connectionAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  // Getter cho socket để có thể truy cập từ bên ngoài
  get socketInstance(): Socket | null {
    return this.socket;
  }

  // Kiểm tra xem socket có đang kết nối hay không
  get isConnected(): boolean {
    return !!this.socket?.connected;
  }

  connect() {
    // Nếu đang trong quá trình kết nối, không thực hiện kết nối mới
    if (this.isConnecting) {
      console.log("Socket connection already in progress, skipping");
      return this.socket;
    }

    // Nếu đã có kết nối hoạt động, trả về kết nối hiện tại
    if (this.socket?.connected) {
      console.log("Socket already connected, reusing connection");
      return this.socket;
    }

    this.isConnecting = true;
    console.log("Initializing socket connection...");

    try {
      // Đóng kết nối cũ nếu có
      if (this.socket) {
        console.log("Closing existing socket before creating new one");
        this.socket.close();
        this.socket = null;
      }

      // Tạo kết nối mới
      this.socket = io(SOCKET_SERVER_URL, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        timeout: 10000,
        autoConnect: true,
      });

      this.socket.on("connect", () => {
        console.log("Socket connected successfully:", this.socket?.id);
        this.connectionAttempts = 0;
        this.isConnecting = false;
        
        // Xác thực người dùng sau khi kết nối
        const userId = localStorage.getItem("userId");
        if (userId) {
          this.authenticate(userId);
        }
      });

      this.socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        this.isConnecting = false;
        this.connectionAttempts++;
        
        if (this.connectionAttempts > this.maxReconnectAttempts) {
          console.error("Maximum connection attempts reached, giving up");
        }
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
        this.isConnecting = false;
      });

      this.socket.on("disconnect", (reason) => {
        console.log("Socket disconnected, reason:", reason);
        this.isConnecting = false;
        
        // Thử kết nối lại nếu server ngắt kết nối
        if (reason === "io server disconnect" && this.socket) {
          // Đợi 2 giây trước khi thử kết nối lại
          setTimeout(() => {
            this.socket?.connect();
          }, 2000);
        }
      });

      this.setupListeners();
    } catch (error) {
      console.error("Error initializing socket:", error);
      this.isConnecting = false;
    }

    return this.socket;
  }

  // Thêm phương thức off để hủy đăng ký sự kiện
  off(eventName: string, callback: Function) {
    if (this.socket) {
      this.socket.off(eventName, callback as any);
    }
  }

  authenticate(userId: string) {
    if (this.socket) {
      this.socket.emit("authenticate", userId);
      console.log("Socket authentication sent for user:", userId);
    } else {
      console.warn("Cannot authenticate: Socket not connected");
      // Tự động kết nối nếu chưa có socket
      this.connect();
      // Gửi xác thực sau 500ms để đảm bảo kết nối đã được thiết lập
      setTimeout(() => {
        if (this.socket) {
          this.socket.emit("authenticate", userId);
          console.log("Socket authentication sent after reconnect for user:", userId);
        }
      }, 500);
    }
  }

  onReconnect(callback: () => void) {
    if (this.socket) {
      this.socket.on("connect", callback);
    }
  }

  disconnect() {
    // Xóa bất kỳ timer nào đang chạy
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      // Gửi event thông báo cho server là đang ngắt kết nối có chủ ý
      try {
        this.socket.emit("intentionalDisconnect");
        console.log("Emitted intentional disconnect event");
      } catch (error) {
        console.error("Error emitting intentional disconnect:", error);
      }

      try {
        this.socket.disconnect();
        console.log("Socket disconnected successfully");
      } catch (error) {
        console.error("Error disconnecting socket:", error);
      }

      this.socket = null;
      this.isConnecting = false;
      console.log("Socket reference cleared");
    } else {
      console.log("Socket already disconnected, nothing to do");
    }
  }

  cleanup() {
    console.log("Performing socket cleanup");
    this.disconnect();
  }

  // Thêm phương thức để tham gia vào các cuộc trò chuyện
  joinConversations(conversationIds: string[]) {
    if (!this.socket || !this.socket.connected) {
      console.warn("Socket not connected while trying to join conversations, reconnecting...");
      this.connect();
      // Thử lại sau 1 giây
      setTimeout(() => {
        if (this.socket?.connected) {
          console.log("Joining conversations after reconnect:", conversationIds);
          this.socket.emit("joinUserConversations", conversationIds);
        } else {
          console.error("Failed to connect socket for joining conversations");
        }
      }, 1000);
      return;
    }

    console.log("Joining conversations:", conversationIds);
    this.socket.emit("joinUserConversations", conversationIds);
  }

  // Phương thức để gửi sự kiện đang nhập
  sendTyping(conversationId: string, fullname: string) {
    const userId = localStorage.getItem("userId");
    if (!this.socket || !this.socket.connected) {
      this.connect();
      return;
    }
    
    if (userId) {
      this.socket.emit("typing", { conversationId, userId, fullname });
    }
  }

  // Lắng nghe sự kiện có người đang nhập
  onUserTyping(callback: (data: { conversationId: string, userId: string, fullname: string }) => void) {
    if (!this.socket) {
      this.connect();
    }
    
    if (this.socket) {
      this.socket.on("userTyping", (data) => {
        console.log("SocketService: User typing:", data);
        callback(data);
      });
    } else {
      console.warn("SocketService: Socket not initialized for userTyping listener");
    }
  }

  // Lắng nghe sự kiện tin nhắn mới
  onNewMessage(callback: (data: MessageData) => void) {
    if (!this.socket) {
      this.connect();
    }
    
    if (this.socket) {
      // Remove any existing listeners for this event first to prevent duplicates
      this.socket.off("newMessage");
      
      this.socket.on("newMessage", (data: any) => {
        console.log("SocketService: Received new message:", data);
        
        // Xử lý trường hợp nhận được document MongoDB
        if (data.message && data.message._doc) {
          // Sử dụng dữ liệu từ _doc
          const processedData = {
            ...data,
            message: {
              ...data.message._doc,
              // Đảm bảo tất cả các trường cần thiết đều có
              messageDetailId: data.message._doc.messageDetailId || data.message.messageId || data.message._id,
              messageId: data.message._doc.messageId || data.message.messageDetailId || data.message._id,
            }
          };
          callback(processedData);
        } else {
          // Trường hợp thông thường
          callback(data);
        }
      });
    } else {
      console.warn("SocketService: Socket not initialized for newMessage listener");
    }
  }

  // Lắng nghe sự kiện tin nhắn đã đọc
  onMessageRead(callback: (data: { conversationId: string, messageIds: string[], userId: string }) => void) {
    if (!this.socket) {
      this.connect();
    }
    
    if (this.socket) {
      this.socket.on("messageRead", (data) => {
        console.log("SocketService: Message read event:", data);
        callback(data);
      });
    } else {
      console.warn("SocketService: Socket not initialized for messageRead listener");
    }
  }

  // Gửi trạng thái đã đọc tin nhắn
  markMessagesAsRead(conversationId: string, messageIds: string[]) {
    const userId = localStorage.getItem("userId");
    if (!this.socket || !this.socket.connected) {
      console.warn("Socket not connected while trying to mark messages as read, reconnecting...");
      this.connect();
      // Thử lại sau 500ms
      setTimeout(() => {
        if (this.socket?.connected && userId) {
          this.socket.emit("markMessagesRead", { conversationId, messageIds, userId });
        }
      }, 500);
      return;
    }
    
    if (userId) {
      this.socket.emit("markMessagesRead", { conversationId, messageIds, userId });
      console.log("SocketService: Marking messages as read:", { conversationId, messageIds });
    }
  }

  // Lắng nghe sự kiện tin nhắn đã gửi thành công
  onMessageDelivered(callback: (data: { conversationId: string, messageIds: string[], userId: string }) => void) {
    if (!this.socket) {
      this.connect();
    }
    
    if (this.socket) {
      this.socket.on("messageDelivered", (data) => {
        console.log("SocketService: Message delivered event:", data);
        callback(data);
      });
    }
  }

  onNewFriendRequest(callback: (data: FriendRequestData) => void) {
    if (!this.socket) {
      this.connect();
    }
    
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
    if (!this.socket) {
      this.connect();
    }
    
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
    if (!this.socket) {
      this.connect();
    }
    
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
    if (!this.socket) {
      this.connect();
    }
    
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

    this.socket.on("error", (error: Error) => {
      console.error("Socket error:", error);
    });
  }
}

export default SocketService.getInstance();