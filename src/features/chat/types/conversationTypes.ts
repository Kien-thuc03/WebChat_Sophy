export interface Participant {
    user_id: string;
    name: string;
    avatar: string;
    role: string;
    joined_at: string;
  }
  
  export interface Reaction {
    user_id: string;
    type: string;
  }
  
  export interface SeenBy {
    user_id: string;
    seen_time: string;
  }
  
  export interface ReplyFor {
    message_id: string;
    type: string;
    content: string;
  }
  
  export interface LatestMessage {
    _id: string;
    sender_id: string;
    type: string;
    content: string;
    hidden_with: string[];
    reply_for?: ReplyFor;
    reactions: Reaction[];
    seen_by: SeenBy[];
    is_recalled: boolean;
  }
  
  export interface Message {
    _id: string;
    conversationId: string;
    senderId: string;
    content: string;
    type: string;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface Conversation {
    _id: string;
    type: 'private' | 'group';
    creatorId: string;
    receiverId?: string;
    groupName?: string;
    groupMembers?: string[];
    lastMessage?: Message;
    lastChange: string;
    createdAt: string;
    updatedAt: string;
  }
  