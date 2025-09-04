import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/lib/websocket";
import { ArrowLeft, Send, User } from "lucide-react";
import type { Message, Conversation } from "@shared/schema";

interface ConversationData {
  conversation: Conversation;
  messages: Message[];
}

export default function AdminConversationPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [reply, setReply] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversationData, isLoading } = useQuery<ConversationData>({
    queryKey: ['/api/admin/conversation', id],
  });

  const { sendMessage, addMessageHandler } = useWebSocket("admin-session", true);

  useEffect(() => {
    if (conversationData?.messages) {
      setMessages(conversationData.messages);
    }
  }, [conversationData]);

  useEffect(() => {
    const removeHandler = addMessageHandler((message) => {
      if (message.type === 'message' && message.conversationId === parseInt(id!)) {
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
  }, [addMessageHandler, id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const replyMutation = useMutation({
    mutationFn: async (data: { message: string }) => {
      const response = await apiRequest("POST", `/api/admin/reply/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/conversation', id] });
      setReply("");
      toast({
        title: "Success",
        description: "Reply sent successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive",
      });
    },
  });

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedReply = reply.trim();
    if (!trimmedReply) return;
    
    replyMutation.mutate({ message: trimmedReply });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="loading-conversation">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (!conversationData) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="conversation-not-found">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Conversation not found</h2>
            <p className="text-muted-foreground mb-4">
              This conversation may have been deleted or doesn't exist.
            </p>
            <Button onClick={() => setLocation("/admin")} data-testid="back-to-dashboard">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="admin-conversation-page">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation("/admin")}
              className="flex items-center space-x-2"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <div className="flex items-center space-x-3">
              <User className="w-6 h-6 text-muted-foreground" />
              <div>
                <h1 className="text-lg font-semibold" data-testid="conversation-header-title">
                  Anonymous User
                </h1>
                <p className="text-sm text-muted-foreground" data-testid="conversation-session-id">
                  Session: {conversationData.conversation.sessionId.substring(0, 8)}...
                </p>
              </div>
            </div>
          </div>
          <Badge variant="secondary" data-testid="total-messages-count">
            {messages.length} messages
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4" data-testid="admin-messages-area">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex ${message.isAdminReply ? 'justify-start' : 'justify-end'}`}
              data-testid={`admin-message-${message.id}`}
            >
              <div className="max-w-[70%]">
                <div 
                  className={`px-4 py-3 rounded-lg ${
                    message.isAdminReply 
                      ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100' 
                      : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                  }`}
                  data-testid={`admin-message-bubble-${message.isAdminReply ? 'admin' : 'user'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">
                      {message.isAdminReply ? 'You (Admin)' : 'Anonymous User'}
                    </span>
                  </div>
                  <p className="text-sm" data-testid="admin-message-content">
                    {message.message}
                  </p>
                  <p className="text-xs opacity-70 mt-2" data-testid="admin-message-timestamp">
                    {formatDate(message.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Reply Form */}
      <div className="border-t border-border px-6 py-4 bg-card" data-testid="admin-reply-form">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmitReply} className="flex space-x-3" data-testid="reply-form">
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your reply..."
              className="flex-1 min-h-[80px] resize-none"
              disabled={replyMutation.isPending}
              data-testid="reply-textarea"
            />
            <Button 
              type="submit" 
              disabled={!reply.trim() || replyMutation.isPending}
              className="flex items-center space-x-2"
              data-testid="button-send-reply"
            >
              <Send className="w-4 h-4" />
              <span>{replyMutation.isPending ? 'Sending...' : 'Send Reply'}</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
