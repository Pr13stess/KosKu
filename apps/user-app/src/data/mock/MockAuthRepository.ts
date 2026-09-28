import type { AuthRepository } from "../../domain/repositories/AuthRepository";
import type { Session } from "../../domain/models";
type Listener = (session: Session | null) => void;
/**
 * In-memory only: matches the rest of the mock/* layer, which never
 * persists across app restarts. Lets the app work end-to-end with no
 * .env, mirroring how MockPropertyRepository stands in for Supabase.
 */
export class MockAuthRepository implements AuthRepository {
  private session: Session | null = null;
  private readonly listeners = new Set<Listener>();
  private readonly users = new Map<string, { id: string; password: string }>();
  private emit() {
    for (const listener of this.listeners) listener(this.session);
  }
  async getSession() {
    return this.session;
  }
  onChange(callback: Listener) {
    this.listeners.add(callback);
    callback(this.session);
    return () => {
      this.listeners.delete(callback);
    };
  }
  async signUp(email: string, password: string) {
    const key = email.trim().toLowerCase();
    if (!key || !password) throw new Error("Email dan kata sandi wajib diisi.");
    if (password.length < 6)
      throw new Error("Kata sandi minimal 6 karakter.");
    if (this.users.has(key)) throw new Error("Email sudah terdaftar.");
    const id = `mock-${key}`;
    this.users.set(key, { id, password });
    this.session = { user: { id, email: key } };
    this.emit();
  }
  async signIn(email: string, password: string) {
    const key = email.trim().toLowerCase();
    const record = this.users.get(key);
    if (!record || record.password !== password)
      throw new Error("Email atau kata sandi salah.");
    this.session = { user: { id: record.id, email: key } };
    this.emit();
  }
  async signOut() {
    this.session = null;
    this.emit();
  }
}
