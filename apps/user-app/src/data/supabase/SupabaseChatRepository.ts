import type { SupabaseClient } from "@supabase/supabase-js";
import { File } from "expo-file-system";
import type { ChatRepository } from "../../domain/repositories/ChatRepository";
import type { Conversation, Message, MessageType } from "../../domain/models";

const BUCKET = "chat-images";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  message_type: MessageType;
  text_content: string | null;
  storage_path: string | null;
  client_message_id: string;
  created_at: string;
}
interface ConversationRow {
  id: string;
  property_id: string;
  user_id: string | null;
  owner_id: string | null;
  updated_at: string;
  properties: { name: string } | { name: string }[] | null;
}

function propertyName(row: ConversationRow): string {
  const p = row.properties;
  if (Array.isArray(p)) return p[0]?.name ?? "Kos";
  return p?.name ?? "Kos";
}

export class SupabaseChatRepository implements ChatRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async currentUserId(): Promise<string> {
    const { data, error } = await this.client.auth.getUser();
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Masuk terlebih dahulu untuk memulai chat.");
    return data.user.id;
  }

  private async toMessage(row: MessageRow): Promise<Message> {
    let imageUrl: string | null = null;
    if (row.message_type === "IMAGE" && row.storage_path) {
      const { data } = await this.client.storage
        .from(BUCKET)
        .createSignedUrl(row.storage_path, 3600);
      imageUrl = data?.signedUrl ?? null;
    }
    return {
      id: row.id,
      conversation_id: row.conversation_id,
      sender_id: row.sender_id,
      message_type: row.message_type,
      text_content: row.text_content,
      image_url: imageUrl,
      client_message_id: row.client_message_id,
      created_at: row.created_at,
    };
  }

  async startConversation(propertyId: string, propertyName: string) {
    const { data: id, error } = await this.client.rpc("start_conversation", {
      p_property_id: propertyId,
    });
    if (error) throw new Error(error.message);
    const { data, error: selectError } = await this.client
      .from("conversations")
      .select("id, property_id, user_id, owner_id, updated_at")
      .eq("id", id)
      .single();
    if (selectError) throw new Error(selectError.message);
    const conversation: Conversation = {
      id: data.id,
      property_id: data.property_id,
      property_name: propertyName,
      user_id: data.user_id,
      owner_id: data.owner_id,
      updated_at: data.updated_at,
      last_message: null,
    };
    return conversation;
  }

  async listConversations() {
    const { data, error } = await this.client
      .from("conversations")
      .select("id, property_id, user_id, owner_id, updated_at, properties(name)")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as ConversationRow[];
    return Promise.all(
      rows.map(async (row): Promise<Conversation> => {
        const { data: last } = await this.client
          .from("messages")
          .select("*")
          .eq("conversation_id", row.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return {
          id: row.id,
          property_id: row.property_id,
          property_name: propertyName(row),
          user_id: row.user_id,
          owner_id: row.owner_id,
          updated_at: row.updated_at,
          last_message: last
            ? await this.toMessage(last as MessageRow)
            : null,
        };
      }),
    );
  }

  async listMessages(conversationId: string) {
    const { data, error } = await this.client
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return Promise.all(
      ((data ?? []) as MessageRow[]).map((row) => this.toMessage(row)),
    );
  }

  async sendText(conversationId: string, text: string, clientMessageId: string) {
    const senderId = await this.currentUserId();
    const trimmed = text.trim();
    if (!trimmed) throw new Error("Pesan tidak boleh kosong.");
    const { data, error } = await this.client
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        message_type: "TEXT",
        text_content: trimmed,
        client_message_id: clientMessageId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return this.toMessage(data as MessageRow);
  }

  async sendImage(
    conversationId: string,
    localUri: string,
    clientMessageId: string,
  ) {
    const senderId = await this.currentUserId();
    // fetch(uri).blob() is unreliable on React Native (silently truncates
    // /corrupts binary data through its base64 shim). Read the local file
    // directly and upload its raw bytes instead.
    const file = new File(localUri);
    if (file.size > MAX_IMAGE_BYTES)
      throw new Error("Ukuran gambar maksimal 5 MB.");
    const bytes = await file.arrayBuffer();
    const path = `${conversationId}/${clientMessageId}.jpg`;
    const { error: uploadError } = await this.client.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
    if (uploadError) throw new Error(uploadError.message);
    const { data, error } = await this.client
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        message_type: "IMAGE",
        storage_path: path,
        client_message_id: clientMessageId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return this.toMessage(data as MessageRow);
  }

  subscribeMessages(conversationId: string, onMessage: (m: Message) => void) {
    const channel = this.client
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          void this.toMessage(payload.new as MessageRow).then(onMessage);
        },
      )
      .subscribe();
    return () => {
      void this.client.removeChannel(channel);
    };
  }
}
