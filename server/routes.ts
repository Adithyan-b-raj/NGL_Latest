import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertMessageSchema, loginSchema } from "@shared/schema";
import { randomUUID } from "crypto";

interface SessionRequest extends Request {
  session: {
    sessionId?: string;
    isAdmin?: boolean;
    save: (callback?: (err?: any) => void) => void;
    destroy: (callback?: (err?: any) => void) => void;
  };
}

interface WebSocketWithData extends WebSocket {
  conversationId?: number;
  sessionId?: string;
  isAdmin?: boolean;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server on distinct path
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const connections = new Map<string, WebSocketWithData>();

  // WebSocket connection handler
  wss.on('connection', (ws: WebSocketWithData, req) => {
    const connectionId = randomUUID();
    connections.set(connectionId, ws);

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'join') {
          ws.sessionId = message.sessionId;
          ws.isAdmin = message.isAdmin || false;
          
          // Get or create conversation for this session
          if (!ws.isAdmin && ws.sessionId) {
            let conversation = await storage.getConversationBySessionId(ws.sessionId);
            if (!conversation) {
              conversation = await storage.createConversation({ sessionId: ws.sessionId });
            }
            ws.conversationId = conversation.id;
          }
        }
        
        if (message.type === 'message' && ws.conversationId) {
          // Create message in storage
          const newMessage = await storage.createMessage({
            conversationId: ws.conversationId,
            message: message.content,
            isAdminReply: ws.isAdmin || false,
          });
          
          // Update conversation activity
          await storage.updateConversationActivity(ws.conversationId);
          
          // Broadcast to all connections for this conversation
          const messageData = {
            type: 'message',
            id: newMessage.id,
            content: newMessage.message,
            isAdminReply: newMessage.isAdminReply,
            createdAt: newMessage.createdAt,
            conversationId: newMessage.conversationId,
          };
          
          connections.forEach((clientWs) => {
            if (clientWs.readyState === WebSocket.OPEN && 
                (clientWs.conversationId === ws.conversationId || clientWs.isAdmin)) {
              clientWs.send(JSON.stringify(messageData));
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      connections.delete(connectionId);
    });
  });

  // API Routes
  app.get('/api/session', (req: SessionRequest, res: Response) => {
    if (!req.session.sessionId) {
      req.session.sessionId = randomUUID();
      req.session.save();
    }
    
    res.json({ 
      sessionId: req.session.sessionId,
      isAdmin: req.session.isAdmin || false
    });
  });

  app.get('/api/messages', async (req: SessionRequest, res: Response) => {
    try {
      if (!req.session.sessionId) {
        return res.json([]);
      }

      const conversation = await storage.getConversationBySessionId(req.session.sessionId);
      if (!conversation) {
        return res.json([]);
      }

      const messages = await storage.getMessagesByConversationId(conversation.id);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  app.post('/api/send-message', async (req: SessionRequest, res: Response) => {
    try {
      const { message } = insertMessageSchema.omit({ conversationId: true, isAdminReply: true }).parse(req.body);
      
      if (!req.session.sessionId) {
        req.session.sessionId = randomUUID();
        req.session.save();
      }

      let conversation = await storage.getConversationBySessionId(req.session.sessionId);
      if (!conversation) {
        conversation = await storage.createConversation({ sessionId: req.session.sessionId });
      }

      const newMessage = await storage.createMessage({
        conversationId: conversation.id,
        message,
        isAdminReply: false,
      });

      await storage.updateConversationActivity(conversation.id);

      res.json(newMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  // Admin routes
  app.post('/api/admin/login', async (req: SessionRequest, res: Response) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const admin = await storage.getAdminByUsername(username);
      if (!admin || admin.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      req.session.isAdmin = true;
      req.session.save();
      
      res.json({ success: true });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  app.post('/api/admin/logout', (req: SessionRequest, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ success: true });
    });
  });

  app.get('/api/admin/conversations', async (req: SessionRequest, res: Response) => {
    if (!req.session.isAdmin) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const conversations = await storage.getAllConversations();
      const conversationsWithStats = await Promise.all(
        conversations.map(async (conv) => {
          const messages = await storage.getMessagesByConversationId(conv.id);
          return {
            ...conv,
            messageCount: messages.length,
            lastMessage: messages[messages.length - 1],
          };
        })
      );
      
      res.json(conversationsWithStats);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  app.get('/api/admin/conversation/:id', async (req: SessionRequest, res: Response) => {
    if (!req.session.isAdmin) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }

      const messages = await storage.getMessagesByConversationId(conversationId);
      
      res.json({
        conversation,
        messages,
      });
    } catch (error) {
      console.error('Error fetching conversation:', error);
      res.status(500).json({ message: 'Failed to fetch conversation' });
    }
  });

  app.post('/api/admin/reply/:id', async (req: SessionRequest, res: Response) => {
    if (!req.session.isAdmin) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const conversationId = parseInt(req.params.id);
      const { message } = insertMessageSchema.omit({ conversationId: true, isAdminReply: true }).parse(req.body);
      
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }

      const newMessage = await storage.createMessage({
        conversationId,
        message,
        isAdminReply: true,
      });

      await storage.updateConversationActivity(conversationId);

      res.json(newMessage);
    } catch (error) {
      console.error('Error sending reply:', error);
      res.status(500).json({ message: 'Failed to send reply' });
    }
  });

  return httpServer;
}
