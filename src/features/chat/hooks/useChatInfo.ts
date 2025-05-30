import { useState } from 'react';
import { Conversation } from '../types/conversationTypes';
import { 
  setCoOwner, 
  setOwner, 
  removeCoOwnerById, 
  deleteGroup, 
  leaveGroup, 
  getConversationDetail, 
  removeUserFromGroup, 
  blockUserFromGroup, 
  unblockUserFromGroup 
} from '../../../api/API';

// Define interface for media item
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
}

// Define interface for file item
interface FileItem {
  url: string;
  downloadUrl?: string;
  type: string;
  name: string;
  size: number;
  timestamp?: string;
  createdAt: string;
  senderId?: string;
  messageId?: string;
  fromMessageId?: string;
  isRecall?: boolean;
  hiddenFrom?: string[];
}

// Extended conversation interface with additional properties returned by the API
interface DetailedConversation extends Conversation {
  isMuted?: boolean;
  isPinned?: boolean;
  isHidden?: boolean;
  groupLink?: string;
  mutualGroups?: number;
  notes?: any[];
  polls?: any[];
  sharedMedia?: MediaItem[];
  sharedFiles?: FileItem[];
  sharedLinks?: any[];
  listImage: string[];
  listFile: string[];
}

export const useChatInfo = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [fileItems, setFileItems] = useState<FileItem[]>([]);

  /**
   * Set co-owners for a group conversation using the API
   * @param conversationId - The ID of the conversation
   * @param coOwnerIds - Array of user IDs to set as co-owners
   */
  const setCoOwners = async (conversationId: string, coOwnerIds: string[]): Promise<Conversation | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await setCoOwner(conversationId, coOwnerIds);
      setLoading(false);
      
      // Ensure we have a valid conversation object
      if (response && response.conversation) {
        return response.conversation;
      } else {
        setError('Invalid response format');
        return null;
      }
    } catch (err: any) {
      setLoading(false);
      
      // Handle different error formats
      let errorMessage = 'Failed to set co-owners';
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
      console.error('Error setting co-owners:', errorMessage);
      return null;
    }
  };

  /**
   * Remove a co-owner from a group conversation
   * @param conversationId - The ID of the conversation
   * @param coOwnerId - The ID of the co-owner to remove
   * @param currentCoOwnerIds - Current list of co-owner IDs
   */
  const removeCoOwner = async (conversationId: string, coOwnerId: string, currentCoOwnerIds: string[]): Promise<Conversation | null> => {
    // Filter out the co-owner to remove
    const updatedCoOwnerIds = currentCoOwnerIds.filter(id => id !== coOwnerId);
    
    // Call the same endpoint with the updated list
    return await setCoOwners(conversationId, updatedCoOwnerIds);
  };

  /**
   * Add a new co-owner to a group conversation
   * @param conversationId - The ID of the conversation
   * @param newCoOwnerId - The ID of the new co-owner to add
   * @param currentCoOwnerIds - Current list of co-owner IDs
   */
  const addCoOwner = async (conversationId: string, newCoOwnerId: string, currentCoOwnerIds: string[]): Promise<Conversation | null> => {
    // Add the new co-owner if not already in the list
    if (!currentCoOwnerIds.includes(newCoOwnerId)) {
      const updatedCoOwnerIds = [...currentCoOwnerIds, newCoOwnerId];
      return await setCoOwners(conversationId, updatedCoOwnerIds);
    }
    return null;
  };
  
  /**
   * Transfer ownership of a group conversation to a new owner
   * @param conversationId - The ID of the conversation
   * @param newOwnerId - The ID of the user to set as the new owner
   */
  const transferOwnership = async (conversationId: string, newOwnerId: string): Promise<Conversation | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await setOwner(conversationId, newOwnerId);
      setLoading(false);
      
      // Ensure we have a valid conversation object
      if (response && response.conversation) {
        return response.conversation;
      } else {
        setError('Invalid response format');
        return null;
      }
    } catch (err: any) {
      setLoading(false);
      
      // Handle different error formats
      let errorMessage = 'Failed to transfer ownership';
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
      console.error('Error transferring ownership:', errorMessage);
      return null;
    }
  };

  /**
   * Remove a co-owner from a group conversation using API that directly removes a single co-owner
   * @param conversationId - The ID of the conversation
   * @param coOwnerId - The ID of the co-owner to remove
   */
  const removeCoOwnerDirectly = async (conversationId: string, coOwnerId: string): Promise<Conversation | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await removeCoOwnerById(conversationId, coOwnerId);
      setLoading(false);
      
      // Ensure we have a valid conversation object
      if (response && response.conversation) {
        return response.conversation;
      } else {
        setError('Invalid response format');
        return null;
      }
    } catch (err: any) {
      setLoading(false);
      
      // Handle different error formats
      let errorMessage = 'Failed to remove co-owner';
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
      console.error('Error removing co-owner:', errorMessage);
      return null;
    }
  };

  /**
   * Delete a group conversation (owner only)
   * @param conversationId - The ID of the conversation to delete
   */
  const deleteGroupConversation = async (conversationId: string): Promise<Conversation | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await deleteGroup(conversationId);
      setLoading(false);
      
      // Ensure we have a valid conversation object
      if (response && response.conversation) {
        return response.conversation;
      } else {
        setError('Invalid response format');
        return null;
      }
    } catch (err: any) {
      setLoading(false);
      
      // Handle different error formats
      let errorMessage = 'Failed to delete group';
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
      console.error('Error deleting group:', errorMessage);
      return null;
    }
  };

  /**
   * Leave a group conversation
   * @param conversationId - The ID of the conversation to leave
   */
  const leaveGroupConversation = async (conversationId: string): Promise<Conversation | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await leaveGroup(conversationId);
      setLoading(false);
      
      // Ensure we have a valid conversation object
      if (response && response.conversation) {
        
        // Dọn dẹp mọi cache hoặc state cục bộ để đảm bảo không còn hiển thị
        // Ví dụ: Nếu có state cache lưu conversation ở đây, hãy xóa nó
        
        return response.conversation;
      } else {
        setError('Invalid response format');
        return null;
      }
    } catch (err: any) {
      setLoading(false);
      
      // Handle different error formats
      let errorMessage = 'Failed to leave group';
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
      console.error('Error leaving group:', errorMessage);
      return null;
    }
  };

  /**
   * Fetches shared media items for a conversation
   * @param conversationId - The ID of the conversation
   */
  const fetchSharedMedia = async (conversationId: string): Promise<MediaItem[]> => {
    setLoading(true);
    setError(null);
    
    try {
      // Get conversation details which should include shared media
      const conversationData = await getConversationDetail(conversationId) as DetailedConversation;
      
      // Process shared media from the response
      let media: MediaItem[] = [];
      
      // Check if the conversation has media in listImage
      if (conversationData?.listImage && Array.isArray(conversationData.listImage)) {
        
        // Map each item to the correct MediaItem format
        media = conversationData.listImage.map((item: any) => {
          // If the item is a string, create a basic media item
          if (typeof item === 'string') {
            // Check if it's a video by url extension
            const isVideo = item.match(/\.(mp4|mov|avi|wmv|flv|mkv|webm)($|\?)/i);
            
            return {
              url: item,
              type: isVideo ? 'video' : 'image',
              timestamp: new Date().toISOString(),
              name: isVideo ? 'Video' : 'Image',
              size: 0,
            };
          }
          
          // Extract the urls
          const itemUrl = item.url || '';
          const downloadUrl = item.downloadUrl || itemUrl;
          
          // Determine media type from url or given type
          let mediaType = item.type || '';
          
          // Check file extension in url if type is not specified
          if (!mediaType || (!mediaType.startsWith('image') && !mediaType.startsWith('video'))) {
            if (itemUrl.match(/\.(mp4|mov|avi|wmv|flv|mkv|webm)($|\?)/i)) {
              mediaType = 'video';
            } else if (itemUrl.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)($|\?)/i)) {
              mediaType = 'image';
            } else {
              // Default to image for unknown types
              mediaType = 'image';
            }
          }
          
          // Cấu trúc mới cho listImage
          return {
            url: itemUrl,
            downloadUrl: downloadUrl,
            type: mediaType,
            timestamp: item.createdAt || item.timestamp || new Date().toISOString(),
            name: item.name || (mediaType === 'video' ? 'Video' : 'Image'),
            size: item.size || 0,
            messageId: item.fromMessageId || item.messageId || '',
            senderId: item.senderId || '',
          };
        });
      }
      
      // Now check if there are any video files in listFile that should be shown in media
      if (conversationData?.listFile && Array.isArray(conversationData.listFile)) {
        
        // Define the interface for items in listFile
        interface FileListItem {
          url?: string;
          downloadUrl?: string;
          name?: string;
          type?: string;
          timestamp?: string;
          createdAt?: string;
          size?: number;
          messageId?: string;
          fromMessageId?: string;
          senderId?: string;
          isRecall?: boolean;
          hiddenFrom?: string[];
          [key: string]: any; // For any other properties
        }
        
        // Filter for video files
        const videoFiles = conversationData.listFile
          .filter((item: string | FileListItem) => {
            if (typeof item === 'string') {
              // Check if it's a video file but not an audio webm file
              return item.match(/\.(mp4|mov|avi|wmv|flv|mkv)($|\?)/i) || 
                     (item.match(/\.webm($|\?)/i) && !item.match(/voice_message_|audio/i));
            }
            
            const itemName = (item as FileListItem).name || '';
            const itemUrl = (item as FileListItem).url || (item as FileListItem).downloadUrl || '';
            const itemType = (item as FileListItem).type || '';
            const itemSize = (item as FileListItem).size || 0;
            
            // Check if it's a video file but exclude audio webm files
            const isWebmAudio = (itemName.match(/voice_message_|audio/i) && itemName.match(/\.webm$/i)) || 
                               (itemType.startsWith('audio/') && itemName.match(/\.webm$/i)) ||
                               (itemName.match(/\.webm$/i) && itemSize < 1024 * 1024); // Files smaller than 1MB are likely audio
            
            return (itemType.startsWith('video/') || 
                   itemName.match(/\.(mp4|mov|avi|wmv|flv|mkv)$/i) ||
                   itemUrl.match(/\.(mp4|mov|avi|wmv|flv|mkv)($|\?)/i) ||
                   (itemName.match(/\.webm$/i) && !isWebmAudio) ||
                   (itemUrl.match(/\.webm($|\?)/i) && !isWebmAudio));
          })
          .map((item: string | FileListItem) => {
            if (typeof item === 'string') {
              return {
                url: item,
                downloadUrl: item,
                type: 'video',
                timestamp: new Date().toISOString(),
                name: 'Video',
                size: 0,
              };
            }
            
            const itemAsFile = item as FileListItem;
            
            return {
              url: itemAsFile.url || itemAsFile.downloadUrl || '',
              downloadUrl: itemAsFile.downloadUrl || itemAsFile.url || '',
              type: 'video',
              timestamp: itemAsFile.createdAt || itemAsFile.timestamp || new Date().toISOString(),
              name: itemAsFile.name || 'Video',
              size: itemAsFile.size || 0,
              messageId: itemAsFile.fromMessageId || itemAsFile.messageId || '',
              senderId: itemAsFile.senderId || '',
            };
          });
        
        // Add video files to media if they're not already included
        if (videoFiles.length > 0) {
          
          // Combine with existing media, avoiding duplicates by url
          const mediaUrls = new Set(media.map(m => m.url));
          const newVideos = videoFiles.filter(v => !mediaUrls.has(v.url));
          
          media = [...media, ...newVideos];
        }
      }
      
      // No mock data generation - we only want real data from the API

      setMediaItems(media);
      setLoading(false);
      return media;
    } catch (err: any) {
      setLoading(false);
      
      let errorMessage = 'Failed to fetch shared media';
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
      console.error('Error fetching shared media:', errorMessage);
      return [];
    }
  };

  /**
   * Fetches shared files for a conversation
   * @param conversationId - The ID of the conversation
   */
  const fetchSharedFiles = async (conversationId: string): Promise<FileItem[]> => {
    setLoading(true);
    setError(null);
    
    try {
      // Get conversation details which should include shared files
      const conversationData = await getConversationDetail(conversationId) as DetailedConversation;
      
      // Process shared files from the response
      let files: FileItem[] = [];
      
      // Check if the conversation has files in listFile
      if (conversationData?.listFile && Array.isArray(conversationData.listFile)) {
        
        // Map each item to the correct FileItem format
        files = conversationData.listFile.map((item: any) => {
          // If the item is a string, create a basic file item
          if (typeof item === 'string') {
            return {
              url: item,
              downloadUrl: item,
              type: 'file',
              name: 'File.txt',
              size: 1024,
              createdAt: new Date().toISOString(),
            };
          }
          
          
          // Extract file type from name if available
          let fileType = 'file';
          if (item.name && typeof item.name === 'string') {
            const extension = item.name.split('.').pop()?.toLowerCase();
            if (extension) {
              fileType = extension;
            }
          }
          
          // Dùng cấu trúc mới của listFile với các field mới
          return {
            url: item.url || item.downloadUrl || '',
            downloadUrl: item.downloadUrl || item.url || '',
            type: item.type || fileType,
            name: item.name || 'File',
            size: item.size || 0,
            createdAt: item.createdAt || item.timestamp || new Date().toISOString(),
            messageId: item.fromMessageId || item.messageId || '',
            senderId: item.senderId || '',
            isRecall: item.isRecall || false,
            hiddenFrom: item.hiddenFrom || []
          };
        });
        
        // Không hiển thị các file đã bị thu hồi hoặc ẩn
        files = files.filter(file => 
          !file.isRecall && 
          (!file.hiddenFrom || !Array.isArray(file.hiddenFrom) || file.hiddenFrom.length === 0)
        );
      }
      
      // No mock data generation - we only want real data from the API
      
      setFileItems(files);
      setLoading(false);
      return files;
    } catch (err: any) {
      setLoading(false);
      
      let errorMessage = 'Failed to fetch shared files';
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
      console.error('Error fetching shared files:', errorMessage);
      return [];
    }
  };

  /**
   * Downloads a file from a URL
   * @param url - The URL of the file to download
   * @param filename - The name to save the file as
   */
  const downloadFile = (url: string, filename: string): void => {
    try {
      // If URL is empty, show error and return
      if (!url) {
        setError('Download URL not available');
        console.error('Download URL is empty');
        return;
      }
      
      // Check if URL has fl_attachment parameter for Cloudinary
      // This ensures the browser will download the file instead of showing it
      if (url.includes('cloudinary.com') && !url.includes('fl_attachment')) {
        // Insert fl_attachment parameter for Cloudinary URLs if not present
        url = url.replace('/upload/', '/upload/fl_attachment/');
      }
      
      // Create a temporary anchor element
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'download';
      
      // Append to body, click and remove
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Failed to download file');
    }
  };

  /**
   * Remove a user from a group conversation
   * @param conversationId - The ID of the conversation
   * @param userId - The ID of the user to remove
   */
  const removeGroupMember = async (conversationId: string, userId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await removeUserFromGroup(conversationId, userId);
      setLoading(false);
      
      if (response && response.message) {
        return true;
      } else {
        setError('Invalid response format');
        return false;
      }
    } catch (err: any) {
      setLoading(false);
      
      // Handle different error formats
      let errorMessage = 'Failed to remove user from group';
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
      console.error('Error removing user from group:', errorMessage);
      return false;
    }
  };

  /**
   * Block a user from a group conversation
   * @param conversationId - The ID of the conversation
   * @param userId - The ID of the user to block
   */
  const blockGroupMember = async (conversationId: string, userId: string): Promise<Conversation | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await blockUserFromGroup(conversationId, userId);
      setLoading(false);
      
      if (response && response.conversation) {
        return response.conversation;
      } else {
        setError('Invalid response format');
        return null;
      }
    } catch (err: any) {
      setLoading(false);
      
      // Handle different error formats
      let errorMessage = 'Failed to block user from group';
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
      console.error('Error blocking user from group:', errorMessage);
      return null;
    }
  };

  /**
   * Unblock a user from a group conversation
   * @param conversationId - The ID of the conversation
   * @param userId - The ID of the user to unblock
   */
  const unblockGroupMember = async (conversationId: string, userId: string): Promise<Conversation | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await unblockUserFromGroup(conversationId, userId);
      setLoading(false);
      
      if (response && response.conversation) {
        return response.conversation;
      } else {
        setError('Invalid response format');
        return null;
      }
    } catch (err: any) {
      setLoading(false);
      
      // Handle different error formats
      let errorMessage = 'Failed to unblock user from group';
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
      console.error('Error unblocking user from group:', errorMessage);
      return null;
    }
  };

  return {
    loading,
    error,
    mediaItems,
    fileItems,
    setCoOwners,
    removeCoOwner,
    removeCoOwnerDirectly,
    addCoOwner,
    transferOwnership,
    deleteGroupConversation,
    leaveGroupConversation,
    fetchSharedMedia,
    fetchSharedFiles,
    downloadFile,
    removeGroupMember,
    blockGroupMember,
    unblockGroupMember
  };
};
