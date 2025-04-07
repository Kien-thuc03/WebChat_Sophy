export interface ChatHeaderProps {
  isGroup?: boolean;
  groupName?: string;
  groupAvatarUrl?: string | null;
  groupMembers?: string[];
}

//các item phân loại trong chat
export interface Label {
  id: string;
  name: string;
  color: string;
  selected: boolean;
}