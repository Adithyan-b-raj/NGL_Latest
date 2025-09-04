import { useEffect, useRef, useCallback } from 'react';

export interface WebSocketMessage {
  type: 'message' | 'join';
  content?: string;
  sessionId?: string;
  isAdmin?: boolean;
  id?: number;
  isAdminReply?: boolean;
  createdAt?: Date;
  conversationId?: number;
}

export function useWebSocket(sessionId: string | null, isAdmin: boolean = false) {
  const ws = useRef<WebSocket | null>(null);
  const messageHandlers = useRef<((message: WebSocketMessage) => void)[]>([]);

  const connect = useCallback(() => {
    if (!sessionId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      // Join the conversation
      ws.current?.send(JSON.stringify({
        type: 'join',
        sessionId,
        isAdmin,
      }));
    };

    ws.current.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        messageHandlers.current.forEach(handler => handler(message));
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 3 seconds
      setTimeout(connect, 3000);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [sessionId, isAdmin]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'message',
        content,
      }));
    }
  }, []);

  const addMessageHandler = useCallback((handler: (message: WebSocketMessage) => void) => {
    messageHandlers.current.push(handler);
    return () => {
      messageHandlers.current = messageHandlers.current.filter(h => h !== handler);
    };
  }, []);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return {
    sendMessage,
    addMessageHandler,
    isConnected: ws.current?.readyState === WebSocket.OPEN,
  };
}
