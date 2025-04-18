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
  Modal,
  Dropdown,
  Menu,
} from "antd";
import {
  SendOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  ReloadOutlined,
  DownOutlined,
  SmileOutlined,
  PictureOutlined,
  CheckOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  FileOutlined,
  FileImageOutlined,
  DeleteOutlined,
  UndoOutlined,
  MoreOutlined,
  ShareAltOutlined,
  CommentOutlined,
  CopyOutlined,
  PushpinOutlined,
  StarOutlined,
  UnorderedListOutlined,
  InfoCircleOutlined,
  EllipsisOutlined,
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
  recallMessage,
  deleteMessage,
} from "../../api/API";
import { useLanguage } from "../../features/auth/context/LanguageContext";
import { formatMessageTime } from "../../utils/dateUtils";
import { Avatar } from "../common/Avatar";
import { DisplayMessage } from "../../features/chat/types/chatTypes";
import { useConversationContext } from "../../features/chat/context/ConversationContext";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import socketService from "../../services/socketService";
import FileUploader from './FileUploader';
import ReactPlayer from 'react-player';

// Chuyển đổi Message từ API sang định dạng tin nhắn cần hiển thị


interface ChatAreaProps {
  conversation: Conversation | null;
  viewingImages?: boolean;
}

export function ChatArea({ conversation, viewingImages }: ChatAreaProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
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
  const { 
    markConversationAsRead, 
    updateConversationWithNewMessage,
    updateUnreadStatus,
    userCache 
  } = useConversationContext();
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

  // Add state for the image modal
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Add state for message actions
  const [messageActionLoading, setMessageActionLoading] = useState<string | null>(null);

  // Add state for tracking active message hover menu
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);

  // Add state for tracking dropdown visibility
  const [dropdownVisible, setDropdownVisible] = useState<{[key: string]: boolean}>({});
  
  useEffect(() => {
    if (!conversation) return; // Early return if no conversation
    
    async function initialLoad() {
      setLoading(true);
      setMessages([]);
      setNotifications([]);
      // ... existing code ...
    }
    
    initialLoad();
    return () => {
      // Only attempt to leave if we have a valid conversation
      if (conversation && conversation.conversationId) {
        socketService.leaveConversation(conversation.conversationId);
      }
    };
  }, [conversation?.conversationId]);

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
      // Mark this conversation as read when it's selected
      markConversationAsRead(conversation.conversationId);
      
      // Tải tin nhắn gần nhất với hướng 'before' và không có cursor
      fetchMessages(undefined, "before");
      
      // Tham gia vào phòng chat
      socketService.joinConversations([conversation.conversationId]);
      
      // Callback để xử lý tin nhắn mới từ socket
      const handleNewMessage = (data: any) => {
        console.log("New message from socket:", data);
        
        // Kiểm tra xem tin nhắn có thuộc cuộc trò chuyện hiện tại không
        if (!conversation || data.conversationId !== conversation.conversationId) {
          // Cập nhật danh sách cuộc trò chuyện để hiển thị tin nhắn mới
          updateConversationWithNewMessage(data.conversationId, data.message);
          return;
        }
        
        // Also update the conversation in the list for current conversation
        updateConversationWithNewMessage(data.conversationId, data.message);
        
        // Rest of the existing code for updating the current conversation's messages
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
        
        console.log("New message with ID:", messageId);
        
        // Cải thiện kiểm tra tin nhắn trùng lặp
        // Kiểm tra xem tin nhắn đã tồn tại với ID thực hoặc là tin nhắn tạm với cùng nội dung
        setMessages(prevMessages => {
          // Kiểm tra theo ID thực
          const exactIdMatch = prevMessages.some(m => m.id === messageId);
          
          // Kiểm tra tin nhắn tạm dựa trên nội dung và senderId
          const tempMessageWithSameContent = prevMessages.find(m => 
            m.id.startsWith('temp-') && 
            m.sender.id === msg.senderId && 
            m.content === msg.content &&
            Math.abs(new Date(m.timestamp).getTime() - new Date(msg.createdAt || Date.now()).getTime()) < 10000
          );
          
          // Nếu đã có tin nhắn với ID thực, không thêm vào nữa
          if (exactIdMatch) {
            console.log(`Duplicate message with exact ID match detected and skipped: ${messageId}`);
            return prevMessages;
          }
          
          // Nếu có tin nhắn tạm với cùng nội dung, thay thế tin nhắn tạm bằng tin nhắn thực
          if (tempMessageWithSameContent) {
            console.log(`Replacing temporary message with real message: ${tempMessageWithSameContent.id} -> ${messageId}`);
            
            // Tiếp tục xử lý để tạo tin nhắn hiển thị thực tế
            // Nếu là document MongoDB, sử dụng dữ liệu từ _doc
            let messageData = msg;
            if (msg._doc) {
              messageData = { ...msg._doc, messageDetailId: messageId };
            } else if (typeof msg === 'object' && Object.keys(msg).length === 0) {
              console.warn("Empty message object received");
              return prevMessages;
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
              sendStatus: messageData.senderId === currentUserId ? 
                (messageData.sendStatus || "sent") : "received",
              // Lưu ID tạm thời để hỗ trợ việc cập nhật
              tempId: tempMessageWithSameContent.id,
              isRecall: messageData.isRecall || false,
              hiddenFrom: messageData.hiddenFrom || [],
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
            
            // Nếu tin nhắn này là từ người khác, đánh dấu là đã đọc
            if (displayMessage.sender.id !== currentUserId) {
              // Đánh dấu tin nhắn là đã đọc (nếu người dùng đang xem cuộc trò chuyện)
              socketService.markMessagesAsRead(conversation.conversationId, [displayMessage.id]);
              
              // Thông báo cho người gửi rằng tin nhắn đã được gửi thành công (tin nhắn đã được nhận)
              socketService.markMessagesAsDelivered(conversation.conversationId, [displayMessage.id]);
              
              // Nếu không phải là tin nhắn từ người dùng hiện tại, xóa trạng thái typing
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
            
            // Cập nhật danh sách cuộc trò chuyện với tin nhắn mới
            updateConversationWithNewMessage(conversation.conversationId, {
              content: messageData.content,
              type: messageData.type,
              createdAt: messageData.createdAt,
              senderId: messageData.senderId
            });
            
            // Thay thế tin nhắn tạm bằng tin nhắn thực
            return prevMessages.map(m => m.id === tempMessageWithSameContent.id ? displayMessage : m);
          }
          
          // Nếu không tìm thấy tin nhắn trùng, xử lý như bình thường
          // ... existing newMessage handling code ...
          // Nếu là document MongoDB, sử dụng dữ liệu từ _doc
          let messageData = msg;
          if (msg._doc) {
            messageData = { ...msg._doc, messageDetailId: messageId };
          } else if (typeof msg === 'object' && Object.keys(msg).length === 0) {
            console.warn("Empty message object received");
            return prevMessages;
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
            // Thiết lập rõ ràng trạng thái tin nhắn dựa trên dữ liệu từ server
            sendStatus: messageData.senderId === currentUserId ? 
              (messageData.sendStatus || "sent") : "received",
            isRecall: messageData.isRecall || false,
            hiddenFrom: messageData.hiddenFrom || [],
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
          
          // Nếu tin nhắn này là từ người khác, đánh dấu là đã đọc
          if (displayMessage.sender.id !== currentUserId) {
            // Đánh dấu tin nhắn là đã đọc (nếu người dùng đang xem cuộc trò chuyện)
            socketService.markMessagesAsRead(conversation.conversationId, [displayMessage.id]);
            
            // Thông báo cho người gửi rằng tin nhắn đã được gửi thành công (tin nhắn đã được nhận)
            socketService.markMessagesAsDelivered(conversation.conversationId, [displayMessage.id]);
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
          
          // Cập nhật danh sách cuộc trò chuyện với tin nhắn mới
          updateConversationWithNewMessage(conversation.conversationId, {
            content: messageData.content,
            type: messageData.type,
            createdAt: messageData.createdAt,
            senderId: messageData.senderId
          });
          
          return [...prevMessages, displayMessage];
        });
        
        // Cuộn đến tin nhắn mới
        scrollToBottomSmooth();
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
        // Kiểm tra xem sự kiện liên quan đến cuộc trò chuyện hiện tại không
        if (data.conversationId !== conversation.conversationId) {
          // Still update the unread status in the conversation list even if it's not the current conversation
          updateUnreadStatus(data.conversationId, data.messageIds);
          return;
        }
        
        // Cập nhật tin nhắn đã đọc trong cuộc trò chuyện hiện tại
        if (Array.isArray(data.messageIds) && data.messageIds.length > 0) {
          setMessages(prev => 
            prev.map(msg => {
              // Nếu ID tin nhắn nằm trong danh sách đã đọc
              if (data.messageIds.includes(msg.id)) {
                // Nếu mảng readBy chưa có userId này, thêm vào
                if (!msg.readBy) {
                  msg.readBy = [data.userId];
                } else if (!msg.readBy.includes(data.userId)) {
                  msg.readBy = [...msg.readBy, data.userId];
                }
                return {
                  ...msg,
                  isRead: true,
                  readBy: msg.readBy,
                  // Add sendStatus update for own messages
                  sendStatus: msg.sender.id === currentUserId ? "read" : msg.sendStatus
                };
              }
              return msg;
            })
          );
        }
        
        // Also update the conversation in the list
        updateUnreadStatus(data.conversationId, data.messageIds);
      };
      
      // Callback cho sự kiện tin nhắn đã gửi
      const handleMessageDelivered = (data: { conversationId: string, messageIds: string[], userId: string }) => {
        if (data.conversationId !== conversation.conversationId) return;
        
        console.log("📬 MessageDelivered event received:", data);
        
        // Cập nhật trạng thái đã gửi cho tin nhắn
        setMessages(prevMessages => {
          let hasUpdates = false;
          const updatedMessages = prevMessages.map(msg => {
            if (data.messageIds.includes(msg.id)) {
              // Chỉ cập nhật thành "delivered" nếu chưa đến trạng thái "read"
              // và nếu đây là tin nhắn của người dùng hiện tại
              if (msg.sendStatus !== "read" && msg.sender.id === currentUserId && data.userId !== currentUserId) {
                console.log("Updating message status to DELIVERED:", msg.id, "Previous status:", msg.sendStatus);
                hasUpdates = true;
                
                // Kiểm tra xem userId đã tồn tại trong mảng deliveredTo chưa
                const newDeliveredTo = msg.deliveredTo || [];
                if (!newDeliveredTo.includes(data.userId)) {
                  newDeliveredTo.push(data.userId);
                }
                
                return {
                  ...msg,
                  deliveredTo: newDeliveredTo,
                  sendStatus: "delivered"
                };
              }
            }
            return msg;
          });
          
          // Chỉ cập nhật state nếu có thay đổi thực sự
          return hasUpdates ? updatedMessages : prevMessages;
        });
      };
      
      // Đăng ký lắng nghe các sự kiện socket
      socketService.onNewMessage(handleNewMessage);
      socketService.onUserTyping(handleUserTyping);
      socketService.onMessageRead(handleMessageRead);
      socketService.onMessageDelivered(handleMessageDelivered);
      
      // Cleanup khi unmount hoặc change conversation
      return () => {
        // Hủy đăng ký các sự kiện
        socketService.off("newMessage", handleNewMessage);
        socketService.off("userTyping", handleUserTyping);
        socketService.off("messageRead", handleMessageRead);
        socketService.off("messageDelivered", handleMessageDelivered);
        
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
    if (isValidConversation && messages.length > 0 && conversation) {
      // Lọc các tin nhắn từ người khác, chưa được đọc
      const unreadMessages = messages
        .filter(msg => 
          msg.sender.id !== currentUserId && 
          (!msg.readBy || !msg.readBy.includes(currentUserId))
        )
        .map(msg => msg.id);
      
      if (unreadMessages.length > 0) {
        console.log("🔍 Marking unread messages as read:", unreadMessages);
        socketService.markMessagesAsRead(conversation.conversationId, unreadMessages);
      }
    }
  }, [messages, currentUserId, conversation?.conversationId, isValidConversation]);

  // UseEffect để áp dụng logic loại bỏ tin nhắn trùng lặp khi danh sách tin nhắn thay đổi
  useEffect(() => {
    // Nếu không áp dụng deduplication liên tục, hiệu suất sẽ tốt hơn
    // Chỉ áp dụng khi số lượng tin nhắn vượt quá một ngưỡng nhất định
    if (messages.length > 10) {
      const deduplicatedMessages = deduplicateMessages(messages);
      
      // Chỉ cập nhật nếu số lượng tin nhắn đã thay đổi để tránh vòng lặp vô hạn
      if (deduplicatedMessages.length !== messages.length) {
        console.log(`Applied deduplication: ${messages.length} -> ${deduplicatedMessages.length} messages`);
        setMessages(deduplicatedMessages);
      }
    }
  }, [messages]);

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
        sendStatus: "sent", // Đặt rõ ràng trạng thái ban đầu khi gửi thành công là "sent"
        // Lưu ID tạm thời để hỗ trợ việc cập nhật
        tempId: tempId,
        isRecall: newMessage.isRecall || false,
        hiddenFrom: newMessage.hiddenFrom || [],
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

      // Cập nhật danh sách tin nhắn dựa trên hướng tải và áp dụng deduplication
      setMessages((prev) => {
        // Kiểm tra xem tin nhắn thực đã tồn tại trong danh sách chưa (bằng ID)
        const realMessageExists = prev.some(msg => msg.id === realMessage.id);
        
        // Kiểm tra xem tin nhắn tạm còn tồn tại không 
        const tempMessageExists = prev.some(msg => msg.id === tempId);
        
        // Thêm kiểm tra tin nhắn trùng lặp dựa trên nội dung
        // Tìm các tin nhắn có cùng nội dung, gửi bởi cùng người, trong khoảng thời gian 5 giây
        const similarMessages = prev.filter(msg => 
          msg.id !== tempId && // không phải tin nhắn tạm hiện tại
          msg.id !== realMessage.id && // không phải tin nhắn thực hiện tại
          msg.sender.id === realMessage.sender.id && // cùng người gửi
          msg.content === realMessage.content && // cùng nội dung
          Math.abs(new Date(msg.timestamp).getTime() - new Date(realMessage.timestamp).getTime()) < 5000 // trong vòng 5 giây
        );
        
        if (similarMessages.length > 0) {
          console.log("Found similar messages that might be duplicates:", similarMessages.map(m => m.id));
        }
        
        if (realMessageExists && tempMessageExists) {
          // Tin nhắn thực đã tồn tại và tin nhắn tạm vẫn còn - chỉ loại bỏ tin nhắn tạm
          console.log(`Removing temp message ${tempId} as real message ${realMessage.id} already exists`);
          const result = prev.filter(msg => msg.id !== tempId);
          
          // Loại bỏ thêm các tin nhắn trùng lặp nếu có
          if (similarMessages.length > 0) {
            return result.filter(msg => !similarMessages.some(similar => similar.id === msg.id));
          }
          
          return result;
        } else if (realMessageExists) {
          // Tin nhắn thực đã tồn tại nhưng không còn tin nhắn tạm - giữ nguyên danh sách
          console.log(`Real message ${realMessage.id} already exists, no temp message to remove`);
          
          // Loại bỏ các tin nhắn trùng lặp nếu có
          if (similarMessages.length > 0) {
            return prev.filter(msg => !similarMessages.some(similar => similar.id === msg.id));
          }
          
          return prev;
        } else if (tempMessageExists) {
          // Tin nhắn tạm tồn tại, tin nhắn thực chưa có - thay thế tin nhắn tạm bằng tin nhắn thực
          console.log(`Replacing temp message ${tempId} with real message ${realMessage.id}`);
          const result = prev.map(msg => msg.id === tempId ? realMessage : msg);
          
          // Loại bỏ thêm các tin nhắn trùng lặp nếu có
          if (similarMessages.length > 0) {
            return result.filter(msg => !similarMessages.some(similar => similar.id === msg.id));
          }
          
          return result;
        } else {
          // Không tìm thấy cả tin nhắn tạm và tin nhắn thực - thêm tin nhắn thực vào
          // Điều này chỉ xảy ra trong trường hợp hiếm gặp khi tin nhắn tạm đã bị xóa bằng cách nào đó
          console.log(`No temp message ${tempId} found, adding real message ${realMessage.id}`);
          
          // Loại bỏ các tin nhắn trùng lặp nếu có, sau đó thêm tin nhắn mới
          if (similarMessages.length > 0) {
            return [...prev.filter(msg => !similarMessages.some(similar => similar.id === msg.id)), realMessage];
          }
          
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

      // Sau khi gửi thành công, kiểm tra người nhận có đang xem conversation không để cập nhật trạng thái
      const activeUsers = socketService.getActiveUsersInConversation(conversation.conversationId);
      const otherActiveUsers = activeUsers.filter(id => id !== currentUserId);
      
      // Nếu có người nhận đang active, cập nhật trạng thái tin nhắn ngay lập tức
      if (otherActiveUsers.length > 0) {
        // Cập nhật UI để hiển thị trạng thái "đã đọc" ngay
        setMessages(prev => 
          prev.map(msg => {
            if (msg.id === tempId || msg.id === newMessage.messageDetailId) {
              return {
                ...msg,
                id: newMessage.messageDetailId || msg.id,
                deliveredTo: otherActiveUsers,
                sendStatus: "delivered" // Hoặc "read" nếu đã đọc
              };
            }
            return msg;
          })
        );
      }
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
          (emojiPickerElement as HTMLElement).style.width = "320px";
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
    // Log để debug
    console.log("Determining status for message:", { 
      id: msg.messageDetailId || msg.id,
      readBy: msg.readBy,
      deliveredTo: msg.deliveredTo,
      sendStatus: msg.sendStatus
    });
    
    if (msg.senderId === currentUserId) {
      // 1. Nếu có trạng thái gửi cụ thể
      if (msg.sendStatus === "read") {
        return "read";
      }
      
      // 2. Kiểm tra trực tiếp mảng readBy
      if (Array.isArray(msg.readBy) && msg.readBy.length > 0) {
        // Nếu có ít nhất một người khác đã đọc tin nhắn (không tính người gửi)
        const otherReadersCount = msg.readBy.filter((id: string) => id !== currentUserId).length;
        if (otherReadersCount > 0) {
          console.log("Message marked as READ based on readBy array:", msg.messageDetailId || msg.id);
          return "read";
        }
      }
      
      // 3. Kiểm tra trạng thái delivered
      if (msg.sendStatus === "delivered") {
        return "delivered";
      }
      
      // 4. Kiểm tra mảng deliveredTo
      if (Array.isArray(msg.deliveredTo) && msg.deliveredTo.length > 0) {
        // Nếu có ít nhất một người khác đã nhận tin nhắn (không tính người gửi)
        const otherReceiversCount = msg.deliveredTo.filter((id: string) => id !== currentUserId).length;
        if (otherReceiversCount > 0) {
          return "delivered";
        }
      }
      
      // 5. Kiểm tra trạng thái gửi khác
      if (msg.sendStatus === "sending") {
        return "sending";
      }
      
      // Mặc định trạng thái đã gửi nếu không có thông tin khác
      return "sent";
    }
    
    // Với tin nhắn nhận được, luôn đánh dấu là "received"
    return "received";
  };
  
  // Enhance the message status indicator
  const renderMessageStatus = (message: DisplayMessage, isOwn: boolean) => {
    if (!isOwn) return null;
    
    if (message.isError) {
      return (
        <span className="text-red-500 text-xs ml-1 flex items-center">
          <span className="mr-1">⚠️</span>
          Lỗi
        </span>
      );
    }
    
    switch (message.sendStatus) {
      case 'sending':
        return (
          <span className="text-gray-400 text-xs ml-1 flex items-center">
            <LoadingOutlined className="mr-1" style={{ fontSize: '10px' }} />
            Đang gửi
          </span>
        );
      case 'sent':
        return (
          <span className="text-blue-400 text-xs ml-1 flex items-center">
            <CheckOutlined className="mr-1" style={{ fontSize: '10px' }} />
            Đã gửi
          </span>
        );
      case 'delivered':
        return (
          <span className="text-blue-400 text-xs ml-1 flex items-center">
            <span className="mr-1">✓✓</span>
            Đã nhận
          </span>
        );
      case 'read':
        return (
          <span className="text-blue-500 text-xs ml-1 flex items-center">
            <CheckCircleOutlined className="mr-1" style={{ fontSize: '10px' }} />
            Đã xem
          </span>
        );
      default:
        return (
          <span className="text-blue-400 text-xs ml-1 flex items-center">
            <CheckOutlined className="mr-1" style={{ fontSize: '10px' }} />
            Đã gửi
          </span>
        );
    }
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

  // Handle image click to open the modal
  const handleImagePreview = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setIsImageModalOpen(true);
  };
  
  // Close the image modal
  const closeImageModal = () => {
    setIsImageModalOpen(false);
    setSelectedImage(null);
  };

  // Handle file download image in text-with-image function
  const handleDownloadFile = (url?: string, fileName?: string) => {
    if (!url) {
      message.error("URL tải xuống không có sẵn");
      return;
    }
    
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Lỗi khi tải xuống tập tin:", error);
      message.error("Không thể tải xuống tập tin. Vui lòng thử lại sau.");
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
    if (!messagesToDeduplicate.length) return [];
    
    console.log("Deduplicating messages, input count:", messagesToDeduplicate.length);
    
    // Get current user ID to check hidden messages
    const currentUserId = localStorage.getItem("userId") || "";
    
    // First filter out any messages that should be hidden from current user
    const visibleMessages = messagesToDeduplicate.filter(msg => 
      !Array.isArray(msg.hiddenFrom) || !msg.hiddenFrom.includes(currentUserId)
    );
    
    // Sắp xếp tin nhắn theo thời gian để đảm bảo thứ tự đúng
    const sortedMessages = [...visibleMessages].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    const uniqueMessages: DisplayMessage[] = [];
    const seenMessages = new Set<string>(); // Set của các key đã thấy
    const processedIds = new Set<string>(); // Set của các ID đã xử lý
    
    // Tạo map tin nhắn tạm thời và tin nhắn thực
    const tempToRealMap = new Map<string, string>();
    
    // Đầu tiên, xác định các cặp tin nhắn tạm - tin nhắn thực
    for (const message of sortedMessages) {
      if (message.tempId && !message.id.startsWith('temp-')) {
        tempToRealMap.set(message.tempId, message.id);
      }
    }
    
    for (const message of sortedMessages) {
      // Bỏ qua tin nhắn tạm nếu đã có tin nhắn thực tương ứng
      if (message.id.startsWith('temp-') && tempToRealMap.has(message.id)) {
        console.log(`Skipping temporary message ${message.id} as real message exists`);
        continue;
      }
      
      // Bỏ qua tin nhắn đã xử lý
      if (processedIds.has(message.id)) {
        continue;
      }
      
      // Đánh dấu ID này đã được xử lý
      processedIds.add(message.id);
      
      // Tạo khóa nội dung dựa trên loại tin nhắn
      let contentKey = '';
      if (message.type === 'image') {
        const imageUrl = message.fileUrl || 
                        (message.attachment && message.attachment.url) || 
                        (message.attachments && message.attachments.length > 0 ? message.attachments[0].url : '');
        contentKey = `${message.sender.id}:${imageUrl}:${message.type}`;
      } else if (message.type === 'file') {
        contentKey = `${message.sender.id}:${message.fileName}:${message.fileSize}:${message.type}`;
      } else {
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
          
          // Mở rộng khoảng thời gian kiểm tra trùng lặp lên 10 giây
          if (timeDiff < 10000) {
            // Log thông tin tin nhắn trùng lặp để debug
            console.log(`Potential duplicate found: ${existingMessage.id} and ${message.id}, time diff: ${timeDiff}ms`);
            
            // Luôn ưu tiên tin nhắn có ID thực sự từ server
            if (message.id.startsWith('temp-') && !existingMessage.id.startsWith('temp-')) {
              // Giữ nguyên tin nhắn hiện tại (không phải temp)
              console.log(`Keeping real message ${existingMessage.id}, discarding temp ${message.id}`);
              continue;
            } else if (!message.id.startsWith('temp-') && existingMessage.id.startsWith('temp-')) {
              // Thay thế tin nhắn tạm bằng tin nhắn thực
              console.log(`Replacing temp message ${existingMessage.id} with real ${message.id}`);
              uniqueMessages[existingIndex] = message;
              continue;
            } 
            // Nếu cả hai đều là tin nhắn tạm hoặc đều là tin nhắn thực
            else if ((message.id.startsWith('temp-') && existingMessage.id.startsWith('temp-')) ||
                     (!message.id.startsWith('temp-') && !existingMessage.id.startsWith('temp-'))) {
              
              // Ưu tiên tin nhắn có trạng thái tốt hơn
              const statusPriority = {
                'read': 4,
                'delivered': 3,
                'sent': 2,
                'sending': 1,
                'error': 0
              };
              
              const existingStatus = existingMessage.sendStatus || 'sent';
              const newStatus = message.sendStatus || 'sent';
              
              if (statusPriority[newStatus as keyof typeof statusPriority] > 
                  statusPriority[existingStatus as keyof typeof statusPriority]) {
                console.log(`Replacing message with better status: ${existingStatus} -> ${newStatus}`);
                uniqueMessages[existingIndex] = message;
              }
              // Nếu trạng thái bằng nhau, giữ tin nhắn mới hơn
              else if (statusPriority[newStatus as keyof typeof statusPriority] === 
                      statusPriority[existingStatus as keyof typeof statusPriority] &&
                      new Date(message.timestamp) > new Date(existingMessage.timestamp)) {
                console.log(`Replacing with newer message of same status`);
                uniqueMessages[existingIndex] = message;
              }
              
              continue;
            }
          }
        }
      }
      
      // Đánh dấu đã thấy tin nhắn này
      seenMessages.add(contentKey);
      uniqueMessages.push(message);
    }
    
    console.log("Deduplicated messages, output count:", uniqueMessages.length);
    
    // Sắp xếp lại kết quả theo thời gian để đảm bảo thứ tự đúng
    return uniqueMessages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };

  // Ở phần render messages, sử dụng hàm deduplicateMessages
  const messagesToRender: DisplayMessage[] = deduplicateMessages(messages);

  // Tải tin nhắn từ server
  const fetchMessages = async (
    cursor?: string,
    direction: "before" | "after" = "before"
  ) => {
    // Define currentUserId at the beginning of the function to avoid reference error
    const currentUserId = localStorage.getItem("userId") || "";
    
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
            isRecall: msg.isRecall || false,
            hiddenFrom: msg.hiddenFrom || [],
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

      // Filter out messages that should be hidden from current user
      const filteredMessages = displayMessages.filter(msg => {
        // Filter out messages that are hidden from current user
        if (Array.isArray(msg.hiddenFrom) && msg.hiddenFrom.includes(currentUserId)) {
          console.log(`Filtering out message ${msg.id} hidden from current user`);
          return false;
        }
        return true;
      });

      console.log(
        `Sau khi lọc: ${filteredMessages.length} tin nhắn hiển thị`
      );

      // Sắp xếp tin nhắn theo thời gian tăng dần (cũ nhất lên đầu, mới nhất xuống cuối)
      const sortedMessages = [...filteredMessages].sort(
        (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      // Cập nhật danh sách tin nhắn dựa trên hướng tải và áp dụng deduplication
      if (cursor) {
        if (direction === "before") {
          // Thêm tin nhắn cũ vào đầu danh sách khi kéo lên và loại bỏ trùng lặp
          setMessages((prev) => {
            // Tạo danh sách tin nhắn mới bằng cách kết hợp với tin nhắn hiện tại
            const combinedMessages = [...sortedMessages, ...prev];
            
            // Áp dụng deduplication
            const dedupedMessages = deduplicateMessages(combinedMessages);
            
            console.log(`Deduplicated: ${combinedMessages.length} -> ${dedupedMessages.length} messages`);
            
            // Khôi phục vị trí cuộn sau khi thêm tin nhắn cũ để tránh nhảy vị trí
            setTimeout(() => {
              if (scrollContainer) {
                const newScrollHeight = scrollContainer.scrollHeight;
                const heightDifference = newScrollHeight - scrollHeight;
                scrollContainer.scrollTop = scrollPosition + heightDifference;
              }
            }, 10);
            
            return dedupedMessages;
          });
      } else {
          // Thêm tin nhắn mới vào cuối danh sách khi kéo xuống và loại bỏ trùng lặp
          setMessages((prev) => {
            // Tạo danh sách tin nhắn mới bằng cách kết hợp với tin nhắn hiện tại
            const combinedMessages = [...prev, ...sortedMessages];
            
            // Áp dụng deduplication
            const dedupedMessages = deduplicateMessages(combinedMessages);
            
            console.log(`Deduplicated: ${combinedMessages.length} -> ${dedupedMessages.length} messages`);
            
            // Cuộn xuống dưới sau khi thêm tin nhắn mới
            scrollToBottomSmooth();
            
            return dedupedMessages;
          });
        }
      } else {
        // Thay thế hoàn toàn nếu là lần tải đầu tiên, đảm bảo tin nhắn cũ lên đầu
        // Áp dụng deduplication
        const dedupedMessages = deduplicateMessages(sortedMessages);
        
        console.log(`Initial load deduplicated: ${sortedMessages.length} -> ${dedupedMessages.length} messages`);
        
        setMessages(dedupedMessages);

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
      // Replace static message.error call with state management
      // message.error(errorMessage);
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
      setError("Lỗi khi tải thêm tin nhắn cũ hơn!");
      console.error("Error loading more messages:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, oldestCursor]);

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
  ]);

  const renderInputArea = () => {
    return (
      <div className="chat-input-container bg-white border-t border-gray-200">
        {/* Display pasted image if any */}
        {pastedImage && pastedImagePreview && (
          <div className="pasted-image-preview p-2 border-b border-gray-100 flex items-center">
            <div className="relative">
              <img src={pastedImagePreview} alt="Pasted" className="h-16 rounded object-cover" />
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

        {/* Main input area */}
        <div className="flex items-center p-2">
          {/* Input field */}
          <div className="flex-grow">
            <Input
              className="w-full py-2 px-2 bg-gray-100 rounded-2xl border-none focus:shadow-none"
              placeholder={
                isUploading
                  ? "Đang tải lên..."
                  : `Nhắn @, tin nhắn tới ${conversation?.isGroup ? conversation.groupName : "Bạn"}`
              }
              bordered={false}
              disabled={isUploading}
              value={inputValue}
              onChange={handleInputChange}
              onPressEnter={handleKeyPress}
            />
          </div>

          {/* File attachment button */}
          <div className="flex-shrink-0 mr-2">
            {isValidConversation && (
              <FileUploader 
                conversationId={conversation?.conversationId || ''}
                onUploadComplete={(result) => {
                  console.log('File uploaded successfully:', result);
                }}
                onUploadError={(error) => {
                  console.error('File upload error:', error);
                  message.error('Failed to upload file. Please try again.');
                }}
              />
            )}
          </div>
          
          {/* Image button */}
          <div className="flex-shrink-0 mr-2">
            <Tooltip title="Gửi hình ảnh">
              <Button
                type="text"
                icon={<PictureOutlined />}
                onClick={handleImageClick}
                disabled={!isValidConversation}
              />
            </Tooltip>
          </div>
          
          {/* Emoji picker button */}
          <div className="emoji-picker-container flex-shrink-0 relative mr-2">
            <Button 
              type="text" 
              icon={<SmileOutlined />} 
              onClick={toggleEmojiPicker} 
              className="emoji-button"
            />
            {emojiPickerVisible && (
              <div className="emoji-picker absolute bottom-12 left-0 z-10 shadow-lg rounded-lg bg-white emoji-picker-container" style={{ width: '320px', height: '350px' }}>
                <Picker 
                  data={data} 
                  onEmojiSelect={handleEmojiSelect} 
                  theme="light"
                  previewPosition="none"
                />
              </div>
            )}
          </div>
          
          {/* Like/Send button */}
          <div className="flex-shrink-0 ml-2">
            {inputValue.trim() || attachments.length > 0 || pastedImage ? (
              <Button
                type="primary"
                shape="circle"
                icon={<SendOutlined />}
                onClick={handleSendMessage}
                disabled={!isValidConversation}
              />
            ) : (
              <Button
                type="primary" 
                shape="circle"
                icon={
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                  </svg>
                }
                onClick={handleSendLike}
                disabled={!isValidConversation}
              />
            )}
          </div>
        </div>
        
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
      </div>
    );
  };

  // Function to handle sending a "like" message
  const handleSendLike = async () => {
    if (!isValidConversation) return;
    
    // Create a temporary message with thumbs up emoji
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tempMessage: DisplayMessage = {
      id: tempId,
      content: '👍',
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
    
    // Update UI with temporary message
    setMessages(prev => [...prev, tempMessage]);
    scrollToBottomSmooth();
    
    // Send message to server
    try {
      // Send the like message to the server
      const newMessage = await sendMessage(
        conversation.conversationId,
        '👍',
        "text",
        []
      );
      
      if (newMessage && newMessage.messageDetailId) {
        // Create a real message object to replace the temporary one
        const sender = userCache[currentUserId] || {
          fullname: "Bạn",
          urlavatar: "",
        };
        
        const realMessage: DisplayMessage = {
          id: newMessage.messageDetailId,
          content: '👍',
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
          sendStatus: "sent",
          tempId: tempId
        };
        
        // Replace temporary message with real one
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === tempId ? realMessage : msg
          )
        );
      } else {
        console.error('Failed to send like message:', newMessage);
        // Update temp message to show error
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempId ? { ...msg, isError: true, sendStatus: undefined } : msg
          )
        );
        message.error("Không thể gửi tin nhắn. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error('Error sending like message:', error);
      // Update temp message to show error
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId ? { ...msg, isError: true, sendStatus: undefined } : msg
        )
      );
      message.error("Không thể gửi tin nhắn. Vui lòng thử lại.");
    }
  };

  // Add socket listeners for message recall and delete
  useEffect(() => {
    socketService.onMessageRecall((data) => {
      if (data.conversationId === conversation?.conversationId) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === data.messageId ? { ...msg, isRecall: true } : msg
          )
        );
      }
    });

    socketService.onMessageDeleted((data) => {
      if (
        data.conversationId === conversation?.conversationId &&
        data.userId === currentUserId
      ) {
        setMessages((prevMessages) =>
          prevMessages.filter((msg) => msg.id !== data.messageId)
        );
      }
    });

    return () => {
      socketService.off("messageRecalled", () => {});
      socketService.off("messageDeleted", () => {});
    };
  }, [conversation?.conversationId, currentUserId]);

  // Add handlers for message recall and delete
  const handleRecallMessage = async (messageId: string) => {
    try {
      setMessageActionLoading(messageId);
      await recallMessage(messageId);
      // UI update will happen through socket event
      message.success("Thu hồi tin nhắn thành công");
    } catch (error) {
      console.error("Error recalling message:", error);
      message.error("Không thể thu hồi tin nhắn. Vui lòng thử lại sau.");
    } finally {
      setMessageActionLoading(null);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      setMessageActionLoading(messageId);
      await deleteMessage(messageId);
      // Immediately update UI
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== messageId)
      );
      message.success("Xóa tin nhắn thành công");
    } catch (error) {
      console.error("Error deleting message:", error);
      message.error("Không thể xóa tin nhắn. Vui lòng thử lại sau.");
    } finally {
      setMessageActionLoading(null);
    }
  };

  // Add a function to handle copying message text
  const handleCopyMessage = (messageContent: string) => {
    navigator.clipboard.writeText(messageContent)
      .then(() => {
        message.success("Đã sao chép tin nhắn vào clipboard");
      })
      .catch(err => {
        console.error("Lỗi khi sao chép: ", err);
        message.error("Không thể sao chép tin nhắn");
      });
  };

  // Update the message menu to include the copy functionality
  const getMessageMenu = (message: DisplayMessage) => (
    <Menu className="message-options-menu">
      <Menu.Item 
        key="copy" 
        icon={<CopyOutlined />}
        onClick={() => handleCopyMessage(message.content)}
      >
        Copy tin nhắn
      </Menu.Item>
      <Menu.Item key="pin" icon={<PushpinOutlined />}>
        Ghim tin nhắn
      </Menu.Item>
      <Menu.Item key="mark" icon={<StarOutlined />}>
        Đánh dấu tin nhắn
      </Menu.Item>
      <Menu.Item key="selectMultiple" icon={<UnorderedListOutlined />}>
        Chọn nhiều tin nhắn
      </Menu.Item>
      <Menu.Item key="viewDetails" icon={<InfoCircleOutlined />}>
        Xem chi tiết
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item 
        key="recall" 
        icon={<UndoOutlined />}
        onClick={() => handleRecallMessage(message.id)}
        disabled={!!message.isRecall || messageActionLoading === message.id}
        className="text-red-500 hover:text-red-700"
        style={{ display: isOwnMessage(message.sender.id) ? 'flex' : 'none' }}
      >
        Thu hồi
      </Menu.Item>
      <Menu.Item 
        key="delete" 
        icon={<DeleteOutlined />}
        onClick={() => handleDeleteMessage(message.id)}
        disabled={messageActionLoading === message.id}
        className="text-red-500 hover:text-red-700"
      >
        Xóa chỉ ở phía tôi
      </Menu.Item>
    </Menu>
  );

  // Render recalled message
  const renderRecalledMessage = (isOwn: boolean) => (
    <div className={`text-xs italic ${isOwn ? 'text-blue-200' : 'text-gray-500'}`}>
      Tin nhắn đã bị thu hồi
    </div>
  );

  // Add a click event handler to the document to close active menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeMessageMenu && !e.defaultPrevented) {
        const target = e.target as Element;
        if (!target.closest('.message-hover-controls') && !target.closest('.ant-dropdown')) {
          setActiveMessageMenu(null);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeMessageMenu]);

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
              
              // Determine if this is the last message from the current user in the conversation
              const isLastMessageFromUser = isOwn && 
                messages.findIndex((msg, i) => i > index && msg.sender.id === currentUserId) === -1;

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
                      className="flex flex-col relative group"
                      style={{ maxWidth: "min(80%)" }}
                    >
                    {/* Hover message controls */}
                    <div 
                      className={`absolute right-0 top-0 -mt-8 ${activeMessageMenu === message.id ? 'flex' : 'hidden group-hover:flex'} items-center space-x-1 bg-white rounded-lg shadow-md px-1 py-0.5 z-10 message-hover-controls ${activeMessageMenu === message.id ? 'active' : ''}`}
                    >
                      <Tooltip title="Trả lời">
                        <Button 
                          type="text" 
                          size="small" 
                          icon={<CommentOutlined />} 
                          className="text-gray-500 hover:text-blue-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setActiveMessageMenu(message.id);
                            // Functionality will be implemented later
                          }}
                        />
                      </Tooltip>
                      <Tooltip title="Chia sẻ">
                        <Button 
                          type="text" 
                          size="small" 
                          icon={<ShareAltOutlined />} 
                          className="text-gray-500 hover:text-blue-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setActiveMessageMenu(message.id);
                            // Functionality will be implemented later
                          }}
                        />
                      </Tooltip>
                      <Tooltip title="Tùy chọn khác">
                        <Dropdown 
                          overlay={getMessageMenu(message)} 
                          trigger={['click']} 
                          placement="bottomRight"
                          overlayClassName="message-dropdown-overlay"
                          visible={dropdownVisible[message.id] || false}
                          onVisibleChange={(visible) => {
                            setDropdownVisible(prev => ({
                              ...prev,
                              [message.id]: visible
                            }));
                            
                            if (visible) {
                              setActiveMessageMenu(message.id);
                            } else {
                              // Don't clear activeMessageMenu immediately to allow 
                              // for smooth transitions between options
                              setTimeout(() => {
                                if (activeMessageMenu === message.id) {
                                  setActiveMessageMenu(null);
                                }
                              }, 200);
                            }
                          }}
                        >
                          <Button 
                            type="text" 
                            size="small" 
                            icon={<MoreOutlined />} 
                            className="text-gray-500 hover:text-blue-500"
                            loading={messageActionLoading === message.id}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          />
                        </Dropdown>
                      </Tooltip>
                    </div>
                    
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
                        onClick={() => setActiveMessageMenu(message.id)}
                    >
                      {/* Hiển thị nội dung tin nhắn */}
                      {message.isRecall ? (
                        // Nội dung tin nhắn đã thu hồi
                        <div className={`text-xs italic ${isOwn ? 'text-blue-200' : 'text-gray-500'}`}>
                          Tin nhắn đã bị thu hồi
                        </div>
                      ) : message.type === "image" ? (
                        // Tin nhắn hình ảnh
                        <div className="relative">
                          <img
                            src={message.fileUrl || message.content}
                            alt="Hình ảnh"
                            className="max-w-full max-h-60 rounded-lg cursor-pointer"
                            onClick={() => handleImagePreview(message.fileUrl || message.content)}
                            onError={(e) => {
                              e.currentTarget.onerror = null; 
                              e.currentTarget.src = '/images/image-placeholder.png';
                            }}
                          />
                          <div className="text-right mt-1">
                            <Button 
                              type="primary" 
                              size="small" 
                              icon={<DownloadOutlined />}
                              onClick={() => handleDownloadFile(message.fileUrl || message.content, "image")}
                              className="inline-flex items-center text-xs shadow-sm"
                            >
                              Tải xuống
                            </Button>
                          </div>
                        </div>
                      ) : message.type === "text-with-image" ? (
                        // Rest of the message type conditions remain unchanged
                        // ...
                        <div className="flex flex-col">
                          <p className="text-sm whitespace-pre-wrap break-words mb-2">
                            {message.content}
                          </p>
                          <div className="relative">
                            <img
                              src={message.fileUrl || 
                                (message.attachments && message.attachments.length > 0 
                                  ? message.attachments[0].url 
                                  : message.attachment?.url || undefined)}
                              alt="Hình ảnh đính kèm"
                              className="max-w-full max-h-60 rounded-lg cursor-pointer"
                              onClick={() => handleImagePreview(message.fileUrl || 
                                (message.attachments && message.attachments.length > 0 
                                  ? message.attachments[0].url 
                                  : message.attachment?.url || ''))}
                              onError={(e) => {
                                e.currentTarget.onerror = null; 
                                e.currentTarget.src = '/images/image-placeholder.png';
                              }}
                            />
                            <div className="text-right mt-1">
                              <Button 
                                type="primary" 
                                size="small" 
                                icon={<DownloadOutlined />}
                                onClick={() => handleDownloadFile(
                                  message.fileUrl || 
                                  (message.attachments && message.attachments.length > 0 
                                    ? message.attachments[0].downloadUrl || message.attachments[0].url
                                    : message.attachment?.downloadUrl || message.attachment?.url),
                                  message.fileName || message.attachment?.name || "image"
                                )}
                                className="inline-flex items-center text-xs shadow-sm"
                              >
                                Tải xuống
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : message.type === "file" ? (
                        // File message
                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                          <div className="text-xl mr-2">
                            {message.attachment?.type?.startsWith('image/') ? (
                              <FileImageOutlined className="text-blue-500" />
                            ) : message.attachment?.type?.startsWith('audio/') ? (
                              <AudioOutlined className="text-green-500" />
                            ) : message.attachment?.type?.startsWith('video/') ? (
                              <VideoCameraOutlined className="text-purple-500" />
                            ) : (
                              <FileOutlined className="text-gray-500" />
                            )}
                          </div>
                          <div className="flex-grow">
                            <div className="text-sm font-medium truncate">
                              {message.fileName || message.attachment?.name || message.content}
                            </div>
                            <div className="text-xs text-gray-500">
                              {message.fileSize ? 
                                `${Math.round(message.fileSize / 1024)} KB` : 
                                message.attachment?.size ? 
                                `${Math.round(message.attachment.size / 1024)} KB` : ""}
                            </div>
                          </div>
                          <Button 
                            type="primary"
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={() => handleDownloadFile(
                              message.fileUrl || message.attachment?.downloadUrl || message.attachment?.url, 
                              message.fileName || message.attachment?.name || "file"
                            )}
                            className="inline-flex items-center text-xs shadow-sm ml-2"
                          >
                            Tải xuống
                          </Button>
                        </div>
                      ) : message.type === "video" ? (
                        // Video message
                        <div className="relative">
                          <div className="video-player-container rounded-lg overflow-hidden" style={{ maxWidth: '300px' }}>
                            <ReactPlayer
                              url={message.fileUrl || (message.attachment && message.attachment.url) || ''}
                              width="100%"
                              height="auto"
                              controls={true}
                              light={message.attachment && message.attachment.thumbnail ? message.attachment.thumbnail : true}
                              pip={false}
                              playing={false}
                              className="video-player"
                              config={{
                                file: {
                                  attributes: {
                                    controlsList: 'nodownload',
                                    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
                                  },
                                },
                              }}
                            />
                          </div>
                          <div className="text-right mt-1">
                            <Button 
                              type="primary" 
                              size="small" 
                              icon={<DownloadOutlined />}
                              onClick={() => handleDownloadFile(
                                message.fileUrl || message.attachment?.downloadUrl || message.attachment?.url, 
                                message.fileName || message.attachment?.name || "video"
                              )}
                              className="inline-flex items-center text-xs shadow-sm"
                            >
                              Tải xuống
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Text message (default)
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
                          className={`flex text-xs text-gray-500 mt-1 ${isOwn ? "justify-end items-center" : "justify-start"}`}
                        >
                      <span>{formatMessageTime(message.timestamp)}</span>
                      {/* Show status indicator for all message types except recalled */}
                      {isOwn && !message.isRecall && (
                        <span className="ml-2">
                          {message.sendStatus === "read" ? 
                            (isLastMessageFromUser ? renderMessageStatus(message, isOwn) : 
                             <span className="text-blue-400 text-xs flex items-center">
                               <CheckOutlined className="mr-1" style={{ fontSize: '10px' }} />
                             </span>) : 
                            renderMessageStatus(message, isOwn)
                          }
                        </span>
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

            {renderInputArea()}
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

        .chat-input-container {
          background-color: white;
          border-top: 1px solid #eee;
          padding: 8px;
        }

        .emoji-picker-container {
          position: relative;
        }

        .emoji-picker-container .emoji-picker {
          position: absolute;
          bottom: 40px;
          left: 0;
          z-index: 100;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          border-radius: 8px;
          overflow: hidden;
        }
        
        /* Message hover controls styles */
        .group:hover .hidden.group-hover\\:flex {
          display: flex !important;
        }
        
        .message-options-menu .ant-dropdown-menu-item.text-red-500 {
          color: #ef4444;
        }
        
        .message-options-menu .ant-dropdown-menu-item.text-red-500:hover {
          color: #b91c1c;
          background-color: rgba(239, 68, 68, 0.1);
        }
        
        .message-options-menu .ant-dropdown-menu-item {
          padding: 8px 12px;
        }
        
        /* Message dropdown overlay styles */
        .message-dropdown-overlay .ant-dropdown-menu {
          padding: 4px 0;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        
        .message-dropdown-overlay .ant-dropdown-menu-item {
          min-width: 180px;
        }
        
        .message-dropdown-overlay .ant-dropdown-menu-item .anticon {
          margin-right: 10px;
        }
        
        .ant-dropdown-menu-item-divider {
          margin: 4px 0;
        }

        /* Improve hover control persistence */
        .message-hover-controls {
          opacity: 0;
          transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
          transform: translateY(2px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        
        .group:hover .message-hover-controls {
          opacity: 1;
          transform: translateY(0);
        }
        
        .message-hover-controls:hover,
        .message-hover-controls.active {
          opacity: 1;
          transform: translateY(0);
          box-shadow: 0 4px 8px -2px rgba(0, 0, 0, 0.1), 0 2px 6px -2px rgba(0, 0, 0, 0.1);
        }

        /* Add hover effect to the buttons */
        .message-hover-controls .ant-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          padding: 0;
          border-radius: 50%;
          transition: background-color 0.2s ease-in-out;
        }

        .message-hover-controls .ant-btn:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
        
        /* Make buttons in hover controls stay visible when clicked */
        .message-hover-controls .ant-btn:active,
        .message-hover-controls .ant-btn:focus {
          background-color: rgba(0, 0, 0, 0.1);
        }
        `}
      </style>
      
      {/* Image preview modal */}
      <Modal
        open={isImageModalOpen}
        footer={null}
        onCancel={closeImageModal}
        centered
        className="image-viewer-modal"
        width="auto"
        bodyStyle={{ padding: 0, maxHeight: '90vh', overflow: 'hidden' }}
        style={{ maxWidth: '90vw' }}
        maskStyle={{ background: 'rgba(0, 0, 0, 0.85)' }}
      >
        {selectedImage && (
          <div className="relative">
            <img 
              src={selectedImage} 
              alt="Enlarged view" 
              className="max-h-[90vh] max-w-[90vw] object-contain"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/images/image-placeholder.png';
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
