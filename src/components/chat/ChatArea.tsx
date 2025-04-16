import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Input,
  Button,
  message,
  Alert,
  Empty,
  Spin,
  Popover,
  Tooltip,
} from "antd";
import {
  SendOutlined,
  CameraOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  EnvironmentOutlined,
  BarChartOutlined,
  PaperClipOutlined,
  ReloadOutlined,
  DownOutlined,
  SmileOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import {
  Conversation,
  Message,
} from "../../features/chat/types/conversationTypes";
import {
  getMessages,
  sendMessage,
  sendImageMessage,
  sendMessageWithImage,
  fetchConversations,
  getConversationDetail,
} from "../../api/API";
import { useLanguage } from "../../features/auth/context/LanguageContext";
import { formatMessageTime } from "../../utils/dateUtils";
import { Avatar } from "../common/Avatar";
import { DisplayMessage } from "../../features/chat/types/chatTypes";
import { useConversationContext } from "../../features/chat/context/ConversationContext";
import { BsEmojiSmile } from "react-icons/bs";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import socketService from "../../utils/socketService";

// Chuyển đổi Message từ API sang định dạng tin nhắn cần hiển thị


interface ChatAreaProps {
  conversation: Conversation;
}

const ChatArea: React.FC<ChatAreaProps> = ({ conversation }) => {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingNewer, setLoadingNewer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [hasNewer, setHasNewer] = useState(false);
  const [oldestCursor, setOldestCursor] = useState<string | null>(null);
  const [newestCursor, setNewestCursor] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Array<File>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const { userCache, updateConversationWithNewMessage } =
    useConversationContext();
  const currentUserId = localStorage.getItem("userId") || "";
  const [imageInputVisible, setImageInputVisible] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  
  // Thêm state để theo dõi ảnh từ paste
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const [pastedImagePreview, setPastedImagePreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [typingUsers, setTypingUsers] = useState<{[key: string]: {userId: string, fullname: string, timestamp: number}}>({});
  const [typingTimers, setTypingTimers] = useState<{[key: string]: NodeJS.Timeout}>({});
  
  // Thêm typing timeout
  const TYPING_TIMEOUT = 3000; // 3 giây

  // Kiểm tra xem conversation có hợp lệ không
  const isValidConversation =
    conversation &&
    conversation.conversationId && 
    typeof conversation.conversationId === "string" &&
    conversation.conversationId.startsWith("conv");

  useEffect(() => {
    // Reset state khi chuyển cuộc trò chuyện
    setMessages([]);
    setError(null);
    setNotFound(false);
    setHasMore(false);
    setHasNewer(false);
    setOldestCursor(null);
    setNewestCursor(null);
    
    // Reset typing state
    setTypingUsers({});
    
    // Xóa tất cả timers hiện có
    Object.values(typingTimers).forEach(timer => clearTimeout(timer));
    setTypingTimers({});
    
    // Chỉ tải tin nhắn và thiết lập socket khi conversation hợp lệ
    if (isValidConversation) {
      // Tải tin nhắn gần nhất với hướng 'before' và không có cursor
      fetchMessages(undefined, "before");
      
      // Tham gia vào phòng chat
      socketService.joinConversations([conversation.conversationId]);
      
      // Callback để xử lý tin nhắn mới từ socket
      const handleNewMessage = (data: any) => {
        console.log("New message from socket:", data);
        
        // Kiểm tra xem tin nhắn thuộc conversation hiện tại không
        if (data.conversationId !== conversation.conversationId) return;
        
        const msg = data.message;
        const sender = data.sender;
        
        // Kiểm tra tin nhắn hợp lệ và xử lý dữ liệu từ MongoDB
        if (!msg) {
          console.warn("Invalid message data received: empty message");
          return;
        }
        
        // Trích xuất ID tin nhắn từ nhiều nguồn khả thi
        const messageId = msg.messageDetailId || msg.messageId || (msg._doc && (msg._doc.messageDetailId || msg._doc.messageId || msg._doc._id));

        if (!messageId) {
          console.warn("Invalid message data received: no message ID found", msg);
          return;
        }
        
        // Kiểm tra nếu tin nhắn đã tồn tại - PREVENT DUPLICATION
        const messageExists = messages.some(m => m.id === messageId);
        if (messageExists) {
          console.log(`Duplicate message detected and skipped: ${messageId}`);
          return;
        }
        
        // Nếu là document MongoDB, sử dụng dữ liệu từ _doc
        let messageData = msg;
        if (msg._doc) {
          messageData = { ...msg._doc, messageDetailId: messageId };
        } else if (typeof msg === 'object' && Object.keys(msg).length === 0) {
          console.warn("Empty message object received");
          return;
        }
        
        // Chuẩn hóa dữ liệu attachments và attachment
        let parsedAttachments: Array<{ url: string; type: string; name?: string; size?: number }> = [];
        if (typeof messageData.attachments === 'string' && messageData.attachments) {
          try {
            const parsed = JSON.parse(messageData.attachments);
            if (Array.isArray(parsed)) {
              parsedAttachments = parsed;
            }
          } catch (e) {
            console.error('Failed to parse attachments string:', e);
          }
        } else if (Array.isArray(messageData.attachments)) {
          parsedAttachments = messageData.attachments;
        }
        
        // Đảm bảo cả hai trường attachment và attachments đều có giá trị nhất quán
        let mainAttachment = messageData.attachment || (parsedAttachments.length > 0 ? parsedAttachments[0] : null);
        
        // Nếu có attachment nhưng không có attachments, tạo attachments từ attachment
        if (mainAttachment && parsedAttachments.length === 0) {
          parsedAttachments = [mainAttachment];
        }
        
        // Nếu có attachments nhưng không có attachment, lấy attachment từ attachments
        if (!mainAttachment && parsedAttachments.length > 0) {
          mainAttachment = parsedAttachments[0];
        }
        
        // Tạo đối tượng tin nhắn hiển thị
        const displayMessage: DisplayMessage = {
          id: messageId,
          content: messageData.content || "",
          timestamp: messageData.createdAt || new Date().toISOString(),
          sender: {
            id: messageData.senderId || "",
            name: sender.fullname || "Người dùng",
            avatar: sender.avatar || "",
          },
          type: (messageData.type as "text" | "image" | "file") || "text",
          isRead: Array.isArray(messageData.readBy) && messageData.readBy.length > 0,
          readBy: messageData.readBy || [],
          deliveredTo: messageData.deliveredTo || [],
          sendStatus: determineMessageStatus(messageData, currentUserId),
        };
        
        // Gán cả hai trường attachment và attachments cho tin nhắn hiển thị
        if (parsedAttachments.length > 0) {
          displayMessage.attachments = parsedAttachments;
        }
        
        if (mainAttachment) {
          displayMessage.attachment = mainAttachment;
        }
        
        // Xử lý dựa trên loại tin nhắn để thiết lập các trường fileUrl, fileName, fileSize
        if (messageData.type === "image") {
          // Đặt fileUrl từ attachment hoặc attachments
          if (mainAttachment && mainAttachment.url) {
            displayMessage.fileUrl = mainAttachment.url;
          }
        } else if (messageData.type === "file") {
          if (mainAttachment && mainAttachment.url) {
            displayMessage.fileUrl = mainAttachment.url;
            displayMessage.fileName = mainAttachment.name;
            displayMessage.fileSize = mainAttachment.size;
          }
        }
        
        // Kiểm tra xem tin nhắn đã tồn tại chưa
        setMessages(prevMessages => {
          // Kiểm tra xem tin nhắn đã tồn tại trong danh sách chưa
          const exists = prevMessages.some(m => m.id === displayMessage.id);
          if (!exists) {
            // Nếu tin nhắn này là từ người khác, đánh dấu là đã đọc
            if (displayMessage.sender.id !== currentUserId) {
              socketService.markMessagesAsRead(conversation.conversationId, [displayMessage.id]);
            }
            
            // Nếu không phải là tin nhắn từ người dùng hiện tại, xóa trạng thái typing
            if (displayMessage.sender.id !== currentUserId) {
              setTypingUsers(prev => {
                const newState = {...prev};
                delete newState[displayMessage.sender.id];
                return newState;
              });
              
              if (typingTimers[displayMessage.sender.id]) {
                clearTimeout(typingTimers[displayMessage.sender.id]);
                setTypingTimers(prev => {
                  const newTimers = {...prev};
                  delete newTimers[displayMessage.sender.id];
                  return newTimers;
                });
              }
            }
            
            return [...prevMessages, displayMessage];
          }
          return prevMessages;
        });
        
        // Cuộn đến tin nhắn mới
        scrollToBottomSmooth();
        
        // Cập nhật danh sách cuộc trò chuyện với tin nhắn mới
        updateConversationWithNewMessage(conversation.conversationId, {
          content: messageData.content,
          type: messageData.type,
          createdAt: messageData.createdAt,
          senderId: messageData.senderId
        });
      };
      
      // Callback để xử lý sự kiện typing
      const handleUserTyping = (data: { conversationId: string, userId: string, fullname: string }) => {
        // Chỉ xử lý event typing cho conversation hiện tại
        if (data.conversationId !== conversation.conversationId) return;
        
        // Không hiển thị typing của chính mình
        if (data.userId === currentUserId) return;
        
        // Cập nhật trạng thái typing
        setTypingUsers(prev => ({
          ...prev,
          [data.userId]: {
            userId: data.userId,
            fullname: data.fullname,
            timestamp: Date.now()
          }
        }));
        
        // Xóa typing status sau một khoảng thời gian
        if (typingTimers[data.userId]) {
          clearTimeout(typingTimers[data.userId]);
        }
        
        const timer = setTimeout(() => {
          setTypingUsers(prev => {
            const newState = {...prev};
            delete newState[data.userId];
            return newState;
          });
          
          setTypingTimers(prev => {
            const newTimers = {...prev};
            delete newTimers[data.userId];
            return newTimers;
          });
        }, TYPING_TIMEOUT);
        
        setTypingTimers(prev => ({
          ...prev,
          [data.userId]: timer
        }));
      };
      
      // Callback cho sự kiện tin nhắn đã đọc
      const handleMessageRead = (data: { conversationId: string, messageIds: string[], userId: string }) => {
        if (data.conversationId !== conversation.conversationId) return;
        
        // Cập nhật trạng thái đã đọc cho tin nhắn
        setMessages(prevMessages => 
          prevMessages.map(msg => {
            if (data.messageIds.includes(msg.id)) {
              return {
                ...msg,
                isRead: true,
                readBy: [...(msg.readBy || []), data.userId]
              };
            }
            return msg;
          })
        );
      };
      
      // Đăng ký lắng nghe các sự kiện socket
      socketService.onNewMessage(handleNewMessage);
      socketService.onUserTyping(handleUserTyping);
      socketService.onMessageRead(handleMessageRead);
      
      // Cleanup khi unmount hoặc change conversation
      return () => {
        // Hủy đăng ký các sự kiện
        socketService.off("newMessage", handleNewMessage);
        socketService.off("userTyping", handleUserTyping);
        socketService.off("messageRead", handleMessageRead);
        
        // Xóa tất cả timers
        Object.values(typingTimers).forEach(timer => clearTimeout(timer));
      };
    } else if (conversation && conversation.conversationId) {
      console.error(
        `Conversation ID không hợp lệ: ${conversation.conversationId}`
      );
      setError(
        `ID cuộc trò chuyện không hợp lệ. Vui lòng thử lại hoặc chọn cuộc trò chuyện khác.`
      );
    }
  }, [conversation?.conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Xử lý đánh dấu đã đọc khi cuộn đến tin nhắn mới
  useEffect(() => {
    // Đánh dấu các tin nhắn mới (từ người khác) là đã đọc khi hiển thị
    if (isValidConversation && messages.length > 0) {
      const unreadMessages = messages
        .filter(msg => 
          msg.sender.id !== currentUserId && 
          (!msg.readBy || !msg.readBy.includes(currentUserId))
        )
        .map(msg => msg.id);
      
      if (unreadMessages.length > 0) {
        socketService.markMessagesAsRead(conversation.conversationId, unreadMessages);
      }
    }
  }, [messages, currentUserId, conversation.conversationId, isValidConversation]);

  const fetchMessages = async (
    cursor?: string,
    direction: "before" | "after" = "before"
  ) => {
    if (!isValidConversation) {
      setError("Không thể tải tin nhắn. ID cuộc trò chuyện không hợp lệ.");
      return;
    }
    
    try {
      if (cursor) {
        if (direction === "before") {
        setLoadingMore(true);
        } else {
          setLoadingNewer(true);
        }
      } else {
        setLoading(true);
      }
      setError(null);
      
      if (!cursor) {
        setNotFound(false);
      }
      
      console.log(
        `Đang tải tin nhắn cho cuộc trò chuyện: ${conversation.conversationId}`
      );
      console.log(`Hướng tải: ${direction}, Cursor: ${cursor || "none"}`);

      // Lấy vị trí cuộn hiện tại để khôi phục sau khi tải thêm tin nhắn cũ
      const scrollContainer = messagesContainerRef.current;
      const scrollPosition = scrollContainer ? scrollContainer.scrollTop : 0;
      const scrollHeight = scrollContainer ? scrollContainer.scrollHeight : 0;

      // Lấy tin nhắn với phân trang và hướng tải
      // Sử dụng limit=20 để lấy 20 tin nhắn gần nhất
      const result = await getMessages(
        conversation.conversationId,
        cursor,
        20,
        direction
      );
      console.log("Kết quả API getMessages:", result);

      // Log phân trang để debug
      console.log("Thông tin phân trang từ API:", {
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        direction: result.direction,
      });
      
      const messagesData = result.messages;
      const resultDirection = result.direction || direction;

      // Cập nhật trạng thái phân trang theo hướng tải
      // Sử dụng nullish coalescing để đảm bảo giá trị boolean chính xác
      if (resultDirection === "before") {
        const hasMoreValue = result.hasMore ?? false;
        console.log(`Cập nhật hasMore = ${hasMoreValue} cho hướng 'before'`);
        setHasMore(hasMoreValue);
        if (result.nextCursor) {
          console.log(`Cập nhật oldestCursor = ${result.nextCursor}`);
          setOldestCursor(result.nextCursor);
        }
      } else {
        const hasMoreValue = result.hasMore ?? false;
        console.log(`Cập nhật hasNewer = ${hasMoreValue} cho hướng 'after'`);
        setHasNewer(hasMoreValue);
        if (result.nextCursor) {
          console.log(`Cập nhật newestCursor = ${result.nextCursor}`);
          setNewestCursor(result.nextCursor);
        }
      }
      
      // Kiểm tra dữ liệu trả về
      if (!Array.isArray(messagesData)) {
        console.error("Dữ liệu tin nhắn không hợp lệ:", messagesData);
        setError("Không thể tải tin nhắn. Dữ liệu không hợp lệ.");
        return;
      }
      
      console.log(`Nhận được ${messagesData.length} tin nhắn từ API`);
      
      if (messagesData.length === 0 && !cursor) {
        console.log("Không có tin nhắn nào trong cuộc trò chuyện");
        setMessages([]);
        return;
      }
      
      // Chuyển đổi Message từ API sang định dạng tin nhắn hiển thị
      const displayMessages: DisplayMessage[] = messagesData
        .map((msg) => {
        // Kiểm tra tin nhắn hợp lệ và hỗ trợ cả messageId và messageDetailId
        const messageId = msg.messageId || msg.messageDetailId;
        if (!msg || !messageId) {
            console.warn("Tin nhắn không hợp lệ:", msg);
          return null;
        }
        
          const sender = userCache[msg.senderId] || {
            fullname: "Người dùng",
            urlavatar: "",
          };
          
          // Chuẩn hóa các trường attachments và attachment
          // 1. Xử lý các trường attachments nếu nó là string (chuyển từ JSON)
          let parsedAttachments: Array<{ url: string; type: string; name?: string; size?: number }> = [];
          if (typeof msg.attachments === 'string' && msg.attachments) {
            try {
              const parsed = JSON.parse(msg.attachments);
              if (Array.isArray(parsed)) {
                parsedAttachments = parsed;
              }
            } catch (e) {
              console.error('Failed to parse attachments string:', e);
            }
          } else if (Array.isArray(msg.attachments)) {
            parsedAttachments = msg.attachments;
          }
          
          // 2. Đảm bảo cả hai trường attachment và attachments đều có giá trị nhất quán
          let mainAttachment = msg.attachment || (parsedAttachments.length > 0 ? parsedAttachments[0] : null);
          
          // Nếu có attachment nhưng không có attachments, tạo attachments từ attachment
          if (mainAttachment && parsedAttachments.length === 0) {
            parsedAttachments = [mainAttachment];
          }
          
          // Nếu có attachments nhưng không có attachment, lấy attachment từ attachments
          if (!mainAttachment && parsedAttachments.length > 0) {
            mainAttachment = parsedAttachments[0];
          }
        
          // Tạo đối tượng tin nhắn hiển thị
          const displayMessage: DisplayMessage = {
            id: messageId,
            content: msg.content || "",
            timestamp: msg.createdAt || new Date().toISOString(),
            sender: {
              id: msg.senderId || "",
              name: sender.fullname || "Người dùng",
              avatar: sender.urlavatar || "",
            },
            type: (msg.type as "text" | "image" | "file") || "text",
            isRead: Array.isArray(msg.readBy) && msg.readBy.length > 0,
            readBy: msg.readBy || [],
            deliveredTo: msg.deliveredTo || [],
            sendStatus: determineMessageStatus(msg, currentUserId),
          };
          
          // Gán cả hai trường attachment và attachments cho tin nhắn hiển thị
          if (parsedAttachments.length > 0) {
            displayMessage.attachments = parsedAttachments;
          }
          
          if (mainAttachment) {
            displayMessage.attachment = mainAttachment;
          }
          
          // Xử lý dựa trên loại tin nhắn để thiết lập các trường fileUrl, fileName, fileSize
          if (msg.type === "image") {
            // Đặt fileUrl từ attachment hoặc attachments
            if (mainAttachment && mainAttachment.url) {
              displayMessage.fileUrl = mainAttachment.url;
              // Logging để kiểm tra
              console.log(`Đã thiết lập fileUrl cho ảnh từ attachment: ${mainAttachment.url}`);
            }
          } else if (msg.type === "file") {
            if (mainAttachment && mainAttachment.url) {
              displayMessage.fileUrl = mainAttachment.url;
              displayMessage.fileName = mainAttachment.name;
              displayMessage.fileSize = mainAttachment.size;
            }
          }
          
          // Thêm log để kiểm tra dữ liệu
          if (msg.type === "image") {
            console.log(`Tin nhắn hình ảnh ${messageId}:`, {
              hasAttachment: !!displayMessage.attachment,
              hasAttachments: !!displayMessage.attachments,
              fileUrl: displayMessage.fileUrl
            });
          }

          return displayMessage;
        })
        .filter(Boolean) as DisplayMessage[]; // Lọc bỏ các tin nhắn null

      console.log(
        `Đã chuyển đổi thành ${displayMessages.length} tin nhắn hiển thị`
      );

      // Sắp xếp tin nhắn theo thời gian tăng dần (cũ nhất lên đầu, mới nhất xuống cuối)
      const sortedMessages = [...displayMessages].sort(
        (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      // Cập nhật danh sách tin nhắn dựa trên hướng tải
      if (cursor) {
        if (direction === "before") {
          // Thêm tin nhắn cũ vào đầu danh sách khi kéo lên
          setMessages((prev) => {
            // Get unique message IDs to avoid duplicates
            const existingIds = new Set(prev.map((msg) => msg.id));
            const uniqueNewMessages = sortedMessages.filter(
              (msg) => !existingIds.has(msg.id)
            );
            return [...uniqueNewMessages, ...prev];
          });

          // Khôi phục vị trí cuộn sau khi thêm tin nhắn cũ để tránh nhảy vị trí
          setTimeout(() => {
            if (scrollContainer) {
              const newScrollHeight = scrollContainer.scrollHeight;
              const heightDifference = newScrollHeight - scrollHeight;
              scrollContainer.scrollTop = scrollPosition + heightDifference;
            }
          }, 10);
      } else {
          // Thêm tin nhắn mới vào cuối danh sách khi kéo xuống
          setMessages((prev) => {
            // Get unique message IDs to avoid duplicates
            const existingIds = new Set(prev.map((msg) => msg.id));
            const uniqueNewMessages = sortedMessages.filter(
              (msg) => !existingIds.has(msg.id)
            );
            return [...prev, ...uniqueNewMessages];
          });
          scrollToBottomSmooth();
        }
      } else {
        // Thay thế hoàn toàn nếu là lần tải đầu tiên, đảm bảo tin nhắn cũ lên đầu
        setMessages(sortedMessages);

        // Cuộn xuống sau khi tải xong - giảm thời gian đợi để cuộn ngay lập tức
        setTimeout(scrollToBottom, 10);
      }
      
      console.log(`Đã tải ${displayMessages.length} tin nhắn`);
    } catch (error: any) {
      console.error("Lỗi khi tải tin nhắn:", error);
      
      let errorMessage = "Không thể tải tin nhắn. Vui lòng thử lại sau.";
      
      // Hiển thị lỗi chi tiết hơn nếu có
      if (error.response) {
        console.error("Chi tiết lỗi từ server:", {
          status: error.response.status,
          data: error.response.data,
        });
        
        if (error.response.status === 404) {
          errorMessage =
            "Không tìm thấy cuộc trò chuyện. Cuộc trò chuyện có thể đã bị xóa.";
          setNotFound(true); // Đánh dấu là không tìm thấy
        } else if (error.response.status === 401) {
          errorMessage = "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.";
        } else if (error.response.status === 403) {
          errorMessage = "Bạn không có quyền truy cập cuộc trò chuyện này.";
        }
      } else if (error.message) {
        // Hiển thị thông báo lỗi cụ thể
        errorMessage = error.message;
        
        // Kiểm tra xem có phải lỗi không tìm thấy không
        if (
          error.message.includes("not found") ||
          error.message.includes("không tìm thấy") ||
          error.message.includes("không tồn tại")
        ) {
          setNotFound(true);
        }
      }
      
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setLoadingNewer(false);
    }
  };

  // Hàm tải thêm tin nhắn cũ hơn
  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMore || !oldestCursor) return;
    try {
      setLoadingMore(true);
      await fetchMessages(oldestCursor, "before");
    } catch (error) {
      message.error("Lỗi khi tải thêm tin nhắn cũ hơn!");
      console.error("Error loading more messages:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, oldestCursor, fetchMessages]);

  // Hàm tải thêm tin nhắn mới hơn
  const loadNewerMessages = () => {
    if (hasNewer && newestCursor) {
      console.log(`Tải thêm tin nhắn mới hơn với cursor: ${newestCursor}`);
      fetchMessages(newestCursor, "after");
    } else {
      console.log("Không thể tải thêm tin nhắn mới hơn:", {
        hasNewer,
        newestCursor,
      });
    }
  };

  // Kiểm soát cuộn và tự động tải thêm tin nhắn
  useEffect(() => {
    const scrollContainer = messagesContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;

      // Khi cuộn gần lên đầu, tải thêm tin nhắn cũ
      if (scrollTop < 100 && hasMore && !loadingMore && oldestCursor) {
        console.log("Đang cuộn gần đầu, tải thêm tin nhắn cũ");
        loadMoreMessages();
      }

      // Khi cuộn gần xuống cuối, tải thêm tin nhắn mới (nếu có)
      if (
        scrollHeight - scrollTop - clientHeight < 50 &&
        hasNewer &&
        !loadingNewer &&
        newestCursor
      ) {
        console.log("Đang cuộn gần cuối, tải thêm tin nhắn mới");
        loadNewerMessages();
      }
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [
    hasMore,
    loadingMore,
    oldestCursor,
    hasNewer,
    loadingNewer,
    newestCursor,
    loadMoreMessages,
    loadNewerMessages,
  ]);

  // Xử lý chọn tập tin đính kèm
  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  // Xử lý khi tập tin được chọn
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if these are image files being uploaded directly
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    // If images are selected and they're coming from the image input, send them directly
    if (imageFiles.length > 0 && e.target.accept === 'image/*') {
      handleSendImage(imageFiles[0]);
      return;
    }

    // For non-image files or mixed files, add to attachments as before
    const newFiles = Array.from(files);
    setAttachments((prev) => [...prev, ...newFiles]);

    // Reset input để có thể chọn lại cùng tập tin
    e.target.value = "";
  };

  // Handle direct image uploads using the new API
  const handleSendImage = async (imageFile: File) => {
    if (!isValidConversation) return;
    
    // Create and display a local message while sending
    const tempId = `temp-${Date.now()}`;
    const localImageUrl = URL.createObjectURL(imageFile);
    
    // Tạo đối tượng attachment nhất quán
    const attachmentObj = {
      url: localImageUrl,
      type: imageFile.type,
      name: imageFile.name,
      size: imageFile.size,
    };
    
    // Tạo tin nhắn tạm thời với cả hai trường attachment và attachments
    const localMessage: DisplayMessage = {
      id: tempId,
      content: "",
      timestamp: new Date().toISOString(),
      sender: {
        id: currentUserId,
        name: "You",
        avatar: userCache[currentUserId]?.urlavatar || "",
      },
      type: "image",
      sendStatus: "sending",
      // Đặt cả hai trường
      attachments: [attachmentObj],
      attachment: attachmentObj,
      // Đặt fileUrl cho hiển thị ngay lập tức
      fileUrl: localImageUrl,
    };

    // Thêm log kiểm tra
    console.log("Tin nhắn tạm thời:", {
      tempId,
      fileUrl: localMessage.fileUrl,
      attachmentUrl: localMessage.attachment?.url,
      attachmentsUrl: localMessage.attachments?.[0]?.url
    });

    // Thêm tin nhắn tạm thời vào danh sách
    setMessages((prev) => [...prev, localMessage]);
    scrollToBottomSmooth();

    try {
      setIsUploading(true);
      
      // Gửi ảnh bằng API
      const newMessage = await sendImageMessage(conversation.conversationId, imageFile);

      if (!newMessage || !newMessage.messageDetailId) {
        throw new Error("Không nhận được phản hồi hợp lệ từ server");
      }

      console.log("Phản hồi từ server khi gửi ảnh:", newMessage);

      // Tạo sender từ cache
      const sender = userCache[currentUserId] || {
        fullname: "Bạn",
        urlavatar: "",
      };
      
      // Chuẩn hóa dữ liệu attachment và attachments từ phản hồi của server
      let mainAttachment = null;
      let attachmentsArray: Array<{ url: string; type: string; name?: string; size?: number }> = [];
      let tempAttachmentData: Array<{ url: string; type: string; name?: string; size?: number }> = [];
      let messageType = newMessage.type || "image";
      
      // Xử lý trường attachment
      if (newMessage.attachment && typeof newMessage.attachment === 'object' && 'url' in newMessage.attachment) {
        mainAttachment = newMessage.attachment;
      }
      
      // Xử lý trường attachments
      if (newMessage.attachments) {
        // Nếu là string, parse thành array
        if (typeof newMessage.attachments === 'string') {
          try {
            const parsed = JSON.parse(newMessage.attachments);
            if (Array.isArray(parsed)) {
              attachmentsArray = parsed;
            }
          } catch (e) {
            console.error('Lỗi parse attachments string:', e);
          }
        } 
        // Nếu đã là array, sử dụng trực tiếp
        else if (Array.isArray(newMessage.attachments)) {
          attachmentsArray = newMessage.attachments;
        }
      }
      
      // Đảm bảo cả hai trường đều có dữ liệu nhất quán
      if (!mainAttachment && attachmentsArray.length > 0) {
        mainAttachment = attachmentsArray[0];
      }
      
      if (mainAttachment && attachmentsArray.length === 0) {
        attachmentsArray = [mainAttachment];
      }
      
      // Tạo tin nhắn thực từ phản hồi server
      const realMessage: DisplayMessage = {
        id: newMessage.messageDetailId,
        content: newMessage.content || "Hình ảnh",
        timestamp: newMessage.createdAt,
        sender: {
          id: newMessage.senderId,
          name: sender.fullname,
          avatar: sender.urlavatar,
        },
        type: "image",
        isRead: Array.isArray(newMessage.readBy) && newMessage.readBy.length > 0,
        readBy: newMessage.readBy || [],
        deliveredTo: newMessage.deliveredTo || [],
        sendStatus: determineMessageStatus(newMessage, currentUserId),
      };
      
      // Đặt các trường liên quan đến hình ảnh
      if (mainAttachment && mainAttachment.url) {
        realMessage.fileUrl = mainAttachment.url;
        realMessage.attachment = mainAttachment;
      } else {
        // Nếu không có URL từ server, giữ URL tạm thời
        realMessage.fileUrl = localImageUrl;
        realMessage.attachment = attachmentObj;
      }
      
      if (attachmentsArray.length > 0) {
        realMessage.attachments = attachmentsArray;
      } else {
        realMessage.attachments = [attachmentObj];
      }
      
      // Thêm thông tin tập tin đính kèm
      if (messageType === "text-with-image" && newMessage.attachment) {
        // Xử lý tin nhắn với ảnh paste
        const imageAttachment = newMessage.attachment;
        
        // Cập nhật loại tin nhắn và set lại loại tin nhắn đúng
        realMessage.type = "text-with-image";
        
        // Thiết lập các trường cho tin nhắn ảnh
        realMessage.fileUrl = imageAttachment.url;
        realMessage.attachment = imageAttachment;
        realMessage.attachments = [imageAttachment];
        
        // Log để kiểm tra
        console.log(`Tin nhắn text-with-image thực từ server:`, {
          id: realMessage.id,
          fileUrl: realMessage.fileUrl,
          content: realMessage.content,
          attachmentUrl: realMessage.attachment?.url
        });
      }
      else if ((messageType === "file" || messageType === "image") && attachments.length > 0 && tempAttachmentData.length > 0) {
        // Tạo đối tượng attachment cho các loại tin nhắn có file đính kèm
        const fileAttachmentObj = {
          url: tempAttachmentData[0]?.url,
          type: attachments[0].type,
          name: attachments[0].name,
          size: attachments[0].size,
        };

        // Thiết lập các trường cụ thể dựa trên loại tin nhắn
        if (messageType === "file") {
          realMessage.fileName = attachments[0].name;
          realMessage.fileSize = attachments[0].size;
        }
        
        // Thiết lập fileUrl và đảm bảo cả hai trường attachment và attachments
        realMessage.fileUrl = tempAttachmentData[0]?.url;
        realMessage.attachment = fileAttachmentObj;
        realMessage.attachments = [fileAttachmentObj];
        
        // Log để kiểm tra
        console.log(`Tin nhắn ${messageType} thực từ server:`, {
          id: realMessage.id,
          fileUrl: realMessage.fileUrl,
          attachmentUrl: realMessage.attachment?.url,
          attachmentsArray: realMessage.attachments
        });
      }

      // Update message in the list
      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempId ? realMessage : msg))
      );

      // Update conversation list with new message
      updateConversationWithNewMessage(conversation.conversationId, {
        content: newMessage.content,
        type: newMessage.type,
        createdAt: newMessage.createdAt,
        senderId: newMessage.senderId
      });
      
    } catch (error: any) {
      console.error("Lỗi khi gửi hình ảnh:", error);
      // Mark temporary message as error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? {
                ...msg,
                content: error.message
                  ? `Hình ảnh (${error.message})`
                  : `Hình ảnh (Không gửi được)`,
                isError: true,
              }
            : msg
        )
      );
      message.error(error.message || "Không thể gửi hình ảnh");
    } finally {
      setIsUploading(false);
    }
  };

  // Xóa tập tin khỏi danh sách đính kèm
  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Gửi tin nhắn với tập tin đính kèm
  const handleSendMessage = async () => {
    // Kiểm tra xem có nội dung gì để gửi không (văn bản, tập tin, hoặc ảnh paste)
    if (
      (!inputValue.trim() && attachments.length === 0 && !pastedImage) ||
      !isValidConversation
    )
      return;
    
    const tempContent = inputValue;
    setInputValue(""); // Reset input ngay lập tức

    // Xác định loại tin nhắn
    let messageType = "text";
    
    // Kiểm tra xem có ảnh được paste không
    if (pastedImage) {
      messageType = "text-with-image";
    }
    // Nếu không có ảnh paste thì kiểm tra attachments
    else if (attachments.length > 0) {
      // Nếu có nhiều tập tin hoặc không phải hình ảnh, thì là 'file'
      if (attachments.length > 1) {
        messageType = "file";
      } else {
        // Nếu chỉ có 1 tập tin, kiểm tra xem có phải là hình ảnh không
        const fileType = attachments[0].type;
        messageType = fileType.startsWith("image/") ? "image" : "file";
      }
    }
    
    // Tạo đối tượng cho ảnh đính kèm (từ paste hoặc attachment)
    let attachmentObj = null;
    if (pastedImage) {
      attachmentObj = {
        url: pastedImagePreview as string,
        type: pastedImage.type,
        name: pastedImage.name || 'pasted-image.png',
        size: pastedImage.size,
      };
    } else if (messageType === "image" && attachments.length > 0) {
      attachmentObj = {
        url: URL.createObjectURL(attachments[0]),
        type: attachments[0].type,
        name: attachments[0].name,
        size: attachments[0].size,
      };
    }
    
    // Tạo tin nhắn tạm thời để hiển thị ngay
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tempMessage: DisplayMessage = {
      id: tempId,
      content: tempContent || (
        messageType === "image" ? "Đang gửi hình ảnh..." :
        messageType === "text-with-image" ? tempContent :
        messageType === "file" ? "Đang gửi tập tin..." : ""
      ),
      timestamp: new Date().toISOString(),
      sender: {
        id: currentUserId,
        name: "Bạn",
        avatar: userCache[currentUserId]?.urlavatar || "",
      },
      type: messageType as "text" | "image" | "file" | "text-with-image",
      isRead: false,
      sendStatus: "sending",
      readBy: [],
      deliveredTo: [],
    };
    
    // Thêm thông tin tập tin nếu có
    if (attachmentObj) {
      tempMessage.fileUrl = attachmentObj.url;
      tempMessage.attachment = attachmentObj;
      tempMessage.attachments = [attachmentObj];
      
      if (messageType === "file") {
        tempMessage.fileName = attachmentObj.name;
        tempMessage.fileSize = attachmentObj.size;
      }
    }

    // Hiển thị tin nhắn tạm thời - Thêm vào cuối danh sách
    setMessages((prev) => [...prev, tempMessage]);
    scrollToBottomSmooth();

    try {
      setIsUploading(true);
      let newMessage;
      // Chuẩn bị mảng attachments để gửi lên server
      const tempAttachmentData = [];

      // Xử lý dựa trên loại tin nhắn
      if (messageType === "text-with-image" && pastedImage) {
        // Gửi tin nhắn kèm ảnh đã paste
        newMessage = await sendMessageWithImage(
          conversation.conversationId,
          tempContent,
          pastedImage
        );
        
        // Xóa ảnh đã paste sau khi gửi
        handleRemovePastedImage();
      } else {
        // Nếu có tập tin đính kèm, xử lý tải lên
        if (attachments.length > 0) {
          for (const file of attachments) {
            // Tạo một đối tượng FormData để tải lên tập tin
            const formData = new FormData();
            formData.append("file", file);

            // Giả lập trong trường hợp chưa có API tải lên
            tempAttachmentData.push({
              url: URL.createObjectURL(file),
              type: file.type,
              name: file.name,
              size: file.size,
            });
          }
        }

        // Gửi tin nhắn với tập tin đính kèm
        newMessage = await sendMessage(
          conversation.conversationId,
          tempContent,
          messageType,
          tempAttachmentData
        );
      }
      
      if (!newMessage || !newMessage.messageDetailId) {
        throw new Error("Không nhận được phản hồi hợp lệ từ server");
      }
      
      // Thay thế tin nhắn tạm bằng tin nhắn thật
      const sender = userCache[currentUserId] || {
        fullname: "Bạn",
        urlavatar: "",
      };
      const realMessage: DisplayMessage = {
        id: newMessage.messageDetailId,
        content: newMessage.content,
        timestamp: newMessage.createdAt,
        sender: {
          id: newMessage.senderId,
          name: sender.fullname,
          avatar: sender.urlavatar,
        },
        type: messageType as "text" | "image" | "file",
        isRead: Array.isArray(newMessage.readBy) && newMessage.readBy.length > 0,
        readBy: newMessage.readBy || [],
        deliveredTo: newMessage.deliveredTo || [],
        sendStatus: determineMessageStatus(newMessage, currentUserId),
        // Lưu ID tạm thời để hỗ trợ việc cập nhật
        tempId: tempId
      };
      // Đặt các trường liên quan đến hình ảnh
      if (newMessage.attachment && newMessage.attachment.url) {
        realMessage.fileUrl = newMessage.attachment.url;
        realMessage.attachment = newMessage.attachment;
      } else if (tempAttachmentData.length > 0) {
        // Nếu không có URL từ server, giữ URL tạm thời
        realMessage.fileUrl = tempAttachmentData[0]?.url;
        realMessage.attachment = tempAttachmentData[0];
      }
      
      if (tempAttachmentData.length > 0) {
        realMessage.attachments = tempAttachmentData;
      } else if (attachmentObj) {
        realMessage.attachments = [attachmentObj];
      }
      
      // Thêm thông tin tập tin đính kèm
      if (messageType === "text-with-image" && newMessage.attachment) {
        // Xử lý tin nhắn với ảnh paste
        const imageAttachment = newMessage.attachment;
        
        // Cập nhật loại tin nhắn và set lại loại tin nhắn đúng
        realMessage.type = "text-with-image";
        
        // Thiết lập các trường cho tin nhắn ảnh
        realMessage.fileUrl = imageAttachment.url;
        realMessage.attachment = imageAttachment;
        realMessage.attachments = [imageAttachment];
      }
      else if ((messageType === "file" || messageType === "image") && attachments.length > 0 && tempAttachmentData.length > 0) {
        // Tạo đối tượng attachment cho các loại tin nhắn có file đính kèm
        const fileAttachmentObj = {
          url: tempAttachmentData[0]?.url,
          type: attachments[0].type,
          name: attachments[0].name,
          size: attachments[0].size,
        };

        // Thiết lập các trường cụ thể dựa trên loại tin nhắn
        if (messageType === "file") {
          realMessage.fileName = attachments[0].name;
          realMessage.fileSize = attachments[0].size;
        }
        
        // Thiết lập fileUrl và đảm bảo cả hai trường attachment và attachments
        realMessage.fileUrl = tempAttachmentData[0]?.url;
        realMessage.attachment = fileAttachmentObj;
        realMessage.attachments = [fileAttachmentObj];
      }

      // Cải thiện logic cập nhật tin nhắn để tránh tin nhắn trùng lặp
      setMessages((prev) => {
        // Kiểm tra xem tin nhắn thực đã tồn tại trong danh sách chưa (bằng ID)
        const realMessageExists = prev.some(msg => msg.id === realMessage.id);
        
        // Kiểm tra xem tin nhắn tạm còn tồn tại không 
        const tempMessageExists = prev.some(msg => msg.id === tempId);
        
        if (realMessageExists && tempMessageExists) {
          // Tin nhắn thực đã tồn tại và tin nhắn tạm vẫn còn - chỉ loại bỏ tin nhắn tạm
          return prev.filter(msg => msg.id !== tempId);
        } else if (realMessageExists) {
          // Tin nhắn thực đã tồn tại nhưng không còn tin nhắn tạm - giữ nguyên danh sách
          return prev;
        } else if (tempMessageExists) {
          // Tin nhắn tạm tồn tại, tin nhắn thực chưa có - thay thế tin nhắn tạm bằng tin nhắn thực
          return prev.map(msg => msg.id === tempId ? realMessage : msg);
        } else {
          // Không tìm thấy cả tin nhắn tạm và tin nhắn thực - thêm tin nhắn thực vào
          // Điều này chỉ xảy ra trong trường hợp hiếm gặp khi tin nhắn tạm đã bị xóa bằng cách nào đó
          return [...prev, realMessage];
        }
      });

      // Cập nhật ChatList với tin nhắn mới
      updateConversationWithNewMessage(conversation.conversationId, {
        content: newMessage.content,
        type: newMessage.type,
        createdAt: newMessage.createdAt,
        senderId: newMessage.senderId
      });

      // Xóa danh sách tập tin đính kèm sau khi gửi
      setAttachments([]);
    } catch (error: any) {
      console.error("Lỗi khi gửi tin nhắn:", error);
      // Đánh dấu tin nhắn tạm là lỗi
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId 
            ? {
                ...msg,
                content: error.message
                  ? `${msg.content} (${error.message})`
                  : `${msg.content} (Không gửi được)`,
                isError: true,
              }
            : msg
        )
      );
      message.error(error.message || "Không thể gửi tin nhắn");
    } finally {
      setIsUploading(false);
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  };

  // Thêm hàm scrollToBottomSmooth để cuộn mượt trong các trường hợp cần thiết
  const scrollToBottomSmooth = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Kiểm tra xem tin nhắn có phải của người dùng hiện tại không
  const isOwnMessage = (senderId: string) => senderId === currentUserId;

  // Kiểm tra xem có nên hiển thị avatar cho tin nhắn này không
  const shouldShowAvatar = (index: number, senderId: string) => {
    // Always show for first message
    if (index === 0) return true;

    // Show if sender changes from previous message
    if (index > 0 && messages[index - 1].sender.id !== senderId) return true;

    // Also show avatar if there's a timestamp separator between this message and the previous one
    if (index > 0) {
      const currentMsg = messages[index];
      const prevMsg = messages[index - 1];

      // If messages have a significant time gap (which would trigger a timestamp separator)
      if (shouldShowTimestampSeparator(currentMsg, prevMsg)) {
        return true;
      }
    }

    return false;
  };

  // Hàm làm mới danh sách cuộc trò chuyện
  const handleRefreshConversations = async () => {
    try {
      setRefreshing(true);
      
      // Gọi API trực tiếp để lấy lại danh sách cuộc trò chuyện
      await fetchConversations();
      
      // Thông báo cho người dùng
      message.success("Đã làm mới danh sách cuộc trò chuyện");
      
      // Thiết lập lại trạng thái not-found
      setNotFound(false);
      
      // Thông báo cho người dùng chọn cuộc trò chuyện mới
      setError("Vui lòng chọn lại cuộc trò chuyện từ danh sách.");
    } catch (error) {
      console.error("Lỗi khi làm mới danh sách cuộc trò chuyện:", error);
      message.error("Không thể làm mới danh sách cuộc trò chuyện");
    } finally {
      setRefreshing(false);
    }
  };

  // Format date for timestamp separator
  const formatDateForSeparator = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if date is today
    if (date.toDateString() === today.toDateString()) {
      return `Hôm nay, ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
    }
    // Check if date is yesterday
    else if (date.toDateString() === yesterday.toDateString()) {
      return `Hôm qua, ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
    }
    // Otherwise show full date
    else {
      return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}, ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
    }
  };

  // Check if a timestamp separator should be shown between messages
  const shouldShowTimestampSeparator = (
    currentMsg: DisplayMessage,
    prevMsg: DisplayMessage | null
  ) => {
    if (!prevMsg) return true; // Always show for first message

    const currentTime = new Date(currentMsg.timestamp).getTime();
    const prevTime = new Date(prevMsg.timestamp).getTime();

    // Show separator if time difference is 5 minutes (300000 ms) or more
    return currentTime - prevTime >= 300000;
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: any) => {
    setInputValue((prev) => prev + emoji.native);
    // Không đóng emoji picker sau khi chọn, cho phép chọn nhiều emoji
    // setEmojiPickerVisible(false);
  };

  // Toggle emoji picker visibility
  const toggleEmojiPicker = () => {
    setEmojiPickerVisible(!emojiPickerVisible);
  };

  // Close emoji picker
  const closeEmojiPicker = useCallback(() => {
    setEmojiPickerVisible(false);
  }, []);

  // Add click outside handler for emoji picker with improved detection
  useEffect(() => {
    if (emojiPickerVisible) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Element;
        const emojiPicker = document.querySelector(".emoji-picker-container");

        // Close emoji picker if clicked outside of it and not on the emoji button
        if (
          emojiPicker &&
          !emojiPicker.contains(target) &&
          !target.closest(".emoji-button")
        ) {
          closeEmojiPicker();
        }
      };

      // Use mousedown for more reliable detection
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [emojiPickerVisible, closeEmojiPicker]);

  // Custom CSS for emoji picker to fix nested container issues
  useEffect(() => {
    // Add style to fix emoji-mart nested container issues
    if (emojiPickerVisible) {
      // Add a small delay to ensure the element is in the DOM
      setTimeout(() => {
        const emojiPickerElement = document.querySelector(
          ".emoji-picker-container em-emoji-picker"
        );
        if (emojiPickerElement) {
          (emojiPickerElement as HTMLElement).style.border = "none";
          (emojiPickerElement as HTMLElement).style.boxShadow = "none";
          (emojiPickerElement as HTMLElement).style.height = "350px";
        }
      }, 50);
    }
  }, [emojiPickerVisible]);

  // Handle attachments for different types
  const handleImageClick = () => {
    imageInputRef.current?.click();
  };

  const handleVideoClick = () => {
    videoInputRef.current?.click();
  };

  const handleAudioClick = () => {
    audioInputRef.current?.click();
  };

  const handleLocationClick = () => {
    // In a real implementation, this would access the user's location
    message.info("Tính năng chia sẻ vị trí đang được phát triển");
  };

  const handlePollClick = () => {
    message.info("Tính năng khảo sát đang được phát triển");
  };

  // Add the determineMessageStatus function before it's used
  const determineMessageStatus = (msg: any, currentUserId: string): string => {
    if (msg.senderId === currentUserId) {
      // Message sent by current user
      if (Array.isArray(msg.readBy) && msg.readBy.length > 0) {
        return "read";
      } else if (Array.isArray(msg.deliveredTo) && msg.deliveredTo.length > 0) {
        return "delivered";
      } else if (msg.sendStatus === "sent" || msg.sendStatus) {
        return msg.sendStatus;
      }
      return "sent";
    }
    
    // For messages received by the current user
    return "received";
  };

  // Thêm hàm xử lý sự kiện paste
  const handlePaste = useCallback((e: ClipboardEvent) => {
    // Kiểm tra xem có ảnh trong clipboard không
    const items = e.clipboardData?.items;
    if (!items) return;

    // Tìm item có type là image
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault(); // Ngăn hành vi paste mặc định
        
        // Lấy file từ clipboard
        const file = items[i].getAsFile();
        if (!file) continue;
        
        // Tạo URL preview cho ảnh
        const url = URL.createObjectURL(file);
        
        // Lưu ảnh vào state
        setPastedImage(file);
        setPastedImagePreview(url);
        
        // Thông báo cho người dùng
        message.success("Đã dán ảnh vào tin nhắn. Nhấn gửi để gửi tin nhắn kèm ảnh.", 2);
        
        break;
      }
    }
  }, []);

  // Thêm effect để xử lý sự kiện paste
  useEffect(() => {
    // Thêm event listener khi component được mount
    document.addEventListener('paste', handlePaste);
    
    // Cleanup khi component unmount
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  // Thêm hàm để xóa ảnh đã paste
  const handleRemovePastedImage = () => {
    if (pastedImagePreview) {
      URL.revokeObjectURL(pastedImagePreview);
    }
    setPastedImage(null);
    setPastedImagePreview(null);
  };

  // Cập nhật handleInputChange để gửi sự kiện typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Gửi sự kiện typing nếu người dùng đang nhập
    if (isValidConversation && value.trim().length > 0) {
      const fullname = userCache[currentUserId]?.fullname || "Người dùng";
      socketService.sendTyping(conversation.conversationId, fullname);
    }
  };

  // Nếu không có conversation hợp lệ, hiển thị thông báo
  if (!isValidConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          Vui lòng chọn một cuộc trò chuyện
        </div>
      </div>
    );
  }

  // Thêm hàm lọc tin nhắn trùng lặp trước khi render
  const deduplicateMessages = (messagesToDeduplicate: DisplayMessage[]): DisplayMessage[] => {
    const uniqueMessages: DisplayMessage[] = [];
    const seenMessages = new Set<string>();
    
    // Sắp xếp tin nhắn theo thời gian tăng dần để đảm bảo hiển thị tin nhắn mới nhất
    const sortedMessages = [...messagesToDeduplicate].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    for (const message of sortedMessages) {
      // Tạo khóa duy nhất cho tin nhắn dựa trên nội dung, người gửi và loại
      // Cho tin nhắn ảnh, sử dụng fileUrl làm phần chính của key thay vì content
      let contentKey = '';
      
      if (message.type === 'image') {
        // Với tin nhắn ảnh, sử dụng fileUrl hoặc url từ attachment
        const imageUrl = message.fileUrl || 
                         (message.attachment && message.attachment.url) || 
                         (message.attachments && message.attachments.length > 0 ? message.attachments[0].url : '');
        contentKey = `${message.sender.id}:${imageUrl}:${message.type}`;
      } else if (message.type === 'file') {
        // Với tin nhắn file, sử dụng fileName và fileSize
        contentKey = `${message.sender.id}:${message.fileName}:${message.fileSize}:${message.type}`;
      } else {
        // Với tin nhắn text hoặc text-with-image, sử dụng cách cũ
        contentKey = `${message.sender.id}:${message.content}:${message.type}`;
      }
      
      // Nếu khóa này đã tồn tại, kiểm tra thời gian
      if (seenMessages.has(contentKey)) {
        const existingIndex = uniqueMessages.findIndex(m => {
          // Cần tạo lại key theo cùng logic để so sánh
          if (m.type === 'image') {
            const imageUrl = m.fileUrl || 
                            (m.attachment && m.attachment.url) || 
                            (m.attachments && m.attachments.length > 0 ? m.attachments[0].url : '');
            return `${m.sender.id}:${imageUrl}:${m.type}` === contentKey;
          } else if (m.type === 'file') {
            return `${m.sender.id}:${m.fileName}:${m.fileSize}:${m.type}` === contentKey;
          } else {
            return `${m.sender.id}:${m.content}:${m.type}` === contentKey;
          }
        });
        
        if (existingIndex !== -1) {
          const existingMessage = uniqueMessages[existingIndex];
          const timeDiff = Math.abs(
            new Date(message.timestamp).getTime() - new Date(existingMessage.timestamp).getTime()
          );
          
          // Nếu hai tin nhắn có cùng nội dung và được gửi trong vòng 5 giây
          if (timeDiff < 5000) {
            // Giữ lại tin nhắn có ID thực (không phải ID tạm thời)
            if (!message.id.startsWith('temp-') && existingMessage.id.startsWith('temp-')) {
              uniqueMessages[existingIndex] = message;
            }
            // Hoặc giữ tin nhắn mới hơn nếu cả hai đều là tin nhắn thực hoặc tin nhắn tạm
            else if (new Date(message.timestamp) > new Date(existingMessage.timestamp)) {
              uniqueMessages[existingIndex] = message;
            }
            continue;
          }
        }
      }
      
      // Đánh dấu đã thấy tin nhắn này
      seenMessages.add(contentKey);
      uniqueMessages.push(message);
    }
    
    // Sắp xếp lại kết quả theo thời gian
    return uniqueMessages.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };

  // Ở phần render messages, sử dụng hàm deduplicateMessages
  const messagesToRender: DisplayMessage[] = deduplicateMessages(messages);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex flex-col h-full overflow-hidden bg-white rounded-lg relative">
        {/* Khu vực hiển thị tin nhắn */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 bg-gray-50"
        >
          {/* Nút tải thêm tin nhắn cũ hơn */}
          {hasMore && messages.length > 0 && (
            <div className="load-more-container">
              <Button 
                onClick={loadMoreMessages} 
                loading={loadingMore}
                icon={<DownOutlined />}
                size="small"
              >
                Tải thêm
              </Button>
            </div>
          )}
          
          {loadingMore && (
            <div className="text-center py-2">
              <Spin size="small" />{" "}
              <span className="text-xs text-gray-500 ml-2">
                Đang tải tin nhắn cũ hơn...
              </span>
            </div>
          )}
          
          {loading && (
            <div className="text-center py-4">{t.loading || "Đang tải..."}</div>
          )}
          
          {notFound && (
            <div className="flex flex-col items-center justify-center py-8">
              <Empty
                description="Không tìm thấy cuộc trò chuyện này"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
              <div className="mt-4 text-center">
                <p className="text-gray-500 mb-4">
                  Cuộc trò chuyện có thể đã bị xóa hoặc bạn không còn là thành
                  viên.
                </p>
                <Button 
                  type="primary" 
                  icon={<ReloadOutlined />} 
                  loading={refreshing}
                  onClick={handleRefreshConversations}
                >
                  Làm mới danh sách cuộc trò chuyện
                </Button>
              </div>
            </div>
          )}
          
          {error && !notFound && (
            <div className="text-center py-2">
              <Alert
                message="Lỗi khi tải tin nhắn"
                description={error}
                type="error"
                showIcon
              />
              <div className="mt-2">
                <Button type="primary" onClick={() => fetchMessages()}>
                  Thử lại
                </Button>
              </div>
            </div>
          )}
          
          {messages.length === 0 && !loading && !error && !notFound && (
            <div className="text-center text-gray-500 py-10">
              {t.no_messages ||
                "Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!"}
            </div>
          )}
          
          <div className="space-y-3">
            {messagesToRender.map((message, index) => {
              if (!message) return null;
              
              const isOwn = isOwnMessage(message.sender.id);
              const showAvatar =
                !isOwn && shouldShowAvatar(index, message.sender.id);
              // Chỉ hiển thị tên người gửi trong nhóm, không hiển thị trong chat 1-1
              const showSender = showAvatar && conversation.isGroup;

              // Determine if timestamp separator should be shown
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const showTimestamp = shouldShowTimestampSeparator(
                message,
                prevMessage
              );

              // Determine if this is the last message in a sequence from this sender
              // Show timestamp only for the last message in a sequence
              const nextMessage =
                index < messages.length - 1 ? messages[index + 1] : null;
              const isLastInSequence =
                !nextMessage || // It's the last message overall
                nextMessage.sender.id !== message.sender.id || // Next message is from different sender
                shouldShowTimestampSeparator(nextMessage, message); // There's a time separator after this message
              
              return (
                <React.Fragment key={`${message.id}-${index}`}>
                  {/* Timestamp separator */}
                  {showTimestamp && (
                    <div className="flex justify-center my-2">
                      <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                        {formatDateForSeparator(message.timestamp)}
                      </div>
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={`flex mb-2 ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    {!isOwn && (
                      <div
                        className={`flex-shrink-0 mr-2 ${showAvatar ? "visible" : "invisible"}`}
                      >
                      <Avatar 
                        name={message.sender.name}
                        avatarUrl={message.sender.avatar}
                        size={30}
                        className="rounded-full"
                      />
                    </div>
                  )}
                  
                    <div
                      className="flex flex-col"
                      style={{ maxWidth: "min(80%)" }}
                    >
                    {showSender && !isOwn && (
                        <div className="text-xs mb-1 ml-1 text-gray-600 truncate">
                        {message.sender.name}
                      </div>
                    )}
                    
                    <div 
                      className={`px-3 py-2 rounded-2xl ${
                        isOwn 
                            ? message.isError
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-500 text-white rounded-tr-none"
                            : "bg-gray-100 text-gray-800 rounded-tl-none"
                        } overflow-hidden`}
                        style={{ wordBreak: "break-word", maxWidth: "100%" }}
                    >
                      {/* Hiển thị nội dung tin nhắn dựa vào loại */}
                        {message.type === "image" ? (
                          <img
                            src={message.fileUrl || message.content}
                            alt="Hình ảnh"
                            className="max-w-full max-h-60 rounded-lg"
                          />
                        ) : message.type === "text-with-image" ? (
                          <div className="flex flex-col">
                            <p className="text-sm whitespace-pre-wrap break-words mb-2">
                              {message.content}
                            </p>
                            <img
                              src={message.fileUrl || 
                                (message.attachments && message.attachments.length > 0 
                                  ? message.attachments[0].url 
                                  : message.attachment?.url || undefined)}
                              alt="Hình ảnh đính kèm"
                              className="max-w-full max-h-60 rounded-lg"
                              onError={(e) => {
                                e.currentTarget.onerror = null; 
                                e.currentTarget.src = '/images/image-placeholder.png';
                              }}
                            />
                          </div>
                        ) : message.type === "file" ? (
                        <div className="flex items-center gap-2">
                          <i className="fas fa-file text-gray-500"></i>
                            <span className="truncate">
                              {message.fileName || message.content}
                            </span>
                        </div>
                      ) : (
                          <div className="relative">
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                          </div>
                      )}
                    </div>
                    
                      {/* Only show timestamp for the last message in a sequence */}
                      {isLastInSequence && (
                        <div
                          className={`flex text-xs text-gray-500 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                      <span>{formatMessageTime(message.timestamp)}</span>
                      {isOwn && message.isRead && (
                        <span className="ml-1 text-blue-500">✓✓</span>
                      )}
                    </div>
                      )}
                  </div>
                </div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Nút tải thêm tin nhắn mới hơn */}
          {hasNewer && (
            <div className="text-center pt-2">
              <Button
                onClick={loadNewerMessages}
                loading={loadingNewer}
                icon={<DownOutlined />}
                size="small"
                type="primary"
                ghost
              >
                Tải thêm tin nhắn mới hơn
              </Button>
            </div>
          )}

          {loadingNewer && (
            <div className="text-center py-2">
              <Spin size="small" />{" "}
              <span className="text-xs text-gray-500 ml-2">
                Đang tải tin nhắn mới hơn...
              </span>
            </div>
          )}

          {/* Hiển thị trạng thái typing */}
          {Object.keys(typingUsers).length > 0 && (
            <div className="flex items-center text-gray-500 text-sm pl-2 pb-1">
              <div className="flex items-center space-x-1">
                <span>
                  {Object.values(typingUsers)
                    .map(user => user.fullname)
                    .join(", ")}
                </span>
                <span>{Object.keys(typingUsers).length === 1 ? " đang nhập..." : " đang nhập..."}</span>
                <span className="typing-animation">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Khu vực nhập tin nhắn (ẩn nếu không tìm thấy cuộc trò chuyện) */}
        {!notFound && (
          <div className="flex-shrink-0 border-t border-gray-100 bg-white">
            {/* Hiển thị danh sách tập tin đính kèm */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 border-b border-gray-100">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1"
                  >
                    {file.type.startsWith("image/") ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <i className="fas fa-file text-gray-500"></i>
                    )}
                    <span className="text-xs truncate max-w-32">
                      {file.name}
                    </span>
                    <button
                      onClick={() => handleRemoveAttachment(index)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Hidden file inputs */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              aria-label="Tải lên tập tin đính kèm"
            />
            <input
              type="file"
              ref={imageInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*"
              aria-label="Tải lên hình ảnh"
            />
            <input
              type="file"
              ref={videoInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="video/*"
              aria-label="Tải lên video"
            />
            <input
              type="file"
              ref={audioInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="audio/*"
              aria-label="Tải lên ghi âm"
            />

            {/* Hiển thị ảnh đã paste nếu có */}
            {pastedImagePreview && (
              <div className="flex items-center py-2 px-4 border-t border-gray-100">
                <div className="relative">
                  <img 
                    src={pastedImagePreview} 
                    alt="Ảnh đã dán" 
                    className="h-16 rounded object-cover"
                  />
                  <button
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    onClick={handleRemovePastedImage}
                  >
                    ×
                  </button>
                </div>
                <div className="ml-2 text-xs text-gray-600">
                  <div>Ảnh đã dán</div>
                  <div className="text-blue-500">Sẽ được gửi cùng với tin nhắn</div>
                </div>
              </div>
            )}

            {/* Simplified input area - cleaner design */}
            <div className="flex items-center p-2 px-4 gap-2">
              <Input
                className="flex-1 py-2 px-2 border-none bg-transparent text-base focus:shadow-none"
                placeholder={
                  isUploading
                    ? "Đang tải lên..."
                    : `Nhắn @, tin nhắn tới ${conversation.isGroup ? conversation.groupName : "Bạn"}`
                }
                bordered={false}
                disabled={isUploading}
                value={inputValue}
                onChange={handleInputChange}
                onPressEnter={handleKeyPress}
              />
              <Tooltip title="Sticker">
                <SmileOutlined
                  className="text-lg text-gray-600 cursor-pointer hover:text-blue-500 emoji-button"
                  onClick={toggleEmojiPicker}
                />
              </Tooltip>
              <Tooltip title="Ảnh/Video">
                <PictureOutlined className="text-lg text-gray-600 cursor-pointer hover:text-blue-500" onClick={() => imageInputRef.current?.click()} />
              </Tooltip>

              {inputValue.trim() || attachments.length > 0 || pastedImage ? (
                <SendOutlined
                  className="text-xl cursor-pointer hover:text-primary text-blue-500"
                  onClick={handleSendMessage}
                />
              ) : (
                <button
                  className="text-2xl focus:outline-none"
                  onClick={() => {
                    // Send thumbs up reaction immediately
                    const thumbsUpContent = "👍";
                    
                    // Tạo message tạm thời để hiển thị ngay lập tức
                    const tempId = `temp-${Date.now()}`;
                    const newMessage: DisplayMessage = {
                      id: tempId,
                      content: thumbsUpContent,
                      sender: {
                        id: currentUserId,
                        name: "Bạn", // Sẽ được cập nhật sau
                        avatar: localStorage.getItem("userAvatar") || undefined
                      },
                      timestamp: new Date().toISOString(),
                      type: "text",
                      isRead: false,
                      isError: false,
                      sendStatus: "sending",
                    };
                    
                    // Thêm vào danh sách tin nhắn và cập nhật UI
                    setMessages((prevMessages) => [...prevMessages, newMessage]);
                    scrollToBottom();
                    
                    // Gửi tin nhắn
                    sendMessage(conversation.conversationId, thumbsUpContent, "text")
                      .then((response) => {
                        // Cập nhật message với ID từ server
                        if (response) {
                          setMessages((prevMessages) => 
                            prevMessages.map(msg => 
                              msg.id === tempId 
                                ? { 
                                    ...msg, 
                                    id: response.messageDetailId || tempId, 
                                    sendStatus: "sent" 
                                  } 
                                : msg
                            )
                          );
                          
                          // Cập nhật conversation với tin nhắn mới
                          updateConversationWithNewMessage(
                            conversation.conversationId, 
                            {
                              content: thumbsUpContent,
                              type: "text",
                              createdAt: new Date().toISOString(),
                              senderId: currentUserId
                            }
                          );
                        }
                      })
                      .catch((error) => {
                        console.error("Lỗi khi gửi reaction:", error);
                        // Đánh dấu tin nhắn lỗi
                        setMessages((prevMessages) => 
                          prevMessages.map(msg => 
                            msg.id === tempId 
                              ? { ...msg, isError: true, sendStatus: "error" } 
                              : msg
                          )
                        );
                        message.error("Không thể gửi biểu tượng cảm xúc");
                      });
                  }}
                >
                  👍
                </button>
              )}

              {emojiPickerVisible && (
                <div
                  className="absolute bottom-16 right-16 z-50 emoji-picker-container 
                               rounded-lg shadow-lg border border-gray-200 bg-white overflow-hidden"
                >
                  <Picker
                    data={data}
                    onEmojiSelect={handleEmojiSelect}
                    theme="light"
                    previewPosition="none"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* CSS cho trạng thái typing */}
      <style>
        {`
        .typing-animation {
          display: inline-flex;
          align-items: center;
          margin-left: 5px;
        }
        
        .typing-animation .dot {
          display: inline-block;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          margin: 0 1px;
          background: #888;
          animation: bounce 1.4s infinite ease-in-out both;
        }
        
        .typing-animation .dot:nth-child(1) {
          animation-delay: -0.32s;
        }
        
        .typing-animation .dot:nth-child(2) {
          animation-delay: -0.16s;
        }
        
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        `}
      </style>
    </div>
  );
};

export default ChatArea; 
