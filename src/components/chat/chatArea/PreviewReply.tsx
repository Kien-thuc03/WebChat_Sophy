import {
  FileImageOutlined,
  FileOutlined,
  AudioOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { User } from "../../../features/auth/types/authTypes";

export const ReplyPreview: React.FC<{
  replyData: any;
  isOwnMessage: boolean;
  messageReplyId?: string | null;
  onReplyClick?: (messageId: string) => void;
  userCache?: Record<string, User>;
}> = ({ replyData, isOwnMessage, messageReplyId, onReplyClick, userCache = {} }) => {
  // Default content if replyData is missing
  if (!replyData) {
    return null;
  }

  let replyContent = "";
  let replySender = "Người dùng";
  let replyType = "text";
  let senderId = "";
  let attachment = null;
  // Parse replyData if it's a string
  if (typeof replyData === "string") {
    try {
      const parsedData = JSON.parse(replyData);
      replyContent = parsedData.content || "";
      replySender = parsedData.senderName || "Người dùng";
      senderId = parsedData.senderId || "";
      replyType = parsedData.type || "text";
      attachment = parsedData.attachment || null;

    } catch (error) {
      // If parsing fails, use the string directly
      replyContent = replyData;
      console.error("Error parsing replyData string:", error, replyData);
    }
  } else if (typeof replyData === "object") {
    // If replyData is already an object (format from backend)
    replyContent = replyData.content || "";
    replySender = replyData.senderName || "Người dùng";
    senderId = replyData.senderId || "";
    replyType = replyData.type || "text";
    attachment = replyData.attachment || null;
  }

  // If we have a senderId but no sender name, try to get it from userCache props first
  if (senderId && (replySender === "Người dùng" || !replySender)) {
    if (userCache && userCache[senderId]) {
      replySender = userCache[senderId].fullname || "Người dùng";
    } else {
      // Fallback to localStorage only if not found in props
      try {
        const localUserCache = JSON.parse(localStorage.getItem("userCache") || "{}");
        if (localUserCache[senderId]) {
          replySender = localUserCache[senderId].fullname || "Người dùng";
        }
      } catch (error) {
        console.error("Error parsing userCache:", error);
      }
    }
  }

  const handleClick = () => {
    if (messageReplyId && onReplyClick) {
      onReplyClick(messageReplyId);
    }
  };

  // Render content based on message type (similar to mobile app's renderReplyContent)
  const renderReplyTypeContent = () => {
    switch (replyType) {
      case "text":
        return replyContent;
      case "image":
        return (
          <div className="flex items-center">
            {attachment && attachment.url ? (
              <div className="flex items-center">
                <img
                  src={attachment.url}
                  alt="Preview"
                  className="w-8 h-8 object-cover rounded mr-1"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/images/image-placeholder.png";
                  }}
                />
                <span className="text-gray-500">Hình ảnh</span>
              </div>
            ) : (
              <>
                <FileImageOutlined className="mr-1" />
                <span className="text-gray-500">Hình ảnh</span>
              </>
            )}
          </div>
        );
      case "file":
        return (
          <div className="flex items-center">
            <FileOutlined className="mr-1" />
            <span className="text-gray-500">{attachment?.name || "Tệp tin"}</span>
          </div>
        );
      case "audio":
        return (
          <div className="flex items-center">
            <AudioOutlined className="mr-1" />
            <span className="text-gray-500">Tin nhắn thoại</span>
          </div>
        );
      case "video":
        return (
          <div className="flex items-center">
            <VideoCameraOutlined className="mr-1" />
            <span className="text-gray-500">Video</span>
          </div>
        );
      default:
        return replyContent;
    }
  };

  return (
    <div
      className={`flex items-start pl-2 cursor-pointer ${isOwnMessage ? "text-white/80" : "text-gray-700"}`}
      onClick={handleClick}
    >
      <div
        className={`w-1 self-stretch mr-2 ${isOwnMessage ? "bg-blue-300" : "bg-blue-500"}`}
      ></div>
      <div className="reply-preview-content flex-1 text-xs py-1">
        <div className="reply-sender font-medium text-gray-700">{replySender}</div>
        <div className="reply-content truncate">{renderReplyTypeContent()}</div>
      </div>
    </div>
  );
};
