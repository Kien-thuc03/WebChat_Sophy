import React from "react";

interface GroupAvatarProps {
  members: string[];
  userAvatars: Record<string, string>;
  size?: number;
  className?: string;
  groupAvatarUrl?: string;
}

const GroupAvatar: React.FC<GroupAvatarProps> = ({
  members,
  userAvatars,
  size = 40,
  className = "",
  groupAvatarUrl,
}) => {
  // Giới hạn số lượng avatar hiển thị
  const maxVisibleAvatars = members.length > 4 ? 3 : 4;
  const visibleMembers = members.slice(0, maxVisibleAvatars);
  const remainingCount =
    members.length > maxVisibleAvatars ? members.length - maxVisibleAvatars : 0;
  const AVT_DEFAULT = "/images/default-avatar.png";
  const containerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "1px",
    padding: "1px",
    aspectRatio: "1",
    backgroundColor: "#fff",
  };

  const getAvatarClasses = () => {
    return "w-full h-full border border-white rounded-full overflow-hidden aspect-square";
  };

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
      {visibleMembers.map((memberId, index) => (
        <div key={index} className={getAvatarClasses()}>
          <img
            src={userAvatars[memberId] || AVT_DEFAULT}
            alt={`Member ${index + 1}`}
            className="w-full h-full object-cover aspect-square"
          />
        </div>
      ))}
      {remainingCount > 0 && (
        <div className="bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-medium border border-white rounded-full">
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

export default GroupAvatar;
