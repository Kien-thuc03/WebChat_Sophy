import React, { useState, useEffect, useRef } from "react";
import { getAllAIConversations, processAIRequest } from "../../api/API";
import { Input, Button, Spin, Avatar, List, Card, message } from "antd";
import {
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  HistoryOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import "./AIAssistant.css";
import { useLanguage } from "../../features/auth/context/LanguageContext";

interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

interface AIConversation {
  conversationId: string;
  messages: AIMessage[];
  updatedAt: string;
}

interface AIAssistantProps {
  onClose?: () => void;
  onSendToChat?: (message: string) => void;
  inChatMode?: boolean;
}

const AIAssistant: React.FC<AIAssistantProps> = ({
  onClose,
  onSendToChat,
  inChatMode = false,
}) => {
  const { t, language } = useLanguage();
  const [input, setInput] = useState("");
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversation, setCurrentConversation] =
    useState<AIConversation | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  // const [isLoading, setIsLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Tải các cuộc hội thoại khi component được tạo
  useEffect(() => {
    loadConversations();
  }, []);

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages]);

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const data = await getAllAIConversations();
      if (Array.isArray(data)) {
        // Sắp xếp cuộc trò chuyện theo thời gian giảm dần
        const sortedConversations = data.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setConversations(sortedConversations);

        // Nếu không có cuộc trò chuyện hiện tại, chọn cuộc trò chuyện gần nhất
        if (!currentConversation && sortedConversations.length > 0) {
          setCurrentConversation(sortedConversations[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load AI conversations:", error);
      message.error(
        t.failed_to_load_ai_conversations ||
          "Không thể tải lịch sử trò chuyện AI"
      );
    } finally {
      setLoadingConversations(false);
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const selectConversation = (conversation: AIConversation) => {
    setCurrentConversation(conversation);
    setShowHistory(false); // Ẩn phần lịch sử sau khi chọn
  };

  const startNewConversation = () => {
    setCurrentConversation({
      conversationId: "",
      messages: [],
      updatedAt: new Date().toISOString(),
    });
    setShowHistory(false); // Ẩn phần lịch sử sau khi tạo mới
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Thêm tin nhắn người dùng vào cuộc trò chuyện hiện tại
    const userMessage: AIMessage = { role: "user", content: input.trim() };

    let updatedMessages: AIMessage[];
    let conversationId = currentConversation?.conversationId || "";

    if (currentConversation) {
      updatedMessages = [...currentConversation.messages, userMessage];
      setCurrentConversation({
        ...currentConversation,
        messages: updatedMessages,
        updatedAt: new Date().toISOString(),
      });
    } else {
      updatedMessages = [userMessage];
      setCurrentConversation({
        conversationId: "",
        messages: updatedMessages,
        updatedAt: new Date().toISOString(),
      });
    }

    setInput("");
    setIsTyping(true);

    try {
      const response = await processAIRequest(
        conversationId,
        userMessage.content
      );

      if (!response || !response.response) {
        throw new Error(
          t.no_response_from_ai || "Không nhận được phản hồi từ AI"
        );
      }

      const assistantMessage: AIMessage = {
        role: "assistant",
        content: response.response,
      };

      // Cập nhật cuộc trò chuyện hiện tại với phản hồi mới
      setCurrentConversation((prev) => {
        if (!prev) {
          return {
            conversationId: response.conversationId,
            messages: [userMessage, assistantMessage],
            updatedAt: new Date().toISOString(),
          };
        }

        return {
          ...prev,
          conversationId: response.conversationId,
          messages: [...prev.messages, assistantMessage],
          updatedAt: new Date().toISOString(),
        };
      });

      // Tải lại danh sách cuộc trò chuyện để bao gồm cuộc trò chuyện mới
      loadConversations();
    } catch (error) {
      console.error("Failed to process AI request:", error);
      message.error(
        t.failed_to_process_ai_request || "Không thể xử lý yêu cầu AI"
      );
    } finally {
      setIsTyping(false);
    }
  };

  const sendResponseToChat = (content: string) => {
    if (onSendToChat) {
      onSendToChat(content);
    }
  };

  // Tạo phần hiển thị lịch sử dạng sidebar
  const renderHistorySidebar = () => {
    return (
      <div className="ai-history-sidebar">
        <div className="ai-history-header">
          <h3>{t.conversation_history || "Lịch sử trò chuyện"}</h3>
          <Button type="primary" onClick={startNewConversation} size="small">
            {t.create_new || "Tạo mới"}
          </Button>
        </div>

        {loadingConversations ? (
          <div className="ai-history-loading">
            <Spin size="small" />
            <span>{t.loading_history || "Đang tải lịch sử..."}</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className="ai-history-empty">
            <p>{t.no_conversations || "Chưa có cuộc trò chuyện nào"}</p>
          </div>
        ) : (
          <List
            className="ai-history-list"
            dataSource={conversations}
            renderItem={(conversation) => {
              // Lấy tin nhắn đầu tiên của người dùng hoặc tin nhắn gần nhất nếu không có
              let previewText = t.new_conversation || "Cuộc trò chuyện mới";
              if (conversation.messages.length > 0) {
                const userMessages = conversation.messages.filter(
                  (m) => m.role === "user"
                );
                if (userMessages.length > 0) {
                  previewText = userMessages[0].content;
                } else {
                  previewText = conversation.messages[0].content;
                }
              }

              // Giới hạn độ dài của preview text
              if (previewText.length > 30) {
                previewText = previewText.substring(0, 27) + "...";
              }

              // Format thời gian
              const date = new Date(conversation.updatedAt);
              const locale = language === "en" ? "en-US" : "vi-VN";
              const formattedDate = date.toLocaleDateString(locale, {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });

              const isActive =
                currentConversation?.conversationId ===
                conversation.conversationId;

              return (
                <List.Item
                  className={`ai-conversation-item ${isActive ? "ai-selected-conversation" : ""}`}
                  onClick={() => selectConversation(conversation)}>
                  <div className="ai-conversation-info">
                    <div className="ai-conversation-icon">
                      <img
                        src="/images/1.png"
                        alt="logo"
                        className="w-10 h-10"
                      />
                    </div>
                    <div className="ai-conversation-preview">
                      <div className="ai-conversation-text">{previewText}</div>
                      <div className="ai-conversation-date">
                        {formattedDate}
                      </div>
                    </div>
                  </div>
                </List.Item>
              );
            }}
          />
        )}
      </div>
    );
  };

  // Render different layouts based on inChatMode
  if (inChatMode) {
    return (
      <div className="ai-assistant ai-chat-mode flex justify-between">
        <div className="ai-header">
          <div className="ai-header-left">
            <img src="/images/1.png" alt="logo" className="w-10 h-10 mr-4" />
            <span className="ai-title">{t.ai_assistant || "AI Assistant"}</span>
          </div>
          <div>
            <Button
              type="text"
              icon={<HistoryOutlined />}
              onClick={() => setShowHistory(!showHistory)}
              className={
                showHistory ? "ai-history-button-active" : "ai-history-button"
              }></Button>

            {onClose && (
              <Button
                type="text"
                icon={<ArrowDownOutlined />}
                onClick={onClose}
                className="ai-back-button">
                {t.hide || "Ẩn"}
              </Button>
            )}
          </div>
        </div>

        <div className="ai-chat-content">
          {/* Hiển thị lịch sử trò chuyện khi showHistory = true */}
          {showHistory && renderHistorySidebar()}

          <div className={`ai-chat-main ${showHistory ? "with-history" : ""}`}>
            <div className="ai-messages-container">
              {!currentConversation?.messages?.length && (
                <div className="ai-welcome-message">
                  <img src="/images/1.png" alt="logo" className="w-10 h-10" />
                  <h3>{t.ai_welcome_title || "Xin chào! Tôi là trợ lý AI"}</h3>
                  <p>
                    {t.ai_welcome_message ||
                      "Bạn có thể hỏi tôi bất cứ điều gì. Tôi sẽ cố gắng giúp đỡ!"}
                  </p>
                </div>
              )}

              {currentConversation?.messages.map((msg, index) => (
                <div
                  key={index}
                  className={`ai-message ${msg.role === "user" ? "ai-user-message" : "ai-assistant-message"}`}>
                  <div className="ai-message-content">
                    <div className="ai-message-bubble">{msg.content}</div>
                    {msg.role === "assistant" && (
                      <div className="ai-message-actions">
                        <Button
                          type="text"
                          size="small"
                          onClick={() => sendResponseToChat(msg.content)}>
                          {t.send_to_conversation || "Gửi vào cuộc trò chuyện"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="ai-thinking">
                  <Spin size="small" />
                  <span>{t.ai_thinking || "AI đang suy nghĩ..."}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="ai-input-form">
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder={t.enter_ai_message || "Nhập tin nhắn cho AI..."}
                disabled={isTyping}
                className="ai-input"
                autoFocus
              />
              <Button
                type="primary"
                icon={
                  <SendOutlined
                    className={
                      input.trim() ? "ai-send-enabled" : "ai-send-disabled"
                    }
                  />
                }
                onClick={handleSubmit}
                disabled={!input.trim() || isTyping}
              />
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Default layout (standalone mode)
  return (
    <div className="ai-assistant-container">
      <div className="ai-sidebar">
        <div className="ai-sidebar-header">
          <h2>{t.ai_assistant || "AI Assistant"}</h2>
          <Button type="primary" onClick={startNewConversation}>
            {t.create_new || "Tạo mới"}
          </Button>
        </div>

        <div className="ai-conversations-list">
          {loadingConversations ? (
            <div className="ai-loading">
              <Spin />
              <span>
                {t.loading_conversations || "Đang tải cuộc trò chuyện..."}
              </span>
            </div>
          ) : (
            <List
              dataSource={conversations}
              renderItem={(conversation) => {
                const isActive =
                  currentConversation?.conversationId ===
                  conversation.conversationId;

                // Lấy tin nhắn đầu tiên hoặc một đoạn preview
                let preview = t.new_conversation || "Cuộc trò chuyện mới";
                if (conversation.messages.length > 0) {
                  const firstUserMessage = conversation.messages.find(
                    (m) => m.role === "user"
                  );
                  preview = firstUserMessage
                    ? firstUserMessage.content
                    : conversation.messages[0].content;
                  preview =
                    preview.length > 40
                      ? preview.substring(0, 37) + "..."
                      : preview;
                }

                return (
                  <List.Item
                    className={`conversation-item ${isActive ? "active" : ""}`}
                    onClick={() => selectConversation(conversation)}>
                    <Card
                      size="small"
                      title={
                        <div className="conversation-header">
                          <img
                            src="/images/1.png"
                            alt="logo"
                            className="w-10 h-10"
                          />
                          <span>
                            {new Date(
                              conversation.updatedAt
                            ).toLocaleDateString(
                              language === "en" ? "en-US" : "vi-VN"
                            )}
                          </span>
                        </div>
                      }>
                      {preview}
                    </Card>
                  </List.Item>
                );
              }}
            />
          )}

          {conversations.length === 0 && !loadingConversations && (
            <div className="ai-empty-state">
              <div className="ai-empty-icon">
                <RobotOutlined />
              </div>
              <p>{t.no_conversations_yet || "Chưa có cuộc trò chuyện nào"}</p>
              <p>
                {t.start_by_asking || "Hãy bắt đầu bằng cách hỏi AI trợ giúp!"}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="ai-main">
        <div className="ai-conversation">
          <div className="ai-messages">
            {!currentConversation?.messages?.length && (
              <div className="ai-welcome-message">
                <img src="/images/1.png" alt="logo" className="w-10 h-10" />
                <h3>{t.ai_welcome_title || "Xin chào! Tôi là trợ lý AI"}</h3>
                <p>
                  {t.ai_welcome_message ||
                    "Bạn có thể hỏi tôi bất cứ điều gì. Tôi sẽ cố gắng giúp đỡ!"}
                </p>
              </div>
            )}

            {currentConversation?.messages.map((msg, index) => (
              <div
                key={index}
                className={`ai-message ${msg.role === "user" ? "ai-user-message" : "ai-assistant-message"}`}>
                <Avatar
                  icon={
                    msg.role === "user" ? (
                      <UserOutlined />
                    ) : (
                      <img
                        src="/images/1.png"
                        alt="logo"
                        className="w-10 h-10"
                      />
                    )
                  }
                  className={`ai-avatar ${msg.role === "user" ? "ai-user-avatar" : "ai-assistant-avatar"}`}
                />
                <div className="ai-message-content">
                  <div className="ai-message-bubble">{msg.content}</div>
                  {msg.role === "assistant" && onSendToChat && (
                    <div className="ai-message-actions">
                      <Button
                        type="text"
                        size="small"
                        onClick={() => sendResponseToChat(msg.content)}>
                        {t.send_to_conversation || "Gửi vào cuộc trò chuyện"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="ai-thinking">
                <Spin size="small" />
                <span>{t.ai_thinking || "AI đang suy nghĩ..."}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="ai-input-form">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder={t.enter_ai_message || "Nhập tin nhắn cho AI..."}
              disabled={isTyping}
              className="ai-input"
            />
            <Button
              type="primary"
              icon={
                <SendOutlined
                  className={
                    input.trim() ? "ai-send-enabled" : "ai-send-disabled"
                  }
                />
              }
              onClick={handleSubmit}
              disabled={!input.trim() || isTyping}
            />
          </form>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
