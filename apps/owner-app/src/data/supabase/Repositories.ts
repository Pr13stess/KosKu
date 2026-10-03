import { SupabaseClient } from "@supabase/supabase-js";
import * as M from "../../domain/models";
import { AuthRepository } from "../../domain/repositories/AuthRepository";
import { ProfileRepository } from "../../domain/repositories/ProfileRepository";
import { PropertyRepository } from "../../domain/repositories/PropertyRepository";
import { RoomRepository } from "../../domain/repositories/RoomRepository";
import { PricingRepository } from "../../domain/repositories/PricingRepository";
import { BookingRepository } from "../../domain/repositories/BookingRepository";
import { CommunicationRepository } from "../../domain/repositories/CommunicationRepository";
import { SupportRepository } from "../../domain/repositories/SupportRepository";
class Repository {
  constructor(protected client: SupabaseClient) {}
  protected async rpc<T = void>(
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<T> {
    const { data, error } = await this.client.rpc(name, args);
    if (error) throw new Error(error.message);
    return data as T;
  }
  protected read<T>(section: string) {
    return this.rpc<T>("owner_read", { section });
  }
  protected async edge<T>(
    name: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const { data, error } = await this.client.functions.invoke(name, { body });
    if (error) {
      let detail = "";
      try {
        detail = (await error.context?.json())?.error ?? "";
      } catch {}
      throw new Error(detail || error.message);
    }
    if (data?.error) throw new Error(data.error);
    return data as T;
  }
}
export class SupabaseAuthRepository
  extends Repository
  implements AuthRepository
{
  constructor(
    client: SupabaseClient,
    private installation: string,
  ) {
    super(client);
  }
  async session() {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw error;
    return data.session
      ? { id: data.session.user.id, email: data.session.user.email ?? "" }
      : null;
  }
  subscribe(listener: (s: M.Session | null) => void) {
    const { data } = this.client.auth.onAuthStateChange((_event, s) =>
      listener(s ? { id: s.user.id, email: s.user.email ?? "" } : null),
    );
    return () => data.subscription.unsubscribe();
  }
  async signIn(email: string, password: string) {
    const { error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }
  async signUp(name: string, phone: string, email: string, password: string) {
    const { error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, phone, owner_demo_policy: "demo-2.0" },
        emailRedirectTo: "kosku-owner://auth",
      },
    });
    if (error) throw error;
    return "Periksa email untuk memverifikasi akun, lalu masuk.";
  }
  async resetPassword(email: string) {
    const { error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo: "kosku-owner://reset",
    });
    if (error) throw error;
  }
  async changePassword(password: string) {
    const { error } = await this.client.auth.updateUser({ password });
    if (error) throw error;
  }
  async signOut() {
    await this.rpc("owner_profile", {
      action: "logout",
      input: { installation: this.installation },
    });
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }
  async completeRedirect(url: string) {
    const parsed = new URL(url);
    const hash = new URLSearchParams(parsed.hash.slice(1));
    const access = hash.get("access_token"),
      refresh = hash.get("refresh_token");
    if (access && refresh) {
      const { error } = await this.client.auth.setSession({
        access_token: access,
        refresh_token: refresh,
      });
      if (error) throw error;
    } else if (parsed.searchParams.get("code")) {
      const { error } = await this.client.auth.exchangeCodeForSession(
        parsed.searchParams.get("code")!,
      );
      if (error) throw error;
    }
  }
}
export class SupabaseProfileRepository
  extends Repository
  implements ProfileRepository
{
  async get() {
    await this.rpc("owner_bootstrap");
    return this.read<M.Profile>("profile");
  }
  async save(input: Pick<M.Profile, "full_name" | "phone" | "address">) {
    await this.rpc("owner_profile", { action: "save", input });
  }
  async submitVerification(evidence: string) {
    await this.rpc("owner_profile", { action: "verify", input: { evidence } });
  }
  async acceptPolicies() {
    await this.rpc("owner_profile", { action: "policies" });
  }
  async requestDeletion(reason: string) {
    await this.rpc("owner_profile", { action: "delete", input: { reason } });
  }
}
export class SupabasePropertyRepository
  extends Repository
  implements PropertyRepository
{
  dashboard() {
    return this.read<M.Dashboard>("dashboard");
  }
  list() {
    return this.read<M.Property[]>("properties");
  }
  save(input: M.PropertyInput) {
    return this.rpc<string>("owner_save_property", { input });
  }
  async submitVerification(pid: string, evidence: string) {
    await this.rpc("owner_verify_property", { pid, evidence });
  }
  async reviews(id: string) {
    return (await this.read<M.Review[]>("reviews")).filter(
      (r) => r.property_id === id,
    );
  }
}
export class SupabaseRoomRepository
  extends Repository
  implements RoomRepository
{
  async list(id: string) {
    return (await this.read<M.Room[]>("rooms")).filter(
      (r) => r.property_id === id,
    );
  }
  save(input: M.Room) {
    return this.rpc<string>("owner_save_room", { input });
  }
  async updateInventory(rid: string, input: M.Inventory, reason: string) {
    await this.rpc("owner_inventory", { rid, input, reason });
  }
}
export class SupabasePricingRepository
  extends Repository
  implements PricingRepository
{
  async list(id: string) {
    return (await this.read<M.Plan[]>("plans")).filter(
      (p) => p.room_type_id === id,
    );
  }
  async save(input: M.Plan) {
    M.validatePlan(input);
    await this.rpc("owner_save_plan", { input });
  }
}
export class SupabaseBookingRepository
  extends Repository
  implements BookingRepository
{
  list() {
    return this.read<M.Booking[]>("bookings");
  }
  finance() {
    return this.read<M.Finance>("finance");
  }
  async transition(
    bid: string,
    action: "checkin" | "checkout",
    reason: string,
  ) {
    await this.rpc("owner_booking", { bid, action, reason });
  }
  async requestCancellation(bid: string, reason: string) {
    await this.rpc("owner_booking", { bid, action: "exception", reason });
  }
}
export class SupabaseCommunicationRepository
  extends Repository
  implements CommunicationRepository
{
  open(pid: string, target_user: string) {
    return this.rpc<M.Conversation>("communication_open", { pid, target_user });
  }
  conversations() {
    return this.read<M.Conversation[]>("conversations");
  }
  messages(cid: string) {
    return this.rpc<M.Message[]>("communication_messages", { cid });
  }
  async send(
    cid: string,
    content: string,
    image_path: string,
    client_id: string,
  ) {
    await this.rpc("communication_send", {
      cid,
      content,
      image_path,
      client_id,
    });
  }
  watch(listener: () => void) {
    const c = this.client
      .channel(`owner-${Math.random()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        listener,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls" },
        listener,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        listener,
      )
      .subscribe();
    return () => {
      void this.client.removeChannel(c);
    };
  }
  calls() {
    return this.read<M.Call[]>("calls");
  }
  startCall(cid: string, kind: "VOICE" | "VIDEO") {
    return this.rpc<M.Call>("communication_start", { cid, kind });
  }
  async updateCall(
    call_id: string,
    action: "accept" | "decline" | "end" | "fail",
  ) {
    await this.rpc("communication_call", { call_id, action });
  }
  async heartbeat(call_id: string) {
    await this.rpc("communication_call", { call_id, action: "ping" });
  }
  token(id: string) {
    return this.edge<{
      appId: string;
      token: string;
      channel: string;
      uid: number;
    }>("agora-token", { call_id: id });
  }
  restrictions() {
    return this.read<M.Restriction[]>("restrictions");
  }
  async restrict(input: M.Restriction) {
    await this.rpc("communication_restrict", { input });
  }
}
export class SupabaseSupportRepository
  extends Repository
  implements SupportRepository
{
  notifications() {
    return this.read<M.Notice[]>("notices");
  }
  async markRead(id: string) {
    await this.rpc("owner_profile", { action: "read", input: { id } });
  }
  reports() {
    return this.read<M.Report[]>("reports");
  }
  async report(
    input: Pick<
      M.Report,
      "target_type" | "target_id" | "category" | "description"
    > & { evidence_path: string },
  ) {
    await this.rpc("owner_report", { input });
  }
  async registerPush(
    token: string,
    platform: "ANDROID" | "IOS",
    installation: string,
  ) {
    await this.rpc("owner_profile", {
      action: "device",
      input: { token, platform, installation },
    });
  }
  async setPushEnabled(enabled: boolean) {
    await this.rpc("owner_profile", { action: "push", input: { enabled } });
  }
  async upload(input: M.MediaInput) {
    return (await this.edge<{ path: string }>("owner-upload", { ...input }))
      .path;
  }
  async mediaUrl(path: string) {
    if (!path) return "";
    if (!path.startsWith("owner-media/")) return path;
    const { data, error } = await this.client.storage
      .from("owner-media")
      .createSignedUrl(path.slice(12), 1800);
    if (error) throw error;
    return data.signedUrl;
  }
}
