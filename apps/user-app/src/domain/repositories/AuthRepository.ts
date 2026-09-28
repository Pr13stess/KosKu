import type { Session } from "../models";
import type { SignUpMetadata } from "../profile";
export interface AuthRepository {
  getSession(): Promise<Session | null>;
  onChange(callback: (session: Session | null) => void): () => void;
  signUp(
    email: string,
    password: string,
    metadata?: SignUpMetadata,
  ): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}