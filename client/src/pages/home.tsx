import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import ChatContainer from "@/components/chat/chat-container";
import { useWebSocket } from "@/lib/websocket";
import type { Message } from "@shared/schema";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Get session
  const { data: session } = useQuery({
    queryKey: ['/api/session'],
  });

  // Get initial messages
  const { data: initialMessages } = useQuery({
    queryKey: ['/api/messages'],
    enabled: !!session?.sessionId,
  });

  // WebSocket connection
  const { sendMessage, addMessageHandler } = useWebSocket(session?.sessionId);

  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    const removeHandler = addMessageHandler((message) => {
      if (message.type === 'message') {
        setMessages(prev => [...prev, {
          id: message.id!,
          conversationId: message.conversationId!,
          message: message.content!,
          isAdminReply: message.isAdminReply!,
          createdAt: new Date(message.createdAt!),
        }]);
      }
    });

    return removeHandler;
  }, [addMessageHandler]);

  const handleSendMessage = (content: string) => {
    sendMessage(content);
  };

  return (
    <div className="h-screen overflow-hidden" data-testid="chat-page">
      <ChatContainer 
        messages={messages} 
        onSendMessage={handleSendMessage}
        data-testid="chat-container"
      />
    </div>
  );
}
