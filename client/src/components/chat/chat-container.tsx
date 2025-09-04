import { type Message } from "@shared/schema";
import ChatHeader from "./chat-header";
import MessageBubble from "./message-bubble";
import MessageInput from "./message-input";

interface ChatContainerProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
}

export default function ChatContainer({ messages, onSendMessage }: ChatContainerProps) {
  return (
    <div className="chat-container flex flex-col bg-background h-full" data-testid="chat-container">
      <ChatHeader />
      
      <div className="messages-area flex-1 px-6 py-4 bg-background overflow-y-auto" data-testid="messages-area">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center" data-testid="empty-state">
            <div className="text-4xl mb-4">👋</div>
            <p className="text-muted-foreground text-sm">
              Start the conversation by sending your first anonymous message!
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="messages-container">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </div>
        )}
      </div>
      
      <MessageInput onSendMessage={onSendMessage} />
    </div>
  );
}
