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
    
    // Chỉ tải tin nhắn khi conversation hợp lệ
    if (isValidConversation) {
      // Tải tin nhắn gần nhất với hướng 'before' và không có cursor
      fetchMessages(undefined, "before");
    } else if (conversation && conversation.conversationId) {
      console.error(
        `Conversation ID không hợp lệ: ${conversation.conversationId}`
      );
      setError(
        `ID cuộc trò chuyện không hợp lệ. Vui lòng thử lại hoặc chọn cuộc trò chuyện khác.`
      );
    }
  }, [conversation?.conversationId]);

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

          // Xử lý cho tin nhắn hình ảnh và tập tin
          if (
            msg.type === "image" &&
            msg.attachments &&
            msg.attachments.length > 0
          ) {
            displayMessage.fileUrl = msg.attachments[0].url;
          } else if (
            msg.type === "file" &&
            msg.attachments &&
            msg.attachments.length > 0
          ) {
            displayMessage.fileUrl = msg.attachments[0].url;
            displayMessage.fileName = msg.attachments[0].name;
            displayMessage.fileSize = msg.attachments[0].size;
          }

          // Thêm thông tin đính kèm
          if (msg.attachments && msg.attachments.length > 0) {
            displayMessage.attachments = msg.attachments;
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
    
    // Create a temporary message to show immediately
    const tempMessage: DisplayMessage = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: "Đang gửi hình ảnh...",
      timestamp: new Date().toISOString(),
      sender: {
        id: currentUserId,
        name: "Bạn",
        avatar: userCache[currentUserId]?.urlavatar || "",
      },
      type: "image",
      isRead: false,
      sendStatus: "sending",
      readBy: [],
      deliveredTo: [],
      fileUrl: URL.createObjectURL(imageFile),
    };

    // Add temporary message to the list
    setMessages((prev) => [...prev, tempMessage]);
    scrollToBottomSmooth();

    try {
      setIsUploading(true);
      
      // Send the image using the new API
      const newMessage = await sendImageMessage(conversation.conversationId, imageFile);

      if (!newMessage || !newMessage.messageDetailId) {
        throw new Error("Không nhận được phản hồi hợp lệ từ server");
      }

      // Replace temporary message with real message
      const sender = userCache[currentUserId] || {
        fullname: "Bạn",
        urlavatar: "",
      };
      
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
        fileUrl: tempMessage.fileUrl,
      };

      // Try to extract the file URL from the response if available
      try {
        // Check if response contains attachment data in a non-standard format
        const responseObj = newMessage as any; // Type assertion to bypass type checking
        
        if (responseObj.attachment && responseObj.attachment.url) {
          // Direct attachment object with URL
          realMessage.fileUrl = responseObj.attachment.url;
        } else if (responseObj.attachments) {
          // Try to handle attachments in various formats
          if (typeof responseObj.attachments === 'string') {
            // If it's a JSON string, parse it
            try {
              const parsedAttachments = JSON.parse(responseObj.attachments);
              if (Array.isArray(parsedAttachments) && parsedAttachments.length > 0) {
                realMessage.fileUrl = parsedAttachments[0].url || tempMessage.fileUrl;
              }
            } catch {}
          } else if (Array.isArray(responseObj.attachments) && responseObj.attachments.length > 0) {
            // If it's already an array
            realMessage.fileUrl = responseObj.attachments[0].url || tempMessage.fileUrl;
          }
        }
      } catch (error) {
        console.warn('Could not extract attachment URL:', error);
        // Keep using the temporary URL if extraction fails
      }

      // Update message in the list
      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempMessage.id ? realMessage : msg))
      );

      // Update conversation list with new message
      updateConversationWithNewMessage(conversation.conversationId, newMessage);
      
    } catch (error: any) {
      console.error("Lỗi khi gửi hình ảnh:", error);
      // Mark temporary message as error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempMessage.id
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
    // Kiểm tra xem có nội dung gì để gửi không (văn bản hoặc tập tin)
    if (
      (!inputValue.trim() && attachments.length === 0) ||
      !isValidConversation
    )
      return;
    
    const tempContent = inputValue;
    setInputValue(""); // Reset input ngay lập tức

    // Xác định loại tin nhắn
    let messageType = "text";
    if (attachments.length > 0) {
      // Nếu có nhiều tập tin hoặc không phải hình ảnh, thì là 'file'
      if (attachments.length > 1) {
        messageType = "file";
      } else {
        // Nếu chỉ có 1 tập tin, kiểm tra xem có phải là hình ảnh không
        const fileType = attachments[0].type;
        messageType = fileType.startsWith("image/") ? "image" : "file";
      }
    }
    
    // Tạo tin nhắn tạm thời để hiển thị ngay
    const tempMessage: DisplayMessage = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: tempContent || (messageType === "image"
        ? "Đang gửi hình ảnh..."
        : "Đang gửi tập tin..."),
      timestamp: new Date().toISOString(),
      sender: {
        id: currentUserId,
        name: "Bạn",
        avatar: userCache[currentUserId]?.urlavatar || "",
      },
      type: messageType as "text" | "image" | "file",
      isRead: false,
      sendStatus: "sending",
      readBy: [],
      deliveredTo: [],
      ...(messageType === "file" && attachments.length > 0
        ? {
            fileName: attachments[0].name,
            fileSize: attachments[0].size,
          }
        : {}),
    };

    // Hiển thị tin nhắn tạm thời - Thêm vào cuối danh sách
    setMessages((prev) => [...prev, tempMessage]);
    scrollToBottomSmooth();

    try {
      setIsUploading(true);

      // Chuẩn bị mảng attachments để gửi lên server
      const attachmentData = [];

      // Nếu có tập tin đính kèm, xử lý tải lên
      if (attachments.length > 0) {
        // Tùy thuộc vào API của bạn, bạn có thể cần tải lên tập tin trước
        // Và sau đó gửi đường dẫn trong mảng attachments
        // Ví dụ đơn giản:
        for (const file of attachments) {
          // Tạo một đối tượng FormData để tải lên tập tin
          const formData = new FormData();
          formData.append("file", file);

          // Tải lên tập tin và lấy URL từ server
          // Đây là ví dụ, bạn cần thay thế bằng API thực tế của bạn
          // const uploadResponse = await uploadFile(formData);
          // attachmentData.push({
          //   url: uploadResponse.fileUrl,
          //   type: file.type,
          //   name: file.name,
          //   size: file.size
          // });

          // Giả lập trong trường hợp chưa có API tải lên
          attachmentData.push({
            url: URL.createObjectURL(file),
            type: file.type,
            name: file.name,
            size: file.size,
          });
        }
      }

      // Gửi tin nhắn với tập tin đính kèm
      const newMessage = await sendMessage(
        conversation.conversationId,
        tempContent,
        messageType,
        attachmentData
      );
      
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
      };

      // Thêm thông tin tập tin nếu là tin nhắn tập tin
      if (messageType === "file" && attachments.length > 0) {
        realMessage.fileName = attachments[0].name;
        realMessage.fileSize = attachments[0].size;
        realMessage.fileUrl = attachmentData[0]?.url;
      } else if (messageType === "image" && attachments.length > 0) {
        realMessage.fileUrl = attachmentData[0]?.url;
      }

      // Cập nhật tin nhắn trong danh sách
      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempMessage.id ? realMessage : msg))
      );

      // Cập nhật ChatList với tin nhắn mới
      updateConversationWithNewMessage(conversation.conversationId, newMessage);

      // Xóa danh sách tập tin đính kèm sau khi gửi
      setAttachments([]);
    } catch (error: any) {
      console.error("Lỗi khi gửi tin nhắn:", error);
      // Đánh dấu tin nhắn tạm là lỗi
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempMessage.id 
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
    setEmojiPickerVisible(false);
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
            {messages.map((message, index) => {
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
                onChange={(e) => setInputValue(e.target.value)}
                onPressEnter={handleKeyPress}
              />
              <Tooltip title="Sticker">
                <SmileOutlined className="text-lg text-gray-600 cursor-pointer hover:text-blue-500" />
              </Tooltip>
              <Tooltip title="Ảnh/Video">
                <PictureOutlined className="text-lg text-gray-600 cursor-pointer hover:text-blue-500" onClick={() => imageInputRef.current?.click()} />
              </Tooltip>

              {inputValue.trim() || attachments.length > 0 ? (
                <SendOutlined
                  className="text-xl cursor-pointer hover:text-primary text-blue-500"
                onClick={handleSendMessage}
                />
              ) : (
                <button
                  className="text-2xl focus:outline-none"
                  onClick={() => {
                    // Send thumbs up reaction immediately
                    const thumbsUp = "👍";
                    try {
                      // Show temporary message first
                      const tempMessage: DisplayMessage = {
                        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        content: thumbsUp,
                        timestamp: new Date().toISOString(),
                        sender: {
                          id: currentUserId,
                          name: "Bạn",
                          avatar: userCache[currentUserId]?.urlavatar || "",
                        },
                        type: "text",
                        isRead: false,
                        sendStatus: "sending",
                        readBy: [],
                        deliveredTo: [],
                      };

                      // Add temp message to list
                      setMessages((prev) => [...prev, tempMessage]);
                      scrollToBottomSmooth();

                      // Send the actual message
                      sendMessage(conversation.conversationId, thumbsUp)
                        .then((newMessage) => {
                          if (newMessage && newMessage.messageDetailId) {
                            // Replace temp message with real one
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
                              type: "text",
                              isRead: Array.isArray(newMessage.readBy) && newMessage.readBy.length > 0,
                              readBy: newMessage.readBy || [],
                              deliveredTo: newMessage.deliveredTo || [],
                              sendStatus: determineMessageStatus(newMessage, currentUserId),
                            };

                            // Update messages list
                            setMessages((prev) =>
                              prev.map((msg) =>
                                msg.id === tempMessage.id ? realMessage : msg
                              )
                            );

                            // Update conversation list
                            updateConversationWithNewMessage(
                              conversation.conversationId,
                              newMessage
                            );
                          }
                        })
                        .catch((error) => {
                          console.error("Lỗi khi gửi tin nhắn:", error);
                          // Mark temp message as error
                          setMessages((prev) =>
                            prev.map((msg) =>
                              msg.id === tempMessage.id
                                ? {
                                    ...msg,
                                    content: `${msg.content} (Không gửi được)`,
                                    isError: true,
                                  }
                                : msg
                            )
                          );
                          message.error("Không thể gửi tin nhắn");
                        });
                    } catch (error: any) {
                      console.error("Lỗi khi gửi tin nhắn:", error);
                      message.error(error.message || "Không thể gửi tin nhắn");
                    }
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
    </div>
  );
};

export default ChatArea; 
