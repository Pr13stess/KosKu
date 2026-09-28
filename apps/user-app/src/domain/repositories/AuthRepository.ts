import type { Session } from "../models";
export interface AuthRepository {
  getSession(): Promise<Session | null>;
  onChange(callback: (session: Session | null) => void): () => void;
  signUp(email: string, password: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}
