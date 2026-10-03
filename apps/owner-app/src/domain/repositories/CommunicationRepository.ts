import { Call, Conversation, Message, Restriction } from "../models";
export interface CommunicationRepository {
  open(propertyId: string, userId: string): Promise<Conversation>;
  conversations(): Promise<Conversation[]>;
  messages(id: string): Promise<Message[]>;
  send(
    id: string,
    text: string,
    image: string,
    clientId: string,
  ): Promise<void>;
  watch(listener: () => void): () => void;
  calls(): Promise<Call[]>;
  startCall(conversationId: string, type: "VOICE" | "VIDEO"): Promise<Call>;
  updateCall(
    id: string,
    action: "accept" | "decline" | "end" | "fail",
  ): Promise<void>;
  heartbeat(id: string): Promise<void>;
  token(
    id: string,
  ): Promise<{ appId: string; token: string; channel: string; uid: number }>;
  restrictions(): Promise<Restriction[]>;
  restrict(input: Restriction): Promise<void>;
}
