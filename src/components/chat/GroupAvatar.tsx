import React, { useMemo } from "react";
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

  // Gọi hook ở top-level cho 4 placeholder cố định
  // Điều này đảm bảo số lượng hook luôn cố định
  const placeholder1 = useAvatarPlaceholder(visibleMembers[0] || 'placeholder1', userAvatars[visibleMembers[0]]);
  const placeholder2 = useAvatarPlaceholder(visibleMembers[1] || 'placeholder2', userAvatars[visibleMembers[1]]);
  const placeholder3 = useAvatarPlaceholder(visibleMembers[2] || 'placeholder3', userAvatars[visibleMembers[2]]);
  const placeholder4 = useAvatarPlaceholder(visibleMembers[3] || 'placeholder4', userAvatars[visibleMembers[3]]);

  // Tạo mảng placeholders từ 4 placeholder riêng lẻ đã tính toán ở trên
  const placeholders = useMemo(() => {
    return [placeholder1, placeholder2, placeholder3, placeholder4];
  }, [placeholder1, placeholder2, placeholder3, placeholder4]);

  if (groupAvatarUrl) {
    return (
      <div 
        className={`rounded-full overflow-hidden ${className}`}
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

  return (
    <div
      className={`rounded-lg overflow-hidden ${className}`}
      style={containerStyle}
    >
      {visibleMembers.map((memberId, index) => {
        // Sử dụng placeholder từ mảng đã tính toán
        if (index >= 4) return null; // Chỉ hiển thị tối đa 4 avatar
        
        const placeholder = placeholders[index];
        
        // Chỉ hiển thị nếu có memberId thực sự
        if (!memberId) return null;
        
        return (
          <div
            key={index}
            className={getAvatarClasses()}
            style={{
              ...placeholder.style,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: `${Math.floor(size * 0.4)}px`,
              fontWeight: 'bold'
            }}
          >
            {placeholder.content}
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