import React, { useMemo } from 'react';

// Định nghĩa các màu nền cho avatar mặc định
const AVATAR_COLORS = [
  '#4A90E2', // Xanh biển
  '#6C5DD3', // Tím
  '#FF9500', // Cam
  '#FF2D55', // Hồng
  '#8E8E93', // Xám
];

// Định nghĩa kiểu dữ liệu cho kết quả trả về của hook
interface AvatarPlaceholderResult {
  content: string | JSX.Element;
  style: {
    backgroundColor?: string;
  };
}

/**
 * Hook xử lý hiển thị avatar mặc định
 * @param name Tên người dùng
 * @param avatarUrl URL ảnh đại diện (nếu có)
 * @returns Đối tượng chứa nội dung và style cho avatar
 */
export const useAvatarPlaceholder = (name: string, avatarUrl?: string): AvatarPlaceholderResult => {
  return useMemo(() => {
    // Nếu có URL avatar, trả về thẻ img
    if (avatarUrl) {
      return {
        content: React.createElement('img', {
          src: avatarUrl,
          alt: name,
          style: { width: '100%', height: '100%', objectFit: 'cover' }
        }),
        style: {}
      };
    }

    // Nếu không có URL avatar, tạo placeholder
    const initials = getInitials(name);
    const backgroundColor = getRandomColor(name);

    return {
      content: initials,
      style: {
        backgroundColor,
      },
    };
  }, [name, avatarUrl]);
};

/**
 * Lấy chữ cái đầu của họ và tên
 * @param name Tên đầy đủ
 * @returns Chữ cái đầu viết hoa
 */
const getInitials = (name: string): string => {
  const words = name.trim().split(' ');
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

/**
 * Lấy màu ngẫu nhiên cho avatar dựa trên tên
 * @param name Tên người dùng
 * @returns Mã màu
 */
const getRandomColor = (name: string): string => {
  // Sử dụng tên làm seed để đảm bảo cùng một người luôn nhận được cùng một màu
  const index = Math.abs(name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};