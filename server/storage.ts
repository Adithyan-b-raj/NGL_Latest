import { type Conversation, type Message, type AdminUser, type InsertConversation, type InsertMessage, type InsertAdminUser } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Conversations
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationBySessionId(sessionId: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversationActivity(id: number): Promise<void>;
  getAllConversations(): Promise<Conversation[]>;

  // Messages
  getMessagesByConversationId(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  getLatestMessages(conversationId: number, limit?: number): Promise<Message[]>;

  // Admin
  getAdminByUsername(username: string): Promise<AdminUser | undefined>;
  createAdmin(admin: InsertAdminUser): Promise<AdminUser>;
}

export class MemStorage implements IStorage {
  private conversations: Map<number, Conversation> = new Map();
  private messages: Map<number, Message> = new Map();
  private admins: Map<number, AdminUser> = new Map();
  private conversationIdCounter = 1;
  private messageIdCounter = 1;
  private adminIdCounter = 1;

  constructor() {
    // Create default admin user
    this.createAdmin({
      username: process.env.ADMIN_USERNAME || "admin",
      password: process.env.ADMIN_PASSWORD || "password123"
    });
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversationBySessionId(sessionId: string): Promise<Conversation | undefined> {
    return Array.from(this.conversations.values()).find(
      (conv) => conv.sessionId === sessionId
    );
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.conversationIdCounter++;
    const now = new Date();
    const conversation: Conversation = {
      id,
      sessionId: insertConversation.sessionId,
      createdAt: now,
      lastActivity: now,
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversationActivity(id: number): Promise<void> {
    const conversation = this.conversations.get(id);
    if (conversation) {
      conversation.lastActivity = new Date();
      this.conversations.set(id, conversation);
    }
  }

  async getAllConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }

  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((msg) => msg.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const message: Message = {
      id,
      conversationId: insertMessage.conversationId,
      message: insertMessage.message,
      isAdminReply: insertMessage.isAdminReply,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async getLatestMessages(conversationId: number, limit: number = 50): Promise<Message[]> {
    const messages = await this.getMessagesByConversationId(conversationId);
    return messages.slice(-limit);
  }

  async getAdminByUsername(username: string): Promise<AdminUser | undefined> {
    return Array.from(this.admins.values()).find(
      (admin) => admin.username === username
    );
  }

  async createAdmin(insertAdmin: InsertAdminUser): Promise<AdminUser> {
    const id = this.adminIdCounter++;
    const admin: AdminUser = {
      id,
      username: insertAdmin.username,
      password: insertAdmin.password,
      createdAt: new Date(),
    };
    this.admins.set(id, admin);
    return admin;
  }
}

export const storage = new MemStorage();
