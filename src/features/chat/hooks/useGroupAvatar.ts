import { useMemo } from 'react';
import {GroupAvatarProps} from '../types/groupTypes';


/**
 * Hook quản lý hiển thị avatar cho nhóm chat
 * @param {Object} props - Props cho hook
 * @param {string[]} props.members - Mảng ID của các thành viên trong nhóm
 * @param {Record<string, string>} props.userAvatars - Object chứa URL avatar của từng thành viên
 * @param {number} [props.size=40] - Kích thước của khung chứa avatar (px)
 * @param {string} [props.groupAvatarUrl] - URL của avatar nhóm (nếu có)
 * @returns {Object} Các giá trị và hàm cần thiết để hiển thị avatar nhóm
 */
export const useGroupAvatar = ({
  members,
  userAvatars,
  size = 40,
  groupAvatarUrl,
}: GroupAvatarProps) => {
  /**
   * Tính toán số lượng avatar tối đa có thể hiển thị
   * - Nếu nhóm có hơn 4 thành viên: hiển thị 3 avatar + số còn lại
   * - Nếu nhóm có 4 thành viên trở xuống: hiển thị tất cả
   */
  const maxVisibleAvatars = useMemo(() => members.length > 4 ? 3 : 4, [members.length]);
  /**
   * Lấy danh sách ID của các thành viên sẽ hiển thị avatar
   */
  const visibleMembers = useMemo(() => members.slice(0, maxVisibleAvatars), [members, maxVisibleAvatars]);
  /**
   * Tính số lượng thành viên còn lại không hiển thị avatar
   */
  const remainingCount = useMemo(
    () => members.length > maxVisibleAvatars ? members.length - maxVisibleAvatars : 0,
    [members.length, maxVisibleAvatars]
  );

  /**
   * Tạo style cho container chứa các avatar
   */
  const containerStyle = useMemo(
    () => ({
      width: `${size}px`,
      height: `${size}px`,
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '1px',
      padding: '1px',
      aspectRatio: '1',
      backgroundColor: '#fff',
    }),
    [size]
  );

  /**
   * Trả về các class CSS cho từng avatar
   */
  const getAvatarClasses = () => {
    return 'w-full h-full border border-white rounded-full overflow-hidden aspect-square';
  };

  return {
    maxVisibleAvatars,
    visibleMembers,
    remainingCount,
    containerStyle,
    getAvatarClasses,
  };
};