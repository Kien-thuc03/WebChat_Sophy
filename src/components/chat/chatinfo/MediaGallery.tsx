import React, { useState, useEffect } from 'react';
import { Button, Dropdown, Empty } from 'antd';
import { 
  DownOutlined, 
  DownloadOutlined,
} from '@ant-design/icons';
import { formatRelativeTime } from '../../../utils/dateUtils';

// Define interface for media/file item
interface MediaItem {
  url: string;
  downloadUrl?: string;
  type: string;
  timestamp?: string;
  createdAt?: string;
  name?: string;
  size?: number;
  senderId?: string;
  messageId?: string;
  content?: string;
  thumbnailUrl?: string;
}

// Group media items by date
interface GroupedMedia {
  [date: string]: MediaItem[];
}

interface MediaGalleryProps {
  type: 'media' | 'files';
  items: MediaItem[];
  conversationId: string;
  onPreviewMedia: (media: MediaItem, type: 'image' | 'video', index: number) => void;
  onDownload: (url: string, downloadUrl: string | undefined, filename: string) => void;
}

const MediaGallery: React.FC<MediaGalleryProps> = ({ 
  type, 
  items, 
  onPreviewMedia, 
  onDownload 
}) => {
  const [groupedMedia, setGroupedMedia] = useState<GroupedMedia>({});
  const [loading, setLoading] = useState<boolean>(false);
  
  // Filter states
  const [senderFilter, ] = useState<string>('Tất cả');
  const [dateFilter, ] = useState<string>('Mới nhất');

  useEffect(() => {
    setLoading(true);
    groupMediaByDate(items, setGroupedMedia);
    setLoading(false);
  }, [items]);

  // Group media items by date
  const groupMediaByDate = (items: MediaItem[], setStateFunction: React.Dispatch<React.SetStateAction<GroupedMedia>>) => {
    const grouped: GroupedMedia = {};
    
    // Sort items by timestamp (newest first)
    const sortedItems = [...items].sort((a, b) => {
      const dateA = a.timestamp || a.createdAt || '';
      const dateB = b.timestamp || b.createdAt || '';
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
    
    sortedItems.forEach(item => {
      const dateStr = item.timestamp || item.createdAt || new Date().toISOString();
      const date = new Date(dateStr);
      
      // Format the date for grouping (e.g., "2023-04-15")
      const formattedDate = date.toISOString().split('T')[0];
      
      if (!grouped[formattedDate]) {
        grouped[formattedDate] = [];
      }
      
      grouped[formattedDate].push(item);
    });
    
    setStateFunction(grouped);
  };

  const formatDateHeader = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Format date as "Today", "Yesterday", or "April 15, 2023"
    if (date.toDateString() === today.toDateString()) {
      return 'Hôm nay';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hôm qua';
    } else {
      // Format as "15/04/2023"
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
  };

  const renderImageGrid = () => {
    if (Object.keys(groupedMedia).length === 0) {
      return (
        <Empty 
          description="Không có ảnh hoặc video nào được chia sẻ" 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
          className="py-8"
        />
      );
    }
    
    return (
      <div className="space-y-6">
        {Object.entries(groupedMedia).map(([date, mediaItems]) => (
          <div key={date} className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">{formatDateHeader(date)}</h3>
            <div className="grid grid-cols-3 gap-2">
              {mediaItems.map((media, index) => {
                const isVideo = media.type?.startsWith('video');
                return (
                  <div 
                    key={`media-${date}-${index}`} 
                    className="aspect-square bg-gray-100 rounded overflow-hidden relative cursor-pointer border border-gray-200 hover:opacity-90"
                    onClick={() => onPreviewMedia(media, isVideo ? 'video' : 'image', items.findIndex(item => 
                      item.url === media.url && item.messageId === media.messageId))}
                  >
                    {!isVideo ? (
                      <img 
                        src={media.url}
                        alt={media.name || `Image ${index}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="relative w-full h-full">
                        {media.thumbnailUrl ? (
                          <img 
                            src={media.thumbnailUrl} 
                            alt={media.name || "Video"} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-black opacity-70 flex items-center justify-center">
                            <span className="text-white">Video</span>
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-white bg-black bg-opacity-50 rounded-full p-2">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderFileGrid = () => {
    if (Object.keys(groupedMedia).length === 0) {
      return (
        <Empty 
          description="Không có tệp tin nào được chia sẻ" 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
          className="py-8"
        />
      );
    }
    
    return (
      <div className="space-y-6">
        {Object.entries(groupedMedia).map(([date, files]) => (
          <div key={date} className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">{formatDateHeader(date)}</h3>
            <div className="space-y-3">
              {files.map((file, index) => {
                // Determine file type icon and background color
                let bgColor = "bg-blue-500";
                
                if (file.name) {
                  const ext = file.name.split('.').pop()?.toLowerCase();
                  if (ext === 'json') {
                    bgColor = "bg-blue-400";
                  } else if (ext === 'env') {
                    bgColor = "bg-cyan-400";
                  } else if (['jpg', 'png', 'gif', 'jpeg'].includes(ext || '')) {
                    bgColor = "bg-purple-400";
                  } else if (['mp4', 'avi', 'mov'].includes(ext || '')) {
                    bgColor = "bg-red-400";
                  } else if (['zip', 'rar', '7z'].includes(ext || '')) {
                    bgColor = "bg-yellow-500";
                  } else if (['docx', 'doc', 'pdf'].includes(ext || '')) {
                    bgColor = "bg-blue-600";
                  }
                }
                
                // Format file size
                const fileSize = file.size ? `${Math.round(file.size / 1024)} KB` : '';
                
                // Format time from timestamp
                const timeString = file.timestamp || file.createdAt 
                  ? formatRelativeTime(new Date(file.timestamp || file.createdAt || '').getTime())
                  : '';
                
                return (
                  <div 
                    key={`file-${date}-${index}`} 
                    className="flex items-center justify-between py-2 bg-white rounded p-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center">
                      <div className={`w-12 h-12 rounded flex items-center justify-center text-white ${bgColor} mr-3 flex-shrink-0`}>
                        <span className="text-xs font-bold uppercase">{file.name?.split('.').pop() || 'FILE'}</span>
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-medium truncate max-w-xs">{file.name}</div>
                        <div className="flex items-center text-xs text-gray-500">
                          {fileSize && <span>{fileSize}</span>}
                          {fileSize && timeString && <span className="mx-1">•</span>}
                          {timeString && <span>{timeString}</span>}
                        </div>
                      </div>
                    </div>
                    <Button 
                      type="link" 
                      className="text-gray-400 hover:text-blue-500 flex-shrink-0"
                      onClick={() => onDownload(file.url, file.downloadUrl, file.name || 'file')}
                      icon={<DownloadOutlined />}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="media-gallery p-4">
      {/* Filter options */}
      <div className="flex space-x-2 mb-4">
        <Dropdown
          menu={{
            items: [
              { key: '1', label: 'Tất cả' },
              { key: '2', label: 'User 1' },
              { key: '3', label: 'User 2' },
            ],
            onClick: () => {},
          }}
          trigger={['click']}
        >
          <Button className="flex items-center justify-center">
            <span>{senderFilter}</span>
            <DownOutlined className="ml-1" />
          </Button>
        </Dropdown>
        
        <Dropdown
          menu={{
            items: [
              { key: '1', label: 'Mới nhất' },
              { key: '2', label: 'Cũ nhất' },
              { key: '3', label: 'Tuần này' },
              { key: '4', label: 'Tháng này' },
            ],
            onClick: () => {},
          }}
          trigger={['click']}
        >
          <Button className="flex items-center justify-center">
            <span>{dateFilter}</span>
            <DownOutlined className="ml-1" />
          </Button>
        </Dropdown>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        type === 'media' ? renderImageGrid() : renderFileGrid()
      )}
    </div>
  );
};

export default MediaGallery; 