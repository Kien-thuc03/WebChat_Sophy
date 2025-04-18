import React from 'react';
import { Tooltip } from 'antd';
import { DisplayMessage } from '../../features/chat/types/chatTypes';
import { formatMessagePreview } from '../../utils/messageUtils';

interface PinnedMessagesProps {
  pinnedMessages: DisplayMessage[];
  onViewMessage: (messageId: string) => void;
}

const PinnedMessages: React.FC<PinnedMessagesProps> = ({ pinnedMessages, onViewMessage }) => {
  if (!pinnedMessages || pinnedMessages.length === 0) {
    return null;
  }

  const pinnedCount = pinnedMessages.length;

  return (
    <div className="pinned-messages-container bg-gray-50 border-b border-gray-200">
      <div className="max-h-32 overflow-y-auto">
        {pinnedMessages.map((message, index) => (
          <div key={message.id} className="p-2 flex items-center hover:bg-gray-100 border-b border-gray-100 last:border-b-0">
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center text-sm">
                <div className="text-yellow-600 mr-2">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" />
                  </svg>
                </div>
                <div className="flex-1 overflow-hidden">
                  <Tooltip title={formatMessagePreview(message)}>
                    <div className="truncate font-medium">
                      {formatMessagePreview(message)}
                    </div>
                  </Tooltip>
                  <div className="text-xs text-gray-500">
                    {message.sender.name}
                  </div>
                </div>
                <button 
                  className="ml-2 text-blue-500 text-sm font-medium"
                  onClick={() => onViewMessage(message.id)}
                >
                  Xem
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {pinnedCount > 0 && (
        <div className="text-xs text-gray-500 p-1 text-center border-t border-gray-200">
          {pinnedCount} tin nhắn đã ghim ({pinnedCount}/3)
        </div>
      )}
    </div>
  );
};

export default PinnedMessages; 