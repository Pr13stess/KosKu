import * as M from "../../domain/models";
import { AuthRepository } from "../../domain/repositories/AuthRepository";
import { ProfileRepository } from "../../domain/repositories/ProfileRepository";
import { PropertyRepository } from "../../domain/repositories/PropertyRepository";
import { RoomRepository } from "../../domain/repositories/RoomRepository";
import { PricingRepository } from "../../domain/repositories/PricingRepository";
import { BookingRepository } from "../../domain/repositories/BookingRepository";
import { CommunicationRepository } from "../../domain/repositories/CommunicationRepository";
import { SupportRepository } from "../../domain/repositories/SupportRepository";
import { MockStore } from "./MockStore";
import { ownerId, seed, uid } from "./seed";
const now = () => new Date().toISOString();
function required(v: string) {
  if (!v.trim()) throw new Error("Lengkapi kolom yang wajib diisi.");
}
export class MockAuthRepository implements AuthRepository {
  private current: M.Session | null = {
    id: ownerId,
    email: "owner@kosku.demo",
  };
  private listeners = new Set<(s: M.Session | null) => void>();
  async session() {
    return this.current;
  }
  subscribe(l: (s: M.Session | null) => void) {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }
  async signIn(email: string, password: string) {
    required(email);
    required(password);
    this.current = { id: ownerId, email };
    this.listeners.forEach((l) => l(this.current));
  }
  async signUp(name: string, phone: string, email: string, password: string) {
    await this.signIn(email, password);
    return "Akun demo siap. Email tidak dikirim dalam mode demo.";
  }
  async resetPassword(email: string) {
    required(email);
  }
  async changePassword(password: string) {
    if (password.length < 8) throw new Error("Password minimal 8 karakter.");
  }
  async signOut() {
    this.current = null;
    this.listeners.forEach((l) => l(null));
  }
  async completeRedirect() {
    /* Auth links only apply to Supabase. */
  }
}
export class MockProfileRepository implements ProfileRepository {
  constructor(private s: MockStore) {}
  async get() {
    return (await this.s.read()).profile;
  }
  async save(input: Pick<M.Profile, "full_name" | "phone" | "address">) {
    required(input.full_name);
    required(input.phone);
    await this.s.write((s) => {
      Object.assign(s.profile, input);
    });
  }
  async submitVerification(evidence: string) {
    required(evidence);
    await this.s.write((s) => {
      s.profile.verification_status = "PENDING";
      s.profile.review_reason = undefined;
    });
  }
  async acceptPolicies() {
    await this.s.write((s) => {
      s.policies = true;
    });
  }
  async requestDeletion(reason: string) {
    required(reason);
    await this.s.write((s) => {
      s.deletion = true;
    });
  }
  async resetDemo() {
    await this.s.write((s) => {
      Object.assign(s, seed(), {
        properties: [],
        rooms: [],
        plans: [],
        bookings: [],
        conversations: [],
        messages: [],
        reviews: [],
        notices: [],
        finance: {
          rent_received: 0,
          deposit_held: 0,
          refund_amount: 0,
          payout_amount: 0,
          items: [],
        },
      });
      s.profile.verification_status = "DRAFT";
    });
  }
}
export class MockPropertyRepository implements PropertyRepository {
  constructor(private s: MockStore) {}
  async list() {
    return (await this.s.read()).properties;
  }
  async dashboard() {
    const s = await this.s.read();
    return {
      properties: s.properties,
      rooms: s.rooms,
      bookings: s.bookings,
      reviews: s.reviews,
      finance: s.finance,
      activities: s.notices,
    };
  }
  async save(input: M.PropertyInput) {
    required(input.name);
    required(input.address);
    required(input.city);
    return this.s.write((s) => {
      const old = s.properties.find((p) => p.id === input.id);
      if (old?.publication_status === "SUSPENDED")
        throw new Error("Properti ditangguhkan. Hubungi admin.");
      const value: M.Property = {
        ...input,
        id: input.id || uid(),
        verification_status: old ? "PENDING" : "DRAFT",
      };
      if (old) Object.assign(old, value);
      else s.properties.push(value);
      return value.id;
    });
  }
  async submitVerification(id: string, evidence: string) {
    required(evidence);
    await this.s.write((s) => {
      const p = s.properties.find((p) => p.id === id);
      if (!p) throw new Error("Kos tidak ditemukan.");
      p.verification_status = "PENDING";
    });
  }
  async reviews(id: string) {
    return (await this.s.read()).reviews.filter((r) => r.property_id === id);
  }
}
export class MockRoomRepository implements RoomRepository {
  constructor(private s: MockStore) {}
  async list(id: string) {
    return (await this.s.read()).rooms.filter((r) => r.property_id === id);
  }
  async save(input: M.Room) {
    required(input.name);
    if (input.room_size_m2 <= 0)
      throw new Error("Ukuran kamar harus lebih dari nol.");
    return this.s.write((s) => {
      const old = s.rooms.find((r) => r.id === input.id);
      const value = {
        ...input,
        id: input.id || uid(),
        inventory: old?.inventory ?? {
          ...input.inventory,
          hold: 0,
          reserved: 0,
          version: 1,
        },
      };
      M.validateInventory(value.inventory);
      if (old) Object.assign(old, value);
      else s.rooms.push(value);
      return value.id;
    });
  }
  async updateInventory(id: string, input: M.Inventory, reason: string) {
    required(reason);
    await this.s.write((s) => {
      const r = s.rooms.find((r) => r.id === id);
      if (!r) throw new Error("Tipe kamar tidak ditemukan.");
      if (r.inventory.version !== input.version)
        throw new Error("Data telah berubah. Muat ulang lalu coba lagi.");
      const v = {
        ...input,
        hold: r.inventory.hold,
        reserved: r.inventory.reserved,
      };
      M.validateInventory(
        v,
        s.bookings.filter((b) => b.room_type_id === id && b.status === "ACTIVE")
          .length,
      );
      r.inventory = { ...v, version: v.version + 1 };
    });
  }
}
export class MockPricingRepository implements PricingRepository {
  constructor(private s: MockStore) {}
  async list(id: string) {
    return (await this.s.read()).plans.filter((p) => p.room_type_id === id);
  }
  async save(input: M.Plan) {
    M.validatePlan(input);
    await this.s.write((s) => {
      if (
        s.plans.some(
          (p) =>
            p.id !== input.id &&
            p.room_type_id === input.room_type_id &&
            p.duration_unit === input.duration_unit &&
            p.duration_value === input.duration_value &&
            p.is_active &&
            input.is_active,
        )
      )
        throw new Error("Paket aktif untuk durasi ini sudah ada.");
      const old = s.plans.find((p) => p.id === input.id);
      if (old) Object.assign(old, input);
      else s.plans.push({ ...input, id: uid() });
    });
  }
}
export class MockBookingRepository implements BookingRepository {
  constructor(private s: MockStore) {}
  async list() {
    return (await this.s.read()).bookings;
  }
  async finance() {
    return (await this.s.read()).finance;
  }
  async transition(id: string, action: "checkin" | "checkout", reason: string) {
    required(reason);
    await this.s.write((s) => {
      const b = s.bookings.find((b) => b.id === id);
      if (!b) throw new Error("Booking tidak ditemukan.");
      const target = action === "checkin" ? "ACTIVE" : "COMPLETED";
      if (b.status === target) return;
      if (b.status !== (action === "checkin" ? "CONFIRMED" : "ACTIVE"))
        throw new Error("Status booking tidak sesuai.");
      const room = s.rooms.find((r) => r.id === b.room_type_id)!;
      if (action === "checkin") {
        room.inventory.reserved--;
        room.inventory.occupied++;
      } else {
        room.inventory.occupied--;
        room.inventory.cleaning++;
      }
      M.validateInventory(room.inventory);
      room.inventory.version++;
      b.status = target;
      b.events.push({ to_status: target, reason, created_at: now() });
      s.notices.unshift({
        id: uid(),
        title:
          action === "checkin" ? "Penyewa sudah masuk" : "Checkout selesai",
        body: b.tenant,
        created_at: now(),
        read_at: null,
        target_type: "BOOKING",
        target_id: id,
      });
    });
  }
  async requestCancellation(id: string, reason: string) {
    required(reason);
    await this.s.write((s) => {
      if (!s.reports.some((r) => r.target_id === id && r.status === "OPEN"))
        s.reports.unshift({
          id: uid(),
          target_type: "BOOKING",
          target_id: id,
          category: "OWNER_EXCEPTION",
          description: reason,
          status: "OPEN",
          resolution_note:
            "Menunggu penanganan admin; booking tidak dibatalkan otomatis.",
          created_at: now(),
        });
    });
  }
}
export class MockCommunicationRepository implements CommunicationRepository {
  constructor(private s: MockStore) {}
  async open(propertyId: string, userId: string) {
    return this.s.write((s) => {
      const existing = s.conversations.find(
        (c) => c.property_id === propertyId && c.user_id === userId,
      );
      if (existing) return existing;
      const b = s.bookings.find(
        (b) => b.property_id === propertyId && b.user_id === userId,
      );
      if (!b) throw new Error("Pengguna tidak terkait.");
      const c: M.Conversation = {
        id: uid(),
        property_id: propertyId,
        property_name: b.property_name_snapshot,
        user_id: userId,
        tenant: b.tenant,
        last_message: "",
        unread: 0,
      };
      s.conversations.push(c);
      return c;
    });
  }
  async conversations() {
    return (await this.s.read()).conversations;
  }
  async messages(id: string) {
    if (
      (await this.s.read()).conversations.some((c) => c.id === id && c.unread)
    )
      await this.s.write((s) => {
        const c = s.conversations.find((c) => c.id === id);
        if (c) c.unread = 0;
      });
    return (await this.s.read()).messages.filter(
      (m) => m.conversation_id === id,
    );
  }
  async send(id: string, text: string, image: string, clientId: string) {
    if (!text.trim() && !image) throw new Error("Pesan masih kosong.");
    await this.s.write((s) => {
      const c = s.conversations.find((c) => c.id === id);
      if (!c) throw new Error("Percakapan tidak ditemukan.");
      if (
        s.restrictions.some(
          (r) =>
            r.user_id === c.user_id &&
            r.status === "ACTIVE" &&
            r.block_communication,
        )
      )
        throw new Error("Komunikasi dengan pengguna ini dibatasi.");
      if (s.messages.some((m) => m.id === clientId)) return;
      s.messages.push({
        id: clientId,
        conversation_id: id,
        sender_id: ownerId,
        message_type: image ? "IMAGE" : "TEXT",
        text_content: text,
        storage_path: image,
        created_at: now(),
      });
      c.last_message = image ? "Foto" : text;
    });
  }
  watch(l: () => void) {
    return this.s.watch(l);
  }
  async calls() {
    const expired = (await this.s.read()).calls.filter(
      (c) =>
        c.status === "RINGING" && Date.now() - Date.parse(c.created_at) > 45000,
    );
    if (expired.length)
      await this.s.write((s) => {
        for (const c of s.calls) {
          if (c.status === "RINGING" && expired.some((x) => x.id === c.id)) {
            c.status = "MISSED";
            c.ended_at = now();
            s.messages.push({
              id: uid(),
              conversation_id: c.conversation_id,
              sender_id: ownerId,
              message_type: "CALL_EVENT",
              text_content: "Panggilan tak terjawab (demo)",
              storage_path: "",
              created_at: now(),
            });
          }
        }
      });
    return (await this.s.read()).calls;
  }
  async startCall(id: string, type: "VOICE" | "VIDEO") {
    await this.calls();
    return this.s.write((s) => {
      const c = s.conversations.find((c) => c.id === id);
      if (!c) throw new Error("Percakapan tidak ditemukan.");
      if (
        s.restrictions.some(
          (r) =>
            r.user_id === c.user_id &&
            r.status === "ACTIVE" &&
            r.block_communication,
        )
      )
        throw new Error("Komunikasi dibatasi.");
      if (s.calls.some((c) => ["RINGING", "CONNECTED"].includes(c.status)))
        throw new Error("Masih ada panggilan aktif.");
      const call: M.Call = {
        id: uid(),
        conversation_id: id,
        caller_id: ownerId,
        receiver_id: c.user_id,
        call_type: type,
        status: "RINGING",
        agora_channel_id: uid(),
        created_at: now(),
        duration_seconds: 0,
      };
      s.calls.push(call);
      return call;
    });
  }
  async updateCall(id: string, action: "accept" | "decline" | "end" | "fail") {
    await this.s.write((s) => {
      const c = s.calls.find((c) => c.id === id);
      if (!c) throw new Error("Panggilan tidak ditemukan.");
      if (!["RINGING", "CONNECTED"].includes(c.status)) return;
      if (action === "accept" && c.status === "CONNECTED") return;
      if (action === "accept") c.answered_at = now();
      else {
        c.ended_at = now();
        c.duration_seconds = c.answered_at
          ? Math.max(
              0,
              Math.floor((Date.now() - Date.parse(c.answered_at)) / 1000),
            )
          : 0;
      }
      c.status =
        action === "accept"
          ? "CONNECTED"
          : action === "decline"
            ? "DECLINED"
            : action === "fail"
              ? "FAILED"
              : c.status === "CONNECTED"
                ? "COMPLETED"
                : "CANCELLED";
      if (action !== "accept")
        s.messages.push({
          id: uid(),
          conversation_id: c.conversation_id,
          sender_id: ownerId,
          message_type: "CALL_EVENT",
          text_content: `Panggilan ${c.call_type === "VOICE" ? "suara" : "video"} • ${c.status} (demo)`,
          storage_path: "",
          created_at: now(),
        });
    });
  }
  async heartbeat(_id: string) {}
  async token() {
    return { appId: "", token: "", channel: "demo", uid: 1 };
  }
  async restrictions() {
    return (await this.s.read()).restrictions;
  }
  async restrict(input: M.Restriction) {
    await this.s.write((s) => {
      const old = s.restrictions.find((r) => r.user_id === input.user_id);
      if (old) Object.assign(old, input);
      else s.restrictions.push({ ...input, id: uid() });
    });
  }
}
export class MockSupportRepository implements SupportRepository {
  constructor(private s: MockStore) {}
  async notifications() {
    return (await this.s.read()).notices;
  }
  async markRead(id: string) {
    await this.s.write((s) => {
      const n = s.notices.find((n) => n.id === id);
      if (n) n.read_at = now();
    });
  }
  async reports() {
    return (await this.s.read()).reports;
  }
  async report(
    input: Pick<
      M.Report,
      "target_type" | "target_id" | "category" | "description"
    > & { evidence_path: string },
  ) {
    required(input.description);
    required(input.target_id);
    await this.s.write((s) => {
      s.reports.unshift({
        ...input,
        id: uid(),
        status: "OPEN",
        resolution_note: "",
        created_at: now(),
      });
    });
  }
  async registerPush() {
    /* Demo never registers external device tokens. */
  }
  async setPushEnabled(enabled: boolean) {
    await this.s.write((s) => {
      s.profile.push_enabled = enabled;
    });
  }
  async upload(input: M.MediaInput) {
    return `data:${input.mime};base64,${input.base64}`;
  }
  async mediaUrl(path: string) {
    return path;
  }
}
