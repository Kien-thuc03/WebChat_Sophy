export interface GroupAvatarProps {
  members: string[];
  userAvatars: Record<string, string>;
  size?: number;
  className?: string;
  groupAvatarUrl?: string;
}
