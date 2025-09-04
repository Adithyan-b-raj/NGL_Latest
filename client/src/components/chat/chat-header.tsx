import { User } from "lucide-react";

export default function ChatHeader() {
  return (
    <div className="border-b border-border px-6 py-4 flex items-center justify-between bg-card" data-testid="chat-header">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <User className="w-5 h-5 text-muted-foreground" data-testid="user-icon" />
          <div>
            <h1 className="text-lg font-semibold text-foreground" data-testid="chat-title">
              Anonymous Chat
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="chat-subtitle">
              Send messages anonymously
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2" data-testid="status-indicator">
        <div className="online-indicator w-2 h-2 bg-green-500 rounded-full animate-pulse" data-testid="online-dot"></div>
        <span className="text-sm text-muted-foreground" data-testid="status-text">Online</span>
      </div>
    </div>
  );
}
