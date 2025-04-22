import {
  FileImageOutlined,
  FileOutlined,
  AudioOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";

export const ReplyPreview: React.FC<{
  replyData: any;
  isOwnMessage: boolean;
  messageReplyId?: string | null;
  onReplyClick?: (messageId: string) => void;
}> = ({ replyData, isOwnMessage, messageReplyId, onReplyClick }) => {
  // Default content if replyData is missing
  if (!replyData) {
    console.log("ReplyPreview: No reply data provided");
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

      // Debug log
      console.log("ReplyPreview parsed data:", parsedData);
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

    // Debug log
    console.log("ReplyPreview received object replyData:", replyData);
  }

  // If we have a senderId but no sender name, try to look up the user name
  // from localStorage or elsewhere if possible
  if (senderId && (replySender === "Người dùng" || !replySender)) {
    try {
      // Try to get user info from localStorage or app state if available
      const userCache = JSON.parse(localStorage.getItem("userCache") || "{}");
      if (userCache[senderId]) {
        replySender = userCache[senderId].fullname || "Người dùng";
      }
    } catch (error) {
      console.error("Error parsing userCache:", error);
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
                <span>Hình ảnh</span>
              </div>
            ) : (
              <>
                <FileImageOutlined className="mr-1" />
                <span>Hình ảnh</span>
              </>
            )}
          </div>
        );
      case "file":
        return (
          <div className="flex items-center">
            <FileOutlined className="mr-1" />
            <span>{attachment?.name || "Tệp tin"}</span>
          </div>
        );
      case "audio":
        return (
          <div className="flex items-center">
            <AudioOutlined className="mr-1" />
            <span>Tin nhắn thoại</span>
          </div>
        );
      case "video":
        return (
          <div className="flex items-center">
            <VideoCameraOutlined className="mr-1" />
            <span>Video</span>
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
        <div className="reply-sender font-medium">{replySender}</div>
        <div className="reply-content truncate">{renderReplyTypeContent()}</div>
      </div>
    </div>
  );
};
