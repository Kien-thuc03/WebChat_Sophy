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
  type: "text" | "image" | "file";
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  isRead?: boolean;
  isError?: boolean;
  sendStatus?: string;
  readBy?: string[];
  deliveredTo?: string[];
  attachments?: Array<{
    url: string;
    type: string;
    name?: string;
    size?: number;
  }>;
  attachment?: {
    url: string;
    type: string;
    name?: string;
    size?: number;
  };
}