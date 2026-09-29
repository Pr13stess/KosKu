import type { ChatRepository } from "../../domain/repositories/ChatRepository";
import type { Conversation, Message } from "../../domain/models";
import type { AuthRepository } from "../../domain/repositories/AuthRepository";

/**
 * In-memory only, seperti mock/* lainnya: tidak bertahan lintas restart
 * dan tidak memanggil Supabase. Membalas otomatis satu kali dari "owner"
 * agar alur chat dapat diperagakan tanpa backend nyata.
 */
export class MockChatRepository implements ChatRepository {
  private readonly conversations = new Map<string, Conversation>();
  private readonly messages = new Map<string, Message[]>();
  private readonly listeners = new Map<string, Set<(m: Message) => void>>();
  private seq = 0;

  constructor(private readonly auth: AuthRepository) {}

  private async currentUserId(): Promise<string> {
    const session = await this.auth.getSession();
    if (!session) throw new Error("Masuk terlebih dahulu untuk memulai chat.");
    return session.user.id;
  }

  private emit(conversationId: string, message: Message) {
    for (const listener of this.listeners.get(conversationId) ?? [])
      listener(message);
  }

  async startConversation(propertyId: string, propertyName: string) {
    const userId = await this.currentUserId();
    const key = `${propertyId}:${userId}`;
    const existing = this.conversations.get(key);
    if (existing) return existing;
    const conversation: Conversation = {
      id: key,
      property_id: propertyId,
      property_name: propertyName,
      user_id: userId,
      owner_id: `owner-of-${propertyId}`,
      updated_at: new Date().toISOString(),
      last_message: null,
    };
    this.conversations.set(key, conversation);
    this.messages.set(key, []);
    return conversation;
  }

  async listConversations() {
    const userId = await this.currentUserId();
    return [...this.conversations.values()]
      .filter((c) => c.user_id === userId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  async listMessages(conversationId: string) {
    return [...(this.messages.get(conversationId) ?? [])];
  }

  private push(conversationId: string, message: Message) {
    const list = this.messages.get(conversationId) ?? [];
    list.push(message);
    this.messages.set(conversationId, list);
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.last_message = message;
      conversation.updated_at = message.created_at;
    }
    this.emit(conversationId, message);
  }

  async sendText(conversationId: string, text: string, clientMessageId: string) {
    const userId = await this.currentUserId();
    const trimmed = text.trim();
    if (!trimmed) throw new Error("Pesan tidak boleh kosong.");
    const message: Message = {
      id: `msg-${this.seq++}`,
      conversation_id: conversationId,
      sender_id: userId,
      message_type: "TEXT",
      text_content: trimmed,
      image_url: null,
      client_message_id: clientMessageId,
      created_at: new Date().toISOString(),
    };
    this.push(conversationId, message);
    this.autoReply(conversationId);
    return message;
  }

  async sendImage(
    conversationId: string,
    localUri: string,
    clientMessageId: string,
  ) {
    const userId = await this.currentUserId();
    const message: Message = {
      id: `msg-${this.seq++}`,
      conversation_id: conversationId,
      sender_id: userId,
      message_type: "IMAGE",
      text_content: null,
      image_url: localUri,
      client_message_id: clientMessageId,
      created_at: new Date().toISOString(),
    };
    this.push(conversationId, message);
    return message;
  }

  subscribeMessages(conversationId: string, onMessage: (m: Message) => void) {
    const set = this.listeners.get(conversationId) ?? new Set();
    set.add(onMessage);
    this.listeners.set(conversationId, set);
    return () => {
      this.listeners.get(conversationId)?.delete(onMessage);
    };
  }

  private autoReply(conversationId: string) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation?.owner_id) return;
    setTimeout(() => {
      const reply: Message = {
        id: `msg-${this.seq++}`,
        conversation_id: conversationId,
        sender_id: conversation.owner_id,
        message_type: "TEXT",
        text_content: "Terima kasih sudah menghubungi, ada yang bisa dibantu?",
        image_url: null,
        client_message_id: `auto-${this.seq}`,
        created_at: new Date().toISOString(),
      };
      this.push(conversationId, reply);
    }, 900);
  }
}
