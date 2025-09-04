import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (message: string) => void;
}

export default function MessageInput({ onSendMessage }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    setIsLoading(true);
    try {
      onSendMessage(trimmedMessage);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
  };

  return (
    <div className="border-t border-border px-6 py-4 bg-card" data-testid="message-input-container">
      <form onSubmit={handleSubmit} className="flex items-end space-x-3" data-testid="message-form">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Type your anonymous message..."
            className="message-input resize-none min-h-[20px] max-h-[100px] bg-background border-input focus:ring-ring"
            rows={1}
            disabled={isLoading}
            data-testid="message-input"
          />
        </div>
        <Button 
          type="submit" 
          size="icon"
          disabled={!message.trim() || isLoading}
          className="w-10 h-10 bg-primary hover:bg-primary/90 text-primary-foreground"
          data-testid="send-button"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" data-testid="loading-icon" />
          ) : (
            <Send className="w-5 h-5" data-testid="send-icon" />
          )}
        </Button>
      </form>
    </div>
  );
}
