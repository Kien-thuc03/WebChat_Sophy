import io, { Socket } from "socket.io-client";
import cloudinaryService from "./cloudinaryService";
import modalService from "./modalService";

// const IP_ADDRESS = "172.28.43.19";

// const SOCKET_SERVER_URL = `http://${IP_ADDRESS}:3000` || "http://localhost:3000";
const SOCKET_SERVER_URL = import.meta.env.VITE_API_BASE_URL;
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
    _doc?: any;
  };
  sender: {
    userId: string;
    fullname: string;
    avatar?: string;
  };
}

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
    lastMessage?: string | null;
    unreadCount: number;
    hasUnread: boolean;
  };
  timestamp: string;
}

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

interface CallData {
  conversationId: string;
  roomID: string;
  callerId: string;
  receiverId: string;
  isVideo: boolean;
}

interface EndCallData {
  conversationId: string;
}

interface CallErrorData {
  message: string;
}

class SocketService {
  private socket: Socket | null = null;
  private static instance: SocketService;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting: boolean = false;
  private isAuthenticated: boolean = false;
  private connectionAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 5000;
  private activeUsers: Record<string, string[]> = {};
  private onlineUsers: Set<string> = new Set();
  private userId: string | null = null;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  get socketInstance(): Socket | null {
    return this.socket;
  }

  get isConnected(): boolean {
    return !!this.socket?.connected;
  }

  connect() {
    if (this.isConnecting) {
      return this.socket;
    }

    if (this.socket?.connected) {
      return this.socket;
    }

    this.isConnecting = true;

    try {
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }

      this.socket = io(SOCKET_SERVER_URL, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 20000,
        autoConnect: true,
      });

