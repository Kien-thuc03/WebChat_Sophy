export interface Attachment {
  url: string;
  type: string;
  name?: string;
  size?: number;
}

export interface Message {
  messageDetailId: string;
  senderId: string;
  conversationId: string;
  type: string;
  content: string;
  createdAt: string;
  sendStatus: string;
  hiddenFrom: string[];
  isRecall: boolean;
  isReply: boolean;
  messageReplyId: string | null;
  replyData: string | null;
  isPinned: boolean;
  pinnedAt: string | null;
  reactions: string[];
  attachments: Attachment[] | string | null;
  attachment?: Attachment;
  poll: string | null;
  linkPreview: string | null;
  deliveredTo: string[];
  readBy: string[];
  deletedFor: string[];
}

export interface UnreadCount {
  userId: string;
  count: number;
  lastReadMessageId: string;
}

export interface Conversation {
  conversationId: string;
  creatorId: string;
  receiverId?: string;
  isGroup: boolean;
  groupName?: string;
  groupMembers: string[];
  groupAvatarUrl?: string | null;
  background?: string | null;
  rules?: {
    ownerId: string;
    coOwnerIds: string[];
  };
  lastMessage?: Message | null;
  newestMessageId?: string;
  blockedBy: string[];
  isDeleted: boolean;
  deletedAt: string | null;
  formerMembers: string[];
  listImage: string[];
  listFile: string[];
  pinnedMessages: string[];
  muteNotifications: string[];
  unreadCount: UnreadCount[];
  hasUnread?: boolean;
  lastChange: string;
  createdAt: string;
}
  