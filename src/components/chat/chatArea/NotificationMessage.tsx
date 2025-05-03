import React from 'react';
import { DisplayMessage } from '../../../features/chat/types/chatTypes';

const NotificationMessage = ({ message, onViewClick }: { message: DisplayMessage, onViewClick: () => void }) => {
  return (
    <div className="flex justify-center my-2">
      <div className="flex items-center bg-white rounded-full py-2 px-4 max-w-md border border-gray-100 shadow-sm">
        <div className="mr-2 text-orange-500">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" />
          </svg>
        </div>
        <div className="text-sm text-gray-700 flex-grow">
          {message.content}
        </div>
        {message.content.includes("ghim tin nhắn") && (
          <button 
            className="text-blue-500 text-sm font-medium ml-2"
            onClick={onViewClick}
          >
            Xem
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationMessage; 