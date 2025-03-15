import { useEffect, useState } from "react";
import { fetchConversations } from "../../../api/API";
import { Conversation } from "../types/conversationTypes";

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const data = await fetchConversations();
        setConversations(data);
      } catch (error) {
        console.error("Lỗi khi tải danh sách hội thoại:", error);
      }
    };

    loadConversations();
  }, []);

  return conversations;
};
