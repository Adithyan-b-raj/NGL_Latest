import { type Message } from "@shared/schema";

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="mb-3" data-testid={`message-${message.id}`}>
      <div className={`flex ${message.isAdminReply ? 'justify-start' : 'justify-end'} mb-1`}>
        <div 
          className={`message-bubble max-w-[70%] px-4 py-2 rounded-lg shadow-sm word-wrap break-word ${
            message.isAdminReply 
              ? 'bg-muted text-muted-foreground' 
              : 'bg-primary text-primary-foreground'
          }`}
          data-testid={`message-bubble-${message.isAdminReply ? 'admin' : 'user'}`}
        >
          <p className="text-sm" data-testid="message-content">
            {message.message}
          </p>
        </div>
      </div>
      <div className={`flex ${message.isAdminReply ? 'justify-start' : 'justify-end'}`}>
        <span className="text-xs text-muted-foreground" data-testid="message-timestamp">
          {formatTimestamp(message.createdAt)}
        </span>
      </div>
    </div>
  );
}
