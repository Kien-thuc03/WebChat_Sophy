// socketService.ts
import io, { Socket } from "socket.io-client";
import cloudinaryService from "./cloudinaryService";

const IP_ADDRESS = "172.28.43.19";

// const SOCKET_SERVER_URL = `http://${IP_ADDRESS}:3000` || "http://localhost:3000";
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

// Add new interface for conversation data
interface ConversationData {
  conversation: {
    conversationId: string;
    creatorId: string;
    receiverId: string;
    createdAt: string;
    isGroup?: boolean;
    groupName?: string;
    groupMembers?: string[];
    lastChange?: string;
  };
  timestamp: string;
}

// Interface for file attachment
interface FileAttachment {
  name: string;
  type: string;
  size: number;
  url: string;
  downloadUrl: string;
  publicId?: string;
  format?: string;
  mimeType?: string;
}

class SocketService {
  private socket: Socket | null = null;
  private static instance: SocketService;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting: boolean = false;
  private connectionAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private activeUsers: Record<string, string[]> = {}; // Mapping giữa conversationId và danh sách userId đang active
  private onlineUsers: Set<string> = new Set();

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

          // Ensure we're listening to all important events
          console.log("Setting up all socket event listeners after connection");
          // Join all existing conversations
          this.setupInitialConversations();
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
          this.setupInitialConversations();
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
          console.log(
            "Socket authentication sent after reconnect for user:",
            userId
          );
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
      console.warn(
        "Socket not connected while trying to join conversations, reconnecting..."
      );
      this.connect();
      // Thử lại sau 1 giây
      setTimeout(() => {
        if (this.socket?.connected) {
          console.log(
            "Joining conversations after reconnect:",
            conversationIds
          );
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

  // Thêm phương thức để rời khỏi cuộc trò chuyện
  leaveConversation(conversationId: string) {
    if (!this.socket || !this.socket.connected) {
      console.warn(
        "Socket not connected while trying to leave conversation, ignoring..."
      );
      return;
    }

    console.log("Leaving conversation:", conversationId);
    this.socket.emit("leaveUserConversations", [conversationId]);
  }

  // Phương thức để gửi sự kiện đang nhập
  sendTyping(conversationId: string, fullname: string) {
    const userId = localStorage.getItem("userId");
    if (!this.socket || !this.socket.connected) {
      this.connect();
      return;
    }

    if (userId) {
      // Sử dụng .volatile để không lưu vào hàng đợi nếu kết nối bị gián đoạn
      if (this.socket.volatile) {
        this.socket.volatile.emit("typing", {
          conversationId,
          userId,
          fullname,
        });
      } else {
        this.socket.emit("typing", { conversationId, userId, fullname });
      }
    }
  }

  // Lắng nghe sự kiện có người đang nhập
  onUserTyping(
    callback: (data: {
      conversationId: string;
      userId: string;
      fullname: string;
    }) => void
  ) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.on("userTyping", (data) => {
        console.log("SocketService: User typing:", data);
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for userTyping listener"
      );
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

      // Thêm theo dõi tin nhắn đã xử lý để ngăn trùng lặp
      const processedMessageIds = new Map<string, number>(); // Map lưu ID tin nhắn và thời gian nhận

      this.socket.on("newMessage", (data: any) => {
        console.log("SocketService: Received new message:", data);

        // Xử lý trường hợp nhận được document MongoDB
        let messageData = data.message;

        // Lấy ID tin nhắn từ nhiều khả năng
        const messageId =
          messageData.messageDetailId ||
          messageData.messageId ||
          (messageData._doc &&
            (messageData._doc.messageDetailId ||
              messageData._doc.messageId ||
              messageData._doc._id));

        if (!messageId) {
          console.warn(
            "SocketService: Message without ID received, cannot check for duplication"
          );
        } else {
          // Kiểm tra tin nhắn đã được xử lý trong 10 giây qua chưa
          const now = Date.now();
          const lastProcessedTime = processedMessageIds.get(messageId);

          if (lastProcessedTime && now - lastProcessedTime < 10000) {
            console.log(
              `SocketService: Duplicate message detected and skipped (ID: ${messageId})`
            );
            return; // Bỏ qua tin nhắn trùng lặp
          }

          // Lưu tin nhắn này vào danh sách đã xử lý
          processedMessageIds.set(messageId, now);

          // Dọn dẹp danh sách tin nhắn đã xử lý (chỉ giữ trong 30 giây)
          for (const [id, time] of processedMessageIds.entries()) {
            if (now - time > 30000) {
              processedMessageIds.delete(id);
            }
          }
        }

        // Xử lý trường hợp nhận được document MongoDB
        if (data.message && data.message._doc) {
          // Sử dụng dữ liệu từ _doc
          const processedData = {
            ...data,
            message: {
              ...data.message._doc,
              // Đảm bảo tất cả các trường cần thiết đều có
              messageDetailId:
                data.message._doc.messageDetailId ||
                data.message.messageId ||
                data.message._id,
              messageId:
                data.message._doc.messageId ||
                data.message.messageDetailId ||
                data.message._id,
            },
          };
          callback(processedData);
        } else {
          // Trường hợp thông thường
          callback(data);
        }
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for newMessage listener"
      );
    }
  }

  // Add listener for new conversation events
  onNewConversation(callback: (data: ConversationData) => void) {
    if (!this.socket) {
      console.warn("Socket not connected, connecting now...");
      this.connect();
    }

    if (this.socket) {
      // Remove any existing listeners for this event first to prevent duplicates
      this.socket.off("newConversation");

      console.log("SocketService: Registering newConversation event listener");

      this.socket.on("newConversation", (rawData: any) => {
        console.log(
          "SocketService: Received raw newConversation event:",
          rawData
        );

        // Normalize the data based on possible server formats
        let normalizedData: ConversationData;

        if (rawData.conversation) {
          // Format is already { conversation: {...}, timestamp: ... }
          normalizedData = rawData as ConversationData;
        } else if (rawData.conversationId) {
          // Format is the direct conversation object without wrapping
          normalizedData = {
            conversation: rawData,
            timestamp: new Date().toISOString(),
          };
        } else {
          console.error(
            "SocketService: Unknown conversation data format:",
            rawData
          );
          return;
        }

        // Check if data has the expected structure
        if (!normalizedData.conversation?.conversationId) {
          console.error(
            "SocketService: Invalid conversation data format received:",
            normalizedData
          );
          return;
        }

        const userId = localStorage.getItem("userId");
        const { creatorId, receiverId } = normalizedData.conversation;

        console.log(
          `SocketService: New conversation - creator: ${creatorId}, receiver: ${receiverId}, current user: ${userId}`
        );

        // Process the conversation data
        callback(normalizedData);

        // Also join the conversation room immediately
        if (normalizedData.conversation.conversationId) {
          console.log(
            "SocketService: Auto-joining new conversation room:",
            normalizedData.conversation.conversationId
          );
          this.joinConversations([normalizedData.conversation.conversationId]);
        }
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for newConversation listener"
      );
    }
  }

  // Lắng nghe sự kiện tin nhắn đã đọc
  onMessageRead(
    callback: (data: {
      conversationId: string;
      messageIds: string[];
      userId: string;
    }) => void
  ) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.on("messageRead", (data) => {
        console.log("SocketService: Message read event:", data);
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for messageRead listener"
      );
    }
  }

  // Gửi trạng thái đã đọc tin nhắn - đây là message quan trọng nên không dùng volatile
  markMessagesAsRead(conversationId: string, messageIds: string[]) {
    const userId = localStorage.getItem("userId");
    if (!this.socket || !this.socket.connected) {
      console.warn(
        "Socket not connected while trying to mark messages as read, reconnecting..."
      );
      this.connect();
      // Thử lại sau 500ms
      setTimeout(() => {
        if (this.socket?.connected && userId) {
          console.log("Socket reconnected, marking messages as read:", {
            conversationId,
            messageIds,
            userId,
          });
          this.socket.emit("markMessagesRead", {
            conversationId,
            messageIds,
            userId,
          });
        }
      }, 500);
      return;
    }

    if (userId) {
      console.log("SocketService: Marking messages as read:", {
        conversationId,
        messageIds,
        userId,
      });
      // Đảm bảo chúng ta gửi đầy đủ thông tin để cập nhật mảng readBy trên server
      this.socket.emit("markMessagesRead", {
        conversationId,
        messageIds,
        userId,
        timestamp: new Date().toISOString(), // Thêm timestamp để server biết thời điểm đọc
      });
    }
  }

  // Gửi trạng thái đã nhận tin nhắn - đây là message quan trọng nên không dùng volatile
  markMessagesAsDelivered(conversationId: string, messageIds: string[]) {
    const userId = localStorage.getItem("userId");
    if (!this.socket || !this.socket.connected) {
      console.warn(
        "Socket not connected while trying to mark messages as delivered, reconnecting..."
      );
      this.connect();
      // Thử lại sau 500ms
      setTimeout(() => {
        if (this.socket?.connected && userId) {
          console.log("Socket reconnected, marking messages as delivered:", {
            conversationId,
            messageIds,
            userId,
          });
          this.socket.emit("messageDelivered", {
            conversationId,
            messageIds,
            userId,
          });
        }
      }, 500);
      return;
    }

    if (userId) {
      console.log("SocketService: Marking messages as delivered:", {
        conversationId,
        messageIds,
        userId,
      });
      // Đảm bảo chúng ta gửi đầy đủ thông tin để cập nhật mảng deliveredTo trên server
      this.socket.emit("messageDelivered", {
        conversationId,
        messageIds,
        userId,
        timestamp: new Date().toISOString(), // Thêm timestamp để server biết thời điểm nhận
      });
    }
  }

  // Lắng nghe sự kiện tin nhắn đã gửi thành công
  onMessageDelivered(
    callback: (data: {
      conversationId: string;
      messageIds: string[];
      userId: string;
    }) => void
  ) {
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

  // Add this method to check if current user is the sender of a friend request
  isFriendRequestSender(data: FriendRequestData): boolean {
    const currentUserId = localStorage.getItem("userId");
    return data.sender.userId === currentUserId;
  }

  onNewFriendRequest(callback: (data: FriendRequestData) => void) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.on("newFriendRequest", (data: FriendRequestData) => {
        console.log("SocketService: Received newFriendRequest event:", data);
        // Only notify if the current user is the sender
        if (this.isFriendRequestSender(data)) {
          console.log(
            "SocketService: Current user is the sender, showing notification"
          );
        } else {
          console.log(
            "SocketService: Current user is the receiver, skipping notification"
          );
        }
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for newFriendRequest listener"
      );
    }
  }

  onRejectedFriendRequest(callback: (data: FriendRequestData) => void) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.on("rejectedFriendRequest", (data: FriendRequestData) => {
        console.log(
          "SocketService: Received rejectedFriendRequest event:",
          data
        );
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for rejectedFriendRequest listener"
      );
    }
  }

  onAcceptedFriendRequest(callback: (data: FriendRequestData) => void) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.on("acceptedFriendRequest", (data: FriendRequestData) => {
        console.log(
          "SocketService: Received acceptedFriendRequest event:",
          data
        );
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for acceptedFriendRequest listener"
      );
    }
  }

  onRetrievedFriendRequest(callback: (data: FriendRequestData) => void) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.on("retrievedFriendRequest", (data: FriendRequestData) => {
        console.log(
          "SocketService: Received retrievedFriendRequest event:",
          data
        );
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for retrievedFriendRequest listener"
      );
    }
  }

  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on("error", (error: Error) => {
      console.error("Socket error:", error);
    });
  }

  // Phương thức để cập nhật trạng thái active của user trong conversation
  userEnterConversation(conversationId: string) {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    // Thông báo cho server rằng user đang xem conversation này
    if (this.socket?.connected) {
      this.socket.emit("userActiveInConversation", {
        conversationId,
        userId,
        active: true,
      });
    }
  }

  // Phương thức để thông báo user rời khỏi conversation
  userLeaveConversation(conversationId: string) {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    // Thông báo cho server rằng user đã rời khỏi conversation này
    if (this.socket?.connected) {
      this.socket.emit("userActiveInConversation", {
        conversationId,
        userId,
        active: false,
      });
    }
  }

  // Lắng nghe sự kiện user active trong conversation
  listenToUserActivityStatus() {
    if (!this.socket) this.connect();

    if (this.socket) {
      this.socket.on(
        "userActivityUpdate",
        (data: { conversationId: string; activeUsers: string[] }) => {
          // Cập nhật danh sách người dùng đang active trong conversation
          this.activeUsers[data.conversationId] = data.activeUsers;

          // Phát ra event để các component có thể cập nhật UI
          this.socket?.emit("activeStatusUpdated", {
            conversationId: data.conversationId,
            activeUsers: data.activeUsers,
          });
        }
      );
    }
  }

  // Kiểm tra xem một user có đang active trong conversation không
  isUserActiveInConversation(conversationId: string, userId: string): boolean {
    return this.activeUsers[conversationId]?.includes(userId) || false;
  }

  // Lấy danh sách những người đang active trong conversation
  getActiveUsersInConversation(conversationId: string): string[] {
    return this.activeUsers[conversationId] || [];
  }

  listenToOnlineStatus() {
    if (!this.socket) this.connect();

    if (this.socket) {
      this.socket.on(
        "userStatusUpdate",
        (data: { userId: string; online: boolean }) => {
          if (data.online) {
            this.onlineUsers.add(data.userId);
          } else {
            this.onlineUsers.delete(data.userId);
          }

          // Phát ra event để các component có thể cập nhật UI
          this.socket?.emit("onlineStatusUpdated", {
            onlineUsers: Array.from(this.onlineUsers),
          });
        }
      );
    }
  }

  // Kiểm tra xem một user có đang online không
  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  // Lấy danh sách những người đang online
  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers);
  }

  // New method: Send a file message
  async sendFileMessage(conversationId: string, file: File): Promise<any> {
    try {
      if (!this.isConnected) {
        console.warn(
          "Socket not connected while trying to send file, reconnecting..."
        );
        this.connect();
        // Wait for connection
        await new Promise((resolve) => {
          const checkConnection = setInterval(() => {
            if (this.isConnected) {
              clearInterval(checkConnection);
              resolve(true);
            }
          }, 100);

          // Timeout after 5 seconds
          setTimeout(() => {
            clearInterval(checkConnection);
            resolve(false);
          }, 5000);
        });
      }

      console.log("Bắt đầu tải lên file và gửi tin nhắn...");

      // Sử dụng hàm sendFileMessage từ cloudinaryService thay vì chỉ uploadToCloudinary
      // Đây là bước quan trọng vì hàm này đã được cập nhật để gửi dữ liệu đến API
      const result = await cloudinaryService.sendFileMessage(
        file,
        conversationId
      );

      console.log("Hoàn tất quá trình tải lên và lưu vào database:", result);

      return result;
    } catch (error) {
      console.error("Error sending file message:", error);
      throw error;
    }
  }

  // Add method to get file URL preview
  getFilePreview(attachment: FileAttachment): string {
    const type = attachment.type;

    if (type === "image") {
      return attachment.url;
    } else if (type === "video") {
      // Return video thumbnail or default video icon
      return (
        attachment.url.replace(/\.[^/.]+$/, ".jpg") || "/images/video-icon.png"
      );
    } else if (type === "audio") {
      return "/images/audio-icon.png";
    } else if (type === "document") {
      if (attachment.format === "pdf") {
        return "/images/pdf-icon.png";
      } else if (["doc", "docx"].includes(attachment.format || "")) {
        return "/images/word-icon.png";
      } else if (["xls", "xlsx"].includes(attachment.format || "")) {
        return "/images/excel-icon.png";
      } else if (["ppt", "pptx"].includes(attachment.format || "")) {
        return "/images/powerpoint-icon.png";
      }
      return "/images/document-icon.png";
    }

    // Default file icon
    return "/images/file-icon.png";
  }

  // Listen for message recall events
  onMessageRecall(
    callback: (data: { conversationId: string; messageId: string }) => void
  ) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.on("messageRecalled", (data) => {
        console.log("SocketService: Message recall event:", data);
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for messageRecalled listener"
      );
    }
  }

  // Listen for message deletion events (when a message is hidden from a specific user)
  onMessageDeleted(
    callback: (data: {
      conversationId: string;
      messageId: string;
      userId: string;
    }) => void
  ) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.on("messageDeleted", (data) => {
        console.log("SocketService: Message delete event:", data);
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for messageDeleted listener"
      );
    }
  }

  // Listen for message pin events
  onMessagePinned(
    callback: (data: {
      conversationId: string;
      messageId: string;
      userId: string;
      pinnedAt: string;
    }) => void
  ) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.on("messagePinned", (data) => {
        console.log("SocketService: Message pinned event:", data);
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for messagePinned listener"
      );
    }
  }

  // Listen for message unpin events
  onMessageUnpinned(
    callback: (data: {
      conversationId: string;
      messageId: string;
      userId: string;
    }) => void
  ) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.on("messageUnpinned", (data) => {
        console.log("SocketService: Message unpinned event:", data);
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for messageUnpinned listener"
      );
    }
  }

  // Add a helper method to set up initial conversations
  private async setupInitialConversations() {
    try {
      console.log("Looking for existing conversations to join...");
      // Get the current user's ID
      const userId = localStorage.getItem("userId");
      if (!userId) {
        console.log("No user ID found, skipping conversation setup");
        return;
      }

      // Check if we have a list of conversations in localStorage
      const conversationsData = localStorage.getItem("lastConversations");
      if (conversationsData) {
        const conversations = JSON.parse(conversationsData);
        if (Array.isArray(conversations) && conversations.length > 0) {
          const conversationIds = conversations
            .map((conv) => conv.conversationId)
            .filter(Boolean);
          if (conversationIds.length > 0) {
            console.log(
              "Joining previously saved conversations:",
              conversationIds
            );
            this.joinConversations(conversationIds);
          }
        }
      }
    } catch (error) {
      console.error("Error setting up initial conversations:", error);
    }
  }
}

export default SocketService.getInstance();
