import React, { useMemo } from 'react';
import { Button, Spin, Dropdown, Menu } from 'antd';
import { PushpinOutlined, MoreOutlined, FileImageOutlined, FileOutlined } from '@ant-design/icons';
import { DisplayMessage } from '../../../features/chat/types/chatTypes';
import { formatMessageTime } from '../../../utils/dateUtils';
import { Avatar } from '../../common/Avatar';

interface PinnedMessagesProps {
  pinnedMessages: DisplayMessage[];
  onViewMessage: (messageId: string) => void;
  onUnpinMessage?: (messageId: string) => void;
  onClose?: () => void;
  isLoading?: boolean;
}

const PinnedMessages: React.FC<PinnedMessagesProps> = ({ 
  pinnedMessages, 
  onViewMessage,
  onUnpinMessage,
  onClose,
  isLoading = false 
}) => {
  // Deduplicate messages based on ID
  const uniquePinnedMessages = useMemo(() => {
    const uniqueIds = new Set();
    return pinnedMessages.filter(message => {
      if (uniqueIds.has(message.id)) {
        return false;
      }
      uniqueIds.add(message.id);
      return true;
    });
  }, [pinnedMessages]);

  if (!uniquePinnedMessages || uniquePinnedMessages.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="bg-white border-b border-gray-200 animate-slideIn transition-all duration-300">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center font-medium">
          <PushpinOutlined className="text-yellow-600 mr-2" />
          <span>Danh sách ghim ({uniquePinnedMessages.length})</span>
        </div>
        <Button 
          type="text" 
          size="small"
          className="text-gray-500"
          onClick={() => onClose && onClose()}
        >
          Thu gọn
        </Button>
      </div>
      
      <div className="max-h-80 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spin size="small" />
          </div>
        ) : uniquePinnedMessages.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            Không có tin nhắn nào được ghim
          </div>
        ) : (
          <div className="space-y-2">
            {uniquePinnedMessages.map(pinnedMsg => {
              return (
                <div key={pinnedMsg.id} className="flex items-start p-2 hover:bg-gray-50 rounded-lg group">
                  <Avatar 
                    name={pinnedMsg.sender.name}
                    avatarUrl={pinnedMsg.sender.avatar}
                    size={36}
                    className="mr-2 flex-shrink-0"
                  />
                  
                  <div className="flex-grow overflow-hidden">
                    <div className="flex justify-between">
                      <div className="font-medium text-sm mb-1">{pinnedMsg.sender.name}</div>
                      <div className="text-xs text-gray-500">{formatMessageTime(pinnedMsg.timestamp)}</div>
                    </div>
                    
                    <div className="text-sm text-gray-800 truncate">
                      {pinnedMsg.type === 'image' ? (
                        <div className="flex items-center">
                          <FileImageOutlined className="mr-1" />
                          <span>Hình ảnh</span>
                        </div>
                      ) : pinnedMsg.type === 'file' ? (
                        <div className="flex items-center">
                          <FileOutlined className="mr-1" />
                          <span>{pinnedMsg.fileName || "Tập tin"}</span>
                        </div>
                      ) : (
                        pinnedMsg.content
                      )}
                    </div>
                  </div>
                  
                  <Dropdown
                    overlay={
                      <Menu>
                        {onUnpinMessage && (
                          <Menu.Item 
                            key="unpin" 
                            icon={<PushpinOutlined />}
                            onClick={() => onUnpinMessage(pinnedMsg.id)}
                          >
                            Bỏ ghim
                          </Menu.Item>
                        )}
                        <Menu.Item 
                          key="goto" 
                          onClick={() => {
                            onClose && onClose();
                            setTimeout(() => {
                              onViewMessage(pinnedMsg.id);
                            }, 300);
                          }}
                        >
                          Đi đến tin nhắn
                        </Menu.Item>
                      </Menu>
                    }
                    trigger={['click']}
                    placement="bottomRight"
                  >
                    <Button 
                      type="text" 
                      size="small" 
                      icon={<MoreOutlined />}
                      className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </Dropdown>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PinnedMessages; 