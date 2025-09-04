import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LogOut, MessageSquare, User } from "lucide-react";

interface ConversationWithStats {
  id: number;
  sessionId: string;
  createdAt: string;
  lastActivity: string;
  messageCount: number;
  lastMessage?: {
    message: string;
    isAdminReply: boolean;
    createdAt: string;
  };
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: conversations, isLoading } = useQuery<ConversationWithStats[]>({
    queryKey: ['/api/admin/conversations'],
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/logout");
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/admin/login");
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleViewConversation = (id: number) => {
    setLocation(`/admin/conversation/${id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="loading-state">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="admin-dashboard">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="dashboard-title">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-2" data-testid="dashboard-subtitle">
              Manage anonymous chat conversations
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => logoutMutation.mutate()}
            className="flex items-center space-x-2"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </Button>
        </div>

        {!conversations || conversations.length === 0 ? (
          <Card data-testid="empty-conversations">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No conversations yet</h3>
                <p className="text-muted-foreground">
                  Anonymous conversations will appear here when users start chatting.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4" data-testid="conversations-list">
            {conversations.map((conversation) => (
              <Card 
                key={conversation.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewConversation(conversation.id)}
                data-testid={`conversation-card-${conversation.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-base" data-testid={`conversation-title-${conversation.id}`}>
                          Anonymous User
                        </CardTitle>
                        <CardDescription data-testid={`conversation-session-${conversation.id}`}>
                          Session: {conversation.sessionId.substring(0, 8)}...
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary" data-testid={`message-count-${conversation.id}`}>
                      {conversation.messageCount} messages
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {conversation.lastMessage && (
                    <div className="mb-3" data-testid={`last-message-${conversation.id}`}>
                      <p className="text-sm text-foreground line-clamp-2">
                        {conversation.lastMessage.isAdminReply ? "You: " : "User: "}
                        {conversation.lastMessage.message}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span data-testid={`created-date-${conversation.id}`}>
                      Created: {formatDate(conversation.createdAt)}
                    </span>
                    <span data-testid={`last-activity-${conversation.id}`}>
                      Last activity: {formatDate(conversation.lastActivity)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
