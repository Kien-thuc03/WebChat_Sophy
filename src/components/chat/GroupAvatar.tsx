import React from "react";
import { GroupAvatarProps } from "../../features/chat/types/groupTypes";
import { useGroupAvatar } from "../../features/chat/hooks/useGroupAvatar";
import { useAvatarPlaceholder } from "../../features/auth/hooks/useAvatarPlaceholder";

const GroupAvatar: React.FC<GroupAvatarProps> = ({
  members,
  userAvatars,
  size = 40,
  className = "",
  groupAvatarUrl,
}) => {
  const { visibleMembers, remainingCount, containerStyle, getAvatarClasses } = useGroupAvatar({
    members,
    userAvatars,
    size,
    groupAvatarUrl,
  });

  // Nếu có groupAvatarUrl, hiển thị ảnh nhóm từ URL đó
  if (groupAvatarUrl) {
    return (
      <div 
        className={`rounded-lg overflow-hidden ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <img
          src={groupAvatarUrl}
          alt="Group Avatar"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Nếu không có groupAvatarUrl, sử dụng phần gộp ảnh hiện tại
  return (
    <div
      className={`rounded-lg overflow-hidden ${className}`}
      style={containerStyle}
    >
      {visibleMembers.map((memberId, index) => {
        const { content, style } = useAvatarPlaceholder(
          memberId,
          userAvatars[memberId]
        );
        return (
          <div
            key={index}
            className={getAvatarClasses()}
            style={{
              ...style,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: `${Math.floor(size * 0.4)}px`,
              fontWeight: 'bold'
            }}
          >
            {content}
          </div>
        );
      })}
      {remainingCount > 0 && (
        <div className="bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-medium border border-white rounded-full">
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

export default GroupAvatar;
