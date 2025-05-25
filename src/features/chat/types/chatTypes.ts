export interface ChatHeaderProps {
  isGroup?: boolean;
  groupName?: string;
  groupAvatarUrl?: string | null;
  groupMembers?: string[];
  onInfoClick?: () => void;
  showInfo?: boolean;
}

//các item phân loại trong chat
export interface Label {
  id: string;
  name: string;
  color: string;
  selected: boolean;
}

export interface DisplayMessage {
  id: string;
  content: string;
  timestamp: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  type: "text" | "image" | "file" | "audio" | "video" | "text-with-image" | "notification";
  isRead?: boolean;
  isError?: boolean;
  sendStatus?: string;
  readBy?: string[];
  deliveredTo?: string[];
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  thumbnail?: string;
  tempId?: string;
  attachment?: AttachmentInfo;
  attachments?: AttachmentInfo[];
  isRecall?: boolean;
  hiddenFrom?: string[];
  isPinned?: boolean;
  pinnedAt?: string;
  isReply?: boolean;
  messageReplyId?: string | null;
  replyData?: any;
  audioDuration?: number;
}

export interface AttachmentInfo {
  url: string;
  downloadUrl?: string;
  name?: string;
  size?: number;
  type?: string;
  format?: string;
  thumbnail?: string;
}