      this.socket.on("connect", () => {
        this.connectionAttempts = 0;
        this.isConnecting = false;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }

        // Xác thực người dùng sau khi kết nối
        const userId = localStorage.getItem("userId");
        if (userId) {
          this.authenticate(userId);
          // Ensure we're listening to all important events
          // Join all existing conversations
          this.setupInitialConversations();
        }
      });

      this.socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        this.isConnecting = false;
        this.connectionAttempts++;

        if (this.connectionAttempts >= this.maxReconnectAttempts) {
          console.warn(
            "Maximum connection attempts reached, scheduling retry..."
          );
          this.scheduleRetry();
        }
      });

      this.socket.on("reconnect_attempt", (attemptNumber: number) => {
        // Connection attempt logic
      });

      this.socket.on("reconnect", () => {
        console.log("Socket reconnected successfully");
        this.connectionAttempts = 0;

        if (this.userId) {
          this.authenticate(this.userId);

          this.setupInitialConversations();
        }
      });

      this.socket.on("reconnect_error", (error: Error) => {
        console.error("Socket reconnection error:", error);
      });

      this.socket.on("reconnect_failed", () => {
        console.error("Socket reconnection failed after all attempts");
        this.isConnecting = false;
        this.scheduleRetry();
      });

      this.setupListeners();
    } catch (error) {
      console.error("Error initializing socket:", error);
      this.isConnecting = false;
    }

    return this.socket;
  }

  private scheduleRetry() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = setTimeout(() => {
      console.log("Attempting manual socket reconnect...");
      this.connectionAttempts = 0;
      this.connect();
    }, this.reconnectDelay * 2);
  }

  off(eventName: string, callback?: Function) {
    if (this.socket) {
      if (callback) {
        this.socket.off(eventName, callback as any);
      } else {
        this.socket.off(eventName);
      }
    }
  }

  authenticate(userId: string) {
    this.userId = userId;

    if (this.isAuthenticated) {
      return;
    }

    if (this.socket) {
      this.socket.emit("authenticate", userId);

      console.log("Socket authentication sent for user:", userId);
      this.isAuthenticated = true;
    } else {
      console.warn("Cannot authenticate: Socket not connected");
      this.connect();
      setTimeout(() => {
        if (this.socket && !this.isAuthenticated) {
          this.socket.emit("authenticate", userId);

          console.log(
            "Socket authentication sent after reconnect for user:",
            userId
          );
          this.isAuthenticated = true;
        }
      }, 500);
    }
  }

  emit(event: string, data?: any, callback?: (response: any) => void) {
    if (this.socket && this.socket.connected) {
      if (callback) {
        this.socket.emit(event, data, callback);
      } else {
        this.socket.emit(event, data);
      }
    } else {
      console.warn(`Socket not connected for event ${event}, reconnecting...`);
      this.connect();
      setTimeout(() => {
        if (this.socket?.connected) {
          if (callback) {
            this.socket.emit(event, data, callback);
          } else {
            this.socket.emit(event, data);
          }
        } else {
          console.error(`Failed to emit event ${event}: Socket not connected`);
          if (callback) {
            callback({
              error: "Socket not connected. Please check if server is running.",
            });
          }
        }
      }, 1000);
    }
  }

  on(eventName: string, callback: (data: any) => void) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.off(eventName, callback);
      this.socket.on(eventName, (data) => {
        callback(data);
      });
    } else {
      console.warn(
        `SocketService: Socket not initialized for ${eventName} listener`
      );
    }
  }

  onZegoToken(
    callback: (data: {
      token: string;
      appID: number;
      userId: string;
      effectiveTimeInSeconds: number;
    }) => void
  ) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.off("zegoToken");
      this.socket.on("zegoToken", (data) => {
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for zegoToken listener"
      );
    }
  }

  onStartCall(callback: (data: CallData) => void) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.off("startCall");
      this.socket.on("startCall", (data) => {
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for startCall listener"
      );
    }
  }

  onEndCall(callback: (data: EndCallData) => void) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.off("endCall");
      this.socket.on("endCall", (data) => {
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for endCall listener"
      );
    }
  }

  onCallError(callback: (data: CallErrorData) => void) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.off("callError");
      this.socket.on("callError", (data) => {
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for callError listener"
      );
    }
  }

  onReconnect(callback: () => void) {
    if (this.socket) {
      this.socket.on("connect", callback);
    }
  }

  cleanup() {}

  joinConversations(conversationIds: string[]) {
    if (!this.socket || !this.socket.connected) {
      this.connect();
      setTimeout(() => {
        if (this.socket?.connected) {
          this.socket.emit("joinUserConversations", conversationIds);
        }
      }, 1000);
      return;
    }

    this.socket.emit("joinUserConversations", conversationIds);
  }

  joinConversation(conversationId: string) {
    if (!this.socket || !this.socket.connected) {
      this.connect();
      setTimeout(() => {
        if (this.socket?.connected) {
          this.socket.emit("joinUserConversations", [conversationId]);
        }
      }, 1000);
      return;
    }

    this.socket.emit("joinUserConversations", [conversationId]);
  }

  leaveConversation(conversationId: string) {
    if (!this.socket || !this.socket.connected) {
      console.warn(
        "Socket not connected while trying to leave conversation, ignoring..."
      );
      return;
    }

    this.socket.emit("leaveUserConversations", [conversationId]);
  }

  sendTyping(conversationId: string, fullname: string) {
    const userId = localStorage.getItem("userId");
    if (!this.socket || !this.socket.connected) {
      this.connect();
      return;
    }

    if (userId) {
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
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for userTyping listener"
      );
    }
  }

  onNewMessage(callback: (data: MessageData) => void) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.off("newMessage");

      const processedMessageIds = new Map<string, number>();

      this.socket.on("newMessage", (data: any) => {
        let messageData = data.message;
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
          const now = Date.now();
          const lastProcessedTime = processedMessageIds.get(messageId);

          if (lastProcessedTime && now - lastProcessedTime < 10000) {
            return;
          }

          processedMessageIds.set(messageId, now);

          for (const [id, time] of processedMessageIds.entries()) {
            if (now - time > 30000) {
              processedMessageIds.delete(id);
            }
          }
        }

        if (data.message && data.message._doc) {
          const processedData = {
            ...data,
            message: {
              ...data.message._doc,
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
          callback(data);
        }
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for newMessage listener"
      );
    }
  }

  onNewConversation(callback: (data: ConversationData) => void) {
    if (!this.socket) {
      console.warn("Socket not connected, connecting now...");
      this.connect();
    }

    if (this.socket) {
      this.socket.off("newConversation");

      this.socket.on("newConversation", (rawData: any) => {
        let normalizedData: ConversationData;

        if (rawData.conversation) {
          normalizedData = {
            conversation: {
              ...rawData.conversation,
              lastMessage: rawData.conversation.lastMessage || null,
              unreadCount: rawData.conversation.unreadCount || 0,
              hasUnread: rawData.conversation.hasUnread || false,
            },
            timestamp: rawData.timestamp || new Date().toISOString(),
          };
        } else if (rawData.conversationId) {
          normalizedData = {
            conversation: {
              ...rawData,
              lastMessage: rawData.lastMessage || null,
              unreadCount: rawData.unreadCount || 0,
              hasUnread: rawData.hasUnread || false,
            },
            timestamp: new Date().toISOString(),
          };
        } else {
          console.error(
            "SocketService: Unknown conversation data format:",
            rawData
          );
          return;
        }

        if (!normalizedData.conversation?.conversationId) {
          console.error(
            "SocketService: Invalid conversation data format received:",
            normalizedData
          );
          return;
        }

        // Join conversation immediately
        if (normalizedData.conversation.conversationId) {
          this.joinConversation(normalizedData.conversation.conversationId);
        }

        callback(normalizedData);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for newConversation listener"
      );
    }
  }

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
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for messageRead listener"
      );
    }
  }

  markMessagesAsRead(conversationId: string, messageIds: string[]) {
    const userId = localStorage.getItem("userId");
    if (!this.socket || !this.socket.connected) {
      console.warn(
        "Socket not connected while trying to mark messages as read, reconnecting..."
      );
      this.connect();
      setTimeout(() => {
        if (this.socket?.connected && userId) {
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
      this.socket.emit("markMessagesRead", {
        conversationId,
        messageIds,
        userId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  markMessagesAsDelivered(conversationId: string, messageIds: string[]) {
    const userId = localStorage.getItem("userId");
    if (!this.socket || !this.socket.connected) {
      console.warn(
        "Socket not connected while trying to mark messages as delivered, reconnecting..."
      );
      this.connect();
      setTimeout(() => {
        if (this.socket?.connected && userId) {
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
      // Đảm bảo chúng ta gửi đầy đủ thông tin để cập nhật mảng deliveredTo trên server
      this.socket.emit("messageDelivered", {
        conversationId,
        messageIds,
        userId,
        timestamp: new Date().toISOString(),
      });
    }
  }

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
        callback(data);
      });
    }
  }

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

    // Xử lý sự kiện forceLogout khi tài khoản được đăng nhập ở thiết bị khác
    this.socket.on("forceLogout", (data: { deviceType: string, message?: string }) => {
      if (data.deviceType === "browser") {
        // Hiển thị thông báo bằng modal thay vì alert
        modalService.showModal({
          title: "Phiên đăng nhập hết hạn",
          message: data.message || "Tài khoản đang được đăng nhập ở một thiết bị khác",
          type: "error",
          showClose: false,
          redirectUrl: "/",
          autoClose: true,
          autoCloseDelay: 3000
        });
        
        // Thực hiện đăng xuất
        this.isAuthenticated = false;
        this.userId = null;
        
        // Xóa thông tin đăng nhập
        localStorage.clear();
        sessionStorage.clear();
      }
    });
  }

  userEnterConversation(conversationId: string) {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    if (this.socket?.connected) {
      this.socket.emit("userActiveInConversation", {
        conversationId,
        userId,
        active: true,
      });
    }
  }

  userLeaveConversation(conversationId: string) {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    if (this.socket?.connected) {
      this.socket.emit("userActiveInConversation", {
        conversationId,
        userId,
        active: false,
      });
    }
  }

  listenToUserActivityStatus() {
    if (!this.socket) this.connect();

    if (this.socket) {
      this.socket.on(
        "userActivityUpdate",
        (data: { conversationId: string; activeUsers: string[] }) => {
          this.activeUsers[data.conversationId] = data.activeUsers;
          this.socket?.emit("activeStatusUpdated", {
            conversationId: data.conversationId,
            activeUsers: data.activeUsers,
          });
        }
      );
    }
  }

  isUserActiveInConversation(conversationId: string, userId: string): boolean {
    return this.activeUsers[conversationId]?.includes(userId) || false;
  }

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

          this.socket?.emit("onlineStatusUpdated", {
            onlineUsers: Array.from(this.onlineUsers),
          });
        }
      );
    }
  }

  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers);
  }

  async sendFileMessage(conversationId: string, file: File): Promise<any> {
    try {
      if (!this.isConnected) {
        console.warn(
          "Socket not connected while trying to send file, reconnecting..."
        );
        this.connect();
        await new Promise((resolve) => {
          const checkConnection = setInterval(() => {
            if (this.isConnected) {
              clearInterval(checkConnection);
              resolve(true);
            }
          }, 100);

          setTimeout(() => {
            clearInterval(checkConnection);
            resolve(false);
          }, 5000);
        });
      }

      // Sử dụng hàm sendFileMessage từ cloudinaryService thay vì chỉ uploadToCloudinary
      const result = await cloudinaryService.sendFileMessage(
        file,
        conversationId
      );

      return result;
    } catch (error) {
      console.error("Error sending file message:", error);
      throw error;
    }
  }

  getFilePreview(attachment: FileAttachment): string {
    const type = attachment.type;

    if (type === "image") {
      return attachment.url;
    } else if (type === "video") {
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

    return "/images/file-icon.png";
  }

  onMessageRecall(
    callback: (data: { conversationId: string; messageId: string }) => void
  ) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.on("messageRecalled", (data) => {
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for messageRecalled listener"
      );
    }
  }

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
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for messageDeleted listener"
      );
    }
  }

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
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for messagePinned listener"
      );
    }
  }

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
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for messageUnpinned listener"
      );
    }
  }

  private async setupInitialConversations() {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        return;
      }

      const conversationsData = localStorage.getItem("lastConversations");
      if (conversationsData) {
        const conversations = JSON.parse(conversationsData);
        if (Array.isArray(conversations) && conversations.length > 0) {
          const conversationIds = conversations
            .map((conv) => conv.conversationId)
            .filter(Boolean);
          if (conversationIds.length > 0) {
            this.joinConversations(conversationIds);
          }
        }
      }
    } catch (error) {
      console.error("Error setting up initial conversations:", error);
    }
  }

  // Group management events
  onUserJoinedGroup(
    callback: (data: { conversationId: string; userId: string }) => void
  ) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.off("userJoinedGroup");
      this.socket.on("userJoinedGroup", (data) => {
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for userJoinedGroup listener"
      );
    }
  }

  onUserLeftGroup(
    callback: (data: { conversationId: string; userId: string }) => void
  ) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      // Remove any existing listener first
      this.socket.off("userLeftGroup");
      // Add new listener
      this.socket.on("userLeftGroup", (data) => {
        console.log("User left group event received:", data);
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for userLeftGroup listener"
      );
    }
  }

  onGroupNameChanged(
    callback: (data: { 
      conversationId: string; 
      newName: string;
      changedBy?: { 
        userId: string; 
        fullname: string 
      };
    }) => void
  ) {
    this.on("groupNameChanged", callback);
  }

  onGroupAvatarChanged(
    callback: (data: { 
      conversationId: string; 
      newAvatar: string;
      changedBy?: { 
        userId: string; 
        fullname: string 
      };
    }) => void
  ) {
    this.on("groupAvatarChanged", callback);
  }

  onGroupOwnerChanged(
    callback: (data: { conversationId: string; newOwner: string }) => void
  ) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.off("groupOwnerChanged");
      this.socket.on("groupOwnerChanged", (data) => {
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for groupOwnerChanged listener"
      );
    }
  }

  onGroupCoOwnerAdded(
    callback: (data: {
      conversationId: string;
      newCoOwnerIds: string[];
    }) => void
  ) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.off("groupCoOwnerAdded");
      this.socket.on("groupCoOwnerAdded", (data) => {
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for groupCoOwnerAdded listener"
      );
    }
  }

  onGroupCoOwnerRemoved(
    callback: (data: { conversationId: string; removedCoOwner: string }) => void
  ) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.off("groupCoOwnerRemoved");
      this.socket.on("groupCoOwnerRemoved", (data) => {
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for groupCoOwnerRemoved listener"
      );
    }
  }

  onUserAddedToGroup(callback: (data: any) => void) {
    this.on("userAddedToGroup", callback);
  }

  emitUserAddedToGroup(data: {
    conversationId: string;
    addedUser: { userId: string; fullname: string };
    addedByUser: { userId: string; fullname: string };
  }) {
    this.emit("userAddedToGroup", data);
  }

  onUserRemovedFromGroup(
    callback: (data: {
      conversationId: string;
      kickedUser: { userId: string; fullname: string };
      kickedByUser: { userId: string; fullname: string };
    }) => void
  ) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.off("userRemovedFromGroup");
      this.socket.on("userRemovedFromGroup", (data) => {
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for userRemovedFromGroup listener"
      );
    }
  }

  onGroupDeleted(callback: (data: { conversationId: string }) => void) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.off("groupDeleted");
      this.socket.on("groupDeleted", (data) => {
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for groupDeleted listener"
      );
    }
  }

  // User blocking events
  onUserBlocked(
    callback: (data: { conversationId: string; blockedUserId: string }) => void
  ) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.off("userBlocked");
      this.socket.on("userBlocked", (data) => {
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for userBlocked listener"
      );
    }
  }

  onUserUnblocked(
    callback: (data: {
      conversationId: string;
      unblockedUserId: string;
    }) => void
  ) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.off("userUnblocked");
      this.socket.on("userUnblocked", (data) => {
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for userUnblocked listener"
      );
    }
  }

  // Notification events
  onNewNotification(
    callback: (data: { conversationId: string; notification: any }) => void
  ) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      this.socket.off("newNotification");
      this.socket.on("newNotification", (data) => {
        callback(data);
      });
    } else {
      console.warn(
        "SocketService: Socket not initialized for newNotification listener"
      );
    }
  }

  // Token refresh
  refreshZegoToken() {
    if (!this.socket || !this.socket.connected) {
      this.connect();
      setTimeout(() => {
        if (this.socket?.connected) {
          this.socket.emit("refreshZegoToken");
        }
      }, 1000);
      return;
    }

    this.socket.emit("refreshZegoToken");
  }
}

export default SocketService.getInstance();
