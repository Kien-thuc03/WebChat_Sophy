export interface Message {
  messageId: string;
  senderId: string;
  content: string;
  type: string;
  createdAt: string;
}

interface UnreadCount {
  userId: string;
  count: number;
  lastRead?: string;
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
  lastChange: string;
  createdAt: string;
}
  