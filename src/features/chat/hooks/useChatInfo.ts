import { useState } from 'react';
import { Conversation } from '../types/conversationTypes';
import { setCoOwner, setOwner, removeCoOwnerById, deleteGroup, leaveGroup } from '../../../api/API';

export const useChatInfo = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Set co-owners for a group conversation using the API
   * @param conversationId - The ID of the conversation
   * @param coOwnerIds - Array of user IDs to set as co-owners
   */
  const setCoOwners = async (conversationId: string, coOwnerIds: string[]): Promise<Conversation | null> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Setting co-owners:', { conversationId, coOwnerIds });
      const response = await setCoOwner(conversationId, coOwnerIds);
      setLoading(false);
      
      // Ensure we have a valid conversation object
      if (response && response.conversation) {
        console.log('Response data:', response.conversation);
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
      console.log('Adding co-owner:', newCoOwnerId, 'Updated list:', updatedCoOwnerIds);
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
      console.log('Transferring ownership:', { conversationId, newOwnerId });
      const response = await setOwner(conversationId, newOwnerId);
      setLoading(false);
      
      // Ensure we have a valid conversation object
      if (response && response.conversation) {
        console.log('Response data after transfer:', response.conversation);
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
      console.log('Removing co-owner directly:', { conversationId, coOwnerId });
      const response = await removeCoOwnerById(conversationId, coOwnerId);
      setLoading(false);
      
      // Ensure we have a valid conversation object
      if (response && response.conversation) {
        console.log('Response after removing co-owner:', response.conversation);
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
      console.log('Deleting group conversation:', { conversationId });
      const response = await deleteGroup(conversationId);
      setLoading(false);
      
      // Ensure we have a valid conversation object
      if (response && response.conversation) {
        console.log('Response after deleting group:', response.conversation);
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
      console.log('Leaving group conversation:', { conversationId });
      const response = await leaveGroup(conversationId);
      setLoading(false);
      
      // Ensure we have a valid conversation object
      if (response && response.conversation) {
        console.log('Response after leaving group:', response.conversation);
        
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

  return {
    loading,
    error,
    setCoOwners,
    removeCoOwner,
    removeCoOwnerDirectly,
    addCoOwner,
    transferOwnership,
    deleteGroupConversation,
    leaveGroupConversation
  };
};
