import { Button, Modal, message } from "antd";
import { useEffect, useState } from "react";
import { getBlockedUsers, unblockUser } from "../../../api/API"; // Import unblockUser
import { Avatar } from "../../common/Avatar"; // Import the Avatar component

// Update the BlockedUser interface to match the API response
interface BlockedUser {
  userId: string; // Matches "userId" from the API response
  fullname: string; // Matches "fullname" from the API response
  urlavatar?: string; // Matches "urlavatar" from the API response
}

interface TranslationType {
  block_messages: string;
  block_messages_desc: string;
  loading?: string;
  unblock?: string;
  no_blocked_users?: string;
}

interface BlockModalProps {
  visible: boolean;
  onClose: () => void;
  t: TranslationType;
}

const BlockModal: React.FC<BlockModalProps> = ({ visible, onClose, t }) => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBlockedUsers = async () => {
    setLoading(true);
    try {
      const users = await getBlockedUsers();
      console.log("Fetched blocked users:", users); // Debug log to verify the response
      setBlockedUsers(users);
    } catch (error: unknown) {
      if (error instanceof Error) {
        message.error(error.message);
      } else {
        message.error("An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId: string, fullname: string) => {
    try {
      await unblockUser(userId); // Call the unblockUser API
      message.success(`Đã bỏ chặn ${fullname}`);
      await fetchBlockedUsers(); // Refresh the blocked users list
    } catch (error: unknown) {
      if (error instanceof Error) {
        message.error(error.message);
      } else {
        message.error("An unknown error occurred");
      }
    }
  };

  useEffect(() => {
    if (visible) {
      fetchBlockedUsers();
    }
  }, [visible]);

  return (
    <Modal
      title={t.block_messages}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={400}
      zIndex={1050} // Đặt z-index cao hơn SettingsModal
    >
      <div className="p-4">
        <p className="text-sm text-gray-500 mb-4">{t.block_messages_desc}</p>
        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-gray-500">
              {t.loading || "Đang tải..."}
            </p>
          ) : blockedUsers.length > 0 ? (
            blockedUsers.map((user) => (
              <div
                key={user.userId} // Use userId as the key
                className="flex items-center justify-between">
                <div className="flex items-center">
                  <Avatar
                    name={user.fullname} // Pass fullname as the name prop
                    avatarUrl={user.urlavatar} // Pass urlavatar as the avatarUrl prop
                    size={32} // Match the w-8 h-8 (8 * 4px = 32px)
                    className="mr-3" // Match the margin-right spacing
                  />
                  <span className="text-sm">{user.fullname}</span>{" "}
                  {/* Use fullname */}
                </div>
                <Button
                  type="default"
                  size="small"
                  onClick={() => handleUnblock(user.userId, user.fullname)} // Call handleUnblock
                >
                  {t.unblock || "Bỏ chặn"}
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">
              {t.no_blocked_users || "Không có người dùng nào bị chặn"}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default BlockModal;
