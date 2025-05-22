// useGroupAvatar.ts
import { useMemo } from "react";
import { GroupAvatarProps } from "../types/groupTypes";

export const useGroupAvatar = ({
  members,
  userAvatars,
  size = 40,
  groupAvatarUrl,
}: GroupAvatarProps) => {
  const maxVisibleAvatars = useMemo(
    () => (members.length > 4 ? 3 : 4),
    [members.length]
  );
  const visibleMembers = useMemo(
    () => members.slice(0, maxVisibleAvatars),
    [members, maxVisibleAvatars]
  );
  const remainingCount = useMemo(
    () => (members.length > maxVisibleAvatars ? members.length - maxVisibleAvatars : 0),
    [members.length, maxVisibleAvatars]
  );

  const containerStyle = useMemo(
    () => ({
      width: `${size}px`,
      height: `${size}px`,
      display: groupAvatarUrl ? "block" : "grid",
      gridTemplateColumns: groupAvatarUrl ? undefined : "repeat(2, 1fr)",
      gap: groupAvatarUrl ? undefined : "1px",
      padding: groupAvatarUrl ? undefined : "1px",
      aspectRatio: "1",
      backgroundColor: groupAvatarUrl ? undefined : "#fff",
    }),
    [size, groupAvatarUrl]
  );

  const getAvatarClasses = () => {
    return groupAvatarUrl
      ? "w-full h-full rounded-full overflow-hidden aspect-square"
      : "w-full h-full border border-white rounded-full overflow-hidden aspect-square";
  };

  return {
    maxVisibleAvatars,
    visibleMembers,
    remainingCount,
    containerStyle,
    getAvatarClasses,
  };
};