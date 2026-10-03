import { Session } from "../models";
export interface AuthRepository {
  session(): Promise<Session | null>;
  subscribe(listener: (s: Session | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(
    name: string,
    phone: string,
    email: string,
    password: string,
  ): Promise<string>;
  resetPassword(email: string): Promise<void>;
  changePassword(password: string): Promise<void>;
  signOut(): Promise<void>;
  completeRedirect(url: string): Promise<void>;
}
