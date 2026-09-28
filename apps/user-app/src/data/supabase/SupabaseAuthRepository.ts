import type {
  Session as SupabaseSession,
  SupabaseClient,
} from "@supabase/supabase-js";
import type { AuthRepository } from "../../domain/repositories/AuthRepository";
import type { Session } from "../../domain/models";
import type { SignUpMetadata } from "../../domain/profile";
function toSession(session: SupabaseSession | null): Session | null {
  if (!session?.user) return null;
  return { user: { id: session.user.id, email: session.user.email ?? null } };
}
export class SupabaseAuthRepository implements AuthRepository {
  constructor(private readonly client: SupabaseClient) {}
  async getSession() {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw new Error(error.message);
    return toSession(data.session);
  }
  onChange(callback: (session: Session | null) => void) {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      callback(toSession(session));
    });
    return () => data.subscription.unsubscribe();
  }
  async signUp(email: string, password: string, metadata?: SignUpMetadata) {
    const { error } = await this.client.auth.signUp({
      email,
      password,
      options: metadata ? { data: { ...metadata } } : undefined,
    });
    if (error) throw new Error(error.message);
  }
  async signIn(email: string, password: string) {
    const { error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);
  }
  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) throw new Error(error.message);
  }
}
